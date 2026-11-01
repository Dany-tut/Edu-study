import { Check, ChevronDown, Loader2, Sparkles } from '../../icons/appIcons'
import type { AiGrade, AiGradeTask } from '../../../lib/useAiGrades'
import './aiReviewConcept.css'

export function aiReviewLabel(grade?: AiGrade): string {
  if (!grade) return ''
  if (grade.status === 'working' || grade.status === 'pending') return 'ИИ проверяет'
  if (grade.status === 'error') return 'Нужна ваша проверка'
  return 'Разбор ИИ готов'
}

export function AiReviewSummary({ grade, reviewed, busy, onApply, onDetails }: {
  grade: AiGrade; reviewed: boolean; busy: boolean
  onApply: () => void; onDetails: () => void
}) {
  const waiting = grade.status === 'pending' || grade.status === 'working'
  const issueCount = grade.tasks.filter(task => task.points < task.max_points).length
  return <section className="aic-summary" aria-label="Сводка проверки ИИ">
    <div className="aic-heading"><span><Sparkles size={14}/>Проверка ИИ</span><small>{waiting ? 'В процессе' : 'Готово'}</small></div>
    {waiting ? <div className="aic-waiting" role="status"><Loader2 size={20} className="animate-spin"/><strong>Читаем ответы и сверяем решение</strong><p>Здесь появится разбор. Можно проверять работу самостоятельно.</p></div>
      : <><div className="aic-recommendation"><div><span>Предложение ИИ</span><strong>{grade.score}<small>%</small></strong></div><span className={'aic-outcome' + (issueCount ? ' aic-outcome-warning' : '')}>{issueCount ? 'Есть замечание' : 'Всё верно'}</span></div>
        <p className="aic-summary-copy">{issueCount ? 'Ход решения верный. В задании 2 нужно исправить коэффициент.' : 'Оба задания выполнены верно. Замечаний к решению нет.'}</p>
        <div className="aic-summary-actions">{!reviewed && <button type="button" disabled={busy} onClick={onApply}><Check size={13}/>Применить оценку</button>}<button type="button" className="aic-text-button" onClick={onDetails}>К разбору ↓</button></div>
        {reviewed && <span className="aic-approved"><Check size={12}/>Итог утверждён преподавателем</span>}</>}
  </section>
}

export function AiTaskFeedback({ task }: { task: AiGradeTask }) {
  const issue = task.points < task.max_points
  return <section className={'aic-task-feedback' + (issue ? ' aic-task-issue' : '')} aria-label={'Разбор ИИ задания ' + task.n}>
    <div className="aic-task-heading"><span><Sparkles size={13}/>Разбор ИИ</span><span className="aic-task-verdict">{issue ? 'Нужно исправить' : 'Верно'}<b>{task.points} / {task.max_points}</b></span></div>
    <p>{task.comment}</p>
    <details className="aic-criteria"><summary>Почему такой результат<ChevronDown size={13}/></summary><div>{task.elements.map((element, index) => <div className="aic-criterion" key={index}><span className={element.counted ? 'aic-yes' : 'aic-no'}>{element.counted ? '✓' : '−'}</span><div><strong>{element.text}</strong>{element.quote && <blockquote>«{element.quote}»</blockquote>}<small>{element.ref}</small></div></div>)}</div></details>
    {task.note && <aside className="aic-teacher-note"><span>Только преподавателю</span><p>{task.note}</p></aside>}
  </section>
}

export function AiCommentDraft({ comment, busy, onUse }: { comment: string; busy: boolean; onUse: () => void }) {
  return <details className="aic-comment-draft">
    <summary><span><Sparkles size={13}/>Черновик от ИИ</span><ChevronDown size={13}/></summary>
    <p>{comment}</p>
    <button type="button" disabled={busy} onClick={onUse}>Вставить в комментарий</button>
    <small>Ученик увидит итог после завершения проверки</small>
  </details>
}
