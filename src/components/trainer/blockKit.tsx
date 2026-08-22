import { Volume2 } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { subjectFill } from '../../lib/subjects'
import { speak, speechText } from '../../lib/speech'
import type { EndingTone } from '../../data/koreanEndings'

// Общий набор для экранов-конструкторов: «Основы и хвосты» и «Корни слов».
//
// ЗАЧЕМ ОБЩИЙ ФАЙЛ. Оба экрана показывают одно и то же движение: слово или
// форма разложены на цветные плитки, одна плитка пустая, её надо поставить.
// Плитка, кнопки и перемешивание у них поэтому одни — иначе два конструктора
// разъедутся по геометрии на первой же правке и станут выглядеть как чужие
// друг другу разделы.

/**
 * Цвета плиток.
 *
 * Литеральных hex здесь нет: обе темы должны читаться, а тёмная у нас гасит
 * светлые заливки. Каждая пара — готовый токен фона и токен текста к нему,
 * подобранные под обе темы разом (см. index.css). Рамка и текст одного цвета:
 * плитка «нарисована от руки», и обводка — часть её цвета, а не отдельная
 * серая линия.
 */
export const TONE: Record<EndingTone, { bg: string; fg: string }> = {
  yellow: { bg: 'var(--color-yellow-soft)', fg: 'var(--color-yellow-text)' },
  blue:   { bg: 'var(--color-blue-pill-bg)', fg: 'var(--color-blue-pill-text)' },
  rose:   { bg: 'var(--color-rose-soft)', fg: 'var(--color-rose-text)' },
  peach:  { bg: 'var(--color-peach-soft)', fg: 'var(--color-peach-text)' },
  green:  { bg: 'var(--color-green-soft)', fg: 'var(--color-green-text)' },
  teal:   { bg: 'var(--color-teal-pill-bg)', fg: 'var(--color-teal-pill-text)' },
  purple: { bg: 'var(--color-purple-soft)', fg: 'var(--color-purple-text)' },
  red:    { bg: 'var(--color-red-soft)', fg: 'var(--color-red-text)' },
}

export const TONE_ORDER: EndingTone[] = ['yellow', 'blue', 'rose', 'peach', 'green', 'teal', 'purple', 'red']

/** Плитка конструктора. Основа, хвост, кирпич слова — всё это она. */
export function Block({ children, tone, accent, size = 'md', dashed, state, onClick, title }: {
  children: React.ReactNode
  /** Цвет плитки. Без него плитка красится акцентом предмета — так выглядит основа. */
  tone?: EndingTone
  accent: string
  size?: 'sm' | 'md' | 'lg'
  /** Пустое место под плитку — рамка есть, заливки нет. */
  dashed?: boolean
  /** Подсветка после ответа. */
  state?: 'good' | 'bad'
  onClick?: () => void
  title?: string
}) {
  const pal = tone ? TONE[tone] : { bg: `${accent}1F`, fg: accent }
  const fg =
    state === 'good' ? 'var(--color-green-text)'
    : state === 'bad' ? 'var(--color-red-text)'
    : pal.fg
  const bg =
    state === 'good' ? 'var(--color-green-soft)'
    : state === 'bad' ? 'var(--color-red-soft)'
    : dashed ? 'transparent'
    : pal.bg
  const pad = size === 'lg' ? '10px 18px' : size === 'sm' ? '5px 10px' : '8px 14px'
  const font = size === 'lg' ? 27 : size === 'sm' ? 15 : 21
  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: pad, borderRadius: 12, minWidth: size === 'lg' ? 62 : 44,
    // Рамка longhand'ами, а не сокращением: React ругается на смесь `border` и
    // `borderStyle` при перерисовке (и правда путает их порядок применения).
    borderWidth: 2, borderStyle: dashed ? 'dashed' : 'solid', borderColor: fg,
    background: bg, color: fg,
    fontFamily: 'inherit', fontSize: font, fontWeight: 750, lineHeight: 1.15,
    boxShadow: dashed ? 'none' : '2px 2px 0 var(--color-border-medium)',
    cursor: onClick ? 'pointer' : 'default',
  }
  return onClick
    ? <button type="button" onClick={onClick} title={title} style={style}>{children}</button>
    : <span title={title} style={style}>{children}</span>
}

/** Кнопка-динамик. Одна на все конструкторы. */
export function SpeakBtn({ term, lang, accent, size = 30 }: {
  term: string
  lang: string
  accent: string
  size?: number
}) {
  const t = useT()
  return (
    <button
      onClick={e => { e.stopPropagation(); speak(speechText(term), { lang, rate: 0.85 }) }}
      title={t('Произнести')}
      aria-label={t('Произнести')}
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: '50%', border: 'none',
        cursor: 'pointer', display: 'grid', placeItems: 'center',
        background: `${accent}22`, color: accent,
      }}
    >
      <Volume2 size={Math.round(size * 0.47)} />
    </button>
  )
}

export function say(term: string, lang: string, rate = 0.85): void {
  speak(speechText(term), { lang, rate })
}

/** Перемешать. Порядок вариантов свой у каждого вопроса — иначе ответ запоминается по месту. */
export function shuffle<T>(list: T[]): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Геометрия кнопок повторяет разбор созвучий: высота задаётся `height`, рамка
// лежит внутри бокса. Иначе сплошная кнопка выше соседней на две рамки.
const BTN_H = 42

const btnBase: React.CSSProperties = {
  height: BTN_H, boxSizing: 'border-box', borderRadius: 999, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  fontFamily: 'inherit', fontSize: 13.5, fontWeight: 750, lineHeight: 1, whiteSpace: 'nowrap',
}

export const primaryBtn = (accent: string): React.CSSProperties => ({
  ...btnBase,
  padding: '0 20px', border: 'none',
  background: subjectFill(accent), color: '#fff',
})

export const ghostBtn = (accent: string): React.CSSProperties => ({
  ...btnBase,
  padding: '0 18px',
  border: `1.5px solid ${accent}`, background: 'transparent', color: accent,
})
