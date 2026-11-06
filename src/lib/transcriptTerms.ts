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

// Сравниваем без регистра, «ё» и индексов: в конспекте «KMnO4», в словаре «KMnO₄».
const SUB = '₀₁₂₃₄₅₆₇₈₉', SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const flat = (text: string) => text.toLocaleLowerCase('ru').replace(/ё/g, 'е')
  .replace(/[₀-₉]/g, c => String(SUB.indexOf(c))).replace(/[⁰-⁹]/g, c => String(SUP.indexOf(c))).replace(/[⁺⁻]/g, '')

/**
 * Сколько раз термин встречается в тексте урока. Окончания русских слов
 * меняются («митоз» → «митоза», «митозом»), поэтому русское слово ищем по основе —
 * без последних двух букв, но не короче 4; многословный термин засчитываем,
 * когда в тексте подряд стоят основы всех его слов.
 */
export function termMentions(term: string, text: string): number {
  const words = flat(term.replace(/\*$/, '')).match(/[\p{L}\p{N}]+/gu) ?? []
  if (!words.length || !text) return 0
  const stem = (w: string) => w.length <= 4 ? w : w.slice(0, Math.max(4, w.length - 2))
  const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Формулы и латиница («KMnO4», «pH») — только целиком: KMnO3 не KMnO4.
  const part = (w: string) => /[a-z0-9]/.test(w) ? `${escape(w)}(?![\\p{L}\\p{N}])` : `${escape(stem(w))}[\\p{L}\\p{N}]*`
  const pattern = words.map(part).join('[^\\p{L}\\p{N}]{1,3}')
  // Совпадение не должно продолжать слово слева. Проверяем символ перед ним
  // вручную: lookbehind (?<!…) — SyntaxError на iOS < 16.4.
  const source = flat(text)
  const re = new RegExp(pattern, 'gu')
  const wordChar = /[\p{L}\p{N}]/u
  let count = 0
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const before = Array.from(source.slice(Math.max(0, m.index - 2), m.index)).pop()
    if (before && wordChar.test(before)) { re.lastIndex = m.index + 1; continue }
    count++
    if (m[0] === '') re.lastIndex++
  }
  return count
}

/**
 * То, что уходит модулю полем `terms`: подсказка и пары замен. Подсказка
 * вмещает ~35 терминов, а в словаре предмета их сотни, поэтому порядок такой:
 * название урока → свои пары учителя → термины, которые есть в тексте урока
 * (название, описание, конспект, главы; чаще упомянутые — раньше) → остальные
 * по числу встреч в словаре.
 */
export function termsForModule(pack: readonly TranscriptTerm[], lessonTitle?: string, lessonText?: string) {
  const prompt: string[] = []
  const seen = new Set<string>()
  let size = 0
  const add = (term: string) => {
    const clean = term.replace(/\*$/, '').trim()
    if (!clean || seen.has(flat(clean)) || size + clean.length + 2 > PROMPT_CHARS) return
    prompt.push(clean); seen.add(flat(clean)); size += clean.length + 2
  }
  if (lessonTitle) add(lessonTitle)
  const context = [lessonTitle, lessonText].filter(Boolean).join('\n')
  const hints = pack.filter(t => !t.written.endsWith('*'))
  const mentions = new Map(hints.map(t => [t, context ? termMentions(t.written, context) : 0]))
  // sort устойчивый: при равенстве остаётся порядок словаря (по числу встреч).
  for (const t of [...hints].sort((a, b) => Number(b.mine) - Number(a.mine) || mentions.get(b)! - mentions.get(a)!)) add(t.written)
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
