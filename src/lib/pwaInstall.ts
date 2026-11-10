// PWA install plumbing. Captures Android/Chrome's `beforeinstallprompt` as early
// as possible (the event fires once, so we must not miss it) and exposes helpers
// the InstallPrompt banner uses. iOS has no such event — there we show a manual
// "Add to Home Screen" tutorial instead.

import { Capacitor } from '@capacitor/core'

type BIPEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BIPEvent | null = null
const listeners = new Set<() => void>()

function emit() { listeners.forEach(l => { try { l() } catch { /**/ } }) }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()          // suppress the mini-infobar; we drive our own UI
    deferred = e as BIPEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    try { localStorage.setItem('pwa_installed', '1') } catch { /**/ }
    emit()
  })
}

export function subscribeInstall(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}

// Manual re-trigger: the install banner is dismissable, so once closed the user
// needs a way to bring it back (a row in Profile). This asks the mounted
// InstallPrompt to show itself again, overriding the "dismissed" flag.
const SHOW_EVENT = 'pwa:show-install'
export function requestShowInstall() {
  try { window.dispatchEvent(new Event(SHOW_EVENT)) } catch { /**/ }
}
export function subscribeShowInstall(cb: () => void): () => void {
  window.addEventListener(SHOW_EVENT, cb)
  return () => window.removeEventListener(SHOW_EVENT, cb)
}

export function hasInstallPrompt(): boolean { return deferred !== null }

/** Trigger the native Android/Chrome install dialog. Returns true if accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  try {
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    emit()
    return outcome === 'accepted'
  } catch {
    return false
  }
}

export function isStandalone(): boolean {
  // Приложение Capacitor уже установлено, но WKWebView не отвечает ни на
  // display-mode, ни на navigator.standalone — без этой строки внутри
  // приложения выезжал щит «Добавьте на экран „Домой“».
  if (Capacitor.isNativePlatform()) return true
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
  } catch { return false }
}

export type Platform = 'ios' | 'android' | 'other'
export function getPlatform(): Platform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

// ── Что умеет этот браузер ──────────────────────────────────────────────────
// Лист установки показывает одно главное действие, а какое — решает браузер:
//   native      — Chrome/Edge поймали beforeinstallprompt: кнопка «Установить»
//                 вызывает системное окно;
//   manual      — Safari на iPhone/iPad/Mac: шаги «Поделиться → На экран
//                 „Домой“» (своего API у Apple нет);
//   unsupported — встроенные браузеры (Telegram, Instagram, Facebook, VK) и
//                 Firefox на Android: поставить нельзя, просим открыть в
//                 Safari / Chrome.
// Уже установлено (isStandalone) — ни листа, ни строки в профиле; это решает
// вызывающий код до вопроса о поддержке.

export type InstallSupport = 'native' | 'manual' | 'unsupported'

/** Встроенный браузер мессенджера или соцсети: «На экран Домой» там нет. */
export function isInAppBrowser(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  return /Telegram|Instagram|FBAN|FBAV|FB_IAB|VKClient|Line\//i.test(ua)
}

export function installSupport(canPrompt = hasInstallPrompt()): InstallSupport {
  if (canPrompt) return 'native'
  if (isInAppBrowser()) return 'unsupported'
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/android/i.test(ua) && /firefox/i.test(ua)) return 'unsupported'
  return getPlatform() === 'ios' || /Macintosh.*Safari/i.test(ua) ? 'manual' : 'unsupported'
}

/**
 * Safari 26 на iPhone убрал «Поделиться» из нижней панели в меню «•••» справа
 * внизу (Safari сам показывает об этом подсказку). Версию iOS в строке
 * браузера Apple заморозила на 18_x, поэтому смотрим версию Safari
 * («Version/26.0»). На iPad «Поделиться» осталась вверху справа.
 */
export function shareInMoreMenu(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const v = ua.match(/Version\/(\d+)/)
  return /iPhone|iPod/.test(ua) && !!v && Number(v[1]) >= 26
}
