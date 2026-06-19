import { create } from 'zustand'

function getSaved(): boolean {
  try { return localStorage.getItem('theme') === 'dark' } catch { return false }
}

function apply(dark: boolean) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  try { localStorage.setItem('theme', dark ? 'dark' : 'light') } catch {}
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
