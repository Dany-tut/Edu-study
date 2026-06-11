import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { scienceFactInterval } from '../data/mockData'
import { useStudentData } from '../store/studentDataStore'
import { getWidgetSizing } from '../lib/widgetSizing'
import { subjectTheme } from '../lib/theme'

type Props = {
  /** true while this widget is the visible one — pauses rotation otherwise */
  active: boolean
  /** how many widget blocks share the row — shrinks the photo + type when >1 */
  columns?: number
}

export default function ScienceFactsWidget({ active, columns = 1 }: Props) {
  const [index, setIndex] = useState(0)
  const [imgFailed, setImgFailed] = useState(false)
  const scienceFacts = useStudentData(s => s.scienceFacts)

  const fact = scienceFacts[index]
  const sz = getWidgetSizing(columns)

  if (!fact) return (
    <div className="flex h-full w-full items-center justify-center flex-col gap-2 overflow-hidden rounded-[24px]"
      style={{ background: 'rgba(var(--glass-rgb), 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--color-border-glass)' }}>
      <span style={{ fontSize: 26 }}>🔬</span>
      <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text-2)' }}>Научные факты</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-5)' }}>—</span>
    </div>
  )

  const goTo = (i: number) => {
    setIndex(((i % scienceFacts.length) + scienceFacts.length) % scienceFacts.length)
    setImgFailed(false)
  }

  // Auto-advance to the next fact every `scienceFactInterval` seconds. Pauses
  // while the widget is swiped off-screen; the timer restarts on manual nav.
  useEffect(() => {
    if (!active) return
    const id = setTimeout(() => goTo(index + 1), scienceFactInterval * 1000)
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
      {/* Photo tile — rounded with slight inset from the card edge */}
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
            key={fact.id}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute"
            style={{ inset: 8, background: fact.gradient, borderRadius: 18, overflow: 'hidden' }}
          >
            {!imgFailed && (
              <img
                src={fact.image}
                alt=""
                onError={() => setImgFailed(true)}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            )}
            {/* readability scrim */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(0,0,0,0.05), rgba(0,0,0,0.28))' }} />
            <span style={{ position: 'absolute', left: 16, bottom: 12, fontSize: 38 * sz.scale, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}>
              {fact.emoji}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col" style={{ padding: `${sz.padY}px ${sz.padX}px` }}>
        <div className="mb-2 flex items-center gap-3">
          <span
            style={{
              fontSize: 12 * sz.scale, fontWeight: 650, lineHeight: 1, padding: '5px 12px', borderRadius: 999,
              color: subjectTheme(fact.subject).text,
              background: subjectTheme(fact.subject).soft,
            }}
          >
            {fact.subject} · научный факт
          </span>
        </div>

        <div className="flex flex-1 items-center" style={{ minHeight: 0 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={fact.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontSize: 17 * sz.scale, fontWeight: 550, lineHeight: sz.bodyLeading, color: 'var(--color-text)',
                display: '-webkit-box', WebkitLineClamp: sz.clampLines, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {fact.text}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Fact dots */}
        <div className="mt-2 flex items-center gap-2">
          {scienceFacts.map((f, i) => (
            <button
              key={f.id}
              onClick={() => goTo(i)}
              aria-label={`Факт ${i + 1}`}
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
