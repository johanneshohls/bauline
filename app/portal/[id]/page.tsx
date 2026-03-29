import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { ChecklistItem, Project } from '@/lib/types'
import { BauherrChecklist } from './bauherr-checklist'

export default async function BauherrPortalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Prüfen ob Bauherr eingeloggt ist
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Projekt laden
  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(name, email)')
    .eq('id', id)
    .single()

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">Projekt nicht gefunden</h1>
          <p className="text-sm text-gray-500 mt-2">
            Dieser Link ist nicht gültig oder das Projekt existiert nicht mehr.
          </p>
        </div>
      </div>
    )
  }

  const proj = project as Project & { clients: { name: string; email: string | null } | null }

  // Prüfen ob der Bauherr Zugang zu diesem Projekt hat
  const clientEmail = proj.clients?.email
  const hasAccess = clientEmail && clientEmail.toLowerCase() === user.email?.toLowerCase()

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-gray-900">Kein Zugang</h1>
          <p className="text-sm text-gray-500 mt-2">
            Du hast keinen Zugang zu diesem Projekt.
          </p>
        </div>
      </div>
    )
  }

  // Nur Bauherr-Items laden
  const { data: items } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('project_id', id)
    .eq('responsible', 'bauherr')
    .order('sort_order', { ascending: true })

  const checklistItems = (items ?? []) as ChecklistItem[]

  const totalCount = checklistItems.length
  const doneCount = checklistItems.filter(
    (i) => i.status === 'eingereicht' || i.status === 'geprueft'
  ).length

  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">{proj.name}</h1>
              <p className="text-sm text-gray-500">
                Hallo, {proj.clients?.name ?? user.email}
              </p>
            </div>
            <span className="text-xs text-[#1a5276] font-medium">Bauline</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Fortschritt */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-700 font-medium">Deine Unterlagen</span>
            <span className="text-gray-500">
              {doneCount} von {totalCount} eingereicht
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-[#1a5276] h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {doneCount === totalCount && totalCount > 0 && (
            <p className="text-sm text-green-600 font-medium mt-2">
              Alle Unterlagen vollständig eingereicht.
            </p>
          )}
        </div>

        {/* Unterlagen-Liste */}
        {checklistItems.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">
              Es sind keine Aufgaben für dich hinterlegt.
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700">
                Benötigte Unterlagen
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Bitte beschaffe und lade die folgenden Dokumente hoch.
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {checklistItems.map((item) => (
                <BauherrChecklist key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-400 pb-4">
          Bei Fragen wende dich an dein Planungsbüro.
        </p>
      </main>
    </div>
  )
}
