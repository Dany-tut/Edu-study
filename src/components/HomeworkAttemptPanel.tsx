import { useEffect, useRef, useState } from 'react'
import { confirmWaveReady, markWaveSeen, preloadConfirmWave, WAVE_PALETTES, waveSeen } from '../lib/confirmWave'
import { useConfirmWave } from '../lib/confirmWave/useConfirmWave'
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
  // Кольцо «Принято»: учитель зачёл работу — ученик видит это кольцом один раз,
  // сразу по realtime или при следующем открытии. Перед волной заголовок ещё
  // показывает то, что ученик видел последним: «На проверке у преподавателя».
  const verdictKey = result && result.grading === 'teacher' && result.passed && !result.pending && !result.draft
    && result.attemptId && status !== 'returned' ? `${lessonRef}:${result.attemptId}` : null
  const [introKey, setIntroKey] = useState<string | null>(() => (verdictKey && !verdictSeen(verdictKey) ? verdictKey : null))
  if (verdictKey && verdictKey !== introKey && !verdictSeen(verdictKey)) setIntroKey(verdictKey)
  const intro = !!verdictKey && introKey === verdictKey && !verdictSeen(verdictKey)
  const wave = useConfirmWave<HTMLElement, HTMLDivElement>()
  const headingRef = useRef<HTMLElement>(null)
  const [, rerender] = useState(0)
  useEffect(() => {
    if (!intro || !verdictKey) return
    let gone = false
    void preloadConfirmWave().then(() => {
      if (gone) return
      markVerdictSeen(verdictKey)
      const handle = confirmWaveReady()
        ? wave.begin({ type: 'center', source: headingRef.current, palette: WAVE_PALETTES.ogonek, cornerRadius: 20 })
        : null
      rerender(n => n + 1)
      handle?.play()
    })
    return () => { gone = true }
  }, [intro, verdictKey, wave])
  if (!result || (!result.attemptId && !result.pending && result.percent === null)) return null
  const score = homeworkDisplayScore(result)
  let heading = t('Работа отправлена')
  if (status === 'returned') heading = t('Возвращено на доработку')
  else if (result.draft) heading = t('Новая попытка начата')
  else if (result.pending) heading = t('На проверке у преподавателя')
  else if (intro) heading = t('На проверке у преподавателя')
  else if (score !== null) heading = `${t(gradedWorkLabel(score >= result.passingScore, kind))} · ${score}%`
  async function retry() {
    if (busy || !result || !canRetakeHomework(result, status)) return
    setBusy(true); setError('')
    try { await onRetake?.(await startHomeworkRetake(studentId, lessonRef, result.attemptId ?? null)) }
    catch { setError(t('Не удалось начать попытку. Предыдущая работа сохранена. Попробуй ещё раз.')) }
    finally { setBusy(false) }
  }
  return <section ref={wave.hostRef} aria-label={t('Результат ДЗ')} style={{padding:'16px 0'}}>
    <div ref={wave.liveRef} style={{display:'flex',flexDirection:'column',gap:12}}>
    <strong ref={headingRef} style={{alignSelf:'flex-start',color: result.pending || intro ? 'var(--color-peach-text)' : result.passed ? 'var(--color-green-text)' : 'var(--color-text)'}}>
      {heading}
    </strong>
    {result.pending && <p>{t('Итоговый результат появится после проверки всей работы.')}</p>}
    <LessonSelfAssessment key={`${lessonRef}:${result.attemptId}`} readOnly={readOnly} lessonId={lessonRef} studentId={studentId} status={status} result={result} />
    {status !== 'returned' && !result.pending && !result.draft && score !== null && score < result.passingScore && <p>{t('Ниже проходного балла')} · {t('порог')} {result.passingScore}%</p>}
    {onRetake && canRetakeHomework(result,status) && <button data-hover="layer" type="button" onClick={retry} disabled={busy} style={{padding:'12px 18px',borderRadius:14,border:0,background:'var(--grad-purple)',color:'#fff',fontWeight:700,cursor:'pointer'}}>{busy ? t('Открываем попытку…') : t('Пройти заново')}</button>}
    {error && <p role="alert" style={{color:'var(--color-red-text)'}}>{error}</p>}
    </div>
  </section>
}


const verdictSeen = (key: string) => waveSeen('verdicts', key)
const markVerdictSeen = (key: string) => markWaveSeen('verdicts', key)
