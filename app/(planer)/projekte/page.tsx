import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Project } from '@/lib/types'

const statusLabels: Record<string, string> = {
  aktiv: 'Aktiv',
  eingereicht: 'Eingereicht',
  genehmigt: 'Genehmigt',
  archiviert: 'Archiviert',
}

const statusColors: Record<string, string> = {
  aktiv: 'bg-blue-100 text-blue-700',
  eingereicht: 'bg-yellow-100 text-yellow-700',
  genehmigt: 'bg-green-100 text-green-700',
  archiviert: 'bg-gray-100 text-gray-500',
}

const buildingTypeLabels: Record<string, string> = {
  neubau: 'Neubau',
  umbau: 'Umbau',
  anbau: 'Anbau',
  nutzungsaenderung: 'Nutzungsänderung',
}

export default async function ProjektePage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })

  const list = (projects ?? []) as (Project & { clients: { name: string } | null })[]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Projekte</h1>
        <Link
          href="/projekte/neu"
          className="inline-flex items-center gap-2 bg-[#1a5276] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#154360] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neues Projekt
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500 text-sm">Noch keine Projekte angelegt.</p>
          <Link
            href="/projekte/neu"
            className="inline-block mt-4 text-sm text-[#1a5276] hover:underline"
          >
            Erstes Projekt anlegen
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((project) => (
            <Link
              key={project.id}
              href={`/projekte/${project.id}`}
              className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-5 py-4 hover:border-[#1a5276]/40 hover:shadow-sm transition-all"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 truncate">
                    {project.name}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[project.status]}`}
                  >
                    {statusLabels[project.status]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {project.clients?.name && (
                    <span className="text-sm text-gray-500">{project.clients.name}</span>
                  )}
                  {project.address && (
                    <span className="text-sm text-gray-400 truncate">{project.address}</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {buildingTypeLabels[project.building_type]}
                  </span>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400 shrink-0 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
