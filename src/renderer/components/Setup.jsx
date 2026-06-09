import React, { useState } from 'react'
import Button from './ui/Button'

export default function Setup({ onComplete }) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isValid = nombre.trim().length >= 2 && nombre.trim().length <= 60

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError('')
    try {
      const negocio = await window.api.negocio.create({ nombre: nombre.trim() })
      window.api.telemetry.track('business_configured', {})
      onComplete(negocio)
    } catch (err) {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="bg-white rounded-xl shadow-md p-10 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🏪</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido a Your Business</h1>
        <p className="text-sm text-gray-500 mb-8">Configurá el nombre de tu negocio para comenzar</p>

        <form onSubmit={handleSubmit} className="text-left">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Nombre del negocio
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Zona Burguer"
            maxLength={60}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent mb-1"
          />
          <p className="text-xs text-gray-400 mb-5">{nombre.trim().length}/60 caracteres</p>

          {error && <p className="text-xs text-danger mb-4">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!isValid || loading}
          >
            {loading ? 'Guardando...' : 'Comenzar'}
          </Button>
        </form>
      </div>
    </div>
  )
}
