// Стикеры-оценки: каждое принятое сложное задание с баллом 1–5 превращается
// в коллекционный голо-стикер.
//
// Отдельной таблицы нет — стикеры ВЫВОДИМ из уже существующих данных проверки
// (lesson_progress.review_attachments → раунды с verdict='completed' и score),
// поэтому миграция не нужна и история стикеров всегда совпадает с журналом
// проверки. Локально храним только «просмотрено», чтобы показывать «новый».
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'
import { isNewHard, teacherComments, type HardTaskReviewBlock } from './useHomework'
import { assignEmblems, type StickerEmblem } from './holo/presets'

export interface EarnedSticker {
  /** Стабильный id: строка прогресса + ключ задания */
  id: string
  score: number
  /** Порядковый номер задания в ДЗ (1-based) */
  taskIndex: number
  lessonRef: string
  lessonTitle: string
  /** Когда учитель принял задание */
  at: string
  comment: string
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

/** Все стикеры ученика, свежие сверху. */
export async function fetchStudentStickers(studentId: string): Promise<EarnedSticker[]> {
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
  return list
    .map(s => ({ ...s, lessonTitle: titles[s.lessonRef] ?? s.lessonRef }))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
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
