// Lightweight behavioural telemetry beacon. Automatic — no consent gate.
// Records ids + behaviour only (no names/emails/PII). RLS enforces admin-only read.
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'

type Identity = { user_id: string | null; student_id: string | null; role: string }

type PendingEvent = {
  event: string
  path: string | null
  meta: Record<string, unknown>
  created_at: string
}

const SESSION_KEY = 'analytics_session'
const FLUSH_INTERVAL = 10_000
const HEARTBEAT_INTERVAL = 60_000
const MAX_BUFFER = 25

let sessionId = ''
let identity: Identity = { user_id: null, student_id: null, role: 'anon' }
let buffer: PendingEvent[] = []
let started = false

// dwell tracking
let dwellPath = ''
let dwellStart = 0

function uuid(): string {
  try { return crypto.randomUUID() } catch { /**/ }
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function getSessionId(): string {
  if (sessionId) return sessionId
  try {
    const existing = sessionStorage.getItem(SESSION_KEY)
    if (existing) { sessionId = existing; return sessionId }
    sessionId = uuid()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  } catch { sessionId = uuid() }
  return sessionId
}

async function resolveIdentity() {
  const student = getStudentSession()
  if (student) {
    identity = { user_id: null, student_id: student.id, role: 'student' }
    return
  }
  try {
    const { data } = await supabase.auth.getUser()
    const u = data.user
    if (u) {
      const role = u.user_metadata?.role === 'admin' ? 'admin' : 'teacher'
      identity = { user_id: u.id, student_id: null, role }
      return
    }
  } catch { /**/ }
  identity = { user_id: null, student_id: null, role: 'anon' }
}

async function flush() {
  if (buffer.length === 0) return
  const batch = buffer
  buffer = []
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : null
  const rows = batch.map(e => ({
    created_at: e.created_at,
    user_id: identity.user_id,
    student_id: identity.student_id,
    role: identity.role,
    session_id: getSessionId(),
    event: e.event,
    path: e.path,
    meta: e.meta,
    ua,
  }))
  try {
    const { error } = await supabase.from('analytics_events').insert(rows)
    if (error) buffer.unshift(...batch)
  } catch { buffer.unshift(...batch) }
}

export function trackEvent(event: string, meta: Record<string, unknown> = {}, path?: string) {
  buffer.push({
    event,
    path: path ?? (typeof location !== 'undefined' ? location.hash || location.pathname : null),
    meta,
    created_at: new Date().toISOString(),
  })
  if (buffer.length >= MAX_BUFFER) void flush()
}

export function trackPageView(path: string, meta: Record<string, unknown> = {}) {
  trackEvent('page_view', meta, path)
}

let lastPath = ''
/** Call on every route change — records dwell time for the previous page. */
export function trackPath(path: string, meta: Record<string, unknown> = {}) {
  if (path === lastPath) return

  // flush dwell for previous page
  if (dwellPath && dwellStart) {
    const ms = Date.now() - dwellStart
    trackEvent('page_leave', { dwell_ms: ms }, dwellPath)
  }

  lastPath = path
  dwellPath = path
  dwellStart = Date.now()
  trackPageView(path, meta)
}

function installErrorTracking() {
  // JS runtime errors
  window.addEventListener('error', (e) => {
    trackEvent('js_error', {
      msg: String(e.message ?? '').slice(0, 200),
      src: String(e.filename ?? '').replace(location.origin, '').slice(0, 120),
      line: e.lineno,
      col: e.colno,
    })
    void flush()
  })

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason
    const msg = reason instanceof Error
      ? reason.message
      : (typeof reason === 'string' ? reason : JSON.stringify(reason))
    trackEvent('promise_rejection', {
      msg: String(msg ?? '').slice(0, 200),
    })
    void flush()
  })
}

function installClickTracking() {
  // Normalised click coordinates per screen — feeds the spatial heatmaps.
  // Records only viewport-relative fractions (0..1) + viewport size; no target
  // identity, no PII. Aggregated into a density grid server-side.
  document.addEventListener('click', (e) => {
    const w = window.innerWidth, h = window.innerHeight
    if (!w || !h) return
    const xr = Math.min(1, Math.max(0, e.clientX / w))
    const yr = Math.min(1, Math.max(0, e.clientY / h))
    trackEvent('click', {
      xr: Math.round(xr * 1000) / 1000,
      yr: Math.round(yr * 1000) / 1000,
      w, h,
    })
  }, { passive: true })
}

function installRageClickTracking() {
  // 4+ clicks on the same element within 800ms = rage click (user frustration signal)
  let clicks: number[] = []
  let lastTarget: EventTarget | null = null
  document.addEventListener('click', (e) => {
    const now = Date.now()
    if (e.target !== lastTarget) { clicks = []; lastTarget = e.target }
    clicks = clicks.filter(t => now - t < 800)
    clicks.push(now)
    if (clicks.length >= 4) {
      const el = e.target as HTMLElement
      trackEvent('rage_click', {
        tag: el.tagName?.toLowerCase(),
        text: el.innerText?.slice(0, 60),
        cls: el.className?.toString().slice(0, 80),
      })
      clicks = []
      void flush()
    }
  }, { passive: true })
}

export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  started = true
  getSessionId()

  void resolveIdentity().then(() => {
    trackEvent('session_start', {
      ref: document.referrer || null,
      w: window.innerWidth,
      h: window.innerHeight,
    })
    void flush()
  })

  supabase.auth.onAuthStateChange(() => { void resolveIdentity() })

  setInterval(() => void flush(), FLUSH_INTERVAL)
  setInterval(() => { trackEvent('heartbeat') }, HEARTBEAT_INTERVAL)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (dwellPath && dwellStart) {
        trackEvent('page_leave', { dwell_ms: Date.now() - dwellStart }, dwellPath)
        dwellStart = 0
      }
      void flush()
    } else {
      dwellStart = Date.now()
    }
  })
  window.addEventListener('pagehide', () => { void flush() })

  installErrorTracking()
  installRageClickTracking()
  installClickTracking()
}
