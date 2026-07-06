// PWA install plumbing. Captures Android/Chrome's `beforeinstallprompt` as early
// as possible (the event fires once, so we must not miss it) and exposes helpers
// the InstallPrompt banner uses. iOS has no such event — there we show a manual
// "Add to Home Screen" tutorial instead.

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
