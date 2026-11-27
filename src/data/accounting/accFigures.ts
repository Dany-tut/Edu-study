// ─────────────────────────────────────────────────────────────────────────────
// Схемы курса «Бухгалтерия»
//
// У автора курса нет ни 1С, ни Excel, а настоящие снимки экрана чужих программ
// без разрешения вставлять нельзя. Поэтому всё, что похоже на окно программы,
// рисуется здесь векторно и ВСЕГДА несёт плашку «Учебная реконструкция — не
// снимок экрана»: ученик не должен принять схему за точный интерфейс своего
// релиза. Подписи кнопок берутся из официальной документации и проверяются
// автором урока; расположение элементов — условное.
//
// Таблицы и процессы — обёртки над общими генераторами (formTable, flowFigure),
// чтобы курс выглядел одним набором с остальными предметами.
// ─────────────────────────────────────────────────────────────────────────────
import { toDataUri, esc, sheet, textW, fitFs, wrapLines, INK, MUTED, GRID, TILE, ACCENT, ACCENT_SOFT } from '../svgSheet'
import { formTable } from '../lessonFigures'
import { flowFigure, type FlowStep } from '../bioFigures'

const W = 640
const RECON = 'Учебная реконструкция — не снимок экрана. Расположение элементов условное, проверяйте названия в своём релизе.'
const WARN = '#B42318'
const WARN_SOFT = '#FDECEA'
const OK = '#127A4B'
const OK_SOFT = '#E4F5EC'

/** Таблица «было → стало», справочная таблица, сравнение норм. */
export function accTable(title: string, headers: string[], rows: string[][], opts: { note?: string; highlight?: number[] } = {}): string {
  return formTable(title, headers, rows, opts)
}

/** Процесс по шагам. */
export function accFlow(title: string, steps: FlowStep[], opts: { note?: string; perRow?: number } = {}): string {
  return flowFigure(title, steps, opts)
}

function noteLines(note: string, w: number, y: number, color = MUTED): { svg: string; h: number } {
  const lines = wrapLines(note, w)
  return {
    svg: lines.map((l, i) => `<text x="${w / 2}" y="${y + i * 15}" text-anchor="middle" font-size="11" fill="${color}">${esc(l)}</text>`).join(''),
    h: lines.length * 15,
  }
}

function badge(x: number, y: number, n: number): string {
  return `<circle cx="${x}" cy="${y}" r="9" fill="${WARN}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${n}</text>`
}

export interface ReconScreen {
  /** Программа и версия, как в уроке: «1С:Бухгалтерия предприятия 3.0», «Excel для Windows (Microsoft 365)». */
  app: string
  /** Заголовок окна/формы. */
  window: string
  /** Разделы/вкладки ленты сверху. */
  tabs?: string[]
  activeTab?: number
  /** Кнопки командной панели. */
  buttons?: string[]
  activeButton?: number
  /** Поля формы: подпись → значение. */
  fields?: Array<[string, string]>
  activeField?: number
  /** Вкладки табличной части документа («Товары», «Услуги») — между реквизитами и таблицей. */
  sheetTabs?: string[]
  activeSheetTab?: number
  /** Табличная часть / лист. */
  grid?: { headers: string[]; rows: string[][]; hi?: [number, number] }
  /** Строка формул Excel (если задана — рисуется над сеткой). */
  formulaBar?: string
  /** Пояснения к номерным меткам — по порядку: вкладка, кнопка, поле, ячейка. */
  callouts?: string[]
  /** Сообщение программы внизу окна (например, текст ошибки). */
  message?: string
}

/** Кликабельный элемент реконструкции — для задания «Найди на экране». */
export interface ReconBox {
  /** Стабильный адрес элемента: tab-0, btn-3, field-1, cell-0-2. */
  id: string
  kind: 'button' | 'field' | 'tab' | 'cell'
  /** Подпись, как её прочтёт скринридер и режим «Списком». */
  label: string
  /** Рамка в натуральных координатах листа (ширина 640). */
  x: number
  y: number
  w: number
  h: number
}

/** Реконструкция вместе с рамками её элементов. */
export interface ReconFrame {
  /** data:image/svg+xml — то же, что возвращает reconScreen. */
  src: string
  boxes: ReconBox[]
  /** Натуральный размер листа. */
  w: number
  h: number
}

/**
 * Окно программы — учебная реконструкция с номерными метками.
 * Метки ставятся на активную вкладку, кнопку, поле и ячейку — в этом порядке.
 */
export function reconScreen(s: ReconScreen): string {
  return reconScreenBoxes(s).src
}

/**
 * То же окно, но вместе с рамками вкладок, кнопок, полей и ячеек.
 *
 * ЗАЧЕМ. Задание «Найди на экране» проверяет, куда нажал ученик, а границы
 * элементов знает только генератор: снимать их с картинки на глаз — значит
 * получить зону, съехавшую на полкнопки. `bare` убирает примечание под окном —
 * в задании его заменяет плашка над картинкой.
 */
export function reconScreenBoxes(s: ReconScreen, opts: { bare?: boolean } = {}): ReconFrame {
  const boxes: ReconBox[] = []
  const parts: string[] = []
  let y = 44
  const x0 = 16, ww = W - 32
  let mark = 0
  // рамка окна
  const frameTop = y
  parts.push(`<rect x="${x0}" y="${y}" width="${ww}" height="26" rx="6" fill="${INK}"/>`)
  parts.push(`<text x="${x0 + 12}" y="${y + 17}" font-size="${fitFs(s.app + ' · ' + s.window, ww - 24, 12)}" fill="#fff">${esc(s.app + ' · ' + s.window)}</text>`)
  y += 30
  if (s.tabs?.length) {
    let x = x0 + 6
    const fs = 11.5
    s.tabs.forEach((t, i) => {
      const w = Math.min(textW(t, fs) + 18, 140)
      const active = i === s.activeTab
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="22" rx="5" fill="${active ? ACCENT_SOFT : TILE}" stroke="${active ? ACCENT : GRID}"/>`)
      parts.push(`<text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" font-size="${fitFs(t, w - 8, fs)}" fill="${active ? ACCENT : INK}" font-weight="${active ? 700 : 400}">${esc(t)}</text>`)
      if (active) parts.push(badge(x + w - 2, y + 1, ++mark))
      boxes.push({ id: `tab-${i}`, kind: 'tab', label: t, x, y, w, h: 22 })
      x += w + 6
    })
    y += 30
  }
  if (s.buttons?.length) {
    let x = x0 + 6
    const fs = 11.5
    s.buttons.forEach((b, i) => {
      const w = Math.min(textW(b, fs) + 20, 170)
      // Не влезла в строку — переносим, как командная панель узкого окна.
      if (x + w > x0 + ww - 6 && x > x0 + 6) { x = x0 + 6; y += 30 }
      const active = i === s.activeButton
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="24" rx="5" fill="${active ? ACCENT : '#fff'}" stroke="${active ? ACCENT : GRID}"/>`)
      parts.push(`<text x="${x + w / 2}" y="${y + 16}" text-anchor="middle" font-size="${fitFs(b, w - 8, fs)}" fill="${active ? '#fff' : INK}">${esc(b)}</text>`)
      if (active) parts.push(badge(x + w - 2, y + 1, ++mark))
      boxes.push({ id: `btn-${i}`, kind: 'button', label: b, x, y, w, h: 24 })
      x += w + 6
    })
    y += 34
  }
  if (s.fields?.length) {
    s.fields.forEach(([label, value], i) => {
      const active = i === s.activeField
      parts.push(`<text x="${x0 + 12}" y="${y + 15}" font-size="${fitFs(label, 170, 11.5)}" fill="${MUTED}">${esc(label)}</text>`)
      parts.push(`<rect x="${x0 + 190}" y="${y}" width="${ww - 206}" height="22" rx="4" fill="#fff" stroke="${active ? ACCENT : GRID}" stroke-width="${active ? 2 : 1}"/>`)
      parts.push(`<text x="${x0 + 198}" y="${y + 15}" font-size="${fitFs(value, ww - 224, 11.5)}" fill="${INK}">${esc(value)}</text>`)
      if (active) parts.push(badge(x0 + ww - 18, y + 1, ++mark))
      boxes.push({ id: `field-${i}`, kind: 'field', label, x: x0 + 190, y, w: ww - 206, h: 22 })
      y += 28
    })
    y += 4
  }
  if (s.sheetTabs?.length) {
    let x = x0 + 12
    const fs = 11.5
    s.sheetTabs.forEach((tb, i) => {
      const w = textW(tb, fs) + 16
      const active = i === (s.activeSheetTab ?? 0)
      if (active) parts.push(`<rect x="${x}" y="${y}" width="${w}" height="22" rx="5" fill="${TILE}" stroke="${GRID}"/>`)
      parts.push(`<text x="${x + w / 2}" y="${y + 15}" text-anchor="middle" font-size="${fs}" fill="${active ? INK : MUTED}" font-weight="${active ? 700 : 400}">${esc(tb)}</text>`)
      boxes.push({ id: `stab-${i}`, kind: 'tab', label: tb, x, y, w, h: 22 })
      x += w + 8
    })
    y += 30
  }
  if (s.formulaBar !== undefined) {
    parts.push(`<rect x="${x0 + 6}" y="${y}" width="${ww - 12}" height="22" rx="4" fill="#fff" stroke="${GRID}"/>`)
    parts.push(`<text x="${x0 + 14}" y="${y + 15}" font-size="11.5" font-style="italic" fill="${MUTED}">fx</text>`)
    parts.push(`<text x="${x0 + 36}" y="${y + 15}" font-size="${fitFs(s.formulaBar, ww - 56, 12)}" font-family="Menlo, Consolas, monospace" fill="${INK}">${esc(s.formulaBar)}</text>`)
    y += 28
  }
  if (s.grid) {
    const { headers, rows, hi } = s.grid
    const cols = headers.length
    // Ширина столбца — по самому длинному тексту в нём (как «автоподбор» в
    // Excel), затем всё ужимается пропорционально под ширину окна. Равные
    // столбцы обрезали «ООО Альфа, Договор 15» ровно там, где урок о нём.
    const need = headers.map((h, c) => Math.max(22, textW(h, 11), ...rows.map(r => textW(r[c] ?? '', 11))) + 12)
    const k = (ww - 12) / need.reduce((a, b) => a + b, 0)
    const cw = need.map(n => n * k)
    const cx = (c: number) => x0 + 6 + cw.slice(0, c).reduce((a, b) => a + b, 0)
    const rh = 22
    headers.forEach((h, c) => {
      parts.push(`<rect x="${cx(c)}" y="${y}" width="${cw[c]}" height="${rh}" fill="${TILE}" stroke="${GRID}"/>`)
      parts.push(`<text x="${cx(c) + cw[c] / 2}" y="${y + 15}" text-anchor="middle" font-size="${fitFs(h, cw[c] - 6, 11)}" font-weight="700" fill="${INK}">${esc(h)}</text>`)
    })
    y += rh
    rows.forEach((r, ri) => {
      r.forEach((v, c) => {
        const active = hi && hi[0] === ri && hi[1] === c
        parts.push(`<rect x="${cx(c)}" y="${y}" width="${cw[c]}" height="${rh}" fill="${active ? ACCENT_SOFT : '#fff'}" stroke="${active ? ACCENT : GRID}" stroke-width="${active ? 2 : 1}"/>`)
        parts.push(`<text x="${cx(c) + 4}" y="${y + 15}" font-size="${fitFs(v, cw[c] - 8, 11, 7)}" fill="${INK}">${esc(v)}</text>`)
        if (active) parts.push(badge(cx(c) + cw[c] - 4, y + 2, ++mark))
        // Лист Excel (первый заголовок пуст — там номера строк): подпись — адрес
        // ячейки «A5: P01», столбец номеров строк не кликабелен.
        const sheetLike = headers[0] === ''
        if (!(sheetLike && c === 0)) {
          const name = sheetLike ? `${headers[c]}${r[0]}` : headers[c] || `Столбец ${c + 1}`
          boxes.push({ id: `cell-${ri}-${c}`, kind: 'cell', label: v ? `${name}: ${v}` : `${name}: пусто`, x: cx(c), y, w: cw[c], h: rh })
        }
      })
      y += rh
    })
    y += 8
  }
  if (s.message) {
    const m = wrapLines(s.message, ww - 24, 11.5)
    const h = 14 + m.length * 15
    parts.push(`<rect x="${x0 + 6}" y="${y}" width="${ww - 12}" height="${h}" rx="5" fill="${WARN_SOFT}" stroke="${WARN}"/>`)
    m.forEach((l, i) => parts.push(`<text x="${x0 + 16}" y="${y + 18 + i * 15}" font-size="11.5" fill="${WARN}">${esc(l)}</text>`))
    y += h + 8
  }
  parts.unshift(`<rect x="${x0}" y="${frameTop}" width="${ww}" height="${y - frameTop}" rx="6" fill="#FBFBFD" stroke="${INK}" stroke-width="1.5"/>`)
  y += 10
  if (s.callouts?.length) {
    s.callouts.forEach((c, i) => {
      const lines = wrapLines(c, W - 60, 12)
      parts.push(badge(x0 + 10, y + 1, i + 1))
      lines.forEach((l, j) => parts.push(`<text x="${x0 + 26}" y="${y + 5 + j * 15}" font-size="12" fill="${INK}">${esc(l)}</text>`))
      y += lines.length * 15 + 6
    })
    y += 4
  }
  let note = ''
  if (!opts.bare) {
    const n = noteLines(RECON, W, y + 8, WARN)
    note = n.svg
    y += n.h + 14
  } else {
    y += 6
  }
  return { src: toDataUri(sheet(W, y, `Учебная реконструкция: ${s.window}`, parts.join('') + note)), boxes, w: W, h: y }
}

/** Проводки: Дт / Кт / сумма / содержание. Чтение строки: «Дт 60 Кт 51 — 12 000». */
export function postingFig(title: string, rows: Array<[string, string, string, string]>, opts: { note?: string } = {}): string {
  return formTable(title, ['Дебет', 'Кредит', 'Сумма', 'Содержание операции'], rows.map(r => [...r]), opts)
}

export interface DiagStage {
  /** Этап: «Запись», «Проведение», «Выгрузка в банк»… */
  stage: string
  /** Что проверить на этом этапе. */
  check: string
  /** Что делать, если проверка не прошла. */
  fix: string
}

/** Дерево диагностики по этапам: этап → проверка → если нет. */
export function diagFig(title: string, stages: DiagStage[], opts: { note?: string } = {}): string {
  const parts: string[] = []
  let y = 46
  const colA = 140, gap = 10
  const wB = (W - 32 - colA - gap * 2) / 2
  parts.push(`<text x="${16 + colA / 2}" y="${y}" text-anchor="middle" font-size="11" font-weight="700" fill="${MUTED}">ЭТАП</text>`)
  parts.push(`<text x="${16 + colA + gap + wB / 2}" y="${y}" text-anchor="middle" font-size="11" font-weight="700" fill="${MUTED}">ПРОВЕРИТЬ</text>`)
  parts.push(`<text x="${16 + colA + gap * 2 + wB * 1.5}" y="${y}" text-anchor="middle" font-size="11" font-weight="700" fill="${MUTED}">ЕСЛИ НЕ ТАК</text>`)
  y += 10
  stages.forEach((s, i) => {
    const lb = wrapLines(s.check, wB + 20, 11.5)
    const lc = wrapLines(s.fix, wB + 20, 11.5)
    const la = wrapLines(s.stage, colA + 20, 12)
    const h = Math.max(lb.length, lc.length, la.length) * 15 + 14
    parts.push(`<rect x="16" y="${y}" width="${colA}" height="${h}" rx="7" fill="${ACCENT_SOFT}" stroke="${ACCENT}"/>`)
    la.forEach((l, j) => parts.push(`<text x="${16 + colA / 2}" y="${y + 18 + j * 15}" text-anchor="middle" font-size="12" font-weight="700" fill="${ACCENT}">${esc(`${j === 0 ? `${i + 1}. ` : ''}${l}`)}</text>`))
    parts.push(`<rect x="${16 + colA + gap}" y="${y}" width="${wB}" height="${h}" rx="7" fill="${OK_SOFT}" stroke="${OK}"/>`)
    lb.forEach((l, j) => parts.push(`<text x="${16 + colA + gap + 8}" y="${y + 18 + j * 15}" font-size="11.5" fill="${INK}">${esc(l)}</text>`))
    parts.push(`<rect x="${16 + colA + gap * 2 + wB}" y="${y}" width="${wB}" height="${h}" rx="7" fill="${WARN_SOFT}" stroke="${WARN}"/>`)
    lc.forEach((l, j) => parts.push(`<text x="${16 + colA + gap * 2 + wB + 8}" y="${y + 18 + j * 15}" font-size="11.5" fill="${INK}">${esc(l)}</text>`))
    y += h + 8
    if (i < stages.length - 1) {
      parts.push(`<path d="M ${16 + colA / 2} ${y - 8} L ${16 + colA / 2} ${y}" stroke="${ACCENT}" stroke-width="2"/>`)
    }
  })
  if (opts.note) {
    const n = noteLines(opts.note, W, y + 12)
    parts.push(n.svg)
    y += n.h + 12
  }
  return toDataUri(sheet(W, y + 10, title, parts.join('')))
}

/** Лист Excel: буквы столбцов, номера строк, строка формул, выделенная ячейка. */
export interface ExcelSheetOpts { formula?: string; selected?: [number, number]; result?: Array<[number, number]>; note?: string; firstRow?: number }

export function excelSheet(title: string, rows: string[][], opts: ExcelSheetOpts = {}): string {
  return reconScreen(excelScreen(title, rows, opts))
}

/**
 * Лист Excel с рамками ячеек: id `cell-<строка>-<столбец>` в координатах
 * данных (без столбца номеров строк), подпись — адрес ячейки «B3».
 */
export function excelSheetBoxes(title: string, rows: string[][], opts: ExcelSheetOpts & { bare?: boolean } = {}): ReconFrame {
  const f = reconScreenBoxes(excelScreen(title, rows, opts), { bare: opts.bare })
  const first = opts.firstRow ?? 1
  return {
    ...f,
    boxes: f.boxes.flatMap(b => {
      const m = /^cell-(\d+)-(\d+)$/.exec(b.id)
      if (!m) return [b]
      const r = Number(m[1]), c = Number(m[2]) - 1
      if (c < 0) return []
      const v = rows[r]?.[c] ?? ''
      const addr = `${String.fromCharCode(65 + c)}${first + r}`
      return [{ ...b, id: `cell-${r}-${c}`, label: v ? `${addr}: ${v}` : addr }]
    }),
  }
}

/** Описание окна Excel для reconScreen — общее у excelSheet и excelSheetBoxes. */
export function excelScreen(title: string, rows: string[][], opts: ExcelSheetOpts = {}): ReconScreen {
  const cols = Math.max(...rows.map(r => r.length))
  const letters = Array.from({ length: cols }, (_, i) => String.fromCharCode(65 + i))
  const cell = opts.selected ? `${letters[opts.selected[1]]}${(opts.firstRow ?? 1) + opts.selected[0]}` : ''
  return {
    app: 'Excel',
    window: title,
    formulaBar: opts.formula !== undefined ? `${cell ? cell + '   ' : ''}${opts.formula}` : undefined,
    grid: {
      headers: ['', ...letters],
      rows: rows.map((r, i) => [String((opts.firstRow ?? 1) + i), ...letters.map((_, c) => r[c] ?? '')]),
      hi: opts.selected ? [opts.selected[0], opts.selected[1] + 1] : undefined,
    },
    callouts: opts.note ? [opts.note] : undefined,
  }
}

// ─── Формула по частям ───────────────────────────────────────────────────────
// Цветной разбор формулы: каждая часть своим цветом и номером, ниже — что
// означает каждая часть и шаги вычисления с промежуточными результатами (как
// «Вычислить формулу» в Excel). Статичная схема: работает в любом конспекте,
// пока интерактивный разбор не утверждён концептом.
const PART_COLORS = ['#2E6FD8', '#C2410C', '#127A4B', '#7C3AED', '#B42318', '#0E7490', '#A16207']

export interface FormulaPart {
  /** Кусок формулы ровно как в ячейке; куски подряд дают всю формулу. */
  text: string
  /** Подпись: что это за часть. Пусто — служебный кусок (скобки, «;»), рисуется серым. */
  label?: string
}

export function formulaFig(title: string, parts: FormulaPart[], steps: Array<[string, string]> = [], opts: { note?: string } = {}): string {
  const fs = 15, mono = "Menlo, Consolas, 'Courier New', monospace"
  const charW = fs * 0.62
  const maxW = W - 48
  const out: string[] = []
  let x = 24, y = 64
  let n = 0
  const labels: Array<{ n: number; color: string; label: string }> = []
  for (const part of parts) {
    const color = part.label ? PART_COLORS[n % PART_COLORS.length] : MUTED
    if (part.label) { n++; labels.push({ n, color, label: part.label }) }
    // Перенос по кускам: длинная формула идёт в несколько строк, а не за край.
    let rest = part.text
    while (rest.length) {
      const room = Math.max(1, Math.floor((24 + maxW - x) / charW))
      const chunk = rest.slice(0, room)
      out.push(`<text x="${x}" y="${y}" font-size="${fs}" font-family="${mono}" font-weight="${part.label ? 700 : 400}" fill="${color}">${esc(chunk)}</text>`)
      if (part.label && chunk === part.text.slice(0, chunk.length)) {
        out.push(`<line x1="${x}" y1="${y + 5}" x2="${x + chunk.length * charW}" y2="${y + 5}" stroke="${color}" stroke-width="2"/>`)
        out.push(`<circle cx="${x + 7}" cy="${y + 16}" r="8" fill="${color}"/><text x="${x + 7}" y="${y + 20}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${n}</text>`)
      }
      x += chunk.length * charW
      rest = rest.slice(chunk.length)
      if (rest.length) { x = 24; y += 40 }
    }
  }
  y += 40
  for (const l of labels) {
    const lines = wrapLines(l.label, W - 70, 12.5)
    out.push(`<circle cx="32" cy="${y - 4}" r="8" fill="${l.color}"/><text x="32" y="${y}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${l.n}</text>`)
    lines.forEach((ln, i) => out.push(`<text x="48" y="${y + i * 16}" font-size="12.5" fill="${INK}">${esc(ln)}</text>`))
    y += lines.length * 16 + 8
  }
  if (steps.length) {
    y += 6
    out.push(`<text x="24" y="${y}" font-size="11" font-weight="700" fill="${MUTED}">ВЫЧИСЛЕНИЕ ПО ШАГАМ</text>`)
    y += 10
    steps.forEach(([expr, res], i) => {
      const lines = wrapLines(expr, W - 220, 12)
      const h = lines.length * 15 + 12
      out.push(`<rect x="24" y="${y}" width="${W - 48}" height="${h}" rx="6" fill="${i === steps.length - 1 ? ACCENT_SOFT : TILE}"/>`)
      lines.forEach((ln, j) => out.push(`<text x="34" y="${y + 17 + j * 15}" font-size="12" font-family="${mono}" fill="${INK}">${esc(ln)}</text>`))
      out.push(`<text x="${W - 34}" y="${y + 17}" text-anchor="end" font-size="12.5" font-weight="700" fill="${i === steps.length - 1 ? ACCENT : INK}">→ ${esc(res)}</text>`)
      y += h + 6
    })
  }
  if (opts.note) {
    const lines = wrapLines(opts.note, W)
    lines.forEach((ln, i) => out.push(`<text x="${W / 2}" y="${y + 14 + i * 15}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(ln)}</text>`))
    y += lines.length * 15 + 8
  }
  return toDataUri(sheet(W, y + 16, title, out.join('')))
}
