import { useState } from 'react'
import { useT } from '../lib/i18n'
import { canRetakeHomework, gradedWorkLabel, homeworkDisplayScore, type HomeworkResult } from '../lib/homeworkResult'
import type { Lesson } from '../data/mockData'
import { startHomeworkRetake } from '../lib/homeworkAttempts'
import type { BasicAnswersPayload } from '../lib/basicAnswers'
import LessonSelfAssessment from './LessonSelfAssessment'

export default function HomeworkAttemptPanel({ result, status, studentId, lessonRef, kind, readOnly, onRetake }: {
  result?: HomeworkResult; status?: string; studentId: string; lessonRef: string; kind?: Lesson['kind'];
  readOnly?: boolean
  onRetake?: (draft: BasicAnswersPayload) => void | Promise<void>
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!result || (!result.attemptId && !result.pending && result.percent === null)) return null
  const score = homeworkDisplayScore(result)
  let heading = t('Работа отправлена')
  if (status === 'returned') heading = t('Возвращено на доработку')
  else if (result.draft) heading = t('Новая попытка начата')
  else if (result.pending) heading = t('На проверке у преподавателя')
  else if (score !== null) heading = `${t(gradedWorkLabel(score >= result.passingScore, kind))} · ${score}%`
  async function retry() {
    if (busy || !result || !canRetakeHomework(result, status)) return
    setBusy(true); setError('')
    try { await onRetake?.(await startHomeworkRetake(studentId, lessonRef, result.attemptId ?? null)) }
    catch { setError(t('Не удалось начать попытку. Предыдущая работа сохранена. Попробуй ещё раз.')) }
    finally { setBusy(false) }
  }
  return <section aria-label={t('Результат ДЗ')} style={{display:'flex',flexDirection:'column',gap:12,padding:'16px 0'}}>
    <strong style={{color: result.pending ? 'var(--color-peach-text)' : result.passed ? 'var(--color-green-text)' : 'var(--color-text)'}}>
      {heading}
    </strong>
    {result.pending && <p>{t('Итоговый результат появится после проверки всей работы.')}</p>}
    <LessonSelfAssessment key={`${lessonRef}:${result.attemptId}`} readOnly={readOnly} lessonId={lessonRef} studentId={studentId} status={status} result={result} />
    {status !== 'returned' && !result.pending && !result.draft && score !== null && score < result.passingScore && <p>{t('Ниже проходного балла')} · {t('порог')} {result.passingScore}%</p>}
    {onRetake && canRetakeHomework(result,status) && <button type="button" onClick={retry} disabled={busy} style={{padding:'12px 18px',borderRadius:14,border:0,background:'var(--grad-purple)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{busy ? t('Открываем попытку…') : t('Пройти заново')}</button>}
    {error && <p role="alert" style={{color:'var(--color-red-text)'}}>{error}</p>}
  </section>
}
