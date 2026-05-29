import React, { useEffect, useState } from 'react'
import Button from './ui/Button'
import Modal from './ui/Modal'
import EmptyState from './ui/EmptyState'
import ConfirmDialog from './ui/ConfirmDialog'

function fmt(n) {
  return Number(n).toLocaleString('es-CO')
}

// Parsea números en formato colombiano: 22.000 → 22000 | 22,50 → 22.5 | 1.234,56 → 1234.56
function parsePrecio(str) {
  str = String(str).trim().replace(/[^\d.,]/g, '')
  if (!str) return NaN
  if (str.includes(',')) {
    // Coma = separador decimal (formato AR): quitar puntos de miles, reemplazar coma por punto
    return parseFloat(str.replace(/\./g, '').replace(',', '.'))
  }
  const parts = str.split('.')
  if (parts.length === 1) return parseFloat(str)
  const lastPart = parts[parts.length - 1]
  if (lastPart.length === 3) {
    // Punto seguido de 3 dígitos = separador de miles
    return parseFloat(parts.join(''))
  }
  // Punto con 1-2 dígitos = separador decimal
  return parseFloat(str)
}

function ProductModal({ product, onSave, onClose }) {
  const [nombre, setNombre] = useState(product?.nombre || '')
  const [precio, setPrecio] = useState(product?.precio != null ? String(product.precio) : '')
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (nombre.trim().length < 2) e.nombre = 'Mínimo 2 caracteres'
    const p = parsePrecio(precio)
    if (isNaN(p) || p <= 0) e.precio = 'Ingresá un número válido mayor a 0 (ej: 22.000 o 22,50)'
    return e
  }

  function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    onSave({ nombre: nombre.trim(), precio: parsePrecio(precio) })
  }

  return (
    <Modal title={product ? 'Editar producto' : 'Agregar producto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Hamburguesa clásica"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.nombre && <p className="text-xs text-danger mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Precio</label>
          <input
            type="text"
            inputMode="decimal"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            placeholder="Ej: 22.000 o 22,50"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.precio && <p className="text-xs text-danger mt-1">{errors.precio}</p>}
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function Products() {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | { product }
  const [confirm, setConfirm] = useState(null) // null | product to delete
  const [busqueda, setBusqueda] = useState('')

  const productosFiltrados = busqueda.trim()
    ? productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : productos

  async function loadProductos() {
    const list = await window.api.productos.getAll()
    setProductos(list)
    setLoading(false)
  }

  useEffect(() => { loadProductos() }, [])

  async function handleSave(data) {
    if (modal === 'add') {
      await window.api.productos.create(data)
    } else {
      await window.api.productos.update({ id: modal.id, ...data })
    }
    setModal(null)
    loadProductos()
  }

  async function handleDelete() {
    await window.api.productos.delete({ id: confirm.id })
    setConfirm(null)
    loadProductos()
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Productos</h1>
          <Button variant="primary" onClick={() => setModal('add')}>+ Agregar producto</Button>
        </div>
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
        {productos.length === 0 ? (
          <EmptyState icon="📦" message="Aún no tenés productos. ¡Agregá tu primero!" />
        ) : productosFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400 text-center mt-10">No se encontraron productos.</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">Nombre</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">Precio</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {productosFiltrados.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmt(p.precio)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setModal(p)}
                          className="text-xs font-medium text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirm(p)}
                          className="text-xs font-medium text-danger hover:text-danger-dark transition-colors px-2 py-1 rounded"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {modal && (
        <ProductModal
          product={modal === 'add' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          message={`¿Eliminar "${confirm.nombre}"? Esta acción no se puede deshacer.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
