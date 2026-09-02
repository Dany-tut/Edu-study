// ─── Карточка превью типа задания ────────────────────────────────────────────
//
// Что видит учитель, наведя «i» на строку палитры: мини-макет упражнения
// (данные — src/data/taskTypePreviews.ts), фраза «чему учит» и служебные
// признаки типа, взятые прямо из реестра (проверяется машиной или учителем,
// нужен ли звук).
//
// Компонент грузится лениво — только при первом наведении, поэтому ни макеты,
// ни этот файл не лежат в чанке редактора.

import { Fragment } from 'react'
import { CheckCircle2, Eye, Mic, Play, PenLine, Volume2 } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { TASK_TYPES, type TaskTypeId } from '../../data/taskTypes'
import {
  TASK_TYPE_PREVIEWS,
  type GapPart, type PreviewBlock, type PreviewChip,
} from '../../data/taskTypePreviews'

// Ширина карточки. Уже 300 макет с двумя столбцами (pairs, columns) начинает
// переносить подписи, шире 340 — карточка перестаёт читаться как подсказка.
export const PREVIEW_CARD_WIDTH = 318

// ─── Мелкие детали макета ────────────────────────────────────────────────────

/** Цвета плитки по состоянию. Один источник на все примитивы. */
function chipStyle(state?: PreviewChip['state']): React.CSSProperties {
  switch (state) {
    case 'correct': return { background: 'var(--color-green-soft)', color: 'var(--color-green-text)', borderColor: 'var(--color-green-border)' }
    case 'wrong':   return { background: 'var(--color-red-soft)', color: 'var(--color-red-text)', borderColor: 'var(--color-red-border)' }
    case 'active':  return { background: 'var(--color-accent-soft)', color: 'var(--color-accent)', borderColor: 'var(--color-accent)' }
    // Израсходованная плитка: приглушена, но не невидима — по ней читается,
    // что слово ушло из банка, а не пропало.
    case 'ghost':   return { background: 'var(--color-bg-3)', color: 'var(--color-text-4)', borderColor: 'transparent' }
    default:        return { background: 'var(--color-bg)', color: 'var(--color-text-2)', borderColor: 'var(--color-border)' }
  }
}

function Chip({ chip }: { chip: PreviewChip }) {
  return (
    <span style={{
      padding: '3px 7px', borderRadius: 7, fontSize: 10.5, fontWeight: 600,
      border: '1px solid', whiteSpace: 'nowrap', ...chipStyle(chip.state),
    }}>
      {chip.text}
    </span>
  )
}

/** Поле ввода: пустое рисуется рамкой, заполненное — текстом внутри. */
function Field({ text, lines = 1 }: { text?: string; lines?: number }) {
  return (
    <div style={{
      border: '1px solid var(--color-border)', borderRadius: 8,
      background: 'var(--color-bg)', padding: '5px 7px',
      fontSize: 10.5, color: text ? 'var(--color-text-2)' : 'var(--color-text-4)',
      minHeight: lines > 1 ? lines * 15 : undefined, lineHeight: 1.4,
    }}>
      {text || ' '}
    </div>
  )
}

function GapRun({ parts }: { parts: GapPart[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
      {parts.map((p, i) => {
        if (typeof p === 'string') return <span key={i}>{p}</span>
        if ('pill' in p) return <Chip key={i} chip={{ text: p.pill, state: 'correct' }} />
        if ('select' in p) return (
          <span key={i} style={{
            padding: '2px 6px', borderRadius: 6, border: '1px solid var(--color-border-medium)',
            background: 'var(--color-bg)', color: p.select ? 'var(--color-text-2)' : 'var(--color-text-4)',
            fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {p.select || 'Выбрать'}<span style={{ opacity: 0.5, fontSize: 8 }}>▾</span>
          </span>
        )
        return (
          <span key={i} style={{
            display: 'inline-block', minWidth: 46, padding: '2px 6px', borderRadius: 6,
            border: '1px solid var(--color-border-medium)', background: 'var(--color-bg)',
            color: 'var(--color-text-2)', fontSize: 10,
          }}>
            {p.input || ' '}
          </span>
        )
      })}
    </div>
  )
}

/** Заглушка медиа. Рисуем сами: тащить в подсказку настоящие файлы незачем. */
function Media({ shape, glyph }: { shape: 'image' | 'images' | 'video' | 'canvas'; glyph?: string }) {
  const box: React.CSSProperties = {
    flex: 1, height: 46, borderRadius: 8, display: 'grid', placeItems: 'center',
    background: 'var(--color-bg-3)', border: '1px solid var(--color-border-soft)',
    color: 'var(--color-text-4)',
  }
  if (shape === 'images') {
    return <div style={{ display: 'flex', gap: 6 }}><div style={box}><Eye size={14} /></div><div style={box}><Eye size={14} /></div></div>
  }
  if (shape === 'video') {
    return <div style={{ ...box, height: 56 }}><Play size={16} /></div>
  }
  if (shape === 'canvas') {
    return (
      <div style={{ ...box, height: 52, border: '1px dashed var(--color-border-medium)', position: 'relative' }}>
        {glyph
          ? <span style={{ fontSize: 26, fontWeight: 300, color: 'var(--color-text-4)', letterSpacing: 2 }}>{glyph}</span>
          : <PenLine size={15} />}
      </div>
    )
  }
  return <div style={box}><Eye size={14} /></div>
}

function Player({ label, mic }: { label?: string; mic?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '6px 8px', borderRadius: 9,
      background: mic ? 'var(--color-purple-soft)' : 'var(--color-blue-pill-bg)',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
        background: mic ? 'var(--color-control-accent)' : 'var(--color-blue-fill)', color: '#fff',
      }}>
        {mic ? <Mic size={11} /> : <Volume2 size={11} />}
      </span>
      {/* Волна — восемь полосок разной высоты: узнаваемо и без картинки. */}
      <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 14 }}>
        {[6, 11, 4, 14, 8, 12, 5, 9].map((h, i) => (
          <span key={i} style={{
            flex: 1, height: h, borderRadius: 1,
            background: mic ? 'var(--color-control-accent)' : 'var(--color-blue-pill-text)', opacity: 0.45,
          }} />
        ))}
      </span>
      {label && <span style={{ fontSize: 9.5, fontWeight: 600, color: mic ? 'var(--color-purple-text)' : 'var(--color-blue-pill-text)' }}>{label}</span>}
    </div>
  )
}

// ─── Один блок макета ────────────────────────────────────────────────────────

function Block({ block }: { block: PreviewBlock }) {
  const t = useT()
  switch (block.kind) {
    case 'prompt':
      return (
        <div style={{
          fontSize: 10.5, lineHeight: 1.45,
          fontWeight: block.muted ? 600 : 700,
          color: block.muted ? 'var(--color-text-3)' : 'var(--color-text)',
        }}>{t(block.text)}</div>
      )

    case 'choices':
      return (
        <div style={{ display: 'grid', gap: 4 }}>
          {block.options.map((o, i) => {
            const on = o.state === 'correct' || o.state === 'wrong'
            const s = chipStyle(o.state)
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 7px',
                borderRadius: 7, border: '1px solid', fontSize: 10.5, fontWeight: 600, ...s,
              }}>
                <span style={{
                  width: 11, height: 11, flexShrink: 0,
                  borderRadius: block.multi ? 3 : '50%',
                  border: `1.5px solid ${on ? 'currentColor' : 'var(--color-border-medium)'}`,
                  background: on ? 'currentColor' : 'transparent',
                }} />
                <span>{o.text}</span>
              </div>
            )
          })}
        </div>
      )

    case 'tiles':
      return (
        <div>
          {block.label && <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-4)', marginBottom: 3, letterSpacing: 0.3 }}>{t(block.label)}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {block.items.map((c, i) => <Chip key={i} chip={c} />)}
          </div>
        </div>
      )

    case 'line':
      return (
        <div style={{
          minHeight: 26, borderRadius: 8, padding: '4px 6px',
          border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg)',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4,
        }}>
          {block.items.length > 0
            ? block.items.map((c, i) => <Chip key={i} chip={c} />)
            : null}
          {block.placeholder && (
            <span style={{ fontSize: 9.5, color: 'var(--color-text-4)', fontStyle: 'italic' }}>{t(block.placeholder)}</span>
          )}
        </div>
      )

    case 'gap':
      return <GapRun parts={block.parts} />

    case 'field':
      return <Field text={block.text} lines={block.lines} />

    case 'pairs':
      return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 12px 1fr', gap: 4, alignItems: 'center' }}>
          {block.rows.map((r, i) => (
            <Fragment key={i}>
              <div style={{
                padding: '4px 6px', borderRadius: 7, fontSize: 10, fontWeight: 600,
                border: `1px solid ${r.linked ? 'var(--color-rose-text)' : 'var(--color-border)'}`,
                background: r.linked ? 'var(--color-rose-soft)' : 'var(--color-bg)',
                color: r.linked ? 'var(--color-rose-text)' : 'var(--color-text-2)',
              }}>{r.left}</div>
              <span style={{
                height: 1, background: r.linked ? 'var(--color-rose-text)' : 'var(--color-border)',
                opacity: r.linked ? 0.7 : 0.5,
              }} />
              <div style={{
                padding: '4px 6px', borderRadius: 7, fontSize: 10, fontWeight: 600,
                border: `1px solid ${r.linked ? 'var(--color-rose-text)' : 'var(--color-border)'}`,
                background: r.linked ? 'var(--color-rose-soft)' : 'var(--color-bg)',
                color: r.linked ? 'var(--color-rose-text)' : 'var(--color-text-2)',
              }}>{r.right}</div>
            </Fragment>
          ))}
        </div>
      )

    case 'columns':
      return (
        <div style={{ display: 'flex', gap: 6 }}>
          {block.cols.map((c, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 8, padding: 5, background: 'var(--color-bg)',
              border: '1px dashed var(--color-border-medium)', display: 'grid', gap: 3, alignContent: 'start',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)' }}>{c.title}</div>
              {c.items.map((it, j) => <Chip key={j} chip={it} />)}
            </div>
          ))}
        </div>
      )

    case 'table':
      return (
        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ display: 'flex', background: 'var(--color-table-header-bg)' }}>
            {block.headers.map((h, i) => (
              <div key={i} style={{ flex: 1, padding: '4px 6px', fontSize: 9, fontWeight: 700, color: 'var(--color-text-3)' }}>{h}</div>
            ))}
          </div>
          {block.rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', borderTop: '1px solid var(--color-border-soft)' }}>
              {row.map((cell, j) => (
                <div key={j} style={{ flex: 1, padding: '4px 6px', fontSize: 10, color: 'var(--color-text-2)' }}>
                  {cell === null
                    ? <span style={{
                        display: 'block', height: 12, borderRadius: 4,
                        border: '1px solid var(--color-border-medium)', background: 'var(--color-bg)',
                      }} />
                    : cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      )

    case 'audio': return <Player label={block.label ? t(block.label) : undefined} />
    case 'mic':   return <Player label={block.label} mic />

    case 'card':
      return (
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{
            flex: 1, height: 46, borderRadius: 10, display: 'grid', placeItems: 'center',
            background: 'var(--color-bg)', border: '1px solid var(--color-border)',
            fontSize: 12, fontWeight: 700, color: 'var(--color-text)',
          }}>{block.front}</div>
          {block.back && (
            <div style={{
              flex: 1, height: 46, borderRadius: 10, display: 'grid', placeItems: 'center',
              background: 'var(--color-teal-pill-bg)', border: '1px solid transparent',
              fontSize: 12, fontWeight: 700, color: 'var(--color-teal-pill-text)',
            }}>{block.back}</div>
          )}
        </div>
      )

    case 'media': return <Media shape={block.shape} glyph={block.glyph} />

    case 'keys':
      return (
        <div style={{ display: 'grid', gap: 3 }}>
          {block.rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 3 }}>
              {row.map(k => (
                <span key={k} style={{
                  flex: 1, textAlign: 'center', padding: '3px 0', borderRadius: 5, fontSize: 10, fontWeight: 600,
                  background: k === block.pressed ? 'var(--color-accent-soft)' : 'var(--color-bg)',
                  color: k === block.pressed ? 'var(--color-accent)' : 'var(--color-text-3)',
                  border: `1px solid ${k === block.pressed ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
                }}>{k}</span>
              ))}
            </div>
          ))}
        </div>
      )

    case 'grid':
      return (
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={{ display: 'grid', gap: 3 }}>
            {block.cells.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 3 }}>
                {row.map((cell, j) => (
                  <span key={j} style={{
                    width: 20, height: 20, borderRadius: 4, display: 'grid', placeItems: 'center',
                    fontSize: 10, fontWeight: 700,
                    background: cell === null ? 'transparent' : 'var(--color-bg)',
                    border: cell === null ? '1px solid transparent' : '1px solid var(--color-border-medium)',
                    color: 'var(--color-text-2)',
                  }}>{cell ?? ''}</span>
                ))}
              </div>
            ))}
          </div>
          {block.clue && <div style={{ fontSize: 9.5, color: 'var(--color-text-3)' }}>{t(block.clue)}</div>}
        </div>
      )

    case 'dialog':
      return (
        <div style={{ display: 'grid', gap: 4 }}>
          {block.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: l.side === 'l' ? 'flex-start' : 'flex-end' }}>
              <span style={{
                maxWidth: '85%', padding: '4px 7px', fontSize: 10, lineHeight: 1.4,
                borderRadius: 9, borderBottomLeftRadius: l.side === 'l' ? 2 : 9, borderBottomRightRadius: l.side === 'l' ? 9 : 2,
                background: l.side === 'l' ? 'var(--color-bg-3)' : 'var(--color-blue-pill-bg)',
                color: l.side === 'l' ? 'var(--color-text-2)' : 'var(--color-blue-pill-text)',
              }}>
                <b style={{ opacity: 0.6, marginRight: 4 }}>{l.speaker}</b>{l.text}
              </span>
            </div>
          ))}
        </div>
      )

    case 'verdict':
      return (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 7px', borderRadius: 7,
          fontSize: 10, fontWeight: 700, alignSelf: 'flex-start',
          background: block.ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
          color: block.ok ? 'var(--color-green-text)' : 'var(--color-red-text)',
        }}>
          <CheckCircle2 size={11} />{t(block.text)}
        </div>
      )
  }
}

// ─── Карточка целиком ────────────────────────────────────────────────────────

export default function TaskTypePreviewCard({ type }: { type: TaskTypeId }) {
  const t = useT()
  const def = TASK_TYPES[type]
  const preview = TASK_TYPE_PREVIEWS[type]
  const { color, bg } = def.visual

  // Служебные признаки берём из реестра, а не из текста превью: так подсказка
  // не может соврать про проверку — она читает то же поле, что и проверка.
  const flags: string[] = [
    def.needsTeacherReview ? 'Смотрит учитель' : 'Проверяется сам',
    ...(def.needsAudio ? ['Нужен звук'] : []),
    ...(def.languageOnly ? ['Языковые курсы'] : []),
  ]

  return (
    <div style={{ display: 'grid', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 26, height: 26, borderRadius: 8, background: bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <def.Icon size={13} style={{ color }} />
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 750, color: 'var(--color-text)' }}>{t(def.label)}</span>
      </div>

      {/* Сам макет — на подложке, чтобы читался как «экран ученика», а не как
          продолжение подсказки. */}
      <div style={{
        display: 'grid', gap: 6, padding: '9px 10px', borderRadius: 12,
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
      }}>
        {preview.blocks.map((b, i) => <Block key={i} block={b} />)}
      </div>

      <div style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--color-text-2)' }}>{t(preview.teaches)}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {flags.map(f => (
          <span key={f} style={{
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
            background: 'var(--color-bg-3)', color: 'var(--color-text-3)',
          }}>{t(f)}</span>
        ))}
      </div>
    </div>
  )
}
