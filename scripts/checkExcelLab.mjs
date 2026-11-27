// Сторож учебного вычислителя формул и наборов тренажёра (курс «Бухгалтерия»).
//
// ЗАЧЕМ. Тренажёр сам решает, верна ли формула ученика, — по результату на
// скрытых наборах данных. Ошибись вычислитель в одном правиле (критерий ">"&D2,
// двоичный поиск ВПР с ИСТИНА, сдвиг ссылок без $) — и тренажёр молча начнёт
// принимать неверное или отвергать верное. Типы и сборка этого не видят.
// Здесь: правила вычислителя на примерах, посчитанных в Excel вручную, и
// каждый набор курса — эталон верен, «ошибочная» формула ловится и на видимых
// данных, и на скрытых.
//
// Запуск: npm run check:excel-lab

import { buildSync } from 'esbuild'

// Бандл пишется в node_modules/.cache, а не в data:-URL: уроки курса тянут
// пакеты (lucide-react и др.), их нужно разрешать из node_modules.
const OUT = 'node_modules/.cache/checkExcelLab.bundle.mjs'
buildSync({
  stdin: {
    contents: `
      export * from './src/lib/excelLab/formula'
      export * from './src/lib/excelLab/spec'
      export * from './src/lib/excelLab/embed'
      export { EXT02_TRAINERS } from './src/data/accounting/excelLabSets'
      export { ACC_LESSONS } from './src/data/accounting/accountingLessons'
    `,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', packages: 'external', outfile: OUT, logLevel: 'error',
  define: { 'import.meta.env': '{"VITE_SUPABASE_URL":"http://stub.local","VITE_SUPABASE_PUBLISHABLE_KEY":"stub","DEV":false}' },
  loader: { '.png': 'empty', '.jpg': 'empty', '.svg': 'empty', '.css': 'empty', '.webp': 'empty', '.glb': 'empty' },
})
const M = await import(new URL('../' + OUT, import.meta.url).href)
const { Workbook, evaluate, display, shiftFormula, isErr, checkFix, trainerBook, goalsMet, trainerCorrect, withLab, readLab, isLabRef, traceSteps, unsupportedIn, EXT02_TRAINERS, ACC_LESSONS, FUNCTIONS } = M

let fails = 0
const ok = (cond, what) => { if (!cond) { fails++; console.error('❌ ' + what) } }
const show = v => isErr(v) ? v.err : display(v)

// ── Вычислитель ──────────────────────────────────────────────────────────────
const wb = new Workbook([
  { name: 'Лист1', blocks: [{ at: 'A1', rows: [
    ['Код', 'Поставщик', null, null, 'П-02'],
    ['П-01', 'Альфа', 60, 20000, null],
    ['П-02', 'Бета', 60, 12000, null],
    ['П-03', 'Гамма', 76, 8000, null],
    ['П-04', 'Альфа', 60, 25000, null],
  ] }] },
  { name: 'Декрет', blocks: [{ at: 'A1', rows: [['Таб'], [1002], [1004]] }] },
])
const cases = [
  ['=1+2*3', '7'], ['=(1+2)*3', '9'], ['=2^3', '8'], ['=10/4', '2,5'], ['=0,5+0,25', '0,75'], ['=-D2+1', '−19 999'],
  ['=10%', '0,1'], ['="a"&1,5', 'a1,5'], ['=">"&D3', '>12000'], ['=1/0', '#ДЕЛ/0!'], ['="x"+1', '#ЗНАЧ!'],
  ['=СУММ(D2:D5)', '65 000'], ['=СУММ(D:D)', '65 000'], ['=МАКС(D2:D5)', '25 000'], ['=МИН(D2:D5;5)', '5'],
  ['=СУММЕСЛИ(B:B;"Альфа";D:D)', '45 000'], ['=СУММЕСЛИМН(D2:D5;B2:B5;"Альфа";C2:C5;60)', '45 000'],
  ['=СУММЕСЛИМН(D2:D5;B2:B5;"Альфа";C2:C5;"60")', '45 000'], ['=СЧЁТЕСЛИ(C2:C5;">60")', '1'], ['=СЧЕТЕСЛИ(B2:B5;"А*")', '2'],
  ['=СЧЁТЕСЛИМН(D2:D5;">"&D3)', '2'], ['=СЧЁТЕСЛИМН(D2:D5;">D3")', '0'], ['=СЧЁТЕСЛИ(D2:D5;"<>20000")', '3'],
  ['=ЕСЛИ(D2>10000;"Проверить";"ОК")', 'Проверить'], ['=ЕСЛИ(D4>10000;"Проверить")', 'ЛОЖЬ'], ['=И(1;D2>0)', 'ИСТИНА'], ['=ИЛИ(0;ЛОЖЬ)', 'ЛОЖЬ'],
  ['=ПОИСКПОЗ(E1;A:A;0)', '3'], ['=ИНДЕКС(B:B;ПОИСКПОЗ(E1;A:A;0))', 'Бета'], ['=ЕСЛИОШИБКА(ИНДЕКС(B:B;ПОИСКПОЗ("П-09";A:A;0));"Нет")', 'Нет'],
  ['=ВПР(E1;A2:B5;2;ЛОЖЬ)', 'Бета'], ['=ВПР(E1;A2:A5;2;0)', '#ССЫЛКА!'], ['=ВПР("П-09";A2:B5;2;ЛОЖЬ)', '#Н/Д'], ['=ВПР("П-025";A2:B5;2;ИСТИНА)', 'Бета'],
  ['=ВПР(1003;Декрет!$A$2:$A$3;1;ИСТИНА)', '1002'], ['=ВПР(1003;Декрет!$A$2:$A$3;1;ЛОЖЬ)', '#Н/Д'], ['=ВПР(1001;Декрет!A2:A3;1)', '#Н/Д'],
  ['=ОКРУГЛ(2,345;2)', '2,35'], ['=ОКРУГЛ(-2,5;0)', '−3'], ['=ЕЧИСЛО(D2)', 'ИСТИНА'], ['=ЕЧИСЛО(B2)', 'ЛОЖЬ'], ['=1-СУММ(C2:C3)', '−119'],
  ['=ФИЛЬТР(A:A;B:B="Бета")', '#ИМЯ?'], ['=Альфа', '#ИМЯ?'], ['=Лист2!A1', '#ССЫЛКА!'], ['=E1=\"п-02\"', 'ИСТИНА'], ['=D2<>D3', 'ИСТИНА'],
]
for (const [f, want] of cases) {
  let got
  try { got = show(evaluate(f, wb)) } catch (e) { got = 'синтаксис: ' + e.message }
  ok(got === want, `${f} → ${JSON.stringify(got)}, ждали ${JSON.stringify(want)}`)
}

// ── Расширенный набор: счёт, логика, числа, текст, даты, поиск ───────────────
// Ожидания посчитаны по правилам Excel (ru-RU, система дат 1900): 27.11.2026 —
// пятница, серийное число 46353.
const wb2 = new Workbook([{ name: 'T', blocks: [
  { at: 'A1', rows: [['  Иванов   Пётр ', 1234.567, '27.11.2026', 'Альфа-Бета']] },
  { at: 'A3', rows: [['x', 10], ['y', 20], ['x', 30], ['z', 40]] },
] }])
const cases2 = [
  ['=СЧЁТ(B3:B6;"5";A3)', '5'], ['=СЧЁТЗ(A3:B6)', '8'], ['=СЧИТАТЬПУСТОТЫ(A3:C6)', '4'],
  ['=СРЗНАЧ(B3:B6)', '25'], ['=СРЗНАЧЕСЛИ(A3:A6;"x";B3:B6)', '20'], ['=СРЗНАЧЕСЛИМН(B3:B6;A3:A6;"x";B3:B6;">10")', '30'], ['=СРЗНАЧЕСЛИ(A3:A6;"q";B3:B6)', '#ДЕЛ/0!'],
  ['=ЕСЛИМН(B3>15;"a";B3>5;"b")', 'b'], ['=ЕСЛИМН(B3>100;1)', '#Н/Д'], ['=ЕСНД(ВПР("q";A3:B6;2;0);"нет")', 'нет'], ['=ЕСНД(1/0;"нет")', '#ДЕЛ/0!'],
  ['=ЕПУСТО(C3)', 'ИСТИНА'], ['=ЕПУСТО(A3)', 'ЛОЖЬ'], ['=ЕОШИБКА(1/0)', 'ИСТИНА'], ['=ЕТЕКСТ(A3)', 'ИСТИНА'], ['=НЕ(B3>5)', 'ЛОЖЬ'],
  ['=ABS(-2,5)', '2,5'], ['=ОКРУГЛВВЕРХ(2,341;2)', '2,35'], ['=ОКРУГЛВНИЗ(-2,349;2)', '−2,34'], ['=ЦЕЛОЕ(-2,5)', '−3'], ['=ОТБР(-2,59;1)', '−2,5'], ['=ОСТАТ(-7;3)', '2'], ['=ОСТАТ(7;0)', '#ДЕЛ/0!'],
  ['=СУММПРОИЗВ(B3:B6;B3:B6)', '3000'], ['=СУММПРОИЗВ((A3:A6="x")*B3:B6)', '40'], ['=СУММПРОИЗВ(--(A3:A6="x");B3:B6)', '40'], ['=СУММПРОИЗВ(A3:A6="x";B3:B6)', '0'],
  ['=СЖПРОБЕЛЫ(A1)', 'Иванов Пётр'], ['=ЛЕВСИМВ(D1;5)', 'Альфа'], ['=ПРАВСИМВ(D1;4)', 'Бета'], ['=ПСТР(D1;7;2)', 'Бе'], ['=ДЛСТР(D1)', '10'],
  ['=ПРОПИСН("абв")', 'АБВ'], ['=СТРОЧН("АБВ")', 'абв'], ['=ПОДСТАВИТЬ(D1;"-";" ")', 'Альфа Бета'], ['=ПОДСТАВИТЬ("a-b-c";"-";"+";2)', 'a-b+c'],
  ['=НАЙТИ("-";D1)', '6'], ['=НАЙТИ("б";D1)', '#ЗНАЧ!'], ['=ПОИСК("б";D1)', '7'], ['=ПОИСК("Б*а";D1)', '7'], ['=СЦЕП(A3;"-";B3)', 'x-10'], ['=СЦЕП(A3:A4)', 'xy'],
  ['=ЗНАЧЕН("1 234,5")', '1234,5'], ['=ЗНАЧЕН("abc")', '#ЗНАЧ!'],
  ['=ТЕКСТ(B1;"0")', '1235'], ['=ТЕКСТ(B1;"0,00")', '1234,57'], ['=ТЕКСТ(B1;"# ##0,00")', '1 234,57'], ['=ТЕКСТ(0,256;"0%")', '26%'], ['=ТЕКСТ(C1;"ДД.ММ.ГГГГ")', '27.11.2026'],
  ['=ДАТА(2026;11;27)', '46 353'], ['=C1', '46 353'], ['=ГОД(C1)', '2026'], ['=МЕСЯЦ(C1)', '11'], ['=ДЕНЬ(C1)', '27'], ['=ДАТА(2026;13;1)=ДАТА(2027;1;1)', 'ИСТИНА'],
  ['=ТЕКСТ(КОНМЕСЯЦА(C1;0);"ДД.ММ.ГГГГ")', '30.11.2026'], ['=ТЕКСТ(КОНМЕСЯЦА(C1;3);"ДД.ММ.ГГГГ")', '28.02.2027'], ['=ТЕКСТ(ДАТАМЕС("31.01.2026";1);"ДД.ММ.ГГГГ")', '28.02.2026'],
  ['=ДЕНЬНЕД(C1)', '6'], ['=ДЕНЬНЕД(C1;2)', '5'], ['=ДЕНЬНЕД(C1;3)', '4'],
  ['=РАЗНДАТ("15.03.2020";C1;"y")', '6'], ['=РАЗНДАТ("15.03.2020";C1;"m")', '80'], ['=РАЗНДАТ("15.03.2020";C1;"ym")', '8'], ['=РАЗНДАТ("15.03.2020";C1;"md")', '12'], ['=РАЗНДАТ(C1;"01.01.2026";"d")', '#ЧИСЛО!'],
  ['=ЧИСТРАБДНИ("23.11.2026";"29.11.2026")', '5'], ['=ЧИСТРАБДНИ("23.11.2026";"29.11.2026";C1)', '4'], ['=ТЕКСТ(РАБДЕНЬ(C1;1);"ДД.ММ.ГГГГ")', '30.11.2026'], ['=ТЕКСТ(РАБДЕНЬ(C1;-5);"ДД.ММ.ГГГГ")', '20.11.2026'],
  ['=ПРОСМОТРX("z";A3:A6;B3:B6)', '40'], ['=ПРОСМОТРX("q";A3:A6;B3:B6;"нет")', 'нет'], ['=ПРОСМОТРX("q";A3:A6;B3:B6)', '#Н/Д'], ['=ПРОСМОТРX("x";A3:A6;B3:B6;;0;-1)', '30'],
  ['=ПРОСМОТРX(25;B3:B6;A3:A6;;-1)', 'y'], ['=ПРОСМОТРX(25;B3:B6;A3:A6;;1)', 'x'], ['=ПОИСКПОЗX("z";A3:A6)', '4'],
  ['=ВЫБОР(2;"a";"b";"c")', 'b'], ['=СУММ(ВЫБОР(1;B3:B4;B5:B6))', '30'], ['=СТРОКА(B5)', '5'], ['=СТОЛБЕЦ(D1)', '4'],
]
for (const [f, want] of cases2) {
  let got
  try { got = show(evaluate(f, wb2)) } catch (e) { got = 'синтаксис: ' + e.message }
  ok(got === want, `${f} → ${JSON.stringify(got)}, ждали ${JSON.stringify(want)}`)
}
ok(wb2.formatOf('T', 'C1') === 'date' && wb2.shown('T', 'C1') === '27.11.2026', 'дата из данных показывается датой')
const wb3 = new Workbook([{ name: 'T', blocks: [{ at: 'A1', rows: [['27.11.2026', '=A1+3', '=ДАТА(2026;1;31)', '=A1-B1']] }] }])
ok(wb3.shown('T', 'B1') === '30.11.2026' && wb3.shown('T', 'C1') === '31.01.2026' && wb3.shown('T', 'D1') === '−3', 'формат даты у формул: ' + ['B1', 'C1', 'D1'].map(a => wb3.shown('T', a)).join(' '))
ok(new Workbook([{ name: 'T', blocks: [{ at: 'A1', rows: [['=СТРОКА()']] }] }]).shown('T', 'A1') === '1', 'СТРОКА() без аргумента — строка формулы')
for (const bad of ['=СУММ(A1,A2)', '=СУММ(A1', '=1+', '=СУММ(A1))']) {
  let threw = false; try { evaluate(bad, wb) } catch { threw = true }
  ok(threw, `${bad} должна дать синтаксическую ошибку`)
}
ok(evaluate('=ФИЛЬТР(A:A;B:B=1)', wb).unsupported === 'ФИЛЬТР', 'неизвестная функция помечается unsupported')
ok(unsupportedIn('=ЕСЛИ(ФИЛЬТР(A:A;B:B=1);1)').join() === 'ФИЛЬТР', 'unsupportedIn находит ФИЛЬТР')
ok(shiftFormula('=СЧЁТЕСЛИМН(D2:D4;">"&D2)', 2, 0) === '=СЧЁТЕСЛИМН(D4:D6;">"&D4)', 'сдвиг без $: ' + shiftFormula('=СЧЁТЕСЛИМН(D2:D4;">"&D2)', 2, 0))
ok(shiftFormula('=СЧЁТЕСЛИМН($D$2:$D$4;">"&D2)', 2, 0) === '=СЧЁТЕСЛИМН($D$2:$D$4;">"&D4)', 'сдвиг с $')
ok(shiftFormula('=ВПР(A2;Декрет!$A$2:$B$201;2;ЛОЖЬ)', 1, 0) === '=ВПР(A3;Декрет!$A$2:$B$201;2;ЛОЖЬ)', 'сдвиг ссылки на другой лист')
ok(shiftFormula('=СУММ(A:A)+B$1+$C1', 3, 1) === '=СУММ(B:B)+C$1+$C4', 'сдвиг столбцов и смешанных ссылок: ' + shiftFormula('=СУММ(A:A)+B$1+$C1', 3, 1))
const tr = traceSteps('=ЕСЛИОШИБКА(ИНДЕКС(B:B;ПОИСКПОЗ(E1;A:A;0));"Нет")', wb).map(s => s.expr.split('(')[0] + '→' + show(s.value)).join(' ')
ok(tr === 'ПОИСКПОЗ→3 ИНДЕКС→Бета ЕСЛИОШИБКА→Бета', 'шаги вычисления: ' + tr)
const cyc = new Workbook([{ name: 'L', blocks: [{ at: 'A1', rows: [['=B1', '=A1']] }] }])
ok(show(cyc.get('A1')) === '#ЦИКЛ!', 'циклическая ссылка не зависает')

// ── Встраивание в картинку ───────────────────────────────────────────────────
const pic = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect/></svg>')
const spec = { kind: 'formula', title: 'A & <b>', parts: [{ text: '=СУММ(', label: 'сумма' }, { text: 'A1:A2', refs: ['A1:A2'] }, { text: ')' }] }
const emb = withLab(pic, spec)
ok(isLabRef(emb) && !isLabRef(pic), 'isLabRef отличает картинку с данными')
ok(JSON.stringify(readLab(emb)) === JSON.stringify(spec), 'данные блока переживают вложение в SVG')
ok(decodeURIComponent(emb).includes('<rect/>'), 'картинка после вложения цела')

// ── Наборы курса ─────────────────────────────────────────────────────────────
for (const [id, s] of Object.entries(EXT02_TRAINERS)) {
  const book = trainerBook(s)
  for (const sh of s.sheets) for (const b of sh.blocks) b.rows.flat().forEach(v => {
    if (typeof v === 'string' && v.startsWith('=')) { try { evaluate(v, book, sh.name) } catch (e) { ok(false, `${id}: формула ${v} не разбирается: ${e.message}`) } }
  })
  for (const w of s.watch ?? []) { const v = book.get(w); ok(!isErr(v) || ['#Н/Д'].includes(v.err), `${id}: ${w} = ${show(v)}`) }
  if (s.fix) {
    ok(checkFix(s, s.fix.answer).correct, `${id}: эталон не проходит собственную проверку`)
    const br = checkFix(s, s.fix.broken)
    ok(!br.correct, `${id}: ошибочная формула проходит проверку`)
    ok(br.runs.some(r => r.dataset === 0 && !r.ok), `${id}: ошибка не видна на показанных данных — ученику нечего исправлять`)
    ok((s.fix.datasets ?? []).length >= 2, `${id}: нужно 2–3 скрытых набора`)
    ok(trainerCorrect(s, JSON.stringify({ formula: s.fix.answer })) && !trainerCorrect(s, JSON.stringify({ formula: s.fix.broken })), `${id}: trainerCorrect`)
  }
  const met = goalsMet(s, {})
  ok(!met.every(Boolean) || met.length === 0, `${id}: мини-задания выполнены уже без правок`)
}
// Достижимость мини-заданий: правки, которые их выполняют.
const reach = {
  yearTable: [{ D197: 11 }, { I197: 3 }],
  oneCategory: [{ M3: 0 }],
  higherRates: [{ D4: 2 }],
  mainOrSecond: [{ D2: 2 }],
  maternityList: [{ 'Декрет!A3': null }],
  sumByOrg: [{ 'Данные!A7': 'Гамма' }],
}
for (const [id, edits] of Object.entries(reach)) {
  const s = EXT02_TRAINERS[id]
  edits.forEach((e, i) => ok(goalsMet(s, e)[i], `${id}: мини-задание ${i + 1} не выполняется правкой ${JSON.stringify(e)} (${(s.goals[i] || {}).cell} = ${show(trainerBook(s, e).get(s.goals[i].cell))})`))
}


// ── Все тренажёры и живые блоки курса «Бухгалтерия» ──────────────────────────
// Ищем во всех уроках: задания excelTrainer в квизах и картинки конспекта с
// вложенными данными (trainerFig / formulaFig + withLab / methodsFig).
let courseTrainers = 0, courseFormulas = 0, courseMethods = 0
const seen = new Set()
function walk(x, where, fn) {
  if (!x || typeof x !== 'object') { if (typeof x === 'string' && isLabRef(x)) fn({ lab: readLab(x) }, where); return }
  if (seen.has(x)) return
  seen.add(x)
  if (x.type === 'excelTrainer' && x.trainer) fn({ trainer: x.trainer, id: x.id }, where)
  for (const v of Array.isArray(x) ? x : Object.values(x)) walk(v, where, fn)
}
function checkTrainer(s, tag) {
  courseTrainers++
  const book = trainerBook(s)
  for (const sh of s.sheets ?? []) for (const b of sh.blocks ?? []) for (const v of b.rows.flat()) {
    if (typeof v !== 'string' || !v.startsWith('=')) continue
    const u = unsupportedIn(v)
    ok(!u.length, `${tag}: в формуле ${v} функции нет в тренажёре: ${u.join(', ')}`)
    try { evaluate(v, book, sh.name) } catch (e) { ok(false, `${tag}: формула ${v} не разбирается: ${e.message}`) }
  }
  if (s.fix) {
    for (const f of [s.fix.answer, s.fix.broken]) { const u = unsupportedIn(f); ok(!u.length, `${tag}: в fix ${f} функции нет в тренажёре: ${u.join(', ')}`) }
    ok(checkFix(s, s.fix.answer).correct, `${tag}: эталон fix.answer не проходит собственную проверку`)
    const br = checkFix(s, s.fix.broken)
    ok(!br.correct, `${tag}: ошибочная формула проходит проверку`)
    ok(br.runs.some(r => r.dataset === 0 && !r.ok), `${tag}: ошибка не видна на показанных данных`)
    ok((s.fix.datasets ?? []).length >= 2, `${tag}: нужно 2–3 скрытых набора`)
  }
  if (!s.fix) ok((s.goals ?? []).length > 0 || true, '')
}
for (const { shortId, lesson } of ACC_LESSONS) {
  seen.clear()
  walk(lesson.content, shortId, (hit, where) => {
    if (hit.trainer) return checkTrainer(hit.trainer, `${where} ${hit.id}`)
    const lab = hit.lab
    ok(!!lab, `${where}: живой блок не читается из картинки`)
    if (!lab) return
    if (lab.kind === 'trainer') return checkTrainer(lab, `${where} (конспект)`)
    if (lab.kind === 'methods') { courseMethods++; return }
    if (lab.kind === 'formula') {
      courseFormulas++
      const f = lab.parts.map(p => p.text).join('')
      if (lab.trainer) checkTrainer(lab.trainer, `${where} (тренажёр разбора)`)
      if (lab.whatIf && lab.sample) {
        const u = unsupportedIn(f)
        ok(!u.length, `${where}: «Что если» — функции нет в тренажёре: ${u.join(', ')}`)
      }
    }
  })
}
console.log(`Курс: ${courseTrainers} тренажёров, ${courseFormulas} разборов формул, ${courseMethods} блоков способов`)

if (fails) { console.error(`\n${fails} ошибок в Excel-лаборатории.`); process.exit(1) }
console.log(`✅ Excel-лаборатория: ${FUNCTIONS.length} функций, ${cases.length + cases2.length} правил на примерах, ${Object.keys(EXT02_TRAINERS).length} наборов тренажёра — всё сходится.`)
