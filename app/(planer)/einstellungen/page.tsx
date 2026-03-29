import { createClient } from '@/lib/supabase/server'

export default async function EinstellungenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user?.id)
    .single()

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Einstellungen</h1>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Profil</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              E-Mail
            </label>
            <p className="text-sm text-gray-900">{profile?.email ?? user?.email}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Name
            </label>
            <p className="text-sm text-gray-900">{profile?.full_name ?? '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Rolle
            </label>
            <p className="text-sm text-gray-900 capitalize">{profile?.role ?? '—'}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">System</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-500">
            Bauline — Planungsbüro-Software
          </p>
          <p className="text-xs text-gray-400 mt-1">Version 0.1 — MVP</p>
        </div>
      </div>
    </div>
  )
}
