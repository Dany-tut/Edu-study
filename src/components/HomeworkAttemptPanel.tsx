import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { canRetakeHomework, gradedWorkLabel, homeworkDisplayScore, type HomeworkResult, type HomeworkAttempt } from '../lib/homeworkResult'
import type { Lesson } from '../data/mockData'
import { startHomeworkRetake } from '../lib/homeworkAttempts'
import type { BasicAnswersPayload } from '../lib/basicAnswers'
import { supabase } from '../lib/supabase'
import LessonSelfAssessment from './LessonSelfAssessment'
import HomeworkAttemptHistory from './HomeworkAttemptHistory'

export default function HomeworkAttemptPanel({ result, status, studentId, lessonRef, kind, onRetake }: {
  result?: HomeworkResult; status?: string; studentId: string; lessonRef: string; kind?: Lesson['kind'];
  onRetake?: (draft: BasicAnswersPayload) => void | Promise<void>
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<string, BasicAnswersPayload>>({})
  const [older, setOlder] = useState<HomeworkAttempt[]>([])
  const [reading, setReading] = useState<Record<string, boolean>>({})
  const [readErrors, setReadErrors] = useState<Record<string, string>>({})
  const [loadingOlder, setLoadingOlder] = useState(false)
  const context = useRef(0)
  useEffect(() => {
    context.current++
    setOlder([]); setAnswers({}); setError(''); setReading({}); setReadErrors({}); setLoadingOlder(false)
    return () => { context.current++ }
  }, [studentId, lessonRef])
  const attempts = [...(result?.attempts ?? []),...older].filter((a,i,all) => all.findIndex(b => b.id===a.id)===i)
  const attemptCount = result?.attemptCount ?? attempts.length
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
  async function read(id: string) {
    if (answers[id] || reading[id]) return
    const request = context.current
    setReading(before => ({ ...before, [id]: true }))
    setReadErrors(before => ({ ...before, [id]: '' }))
    try {
      const { data, error } = await supabase.from('homework_attempts').select('answers').eq('id', id).single()
      if (error || !data?.answers) throw error ?? new Error('Missing attempt answers')
      if (request === context.current) setAnswers(before => ({ ...before, [id]: data.answers }))
    } catch {
      if (request === context.current) setReadErrors(before => ({ ...before, [id]: t('Не удалось загрузить ответы') }))
    } finally {
      if (request === context.current) setReading(before => ({ ...before, [id]: false }))
    }
  }
  async function loadOlder() {
    if (loadingOlder) return
    const request = context.current
    setLoadingOlder(true); setError('')
    try {
      let page = supabase.from('homework_attempts').select('id,number,status,score,passing_score,submitted_at,review_comment')
        .eq('student_id', studentId).eq('lesson_ref', lessonRef).order('number', { ascending: false }).limit(20)
      if (attempts.length) page = page.lt('number', Math.min(...attempts.map(a => a.number)))
      const { data, error } = await page
      if (error) throw error
      if (request === context.current) setOlder(before => [...before, ...(data ?? []) as HomeworkAttempt[]])
    } catch {
      if (request === context.current) setError(t('Не удалось загрузить ответы'))
    } finally {
      if (request === context.current) setLoadingOlder(false)
    }
  }
  return <section aria-label={t('Результат ДЗ')} style={{display:'flex',flexDirection:'column',gap:12,padding:'16px 0'}}>
    <strong style={{color: result.pending ? 'var(--color-peach-text)' : result.passed ? 'var(--color-green-text)' : 'var(--color-text)'}}>
      {heading}
    </strong>
    {result.pending && <p>{t('Итоговый результат появится после проверки всей работы.')}</p>}
    <LessonSelfAssessment key={`${lessonRef}:${result.attemptId}`} lessonId={lessonRef} studentId={studentId} status={status} result={result} />
    {status !== 'returned' && !result.pending && !result.draft && score !== null && score < result.passingScore && <p>{t('Ниже проходного балла')} · {t('порог')} {result.passingScore}%</p>}
    {onRetake && canRetakeHomework(result,status) && <button type="button" onClick={retry} disabled={busy} style={{padding:'12px 18px',borderRadius:14,border:0,background:'var(--grad-purple)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{busy ? t('Открываем попытку…') : t('Пройти заново')}</button>}
    {error && <p role="alert" style={{color:'var(--color-red-text)'}}>{error}</p>}
    <HomeworkAttemptHistory key={`${studentId}:${lessonRef}`} attempts={attempts} attemptCount={attemptCount}
      answers={answers} reading={reading} readErrors={readErrors} loadingOlder={loadingOlder}
      onRead={id => { void read(id) }} onLoadOlder={() => { void loadOlder() }} />
  </section>
}
