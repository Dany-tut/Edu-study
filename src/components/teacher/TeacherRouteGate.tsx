import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { checkStaffAccess } from '../../lib/staffAccess'
import { useAsyncTask } from '../../lib/useAsyncTask'
import { useNativeOverlay } from '../../lib/nativeGlass'
import { useT } from '../../lib/i18n'
import TeacherLoginPage from '../../pages/teacher/TeacherLoginPage'
import ScrollFade from '../ScrollFade'

function accessScope(session: Session | null | undefined) {
  if (!session) return ''
  let sessionId: unknown
  try {
    const payload = session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    sessionId = JSON.parse(atob(payload)).session_id
  } catch { /* A legacy/opaque token is fenced on every rotation. */ }
  return JSON.stringify([session.user.id, typeof sessionId === 'string' && sessionId ? sessionId : session.access_token, session.user.app_metadata?.role ?? null])
}

// Last server verdict per account on this device. Only a hint for what to
// render while the authoritative check runs; data stays behind RLS.
const STAFF_HINT_KEY = 'iskra.staffHint'
function readStaffHint(user: string) {
  try { return localStorage.getItem(STAFF_HINT_KEY) === user } catch { return false }
}
function writeStaffHint(user: string, staff: boolean) {
  try {
    if (staff) localStorage.setItem(STAFF_HINT_KEY, user)
    else if (localStorage.getItem(STAFF_HINT_KEY) === user) localStorage.removeItem(STAFF_HINT_KEY)
  } catch { /* Storage blocked: fall back to the fenced check. */ }
}

/** Server-assigned role or an earlier positive check: open the cabinet at once. */
function likelyStaff(session: Session | null | undefined) {
  if (!session) return false
  const role = session.user.app_metadata?.role
  return role === 'teacher' || role === 'admin' || readStaffHint(session.user.id)
}

export default function TeacherRouteGate({ session, children }: { session: Session | null | undefined; children: ReactNode }) {
  const t = useT()
  const scope = accessScope(session)
  const token = session?.access_token ?? ''
  const [granted, setGranted] = useState<string | null>(null)
  const [suspended, setSuspended] = useState<string | null>(null)
  const [result, setResult] = useState<{ scope: string; token: string; status: 'loading' | 'allowed' | 'denied' | 'error' } | null>(null)
  const [retry, setRetry] = useState(0)
  const { run, cancel } = useAsyncTask()
  const current = result?.scope === scope && result.token === token ? result : null
  const user = session?.user.id ?? ''
  // A likely teacher sees the cabinet during the check; a "no" still closes it.
  const optimistic = !!scope && likelyStaff(session) && current?.status !== 'denied'
  const allowed = !!scope && (granted === scope || optimistic)
  const blockedDraft = allowed && suspended === scope
  const recovery = useRef<HTMLDivElement>(null)
  useNativeOverlay(blockedDraft)

  useEffect(() => {
    setGranted(previous => previous === scope ? previous : null)
    setSuspended(previous => previous === scope ? previous : null)
    if (!scope) { setResult(null); return }
    setResult({ scope, token, status: 'loading' })
    void run(signal => checkStaffAccess(supabase, signal), staff => {
      writeStaffHint(user, staff)
      setGranted(staff ? scope : null)
      setSuspended(null)
      setResult({ scope, token, status: staff ? 'allowed' : 'denied' })
    }, () => { setSuspended(scope); setResult({ scope, token, status: 'error' }) })
    return cancel
  }, [scope, token, user, retry, run, cancel])

  // Portalled dialogs are outside the hidden workspace DOM. Block those roots
  // too while keeping their React state, then restore their original inertness.
  useLayoutEffect(() => {
    if (!blockedDraft || !recovery.current) return
    const appRoot = [...document.body.children].find(node => node.contains(recovery.current))
    const originals = new Map<HTMLElement, { inert: boolean; display: string; priority: string }>()
    const block = () => {
      for (const node of document.body.children) {
        if (!(node instanceof HTMLElement) || node === appRoot) continue
        if (!originals.has(node)) {
          originals.set(node, { inert: node.inert, display: node.style.getPropertyValue('display'), priority: node.style.getPropertyPriority('display') })
          observer.observe(node, { attributes: true, attributeFilter: ['style', 'inert'] })
        }
        if (!node.inert) node.inert = true
        if (node.style.getPropertyValue('display') !== 'none' || node.style.getPropertyPriority('display') !== 'important') node.style.setProperty('display', 'none', 'important')
      }
    }
    const observer = new MutationObserver(block)
    block()
    observer.observe(document.body, { childList: true })
    return () => { observer.disconnect(); originals.forEach((original, node) => {
      node.inert = original.inert
      if (original.display) node.style.setProperty('display', original.display, original.priority)
      else node.style.removeProperty('display')
    }) }
  }, [blockedDraft])

  const login = (accessNotice?: 'denied' | 'error') => <TeacherLoginPage accessNotice={accessNotice}
    onRetryAccess={() => setRetry(value => value + 1)} onLogin={() => setRetry(value => value + 1)} />
  if (session === null) return login()
  // A changed user/session/role is fenced during render, before effects run.
  if (!allowed && (session === undefined || !current || current.status === 'loading')) {
    return <ScrollFade maxHeight="100dvh" style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)' }}>
      <div className="auth-page-layout" style={{ minHeight: '100dvh' }}>
        <p role="status" style={{ color: 'var(--color-muted)', fontSize: 15 }}>{t('Проверяем доступ…')}</p>
      </div>
    </ScrollFade>
  }
  return <>
    {allowed && <div key={user} inert={blockedDraft} style={{ display: blockedDraft ? 'none' : 'contents' }}>{children}</div>}
    {blockedDraft && <div ref={recovery}>
      <ScrollFade maxHeight="100dvh" style={{ position: 'fixed', inset: 0, background: 'var(--color-bg)' }}>
        <div className="auth-page-layout" style={{ minHeight: '100dvh' }}><div className="auth-page-content auth-page-card">
          <p role="status" style={{ color: 'var(--color-text)', fontSize: 15 }}>{t(current?.status === 'loading' ? 'Проверяем доступ…' : 'Не удалось проверить доступ')}</p>
          <p style={{ color: 'var(--color-muted)', fontSize: 14 }}>{t('Повторите проверку доступа, чтобы продолжить работу.')}</p>
          <button type="button" disabled={current?.status === 'loading'} aria-busy={current?.status === 'loading'}
            onClick={() => setRetry(value => value + 1)}
            style={{ width: '100%', minHeight: 44, padding: 12, border: 0, borderRadius: 14, background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {t('Проверить доступ ещё раз')}
          </button>
        </div></div>
      </ScrollFade>
    </div>}
    {!allowed && <div ref={recovery}>{login(current?.status === 'denied' ? 'denied' : 'error')}</div>}
  </>
}
