// Пересчёт чисел на карточках готовых курсов (src/data/courseSeedCards.ts).
//
// ЗАЧЕМ. Плитка курса в Конструкторе показывает юниты, слова и задания ДО того,
// как курс загружен, — числа поэтому лежат в карточке отдельной записью, а не
// считаются по курсу (объяснение целиком — в шапке courseSeedCards.ts).
// Записанные руками, они разъезжаются с содержанием: `taskCount` у всех
// девятнадцати курсов был занижен в десять раз, потому что считал только
// авторские задания юнитов и не знал про сгенерированные.
//
// ЧТО ДЕЛАЕТ. Собирает каждый сид по-настоящему и переписывает в карточке два
// поля: число заданий `taskCount` и отпечаток содержимого `stamp`.
//
// ОТПЕЧАТОК нужен плитке в Конструкторе: по нему видно, что готовый курс ушёл
// вперёд относительно сохранённой копии учителя, и незачем грузить сид целиком
// ради сверки. Считается по содержанию, а не по счётчикам: сложные задания
// добавились ВНУТРЬ существующих уроков и ни одного счётчика не сдвинули — по
// числам такая правка невидима. Остальные поля (название, уровень, юниты, слова, часы,
// оговорка) считаются по той же спеке, что и курс, или написаны автором —
// расхождение по ним ловит сверка в courseSeeds.ts.
//
// Запуск: npm run stamp:seeds. Расхождение и без него всплывает в консоли при
// первом открытии плитки — скрипт просто чинит его одной командой.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COURSE_SEEDS } from '../src/data/courseSeeds.ts'
import { countTasks } from '../src/data/languageCourse.ts'

// Путь от корня проекта, а не от import.meta.url: скрипт запускается собранным
// бандлом из node_modules/.cache, и относительный путь указал бы туда.
/**
 * Отпечаток собранного курса.
 *
 * Берётся то, что видит ученик и что правит автор: заголовок урока, конспект и
 * все задания с их содержимым. Порядок сохраняем — перестановка заданий в
 * уроке это тоже правка. Идентификаторы В ОТПЕЧАТОК НЕ ВХОДЯТ: они содержат
 * номер юнита, а он сдвигается при вставке юнита в середину программы, и
 * отпечаток менялся бы у половины курса без единой правки содержания.
 */
function stampOf(course) {
  const h = createHash('sha1')
  for (const l of course.lessons ?? []) {
    h.update(`L\u0000${l.title ?? ''}\u0000${l.theory ?? ''}\n`)
    for (const t of l.hwTasks ?? []) {
      const { id, ...rest } = t
      h.update(`T\u0000${JSON.stringify(rest)}\n`)
    }
  }
  return h.digest('hex').slice(0, 12)
}

const FILE = resolve(process.cwd(), 'src/data/courseSeedCards.ts')
let text = readFileSync(FILE, 'utf8')
let changed = 0

for (const seed of COURSE_SEEDS) {
  const course = await seed.build(`stamp-${seed.key}`)
  // Правится только `taskCount`: юниты и слова карточка и так считает по той
  // же спеке, что и курс, и расходятся они лишь когда автор забыл обновить
  // подпись — это ловит сверка в courseSeeds.ts. Не по тому считались задания.
  const taskCount = countTasks(course.lessons)
  const stamp = stampOf(course)
  const block = new RegExp(`(\\n  ${seed.key}: \\{[\\s\\S]*?\\n  \\},)`)
  const found = text.match(block)
  if (!found) {
    console.log(`  ✗ ${seed.key}: карточки нет в courseSeedCards.ts`)
    continue
  }
  const before = found[1]
  let after = before.replace(/(\n\s*taskCount: )\d+/, `$1${taskCount}`)
  after = /\n\s*stamp: '/.test(after)
    ? after.replace(/(\n\s*stamp: ')[^']*'/, `$1${stamp}'`)
    // Первая штамповка: поле дописывается сразу за taskCount, чтобы числа
    // курса стояли рядом, а не разбредались по записи.
    : after.replace(/(\n(\s*)taskCount: \d+,)/, `$1\n$2stamp: '${stamp}',`)
  if (after === before) {
    console.log(`  · ${seed.key}: ${taskCount} — уже верно`)
    continue
  }
  const was = before.match(/taskCount: (\d+)/)?.[1]
  text = text.replace(before, after)
  changed++
  console.log(`  ✓ ${seed.key}: ${was} → ${taskCount}`)
}

if (changed > 0) {
  writeFileSync(FILE, text)
  console.log(`\nОбновлено карточек: ${changed}`)
} else {
  console.log('\nВсе карточки уже сходятся с курсами.')
}
