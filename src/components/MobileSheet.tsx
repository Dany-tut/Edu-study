import { motion, AnimatePresence, useMotionValue, useDragControls } from 'framer-motion'
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react'

// Bottom sheet (MOBILE ONLY). Slides up from the bottom, glass surface, drag
// handle, optional title. Backdrop tap closes. Drag the handle (or sheet body)
// down to dismiss — the gesture is captured by the sheet so the page behind
// never rubber-band-scrolls. Content scrolls with contained overscroll.
export default function MobileSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  // Only the handle/header initiates the drag, so inner scrolling still works.
  const startDrag = (e: ReactPointerEvent) => dragControls.start(e)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.35)' }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              y,
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 81,
              background: 'rgba(var(--glass-rgb), 0.98)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              maxHeight: '85dvh',
              display: 'flex', flexDirection: 'column',
            }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              // Dismiss on a decisive downward flick or a long pull.
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
          >
            {/* Grabber + header — the drag handle. touch-action:none keeps the
                page behind from scrolling while you pull the sheet. */}
            <div
              onPointerDown={startDrag}
              style={{ flexShrink: 0, cursor: 'grab', touchAction: 'none', paddingBottom: 2 }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-bg-5)' }} />
              </div>
              {title && (
                <div style={{ padding: '4px 20px 10px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                  {title}
                </div>
              )}
            </div>
            <div
              className="no-scrollbar"
              style={{
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                padding: '10px 20px 8px',
                // Content melts under the grabber/header instead of hard-cutting:
                // the top edge fades out as rows scroll up to it. paddingTop above
                // keeps the first row at full opacity while at rest.
                maskImage: 'linear-gradient(to bottom, transparent 0, black 12px)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, black 12px)',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
