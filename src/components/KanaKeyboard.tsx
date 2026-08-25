// ─────────────────────────────────────────────────────────────────────────────
// Клавиатура каны под полем ответа
//
// ЗАЧЕМ. То же, что у хангыля (см. HangulKeyboard): «Запишите хираганой слово
// „кошка“» ждёт ねこ, а японской раскладки у ученика нет и взяться ей неоткуда.
// Таких заданий в четырёх японских курсах 957 — вписать форму, диктант,
// пропуск в диалоге, — и все они были без раскладки невыполнимы.
//
// ЧТО ЗДЕСЬ. Годзюон целиком, той же таблицей 5×10, какой он показан в уроке
// (japaneseJlpt: ряды あ–わ, пропуски в や и わ настоящие). Подсказки в ней нет:
// таблица одна и та же в каждом задании.
//
// ЗВОНКОСТЬ И МАЛЫЕ ЗНАКИ — МОДИФИКАТОРЫ, А НЕ КЛАВИШИ. が — это か плюс
// нигори; отдельными клавишами таблица разрослась бы вдвое и перестала быть
// той таблицей, которую учат. Поэтому ゛゜小 меняют ПОСЛЕДНИЙ знак и работают
// в обе стороны: нажал ещё раз — вернулось.
//
// КАТАКАНА — ТУМБЛЕР. Кодировка обеих азбук идёт параллельно (ぁ U+3041 … ん
// U+3093 против ァ U+30A1 … ン U+30F3), поэтому таблица нужна одна: катакана
// получается сдвигом на 0x60, и модификаторы работают на обеих без второго
// набора правил.
//
// ЧЕГО ЗДЕСЬ НЕТ. Кандзи: их не набирают с клавиатуры вовсе — их выбирают из
// подстановки настоящего IME по чтению. В сорока заданиях с кандзи клавиатура
// наберёт кану, а системная раскладка остаётся доступной (см. ScriptKeyboard).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Delete } from 'lucide-react'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

/** Кана в тексте — любая, включая малые знаки и долготу. */
const KANA = /[぀-ヿ]/

/** Нужна ли ученику японская раскладка, чтобы это ответить. */
export const needsKana = (...refs: (string | undefined | null)[]): boolean =>
  refs.some(r => !!r && KANA.test(r))

/** Годзюон рядами, как в таблице урока: пустая клетка — слога нет в языке. */
const GOJUON: string[][] = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['や', '', 'ゆ', '', 'よ'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
  ['わ', '', 'ん', '', 'を'],
]

/** Звонкие: か → が. */
const DAKUTEN: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
  う: 'ゔ',
}
/** Глухие взрывные: は → ぱ. */
const HANDAKUTEN: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' }
/** Малые знаки: っ в удвоении, ゃゅょ в слитных слогах. */
const SMALL: Record<string, string> = {
  あ: 'ぁ', い: 'ぃ', う: 'ぅ', え: 'ぇ', お: 'ぉ',
  つ: 'っ', や: 'ゃ', ゆ: 'ゅ', よ: 'ょ', わ: 'ゎ',
}

const isKata = (ch: string) => /[ァ-ヶ]/.test(ch)
const toHira = (ch: string) => (isKata(ch) ? String.fromCharCode(ch.charCodeAt(0) - 0x60) : ch)
const toKata = (ch: string) => (/[ぁ-ゖ]/.test(ch) ? String.fromCharCode(ch.charCodeAt(0) + 0x60) : ch)

/**
 * Знак после модификатора — в обе стороны и в той же азбуке.
 *
 * Правила записаны хираганой один раз: катакана получается сдвигом, поэтому
 * ガ разбирается тем же словарём, что и が.
 */
function morph(ch: string, map: Record<string, string>): string | null {
  if (!ch) return null
  const kata = isKata(ch)
  const base = toHira(ch)
  const back = Object.entries(map).find(([, v]) => v === base)?.[0]
  const next = back ?? map[base]
  if (!next) return null
  return kata ? toKata(next) : next
}

export default function KanaKeyboard({ value, onChange, disabled }: {
  /** Текущий ответ целиком — тот же, что в поле. */
  value: string | undefined
  onChange: (next: string) => void
  disabled?: boolean
}) {
  const t = useT()
  // Клавиши жмут очередями: ответ считается из `prev`, а не из пропса.
  const [, emit] = useOwnString(value, onChange)
  const [kata, setKata] = useState(false)

  const put = (ch: string) => {
    if (disabled || !ch) return
    playPop()
    vibrate(8)
    emit(prev => prev + (kata ? toKata(ch) : ch))
  }

  /** Модификатор правит последний знак; править нечего — нажатие впустую. */
  const mod = (map: Record<string, string>) => {
    if (disabled) return
    vibrate(6)
    emit(prev => {
      const chars = [...prev]
      const next = morph(chars[chars.length - 1] ?? '', map)
      if (!next) return prev
      chars[chars.length - 1] = next
      return chars.join('')
    })
  }

  const back = () => {
    if (disabled) return
    vibrate(6)
    emit(prev => [...prev].slice(0, -1).join(''))
  }

  const key = (
    label: string,
    onPress: (() => void) | null,
    opts: { wide?: boolean; quiet?: boolean } = {},
  ) => {
    // Пустая клетка таблицы — не кнопка, а место: без него ряды や и わ
    // разъезжаются, и таблица перестаёт быть таблицей.
    if (!onPress) return <div key={label} style={{ width: 40, height: 40, flexShrink: 0 }} />
    return (
      <motion.button
        key={label}
        type="button"
        whileTap={disabled ? undefined : { scale: 0.9 }}
        onMouseDown={e => e.preventDefault()}
        onClick={onPress}
        disabled={disabled}
        className="flex items-center justify-center"
        style={{
          width: opts.wide ? 124 : 40, height: 40, flexShrink: 0,
          borderRadius: 12, padding: 0,
          border: '1px solid var(--color-border-strong)',
          background: 'rgba(var(--glass-rgb), 0.96)',
          color: opts.quiet ? 'var(--color-text-2)' : 'var(--color-text)',
          fontFamily: 'inherit',
          fontSize: opts.wide ? 12.5 : 20, fontWeight: opts.wide ? 700 : 600, lineHeight: 1,
          cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
        }}
      >
        {label}
      </motion.button>
    )
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{
        gap: 5, padding: '12px 12px 14px', borderRadius: 20,
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
      }}
    >
      {/* Пока поле выше не ушло за край экрана, набранное видно в нём. Как
          только клавиатура заняла экран (телефон, длинная таблица), видно
          только её — поэтому набранное эхом стоит в шапке панели. */}
      {value?.trim()
        ? (
          <span style={{
            fontSize: 17, fontWeight: 700, color: 'var(--color-text)',
            textAlign: 'center', marginBottom: 5, wordBreak: 'break-word',
          }}>
            {value}
          </span>
        )
        : (
          <span style={{
            fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center', marginBottom: 5,
          }}>
            {t('Ответ по-японски — нижний ряд меняет последний знак')}
          </span>
        )}

      {/* Таблица теми же двумя половинами, какими она разобрана в уроке
          (ряды あ–な и は–わ). На широком экране половины встают рядом, на
          телефоне переносом — друг под друга: десять рядов подряд занимали
          там весь экран, и до нижних клавиш приходилось прокручивать. */}
      <div className="flex flex-wrap justify-center" style={{ gap: 12 }}>
        {[GOJUON.slice(0, 5), GOJUON.slice(5)].map((half, hi) => (
          <div key={hi} className="flex flex-col" style={{ gap: 4 }}>
            {/* Шапка столбцов — те же a i u e o, что в таблице урока. */}
            <div className="flex" style={{ gap: 4 }}>
              {['a', 'i', 'u', 'e', 'o'].map(h => (
                <span
                  key={h}
                  className="flex items-center justify-center"
                  style={{ width: 40, fontSize: 10, color: 'var(--color-text-3)' }}
                >
                  {h}
                </span>
              ))}
            </div>
            {half.map((row, i) => (
              <div key={i} className="flex" style={{ gap: 4 }}>
                {row.map((ch, j) => {
                  // Подпись клавиши — в текущей азбуке: переключив тумблер,
                  // ученик должен видеть ТО, что нажимает.
                  const label = kata ? toKata(ch) : ch
                  return key(label || `_${hi}${i}${j}`, ch ? () => put(ch) : null)
                })}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Модификаторы и переключатель азбуки — ряд в ширину таблицы. */}
      <div className="flex" style={{ gap: 4, marginTop: 5 }}>
        {key('゛', () => mod(DAKUTEN), { quiet: true })}
        {key('゜', () => mod(HANDAKUTEN), { quiet: true })}
        {key('小', () => mod(SMALL), { quiet: true })}
        {key('ー', () => put('ー'), { quiet: true })}
        {key(kata ? 'あ' : 'ア', () => { if (!disabled) { playPop(); setKata(v => !v) } })}
      </div>

      <div className="flex" style={{ gap: 4, marginTop: 5 }}>
        {key(t('пробел'), () => { if (!disabled) { playPop(); emit(prev => `${prev} `) } }, { wide: true })}
        <motion.button
          type="button"
          whileTap={disabled ? undefined : { scale: 0.9 }}
          onMouseDown={e => e.preventDefault()}
          onClick={back}
          disabled={disabled}
          aria-label={t('Стереть')}
          className="flex items-center justify-center"
          style={{
            width: 56, height: 40, flexShrink: 0, borderRadius: 12, padding: 0,
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
