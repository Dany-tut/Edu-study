// Pre-designed diagnostic test questions for biology, chemistry, and logic screening.
// Teachers can view and edit these in Constructor → Тестирование.

import { supabase } from '../lib/supabase'

export type DiagSubject = 'biology' | 'chemistry' | 'logic' | 'ap-chem-ru' | 'ap-chem-en'

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
  // ── 1. Строение атома и ПСЭ ───────────────────────────────────────────────
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
  {
    id: 'chem-3b',
    section: 'Строение атома и ПСЭ',
    text: 'Электронная конфигурация атома серы (Z = 16) в основном состоянии:',
    options: ['1s²2s²2p⁶3s²3p²', '1s²2s²2p⁶3s²3p⁴', '1s²2s²2p⁶3s²3p⁶', '1s²2s²2p⁴3s²3p⁶'],
    correct: 1,
  },
  // ── 2. Химическая связь ───────────────────────────────────────────────────
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
  {
    id: 'chem-6b',
    section: 'Химическая связь',
    text: 'Молекула H₂O является полярной, потому что:',
    options: [
      'Кислород — самый электроотрицательный элемент',
      'Молекула имеет угловую форму и связи полярны',
      'Водород образует водородные связи',
      'Молекула имеет линейную форму',
    ],
    correct: 1,
  },
  // ── 3. Классы неорганических соединений ──────────────────────────────────
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
  {
    id: 'chem-9b',
    section: 'Классы неорганических соединений',
    text: 'Какая из перечисленных солей подвергается гидролизу по катиону?',
    options: ['KNO₃', 'NaCl', 'CuSO₄', 'K₂SO₄'],
    correct: 2,
  },
  // ── 4. ОВР и степени окисления (боль!) ───────────────────────────────────
  {
    id: 'chem-ovr-1',
    section: 'ОВР и степени окисления',
    text: 'Степень окисления серы в H₂SO₄:',
    options: ['-2', '0', '+4', '+6'],
    correct: 3,
  },
  {
    id: 'chem-ovr-2',
    section: 'ОВР и степени окисления',
    text: 'В реакции Fe + 2HCl → FeCl₂ + H₂ восстановителем является:',
    options: ['HCl', 'H₂', 'Fe', 'FeCl₂'],
    correct: 2,
  },
  {
    id: 'chem-ovr-3',
    section: 'ОВР и степени окисления',
    text: 'Степень окисления хлора в KClO₃:',
    options: ['-1', '0', '+5', '+7'],
    correct: 2,
  },
  {
    id: 'chem-ovr-4',
    section: 'ОВР и степени окисления',
    text: 'Какой процесс называется окислением?',
    options: [
      'Присоединение электронов',
      'Отдача электронов и повышение степени окисления',
      'Понижение степени окисления',
      'Присоединение кислорода только в органике',
    ],
    correct: 1,
  },
  // ── 5. Ионные реакции и электролиты (боль!) ──────────────────────────────
  {
    id: 'chem-ion-1',
    section: 'Ионные реакции и электролиты',
    text: 'Какое из перечисленных веществ является сильным электролитом?',
    options: ['CH₃COOH', 'H₂O', 'NH₃', 'HNO₃'],
    correct: 3,
  },
  {
    id: 'chem-ion-2',
    section: 'Ионные реакции и электролиты',
    text: 'Ионная реакция протекает до конца, если образуется:',
    options: [
      'Растворимая соль',
      'Осадок, газ или слабый электролит (вода)',
      'Только кислота',
      'Любое новое вещество',
    ],
    correct: 1,
  },
  {
    id: 'chem-ion-3',
    section: 'Ионные реакции и электролиты',
    text: 'Краткое ионное уравнение H⁺ + OH⁻ → H₂O отражает реакцию:',
    options: [
      'Нейтрализации любой кислоты и любого основания',
      'Нейтрализации сильной кислоты сильным основанием',
      'Растворения кислоты в воде',
      'Гидролиза соли',
    ],
    correct: 1,
  },
  {
    id: 'chem-ion-4',
    section: 'Ионные реакции и электролиты',
    text: 'Раствор какой соли имеет щелочную реакцию среды (pH > 7)?',
    options: ['NH₄Cl', 'NaCl', 'Na₂CO₃', 'FeCl₃'],
    correct: 2,
  },
  // ── 6. Химические реакции ─────────────────────────────────────────────────
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
  {
    id: 'chem-12b',
    section: 'Химические реакции',
    text: 'По принципу Ле Шателье при повышении давления равновесие сместится в сторону:',
    options: [
      'Реагентов всегда',
      'Меньшего числа молей газа',
      'Большего числа молей газа',
      'Давление не влияет на равновесие',
    ],
    correct: 1,
  },
  // ── 7. Органическая химия ─────────────────────────────────────────────────
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
  {
    id: 'chem-15b',
    section: 'Органическая химия',
    text: 'Характерная реакция алкенов (этилен, пропилен) — это:',
    options: [
      'Замещение (галогенирование без катализатора)',
      'Присоединение (гидрирование, галогенирование)',
      'Дегидрирование',
      'Разложение',
    ],
    correct: 1,
  },
  // ── 8. Расчёты по формулам и уравнениям (боль!) ──────────────────────────
  {
    id: 'chem-calc-1',
    section: 'Расчёты и стехиометрия',
    text: 'Молярная масса серной кислоты H₂SO₄:',
    options: ['49 г/моль', '80 г/моль', '98 г/моль', '64 г/моль'],
    correct: 2,
  },
  {
    id: 'chem-calc-2',
    section: 'Расчёты и стехиометрия',
    text: 'Сколько молей NaCl содержится в 117 г вещества (M = 58,5 г/моль)?',
    options: ['1 моль', '2 моля', '0,5 моля', '4 моля'],
    correct: 1,
  },
  {
    id: 'chem-calc-3',
    section: 'Расчёты и стехиометрия',
    text: 'По уравнению 2H₂ + O₂ → 2H₂O из 4 моль H₂ образуется воды:',
    options: ['2 моля', '4 моля', '6 молей', '1 моль'],
    correct: 1,
  },
  {
    id: 'chem-calc-4',
    section: 'Расчёты и стехиометрия',
    text: 'Объём 2 молей любого газа при н.у. (STP, 0°C, 101,3 кПа) равен:',
    options: ['11,2 л', '22,4 л', '44,8 л', '33,6 л'],
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

// ── AP Chemistry (Russian) ────────────────────────────────────────────────────

export const AP_CHEM_RU_QUESTIONS: DiagQuestion[] = [
  // Атомная структура
  { id: 'apcru-1', section: 'Атомная структура', text: 'Квантовое число, определяющее форму орбитали:', options: ['Главное (n)', 'Орбитальное (l)', 'Магнитное (mₗ)', 'Спиновое (mₛ)'], correct: 1 },
  { id: 'apcru-2', section: 'Атомная структура', text: 'Изотопы отличаются друг от друга:', options: ['Числом протонов', 'Числом электронов', 'Числом нейтронов', 'Зарядом ядра'], correct: 2 },
  { id: 'apcru-3', section: 'Атомная структура', text: 'Электронная конфигурация иона Fe³⁺ (железо — Z=26):', options: ['[Ar] 3d⁶ 4s⁰', '[Ar] 3d⁵ 4s⁰', '[Ar] 3d⁶ 4s²', '[Ar] 3d⁴ 4s¹'], correct: 1 },
  // Химическая связь
  { id: 'apcru-4', section: 'Химическая связь и молекулярная структура', text: 'Молекула CO₂ имеет форму:', options: ['Угловую', 'Линейную', 'Тетраэдрическую', 'Тригонально-плоскостную'], correct: 1 },
  { id: 'apcru-5', section: 'Химическая связь и молекулярная структура', text: 'По теории VSEPR молекула SF₆ имеет геометрию:', options: ['Октаэдрическую', 'Тригонально-бипирамидальную', 'Тетраэдрическую', 'Квадратно-планарную'], correct: 0 },
  { id: 'apcru-6', section: 'Химическая связь и молекулярная структура', text: 'Гибридизация углерода в молекуле ацетилена C₂H₂:', options: ['sp³', 'sp²', 'sp', 'dsp²'], correct: 2 },
  // Межмолекулярные силы
  { id: 'apcru-7', section: 'Межмолекулярные силы', text: 'Самый сильный тип межмолекулярного взаимодействия:', options: ['Дисперсионные силы Лондона', 'Диполь-дипольное', 'Водородная связь', 'Ион-дипольное'], correct: 3 },
  { id: 'apcru-8', section: 'Межмолекулярные силы', text: 'HF имеет аномально высокую точку кипения из-за:', options: ['Большой молекулярной массы', 'Водородных связей', 'Ионной связи', 'Ковалентных сетей'], correct: 1 },
  // Термодинамика
  { id: 'apcru-9', section: 'Термодинамика', text: 'Процесс самопроизвольный при любой температуре, если:', options: ['ΔH < 0, ΔS < 0', 'ΔH > 0, ΔS > 0', 'ΔH < 0, ΔS > 0', 'ΔH > 0, ΔS < 0'], correct: 2 },
  { id: 'apcru-10', section: 'Термодинамика', text: 'Первый закон термодинамики утверждает:', options: ['Энтропия изолированной системы возрастает', 'Энергия не создаётся и не уничтожается', 'При 0 К энтропия совершенного кристалла равна нулю', 'ΔG = ΔH − TΔS'], correct: 1 },
  { id: 'apcru-11', section: 'Термодинамика', text: 'Стандартная энтальпия образования простого вещества в стандартном состоянии:', options: ['Положительная', 'Отрицательная', 'Равна нулю', 'Зависит от давления'], correct: 2 },
  // Кинетика
  { id: 'apcru-12', section: 'Кинетика', text: 'Если концентрацию реагента А удвоить и скорость реакции увеличится в 4 раза, порядок реакции по А:', options: ['0', '1', '2', '3'], correct: 2 },
  { id: 'apcru-13', section: 'Кинетика', text: 'Катализатор увеличивает скорость реакции, потому что:', options: ['Сдвигает равновесие вправо', 'Снижает энергию активации', 'Увеличивает температуру', 'Уменьшает ΔH реакции'], correct: 1 },
  // Равновесие
  { id: 'apcru-14', section: 'Химическое равновесие', text: 'Если Kc >> 1, то реакция:', options: ['Практически не идёт', 'Идёт в обратном направлении', 'Практически полностью идёт вправо', 'Находится точно посередине'], correct: 2 },
  { id: 'apcru-15', section: 'Химическое равновесие', text: 'По принципу Ле Шателье, увеличение давления сдвигает равновесие в сторону:', options: ['Большего числа молей газа', 'Меньшего числа молей газа', 'Не влияет на равновесие', 'Зависит от температуры'], correct: 1 },
  // Кислоты и основания
  { id: 'apcru-16', section: 'Кислоты и основания', text: 'pH буферного раствора рассчитывается по уравнению Хендерсона-Хассельбальха:', options: ['pH = pKa + lg([A⁻]/[HA])', 'pH = -lg[H⁺]', 'pH = pKw − pOH', 'pH = pKb − lg([B]/[BH⁺])'], correct: 0 },
  { id: 'apcru-17', section: 'Кислоты и основания', text: 'Слабая кислота HA имеет Ka = 1×10⁻⁵. pKa равен:', options: ['−5', '5', '10', '0.5'], correct: 1 },
  // Электрохимия
  { id: 'apcru-18', section: 'Электрохимия', text: 'В гальваническом элементе окисление происходит на:', options: ['Катоде', 'Аноде', 'Обоих электродах', 'В солевом мостике'], correct: 1 },
  { id: 'apcru-19', section: 'Электрохимия', text: 'Уравнение Нернста позволяет рассчитать ЭДС при:', options: ['Стандартных условиях', 'Нестандартных концентрациях', 'Любой температуре одинаково', 'Только при 0 К'], correct: 1 },
  { id: 'apcru-20', section: 'Электрохимия', text: 'Самопроизвольная электрохимическая реакция имеет:', options: ['E°cell < 0, ΔG > 0', 'E°cell > 0, ΔG < 0', 'E°cell = 0, ΔG = 0', 'E°cell > 0, ΔG > 0'], correct: 1 },
]

// ── AP Chemistry (English) ────────────────────────────────────────────────────

export const AP_CHEM_EN_QUESTIONS: DiagQuestion[] = [
  // Atomic Structure
  { id: 'apcen-1', section: 'Atomic Structure', text: 'The quantum number that describes the shape of an orbital is:', options: ['Principal (n)', 'Angular momentum (l)', 'Magnetic (mₗ)', 'Spin (mₛ)'], correct: 1 },
  { id: 'apcen-2', section: 'Atomic Structure', text: 'Isotopes of the same element differ in their:', options: ['Number of protons', 'Number of electrons', 'Number of neutrons', 'Atomic number'], correct: 2 },
  { id: 'apcen-3', section: 'Atomic Structure', text: 'The electron configuration of Fe³⁺ (Z = 26) is:', options: ['[Ar] 3d⁶ 4s⁰', '[Ar] 3d⁵ 4s⁰', '[Ar] 3d⁶ 4s²', '[Ar] 3d⁴ 4s¹'], correct: 1 },
  // Bonding & Structure
  { id: 'apcen-4', section: 'Bonding and Molecular Structure', text: 'According to VSEPR theory, the geometry of SF₆ is:', options: ['Octahedral', 'Trigonal bipyramidal', 'Tetrahedral', 'Square planar'], correct: 0 },
  { id: 'apcen-5', section: 'Bonding and Molecular Structure', text: 'The hybridization of carbon in acetylene (C₂H₂) is:', options: ['sp³', 'sp²', 'sp', 'dsp²'], correct: 2 },
  { id: 'apcen-6', section: 'Bonding and Molecular Structure', text: 'Which molecule is polar?', options: ['CO₂', 'BF₃', 'H₂O', 'CCl₄'], correct: 2 },
  // Intermolecular Forces
  { id: 'apcen-7', section: 'Intermolecular Forces', text: 'The strongest type of intermolecular force is:', options: ['London dispersion', 'Dipole-dipole', 'Hydrogen bonding', 'Ion-dipole'], correct: 3 },
  { id: 'apcen-8', section: 'Intermolecular Forces', text: 'HF has an abnormally high boiling point due to:', options: ['High molar mass', 'Hydrogen bonding', 'Ionic character', 'Covalent network'], correct: 1 },
  // Thermodynamics
  { id: 'apcen-9', section: 'Thermodynamics', text: 'A reaction is spontaneous at all temperatures when:', options: ['ΔH < 0, ΔS < 0', 'ΔH > 0, ΔS > 0', 'ΔH < 0, ΔS > 0', 'ΔH > 0, ΔS < 0'], correct: 2 },
  { id: 'apcen-10', section: 'Thermodynamics', text: 'The standard enthalpy of formation of an element in its standard state is:', options: ['Positive', 'Negative', 'Zero', 'Pressure-dependent'], correct: 2 },
  { id: 'apcen-11', section: 'Thermodynamics', text: 'Which process has the greatest increase in entropy?', options: ['H₂O(l) → H₂O(s)', 'CaCO₃(s) → CaO(s) + CO₂(g)', 'N₂(g) + 3H₂(g) → 2NH₃(g)', 'NaCl(s) → Na⁺(aq) + Cl⁻(aq)'], correct: 1 },
  // Kinetics
  { id: 'apcen-12', section: 'Kinetics', text: 'If doubling [A] quadruples the reaction rate, the order with respect to A is:', options: ['0', '1', '2', '3'], correct: 2 },
  { id: 'apcen-13', section: 'Kinetics', text: 'A catalyst increases reaction rate by:', options: ['Shifting equilibrium right', 'Lowering activation energy', 'Raising the temperature', 'Decreasing ΔH'], correct: 1 },
  { id: 'apcen-14', section: 'Kinetics', text: 'For a first-order reaction, the half-life is:', options: ['Dependent on initial concentration', 'Independent of initial concentration', 'Equal to 1/k', 'Proportional to [A]₀²'], correct: 1 },
  // Equilibrium
  { id: 'apcen-15', section: 'Chemical Equilibrium', text: 'If Kc >> 1, the reaction:', options: ['Barely proceeds forward', 'Favors the reverse', 'Goes nearly to completion', 'Is at exact midpoint'], correct: 2 },
  { id: 'apcen-16', section: 'Chemical Equilibrium', text: 'According to Le Châtelier\'s principle, increasing pressure shifts equilibrium toward:', options: ['More moles of gas', 'Fewer moles of gas', 'No effect', 'Higher temperature side'], correct: 1 },
  // Acids and Bases
  { id: 'apcen-17', section: 'Acids and Bases', text: 'The Henderson-Hasselbalch equation is: pH =', options: ['pKa + log([A⁻]/[HA])', '-log[H⁺]', 'pKw − pOH', 'pKb − log([B]/[BH⁺])'], correct: 0 },
  { id: 'apcen-18', section: 'Acids and Bases', text: 'A weak acid has Ka = 1×10⁻⁵. Its pKa is:', options: ['−5', '5', '10', '0.5'], correct: 1 },
  // Electrochemistry
  { id: 'apcen-19', section: 'Electrochemistry', text: 'In a galvanic cell, oxidation occurs at the:', options: ['Cathode', 'Anode', 'Salt bridge', 'Both electrodes'], correct: 1 },
  { id: 'apcen-20', section: 'Electrochemistry', text: 'A spontaneous electrochemical cell has:', options: ['E°cell < 0, ΔG > 0', 'E°cell > 0, ΔG < 0', 'E°cell = 0, ΔG = 0', 'E°cell > 0, ΔG > 0'], correct: 1 },
]

export const DEFAULT_QUESTIONS: Record<DiagSubject, DiagQuestion[]> = {
  biology: [...BIOLOGY_DIAG_QUESTIONS, ...BIOLOGY_EXTRA_QUESTIONS],
  chemistry: CHEMISTRY_DIAG_QUESTIONS,
  logic: LOGIC_DIAG_QUESTIONS,
  'ap-chem-ru': AP_CHEM_RU_QUESTIONS,
  'ap-chem-en': AP_CHEM_EN_QUESTIONS,
}

// In-memory cache pre-seeded with compiled defaults so sync reads always work.
const questionsCache = new Map<DiagSubject, DiagQuestion[]>(
  (['biology', 'chemistry', 'logic', 'ap-chem-ru', 'ap-chem-en'] as DiagSubject[]).map(s => [s, DEFAULT_QUESTIONS[s]])
)

// Sync read from cache (instant, no flicker). Call fetchDiagQuestions in useEffect to hydrate.
export function loadDiagQuestions(subject: DiagSubject): DiagQuestion[] {
  return questionsCache.get(subject) ?? DEFAULT_QUESTIONS[subject] ?? []
}

// Async fetch from Supabase — updates cache and returns fresh questions.
export async function fetchDiagQuestions(subject: DiagSubject): Promise<DiagQuestion[]> {
  const { data, error } = await supabase
    .from('diag_questions')
    .select('id, section, text, options, correct')
    .eq('subject', subject)
    .order('position')
  if (error || !data?.length) return loadDiagQuestions(subject)
  const qs: DiagQuestion[] = data.map(r => ({
    id: r.id as string,
    section: r.section as string,
    text: r.text as string,
    options: r.options as string[],
    correct: r.correct as number,
  }))
  questionsCache.set(subject, qs)
  return qs
}

// Async save — updates cache + upserts all rows to Supabase.
export async function saveDiagQuestions(subject: DiagSubject, qs: DiagQuestion[]): Promise<void> {
  questionsCache.set(subject, qs)
  if (!qs.length) return
  const rows = qs.map((q, pos) => ({
    id: q.id, subject, section: q.section, text: q.text,
    options: q.options, correct: q.correct, position: pos,
  }))
  const { error } = await supabase
    .from('diag_questions')
    .upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error('saveDiagQuestions:', error)
    throw new Error(error.message)
  }
  // Remove deleted questions from DB
  const ids = qs.map(q => q.id)
  await supabase
    .from('diag_questions')
    .delete()
    .eq('subject', subject)
    .not('id', 'in', `(${ids.join(',')})`)
}

// ── Custom test metadata (cross-device, Supabase-backed) ──────────────────────

export interface CustomTestMeta { id: string; label: string; accent: string; iconKey?: string }

export async function fetchCustomTestsMeta(): Promise<CustomTestMeta[]> {
  const { data, error } = await supabase
    .from('custom_diag_tests')
    .select('id, label, accent, icon_key')
    .order('created_at', { ascending: false })
  if (error) { console.error('fetchCustomTestsMeta:', error); return [] }
  return (data ?? []).map((r: { id: string; label: string; accent: string; icon_key?: string }) => ({
    id: r.id, label: r.label, accent: r.accent, iconKey: r.icon_key ?? undefined,
  }))
}

export async function saveCustomTestMeta(id: string, label: string, accent: string, iconKey?: string): Promise<void> {
  const { error } = await supabase
    .from('custom_diag_tests')
    .upsert({ id, label, accent, ...(iconKey ? { icon_key: iconKey } : {}) }, { onConflict: 'id' })
  if (error) { console.error('saveCustomTestMeta:', error); throw new Error(error.message) }
}

export async function deleteCustomTestMeta(id: string): Promise<void> {
  const { error } = await supabase.from('custom_diag_tests').delete().eq('id', id)
  if (error) console.error('deleteCustomTestMeta:', error)
}

export async function updateCustomTestAccent(id: string, accent: string): Promise<void> {
  const { error } = await supabase
    .from('custom_diag_tests')
    .update({ accent })
    .eq('id', id)
  if (error) console.error('updateCustomTestAccent:', error)
}

export async function updateCustomTestIcon(id: string, iconKey: string): Promise<void> {
  const { error } = await supabase
    .from('custom_diag_tests')
    .update({ icon_key: iconKey })
    .eq('id', id)
  if (error) console.error('updateCustomTestIcon:', error)
}

// ─────────────────────────────────────────────────────────────────────────────

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

export async function appendAnonResult(
  r: Omit<AnonDiagResult, 'id' | 'timestamp'>,
  opts?: { studentId?: string; assignmentId?: string; scorePct?: number },
): Promise<AnonDiagResult | null> {
  const { data, error } = await supabase
    .from('diag_results')
    .insert({
      name: r.name,
      subject: r.subject,
      results: r.results,
      answers: r.answers,
      linked_student_id: opts?.studentId ?? null,
      student_id: opts?.studentId ?? null,
      assignment_id: opts?.assignmentId ?? null,
      score_pct: opts?.scorePct ?? null,
    })
    .select()
    .single()
  if (error) { console.error('appendAnonResult:', error); return null }

  // Auto-update student score field when submitted under an assignment
  if (opts?.studentId && opts?.assignmentId && opts.scorePct != null) {
    await updateStudentScoreFromAssignment(opts.studentId, opts.assignmentId, opts.scorePct)
  }

  return rowToResult(data)
}

async function updateStudentScoreFromAssignment(studentId: string, assignmentId: string, scorePct: number) {
  const { data: asgn } = await supabase
    .from('test_assignments')
    .select('assign_type')
    .eq('id', assignmentId)
    .single()
  if (!asgn) return
  const field = asgn.assign_type === 'trial' ? 'trial_score' : 'test_score'
  await supabase.from('students').update({ [field]: scorePct }).eq('id', studentId)
}

// ─── Test assignment helpers ──────────────────────────────────────────────────
export interface TestAssignment {
  id: string
  title: string
  subject: string
  assignType: 'test' | 'trial'
  groupIds: string[]
  studentIds: string[]
  dueDate?: string
  createdAt: string
  closed: boolean
}

function rowToAssignment(row: Record<string, unknown>): TestAssignment {
  return {
    id: row.id as string,
    title: row.title as string,
    subject: row.subject as string,
    assignType: (row.assign_type as 'test' | 'trial') ?? 'test',
    groupIds: (row.group_ids as string[]) ?? [],
    studentIds: (row.student_ids as string[]) ?? [],
    dueDate: (row.due_date as string | null) ?? undefined,
    createdAt: row.created_at as string,
    closed: (row.closed as boolean) ?? false,
  }
}

export async function createTestAssignment(a: Omit<TestAssignment, 'id' | 'createdAt'>): Promise<TestAssignment | null> {
  const { data, error } = await supabase
    .from('test_assignments')
    .insert({
      title: a.title,
      subject: a.subject,
      assign_type: a.assignType,
      group_ids: a.groupIds,
      student_ids: a.studentIds,
      due_date: a.dueDate ?? null,
      closed: false,
    })
    .select()
    .single()
  if (error) { console.error('createTestAssignment:', error); return null }
  return rowToAssignment(data)
}

export async function loadTestAssignments(): Promise<TestAssignment[]> {
  const { data } = await supabase
    .from('test_assignments')
    .select('*')
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToAssignment)
}

export async function deleteTestAssignment(id: string): Promise<void> {
  await supabase.from('test_assignments').delete().eq('id', id)
}

// Fetch assignments visible to a student (by student id or group id)
export async function fetchStudentAssignments(studentId: string, groupId: string): Promise<TestAssignment[]> {
  const { data } = await supabase
    .from('test_assignments')
    .select('*')
    .eq('closed', false)
    .order('created_at', { ascending: false })
  if (!data) return []

  return data
    .map(rowToAssignment)
    .filter(a =>
      a.groupIds.includes(groupId) || a.studentIds.includes(studentId)
    )
}

// Check if a student already submitted a specific assignment
export async function checkAssignmentSubmitted(studentId: string, assignmentId: string): Promise<boolean> {
  const { count } = await supabase
    .from('diag_results')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('assignment_id', assignmentId)
  return (count ?? 0) > 0
}

// Load results for a specific assignment (for teacher view)
export async function loadAssignmentResults(assignmentId: string): Promise<AnonDiagResult[]> {
  const { data } = await supabase
    .from('diag_results')
    .select('*')
    .eq('assignment_id', assignmentId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(rowToResult)
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
