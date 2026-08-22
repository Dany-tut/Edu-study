// ─────────────────────────────────────────────────────────────────────────────
// Схемы рассказа о языке
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ lessonFigures.ts. Там генераторы для КОНСПЕКТА: таблица
// письма, таблица форм, ось времён — то, что ученик перерисовывает в тетрадь и
// к чему возвращается. Здесь картинки для рассказа: их смотрят один раз, и они
// объясняют не «как писать», а «почему так устроено». Замысел Сечжона нельзя
// показать таблицей — его показывают кругом инь-ян и тремя чертами, из которых
// собраны все гласные.
//
// ПОЧЕМУ ВЕКТОР, А НЕ КАРТИНКИ ИЗ ИНТЕРНЕТА. Ровно та же причина, что и у
// конспектов: чужая картинка — это чужая лицензия и битая ссылка через год.
// Схема весит два килобайта текстом, рисуется одинаково везде и правится
// правкой кода, а не перезаливкой файла.
//
// ЛИСТ СВЕТЛЫЙ ВСЕГДА. Картинка приходит в <img> статичной строкой и под тему
// не подстраивается; тёмное по тёмному было бы невидимым (см. svgSheet.ts).
// ─────────────────────────────────────────────────────────────────────────────

import { toDataUri, esc, sheet, PAPER, INK, MUTED, GRID, TILE, ACCENT, ACCENT_SOFT } from './svgSheet'

/** Ширина листа — как у конспектов: колонка чтения на мониторе. */
const W = 640

/** Светлые звуки (ян) и тёмные (инь) — цвета исходного противопоставления. */
const YANG = '#D9534F'
const YANG_SOFT = '#FBE7E6'
const YIN = '#4A7BD4'
const YIN_SOFT = '#E4ECFB'

/**
 * Инь и ян как исток гласных.
 *
 * Три первоэлемента — небо (точка), земля (черта), человек (вертикаль) — это не
 * мнемоника, придуманная для учебника, а то, что написано в «Хунмин чоным»
 * 1446 года. Показать это кругом дешевле, чем объяснить абзацем: видно сразу,
 * что светлые гласные тянутся к небу и вправо, тёмные — к земле и влево, а
 * человек стоит посередине и не относится ни к тем, ни к другим.
 */
export function yinYangFigure(): string {
  const w = W, h = 306
  const cx = 196, cy = 172, r = 108

  /**
   * ПОЛОВИНЫ ПРЯМЫЕ, А НЕ КЛАССИЧЕСКАЯ S.
   *
   * Настоящий знак инь-ян рисуется S-образной границей, и первая версия так и
   * была нарисована. На листе это читалось задом наперёд: из-за изгиба «голова»
   * светлой половины оказывается сверху СЛЕВА, и точка неба, поставленная в
   * своей половине, визуально попадала в тёмную. Картинка объясняет не знак
   * инь-ян, а откуда взялись гласные, — и здесь важнее, чтобы светлое было
   * справа-сверху целиком, без оговорок.
   */
  const half = (sweep: 0 | 1) => `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep} ${cx} ${cy + r} Z`

  /** Подпись сбоку: пунктирная выноска от знака к тексту. */
  const callout = (x1: number, y1: number, y2: number, lines: string[], color: string) => [
    `<line x1="${x1}" y1="${y1}" x2="366" y2="${y2}" stroke="${color}" stroke-width="1.2" stroke-dasharray="4 4"/>`,
    ...lines.map((s, i) =>
      `<text x="376" y="${y2 + 5 + i * 17}" font-size="${i === 0 ? 13 : 12}" font-weight="${i === 0 ? 700 : 400}" fill="${i === 0 ? color : MUTED}">${esc(s)}</text>`),
  ].join('')

  const body = [
    `<path d="${half(0)}" fill="${YIN_SOFT}"/>`,
    `<path d="${half(1)}" fill="${YANG_SOFT}"/>`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${GRID}" stroke-width="1.2"/>`,
    `<line x1="${cx}" y1="${cy - r}" x2="${cx}" y2="${cy + r}" stroke="${GRID}" stroke-width="1" stroke-dasharray="4 5"/>`,
    `<text x="${cx - r / 2}" y="${cy - r + 24}" text-anchor="middle" font-size="11" font-weight="700" fill="${YIN}">тёмное (инь)</text>`,
    `<text x="${cx + r / 2}" y="${cy - r + 24}" text-anchor="middle" font-size="11" font-weight="700" fill="${YANG}">светлое (ян)</text>`,

    // Небо — точка. Стоит в светлой половине: солнце над горизонтом.
    `<circle cx="${cx + 52}" cy="${cy - 46}" r="10" fill="${YANG}"/>`,
    callout(cx + 66, cy - 46, 92, ['Небо  ·', 'светлые гласные: ㅏ ㅗ'], YANG),

    // Человек — вертикаль. Стоит на границе: он ни светлый, ни тёмный.
    `<rect x="${cx - 4}" y="${cy - 28}" width="8" height="56" rx="2.5" fill="${INK}"/>`,
    callout(cx + 8, cy + 4, 156, ['Человек  ㅣ', 'ни светлый, ни тёмный'], INK),

    // Земля — горизонталь. В тёмной половине: плоскость под ногами.
    `<rect x="${cx - 84}" y="${cy + 46}" width="60" height="8" rx="2.5" fill="${YIN}"/>`,
    callout(cx - 22, cy + 50, 220, ['Земля  ─', 'тёмные гласные: ㅓ ㅜ'], YIN),
  ].join('')

  return toDataUri(sheet(w, h, 'Три черты, из которых собраны все гласные', body))
}

/**
 * Как из трёх черт получаются гласные.
 *
 * Самое полезное знание первого дня: гласных не двадцать одна штука наизусть, а
 * два правила. Точка НАД чертой или СПРАВА от вертикали — светлый звук; под
 * чертой или слева — тёмный. Вторая точка добавляет «й».
 */
export function vowelBirthFigure(): string {
  const rows: { parts: [string, string]; out: string; label: string; tone: 'yang' | 'yin' }[] = [
    { parts: ['·', '─'], out: 'ㅗ', label: 'точка НАД землёй — светлый «о»', tone: 'yang' },
    { parts: ['─', '·'], out: 'ㅜ', label: 'точка ПОД землёй — тёмный «у»', tone: 'yin' },
    { parts: ['ㅣ', '·'], out: 'ㅏ', label: 'точка СПРАВА от человека — светлый «а»', tone: 'yang' },
    { parts: ['·', 'ㅣ'], out: 'ㅓ', label: 'точка СЛЕВА от человека — тёмный «о»', tone: 'yin' },
  ]
  const rowH = 54
  const w = W, h = 60 + rows.length * rowH + 34

  const body = rows.map((r, i) => {
    const y = 60 + i * rowH
    const color = r.tone === 'yang' ? YANG : YIN
    const soft = r.tone === 'yang' ? YANG_SOFT : YIN_SOFT
    return [
      `<text x="52" y="${y + 30}" text-anchor="middle" font-size="24" fill="${MUTED}">${esc(r.parts[0])}</text>`,
      `<text x="86" y="${y + 29}" text-anchor="middle" font-size="17" fill="${GRID}">+</text>`,
      `<text x="120" y="${y + 30}" text-anchor="middle" font-size="24" fill="${MUTED}">${esc(r.parts[1])}</text>`,
      `<text x="156" y="${y + 29}" text-anchor="middle" font-size="17" fill="${GRID}">=</text>`,
      `<rect x="178" y="${y + 2}" width="44" height="40" rx="9" fill="${soft}" stroke="${color}" stroke-width="1.4"/>`,
      `<text x="200" y="${y + 31}" text-anchor="middle" font-size="24" font-weight="600" fill="${color}">${esc(r.out)}</text>`,
      `<text x="242" y="${y + 28}" font-size="12.5" fill="${INK}">${esc(r.label)}</text>`,
    ].join('')
  }).join('')

  const note = `<text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-size="11.5" fill="${MUTED}">${esc('Вторая точка добавляет «й»: ㅏ → ㅑ, ㅗ → ㅛ. Отдельно их учить не нужно.')}</text>`

  return toDataUri(sheet(w, h, 'Гласные не заучивают — их собирают', body + note))
}

/**
 * Согласные рисуют то, что делает рот.
 *
 * Ровно то место, где хангыль перестаёт быть набором закорючек. Человек,
 * которому это показали, дальше УЗНАЁТ буквы, а не вспоминает их.
 */
export function articulationFigure(): string {
  const items = [
    { sym: 'ㄱ', what: 'корень языка', how: 'поднят к нёбу сзади' },
    { sym: 'ㄴ', what: 'кончик языка', how: 'упёрся за верхние зубы' },
    { sym: 'ㅁ', what: 'губы', how: 'сомкнуты в квадрат' },
    { sym: 'ㅅ', what: 'зубы', how: 'воздух идёт в щель' },
    { sym: 'ㅇ', what: 'горло', how: 'открыто — круг пустой' },
  ]
  const cw = 118, gap = 8
  const w = Math.max(W, items.length * (cw + gap) - gap + 40)
  const h = 210
  const x0 = (w - (items.length * (cw + gap) - gap)) / 2

  const body = items.map((it, i) => {
    const x = x0 + i * (cw + gap)
    return [
      `<rect x="${x}" y="56" width="${cw}" height="118" rx="12" fill="${TILE}" stroke="${GRID}" stroke-width="1"/>`,
      `<text x="${x + cw / 2}" y="112" text-anchor="middle" font-size="44" font-weight="600" fill="${INK}">${esc(it.sym)}</text>`,
      `<text x="${x + cw / 2}" y="139" text-anchor="middle" font-size="12" font-weight="700" fill="${ACCENT}">${esc(it.what)}</text>`,
      `<text x="${x + cw / 2}" y="157" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(it.how)}</text>`,
    ].join('')
  }).join('')

  const note = `<text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-size="11.5" fill="${MUTED}">${esc('Пять основных согласных — пять положений во рту. Остальные получаются из них.')}</text>`

  return toDataUri(sheet(w, h, 'Буква показывает, что делает рот', body + note))
}

/**
 * Придыхание и удвоение как добавленная черта.
 *
 * Система, а не список: одна черта — выдох, удвоение — напряжение. Три
 * колонки одного ряда выглядят похоже именно потому, что звучат похоже.
 */
export function tenseLadderFigure(): string {
  const rows = [
    { base: 'ㄱ', asp: 'ㅋ', tense: 'ㄲ', sound: 'к / кх / кк' },
    { base: 'ㄷ', asp: 'ㅌ', tense: 'ㄸ', sound: 'т / тх / тт' },
    { base: 'ㅂ', asp: 'ㅍ', tense: 'ㅃ', sound: 'п / пх / пп' },
    { base: 'ㅈ', asp: 'ㅊ', tense: 'ㅉ', sound: 'ч / чх / чч' },
  ]
  const rowH = 50
  const w = W, h = 92 + rows.length * rowH + 34
  const colX = [116, 250, 384]

  const head = ['простая', '+ черта = выдох', 'удвоение = напор']
    .map((s, i) => `<text x="${colX[i]}" y="60" text-anchor="middle" font-size="11.5" font-weight="700" fill="${MUTED}">${esc(s)}</text>`)
    .join('')

  const body = rows.map((r, i) => {
    const y = 76 + i * rowH
    const cell = (x: number, sym: string, accent: boolean) => [
      `<rect x="${x - 24}" y="${y}" width="48" height="40" rx="9" fill="${accent ? ACCENT_SOFT : TILE}" stroke="${accent ? ACCENT : GRID}" stroke-width="1.2"/>`,
      `<text x="${x}" y="${y + 29}" text-anchor="middle" font-size="24" font-weight="600" fill="${accent ? ACCENT : INK}">${esc(sym)}</text>`,
    ].join('')
    return [
      cell(colX[0], r.base, false),
      `<text x="${(colX[0] + colX[1]) / 2}" y="${y + 26}" text-anchor="middle" font-size="15" fill="${GRID}">→</text>`,
      cell(colX[1], r.asp, true),
      `<text x="${(colX[1] + colX[2]) / 2}" y="${y + 26}" text-anchor="middle" font-size="15" fill="${GRID}">→</text>`,
      cell(colX[2], r.tense, false),
      `<text x="440" y="${y + 26}" font-size="12" fill="${MUTED}">${esc(r.sound)}</text>`,
    ].join('')
  }).join('')

  const note = `<text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-size="11.5" fill="${MUTED}">${esc('Проверка выдоха: листок у губ качается на ㅋ и стоит на ㄱ. Для корейца это разные слова.')}</text>`

  return toDataUri(sheet(w, h, 'Похожие звуки выглядят похоже', head + body + note))
}

// ─── Японский ────────────────────────────────────────────────────────────────

/**
 * Одно предложение, раскрашенное по письменностям.
 *
 * Главный шок первого дня: японский текст написан не одной системой, а тремя
 * сразу, и они делят работу. Объяснить это словами можно, но человек всё равно
 * будет видеть «кашу из значков», пока не увидит разметку цветом на живой
 * фразе.
 */
export function scriptMixFigure(): string {
  const KANJI = '#C8102E'
  const HIRA = '#2F6DB5'
  const KATA = '#1F7A5C'

  const parts: { text: string; kind: 'kanji' | 'hira' | 'kata' }[] = [
    { text: '私', kind: 'kanji' },
    { text: 'は', kind: 'hira' },
    { text: 'コーヒー', kind: 'kata' },
    { text: 'を', kind: 'hira' },
    { text: '飲', kind: 'kanji' },
    { text: 'みます', kind: 'hira' },
  ]
  const color = { kanji: KANJI, hira: HIRA, kata: KATA }

  const fs = 30
  // Ширину считаем по знакам: японские рисуются квадратными, ширина ≈ кегль.
  const widths = parts.map(p => [...p.text].length * fs)
  const total = widths.reduce((a, b) => a + b, 0)
  const w = W
  let x = (w - total) / 2

  const glyphs = parts.map((p, i) => {
    const at = x
    x += widths[i]
    return [
      `<text x="${at}" y="112" font-size="${fs}" font-weight="600" fill="${color[p.kind]}">${esc(p.text)}</text>`,
      `<line x1="${at + 2}" y1="124" x2="${at + widths[i] - 2}" y2="124" stroke="${color[p.kind]}" stroke-width="3" stroke-linecap="round"/>`,
    ].join('')
  }).join('')

  const legend = [
    { c: KANJI, name: 'кандзи', what: 'корни слов — смысл' },
    { c: HIRA, name: 'хирагана', what: 'окончания и частицы — грамматика' },
    { c: KATA, name: 'катакана', what: 'заимствования и звукоподражания' },
  ].map((l, i) => {
    const y = 162 + i * 26
    return [
      `<rect x="86" y="${y - 9}" width="14" height="14" rx="4" fill="${l.c}"/>`,
      `<text x="110" y="${y + 3}" font-size="13" font-weight="700" fill="${INK}">${esc(l.name)}</text>`,
      `<text x="204" y="${y + 3}" font-size="12.5" fill="${MUTED}">${esc(l.what)}</text>`,
    ].join('')
  }).join('')

  const gloss = `<text x="${w / 2}" y="${248}" text-anchor="middle" font-size="12.5" fill="${MUTED}">${esc('«Я пью кофе» — watashi wa kōhī o nomimasu')}</text>`

  return toDataUri(sheet(w, 268, 'Три письменности в одном предложении', glyphs + legend + gloss))
}

/**
 * Откуда взялась кана.
 *
 * И хирагана, и катакана — это скорописные и урезанные иероглифы. Пока этого не
 * знаешь, кана выглядит набором произвольных закорючек, которые надо зубрить;
 * узнав, видишь в ней иероглиф и запоминаешь вдвое быстрее.
 */
export function kanaOriginFigure(): string {
  const rows = [
    { from: '安', hira: 'あ', kata: '阿', katakana: 'ア', read: 'a' },
    { from: '加', hira: 'か', kata: '加', katakana: 'カ', read: 'ka' },
    { from: '毛', hira: 'も', kata: '毛', katakana: 'モ', read: 'mo' },
  ]
  const rowH = 62
  const w = W, h = 96 + rows.length * rowH + 34

  const head = [
    ['иероглиф', 150], ['скоропись → хирагана', 300], ['часть знака → катакана', 470],
  ].map(([label, x]) => `<text x="${x}" y="62" text-anchor="middle" font-size="11.5" font-weight="700" fill="${MUTED}">${esc(String(label))}</text>`).join('')

  const body = rows.map((r, i) => {
    const y = 78 + i * rowH
    const cell = (x: number, sym: string, accent: boolean) => [
      `<rect x="${x - 26}" y="${y}" width="52" height="48" rx="10" fill="${accent ? ACCENT_SOFT : TILE}" stroke="${accent ? ACCENT : GRID}" stroke-width="1.2"/>`,
      `<text x="${x}" y="${y + 34}" text-anchor="middle" font-size="27" font-weight="600" fill="${accent ? ACCENT : INK}">${esc(sym)}</text>`,
    ].join('')
    const arrow = (x: number) => `<text x="${x}" y="${y + 30}" text-anchor="middle" font-size="15" fill="${GRID}">→</text>`
    return [
      cell(150, r.from, false),
      arrow(225),
      cell(300, r.hira, true),
      arrow(385),
      cell(470, r.katakana, true),
      `<text x="536" y="${y + 30}" font-size="13" fill="${MUTED}">${esc(r.read)}</text>`,
    ].join('')
  }).join('')

  const note = `<text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-size="11.5" fill="${MUTED}">${esc('Хирагана — иероглиф, написанный скорописью целиком. Катакана — кусок иероглифа, взятый для скорости.')}</text>`

  return toDataUri(sheet(w, h, 'Кана — это бывшие иероглифы', head + body + note))
}

// ─── Португальский ───────────────────────────────────────────────────────────

/**
 * Назальные гласные — то, чем португальский отличается от испанского на слух.
 *
 * Русскому уху назальный звук не даётся не потому, что он трудный, а потому,
 * что его не с чем сопоставить: в русском такого нет вовсе. Показать разницу
 * парами — самый короткий путь: pá и pão различаются ТОЛЬКО носом.
 */
export function nasalVowelsFigure(): string {
  const pairs = [
    { oral: 'pá', nasal: 'pão', ru: 'лопата — хлеб' },
    { oral: 'mau', nasal: 'mão', ru: 'плохой — рука' },
    { oral: 'vi', nasal: 'vim', ru: 'я увидел — я пришёл' },
    { oral: 'lá', nasal: 'lã', ru: 'там — шерсть' },
  ]
  const rowH = 46
  const w = W, h = 128 + pairs.length * rowH + 34

  // Схема «куда идёт воздух» стоит СЛЕВА от таблицы и без собственных подписей:
  // сплошная линия и пунктир повторяют цвета заголовков колонок, а вторая пара
  // слов «рот / нос» рядом с ними налезала на эти же заголовки.
  const head = [
    `<circle cx="52" cy="128" r="5" fill="${INK}"/>`,
    `<path d="M 57 128 L 108 122" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
    `<path d="M 57 125 Q 84 96 108 100" stroke="${ACCENT}" stroke-width="1.8" fill="none" stroke-dasharray="4 3" stroke-linecap="round"/>`,
    `<text x="176" y="76" text-anchor="middle" font-size="11.5" font-weight="700" fill="${MUTED}">через рот</text>`,
    `<text x="330" y="76" text-anchor="middle" font-size="11.5" font-weight="700" fill="${ACCENT}">через нос</text>`,
  ].join('')

  const body = pairs.map((p, i) => {
    const y = 128 + i * rowH
    return [
      `<text x="176" y="${y}" text-anchor="middle" font-size="19" font-weight="650" fill="${INK}">${esc(p.oral)}</text>`,
      `<text x="253" y="${y}" text-anchor="middle" font-size="14" fill="${GRID}">≠</text>`,
      `<rect x="286" y="${y - 24}" width="88" height="34" rx="9" fill="${ACCENT_SOFT}"/>`,
      `<text x="330" y="${y}" text-anchor="middle" font-size="19" font-weight="650" fill="${ACCENT}">${esc(p.nasal)}</text>`,
      `<text x="398" y="${y - 3}" font-size="12.5" fill="${MUTED}">${esc(p.ru)}</text>`,
    ].join('')
  }).join('')

  const note = `<text x="${w / 2}" y="${h - 14}" text-anchor="middle" font-size="11.5" fill="${MUTED}">${esc('Тильда (ã, õ) и конечные -m, -n не читаются как звук — они говорят «пустите воздух в нос».')}</text>`

  return toDataUri(sheet(w, h, 'Назальность: главный звук португальского', head + body + note))
}
