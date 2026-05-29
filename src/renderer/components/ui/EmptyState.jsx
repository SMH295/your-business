import React from 'react'

export default function EmptyState({ icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="text-5xl mb-4">{icon}</div>
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  )
}
