import React, { useEffect, useRef, useState } from 'react'

function fmt(n) { return Number(n).toLocaleString('es-CO') }

const DAYS   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatFullDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function Calendar({ negocio }) {
  const today    = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(null)
  const [monthData,    setMonthData]    = useState({})
  const [dayDetail,    setDayDetail]    = useState(null)
  const [note,         setNote]         = useState('')
  const [noteSaved,    setNoteSaved]    = useState(false)
  const [aiAnalysis,   setAiAnalysis]   = useState('')
  const [aiLoading,    setAiLoading]    = useState(false)
  const [apiKey,       setApiKey]       = useState(null)
  const saveTimer = useRef(null)

  useEffect(() => {
    window.api.config.get('geminiKey').then(k => setApiKey(k))
  }, [])

  useEffect(() => {
    window.api.calendar.getMonthSummary(year, month + 1).then(rows => {
      const map = {}
      rows.forEach(r => { map[r.date] = { total: r.total, count: r.count } })
      setMonthData(map)
    })
  }, [year, month])

  useEffect(() => {
    if (!selectedDate) return
    setDayDetail(null)
    setAiAnalysis('')
    Promise.all([
      window.api.calendar.getDaySales(selectedDate),
      window.api.calendar.getNote(selectedDate),
    ]).then(([sales, noteVal]) => {
      const total = sales.reduce((s, v) => s + v.total, 0)
      setDayDetail({ sales, total, count: sales.length })
      setNote(noteVal || '')
    })
    window.api.telemetry.track('calendar_day_viewed', {})
  }, [selectedDate])

  function handleNoteChange(val) {
    setNote(val)
    setNoteSaved(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await window.api.calendar.setNote(selectedDate, val)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    }, 800)
  }

  async function analyzeWithAI() {
    if (!apiKey || !dayDetail || dayDetail.count === 0) return
    setAiLoading(true)
    setAiAnalysis('')
    try {
      const items = {}
      dayDetail.sales.forEach(v => {
        try {
          JSON.parse(v.detalle).forEach(i => {
            items[i.nombre] = (items[i.nombre] || 0) + i.cantidad
          })
        } catch {}
      })
      const productList = Object.entries(items).map(([n, q]) => `${n} (${q})`).join(', ') || 'Sin detalle'
      const [d, m, y] = [selectedDate.slice(8), MONTHS[parseInt(selectedDate.slice(5,7)) - 1], selectedDate.slice(0,4)]

      const context = `Eres un asistente experto en negocios para "${negocio?.nombre || 'Mi negocio'}". Responde en español, de forma concisa y accionable.

Datos de ventas del ${d} de ${m} de ${y}:
- Total: $${fmt(dayDetail.total)} COP
- Órdenes: ${dayDetail.count}
- Productos vendidos: ${productList}

Analiza brevemente este día: qué se vendió, si fue un buen día, y 1-2 recomendaciones concretas.`

      const reply = await window.api.ai.chat({
        messages: [{ role: 'user', content: 'Analizá las ventas de este día y dame insights y recomendaciones.' }],
        apiKey,
        businessContext: context
      })
      setAiAnalysis(reply)
      window.api.telemetry.track('calendar_day_ai_analyzed', {})
    } catch (err) {
      setAiAnalysis(`⚠️ ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()

  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthTotal  = Object.values(monthData).reduce((s, d) => s + d.total, 0)
  const monthOrders = Object.values(monthData).reduce((s, d) => s + d.count, 0)
  const monthDays   = Object.keys(monthData).length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Calendario</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: calendar grid ── */}
        <div className="w-80 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 text-lg font-bold">
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 text-lg font-bold">
              ›
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />
              const dateStr  = toDateStr(year, month, day)
              const data     = monthData[dateStr]
              const isToday  = dateStr === todayStr
              const isSel    = dateStr === selectedDate
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    relative flex flex-col items-center justify-center rounded-lg h-9 text-sm font-medium transition-colors
                    ${isSel
                      ? 'bg-primary text-white'
                      : isToday
                        ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-green-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {day}
                  {data?.count > 0 && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? 'bg-white/70' : 'bg-primary'}`} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Month summary */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {MONTHS[month]} {year}
            </p>
            {monthDays === 0 ? (
              <p className="text-xs text-gray-400">Sin ventas este mes</p>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Total vendido</span>
                  <span className="text-sm font-bold text-primary">${fmt(monthTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Órdenes</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{monthOrders}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Días con ventas</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{monthDays}</span>
                </div>
                {monthOrders > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Ticket promedio</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">${fmt(Math.round(monthTotal / monthOrders))}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: day detail panel ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full text-center select-none">
              <span className="text-5xl mb-4">📅</span>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Seleccioná un día</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Ver ventas, órdenes, notas y análisis IA</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-2xl">

              {/* Date header */}
              <div className="flex items-baseline gap-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                  {formatFullDate(selectedDate)}
                </h2>
                {selectedDate === todayStr && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Hoy</span>
                )}
              </div>

              {dayDetail === null ? (
                <p className="text-sm text-gray-400">Cargando...</p>
              ) : (
                <>
                  {/* Sales summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Total vendido</p>
                      <p className="text-2xl font-bold text-primary">${fmt(dayDetail.total)}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Órdenes</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{dayDetail.count}</p>
                    </div>
                  </div>

                  {/* Orders list */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Órdenes del día</h3>
                    </div>
                    {dayDetail.sales.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">Sin ventas registradas este día</p>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {dayDetail.sales.map(v => {
                          const items = (() => { try { return JSON.parse(v.detalle) } catch { return [] } })()
                          return (
                            <div key={v.id} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">#{v.numero_orden}</span>
                                <span className="text-sm font-bold text-primary">${fmt(v.total)}</span>
                              </div>
                              {items.length > 0 && (
                                <p className="text-xs text-gray-400 truncate">
                                  {items.map(i => `${i.nombre} ×${i.cantidad}`).join(' · ')}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Notas</h3>
                      {noteSaved && <span className="text-xs text-green-500 font-medium">Guardado</span>}
                    </div>
                    <textarea
                      value={note}
                      onChange={e => handleNoteChange(e.target.value)}
                      placeholder="Anotá algo sobre este día — eventos especiales, observaciones, recordatorios..."
                      rows={3}
                      className="w-full text-sm text-gray-700 dark:text-gray-300 bg-transparent resize-none outline-none placeholder-gray-300 dark:placeholder-gray-600 leading-relaxed"
                    />
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        ✨ Análisis IA del día
                      </h3>
                      {apiKey ? (
                        <button
                          onClick={analyzeWithAI}
                          disabled={aiLoading || dayDetail.count === 0}
                          className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-40"
                        >
                          {aiLoading ? 'Analizando...' : aiAnalysis ? 'Volver a analizar' : 'Analizar'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">Requiere API Key</span>
                      )}
                    </div>

                    {!apiKey && (
                      <p className="text-xs text-gray-400">
                        Configurá tu API Key en <strong className="text-gray-500">Configuración → Análisis IA</strong> para analizar las ventas de cada día con IA.
                      </p>
                    )}
                    {apiKey && dayDetail.count === 0 && !aiAnalysis && (
                      <p className="text-xs text-gray-400">Sin ventas este día — no hay datos para analizar.</p>
                    )}
                    {aiLoading && (
                      <div className="flex gap-1.5 py-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="animate-bounce w-1.5 h-1.5 rounded-full bg-gray-300"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                    {aiAnalysis && !aiLoading && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
