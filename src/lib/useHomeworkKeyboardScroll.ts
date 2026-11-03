import { useLayoutEffect, useRef } from 'react'

/** Lock only the single-question flow; dismissing a keyboard never resets a list. */
export function useHomeworkKeyboardScroll(
  isMobile: boolean,
  keyboardOpen: boolean,
  flowMode: boolean,
  flowFinished: boolean,
  flowStep: number,
) {
  const currentStep = useRef(flowStep)
  currentStep.current = flowStep
  useLayoutEffect(() => {
    if (!isMobile || !keyboardOpen || !flowMode || flowFinished) return
    const el =
      document.querySelector<HTMLElement>('[data-homework-scroll]') ??
      document.querySelector<HTMLElement>('.dashboard-main')
    if (!el) return
    const lockedStep = currentStep.current
    const top = el.scrollTop
    const previous = el.style.overflowY
    el.style.overflowY = 'hidden'
    return () => {
      el.style.overflowY = previous
      // An explicit next/previous task owns its reset; keyboard cleanup must
      // not restore the previous task's reading position over that navigation.
      if (currentStep.current === lockedStep) el.scrollTop = top
    }
  }, [isMobile, keyboardOpen, flowMode, flowFinished])
}

/** Reset only for an explicit flow step; works while its keyboard lock is held. */
export function scrollHomeworkFlowToStart(card: HTMLElement | null) {
  let node = card?.parentElement ?? document.querySelector<HTMLElement>('[data-homework-scroll]')
  while (node) {
    if (
      node.hasAttribute('data-homework-scroll') ||
      (node.scrollHeight > node.clientHeight + 1 &&
        /auto|scroll/.test(getComputedStyle(node).overflowY))
    ) {
      node.scrollTo({ top: 0 })
      return
    }
    node = node.parentElement
  }
  window.scrollTo({ top: 0 })
}
