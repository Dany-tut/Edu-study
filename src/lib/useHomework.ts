import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getOwnerId } from './owner'
import type { HomeworkItem } from '../data/teacherMockData'

export type HardSub = {
  id: string
  lessonRef: string
  baseRef: string
  lessonTitle: string
  studentId: string
  studentName: string
  score: number
  comment: string
  reviewComment: string
  status: 'submitted' | 'returned' | 'completed'
  updatedAt: string
  attachments: { photos: string[]; board: string | null }
  // Teacher's attachments left when returning the work (photos / whiteboard /
  // живая разметка поверх ответа ученика).
  reviewAttachments: { photos: string[]; board: string | null; annotation?: Annotation | null }
  // Новый per-task формат: каждое сложное задание — свой блок ответа ученика и
  // свой блок ревью учителя. Для старых (одно-эссе) работ оба массива пусты и
  // isMultiTask = false → рендерим legacy-вид по полям выше.
  isMultiTask: boolean
  taskBlocks: HardTaskStudentBlock[]
  reviewBlocks: HardTaskReviewBlock[]
}

// Прозрачный оверлей-разметка учителя поверх ответа ученика (см. AnnotationLayer).
export type Annotation = { image: string; w: number; h: number }

// ─── Per-task «сложные задания» ───────────────────────────────────────────────
// Определение одного сложного задания (хранится в homework.hard_tasks). `key` —
// стабильный ключ, связывающий определение ⇄ ответ ученика ⇄ ревью учителя.
export type HardTaskDef = {
  key: string
  source: 'bank' | 'custom'
  bankId?: number
  statement: string
  image?: string | null
  answer?: string
}

// ─── Раунды (хронология) ──────────────────────────────────────────────────────
// Сложное задание — это переписка: ученик шлёт решение → учитель отвечает
// комментарием с вердиктом → если «на доработку», ученик шлёт НОВОЕ решение → …
// → «принято» с оценкой. История не перезаписывается: каждый круг — отдельная
// запись с датой. Решения ученика лежат в attachments.tasks[].solutions[],
// комментарии учителя — в review_attachments.tasks[].comments[] (раздельные
// колонки → ученик и учитель не конфликтуют при записи), а на экране оба массива
// сливаются по времени в одну ленту.

// Одно решение ученика.
export type HardSolution = {
  id: string
  at: string            // ISO timestamp — для хронологии
  answer: string
  photos: string[]
  board: string | null
}

// Один комментарий учителя (закрывает круг вердиктом).
export type HardComment = {
  id: string
  at: string
  comment: string
  photos: string[]
  board: string | null
  boardMode: 'over' | 'beside'
  annotation: Annotation | null
  verdict?: 'returned' | 'completed'
  score?: number | null  // оценка 1–5 при принятии
}

// Ответ ученика по одному заданию (lesson_progress.attachments.tasks[]).
// `solutions` — новый формат с раундами; `answer/photos/board` — legacy одно-круг.
export type HardTaskStudentBlock = {
  key: string
  statement?: string   // снапшот условия — чтобы блок читался даже если ДЗ переписали
  solutions?: HardSolution[]
  answer?: string
  photos?: string[]
  board?: string | null
}

// Ревью учителя по одному заданию (lesson_progress.review_attachments.tasks[]).
// `comments` — новый формат с раундами; остальные поля — legacy одно-ревью.
// boardMode='over' → разметка поверх через AnnotationLayer (annotation);
// boardMode='beside' → отдельная доска рядом (board).
export type HardTaskReviewBlock = {
  key: string
  comments?: HardComment[]
  comment?: string
  photos?: string[]
  board?: string | null
  boardMode?: 'over' | 'beside'
  annotation?: Annotation | null
}

export type HardAttachmentsNew = { v: 2; tasks: HardTaskStudentBlock[] }
export type HardReviewNew = { v: 2; tasks: HardTaskReviewBlock[] }

// Единое правило обратной совместимости: новая форма всегда содержит массив tasks.
export const isNewHard = (att: unknown): boolean =>
  Array.isArray((att as { tasks?: unknown })?.tasks)

// ─── id ────────────────────────────────────────────────────────────────────────
export function hardId(prefix: string): string {
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rnd}`
}

// ─── Чтение раундов (с legacy-fallback) ───────────────────────────────────────
export function studentSolutions(b?: HardTaskStudentBlock | null): HardSolution[] {
  if (!b) return []
  if (Array.isArray(b.solutions)) return b.solutions
  if (b.answer || b.photos?.length || b.board) {
    return [{ id: 'legacy', at: '', answer: b.answer ?? '', photos: b.photos ?? [], board: b.board ?? null }]
  }
  return []
}

export function teacherComments(b?: HardTaskReviewBlock | null): HardComment[] {
  if (!b) return []
  if (Array.isArray(b.comments)) return b.comments
  if (b.comment || b.photos?.length || b.board || b.annotation) {
    return [{ id: 'legacy', at: '', comment: b.comment ?? '', photos: b.photos ?? [], board: b.board ?? null, boardMode: b.boardMode ?? 'over', annotation: b.annotation ?? null }]
  }
  return []
}

// Слитая по времени лента событий одного задания.
export type HardEvent =
  | ({ kind: 'solution' } & HardSolution)
  | ({ kind: 'comment' } & HardComment)

export function mergeTaskEvents(sb?: HardTaskStudentBlock | null, rb?: HardTaskReviewBlock | null): HardEvent[] {
  const evs: HardEvent[] = [
    ...studentSolutions(sb).map(s => ({ kind: 'solution' as const, ...s })),
    ...teacherComments(rb).map(c => ({ kind: 'comment' as const, ...c })),
  ]
  return evs.sort((a, b) => (a.at || '').localeCompare(b.at || ''))
}

// Последнее решение ученика — то, к чему относится комментарий/разметка.
export function lastSolutionOf(sb?: HardTaskStudentBlock | null): HardSolution | null {
  const s = studentSolutions(sb)
  return s.length ? s[s.length - 1] : null
}

export type HardTaskStatus = 'in_progress' | 'submitted' | 'returned' | 'completed'

export function taskStatus(sb?: HardTaskStudentBlock | null, rb?: HardTaskReviewBlock | null): HardTaskStatus {
  const evs = mergeTaskEvents(sb, rb)
  if (evs.length === 0) return 'in_progress'
  const last = evs[evs.length - 1]
  if (last.kind === 'solution') return 'submitted'      // ждёт проверки
  if (last.verdict === 'completed') return 'completed'
  if (last.verdict === 'returned') return 'returned'    // ждёт нового решения
  return 'submitted'
}

export function hardTaskScore(rb?: HardTaskReviewBlock | null): number | null {
  const accepted = teacherComments(rb).filter(c => c.verdict === 'completed')
  const last = accepted[accepted.length - 1]
  return typeof last?.score === 'number' ? last.score : null
}

// Хронология всей хард-работы для очереди «Нужно проверить»: одна лента
// круговоротов по всем заданиям, схлопнутая по типу события. Решение ученика →
// «отправлено на проверку», вердикт «returned» → «возвращено». «completed» не
// показываем — принятые работы из очереди уходят. Подряд идущие одинаковые
// события сливаются в одно (берём последнее время).
export type HardTimelineStep = { kind: 'submitted' | 'returned'; at: string }

export function hardSubTimeline(
  sbs: HardTaskStudentBlock[],
  rbs: HardTaskReviewBlock[],
): HardTimelineStep[] {
  const rbByKey = new Map(rbs.map(b => [b.key, b]))
  const raw: HardTimelineStep[] = []
  for (const sb of sbs) {
    for (const ev of mergeTaskEvents(sb, rbByKey.get(sb.key))) {
      if (ev.kind === 'solution') raw.push({ kind: 'submitted', at: ev.at })
      else if (ev.verdict === 'returned') raw.push({ kind: 'returned', at: ev.at })
    }
  }
  raw.sort((a, b) => (a.at || '').localeCompare(b.at || ''))
  const out: HardTimelineStep[] = []
  for (const e of raw) {
    const last = out[out.length - 1]
    if (last && last.kind === e.kind) last.at = e.at
    else out.push({ ...e })
  }
  return out
}

// Статус всей хард-работы по задачам (для очереди учителя и бейджа ученика).
export function deriveHardRowStatus(
  sbs: HardTaskStudentBlock[],
  rbs: HardTaskReviewBlock[],
): 'submitted' | 'returned' | 'completed' {
  const rbByKey = new Map(rbs.map(b => [b.key, b]))
  const statuses = sbs.map(sb => taskStatus(sb, rbByKey.get(sb.key)))
  if (statuses.some(s => s === 'submitted')) return 'submitted'
  if (statuses.length > 0 && statuses.every(s => s === 'completed')) return 'completed'
  return 'returned'
}

// Сумма принятых оценок (1–5 за задание) → score строки lesson_progress.
export function deriveHardScore(rbs: HardTaskReviewBlock[]): number {
  return rbs.reduce((sum, rb) => sum + (hardTaskScore(rb) ?? 0), 0)
}

// Ключ синтетической одной вкладки для legacy одиночного харда (из урока, без
// banked hard_tasks). Связывает старые поля строки с per-task/раунд-моделью.
export const LEGACY_HARD_KEY = 'main'

// Legacy одиночный хард (ответ в `comment`/`attachments`, ревью в
// `review_comment`/`review_attachments`) → синтетическая 1-вкладка с одним
// раундом решения и одним раундом комментария. Чтобы история (тред) показывалась
// единообразно с новым per-task хардом. Не пишет в БД — только читает; первая
// новая запись (решение ученика / ревью учителя) уже сохраняется в v2.
export function legacyHardToBlocks(row: {
  comment?: string | null
  attachments?: { photos?: string[]; board?: string | null } | null
  review_comment?: string | null
  review_attachments?: { photos?: string[]; board?: string | null; annotation?: Annotation | null } | null
  status?: string | null
  updated_at?: string | null
}): { taskBlocks: HardTaskStudentBlock[]; reviewBlocks: HardTaskReviewBlock[] } {
  const at = row.updated_at ?? ''
  const aPhotos = Array.isArray(row.attachments?.photos) ? row.attachments!.photos! : []
  const aBoard = row.attachments?.board ?? null
  const hasAnswer = !!(row.comment || aPhotos.length || aBoard)
  const taskBlocks: HardTaskStudentBlock[] = hasAnswer
    ? [{ key: LEGACY_HARD_KEY, solutions: [{ id: 'legacy-sol', at, answer: row.comment ?? '', photos: aPhotos, board: aBoard }] }]
    : []

  const rPhotos = Array.isArray(row.review_attachments?.photos) ? row.review_attachments!.photos! : []
  const rBoard = row.review_attachments?.board ?? null
  const rAnn = row.review_attachments?.annotation ?? null
  const hasReview = !!(row.review_comment || rPhotos.length || rBoard || rAnn)
  const verdict = row.status === 'completed' ? 'completed' : row.status === 'returned' ? 'returned' : undefined
  const reviewBlocks: HardTaskReviewBlock[] = hasReview
    ? [{
        key: LEGACY_HARD_KEY,
        comments: [{
          id: 'legacy-cmt', at, comment: row.review_comment ?? '',
          photos: rPhotos, board: rBoard, boardMode: rAnn ? 'over' : 'beside',
          annotation: rAnn, verdict, score: null,
        }],
      }]
    : []

  return { taskBlocks, reviewBlocks }
}

export type HwAssignment = HomeworkItem

export type HwSubmission = {
  id: string
  hwId: string
  studentId: string
  studentName: string
  submittedAt: string
  verdict: 'pending' | 'accepted' | 'returned'
  score: number
  comment: string
}

function mapRow(h: any): HwAssignment {
  const subs: { verdict: string }[] = h.homework_submissions ?? []
  const submittedCount = subs.length
  const reviewedCount = subs.filter(s => s.verdict !== 'pending').length
  return {
    id: h.id,
    groupId: h.group_id,
    groupName: h.groups?.name ?? '',
    icon: h.groups?.icon ?? '📚',
    color: h.groups?.color ?? 'var(--color-purple)',
    title: h.title,
    assignedAt: h.assigned_at
      ? new Date(h.assigned_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : '',
    dueDate: h.due_date
      ? new Date(h.due_date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
      : '',
    submittedCount,
    totalCount: h.total_students ?? 0,
    reviewedCount,
    status: h.status ?? 'active',
    lessonId: h.lesson_id ?? null,
    hardTaskIds: Array.isArray(h.hard_task_ids) ? h.hard_task_ids : [],
    hardTotal: h.hard_total ?? (Array.isArray(h.hard_task_ids) ? h.hard_task_ids.length : 0),
    isIndividual: h.groups?.is_individual ?? false,
  }
}

export function useHomework() {
  const [homework, setHomework] = useState<HwAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const uid = await getOwnerId()
    const { data } = await supabase
      .from('homework')
      .select('*, groups(name, icon, color, is_individual), homework_submissions(verdict)')
      .eq('created_by', uid)
      .order('created_at', { ascending: false })
    if (data) setHomework(data.map(mapRow))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createHomework(hw: {
    groupId: string
    title: string
    dueDate: string
    taskIds: number[]
    totalStudents: number
    lessonId?: string | null
    hardTaskIds?: number[]
    hardTotal?: number
    hardTasks?: HardTaskDef[]
  }) {
    const { data, error } = await supabase.from('homework').insert({
      group_id: hw.groupId,
      title: hw.title,
      assigned_at: new Date().toISOString().slice(0, 10),
      due_date: hw.dueDate || null,
      status: 'active',
      task_ids: hw.taskIds,
      total_students: hw.totalStudents,
      lesson_id: hw.lessonId || null,
      hard_task_ids: hw.hardTaskIds ?? [],
      hard_total: hw.hardTotal ?? (hw.hardTaskIds?.length ?? 0),
      hard_tasks: hw.hardTasks ?? [],
      created_by: await getOwnerId(),
    }).select().single()
    if (!error) await load()
    return { data, error }
  }

  async function updateHomework(id: string, hw: {
    groupId: string
    title: string
    dueDate: string
    taskIds: number[]
    totalStudents: number
    lessonId?: string | null
    hardTaskIds?: number[]
    hardTotal?: number
    hardTasks?: HardTaskDef[]
  }) {
    const { error } = await supabase.from('homework').update({
      group_id: hw.groupId,
      title: hw.title,
      due_date: hw.dueDate || null,
      task_ids: hw.taskIds,
      total_students: hw.totalStudents,
      lesson_id: hw.lessonId || null,
      hard_task_ids: hw.hardTaskIds ?? [],
      hard_total: hw.hardTotal ?? (hw.hardTaskIds?.length ?? 0),
      hard_tasks: hw.hardTasks ?? [],
    }).eq('id', id)
    if (!error) await load()
    return { error }
  }

  async function closeHomework(id: string) {
    await supabase.from('homework').update({ status: 'closed' }).eq('id', id)
    await load()
  }

  return { homework, loading, createHomework, updateHomework, closeHomework, reload: load }
}

let hardChannelSeq = 0

export function useHardSubmissions() {
  const [submissions, setSubmissions] = useState<HardSub[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    // Fetch hard submissions: new format (lesson_ref ends with '-hard')
    // OR old format (comment non-empty, no '-hard' suffix)
    const uid = await getOwnerId()
    const { data: rows } = await supabase
      .from('lesson_progress')
      .select('*, students!inner(name, groups!inner(created_by))')
      .eq('students.groups.created_by', uid)
      .or('lesson_ref.like.%-hard,and(comment.neq.,lesson_ref.not.like.%-hard)')
      .in('status', ['submitted', 'returned', 'completed'])
      .order('updated_at', { ascending: false })

    if (!rows) { setLoading(false); return }

    // Derive base lesson refs (strip '-hard' suffix if present)
    const baseRefs = [...new Set(rows.map(r =>
      r.lesson_ref.endsWith('-hard') ? r.lesson_ref.slice(0, -5) : r.lesson_ref
    ))]

    // Fetch lesson titles
    const { data: lessons } = await supabase
      .from('lessons')
      .select('short_id, title')
      .in('short_id', baseRefs)
    const titleMap: Record<string, string> = Object.fromEntries(
      (lessons ?? []).map(l => [l.short_id, l.title])
    )

    setSubmissions(rows.map(r => {
      const base = r.lesson_ref.endsWith('-hard') ? r.lesson_ref.slice(0, -5) : r.lesson_ref
      // Единая per-task/раунд-модель: v2 берём как есть, legacy одиночный хард
      // синтезируем в одну вкладку с одним раундом — чтобы тред показывался везде.
      const lg = legacyHardToBlocks(r)
      const taskBlocks = isNewHard(r.attachments) ? (r.attachments.tasks as HardTaskStudentBlock[]) : lg.taskBlocks
      const reviewBlocks = isNewHard(r.review_attachments) ? (r.review_attachments.tasks as HardTaskReviewBlock[]) : lg.reviewBlocks
      const isMulti = taskBlocks.length > 0
      return {
        id: r.id,
        lessonRef: r.lesson_ref,
        baseRef: base,
        lessonTitle: titleMap[base] ?? base,
        studentId: r.student_id,
        studentName: (r.students as { name: string } | null)?.name ?? '',
        score: r.score ?? 0,
        comment: r.comment ?? '',
        reviewComment: r.review_comment ?? '',
        status: r.status as HardSub['status'],
        updatedAt: r.updated_at ?? '',
        isMultiTask: isMulti,
        taskBlocks,
        reviewBlocks,
        attachments: {
          photos: !isMulti && Array.isArray(r.attachments?.photos) ? r.attachments.photos : [],
          board: !isMulti ? (r.attachments?.board ?? null) : null,
        },
        reviewAttachments: {
          photos: Array.isArray(r.review_attachments?.photos) ? r.review_attachments.photos : [],
          board: r.review_attachments?.board ?? null,
          annotation: r.review_attachments?.annotation ?? null,
        },
      }
    }))
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Unique channel name per hook instance — multiple components (e.g. the
    // homework list + the full-screen hard review) can mount this hook at once,
    // and Supabase throws if two subscribers share a channel name.
    const channelName = `hard-submissions-${hardChannelSeq++}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lesson_progress' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function reviewHard(
    id: string,
    verdict: 'completed' | 'returned',
    comment = '',
    reviewAttachments?: HardReviewNew | { photos: string[]; board: string | null; annotation?: Annotation | null },
  ) {
    const hasAtt = !!reviewAttachments && (
      isNewHard(reviewAttachments)
        ? (reviewAttachments as HardReviewNew).tasks.length > 0
        : !!((reviewAttachments as { photos: string[]; board: string | null; annotation?: Annotation | null }).photos.length
            || (reviewAttachments as { board: string | null }).board
            || (reviewAttachments as { annotation?: Annotation | null }).annotation)
    )
    await supabase.from('lesson_progress').update({
      status: verdict,
      review_comment: comment || null,
      review_attachments: hasAtt ? reviewAttachments : null,
    }).eq('id', id)
    await load()
  }

  // Per-task ревью с раундами: пишем весь обновлённый review_attachments
  // (история комментариев) + статус строки, выведенный из задач, + сумму оценок.
  async function reviewHardMulti(
    id: string,
    review: HardReviewNew,
    status: 'submitted' | 'returned' | 'completed',
    score: number,
  ) {
    await supabase.from('lesson_progress').update({
      status,
      score,
      review_comment: null,
      review_attachments: review,
    }).eq('id', id)
    await load()
  }

  return { submissions, loading, reviewHard, reviewHardMulti, reload: load }
}

export function useHomeworkSubmissions(hwId: string | null) {
  const [submissions, setSubmissions] = useState<HwSubmission[]>([])

  useEffect(() => {
    if (!hwId) return
    supabase
      .from('homework_submissions')
      .select('*, students(name)')
      .eq('hw_id', hwId)
      .then(({ data }) => {
        if (data) setSubmissions(data.map((s: any) => ({
          id: s.id,
          hwId: s.hw_id,
          studentId: s.student_id,
          studentName: s.students?.name ?? '',
          submittedAt: s.submitted_at ?? '',
          verdict: s.verdict ?? 'pending',
          score: s.score ?? 0,
          comment: s.comment ?? '',
        })))
      })
  }, [hwId])

  return submissions
}
