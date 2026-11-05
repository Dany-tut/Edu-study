import { supabase } from './supabase'
import { getSubject } from './subjects'

/**
 * Словарь расшифровки (таблица transcript_terms). Учитель правит реплику —
 * изменённый кусок уходит парой «как распозналось → как правильно»; модуль на
 * Mac получает словарь предмета с каждым заданием: термины подсказывают Whisper,
 * пары исправляют известные ошибки. Подробно — в миграции 20261105150000.
 */

export interface TranscriptTerm { written: string; heard: string | null; spoken: string | null; mine: boolean }
export interface TermPair { heard: string; written: string }

/** Ключ предмета словаря: id из реестра («Химия» → chemistry), иначе само название. */
export function termsSubject(courseSubject: string | null | undefined): string {
  const name = (courseSubject ?? '').trim()
  return getSubject(name)?.id ?? name
}

/** Пакет словаря для модуля. Нет таблицы, сети или входа — пустой: распознаём как раньше. */
export async function fetchTermsPack(subject: string): Promise<TranscriptTerm[]> {
  if (!subject) return []
  try {
    const { data, error } = await supabase.rpc('transcript_terms_pack', { p_subject: subject })
    return error || !Array.isArray(data) ? [] : data as TranscriptTerm[]
  } catch { return [] }
}

/** Сколько терминов Whisper успевает «прочитать» перед каждым куском (~224 токена). */
const PROMPT_CHARS = 520

/** То, что уходит модулю полем `terms`: подсказка и пары замен. */
export function termsForModule(pack: readonly TranscriptTerm[], lessonTitle?: string) {
  const prompt: string[] = []
  let size = 0
  const add = (term: string) => {
    const clean = term.replace(/\*$/, '').trim()
    if (!clean || prompt.includes(clean) || size + clean.length + 2 > PROMPT_CHARS) return
    prompt.push(clean); size += clean.length + 2
  }
  if (lessonTitle) add(lessonTitle)
  // Свои пары учителя — первыми: он их только что поправил.
  for (const t of [...pack].sort((a, b) => Number(b.mine) - Number(a.mine))) if (!t.written.endsWith('*')) add(t.written)
  const replace = pack.filter(t => t.heard).map(t => [t.heard!, t.written] as [string, string]).slice(0, 400)
  return { prompt, replace }
}

const WORD = /[\p{L}\p{N}₀-₉⁰-⁹⁺⁻]+(?:[-‐][\p{L}\p{N}₀-₉⁰-⁹⁺⁻]+)*/gu
const words = (text: string) => text.match(WORD) ?? []
const norm = (w: string) => w.toLocaleLowerCase('ru').replace(/ё/g, 'е')

/**
 * Пары из одной правки реплики: общее начало и конец отбрасываем, середина —
 * «как было → как стало». Берём только короткие точечные правки (до 5 слов):
 * переписанная целиком реплика — не ошибка термина, а другой текст.
 */
export function termEditPairs(before: string, after: string): TermPair[] {
  const a = words(before), b = words(after)
  let head = 0
  while (head < a.length && head < b.length && norm(a[head]) === norm(b[head])) head++
  let tail = 0
  while (tail < a.length - head && tail < b.length - head && norm(a[a.length - 1 - tail]) === norm(b[b.length - 1 - tail])) tail++
  const heard = a.slice(head, a.length - tail), written = b.slice(head, b.length - tail)
  if (!heard.length || !written.length || heard.length > 5 || written.length > 5) return []
  const pair = { heard: heard.join(' '), written: written.join(' ') }
  if (norm(pair.heard) === norm(pair.written) || pair.heard.length > 80 || pair.written.length > 80) return []
  // Правка числа на число или одной буквы — опечатка, а не термин.
  if (/^\d+$/.test(pair.heard) && /^\d+$/.test(pair.written)) return []
  if (pair.heard.length < 2 && pair.written.length < 2) return []
  return [pair]
}

/** Отправить пары в словарь. Без таблицы или прав — молча: правка в уроке важнее. */
export async function suggestTerms(subject: string, pairs: TermPair[]): Promise<void> {
  if (!subject || !pairs.length) return
  try { await supabase.rpc('suggest_transcript_terms', { p_subject: subject, p_pairs: pairs }) } catch { /* словарь — не повод мешать правке */ }
}

/** Для админки: весь словарь с голосами. */
export interface AdminTerm {
  id: string; subject: string; written: string; heard: string | null; spoken: string | null
  status: 'pending' | 'approved' | 'rejected'; source: 'seed' | 'teacher' | 'admin'; hits: number; created_at: string; voters?: number
}
