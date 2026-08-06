// ─────────────────────────────────────────────────────────────────────────────
// Предметные картинки для словарных карточек
//
// Карточка «слово → перевод» заставляет вспоминать через русский: ученик видит
// 우유, вспоминает «молоко» и только потом — предмет. Картинка убирает
// посредника: молоко вспоминается от молока.
//
// КЛЮЧ — РУССКОЕ ЗНАЧЕНИЕ, А НЕ СЛОВО ЯЗЫКА
// Один рисунок обслуживает все восемь курсов: 우유, ぎゅうにゅう, leite и milk —
// это одно молоко. Поэтому карта ведётся по VocabItem.ru, а сопоставление идёт
// по нормализованному значению («кот, кошка» → «кот»).
//
// ЧТО РИСУЕТСЯ, А ЧТО НЕТ
// Только то, что опознаётся силуэтом: предметы, еда, животные, места,
// транспорт, части тела. Абстрактное («причина», «следовательно», «влияние»)
// не рисуется вовсе — плохая картинка хуже её отсутствия. В словарях курсов
// таких абстрактных слов большинство, поэтому картинка есть примерно у каждой
// пятнадцатой карточки, и это нормально: они нужны начальным юнитам.
//
// СТИЛЬ
// Квадрат 120×120, белый лист, тёмная обводка, крупные однозначные формы — их
// видно на телефоне в размере 148 px. Цвет только там, где он опознавательный
// (море синее, дерево зелёное).
// ─────────────────────────────────────────────────────────────────────────────

import { toDataUri, INK, FONT } from './svgSheet'

const S = 120

/**
 * Лист карточки: белый квадрат со скруглением, внутри — рисунок.
 *
 * `defs` — градиенты и текстуры конкретного рисунка. Идентификаторы внутри
 * SVG локальны, поэтому у каждой картинки они могут называться одинаково и не
 * сталкиваются, даже когда на странице десяток карточек.
 */
function icon(body: string, defs = ''): string {
  return toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" font-family="${FONT}">
    <defs>${defs}</defs>
    <rect width="${S}" height="${S}" rx="16" fill="#FFFFFF"/>
    <g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g>
  </svg>`)
}

// ─── Объём, свет и фактура ───────────────────────────────────────────────────
//
// Плоская заливка читается, но предмет из неё получается «наклейкой»: молоко,
// вода и сок отличались только цветом прямоугольника. Объём даёт узнавание
// быстрее подписи, поэтому у каждой фигуры есть теневая грань, блик и — там,
// где это признак предмета, — фактура: волокна дерева, шерсть, крошка хлеба.

/** Осветлить или затемнить цвет: −0.2 — тень, +0.2 — свет. */
function tone(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => {
    const next = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount
    return Math.max(0, Math.min(255, Math.round(next)))
  })
  return `#${ch.map(v => v.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Вертикальный градиент от светлого к тёмному — базовая заливка предмета.
 *
 * Свет всегда сверху слева: одинаковое направление у всех рисунков собирает
 * набор в один стиль, а разнобой сразу читается как небрежность.
 */
function volume(id: string, base: string): string {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="${tone(base, 0.28)}"/>
    <stop offset="0.55" stop-color="${base}"/>
    <stop offset="1" stop-color="${tone(base, -0.22)}"/>
  </linearGradient>`
}

/** Мягкая тень под предметом — «ставит» его на плоскость. */
const drop = (cx: number, cy: number, rx: number, ry = 6) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(31,36,48,0.16)" stroke="none"/>`

/** Блик: светлое пятно там, куда падает свет. */
const gloss = (shape: string, opacity = 0.55) =>
  `<g fill="rgba(255,255,255,${opacity})" stroke="none">${shape}</g>`

/** Теневая грань — та же форма, но приглушённая; кладётся поверх заливки. */
const shade = (shape: string, opacity = 0.18) =>
  `<g fill="rgba(31,36,48,${opacity})" stroke="none">${shape}</g>`

/** Фактура штрихами: волокна дерева, ворс, ткань. */
function hatch(id: string, color: string, gap = 6, angle = 45): string {
  return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
    <line x1="0" y1="0" x2="0" y2="${gap}" stroke="${color}" stroke-width="1.4"/>
  </pattern>`
}

/** Фактура крапинами: крошка, песок, шерсть. */
function speckle(id: string, color: string, gap = 8): string {
  return `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse">
    <circle cx="${gap / 2}" cy="${gap / 2}" r="1.1" fill="${color}"/>
  </pattern>`
}

// Палитра опознавательных цветов — там, где цвет и есть подсказка.
const WATER = '#8FC7EA'
const LEAF = '#7FB069'
const WOOD = '#C89B67'
const RED = '#E4573A'
const YELLOW = '#F2C14E'
const MEAT = '#D98C7A'
const GREY = '#B8BFCC'
const SKIN = '#EBC9A8'

/** Заливка + обводка одной фигурой. */
const f = (fill: string, shape: string) => `<g fill="${fill}">${shape}</g>`

// ─── Еда и напитки ───────────────────────────────────────────────────────────

const milk = icon(`
  ${drop(60, 98, 26, 5)}
  ${f('url(#mk)', '<path d="M42 44 h36 v46 a6 6 0 0 1 -6 6 h-24 a6 6 0 0 1 -6 -6 z"/>')}
  ${f('url(#mk)', '<path d="M42 44 l10 -18 h16 l10 18 z"/>')}
  ${shade('<path d="M70 44 h8 v46 a6 6 0 0 1 -6 6 h-6 a6 6 0 0 0 4 -6 z"/>', 0.1)}
  ${gloss('<rect x="47" y="52" width="7" height="34" rx="3.5"/>', 0.75)}
  <path d="M42 44 l10 -18 h16 l10 18"/>
  <path d="M42 62 h36"/>
  ${f(WATER, '<path d="M47 68 h26 v10 h-26 z"/>')}
  <path d="M47 68 h26 M47 78 h26"/>`, volume('mk', '#F4F6FA'))

const water = icon(`
  ${drop(60, 100, 22, 5)}
  ${f('url(#wt)', '<path d="M60 22 C 40 50, 32 60, 32 72 a28 28 0 0 0 56 0 c0 -12 -8 -22 -28 -50 z"/>')}
  ${gloss('<path d="M46 66 a14 14 0 0 1 8 -14 a5 5 0 0 1 3 8 a9 9 0 0 0 -5 8 a4 4 0 0 1 -6 -2 z"/>', 0.8)}
  ${shade('<path d="M74 58 c6 8 8 12 8 18 a22 22 0 0 1 -30 20 a28 28 0 0 0 22 -38 z"/>', 0.12)}
  <path d="M60 22 C 40 50, 32 60, 32 72 a28 28 0 0 0 56 0 c0 -12 -8 -22 -28 -50 z"/>`,
  volume('wt', WATER))

const coffee = icon(`
  ${drop(60, 96, 34, 5)}
  ${f('url(#cf)', '<path d="M32 44 h48 v26 a24 24 0 0 1 -48 0 z"/>')}
  ${f('#6B4423', '<path d="M35 47 h42 v6 a21 6 0 0 1 -42 0 z"/>')}
  ${gloss('<rect x="38" y="56" width="6" height="20" rx="3"/>', 0.8)}
  ${shade('<path d="M70 47 h10 v23 a24 24 0 0 1 -16 22 a24 24 0 0 0 6 -22 z"/>', 0.12)}
  <path d="M32 44 h48 v26 a24 24 0 0 1 -48 0 z"/>
  <path d="M80 50 h8 a10 10 0 0 1 0 20 h-8"/>
  <path d="M46 26 q6 8 0 14 M60 24 q6 8 0 14 M74 26 q6 8 0 14"/>
  <path d="M28 96 h64"/>`, volume('cf', '#F4F6FA'))

const tea = icon(`
  ${drop(60, 98, 32, 4)}
  ${f('url(#te)', '<path d="M34 46 h44 v22 a22 22 0 0 1 -44 0 z"/>')}
  ${f('#B4763A', '<path d="M37 49 h38 v5 a19 5 0 0 1 -38 0 z"/>')}
  ${gloss('<rect x="40" y="58" width="6" height="16" rx="3"/>', 0.8)}
  ${shade('<path d="M68 49 h10 v19 a22 22 0 0 1 -14 21 a22 22 0 0 0 4 -21 z"/>', 0.1)}
  <path d="M34 46 h44 v22 a22 22 0 0 1 -44 0 z"/>
  <path d="M78 52 h8 a9 9 0 0 1 0 18 h-8"/>
  ${f('#8A6A4B', '<rect x="52" y="22" width="16" height="14" rx="2"/>')}
  <rect x="52" y="22" width="16" height="14" rx="2" stroke-width="2.2"/>
  <path d="M60 36 v10" stroke-width="2"/>
  <path d="M28 98 h64"/>`, volume('te', '#F4F6FA'))

const bread = icon(`
  ${drop(60, 92, 34, 6)}
  ${f('url(#br)', '<path d="M28 56 q4 -20 32 -20 t32 20 v22 a8 8 0 0 1 -8 8 h-48 a8 8 0 0 1 -8 -8 z"/>')}
  ${f('url(#brs)', '<path d="M28 56 q4 -20 32 -20 t32 20 v22 a8 8 0 0 1 -8 8 h-48 a8 8 0 0 1 -8 -8 z"/>')}
  ${shade('<path d="M78 40 q14 6 14 16 v22 a8 8 0 0 1 -8 8 h-12 a8 8 0 0 0 6 -8 z"/>', 0.14)}
  ${gloss('<path d="M40 44 q10 -8 20 -8 q-12 4 -16 12 z"/>', 0.5)}
  <path d="M28 56 q4 -20 32 -20 t32 20 v22 a8 8 0 0 1 -8 8 h-48 a8 8 0 0 1 -8 -8 z"/>
  <path d="M44 40 q6 12 0 22 M60 36 q6 14 0 26 M76 40 q6 12 0 22"/>`,
  volume('br', WOOD) + speckle('brs', 'rgba(120,80,40,0.28)', 9))

const rice = icon(`
  ${f('#FFFFFF', '<path d="M30 58 h60 a30 30 0 0 1 -60 0 z"/>')}
  ${f('#FFFFFF', '<path d="M40 58 q20 -22 40 0"/>')}
  <path d="M26 58 h68"/>
  <path d="M74 24 l14 -6 M78 32 l14 -6"/>`)

const meat = icon(`
  ${f(MEAT, '<path d="M46 26 a30 30 0 0 1 30 30 v18 a22 22 0 0 1 -44 0 v-18 a30 30 0 0 1 14 -30 z"/>')}
  <path d="M40 74 l-16 16"/>
  ${f('#FFFFFF', '<circle cx="21" cy="83" r="9"/><circle cx="31" cy="93" r="9"/>')}`)

const fish = icon(`
  ${f('url(#fs)', '<path d="M70 60 l22 -16 v32 z"/>')}
  ${f('url(#fs)', '<path d="M22 60 q22 -26 48 0 q-26 26 -48 0 z"/>')}
  ${f('url(#fsc)', '<path d="M22 60 q22 -26 48 0 q-26 26 -48 0 z"/>')}
  ${shade('<path d="M46 74 q18 6 24 -14 q-4 18 -24 14 z"/>', 0.16)}
  ${gloss('<path d="M34 52 q14 -10 28 -2 q-16 -2 -28 2 z"/>', 0.55)}
  <path d="M22 60 q22 -26 48 0 q-26 26 -48 0 z"/>
  <path d="M70 60 l22 -16 v32 z"/>
  <path d="M58 46 q8 14 0 28"/>
  ${f('#FFFFFF', '<circle cx="38" cy="54" r="5"/>')}
  <circle cx="38.5" cy="54.5" r="2.6" fill="${INK}"/>`,
  volume('fs', WATER) + speckle('fsc', 'rgba(40,90,130,0.22)', 7))

const apple = icon(`
  ${drop(60, 96, 26, 5)}
  ${f('url(#ap)', '<path d="M60 40 c-16 -12 -34 2 -30 22 c3 16 14 30 22 30 c4 0 6 -2 8 -2 s4 2 8 2 c8 0 19 -14 22 -30 c4 -20 -14 -34 -30 -22 z"/>')}
  ${shade('<path d="M72 40 c14 -2 22 10 18 22 c-3 16 -14 30 -22 30 c-3 0 -5 -1 -6 -1 c10 -6 18 -18 20 -31 c2 -10 -3 -17 -10 -20 z"/>', 0.16)}
  ${gloss('<ellipse cx="46" cy="54" rx="8" ry="11" transform="rotate(-25 46 54)"/>', 0.65)}
  <path d="M60 40 c-16 -12 -34 2 -30 22 c3 16 14 30 22 30 c4 0 6 -2 8 -2 s4 2 8 2 c8 0 19 -14 22 -30 c4 -20 -14 -34 -30 -22 z"/>
  <path d="M60 40 v-12" />
  ${f('url(#lf)', '<path d="M60 30 q14 -12 20 0 q-14 10 -20 0 z"/>')}
  <path d="M60 30 q14 -12 20 0 q-14 10 -20 0 z M64 30 q8 -3 12 -2"/>`,
  volume('ap', RED) + volume('lf', LEAF))

const juice = icon(`
  ${drop(60, 102, 22, 4)}
  ${f('url(#jc)', '<path d="M40 40 h40 l-6 52 a8 8 0 0 1 -8 6 h-12 a8 8 0 0 1 -8 -6 z"/>')}
  ${gloss('<path d="M46 46 h7 l-4 44 h-5 z"/>', 0.5)}
  ${shade('<path d="M70 40 h10 l-6 52 a8 8 0 0 1 -8 6 h-6 a8 8 0 0 0 8 -6 z"/>', 0.12)}
  <path d="M40 40 h40 l-6 52 a8 8 0 0 1 -8 6 h-12 a8 8 0 0 1 -8 -6 z"/>
  ${f(RED, '<path d="M54 40 v-16 h24 v6 h-18 v10 z"/>')}
  <path d="M54 40 v-16 h24" stroke-width="2.6"/>
  <path d="M42 56 h36" stroke-width="2" stroke="rgba(160,90,10,0.35)"/>`,
  volume('jc', '#F5A623'))

const beer = icon(`
  ${f('#F2C14E', '<path d="M34 42 h38 v50 a6 6 0 0 1 -6 6 h-26 a6 6 0 0 1 -6 -6 z"/>')}
  ${f('#FFFFFF', '<path d="M34 42 q8 -12 20 -6 q12 -8 18 6 z"/>')}
  <path d="M72 52 h12 a8 8 0 0 1 0 20 h-12"/>`)

const iceCream = icon(`
  ${drop(60, 102, 14, 3)}
  ${f('url(#icC)', '<path d="M38 46 h44 l-22 52 z"/>')}
  <path d="M44 54 l26 10 M42 66 l22 8 M50 78 l14 6" stroke="rgba(120,80,40,0.4)" stroke-width="2"/>
  <path d="M38 46 h44 l-22 52 z"/>
  ${f('url(#ic)', '<path d="M60 18 a24 24 0 0 1 24 26 h-48 a24 24 0 0 1 24 -26 z"/>')}
  ${gloss('<path d="M48 34 a18 18 0 0 1 12 -10 a20 20 0 0 0 -8 12 z"/>', 0.6)}
  ${f('#F2C14E', '<circle cx="46" cy="38" r="3"/><circle cx="72" cy="36" r="3"/><circle cx="60" cy="30" r="3"/>')}
  <path d="M60 18 a24 24 0 0 1 24 26 h-48 a24 24 0 0 1 24 -26 z"/>`,
  volume('ic', '#F6C2D2') + volume('icC', WOOD))

// ─── Животные ────────────────────────────────────────────────────────────────

const cat = icon(`
  ${drop(60, 96, 25, 5)}
  ${f('url(#ctE)', '<path d="M38 46 l-6 -26 l24 12 z M82 46 l6 -26 l-24 12 z"/>')}
  ${f('#E7A9A0', '<path d="M42 42 l-3 -13 l12 6 z M78 42 l3 -13 l-12 6 z"/>')}
  <path d="M38 46 l-6 -26 l24 12 z M82 46 l6 -26 l-24 12 z" stroke-width="2.6"/>
  ${f('url(#ct)', '<circle cx="60" cy="64" r="27"/>')}
  ${shade('<path d="M82 50 a27 27 0 0 1 -34 42 a27 27 0 0 0 34 -42 z"/>', 0.13)}
  ${f(tone('#D9C48A', 0.42), '<ellipse cx="60" cy="73" rx="18" ry="13"/>')}
  ${gloss('<ellipse cx="47" cy="52" rx="9" ry="6" transform="rotate(-20 47 52)"/>', 0.45)}
  <circle cx="60" cy="64" r="27"/>
  <path d="M45 44 q5 9 3 15 M75 44 q-5 9 -3 15" stroke="rgba(140,110,60,0.45)" stroke-width="2.4"/>
  ${f(LEAF, '<ellipse cx="50" cy="60" rx="6" ry="7"/><ellipse cx="70" cy="60" rx="6" ry="7"/>')}
  <ellipse cx="50" cy="61" rx="2.2" ry="5.4" fill="${INK}" stroke="none"/>
  <ellipse cx="70" cy="61" rx="2.2" ry="5.4" fill="${INK}" stroke="none"/>
  ${gloss('<circle cx="47.6" cy="56.4" r="1.8"/><circle cx="67.6" cy="56.4" r="1.8"/>', 0.95)}
  <path d="M60 68 l-5 5 h10 z" fill="#E7A9A0" stroke="none"/>
  <path d="M60 68 l-5 5 h10 z" stroke-width="2.4"/>
  <path d="M60 73 v4 M52 79 q8 6 16 0" stroke-width="2.6"/>
  <path d="M26 62 h14 M26 70 h14 M80 62 h14 M80 70 h14" stroke-width="2.2"/>`,
  volume('ct', '#D9C48A') + volume('ctE', '#CBB482'))

const dog = icon(`
  ${drop(60, 94, 24, 5)}
  ${f('url(#dgE)', '<path d="M33 48 q-11 8 -6 28 q11 4 15 -13 z M87 48 q11 8 6 28 q-11 4 -15 -13 z"/>')}
  <path d="M33 48 q-11 8 -6 28 q11 4 15 -13 z M87 48 q11 8 6 28 q-11 4 -15 -13 z"/>
  ${f('url(#dg)', '<circle cx="60" cy="62" r="25"/>')}
  ${shade('<path d="M78 46 a25 25 0 0 1 -30 40 a25 25 0 0 0 30 -40 z"/>', 0.13)}
  ${f(tone('#C98B54', 0.42), '<ellipse cx="60" cy="72" rx="17" ry="13"/>')}
  ${gloss('<ellipse cx="48" cy="50" rx="9" ry="6" transform="rotate(-20 48 50)"/>', 0.45)}
  <circle cx="60" cy="62" r="25"/>
  <ellipse cx="60" cy="72" rx="17" ry="13" stroke="rgba(120,80,40,0.45)" stroke-width="2"/>
  ${f('#FFFFFF', '<circle cx="51" cy="57" r="5.4"/><circle cx="69" cy="57" r="5.4"/>')}
  <circle cx="51.5" cy="58" r="3.2" fill="${INK}"/>
  <circle cx="69.5" cy="58" r="3.2" fill="${INK}"/>
  ${gloss('<circle cx="49.4" cy="55" r="1.6"/><circle cx="67.4" cy="55" r="1.6"/>', 0.95)}
  <circle cx="51" cy="57" r="5.4"/><circle cx="69" cy="57" r="5.4"/>
  ${f(INK, '<ellipse cx="60" cy="70" rx="7" ry="5"/>')}
  ${gloss('<ellipse cx="57.4" cy="68.4" rx="2.4" ry="1.5"/>', 0.5)}
  <path d="M60 75 v5 M52 82 q8 6 16 0"/>`,
  volume('dg', '#C98B54') + volume('dgE', '#9A6B3E'))

const bird = icon(`
  ${f(WATER, '<path d="M34 66 a22 20 0 0 1 40 -10 l14 -6 l-6 14 a22 20 0 0 1 -48 2 z"/>')}
  <circle cx="72" cy="52" r="2.6" fill="${INK}"/>
  ${f(YELLOW, '<path d="M84 56 l12 4 l-12 4 z"/>')}
  <path d="M44 82 v10 M62 84 v8"/>`)

const mouse = icon(`
  ${f(GREY, '<ellipse cx="56" cy="68" rx="26" ry="18"/>')}
  ${f(GREY, '<circle cx="36" cy="52" r="12"/><circle cx="72" cy="50" r="10"/>')}
  <circle cx="32" cy="66" r="2.6" fill="${INK}"/>
  <path d="M82 74 q16 4 10 18"/>`)

const horse = icon(`
  ${f('#A9713E', '<path d="M30 92 v-26 q0 -18 18 -22 l14 -4 l6 -16 l10 4 l-4 14 q14 6 14 22 v32"/>')}
  <path d="M46 92 v-18 M74 92 v-18"/>`)

// ─── Дом и предметы ──────────────────────────────────────────────────────────

const house = icon(`
  ${drop(60, 100, 40, 5)}
  ${f('url(#hs)', '<path d="M24 60 l36 -30 l36 30 v34 a4 4 0 0 1 -4 4 h-64 a4 4 0 0 1 -4 -4 z"/>')}
  ${shade('<path d="M78 46 l18 14 v34 a4 4 0 0 1 -4 4 h-14 z"/>', 0.1)}
  ${f('url(#hsR)', '<path d="M18 62 l42 -34 l42 34 z"/>')}
  ${f('url(#hsT)', '<path d="M18 62 l42 -34 l42 34 z"/>')}
  ${shade('<path d="M60 28 l42 34 h-42 z"/>', 0.12)}
  <path d="M18 62 l42 -34 l42 34 z"/>
  <path d="M24 60 l36 -30 l36 30 v34 a4 4 0 0 1 -4 4 h-64 a4 4 0 0 1 -4 -4 z"/>
  ${f('url(#hsW)', '<rect x="50" y="68" width="20" height="30" rx="2"/>')}
  <rect x="50" y="68" width="20" height="30" rx="2"/>
  ${f(YELLOW, '<circle cx="65" cy="84" r="2.4"/>')}
  ${f('url(#hsW)', '<rect x="30" y="68" width="14" height="14" rx="2"/><rect x="76" y="68" width="14" height="14" rx="2"/>')}
  <rect x="30" y="68" width="14" height="14" rx="2"/><rect x="76" y="68" width="14" height="14" rx="2"/>
  <path d="M37 68 v14 M30 75 h14 M83 68 v14 M76 75 h14" stroke-width="1.6"/>`,
  volume('hs', '#F2F4F9') + volume('hsR', RED) + volume('hsW', WATER) + hatch('hsT', 'rgba(120,40,25,0.22)', 7, 0))

const table = icon(`
  ${drop(60, 98, 40, 4)}
  ${f('url(#tb)', '<rect x="16" y="42" width="88" height="12" rx="3"/>')}
  ${f('url(#tbL)', '<rect x="26" y="54" width="9" height="42" rx="2"/><rect x="85" y="54" width="9" height="42" rx="2"/>')}
  ${gloss('<rect x="22" y="44" width="30" height="4" rx="2"/>', 0.4)}
  <rect x="16" y="42" width="88" height="12" rx="3"/>
  <rect x="26" y="54" width="9" height="42" rx="2"/><rect x="85" y="54" width="9" height="42" rx="2"/>`,
  volume('tb', WOOD) + volume('tbL', tone(WOOD, -0.1)))

const chair = icon(`
  ${drop(62, 100, 30, 4)}
  ${f('url(#chr)', '<rect x="34" y="16" width="12" height="56" rx="3"/>')}
  ${f('url(#chr)', '<rect x="34" y="62" width="52" height="11" rx="3"/>')}
  ${f('url(#chrL)', '<rect x="38" y="73" width="8" height="24" rx="2"/><rect x="76" y="73" width="8" height="24" rx="2"/>')}
  ${gloss('<rect x="38" y="64" width="20" height="4" rx="2"/>', 0.35)}
  <rect x="34" y="16" width="12" height="56" rx="3"/>
  <rect x="34" y="62" width="52" height="11" rx="3"/>
  <rect x="38" y="73" width="8" height="24" rx="2"/><rect x="76" y="73" width="8" height="24" rx="2"/>
  ${f('url(#chr)', '<rect x="34" y="26" width="30" height="8" rx="3"/>')}
  <rect x="34" y="26" width="30" height="8" rx="3" stroke-width="2"/>`,
  volume('chr', WOOD) + volume('chrL', tone(WOOD, -0.1)))

const bag = icon(`
  ${drop(60, 102, 34, 4)}
  <path d="M44 50 a16 16 0 0 1 32 0" stroke-width="4"/>
  ${f('url(#bg)', '<path d="M30 48 h60 l6 46 a6 6 0 0 1 -6 6 h-60 a6 6 0 0 1 -6 -6 z"/>')}
  ${shade('<path d="M74 48 h16 l6 46 a6 6 0 0 1 -6 6 h-16 a6 6 0 0 0 6 -6 z"/>', 0.12)}
  ${gloss('<rect x="38" y="56" width="8" height="30" rx="4"/>', 0.35)}
  <path d="M30 48 h60 l6 46 a6 6 0 0 1 -6 6 h-60 a6 6 0 0 1 -6 -6 z"/>
  ${f(YELLOW, '<rect x="52" y="66" width="16" height="12" rx="3"/>')}
  <rect x="52" y="66" width="16" height="12" rx="3" stroke-width="2"/>`,
  volume('bg', '#6E7BA8'))

const book = icon(`
  ${drop(60, 98, 36, 5)}
  ${f('url(#bk)', '<path d="M22 32 q20 -8 38 0 v58 q-18 -8 -38 0 z"/>')}
  ${f('url(#bk)', '<path d="M98 32 q-20 -8 -38 0 v58 q18 -8 38 0 z"/>')}
  ${shade('<path d="M60 32 q18 -7 34 -1 v58 q-16 -6 -34 1 z"/>', 0.08)}
  <path d="M30 46 h22 M30 56 h22 M30 66 h18 M68 46 h22 M68 56 h22 M68 66 h18" stroke-width="1.8" stroke="rgba(60,72,96,0.45)"/>
  <path d="M22 32 q20 -8 38 0 v58 q-18 -8 -38 0 z"/><path d="M98 32 q-20 -8 -38 0 v58 q18 -8 38 0 z"/>
  <path d="M60 32 v58"/>`, volume('bk', '#F7F8FC'))

const newspaper = icon(`
  ${drop(60, 96, 38, 4)}
  ${f('url(#np)', '<rect x="26" y="24" width="70" height="64" rx="4"/>')}
  ${f('url(#np)', '<rect x="18" y="30" width="70" height="64" rx="4"/>')}
  ${shade('<rect x="80" y="30" width="8" height="64" rx="4"/>', 0.06)}
  ${f('#D7DBE3', '<rect x="26" y="38" width="54" height="10" rx="2"/>')}
  <rect x="26" y="38" width="54" height="10" rx="2" stroke-width="1.6"/>
  <path d="M26 56 h24 M26 64 h24 M26 72 h24 M26 80 h24" stroke="rgba(60,72,96,0.45)" stroke-width="1.8"/>
  ${f(WATER, '<rect x="56" y="56" width="24" height="18" rx="2"/>')}
  <rect x="56" y="56" width="24" height="18" rx="2" stroke-width="1.8"/>
  <path d="M56 80 h24" stroke="rgba(60,72,96,0.45)" stroke-width="1.8"/>
  <rect x="18" y="30" width="70" height="64" rx="4"/>`, volume('np', '#F7F8FC'))

const letter = icon(`
  ${drop(60, 94, 38, 4)}
  ${f('url(#lt)', '<rect x="18" y="34" width="84" height="56" rx="6"/>')}
  ${shade('<path d="M18 40 l42 32 l42 -32 v50 a6 6 0 0 1 -6 6 h-72 a6 6 0 0 1 -6 -6 z"/>', 0.07)}
  ${f('url(#ltF)', '<path d="M18 40 l42 32 l42 -32 v-6 h-84 z"/>')}
  ${gloss('<path d="M22 38 l20 16 l-6 4 l-16 -14 z"/>', 0.4)}
  <rect x="18" y="34" width="84" height="56" rx="6"/>
  <path d="M18 40 l42 32 l42 -32"/>
  ${f(RED, '<circle cx="88" cy="46" r="7"/>')}
  <circle cx="88" cy="46" r="7" stroke-width="2"/>`,
  volume('lt', '#FFFFFF') + volume('ltF', '#EAF0F8'))

const clock = icon(`
  ${drop(60, 98, 26, 4)}
  ${f('url(#clB)', '<circle cx="60" cy="60" r="38"/>')}
  ${f('url(#cl)', '<circle cx="60" cy="60" r="32"/>')}
  ${gloss('<path d="M38 44 a32 32 0 0 1 30 -12 a40 40 0 0 0 -30 20 z"/>', 0.6)}
  <circle cx="60" cy="60" r="38"/>
  <circle cx="60" cy="60" r="32" stroke-width="2"/>
  <path d="M60 32 v5 M88 60 h-5 M60 88 v-5 M32 60 h5" stroke-width="2.4"/>
  <path d="M60 38 v22 l16 10"/>
  ${f(INK, '<circle cx="60" cy="60" r="3"/>')}`,
  volume('cl', '#FFFFFF') + volume('clB', '#D7DBE3'))

const window_ = icon(`
  ${f(WOOD, '<rect x="20" y="18" width="80" height="84" rx="5"/>')}
  ${f('url(#wn)', '<rect x="28" y="26" width="64" height="68" rx="3"/>')}
  ${gloss('<path d="M32 30 h16 l-16 30 z M56 30 h12 l-36 56 v-16 z"/>', 0.45)}
  ${f('#FFFFFF', '<path d="M30 84 a16 10 0 0 1 26 -6 a12 8 0 0 1 10 10 h-30 a10 8 0 0 1 -6 -4 z"/>')}
  <rect x="28" y="26" width="64" height="68" rx="3"/>
  <path d="M60 26 v68 M28 60 h64" stroke-width="3.4"/>
  <rect x="20" y="18" width="80" height="84" rx="5"/>`, volume('wn', '#9CCBE8'))

const key = icon(`
  ${drop(60, 104, 26, 4)}
  ${f('url(#ky)', '<circle cx="40" cy="44" r="23"/>')}
  ${f('#FFFFFF', '<circle cx="40" cy="44" r="9"/>')}
  ${f('url(#ky)', '<path d="M53 58 l40 40 h-15 v-11 h-11 v-11 h-10 z"/>')}
  ${gloss('<path d="M28 34 a16 16 0 0 1 14 -8 a20 20 0 0 0 -10 12 z"/>', 0.6)}
  ${shade('<path d="M56 44 a16 16 0 0 1 -12 22 a23 23 0 0 0 12 -22 z"/>', 0.14)}
  <circle cx="40" cy="44" r="23"/>
  <circle cx="40" cy="44" r="9"/>
  <path d="M53 58 l40 40 h-15 v-11 h-11 v-11 h-10 z"/>`, volume('ky', YELLOW))

const phone = icon(`
  ${drop(60, 106, 22, 4)}
  ${f('url(#ph)', '<rect x="38" y="16" width="44" height="88" rx="10"/>')}
  ${f('url(#phS)', '<rect x="44" y="30" width="32" height="58" rx="3"/>')}
  ${gloss('<path d="M46 32 h9 l-7 54 h-4 z"/>', 0.45)}
  <rect x="44" y="30" width="32" height="58" rx="3" stroke-width="2"/>
  <rect x="38" y="16" width="44" height="88" rx="10"/>
  <path d="M53 24 h14" stroke-width="2.6"/>
  <circle cx="60" cy="95" r="4" stroke-width="2.2"/>`,
  volume('ph', '#3E4A5E') + volume('phS', WATER))

const tv = icon(`
  ${drop(60, 100, 26, 4)}
  ${f('url(#tvB)', '<rect x="16" y="26" width="88" height="58" rx="8"/>')}
  ${f('url(#tvS)', '<rect x="23" y="33" width="74" height="44" rx="4"/>')}
  ${gloss('<path d="M27 35 h14 l-12 40 h-6 z"/>', 0.35)}
  <rect x="23" y="33" width="74" height="44" rx="4" stroke-width="2"/>
  <rect x="16" y="26" width="88" height="58" rx="8"/>
  <path d="M46 98 h28 M60 84 v14" stroke-width="3.4"/>`,
  volume('tvB', '#3E4A5E') + volume('tvS', WATER))

const computer = icon(`
  ${f('#F2F4F9', '<rect x="20" y="28" width="80" height="52" rx="5"/>')}
  <path d="M14 92 h92 l-8 -12 h-76 z"/>`)

const umbrella = icon(`
  ${f('url(#um)', '<path d="M16 60 a44 34 0 0 1 88 0 z"/>')}
  ${shade('<path d="M60 26 a44 34 0 0 1 44 34 h-16 a30 30 0 0 0 -28 -34 z"/>', 0.12)}
  ${gloss('<path d="M32 58 a30 24 0 0 1 16 -26 a40 32 0 0 0 -8 26 z"/>', 0.4)}
  <path d="M16 60 a44 34 0 0 1 88 0 z"/>
  <path d="M16 60 q11 -12 22 0 q11 -12 22 0 q11 -12 22 0 q11 -12 22 0" stroke-width="2.4"/>
  <path d="M60 60 v32 a10 10 0 0 0 20 0" stroke-width="4"/>`, volume('um', RED))

const ball = icon(`
  ${f('#FFFFFF', '<circle cx="60" cy="60" r="36"/>')}
  ${f(INK, '<path d="M60 40 l17 12 l-6 20 h-22 l-6 -20 z"/>')}
  <path d="M60 24 v16 M24 52 l19 14 M96 52 l-19 14 M40 92 l9 -20 M80 92 l-9 -20"/>`)

const photo = icon(`
  ${f('#FFFFFF', '<rect x="20" y="28" width="80" height="64" rx="5"/>')}
  ${f(LEAF, '<path d="M28 80 l20 -24 l16 18 l12 -12 l16 18 z"/>')}
  ${f(YELLOW, '<circle cx="76" cy="46" r="7"/>')}`)

const money = icon(`
  ${drop(60, 90, 40, 4)}
  ${f('url(#mnB)', '<rect x="20" y="32" width="84" height="44" rx="6"/>')}
  ${f('url(#mn)', '<rect x="16" y="40" width="88" height="46" rx="6"/>')}
  ${shade('<rect x="16" y="72" width="88" height="14" rx="6"/>', 0.08)}
  <rect x="16" y="40" width="88" height="46" rx="6"/>
  <rect x="24" y="48" width="72" height="30" rx="4" stroke-width="1.6" stroke="rgba(40,90,50,0.4)"/>
  ${f('#FFFFFF', '<circle cx="60" cy="63" r="14"/>')}
  <circle cx="60" cy="63" r="14" stroke-width="2"/>
  <path d="M60 52 v22 M54 58 h12 M54 68 h12" stroke-width="2.4"/>`,
  volume('mn', '#CFE8CF') + volume('mnB', '#B9DCBA'))

const bed = icon(`
  ${drop(60, 100, 44, 4)}
  ${f(WOOD, '<rect x="14" y="36" width="8" height="30" rx="2"/><rect x="98" y="56" width="8" height="20" rx="2"/>')}
  <rect x="14" y="36" width="8" height="30" rx="2"/><rect x="98" y="56" width="8" height="20" rx="2"/>
  ${f('url(#bd)', '<path d="M18 60 h84 v18 a4 4 0 0 1 -4 4 h-76 a4 4 0 0 1 -4 -4 z"/>')}
  ${f('url(#bdQ)', '<path d="M40 60 h62 v18 a4 4 0 0 1 -4 4 h-58 z"/>')}
  ${f('#FFFFFF', '<rect x="24" y="48" width="28" height="14" rx="5"/>')}
  <rect x="24" y="48" width="28" height="14" rx="5"/>
  <path d="M18 60 h84 v18 a4 4 0 0 1 -4 4 h-76 a4 4 0 0 1 -4 -4 z"/>
  <path d="M40 60 v22" stroke-width="2"/>
  <path d="M22 82 v14 M98 82 v14" stroke-width="3.4"/>`,
  volume('bd', '#F2F4F9') + volume('bdQ', WATER))

const flower = icon(`
  ${drop(60, 104, 16, 3)}
  <path d="M60 76 v26" stroke="${LEAF}" stroke-width="5"/>
  ${f(LEAF, '<path d="M60 88 q-16 -10 -20 4 q16 6 20 -4 z"/>')}
  ${f('url(#fl)', '<circle cx="60" cy="40" r="13"/><circle cx="41" cy="53" r="13"/><circle cx="79" cy="53" r="13"/><circle cx="49" cy="73" r="13"/><circle cx="71" cy="73" r="13"/>')}
  ${shade('<circle cx="79" cy="53" r="13"/><circle cx="71" cy="73" r="13"/>', 0.1)}
  <circle cx="60" cy="40" r="13"/><circle cx="41" cy="53" r="13"/><circle cx="79" cy="53" r="13"/><circle cx="49" cy="73" r="13"/><circle cx="71" cy="73" r="13"/>
  ${f('url(#flC)', '<circle cx="60" cy="57" r="11"/>')}
  <circle cx="60" cy="57" r="11"/>
  ${f('rgba(150,110,20,0.35)', '<circle cx="56" cy="54" r="1.6"/><circle cx="63" cy="55" r="1.6"/><circle cx="59" cy="60" r="1.6"/>')}`,
  volume('fl', RED) + volume('flC', YELLOW))

// ─── Места ───────────────────────────────────────────────────────────────────

const school = icon(`
  ${drop(60, 100, 42, 4)}
  ${f('url(#sc)', '<rect x="20" y="46" width="80" height="52" rx="4"/>')}
  ${shade('<rect x="82" y="46" width="18" height="52"/>', 0.1)}
  ${f('url(#scR)', '<path d="M14 48 l46 -26 l46 26 z"/>')}
  ${shade('<path d="M60 22 l46 26 h-46 z"/>', 0.14)}
  <path d="M14 48 l46 -26 l46 26 z"/>
  ${f(WATER, '<rect x="32" y="60" width="17" height="17" rx="2"/><rect x="71" y="60" width="17" height="17" rx="2"/>')}
  <rect x="32" y="60" width="17" height="17" rx="2"/><rect x="71" y="60" width="17" height="17" rx="2"/>
  <path d="M40.5 60 v17 M32 68.5 h17 M79.5 60 v17 M71 68.5 h17" stroke-width="1.6"/>
  ${f(WOOD, '<path d="M52 98 v-20 h16 v20 z"/>')}
  <path d="M52 98 v-20 h16 v20"/>
  ${f('#FFFFFF', '<circle cx="60" cy="36" r="7"/>')}
  <circle cx="60" cy="36" r="7" stroke-width="2"/>
  <path d="M60 32 v4 l3 2" stroke-width="1.8"/>
  <rect x="20" y="46" width="80" height="52" rx="4"/>`,
  volume('sc', '#F2F4F9') + volume('scR', RED))

const shop = icon(`
  ${drop(60, 100, 42, 4)}
  ${f('url(#shp)', '<rect x="20" y="48" width="80" height="50" rx="4"/>')}
  ${f('url(#shpA)', '<path d="M16 48 h88 l-8 -20 h-72 z"/>')}
  ${f('#FFFFFF', '<path d="M28 48 l4 -20 h13 l-4 20 z M58 48 l4 -20 h13 l-4 20 z M88 48 l4 -20 h12 l-4 20 z"/>')}
  <path d="M16 48 h88 l-8 -20 h-72 z"/>
  ${f('url(#shpW)', '<rect x="26" y="60" width="30" height="24" rx="2"/>')}
  ${gloss('<path d="M28 62 h9 l-8 20 h-3 z"/>', 0.5)}
  <rect x="26" y="60" width="30" height="24" rx="2" stroke-width="2"/>
  ${f(WOOD, '<rect x="66" y="60" width="24" height="38" rx="2"/>')}
  <rect x="66" y="60" width="24" height="38" rx="2"/>
  ${f(YELLOW, '<circle cx="71" cy="80" r="2.6"/>')}
  <rect x="20" y="48" width="80" height="50" rx="4"/>`,
  volume('shp', '#F2F4F9') + volume('shpA', RED) + volume('shpW', WATER))

const cafe = icon(`
  ${f('#F2F4F9', '<rect x="20" y="44" width="80" height="54" rx="5"/>')}
  ${f(WOOD, '<path d="M16 44 h88 l-8 -16 h-72 z"/>')}
  ${f('#FFFFFF', '<path d="M46 60 h26 v14 a13 13 0 0 1 -26 0 z"/>')}
  <path d="M72 64 h6 a7 7 0 0 1 0 14 h-6"/>
  <path d="M42 88 h38"/>`)

const restaurant = icon(`
  ${drop(60, 106, 34, 4)}
  ${f('url(#rs)', '<circle cx="60" cy="58" r="30"/>')}
  ${f('#FFFFFF', '<circle cx="60" cy="58" r="21"/>')}
  ${gloss('<path d="M42 46 a30 30 0 0 1 20 -14 a34 34 0 0 0 -16 16 z"/>', 0.5)}
  <circle cx="60" cy="58" r="30"/><circle cx="60" cy="58" r="21" stroke-width="2"/>
  ${f(GREY, '<path d="M22 26 v26 a8 8 0 0 0 16 0 v-26 M30 26 v18"/>')}
  <path d="M22 26 v26 a8 8 0 0 0 16 0 v-26 M30 26 v20 M30 60 v44" stroke-width="3.2"/>
  ${f(GREY, '<path d="M90 26 q9 10 0 24 q-9 -14 0 -24 z"/>')}
  <path d="M90 26 q9 10 0 24 q-9 -14 0 -24 z M90 50 v54" stroke-width="3.2"/>`,
  volume('rs', '#E7EAF1'))

const hospital = icon(`
  ${drop(60, 100, 38, 4)}
  ${f('url(#hp)', '<rect x="22" y="26" width="76" height="72" rx="6"/>')}
  ${shade('<rect x="80" y="26" width="18" height="72"/>', 0.1)}
  ${f('url(#hpW)', '<rect x="32" y="62" width="14" height="14" rx="2"/><rect x="74" y="62" width="14" height="14" rx="2"/>')}
  <rect x="32" y="62" width="14" height="14" rx="2" stroke-width="1.8"/><rect x="74" y="62" width="14" height="14" rx="2" stroke-width="1.8"/>
  ${f('url(#hpC)', '<path d="M52 36 h16 v14 h14 v16 h-14 v14 h-16 v-14 h-14 v-16 h14 z"/>')}
  <path d="M52 36 h16 v14 h14 v16 h-14 v14 h-16 v-14 h-14 v-16 h14 z"/>
  ${f(WOOD, '<path d="M52 98 v-16 h16 v16 z"/>')}
  <path d="M52 98 v-16 h16 v16"/>
  <rect x="22" y="26" width="76" height="72" rx="6"/>`,
  volume('hp', '#F2F4F9') + volume('hpC', RED) + volume('hpW', WATER))

const park = icon(`
  ${f(LEAF, '<circle cx="42" cy="44" r="20"/><circle cx="76" cy="52" r="14"/>')}
  ${f(WOOD, '<rect x="38" y="62" width="8" height="24"/><rect x="72" y="64" width="7" height="22"/>')}
  ${f('#DDE7CF', '<rect x="14" y="86" width="92" height="12" rx="4"/>')}`)

const city = icon(`
  ${f('#F2F4F9', '<rect x="18" y="46" width="24" height="52"/><rect x="48" y="28" width="26" height="70"/><rect x="80" y="56" width="22" height="42"/>')}
  <path d="M24 56 h12 M24 68 h12 M24 80 h12 M54 40 h14 M54 54 h14 M54 68 h14 M54 82 h14 M86 66 h10 M86 80 h10"/>`)

const street = icon(`
  ${f('#E7EAF1', '<path d="M40 98 l12 -76 h16 l12 76 z"/>')}
  <path d="M60 30 v10 M60 50 v10 M60 70 v10 M60 90 v6"/>
  ${f('#F2F4F9', '<rect x="12" y="34" width="20" height="26"/><rect x="88" y="34" width="20" height="26"/>')}`)

// ─── Транспорт ───────────────────────────────────────────────────────────────

const car = icon(`
  ${drop(60, 92, 42, 5)}
  ${f('url(#cr)', '<path d="M18 74 v-12 l12 -18 h48 l16 18 h8 v12 z"/>')}
  ${shade('<path d="M18 68 h84 v6 h-84 z"/>', 0.12)}
  ${f('url(#crW)', '<path d="M36 58 l6 -10 h30 l8 10 z"/>')}
  ${gloss('<path d="M40 56 l4 -6 h12 l-6 6 z"/>', 0.7)}
  <path d="M36 58 l6 -10 h30 l8 10 z M58 48 v10"/>
  <path d="M18 74 v-12 l12 -18 h48 l16 18 h8 v12 z"/>
  ${f(YELLOW, '<path d="M96 62 h8 v6 h-8 z"/>')}
  ${f('#FFFFFF', '<path d="M18 62 h6 v6 h-6 z"/>')}
  <circle cx="38" cy="78" r="10" fill="${INK}"/>
  <circle cx="82" cy="78" r="10" fill="${INK}"/>
  ${f(GREY, '<circle cx="38" cy="78" r="4.4"/><circle cx="82" cy="78" r="4.4"/>')}`,
  volume('cr', RED) + volume('crW', WATER))

const bus = icon(`
  ${drop(60, 94, 42, 5)}
  ${f('url(#bs)', '<rect x="16" y="28" width="88" height="52" rx="9"/>')}
  ${shade('<rect x="16" y="66" width="88" height="14" rx="6"/>', 0.12)}
  ${f('url(#bsW)', '<rect x="24" y="36" width="20" height="20" rx="3"/><rect x="50" y="36" width="20" height="20" rx="3"/><rect x="76" y="36" width="20" height="20" rx="3"/>')}
  ${gloss('<path d="M26 38 h8 l-6 16 h-4 z M52 38 h8 l-6 16 h-4 z M78 38 h8 l-6 16 h-4 z"/>', 0.55)}
  <rect x="24" y="36" width="20" height="20" rx="3"/><rect x="50" y="36" width="20" height="20" rx="3"/><rect x="76" y="36" width="20" height="20" rx="3"/>
  <rect x="16" y="28" width="88" height="52" rx="9"/>
  ${f('#FFFFFF', '<rect x="20" y="62" width="10" height="7" rx="2"/><rect x="90" y="62" width="10" height="7" rx="2"/>')}
  <circle cx="36" cy="86" r="9" fill="${INK}"/>
  <circle cx="84" cy="86" r="9" fill="${INK}"/>
  ${f(GREY, '<circle cx="36" cy="86" r="4"/><circle cx="84" cy="86" r="4"/>')}`,
  volume('bs', YELLOW) + volume('bsW', WATER))

const train = icon(`
  ${drop(60, 100, 38, 4)}
  ${f('url(#tn)', '<rect x="24" y="20" width="72" height="62" rx="12"/>')}
  ${shade('<rect x="24" y="62" width="72" height="20" rx="10"/>', 0.12)}
  ${f('url(#tnW)', '<rect x="33" y="32" width="25" height="22" rx="4"/><rect x="62" y="32" width="25" height="22" rx="4"/>')}
  ${gloss('<path d="M35 34 h9 l-7 18 h-4 z M64 34 h9 l-7 18 h-4 z"/>', 0.5)}
  <rect x="33" y="32" width="25" height="22" rx="4"/><rect x="62" y="32" width="25" height="22" rx="4"/>
  <rect x="24" y="20" width="72" height="62" rx="12"/>
  ${f(YELLOW, '<circle cx="42" cy="68" r="5"/><circle cx="78" cy="68" r="5"/>')}
  <circle cx="42" cy="68" r="5"/><circle cx="78" cy="68" r="5"/>
  <path d="M34 82 l-10 14 M86 82 l10 14"/>
  ${f(GREY, '<rect x="18" y="92" width="84" height="7" rx="2"/>')}
  <rect x="18" y="92" width="84" height="7" rx="2"/>`,
  volume('tn', WATER) + volume('tnW', '#EAF4FB'))

const metro = icon(`
  ${f('#F2F4F9', '<path d="M14 98 v-32 a46 46 0 0 1 92 0 v32 z"/>')}
  ${f(WATER, '<rect x="34" y="46" width="52" height="40" rx="8"/>')}
  ${f('#FFFFFF', '<rect x="42" y="54" width="14" height="14" rx="2"/><rect x="64" y="54" width="14" height="14" rx="2"/>')}
  <circle cx="48" cy="80" r="3" fill="${INK}"/>
  <circle cx="72" cy="80" r="3" fill="${INK}"/>
  <path d="M14 98 h92"/>`)

const taxi = icon(`
  ${f(YELLOW, '<path d="M18 74 v-12 l12 -18 h48 l16 18 h8 v12 z"/>')}
  ${f('#FFFFFF', '<rect x="48" y="26" width="24" height="12" rx="3"/>')}
  <circle cx="38" cy="78" r="9" fill="${INK}"/>
  <circle cx="82" cy="78" r="9" fill="${INK}"/>`)

const bicycle = icon(`
  <circle cx="32" cy="74" r="18"/>
  <circle cx="88" cy="74" r="18"/>
  <path d="M32 74 l18 -30 h20 l18 30 M50 44 h26 M60 74 l10 -30"/>`)

const plane = icon(`
  ${f('#F2F4F9', '<path d="M16 62 l70 -12 l18 -14 l-8 22 l8 22 l-18 -14 z"/>')}
  <path d="M40 58 l-8 -22 h10 l16 20 M40 66 l-8 22 h10 l16 -20"/>`)

// ─── Природа и погода ────────────────────────────────────────────────────────

const tree = icon(`
  ${drop(60, 102, 26, 5)}
  ${f('url(#trW)', '<path d="M52 60 h16 v42 h-16 z"/>')}
  <path d="M52 60 h16 v42 h-16 z M56 70 q4 8 0 16 M64 66 q-3 10 0 20" stroke-width="2.2"/>
  ${f('url(#tr)', '<circle cx="60" cy="44" r="29"/>')}
  ${f('url(#trS)', '<circle cx="60" cy="44" r="29"/>')}
  ${shade('<path d="M80 26 a29 29 0 0 1 -34 45 a29 29 0 0 0 34 -45 z"/>', 0.14)}
  ${gloss('<ellipse cx="48" cy="32" rx="11" ry="7" transform="rotate(-25 48 32)"/>', 0.4)}
  <circle cx="60" cy="44" r="29"/>`,
  volume('tr', LEAF) + volume('trW', WOOD) + speckle('trS', 'rgba(40,90,40,0.2)', 8))

const sea = icon(`
  ${f('url(#seSky)', '<path d="M8 20 h104 v36 h-104 z"/>')}
  ${f('url(#seSun)', '<circle cx="88" cy="34" r="14"/>')}
  ${f('url(#se)', '<path d="M8 56 h104 v44 h-104 z"/>')}
  ${gloss('<path d="M70 66 q10 -5 20 0 q-10 5 -20 0 z M76 82 q8 -4 16 0 q-8 4 -16 0 z"/>', 0.45)}
  <path d="M8 62 q13 -8 26 0 t26 0 t26 0 t26 0"/>
  <path d="M8 78 q13 -8 26 0 t26 0 t26 0 t26 0"/>
  <path d="M8 92 q13 -8 26 0 t26 0 t26 0 t26 0" stroke-width="2.4"/>
  <circle cx="88" cy="34" r="14"/>`,
  volume('se', WATER) + volume('seSun', YELLOW) + volume('seSky', '#DCEEF8'))

const mountain = icon(`
  ${f('url(#mtSky)', '<path d="M8 24 h104 v68 h-104 z"/>')}
  ${f('url(#mt)', '<path d="M8 92 l30 -52 l20 30 l14 -22 l40 44 z"/>')}
  ${shade('<path d="M38 40 l20 30 l14 -22 l40 44 h-34 z"/>', 0.16)}
  ${f('#FFFFFF', '<path d="M38 40 l11 19 l-7 -3 l-5 4 l-5 -4 l-5 3 z"/>')}
  ${f('#FFFFFF', '<path d="M72 48 l9 10 l-5 -2 l-4 3 l-5 -3 z"/>')}
  <path d="M8 92 l30 -52 l20 30 l14 -22 l40 44 z"/>
  ${f(LEAF, '<path d="M8 92 h104 v8 h-104 z"/>')}
  <path d="M8 92 h104"/>`,
  volume('mt', '#A9B4C4') + volume('mtSky', '#E8F0F8'))

const river = icon(`
  ${f(LEAF, '<path d="M8 92 h104 v6 h-104 z"/>')}
  ${f(WATER, '<path d="M30 16 q22 26 0 44 q-22 22 6 38 h24 q-26 -18 -4 -38 q22 -20 0 -44 z"/>')}`)

const rain = icon(`
  ${f('#D7DBE3', '<path d="M34 54 a20 20 0 0 1 38 -8 a16 16 0 0 1 14 26 h-48 a16 16 0 0 1 -4 -18 z"/>')}
  <path d="M40 82 l-6 14 M60 82 l-6 14 M80 82 l-6 14" stroke="${WATER}"/>`)

const snow = icon(`
  <path d="M60 20 v80 M26 40 l68 40 M94 40 l-68 40"/>
  <path d="M60 34 l-10 -10 M60 34 l10 -10 M60 86 l-10 10 M60 86 l10 10"/>`)

const fire = icon(`
  ${f(RED, '<path d="M60 16 c14 20 26 24 26 44 a26 26 0 0 1 -52 0 c0 -12 8 -18 14 -26 c2 8 6 10 10 12 c-4 -14 2 -22 2 -30 z"/>')}
  ${f(YELLOW, '<path d="M60 56 c6 8 10 10 10 20 a10 10 0 0 1 -20 0 c0 -8 6 -12 10 -20 z"/>')}`)

const sun = icon(`
  ${f(YELLOW, '<circle cx="60" cy="60" r="22"/>')}
  <path d="M60 18 v-8 M60 102 v8 M18 60 h-8 M102 60 h8 M30 30 l-6 -6 M90 90 l6 6 M90 30 l6 -6 M30 90 l-6 6"/>`)

// ─── Человек и части тела ────────────────────────────────────────────────────

const head = icon(`
  ${drop(60, 104, 30, 4)}
  ${f('url(#hd)', '<circle cx="60" cy="58" r="38"/>')}
  ${shade('<path d="M84 30 a38 38 0 0 1 -34 62 a38 38 0 0 0 34 -62 z"/>', 0.1)}
  ${f('url(#hdH)', '<path d="M22 54 a38 38 0 0 1 76 0 q-38 -22 -76 0 z"/>')}
  ${f('url(#hd)', '<path d="M22 60 q-9 7 0 13 M98 60 q9 7 0 13"/>')}
  <path d="M22 60 q-9 7 0 13 M98 60 q9 7 0 13"/>
  <circle cx="60" cy="58" r="38"/>
  <path d="M22 54 a38 38 0 0 1 76 0 q-38 -22 -76 0 z"/>
  ${f('#FFFFFF', '<ellipse cx="46" cy="58" rx="6.5" ry="5"/><ellipse cx="74" cy="58" rx="6.5" ry="5"/>')}
  <circle cx="46.5" cy="58" r="3.4" fill="${INK}"/>
  <circle cx="74.5" cy="58" r="3.4" fill="${INK}"/>
  ${gloss('<circle cx="44.6" cy="56.2" r="1.4"/><circle cx="72.6" cy="56.2" r="1.4"/>', 0.95)}
  <path d="M38 48 q8 -4 16 -1 M66 47 q8 -3 16 1" stroke-width="2.6"/>
  <path d="M60 62 v10 q4 2 6 0" stroke-width="2.6"/>
  <path d="M48 80 q12 9 24 0"/>
  ${f('rgba(231,169,160,0.5)', '<circle cx="38" cy="70" r="5"/><circle cx="82" cy="70" r="5"/>')}`,
  volume('hd', SKIN) + volume('hdH', '#5A4632'))

const leg = icon(`
  ${f(SKIN, '<path d="M46 16 h24 v34 q0 20 -6 32 l-4 20 h-20 l6 -24 q4 -14 0 -28 z"/>')}
  ${f(INK, '<path d="M40 96 h26 v10 h-32 q-4 0 -4 -5 z"/>')}`)

const hand = icon(`
  ${drop(66, 106, 26, 4)}
  ${f('url(#hn)', '<path d="M42 100 v-30 l-10 -14 a6 6 0 0 1 9 -8 l7 8 v-40 a6 6 0 0 1 12 0 v30 v-34 a6 6 0 0 1 12 0 v34 v-28 a6 6 0 0 1 12 0 v28 v-18 a6 6 0 0 1 12 0 v56 q0 16 -14 16 z"/>')}
  ${shade('<path d="M84 40 a6 6 0 0 1 12 0 v56 q0 16 -14 16 h-10 q12 -2 12 -16 z"/>', 0.1)}
  ${gloss('<path d="M46 30 a6 6 0 0 1 6 -6 a4 4 0 0 0 -3 6 z"/>', 0.5)}
  <path d="M42 100 v-30 l-10 -14 a6 6 0 0 1 9 -8 l7 8 v-40 a6 6 0 0 1 12 0 v30 v-34 a6 6 0 0 1 12 0 v34 v-28 a6 6 0 0 1 12 0 v28 v-18 a6 6 0 0 1 12 0 v56 q0 16 -14 16 z"/>
  <path d="M54 56 v14 M66 54 v16 M78 58 v12" stroke="rgba(150,110,80,0.45)" stroke-width="2.2"/>`,
  volume('hn', SKIN))

const eye = icon(`
  ${f('url(#ey)', '<path d="M12 60 q48 -42 96 0 q-48 42 -96 0 z"/>')}
  ${f('url(#eyI)', '<circle cx="60" cy="60" r="17"/>')}
  <path d="M60 43 v6 M60 71 v6 M43 60 h6 M71 60 h6 M48 48 l4 4 M68 68 l4 4 M72 48 l-4 4 M52 68 l-4 4" stroke="rgba(30,80,120,0.35)" stroke-width="2"/>
  ${f(INK, '<circle cx="60" cy="60" r="8"/>')}
  ${gloss('<circle cx="55" cy="54" r="3.4"/><circle cx="66" cy="66" r="1.8"/>', 0.9)}
  <circle cx="60" cy="60" r="17"/>
  <path d="M12 60 q48 -42 96 0 q-48 42 -96 0 z"/>
  <path d="M18 52 q42 -32 84 0" stroke-width="3.4"/>
  <path d="M26 36 l6 8 M60 26 v10 M94 36 l-6 8" stroke-width="2.6"/>`,
  volume('ey', '#FFFFFF') + volume('eyI', WATER))

const ear = icon(`
  ${f('url(#er)', '<path d="M44 24 a28 28 0 0 1 34 44 q-12 12 -10 24 a12 12 0 0 1 -22 6 q-10 -20 -10 -46 z"/>')}
  ${shade('<path d="M70 30 a28 28 0 0 1 8 38 q-12 12 -10 24 a12 12 0 0 1 -10 6 q10 -6 8 -22 q2 -14 12 -22 a26 26 0 0 0 -8 -24 z"/>', 0.12)}
  ${gloss('<path d="M48 34 a20 20 0 0 1 14 -8 a24 24 0 0 0 -10 12 z"/>', 0.5)}
  <path d="M44 24 a28 28 0 0 1 34 44 q-12 12 -10 24 a12 12 0 0 1 -22 6 q-10 -20 -10 -46 z"/>
  <path d="M56 44 a12 12 0 0 1 14 18 q-8 8 -6 16" stroke-width="2.6"/>
  <path d="M52 58 a6 6 0 0 1 8 6" stroke-width="2.2"/>`, volume('er', SKIN))

const heart = icon(`
  ${drop(60, 104, 24, 4)}
  ${f('url(#ht2)', '<path d="M60 96 C 20 68, 16 44, 32 32 c12 -9 24 -2 28 8 c4 -10 16 -17 28 -8 c16 12 12 36 -28 64 z"/>')}
  ${shade('<path d="M88 32 c16 12 12 36 -28 64 c-2 -1 -4 -3 -6 -4 c34 -26 38 -48 24 -60 c4 -2 7 -2 10 0 z"/>', 0.14)}
  ${gloss('<path d="M36 40 a14 12 0 0 1 14 -4 a16 14 0 0 0 -8 14 a6 6 0 0 1 -6 -10 z"/>', 0.55)}
  <path d="M60 96 C 20 68, 16 44, 32 32 c12 -9 24 -2 28 8 c4 -10 16 -17 28 -8 c16 12 12 36 -28 64 z"/>`,
  volume('ht2', RED))

const family = icon(`
  ${drop(60, 100, 42, 4)}
  ${f('url(#fmS)', '<circle cx="36" cy="38" r="14"/>')}
  ${f('#5A4632', '<path d="M22 34 a14 14 0 0 1 28 0 q-14 -8 -28 0 z"/>')}
  <circle cx="36" cy="38" r="14"/>
  ${f('url(#fmB)', '<path d="M18 98 v-24 a18 18 0 0 1 36 0 v24 z"/>')}
  <path d="M18 98 v-24 a18 18 0 0 1 36 0 v24 z"/>
  ${f('url(#fmS)', '<circle cx="84" cy="38" r="14"/>')}
  ${f('#8A5A34', '<path d="M70 36 a14 14 0 0 1 28 0 q-4 -12 -14 -12 q-10 0 -14 12 z"/>')}
  <circle cx="84" cy="38" r="14"/>
  ${f('url(#fmR)', '<path d="M66 98 v-24 a18 18 0 0 1 36 0 v24 z"/>')}
  <path d="M66 98 v-24 a18 18 0 0 1 36 0 v24 z"/>
  ${f('url(#fmS)', '<circle cx="60" cy="60" r="11"/>')}
  <circle cx="60" cy="60" r="11"/>
  ${f('url(#fmY)', '<path d="M46 98 v-18 a14 14 0 0 1 28 0 v18 z"/>')}
  <path d="M46 98 v-18 a14 14 0 0 1 28 0 v18 z"/>`,
  volume('fmS', SKIN) + volume('fmB', WATER) + volume('fmR', RED) + volume('fmY', YELLOW))

const friend = icon(`
  ${f(SKIN, '<circle cx="42" cy="38" r="14"/><circle cx="80" cy="38" r="14"/>')}
  ${f(WATER, '<path d="M18 96 v-22 a24 20 0 0 1 48 0 v22 z"/>')}
  ${f(LEAF, '<path d="M56 96 v-22 a24 20 0 0 1 48 0 v22 z"/>')}`)

const teacher = icon(`
  ${drop(60, 100, 44, 4)}
  ${f('url(#tcB)', '<rect x="14" y="16" width="60" height="46" rx="4"/>')}
  <path d="M24 30 h34 M24 40 h24 M24 50 h30" stroke="rgba(255,255,255,0.75)" stroke-width="2.4"/>
  <rect x="14" y="16" width="60" height="46" rx="4"/>
  ${f(WOOD, '<rect x="14" y="62" width="60" height="5" rx="2"/>')}
  <rect x="14" y="62" width="60" height="5" rx="2"/>
  ${f('url(#tcS)', '<circle cx="86" cy="40" r="13"/>')}
  ${f('#3E4A5E', '<path d="M73 36 a13 13 0 0 1 26 0 q-13 -8 -26 0 z"/>')}
  <circle cx="86" cy="40" r="13"/>
  ${f('url(#tcR)', '<path d="M66 100 v-24 a20 18 0 0 1 40 0 v24 z"/>')}
  <path d="M66 100 v-24 a20 18 0 0 1 40 0 v24 z"/>
  <path d="M58 74 l-16 -8" stroke-width="3.4"/>`,
  volume('tcB', '#2F6D52') + volume('tcS', SKIN) + volume('tcR', RED))

const student = icon(`
  ${drop(60, 100, 32, 4)}
  ${f('url(#sdS)', '<circle cx="60" cy="44" r="16"/>')}
  <circle cx="60" cy="44" r="16"/>
  ${f('url(#sdC)', '<path d="M26 32 l34 -14 l34 14 l-34 13 z"/>')}
  ${f('url(#sdC)', '<path d="M44 38 v10 a16 8 0 0 0 32 0 v-10 z"/>')}
  <path d="M26 32 l34 -14 l34 14 l-34 13 z"/>
  <path d="M88 36 v14" stroke-width="2.4"/>
  ${f(YELLOW, '<circle cx="88" cy="52" r="4"/>')}
  ${f('url(#sdB)', '<path d="M30 100 v-24 a30 22 0 0 1 60 0 v24 z"/>')}
  ${f('#FFFFFF', '<path d="M52 78 l8 8 l8 -8 v22 h-16 z"/>')}
  <path d="M30 100 v-24 a30 22 0 0 1 60 0 v24 z"/>`,
  volume('sdS', SKIN) + volume('sdC', '#3E4A5E') + volume('sdB', WATER))

const child = icon(`
  ${drop(60, 100, 28, 4)}
  ${f('url(#chY)', '<path d="M36 98 v-20 a24 18 0 0 1 48 0 v20 z"/>')}
  ${shade('<path d="M70 62 a24 18 0 0 1 14 16 v20 h-14 z"/>', 0.1)}
  <path d="M36 98 v-20 a24 18 0 0 1 48 0 v20 z"/>
  ${f('url(#chS)', '<circle cx="60" cy="40" r="19"/>')}
  ${f('#8A5A34', '<path d="M41 36 a19 19 0 0 1 38 0 q-19 -12 -38 0 z"/>')}
  ${shade('<path d="M74 26 a19 19 0 0 1 -22 32 a19 19 0 0 0 22 -32 z"/>', 0.1)}
  <circle cx="60" cy="40" r="19"/>
  ${f('#FFFFFF', '<circle cx="53" cy="41" r="3.6"/><circle cx="67" cy="41" r="3.6"/>')}
  <circle cx="53.4" cy="41.4" r="2.2" fill="${INK}"/>
  <circle cx="67.4" cy="41.4" r="2.2" fill="${INK}"/>
  ${f('#E7A9A0', '<circle cx="46" cy="46" r="3.4"/><circle cx="74" cy="46" r="3.4"/>')}
  <path d="M54 50 q6 5 12 0"/>`,
  volume('chS', SKIN) + volume('chY', YELLOW))

// ─── Время суток ─────────────────────────────────────────────────────────────

const morning = icon(`
  ${f(YELLOW, '<path d="M32 72 a28 28 0 0 1 56 0 z"/>')}
  <path d="M12 72 h96"/>
  <path d="M60 26 v-10 M28 40 l-7 -7 M92 40 l7 -7 M18 56 h-8 M110 56 h-8"/>`)

const evening = icon(`
  ${f('#F2994A', '<path d="M32 72 a28 28 0 0 1 56 0 z"/>')}
  <path d="M12 72 h96"/>
  <path d="M12 86 h96" stroke="${GREY}"/>`)

const night = icon(`
  ${f('#4A5570', '<rect x="8" y="16" width="104" height="88" rx="14"/>')}
  ${f('#FFF3C4', '<path d="M74 30 a26 26 0 1 0 22 34 a20 20 0 0 1 -22 -34 z"/>')}
  ${f('#FFF3C4', '<circle cx="34" cy="40" r="3"/><circle cx="46" cy="66" r="2.4"/><circle cx="28" cy="76" r="2.4"/>')}`)

// ─── Учёба, дела, поездки ────────────────────────────────────────────────────

const room = icon(`
  ${f('#FAFBFD', '<rect x="16" y="24" width="88" height="72" rx="6"/>')}
  ${f(WATER, '<rect x="26" y="36" width="26" height="24" rx="2"/>')}
  ${f(WOOD, '<rect x="62" y="58" width="34" height="8" rx="2"/>')}
  <path d="M68 66 v18 M90 66 v18 M16 84 h88"/>`)

const door = icon(`
  ${drop(60, 108, 32, 3)}
  ${f('url(#dr2)', '<rect x="26" y="12" width="68" height="92" rx="4"/>')}
  ${shade('<rect x="78" y="12" width="16" height="92"/>', 0.1)}
  ${f('url(#dr2P)', '<rect x="36" y="22" width="48" height="30" rx="3"/><rect x="36" y="60" width="48" height="34" rx="3"/>')}
  <rect x="36" y="22" width="48" height="30" rx="3" stroke-width="2.2"/><rect x="36" y="60" width="48" height="34" rx="3" stroke-width="2.2"/>
  <rect x="26" y="12" width="68" height="92" rx="4"/>
  ${f('url(#dr2H)', '<circle cx="78" cy="58" r="5"/>')}
  <circle cx="78" cy="58" r="5" stroke-width="2.2"/>`,
  volume('dr2', WOOD) + volume('dr2P', tone(WOOD, -0.08)) + volume('dr2H', YELLOW))

const clothes = icon(`
  ${drop(60, 102, 30, 4)}
  ${f('url(#cth)', '<path d="M40 28 l20 9 l20 -9 l24 17 l-13 19 l-8 -6 v40 a4 4 0 0 1 -4 4 h-38 a4 4 0 0 1 -4 -4 v-40 l-8 6 l-13 -19 z"/>')}
  ${shade('<path d="M74 34 l6 -6 l24 17 l-13 19 l-8 -6 v40 a4 4 0 0 1 -4 4 h-10 a4 4 0 0 0 4 -4 z"/>', 0.1)}
  ${gloss('<path d="M46 40 l8 4 v42 h-8 z"/>', 0.3)}
  <path d="M40 28 l20 9 l20 -9 l24 17 l-13 19 l-8 -6 v40 a4 4 0 0 1 -4 4 h-38 a4 4 0 0 1 -4 -4 v-40 l-8 6 l-13 -19 z"/>
  <path d="M40 28 l20 9 l20 -9 M52 34 l8 12 l8 -12" stroke-width="2.4"/>
  ${f('#FFFFFF', '<circle cx="60" cy="60" r="2.6"/><circle cx="60" cy="74" r="2.6"/>')}`, volume('cth', WATER))

const shoe = icon(`
  ${drop(60, 92, 44, 4)}
  ${f('url(#sho)', '<path d="M16 76 v-26 h24 l14 12 h26 a24 13 0 0 1 24 13 v7 a4 4 0 0 1 -4 4 h-80 a4 4 0 0 1 -4 -4 z"/>')}
  ${shade('<path d="M16 78 h88 v3 a4 4 0 0 1 -4 4 h-80 a4 4 0 0 1 -4 -4 z"/>', 0.16)}
  ${gloss('<path d="M22 54 h12 v18 h-12 z"/>', 0.22)}
  <path d="M16 76 v-26 h24 l14 12 h26 a24 13 0 0 1 24 13 v7 a4 4 0 0 1 -4 4 h-80 a4 4 0 0 1 -4 -4 z"/>
  <path d="M40 50 l10 10 M52 54 l8 8" stroke-width="2.4"/>
  <path d="M16 68 h88" stroke-width="2"/>`, volume('sho', '#5B6A82'))

const film = icon(`
  ${f('#3E4A5E', '<rect x="16" y="30" width="88" height="60" rx="6"/>')}
  ${f('#FFFFFF', '<rect x="34" y="42" width="52" height="36" rx="3"/>')}
  ${f('#FFFFFF', '<circle cx="25" cy="42" r="4"/><circle cx="25" cy="60" r="4"/><circle cx="25" cy="78" r="4"/><circle cx="95" cy="42" r="4"/><circle cx="95" cy="60" r="4"/><circle cx="95" cy="78" r="4"/>')}`)

const music = icon(`
  ${f(INK, '<path d="M52 84 a12 10 0 1 0 12 10 v-58 l26 -8 v46 a12 10 0 1 0 12 10 v-72 l-50 14 z"/>')}`)

const song = icon(`
  ${f(GREY, '<rect x="50" y="18" width="20" height="42" rx="10"/>')}
  <path d="M38 54 a22 22 0 0 0 44 0 M60 76 v20 M44 100 h32"/>`)

const library = icon(`
  ${drop(60, 100, 40, 4)}
  ${f('url(#lb)', '<rect x="16" y="22" width="88" height="74" rx="5"/>')}
  ${f('url(#lbR)', '<rect x="26" y="32" width="13" height="26" rx="2"/>')}
  ${f('url(#lbB)', '<rect x="43" y="30" width="13" height="28" rx="2"/>')}
  ${f('url(#lbG)', '<rect x="60" y="34" width="13" height="24" rx="2"/>')}
  ${f('url(#lbY)', '<rect x="77" y="31" width="13" height="27" rx="2"/>')}
  <rect x="26" y="32" width="13" height="26" rx="2" stroke-width="2"/><rect x="43" y="30" width="13" height="28" rx="2" stroke-width="2"/>
  <rect x="60" y="34" width="13" height="24" rx="2" stroke-width="2"/><rect x="77" y="31" width="13" height="27" rx="2" stroke-width="2"/>
  ${f(WOOD, '<rect x="22" y="58" width="76" height="6" rx="2"/>')}
  <rect x="22" y="58" width="76" height="6" rx="2"/>
  ${f('url(#lbR)', '<rect x="30" y="70" width="13" height="20" rx="2"/>')}
  ${f('url(#lbG)', '<rect x="47" y="68" width="13" height="22" rx="2"/>')}
  ${f('url(#lbB)', '<rect x="64" y="71" width="13" height="19" rx="2"/>')}
  <rect x="30" y="70" width="13" height="20" rx="2" stroke-width="2"/><rect x="47" y="68" width="13" height="22" rx="2" stroke-width="2"/><rect x="64" y="71" width="13" height="19" rx="2" stroke-width="2"/>
  <rect x="16" y="22" width="88" height="74" rx="5"/>`,
  volume('lb', '#F7F8FC') + volume('lbR', RED) + volume('lbB', WATER) + volume('lbG', LEAF) + volume('lbY', YELLOW))

const station = icon(`
  ${f('#F2F4F9', '<rect x="24" y="34" width="72" height="34" rx="6"/>')}
  ${f(WATER, '<rect x="34" y="42" width="22" height="18" rx="2"/><rect x="64" y="42" width="22" height="18" rx="2"/>')}
  <circle cx="42" cy="76" r="6" fill="${INK}"/>
  <circle cx="78" cy="76" r="6" fill="${INK}"/>
  <path d="M14 92 h92 M14 100 h92"/>`)

const map = icon(`
  ${f('#EFEFE4', '<path d="M16 32 l28 -10 l32 10 l28 -10 v66 l-28 10 l-32 -10 l-28 10 z"/>')}
  <path d="M44 22 v66 M76 32 v66"/>
  ${f(RED, '<path d="M60 40 a9 9 0 0 1 9 9 c0 7 -9 17 -9 17 s-9 -10 -9 -17 a9 9 0 0 1 9 -9 z"/>')}`)

const bill = icon(`
  ${f('#FFFFFF', '<path d="M30 16 h60 v88 l-10 -6 l-10 6 l-10 -6 l-10 6 l-10 -6 l-10 6 z"/>')}
  <path d="M42 36 h36 M42 50 h36 M42 64 h24"/>`)

const notebook = icon(`
  ${f('#F2F4F9', '<rect x="26" y="18" width="68" height="86" rx="5"/>')}
  <path d="M42 18 v86" stroke="${RED}"/>
  <path d="M52 38 h32 M52 54 h32 M52 70 h32 M52 86 h20"/>`)

const pencil = icon(`
  ${f(YELLOW, '<path d="M28 92 l8 -24 l46 -46 l16 16 l-46 46 z"/>')}
  ${f(SKIN, '<path d="M28 92 l8 -24 l16 16 z"/>')}
  ${f(INK, '<path d="M28 92 l4 -12 l8 8 z"/>')}
  <path d="M82 22 l16 16"/>`)

const suitcase = icon(`
  ${f('#8A5A34', '<rect x="20" y="40" width="80" height="52" rx="6"/>')}
  <path d="M46 40 v-10 a6 6 0 0 1 6 -6 h16 a6 6 0 0 1 6 6 v10"/>
  <path d="M20 60 h80"/>`)

const calendar = icon(`
  ${f('#FFFFFF', '<rect x="18" y="26" width="84" height="72" rx="6"/>')}
  ${f(RED, '<path d="M18 32 a6 6 0 0 1 6 -6 h72 a6 6 0 0 1 6 6 v14 h-84 z"/>')}
  <path d="M38 26 v-12 M82 26 v-12"/>
  <path d="M34 62 h12 M54 62 h12 M74 62 h12 M34 80 h12 M54 80 h12 M74 80 h12"/>`)

const cooking = icon(`
  ${f(GREY, '<path d="M26 52 h68 v28 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 z"/>')}
  <path d="M94 60 h12 M26 60 h-12"/>
  <path d="M46 40 q6 -10 0 -18 M60 38 q6 -10 0 -18 M74 40 q6 -10 0 -18"/>`)

const driving = icon(`
  <circle cx="60" cy="60" r="36"/>
  <circle cx="60" cy="60" r="12"/>
  <path d="M60 24 v24 M28 74 l22 -12 M92 74 l-22 -12"/>`)

const exam = icon(`
  ${f('#FFFFFF', '<rect x="26" y="16" width="68" height="88" rx="5"/>')}
  ${f(LEAF, '<path d="M38 40 l6 8 l14 -16"/>')}
  ${f(LEAF, '<path d="M38 66 l6 8 l14 -16"/>')}
  <path d="M66 42 h18 M66 68 h18"/>
  ${f(RED, '<circle cx="76" cy="92" r="12"/>')}`)

const pharmacy = icon(`
  ${drop(60, 100, 36, 4)}
  ${f('url(#phr)', '<rect x="24" y="26" width="72" height="72" rx="8"/>')}
  ${shade('<rect x="78" y="26" width="18" height="72" rx="8"/>', 0.09)}
  ${f('url(#phrC)', '<path d="M52 40 h16 v16 h16 v16 h-16 v16 h-16 v-16 h-16 v-16 h16 z"/>')}
  ${gloss('<path d="M52 40 h6 v50 h-6 z"/>', 0.28)}
  <path d="M52 40 h16 v16 h16 v16 h-16 v16 h-16 v-16 h-16 v-16 h16 z"/>
  <rect x="24" y="26" width="72" height="72" rx="8"/>`,
  volume('phr', '#F2F4F9') + volume('phrC', LEAF))

const bank = icon(`
  ${drop(60, 102, 44, 4)}
  ${f('url(#bnk)', '<rect x="22" y="46" width="76" height="44"/>')}
  ${f('url(#bnkR)', '<path d="M14 46 l46 -26 l46 26 z"/>')}
  ${shade('<path d="M60 20 l46 26 h-46 z"/>', 0.12)}
  <path d="M14 46 l46 -26 l46 26 z"/>
  ${f('#FFFFFF', '<rect x="31" y="54" width="10" height="30" rx="2"/><rect x="55" y="54" width="10" height="30" rx="2"/><rect x="79" y="54" width="10" height="30" rx="2"/>')}
  <rect x="31" y="54" width="10" height="30" rx="2"/><rect x="55" y="54" width="10" height="30" rx="2"/><rect x="79" y="54" width="10" height="30" rx="2"/>
  ${f(GREY, '<rect x="14" y="90" width="92" height="8" rx="2"/>')}
  <rect x="14" y="90" width="92" height="8" rx="2"/>
  ${f(YELLOW, '<circle cx="60" cy="36" r="5"/>')}`,
  volume('bnk', '#F2F4F9') + volume('bnkR', '#D7DBE3'))

const post = icon(`
  ${drop(60, 104, 24, 4)}
  ${f(GREY, '<rect x="54" y="76" width="12" height="28" rx="3"/>')}
  <rect x="54" y="76" width="12" height="28" rx="3"/>
  ${f('url(#ps)', '<path d="M30 40 a30 22 0 0 1 60 0 v36 h-60 z"/>')}
  ${shade('<path d="M72 24 a30 22 0 0 1 18 16 v36 h-18 z"/>', 0.12)}
  ${gloss('<path d="M40 38 a24 18 0 0 1 12 -12 a30 22 0 0 0 -8 12 z"/>', 0.4)}
  <path d="M30 40 a30 22 0 0 1 60 0 v36 h-60 z"/>
  ${f('#FFFFFF', '<rect x="44" y="44" width="32" height="9" rx="3"/>')}
  <rect x="44" y="44" width="32" height="9" rx="3" stroke-width="2.2"/>
  ${f('#FFFFFF', '<path d="M46 62 h28 v12 h-28 z"/>')}
  <path d="M46 62 h28 v12 h-28 z M46 62 l14 8 l14 -8" stroke-width="2"/>`, volume('ps', RED))

const hotel = icon(`
  ${drop(60, 102, 40, 4)}
  ${f('url(#ht)', '<rect x="20" y="20" width="80" height="78" rx="5"/>')}
  ${shade('<rect x="82" y="20" width="18" height="78"/>', 0.1)}
  ${f('url(#htW)', '<rect x="30" y="32" width="16" height="16" rx="2"/><rect x="52" y="32" width="16" height="16" rx="2"/><rect x="74" y="32" width="16" height="16" rx="2"/><rect x="30" y="56" width="16" height="16" rx="2"/><rect x="52" y="56" width="16" height="16" rx="2"/><rect x="74" y="56" width="16" height="16" rx="2"/>')}
  <rect x="30" y="32" width="16" height="16" rx="2" stroke-width="1.8"/><rect x="52" y="32" width="16" height="16" rx="2" stroke-width="1.8"/><rect x="74" y="32" width="16" height="16" rx="2" stroke-width="1.8"/>
  <rect x="30" y="56" width="16" height="16" rx="2" stroke-width="1.8"/><rect x="52" y="56" width="16" height="16" rx="2" stroke-width="1.8"/><rect x="74" y="56" width="16" height="16" rx="2" stroke-width="1.8"/>
  ${f(WOOD, '<rect x="50" y="80" width="20" height="18" rx="2"/>')}
  <rect x="50" y="80" width="20" height="18" rx="2"/>
  ${f(RED, '<path d="M20 20 h80 v-6 h-80 z"/>')}
  ${f(YELLOW, '<circle cx="60" cy="26" r="4"/>')}
  <rect x="20" y="20" width="80" height="78" rx="5"/>`,
  volume('ht', '#F2F4F9') + volume('htW', WATER))

const beach = icon(`
  ${f(YELLOW, '<path d="M8 74 h104 v24 h-104 z"/>')}
  ${f(WATER, '<path d="M8 52 h104 v22 h-104 z"/>')}
  <path d="M8 60 q13 -6 26 0 t26 0 t26 0 t26 0"/>
  ${f(LEAF, '<path d="M74 40 q16 -12 26 -2 q-14 0 -26 2 z M74 40 q-16 -12 -26 -2 q14 0 26 2 z"/>')}
  <path d="M74 40 v34" stroke="${WOOD}"/>`)

const forest = icon(`
  ${f(LEAF, '<path d="M30 66 l16 -34 l16 34 z M62 72 l20 -42 l20 42 z"/>')}
  ${f(WOOD, '<rect x="42" y="66" width="8" height="26"/><rect x="78" y="72" width="8" height="20"/>')}
  <path d="M10 92 h100"/>`)

const office = icon(`
  ${f('#F2F4F9', '<rect x="26" y="18" width="68" height="80" rx="4"/>')}
  ${f(WATER, '<rect x="36" y="30" width="14" height="14"/><rect x="58" y="30" width="14" height="14"/><rect x="36" y="52" width="14" height="14"/><rect x="58" y="52" width="14" height="14"/>')}
  ${f(WOOD, '<rect x="50" y="76" width="20" height="22" rx="2"/>')}`)

// ─── Действия ────────────────────────────────────────────────────────────────
//
// Глаголы рисуются позой или предметом в руке: спящий человек, рука с
// карандашом, глаз у экрана. Это ровно те слова, которых в начальных юнитах
// больше всего, а картинкой они опознаются не хуже предметов.

const sleeping = icon(`
  ${drop(60, 100, 44, 4)}
  ${f(WOOD, '<path d="M16 74 h6 v22 h-6 z M98 74 h6 v22 h-6 z"/>')}
  ${f('url(#slB)', '<path d="M14 72 h92 v16 a4 4 0 0 1 -4 4 h-84 a4 4 0 0 1 -4 -4 z"/>')}
  ${f('url(#slQ)', '<path d="M28 72 a24 16 0 0 1 48 0 z"/>')}
  ${gloss('<path d="M34 70 a20 14 0 0 1 16 -12 a24 16 0 0 0 -12 12 z"/>', 0.4)}
  <path d="M28 72 a24 16 0 0 1 48 0 z"/>
  ${f('#FFFFFF', '<ellipse cx="86" cy="64" rx="15" ry="10"/>')}
  <ellipse cx="86" cy="64" rx="15" ry="10"/>
  ${f('url(#slS)', '<circle cx="84" cy="58" r="11"/>')}
  <circle cx="84" cy="58" r="11"/>
  <path d="M79 57 q3 3 6 0 M88 56 q3 3 5 0" stroke-width="2"/>
  <path d="M14 72 h92 v16 a4 4 0 0 1 -4 4 h-84 a4 4 0 0 1 -4 -4 z"/>
  <path d="M96 36 q9 -6 0 -11 M108 26 q8 -5 0 -9" stroke="${GREY}" stroke-width="2.6"/>`,
  volume('slB', '#F2F4F9') + volume('slQ', WATER) + volume('slS', SKIN))

const writing = icon(`
  ${drop(58, 100, 40, 4)}
  ${f('url(#wr)', '<rect x="14" y="54" width="88" height="42" rx="4"/>')}
  ${shade('<rect x="14" y="86" width="88" height="10" rx="4"/>', 0.07)}
  <path d="M24 70 h40 M24 82 h26" stroke="rgba(60,72,96,0.45)" stroke-width="2.4"/>
  <rect x="14" y="54" width="88" height="42" rx="4"/>
  ${f('url(#wrP)', '<path d="M50 66 l32 -36 l15 13 l-32 36 z"/>')}
  ${gloss('<path d="M54 66 l32 -36 l5 4 l-32 36 z"/>', 0.35)}
  ${f('#F2C14E', '<path d="M82 26 l4 -4 l15 13 l-4 4 z"/>')}
  <path d="M82 26 l4 -4 l15 13 l-4 4 z"/>
  ${f(SKIN, '<path d="M50 66 l-6 22 l21 -8 z"/>')}
  ${f(INK, '<path d="M46 82 l-2 6 l6 -2 z"/>')}
  <path d="M50 66 l32 -36 l15 13 l-32 36 l-21 8 z"/>`,
  volume('wr', '#FFFFFF') + volume('wrP', YELLOW))

const reading = icon(`
  ${drop(60, 96, 42, 4)}
  ${f('url(#rdS)', '<circle cx="60" cy="22" r="13"/>')}
  ${f('#8A5A34', '<path d="M47 18 a13 13 0 0 1 26 0 q-13 -8 -26 0 z"/>')}
  <circle cx="60" cy="22" r="13"/>
  ${f('url(#rdB)', '<path d="M16 44 q22 -10 44 0 v42 q-22 -10 -44 0 z"/>')}
  ${f('url(#rdB)', '<path d="M104 44 q-22 -10 -44 0 v42 q22 -10 44 0 z"/>')}
  ${shade('<path d="M60 44 q22 -10 44 0 v42 q-22 -10 -44 0 z"/>', 0.07)}
  <path d="M26 56 h24 M26 66 h24 M70 56 h24 M70 66 h24" stroke="rgba(60,72,96,0.4)" stroke-width="2"/>
  <path d="M16 44 q22 -10 44 0 v42 q-22 -10 -44 0 z"/><path d="M104 44 q-22 -10 -44 0 v42 q22 -10 44 0 z"/>
  <path d="M60 44 v42"/>
  ${f('url(#rdS)', '<path d="M22 92 a10 8 0 0 1 16 -4 M82 88 a10 8 0 0 1 16 4"/>')}`,
  volume('rdB', '#F7F8FC') + volume('rdS', SKIN))

const watching = icon(`
  ${f('#F2F4F9', '<rect x="18" y="26" width="84" height="52" rx="6"/>')}
  ${f(SKIN, '<circle cx="60" cy="52" r="14"/>')}
  ${f('#FFFFFF', '<path d="M40 52 q20 -16 40 0 q-20 16 -40 0 z"/>')}
  ${f(INK, '<circle cx="60" cy="52" r="6"/>')}
  <path d="M46 92 h28 M60 78 v14"/>`)

const listening = icon(`
  ${f(SKIN, '<path d="M50 24 a26 26 0 0 1 32 42 q-12 12 -10 22 a11 11 0 0 1 -21 6 q-9 -18 -9 -42 z"/>')}
  <path d="M92 34 q14 26 0 52 M104 22 q22 38 0 76" stroke="${WATER}"/>`)

const eating = icon(`
  ${drop(60, 96, 30, 4)}
  ${f('url(#et)', '<circle cx="60" cy="60" r="30"/>')}
  ${f('#FFFFFF', '<circle cx="60" cy="60" r="21"/>')}
  ${gloss('<path d="M42 48 a30 30 0 0 1 20 -14 a34 34 0 0 0 -16 16 z"/>', 0.5)}
  <circle cx="60" cy="60" r="30"/><circle cx="60" cy="60" r="21" stroke-width="2"/>
  ${f(LEAF, '<circle cx="55" cy="56" r="7"/><circle cx="66" cy="62" r="6"/>')}
  ${f(RED, '<circle cx="58" cy="67" r="5"/>')}
  <circle cx="55" cy="56" r="7" stroke-width="2"/><circle cx="66" cy="62" r="6" stroke-width="2"/><circle cx="58" cy="67" r="5" stroke-width="2"/>
  ${f(GREY, '<path d="M16 24 v22 a6 6 0 0 0 12 0 v-22"/>')}
  <path d="M16 24 v22 a6 6 0 0 0 12 0 v-22 M22 24 v18 M22 52 v52" stroke-width="3.2"/>
  ${f(GREY, '<path d="M98 24 q8 10 0 22 q-8 -12 0 -22 z"/>')}
  <path d="M98 24 q8 10 0 22 q-8 -12 0 -22 z M98 46 v58" stroke-width="3.2"/>`,
  volume('et', '#E7EAF1'))

const drinking = icon(`
  ${drop(60, 102, 22, 4)}
  ${f('url(#dr)', '<path d="M38 32 h44 l-7 60 a8 8 0 0 1 -8 6 h-14 a8 8 0 0 1 -8 -6 z"/>')}
  ${f('url(#drW)', '<path d="M41 48 h38 l-5 44 a8 8 0 0 1 -8 6 h-12 a8 8 0 0 1 -8 -6 z"/>')}
  ${gloss('<path d="M46 54 h7 l-4 40 h-5 z"/>', 0.55)}
  ${shade('<path d="M72 32 h10 l-7 60 a8 8 0 0 1 -8 6 h-6 a8 8 0 0 0 8 -6 z"/>', 0.1)}
  <path d="M38 32 h44 l-7 60 a8 8 0 0 1 -8 6 h-14 a8 8 0 0 1 -8 -6 z"/>
  <path d="M41 48 h38" stroke-width="2"/>
  ${f(RED, '<path d="M56 32 v-16 h22 v5 h-17 v11 z"/>')}
  <path d="M56 32 v-16 h22" stroke-width="2.6"/>`,
  volume('dr', '#EAF4FB') + volume('drW', WATER))

const walking = icon(`
  ${f(SKIN, '<circle cx="66" cy="22" r="13"/>')}
  ${f(WATER, '<path d="M54 38 h22 l4 28 h-30 z"/>')}
  <path d="M56 66 l-18 28 M74 66 l10 28" stroke-width="7"/>
  <path d="M38 94 h-8 M84 94 h8" stroke-width="7"/>
  <path d="M58 46 l-18 14 M74 46 l14 8" stroke-width="6"/>`)

const running = icon(`
  ${f(SKIN, '<circle cx="70" cy="24" r="12"/>')}
  ${f(RED, '<path d="M56 40 h20 l10 22 h-38 z"/>')}
  <path d="M48 62 l-18 12 l6 22 M78 62 l14 16 M60 40 l-24 4 M76 44 l18 -8"/>`)

const playing = icon(`
  ${drop(62, 100, 34, 4)}
  ${f('url(#plB)', '<circle cx="42" cy="62" r="24"/>')}
  ${f(INK, '<path d="M42 46 l11 8 l-4 13 h-14 l-4 -13 z"/>')}
  <path d="M42 38 v8 M22 54 l13 9 M62 54 l-13 9 M30 82 l7 -13 M54 82 l-7 -13" stroke-width="2.4"/>
  <circle cx="42" cy="62" r="24"/>
  ${f('url(#plC)', '<rect x="66" y="56" width="30" height="30" rx="5"/>')}
  ${shade('<rect x="82" y="56" width="14" height="30" rx="5"/>', 0.12)}
  <rect x="66" y="56" width="30" height="30" rx="5"/>
  ${f(INK, '<circle cx="75" cy="65" r="3"/><circle cx="87" cy="77" r="3"/><circle cx="81" cy="71" r="3"/>')}
  ${f('url(#plD)', '<rect x="70" y="26" width="26" height="26" rx="5"/>')}
  <rect x="70" y="26" width="26" height="26" rx="5"/>
  ${f('#FFFFFF', '<circle cx="78" cy="34" r="2.8"/><circle cx="88" cy="44" r="2.8"/>')}`,
  volume('plB', '#FFFFFF') + volume('plC', YELLOW) + volume('plD', RED))

const buying = icon(`
  ${drop(60, 102, 34, 4)}
  <path d="M44 46 a16 16 0 0 1 32 0" stroke-width="4"/>
  ${f('url(#by)', '<path d="M26 44 h68 l-8 48 a8 8 0 0 1 -8 6 h-36 a8 8 0 0 1 -8 -6 z"/>')}
  ${shade('<path d="M76 44 h18 l-8 48 a8 8 0 0 1 -8 6 h-14 a8 8 0 0 0 10 -6 z"/>', 0.12)}
  ${gloss('<rect x="34" y="52" width="7" height="30" rx="3"/>', 0.4)}
  <path d="M26 44 h68 l-8 48 a8 8 0 0 1 -8 6 h-36 a8 8 0 0 1 -8 -6 z"/>
  ${f(LEAF, '<circle cx="50" cy="62" r="7"/>')}
  ${f(RED, '<circle cx="66" cy="66" r="8"/>')}
  <circle cx="50" cy="62" r="7" stroke-width="2"/><circle cx="66" cy="66" r="8" stroke-width="2"/>
  ${f('#F4F6FA', '<rect x="44" y="74" width="30" height="12" rx="2"/>')}
  <rect x="44" y="74" width="30" height="12" rx="2" stroke-width="2"/>`, volume('by', YELLOW))

const waiting = icon(`
  ${f('#F2F4F9', '<path d="M34 18 h52 v14 l-22 28 l22 28 v14 h-52 v-14 l22 -28 l-22 -28 z"/>')}
  ${f(YELLOW, '<path d="M42 78 h36 v14 h-36 z"/>')}`)

const working = icon(`
  ${drop(60, 100, 46, 4)}
  ${f('url(#wk)', '<rect x="20" y="30" width="80" height="50" rx="5"/>')}
  ${f('url(#wkS)', '<rect x="27" y="37" width="66" height="36" rx="3"/>')}
  ${gloss('<path d="M31 39 h12 l-10 32 h-6 z"/>', 0.4)}
  <path d="M35 46 h30 M35 54 h22 M35 62 h34" stroke="rgba(255,255,255,0.7)" stroke-width="2"/>
  <rect x="27" y="37" width="66" height="36" rx="3" stroke-width="2"/>
  <rect x="20" y="30" width="80" height="50" rx="5"/>
  ${f('url(#wkB)', '<path d="M12 96 h96 l-9 -16 h-78 z"/>')}
  <path d="M12 96 h96 l-9 -16 h-78 z"/>
  ${f('url(#wkSk)', '<circle cx="100" cy="22" r="11"/>')}
  <circle cx="100" cy="22" r="11"/>`,
  volume('wk', '#3E4A5E') + volume('wkS', WATER) + volume('wkB', '#D7DBE3') + volume('wkSk', SKIN))

const resting = icon(`
  ${f(WOOD, '<path d="M20 62 h72 v10 h-72 z"/>')}
  ${f(WOOD, '<path d="M20 34 h12 v28 h-12 z"/>')}
  <path d="M28 72 v22 M84 72 v22"/>
  ${f(SKIN, '<circle cx="48" cy="46" r="11"/>')}
  ${f(RED, '<path d="M40 62 h40 v-8 a12 12 0 0 0 -24 0 z"/>')}`)

const studying = icon(`
  ${drop(60, 96, 40, 4)}
  ${f('url(#stB)', '<path d="M22 50 q19 -10 38 0 v38 q-19 -10 -38 0 z"/><path d="M98 50 q-19 -10 -38 0 v38 q19 -10 38 0 z"/>')}
  ${shade('<path d="M60 50 q19 -10 38 0 v38 q-19 -10 -38 0 z"/>', 0.07)}
  <path d="M30 62 h22 M30 72 h22 M68 62 h22 M68 72 h22" stroke="rgba(60,72,96,0.4)" stroke-width="2"/>
  <path d="M22 50 q19 -10 38 0 v38 q-19 -10 -38 0 z"/><path d="M98 50 q-19 -10 -38 0 v38 q19 -10 38 0 z"/>
  <path d="M60 50 v38"/>
  ${f('url(#stC)', '<path d="M26 30 l34 -14 l34 14 l-34 13 z"/>')}
  <path d="M26 30 l34 -14 l34 14 l-34 13 z"/>
  <path d="M88 33 v14" stroke-width="2.4"/>
  ${f(YELLOW, '<circle cx="88" cy="49" r="4"/>')}`,
  volume('stB', '#F7F8FC') + volume('stC', '#3E4A5E'))

// ─── Родня ───────────────────────────────────────────────────────────────────

const grandmother = icon(`
  ${f('#E6E6EA', '<path d="M34 44 a26 26 0 0 1 52 0 q-26 -12 -52 0 z"/>')}
  ${f(SKIN, '<circle cx="60" cy="48" r="24"/>')}
  <circle cx="51" cy="46" r="3" fill="${INK}"/>
  <circle cx="69" cy="46" r="3" fill="${INK}"/>
  <path d="M52 58 q8 6 16 0"/>
  ${f('#8E6FA8', '<path d="M32 98 v-20 a28 20 0 0 1 56 0 v20 z"/>')}`)

const elderBrother = icon(`
  ${f(SKIN, '<circle cx="42" cy="46" r="16"/><circle cx="84" cy="58" r="11"/>')}
  ${f(WATER, '<path d="M18 98 v-24 a24 20 0 0 1 48 0 v24 z"/>')}
  ${f(LEAF, '<path d="M66 98 v-16 a18 14 0 0 1 36 0 v16 z"/>')}`)

const elderSister = icon(`
  ${f('#8A5A34', '<path d="M28 46 a18 20 0 0 1 36 0 v22 h-36 z"/>')}
  ${f(SKIN, '<circle cx="46" cy="44" r="15"/><circle cx="86" cy="58" r="11"/>')}
  ${f(RED, '<path d="M22 98 v-24 a24 20 0 0 1 48 0 v24 z"/>')}
  ${f(YELLOW, '<path d="M68 98 v-16 a18 14 0 0 1 36 0 v16 z"/>')}`)

// ─── Признаки ────────────────────────────────────────────────────────────────
//
// Прилагательные рисуются только там, где их показывает контраст: большой
// рядом с маленьким, дорогой рядом с дешёвым. Всё остальное («интересный»,
// «известный») картинкой не передать, и мы не пытаемся.

const big = icon(`
  ${f(WATER, '<circle cx="46" cy="60" r="34"/>')}
  ${f(GREY, '<circle cx="92" cy="82" r="12"/>')}
  <path d="M12 26 h68" stroke-dasharray="4 4"/>`)

const small = icon(`
  ${f(GREY, '<circle cx="40" cy="70" r="26"/>')}
  ${f(WATER, '<circle cx="88" cy="80" r="14"/>')}
  <path d="M74 66 h28" stroke-dasharray="4 4"/>`)

const expensive = icon(`
  ${f('#FFFFFF', '<path d="M52 18 h34 a6 6 0 0 1 6 6 v34 l-40 40 l-40 -40 z"/>')}
  <circle cx="76" cy="34" r="6"/>
  ${f(YELLOW, '<circle cx="30" cy="46" r="10"/><circle cx="44" cy="60" r="10"/>')}
  <path d="M96 92 v-26 M88 74 l8 -10 l8 10" stroke="${RED}" stroke-width="5"/>`)

const cheap = icon(`
  ${f('#FFFFFF', '<path d="M52 18 h34 a6 6 0 0 1 6 6 v34 l-40 40 l-40 -40 z"/>')}
  <circle cx="76" cy="34" r="6"/>
  ${f(YELLOW, '<circle cx="34" cy="52" r="10"/>')}
  <path d="M96 66 v26 M88 84 l8 10 l8 -10" stroke="${LEAF}" stroke-width="5"/>`)

const tasty = icon(`
  ${f('#FFFFFF', '<circle cx="56" cy="62" r="28"/>')}
  ${f(MEAT, '<circle cx="56" cy="62" r="15"/>')}
  ${f(YELLOW, '<path d="M88 22 l5 12 l13 1 l-10 9 l3 13 l-11 -7 l-11 7 l3 -13 l-10 -9 l13 -1 z"/>')}
  <path d="M20 96 h72"/>`)

// ─── Погода ──────────────────────────────────────────────────────────────────

const cloud = icon(`
  ${f('#D7DBE3', '<path d="M32 74 a20 20 0 0 1 38 -10 a16 16 0 0 1 14 26 h-48 a16 16 0 0 1 -4 -16 z"/>')}`)

const wind = icon(`
  <path d="M14 44 h52 a12 12 0 1 0 -12 -12" stroke="${WATER}"/>
  <path d="M14 62 h68 a12 12 0 1 1 -12 12" stroke="${WATER}"/>
  <path d="M14 80 h40 a10 10 0 1 0 -10 -10" stroke="${GREY}"/>`)

// ─── Работа, учёба, быт ──────────────────────────────────────────────────────

const news = icon(`
  ${drop(60, 96, 34, 4)}
  ${f('url(#nw)', '<rect x="18" y="26" width="84" height="62" rx="5"/>')}
  ${f('url(#nwH)', '<rect x="26" y="34" width="68" height="14" rx="2"/>')}
  <rect x="26" y="34" width="68" height="14" rx="2" stroke-width="1.8"/>
  ${f(WATER, '<rect x="26" y="54" width="26" height="24" rx="2"/>')}
  <rect x="26" y="54" width="26" height="24" rx="2" stroke-width="1.8"/>
  <path d="M58 56 h36 M58 64 h36 M58 72 h26" stroke-width="1.8" stroke="rgba(60,72,96,0.5)"/>
  <rect x="18" y="26" width="84" height="62" rx="5"/>`,
  volume('nw', '#F7F8FC') + volume('nwH', '#D7DBE3'))

const certificate = icon(`
  ${drop(60, 100, 32, 4)}
  ${f('url(#cr2)', '<rect x="20" y="20" width="80" height="60" rx="5"/>')}
  <rect x="26" y="26" width="68" height="48" rx="3" stroke-width="1.8" stroke="rgba(150,110,20,0.5)"/>
  <path d="M38 40 h44 M38 50 h44 M38 60 h26" stroke-width="2" stroke="rgba(60,72,96,0.45)"/>
  <rect x="20" y="20" width="80" height="60" rx="5"/>
  ${f('url(#cr2S)', '<circle cx="78" cy="76" r="13"/>')}
  <circle cx="78" cy="76" r="13" stroke-width="2.2"/>
  ${f(RED, '<path d="M71 86 l-4 16 l11 -7 l11 7 l-4 -16 z"/>')}
  <path d="M71 86 l-4 16 l11 -7 l11 7 l-4 -16" stroke-width="2.2"/>`,
  volume('cr2', '#FFFFFF') + volume('cr2S', YELLOW))

const client = icon(`
  ${drop(60, 104, 28, 4)}
  ${f('url(#clS)', '<circle cx="60" cy="34" r="16"/>')}
  <circle cx="60" cy="34" r="16"/>
  ${f('url(#clB)', '<path d="M32 102 v-22 a28 20 0 0 1 56 0 v22 z"/>')}
  ${shade('<path d="M74 62 a28 20 0 0 1 14 18 v22 h-14 z"/>', 0.1)}
  <path d="M32 102 v-22 a28 20 0 0 1 56 0 v22 z"/>
  ${f(YELLOW, '<path d="M76 74 h22 l3 24 h-28 z"/>')}
  <path d="M76 74 h22 l3 24 h-28 z M82 74 a6 6 0 0 1 12 0" stroke-width="2.2"/>`,
  volume('clS', SKIN) + volume('clB', WATER))

const boss = icon(`
  ${drop(60, 104, 28, 4)}
  ${f('url(#bsS)', '<circle cx="60" cy="32" r="15"/>')}
  ${f('#3E4A5E', '<path d="M45 28 a15 15 0 0 1 30 0 q-15 -9 -30 0 z"/>')}
  <circle cx="60" cy="32" r="15"/>
  ${f('url(#bsB)', '<path d="M34 102 v-22 a26 20 0 0 1 52 0 v22 z"/>')}
  ${f('#FFFFFF', '<path d="M50 62 l10 10 l10 -10 l6 4 l-16 14 l-16 -14 z"/>')}
  ${f(RED, '<path d="M60 72 l5 6 l-5 20 l-5 -20 z"/>')}
  <path d="M34 102 v-22 a26 20 0 0 1 52 0 v22 z"/>`,
  volume('bsS', SKIN) + volume('bsB', '#3E4A5E'))

const notice = icon(`
  ${drop(60, 104, 34, 4)}
  ${f(WOOD, '<rect x="24" y="94" width="8" height="10"/><rect x="88" y="94" width="8" height="10"/>')}
  ${f('url(#nt)', '<rect x="16" y="22" width="88" height="72" rx="5"/>')}
  ${f('#FFFFFF', '<rect x="26" y="32" width="34" height="26" rx="2"/><rect x="66" y="32" width="28" height="26" rx="2"/><rect x="26" y="64" width="28" height="22" rx="2"/><rect x="60" y="64" width="34" height="22" rx="2"/>')}
  <rect x="26" y="32" width="34" height="26" rx="2" stroke-width="1.8"/><rect x="66" y="32" width="28" height="26" rx="2" stroke-width="1.8"/>
  <rect x="26" y="64" width="28" height="22" rx="2" stroke-width="1.8"/><rect x="60" y="64" width="34" height="22" rx="2" stroke-width="1.8"/>
  ${f(RED, '<circle cx="43" cy="36" r="3"/><circle cx="80" cy="36" r="3"/>')}
  <rect x="16" y="22" width="88" height="72" rx="5"/>`, volume('nt', '#E7EAF1'))

const classroom = icon(`
  ${drop(60, 100, 36, 4)}
  ${f('url(#cls)', '<rect x="16" y="20" width="88" height="52" rx="5"/>')}
  <path d="M28 34 h30 M28 44 h22 M70 34 h22 M70 44 h16" stroke="rgba(255,255,255,0.7)" stroke-width="2.4"/>
  <rect x="16" y="20" width="88" height="52" rx="5"/>
  ${f(WOOD, '<rect x="26" y="80" width="68" height="7" rx="2"/>')}
  <rect x="26" y="80" width="68" height="7" rx="2"/>
  <path d="M34 87 v14 M86 87 v14" stroke-width="3.4"/>
  ${f('url(#clsS)', '<circle cx="46" cy="70" r="8"/><circle cx="74" cy="70" r="8"/>')}
  <circle cx="46" cy="70" r="8"/><circle cx="74" cy="70" r="8"/>`,
  volume('cls', '#2F6D52') + volume('clsS', SKIN))

const change = icon(`
  ${drop(60, 96, 32, 4)}
  ${f('url(#chg)', '<circle cx="40" cy="70" r="20"/>')}
  ${f(tone(YELLOW, -0.18), '<circle cx="40" cy="70" r="13"/>')}
  <circle cx="40" cy="70" r="20"/><circle cx="40" cy="70" r="13" stroke-width="1.8"/>
  ${f('url(#chg)', '<circle cx="74" cy="58" r="22"/>')}
  ${f(tone(YELLOW, -0.18), '<circle cx="74" cy="58" r="14"/>')}
  ${gloss('<path d="M60 46 a22 22 0 0 1 16 -8 a26 26 0 0 0 -12 12 z"/>', 0.6)}
  <circle cx="74" cy="58" r="22"/><circle cx="74" cy="58" r="14" stroke-width="1.8"/>
  <path d="M74 48 v20 M68 54 h12 M68 62 h12" stroke-width="2.2"/>`, volume('chg', YELLOW))

const cup = icon(`
  ${drop(60, 98, 26, 4)}
  ${f('url(#cp)', '<path d="M36 40 h44 v26 a22 22 0 0 1 -44 0 z"/>')}
  ${f(WATER, '<path d="M39 43 h38 v6 a19 5 0 0 1 -38 0 z"/>')}
  ${gloss('<rect x="42" y="52" width="6" height="16" rx="3"/>', 0.75)}
  <path d="M36 40 h44 v26 a22 22 0 0 1 -44 0 z"/>
  <path d="M80 46 h8 a10 10 0 0 1 0 20 h-8"/>
  ${f('#E7EAF1', '<ellipse cx="60" cy="94" rx="30" ry="6"/>')}
  <ellipse cx="60" cy="94" rx="30" ry="6"/>`, volume('cp', '#F4F6FA'))

const sky = icon(`
  ${f('url(#sk)', '<rect x="8" y="16" width="104" height="88" rx="14"/>')}
  ${f('#FFFFFF', '<path d="M28 62 a14 14 0 0 1 26 -7 a11 11 0 0 1 10 18 h-32 a11 11 0 0 1 -4 -11 z"/>')}
  ${f('#FFFFFF', '<path d="M62 44 a11 11 0 0 1 20 -5 a9 9 0 0 1 8 14 h-26 a9 9 0 0 1 -2 -9 z"/>')}
  ${f('url(#skS)', '<circle cx="90" cy="76" r="12"/>')}`,
  volume('sk', '#9CCBE8') + volume('skS', YELLOW))

const market = icon(`
  ${drop(60, 100, 42, 4)}
  ${f('url(#mkt)', '<path d="M18 44 h84 v52 a4 4 0 0 1 -4 4 h-76 a4 4 0 0 1 -4 -4 z"/>')}
  ${f(RED, '<path d="M14 44 h92 l-6 -16 h-80 z"/>')}
  ${f('#FFFFFF', '<path d="M26 44 l4 -16 h12 l-4 16 z M50 44 l4 -16 h12 l-4 16 z M74 44 l4 -16 h12 l-4 16 z"/>')}
  <path d="M14 44 h92 l-6 -16 h-80 z"/>
  ${f(LEAF, '<circle cx="38" cy="66" r="8"/><circle cx="54" cy="66" r="8"/>')}
  ${f(RED, '<circle cx="76" cy="66" r="8"/><circle cx="92" cy="66" r="8"/>')}
  <circle cx="38" cy="66" r="8"/><circle cx="54" cy="66" r="8"/><circle cx="76" cy="66" r="8"/><circle cx="92" cy="66" r="8"/>
  <path d="M18 80 h84" stroke-width="2.4"/>
  <path d="M18 44 h84 v52 a4 4 0 0 1 -4 4 h-76 a4 4 0 0 1 -4 -4 z"/>`, volume('mkt', '#F2F4F9'))

const gift = icon(`
  ${drop(60, 102, 30, 4)}
  ${f('url(#gf)', '<rect x="22" y="46" width="76" height="52" rx="5"/>')}
  ${f('url(#gfL)', '<rect x="22" y="34" width="76" height="16" rx="4"/>')}
  ${f(YELLOW, '<rect x="52" y="34" width="16" height="64"/>')}
  <path d="M60 34 q-18 -22 -26 -4 q10 8 26 4 z M60 34 q18 -22 26 -4 q-10 8 -26 4 z"/>
  ${f(YELLOW, '<path d="M60 34 q-16 -18 -22 -4 q8 6 22 4 z M60 34 q16 -18 22 -4 q-8 6 -22 4 z"/>')}
  <rect x="22" y="46" width="76" height="52" rx="5"/>
  <rect x="22" y="34" width="76" height="16" rx="4"/>
  <path d="M52 50 v48 M68 50 v48" stroke-width="2.2"/>`,
  volume('gf', RED) + volume('gfL', tone(RED, -0.12)))

const vacation = icon(`
  ${f('url(#vcS)', '<rect x="8" y="16" width="104" height="52" rx="12"/>')}
  ${f(YELLOW, '<path d="M8 62 h104 v42 h-104 z"/>')}
  ${f('url(#vc)', '<circle cx="88" cy="34" r="13"/>')}
  ${f(LEAF, '<path d="M40 44 q18 -14 30 -2 q-16 -2 -30 2 z M40 44 q-18 -14 -30 -2 q16 -2 30 2 z M40 44 q10 -18 24 -14 q-14 4 -24 14 z"/>')}
  <path d="M40 44 v40" stroke="${WOOD}" stroke-width="5"/>
  ${f('#FFFFFF', '<path d="M62 82 h34 l-6 14 h-22 z"/>')}
  <path d="M62 82 h34 l-6 14 h-22 z" stroke-width="2.2"/>
  <path d="M8 78 q13 -6 26 0 t26 0" stroke="rgba(200,150,60,0.5)" stroke-width="2"/>`,
  volume('vcS', '#9CCBE8') + volume('vc', YELLOW))

const homework = icon(`
  ${drop(60, 102, 30, 4)}
  ${f('url(#hw)', '<rect x="26" y="16" width="68" height="84" rx="5"/>')}
  ${f('#E7EAF1', '<rect x="26" y="16" width="12" height="84" rx="5"/>')}
  <path d="M48 34 h34 M48 46 h34 M48 58 h34 M48 70 h22" stroke-width="2" stroke="rgba(60,72,96,0.45)"/>
  ${f(LEAF, '<path d="M52 78 l7 9 l16 -18"/>')}
  <path d="M52 78 l7 9 l16 -18" stroke="${LEAF}" stroke-width="4"/>
  <rect x="26" y="16" width="68" height="84" rx="5"/>
  ${f(YELLOW, '<path d="M84 60 l14 -16 l10 9 l-14 16 z"/>')}
  <path d="M84 60 l14 -16 l10 9 l-14 16 l-12 4 z" stroke-width="2.2"/>`, volume('hw', '#FFFFFF'))

// ─── Карта: русское значение → картинка ──────────────────────────────────────
//
// Ключ нормализуется как в vocabImage(): нижний регистр, до первой запятой,
// точки с запятой или скобки. Синонимы перечисляются отдельными ключами —
// в разных курсах одно и то же значение переведено по-разному.

const IMAGES: Record<string, string> = {
  // еда и напитки
  'молоко': milk, 'вода': water, 'кофе': coffee, 'чай': tea, 'хлеб': bread,
  'рис': rice, 'мясо': meat, 'рыба': fish, 'яблоко': apple, 'сок': juice,
  'пиво': beer, 'мороженое': iceCream, 'еда': rice, 'обед': rice, 'завтрак': bread,
  // животные
  'кот': cat, 'кошка': cat, 'собака': dog, 'пёсик': dog, 'птица': bird,
  'мышь': mouse, 'лошадь': horse,
  // дом и предметы
  'дом': house, 'стол': table, 'стул': chair, 'сумка': bag, 'книга': book,
  'газета': newspaper, 'письмо': letter, 'часы': clock, 'окно': window_,
  'ключ': key, 'телефон': phone, 'телевизор': tv, 'компьютер': computer,
  'зонт': umbrella, 'мяч': ball, 'фотография': photo, 'фото': photo,
  'деньги': money, 'кровать': bed, 'цветок': flower,
  // места
  'школа': school, 'магазин': shop, 'кафе': cafe, 'ресторан': restaurant,
  'больница': hospital, 'парк': park, 'город': city, 'улица': street,
  // транспорт
  'машина': car, 'автомобиль': car, 'автобус': bus, 'поезд': train,
  'метро': metro, 'такси': taxi, 'велосипед': bicycle, 'самолёт': plane,
  // природа
  'дерево': tree, 'море': sea, 'гора': mountain, 'река': river,
  'дождь': rain, 'снег': snow, 'огонь': fire, 'солнце': sun, 'погода': sun,
  // человек
  'голова': head, 'нога': leg, 'рука': hand, 'глаз': eye, 'ухо': ear,
  'сердце': heart, 'семья': family, 'друг': friend, 'учитель': teacher,
  'студент': student, 'ученик': student, 'ребёнок': child,
  // время суток
  'утро': morning, 'вечер': evening, 'ночь': night,
  // учёба, дела, поездки
  'комната': room, 'дверь': door, 'одежда': clothes, 'обувь': shoe,
  'фильм': film, 'кино': film, 'музыка': music, 'песня': song,
  'библиотека': library, 'станция': station, 'вокзал': station,
  'карта города': map, 'чек': bill, 'счёт': bill, 'тетрадь': notebook,
  'карандаш': pencil, 'ручка': pencil, 'чемодан': suitcase, 'поездка': suitcase,
  'путешествие': suitcase, 'календарь': calendar, 'план': calendar,
  'готовить': cooking, 'кухня': cooking, 'водить машину': driving,
  'экзамен': exam, 'тест': exam, 'аптека': pharmacy, 'банк': bank,
  'почта': post, 'гостиница': hotel, 'отель': hotel, 'пляж': beach,
  'лес': forest, 'компания': office, 'фирма': office, 'офис': office,
  // синонимы к уже нарисованному
  'наличные': money, 'пакет': bag, 'сумка-пакет': bag, 'квартира': house,
  'сотовый': phone, 'мобильный': phone, 'пёс': dog, 'кошечка': cat,
  // действия
  'спать': sleeping, 'писать': writing, 'читать': reading,
  'смотреть': watching, 'слушать': listening, 'есть': eating, 'кушать': eating,
  'пить': drinking, 'идти': walking, 'ходить': walking, 'гулять': walking,
  'бежать': running, 'бегать': running, 'играть': playing,
  'покупать': buying, 'покупки': buying, 'ждать': waiting,
  'работать': working, 'работа': working, 'отдыхать': resting,
  'учиться': studying, 'учить': studying, 'заниматься': studying,
  // родня
  'бабушка': grandmother, 'старший брат': elderBrother,
  'старшая сестра': elderSister, 'старший': elderBrother,
  // признаки
  'большой': big, 'маленький': small, 'дорогой': expensive,
  'дешёвый': cheap, 'вкусный': tasty,
  // погода
  'облако': cloud, 'ветер': wind, 'небо': sky,
  // работа, учёба, быт
  'новости': news, 'сертификат': certificate, 'диплом': certificate,
  'клиент': client, 'покупатель': client, 'начальник отдела': boss,
  'начальник': boss, 'директор': boss, 'объявление': notice,
  'занятие': classroom, 'урок': classroom, 'монета': change, 'мелочь': change,
  'чашка': cup, 'рынок': market, 'подарок': gift, 'отпуск': vacation,
  'каникулы': vacation, 'домашнее задание': homework, 'домашка': homework,
}

/** Значение слова → ключ карты: «кот, кошка» и «нога; мост» дают «кот», «нога». */
function normalizeMeaning(ru: string): string {
  return ru.toLowerCase().split(/[,;(]/)[0].trim()
}

/**
 * Картинка для словарной карточки по русскому значению слова.
 *
 * Undefined — это норма, а не пропуск: у «следовательно» и «влияния» картинки
 * быть не может, и карточка останется текстовой.
 */
export function vocabImage(ru: string): string | undefined {
  return IMAGES[normalizeMeaning(ru)]
}

/** Сколько понятий нарисовано — для проверок и отчётов. */
export const VOCAB_IMAGE_COUNT = new Set(Object.values(IMAGES)).size
