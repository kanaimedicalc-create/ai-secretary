'use client'

import { SPECIALTY_LABELS, type Specialty } from '@/types/chat'

interface Props {
  value: Specialty
  onChange: (specialty: Specialty) => void
  disabled?: boolean
}

export function SpecialtySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2">
      {(Object.keys(SPECIALTY_LABELS) as Specialty[]).map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          disabled={disabled}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {SPECIALTY_LABELS[key]}
        </button>
      ))}
    </div>
  )
}
