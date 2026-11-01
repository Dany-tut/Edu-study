import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import type { HomeworkResult, HomeworkAttempt } from '../lib/homeworkResult'
import type { BasicAnswersPayload } from '../lib/basicAnswers'
import { supabase } from '../lib/supabase'
import HomeworkAttemptHistory from './HomeworkAttemptHistory'

export default function HomeworkAttemptHistorySection({ result, studentId, lessonRef, authorName }: {
  result?: HomeworkResult; studentId: string; lessonRef: string; authorName?: string
}) {
  const t = useT()
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
  return <section aria-label={t('История попыток')}>
    <HomeworkAttemptHistory key={`${studentId}:${lessonRef}`} authorName={authorName} attempts={attempts} attemptCount={attemptCount}
      answers={answers} reading={reading} readErrors={readErrors} loadingOlder={loadingOlder}
      onRead={id => { void read(id) }} onLoadOlder={() => { void loadOlder() }} />
    {error && <p role="alert" style={{ color: 'var(--color-red-text)' }}>{error}</p>}
  </section>
}
