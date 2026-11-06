import { useEffect, useState } from 'react'
import { Alert } from '../Alert'
import {
  CheckCircle2, Clapperboard, FileText, GalleryVerticalEnd, ListChecks, Lock, NotebookPen, Sparkles, X,
} from '../icons/appIcons'
import { btn } from '../../lib/pillStyles'
import type { LessonParagraph, SelfCheckQuestion } from '../../data/lessonContent'
import type { TaskPayload } from '../../data/taskTypes'
import { deleteCardGroup } from '../../lib/cardGroups'
import {
  NOTE_KIND_LABEL, RECAP_KINDS, RECAP_KIND_LABEL, clockOf, deleteTeacherNote, loadTeacherNote, markRecapPublished,
  publishRecapCards, recapCards, recapHwTasks, recapNoteBody, recapParagraphs, recapSelfCheck, saveTeacherNote,
  type RecapDraft, type RecapPublished, type RecapRow,
} from '../../lib/lessonRecap'

// Вход в итоги урока из вкладки «Запись» (концепт B) и раскладка по уроку.
//
// Раскладка не пишет в lessons сама: она собирает новые поля урока, а
// сохраняет их обычный автосейв редактора курса. Карточки и заметка — свои
// таблицы (card_groups под RLS владельца, lesson_teacher_notes), их пишем здесь.

type HwTask = Omit<TaskPayload, 'type'> & { type: string }
/** Поля урока редактора, которые трогают итоги. */
export interface RecapLessonFields {
  id: string
  persistedShortId?: string
  title: string
  hwTitle?: string
  hwDate?: string
  hwTasks?: HwTask[]
  recapParagraphs?: LessonParagraph[]
  selfCheck?: SelfCheckQuestion[]
  recapCardSetId?: string
  recapCardGroupId?: string
}

export interface RecapCourseCtx {
  ownerId: string
  /** Код языка тренажёра (ko, en…) и id предмета — для набора карточек. */
  lang: string
  subject: string
  /** Ученики курса: кому выдать карточки. Пусто — карточки не выдаём. */
  studentIds: string[]
}

export type RecapPart = 'summary' | 'questions' | 'hw' | 'cards' | 'note'

/** Разложить черновик по уроку. Возвращает новый урок и запись «что куда». */
export async function applyRecap<L extends RecapLessonFields>(lesson: L, row: RecapRow, draft: RecapDraft, ctx: RecapCourseCtx): Promise<{ lesson: L; published: RecapPublished; skipped: string[] }> {
  const prev = row.published
  const prefix = lesson.persistedShortId ?? lesson.id
  const published: RecapPublished = { at: new Date().toISOString() }
  const skipped: string[] = []
  let next: L = { ...lesson }

  if (draft.summary) {
    const paras = recapParagraphs(draft, prefix)
    next = { ...next, recapParagraphs: paras.length ? paras : undefined }
    if (paras.length) published.summary = paras.length
  }
  if (draft.questions) {
    const sc = recapSelfCheck(draft)
    next = { ...next, selfCheck: sc.length ? sc : undefined }
    if (sc.length) published.questions = sc.length
  }
  if (draft.hw) {
    // Прошлое применение заменяется, задания учителя остаются как были.
    const own = (lesson.hwTasks ?? []).filter(t => !(prev?.hw ?? []).includes(t.id))
    const tasks = recapHwTasks(draft)
    next = { ...next, hwTasks: [...own, ...tasks], ...(!lesson.hwTitle?.trim() && tasks.length && !own.length ? { hwTitle: draft.hw.title } : {}) }
    if (tasks.length) published.hw = tasks.map(t => t.id)
  }
  if (draft.cards) {
    const cards = recapCards(draft)
    if (cards.length && ctx.studentIds.length) {
      const res = await publishRecapCards({ cards, lang: ctx.lang, subject: ctx.subject, title: lesson.title || 'Карточки урока', studentIds: ctx.studentIds, ownerId: ctx.ownerId, replace: lesson.recapCardGroupId })
      if (res) {
        next = { ...next, recapCardGroupId: res.groupId, recapCardSetId: res.setId }
        Object.assign(published, { cardGroupId: res.groupId, cardSetId: res.setId, cards: cards.length })
      } else skipped.push('Карточки не сохранились — попробуйте применить ещё раз.')
    } else {
      if (lesson.recapCardGroupId) await deleteCardGroup(lesson.recapCardGroupId)
      next = { ...next, recapCardGroupId: undefined, recapCardSetId: undefined }
      if (cards.length) skipped.push('Карточки не выданы: в курсе пока нет учеников.')
    }
  }
  if (draft.note) {
    const body = recapNoteBody(draft)
    if (body.length) {
      const id = await saveTeacherNote({ teacherId: ctx.ownerId, lessonId: row.lesson_id, recapId: row.id, body, replace: prev?.noteId })
      if (id) Object.assign(published, { noteId: id, note: body.length })
      else skipped.push('Заметка не сохранилась — попробуйте применить ещё раз.')
    } else if (prev?.noteId) await deleteTeacherNote(prev.noteId)
  }
  await markRecapPublished(row.id, published)
  return { lesson: next, published, skipped }
}

/** Отменить одну часть раскладки. */
export async function undoRecapPart<L extends RecapLessonFields>(lesson: L, row: RecapRow, part: RecapPart): Promise<{ lesson: L; published: RecapPublished | null }> {
  const pub: RecapPublished = { ...(row.published ?? { at: new Date().toISOString() }) }
  let next: L = { ...lesson }
  if (part === 'summary') { next = { ...next, recapParagraphs: undefined }; delete pub.summary }
  if (part === 'questions') { next = { ...next, selfCheck: undefined }; delete pub.questions }
  if (part === 'hw') { next = { ...next, hwTasks: (lesson.hwTasks ?? []).filter(t => !(pub.hw ?? []).includes(t.id)) }; delete pub.hw }
  if (part === 'cards') {
    if (pub.cardGroupId) await deleteCardGroup(pub.cardGroupId)
    next = { ...next, recapCardGroupId: undefined, recapCardSetId: undefined }
    delete pub.cardGroupId; delete pub.cardSetId; delete pub.cards
  }
  if (part === 'note') { if (pub.noteId) await deleteTeacherNote(pub.noteId); delete pub.noteId; delete pub.note }
  const left = pub.summary || pub.questions || pub.hw?.length || pub.cardGroupId || pub.noteId
  const published = left ? pub : null
  await markRecapPublished(row.id, published)
  return { lesson: next, published }
}

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100
  return `${n} ${m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many}`
}

/** Карточка во вкладке «Запись»: что собирается, сколько стоит, где проверять. */
export function RecapEntryCard({ row, busy, loading, canBuild, onBuild, onOpen }: {
  row: RecapRow | null; busy: boolean; loading: boolean
  /** Расшифровка сохранена в уроке — по ней и собираются итоги. */
  canBuild: boolean
  onBuild: () => void
  onOpen: () => void
}) {
  const size = row?.draft ? RECAP_KINDS.reduce((n, k) => n + (k === 'hw' ? row.draft!.hw?.tasks.length ?? 0 : (row.draft![k] as unknown[] | undefined)?.length ?? 0), 0) : 0
  const [note, setNote] = useState<Awaited<ReturnType<typeof loadTeacherNote>>>(null)
  const noteId = row?.published?.noteId
  useEffect(() => {
    if (!noteId || !row) { setNote(null); return }
    let alive = true
    void loadTeacherNote(row.lesson_id).then(n => { if (alive) setNote(n) })
    return () => { alive = false }
  }, [noteId, row?.lesson_id])
  const status = busy ? 'Собираем итоги · около 40 секунд'
    : row?.status === 'published' ? `Применено к уроку ${new Date(row.published?.at ?? row.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`
    : row?.draft ? `Черновик готов · ${plural(size, 'пункт', 'пункта', 'пунктов')} · ученик не видит`
    : 'Проверять будете рядом с расшифровкой'
  return <section className="rce" aria-label="Итоги урока из записи">
    <header className="rce-head">
      <span className="rp-mark"><Sparkles size={18} /></span>
      <div className="rp-head-text"><strong>Итоги урока из записи</strong><small>{status}</small></div>
    </header>
    {!row?.draft && <>
      <p className="rce-text">Конспект, вопросы на проверку, карточки, черновик ДЗ и заметка для вас. Ученик ничего не увидит, пока вы не примените итоги к уроку.</p>
      <div className="rce-kinds">{RECAP_KINDS.map(k => <span key={k} className="rp-pill">{RECAP_KIND_LABEL[k]}{k === 'note' && <Lock size={11} />}</span>)}</div>
    </>}
    {!canBuild && <p className="rce-text is-hint">Сначала сохраните расшифровку в урок: итоги собираются по сохранённой.</p>}
    {note && note.body.length > 0 && <div className="rce-note">
      <small><Lock size={11} />Заметка для вас</small>
      <ul>{note.body.slice(0, 4).map((n, i) => <li key={i}><b>{NOTE_KIND_LABEL[n.kind]}{n.count ? ` · ${n.count}` : ''}:</b> {n.text} <span className="rce-at">{n.at?.[0] != null ? clockOf(n.at[0]) : ''}</span></li>)}</ul>
    </div>}
    <div className="rce-foot">
      {!row?.draft && <small>≈ 10 ₽ · около 40 секунд</small>}
      <button type="button" style={btn('S', 'secondary')} disabled={!canBuild} onClick={onOpen}><Clapperboard size={14} />Открыть монтаж</button>
      {row?.draft
        ? <button type="button" style={btn('S', 'primary')} onClick={onOpen}><Sparkles size={14} />{row.status === 'published' ? 'Открыть итоги' : 'Проверить итоги'}</button>
        : <button type="button" style={btn('S', 'primary')} disabled={!canBuild || busy || loading} onClick={onBuild}><Sparkles size={14} />{busy ? 'Собираем…' : 'Собрать итоги'}</button>}
    </div>
  </section>
}

/** Сводка после «Применить»: что куда легло, у каждого — «Отменить». */
export function RecapAppliedToast({ published, published: p, skipped, hwAssigned, coursePublished, onUndo, onClose }: {
  published: RecapPublished; skipped: string[]; hwAssigned?: string; coursePublished: boolean
  onUndo: (part: RecapPart) => Promise<void>; onClose: () => void
}) {
  const [busy, setBusy] = useState<RecapPart | null>(null)
  const rows: Array<[RecapPart, typeof FileText, string]> = []
  if (p.summary) rows.push(['summary', FileText, `Конспект → «Итоги занятия» · ${plural(p.summary, 'абзац', 'абзаца', 'абзацев')}`])
  if (p.questions) rows.push(['questions', ListChecks, `${plural(p.questions, 'вопрос', 'вопроса', 'вопросов')} → «Проверь себя»`])
  if (p.cards) rows.push(['cards', GalleryVerticalEnd, `${plural(p.cards, 'карточка', 'карточки', 'карточек')} → набор урока в тренажёре`])
  if (p.hw?.length) rows.push(['hw', NotebookPen, `${plural(p.hw.length, 'задание', 'задания', 'заданий')} → «Домашки»${hwAssigned ? `, ДЗ уже назначено на ${hwAssigned}` : ', черновик'}`])
  if (p.note) rows.push(['note', Lock, 'Заметка → только вам, во вкладке «Запись»'])
  return <div className="rce-toast" role="status" aria-live="polite">
    <div className="rce-toast-head"><CheckCircle2 size={18} /><b>{rows.length ? 'Итоги разложены по уроку' : 'Раскладка отменена'}</b>
      <button type="button" className="rce-x" aria-label="Закрыть сводку" onClick={onClose}><X size={16} /></button></div>
    {rows.map(([part, Icon, label]) => <div key={part} className="rce-toast-row">
      <Icon size={15} /><span>{label}</span>
      {/* Подпись не меняется на время отмены: «Отменяем…» шире и переносила строку. */}
      <button type="button" disabled={!!busy} aria-busy={busy === part} onClick={async () => { setBusy(part); try { await onUndo(part) } finally { setBusy(null) } }}>Отменить</button>
    </div>)}
    {skipped.map(s => <Alert key={s} tone="warning" text={s} style={{ boxShadow: 'none', padding: 0, background: 'transparent' }} />)}
    {rows.length > 0 && <small>{coursePublished ? 'Курс опубликован: ученики видят итоги после автосохранения урока.' : 'Ученики увидят всё после публикации курса.'}</small>}
  </div>
}
