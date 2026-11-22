import { useRef, useState } from 'react'
import { Eye, EyeOff, Loader2 } from '../icons/appIcons'
import Tooltip from '../Tooltip'
import { setCourseItemHidden, type CourseItemKind } from '../../lib/courseVisibility'
import './courseVisibility.css'
import { useT } from '../../lib/i18n'

export default function CourseVisibilityButton({ course, kind, item, hidden, inherited = false, disabled = false, allowDraft = false, disabledReason }: {
  course: string; kind: CourseItemKind; item: string; hidden: boolean; inherited?: boolean; disabled?: boolean; allowDraft?: boolean; disabledReason?: string
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const label = kind === 'module'
    ? hidden ? t('Показать модуль ученикам') : t('Скрыть модуль от учеников')
    : hidden ? t('Показать урок ученикам') : t('Скрыть урок от учеников')
  async function toggle() {
    if (lock.current || disabled) return
    lock.current = true; setBusy(true); setError('')
    try { await setCourseItemHidden(course, kind, item, !hidden, allowDraft) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить видимость.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <span className="course-visibility-control">
    <Tooltip label={error ? t(error) : disabledReason || (inherited ? t('Урок скрыт вместе с модулем. Его собственная видимость сохраняется.') : label)}>
      <button type="button" className="course-visibility-button" data-hover="layer" aria-label={label}
        aria-pressed={hidden} disabled={disabled || busy} aria-busy={busy}
        data-hidden={hidden || inherited || undefined}
        onClick={event => { event.stopPropagation(); void toggle() }}
        onDoubleClick={event => event.stopPropagation()}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : hidden || inherited ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </Tooltip>
    {error && <span role="alert" className="course-visibility-error">{t(error)}</span>}
  </span>
}
