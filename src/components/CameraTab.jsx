import { useState, useRef } from 'react'
import { BIRDS } from '../data/birds'

const RESULTS_POOL = BIRDS

export default function CameraTab({ onIdentified, addToDiary }) {
  const [phase, setPhase] = useState('idle') // idle | analyzing | result
  const [preview, setPreview] = useState(null)
  const [results, setResults] = useState([])
  const [progress, setProgress] = useState(0)
  const fileRef = useRef()

  const simulate = (imgUrl) => {
    setPhase('analyzing')
    setProgress(0)

    const shuffled = [...RESULTS_POOL].sort(() => Math.random() - 0.5)
    const top = shuffled.slice(0, 3).map((b, i) => ({
      ...b,
      confidence: Math.round(95 - i * 12 + Math.random() * 5),
    }))

    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 18
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setProgress(100)
        setTimeout(() => {
          setResults(top)
          setPhase('result')
        }, 400)
      }
      setProgress(Math.min(p, 100))
    }, 150)
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    simulate(url)
  }

  const handleCapture = () => fileRef.current?.click()

  const handleReset = () => {
    setPhase('idle')
    setPreview(null)
    setResults([])
    setProgress(0)
  }

  const handleSelect = (bird) => {
    addToDiary(bird, preview)
    onIdentified(bird)
  }

  return (
    <div className="camera-tab fade-in">
      <header className="glass-header">
        <div className="logo">📸 Identificar IA</div>
      </header>

      {phase === 'idle' && (
        <>
          <div className="camera-viewfinder" onClick={handleCapture}>
            <div className="viewfinder-frame">
              <div className="corner tl"></div>
              <div className="corner tr"></div>
              <div className="corner bl"></div>
              <div className="corner br"></div>
            </div>
            <div className="camera-hint">
              <span className="camera-icon-big">🐦</span>
              <p>Toca para fotografiar</p>
              <p className="camera-sub">o sube una imagen de la galería</p>
            </div>
          </div>

          <div className="camera-actions">
            <button className="btn-camera-main" onClick={handleCapture}>
              📷 Tomar Foto
            </button>
            <button className="btn-camera-sec" onClick={handleCapture}>
              🖼️ Galería
            </button>
          </div>

          <div className="camera-info-cards">
            <div className="info-card">🎯 <span>Alta precisión incluso con baja calidad</span></div>
            <div className="info-card">🔄 <span>Funciona con diferentes ángulos</span></div>
            <div className="info-card">✈️ <span>Identifica aves en movimiento</span></div>
          </div>

          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </>
      )}

      {phase === 'analyzing' && (
        <div className="analyzing-view">
          {preview && <img src={preview} alt="Analizando" className="preview-img" />}
          <div className="analyzing-overlay">
            <div className="scan-line"></div>
          </div>
          <div className="analyzing-info">
            <div className="ai-spinner">🔬</div>
            <h3>Analizando imagen...</h3>
            <p>Modelo FAUNO-Vision v2.1</p>
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-label">{Math.round(progress)}% completado</p>
            <div className="analyzing-steps">
              <span className={progress > 20 ? 'step done' : 'step'}>✓ Preprocesado</span>
              <span className={progress > 50 ? 'step done' : 'step'}>✓ Detección</span>
              <span className={progress > 80 ? 'step done' : 'step'}>✓ Clasificación</span>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="result-view fade-in">
          {preview && <img src={preview} alt="Resultado" className="result-preview" />}
          <div className="result-header">
            <h3>🎯 Resultados</h3>
            <button className="btn-reset" onClick={handleReset}>Nueva foto</button>
          </div>
          {results.map((bird, i) => (
            <div key={bird.id} className={`result-card ${i === 0 ? 'result-top' : ''}`} onClick={() => handleSelect(bird)}>
              <img src={bird.img} alt={bird.name} className="result-bird-img" />
              <div className="result-info">
                <div className="result-confidence" style={{ color: i === 0 ? '#2ecc71' : '#f39c12' }}>
                  {i === 0 && '⭐ '}Confianza: {bird.confidence}%
                </div>
                <h4>{bird.name}</h4>
                <p><i>{bird.scientific}</i></p>
              </div>
              <div className="confidence-bar-vert">
                <div style={{ height: `${bird.confidence}%`, background: i === 0 ? '#2ecc71' : '#f39c12' }}></div>
              </div>
            </div>
          ))}
          <p className="result-footer">Toca un resultado para ver la ficha completa y añadir al diario</p>
        </div>
      )}
    </div>
  )
}
