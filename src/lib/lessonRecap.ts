import { supabase } from './supabase'
import { appFlag, deleteCardGroup, saveCardGroup } from './cardGroups'
import type { LessonParagraph, SelfCheckQuestion } from '../data/lessonContent'
import type { TaskPayload } from '../data/taskTypes'
import type { SetCard } from './cardGroups'
import { clockOf, type RecapDraft, type RecapKind, type RecapNote } from '../../supabase/functions/_shared/lessonRecap'

export * from '../../supabase/functions/_shared/lessonRecap'

// Итоги урока из расшифровки — клиентская половина.
//
// Черновик лежит в lesson_recaps (RLS владельца), а не в lessons.content:
// ученик загружает content урока целиком. Здесь — чтение и правка черновика,
// вызов функции lesson-recap и раскладка применённого по уроку. Раскладка не
// пишет в lessons сама: она возвращает новые поля урока, а сохраняет их
// обычное сохранение редактора курса — с теми же правами и проверками.

export interface RecapRow {
  id: string
  lesson_id: string
  status: 'queued' | 'running' | 'ready' | 'failed' | 'published' | 'discarded'
  kinds: RecapKind[]
  draft: RecapDraft | null
  published: RecapPublished | null
  model?: string | null
  cost_usd?: number | null
  error_code?: string | null
  created_at: string
}

/** Что и куда разложено — по этому работает «Отменить». */
export interface RecapPublished {
  at: string
  summary?: number
  questions?: number
  hw?: string[]
  cardGroupId?: string
  cardSetId?: string
  cards?: number
  noteId?: string
  note?: number
}

export const RECAP_KIND_LABEL: Record<RecapKind, string> = {
  summary: 'Конспект', questions: 'Вопросы', cards: 'Карточки', hw: 'ДЗ', note: 'Заметка',
}

const ROW = 'id, lesson_id, status, kinds, draft, published, model, cost_usd, error_code, created_at'

/** Функция включена: и общий рубильник, и свой. База не ответила — выключено. */
export async function recapAvailable(): Promise<boolean> {
  const [all, own] = await Promise.all([appFlag('ai_enabled'), appFlag('ai_lesson_recap')])
  return all && own
}

/** Последний живой черновик урока (по short_id). */
export async function loadLessonRecap(lessonShortId: string): Promise<RecapRow | null> {
  const { data, error } = await supabase.from('lesson_recaps')
    .select(ROW + ', lessons!inner(short_id)')
    .eq('lessons.short_id', lessonShortId)
    .in('status', ['ready', 'published', 'running'])
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) { console.error('lessonRecap: load', error); return null }
  if (!data) return null
  const { lessons: _l, ...row } = data as unknown as RecapRow & { lessons?: unknown }
  return row as RecapRow
}

export class RecapError extends Error {
  constructor(message: string, public code: string) { super(message) }
}

/** Собрать (или пересобрать раздел). Ошибка — словами для учителя. */
export async function requestLessonRecap(body: { lesson: string; kinds: RecapKind[]; lang?: string; recap?: string; force?: boolean }): Promise<RecapRow> {
  const { data, error } = await supabase.functions.invoke('lesson-recap', { body })
  if (error) {
    // Ответ не-2xx лежит в error.context; до функции могли и не достучаться.
    const context = (error as { context?: unknown }).context
    const said = context instanceof Response
      ? await context.clone().json().catch(() => undefined) as { error?: string; code?: string } | undefined
      : undefined
    throw new RecapError(said?.error || 'Не удалось собрать итоги. Попробуйте ещё раз.', said?.code || 'network')
  }
  if (!data?.recap) throw new RecapError('Не удалось собрать итоги. Попробуйте ещё раз.', 'failed')
  return data.recap as RecapRow
}

export async function saveRecapDraft(id: string, draft: RecapDraft): Promise<boolean> {
  const { error } = await supabase.from('lesson_recaps').update({ draft }).eq('id', id)
  if (error) console.error('lessonRecap: save draft', error)
  return !error
}

export async function markRecapPublished(id: string, published: RecapPublished | null): Promise<boolean> {
  const { error } = await supabase.from('lesson_recaps').update({ published, status: published ? 'published' : 'ready' }).eq('id', id)
  if (error) console.error('lessonRecap: mark published', error)
  return !error
}

// ─── Раскладка по уроку ──────────────────────────────────────────────────────

const on = <T extends { off?: boolean }>(list: T[] | undefined) => (list ?? []).filter(x => !x.off)

/** Конспект → абзацы «Итоги занятия» с таймкодами (lessons.content.paragraphs, origin: 'recap'). */
export function recapParagraphs(draft: RecapDraft, prefix: string): LessonParagraph[] {
  return on(draft.summary).map((s, i) => ({ id: `${prefix}-recap-${i + 1}`, text: s.text, title: s.title, origin: 'recap' as const, at: s.at }))
}

/** Вопросы → «Проверь себя»: без оценки, сверка на клиенте. */
export function recapSelfCheck(draft: RecapDraft): SelfCheckQuestion[] {
  return on(draft.questions).map((q, i) => ({
    id: 'sc' + (i + 1), q: q.q, answer: q.answer, ...(q.kind === 'choice' && q.options ? { options: q.options } : {}), ...(q.at[0] != null ? { at: q.at[0] } : {}),
  }))
}

/** ДЗ → обычные задания редактора. id с префиксом recap- — по нему «Отменить» их находит. */
export function recapHwTasks(draft: RecapDraft, stamp = Date.now().toString(36)): Array<Omit<TaskPayload, 'type'> & { type: 'fill' | 'single' | 'extended' }> {
  return on(draft.hw?.tasks).map((t, i) => {
    const base = { id: `recap-${stamp}-${i + 1}`, type: t.type, isHard: false, label: `Задание ${i + 1}`, question: t.question }
    if (t.type === 'single') return { ...base, choices: t.options ?? [], correctChoices: [t.correct ?? 0] }
    if (t.type === 'fill') return { ...base, answer: t.answer ?? '' }
    return { ...base, ...(t.answer ? { referenceAnswer: t.answer } : {}) }
  })
}

export function recapCards(draft: RecapDraft): SetCard[] {
  return on(draft.cards).map(c => ({ term: c.term, ru: c.meaning, ...(c.note ? { note: c.note } : {}) }))
}

/** Псевдонимы → имена: заметку и реплики учитель видит с именами. */
export function restoreNames(text: string, aliases: Record<string, string>): string {
  return Object.entries(aliases).sort((a, b) => b[0].length - a[0].length)
    .reduce((t, [alias, name]) => alias === name ? t : t.split(alias).join(name), text)
}

export function recapNoteBody(draft: RecapDraft): Array<Pick<RecapNote, 'kind' | 'text' | 'count' | 'at'>> {
  return on(draft.note).map(n => ({ kind: n.kind, text: restoreNames(n.text, draft.aliases), ...(n.count ? { count: n.count } : {}), at: n.at }))
}

export const NOTE_KIND_LABEL: Record<RecapNote['kind'], string> = {
  confusion: 'Путались', question: 'Спрашивали', strength: 'Получилось', not_covered: 'Не успели',
}

/** Карточки урока — набор без полки (группа без названия), выданный ученикам курса. */
export async function publishRecapCards(opts: { cards: SetCard[]; lang: string; subject: string; title: string; studentIds: string[]; ownerId: string; replace?: string }) {
  if (opts.replace) await deleteCardGroup(opts.replace)
  const res = await saveCardGroup({
    id: '', lang: opts.lang, subject: opts.subject, title: '', about: '', sort: 0, studentIds: opts.studentIds,
    sets: [{ id: '', title: opts.title, about: 'Карточки из записи урока', cards: opts.cards }],
  }, { createdBy: opts.ownerId })
  if (!res.ok || !res.id) return null
  const { data } = await supabase.from('card_sets').select('id').eq('group_id', res.id).limit(1).maybeSingle()
  return { groupId: res.id, setId: (data?.id as string | undefined) ?? undefined }
}

export async function saveTeacherNote(opts: { teacherId: string; lessonId: string; recapId: string; body: ReturnType<typeof recapNoteBody>; replace?: string }) {
  if (opts.replace) await supabase.from('lesson_teacher_notes').delete().eq('id', opts.replace)
  const { data, error } = await supabase.from('lesson_teacher_notes')
    .insert({ teacher_id: opts.teacherId, lesson_id: opts.lessonId, recap_id: opts.recapId, student_id: null, body: opts.body })
    .select('id').single()
  if (error) { console.error('lessonRecap: note', error); return null }
  return data.id as string
}

export async function deleteTeacherNote(id: string) {
  const { error } = await supabase.from('lesson_teacher_notes').delete().eq('id', id)
  return !error
}

export async function loadTeacherNote(lessonId: string): Promise<{ id: string; body: ReturnType<typeof recapNoteBody> } | null> {
  const { data } = await supabase.from('lesson_teacher_notes').select('id, body').eq('lesson_id', lessonId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data ? { id: data.id as string, body: (data.body ?? []) as ReturnType<typeof recapNoteBody> } : null
}

export { clockOf }
