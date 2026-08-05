import { useMemo } from 'react'
import { useT } from '../lib/i18n'

// «Собрать предложение из плиток» (wordBank / listenBank). Ученик тапает слова из
// банка — они уходят в строку ответа по порядку; тап по слову в строке возвращает
// его в банк. Ответ — массив слов в выбранном порядке (string[]), ровно что ждёт
// gradeTask() для этих типов. Аудио не требуется, поэтому компонент общий и для
// listenBank (там сверху добавится плеер отдельно).

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

  // Все плитки со стабильными ключами (учёт повторов слов), перемешаны детерминированно.
  const allTiles = useMemo<Tile[]>(() => {
    const raw = [...tokens, ...distractors].map((word, i) => ({ word, key: `${word}#${i}` }))
    return [...raw].sort((a, b) => hash(a.key) - hash(b.key))
  }, [tokens, distractors])

  // Банк = все плитки минус уже выбранные (по одному экземпляру на каждое вхождение слова).
  const remaining = useMemo<Tile[]>(() => {
    const need = new Map<string, number>()
    for (const w of value) need.set(w, (need.get(w) ?? 0) + 1)
    const out: Tile[] = []
    for (const tile of allTiles) {
      const n = need.get(tile.word) ?? 0
      if (n > 0) need.set(tile.word, n - 1)
      else out.push(tile)
    }
    return out
  }, [allTiles, value])

  const pick = (word: string) => { if (!disabled) onChange([...value, word]) }
  const removeAt = (i: number) => { if (!disabled) onChange(value.filter((_, idx) => idx !== i)) }

  const tileStyle = (accent: boolean): React.CSSProperties => ({
    padding: '8px 13px', borderRadius: 10, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
    fontSize: 14, fontWeight: 600, lineHeight: 1.2,
    border: `1.5px solid ${accent ? 'var(--color-accent)' : 'var(--color-border-soft)'}`,
    background: accent ? 'var(--color-purple-soft)' : 'var(--color-bg-2)',
    color: accent ? 'var(--color-accent)' : 'var(--color-text)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Строка ответа */}
      <div style={{
        minHeight: 50, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        padding: '10px 12px', borderRadius: 12, border: '1.5px dashed var(--color-border-medium)',
        background: 'var(--color-bg-input)',
      }}>
        {value.length === 0
          ? <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Нажимай на слова, чтобы собрать предложение')}</span>
          : value.map((word, i) => (
              <button key={`ans-${i}`} onClick={() => removeAt(i)} style={tileStyle(true)}>{word}</button>
            ))}
      </div>

      {/* Банк слов */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {remaining.map(tile => (
          <button key={tile.key} onClick={() => pick(tile.word)} style={tileStyle(false)}>{tile.word}</button>
        ))}
      </div>
    </div>
  )
}
