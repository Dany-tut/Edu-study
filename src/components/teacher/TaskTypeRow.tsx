// ─── Строка палитры типов заданий ────────────────────────────────────────────
//
// Одна строка «иконка + подпись + хинт» и кнопка «i», открывающая превью типа.
// Раньше эта строка была скопирована в трёх палитрах (ДЗ урока, тест урока,
// страница «Домашки») с расхождениями в наведении и подписях; теперь она одна,
// а данные строка берёт из реестра по идентификатору типа.
//
// ЗАЧЕМ «i», А НЕ ПРОСТО ПОДСКАЗКА НА НАВЕДЕНИИ. Строк 27, они узкие, и
// половина типов различается не подписью, а устройством упражнения. Всплывать
// на каждое движение мыши такая карточка не должна — иначе колонку нельзя
// просто пролистать глазами. Поэтому: «i» проявляется на строке, карточка
// открывается только от неё.
//
// Нативный title= здесь намеренно не ставится: он дублировал хинт, который и
// так написан второй строкой, и перебивал бы карточку своим ярлычком.

import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ScrollFade from '../ScrollFade'
import { Info } from '../icons/appIcons'
import { useT } from '../../lib/i18n'
import type { FipiPreview } from '../../data/fipiPreviews'
import { TASK_TYPES, type TaskTypeId } from '../../data/taskTypes'

// Макеты превью (и полтора десятка их примитивов) приезжают отдельным чанком
// при первом наведении на «i» — в палитру они не входят.
const PreviewCard = lazy(() => import('./TaskTypePreviewCard'))

const CARD_W = 318
/** Отступ карточки от «i» и от края экрана. */
const PAD = 10

export function TaskTypeRow({ type, onClick, active = false, preset }: {
  type: TaskTypeId
  onClick: () => void
  /** Строка, по которой только что кликнули, — подсвечена цветом типа. */
  active?: boolean
  preset?: { number: number; title: string; hint: string; score: string; preview: FipiPreview }
}) {
  const t = useT()
  const def = TASK_TYPES[type]
  const { color, bg } = def.visual
  const [hover, setHover] = useState(false)
  const [open, setOpen] = useState(false)
  const dotRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  // Между «i» и карточкой есть зазор, и путь мыши к карточке идёт по пустому
  // месту. Мгновенное закрытие на этом пути гасило бы карточку прямо под
  // курсором, поэтому уход даёт отсрочку, а вход в карточку её отменяет.
  const closeTimer = useRef<number | null>(null)
  const show = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setOpen(true)
  }, [])
  const hide = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 140)
  }, [])
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  // Положение считаем от кнопки: справа от рейла, а при нехватке места слева.
  // Карточка живёт в портале с position: fixed — внутри колонки её срезал бы
  // overflow: hidden рейла (та же грабля, что была у разбора слова в стопке).
  const place = useCallback(() => {
    const r = dotRef.current?.getBoundingClientRect()
    if (!r) return
    const h = cardRef.current?.offsetHeight ?? 260
    const width = Math.min(CARD_W, window.innerWidth - PAD * 2)
    const right = r.right + PAD
    const leftSide = r.left - PAD - width
    const fitsRight = right + width <= window.innerWidth - PAD
    const fitsLeft = leftSide >= PAD
    const maxTop = Math.max(PAD, window.innerHeight - h - PAD)
    const left = fitsRight ? right : fitsLeft ? leftSide : (window.innerWidth - width) / 2
    const preferredTop = fitsRight || fitsLeft
      ? r.top - 24
      : r.bottom + PAD <= maxTop ? r.bottom + PAD : r.top - PAD - h
    const top = Math.min(Math.max(PAD, preferredTop), maxTop)
    setPos({ left, top })
  }, [])

  // Первый проход рисует карточку по прикидочной высоте, второй — по
  // измеренной: иначе длинные макеты (кроссворд, дрилл) свисают за нижний край.
  // Наблюдатель нужен и потому, что чанк с макетами приезжает уже после
  // открытия: карточка вырастает из заглушки в полный рост.
  useLayoutEffect(() => {
    if (!open) return
    place()
    const el = cardRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => place())
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !dotRef.current?.contains(e.target) && !cardRef.current?.contains(e.target)) close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointerDown)

    // Прокрутка рейла уводит строку из-под карточки — закрываем, а не тащим.
    const onScroll = (e: Event) => {
      if (!(e.target instanceof Node) || !cardRef.current?.contains(e.target)) close()
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); hide() }}
    >
      <button type="button" data-hover="layer"
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 30px 10px 10px', borderRadius: 13,
          border: `1.5px solid ${active ? color : 'transparent'}`,
          background: active || hover ? bg : 'var(--color-bg-2)',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <span style={{
          width: 34, height: 34, borderRadius: 9, background: bg, flexShrink: 0,
          display: 'grid', placeItems: 'center',
        }}>
          {preset ? <span style={{ color, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{preset.number}</span> : <def.Icon size={15} style={{ color }} />}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, lineHeight: 1.2, color: 'var(--color-text)' }}>{preset?.title ?? t(def.label)}</span>
          <span style={{ display: 'block', fontSize: 10, lineHeight: 1.3, color: 'var(--color-muted)', marginTop: 2 }}>{preset ? `${preset.hint} · ${preset.score}` : t(def.hint)}</span>
        </span>
      </button>

      {/* «i» — отдельная кнопка рядом с кнопкой добавления, а не внутри неё:
          кнопка в кнопке невалидна и ломает клавиатуру. */}
      <button
        ref={dotRef}
        type="button"
        className={preset ? 'fipi-row-info' : undefined}
        aria-label={t('Как это выглядит ученику')}
        onClick={e => { e.stopPropagation(); if (preset || !open) show(); else hide() }}
        onPointerEnter={e => { if (e.pointerType === 'mouse') show() }}
        onFocus={e => {
          if (!preset || e.currentTarget.matches(':focus-visible')) { setHover(true); show() }
        }}
        onKeyDown={e => {
          if (e.key !== 'Tab' || e.shiftKey) return
          const source = cardRef.current?.querySelector('a')
          if (!source) return
          e.preventDefault()
          source.focus()
        }}
        onBlur={e => { if (!cardRef.current?.contains(e.relatedTarget)) hide() }}
        style={{
          position: 'absolute', top: 8, right: 7,
          width: 20, height: 20, borderRadius: '50%', border: 'none', padding: 0,
          display: 'grid', placeItems: 'center', cursor: 'help',
          background: open ? bg : 'transparent',
          // Тусклый серый на тонированном фоне строки не читался — «i» берёт
          // цвет самого типа, он контрастен своей же подложке по построению.
          color,
          opacity: hover || open ? 1 : 'var(--fipi-info-idle-opacity, 0)',
          transition: 'opacity 0.15s',
        }}
      >
        <Info size={14} />
      </button>

      {open && createPortal(
        <div
          ref={cardRef}
          onMouseEnter={show}
          onMouseLeave={hide}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) hide() }}
          style={{
            // 4000 — этаж всплывающих слоёв, вынесенных в портал: палитра
            // живёт и внутри модалок (2000–3000).
            position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999,
            width: `min(${CARD_W}px, calc(100vw - ${PAD * 2}px))`, zIndex: 4000,
            visibility: pos ? 'visible' : 'hidden',
            padding: '12px 12px', borderRadius: 18,
            background: 'rgba(var(--glass-rgb), 0.9)',
            backdropFilter: 'var(--blur-solid)',
            WebkitBackdropFilter: 'var(--blur-solid)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <ScrollFade maxHeight="calc(100dvh - 46px)" fadeHeight={16}>
            <Suspense fallback={<div style={{ height: 180 }} />}>
              <PreviewCard type={type} fipi={preset?.preview} />
            </Suspense>
          </ScrollFade>
        </div>,
        document.body,
      )}
    </div>
  )
}
