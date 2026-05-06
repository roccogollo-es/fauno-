import { useState } from 'react'

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const currentMonth = new Date().getMonth()

export default function BirdDetail({ bird, onBack, addToDiary }) {
  const [innerTab, setInnerTab] = useState('info')
  const [added, setAdded] = useState(false)
  const [playing, setPlaying] = useState(false)

  const handleAddDiary = () => {
    addToDiary(bird)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleSound = () => {
    setPlaying(true)
    setTimeout(() => setPlaying(false), 3000)
  }

  const statusColors = { LC: '#2ecc71', NT: '#f39c12', VU: '#e67e22', EN: '#e74c3c', CR: '#c0392b' }
  const statusColor = statusColors[bird.status] || '#2ecc71'

  return (
    <div className="detail-view fade-in">
      <button className="back-circle" onClick={onBack}>←</button>

      <div className="detail-hero">
        <img src={bird.heroImg || bird.img} alt={bird.name} />
        <div className="detail-hero-overlay">
          <div className="iucn-badge" style={{ background: statusColor + '22', borderColor: statusColor, color: statusColor }}>
            IUCN: {bird.status} · {bird.statusLabel}
          </div>
        </div>
      </div>

      <div className="detail-content-glass">
        <div className="content-header">
          <h2>{bird.name}</h2>
          <p className="sci-name"><i>{bird.scientific}</i></p>
          <div className="pills-row">
            {bird.migratory && <span className="pill pill-blue">✈ Migratoria</span>}
            <span className="pill">{bird.habitat.split(',')[0]}</span>
            <button className="sound-btn" onClick={handleSound}>
              {playing ? '🔊 Reproduciendo...' : '🎵 Canto'}
            </button>
          </div>
        </div>

        <div className="detail-inner-tabs">
          {['info','ruta','tienda'].map(t => (
            <button key={t} className={`inner-tab ${innerTab === t ? 'active' : ''}`} onClick={() => setInnerTab(t)}>
              {t === 'info' ? 'ℹ️ Info' : t === 'ruta' ? '🗺️ Ruta' : '🛒 Tienda'}
            </button>
          ))}
        </div>

        <div className="info-scroll">
          {innerTab === 'info' && (
            <>
              <p className="desc">{bird.description}</p>
              <div className="spec-grid">
                <div className="spec-item"><label>Dieta</label><p>{bird.diet}</p></div>
                <div className="spec-item"><label>Hábitat</label><p>{bird.habitat}</p></div>
              </div>
              <div className="seasons-row">
                <label className="spec-label">Temporada activa</label>
                <div className="months-grid">
                  {MONTHS_SHORT.map((m, i) => (
                    <div key={m} className={`month-chip ${bird.activeSeason.includes(i) ? 'month-active' : ''} ${i === currentMonth && bird.activeSeason.includes(i) ? 'month-now' : ''}`}>
                      {m}
                    </div>
                  ))}
                </div>
              </div>
              <div className="curiosities">
                <label className="spec-label">Curiosidades</label>
                {bird.curiosities.map((c, i) => (
                  <div key={i} className="curiosity-item">💡 {c}</div>
                ))}
              </div>
            </>
          )}

          {innerTab === 'ruta' && (
            <div className="route-section">
              <div className="route-card">
                <div className="route-icon">{bird.migratory ? '✈️' : '🏠'}</div>
                <div>
                  <h4>{bird.migratory ? 'Ruta Migratoria' : 'Especie Residente'}</h4>
                  <p>{bird.migrationRoute}</p>
                </div>
              </div>
              <div className="sightings-list">
                <label className="spec-label">Avistamientos recientes ({bird.sightings.length})</label>
                {bird.sightings.map((s, i) => (
                  <div key={i} className="sighting-row">
                    <div className="sighting-dot"></div>
                    <div>
                      <strong>{s.location}</strong>
                      <p>{s.date} · @{s.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {innerTab === 'tienda' && (
            <div className="store-section">
              <div className="store-promo">
                <h4>✨ Atrae a {bird.name.split(' ')[0]}</h4>
                <p className="store-desc">Productos Fauno recomendados para esta especie</p>
                {bird.products.map((p, i) => (
                  <div key={i} className="promo-card">
                    <span className="promo-icon">{p.icon}</span>
                    <div className="promo-txt">
                      <h5>{p.name}</h5>
                      <p className="promo-price">{p.price}</p>
                      <button className="btn-buy">Añadir al carrito</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className={`btn-diary ${added ? 'btn-diary-success' : ''}`} onClick={handleAddDiary}>
          {added ? '✅ Añadido al diario' : '+ Añadir a mi diario'}
        </button>
      </div>
    </div>
  )
}
