import React, { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const ERROR_MSGS = {
  'auth/email-already-in-use':   'Este correo ya está registrado.',
  'auth/invalid-credential':     'Correo o contraseña incorrectos.',
  'auth/wrong-password':         'Correo o contraseña incorrectos.',
  'auth/user-not-found':         'No existe una cuenta con ese correo.',
  'auth/weak-password':          'La contraseña debe tener mínimo 6 caracteres.',
  'auth/invalid-email':          'El correo ingresado no es válido.',
  'auth/network-request-failed': 'Sin conexión a internet. Verificá tu red.',
  'auth/too-many-requests':      'Demasiados intentos. Esperá unos minutos.',
}

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

export default function Auth({ onAuth, deviceError }) {
  const [mode,        setMode]        = useState('login') // 'login' | 'register' | 'reset'
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [error,       setError]       = useState('')
  const [resetSent,   setResetSent]   = useState(false)
  const [loading,     setLoading]     = useState(false)

  useEffect(() => { if (deviceError) setError(deviceError) }, [deviceError])

  function switchMode(m) { setMode(m); setError(''); setResetSent(false) }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim())
        setResetSent(true)
        setLoading(false)
        return
      }

      const deviceId = await window.api.app.getDeviceId()

      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await setDoc(doc(db, 'devices', cred.user.uid), {
          deviceId,
          email: email.trim(),
          registeredAt: new Date().toISOString()
        })
        onAuth(cred.user)
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
        const deviceDoc = await getDoc(doc(db, 'devices', cred.user.uid))
        if (deviceDoc.exists() && deviceDoc.data().deviceId !== deviceId) {
          await signOut(auth)
          setError('Esta cuenta ya está activa en otro dispositivo.')
          return
        }
        onAuth(cred.user)
      }
    } catch (err) {
      setError(ERROR_MSGS[err.code] || 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const titles = {
    login:    'Iniciá sesión en tu cuenta',
    register: 'Creá tu cuenta gratis',
    reset:    'Recuperar contraseña',
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
            <span className="text-white text-xl font-black">YB</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Your Business</h1>
          <p className="text-sm text-gray-400 mt-0.5">{titles[mode]}</p>
        </div>

        {/* Reset email sent */}
        {resetSent ? (
          <div className="text-center space-y-4">
            <div className="text-4xl">📧</div>
            <p className="text-sm text-gray-700 font-medium">
              Te enviamos un email a <span className="text-primary">{email}</span> con el enlace para restablecer tu contraseña.
            </p>
            <p className="text-xs text-gray-400">Revisá también la carpeta de spam.</p>
            <button
              onClick={() => switchMode('login')}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-md text-sm transition-colors"
            >
              Volver al inicio de sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
                autoFocus
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Password (hidden on reset mode) */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 rounded-md text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Cargando...'
                : mode === 'login'    ? 'Iniciar sesión'
                : mode === 'register' ? 'Crear cuenta'
                :                      'Enviar email de recuperación'}
            </button>
          </form>
        )}

        {/* Switch between login / register */}
        {!resetSent && mode !== 'reset' && (
          <p className="text-center text-xs text-gray-400 mt-5">
            {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-primary font-semibold hover:underline"
            >
              {mode === 'login' ? 'Registrate' : 'Iniciá sesión'}
            </button>
          </p>
        )}

        {/* Back link on reset mode */}
        {mode === 'reset' && !resetSent && (
          <p className="text-center text-xs text-gray-400 mt-5">
            <button onClick={() => switchMode('login')} className="text-primary font-semibold hover:underline">
              ← Volver
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
