import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/projekte')

  return (
    <div style={{ background: '#edf1f6', color: '#192838', minHeight: '100vh', fontFamily: "'Nunito Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Nunito+Sans:opsz,wght@6..12,300;6..12,400;6..12,600&display=swap');

        .bl-hero { min-height: 100vh; display: flex; flex-direction: column; }
        .bl-nav { display: flex; align-items: center; justify-content: space-between; padding: 32px 48px; }
        .bl-logo { font-family: 'Lora', serif; font-size: 18px; font-weight: 400; letter-spacing: 0.02em; color: #1a5276; }
        .bl-login-link { font-size: 12px; font-weight: 400; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(25,40,56,0.45); text-decoration: none; transition: opacity 0.2s; }
        .bl-login-link:hover { opacity: 0.6; }

        .bl-hero-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px 80px; }
        .bl-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #88aac0; margin-bottom: 28px; }
        .bl-headline { font-family: 'Lora', serif; font-size: clamp(36px, 6vw, 72px); font-weight: 400; line-height: 1.15; color: #192838; max-width: 820px; margin: 0 auto 28px; }
        .bl-headline em { font-style: italic; color: #1a5276; }
        .bl-sub { font-size: clamp(15px, 2vw, 18px); font-weight: 300; line-height: 1.8; color: rgba(25,40,56,0.55); max-width: 520px; margin: 0 auto 48px; }
        .bl-cta { display: inline-block; background: #1a5276; color: #edf1f6; font-size: 12px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; text-decoration: none; padding: 16px 40px; transition: background 0.2s; }
        .bl-cta:hover { background: #154360; }

        .bl-features { background: #f4f7fa; padding: 96px 24px; }
        .bl-features-inner { max-width: 960px; margin: 0 auto; }
        .bl-section-label { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: #88aac0; margin-bottom: 48px; text-align: center; }
        .bl-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2px; }
        .bl-feature { background: #edf1f6; padding: 48px 40px; }
        .bl-feature-num { font-family: 'Lora', serif; font-size: 13px; color: #88aac0; margin-bottom: 24px; display: block; }
        .bl-feature-title { font-family: 'Lora', serif; font-size: 22px; font-weight: 600; color: #192838; margin-bottom: 16px; }
        .bl-feature-desc { font-size: 14px; font-weight: 300; line-height: 1.85; color: rgba(25,40,56,0.55); }
        .bl-feature-badge { display: inline-block; margin-top: 20px; font-size: 10px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: #88aac0; background: rgba(136,170,192,0.12); padding: 4px 10px; }

        .bl-problem { padding: 96px 24px; }
        .bl-problem-inner { max-width: 720px; margin: 0 auto; }
        .bl-problem-text { font-family: 'Lora', serif; font-size: clamp(22px, 3vw, 32px); font-weight: 400; line-height: 1.65; color: #192838; }
        .bl-problem-text em { font-style: italic; color: rgba(25,40,56,0.4); }

        .bl-footer { padding: 40px 48px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(25,40,56,0.08); }
        .bl-footer-copy { font-size: 12px; font-weight: 300; color: rgba(25,40,56,0.35); }
        .bl-footer-by { font-size: 11px; font-weight: 300; color: rgba(25,40,56,0.3); letter-spacing: 0.04em; }

        @media (max-width: 600px) {
          .bl-nav { padding: 24px; }
          .bl-footer { padding: 32px 24px; flex-direction: column; gap: 12px; text-align: center; }
        }
      `}</style>

      {/* Nav */}
      <nav className="bl-nav">
        <span className="bl-logo">Bauline</span>
        <Link href="/auth/login" className="bl-login-link">Einloggen</Link>
      </nav>

      {/* Hero */}
      <div className="bl-hero-body">
        <p className="bl-eyebrow">Planungsbüro-Software · LP 1 – 4</p>
        <h1 className="bl-headline">
          Alle Unterlagen.<br />
          <em>Kein Chaos.</em>
        </h1>
        <p className="bl-sub">
          Bauline generiert aus deinen Projektparametern automatisch die vollständige
          Unterlagenliste für den Bauantrag — und koordiniert Bauherr und Fachplaner.
        </p>
        <Link href="/auth/login" className="bl-cta">Jetzt starten</Link>
      </div>

      {/* Problem */}
      <div className="bl-problem">
        <div className="bl-problem-inner">
          <p className="bl-section-label">Das Problem</p>
          <p className="bl-problem-text">
            LP4 ist 3% Honorar — aber gefühlt 30% der Arbeitszeit.
            Immer wieder dasselbe: Welche Unterlagen fehlen noch?
            Hat der Bauherr die Vollmacht geschickt? Brauchen wir für
            dieses Vorhaben einen Brandschutznachweis?{' '}
            <em>Bauline beantwortet das automatisch.</em>
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="bl-features">
        <div className="bl-features-inner">
          <p className="bl-section-label">Was Bauline kann</p>
          <div className="bl-grid">
            <div className="bl-feature">
              <span className="bl-feature-num">01</span>
              <p className="bl-feature-title">Dynamische Checkliste</p>
              <p className="bl-feature-desc">
                Projektparameter eingeben — Neubau, Sonderbau, Denkmal, Außenbereich.
                Bauline generiert sofort die passende Unterlagenliste nach LBauO MV.
              </p>
            </div>
            <div className="bl-feature">
              <span className="bl-feature-num">02</span>
              <p className="bl-feature-title">Bauherren-Portal</p>
              <p className="bl-feature-desc">
                Der Bauherr bekommt einen Magic Link — sieht nur seine Aufgaben,
                lädt Dokumente direkt hoch, kein Account nötig.
              </p>
            </div>
            <div className="bl-feature">
              <span className="bl-feature-num">03</span>
              <p className="bl-feature-title">Grundstückscheck</p>
              <p className="bl-feature-desc">
                Adresse eingeben, B-Plan-Daten aus dem WFS abrufen,
                §34/35-Analyse mit echten Geodaten — in Sekunden.
              </p>
              <span className="bl-feature-badge">Coming in v0.2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bl-footer">
        <span className="bl-footer-copy">© 2026 Bauline</span>
        <span className="bl-footer-by">a Winkel Studio product</span>
      </footer>
    </div>
  )
}
