// Инструменты MCP только для чтения: группы, ученики, сводка, ошибки, тесты.
//
// Модель безопасности та же, что у пишущих инструментов: клиент Supabase от
// имени вошедшего преподавателя, RLS базы, никакого service-role и никакого
// teacher_id во входных данных. Поверх RLS каждый запрос ЯВНО сужается до своих
// учеников (`students.created_by = uid`), а строки ещё раз отфильтровываются в
// коде. Причины (проверено на проде 06.11.2026 транзакцией с откатом):
//   • `diag_results` читается по `is_staff()` — любой учитель видит ВСЕ
//     диагностики; без явного фильтра MCP отдал бы чужих учеников;
//   • администратор по `is_admin()` видит всех — через MCP он, как и любой
//     учитель, должен видеть только своих.
// Остальные таблицы (students, groups, lesson_attendance, lesson_progress,
// homework_attempts, hw_ai_grades, homework) RLS закрывает владельцем.

export interface DbResult { data: unknown; error: unknown }
export interface Query extends PromiseLike<DbResult> {
  select(columns: string): Query
  eq(column: string, value: unknown): Query
  in(column: string, values: readonly unknown[]): Query
  gte(column: string, value: unknown): Query
  lt(column: string, value: unknown): Query
  or(filter: string): Query
  order(column: string, options?: { ascending?: boolean }): Query
  limit(count: number): Query
}
export interface Db { from(table: string): Query }

export type ToolResult = { ok: true; value: unknown } | { ok: false; message: string }
const ok = (value: unknown): ToolResult => ({ ok: true, value })
const no = (message: string): ToolResult => ({ ok: false, message })

class ReadError extends Error {}

type Row = Record<string, unknown>
interface OwnStudent { id: string; name: string; group_id: string | null }
interface OwnGroup { id: string; name: string; subject: string | null; level: string | null; is_individual: boolean }

const CHUNK = 150
const DAY = 86_400_000
const MISTAKE_VERDICTS = new Set(['wrong', 'hint', 'empty'])
// Проверка ИИ готова: graded — ждёт учителя, confirmed/changed — учитель подтвердил (миграция 0116).
const AI_DONE = new Set(['graded', 'confirmed', 'changed'])

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const round1 = (n: number) => Math.round(n * 10) / 10
const isoDate = (d: Date) => d.toISOString().slice(0, 10)

async function rows(q: PromiseLike<DbResult>): Promise<Row[]> {
  const { data, error } = await q
  if (error) throw new ReadError('db')
  return Array.isArray(data) ? (data as Row[]) : []
}

/** Запрос `.in()` порциями, чтобы URL PostgREST не разрастался. */
async function inChunks(ids: readonly string[], make: (part: string[]) => PromiseLike<DbResult>): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...await rows(make(ids.slice(i, i + CHUNK))))
  return out
}

export interface Period { since: string; until: string; untilExclusive: string; fromTs: string; toTs: string }

/** Период в датах YYYY-MM-DD включительно; по умолчанию последние 90 дней. */
export function period(since?: string, until?: string, now = new Date()): Period {
  const to = until ?? isoDate(now)
  const from = since ?? isoDate(new Date(Date.parse(`${to}T00:00:00Z`) - 89 * DAY))
  const toExclusive = isoDate(new Date(Date.parse(`${to}T00:00:00Z`) + DAY))
  return { since: from, until: to, untilExclusive: toExclusive, fromTs: `${from}T00:00:00Z`, toTs: `${toExclusive}T00:00:00Z` }
}

async function ownStudents(db: Db, uid: string): Promise<Map<string, OwnStudent>> {
  const list = await rows(db.from('students').select('id, name, group_id, created_by').eq('created_by', uid).order('name'))
  const out = new Map<string, OwnStudent>()
  for (const r of list) {
    if (r.created_by !== uid) continue // защита на случай расширения политики
    out.set(str(r.id), { id: str(r.id), name: str(r.name), group_id: (r.group_id as string | null) ?? null })
  }
  return out
}

async function ownGroups(db: Db, uid: string): Promise<Map<string, OwnGroup>> {
  const list = await rows(db.from('groups').select('id, name, subject, level, is_individual, created_by').eq('created_by', uid).order('name'))
  const out = new Map<string, OwnGroup>()
  for (const r of list) {
    if (r.created_by !== uid) continue
    out.set(str(r.id), {
      id: str(r.id), name: str(r.name), subject: (r.subject as string | null) ?? null,
      level: (r.level as string | null) ?? null, is_individual: r.is_individual === true,
    })
  }
  return out
}

interface Scope { label: string; students: OwnStudent[]; groups: Map<string, OwnGroup>; all: Map<string, OwnStudent> }

/** Ученик, группа или все свои. Чужой id → понятная ошибка без подробностей. */
async function resolveScope(db: Db, uid: string, p: { student_id?: string; group_id?: string }): Promise<Scope | string> {
  if (p.student_id && p.group_id) return 'Укажите либо student_id, либо group_id, не оба сразу.'
  const [all, groups] = await Promise.all([ownStudents(db, uid), ownGroups(db, uid)])
  if (p.student_id) {
    const s = all.get(p.student_id)
    if (!s) return 'Ученик не найден среди ваших учеников.'
    return { label: `ученик ${s.name}`, students: [s], groups, all }
  }
  if (p.group_id) {
    const g = groups.get(p.group_id)
    if (!g) return 'Группа не найдена среди ваших групп.'
    return { label: `группа ${g.name}`, students: [...all.values()].filter(s => s.group_id === g.id), groups, all }
  }
  return { label: 'все ваши ученики', students: [...all.values()], groups, all }
}

async function guard(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try { return await fn() } catch (e) {
    if (e instanceof ReadError) return no('Не удалось прочитать данные Искры. Попробуйте ещё раз.')
    throw e
  }
}

/** lesson_ref → «основа»: short_id урока или `hw-<uuid>` задания. */
function baseRef(ref: string): string {
  return ref.replace(/^video-/, '').replace(/-hard$/, '').split('~')[0]
}

/** Названия уроков и заданий для набора lesson_ref (уроки читаются публично, задания — свои). */
async function refTitles(db: Db, uid: string, refs: Iterable<string>): Promise<Map<string, { title: string; kind: string }>> {
  const bases = [...new Set([...refs].map(baseRef))]
  const hwIds = bases.filter(b => b.startsWith('hw-')).map(b => b.slice(3))
  const shortIds = bases.filter(b => !b.startsWith('hw-'))
  const out = new Map<string, { title: string; kind: string }>()
  for (const r of await inChunks(shortIds, part => db.from('lessons').select('short_id, title, kind').in('short_id', part))) {
    out.set(str(r.short_id), { title: str(r.title), kind: str(r.kind) || 'lesson' })
  }
  for (const r of await inChunks(hwIds, part => db.from('homework').select('id, title, created_by').eq('created_by', uid).in('id', part))) {
    if (r.created_by === uid) out.set(`hw-${str(r.id)}`, { title: str(r.title), kind: 'homework' })
  }
  return out
}

const titleOf = (titles: Map<string, { title: string }>, ref: string) => titles.get(baseRef(ref))?.title || ref

// ─── list_my_groups ──────────────────────────────────────────────────────────

export function listMyGroups(db: Db, uid: string): Promise<ToolResult> {
  return guard(async () => {
    const [groups, students] = await Promise.all([ownGroups(db, uid), ownStudents(db, uid)])
    const counts = new Map<string, number>()
    for (const s of students.values()) if (s.group_id) counts.set(s.group_id, (counts.get(s.group_id) ?? 0) + 1)
    return ok([...groups.values()].map(g => ({ ...g, students: counts.get(g.id) ?? 0 })))
  })
}

// ─── list_my_students ────────────────────────────────────────────────────────

export function listMyStudents(db: Db, uid: string, p: { group_id?: string }): Promise<ToolResult> {
  return guard(async () => {
    const scope = await resolveScope(db, uid, { group_id: p.group_id })
    if (typeof scope === 'string') return no(scope)
    return ok(scope.students.map(s => ({
      id: s.id, name: s.name,
      group: s.group_id && scope.groups.has(s.group_id) ? { id: s.group_id, name: scope.groups.get(s.group_id)!.name } : null,
    })))
  })
}

// ─── student_summary ─────────────────────────────────────────────────────────

const DONE = new Set(['submitted', 'returned', 'completed'])

export function studentSummary(db: Db, uid: string, p: { student_id: string; since?: string; until?: string }, now = new Date()): Promise<ToolResult> {
  return guard(async () => {
    const scope = await resolveScope(db, uid, { student_id: p.student_id })
    if (typeof scope === 'string') return no(scope)
    const student = scope.students[0]
    const per = period(p.since, p.until, now)
    const id = student.id
    const today = isoDate(now)

    // Только учебные поля. Телефон, почта, контакты родителей, пароль, оплаты не читаем.
    const [profile] = await rows(db.from('students')
      .select('id, started_at, hw_score, test_score, trial_score, last_visit, created_by')
      .eq('created_by', uid).eq('id', id).limit(1))

    const attendance = (await rows(db.from('lesson_attendance').select('student_id, lesson_date, present, grade, lesson_title')
      .eq('student_id', id).gte('lesson_date', per.since).lt('lesson_date', per.untilExclusive)))
      .filter(r => r.student_id === id)
    const marked = attendance.filter(r => typeof r.present === 'boolean')
    const present = marked.filter(r => r.present === true).length
    const grades = attendance.map(r => num(r.grade)).filter((g): g is number => g !== null)

    const progress = (await rows(db.from('lesson_progress').select('student_id, lesson_ref, status, score, updated_at')
      .eq('student_id', id).gte('updated_at', per.fromTs).lt('updated_at', per.toTs)))
      .filter(r => r.student_id === id && !str(r.lesson_ref).startsWith('video-'))
    const byStatus: Record<string, number> = {}
    for (const r of progress) byStatus[str(r.status)] = (byStatus[str(r.status)] ?? 0) + 1
    const scores = progress.map(r => num(r.score)).filter((s): s is number => s !== null)

    // Долги: задания группы со сроком в прошлом без сданной работы + работы, возвращённые на доработку.
    const allProgress = (await rows(db.from('lesson_progress').select('student_id, lesson_ref, status').eq('student_id', id)))
      .filter(r => r.student_id === id)
    const doneRefs = new Set(allProgress.filter(r => DONE.has(str(r.status))).map(r => str(r.lesson_ref)))
    const homework = student.group_id
      ? (await rows(db.from('homework').select('id, title, due_date, lesson_id, created_by, group_id')
        .eq('created_by', uid).eq('group_id', student.group_id).gte('due_date', per.since).lt('due_date', today)))
        .filter(r => r.created_by === uid && r.group_id === student.group_id)
      : []
    const lessonIds = [...new Set(homework.map(h => str(h.lesson_id)).filter(Boolean))]
    const lessonShort = new Map((await inChunks(lessonIds, part => db.from('lessons').select('id, short_id').in('id', part)))
      .map(r => [str(r.id), str(r.short_id)]))
    const overdue = homework.filter(h => {
      if (doneRefs.has(`hw-${str(h.id)}`)) return false
      const short = lessonShort.get(str(h.lesson_id))
      return !(short && doneRefs.has(short))
    }).map(h => ({ title: str(h.title), due_date: str(h.due_date) }))
    const returned = allProgress.filter(r => r.status === 'returned').map(r => str(r.lesson_ref))
    const titles = await refTitles(db, uid, [...returned, ...progress.map(r => str(r.lesson_ref))])

    const ai = (await rows(db.from('hw_ai_grades').select('student_id, teacher_id, lesson_ref, status, primary_score, max_score, final_score, confirmed_at, submitted_at')
      .eq('teacher_id', uid).eq('student_id', id).gte('submitted_at', per.fromTs).lt('submitted_at', per.toTs)))
      .filter(r => r.student_id === id && AI_DONE.has(str(r.status)))
    // Первичные баллы ИИ; final_score — в шкале score (процент), с ними не складываем.
    const aiPrimary = ai.reduce((a, r) => a + (num(r.primary_score) ?? 0), 0)
    const aiMax = ai.reduce((a, r) => a + (num(r.max_score) ?? 0), 0)

    const diag = await ownDiagResults(db, [id], per)

    return ok({
      student: { id, name: student.name, group: student.group_id ? scope.groups.get(student.group_id)?.name ?? null : null },
      period: { since: per.since, until: per.until },
      profile: profile ? {
        started_at: profile.started_at ?? null, last_visit: profile.last_visit ?? null,
        stored_scores: { homework: profile.hw_score ?? null, tests: profile.test_score ?? null, trial: profile.trial_score ?? null },
      } : null,
      attendance: {
        marked: marked.length, present, absent: marked.length - present,
        rate_pct: marked.length ? Math.round(present / marked.length * 100) : null,
        avg_grade: grades.length ? round1(grades.reduce((a, b) => a + b, 0) / grades.length) : null,
        recent_absences: marked.filter(r => r.present === false)
          .sort((a, b) => str(b.lesson_date).localeCompare(str(a.lesson_date))).slice(0, 10)
          .map(r => ({ date: str(r.lesson_date), lesson: str(r.lesson_title) || null })),
      },
      homework: {
        by_status: byStatus,
        avg_score: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        ai_checked: ai.length ? { works: ai.length, ai_primary_points: aiPrimary, max_points: aiMax, confirmed_by_teacher: ai.filter(r => r.confirmed_at).length, changed_by_teacher: ai.filter(r => r.status === 'changed').length } : null,
      },
      debts: {
        overdue_homework: overdue,
        returned_for_rework: returned.map(ref => titleOf(titles, ref)),
        note: 'Учебные долги: просроченные задания группы и работы на доработке. Оплаты сюда не входят.',
      },
      diagnostics: diag.map(d => ({ subject: d.subject, date: d.date, score_pct: d.score_pct, completed: d.completed })),
    })
  })
}

// ─── diag_results: явный фильтр, RLS здесь не закрывает ──────────────────────

interface DiagRow { student_id: string; subject: string; date: string; score_pct: number | null; answered: number | null; total: number | null; completed: boolean; topics: Record<string, { total: number; correct: number }> }

async function ownDiagResults(db: Db, ids: readonly string[], per: Period): Promise<DiagRow[]> {
  const own = new Set(ids)
  const list = await inChunks(ids, part => db.from('diag_results')
    .select('id, student_id, linked_student_id, subject, results, score_pct, answered, total, completed, created_at')
    .or(`student_id.in.(${part.join(',')}),linked_student_id.in.(${part.join(',')})`)
    .gte('created_at', per.fromTs).lt('created_at', per.toTs).order('created_at', { ascending: false }))
  const seen = new Set<string>()
  const out: DiagRow[] = []
  for (const r of list) {
    if (seen.has(str(r.id))) continue // строка могла прийти в двух порциях
    seen.add(str(r.id))
    const who = own.has(str(r.student_id)) ? str(r.student_id) : own.has(str(r.linked_student_id)) ? str(r.linked_student_id) : ''
    if (!who) continue // политика diag_results пускает любого учителя — чужие строки отбрасываем
    const topics: DiagRow['topics'] = {}
    if (r.results && typeof r.results === 'object' && !Array.isArray(r.results)) {
      for (const [topic, v] of Object.entries(r.results as Record<string, unknown>)) {
        const t = v as { total?: unknown; correct?: unknown }
        const total = num(t?.total), correct = num(t?.correct)
        if (total !== null && correct !== null) topics[topic] = { total, correct }
      }
    }
    out.push({
      student_id: who, subject: str(r.subject), date: str(r.created_at).slice(0, 10),
      score_pct: num(r.score_pct), answered: num(r.answered), total: num(r.total), completed: r.completed === true, topics,
    })
  }
  return out
}

// ─── mistakes_by_topic ───────────────────────────────────────────────────────

interface Bucket { key: string; misses: number; tries: number; students: Set<string>; examples: string[] }

function bump(map: Map<string, Bucket>, key: string, student: string, misses: number, tries: number, example?: string) {
  const b = map.get(key) ?? { key, misses: 0, tries: 0, students: new Set<string>(), examples: [] }
  b.misses += misses
  b.tries += tries
  b.students.add(student)
  if (example && b.examples.length < 3 && !b.examples.includes(example)) b.examples.push(example)
  map.set(key, b)
}

function top(map: Map<string, Bucket>, limit: number, names: Map<string, OwnStudent>, unit: string) {
  return [...map.values()].filter(b => b.misses > 0)
    .sort((a, b) => b.misses - a.misses || b.students.size - a.students.size).slice(0, limit)
    .map(b => ({
      topic: b.key, [unit]: b.misses, out_of: b.tries,
      students: [...b.students].map(id => names.get(id)?.name ?? '').filter(Boolean),
      examples: b.examples,
    }))
}

export function mistakesByTopic(db: Db, uid: string, p: { student_id?: string; group_id?: string; since?: string; until?: string; limit?: number }, now = new Date()): Promise<ToolResult> {
  return guard(async () => {
    const scope = await resolveScope(db, uid, p)
    if (typeof scope === 'string') return no(scope)
    const per = period(p.since, p.until, now)
    const limit = p.limit ?? 15
    const ids = scope.students.map(s => s.id)
    const own = new Set(ids)

    // 1. Проверки ИИ по критериям ФИПИ: недобранные баллы по номерам заданий.
    const exam = new Map<string, Bucket>()
    const ai = (await inChunks(ids, part => db.from('hw_ai_grades')
      .select('student_id, teacher_id, subject, exam, status, result, confirmed_at, submitted_at')
      .eq('teacher_id', uid).in('student_id', part).gte('submitted_at', per.fromTs).lt('submitted_at', per.toTs)))
      .filter(r => own.has(str(r.student_id)) && AI_DONE.has(str(r.status)))
    for (const r of ai) {
      const tasks = (r.result as { tasks?: unknown } | null)?.tasks
      if (!Array.isArray(tasks)) continue
      for (const t of tasks as Row[]) {
        const max = num(t.max_points), got = num(t.points)
        if (max === null || got === null) continue
        const n = num(t.kim_n) ?? num(t.n)
        const key = `${str(r.exam) || str(r.subject) || 'ДЗ'}${n !== null ? ` №${n}` : ''}`
        bump(exam, key, str(r.student_id), Math.max(0, max - got), max, got < max ? clip(str(t.comment), 280) || undefined : undefined)
      }
    }

    // 2. Автопроверка ДЗ: ответы с вердиктом «неверно/подсказка/пусто».
    const hw = new Map<string, Bucket>()
    const attempts = (await inChunks(ids, part => db.from('homework_attempts')
      .select('student_id, lesson_ref, answers, submitted_at')
      .in('student_id', part).gte('submitted_at', per.fromTs).lt('submitted_at', per.toTs)))
      .filter(r => own.has(str(r.student_id)))
    const titles = await refTitles(db, uid, attempts.map(r => str(r.lesson_ref)))
    for (const r of attempts) {
      const list = (r.answers as { rows?: unknown } | null)?.rows
      if (!Array.isArray(list)) continue
      const lesson = titleOf(titles, str(r.lesson_ref))
      for (const a of list as Row[]) {
        const verdict = str(a.verdict)
        if (verdict === 'review') continue // ждёт ручной проверки, ещё не ошибка
        const miss = MISTAKE_VERDICTS.has(verdict)
        const key = `${lesson} · задание ${num(a.n) ?? '?'}${str(a.type) ? ` (${str(a.type)})` : ''}`
        bump(hw, key, str(r.student_id), miss ? 1 : 0, 1, miss ? clip(str(a.prompt), 160) || undefined : undefined)
      }
    }

    // 3. Диагностики: темы с неверными ответами.
    const diag = new Map<string, Bucket>()
    for (const d of await ownDiagResults(db, ids, per)) {
      for (const [topic, t] of Object.entries(d.topics)) {
        bump(diag, `${d.subject ? `${d.subject}: ` : ''}${topic}`, d.student_id, Math.max(0, t.total - t.correct), t.total)
      }
    }

    return ok({
      scope: scope.label, students: ids.length, period: { since: per.since, until: per.until },
      exam_tasks_ai_checked: top(exam, limit, scope.all, 'points_lost'),
      homework_tasks: top(hw, limit, scope.all, 'wrong_answers'),
      diagnostic_topics: top(diag, limit, scope.all, 'wrong_answers'),
      note: 'exam_tasks_ai_checked — предварительная оценка ИИ по критериям; часть баллов преподаватель мог изменить при подтверждении.',
    })
  })
}

// ─── test_results ────────────────────────────────────────────────────────────

export function testResults(db: Db, uid: string, p: { student_id?: string; group_id?: string; since?: string; until?: string; limit?: number }, now = new Date()): Promise<ToolResult> {
  return guard(async () => {
    const scope = await resolveScope(db, uid, p)
    if (typeof scope === 'string') return no(scope)
    const per = period(p.since, p.until, now)
    const limit = p.limit ?? 50
    const ids = scope.students.map(s => s.id)
    const own = new Set(ids)
    const nameOf = (id: string) => scope.all.get(id)?.name ?? ''

    const diag = (await ownDiagResults(db, ids, per)).slice(0, limit).map(d => ({
      student: nameOf(d.student_id), subject: d.subject, date: d.date,
      score_pct: d.score_pct, answered: d.answered, total: d.total, completed: d.completed,
      weakest_topics: Object.entries(d.topics).filter(([, t]) => t.total > 0)
        .sort(([, a], [, b]) => a.correct / a.total - b.correct / b.total).slice(0, 3)
        .map(([topic, t]) => `${topic} ${t.correct}/${t.total}`),
    }))

    // Тесты внутри курса: уроки kind = 'test' и их lesson_progress.
    const progress = (await inChunks(ids, part => db.from('lesson_progress')
      .select('student_id, lesson_ref, status, score, updated_at')
      .in('student_id', part).gte('updated_at', per.fromTs).lt('updated_at', per.toTs)))
      .filter(r => own.has(str(r.student_id)) && !str(r.lesson_ref).startsWith('video-'))
    const titles = await refTitles(db, uid, progress.map(r => str(r.lesson_ref)))
    const course = progress.filter(r => titles.get(baseRef(str(r.lesson_ref)))?.kind === 'test')
      .sort((a, b) => str(b.updated_at).localeCompare(str(a.updated_at))).slice(0, limit)
      .map(r => ({ student: nameOf(str(r.student_id)), test: titleOf(titles, str(r.lesson_ref)), status: str(r.status), score: num(r.score), date: str(r.updated_at).slice(0, 10) }))

    return ok({ scope: scope.label, period: { since: per.since, until: per.until }, diagnostics: diag, course_tests: course })
  })
}
