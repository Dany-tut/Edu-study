// ─────────────────────────────────────────────────────────────────────────────
// Mobile Token Design System (TDS) — canonical color pairs + button variants.
// Single source so mobile chips/buttons never hardcode hex or re-roll styles.
// All values reference CSS vars from index.css → auto-adapt to light/dark.
// See docs/MOBILE_SPEC.md §2.5 (pairs) / §2.6 (buttons).
// ─────────────────────────────────────────────────────────────────────────────

/** Semantic background-soft ↔ on-soft-text pairs. One pair per meaning — no dups. */
export type PairName =
  | 'success' | 'warning' | 'error' | 'review' | 'focus' | 'info' | 'accent2' | 'rose'

export interface ColorPair {
  /** Soft tinted surface — use as the chip/card background. */
  bg: string
  /** Text/icon color that sits on `bg` with AA contrast. */
  text: string
}

export const PAIR: Record<PairName, ColorPair> = {
  success: { bg: 'var(--color-green-soft)',   text: 'var(--color-green-text)' },
  warning: { bg: 'var(--color-yellow-soft)',  text: 'var(--color-yellow-text)' },
  error:   { bg: 'var(--color-red-soft)',     text: 'var(--color-red-text)' },
  review:  { bg: 'var(--color-peach-soft)',   text: 'var(--color-peach-text)' },
  focus:   { bg: 'var(--color-purple-soft)',  text: 'var(--color-purple-text)' },
  info:    { bg: 'var(--color-blue-pill-bg)', text: 'var(--color-blue-pill-text)' },
  accent2: { bg: 'var(--color-teal-pill-bg)', text: 'var(--color-teal-pill-text)' },
  rose:    { bg: 'var(--color-rose-soft)',    text: 'var(--color-rose-text)' },
}

/** Map course-track lesson status → semantic pair (kills the cardStyle/TRACK_STATUS dup). */
export const STATUS_PAIR = {
  completed: PAIR.success,
  returned:  PAIR.warning,
  unviewed:  PAIR.error,
  submitted: PAIR.review,
  current:   PAIR.focus,
} as const

// ── Button variants (§2.6) ───────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'glass' | 'ghost' | 'soft'

import type { CSSProperties } from 'react'

/** Returns the canonical style for a button/chip variant. `pair` only used by 'soft'. */
export function buttonStyle(variant: ButtonVariant, opts?: { pair?: PairName; active?: boolean }): CSSProperties {
  switch (variant) {
    case 'primary':
      return {
        background: 'var(--color-purple-soft)',
        color: 'var(--color-accent)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid transparent',
      }
    case 'glass':
      return {
        background: 'rgba(var(--glass-rgb), 0.78)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        color: 'var(--color-text)',
        boxShadow: 'var(--shadow-xs)',
        border: '1px solid var(--color-border-glass)',
      }
    case 'ghost':
      return {
        background: 'transparent',
        color: opts?.active ? 'var(--color-text)' : 'var(--color-muted)',
        border: '1px solid transparent',
      }
    case 'soft': {
      const p = PAIR[opts?.pair ?? 'focus']
      return {
        background: p.bg,
        color: p.text,
        border: '1px solid transparent',
      }
    }
  }
}

/** Glass circle used for filter/sort affordances (§1.2) — round, blurred, bordered. */
// ── Верхний зазор под чёлкой ────────────────────────────────────────────────
// Плавающая шапка не должна вставать вплотную к safe-area: на iPhone под ней
// сидит собственное размытие статус-бара, и контент, прижатый к самой границе,
// читается как «залез под чёлку». Один зазор на все мобильные экраны —
// MobileScreen и каркас тренажёра берут его отсюда.
export const MOBILE_TOP_GAP = 28
/** Полный отступ сверху: safe-area + зазор (в браузере без выреза — просто зазор). */
export const MOBILE_TOP_INSET = `calc(env(safe-area-inset-top, 0px) + ${MOBILE_TOP_GAP}px)`

// ── Нижний зазор над домашней полосой ───────────────────────────────────────
// ПОЧЕМУ КОНСТАНТА, А НЕ env(safe-area-inset-bottom).
//
// Живой env() врёт не только по величине, но и по времени: и Safari (нижняя
// панель на нелистающейся странице), и WKWebView (пока вебвью не пересчитал
// inset после первой прокрутки) какое-то время отдают больше, чем высота
// домашней полосы. Из-за этого док на «Главной» садился на глазах у ученика
// уже после загрузки — сначала висел высоко, потом опускался.
//
// Раньше это лечили замером: зонд, минимум за сессию, кэш в localStorage
// (модуль lib/bottomSafe.ts, теперь удалён). Пока вилка была широкой (26…34),
// замер имел смысл. Но сама зона домашней полосы (34pt) доку не нужна: полоса
// тонкая и нарисована в 8pt от края, плавающей таблетке хватает 20pt, чтобы её
// не задеть. С такой вилкой измерять стало нечего — число прибито намертво, и
// док не двигается НИ РАЗУ: ни на скелетоне, ни после прокрутки, ни между
// запусками.
//
// Устройства без домашней полосы от этого не страдают: 20pt — это просто
// «не липнуть к краю», ровно то, что там и нужно.
export const MOBILE_DOCK_EDGE = 20

export const glassCircle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  background: 'rgba(var(--glass-rgb), 0.78)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  border: '1px solid var(--color-border-glass)',
  boxShadow: 'var(--shadow-pill)',
  color: 'var(--color-text-2)',
}

// ── Tactility presets (re-export canon from feedback.ts; never use sound.ts on mobile) ──
export const JELLY_SPRING = { type: 'spring' as const, stiffness: 420, damping: 26 }
export const JELLY_EASE = [0.34, 1.46, 0.64, 1] as const
export const TAP_SCALE = 0.94
