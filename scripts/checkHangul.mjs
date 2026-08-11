// Проверка данных алфавита: состав слогов, порядок уроков, покрытие букв.
//
// ЗАЧЕМ. src/data/hangul.ts — таблица на сорок букв с чертами, примерами и
// порядком уроков. Ошибка в ней не падает и не подсвечивается: урок просто
// покажет ученику слово с буквой, которой его ещё не учили, или пример, где
// нужной буквы вообще нет. Тихая ошибка в учебных данных дороже упавшей сборки.
//
// ЧТО ПРОВЕРЯЕМ: разбор и сборку всех 11 172 слогов хангыля, состав конкретных
// слов, правило патчхима, монотонность уроков (слово не может содержать букву
// из будущего урока), честность примеров, границы координат черт и то, что у
// каждой буквы хватает похожих для дистракторов.
//
// Запуск: node scripts/checkHangul.mjs
import {
  CHAMO, ALL_CHAMO, HANGUL_LESSONS, CHAMO_ORDER, INITIALS, VOWELS, FINALS,
  splitSyllable, joinSyllable, chamoOf, keysOf, partsOfWord, endsWithFinal,
  strokePath, confusableWith,
} from '../src/data/hangul.ts'

let bad = 0
const fail = (msg) => { console.log('  ✗', msg); bad++ }

// 1. Все 40 букв алфавита описаны.
const letters = new Set([...INITIALS, ...VOWELS])
console.log('Букв в CHAMO:', ALL_CHAMO.length, '| ожидается 40')
if (ALL_CHAMO.length !== 40) fail(`в CHAMO ${ALL_CHAMO.length} букв, а не 40`)
for (const l of letters) if (!CHAMO[l]) fail(`нет описания буквы ${l}`)

// 2. Round-trip по всему блоку слогов.
let rt = 0
for (let c = 0xac00; c <= 0xd7a3; c++) {
  const ch = String.fromCodePoint(c)
  const p = splitSyllable(ch)
  if (!p) { fail(`${ch} не разобрался`); break }
  if (joinSyllable(p.initial, p.vowel, p.final) !== ch) { fail(`${ch} не собрался обратно`); break }
  rt++
}
console.log('Слогов проверено round-trip:', rt)

// 3. Разбор конкретных слов.
const cases = [
  ['김', ['ㄱ', 'ㅣ', 'ㅁ']],
  ['치', ['ㅊ', 'ㅣ']],
  ['과', ['ㄱ', 'ㅘ']],
  ['앉', ['ㅇ', 'ㅏ', 'ㄵ']],
  ['빵', ['ㅃ', 'ㅏ', 'ㅇ']],
]
for (const [ch, want] of cases) {
  const got = chamoOf(ch)
  if (got.join('') !== want.join('')) fail(`chamoOf(${ch}) = ${got.join(' ')}, ожидалось ${want.join(' ')}`)
}
console.log('keysOf(꽈) =', keysOf('꽈').join(' '), '| ожидается ㄱ ㄱ ㅗ ㅏ')
if (keysOf('꽈').join('') !== 'ㄱㄱㅗㅏ') fail('keysOf(꽈) неверен')
console.log('keysOf(빵) =', keysOf('빵').join(' '))
console.log('partsOfWord(김치) =', JSON.stringify(partsOfWord('김치')))

// 4. Правило 이에요/예요 — по патчхиму последнего слога.
for (const [w, want] of [['김치', false], ['핸드폰', true], ['두부', false], ['볼펜', true]]) {
  if (endsWithFinal(w) !== want) fail(`endsWithFinal(${w}) = ${!want}`)
}

// 5. Уроки: слово не может содержать букву, которая ещё не введена.
const seen = new Set()
HANGUL_LESSONS.forEach((les, i) => {
  les.chamo.forEach(c => {
    if (!CHAMO[c]) fail(`урок ${i + 1}: неизвестная буква ${c}`)
    if (seen.has(c)) fail(`урок ${i + 1}: буква ${c} вводится второй раз`)
    seen.add(c)
  })
  for (const w of les.words) {
    for (const ch of chamoOf(w.ko) .concat([...w.ko].flatMap(chamoOf))) {
      if (!seen.has(ch) && CHAMO[ch]) fail(`урок ${i + 1}: в слове ${w.ko} (${w.ru}) буква ${ch} ещё не введена`)
    }
  }
})
console.log('Букв введено уроками:', seen.size, '| CHAMO_ORDER:', CHAMO_ORDER.length)
for (const l of letters) if (!seen.has(l)) fail(`буква ${l} не вводится ни одним уроком`)

// 6. Примеры у букв — настоящие слова, содержащие эту букву.
for (const c of ALL_CHAMO) {
  for (const ex of c.examples) {
    const inWord = [...ex].flatMap(chamoOf)
    const keys = [...ex].flatMap(keysOf)
    if (!inWord.includes(c.ch) && !keys.includes(c.ch)) fail(`${c.ch}: пример ${ex} не содержит эту букву`)
  }
}

// 7. Черты: у каждой буквы есть хотя бы одна, все точки внутри 0..100.
for (const c of ALL_CHAMO) {
  if (!c.strokes.length) fail(`${c.ch}: нет черт`)
  for (const s of c.strokes) {
    if (s.pts.length < 2) fail(`${c.ch}: черта из ${s.pts.length} точек`)
    for (const [x, y] of s.pts) {
      if (x < 0 || x > 100 || y < 0 || y > 100) fail(`${c.ch}: точка ${x},${y} вне квадрата`)
    }
  }
}
const strokeCounts = Object.fromEntries(ALL_CHAMO.map(c => [c.ch, c.strokes.length]))
console.log('Черт по буквам:', JSON.stringify(strokeCounts))
console.log('path(ㄱ) =', strokePath(CHAMO['ㄱ'].strokes[0]))
console.log('path(ㅇ) =', strokePath(CHAMO['ㅇ'].strokes[0]).slice(0, 80), '…')

// 8. Дистракторы: всегда того же рода и в нужном количестве.
for (const c of ALL_CHAMO) {
  const d = confusableWith(c.ch, 3)
  if (d.length !== 3) fail(`${c.ch}: дистракторов ${d.length}, а не 3`)
  if (d.includes(c.ch)) fail(`${c.ch}: сама буква попала в дистракторы`)
  for (const x of d) if (CHAMO[x].kind !== c.kind) fail(`${c.ch}: дистрактор ${x} другого рода`)
}



// ─────────────────────────────────────────────────────────────────────────────
// Часть 2. Курс, собранный из этих данных
//
// ЗАЧЕМ ОТДЕЛЬНО. Данные могут быть безупречны, а курс из них — кривым: две
// дыры уже были найдены руками, и обе молчали. В курсе не оказалось ни одного
// задания на слух (звук → буква тренировался только в одну сторону), а буквы
// не попадали в карточки знакомства — урок начинался с вопроса о букве,
// которую ученику не показали. Ни то, ни другое не роняет сборку и не видно в
// типах: заметить это можно, только пересчитав собранный курс.
//
// ПОЧЕМУ ЧЕРЕЗ esbuild. koreanHangul.ts тянет за собой картинки, гнёзда
// созвучий и схемы конспекта — и всё это импортируется без расширений, как
// принято в Vite. Node такие пути не разрешает, поэтому модуль сначала
// собирается в один файл, а потом импортируется.
// ─────────────────────────────────────────────────────────────────────────────

import { build } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'hangul-'))
const bundle = join(dir, 'course.mjs')
await build({
  entryPoints: ['src/data/koreanHangul.ts'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: bundle, logLevel: 'silent',
})
const { buildKoreanHangulCourse } = await import(`file://${bundle}`)
const course = buildKoreanHangulCourse('check')
rmSync(dir, { recursive: true, force: true })

console.log('\nКурс «Корейский с нуля: хангыль»')
const lessons = course.lessons
console.log('Уроков:', lessons.length)

const introducedSoFar = new Set()
let mp = 0
lessons.forEach((lesson, li) => {
  const tasks = lesson.hwTasks ?? []
  const cards = tasks.filter(t => t.type === 'flashcard')
  const introduced = new Set(cards.map(t => t.front))
  const lessonChamo = HANGUL_LESSONS[li].chamo
  lessonChamo.forEach(c => introducedSoFar.add(c))

  // 1. Буква урока обязана быть карточкой знакомства — иначе первый вопрос о
  //    ней задаётся раньше, чем её показали.
  for (const c of lessonChamo) {
    if (!introduced.has(c)) fail(`урок ${li + 1}: буква ${c} не введена карточкой`)
  }

  for (const t of tasks) {
    // 2. Варианты выбора не должны повторяться: одинаковые «о» и «о», один из
    //    которых неверен, — это угадайка, а не узнавание.
    if (t.type === 'single') {
      const ch = t.choices ?? []
      if (new Set(ch).size !== ch.length) fail(`урок ${li + 1}: «${t.question}» — одинаковые варианты [${ch.join(', ')}]`)
    }
    // 3. Минимальная пара из двух одинаковых слогов не различима в принципе.
    if (t.type === 'minimalPair') {
      mp++
      if (t.pairA === t.pairB) fail(`урок ${li + 1}: минимальная пара из одинаковых слогов ${t.pairA}`)
      if (!t.ttsText) fail(`урок ${li + 1}: минимальной паре нечего озвучить`)
    }
    // 4. Задание не может опираться на букву из будущего урока.
    const used = [
      ...(t.chamo ? [t.chamo] : []),
      ...(t.syllable ? chamoOf(t.syllable) : []),
    ]
    for (const c of used) {
      if (CHAMO[c] && !introducedSoFar.has(c)) fail(`урок ${li + 1}: «${t.question}» опирается на ещё не введённую ${c}`)
    }
  }
})

// 5. Слух должен тренироваться, и не в одном уроке из девяти.
console.log('Заданий на слух (минимальные пары):', mp)
if (mp === 0) fail('в курсе нет ни одного задания на слух')
const withoutEar = lessons.filter((l, i) => i > 0 && !(l.hwTasks ?? []).some(t => t.type === 'minimalPair')).length
if (withoutEar > 0) fail(`уроков без единого задания на слух: ${withoutEar}`)

const kinds = {}
lessons.forEach(l => (l.hwTasks ?? []).forEach(t => { kinds[t.type] = (kinds[t.type] ?? 0) + 1 }))
console.log('Задания по типам:', JSON.stringify(kinds))

console.log(bad === 0 ? '\n✅ всё сходится' : `\n❌ проблем: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
