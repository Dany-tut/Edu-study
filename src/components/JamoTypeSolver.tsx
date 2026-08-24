// ─────────────────────────────────────────────────────────────────────────────
// «Набор по буквам» (jamoType) — экранная клавиатура вместо готовых плиток.
//
// Ученик нажимает БУКВЫ, и слоги складываются на глазах, как при настоящем
// наборе: ㅇ → ㅏ → 아 → ㄴ → 안, следующая ㄴ начинает 녀… Это ступень выше
// сборки слога: там плитка — готовый слог или буква на своё место, здесь
// ученик порождает слоги сам, клавиша за клавишей (composeKeys — тот же
// автомат, что в корейской раскладке: сдвоенные согласные, уезжающий патчхим).
//
// Ответ — нажатия через запятую; проверка сравнивает СОБРАННЫЙ текст, поэтому
// два пути набора одной буквы (ㅙ = ㅗ+ㅐ = ㅗ+ㅏ+ㅣ) равноправны.
//
// Удаление — тапом по собранному слову (снимается последнее нажатие), как во
// всех сборках: отдельной кнопки-подтирки в продукте нет.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { CHAMO, composeKeys, confusableWith, keysOf } from '../data/hangul'
import { charUnits } from '../data/taskTypes'
import { playPop, vibrate } from '../lib/sound'
import { useT } from '../lib/i18n'

export default function JamoTypeSolver({ answer, value, disabled, showVerdict, onChange }: {
  /** Эталонное слово (или фраза — пробелы не набираются). */
  answer: string
  /** Нажатия-буквы через запятую, в порядке нажатий. */
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const target = useMemo(() => charUnits(answer).join(''), [answer])
  const needKeys = useMemo(() => charUnits(answer).flatMap(keysOf), [answer])

  // Клавиатура: буквы слова плюс похожие обманки, в устойчивом алфавитном
  // порядке (подсказки порядком нет, плитки не прыгают). Клавиши не гаснут —
  // как на настоящей клавиатуре, одна буква нажимается сколько угодно раз.
  const keyboard = useMemo(() => {
    const base = [...new Set(needKeys)]
    const extra: string[] = []
    for (const k of base) {
      for (const d of confusableWith(k, 1)) {
        if (!base.includes(d) && !extra.includes(d)) extra.push(d)
      }
      if (extra.length >= 4) break
    }
    return [...base, ...extra.slice(0, 4)].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [needKeys])

  const picked = useMemo(() => (value ? value.split(',').filter(Boolean) : []), [value])
  const typed = useMemo(() => composeKeys(picked), [picked])
  const full = picked.length >= needKeys.length
  const correct = typed === target

  const press = (k: string) => {
    if (disabled || full) return
    playPop()
    vibrate(8)
    onChange([...picked, k].join(','))
  }
  const back = () => {
    if (disabled || picked.length === 0) return
    vibrate(6)
    onChange(picked.slice(0, -1).join(','))
  }

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {/* Собираемое слово. Тап по нему снимает последнее нажатие. */}
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: 96, borderRadius: 22, padding: 16,
          background: 'var(--color-bg-3)',
          border: showVerdict
            ? `2px solid ${correct ? 'rgba(110,231,160,0.6)' : 'rgba(244,139,145,0.55)'}`
            : '2px dashed var(--color-border-strong)',
        }}
      >
        {typed
          ? (
            <motion.button
              key={typed}
              initial={{ scale: 0.92, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.15 }}
              onClick={back}
              disabled={disabled}
              title={t('Убрать последнее нажатие')}
              style={{
                fontSize: 44, lineHeight: 1.15, fontWeight: 700, color: 'var(--color-text)',
                border: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0,
                cursor: disabled ? 'default' : 'pointer', letterSpacing: 2,
              }}
            >
              {typed}
            </motion.button>
          )
          : (
            <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              {t('Нажимай буквы — слоги соберутся сами')}
            </span>
          )}
      </div>

      {/* Клавиатура. */}
      <div className="flex flex-wrap items-center justify-center" style={{ gap: 8 }}>
        {keyboard.map(k => (
          <motion.button
            key={k}
            whileTap={disabled || full ? undefined : { scale: 0.92 }}
            onClick={() => press(k)}
            disabled={disabled || full}
            className="flex flex-col items-center justify-center"
            style={{
              minWidth: 54, padding: '10px 12px', borderRadius: 14,
              border: '1px solid var(--color-border-strong)',
              background: 'rgba(var(--glass-rgb), 0.96)',
              color: 'var(--color-text)', opacity: full ? 0.55 : 1,
              fontFamily: 'inherit', cursor: disabled || full ? 'default' : 'pointer',
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1.1, fontWeight: 700 }}>{k}</span>
            <span style={{ fontSize: 10.5, color: 'var(--color-muted)', marginTop: 2 }}>
              {CHAMO[k]?.sound}
            </span>
          </motion.button>
        ))}
      </div>

      {picked.length > 0 && !disabled && !showVerdict && (
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
          {t('Тап по собранному слову убирает последнее нажатие')}
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
