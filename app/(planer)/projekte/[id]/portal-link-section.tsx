'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function PortalLinkSection({
  projectId,
  clientEmail,
}: {
  projectId: string
  clientEmail: string
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendPortalLink() {
    setSending(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: clientEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/portal/${projectId}`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setSending(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-4 mb-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-700">Bauherren-Portal</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {sent ? `Link an ${clientEmail} gesendet` : `Zugangslink an ${clientEmail} senden`}
        </p>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button
        onClick={sendPortalLink}
        disabled={sending || sent}
        className="text-sm px-3 py-1.5 border border-[#1a5276] text-[#1a5276] rounded-md hover:bg-[#1a5276]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {sent ? 'Gesendet' : sending ? 'Sende...' : 'Link senden'}
      </button>
    </div>
  )
}
