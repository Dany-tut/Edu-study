import { Capacitor, registerPlugin } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { clearStudentSession } from './studentSession'
import { signOutAndReload } from './signOutAndReload'

/**
 * Блокировка приложения iOS кодом из 4 цифр и Face ID. Экран, код (хеш в
 * Keychain) и шторка — нативные (ios/App/App/AppLock.swift); отсюда только
 * включить/выключить из профиля и выйти из аккаунта по «Забыли код».
 */
export type AppLockState = { enabled: boolean; biometry: 'Face ID' | 'Touch ID' | null; useBiometrics: boolean }

type Plugin = {
  status(): Promise<AppLockState>
  setup(): Promise<AppLockState>
  disable(): Promise<AppLockState>
  setBiometrics(options: { on: boolean }): Promise<AppLockState>
  addListener(event: 'forgot', fn: () => void): Promise<{ remove(): Promise<void> }>
  addListener(event: 'change', fn: (state: AppLockState) => void): Promise<{ remove(): Promise<void> }>
}
const plugin = registerPlugin<Plugin>('IskraAppLock')

export const appLockSupported = () => Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('IskraAppLock')

let started = false
/** Один раз при запуске: «Забыли код» → выход; любой выход из аккаунта снимает блокировку. */
export function initAppLock() {
  if (started || !appLockSupported()) return
  started = true
  void plugin.addListener('forgot', () => {
    clearStudentSession()
    void signOutAndReload('#/entry')
  })
  supabase.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_OUT') void plugin.disable().catch(() => undefined)
  })
}

export function useAppLock() {
  const [state, setState] = useState<AppLockState | null>(null)
  useEffect(() => {
    if (!appLockSupported()) return
    let alive = true
    void plugin.status().then(s => { if (alive) setState(s) })
    const sub = plugin.addListener('change', s => { if (alive) setState(s) })
    return () => { alive = false; void sub.then(h => h.remove()) }
  }, [])
  const run = (call: Promise<AppLockState>) => call.then(s => { setState(s); return s })
  return {
    state,
    setup: () => run(plugin.setup()),
    disable: () => run(plugin.disable()),
    setBiometrics: (on: boolean) => run(plugin.setBiometrics({ on })),
  }
}
