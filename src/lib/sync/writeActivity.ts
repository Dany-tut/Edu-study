// Учёт записей в базу и хранилище — этап 0 надёжного сохранения (docs/saving.md §7).
//
// ЗАЧЕМ. Каждый экран сохраняет по-своему, и ни один слой приложения не знает,
// «есть ли сейчас недоехавшая правка». Из-за этого закрытие вкладки во время
// записи молча обрывает её (кроме редактора курса с его флагом `unsaved`):
// сдача ДЗ, оценка, посещаемость, загрузка фото уходят в никуда без единого
// предупреждения. И будущему индикатору «Сохранено / Сохраняю… / Нет сети» не
// из чего брать состояние.
//
// ЧТО ДЕЛАЕТ. Стоит внешним слоем в цепочке global.fetch клиента Supabase
// (lib/supabase.ts), поэтому видит ВСЕ места записи, не трогая ни одного:
//   1. считает записи в полёте и последний успех/сбой — getWriteActivity();
//   2. пока запись в полёте, просит браузер подтвердить закрытие вкладки.
//      Обработчик beforeunload висит ТОЛЬКО на это время и снимается, как
//      только последняя запись ответила (постоянный мешает back/forward-кэшу);
//   3. после первой записи просит у браузера постоянное хранилище, чтобы
//      локальные черновики (ДЗ в localStorage, курс в sessionStorage) не
//      вытесняло при нехватке места.
//
// ТОЛЬКО НАБЛЮДАЕТ. Запрос всегда уходит в исходный fetch ровно с теми же
// input и init (те же объекты — без новых заголовков, флагов, повторов), а
// ответ и ошибка (сеть, таймаут, отмена) возвращаются вызывающему как есть.
// Вход (/auth/v1), функции, Realtime и всё, что не запись, проходят мимо учёта.
// Прокси для РФ (ruFailoverFetch) стоит НИЖЕ и видит запрос нетронутым.
// Сбой самого учёта не меняет поведение запроса. Сторож: check:write-activity.

export type WriteFailureKind = 'http' | 'network' | 'timeout'
export interface WriteFailure { endpoint: string; status: number; kind: WriteFailureKind; at: number }
export interface WriteActivity {
  /** Записи, на которые ещё не пришёл ответ. */
  pending: number
  lastSuccessAt: number | null
  lastFailure: WriteFailure | null
  online: boolean
}

// Глаголы, по которым RPC считается записью. Неизвестная функция — чтение:
// журнал и отчёты читаются POST-ом (teacher_journal_snapshot_v3, journal_pending),
// и ложное «Покинуть страницу?» на каждом открытии журнала хуже пропущенной записи.
const WRITE_RPC = /(^|_)(save|set|apply|claim|confirm|cancel|reject|start|discard|remember|log|seed|undo|duplicate|activate|add|remove|decide|create|revoke|delete|move|reassign|update|send|unlink|publish|classify|merge|retriage)(_|$)/
// Телеметрия — не правка человека: о ней не предупреждаем и в учёт не берём.
const NOT_USER_DATA = new Set(['analytics_events'])
// Служебные вызовы хранилища, которые ничего не пишут.
const STORAGE_READS = new Set(['sign', 'list', 'info', 'public', 'authenticated'])

/**
 * Метка записи без идентификаторов (`/rest/v1/lessons`, `/rest/v1/rpc/save_x`,
 * `/storage/v1`) или null, если запрос — не запись в наш бэкенд.
 */
export function classifyWrite(href: string, method: string, backendOrigin: string): string | null {
  const verb = method.toUpperCase()
  if (verb === 'GET' || verb === 'HEAD' || verb === 'OPTIONS') return null
  let url: URL
  try { url = new URL(href) } catch { return null }
  if (url.origin !== backendOrigin) return null
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] === 'rest' && parts[1] === 'v1') {
    if (parts[2] === 'rpc') return parts[3] && WRITE_RPC.test(parts[3]) ? `/rest/v1/rpc/${parts[3]}` : null
    if (!parts[2] || NOT_USER_DATA.has(parts[2])) return null
    return `/rest/v1/${parts[2]}`
  }
  if (parts[0] === 'storage' && parts[1] === 'v1') {
    if (parts[2] === 'upload') return '/storage/v1'
    if (parts[2] !== 'object') return null
    if (STORAGE_READS.has(parts[3] ?? '')) return null
    if (parts[3] === 'upload' && parts[4] === 'sign') return null
    return '/storage/v1'
  }
  return null
}

let state: WriteActivity = {
  pending: 0, lastSuccessAt: null, lastFailure: null,
  online: typeof navigator === 'undefined' || navigator.onLine !== false,
}
const listeners = new Set<() => void>()

export function getWriteActivity(): WriteActivity { return state }
export function subscribeWriteActivity(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function update(patch: Partial<WriteActivity>) {
  try {
    const before = state.pending
    state = { ...state, ...patch }
    if (before === 0 && state.pending > 0) guardUnload(true)
    if (before > 0 && state.pending === 0) guardUnload(false)
    for (const listener of listeners) {
      try { listener() } catch { /* подписчик не ломает учёт */ }
    }
  } catch { /* учёт не ломает запрос */ }
}

function warnBeforeUnload(event: BeforeUnloadEvent) {
  // Текст диалога — всегда стандартный браузерный: свой браузеры не показывают.
  event.preventDefault()
  event.returnValue = '' // старые Safari и Chrome показывают диалог только так
}
function guardUnload(on: boolean) {
  if (typeof window === 'undefined') return
  if (on) window.addEventListener('beforeunload', warnBeforeUnload)
  else window.removeEventListener('beforeunload', warnBeforeUnload)
}

let persistRequested = false
/** Постоянное хранилище — один раз, после первой записи (есть что беречь). */
function requestPersistentStorage() {
  if (persistRequested) return
  persistRequested = true
  try {
    const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined
    if (!storage?.persist || !storage.persisted) return
    // Firefox показывает человеку запрос разрешения — без объяснения это пугает.
    if (/firefox|fxios/i.test(navigator.userAgent)) return
    void storage.persisted().then(already => (already ? undefined : storage.persist())).catch(() => {})
  } catch { /* необязательная страховка */ }
}

function errorName(error: unknown): string {
  try { return error && typeof error === 'object' && 'name' in error ? String((error as { name: unknown }).name) : '' } catch { return '' }
}

let lifecycleInstalled = false
function installLifecycle() {
  if (lifecycleInstalled || typeof window === 'undefined') return
  lifecycleInstalled = true
  try {
    window.addEventListener('online', () => update({ online: true }))
    window.addEventListener('offline', () => update({ online: false }))
  } catch { /* без событий учёт работает, просто без онлайна */ }
}

export function withWriteActivity(base: typeof fetch, backend: string): typeof fetch {
  const origin = new URL(backend).origin
  installLifecycle()
  return (input, init) => {
    let endpoint: string | null = null
    try {
      const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
      endpoint = classifyWrite(href, method, origin)
    } catch { /* учёт не меняет запрос */ }
    if (!endpoint) return base(input, init)

    const label = endpoint
    requestPersistentStorage()
    update({ pending: state.pending + 1 })
    let result: Promise<Response>
    try {
      result = base(input, init)
    } catch (error) {
      // Исходный fetch бросил синхронно — отдаём ту же ошибку тем же способом.
      update({ pending: state.pending - 1, lastFailure: { endpoint: label, status: 0, kind: 'network', at: Date.now() } })
      throw error
    }
    // Наблюдаем за ответом сбоку: вызывающий получает ровно тот же промис.
    result.then(
      response => {
        if (response.ok) update({ pending: state.pending - 1, lastSuccessAt: Date.now() })
        else update({ pending: state.pending - 1, lastFailure: { endpoint: label, status: response.status, kind: 'http', at: Date.now() } })
      },
      error => {
        const name = errorName(error)
        const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined)
        const timedOut = name === 'TimeoutError' || (signal?.aborted === true && errorName(signal.reason) === 'TimeoutError')
        const cancelled = !timedOut && (name === 'AbortError' || signal?.aborted === true)
        update(cancelled
          ? { pending: state.pending - 1 }
          : { pending: state.pending - 1, lastFailure: { endpoint: label, status: 0, kind: timedOut ? 'timeout' : 'network', at: Date.now() } })
      },
    )
    return result
  }
}

/** Только для сторожа scripts/checkWriteActivity.mjs: вернуть модуль в исходное состояние. */
export function resetWriteActivityForTest() {
  guardUnload(false)
  persistRequested = false
  listeners.clear()
  state = { pending: 0, lastSuccessAt: null, lastFailure: null, online: true }
}
