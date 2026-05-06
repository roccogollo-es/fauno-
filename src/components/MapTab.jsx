import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { BIRDS } from '../data/birds'
import 'leaflet/dist/leaflet.css'

const BIRD_COLORS = ['#2ecc71','#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c']

export default function MapTab({ onSelectBird }) {
  const [filter, setFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')

  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const currentMonthName = months[new Date().getMonth()]

  const allSightings = BIRDS.flatMap((bird, bi) =>
    bird.sightings.map(s => ({ ...s, bird, color: BIRD_COLORS[bi % BIRD_COLORS.length] }))
  ).filter(s => {
    if (filter !== 'all' && s.bird.id !== parseInt(filter)) return false
    if (monthFilter !== 'all') {
      const mIdx = months.indexOf(monthFilter)
      if (!s.bird.activeSeason.includes(mIdx)) return false
    }
    return true
  })

  return (
    <div className="map-tab fade-in">
      <header className="glass-header">
        <div className="logo">📍 Mapa Europa</div>
        <div className="map-count">{allSightings.length} avistamientos</div>
      </header>

      <div className="map-filters">
        <select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Todas las especies</option>
          {BIRDS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="filter-select" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}>
          <option value="all">Todo el año</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={[50, 10]}
          zoom={4}
          style={{ width: '100%', height: '100%', borderRadius: '20px' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {allSightings.map((s, i) => (
            <CircleMarker
              key={i}
              center={[s.lat, s.lng]}
              radius={8}
              pathOptions={{
                fillColor: s.color,
                color: s.color,
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup className="bird-popup">
                <div className="popup-content">
                  <img src={s.bird.img} alt={s.bird.name} className="popup-img" />
                  <strong>{s.bird.name}</strong>
                  <p>{s.location}</p>
                  <p>📅 {s.date}</p>
                  <p>👤 @{s.user}</p>
                  <button
                    className="popup-btn"
                    onClick={() => onSelectBird(s.bird)}
                  >
                    Ver ficha →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="map-legend">
        {BIRDS.map((b, i) => (
          <div key={b.id} className="legend-item" onClick={() => setFilter(filter === String(b.id) ? 'all' : String(b.id))}>
            <div className="legend-dot" style={{ background: BIRD_COLORS[i % BIRD_COLORS.length] }}></div>
            <span>{b.name.split(' ')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
