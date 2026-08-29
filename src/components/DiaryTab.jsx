import { ACHIEVEMENTS } from '../data/birds'
import { localizeBird } from '../i18n'

export default function DiaryTab({ diary, onSelectBird, copy, language }) {
  const total = diary.length
  const unique = new Set(diary.map(e => e.birdId)).size
  const migratory = diary.filter(e => e.bird?.migratory).length

  const getAchievementProgress = (a) => {
    switch(a.field) {
      case 'total': return Math.min(total, a.target)
      case 'unique': return Math.min(unique, a.target)
      case 'migratory': return Math.min(migratory, a.target)
      case 'streak': return Math.min(1, a.target) // simplified
      default: return 0
    }
  }

  return (
    <div className="diary-tab fade-in">
      <header className="glass-header">
        <div className="logo">📖 {copy.diary.title}</div>
        <div className="diary-count">{total} obs.</div>
      </header>

      <div className="diary-stats">
        <div className="glass-stat">
          <strong>{total}</strong>
          <span>{copy.feed.myObs}</span>
        </div>
        <div className="glass-stat">
          <strong>{unique}</strong>
          <span>{copy.feed.species}</span>
        </div>
        <div className="glass-stat">
          <strong>{migratory}</strong>
          <span>{copy.feed.migratory}</span>
        </div>
      </div>

      <h3 className="section-title">🏆 Logros</h3>
      <div className="achievements-row">
        {ACHIEVEMENTS.map(a => {
          const progress = getAchievementProgress(a)
          const unlocked = progress >= a.target
          return (
            <div key={a.id} className={`achievement-chip ${unlocked ? 'unlocked' : ''}`}>
              <div className="ach-icon">{a.icon}</div>
              <div className="ach-label">{a.title}</div>
              {!unlocked && (
                <div className="ach-progress-bar">
                  <div style={{ width: `${(progress / a.target) * 100}%` }}></div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <h3 className="section-title">Mis Observaciones</h3>

      {diary.length === 0 ? (
        <div className="empty-diary">
          <div className="empty-icon">🔭</div>
          <h4>{copy.diary.emptyTitle}</h4>
          <p>{copy.diary.emptyText}</p>
        </div>
      ) : (
        <div className="diary-entries">
          {diary.map(entry => {
            const bird = entry.bird ? localizeBird(entry.bird, language) : null
            return (
              <button key={entry.id} className="diary-entry" onClick={() => onSelectBird(bird)} type="button">
                {entry.photo ? (
                  <img src={entry.photo} alt={bird?.name} className="entry-photo" />
                ) : typeof bird?.img === 'string' && bird.img.length <= 4 ? (
                  <div className="entry-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'rgba(255,255,255,0.08)' }}>
                    {bird.img}
                  </div>
                ) : (
                  <img src={bird?.img} alt={bird?.name} className="entry-photo" />
                )}
                <div className="entry-info">
                  <h4>{bird?.name}</h4>
                  <p className="entry-sci"><i>{bird?.scientific}</i></p>
                  <p className="entry-date">📅 {new Date(entry.date).toLocaleDateString(language, { day:'numeric', month:'short', year:'numeric' })}</p>
                  {bird?.migratory && <span className="badge-migr">✈ {copy.feed.migratory}</span>}
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
