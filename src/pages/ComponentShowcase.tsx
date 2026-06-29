// ─────────────────────────────────────────────────────────────────────────
// TEMPORARY UI-kit witrine for the portfolio case study (slides 10 / 16).
// Route: #/showcase  — renders every design-system primitive in one frame so
// it can be screenshotted as a clean kit board in both light and dark themes.
// There is no Storybook in this project; this is the throwaway substitute.
// DELETE this file and its route in App.tsx after capturing the screenshots.
// ─────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  BookOpen, FlaskConical, FileText, Trash2,
  Settings, Sparkles, Star, Megaphone, Hash,
} from 'lucide-react'
import {
  pill, cardChipTone, tile, ctaBtn, ctaGradBtn, softBtn, GRAD, PAIR,
} from '../lib/pillStyles'
import type { PillTone } from '../lib/pillStyles'
import TeacherSaveButton, { SAVE_ACCENTS } from '../components/teacher/TeacherSaveButton'

const TONES = Object.keys(PAIR) as PillTone[]

const TILE_ICONS: Record<PillTone, typeof BookOpen> = {
  purple: BookOpen, green: FlaskConical, peach: FileText, red: Trash2,
  blue: Settings, teal: Sparkles, yellow: Star, rose: Megaphone, neutral: Hash,
}

const codeStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 12, padding: '1px 6px', borderRadius: 6,
  background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
} as const

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
        <span style={{ color: 'var(--color-muted)', fontWeight: 500 }}>{n} · </span>{title}
      </h2>
      {hint
        ? <p style={{ fontSize: 12.5, color: 'var(--color-muted)', margin: '5px 0 16px', maxWidth: 580, lineHeight: 1.5 }}>{hint}</p>
        : <div style={{ height: 16 }} />}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>{children}</div>
    </section>
  )
}

export default function ComponentShowcase() {
  const [saved, setSaved] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  const toggleTheme = () => {
    const next = !dark
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
    setDark(next)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: '48px 32px' }}>
      <div style={{ maxWidth: 940, margin: '0 auto' }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.4 }}>UI-kit · дизайн-система</h1>
            <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: '7px 0 0' }}>
              Единый источник <code style={codeStyle}>pillStyles.ts</code> · база #786AD7 · CSS-переменные → light/dark
            </p>
          </div>
          <button onClick={toggleTheme} style={softBtn}>{dark ? 'Светлая тема' : 'Тёмная тема'}</button>
        </header>

        <div style={{ height: 1, background: 'var(--color-border)', margin: '26px 0 38px' }} />

        <Section n={1} title="Flat Pills" hint="Плоские пары { bg + text } — 90% случаев: пилюли, бейджи, табы, строки. Девять семантических тонов из одной карты PAIR.">
          {TONES.map(t => <span key={t} style={pill(t)}>{t}</span>)}
        </Section>

        <Section n={2} title="Card Chips — контракт" hint="Фон чипа выводится из цвета его текста при фиксированной непрозрачности 20% (CHIP_FILL). Любой тон читается одинаково «плотно» — меняется только hue, и это семантический сигнал, а не декор.">
          {TONES.map(t => <span key={t} style={cardChipTone(t)}>{t}</span>)}
        </Section>

        <Section n={3} title="Tiles" hint="Квадратные иконо-плитки 40×40 на том же PAIR-токене.">
          {TONES.map(t => {
            const Icon = TILE_ICONS[t]
            return <div key={t} style={tile(t, 40)}><Icon size={19} /></div>
          })}
        </Section>

        <Section n={4} title="CTA-кнопки" hint="Три уровня акцента из одного источника: solid → gradient → soft.">
          <button style={ctaBtn}>Solid · ctaBtn</button>
          <button style={ctaGradBtn}>Gradient · ctaGradBtn</button>
          <button style={softBtn}>Soft · softBtn</button>
        </Section>

        <Section n={5} title="Градиенты" hint="GRAD — живые заливки для CTA, акцентных карточек и прогресс-баров.">
          {(['purple', 'green', 'red', 'blue', 'teal'] as const).map(g => (
            <div key={g} style={{ width: 122, height: 48, borderRadius: 12, background: GRAD[g], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{g}</div>
          ))}
        </Section>

        <Section n={6} title="TeacherSaveButton" hint="Одна канонная кнопка «Сохранить» — общая форма и поведение, акцент по контексту (purple / trainer / widget). Анимированный свап в зелёную галку при saved.">
          <TeacherSaveButton label="Сохранить" saved={saved} onClick={() => setSaved(s => !s)} />
          <TeacherSaveButton label="Сохранить" accent={SAVE_ACCENTS.trainer} />
          <TeacherSaveButton label="Сохранить" accent={SAVE_ACCENTS.widget} />
          <TeacherSaveButton label="Сохранить" disabled />
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>← клик по первой переключает saved-состояние</span>
        </Section>
      </div>
    </div>
  )
}
