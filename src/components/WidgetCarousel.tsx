import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import QuizWidget from './QuizWidget'
import StatsWidget from './StatsWidget'
import ScienceFactsWidget from './ScienceFactsWidget'
import ReactionsWidget from './ReactionsWidget'
import PomodoroWidget from './PomodoroWidget'
import MemesWidget from './MemesWidget'
import QuestionOfDayWidget from './QuestionOfDayWidget'
import TrainerProgressWidget from './TrainerProgressWidget'
import StickersWidget from './StickersWidget'
import { useDashboard } from '../store/dashboardStore'
import { useWidgetRelevance } from '../lib/widgetVisibility'
import { useT } from '../lib/i18n'

const WIDGETS = ['Статистика', 'Научные факты', 'Реакции', 'Фокус', 'Мемы', 'Вопрос дня'] as const
const COUNT = WIDGETS.length

// Off-screen slides sit well past the stage edge (130%) so the stage's
// shadow-friendly clip margin never reveals the neighbouring widget mid-swipe.
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '130%' : '-130%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? '-130%' : '130%', opacity: 0 }),
}

export default function WidgetCarousel({ columnsOverride }: { columnsOverride?: number } = {}) {
  const t = useT()
  const [[page, dir], setPage] = useState<[number, number]>([0, 0])
  const [dotsVisible, setDotsVisible] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // How many widget blocks sit in one row (set from the avatar settings menu).
  // `page` now indexes pages of `perPage` widgets rather than single widgets.
  // Mobile passes columnsOverride={1} → one full-width widget per page; desktop
  // omits it and keeps the user's stored column preference.
  const storeColumns = useDashboard(s => s.widgetColumns)
  const perPage = columnsOverride ?? storeColumns
  const rawOrder = useDashboard(s => s.widgetOrder)
  const hiddenWidgets = useDashboard(s => s.hiddenWidgets)
  // Два фильтра поверх сохранённого порядка, оба — только на показ:
  //   • teacher-enforced hard-hide (учитель убрал виджет этому ученику);
  //   • уместность (чужой предмет / пустой контент) — lib/widgetVisibility.ts.
  // Ни один не переписывает настройки ученика: сменится курс — виджет вернётся.
  const relevant = useWidgetRelevance()
  const widgetOrder = rawOrder.filter(id => !hiddenWidgets.includes(id) && relevant(id))
  // Page count follows the number of *visible* widgets (hidden ones are simply
  // absent from widgetOrder), so a hidden widget leaves no empty trailing page.
  const pageCount = Math.max(1, Math.ceil(widgetOrder.length / perPage))

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
  }, [])

  // Jump back to the first page whenever the column count or the set of visible
  // widgets changes, so the user always lands on a valid full row (never a stale
  // page index that now points past the end after hiding a widget).
  useEffect(() => {
    setPage([0, 0])
  }, [perPage, widgetOrder.length])

  // Keep the dots on screen while the user is flipping, hide them again once idle.
  const revealDots = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setDotsVisible(true)
  }, [])
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setDotsVisible(false), 1100)
  }, [])

  const goTo = (next: number, direction: number) => {
    // Wrap around both ends so the carousel loops infinitely.
    const wrapped = ((next % pageCount) + pageCount) % pageCount
    if (wrapped === page) return
    setPage([wrapped, direction])
    revealDots()
    scheduleHide()
  }
  const goLeft = () => goTo(page - 1, -1)
  const goRight = () => goTo(page + 1, 1)

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 120
    if (swipe < -80) goRight()
    else if (swipe > 80) goLeft()
    scheduleHide()
  }

  const renderWidget = (p: number, isActive: boolean) => {
    if (p === 6) return <QuizWidget active={isActive} columns={perPage} />
    if (p === 0) return <StatsWidget columns={perPage} />
    if (p === 7) return <TrainerProgressWidget columns={perPage} />
    if (p === 8) return <StickersWidget columns={perPage} />
    if (p === 1) return <ScienceFactsWidget active={isActive} columns={perPage} />
    if (p === 2) return <ReactionsWidget active={isActive} columns={perPage} />
    if (p === 3) return <PomodoroWidget columns={perPage} />
    if (p === 4) return <MemesWidget active={isActive} columns={perPage} />
    return <QuestionOfDayWidget active={isActive} columns={perPage} />
  }

  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * perPage
  const pageWidgets = widgetOrder.slice(start, start + perPage)

  return (
    <div className="widget-carousel relative" data-widget={page}>
      {/* Left nav */}
      <motion.button
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
        onClick={goLeft}
        style={{ y: '-50%' }}
        className="carousel-nav carousel-nav--left"
        aria-label={t('Предыдущий виджет')}
      >
        <ChevronLeft size={16} />
      </motion.button>

      {/* Stage — `clip` hides the neighbouring slides during a swipe, while
          `overflow-clip-margin` lets each card's soft shadow paint past the
          stage bounds instead of being cut off flush at the edges. */}
      <div
        className="relative h-full w-full"
        style={{ overflow: 'clip', overflowClipMargin: '56px' }}
      >
        <AnimatePresence custom={dir} initial={false}>
          <motion.div
            key={page}
            custom={dir}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: { type: 'spring', stiffness: 320, damping: 34 }, opacity: { duration: 0.2 } }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragStart={revealDots}
            onDragEnd={onDragEnd}
            className="absolute inset-0 flex"
            style={{ gap: 16 }}
          >
            {pageWidgets.map(idx => (
              <div
                key={idx}
                style={{
                  flex: pageWidgets.length < perPage
                    ? '1 1 0'
                    : `0 0 calc((100% - ${(perPage - 1) * 16}px) / ${perPage})`,
                  minWidth: 0,
                  height: '100%',
                }}
              >
                {renderWidget(idx, true)}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right nav */}
      <motion.button
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
        onClick={goRight}
        style={{ y: '-50%' }}
        className="carousel-nav carousel-nav--right"
        aria-label={t('Следующий виджет')}
      >
        <ChevronRight size={16} />
      </motion.button>

      {/* Dots — hidden while idle, revealed while flipping */}
      <div
        className="absolute left-1/2 z-30 flex -translate-x-1/2 items-center gap-2"
        style={{
          bottom: -18,
          opacity: dotsVisible ? 1 : 0,
          pointerEvents: dotsVisible ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      >
        {Array.from({ length: pageCount }, (_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > page ? 1 : -1)}
            aria-label={`${t('Страница')} ${i + 1}`}
            className="cursor-pointer"
            style={{
              width: i === page ? 22 : 7,
              height: 7,
              borderRadius: 999,
              background: i === page ? 'var(--color-accent)' : 'var(--color-text-4)',
              transition: 'width 0.3s ease, background 0.3s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}
