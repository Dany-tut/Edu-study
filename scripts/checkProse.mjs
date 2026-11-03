// Проверка конспектов: висячие знаки и прочая типографика лекции.
//
// ЗАЧЕМ. Конспект — единственный длинный текст, который ученик читает подряд,
// и любая типографская помарка в нём стоит дороже, чем где-либо ещё: строка,
// начинающаяся с точки, или кавычка, повисшая в конце строки, читаются как
// опечатка, глаз возвращается и перечитывает. Часть таких швов чинит сам показ
// (lib/typography: bindShortWords + glueHangingPunct склеивают знак с его
// словом невидимым word-joiner'ом), но починить он может только то, что в
// исходнике написано правильно. Пробел перед запятой, незакрытая кавычка,
// оборванный на полуслове абзац — это уже ошибка ТЕКСТА, и её должен увидеть
// тот, кто текст пишет, а не ученик.
//
// ЧТО ПРОВЕРЯЕМ (всё — по собранным курсам, то есть по тому самому конспекту,
// который увидит ученик):
//   • пробел перед финальным знаком и после открывающего — висячий знак;
//   • непарные кавычки и скобки в абзаце — почти всегда обрубленная правка;
//   • абзац, оборванный без знака конца предложения;
//   • двойные пробелы, пробел в конце строки, табуляция;
//   • дефис вместо тире между словами («слово - слово»);
//   • незакрытое выделение **важного**.
//
// Запуск: npm run check:prose
//
// ПОЧЕМУ ЧЕРЕЗ esbuild — по той же причине, что и в checkSeeds.mjs: сиды это
// граф из сотни модулей, node его сам не разрешит.

import { build } from 'esbuild'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SRC = new URL('../src', import.meta.url).pathname
const NODE_MODULES = new URL('../node_modules', import.meta.url).pathname

const dir = mkdtempSync(join(tmpdir(), 'prosecheck-'))
const entry = join(dir, 'entry.ts')
const out = join(dir, 'bundle.mjs')
writeFileSync(entry, [
  `export { COURSE_SEEDS } from '${SRC}/data/courseSeeds'`,
  `export { theoryToParagraphs } from '${SRC}/lib/theoryImages'`,
  `export { isChecklistParagraph } from '${SRC}/lib/theoryChecklist'`,
].join('\n'))

await build({
  entryPoints: [entry], bundle: true, format: 'esm', platform: 'node',
  outfile: out, logLevel: 'error', nodePaths: [NODE_MODULES],
})
const warn = console.warn
console.warn = () => {}
const m = await import(pathToFileURL(out).href)
console.warn = warn
rmSync(dir, { recursive: true, force: true })

/** Знаки, которые относятся к слову слева, и те, что к слову справа. */
const TAIL = '.,;:!?»”)\\]'
const HEAD = '«„(\\['

/**
 * Правила. Каждое возвращает описание промаха или null.
 *
 * Проверяем именно абзац целиком: половина правил (парность кавычек, конец
 * предложения) на отдельной строке смысла не имеет.
 *
 * Правила намеренно узкие. Двоеточие в конце абзаца-лидина к схеме, «5–10 %»,
 * многоточие-пропуск «What I need is …», нумерация «1) 2)», чтение в скобках
 * «오 (o)» — всё это законно, и правило, ругающееся на каждый второй абзац,
 * читать перестают.
 */
const RULES = [
  {
    id: 'висячий знак',
    // Пробел перед точкой/запятой/кавычкой: браузер честно перенесёт знак на
    // новую строку одного, и абзац начнётся с запятой.
    //
    // Многоточие сюда не входит: « … » в конспекте стоит не знаком препинания,
    // а пропуском в шаблоне («What I need is …»), и пробел перед ним нужен.
    test: p => {
      const hit = p.match(new RegExp(`\\S[ \\t]+[${TAIL}](?![.\\d])`, 'g'))
      return hit ? `пробел перед знаком: ${hit.slice(0, 3).map(quote).join(', ')}` : null
    },
  },
  {
    id: 'висячая кавычка',
    test: p => {
      const hit = p.match(new RegExp(`[${HEAD}][ \\t]+\\S`, 'g'))
      return hit ? `пробел после открывающего знака: ${hit.slice(0, 3).map(quote).join(', ')}` : null
    },
  },
  {
    id: 'непарные кавычки',
    test: p => {
      const open = count(p, '«'), close = count(p, '»')
      if (open === close) return null
      return `«${open} против »${close}`
    },
  },
  {
    id: 'непарные скобки',
    // Нумерация «1) … 2) …» — не скобка, а маркер списка: закрывающая без
    // открывающей здесь норма, поэтому маркеры выкидываем до подсчёта.
    test: raw => {
      // Маркером считается только то, что стоит НА МЕСТЕ маркера: с начала
      // строки или после конца предыдущего пункта. Иначе под нож попадают
      // «(Повседневные темы Part 1)» и «(см. юнит 1)» — там скобка своя.
      const p = raw.replace(/(^|[.;:]\s|\n)[0-9a-zа-я]\)\s/gu, '$1')
      const open = count(p, '('), close = count(p, ')')
      if (open === close) return null
      return `(${open} против )${close}`
    },
  },
  {
    id: 'оборванный абзац',
    // Абзац, оборванный на полуслове. Ищем ТОЛЬКО однозначное: запятую, тире,
    // открытую скобку или кавычку последним знаком. Отсутствие точки промахом
    // не считается — заголовки, пункты и подписи законно живут без неё, и
    // правило, которое ругается на каждый второй абзац, читать перестают.
    test: p => {
      const last = p.trimEnd().slice(-1)
      // Двоеточие в конце — законный лид-ин к схеме или списку следующим
      // абзацем, а не обрыв.
      return /[,;\-–—(«„]/.test(last) ? `абзац кончается на «${last}»` : null
    },
  },
  {
    id: 'лишний пробел',
    // Отступ в начале строки — это разметка (примером к слову в списке слов
    // урока), а не лишний пробел, поэтому считаем только внутри строки.
    test: p => {
      if (/\t/.test(p)) return 'табуляция в тексте'
      if (p.split('\n').some(line => /\S[ ]{2,}/.test(line))) return 'два пробела подряд'
      if (/[ ]\n|[ ]$/.test(p)) return 'пробел в конце строки'
      return null
    },
  },
  {
    id: 'непарное выделение',
    // **важное** показывается жирным (lib/markup.ts). Одинокая пара звёздочек
    // — это обрубленная правка: на экране она останется звёздочками посреди
    // фразы, потому что снимаются они только парой.
    test: p => {
      const marks = count(p, '**')
      return marks % 2 ? `звёздочек ${marks} — выделение не закрыто` : null
    },
  },
  {
    id: 'дефис вместо тире',
    // «слово - слово» набирается тире, а не дефисом: дефис в этой позиции
    // выглядит как опечатка и переносится по другим правилам.
    test: p => (/\S - \S/.test(p) ? `${quote((p.match(/\S+ - \S+/) || [''])[0])}` : null),
  },
]

const quote = s => `«${s.replace(/\n/g, '⏎')}»`
const count = (s, ch) => s.split(ch).length - 1

let bad = 0
const perRule = new Map()

console.log('Типографика конспектов\n')
for (const seed of m.COURSE_SEEDS) {
  const course = await seed.build(`seed-${seed.key}-1`)
  const issues = []
  for (const lesson of course.lessons) {
    const theory = lesson.theory ?? ''
    if (!theory.trim()) continue
    // Тот же разбор, что и на экране: картинки уезжают в маркеры, чек-лист —
    // в свой блок. Проверять надо ровно то, что станет абзацем.
    const paragraphs = m.theoryToParagraphs(theory, lesson.theoryImages ?? [])
    for (const p of paragraphs) {
      if (p.image) continue
      const text = p.text ?? ''
      if (!text.trim()) continue
      // Старый чек-лист («- [ ] …») — легаси-разметка из курсов, сохранённых в
      // базу до его удаления: ученику она не показывается вовсе (см.
      // lib/theoryChecklist), значит и типографику там проверять не о чем.
      if (m.isChecklistParagraph(text)) continue
      for (const rule of RULES) {
        const hit = rule.test(text)
        if (!hit) continue
        issues.push(`${lesson.title || lesson.id}: ${rule.id} — ${hit}`)
        // Разобрать конкретное срабатывание: PROSE_DEBUG='висячий знак' node …
        if (process.env.PROSE_DEBUG === rule.id) console.log('DBG', JSON.stringify(text.slice(0, 400)))
        perRule.set(rule.id, (perRule.get(rule.id) ?? 0) + 1)
        bad++
      }
    }
  }
  if (issues.length) {
    console.log(`  ✗ ${seed.key.padEnd(6)} ${issues.length}`)
    issues.slice(0, 12).forEach(line => console.log(`      ${line}`))
    if (issues.length > 12) console.log(`      … и ещё ${issues.length - 12}`)
  } else {
    console.log(`  ✓ ${seed.key.padEnd(6)} чисто`)
  }
}

if (bad) {
  console.log('\nПо правилам:')
  for (const [id, n] of [...perRule].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${id}`)
  console.log(`\nВсего промахов: ${bad}`)
  process.exit(1)
}
console.log('\nВсе конспекты чисты.')
