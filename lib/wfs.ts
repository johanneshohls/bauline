// WFS helpers for Grundstückscheck (v0.2)
// ALKIS WFS MV (GML/XML only) + Bauleitplan WFS MV + Nominatim geocoding

const ALKIS_URL = 'https://www.geodaten-mv.de/dienste/alkis_wfs_einfach'
const BPLAN_URL = 'https://bauleitplaene-mv.de/dienste/basic'

export interface GeocodingResult {
  lat: number
  lon: number
  display_name: string
}

export interface FlurstueckData {
  kennzeichen: string | null
  flaeche_m2: number | null
  lagebezeichnung: string | null
}

export interface BplanData {
  name: string | null
  nummer: string | null
}

export interface BaugebietData {
  nutzungsart: string | null
  grz: number | null
  gfz: number | null
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
  const data = await res.json() as Array<{ lat: string; lon: string; display_name: string }>
  if (!data.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    display_name: data[0].display_name,
  }
}

// WGS84 → UTM Zone 33N (EPSG:25833)
// Based on standard Transverse Mercator projection formulas
function wgs84ToUtm33n(lat: number, lon: number): { x: number; y: number } {
  const a = 6378137.0           // WGS84 semi-major axis
  const e2 = 0.00669437999014   // WGS84 first eccentricity squared
  const k0 = 0.9996             // UTM scale factor
  const FE = 500000             // false easting

  const latR = (lat * Math.PI) / 180
  const lon0R = (15 * Math.PI) / 180  // central meridian UTM33N = 15°E
  const dLon = (lon * Math.PI) / 180 - lon0R

  const sinLat = Math.sin(latR)
  const cosLat = Math.cos(latR)
  const tanLat = Math.tan(latR)
  const n2 = e2 * cosLat * cosLat / (1 - e2)

  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat)
  const T = tanLat * tanLat
  const C = n2

  // Reduced meridional arc coefficients
  const e4 = e2 * e2
  const e6 = e4 * e2
  const A0 = 1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256
  const A2 = 3 / 8 * (e2 + e4 / 4 + 15 * e6 / 128)
  const A4 = 15 / 256 * (e4 + 3 * e6 / 4)
  const A6 = 35 * e6 / 3072

  const M = a * (
    A0 * latR
    - A2 * Math.sin(2 * latR)
    + A4 * Math.sin(4 * latR)
    - A6 * Math.sin(6 * latR)
  )

  const dLon2 = dLon * dLon
  const dLon4 = dLon2 * dLon2

  const x = k0 * N * dLon * cosLat * (
    1
    + dLon2 * cosLat * cosLat * (1 - T + C) / 6
    + dLon4 * cosLat * cosLat * cosLat * cosLat * (5 - 18 * T + T * T + 72 * C - 58 * n2) / 120
  ) + FE

  const y = k0 * (
    M
    + N * tanLat * (
      dLon2 / 2
      + dLon4 * (5 - T + 9 * C + 4 * C * C) / 24
      + dLon2 * dLon4 * (61 - 58 * T + T * T + 600 * C - 330 * n2) / 720
    )
  )

  return { x, y }
}

// BBOX in EPSG:25833 (meters) — native CRS of MV geodata services
// 700m buffer to account for geocoding offset + ensure good coverage
function makeBbox(lat: number, lon: number, bufferM: number): string {
  const { x, y } = wgs84ToUtm33n(lat, lon)
  return `${Math.round(x - bufferM)},${Math.round(y - bufferM)},${Math.round(x + bufferM)},${Math.round(y + bufferM)}`
}

// Parse numberReturned / numberMatched from WFS GML response
function parseGmlCount(xml: string): number {
  const matched = xml.match(/numberMatched="(\d+)"/)
  if (matched?.[1]) return parseInt(matched[1])
  const returned = xml.match(/numberReturned="(\d+)"/)
  if (returned?.[1]) return parseInt(returned[1])
  return 0
}

// Parse a named element's text content from GML
function parseGmlProp(xml: string, tag: string): string | null {
  const re = new RegExp(`<[^:>]+:${tag}[^>]*>([^<]+)<`, 'i')
  return xml.match(re)?.[1]?.trim() ?? null
}

// ALKIS WFS — Gebäude count in radius (for §34 analysis)
// Use 700m buffer: geocoding can be off by ~400-600m; we want all buildings in the settlement
export async function fetchGebaeudeCount(lat: number, lon: number): Promise<number> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ave:GebaeudeBauwerk',
    BBOX: makeBbox(lat, lon, 700),
    outputFormat: 'text/xml; subtype=gml/3.1.1',
    COUNT: '100',
    RESULTTYPE: 'hits',  // only count, no features needed
  })
  try {
    const res = await fetch(`${ALKIS_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return 0
    const xml = await res.text()
    return parseGmlCount(xml)
  } catch {
    return 0
  }
}

// ALKIS WFS — Flurstück data for a point
export async function fetchFlurstueck(lat: number, lon: number): Promise<FlurstueckData | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ave:Flurstueck',
    BBOX: makeBbox(lat, lon, 300),
    outputFormat: 'text/xml; subtype=gml/3.1.1',
    COUNT: '1',
  })
  try {
    const res = await fetch(`${ALKIS_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return null
    const xml = await res.text()
    if (parseGmlCount(xml) === 0) return null
    const flaeche = parseGmlProp(xml, 'amtlicheFlaeche')
    return {
      kennzeichen: parseGmlProp(xml, 'flurstueckkennzeichen'),
      flaeche_m2: flaeche ? parseFloat(flaeche) : null,
      lagebezeichnung: parseGmlProp(xml, 'lagebezeichnung') ?? parseGmlProp(xml, 'lagebezeichnungMitVerschluesselung'),
    }
  } catch {
    return null
  }
}

// Bauleitplan WFS MV — B-Plan at coordinates
export async function fetchBplan(lat: number, lon: number): Promise<BplanData | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ms:B_Plan',
    BBOX: makeBbox(lat, lon, 300),
    COUNT: '1',
  })
  try {
    const res = await fetch(`${BPLAN_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const xml = await res.text()
    const returned = xml.match(/numberReturned="(\d+)"/)?.[1]
    if (!returned || parseInt(returned) === 0) return null
    return {
      name: parseGmlProp(xml, 'name'),
      nummer: parseGmlProp(xml, 'nummer'),
    }
  } catch {
    return null
  }
}

// Bauleitplan WFS MV — Baugebietsteilfläche (Nutzungsart, GRZ, GFZ)
export async function fetchBaugebiet(lat: number, lon: number): Promise<BaugebietData | null> {
  const params = new URLSearchParams({
    SERVICE: 'WFS',
    VERSION: '2.0.0',
    REQUEST: 'GetFeature',
    TYPENAMES: 'ms:BP_Baugebietsteilflaeche',
    BBOX: makeBbox(lat, lon, 300),
    COUNT: '1',
  })
  try {
    const res = await fetch(`${BPLAN_URL}?${params}`, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
    if (!res.ok) return null
    const xml = await res.text()
    const returned = xml.match(/numberReturned="(\d+)"/)?.[1]
    if (!returned || parseInt(returned) === 0) return null
    const grz = parseGmlProp(xml, 'GRZ') ?? parseGmlProp(xml, 'grz')
    const gfz = parseGmlProp(xml, 'GFZ') ?? parseGmlProp(xml, 'gfz')
    return {
      nutzungsart: parseGmlProp(xml, 'nutzungsart') ?? parseGmlProp(xml, 'BP_BaugebietsTeilFlaeche'),
      grz: grz ? parseFloat(grz) : null,
      gfz: gfz ? parseFloat(gfz) : null,
    }
  } catch {
    return null
  }
}
