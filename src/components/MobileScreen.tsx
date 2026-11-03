import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { MOBILE_TOP_GAP, MOBILE_TOP_ENTER } from '../lib/mobileTokens'
import { markScrollSet } from '../lib/useNavCollapse'
import { useEnterAfterPaint } from '../lib/useEnterAfterPaint'
import { GLASS, type GlassHeader } from '../lib/nativeGlass'
import { useOverlayScroll } from './teacher/OverlayScroll'
import { useKeyboardOpen } from '../lib/useKeyboardInset'
import MobileGlassHeader from './MobileGlassHeader'
import './mobileInteraction.css'

// ─────────────────────────────────────────────────────────────────────────────
// MobileScreen — the reusable phone shell (MOBILE ONLY; desktop never imports).
// Top-bar logic mirrors the portfolio top-nav: a single floating glass pill
// pinned just below the safe-area edge (small gap), NO separate blur/shadow band
// (the pill's own backdrop-blur handles scroll-under), and a scroll-collapse —
// the bar hides on scroll-down and returns on scroll-up / at the top.
// ─────────────────────────────────────────────────────────────────────────────

/** Distance the bottom dock floats off the screen edge (px), on top of safe-area. */
export const MOBILE_EDGE = 44
/** Default height reserved at the top for the floating widget zone. */
const DEFAULT_TOP_PAD = 96

// ─── Место в ленте не теряется при уходе на соседнюю вкладку ────────────────
//
// Экраны нижней навигации размонтируются при переключении (DashboardPage
// рисует ровно один activePage), поэтому прокрутка живёт не в DOM, а здесь.
// Ученик, ушедший на десятый пост ленты и заглянувший в «Курсы», возвращается
// на своё место, а не в начало главной.
const savedScroll = new Map<string, number>()

/** Тег на теле прокрутки: по нему нижняя навигация листает экран наверх. */
export const MOBILE_SCROLL_ATTR = 'data-mobile-scroll'

export default function MobileScreen({
  topZone,
  glassHeader,
  topPad = DEFAULT_TOP_PAD,
  topRaise = 0,
  bottomDock,
  bottomDockRaise = 0,
  children,
  scrollKey,
  restoreKey,
}: {
  /** Floating glass widget/context pinned to the top. Content scrolls under it. */
  topZone?: ReactNode
  /** В приложении на iOS шапку рисует система (плавающие стеклянные капсулы):
   *  подпись слева, счётчик справа. Задан — веб-topZone прячется в пользу неё. */
  glassHeader?: GlassHeader
  /** Height the top zone occupies — body padding matches it. */
  topPad?: number
  /** How many px to pull the top chrome up into the safe-area band (0 = sit just
   *  below the notch). */
  topRaise?: number
  /** Bottom dock: page controls + nav. Rendered fixed, 44px off edge + safe-area. */
  bottomDock?: ReactNode
  /** Lift page actions above a separate bottom navigation bar. */
  bottomDockRaise?: number
  children: ReactNode
  /** Change to reset scroll state when the page swaps. */
  scrollKey?: string | number
  /** Запоминать место прокрутки под этим ключом и возвращать на него при
   *  следующем открытии экрана. */
  restoreKey?: string
}) {
  const keyboardOpen = useKeyboardOpen()
  const rootRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const [topClearance, setTopClearance] = useState(0)
  const [dockClearance, setDockClearance] = useState(0)
  // Measure the actual occupied bottom zone: buttons, errors and safe area can
  // all change its height. The content dissolves BEFORE the controls.
  useLayoutEffect(() => {
    const root = rootRef.current
    const dock = dockRef.current
    if (!root) return
    const measure = () => {
      const bounds = root.getBoundingClientRect()
      const bottom = dock ? Math.max(0, Math.ceil(bounds.bottom - dock.getBoundingClientRect().top)) : 0
      const top = topRef.current ? Math.max(0, Math.ceil(topRef.current.getBoundingClientRect().bottom - bounds.top)) : 0
      setDockClearance(old => old === bottom ? old : bottom)
      setTopClearance(old => old === top ? old : top)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    if (dock) observer.observe(dock)
    if (topRef.current) observer.observe(topRef.current)
    return () => observer.disconnect()
  }, [!!bottomDock, bottomDockRaise, keyboardOpen, topZone != null, !!glassHeader])
  const TOP_ZONE = topPad
  const { ref: bodyRef, fade, onScroll } = useOverlayScroll()
  // Вход шапки ждёт первого нарисованного кадра — иначе его съедает сборка
  // экрана (lib/useEnterAfterPaint.ts).
  const entered = useEnterAfterPaint()
  // Both chrome zones dissolve content alpha; controls stay outside the mask.
  const topFadeEnd = topClearance > 0 ? topClearance + 24 : 24
  const bottomFadeStart = dockClearance > 0 && !keyboardOpen
    ? `max(${topFadeEnd}px, calc(100% - ${dockClearance + 56}px))`
    : 'calc(100% - 100px)'
  const bottomFadeEnd = dockClearance > 0 && !keyboardOpen ? `calc(100% - ${dockClearance}px)` : '100%'
  const contentMask = fade.top > 0 || fade.bottom > 0
    ? `linear-gradient(to bottom, rgba(0,0,0,${1 - fade.top}) 0px, rgba(0,0,0,${1 - fade.top}) ${topClearance}px, #000 ${topFadeEnd}px, #000 ${bottomFadeStart}, rgba(0,0,0,${1 - fade.bottom}) ${bottomFadeEnd}, rgba(0,0,0,${1 - fade.bottom}) 100%)`
    : undefined

  // ВОЗВРАТ НА МЕСТО. Содержимое приезжает не сразу (лента, курсы), поэтому
  // одним присваиванием не обойтись: держим цель, пока страница дорастает до
  // неё, и отпускаем, как только человек тронул прокрутку сам.
  //
  // Layout, а не обычный эффект: первое присваивание обязано случиться ДО
  // отрисовки. Иначе экран успевает показаться отмотанным к началу и уже потом
  // прыгает на место — на возврате свайпом это видно как «шапка переехала и всё
  // обновилось сразу после жеста» (lib/useSwipeBack.ts ждёт как раз покоя).
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el || !restoreKey) return
    const want = savedScroll.get(restoreKey) ?? 0
    let done = want <= 0
    let cleanupRestore: (() => void) | null = null
    if (!done) {
      const apply = () => {
        if (done || !bodyRef.current) return
        const box = bodyRef.current
        const max = box.scrollHeight - box.clientHeight
        box.scrollTop = Math.min(want, Math.max(0, max))
        // Это МЫ, а не палец: без отметки нижняя навигация читала доводку как
        // «пролистал вниз» и сворачивалась в мини на возврате назад.
        markScrollSet(box, box.scrollTop)
        if (max >= want) done = true
      }
      apply()
      // Пока контент растёт — дотягиваем. Наблюдать нечего: высота меняется у
      // содержимого, а не у самой коробки, поэтому просто пробуем несколько раз.
      // Полторы секунды хватает и на медленный ответ; дальше место считаем
      // недостижимым (постов в ленте стало меньше, чем было).
      const tick = window.setInterval(apply, 80)
      const stop = window.setTimeout(() => { done = true; window.clearInterval(tick) }, 1500)
      cleanupRestore = () => { window.clearInterval(tick); window.clearTimeout(stop) }
    }
    const remember = () => { if (bodyRef.current) savedScroll.set(restoreKey, bodyRef.current.scrollTop) }
    // Тронул прокрутку сам — доводка отменяется: спорить с пальцем нельзя.
    const release = () => { done = true }
    el.addEventListener('scroll', remember, { passive: true })
    el.addEventListener('touchstart', release, { passive: true })
    el.addEventListener('wheel', release, { passive: true })
    return () => {
      remember()
      el.removeEventListener('scroll', remember)
      el.removeEventListener('touchstart', release)
      el.removeEventListener('wheel', release)
      cleanupRestore?.()
    }
  }, [restoreKey, scrollKey])
  // Portfolio top-nav logic: the bar floats just below the safe-area edge, and
  // content scrolls EDGE-TO-EDGE under it (paddingTop = safe-area + bar height),
  // so the notch/home-indicator zones are filled by content, never an empty band.
  void topRaise
  const SAFE_TOP = 'env(safe-area-inset-top, 0px)'
  const SAFE_BOTTOM = 'env(safe-area-inset-bottom, 0px)'
  // Зазор, а не вплотную к safe-area: у статус-бара iPhone своё размытие, и
  // шапка, прижатая к границе, читается как заехавшая под чёлку.
  const TOP_INSET = `calc(${SAFE_TOP} + ${MOBILE_TOP_GAP}px)`

  return (
    <div
      ref={rootRef}
      className="mobile-screen"
      style={{
        position: 'relative',
        height: '100dvh',
        overflowX: 'clip',
        overflowY: 'hidden',
        // No solid fill — content scrolls edge-to-edge under the floating bars
        // and Safari tints the safe-area zones natively (body provides the base).
        background: 'transparent',
      }}
    >
      {/* В приложении на iOS шапку рисует система (стеклянные капсулы) — веб-пилюли
          не рендерим, место под них (topPad) остаётся. */}
      {GLASS && glassHeader && <>
        <MobileGlassHeader {...glassHeader} />
        <div ref={topRef} aria-hidden="true" style={{ position: 'absolute', top: TOP_INSET, height: 44, width: 0, visibility: 'hidden', pointerEvents: 'none' }} />
      </>}

      {/* TOP — floating glass widget zone. pointer-events pass through empty areas. */}
      {topZone != null && !(GLASS && glassHeader) && (
        <div
          // Верхние кнопки на свайпе «назад» стоят, а не едут: по линии стыка
          // они сменяются кнопками нижнего экрана (lib/useSwipeBack.ts).
          data-swipe-pin="top"
          ref={topRef}
          style={{
            position: 'absolute',
            top: TOP_INSET,
            left: 0,
            right: 0,
            zIndex: 60,
            padding: '0 16px',
            pointerEvents: 'none',
          }}
        >
          {/* Вход шапки общий на все экраны (MOBILE_TOP_ENTER): падает сверху.
              Раньше он был только у «острова» главной и профиля, а «Курсы» и
              «Тренажёр» показывали шапку без движения — соседние вкладки
              вели себя по-разному. */}
          <motion.div
            initial={MOBILE_TOP_ENTER.initial}
            animate={entered ? MOBILE_TOP_ENTER.animate : MOBILE_TOP_ENTER.initial}
            transition={MOBILE_TOP_ENTER.transition}
            style={{ pointerEvents: 'auto' }}
          >
            {topZone}
          </motion.div>
        </div>
      )}

      {/* MIDDLE — scroll body. scroll-under: paddingTop lifts content below the
          top zone; paddingBottom clears the bottom dock. */}
      <div
        key={scrollKey}
        ref={bodyRef}
        onScroll={onScroll}
        {...{ [MOBILE_SCROLL_ATTR]: '' }}
        className="no-scrollbar"
        style={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'clip',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          maskImage: contentMask,
          WebkitMaskImage: contentMask,
          paddingTop: topZone != null || (GLASS && glassHeader) ? `calc(${SAFE_TOP} + ${TOP_ZONE + MOBILE_TOP_GAP - 8}px)` : `calc(${SAFE_TOP} + ${MOBILE_TOP_GAP}px)`,
          paddingLeft: 16,
          paddingRight: 16,
          // Bottom: home-indicator safe-area + dock/nav clearance.
          paddingBottom: dockClearance > 0 && !keyboardOpen ? dockClearance + 24 : `calc(${SAFE_BOTTOM} + ${MOBILE_EDGE + 92 + bottomDockRaise}px)`,
        }}
      >
        {children}
      </div>

      {/* BOTTOM — fixed dock: page controls + nav. 44px off edge + safe-area. */}
      {bottomDock != null && !keyboardOpen && (
        <div
          ref={dockRef}
          data-mobile-dock
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: bottomDockRaise ? `calc(${SAFE_BOTTOM} + ${bottomDockRaise}px)` : 0,
            zIndex: 70,
            paddingBottom: `${MOBILE_EDGE - 16}px`,
            paddingLeft: 16,
            paddingRight: 16,
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>{bottomDock}</div>
        </div>
      )}
    </div>
  )
}
