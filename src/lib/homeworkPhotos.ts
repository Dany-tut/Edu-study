// Фото сдач ДЗ в хранилище (бакет homework-photos, миграция 0102).
//
// Раньше фото и доска ученика уходили base64-строкой в lesson_progress.attachments
// и ели квоту Postgres. Теперь при отправке решения они загружаются в приватный
// бакет, а в JSONB вместо data URL пишется ССЫЛКА `hwp:<путь>`. Тип поля не
// меняется (string), поэтому `HardSolution` и всё, что его читает, остаются как
// были; старые base64 продолжают показываться без изменений.
//
// Путь: <auth uid>/<students.id>/<мс загрузки>-<uuid>.<ext>. Метка времени в
// имени — чтобы без запроса понять, что фото уже удалено по сроку.
//
// СРОК — 7 дней (правило П3 ХимБио: фото — персональные данные). Удаляет
// Edge Function homework-photos-cleanup по cron раз в сутки. JSONB при этом не
// трогается: ссылка остаётся, интерфейс рисует заглушку «фото удалено через
// 7 дней, оценка сохранена».

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getSessionUser } from './owner'

const BUCKET = 'homework-photos'
export const HW_PHOTO_PREFIX = 'hwp:'
/** Сколько живёт фото. Совпадает с интервалом в homework_photos_expired(). */
export const HW_PHOTO_TTL_MS = 7 * 24 * 3600 * 1000
// Чистка идёт раз в сутки, поэтому файл может прожить до 8 суток. Позже этого
// срока даже не спрашиваем хранилище — сразу заглушка.
const SURELY_GONE_MS = HW_PHOTO_TTL_MS + 36 * 3600 * 1000

/** Ссылка на фото в хранилище (а не старый base64 / внешний адрес)? */
export function isStoredHomeworkPhoto(ref: string | null | undefined): ref is string {
  return !!ref && ref.startsWith(HW_PHOTO_PREFIX)
}

/** Путь объекта в бакете для `hwp:`-ссылки, иначе null. Нужен серверу (ИИ-оценка). */
export function homeworkPhotoPath(ref: string | null | undefined): string | null {
  return isStoredHomeworkPhoto(ref) ? ref.slice(HW_PHOTO_PREFIX.length) : null
}

/** Когда фото загружено (из имени файла); null для base64 и битых путей. */
export function homeworkPhotoUploadedAt(ref: string | null | undefined): number | null {
  const path = homeworkPhotoPath(ref)
  if (!path) return null
  const m = /\/(\d{12,})-[^/]+$/.exec(path)
  return m ? Number(m[1]) : null
}

/** Срок хранения истёк (фото удалено или вот-вот будет). base64 не истекает. */
export function isHomeworkPhotoExpired(ref: string | null | undefined, now = Date.now()): boolean {
  const at = homeworkPhotoUploadedAt(ref)
  return at != null && now - at > HW_PHOTO_TTL_MS
}

const EXT_BY_MIME: Record<string, string> = {
  'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png',
}

/**
 * Загрузить одно изображение (data URL после optimizePhoto/optimizeCanvas) и
 * вернуть `hwp:`-ссылку. Не-data-URL (уже ссылка) возвращается как есть.
 * Бросает ошибку, если загрузка не удалась.
 */
export async function uploadHomeworkPhoto(src: string, studentId: string): Promise<string> {
  if (!src.startsWith('data:')) return src
  // Папка = auth.uid() (так проверяет RLS), не getOwnerId: тот подменяется
  // при админском «просмотре кабинета».
  const uid = (await getSessionUser())?.id
  if (!uid) throw new Error('Not authenticated')
  const blob = await (await fetch(src)).blob()
  const mime = EXT_BY_MIME[blob.type] ? blob.type : 'image/webp'
  const path = `${uid}/${studentId}/${Date.now()}-${crypto.randomUUID()}.${EXT_BY_MIME[mime]}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false })
  if (error) throw error
  return HW_PHOTO_PREFIX + path
}

/**
 * Фото и доску решения — в хранилище. Если загрузка не удалась, оставляем
 * base64: потерять сдачу хуже, чем занять место в базе.
 */
export async function storeSolutionImages<T extends { photos: string[]; board: string | null }>(
  payload: T, studentId: string,
): Promise<T> {
  const up = async (src: string) => {
    try { return await uploadHomeworkPhoto(src, studentId) }
    catch (e) { console.warn('[homeworkPhotos] upload failed, keeping base64', e); return src }
  }
  const [photos, board] = await Promise.all([
    Promise.all(payload.photos.map(up)),
    payload.board ? up(payload.board) : Promise.resolve(null),
  ])
  return { ...payload, photos, board }
}

// ── Чтение ──────────────────────────────────────────────────────────────────
// Подписанные ссылки живут час; кешируем, чтобы перерисовки не ходили в сеть.
const SIGN_TTL_S = 3600
const signed = new Map<string, { url: string; until: number }>()
const inflight = new Map<string, Promise<string | null>>()

/**
 * Адрес, который можно подставить в <img src> / canvas: base64 — как есть,
 * `hwp:` — подписанная ссылка. null — файла нет (удалён по сроку) или нет доступа.
 */
export async function resolveHomeworkPhoto(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null
  const path = homeworkPhotoPath(ref)
  if (!path) return ref
  const at = homeworkPhotoUploadedAt(ref)
  if (at != null && Date.now() - at > SURELY_GONE_MS) return null
  const hit = signed.get(path)
  if (hit && hit.until > Date.now()) return hit.url
  let p = inflight.get(path)
  if (!p) {
    p = supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL_S).then(({ data, error }) => {
      inflight.delete(path)
      if (error || !data) return null
      signed.set(path, { url: data.signedUrl, until: Date.now() + (SIGN_TTL_S - 60) * 1000 })
      return data.signedUrl
    })
    inflight.set(path, p)
  }
  return p
}

export type HomeworkPhotoState =
  | { status: 'ready'; src: string }
  | { status: 'loading' }
  | { status: 'expired' }   // удалено по сроку — заглушка «оценка сохранена»
  | { status: 'missing' }   // не загрузилось по другой причине

/** Хук для рендера: base64 отдаётся сразу, `hwp:` — после подписи ссылки. */
export function useHomeworkPhoto(ref: string | null | undefined): HomeworkPhotoState {
  const [state, setState] = useState<HomeworkPhotoState>(() =>
    !ref ? { status: 'missing' }
      : isStoredHomeworkPhoto(ref) ? { status: 'loading' }
      : { status: 'ready', src: ref })
  useEffect(() => {
    if (!ref) { setState({ status: 'missing' }); return }
    if (!isStoredHomeworkPhoto(ref)) { setState({ status: 'ready', src: ref }); return }
    let alive = true
    setState({ status: 'loading' })
    void resolveHomeworkPhoto(ref).then(src => {
      if (!alive) return
      setState(src ? { status: 'ready', src }
        : isHomeworkPhotoExpired(ref) ? { status: 'expired' } : { status: 'missing' })
    })
    return () => { alive = false }
  }, [ref])
  return state
}
