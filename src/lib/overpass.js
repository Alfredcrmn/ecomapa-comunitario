const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

export async function queryOverpass(ql) {
  const url = OVERPASS_URL + '?data=' + encodeURIComponent(ql)
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      // No obligatorio, pero cortés:
      'User-Agent': 'EcoMapa-Comunitario/1.0 (+educativo)'
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Overpass error ${res.status}: ${text.slice(0,200)}`)
  }
  const json = await res.json()
  return json
}

export function toGeoPoints(overpassJson) {
  if (!overpassJson || !Array.isArray(overpassJson.elements)) return []
  return overpassJson.elements
    .map(el => {
      if (el.type === 'node') {
        return { id: `${el.type}/${el.id}`, lat: el.lat, lon: el.lon, tags: el.tags || {} }
      }
      if (el.center) {
        return { id: `${el.type}/${el.id}`, lat: el.center.lat, lon: el.center.lon, tags: el.tags || {} }
      }
      return null
    })
    .filter(Boolean)
}

export function haversineKm(a, b) {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLon = (b.lon - a.lon) * Math.PI / 180
  const la1 = a.lat * Math.PI / 180
  const la2 = b.lat * Math.PI / 180
  const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}