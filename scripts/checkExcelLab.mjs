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

const out = buildSync({
  stdin: {
    contents: `
      export * from './src/lib/excelLab/formula'
      export * from './src/lib/excelLab/spec'
      export * from './src/lib/excelLab/embed'
      export { EXT02_TRAINERS } from './src/data/accounting/excelLabSets'
    `,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', write: false, platform: 'neutral', logLevel: 'error',
})
const M = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'))
const { Workbook, evaluate, display, shiftFormula, isErr, checkFix, trainerBook, goalsMet, trainerCorrect, withLab, readLab, isLabRef, traceSteps, unsupportedIn, EXT02_TRAINERS } = M

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
  ['=ПРОСМОТРX(E1;A:A;B:B)', '#ИМЯ?'], ['=Альфа', '#ИМЯ?'], ['=Лист2!A1', '#ССЫЛКА!'], ['=E1=\"п-02\"', 'ИСТИНА'], ['=D2<>D3', 'ИСТИНА'],
]
for (const [f, want] of cases) {
  let got
  try { got = show(evaluate(f, wb)) } catch (e) { got = 'синтаксис: ' + e.message }
  ok(got === want, `${f} → ${JSON.stringify(got)}, ждали ${JSON.stringify(want)}`)
}
for (const bad of ['=СУММ(A1,A2)', '=СУММ(A1', '=1+', '=СУММ(A1))']) {
  let threw = false; try { evaluate(bad, wb) } catch { threw = true }
  ok(threw, `${bad} должна дать синтаксическую ошибку`)
}
ok(evaluate('=ПРОСМОТРX(1;A:A;B:B)', wb).unsupported === 'ПРОСМОТРX', 'неизвестная функция помечается unsupported')
ok(unsupportedIn('=ЕСЛИ(ПРОСМОТРX(1;A:A;B:B);1)').join() === 'ПРОСМОТРX', 'unsupportedIn находит ПРОСМОТРX')
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
  yearTable: [{ D197: 118, F197: 3 }, { D197: 120, F197: 11 }],
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

if (fails) { console.error(`\n${fails} ошибок в Excel-лаборатории.`); process.exit(1) }
console.log(`✅ Excel-лаборатория: ${cases.length} формул, ${Object.keys(EXT02_TRAINERS).length} наборов тренажёра — всё сходится.`)
