-- Bauline — Initial Schema
-- Planungsbüro-Software für Nora Hohls

-- Profiles (extended auth.users)
CREATE TABLE public.profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email        text NOT NULL,
  full_name    text,
  role         text NOT NULL DEFAULT 'planer' CHECK (role IN ('planer', 'bauherr', 'behoerde')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Eigenes Profil lesen" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Eigenes Profil bearbeiten" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Clients (Bauherren — können per Magic Link eingeladen werden)
CREATE TABLE public.clients (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  email      text,
  phone      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planer sehen alle Clients" ON public.clients FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'planer')
);

-- Projects (Bauvorhaben)
CREATE TABLE public.projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  address         text,
  client_id       uuid REFERENCES public.clients,
  status          text NOT NULL DEFAULT 'aktiv' CHECK (status IN ('aktiv', 'eingereicht', 'genehmigt', 'archiviert')),
  -- Planungsrechtliche Parameter (bestimmen die Checkliste)
  building_type   text NOT NULL DEFAULT 'neubau' CHECK (building_type IN ('neubau', 'umbau', 'anbau', 'nutzungsaenderung')),
  building_class  int CHECK (building_class BETWEEN 1 AND 5),
  is_sonderbau    boolean NOT NULL DEFAULT false,
  is_denkmal      boolean NOT NULL DEFAULT false,
  is_aussenbereich boolean NOT NULL DEFAULT false,
  is_kuestenzone  boolean NOT NULL DEFAULT false,
  no_public_sewer boolean NOT NULL DEFAULT false,
  -- Grundstück
  flurstueck_nr   text,
  grundstueck_m2  numeric,
  -- Notizen
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planer sehen alle Projekte" ON public.projects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('planer', 'behoerde'))
);
CREATE POLICY "Bauherr sieht eigene Projekte" ON public.projects FOR SELECT USING (
  client_id IN (
    SELECT c.id FROM public.clients c
    JOIN public.profiles p ON p.email = c.email
    WHERE p.id = auth.uid()
  )
);

-- Checklist items (dynamisch generiert + manuell ergänzbar)
CREATE TABLE public.checklist_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  title           text NOT NULL,
  category        text NOT NULL CHECK (category IN ('antrag', 'zeichnungen', 'berechnungen', 'nachweise', 'bauherr', 'fachplaner', 'behoerde')),
  responsible     text NOT NULL DEFAULT 'planer' CHECK (responsible IN ('planer', 'bauherr', 'fachplaner')),
  fachplaner_name text,  -- z.B. "Statiker", "Energieberater"
  status          text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'in_arbeit', 'eingereicht', 'geprueft', 'nachbesserung')),
  notes           text,
  file_url        text,
  file_name       text,
  due_date        date,
  is_required     boolean NOT NULL DEFAULT true,  -- false = optional/bedingt
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planer/Behoerde sehen alle Items" ON public.checklist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('planer', 'behoerde'))
);
CREATE POLICY "Bauherr sieht eigene Items" ON public.checklist_items FOR SELECT USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.clients c ON p.client_id = c.id
    JOIN public.profiles pr ON pr.email = c.email
    WHERE pr.id = auth.uid()
  )
);
CREATE POLICY "Bauherr kann eigene Items updaten" ON public.checklist_items FOR UPDATE USING (
  responsible = 'bauherr' AND project_id IN (
    SELECT p.id FROM public.projects p
    JOIN public.clients c ON p.client_id = c.id
    JOIN public.profiles pr ON pr.email = c.email
    WHERE pr.id = auth.uid()
  )
);

-- Grundstueckschecks (LP1 — gespeicherte Analysen)
CREATE TABLE public.grundstueck_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES public.projects ON DELETE SET NULL,
  address         text NOT NULL,
  flurstueck_nr   text,
  grundstueck_m2  numeric,
  -- Planungsrecht
  planungsrecht   text CHECK (planungsrecht IN ('bplan', 'paragraph_34', 'paragraph_35', 'unbekannt')),
  bplan_name      text,
  bplan_pdf_url   text,
  -- Festsetzungen (aus B-Plan oder §34-Analyse)
  nutzungsart     text,  -- WA, WR, MI, GE, etc.
  grz             numeric,
  gfz             numeric,
  vollgeschosse   int,
  bauweise        text,
  -- Berechnungen
  max_grundflaeche numeric,  -- GRZ * Grundstücksfläche
  max_geschossflaeche numeric,
  -- KI-Analyse
  ki_einschaetzung text,
  ki_warnungen    text[],
  -- Raw API responses
  raw_bplan       jsonb,
  raw_alkis       jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grundstueck_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Planer sehen alle Checks" ON public.grundstueck_checks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'planer')
);

-- Trigger: updated_at automatisch setzen
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER checklist_items_updated_at BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Profile automatisch anlegen wenn User sich registriert
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
