// Версия приложения на экране: «1.0.625 · a1b2c3d».
//
// Зачем: между «коммит ушёл» и «обнова доехала до этого устройства» лежит
// целая очередь — сборка на хостинге, кеш браузера, service worker, домашний
// экран PWA. Номер сборки = порядковый номер коммита (штампуется хуком
// pre-commit в public/version.json), поэтому в профиле видно ровно то, что
// сейчас крутится ЗДЕСЬ, и одним запросом — что лежит на сервере.
//
// Сравнение чисто числовое: 626 > 625 → «есть обновление».

export const APP_BUILD: number = typeof __APP_BUILD__ === 'number' ? __APP_BUILD__ : 0
export const APP_COMMIT: string = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev'
export const APP_VERSION: string = `1.0.${APP_BUILD}`
// То, что показываем целиком: номер + хеш коммита (по нему находится сам коммит).
export const APP_VERSION_FULL: string = `${APP_VERSION} · ${APP_COMMIT}`

export type RemoteVersion = { build: number; version: string; stamped?: string }

// Откуда спрашивать «а что сейчас на сервере». По умолчанию — свой же origin.
// В нативной обёртке (Capacitor) файлы лежат в бандле, и запрос ушёл бы к самому
// себе: там сравнивать не с чем, пока не задан VITE_VERSION_URL с адресом прода.
const REMOTE_URL: string = (import.meta.env.VITE_VERSION_URL as string | undefined) || '/version.json'

// Что лежит на сервере прямо сейчас. Файл маленький (три строки) и НЕ попадает
// в precache воркера (workbox по умолчанию кеширует js/css/html/ico/png/svg), а
// `no-store` снимает и http-кеш — иначе проверка обновления сама отвечала бы из
// кеша, ради обхода которого её и завели.
//
// СРОК. Запрос обязан кончаться. Без него зависший fetch (телефон в лифте, точка
// доступа с порталом — соединение открыто и молчит) оставлял проверку висеть
// навсегда: строка версии залипала на «Проверяем…», и по ней долбили пальцем.
const CHECK_TIMEOUT_MS = 8000

export async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  try {
    const sep = REMOTE_URL.includes('?') ? '&' : '?'
    const res = await fetch(`${REMOTE_URL}${sep}t=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) })
    if (!res.ok) return null
    const data = await res.json()
    const build = Number(data?.build)
    if (!Number.isFinite(build)) return null
    return { build, version: String(data?.version || `1.0.${build}`), stamped: data?.stamped }
  } catch {
    return null
  }
}

// Забрать обновление принудительно: снести воркера и все его кеши, затем
// перезагрузиться. Тупо, зато надёжно — новый воркер регистрируется сам
// (registerType: 'autoUpdate'), а старый shell уже нечем отдавать.
//
// `onStep` зовётся после каждого шага: по нему индикатор двигает свою полосу,
// чтобы тап не выглядел зависшим (см. lib/appUpdate.ts).
export type UpdateStep = 'sw' | 'caches' | 'done'

export async function applyUpdate(onStep?: (step: UpdateStep) => void): Promise<void> {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations?.()) ?? []
    await Promise.all(regs.map(r => r.unregister().catch(() => false)))
  } catch { /**/ }
  onStep?.('sw')
  try {
    const keys = await caches.keys()
    await Promise.all(keys.map(k => caches.delete(k).catch(() => false)))
  } catch { /**/ }
  onStep?.('caches')
  // Небольшая пауза — не ради техники, а ради глаза: полоса должна дойти до
  // конца, иначе перезагрузка обрывает её на середине и выглядит как сбой.
  await new Promise(r => setTimeout(r, 420))
  onStep?.('done')
  await new Promise(r => setTimeout(r, 260))
  // Хеш сохраняем — перезагрузка не должна выкидывать со страницы урока.
  window.location.reload()
}
