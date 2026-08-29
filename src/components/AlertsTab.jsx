import { useMemo, useState } from 'react'
import { ALERTS, BIRDS } from '../data/birds'
import { localizeAlert, localizeBird } from '../i18n'

const DAY_MS = 24 * 60 * 60 * 1000

const uiByLanguage = {
  es: {
    urgent: 'Urgente',
    past: 'Pasada',
    active: 'Activa',
    upcoming: 'Próxima',
    notifyOn: 'Recordatorio activo',
    notifyOff: 'Activar recordatorio',
    viewBird: 'Ver',
    buy: 'Me interesa',
    selectedProduct: 'Interés guardado. Este CTA puede conectarse a tienda, WhatsApp o newsletter.',
    offlineText: 'Base de datos de las 200 aves más comunes de Europa disponible offline.',
    species: 'especies',
    types: { migration: 'Migración', season: 'Temporada', care: 'Cuidados', hotspot: 'Hotspot' },
  },
  en: {
    urgent: 'Urgent',
    past: 'Past',
    active: 'Active',
    upcoming: 'Upcoming',
    notifyOn: 'Reminder on',
    notifyOff: 'Turn reminder on',
    viewBird: 'View',
    buy: 'Interested',
    selectedProduct: 'Interest saved. This CTA can connect to the shop, WhatsApp or newsletter.',
    offlineText: 'Offline database with the 200 most common birds in Europe.',
    species: 'species',
    types: { migration: 'Migration', season: 'Season', care: 'Care', hotspot: 'Hotspot' },
  },
  fr: {
    urgent: 'Urgent',
    past: 'Passée',
    active: 'Active',
    upcoming: 'À venir',
    notifyOn: 'Rappel actif',
    notifyOff: 'Activer le rappel',
    viewBird: 'Voir',
    buy: 'Intéressé',
    selectedProduct: 'Intérêt enregistré. Ce bouton peut être relié à la boutique, WhatsApp ou newsletter.',
    offlineText: 'Base hors ligne des 200 oiseaux les plus communs en Europe.',
    species: 'espèces',
    types: { migration: 'Migration', season: 'Saison', care: 'Soins', hotspot: 'Hotspot' },
  },
  de: {
    urgent: 'Dringend',
    past: 'Vergangen',
    active: 'Aktiv',
    upcoming: 'Bald',
    notifyOn: 'Erinnerung aktiv',
    notifyOff: 'Erinnerung aktivieren',
    viewBird: 'Ansehen',
    buy: 'Interessiert',
    selectedProduct: 'Interesse gespeichert. Dieser CTA kann mit Shop, WhatsApp oder Newsletter verbunden werden.',
    offlineText: 'Offline-Datenbank mit den 200 häufigsten Vögeln Europas.',
    species: 'Arten',
    types: { migration: 'Migration', season: 'Saison', care: 'Pflege', hotspot: 'Hotspot' },
  },
  pt: {
    urgent: 'Urgente',
    past: 'Passado',
    active: 'Ativo',
    upcoming: 'Próximo',
    notifyOn: 'Lembrete ativo',
    notifyOff: 'Ativar lembrete',
    viewBird: 'Ver',
    buy: 'Tenho interesse',
    selectedProduct: 'Interesse guardado. Este CTA pode ligar à loja, WhatsApp ou newsletter.',
    offlineText: 'Base offline das 200 aves mais comuns da Europa.',
    species: 'espécies',
    types: { migration: 'Migração', season: 'Época', care: 'Cuidados', hotspot: 'Hotspot' },
  },
  it: {
    urgent: 'Urgente',
    past: 'Passato',
    active: 'Attivo',
    upcoming: 'In arrivo',
    notifyOn: 'Promemoria attivo',
    notifyOff: 'Attiva promemoria',
    viewBird: 'Vedi',
    buy: 'Mi interessa',
    selectedProduct: 'Interesse salvato. Questo CTA può collegarsi a shop, WhatsApp o newsletter.',
    offlineText: 'Database offline dei 200 uccelli più comuni in Europa.',
    species: 'specie',
    types: { migration: 'Migrazione', season: 'Stagione', care: 'Cura', hotspot: 'Hotspot' },
  },
}

const typeColors = {
  migration: '#3498db',
  season: '#2ecc71',
  care: '#e67e22',
  hotspot: '#9b59b6',
}

const typeIcons = {
  migration: '✈️',
  season: '🌿',
  care: '🤲',
  hotspot: '📍',
}

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const getStatus = (date) => {
  const today = startOfDay(new Date())
  const alertDate = startOfDay(new Date(date))
  const diffDays = Math.round((alertDate - today) / DAY_MS)

  if (diffDays < 0) return { key: 'past', order: 3 }
  if (diffDays <= 14) return { key: 'active', order: 1 }
  return { key: 'upcoming', order: 2 }
}

export default function AlertsTab({ onSelectBird, copy, language }) {
  const [notifications, setNotifications] = useState({})
  const [productMessage, setProductMessage] = useState('')
  const ui = uiByLanguage[language] || uiByLanguage.en

  const alerts = useMemo(() => ALERTS
    .map((alert) => {
      const status = getStatus(alert.date)
      return { ...localizeAlert(alert, language), status }
    })
    .sort((a, b) => a.status.order - b.status.order || new Date(a.date) - new Date(b.date)), [language])

  const toggleNotif = (id) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const formatDate = (date) => new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))

  return (
    <div className="alerts-tab fade-in">
      <header className="glass-header">
        <div className="logo">🔔 {copy.alerts.title}</div>
        <div className="alerts-badge">{alerts.length}</div>
      </header>

      <div className="alerts-hero">
        <p className="alerts-subtitle">{copy.alerts.subtitle}</p>
      </div>

      {productMessage && <p className="alert-product-message" role="status">{productMessage}</p>}

      <div className="alert-cards">
        {alerts.map((alert) => {
          const relatedBird = alert.relatedBirdId ? localizeBird(BIRDS.find((bird) => bird.id === alert.relatedBirdId), language) : null
          const color = typeColors[alert.type] || '#2ecc71'
          const notifOn = notifications[alert.id]
          const isUrgent = alert.urgent && alert.status.key !== 'past'

          return (
            <div
              key={alert.id}
              className={`alert-card ${isUrgent ? 'alert-urgent' : ''} ${alert.status.key === 'past' ? 'alert-archived' : ''}`}
              style={{ borderLeftColor: color }}
            >
              <div className="alert-top">
                <div className="alert-type-badge" style={{ background: `${color}22`, color }}>
                  {typeIcons[alert.type]} {ui.types[alert.type] || alert.type}
                </div>
                <span className={`status-badge status-${alert.status.key}`}>
                  {ui[alert.status.key]}
                </span>
                {isUrgent && <span className="urgent-badge">🔴 {ui.urgent}</span>}
                <button
                  className={`notif-toggle ${notifOn ? 'notif-on' : ''}`}
                  onClick={() => toggleNotif(alert.id)}
                  title={notifOn ? ui.notifyOn : ui.notifyOff}
                  aria-label={notifOn ? ui.notifyOn : ui.notifyOff}
                  type="button"
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
              <p className="alert-date">📅 {formatDate(alert.date)}</p>

              {alert.products.length > 0 && (
                <div className="alert-products">
                  {alert.products.map((product) => (
                    <div key={`${alert.id}-${product.name}`} className="alert-product">
                      <span>{product.icon}</span>
                      <span>{product.name}</span>
                      <button
                        className="btn-buy-small"
                        type="button"
                        onClick={() => setProductMessage(`${product.name}: ${ui.selectedProduct}`)}
                      >
                        {ui.buy} · {product.price}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {relatedBird && (
                <button className="btn-see-bird" type="button" onClick={() => onSelectBird(relatedBird)}>
                  {ui.viewBird} {relatedBird.name} →
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="offline-card">
        <h4>📡 {copy.alerts.offline}</h4>
        <p>{ui.offlineText}</p>
        <div className="offline-progress">
          <div className="offline-bar">
            <div style={{ width: `${(BIRDS.length / 200) * 100}%` }}></div>
          </div>
          <span>{BIRDS.length} / 200 {ui.species}</span>
        </div>
      </div>
    </div>
  )
}
