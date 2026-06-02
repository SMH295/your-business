import React, { useEffect, useRef, useState } from 'react'

function fmt(n) { return Number(n).toLocaleString('es-CO') }

function fmtHour(h) {
  const n = parseInt(h)
  if (n === 0) return '12a'; if (n < 12) return `${n}a`
  if (n === 12) return '12p'; return `${n - 12}p`
}

/* ── Bar chart (vertical) ── */
function BarChart({ data, labelKey, valueKey, formatVal = v => v, height = 130 }) {
  if (!data?.length) return <p className="text-xs text-gray-400 text-center py-6">Sin datos aún</p>
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height }}>
        {data.map((d, i) => {
          const h = Math.max((d[valueKey] / max) * height * 0.88, d[valueKey] > 0 ? 4 : 0)
          return (
            <div key={i} title={`${d[labelKey]}: ${formatVal(d[valueKey])}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              {d[valueKey] > 0 && (
                <span style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px' }}>{formatVal(d[valueKey])}</span>
              )}
              <div style={{
                width: '100%', height: `${h}px`,
                background: 'linear-gradient(to top, #15803d, #22c55e)',
                borderRadius: '4px 4px 0 0',
                opacity: d[valueKey] > 0 ? 1 : 0.12,
                transition: 'height 0.5s ease',
              }} />
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: '5px', marginTop: '6px' }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '9px', color: '#9ca3af' }}>{d[labelKey]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Horizontal bars (top products) ── */
function HorizBars({ data }) {
  if (!data?.length) return <p className="text-xs text-gray-400 text-center py-4">Sin ventas aún</p>
  const max = Math.max(...data.map(d => d.cantidad), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
              className="text-gray-800 dark:text-gray-200">
              <span style={{
                width: '20px', height: '20px', borderRadius: '50%', fontSize: '11px', fontWeight: 800,
                background: i === 0 ? 'linear-gradient(135deg,#15803d,#22c55e)' : '#f3f4f6',
                color: i === 0 ? '#fff' : '#6b7280',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>{i + 1}</span>
              {d.nombre}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 700 }} className="text-gray-500 dark:text-gray-400">
              {d.cantidad} uds · ${fmt(d.ingresos)}
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', overflow: 'hidden' }} className="bg-gray-100 dark:bg-gray-700">
            <div style={{
              width: `${(d.cantidad / max) * 100}%`, height: '100%',
              background: i === 0 ? 'linear-gradient(to right,#15803d,#22c55e)' : '#86efac',
              borderRadius: '4px', transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Stat card ── */
function StatCard({ icon, label, value, sub, premium }) {
  return (
    <div style={{
      borderRadius: '14px', padding: '20px', flex: 1,
      background: premium ? 'linear-gradient(135deg,#14532d,#16a34a)' : undefined,
      boxShadow: premium ? '0 8px 24px rgba(21,128,61,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
      border: premium ? 'none' : '1px solid #e5e7eb',
      position: 'relative', overflow: 'hidden',
    }} className={premium ? '' : 'bg-white dark:bg-gray-800 dark:border-gray-700'}>
      {premium && <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />}
      <div style={{ fontSize: '26px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '20px', fontWeight: 800, lineHeight: 1.2, color: premium ? '#fff' : undefined }}
        className={premium ? '' : 'text-gray-900 dark:text-white'}>
        {value}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '3px', color: premium ? 'rgba(255,255,255,0.75)' : undefined }}
        className={premium ? '' : 'text-gray-500 dark:text-gray-400'}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', marginTop: '2px', color: premium ? 'rgba(255,255,255,0.55)' : undefined }}
          className={premium ? '' : 'text-gray-400'}>
          {sub}
        </div>
      )}
    </div>
  )
}

/* ── AI Chat ── */
function AIChat({ negocio, stats }) {
  const [savedKey, setSavedKey] = useState(null)
  const [keyInput, setKeyInput]  = useState('')
  const [loadingKey, setLoadingKey] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    window.api.config.get('geminiKey').then(k => { setSavedKey(k); setLoadingKey(false) })
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, sending])

  async function saveKey() {
    if (!keyInput.trim()) return
    await window.api.config.set('geminiKey', keyInput.trim())
    setSavedKey(keyInput.trim()); setKeyInput('')
  }

  function buildContext() {
    const top = stats?.topProductos?.slice(0, 5).map(p => `${p.nombre} (${p.cantidad} uds, $${fmt(p.ingresos)})`).join(', ') || 'Sin datos'
    const dias = stats?.ventasPorDia?.map(d => `${d.dia}: ${d.count} ventas $${fmt(d.total)}`).join(' | ') || 'Sin datos'
    return `Eres un asistente experto en negocios para "${negocio?.nombre || 'Mi negocio'}". Responde siempre en español, de forma concisa y accionable.

Datos del negocio:
- Ventas hoy: ${stats?.ventasHoy?.count ?? 0} órdenes, $${fmt(stats?.ventasHoy?.total ?? 0)} COP
- Top productos (histórico): ${top}
- Ventas últimos 7 días: ${dias}

Ayuda al dueño con análisis de ventas, estrategias, preguntas sobre sus productos y el negocio en general.`
  }

  async function send() {
    if (!input.trim() || sending) return
    const userMsg = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next); setInput(''); setSending(true)
    try {
      const reply = await window.api.ai.chat({ messages: next, apiKey: savedKey, businessContext: buildContext() })
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally { setSending(false) }
  }

  if (loadingKey) return null

  /* No API key → setup screen */
  if (!savedKey) return (
    <div style={{
      background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
      border: '1px solid #bbf7d0', borderRadius: '16px',
      padding: '28px 28px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🔑</span>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#14532d', margin: 0 }}>
            Activá el Chat IA — es 100% gratis
          </h3>
          <p style={{ fontSize: '12px', color: '#166534', margin: 0 }}>
            Solo necesitás una cuenta de Google y seguir estos 4 pasos
          </p>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        {[
          { n: 1, text: 'Abrí', link: 'aistudio.google.com', post: 'en tu navegador' },
          { n: 2, text: 'Clic en', bold: '"Get API key"', post: 'en el menú de la izquierda' },
          { n: 3, text: 'Clic en', bold: '"Create API key"', post: '→ elegí', bold2: '"Default Gemini Project"', warn: '(¡no uses otro proyecto!)' },
          { n: 4, text: 'Copiá la clave que empieza con', bold: '"AIza..."', post: 'y pegala abajo' },
        ].map(s => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{
              width: 24, height: 24, borderRadius: '50%', background: '#16a34a', color: '#fff',
              fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>{s.n}</span>
            <p style={{ fontSize: '13px', color: '#166534', margin: 0, lineHeight: 1.5 }}>
              {s.text}{' '}
              {s.link && <strong style={{ color: '#14532d', textDecoration: 'underline' }}>{s.link}</strong>}{' '}
              {s.post}{' '}
              {s.bold && <strong style={{ color: '#14532d' }}>{s.bold}</strong>}{' '}
              {s.bold2 && <strong style={{ color: '#14532d' }}>{s.bold2}</strong>}{' '}
              {s.warn && <span style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700 }}>{s.warn}</span>}
            </p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text" value={keyInput} onChange={e => setKeyInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveKey()}
          placeholder="Pegá tu clave aquí: AIza..."
          style={{
            flex: 1, border: '1.5px solid #86efac', borderRadius: '10px',
            padding: '10px 14px', fontSize: '13px', outline: 'none', background: '#fff'
          }}
        />
        <button onClick={saveKey} disabled={!keyInput.trim()} style={{
          background: keyInput.trim() ? '#16a34a' : '#d1fae5', color: keyInput.trim() ? '#fff' : '#6b7280',
          border: 'none', borderRadius: '10px', padding: '10px 22px',
          fontSize: '13px', fontWeight: 700, cursor: keyInput.trim() ? 'pointer' : 'default',
          whiteSpace: 'nowrap'
        }}>Activar chat IA</button>
      </div>
    </div>
  )

  const suggestions = ['¿Cuál es mi producto más rentable?', '¿En qué horario vendo más?', 'Dame ideas para aumentar mis ventas', '¿Qué productos debería promocionar?']

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden',
      display: 'flex', flexDirection: 'column', height: '440px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.07)'
    }} className="bg-white dark:bg-gray-800 dark:border-gray-700">

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>✨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Asistente IA de Negocios</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>Powered by Gemini · Contexto de tu negocio incluido</div>
        </div>
        <button onClick={() => { setSavedKey(null); window.api.config.set('geminiKey', '') }}
          style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Cambiar key
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', paddingTop: '8px' }}>
            <p style={{ fontSize: '12px' }} className="text-gray-400">Preguntame lo que quieras sobre tu negocio</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)} style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '20px',
                  padding: '6px 14px', fontSize: '12px', color: '#166534', cursor: 'pointer', fontWeight: 500
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', fontSize: '13px', lineHeight: 1.55,
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'linear-gradient(135deg,#15803d,#22c55e)' : undefined,
              color: m.role === 'user' ? '#fff' : undefined,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              whiteSpace: 'pre-wrap',
            }} className={m.role === 'assistant' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100' : ''}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', gap: '5px', padding: '10px 14px', width: 'fit-content' }} className="bg-gray-100 dark:bg-gray-700 rounded-2xl">
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-bounce" style={{ width: 7, height: 7, borderRadius: '50%', background: '#9ca3af', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px' }} className="dark:border-gray-700">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          disabled={sending}
          placeholder="Preguntá algo sobre tu negocio..."
          className="dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:border-gray-600"
          style={{
            flex: 1, border: '1.5px solid #e5e7eb', borderRadius: '10px',
            padding: '8px 14px', fontSize: '13px', outline: 'none', background: 'transparent'
          }}
        />
        <button onClick={send} disabled={!input.trim() || sending} style={{
          width: 38, height: 38, borderRadius: '10px', border: 'none', cursor: input.trim() && !sending ? 'pointer' : 'default',
          background: input.trim() && !sending ? '#16a34a' : '#e5e7eb',
          color: input.trim() && !sending ? '#fff' : '#9ca3af',
          fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s', flexShrink: 0,
        }}>➤</button>
      </div>
    </div>
  )
}

/* ══════════════ MAIN COMPONENT ══════════════ */
export default function AIAnalysis({ negocio }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [stats, setStats]       = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    const up = () => setIsOnline(true); const down = () => setIsOnline(false)
    window.addEventListener('online', up); window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  useEffect(() => {
    window.api.analytics.getStats().then(d => { setStats(d); setLoading(false) })
  }, [])

  /* Build last-7-days array filling empty days */
  const diasData = (() => {
    const arr = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const found = stats?.ventasPorDia?.find(v => v.dia === key)
      arr.push({ dia: d.toLocaleDateString('es-CO', { weekday: 'short' }), total: found?.total || 0, count: found?.count || 0 })
    }
    return arr
  })()

  /* Build today's hours 6am–11pm */
  const horasData = Array.from({ length: 18 }, (_, i) => {
    const h = String(i + 6).padStart(2, '0')
    const found = stats?.ventasPorHora?.find(v => v.hora === h)
    return { hora: fmtHour(i + 6), count: found?.count || 0 }
  })

  const top = stats?.topProductos?.[0]

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

      {/* ── Premium header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #16a34a 80%, #22c55e 100%)',
        padding: '28px 32px', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative circles */}
        {[['-40px','-40px',200],['60%','-60px',150],['80%','10px',80]].map(([l,t,s],i) => (
          <div key={i} style={{ position:'absolute', top:t, left:l, width:s, height:s, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        ))}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <span style={{ fontSize: '26px' }}>✨</span>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0 }}>Análisis IA</h1>
              <span style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em',
                padding: '3px 10px', borderRadius: '999px', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.25)'
              }}>Premium</span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              Estadísticas inteligentes y asistente IA para {negocio?.nombre || 'tu negocio'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>${fmt(stats?.ventasHoy?.total ?? 0)}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>ingresos hoy</div>
          </div>
        </div>
      </div>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📡</span>
          <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 600 }}>
            Sin conexión — El chat IA no está disponible. Las estadísticas siguen funcionando.
          </span>
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-gray-400 text-sm">Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <StatCard icon="🛒" label="Ventas hoy" value={stats?.ventasHoy?.count ?? 0}
                sub={`${fmt(stats?.ventasHoy?.total ?? 0)} COP`} premium />
              <StatCard icon="📈" label="Mejor día (sem.)"
                value={(() => { const best = diasData.reduce((a,b) => b.total>a.total?b:a,{total:0,dia:'—'}); return best.total>0?best.dia:'—' })()}
                sub={(() => { const best = diasData.reduce((a,b) => b.total>a.total?b:a,{total:0}); return best.total>0?`$${fmt(best.total)} COP`:'' })()} />
              <StatCard icon="⭐" label="Producto estrella" value={top?.nombre || '—'}
                sub={top ? `${top.cantidad} uds vendidas` : 'Sin ventas aún'} />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background:'white', borderRadius:'16px', padding:'20px', border:'1px solid #e5e7eb', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}
                className="dark:bg-gray-800 dark:border-gray-700">
                <h3 style={{ fontSize:'14px', fontWeight:700, marginBottom:2 }} className="text-gray-900 dark:text-white">Ventas por hora — hoy</h3>
                <p style={{ fontSize:'11px', marginBottom:14 }} className="text-gray-400">Órdenes por franja horaria (6am–11pm)</p>
                <BarChart data={horasData} labelKey="hora" valueKey="count" height={120} />
              </div>
              <div style={{ background:'white', borderRadius:'16px', padding:'20px', border:'1px solid #e5e7eb', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}
                className="dark:bg-gray-800 dark:border-gray-700">
                <h3 style={{ fontSize:'14px', fontWeight:700, marginBottom:2 }} className="text-gray-900 dark:text-white">Ingresos últimos 7 días</h3>
                <p style={{ fontSize:'11px', marginBottom:14 }} className="text-gray-400">Total diario en COP</p>
                <BarChart data={diasData} labelKey="dia" valueKey="total"
                  formatVal={v => v>0 ? `$${(v/1000).toFixed(0)}k` : ''} height={120} />
              </div>
            </div>

            {/* Top productos */}
            <div style={{ background:'white', borderRadius:'16px', padding:'24px', border:'1px solid #e5e7eb', boxShadow:'0 2px 12px rgba(0,0,0,0.05)' }}
              className="dark:bg-gray-800 dark:border-gray-700">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div>
                  <h3 style={{ fontSize:'14px', fontWeight:700 }} className="text-gray-900 dark:text-white">Top productos más vendidos</h3>
                  <p style={{ fontSize:'11px', marginTop:2 }} className="text-gray-400">Ranking histórico por unidades</p>
                </div>
                {stats?.topProductos?.length > 0 && (
                  <span style={{ background:'#f0fdf4', color:'#16a34a', fontSize:'11px', fontWeight:700, padding:'3px 10px', borderRadius:'999px' }}>
                    Top {stats.topProductos.length}
                  </span>
                )}
              </div>
              <HorizBars data={stats?.topProductos} />
            </div>

            {/* AI Chat */}
            {isOnline && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:12 }}>
                  <h2 style={{ fontSize:'16px', fontWeight:700, margin:0 }} className="text-gray-900 dark:text-white">Chat con IA</h2>
                  <span style={{ background:'linear-gradient(135deg,#14532d,#22c55e)', color:'#fff', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'999px' }}>BETA</span>
                  <span style={{ fontSize:'12px' }} className="text-gray-400">· Tiene contexto de tu negocio</span>
                </div>
                <AIChat negocio={negocio} stats={stats} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
