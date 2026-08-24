import { useMemo } from 'react'
import { useOwnAnswer } from '../lib/useOwnAnswer'
import { useT } from '../lib/i18n'

// «Собрать предложение из плиток» (wordBank / listenBank). Ученик тапает слова из
// банка — они уходят в строку ответа по порядку; тап по слову в строке возвращает
// его в банк. Ответ — массив слов в выбранном порядке (string[]), ровно что ждёт
// gradeTask() для этих типов. Аудио не требуется, поэтому компонент общий и для
// listenBank (там сверху добавится плеер отдельно).
//
// НИЧЕГО НЕ ПРЫГАЕТ. Раньше каждый тап перекраивал экран: выбранное слово
// исчезало из банка (банк схлопывался на строку), строка ответа подрастала с
// высоты подсказки до высоты плитки — и всё, что ниже (кнопки, подсказка),
// уезжало под палец. Поэтому обе области посчитаны заранее:
// • строка ответа держит высоту собранного предложения целиком — под ней лежит
//   невидимый «призрак» из всех плиток, и высота коробки задана им, а не тем,
//   сколько слов набрано сейчас;
// • плитка из банка не исчезает, а гаснет на своём месте (как в CharTilesSolver):
//   порядок и координаты остальных не меняются вообще.

// Стабильная (без Math.random) перестановка: сортируем по хешу слова+индекса, так
// порядок в банке не совпадает с эталоном, но не прыгает между рендерами.
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

type Tile = { word: string; key: string }

export default function WordBankSolver({
  tokens,
  distractors = [],
  value,
  onChange,
  disabled = false,
}: {
  /** Слова эталонного предложения (правильный порядок). */
  tokens: string[]
  /** Лишние слова-обманки. */
  distractors?: string[]
  /** Выбранные слова в порядке ответа. */
  value: string[]
  onChange: (words: string[]) => void
  disabled?: boolean
}) {
  const t = useT()

  // Ответ читается на месте тапа, а не из пропса прошлого рендера: два быстрых
  // тапа успевают попасть в один рендер, и второй затирал бы первый —
  // предложение собиралось бы из одного слова (см. lib/useOwnAnswer.ts).
  const [answerNow, emit] = useOwnAnswer(value, onChange, w => w.join('\u0000'))

  // Все плитки со стабильными ключами (учёт повторов слов), перемешаны детерминированно.
  const allTiles = useMemo<Tile[]>(() => {
    const raw = [...tokens, ...distractors].map((word, i) => ({ word, key: `${word}#${i}` }))
    return [...raw].sort((a, b) => hash(a.key) - hash(b.key))
  }, [tokens, distractors])

  // Банк = все плитки, но потраченные помечены: они остаются на своих местах
  // погашенными (по одному экземпляру на каждое вхождение слова в ответ).
  const bank = useMemo(() => {
    const need = new Map<string, number>()
    for (const w of answerNow) need.set(w, (need.get(w) ?? 0) + 1)
    return allTiles.map(tile => {
      const n = need.get(tile.word) ?? 0
      if (n > 0) { need.set(tile.word, n - 1); return { ...tile, spent: true } }
      return { ...tile, spent: false }
    })
  }, [allTiles, answerNow])

  // База — из prev, а не из снимка рендера: два быстрых тапа успевают попасть в
  // один рендер, и второй затирал бы первый (см. lib/useOwnAnswer.ts).
  const pick = (word: string) => { if (!disabled) emit(prev => [...prev, word]) }
  const removeAt = (i: number) => { if (!disabled) emit(prev => prev.filter((_, idx) => idx !== i)) }

  const tileStyle = (accent: boolean): React.CSSProperties => ({
    padding: '8px 13px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
    fontSize: 14, fontWeight: 600, lineHeight: 1.2,
    border: `1.5px solid ${accent ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
    background: accent ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
    color: accent ? 'var(--color-accent)' : 'var(--color-text)',
  })

  // Обе стопки — реальная и «призрак» — лежат в одной клетке сетки: высота
  // коробки берётся по самой высокой, а призрак с полным предложением всегда
  // не ниже набранного. Значит высота задана один раз и не меняется.
  const layer: React.CSSProperties = { gridArea: '1 / 1', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Строка ответа */}
      <div style={{
        display: 'grid', minHeight: 50,
        padding: '10px 12px', borderRadius: 12, border: '1.5px dashed var(--color-border-medium)',
        background: 'var(--color-bg-input)',
      }}>
        {/* Призрак: высота строки посчитана по всему предложению. */}
        <div aria-hidden style={{ ...layer, visibility: 'hidden', pointerEvents: 'none' }}>
          {tokens.map((word, i) => (
            <span key={`ghost-${i}`} style={{ ...tileStyle(true), display: 'inline-block' }}>{word}</span>
          ))}
        </div>
        <div style={layer}>
          {answerNow.length === 0
            ? <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Нажимай на слова, чтобы собрать предложение')}</span>
            : answerNow.map((word, i) => (
                <button key={`ans-${i}`} onClick={() => removeAt(i)} style={tileStyle(true)}>{word}</button>
              ))}
        </div>
      </div>

      {/* Банк слов: потраченная плитка гаснет на месте, а не пропадает. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {bank.map(tile => (
          <button
            key={tile.key}
            onClick={() => pick(tile.word)}
            disabled={disabled || tile.spent}
            style={{
              ...tileStyle(false),
              opacity: tile.spent ? 0.32 : 1,
              cursor: disabled || tile.spent ? 'default' : 'pointer',
            }}
          >
            {tile.word}
          </button>
        ))}
      </div>
    </div>
  )
}
