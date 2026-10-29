// Edge Function: очередь предоценки ДЗ по критериям ФИПИ для сторожа на Маке.
//
// ЗАЧЕМ. Сданную работу по химии или биологии (hw_ai_grades, миграция 0116)
// предварительно оценивает Claude. Ключа API пока нет, поэтому оценивает
// Claude Code по подписке Дани на его Маке: сторож scripts/hw-grade/hw-grade-watch.py
// спрашивает очередь, берёт работу, запускает `claude -p` и сдаёт ответ.
// Так же устроен «Разбор задачи» в Таскли (server/app/research.py).
//
// ЧТО УХОДИТ НАРУЖУ. Условия заданий, эталон преподавателя и ответы ученика.
// Имени ученика, его id и названия группы в задании нет (RULES П3): сторож
// знает только id предоценки.
//
// БАЛЛ СЧИТАЕТ ФУНКЦИЯ (grader.ts → score), а не модель.
//
// Запрос: POST, заголовок x-hw-grade-secret = HW_GRADE_SECRET.
//   { action: 'queue' }                     → { tasks: [{ id, prompt }], system, schema }
//   { action: 'claim', id }                 → { ok, images: [{ name, mediaType, data }] } | 409
//     — фото и доска решения (base64): сторож кладёт их в рабочую папку Claude.
//   { action: 'result', id, result, model } → { primary, max, score }
//   { action: 'result', id, error }         → предоценка в error
//
// verify_jwt выключен: сторож ходит без пользовательского токена.

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SCHEMA, SYSTEM, buildPrompt, score, type Work, type WorkImage, type WorkTask } from './grader.ts'

const FLAGS = ['ai_enabled', 'ai_hw_grade']
// Мак взял работу и пропал — через столько она снова в очереди.
const CLAIM_TTL_MIN = 40
// За один опрос — не больше стольких работ: оценка идёт минуты.
const BATCH = 5
// Типы, в которых нечего проверять по критериям: просмотр видео, эмбед, тест Тестли.
const SKIP_TYPES = new Set(['videoWatch', 'embed', 'testly'])
const ANSWER_CAP = 6000
const STATEMENT_CAP = 4000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
)

/** Условие из редактора приходит HTML — модели нужен текст. */
function plain(html: unknown): string {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim()
}

type Row = { n: number; prompt: string; type: string; answer: string; correct?: string; verdict: string; voice?: boolean; heard?: string }
type Solution = { at?: string; answer?: string; photos?: string[]; board?: string | null }
type StudentBlock = { key: string; statement?: string; solutions?: Solution[]; answer?: string; photos?: string[]; board?: string | null }
type ReviewBlock = { key: string; comments?: { at?: string }[] }

const DATA_URL = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,/
// Больше этого картинку не отдаём: data URL в базе обычно 50–300 КБ.
const IMAGE_CAP = 5 * 1024 * 1024

/** data URL → картинка рабочей папки; не картинка или слишком большая — null. */
function image(dataUrl: unknown, name: string): WorkImage | null {
  const m = typeof dataUrl === 'string' ? DATA_URL.exec(dataUrl) : null
  if (!m || (dataUrl as string).length > IMAGE_CAP) return null
  const mediaType = m[1] === 'image/jpg' ? 'image/jpeg' : m[1]
  const ext = mediaType.split('/')[1].replace('jpeg', 'jpg')
  return { name: `${name}.${ext}`, mediaType, data: (dataUrl as string).slice(m[0].length) }
}

type Loaded = { work: Work | null; images: WorkImage[]; why?: string }

/** Работа без имени ученика: условия, эталоны, ответы, фото. work null — проверять нечего. */
async function loadWork(gradeId: string): Promise<Loaded> {
  const { data: g } = await admin.from('hw_ai_grades')
    .select('progress_id, homework_id, kind, subject, exam').eq('id', gradeId).maybeSingle()
  if (!g) return { work: null, images: [], why: 'предоценки нет' }
  const [{ data: lp }, { data: hw }] = await Promise.all([
    admin.from('lesson_progress').select('comment, attachments, review_attachments').eq('id', g.progress_id).maybeSingle(),
    g.homework_id
      ? admin.from('homework').select('title, basic_tasks, hard_tasks').eq('id', g.homework_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const images: WorkImage[] = []
  let tasks: WorkTask[]

  if (g.kind === 'hard') {
    // Сложные задания: по каждому — последнее решение ученика (текст, фото,
    // доска). Задания, где учитель уже ответил на последнее решение, не берём.
    const blocks = (lp?.attachments as { tasks?: StudentBlock[] } | null)?.tasks
    if (!Array.isArray(blocks)) return { work: null, images, why: 'старый формат сложного задания' }
    const reviewed = new Map(((lp?.review_attachments as { tasks?: ReviewBlock[] } | null)?.tasks ?? [])
      .map(b => [b.key, (b.comments ?? []).reduce((m, c) => (c.at && c.at > m ? c.at : m), '')]))
    const defs = new Map((Array.isArray(hw?.hard_tasks) ? hw!.hard_tasks as Record<string, unknown>[] : [])
      .map(d => [String(d.key), d]))
    tasks = []
    blocks.forEach((b, i) => {
      const sols = b.solutions?.length ? b.solutions : [{ answer: b.answer, photos: b.photos, board: b.board }]
      const last = sols[sols.length - 1]
      if (last.at && (reviewed.get(b.key) ?? '') > last.at) return
      const n = i + 1
      const pics = [
        ...(last.photos ?? []).map((p, k) => image(p, `t${n}-photo${k + 1}`)),
        image(last.board, `t${n}-board`),
      ].filter((x): x is WorkImage => !!x)
      images.push(...pics)
      if (!String(last.answer ?? '').trim() && !pics.length) return
      const def = defs.get(b.key)
      tasks.push({
        n, key: b.key, type: 'развёрнутый ответ',
        statement: (plain(b.statement) || plain(def?.statement) || '(условие не сохранилось)').slice(0, STATEMENT_CAP),
        reference: plain(def?.answer) || undefined,
        answer: String(last.answer ?? '').slice(0, ANSWER_CAP),
        machine: 'review',
        ...(pics.length ? { images: pics.map(p => p.name) } : {}),
      })
    })
  } else {
    const att = lp?.attachments as { v?: string; rows?: Row[] } | null
    const rows = att?.v === 'basic-1' && Array.isArray(att.rows) ? att.rows : []
    const defs = Array.isArray(hw?.basic_tasks) ? hw!.basic_tasks as Record<string, unknown>[] : []
    // Снимок ответа хранит условие обрезанным до 220 знаков; полное — в basic_tasks,
    // если домашка сохранена целиком (0107) и порядок заданий тот же.
    const full = defs.length === rows.length
    tasks = rows
      .filter(r => !SKIP_TYPES.has(r.type))
      .map(r => {
        const def = full ? defs[r.n - 1] : undefined
        const choices = Array.isArray(def?.choices) ? (def!.choices as unknown[]).map(plain) : undefined
        // Доска в базовом уровне — ответ картинкой.
        const pic = image(r.answer, `t${r.n}-board`)
        if (pic) images.push(pic)
        const answer = pic ? '(ответ на доске — см. картинку)'
          : r.voice
            ? (r.heard ? `(устный ответ; расшифровка распознавалкой: ${r.heard})` : '(устный ответ, расшифровки нет)')
            : r.answer
        return {
          n: r.n,
          type: r.type,
          statement: ((def ? plain(def.question) : '') || r.prompt).slice(0, STATEMENT_CAP),
          ...(choices?.length ? { options: choices } : {}),
          reference: r.correct || (def ? plain(def.answer) : '') || undefined,
          answer: String(answer ?? '').slice(0, ANSWER_CAP),
          machine: r.verdict,
          ...(pic ? { images: [pic.name] } : {}),
        }
      })
  }

  const note = plain(lp?.comment).slice(0, ANSWER_CAP)
  if (!tasks.length) return { work: null, images: [], why: 'в сдаче нет ответов для проверки' }
  return {
    work: {
      kind: g.kind, subject: g.subject, exam: g.exam,
      title: hw?.title ?? (g.kind === 'hard' ? 'сложные задания' : 'домашка'), tasks, note,
    },
    images,
  }
}

async function flagsOn(): Promise<boolean> {
  const { data } = await admin.from('app_flags').select('key, enabled').in('key', FLAGS)
  return FLAGS.every(k => data?.some(f => f.key === k && f.enabled))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const secret = Deno.env.get('HW_GRADE_SECRET')
  if (!secret || req.headers.get('x-hw-grade-secret') !== secret) return json({ error: 'forbidden' }, 403)

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const id = typeof body.id === 'string' && /^[0-9a-f-]{36}$/i.test(body.id) ? body.id : ''

  if (body.action === 'queue') {
    if (!(await flagsOn())) return json({ tasks: [], system: SYSTEM, schema: SCHEMA, off: true })
    // Взятые и брошенные — обратно в очередь.
    await admin.from('hw_ai_grades').update({ status: 'pending', claimed_at: null, updated_at: new Date().toISOString() })
      .eq('status', 'working').lt('claimed_at', new Date(Date.now() - CLAIM_TTL_MIN * 60_000).toISOString())
    const { data: pending } = await admin.from('hw_ai_grades')
      .select('id').eq('status', 'pending').order('submitted_at').limit(BATCH)
    const tasks: { id: string; prompt: string }[] = []
    for (const p of pending ?? []) {
      const { work, why } = await loadWork(p.id)
      // Проверять нечего (старая сдача без снимка ответов) — не ошибка ИИ:
      // карточки на экране проверки не будет, учитель проверяет как обычно.
      if (!work) {
        await admin.from('hw_ai_grades').update({ status: 'skipped', error: why, updated_at: new Date().toISOString() })
          .eq('id', p.id).eq('status', 'pending')
        continue
      }
      tasks.push({ id: p.id, prompt: buildPrompt(work, 'files') })
    }
    return json({ tasks, system: SYSTEM, schema: SCHEMA })
  }

  if (!id) return json({ error: 'id required' }, 400)

  if (body.action === 'claim') {
    const { data } = await admin.from('hw_ai_grades')
      .update({ status: 'working', claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).eq('status', 'pending').select('id')
    if (!data?.length) return json({ error: 'уже взяли или не ждёт' }, 409)
    const { images } = await loadWork(id)
    return json({ ok: true, images })
  }

  if (body.action === 'result') {
    const { data: row } = await admin.from('hw_ai_grades').select('status').eq('id', id).maybeSingle()
    // Учитель успел проверить сам или работу пересдали — ответ больше не нужен.
    if (row?.status !== 'working') return json({ error: 'предоценка не ждёт итога' }, 409)
    const now = new Date().toISOString()
    if (body.error) {
      await admin.from('hw_ai_grades').update({ status: 'error', error: String(body.error).slice(0, 300), updated_at: now })
        .eq('id', id).eq('status', 'working')
      return json({ ok: true })
    }
    const { work, why } = await loadWork(id)
    if (!work) return json({ error: why }, 409)
    let graded
    try {
      graded = score(body.result, work)
    } catch (e) {
      await admin.from('hw_ai_grades').update({ status: 'error', error: `ответ не по схеме: ${(e as Error).message}`, updated_at: now })
        .eq('id', id).eq('status', 'working')
      return json({ error: 'ответ не по схеме' }, 422)
    }
    const { error } = await admin.from('hw_ai_grades').update({
      status: 'graded',
      result: { tasks: graded.tasks, teacher_note: graded.teacher_note },
      primary_score: graded.primary,
      max_score: graded.max,
      score: graded.score,
      comment: graded.comment,
      model: typeof body.model === 'string' ? body.model.slice(0, 80) : null,
      graded_at: now,
      error: null,
      updated_at: now,
    }).eq('id', id).eq('status', 'working')
    if (error) return json({ error: error.message }, 500)
    return json({ primary: graded.primary, max: graded.max, score: graded.score })
  }

  return json({ error: 'unknown action' }, 400)
})
