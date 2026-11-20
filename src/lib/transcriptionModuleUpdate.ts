import { useEffect, useState } from 'react'
import { localRequest, LocalTranscriptionUnavailable } from './localTranscription'
import { TRANSCRIPTION_MODULE_VERSION } from './transcriptionModuleVersion'
import { TRANSCRIPTION_PRODUCT_VERSION } from './transcriptionProductVersion'
import { useNotificationsStore } from '../store/notificationsStore'
import { t } from './i18n'
import { getOwnerId, getViewAs } from './owner'

/**
 * Свежий ли модуль расшифровки на этом Mac. Модуль отдаёт отпечаток своего
 * кода по GET /version; на сайте лежит архив с отпечатком
 * TRANSCRIPTION_MODULE_VERSION. Не совпало — пора скачать архив заново.
 * Модуль старше этой проверки адреса /version не знает (404) — тоже «устарел».
 * Модуль не запущен — «неизвестно»: не пугаем обновлением, которого, может, и нет.
 */
export type ModuleFreshness = 'current' | 'outdated' | 'unknown'

// DMG с подписанным приложением доступен с того же сайта без входа в GitHub.
export const MODULE_DOWNLOAD_URL = `/downloads/Iskra-Transcription-Mac-v${TRANSCRIPTION_PRODUCT_VERSION}.dmg`

/** Что модуль на этом Mac сказал о себе. selfUpdate — умеет POST /update.
 * app — версия приложения «Искра · Расшифровка» вокруг модуля (если модуль её знает). */
export type ModuleInfo = { freshness: ModuleFreshness; local?: string; selfUpdate: boolean; app?: string; appRemembered?: boolean }

const older = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }) < 0

/** Приложение на Mac старше выпущенного — предложить новое. Без исключения для
 * 1.0.9+: оно умеет обновляться само, но только пока открыто его окно, а
 * фоновая служба (в ней и идёт расшифровка) приложение не обновляет. Код модуля
 * обновляется сам, а .app с хелпером Vision — нет: новые возможности приложения
 * (например, кириллица в слайдах с 1.0.10) приходят только с новым DMG. */
export function appNeedsManualUpdate(app?: string) {
  return !!app && older(app, TRANSCRIPTION_PRODUCT_VERSION)
}

// Последняя версия приложения, которую назвал модуль. Модуль запускается по
// запросу и засыпает после простоя — тогда версию берём из этой памяти.
const APP_SEEN_KEY = 'iskra.transcription.appVersion'
function rememberApp(app?: string) {
  try { if (app) localStorage.setItem(APP_SEEN_KEY, app) } catch { /* без хранилища — без памяти */ }
}
function rememberedApp() {
  try { return localStorage.getItem(APP_SEEN_KEY) || undefined } catch { return undefined }
}

export async function readModule(): Promise<ModuleInfo> {
  try {
    const { version, update, app } = await localRequest('/version', '', { signal: AbortSignal.timeout(2500) })
    const known = typeof app === 'string' && app ? app : undefined
    rememberApp(known)
    return { freshness: version === TRANSCRIPTION_MODULE_VERSION ? 'current' : 'outdated', local: version, selfUpdate: update === true,
      app: known }
  } catch (error) {
    const app = rememberedApp()
    return { freshness: error instanceof LocalTranscriptionUnavailable ? 'unknown' : 'outdated', selfUpdate: false,
      app, appRemembered: !!app }
  }
}

export async function checkModuleFreshness(): Promise<ModuleFreshness> {
  return (await readModule()).freshness
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
let updating: Promise<boolean | null> | null = null

/**
 * Обновить модуль самим модулем: он скачивает архив с сайта, раскладывает его
 * и перезапускает start.command. Ждём, пока он вернётся с версией сайта
 * (первый запуск новой версии может докачивать зависимости — до 5 минут).
 * Одно обновление на вкладку: карточка и верхняя панель делят его.
 */
export function updateModule(token: string): Promise<boolean | null> {
  updating ??= (async () => {
    try {
      await localRequest('/update', token, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: TRANSCRIPTION_MODULE_VERSION }), signal: AbortSignal.timeout(150000) })
      for (let i = 0; i < 150; i++) {
        await wait(2000)
        if ((await readModule()).freshness === 'current') return true
      }
      return false
    } catch (error) { return error instanceof Error && error.message.includes('Модуль занят расшифровкой') ? null : false }
    finally { updating = null }
  })()
  return updating
}

/** checked — модуль уже опрошен (до первого ответа phase тоже 'unknown'). */
export type ModuleState = { phase: ModuleFreshness | 'updating' | 'failed'; local?: string; selfUpdate: boolean; app?: string; appRemembered?: boolean; checked?: boolean }

/**
 * Проверка для карточки модуля: при открытии и при возврате на вкладку.
 * Модуль, который умеет обновляться сам, обновляется сразу, без вопросов.
 */
export function useModuleState(enabled: boolean, token: string, refresh = 0): ModuleState {
  const [state, setState] = useState<ModuleState>({ phase: 'unknown', selfUpdate: false })
  useEffect(() => {
    if (!enabled) { setState({ phase: 'unknown', selfUpdate: false }); return }
    let alive = true
    const run = async () => {
      const info = await readModule()
      if (!alive) return
      if (info.freshness !== 'outdated' || !info.selfUpdate || !token) { setState({ phase: info.freshness, local: info.local, selfUpdate: info.selfUpdate, app: info.app, appRemembered: info.appRemembered, checked: true }); return }
      setState({ phase: 'updating', local: info.local, selfUpdate: true, app: info.app, checked: true })
      const ok = await updateModule(token)
      if (!alive) return
      // Свежий код модуля сообщает версию приложения — перечитать её.
      const after = ok ? await readModule() : info
      if (!alive) return
      setState(ok ? { phase: 'current', local: TRANSCRIPTION_MODULE_VERSION, selfUpdate: true, app: after.app, checked: true } : { phase: ok === null ? 'outdated' : 'failed', local: info.local, selfUpdate: true, app: info.app, checked: true })
    }
    void run()
    const onVisible = () => { if (document.visibilityState === 'visible') void run() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [enabled, token, refresh])
  return state
}

/** Событие: открыть в профиле вкладку «Интеграции» (переход из уведомления). */
export const PROFILE_SECTION_EVENT = 'iskra:profile-section'
export const PROFILE_SECTION_KEY = 'profile_section'

const NOTIFIED_KEY = 'iskra.transcription.updateNotified'
const APP_NOTIFIED_KEY = 'iskra.transcription.appUpdateNotified'

/**
 * Модуль, который умеет обновляться сам, обновляется в фоне. Старому —
 * уведомление «вышла новая версия модуля» в колокольчик учителя, один раз на
 * версию. Проверяем только у тех, кто подключал модуль на этом компьютере, и
 * только если модуль запущен: иначе узнать его версию нельзя.
 */
export function useModuleUpdateNotice() {
  const add = useNotificationsStore(s => s.add)
  useEffect(() => {
    // В режиме «смотреть как» кабинет чужой — его модуль не наш.
    if (getViewAs()) return
    let alive = true
    void getOwnerId().then(async owner => {
      if (!alive || !owner) return
      let token = ''
      try { token = localStorage.getItem('iskra.transcription.device.' + owner) || '' } catch { /* без хранилища нет и подключения */ }
      if (!token) return
      let info = await readModule()
      // Новый модуль обновляется сам — молча, без уведомления. Обновлённый
      // код уже знает версию приложения: её и проверяем.
      if (info.freshness === 'outdated' && info.selfUpdate) {
        if (await updateModule(token) !== true) return
        info = await readModule()
      }
      if (alive && appNeedsManualUpdate(info.app)) {
        try {
          if (localStorage.getItem(APP_NOTIFIED_KEY) === TRANSCRIPTION_PRODUCT_VERSION) return
          localStorage.setItem(APP_NOTIFIED_KEY, TRANSCRIPTION_PRODUCT_VERSION)
        } catch { return }
        add({
          type: 'module_update',
          title: t('Вышла новая версия приложения расшифровки'),
          body: t('Скачайте «Искра · Расшифровка» {version} в профиле → «Интеграции» и перенесите в «Программы» с заменой. Код модуля обновляется сам, приложение — нет.').replace('{version}', TRANSCRIPTION_PRODUCT_VERSION),
          action: { label: t('Открыть'), page: '#/teacher/profile', tab: 'integrations' },
          link: { page: 'teacher/profile' },
        })
        return
      }
      return info.freshness
    }).then(state => {
      if (!alive || state !== 'outdated') return
      try { if (localStorage.getItem(NOTIFIED_KEY) === TRANSCRIPTION_MODULE_VERSION) return } catch { return }
      try { localStorage.setItem(NOTIFIED_KEY, TRANSCRIPTION_MODULE_VERSION) } catch { /* покажем ещё раз — не беда */ }
      add({
        type: 'module_update',
        title: t('Вышла новая версия модуля расшифровки'),
        body: t('Скачайте приложение в профиле → «Интеграции» и откройте его.'),
        action: { label: t('Открыть'), page: '#/teacher/profile', tab: 'integrations' },
        link: { page: 'teacher/profile' },
      })
    })
    return () => { alive = false }
  }, [add])
}
