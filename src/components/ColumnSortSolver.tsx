// ─────────────────────────────────────────────────────────────────────────────
// «Разложить по столбцам» (columnSort) — много к одному
//
// ЧЕМ ЭТО НЕ «СОПОСТАВЛЕНИЕ». Там пары один-к-одному: у каждого слова своя
// пара, и каждый ответ живёт сам по себе. Здесь десять предметов на три
// корзины, и корзина не расходуется — ученик показывает ПРИЗНАК: der/die/das,
// правильные и неправильные глаголы, счётное и несчётное. Пару можно
// вызубрить, признак — нет.
//
// ТАПАМИ, А НЕ ПЕРЕТАСКИВАНИЕМ. Половина работы идёт с телефона, а
// перетаскивание там конфликтует с прокруткой страницы: палец, начавший
// движение на плитке, либо тащит её, либо листает — угадать нельзя.
// Тап «предмет → корзина» однозначен и работает мышью и пальцем одинаково.
//
// Ответ — строка-JSON «номер предмета → номер столбца».
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { answerMap, type SortItem } from '../data/taskTypes'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

/** Устойчивая перестановка банка: авторский порядок выдал бы ответ. */
function shuffled<T>(items: T[], key: (x: T, i: number) => string): T[] {
  const hash = (s: string) => {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
    return h
  }
  return items
    .map((x, i) => ({ x, k: hash(key(x, i)) }))
    .sort((a, b) => a.k - b.k)
    .map(v => v.x)
}

export default function ColumnSortSolver({ columns, items, value, disabled, showVerdict, onChange }: {
  columns: string[]
  items: SortItem[]
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const [answerNow, emit] = useOwnString(value, onChange)
  const given = useMemo(() => answerMap(answerNow), [answerNow])
  const [picked, setPicked] = useState<number | null>(null)

  // Порядок банка считаем один раз на состав: иначе плитки прыгали бы после
  // каждой раскладки, и ученик терял бы взглядом то, что ещё не разложено.
  const order = useMemo(
    () => shuffled(items.map((_, i) => i), i => `${items[i].text}#${i}`),
    [items],
  )

  const placeIn = (col: number) => {
    if (disabled || picked === null) return
    playPop()
    vibrate(8)
    const item = picked
    emit(prev => JSON.stringify({ ...answerMap(prev), [String(item)]: String(col) }))
    setPicked(null)
  }

  const takeBack = (i: number) => {
    if (disabled) return
    vibrate(6)
    emit(prev => {
      const map = answerMap(prev)
      delete map[String(i)]
      return JSON.stringify(map)
    })
  }

  const Tile = ({ i, inColumn }: { i: number; inColumn: boolean }) => {
    const item = items[i]
    const at = given[String(i)]
    const ok = showVerdict && at !== undefined ? Number(at) === item.column : null
    const active = picked === i
    return (
      <motion.button
        layout
        whileTap={disabled ? undefined : { scale: 0.96 }}
        onClick={() => {
          if (disabled) return
          if (inColumn) { takeBack(i); return }
          setPicked(active ? null : i)
        }}
        style={{
          padding: '7px 12px', borderRadius: 11, fontFamily: 'inherit',
          fontSize: 14.5, fontWeight: 650, lineHeight: 1.25,
          cursor: disabled ? 'default' : 'pointer',
          border: `1.5px solid ${
            ok === null
              ? (active ? 'var(--color-accent)' : 'var(--color-border-strong)')
              : ok ? '#6EE7A0' : '#F48B91'
          }`,
          background: ok === null
            ? (active ? 'var(--color-purple-soft)' : 'rgba(var(--glass-rgb), 0.96)')
            : ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
          color: 'var(--color-text)',
        }}
      >
        {item.text}
        {/* Куда предмет относился на самом деле — только там, где не сошлось. */}
        {ok === false && (
          <span style={{ marginLeft: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-green-text)' }}>
            → {columns[item.column]}
          </span>
        )}
      </motion.button>
    )
  }

  const loose = order.filter(i => given[String(i)] === undefined)

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      {/* Банк: то, что ещё не разложено. Пустеет по ходу работы. */}
      <div className="flex flex-wrap" style={{ gap: 8, minHeight: 40 }}>
        {loose.length > 0
          ? loose.map(i => <Tile key={i} i={i} inColumn={false} />)
          : (
            <span style={{ fontSize: 12.5, color: 'var(--color-text-3)', alignSelf: 'center' }}>
              {t('Всё разложено')}
            </span>
          )}
      </div>

      <div style={{
        display: 'grid', gap: 8,
        gridTemplateColumns: `repeat(${Math.min(columns.length, 3)}, minmax(0, 1fr))`,
      }}>
        {columns.map((name, ci) => {
          const inside = order.filter(i => Number(given[String(i)]) === ci)
          const armed = picked !== null && !disabled
          return (
            <div
              key={ci}
              onClick={() => placeIn(ci)}
              style={{
                display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start',
                padding: 10, borderRadius: 14, minHeight: 92,
                cursor: armed ? 'pointer' : 'default',
                border: `1.5px ${armed ? 'solid' : 'dashed'} ${armed ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
                background: armed ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
                transition: 'background .12s, border-color .12s',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text-3)', letterSpacing: 0.3 }}>
                {name}
              </span>
              {inside.map(i => <Tile key={i} i={i} inColumn />)}
            </div>
          )
        })}
      </div>

      {!disabled && !showVerdict && (
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
          {t('Тап по слову, затем по столбцу. Тап по разложенному вернёт его назад')}
        </span>
      )}
    </div>
  )
}
