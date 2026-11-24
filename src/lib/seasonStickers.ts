import { useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { isNewYearLive, newYearImg } from './season'
import { getStudentSession } from './studentSession'

/*
 * Новогодняя коллекция стикеров (сезон new-year). Макеты — Figma «Искра»,
 * стр. 19, секции D (приветствие), E (альбом), F (видеоурок), G/H (подарок учителя).
 *
 * Строка в season_stickers = полученный стикер (миграция 20261124130000).
 * Обычные стикеры выдаются по порядку COMMON за действия ученика (сдал ДЗ,
 * досмотрел видео до 90%) — один стикер за одно действие, повторно за то же
 * действие не выдаётся (уникальность source + source_ref в базе). Редкие —
 * Огоньки: серия 7 и 14 дней, все ДЗ декабря и секретный. Учитель может подарить
 * любой обычный, которого у ученика ещё нет.
 *
 * Стикеры копятся, пока идёт сезон, даже если ученик выбрал «Без темы».
 */

export const STICKER_SEASON = 'new-year'

export type StickerKey =
  | 'atom' | 'dna' | 'flask' | 'tangerine' | 'penguin' | 'sparkler'
  | 'clock' | 'tree' | 'rocket' | 'cocoa' | 'deer' | 'bell'
  | 'og_santa' | 'og_astro' | 'og_scarf' | 'og_tree'

export type StickerDef = { key: StickerKey; title: string; rare: boolean; hint: string }

export const STICKERS: StickerDef[] = [
  { key: 'atom', title: 'Снежинка-атом', rare: false, hint: 'Сдай домашку' },
  { key: 'dna', title: 'Шар с ДНК', rare: false, hint: 'Досмотри видеоурок' },
  { key: 'flask', title: 'Пряник-колба', rare: false, hint: 'Сдай домашку' },
  { key: 'tangerine', title: 'Мандарин', rare: false, hint: 'Досмотри видеоурок' },
  { key: 'penguin', title: 'Пингвин-отличник', rare: false, hint: 'Сдай домашку' },
  { key: 'sparkler', title: 'Бенгальский огонь', rare: false, hint: 'Досмотри видеоурок' },
  { key: 'clock', title: 'Полночь', rare: false, hint: 'Сдай домашку' },
  { key: 'tree', title: 'Ёлка-молекула', rare: false, hint: 'Досмотри видеоурок' },
  { key: 'rocket', title: 'Ракета', rare: false, hint: 'Сдай домашку' },
  { key: 'cocoa', title: 'Какао', rare: false, hint: 'Досмотри видеоурок' },
  { key: 'deer', title: 'Олень в очках', rare: false, hint: 'Сдай домашку' },
  { key: 'bell', title: 'Колокольчик', rare: false, hint: 'Досмотри видеоурок' },
  { key: 'og_santa', title: 'Огонёк-Дед Мороз', rare: true, hint: '7 дней подряд' },
  { key: 'og_astro', title: 'Огонёк-космонавт', rare: true, hint: '14 дней подряд' },
  { key: 'og_scarf', title: 'Огонёк в шарфе', rare: true, hint: 'Все домашки декабря' },
  { key: 'og_tree', title: 'Огонёк-звезда', rare: true, hint: 'Секрет' },
]
export const COMMON: StickerKey[] = STICKERS.filter(s => !s.rare).map(s => s.key)
export const stickerDef = (k: string): StickerDef | undefined => STICKERS.find(s => s.key === k)
export const stickerImg = (k: StickerKey | string) =>
  k.startsWith('og_') ? newYearImg(`og-${k.slice(3)}`) : newYearImg(`s-${k}`)

/** Ачивки, которые учитель ставит к подарку. */
export const ACHIEVEMENTS = [
  { key: 'perfect', title: 'Без ошибок', glyph: '100', color: '#F5B93D' },
  { key: 'best', title: 'Лучшее решение', glyph: '★', color: '#7FE7FF' },
  { key: 'leap', title: 'Рывок недели', glyph: '↑', color: '#B6FF3B' },
] as const
export type AchievementKey = typeof ACHIEVEMENTS[number]['key']

export type StickerSource = 'hw' | 'video' | 'streak' | 'teacher' | 'secret'
export type OwnedSticker = {
  id: string
  studentId: string
  stickerKey: StickerKey
  source: StickerSource
  sourceRef: string
  achievement: AchievementKey | null
  givenBy: string | null
  note: string | null
  seenAt: string | null
  createdAt: string
}

type Row = {
  id: string; student_id: string; sticker_key: StickerKey; source: StickerSource; source_ref: string
  achievement: AchievementKey | null; given_by: string | null; note: string | null; seen_at: string | null; created_at: string
}
const fromRow = (r: Row): OwnedSticker => ({
  id: r.id, studentId: r.student_id, stickerKey: r.sticker_key, source: r.source, sourceRef: r.source_ref,
  achievement: r.achievement, givenBy: r.given_by, note: r.note, seenAt: r.seen_at, createdAt: r.created_at,
})
const COLS = 'id, student_id, sticker_key, source, source_ref, achievement, given_by, note, seen_at, created_at'

// ── хранилище: по ученику, одно на вкладку ──────────────────────────────────

type Entry = { owned: OwnedSticker[]; loaded: boolean; error: string | null }
const cache = new Map<string, Entry>()
const subs = new Set<() => void>()
const emit = () => subs.forEach(f => f())
const EMPTY: Entry = { owned: [], loaded: false, error: null }
const inflight = new Map<string, Promise<void>>()

/** Ученик, вошедший в кабинет. Коллекция — на человека: у него может быть несколько
 *  строк students (по предметам), а учитель дарит на строку той работы, которую проверял. */
const sessionStudentId = (): string | null => { try { return getStudentSession()?.id ?? null } catch { return null } }

export async function loadStickers(studentId: string): Promise<OwnedSticker[]> {
  let q = supabase.from('season_stickers').select(COLS).eq('season_key', STICKER_SEASON)
  // Свой кабинет: RLS отдаёт строки всех своих зачислений — фильтр по одной строке их бы потерял.
  if (studentId !== sessionStudentId()) q = q.eq('student_id', studentId)
  const { data, error } = await q.order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  const seen = new Set<string>()
  return ((data ?? []) as Row[]).map(fromRow).filter(o => (seen.has(o.stickerKey) ? false : (seen.add(o.stickerKey), true)))
}

export function refreshStickers(studentId: string): Promise<void> {
  const running = inflight.get(studentId)
  if (running) return running
  const p = loadStickers(studentId)
    .then(owned => { cache.set(studentId, { owned, loaded: true, error: null }) })
    .catch(e => { const prev = cache.get(studentId) ?? EMPTY; cache.set(studentId, { ...prev, loaded: true, error: String(e?.message ?? e) }) })
    .finally(() => { inflight.delete(studentId); emit() })
  inflight.set(studentId, p)
  return p
}

function put(studentId: string, s: OwnedSticker) {
  const prev = cache.get(studentId) ?? { ...EMPTY, loaded: true }
  if (prev.owned.some(o => o.id === s.id || o.stickerKey === s.stickerKey)) return
  cache.set(studentId, { ...prev, owned: [...prev.owned, s] })
  emit()
}

/** Коллекция ученика. null — нет ученика (учитель, гость). */
export function useStickers(studentId: string | null | undefined): Entry & { reload: () => void } {
  const entry = useSyncExternalStore(
    f => { subs.add(f); return () => { subs.delete(f) } },
    () => (studentId ? cache.get(studentId) ?? EMPTY : EMPTY),
    () => EMPTY,
  )
  if (studentId && !cache.has(studentId) && !inflight.has(studentId)) void refreshStickers(studentId)
  return { ...entry, reload: () => { if (studentId) void refreshStickers(studentId) } }
}

// ── события: «получен стикер» — для всплывашки и окна подарка ──────────────

type Listener = (s: OwnedSticker) => void
const listeners = new Set<Listener>()
export function onStickerEarned(f: Listener): () => void { listeners.add(f); return () => { listeners.delete(f) } }
const announce = (s: OwnedSticker) => listeners.forEach(f => { try { f(s) } catch { /* слушатель не ломает выдачу */ } })

/** Следующий обычный стикер, которого ещё нет. */
export function nextCommon(owned: OwnedSticker[]): StickerKey | null {
  const have = new Set(owned.map(o => o.stickerKey))
  return COMMON.find(k => !have.has(k)) ?? null
}

/**
 * Выдать стикер за действие ученика. Идемпотентно: повтор за то же действие
 * (source + ref) ничего не делает. Вне сезона — ничего. Ошибка сети не мешает
 * основному действию (сдаче ДЗ, просмотру) — просто стикера не будет.
 */
export async function earnSticker(studentId: string | null | undefined, source: 'hw' | 'video' | 'streak' | 'secret', ref: string, key?: StickerKey): Promise<OwnedSticker | null> {
  // Выдаём на строку вошедшего ученика: её же читает альбом и главная.
  studentId = sessionStudentId() ?? studentId
  if (!studentId || !ref || !isNewYearLive()) return null
  try {
    if (!cache.get(studentId)?.loaded) await refreshStickers(studentId)
    const owned = cache.get(studentId)?.owned ?? []
    if (owned.some(o => o.source === source && o.sourceRef === ref)) return null
    const stickerKey = key ?? nextCommon(owned)
    if (!stickerKey || owned.some(o => o.stickerKey === stickerKey)) return null
    const { data, error } = await supabase.from('season_stickers')
      .insert({ student_id: studentId, season_key: STICKER_SEASON, sticker_key: stickerKey, source, source_ref: ref })
      .select(COLS).single()
    if (error) {
      // 23505 — уже выдан (другая вкладка, повтор): подтягиваем актуальное.
      if (error.code === '23505') void refreshStickers(studentId)
      return null
    }
    const s = fromRow(data as Row)
    put(studentId, s)
    announce(s)
    return s
  } catch {
    return null
  }
}

/** Учитель дарит стикер при проверке ДЗ. Возвращает текст ошибки или null. */
export async function giftSticker(args: {
  studentId: string; stickerKey: StickerKey; lessonRef: string; achievement?: AchievementKey | null; note?: string
}): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return 'Нет входа'
  const { error } = await supabase.from('season_stickers').insert({
    student_id: args.studentId, season_key: STICKER_SEASON, sticker_key: args.stickerKey, source: 'teacher',
    source_ref: `gift:${args.lessonRef}`, achievement: args.achievement ?? null, given_by: uid,
    note: args.note?.trim().slice(0, 200) || null,
  })
  if (error) {
    if (error.code !== '23505') return error.message
    return /source/.test(error.message) ? 'За эту работу подарок уже отправлен' : 'Этот стикер уже есть у ученика'
  }
  void refreshStickers(args.studentId)
  return null
}

/** Отметить стикеры просмотренными (метка «Новый!» и окно подарка уходят). */
export async function markStickersSeen(studentId: string, ids: string[]): Promise<void> {
  if (!ids.length) return
  const now = new Date().toISOString()
  const prev = cache.get(studentId)
  if (prev) { cache.set(studentId, { ...prev, owned: prev.owned.map(o => ids.includes(o.id) ? { ...o, seenAt: now } : o) }); emit() }
  await supabase.from('season_stickers').update({ seen_at: now }).in('id', ids).eq('student_id', studentId)
}

/** Подарки учителя, которые ученик ещё не открыл. */
export const unseenGifts = (owned: OwnedSticker[]) => owned.filter(o => o.source === 'teacher' && !o.seenAt)

// ── «Поставить на главную»: один стикер рядом с Огоньком на треке (браузер) ──

const PIN_KEY = 'stickers.pinned'
const pinSubs = new Set<() => void>()
const readPin = (): StickerKey | null => { try { return (localStorage.getItem(PIN_KEY) as StickerKey) || null } catch { return null } }
let pinned = typeof window === 'undefined' ? null : readPin()
export function setPinnedSticker(k: StickerKey | null) {
  pinned = k
  try { if (k) localStorage.setItem(PIN_KEY, k); else localStorage.removeItem(PIN_KEY) } catch { /* без хранилища — до перезагрузки */ }
  pinSubs.forEach(f => f())
}
export function usePinnedSticker(): StickerKey | null {
  return useSyncExternalStore(f => { pinSubs.add(f); return () => { pinSubs.delete(f) } }, () => pinned, () => null)
}

// ── окно альбома: открывается из виджета сезона, профиля, всплывашки ───────

let albumOpen: { open: boolean; focus: StickerKey | null } = { open: false, focus: null }
const albumSubs = new Set<() => void>()
export function openStickerAlbum(focus: StickerKey | null = null) { albumOpen = { open: true, focus }; albumSubs.forEach(f => f()) }
export function closeStickerAlbum() { albumOpen = { open: false, focus: null }; albumSubs.forEach(f => f()) }
export function useStickerAlbum() {
  return useSyncExternalStore(f => { albumSubs.add(f); return () => { albumSubs.delete(f) } }, () => albumOpen, () => albumOpen)
}

// ── только разработка: выдать стикер без базы, чтобы увидеть всплывашку и подарок ──

/** DEV: положить стикер в коллекцию вкладки (в базу не пишет). Обычный — со
 *  всплывашкой «Новый стикер!», 'teacher' — как непросмотренный подарок учителя. */
export function devFakeSticker(studentId: string, stickerKey: StickerKey, source: StickerSource = 'hw', gift?: { achievement?: AchievementKey; note?: string }) {
  if (!import.meta.env.DEV) return
  const s: OwnedSticker = {
    id: `dev-${stickerKey}-${Date.now()}`, studentId, stickerKey, source, sourceRef: `dev:${Date.now()}`,
    achievement: gift?.achievement ?? null, givenBy: source === 'teacher' ? 'dev' : null, note: gift?.note ?? null,
    seenAt: null, createdAt: new Date().toISOString(),
  }
  put(studentId, s)
  if (source !== 'teacher') announce(s)
}
