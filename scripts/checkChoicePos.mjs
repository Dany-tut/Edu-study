// Сторож позиции верного ответа: распределение по всем курсам-сидам.
//
// ЗАЧЕМ. Хелпер `one(question, choices, correct)` почти везде звался как
// `one(..., [верный, ...обманки], 0)`, и по всем сидам верный ответ стоял
// первым в 52% вопросов — а в экзамене порции (vocabRecognition, ступень 4)
// в 100%. Ученик, который жмёт верхний вариант НЕ ЧИТАЯ, получал больше
// половины верных, и целевая проверка урока не измеряла ничего.
//
// ПОЧЕМУ НЕ «ДОЛЖНО БЫТЬ 25%». Вопросы разной ширины: у лестницы два варианта
// (случай даёт 50%), у экзамена четыре (25%). Поэтому сторож считает СЛУЧАЙ
// для конкретного набора вопросов — сумму 1/N по каждому — и смотрит, на
// сколько его перебирает КАЖДОЕ место. Ровно это и есть «сколько ученик
// получает сверх угадывания», а жать вслепую можно не только верхнюю строку.
//
// ЧТО ЕЩЁ СЮДА ВХОДИТ. Не только выбор из вариантов: тем же дефектом болеет
// пара на слух (ответ A/B — «A» выпадала в 56% из 6051 задания) и «отметьте
// всё верное» (верные шли первыми в 84 заданиях из 85). Считаем их одной
// меркой: сколько ученик получает сверх угадывания, ткнув не читая.
//
// ЧЕГО ЗДЕСЬ НЕТ. Сопоставление и «расставьте по порядку» хранят ответ в
// авторском порядке, но ученику показываются перемешанными (см. SequenceSolver
// в HomeworkFlow.tsx) — позиции в данных там не значат ничего.
//
// Запуск: npm run check:choicepos   (--detail — разбивка по роду заданий)
import { COURSE_SEEDS } from '../src/data/courseSeeds.ts'
import { DEFAULT_QUESTIONS } from '../src/data/diagnosticData.ts'
import { displayOrder } from '../src/data/taskTypes.ts'

const detail = process.argv.includes('--detail')

/**
 * Насколько перевес ЛЮБОГО места над случаем считается поломкой.
 *
 * Считаем в процентных пунктах СВЕРХ случая, а не в процентах: 40% верных на
 * первом месте — это перекос там, где вопросы двухвариантные (случай 50%), и
 * норма там, где четырёхвариантные (случай 25%).
 */
const MAX_EXCESS = 6

const mk = () => ({ pos: new Map(), n: 0, chance: 0 })
const add = (acc, pos, count) => {
  acc.pos.set(pos, (acc.pos.get(pos) ?? 0) + 1)
  acc.n++
  acc.chance += 1 / count
}

const all = mk()
const perSeed = []
const byKind = new Map()
const kind = k => {
  if (!byKind.has(k)) byKind.set(k, mk())
  return byKind.get(k)
}
/** Хвост id без номера: `l` из `kotp-03-2-l7`. */
const idKind = id => (String(id ?? '?').match(/([a-z]+)\d*$/i)?.[1] ?? '?')

for (const seed of COURSE_SEEDS) {
  const course = await seed.build(`pos-${seed.key}`)
  const mine = mk()
  for (const lesson of course.lessons ?? []) {
    for (const task of lesson.hwTasks ?? []) {
      // Пара на слух: ответ — буква, но дефект тот же, и место у неё одно из
      // двух. Считаем «A» нулевым местом.
      if (task.type === 'minimalPair' && task.correctPair) {
        const pos = task.correctPair === 'A' ? 0 : 1
        add(mine, pos, 2); add(all, pos, 2); add(kind('pair'), pos, 2)
        continue
      }
      const count = task.choices?.length ?? 0
      if (count < 2) continue
      // «Отметьте всё верное»: место каждого верного варианта — своё
      // наблюдение. Случай для одного верного из N так и остаётся 1/N.
      if (task.type === 'multi') {
        for (const pos of task.correctChoices ?? []) {
          add(mine, pos, count); add(all, pos, count); add(kind('multi'), pos, count)
        }
        continue
      }
      if (task.type !== 'single') continue
      const pos = task.correctChoices?.[0]
      if (typeof pos !== 'number') continue
      add(mine, pos, count); add(all, pos, count)
      add(kind(idKind(task.id)), pos, count)
    }
  }
  perSeed.push({ key: seed.key, acc: mine })
}

const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—')
const first = acc => (acc.pos.get(0) ?? 0)
/** Перевес первого места над случаем, в процентных пунктах. */
const excess = acc => (acc.n ? ((first(acc) - acc.chance) / acc.n) * 100 : 0)
const spread = acc => [...acc.pos.keys()].sort((a, b) => a - b)
  .map(p => `место ${p + 1} — ${acc.pos.get(p)} (${pct(acc.pos.get(p), acc.n)})`).join(', ')

console.log(`Ответов, у которых есть место (выбор, пара на слух, «всё верное»): ${all.n}`)
console.log(spread(all))
console.log(`\nВерхний вариант: ${pct(first(all), all.n)} верных, не читая`)
console.log(`Случай на этом наборе: ${pct(all.chance, all.n)} — перевес ${excess(all).toFixed(1)} п.п.`)

console.log('\nПо курсам (столбец — перевес ПЕРВОГО места; сторож ниже смотрит все):')
for (const { key, acc } of perSeed) {
  console.log(`  ${key.padEnd(6)} ${String(acc.n).padStart(5)}  ${excess(acc).toFixed(1).padStart(6)} п.п.  ${spread(acc)}`)
}

if (detail) {
  console.log('\nПо роду заданий:')
  for (const [k, acc] of [...byKind].sort((a, b) => excess(b[1]) - excess(a[1]))) {
    console.log(`  ${k.padEnd(4)} ${String(acc.n).padStart(5)}  первых ${pct(first(acc), acc.n).padStart(4)}  случай ${pct(acc.chance, acc.n).padStart(4)}  перевес ${excess(acc).toFixed(1)} п.п.`)
  }
}

// Сторож. Порог по КУРСУ, а не только по сумме: перекос в одном курсе тонет
// в двенадцати тысячах вопросов остальных, а проходит его отдельный ученик.
//
// ПРОВЕРЯЕМ ВСЕ МЕСТА, А НЕ ТОЛЬКО ПЕРВОЕ. Ученик, который всегда жмёт вторую
// строку, читает ровно столько же, сколько тот, кто жмёт первую. Пока верный
// ответ раскладывали руками, второе место перебирало случай на 3.7 п.п. по
// всем курсам и на 17.8 в `ielt`: авторы ставят верный вторым чаще прочего
// («первый заведомо мимо, верный сразу за ним»). Теперь место считает
// `one()` для всех заданий разом, и держать порог только на первом месте
// значило бы охранять одну дверь из четырёх.
const at = (acc, p) => (acc.n ? (((acc.pos.get(p) ?? 0) - acc.chance) / acc.n) * 100 : 0)
const worst = acc => [...acc.pos.keys()]
  .map(p => [p, at(acc, p)])
  .sort((a, b) => b[1] - a[1])[0] ?? [0, 0]

// ПОРОГ ЕЩЁ И ПО РОДУ ЗАДАНИЙ. Курса и суммы мало: «отметьте всё верное» даёт
// 218 наблюдений из 19 тысяч, и его перекос — даже полный, все верные первыми —
// сдвигает общий счёт на полтора пункта и проходит незамеченным. Проверено: с
// выключенным spreadMulti сторож молчал. Род заданий сравнивается сам с собой,
// и там те же 218 наблюдений уже показывают перекос в полный рост.
const bad = [
  ['все курсы', all],
  ...perSeed.map(s => [s.key, s.acc]),
  ...[...byKind].map(([k, acc]) => [`род «${k}»`, acc]),
].filter(([, acc]) => acc.n >= 150 && worst(acc)[1] > MAX_EXCESS)
if (bad.length) {
  console.log('')
  for (const [where, acc] of bad) {
    const [p, e] = worst(acc)
    console.log(`  ✗ ${where}: место ${p + 1} на ${e.toFixed(1)} п.п. чаще случая (потолок ${MAX_EXCESS})`)
  }
  console.log('\nМесто верного ответа раскладывает `one()` через placeCorrect в src/data/taskTypes.ts (Р15).')
  console.log('Задание, собранное объектом в обход `one()`, туда не попадает — зовите placeCorrect/answerSide вручную.')
  process.exit(1)
}
// ── Диагностики и placement ─────────────────────────────────────────────────
//
// Они живут не в COURSE_SEEDS, а статикой в diagnosticData.ts/placementTests.ts,
// и перекос там был хуже, чем в курсах: у корейского placement верный ответ
// стоял первым во ВСЕХ 25 вопросах, у английского вторым в 73%, у биологии с
// химией третьим в половине.
//
// ПОЧЕМУ МЕРЯЕМ ПОКАЗ, А НЕ ДАННЫЕ. Переставить варианты в самих данных нельзя:
// ответ ученика сохраняется как НОМЕР выбранного варианта (diag_results.answers),
// и правка задним числом переврала бы все уже сданные тесты — верный ответ
// показался бы неверным, а рядом встал бы чужой текст. Поэтому порядок меняется
// на ПОКАЗЕ (displayOrder в DiagnosticTestPage), а хранимое остаётся прежним.
// Значит и мерить надо то, что видит ученик: где верный ответ окажется на
// экране, а не где он лежит в файле.
const shown = mk()
const perTest = []
/**
 * Порядок показа обязан быть ПОЛНОЙ перестановкой: каждый исходный номер ровно
 * один раз. Проверяем это отдельно от распределения, потому что поломка тут
 * куда хуже перекоса — потерянный номер убирает вариант с экрана, задвоенный
 * показывает его дважды, и оба раза ученик решает задание, которого нет.
 */
const brokenOrder = []
for (const [subject, qs] of Object.entries(DEFAULT_QUESTIONS)) {
  const acc = mk()
  for (const q of qs) {
    if (!Array.isArray(q.options) || q.options.length < 2) continue
    const order = displayOrder(q.options, q.text)
    const seen = [...order].sort((a, b) => a - b)
    if (seen.length !== q.options.length || seen.some((v, i) => v !== i)) {
      brokenOrder.push(`${subject} · ${q.id}: ${JSON.stringify(order)} при ${q.options.length} вариантах`)
      continue
    }
    const place = order.indexOf(q.correct)
    if (place < 0) continue
    add(acc, place, q.options.length); add(shown, place, q.options.length)
  }
  if (acc.n) perTest.push([subject, acc])
}
if (brokenOrder.length) {
  console.log('')
  for (const b of brokenOrder) console.log(`  ✗ порядок показа — не перестановка: ${b}`)
  process.exit(1)
}

console.log('\n── Диагностики и placement (как их видит ученик) ──')
for (const [subject, acc] of perTest) {
  const [p, e] = worst(acc)
  console.log(`  ${subject.padEnd(13)} ${String(acc.n).padStart(4)}  худшее место ${p + 1}: ${e >= 0 ? '+' : ''}${e.toFixed(1)} п.п.  ${spread(acc)}`)
}

// ПОЧЕМУ НЕ ПРОЦЕНТНЫЕ ПУНКТЫ, КАК У КУРСОВ. В самом большом банке 32 вопроса,
// в самом маленьком 18: один вопрос весит там три-пять пунктов, и порог «+20»
// одновременно пропускал настоящую привычку у мелкого банка и ловил чистый шум
// у среднего (ap-chem-en давал ровно +20.0 на разбросе, а не на перекосе).
// Поэтому перевес меряется в СИГМАХ биномиального разброса: сколько вопросов
// село бы на это место само по себе, ± сколько такой счёт гуляет.
//
// 2.5σ выбраны по данным: до правки корейский placement давал 8.6σ, английский
// 6.2σ, химия 3.3σ — то есть настоящая привычка автора уходит далеко за порог,
// а разброс на банке в двадцать вопросов до него не достаёт.
const SIGMAS = 2.5
/** На сколько сигм место перебирает свой ожидаемый счёт. */
const sigmaOver = (acc, place) => {
  const expect = acc.chance                       // сумма 1/N по вопросам банка
  const p = expect / acc.n
  const sd = Math.sqrt(acc.n * p * (1 - p))
  return sd > 0 ? ((acc.pos.get(place) ?? 0) - expect) / sd : 0
}
const worstSigma = acc => [...acc.pos.keys()]
  .map(p => [p, sigmaOver(acc, p)])
  .sort((a, b) => b[1] - a[1])[0] ?? [0, 0]

const badTests = [['все тесты', shown], ...perTest].filter(([, acc]) => worstSigma(acc)[1] > SIGMAS)
if (badTests.length) {
  console.log('')
  for (const [where, acc] of badTests) {
    const [p, sg] = worstSigma(acc)
    console.log(`  ✗ ${where}: место ${p + 1} перебирает случай на ${sg.toFixed(1)}σ (потолок ${SIGMAS}σ)`)
  }
  console.log('\nПорядок показа считает displayOrder из src/data/taskTypes.ts — его зовёт DiagnosticTestPage.')
  process.exit(1)
}

console.log(`\n✓ ни одно место не перебирает случай больше чем на ${MAX_EXCESS} п.п. — вслепую не пройти`)
