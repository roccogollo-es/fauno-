import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import { BIRDS } from '../data/birds'
import { localizeBird } from '../i18n'
import 'leaflet/dist/leaflet.css'

const BIRD_COLORS = ['#2ecc71','#3498db','#e74c3c','#f39c12','#9b59b6','#1abc9c']

const apiText = {
  es: { live: 'Mapa real', initial: 'Datos iniciales', pending: 'Pendiente', verified: 'Verificado' },
  en: { live: 'Real map', initial: 'Initial data', pending: 'Pending', verified: 'Verified' },
  fr: { live: 'Carte réelle', initial: 'Données initiales', pending: 'En attente', verified: 'Vérifié' },
  de: { live: 'Echte Karte', initial: 'Startdaten', pending: 'Ausstehend', verified: 'Bestätigt' },
  pt: { live: 'Mapa real', initial: 'Dados iniciais', pending: 'Pendente', verified: 'Verificado' },
  it: { live: 'Mappa reale', initial: 'Dati iniziali', pending: 'In attesa', verified: 'Verificato' },
}

const createCustomIcon = (sighting) => {
  const isEmoji = typeof sighting.bird.img === 'string' && sighting.bird.img.length <= 4
  const innerHtml = isEmoji
    ? `<div class="marker-emoji">${sighting.bird.img}</div>`
    : `<img src="${sighting.bird.img}" alt="${sighting.bird.name}" class="marker-thumb" />`

  return L.divIcon({
    html: `<div class="custom-bird-marker" style="border-color: ${sighting.color || '#2ecc71'}">
             ${innerHtml}
           </div>`,
    className: 'custom-leaflet-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  })
}


export default function MapTab({ onSelectBird, copy, language }) {
  const [filter, setFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [apiPoints, setApiPoints] = useState([])
  const [apiStatus, setApiStatus] = useState('loading')
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]) // Default to Madrid center
  const [mapZoom, setMapZoom] = useState(5)
  const ui = apiText[language] || apiText.en

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude])
          setMapZoom(11) // Set a closer zoom once GPS resolves
        },
        () => console.info('Geolocation access denied or unavailable')
      )
    }
  }, [])

  useEffect(() => {
    let ignore = false
    fetch('/api/observations/map')
      .then((res) => {
        if (!res.ok) throw new Error('Map API unavailable')
        return res.json()
      })
      .then((data) => {
        if (ignore) return
        setApiPoints(Array.isArray(data.points) ? data.points : [])
        setApiStatus('ready')
      })
      .catch(() => {
        if (ignore) return
        setApiPoints([])
        setApiStatus('offline')
      })

    return () => { ignore = true }
  }, [])

  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index),
    label: new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date(2026, index, 1)),
  }))
  const localizedBirds = BIRDS.map((bird) => localizeBird(bird, language))
  const localBirdIds = new Set(localizedBirds.map((bird) => bird.id))
  const viewProfile = copy.map.viewProfile || 'Ver ficha'

  const seedSightings = useMemo(() => localizedBirds.flatMap((bird, birdIndex) =>
    bird.sightings.map((sighting) => ({
      id: `seed-${bird.id}-${sighting.lat}-${sighting.lng}-${sighting.date}`,
      ...sighting,
      bird,
      source: 'seed',
      confidence: Number.parseInt(bird.probability, 10) || 90,
      status: 'verified',
      color: BIRD_COLORS[birdIndex % BIRD_COLORS.length],
    }))
  ), [localizedBirds])

  const liveSightings = apiPoints
    .filter((point) => point.source === 'user_photo')
    .map((point, index) => {
      const localBird = localizedBirds.find((bird) => bird.id === point.bird?.id || bird.scientific === point.bird?.scientific)
      return {
        ...point,
        bird: localBird || point.bird,
        color: BIRD_COLORS[(localBird?.id || index) % BIRD_COLORS.length],
      }
    })

  const allSightings = liveSightings.filter((sighting) => {
    if (filter !== 'all' && sighting.bird.id !== parseInt(filter, 10)) return false
    if (monthFilter !== 'all' && !sighting.bird.activeSeason?.includes(Number(monthFilter))) return false
    return true
  })

  const dynamicBirds = liveSightings
    .map((sighting) => sighting.bird)
    .filter((bird) => bird?.id && !localBirdIds.has(bird.id))
  const filterBirds = [...localizedBirds, ...dynamicBirds]

  return (
    <div className="map-tab fade-in">
      <header className="glass-header">
        <div className="logo">📍 {copy.map.title}</div>
        <div className="map-count">{allSightings.length} {copy.feed.sightings.toLowerCase()}</div>
      </header>

      <div className="map-source-row">
        <span className={`map-source-pill ${apiStatus === 'ready' ? 'map-source-live' : ''}`}>● {apiStatus === 'ready' ? ui.live : ui.initial}</span>
        {liveSightings.length > 0 && <span>{liveSightings.length} foto{liveSightings.length === 1 ? '' : 's'}</span>}
      </div>

      <div className="map-filters">
        <select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">{copy.map.allSpecies}</option>
          {filterBirds.map((bird) => <option key={bird.id} value={bird.id}>{bird.name}</option>)}
        </select>
        <select className="filter-select" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
          <option value="all">{copy.map.allYear}</option>
          {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
        </select>
      </div>

      <div className="map-wrapper">
        <MapContainer
          key={`${mapCenter[0]}-${mapCenter[1]}`}
          center={mapCenter}
          zoom={mapZoom}
          style={{ width: '100%', height: '100%', borderRadius: '20px' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          {allSightings.map((sighting) => (
            <Marker
              key={sighting.id}
              position={[sighting.lat, sighting.lng]}
              icon={createCustomIcon(sighting)}
            >
              <Popup className="bird-popup">
                <div className="popup-content">
                  {typeof sighting.bird.img === 'string' && sighting.bird.img.length > 4 ? (
                    <img src={sighting.bird.img} alt={sighting.bird.name} className="popup-img" />
                  ) : (
                    <div className="popup-img popup-emoji">🐦</div>
                  )}
                  <strong>{sighting.bird.name}</strong>
                  <p>{sighting.location}</p>
                  <p>📅 {new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(sighting.date))}</p>
                  <p>👤 @{sighting.user}</p>
                  {sighting.source === 'user_photo' && <p>🎯 {sighting.confidence}% · {sighting.status === 'verified' ? ui.verified : ui.pending}</p>}
                  <button
                    className="popup-btn"
                    type="button"
                    onClick={() => onSelectBird(sighting.bird)}
                  >
                    {viewProfile} →
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="map-legend">
        {filterBirds.map((bird, index) => (
          <button key={bird.id} className="legend-item" type="button" onClick={() => setFilter(filter === String(bird.id) ? 'all' : String(bird.id))}>
            <div className="legend-dot" style={{ background: BIRD_COLORS[index % BIRD_COLORS.length] }}></div>
            <span>{bird.name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}



