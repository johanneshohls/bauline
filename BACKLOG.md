# Bauline — Backlog

## Projekt
Planungsbüro-Software für Nora Hohls. Bauvorlagen-Checkliste (LP4) + Grundstückscheck (LP1) + Bauherren-Portal + Behörden-Portal (Vision).

**Stack:** Next.js 15, Supabase (sbuhfxknotbkifswddie), TypeScript, Tailwind
**Supabase URL:** https://sbuhfxknotbkifswddie.supabase.co
**Domain:** bauline.app

## Milestone v0.1 — MVP: Checkliste + Bauherren-Portal

### [3 SP] Supabase-Client + Auth einrichten
- `lib/supabase/client.ts` und `lib/supabase/server.ts` anlegen
- Auth-Middleware (`middleware.ts`) für geschützte Routen
- Login-Seite mit Magic Link (`app/auth/login/page.tsx`)
- Auth-Callback Route (`app/auth/callback/route.ts`)

### [5 SP] Layout + Navigation (Planer)
- Root-Layout mit Sidebar-Navigation
- Sidebar: Dashboard, Projekte, Grundstückscheck, Einstellungen
- Design: professionell, hell, architektonisch — Grautöne + Akzentfarbe #1a5276 (Dunkelblau)
- Responsive (Mobile: Hamburger-Menü)

### [8 SP] Projekte — Liste + Anlegen
- `/projekte` — Liste aller Bauvorhaben mit Status-Badge
- `/projekte/neu` — Wizard zum Anlegen:
  - Schritt 1: Name, Adresse, Bauherr (Client aus DB oder neu)
  - Schritt 2: Planungsrechtliche Parameter (building_type, building_class, is_sonderbau, is_denkmal, is_aussenbereich, is_kuestenzone, no_public_sewer)
  - Schritt 3: Bestätigung → Checkliste wird automatisch generiert
- Nach Anlegen: Redirect auf Projekt-Detail

### [13 SP] Checklisten-Engine (Kernstück)
Funktion `generateChecklist(projectParams)` → Array von Checklist-Items.

Basis-Items (immer):
- [planer/antrag] Bauantragsformular (MV)
- [planer/antrag] Baubeschreibung
- [planer/zeichnungen] Lageplan 1:500 mit Eintragungen
- [planer/zeichnungen] Grundrisse aller Geschosse 1:100
- [planer/zeichnungen] Mind. 2 Schnitte 1:100
- [planer/zeichnungen] Alle Ansichten 1:100
- [planer/berechnungen] GRZ/GFZ/BRI/BGF-Berechnung
- [planer/berechnungen] Abstandsflächennachweis
- [planer/berechnungen] Stellplatznachweis
- [planer/berechnungen] Entwässerungsplan
- [bauherr/bauherr] Grundbuchauszug / Eigentumsnachweis
- [bauherr/bauherr] Vollmacht für Planverfasser
- [fachplaner/fachplaner] Standsicherheitsnachweis (Statiker)
- [fachplaner/fachplaner] GEG-Nachweis / Energieausweis

Bedingte Items:
- if is_sonderbau: [fachplaner] Brandschutznachweis
- if building_class >= 4: [fachplaner] Schallschutznachweis
- if is_denkmal: [bauherr] Denkmalschutzgenehmigung
- if is_aussenbereich: [planer] Erschließungsnachweis, [bauherr] Naturschutzrechtliche Genehmigung (falls nötig)
- if is_kuestenzone: [planer] Zustimmung Wasserbehörde (Küstenschutzzone)
- if no_public_sewer: [bauherr] Nachweis Kleinkläranlage / wasserrechtliche Erlaubnis
- if building_type == 'umbau' || 'anbau': [planer] Bestandspläne (als Grundlage)

### [8 SP] Projekt-Detail — Checkliste (Planer-Sicht)
- `/projekte/[id]` — Vollständige Checkliste
- Gruppiert nach Verantwortlichem (Planer / Bauherr / Fachplaner)
- Pro Item: Status-Dropdown, Notiz, Datei-Upload (Supabase Storage), Fälligkeitsdatum
- Vollständigkeitsbalken oben: "13 von 17 Unterlagen vollständig"
- Schnellfilter: Alle / Offen / Erledigt / Nachbesserung
- Floating Action: "Antrag einreichen" (wenn alles vollständig)

### [5 SP] Bauherren-Portal
- `/portal/[token]` — Token-basierter Zugang (kein Account nötig)
- Magic Link per E-Mail verschicken (Supabase Auth / oder einfacher: JWT-Token in URL)
- Bauherr sieht nur: seine Aufgaben (responsible = 'bauherr')
- Datei-Upload direkt im Portal
- Fortschrittsbalken "2 von 4 Unterlagen eingereicht"
- Einfache Sprache, kein Jargon

### [2 SP] Einstellungen
- Profil (Name, E-Mail)
- Dummy-Seite für spätere Erweiterungen

## Milestone v0.2 — Grundstückscheck

### [8 SP] Grundstückscheck — API-Integration
- ALKIS WFS MV abfragen (Flurstück-Lookup)
- Bauleitplan WFS MV (räumliche Verschneidung: liegt B-Plan vor?)
- XPlanung WFS (Festsetzungen wenn digital vorhanden)
- PDF-Fallback: Claude API parst B-Plan PDF

### [5 SP] §34/35 KI-Analyse
- Claude API mit §34/35 BauGB + BVerwG-Leitsätzen als System-Prompt
- ALKIS-Umgebungsanalyse (150m Radius, Bestandsgebäude)
- Strukturierter Report-Output

### [3 SP] Grundstückscheck — UI
- `/grundstueckscheck` — Eingabemaske + Report-Anzeige
- Report speicherbar + einem Projekt zuweisbar

## Milestone v0.3 — Behörden-Portal
- Bauamt-Login (role: behoerde)
- Antragsansicht: alle eingereichten Projekte sortiert
- Rückmeldung: Vollständig / Nachforderung + Notiz
- One-Click-Einreichung vom Planer ans Bauamt

## Technische Notizen
- Supabase Storage Bucket "documents" anlegen für Datei-Uploads
- E-Mail für Magic Links: Supabase SMTP oder Resend
- Deployment: IONOS VPS via GitHub Actions (analog WMS OS)
- Keine eigene Auth-UI nötig — Supabase Magic Link reicht für MVP
