// ─────────────────────────────────────────────────────────────────────────────
// Картинки для заданий готовых курсов
//
// Задания «описать картинку» и «сравнить картинки» без картинки бессмысленны, а
// чужих изображений с понятной лицензией у нас нет. Поэтому графики, схемы и
// планы рисуются здесь векторно и отдаются как data-URI: изображение целиком
// наше, ничего не грузится по сети, ничего не лежит в бакете.
//
// Обёртка листа, палитра и кодирование в data-URI лежат в svgSheet.ts — их
// делит с иллюстрациями конспекта (lessonFigures.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { toDataUri, esc, sheet, PAPER, INK, MUTED, GRID } from './svgSheet'

// ─── График динамики ─────────────────────────────────────────────────────────

export interface LineChartSpec {
  title: string
  /** Подпись оси Y, например «%» или «млн». */
  yUnit: string
  xLabels: string[]
  yMax: number
  yStep: number
  series: { name: string; color: string; values: number[] }[]
}

/** Линейный график — основной материал для IELTS Writing Task 1. */
export function lineChartImage(spec: LineChartSpec): string {
  const w = 660, h = 400
  const left = 62, right = w - 24, top = 52, bottom = h - 64
  const plotW = right - left, plotH = bottom - top
  const x = (i: number) => left + (plotW * i) / Math.max(1, spec.xLabels.length - 1)
  const y = (v: number) => bottom - (plotH * v) / spec.yMax

  const gridLines: string[] = []
  for (let v = 0; v <= spec.yMax; v += spec.yStep) {
    gridLines.push(
      `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"/>` +
      `<text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${MUTED}">${v}</text>`,
    )
  }

  const xTicks = spec.xLabels.map((label, i) =>
    `<text x="${x(i)}" y="${bottom + 20}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(label)}</text>`,
  )

  const lines = spec.series.map(s => {
    const pts = s.values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
    const dots = s.values.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="${s.color}"/>`).join('')
    return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>${dots}`
  })

  const legend = spec.series.map((s, i) =>
    `<rect x="${left + i * 190}" y="${h - 26}" width="14" height="3" fill="${s.color}"/>` +
    `<text x="${left + i * 190 + 22}" y="${h - 20}" font-size="12" fill="${INK}">${esc(s.name)}</text>`,
  )

  return toDataUri(sheet(w, h, spec.title, `
    <text x="${left - 46}" y="${top - 8}" font-size="11" fill="${MUTED}">${esc(spec.yUnit)}</text>
    ${gridLines.join('')}
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="1.5"/>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${INK}" stroke-width="1.5"/>
    ${xTicks.join('')}
    ${lines.join('')}
    ${legend.join('')}
  `))
}

// ─── Столбчатая диаграмма ────────────────────────────────────────────────────

export interface BarChartSpec {
  title: string
  yUnit: string
  /** Подписи групп по оси X. */
  groups: string[]
  yMax: number
  yStep: number
  /** Серии: по одному значению на группу. */
  series: { name: string; color: string; values: number[] }[]
}

/** Сгруппированные столбцы — сравнение категорий, второй частый тип Task 1. */
export function barChartImage(spec: BarChartSpec): string {
  const w = 660, h = 400
  const left = 62, right = w - 24, top = 52, bottom = h - 64
  const plotW = right - left, plotH = bottom - top
  const y = (v: number) => bottom - (plotH * v) / spec.yMax

  const slot = plotW / spec.groups.length
  const barW = Math.min(34, (slot - 18) / spec.series.length)

  const gridLines: string[] = []
  for (let v = 0; v <= spec.yMax; v += spec.yStep) {
    gridLines.push(
      `<line x1="${left}" y1="${y(v)}" x2="${right}" y2="${y(v)}" stroke="${GRID}" stroke-width="1"/>` +
      `<text x="${left - 10}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="${MUTED}">${v}</text>`,
    )
  }

  const bars: string[] = []
  spec.groups.forEach((g, gi) => {
    const centre = left + slot * gi + slot / 2
    const totalW = barW * spec.series.length + 4 * (spec.series.length - 1)
    spec.series.forEach((s, si) => {
      const v = s.values[gi] ?? 0
      const bx = centre - totalW / 2 + si * (barW + 4)
      bars.push(
        `<rect x="${bx.toFixed(1)}" y="${y(v).toFixed(1)}" width="${barW.toFixed(1)}" height="${(bottom - y(v)).toFixed(1)}" fill="${s.color}" rx="2"/>` +
        `<text x="${(bx + barW / 2).toFixed(1)}" y="${(y(v) - 6).toFixed(1)}" text-anchor="middle" font-size="10" fill="${MUTED}">${v}</text>`,
      )
    })
    bars.push(`<text x="${centre.toFixed(1)}" y="${bottom + 20}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(g)}</text>`)
  })

  const legend = spec.series.map((s, i) =>
    `<rect x="${left + i * 190}" y="${h - 30}" width="12" height="12" fill="${s.color}" rx="2"/>` +
    `<text x="${left + i * 190 + 20}" y="${h - 20}" font-size="12" fill="${INK}">${esc(s.name)}</text>`,
  )

  return toDataUri(sheet(w, h, spec.title, `
    <text x="${left - 46}" y="${top - 8}" font-size="11" fill="${MUTED}">${esc(spec.yUnit)}</text>
    ${gridLines.join('')}
    <line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="${INK}" stroke-width="1.5"/>
    <line x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}" stroke="${INK}" stroke-width="1.5"/>
    ${bars.join('')}
    ${legend.join('')}
  `))
}

// ─── Схема процесса ──────────────────────────────────────────────────────────

/** Цепочка этапов со стрелками — Task 1 «process diagram». */
export function processFlowImage(title: string, steps: string[]): string {
  const w = 680, perRow = 3
  const rows = Math.ceil(steps.length / perRow)
  const boxW = 180, boxH = 68, gapX = 30, gapY = 42
  const h = 56 + rows * boxH + (rows - 1) * gapY + 22
  const startX = (w - (perRow * boxW + (perRow - 1) * gapX)) / 2

  const parts: string[] = []
  steps.forEach((step, i) => {
    const row = Math.floor(i / perRow)
    const col = i % perRow
    // Змейка: чётные ряды слева направо, нечётные — справа налево.
    const visualCol = row % 2 === 0 ? col : perRow - 1 - col
    const bx = startX + visualCol * (boxW + gapX)
    const by = 56 + row * (boxH + gapY)

    // Текст в две строки — иначе длинный этап вылезает за рамку.
    const words = step.split(' ')
    const mid = Math.ceil(words.length / 2)
    const line1 = words.slice(0, mid).join(' ')
    const line2 = words.slice(mid).join(' ')

    parts.push(
      `<rect x="${bx}" y="${by}" width="${boxW}" height="${boxH}" rx="12" fill="#F2F4F9" stroke="${INK}" stroke-width="1.5"/>` +
      `<text x="${bx + boxW / 2}" y="${by + 27}" text-anchor="middle" font-size="12" font-weight="600" fill="${INK}">${esc(line1)}</text>` +
      `<text x="${bx + boxW / 2}" y="${by + 45}" text-anchor="middle" font-size="12" font-weight="600" fill="${INK}">${esc(line2)}</text>` +
      `<circle cx="${bx + 14}" cy="${by + 14}" r="10" fill="${INK}"/>` +
      `<text x="${bx + 14}" y="${by + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="${PAPER}">${i + 1}</text>`,
    )

    if (i < steps.length - 1) {
      const lastInRow = col === perRow - 1
      if (lastInRow) {
        // Переход на следующий ряд — стрелка вниз.
        parts.push(`<path d="M ${bx + boxW / 2} ${by + boxH} L ${bx + boxW / 2} ${by + boxH + gapY - 8}" stroke="${INK}" stroke-width="1.8" marker-end="url(#ah)"/>`)
      } else {
        const dir = row % 2 === 0 ? 1 : -1
        const fromX = dir === 1 ? bx + boxW : bx
        parts.push(`<path d="M ${fromX} ${by + boxH / 2} L ${fromX + dir * (gapX - 8)} ${by + boxH / 2}" stroke="${INK}" stroke-width="1.8" marker-end="url(#ah)"/>`)
      }
    }
  })

  const defs = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="${INK}"/></marker></defs>`

  return toDataUri(sheet(w, h, title, defs + parts.join('')))
}

// ─── План города: «было / стало» ─────────────────────────────────────────────

/** Половина пары для imageCompare: один и тот же участок в разные годы. */
export function townMapImage(variant: 'before' | 'after'): string {
  const w = 460, h = 340
  const road = `<rect x="0" y="150" width="${w}" height="28" fill="#E7EAF1"/>
    <line x1="0" y1="164" x2="${w}" y2="164" stroke="${PAPER}" stroke-width="2" stroke-dasharray="14 12"/>
    <text x="12" y="144" font-size="11" fill="${MUTED}">Main Road</text>`
  const river = `<path d="M 0 300 C 120 280, 200 320, 460 296" stroke="#9CC7E8" stroke-width="16" fill="none"/>
    <text x="12" y="326" font-size="11" fill="${MUTED}">River</text>`

  const body = variant === 'before'
    ? `${road}${river}
       <rect x="40" y="52" width="150" height="76" rx="6" fill="#DDEBD8" stroke="#7FA974" stroke-width="1.5"/>
       <text x="115" y="96" text-anchor="middle" font-size="12" fill="${INK}">Woodland</text>
       <rect x="230" y="60" width="90" height="60" rx="4" fill="#F2F4F9" stroke="${INK}" stroke-width="1.5"/>
       <text x="275" y="95" text-anchor="middle" font-size="11" fill="${INK}">School</text>
       <rect x="350" y="66" width="70" height="48" rx="4" fill="#F2F4F9" stroke="${INK}" stroke-width="1.5"/>
       <text x="385" y="94" text-anchor="middle" font-size="11" fill="${INK}">Shop</text>
       <rect x="60" y="200" width="220" height="70" rx="6" fill="#F7F3DC" stroke="#C7B36B" stroke-width="1.5"/>
       <text x="170" y="240" text-anchor="middle" font-size="12" fill="${INK}">Farmland</text>`
    : `${road}${river}
       <rect x="40" y="52" width="150" height="76" rx="6" fill="#F2F4F9" stroke="${INK}" stroke-width="1.5"/>
       <text x="115" y="88" text-anchor="middle" font-size="12" fill="${INK}">Housing</text>
       <text x="115" y="106" text-anchor="middle" font-size="12" fill="${INK}">estate</text>
       <rect x="230" y="60" width="90" height="60" rx="4" fill="#F2F4F9" stroke="${INK}" stroke-width="1.5"/>
       <text x="275" y="95" text-anchor="middle" font-size="11" fill="${INK}">School</text>
       <rect x="350" y="52" width="70" height="76" rx="4" fill="#F2F4F9" stroke="${INK}" stroke-width="1.5"/>
       <text x="385" y="86" text-anchor="middle" font-size="11" fill="${INK}">Shopping</text>
       <text x="385" y="102" text-anchor="middle" font-size="11" fill="${INK}">centre</text>
       <rect x="60" y="200" width="220" height="70" rx="6" fill="#E9E9EF" stroke="${INK}" stroke-width="1.5"/>
       <text x="170" y="232" text-anchor="middle" font-size="12" fill="${INK}">Car park</text>
       <text x="170" y="250" text-anchor="middle" font-size="12" fill="${INK}">and station</text>
       <path d="M 300 236 L 440 236" stroke="${INK}" stroke-width="3" stroke-dasharray="8 6"/>
       <text x="370" y="224" text-anchor="middle" font-size="11" fill="${MUTED}">new railway</text>`

  return toDataUri(sheet(w, h, variant === 'before' ? 'Ashford, 1995' : 'Ashford, 2025', body))
}

// ─── Комната: сцена для «что где находится» ──────────────────────────────────

/**
 * Простая сцена для начальных уровней: предметы узнаваемы по форме и подписаны
 * только на картинке-ответе у учителя, у ученика — без подписей, иначе задание
 * превращается в чтение.
 */
export function roomSceneImage(): string {
  const w = 520, h = 340
  const floor = 286
  const body = `
    <rect x="16" y="40" width="${w - 32}" height="${h - 60}" rx="10" fill="#FAFBFD" stroke="${INK}" stroke-width="1.5"/>
    <!-- линия пола: без неё «на столе» и «под столом» читаются неоднозначно -->
    <line x1="17" y1="${floor}" x2="${w - 17}" y2="${floor}" stroke="${GRID}" stroke-width="2"/>
    <!-- окно -->
    <rect x="48" y="70" width="104" height="76" rx="4" fill="#DCEBF7" stroke="${INK}" stroke-width="1.5"/>
    <line x1="100" y1="70" x2="100" y2="146" stroke="${INK}" stroke-width="1.2"/>
    <line x1="48" y1="108" x2="152" y2="108" stroke="${INK}" stroke-width="1.2"/>
    <!-- часы на стене -->
    <circle cx="452" cy="100" r="24" fill="${PAPER}" stroke="${INK}" stroke-width="1.5"/>
    <line x1="452" y1="100" x2="452" y2="86" stroke="${INK}" stroke-width="2"/>
    <line x1="452" y1="100" x2="463" y2="105" stroke="${INK}" stroke-width="2"/>
    <!-- стол: столешница и две ножки до пола -->
    <rect x="196" y="176" width="184" height="12" rx="3" fill="#C89B67" stroke="${INK}" stroke-width="1.3"/>
    <rect x="206" y="188" width="11" height="${floor - 188}" fill="#C89B67" stroke="${INK}" stroke-width="1.2"/>
    <rect x="359" y="188" width="11" height="${floor - 188}" fill="#C89B67" stroke="${INK}" stroke-width="1.2"/>
    <!-- книга на столе -->
    <rect x="222" y="158" width="50" height="18" rx="2" fill="#E4573A" stroke="${INK}" stroke-width="1.2"/>
    <!-- чашка на столе -->
    <circle cx="330" cy="166" r="10" fill="${PAPER}" stroke="${INK}" stroke-width="1.3"/>
    <path d="M 340 163 q 10 3 0 8" fill="none" stroke="${INK}" stroke-width="1.3"/>
    <!-- сумка на полу под столом -->
    <rect x="256" y="248" width="52" height="38" rx="5" fill="#6E7BA8" stroke="${INK}" stroke-width="1.2"/>
    <path d="M 268 248 q 14 -16 28 0" fill="none" stroke="${INK}" stroke-width="1.3"/>
    <!-- стул справа от стола, спинкой к стене -->
    <rect x="404" y="216" width="76" height="10" rx="2" fill="#9BA6B8" stroke="${INK}" stroke-width="1.2"/>
    <rect x="470" y="160" width="10" height="56" fill="#9BA6B8" stroke="${INK}" stroke-width="1.1"/>
    <rect x="408" y="226" width="8" height="${floor - 226}" fill="#9BA6B8" stroke="${INK}" stroke-width="1.1"/>
    <rect x="468" y="226" width="8" height="${floor - 226}" fill="#9BA6B8" stroke="${INK}" stroke-width="1.1"/>
    <!-- кошка на полу слева -->
    <ellipse cx="110" cy="266" rx="32" ry="19" fill="#D9C48A" stroke="${INK}" stroke-width="1.3"/>
    <circle cx="82" cy="252" r="14" fill="#D9C48A" stroke="${INK}" stroke-width="1.3"/>
    <path d="M 73 243 l 1 -11 l 9 7 z" fill="#D9C48A" stroke="${INK}" stroke-width="1.1"/>
    <path d="M 90 242 l 5 -10 l 5 9 z" fill="#D9C48A" stroke="${INK}" stroke-width="1.1"/>
    <circle cx="78" cy="251" r="1.6" fill="${INK}"/>
    <circle cx="88" cy="251" r="1.6" fill="${INK}"/>
    <path d="M 142 260 q 20 -8 14 -26" fill="none" stroke="${INK}" stroke-width="2"/>
  `
  return toDataUri(sheet(w, h, 'Комната', body))
}

// ─── План квартала: для «как пройти» ─────────────────────────────────────────

/** Сетка улиц с ориентирами — задание «объясните дорогу». */
export function streetMapImage(): string {
  const w = 480, h = 340
  const block = (x: number, y: number, bw: number, bh: number, label: string, fill = '#F2F4F9') =>
    `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="${fill}" stroke="${INK}" stroke-width="1.3"/>` +
    `<text x="${x + bw / 2}" y="${y + bh / 2 + 4}" text-anchor="middle" font-size="11" fill="${INK}">${esc(label)}</text>`

  const body = `
    <rect x="16" y="40" width="${w - 32}" height="${h - 56}" fill="#FAFBFD"/>
    <!-- улицы -->
    <rect x="16" y="150" width="${w - 32}" height="26" fill="#E7EAF1"/>
    <rect x="220" y="40" width="26" height="${h - 56}" fill="#E7EAF1"/>
    <text x="24" y="146" font-size="10" fill="${MUTED}">Rua das Flores</text>
    <text x="252" y="58" font-size="10" fill="${MUTED}">Av. Central</text>
    <!-- кварталы -->
    ${block(40, 64, 150, 74, 'Padaria')}
    ${block(276, 64, 160, 74, 'Farmácia')}
    ${block(40, 196, 150, 84, 'Escola')}
    ${block(276, 196, 160, 84, 'Praça', '#DDEBD8')}
    <!-- отправная точка -->
    <circle cx="110" cy="164" r="9" fill="#E4573A" stroke="${PAPER}" stroke-width="2"/>
    <text x="110" y="192" text-anchor="middle" font-size="11" font-weight="700" fill="#E4573A">você</text>
  `
  return toDataUri(sheet(w, h, 'Bairro', body))
}
