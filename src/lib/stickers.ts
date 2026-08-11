// Стикеры-оценки: коллекционный голо-стикер за то, что оценено баллом 1–5.
//
// ДВА ИСТОЧНИКА, ОДНА КОЛЛЕКЦИЯ.
//   task — принятое учителем сложное задание. Своей таблицы нет: стикеры
//          ВЫВОДИМ из данных проверки (lesson_progress.review_attachments →
//          раунды с verdict='completed' и score), поэтому история стикеров
//          всегда совпадает с журналом проверки.
//   deck — стопка фраз, закрытая без единого «не знаю». Такого следа в базе
//          нет (прогон живёт в review_cards как расписание), поэтому под него
//          заведена deck_stickers — см. миграцию 0055.
// Локально храним только «просмотрено», чтобы показывать «новый».
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'
import { isNewHard, teacherComments, type HardTaskReviewBlock } from './useHomework'
import { assignEmblems, type StickerEmblem } from './holo/presets'

/** За что выдан стикер. От этого зависит только подпись — тир общий. */
export type StickerKind = 'task' | 'deck'

export interface EarnedSticker {
  /** Стабильный id: строка прогресса + ключ задания (task) либо `deck:<uuid>` */
  id: string
  kind: StickerKind
  score: number
  /** Порядковый номер задания в ДЗ (1-based). У стопки — 0. */
  taskIndex: number
  /** Урок (task) либо ключ стопки (deck) */
  lessonRef: string
  /** Название урока (task) либо темы (deck) */
  lessonTitle: string
  /** Когда учитель принял задание / когда закрыта стопка */
  at: string
  comment: string
  /** deck: сколько фраз было в стопке — из этого посчитан балл */
  cards?: number
}

/** Подпись на самом стикере: «задание 2» / «стопка». */
export function stickerLabel(s: EarnedSticker, t: (v: string) => string): string {
  return s.kind === 'deck' ? t('стопка') : `${t('задание')} ${s.taskIndex}`
}

/** Строка под стикером в коллекции: откуда он пришёл. */
export function stickerCaption(s: EarnedSticker, t: (v: string) => string): string {
  return s.kind === 'deck'
    ? `${s.lessonTitle} · ${s.cards ?? 0} ${t('фраз без ошибок')}`
    : `${s.lessonTitle} · ${t('задание')} ${s.taskIndex}`
}

/**
 * Вытаскивает принятые задания с баллом из одной строки lesson_progress.
 * Только формат v2 (раунды): у легаси-хардов балла 1–5 нет в принципе.
 */
function stickersFromRow(row: {
  id: string
  lesson_ref: string
  review_attachments: unknown
  updated_at: string | null
}): EarnedSticker[] {
  if (!isNewHard(row.review_attachments)) return []
  const blocks: HardTaskReviewBlock[] = (row.review_attachments as { tasks: HardTaskReviewBlock[] }).tasks ?? []
  const out: EarnedSticker[] = []
  blocks.forEach((rb, i) => {
    const accepted = teacherComments(rb).filter(c => c.verdict === 'completed' && typeof c.score === 'number')
    const last = accepted[accepted.length - 1]
    if (!last) return
    out.push({
      id: `${row.id}:${rb.key || i}`,
      kind: 'task',
      score: last.score as number,
      taskIndex: i + 1,
      lessonRef: row.lesson_ref.endsWith('-hard') ? row.lesson_ref.slice(0, -5) : row.lesson_ref,
      lessonTitle: '',
      at: last.at || row.updated_at || '',
      comment: last.comment ?? '',
    })
  })
  return out
}

/** Стикеры за задания: строки проверки + подписи уроков. */
async function fetchTaskStickers(studentId: string): Promise<EarnedSticker[]> {
  const { data: rows } = await supabase
    .from('lesson_progress')
    .select('id, lesson_ref, review_attachments, updated_at')
    .eq('student_id', studentId)
    .not('review_attachments', 'is', null)
    .order('updated_at', { ascending: false })
  if (!rows?.length) return []

  const list = rows.flatMap(stickersFromRow)
  if (!list.length) return []

  // подписи уроков одним запросом
  const refs = [...new Set(list.map(s => s.lessonRef))]
  const { data: lessons } = await supabase.from('lessons').select('short_id, title').in('short_id', refs)
  const titles: Record<string, string> = Object.fromEntries((lessons ?? []).map(l => [l.short_id, l.title]))
  return list.map(s => ({ ...s, lessonTitle: titles[s.lessonRef] ?? s.lessonRef }))
}

/** Стикеры за стопки — своя таблица, подписи уже в строке. */
async function fetchDeckStickers(studentId: string): Promise<EarnedSticker[]> {
  const { data, error } = await supabase
    .from('deck_stickers')
    .select('id, deck_key, deck_title, score, cards, earned_at')
    .eq('student_id', studentId)
    .order('earned_at', { ascending: false })
  if (error) { console.error('deck stickers:', error); return [] }
  return (data ?? []).map(r => ({
    id: `deck:${r.id}`,
    kind: 'deck' as const,
    score: r.score,
    taskIndex: 0,
    lessonRef: r.deck_key,
    lessonTitle: r.deck_title || r.deck_key,
    at: r.earned_at ?? '',
    comment: '',
    cards: r.cards ?? 0,
  }))
}

/**
 * Все стикеры ученика, свежие сверху.
 *
 * Оба источника тянем параллельно и падение одного не роняет другой: у
 * коллекции нет причин пропадать целиком из-за того, что стопки не ответили.
 */
export async function fetchStudentStickers(studentId: string): Promise<EarnedSticker[]> {
  const [tasks, decks] = await Promise.all([
    fetchTaskStickers(studentId).catch(e => { console.error('task stickers:', e); return [] as EarnedSticker[] }),
    fetchDeckStickers(studentId).catch(e => { console.error('deck stickers:', e); return [] as EarnedSticker[] }),
  ])
  return [...tasks, ...decks].sort((a, b) => (a.at < b.at ? 1 : -1))
}

// ── Стикер за стопку ─────────────────────────────────────────────────────────

/**
 * Балл за чистый прогон считается по РАЗМЕРУ стопки, а не по проценту: процент
 * тут всегда 100 (иначе стикера нет вовсе), и единственное, чем один чистый
 * прогон отличается от другого, — сколько фраз удержано подряд.
 *
 * Порог в 5 фраз отсекает темы-огрызки: закрыть три карточки без промаха — не
 * достижение, а стикер такого же тира, как за сорок, обесценил бы коллекцию.
 */
const DECK_TIERS: [cards: number, score: number][] = [[26, 5], [18, 4], [12, 3], [8, 2], [5, 1]]

export function deckStickerScore(cards: number): number {
  return DECK_TIERS.find(([min]) => cards >= min)?.[1] ?? 0
}

/**
 * Выдать стикер за стопку. Возвращает стикер, если он выдан ИМЕННО СЕЙЧАС, и
 * null, если стопка мелкая или тема уже награждена.
 *
 * Повтор ловим не проверкой «есть ли уже», а уникальным индексом: между
 * SELECT и INSERT помещается вторая вкладка, и 23505 здесь — штатный ответ,
 * а не ошибка.
 */
export async function awardDeckSticker(input: {
  studentId: string
  deckKey: string
  title: string
  subject?: string
  cards: number
}): Promise<EarnedSticker | null> {
  const score = deckStickerScore(input.cards)
  if (!score || !input.studentId) return null

  const { data, error } = await supabase
    .from('deck_stickers')
    .insert({
      student_id: input.studentId,
      deck_key: input.deckKey,
      deck_title: input.title,
      subject: input.subject ?? null,
      score,
      cards: input.cards,
    })
    .select('id, earned_at')
    .maybeSingle()

  if (error) {
    if (error.code !== '23505') console.error('award deck sticker:', error)
    return null
  }
  if (!data) return null

  return {
    id: `deck:${data.id}`,
    kind: 'deck',
    score,
    taskIndex: 0,
    lessonRef: input.deckKey,
    lessonTitle: input.title,
    at: data.earned_at ?? new Date().toISOString(),
    comment: '',
    cards: input.cards,
  }
}

// ── «Новые» стикеры ──────────────────────────────────────────────────────────
const seenKey = (studentId: string) => `stickers_seen:${studentId}`

/** Есть ли вообще запись о просмотрах — отличает первый заход от «всё новое». */
export function hasSeenRecord(studentId: string): boolean {
  try { return localStorage.getItem(seenKey(studentId)) !== null } catch { return true }
}

export function getSeen(studentId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(studentId))
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
  } catch { return new Set() }
}

export function markSeen(studentId: string, ids: string[]) {
  const seen = getSeen(studentId)
  ids.forEach(id => seen.add(id))
  try { localStorage.setItem(seenKey(studentId), JSON.stringify([...seen])) } catch { /* приватный режим */ }
}

export interface StickerCollection {
  stickers: EarnedSticker[]
  /** Полученные, но ещё не показанные ученику */
  fresh: EarnedSticker[]
  byScore: Record<number, number>
  /** Эмблема каждого стикера, раздана по ВСЕЙ коллекции — id → эмблема */
  emblems: Record<string, StickerEmblem>
  loading: boolean
  reload: () => void
  /** Пометить стикеры показанными (после reveal-модалки) */
  dismissFresh: () => void
}

export function useStickers(): StickerCollection {
  const session = getStudentSession()
  const studentId = session?.id ?? ''
  const [stickers, setStickers] = useState<EarnedSticker[]>([])
  const [fresh, setFresh] = useState<EarnedSticker[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!studentId) { setLoading(false); return }
    setLoading(true)
    try {
      const list = await fetchStudentStickers(studentId)
      setStickers(list)
      // Первый заход: вся история уже «просмотрена», иначе ученику прилетит
      // пачка модалок за всё прошлое. Показываем только то, что пришло потом.
      const firstRun = !hasSeenRecord(studentId)
      if (firstRun) {
        markSeen(studentId, list.map(s => s.id))
        setFresh([])
        return
      }
      const seen = getSeen(studentId)
      setFresh(list.filter(s => !seen.has(s.id)).slice(0, 5))
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => { void load() }, [load])

  const byScore = stickers.reduce<Record<number, number>>((acc, s) => {
    acc[s.score] = (acc[s.score] ?? 0) + 1
    return acc
  }, {})

  // Раздаём по всей коллекции, а не по подмножеству экрана: reveal-модалка
  // показывает только новые стикеры, и своя раздача дала бы там другую эмблему,
  // чем в коллекции.
  const emblems = assignEmblems(stickers.map(s => s.id))

  return {
    stickers, fresh, byScore, emblems, loading,
    reload: () => void load(),
    dismissFresh: () => {
      if (studentId) markSeen(studentId, fresh.map(s => s.id))
      setFresh([])
    },
  }
}
