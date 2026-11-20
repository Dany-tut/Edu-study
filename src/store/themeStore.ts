import { create } from 'zustand'
import { setThemeColor } from '../lib/themeColor'

function getSaved(): boolean {
  try { return localStorage.getItem('theme') === 'dark' } catch { return false }
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
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
  // Панели Safari — в цвет фона Искры (следует переключателю, а не теме ОС).
  setThemeColor(dark ? '#111113' : '#F5F5F6')
}

// Apply before first render to avoid flash
const _initial = getSaved()
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
    return { dark: next }
  }),
}))
