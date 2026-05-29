import React from 'react'

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed',
  danger: 'bg-danger text-white hover:bg-danger-dark disabled:opacity-50 disabled:cursor-not-allowed'
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base'
}

export default function Button({ variant = 'primary', size = 'md', children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
