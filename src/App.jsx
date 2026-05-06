import { useState } from 'react'
import './App.css'
import greenImg from './assets/green_nature.png'
import bird1 from './assets/bird1.png'
import bird2 from './assets/bird2.png'

const BIRD_DATA = [
  { 
    id: 1, 
    name: 'Abejaruco Europeo', 
    scientific: 'Merops apiaster',
    description: 'Ave inconfundible por su explosión de colores. Es un experto cazador de insectos en vuelo.',
    diet: 'Abejas, avispas y libélulas.',
    habitat: 'Taludes arenosos y zonas abiertas.',
    status: 'Preocupación Menor',
    img: bird1, 
    probability: '98%',
    location: 'Parque Regional, Madrid'
  },
  { 
    id: 2, 
    name: 'Petirrojo Europeo', 
    scientific: 'Erithacus rubecula',
    description: 'Pequeño pájaro sociable con pecho anaranjado, común en jardines y bosques.',
    diet: 'Invertebrados y semillas.',
    habitat: 'Bosques y parques urbanos.',
    status: 'Común',
    img: bird2, 
    probability: '92%',
    location: 'Soto del Real'
  },
]

function App() {
  const [page, setPage] = useState('feed') 
  const [selected, setSelected] = useState(null)

  return (
    <div className="app-container">
      <div className="bg-gradient"></div>
      <div className="glass-phone">
        
        {page === 'feed' && (
          <div className="fade-in">
            <header className="glass-header">
              <div className="logo">FAUNO</div>
              <div className="header-actions">
                <button className="btn-icon">🔍</button>
                <div className="user-avatar"></div>
              </div>
            </header>

            <div className="hero-banner">
              <img src={greenImg} alt="Nature" />
              <div className="hero-overlay">
                <h2>Explora la Fauna</h2>
                <p>Identifica y protege nuestras aves</p>
              </div>
            </div>

            <div className="quick-stats">
              <div className="glass-stat">
                <strong>12</strong>
                <span>Especies</span>
              </div>
              <div className="glass-stat">
                <strong>536</strong>
                <span>Comunidad</span>
              </div>
            </div>

            <h3 className="section-title">Avistamientos Recientes</h3>
            <div className="bird-feed">
              {BIRD_DATA.map(bird => (
                <div key={bird.id} className="bird-card" onClick={() => { setSelected(bird); setPage('detail'); }}>
                  <img src={bird.img} alt={bird.name} />
                  <div className="card-info">
                    <span className="prob">{bird.probability} ID</span>
                    <h4>{bird.name}</h4>
                    <p>{bird.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'detail' && selected && (
          <div className="fade-in detail-view">
            <button className="back-circle" onClick={() => setPage('feed')}>←</button>
            <div className="detail-hero">
              <img src={selected.img} alt={selected.name} />
            </div>
            <div className="detail-content-glass">
              <div className="content-header">
                <h2>{selected.name}</h2>
                <p className="sci-name"><i>{selected.scientific}</i></p>
              </div>
              
              <div className="info-scroll">
                <div className="pills-row">
                  <span className="pill">{selected.status}</span>
                  <span className="pill">Migratoria</span>
                </div>
                <p className="desc">{selected.description}</p>
                
                <div className="spec-grid">
                  <div className="spec-item">
                    <label>Dieta</label>
                    <p>{selected.diet}</p>
                  </div>
                  <div className="spec-item">
                    <label>Hábitat</label>
                    <p>{selected.habitat}</p>
                  </div>
                </div>

                <div className="store-promo">
                  <h4>✨ Atrae a esta especie</h4>
                  <div className="promo-card">
                    <span>🥜</span>
                    <div className="promo-txt">
                      <h5>Semillas Fauno Premium</h5>
                      <button className="btn-buy">Ver en Tienda</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <nav className="glass-nav">
          <div className={`nav-tab ${page === 'feed' ? 'active' : ''}`} onClick={() => setPage('feed')}>🏠</div>
          <div className="nav-tab">📍</div>
          <div className="nav-tab camera-tab">📸</div>
          <div className="nav-tab">📖</div>
          <div className="nav-tab">⚙️</div>
        </nav>

      </div>
    </div>
  )
}

export default App
