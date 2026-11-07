// Стенд 3D-моделей конспекта (dev-models.html).
//
// Сверху панель: предмет, модель и тема. Выбор живёт в адресе (?ref=…, ?bio,
// ?chem), так что ссылку на конкретную модель можно прислать; тема
// запоминается в браузере и по умолчанию тёмная — на стенде сидят подолгу.
// Без выбранной модели — все образцы подряд, как они встанут в колонку
// конспекта (680 px).
import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Model3DFigure from './components/Model3DFigure'
import { MODEL_PRESETS } from './lib/models3d/registry'
import './index.css'

type Subject = 'all' | 'bio' | 'chem'
const THEME_KEY = 'dev-models-theme'

function readTheme(): 'dark' | 'light' {
  const q = new URLSearchParams(location.search)
  if (q.has('dark')) return 'dark'
  if (q.has('light')) return 'light'
  try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark' } catch { return 'dark' }
}

function readState(): { subject: Subject; ref: string | null } {
  const q = new URLSearchParams(location.search)
  return { subject: q.has('bio') ? 'bio' : q.has('chem') ? 'chem' : 'all', ref: q.get('ref') }
}

function writeUrl(subject: Subject, ref: string | null) {
  const q = new URLSearchParams()
  if (subject !== 'all') q.set(subject, '')
  if (ref) q.set('ref', ref)
  const s = q.toString().replace(/=(&|$)/g, '$1')
  history.replaceState(null, '', s ? `?${s}` : location.pathname)
}

const chip = (on: boolean): React.CSSProperties => ({
  padding: 'calc(6px - 0.06em) 12px calc(6px + 0.06em)', borderRadius: 999, fontSize: 12.5, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer',
  whiteSpace: 'nowrap', lineHeight: 1,
  border: `1px solid ${on ? '#786AD7' : 'transparent'}`,
  background: on ? 'color-mix(in srgb, #786AD7 16%, var(--color-bg-4))' : 'var(--color-bg-4)',
  color: on ? '#9A8EEA' : 'var(--color-text)',
})

function Stand() {
  const [theme, setTheme] = useState(readTheme)
  const [{ subject, ref }, setSel] = useState(readState)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* приватное окно */ }
  }, [theme])
  useEffect(() => { writeUrl(subject, ref) }, [subject, ref])

  const list = useMemo(() => MODEL_PRESETS.filter(p => subject === 'all' || p.subject === subject), [subject])
  const refs = ref ? [ref] : list.map(p => p.ref)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '12px 24px',
        background: 'color-mix(in srgb, var(--color-bg) 88%, transparent)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border-soft)', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 14, marginRight: 6 }}>3D-модели · стенд</b>
          {(['all', 'bio', 'chem'] as const).map(s => (
            <button key={s} type="button" style={chip(subject === s)} onClick={() => setSel({ subject: s, ref: null })}>
              {s === 'all' ? 'Все' : s === 'bio' ? 'Биология' : 'Химия'}
            </button>
          ))}
          <button type="button" style={{ ...chip(false), marginLeft: 'auto' }} onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button type="button" style={chip(ref === null)} onClick={() => setSel(v => ({ ...v, ref: null }))}>Все подряд</button>
          {list.map(p => (
            <button key={p.ref} type="button" style={chip(ref === p.ref)} onClick={() => setSel(v => ({ ...v, ref: p.ref }))}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: 24, maxWidth: 'calc(74vh * 16 / 9)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
        {refs.map(r => <Model3DFigure key={r} src={r} caption={`Маркер в конспекте: \`![подпись](${r})\``} />)}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
