'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistItem, ChecklistStatus } from '@/lib/types'
import { statusLabels, statusColors, categoryLabels } from '@/lib/checklist'

const statusOptions: ChecklistStatus[] = [
  'offen',
  'in_arbeit',
  'eingereicht',
  'geprueft',
  'nachbesserung',
]

export function ChecklistRow({ item }: { item: ChecklistItem }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<ChecklistStatus>(item.status)
  const [saving, setSaving] = useState(false)

  async function handleStatusChange(newStatus: ChecklistStatus) {
    setSaving(true)
    setStatus(newStatus)
    const supabase = createClient()
    await supabase
      .from('checklist_items')
      .update({ status: newStatus })
      .eq('id', item.id)
    setSaving(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Status-Indikator */}
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${
          status === 'geprueft' || status === 'eingereicht'
            ? 'bg-green-500'
            : status === 'nachbesserung'
            ? 'bg-red-400'
            : status === 'in_arbeit'
            ? 'bg-blue-400'
            : 'bg-gray-300'
        }`}
      />

      {/* Titel + Kategorie */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 leading-snug">{item.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{categoryLabels[item.category]}</p>
      </div>

      {/* Fachplaner-Name */}
      {item.fachplaner_name && (
        <span className="text-xs text-gray-400 shrink-0">{item.fachplaner_name}</span>
      )}

      {/* Status-Dropdown */}
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as ChecklistStatus)}
        disabled={saving}
        className={`text-xs px-2 py-1 rounded-full border-0 font-medium focus:outline-none focus:ring-2 focus:ring-[#1a5276] cursor-pointer disabled:opacity-50 ${statusColors[status]}`}
      >
        {statusOptions.map((s) => (
          <option key={s} value={s} className="bg-white text-gray-900">
            {statusLabels[s]}
          </option>
        ))}
      </select>
    </div>
  )
}
