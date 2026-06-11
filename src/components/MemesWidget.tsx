import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { scienceMemeInterval } from '../data/mockData'
import { useStudentData } from '../store/studentDataStore'
import { getWidgetSizing } from '../lib/widgetSizing'
import { subjectTheme } from '../lib/theme'

type Props = {
  /** true while this widget is the visible one — pauses rotation otherwise */
  active: boolean
  /** how many widget blocks share the row — shrinks the tile + type when >1 */
  columns?: number
}

export default function MemesWidget({ active, columns = 1 }: Props) {
  const [index, setIndex] = useState(0)
  const scienceMemes = useStudentData(s => s.scienceMemes)

  const meme = scienceMemes[index]
  const sz = getWidgetSizing(columns)

  const goTo = (i: number) => {
    setIndex(((i % scienceMemes.length) + scienceMemes.length) % scienceMemes.length)
  }

  // Auto-advance to the next meme every `scienceMemeInterval` seconds. Pauses
  // while the widget is swiped off-screen; the timer restarts on manual nav.
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => goTo(index + 1), scienceMemeInterval * 1000)
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
      {/* Emoji tile — rounded with slight inset from the card edge */}
      <div
        className="relative flex-shrink-0"
        style={{
          width: sz.mediaWidth,
          minWidth: sz.mediaMin,
          maxWidth: sz.mediaMax,
          padding: 8,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={meme.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute flex items-center justify-center"
            style={{ inset: 8, background: meme.gradient, borderRadius: 18, overflow: 'hidden' }}
          >
            {/* readability scrim */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(0,0,0,0.04), rgba(0,0,0,0.22))' }} />
            <motion.span
              key={`${meme.id}-emoji`}
              initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
              style={{ fontSize: 64 * sz.scale, lineHeight: 1, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.3))' }}
            >
              {meme.emoji}
            </motion.span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ padding: `${sz.padY}px ${sz.padX}px` }}>
        <div className="mb-2 flex items-center gap-3">
          <span
            style={{
              fontSize: 12 * sz.scale, fontWeight: 650, lineHeight: 1, padding: '5px 12px', borderRadius: 999,
              color: subjectTheme(meme.subject).text,
              background: subjectTheme(meme.subject).soft,
            }}
          >
            {meme.subject} · мем
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center" style={{ gap: 8 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={meme.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <p style={{
                fontSize: 13 * sz.scale, fontWeight: 500, color: '#9A9AA0', lineHeight: 1.35, marginBottom: 6,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {meme.setup}
              </p>
              <p style={{
                fontSize: 20 * sz.scale, fontWeight: 650, lineHeight: 1.3, color: 'var(--color-text)',
                display: '-webkit-box', WebkitLineClamp: sz.clampLines, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {meme.punchline}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Meme dots */}
        <div className="mt-2 flex items-center gap-2">
          {scienceMemes.map((m, i) => (
            <button
              key={m.id}
              onClick={() => goTo(i)}
              aria-label={`Мем ${i + 1}`}
              className="cursor-pointer"
              style={{
                width: i === index ? 28 : 10,
                height: 10,
                borderRadius: 999,
                background: i === index ? '#7B61FF' : '#D4D4D8',
                transition: 'width 0.3s ease, background 0.3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
