import { useState } from 'react'
import './App.css'
import FeedTab from './components/FeedTab'
import MapTab from './components/MapTab'
import CameraTab from './components/CameraTab'
import DiaryTab from './components/DiaryTab'
import AlertsTab from './components/AlertsTab'
import BirdDetail from './components/BirdDetail'

const TABS = [
  { id: 'feed',   icon: '🏠', label: 'Feed' },
  { id: 'map',    icon: '📍', label: 'Mapa' },
  { id: 'camera', icon: '📸', label: 'IA',  special: true },
  { id: 'diary',  icon: '📖', label: 'Diario' },
  { id: 'alerts', icon: '🔔', label: 'Alertas' },
]

function App() {
  const [activeTab, setActiveTab] = useState('feed')
  const [selectedBird, setSelectedBird] = useState(null)
  const [diary, setDiary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fauno_diary') || '[]') }
    catch { return [] }
  })

  const addToDiary = (bird, photo = null) => {
    const entry = { id: Date.now(), birdId: bird.id, bird, date: new Date().toISOString(), photo }
    const updated = [entry, ...diary]
    setDiary(updated)
    localStorage.setItem('fauno_diary', JSON.stringify(updated))
  }

  const openBird = (bird) => setSelectedBird(bird)
  const closeBird = () => setSelectedBird(null)

  const renderTab = () => {
    switch (activeTab) {
      case 'feed':   return <FeedTab onSelectBird={openBird} diary={diary} />
      case 'map':    return <MapTab onSelectBird={openBird} />
      case 'camera': return <CameraTab onIdentified={openBird} addToDiary={addToDiary} />
      case 'diary':  return <DiaryTab diary={diary} onSelectBird={openBird} />
      case 'alerts': return <AlertsTab onSelectBird={openBird} />
      default:       return <FeedTab onSelectBird={openBird} diary={diary} />
    }
  }

  return (
    <div className="app-container">
      <div className="bg-gradient"></div>
      <div className="glass-phone">
        {selectedBird ? (
          <BirdDetail bird={selectedBird} onBack={closeBird} addToDiary={addToDiary} />
        ) : (
          <>
            <div className="tab-content">
              {renderTab()}
            </div>
            <nav className="glass-nav">
              {TABS.map(tab => (
                <div
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  className={`nav-tab ${tab.special ? 'camera-tab' : ''} ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                >
                  {tab.icon}
                </div>
              ))}
            </nav>
          </>
        )}
      </div>
    </div>
  )
}

export default App
