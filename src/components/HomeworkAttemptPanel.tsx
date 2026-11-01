import { useEffect, useState } from 'react'
import { useT } from '../lib/i18n'
import { canRetakeHomework, gradedWorkLabel, homeworkDisplayScore, type HomeworkResult, type HomeworkAttempt } from '../lib/homeworkResult'
import type { Lesson } from '../data/mockData'
import { startHomeworkRetake } from '../lib/homeworkAttempts'
import type { BasicAnswersPayload } from '../lib/basicAnswers'
import { supabase } from '../lib/supabase'
import LessonSelfAssessment from './LessonSelfAssessment'
import { EMOJI_STEPS } from './homeworkSteps'

export default function HomeworkAttemptPanel({ result, status, studentId, lessonRef, kind, onRetake }: {
  result?: HomeworkResult; status?: string; studentId: string; lessonRef: string; kind?: Lesson['kind'];
  onRetake?: (draft: BasicAnswersPayload) => void | Promise<void>
}) {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [answers, setAnswers] = useState<Record<string, BasicAnswersPayload>>({})
  const [older, setOlder] = useState<HomeworkAttempt[]>([])
  useEffect(() => {setOlder([]);setAnswers({});setError('')},[studentId,lessonRef])
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
    if (answers[id]) return
    const { data, error } = await supabase.from('homework_attempts').select('answers').eq('id',id).single()
    if (error) { setError(t('Не удалось загрузить ответы')); return }
    setAnswers(a => ({...a,[id]:data.answers}))
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
    {attemptCount > 0 && <details><summary style={{cursor:'pointer'}}>{t('История попыток')} · {attemptCount}</summary>
      <p style={{fontSize:12,color:'var(--color-muted)',margin:'8px 0'}}>{t('Для зачёта учитывается лучший проверенный результат.')}</p>
      {attempts.map(a => <details key={a.id} onToggle={e => {if (e.currentTarget.open) void read(a.id)}} style={{padding:'10px 0',borderTop:'1px solid var(--color-border)'}}>
        <summary style={{cursor:'pointer'}}>{t('Попытка')} {a.number} · {a.status === 'returned' ? t('Возвращено на доработку') : a.score === null ? t('На проверке') : `${a.score}%`} · {new Date(a.submitted_at).toLocaleDateString()}</summary>
        {a.review_comment && <p style={{whiteSpace:'pre-wrap',marginTop:8}}>{a.review_comment}</p>}
        {answers[a.id] && <p style={{fontSize:12,color:'var(--color-muted)',marginTop:8}}>
          {answers[a.id].selfAssessment
            ? `${t('Самооценка:')} ${EMOJI_STEPS[answers[a.id].selfAssessment!.value]?.emoji ?? ''} ${t(EMOJI_STEPS[answers[a.id].selfAssessment!.value]?.label ?? 'Самооценка не указана')}`
            : t('Самооценка не указана')}
        </p>}
        {answers[a.id]?.rows.map((r,i) => <div key={i} style={{marginTop:8,fontSize:13}}><strong>{r.n}. {r.prompt}</strong><p style={{whiteSpace:'pre-wrap'}}>{r.voice ? t('Голосовой ответ сохранён') : r.answer || t('Без ответа')}</p></div>)}
      </details>)}
      {attempts.length < attemptCount && <button type="button" disabled={busy} onClick={async () => {
        setBusy(true)
        try {
          let page = supabase.from('homework_attempts').select('id,number,status,score,passing_score,submitted_at,review_comment')
            .eq('student_id',studentId).eq('lesson_ref',lessonRef).order('number',{ascending:false}).limit(20)
          if (attempts.length) page = page.lt('number',Math.min(...attempts.map(a => a.number)))
          const {data,error} = await page
          if(error) throw error
          setOlder(a => [...a,...(data ?? []) as HomeworkAttempt[]])
        } catch {setError(t('Не удалось загрузить ответы'))} finally {setBusy(false)}
      }}>{t('Показать более ранние попытки')}</button>}
    </details>}
  </section>
}
