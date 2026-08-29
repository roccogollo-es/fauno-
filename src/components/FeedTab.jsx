import { useState } from 'react'
import { BIRDS } from '../data/birds'
import { localizeBird } from '../i18n'
import heroImg from '../assets/comedero-doble.jpg'
import faunoLogo from '../assets/fauno_logo.png'

const currentMonth = new Date().getMonth()

export default function FeedTab({ onSelectBird, diary, copy, language }) {
  const [search, setSearch] = useState('')
  const localizedBirds = BIRDS.map((bird) => localizeBird(bird, language))
  const currentMonthName = new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date())

  const filtered = localizedBirds.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.scientific.toLowerCase().includes(search.toLowerCase())
  )

  const diaryCount = diary?.length || 0
  const uniqueSpecies = new Set(diary?.map(e => e.birdId)).size
  const sightingsCount = BIRDS.reduce((total, bird) => total + bird.sightings.length, 0)

  return (
    <div className="feed-tab fade-in">
      <header className="glass-header">
        <img src={faunoLogo} alt="FAUNO" className="feed-logo" />
        <div className="header-actions">
          <div className="user-avatar">🪶</div>
        </div>
      </header>

      <div className="hero-banner">
        <div className="hero-overlay">
          <h1>{copy.feed.heroTitle}</h1>
          <p>{copy.feed.heroText}</p>
          <div className="hero-mini-stack">
            {localizedBirds.slice(0, 3).map((bird) => (
              <img key={bird.id} src={bird.img} alt="" />
            ))}
            <span>+{Math.max(localizedBirds.length - 3, 0)}</span>
          </div>
        </div>
        <img src={heroImg} alt="" />
      </div>

      <div className="quick-stats">
        <div className="glass-stat">
          <strong>{BIRDS.length}</strong>
          <span>{copy.feed.species}</span>
        </div>
        <div className="glass-stat">
          <strong>{sightingsCount}</strong>
          <span>{copy.feed.sightings}</span>
        </div>
        <div className="glass-stat">
          <strong>{diaryCount}/{uniqueSpecies}</strong>
          <span>{copy.feed.myObs}</span>
        </div>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          placeholder={copy.feed.search}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <h3 className="section-title">
        {copy.feed.birdsIn} {currentMonthName}
      </h3>

      <div className="bird-feed">
        {filtered.map(bird => {
          const seasons = bird.activeSeason || [0,1,2,3,4,5,6,7,8,9,10,11]
          const active = seasons.includes(currentMonth)
          return (
            <button key={bird.id} className="bird-card" onClick={() => onSelectBird(bird)} type="button">
              <img src={bird.img} alt={bird.name} />
              <div className="card-info">
                <div className="card-badges">
                  <span className="prob">{bird.probability || '95%'} ID</span>
                  {active && <span className="badge-active">● {copy.feed.active}</span>}
                  {bird.migratory && <span className="badge-migr">✈ {copy.feed.migratory}</span>}
                </div>
                <h4>{bird.name}</h4>
                <p className="card-sci">{bird.scientific}</p>
                <p className="card-loc">📍 {bird.sightings?.[0]?.location || 'Europa'}</p>
              </div>
              <div className="card-arrow">›</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

