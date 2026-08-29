import { useEffect, useState } from 'react'
import './App.css'
import { getCopy, LANGUAGES } from './i18n'
import AuthGate, { SESSION_KEY, USERS_KEY } from './components/AuthGate'
import FeedTab from './components/FeedTab'
import MapTab from './components/MapTab'
import CameraTab from './components/CameraTab'
import DiaryTab from './components/DiaryTab'
import AlertsTab from './components/AlertsTab'
import BirdDetail from './components/BirdDetail'

const TABS = [
  { id: 'feed', icon: '🏠' },
  { id: 'map', icon: '📍' },
  { id: 'camera', icon: '📸', special: true },
  { id: 'diary', icon: '📖' },
  { id: 'alerts', icon: '🔔' },
]

const readStoredUser = () => {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    return users.find((user) => user.email === session?.email) || null
  } catch {
    return null
  }
}

const WEB_LINK_COPY = {
  es: 'Web principal',
  en: 'Main website',
  fr: 'Site principal',
  de: 'Haupt-Website',
  pt: 'Site principal',
  it: 'Sito principale'
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => readStoredUser())
  const [language, setLanguage] = useState(() => currentUser?.language || localStorage.getItem('fauno_language') || 'es')
  const [activeTab, setActiveTab] = useState('feed')
  const [selectedBird, setSelectedBird] = useState(null)
  const [diary, setDiary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fauno_diary') || '[]') }
    catch { return [] }
  })
  const copy = getCopy(language)
  const webLinkText = WEB_LINK_COPY[language] || WEB_LINK_COPY.es

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const changeLanguage = (nextLanguage) => {
    setLanguage(nextLanguage)
    localStorage.setItem('fauno_language', nextLanguage)

    if (!currentUser) return
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    const updated = users.map((user) => (
      user.email === currentUser.email ? { ...user, language: nextLanguage } : user
    ))
    localStorage.setItem(USERS_KEY, JSON.stringify(updated))
    setCurrentUser((user) => user ? { ...user, language: nextLanguage } : user)
  }

  const addToDiary = (bird, photo = null) => {
    try {
      const entry = { id: Date.now(), birdId: bird.id, bird, date: new Date().toISOString(), photo }
      const updated = [entry, ...diary]
      setDiary(updated)
      localStorage.setItem('fauno_diary', JSON.stringify(updated))
    } catch (e) {
      console.warn('LocalStorage quota exceeded, saving without full image preview', e)
      const entry = { id: Date.now(), birdId: bird.id, bird, date: new Date().toISOString(), photo: typeof bird.img === 'string' && bird.img.startsWith('http') ? bird.img : null }
      const updated = [entry, ...diary]
      setDiary(updated)
      try {
        localStorage.setItem('fauno_diary', JSON.stringify(updated))
      } catch (err) {
        console.error('Failed to save to diary:', err)
      }
    }
  }

  const openBird = (bird) => setSelectedBird(bird)
  const closeBird = () => setSelectedBird(null)
  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSelectedBird(null)
    setCurrentUser(null)
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'feed': return <FeedTab onSelectBird={openBird} diary={diary} copy={copy} language={language} />
      case 'map': return <MapTab onSelectBird={openBird} copy={copy} language={language} />
      case 'camera': return <CameraTab onIdentified={openBird} addToDiary={addToDiary} copy={copy} language={language} currentUser={currentUser} />
      case 'diary': return <DiaryTab diary={diary} onSelectBird={openBird} copy={copy} language={language} />
      case 'alerts': return <AlertsTab onSelectBird={openBird} copy={copy} language={language} />
      default: return <FeedTab onSelectBird={openBird} diary={diary} copy={copy} language={language} />
    }
  }

  if (!currentUser) {
    return (
      <div className="app-container">
        <div className="bg-gradient"></div>
        <div className="glass-phone">
          <AuthGate
            copy={copy}
            language={language}
            onLanguageChange={changeLanguage}
            onAuthenticated={(user) => {
              setCurrentUser(user)
              changeLanguage(user.language)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="bg-gradient"></div>
      <div className="glass-phone">
        {selectedBird ? (
          <BirdDetail bird={selectedBird} onBack={closeBird} addToDiary={addToDiary} copy={copy} language={language} />
        ) : (
          <>
            <div className="app-toolbar">
              <a href="https://fauno.eu" target="_blank" rel="noopener noreferrer" className="toolbar-web-link">
                🌐 {webLinkText}
              </a>
              <select value={language} onChange={(event) => changeLanguage(event.target.value)} aria-label={copy.auth.language}>
                {LANGUAGES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={logout}>{copy.common.logout}</button>
            </div>
            <div className="tab-content">
              {renderTab()}
            </div>
            <nav className="glass-nav" aria-label="FAUNO">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  className={`nav-tab ${tab.special ? 'nav-camera-tab' : ''} ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={copy.tabs[tab.id]}
                  aria-label={copy.tabs[tab.id]}
                  type="button"
                >
                  {tab.icon}
                </button>
              ))}
            </nav>
          </>
        )}
      </div>
    </div>
  )
}

export default App



