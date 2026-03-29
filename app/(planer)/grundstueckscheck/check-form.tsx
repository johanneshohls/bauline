'use client'

import { useState } from 'react'
import { MapView } from './map-view'

interface CheckResult {
  check_id: string | null
  address: string
  display_name: string
  coordinates: { lat: number; lon: number }
  flurstueck: {
    found: boolean
    kennzeichen: string | null
    flaeche_m2: number | null
    lagebezeichnung: string | null
  }
  bplan: {
    found: boolean
    name: string | null
    count: number
    nutzungsart: string | null
    grz: number | null
    gfz: number | null
  }
  gebaeude_count: number
  planungsrecht: 'bplan' | 'paragraph_34' | 'paragraph_35' | 'unbekannt'
  ki_einschaetzung: string
  ki_warnungen: string[]
  ki_empfehlungen: string[]
}

const planungsrechtLabels: Record<string, string> = {
  bplan: '§30 Bebauungsplan',
  paragraph_34: '§34 Innenbereich',
  paragraph_35: '§35 Außenbereich',
  unbekannt: 'Unklar',
}

const planungsrechtColors: Record<string, string> = {
  bplan: 'bg-green-100 text-green-800 border-green-200',
  paragraph_34: 'bg-blue-100 text-blue-800 border-blue-200',
  paragraph_35: 'bg-orange-100 text-orange-800 border-orange-200',
  unbekannt: 'bg-gray-100 text-gray-600 border-gray-200',
}

export function CheckForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [address, setAddress] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/grundstueckscheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          project_id: projectId || undefined,
        }),
      })
      const data = await res.json() as CheckResult & { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Analysieren')
      } else {
        setResult(data)
      }
    } catch {
      setError('Netzwerkfehler — bitte erneut versuchen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Input Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse des Grundstücks
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="z.B. Musterstraße 5, 19053 Schwerin"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276]/30 focus:border-[#1a5276]"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Straße, Hausnummer und Ort angeben für beste Ergebnisse. Nur Mecklenburg-Vorpommern.
            </p>
          </div>

          {projects.length > 0 && (
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1.5">
                Projekt zuordnen <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                id="project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276]/30 focus:border-[#1a5276] bg-white"
                disabled={loading}
              >
                <option value="">— kein Projekt —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !address.trim()}
            className="inline-flex items-center gap-2 bg-[#1a5276] text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-[#154360] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analysiere…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Grundstück analysieren
              </>
            )}
          </button>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
          <div className="inline-flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-[#1a5276]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-700">Grundstück wird analysiert</p>
              <p className="text-xs text-gray-400 mt-1">ALKIS & Bauleitplan WFS werden abgefragt…</p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && <CheckResult result={result} />}
    </div>
  )
}

function CheckResult({ result }: { result: CheckResult }) {
  const pr = result.planungsrecht
  const prColor = planungsrechtColors[pr] ?? planungsrechtColors.unbekannt
  const prLabel = planungsrechtLabels[pr] ?? 'Unklar'

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Analysiertes Grundstück</p>
            <p className="font-medium text-gray-900 truncate">{result.address}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{result.display_name}</p>
          </div>
          <span className={`shrink-0 text-sm font-semibold px-3 py-1 rounded-full border ${prColor}`}>
            {prLabel}
          </span>
        </div>

        {/* KI Einschätzung */}
        {result.ki_einschaetzung && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">KI-Einschätzung</p>
            <p className="text-sm text-gray-700 leading-relaxed">{result.ki_einschaetzung}</p>
          </div>
        )}
      </div>

      {/* Karte */}
      <MapView
        lat={result.coordinates.lat}
        lon={result.coordinates.lon}
        label={result.address}
      />

      {/* Data grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Flurstück */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Flurstück (ALKIS)</p>
          {result.flurstueck.found ? (
            <dl className="space-y-2">
              {result.flurstueck.kennzeichen && (
                <div>
                  <dt className="text-xs text-gray-400">Kennzeichen</dt>
                  <dd className="text-sm text-gray-700 font-mono">{result.flurstueck.kennzeichen}</dd>
                </div>
              )}
              {result.flurstueck.flaeche_m2 && (
                <div>
                  <dt className="text-xs text-gray-400">Fläche</dt>
                  <dd className="text-sm text-gray-700">{Math.round(result.flurstueck.flaeche_m2).toLocaleString('de-DE')} m²</dd>
                </div>
              )}
              {result.flurstueck.lagebezeichnung && (
                <div>
                  <dt className="text-xs text-gray-400">Lage</dt>
                  <dd className="text-sm text-gray-700">{result.flurstueck.lagebezeichnung}</dd>
                </div>
              )}
              {!result.flurstueck.kennzeichen && !result.flurstueck.flaeche_m2 && (
                <p className="text-sm text-gray-500">Flurstück gefunden — keine Detaildaten verfügbar</p>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">Kein Flurstück gefunden</p>
          )}
        </div>

        {/* B-Plan */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Bebauungsplan</p>
          {result.bplan.found ? (
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-gray-400">Name</dt>
                <dd className="text-sm text-gray-700 font-medium">{result.bplan.name}</dd>
              </div>
              {result.bplan.nutzungsart && (
                <div>
                  <dt className="text-xs text-gray-400">Nutzungsart</dt>
                  <dd className="text-sm text-gray-700">{result.bplan.nutzungsart}</dd>
                </div>
              )}
              {result.bplan.grz !== null && (
                <div>
                  <dt className="text-xs text-gray-400">GRZ</dt>
                  <dd className="text-sm text-gray-700">{result.bplan.grz}</dd>
                </div>
              )}
              {result.bplan.gfz !== null && (
                <div>
                  <dt className="text-xs text-gray-400">GFZ</dt>
                  <dd className="text-sm text-gray-700">{result.bplan.gfz}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-400">Kein B-Plan vorhanden</p>
          )}
        </div>

        {/* Umfeld */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Umfeld</p>
          <dl className="space-y-2">
            <div>
              <dt className="text-xs text-gray-400">Gebäude im Umfeld (~120m)</dt>
              <dd className="text-2xl font-semibold text-gray-900">{result.gebaeude_count}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Koordinaten</dt>
              <dd className="text-xs text-gray-500 font-mono">
                {result.coordinates.lat.toFixed(5)}, {result.coordinates.lon.toFixed(5)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Warnungen */}
      {result.ki_warnungen.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-3">Hinweise</p>
          <ul className="space-y-1.5">
            {result.ki_warnungen.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empfehlungen */}
      {result.ki_empfehlungen.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Nächste Schritte</p>
          <ol className="space-y-2">
            {result.ki_empfehlungen.map((e, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#1a5276]/10 text-[#1a5276] text-xs font-semibold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {e}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
