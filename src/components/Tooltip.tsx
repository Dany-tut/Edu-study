import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'

/**
 * ПОДСКАЗКА у кнопок-иконок — своя, а не системный title= (дизайн-система, круг 2).
 *
 * Системная появляется через секунду и выглядит по-разному в каждой ОС. Своя:
 * плашка в обратных цветах темы (текст на фоне текста), 12/600, радиус 8, в
 * портале — её не обрезает overflow родителя. Появляется через 400 мс; если
 * только что была видна подсказка соседней кнопки — сразу, без задержки.
 * Сочетание клавиш — приглушённо справа.
 *
 * Оборачивает один элемент: <Tooltip label="Жирный" keys="Ctrl B"><button …/></Tooltip>.
 * На касание не показывается: на телефоне у кнопки должна быть понятная иконка.
 */

let lastHiddenAt = 0

export default function Tooltip({ label, keys, children }: {
  label: string
  keys?: string
  children: ReactElement<Record<string, unknown>>
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const show = (el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const at = { x: r.left + r.width / 2, y: r.bottom + 6 }
    clearTimeout(timer.current)
    if (performance.now() - lastHiddenAt < 300) setPos(at)
    else timer.current = setTimeout(() => setPos(at), 400)
  }
  const hide = () => {
    clearTimeout(timer.current)
    setPos(p => { if (p) lastHiddenAt = performance.now(); return null })
  }

  const p = children.props
  const child = cloneElement(children, {
    title: undefined,
    'aria-label': (p['aria-label'] as string | undefined) ?? label,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => { if (e.pointerType === 'mouse') show(e.currentTarget); (p.onPointerEnter as ((e: unknown) => void) | undefined)?.(e) },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => { hide(); (p.onPointerLeave as ((e: unknown) => void) | undefined)?.(e) },
    onFocus: (e: React.FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(':focus-visible')) show(e.currentTarget); (p.onFocus as ((e: unknown) => void) | undefined)?.(e) },
    onBlur: (e: React.FocusEvent<HTMLElement>) => { hide(); (p.onBlur as ((e: unknown) => void) | undefined)?.(e) },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => { hide(); (p.onPointerDown as ((e: unknown) => void) | undefined)?.(e) },
  })

  return (
    <>
      {child}
      {pos && createPortal(
        <div
          role="tooltip"
          style={{
            position: 'fixed', left: pos.x, top: pos.y, transform: 'translateX(-50%)', zIndex: 4000,
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
            background: 'var(--color-text)', color: 'var(--color-bg)',
            fontSize: 12, fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap', pointerEvents: 'none',
            boxShadow: 'var(--shadow-2)',
          }}
        >
          {label}
          {keys && <span style={{ opacity: 0.55, fontWeight: 500 }}>{keys}</span>}
        </div>,
        document.body,
      )}
    </>
  )
}
