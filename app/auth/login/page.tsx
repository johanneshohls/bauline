'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Bauline</h1>
          <p className="text-sm text-gray-500 mt-1">Planungsbüro-Software</p>
        </div>

        {sent ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-base font-medium text-gray-900 mb-2">
              Magic Link gesendet
            </h2>
            <p className="text-sm text-gray-600">
              Prüfe dein Postfach unter <strong>{email}</strong> und klicke
              auf den Link zum Einloggen.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                E-Mail-Adresse
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nora@beispiel.de"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a5276] text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-[#154360] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sende Link...' : 'Magic Link senden'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
