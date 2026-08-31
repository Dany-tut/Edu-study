import { useEffect, useRef, useState, type RefObject } from 'react'
import { haptic, tactile } from './feedback'

// ─────────────────────────────────────────────────────────────────────────────
// usePullRefresh — тяга сверху для обновления экрана
//
// Жест берётся только с самого верха прокрутки и только если палец пошёл ВНИЗ
// заметнее, чем вбок: по ленте тем же движением водят рубрики
// (MobileFeedRubrics, useRubricSwipe), и два смысла на одном касании — это
// экран, который делает не то, что просили.
//
// СОПРОТИВЛЕНИЕ. Палец и лента не едут один к одному: за порогом каждый
// следующий пиксель даётся вдвое дороже. Без этого лента улетала бы на пол-
// экрана и жест переставал быть «потянул и отпустил».
//
// ПОРОГ ЗАЩЁЛКИВАЕТСЯ ОДИН РАЗ. Прошли — щелчок и печать собрана; повели
// палец назад, не отпуская, — обратно она не разбирается. Иначе на дрожащей
// руке знак мигал бы туда-сюда у самой границы.
// ─────────────────────────────────────────────────────────────────────────────

/** Сколько тянуть до щелчка (px пути пальца после сопротивления). */
export const PULL_THRESHOLD = 72
/** Дальше порога лента почти не едет — только показывает, что предел есть. */
const MAX_PULL = 104
/** Печать держится хотя бы столько, даже если данные приехали мгновенно. */
const MIN_HOLD = 620

export type PullState = {
  /** Насколько лента отъехала вниз, px. */
  pull: number
  /** Порог пройден. */
  locked: boolean
  /** Идёт обновление. */
  busy: boolean
}

export function usePullRefresh(
  ref: RefObject<HTMLElement | null>,
  onRefresh?: () => void | Promise<void>,
): PullState {
  const [state, setState] = useState<PullState>({ pull: 0, locked: false, busy: false })
  const cb = useRef(onRefresh)
  cb.current = onRefresh

  useEffect(() => {
    const el = ref.current
    if (!el || !onRefresh) return

    let startY = 0
    let startX = 0
    let active = false
    let decided = false
    let locked = false
    let busy = false

    const reset = () => {
      active = false; decided = false; locked = false
      setState({ pull: 0, locked: false, busy: false })
    }

    const down = (e: TouchEvent) => {
      if (busy || el.scrollTop > 0 || e.touches.length !== 1) return
      startY = e.touches[0].clientY
      startX = e.touches[0].clientX
      active = true
      decided = false
    }

    const move = (e: TouchEvent) => {
      if (!active || busy) return
      const dy = e.touches[0].clientY - startY
      const dx = e.touches[0].clientX - startX
      if (!decided) {
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return
        // Вбок — это рубрики, вверх — обычная прокрутка. Наш только один жест.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) * 0.8) { active = false; return }
        decided = true
      }
      // Прокрутка уехала вниз, пока палец был на экране — жест отменяется.
      if (el.scrollTop > 0) { reset(); return }
      const eased = dy <= PULL_THRESHOLD
        ? dy
        : PULL_THRESHOLD + (dy - PULL_THRESHOLD) * 0.35
      const pull = Math.min(eased, MAX_PULL)
      if (!locked && pull >= PULL_THRESHOLD) {
        locked = true
        // Щелчок печати: короткий и сухой, как удар штемпеля.
        haptic([10, 20, 8])
        tactile({ freq: 340 })
      }
      setState({ pull, locked, busy: false })
    }

    const up = () => {
      if (!active || busy) { active = false; return }
      active = false
      if (!locked) { reset(); return }
      busy = true
      setState({ pull: PULL_THRESHOLD, locked: true, busy: true })
      const started = Date.now()
      Promise.resolve(cb.current?.()).finally(() => {
        const wait = Math.max(0, MIN_HOLD - (Date.now() - started))
        window.setTimeout(() => { busy = false; reset() }, wait)
      })
    }

    el.addEventListener('touchstart', down, { passive: true })
    el.addEventListener('touchmove', move, { passive: true })
    el.addEventListener('touchend', up, { passive: true })
    el.addEventListener('touchcancel', up, { passive: true })
    return () => {
      el.removeEventListener('touchstart', down)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', up)
      el.removeEventListener('touchcancel', up)
    }
  }, [ref, !!onRefresh])

  return state
}
