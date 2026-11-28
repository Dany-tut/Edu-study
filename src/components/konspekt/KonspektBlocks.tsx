// ─────────────────────────────────────────────────────────────────────────────
// Блоки конспекта (Figma «Искра», стр. 31 «Конспект — система форматирования»).
//
// Абзац урока разбирает lib/konspekt.ts, здесь — только вид. Язык карточек тот
// же, что у «Проверки себя» (AnswerReveal) и «Вопроса по уроку»: поверхность
// bg-2, рамка border-soft, радиус 16, тон — ТОЛЬКО в плитке-значке слева (как
// Alert), без заливки карточки и без полосы слева (ui-rules AI-01).
//
// Текст внутри блоков рисует вызывающий (`rt`) — тем же путём, что обычный
// абзац: Prose с типографикой и формулами или GlossedText с разбором слов.
// Все размеры в em от кегля конспекта: растут с «Крупным текстом».
// ─────────────────────────────────────────────────────────────────────────────
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { KBlock, CalloutTone } from '../../lib/konspekt'
import { headingId } from '../../lib/konspekt'
import { FormulaCard, useCopy } from '../Prose'
import OpticalText from '../OpticalText'
import { AlertCircle, AlertTriangle, Check, CheckCircle2, ChevronDown, Copy, Lightbulb, Quote, Sparkles, XCircle } from '../icons/appIcons'
import { useT } from '../../lib/i18n'

/** Нарисовать текст абзаца (строками, с разбором слов, формулами). */
export type RenderText = (text: string, key: string, style?: CSSProperties) => ReactNode

const CARD: CSSProperties = {
  borderRadius: 16, border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
}
const TONE: Record<CalloutTone, { soft: string; ink: string; Icon: typeof Lightbulb }> = {
  tip:    { soft: 'var(--color-accent-soft)', ink: 'var(--color-accent)',      Icon: Lightbulb },
  warn:   { soft: 'var(--color-yellow-soft)', ink: 'var(--color-yellow-text)', Icon: AlertTriangle },
  danger: { soft: 'var(--color-red-soft)',    ink: 'var(--color-red-text)',    Icon: AlertCircle },
}

function Tile({ soft, ink, children }: { soft: string; ink: string; children: ReactNode }) {
  return (
    <span aria-hidden style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      width: '2em', height: '2em', borderRadius: '0.625em', background: soft, color: ink,
    }}>{children}</span>
  )
}

const SMALL: CSSProperties = { fontSize: '0.9375em', lineHeight: 1.55 }

function Blocks({ blocks, rt, k }: { blocks: KBlock[]; rt: RenderText; k: string }) {
  return <>{blocks.map((b, i) => <Block key={`${k}-${i}`} b={b} rt={rt} k={`${k}-${i}`} />)}</>
}

function Block({ b, rt, k, anchor }: { b: KBlock; rt: RenderText; k: string; anchor?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  switch (b.k) {
    case 'hero':
      return (
        <div className="k-hero" style={{ display: 'flex', flexDirection: 'column', gap: '0.375em' }}>
          <span style={{ fontSize: '0.8125em', fontWeight: 600, lineHeight: 1.35, color: 'var(--color-accent)' }}>{b.eyebrow}</span>
          {rt(b.text, k, { fontSize: '1.375em', lineHeight: 1.36, fontWeight: 700 })}
        </div>
      )
    case 'meta':
      return (
        <div className="k-meta">
          <span style={{ fontSize: '0.8125em', fontWeight: 600, lineHeight: 1.85, color: 'var(--color-text-3)' }}>{b.label}</span>
          {rt(b.text, k, SMALL)}
        </div>
      )
    case 'h2':
      return <h2 id={anchor} className="k-h2" style={{ margin: '0.6em 0 0', fontSize: '1.25em', lineHeight: 1.4, fontWeight: 700, color: 'var(--color-text)' }}>{b.text}</h2>
    case 'h3':
      return <h3 className="k-h3" style={{ margin: '0.25em 0 0', fontSize: '1em', lineHeight: 1.5, fontWeight: 650, color: 'var(--color-text)' }}>{b.text}</h3>
    case 'text':
      return <>{rt(b.text, k)}</>
    case 'quote':
      return (
        <figure className="k-quote" style={{ ...CARD, margin: 0, padding: '1em 1.25em', display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
          <Quote size="1.25em" style={{ color: 'var(--color-accent)' }} />
          {rt(b.text, k, { fontSize: '1.25em', lineHeight: 1.5, fontWeight: 600 })}
        </figure>
      )
    case 'formula':
      return <FormulaCard rows={b.en ? [{ tag: 'RU', code: b.code }, { tag: 'EN', code: b.en }] : [{ code: b.code }]} />
    case 'steps':
      return (
        <ol className="k-steps" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1em' }}>
          {b.items.map((it, i) => (
            <li key={i} style={{ display: 'flex', gap: '0.75em', alignItems: 'flex-start' }}>
              <span aria-hidden style={{
                flexShrink: 0, width: '1.625em', height: '1.625em', borderRadius: '50%', marginTop: '0.0625em',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-accent-soft)', color: 'var(--color-purple-text)', fontSize: '0.8125em', fontWeight: 700,
              }}><span style={{ fontSize: '1em' }}>{i + 1}</span></span>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.625em' }}>
                <span className="sr-only">{t('Шаг')} {i + 1}. </span>
                {rt(it.text, `${k}-s${i}`)}
                <Blocks blocks={it.extra} rt={rt} k={`${k}-s${i}`} />
              </div>
            </li>
          ))}
        </ol>
      )
    case 'errors':
      return (
        <div className="k-errors" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {b.items.map((it, i) => (
            <div key={i} style={{ ...CARD, padding: '0.75em 0.875em', display: 'flex', flexDirection: 'column', gap: '0.375em' }}>
              <div style={{ display: 'flex', gap: '0.625em', alignItems: 'flex-start' }}>
                <XCircle size="1.125em" style={{ flexShrink: 0, marginTop: '0.2em', color: 'var(--color-red-text)' }} aria-label={t('Ошибка')} />
                <div style={{ flex: 1, minWidth: 0 }}>{rt(it.bad, `${k}-b${i}`, SMALL)}</div>
              </div>
              {it.fix && (
                <div style={{ display: 'flex', gap: '0.625em', alignItems: 'flex-start' }}>
                  <CheckCircle2 size="1.125em" style={{ flexShrink: 0, marginTop: '0.2em', color: 'var(--color-green-text)' }} aria-label={t('Исправление')} />
                  <div style={{ flex: 1, minWidth: 0 }}>{rt(it.fix, `${k}-f${i}`, { ...SMALL, color: 'var(--color-text-2)' })}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    case 'callout': {
      const tone = TONE[b.tone]
      return (
        <div className="k-callout" style={{ ...CARD, padding: '0.875em 1em', display: 'flex', gap: '0.75em', alignItems: 'flex-start' }}>
          <Tile soft={tone.soft} ink={tone.ink}><tone.Icon size="1.125em" /></Tile>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.5em', paddingTop: '0.25em' }}>
            <span style={{ fontSize: '0.9375em', fontWeight: 650, lineHeight: 1.45, color: 'var(--color-text)' }}>{b.title}</span>
            <Blocks blocks={b.body} rt={(x, kk, st) => rt(x, kk, { ...SMALL, color: 'var(--color-text-2)', ...st })} k={k} />
          </div>
        </div>
      )
    }
    case 'prompt':
      return <PromptCard text={b.text} note={b.note} rt={rt} k={k} />
    case 'details':
      return (
        <div className="k-details" style={{ ...CARD, overflow: 'hidden' }}>
          <button
            type="button" data-hover="layer" aria-expanded={open} onClick={() => setOpen(v => !v)}
            className="flex items-center w-full text-left"
            style={{ gap: '0.75em', padding: '0.75em 0.875em', border: 0, borderRadius: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 'inherit', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            <Tile soft="var(--color-accent-soft)" ink="var(--color-accent)"><Sparkles size="1.0625em" /></Tile>
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.875em', fontWeight: 600, lineHeight: 1.35 }}>{b.title}</span>
            <span className="flex items-center flex-shrink-0" style={{
              gap: '0.25em', height: '2em', padding: '0 0.75em', borderRadius: 999,
              border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-card)', fontSize: '0.8125em', fontWeight: 600,
            }}>
              <OpticalText as="iskra-button-label">{open ? t('Скрыть') : t('Открыть')}</OpticalText>
              <ChevronDown size="1.15em" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', color: 'var(--color-text-3)' }} />
            </span>
          </button>
          {open && (
            <div style={{ padding: '0.75em 0.875em 0.875em', borderTop: '1px solid var(--color-border-soft)', display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
              <Blocks blocks={b.body} rt={(x, kk, st) => rt(x, kk, { ...SMALL, ...st })} k={k} />
            </div>
          )}
        </div>
      )
  }
}

/** «Промпт для ИИ»: карточка, текст обычным шрифтом, кнопка «Копировать». */
function PromptCard({ text, note, rt, k }: { text: string; note: string; rt: RenderText; k: string }) {
  const t = useT()
  const { copied, copy } = useCopy(text)
  return (
    <div className="k-prompt" style={{ ...CARD, padding: '0.75em 0.875em 0.875em', display: 'flex', flexDirection: 'column', gap: '0.625em' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75em' }}>
        <Tile soft="var(--color-accent-soft)" ink="var(--color-accent)"><Sparkles size="1.0625em" /></Tile>
        <span style={{ flex: 1, minWidth: 0, fontSize: '0.875em', fontWeight: 600, lineHeight: 1.35 }}>{t('Промпт для ИИ')}</span>
        <button
          type="button" data-hover="layer" onClick={copy}
          className="flex items-center flex-shrink-0 cursor-pointer"
          style={{
            gap: '0.375em', height: '2em', padding: '0 0.75em', borderRadius: 999, fontFamily: 'inherit', fontSize: '0.8125em', fontWeight: 600,
            border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-card)',
            color: copied ? 'var(--color-green-text)' : 'var(--color-text)',
          }}
        >
          {copied ? <Check size="1.15em" /> : <Copy size="1.15em" style={{ color: 'var(--color-accent)' }} />}
          <OpticalText as="iskra-button-label">{copied ? t('Скопировано') : t('Копировать')}</OpticalText>
        </button>
      </div>
      <div style={{ padding: '0.625em 0.75em', borderRadius: '0.625em', background: 'var(--color-bg-3)', fontSize: '0.9375em', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{text}</div>
      {note && rt(note, `${k}-n`, { fontSize: '0.8125em', lineHeight: 1.45, color: 'var(--color-text-3)' })}
    </div>
  )
}

/** Абзац конспекта, разобранный на блоки. Заголовки получают якорь для оглавления. */
export default function KonspektPara({ pid, blocks, rt }: { pid: string; blocks: KBlock[]; rt: RenderText }) {
  return <>{blocks.map((b, i) => <Block key={i} b={b} rt={rt} k={`${pid}-${i}`} anchor={b.k === 'h2' ? headingId(pid, i) : undefined} />)}</>
}
