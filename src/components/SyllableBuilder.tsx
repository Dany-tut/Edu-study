// ─────────────────────────────────────────────────────────────────────────────
// «Соберите слог» — слог как конструкция, а не как картинка
//
// ЗАЧЕМ. Тот, кто учит хангыль по карточкам «김 = ким», запоминает слоги
// целиком — как иероглифы. Это работает до первого незнакомого слова: 낌, 갬,
// 김 выглядят для него одинаково «похоже на кимчи». Здесь слог собирают из
// букв, и после десятка сборок незнакомый слог читается сам — потому что
// читать его больше не надо, его видно насквозь.
//
// ПОЧЕМУ СОБИРАЮТ ИЗ БУКВ, А НЕ ИЗ НАЖАТИЙ КЛАВИАТУРЫ. Составные буквы (ㅘ, ㄲ,
// ㄳ) — это буквы алфавита, и на карточке они стоят целиком. Разложение до
// клавиш (keysOf) нужно клавиатуре, а не уроку письма; здесь работает chamoOf.
//
// ПОЧЕМУ РЕЗУЛЬТАТ СОБИРАЕТСЯ ЖИВЬЁМ. По ходу выбора буквы складываются в
// настоящий слог (joinSyllable), и ученик видит, как ㄱ и ㅣ превращаются в 기, а
// добавленная ㅁ — в 김. Это и есть то знание, ради которого задание существует;
// показывать вместо этого три плитки в ряд значило бы его спрятать.
//
// ДИСТРАКТОРЫ БЕРУТСЯ ИЗ ПОХОЖИХ (CONFUSABLE), а не случайно: выбор между ㅁ и
// ㅠ не тренирует ничего, выбор между ㅁ и ㅂ — тренирует.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CHAMO, chamoOf, confusableWith, joinSyllable, splitSyllable,
} from '../data/hangul'
import { playPop, vibrate } from '../lib/sound'
import { useT } from '../lib/i18n'
import AudioPlayer from './AudioPlayer'

/** Плитки задания: буквы слога плюс похожие обманки, в устойчивом порядке. */
function tilesFor(syllable: string): string[] {
  const need = chamoOf(syllable)
  const extra: string[] = []
  for (const c of need) {
    for (const d of confusableWith(c, 2)) {
      if (!need.includes(d) && !extra.includes(d)) extra.push(d)
    }
  }
  const all = [...need, ...extra.slice(0, 3)]
  // Перемешивание должно быть одинаковым между перерисовками (иначе плитки
  // прыгают на каждый выбор), поэтому сортируем по коду буквы, а не случайно:
  // порядок получается не тот, в котором пишут, и подсказки в нём нет.
  return all.sort((a, b) => a.localeCompare(b, 'ko'))
}

export default function SyllableBuilder({ syllable, value, disabled, showVerdict, onChange }: {
  /** Эталонный слог. */
  syllable: string
  /** Выбранные буквы через запятую — в том порядке, в каком их нажали. */
  value: string | undefined
  disabled?: boolean
  showVerdict?: boolean
  onChange: (value: string) => void
}) {
  const t = useT()
  const need = useMemo(() => chamoOf(syllable), [syllable])
  const tiles = useMemo(() => tilesFor(syllable), [syllable])
  const picked = useMemo(() => (value ? value.split(',').filter(Boolean) : []), [value])

  // Живой предпросмотр: что получилось бы из выбранных букв прямо сейчас.
  const preview = useMemo(() => {
    if (picked.length === 0) return ''
    const [initial, vowel, final] = picked
    if (!vowel) return initial ?? ''
    return joinSyllable(initial, vowel, final ?? '') ?? picked.join('')
  }, [picked])

  const full = picked.length === need.length
  const correct = full && picked.every((c, i) => c === need[i])

  const pick = (c: string) => {
    if (disabled || full) return
    playPop()
    vibrate(8)
    onChange([...picked, c].join(','))
  }

  const back = () => {
    if (disabled || picked.length === 0) return
    vibrate(6)
    onChange(picked.slice(0, -1).join(','))
  }

  const parts = splitSyllable(syllable)

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <div className="flex items-center" style={{ gap: 12 }}>
        <AudioPlayer ttsText={syllable} lang="ko" compact />
        <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>
          {parts?.final
            ? t('Три буквы: согласная, гласная и патчхим снизу')
            : t('Две буквы: согласная и гласная')}
        </span>
      </div>

      {/* Место сборки. Высота фиксирована: без неё карточка прыгает на каждой
          добавленной букве, а вместе с ней уезжает и низ экрана. Тап по
          собранному слогу снимает последнюю букву — отдельной кнопки нет,
          удаление везде делается кликом по самому собранному. */}
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: 128, borderRadius: 22, padding: 16,
          background: 'var(--color-bg-3)',
          border: showVerdict
            ? `2px solid ${correct ? 'rgba(110,231,160,0.6)' : 'rgba(244,139,145,0.55)'}`
            : '2px dashed var(--color-border-strong)',
        }}
      >
        {preview
          ? (
            <motion.button
              key={preview}
              initial={{ scale: 0.86, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18 }}
              onClick={back}
              disabled={disabled}
              title={t('Убрать последнюю букву')}
              style={{
                fontSize: 64, lineHeight: 1, fontWeight: 700, color: 'var(--color-text)',
                border: 'none', background: 'transparent', fontFamily: 'inherit', padding: 0,
                cursor: disabled ? 'default' : 'pointer',
              }}
            >
              {preview}
            </motion.button>
          )
          : (
            <span style={{ fontSize: 14, color: 'var(--color-muted)' }}>
              {t('Нажимай на буквы по порядку')}
            </span>
          )}
      </div>

      <div className="flex flex-wrap items-center justify-center" style={{ gap: 10 }}>
        {tiles.map(c => {
          // Букву, уже занятую в сборке, гасим ровно столько раз, сколько она
          // использована: в 김 буква ㄱ одна, а в 깍 их две, и вторую надо где-то
          // взять.
          const usedCount = picked.filter(x => x === c).length
          const inNeed = need.filter(x => x === c).length
          const spent = usedCount >= Math.max(1, inNeed)
          return (
            <motion.button
              key={c}
              whileTap={disabled || spent ? undefined : { scale: 0.94 }}
              onClick={() => pick(c)}
              disabled={disabled || spent || full}
              className="flex flex-col items-center justify-center"
              style={{
                minWidth: 68, padding: '12px 14px', borderRadius: 18,
                border: '1px solid var(--color-border-strong)',
                background: spent ? 'var(--color-bg-3)' : 'rgba(var(--glass-rgb), 0.96)',
                color: spent ? 'var(--color-muted)' : 'var(--color-text)',
                opacity: spent ? 0.45 : 1,
                fontFamily: 'inherit', cursor: disabled || spent || full ? 'default' : 'pointer',
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1.1, fontWeight: 700 }}>{c}</span>
              <span style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 3 }}>
                {CHAMO[c]?.sound}
              </span>
            </motion.button>
          )
        })}
      </div>

      {picked.length > 0 && !disabled && !showVerdict && (
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', textAlign: 'center' }}>
          {t('Тап по слогу убирает последнюю букву')}
        </span>
      )}

      {showVerdict && !correct && (
        <p style={{ fontSize: 13, textAlign: 'center', color: 'var(--color-green-text)', fontWeight: 700 }}>
          {syllable} = {need.join(' + ')}
        </p>
      )}
    </div>
  )
}
