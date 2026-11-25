// События учеников и ответы уроков для MCP (этап 1, только чтение).
//
// Модель доступа как в readTools.ts: клиент Supabase от имени учителя, RLS,
// никакого service role, и поверх RLS — явное сужение до СВОИХ учеников
// (`students.created_by = uid`) плюс повторная проверка каждой строки в коде.
//
// Лента — таблица student_activity (миграция 20261126090000): серверное время
// и монотонный id, поэтому курсор не зависит от часов устройства ученика и не
// теряет события. Содержимое берётся из lesson_progress в момент вызова: если
// ученица дважды поправила комментарий, оба события покажут последний текст.
//
// Все свободные тексты учеников уходят только как `untrusted_text`.

import { baseRef, type Db, inChunks, num, ownStudents, type OwnStudent, ReadError, refTitles, rows, str, type ToolResult } from './readTools.ts'
import { cleanText, untrusted } from './untrusted.ts'

type Row = Record<string, unknown>
const ok = (value: unknown): ToolResult => ({ ok: true, value })
const no = (message: string): ToolResult => ({ ok: false, message })

const SCAN = 500
const DAY = 86_400_000
export const EVENT_KINDS = ['lesson_done', 'submitted', 'returned', 'comment'] as const
export type EventKind = typeof EVENT_KINDS[number]
export const PHOTO_MAX_BYTES = 1_500_000

async function safe(fn: () => Promise<ToolResult>): Promise<ToolResult> {
  try { return await fn() } catch (e) {
    if (e instanceof ReadError) return no('Не удалось прочитать данные Искры. Попробуйте ещё раз.')
    throw e
  }
}

// ─── Курсор ─────────────────────────────────────────────────────────────────

export function encodeCursor(id: number): string { return `evt_${id}` }
export function decodeCursor(cursor: string | undefined): number | null | 'bad' {
  if (!cursor) return null
  const m = /^evt_(\d{1,18})$/.exec(cursor)
  return m ? Number(m[1]) : 'bad'
}

// ─── Фото и ответы внутри lesson_progress.attachments ───────────────────────

/** Все ссылки на фото/доску в ответе, в стабильном порядке (индекс = id вложения). */
export function collectPhotos(att: unknown): string[] {
  const out: string[] = []
  const push = (v: unknown) => { if (typeof v === 'string' && v) out.push(v) }
  const a = att as { photos?: unknown[]; board?: unknown; tasks?: unknown[] } | null
  if (!a || typeof a !== 'object') return out
  if (Array.isArray(a.photos)) a.photos.forEach(push)
  if (Array.isArray(a.tasks)) {
    for (const t of a.tasks as { photos?: unknown[]; board?: unknown; solutions?: { photos?: unknown[]; board?: unknown }[] }[]) {
      if (!t || typeof t !== 'object') continue
      if (Array.isArray(t.photos)) t.photos.forEach(push)
      if (Array.isArray(t.solutions)) for (const s of t.solutions) { if (s && Array.isArray(s.photos)) s.photos.forEach(push) }
    }
  }
  return out
}

/** Тексты решений хард-уровня: последняя попытка по каждому заданию. */
function hardAnswers(att: unknown): { task: string; answer: ReturnType<typeof untrusted> }[] {
  const tasks = (att as { tasks?: unknown[] } | null)?.tasks
  if (!Array.isArray(tasks)) return []
  const out: { task: string; answer: ReturnType<typeof untrusted> }[] = []
  for (const t of tasks as { key?: string; statement?: string; answer?: string; solutions?: { answer?: string }[] }[]) {
    if (!t || typeof t !== 'object') continue
    const last = Array.isArray(t.solutions) && t.solutions.length ? t.solutions[t.solutions.length - 1]?.answer : t.answer
    const answer = untrusted('student_answer', last)
    if (answer) out.push({ task: cleanText(t.statement || t.key || '', 200), answer })
    if (out.length >= 20) break
  }
  return out
}

/** Ответы базового уровня (снимок basic-1: answers.rows или attachments.rows). */
function basicRows(src: unknown) {
  const list = (src as { rows?: unknown[] } | null)?.rows
  if (!Array.isArray(list)) return []
  return (list as Row[]).slice(0, 60).map(r => ({
    n: num(r.n), type: str(r.type), verdict: str(r.verdict),
    task: cleanText(r.prompt, 300),
    answer: r.voice ? { source: 'student_answer' as const, untrusted_text: '[голосовой ответ]' } : untrusted('student_answer', r.answer, 600),
    correct: r.correct ? cleanText(r.correct, 300) : undefined,
  }))
}

const photoList = (progressId: string, att: unknown) =>
  collectPhotos(att).map((ref, i) => ({ id: `${progressId}:${i}`, kind: ref.startsWith('hwp:') ? 'photo' : 'photo_inline' }))

// ─── Курс → набор lesson_ref ────────────────────────────────────────────────

async function courseRefs(db: Db, shortId: string): Promise<{ course: { id: string; short_id: string; title: string }; lessons: Row[] } | null> {
  const courses = await rows(db.from('courses').select('id, short_id, title').eq('short_id', shortId).limit(1))
  const c = courses.find(r => r.short_id === shortId)
  if (!c) return null
  const lessons = await rows(db.from('lessons').select('short_id, title, kind, position, course_id').eq('course_id', str(c.id)).order('position'))
  return { course: { id: str(c.id), short_id: str(c.short_id), title: str(c.title) }, lessons: lessons.filter(l => l.course_id === c.id) }
}

// ─── list_events ────────────────────────────────────────────────────────────

export interface ListEventsArgs {
  since_cursor?: string; since?: string; student_id?: string; course_short_id?: string
  kinds?: EventKind[]; limit?: number
}

export function listEvents(db: Db, uid: string, p: ListEventsArgs, now = new Date()): Promise<ToolResult> {
  return safe(async () => {
    const cursor = decodeCursor(p.since_cursor)
    if (cursor === 'bad') return no('Неверный since_cursor: передайте next_cursor из прошлого ответа.')
    const limit = Math.min(Math.max(p.limit ?? 100, 1), 200)
    const own = await ownStudents(db, uid)
    let students: OwnStudent[] = [...own.values()]
    if (p.student_id) {
      const s = own.get(p.student_id)
      if (!s) return no('Ученик не найден среди ваших учеников.')
      students = [s]
    }
    let refFilter: Set<string> | null = null
    let course: { short_id: string; title: string } | null = null
    if (p.course_short_id) {
      const found = await courseRefs(db, p.course_short_id)
      if (!found) return no('Курс не найден.')
      course = found.course
      refFilter = new Set(found.lessons.map(l => str(l.short_id)))
    }
    const kinds = new Set<string>(p.kinds?.length ? p.kinds : EVENT_KINDS)
    const sinceTs = cursor == null ? (p.since ?? new Date(now.getTime() - 7 * DAY).toISOString()) : null
    const ids = students.map(s => s.id)
    if (!ids.length) return ok({ events: [], next_cursor: p.since_cursor ?? null, has_more: false })

    const scanned = (await inChunks(ids, part => {
      let q = db.from('student_activity').select('id, student_id, progress_id, lesson_ref, kind, at').in('student_id', part)
      if (cursor != null) q = q.gt('id', cursor)
      if (sinceTs) q = q.gte('at', sinceTs)
      return q.order('id', { ascending: true }).limit(SCAN)
    })).sort((a, b) => Number(a.id) - Number(b.id)).slice(0, SCAN)

    const picked: Row[] = []
    let lastSeen = cursor ?? 0
    let stoppedEarly = false
    for (const r of scanned) {
      if (picked.length >= limit) { stoppedEarly = true; break }
      lastSeen = Number(r.id)
      if (!own.has(str(r.student_id))) continue // второй слой: строка не своего ученика
      if (p.student_id && r.student_id !== p.student_id) continue
      if (!kinds.has(str(r.kind))) continue
      if (refFilter && !refFilter.has(baseRef(str(r.lesson_ref)))) continue
      picked.push(r)
    }
    const hasMore = stoppedEarly || scanned.length >= SCAN

    const progressIds = [...new Set(picked.map(r => str(r.progress_id)))]
    const progress = new Map<string, Row>()
    for (const r of await inChunks(progressIds, part => db.from('lesson_progress')
      .select('id, student_id, lesson_ref, status, score, comment, attachments, updated_at').in('id', part))) {
      if (own.has(str(r.student_id))) progress.set(str(r.id), r)
    }
    const titles = await refTitles(db, uid, picked.map(r => str(r.lesson_ref)))

    const events = picked.map(r => {
      const lp = progress.get(str(r.progress_id))
      const ref = str(r.lesson_ref)
      const s = own.get(str(r.student_id))!
      const ev: Record<string, unknown> = {
        id: encodeCursor(Number(r.id)), at: str(r.at), kind: str(r.kind),
        student: { id: s.id, name: s.name },
        lesson: { ref, title: titles.get(baseRef(ref))?.title || ref, level: ref.endsWith('-hard') ? 'hard' : 'basic' },
      }
      if (course) ev.course = course.short_id
      if (!lp) { ev.note = 'Запись урока недоступна.'; return ev }
      ev.status_now = str(lp.status)
      if (num(lp.score) != null) ev.score = num(lp.score)
      const comment = untrusted('student_comment', lp.comment)
      if (comment) ev.comment = comment
      const answers = hardAnswers(lp.attachments)
      if (answers.length) ev.answers = answers
      const photos = photoList(str(lp.id), lp.attachments)
      if (photos.length) ev.attachments = photos
      return ev
    })
    // lastSeen — последняя ПРОСМОТРЕННАЯ строка (взятая или отфильтрованная):
    // следующий вызов начнёт сразу после неё, ничего не потеряв и не повторив.
    return ok({
      events,
      next_cursor: lastSeen ? encodeCursor(lastSeen) : (p.since_cursor ?? null),
      has_more: hasMore,
      note: events.length ? undefined : 'Новых событий нет.',
    })
  })
}

// ─── get_lesson_answers ─────────────────────────────────────────────────────

export function getLessonAnswers(db: Db, uid: string, p: { student_id: string; lesson_ref: string }): Promise<ToolResult> {
  return safe(async () => {
    const own = await ownStudents(db, uid)
    const s = own.get(p.student_id)
    if (!s) return no('Ученик не найден среди ваших учеников.')
    const base = baseRef(p.lesson_ref)
    const refs = [base, `${base}-hard`]
    const lp = (await rows(db.from('lesson_progress')
      .select('id, student_id, lesson_ref, status, score, comment, attachments, review_comment, updated_at')
      .eq('student_id', s.id).in('lesson_ref', refs))).filter(r => r.student_id === s.id && refs.includes(str(r.lesson_ref)))
    const attempts = (await rows(db.from('homework_attempts')
      .select('student_id, lesson_ref, number, status, score, passing_score, answers, submitted_at')
      .eq('student_id', s.id).in('lesson_ref', refs).order('submitted_at', { ascending: false }).limit(5)))
      .filter(r => r.student_id === s.id && refs.includes(str(r.lesson_ref)))
    if (!lp.length && !attempts.length) return no('По этому уроку у ученика нет записей.')
    const titles = await refTitles(db, uid, [base])
    return ok({
      student: { id: s.id, name: s.name },
      lesson: { ref: base, title: titles.get(base)?.title || base },
      levels: lp.map(r => ({
        level: str(r.lesson_ref).endsWith('-hard') ? 'hard' : 'basic',
        status: str(r.status), score: num(r.score), updated_at: str(r.updated_at),
        comment: untrusted('student_comment', r.comment) ?? undefined,
        basic_answers: basicRows(r.attachments),
        hard_answers: hardAnswers(r.attachments),
        attachments: photoList(str(r.id), r.attachments),
        teacher_review: r.review_comment ? cleanText(r.review_comment, 1000) : undefined,
      })),
      attempts: attempts.map(a => ({
        number: num(a.number), status: str(a.status), score: num(a.score), passing_score: num(a.passing_score),
        submitted_at: str(a.submitted_at), answers: basicRows(a.answers),
      })),
    })
  })
}

// ─── get_attachment ─────────────────────────────────────────────────────────

export interface Storage { download(path: string): Promise<{ data: Blob | null; error: unknown }> }
export type Photo = { ok: true; value: { mime: string; base64: string; meta: Record<string, unknown> } } | { ok: false; message: string }

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

export async function getAttachment(db: Db, storage: Storage, uid: string, p: { id: string }): Promise<Photo> {
  try {
    const m = /^([0-9a-f-]{36}):(\d{1,3})$/.exec(p.id)
    if (!m) return no('Неверный id вложения: возьмите его из list_events или get_lesson_answers.') as Photo
    const own = await ownStudents(db, uid)
    const lp = (await rows(db.from('lesson_progress').select('id, student_id, lesson_ref, attachments').eq('id', m[1]).limit(1)))
      .find(r => r.id === m[1])
    if (!lp || !own.has(str(lp.student_id))) return no('Вложение не найдено.') as Photo
    const ref = collectPhotos(lp.attachments)[Number(m[2])]
    if (!ref) return no('Вложение не найдено.') as Photo
    const meta = { student: own.get(str(lp.student_id))!.name, lesson_ref: str(lp.lesson_ref) }
    if (ref.startsWith('hwp:')) {
      const path = ref.slice(4)
      // Storage RLS решает сам: только свой ученик и не старше 7 дней.
      const { data, error } = await storage.download(path)
      if (error || !data) return no('Фото недоступно: оно удалено через 7 дней после сдачи или нет доступа.') as Photo
      if (data.size > PHOTO_MAX_BYTES) return no('Фото слишком большое для передачи. Откройте его в Искре.') as Photo
      const ext = path.split('.').pop()?.toLowerCase() ?? ''
      const mime = MIME[ext] ?? (data.type.startsWith('image/') ? data.type : '')
      if (!mime) return no('Этот тип вложения не передаётся.') as Photo
      return { ok: true, value: { mime, base64: toBase64(new Uint8Array(await data.arrayBuffer())), meta } }
    }
    const inline = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(ref)
    if (inline) {
      const b64 = inline[2].replace(/\s+/g, '')
      if (b64.length * 0.75 > PHOTO_MAX_BYTES) return no('Фото слишком большое для передачи. Откройте его в Искре.') as Photo
      return { ok: true, value: { mime: inline[1], base64: b64, meta } }
    }
    // Внешние адреса не скачиваем (SSRF) и не отдаём.
    return no('Это вложение хранится вне Искры и не передаётся.') as Photo
  } catch (e) {
    if (e instanceof ReadError) return no('Не удалось прочитать данные Искры. Попробуйте ещё раз.') as Photo
    throw e
  }
}

// ─── course_progress ────────────────────────────────────────────────────────

export function courseProgress(db: Db, uid: string, p: { course_short_id: string; group_id?: string; student_id?: string }): Promise<ToolResult> {
  return safe(async () => {
    const found = await courseRefs(db, p.course_short_id)
    if (!found) return no('Курс не найден.')
    const own = await ownStudents(db, uid)
    let students = [...own.values()]
    if (p.student_id) {
      const s = own.get(p.student_id)
      if (!s) return no('Ученик не найден среди ваших учеников.')
      students = [s]
    } else if (p.group_id) {
      students = students.filter(s => s.group_id === p.group_id)
      if (!students.length) return no('Группа не найдена среди ваших групп или в ней нет учеников.')
    }
    const lessonRefs = found.lessons.map(l => str(l.short_id)).filter(Boolean)
    const titles = new Map(found.lessons.map(l => [str(l.short_id), str(l.title)]))
    const ids = students.map(s => s.id)
    const progress: Row[] = []
    for (let i = 0; i < ids.length; i += 50) {
      const part = ids.slice(i, i + 50)
      progress.push(...await inChunks(lessonRefs.flatMap(r => [r, `${r}-hard`]), refs => db.from('lesson_progress')
        .select('student_id, lesson_ref, status, score, updated_at').in('student_id', part).in('lesson_ref', refs)))
    }
    const by = new Map<string, Row[]>()
    for (const r of progress) {
      if (!own.has(str(r.student_id))) continue
      const list = by.get(str(r.student_id)) ?? []
      list.push(r); by.set(str(r.student_id), list)
    }
    const total = lessonRefs.length
    const out = students.filter(s => p.student_id || p.group_id || by.has(s.id)).map(s => {
      const list = (by.get(s.id) ?? []).filter(r => !str(r.lesson_ref).endsWith('-hard'))
      const done = list.filter(r => r.status === 'completed')
      const scores = done.map(r => num(r.score)).filter((n): n is number => n != null)
      const last = [...list].sort((a, b) => str(b.updated_at).localeCompare(str(a.updated_at)))[0]
      return {
        student: { id: s.id, name: s.name },
        completed: done.length, submitted: list.filter(r => r.status === 'submitted').length, total,
        average_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null,
        last_activity: last ? { lesson_ref: str(last.lesson_ref), title: titles.get(str(last.lesson_ref)) || str(last.lesson_ref), status: str(last.status), at: str(last.updated_at) } : null,
      }
    })
    return ok({ course: { short_id: found.course.short_id, title: found.course.title, lessons: total }, students: out })
  })
}
