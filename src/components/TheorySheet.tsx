// ─────────────────────────────────────────────────────────────────────────────
// Конспект урока прямо в решателе домашки.
//
// ЗАЧЕМ. Конспект живёт на странице урока, а домашка — отдельный экран. Ученик,
// споткнувшийся на 을/를 посреди пятнадцати заданий, должен был выйти из
// домашки, найти нужный абзац и вернуться — на практике он просто угадывал.
// Это то, что у LingoDeer называется Learning Tips: правило доступно из любого
// места, не выходя из упражнения.
//
// ПОЧЕМУ ШТОРКА, А НЕ ВТОРАЯ КОПИЯ ТЕКСТА НА СТРАНИЦЕ. Конспект длинный: вшитый
// в начало домашки, он отодвинул бы задания за экран, и открывать домашку стало
// бы дольше. Шторка достаётся по кнопке и закрывается там же, где ученик
// остановился, — позиция прокрутки заданий не теряется.
//
// Источник — те же LessonParagraph, что рисует страница урока: отдельного
// «краткого правила» не заводим, иначе учителю пришлось бы писать текст дважды.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X } from 'lucide-react'
import type { LessonParagraph } from '../data/lessonContent'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useT } from '../lib/i18n'

export default function TheorySheet({ open, onClose, lessonTitle, paragraphs, accent, soft }: {
  open: boolean
  onClose: () => void
  lessonTitle: string
  paragraphs: LessonParagraph[]
  accent: string
  soft: string
}) {
  const t = useT()
  const isDesktop = useIsDesktop()

  // Escape закрывает — шторка перекрывает задания, и выход должен быть без мыши.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Портал в body обязателен, а не косметика: шторка живёт внутри решателя
  // домашки, а у того в предках есть трансформируемые motion-обёртки. Для
  // position: fixed трансформированный предок становится системой координат —
  // панель вставала не в правый край экрана, а в правый край этого предка и
  // уезжала за границу окна вместе с текстом.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="theory-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 200 }}
          />
          {/* Панель появляется прозрачностью, а не выездом. Выезд задавался
              трансформом в процентах (x: '100%'), и на этой связке framer 11 +
              React 19 он застревал в начальной точке: шторка оставалась за
              краем экрана вместе с текстом. Прозрачность здесь отрабатывает
              честно — ей нечего измерять. */}
          <motion.aside
            key="theory-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'fixed', zIndex: 201,
              display: 'flex', flexDirection: 'column',
              background: 'rgba(var(--glass-rgb), 0.98)',
              backdropFilter: 'blur(18px) saturate(180%)',
              WebkitBackdropFilter: 'blur(18px) saturate(180%)',
              ...(isDesktop
                ? {
                  top: 0, right: 0, bottom: 0, width: 'min(520px, 92vw)',
                  borderLeft: '1px solid var(--color-border-glass)',
                }
                : {
                  left: 0, right: 0, bottom: 0, maxHeight: '82vh',
                  borderTopLeftRadius: 26, borderTopRightRadius: 26,
                  borderTop: '1px solid var(--color-border-glass)',
                  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                }),
            }}
          >
            <header
              className="flex items-center flex-shrink-0"
              style={{
                gap: 10, padding: '18px 20px',
                borderBottom: '1px solid var(--color-border-soft)',
              }}
            >
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 11, background: soft, color: accent, flexShrink: 0,
              }}>
                <BookOpen size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span style={{ display: 'block', fontSize: 15, fontWeight: 750, color: 'var(--color-text)' }}>
                  {t('Правило урока')}
                </span>
                <span className="truncate" style={{ display: 'block', fontSize: 12, color: 'var(--color-muted)' }}>
                  {lessonTitle}
                </span>
              </span>
              <button
                onClick={onClose}
                aria-label={t('Закрыть')}
                className="flex items-center justify-center cursor-pointer flex-shrink-0"
                style={{
                  width: 32, height: 32, borderRadius: 11, border: '1px solid var(--color-border-soft)',
                  background: 'transparent', color: 'var(--color-muted)',
                }}
              >
                <X size={16} />
              </button>
            </header>

            <div
              className="flex flex-col"
              style={{ gap: 14, padding: '18px 20px 28px', overflowY: 'auto' }}
            >
              {paragraphs.map(p => p.image ? (
                <figure key={p.id} style={{ margin: 0 }}>
                  <img
                    src={p.image}
                    alt=""
                    style={{
                      display: 'block', width: '100%', borderRadius: 14,
                      border: '1px solid var(--color-border)', background: '#fff',
                    }}
                  />
                  {p.text && (
                    <figcaption style={{ marginTop: 6, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.45 }}>
                      {p.text}
                    </figcaption>
                  )}
                </figure>
              ) : (
                <p key={p.id} style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)', fontWeight: 450, whiteSpace: 'pre-wrap' }}>
                  {p.text}
                </p>
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
