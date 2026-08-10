import { useMemo, useRef, useState } from 'react'
import { useT } from '../lib/i18n'

/**
 * «Сопоставление» (matching) — соединить левое с правым.
 *
 * ЗАЧЕМ КОМПОНЕНТ. Раньше задание рисовалось справкой «левое → правое» и полем
 * «запиши соответствия»: все ответы были напечатаны рядом с вопросами, ученику
 * оставалось переписать их в поле, а машина проверить это не могла — задание
 * уходило учителю. Тип превратился в списывание. Теперь правая колонка
 * перемешана и лежит отдельным банком: ученик действительно соединяет пары, а
 * ответ проверяется автоматически.
 *
 * ОТВЕТ. Массив длиной с число пар: `assign[i]` — индекс ПРАВОЙ части (в
 * авторском порядке), выбранной для левой части `i`, или -1, если пусто. Индексы
 * авторские, не экранные, поэтому перемешивание банка не портит сохранённый
 * ответ. Верно, когда `assign[i] === i` для всех строк.
 *
 * Сериализацию выбирает вызывающий: домашка хранит ответы строками (CSV),
 * тест — картой left→right, как ждёт gradeTask() в data/taskTypes.ts.
 */

export interface MatchPair { left: string; right: string }

/** Стабильная (без Math.random) перестановка — как в WordBankSolver. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

export const emptyMatching = (n: number): number[] => Array<number>(n).fill(-1)

/** CSV-вид для домашки: "2,0,-,1". */
export const matchingCsv = (assign: number[]): string =>
  assign.map(v => (v < 0 ? '-' : String(v))).join(',')

export function parseMatchingCsv(value: string | undefined, n: number): number[] {
  const out = emptyMatching(n)
  if (!value) return out
  value.split(',').forEach((part, i) => {
    if (i >= n) return
    const num = Number(part)
    if (Number.isInteger(num) && num >= 0 && num < n) out[i] = num
  })
  return out
}

export const matchingIsComplete = (assign: number[]): boolean =>
  assign.length > 0 && assign.every(v => v >= 0)

export const matchingIsCorrect = (assign: number[]): boolean =>
  assign.length > 0 && assign.every((v, i) => v === i)

/** Карта left→right — канонический ответ типа `matching` для gradeTask(). */
export function matchingToMap(pairs: MatchPair[], assign: number[]): Record<string, string> {
  const map: Record<string, string> = {}
  pairs.forEach((p, i) => { if (assign[i] >= 0) map[p.left] = pairs[assign[i]].right })
  return map
}

/** Обратное чтение карты left→right. Повторы справа схлопываются в первый — им
 *  всё равно присвоен один и тот же текст, а проверка сравнивает тексты. */
export function matchingFromMap(pairs: MatchPair[], value: unknown): number[] {
  const out = emptyMatching(pairs.length)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out
  const map = value as Record<string, string>
  pairs.forEach((p, i) => {
    const picked = map[p.left]
    if (typeof picked !== 'string' || !picked) return
    const idx = pairs.findIndex(x => x.right === picked)
    if (idx >= 0) out[i] = idx
  })
  return out
}

/** Читаемый вид ответа — для снимка работы преподавателю. */
export function formatMatching(pairs: MatchPair[], assign: number[]): string {
  return pairs
    .map((p, i) => `${p.left} → ${assign[i] >= 0 ? pairs[assign[i]].right : '—'}`)
    .join('; ')
}

export default function MatchingSolver({
  pairs,
  value,
  onChange,
  disabled = false,
  showVerdict = false,
}: {
  pairs: MatchPair[]
  /** Ответ: индекс правой части на каждую левую, -1 = пусто. */
  value: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
  /** Домашка сдана — подсветить строки и показать эталон там, где не сошлось. */
  showVerdict?: boolean
}) {
  const t = useT()
  const [selected, setSelected] = useState<number | null>(null)

  const fromProps = value.length === pairs.length ? value : emptyMatching(pairs.length)

  // Два быстрых тапа подряд успевают попасть в один рендер: второй считал бы
  // расклад из ещё не обновившегося пропса и затёр бы первый (обе пары легли бы
  // в одну строку). Держим свой последний расклад до тех пор, пока пропс его не
  // догонит; если ответ пришёл со стороны (перезагрузка, сброс) — отдаём пропсу.
  const own = useRef<number[] | null>(null)
  const seen = useRef<string>(matchingCsv(fromProps))
  const incoming = matchingCsv(fromProps)
  if (seen.current !== incoming) { seen.current = incoming; own.current = null }
  const assign = own.current ?? fromProps

  const emit = (next: number[]) => {
    own.current = next
    seen.current = matchingCsv(next)
    onChange(next)
  }

  // Порядок банка: перемешан детерминированно, чтобы правая часть не стояла
  // напротив своей левой и при этом не прыгала между рендерами.
  const bankOrder = useMemo(
    () => pairs.map((_, i) => i).sort((a, b) => hash(pairs[a].right + a) - hash(pairs[b].right + b)),
    [pairs],
  )
  const used = new Set(assign.filter(v => v >= 0))

  // В обработчиках расклад берётся из ref, а не из замыкания рендера: между двумя
  // быстрыми тапами рендера может не случиться, и второй тап обязан видеть первый.
  const put = (rightIdx: number) => {
    if (disabled) return
    const base = own.current ?? assign
    // Строка — выбранная; если ученик не выбрал, кладём в первую пустую.
    const row = selected !== null && base[selected] < 0 ? selected : base.findIndex(v => v < 0)
    if (row < 0) return
    const next = [...base]
    next[row] = rightIdx
    emit(next)
    setSelected(null)
  }
  const clear = (row: number) => {
    if (disabled) return
    const base = own.current ?? assign
    if (base[row] < 0) { setSelected(selected === row ? null : row); return }
    const next = [...base]
    next[row] = -1
    emit(next)
    setSelected(row)
  }

  const slotBase: React.CSSProperties = {
    flex: 1, minWidth: 0, padding: '10px 13px', borderRadius: 12, fontFamily: 'inherit',
    fontSize: 15, lineHeight: 1.4, textAlign: 'left', cursor: disabled ? 'default' : 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Строки: левая часть и слот под ответ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pairs.map((pair, i) => {
          const picked = assign[i]
          const right = picked >= 0 ? pairs[picked].right : ''
          const ok = picked === i
          const active = selected === i && picked < 0
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
              <div style={{
                flex: 1, minWidth: 0, padding: '10px 13px', borderRadius: 12,
                background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
                fontSize: 15, lineHeight: 1.4, fontWeight: 600, color: 'var(--color-text)',
              }}>
                {pair.left}
              </div>
              <span style={{ alignSelf: 'center', color: 'var(--color-muted)', fontSize: 15, flexShrink: 0 }}>→</span>
              <button
                onClick={() => clear(i)}
                style={{
                  ...slotBase,
                  border: showVerdict
                    ? `1.5px solid ${ok ? '#6EE7A0' : '#F48B91'}`
                    : picked >= 0 ? '1.5px solid var(--color-accent)'
                    : active ? '1.5px solid var(--color-accent)'
                    : '1.5px dashed var(--color-border-medium)',
                  background: showVerdict
                    ? (ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)')
                    : picked >= 0 || active ? 'var(--color-purple-soft)' : 'var(--color-bg-input)',
                  color: picked >= 0 ? 'var(--color-text)' : 'var(--color-muted)',
                  fontWeight: picked >= 0 ? 600 : 400,
                }}
              >
                {right || (active ? t('Выбери вариант ниже ↓') : t('Нажми, потом выбери ниже'))}
                {showVerdict && !ok && (
                  <span style={{ display: 'block', marginTop: 3, fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>
                    {pair.right}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Банк правых частей — перемешан */}
      {!showVerdict && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {bankOrder.map(idx => {
            const taken = used.has(idx)
            if (taken) return null
            return (
              <button
                key={idx}
                onClick={() => put(idx)}
                style={{
                  padding: '9px 14px', borderRadius: 10, fontFamily: 'inherit',
                  fontSize: 15, fontWeight: 500, lineHeight: 1.25,
                  border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
                  color: 'var(--color-text)', cursor: disabled ? 'default' : 'pointer',
                }}
              >
                {pairs[idx].right}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
