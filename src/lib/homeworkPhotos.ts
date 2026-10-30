// Фото сдач ДЗ в хранилище (бакет homework-photos).
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
import { appFlag } from './cardGroups'

const BUCKET = 'homework-photos'
export const HW_PHOTO_PREFIX = 'hwp:'
/** Сколько живёт фото. Совпадает с интервалом в homework_photos_expired(). */
export const HW_PHOTO_TTL_MS = 7 * 24 * 3600 * 1000

/** Ссылка на фото в хранилище (а не старый base64 / внешний адрес)? */
export function isStoredHomeworkPhoto(ref: string | null | undefined): ref is string {
  return !!ref && ref.startsWith(HW_PHOTO_PREFIX)
}

/** Путь объекта в бакете для `hwp:`-ссылки, иначе null. Нужен серверу (ИИ-оценка). */
export function homeworkPhotoPath(ref: string | null | undefined): string | null {
  if (!isStoredHomeworkPhoto(ref)) return null
  const path = ref.slice(HW_PHOTO_PREFIX.length)
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/\d{13}-[0-9a-f-]{36}\.(?:webp|jpg|png)$/i.test(path) ? path : null
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
  return at != null && now - at >= HW_PHOTO_TTL_MS
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
  const mime = blob.type
  if (!EXT_BY_MIME[mime] || blob.size > 5 * 1024 * 1024) throw new Error('Invalid homework image')
  const path = `${uid}/${studentId}/${Date.now()}-${crypto.randomUUID()}.${EXT_BY_MIME[mime]}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: mime, upsert: false })
  if (error) throw error
  return HW_PHOTO_PREFIX + path
}

/**
 * Включается только после миграции и обновления ИИ-проверяющего.
 * При ошибке загрузки вызывающий сохраняет черновик и предлагает повторить.
 */
export async function storeSolutionImages<T extends { photos: string[]; board: string | null }>(
  payload: T, studentId: string,
): Promise<T> {
  if (!(await appFlag('homework_photos_storage'))) return payload
  const up = (src: string) => uploadHomeworkPhoto(src, studentId)
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
  if (!path) return isStoredHomeworkPhoto(ref) ? null : ref
  if (isHomeworkPhotoExpired(ref)) return null
  const uid = (await getSessionUser())?.id
  if (!uid) return null
  const key = `${uid}:${path}`
  const hit = signed.get(key)
  if (hit && hit.until > Date.now()) return hit.url
  let p = inflight.get(key)
  if (!p) {
    const at = homeworkPhotoUploadedAt(ref)
    const ttl = at == null ? SIGN_TTL_S : Math.max(1, Math.min(SIGN_TTL_S, Math.floor((at + HW_PHOTO_TTL_MS - Date.now()) / 1000)))
    p = supabase.storage.from(BUCKET).createSignedUrl(path, ttl).then(({ data, error }) => {
      if (error || !data) return null
      signed.set(key, { url: data.signedUrl, until: Date.now() + Math.max(0, ttl - 60) * 1000 })
      return data.signedUrl
    }).catch(() => null).finally(() => { inflight.delete(key) })
    inflight.set(key, p)
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
  const initial = (): HomeworkPhotoState =>
    !ref ? { status: 'missing' }
      : isStoredHomeworkPhoto(ref) ? { status: 'loading' }
      : { status: 'ready', src: ref }
  const [resolved, setResolved] = useState(() => ({ ref, state: initial() }))
  useEffect(() => {
    const setState = (state: HomeworkPhotoState) => setResolved({ ref, state })
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
  return resolved.ref === ref ? resolved.state : initial()
}
