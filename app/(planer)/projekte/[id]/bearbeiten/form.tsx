'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Project, BuildingType, ProjectStatus, ProjectParams } from '@/lib/types'
import { diffChecklist } from '@/lib/checklist'

type ProjectWithClient = Project & {
  clients: { id: string; name: string; email: string | null; phone: string | null } | null
}

export function ProjektBearbeitenForm({ project }: { project: ProjectWithClient }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(project.name)
  const [address, setAddress] = useState(project.address ?? '')
  const [flurstueck_nr, setFlurstueckNr] = useState(project.flurstueck_nr ?? '')
  const [grundstueck_m2, setGrundstueckM2] = useState(project.grundstueck_m2?.toString() ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [notes, setNotes] = useState(project.notes ?? '')

  // Planungsrecht
  const [building_type, setBuildingType] = useState<BuildingType>(project.building_type)
  const [building_class, setBuildingClass] = useState<string>(project.building_class?.toString() ?? '')
  const [is_sonderbau, setIsSonderbau] = useState(project.is_sonderbau)
  const [is_denkmal, setIsDenkmal] = useState(project.is_denkmal)
  const [is_aussenbereich, setIsAussenbereich] = useState(project.is_aussenbereich)
  const [is_kuestenzone, setIsKuestenzone] = useState(project.is_kuestenzone)
  const [no_public_sewer, setNoPublicSewer] = useState(project.no_public_sewer)

  // Bauherr
  const [clientName, setClientName] = useState(project.clients?.name ?? '')
  const [clientEmail, setClientEmail] = useState(project.clients?.email ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Projektname ist erforderlich.'); return }
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Client aktualisieren falls vorhanden
      if (project.clients?.id) {
        const { error: clientErr } = await supabase
          .from('clients')
          .update({
            name: clientName.trim() || project.clients.name,
            email: clientEmail.trim() || null,
          })
          .eq('id', project.clients.id)
        if (clientErr) throw clientErr
      }

      // Projekt aktualisieren
      const { error: projErr } = await supabase
        .from('projects')
        .update({
          name: name.trim(),
          address: address.trim() || null,
          flurstueck_nr: flurstueck_nr.trim() || null,
          grundstueck_m2: grundstueck_m2 ? Number(grundstueck_m2) : null,
          status,
          notes: notes.trim() || null,
          building_type,
          building_class: building_class ? Number(building_class) : null,
          is_sonderbau,
          is_denkmal,
          is_aussenbereich,
          is_kuestenzone,
          no_public_sewer,
        })
        .eq('id', project.id)

      if (projErr) throw projErr

      // Checklisten-Diff ausführen
      const newParams: ProjectParams = {
        building_type,
        building_class: building_class ? Number(building_class) : null,
        is_sonderbau,
        is_denkmal,
        is_aussenbereich,
        is_kuestenzone,
        no_public_sewer,
      }

      const { data: existingItems } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('project_id', project.id)

      const { toAdd, toDeactivate } = diffChecklist(newParams, existingItems ?? [])

      // Neue Items anlegen
      if (toAdd.length > 0) {
        const maxSort = (existingItems ?? []).reduce(
          (m, i) => Math.max(m, i.sort_order ?? 0), 0
        )
        await supabase.from('checklist_items').insert(
          toAdd.map((item, idx) => ({
            project_id: project.id,
            title: item.title,
            category: item.category,
            responsible: item.responsible,
            fachplaner_name: item.fachplaner_name ?? null,
            sort_order: maxSort + idx + 1,
          }))
        )
      }

      // Nicht mehr relevante Items deaktivieren
      if (toDeactivate.length > 0) {
        await supabase
          .from('checklist_items')
          .update({ status: 'nicht_relevant' })
          .in('id', toDeactivate)
      }

      router.push(`/projekte/${project.id}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Stammdaten */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3">Stammdaten</h2>

        <div>
          <label className={labelClass}>Projektname <span className="text-red-500">*</span></label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Adresse</label>
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Flurstück-Nr.</label>
            <input type="text" value={flurstueck_nr} onChange={(e) => setFlurstueckNr(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Grundstück m²</label>
            <input type="number" value={grundstueck_m2} onChange={(e) => setGrundstueckM2(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={inputClass + ' bg-white'}>
            <option value="aktiv">Aktiv</option>
            <option value="eingereicht">Eingereicht</option>
            <option value="genehmigt">Genehmigt</option>
            <option value="archiviert">Archiviert</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass + ' resize-none'} />
        </div>
      </div>

      {/* Bauherr */}
      {project.clients && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3">Bauherr</h2>
          <div>
            <label className={labelClass}>Name</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>E-Mail</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className={inputClass} />
          </div>
        </div>
      )}

      {/* Planungsrechtliche Parameter */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-3">Planungsrechtliche Parameter</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Vorhaben-Art</label>
            <select value={building_type} onChange={(e) => setBuildingType(e.target.value as BuildingType)} className={inputClass + ' bg-white'}>
              <option value="neubau">Neubau</option>
              <option value="umbau">Umbau</option>
              <option value="anbau">Anbau</option>
              <option value="nutzungsaenderung">Nutzungsänderung</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Gebäudeklasse</label>
            <select value={building_class} onChange={(e) => setBuildingClass(e.target.value)} className={inputClass + ' bg-white'}>
              <option value="">— nicht bekannt —</option>
              <option value="1">GK 1</option>
              <option value="2">GK 2</option>
              <option value="3">GK 3</option>
              <option value="4">GK 4</option>
              <option value="5">GK 5</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {(
            [
              { key: 'is_sonderbau', label: 'Sonderbau', val: is_sonderbau, set: setIsSonderbau },
              { key: 'is_denkmal', label: 'Denkmalschutz', val: is_denkmal, set: setIsDenkmal },
              { key: 'is_aussenbereich', label: 'Außenbereich (§35)', val: is_aussenbereich, set: setIsAussenbereich },
              { key: 'is_kuestenzone', label: 'Küstenschutzzone', val: is_kuestenzone, set: setIsKuestenzone },
              { key: 'no_public_sewer', label: 'Kein öffentlicher Kanal', val: no_public_sewer, set: setNoPublicSewer },
            ] as const
          ).map(({ key, label, val, set }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={val}
                onChange={(e) => set(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#1a5276] focus:ring-[#1a5276]"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/projekte/${project.id}`)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Abbrechen
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#1a5276] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#154360] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </form>
  )
}
