// Проверка готовых курсов: подписи на карточках и сходимость сверки с сидом.
//
// ЗАЧЕМ. У сидов две тихие поломки, которые не падают и не подсвечиваются.
//
// 1. ЧИСЛА НА КАРТОЧКЕ. Они захардкожены в data/courseSeedCards.ts (посчитать
//    их можно только загрузив курс, а карточка существует ровно для того, чтобы
//    его не грузить). Правка контента их не двигает, и плитка в Конструкторе
//    начинает тихо врать: «1567 слов» у курса, где их 518. В приложении
//    расхождение всплывает предупреждением в консоли — но только у того, кто
//    открыл именно эту карточку и смотрел в консоль.
//
// 2. СВЕРКА, КОТОРАЯ НЕ СХОДИТСЯ. «Подтянуть из сида» показывает расхождения
//    курса с его сидом. Если применение не приводит курс к сиду, кнопка «Из
//    сида · N» не гаснет никогда: учитель применяет, сохраняет, перезагружает —
//    и видит то же самое число. Так уже было: задания уезжают в jsonb, а он не
//    хранит порядок ключей, и 24 дрилла корейского считались разошедшимися
//    вечно (см. differs/canon в lib/seedSync.ts).
//
// ЧТО ДЕЛАЕМ. Прогоняем каждый сид через тот же круг, что и живой курс:
// собрали → «сохранили» (конспект через content.paragraphs, задания через
// перестановку ключей по правилу jsonb) → «открыли заново» → сверили. Курс,
// собранный текущим сидом, обязан дать НОЛЬ расхождений. Затем портим копию
// (убираем задания, стираем видео, подменяем конспект, подкладываем задание
// учителя и задание из прежней версии сида), применяем всё и требуем, чтобы
// после сохранения расхождений не осталось — и чтобы своё задание учителя
// выжило, а лишнее ушло.
//
// Запуск: node scripts/checkSeeds.mjs
//
// ПОЧЕМУ ЧЕРЕЗ esbuild. Сиды — это граф из сотни модулей с импортами без
// расширений; node такой граф не разрешит, а тащить сюда vite ради одной
// проверки незачем. esbuild уже стоит в зависимостях и собирает его за
// полсекунды.

import { build } from 'esbuild'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SRC = new URL('../src', import.meta.url).pathname
const NODE_MODULES = new URL('../node_modules', import.meta.url).pathname

/**
 * Ключ сида → модуль с курсом. Держится списком, а не обходом папки: у файла
 * данных нет признака «это сид», а COURSE_SUMMARY экспортируют и не-сиды.
 * Забытый здесь курс виден сразу — реестр сверяется с COURSE_SEEDS ниже.
 */
const MODULES = {
  endc: 'englishDesignCareer', enac: 'englishAdvanced', ielt: 'englishIelts', ensv: 'survivalEn',
  kohg: 'koreanHangul', kotp: 'koreanTopik', kot2: 'koreanTopik2', kosv: 'survivalKo',
  jajl: 'japaneseJlpt', jan3: 'japaneseJlptN3', jasv: 'survivalJa',
  ptbr: 'portugueseCelpe', ptb2: 'portugueseIntermediate', ptsv: 'survivalPt',
  deab: 'germanA1B1', desv: 'survivalDe',
  ruzh: 'russianSpeech', ruvo: 'russianVoice', rulit: 'russianLiterature',
}

const dir = mkdtempSync(join(tmpdir(), 'seedcheck-'))
const entry = join(dir, 'entry.ts')
const out = join(dir, 'bundle.mjs')
writeFileSync(entry, [
  `export { diffAgainstSeed, applySeedChanges } from '${SRC}/lib/seedSync'`,
  `export { theoryToParagraphs, paragraphsToTheory } from '${SRC}/lib/theoryImages'`,
  `export { COURSE_SEEDS } from '${SRC}/data/courseSeeds'`,
  `export { SEED_CARDS } from '${SRC}/data/courseSeedCards'`,
  `export const SUMMARIES = {`,
  ...Object.entries(MODULES).map(([k, f]) => `  ${k}: () => import('${SRC}/data/${f}'),`),
  `}`,
].join('\n'))

await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
  outfile: out, logLevel: 'error', nodePaths: [NODE_MODULES],
})

// Предупреждения самого реестра здесь только мешают: расхождение карточек мы и
// так печатаем своим отчётом, а console.warn изнутри сборки рвёт таблицу.
const warn = console.warn
console.warn = () => {}
const m = await import(pathToFileURL(out).href)
console.warn = warn

let bad = 0
const fail = msg => { console.log('  ✗', msg); bad++ }

/** Порядок ключей, в котором их вернёт Postgres: по длине, потом побайтово. */
const jsonbOrder = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0)
const asJsonb = v =>
  Array.isArray(v) ? v.map(asJsonb)
  : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort(jsonbOrder).map(k => [k, asJsonb(v[k])]))
    : v

/** Курс, прошедший через БД и обратно: конспект абзацами, задания через jsonb. */
const roundTrip = course => ({
  ...course,
  lessons: course.lessons.map(l => {
    const back = m.paragraphsToTheory(m.theoryToParagraphs(l.theory ?? '', l.theoryImages, l.id))
    return {
      ...l,
      theory: back.theory || undefined,
      theoryImages: back.images,
      videoUrl: l.videoUrl ?? undefined,
      hwTasks: asJsonb(JSON.parse(JSON.stringify(l.hwTasks ?? []))),
    }
  }),
})

// ── 1. Реестр и список выше не разошлись ────────────────────────────────────
const registered = m.COURSE_SEEDS.map(s => s.key)
for (const key of registered) if (!MODULES[key]) fail(`сид ${key} есть в реестре, но не проверяется — допишите его в MODULES`)
for (const key of Object.keys(MODULES)) if (!registered.includes(key)) fail(`сида ${key} нет в COURSE_SEEDS`)

// ── 2. Подписи на карточках ─────────────────────────────────────────────────
console.log('\nКарточки готовых курсов')
const FIELDS = ['title', 'level', 'units', 'vocabCount', 'taskCount', 'guidedHours', 'lessonMinutes', 'scopeNote']
for (const key of Object.keys(MODULES)) {
  const real = (await m.SUMMARIES[key]()).COURSE_SUMMARY
  const card = m.SEED_CARDS[key]
  if (!card) { fail(`нет карточки SEED_CARDS[${key}]`); continue }
  const drift = FIELDS.filter(f => JSON.stringify(card[f]) !== JSON.stringify(real[f]))
  if (drift.length) {
    fail(`${key}: ${drift.map(f => `${f} — на карточке ${JSON.stringify(card[f])}, в курсе ${JSON.stringify(real[f])}`).join('; ')}`)
  } else {
    console.log(`  ✓ ${key.padEnd(5)} ${real.units} юнитов, ${real.vocabCount} слов, ${real.taskCount} заданий`)
  }
}

// ── 3. Сверка с сидом сходится ──────────────────────────────────────────────
console.log('\nСверка с сидом')
for (const seed of m.COURSE_SEEDS) {
  const id = `seed-${seed.key}-1`
  const fresh = await seed.build(id)

  // Свежесобранный курс после круга через БД обязан совпадать с сидом.
  const ghosts = await m.diffAgainstSeed(roundTrip({ ...fresh, id }))
  if (ghosts.changes.length) {
    fail(`${seed.key}: курс собран текущим сидом, а сверка находит ${ghosts.changes.length} расхождений — ` +
      `${ghosts.changes[0].lessonTitle}: ${ghosts.changes[0].summary}`)
    continue
  }

  // Отставший курс: часть заданий и видео нет, конспект чужой, в первом уроке
  // задание из прежней версии сида и задание, добавленное учителем руками.
  const drifted = roundTrip({
    ...fresh, id,
    lessons: fresh.lessons.map((l, i) => ({
      ...l,
      hwTasks: i % 3 === 0 ? (l.hwTasks ?? []).slice(0, 2) : l.hwTasks,
      videoUrl: i % 4 === 0 ? undefined : l.videoUrl,
      theory: i % 5 === 0 ? 'конспект учителя' : l.theory,
    })),
  })
  const stale = { id: `${seed.key}-01-zz9`, type: 'fill', label: 'Вписать', question: 'из прежней версии сида' }
  const mine = { id: 'm1n2o3', type: 'fill', label: 'Вписать', question: 'задание учителя' }
  drifted.lessons[0].hwTasks = [...drifted.lessons[0].hwTasks, stale, mine]

  const found = await m.diffAgainstSeed(drifted)
  if (!found.changes.length) { fail(`${seed.key}: испорченный курс не дал ни одного расхождения`); continue }

  const applied = await m.applySeedChanges(drifted, new Set(found.changes.map(c => c.key)))
  const left = await m.diffAgainstSeed(roundTrip(applied))
  const tasks = applied.lessons[0].hwTasks
  const problems = [
    left.changes.length ? `после применения и перезагрузки осталось ${left.changes.length}` : '',
    tasks.some(t => t.id === mine.id) ? '' : 'задание учителя удалено',
    tasks.some(t => t.id === stale.id) ? 'задание из прежней версии сида осталось' : '',
  ].filter(Boolean)

  if (problems.length) fail(`${seed.key}: ${problems.join('; ')}`)
  else console.log(`  ✓ ${seed.key.padEnd(5)} ${found.changes.length} расхождений → 0 за один проход`)
}

rmSync(dir, { recursive: true, force: true })
console.log(bad === 0 ? '\nВсе готовые курсы в порядке.' : `\nПроблем: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
