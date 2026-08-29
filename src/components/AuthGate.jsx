import { useState } from 'react'
import { LANGUAGES } from '../i18n'
import faunoLogo from '../assets/fauno_logo.png'

const SESSION_KEY = 'fauno_session_v1'
const USERS_KEY = 'fauno_users_v1'
const LEGAL_VERSION = '2026-07-25'

const DEMO_USER = {
  name: 'Javi',
  email: 'javi@fauno.local',
  password: '1234',
}

const getUsers = () => {
  try {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
    return Array.isArray(users) ? users : []
  } catch {
    return []
  }
}

const saveUsers = (users) => localStorage.setItem(USERS_KEY, JSON.stringify(users))

const normalizeEmail = (value) => value.trim().toLowerCase()
const normalizeLogin = (value) => {
  const normalized = normalizeEmail(value)
  return normalized === 'javi' ? DEMO_USER.email : normalized
}

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

const bytesToHex = (buffer) => Array.from(new Uint8Array(buffer))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('')

const makeSalt = () => {
  if (window.crypto?.getRandomValues) {
    return bytesToHex(window.crypto.getRandomValues(new Uint8Array(16)))
  }
  return `${Date.now()}-${Math.random()}`
}

const digestPassword = async (password, salt) => {
  if (window.crypto?.subtle && window.TextEncoder) {
    const encoded = new TextEncoder().encode(`${salt}:${password}`)
    return bytesToHex(await window.crypto.subtle.digest('SHA-256', encoded))
  }

  return Array.from(`${salt}:${password}`)
    .map((char) => char.codePointAt(0).toString(36))
    .reverse()
    .join('')
}

const createPasswordRecord = async (password) => {
  const salt = makeSalt()
  return {
    salt,
    passwordHash: await digestPassword(password, salt),
  }
}

const verifyPassword = async (user, password) => {
  if (user?.passwordHash && user?.salt) {
    return user.passwordHash === await digestPassword(password, user.salt)
  }

  return user?.email === DEMO_USER.email && password === DEMO_USER.password
}

function LegalPanel({ copy, type, onClose }) {
  const isTerms = type === 'terms'
  const title = isTerms ? copy.legal.terms : copy.legal.privacy
  const body = isTerms ? copy.legal.termsBody : copy.legal.privacyBody
  const summary = copy.legal.summary || 'El correo se usa para la cuenta. Las ofertas por email requieren una casilla comercial separada y revocable.'

  return (
    <div className="legal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="legal-panel">
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="legal-note">{summary}</div>
        <button className="auth-primary" type="button" onClick={onClose}>{copy.legal.close}</button>
      </div>
    </div>
  )
}

export default function AuthGate({ copy, language, onLanguageChange, onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [terms, setTerms] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [legalPanel, setLegalPanel] = useState(null)
  const [message, setMessage] = useState('')

  const isRegister = mode === 'register'

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setMessage('')
  }

  const persistSession = (user, users) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email }))
    saveUsers(users)
    onAuthenticated(user)
  }

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')

    const now = new Date().toISOString()
    const users = getUsers()

    if (isRegister) {
      const trimmedName = name.trim()
      const normalizedEmail = normalizeEmail(email)

      if (!trimmedName || !normalizedEmail || !password) {
        setMessage(copy.auth.emptyFields || 'Completa todos los campos.')
        return
      }

      if (!isValidEmail(normalizedEmail)) {
        setMessage(copy.auth.badEmail || 'Introduce un correo electrónico válido.')
        return
      }

      if (password.length < 8) {
        setMessage(copy.auth.weakPassword || 'Usa una contraseña de al menos 8 caracteres.')
        return
      }

      if (!terms || !privacy) {
        setMessage(copy.auth.needTerms || 'Debes aceptar términos y privacidad para crear la cuenta.')
        return
      }

      const existing = users.find((user) => user.email === normalizedEmail)
      const passwordRecord = await createPasswordRecord(password)
      const user = {
        ...(existing || {}),
        ...passwordRecord,
        name: trimmedName,
        email: normalizedEmail,
        language,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        legalVersion: LEGAL_VERSION,
        consents: {
          termsAccepted: true,
          privacyRead: true,
          marketingEmail: marketing,
          legalVersion: LEGAL_VERSION,
          acceptedAt: now,
          marketingConsentAt: marketing ? now : null,
        },
      }

      const nextUsers = existing
        ? users.map((storedUser) => (storedUser.email === normalizedEmail ? user : storedUser))
        : [user, ...users]

      // Enviar correo al servidor para ser guardado
      try {
        await fetch('/api/register-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: normalizedEmail }),
        })
      } catch (err) {
        console.error('Error guardando correo en el servidor:', err)
      }

      persistSession(user, nextUsers)
      return
    }

    const loginEmail = normalizeLogin(email || name)
    if (!loginEmail || !password) {
      setMessage(copy.auth.emptyFields || 'Completa todos los campos.')
      return
    }

    let user = users.find((storedUser) => storedUser.email === loginEmail)

    if (!user && loginEmail === DEMO_USER.email && password === DEMO_USER.password) {
      const passwordRecord = await createPasswordRecord(DEMO_USER.password)
      user = {
        ...passwordRecord,
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        language,
        createdAt: now,
        updatedAt: now,
        legalVersion: LEGAL_VERSION,
        consents: {
          termsAccepted: true,
          privacyRead: true,
          marketingEmail: false,
          legalVersion: LEGAL_VERSION,
          acceptedAt: now,
          marketingConsentAt: null,
        },
      }
    }

    if (!user || !(await verifyPassword(user, password))) {
      setMessage(copy.auth.badLogin || 'Usuario o contraseña no válidos.')
      return
    }

    const updatedUser = { ...user, language, updatedAt: now }
    const nextUsers = users.some((storedUser) => storedUser.email === updatedUser.email)
      ? users.map((storedUser) => (storedUser.email === updatedUser.email ? updatedUser : storedUser))
      : [updatedUser, ...users]

    persistSession(updatedUser, nextUsers)
  }

  return (
    <div className="auth-screen fade-in">
      <div className="auth-card">
        <div className="auth-brand">
          <img src={faunoLogo} alt="FAUNO" className="auth-logo" />
          <p>{copy.auth.subtitle}</p>
        </div>

        <div className="auth-switch" role="tablist" aria-label={copy.auth.title}>
          <button type="button" className={!isRegister ? 'active' : ''} onClick={() => switchMode('login')}>
            {copy.auth.login}
          </button>
          <button type="button" className={isRegister ? 'active' : ''} onClick={() => switchMode('register')}>
            {copy.auth.register}
          </button>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {isRegister && (
            <label>
              {copy.auth.nameLabel || 'Nombre'}
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder={copy.auth.namePlaceholder || 'Tu nombre'}
              />
            </label>
          )}

          <label>
            {copy.auth.email}{!isRegister ? ' / Javi' : ''}
            <input
              type={isRegister ? 'email' : 'text'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              placeholder={isRegister ? 'tu@email.com' : 'Javi o tu@email.com'}
            />
          </label>

          <label>
            {copy.auth.password}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              placeholder="••••••••"
            />
          </label>

          <label>
            {copy.auth.language}
            <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          {isRegister ? (
            <div className="consent-box">
              <label className="checkbox-row">
                <input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} />
                <span>
                  {copy.auth.terms}{' '}
                  <button className="inline-link" type="button" onClick={() => setLegalPanel('terms')}>
                    {copy.legal.terms}
                  </button>
                </span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} />
                <span>
                  {copy.auth.privacy}{' '}
                  <button className="inline-link" type="button" onClick={() => setLegalPanel('privacy')}>
                    {copy.legal.privacy}
                  </button>
                </span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
                <span>{copy.auth.newsletter}</span>
              </label>
              <p className="consent-hint">{copy.auth.legalHint}</p>
            </div>
          ) : (
            <p className="consent-hint">Demo: Javi / 1234</p>
          )}

          {message && <p className="auth-error" role="alert">{message}</p>}

          <button className="auth-primary" type="submit">
            {isRegister ? copy.auth.submitRegister : copy.auth.submitLogin}
          </button>
        </form>
      </div>

      {legalPanel && <LegalPanel copy={copy} type={legalPanel} onClose={() => setLegalPanel(null)} />}
    </div>
  )
}

export { LEGAL_VERSION, SESSION_KEY, USERS_KEY }
