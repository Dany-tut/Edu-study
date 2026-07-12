import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, MessageSquare } from 'lucide-react'
import type { Lesson } from '../data/mockData'
import { useT } from '../lib/i18n'

interface Props {
  lesson: Lesson | null
  onClose: () => void
}

export default function MobileLessonSheet({ lesson, onClose }: Props) {
  const t = useT()
  return (
    <AnimatePresence>
      {lesson && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          />
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
            style={{ borderRadius: '32px 32px 0 0' }}
          >
            <div
              className="p-6"
              style={{
                background: 'rgba(var(--glass-rgb), 0.98)',
                borderRadius: '32px 32px 0 0',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 24px)',
                boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
              }}
            >
              {/* Handle */}
              <div className="flex justify-center mb-4">
                <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--color-bg-5)' }} />
              </div>
              <div className="flex items-center justify-between mb-4">
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {t('Урок')}
                </span>
                <button onClick={onClose} className="cursor-pointer">
                  <X size={20} style={{ color: 'var(--color-muted)' }} />
                </button>
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 650, color: 'var(--color-text)', marginBottom: 16 }}>
                {t('Занятие')} #{lesson.number + 1} {lesson.title}
              </h3>
              {lesson.points != null && (
                <p style={{ fontSize: 16, color: 'var(--color-muted)', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{lesson.points}</span> {t('баллов')}
                </p>
              )}
              {lesson.comment && (
                <p className="px-4 py-3 rounded-2xl mb-4 flex items-start gap-2" style={{ background: 'var(--color-yellow-soft)', color: 'var(--color-yellow-text)', fontSize: 14 }}>
                  <MessageSquare size={16} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{lesson.comment}</span>
                </p>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="mt-2 w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold cursor-pointer"
                style={{
                  background: 'var(--grad-purple)',
                  color: 'white',
                  fontSize: 16,
                  minHeight: 56,
                }}
              >
                {t('Открыть урок')}
                <ChevronRight size={16} />
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
