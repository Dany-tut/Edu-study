// ─────────────────────────────────────────────────────────────────────────────
// Английский A2→B1 — «Карьера дизайнера»
//
// Практический курс: весь путь от «здравствуйте, хочу у вас работать» до работы
// в международной команде. Не грамматика ради грамматики — каждый юнит даёт
// конкретный артефакт (строчка в резюме, абзац сопроводительного, минутный
// рассказ о проекте), который ученик реально использует.
//
// МЕТОДИЧЕСКАЯ ОСНОВА
// Последовательность грамматики выведена из коммуникативной задачи, а не из
// оглавления учебника: сначала времена, которыми описывают опыт (past simple —
// что делал, present perfect — чего достиг), потом модальные для вежливости
// (без них русскоязычный звучит грубо), затем условные для переговоров.
// Ориентиры уровня — дескрипторы CEFR A2/B1 «может описать опыт», «может
// объяснить и обосновать мнение».
//
// ЮРИДИЧЕСКОЕ
// Последовательность программы и грамматическая прогрессия авторским правом
// не охраняются. Все тексты, диалоги и задания здесь написаны с нуля — ничего
// не скопировано из учебников. Примеры предложений можно дополнять из корпуса
// Tatoeba (CC BY) с указанием источника.
// ─────────────────────────────────────────────────────────────────────────────

import type { TaskPayload, TaskTypeId } from './taskTypes'

// ─── Модель ──────────────────────────────────────────────────────────────────

/** Слово словаря юнита. Ложится в карточки и в интервальные повторения. */
export interface VocabItem {
  /** Английское слово или словосочетание. */
  en: string
  /** Русский перевод. */
  ru: string
  /** Пример употребления — контекст важнее изолированного слова. */
  example?: string
}

export interface EnglishUnit {
  /** Порядковый номер, 1-based. */
  n: number
  /** Короткий стабильный id — ключ для lessons.short_id и прогресса. */
  shortId: string
  /** Заголовок для ученика. */
  title: string
  /** Коммуникативная цель — что ученик сможет после юнита. */
  goal: string
  /** Грамматика юнита. */
  grammar: string
  /** Зачем эта грамматика именно здесь. */
  grammarWhy: string
  /** Лексическая тема. */
  vocabTheme: string
  /** Что ученик создаёт своими руками к концу юнита. */
  artifact: string
  /** Словарь юнита. */
  vocab: VocabItem[]
  /** Задания домашней работы. */
  tasks: SeedTask[]
}

/** Задание в сиде — без id и label, они проставляются при сборке. */
export type SeedTask = Omit<Partial<TaskPayload>, 'type'> & { type: TaskTypeId }

/** Модуль — группа юнитов с общей задачей. */
export interface EnglishModule {
  title: string
  subtitle: string
  units: number[]
}

export const MODULES: EnglishModule[] = [
  { title: 'Кто я и что я умею', subtitle: 'Профиль, резюме, портфолио, кейс', units: [1, 2, 3, 4, 5, 6] },
  { title: 'Выход на рынок', subtitle: 'Письмо в компанию, ATS, звонок рекрутёра', units: [7, 8, 9, 10, 11] },
  { title: 'Собеседования', subtitle: 'HR, защита портфолио, критика, вопросы', units: [12, 13, 14, 15, 16, 17, 18] },
  { title: 'Оффер и старт', subtitle: 'Тестовое, переговоры, онбординг', units: [19, 20, 21, 22, 23] },
  { title: 'Работа в команде', subtitle: 'Стендапы, переписка, обратная связь, клиенты', units: [24, 25, 26, 27, 28] },
]

// ─── Хелперы для заданий ─────────────────────────────────────────────────────

/** Собрать предложение из слов — тренирует порядок слов, больной вопрос у русскоязычных. */
const wb = (sentence: string, question: string, distractors: string[] = []): SeedTask =>
  ({ type: 'wordBank', question, sentence, distractors })

/** Вписать слово — точечная отработка формы. */
const fill = (question: string, answer: string, altAnswers?: string[]): SeedTask =>
  ({ type: 'fill', question, answer, altAnswers })

/** Один верный вариант. */
const one = (question: string, choices: string[], correct: number): SeedTask =>
  ({ type: 'single', question, choices, correctChoices: [correct] })

/** Несколько верных вариантов. */
const many = (question: string, choices: string[], correct: number[]): SeedTask =>
  ({ type: 'multi', question, choices, correctChoices: correct })

/** Свободный ответ — идёт учителю. */
const write = (question: string): SeedTask => ({ type: 'extended', question })

/** Записать голос — учитель слушает; при подключённом ИИ добавится разбор. */
const say = (question: string, responseSeconds = 90): SeedTask =>
  ({ type: 'speaking', question, prepSeconds: 20, responseSeconds })

/** Пары слово—перевод. */
const pairsOf = (question: string, items: [string, string][]): SeedTask =>
  ({ type: 'matching', question, pairs: items.map(([left, right]) => ({ left, right })) })

// ─── Юниты ───────────────────────────────────────────────────────────────────

export const ENGLISH_DESIGN_CAREER: EnglishUnit[] = [
  // ═══ Модуль 1. Кто я и что я умею ═══
  {
    n: 1, shortId: 'endc-01',
    title: 'Кто ты как дизайнер',
    goal: 'Представиться за 30 секунд: имя, роль, специализация, опыт',
    grammar: 'Present Simple для роли и обязанностей; a/an vs the с профессиями',
    grammarWhy: 'Первое, что произносят на любом созвоне. Артикль перед профессией — ошибка №1 русскоязычных: «I am designer» вместо «I am a designer».',
    vocabTheme: 'Специализации и роли в дизайне',
    artifact: 'Устное представление на 30 секунд',
    vocab: [
      { en: 'product designer', ru: 'продуктовый дизайнер', example: "I'm a product designer with four years of experience." },
      { en: 'UX/UI designer', ru: 'UX/UI-дизайнер' },
      { en: 'graphic designer', ru: 'графический дизайнер' },
      { en: 'motion designer', ru: 'моушн-дизайнер' },
      { en: 'design lead', ru: 'руководитель дизайн-направления' },
      { en: 'in-house', ru: 'в штате компании', example: 'I work in-house at a fintech company.' },
      { en: 'freelance', ru: 'на фрилансе' },
      { en: 'agency', ru: 'агентство' },
      { en: 'to specialise in', ru: 'специализироваться на', example: 'I specialise in mobile interfaces.' },
      { en: 'background', ru: 'бэкграунд, предыдущий опыт', example: 'I have a background in illustration.' },
    ],
    tasks: [
      one('Choose the correct sentence.', ['I am designer.', 'I am a designer.', 'I am the designer.', 'I designer.'], 1),
      fill("Complete: I ___ a product designer. (be, present simple)", 'am'),
      wb("I'm a product designer with four years of experience.",
        'Put the words in order — this is how you open any interview.',
        ['have', 'the']),
      pairsOf('Match the role with its Russian equivalent.', [
        ['product designer', 'продуктовый дизайнер'],
        ['motion designer', 'моушн-дизайнер'],
        ['design lead', 'руководитель дизайн-направления'],
        ['in-house', 'в штате компании'],
      ]),
      say('Introduce yourself in 30 seconds: your name, your role, what you specialise in, and how long you have been doing it.', 45),
    ],
  },
  {
    n: 2, shortId: 'endc-02',
    title: 'Опыт: что ты уже делал',
    goal: 'Рассказать о прошлых местах работы и проектах',
    grammar: 'Past Simple; правильные и неправильные глаголы; for / from…to с периодами',
    grammarWhy: 'Опыт описывается прошедшим временем. Разделяем с Present Perfect (юнит 3) сразу — иначе смешаются на всю жизнь.',
    vocabTheme: 'Места работы, проекты, обязанности',
    artifact: 'Три строки опыта для резюме',
    vocab: [
      { en: 'to work on', ru: 'работать над', example: 'I worked on a banking app for two years.' },
      { en: 'to join', ru: 'прийти в компанию', example: 'I joined the team in 2022.' },
      { en: 'to leave', ru: 'уйти из компании' },
      { en: 'previous role', ru: 'предыдущая должность' },
      { en: 'to be responsible for', ru: 'отвечать за', example: 'I was responsible for the design system.' },
      { en: 'to redesign', ru: 'переделать, обновить дизайн' },
      { en: 'to launch', ru: 'запустить' },
      { en: 'startup', ru: 'стартап' },
      { en: 'client', ru: 'клиент, заказчик' },
      { en: 'from 2021 to 2024', ru: 'с 2021 по 2024' },
    ],
    tasks: [
      one('Which is correct for a finished period?', ['I work there for two years.', 'I worked there for two years.', 'I am working there for two years.', 'I have worked there since two years.'], 1),
      fill('Complete: I ___ the team in 2022. (join)', 'joined'),
      fill('Complete: I ___ responsible for the design system. (be, past)', 'was'),
      wb('I worked on a banking app for two years.',
        'Put the words in order.', ['have', 'since']),
      write('Write three lines of work experience in English. Each line: what you did, where, and for how long. Use Past Simple.'),
    ],
  },
  {
    n: 3, shortId: 'endc-03',
    title: 'Достижения, а не обязанности',
    goal: 'Показать результат, а не список задач — то, что ищет рекрутёр',
    grammar: 'Present Perfect для достижений; глаголы результата; числа и проценты',
    grammarWhy: 'Разница «I was responsible for» (обязанность) и «I have increased» (результат) — то, что отличает слабое резюме от сильного.',
    vocabTheme: 'Метрики и результат',
    artifact: 'Три достижения с цифрами',
    vocab: [
      { en: 'to increase', ru: 'увеличить', example: 'I have increased conversion by 18%.' },
      { en: 'to reduce', ru: 'сократить', example: 'We reduced support tickets by a third.' },
      { en: 'to improve', ru: 'улучшить' },
      { en: 'conversion rate', ru: 'конверсия' },
      { en: 'retention', ru: 'удержание пользователей' },
      { en: 'churn', ru: 'отток пользователей' },
      { en: 'by 18%', ru: 'на 18 процентов' },
      { en: 'impact', ru: 'влияние, эффект', example: 'What was the impact of your redesign?' },
      { en: 'to ship', ru: 'выпустить, довести до релиза' },
      { en: 'measurable', ru: 'измеримый' },
    ],
    tasks: [
      one('Which line is stronger in a CV?', [
        'I was responsible for the checkout page.',
        'I redesigned the checkout page and increased conversion by 18%.',
        'I worked on checkout.',
        'Checkout page designer.',
      ], 1),
      one('Achievement, no time stated → which tense?', ['Past Simple', 'Present Perfect', 'Present Continuous', 'Future Simple'], 1),
      fill('Complete: I ___ increased conversion by 18%. (have/has)', 'have'),
      wb('I have reduced support tickets by a third.', 'Put the words in order.', ['was', 'am']),
      write('Write three achievements with numbers. Pattern: I have + verb + result + by X%.'),
    ],
  },
  {
    n: 4, shortId: 'endc-04',
    title: 'Резюме, которое читают',
    goal: 'Собрать англоязычное резюме на одну страницу',
    grammar: 'Глаголы действия в начале строки; отсутствие «I» в буллетах; параллельные конструкции',
    grammarWhy: 'В английском резюме буллеты начинаются с глагола и пишутся без подлежащего — русскоязычные по привычке пишут полными предложениями.',
    vocabTheme: 'Разделы резюме',
    artifact: 'Готовое резюме на английском',
    vocab: [
      { en: 'CV / resume', ru: 'резюме', example: 'Please find my CV attached.' },
      { en: 'summary', ru: 'краткое описание в начале резюме' },
      { en: 'work experience', ru: 'опыт работы' },
      { en: 'skills', ru: 'навыки' },
      { en: 'proficient in', ru: 'уверенно владею', example: 'Proficient in Figma and prototyping.' },
      { en: 'references', ru: 'рекомендации' },
      { en: 'bullet point', ru: 'пункт списка' },
      { en: 'concise', ru: 'ёмкий, без лишнего' },
      { en: 'tailored', ru: 'адаптированный под вакансию' },
      { en: 'one-pager', ru: 'резюме на одну страницу' },
    ],
    tasks: [
      one('Which CV bullet is formatted correctly?', [
        'I have designed a new onboarding flow.',
        'Designed a new onboarding flow that cut drop-off by 22%.',
        'Design of new onboarding flow.',
        'The onboarding flow was designed by me.',
      ], 1),
      many('Which belong in a designer CV? Choose all that apply.', [
        'Work experience', 'Marital status', 'Skills', 'Portfolio link',
      ], [0, 2, 3]),
      fill('Complete: Proficient ___ Figma and prototyping. (preposition)', 'in'),
      wb('Redesigned the checkout flow and increased conversion by 18%.',
        'Put this CV bullet in order. Note: no "I" at the start.', ['I', 'have']),
      write('Write the Summary section of your CV: 2–3 sentences. Who you are, your specialisation, your strongest result.'),
    ],
  },
  {
    n: 5, shortId: 'endc-05',
    title: 'Портфолио: как показать работу',
    goal: 'Описать проект так, чтобы поняли задачу и роль',
    grammar: 'Passive Voice для процесса; последовательность этапов',
    grammarWhy: 'В описании проекта важен не исполнитель, а что происходило: «the research was conducted», «the prototype was tested».',
    vocabTheme: 'Этапы проекта',
    artifact: 'Описание одного проекта на 150 слов',
    vocab: [
      { en: 'case study', ru: 'разбор проекта, кейс' },
      { en: 'brief', ru: 'бриф, постановка задачи' },
      { en: 'research', ru: 'исследование' },
      { en: 'user interview', ru: 'интервью с пользователем' },
      { en: 'wireframe', ru: 'вайрфрейм, каркас' },
      { en: 'prototype', ru: 'прототип' },
      { en: 'usability testing', ru: 'юзабилити-тестирование' },
      { en: 'iteration', ru: 'итерация' },
      { en: 'constraint', ru: 'ограничение', example: 'The main constraint was the deadline.' },
      { en: 'outcome', ru: 'итог, результат' },
    ],
    tasks: [
      one('Choose the passive form.', [
        'We tested the prototype with eight users.',
        'The prototype was tested with eight users.',
        'The prototype tested with eight users.',
        'The prototype is testing with eight users.',
      ], 1),
      fill('Complete: The research ___ conducted over three weeks. (be, past passive)', 'was'),
      pairsOf('Match the stage with its Russian name.', [
        ['brief', 'постановка задачи'],
        ['wireframe', 'каркас'],
        ['usability testing', 'юзабилити-тестирование'],
        ['outcome', 'итог'],
      ]),
      wb('The prototype was tested with eight users.', 'Put the words in order.', ['we', 'have']),
      write('Describe one of your projects in 150 words: the brief, what you did, the constraint, the outcome.'),
    ],
  },
  {
    n: 6, shortId: 'endc-06',
    title: 'Кейс: задача → решение → результат',
    goal: 'Выстроить кейс по структуре, которую ждут в портфолио',
    grammar: 'Связки последовательности и причины: first, then, because of, as a result, however',
    grammarWhy: 'Кейс без связок читается как список. Связки — то, что превращает перечисление в историю.',
    vocabTheme: 'Структура кейса',
    artifact: 'Полный кейс со связками',
    vocab: [
      { en: 'problem statement', ru: 'формулировка проблемы' },
      { en: 'hypothesis', ru: 'гипотеза' },
      { en: 'trade-off', ru: 'компромисс, размен' },
      { en: 'as a result', ru: 'в результате' },
      { en: 'however', ru: 'однако' },
      { en: 'therefore', ru: 'поэтому' },
      { en: 'due to', ru: 'из-за, по причине' },
      { en: 'stakeholder', ru: 'заинтересованная сторона' },
      { en: 'to validate', ru: 'проверить, подтвердить' },
      { en: 'takeaway', ru: 'вывод, что вынес' },
    ],
    tasks: [
      one('Choose the correct linker: "Users dropped off at step three. ___, we simplified the form."', ['However', 'Therefore', 'Because of', 'Although'], 1),
      one('Choose the correct linker: "The deadline was tight. ___, we shipped on time."', ['Therefore', 'As a result', 'However', 'Due to'], 2),
      fill('Complete: ___ a result, conversion went up. (preposition)', 'As'),
      wb('However, the first prototype did not solve the problem.', 'Put the words in order.', ['because', 'so']),
      write('Write a case study outline: problem statement, hypothesis, what you did, trade-off, result. Use at least four linkers.'),
    ],
  },

  // ═══ Модуль 2. Выход на рынок ═══
  {
    n: 7, shortId: 'endc-07',
    title: 'Первое письмо в компанию',
    goal: 'Написать холодное письмо, на которое отвечают',
    grammar: 'Модальные для вежливости: would, could, may; косвенные вопросы',
    grammarWhy: 'Прямой перевод с русского звучит как приказ: «Send me the details» вместо «Could you send me the details?». Это самая заметная ошибка регистра.',
    vocabTheme: 'Деловое письмо',
    artifact: 'Холодное письмо на 120 слов',
    vocab: [
      { en: 'to reach out', ru: 'написать, выйти на связь', example: "I'm reaching out about the Product Designer role." },
      { en: 'opening', ru: 'вакансия, открытая позиция' },
      { en: 'to come across', ru: 'наткнуться на', example: 'I came across your job posting on LinkedIn.' },
      { en: 'I would be glad to', ru: 'я был бы рад' },
      { en: 'Please find attached', ru: 'во вложении' },
      { en: 'Looking forward to hearing from you', ru: 'жду вашего ответа' },
      { en: 'Best regards', ru: 'с уважением' },
      { en: 'to follow up', ru: 'напомнить о себе' },
      { en: 'availability', ru: 'когда вам удобно' },
      { en: 'relevant', ru: 'подходящий, релевантный' },
    ],
    tasks: [
      one('Which is polite enough for a first email?', [
        'Send me the details.',
        'Could you send me the details?',
        'I want the details.',
        'Give me details please.',
      ], 1),
      one('Choose the correct indirect question.', [
        'Could you tell me when is the deadline?',
        'Could you tell me when the deadline is?',
        'Could you tell me when does the deadline?',
        'Could you tell me the deadline is when?',
      ], 1),
      fill("Complete: I'm reaching ___ about the Product Designer role. (particle)", 'out'),
      wb('I would be glad to discuss the role with you.', 'Put the words in order.', ['want', 'am']),
      write('Write a cold email (120 words) to a company you would like to work for. Include: why you are writing, one relevant achievement, a polite request for a call.'),
    ],
  },
  {
    n: 8, shortId: 'endc-08',
    title: 'Сопроводительное письмо',
    goal: 'Объяснить, почему именно ты и именно сюда',
    grammar: 'Причина и цель: because, since, in order to, so that',
    grammarWhy: 'Сопроводительное — это ответ на «почему». Без конструкций цели письмо превращается в пересказ резюме.',
    vocabTheme: 'Мотивация и соответствие',
    artifact: 'Сопроводительное письмо',
    vocab: [
      { en: 'cover letter', ru: 'сопроводительное письмо' },
      { en: 'to apply for', ru: 'подавать заявку на', example: "I'm applying for the Senior Designer position." },
      { en: 'job posting', ru: 'вакансия, объявление' },
      { en: 'requirement', ru: 'требование' },
      { en: 'to match', ru: 'соответствовать' },
      { en: 'what draws me to', ru: 'что меня привлекает в' },
      { en: 'in order to', ru: 'чтобы, для того чтобы' },
      { en: 'contribution', ru: 'вклад' },
      { en: 'to be a good fit', ru: 'подходить', example: 'I believe I would be a good fit for this team.' },
      { en: 'genuinely', ru: 'искренне' },
    ],
    tasks: [
      one('Choose the correct purpose linker: "I studied motion design ___ expand my skill set."', ['because', 'in order to', 'due to', 'so'], 1),
      one('Which opening is strongest?', [
        'I am writing to apply for the job.',
        'What draws me to your team is the way you handle accessibility — I have been solving the same problem for two years.',
        'Hello, I need a job.',
        'I saw your vacancy and I am interested.',
      ], 1),
      fill('Complete: I would be a good ___ for this team. (noun)', 'fit'),
      wb('I am applying for the Senior Product Designer position.', 'Put the words in order.', ['want', 'to']),
      write('Write a cover letter (150 words) for a real job posting. Answer: why this company, why you, what you bring.'),
    ],
  },
  {
    n: 9, shortId: 'endc-09',
    title: 'LinkedIn и ATS',
    goal: 'Пройти автоматический отбор и робота-скринера',
    grammar: 'Ключевые слова и синонимы; существительное vs глагол в описании навыка',
    grammarWhy: 'Системы отбора ищут точные формулировки из вакансии. Понимать разницу «design systems» (навык) и «to design» (действие) — практическая необходимость.',
    vocabTheme: 'Автоматический отбор',
    artifact: 'Заголовок и раздел «About» в LinkedIn',
    vocab: [
      { en: 'ATS (applicant tracking system)', ru: 'система автоматического отбора резюме' },
      { en: 'to screen', ru: 'отсеивать, проводить первичный отбор' },
      { en: 'keyword', ru: 'ключевое слово' },
      { en: 'headline', ru: 'заголовок профиля' },
      { en: 'to optimise', ru: 'оптимизировать' },
      { en: 'shortlist', ru: 'список финалистов' },
      { en: 'to be rejected', ru: 'получить отказ' },
      { en: 'open to work', ru: 'открыт к предложениям' },
      { en: 'endorsement', ru: 'подтверждение навыка' },
      { en: 'recruiter', ru: 'рекрутёр' },
    ],
    tasks: [
      one('An ATS scans your CV. What matters most?', [
        'Beautiful layout and custom fonts',
        'Exact keywords from the job posting',
        'The length of your name',
        'A photo',
      ], 1),
      many('Which are good LinkedIn headline elements? Choose all that apply.', [
        'Your role', 'Your specialisation', 'Your favourite colour', 'A measurable result',
      ], [0, 1, 3]),
      // «filtered out» и «screened out» — оба живые; «rejected out» не говорят.
      fill('Complete: My CV was ___ out by the ATS. (verb, past participle)', 'filtered', ['screened']),
      wb('I am open to new product design opportunities.', 'Put the words in order.', ['was', 'were']),
      write('Write your LinkedIn headline (max 15 words) and an About section (80 words). Use at least five keywords from a real job posting.'),
    ],
  },
  {
    n: 10, shortId: 'endc-10',
    title: 'Звонок рекрутёра',
    goal: 'Пройти первый пятнадцатиминутный звонок',
    grammar: 'Present Continuous для текущей ситуации; вежливый отказ и уточнение',
    grammarWhy: '«What are you looking for?» — вопрос про сейчас, отвечать надо продолженным временем. И надо уметь переспросить, не теряя лица.',
    vocabTheme: 'Первичный звонок',
    artifact: 'Ответы на пять типовых вопросов рекрутёра',
    vocab: [
      { en: 'screening call', ru: 'первичный звонок' },
      { en: "I'm currently looking for", ru: 'сейчас я ищу' },
      { en: 'notice period', ru: 'срок отработки при увольнении' },
      { en: 'salary expectations', ru: 'зарплатные ожидания' },
      { en: 'Sorry, could you repeat that?', ru: 'простите, можете повторить?' },
      { en: 'Just to clarify', ru: 'чтобы уточнить' },
      { en: 'remote / hybrid / on-site', ru: 'удалённо / гибрид / в офисе' },
      { en: 'time zone', ru: 'часовой пояс' },
      { en: 'to be available', ru: 'быть свободным, доступным' },
      { en: 'next steps', ru: 'следующие шаги' },
    ],
    tasks: [
      one('"What are you looking for right now?" — best answer:', [
        'I look for a product role.',
        "I'm currently looking for a product role in a small team.",
        'I looked for a product role.',
        'I will look for a product role.',
      ], 1),
      one('You did not hear the question. What do you say?', [
        'What?',
        'Repeat.',
        'Sorry, could you repeat that?',
        'I not understand.',
      ], 2),
      fill('Complete: Just to ___, is the role fully remote? (verb)', 'clarify'),
      wb("I'm currently looking for a product role in a small team.", 'Put the words in order.', ['look', 'was']),
      say('Answer these recruiter questions out loud: 1) Tell me about yourself. 2) What are you looking for? 3) Why are you leaving your current job? Keep it under 90 seconds.', 90),
    ],
  },
  {
    n: 11, shortId: 'endc-11',
    title: 'Small talk без паники',
    goal: 'Держать первые две минуты разговора',
    grammar: 'Короткие ответы и встречные вопросы; How about you?',
    grammarWhy: 'В английском на «How are you?» отвечают коротко и возвращают вопрос. Русскоязычные либо молчат, либо рассказывают слишком много.',
    vocabTheme: 'Светская беседа',
    artifact: 'Двухминутный диалог-разминка',
    vocab: [
      { en: 'How is it going?', ru: 'как дела?' },
      { en: 'How about you?', ru: 'а у вас?' },
      { en: 'Can you hear me?', ru: 'вы меня слышите?' },
      { en: "You're breaking up", ru: 'вас прерывает' },
      { en: 'to catch up', ru: 'наверстать, поболтать' },
      { en: 'weather', ru: 'погода' },
      { en: 'weekend plans', ru: 'планы на выходные' },
      { en: 'Nice to meet you', ru: 'приятно познакомиться' },
      { en: 'Thanks for having me', ru: 'спасибо, что пригласили' },
      { en: 'Shall we get started?', ru: 'начнём?' },
    ],
    tasks: [
      one('"How are you?" — best reply in a work call:', [
        'I am fine thank you and you?',
        "Good, thanks — how about you?",
        'Not bad, I had a difficult morning because my cat was ill and then...',
        'Normal.',
      ], 1),
      one('Bad connection. What do you say?', [
        'You are breaking.', "Sorry, you're breaking up — could you say that again?", 'I not hear.', 'Speak louder!',
      ], 1),
      fill('Complete: Shall we get ___? (verb)', 'started'),
      wb('Thanks for having me today.', 'Put the words in order.', ['have', 'to']),
      say('Record a two-minute small talk opening: greet, answer how you are, return the question, and suggest starting.', 120),
    ],
  },

  // ═══ Модуль 3. Собеседования ═══
  {
    n: 12, shortId: 'endc-12',
    title: 'Расскажите о себе',
    goal: 'Дать структурный ответ на самый частый вопрос',
    grammar: 'Сочетание времён: настоящее (сейчас) → прошедшее (путь) → будущее (чего хочу)',
    grammarWhy: 'Правильный ответ проходит через три времени. Русскоязычные обычно застревают в прошедшем и пересказывают биографию.',
    vocabTheme: 'Самопрезентация',
    artifact: 'Ответ на 90 секунд',
    vocab: [
      { en: 'Currently I work as', ru: 'сейчас я работаю' },
      { en: 'Before that', ru: 'до этого' },
      { en: 'What I enjoy most is', ru: 'больше всего мне нравится' },
      { en: "What I'm looking for next", ru: 'чего я ищу дальше' },
      { en: 'to grow into', ru: 'дорасти до' },
      { en: 'strength', ru: 'сильная сторона' },
      { en: 'weakness', ru: 'слабая сторона' },
      { en: 'to be drawn to', ru: 'тянуться к' },
      { en: 'career path', ru: 'карьерный путь' },
      { en: 'in a nutshell', ru: 'если коротко' },
    ],
    tasks: [
      one('Best structure for "Tell me about yourself"?', [
        'Childhood → school → university → jobs',
        'Now → how I got here → what I want next',
        'Only my achievements',
        'Only what I want next',
      ], 1),
      fill('Complete: ___ that, I worked at an agency. (preposition)', 'Before'),
      wb('What I am looking for next is a smaller team.', 'Put the words in order.', ['want', 'was']),
      many('Which belong in a 90-second answer? Choose all that apply.', [
        'Your current role', 'Your school grades', 'One strong result', 'What you want next',
      ], [0, 2, 3]),
      say('Answer "Tell me about yourself" in 90 seconds. Move through three tenses: present, past, future.', 90),
    ],
  },
  {
    n: 13, shortId: 'endc-13',
    title: 'STAR: рассказать историю',
    goal: 'Отвечать на поведенческие вопросы по структуре',
    grammar: 'Past Simple + Past Continuous для фона; результат в Present Perfect',
    grammarWhy: 'История требует двух прошедших времён: что происходило фоном и что ты сделал. Без этого рассказ плоский.',
    vocabTheme: 'Поведенческие вопросы',
    artifact: 'Три готовые истории по STAR',
    vocab: [
      { en: 'Tell me about a time when', ru: 'расскажите о случае, когда' },
      { en: 'situation', ru: 'ситуация' },
      { en: 'task', ru: 'задача' },
      { en: 'action', ru: 'действие' },
      { en: 'result', ru: 'результат' },
      { en: 'to handle', ru: 'справиться с', example: 'How did you handle the disagreement?' },
      { en: 'deadline', ru: 'срок сдачи' },
      { en: 'conflict', ru: 'конфликт' },
      { en: 'to push back', ru: 'возразить, не согласиться' },
      { en: 'lesson learned', ru: 'какой урок вынес' },
    ],
    tasks: [
      one('What does STAR stand for?', [
        'Situation, Task, Action, Result',
        'Story, Time, Answer, Reason',
        'Start, Talk, Ask, Reply',
        'Situation, Time, Action, Reason',
      ], 0),
      one('Choose the background tense: "While we ___ on the redesign, the client changed the brief."', ['worked', 'were working', 'have worked', 'work'], 1),
      fill('Complete: Tell me about a time ___ you disagreed with a colleague. (conjunction)', 'when'),
      wb('While we were working on the redesign, the deadline moved.', 'Put the words in order.', ['work', 'have']),
      write('Write one STAR story: a time you disagreed with someone about a design decision. Label each part S / T / A / R.'),
    ],
  },
  {
    n: 14, shortId: 'endc-14',
    title: 'Защита портфолио',
    goal: 'Провести по проекту за 10 минут и удержать внимание',
    grammar: 'Указательные конструкции и переходы: here you can see, moving on to, what this shows is',
    grammarWhy: 'Презентация — это не описание, а проводка. Нужны фразы-указатели, иначе слушатель теряется в экране.',
    vocabTheme: 'Презентация проекта',
    artifact: 'Десятиминутная защита одного кейса',
    vocab: [
      { en: 'walk you through', ru: 'провести вас по', example: "Let me walk you through the process." },
      { en: 'Here you can see', ru: 'здесь видно' },
      { en: 'Moving on to', ru: 'переходя к' },
      { en: 'What this shows is', ru: 'это показывает, что' },
      { en: 'to zoom in on', ru: 'подробнее остановиться на' },
      { en: 'the key decision', ru: 'ключевое решение' },
      { en: 'before and after', ru: 'до и после' },
      { en: 'to wrap up', ru: 'подытожить' },
      { en: 'Any questions so far?', ru: 'есть вопросы?' },
      { en: 'to hand over', ru: 'передать слово' },
    ],
    tasks: [
      one('Best phrase to start a portfolio walkthrough?', [
        'I show you my work.',
        'Let me walk you through this project.',
        'Look at this.',
        'This is my project, yes?',
      ], 1),
      one('You want to move to the next screen. Say:', [
        'Next.', 'Moving on to the checkout flow —', 'And now other.', 'Finish this.',
      ], 1),
      fill('Complete: Let me walk you ___ the process. (preposition)', 'through'),
      wb('What this shows is that users skipped the second step.', 'Put the words in order.', ['show', 'was']),
      say('Present one project for three minutes: what the problem was, one key decision you made, and the outcome. Use at least three signposting phrases.', 180),
    ],
  },
  {
    n: 15, shortId: 'endc-15',
    title: 'Дизайн-критика: принимать',
    goal: 'Принять замечание, не защищаясь и не соглашаясь слепо',
    grammar: 'Уступительные конструкции: that\'s fair, I see your point, although, that said',
    grammarWhy: 'Прямое «No, you are wrong» в англоязычной команде читается как агрессия. Нужен слой смягчения, которого в русском нет.',
    vocabTheme: 'Обратная связь по работе',
    artifact: 'Ответы на пять типов критики',
    vocab: [
      { en: "That's fair", ru: 'справедливо' },
      { en: 'I see your point', ru: 'понимаю вашу мысль' },
      { en: 'That said', ru: 'при этом, тем не менее' },
      { en: 'to take on board', ru: 'принять к сведению' },
      { en: 'Could you say more about', ru: 'можете подробнее про' },
      { en: 'I hear you, but', ru: 'я вас понял, но' },
      { en: 'to rethink', ru: 'переосмыслить' },
      { en: 'valid concern', ru: 'обоснованное замечание' },
      { en: 'to iterate on', ru: 'доработать' },
      { en: 'trade-off', ru: 'компромисс' },
    ],
    tasks: [
      one('A reviewer criticises your layout. Best first response?', [
        'No, you are wrong.',
        "That's fair — could you say more about what feels off?",
        'I disagree completely.',
        'OK whatever.',
      ], 1),
      one('You partly agree. Choose the softener:', [
        'I see your point. That said, the constraint was the deadline.',
        'You are wrong because deadline.',
        'No. Deadline.',
        'I see your point and you are wrong.',
      ], 0),
      fill('Complete: I see your ___. (noun)', 'point'),
      wb('That is a valid concern, and I will iterate on it.', 'Put the words in order.', ['was', 'am']),
      write('Someone says: "The onboarding feels too long." Write three different replies: agree, partly agree, politely disagree.'),
    ],
  },
  {
    n: 16, shortId: 'endc-16',
    title: 'Дизайн-критика: давать',
    goal: 'Дать замечание так, чтобы его услышали',
    grammar: 'Смягчение: might, I wonder if, have you considered; вопрос вместо утверждения',
    grammarWhy: 'Критика в форме вопроса воспринимается как участие, а в форме утверждения — как приговор. Это чисто грамматический приём.',
    vocabTheme: 'Формулировки замечаний',
    artifact: 'Разбор чужой работы на 100 слов',
    vocab: [
      { en: 'Have you considered', ru: 'вы не думали о' },
      { en: 'I wonder if', ru: 'интересно, не стоит ли' },
      { en: 'it might be worth', ru: 'возможно, стоит' },
      { en: 'What was the thinking behind', ru: 'какая логика была за' },
      { en: 'my only concern is', ru: 'меня смущает только' },
      { en: 'to flag', ru: 'обратить внимание на' },
      { en: 'nitpick', ru: 'мелкая придирка' },
      { en: 'blocker', ru: 'то, что блокирует' },
      { en: 'overall', ru: 'в целом' },
      { en: 'strong point', ru: 'сильная сторона' },
    ],
    tasks: [
      one('Softest way to raise a problem?', [
        'The contrast is bad.',
        'I wonder if the contrast might be an issue for small screens.',
        'Fix the contrast.',
        'Contrast is wrong, change it.',
      ], 1),
      one('Choose the correct form: "Have you ___ a larger tap target?"', ['consider', 'considered', 'considering', 'considers'], 1),
      fill('Complete: It might be ___ testing on mobile. (verb + -ing form follows)', 'worth'),
      wb('What was the thinking behind this navigation pattern?', 'Put the words in order.', ['is', 'were']),
      write("Review a colleague's screen in 100 words: one strong point, one question, one concern. Use hedging language throughout."),
    ],
  },
  {
    n: 17, shortId: 'endc-17',
    title: 'Твои вопросы к компании',
    goal: 'Задать вопросы, которые показывают уровень',
    grammar: 'Косвенные вопросы; вопросы к процессу, а не к фактам',
    grammarWhy: '«Do you have design system?» и «How does the design system get maintained?» — разница между кандидатом-новичком и специалистом.',
    vocabTheme: 'Процессы в компании',
    artifact: 'Список из семи вопросов',
    vocab: [
      { en: 'design process', ru: 'дизайн-процесс' },
      { en: 'handoff', ru: 'передача в разработку' },
      { en: 'to be involved in', ru: 'участвовать в' },
      { en: 'decision-making', ru: 'принятие решений' },
      { en: 'roadmap', ru: 'план развития продукта' },
      { en: 'How do you usually', ru: 'как вы обычно' },
      { en: 'What does success look like', ru: 'как выглядит успех' },
      { en: 'onboarding', ru: 'адаптация новичка' },
      { en: 'team structure', ru: 'структура команды' },
      { en: 'to iterate', ru: 'итерировать' },
    ],
    tasks: [
      one('Which question shows more seniority?', [
        'Do you have a design system?',
        'How does the design system get maintained, and who owns it?',
        'Is there free coffee?',
        'How many designers?',
      ], 1),
      one('Choose the correct indirect question:', [
        'Could I ask how does the handoff work?',
        'Could I ask how the handoff works?',
        'Could I ask how works the handoff?',
        'Could I ask the handoff how works?',
      ], 1),
      fill('Complete: What ___ success look like in the first three months? (auxiliary)', 'does'),
      wb('How do you usually involve designers in the roadmap?', 'Put the words in order.', ['are', 'is']),
      write('Write seven questions to ask at the end of an interview. At least three must be about process, not facts.'),
    ],
  },
  {
    n: 18, shortId: 'endc-18',
    title: 'После собеседования',
    goal: 'Написать письмо-благодарность и напоминание',
    grammar: 'Present Perfect для связи с настоящим; вежливое напоминание',
    grammarWhy: 'Напоминание — тонкий жанр: надо не давить, но и не исчезнуть. Держится на модальных и на Perfect.',
    vocabTheme: 'Follow-up',
    artifact: 'Два письма: благодарность и напоминание',
    vocab: [
      { en: 'thank-you note', ru: 'письмо с благодарностью' },
      { en: 'I enjoyed our conversation', ru: 'мне понравился наш разговор' },
      { en: 'to touch base', ru: 'связаться, свериться' },
      { en: 'I wanted to follow up on', ru: 'хотел напомнить о' },
      { en: 'at your convenience', ru: 'когда вам будет удобно' },
      { en: 'I understand you are busy', ru: 'понимаю, что вы заняты' },
      { en: 'timeline', ru: 'сроки процесса' },
      { en: 'to keep me posted', ru: 'держать меня в курсе' },
      { en: 'no rush', ru: 'не срочно' },
      { en: 'I appreciate', ru: 'я ценю' },
    ],
    tasks: [
      one('Best follow-up opening after a week of silence?', [
        'Why did you not answer?',
        'I wanted to follow up on our conversation last week.',
        'Hello? Any news?',
        'You promised to answer.',
      ], 1),
      fill('Complete: I ___ to follow up on our conversation. (verb, past)', 'wanted'),
      one('Choose the polite closing:', [
        'Answer me fast.', 'Reply at your convenience — no rush.', 'Waiting.', 'I need answer today.',
      ], 1),
      wb('I really enjoyed our conversation about the design system.', 'Put the words in order.', ['have', 'was']),
      write('Write two emails: (1) a thank-you note sent the same evening, (2) a follow-up sent seven days later. Max 80 words each.'),
    ],
  },

  // ═══ Модуль 4. Оффер и старт ═══
  {
    n: 19, shortId: 'endc-19',
    title: 'Тестовое задание',
    goal: 'Понять бриф и уточнить непонятное до начала работы',
    grammar: 'Уточняющие вопросы; условные первого типа для оговорок',
    grammarWhy: 'Половина проваленных тестовых — это непонятый бриф. Уточняющий вопрос дешевле переделки.',
    vocabTheme: 'Тестовое задание',
    artifact: 'Письмо с уточнениями по брифу',
    vocab: [
      { en: 'test task', ru: 'тестовое задание' },
      { en: 'scope', ru: 'объём работ' },
      { en: 'deliverable', ru: 'что нужно сдать' },
      { en: 'assumption', ru: 'допущение' },
      { en: 'Am I right in thinking', ru: 'правильно ли я понимаю' },
      { en: 'to clarify', ru: 'уточнить' },
      { en: 'If I understand correctly', ru: 'если я правильно понял' },
      { en: 'turnaround', ru: 'срок выполнения' },
      { en: 'unpaid', ru: 'неоплачиваемый' },
      { en: 'to push back on scope', ru: 'оспорить объём' },
    ],
    tasks: [
      one('Choose the correct clarification:', [
        'Am I right in thinking the deliverable is one screen?',
        'Am I right thinking deliverable is one screen?',
        'I right think deliverable one screen?',
        'Right? One screen?',
      ], 0),
      one('First conditional: "If the scope ___ bigger, I will need more time."', ['is', 'will be', 'was', 'would be'], 0),
      fill('Complete: If I understand ___, you need two flows. (adverb)', 'correctly'),
      wb('If the scope grows, I will need an extra day.', 'Put the words in order.', ['would', 'was']),
      write('You received a vague test task brief. Write an email with three clarifying questions and one stated assumption.'),
    ],
  },
  {
    n: 20, shortId: 'endc-20',
    title: 'Переговоры о деньгах',
    goal: 'Назвать вилку и обосновать её',
    grammar: 'Условные второго типа; смягчённые формы: I was hoping, would be able to',
    grammarWhy: 'Переговоры ведутся в сослагательном: «I would be looking for» мягче, чем «I want». Прямая форма закрывает разговор.',
    vocabTheme: 'Компенсация',
    artifact: 'Скрипт переговоров о зарплате',
    vocab: [
      { en: 'salary range', ru: 'зарплатная вилка' },
      { en: 'compensation package', ru: 'весь пакет вознаграждения' },
      { en: 'I was hoping for', ru: 'я рассчитывал на' },
      { en: 'based on my experience', ru: 'исходя из моего опыта' },
      { en: 'to be flexible', ru: 'быть гибким' },
      { en: 'benefits', ru: 'дополнительные условия' },
      { en: 'equity', ru: 'доля в компании' },
      { en: 'gross / net', ru: 'до вычета / после вычета налогов' },
      { en: 'Is there room to move?', ru: 'есть ли пространство для манёвра?' },
      { en: 'to counter', ru: 'сделать встречное предложение' },
    ],
    tasks: [
      one('Softest way to state your number?', [
        'I want 5000.',
        'I was hoping for something in the range of 4,800 to 5,200, based on my experience.',
        'Give me 5000.',
        'My price is 5000, final.',
      ], 1),
      one('Second conditional: "If you ___ increase the base, I would be happy to start earlier."', ['can', 'could', 'will', 'would'], 1),
      fill('Complete: Is there ___ to move on the base salary? (noun)', 'room'),
      wb('I was hoping for something closer to the top of that range.', 'Put the words in order.', ['want', 'am']),
      say('Role-play: the recruiter offers 15% below your target. Respond out loud — acknowledge, state your range, give one reason, and ask if there is room to move.', 90),
    ],
  },
  {
    n: 21, shortId: 'endc-21',
    title: 'Оффер: принять или отказаться',
    goal: 'Принять оффер или вежливо отказаться, не сжигая мост',
    grammar: 'Формулы принятия и отказа; благодарность + причина + дверь открыта',
    grammarWhy: 'Отказ по-английски строится по жёсткой трёхчастной формуле. Нарушишь — прозвучит грубо.',
    vocabTheme: 'Оффер',
    artifact: 'Письмо-принятие и письмо-отказ',
    vocab: [
      { en: 'job offer', ru: 'предложение о работе' },
      { en: 'to accept', ru: 'принять' },
      { en: 'to decline', ru: 'отклонить' },
      { en: 'I am delighted to accept', ru: 'с радостью принимаю' },
      { en: 'after careful thought', ru: 'всё взвесив' },
      { en: 'to move forward with', ru: 'пойти дальше с' },
      { en: 'start date', ru: 'дата выхода' },
      { en: 'contract', ru: 'договор' },
      { en: 'I hope our paths cross again', ru: 'надеюсь, наши пути ещё пересекутся' },
      { en: 'to keep in touch', ru: 'оставаться на связи' },
    ],
    tasks: [
      one('Correct structure for declining an offer?', [
        'No thanks.',
        'Thank you + after careful thought I have decided to decline + I hope we stay in touch.',
        'I found better job.',
        'Sorry, no.',
      ], 1),
      fill('Complete: I am ___ to accept the offer. (adjective)', 'delighted'),
      one('Choose the correct tense: "After careful thought, I ___ decided to decline."', ['have', 'has', 'had', 'am'], 0),
      wb('I hope our paths cross again in the future.', 'Put the words in order.', ['was', 'were']),
      write('Write two emails: accept an offer (confirm start date and one question), and decline another (thank, reason, keep the door open).'),
    ],
  },
  {
    n: 22, shortId: 'endc-22',
    title: 'Первая неделя',
    goal: 'Задавать вопросы новичка, не выглядя беспомощным',
    grammar: 'Вежливая просьба о помощи; where do I find, who should I ask',
    grammarWhy: 'Новичок обязан много спрашивать. Вопрос про процесс звучит профессионально, вопрос про факт — нет.',
    vocabTheme: 'Онбординг',
    artifact: 'Список вопросов на первую неделю',
    vocab: [
      { en: 'to get set up', ru: 'настроить доступы и инструменты' },
      { en: 'access', ru: 'доступ' },
      { en: 'Who should I ask about', ru: 'к кому обратиться по поводу' },
      { en: 'Where do I find', ru: 'где найти' },
      { en: 'to shadow someone', ru: 'походить за кем-то, посмотреть как работает' },
      { en: 'buddy / mentor', ru: 'наставник для новичка' },
      { en: 'one-on-one', ru: 'личная встреча с руководителем' },
      { en: 'to get up to speed', ru: 'войти в курс дела' },
      { en: 'documentation', ru: 'документация' },
      { en: 'I am still getting my head around', ru: 'я ещё разбираюсь с' },
    ],
    tasks: [
      one('Best way to ask for help in week one?', [
        'I do not understand anything.',
        'Who should I ask about design system access?',
        'Help me.',
        'This is confusing.',
      ], 1),
      fill('Complete: I am still getting my head ___ the codebase. (preposition)', 'around'),
      one('Choose the correct question:', [
        'Where I find the brand guidelines?',
        'Where do I find the brand guidelines?',
        'Where do I found the brand guidelines?',
        'Where is find the brand guidelines?',
      ], 1),
      wb('Who should I ask about getting access to the design system?', 'Put the words in order.', ['am', 'do']),
      write('Write ten questions for your first week at a new job. Group them: access, process, people.'),
    ],
  },
  {
    n: 23, shortId: 'endc-23',
    title: 'Личная встреча с руководителем',
    goal: 'Провести один на один: рассказать о прогрессе и попросить нужное',
    grammar: 'Present Perfect Continuous для процесса; конструкции просьбы',
    grammarWhy: '«I have been working on» показывает продолжающийся процесс — то, что нужно на встрече о прогрессе.',
    vocabTheme: 'Встреча один на один',
    artifact: 'План встречи на 30 минут',
    vocab: [
      { en: 'to check in', ru: 'свериться, отметиться' },
      { en: 'I have been working on', ru: 'я работаю над (уже какое-то время)' },
      { en: 'blocker', ru: 'что мешает двигаться' },
      { en: 'priority', ru: 'приоритет' },
      { en: 'bandwidth', ru: 'наличие времени и сил' },
      { en: 'to align on', ru: 'договориться о' },
      { en: 'expectations', ru: 'ожидания' },
      { en: 'Could we revisit', ru: 'можем вернуться к' },
      { en: 'I would appreciate', ru: 'я был бы признателен' },
      { en: 'growth', ru: 'развитие, рост' },
    ],
    tasks: [
      one('Choose the correct form: "I ___ working on the onboarding flow for two weeks."', ['am', 'have been', 'was', 'had'], 1),
      one('Best way to raise a problem with your manager?', [
        'Nothing works.',
        "My main blocker is that I'm waiting on copy — could we align on who owns it?",
        'It is not my fault.',
        'Fix this.',
      ], 1),
      fill('Complete: I would ___ some feedback on the prototype. (verb)', 'appreciate'),
      wb('I have been working on the onboarding flow for two weeks.', 'Put the words in order.', ['am', 'was']),
      say('Run a 90-second one-on-one update: what you have been working on, one blocker, one request.', 90),
    ],
  },

  // ═══ Модуль 5. Работа в команде ═══
  {
    n: 24, shortId: 'endc-24',
    title: 'Стендап за 60 секунд',
    goal: 'Отчитаться на ежедневной планёрке',
    grammar: 'Три времени в трёх фразах: вчера / сегодня / блокеры',
    grammarWhy: 'Формат стендапа жёстко привязан к временам: past — что сделал, present/future — что делаю, present — что мешает.',
    vocabTheme: 'Ежедневная планёрка',
    artifact: 'Скрипт стендапа',
    vocab: [
      { en: 'stand-up', ru: 'ежедневная планёрка' },
      { en: 'Yesterday I finished', ru: 'вчера я закончил' },
      { en: 'Today I am picking up', ru: 'сегодня я берусь за' },
      { en: 'No blockers', ru: 'ничего не мешает' },
      { en: 'I am blocked on', ru: 'я застрял на' },
      { en: 'to hand off to', ru: 'передать кому-то' },
      { en: 'in review', ru: 'на проверке' },
      { en: 'ready for dev', ru: 'готово к разработке' },
      { en: 'to sync with', ru: 'синхронизироваться с' },
      { en: 'quick call', ru: 'короткий созвон' },
    ],
    tasks: [
      one('Correct stand-up structure?', [
        'What I will do next month',
        'Yesterday → today → blockers',
        'My whole backlog',
        'Only problems',
      ], 1),
      fill('Complete: Yesterday I ___ the wireframes. (finish, past simple)', 'finished'),
      one('Choose the correct form: "Today I ___ picking up the checkout screens."', ['am', 'is', 'was', 'have'], 0),
      wb('I am blocked on the API response format.', 'Put the words in order.', ['was', 'have']),
      say('Give a 60-second stand-up: what you finished yesterday, what you are picking up today, and one blocker.', 60),
    ],
  },
  {
    n: 25, shortId: 'endc-25',
    title: 'Slack и почта: разный регистр',
    goal: 'Переключаться между быстрым чатом и деловым письмом',
    grammar: 'Сокращения и эллипсис в чате vs полные формы в письме',
    grammarWhy: 'В Slack пишут «wfh today, back at 2» — в письме так нельзя. Это два разных регистра, и путать их дорого.',
    vocabTheme: 'Рабочая переписка',
    artifact: 'Одно сообщение в двух регистрах',
    vocab: [
      { en: 'heads up', ru: 'предупреждаю заранее' },
      { en: 'FYI', ru: 'к сведению' },
      { en: 'ASAP', ru: 'как можно скорее' },
      { en: 'EOD (end of day)', ru: 'до конца дня' },
      { en: 'wfh (working from home)', ru: 'работаю из дома' },
      { en: 'to loop someone in', ru: 'подключить кого-то к обсуждению' },
      { en: 'thread', ru: 'ветка обсуждения' },
      { en: 'Circling back on', ru: 'возвращаюсь к вопросу о' },
      { en: 'Per my last email', ru: 'как я писал ранее' },
      { en: 'to escalate', ru: 'вынести на уровень выше' },
    ],
    tasks: [
      one('Which is Slack, not email?', [
        'Dear Anna, I hope this email finds you well.',
        'heads up — wfh today, back online at 2',
        'Please find attached the requested document.',
        'I look forward to your response.',
      ], 1),
      pairsOf('Match the abbreviation with its meaning.', [
        ['FYI', 'к сведению'],
        ['EOD', 'до конца дня'],
        ['ASAP', 'как можно скорее'],
        ['wfh', 'работаю из дома'],
      ]),
      fill('Complete: Could you ___ me in on that thread? (verb)', 'loop'),
      wb('Circling back on the pricing page feedback.', 'Put the words in order.', ['am', 'was']),
      write('Write the same message twice: (1) as a Slack message to a teammate, (2) as an email to an external client. The message: you need the copy by Friday.'),
    ],
  },
  {
    n: 26, shortId: 'endc-26',
    title: 'Не согласиться и остаться в команде',
    goal: 'Отстоять решение, не превращая обсуждение в конфликт',
    grammar: 'Смягчённое несогласие; предложение альтернативы вместо отказа',
    grammarWhy: 'Русское прямое «нет» в англоязычной команде читается как эскалация. Отказ упаковывают в согласие + оговорку + альтернативу.',
    vocabTheme: 'Несогласие',
    artifact: 'Три способа сказать «нет»',
    vocab: [
      { en: 'I see it differently', ru: 'я вижу это иначе' },
      { en: 'I am not sure I agree', ru: 'не уверен, что согласен' },
      { en: 'What if we', ru: 'а что если мы' },
      { en: 'the risk with that is', ru: 'риск здесь в том, что' },
      { en: 'to compromise', ru: 'пойти на компромисс' },
      { en: 'to park it', ru: 'отложить обсуждение' },
      { en: 'Let us take it offline', ru: 'обсудим отдельно' },
      { en: 'I would push back on', ru: 'я бы поспорил с' },
      { en: 'happy to be proven wrong', ru: 'буду рад ошибиться' },
      { en: 'to find middle ground', ru: 'найти середину' },
    ],
    tasks: [
      one('Softest disagreement?', [
        'No, that is wrong.',
        "I'm not sure I agree — the risk with that is we lose the second step. What if we tested both?",
        'That will not work.',
        'I disagree.',
      ], 1),
      one('Choose the correct form: "What if we ___ both versions?"', ['test', 'tested', 'will test', 'testing'], 1),
      fill('Complete: I would push ___ on that deadline. (particle)', 'back'),
      wb('The risk with that approach is losing the second step.', 'Put the words in order.', ['are', 'were']),
      write('Your PM wants to cut user research. Write a reply that disagrees but offers an alternative. Max 80 words.'),
    ],
  },
  {
    n: 27, shortId: 'endc-27',
    title: 'Созвон с международным клиентом',
    goal: 'Провести встречу с клиентом от приветствия до договорённостей',
    grammar: 'Управление разговором: подведение итогов, фиксация договорённостей',
    grammarWhy: 'Клиентский созвон обязан заканчиваться проговорёнными следующими шагами — иначе он бесполезен. Это отдельный набор формул.',
    vocabTheme: 'Клиентская встреча',
    artifact: 'Итоги встречи письмом',
    vocab: [
      { en: 'agenda', ru: 'повестка' },
      { en: 'to kick off', ru: 'начать' },
      { en: 'Let me summarise', ru: 'давайте подытожу' },
      { en: 'action item', ru: 'задача по итогам встречи' },
      { en: 'to own', ru: 'взять ответственность за' },
      { en: 'by when', ru: 'к какому сроку' },
      { en: 'Does that work for you?', ru: 'вам так подходит?' },
      { en: 'to recap', ru: 'подвести итог' },
      { en: 'meeting notes', ru: 'заметки со встречи' },
      { en: 'next steps', ru: 'следующие шаги' },
    ],
    tasks: [
      one('Best way to close a client call?', [
        'OK bye.',
        'Let me summarise: you will send the copy by Friday, I will deliver the screens by Tuesday. Does that work for you?',
        'So, that is all.',
        'We finished.',
      ], 1),
      many('What belongs in meeting notes? Choose all that apply.', [
        'Action items', 'Who owns each item', 'The weather', 'Deadlines',
      ], [0, 1, 3]),
      fill('Complete: Let me ___ the main points. (verb)', 'summarise', ['summarize', 'recap']),
      wb('Does that work for you and your team?', 'Put the words in order.', ['is', 'are']),
      say('Close a client call out loud: summarise two agreements, assign owners, confirm deadlines, and check the client agrees.', 90),
    ],
  },
  {
    n: 28, shortId: 'endc-28',
    title: 'Итог: твой английский на работе',
    goal: 'Собрать всё вместе и оценить, где ты сейчас',
    grammar: 'Повторение: времена опыта, модальные вежливости, условные переговоров',
    grammarWhy: 'Финальный юнит проверяет не знание правил, а способность выбрать нужный регистр под ситуацию.',
    vocabTheme: 'Сводный словарь курса',
    artifact: 'Полный пакет: резюме, письмо, кейс, минутная самопрезентация',
    vocab: [
      { en: 'to be fluent in', ru: 'свободно владеть' },
      { en: 'working proficiency', ru: 'рабочий уровень владения' },
      { en: 'to level up', ru: 'вырасти в уровне' },
      { en: 'confident', ru: 'уверенный' },
      { en: 'to keep practising', ru: 'продолжать практиковаться' },
      { en: 'immersion', ru: 'погружение в среду' },
      { en: 'plateau', ru: 'плато, остановка в прогрессе' },
      { en: 'to maintain', ru: 'поддерживать уровень' },
      { en: 'feedback loop', ru: 'цикл обратной связи' },
      { en: 'next milestone', ru: 'следующая веха' },
    ],
    tasks: [
      one('A recruiter writes first. Which register?', [
        'Slack shorthand', 'Full sentences, polite modals', 'Very formal legal English', 'One-word answers',
      ], 1),
      one('Your teammate asks in Slack: "can you take the checkout screens?" Best reply?', [
        'Yes I can take the checkout screens today.',
        'yep, on it — should be in review by EOD',
        'I will consider your request.',
        'No.',
      ], 1),
      many('Which are B1-level can-do statements? Choose all that apply.', [
        'Describe my experience and explain my decisions',
        'Handle most situations while travelling',
        'Write a legal contract',
        'Give reasons and opinions on familiar topics',
      ], [0, 1, 3]),
      write('Final task. Put together your complete package: CV summary, one cover letter, one case study outline, and a 60-second self-introduction script.'),
      say('Deliver your final 60-second self-introduction. This is the same task as Unit 1 — compare it with your first recording.', 60),
    ],
  },
]

// ─── Производные ─────────────────────────────────────────────────────────────

/** Все слова курса — основа словарной колоды и интервальных повторений. */
export const ALL_VOCAB: VocabItem[] = ENGLISH_DESIGN_CAREER.flatMap(u => u.vocab)

/** Юнит по короткому id. */
export function unitByShortId(shortId: string): EnglishUnit | undefined {
  return ENGLISH_DESIGN_CAREER.find(u => u.shortId === shortId)
}

/** Модуль, которому принадлежит юнит. */
export function moduleOf(n: number): EnglishModule | undefined {
  return MODULES.find(m => m.units.includes(n))
}

/** Сводка курса — для карточки курса и страницы описания. */
export const COURSE_SUMMARY = {
  title: 'Английский для дизайнера — от письма до оффера',
  level: 'A2 → B1',
  units: ENGLISH_DESIGN_CAREER.length,
  vocabCount: ALL_VOCAB.length,
  taskCount: ENGLISH_DESIGN_CAREER.reduce((sum, u) => sum + u.tasks.length, 0),
  /** Ориентир CEFR: A2→B1 — примерно 180–200 учебных часов. */
  guidedHours: '180–200',
} as const
