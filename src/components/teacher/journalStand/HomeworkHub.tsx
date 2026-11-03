import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Modal from '../../Modal'
import { useScrollFades } from '../../../lib/useScrollFades'
import BasicAnswersList from '../BasicAnswersList'
import { ArrowLeft, ArrowRight, Check, ChevronRight, ClipboardList, ExternalLink, Home, Maximize2, Minimize as Minimize2, Search, X } from '../../icons/appIcons'
import type { CourseJournalData, JournalAttempt } from '../../../lib/courseJournal'
import { parseBasicAnswers } from '../../../lib/basicAnswers'
import { sameLearner } from './studentWorks'
import { homeworkEntries, needsReview, reviewQueue, workDueLabel, type HomeworkEntry, type ReviewDecision, type SaveReview } from './homeworkStand'
import type { ReviewHandoff } from './homeworkReviewHandoff'
import { useHomeworkCardAi } from '../../../lib/useHomeworkCardAi'
import { confirmAiGrade } from '../../../lib/useAiGrades'
import { AiReviewSummary, AiTaskFeedback, AiCommentDraft } from './AiReviewConcept'
import './homeworkHub.css'
import './homeworkReview.css'

export type HomeworkPage = 'home' | 'journal' | 'review'
type Target = { keys: string[]; selected: string; queue: boolean; title: string }
export function HomeworkStatus({ entry, action = false }: { entry: HomeworkEntry; action?: boolean }) {
  const w = entry.work
  const tone = w.status === 'Зачтено' ? 'passed' : ['На проверке', 'На доработке'].includes(w.status) ? 'pending'
    : ['Ниже порога', 'Просрочено'].includes(w.status) ? 'low' : ''
  return <span className={'cj-badge cj-' + tone}>{needsReview(entry) ? action ? 'Проверить' : 'На проверке'
    : w.score === null || ['На доработке', 'Пересдача'].includes(w.status) ? w.status : w.score + '%'}</span>
}
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(s => s[0]).join('')
const countLabel = (n: number) => n % 100 >= 11 && n % 100 <= 14 ? 'работ' : n % 10 === 1 ? 'работа' : n % 10 >= 2 && n % 10 <= 4 ? 'работы' : 'работ'

function HomeworkHistory({ attempts }: { attempts: JournalAttempt[] }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <section className={'jh-review-history' + (open ? ' jh-history-open' : '')}>
    <button type="button" className="jh-history-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      <span>История попыток</span><span className="jh-history-count">{attempts.length}</span><ChevronRight className="jh-history-chevron" size={14} aria-hidden="true"/>
    </button>
    <div id={id} className="jh-history-list" hidden={!open} role="region" aria-label="Попытки сдачи" tabIndex={open ? 0 : -1}>
      {attempts.map(a => <div className="jh-history-attempt" key={a.id}>
        <div className="jh-history-attempt-heading"><strong>Попытка {a.number}</strong><span>{a.status === 'returned' ? 'На доработке' : a.status === 'submitted' ? 'На проверке' : a.score == null ? 'Без балла' : a.score + '%'}</span></div>
        {Number.isFinite(Date.parse(a.submitted_at)) && <time dateTime={a.submitted_at}>{new Date(a.submitted_at).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time>}
        {a.review_comment && <p>{a.review_comment}</p>}
      </div>)}
    </div>
  </section>
}

export function useHomeworkHub(data: CourseJournalData | null, today: string, onSave: SaveReview, onLocate?: (entry: HomeworkEntry) => void,
  onFullReview?: (entry: HomeworkEntry, draft: ReviewHandoff) => boolean) {
  const items = useMemo(() => data ? homeworkEntries(data, today) : [], [data, today])
  const queue = useMemo(() => reviewQueue(items), [items])
  const [target, setTarget] = useState<Target | null>(null)
  function openStudent(studentId: string, workRef: string) {
    const student = data?.students.find(s => s.id === studentId)
    const entry = items.find(e => e.work.slot.ref === workRef && (e.student.id === studentId || (student && sameLearner(e.student, student))))
    if (entry) setTarget({ keys: [entry.key], selected: entry.key, queue: false, title: entry.work.slot.title })
  }
  function openAssignment(workRef: string, studentIds: string[]) {
    const students = data?.students.filter(s => studentIds.includes(s.id)) ?? []
    const stack = items.filter(e => e.work.slot.ref === workRef && students.some(s => sameLearner(s, e.student)))
    const first = stack.find(needsReview) ?? stack.find(e => e.work.submitted) ?? stack[0]
    if (first) setTarget({ keys: stack.map(e => e.key), selected: first.key, queue: false, title: first.work.slot.title })
  }
  function openQueue(entry?: HomeworkEntry, groupId?: string) {
    const stack = queue.filter(e => groupId === undefined || e.student.groupId === groupId)
    const first = entry ?? stack[0]
    if (first) setTarget({ keys: stack.map(e => e.key), selected: first.key, queue: true, title: 'Очередь проверки' })
  }
  return { items, queue, openStudent, openAssignment, openQueue,
    dialog: <HomeworkDialog data={data} items={items} target={target} setTarget={setTarget} onSave={onSave} onLocate={onLocate} onFullReview={onFullReview} /> }
}

export function HomeworkNavigation({ page, count, onChange }: { page: HomeworkPage; count: number; onChange: (page: HomeworkPage) => void }) {
  return <nav className="jh-navigation course-journal" aria-label="Разделы стенда">
    <strong>Искра</strong>
    {([['home', 'Главная', Home], ['journal', 'Журнал', ClipboardList], ['review', 'Проверка', Check]] as const).map(([id, label, Icon]) =>
      <button type="button" key={id} className="cj-button" aria-pressed={page === id} onClick={() => onChange(id)}>
        <Icon size={15} />{label}{id === 'review' && count > 0 && <span className="jh-count">{count}</span>}
      </button>)}
  </nav>
}

export function HomeworkTasks({ queue, groups, onQueue }: {
  queue: HomeworkEntry[]; groups: CourseJournalData['groups']; onQueue: (groupId?: string) => void
}) {
  const byGroup = [...new Set(queue.map(e => e.student.groupId))]
  return <section className="course-journal jh-tasks" aria-label="Задачи на главной">
    <div className="jh-heading"><h1>Сегодня</h1><span>Учебные задачи</span></div>
    <div className="jh-surface"><h2>Задачи</h2>
      {queue.length ? <>
        <div className="jh-task"><span className="jh-count">{queue.length}</span><div><h3>Проверить домашки</h3>
          <p>{queue.length} {countLabel(queue.length)} на проверке · все группы</p></div>
          <button type="button" className="cj-button jh-review-button" onClick={() => onQueue()}>Проверить</button></div>
        {byGroup.map(id => <div className="jh-task" key={id || 'direct'}><div><h3>{groups.find(g => g.id === id)?.name ?? 'Индивидуальные ученики'}</h3>
          <p>На проверке: {queue.filter(e => e.student.groupId === id).length}</p></div>
          <button type="button" className="js-work-link" onClick={() => onQueue(id)}>Открыть журнал <ChevronRight size={14} /></button></div>)}
      </> : <div className="jh-empty"><Check size={22} /><h3>Домашки проверены</h3><p>Новые сдачи появятся здесь.</p></div>}
    </div>
  </section>
}

export function HomeworkQueue({ queue, groups, groupId, onGroup, onOpen }: {
  queue: HomeworkEntry[]; groups: CourseJournalData['groups']; groupId: string; onGroup: (id: string) => void; onOpen: (entry: HomeworkEntry) => void
}) {
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(30)
  const visible = queue.filter(e => (groupId === '*' || e.student.groupId === groupId)
    && (e.student.name + ' ' + e.work.slot.title).toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')))
  return <section className="course-journal jh-queue" aria-label="Очередь проверки домашних работ">
    <div className="jh-heading"><div><h1>Проверка</h1><p>Сданные домашки из всех групп · {queue.length} {countLabel(queue.length)}</p></div></div>
    <div className="jh-queue-tools"><label>Группа<select aria-label="Группа в очереди" value={groupId} onChange={e => {onGroup(e.target.value);setLimit(30)}}>
      <option value="*">Все группы</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      {queue.some(e => !e.student.groupId) && <option value="">Индивидуальные ученики</option>}
    </select></label><label className="jh-queue-search"><Search size={15} /><input type="search" aria-label="Поиск в очереди" placeholder="Ученик или домашка" value={search} onChange={e => {setSearch(e.target.value);setLimit(30)}} /></label>
    <span>Сначала ранние сдачи</span></div>
    <div className="jh-surface">{visible.slice(0, limit).map(e => <button key={e.key} type="button" className="jh-queue-row" onClick={() => onOpen(e)} aria-label={['Проверить', e.student.name, e.work.slot.title, groups.find(g => g.id === e.student.groupId)?.name ?? 'Индивидуально'].join(' · ')}>
      <span className="cj-avatar" aria-hidden>{initials(e.student.name)}</span><span><strong>{e.student.name}</strong><small>{e.work.slot.title}</small><small>{groups.find(g => g.id === e.student.groupId)?.name ?? 'Индивидуально'} · {e.work.source}</small></span>
      <HomeworkStatus entry={e} action /><ChevronRight size={15} />
    </button>)}{!visible.length && <div className="jh-empty"><Check size={24} /><h2>{queue.length ? 'Нет работ по этим фильтрам' : 'Всё проверено'}</h2><p>{queue.length ? 'Выберите другую группу или измените поиск.' : 'Новые сдачи появятся здесь.'}</p></div>}</div>
    {visible.length > limit && <button type="button" className="cj-button" onClick={() => setLimit(n => n + 30)}>Показать ещё · осталось {visible.length - limit}</button>}
  </section>
}

function HomeworkDialog({ data, items, target, setTarget, onSave, onLocate, onFullReview }: {
  data: CourseJournalData | null; items: HomeworkEntry[]; target: Target | null; setTarget: React.Dispatch<React.SetStateAction<Target | null>>; onSave: SaveReview; onLocate?: (entry: HomeworkEntry) => void
  onFullReview?: (entry: HomeworkEntry, draft: ReviewHandoff) => boolean
}) {
  const [drafts, setDrafts] = useState<Record<string, { score: string; comment: string }>>({})
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [answerFilter, setAnswerFilter] = useState<'all' | 'manual' | 'errors'>('all')
  const body = useRef<HTMLDivElement>(null)
  const documentArea = useRef<HTMLDivElement>(null)
  const stack = target ? target.keys.flatMap(key => {const e = items.find(e => e.key === key);return e && (!target.queue || needsReview(e)) ? [e] : []}) : []
  const entry = stack.find(e => e.key === target?.selected) ?? stack[0]
  const row = entry?.work.submission, payload = parseBasicAnswers(row?.attachments)
  const pending = !!entry && needsReview(entry)
  const aiEnabled = !!row && !data?.demo && entry?.work.source !== 'Тестли'
  const ai = useHomeworkCardAi(aiEnabled ? row?.id : undefined, payload?.attemptId, row?.updated_at, pending)
  const aiDetails = useRef<HTMLDivElement>(null)
  const firstAiIssue = ai.grade?.tasks.find(task => task.points < task.max_points || task.elements.some(el => el.verdict !== 'yes'))?.n
  const active = !!target
  useScrollFades(body, active)
  useEffect(() => {
    if (!active) return
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = body.current?.closest<HTMLElement>('[role="dialog"]')
    dialog?.setAttribute('aria-label', 'Домашняя работа ученика')
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, a[href]') ?? [])].filter(el => el.getClientRects().length)
    focusable()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const nodes = focusable(), first = nodes[0], last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus()}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus()}
    }
    dialog?.addEventListener('keydown', trap)
    return () => {dialog?.removeEventListener('keydown', trap);if(trigger?.isConnected)trigger.focus({preventScroll:true})}
  }, [active])
  useEffect(() => {setSearch('');setExpanded(false)}, [target?.title])
  useEffect(() => {setError('');setAnswerFilter('all');documentArea.current?.scrollTo({top:0})}, [target?.selected])
  if (!target || !data) return null
  const autoPercent = payload && payload.gradable > 0 && Number.isFinite(payload.correct) ? Math.max(0, Math.min(100, Math.round(payload.correct / payload.gradable * 100))) : null
  const draftKey = entry ? entry.key + ':' + (payload?.attemptId ?? row?.updated_at ?? '') : ''
  const draft = drafts[draftKey] ?? { score: row?.score == null ? '' : String(row.score), comment: row?.review_comment ?? '' }
  const updateDraft = (next: Partial<typeof draft>) => setDrafts(prev => ({...prev, [draftKey]: {...draft, ...next}}))
  async function save(verdict: ReviewDecision['verdict']) {
    if (!entry || !row || busy) return
    const score = Number(draft.score)
    if (verdict === 'accepted' && (!draft.score.trim() || !Number.isFinite(score) || score < 0 || score > 100)) {setError('Укажите итог от 0 до 100%.');return}
    if (verdict === 'returned' && !draft.comment.trim()) {setError('Добавьте комментарий: что нужно исправить.');return}
    setBusy(true);setError('')
    try {
      await onSave(entry, {verdict, score: Number.isFinite(score) ? score : 0, comment: draft.comment})
      if (verdict === 'accepted' && ai.grade && ['graded', 'dismissed'].includes(ai.grade.status)) {
        // Final teacher review has already succeeded; an AI bookkeeping error must not undo it.
        void confirmAiGrade(ai.grade.id, score).catch(() => {})
      }
      if (target?.queue) {
        const next = stack.find(e => e.key !== entry.key && needsReview(e))
        setTarget(prev => prev && (next ? {...prev, selected:next.key} : null))
      }
    } catch(e) {setError(e instanceof Error ? e.message : 'Не удалось сохранить проверку. Попробуйте ещё раз.')}
    finally {setBusy(false)}
  }
  const at = entry ? stack.findIndex(e => e.key === entry.key) : -1
  const group = data.groups.find(g => g.id === entry?.student.groupId)
  const manual = (payload?.rows ?? []).filter(r => r.verdict === 'review' || r.verdict === 'skip' || r.testly?.pending)
  const errors = (payload?.rows ?? []).filter(r => ['wrong', 'empty', 'hint'].includes(r.verdict)
    || ai.grade?.tasks.some(task => task.n === r.n && (task.points < task.max_points || task.elements.some(el => el.verdict !== 'yes'))))
  const shownPayload = payload && {...payload, rows: answerFilter === 'manual' ? manual : answerFilter === 'errors' ? errors : payload.rows}
  const allAssignment = entry ? items.filter(e => e.work.slot.ref === entry.work.slot.ref && e.student.groupId === entry.student.groupId) : []
  const showAll = () => {if(entry)setTarget({...target,keys:allAssignment.map(e=>e.key),queue:false,title:entry.work.slot.title})}
  function showAiDetails() {
    setAnswerFilter('all')
    requestAnimationFrame(() => aiDetails.current?.scrollIntoView({block:'start', behavior:'smooth'}))
  }
  const aiSummary = aiEnabled && <AiReviewSummary grade={ai.grade} reviewed={!pending} busy={busy || ai.busy}
    loading={ai.loading} requestError={ai.error} onRequest={pending ? ai.request : undefined}
    onApply={pending && ai.grade?.score != null ? () => updateDraft({score:String(ai.grade!.score)}) : undefined}
    onDetails={showAiDetails}/>
  function fullReview() {
    if (!entry || busy) return
    if (!expanded && onFullReview?.(entry, {...draft,edited:!!drafts[draftKey]})) {
      // The full editor now owns this draft. An older quick-review copy must not overwrite it on return.
      setDrafts(previous => {const {[draftKey]: _handedOff, ...rest} = previous;return rest})
      setTarget(null);return
    }
    if (!expanded && target?.keys.length === 1) showAll()
    setExpanded(v => !v)
  }
  const history = entry && !!entry.work.attempts?.length && <HomeworkHistory key={entry.key} attempts={entry.work.attempts}/>
  return <Modal width={expanded ? 1800 : target.keys.length > 1 ? 1320 : 1100} padding={0}
    cardStyle={{height:expanded ? 'calc(100dvh - 32px)' : !pending && target.keys.length===1 ? 'min(580px, calc(100dvh - 64px))' : 'min(780px, calc(100dvh - 64px))', ...(expanded ? {maxHeight:'calc(100dvh - 32px)'} : {}), borderRadius:24}}
    bodyStyle={{overflow:'hidden',display:'flex',flexDirection:'column'}} onClose={() => {if(!busy)setTarget(null)}}>
    <div className={'course-journal jh-review-shell' + (target.keys.length > 1 ? ' jh-shell-has-stack' : '') + (expanded ? ' jh-shell-expanded' : '') + (aiEnabled ? ' jh-has-ai' : '')} ref={body}>
      <header className="jh-review-top"><div className="jh-review-emblem"><ClipboardList size={20}/></div><div className="jh-review-title"><span>{target.queue ? 'Проверка работ' : 'Домашняя работа'}</span><h2 title={target.title}>{target.title}</h2></div>
        <button type="button" className="jh-full-review" aria-label={expanded?'Свернуть':'Открыть полную проверку'} disabled={busy || !entry} onClick={fullReview}>{expanded ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}<span>{expanded ? 'Свернуть' : 'Открыть полную проверку'}</span></button>
        <button type="button" className="jh-review-close" disabled={busy} aria-label="Закрыть" onClick={() => setTarget(null)}><X size={19}/></button>
      </header>
      <div className="jh-review-body">
        {target.keys.length > 1 && <aside className="jh-review-roster" aria-label="Стопка работ учеников"><div className="jh-roster-heading"><strong>{target.queue ? 'Очередь' : 'Ученики'}</strong><span>{stack.length}</span></div>
          <label className="jh-roster-search"><Search size={14}/><input aria-label="Найти ученика в стопке" placeholder="Найти ученика" value={search} onChange={e=>setSearch(e.target.value)}/></label>
          <div className="jh-roster-scroll">{stack.filter(e=>e.student.name.toLocaleLowerCase('ru').includes(search.toLocaleLowerCase('ru'))).map(e=><button type="button" key={e.key} disabled={busy} className="jh-roster-student" aria-pressed={e.key===entry?.key} onClick={()=>setTarget(t=>t&&{...t,selected:e.key})}>
            <span className="jh-roster-avatar">{initials(e.student.name)}</span><span className="jh-roster-name"><strong>{e.student.name}</strong><small>{target.queue ? [e.work.slot.title,data.groups.find(g=>g.id===e.student.groupId)?.name].filter(Boolean).join(' · ') : e.work.status}</small></span>
            <span className={'jh-roster-result' + (needsReview(e) ? ' jh-is-pending' : e.work.status==='Зачтено' ? ' jh-is-passed' : e.work.status==='Ниже порога' ? ' jh-is-low' : '')}>{needsReview(e)?'●':e.work.score===null||['На доработке','Пересдача'].includes(e.work.status)?'—':e.work.score+'%'}</span>
          </button>)}</div>
        </aside>}
        {entry ? <>
          <article className="jh-review-document" aria-label={'Домашка · '+entry.student.name}>
            <div className="jh-document-identity"><span className="jh-document-avatar">{initials(entry.student.name)}</span><div><h3>{entry.student.name}</h3><p>{target.queue?entry.work.slot.title+' · ':''}{group?.name ?? 'Индивидуально'} · {entry.work.source}{entry.work.slot.due?' · до '+workDueLabel(entry.work.slot.due):''}</p></div>
              <span className={'jh-document-status '+(pending?'jh-status-pending':entry.work.status==='Зачтено'?'jh-status-passed':'')}>{entry.work.status}</span>
            </div>
            {target.keys.length>1 && <label className="jh-mobile-student">Ученик<select aria-label="Выбрать ученика в стопке" disabled={busy} value={entry.key} onChange={e=>setTarget({...target,selected:e.target.value})}>{stack.map(e=><option key={e.key} value={e.key}>{e.student.name} · {e.work.status}</option>)}</select></label>}
            <div className="jh-document-tools" role="group" aria-label="Фильтр ответов"><button type="button" aria-pressed={answerFilter==='all'} onClick={()=>setAnswerFilter('all')}>Все задания <span>{payload?.rows.length??0}</span></button>
              {pending && <button type="button" aria-pressed={answerFilter==='manual'} disabled={!manual.length} onClick={()=>setAnswerFilter('manual')}>На проверку <span>{manual.length}</span></button>}
              <button type="button" aria-pressed={answerFilter==='errors'} disabled={!errors.length} onClick={()=>setAnswerFilter('errors')}>Ошибки <span>{errors.length}</span></button></div>
            <div className="jh-document-scroll" ref={documentArea}>
              {entry.work.submitted ? shownPayload?.rows.length ? shownPayload.rows.map(answer => {
                const feedback = ai.grade?.tasks.find(task => task.n === answer.n)
                return <div key={answer.n} className="aic-answer-block">
                  <BasicAnswersList payload={{...shownPayload,rows:[answer]}} studentId={data.demo?undefined:row?.student_id} teacherReviewed={row?.status==='completed'} appearance="review" showSummary={false} passingScore={entry.work.threshold}/>
                  {feedback && <div ref={answer.n === (firstAiIssue ?? ai.grade?.tasks[0]?.n) ? aiDetails : undefined}><AiTaskFeedback task={feedback}/></div>}
                </div>
              })
                : <div className="jh-document-empty"><ClipboardList size={26}/><h3>{payload?.rows.length?'Здесь нет таких заданий':'Ответы недоступны'}</h3><p>{payload?.rows.length?'Выберите другой фильтр ответов.':'У этой старой сдачи нет сохранённого снимка ответов.'}</p></div>
                : <div className="jh-document-empty"><ClipboardList size={28}/><h3>Работа ещё не сдана</h3><p>Ответы появятся здесь после сдачи учеником.</p><span>{entry.work.status}</span></div>}
            </div>
          </article>
          <aside className="jh-review-inspector" aria-label="Результат и действия проверки">
            {pending ? <form className="jh-inspector-form" onSubmit={e=>{e.preventDefault();void save('accepted')}}>
              <div className="jh-inspector-heading"><h3>Проверка работы</h3><p>Итог увидит ученик</p></div><div className="jh-inspector-scroll" key={draftKey}>
              {aiSummary}<div className="jh-inspector-fields">
                <label className="jh-final-grade">Итоговый результат<div><input aria-label="Итоговый результат в процентах" type="number" min={0} max={100} step="any" value={draft.score} disabled={busy} onChange={e=>updateDraft({score:e.target.value})}/><span>%</span></div></label>
                <div className="jh-score-context">{autoPercent!==null && <span>Автопроверка <b>{autoPercent}%</b></span>}<span>Порог зачёта <b>{entry.work.threshold}%</b></span></div>
                <label className="jh-review-comment">Комментарий ученику<textarea aria-label="Комментарий ученику" placeholder="Что получилось и что исправить" value={draft.comment} disabled={busy} onChange={e=>updateDraft({comment:e.target.value})}/></label>
              </div>{ai.grade?.comment && <div className="jh-ai-comment"><AiCommentDraft key={draftKey} comment={ai.grade.comment}
                busy={busy || draft.comment.includes(ai.grade.comment)}
                onUse={() => updateDraft({comment: draft.comment.trim() ? draft.comment + '\n\n' + ai.grade!.comment : ai.grade!.comment})}/></div>}
              {history}</div><div className="jh-inspector-actions">{error&&<p className="jh-error" role="alert">{error}</p>}<button type="submit" className="cj-button cj-primary" disabled={busy}>{busy?'Сохраняем…':target.queue?'Сохранить и продолжить':'Завершить проверку'}</button><button type="button" className="cj-button" disabled={busy} onClick={()=>void save('returned')}>На доработку</button></div>
            </form> : <>
              <div className="jh-inspector-heading"><h3>{(entry.work.attempts?.length??0)>1?'Лучший итог':'Результат работы'}</h3><p>{entry.work.source}</p></div><div className="jh-inspector-scroll" key={draftKey}>{aiSummary}<div className="jh-inspector-result"><div className={'jh-final-result '+(entry.work.status==='Зачтено'?'jh-result-passed':entry.work.status==='Ниже порога'?'jh-result-low':'')}><strong>{entry.work.score===null||['На доработке','Пересдача'].includes(entry.work.status)?'—':entry.work.score}<small>{entry.work.score!==null&&!['На доработке','Пересдача'].includes(entry.work.status)?'%':''}</small></strong><span>{entry.work.status}</span></div>
                {payload && <div className="jh-score-context">{entry.work.source!=='Тестли'&&autoPercent!==null&&<span>Автопроверка <b>{autoPercent}%</b></span>}<span>Порог зачёта <b>{entry.work.threshold}%</b></span></div>}
                {row?.review_comment&&<div className="jh-inspector-comment"><h4>Комментарий преподавателя</h4><p>{row.review_comment}</p></div>}
              </div>{history}</div>
            </>}
          </aside>
        </> : <p className="jh-empty">Работа больше не доступна. Закройте окно и обновите журнал.</p>}
      </div>
      <footer className="jh-review-footer"><div>{target.queue&&onLocate&&entry?<button type="button" className="jh-footer-link" disabled={busy} onClick={()=>{setTarget(null);onLocate(entry)}}>Открыть в журнале группы <ExternalLink size={13}/></button>:target.keys.length===1&&allAssignment.length>1?<button type="button" className="jh-footer-link" disabled={busy} onClick={showAll}>Все работы по этой домашке <ChevronRight size={14}/></button>:<span>{group?.name??'Все группы'} · {stack.length} {target.queue?countLabel(stack.length):'учеников'}</span>}</div>
        {stack.length>1&&<div className="jh-review-pager"><button type="button" aria-label="Предыдущая работа" disabled={busy||at<=0} onClick={()=>setTarget({...target,selected:stack[at-1].key})}><ArrowLeft size={15}/></button><span>{at+1} / {stack.length}</span><button type="button" aria-label="Следующая работа" disabled={busy||at>=stack.length-1} onClick={()=>setTarget({...target,selected:stack[at+1].key})}><ArrowRight size={15}/></button></div>}
      </footer>
    </div>
  </Modal>
}
