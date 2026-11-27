# Формат данных: разбор формулы, тренажёр, способы решения (Excel-лаборатория)

27.11.2026. Код — `src/lib/excelLab/*`, компоненты — `src/components/excelLab/*`, наборы EXT02 — `src/data/accounting/excelLabSets.ts`, стенд — `dev-excel-lab.html`, сторож — `npm run check:excel-lab`. Концепт — Figma «Искра», стр. 28.
Всё — данные курса; компоненты экрана ничего про конкретные уроки не знают.

## Общая модель ячеек
```ts
type XlValue = number | string | boolean | null   // строка, начинающаяся с '=', — формула
// адреса: 'D14', '$D$14', 'A:A', 'D2:D4', 'Декрет!$A$2:$B$201', "'Лист 1'!A1"
// числа в данных — числами (1.5), в формулах — с запятой (=ОКРУГЛ(A1;2), 0,5)
```
Лист: `{ name: 'Лист1', blocks: [{ at: 'A13', rows: XlValue[][] }] }` — `at` = левый верхний угол блока. Несмежные блоки (строка 14 и строки 196–197) рисуются одной таблицей с разрывом «…».

## 1. Разбор формулы — блок конспекта (заменяет `formulaFig`)
Сигнатура `formulaFig(title, parts, steps, opts)` НЕ меняется, добавлены необязательные поля:
```ts
interface FormulaPart { text: string; label?: string; refs?: string[] }   // refs — что подсветить в мини-таблице
steps: Array<[expr: string, result: string] | [expr, result, refs: string[]]>
opts: {
  note?: string
  sample?: XlSheet | XlSheet[]        // мини-таблица примера (первая строка блока может быть заголовками)
  headers?: Record<string, string>    // 'A': 'Код' — подписи столбцов, если заголовков нет в rows
}
```
Встраивание: в конце `formulaFig` вместо `return toDataUri(svg)` —
```ts
import { withLab } from '../../lib/excelLab/embed'
return withLab(toDataUri(svg), { kind: 'formula', title, parts, steps, ...opts })
```
Картинка остаётся (старые сборки приложения и печать показывают её), новая сборка рисует по тем же данным живой разбор: цвет частей, подписи по нажатию, шаги, подсветка `refs`.
Без `refs`/`sample` разбор тоже работает — просто без мини-таблицы.

## 2. Тренажёр — тип задания `excelTrainer` (+ песочница в конспекте)
В квизе/ДЗ: `qxl(id, prompt, spec, explanation)` из `lessonAuthoring.ts`.
В конспекте (просто поиграть, без оценки): `{ after, caption, src: trainerFig(spec) }` из `src/lib/excelLab/figures.ts`.
```ts
interface ExcelTrainerSpec {
  sheets: XlSheet[]                  // первый — основной; остальные (Декрет, Данные) — вкладками
  editable: string[]                 // что ученик может менять: 'D14', 'F14:G14', 'Декрет!A2:A6'
  watch?: string[]                   // результаты крупно, с «было → стало»: ['H14','K14','L14']
  headers?: Record<string, string>   // 'D': 'Штат' (ключ — столбец основного листа или 'Лист!D')
  goals?: { text: string; cell: string; equals: XlValue }[]   // мини-задания «меняйте значения»
  fix?: {
    cell: string                     // где стоит формула
    broken: string                   // ошибочная формула — её видит и правит ученик
    answer: string                   // эталон, не показывается
    fill?: string[]                  // куда формулу «протянули» — так ловится забытый $
    datasets: Record<string, XlValue>[]   // 2–3 скрытых набора подмен ячеек
    hints?: string[]                 // до 2 подсказок
    mistake?: string                 // разбор после ответа: в чём была ошибка
  }
}
```
Проверка «исправь»: формула ученика ставится в `cell` (+ сдвигается в `fill`, как при протягивании), считается на видимых данных и на каждом `datasets`; верно, если все значения совпали с эталоном. Текст формулы не сравнивается — любая верная засчитывается.
Без `fix`: оценивается по `goals` (все выполнены); без `goals` — практика без оценки.

Вычислитель (только учебное подмножество): + − * / ^, &, = <> < > <= >=, СУММ, СУММЕСЛИ, СУММЕСЛИМН, СЧЁТЕСЛИ, СЧЁТЕСЛИМН (критерии `">"&D2`, `"<>0"`, `"Альфа"`), ЕСЛИ, И, ИЛИ, ЕСЛИОШИБКА, ВПР (ЛОЖЬ/0 и ИСТИНА — см. ниже), ИНДЕКС, ПОИСКПОЗ (0), МАКС, МИН, ОКРУГЛ, ЕЧИСЛО. Ошибки Excel: #Н/Д, #ССЫЛКА!, #ЗНАЧ!, #ДЕЛ/0!, #ИМЯ?. Неизвестная функция → «В учебном тренажёре этой функции нет».
ВПР с ИСТИНА считается как в Excel по отсортированному столбцу (двоичный поиск), чтобы ошибка «ИСТИНА вместо ЛОЖЬ» была видна на данных.

## 3. Способы решения — блок конспекта (выбор версии Excel)
```ts
methodsFig({
  task: 'automation' | 'oneoff',
  methods: [{ id: 'simple'|'formulas'|'powerQuery'|'vba'|'modern', title?: string,
              requires?: string[],   // id из EXCEL_FEATURES (excelCompat.ts): 'power-query', 'xlookup', 'filter', 'vba'
              steps: string[], formula?: string }]
})
```
«Ваш вариант»: automation → powerQuery, если версия 2016+ или «не знаю»; иначе formulas. oneoff → modern, если все requires есть в версии; иначе formulas. При «не знаю» функции 2021+ помечены «проверьте в своей версии». Версия — в настройках ученика (одна на ученика), спрашивается шторкой в первом уроке с таким блоком.

`excelCompat.ts` беру из вашей ветки (81ef5f37) копией без изменений; правьте у себя, при слиянии берём вашу версию.

## Где что живёт в коде
- `src/lib/excelLab/formula.ts` — учебный вычислитель (лексер, парсер, функции, сдвиг ссылок при протягивании, шаги вычисления).
- `src/lib/excelLab/spec.ts` — типы данных и проверка «исправь формулу» (`checkFix`, `trainerCorrect`).
- `src/lib/excelLab/embed.ts` — `withLab`/`readLab`: данные блока внутри SVG-картинки конспекта.
- `src/lib/excelLab/figures.ts` — `trainerFig`, `methodsFig` для конспекта.
- `src/lib/excelLab/excelVersion.ts` — версия Excel ученика (`students.preferences.excel` через `save_student_excel`, миграция 20261127131724) и выбор «ваш вариант».
- Тип задания `excelTrainer` — `taskTypes.ts`, хелпер `qxl` — `lessonAuthoring.ts`, редактор учителя — `teacher/ExcelTrainerEditor.tsx` (JSON с проверкой и предпросмотром).

## Ограничения
- Не Excel: только функции списка; формат чисел — общий, даты не моделируются.
- Банк заданий (task_bank) тип `excelTrainer` не принимает — задания живут в уроках курса.
