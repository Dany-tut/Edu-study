// ─────────────────────────────────────────────────────────────────────────────
// Сетка кроссворда из списка слов
//
// ЗАЧЕМ СЧИТАТЬ, А НЕ РИСОВАТЬ РУКАМИ. Кроссворд к уроку — это десять слов
// урока, а слова урока меняются: добавили одно, переписали перевод — и
// нарисованная руками сетка разошлась с содержанием. Здесь сетка выводится из
// самих слов, поэтому расходиться ей не с чем.
//
// ЕДИНИЦА КЛЕТКИ — ЗНАК. Для корейского это слог (약속 = 약 + 속): именно так
// кроссворды и печатают в корейских учебниках, и именно так слово держится в
// памяти. Для алфавитного языка знак — буква, и всё работает так же.
//
// ПОЧЕМУ БЕЗ СЛУЧАЙНОСТИ. Сид курса обязан собираться одинаково при каждой
// сборке, а сетка не должна прыгать между перерисовками у ученика. Поэтому
// порядок постановки слов задан длиной и алфавитом, а не Math.random.
//
// ПОЧЕМУ СЛОВО БЕЗ ПЕРЕСЕЧЕНИЯ ВСЁ РАВНО СТАВИТСЯ. Десять слов одного урока —
// это не подобранный кроссвордистом набор: у 약속, 택시 и 오토바이 общих слогов
// нет вовсе, и требование «только через пересечение» оставило бы от урока одно
// слово. Поэтому пересечение берётся везде, где оно есть (там оно и работает —
// слог на перекрёстке проверяется вторым словом), а остальные слова встают
// отдельными строками. Это ровно то, что делают рабочие тетради.
// ─────────────────────────────────────────────────────────────────────────────

export interface CrosswordWord {
  answer: string
  clue: string
  /** Клетка начала — строка и столбец в готовой сетке. */
  row: number
  col: number
  dir: 'across' | 'down'
  /** Номер, которым слово подписано в сетке (общий для двух направлений). */
  number: number
}

export interface CrosswordGrid {
  rows: number
  cols: number
  /** Буква/слог в клетке: ключ «строка,столбец». Пустых клеток здесь нет. */
  cells: Record<string, string>
  /** Номер, который печатается в углу клетки. */
  numbers: Record<string, number>
  words: CrosswordWord[]
  /** Слова, которым не нашлось пересечения, — в сетку они не попали. */
  dropped: string[]
}

const key = (r: number, c: number) => `${r},${c}`

/** Знаки слова: для хангыля — слоги, для алфавитного языка — буквы. */
const unitsOf = (word: string) => Array.from(word.replace(/\s+/g, ''))

interface Placed {
  units: string[]
  row: number
  col: number
  dir: 'across' | 'down'
  answer: string
  clue: string
}

/**
 * Влезает ли слово в это место.
 *
 * Правила обычные для кроссворда: занятая клетка обязана совпасть по знаку;
 * клетки прямо перед словом и сразу после него должны быть пусты (иначе два
 * слова слипнутся в одно); у клетки, которая НЕ пересечение, не должно быть
 * соседей сбоку — иначе рядом читается слово, которого никто не загадывал.
 */
function fits(cells: Map<string, string>, units: string[], row: number, col: number, dir: 'across' | 'down'): boolean {
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  // Торцы.
  if (cells.has(key(row - dr, col - dc))) return false
  if (cells.has(key(row + dr * units.length, col + dc * units.length))) return false

  let crossings = 0
  for (let i = 0; i < units.length; i++) {
    const r = row + dr * i
    const c = col + dc * i
    const here = cells.get(key(r, c))
    if (here !== undefined) {
      if (here !== units[i]) return false
      crossings++
      continue
    }
    // Свободная клетка: сбоку от неё должно быть пусто.
    const sideA = dir === 'across' ? key(r - 1, c) : key(r, c - 1)
    const sideB = dir === 'across' ? key(r + 1, c) : key(r, c + 1)
    if (cells.has(sideA) || cells.has(sideB)) return false
  }
  return crossings > 0
}

/**
 * Сетка по словам. Слова ставятся от длинного к короткому, каждое следующее —
 * первым найденным пересечением с уже поставленными.
 */
export function buildCrossword(items: Array<{ answer: string; clue: string }>): CrosswordGrid {
  const all = items.map(i => ({ ...i, units: unitsOf(i.answer) }))
  // Слово в один знак клеткой не загадаешь: подсказка и ответ совпадут.
  const list = all
    .filter(i => i.units.length >= 2)
    .sort((a, b) => b.units.length - a.units.length || a.answer.localeCompare(b.answer, 'ko'))
  const tooShort = all.filter(i => i.units.length < 2).map(i => i.answer)

  const cells = new Map<string, string>()
  const placed: Placed[] = []
  const dropped: string[] = [...tooShort]

  /** Попробовать поставить слово пересечением с уже стоящими. */
  const tryCross = (item: { answer: string; clue: string; units: string[] }): boolean => {
    for (const p of placed) {
      for (let pi = 0; pi < p.units.length; pi++) {
        for (let wi = 0; wi < item.units.length; wi++) {
          if (p.units[pi] !== item.units[wi]) continue
          const dir = p.dir === 'across' ? 'down' : 'across'
          const cellR = p.dir === 'across' ? p.row : p.row + pi
          const cellC = p.dir === 'across' ? p.col + pi : p.col
          const row = dir === 'down' ? cellR - wi : cellR
          const col = dir === 'across' ? cellC - wi : cellC
          if (!fits(cells, item.units, row, col, dir)) continue
          item.units.forEach((u, i) => {
            cells.set(key(row + (dir === 'down' ? i : 0), col + (dir === 'across' ? i : 0)), u)
          })
          placed.push({ ...item, row, col, dir })
          return true
        }
      }
    }
    return false
  }

  /** Поставить отдельной строкой под всем, что уже есть. */
  const putApart = (item: { answer: string; clue: string; units: string[] }) => {
    let bottom = -3
    for (const k of cells.keys()) bottom = Math.max(bottom, Number(k.split(',')[0]))
    // Три пустые строки над словом: иначе к нему уже не подвесить вертикальное
    // слово — торцевая клетка упрётся в соседа сверху.
    const row = bottom + 3
    item.units.forEach((u, i) => cells.set(key(row, i), u))
    placed.push({ ...item, row, col: 0, dir: 'across' })
  }

  // Два прохода. Сначала выбираем ВСЁ, что складывается в пересечения: слово,
  // отправленное в отдельную строку раньше времени, перекрывает торцы соседям и
  // забирает у них последний шанс пересечься. Когда полный проход не ставит
  // больше ничего, отселяем ровно одно слово — и снова ищем пересечения, теперь
  // уже с ним.
  const queue = [...list]
  if (queue.length > 0) {
    const first = queue.shift()!
    first.units.forEach((u, i) => cells.set(key(0, i), u))
    placed.push({ ...first, row: 0, col: 0, dir: 'across' })
  }
  while (queue.length > 0) {
    let progress = false
    for (let i = 0; i < queue.length;) {
      if (tryCross(queue[i])) { queue.splice(i, 1); progress = true } else i++
    }
    if (!progress) putApart(queue.shift()!)
  }

  // Сжатие по вертикали. Отселённые слова ставились с запасом в три строки —
  // он нужен был на время, пока к ним ещё могли подвесить вертикальное слово.
  // Расстановка кончилась, подвешивать больше нечего, и запас превращается в
  // полосы пустоты. Оставляем ровно одну пустую строку между занятыми: меньше
  // нельзя — слова начнут читаться слипшимися сверху вниз.
  {
    const used = new Set<number>()
    for (const k of cells.keys()) used.add(Number(k.split(',')[0]))
    const rowsSorted = [...used].sort((a, b) => a - b)
    const shift = new Map<number, number>()
    let next = rowsSorted[0] ?? 0
    let prev: number | null = null
    for (const r of rowsSorted) {
      if (prev !== null) next += r - prev > 1 ? 2 : 1
      shift.set(r, next)
      prev = r
    }
    const moved = new Map<string, string>()
    for (const [k, v] of cells) {
      const [r, c] = k.split(',').map(Number)
      moved.set(key(shift.get(r) ?? r, c), v)
    }
    cells.clear()
    for (const [k, v] of moved) cells.set(k, v)
    for (const p of placed) p.row = shift.get(p.row) ?? p.row
  }

  // Сдвиг к нулю: пересечения уводят координаты в минус.
  let minR = 0, minC = 0, maxR = 0, maxC = 0
  for (const k of cells.keys()) {
    const [r, c] = k.split(',').map(Number)
    minR = Math.min(minR, r); minC = Math.min(minC, c)
    maxR = Math.max(maxR, r); maxC = Math.max(maxC, c)
  }
  const outCells: Record<string, string> = {}
  for (const [k, v] of cells) {
    const [r, c] = k.split(',').map(Number)
    outCells[key(r - minR, c - minC)] = v
  }

  // Нумерация — по клеткам сверху вниз, слева направо: две стрелки из одной
  // клетки делят один номер, как в печатных кроссвордах.
  const starts = placed.map(p => ({ ...p, row: p.row - minR, col: p.col - minC }))
  const numbers: Record<string, number> = {}
  let n = 0
  const ordered = [...starts].sort((a, b) => a.row - b.row || a.col - b.col)
  for (const p of ordered) {
    const k = key(p.row, p.col)
    if (numbers[k] === undefined) numbers[k] = ++n
  }

  return {
    rows: maxR - minR + 1,
    cols: maxC - minC + 1,
    cells: outCells,
    numbers,
    words: ordered.map(p => ({
      answer: p.answer, clue: p.clue, row: p.row, col: p.col, dir: p.dir,
      number: numbers[key(p.row, p.col)],
    })),
    dropped,
  }
}
