export type BuildingType = 'neubau' | 'umbau' | 'anbau' | 'nutzungsaenderung'
export type ProjectStatus = 'aktiv' | 'eingereicht' | 'genehmigt' | 'archiviert'
export type ChecklistStatus = 'offen' | 'in_arbeit' | 'eingereicht' | 'geprueft' | 'nachbesserung'
export type ChecklistCategory = 'antrag' | 'zeichnungen' | 'berechnungen' | 'nachweise' | 'bauherr' | 'fachplaner' | 'behoerde'
export type Responsible = 'planer' | 'bauherr' | 'fachplaner'

export interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  address: string | null
  client_id: string | null
  status: ProjectStatus
  building_type: BuildingType
  building_class: number | null
  is_sonderbau: boolean
  is_denkmal: boolean
  is_aussenbereich: boolean
  is_kuestenzone: boolean
  no_public_sewer: boolean
  flurstueck_nr: string | null
  grundstueck_m2: number | null
  notes: string | null
  created_at: string
  updated_at: string
  clients?: Client | null
}

export interface ChecklistItem {
  id: string
  project_id: string
  title: string
  category: ChecklistCategory
  responsible: Responsible
  fachplaner_name: string | null
  status: ChecklistStatus
  notes: string | null
  file_url: string | null
  file_name: string | null
  due_date: string | null
  is_required: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProjectParams {
  building_type: BuildingType
  building_class: number | null
  is_sonderbau: boolean
  is_denkmal: boolean
  is_aussenbereich: boolean
  is_kuestenzone: boolean
  no_public_sewer: boolean
}
