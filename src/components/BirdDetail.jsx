import { useState } from 'react'
import { localizeBird } from '../i18n'

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const currentMonth = new Date().getMonth()

const playDemoBirdSong = (birdId) => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  const context = new AudioContext()
  const base = 760 + birdId * 90
  const now = context.currentTime

  for (let i = 0; i < 6; i += 1) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = i % 2 ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(base + i * 80, now + i * 0.18)
    oscillator.frequency.exponentialRampToValueAtTime(base * 1.55, now + i * 0.18 + 0.12)
    gain.gain.setValueAtTime(0.0001, now + i * 0.18)
    gain.gain.exponentialRampToValueAtTime(0.13, now + i * 0.18 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.14)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(now + i * 0.18)
    oscillator.stop(now + i * 0.18 + 0.15)
  }

  setTimeout(() => context.close(), 1800)
}

export default function BirdDetail({ bird, onBack, addToDiary, copy, language }) {
  const [innerTab, setInnerTab] = useState('info')
  const [added, setAdded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [productMessage, setProductMessage] = useState('')
  const displayBird = localizeBird(bird, language)

  const handleAddDiary = () => {
    addToDiary(displayBird)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleSound = () => {
    setPlaying(true)
    playDemoBirdSong(displayBird.id)
    setTimeout(() => setPlaying(false), 3000)
  }

  const handleProductInterest = (product) => {
    const fallback = 'Interés guardado. Se puede conectar a tienda online, WhatsApp o campañas de email con consentimiento.'
    setProductMessage(`${product.name}: ${copy.detail.productSelected || fallback}`)
  }

  const statusColors = { LC: '#2ecc71', NT: '#f39c12', VU: '#e67e22', EN: '#e74c3c', CR: '#c0392b' }
  const statusColor = statusColors[displayBird.status] || '#2ecc71'

  return (
    <div className="detail-view fade-in">
      <button className="back-circle" type="button" onClick={onBack}>←</button>

      <div className="detail-hero">
        <img src={displayBird.heroImg || displayBird.img} alt={displayBird.name} />
        <div className="detail-hero-overlay">
          <div className="iucn-badge" style={{ background: `${statusColor}22`, borderColor: statusColor, color: statusColor }}>
            IUCN: {displayBird.status} · {displayBird.statusLabel}
          </div>
        </div>
      </div>

      <div className="detail-content-glass">
        <div className="content-header">
          <h2>{displayBird.name}</h2>
          <p className="sci-name"><i>{displayBird.scientific}</i></p>
          <div className="pills-row">
            {displayBird.migratory && <span className="pill pill-blue">✈ {copy.feed.migratory}</span>}
            <span className="pill">{(displayBird.habitat || 'Naturaleza').split(',')[0]}</span>
            <button className="sound-btn" type="button" onClick={handleSound}>
              {playing ? `🔊 ${copy.detail.playing}` : `🎵 ${copy.detail.song}`}
            </button>
          </div>
          <p className="sound-note">{copy.detail.songNote}</p>
        </div>

        <div className="detail-inner-tabs">
          {['info','ruta','tienda'].map((tab) => (
            <button key={tab} type="button" className={`inner-tab ${innerTab === tab ? 'active' : ''}`} onClick={() => setInnerTab(tab)}>
              {tab === 'info' ? `ℹ️ ${copy.detail.info}` : tab === 'ruta' ? `🗺️ ${copy.detail.route}` : `🛒 ${copy.detail.store}`}
            </button>
          ))}
        </div>

        <div className="info-scroll">
          {innerTab === 'info' && (
            <>
              <p className="desc">{displayBird.description}</p>
              <div className="spec-grid">
                <div className="spec-item spec-highlight"><label>{copy.detail.diet}</label><p>{displayBird.diet || 'Semillas e insectos'}</p></div>
                <div className="spec-item"><label>{copy.detail.habitat}</label><p>{displayBird.habitat || 'Zonas verdes y arboladas'}</p></div>
              </div>
              <div className="seasons-row">
                <label className="spec-label">{copy.detail.season}</label>
                <div className="months-grid">
                  {MONTHS_SHORT.map((month, index) => {
                    const seasons = displayBird.activeSeason || [0,1,2,3,4,5,6,7,8,9,10,11]
                    const isActive = seasons.includes(index)
                    return (
                      <div key={month} className={`month-chip ${isActive ? 'month-active' : ''} ${index === currentMonth && isActive ? 'month-now' : ''}`}>
                        {month}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="curiosities">
                <label className="spec-label">{copy.detail.facts}</label>
                {(displayBird.curiosities || []).map((curiosity) => (
                  <div key={curiosity} className="curiosity-item">💡 {curiosity}</div>
                ))}
              </div>
            </>
          )}

          {innerTab === 'ruta' && (
            <div className="route-section">
              <div className="route-card">
                <div className="route-icon">{displayBird.migratory ? '✈️' : '🏠'}</div>
                <div>
                  <h4>{displayBird.migratory ? copy.detail.migratoryRoute : copy.detail.resident}</h4>
                  <p>{displayBird.migrationRoute || 'Presente en zonas con vegetación y agua.'}</p>
                </div>
              </div>
              <div className="sightings-list">
                <label className="spec-label">{copy.detail.recent} ({(displayBird.sightings || []).length})</label>
                {(displayBird.sightings || []).map((sighting) => (
                  <div key={`${sighting.location}-${sighting.date}`} className="sighting-row">
                    <div className="sighting-dot"></div>
                    <div>
                      <strong>{sighting.location}</strong>
                      <p>{sighting.date} · @{sighting.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {innerTab === 'tienda' && (
            <div className="store-section">
              <div className="store-promo">
                <h4>✨ {copy.detail.attract} {(displayBird.name || 'esta ave').split(' ')[0]}</h4>
                <p className="store-desc">{copy.detail.recommended}</p>
                <div className="diet-summary">
                  <span>🥜</span>
                  <p><strong>{copy.detail.productReason}:</strong> {displayBird.diet || 'Alimentación natural'}</p>
                </div>
                {productMessage && <p className="store-message" role="status">{productMessage}</p>}
                {(displayBird.products || []).map((product) => (
                  <div key={product.name} className="promo-card">
                    <span className="promo-icon">{product.icon}</span>
                    <div className="promo-txt">
                      <h5>{product.name}</h5>
                      <p className="promo-price">{product.price}</p>
                      <button className="btn-buy" type="button" onClick={() => handleProductInterest(product)}>{copy.detail.addCart}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className={`btn-diary ${added ? 'btn-diary-success' : ''}`} type="button" onClick={handleAddDiary}>
          {added ? `✅ ${copy.detail.added}` : `+ ${copy.detail.addDiary}`}
        </button>
      </div>
    </div>
  )
}
