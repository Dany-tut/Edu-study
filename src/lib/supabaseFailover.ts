// Российский резерв доступа к Supabase (вариант Б, docs/infra/ru-proxy.md §3.3).
//
// Проблема: из РФ запросы к `*.supabase.co` режутся провайдерами и не доходят
// (вход «Сервер не ответил»). Решение: обратный прокси на российском домене
// (api.iskra-study.ru). Этот модуль автоматически уходит на прокси, КОГДА прямой
// адрес недоступен, и только тогда.
//
// Принципы:
// - Прямой адрес — ОСНОВНОЙ. Не-РФ пользователи (и все, у кого прямой доступен)
//   прокси вообще не касаются: лишнего хопа и таймаута у них нет.
// - `createClient` остаётся на ПРЯМОМ URL → `storageKey` (`sb-<ref>-auth-token`)
//   и сессии НЕ меняются, никого не разлогинивает (builds.md §4.1).
// - Короткий таймаут на пробу прямого пути, затем фейловер на прокси.
// - Рабочий эндпоинт кэшируется на сессию (sessionStorage): РФ-пользователь не
//   ждёт таймаут на каждом запросе. Если прокси тоже отвалился — кэш сбрасываем
//   и в следующий раз снова пробуем прямой (самолечение).
// - Прямой `*.supabase.co` НИКОГДА не отключаем.
//
// Включается наличием env `VITE_SUPABASE_PROXY_URL`. Без неё поведение ровно как
// раньше — чистый прямой доступ (флаг по умолчанию выключен).

/** Прокси-адрес из окружения; пусто → резерв выключен, поведение не меняется. */
export const PROXY_URL = (import.meta.env.VITE_SUPABASE_PROXY_URL as string | undefined) || undefined

// Прокси реально обслуживает ТОЛЬКО свой origin: nginx на api.iskra-study.ru
// отдаёт `Access-Control-Allow-Origin` для РФ-домена iskra-study.ru (и своим же
// нативным сборкам на capacitor://localhost / localhost — у них свой dist с этим
// env). На edu-study-app.vercel.app прямой Supabase доступен всегда, а прокси
// для origin *.vercel.app CORS НЕ разрешает → любой фейловер туда ловит 503 и
// ошибку CORS в консоли и роняет вставку (аналитика, телеметрия). env
// `VITE_SUPABASE_PROXY_URL` выставлен и в Vercel Production (боевой бандл), так
// что одного наличия env мало: резерв держим выключенным на *.vercel.app, даже
// если env протёк в сборку. РФ-домен и нативка работают как раньше.
// docs/infra/domain-migration.md, ru-proxy.md.
function failoverAllowedHere(): boolean {
  if (typeof location === 'undefined') return true // нет window (native prerender/SSR) — доверяем сборке
  return !location.hostname.endsWith('.vercel.app')
}

export const ruFailoverEnabled = !!PROXY_URL && failoverAllowedHere()

/** Короткий потолок на пробу прямого пути перед уходом на прокси. */
const DIRECT_PROBE_MS = 2500
const CACHE_KEY = 'iskra:supabase-endpoint'

type Endpoint = 'direct' | 'proxy'
let chosen: Endpoint | null = null

function readCache(): Endpoint | null {
  try {
    const v = sessionStorage.getItem(CACHE_KEY)
    return v === 'proxy' || v === 'direct' ? v : null
  } catch { return null }
}
function writeCache(e: Endpoint) { try { sessionStorage.setItem(CACHE_KEY, e) } catch { /* приватный режим */ } }
function clearCache() { try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ } }

function hrefOf(input: RequestInfo | URL): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
}
/** Заменяем только origin (протокол+хост+порт), путь и query сохраняем. */
function swapOrigin(href: string, fromOrigin: string, toOrigin: string): string {
  return toOrigin + href.slice(fromOrigin.length)
}

// Хук: когда впервые выбран прокси, поднимаем на прокси и Realtime (websocket).
// Регистрирует supabase.ts после создания клиента (ему доступны ключ и URL).
let onProxyChosen: (() => void) | null = null
let proxyHookFired = false
export function registerProxyFailoverHook(fn: () => void) { onProxyChosen = fn }
function fireProxyHook() {
  if (proxyHookFired) return
  proxyHookFired = true
  try { onProxyChosen?.() } catch (e) { console.warn('[ru-proxy] realtime failover hook failed', e) }
}

/**
 * Оборачивает базовый fetch: для запросов к прямому origin Supabase пробует
 * прямой путь и при сетевой недоступности уходит на прокси. Ставится САМЫМ
 * НИЖНИМ в цепочке (под authTransport/withRestDeadline), чтобы их логика по
 * origin уже отработала на прямом адресе, а подмена origin случилась у сети.
 */
export function ruFailoverFetch(base: typeof fetch, directUrl: string, proxyUrl: string): typeof fetch {
  const directOrigin = new URL(directUrl).origin
  const proxyOrigin = new URL(proxyUrl).origin
  if (chosen === null) chosen = readCache()

  const toProxy = (input: RequestInfo | URL, init?: RequestInit): [RequestInfo | URL, RequestInit | undefined] => {
    const newHref = swapOrigin(hrefOf(input), directOrigin, proxyOrigin)
    // Request клонируем на новый URL (сохранит метод/заголовки/тело); строку/URL оставляем с init.
    return (typeof input === 'string' || input instanceof URL) ? [newHref, init] : [new Request(newHref, input), init]
  }

  return async (input, init) => {
    let ours = false
    try { ours = new URL(hrefOf(input)).origin === directOrigin } catch { /* относительный адрес — не наш */ }
    if (!ours) return base(input, init)

    // Уже решили в этой сессии, что прямой недоступен — сразу на прокси.
    if (chosen === 'proxy') {
      fireProxyHook()
      const [pi, pinit] = toProxy(input, init)
      return base(pi, pinit)
    }

    // Пробуем прямой с коротким таймаутом; сетевой сбой/таймаут → прокси.
    const probe = new AbortController()
    const timer = setTimeout(
      () => probe.abort(new DOMException('RU proxy: direct probe timed out', 'TimeoutError')),
      DIRECT_PROBE_MS,
    )
    const own = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    const signal = own ? AbortSignal.any([own, probe.signal]) : probe.signal
    try {
      // Прямой ОТВЕТИЛ (любой HTTP-статус, хоть 4xx) — значит доступен.
      const res = await base(input, { ...init, signal })
      if (chosen !== 'direct') { chosen = 'direct'; writeCache('direct') }
      return res
    } catch (e) {
      clearTimeout(timer)
      // Отмену инициировал сам вызывающий (а не наш пробный таймаут) — пробрасываем.
      if (own?.aborted) throw e
      // Ретрай с телом безопасен только для строкового input (body лежит в init —
      // так шлёт auth/rest, включая логин). Для Request с потоковым телом (загрузки
      // в Storage) не ретраим, тело уже может быть прочитано: честно пробрасываем.
      if (!(typeof input === 'string' || input instanceof URL)) throw e
      try {
        const res = await base(swapOrigin(hrefOf(input), directOrigin, proxyOrigin), { ...init, signal: own })
        chosen = 'proxy'; writeCache('proxy'); fireProxyHook()
        return res
      } catch (e2) {
        // Прокси тоже не ответил — сбрасываем выбор, следующий раз снова пробуем прямой.
        clearCache(); chosen = null; proxyHookFired = false
        throw e2
      }
    } finally { clearTimeout(timer) }
  }
}
