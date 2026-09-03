import { useEffect, useMemo, useRef, useState } from 'react'
import StarBurst from './StarBurst'
import ScriptHint from './ScriptHint'
import { okChime, missBlip } from '../lib/feedback'

/**
 * «Сопоставление» (matching) — соединить левое с правым.
 *
 * ЗАЧЕМ КОМПОНЕНТ. Раньше задание рисовалось справкой «левое → правое» и полем
 * «запиши соответствия»: все ответы были напечатаны рядом с вопросами, ученику
 * оставалось переписать их в поле, а машина проверить это не могла — задание
 * уходило учителю. Тип превратился в списывание.
 *
 * ВИД — как в Duolingo: две колонки плиток, слева слова, справа перемешанные
 * переводы (все видны сразу, пустых слотов нет). Тап по плитке слева, тап по
 * плитке справа — пара связана и обе помечаются одним номером; тап по любой из
 * связанных — развязать. Порядок тапов любой.
 *
 * ОТВЕТ. Массив длиной с число пар: `assign[i]` — индекс ПРАВОЙ части (в
 * авторском порядке), выбранной для левой части `i`, или -1, если пусто. Индексы
 * авторские, не экранные, поэтому перемешивание банка не портит сохранённый
 * ответ. Верно, когда `assign[i] === i` для всех строк.
 *
 * Сериализацию выбирает вызывающий: домашка хранит ответы строками (CSV),
 * тест — картой left→right, как ждёт gradeTask() в data/taskTypes.ts.
 */

/**
 * Пара сопоставления. Сторона может быть КАРТИНКОЙ (leftImage/rightImage):
 * тогда плитка показывает только картинку — подпись под ней была бы ответом,
 * напечатанным рядом с вопросом. Текст стороны при этом никуда не девается:
 * он остаётся ключом сверки и попадает в снимок работы для учителя.
 */
export interface MatchPair { left: string; right: string; leftImage?: string; rightImage?: string }

/** Стабильная (без Math.random) перестановка — как в WordBankSolver. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

/**
 * Сторона-картинка. Alt намеренно НЕ подпись предмета: экранный диктор
 * прочитал бы ответ вслух — плитка стоит ровно затем, чтобы предмет узнавали
 * глазами. Название уходит в title, где его увидит только учитель при разборе.
 */
function SideImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt=""
      title={alt}
      loading="lazy"
      style={{
        display: 'block', width: '100%', maxHeight: 96, objectFit: 'contain',
        borderRadius: 8, background: 'var(--color-bg-3)',
      }}
    />
  )
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
  instant = false,
  onMiss,
  lang,
}: {
  pairs: MatchPair[]
  /** Ответ: индекс правой части на каждую левую, -1 = пусто. */
  value: number[]
  onChange: (next: number[]) => void
  disabled?: boolean
  /** Домашка сдана — подсветить строки и показать эталон там, где не сошлось. */
  showVerdict?: boolean
  /**
   * Мгновенный вердикт по каждой паре (домашка; docs/MEMORY_STANDARD.md, Р10).
   *
   * Верная пара сразу зеленеет, звенит и запирается; неверная краснеет на 420 мс
   * и распадается — переспросить можно тут же. В ответ уходят ТОЛЬКО верные
   * пары: неверная связка не сохраняется, поэтому «ответ» такого задания либо
   * пуст, либо правилен, и списывать нечего.
   *
   * Тест этот режим не включает: там вердикт до сдачи — это подсказка.
   */
  instant?: boolean
  /** Промах — на будущий счётчик ошибок урока (очередь, Р8). */
  onMiss?: (leftIdx: number) => void
  /**
   * Язык задания: под плиткой на незнакомом письме появляются транскрипция и
   * кнопка озвучки (Р14). Без него плитки остаются как были.
   */
  lang?: string
}) {
  const [selected, setSelected] = useState<{ side: 'left' | 'right'; idx: number } | null>(null)
  // Неверная связка: живёт только на экране и только 420 мс (Р10).
  const [miss, setMiss] = useState<{ row: number; right: number } | null>(null)
  // Ключ разлёта звёздочек: меняется на каждой верной паре, чтобы анимация
  // перезапускалась даже на той же строке.
  const [burst, setBurst] = useState<{ row: number; n: number } | null>(null)
  const missTimer = useRef<number | null>(null)
  useEffect(() => () => { if (missTimer.current) window.clearTimeout(missTimer.current) }, [])

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

  /** В мгновенном режиме сошедшаяся пара заперта: перетапывать нечего. */
  const lockedRow = (row: number) => instant && assign[row] === row

  // Порядок банка: перемешан детерминированно, чтобы правая часть не стояла
  // напротив своей левой и при этом не прыгала между рендерами.
  const bankOrder = useMemo(
    () => pairs.map((_, i) => i).sort((a, b) => hash(pairs[a].right + a) - hash(pairs[b].right + b)),
    [pairs],
  )
  // Обратная карта: какая левая строка забрала данную правую плитку.
  const owner = Array<number>(pairs.length).fill(-1)
  assign.forEach((v, i) => { if (v >= 0) owner[v] = i })

  // В обработчиках расклад берётся из ref, а не из замыкания рендера: между двумя
  // быстрыми тапами рендера может не случиться, и второй тап обязан видеть первый.
  const link = (base: number[], row: number, rightIdx: number) => {
    setSelected(null)

    if (instant) {
      if (rightIdx === row) {
        const next = [...base]
        next[row] = rightIdx
        emit(next)
        okChime()
        setBurst(b => ({ row, n: (b?.n ?? 0) + 1 }))
        return
      }
      // Промах: ответ не трогаем — краснеют обе плитки, потом связь распадается.
      missBlip()
      onMiss?.(row)
      setMiss({ row, right: rightIdx })
      if (missTimer.current) window.clearTimeout(missTimer.current)
      missTimer.current = window.setTimeout(() => setMiss(null), 420)
      return
    }

    const next = [...base]
    // Правая плитка занята другой строкой — забираем её (перепривязка без «дырок»).
    const prev = next.findIndex(v => v === rightIdx)
    if (prev >= 0) next[prev] = -1
    next[row] = rightIdx
    emit(next)
  }
  const tapLeft = (row: number) => {
    if (disabled || lockedRow(row) || miss) return
    const base = own.current ?? assign
    if (base[row] >= 0) { const next = [...base]; next[row] = -1; emit(next); setSelected(null); return }
    if (selected?.side === 'right') { link(base, row, selected.idx); return }
    setSelected(selected?.side === 'left' && selected.idx === row ? null : { side: 'left', idx: row })
  }
  const tapRight = (rightIdx: number) => {
    if (disabled || miss) return
    const base = own.current ?? assign
    const row = base.findIndex(v => v === rightIdx)
    if (row >= 0) {
      if (lockedRow(row)) return
      const next = [...base]; next[row] = -1; emit(next); setSelected(null); return
    }
    if (selected?.side === 'left') { link(base, selected.idx, rightIdx); return }
    setSelected(selected?.side === 'right' && selected.idx === rightIdx ? null : { side: 'right', idx: rightIdx })
  }

  const tileBase: React.CSSProperties = {
    position: 'relative',
    display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 46,
    padding: '10px 13px', borderRadius: 12, fontFamily: 'inherit', fontSize: 15,
    lineHeight: 1.35, textAlign: 'left', color: 'var(--color-text)',
    cursor: disabled ? 'default' : 'pointer', transition: 'background .12s, border-color .12s',
  }

  /**
   * У плитки-картинки поля со всех сторон одинаковые. Текстовой плитке боковые
   * поля шире вертикальных нужны — буквы иначе упираются в рамку; но вокруг
   * картинки та же пара 10/13 читается как перекос: цветной квадрат стоит в
   * рамке не по центру, а прижатым сверху и снизу.
   */
  const imageTile: React.CSSProperties = { padding: 10 }

  /** Плитка: обычная / выбранная / связанная / с вердиктом (зелёная, красная). */
  const skin = (state: { active: boolean; num: number; ok: boolean | null }): React.CSSProperties => {
    if (state.ok !== null) return {
      border: `1.5px solid ${state.ok ? '#6EE7A0' : '#F48B91'}`,
      background: state.ok ? 'var(--color-green-soft)' : 'var(--color-red-soft)',
      fontWeight: 600,
    }
    if (state.num > 0 || state.active) return {
      border: '1.5px solid var(--color-accent)',
      background: 'var(--color-purple-soft)', fontWeight: 600,
    }
    return {
      border: '1.5px solid var(--color-border-soft)',
      background: 'var(--color-bg-2)', fontWeight: 500,
    }
  }

  /**
   * Номер пары — нить между колонками, пока вердикта нет.
   *
   * В мгновенном режиме и вообще везде, где пара уже покрашена, номеров НЕТ:
   * цифра сообщала бы только «эти две плитки я соединил» — то есть ровно то,
   * что ученик и так только что сделал, и делала бы это поверх вердикта.
   * Номер остаётся там, где вердикта нет вовсе (тест): он единственный
   * показывает, что с чем связано.
   */
  const Badge = ({ num, ok }: { num: number; ok: boolean | null }) => (
    <span style={{
      flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, color: '#fff',
      background: ok === null ? 'var(--grad-purple)' : ok ? '#3FAE6E' : '#E2646B',
    }}>{num}</span>
  )

  /** Вердикт плитки: зелёная — сошлось, красная — только что промахнулись. */
  const verdictOf = (row: number): boolean | null => {
    if (row < 0) return null
    if (instant) {
      if (miss && miss.row === row) return false
      return assign[row] === row ? true : null
    }
    return showVerdict && assign[row] >= 0 ? assign[row] === row : null
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignItems: 'start' }}>
      {/* Левая колонка — слова в авторском порядке */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        {pairs.map((pair, i) => {
          const picked = assign[i]
          const ok = instant ? verdictOf(i) : (showVerdict ? picked === i : null)
          // Цифра — нить между колонками, пока пары не покрашены. Есть вердикт —
          // цвет и говорит, что с чем сошлось: номер поверх него лишний шум.
          const num = !instant && picked >= 0 && ok === null ? i + 1 : 0
          // Эталон дописывается только после сдачи: в мгновенном режиме
          // неверная пара распадается и остаётся вопросом, а не ответом.
          const showAnswer = showVerdict && !instant && ok === false
          return (
            <button
              key={i}
              onClick={() => tapLeft(i)}
              style={{
                ...tileBase,
                ...(pair.leftImage ? imageTile : null),
                ...skin({ active: selected?.side === 'left' && selected.idx === i, num, ok }),
              }}
            >
              {num > 0 && <Badge num={num} ok={ok} />}
              {/* Картинке отдаём всю ширину плитки и снимаем строчный бокс:
                  обёртка-inline меряется по своему содержимому и не дотягивается
                  до правого поля, а её межстрочный интервал добавляет сверху и
                  снизу по десятку точек — картинка стоит в рамке со сдвигом
                  влево, и поля вокруг неё разные. */}
              <span style={{ minWidth: 0, wordBreak: 'break-word', ...(pair.leftImage ? { flex: 1, display: 'block' } : null) }}>
                {pair.leftImage
                  ? <SideImage src={pair.leftImage} alt={pair.left} />
                  : <>{pair.left}<ScriptHint text={pair.left} lang={lang} /></>}
                {/* Эталон после сдачи: когда парой была картинка, показываем
                    саму картинку — «правильный ответ: cat» рядом с чужой
                    фотографией разобрать невозможно. */}
                {showAnswer && (
                  <span style={{ display: 'block', marginTop: 5 }}>
                    {pair.rightImage
                      ? <SideImage src={pair.rightImage} alt={pair.right} />
                      : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-green-text)' }}>{pair.right}</span>}
                  </span>
                )}
              </span>
              {burst?.row === i && <StarBurst key={burst.n} />}
            </button>
          )
        })}
      </div>

      {/* Правая колонка — переводы, перемешаны */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        {bankOrder.map(idx => {
          const row = owner[idx]
          const ok = instant
            ? (miss && miss.right === idx ? false : verdictOf(row))
            : (showVerdict && row >= 0 ? row === idx : null)
          const num = !instant && row >= 0 && ok === null ? row + 1 : 0
          return (
            <button
              key={idx}
              onClick={() => tapRight(idx)}
              style={{
                ...tileBase,
                ...(pairs[idx].rightImage ? imageTile : null),
                ...skin({ active: selected?.side === 'right' && selected.idx === idx, num, ok }),
              }}
            >
              {num > 0 && <Badge num={num} ok={ok} />}
              <span style={{ minWidth: 0, wordBreak: 'break-word', ...(pairs[idx].rightImage ? { flex: 1, display: 'block' } : null) }}>
                {pairs[idx].rightImage
                  ? <SideImage src={pairs[idx].rightImage!} alt={pairs[idx].right} />
                  : <>{pairs[idx].right}<ScriptHint text={pairs[idx].right} lang={lang} /></>}
              </span>
              {burst?.row === idx && instant && <StarBurst key={`r${burst.n}`} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
