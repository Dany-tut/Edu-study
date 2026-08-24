// ─────────────────────────────────────────────────────────────────────────────
// Посимвольная сборка тапами — два родственных задания без клавиатуры:
//
// • unscramble — «написано неправильно»: банк плиток и ЕСТЬ неправильное
//   написание (요하녕세안), в нём ровно те слоги, что нужны, и ничего лишнего.
//   Ученик видит ошибку и пересобирает слово правильно — как в рабочих
//   тетрадях «Unscramble and Write».
//
// • charBank — ряд слогов с обманками: среди плиток есть похожие слоги,
//   которые в слово не входят (안 ↔ 언, 하 ↔ 카). Найти нужное среди
//   похожего — это и есть чтение, а не узнавание знакомой картинки.
//
// Единица сборки — знак без пробелов (charUnits): для хангыля слог, для
// алфавитного языка буква. Ответ наружу уходит склейкой выбранных плиток —
// ровно то, что сверяет gradeTask() этих типов.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { charUnits, scrambleUnits } from '../data/taskTypes'
import { isSyllable, syllableDistractors } from '../data/hangul'
import { playPop, vibrate } from '../lib/sound'
import { useT } from '../lib/i18n'

type Tile = { ch: string; key: string }

export default function CharTilesSolver({ mode, answer, distractors = [], value, disabled, showVerdict, onChange }: {
  /** unscramble — плитки без обманок в «неправильном» порядке; bank — с обманками. */
  mode: 'unscramble' | 'bank'
  /** Эталонное слово или фраза (пробелы не считаются). */
  answer: string
  /** Авторские обманки; пусто у bank-режима — подберутся похожие слоги сами. */
  distractors?: string[]
  /** Выбранные плитки, склеенные подряд. */
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const need = useMemo(() => charUnits(answer), [answer])

  const tiles = useMemo<Tile[]>(() => {
    if (mode === 'unscramble') {
      // Банк и есть «неправильное написание»: порядок плиток — та самая ошибка.
      return scrambleUnits(need).map((ch, i) => ({ ch, key: `${ch}#${i}` }))
    }
    // Ряд с обманками: авторские, а без них — похожие слоги по confusable-парам.
    const authored = distractors.flatMap(charUnits)
    const extra = authored.length > 0
      ? authored
      : need.some(isSyllable) ? syllableDistractors(answer, 3) : []
    return scrambleUnits([...need, ...extra]).map((ch, i) => ({ ch, key: `${ch}#${i}` }))
  }, [mode, need, distractors, answer])

  const picked = useMemo(() => Array.from(value ?? ''), [value])
  const full = picked.length >= need.length
  const correct = full && picked.join('') === need.join('')

  // Банк = все плитки минус уже потраченные вхождения (повторы — по счётчику).
  const spentLeft = new Map<string, number>()
  for (const ch of picked) spentLeft.set(ch, (spentLeft.get(ch) ?? 0) + 1)
  const remaining = tiles.map(tile => {
    const n = spentLeft.get(tile.ch) ?? 0
    if (n > 0) { spentLeft.set(tile.ch, n - 1); return { ...tile, spent: true } }
    return { ...tile, spent: false }
  })

  const pick = (ch: string) => {
    if (disabled || full) return
    playPop()
    vibrate(8)
    onChange([...picked, ch].join(''))
  }
  const removeAt = (i: number) => {
    if (disabled) return
    vibrate(6)
    onChange(picked.filter((_, idx) => idx !== i).join(''))
  }
  const big = need.some(isSyllable)

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {/* Строка сборки. Плитки в ней живые: тап возвращает слог в банк. */}
      <div
        className="flex flex-wrap items-center justify-center"
        style={{
          minHeight: 76, borderRadius: 20, padding: '12px 14px', gap: 8,
          background: 'var(--color-bg-3)',
          border: showVerdict
            ? `2px solid ${correct ? 'rgba(110,231,160,0.6)' : 'rgba(244,139,145,0.55)'}`
            : '2px dashed var(--color-border-strong)',
        }}
      >
        {picked.length === 0
          ? (
            <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              {mode === 'unscramble'
                ? t('Нажимай на плитки — собери слово правильно')
                : t('Нажимай на нужные плитки по порядку')}
            </span>
          )
          : picked.map((ch, i) => (
            <motion.button
              key={`p-${i}-${ch}`}
              initial={{ scale: 0.8, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              onClick={() => removeAt(i)}
              disabled={disabled}
              style={{
                minWidth: big ? 46 : 38, padding: big ? '8px 10px' : '7px 9px', borderRadius: 12,
                border: '1px solid rgba(99,84,207,0.38)', background: 'var(--color-purple-soft)',
                color: 'var(--color-text)', fontFamily: 'inherit',
                fontSize: big ? 26 : 19, lineHeight: 1.15, fontWeight: 700,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {ch}
            </motion.button>
          ))}
      </div>

      {/* Банк плиток. У unscramble его порядок — «неправильное написание». */}
      <div className="flex flex-wrap items-center justify-center" style={{ gap: 10 }}>
        {remaining.map(tile => (
          <motion.button
            key={tile.key}
            whileTap={disabled || tile.spent || full ? undefined : { scale: 0.94 }}
            onClick={() => pick(tile.ch)}
            disabled={disabled || tile.spent || full}
            style={{
              minWidth: big ? 56 : 44, padding: big ? '12px 13px' : '10px 11px', borderRadius: 16,
              border: '1px solid var(--color-border-strong)',
              background: tile.spent ? 'var(--color-bg-3)' : 'rgba(var(--glass-rgb), 0.96)',
              color: tile.spent ? 'var(--color-muted)' : 'var(--color-text)',
              opacity: tile.spent ? 0.4 : 1,
              fontFamily: 'inherit', fontSize: big ? 27 : 20, lineHeight: 1.15, fontWeight: 700,
              cursor: disabled || tile.spent || full ? 'default' : 'pointer',
            }}
          >
            {tile.ch}
          </motion.button>
        ))}
      </div>

      {picked.length > 0 && !disabled && !showVerdict && (
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
          {t('Тап по плитке в строке возвращает её в банк')}
        </span>
      )}

      {showVerdict && !correct && (
        <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--color-green-text)', fontWeight: 700 }}>
          {t('Правильно')}: {answer}
        </p>
      )}
    </div>
  )
}
