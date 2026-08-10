import { useEffect, useMemo, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { buildLexicon, type Segment } from '../lib/lexicon'
import { transcribe } from '../lib/translit'
import type { WordGloss } from '../data/wordGloss'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap } from '../lib/typography'
import { hasTiers, tierLabel, tierNote, wordTier } from '../data/coreWords'

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

/**
 * Плашка «ядро» / «полезное» под переводом.
 *
 * Отдельным компонентом, потому что это же нужно карточкам, разговорнику и
 * разбору гнёзд: вес слова — свойство слова, а не текста, в котором оно стоит.
 */
export function TierChip({ term, lang, accent, style }: {
  term: string
  lang: string
  accent: string
  style?: React.CSSProperties
}) {
  const t = useT()
  if (!hasTiers(lang)) return null
  const tier = wordTier(term, lang)
  if (tier === 3) return null
  const core = tier === 1
  return (
    <div
      title={t(tierNote(tier))}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 7,
        padding: '2px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 800,
        background: core ? `${accent}22` : 'var(--color-bg-3)',
        color: core ? accent : 'var(--color-muted)',
        ...style,
      }}
    >
      {t(tierLabel(tier))}
    </div>
  )
}

/** Ширина карточки перевода. Уже — начинает переносить корейские пометки. */
const POP_W = 264

export default function GlossedText({ text, lang, extra = [], accent, overlay = false, style }: {
  text: string
  /** Код языка: en, ko, ja, pt-BR — им же озвучиваем. */
  lang: string
  /** Глоссарий текста: его значения важнее словарных. */
  extra?: WordGloss[]
  accent: string
  /**
   * Выносить подсказку из потока — в портал поверх страницы.
   *
   * ЗАЧЕМ. Обычно карточка лежит абсолютом внутри абзаца и едет вместе с ним
   * при скролле — это правильно для текста, который читают целиком. Но текст
   * бывает и внутри коробки со своими границами: карточка стопки поворачивается
   * (transform), её оборот прокручивается (overflow), и любой из этих предков
   * обрезает подсказку — слово подсвечивалось, а перевода не было видно вовсе.
   * С overlay подсказка рисуется в body по координатам окна, поэтому её не
   * режет ничей overflow; расплата — она не едет со скроллом, поэтому на скролл
   * закрывается.
   */
  overlay?: boolean
  style?: React.CSSProperties
}) {
  const t = useT()
  const lex = useMemo(() => buildLexicon(lang, extra), [lang, extra])
  const segments = useMemo(() => lex.segment(text), [lex, text])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const popRef = useRef<HTMLDivElement | null>(null)
  const timer = useRef<number | null>(null)
  // Слово, к которому привязана открытая карточка: по нему её переставляют,
  // когда размеры уже известны (см. эффект ниже).
  const activeEl = useRef<HTMLElement | null>(null)
  // active — что показываем, pinned — показываем ли после ухода курсора.
  const [active, setActive] = useState<{ i: number; seg: Segment } | null>(null)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; w: number; above: boolean } | null>(null)

  // На тач-устройстве наведение эмулируется и «залипает» — там только тап.
  const canHover = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(hover: hover)').matches,
    [],
  )

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  // Закрытие: клик мимо или Esc. Скролл карточку не трогает — она лежит внутри
  // абзаца и едет вместе со словом, к которому привязана.
  //
  // «Мимо» — это всё, кроме самой карточки и слова, которое её открыло: тыкать
  // повторно в то же слово, чтобы убрать подсказку, — лишний прицел, гасить
  // должно любое место страницы. Слово-хозяин исключено, иначе mousedown закрыл
  // бы карточку раньше, чем сработал его же click, и она бы тут же открылась
  // заново (переключение «клик по слову = закрыть» перестало бы работать).
  useEffect(() => {
    if (!active) return
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (popRef.current?.contains(target)) return
      if (activeEl.current?.contains(target)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [active])

  // Пересчёт после открытия. Первый замер делается в обработчике клика, и если
  // абзац в этот момент ещё не разложен по строкам (не догрузился шрифт для
  // корейского или японского), координаты получаются от промежуточной вёрстки —
  // карточка уезжает на сотни пикселей. Поэтому меряем ещё раз, когда размеры
  // уже настоящие, и при каждом изменении ширины.
  useEffect(() => {
    if (!active) return
    const again = () => { if (activeEl.current) place(activeEl.current) }
    const t1 = window.setTimeout(again, 0)
    const t2 = window.setTimeout(again, 160)
    window.addEventListener('resize', again)
    const ro = new ResizeObserver(again)
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', again)
      ro.disconnect()
    }
  }, [active])

  function close() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    activeEl.current = null
    setActive(null)
    setPinned(false)
    setPos(null)
  }

  /**
   * Координаты карточки: относительно обёртки (она position: relative) или
   * относительно окна, если подсказка вынесена в портал.
   */
  function place(el: HTMLElement) {
    const wrap = wrapRef.current
    if (!wrap) return
    const w = overlay ? { left: 0, top: 0 } : wrap.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    // Над словом, если под ним меньше 190px до низа окна.
    const above = window.innerHeight - r.bottom < 190
    const width = Math.min(POP_W, window.innerWidth - 16)
    // Карточка стоит ПО ЦЕНТРУ слова, а упирается в края ЭКРАНА, а не колонки
    // текста. Ограничение по колонке выглядело сдвигом: у слова в начале строки
    // карточку прижимало к левому краю абзаца, хотя рядом было пусто.
    const centreVp = r.left + r.width / 2
    const xVp = Math.max(8, Math.min(centreVp - width / 2, window.innerWidth - width - 8))
    setPos({ x: xVp - w.left, y: above ? r.top - w.top : r.bottom - w.top, w: width, above })
  }

  function open(i: number, seg: Segment, el: HTMLElement, pin: boolean) {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    activeEl.current = el
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
    <div ref={wrapRef} style={{ position: 'relative', whiteSpace: 'pre-wrap', ...proseWrap, ...style }}>
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
          ref={popRef}
          style={{
            position: 'absolute', left: pos.x, top: pos.y, width: pos.w, zIndex: 40,
            transform: pos.above ? 'translateY(-100%) translateY(-8px)' : 'translateY(8px)',
            // Тот же радиус, что у карточек текста и вопросов: подсказка —
            // такой же блок интерфейса, а не всплывашка из другой системы.
            padding: '11px 13px 10px', borderRadius: 18,
            // Матовое стекло, как у остальных всплывающих слоёв: сквозь него
            // видно, над каким местом текста карточка стоит, но читаемость
            // держит размытие, а не глухая заливка.
            background: 'rgba(var(--glass-rgb), 0.82)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid var(--color-border-strong)',
            boxShadow: 'var(--shadow-lg)', whiteSpace: 'normal',
            pointerEvents: pinned ? 'auto' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
                {active.seg.text}
              </div>
              {/* Как это звучит. Написанное в словаре чтение важнее
                  посчитанного: там оно выверено человеком. */}
              {(active.seg.gloss?.reading || transcribe(active.seg.text, lang)) && (
                <div style={{ fontSize: 12.5, color: accent, marginTop: 2, opacity: 0.9 }}>
                  {active.seg.gloss?.reading || transcribe(active.seg.text, lang)}
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
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text-2)', marginTop: 6, ...proseWrap }}>
            {active.seg.gloss
              ? bindShortWords(active.seg.gloss.ru)
              : <span style={{ color: 'var(--color-text-3)' }}>{t('Этого слова нет в словаре — но послушать можно.')}</span>}
          </div>
          {/* Вес слова: стоит ли учить его сейчас. Показывается только у ядра и
              полезного — плашка «редкое» на каждом втором слове превратила бы
              подсказку в шум, а молчание здесь читается правильно (см.
              data/coreWords.ts). */}
          <TierChip term={active.seg.text} lang={lang} accent={accent} />
          {active.seg.gloss?.note && (
            <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text-3)', marginTop: 5, ...proseWrap }}>
              {bindShortWords(active.seg.gloss.note)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
