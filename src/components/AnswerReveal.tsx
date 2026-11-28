// ─────────────────────────────────────────────────────────────────────────────
// Свёрнутый эталон в конспекте: «Показать эталон» по нажатию, «Разбор» — после
// сдачи работы. Что считается эталоном и почему по заголовку — lib/answerReveal.
//
// Скрытый текст не лежит в DOM, пока блок закрыт: не находится поиском по
// странице, не читается голосом, не копируется выделением всего конспекта.
//
// Шапка блока — сама кнопка во всю ширину: на телефоне и айпаде наведения нет,
// и действие не должно прятаться за hover (docs/platforms.md). Прокрутки внутри
// блока нет — он растёт в потоке конспекта, фейды не нужны.
// ─────────────────────────────────────────────────────────────────────────────
import { Fragment, useState, type ReactNode } from 'react'
import type { LessonParagraph } from '../data/lessonContent'
import { groupNotes, splitInlineReveals, type RevealKind } from '../lib/answerReveal'
import { ChevronDown, Eye, Lock } from './icons/appIcons'
import OpticalText from './OpticalText'
import { useT } from '../lib/i18n'

export default function AnswerReveal({ kind, title, unlocked, compact = false, scale = 1, children }: {
  kind: RevealKind
  /** Подпись из заголовка абзаца: «Проверка себя / эталон». */
  title: string
  /** Работа урока сдана — разбор после сдачи открыт. */
  unlocked: boolean
  /** Строка эталона внутри абзаца («— Проверка: эталон: …»). */
  compact?: boolean
  scale?: number
  children: ReactNode
}) {
  const t = useT()
  const locked = kind === 'after-submit' && !unlocked
  // Разбор после сдачи стоит раскрытым: ради него работу и сдавали. Пока
  // ученик блок не трогал, раскрытие следует за сдачей — оценка из базы может
  // приехать уже после первой отрисовки конспекта.
  const [toggled, setToggled] = useState<boolean | null>(null)
  const shown = !locked && (toggled ?? kind === 'after-submit')

  const label = kind === 'after-submit' ? t('Разбор') : t('Эталон')
  const hint = locked
    ? t('Откроется после сдачи работы')
    : kind === 'after-submit' ? t('Работа сдана — сверьте со своим решением') : t('Сначала решите сами')
  const Icon = locked ? Lock : Eye

  return (
    <div
      className="answer-reveal"
      data-reveal={locked ? 'locked' : shown ? 'open' : 'closed'}
      style={{
        borderRadius: compact ? 12 : 16,
        border: '1px solid var(--color-border-soft)',
        background: 'var(--color-bg-2)',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        data-hover={locked ? undefined : 'layer'}
        onClick={locked ? undefined : () => setToggled(!shown)}
        aria-expanded={locked ? undefined : shown}
        aria-disabled={locked || undefined}
        className="flex items-center w-full text-left"
        style={{
          gap: compact ? 10 : 12,
          padding: compact ? '8px 10px 8px 12px' : '12px 14px',
          // Скругление одно — у контейнера (overflow: hidden обрезает и
          // ховер-плашку): своё 8px от data-hover давало ступеньку в углах.
          border: 0, borderRadius: 0, background: 'transparent', fontFamily: 'inherit',
          cursor: locked ? 'default' : 'pointer',
          color: 'var(--color-text)',
        }}
      >
        {!compact && (
          <span className="answer-reveal-icon" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            width: 32 * scale, height: 32 * scale, borderRadius: 10 * scale,
            background: locked ? 'var(--color-bg-3)' : 'var(--color-accent-soft)',
            color: locked ? 'var(--color-muted)' : 'var(--color-accent)',
          }}>
            <Icon size={17 * scale} />
          </span>
        )}
        <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 2 }}>
          <span style={{ fontSize: (compact ? 13 : 14) * scale, fontWeight: 600, lineHeight: 1.35 }}>
            {compact ? t('Эталон для сверки') : title || label}
          </span>
          {!compact && (
            <span style={{ fontSize: 12 * scale, lineHeight: 1.35, color: 'var(--color-muted)' }}>{hint}</span>
          )}
        </span>
        {locked && compact && (
          <span className="flex items-center flex-shrink-0" style={{ gap: 5, fontSize: 12 * scale, color: 'var(--color-muted)' }}>
            <Lock size={13 * scale} />
            {t('После сдачи')}
          </span>
        )}
        {!locked && (
          <span
            className="flex items-center flex-shrink-0"
            style={{
              // Растёт с «Крупным текстом» вместе с заголовком блока.
              gap: 4 * scale, height: (compact ? 28 : 32) * scale, padding: `0 ${(compact ? 10 : 12) * scale}px`, borderRadius: 999,
              border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-card)',
              fontSize: 13 * scale, fontWeight: 600, color: 'var(--color-text)',
            }}
          >
            <OpticalText as="iskra-button-label">{shown ? t('Скрыть') : t('Показать')}</OpticalText>
            <ChevronDown size={15 * scale} style={{ transform: shown ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease', color: 'var(--color-text-3)' }} />
          </span>
        )}
      </button>
      {shown && (
        <div
          className="flex flex-col"
          style={{
            gap: 12,
            padding: compact ? '0 12px 10px' : '2px 14px 14px',
            borderTop: '1px solid var(--color-border-soft)',
            paddingTop: compact ? 8 : 12,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Конспект со свёрнутыми эталонами. Разметку абзаца (кегль, разбор слов,
 * подсветка реакций, схемы) рисует вызывающий — `renderPara` тот же, что был
 * до свёртки, чтобы эталон внутри блока выглядел как остальной конспект.
 */
export function NotesWithReveals({ paragraphs, unlocked, scale = 1, renderPara }: {
  paragraphs: LessonParagraph[]
  unlocked: boolean
  scale?: number
  renderPara: (p: LessonParagraph) => ReactNode
}) {
  const blocks = groupNotes(paragraphs)
  // Урок с «Разбором после сдачи» — итоговый проект: любой его эталон, включая
  // строку в «Быстрее с ИИ», открывается только после сдачи, не по нажатию.
  const project = blocks.some(b => b.kind === 'after-submit')
  const tapKind: RevealKind = project ? 'after-submit' : 'tap'
  return <>{blocks.map(block => {
    if (block.kind === 'plain') {
      const p = block.para
      // Абзац с подсветкой реакции не режем: на него держит ref страница урока.
      if (p.image || p.reactionId) return <Fragment key={p.id}>{renderPara(p)}</Fragment>
      const parts = splitInlineReveals(p.text)
      if (parts.length === 1 && parts[0].kind === 'text') return <Fragment key={p.id}>{renderPara(p)}</Fragment>
      return <Fragment key={p.id}>{parts.map((s, i) => s.kind === 'text'
        ? <Fragment key={i}>{renderPara({ ...p, id: `${p.id}~${i}`, text: s.text })}</Fragment>
        : (
          <AnswerReveal key={i} kind={tapKind} title="" unlocked={unlocked} compact scale={scale}>
            {renderPara({ ...p, id: `${p.id}~${i}`, text: s.text })}
          </AnswerReveal>
        ))}</Fragment>
    }
    return (
      <AnswerReveal key={block.id} kind={project ? 'after-submit' : block.kind} title={block.title} unlocked={unlocked} scale={scale}>
        {block.body.trim() && renderPara({ id: block.id, text: block.body })}
        {block.figures.map(f => <Fragment key={f.id}>{renderPara(f)}</Fragment>)}
      </AnswerReveal>
    )
  })}</>
}
