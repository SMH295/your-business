import React, { useEffect, useState } from 'react'
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import Auth from './components/Auth'
import Setup from './components/Setup'
import Sales from './components/Sales'
import Products from './components/Products'
import History from './components/History'
import Board from './components/Board'
import Settings from './components/Settings'
import AIAnalysis from './components/AIAnalysis'
import Calendar from './components/Calendar'

function ConsentBanner({ onAccept, onReject }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-600 shadow-xl">
      <div className="px-6 py-4 flex items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Ayudanos a mejorar Your Business
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Recopilamos datos anónimos de uso (qué funciones se usan y con qué frecuencia) para mejorar la app.
            Nunca enviamos tu nombre, productos ni montos. Podés desactivarlo en Configuración en cualquier momento.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <button
            onClick={onReject}
            className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            No, gracias
          </button>
          <button
            onClick={onAccept}
            className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-sm font-semibold rounded-md transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}

const NAV = [
  { id: 'sales',      label: 'Ventas',         icon: '🛒' },
  { id: 'products',   label: 'Productos',       icon: '📦' },
  { id: 'history',    label: 'Historial',       icon: '📋' },
  { id: 'board',      label: 'Tablero',         icon: '📌' },
  { id: 'ai',         label: 'Análisis IA',     icon: '✨' },
  { id: 'calendar',   label: 'Calendario',      icon: '📅' },
  { id: 'settings',   label: 'Configuración',   icon: '⚙️' },
]

export default function App() {
  const [authUser,    setAuthUser]    = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [deviceError, setDeviceError] = useState('')
  const [status,      setStatus]      = useState('loading')
  const [negocio,     setNegocio]     = useState(null)
  const [activeTab,   setActiveTab]   = useState('sales')
  const [darkMode,    setDarkMode]    = useState(() => localStorage.getItem('theme') === 'dark')
  const [consent,     setConsent]     = useState(undefined) // undefined=cargando, null=sin respuesta, true/false

  // Apply dark class to <html> whenever darkMode changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem('theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Watch Firebase auth state
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const deviceId  = await window.api.app.getDeviceId()
          const deviceDoc = await getDoc(doc(db, 'devices', user.uid))
          if (deviceDoc.exists() && deviceDoc.data().deviceId !== deviceId) {
            await signOut(auth)
            setDeviceError('Esta cuenta ya está activa en otro dispositivo.')
            setAuthUser(null)
            setAuthLoading(false)
            return
          }
        } catch (_) {}
        setAuthUser(user)
      } else {
        setAuthUser(null)
      }
      setAuthLoading(false)
    })
  }, [])

  // Load consent once app is fully ready
  useEffect(() => {
    if (status !== 'ready') return
    if (!window.api?.telemetry) { setConsent(null); return }
    window.api.telemetry.getConsent()
      .then(c => setConsent(c))
      .catch(() => setConsent(null))
  }, [status])

  async function handleConsent(accepted) {
    await window.api.telemetry.setConsent(accepted)
    setConsent(accepted)
  }

  // Load negocio once authenticated
  useEffect(() => {
    if (!authUser) return
    setStatus('loading')
    window.api.negocio.get().then((n) => {
      if (n) { setNegocio(n); setStatus('ready') }
      else setStatus('setup')
    })
  }, [authUser])

  if (authLoading) return (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-400 text-sm">Iniciando...</p>
    </div>
  )

  if (!authUser) return (
    <Auth onAuth={(user) => { setDeviceError(''); setAuthUser(user) }} deviceError={deviceError} />
  )

  if (status === 'loading') return (
    <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  if (status === 'setup') return (
    <Setup onComplete={(n) => { setNegocio(n); setStatus('ready') }} />
  )

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-52 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Tu negocio</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 truncate">{negocio?.nombre}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left ${
                activeTab === item.id
                  ? 'bg-primary-light text-primary dark:bg-primary/20'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <button
            onClick={() => signOut(auth)}
            className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors text-center py-1"
          >
            Cerrar sesión
          </button>
          <p className="text-xs text-gray-400 text-center">Your Business v1.2.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'sales'    && <Sales />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'history'  && <History />}
        {activeTab === 'board'    && <Board />}
        {activeTab === 'ai'       && <AIAnalysis negocio={negocio} />}
        {activeTab === 'calendar' && <Calendar negocio={negocio} />}
        {activeTab === 'settings' && (
          <Settings
            negocio={negocio}
            onNegocioUpdate={(n) => setNegocio(n)}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode(v => !v)}
          />
        )}
      </main>

      {consent === null && (
        <ConsentBanner
          onAccept={() => handleConsent(true)}
          onReject={() => handleConsent(false)}
        />
      )}
    </div>
  )
}
