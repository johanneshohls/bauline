export default function GrundstueckscheckPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Grundstückscheck</h1>
      <p className="text-sm text-gray-500 mb-6">LP1 — Planungsrecht + ALKIS-Analyse</p>

      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <div className="w-12 h-12 bg-[#1a5276]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-[#1a5276]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h2 className="text-base font-medium text-gray-900 mb-2">
          Kommt in Milestone v0.2
        </h2>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          ALKIS WFS + Bauleitplan WFS MV abfragen, §34/35-Analyse mit Claude API.
          Begrenzt auf Landkreis NWM.
        </p>
      </div>
    </div>
  )
}
