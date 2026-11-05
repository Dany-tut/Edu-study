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

export async function checkModuleFreshness(): Promise<ModuleFreshness> {
  try {
    const { version } = await localRequest('/version', '', { signal: AbortSignal.timeout(2500) })
    return version === TRANSCRIPTION_MODULE_VERSION ? 'current' : 'outdated'
  } catch (error) {
    return error instanceof LocalTranscriptionUnavailable ? 'unknown' : 'outdated'
  }
}

/** Проверка для карточки модуля: при открытии и при возврате на вкладку. */
export function useModuleFreshness(enabled: boolean): ModuleFreshness {
  const [state, setState] = useState<ModuleFreshness>('unknown')
  useEffect(() => {
    if (!enabled) { setState('unknown'); return }
    let alive = true
    const run = () => { void checkModuleFreshness().then(s => { if (alive) setState(s) }) }
    run()
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [enabled])
  return state
}

/** Событие: открыть в профиле вкладку «Интеграции» (переход из уведомления). */
export const PROFILE_SECTION_EVENT = 'iskra:profile-section'
export const PROFILE_SECTION_KEY = 'profile_section'

const NOTIFIED_KEY = 'iskra.transcription.updateNotified'

/**
 * Уведомление «вышла новая версия модуля» — в колокольчик учителя, один раз на
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
      let connected = false
      try { connected = !!localStorage.getItem('iskra.transcription.device.' + owner) } catch { /* без хранилища нет и подключения */ }
      if (!connected) return
      return checkModuleFreshness()
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
