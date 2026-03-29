import { createClient } from '@/lib/supabase/server'
import { CheckForm } from './check-form'
import type { Project } from '@/lib/types'

export default async function GrundstueckscheckPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false })

  const projectList = (projects ?? []) as Pick<Project, 'id' | 'name'>[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Grundstückscheck</h1>
        <p className="text-sm text-gray-500 mt-1">
          Adresse eingeben — ALKIS & Bauleitplan WFS MV werden automatisch abgefragt.
        </p>
      </div>

      <CheckForm projects={projectList} />
    </div>
  )
}
