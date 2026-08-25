// ─────────────────────────────────────────────────────────────────────────────
// Клавиатура хангыля под полем ответа
//
// ЗАЧЕМ. Задание «как будет „ребёнок“?» ждёт 아이, а ученик первой недели сидит
// с русской раскладкой: корейской в системе у него нет и взяться ей неоткуда.
// Он видит вопрос, знает ответ — и вписывает «Ои», потому что больше нечем.
// Ответ засчитывается неверным за то, чего задание не проверяло. Таких заданий
// со свободным вводом по-корейски в курсах шесть с лишним сотен (вписать
// форму, диктант, пропуск в диалоге) — все они были ученику без раскладки
// физически недоступны.
//
// ЧТО ЗДЕСЬ. Настоящая клавиатура, а не плитки ответа: все 19 согласных и 21
// гласная, одни и те же в каждом задании. Подсказки в ней нет — по клавишам не
// видно ни ответа, ни его длины, поэтому её не стыдно показать и в диктанте.
// Тем, кто уже собирает слово из ЕГО букв, занимается jamoType (JamoTypeSolver)
// — это другой тип задания и другая ступень.
//
// КАК СОБИРАЮТСЯ СЛОГИ. Тем же автоматом, что в корейской раскладке
// (composeKeys): ㅇ+ㅏ → 아, следующая ㄱ подставляется патчхимом (악), а гласная
// после неё уводит патчхим в новый слог (아가). Поэтому набранный хвост
// пересобирается из очереди нажатий, а не дописывается символ за символом.
//
// ПОЛЕ ПРИ ЭТОМ ОСТАЁТСЯ ПОЛЕМ. Ответ живёт в textarea: у него своя проверка,
// свой черновик и своя вставка. Клавиатура только дописывает в него текст —
// правку руками (или системной раскладкой, если она есть) она не отбирает:
// строку изменили не ею — очередь сбрасывается, и набор идёт от того, что в
// поле сейчас.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef } from 'react'
import { motion } from 'framer-motion'
import { Delete } from 'lucide-react'
import { INITIALS, VOWELS, composeKeys } from '../data/hangul'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

/** Клавиши рядами по семь — ряд помещается и на узком телефоне. */
const rows = (keys: string[]): string[][] =>
  keys.reduce<string[][]>((acc, k, i) => {
    if (i % 7 === 0) acc.push([])
    acc[acc.length - 1].push(k)
    return acc
  }, [])

/** Хангыль в тексте: слоги и отдельные буквы. */
const HANGUL = /[가-힣ㄱ-ㅎㅏ-ㅣ]/

/**
 * Нужна ли ученику корейская раскладка, чтобы это ответить.
 *
 * Спрашивается у ЭТАЛОНА, а не у языка курса: в корейском курсе половина
 * заданий отвечается по-русски («переведите»), и клавиатура там только мешала
 * бы.
 */
export const needsHangul = (...refs: (string | undefined | null)[]): boolean =>
  refs.some(r => !!r && HANGUL.test(r))

export default function HangulKeyboard({ value, onChange, disabled }: {
  /** Текущий ответ целиком — тот же, что в поле. */
  value: string | undefined
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const t = useT()
  // Клавиши жмут очередями, и рендера между нажатиями может не случиться:
  // ответ обязан считаться из `prev`, а не из пропса прошлого рендера.
  const [, emit] = useOwnString(value, onChange)

  // Очередь набора: `base` — то, что уже сложено и не меняется, `keys` —
  // нажатия, из которых пересобирается хвост.
  const run = useRef<{ base: string; keys: string[] }>({ base: '', keys: [] })
  /** Наш ли это текст. Нет — значит поле правили мимо клавиатуры. */
  const ours = (prev: string) => prev === run.current.base + composeKeys(run.current.keys)

  const press = (k: string) => {
    if (disabled) return
    playPop()
    vibrate(8)
    emit(prev => {
      const base = ours(prev) ? run.current.base : prev
      const keys = ours(prev) ? [...run.current.keys, k] : [k]
      run.current = { base, keys }
      return base + composeKeys(keys)
    })
  }

  /** Стирание: пока идёт очередь — по нажатию (안 → 아 → ㅇ), дальше — по букве. */
  const back = () => {
    if (disabled) return
    vibrate(6)
    emit(prev => {
      if (ours(prev) && run.current.keys.length > 0) {
        const keys = run.current.keys.slice(0, -1)
        run.current = { base: run.current.base, keys }
        return run.current.base + composeKeys(keys)
      }
      const cut = [...prev].slice(0, -1).join('')
      run.current = { base: cut, keys: [] }
      return cut
    })
  }

  /** Пробел закрывает очередь: следующая буква начинает слог с чистого листа. */
  const space = () => {
    if (disabled) return
    playPop()
    emit(prev => {
      const next = `${prev} `
      run.current = { base: next, keys: [] }
      return next
    })
  }

  const key = (label: string, onPress: () => void, wide = false) => (
    <motion.button
      key={label}
      type="button"
      whileTap={disabled ? undefined : { scale: 0.9 }}
      // Фокус остаётся в поле: каретка на месте, страница не прыгает к клавише.
      onMouseDown={e => e.preventDefault()}
      onClick={onPress}
      disabled={disabled}
      className="flex items-center justify-center"
      style={{
        width: wide ? 122 : 38, height: 42, flexShrink: 0,
        borderRadius: 12, padding: 0,
        border: '1px solid var(--color-border-strong)',
        background: 'rgba(var(--glass-rgb), 0.96)',
        color: 'var(--color-text)', fontFamily: 'inherit',
        fontSize: wide ? 12.5 : 21, fontWeight: wide ? 700 : 600, lineHeight: 1,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </motion.button>
  )

  return (
    <div
      className="flex flex-col"
      style={{
        gap: 10, padding: '12px 12px 14px', borderRadius: 20,
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
      }}
    >
      <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
        {t('Ответ по-корейски — слоги сложатся сами')}
      </span>

      {/* Согласные и гласные раздельно, теми же двумя блоками, какими алфавит
          показан в уроке: клавиша ищется там, где буква стояла в таблице.
          Ряды нарезаны по семь, а не отданы переносу: на широком экране перенос
          растягивал согласные в одну строку из пятнадцати, и одна и та же
          буква оказывалась то в первом ряду, то во втором. */}
      {[INITIALS, VOWELS].map((group, gi) => (
        <div key={gi} className="flex flex-col" style={{ gap: 5 }}>
          {rows(group).map((row, i) => (
            <div key={i} className="flex justify-center" style={{ gap: 5 }}>
              {row.map(k => key(k, () => press(k)))}
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-center" style={{ gap: 5 }}>
        {key(t('пробел'), space, true)}
        <motion.button
          type="button"
          whileTap={disabled ? undefined : { scale: 0.9 }}
          onMouseDown={e => e.preventDefault()}
          onClick={back}
          disabled={disabled}
          aria-label={t('Стереть')}
          className="flex items-center justify-center"
          style={{
            width: 56, height: 42, flexShrink: 0, borderRadius: 12, padding: 0,
            border: '1px solid var(--color-border-strong)',
            background: 'rgba(var(--glass-rgb), 0.96)',
            color: 'var(--color-text-2)', cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Delete size={17} />
        </motion.button>
      </div>
    </div>
  )
}
