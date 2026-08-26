// ─────────────────────────────────────────────────────────────────────────────
// «Пропуски по банку слов» (wordDrop) — десять слов на десять строк
//
// ЧЕМ ЭТО НЕ «ВПИСАТЬ ОТВЕТ». Дыра здесь не одна: банк слов ОБЩИЙ на всю пачку
// строк, и поставленное слово из банка уходит. Поэтому ошибка в первой строке
// отнимает слово у седьмой, и ученик вынужден различать слова между собой, а не
// вспоминать каждое поодиночке. Десять отдельных «впиши ответ» этого не дают.
//
// ПОЧЕМУ РЯДОМ СТОИТ ПЕРЕВОД. Так это и печатают в рабочих тетрадях: перевод
// строки — не подсказка ответа, а условие задачи. Без него «친구와 ____이 있는데
// 늦었어요» решается перебором, а не пониманием.
//
// Ответ уходит наружу строкой-JSON «номер строки → слово» — тем же способом,
// что у таблицы и дрилла: хранилище домашки держит на задание одну строку.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { GAP_MARK, type GapRow } from '../data/taskTypes'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

/** Ответы строк лежат одной строкой-JSON. */
export function parseDrops(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, string> : {}
  } catch { return {} }
}

/** Устойчивая перестановка банка — не авторская и не случайная. */
function shuffled(words: string[]): string[] {
  const hash = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return h
  }
  return words.map((w, i) => ({ w, k: hash(`${w}#${i}`) })).sort((a, b) => a.k - b.k).map(x => x.w)
}

export default function WordDropSolver({ rows, distractors = [], value, disabled, showVerdict, rowCorrect, onChange }: {
  rows: GapRow[]
  /** Лишние слова: банк больше, чем дыр, — иначе последнее слово ставится само. */
  distractors?: string[]
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  /** Верна ли строка — считает родитель (у него все правила форм ответа). */
  rowCorrect?: (index: number, given: string | undefined) => boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const [active, setActive] = useState(0)
  const [answerNow, emit] = useOwnString(value, onChange)
  const given = useMemo(() => parseDrops(answerNow), [answerNow])

  const bank = useMemo(
    () => shuffled([...rows.map(r => r.answer), ...distractors]),
    [rows, distractors],
  )

  // Слово, уже поставленное в строку, из банка уходит: повторов среди слов дня
  // не бывает, а «одно слово в две дыры» — это не ответ.
  const usedCount = new Map<string, number>()
  for (const v of Object.values(given)) if (v) usedCount.set(v, (usedCount.get(v) ?? 0) + 1)

  const put = (word: string) => {
    if (disabled) return
    playPop()
    vibrate(8)
    emit(prev => {
      const map = parseDrops(prev)
      // Кладём в выбранную строку, а если она занята — в первую свободную:
      // тапать по банку, не выбрав строку, ученик будет всегда.
      let slot = active
      if (map[String(slot)]) {
        const free = rows.findIndex((_, i) => !map[String(i)])
        if (free >= 0) slot = free
      }
      return JSON.stringify({ ...map, [String(slot)]: word })
    })
    const free = rows.findIndex((_, i) => !given[String(i)] && i !== active)
    setActive(free >= 0 ? free : active)
  }

  const clear = (i: number) => {
    if (disabled) return
    vibrate(6)
    setActive(i)
    emit(prev => {
      const map = parseDrops(prev)
      delete map[String(i)]
      return JSON.stringify(map)
    })
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {rows.map((row, i) => {
          const word = given[String(i)]
          const [before, after] = row.text.split(GAP_MARK)
          const ok = showVerdict && rowCorrect?.(i, word)
          const chosen = active === i && !disabled && !showVerdict
          return (
            <div
              key={i}
              onClick={() => !disabled && setActive(i)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 3,
                padding: '10px 13px', borderRadius: 14,
                cursor: disabled ? 'default' : 'pointer',
                border: `1px solid ${
                  showVerdict ? (ok ? '#6EE7A0' : '#F48B91')
                    : chosen ? 'rgba(var(--accent-rgb), 0.45)' : 'var(--color-border-soft)'
                }`,
                background: showVerdict
                  ? (ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)')
                  : chosen ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
              }}
            >
              <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)' }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--color-text-4)', marginRight: 7 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {before}
                <motion.button
                  key={word || 'empty'}
                  initial={word ? { scale: 0.8, opacity: 0.4 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  onClick={e => { e.stopPropagation(); word ? clear(i) : setActive(i) }}
                  disabled={disabled}
                  style={{
                    display: 'inline-block', minWidth: 78, margin: '0 5px', padding: '2px 11px',
                    borderRadius: 9, fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
                    textAlign: 'center', verticalAlign: 'middle',
                    color: word ? 'var(--color-text)' : 'var(--color-text-4)',
                    border: word ? '1.5px solid rgba(var(--accent-rgb), 0.4)' : '1.5px dashed var(--color-border-strong)',
                    background: word ? 'rgba(var(--glass-rgb), 0.96)' : 'transparent',
                    cursor: disabled ? 'default' : 'pointer',
                  }}
                >
                  {word || ' '}
                </motion.button>
                {after}
              </div>
              {row.gloss && (
                <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>{row.gloss}</div>
              )}
              {showVerdict && !ok && (
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)' }}>
                  {t('Правильно')}: {row.answer}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Общий банк слов. Поставленное слово гаснет на месте — банк не прыгает. */}
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {bank.map((word, i) => {
          const left = usedCount.get(word) ?? 0
          const spent = left > 0 && bank.slice(0, i).filter(w => w === word).length < left
          return (
            <motion.button
              key={`${word}#${i}`}
              whileTap={disabled || spent ? undefined : { scale: 0.95 }}
              onClick={() => !spent && put(word)}
              disabled={disabled || spent}
              style={{
                padding: '8px 14px', borderRadius: 11, fontFamily: 'inherit',
                fontSize: 14.5, fontWeight: 650, lineHeight: 1.25,
                border: '1px solid var(--color-border-strong)',
                background: spent ? 'var(--color-bg-3)' : 'rgba(var(--glass-rgb), 0.96)',
                color: spent ? 'var(--color-muted)' : 'var(--color-text)',
                opacity: spent ? 0.4 : 1,
                cursor: disabled || spent ? 'default' : 'pointer',
              }}
            >
              {word}
            </motion.button>
          )
        })}
      </div>

      {!disabled && !showVerdict && (
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
          {t('Тап по строке выбирает её, тап по слову в строке возвращает его в банк')}
        </span>
      )}
    </div>
  )
}
