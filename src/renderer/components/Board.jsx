import React, { useEffect, useState } from 'react'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'

const ROTATIONS = ['-2deg', '1.5deg', '-0.8deg', '2.3deg', '-1.6deg', '1.2deg', '-2.4deg', '0.6deg']

function fmt(n) {
  return Number(n).toLocaleString('es-AR')
}

function formatTime(str) {
  if (!str) return ''
  return new Date(str).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function Thumbtack() {
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 38% 38%, #ff8080, #cc1100)',
      boxShadow: '1px 2px 5px rgba(0,0,0,0.55)',
      border: '2px solid #991100',
      zIndex: 10,
    }} />
  )
}

function StickyNote({ note, onUpdate, onDelete }) {
  const [nota, setNota] = useState(note.nota || '')
  const isDone = note.hecho === 1
  const rotation = ROTATIONS[note.id % ROTATIONS.length]
  const items = note.detalle ? JSON.parse(note.detalle) : []

  const bg = isDone ? '#dcfce7' : '#fef9c3'
  const borderColor = isDone ? '#86efac' : '#fde047'
  const dividerColor = isDone ? '#bbf7d0' : '#fde68a'
  const labelColor = isDone ? '#166534' : '#92400e'
  const textColor = isDone ? '#14532d' : '#78350f'
  const placeholderClass = isDone ? 'placeholder-green-400' : 'placeholder-amber-400'

  function saveNota() {
    onUpdate({ id: note.id, nota, hecho: note.hecho })
  }

  function toggleHecho() {
    onUpdate({ id: note.id, nota, hecho: isDone ? 0 : 1 })
  }

  return (
    <div
      style={{
        backgroundColor: bg,
        borderTop: `4px solid ${borderColor}`,
        transform: `rotate(${rotation})`,
        width: '230px',
        borderRadius: '2px',
        boxShadow: '3px 5px 14px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.12)',
        padding: '32px 16px 14px',
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        flexShrink: 0,
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'rotate(0deg) scale(1.04)'
        e.currentTarget.style.boxShadow = '6px 10px 24px rgba(0,0,0,0.32), 0 2px 6px rgba(0,0,0,0.18)'
        e.currentTarget.style.zIndex = '20'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = `rotate(${rotation})`
        e.currentTarget.style.boxShadow = '3px 5px 14px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.12)'
        e.currentTarget.style.zIndex = '1'
      }}
    >
      <Thumbtack />

      {/* Delete */}
      <button
        onClick={onDelete}
        title="Eliminar"
        style={{ color: '#9ca3af', position: 'absolute', top: '6px', right: '8px', fontSize: '18px', lineHeight: 1, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#9ca3af'}
      >
        ×
      </button>

      {/* Header: orden + hora */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
        <span style={{ fontWeight: 800, fontSize: '15px', color: textColor }}>
          Orden #{note.numero_orden ?? '—'}
        </span>
        <span style={{ fontSize: '11px', color: labelColor, opacity: 0.65 }}>
          {formatTime(note.creado_en)}
        </span>
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${dividerColor}`, marginBottom: '8px' }} />

      {/* Items */}
      <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {items.length === 0 && (
          <span style={{ fontSize: '12px', color: labelColor, opacity: 0.6 }}>Sin items</span>
        )}
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: textColor, flex: 1 }}>
              <span style={{ fontWeight: 700 }}>{item.cantidad}×</span> {item.nombre}
            </span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: labelColor, whiteSpace: 'nowrap' }}>
              {fmt(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: `1px solid ${dividerColor}`, marginBottom: '8px' }} />

      {/* Total */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: labelColor }}>Total</span>
        <span style={{ fontSize: '14px', fontWeight: 800, color: textColor }}>{fmt(note.total ?? 0)}</span>
      </div>

      {/* Nota editable */}
      <div style={{ marginBottom: '10px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: labelColor, opacity: 0.6, marginBottom: '2px' }}>
          Nota
        </p>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          onBlur={saveNota}
          placeholder="Agregar nota..."
          rows={2}
          className={placeholderClass}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            fontSize: '12px',
            color: textColor,
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            padding: '2px 0',
          }}
        />
      </div>

      {/* Toggle hecho */}
      <button
        onClick={toggleHecho}
        style={{
          width: '100%',
          fontSize: '11px',
          fontWeight: 700,
          padding: '6px 0',
          borderRadius: '999px',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.15s',
          backgroundColor: isDone ? '#22c55e' : '#fde68a',
          color: isDone ? '#fff' : '#92400e',
        }}
      >
        {isDone ? '✓ Hecho' : '○ Por hacer'}
      </button>
    </div>
  )
}

export default function Board() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.pedidos.getAll().then(list => {
      setPedidos(list)
      setLoading(false)
    })
  }, [])

  async function handleUpdate(data) {
    await window.api.pedidos.update(data)
    setPedidos(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p))
  }

  async function handleDelete(id) {
    await window.api.pedidos.delete({ id })
    setPedidos(prev => prev.filter(p => p.id !== id))
  }

  async function clearDone() {
    const done = pedidos.filter(p => p.hecho === 1)
    await Promise.all(done.map(p => window.api.pedidos.delete({ id: p.id })))
    setPedidos(prev => prev.filter(p => p.hecho === 0))
  }

  // Pending first, then done — within each group keep creation order
  const sorted = [...pedidos].sort((a, b) => {
    if (a.hecho !== b.hecho) return a.hecho - b.hecho
    return a.id - b.id
  })

  const pendingCount = pedidos.filter(p => p.hecho === 0).length
  const doneCount = pedidos.filter(p => p.hecho === 1).length

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Tablero de Pedidos</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {pendingCount} por hacer
            {doneCount > 0 && ` · ${doneCount} hechos`}
          </p>
        </div>
        {doneCount > 0 && (
          <Button variant="secondary" size="sm" onClick={clearDone}>
            Limpiar hechos
          </Button>
        )}
      </div>

      {/* Corkboard — scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: '#b8894a',
          backgroundImage: [
            'radial-gradient(ellipse at 15% 25%, rgba(255,255,255,0.05) 0%, transparent 55%)',
            'radial-gradient(circle, rgba(0,0,0,0.13) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: 'cover, 14px 14px',
          padding: '40px 36px',
        }}
      >
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <span className="text-5xl">📌</span>
            <p style={{ color: '#f5deb3', fontSize: '14px', opacity: 0.8 }}>
              Acá van a aparecer los pedidos cuando confirmes una venta.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '44px', alignItems: 'flex-start' }}>
            {sorted.map(p => (
              <StickyNote
                key={p.id}
                note={p}
                onUpdate={handleUpdate}
                onDelete={() => handleDelete(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
