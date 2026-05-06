import { useState } from 'react'
import { BIRDS } from '../data/birds'
import greenImg from '../assets/green_nature.png'

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const currentMonth = new Date().getMonth()

export default function FeedTab({ onSelectBird, diary }) {
  const [search, setSearch] = useState('')

  const filtered = BIRDS.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.scientific.toLowerCase().includes(search.toLowerCase())
  )

  const diaryCount = diary?.length || 0
  const uniqueSpecies = new Set(diary?.map(e => e.birdId)).size

  return (
    <div className="feed-tab fade-in">
      <header className="glass-header">
        <div className="logo">FAUNO</div>
        <div className="header-actions">
          <div className="user-avatar">🪶</div>
        </div>
      </header>

      <div className="hero-banner">
        <img src={greenImg} alt="Naturaleza" />
        <div className="hero-overlay">
          <h2>Explora la Fauna</h2>
          <p>Identifica y protege las aves de Europa</p>
        </div>
      </div>

      <div className="quick-stats">
        <div className="glass-stat">
          <strong>{BIRDS.length}</strong>
          <span>Especies</span>
        </div>
        <div className="glass-stat">
          <strong>{BIRDS.reduce((a,b) => a + b.sightings.length, 0)}</strong>
          <span>Avistamientos</span>
        </div>
        <div className="glass-stat">
          <strong>{diaryCount}</strong>
          <span>Mis Obs.</span>
        </div>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder="Buscar especie..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <h3 className="section-title">
        {MONTHS[currentMonth] === MONTHS[currentMonth] ? `Aves en ${MONTHS[currentMonth]}` : 'Especies'}
      </h3>

      <div className="bird-feed">
        {filtered.map(bird => {
          const active = bird.activeSeason.includes(currentMonth)
          return (
            <div key={bird.id} className="bird-card" onClick={() => onSelectBird(bird)}>
              <img src={bird.img} alt={bird.name} />
              <div className="card-info">
                <div className="card-badges">
                  <span className="prob">{bird.probability} ID</span>
                  {active && <span className="badge-active">● Activa</span>}
                  {bird.migratory && <span className="badge-migr">✈ Migratoria</span>}
                </div>
                <h4>{bird.name}</h4>
                <p className="card-sci">{bird.scientific}</p>
                <p className="card-loc">📍 {bird.sightings[0]?.location}</p>
              </div>
              <div className="card-arrow">›</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
