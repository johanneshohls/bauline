'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { ChecklistItem, ChecklistStatus } from '@/lib/types'

const statusDisplay: Record<ChecklistStatus, { label: string; color: string }> = {
  offen: { label: 'Noch ausstehend', color: 'text-gray-500' },
  in_arbeit: { label: 'In Bearbeitung', color: 'text-blue-600' },
  eingereicht: { label: 'Eingereicht', color: 'text-green-600' },
  geprueft: { label: 'Geprueft', color: 'text-green-700' },
  nachbesserung: { label: 'Nachbesserung nötig', color: 'text-red-600' },
}

export function BauherrChecklist({ item }: { item: ChecklistItem }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDone = item.status === 'eingereicht' || item.status === 'geprueft'

  async function handleFileUpload(file: File) {
    setUploading(true)
    setError(null)

    const supabase = createClient()

    // Datei zu Supabase Storage hochladen
    const ext = file.name.split('.').pop()
    const path = `${item.project_id}/${item.id}-${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, file)

    if (uploadErr) {
      setError('Upload fehlgeschlagen: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(path)

    // Checklist-Item aktualisieren
    const { error: updateErr } = await supabase
      .from('checklist_items')
      .update({
        status: 'eingereicht',
        file_url: urlData.publicUrl,
        file_name: file.name,
      })
      .eq('id', item.id)

    if (updateErr) {
      setError('Fehler beim Speichern: ' + updateErr.message)
    } else {
      startTransition(() => router.refresh())
    }
    setUploading(false)
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        {/* Status-Icon */}
        <div
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            isDone
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 bg-white'
          }`}
        >
          {isDone && (
            <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{item.title}</p>
          <p className={`text-xs mt-0.5 ${statusDisplay[item.status].color}`}>
            {statusDisplay[item.status].label}
          </p>

          {item.file_name && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              Datei: {item.file_name}
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}

          {item.notes && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              Hinweis: {item.notes}
            </div>
          )}
        </div>

        {/* Upload Button */}
        {!isDone && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 text-xs px-3 py-1.5 border border-[#1a5276] text-[#1a5276] rounded-md hover:bg-[#1a5276]/5 disabled:opacity-50 min-h-[36px]"
            >
              {uploading ? 'Lädt...' : 'Hochladen'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
