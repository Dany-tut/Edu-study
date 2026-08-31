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
// ЧЕМ ЭТО ОТЛИЧАЕТСЯ ОТ «НАБОРА ПО БУКВАМ» (jamoType). Там экранная клавиатура:
// буквы льются в поток и сами режутся на слоги — это про НАБОР слова. Здесь
// слог разложен по МЕСТАМ: согласная, гласная справа или снизу, патчхим под
// ними, — и буква встаёт в своё место, а не в конец строки. Пока обе сборки
// рисовались одинаково (крупный хангыль плюс ряд плиток), они и были одним и
// тем же заданием: на слоге без составных букв разницы не оставалось вовсе.
// Место в квадрате — то единственное, чему клавиатура научить не может.
//
// ДИСТРАКТОРЫ БЕРУТСЯ ИЗ ПОХОЖИХ (CONFUSABLE), а не случайно: выбор между ㅁ и
// ㅠ не тренирует ничего, выбор между ㅁ и ㅂ — тренирует.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CHAMO, chamoOf, confusableWith, joinSyllable, splitSyllable, vowelShape,
} from '../data/hangul'
import { playPop, vibrate } from '../lib/sound'
import { useOwnString } from '../lib/useOwnAnswer'
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
  // Ответ из хука: две буквы, нажатые в одном рендере, иначе затирают друг
  // друга — из «ㄱ ㅣ ㅁ» доезжает одна буква (см. lib/useOwnAnswer.ts).
  const [answerNow, emit] = useOwnString(value, onChange)
  const picked = useMemo(() => answerNow.split(',').filter(Boolean), [answerNow])

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
    if (disabled) return
    playPop()
    vibrate(8)
    // База — из prev: три буквы подряд успевают попасть в один рендер.
    emit(prev => {
      const now = prev.split(',').filter(Boolean)
      return now.length >= need.length ? prev : [...now, c].join(',')
    })
  }

  const parts = splitSyllable(syllable)
  const shape = parts ? vowelShape(parts.vowel) : 'right'

  // Места слогового блока в порядке письма. Раскладка настоящая: у 가 гласная
  // справа, у 구 — снизу, патчхим всегда под ними во всю ширину.
  const slots = [
    { key: 'ini', label: 'согласная', span: false },
    { key: 'vow', label: 'гласная', span: shape === 'below' },
    ...(parts?.final ? [{ key: 'fin', label: 'патчхим', span: true }] : []),
  ]

  /** Очистить место i и все следующие: патчхим без гласной не бывает. */
  const cutFrom = (i: number) => {
    if (disabled) return
    vibrate(6)
    emit(prev => prev.split(',').filter(Boolean).slice(0, i).join(','))
  }

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

      {/* Слоговой блок: три места, разложенные так, как их пишут. Буква встаёт
          в своё место, а не в конец строки, — в этом всё задание. Справа за
          знаком равенства собирается настоящий слог: три буквы по местам дают
          один знак, и это ровно то знание, ради которого задание существует.

          Тап по занятому месту очищает его И ВСЁ, ЧТО ПОСЛЕ: патчхима без
          гласной не бывает, поэтому дырок в середине не оставляем. */}
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: 150, borderRadius: 22, padding: 16, gap: 18,
          background: 'var(--color-bg-3)',
          border: showVerdict
            ? `2px solid ${correct ? 'rgba(110,231,160,0.6)' : 'rgba(244,139,145,0.55)'}`
            : '2px dashed var(--color-border-strong)',
        }}
      >
        <div
          style={{
            display: 'grid', gap: 4,
            gridTemplateColumns: shape === 'below' ? '92px' : '58px 58px',
            gridTemplateRows: parts?.final ? 'auto auto' : 'auto',
          }}
        >
          {slots.map((slot, i) => {
            const filled = picked[i]
            return (
              <motion.button
                key={slot.key}
                initial={filled ? { scale: 0.8, opacity: 0.4 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.16 }}
                onClick={() => cutFrom(i)}
                disabled={disabled || !filled}
                title={filled ? t('Убрать эту букву') : undefined}
                className="flex items-center justify-center"
                style={{
                  gridColumn: slot.span ? '1 / -1' : undefined,
                  minHeight: slot.span ? 44 : 58,
                  borderRadius: 12, fontFamily: 'inherit', overflow: 'hidden', padding: '0 3px',
                  fontSize: 32, lineHeight: 1, fontWeight: 700,
                  color: filled ? 'var(--color-text)' : 'var(--color-text-4)',
                  border: filled
                    ? '1.5px solid rgba(var(--accent-rgb), 0.38)'
                    : '1.5px dashed var(--color-border-strong)',
                  background: filled ? 'var(--color-purple-soft)' : 'transparent',
                  cursor: disabled || !filled ? 'default' : 'pointer',
                }}
              >
                {filled ?? (
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.2, lineHeight: 1.1,
                    maxWidth: '100%', textAlign: 'center', overflowWrap: 'anywhere', hyphens: 'auto',
                  }}>{t(slot.label)}</span>
                )}
              </motion.button>
            )
          })}
        </div>

        <span style={{ fontSize: 24, color: 'var(--color-text-4)', fontWeight: 700 }}>=</span>

        <motion.span
          key={preview || 'empty'}
          initial={{ scale: 0.86, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18 }}
          style={{
            fontSize: 62, lineHeight: 1, fontWeight: 700, minWidth: 68, textAlign: 'center',
            color: preview ? 'var(--color-text)' : 'var(--color-text-4)',
          }}
        >
          {preview || '?'}
        </motion.span>
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
          {t('Тап по букве в блоке убирает её и следующие')}
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
