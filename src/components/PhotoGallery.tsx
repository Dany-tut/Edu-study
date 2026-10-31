import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../lib/i18n'
import { useNativeOverlay } from '../lib/nativeGlass'

// Artwork from Искра's Loop icon family (ChevronRight / X).
function GalleryIcon({ close = false, left = false }: { close?: boolean; left?: boolean }) {
  return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: left ? 'rotate(180deg)' : undefined }}>
    <path d={close ? 'M7 5q9 12 19 21M26 5Q16 15 5 27' : 'M10 5q7 6 13 11-7 6-14 12'} />
  </svg>
}

const control: CSSProperties = { width: 48, height: 48, borderRadius: 24, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.12)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }

/** Fullscreen gallery. Native horizontal scrolling provides touch swipes and snap. */
export default function PhotoGallery({ photos, initialIndex = 0, onClose }: { photos: string[]; initialIndex?: number; onClose: () => void }) {
  const t = useT()
  const initial = Math.max(0, Math.min(initialIndex, photos.length - 1))
  const [index, setIndex] = useState(initial)
  const indexRef = useRef(initial)
  const scroller = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useNativeOverlay(true)

  const go = (delta: number) => {
    const el = scroller.current
    if (!el) return
    const next = Math.max(0, Math.min(photos.length - 1, indexRef.current + delta))
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const goRef = useRef(go)
  goRef.current = go

  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    const align = () => { el.scrollLeft = indexRef.current * el.clientWidth }
    align()
    const observer = new ResizeObserver(align)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    const gutter = document.documentElement.style.scrollbarGutter
    document.documentElement.style.scrollbarGutter = 'auto'
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeRef.current() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault(); e.stopImmediatePropagation(); goRef.current(e.key === 'ArrowRight' ? 1 : -1)
      }
      if (e.key === 'Tab') {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
        if (!buttons?.length) return
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (!dialog.current?.contains(document.activeElement)) { e.preventDefault(); (e.shiftKey ? last : first).focus() }
        else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    // Capture Escape before the underlying form's own listener.
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = overflow
      document.documentElement.style.scrollbarGutter = gutter
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  if (!photos.length) return null
  return createPortal(<div ref={dialog} role="dialog" aria-modal="true" aria-label={t('Просмотр фото')}
    onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
    style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh', zIndex: 1600, background: '#08090b', color: '#fff', overflow: 'hidden' }}>
    <div ref={scroller} className="no-scrollbar" onScroll={e => {
      const el = e.currentTarget
      const next = Math.max(0, Math.min(photos.length - 1, Math.round(el.scrollLeft / Math.max(1, el.clientWidth))))
      indexRef.current = next
      setIndex(next)
    }} style={{ display: 'flex', width: '100%', height: '100%', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', overscrollBehavior: 'contain', touchAction: 'pan-x pinch-zoom' }}>
      {photos.map((src, i) => <div key={i} style={{ flex: '0 0 100%', minWidth: 0, height: '100%', boxSizing: 'border-box', scrollSnapAlign: 'center', scrollSnapStop: 'always', padding: 'calc(env(safe-area-inset-top, 0px) + 76px) 12px calc(env(safe-area-inset-bottom, 0px) + 96px)' }}>
        <img src={src} alt={`${t('Фото')} ${i + 1}`} loading="lazy" decoding="async" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain', userSelect: 'none' }} />
      </div>)}
    </div>
    <button ref={closeButton} type="button" onClick={onClose} aria-label={t('Закрыть просмотр фото')} style={{ ...control, position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 16 }}><GalleryIcon close /></button>
    <div style={{ position: 'absolute', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      {photos.length > 1 && <button type="button" aria-label={t('Предыдущее фото')} disabled={index === 0} onClick={() => go(-1)} style={{ ...control, opacity: index === 0 ? 0.3 : 1 }}><GalleryIcon left /></button>}
      <span aria-live="polite" aria-atomic="true" style={{ minWidth: 64, textAlign: 'center', fontSize: 15, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{index + 1} / {photos.length}</span>
      {photos.length > 1 && <button type="button" aria-label={t('Следующее фото')} disabled={index === photos.length - 1} onClick={() => go(1)} style={{ ...control, opacity: index === photos.length - 1 ? 0.3 : 1 }}><GalleryIcon /></button>}
    </div>
  </div>, document.body)
}
