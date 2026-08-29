import { useRef, useState } from 'react'
import { BIRDS } from '../data/birds'
import { localizeBird } from '../i18n'

const RESULTS_POOL = BIRDS

const cameraCopy = {
  es: {
    steps: ['Subida segura', 'IA local gratuita', 'Memoria y mapa'],
    noBird: 'No se ha detectado ningún ave en la imagen. Prueba con otra foto.',
    demoFallback: 'No se pudo conectar con la API local. Mostramos una estimación de emergencia y no se guardó en el mapa.',
    locationSaved: 'Observación guardada en la base de datos y añadida al mapa.',
    noLocation: 'Observación guardada sin ubicación. Activa la ubicación para alimentar el mapa real.',
    pending: 'Resultado pendiente de revisión por baja confianza.',
  },
  en: {
    steps: ['Secure upload', 'Free local AI', 'Memory and map'],
    noBird: 'No bird was detected in the image. Try another photo.',
    demoFallback: 'Could not connect to the local API. Showing an emergency estimate; it was not saved to the map.',
    locationSaved: 'Observation saved to the database and added to the map.',
    noLocation: 'Observation saved without location. Enable location to feed the real map.',
    pending: 'Result pending review because confidence is low.',
  },
  fr: {
    steps: ['Envoi sécurisé', 'IA locale gratuite', 'Mémoire et carte'],
    noBird: 'Aucun oiseau détecté. Essayez une autre photo.',
    demoFallback: 'API locale indisponible. Estimation de secours, non ajoutée à la carte.',
    locationSaved: 'Observation enregistrée et ajoutée à la carte.',
    noLocation: 'Observation enregistrée sans position. Activez la localisation pour alimenter la carte.',
    pending: 'Résultat en attente de vérification.',
  },
  de: {
    steps: ['Sicherer Upload', 'Kostenlose lokale KI', 'Speicher und Karte'],
    noBird: 'Kein Vogel erkannt. Bitte ein anderes Foto versuchen.',
    demoFallback: 'Lokale API nicht erreichbar. Notfall-Schätzung, nicht auf der Karte gespeichert.',
    locationSaved: 'Beobachtung gespeichert und zur Karte hinzugefügt.',
    noLocation: 'Beobachtung ohne Standort gespeichert. Standort aktivieren, um die Karte zu füllen.',
    pending: 'Ergebnis wegen niedriger Sicherheit zur Prüfung vorgemerkt.',
  },
  pt: {
    steps: ['Envio seguro', 'IA local grátis', 'Memória e mapa'],
    noBird: 'Nenhuma ave foi detetada. Tente outra foto.',
    demoFallback: 'API local indisponível. Estimativa de emergência, não guardada no mapa.',
    locationSaved: 'Observação guardada e adicionada ao mapa.',
    noLocation: 'Observação guardada sem localização. Ative a localização para alimentar o mapa.',
    pending: 'Resultado pendente de revisão.',
  },
  it: {
    steps: ['Upload sicuro', 'IA locale gratuita', 'Memoria e mappa'],
    noBird: 'Nessun uccello rilevato. Prova con un altra foto.',
    demoFallback: 'API locale non disponibile. Stima di emergenza, non salvata nella mappa.',
    locationSaved: 'Osservazione salvata e aggiunta alla mappa.',
    noLocation: 'Osservazione salvata senza posizione. Attiva la posizione per alimentare la mappa.',
    pending: 'Risultato in attesa di revisione.',
  },
}

const readImageAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = reject
  reader.readAsDataURL(file)
})

const getLocation = () => new Promise((resolve) => {
  if (!navigator.geolocation) {
    resolve(null)
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => resolve({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    }),
    () => resolve(null),
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 10 * 60 * 1000 },
  )
})

const buildDemoResults = (language, fileName = '') => {
  const normalizedFileName = fileName.toLowerCase()
  const localizedBirds = RESULTS_POOL.map((bird) => localizeBird(bird, language))
  const directMatch = localizedBirds.find((bird) => normalizedFileName.includes(bird.name.toLowerCase().split(' ')[0]))
  const pool = directMatch
    ? [directMatch, ...localizedBirds.filter((bird) => bird.id !== directMatch.id)]
    : localizedBirds

  return pool.slice(0, 3).map((bird, index) => ({
    ...bird,
    confidence: [72, 64, 58][index],
    memory: { saved: false, mapReady: false, reviewStatus: 'offline' },
    model: { name: 'Fallback local', paidApi: false },
  }))
}

const hydrateBirdFromApi = (data, language) => {
  const localMatch = BIRDS.find((bird) => bird.id === data.id || bird.scientific === data.scientific)
  const base = localMatch ? localizeBird(localMatch, language) : data

  return {
    ...base,
    ...data,
    img: data.observation?.photoUrl || data.img || localMatch?.img || '🐦',
    heroImg: data.observation?.photoUrl || data.img || localMatch?.heroImg,
    products: data.products || base.products || [],
    curiosities: data.curiosities || base.curiosities || [],
    sightings: base.sightings || [],
  }
}

export default function CameraTab({ onIdentified, addToDiary, copy, language, currentUser }) {
  const [phase, setPhase] = useState('idle')
  const [preview, setPreview] = useState(null)
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const cameraRef = useRef()
  const galleryRef = useRef()
  const extraCopy = cameraCopy[language] || cameraCopy.en

  const identifyBird = async (file) => {
    setPhase('analyzing')
    setProgress(10)
    setErrorMessage('')
    setNotice('')

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.random() * 8 : prev))
    }, 200)

    try {
      const location = await getLocation()
      const formData = new FormData()
      formData.append('image', file)
      formData.append('language', language)
      formData.append('userEmail', currentUser?.email || '')
      formData.append('userName', currentUser?.name || 'Usuario FAUNO')

      if (location) {
        formData.append('shareLocation', 'true')
        formData.append('latitude', String(location.latitude))
        formData.append('longitude', String(location.longitude))
        formData.append('accuracy', String(location.accuracy))
      } else {
        formData.append('shareLocation', 'false')
      }

      const res = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        throw new Error('Local API unavailable')
      }

      const data = await res.json()
      setProgress(100)

      setTimeout(() => {
        if (!data.is_bird) {
          setErrorMessage(extraCopy.noBird)
          setResults([])
          setPhase('result')
          return
        }

        const identifiedBird = hydrateBirdFromApi(data, language)
        const memoryNotice = data.memory?.mapReady ? extraCopy.locationSaved : extraCopy.noLocation
        const reviewNotice = data.memory?.reviewStatus === 'verified' ? '' : ` ${extraCopy.pending}`
        setNotice(`${memoryNotice}${reviewNotice}`)
        setResults([identifiedBird])
        setPhase('result')
      }, 500)
    } catch (err) {
      clearInterval(progressInterval)
      console.info(err)
      setProgress(100)
      setTimeout(() => {
        setNotice(extraCopy.demoFallback)
        setResults(buildDemoResults(language, file.name))
        setPhase('result')
      }, 500)
    }
  }

  const handleFile = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    const url = await readImageAsDataUrl(file)
    setPreview(url)
    identifyBird(file)
    event.target.value = ''
  }

  const handleReset = () => {
    setPhase('idle')
    setPreview(null)
    setResults([])
    setProgress(0)
    setErrorMessage('')
    setNotice('')
  }

  const handleSelect = (bird) => {
    addToDiary(bird, preview)
    onIdentified(bird)
  }

  return (
    <div className="camera-tab fade-in">
      <header className="glass-header">
        <div className="logo">📸 {copy.camera.title}</div>
      </header>

      {phase === 'idle' && (
        <>
          <button className="camera-viewfinder" onClick={() => cameraRef.current?.click()} type="button">
            <div className="viewfinder-frame">
              <div className="corner tl"></div>
              <div className="corner tr"></div>
              <div className="corner bl"></div>
              <div className="corner br"></div>
            </div>
            <div className="camera-hint">
              <span className="camera-icon-big">🐦</span>
              <p>{copy.camera.tap}</p>
              <p className="camera-sub">{copy.camera.upload}</p>
            </div>
          </button>

          <div className="camera-actions">
            <button className="btn-camera-main" type="button" onClick={() => cameraRef.current?.click()}>
              📷 {copy.camera.takePhoto}
            </button>
            <button className="btn-camera-sec" type="button" onClick={() => galleryRef.current?.click()}>
              🖼️ {copy.camera.gallery}
            </button>
          </div>

          <div className="camera-info-cards">
            <div className="info-card">🎯 <span>{copy.camera.precision}</span></div>
            <div className="info-card">🥜 <span>{copy.camera.food}</span></div>
            <div className="info-card">📍 <span>{copy.camera.movement}</span></div>
          </div>

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
          <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </>
      )}

      {phase === 'analyzing' && (
        <div className="analyzing-view">
          {preview && <img src={preview} alt={copy.camera.analyzing} className="preview-img" />}
          <div className="analyzing-overlay">
            <div className="scan-line"></div>
          </div>
          <div className="analyzing-info">
            <div className="ai-spinner">🔬</div>
            <h3>{copy.camera.analyzing}</h3>
            <p>{copy.camera.model}</p>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-label">{Math.round(progress)}% {copy.camera.completed}</p>
            <div className="analyzing-steps">
              {extraCopy.steps.map((step, index) => (
                <span key={step} className={progress > [20, 50, 80][index] ? 'step done' : 'step'}>✓ {step}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="result-view fade-in">
          {preview && <img src={preview} alt={copy.camera.results} className="result-preview" />}
          <div className="result-header">
            <h3>🎯 {copy.camera.results}</h3>
            <button className="btn-reset" type="button" onClick={handleReset}>{copy.camera.newPhoto}</button>
          </div>
          {notice && <div className="notice-card" role="status"><p>{notice}</p></div>}
          {errorMessage ? (
            <div className="error-card" role="alert">
              <p>{errorMessage}</p>
            </div>
          ) : (
            results.map((bird, index) => (
              <button key={`${bird.id}-${bird.observation?.id || index}`} className={`result-card ${index === 0 ? 'result-top' : ''}`} onClick={() => handleSelect(bird)} type="button">
                {typeof bird.img === 'string' && bird.img.length <= 4 ? (
                  <div className="result-bird-emoji-placeholder">{bird.img}</div>
                ) : (
                  <img src={bird.img} alt={bird.name} className="result-bird-img" />
                )}
                <div className="result-info">
                  <div className="result-confidence" style={{ color: bird.confidence >= 78 ? '#2ecc71' : '#f39c12' }}>
                    {index === 0 && '⭐ '}{copy.camera.confidence}: {bird.confidence}%
                  </div>
                  <h4>{bird.name}</h4>
                  <p><i>{bird.scientific}</i></p>
                </div>
                <div className="confidence-bar-vert">
                  <div style={{ height: `${bird.confidence}%`, background: bird.confidence >= 78 ? '#2ecc71' : '#f39c12' }}></div>
                </div>
              </button>
            ))
          )}
          {!errorMessage && <p className="result-footer">{copy.camera.footer}</p>}
        </div>
      )}
    </div>
  )
}

