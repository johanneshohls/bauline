import { NextResponse, type NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import {
  geocodeAddress,
  fetchFlurstuecke,
  fetchGebaeude,
  fetchBplan,
  fetchBaugebiet,
  type WfsFeature,
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
  const [flurstueckeRaw, gebaeudeRaw, bplanRaw, baugebietRaw] = await Promise.allSettled([
    fetchFlurstuecke(lat, lon),
    fetchGebaeude(lat, lon),
    fetchBplan(lat, lon),
    fetchBaugebiet(lat, lon),
  ])

  const flurstuecke = flurstueckeRaw.status === 'fulfilled' ? flurstueckeRaw.value : null
  const gebaeude = gebaeudeRaw.status === 'fulfilled' ? gebaeudeRaw.value : null
  const bplan = bplanRaw.status === 'fulfilled' ? bplanRaw.value : null
  const baugebiet = baugebietRaw.status === 'fulfilled' ? baugebietRaw.value : null

  // Extract key data
  const flurstueckFeature = flurstuecke?.features?.[0] ?? null
  const flurstueckProps = flurstueckFeature?.properties ?? {}
  const gebaeudeCount = gebaeude?.features?.length ?? 0
  const bplanFeatures = bplan?.features ?? []
  const baugebietFeatures = baugebiet?.features ?? []
  const hasBplan = bplanFeatures.length > 0

  // Extract B-Plan info
  const bplanName = hasBplan
    ? (bplanFeatures[0]?.properties?.['name'] as string | undefined) ||
      (bplanFeatures[0]?.properties?.['nummer'] as string | undefined) ||
      'Unbekannter B-Plan'
    : null

  const nutzungsart = baugebietFeatures[0]?.properties?.['nutzungsart'] as string | undefined
  const grzValue = baugebietFeatures[0]?.properties?.['GRZ'] as number | undefined
  const gfzValue = baugebietFeatures[0]?.properties?.['GFZ'] as number | undefined

  // Step 3: Claude KI-Analyse
  const contextData = buildContextData({
    address,
    displayName: geocoded.display_name,
    lat, lon,
    flurstueckProps,
    gebaeudeCount,
    bplanFeatures,
    baugebietFeatures,
    hasBplan,
  })

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
- "paragraph_34" wenn ${gebaeudeCount} Gebäude im Umfeld (>8 Gebäude = starker Hinweis auf Innenbereich)
- "paragraph_35" wenn kaum Gebäude im Umfeld (<3 Gebäude)
- "unbekannt" wenn unklar
- Warnungen: max. 3, nur wenn wirklich relevant (Denkmalschutz, Küstenschutz, Außenbereich-Restriktionen)
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
      // Claude call failed — continue without AI analysis
      kiEinschaetzung = hasBplan
        ? `Für dieses Grundstück liegt ein Bebauungsplan vor (${bplanName}). Die Bebaubarkeit richtet sich nach §30 BauGB.`
        : gebaeudeCount >= 8
        ? `Das Grundstück befindet sich voraussichtlich im unbeplanten Innenbereich (§34 BauGB). ${gebaeudeCount} Gebäude wurden im näheren Umfeld gefunden.`
        : `Planungsrechtliche Einordnung unklar. Bitte Bebauungsplan und Flächennutzungsplan der Gemeinde prüfen.`
      planungsrecht = hasBplan ? 'bplan' : gebaeudeCount >= 8 ? 'paragraph_34' : 'unbekannt'
    }
  } else {
    // No API key — simple heuristic
    planungsrecht = hasBplan ? 'bplan' : gebaeudeCount >= 8 ? 'paragraph_34' : gebaeudeCount < 3 ? 'paragraph_35' : 'unbekannt'
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
      flurstueck_nr: (flurstueckProps['flurstueckkennzeichen'] as string | undefined) ?? null,
      grundstueck_m2: (flurstueckProps['amtlicheFlaeche'] as number | undefined) ?? null,
      planungsrecht,
      bplan_name: bplanName,
      nutzungsart: nutzungsart ?? null,
      grz: grzValue ?? null,
      gfz: gfzValue ?? null,
      ki_einschaetzung: kiEinschaetzung,
      ki_warnungen: kiWarnungen,
      raw_bplan: bplan ? { features: bplanFeatures.slice(0, 3) } : null,
      raw_alkis: flurstueckFeature ? { feature: { properties: flurstueckProps } } : null,
    })
    .select('id')
    .single()

  return NextResponse.json({
    check_id: savedCheck?.id ?? null,
    address,
    display_name: geocoded.display_name,
    coordinates: { lat, lon },
    flurstueck: {
      found: !!flurstueckFeature,
      kennzeichen: (flurstueckProps['flurstueckkennzeichen'] as string | undefined) ?? null,
      flaeche_m2: (flurstueckProps['amtlicheFlaeche'] as number | undefined) ?? null,
      lagebezeichnung: (flurstueckProps['lagebezeichnung'] as string | undefined) ?? null,
    },
    bplan: {
      found: hasBplan,
      name: bplanName,
      count: bplanFeatures.length,
      nutzungsart: nutzungsart ?? null,
      grz: grzValue ?? null,
      gfz: gfzValue ?? null,
    },
    gebaeude_count: gebaeudeCount,
    planungsrecht,
    ki_einschaetzung: kiEinschaetzung,
    ki_warnungen: kiWarnungen,
    ki_empfehlungen: kiEmpfehlungen,
  })
}

function buildContextData(data: {
  address: string
  displayName: string
  lat: number
  lon: number
  flurstueckProps: Record<string, unknown>
  gebaeudeCount: number
  bplanFeatures: WfsFeature[]
  baugebietFeatures: WfsFeature[]
  hasBplan: boolean
}): string {
  const lines: string[] = [
    `Adresse: ${data.address}`,
    `Gefundene Adresse: ${data.displayName}`,
    `Koordinaten: ${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}`,
    '',
  ]

  if (data.flurstueckProps && Object.keys(data.flurstueckProps).length > 0) {
    lines.push('ALKIS Flurstücksdaten:')
    if (data.flurstueckProps['flurstueckkennzeichen']) {
      lines.push(`  Kennzeichen: ${data.flurstueckProps['flurstueckkennzeichen']}`)
    }
    if (data.flurstueckProps['amtlicheFlaeche']) {
      lines.push(`  Amtliche Fläche: ${data.flurstueckProps['amtlicheFlaeche']} m²`)
    }
    if (data.flurstueckProps['lagebezeichnung']) {
      lines.push(`  Lagebezeichnung: ${data.flurstueckProps['lagebezeichnung']}`)
    }
    lines.push('')
  }

  lines.push(`Gebäude im Umfeld (ca. 120m Radius): ${data.gebaeudeCount} Gebäude`)
  lines.push('')

  if (data.hasBplan) {
    lines.push(`BAULEITPLANUNG: ${data.bplanFeatures.length} B-Plan(Pläne) gefunden`)
    data.bplanFeatures.slice(0, 2).forEach((f, i) => {
      const props = f.properties
      lines.push(`  B-Plan ${i + 1}:`)
      if (props['name']) lines.push(`    Name: ${props['name']}`)
      if (props['nummer']) lines.push(`    Nummer: ${props['nummer']}`)
      if (props['gemeinde']) lines.push(`    Gemeinde: ${props['gemeinde']}`)
    })
    if (data.baugebietFeatures.length > 0) {
      const bg = data.baugebietFeatures[0].properties
      lines.push(`  Baugebiet: Nutzungsart=${bg['nutzungsart'] ?? 'unbekannt'}, GRZ=${bg['GRZ'] ?? '-'}, GFZ=${bg['GFZ'] ?? '-'}`)
    }
  } else {
    lines.push('BAULEITPLANUNG: Kein B-Plan gefunden')
  }

  return lines.join('\n')
}
