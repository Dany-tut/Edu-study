import { create } from 'zustand'

function getSaved(): boolean {
  try { return localStorage.getItem('theme') === 'dark' } catch { return false }
}

function apply(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
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
    apply(next)
    return { dark: next }
  }),
}))
