import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'

// Bottom sheet (MOBILE ONLY). Slides up from the bottom, glass surface, drag
// handle, optional title. Backdrop tap closes. Content scrolls with contained
// overscroll; inline-expanding fields (FilterField) push content, never clipped.
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
              position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 81,
              background: 'rgba(var(--glass-rgb), 0.98)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
              maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-bg-5)' }} />
            </div>
            {title && (
              <div style={{ padding: '4px 20px 10px', fontSize: 17, fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>
                {title}
              </div>
            )}
            <div
              className="no-scrollbar"
              style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 20px 8px' }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
