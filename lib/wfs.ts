// WFS helpers for Grundstückscheck (v0.2)
// ALKIS WFS MV + Bauleitplan WFS MV + Nominatim geocoding

const ALKIS_URL = 'https://www.geodaten-mv.de/dienste/alkis_wfs_einfach'
const BPLAN_URL = 'https://bauleitplaene-mv.de/dienste/basic'

export interface GeocodingResult {
  lat: number
  lon: number
  display_name: string
  importance: number
}

export interface WfsResult {
  type: string
  features: WfsFeature[]
  totalFeatures?: number
  numberReturned?: number
}

export interface WfsFeature {
  type: 'Feature'
  id: string
  geometry: GeoJsonGeometry | null
  properties: Record<string, unknown>
}

interface GeoJsonGeometry {
  type: string
  coordinates: unknown
}

// Nominatim geocoding (OSM)
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'de')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Bauline/0.2 (bauline.app; kontakt@bauline.app)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const data = await res.json() as Array<{ lat: string; lon: string; display_name: string; importance: number }>
  if (!data.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    display_name: data[0].display_name,
    importance: data[0].importance,
  }
}

// WGS84 → UTM Zone 33N (EPSG:25833) — native CRS of German geodata services
function wgs84ToUtm33n(lat: number, lon: number): { x: number; y: number } {
  const a = 6378137.0
  const f = 1 / 298.257223563
  const b = a * (1 - f)
  const e2 = 1 - (b * b) / (a * a)
  const k0 = 0.9996
  const FE = 500000 // false easting

  const latR = (lat * Math.PI) / 180
  const lonR = (lon * Math.PI) / 180
  const lon0R = (15 * Math.PI) / 180 // central meridian UTM33N

  const dLon = lonR - lon0R
  const sinLat = Math.sin(latR)
  const cosLat = Math.cos(latR)
  const tanLat = Math.tan(latR)

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const T = tanLat * tanLat
  const C = (e2 / (1 - e2)) * cosLat * cosLat
  const A = cosLat * dLon

  // Meridional arc
  const M = a * (
    (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256) * latR
    - (3 * e2 / 8 + (3 * e2 * e2) / 32 + (45 * e2 * e2 * e2) / 1024) * Math.sin(2 * latR)
    + (15 * e2 * e2 / 256 + (45 * e2 * e2 * e2) / 1024) * Math.sin(4 * latR)
    - (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latR)
  )

  const x = k0 * N * (A + ((1 - T + C) * A * A * A) / 6 + ((5 - 18 * T + T * T + 72 * C) * A * A * A * A * A) / 120) + FE
  const y = k0 * (M + N * tanLat * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24 + (61 - 58 * T + T * T) * A * A * A * A * A * A / 720))

  return { x, y }
}

// BBOX in EPSG:25833 (meters) — used for all German WFS services
function makeBbox(lat: number, lon: number, bufferM = 150): string {
  const { x, y } = wgs84ToUtm33n(lat, lon)
  return `${x - bufferM},${y - bufferM},${x + bufferM},${y + bufferM}`
}

// ALKIS WFS — Flurstücke around coordinates
export async function fetchFlurstuecke(lat: number, lon: number): Promise<WfsResult | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ave:Flurstueck',
    BBOX: makeBbox(lat, lon, 100), // 100m buffer
    outputFormat: 'application/json',
    COUNT: '5',
  })
  try {
    const res = await fetch(`${ALKIS_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return res.json() as Promise<WfsResult>
  } catch {
    return null
  }
}

// ALKIS WFS — Gebäude in 150m radius (for §34 analysis)
export async function fetchGebaeude(lat: number, lon: number): Promise<WfsResult | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ave:GebaeudeBauwerk',
    BBOX: makeBbox(lat, lon, 150), // 150m buffer
    outputFormat: 'application/json',
    COUNT: '50',
  })
  try {
    const res = await fetch(`${ALKIS_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    return res.json() as Promise<WfsResult>
  } catch {
    return null
  }
}

// Bauleitplan WFS MV — B-Pläne at coordinates
export async function fetchBplan(lat: number, lon: number): Promise<WfsResult | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ms:B_Plan',
    BBOX: makeBbox(lat, lon, 100),
    outputFormat: 'application/json',
    COUNT: '5',
  })
  try {
    const res = await fetch(`${BPLAN_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    return res.json() as Promise<WfsResult>
  } catch {
    return null
  }
}

// Bauleitplan WFS MV — Baugebietsteilflächen (for Nutzungsart)
export async function fetchBaugebiet(lat: number, lon: number): Promise<WfsResult | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ms:BP_Baugebietsteilflaeche',
    BBOX: makeBbox(lat, lon, 100),
    outputFormat: 'application/json',
    COUNT: '5',
  })
  try {
    const res = await fetch(`${BPLAN_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    return res.json() as Promise<WfsResult>
  } catch {
    return null
  }
}
