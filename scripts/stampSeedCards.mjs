// Пересчёт чисел на карточках готовых курсов (src/data/courseSeedCards.ts).
//
// ЗАЧЕМ. Плитка курса в Конструкторе показывает юниты, слова и задания ДО того,
// как курс загружен, — числа поэтому лежат в карточке отдельной записью, а не
// считаются по курсу (объяснение целиком — в шапке courseSeedCards.ts).
// Записанные руками, они разъезжаются с содержанием: `taskCount` у всех
// девятнадцати курсов был занижен в десять раз, потому что считал только
// авторские задания юнитов и не знал про сгенерированные.
//
// ЧТО ДЕЛАЕТ. Собирает каждый сид по-настоящему и переписывает в карточке одно
// число — `taskCount`. Остальные поля (название, уровень, юниты, слова, часы,
// оговорка) считаются по той же спеке, что и курс, или написаны автором —
// расхождение по ним ловит сверка в courseSeeds.ts.
//
// Запуск: npm run stamp:seeds. Расхождение и без него всплывает в консоли при
// первом открытии плитки — скрипт просто чинит его одной командой.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COURSE_SEEDS } from '../src/data/courseSeeds.ts'
import { countTasks } from '../src/data/languageCourse.ts'

// Путь от корня проекта, а не от import.meta.url: скрипт запускается собранным
// бандлом из node_modules/.cache, и относительный путь указал бы туда.
const FILE = resolve(process.cwd(), 'src/data/courseSeedCards.ts')
let text = readFileSync(FILE, 'utf8')
let changed = 0

for (const seed of COURSE_SEEDS) {
  const course = await seed.build(`stamp-${seed.key}`)
  // Правится только `taskCount`: юниты и слова карточка и так считает по той
  // же спеке, что и курс, и расходятся они лишь когда автор забыл обновить
  // подпись — это ловит сверка в courseSeeds.ts. Не по тому считались задания.
  const taskCount = countTasks(course.lessons)
  const block = new RegExp(`(\\n  ${seed.key}: \\{[\\s\\S]*?\\n  \\},)`)
  const found = text.match(block)
  if (!found) {
    console.log(`  ✗ ${seed.key}: карточки нет в courseSeedCards.ts`)
    continue
  }
  const before = found[1]
  const after = before.replace(/(\n\s*taskCount: )\d+/, `$1${taskCount}`)
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
