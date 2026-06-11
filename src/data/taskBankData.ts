export type Subject = 'biology' | 'chemistry'

export type QuestionType = 'choice' | 'free'
export type ScoreMode = 'perOption' | 'criteria' | 'whole'

// The shape of the answer block the student fills in. Drives both the teacher
// editor (which inputs to show) and the student card (how to render/check).
//  single   — radio, one correct option            → answer like "Б"
//  multi    — checkboxes, several correct           → answer like "АБГ" / "24"
//  short    — one input: word / number / formula    → answer like "Палеонтология"
//  matching — two columns, map А→2, Б→1…            → answer like "А2 Б1 В3"
//  sequence — order the items                       → answer like "3142"
//  tableFill— complete the "?" cell(s) of a table   → answer = the missing term
//  extended — long free text + photo, criteria      → answer = reference answer
export type AnswerType =
  | 'single' | 'multi' | 'short' | 'matching' | 'sequence' | 'tableFill' | 'extended'

// One answer option for a choice-type question. `points` is used only in the
// 'perOption' scoring mode.
export interface TaskChoice { id: string; text: string; correct: boolean; points?: number }
// A keyword the student's free-text answer is scored against ('perOption' free mode).
export interface TaskAnswerKey { id: string; keyword: string; points: number }
// One rubric line for the 'criteria' scoring mode.
export interface TaskCriterion { id: string; text: string; points: number }

export interface Task {
  id: number
  subject: Subject
  section: string
  topic: string
  part: 1 | 2
  line: number
  source: string
  question: string
  questionTable?: { headers: string[]; rows: string[][] }
  questionImage?: string
  answer: string
  solution: string
  difficulty: 'easy' | 'medium' | 'hard'
  // ── Optional rich scoring (used by the teacher trainer/homework editors) ──
  // All optional so the existing seed tasks above keep working untouched; a task
  // with none of these set is treated as a plain free-answer, whole-task question.
  questionType?: QuestionType
  scoreMode?: ScoreMode
  choices?: TaskChoice[]
  answerKeys?: TaskAnswerKey[]
  criteria?: TaskCriterion[]
  criteriaVisibleOnCheck?: boolean
  maxPoints?: number
  // ── Rich answer-block fields (set by the teacher block constructor) ──
  // `answerType` selects the input the student gets; the type-specific config
  // below feeds the renderer. Tasks without `answerType` stay plain short-answer.
  answerType?: AnswerType
  // matching: left fixed prompts (А, Б, В…) + right options (1, 2, 3…)
  matchLeft?: string[]
  matchRight?: string[]
  // sequence: items to be ordered (correct order is encoded in `answer`)
  sequenceItems?: string[]
  // whether a free-text answer also lets the student attach a photo of the work
  allowPhoto?: boolean
}

export const BIOLOGY_SECTIONS = ['Биология как наука', 'Клетка', 'Организм', 'Экосистемы', 'Эволюция', 'Человек']
export const CHEMISTRY_SECTIONS = ['Неорганическая химия', 'Органическая химия', 'Химические реакции', 'Вещества и смеси', 'Электрохимия']

export const BIOLOGY_TOPICS: Record<string, string[]> = {
  'Биология как наука': ['Разделы биологии', 'Методы биологии', 'Уровни организации'],
  'Клетка': ['Строение клетки', 'Обмен веществ', 'Деление клетки', 'Прокариоты и эукариоты'],
  'Организм': ['Размножение', 'Генетика', 'Онтогенез', 'Изменчивость'],
  'Экосистемы': ['Экологические факторы', 'Биогеоценоз', 'Круговорот веществ', 'Сукцессии'],
  'Эволюция': ['Теории эволюции', 'Движущие силы', 'Видообразование', 'Макроэволюция'],
  'Человек': ['Анатомия', 'Физиология', 'Гигиена', 'Нервная система'],
}

export const CHEMISTRY_TOPICS: Record<string, string[]> = {
  'Неорганическая химия': ['Классификация веществ', 'Оксиды', 'Кислоты', 'Соли', 'Основания'],
  'Органическая химия': ['Углеводороды', 'Спирты', 'Карбоновые кислоты', 'Полимеры'],
  'Химические реакции': ['Типы реакций', 'Скорость реакции', 'Равновесие', 'Электролиз'],
  'Вещества и смеси': ['Атомное строение', 'ПСЭ', 'Химическая связь', 'Растворы'],
  'Электрохимия': ['Гальванический элемент', 'Коррозия', 'Электролиз расплавов'],
}

export const SOURCES = ['ЕГЭ 2023', 'ЕГЭ 2024', 'ЕГЭ 2025', 'Досрочный 2024', 'Пробный 2025', 'Авторский']

export const tasks: Task[] = []

const _deadMockData = [
  {
    id: 315,
    subject: 'biology',
    section: 'Биология как наука',
    topic: 'Разделы биологии',
    part: 1,
    line: 1,
    source: 'ЕГЭ 2023',
    question: 'Рассмотрите таблицу «Биология — комплексная наука» и заполните ячейку, вписав соответствующий термин.',
    questionTable: {
      headers: ['Раздел биологии', 'Предмет изучения'],
      rows: [
        ['Анатомия', 'Строение внутренних органов'],
        ['?', 'Ископаемые переходные формы организмов'],
      ],
    },
    answer: 'Палеонтология',
    solution: 'Палеонтология — раздел биологии, изучающий ископаемые останки живых организмов, в том числе переходные формы. Анатомия изучает строение внутренних органов, а палеонтология исследует вымерших существ, в том числе переходные формы.',
    difficulty: 'easy',
  },
  {
    id: 316,
    subject: 'biology',
    section: 'Биология как наука',
    topic: 'Методы биологии',
    part: 1,
    line: 1,
    source: 'ЕГЭ 2023',
    question: 'Установите соответствие между примером и методом научного исследования: 1) описание внешнего строения растения, 2) скрещивание двух пород кошек, 3) изучение препарата под микроскопом.',
    answer: '1 — наблюдение, 2 — эксперимент, 3 — наблюдение',
    solution: 'Описание строения — метод наблюдения (фиксируем признаки без вмешательства). Скрещивание — эксперимент (активное вмешательство). Микроскопия — наблюдение с применением прибора.',
    difficulty: 'easy',
  },
  {
    id: 401,
    subject: 'biology',
    section: 'Клетка',
    topic: 'Строение клетки',
    part: 1,
    line: 2,
    source: 'ЕГЭ 2024',
    question: 'Какую функцию выполняет клеточная мембрана? Выберите все верные ответы.\nА) барьерная\nБ) транспортная\nВ) синтез белка\nГ) рецепторная\nД) хранение ДНК',
    answer: 'АБГ',
    solution: 'Клеточная мембрана выполняет барьерную функцию (отделяет клетку), транспортную (избирательный транспорт веществ) и рецепторную (восприятие сигналов). Синтез белка — функция рибосом. Хранение ДНК — функция ядра.',
    difficulty: 'medium',
  },
  {
    id: 402,
    subject: 'biology',
    section: 'Клетка',
    topic: 'Обмен веществ',
    part: 1,
    line: 3,
    source: 'ЕГЭ 2024',
    question: 'В процессе гликолиза образуются 2 молекулы пировиноградной кислоты. Какой чистый выход АТФ в этом процессе?',
    answer: '2 АТФ',
    solution: 'При гликолизе на подготовительном этапе тратится 2 АТФ, а при субстратном фосфорилировании образуется 4 АТФ. Чистый выход: 4 − 2 = 2 АТФ.',
    difficulty: 'medium',
  },
  {
    id: 500,
    subject: 'biology',
    section: 'Организм',
    topic: 'Генетика',
    part: 2,
    line: 6,
    source: 'ЕГЭ 2025',
    question: 'У родителей с генотипами AaBb × Aabb (независимое наследование). Определите процент потомства с генотипом AAbb.',
    answer: '12,5%',
    solution: 'AaBb × Aabb: по локусу A — Aa × Aa → AA(1/4), Aa(1/2), aa(1/4); по локусу B — Bb × bb → Bb(1/2), bb(1/2). Вероятность AAbb = 1/4 × 1/2 = 1/8 = 12,5%.',
    difficulty: 'hard',
  },
  {
    id: 501,
    subject: 'biology',
    section: 'Эволюция',
    topic: 'Движущие силы',
    part: 1,
    line: 4,
    source: 'Досрочный 2024',
    question: 'Какой из перечисленных факторов эволюции обладает направляющим действием?',
    answer: 'Естественный отбор',
    solution: 'Только естественный отбор носит направленный характер — он сохраняет полезные изменения и устраняет вредные. Мутации и дрейф генов — случайные ненаправленные факторы.',
    difficulty: 'easy',
  },
  {
    id: 602,
    subject: 'biology',
    section: 'Человек',
    topic: 'Нервная система',
    part: 1,
    line: 5,
    source: 'Пробный 2025',
    question: 'В каком отделе головного мозга находятся центры дыхания и сердечной деятельности?',
    answer: 'Продолговатый мозг',
    solution: 'Продолговатый мозг — нижний отдел ствола мозга. В нём расположены жизненно важные центры: дыхания, сердечной деятельности, сосудодвигательный и др.',
    difficulty: 'easy',
  },
  {
    id: 700,
    subject: 'biology',
    section: 'Экосистемы',
    topic: 'Круговорот веществ',
    part: 2,
    line: 7,
    source: 'ЕГЭ 2025',
    question: 'Объясните, почему при переходе с одного трофического уровня на другой происходит потеря энергии. Укажите не менее трёх причин.',
    answer: 'Расход на дыхание, теплоотдача, неусваиваемые части',
    solution: '1) Значительная часть энергии рассеивается в виде тепла при клеточном дыхании. 2) Часть биомассы не потребляется (гибель, накопление в детрите). 3) Часть потреблённой пищи не усваивается и выделяется с экскрементами. Поэтому КПД передачи — около 10%.',
    difficulty: 'hard',
  },

  // CHEMISTRY
  {
    id: 1001,
    subject: 'chemistry',
    section: 'Неорганическая химия',
    topic: 'Классификация веществ',
    part: 1,
    line: 1,
    source: 'ЕГЭ 2024',
    question: 'Установите соответствие между формулой вещества и его классом:\n1) NaOH  2) SO₃  3) H₂SO₄  4) Na₂SO₄\nА) кислота  Б) основание  В) оксид  Г) соль',
    answer: '1-Б, 2-В, 3-А, 4-Г',
    solution: 'NaOH — гидроксид натрия, основание. SO₃ — оксид серы (VI), кислотный оксид. H₂SO₄ — серная кислота. Na₂SO₄ — сульфат натрия, соль.',
    difficulty: 'easy',
  },
  {
    id: 1002,
    subject: 'chemistry',
    section: 'Химические реакции',
    topic: 'Типы реакций',
    part: 1,
    line: 2,
    source: 'ЕГЭ 2023',
    question: 'К реакциям замещения относится взаимодействие:\nА) Fe + CuSO₄\nБ) CaO + H₂O\nВ) 2HgO → 2Hg + O₂\nГ) NaOH + HCl',
    answer: 'А',
    solution: 'Fe + CuSO₄ → FeSO₄ + Cu — реакция замещения: более активный металл вытесняет менее активный из раствора соли. Б — соединения, В — разложения, Г — обмена.',
    difficulty: 'easy',
  },
  {
    id: 1100,
    subject: 'chemistry',
    section: 'Органическая химия',
    topic: 'Углеводороды',
    part: 1,
    line: 3,
    source: 'ЕГЭ 2025',
    question: 'Какой из углеводородов относится к алкинам?\nА) C₂H₄  Б) C₂H₂  В) C₂H₆  Г) C₆H₆',
    answer: 'Б',
    solution: 'C₂H₂ — ацетилен (этин), первый представитель алкинов (тройная связь). C₂H₄ — этилен (алкен), C₂H₆ — этан (алкан), C₆H₆ — бензол (арен).',
    difficulty: 'easy',
  },
  {
    id: 1200,
    subject: 'chemistry',
    section: 'Электрохимия',
    topic: 'Электролиз расплавов',
    part: 2,
    line: 8,
    source: 'Досрочный 2024',
    question: 'Составьте уравнения полуреакций при электролизе расплава хлорида натрия. Укажите продукты электролиза.',
    answer: 'Катод: 2Na⁺ + 2e⁻ → 2Na; Анод: 2Cl⁻ − 2e⁻ → Cl₂↑',
    solution: 'При электролизе расплава NaCl:\nКатод (восстановление): 2Na⁺ + 2e⁻ → 2Na\nАнод (окисление): 2Cl⁻ − 2e⁻ → Cl₂↑\nОбщее уравнение: 2NaCl → 2Na + Cl₂↑\nПродукты: металлический натрий и газообразный хлор.',
    difficulty: 'hard',
  },
  {
    id: 1300,
    subject: 'chemistry',
    section: 'Вещества и смеси',
    topic: 'Химическая связь',
    part: 1,
    line: 2,
    source: 'Пробный 2025',
    question: 'В каком ряду все вещества имеют ковалентную полярную связь?\nА) H₂, HCl, CO₂\nБ) HCl, H₂O, NH₃\nВ) NaCl, HCl, H₂O\nГ) O₂, N₂, H₂',
    answer: 'Б',
    solution: 'В ряду Б все три вещества (HCl, H₂O, NH₃) содержат только ковалентные полярные связи. H₂, O₂, N₂ — неполярные ковалентные. NaCl — ионная связь.',
    difficulty: 'medium',
  },
  {
    id: 1400,
    subject: 'chemistry',
    section: 'Неорганическая химия',
    topic: 'Кислоты',
    part: 1,
    line: 4,
    source: 'ЕГЭ 2023',
    question: 'Какая из кислот является многоосновной?\nА) HCl  Б) HNO₃  В) H₃PO₄  Г) CH₃COOH',
    answer: 'В',
    solution: 'H₃PO₄ — фосфорная кислота, трёхосновная (три иона H⁺). HCl и HNO₃ — одноосновные. CH₃COOH — уксусная кислота, тоже одноосновная (один подвижный H⁺).',
    difficulty: 'easy',
  },
]
