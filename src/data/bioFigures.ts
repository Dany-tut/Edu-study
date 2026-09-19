// ─────────────────────────────────────────────────────────────────────────────
// Иллюстрации конспекта предметных курсов (биология)
//
// Что рисует языковой конспект — таблицы письма и схемы форм — лежит в
// lessonFigures.ts. Биологии нужны другие фигуры: цепочка стадий процесса,
// замкнутый цикл, график зависимости, решётка Пеннета, пирамида уровней. Общая
// обёртка и примитивы те же (svgSheet.ts), поэтому лист выглядит одинаково во
// всех курсах — это и было условием: курс не должен выглядеть нарезкой из
// разных книг.
//
// ПОЧЕМУ ГЕНЕРАТОРЫ, А НЕ ЧУЖИЕ КАРТИНКИ
// Схемы из учебников (Alberts, Campbell) защищены авторским правом, а открытые
// (OpenStax, CC BY) сделаны в своём стиле, своим шрифтом и по-английски: сотня
// таких картинок в русском курсе читается как сборная солянка. Векторная схема
// весит 1–3 КБ, правится кодом и не требует ничьей лицензии.
//
// ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ
// Анатомических рисунков — нефрона, альвеолы, сердца в разрезе. Их нельзя
// получить генератором: каждый такой рисунок уникален и рисуется руками. Там,
// где без формы органа не обойтись, конспект обходится схемой из блоков —
// она объясняет устройство, не притворяясь анатомическим атласом.
// ─────────────────────────────────────────────────────────────────────────────

import {
  toDataUri, esc, sheet, textW, fitFs, noteH as noteHeight, noteAt as noteBlock,
  PAPER, INK, MUTED, GRID, TILE, ACCENT, ACCENT_SOFT,
} from './svgSheet'

/** Ширина колонки конспекта на мониторе — та же, что у языковых схем. */
const W = 640

const noteH = (note?: string, w = W) => noteHeight(note, w)
const noteAt = (w: number, h: number, note?: string) => noteBlock(w, h, note)

/** Стрелка-маркер. Объявляется внутри листа: каждый лист самодостаточен. */
const ARROW_DEFS = `<defs>
  <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${INK}"/>
  </marker>
  <marker id="arA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${ACCENT}"/>
  </marker>
</defs>`

/** Две строки подписи в блоке: название и пояснение под ним. */
function boxLabel(x: number, y: number, w: number, label: string, sub: string | undefined, accent: boolean): string {
  const parts = [
    `<text x="${x + w / 2}" y="${y + (sub ? 0 : 5)}" text-anchor="middle" font-size="${fitFs(label, w - 14, 13)}" font-weight="700" fill="${accent ? ACCENT : INK}">${esc(label)}</text>`,
  ]
  if (sub) parts.push(`<text x="${x + w / 2}" y="${y + 16}" text-anchor="middle" font-size="${fitFs(sub, w - 12, 10.5)}" fill="${MUTED}">${esc(sub)}</text>`)
  return parts.join('')
}

// ─── Цепочка стадий ──────────────────────────────────────────────────────────

/** Шаг процесса: название, пояснение и признак «ради этого схема». */
export interface FlowStep {
  label: string
  sub?: string
  key?: boolean
}

/**
 * Цепочка стадий со стрелками: гликолиз → цикл Кребса → дыхательная цепь,
 * ген → иРНК → белок, рецептор → нейрон → мышца.
 *
 * Процесс — это порядок, и порядок текстом читается хуже, чем видится. Больше
 * четырёх шагов в ряд не ставим: блок становится уже подписи. Длинные цепочки
 * переносятся на следующий ряд, и переход между рядами тоже помечен стрелкой —
 * иначе непонятно, читать ли второй ряд как продолжение или как альтернативу.
 */
export function flowFigure(
  title: string,
  steps: FlowStep[],
  opts: { note?: string; perRow?: number } = {},
): string {
  const perRow = Math.min(opts.perRow ?? 4, Math.max(1, steps.length))
  const rows: FlowStep[][] = []
  for (let i = 0; i < steps.length; i += perRow) rows.push(steps.slice(i, i + perRow))

  const pad = 24, gap = 34
  const boxW = (W - pad * 2 - gap * (perRow - 1)) / perRow
  const boxH = 58
  const rowGap = 30
  const y0 = 48
  const h = y0 + rows.length * boxH + (rows.length - 1) * rowGap + noteH(opts.note) + 6

  const parts: string[] = [ARROW_DEFS]
  rows.forEach((row, r) => {
    const y = y0 + r * (boxH + rowGap)
    row.forEach((step, i) => {
      const x = pad + i * (boxW + gap)
      parts.push(
        `<rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="12" fill="${step.key ? ACCENT_SOFT : TILE}" stroke="${step.key ? ACCENT : INK}" stroke-width="${step.key ? 1.6 : 1.2}"/>`,
        boxLabel(x, y + (step.sub ? boxH / 2 - 4 : boxH / 2 + 4), boxW, step.label, step.sub, !!step.key),
      )
      if (i < row.length - 1) {
        parts.push(`<line x1="${x + boxW + 6}" y1="${y + boxH / 2}" x2="${x + boxW + gap - 6}" y2="${y + boxH / 2}" stroke="${INK}" stroke-width="1.6" marker-end="url(#ar)"/>`)
      }
    })
    // Перенос на следующий ряд: вниз от последнего блока ряда и влево к первому.
    if (r < rows.length - 1) {
      const lastX = pad + (row.length - 1) * (boxW + gap) + boxW / 2
      const midY = y + boxH + rowGap / 2
      parts.push(
        `<path d="M ${lastX} ${y + boxH} V ${midY} H ${pad + boxW / 2} V ${y + boxH + rowGap}" fill="none" stroke="${INK}" stroke-width="1.6" marker-end="url(#ar)"/>`,
      )
    }
  })
  parts.push(noteAt(W, h, opts.note))
  return toDataUri(sheet(W, h, title, parts.join('')))
}

// ─── Замкнутый цикл ──────────────────────────────────────────────────────────

/**
 * Замкнутый круг стадий: клеточный цикл, круговорот углерода, петля обратной
 * связи, цикл Кальвина.
 *
 * Цикл принципиально отличается от цепочки тем, что у него нет конца, и
 * рисовать его строкой — значит обманывать: ученик запоминает последний шаг как
 * финал. Подписи стоят СНАРУЖИ круга, потому что внутри кольца на шесть-восемь
 * узлов места под текст нет.
 */
export function cycleFigure(
  title: string,
  steps: Array<{ label: string; sub?: string; key?: boolean }>,
  opts: { note?: string; centre?: string } = {},
): string {
  const n = steps.length
  const rx = 150, ry = 112
  const cx = W / 2, cy = 48 + ry + 26
  const h = cy + ry + 66 + noteH(opts.note)

  const at = (i: number) => {
    // Начинаем сверху и идём по часовой стрелке — так цикл и читают.
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a), a }
  }

  const parts: string[] = [ARROW_DEFS]
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${GRID}" stroke-width="1.4" stroke-dasharray="5 6"/>`)

  if (opts.centre) {
    for (const [i, line] of opts.centre.split('\n').entries()) {
      parts.push(`<text x="${cx}" y="${cy + 4 + i * 17}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${MUTED}">${esc(line)}</text>`)
    }
  }

  steps.forEach((step, i) => {
    const { x, y } = at(i)
    // Ширина считается и по названию, и по подписи: пока её брали только по
    // названию, «печень отдаёт гликоген» под коротким «Глюкагон» вылезало за
    // блок с обеих сторон.
    const boxW = Math.min(184, Math.max(86, Math.max(textW(step.label, 12.5), textW(step.sub ?? '', 10.5)) + 26))
    const boxH = step.sub ? 44 : 32
    parts.push(
      `<rect x="${x - boxW / 2}" y="${y - boxH / 2}" width="${boxW}" height="${boxH}" rx="10" fill="${step.key ? ACCENT_SOFT : PAPER}" stroke="${step.key ? ACCENT : INK}" stroke-width="${step.key ? 1.6 : 1.2}"/>`,
      boxLabel(x - boxW / 2, y + (step.sub ? -2 : 4), boxW, step.label, step.sub, !!step.key),
    )
    // Стрелка к следующему узлу — по дуге между блоками, не сквозь них.
    const from = at(i), to = at(i + 1 === n ? 0 : i + 1)
    const shrink = 0.26
    const ax1 = from.x + (to.x - from.x) * shrink, ay1 = from.y + (to.y - from.y) * shrink
    const ax2 = from.x + (to.x - from.x) * (1 - shrink), ay2 = from.y + (to.y - from.y) * (1 - shrink)
    parts.push(`<path d="M ${ax1.toFixed(1)} ${ay1.toFixed(1)} Q ${((ax1 + ax2) / 2 + (cx - (ax1 + ax2) / 2) * -0.16).toFixed(1)} ${((ay1 + ay2) / 2 + (cy - (ay1 + ay2) / 2) * -0.16).toFixed(1)} ${ax2.toFixed(1)} ${ay2.toFixed(1)}" fill="none" stroke="${INK}" stroke-width="1.5" marker-end="url(#ar)"/>`)
  })

  parts.push(noteAt(W, h, opts.note))
  return toDataUri(sheet(W, h, title, parts.join('')))
}

// ─── График зависимости ──────────────────────────────────────────────────────

/** Кривая на графике: точки в долях поля (0…1), слева направо. */
export interface Curve {
  points: Array<[number, number]>
  label?: string
  /** Кривая, ради которой график нарисован — рисуется акцентом и толще. */
  key?: boolean
  dashed?: boolean
}

/**
 * Гладкая кривая по точкам (Catmull-Rom → кубические Безье).
 *
 * Ломаная из отрезков читается как набор измерений, а нас интересует ФОРМА
 * зависимости: пик, плато, сигмоида. Углы на сгибах эту форму разрушают —
 * особенно у вершины пика, где излом выглядит как скачок, которого нет.
 */
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length < 3) return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const out = [`M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`]
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6
    out.push(`C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`)
  }
  return out.join(' ')
}

/**
 * График зависимости: активность фермента от температуры и pH, насыщение
 * субстратом, кривая диссоциации гемоглобина, рост популяции.
 *
 * Половина биологии школьного и первого университетского уровня — это ФОРМА
 * кривой: пик против плато, гипербола против сигмоиды, экспонента против
 * логистической. Словами форма не передаётся; именно её и спрашивают.
 *
 * Точки задаются в долях (0…1), а не в единицах: числа на осях здесь почти
 * всегда условны, а важна форма. Где числа нужны — они идут подписями делений.
 */
export function graphFigure(
  title: string,
  spec: {
    x: string
    y: string
    curves: Curve[]
    /** Подписи делений слева направо. */
    xTicks?: string[]
    /** Подписи делений СНИЗУ ВВЕРХ — как растёт сама ось. */
    yTicks?: string[]
    /** Пунктирная отметка на поле: оптимум, половина Vmax, ёмкость среды. */
    marks?: Array<{ at: [number, number]; label: string; axis?: 'x' | 'y' | 'both' }>
    note?: string
  },
): string {
  const padL = 62, padR = 26, padT = 50, padB = 54
  const plotW = W - padL - padR
  const plotH = 236
  const h = padT + plotH + padB + noteH(spec.note) + (spec.curves.some(c => c.label) ? 18 : 0)
  const px = (t: number) => padL + t * plotW
  const py = (t: number) => padT + plotH - t * plotH

  const parts: string[] = [ARROW_DEFS]
  parts.push(`<rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="${TILE}" rx="6"/>`)
  for (let i = 1; i < 4; i++) {
    parts.push(`<line x1="${padL}" y1="${py(i / 4)}" x2="${padL + plotW}" y2="${py(i / 4)}" stroke="${GRID}" stroke-width="1"/>`)
  }

  // Оси со стрелками: направление «больше» должно быть видно без подписи.
  parts.push(
    `<line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW + 10}" y2="${padT + plotH}" stroke="${INK}" stroke-width="1.6" marker-end="url(#ar)"/>`,
    `<line x1="${padL}" y1="${padT + plotH}" x2="${padL}" y2="${padT - 10}" stroke="${INK}" stroke-width="1.6" marker-end="url(#ar)"/>`,
    `<text x="${padL + plotW / 2}" y="${padT + plotH + 40}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${INK}">${esc(spec.x)}</text>`,
    `<text x="18" y="${padT + plotH / 2}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${INK}" transform="rotate(-90 18 ${padT + plotH / 2})">${esc(spec.y)}</text>`,
  )

  spec.xTicks?.forEach((t, i, all) => {
    const x = px(all.length === 1 ? 0.5 : i / (all.length - 1))
    parts.push(
      `<line x1="${x}" y1="${padT + plotH}" x2="${x}" y2="${padT + plotH + 5}" stroke="${INK}" stroke-width="1.2"/>`,
      `<text x="${x}" y="${padT + plotH + 20}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(t)}</text>`,
    )
  })
  spec.yTicks?.forEach((t, i, all) => {
    const y = py(all.length === 1 ? 0.5 : i / (all.length - 1))
    parts.push(`<text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${MUTED}">${esc(t)}</text>`)
  })

  spec.marks?.forEach(m => {
    const [mx, my] = m.at
    const axis = m.axis ?? 'both'
    if (axis === 'x' || axis === 'both') parts.push(`<line x1="${px(mx)}" y1="${py(my)}" x2="${px(mx)}" y2="${padT + plotH}" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="4 4"/>`)
    if (axis === 'y' || axis === 'both') parts.push(`<line x1="${padL}" y1="${py(my)}" x2="${px(mx)}" y2="${py(my)}" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="4 4"/>`)
    // Подпись держим внутри поля: у отметки на самом верху («оптимум») она
    // иначе уезжала в полосу заголовка, а у отметки справа — за край листа.
    const lw = textW(m.label, 11)
    const lx = Math.min(px(mx) + 8, padL + plotW - lw - 4)
    const ly = Math.max(py(my) - 8, padT + 13)
    parts.push(
      `<circle cx="${px(mx)}" cy="${py(my)}" r="3.6" fill="${ACCENT}"/>`,
      `<rect x="${lx - 3}" y="${ly - 11}" width="${lw + 6}" height="15" rx="4" fill="${PAPER}" opacity="0.88"/>`,
      `<text x="${lx}" y="${ly}" font-size="11" font-weight="700" fill="${ACCENT}">${esc(m.label)}</text>`,
    )
  })

  const labelled = spec.curves.filter(c => c.label).length
  spec.curves.forEach(c => {
    const d = smoothPath(c.points.map(([x, y]) => [px(x), py(y)] as [number, number]))
    parts.push(`<path d="${d}" fill="none" stroke="${c.key ? ACCENT : INK}" stroke-width="${c.key ? 2.6 : 1.8}" stroke-linejoin="round" stroke-linecap="round"${c.dashed ? ' stroke-dasharray="7 5"' : ''}/>`)
    // Одна подписанная кривая — подпись у её конца; несколько — легенда.
    //
    // ЗАЧЕМ. Две кривые, выходящие на общее плато, заканчиваются почти в одной
    // точке, и подписи у концов ложатся друг на друга — именно так и случилось
    // с кривыми гемоглобина в покое и в работающей мышце.
    if (c.label && labelled === 1) {
      const [lx, ly] = c.points[c.points.length - 1]
      parts.push(`<text x="${Math.min(px(lx), padL + plotW - 4)}" y="${Math.max(py(ly) - 7, padT + 12)}" text-anchor="end" font-size="11.5" font-weight="700" fill="${c.key ? ACCENT : MUTED}">${esc(c.label)}</text>`)
    }
  })

  if (labelled > 1) {
    // Легенда в правом нижнем углу поля: там у графиков биологии почти всегда
    // пусто (кривые идут снизу вверх), а верхние углы заняты плато и отметками.
    const rows = spec.curves.filter(c => c.label)
    const lw = Math.max(...rows.map(c => textW(c.label!, 11.5))) + 34
    const lh = rows.length * 18 + 10
    const lx = padL + plotW - lw - 10
    const ly = padT + plotH - lh - 10
    parts.push(`<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" rx="6" fill="${PAPER}" stroke="${GRID}" stroke-width="1"/>`)
    rows.forEach((c, i) => {
      const y = ly + 15 + i * 18
      parts.push(
        `<line x1="${lx + 8}" y1="${y - 4}" x2="${lx + 24}" y2="${y - 4}" stroke="${c.key ? ACCENT : INK}" stroke-width="${c.key ? 2.6 : 1.8}"${c.dashed ? ' stroke-dasharray="5 4"' : ''}/>`,
        `<text x="${lx + 29}" y="${y}" font-size="11.5" font-weight="${c.key ? 700 : 500}" fill="${c.key ? ACCENT : INK}">${esc(c.label!)}</text>`,
      )
    })
  }

  parts.push(noteAt(W, h, spec.note))
  return toDataUri(sheet(W, h, title, parts.join('')))
}

// ─── Решётка Пеннета ─────────────────────────────────────────────────────────

/**
 * Решётка Пеннета: гаметы по сторонам, сочетания в клетках.
 *
 * Расщепление 3 : 1 запоминается как факт, а понимается только через решётку —
 * видно, что три клетки из четырёх выглядят одинаково, но одна из них другая по
 * генотипу. Это то самое место, где генотип и фенотип расходятся, и картинка
 * объясняет его за секунду.
 */
/**
 * Генотип потомка из двух гамет.
 *
 * Склейка строк здесь неверна, и это не мелочь записи. Гаметы AB и Ab дают
 * AABb, а не «ABAb»: аллели соединяются ПО ГЕНАМ, и позиция буквы в гамете —
 * это номер гена. Доминантный аллель пишется первым, поэтому a + A — это Aa,
 * а не «aA». Первое время решётка печатала именно «ABAb» и «aA», то есть
 * неправильные ответы к собственному заданию.
 *
 * Условие: гаметы обоих родителей записаны в одном порядке генов и одной длины.
 */
function combineGametes(left: string, top: string): string {
  if (left.length !== top.length) return `${left}${top}`
  return [...left]
    .map((l, i) => {
      const t = top[i]
      // Заглавная буква — доминантный аллель, она идёт первой.
      return l === l.toUpperCase() ? `${l}${t}` : `${t}${l}`
    })
    .join('')
}

export function punnettFigure(
  title: string,
  spec: {
    /** Гаметы отца — колонки. */
    top: string[]
    /** Гаметы матери — строки. */
    left: string[]
    /**
     * cells[строка][колонка]. По умолчанию генотип собирается из гамет
     * ПО ГЕНАМ — см. combineGametes(): это единственная верная запись.
     */
    cells?: string[][]
    /** Клетки «строка,колонка», которые надо подсветить (рецессивные и т. п.). */
    highlight?: string[]
    topLabel?: string
    leftLabel?: string
    note?: string
  },
): string {
  const cols = spec.top.length, rows = spec.left.length
  const cell = Math.min(92, Math.floor((W - 150) / cols))
  const gx = (W - cell * cols) / 2 + 22
  const gy = 84
  const h = gy + cell * rows + 30 + noteH(spec.note)

  const parts: string[] = []
  if (spec.topLabel) parts.push(`<text x="${gx + (cell * cols) / 2}" y="${gy - 40}" text-anchor="middle" font-size="12" font-weight="700" fill="${MUTED}">${esc(spec.topLabel)}</text>`)
  if (spec.leftLabel) parts.push(`<text x="${gx - 34}" y="${gy + (cell * rows) / 2}" text-anchor="middle" font-size="12" font-weight="700" fill="${MUTED}" transform="rotate(-90 ${gx - 34} ${gy + (cell * rows) / 2})">${esc(spec.leftLabel)}</text>`)

  spec.top.forEach((g, c) => {
    parts.push(`<text x="${gx + c * cell + cell / 2}" y="${gy - 12}" text-anchor="middle" font-size="15" font-weight="700" fill="${ACCENT}">${esc(g)}</text>`)
  })
  spec.left.forEach((g, r) => {
    parts.push(`<text x="${gx - 14}" y="${gy + r * cell + cell / 2 + 5}" text-anchor="end" font-size="15" font-weight="700" fill="${ACCENT}">${esc(g)}</text>`)
  })

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const text = spec.cells?.[r]?.[c] ?? combineGametes(spec.left[r], spec.top[c])
      const on = spec.highlight?.includes(`${r},${c}`)
      parts.push(
        `<rect x="${gx + c * cell}" y="${gy + r * cell}" width="${cell}" height="${cell}" fill="${on ? ACCENT_SOFT : PAPER}" stroke="${INK}" stroke-width="1.3"/>`,
        `<text x="${gx + c * cell + cell / 2}" y="${gy + r * cell + cell / 2 + 6}" text-anchor="middle" font-size="${fitFs(text, cell - 12, 17)}" font-weight="700" fill="${on ? ACCENT : INK}">${esc(text)}</text>`,
      )
    }
  }
  parts.push(noteAt(W, h, spec.note))
  return toDataUri(sheet(W, h, title, parts.join('')))
}

// ─── Пирамида уровней ────────────────────────────────────────────────────────

/**
 * Пирамида: трофические уровни, поток энергии, численность.
 *
 * Ширина ступени пропорциональна величине, и в этом весь смысл: правило десяти
 * процентов из списка чисел не чувствуется, а из пирамиды, где верхняя ступень
 * в тысячу раз уже нижней, — сразу. Ступени задаются сверху вниз.
 */
export function pyramidFigure(
  title: string,
  levels: Array<{ label: string; sub?: string; share?: number }>,
  opts: { note?: string } = {},
): string {
  const n = levels.length
  const stepH = 52, gap = 5
  const y0 = 50
  const maxW = W - 90
  const h = y0 + n * (stepH + gap) + noteH(opts.note) + 6

  const parts: string[] = []
  levels.forEach((lv, i) => {
    // Доля по умолчанию — геометрическая: каждая следующая снизу вверх уже.
    const share = lv.share ?? (i + 1) / n
    const bw = Math.max(110, maxW * Math.max(0.12, Math.min(1, share)))
    const y = y0 + i * (stepH + gap)
    const x = (W - bw) / 2
    const accent = i === 0
    parts.push(
      `<path d="M ${x + 10} ${y} H ${x + bw - 10} L ${x + bw} ${y + stepH} H ${x} Z" fill="${accent ? ACCENT_SOFT : TILE}" stroke="${accent ? ACCENT : INK}" stroke-width="1.3"/>`,
      `<text x="${W / 2}" y="${y + (lv.sub ? 22 : 31)}" text-anchor="middle" font-size="${fitFs(lv.label, bw - 24, 13)}" font-weight="700" fill="${accent ? ACCENT : INK}">${esc(lv.label)}</text>`,
    )
    if (lv.sub) parts.push(`<text x="${W / 2}" y="${y + 39}" text-anchor="middle" font-size="${fitFs(lv.sub, bw - 20, 11)}" fill="${MUTED}">${esc(lv.sub)}</text>`)
  })
  parts.push(noteAt(W, h, opts.note))
  return toDataUri(sheet(W, h, title, parts.join('')))
}
