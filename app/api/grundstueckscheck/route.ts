import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  geocodeAddress,
  fetchGebaeudeCount,
  fetchFlurstueck,
  fetchBplan,
  fetchBaugebiet,
} from '@/lib/wfs'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })

  const body = await request.json() as { address?: string; project_id?: string }
  const { address, project_id } = body

  if (!address?.trim()) {
    return NextResponse.json({ error: 'Adresse fehlt' }, { status: 400 })
  }

  // Step 1: Geocode address
  const geocoded = await geocodeAddress(address.trim())
  if (!geocoded) {
    return NextResponse.json({ error: 'Adresse konnte nicht gefunden werden. Bitte genauer angeben (z.B. "Musterstraße 5, 19053 Schwerin").' }, { status: 422 })
  }

  const { lat, lon } = geocoded

  // Step 2: Fetch WFS data in parallel
  const [gebaeudeCount, flurstueck, bplan, baugebiet] = await Promise.all([
    fetchGebaeudeCount(lat, lon),
    fetchFlurstueck(lat, lon),
    fetchBplan(lat, lon),
    fetchBaugebiet(lat, lon),
  ])

  const hasBplan = bplan !== null
  const bplanName = bplan
    ? (bplan.name ?? bplan.nummer ?? 'Unbekannter B-Plan')
    : null

  // Step 3: Claude KI-Analyse
  const contextLines = [
    `Adresse: ${address}`,
    `Gefundene Adresse: ${geocoded.display_name}`,
    `Koordinaten: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
    '',
    `Gebäude im Umfeld (~700m Radius): ${gebaeudeCount} Gebäude`,
    '',
  ]

  if (flurstueck) {
    contextLines.push('ALKIS Flurstücksdaten:')
    if (flurstueck.kennzeichen) contextLines.push(`  Kennzeichen: ${flurstueck.kennzeichen}`)
    if (flurstueck.flaeche_m2) contextLines.push(`  Amtliche Fläche: ${flurstueck.flaeche_m2} m²`)
    if (flurstueck.lagebezeichnung) contextLines.push(`  Lage: ${flurstueck.lagebezeichnung}`)
    contextLines.push('')
  }

  if (hasBplan) {
    contextLines.push(`BAULEITPLANUNG: B-Plan vorhanden — ${bplanName}`)
    if (baugebiet?.nutzungsart) contextLines.push(`  Nutzungsart: ${baugebiet.nutzungsart}`)
    if (baugebiet?.grz) contextLines.push(`  GRZ: ${baugebiet.grz}`)
    if (baugebiet?.gfz) contextLines.push(`  GFZ: ${baugebiet.gfz}`)
  } else {
    contextLines.push('BAULEITPLANUNG: Kein B-Plan gefunden')
  }

  const contextData = contextLines.join('\n')

  let kiEinschaetzung = ''
  let kiWarnungen: string[] = []
  let kiEmpfehlungen: string[] = []
  let planungsrecht: 'bplan' | 'paragraph_34' | 'paragraph_35' | 'unbekannt' = 'unbekannt'

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Du bist ein erfahrener Planungsrechtexperte für Mecklenburg-Vorpommern (LBauO MV, BauGB).

Analysiere dieses Grundstück und gib eine Einschätzung zum Planungsrecht:

${contextData}

Antworte ausschließlich als JSON in diesem Format:
{
  "planungsrecht": "bplan" | "paragraph_34" | "paragraph_35" | "unbekannt",
  "einschaetzung": "2-4 Sätze zur planungsrechtlichen Situation",
  "warnungen": ["Warnung 1", "Warnung 2"],
  "empfehlungen": ["Empfehlung 1", "Empfehlung 2", "Empfehlung 3"]
}

Regeln:
- "bplan" wenn ein B-Plan gefunden wurde
- "paragraph_34" wenn ${gebaeudeCount} Gebäude im weiteren Umfeld (Hinweis auf Innenbereich wenn >15 Gebäude)
- "paragraph_35" wenn kaum Gebäude im Umfeld (<5 Gebäude)
- "unbekannt" wenn unklar
- Warnungen: max. 3, nur wenn wirklich relevant
- Empfehlungen: 2-4 konkrete nächste Schritte für den Planer
- Antworte nur auf Deutsch`,
          },
        ],
      })

      const content = message.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            planungsrecht: typeof planungsrecht
            einschaetzung: string
            warnungen: string[]
            empfehlungen: string[]
          }
          planungsrecht = parsed.planungsrecht ?? 'unbekannt'
          kiEinschaetzung = parsed.einschaetzung ?? ''
          kiWarnungen = parsed.warnungen ?? []
          kiEmpfehlungen = parsed.empfehlungen ?? []
        }
      }
    } catch {
      planungsrecht = hasBplan ? 'bplan' : gebaeudeCount >= 15 ? 'paragraph_34' : gebaeudeCount < 5 ? 'paragraph_35' : 'unbekannt'
      kiEinschaetzung = hasBplan
        ? `Für dieses Grundstück liegt ein Bebauungsplan vor (${bplanName}). Die Bebaubarkeit richtet sich nach §30 BauGB.`
        : gebaeudeCount >= 15
        ? `Das Grundstück befindet sich voraussichtlich im unbeplanten Innenbereich (§34 BauGB). ${gebaeudeCount} Gebäude wurden im weiteren Umfeld gefunden.`
        : `Planungsrechtliche Einordnung unklar. Bitte Bebauungsplan und Flächennutzungsplan der Gemeinde prüfen.`
    }
  } else {
    planungsrecht = hasBplan ? 'bplan' : gebaeudeCount >= 15 ? 'paragraph_34' : gebaeudeCount < 5 ? 'paragraph_35' : 'unbekannt'
    kiEinschaetzung = hasBplan
      ? `Für dieses Grundstück liegt ein Bebauungsplan vor (${bplanName}). Die Bebaubarkeit richtet sich nach §30 BauGB.`
      : `Planungsrechtliche Einordnung basierend auf ${gebaeudeCount} Gebäuden im Umfeld.`
  }

  // Step 4: Save to DB
  const { data: savedCheck } = await supabase
    .from('grundstueck_checks')
    .insert({
      project_id: project_id ?? null,
      address,
      flurstueck_nr: flurstueck?.kennzeichen ?? null,
      grundstueck_m2: flurstueck?.flaeche_m2 ?? null,
      planungsrecht,
      bplan_name: bplanName,
      nutzungsart: baugebiet?.nutzungsart ?? null,
      grz: baugebiet?.grz ?? null,
      gfz: baugebiet?.gfz ?? null,
      ki_einschaetzung: kiEinschaetzung,
      ki_warnungen: kiWarnungen,
      raw_bplan: bplan ? { name: bplan.name, nummer: bplan.nummer } : null,
      raw_alkis: flurstueck ? { kennzeichen: flurstueck.kennzeichen, flaeche_m2: flurstueck.flaeche_m2 } : null,
    })
    .select('id')
    .single()

  return NextResponse.json({
    check_id: savedCheck?.id ?? null,
    address,
    display_name: geocoded.display_name,
    coordinates: { lat, lon },
    flurstueck: {
      found: flurstueck !== null,
      kennzeichen: flurstueck?.kennzeichen ?? null,
      flaeche_m2: flurstueck?.flaeche_m2 ?? null,
      lagebezeichnung: flurstueck?.lagebezeichnung ?? null,
    },
    bplan: {
      found: hasBplan,
      name: bplanName,
      nutzungsart: baugebiet?.nutzungsart ?? null,
      grz: baugebiet?.grz ?? null,
      gfz: baugebiet?.gfz ?? null,
    },
    gebaeude_count: gebaeudeCount,
    planungsrecht,
    ki_einschaetzung: kiEinschaetzung,
    ki_warnungen: kiWarnungen,
    ki_empfehlungen: kiEmpfehlungen,
  })
}
