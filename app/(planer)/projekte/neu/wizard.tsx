'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateChecklist } from '@/lib/checklist'
import type { BuildingType, ProjectParams } from '@/lib/types'

// ─── Step 1: Stammdaten ───────────────────────────────────────────────────────

function Step1({
  data,
  onChange,
}: {
  data: Step1Data
  onChange: (d: Step1Data) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Projektname <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="z.B. EFH Musterstraße 5, Rostock"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Adresse / Grundstück
        </label>
        <input
          type="text"
          value={data.address}
          onChange={(e) => onChange({ ...data, address: e.target.value })}
          placeholder="Straße, Hausnummer, PLZ Ort"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Flurstück-Nr.
          </label>
          <input
            type="text"
            value={data.flurstueck_nr}
            onChange={(e) => onChange({ ...data, flurstueck_nr: e.target.value })}
            placeholder="z.B. 123/4"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grundstück m²
          </label>
          <input
            type="number"
            value={data.grundstueck_m2}
            onChange={(e) => onChange({ ...data, grundstueck_m2: e.target.value })}
            placeholder="z.B. 650"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bauherr (Name)
        </label>
        <input
          type="text"
          value={data.client_name}
          onChange={(e) => onChange({ ...data, client_name: e.target.value })}
          placeholder="Vor- und Nachname"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          E-Mail Bauherr
        </label>
        <input
          type="email"
          value={data.client_email}
          onChange={(e) => onChange({ ...data, client_email: e.target.value })}
          placeholder="bauherr@beispiel.de"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent"
        />
      </div>
    </div>
  )
}

// ─── Step 2: Planungsrechtliche Parameter ─────────────────────────────────────

function Step2({
  data,
  onChange,
}: {
  data: Step2Data
  onChange: (d: Step2Data) => void
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vorhaben-Art <span className="text-red-500">*</span>
          </label>
          <select
            value={data.building_type}
            onChange={(e) => onChange({ ...data, building_type: e.target.value as BuildingType })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent bg-white"
          >
            <option value="neubau">Neubau</option>
            <option value="umbau">Umbau</option>
            <option value="anbau">Anbau</option>
            <option value="nutzungsaenderung">Nutzungsänderung</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gebäudeklasse (GK)
          </label>
          <select
            value={data.building_class ?? ''}
            onChange={(e) =>
              onChange({
                ...data,
                building_class: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5276] focus:border-transparent bg-white"
          >
            <option value="">— nicht bekannt —</option>
            <option value="1">GK 1 (freistehend, ≤7m)</option>
            <option value="2">GK 2 (freistehend, ≤7m, 2 WE)</option>
            <option value="3">GK 3 (≤7m, bis 400m² NF/Geschoss)</option>
            <option value="4">GK 4 (≤13m, bis 400m² NF/Geschoss)</option>
            <option value="5">GK 5 (sonstige, höher)</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Besondere Merkmale</p>

        {(
          [
            { key: 'is_sonderbau', label: 'Sonderbau (§ 2 Abs. 4 LBauO MV)', desc: 'z.B. Versammlungsstätten, Schulen, Hotels, Hochhäuser' },
            { key: 'is_denkmal', label: 'Denkmalschutz', desc: 'Bau steht unter Denkmalschutz oder liegt in Denkmalbereich' },
            { key: 'is_aussenbereich', label: 'Außenbereich (§ 35 BauGB)', desc: 'Grundstück liegt außerhalb der im Zusammenhang bebauten Ortslage' },
            { key: 'is_kuestenzone', label: 'Küstenschutzzone', desc: 'Lage in gesetzlich festgesetzter Küstenschutzzone MV' },
            { key: 'no_public_sewer', label: 'Kein öffentlicher Kanal', desc: 'Anschluss an öffentliche Kanalisation nicht möglich' },
          ] as const
        ).map(({ key, label, desc }) => (
          <label key={key} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data[key]}
              onChange={(e) => onChange({ ...data, [key]: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#1a5276] focus:ring-[#1a5276]"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">{label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Step 3: Bestätigung ──────────────────────────────────────────────────────

function Step3({ step1, step2 }: { step1: Step1Data; step2: Step2Data }) {
  const itemCount = generateChecklist({ ...step2 }).length

  const buildingTypeLabels: Record<BuildingType, string> = {
    neubau: 'Neubau',
    umbau: 'Umbau',
    anbau: 'Anbau',
    nutzungsaenderung: 'Nutzungsänderung',
  }

  const rows: [string, string][] = [
    ['Projekt', step1.name],
    ...(step1.address ? [['Adresse', step1.address] as [string, string]] : []),
    ...(step1.client_name ? [['Bauherr', step1.client_name] as [string, string]] : []),
    ['Vorhaben', buildingTypeLabels[step2.building_type]],
    ...(step2.building_class ? [['Gebäudeklasse', `GK ${step2.building_class}`] as [string, string]] : []),
    ...(step2.is_sonderbau ? [['', 'Sonderbau'] as [string, string]] : []),
    ...(step2.is_denkmal ? [['', 'Denkmalschutz'] as [string, string]] : []),
    ...(step2.is_aussenbereich ? [['', 'Außenbereich §35'] as [string, string]] : []),
    ...(step2.is_kuestenzone ? [['', 'Küstenschutzzone'] as [string, string]] : []),
    ...(step2.no_public_sewer ? [['', 'Kein öffentlicher Kanal'] as [string, string]] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <dl className="space-y-2">
          {rows.map(([label, value], i) => (
            <div key={i} className="flex gap-4">
              <dt className="text-sm text-gray-500 w-28 shrink-0">{label}</dt>
              <dd className="text-sm text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="bg-[#1a5276]/5 border border-[#1a5276]/20 rounded-lg p-4">
        <p className="text-sm text-[#1a5276] font-medium">
          Checkliste wird automatisch generiert
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Auf Basis der Parameter werden <strong>{itemCount} Unterlagen</strong> in
          der Checkliste angelegt.
        </p>
      </div>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step1Data {
  name: string
  address: string
  flurstueck_nr: string
  grundstueck_m2: string
  client_name: string
  client_email: string
}

interface Step2Data {
  building_type: BuildingType
  building_class: number | null
  is_sonderbau: boolean
  is_denkmal: boolean
  is_aussenbereich: boolean
  is_kuestenzone: boolean
  no_public_sewer: boolean
}

// ─── Wizard Shell ─────────────────────────────────────────────────────────────

export function NeuProjektWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [step1, setStep1] = useState<Step1Data>({
    name: '',
    address: '',
    flurstueck_nr: '',
    grundstueck_m2: '',
    client_name: '',
    client_email: '',
  })

  const [step2, setStep2] = useState<Step2Data>({
    building_type: 'neubau',
    building_class: null,
    is_sonderbau: false,
    is_denkmal: false,
    is_aussenbereich: false,
    is_kuestenzone: false,
    no_public_sewer: false,
  })

  async function handleSubmit() {
    setLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // 1. Client anlegen (falls Name angegeben)
      let client_id: string | null = null
      if (step1.client_name.trim()) {
        const { data: client, error: clientErr } = await supabase
          .from('clients')
          .insert({
            name: step1.client_name.trim(),
            email: step1.client_email.trim() || null,
          })
          .select('id')
          .single()

        if (clientErr) throw clientErr
        client_id = client.id
      }

      // 2. Projekt anlegen
      const { data: project, error: projectErr } = await supabase
        .from('projects')
        .insert({
          name: step1.name.trim(),
          address: step1.address.trim() || null,
          flurstueck_nr: step1.flurstueck_nr.trim() || null,
          grundstueck_m2: step1.grundstueck_m2 ? Number(step1.grundstueck_m2) : null,
          client_id,
          ...step2,
        })
        .select('id')
        .single()

      if (projectErr) throw projectErr

      // 3. Checkliste generieren
      const params: ProjectParams = { ...step2 }
      const items = generateChecklist(params)

      const checklistRows = items.map((item, idx) => ({
        project_id: project.id,
        title: item.title,
        category: item.category,
        responsible: item.responsible,
        fachplaner_name: item.fachplaner_name ?? null,
        sort_order: idx,
      }))

      const { error: clErr } = await supabase
        .from('checklist_items')
        .insert(checklistRows)

      if (clErr) throw clErr

      router.push(`/projekte/${project.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setLoading(false)
    }
  }

  const steps = ['Stammdaten', 'Parameter', 'Bestätigung']

  return (
    <div className="max-w-lg">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  done
                    ? 'bg-[#1a5276] text-white'
                    : active
                    ? 'bg-[#1a5276] text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  n
                )}
              </div>
              <span
                className={`text-sm ${active ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
              >
                {label}
              </span>
              {i < steps.length - 1 && (
                <div className="w-8 h-px bg-gray-200 ml-1" />
              )}
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        {step === 1 && <Step1 data={step1} onChange={setStep1} />}
        {step === 2 && <Step2 data={step2} onChange={setStep2} />}
        {step === 3 && <Step3 step1={step1} step2={step2} />}
      </div>

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.push('/projekte')}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {step === 1 ? 'Abbrechen' : 'Zurück'}
        </button>

        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && !step1.name.trim()) {
                setError('Bitte gib einen Projektnamen ein.')
                return
              }
              setError(null)
              setStep(step + 1)
            }}
            className="bg-[#1a5276] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#154360] transition-colors"
          >
            Weiter
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-[#1a5276] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#154360] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Wird angelegt...' : 'Projekt anlegen'}
          </button>
        )}
      </div>
    </div>
  )
}
