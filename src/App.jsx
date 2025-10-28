import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import { CATEGORIES, buildOverpassQL } from './lib/categories.js'
import { queryOverpass, toGeoPoints, haversineKm } from './lib/overpass.js'

export default function App() {
  const [lat, setLat] = useState(20.6736)
  const [lon, setLon] = useState(-103.344)
  const [radiusKm, setRadiusKm] = useState(3)

  // ⬇️ Arrancamos con NINGUNA categoría seleccionada
  const [activeKeys, setActiveKeys] = useState([])

  const [pickMode, setPickMode] = useState(false)
  const [committed, setCommitted] = useState(null) // { lat, lon, radiusMeters, activeKeys }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [points, setPoints] = useState([])

  const PAGE = 30
  const [visibleCount, setVisibleCount] = useState(PAGE)

  const currentCenter = useMemo(() => ({ lat, lon }), [lat, lon])
  const mapCenter = useMemo(
    () => (committed ? { lat: committed.lat, lon: committed.lon } : currentCenter),
    [committed, currentCenter]
  )
  const radiusMetersUI = useMemo(() => Math.max(100, Math.round(radiusKm * 1000)), [radiusKm])

  async function handleSearch() {
    // ⬇️ Evitamos consultas si no hay categorías seleccionadas
    if (activeKeys.length === 0) {
      setError('Selecciona al menos un tipo de recurso antes de buscar.')
      setCommitted(null)
      setPoints([])
      return
    }
    setError('')
    const snapshot = { lat, lon, radiusMeters: radiusMetersUI, activeKeys: [...activeKeys] }
    setCommitted(snapshot)
    setVisibleCount(PAGE)
  }

  function getLocation() {
    if (!('geolocation' in navigator)) return alert('Geolocalización no disponible en este navegador.')
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLon(pos.coords.longitude) },
      (err) => alert('No se pudo obtener tu ubicación: ' + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function handlePickOnMap({ lat: newLat, lon: newLon }) {
    setLat(newLat); setLon(newLon); setPickMode(false)
  }

  useEffect(() => {
    if (!committed) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const ql = buildOverpassQL({
          lat: committed.lat,
          lon: committed.lon,
          radiusMeters: committed.radiusMeters,
          activeKeys: committed.activeKeys
        })
        const json = await queryOverpass(ql)
        if (cancelled) return
        const pts = toGeoPoints(json).map(p => ({
          ...p,
          _distKm: haversineKm({ lat: committed.lat, lon: committed.lon }, { lat: p.lat, lon: p.lon })
        })).sort((a,b) => a._distKm - b._distKm)
        setPoints(pts)
      } catch (e) {
        if (!cancelled) setError(e.message || 'Hubo un problema consultando Overpass.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [committed])

  function toggleCat(key) {
    setActiveKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const pointsVisible = useMemo(() => points.slice(0, visibleCount), [points, visibleCount])

  function iconFor(p) {
    const tag = p.tags?.amenity || p.tags?.social_facility || p.tags?.healthcare
    if (tag === 'recycling') return '♻️'
    if (tag === 'library') return '📚'
    if (tag === 'clinic') return '🏥'
    if (tag === 'hospital') return '🏥'
    if (tag === 'pharmacy') return '💊'
    if (tag === 'community_centre') return '🏛️'
    if (tag === 'doctors' || tag === 'doctor') return '🩺'
    if (tag === 'dentist') return '🦷'
    if (tag === 'veterinary') return '🐾'
    if (tag === 'soup_kitchen') return '🍲'
    if (tag === 'psychotherapist' || tag === 'psychologist' || tag === 'therapy') return '🧠'
    return '📍'
  }

  return (
    <div>
      <header className="header">
        <div className="container hstack" style={{ justifyContent:'space-between' }}>
          <div className="title">EcoMapa Comunitario</div>
        </div>
      </header>

      <main className="container grid" style={{ marginTop: 14 }}>
        {/* Columna 1: Filtros */}
        <section className="vstack sidebar">
          <div className="card vstack">
            <div className="label">Ubicación</div>
            <div className="hstack">
              <input className="input" type="number" step="0.0001" value={lat} onChange={e=>setLat(parseFloat(e.target.value))} placeholder="Latitud" />
              <input className="input" type="number" step="0.0001" value={lon} onChange={e=>setLon(parseFloat(e.target.value))} placeholder="Longitud" />
            </div>

            <div className="hstack" style={{ justifyContent:'space-between', gap: 8 }}>
              <div>
                <div className="label">Radio (km)</div>
                <input className="input" type="range" min={0.1} max={10} step={0.1} value={radiusKm} onChange={e=>setRadiusKm(parseFloat(e.target.value))} />
                <div className="small" style={{ color:'var(--muted)' }}>{radiusKm.toFixed(1)} km</div>
              </div>
              <div className="vstack" style={{ gap: 8 }}>
                <button className="btn" onClick={getLocation}>Usar mi ubicación</button>
                <button className="btn" onClick={() => setPickMode(v => !v)} title="Haz clic en el mapa para elegir" style={{ borderColor: pickMode ? 'var(--accent-2)' : undefined }}>
                  {pickMode ? 'Cancelar selección' : 'Elegir en el mapa'}
                </button>
                <button className="btn primary" onClick={handleSearch} disabled={loading || activeKeys.length === 0}
                  title={activeKeys.length === 0 ? 'Selecciona al menos un tipo' : 'Buscar recursos'}>
                  {loading ? 'Buscando…' : 'Buscar'}
                </button>
              </div>
            </div>
          </div>

          <div className="card vstack">
            <div className="label">Tipos de recurso</div>
            <div className="vstack" style={{ gap: 8 }}>
              {CATEGORIES.map(cat => (
                <label key={cat.key} className="check-pill">
                  <span>{cat.label}</span>
                  <input type="checkbox" checked={activeKeys.includes(cat.key)} onChange={() => toggleCat(cat.key)} />
                </label>
              ))}
            </div>
            <div className="small" style={{ color:'var(--muted)' }}>
              Selecciona uno o más tipos y pulsa <b>Buscar</b>.
            </div>
          </div>

          <div className="small" style={{ color:'var(--muted)' }}>
            Datos © OpenStreetMap contributors — Servidos vía Overpass API.
          </div>
        </section>

        {/* Columna 2: Resultados */}
        <section className="results-col vstack">
          <div className="card hstack" style={{ justifyContent:'space-between' }}>
            <div className="small" style={{ color:'var(--muted)' }}>
              {committed ? <>Resultados: <strong>{points.length}</strong> (mostrando {pointsVisible.length})</> : <>Sin búsqueda activa</>}
            </div>
            {error ? <div className="small" style={{color:'#b91c1c'}}>{error}</div> : null}
          </div>

          <div className="card results-scroll list">
            {!committed && (
              <div className="small" style={{ color:'var(--muted)' }}>
                Define tu ubicación, elige categorías y pulsa <b>Buscar</b>.
              </div>
            )}

            {committed && pointsVisible.map(p => (
              <article key={p.id} className="item">
                <h4><span>{iconFor(p)}</span>{p.tags?.name || 'Sin nombre'}</h4>
                <div className="meta">
                  <span>{p.tags?.amenity || p.tags?.social_facility || p.tags?.healthcare || 'recurso'}</span>
                  <span>• {p._distKm.toFixed(2)} km</span>
                  {p.tags?.opening_hours && <span>• Horarios: {p.tags.opening_hours}</span>}
                </div>
                <div className="actions">
                  <a className="btn" href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${committed.lat}%2C${committed.lon}%3B${p.lat}%2C${p.lon}`} target="_blank" rel="noreferrer">
                    Cómo llegar
                  </a>
                </div>
              </article>
            ))}

            {committed && !loading && !error && pointsVisible.length === 0 && (
              <div className="small">No se encontraron puntos en el radio seleccionado.</div>
            )}

            {error && !loading && (
              <div className="small" style={{color:'#b91c1c'}}>
                {error}
              </div>
            )}

            {committed && pointsVisible.length < points.length && (
              <div style={{ display:'flex', justifyContent:'center', marginTop: 8 }}>
                <button className="btn" onClick={() => setVisibleCount(v => v + PAGE)} disabled={loading}>
                  Cargar más resultados
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Columna 3: Mapa */}
        <section>
          <div className="map-wrap">
            <MapView
              center={mapCenter}
              radiusMeters={committed ? committed.radiusMeters : radiusMetersUI}
              points={pointsVisible}
              pickMode={pickMode}
              onPickLocation={handlePickOnMap}
            />
          </div>
        </section>
      </main>
    </div>
  )
}