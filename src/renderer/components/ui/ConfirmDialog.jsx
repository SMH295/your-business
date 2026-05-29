import React from 'react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirmar acción" onClose={onCancel}>
      <p className="text-sm text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm}>Eliminar</Button>
      </div>
    </Modal>
  )
}
