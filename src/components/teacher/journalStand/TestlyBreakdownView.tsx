import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { fetchTestlyBreakdown, testlyPoints, testlyResultsUrl } from '../../../lib/testlyModule'
import type { TestlyBreakdownSnapshot, TestlyQuestionBreakdown } from '../../../lib/testlyBreakdown'
import { breakdownSummary } from '../../../lib/testlyBreakdown'
import OpticalText from '../../OpticalText'
import { Check, ChevronDown, ChevronRight, ExternalLink, X as XIcon } from '../../icons/appIcons'
import './testlyBreakdown.css'

interface Props {
  testId: string
  testTitle: string
  studentId: string
  attemptKey?: string
  submittedAt?: string
  attemptNumber?: number
  got?: number
  max?: number
  filter: 'all' | 'errors'
}

export function TestlyBreakdownView({ testId, testTitle, studentId, attemptKey, submittedAt, attemptNumber, got, max, filter }: Props) {
  const [breakdown, setBreakdown] = useState<TestlyBreakdownSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchTestlyBreakdown(testId, studentId, attemptKey)
      .then(data => { if (!cancelled) setBreakdown({ ...data, attemptNumber: attemptNumber ?? 1, questions: (data.questions ?? []) as TestlyQuestionBreakdown[] }) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Не удалось загрузить разбор') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [testId, studentId, attemptKey])

  const scoreGot = breakdown?.got ?? got
  const scoreMax = breakdown?.max ?? max
  const title = breakdown?.testTitle ?? testTitle
  const submitted = breakdown?.submittedAt ?? submittedAt

  if (loading) return <div className="tb-loading">Загружаем разбор из Тестли…</div>
  if (error) return <div className="tb-error">{error}</div>
  if (!breakdown) return null

  const summary = breakdownSummary(breakdown.questions)
  const filtered = filter === 'errors'
    ? breakdown.questions.filter(q => q.status === 'wrong' || q.status === 'partial' || q.status === 'unanswered')
    : breakdown.questions

  const wrongAndPartial = filtered.filter(q => q.status === 'wrong' || q.status === 'partial')
  const unanswered = filtered.filter(q => q.status === 'unanswered')
  const correct = filtered.filter(q => q.status === 'correct')
  const showUnansweredCollapsed = unanswered.length > 3

  return <div className="tb-card">
    <header className="tb-header">
      <span className="tb-task-number">01</span>
      <div className="tb-title">
        <h4>Тест «{title}»</h4>
        {scoreGot != null && scoreMax != null && <span className={'tb-score' + (scoreGot / scoreMax < 0.8 ? ' tb-score-low' : '')}>{testlyPoints(scoreGot, scoreMax)}</span>}
      </div>
      <div className="tb-meta">
        {submitted && <span>Сдан {new Date(submitted).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{attemptNumber != null && attemptNumber > 1 ? ` · попытка ${attemptNumber}` : ''}</span>}
        <a data-hover="link" href={testlyResultsUrl(testId)} target="_blank" rel="noopener noreferrer">Разбор в Тестли <ExternalLink size={12} /></a>
      </div>
    </header>

    <div className="tb-chips">
      {summary.wrong.length + (breakdown.questions.filter(q => q.status === 'partial').length) > 0 && (
        <span className="tb-chip tb-chip-wrong"><XIcon size={11} /> Неверно {summary.wrong.length}</span>
      )}
      {summary.unanswered.length > 0 && (
        <span className="tb-chip tb-chip-unanswered">— Без ответа {summary.unanswered.length}</span>
      )}
      {summary.correct.length > 0 && (
        <span className="tb-chip tb-chip-correct"><Check size={11} /> Верно {summary.correct.length}</span>
      )}
      <span className="tb-chip-note">из Тестли · сохранено при сдаче</span>
    </div>

    {filter === 'errors' && !wrongAndPartial.length && !unanswered.length && (
      <p className="tb-no-errors">Неверных и частичных нет — все ошибки здесь пропуски.</p>
    )}

    <div className="tb-questions">
      {wrongAndPartial.map(q => <QuestionRow key={q.n} q={q} forTeacher />)}
      {correct.map(q => <QuestionRow key={q.n} q={q} forTeacher />)}
      {showUnansweredCollapsed
        ? <UnansweredGroup questions={unanswered} />
        : unanswered.map(q => <QuestionRow key={q.n} q={q} forTeacher />)}
    </div>
  </div>
}

function QuestionRow({ q, forTeacher }: { q: TestlyQuestionBreakdown; forTeacher?: boolean }) {
  const [open, setOpen] = useState(false)
  // Two complete lines; the full prompt opens with the card, not in a hover hint.
  const promptRef = useRef<HTMLParagraphElement>(null)
  const [clipped, setClipped] = useState(false)
  useLayoutEffect(() => {
    const el = promptRef.current
    if (!el || open || typeof ResizeObserver === 'undefined') return
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [open, q.prompt])
  const hasDetails = !!(q.image || q.explanation) || clipped || open
  const statusClass = q.status === 'correct' ? 'tb-q-correct' : q.status === 'partial' ? 'tb-q-partial' : q.status === 'wrong' ? 'tb-q-wrong' : 'tb-q-unanswered'

  return <div className={'tb-question ' + statusClass}>
    <header className="tb-q-header" role={hasDetails ? 'button' : undefined} tabIndex={hasDetails ? 0 : undefined} aria-expanded={hasDetails ? open : undefined}
      onClick={hasDetails ? () => setOpen(v => !v) : undefined}
      onKeyDown={hasDetails ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(v => !v) } } : undefined}>
      <span className={'tb-q-num ' + statusClass}>{q.n}</span>
      <div className="tb-q-body">
        <p ref={promptRef} className={'tb-q-prompt' + (open ? ' tb-q-prompt-open' : '')} title="" data-text-fade-mode="last-line">{q.prompt}</p>
        {forTeacher && (q.answer || q.correct) && (
          <p className="tb-q-answers">
            {q.answer && <><span className="tb-q-label">Ответ:</span> {q.answer}</>}
            {q.answer && q.correct && <> · </>}
            {q.correct && <><span className="tb-q-label tb-q-correct-label">Верно:</span> {q.correct}</>}
          </p>
        )}
        {!forTeacher && q.answer && (
          <p className="tb-q-answers"><span className="tb-q-label">Ваш ответ:</span> {q.answer}</p>
        )}
      </div>
      <span className={'tb-q-badge ' + statusClass}>
        {q.status === 'correct' ? <><Check size={11} /> {testlyPoints(q.got, q.max)}</> :
         q.status === 'unanswered' ? <>— {testlyPoints(q.got, q.max)}</> :
         <><XIcon size={11} /> {testlyPoints(q.got, q.max)}</>}
      </span>
      {hasDetails && (open ? <ChevronDown size={14} className="tb-q-chevron" /> : <ChevronRight size={14} className="tb-q-chevron" />)}
    </header>
    {open && hasDetails && <div className="tb-q-details">
      {q.image && <div className="tb-q-image"><img src={q.image} alt="Изображение к вопросу" /></div>}
      {q.explanation && <p className="tb-q-explanation">Пояснение из Тестли: {q.explanation}</p>}
    </div>}
  </div>
}

function UnansweredGroup({ questions }: { questions: TestlyQuestionBreakdown[] }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const totalPoints = questions.reduce((s, q) => s + q.max, 0)

  return <div className="tb-unanswered-group">
    <button type="button" className="tb-unanswered-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)}>
      <span className="tb-q-num tb-q-unanswered">—</span>
      <strong>Без ответа · {questions.length}</strong>
      <span className="tb-unanswered-points">0 из {totalPoints} балла</span>
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
    {open && <div id={id} className="tb-unanswered-chips" role="region" aria-label="Вопросы без ответа">
      {questions.map(q => <span key={q.n} className="tb-unanswered-chip">{q.n}</span>)}
    </div>}
  </div>
}

export function TestlyQuestionBar({ questions }: { questions: TestlyQuestionBreakdown[] }) {
  if (!questions.length) return null
  const summary = breakdownSummary(questions)
  const total = questions.length

  return <div className="tb-bar-section">
    <h4>По вопросам</h4>
    <div className="tb-bar" role="img" aria-label={`${summary.correct.length} верно, ${summary.wrong.length} неверно, ${summary.unanswered.length} без ответа из ${total}`}>
      {questions.map(q => <span key={q.n} className={
        q.status === 'correct' ? 'tb-bar-correct' : q.status === 'partial' ? 'tb-bar-partial' : q.status === 'wrong' ? 'tb-bar-wrong' : 'tb-bar-unanswered'
      } />)}
    </div>
    <p className="tb-bar-legend">
      {summary.correct.length} из {total} верно
      {summary.unanswered.length > 0 && <> · {summary.unanswered.length} без ответа</>}
      {' · '}{questions.reduce((s, q) => s + q.got, 0)} из {questions.reduce((s, q) => s + q.max, 0)} баллов
    </p>
  </div>
}
