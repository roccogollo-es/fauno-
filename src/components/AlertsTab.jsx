import { useState } from 'react'
import { ALERTS, BIRDS } from '../data/birds'

export default function AlertsTab({ onSelectBird }) {
  const [notifications, setNotifications] = useState({})

  const toggleNotif = (id) => {
    setNotifications(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const typeColors = {
    migration: '#3498db',
    season: '#2ecc71',
    care: '#e67e22',
    hotspot: '#9b59b6',
  }

  const typeLabels = {
    migration: '✈️ Migración',
    season: '🌿 Temporada',
    care: '🤲 Cuidados',
    hotspot: '📍 Hotspot',
  }

  return (
    <div className="alerts-tab fade-in">
      <header className="glass-header">
        <div className="logo">🔔 Alertas</div>
        <div className="alerts-badge">{ALERTS.length}</div>
      </header>

      <div className="alerts-hero">
        <p className="alerts-subtitle">Notificaciones sobre migraciones y temporadas en Europa</p>
      </div>

      <div className="alert-cards">
        {ALERTS.map(alert => {
          const relatedBird = alert.relatedBirdId ? BIRDS.find(b => b.id === alert.relatedBirdId) : null
          const color = typeColors[alert.type] || '#2ecc71'
          const notifOn = notifications[alert.id]

          return (
            <div key={alert.id} className={`alert-card ${alert.urgent ? 'alert-urgent' : ''}`} style={{ borderLeftColor: color }}>
              <div className="alert-top">
                <div className="alert-type-badge" style={{ background: color + '22', color }}>
                  {typeLabels[alert.type]}
                </div>
                {alert.urgent && <span className="urgent-badge">🔴 Urgente</span>}
                <button
                  className={`notif-toggle ${notifOn ? 'notif-on' : ''}`}
                  onClick={() => toggleNotif(alert.id)}
                  title="Activar notificación"
                >
                  {notifOn ? '🔔' : '🔕'}
                </button>
              </div>

              <div className="alert-header">
                <span className="alert-emoji">{alert.emoji}</span>
                <div>
                  <h4>{alert.title}</h4>
                  <p className="alert-subtitle-text">{alert.subtitle}</p>
                </div>
              </div>

              <p className="alert-content">{alert.content}</p>
              <p className="alert-date">📅 {alert.date}</p>

              {alert.products.length > 0 && (
                <div className="alert-products">
                  {alert.products.map((p, i) => (
                    <div key={i} className="alert-product">
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                      <button className="btn-buy-small">{p.price} →</button>
                    </div>
                  ))}
                </div>
              )}

              {relatedBird && (
                <button className="btn-see-bird" onClick={() => onSelectBird(relatedBird)}>
                  Ver {relatedBird.name} →
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="offline-card">
        <h4>📡 Modo Sin Conexión</h4>
        <p>Base de datos de las 200 aves más comunes de Europa disponible offline.</p>
        <div className="offline-progress">
          <div className="offline-bar">
            <div style={{ width: `${(BIRDS.length / 200) * 100}%` }}></div>
          </div>
          <span>{BIRDS.length} / 200 especies</span>
        </div>
      </div>
    </div>
  )
}
