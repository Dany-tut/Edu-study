// Lightweight behavioural telemetry beacon. Automatic — no consent gate.
// Records ids + behaviour only (no names/emails/PII). RLS enforces admin-only read.
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabase'
import { getStudentSession } from './studentSession'
import { getSessionUser } from './owner'

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

// Телеметрия дев-сборки — это разработчик, а не пользователь: свои же заходы
// раздували визиты («Конструктор», 224 визита), а ошибки инструментария вроде
// `process is not defined` из .vite/deps заняли 130 строк из 185 на вкладке
// «Проблемы». Дев-события не пишем вовсе; когда телеметрию нужно проверить
// локально — `localStorage.analytics_force = '1'` и перезагрузка.
const TELEMETRY_ON: boolean = !import.meta.env.DEV || (() => {
  try { return localStorage.getItem('analytics_force') === '1' } catch { return false }
})()

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
  // A live Supabase session (teacher/admin) wins over a legacy student_session —
  // otherwise a stale student_session left in localStorage from prior testing
  // mislabels every teacher/admin click as role='student'.
  try {
    // Сохранённая сессия, а не getUser(): телеметрии нужна подпись события, а
    // не проверка права, и платить за неё сетевым кругом на каждом входе
    // (в том числе ученическом) незачем — см. lib/owner.ts.
    const u = await getSessionUser()
    if (u) {
      // Respect the role stamped at sign-up (admin/student/teacher); default to
      // teacher for legacy sessions with no role metadata.
      const metaRole = u.user_metadata?.role
      const role = metaRole === 'admin' || metaRole === 'student' ? metaRole : 'teacher'
      identity = { user_id: u.id, student_id: metaRole === 'student' ? u.id : null, role }
      return
    }
  } catch { /**/ }
  const student = getStudentSession()
  if (student) {
    identity = { user_id: null, student_id: student.id, role: 'student' }
    return
  }
  identity = { user_id: null, student_id: null, role: 'anon' }
}

// Последняя пачка перед закрытием вкладки. Обычный запрос клиента браузер
// отменяет вместе со страницей, поэтому уходы (page_leave) до сервера почти не
// доезжали: на #/trainer/en/decks на 23 захода пришлось 2 записи ухода — и
// среднее время на экране считалось по ним, то есть по шуму. keepalive как раз
// про этот случай: запрос переживает выгрузку страницы. Ответ читать уже некому,
// поэтому пачку не возвращаем в очередь — иначе следующий запуск слал бы её
// заново поверх уже сохранённой (в базе от этого лежат парные дубли).
function flushFinal(rows: unknown[]) {
  try {
    void fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: 'POST',
      keepalive: true,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    })
  } catch { /* уходящей странице уже не помочь */ }
}

async function flush(final = false) {
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
  if (final) { flushFinal(rows); return }
  try {
    const { error } = await supabase.from('analytics_events').insert(rows)
    if (error) buffer.unshift(...batch)
  } catch { buffer.unshift(...batch) }
}

// Где мы сейчас — так же, как это понимает роутер. Корень без якоря — «#/»,
// а не «/»: иначе пульсы и ошибки с главной ложились отдельной строкой «/»,
// где ноль визитов (визит-то записан роутером как «#/»), и на вкладке
// «Проблемы» она выглядела страницей-призраком.
function currentPath(): string | null {
  if (typeof location === 'undefined') return null
  if (location.hash) return location.hash
  return location.pathname === '/' ? '#/' : location.pathname
}

export function trackEvent(event: string, meta: Record<string, unknown> = {}, path?: string) {
  // Единственная дверь для ВСЕХ событий: и автоматических, и бизнесовых
  // (trackNow на входе/выходе), поэтому дев-заслонка стоит здесь, а не только
  // в initAnalytics — иначе роутер и логин продолжали бы писать с localhost.
  if (!TELEMETRY_ON) return
  buffer.push({
    event,
    path: path ?? currentPath(),
    meta,
    created_at: new Date().toISOString(),
  })
  if (buffer.length >= MAX_BUFFER) void flush()
}

export function trackPageView(path: string, meta: Record<string, unknown> = {}) {
  trackEvent('page_view', meta, path)
}

/**
 * Track a business event and flush immediately. Use for actions that navigate
 * away or reload right after (login/logout/register) — a plain buffered
 * trackEvent would be lost before the next interval flush.
 */
export async function trackNow(event: string, meta: Record<string, unknown> = {}, path?: string) {
  trackEvent(event, meta, path)
  await flush()
}

// Уход короче секунды — не уход. Так выглядят две вещи, и ни одна из них не
// «пользователь ушёл»: цепочка редиректов при открытии экрана (адрес меняется
// дважды за миллисекунды) и мигание видимости на iOS — переключатель приложений
// шлёт hidden/visible по нескольку раз за анимацию. Их дважды-по-6-мс и давали
// «0 с на экране» там, где по пульсам человек сидел часами.
const MIN_DWELL_MS = 1000

/** Записать время на экране, если оно осмысленное. Обнуляет отсчёт. */
function recordDwell() {
  if (!dwellPath || !dwellStart) return
  const ms = Date.now() - dwellStart
  dwellStart = 0
  if (ms < MIN_DWELL_MS) return
  trackEvent('page_leave', { dwell_ms: ms }, dwellPath)
}

let lastPath = ''
/** Call on every route change — records dwell time for the previous page. */
export function trackPath(path: string, meta: Record<string, unknown> = {}) {
  if (path === lastPath) return
  // Якорь внутри страницы («#modes», «#tariffs» в навигации лендинга) — не
  // переход: адрес меняется, а экран тот же. Роутер их и так не разбирает —
  // маршруты все вида «#/…». А телеметрия считала каждый такой клик уходом:
  // «#/landing» закрывался визитом на пару секунд (до первого клика по меню),
  // и заводилась страница-призрак «#modes» с нулевым временем — обе как раз
  // висели в bounce-риске.
  if (path.startsWith('#') && !path.startsWith('#/')) return

  recordDwell()

  lastPath = path
  dwellPath = path
  dwellStart = Date.now()
  trackPageView(path, meta)
}

// Браузерное предупреждение, а не ошибка: ResizeObserver не успел разослать
// уведомления за кадр и досылает их следующим. Ничего не ломается, но событие
// приходит на каждый ресайз — за месяц оно дало 3000+ строк и вытеснило со
// вкладки «Проблемы» все настоящие ошибки. Не пишем его вовсе.
const IGNORED_ERROR = /^ResizeObserver loop|process is not defined/

// Ошибки самого инструментария разработки: оптимизатор зависимостей Vite
// (`process is not defined` в .vite/deps), HMR-клиент, react-refresh. В проде
// такого кода нет вовсе, а на вкладке «Проблемы» они дали 130 записей из 185 и
// закрыли собой настоящие поломки. Не пишем их — ни в лог, ни в счётчики.
const DEV_SRC = /\/node_modules\/\.vite\/|\/@vite\/client|\/@react-refresh|[?&]t=\d{10,}/

function installErrorTracking() {
  // JS runtime errors
  window.addEventListener('error', (e) => {
    if (IGNORED_ERROR.test(String(e.message ?? ''))) return
    const src = String(e.filename ?? '').replace(location.origin, '')
    if (DEV_SRC.test(src)) return
    trackEvent('js_error', {
      msg: String(e.message ?? '').slice(0, 200),
      src: src.slice(0, 120),
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

/**
 * Слежение за адресом. Обязательно СВОЁ, а не только эффект по хешу в App.tsx.
 *
 * Половина экранов переписывает адрес через `history.replaceState` — намеренно:
 * переход между темами тренажёра или открытие домашки не должны копиться в
 * «Назад» (см. lib/trainerLink и DashboardPage). Но replaceState и pushState
 * НЕ поднимают `hashchange`, а useHashRoute в App.tsx слушает только его —
 * поэтому trackPath на этих экранах не вызывался вовсе. В базе это выглядело
 * так: у #/homework/seed-kohg-84fe210b-2 двести тридцать один клик и НОЛЬ
 * page_view, а «кликов на просмотр» доходило до 437.
 *
 * Здесь патчатся оба метода истории — но только чтобы разослать событие; сама
 * навигация не меняется, роутинг по-прежнему живёт на hashchange, и «Назад»
 * работает как раньше. trackPath сам отбрасывает повтор того же адреса, так что
 * эффект в App.tsx и этот слушатель друг друга не задваивают.
 */
function installRouteTracking() {
  const EVENT = 'app:locationchange'
  const notify = () => window.dispatchEvent(new Event(EVENT))

  for (const name of ['pushState', 'replaceState'] as const) {
    const original = history[name]
    history[name] = function (this: History, ...args: Parameters<History['pushState']>) {
      const result = original.apply(this, args)
      notify()
      return result
    }
  }

  const record = () => trackPath(location.hash || location.pathname || '#/')
  window.addEventListener(EVENT, record)
  window.addEventListener('hashchange', record)
  window.addEventListener('popstate', record)
}

function installClickTracking() {
  // Normalised click coordinates per screen — feeds the spatial heatmaps.
  // Records only viewport-relative fractions (0..1) + viewport size; no target
  // identity, no PII. Aggregated into a density grid server-side.
  document.addEventListener('click', (e) => {
    const w = window.innerWidth, h = window.innerHeight
    if (!w || !h) return
    // Клик ровно в (0,0) — не палец: так приходят программные element.click(),
    // активация кнопки с клавиатуры и проброс label → input. Координат у них
    // нет, и все такие события ложились одной клеткой в левый верхний угол —
    // 36% всех кликов, из-за чего на картах там горело красное пятно.
    if (e.clientX === 0 && e.clientY === 0) return
    const xr = Math.min(1, Math.max(0, e.clientX / w))
    const yr = Math.min(1, Math.max(0, e.clientY / h))
    trackEvent('click', {
      xr: Math.round(xr * 1000) / 1000,
      yr: Math.round(yr * 1000) / 1000,
      w, h,
    })
  }, { passive: true })
}

// Подпись места, куда долбят пальцем. Три ловушки — все три видны в отчёте:
//   • у SVG className не строка, а SVGAnimatedString, и в лог падало
//     «[object SVGAnimatedString]»;
//   • innerText у SVG вовсе undefined — подпись пустая;
//   • у крупного контейнера innerText — простыня в несколько строк (условие
//     задания целиком), и она же становилась «названием элемента».
// Берём ближайшего интерактивного предка — по нему и кликают, а событие
// приходит от вложенной иконки или строки текста, — и сжимаем подпись в строку.
function rageLabel(target: EventTarget | null): Record<string, unknown> {
  const start = target instanceof Element ? target : null
  if (!start) return {}
  const el = start.closest('button, a, [role="button"], input, select, label, summary') ?? start
  const raw = el.getAttribute('aria-label') || (el as HTMLElement).innerText || el.textContent || ''
  const text = raw.replace(/\s+/g, ' ').trim().slice(0, 60)
  const cls = (typeof el.className === 'string' ? el.className : el.getAttribute('class') ?? '').slice(0, 80)
  return {
    tag: el.tagName.toLowerCase(),
    text: text || undefined,
    cls: cls || undefined,
  }
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
      trackEvent('rage_click', rageLabel(e.target))
      clicks = []
      void flush()
    }
  }, { passive: true })
}

export function initAnalytics() {
  if (started || typeof window === 'undefined') return
  if (!TELEMETRY_ON) return
  started = true
  getSessionId()

  void resolveIdentity().then(() => {
    let tz: string | null = null
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch { /**/ }
    trackEvent('session_start', {
      ref: document.referrer || null,
      w: window.innerWidth,
      h: window.innerHeight,
      tz,
    })
    void flush()
  })

  supabase.auth.onAuthStateChange(() => { void resolveIdentity() })

  setInterval(() => void flush(), FLUSH_INTERVAL)
  setInterval(() => { trackEvent('heartbeat') }, HEARTBEAT_INTERVAL)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      recordDwell()
      void flush(true)
    } else {
      dwellStart = Date.now()
    }
  })
  window.addEventListener('pagehide', () => { recordDwell(); void flush(true) })

  installErrorTracking()
  installRageClickTracking()
  installClickTracking()
  installRouteTracking()
}
