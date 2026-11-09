import { registerPlugin } from '@capacitor/core'
import { IS_APP, PLATFORM } from './platform'

// ─────────────────────────────────────────────────────────────────────────────
// Системные полосы Android по теме приложения
//
// Тема кабинета своя (themeStore пишет <html data-theme>). Плагин SystemChrome
// (android/…/SystemChromePlugin.java) красит фон под статус-баром и полосой
// навигации в фон приложения и ставит иконки под тему — как NativeGlass
// .setAppearance на iOS. Только в установленном приложении на Android.
// ─────────────────────────────────────────────────────────────────────────────

const SystemChrome = registerPlugin<{ setAppearance(o: { dark: boolean }): Promise<void> }>('SystemChrome')

let started = false

export function initAndroidChrome(): void {
  if (started || PLATFORM !== 'android' || !IS_APP || typeof document === 'undefined') return
  started = true
  const root = document.documentElement
  let last: boolean | null = null
  const push = () => {
    const dark = root.getAttribute('data-theme') === 'dark'
    if (dark === last) return
    last = dark
    void SystemChrome.setAppearance({ dark }).catch(() => {})
  }
  push()
  new MutationObserver(push).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
}
