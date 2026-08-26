// ─────────────────────────────────────────────────────────────────────────────
// «Сборка из блоков» — последовательность собирается тапами, а не стрелками.
//
// ЧЕМ ОТЛИЧАЕТСЯ ОТ sequence. У sequence список УЖЕ стоит на экране, и ученик
// лишь двигает готовые строки вверх-вниз — стартовая расстановка сама по себе
// «какой-то ответ». Здесь строка ответа пустая: каждый блок нужно взять из
// банка самому, и порядок целиком выбирает ученик. Это та же разница, что
// между «поправь чужой черновик» и «напиши сам».
//
// Ответ — перестановка авторских индексов в порядке тапов («2,0,1»), ровно
// формат sequence: проверка у типов общая, верно при [0,1,2,…].
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

export default function BlockOrderSolver({ items, value, disabled, showVerdict, onChange }: {
  /** Блоки в правильном (авторском) порядке. */
  items: string[]
  /** Перестановка авторских индексов через запятую — в порядке тапов. */
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()

  // Банк показывается в детерминированной перестановке (не авторской: порядок
  // банка не должен подсказывать ответ; и не случайной: плитки не должны
  // прыгать между перерисовками).
  const bankOrder = useMemo(() => {
    const hash = (s: string) => {
      let h = 0
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
      return h
    }
    const order = items.map((_, i) => i).sort((a, b) => hash(`${items[a]}#${a}`) - hash(`${items[b]}#${b}`))
    // Совпало с авторским порядком — сдвигаем: готовый ответ в банке не банк.
    if (order.every((v, i) => v === i) && order.length > 1) order.push(order.shift()!)
    return order
  }, [items])

  // Ответ из хука: два тапа по блокам в одном рендере иначе затирают друг друга.
  const [answerNow, emit] = useOwnString(value, onChange)
  const parse = (s: string) =>
    s.split(',').map(Number).filter(n => Number.isFinite(n) && n >= 0 && n < items.length)
  const picked = useMemo(() => parse(answerNow), [answerNow, items.length])
  const pickedSet = new Set(picked)
  const full = picked.length >= items.length

  const pick = (idx: number) => {
    if (disabled) return
    playPop()
    vibrate(8)
    // База — из prev: два тапа в одном рендере иначе затирают друг друга.
    emit(prev => {
      const now = parse(prev)
      return now.length >= items.length || now.includes(idx) ? prev : [...now, idx].join(',')
    })
  }
  const removeAt = (pos: number) => {
    if (disabled) return
    vibrate(6)
    emit(prev => parse(prev).filter((_, i) => i !== pos).join(','))
  }

  // Куски ОДНОГО предложения собираются в строку — как само предложение, слева
  // направо; номера мест там лишние, порядок читается сам. Целые реплики
  // (диалог, шаги инструкции) идут колонкой с номерами: в строке они
  // выстраиваются в неразбираемую кашу из четырёх предложений подряд.
  //
  // Отличаем по концевой пунктуации, а не по одной длине: «만나서 반갑습니다.» и
  // «한국어를» бывают одной длины, но первое — законченная реплика, второе —
  // кусок. Точка, восклицательный и вопросительный знак и есть та граница.
  const inline = items.every(s => {
    const trimmed = s.trim()
    return Array.from(trimmed).length <= 14 && !/[.!?…。！？]$/.test(trimmed)
  })

  const blockSt = (state: 'answer' | 'bank' | 'spent', verdict?: 'good' | 'bad'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
    padding: '10px 13px', borderRadius: 13, fontFamily: 'inherit',
    fontSize: 14, lineHeight: 1.35, fontWeight: 600, color: 'var(--color-text)',
    border: `1px solid ${
      verdict === 'good' ? '#6EE7A0'
        : verdict === 'bad' ? '#F48B91'
        : state === 'answer' ? 'rgba(var(--accent-rgb), 0.38)'
        : 'var(--color-border-strong)'
    }`,
    background: verdict === 'good' ? 'var(--color-green-soft)'
      : verdict === 'bad' ? 'var(--color-red-soft)'
      : state === 'answer' ? 'var(--color-purple-soft)'
      : state === 'spent' ? 'var(--color-bg-3)' : 'rgba(var(--glass-rgb), 0.96)',
    opacity: state === 'spent' ? 0.4 : 1,
    cursor: disabled || state === 'spent' ? 'default' : 'pointer',
  })

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {/* Строка ответа. Тап по блоку возвращает его в банк. Куски предложения
          встают в строку (номера не нужны — порядок читается слева направо),
          длинные реплики — колонкой с номерами мест. */}
      <div
        className={inline ? 'flex flex-wrap items-center' : 'flex flex-col'}
        style={{
          gap: 8, minHeight: 58, borderRadius: 18, padding: '12px 14px',
          background: 'var(--color-bg-3)',
          justifyContent: inline ? 'center' : undefined,
          border: showVerdict
            ? `2px solid ${picked.every((v, i) => v === i) && full ? 'rgba(110,231,160,0.6)' : 'rgba(244,139,145,0.55)'}`
            : '2px dashed var(--color-border-strong)',
        }}
      >
        {picked.length === 0
          ? (
            <span style={{ fontSize: 13, color: 'var(--color-muted)', alignSelf: 'center', padding: '6px 0' }}>
              {t('Нажимай на блоки в правильном порядке')}
            </span>
          )
          : picked.map((idx, pos) => {
            const verdict = showVerdict ? (idx === pos ? 'good' as const : 'bad' as const) : undefined
            return (
              <motion.button
                key={`ans-${idx}`}
                initial={{ scale: 0.92, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15 }}
                onClick={() => removeAt(pos)}
                disabled={disabled}
                style={blockSt('answer', verdict)}
              >
                {!inline && (
                  <span style={{
                    width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                    background: 'rgba(var(--glass-rgb), 0.85)', color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{pos + 1}</span>
                )}
                <span style={{ flex: 1 }}>{items[idx]}</span>
              </motion.button>
            )
          })}
      </div>

      {/* Банк блоков. Потраченные гаснут на месте — блоки не прыгают. */}
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        {bankOrder.map(idx => {
          const spent = pickedSet.has(idx)
          return (
            <motion.button
              key={`bank-${idx}`}
              whileTap={disabled || spent || full ? undefined : { scale: 0.96 }}
              onClick={() => pick(idx)}
              disabled={disabled || spent || full}
              style={blockSt(spent ? 'spent' : 'bank')}
            >
              {items[idx]}
            </motion.button>
          )
        })}
      </div>

      {picked.length > 0 && !disabled && !showVerdict && (
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
          {t('Тап по блоку в ответе возвращает его в банк')}
        </span>
      )}
    </div>
  )
}
