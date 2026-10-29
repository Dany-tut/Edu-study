// Фото профиля — у учителя и у ученика (миграция 0106).
//
// Файл лежит в приватном бакете `avatars` под <auth uid>/<мс>.webp и
// показывается по подписанной ссылке. Сохраняется ПУТЬ, а не ссылка (она
// протухает): у учителя — user_metadata.avatarPath, у ученика —
// students.avatar_path на всех его карточках (RPC set_my_avatar).
//
// Перед загрузкой фото кадрируется в квадрат и ужимается до 256×256 —
// десятки килобайт вместо мегабайт с камеры телефона.

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getAuthUser, getSessionUser } from './owner'
import { useDashboard } from '../store/dashboardStore'

const BUCKET = 'avatars'

/** Сторона итоговой картинки. Аватар нигде не крупнее 80px, ×3 на ретине. */
export const AVATAR_PX = 256

/** Ссылка живёт сутки, в памяти держим чуть меньше — чтобы не отдать протухшую. */
const URL_TTL_S = 24 * 60 * 60
const CACHE_MS = (URL_TTL_S - 60 * 60) * 1000

export type AvatarCrop = { x: number; y: number; size: number }

/** Вырезает квадрат `crop` (в пикселях исходника) и сжимает в webp/jpeg. */
export async function renderAvatarBlob(img: HTMLImageElement, crop: AvatarCrop): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_PX
  canvas.height = AVATAR_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas недоступен')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, AVATAR_PX, AVATAR_PX)

  const encode = (type: string, q: number) =>
    new Promise<Blob | null>(res => canvas.toBlob(res, type, q))
  // Старый Safari webp не кодирует и молча отдаёт png — тогда берём jpeg.
  const webp = await encode('image/webp', 0.86)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await encode('image/jpeg', 0.88)
  if (!jpeg) throw new Error('Не удалось сжать фото')
  return jpeg
}

/** Кладёт готовую картинку в свою папку и возвращает путь объекта. */
export async function uploadAvatarPhoto(blob: Blob): Promise<string> {
  // Именно сессия, а не getOwnerId(): админ в чужом кабинете грузит СВОЁ фото.
  const uid = (await getSessionUser())?.id
  if (!uid) throw new Error('Not authenticated')
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${uid}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })
  if (error) throw error
  return path
}

/** Удаляет прежний файл. Ошибку глотаем: висящий файл никому не мешает. */
export async function removeAvatarPhoto(path: string | null | undefined): Promise<void> {
  if (!path) return
  urlCache.delete(path)
  await supabase.storage.from(BUCKET).remove([path]).then(() => {}, () => {})
}

/** Ученик: путь на все его карточки — фото видит учитель любого направления. */
export async function saveStudentAvatarPath(path: string | null): Promise<void> {
  const { error } = await supabase.rpc('set_my_avatar', { p_path: path })
  if (error) throw error
}

/** Учитель: путь в метаданные аккаунта. Иконку не трогаем — она запасная. */
export async function saveTeacherAvatarPath(path: string | null): Promise<void> {
  const { error } = await supabase.auth.updateUser({ data: { avatarPath: path } })
  if (error) throw error
}

// ── Подписанные ссылки ───────────────────────────────────────────────────────
// Список учеников — это десятки аватаров сразу. Пути, запрошенные в одном
// кадре, уходят одним createSignedUrls, а ответы кэшируются на сутки.

const urlCache = new Map<string, { url: Promise<string | null>; at: number }>()
let pending: { path: string; resolve: (u: string | null) => void }[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function flush() {
  const batch = pending
  pending = []
  flushTimer = null
  const paths = [...new Set(batch.map(b => b.path))]
  supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL_S).then(
    ({ data }) => {
      const byPath = new Map<string, string | null>()
      for (const row of data ?? []) if (row.path) byPath.set(row.path, row.signedUrl || null)
      for (const b of batch) b.resolve(byPath.get(b.path) ?? null)
    },
    () => { for (const b of batch) b.resolve(null) },
  )
}

export function getAvatarUrl(path: string): Promise<string | null> {
  const hit = urlCache.get(path)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.url
  const url = new Promise<string | null>(resolve => {
    pending.push({ path, resolve })
    if (!flushTimer) flushTimer = setTimeout(flush, 0)
  })
  urlCache.set(path, { url, at: Date.now() })
  // Не вышло (нет прав, нет сети) — не держим промах в кэше до завтра.
  url.then(u => { if (!u) urlCache.delete(path) })
  return url
}

/** Ссылка на фото по пути; null — пока грузится, нет фото или нет доступа. */
export function useAvatarUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    setUrl(null)
    if (!path) return
    let alive = true
    getAvatarUrl(path).then(u => { if (alive) setUrl(u) })
    return () => { alive = false }
  }, [path])
  return url
}

/** Путь к фото вошедшего учителя; обновляется, как только профиль сохранён. */
export function useMyTeacherAvatarPath(): string | null {
  const [path, setPath] = useState<string | null>(null)
  useEffect(() => {
    getAuthUser().then(u => setPath(u?.user_metadata?.avatarPath ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === 'USER_UPDATED' && session?.user) setPath(session.user.user_metadata?.avatarPath ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])
  return path
}

/** Фото ученика: путь из стора + сохранить/убрать. Убрать — сразу; не
 *  вышло — фото возвращается на место. */
export function useStudentAvatarPhoto() {
  const avatarPath = useDashboard(s => s.avatarPath)
  const setAvatarPath = useDashboard(s => s.setAvatarPath)

  async function savePhoto(blob: Blob) {
    const path = await uploadAvatarPhoto(blob)
    await saveStudentAvatarPath(path)
    const old = useDashboard.getState().avatarPath
    setAvatarPath(path)
    removeAvatarPhoto(old)
  }

  async function removePhoto() {
    const old = useDashboard.getState().avatarPath
    if (!old) return
    setAvatarPath(null)
    try {
      await saveStudentAvatarPath(null)
      removeAvatarPhoto(old)
    } catch {
      setAvatarPath(old)
    }
  }

  return { avatarPath, savePhoto, removePhoto }
}
