import { Check, ChevronDown, Loader2, Sparkles, ArrowDown } from '../../icons/appIcons'
import type { AiGrade, AiGradeTask } from '../../../lib/useAiGrades'
import './aiReviewConcept.css'
import { Alert } from '../../Alert'
import { homeworkAiIssue } from '../../../lib/homeworkAiState'

export function aiReviewLabel(grade?: AiGrade): string {
  if (!grade) return ''
  if (grade.status === 'working' || grade.status === 'pending') return 'ИИ проверяет'
  if (grade.status === 'error' || grade.status === 'skipped') return 'Нужно внимание'
  return 'Разбор ИИ готов'
}

export function AiReviewSummary({ grade, reviewed, busy, onApply, onDetails, onRequest, requestError = '', loading = false }: {
  grade?: AiGrade; reviewed: boolean; busy: boolean; loading?: boolean; requestError?: string
  onApply?: () => void; onDetails: () => void; onRequest?: () => void
}) {
  const waiting = grade?.status === 'pending' || grade?.status === 'working'
  const errorCode = requestError || (grade?.status === 'error' ? grade.error : grade?.status === 'skipped' ? 'missing_evidence' : '')
  const issue = errorCode ? homeworkAiIssue(errorCode) : null
  const tasks = grade?.tasks ?? []
  const issues = tasks.filter(task => task.elements.some(element => element.verdict !== 'yes') || task.max_points > task.points)
  const hasScore = grade?.score != null && (grade.max ?? 0) > 0
  const ready = grade && ['graded','confirmed','changed','dismissed'].includes(grade.status)
  return <section className={'aic-summary' + (issue ? ' aic-summary-notice' : '')} aria-label="Сводка проверки ИИ">
    <div className="aic-heading"><span><Sparkles size={14}/>Проверка ИИ</span><small>{issue ? 'Нужно внимание' : loading || busy ? 'Подключаемся' : waiting ? grade?.status === 'pending' ? 'В очереди' : 'В процессе' : ready ? 'Готово' : ''}</small></div>
    {issue ? <div className="aic-issue"><Alert stacked tone={['configuration','disabled','missing_evidence'].includes(errorCode) ? 'info' : 'danger'} title={issue.title} text={issue.text} style={{boxShadow:'none',background:'transparent'}}/>
      {grade?.nextRetryAt && <p className="aic-retry-hint">Повторим автоматически после паузы сервиса.</p>}
      {onRequest && <button data-hover="layer" type="button" className="aic-retry-button" disabled={busy} onClick={onRequest}>{busy ? 'Подключаемся…' : issue.retry ? 'Повторить проверку' : 'Попробовать снова'}</button>}</div>
      : waiting || loading || busy ? <div className="aic-waiting" role="status"><Loader2 size={20} className="animate-spin"/><strong>{grade?.status === 'pending' ? 'Работа в очереди на проверку' : 'Читаем ответы и сверяем решение'}</strong><p>Разбор появится здесь автоматически. Можно продолжить проверку самостоятельно.</p></div>
      : !ready ? <div className="aic-waiting"><strong>Подготовить разбор работы</strong><p>ИИ проверит ответы и подготовит комментарий. Итог утверждаете вы.</p>{onRequest&&!reviewed&&<button data-hover="layer" className="aic-retry-button" type="button" disabled={busy} onClick={onRequest}>Проверить с ИИ</button>}</div>
      : <>{hasScore && <div className="aic-recommendation"><strong>{grade.score}<small>%</small></strong><span className={'aic-outcome' + (issues.length ? ' aic-outcome-warning' : '')}>{issues.length ? 'Есть замечания' : 'Без замечаний'}</span></div>}
        {hasScore && <p className="aic-score-scope">{grade.primary} / {grade.max} баллов за задания с критериями</p>}
        <p className="aic-summary-copy">{issues.length ? 'Посмотрите замечания к заданиям: ' + issues.map(task=>task.n).join(', ') + '.' : 'Разбор готов. Проверьте комментарии к ответам.'}{!hasScore ? ' Итоговую оценку выставляет преподаватель.' : ''}</p>
        <div className="aic-summary-actions">{!reviewed && hasScore && onApply && <button data-hover="layer" type="button" disabled={busy} onClick={onApply}><Check size={13}/>Применить оценку</button>}<button data-hover="layer" type="button" className="aic-text-button" onClick={onDetails}>К разбору<ArrowDown size={12}/></button></div>
        {grade.teacherNote && <aside className="aic-teacher-note"><span>Только преподавателю</span><p>{grade.teacherNote}</p></aside>}
        {reviewed && <span className="aic-approved"><Check size={12}/>Решение сохранено преподавателем</span>}</>}
  </section>
}

export function AiTaskFeedback({ task }: { task: AiGradeTask }) {
  const issue = task.elements.some(element => element.verdict !== 'yes') || task.points < task.max_points
  return <section className={'aic-task-feedback' + (issue ? ' aic-task-issue' : '')} aria-label={'Разбор ИИ задания ' + task.n}>
    <div className="aic-task-heading"><span><span className="aic-task-icon"><Sparkles size={13}/></span>Комментарий ИИ</span><span className="aic-task-verdict">{issue ? 'Есть замечание' : task.elements.length ? 'По эталону' : 'Комментарий'}{task.max_points>0&&<b>{task.points} / {task.max_points}</b>}</span></div>
    <p>{task.comment}</p>
    <details className="aic-criteria"><summary>Почему такой результат<ChevronDown size={13}/></summary><div>{task.elements.map((element, index) => <div className="aic-criterion" key={index}><span className={element.counted ? 'aic-yes' : 'aic-no'}>{element.counted ? '✓' : '−'}</span><div><strong>{element.text}</strong>{element.quote && <blockquote>«{element.quote}»</blockquote>}<small>{element.ref}</small></div></div>)}</div></details>
    {task.note && <aside className="aic-teacher-note"><span>Только преподавателю</span><p>{task.note}</p></aside>}
  </section>
}

export function AiCommentDraft({ comment, busy, onUse }: { comment: string; busy: boolean; onUse: () => void }) {
  return <details className="aic-comment-draft">
    <summary><span><Sparkles size={13}/>Черновик от ИИ</span><ChevronDown size={13}/></summary>
    <p>{comment}</p>
    <button data-hover="layer" type="button" disabled={busy} onClick={onUse}>Вставить в комментарий</button>
    <small>Ученик увидит итог после завершения проверки</small>
  </details>
}
