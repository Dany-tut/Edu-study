// Стенд Excel-лаборатории курса «Бухгалтерия» (dev-excel-lab.html).
//
// ЗАЧЕМ. Живые блоки конспекта и задания тренажёра есть только в курсе, а урок
// открывается лишь записанному ученику. Здесь — те же блоки без базы:
//   ?view=formula — разбор формулы (данные как у accFigures.formulaFig + withLab);
//   ?view=trainer&q=0..5 — наборы EXT02 в конспекте (своя кнопка «Проверить»);
//   ?view=flow — домашка целиком (HomeworkFlow) с заданиями excelTrainer;
//   ?view=methods&task=automation|oneoff — способы решения и выбор версии;
//   ?view=editor — редактор задания у учителя;
//   ?view=prompt — окно «Какой у вас Excel?» первого урока (сбрасывает выбор в браузере);
//   ?view=settings — «Настройки обучения» на странице; ?view=settingsBtn — кнопка с окном.
// ?p=pc|ipad|iphone|android — хром версии; ?theme=dark; ?iphone=1/?ipad=1 — детект версии в dev.
import './lib/platform'
import './store/studentDataStore'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PLATFORM, type Platform } from './lib/platform'
import ExcelLabFigure from './components/excelLab/ExcelLabFigure'
import { ExcelSettingsPanel, FirstLessonExcelPrompt, ExcelSettingsButton } from './components/excelLab/ExcelVersion'
import ExcelTrainerEditor from './components/teacher/ExcelTrainerEditor'
import HomeworkFlow from './components/HomeworkFlow'
import { EXT02_TRAINERS } from './data/accounting/excelLabSets'
import { trainerFig, methodsFig } from './lib/excelLab/figures'
import { withLab } from './lib/excelLab/embed'
import { toDataUri, sheet } from './data/svgSheet'
import { qxl } from './data/lessonAuthoring'
import type { TrainerSpec } from './lib/excelLab/spec'
import type { LessonHomework } from './data/lessonContent'
import './index.css'

const q = new URLSearchParams(location.search)
if (q.get('theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark')
const platform = (q.get('p') as Platform | null) ?? PLATFORM
document.documentElement.dataset.platform = platform
const view = q.get('view') ?? 'formula'
const phone = platform === 'iphone' || platform === 'android'
const sets = Object.values(EXT02_TRAINERS) as TrainerSpec[]

// Разбор формулы — те же данные, что у статичной схемы formulaFig.
const formulaSrc = withLab(toDataUri(sheet(640, 120, 'ИНДЕКС + ПОИСКПОЗ по частям', '')), {
  kind: 'formula', title: 'ИНДЕКС + ПОИСКПОЗ по частям',
  parts: [
    { text: '=ЕСЛИОШИБКА(', label: 'ЕСЛИОШИБКА: если внутри ошибка — показать «Нет»' },
    { text: 'ИНДЕКС(', label: 'ИНДЕКС: берёт значение из столбца по номеру строки', refs: ['B:B'] },
    { text: 'B:B', label: 'откуда берём ответ: столбец B', refs: ['B:B'] },
    { text: ';' },
    { text: 'ПОИСКПОЗ(', label: 'ПОИСКПОЗ: находит, в какой строке лежит код', refs: ['E2', 'A:A'] },
    { text: 'E2', label: 'что ищем: код «П-02»', refs: ['E2'] },
    { text: ';' },
    { text: 'A:A', label: 'где ищем: весь столбец A', refs: ['A:A'] },
    { text: ';' },
    { text: '0', label: 'тип сопоставления 0 — только точное совпадение' },
    { text: '));' },
    { text: '"Нет"', label: 'что показать, если кода нет' },
    { text: ')' },
  ],
  steps: [
    ['E2', '«П-02»', ['E2']],
    ['ПОИСКПОЗ("П-02";A:A;0)', '3', ['A3']],
    ['ИНДЕКС(B:B;3)', '«Бета»', ['B3']],
    ['ЕСЛИОШИБКА("Бета";"Нет")', '«Бета»'],
  ],
  sample: { name: 'Поставщики', blocks: [{ at: 'A1', rows: [['Код', 'Поставщик'], ['П-01', 'Альфа'], ['П-02', 'Бета'], ['П-03', 'Гамма'], ['П-04', 'Дельта']] }, { at: 'E1', rows: [['Ищем код'], ['П-02']] }] },
  note: 'Формула проверена учебным вычислителем, в Excel не запускалась.',
  whatIf: { text: 'Что если в E2 будет «П-09»?', edits: { E2: 'П-09' }, expect: 'ПОИСКПОЗ даст #Н/Д, и ЕСЛИОШИБКА вернёт «Нет».' },
  trainer: {
    sheets: [{ name: 'Поставщики', blocks: [{ at: 'A1', rows: [['Код', 'Поставщик'], ['П-01', 'Альфа'], ['П-02', 'Бета'], ['П-03', 'Гамма'], ['П-04', 'Дельта']] }, { at: 'E1', rows: [['Ищем код', 'Результат'], ['П-02', '=ЕСЛИОШИБКА(ИНДЕКС(B:B;ПОИСКПОЗ(E2;A:A;0));"Нет")']] }] }],
    editable: ['E2', 'B2:B5'], watch: ['F2'],
    goals: [{ text: 'Найдите поставщика с кодом П-03', cell: 'F2', equals: 'Гамма' }, { text: 'Получите «Нет»', cell: 'F2', equals: 'Нет' }],
  },
})

const methodsSrc = methodsFig({
  title: 'Сумма оплат поставщику по месяцам', task: (q.get('task') as 'automation' | 'oneoff') ?? 'automation',
  methods: [
    { id: 'simple', steps: ['Отфильтруйте выписку по контрагенту «Альфа».', 'Выделите столбец сумм — внизу справа Excel покажет «Сумма».'] },
    { id: 'formulas', steps: ['Встаньте в свободную ячейку, например G2.', 'Введите формулу и нажмите Enter.'], formula: '=СУММЕСЛИМН(D2:D40;B2:B40;"Альфа";C2:C40;60)', requires: ['sumifs'] },
    { id: 'powerQuery', steps: ['Данные → Получить данные → Из файла → Из книги.', 'Фильтр по контрагенту, группировка по месяцу, сумма.', 'Закрыть и загрузить. В следующем месяце — «Обновить всё».'], requires: ['power-query'] },
    { id: 'vba', steps: ['Alt+F11 → вставить модуль со сводом.', 'Запуск макросом по кнопке.'] },
    { id: 'modern', steps: ['Одна формула фильтрует и складывает.'], formula: '=СУММ(ФИЛЬТР(D2:D40;(B2:B40="Альфа")*(C2:C40=60)))', requires: ['filter'] },
  ],
})

const homework: LessonHomework = {
  title: 'Тренажёр Excel', subtitle: 'Бухгалтерия', recommendationScore: 2, hasHardLevel: false,
  levels: [
    { id: 'basic', title: 'Базовый', shortLabel: 'Базовый', kind: 'quiz', motivation: 'Отчёт численности: формулы по шагам.', dueDate: '2026-11-30', estimatedMinutes: 10,
      questions: sets.map((s, i) => qxl(`xl-stand-${i}`, s.fix ? 'Формула считает неверно. Исправьте её — проверим и на других данных.' : 'Поменяйте значения и выполните мини-задания.', s, s.fix?.mistake ?? '')) },
    { id: 'hard', title: 'Сложный', shortLabel: 'Сложный', kind: 'teacher-review', optional: true, unlockScore: 2, motivation: '—', dueDate: '2026-11-30', estimatedMinutes: 5,
      teacherTask: { topic: '—', prompt: '—', teacherNote: '', placeholder: '', acceptedFormats: ['текст'] } },
  ],
}

function Editor() {
  const [spec, setSpec] = useState<TrainerSpec | undefined>(sets[2])
  return <ExcelTrainerEditor value={spec} onChange={setSpec} accent={{ color: 'var(--color-purple-text)', bg: 'var(--color-purple-soft)', fill: 'var(--color-purple)' }} />
}

createRoot(document.getElementById('root')!).render(
  <div style={{ minHeight: '100dvh', background: 'var(--color-bg)', color: 'var(--color-text)', padding: phone ? '56px 12px 32px' : platform === 'ipad' ? '40px 116px 40px 32px' : '40px 32px' }}>
    <div style={{ maxWidth: view === 'flow' ? 1100 : 1000, margin: '0 auto' }}>
      {view === 'formula' && <ExcelLabFigure src={formulaSrc} caption="Схема 1 из 2 · ИНДЕКС + ПОИСКПОЗ по частям" />}
      {view === 'trainer' && <ExcelLabFigure key={q.get('q')} src={trainerFig(sets[Number(q.get('q') ?? 0) % sets.length])} caption="Тренажёр · отчёт численности" />}
      {view === 'methods' && <ExcelLabFigure src={methodsSrc} caption="Способы решения" />}
      {view === 'editor' && <Editor />}
      {view === 'prompt' && <><div className="xl-muted">Урок 1 · Знакомство с курсом</div><FirstLessonExcelPrompt /></>}
      {view === 'settings' && <ExcelSettingsPanel onDone={() => {}} />}
      {view === 'settingsBtn' && <ExcelSettingsButton courseTitle="Бухгалтерия" />}
      {view === 'flow' && <HomeworkFlow lessonId="xl-stand" lessonTitle="Тренажёр Excel" subject="Бухгалтерия" homework={homework} onBack={() => {}} />}
    </div>
  </div>,
)
