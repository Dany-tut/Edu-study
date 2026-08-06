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

/** Лист карточки: белый квадрат со скруглением, внутри — рисунок. */
function icon(body: string): string {
  return toDataUri(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" font-family="${FONT}">
    <rect width="${S}" height="${S}" rx="16" fill="#FFFFFF"/>
    <g fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g>
  </svg>`)
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
  ${f('#FFFFFF', '<path d="M42 44 h36 v46 a6 6 0 0 1 -6 6 h-24 a6 6 0 0 1 -6 -6 z"/>')}
  <path d="M42 44 l10 -18 h16 l10 18"/>
  <path d="M42 62 h36"/>`)

const water = icon(`
  ${f(WATER, '<path d="M60 22 C 40 50, 32 60, 32 72 a28 28 0 0 0 56 0 c0 -12 -8 -22 -28 -50 z"/>')}`)

const coffee = icon(`
  ${f('#FFFFFF', '<path d="M32 44 h48 v26 a24 24 0 0 1 -48 0 z"/>')}
  <path d="M80 50 h8 a10 10 0 0 1 0 20 h-8"/>
  <path d="M46 26 q6 8 0 14 M60 24 q6 8 0 14 M74 26 q6 8 0 14"/>
  <path d="M28 96 h64"/>`)

const tea = icon(`
  ${f('#FFFFFF', '<path d="M34 46 h44 v22 a22 22 0 0 1 -44 0 z"/>')}
  <path d="M78 52 h8 a9 9 0 0 1 0 18 h-8"/>
  ${f('#8A6A4B', '<rect x="52" y="24" width="16" height="14" rx="2"/>')}
  <path d="M60 38 v8"/>
  <path d="M30 96 h60"/>`)

const bread = icon(`
  ${f(WOOD, '<path d="M28 56 q4 -20 32 -20 t32 20 v22 a8 8 0 0 1 -8 8 h-48 a8 8 0 0 1 -8 -8 z"/>')}
  <path d="M44 40 q6 12 0 22 M60 36 q6 14 0 26 M76 40 q6 12 0 22"/>`)

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
  ${f(WATER, '<path d="M22 60 q22 -26 48 0 q-26 26 -48 0 z"/>')}
  ${f(WATER, '<path d="M70 60 l22 -16 v32 z"/>')}
  <circle cx="38" cy="54" r="3" fill="${INK}"/>`)

const apple = icon(`
  ${f(RED, '<path d="M60 40 c-16 -12 -34 2 -30 22 c3 16 14 30 22 30 c4 0 6 -2 8 -2 s4 2 8 2 c8 0 19 -14 22 -30 c4 -20 -14 -34 -30 -22 z"/>')}
  <path d="M60 40 v-12" />
  ${f(LEAF, '<path d="M60 30 q14 -12 20 0 q-14 10 -20 0 z"/>')}`)

const juice = icon(`
  ${f('#F5A623', '<path d="M40 40 h40 l-6 52 a8 8 0 0 1 -8 6 h-12 a8 8 0 0 1 -8 -6 z"/>')}
  <path d="M56 40 v-14 h22"/>`)

const beer = icon(`
  ${f('#F2C14E', '<path d="M34 42 h38 v50 a6 6 0 0 1 -6 6 h-26 a6 6 0 0 1 -6 -6 z"/>')}
  ${f('#FFFFFF', '<path d="M34 42 q8 -12 20 -6 q12 -8 18 6 z"/>')}
  <path d="M72 52 h12 a8 8 0 0 1 0 20 h-12"/>`)

const iceCream = icon(`
  ${f('#F6D7E0', '<path d="M60 22 a22 22 0 0 1 22 22 h-44 a22 22 0 0 1 22 -22 z"/>')}
  ${f(WOOD, '<path d="M38 46 h44 l-22 52 z"/>')}
  <path d="M48 62 l24 0 M52 74 l16 0"/>`)

// ─── Животные ────────────────────────────────────────────────────────────────

const cat = icon(`
  ${f('#D9C48A', '<circle cx="60" cy="62" r="26"/>')}
  ${f('#D9C48A', '<path d="M40 44 l-4 -20 l18 10 z M80 44 l4 -20 l-18 10 z"/>')}
  <circle cx="51" cy="58" r="3" fill="${INK}"/>
  <circle cx="69" cy="58" r="3" fill="${INK}"/>
  <path d="M60 66 l-4 4 h8 z" fill="${INK}" stroke="none"/>
  <path d="M60 70 v4 M52 76 q8 6 16 0"/>
  <path d="M30 62 h12 M78 62 h12"/>`)

const dog = icon(`
  ${f('#C98B54', '<circle cx="60" cy="64" r="25"/>')}
  ${f('#8A5A34', '<path d="M35 48 q-10 6 -6 26 q10 4 14 -12 z M85 48 q10 6 6 26 q-10 4 -14 -12 z"/>')}
  <circle cx="51" cy="60" r="3" fill="${INK}"/>
  <circle cx="69" cy="60" r="3" fill="${INK}"/>
  ${f(INK, '<ellipse cx="60" cy="72" rx="6" ry="4"/>')}
  <path d="M60 76 v5 M52 82 q8 6 16 0"/>`)

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
  ${f('#F2F4F9', '<path d="M24 60 l36 -30 l36 30 v34 a4 4 0 0 1 -4 4 h-64 a4 4 0 0 1 -4 -4 z"/>')}
  ${f(RED, '<path d="M18 62 l42 -34 l42 34 z"/>')}
  ${f(WATER, '<rect x="50" y="66" width="20" height="32" rx="2"/>')}`)

const table = icon(`
  ${f(WOOD, '<rect x="20" y="44" width="80" height="10" rx="3"/>')}
  <path d="M30 54 v40 M90 54 v40"/>`)

const chair = icon(`
  ${f(WOOD, '<rect x="38" y="20" width="12" height="50" rx="3"/>')}
  ${f(WOOD, '<rect x="38" y="62" width="46" height="10" rx="3"/>')}
  <path d="M44 72 v24 M80 72 v24"/>`)

const bag = icon(`
  ${f('#6E7BA8', '<path d="M30 48 h60 l6 46 a6 6 0 0 1 -6 6 h-60 a6 6 0 0 1 -6 -6 z"/>')}
  <path d="M44 48 a16 16 0 0 1 32 0"/>`)

const book = icon(`
  ${f('#F2F4F9', '<path d="M22 32 q20 -8 38 0 v58 q-18 -8 -38 0 z"/><path d="M98 32 q-20 -8 -38 0 v58 q18 -8 38 0 z"/>')}
  <path d="M60 32 v58"/>`)

const newspaper = icon(`
  ${f('#F2F4F9', '<rect x="22" y="30" width="70" height="60" rx="4"/>')}
  <path d="M32 44 h28 M32 56 h28 M32 68 h28 M70 44 h14 M70 56 h14 M70 68 h14 M32 80 h52"/>`)

const letter = icon(`
  ${f('#FFFFFF', '<rect x="20" y="36" width="80" height="52" rx="6"/>')}
  <path d="M20 42 l40 30 l40 -30"/>`)

const clock = icon(`
  ${f('#FFFFFF', '<circle cx="60" cy="60" r="34"/>')}
  <path d="M60 38 v22 l16 10"/>`)

const window_ = icon(`
  ${f(WATER, '<rect x="26" y="24" width="68" height="72" rx="4"/>')}
  <path d="M60 24 v72 M26 60 h68"/>`)

const key = icon(`
  ${f(YELLOW, '<circle cx="40" cy="46" r="22"/>')}
  ${f('#FFFFFF', '<circle cx="40" cy="46" r="9"/>')}
  ${f(YELLOW, '<path d="M52 60 l38 38 h-14 v-10 h-10 v-10 h-10 z"/>')}`)

const phone = icon(`
  ${f('#F2F4F9', '<rect x="40" y="18" width="40" height="84" rx="8"/>')}
  <path d="M52 28 h16"/>
  <circle cx="60" cy="92" r="3"/>`)

const tv = icon(`
  ${f('#F2F4F9', '<rect x="18" y="30" width="84" height="54" rx="6"/>')}
  <path d="M46 96 h28 M60 84 v12"/>`)

const computer = icon(`
  ${f('#F2F4F9', '<rect x="20" y="28" width="80" height="52" rx="5"/>')}
  <path d="M14 92 h92 l-8 -12 h-76 z"/>`)

const umbrella = icon(`
  ${f(RED, '<path d="M16 60 a44 34 0 0 1 88 0 z"/>')}
  <path d="M60 60 v32 a10 10 0 0 0 20 0"/>`)

const ball = icon(`
  ${f('#FFFFFF', '<circle cx="60" cy="60" r="36"/>')}
  ${f(INK, '<path d="M60 40 l17 12 l-6 20 h-22 l-6 -20 z"/>')}
  <path d="M60 24 v16 M24 52 l19 14 M96 52 l-19 14 M40 92 l9 -20 M80 92 l-9 -20"/>`)

const photo = icon(`
  ${f('#FFFFFF', '<rect x="20" y="28" width="80" height="64" rx="5"/>')}
  ${f(LEAF, '<path d="M28 80 l20 -24 l16 18 l12 -12 l16 18 z"/>')}
  ${f(YELLOW, '<circle cx="76" cy="46" r="7"/>')}`)

const money = icon(`
  ${f('#CFE8CF', '<rect x="16" y="38" width="88" height="46" rx="6"/>')}
  ${f('#FFFFFF', '<circle cx="60" cy="61" r="14"/>')}
  <path d="M60 50 v22 M54 56 h12 M54 66 h12"/>`)

const bed = icon(`
  ${f('#F2F4F9', '<path d="M20 56 h80 v30 h-80 z"/>')}
  ${f('#FFFFFF', '<rect x="28" y="44" width="26" height="14" rx="4"/>')}
  <path d="M20 86 v10 M100 86 v10 M20 56 v-16"/>`)

const flower = icon(`
  ${f(RED, '<circle cx="60" cy="42" r="12"/><circle cx="42" cy="54" r="12"/><circle cx="78" cy="54" r="12"/><circle cx="50" cy="72" r="12"/><circle cx="70" cy="72" r="12"/>')}
  ${f(YELLOW, '<circle cx="60" cy="58" r="9"/>')}
  <path d="M60 76 v24"/>`)

// ─── Места ───────────────────────────────────────────────────────────────────

const school = icon(`
  ${f('#F2F4F9', '<rect x="20" y="46" width="80" height="50" rx="4"/>')}
  ${f(RED, '<path d="M14 48 l46 -26 l46 26 z"/>')}
  ${f(WATER, '<rect x="34" y="62" width="16" height="16" rx="2"/><rect x="70" y="62" width="16" height="16" rx="2"/>')}
  <path d="M52 96 v-18 h16 v18"/>`)

const shop = icon(`
  ${f('#F2F4F9', '<rect x="20" y="48" width="80" height="48" rx="4"/>')}
  ${f(RED, '<path d="M16 48 h88 l-8 -18 h-72 z"/>')}
  ${f(WATER, '<rect x="52" y="66" width="24" height="30" rx="2"/>')}
  <path d="M30 66 h14"/>`)

const cafe = icon(`
  ${f('#F2F4F9', '<rect x="20" y="44" width="80" height="54" rx="5"/>')}
  ${f(WOOD, '<path d="M16 44 h88 l-8 -16 h-72 z"/>')}
  ${f('#FFFFFF', '<path d="M46 60 h26 v14 a13 13 0 0 1 -26 0 z"/>')}
  <path d="M72 64 h6 a7 7 0 0 1 0 14 h-6"/>
  <path d="M42 88 h38"/>`)

const restaurant = icon(`
  <path d="M40 22 v40 a10 10 0 0 0 20 0 v-40 M50 22 v26"/>
  <path d="M84 22 q10 10 0 26 q-10 -16 0 -26 z"/>
  <path d="M84 48 v50 M50 62 v36"/>`)

const hospital = icon(`
  ${f('#F2F4F9', '<rect x="24" y="30" width="72" height="66" rx="6"/>')}
  ${f(RED, '<path d="M52 44 h16 v14 h14 v16 h-14 v14 h-16 v-14 h-14 v-16 h14 z"/>')}`)

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
  ${f(RED, '<path d="M18 74 v-12 l12 -18 h48 l16 18 h8 v12 z"/>')}
  ${f(WATER, '<path d="M36 58 l6 -10 h30 l8 10 z"/>')}
  <circle cx="38" cy="78" r="9" fill="${INK}"/>
  <circle cx="82" cy="78" r="9" fill="${INK}"/>`)

const bus = icon(`
  ${f(YELLOW, '<rect x="16" y="30" width="88" height="48" rx="8"/>')}
  ${f(WATER, '<rect x="24" y="38" width="20" height="18" rx="2"/><rect x="50" y="38" width="20" height="18" rx="2"/><rect x="76" y="38" width="20" height="18" rx="2"/>')}
  <circle cx="36" cy="84" r="8" fill="${INK}"/>
  <circle cx="84" cy="84" r="8" fill="${INK}"/>`)

const train = icon(`
  ${f(WATER, '<rect x="24" y="22" width="72" height="60" rx="10"/>')}
  ${f('#FFFFFF', '<rect x="34" y="34" width="24" height="20" rx="3"/><rect x="62" y="34" width="24" height="20" rx="3"/>')}
  <circle cx="42" cy="68" r="4" fill="${INK}"/>
  <circle cx="78" cy="68" r="4" fill="${INK}"/>
  <path d="M34 82 l-10 14 M86 82 l10 14 M24 92 h72"/>`)

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
  ${f(LEAF, '<circle cx="60" cy="46" r="28"/>')}
  ${f(WOOD, '<rect x="52" y="66" width="16" height="34" rx="3"/>')}`)

const sea = icon(`
  ${f(WATER, '<path d="M8 56 h104 v42 h-104 z"/>')}
  <path d="M8 62 q13 -8 26 0 t26 0 t26 0 t26 0"/>
  <path d="M8 78 q13 -8 26 0 t26 0 t26 0 t26 0"/>
  ${f(YELLOW, '<circle cx="88" cy="32" r="14"/>')}`)

const mountain = icon(`
  ${f('#A9B4C4', '<path d="M8 92 l30 -52 l20 30 l14 -22 l40 44 z"/>')}
  ${f('#FFFFFF', '<path d="M38 40 l10 18 h-20 z"/>')}`)

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
  ${f(SKIN, '<circle cx="60" cy="58" r="38"/>')}
  ${f('#5A4632', '<path d="M22 54 a38 38 0 0 1 76 0 q-38 -20 -76 0 z"/>')}
  <circle cx="46" cy="58" r="4" fill="${INK}"/>
  <circle cx="74" cy="58" r="4" fill="${INK}"/>
  <path d="M60 62 v10 M48 80 q12 8 24 0"/>
  <path d="M22 60 q-8 6 0 12 M98 60 q8 6 0 12"/>`)

const leg = icon(`
  ${f(SKIN, '<path d="M46 16 h24 v34 q0 20 -6 32 l-4 20 h-20 l6 -24 q4 -14 0 -28 z"/>')}
  ${f(INK, '<path d="M40 96 h26 v10 h-32 q-4 0 -4 -5 z"/>')}`)

const hand = icon(`
  ${f(SKIN, '<path d="M42 100 v-30 l-10 -14 a6 6 0 0 1 9 -8 l7 8 v-40 a6 6 0 0 1 12 0 v30 v-34 a6 6 0 0 1 12 0 v34 v-28 a6 6 0 0 1 12 0 v28 v-18 a6 6 0 0 1 12 0 v56 q0 16 -14 16 z"/>')}`)

const eye = icon(`
  ${f('#FFFFFF', '<path d="M12 60 q48 -40 96 0 q-48 40 -96 0 z"/>')}
  ${f(WATER, '<circle cx="60" cy="60" r="16"/>')}
  ${f(INK, '<circle cx="60" cy="60" r="7"/>')}`)

const ear = icon(`
  ${f(SKIN, '<path d="M44 24 a28 28 0 0 1 34 44 q-12 12 -10 24 a12 12 0 0 1 -22 6 q-10 -20 -10 -46 z"/>')}
  <path d="M56 44 a12 12 0 0 1 14 18 q-8 8 -6 16"/>`)

const heart = icon(`
  ${f(RED, '<path d="M60 96 C 20 68, 16 44, 32 32 c12 -9 24 -2 28 8 c4 -10 16 -17 28 -8 c16 12 12 36 -28 64 z"/>')}`)

const family = icon(`
  ${f(SKIN, '<circle cx="38" cy="40" r="13"/><circle cx="82" cy="40" r="13"/><circle cx="60" cy="60" r="10"/>')}
  ${f(WATER, '<path d="M20 96 v-22 a18 18 0 0 1 36 0 v22 z"/>')}
  ${f(RED, '<path d="M64 96 v-22 a18 18 0 0 1 36 0 v22 z"/>')}
  ${f(YELLOW, '<path d="M48 96 v-16 a12 12 0 0 1 24 0 v16 z"/>')}`)

const friend = icon(`
  ${f(SKIN, '<circle cx="42" cy="38" r="14"/><circle cx="80" cy="38" r="14"/>')}
  ${f(WATER, '<path d="M18 96 v-22 a24 20 0 0 1 48 0 v22 z"/>')}
  ${f(LEAF, '<path d="M56 96 v-22 a24 20 0 0 1 48 0 v22 z"/>')}`)

const teacher = icon(`
  ${f('#3E4A5E', '<rect x="18" y="18" width="52" height="42" rx="4"/>')}
  <path d="M28 32 h30 M28 44 h20" stroke="#FFFFFF"/>
  ${f(SKIN, '<circle cx="86" cy="44" r="12"/>')}
  ${f(RED, '<path d="M70 96 v-20 a16 16 0 0 1 32 0 v20 z"/>')}`)

const student = icon(`
  ${f(SKIN, '<circle cx="60" cy="42" r="15"/>')}
  ${f(INK, '<path d="M28 34 l32 -14 l32 14 l-32 12 z"/>')}
  ${f(WATER, '<path d="M32 98 v-24 a28 22 0 0 1 56 0 v24 z"/>')}`)

const child = icon(`
  ${f(SKIN, '<circle cx="60" cy="40" r="18"/>')}
  <circle cx="53" cy="40" r="2.6" fill="${INK}"/>
  <circle cx="67" cy="40" r="2.6" fill="${INK}"/>
  <path d="M54 48 q6 5 12 0"/>
  ${f(YELLOW, '<path d="M36 98 v-20 a24 18 0 0 1 48 0 v20 z"/>')}`)

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
  ${f(WOOD, '<rect x="30" y="16" width="60" height="88" rx="4"/>')}
  ${f('#FFFFFF', '<circle cx="76" cy="62" r="4"/>')}
  <path d="M40 26 h40 v30 h-40 z"/>`)

const clothes = icon(`
  ${f(WATER, '<path d="M40 30 l20 8 l20 -8 l24 16 l-12 18 l-8 -6 v40 h-48 v-40 l-8 6 l-12 -18 z"/>')}`)

const shoe = icon(`
  ${f('#5B6A82', '<path d="M18 76 v-24 h22 l14 12 h26 a22 12 0 0 1 22 12 v6 a4 4 0 0 1 -4 4 h-76 a4 4 0 0 1 -4 -4 z"/>')}
  <path d="M40 52 l8 8 M52 56 l6 6"/>`)

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
  ${f('#F2F4F9', '<rect x="18" y="26" width="84" height="70" rx="5"/>')}
  ${f(RED, '<rect x="28" y="36" width="12" height="24"/>')}
  ${f(WATER, '<rect x="44" y="36" width="12" height="24"/>')}
  ${f(LEAF, '<rect x="60" y="36" width="12" height="24"/>')}
  ${f(YELLOW, '<rect x="76" y="36" width="12" height="24"/>')}
  <path d="M28 68 h60 M28 82 h60"/>`)

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
  ${f('#F2F4F9', '<rect x="24" y="30" width="72" height="66" rx="6"/>')}
  ${f(LEAF, '<path d="M52 44 h16 v14 h14 v16 h-14 v14 h-16 v-14 h-14 v-16 h14 z"/>')}`)

const bank = icon(`
  ${f('#F2F4F9', '<rect x="22" y="46" width="76" height="44"/>')}
  <path d="M14 46 l46 -26 l46 26 z"/>
  <path d="M36 56 v26 M58 56 v26 M84 56 v26 M14 96 h92"/>`)

const post = icon(`
  ${f(RED, '<rect x="30" y="30" width="60" height="52" rx="8"/>')}
  ${f('#FFFFFF', '<rect x="44" y="42" width="32" height="8" rx="2"/>')}
  <path d="M60 82 v18"/>`)

const hotel = icon(`
  ${f('#F2F4F9', '<rect x="22" y="22" width="76" height="76" rx="5"/>')}
  ${f(WATER, '<rect x="34" y="34" width="16" height="16"/><rect x="58" y="34" width="16" height="16"/><rect x="34" y="58" width="16" height="16"/><rect x="58" y="58" width="16" height="16"/>')}
  ${f(WOOD, '<rect x="80" y="66" width="14" height="32" rx="2"/>')}`)

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
