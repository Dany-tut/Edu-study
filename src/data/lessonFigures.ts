// ─────────────────────────────────────────────────────────────────────────────
// Иллюстрации конспекта
//
// Языковой конспект держится на таблицах и схемах: ряды каны, строй слога,
// лестница вежливых уровней, ось времён. Текстом они не объясняются — текстом
// они пересказываются, и ученик всё равно рисует их себе в тетрадь сам.
//
// Рисуем векторно (общая обёртка — svgSheet.ts): картинка целиком наша, без
// чужой лицензии, весит килобайты и уезжает в JSONB вместе с курсом. В юните
// сида она указывается как unit.figures (см. languageCourse.ts), в конспект
// встаёт строкой-маркером (см. lib/theoryImages.ts).
//
// ЗАЧЕМ ЗДЕСЬ ГЕНЕРАТОРЫ, А НЕ ГОТОВЫЕ КАРТИНКИ
// Восемь языковых курсов рисуют одно и то же разными буквами: таблицу письма,
// таблицу форм, схему предложения, противопоставление двух конструкций. Ручной
// SVG на каждый урок — это сотни листов, которые невозможно править. Поэтому
// здесь набор генераторов, а в курсе лежат только данные.
//
// ШИРИНА
// 640 — ширина колонки конспекта на мониторе. Всё, что шире, ученик читает
// уменьшенным; поэтому таблицы считают ширину колонок от содержимого, а не
// растягиваются на фиксированную сетку.
// ─────────────────────────────────────────────────────────────────────────────

import { toDataUri, esc, sheet, PAPER, INK, MUTED, GRID, TILE, ACCENT, ACCENT_SOFT } from './svgSheet'

const W = 640

/**
 * Ширина строки в пикселях.
 *
 * Считать длину в символах нельзя: хангыль, кана и иероглифы рисуются почти
 * квадратными (ширина ≈ кегль), а латиница с кириллицей — вдвое уже. Колонка,
 * посчитанная «по числу знаков», в корейской таблице переполнялась, а в
 * русской пустовала.
 */
const WIDE_CHAR = /[\u1100-\u11FF\u2E80-\uA4CF\uA960-\uA97F\uAC00-\uD7FF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60]/
/**
 * Кегль, при котором строка помещается в отведённую ширину.
 *
 * Ужать текст лучше, чем выпустить его за рамку: в таблице форм длинная
 * английская фраза и короткая корейская стоят в одной колонке.
 */
function fitFs(text: string, maxW: number, base: number, min = 9): number {
  const need = textW(text, base)
  if (need <= maxW || !text) return base
  return Math.max(min, Math.round((base * maxW / need) * 10) / 10)
}

function textW(text: string, fs: number): number {
  let w = 0
  for (const ch of text) w += WIDE_CHAR.test(ch) ? fs : fs * 0.55
  return w
}

/**
 * Сноска под схемой — то, что в таблицу не влезает.
 *
 * Переносится по словам: длинная сноска в одну строку просто уезжала за край
 * листа и обрезалась, а обрезается там как раз оговорка, ради которой сноска
 * и написана.
 */
const NOTE_FS = 11.5
const NOTE_LH = 16

function noteLines(note: string, w: number): string[] {
  const max = w - 36
  const lines: string[] = []
  let line = ''
  for (const word of note.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && textW(next, NOTE_FS) > max) { lines.push(line); line = word }
    else line = next
  }
  if (line) lines.push(line)
  return lines
}

const noteH = (note?: string, w = W) => (note ? 10 + noteLines(note, w).length * NOTE_LH : 8)

/**
 * Сноска, прижатая к нижнему краю листа.
 *
 * Позицию считаем от высоты листа, а не от конца содержимого: сноска в две
 * строки, поставленная по фиксированному отступу, вылезала за нижний край и
 * обрезалась вместе со второй строкой.
 */
function noteAt(w: number, h: number, note?: string): string {
  if (!note) return ''
  const first = h - noteH(note, w) + 18
  return noteLines(note, w)
    .map((line, i) => `<text x="${w / 2}" y="${first + i * NOTE_LH}" text-anchor="middle" font-size="${NOTE_FS}" fill="${MUTED}">${esc(line)}</text>`)
    .join('')
}

// ─── Таблица письма ──────────────────────────────────────────────────────────

/** Клетка таблицы письма: сам знак и его чтение. */
export interface CharCell {
  sym: string
  read?: string
  /** Знак есть в системе, но в этом уроке не разбирается — гасим. */
  dim?: boolean
}

/**
 * Ряды знаков с чтением — хангыль, кана, алфавит.
 *
 * Пустая клетка (null) — это не дырка в вёрстке, а факт языка: в ряду や нет
 * слогов на i и e, и таблица должна показывать пропуск, а не смыкаться.
 */
export function charGrid(
  title: string,
  rows: Array<Array<CharCell | null>>,
  opts: { colHeads?: string[]; rowHeads?: string[]; note?: string } = {},
): string {
  const cols = Math.max(...rows.map(r => r.length))
  const cellW = 66, cellH = 60, gap = 6
  const headW = opts.rowHeads?.length ? 54 : 0
  const headH = opts.colHeads?.length ? 22 : 0
  const gridW = headW + cols * cellW + (cols - 1) * gap
  const w = Math.max(gridW + 40, 320)
  const x0 = (w - gridW) / 2 + headW
  const y0 = 46 + headH
  const gridH = rows.length * cellH + (rows.length - 1) * gap
  const h = y0 + gridH + noteH(opts.note, w)

  const parts: string[] = []

  opts.colHeads?.forEach((head, c) => {
    parts.push(`<text x="${x0 + c * (cellW + gap) + cellW / 2}" y="${y0 - 8}" text-anchor="middle" font-size="11" font-weight="700" fill="${MUTED}">${esc(head)}</text>`)
  })

  rows.forEach((row, r) => {
    const y = y0 + r * (cellH + gap)
    const rowHead = opts.rowHeads?.[r]
    if (rowHead) {
      parts.push(`<text x="${x0 - 12}" y="${y + cellH / 2 + 4}" text-anchor="end" font-size="12" font-weight="700" fill="${MUTED}">${esc(rowHead)}</text>`)
    }
    row.forEach((cell, c) => {
      if (!cell) return
      const x = x0 + c * (cellW + gap)
      const fill = cell.dim ? PAPER : TILE
      const ink = cell.dim ? MUTED : INK
      parts.push(
        `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="10" fill="${fill}" stroke="${cell.dim ? GRID : INK}" stroke-width="${cell.dim ? 1 : 1.3}"/>` +
        `<text x="${x + cellW / 2}" y="${y + (cell.read ? 32 : 38)}" text-anchor="middle" font-size="${cell.sym.length > 2 ? 18 : 24}" font-weight="600" fill="${ink}">${esc(cell.sym)}</text>` +
        // Чтение длиннее пары знаков ужимаем: иначе подпись вылезает за клетку
        // и наезжает на соседнюю.
        (cell.read ? `<text x="${x + cellW / 2}" y="${y + 50}" text-anchor="middle" font-size="${cell.read.length > 7 ? 8.5 : 11.5}" fill="${MUTED}">${esc(cell.read)}</text>` : ''),
      )
    })
  })

  parts.push(noteAt(w, h, opts.note))
  return toDataUri(sheet(w, h, title, parts.join('')))
}

// ─── Таблица форм ────────────────────────────────────────────────────────────

/**
 * Таблица форм: спряжения, падежи, вежливые уровни.
 *
 * Ширина колонок считается по самой длинной строке в колонке — иначе японская
 * форма в четыре знака и английское предложение в семь слов получают одинаковое
 * место, и половина таблицы уходит в пустоту, а вторая половина не влезает.
 */
export function formTable(
  title: string,
  headers: string[],
  rows: string[][],
  opts: { note?: string; highlight?: number[] } = {},
): string {
  const cols = headers.length
  const colW = headers.map((head, c) => {
    const longest = Math.max(textW(head, 12), ...rows.map(r => textW(r[c] ?? '', 12.5)))
    return Math.min(Math.max(longest + 26, 78), 260)
  })
  const total = colW.reduce((a, b) => a + b, 0)
  const w = Math.max(Math.min(total + 40, W + 40), 320)
  // Ужимаем пропорционально, если сумма колонок вылезла за лист.
  const scale = total + 40 > w ? (w - 40) / total : 1
  const cw = colW.map(x => x * scale)
  const x0 = (w - cw.reduce((a, b) => a + b, 0)) / 2
  const headH = 32, rowH = 34
  const y0 = 46
  const tableH = headH + rows.length * rowH
  const h = y0 + tableH + noteH(opts.note, w)

  const parts: string[] = []
  const colX = (c: number) => x0 + cw.slice(0, c).reduce((a, b) => a + b, 0)

  parts.push(`<rect x="${x0}" y="${y0}" width="${cw.reduce((a, b) => a + b, 0)}" height="${headH}" rx="8" fill="${ACCENT_SOFT}"/>`)
  headers.forEach((head, c) => {
    parts.push(`<text x="${colX(c) + cw[c] / 2}" y="${y0 + 21}" text-anchor="middle" font-size="12" font-weight="700" fill="${ACCENT}">${esc(head)}</text>`)
  })

  rows.forEach((row, r) => {
    const y = y0 + headH + r * rowH
    const on = opts.highlight?.includes(r)
    if (on) {
      parts.push(`<rect x="${x0}" y="${y}" width="${cw.reduce((a, b) => a + b, 0)}" height="${rowH}" fill="${ACCENT_SOFT}"/>`)
    }
    parts.push(`<line x1="${x0}" y1="${y}" x2="${x0 + cw.reduce((a, b) => a + b, 0)}" y2="${y}" stroke="${GRID}" stroke-width="1"/>`)
    row.forEach((cell, c) => {
      const centred = c > 0
      const tx = centred ? colX(c) + cw[c] / 2 : colX(c) + 12
      // Первая колонка — подпись строки, её читают слева направо; остальные
      // держим по центру, чтобы формы стояли столбиком.
      parts.push(`<text x="${tx}" y="${y + 22}" text-anchor="${centred ? 'middle' : 'start'}" font-size="${fitFs(cell, cw[c] - 18, 12.5)}" font-weight="${c === 0 ? 700 : 500}" fill="${c === 0 ? INK : (on ? ACCENT : INK)}">${esc(cell)}</text>`)
    })
  })
  parts.push(`<rect x="${x0}" y="${y0}" width="${cw.reduce((a, b) => a + b, 0)}" height="${tableH}" rx="8" fill="none" stroke="${INK}" stroke-width="1.3"/>`)
  parts.push(noteAt(w, h, opts.note))
  return toDataUri(sheet(w, h, title, parts.join('')))
}

// ─── Схема фразы ─────────────────────────────────────────────────────────────

/** Кусок схемы предложения: сам элемент и подпись под ним. */
export interface FormulaChunk {
  text: string
  note?: string
  /** Ради чего схема нарисована — красится акцентом. */
  key?: boolean
}

/**
 * Схема фразы: блоки в порядке слов с подписью под каждым.
 *
 * Порядок слов — первое, что ломается при переносе с русского. Список «сначала
 * тема, потом объект, глагол в конце» держать в голове тяжелее, чем одну
 * картинку с четырьмя блоками.
 */
export function formulaStrip(
  title: string,
  chunks: FormulaChunk[],
  opts: { note?: string; example?: string } = {},
): string {
  const boxW = chunks.map(c => Math.max(
    textW(c.text, 15) + 26,
    Math.min(textW(c.note ?? '', 11) + 16, 160),
    64,
  ))
  const gap = 16
  const total = boxW.reduce((a, b) => a + b, 0) + gap * (chunks.length - 1)
  const w = Math.max(Math.min(total + 48, W + 40), 320)
  const scale = total + 48 > w ? (w - 48) / total : 1
  const bw = boxW.map(x => x * scale)
  const x0 = (w - (bw.reduce((a, b) => a + b, 0) + gap * (chunks.length - 1))) / 2
  const y0 = 54, boxH = 46
  const exampleY = y0 + boxH + 44
  const h = exampleY + (opts.example ? 12 : -14) + noteH(opts.note, w) + 10

  const parts: string[] = []
  let x = x0
  chunks.forEach((chunk, i) => {
    const cw = bw[i]
    parts.push(
      `<rect x="${x}" y="${y0}" width="${cw}" height="${boxH}" rx="12" fill="${chunk.key ? ACCENT_SOFT : TILE}" stroke="${chunk.key ? ACCENT : INK}" stroke-width="1.4"/>` +
      `<text x="${x + cw / 2}" y="${y0 + 29}" text-anchor="middle" font-size="15" font-weight="700" fill="${chunk.key ? ACCENT : INK}">${esc(chunk.text)}</text>` +
      (chunk.note ? `<text x="${x + cw / 2}" y="${y0 + boxH + 18}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(chunk.note)}</text>` : ''),
    )
    if (i < chunks.length - 1) {
      parts.push(`<text x="${x + cw + gap / 2}" y="${y0 + 30}" text-anchor="middle" font-size="15" font-weight="700" fill="${MUTED}">+</text>`)
    }
    x += cw + gap
  })

  if (opts.example) {
    parts.push(`<text x="${w / 2}" y="${exampleY}" text-anchor="middle" font-size="13.5" font-weight="600" fill="${INK}">${esc(opts.example)}</text>`)
  }
  parts.push(noteAt(w, h, opts.note))
  return toDataUri(sheet(w, h, title, parts.join('')))
}

// ─── Противопоставление ──────────────────────────────────────────────────────

/** Колонка сравнения: заголовок, расшифровка, примеры. */
export interface ContrastSide {
  head: string
  sub?: string
  items: string[]
}

/**
 * Две конструкции рядом — 이/가 против 은/는, 에 против 에서, ser против estar.
 *
 * Пары, которые ученик путает, объясняются только контрастом: каждая по
 * отдельности выглядит понятной, вопрос всегда в выборе между ними.
 */
export function contrastPair(
  title: string,
  left: ContrastSide,
  right: ContrastSide,
  opts: { note?: string } = {},
): string {
  const w = W
  const colW = (w - 60 - 30) / 2
  const y0 = 46
  const lines = Math.max(left.items.length, right.items.length)
  const boxH = 60 + lines * 22
  const h = y0 + boxH + noteH(opts.note) + 6

  const col = (side: ContrastSide, x: number, accent: boolean) => {
    const parts = [
      `<rect x="${x}" y="${y0}" width="${colW}" height="${boxH}" rx="14" fill="${accent ? ACCENT_SOFT : TILE}" stroke="${accent ? ACCENT : INK}" stroke-width="1.4"/>`,
      `<text x="${x + colW / 2}" y="${y0 + 28}" text-anchor="middle" font-size="17" font-weight="700" fill="${accent ? ACCENT : INK}">${esc(side.head)}</text>`,
    ]
    if (side.sub) parts.push(`<text x="${x + colW / 2}" y="${y0 + 47}" text-anchor="middle" font-size="11.5" fill="${MUTED}">${esc(side.sub)}</text>`)
    side.items.forEach((item, i) => {
      parts.push(`<text x="${x + 16}" y="${y0 + 68 + i * 22}" font-size="${fitFs(`• ${item}`, colW - 30, 12.5)}" fill="${INK}">• ${esc(item)}</text>`)
    })
    return parts.join('')
  }

  const body =
    col(left, 30, true) +
    col(right, 30 + colW + 30, false) +
    `<circle cx="${w / 2}" cy="${y0 + boxH / 2}" r="15" fill="${PAPER}" stroke="${INK}" stroke-width="1.3"/>` +
    `<text x="${w / 2}" y="${y0 + boxH / 2 + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${INK}">vs</text>` +
    noteAt(w, h, opts.note)

  return toDataUri(sheet(w, h, title, body))
}

// ─── Ось времени ─────────────────────────────────────────────────────────────

/** Точка на оси: подпись сверху (форма) и снизу (пример). */
export interface TimelinePoint {
  label: string
  sub?: string
  key?: boolean
}

/** Времена глагола на одной оси — прошедшее, настоящее, будущее. */
export function timelineFigure(
  title: string,
  points: TimelinePoint[],
  opts: { note?: string; axis?: string } = {},
): string {
  const w = W
  const y = 92
  const x0 = 46, x1 = w - 46
  const step = (x1 - x0) / (points.length - 1 || 1)
  const h = y + 70 + noteH(opts.note)

  const parts = [
    `<defs><marker id="tl" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${INK}"/></marker></defs>`,
    `<line x1="${x0 - 16}" y1="${y}" x2="${x1 + 16}" y2="${y}" stroke="${INK}" stroke-width="1.6" marker-end="url(#tl)"/>`,
  ]
  // Подпись оси — в правом верхнем углу листа: у самой стрелки она садится на
  // подпись последней точки.
  if (opts.axis) parts.push(`<text x="${w - 20}" y="46" text-anchor="end" font-size="11" fill="${MUTED}">${esc(opts.axis)} →</text>`)

  points.forEach((p, i) => {
    const x = points.length === 1 ? (x0 + x1) / 2 : x0 + i * step
    // Подпись крайней точки, выровненная по центру, наполовину уезжает за лист:
    // первую прижимаем к левому краю, последнюю — к правому.
    const first = i === 0 && points.length > 1
    const last = i === points.length - 1 && points.length > 1
    const anchor = first ? 'start' : last ? 'end' : 'middle'
    const tx = first ? x - 12 : last ? x + 12 : x
    parts.push(
      `<circle cx="${x}" cy="${y}" r="${p.key ? 9 : 7}" fill="${p.key ? ACCENT : PAPER}" stroke="${p.key ? ACCENT : INK}" stroke-width="1.6"/>` +
      `<text x="${tx}" y="${y - 20}" text-anchor="${anchor}" font-size="14" font-weight="700" fill="${p.key ? ACCENT : INK}">${esc(p.label)}</text>` +
      (p.sub ? `<text x="${tx}" y="${y + 28}" text-anchor="${anchor}" font-size="12" fill="${MUTED}">${esc(p.sub)}</text>` : ''),
    )
  })
  parts.push(noteAt(w, h, opts.note))
  return toDataUri(sheet(w, h, title, parts.join('')))
}

// ─── Лестница ────────────────────────────────────────────────────────────────

/** Ступень: что за уровень и где он уместен. */
export interface LadderStep {
  label: string
  sub?: string
  key?: boolean
}

/**
 * Ступени снизу вверх — вежливые уровни, регистры, уровни экзамена.
 *
 * Вежливость — не список форм, а шкала: важно не «какие бывают», а «что выше
 * чего» и с кем каждая уместна. Список этого не показывает, лестница — да.
 */
export function ladderFigure(
  title: string,
  steps: LadderStep[],
  opts: { note?: string } = {},
): string {
  const w = W
  const stepH = 46, gap = 8
  const y0 = 46
  const h = y0 + steps.length * (stepH + gap) + noteH(opts.note)
  const maxW = w - 80
  const minW = 190

  const parts: string[] = []
  // Сверху — самая «высокая» ступень; она же самая узкая, чтобы лестница
  // читалась как лестница, а не как список прямоугольников.
  steps.forEach((step, i) => {
    const y = y0 + i * (stepH + gap)
    const frac = steps.length === 1 ? 1 : i / (steps.length - 1)
    const bw = minW + (maxW - minW) * frac
    const x = (w - bw) / 2
    parts.push(
      `<rect x="${x}" y="${y}" width="${bw}" height="${stepH}" rx="10" fill="${step.key ? ACCENT_SOFT : TILE}" stroke="${step.key ? ACCENT : INK}" stroke-width="1.3"/>` +
      `<text x="${x + 16}" y="${y + (step.sub ? 21 : 28)}" font-size="14" font-weight="700" fill="${step.key ? ACCENT : INK}">${esc(step.label)}</text>` +
      (step.sub ? `<text x="${x + 16}" y="${y + 37}" font-size="11.5" fill="${MUTED}">${esc(step.sub)}</text>` : ''),
    )
  })
  parts.push(noteAt(w, h, opts.note))
  return toDataUri(sheet(w, h, title, parts.join('')))
}

// ─── Строение слога ──────────────────────────────────────────────────────────

/**
 * Слоговой блок хангыля: 초성 + 중성 (+ 받침) собираются в один квадрат.
 *
 * Главная особенность корейского письма и главный ступор начинающих: буквы
 * читаются не в строку, а собираются в блок, и место буквы в блоке зависит от
 * того, вертикальная гласная или горизонтальная.
 */
export function hangulSyllableFigure(): string {
  const w = W, h = 262
  const box = (x: number, y: number, bw: number, bh: number, sym: string, label: string, tone: 'ink' | 'accent' | 'muted') => {
    const stroke = tone === 'accent' ? ACCENT : tone === 'muted' ? MUTED : INK
    const fill = tone === 'accent' ? ACCENT_SOFT : TILE
    // Кегль от высоты клетки: в «этаже» слога (26 px) знак 26 px не помещается
    // и вылезает за рамку.
    const fs = bh < 40 ? 19 : 26
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-dasharray="${tone === 'muted' ? '5 4' : '0'}"/>` +
      `<text x="${x + bw / 2}" y="${y + bh / 2 + fs / 3}" text-anchor="middle" font-size="${fs}" font-weight="600" fill="${stroke}">${esc(sym)}</text>` +
      `<text x="${x + bw / 2}" y="${y + bh + 15}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(label)}</text>`
  }

  const body = [
    // Вертикальная гласная: согласная слева, гласная справа.
    `<text x="150" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="${MUTED}">Гласная вертикальная — рядом</text>`,
    box(96, 70, 52, 52, 'ㅎ', '초성', 'ink'),
    box(152, 70, 52, 52, 'ㅏ', '중성', 'accent'),
    `<text x="228" y="104" font-size="20" font-weight="700" fill="${MUTED}">=</text>`,
    `<rect x="252" y="70" width="52" height="52" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`,
    `<text x="278" y="107" text-anchor="middle" font-size="30" font-weight="600" fill="${INK}">하</text>`,
    // Горизонтальная гласная: согласная сверху, гласная снизу.
    `<text x="470" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="${MUTED}">Гласная горизонтальная — снизу</text>`,
    box(392, 70, 52, 26, 'ㄱ', '', 'ink'),
    box(392, 100, 52, 26, 'ㅗ', '', 'accent'),
    `<text x="466" y="104" font-size="20" font-weight="700" fill="${MUTED}">=</text>`,
    `<rect x="492" y="70" width="52" height="52" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`,
    `<text x="518" y="107" text-anchor="middle" font-size="30" font-weight="600" fill="${INK}">고</text>`,
    // Третий этаж — 받침.
    `<line x1="40" y1="160" x2="${w - 40}" y2="160" stroke="${GRID}" stroke-width="1"/>`,
    `<text x="${w / 2}" y="182" text-anchor="middle" font-size="12" font-weight="700" fill="${MUTED}">Третья буква становится «подставкой» — 받침</text>`,
    box(214, 192, 52, 24, 'ㅎ', '', 'ink'),
    box(272, 192, 52, 24, 'ㅏ', '', 'accent'),
    box(214, 220, 110, 24, 'ㄴ', '받침', 'ink'),
    `<text x="348" y="222" font-size="20" font-weight="700" fill="${MUTED}">=</text>`,
    `<rect x="376" y="192" width="52" height="52" rx="8" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`,
    `<text x="402" y="229" text-anchor="middle" font-size="30" font-weight="600" fill="${INK}">한</text>`,
  ].join('')

  return toDataUri(sheet(w, h, 'Слог собирается в квадрат', body))
}

// ─── Часы ────────────────────────────────────────────────────────────────────

/** Циферблат с подписью — «который час» на любом языке. */
export interface ClockItem { h: number; m: number; label: string }

/**
 * Ряд циферблатов: время словами рядом со стрелками.
 *
 * В корейском и японском час и минуты считаются разными системами счёта;
 * увидеть это на трёх циферблатах быстрее, чем прочитать про это абзац.
 */
export function clockRow(title: string, items: ClockItem[], opts: { note?: string } = {}): string {
  const r = 42
  const w = Math.max(items.length * (r * 2 + 46) + 20, 320)
  const y = 96
  const h = y + r + 58 + noteH(opts.note, w)
  const step = w / items.length

  const hand = (cx: number, cy: number, angleDeg: number, len: number, width: number) => {
    const a = (angleDeg - 90) * Math.PI / 180
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + len * Math.cos(a)).toFixed(1)}" y2="${(cy + len * Math.sin(a)).toFixed(1)}" stroke="${INK}" stroke-width="${width}" stroke-linecap="round"/>`
  }

  const parts = items.flatMap((item, i) => {
    const cx = step * (i + 0.5)
    const ticks = Array.from({ length: 12 }, (_, k) => {
      const a = (k * 30 - 90) * Math.PI / 180
      return `<circle cx="${(cx + (r - 8) * Math.cos(a)).toFixed(1)}" cy="${(y + (r - 8) * Math.sin(a)).toFixed(1)}" r="${k % 3 === 0 ? 2.4 : 1.4}" fill="${MUTED}"/>`
    }).join('')
    return [
      `<circle cx="${cx}" cy="${y}" r="${r}" fill="${PAPER}" stroke="${INK}" stroke-width="1.6"/>`,
      ticks,
      hand(cx, y, (item.h % 12) * 30 + item.m * 0.5, r - 18, 3.2),
      hand(cx, y, item.m * 6, r - 10, 2),
      `<circle cx="${cx}" cy="${y}" r="2.6" fill="${INK}"/>`,
      `<text x="${cx}" y="${y + r + 26}" text-anchor="middle" font-size="13" font-weight="700" fill="${ACCENT}">${esc(item.label)}</text>`,
    ]
  })
  parts.push(noteAt(w, h, opts.note))
  return toDataUri(sheet(w, h, title, parts.join('')))
}
