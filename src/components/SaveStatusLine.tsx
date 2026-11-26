import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { AlertCircle, CircleCheck, CloudOff, Loader2 } from './icons/appIcons'
import { useT } from '../lib/i18n'
import { getWriteActivity, subscribeWriteActivity } from '../lib/sync/writeActivity'
import { clockTime, nextStatusChangeIn, saveStatusView } from '../lib/sync/saveStatus'

/**
 * Строка статуса сохранения — ПК, вариант A концепта (docs/saving.md §4.5):
 * «Сохранено · только что / в 14:02», «Сохраняю…» (дольше 400 мс),
 * «Нет сети — сохраню, когда появится», «Не сохранено». Не исчезает и не мигает.
 * Подробности ошибки и «Повторить» — в Alert экрана, здесь только статус.
 */
export default function SaveStatusLine({ saving, lastSavedAt, failed, pendingChanges, persisted, requireCurrentAck = false, savedExcept, style }: {
  saving: boolean
  lastSavedAt: number | null
  failed: boolean
  pendingChanges: boolean
  persisted: boolean
  requireCurrentAck?: boolean
  /** Что сознательно не записано («кроме файлов»): «Сохранено · кроме файлов». */
  savedExcept?: string
  style?: CSSProperties
}) {
  const t = useT()
  const online = useSyncExternalStore(subscribeWriteActivity, () => getWriteActivity().online, () => true)

  // Начало текущей записи — от него считается порог «Сохраняю…».
  const savingSince = useRef<number | null>(null)
  if (saving && savingSince.current === null) savingSince.current = Date.now()
  if (!saving) savingSince.current = null

  const input = { saving, savingSince: savingSince.current, lastSavedAt, failed, online, pendingChanges, persisted, now: Date.now() }
  // Only display inputs change here. A stale browser network hint must not
  // hide an active attempt; write activity and reconnect retries stay untouched.
  const displayInput = requireCurrentAck ? {
    ...input,
    ...((pendingChanges || saving) ? { persisted: false, lastSavedAt: null } : {}),
    ...(saving ? { online: true, failed: false } : {}),
  } : input
  const view = saveStatusView(displayInput)

  // Строка меняется со временем сама (400 мс, минута) — перерисоваться к этому моменту.
  const [, setTick] = useState(0)
  const wait = nextStatusChangeIn(displayInput)
  useEffect(() => {
    if (wait === null) return
    const timer = setTimeout(() => setTick(n => n + 1), wait + 20)
    return () => clearTimeout(timer)
  }, [wait])

  let content = null
  if (view.kind === 'saving') {
    content = <><Loader2 size={12} style={{ animation: 'spin 0.9s linear infinite' }} /> {t('Сохраняю…')}</>
  } else if (view.kind === 'offline') {
    content = <><CloudOff size={12} style={{ color: 'var(--color-amber)' }} /> {t('Нет сети — сохраню, когда появится')}</>
  } else if (view.kind === 'error') {
    content = <><AlertCircle size={12} /> {t('Не сохранено')}</>
  } else if (view.kind === 'saved') {
    const text = savedExcept ? `${t('Сохранено')} · ${savedExcept}`
      : view.at === null ? t('Сохранено')
      : view.justNow ? t('Сохранено · только что')
      : `${t('Сохранено · в')} ${clockTime(view.at)}`
    content = <><CircleCheck size={12} /> {text}</>
  }
  return (
    <span role="status" aria-live="polite" data-save-status={view.kind} style={{
      display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, whiteSpace: 'nowrap',
      color: view.kind === 'error' ? 'var(--color-red-text)' : 'var(--color-text-3)', ...style,
    }}>
      {content}
    </span>
  )
}
