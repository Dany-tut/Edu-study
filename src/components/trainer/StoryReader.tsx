// ─────────────────────────────────────────────────────────────────────────────
// Рассказ о языке: витрина глав и карточная читалка
//
// ПОЧЕМУ КАРТОЧКАМИ, А НЕ СТРАНИЦЕЙ ТЕКСТА. Объяснение «почему язык такой» —
// это не справка, за которой приходят, а то, что читают один раз подряд. Такой
// текст, вывешенный простыней, дочитывают до третьего абзаца: глаз не видит
// конца, и каждый следующий абзац стоит усилия. Карточка показывает ровно один
// шаг мысли и обещает, что шагов конечное число, — полоска сверху это обещание
// и выполняет.
//
// ПОЧЕМУ МОЖНО НАЗАД. Читалка с одной кнопкой «Дальше» — это презентация, а не
// чтение: не понял карточку — потерял главу. Шаг назад стоит одну кнопку и
// снимает весь этот страх.
//
// ДОКУДА ДОЧИТАНО — ПЕРЕЖИВАЕТ УХОД. Глава на семь карточек не всегда читается
// за один заход, и возвращать человека в начало каждый раз — надёжный способ
// добиться, чтобы он до конца не дошёл никогда. Позиция хранится по ключу
// главы (см. usePersistentState) и восстанавливается вместе с ней.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, BookOpen, Check } from 'lucide-react'
import type { StoryChapter, LanguageStory } from '../../data/languageStory'
import { useT } from '../../lib/i18n'
import { proseWrap, bindShortWords } from '../../lib/typography'
import { usePersistentState } from '../../lib/useDraft'
import { Tile, TileGrid, TileMeter, TileChip } from './TrainerShell'

/** Витрина глав. */
export function StoryGrid({ story, read, accent, soft, onOpen }: {
  story: LanguageStory
  /** Докуда дочитана глава: id → номер последней открытой карточки, 0-based. */
  read: (id: string) => number
  accent: string
  soft: string
  onOpen: (id: string) => void
}) {
  const t = useT()
  return (
    <TileGrid min={248}>
      {story.chapters.map((ch, i) => {
        const at = read(ch.id)
        const done = at >= ch.cards.length - 1
        return (
          <Tile key={ch.id} accent={accent} onClick={() => onOpen(ch.id)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{t('Глава')} {i + 1}</TileChip>
              <TileChip>{ch.cards.length} {t('карточек')}</TileChip>
              {done && (
                <TileChip tone="accent" accent="var(--color-green-text)" soft="var(--color-green-soft)">
                  {t('прочитано')}
                </TileChip>
              )}
            </span>
            <span style={{
              fontSize: 16.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.32,
              letterSpacing: '-0.01em',
            }}>
              {t(ch.title)}
            </span>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5, ...proseWrap }}>
              {bindShortWords(t(ch.about))}
            </span>
            {/* Полоска — доля прочитанного, а не «открывал ли». Глава, брошенная
                на второй карточке из семи, и глава, дочитанная до конца, с
                витрины должны выглядеть по-разному. */}
            <TileMeter value={Math.round(((at + (at > 0 || done ? 1 : 0)) / ch.cards.length) * 100)} />
          </Tile>
        )
      })}
    </TileGrid>
  )
}

/** Чтение одной главы. */
export function StoryChapterPage({ chapter, storyKey, accent, soft, onDone }: {
  chapter: StoryChapter
  /** Ключ рассказа — часть ключа позиции, чтобы языки не делили одну закладку. */
  storyKey: string
  accent: string
  soft: string
  /** Глава дочитана — вернуться к витрине. */
  onDone: () => void
}) {
  const t = useT()
  const [i, setI] = usePersistentState<number>(`story.${storyKey}.${chapter.id}.at`, 0)
  // Позиция могла остаться от прежней, более длинной версии главы.
  const at = Math.min(Math.max(0, i), chapter.cards.length - 1)
  const card = chapter.cards[at]
  const last = at === chapter.cards.length - 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, margin: '0 auto', width: '100%' }}>
      {/* Полоска шагов: сколько прошли и сколько осталось. Отдельными
          сегментами, а не сплошной линией, — по ней видно, что шагов семь, а
          не «примерно половина». */}
      <div style={{ display: 'flex', gap: 4 }}>
        {chapter.cards.map((_, k) => (
          <span
            key={k}
            style={{
              flex: 1, height: 4, borderRadius: 999,
              background: k <= at ? accent : 'var(--color-bg-3)',
              transition: 'background 200ms',
            }}
          />
        ))}
      </div>

      {/* РЕМОУНТ ПО key, А НЕ AnimatePresence.
          В связке framer-motion 11.18 + React 19 обёртка presence умеет
          навсегда залипнуть: сигнал «выход завершён» приходит раньше
          регистрации уходящего ребёнка и молча теряется, а в режиме wait
          рендерится только он — экран остаётся пустым до F5. Анимации выхода
          здесь и не нужно: старая карточка исчезает сразу, новая проявляется. */}
      <div>
        <motion.div
          key={at}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            display: 'flex', flexDirection: 'column', gap: 14,
            padding: 22, borderRadius: 20,
            background: 'rgba(var(--glass-rgb), 0.94)',
            border: '1px solid var(--color-border-soft)',
          }}
        >
          {card.figure && (
            <img
              src={card.figure}
              alt={card.title ?? t('Схема')}
              style={{ width: '100%', borderRadius: 14, border: '1px solid var(--color-border-soft)' }}
            />
          )}
          {card.title && (
            <h3 style={{
              margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.015em',
              color: 'var(--color-text)', lineHeight: 1.25,
            }}>
              {t(card.title)}
            </h3>
          )}
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--color-text-2)', ...proseWrap }}>
            {bindShortWords(t(card.text))}
          </p>
          {card.bullets && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {card.bullets.map((b, k) => (
                <li key={k} style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  fontSize: 14.5, lineHeight: 1.5, color: 'var(--color-text)',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, flexShrink: 0, transform: 'translateY(-2px)' }} />
                  {t(b)}
                </li>
              ))}
            </ul>
          )}
          {card.keep && (
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 9,
              padding: '11px 14px', borderRadius: 12, background: soft,
              fontSize: 13.5, lineHeight: 1.5, fontWeight: 650, color: 'var(--color-text)',
            }}>
              <Check size={14} style={{ color: accent, flexShrink: 0, transform: 'translateY(2px)' }} />
              {bindShortWords(t(card.keep))}
            </div>
          )}
        </motion.div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={() => setI(Math.max(0, at - 1))}
          disabled={at === 0}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 16px',
            borderRadius: 999, border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-muted)', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 700,
            cursor: at === 0 ? 'default' : 'pointer', opacity: at === 0 ? 0.4 : 1,
          }}
        >
          <ArrowLeft size={15} /> {t('Назад')}
        </button>
        <span style={{ fontSize: 12.5, color: 'var(--color-text-3)' }}>
          {at + 1} {t('из')} {chapter.cards.length}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => (last ? onDone() : setI(at + 1))}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, height: 42, padding: '0 20px',
            borderRadius: 999, border: 'none', background: accent, color: '#fff',
            fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750, cursor: 'pointer',
          }}
        >
          {last ? <><BookOpen size={15} /> {t('К главам')}</> : <>{t('Дальше')} <ArrowRight size={15} /></>}
        </button>
      </div>
    </div>
  )
}
