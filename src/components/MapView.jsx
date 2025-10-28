import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useMemo } from 'react'

// Fix de iconos por defecto en Vite (Leaflet)
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({ iconUrl, iconRetinaUrl, shadowUrl, iconSize: [25,41], iconAnchor: [12,41] })
L.Marker.prototype.options.icon = DefaultIcon

export default function MapView({ center, radiusMeters, points, pickMode = false, onPickLocation }) {
  const circleColor = '#2563eb'
  const mapCenter = useMemo(() => [center.lat, center.lon], [center])

  return (
    <div className="map-wrap" style={{ position: 'relative' }}>
      {pickMode && (
        <div className="map-hint">
          Haz clic en el mapa para elegir tu ubicación
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: 12, cursor: pickMode ? 'crosshair' : 'grab' }}
      >
        <TileLayer
          // Uso de tile server público de OSM (uso responsable y con atribución)
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Captura de clics para modo selección */}
        <MapClickPicker enabled={pickMode} onPickLocation={onPickLocation} />

        {/* Círculo del radio actual */}
        <Circle center={mapCenter} radius={radiusMeters} pathOptions={{ color: circleColor, fillOpacity: 0.05 }} />

        {/* Marcadores de resultados visibles */}
        {points.map(p => (
          <Marker key={p.id} position={[p.lat, p.lon]}>
            <Popup>
              <strong>{p.tags?.name || 'Sin nombre'}</strong><br/>
              <small>{formatTags(p.tags)}</small>
            </Popup>
          </Marker>
        ))}

        {/* Pin del centro actual (opcional, sirve de referencia) */}
        <Marker position={mapCenter}>
          <Popup>Centro de búsqueda</Popup>
        </Marker>
      </MapContainer>
    </div>
  )
}

function MapClickPicker({ enabled, onPickLocation }) {
  useMapEvents({
    click(e) {
      if (!enabled) return
      const { lat, lng } = e.latlng
      onPickLocation?.({ lat, lon: lng })
    }
  })
  return null
}

function formatTags(tags = {}) {
  const label = tags.amenity || tags.social_facility || 'recurso'
  const oh = tags.opening_hours ? ` · Horarios: ${tags.opening_hours}` : ''
  return `${label}${oh}`
}