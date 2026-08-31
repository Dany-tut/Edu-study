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

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, X } from 'lucide-react'
import type { LessonParagraph } from '../data/lessonContent'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useT } from '../lib/i18n'
import { tidyProse, proseWrap } from '../lib/typography'
import Prose from './Prose'
import GlossedText from './GlossedText'

export default function TheorySheet({ open, onClose, lessonId, lessonTitle, paragraphs, accent, soft, lang, glossSubject }: {
  open: boolean
  onClose: () => void
  /** Урок, чей конспект показан: тот же id, что на странице урока. */
  lessonId?: string
  lessonTitle: string
  paragraphs: LessonParagraph[]
  accent: string
  soft: string
  /**
   * Язык материала: правило разбирается по словам ровно так же, как конспект на
   * странице урока (см. LessonPage). Без языка — обычный текст.
   */
  lang?: string
  /** Предмет для кнопки «В словарь» в разборе слова. */
  glossSubject?: string
}) {
  const t = useT()
  const isDesktop = useIsDesktop()

  // Фейды на краях прокрутки. Правило почти всегда длиннее шторки, а обрыв
  // текста ровно по краю панели читается как «здесь всё» — ученик не листает
  // и не доходит до стяжений. Фейд рисуем стеклом самой шторки
  // (--glass-rgb), а не белым: белая растушёвка в тёмной теме невидима.
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [fade, setFade] = useState({ top: false, bottom: false })
  const syncFade = () => {
    const el = scrollRef.current
    if (!el) return
    const top = el.scrollTop > 4
    const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4
    setFade(prev => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
  }
  // Пересчёт после открытия: до вставки в DOM высоты ещё нет, и нижний фейд
  // не появился бы, пока ученик не тронет прокрутку.
  useEffect(() => {
    if (!open) return
    syncFade()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(syncFade)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open, paragraphs])

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
          {/* Панель появляется прозрачностью, а не выездом сбоку.
              Дело в отказоустойчивости: если анимация не доиграет (в превью
              Claude requestAnimationFrame не тикает вовсе, и framer замирает на
              полпути), застрявшая прозрачность оставит шторку читаемой, а
              застрявший transform: translateX(100%) удержит её за краем экрана
              — то есть выглядит как «кнопка не работает». */}
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

            <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
            <div
              ref={scrollRef}
              onScroll={syncFade}
              className="flex flex-col flex-1"
              style={{ gap: 14, padding: '18px 20px 28px', overflowY: 'auto', minHeight: 0 }}
            >
              {paragraphs.map(p => p.image ? (
                <figure key={p.id} style={{ margin: 0 }}>
                  <img
                    src={p.image}
                    alt=""
                    style={{
                      // Все схемы одной ширины — во всю шторку. Натуральная
                      // ширина давала соседние листы разного размера: рядом это
                      // читается как сломанная вёрстка, а не как разные схемы.
                      display: 'block', width: '100%', margin: '0 auto',
                      borderRadius: 14,
                      border: '1px solid var(--color-border)', background: '#fff',
                    }}
                  />
                  {p.text && (
                    <figcaption style={{ marginTop: 6, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.45, ...proseWrap }}>
                      <Prose text={p.text} />
                    </figcaption>
                  )}
                </figure>
              ) : lang ? (
                <GlossedText
                  key={p.id}
                  text={tidyProse(p.text)}
                  lang={lang}
                  accent={accent}
                  subject={glossSubject}
                  style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)', fontWeight: 450 }}
                />
              ) : (
                <p key={p.id} style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)', fontWeight: 450, whiteSpace: 'pre-wrap', ...proseWrap }}>
                  <Prose text={p.text} />
                </p>
              ))}
            </div>
              <div
                aria-hidden
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 28,
                  background: 'linear-gradient(to bottom, rgba(var(--glass-rgb), 0.98), rgba(var(--glass-rgb), 0))',
                  opacity: fade.top ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: 'none',
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 36,
                  background: 'linear-gradient(to top, rgba(var(--glass-rgb), 0.98), rgba(var(--glass-rgb), 0))',
                  opacity: fade.bottom ? 1 : 0, transition: 'opacity 0.15s', pointerEvents: 'none',
                }}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
