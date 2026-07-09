import React, { useState, useEffect } from 'react'
import { useEntitlements } from '../EntitlementsContext'
import { tierLabel } from '../EntitlementsContext'
import Toast from './ui/Toast'

const PLANS = [
  {
    id: 'gratis',
    name: 'Gratis',
    price: 'Gratis',
    period: 'para siempre',
    color: 'border-gray-200 dark:border-gray-600',
    badge: null,
    features: [
      'Hasta 40 productos',
      'Ventas ilimitadas',
      'Historial del día',
      'Tablero de pedidos',
      'Calendario de ventas',
    ],
    locked: ['Exportar CSV', 'Análisis IA', 'Informes avanzados'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19.900',
    period: 'COP / mes',
    color: 'border-primary ring-2 ring-primary/30',
    badge: 'Más popular',
    features: [
      'Productos ilimitados',
      'Ventas ilimitadas',
      'Historial completo',
      'Tablero de pedidos',
      'Calendario de ventas',
      'Exportar CSV',
      'Análisis IA',
    ],
    locked: ['Informes avanzados'],
  },
  {
    id: 'negocios',
    name: 'Negocios',
    price: '$49.900',
    period: 'COP / mes',
    color: 'border-purple-400 dark:border-purple-500',
    badge: null,
    features: [
      'Todo lo de Pro',
      'Informes avanzados',
      'Soporte prioritario',
    ],
    locked: [],
  },
]

function PlanCard({ plan, current }) {
  const isActive = current === plan.id
  return (
    <div className={`relative rounded-2xl border-2 p-6 flex flex-col gap-4 bg-white dark:bg-gray-800 ${plan.color} ${isActive ? 'shadow-lg' : ''}`}>
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">{plan.badge}</span>
      )}
      {isActive && (
        <span className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">Tu plan actual</span>
      )}
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-2xl font-extrabold text-gray-900 dark:text-white">{plan.price}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{plan.period}</span>
        </div>
      </div>
      <ul className="space-y-2 flex-1">
        {plan.features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-green-500 font-bold">✓</span> {f}
          </li>
        ))}
        {plan.locked.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-400 line-through">
            <span className="text-gray-300">✗</span> {f}
          </li>
        ))}
      </ul>
      {plan.id !== 'gratis' && !isActive && (
        <a
          href={`https://wa.me/573000000000?text=Quiero activar el plan ${plan.name} de Your Business`}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            window.api?.telemetry?.track('paywall_cta_clicked', { tier: plan.id })
            window.api?.telemetry?.track('checkout_started', { tier: plan.id })
          }}
          className={`mt-2 w-full py-2.5 text-sm font-bold rounded-xl transition-colors text-center block ${
            plan.id === 'pro'
              ? 'bg-primary hover:bg-primary-dark text-white'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          Contratar {plan.name}
        </a>
      )}
    </div>
  )
}

export default function Plan({ userEmail, onActivated }) {
  const { ents } = useEntitlements()
  const [key, setKey]         = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast]     = useState(null)

  useEffect(() => {
    window.api?.telemetry?.track('plan_screen_opened', { tier: ents.tier })
  }, [])

  async function handleActivate() {
    if (!key.trim()) return
    setLoading(true)
    try {
      const result = await window.api.license.activate(key.trim(), userEmail)
      if (result.ok) {
        setToast({ msg: `¡Licencia ${tierLabel(result.tier)} activada correctamente!`, type: 'success' })
        setKey('')
        onActivated?.()
        window.api?.telemetry?.track('license_activated', { tier: result.tier, plan: result.plan })
      } else {
        const msgs = {
          invalid_format:    'Formato de clave inválido. Debe empezar con YB1-',
          invalid_signature: 'Clave inválida o alterada.',
          email_mismatch:    'Esta clave pertenece a otro correo.',
          expired:           'Esta clave ya venció.',
          db_error:          'Error al guardar la licencia. Intentá de nuevo.',
        }
        setToast({ msg: msgs[result.reason] || 'Clave inválida.', type: 'error' })
      }
    } catch {
      setToast({ msg: 'Error al verificar la licencia.', type: 'error' })
    } finally { setLoading(false) }
  }

  const isFounder = ents.founder
  const tier = ents.tier

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Mi Plan</h1>
        {isFounder && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mt-0.5">
            ★ Acceso Fundador — Empresarial lifetime
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Pricing grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(p => <PlanCard key={p.id} plan={p} current={isFounder ? 'empresarial' : tier} />)}
        </div>

        {/* Founder block */}
        {isFounder && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-600 rounded-2xl p-6 text-center">
            <p className="text-2xl mb-2">★</p>
            <p className="font-bold text-yellow-800 dark:text-yellow-200 text-lg">Licencia Fundador</p>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Tenés acceso completo Empresarial de por vida como creador de Your Business.
            </p>
          </div>
        )}

        {/* License key activation */}
        {!isFounder && tier === 'gratis' && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">¿Ya tenés una clave de licencia?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Ingresá tu clave YB1- para activar tu plan Pro o Negocios.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                placeholder="YB1-..."
                className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleActivate}
                disabled={loading || !key.trim()}
                className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Activar'}
              </button>
            </div>
          </div>
        )}

        {/* Active paid plan */}
        {!isFounder && tier !== 'gratis' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-2xl p-6">
            <p className="font-semibold text-green-800 dark:text-green-200">
              ✓ Plan {tierLabel(tier)} activo
            </p>
            {ents.expires_at && (
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Vence el {new Date(ents.expires_at).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                {ents.grace && ' — período de gracia activo'}
              </p>
            )}
            {ents.plan === 'lifetime' && (
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">Licencia de por vida</p>
            )}
          </div>
        )}

      </div>

      {toast && (
        <Toast
          message={toast.type === 'error' ? `✕ ${toast.msg}` : `✓ ${toast.msg}`}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
