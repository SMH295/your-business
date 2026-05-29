import React, { useEffect, useState } from 'react'
import Button from './ui/Button'
import EmptyState from './ui/EmptyState'
import Toast from './ui/Toast'

function fmt(n) {
  return Number(n).toLocaleString('es-CO')
}

export default function Sales() {
  const [productos, setProductos] = useState([])
  const [carrito, setCarrito] = useState([])
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    window.api.productos.getAll().then(setProductos)
  }, [])

  const productosFiltrados = busqueda.trim()
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  function addToCart(producto) {
    setCarrito((prev) => {
      const existing = prev.find((i) => i.id === producto.id)
      if (existing) {
        return prev.map((i) =>
          i.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio }
            : i
        )
      }
      return [...prev, { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, subtotal: producto.precio }]
    })
  }

  function updateQty(id, delta) {
    setCarrito((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, cantidad: i.cantidad + delta, subtotal: (i.cantidad + delta) * i.precio } : i)
        .filter((i) => i.cantidad > 0)
    )
  }

  function removeItem(id) {
    setCarrito((prev) => prev.filter((i) => i.id !== id))
  }

  const total = carrito.reduce((sum, i) => sum + i.subtotal, 0)

  async function handleConfirm() {
    if (carrito.length === 0) return
    setLoading(true)
    try {
      const numero_orden = await window.api.ventas.getNextOrder()
      const detalleStr = JSON.stringify(carrito)
      await window.api.ventas.create({ numero_orden, total, detalle: detalleStr })
      await window.api.pedidos.create({ numero_orden, total, detalle: detalleStr, nota: '', hecho: 0 })
      setCarrito([])
      setToast(`Venta #${numero_orden} registrada`)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left panel — product catalog */}
      <div className="flex-[3] flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Catálogo</h2>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
          {productos.length === 0 ? (
            <EmptyState icon="🛒" message="No hay productos registrados. Ve a Productos para agregar." />
          ) : productosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-10">No se encontraron productos.</p>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all group"
                >
                  <p className="font-medium text-gray-900 dark:text-white text-sm group-hover:text-primary truncate">{p.nombre}</p>
                  <p className="text-primary font-semibold text-base mt-1">{fmt(p.precio)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel — cart */}
      <div className="flex-[2] flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Orden actual</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {carrito.length === 0 ? (
            <p className="text-sm text-gray-400 text-center mt-10">El carrito está vacío</p>
          ) : (
            <div className="space-y-2">
              {carrito.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.nombre}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{fmt(item.precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="w-6 text-center text-sm font-semibold text-gray-900 dark:text-white">{item.cantidad}</span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white w-20 text-right">{fmt(item.subtotal)}</p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-gray-300 hover:text-danger transition-colors text-lg leading-none"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-base font-medium text-gray-600 dark:text-gray-300">Total</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{fmt(total)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setCarrito([])} disabled={carrito.length === 0}>
              Cancelar
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleConfirm} disabled={carrito.length === 0 || loading}>
              {loading ? 'Guardando...' : 'Confirmar venta'}
            </Button>
          </div>
        </div>
      </div>

      {toast && <Toast message={`✓ ${toast}`} type="success" onClose={() => setToast(null)} />}
    </div>
  )
}
