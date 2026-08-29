import { useEffect, useMemo, useState } from 'react'
import { localizeBird } from '../i18n'
import heroImg from '../assets/comedero-doble.jpg'
import faunoLogo from '../assets/fauno_logo.png'

const currentMonth = new Date().getMonth()

export default function FeedTab({ onSelectBird, diary, copy, language }) {
  const [search, setSearch] = useState('')
  const [serverBirds, setServerBirds] = useState([])
  const currentMonthName = new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date())

  useEffect(() => {
    let ignore = false
    fetch('/api/observations/map')
      .then((res) => (res.ok ? res.json() : { points: [] }))
      .then((data) => {
        if (ignore) return
        if (Array.isArray(data.points)) {
          const userPoints = data.points
            .filter((p) => p.source === 'user_photo' && p.bird)
            .map((p) => ({
              ...p.bird,
              img: p.photoUrl || p.bird.img || '🐦',
              sightingLocation: p.location || 'Europa',
              date: p.date,
            }))
          setServerBirds(userPoints)
        }
      })
      .catch(() => {})
    return () => { ignore = true }
  }, [])

  // Combine real user diary birds + server community birds (deduplicated)
  const identifiedBirds = useMemo(() => {
    const map = new Map()
    // 1. Add user diary entries
    for (const entry of (diary || [])) {
      if (entry.bird && !map.has(entry.bird.id)) {
        map.set(entry.bird.id, {
          ...entry.bird,
          img: entry.photo || entry.bird.img || '🐦',
          sightingLocation: entry.bird.sightings?.[0]?.location || 'Mi jardín',
          date: entry.date,
        })
      }
    }
    // 2. Add server real observations
    for (const bird of serverBirds) {
      if (!map.has(bird.id)) {
        map.set(bird.id, {
          ...bird,
          sightingLocation: bird.location || 'Europa',
        })
      }
    }
    return Array.from(map.values()).map((bird) => localizeBird(bird, language))
  }, [diary, serverBirds, language])

  const filtered = identifiedBirds.filter(b =>
    (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.scientific || '').toLowerCase().includes(search.toLowerCase())
  )

  const diaryCount = diary?.length || 0
  const uniqueSpecies = new Set(diary?.map(e => e.birdId)).size
  const totalSpecies = identifiedBirds.length
  const totalSightings = (diary?.length || 0) + serverBirds.length

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
          {identifiedBirds.length > 0 && (
            <div className="hero-mini-stack">
              {identifiedBirds.slice(0, 3).map((bird) => (
                typeof bird.img === 'string' && bird.img.length <= 4 ? (
                  <span key={bird.id} style={{ fontSize: '1.4rem' }}>{bird.img}</span>
                ) : (
                  <img key={bird.id} src={bird.img} alt="" />
                )
              ))}
              <span>+{Math.max(identifiedBirds.length - 3, 0)}</span>
            </div>
          )}
        </div>
        <img src={heroImg} alt="" />
      </div>

      <div className="quick-stats">
        <div className="glass-stat">
          <strong>{totalSpecies}</strong>
          <span>{copy.feed.species}</span>
        </div>
        <div className="glass-stat">
          <strong>{totalSightings}</strong>
          <span>{copy.feed.sightings}</span>
        </div>
        <div className="glass-stat">
          <strong>{diaryCount}/{uniqueSpecies}</strong>
          <span>{copy.feed.myObs}</span>
        </div>
      </div>

      {identifiedBirds.length > 0 && (
        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            placeholder={copy.feed.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      <h3 className="section-title">
        {copy.feed.birdsIn} {currentMonthName}
      </h3>

      {filtered.length === 0 ? (
        <div className="empty-diary">
          <div className="empty-icon">📷</div>
          <h4>{copy.feed.emptyTitle}</h4>
          <p>{copy.feed.emptyText}</p>
        </div>
      ) : (
        <div className="bird-feed">
          {filtered.map(bird => {
            const seasons = bird.activeSeason || [0,1,2,3,4,5,6,7,8,9,10,11]
            const active = seasons.includes(currentMonth)
            return (
              <button key={bird.id} className="bird-card" onClick={() => onSelectBird(bird)} type="button">
                {typeof bird.img === 'string' && bird.img.length <= 4 ? (
                  <div style={{ width: '60px', height: '60px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'rgba(255,255,255,0.06)' }}>
                    {bird.img}
                  </div>
                ) : (
                  <img src={bird.img} alt={bird.name} />
                )}
                <div className="card-info">
                  <div className="card-badges">
                    <span className="prob">{bird.probability || '95%'} ID</span>
                    {active && <span className="badge-active">● {copy.feed.active}</span>}
                    {bird.migratory && <span className="badge-migr">✈ {copy.feed.migratory}</span>}
                  </div>
                  <h4>{bird.name}</h4>
                  <p className="card-sci">{bird.scientific}</p>
                  <p className="card-loc">📍 {bird.sightingLocation || 'Europa'}</p>
                </div>
                <div className="card-arrow">›</div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
