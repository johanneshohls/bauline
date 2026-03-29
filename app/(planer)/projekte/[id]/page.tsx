import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Project, ChecklistItem } from '@/lib/types'
import { responsibleLabels, statusLabels, statusColors, categoryLabels } from '@/lib/checklist'
import { ChecklistRow } from './checklist-row'
import { PortalLinkSection } from './portal-link-section'

const projectStatusColors: Record<string, string> = {
  aktiv: 'bg-blue-100 text-blue-700',
  eingereicht: 'bg-yellow-100 text-yellow-700',
  genehmigt: 'bg-green-100 text-green-700',
  archiviert: 'bg-gray-100 text-gray-500',
}

const projectStatusLabels: Record<string, string> = {
  aktiv: 'Aktiv',
  eingereicht: 'Eingereicht',
  genehmigt: 'Genehmigt',
  archiviert: 'Archiviert',
}

type Responsible = 'planer' | 'bauherr' | 'fachplaner'

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ filter?: string }>
}) {
  const { id } = await params
  const { filter } = await searchParams

  const supabase = await createClient()

  const [{ data: project }, { data: items }] = await Promise.all([
    supabase
      .from('projects')
      .select('*, clients(name, email)')
      .eq('id', id)
      .single(),
    supabase
      .from('checklist_items')
      .select('*')
      .eq('project_id', id)
      .order('sort_order', { ascending: true }),
  ])

  if (!project) notFound()

  const proj = project as Project & { clients: { name: string; email: string | null } | null }
  const allItems = (items ?? []) as ChecklistItem[]

  const relevantItems = allItems.filter((i) => i.status !== 'nicht_relevant')
  const totalCount = relevantItems.length
  const doneCount = relevantItems.filter(
    (i) => i.status === 'geprueft' || i.status === 'eingereicht'
  ).length

  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const activeFilter = filter || 'alle'

  const filteredItems = allItems.filter((item) => {
    if (activeFilter === 'alle') return true
    if (activeFilter === 'offen') return item.status === 'offen'
    if (activeFilter === 'erledigt')
      return item.status === 'geprueft' || item.status === 'eingereicht'
    if (activeFilter === 'nachbesserung') return item.status === 'nachbesserung'
    return true
  })

  // Gruppieren nach Responsible
  const groups = (['planer', 'bauherr', 'fachplaner'] as Responsible[]).map(
    (responsible) => ({
      responsible,
      label: responsibleLabels[responsible],
      items: filteredItems.filter((i) => i.responsible === responsible),
    })
  ).filter((g) => g.items.length > 0)

  const allComplete = totalCount > 0 && doneCount === totalCount

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/projekte" className="hover:text-gray-700">Projekte</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{proj.name}</span>
      </div>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold text-gray-900">{proj.name}</h1>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${projectStatusColors[proj.status]}`}
              >
                {projectStatusLabels[proj.status]}
              </span>
            </div>
            {proj.address && (
              <p className="text-sm text-gray-500 mt-1">{proj.address}</p>
            )}
            {proj.clients?.name && (
              <p className="text-sm text-gray-500">Bauherr: {proj.clients.name}</p>
            )}
          </div>
          <Link
            href={`/projekte/${id}/bearbeiten`}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-md hover:border-gray-300 transition-colors shrink-0 ml-4"
          >
            Bearbeiten
          </Link>
        </div>

        {/* Fortschrittsbalken */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1.5">
            <span>{doneCount} von {totalCount} Unterlagen vollständig</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="bg-[#1a5276] h-2 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Portal-Link für Bauherr */}
      {proj.clients?.email && (
        <PortalLinkSection projectId={proj.id} clientEmail={proj.clients.email} />
      )}

      {/* Filter */}
      <div className="flex items-center gap-1 mb-4">
        {(['alle', 'offen', 'erledigt', 'nachbesserung'] as const).map((f) => (
          <Link
            key={f}
            href={`/projekte/${id}?filter=${f}`}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeFilter === f
                ? 'bg-[#1a5276] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Link>
        ))}
      </div>

      {/* Checkliste */}
      <div className="space-y-4">
        {groups.map(({ responsible, label, items: groupItems }) => (
          <div key={responsible} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-medium text-gray-700">{label}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {groupItems.map((item) => (
                <ChecklistRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-sm text-gray-500">
              {activeFilter === 'alle'
                ? 'Keine Checkliste-Einträge vorhanden.'
                : `Keine Einträge für Filter "${activeFilter}".`}
            </p>
          </div>
        )}
      </div>

      {/* FAB: Antrag einreichen */}
      {allComplete && (
        <div className="mt-6">
          <button className="w-full bg-green-600 text-white py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            Antrag einreichen
          </button>
        </div>
      )}
    </div>
  )
}
