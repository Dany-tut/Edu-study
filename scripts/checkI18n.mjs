// Сторож английского интерфейса: у каждой строки, обёрнутой в t(), есть перевод.
//
// ЗАЧЕМ. Словарь в src/lib/i18n.ts устроен так, что ключ — это сама русская
// строка, а незнакомый ключ молча отдаёт русский оригинал (см. комментарий в
// i18n.ts). Это удобно — интерфейс никогда не рендерится пустым, — но у этого
// есть цена: обернуть строку в t() и НЕ добавить перевод ничего не ломает.
// Сборка зелёная, тесты зелёные, и только человек с английским языком видит
// русскую фразу посреди английского экрана. Заметить это можно, лишь открыв
// нужный экран с переключённым языком, а экранов сотни. Поэтому — скриптом.
//
// ЧТО СЧИТАЕМ ДЫРОЙ (валит сборку):
//   строка под t(...) / tr(...), которой нет ключом в словаре.
// Это ровно тот случай, когда автор сказал «эту строку переводить» и забыл
// дописать перевод. Порог — ноль: такие дыры дёшево закрывать сразу.
//
// ЧТО НЕ СЧИТАЕМ ДЫРОЙ:
//   1. Голая кириллическая строка, которая ЕСТЬ в словаре. В этом репозитории
//      главный паттерн — таблица данных с русскими подписями плюс t() на месте
//      отрисовки: WIDGET_REGISTRY, SECTIONS в ProductMock, вкладки тренажёра,
//      названия тарифов в plan.ts, тексты ошибок входа в authErrors.ts. Строка
//      в объявлении голая, но пользователю она достаётся уже переведённой.
//   2. Файлы из DATA — там кириллица это не интерфейс, а лингвистические
//      данные: таблицы транслитерации, служебные слова для сверки ответа.
//      Переводить их нельзя, они сломаются.
//   3. Всё в src/data — контент курсов, у него свои сторожа.
//
// ВТОРАЯ ПРОВЕРКА — ДУБЛИ КЛЮЧЕЙ. Словарь это обычный объектный литерал на
// несколько тысяч записей, и повторный ключ в нём не ошибка, а тихая замена:
// вторая запись затирает первую. По собранному объекту это невидимо, поэтому
// дубли ищутся по исходному тексту файла.
//
// Запуск: npm run check:i18n

import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const DICT = 'src/lib/i18n.ts'

// Кириллица здесь — данные, а не интерфейс. Пополнять список осознанно.
const DATA = new Set([
  'src/lib/translit.ts',     // таблицы транслитерации ru↔ko/ja
  'src/lib/answerMatch.ts',  // служебные слова для сверки ответа по смыслу
  'src/lib/pairing.ts',      // стоп-слова для подбора пар
])

const CYR = /[А-Яа-яЁё]/

// Ключи словаря: строка в одинарных ИЛИ двойных кавычках перед двоеточием,
// с начала строки файла — так вложенные объекты и комментарии не мешают.
const src = readFileSync(DICT, 'utf8')
const dict = new Set()
const dups = []
for (const m of src.matchAll(/^\s*(['"])((?:[^'"\\]|\\.)*?)\1\s*:/gm)) {
  const key = m[2]
  if (dict.has(key)) dups.push(key)
  dict.add(key)
}

const files = execSync("find src -name '*.ts' -o -name '*.tsx'", { encoding: 'utf8' })
  .trim().split('\n')
  .filter(f => f && f !== DICT && !f.startsWith('src/data/') && !DATA.has(f))

// Строковый литерал, перед которым может стоять t( или tr(.
const LIT = /\b(t|tr)\(\s*(['"`])((?:[^'"`\\\n]|\\.)*?)\2|(['"`])((?:[^'"`\\\n]|\\.)*?)\4/g

const holes = new Map()   // строка под t() без перевода → где впервые встретилась
const bare = new Map()    // голая строка, которой нет и в словаре
let wrapped = 0

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(LIT)) {
    const inT = m[1] !== undefined
    const value = inT ? m[3] : m[5]
    if (!CYR.test(value)) continue
    if (inT) {
      wrapped++
      if (!dict.has(value) && !holes.has(value)) holes.set(value, file)
    } else if (!dict.has(value) && !bare.has(value)) {
      bare.set(value, file)
    }
  }
}

const byFile = new Map()
for (const [text, file] of holes) {
  if (!byFile.has(file)) byFile.set(file, [])
  byFile.get(file).push(text)
}

console.log('─'.repeat(60))
console.log(`словарь: ${dict.size} записей · под t(): ${wrapped} вхождений`)

if (holes.size) {
  console.log(`❌ под t(), но без перевода: ${holes.size}`)
  for (const [file, list] of [...byFile].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  ${file} (${list.length})`)
    for (const text of list.slice(0, 12)) console.log(`    ${text.slice(0, 100)}`)
    if (list.length > 12) console.log(`    … ещё ${list.length - 12}`)
  }
  console.log(`\nПеревод дописывается в ${DICT}: ключ — русская строка целиком.`)
} else {
  console.log('✅ всё, что обёрнуто в t(), переведено')
}

console.log(dups.length ? `❌ дублей ключей: ${dups.length} — ${dups.slice(0, 5).join(' · ')}` : '✅ дублей ключей нет')

// Справочно, сборку не валит: строки, до которых t() не дошёл вовсе. Тут много
// заведомо непереводимого (фикстуры, ключевые слова распознавания, маркеры
// разметки), поэтому это подсказка человеку, а не правило.
if (bare.size) {
  const top = new Map()
  for (const [, file] of bare) top.set(file, (top.get(file) ?? 0) + 1)
  const list = [...top].sort((a, b) => b[1] - a[1]).slice(0, 6)
  console.log(`\nℹ️  строк вообще без t() и без перевода: ${bare.size}`)
  for (const [file, n] of list) console.log(`    ${String(n).padStart(3)}  ${file}`)
  console.log('    (часть из них переводить не нужно — фикстуры, ключевые слова, маркеры)')
}

process.exit(holes.size || dups.length ? 1 : 0)
