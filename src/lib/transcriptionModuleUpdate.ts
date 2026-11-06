import { useEffect, useState } from 'react'
import { localRequest, LocalTranscriptionUnavailable } from './localTranscription'
import { TRANSCRIPTION_MODULE_VERSION } from './transcriptionModuleVersion'
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

export const MODULE_DOWNLOAD_URL = '/downloads/iskra-transcription-mac.zip'

/** Что модуль на этом Mac сказал о себе. selfUpdate — умеет POST /update. */
export type ModuleInfo = { freshness: ModuleFreshness; local?: string; selfUpdate: boolean }

export async function readModule(): Promise<ModuleInfo> {
  try {
    const { version, update } = await localRequest('/version', '', { signal: AbortSignal.timeout(2500) })
    return { freshness: version === TRANSCRIPTION_MODULE_VERSION ? 'current' : 'outdated', local: version, selfUpdate: update === true }
  } catch (error) {
    return { freshness: error instanceof LocalTranscriptionUnavailable ? 'unknown' : 'outdated', selfUpdate: false }
  }
}

export async function checkModuleFreshness(): Promise<ModuleFreshness> {
  return (await readModule()).freshness
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
let updating: Promise<boolean> | null = null

/**
 * Обновить модуль самим модулем: он скачивает архив с сайта, раскладывает его
 * и перезапускает start.command. Ждём, пока он вернётся с версией сайта
 * (первый запуск новой версии может докачивать зависимости — до 5 минут).
 * Одно обновление на вкладку: карточка и верхняя панель делят его.
 */
export function updateModule(token: string): Promise<boolean> {
  updating ??= (async () => {
    try {
      await localRequest('/update', token, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: TRANSCRIPTION_MODULE_VERSION }), signal: AbortSignal.timeout(150000) })
      for (let i = 0; i < 150; i++) {
        await wait(2000)
        if ((await readModule()).freshness === 'current') return true
      }
      return false
    } catch { return false }
    finally { updating = null }
  })()
  return updating
}

export type ModuleState = { phase: ModuleFreshness | 'updating' | 'failed'; local?: string; selfUpdate: boolean }

/**
 * Проверка для карточки модуля: при открытии и при возврате на вкладку.
 * Модуль, который умеет обновляться сам, обновляется сразу, без вопросов.
 */
export function useModuleState(enabled: boolean, token: string): ModuleState {
  const [state, setState] = useState<ModuleState>({ phase: 'unknown', selfUpdate: false })
  useEffect(() => {
    if (!enabled) { setState({ phase: 'unknown', selfUpdate: false }); return }
    let alive = true
    const run = async () => {
      const info = await readModule()
      if (!alive) return
      if (info.freshness !== 'outdated' || !info.selfUpdate || !token) { setState({ phase: info.freshness, local: info.local, selfUpdate: info.selfUpdate }); return }
      setState({ phase: 'updating', local: info.local, selfUpdate: true })
      const ok = await updateModule(token)
      if (!alive) return
      setState(ok ? { phase: 'current', local: TRANSCRIPTION_MODULE_VERSION, selfUpdate: true } : { phase: 'failed', local: info.local, selfUpdate: true })
    }
    void run()
    const onVisible = () => { if (document.visibilityState === 'visible') void run() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [enabled, token])
  return state
}

/** Событие: открыть в профиле вкладку «Интеграции» (переход из уведомления). */
export const PROFILE_SECTION_EVENT = 'iskra:profile-section'
export const PROFILE_SECTION_KEY = 'profile_section'

const NOTIFIED_KEY = 'iskra.transcription.updateNotified'

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
      const info = await readModule()
      // Новый модуль обновляется сам — молча, без уведомления.
      if (info.freshness === 'outdated' && info.selfUpdate) { void updateModule(token); return }
      return info.freshness
    }).then(state => {
      if (!alive || state !== 'outdated') return
      try { if (localStorage.getItem(NOTIFIED_KEY) === TRANSCRIPTION_MODULE_VERSION) return } catch { return }
      try { localStorage.setItem(NOTIFIED_KEY, TRANSCRIPTION_MODULE_VERSION) } catch { /* покажем ещё раз — не беда */ }
      add({
        type: 'module_update',
        title: t('Вышла новая версия модуля расшифровки'),
        body: t('Скачайте обновление в профиле → «Интеграции» и перезапустите start.command.'),
        action: { label: t('Открыть'), page: '#/teacher/profile', tab: 'integrations' },
        link: { page: 'teacher/profile' },
      })
    })
    return () => { alive = false }
  }, [add])
}
