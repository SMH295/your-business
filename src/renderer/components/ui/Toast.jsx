import React, { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const bg = type === 'success' ? 'bg-primary' : 'bg-danger'

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 ${bg} text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium`}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  )
}
