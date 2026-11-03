import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.118.0'
import type { Work, WorkImage, WorkTask } from '../hw-grade/grader.ts'
import { loadHomeworkImage } from './homeworkImage.ts'

const SKIP_TYPES = new Set(['videoWatch', 'embed', 'testly'])
const ANSWER_CAP = 6000
const STATEMENT_CAP = 4000

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

type Loaded = { work: Work | null; images: WorkImage[]; why?: string }

/** Работа без имени ученика: условия, эталоны, ответы, фото. work null — проверять нечего. */
export async function loadWork(admin: SupabaseClient, gradeId: string): Promise<Loaded> {
  const { data: g } = await admin.from('hw_ai_grades')
    .select('progress_id, homework_id, kind, subject, exam').eq('id', gradeId).maybeSingle()
  if (!g) return { work: null, images: [], why: 'предоценки нет' }
  const [{ data: lp }, { data: hw }] = await Promise.all([
    admin.from('lesson_progress').select('student_id, comment, attachments, review_attachments').eq('id', g.progress_id).maybeSingle(),
    g.homework_id
      ? admin.from('homework').select('title, basic_tasks, hard_tasks').eq('id', g.homework_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const images: WorkImage[] = []
  const { data: student } = lp?.student_id
    ? await admin.from('students').select('auth_user_id').eq('id', lp.student_id).maybeSingle()
    : { data: null }
  const ownerPrefix = student?.auth_user_id ? `${student.auth_user_id}/${lp!.student_id}/` : null
  const image = (value: unknown, name: string) => loadHomeworkImage(value, name, {
    ownerPrefix,
    download: path => admin.storage.from('homework-photos').download(path),
  })
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
    for (const [i, b] of blocks.entries()) {
      const sols = b.solutions?.length ? b.solutions : [{ answer: b.answer, photos: b.photos, board: b.board }]
      const last = sols[sols.length - 1]
      if (last.at && (reviewed.get(b.key) ?? '') > last.at) continue
      const n = i + 1
      const refs = [...(last.photos ?? []), last.board].filter((p): p is string => !!p)
      const loaded = await Promise.all(refs.map((p, k) => image(p, `t${n}-image${k + 1}`)))
      // A missing stored photo is missing evidence. Never grade the remaining
      // text as if that photo had not been submitted.
      if (refs.some((p, k) => p.startsWith('hwp:') && !loaded[k])) {
        return { work: null, images: [], why: 'Фото решения недоступно — требуется проверка учителем' }
      }
      const pics = loaded.filter((x): x is WorkImage => !!x)
      images.push(...pics)
      if (!String(last.answer ?? '').trim() && !pics.length) continue
      const def = defs.get(b.key)
      tasks.push({
        n, key: b.key, type: 'развёрнутый ответ',
        statement: (plain(b.statement) || plain(def?.statement) || '(условие не сохранилось)').slice(0, STATEMENT_CAP),
        reference: plain(def?.answer) || undefined,
        answer: String(last.answer ?? '').slice(0, ANSWER_CAP),
        machine: 'review',
        ...(pics.length ? { images: pics.map(p => p.name) } : {}),
      })
    }
  } else {
    const att = lp?.attachments as { v?: string; rows?: Row[] } | null
    const rows = att?.v === 'basic-1' && Array.isArray(att.rows) ? att.rows : []
    const defs = Array.isArray(hw?.basic_tasks) ? hw!.basic_tasks as Record<string, unknown>[] : []
    // Снимок ответа хранит условие обрезанным до 220 знаков; полное — в basic_tasks,
    // если домашка сохранена целиком (0107) и порядок заданий тот же.
    const full = defs.length === rows.length
    tasks = await Promise.all(rows
      .filter(r => !SKIP_TYPES.has(r.type))
      .map(async r => {
        const def = full ? defs[r.n - 1] : undefined
        const choices = Array.isArray(def?.choices) ? (def!.choices as unknown[]).map(plain) : undefined
        // Доска в базовом уровне — ответ картинкой.
        const pic = await image(r.answer, `t${r.n}-board`)
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
      }))
    if (rows.some(r => r.answer?.startsWith('hwp:') && !images.some(p => p.name.startsWith(`t${r.n}-board.`)))) {
      return { work: null, images: [], why: 'Фото решения недоступно — требуется проверка учителем' }
    }
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
<<<<<<< HEAD
=======

>>>>>>> a1dc461d (Save all local Iskra interface, homework, security and QA updates)
