import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { courseReactionInterval } from '../data/mockData'
import { useStudentData } from '../store/studentDataStore'
import { getWidgetSizing } from '../lib/widgetSizing'
import { useDashboard } from '../store/dashboardStore'
import { useT } from '../lib/i18n'

type Props = {
  /** true while this widget is the visible one — pauses rotation otherwise */
  active: boolean
  /** how many widget blocks share the row — shrinks the tile + type when >1 */
  columns?: number
}

export default function ReactionsWidget({ active, columns = 1 }: Props) {
  const t = useT()
  const [index, setIndex] = useState(0)
  const openLessonForReaction = useDashboard(s => s.openLessonForReaction)
  const courseReactions = useStudentData(s => s.courseReactions)

  const reaction = courseReactions[index]
  const sz = getWidgetSizing(columns)

  if (!reaction) return (
    <div className="flex h-full w-full items-center justify-center flex-col gap-2 overflow-hidden rounded-[24px]"
      style={{ background: 'rgba(var(--glass-rgb), 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--color-border-glass)' }}>
      <span style={{ fontSize: 26 }}>⚗️</span>
      <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-2)' }}>{t('Реакции курса')}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-5)' }}>—</span>
    </div>
  )

  const openLesson = () => openLessonForReaction(reaction.id)

  const goTo = (i: number) => {
    setIndex(((i % courseReactions.length) + courseReactions.length) % courseReactions.length)
  }

  // Auto-advance to the next reaction every `courseReactionInterval` seconds.
  // Pauses while the widget is swiped off-screen; restarts on manual nav.
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => goTo(index + 1), courseReactionInterval * 1000)
    return () => clearTimeout(id)
  }, [active, index])

  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-[24px]"
      style={{
        background: 'rgba(var(--glass-rgb), 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--color-border-glass)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      {/* Emoji tile — also a click target, opens the lesson with the reaction's
         paragraph highlighted. */}
      <div
        role="button"
        aria-label={`${t('Открыть урок')} «${reaction.lesson}»`}
        onClick={openLesson}
        className="relative flex-shrink-0 cursor-pointer"
        style={{
          width: sz.mediaWidth,
          minWidth: sz.mediaMin,
          maxWidth: sz.mediaMax,
          padding: 8,
        }}
      >
        {/* Ремоунт по key, без AnimatePresence: `mode="wait"` умеет навсегда
            залипнуть (сигнал «выход завершён» теряется — см. onExit в
            AnimatePresence/index.mjs), и лента встала бы пустой до F5.
            Здесь ключи не повторяются, само не вылечится. Анимация только
            входа — ждать выхода незачем. */}
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute flex items-center justify-center"
            style={{ inset: 8, background: reaction.gradient, borderRadius: 18, overflow: 'hidden' }}
          >
            {/* readability scrim */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(0,0,0,0.04), rgba(0,0,0,0.24))' }} />
            <motion.span
              key={`${reaction.id}-emoji`}
              initial={{ scale: 0.6, rotate: -10, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
              style={{ fontSize: 60 * sz.scale, lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}
            >
              {reaction.emoji}
            </motion.span>
          </motion.div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ padding: `${sz.padY}px ${sz.padX}px` }}>
        <div className="mb-2 flex items-center gap-3">
          <span
            style={{
              fontSize: 12 * sz.scale, fontWeight: 650, lineHeight: 1, padding: '5px 12px', borderRadius: 999,
              color: 'var(--color-blue-pill-text)', background: 'var(--color-blue-pill-bg)',
            }}
          >
            {t('Химия · реакция курса')}
          </span>
        </div>

        <div
          role="button"
          aria-label={`${t('Открыть урок')} «${reaction.lesson}»`}
          onClick={openLesson}
          className="flex flex-1 flex-col justify-center cursor-pointer"
          style={{ gap: 6 }}
        >
          {/* Ремоунт по key — причина та же, что у картинки выше. */}
            <motion.div
              key={reaction.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p
                style={{
                  fontSize: 21 * sz.scale, fontWeight: 700, lineHeight: 1.25, color: 'var(--color-text)',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '0.01em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
              >
                {reaction.equation}
              </p>
              <p style={{ fontSize: 13 * sz.scale, fontWeight: 500, color: 'var(--color-muted)', marginTop: 4 }}>
                {reaction.name} · <span
                  style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'underline', textDecorationColor: 'rgba(123,97,255,0.4)', textUnderlineOffset: 3 }}
                >{t('Урок')} «{reaction.lesson}»</span>
              </p>
            </motion.div>
        </div>

        {/* Reaction dots */}
        <div className="mt-2 flex items-center gap-2">
          {courseReactions.map((r, i) => (
            <button
              key={r.id}
              onClick={() => goTo(i)}
              aria-label={`${t('Реакция')} ${i + 1}`}
              className="cursor-pointer"
              style={{
                width: i === index ? 28 : 10,
                height: 10,
                borderRadius: 999,
                background: i === index ? 'var(--color-accent)' : 'var(--color-border-medium)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
