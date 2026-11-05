import { Check, X, Clock, Pause, ChevronLeft, ChevronRight, CircleHelp } from './icons/appIcons'
import { OverlayScrollArea } from './teacher/OverlayScroll'
import FadeText from './FadeText'
import HomeWidgetObject from './HomeWidgetObject'
import { useT } from '../lib/i18n'
import { quizTimeLimit, type QuizAnswer, type QuizQuestion } from '../data/mockData'
import './quizDialog.css'

type State = 'preview' | 'active' | 'answered' | 'timeout' | 'done'
type Result = 'correct' | 'wrong' | 'timeout'
export default function QuizDialogContent({ state, question, answers, current, questions, timeLeft, selected, results, resumeIndex, onStart, onStop, onAnswer, onNavigate, onNext, onRestart, liveIndex }: {
  state: State; question: QuizQuestion; answers: QuizAnswer[]; current: number; questions: QuizQuestion[]
  timeLeft: number; selected: string | null; results: (Result | undefined)[]; resumeIndex: number; liveIndex: number
  onStart: () => void; onStop: () => void; onAnswer: (id: string) => void; onNavigate: (index: number) => void; onNext: () => void; onRestart: () => void
}) {
  const t = useT()
  const total = questions.length
  const playing = state !== 'preview' && state !== 'done'
  const revealed = state === 'answered' || state === 'timeout'
  const correct = results.filter(result => result === 'correct').length
  const answer = answers.find(item => item.correct)
  const feedback = state === 'timeout' ? 'timeout' : revealed ? results[current] : undefined
  // Точки помещаются в 150 px до ~24 вопросов; длиннее — обычная полоска.
  const showDots = total <= 24
  const canOpen = (index: number) => index !== current && (results[index] !== undefined || index === liveIndex)
  const FeedbackIcon = feedback === 'correct' ? Check : feedback === 'wrong' ? X : feedback === 'timeout' ? Clock : CircleHelp
  return <div className="quiz-dialog" data-quiz-state={state}>
    <div className="qd-stage">
      {playing ? <div className="qd-playing">
        <header className="qd-question-heading">
          <div className="qd-toolbar">
            <span className="qd-subject"><FadeText>{question.subject}</FadeText></span>
            <div className="qd-timer" data-urgent={timeLeft <= 5}><Clock size={17}/><span>{timeLeft} {t('сек')}</span></div>
            <button type="button" className="qd-icon-button" onClick={onStop} aria-label={t('Остановить')}><Pause size={19}/></button>
          </div>
          <OverlayScrollArea key={`question-${question.id}`} showScrollbar={false} className="qd-question-scroll" style={{ minHeight: 0 }}>
            <h3 className="qd-question-text">{question.title}</h3>
          </OverlayScrollArea>
        </header>
        <OverlayScrollArea key={`answers-${question.id}`} showScrollbar={false} className="qd-options-scroll" style={{ minHeight: 0 }}>
          <div className="qd-options">
            {answers.map((item, index) => {
              const tone = revealed && item.correct ? 'correct' : revealed && item.id === selected ? 'wrong' : 'neutral'
              return <button type="button" key={item.id} className="qd-answer" data-tone={tone} disabled={revealed} onClick={() => onAnswer(item.id)}>
                <span className="qd-answer-mark" aria-hidden="true">{tone === 'correct' ? <Check size={20}/> : tone === 'wrong' ? <X size={20}/> : index + 1}</span>
                <span className="qd-answer-text">{item.text}</span>
              </button>
            })}
          </div>
        </OverlayScrollArea>
      </div> : <div className="qd-intro">
        <div className="qd-art"><HomeWidgetObject id={state === 'done' ? 8 : 6}/></div>
        <h3>{state === 'done' ? t('Результат') : t('Викторина дня')}</h3>
        {state === 'done' ? <><strong className="qd-score">{correct}<span> / {total}</span></strong><p>{t('правильных ответов')}</p></> : <p>{total ? `${total} ${total === 1 ? t('вопрос') : total <= 4 ? t('вопроса') : t('вопросов')} · ${quizTimeLimit} ${t('сек на каждый')}` : t('Нет данных')}</p>}
      </div>}
    </div>
    <div className="qd-feedback" data-tone={feedback ?? 'neutral'} data-summary={!playing} role="status" aria-live="polite" aria-atomic="true">
      {playing ? <><span className="qd-feedback-icon" aria-hidden="true"><FeedbackIcon size={21}/></span><div className="qd-feedback-copy"><strong>{feedback === 'correct' ? t('Верно') : feedback === 'wrong' ? t('Неверно') : feedback === 'timeout' ? t('Время вышло') : t('Выбери ответ')}</strong>{revealed && feedback !== 'correct' && answer && <FadeText>{`${t('Правильный ответ')}: ${answer.text}`}</FadeText>}</div></> : state === 'done' ? <span>{total ? Math.round(correct / total * 100) : 0}%</span> : resumeIndex > 0 ? <span>{t('Остановлено на вопросе')} {resumeIndex + 1} {t('из')} {total}</span> : null}
    </div>
    <footer className="qd-navigation">
      {playing ? <>
        <button type="button" className="qd-icon-button" disabled={current === 0 || results[current - 1] === undefined} onClick={() => onNavigate(current - 1)} aria-label={t('Предыдущий вопрос')}><ChevronLeft size={21}/></button>
        <div className="qd-progress-control">
          <span className="qd-counter" aria-label={`${t('Вопрос')} ${current + 1} ${t('из')} ${total}`}>{current + 1} / {total}</span>
          {showDots ? <div className="qd-dots">
            {questions.map((item, index) => <button type="button" key={item.id} className="qd-dot" data-result={results[index] ?? 'pending'} data-current={index === current} disabled={!canOpen(index)} onClick={() => onNavigate(index)} aria-label={`${t('Вопрос')} ${index + 1}`} aria-current={index === current ? 'step' : undefined}/>)}
          </div> : <div className="qd-progress" aria-hidden="true"><span style={{ width: `${total ? (current + 1) / total * 100 : 0}%` }}/></div>}
        </div>
        <button type="button" className="qd-next" disabled={!revealed} onClick={onNext}>{t('Дальше')}<ChevronRight size={19}/></button>
      </> : <button type="button" className="qd-primary" disabled={!total} onClick={state === 'done' ? onRestart : onStart}>{state === 'done' ? t('Начать заново') : resumeIndex > 0 ? t('Продолжить') : t('Начать')}<ChevronRight size={19}/></button>}
    </footer>
  </div>
}
