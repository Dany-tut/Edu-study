import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Square, Languages, Type } from 'lucide-react'
import GlossedText from '../GlossedText'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { wordReading } from '../../lib/lexicon'
import { transcribe } from '../../lib/translit'
import { speak, speechLines, type SpeechHandle } from '../../lib/speech'
import { useIsDesktop } from '../../lib/useIsDesktop'
import type { Gloss } from '../../data/readingLibrary'

// ─────────────────────────────────────────────────────────────────────────────
// Партитура текста — второй режим читалки рядом с обычной прозой.
//
// ЗАЧЕМ. В прозе текст лежит одним абзацем: перевод спрятан до конца проверки,
// транскрипции нет вовсе, а звук идёт отдельной кнопкой в рейле и с текстом
// никак не связан. Для языка с чужой письменностью этого мало — ученику нужны
// три вещи ОДНОВРЕМЕННО: как написано, как звучит, что значит. Здесь они стоят
// тремя синхронными дорожками, как строчки в нотной партитуре.
//
// ТРИ ПРАВИЛА, ИЗ КОТОРЫХ СОБРАН ЭКРАН
//
// 1. ТРАНСКРИПЦИЯ — ПОД СВОИМ СЛОВОМ, а не строкой под абзацем (это делает
//    GlossedText в режиме ruby). Отдельная строка транскрипции заставляет глаз
//    считать, какое слово какому соответствует, и на третьем слове чтение
//    разваливается.
//
// 2. ПЕРЕВОД — ПО СТРОКЕ И ПО АБЗАЦУ, НЕ ПО СЛОВУ. Пословный перевод корейского
//    или японского нечитаем из-за порядка слов; читаемая единица — реплика.
//    Поэтому перевод стоит колонкой справа и начинается на той же высоте, что и
//    его строка оригинала.
//
// 3. ЗВУК ВЕДЁТ ГЛАЗ. Голос подсвечивает слово, до которого дочитал. Событие
//    boundary есть не у всех голосов, поэтому подсветка двухуровневая: строка
//    подсвечивается всегда (по onLine), слово — где браузер это умеет.
//
// ЕДИНИЦА ЭКРАНА — РЕПЛИКА, А НЕ АБЗАЦ. Строки берём тем же speechLines(), что
// и озвучка: только так номер звучащей реплики совпадает со строкой на экране.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Кусок озвучки. line === null — кусок не звучит (ремарка без букв).
 *
 * Кусков в строке бывает несколько: длинный абзац озвучка режет по предложениям
 * и по пробелам (см. speechLines). На экране такой разрыв — не перенос строки, а
 * просто следующий кусок в той же строке: абзац, разорванный посреди
 * предложения, читается как ошибка вёрстки.
 */
interface Chunk { text: string; line: number | null }

/** Строка исходного текста — единица показа. */
interface Row { chunks: Chunk[] }

/** Блок «оригинал ↔ перевод»: одна строка диалога или целый абзац прозы. */
interface Unit { rows: Row[]; ru?: string }

/**
 * Разложить текст и перевод на пары. Перевод сверяется по абзацам, а внутри
 * абзаца — по строкам: в диалоге это даёт реплику напротив реплики, в прозе —
 * абзац напротив абзаца.
 *
 * Если абзацы не сошлись (перевод писали свободнее оригинала), пар не строим
 * вовсе: перевод не своей строки хуже, чем перевод общим текстом под партитурой.
 */
function build(body: string, translation?: string): { units: Unit[]; loose?: string } {
  const blocks = body.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const ruBlocks = (translation ?? '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)
  const aligned = ruBlocks.length > 0 && ruBlocks.length === blocks.length

  let line = 0
  const units: Unit[] = []

  for (let bi = 0; bi < blocks.length; bi++) {
    const lines = blocks[bi].split(/\r?\n/).map(s => s.trim()).filter(Boolean)
    const rows: Row[] = lines.map(l => {
      const chunks = speechLines(l)
      return { chunks: chunks.length ? chunks.map(text => ({ text, line: line++ })) : [{ text: l, line: null }] }
    })

    const ru = aligned ? ruBlocks[bi] : undefined
    const ruLines = ru ? ru.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : []

    if (ru && ruLines.length > 1 && ruLines.length === lines.length) {
      lines.forEach((_, i) => units.push({ rows: [rows[i]], ru: ruLines[i] }))
    } else {
      units.push({ rows, ru })
    }
  }

  return { units, loose: translation && !aligned ? translation : undefined }
}

/** Есть ли для этого языка что писать под словами. */
export function hasReadings(body: string, lang: string, glossary: Gloss[] = []): boolean {
  return !!transcribe(body, lang) || glossary.some(g => !!wordReading(g.term, lang))
}

export default function ScoreReader({ body, translation, lang, glossary, accent, soft, highlight }: {
  body: string
  translation?: string
  lang: string
  glossary: Gloss[]
  accent: string
  soft: string
  /** Слово, выбранное в словаре текста слева, — подсвечивается и здесь. */
  highlight?: string | null
}) {
  const t = useT()
  const isDesktop = useIsDesktop()

  const { units, loose } = useMemo(() => build(body, translation), [body, translation])
  const total = useMemo(() => speechLines(body).length, [body])
  const readings = useMemo(() => hasReadings(body, lang, glossary), [body, lang, glossary])

  const [playing, setPlaying] = useState(false)
  const [slow, setSlow] = useState(false)
  // Перевод выключен по умолчанию — это и есть учебная нагрузка: сперва
  // пытаешься понять сам, и только потом сверяешься.
  const [showRu, setShowRu] = useState(false)
  const [showTr, setShowTr] = useState(true)
  // Что звучит: номер реплики и позиция символа внутри неё.
  const [line, setLine] = useState<number | null>(null)
  const [char, setChar] = useState<number | null>(null)

  const voice = useRef<SpeechHandle | null>(null)
  useEffect(() => () => voice.current?.stop(), [])

  function play(rate: number) {
    setPlaying(true)
    setLine(null)
    setChar(null)
    voice.current = speak(body, {
      lang,
      rate,
      // Пауза между репликами: диалог без неё звучит сплошняком, и глаз не
      // успевает перейти на следующую строку.
      gap: 240,
      onLine: i => { setLine(i); setChar(null) },
      onWord: (i, c) => { setLine(i); setChar(c) },
      onEnd: () => { setPlaying(false); setLine(null); setChar(null) },
    })
  }

  function toggle() {
    if (playing) voice.current?.stop()
    else play(slow ? 0.8 : 1)
  }

  /** Смена темпа на ходу перезапускает чтение: менять его молча — обман. */
  function setRate(next: boolean) {
    setSlow(next)
    if (playing) play(next ? 0.8 : 1)
  }

  const twoCol = isDesktop && showRu
  // Отступы длинной записью: колонки перекрывают их по одной стороне, а смесь
  // padding и paddingLeft в одном стиле React ругает и применяет непредсказуемо.
  const cell = { paddingTop: 9, paddingRight: 14, paddingBottom: 9, paddingLeft: 0 } as const
  const ruStyle = {
    fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap,
  } as const

  return (
    <div style={{
      borderRadius: 18, background: 'var(--color-bg-2)',
      border: '1px solid var(--color-border-soft)', overflow: 'hidden',
    }}>
      {/* Плеер — шапкой над текстом: он ведёт по строкам, а не просто читает. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 16px', borderBottom: '1px solid var(--color-border-soft)',
      }}>
        <button
          onClick={toggle}
          aria-label={playing ? t('Стоп') : t('Слушать')}
          style={{
            width: 32, height: 32, flexShrink: 0, borderRadius: '50%', border: 'none',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            background: accent, color: '#fff',
          }}
        >
          {playing ? <Square size={13} fill="#fff" /> : <Play size={14} fill="#fff" style={{ marginLeft: 2 }} />}
        </button>

        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--color-border-soft)' }}>
          <div style={{
            width: `${line === null || !total ? 0 : Math.round(((line + 1) / total) * 100)}%`,
            height: 4, borderRadius: 2, background: accent, transition: 'width 220ms ease',
          }} />
        </div>

        <button
          onClick={() => setRate(!slow)}
          style={{
            padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700,
            border: `1px solid ${slow ? accent : 'var(--color-border-medium)'}`,
            background: slow ? soft : 'transparent',
            color: slow ? accent : 'var(--color-text-2)',
          }}
        >
          {slow ? '0.75×' : '1.0×'}
        </button>
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: twoCol ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr',
        }}>
          {units.map((u, ui) => (
            <FragmentRow
              key={ui}
              unit={u}
              twoCol={twoCol}
              showRu={showRu}
              cell={cell}
              ruStyle={ruStyle}
              lang={lang}
              glossary={glossary}
              accent={accent}
              soft={soft}
              highlight={highlight}
              ruby={showTr && readings}
              line={line}
              char={char}
            />
          ))}
        </div>

        {/* Перевод, который не разложился по строкам, — общим текстом. */}
        {showRu && loose && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, color: 'var(--color-text-3)', textTransform: 'uppercase', marginBottom: 6 }}>
              {t('Перевод текста')}
            </div>
            <div style={{ ...ruStyle, whiteSpace: 'pre-wrap' }}>{loose}</div>
          </div>
        )}
      </div>

      {/* Тумблеры — под текстом: сверху уже стоит плеер, и две панели управления
          в шапке спорили бы друг с другом. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '10px 16px', borderTop: '1px solid var(--color-border-soft)',
      }}>
        {translation && (
          <Toggle on={showRu} onClick={() => setShowRu(v => !v)} accent={accent} soft={soft}>
            <Languages size={13} /> {t('Перевод')}
          </Toggle>
        )}
        {readings && (
          <Toggle on={showTr} onClick={() => setShowTr(v => !v)} accent={accent} soft={soft}>
            <Type size={13} /> {t('Транскрипция')}
          </Toggle>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 11.5, color: 'var(--color-text-3)' }}>
          {t('Нажми на слово — перевод и озвучка')}
        </span>
      </div>
    </div>
  )
}

/** Строка партитуры: оригинал и, если включён, его перевод. */
function FragmentRow({ unit, twoCol, showRu, cell, ruStyle, lang, glossary, accent, soft, highlight, ruby, line, char }: {
  unit: Unit
  twoCol: boolean
  showRu: boolean
  cell: React.CSSProperties
  ruStyle: React.CSSProperties
  lang: string
  glossary: Gloss[]
  accent: string
  soft: string
  highlight?: string | null
  ruby: boolean
  line: number | null
  char: number | null
}) {
  const orig = (
    <div style={{
      ...cell,
      ...(twoCol ? { borderRight: '1px solid var(--color-border-soft)', paddingRight: 18 } : null),
    }}>
      {unit.rows.map((r, ri) => (
        <div
          key={ri}
          // Межстрочный интервал больше обычного: под строкой стоит ещё строка
          // транскрипции, и на 1.85 они слипаются.
          style={{ fontSize: 16.5, lineHeight: ruby ? 2.1 : 1.85, color: 'var(--color-text)' }}
        >
          {r.chunks.map((c, ci) => {
            const live = c.line !== null && c.line === line
            return (
              <span
                key={ci}
                style={{
                  borderRadius: 8,
                  background: live ? soft : 'transparent',
                  boxShadow: live ? `0 0 0 4px ${soft}` : 'none',
                  transition: 'background 200ms ease',
                }}
              >
                {ci > 0 && ' '}
                <GlossedText
                  text={c.text}
                  lang={lang}
                  extra={glossary}
                  accent={accent}
                  highlight={highlight}
                  ruby={ruby}
                  spokenChar={live ? char : null}
                  // Куски одной строки идут в поток, а не блоками: разрыв
                  // посреди предложения читается как ошибка вёрстки.
                  style={{ display: 'inline' }}
                />
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )

  if (!showRu || !unit.ru) {
    return twoCol ? <>{orig}<div style={cell} /></> : orig
  }

  return (
    <>
      {orig}
      <div style={{ ...cell, ...(twoCol ? { paddingLeft: 18, paddingRight: 0 } : { paddingTop: 0 }) }}>
        <div style={ruStyle}>{unit.ru}</div>
      </div>
    </>
  )
}

function Toggle({ on, onClick, accent, soft, children }: {
  on: boolean; onClick: () => void; accent: string; soft: string; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 12px', borderRadius: 999, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12, fontWeight: on ? 700 : 500,
        border: `1px solid ${on ? accent : 'var(--color-border-medium)'}`,
        background: on ? soft : 'transparent',
        color: on ? accent : 'var(--color-text-2)',
      }}
    >
      {children}
    </button>
  )
}
