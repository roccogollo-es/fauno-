import { ACHIEVEMENTS } from '../data/birds'

export default function DiaryTab({ diary, onSelectBird }) {
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
        <div className="logo">📖 Mi Diario</div>
        <div className="diary-count">{total} obs.</div>
      </header>

      <div className="diary-stats">
        <div className="glass-stat">
          <strong>{total}</strong>
          <span>Observaciones</span>
        </div>
        <div className="glass-stat">
          <strong>{unique}</strong>
          <span>Especies</span>
        </div>
        <div className="glass-stat">
          <strong>{migratory}</strong>
          <span>Migratorias</span>
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
          <h4>Tu diario está vacío</h4>
          <p>Usa la cámara IA para identificar aves o añádelas desde su ficha</p>
        </div>
      ) : (
        <div className="diary-entries">
          {diary.map(entry => (
            <div key={entry.id} className="diary-entry" onClick={() => onSelectBird(entry.bird)}>
              {entry.photo ? (
                <img src={entry.photo} alt={entry.bird?.name} className="entry-photo" />
              ) : (
                <img src={entry.bird?.img} alt={entry.bird?.name} className="entry-photo" />
              )}
              <div className="entry-info">
                <h4>{entry.bird?.name}</h4>
                <p className="entry-sci"><i>{entry.bird?.scientific}</i></p>
                <p className="entry-date">📅 {new Date(entry.date).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })}</p>
                {entry.bird?.migratory && <span className="badge-migr">✈ Migratoria</span>}
              </div>
              <div className="card-arrow">›</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
