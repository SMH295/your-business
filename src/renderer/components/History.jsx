import React, { useEffect, useState } from 'react'
import Modal from './ui/Modal'
import EmptyState from './ui/EmptyState'
import ConfirmDialog from './ui/ConfirmDialog'
import Button from './ui/Button'

function fmt(n) {
  return Number(n).toLocaleString('es-AR')
}

function formatTime(datetimeStr) {
  const d = new Date(datetimeStr)
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate() {
  return new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function History() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  function loadVentas() {
    window.api.ventas.getToday().then((v) => {
      setVentas(v)
      setLoading(false)
    })
  }

  useEffect(() => { loadVentas() }, [])

  async function handleDelete() {
    await window.api.ventas.delete({ id: toDelete.id })
    setToDelete(null)
    loadVentas()
  }

  const totalVendido = ventas.reduce((sum, v) => sum + v.total, 0)

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header summary */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Historial del día</h1>
          <p className="text-sm text-gray-500 capitalize">{formatDate()}</p>
        </div>
        <div className="flex gap-6 mt-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total vendido</p>
            <p className="text-2xl font-bold text-primary">{fmt(totalVendido)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Órdenes</p>
            <p className="text-2xl font-bold text-gray-900">{ventas.length}</p>
          </div>
        </div>
      </div>

      {/* Sale list */}
      <div className="flex-1 overflow-y-auto p-6">
        {ventas.length === 0 ? (
          <EmptyState icon="📋" message="No hay ventas registradas hoy." />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Orden</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Hora</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 uppercase text-xs tracking-wide">Total</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td
                      className="px-4 py-3 font-medium text-gray-900 cursor-pointer"
                      onClick={() => setSelected(v)}
                    >
                      #{v.numero_orden}
                    </td>
                    <td
                      className="px-4 py-3 text-gray-500 cursor-pointer"
                      onClick={() => setSelected(v)}
                    >
                      {formatTime(v.fecha_hora)}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-semibold text-gray-900 cursor-pointer"
                      onClick={() => setSelected(v)}
                    >
                      {fmt(v.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setToDelete(v)}
                        className="text-xs font-medium text-danger hover:text-danger-dark transition-colors px-2 py-1 rounded"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toDelete && (
        <ConfirmDialog
          message={`¿Eliminar la orden #${toDelete.numero_orden}? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
        />
      )}

      {/* Sale detail modal */}
      {selected && (
        <Modal title={`Detalle orden #${selected.numero_orden}`} onClose={() => setSelected(null)}>
          <p className="text-xs text-gray-400 mb-4">{formatTime(selected.fecha_hora)}</p>
          <table className="w-full text-sm mb-4">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left pb-2 text-xs font-medium text-gray-500">Producto</th>
                <th className="text-center pb-2 text-xs font-medium text-gray-500">Cant.</th>
                <th className="text-right pb-2 text-xs font-medium text-gray-500">Precio</th>
                <th className="text-right pb-2 text-xs font-medium text-gray-500">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {JSON.parse(selected.detalle).map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-900">{item.nombre}</td>
                  <td className="py-2 text-center text-gray-600">{item.cantidad}</td>
                  <td className="py-2 text-right text-gray-600">{fmt(item.precio)}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between items-center border-t border-gray-200 pt-3">
            <span className="font-semibold text-gray-600">Total</span>
            <span className="text-xl font-bold text-gray-900">{fmt(selected.total)}</span>
          </div>
        </Modal>
      )}
    </div>
  )
}
