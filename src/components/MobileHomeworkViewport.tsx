import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { useOverlayScroll } from './teacher/OverlayScroll'
import { MOBILE_TOP_INSET } from '../lib/mobileTokens'
import { useKeyboardOpen } from '../lib/useKeyboardInset'
import { useDashboard } from '../store/dashboardStore'

const HomeworkViewportContext = createContext(false)

/** Fixed controls must stay outside the scrolling content's alpha mask. */
export function HomeworkViewportChrome({
  children,
  bottom = false,
}: {
  children: ReactNode
  bottom?: boolean
}) {
  const viewport = useContext(HomeworkViewportContext)
  return viewport
    ? createPortal(
        <div
          data-homework-chrome={bottom ? 'bottom' : 'overlay'}
          style={{ display: 'contents' }}
        >
          {children}
        </div>,
        document.body,
      )
    : children
}

/** One phone scroll surface for the complete homework; desktop keeps its pane. */
export default function MobileHomeworkViewport({
  children,
}: {
  children: ReactNode
}) {
  const { ref, fade, onScroll } = useOverlayScroll()
  const keyboardOpen = useKeyboardOpen()
  const [clearance, setClearance] = useState(110)
  const measureRef = useRef<() => void>(() => {})
  useLayoutEffect(() => {
    const scroller = ref.current
    if (!scroller) return
    const observer = new ResizeObserver(() => measure())
    const measure = () => {
      const bottom = scroller.getBoundingClientRect().bottom
      let height = keyboardOpen ? 0 : 110
      document
        .querySelectorAll<HTMLElement>(
          '[data-homework-chrome="bottom"] > *, [data-homework-bottom]',
        )
        .forEach((panel) => {
          observer.observe(panel)
          const box = panel.getBoundingClientRect()
          if (box.height > 0 && getComputedStyle(panel).display !== 'none')
            height = Math.max(height, bottom - box.top)
        })
      setClearance((previous) =>
        previous === Math.ceil(height) ? previous : Math.ceil(height),
      )
    }
    measureRef.current = measure
    measure()
    observer.observe(scroller)
    const mutation = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.type === 'childList' ||
            (record.target instanceof HTMLElement &&
              record.target.matches(
                '[data-homework-chrome="bottom"] > *, [data-homework-bottom]',
              )),
        )
      )
        measure()
    })
    mutation.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      mutation.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, keyboardOpen])
  // The top ramp occupies only initial empty padding: no state-dependent first frame.
  const top = `calc(${MOBILE_TOP_INSET} + 48px)`
  const mask =
    fade.top > 0 || fade.bottom > 0
      ? `linear-gradient(to bottom, transparent 0px, transparent calc(${top} - 24px), #000 ${top}, #000 max(${top}, calc(100% - ${clearance + 48}px)), rgba(0,0,0,${1 - fade.bottom}) calc(100% - ${clearance}px), rgba(0,0,0,${1 - fade.bottom}) 100%)`
      : undefined
  return (
    <HomeworkViewportContext.Provider value>
      <div
        style={{
          height: '100dvh',
          background: 'var(--color-bg)',
          overflow: 'hidden',
        }}
      >
        <div
          ref={ref}
          data-mobile-scroll
          data-homework-scroll
          className="no-scrollbar"
          onScroll={(event) => {
            onScroll()
            measureRef.current()
            useDashboard
              .getState()
              .setLessonScrolled(event.currentTarget.scrollTop > 64)
          }}
          style={{
            height: '100%',
            boxSizing: 'border-box',
            overflowY: 'auto',
            overflowX: 'clip',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
            paddingTop: top,
            paddingLeft: 16,
            paddingRight: 16,
            paddingBottom: clearance + 48,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        >
          {children}
        </div>
      </div>
    </HomeworkViewportContext.Provider>
  )
}
