// ─────────────────────────────────────────────────────────────────────────────
// Кроссворд по слогам (crossword)
//
// ЗАЧЕМ ОН, КОГДА ЕСТЬ КАРТОЧКИ И ПЛИТКИ. Это единственное задание, где слово
// вспоминается ПО ЗНАЧЕНИЮ И БЕЗ ЕДИНОЙ ПОДСКАЗКИ ФОРМЫ: ни банка плиток, ни
// вариантов, ни первой буквы — только «авария, 2 слога». Всё остальное в курсе
// так или иначе показывает ученику форму слова и просит её узнать; здесь форму
// надо достать из головы.
//
// ПОЧЕМУ КЛЕТКА — СЛОГ. Так печатают корейские кроссворды, и так слово лежит в
// памяти: 사고 — это 사 и 고, а не шесть букв. Для алфавитного языка знак — буква,
// и всё работает так же (см. lib/crossword.ts).
//
// КАК ВВОДЯТ БЕЗ КЛАВИАТУРЫ. Выбранная клетка набирается тем же слоговым
// сборщиком, что и остальные задания курса: тапаешь буквы — слог складывается и
// встаёт в клетку. Отдельной корейской клавиатуры ученику не нужно.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { buildCrossword, type CrosswordWord } from '../lib/crossword'
import { composeKeys, isSyllable, keysOf } from '../data/hangul'

/** Кана в ответе: по ней сетка узнаёт японское письмо. */
const KANA = /[぀-ヿ]/
import type { CrosswordClue } from '../data/taskTypes'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

/** Ответы клеток лежат одной строкой-JSON «строка,столбец → знак». */
export function parseCells(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const v = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, string> : {}
  } catch { return {} }
}

const CELL = 46

export default function CrosswordSolver({ clues, value, disabled, showVerdict, onChange }: {
  clues: CrosswordClue[]
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const grid = useMemo(() => buildCrossword(clues), [clues])
  const [answerNow, emit] = useOwnString(value, onChange)
  const filled = useMemo(() => parseCells(answerNow), [answerNow])
  // Выбранная клетка живёт и в состоянии (по нему она подсвечивается), и в
  // рефе (по нему обработчик узнаёт, КУДА писать). Одного состояния мало: выбор
  // клетки и первое нажатие буквы могут попасть в один рендер, и буква ушла бы
  // в клетку, выбранную до этого.
  const [at, setAt] = useState<string | null>(null)
  const atRef = useRef<string | null>(null)
  // Буквы, набранные для выбранной клетки, — живут только пока клетка выбрана.
  //
  // РЕФ, А НЕ СОСТОЯНИЕ. Три буквы слога нажимают очередью, и рендера между
  // ними может не случиться: обработчик со state читал бы пустой набор каждый
  // раз, и от «ㅇ ㅑ ㄱ» в клетке оставалась одна ㄱ. Показывать эти буквы
  // отдельно не нужно — в клетке и так виден собранный слог, — поэтому ref.
  const keys = useRef<string[]>([])

  /**
   * Письмо сетки. От него зависит и клавиатура, и то, как считается нажатие.
   *
   * ЗАЧЕМ РАЗЛИЧАТЬ. Клетки — это кнопки, а не поля ввода: без клавиатуры в
   * кроссворд нельзя ввести вообще ничего. Пока она была только корейской,
   * семьдесят девять японских кроссвордов ученик открыть мог, а решить — нет.
   */
  const script: 'hangul' | 'kana' | null = useMemo(() => {
    if (clues.some(c => Array.from(c.answer).some(isSyllable))) return 'hangul'
    if (clues.some(c => KANA.test(c.answer))) return 'kana'
    return null
  }, [clues])

  // Клавиатура: буквы всех ответов плюс пара похожих. Клетка набирается ими же,
  // чем собирают слоги в остальных заданиях курса.
  //
  // У каны клавиша — это сразу знак клетки (слогов из знаков не складывают),
  // поэтому в набор идут сами знаки ответов, в порядке кодировки — он же
  // порядок годзюона.
  const keyboard = useMemo(() => {
    const all = new Set<string>()
    for (const c of clues) {
      for (const u of Array.from(c.answer)) {
        if (script === 'kana') all.add(u)
        else for (const k of keysOf(u)) all.add(k)
      }
    }
    return [...all].sort((a, b) => (script === 'kana' ? a.localeCompare(b, 'ja') : a.localeCompare(b, 'ko')))
  }, [clues, script])

  const setCell = (k: string, ch: string) => {
    emit(prev => {
      const map = parseCells(prev)
      if (ch) map[k] = ch
      else delete map[k]
      return JSON.stringify(map)
    })
  }

  const press = (key: string) => {
    const cell = atRef.current
    if (disabled || !cell) return
    playPop()
    vibrate(8)
    // Кана: один знак — одна клетка, складывать нечего.
    if (script === 'kana') {
      keys.current = []
      setCell(cell, key)
      return
    }
    const next = [...keys.current, key]
    const composed = composeKeys(next)
    // Как только буквы перестали помещаться в один слог, нажатие начинает
    // клетку заново: в клетке живёт ровно один знак.
    if (Array.from(composed).length > 1) {
      keys.current = [key]
      setCell(cell, composeKeys([key]))
      return
    }
    keys.current = next
    setCell(cell, composed)
  }

  const pick = (k: string) => {
    if (disabled) return
    setAt(k)
    atRef.current = k
    keys.current = []
  }

  const clear = () => {
    const cell = atRef.current
    if (disabled || !cell) return
    vibrate(6)
    keys.current = []
    setCell(cell, '')
  }

  const byDir = (dir: CrosswordWord['dir']) => grid.words.filter(w => w.dir === dir)

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      {/* Сетка. Клетки вне слов не рисуются вовсе — фон задания просвечивает. */}
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid', gap: 3, width: 'max-content', margin: '0 auto',
            gridTemplateColumns: `repeat(${grid.cols}, ${CELL}px)`,
            gridTemplateRows: `repeat(${grid.rows}, ${CELL}px)`,
          }}
        >
          {Array.from({ length: grid.rows * grid.cols }, (_, idx) => {
            const r = Math.floor(idx / grid.cols)
            const c = idx % grid.cols
            const k = `${r},${c}`
            const want = grid.cells[k]
            if (!want) return <div key={k} />
            const got = filled[k] ?? ''
            const ok = showVerdict && got === want
            const chosen = at === k && !disabled && !showVerdict
            return (
              <motion.button
                key={k}
                whileTap={disabled ? undefined : { scale: 0.94 }}
                onClick={() => pick(k)}
                disabled={disabled}
                style={{
                  position: 'relative', borderRadius: 9, fontFamily: 'inherit',
                  fontSize: 21, fontWeight: 700, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--color-text)',
                  border: showVerdict
                    ? `1.5px solid ${ok ? '#6EE7A0' : '#F48B91'}`
                    : chosen ? '2px solid var(--color-accent)' : '1.5px solid var(--color-border-strong)',
                  background: showVerdict
                    ? (ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)')
                    : chosen ? 'var(--color-purple-soft)' : 'rgba(var(--glass-rgb), 0.96)',
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {grid.numbers[k] !== undefined && (
                  <span style={{
                    position: 'absolute', top: 2, left: 4,
                    fontSize: 9.5, fontWeight: 800, color: 'var(--color-text-4)',
                  }}>
                    {grid.numbers[k]}
                  </span>
                )}
                {got}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Клавиатура выбранной клетки. Без выбранной клетки её нет — иначе
          непонятно, куда попадёт нажатие. */}
      {!disabled && !showVerdict && script && (
        at
          ? (
            <div className="flex flex-col" style={{ gap: 8 }}>
              <div className="flex flex-wrap items-center justify-center" style={{ gap: 6 }}>
                {keyboard.map(kk => (
                  <motion.button
                    key={kk}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => press(kk)}
                    style={{
                      minWidth: 40, padding: '8px 9px', borderRadius: 11,
                      border: '1px solid var(--color-border-strong)',
                      background: 'rgba(var(--glass-rgb), 0.96)', color: 'var(--color-text)',
                      fontFamily: 'inherit', fontSize: 19, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {kk}
                  </motion.button>
                ))}
              </div>
              <button
                onClick={clear}
                className="self-center cursor-pointer"
                style={{
                  padding: '7px 15px', borderRadius: 999, border: '1px solid var(--color-border)',
                  background: 'transparent', color: 'var(--color-muted)',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                }}
              >
                {t('Очистить клетку')}
              </button>
            </div>
          )
          : (
            <span style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center' }}>
              {t('Выбери клетку — под сеткой появятся буквы')}
            </span>
          )
      )}

      {/* Подсказки. Номера общие с сеткой, поэтому искать нечего. */}
      <div className="flex flex-wrap" style={{ gap: 18 }}>
        {(['across', 'down'] as const).map(dir => {
          const list = byDir(dir)
          if (!list.length) return null
          return (
            <div key={dir} style={{ flex: '1 1 220px', minWidth: 200 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: 'var(--color-text-3)', marginBottom: 6 }}>
                {dir === 'across' ? t('ПО ГОРИЗОНТАЛИ') : t('ПО ВЕРТИКАЛИ')}
              </div>
              <div className="flex flex-col" style={{ gap: 4 }}>
                {list.map(w => (
                  <div key={`${w.number}${w.dir}`} style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--color-text-2)' }}>
                    <span style={{ fontWeight: 800, color: 'var(--color-accent)', marginRight: 6 }}>{w.number}</span>
                    {w.clue}
                    {showVerdict && <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}> — {w.answer}</span>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
