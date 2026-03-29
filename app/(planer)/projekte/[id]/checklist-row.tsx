'use client'

import { useState, useRef, useTransition } from 'react'
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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(item.file_name)
  const [fileUrl, setFileUrl] = useState<string | null>(item.file_url)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  async function handleFileUpload(file: File) {
    setUploading(true)
    setUploadError(null)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const path = `${item.project_id}/${item.id}-${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('documents')
      .upload(path, file)

    if (uploadErr) {
      setUploadError('Upload fehlgeschlagen')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)

    const newStatus: ChecklistStatus =
      status === 'offen' || status === 'in_arbeit' ? 'eingereicht' : status

    await supabase
      .from('checklist_items')
      .update({
        file_url: urlData.publicUrl,
        file_name: file.name,
        status: newStatus,
      })
      .eq('id', item.id)

    setFileName(file.name)
    setFileUrl(urlData.publicUrl)
    setStatus(newStatus)
    setUploading(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-400">{categoryLabels[item.category]}</p>
            {fileName && (
              <>
                <span className="text-gray-200">·</span>
                {fileUrl ? (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#1a5276] hover:underline truncate max-w-[180px]"
                  >
                    {fileName}
                  </a>
                ) : (
                  <span className="text-xs text-gray-400 truncate max-w-[180px]">{fileName}</span>
                )}
              </>
            )}
          </div>
          {uploadError && (
            <p className="text-xs text-red-500 mt-0.5">{uploadError}</p>
          )}
        </div>

        {/* Fachplaner-Name */}
        {item.fachplaner_name && (
          <span className="text-xs text-gray-400 shrink-0">{item.fachplaner_name}</span>
        )}

        {/* Upload-Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.tiff,.dwg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileUpload(file)
            e.target.value = ''
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Dokument hochladen"
          className="shrink-0 text-gray-400 hover:text-[#1a5276] disabled:opacity-50 transition-colors"
        >
          {uploading ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
        </button>

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
    </div>
  )
}
