import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { buildLexicon, type Segment } from '../lib/lexicon'
import type { WordGloss } from '../data/wordGloss'
import { useT } from '../lib/i18n'

// Текст, в котором переводится каждое слово.
//
// ГЛАВНОЕ ПРАВИЛО: посмотреть слово, НЕ УХОДЯ ИЗ ТЕКСТА. Как только за переводом
// надо открыть словарь (или даже просто уехать глазами вниз к списку слов),
// нить предложения теряется, и чтение превращается в расшифровку. Поэтому
// перевод всплывает прямо над словом и закрывается по любому следующему
// действию.
//
// НАВЕДЕНИЕ И КЛИК — РАЗНЫЕ ЖЕСТЫ. На мыши подсказка появляется по наведению
// (быстрее и не требует решения «стоит ли кликать»), но гаснет, как только
// курсор ушёл. Клик её ПРИКАЛЫВАЕТ: можно увести курсор, нажать «озвучить»,
// прочитать пометку. На телефоне наведения нет вовсе, там работает только тап —
// и он сразу прикалывает.
//
// СЛОВА БЕЗ ПЕРЕВОДА тоже кликабельны. Молчащее слово выглядит как поломка
// («почему тут не работает?»), а услышать произношение полезно и без перевода.

const HOVER_DELAY = 90

/** Ширина карточки перевода. Уже — начинает переносить корейские пометки. */
const POP_W = 264

export default function GlossedText({ text, lang, extra = [], accent, style }: {
  text: string
  /** Код языка: en, ko, ja, pt-BR — им же озвучиваем. */
  lang: string
  /** Глоссарий текста: его значения важнее словарных. */
  extra?: WordGloss[]
  accent: string
  style?: React.CSSProperties
}) {
  const t = useT()
  const lex = useMemo(() => buildLexicon(lang, extra), [lang, extra])
  const segments = useMemo(() => lex.segment(text), [lex, text])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const timer = useRef<number | null>(null)
  // active — что показываем, pinned — показываем ли после ухода курсора.
  const [active, setActive] = useState<{ i: number; seg: Segment } | null>(null)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null)

  // На тач-устройстве наведение эмулируется и «залипает» — там только тап.
  const canHover = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches,
    [],
  )

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Закрытие: клик мимо или Esc. Скролл карточку не трогает — она лежит внутри
  // абзаца и едет вместе со словом, к которому привязана.
  useEffect(() => {
    if (!active) return
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  function close() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setActive(null)
    setPinned(false)
    setPos(null)
  }

  /** Координаты карточки относительно обёртки — она position: relative. */
  function place(el: HTMLElement) {
    const wrap = wrapRef.current
    if (!wrap) return
    const w = wrap.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    // Над словом, если под ним меньше 190px до низа окна.
    const above = window.innerHeight - r.bottom < 190
    const centre = r.left - w.left + r.width / 2
    const x = Math.max(4, Math.min(centre - POP_W / 2, Math.max(4, w.width - POP_W - 4)))
    setPos({ x, y: above ? r.top - w.top : r.bottom - w.top, above })
  }

  function open(i: number, seg: Segment, el: HTMLElement, pin: boolean) {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    setActive({ i, seg })
    setPinned(pin)
    place(el)
  }

  function speak(word: string) {
    if (typeof speechSynthesis === 'undefined') return
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(word)
    u.lang = lang
    u.rate = 0.85
    speechSynthesis.speak(u)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', whiteSpace: 'pre-wrap', ...style }}>
      {segments.map((seg, i) => {
        if (!seg.word) return <span key={i}>{seg.text}</span>
        const on = active?.i === i
        return (
          <span
            key={i}
            role="button"
            tabIndex={-1}
            onClick={e => {
              if (on && pinned) close()
              else open(i, seg, e.currentTarget, true)
            }}
            onMouseEnter={e => {
              if (!canHover || pinned) return
              const el = e.currentTarget
              if (timer.current) clearTimeout(timer.current)
              timer.current = window.setTimeout(() => open(i, seg, el, false), HOVER_DELAY)
            }}
            onMouseLeave={() => {
              if (!canHover || pinned) return
              if (timer.current) { clearTimeout(timer.current); timer.current = null }
              setActive(a => (a?.i === i ? null : a))
            }}
            style={{
              cursor: 'pointer',
              borderRadius: 4,
              // Известное слово помечено пунктиром — видно, что в тексте есть
              // опора. Сплошная подсветка на каждом слове превратила бы абзац в
              // рябь, поэтому фон только у активного.
              borderBottom: seg.gloss ? `1px dotted ${accent}80` : '1px dotted transparent',
              background: on ? `${accent}22` : 'transparent',
              boxShadow: on ? `0 0 0 2px ${accent}22` : 'none',
            }}
          >
            {seg.text}
          </span>
        )
      })}

      {active && pos && (
        <div
          style={{
            position: 'absolute', left: pos.x, top: pos.y, width: POP_W, zIndex: 40,
            transform: pos.above ? 'translateY(-100%) translateY(-8px)' : 'translateY(8px)',
            padding: '11px 13px 10px', borderRadius: 14,
            background: 'var(--color-bg-4)', border: '1px solid var(--color-border-strong)',
            boxShadow: 'var(--shadow-lg)', whiteSpace: 'normal',
            pointerEvents: pinned ? 'auto' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
                {active.seg.text}
              </div>
              {active.seg.gloss?.reading && (
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 1 }}>
                  {active.seg.gloss.reading}
                </div>
              )}
            </div>
            <button
              onClick={() => speak(active.seg.text)}
              title={t('Произнести')}
              aria-label={t('Произнести')}
              style={{
                width: 28, height: 28, flexShrink: 0, borderRadius: '50%', border: 'none',
                cursor: 'pointer', display: 'grid', placeItems: 'center',
                background: `${accent}22`, color: accent, pointerEvents: 'auto',
              }}
            >
              <Volume2 size={14} />
            </button>
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-2)', marginTop: 6 }}>
            {active.seg.gloss
              ? active.seg.gloss.ru
              : <span style={{ color: 'var(--color-text-3)' }}>{t('Этого слова нет в словаре — но послушать можно.')}</span>}
          </div>
          {active.seg.gloss?.note && (
            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text-3)', marginTop: 5 }}>
              {active.seg.gloss.note}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
