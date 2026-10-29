// Фото профиля в интерфейсе: заливка кружка аватара и окно кадрирования.
// Хранилище и ссылки — src/lib/avatarPhoto.ts.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { renderAvatarBlob, useAvatarUrl } from '../lib/avatarPhoto'
import { useT } from '../lib/i18n'
import { Alert } from './Alert'

/** Фото поверх кружка (иконки, инициалов). Родителю нужен position: relative.
 *  Пока ссылки нет — ничего не рисует, и виден запасной вариант под ним. */
export function AvatarPhotoFill({ path }: { path: string | null | undefined }) {
  const url = useAvatarUrl(path)
  if (!url) return null
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', borderRadius: 'inherit', pointerEvents: 'none',
      }}
    />
  )
}

/** Открывает выбор картинки. Звать прямо из обработчика клика — иначе iOS
 *  не откроет окно выбора. */
export function pickImageFile(onFile: (file: File) => void) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (file) onFile(file)
  }
  input.click()
}

const VIEW = 260
const MAX_ZOOM = 4

/** Кадрирование в круг: тащить пальцем/мышью, приближать щипком, колесом или ±. */
export function AvatarCropModal({
  file, onCancel, onSave,
}: {
  file: File
  onCancel: () => void
  /** Получает готовую картинку 256×256. Бросает — окно покажет ошибку. */
  onSave: (blob: Blob) => Promise<void>
}) {
  const t = useT()
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [zoom, setZoom] = useState(1)
  // Щипок шлёт несколько событий за кадр — прежний масштаб берём отсюда, не из рендера.
  const zoomRef = useRef(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // alive: после очистки ссылка отозвана, и её onerror — не про этот файл.
    let alive = true
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => {
      if (!alive) return
      setImg(el)
      setLoadError(false)
      const s = VIEW / Math.min(el.naturalWidth, el.naturalHeight)
      setOffset({ x: (VIEW - el.naturalWidth * s) / 2, y: (VIEW - el.naturalHeight * s) / 2 })
    }
    el.onerror = () => { if (alive) setLoadError(true) }
    el.src = url
    return () => { alive = false; URL.revokeObjectURL(url) }
  }, [file])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  // Масштаб «обложки»: при zoom = 1 короткая сторона ровно заполняет круг.
  const baseScale = img ? VIEW / Math.min(img.naturalWidth, img.naturalHeight) : 1
  const scale = baseScale * zoom

  function clamp(o: { x: number; y: number }, sc: number) {
    if (!img) return o
    const w = img.naturalWidth * sc, h = img.naturalHeight * sc
    return {
      x: Math.min(0, Math.max(VIEW - w, o.x)),
      y: Math.min(0, Math.max(VIEW - h, o.y)),
    }
  }

  // Приближение вокруг центра круга: точка под центром остаётся на месте.
  function zoomTo(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next))
    const s1 = baseScale * zoomRef.current
    const s2 = baseScale * z
    zoomRef.current = z
    setOffset(o => {
      const cx = (VIEW / 2 - o.x) / s1
      const cy = (VIEW / 2 - o.y) / s1
      return clamp({ x: VIEW / 2 - cx * s2, y: VIEW / 2 - cy * s2 }, s2)
    })
    setZoom(z)
  }

  // Один палец — сдвиг, два — щипок.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchFrom = useRef<{ dist: number; zoom: number } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinchFrom.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current }
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId)
    if (!prev) return
    const cur = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, cur)
    if (pointers.current.size >= 2 && pinchFrom.current) {
      const [a, b] = [...pointers.current.values()]
      zoomTo(pinchFrom.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinchFrom.current.dist)
      return
    }
    setOffset(o => clamp({ x: o.x + cur.x - prev.x, y: o.y + cur.y - prev.y }, baseScale * zoomRef.current))
  }
  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchFrom.current = null
  }

  async function save() {
    if (!img || busy) return
    setBusy(true); setError('')
    try {
      const blob = await renderAvatarBlob(img, { x: -offset.x / scale, y: -offset.y / scale, size: VIEW / scale })
      await onSave(blob)
    } catch {
      setError(t('Не удалось загрузить фото. Попробуйте ещё раз.'))
      setBusy(false)
    }
  }

  const roundBtn: React.CSSProperties = {
    width: 36, height: 36, borderRadius: '50%', border: '1px solid var(--color-border-medium)',
    background: 'var(--color-bg-3)', color: 'var(--color-text-2)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
  }

  return createPortal(
    <div
      onPointerDown={e => { if (e.target === e.currentTarget && !busy) onCancel() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        role="dialog"
        aria-label={t('Фото профиля')}
        style={{
          width: 'min(340px, 100%)', boxSizing: 'border-box', padding: 20, borderRadius: 22,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', alignSelf: 'flex-start' }}>
          {t('Фото профиля')}
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={e => zoomTo(zoomRef.current * (e.deltaY < 0 ? 1.08 : 1 / 1.08))}
          style={{
            width: VIEW, height: VIEW, borderRadius: '50%', overflow: 'hidden', position: 'relative',
            background: 'var(--color-bg-3)', cursor: img ? 'grab' : 'default', touchAction: 'none',
            boxShadow: 'inset 0 0 0 1px var(--color-border-medium)',
          }}
        >
          {img && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute', left: offset.x, top: offset.y,
                width: img.naturalWidth * scale, height: img.naturalHeight * scale,
                maxWidth: 'none', userSelect: 'none', pointerEvents: 'none',
              }}
            />
          )}
          {loadError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center', fontSize: 13, color: 'var(--color-text-3)' }}>
              {t('Этот файл не открывается. Выберите фото в JPG или PNG.')}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" style={{ ...roundBtn, opacity: zoom <= 1 ? 0.4 : 1 }} onClick={() => zoomTo(zoom / 1.25)} aria-label={t('Отдалить')}>
            <Minus size={16} strokeWidth={2.2} />
          </button>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)', minWidth: 120, textAlign: 'center' }}>
            {t('Двигайте фото пальцем')}
          </div>
          <button type="button" style={{ ...roundBtn, opacity: zoom >= MAX_ZOOM ? 0.4 : 1 }} onClick={() => zoomTo(zoom * 1.25)} aria-label={t('Приблизить')}>
            <Plus size={16} strokeWidth={2.2} />
          </button>
        </div>

        {error && (
          <Alert tone="danger" text={error} style={{ alignSelf: 'stretch' }} />
        )}

        <div style={{ display: 'flex', gap: 10, alignSelf: 'stretch' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, padding: '10.5px 12px 13.5px', borderRadius: 13, border: '1px solid var(--color-border-medium)',
              background: 'var(--color-bg-3)', color: 'var(--color-text-2)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {t('Отмена')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!img || busy}
            style={{
              flex: 1, padding: '10.5px 12px 13.5px', borderRadius: 13, border: 'none',
              background: 'var(--grad-purple)', color: '#fff', fontSize: 14, fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer', opacity: !img || busy ? 0.6 : 1, fontFamily: 'inherit',
              boxShadow: '0 3px 12px rgba(106,90,230,0.35)',
            }}
          >
            {busy ? t('Загружаем…') : t('Готово')}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}
