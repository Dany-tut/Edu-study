import { useId, useState } from 'react'
import { ChevronDown, Check, Clock, FileText, MessagesSquare, Loader2, MessageCircle, RotateCcw, Send } from './icons/appIcons'
import { useLang, useT } from '../lib/i18n'
import type { HomeworkAttempt } from '../lib/homeworkResult'
import type { BasicAnswersPayload } from '../lib/basicAnswers'
import { EMOJI_STEPS } from './homeworkSteps'
import './homeworkAttemptHistory.css'

type Props = {
  attempts: HomeworkAttempt[]
  attemptCount: number
  answers: Record<string, BasicAnswersPayload>
  reading: Record<string, boolean>
  readErrors: Record<string, string>
  loadingOlder: boolean
  onRead: (id: string) => void
  onLoadOlder: () => void
}

/** A submission and its teacher reply stay together, like a conversation. */
export default function HomeworkAttemptHistory({ attempts, attemptCount, answers, reading, readErrors, loadingOlder, onRead, onLoadOlder }: Props) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const id = useId()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const ordered = [...attempts].sort((a, b) => a.number - b.number)
  const locale = lang === 'en' ? 'en-GB' : 'ru-RU'
  const stamp = (date: string) => new Date(date).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  if (!attemptCount) return null

  return <section className="hw-history" aria-label={t('История попыток')}>
    <button type="button" className="hw-history-toggle" aria-expanded={open} aria-controls={`${id}-thread`} onClick={() => setOpen(value => !value)}>
      <span className="hw-history-symbol" aria-hidden="true"><MessagesSquare size={20} /></span>
      <span className="hw-history-heading"><strong>{t('История попыток')}</strong><span>{t('Сдачи и комментарии преподавателя')}</span></span>
      <span className="hw-history-count">{attemptCount}</span>
      <ChevronDown className="hw-history-chevron" size={20} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-thread`} className="hw-history-thread">
      <p className="hw-history-note">{t('Для зачёта учитывается лучший проверенный результат.')}</p>
      {attempts.length < attemptCount && <button type="button" className="hw-history-older" disabled={loadingOlder} onClick={onLoadOlder}>
        {loadingOlder ? <Loader2 className="hw-history-spinner" size={15} aria-hidden="true" /> : <Clock size={15} aria-hidden="true" />}
        {t('Показать более ранние попытки')}
      </button>}
      <ol className="hw-history-list">
        {ordered.map(attempt => {
          const returned = attempt.status === 'returned'
          const pending = attempt.score === null
          const passed = !returned && !pending && attempt.score! >= attempt.passing_score
          const tone = returned ? 'returned' : pending ? 'pending' : passed ? 'passed' : 'low'
          const StatusIcon = returned ? RotateCcw : pending ? Clock : passed ? Check : FileText
          const label = returned ? t('На доработке') : pending ? t('На проверке') : passed ? t('Зачтено') : t('Не зачтено')
          const payload = answers[attempt.id]
          const assessment = payload?.selfAssessment && EMOJI_STEPS[payload.selfAssessment.value]
          const expandedId = `${id}-${attempt.id}`
          return <li key={attempt.id} className="hw-history-exchange">
            <div className="hw-history-message hw-history-message-student">
              <div className="hw-history-bubble hw-history-submission">
                <div className="hw-history-meta"><span>{t('Моя работа')}</span><time dateTime={attempt.submitted_at}>{stamp(attempt.submitted_at)}</time></div>
                <div className="hw-history-result">
                  <strong>{t('Попытка')} {attempt.number}</strong>
                  <span className={`hw-history-score hw-history-score-${tone}`}>
                    <StatusIcon size={14} aria-hidden="true" />{attempt.score !== null ? `${attempt.score}%` : label}
                  </span>
                </div>
                <p className="hw-history-state">{pending && !returned ? t('Работа отправлена') : label}</p>
                <button type="button" className="hw-history-answers-toggle" aria-expanded={!!expanded[attempt.id]} aria-controls={expandedId} onClick={() => {
                  const next = !expanded[attempt.id]
                  setExpanded(before => ({ ...before, [attempt.id]: next }))
                  if (next) onRead(attempt.id)
                }}>
                  <FileText size={15} aria-hidden="true" /><span>{t('Ответы в этой попытке')}</span><ChevronDown size={16} className="hw-history-chevron" aria-hidden="true" />
                </button>
                {expanded[attempt.id] && <div id={expandedId} className="hw-history-answers" aria-busy={!!reading[attempt.id]}>
                  {reading[attempt.id] && <p className="hw-history-loading" role="status"><Loader2 className="hw-history-spinner" size={15} aria-hidden="true" />{t('Загружаем ответы…')}</p>}
                  {readErrors[attempt.id] && <div className="hw-history-read-error" role="alert"><span>{readErrors[attempt.id]}</span><button type="button" onClick={() => onRead(attempt.id)}>{t('Попробовать ещё раз')}</button></div>}
                  {payload && <>
                    <p className="hw-history-assessment">{assessment ? <>{assessment.emoji} {t(assessment.label)}</> : t('Самооценка не указана')}</p>
                    {payload.rows.map((row, i) => <div key={`${row.n}-${i}`} className="hw-history-answer">
                      <strong><span className="hw-history-question-number">{row.n}</span>{row.prompt}</strong>
                      <p>{row.voice ? t('Голосовой ответ сохранён') : row.answer || t('Без ответа')}</p>
                      {row.testly?.got != null && row.testly.max != null && <span className="hw-history-testly-score">{row.testly.got} / {row.testly.max} · {t('Тестли')}</span>}
                    </div>)}
                  </>}
                </div>}
              </div>
              <span className="hw-history-avatar hw-history-avatar-student" aria-hidden="true"><Send size={15} /></span>
            </div>
            {attempt.review_comment && <div className="hw-history-message hw-history-message-teacher">
              <span className="hw-history-avatar hw-history-avatar-teacher" aria-hidden="true"><MessageCircle size={16} /></span>
              <div className="hw-history-bubble hw-history-reply"><span className="hw-history-teacher-label">{t('Преподаватель')}</span><blockquote>{attempt.review_comment}</blockquote></div>
            </div>}
          </li>
        })}
      </ol>
    </div>}
  </section>
}
