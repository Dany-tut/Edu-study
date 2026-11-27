import { useEffect, useState } from 'react'
import OpticalText from './OpticalText'
import { Check, RefreshCw, RotateCcw, X as XIcon } from './icons/appIcons'
import { fetchStudentBreakdown, startTestlyRetake, testlyPoints, TESTLY_SITE } from '../lib/testlyModule'
import { useT } from '../lib/i18n'
import './testlyMistakesPanel.css'

const MAX_RETAKES = 3

interface StudentQuestion {
  n: number; prompt: string; answer: string; got: number; max: number; status: string
}

interface Props {
  testId: string
  testTitle: string
  owner?: string
  attemptKey?: string
  submittedAt?: string
  attemptNumber?: number
  got?: number
  max?: number
  retakeCount: number
  onRetakeStarted?: (url: string) => void
}

export default function TestlyMistakesPanel({ testId, testTitle, owner, attemptKey, submittedAt, attemptNumber, got, max, retakeCount, onRetakeStarted }: Props) {
  const t = useT()
  const [questions, setQuestions] = useState<StudentQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retakeBusy, setRetakeBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchStudentBreakdown(testId, owner, attemptKey)
      .then(data => { if (!cancelled) setQuestions(data.questions ?? []) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить разбор') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [testId, owner, attemptKey])

  const wrong = questions.filter(q => q.status === 'wrong' || q.status === 'partial')
  const unanswered = questions.filter(q => q.status === 'unanswered')
  const correct = questions.filter(q => q.status === 'correct')
  const mistakeNs = [...wrong, ...unanswered].map(q => q.n)
  const retakesLeft = Math.max(0, MAX_RETAKES - retakeCount)
  const canRetake = retakesLeft > 0 && mistakeNs.length > 0

  async function handleRetake() {
    if (!canRetake || retakeBusy) return
    setRetakeBusy(true)
    try {
      const { path } = await startTestlyRetake(testId, mistakeNs, owner, attemptKey)
      onRetakeStarted?.(TESTLY_SITE + path)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать перерешивание')
    } finally { setRetakeBusy(false) }
  }

  if (loading) return <div className="tmp-loading">{t('Загружаем разбор…')}</div>
  if (error && !questions.length) return <div className="tmp-error">{error}</div>

  return <div className="tmp-panel">
    <header className="tmp-header">
      <span className="tmp-task-num">01</span>
      <h4>{t('Тест')} «{testTitle}»</h4>
      {got != null && max != null && <span className={'tmp-score' + (got / max < 0.8 ? ' tmp-score-low' : '')}>{testlyPoints(got, max)}</span>}
    </header>

    {submittedAt && <p className="tmp-meta">
      {t('Сдан')} {new Date(submittedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
      {attemptNumber != null && attemptNumber > 1 ? ` · ${t('попытка')} ${attemptNumber}` : ''}
    </p>}

    <div className="tmp-chips">
      {wrong.length > 0 && <span className="tmp-chip tmp-chip-wrong"><XIcon size={11} /> {t('Ошибки')} {wrong.length}</span>}
      {correct.length > 0 && <span className="tmp-chip tmp-chip-correct"><Check size={11} /> {t('Верно')} {correct.length}</span>}
    </div>

    <div className="tmp-questions">
      {questions.map(q => {
        const isWrong = q.status === 'wrong' || q.status === 'partial' || q.status === 'unanswered'
        return <div key={q.n} className={'tmp-q' + (isWrong ? ' tmp-q-wrong' : '')}>
          <span className={'tmp-q-num' + (isWrong ? ' tmp-q-num-wrong' : ' tmp-q-num-correct')}>{q.n}</span>
          <div className="tmp-q-body">
            <p className="tmp-q-prompt">{q.prompt}</p>
            {q.answer && <p className="tmp-q-answer">{t('Ваш ответ:')} {q.answer}</p>}
          </div>
          <span className={'tmp-q-badge' + (isWrong ? ' tmp-badge-wrong' : ' tmp-badge-correct')}>
            {q.status === 'correct' ? <><Check size={11} /> {testlyPoints(q.got, q.max)}</> :
             q.status === 'unanswered' ? <>— {t('Без ответа')}</> :
             <><XIcon size={11} /> {t('Неверно')}</>}
          </span>
        </div>
      })}
    </div>

    <p className="tmp-note">{t('Верный ответ на ошибку не показываем — перерешайте её.')}</p>

    <div className="tmp-actions">
      <button type="button" className="tmp-retake-btn" disabled={!canRetake || retakeBusy} onClick={handleRetake}>
        <RotateCcw size={16} />
        <OpticalText as="iskra-button-label">{retakeBusy ? t('Открываем…') : t('Перерешать ошибки')}</OpticalText>
        <span className="tmp-retake-count">{t('ещё')} {retakesLeft} {t('из')} {MAX_RETAKES}</span>
      </button>
      <a href={`${TESTLY_SITE}/t/${testId}`} target="_blank" rel="noopener noreferrer" className="tmp-retest-btn">
        <RefreshCw size={16} />
        <OpticalText as="iskra-button-label">{t('Пройти тест заново')}</OpticalText>
      </a>
    </div>

    {retakesLeft === 0 && <div className="tmp-limit-notice">{t('Попытки перерешать закончились. Напишите преподавателю — он может открыть ещё.')}</div>}
    {error && <p className="tmp-error" role="alert">{error}</p>}
  </div>
}
