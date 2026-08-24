// Сторож урока: сверяет собранные курсы-сиды с золотым стандартом
// docs/MEMORY_STANDARD.md (правила Р1, Р3, Р4, Р5, Р9, Р11, Р13).
//
// ЗАЧЕМ. Правила методики нельзя держать в голове автора: курсов девять,
// юнитов в них под сотню, а нарушение не падает и не подсвечивается — урок
// просто выходит невыучиваемым. Ровно так и появились десять слов одной
// порцией и сопоставление пар вторым заданием: никто этого не хотел, просто
// генератор так складывал, а проверить было нечем.
//
// ЧТО ПРОВЕРЯЕМ (по каждому уроку каждого сида):
//   Р1  порция нового: ≤ 4 карточки-знакомства (≤ 3 у курса «с нуля»);
//   Р3  знакомство идёт до первого задания по этому слову;
//   Р4  сопоставление: ≤ 4 пары и не раньше, чем слова показаны;
//   Р5  в одном уроке нет спутываемых слов (общий префикс/суффикс, один
//       перевод, минимальная пара);
//   Р9  в СГЕНЕРИРОВАННЫХ заданиях по словарю (лестница, узнавание, картинки)
//       не больше одной обманки, которой ученик ещё не видел;
//   Р13 не больше двух заданий одного типа подряд — кроме карточек знакомства:
//       порция и есть три-четыре карточки подряд, это замысел (Р3).
//
// ЧЕГО НЕ ПРОВЕРЯЕМ. Смысла заданий и качества формулировок — это не работа
// сторожа. Он ловит структуру: то, что видно из данных и всегда неверно.
//
// Запуск: npm run check:lesson
import { COURSE_SEEDS } from '../src/data/courseSeeds.ts'
import { confusable } from '../src/data/vocabLadder.ts'

const PORTION = 4
const PORTION_SCRATCH = 3
const MAX_PAIRS = 4
const MAX_SAME_TYPE_RUN = 2

/** Курсы «с нуля» — у них порция меньше (см. LanguageCourseSpec.scratch). */
const SCRATCH_KEYS = new Set(['kohg', 'jajl'])

let problems = 0
const fail = (where, msg) => { console.log(`  ✗ ${where}: ${msg}`); problems++ }

/** Слово карточки: у обычного курса на лице term, у родного — толкование. */
const cardWord = task => ({
  term: (task.front ?? '').trim(),
  ru: (task.back ?? '').trim(),
  reading: task.reading,
})

/**
 * Текст, в котором задание могло упомянуть слово. Лицо и оборот карточки тоже
 * здесь: иначе «показанным» не считалось бы само знакомство, и любая обманка
 * из слов урока выглядела бы незнакомой.
 */
const taskText = task => [
  task.question, task.answer, task.sentence, task.syllable,
  task.front, task.back, task.reading, task.ttsText,
  task.pairA, task.pairB, ...(task.choices ?? []), ...(task.pairs ?? []).flatMap(p => [p.left, p.right]),
].filter(Boolean).join(' ')

/**
 * Задания, которые слово НЕ проверяют: посмотреть ролик, написать эссе,
 * рассказать голосом. Правило Р3 про них не говорит — оно про проверку раньше
 * показа, а здесь проверки нет вовсе (тему в формулировке упомянуть можно).
 */
const NOT_A_TEST = new Set(['videoWatch', 'extended', 'speaking', 'whiteboard', 'imageDescribe', 'imageCompare'])

for (const seed of COURSE_SEEDS) {
  let course
  try {
    course = await seed.build(`check-${seed.key}`)
  } catch (e) {
    fail(seed.key, `курс не собрался: ${e.message}`)
    continue
  }
  const cap = SCRATCH_KEYS.has(seed.key) ? PORTION_SCRATCH : PORTION
  let lessons = 0
  // Всё, что ученик видел в этом курсе РАНЬШЕ: обманка из прошлого занятия —
  // знакомое слово, и правило Р9 её не запрещает (запрещает незнакомое).
  let seenBefore = ''

  for (const lesson of course.lessons) {
    const tasks = lesson.hwTasks ?? []
    if (tasks.length === 0) continue
    lessons++
    const where = `${seed.key} · ${lesson.title}`

    const cards = tasks.filter(t => t.type === 'flashcard')
    const words = cards.map(cardWord).filter(w => w.term && w.ru)

    // Р1 — порция нового.
    if (cards.length > cap) {
      fail(where, `новых слов ${cards.length}, потолок ${cap} (Р1)`)
    }

    // Р5 — спутываемое в одном уроке.
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < words.length; j++) {
        if (confusable(words[i], words[j])) {
          fail(where, `спутываемые слова в одном уроке: «${words[i].term}» и «${words[j].term}» (Р5)`)
        }
      }
    }

    // Позиция первого показа слова — для Р3 и Р9.
    const shownAt = new Map()
    tasks.forEach((task, i) => {
      if (task.type !== 'flashcard') return
      const w = cardWord(task)
      if (w.term && !shownAt.has(w.term)) shownAt.set(w.term, i)
    })

    tasks.forEach((task, i) => {
      // Р3 — задание по слову раньше его карточки. Блок повторения (`-rv…`)
      // не в счёт: он спрашивает слова ПРОШЛЫХ занятий, и то, что слово заодно
      // встречается в карточках сегодняшнего, — совпадение, а не нарушение.
      const review = /-rv\d+$/.test(task.id ?? '')
      for (const [term, at] of shownAt) {
        if (at <= i || review || NOT_A_TEST.has(task.type)) continue
        if (task.type !== 'flashcard' && taskText(task).includes(term)) {
          fail(where, `задание ${i + 1} (${task.type}) спрашивает «${term}», а карточка слова идёт ${at + 1}-й (Р3)`)
        }
      }

      // Р4 — размер сопоставления.
      if (task.type === 'matching' && (task.pairs?.length ?? 0) > MAX_PAIRS) {
        fail(where, `сопоставление на ${task.pairs.length} пар, потолок ${MAX_PAIRS} (Р4)`)
      }

      // Р9 — незнакомые обманки. Считаем только у заданий, СОБРАННЫХ по
      // словарю (id `-l…`, `-r…`, `-pic…`): там обманка обязана быть знакомым
      // словом. Авторские задания живут по другим правилам — там варианты это
      // формы одной конструкции или названия времён, и «не встречалось раньше»
      // ничего не значит.
      const generated = /-(l|r|pic)\d+$/.test(task.id ?? '')
      if (generated && task.type === 'single' && (task.choices?.length ?? 0) > 0) {
        const seenText = seenBefore + ' ' + tasks.slice(0, i).map(taskText).join(' ')
        const strange = task.choices.filter(c => {
          const s = String(c).trim()
          // Считаем только варианты на ИЗУЧАЕМОМ письме (латиница, хангыль,
          // кана, иероглифы). Русское значение ученик читает и без урока —
          // незнакомым оно быть не может, и у курсов родного языка (где все
          // варианты русские) правило просто не срабатывает.
          if (!s || !/[A-Za-z가-힯぀-ヿ一-鿿]/.test(s)) return false
          return !seenText.includes(s)
        })
        if (strange.length > 1) {
          fail(where, `в задании ${i + 1} незнакомых вариантов ${strange.length}: ${strange.join(', ')} (Р9)`)
        }
      }
    })

    seenBefore += ' ' + tasks.map(taskText).join(' ')

    // Р13 — однотипные подряд. Исключены две вещи, где серия — это замысел:
    // карточки знакомства (порция и есть блок из трёх-четырёх карточек, Р3) и
    // круг лестницы (одна ступень = одно задание на каждое слово порции, и
    // тип у круга по определению один, Р2).
    let run = 1
    for (let i = 1; i < tasks.length; i++) {
      const ladder = /-l\d+$/.test(tasks[i].id ?? '')
      if (tasks[i].type === 'flashcard' || ladder) { run = 1; continue }
      run = tasks[i].type === tasks[i - 1].type ? run + 1 : 1
      if (run > MAX_SAME_TYPE_RUN) {
        fail(where, `${run} заданий типа «${tasks[i].type}» подряд, потолок ${MAX_SAME_TYPE_RUN} (Р13)`)
        break
      }
    }
  }
  console.log(`${seed.key}: уроков ${lessons}`)
}

console.log(problems === 0
  ? '\nВсе уроки проходят стандарт.'
  : `\nНарушений: ${problems}`)
process.exit(problems === 0 ? 0 : 1)
