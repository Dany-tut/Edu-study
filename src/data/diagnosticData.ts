// Pre-designed diagnostic test questions for biology and chemistry.
// Teachers can view and edit these in Constructor → Тестирование.

export type DiagSubject = 'biology' | 'chemistry'

export interface DiagQuestion {
  id: string
  section: string
  text: string
  options: string[]   // exactly 4
  correct: number     // 0-indexed
}

export type DiagResults = Record<string, { correct: number; total: number }>

// ── Biology ────────────────────────────────────────────────────────────────────

export const BIOLOGY_DIAG_QUESTIONS: DiagQuestion[] = [
  // Молекулярная биология
  {
    id: 'bio-1',
    section: 'Молекулярная биология',
    text: 'Какой нуклеотид входит только в состав РНК (но не ДНК)?',
    options: ['Тимин', 'Урацил', 'Цитозин', 'Гуанин'],
    correct: 1,
  },
  {
    id: 'bio-2',
    section: 'Молекулярная биология',
    text: 'Функция рибосомы в клетке:',
    options: ['Синтез АТФ', 'Синтез ДНК', 'Синтез белка', 'Расщепление жиров'],
    correct: 2,
  },
  {
    id: 'bio-3',
    section: 'Молекулярная биология',
    text: 'В процессе трансляции информация считывается с молекулы:',
    options: ['ДНК', 'тРНК', 'иРНК', 'рРНК'],
    correct: 2,
  },
  // Клетка
  {
    id: 'bio-4',
    section: 'Строение клетки',
    text: 'Какой органоид отсутствует у прокариот?',
    options: ['Рибосомы', 'Клеточная мембрана', 'Митохондрии', 'Цитоплазма'],
    correct: 2,
  },
  {
    id: 'bio-5',
    section: 'Строение клетки',
    text: 'В каком органоиде синтезируется АТФ при аэробном дыхании?',
    options: ['Хлоропласт', 'Рибосома', 'Лизосома', 'Митохондрия'],
    correct: 3,
  },
  {
    id: 'bio-6',
    section: 'Строение клетки',
    text: 'Фагоцитоз — это:',
    options: [
      'Синтез белков на рибосомах',
      'Активный захват твёрдых частиц клеткой',
      'Транспорт ионов через мембрану',
      'Деление клетки',
    ],
    correct: 1,
  },
  // Обмен веществ
  {
    id: 'bio-7',
    section: 'Обмен веществ',
    text: 'Конечный продукт гликолиза (в анаэробных условиях у животных):',
    options: ['CO₂ и вода', 'Глюкоза', 'Молочная кислота', 'Кислород'],
    correct: 2,
  },
  {
    id: 'bio-8',
    section: 'Обмен веществ',
    text: 'В световую фазу фотосинтеза происходит:',
    options: [
      'Фиксация CO₂ и синтез глюкозы',
      'Синтез крахмала',
      'Фотолиз воды и синтез АТФ',
      'Восстановление НАДФ·Н₂',
    ],
    correct: 2,
  },
  {
    id: 'bio-9',
    section: 'Обмен веществ',
    text: 'Сколько молекул АТФ образуется при полном окислении одной молекулы глюкозы?',
    options: ['2', '10', '36–38', '100'],
    correct: 2,
  },
  // Наследственность
  {
    id: 'bio-10',
    section: 'Наследственность и изменчивость',
    text: 'При скрещивании гомозиготных особей AA × aa в F₁ получается:',
    options: ['Только AA', 'Только Aa', 'Только aa', '1 AA : 2 Aa : 1 aa'],
    correct: 1,
  },
  {
    id: 'bio-11',
    section: 'Наследственность и изменчивость',
    text: 'Мутации в половых клетках:',
    options: [
      'Не передаются потомству',
      'Всегда летальны',
      'Передаются потомству',
      'Встречаются только у растений',
    ],
    correct: 2,
  },
  {
    id: 'bio-12',
    section: 'Наследственность и изменчивость',
    text: 'Закон независимого наследования Менделя выполняется, если гены расположены:',
    options: [
      'В одной хромосоме (сцеплены)',
      'В разных парах гомологичных хромосом',
      'В одном локусе',
      'Только на половых хромосомах',
    ],
    correct: 1,
  },
  // Эволюция и экология
  {
    id: 'bio-13',
    section: 'Эволюция',
    text: 'Главная движущая сила эволюции по Дарвину:',
    options: [
      'Мутации',
      'Дрейф генов',
      'Естественный отбор',
      'Изоляция популяций',
    ],
    correct: 2,
  },
  {
    id: 'bio-14',
    section: 'Экология',
    text: 'Организмы, синтезирующие органику из неорганических веществ, называются:',
    options: ['Гетеротрофы', 'Деструкторы', 'Паразиты', 'Автотрофы'],
    correct: 3,
  },
  {
    id: 'bio-15',
    section: 'Экология',
    text: 'Какой уровень биологической организации изучает экология?',
    options: ['Молекулярный', 'Клеточный', 'Организменный', 'Популяционно-биосферный'],
    correct: 3,
  },
]

// ── Chemistry ──────────────────────────────────────────────────────────────────

export const CHEMISTRY_DIAG_QUESTIONS: DiagQuestion[] = [
  // Строение атома
  {
    id: 'chem-1',
    section: 'Строение атома и ПСЭ',
    text: 'Какой элемент обладает наибольшей электроотрицательностью?',
    options: ['Кислород', 'Хлор', 'Фтор', 'Азот'],
    correct: 2,
  },
  {
    id: 'chem-2',
    section: 'Строение атома и ПСЭ',
    text: 'Число электронов в ионе Ca²⁺ (Z = 20):',
    options: ['22', '20', '18', '24'],
    correct: 2,
  },
  {
    id: 'chem-3',
    section: 'Строение атома и ПСЭ',
    text: 'В периодической системе металлические свойства усиливаются при движении:',
    options: [
      'Слева направо по периоду',
      'Справа налево по периоду и сверху вниз по группе',
      'Снизу вверх по группе',
      'По диагонали справа налево',
    ],
    correct: 1,
  },
  // Химическая связь
  {
    id: 'chem-4',
    section: 'Химическая связь',
    text: 'Тип химической связи в молекуле NaCl:',
    options: ['Ковалентная неполярная', 'Ковалентная полярная', 'Ионная', 'Металлическая'],
    correct: 2,
  },
  {
    id: 'chem-5',
    section: 'Химическая связь',
    text: 'Водородная связь характерна для:',
    options: ['CH₄', 'CCl₄', 'H₂O', 'NaCl'],
    correct: 2,
  },
  {
    id: 'chem-6',
    section: 'Химическая связь',
    text: 'Гибридизация атома углерода в молекуле CH₄:',
    options: ['sp', 'sp²', 'sp³', 'sp³d'],
    correct: 2,
  },
  // Классы соединений
  {
    id: 'chem-7',
    section: 'Классы неорганических соединений',
    text: 'При взаимодействии кислотного оксида SO₃ с водой образуется:',
    options: ['Основание', 'Серная кислота', 'Соль', 'Оксид серы (IV)'],
    correct: 1,
  },
  {
    id: 'chem-8',
    section: 'Классы неорганических соединений',
    text: 'Na₂CO₃ — это:',
    options: ['Кислота', 'Основание', 'Средняя соль', 'Кислотный оксид'],
    correct: 2,
  },
  {
    id: 'chem-9',
    section: 'Классы неорганических соединений',
    text: 'Амфотерный гидроксид — это соединение, которое реагирует:',
    options: [
      'Только с кислотами',
      'Только с основаниями',
      'Как с кислотами, так и с основаниями',
      'Только с водой',
    ],
    correct: 2,
  },
  // Реакции
  {
    id: 'chem-10',
    section: 'Химические реакции',
    text: 'Реакция нейтрализации — это взаимодействие:',
    options: ['Двух солей', 'Кислоты и основания', 'Металла с кислотой', 'Двух оксидов'],
    correct: 1,
  },
  {
    id: 'chem-11',
    section: 'Химические реакции',
    text: 'В реакции 2H₂ + O₂ → 2H₂O водород является:',
    options: ['Окислителем', 'Восстановителем', 'Катализатором', 'Продуктом реакции'],
    correct: 1,
  },
  {
    id: 'chem-12',
    section: 'Химические реакции',
    text: 'Скорость гомогенной реакции увеличивается при:',
    options: [
      'Понижении температуры',
      'Уменьшении концентрации реагентов',
      'Повышении температуры и концентрации',
      'Удалении катализатора',
    ],
    correct: 2,
  },
  // Органика
  {
    id: 'chem-13',
    section: 'Органическая химия',
    text: 'К предельным углеводородам (алканам) относится:',
    options: ['Этилен C₂H₄', 'Ацетилен C₂H₂', 'Этан C₂H₆', 'Бензол C₆H₆'],
    correct: 2,
  },
  {
    id: 'chem-14',
    section: 'Органическая химия',
    text: 'Реакция этерификации — это взаимодействие:',
    options: [
      'Двух кислот',
      'Спирта с карбоновой кислотой',
      'Альдегида с основанием',
      'Двух спиртов',
    ],
    correct: 1,
  },
  {
    id: 'chem-15',
    section: 'Органическая химия',
    text: 'Гидролиз белков приводит к образованию:',
    options: ['Нуклеотидов', 'Жирных кислот', 'Аминокислот', 'Моносахаридов'],
    correct: 2,
  },
]

export const DEFAULT_QUESTIONS: Record<DiagSubject, DiagQuestion[]> = {
  biology: BIOLOGY_DIAG_QUESTIONS,
  chemistry: CHEMISTRY_DIAG_QUESTIONS,
}

const LS_BIO = 'diag-questions-biology'
const LS_CHEM = 'diag-questions-chemistry'

export function loadDiagQuestions(subject: DiagSubject): DiagQuestion[] {
  try {
    const key = subject === 'biology' ? LS_BIO : LS_CHEM
    const s = localStorage.getItem(key)
    return s ? JSON.parse(s) : DEFAULT_QUESTIONS[subject]
  } catch {
    return DEFAULT_QUESTIONS[subject]
  }
}

export function saveDiagQuestions(subject: DiagSubject, qs: DiagQuestion[]) {
  const key = subject === 'biology' ? LS_BIO : LS_CHEM
  localStorage.setItem(key, JSON.stringify(qs))
}

export function loadDiagResults(subject: DiagSubject): DiagResults | null {
  try {
    const s = localStorage.getItem(`diag-results-${subject}`)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

export function saveDiagResults(subject: DiagSubject, results: DiagResults) {
  localStorage.setItem(`diag-results-${subject}`, JSON.stringify(results))
}
