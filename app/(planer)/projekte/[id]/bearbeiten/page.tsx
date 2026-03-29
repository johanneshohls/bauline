import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Project } from '@/lib/types'
import { ProjektBearbeitenForm } from './form'

export default async function ProjektBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(id, name, email, phone)')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const proj = project as Project & {
    clients: { id: string; name: string; email: string | null; phone: string | null } | null
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/projekte" className="hover:text-gray-700">Projekte</Link>
        <span>/</span>
        <Link href={`/projekte/${id}`} className="hover:text-gray-700">{proj.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Bearbeiten</span>
      </div>

      <h1 className="text-xl font-semibold text-gray-900 mb-6">Projekt bearbeiten</h1>

      <ProjektBearbeitenForm project={proj} />
    </div>
  )
}
