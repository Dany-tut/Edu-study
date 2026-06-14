// Pre-designed diagnostic test questions for biology, chemistry, and logic screening.
// Teachers can view and edit these in Constructor → Тестирование.

import { supabase } from '../lib/supabase'

export type DiagSubject = 'biology' | 'chemistry' | 'logic'

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

// ── Biology extras: Анатомия, Зоология, Ботаника ─────────────────────────────

export const BIOLOGY_EXTRA_QUESTIONS: DiagQuestion[] = [
  // Анатомия человека
  {
    id: 'bio-16',
    section: 'Анатомия человека',
    text: 'Основная функция эритроцитов крови:',
    options: ['Защита от инфекций', 'Свёртывание крови', 'Перенос кислорода и CO₂', 'Синтез антител'],
    correct: 2,
  },
  {
    id: 'bio-17',
    section: 'Анатомия человека',
    text: 'В каком отделе пищеварительного тракта происходит основное всасывание питательных веществ?',
    options: ['Желудок', 'Тонкий кишечник', 'Толстый кишечник', 'Двенадцатиперстная кишка'],
    correct: 1,
  },
  {
    id: 'bio-18',
    section: 'Анатомия человека',
    text: 'Антитела (иммуноглобулины) синтезируются:',
    options: ['T-лимфоцитами', 'Нейтрофилами', 'B-лимфоцитами', 'Тромбоцитами'],
    correct: 2,
  },
  {
    id: 'bio-19',
    section: 'Анатомия человека',
    text: 'Какой орган является главным органом детоксикации в организме человека?',
    options: ['Почки', 'Лёгкие', 'Селезёнка', 'Печень'],
    correct: 3,
  },
  // Зоология
  {
    id: 'bio-20',
    section: 'Зоология',
    text: 'Кит относится к классу:',
    options: ['Рыбы', 'Пресмыкающиеся', 'Млекопитающие', 'Земноводные'],
    correct: 2,
  },
  {
    id: 'bio-21',
    section: 'Зоология',
    text: 'Чем насекомые отличаются от паукообразных?',
    options: [
      'Наличием хитинового покрова',
      '6 ногами против 8 у паукообразных',
      'Отсутствием нервной системы',
      'Способностью к метаморфозу',
    ],
    correct: 1,
  },
  {
    id: 'bio-22',
    section: 'Зоология',
    text: 'Земноводные откладывают яйца:',
    options: [
      'На суше, в твёрдой скорлупе',
      'В воде, без твёрдой оболочки',
      'В почве, в коконе',
      'Живородящие — яиц не откладывают',
    ],
    correct: 1,
  },
  // Ботаника
  {
    id: 'bio-23',
    section: 'Ботаника',
    text: 'Ксилема растений проводит:',
    options: [
      'Органические вещества от листьев к корням',
      'Воду и минеральные соли от корней к листьям',
      'Кислород из листьев к корням',
      'Глюкозу от корней к побегам',
    ],
    correct: 1,
  },
  {
    id: 'bio-24',
    section: 'Ботаника',
    text: 'Камбий — это образовательная ткань, обеспечивающая:',
    options: [
      'Фотосинтез в листьях',
      'Проведение воды по стеблю',
      'Рост стебля в толщину',
      'Поглощение воды корнями',
    ],
    correct: 2,
  },
  {
    id: 'bio-25',
    section: 'Ботаника',
    text: 'При перекрёстном опылении пыльца переносится:',
    options: [
      'С тычинки на пестик того же цветка',
      'С цветка одного растения на цветок другого растения того же вида',
      'Только с помощью насекомых',
      'Внутри одного соцветия',
    ],
    correct: 1,
  },
]

// ── Logic / Cognitive screening ───────────────────────────────────────────────
// 18 questions across 6 cognitive dimensions.
// Sections map to teacher-visible "сильные стороны" of the student.

export const LOGIC_DIAG_QUESTIONS: DiagQuestion[] = [
  // Числовые паттерны
  {
    id: 'log-1',
    section: 'Числовые паттерны',
    text: 'Продолжи последовательность: 2, 4, 8, 16, ?',
    options: ['24', '32', '20', '64'],
    correct: 1,
  },
  {
    id: 'log-2',
    section: 'Числовые паттерны',
    text: 'Продолжи последовательность: 1, 4, 9, 16, ?',
    options: ['20', '23', '25', '36'],
    correct: 2,
  },
  {
    id: 'log-3',
    section: 'Числовые паттерны',
    text: 'Разности между соседними числами: 100, 90, 81, 73, ?. Найди следующее.',
    options: ['65', '66', '68', '64'],
    correct: 1,
  },
  // Вербальные аналогии
  {
    id: 'log-4',
    section: 'Вербальные аналогии',
    text: 'Врач : Больница = Учитель : ?',
    options: ['Ученик', 'Школа', 'Урок', 'Класс'],
    correct: 1,
  },
  {
    id: 'log-5',
    section: 'Вербальные аналогии',
    text: 'Птица : Крылья = Рыба : ?',
    options: ['Хвост', 'Жабры', 'Плавники', 'Чешуя'],
    correct: 2,
  },
  {
    id: 'log-6',
    section: 'Вербальные аналогии',
    text: 'Горячий : Холодный = Быстрый : ?',
    options: ['Сильный', 'Медленный', 'Тихий', 'Лёгкий'],
    correct: 1,
  },
  // Логические исключения
  {
    id: 'log-7',
    section: 'Логические исключения',
    text: 'Что лишнее? Кошка, Собака, Орёл, Корова.',
    options: ['Кошка', 'Собака', 'Орёл', 'Корова'],
    correct: 2,
  },
  {
    id: 'log-8',
    section: 'Логические исключения',
    text: 'Что лишнее? 2, 4, 5, 6, 8.',
    options: ['2', '4', '5', '8'],
    correct: 2,
  },
  {
    id: 'log-9',
    section: 'Логические исключения',
    text: 'Что лишнее? Треугольник, Квадрат, Ромб, Круг.',
    options: ['Треугольник', 'Квадрат', 'Ромб', 'Круг'],
    correct: 3,
  },
  // Математические вычисления
  {
    id: 'log-10',
    section: 'Математические вычисления',
    text: '3 ручки стоят 45 рублей. Сколько стоят 7 ручек?',
    options: ['95 руб', '105 руб', '100 руб', '115 руб'],
    correct: 1,
  },
  {
    id: 'log-11',
    section: 'Математические вычисления',
    text: '25% от 80 равно:',
    options: ['15', '25', '20', '40'],
    correct: 2,
  },
  {
    id: 'log-12',
    section: 'Математические вычисления',
    text: 'Поезд едет со скоростью 90 км/ч. За 2 часа он проедет:',
    options: ['180 км', '45 км', '200 км', '160 км'],
    correct: 0,
  },
  // Пространственное мышление
  {
    id: 'log-13',
    section: 'Пространственное мышление',
    text: 'Лист бумаги сложили пополам, потом ещё раз пополам. Сколько получилось слоёв?',
    options: ['2', '3', '4', '8'],
    correct: 2,
  },
  {
    id: 'log-14',
    section: 'Пространственное мышление',
    text: 'Куб разрезали вертикально ровно посередине. Сколько граней у каждой полученной половины?',
    options: ['4', '5', '6', '3'],
    correct: 1,
  },
  {
    id: 'log-15',
    section: 'Пространственное мышление',
    text: 'Квадрат 4×4 разрезали на квадраты 1×1. Сколько получилось кусков?',
    options: ['8', '12', '16', '4'],
    correct: 2,
  },
  // Причинно-следственные связи
  {
    id: 'log-16',
    section: 'Причинно-следственные связи',
    text: 'Если убрать из экосистемы всех хищников, то численность травоядных...',
    options: [
      'Резко сократится',
      'Останется прежней',
      'Резко вырастет, а затем упадёт из-за нехватки пищи',
      'Будет плавно расти бесконечно',
    ],
    correct: 2,
  },
  {
    id: 'log-17',
    section: 'Причинно-следственные связи',
    text: 'При резком увеличении концентрации CO₂ в атмосфере средняя температура Земли...',
    options: [
      'Понизится — CO₂ охлаждает воздух',
      'Повысится — усилится парниковый эффект',
      'Не изменится — CO₂ не влияет на климат',
      'Сначала понизится, потом повысится',
    ],
    correct: 1,
  },
  {
    id: 'log-18',
    section: 'Причинно-следственные связи',
    text: 'Ученик занимается по 1 часу каждый день вместо 7 часов один раз в неделю. Что произойдёт?',
    options: [
      'Ничего не изменится — суммарное время одинаковое',
      'Материал запомнится хуже — нужны длинные сессии',
      'Материал запомнится лучше — интервальное повторение эффективнее',
      'Усталость накопится быстрее',
    ],
    correct: 2,
  },
]

export const DEFAULT_QUESTIONS: Record<DiagSubject, DiagQuestion[]> = {
  biology: [...BIOLOGY_DIAG_QUESTIONS, ...BIOLOGY_EXTRA_QUESTIONS],
  chemistry: CHEMISTRY_DIAG_QUESTIONS,
  logic: LOGIC_DIAG_QUESTIONS,
}

export function loadDiagQuestions(subject: DiagSubject): DiagQuestion[] {
  try {
    const s = localStorage.getItem(`diag-questions-${subject}`)
    return s ? JSON.parse(s) : DEFAULT_QUESTIONS[subject]
  } catch {
    return DEFAULT_QUESTIONS[subject]
  }
}

export function saveDiagQuestions(subject: DiagSubject, qs: DiagQuestion[]) {
  localStorage.setItem(`diag-questions-${subject}`, JSON.stringify(qs))
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

// ── Anonymous (pre-registration) test results ──────────────────────────────────

export interface AnonDiagResult {
  id: string
  name: string
  subject: DiagSubject
  timestamp: string     // ISO date (mapped from created_at)
  results: DiagResults
  answers: Record<string, number>
  linkedStudentId?: string
}

function rowToResult(row: Record<string, unknown>): AnonDiagResult {
  return {
    id: row.id as string,
    name: row.name as string,
    subject: row.subject as DiagSubject,
    timestamp: row.created_at as string,
    results: row.results as DiagResults,
    answers: row.answers as Record<string, number>,
    linkedStudentId: (row.linked_student_id as string | null) ?? undefined,
  }
}

export async function loadAnonResults(): Promise<AnonDiagResult[]> {
  const { data, error } = await supabase
    .from('diag_results')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('loadAnonResults:', error); return [] }
  return (data ?? []).map(rowToResult)
}

export async function appendAnonResult(r: Omit<AnonDiagResult, 'id' | 'timestamp'>): Promise<AnonDiagResult | null> {
  const { data, error } = await supabase
    .from('diag_results')
    .insert({ name: r.name, subject: r.subject, results: r.results, answers: r.answers })
    .select()
    .single()
  if (error) { console.error('appendAnonResult:', error); return null }
  return rowToResult(data)
}

export async function linkAnonResult(id: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('diag_results')
    .update({ linked_student_id: studentId })
    .eq('id', id)
  if (error) console.error('linkAnonResult:', error)
}

export async function unlinkAnonResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('diag_results')
    .update({ linked_student_id: null })
    .eq('id', id)
  if (error) console.error('unlinkAnonResult:', error)
}

export async function deleteAnonResult(id: string): Promise<void> {
  const { error } = await supabase
    .from('diag_results')
    .delete()
    .eq('id', id)
  if (error) console.error('deleteAnonResult:', error)
}
