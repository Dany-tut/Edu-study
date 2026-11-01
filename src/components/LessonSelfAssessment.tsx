import { useState } from 'react'
import { EMOJI_STEPS } from './homeworkSteps'
import { useDashboard } from '../store/dashboardStore'
import { useStudentData } from '../store/studentDataStore'
import { useT } from '../lib/i18n'
import { isSelfAssessmentValue } from '../lib/lessonSelfAssessment'
import { saveLessonSelfAssessment } from '../lib/saveLessonSelfAssessment'
import { isHomeworkSubmissionStatus, type HomeworkResult } from '../lib/homeworkResult'

export default function LessonSelfAssessment({ lessonId, studentId, status, result, readOnly }: {
  lessonId: string; studentId: string; status: string | undefined; result?: HomeworkResult; readOnly?: boolean
}) {
  const t = useT()
  const local = useDashboard(s => s.lessonAssessments[lessonId])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (!isHomeworkSubmissionStatus(status) || result?.draft) return null

  const server = result?.selfAssessment
  const localIsNewer = !!local?.selfAssessedAt && (!server || local.selfAssessedAt > server.assessedAt)
  const sameAttempt = !local?.selfAssessmentAttemptId || local.selfAssessmentAttemptId === result?.attemptId
  const value = readOnly ? server?.value : localIsNewer && sameAttempt ? local.emojiIndex : server?.value ?? (sameAttempt ? local?.emojiIndex : undefined)
  const step = isSelfAssessmentValue(value) ? EMOJI_STEPS[value] : null
  const editable = !readOnly && !!studentId && !!result?.attemptId

  async function save(next: number) {
    if (busy || !result?.attemptId) return
    setBusy(true); setError(false)
    try {
      const saved = await saveLessonSelfAssessment(studentId, lessonId, result.attemptId, next)
      useDashboard.getState().setLessonSelfAssessment(lessonId, saved.value, saved.assessedAt, result.attemptId)
      setOpen(false)
      void useStudentData.getState().load()
    } catch { setError(true) }
    finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button type="button" disabled={!editable || busy} aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '4px 0', border: 0,
          background: 'transparent', textAlign: 'left', color: 'var(--color-muted)', fontSize: 12, cursor: editable ? 'pointer' : 'default' }}>
        {step && <span aria-hidden="true" style={{ fontSize: 20 }}>{step.emoji}</span>}
        <span style={{ flex: 1, lineHeight: 1.4 }}>
          {step ? <>{t('Самооценка:')} {t(step.label)}</> : t('Самооценка не указана')}
        </span>
        {editable && <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
          {busy ? t('Сохраняем…') : open ? t('Свернуть') : step ? t('Изменить') : t('Указать')}
        </span>}
      </button>
      {open && <div role="group" aria-label={t('Самооценка')} style={{ display: 'flex', gap: 6 }}>
        {EMOJI_STEPS.map((choice, i) => <button key={choice.label} type="button"
          title={t(choice.label)} aria-label={t(choice.label)} aria-pressed={i === value} disabled={busy}
          onClick={() => { void save(i) }}
          style={{ flex: 1, minWidth: 0, minHeight: 44, fontSize: 24, borderRadius: 12, cursor: busy ? 'wait' : 'pointer',
            border: `1px solid ${i === value ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
            background: i === value ? 'var(--color-accent-soft)' : 'var(--color-bg-3)' }}>{choice.emoji}</button>)}
      </div>}
      {error && <span role="alert" style={{ fontSize: 12, color: 'var(--color-red-text)' }}>
        {t('Не удалось сохранить самооценку. Попробуй ещё раз.')}
      </span>}
    </div>
  )
}
