import type { ChecklistCategory, ChecklistItem, ProjectParams, Responsible } from './types'

export interface ChecklistItemTemplate {
  title: string
  category: ChecklistCategory
  responsible: Responsible
  fachplaner_name?: string
}

export function generateChecklist(params: ProjectParams): ChecklistItemTemplate[] {
  const items: ChecklistItemTemplate[] = []

  // ─── Basis-Items (immer erforderlich) ─────────────────────────────────────

  // Antrag
  items.push(
    { title: 'Bauantragsformular (MV)', category: 'antrag', responsible: 'planer' },
    { title: 'Baubeschreibung', category: 'antrag', responsible: 'planer' }
  )

  // Zeichnungen
  items.push(
    { title: 'Lageplan 1:500 mit Eintragungen', category: 'zeichnungen', responsible: 'planer' },
    { title: 'Grundrisse aller Geschosse 1:100', category: 'zeichnungen', responsible: 'planer' },
    { title: 'Mind. 2 Schnitte 1:100', category: 'zeichnungen', responsible: 'planer' },
    { title: 'Alle Ansichten 1:100', category: 'zeichnungen', responsible: 'planer' }
  )

  // Berechnungen
  items.push(
    { title: 'GRZ/GFZ/BRI/BGF-Berechnung', category: 'berechnungen', responsible: 'planer' },
    { title: 'Abstandsflächennachweis', category: 'berechnungen', responsible: 'planer' },
    { title: 'Stellplatznachweis', category: 'berechnungen', responsible: 'planer' },
    { title: 'Entwässerungsplan', category: 'berechnungen', responsible: 'planer' }
  )

  // Bauherr-Unterlagen
  items.push(
    { title: 'Grundbuchauszug / Eigentumsnachweis', category: 'bauherr', responsible: 'bauherr' },
    { title: 'Vollmacht für Planverfasser', category: 'bauherr', responsible: 'bauherr' }
  )

  // Fachplaner
  items.push(
    { title: 'Standsicherheitsnachweis (Statiker)', category: 'fachplaner', responsible: 'fachplaner', fachplaner_name: 'Statiker' },
    { title: 'GEG-Nachweis / Energieausweis', category: 'fachplaner', responsible: 'fachplaner', fachplaner_name: 'Energieberater' }
  )

  // ─── Bedingte Items ────────────────────────────────────────────────────────

  if (params.is_sonderbau) {
    items.push({
      title: 'Brandschutznachweis',
      category: 'fachplaner',
      responsible: 'fachplaner',
      fachplaner_name: 'Brandschutzplaner',
    })
  }

  if (params.building_class !== null && params.building_class >= 4) {
    items.push({
      title: 'Schallschutznachweis',
      category: 'fachplaner',
      responsible: 'fachplaner',
      fachplaner_name: 'Akustiker',
    })
  }

  if (params.is_denkmal) {
    items.push({
      title: 'Denkmalschutzgenehmigung',
      category: 'bauherr',
      responsible: 'bauherr',
    })
  }

  if (params.is_aussenbereich) {
    items.push(
      {
        title: 'Erschließungsnachweis',
        category: 'nachweise',
        responsible: 'planer',
      },
      {
        title: 'Naturschutzrechtliche Genehmigung (falls nötig)',
        category: 'bauherr',
        responsible: 'bauherr',
      }
    )
  }

  if (params.is_kuestenzone) {
    items.push({
      title: 'Zustimmung Wasserbehörde (Küstenschutzzone)',
      category: 'nachweise',
      responsible: 'planer',
    })
  }

  if (params.no_public_sewer) {
    items.push({
      title: 'Nachweis Kleinkläranlage / wasserrechtliche Erlaubnis',
      category: 'bauherr',
      responsible: 'bauherr',
    })
  }

  if (params.building_type === 'umbau' || params.building_type === 'anbau') {
    items.push({
      title: 'Bestandspläne (als Grundlage)',
      category: 'zeichnungen',
      responsible: 'planer',
    })
  }

  return items
}

// ─── Diff: Checkliste nach Parameteränderung abgleichen ───────────────────────
//
// Strategie (Option B):
// - Neue Items adden (falls Titel noch nicht in der DB)
// - Items die nicht mehr zutreffen: nur auf nicht_relevant setzen wenn
//   status === 'offen' UND keine Datei hochgeladen
// - Items mit Datei oder status >= in_arbeit werden nie angefasst

export interface ChecklistDiff {
  toAdd: ChecklistItemTemplate[]
  toDeactivate: string[]  // item IDs
}

export function diffChecklist(
  params: ProjectParams,
  existingItems: ChecklistItem[]
): ChecklistDiff {
  const target = generateChecklist(params)
  const targetTitles = new Set(target.map((i) => i.title))

  // Items die neu sind (Titel noch nicht vorhanden, auch nicht nicht_relevant)
  const existingTitles = new Set(
    existingItems
      .filter((i) => i.status !== 'nicht_relevant')
      .map((i) => i.title)
  )
  const toAdd = target.filter((t) => !existingTitles.has(t.title))

  // Items die nicht mehr benötigt werden:
  // - Titel nicht in target-Liste
  // - Status ist 'offen'
  // - Keine Datei hochgeladen
  const toDeactivate = existingItems
    .filter(
      (i) =>
        !targetTitles.has(i.title) &&
        i.status === 'offen' &&
        !i.file_url
    )
    .map((i) => i.id)

  return { toAdd, toDeactivate }
}

// ─── Gruppierhilfe für die UI ──────────────────────────────────────────────────

export const responsibleLabels: Record<Responsible, string> = {
  planer: 'Planungsbüro',
  bauherr: 'Bauherr',
  fachplaner: 'Fachplaner',
}

export const categoryLabels: Record<ChecklistCategory, string> = {
  antrag: 'Antrag',
  zeichnungen: 'Zeichnungen',
  berechnungen: 'Berechnungen',
  nachweise: 'Nachweise',
  bauherr: 'Bauherr-Unterlagen',
  fachplaner: 'Fachplaner-Nachweise',
  behoerde: 'Behörde',
}

export const statusLabels: Record<string, string> = {
  offen: 'Offen',
  in_arbeit: 'In Arbeit',
  eingereicht: 'Eingereicht',
  geprueft: 'Geprüft',
  nachbesserung: 'Nachbesserung',
  nicht_relevant: 'Nicht relevant',
}

export const statusColors: Record<string, string> = {
  offen: 'bg-gray-100 text-gray-600',
  in_arbeit: 'bg-blue-100 text-blue-700',
  eingereicht: 'bg-yellow-100 text-yellow-700',
  geprueft: 'bg-green-100 text-green-700',
  nachbesserung: 'bg-red-100 text-red-700',
  nicht_relevant: 'bg-gray-50 text-gray-400',
}
