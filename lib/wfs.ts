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

// BBOX string for WFS queries — small buffer around point
// Using CRS84 (lon, lat axis order) which is widely supported
function makeBbox(lat: number, lon: number, bufferDeg = 0.002): string {
  return `${lon - bufferDeg},${lat - bufferDeg},${lon + bufferDeg},${lat + bufferDeg},urn:ogc:def:crs:OGC::CRS84`
}

// ALKIS WFS — Flurstücke around coordinates
export async function fetchFlurstuecke(lat: number, lon: number): Promise<WfsResult | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ave:Flurstueck',
    BBOX: makeBbox(lat, lon, 0.001), // ~80m buffer — tight to get the one plot
    outputFormat: 'application/json',
    SRSNAME: 'EPSG:4326',
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
    BBOX: makeBbox(lat, lon, 0.0015), // ~120m buffer
    outputFormat: 'application/json',
    SRSNAME: 'EPSG:4326',
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
    BBOX: makeBbox(lat, lon, 0.001),
    outputFormat: 'application/json',
    SRSNAME: 'EPSG:4326',
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
    BBOX: makeBbox(lat, lon, 0.001),
    outputFormat: 'application/json',
    SRSNAME: 'EPSG:4326',
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
