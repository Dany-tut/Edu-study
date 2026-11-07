import { create } from 'zustand'

// ── Какая тема ───────────────────────────────────────────────────────────────
// Выбор человека (ручное переключение) хранится в localStorage 'theme' и всегда
// главнее. Пока выбора нет — тема системы, и при её смене кабинет следует за
// ней (решение Дани, 07.11.2026). Тот же порядок — во встроенном скрипте
// index.html, который ставит тему до первой отрисовки.
//
// Раньше старт без выбора сразу ЗАПИСЫВАЛ 'light' — у всех, кто уже заходил,
// ключ есть, и для них ничего не меняется: правило касается новых установок
// и очищенного хранилища. Чужой ключ не трогаем.

function savedChoice(): 'dark' | 'light' | null {
  try {
    const v = localStorage.getItem('theme')
    return v === 'dark' || v === 'light' ? v : null
  } catch { return null }
}

const systemQuery: MediaQueryList | null =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null

function systemDark(): boolean {
  return !!systemQuery?.matches
}

// Подмена темы должна пройти одним кадром. Пока у тела был собственный переход
// фона, фон догонял карточки, перекрашенные в том же кадре, — и четверть
// секунды экран выглядел разрезанным на светлую и тёмную половины. Атрибут
// глушит цветовые переходы всего документа на время подмены (index.css).
let shiftTimer: ReturnType<typeof setTimeout> | null = null
function freezeColorTransitions() {
  const root = document.documentElement
  root.setAttribute('data-theme-shift', '')
  if (shiftTimer) clearTimeout(shiftTimer)
  // Снимаем, когда кадр с новой темой уже отрисован. Не rAF: в вебвью PWA он
  // приходит не всегда, а зависший атрибут отключил бы переходы насовсем.
  shiftTimer = setTimeout(() => root.removeAttribute('data-theme-shift'), 140)
}

function apply(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  // Keep Safari's status/address-bar tint EXACTLY equal to the app's current bg
  // (follows the in-app toggle, not the OS) so the bars blend — no visible band.
  try {
    const bg = dark ? '#111113' : '#F5F5F6'
    let meta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', bg)
  } catch {}
}

/** Ручной выбор — запоминаем. */
function remember(dark: boolean) {
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
}

// Apply before first render to avoid flash (index.html already set it the same way)
const _saved = savedChoice()
const _initial = _saved ? _saved === 'dark' : systemDark()
apply(_initial)

interface ThemeStore {
  dark: boolean
  toggle: () => void
}

export const useTheme = create<ThemeStore>((set) => ({
  dark: _initial,
  toggle: () => set(s => {
    const next = !s.dark
    freezeColorTransitions()
    apply(next)
    remember(next)
    return { dark: next }
  }),
}))

// Пока человек не выбрал тему сам — следуем за системой.
systemQuery?.addEventListener?.('change', e => {
  if (savedChoice()) return
  if (useTheme.getState().dark === e.matches) return
  freezeColorTransitions()
  apply(e.matches)
  useTheme.setState({ dark: e.matches })
})
