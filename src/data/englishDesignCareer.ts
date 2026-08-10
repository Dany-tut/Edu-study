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

import {
  buildLanguageCourse, courseSummary, allVocab,
  unitByShortId as findUnit, moduleOfUnit,
  one, many, fill, wb, pairsOf, write, say, drill,
} from './languageCourse'
import { ENDC_THEORY, ENDC_VIDEO } from './englishDesignCareerTheory'
import { ENDC_LISTENING } from './englishDesignCareerListening'
import { ENDC_EXTRA } from './englishDesignCareerExtra'
import { formTable, formulaStrip, contrastPair, timelineFigure } from './lessonFigures'
import type { LangModule, LangUnit, LanguageCourseSpec, VocabItem, CourseFigures } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { ENDC_FIGURES_EXTRA } from './englishDesignCareerFigures'
import { ENDC_VIDEO_EXTRA } from './languageVideos'

// ─── Модель ──────────────────────────────────────────────────────────────────
//
// Модель, хелперы заданий и сборщик — общие для всех языковых курсов и живут в
// languageCourse.ts. Здесь остаются прежние имена как псевдонимы: на них
// ссылается контент этого файла и внешние импорты.

export type { VocabItem, SeedTask } from './languageCourse'
export type EnglishUnit = LangUnit
export type EnglishModule = LangModule

export const MODULES: EnglishModule[] = [
  { title: 'Кто я и что я умею', subtitle: 'Профиль, резюме, портфолио, кейс', units: [1, 2, 3, 4, 5, 6] },
  { title: 'Выход на рынок', subtitle: 'Письмо в компанию, ATS, звонок рекрутёра', units: [7, 8, 9, 10, 11] },
  { title: 'Собеседования', subtitle: 'HR, защита портфолио, критика, вопросы', units: [12, 13, 14, 15, 16, 17, 18] },
  { title: 'Оффер и старт', subtitle: 'Тестовое, переговоры, онбординг', units: [19, 20, 21, 22, 23] },
  { title: 'Работа в команде', subtitle: 'Стендапы, переписка, обратная связь, клиенты', units: [24, 25, 26, 27, 28] },
]

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
    pattern: drill(
      'Present Simple: роль и обязанности',
      'кто я и что делаю',
      [
        ['я — дизайнер', 'I am a designer', 'Я дизайнер.'],
        ['я работаю в стартапе', 'I work at a startup', 'Я работаю в стартапе.'],
        ['я отвечаю за исследования', 'I am responsible for research', 'Я отвечаю за исследования.'],
        ['она ведёт проект', 'She leads the project', 'Она ведёт проект.'],
        ['мы делаем прототипы', 'We build prototypes', 'Мы делаем прототипы.'],
      ],
      'Артикль перед профессией обязателен: I am a designer, а не I am designer. В русском артикля нет, и эта ошибка держится дольше всех.',
    ),
    vocab: [
      { term: 'product designer', ru: 'продуктовый дизайнер', example: "I'm a product designer with four years of experience.",
        alt: ['продакт-дизайнер', 'дизайнер продукта'] },
      { term: 'UX/UI designer', ru: 'UX/UI-дизайнер', alt: ['интерфейсный дизайнер', 'дизайнер интерфейсов', 'ux-дизайнер'] },
      { term: 'graphic designer', ru: 'графический дизайнер', alt: ['дизайнер графики'] },
      { term: 'motion designer', ru: 'моушн-дизайнер', alt: ['анимационный дизайнер', 'дизайнер анимации', 'моушен-дизайнер'] },
      { term: 'design lead', ru: 'руководитель дизайн-направления', alt: ['руководитель дизайна', 'дизайн-лид', 'лид дизайна', 'ведущий дизайнер'] },
      { term: 'in-house', ru: 'в штате компании', example: 'I work in-house at a fintech company.',
        alt: ['в компании', 'в штате', 'штатный дизайнер', 'внутри компании'] },
      { term: 'freelance', ru: 'на фрилансе', alt: ['фриланс', 'внештатно', 'фрилансером'] },
      { term: 'agency', ru: 'агентство', alt: ['дизайн-агентство'] },
      { term: 'to specialise in', ru: 'специализироваться на', example: 'I specialise in mobile interfaces.' },
      { term: 'background', ru: 'бэкграунд, предыдущий опыт', example: 'I have a background in illustration.',
        alt: ['прошлый опыт', 'профессиональный опыт', 'предыстория', 'опыт за плечами'] },
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
    pattern: drill(
      'Past Simple: путь',
      'что я делал раньше',
      [
        ['work → прошедшее', 'I worked', 'я работал'],
        ['lead → прошедшее', 'I led', 'я вёл'],
        ['build → прошедшее', 'I built', 'я построил'],
        ['два года', 'for two years', 'в течение двух лет'],
        ['с 2020 по 2023', 'from 2020 to 2023', 'с 2020 по 2023'],
      ],
      'for отвечает на «сколько», from…to — на «когда». Смешение этих двух даёт самое частое «I work here from two years».',
    ),
    vocab: [
      { term: 'to work on', ru: 'работать над', example: 'I worked on a banking app for two years.', alt: ['заниматься', 'трудиться над'] },
      { term: 'to join', ru: 'прийти в компанию', example: 'I joined the team in 2022.',
        alt: ['присоединиться к команде', 'устроиться в компанию', 'войти в команду'] },
      { term: 'to leave', ru: 'уйти из компании', alt: ['покинуть компанию', 'уволиться', 'уйти с работы'] },
      { term: 'previous role', ru: 'предыдущая должность', alt: ['прошлая должность', 'предыдущая позиция', 'прежняя роль'] },
      { term: 'to be responsible for', ru: 'отвечать за', example: 'I was responsible for the design system.',
        alt: ['нести ответственность за', 'быть ответственным за'] },
      { term: 'to redesign', ru: 'переделать, обновить дизайн', alt: ['переработать дизайн', 'сделать редизайн'] },
      { term: 'to launch', ru: 'запустить', alt: ['выпустить', 'вывести на рынок', 'запустить продукт'] },
      { term: 'startup', ru: 'стартап' },
      { term: 'client', ru: 'клиент, заказчик', alt: ['клиент', 'заказчик'] },
      { term: 'from 2021 to 2024', ru: 'с 2021 по 2024', alt: ['с 2021 до 2024', 'с 2021 года по 2024 год'] },
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
    pattern: drill(
      'Present Perfect: достижения',
      'что уже сделано',
      [
        ['я запустил три продукта', 'I have launched three products', 'Я запустил три продукта.'],
        ['я увеличил конверсию', 'I have increased conversion', 'Я увеличил конверсию.'],
        ['я сократил время на 30%', 'I have reduced time by 30%', 'Я сократил время на 30%.'],
        ['я работал с командой', 'I have worked with the team', 'Я работал с командой.'],
        ['я ещё не закончил', 'I have not finished yet', 'Я ещё не закончил.'],
      ],
      'В резюме и на собеседовании достижения идут в Present Perfect: важен результат, который есть сейчас, а не когда именно это было.',
    ),
    vocab: [
      { term: 'to increase', ru: 'увеличить', example: 'I have increased conversion by 18%.', alt: ['повысить', 'поднять', 'нарастить'] },
      { term: 'to reduce', ru: 'сократить', example: 'We reduced support tickets by a third.', alt: ['снизить', 'уменьшить'] },
      { term: 'to improve', ru: 'улучшить', alt: ['сделать лучше', 'повысить качество'] },
      { term: 'conversion rate', ru: 'конверсия', alt: ['коэффициент конверсии', 'показатель конверсии'] },
      { term: 'retention', ru: 'удержание пользователей', alt: ['удержание', 'возвращаемость пользователей'] },
      { term: 'churn', ru: 'отток пользователей', alt: ['отток', 'отток клиентов'] },
      { term: 'by 18%', ru: 'на 18 процентов', alt: ['на 18%'] },
      { term: 'impact', ru: 'влияние, эффект', example: 'What was the impact of your redesign?', alt: ['эффект', 'влияние', 'воздействие'] },
      { term: 'to ship', ru: 'выпустить, довести до релиза', alt: ['выкатить', 'зарелизить', 'выпустить в релиз'] },
      { term: 'measurable', ru: 'измеримый', alt: ['который можно измерить', 'поддающийся измерению'] },
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
      { term: 'CV / resume', ru: 'резюме', example: 'Please find my CV attached.', alt: ['сиви', 'си-ви'] },
      { term: 'summary', ru: 'краткое описание в начале резюме', alt: ['саммари', 'краткое описание', 'вводный абзац резюме', 'выжимка'] },
      { term: 'work experience', ru: 'опыт работы', alt: ['стаж работы', 'профессиональный опыт'] },
      { term: 'skills', ru: 'навыки', alt: ['умения', 'компетенции'] },
      { term: 'proficient in', ru: 'уверенно владею', example: 'Proficient in Figma and prototyping.',
        alt: ['хорошо владею', 'свободно владею', 'владею на высоком уровне'] },
      { term: 'references', ru: 'рекомендации', alt: ['рекомендательные письма', 'отзывы бывших работодателей'] },
      { term: 'bullet point', ru: 'пункт списка', alt: ['буллит', 'пункт маркированного списка'] },
      { term: 'concise', ru: 'ёмкий, без лишнего', alt: ['лаконичный', 'краткий', 'сжатый'] },
      { term: 'tailored', ru: 'адаптированный под вакансию', alt: ['заточенный под вакансию', 'подогнанный под вакансию'] },
      { term: 'one-pager', ru: 'резюме на одну страницу', alt: ['одностраничное резюме', 'резюме на одной странице'] },
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
    pattern: drill(
      'пассив для процесса',
      'как устроена работа',
      [
        ['we test the mockup', 'the mockup is tested', 'макет тестируется'],
        ['we collected the data', 'the data was collected', 'данные были собраны'],
        ['we made the decision', 'the decision was made', 'решение было принято'],
        ['we review the design', 'the design is reviewed', 'дизайн проверяется'],
        ['we interviewed users', 'users were interviewed', 'пользователей опросили'],
      ],
      'Описывая процесс, деятеля обычно не называют — важно, что происходит, а не кто именно это делает.',
    ),
    vocab: [
      { term: 'case study', ru: 'разбор проекта, кейс', alt: ['кейс', 'разбор кейса', 'описание проекта'] },
      { term: 'brief', ru: 'бриф, постановка задачи', alt: ['техническое задание', 'задание от заказчика', 'постановка задачи'] },
      { term: 'research', ru: 'исследование', alt: ['ресёрч', 'исследования'] },
      { term: 'user interview', ru: 'интервью с пользователем', alt: ['интервью с пользователями', 'глубинное интервью'] },
      { term: 'wireframe', ru: 'вайрфрейм, каркас', alt: ['каркас интерфейса', 'схема экрана'] },
      { term: 'prototype', ru: 'прототип' },
      { term: 'usability testing', ru: 'юзабилити-тестирование', alt: ['тестирование удобства', 'юзабилити-тест', 'тест на удобство'] },
      { term: 'iteration', ru: 'итерация' },
      { term: 'constraint', ru: 'ограничение', example: 'The main constraint was the deadline.', alt: ['рамки', 'ограничивающее условие'] },
      { term: 'outcome', ru: 'итог, результат', alt: ['результат', 'что получилось'] },
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
    pattern: drill(
      'связки последовательности и причины',
      'структура рассказа',
      [
        ['сначала', 'first', 'сначала'],
        ['затем', 'then', 'затем'],
        ['из-за этого', 'because of this', 'из-за этого'],
        ['в результате', 'as a result', 'в результате'],
        ['однако', 'however', 'однако'],
      ],
      'because of берёт существительное, because — целое предложение. Их путают чаще всего.',
    ),
    vocab: [
      { term: 'problem statement', ru: 'формулировка проблемы', alt: ['постановка проблемы', 'описание проблемы'] },
      { term: 'hypothesis', ru: 'гипотеза' },
      { term: 'trade-off', ru: 'компромисс, размен', alt: ['компромисс', 'размен', 'выбор с потерями'] },
      { term: 'as a result', ru: 'в результате', alt: ['в итоге', 'как результат'] },
      { term: 'however', ru: 'однако', alt: ['но', 'тем не менее', 'при этом'] },
      { term: 'therefore', ru: 'поэтому', alt: ['следовательно', 'значит', 'потому'] },
      { term: 'due to', ru: 'из-за, по причине', alt: ['из-за', 'по причине', 'вследствие'] },
      { term: 'stakeholder', ru: 'заинтересованная сторона', alt: ['стейкхолдер', 'заинтересованное лицо'] },
      { term: 'to validate', ru: 'проверить, подтвердить', alt: ['валидировать', 'подтвердить гипотезу'] },
      { term: 'takeaway', ru: 'вывод, что вынес', alt: ['вывод', 'урок', 'что я вынес'] },
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
    pattern: drill(
      'модальные вежливости',
      'просьба без нажима',
      [
        ['send it → вежливо', 'could you send it', 'не могли бы вы прислать'],
        ['I want to ask → вежливо', 'I would like to ask', 'я хотел бы спросить'],
        ['can I → вежливее', 'may I', 'могу ли я'],
        ['is it possible → мягче', 'would that be possible', 'было бы это возможно'],
        ['I need → мягче', 'it would be helpful to have', 'было бы полезно получить'],
      ],
      'Прямая форма (send me the file) в английской переписке звучит как приказ. Смягчение через could и would — не подобострастие, а норма регистра.',
    ),
    vocab: [
      { term: 'to reach out', ru: 'написать, выйти на связь', example: "I'm reaching out about the Product Designer role.",
        alt: ['обратиться', 'связаться', 'выйти на связь'] },
      { term: 'opening', ru: 'вакансия, открытая позиция', alt: ['вакансия', 'открытая вакансия', 'свободная позиция'] },
      { term: 'to come across', ru: 'наткнуться на', example: 'I came across your job posting on LinkedIn.',
        alt: ['натолкнуться на', 'случайно найти', 'увидеть'] },
      { term: 'I would be glad to', ru: 'я был бы рад', alt: ['буду рад', 'с радостью'] },
      { term: 'Please find attached', ru: 'во вложении', alt: ['прилагаю', 'прикладываю', 'во вложении файл'] },
      { term: 'Looking forward to hearing from you', ru: 'жду вашего ответа',
        alt: ['жду ответа', 'буду ждать вашего ответа', 'с нетерпением жду ответа'] },
      { term: 'Best regards', ru: 'с уважением', alt: ['всего доброго', 'с наилучшими пожеланиями'] },
      { term: 'to follow up', ru: 'напомнить о себе', alt: ['написать повторно', 'уточнить статус', 'вернуться к вопросу'] },
      { term: 'availability', ru: 'когда вам удобно', alt: ['ваша доступность', 'свободное время', 'когда вы свободны'] },
      { term: 'relevant', ru: 'подходящий, релевантный', alt: ['релевантный', 'подходящий', 'уместный'] },
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
    pattern: drill(
      'причина и цель',
      'почему и зачем',
      [
        ['потому что + предложение', 'because', 'потому что'],
        ['так как (в начале фразы)', 'since', 'так как'],
        ['чтобы + инфинитив', 'in order to', 'чтобы'],
        ['чтобы + придаточное', 'so that', 'чтобы'],
        ['из-за + существительное', 'due to', 'из-за'],
      ],
      'in order to тянет инфинитив, so that — целое придаточное с подлежащим. Выбор диктуется тем, что идёт дальше.',
    ),
    vocab: [
      { term: 'cover letter', ru: 'сопроводительное письмо', alt: ['сопроводительное', 'мотивационное письмо'] },
      { term: 'to apply for', ru: 'подавать заявку на', example: "I'm applying for the Senior Designer position.",
        alt: ['откликнуться на', 'податься на', 'подать заявку'] },
      { term: 'job posting', ru: 'вакансия, объявление', alt: ['объявление о вакансии', 'вакансия'] },
      { term: 'requirement', ru: 'требование', alt: ['требования'] },
      { term: 'to match', ru: 'соответствовать', alt: ['совпадать', 'подходить', 'отвечать требованиям'] },
      { term: 'what draws me to', ru: 'что меня привлекает в', alt: ['чем меня привлекает', 'что притягивает меня в'] },
      { term: 'in order to', ru: 'чтобы, для того чтобы', alt: ['чтобы', 'для того чтобы', 'с целью'] },
      { term: 'contribution', ru: 'вклад', alt: ['мой вклад', 'вклад в дело'] },
      { term: 'to be a good fit', ru: 'подходить', example: 'I believe I would be a good fit for this team.',
        alt: ['хорошо подходить', 'вписаться в команду'] },
      { term: 'genuinely', ru: 'искренне', alt: ['по-настоящему', 'действительно', 'неподдельно'] },
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
      { term: 'ATS (applicant tracking system)', ru: 'система автоматического отбора резюме',
        alt: ['система отбора резюме', 'автоматический отбор резюме', 'система отслеживания кандидатов'] },
      { term: 'to screen', ru: 'отсеивать, проводить первичный отбор', alt: ['отсеивать', 'фильтровать кандидатов', 'проводить первичный отбор'] },
      { term: 'keyword', ru: 'ключевое слово' },
      { term: 'headline', ru: 'заголовок профиля', alt: ['заголовок', 'подпись профиля'] },
      { term: 'to optimise', ru: 'оптимизировать', alt: ['улучшить', 'настроить под поиск'] },
      { term: 'shortlist', ru: 'список финалистов', alt: ['шорт-лист', 'короткий список кандидатов'] },
      { term: 'to be rejected', ru: 'получить отказ', alt: ['быть отклонённым', 'не пройти отбор'] },
      { term: 'open to work', ru: 'открыт к предложениям', alt: ['в поиске работы', 'ищу работу'] },
      { term: 'endorsement', ru: 'подтверждение навыка', alt: ['подтверждение навыков', 'рекомендация навыка'] },
      { term: 'recruiter', ru: 'рекрутёр', alt: ['рекрутер', 'эйчар', 'hr'] },
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
    pattern: drill(
      'Present Continuous: сейчас',
      'текущая ситуация',
      [
        ['я сейчас над этим работаю', 'I am working on it', 'Я сейчас над этим работаю.'],
        ['мы сейчас тестируем', 'we are testing', 'мы сейчас тестируем'],
        ['она в отпуске', 'she is on leave', 'она в отпуске'],
        ['вежливый отказ', 'I am afraid I cannot', 'боюсь, я не смогу'],
        ['уточнение', 'just to clarify', 'просто уточню'],
      ],
      'Continuous описывает то, что идёт прямо сейчас или в этот период. Про обязанности говорят простым настоящим — это разные вещи.',
    ),
    vocab: [
      { term: 'screening call', ru: 'первичный звонок', alt: ['скрининг', 'отборочный звонок', 'первичное собеседование'] },
      { term: "I'm currently looking for", ru: 'сейчас я ищу' },
      { term: 'notice period', ru: 'срок отработки при увольнении', alt: ['срок отработки', 'отработка при увольнении', 'период уведомления'] },
      { term: 'salary expectations', ru: 'зарплатные ожидания', alt: ['ожидания по зарплате', 'зарплатный запрос'] },
      { term: 'Sorry, could you repeat that?', ru: 'простите, можете повторить?',
        alt: ['извините, можете повторить', 'простите, повторите пожалуйста'] },
      { term: 'Just to clarify', ru: 'чтобы уточнить', alt: ['уточню', 'просто уточнить'] },
      { term: 'remote / hybrid / on-site', ru: 'удалённо / гибрид / в офисе', alt: ['удалёнка гибрид офис', 'удалённо гибрид в офисе'] },
      { term: 'time zone', ru: 'часовой пояс', alt: ['таймзона'] },
      { term: 'to be available', ru: 'быть свободным, доступным', alt: ['быть доступным', 'быть свободным', 'иметь время'] },
      { term: 'next steps', ru: 'следующие шаги' },
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
      { term: 'How is it going?', ru: 'как дела?', alt: ['как оно', 'как жизнь', 'как ты'] },
      { term: 'How about you?', ru: 'а у вас?', alt: ['а вы', 'а ты', 'а как у вас'] },
      { term: 'Can you hear me?', ru: 'вы меня слышите?', alt: ['меня слышно', 'слышите меня'] },
      { term: "You're breaking up", ru: 'вас прерывает' },
      { term: 'to catch up', ru: 'наверстать, поболтать', alt: ['поболтать', 'наверстать', 'пообщаться'] },
      { term: 'weather', ru: 'погода' },
      { term: 'weekend plans', ru: 'планы на выходные', alt: ['планы на уикенд'] },
      { term: 'Nice to meet you', ru: 'приятно познакомиться', alt: ['рад знакомству', 'очень приятно'] },
      { term: 'Thanks for having me', ru: 'спасибо, что пригласили', alt: ['спасибо за приглашение', 'спасибо, что позвали'] },
      { term: 'Shall we get started?', ru: 'начнём?', alt: ['начинаем', 'приступим', 'может, начнём'] },
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
      { term: 'Currently I work as', ru: 'сейчас я работаю', alt: ['в настоящее время я работаю', 'сейчас работаю'] },
      { term: 'Before that', ru: 'до этого', alt: ['раньше', 'до того'] },
      { term: 'What I enjoy most is', ru: 'больше всего мне нравится', alt: ['что мне нравится больше всего', 'больше всего я люблю'] },
      { term: "What I'm looking for next", ru: 'чего я ищу дальше' },
      { term: 'to grow into', ru: 'дорасти до', alt: ['вырасти до', 'дорасти до роли'] },
      { term: 'strength', ru: 'сильная сторона', alt: ['сильные стороны', 'сильное качество'] },
      { term: 'weakness', ru: 'слабая сторона', alt: ['слабые стороны', 'слабое место'] },
      { term: 'to be drawn to', ru: 'тянуться к', alt: ['испытывать интерес к', 'тянуть к'] },
      { term: 'career path', ru: 'карьерный путь', alt: ['карьерная траектория', 'путь в карьере'] },
      { term: 'in a nutshell', ru: 'если коротко', alt: ['вкратце', 'в двух словах', 'если кратко'] },
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
    pattern: drill(
      'Past Continuous как фон',
      'что происходило, когда',
      [
        ['я работал, когда пришёл запрос', 'I was working when the request came', 'Я работал, когда пришёл запрос.'],
        ['мы обсуждали макет', 'we were discussing the mockup', 'мы обсуждали макет'],
        ['пока я тестировал', 'while I was testing', 'пока я тестировал'],
        ['команда ждала', 'the team was waiting', 'команда ждала'],
        ['мы это починили', 'we have fixed it', 'мы это починили'],
      ],
      'Фон идёт в Continuous, короткое событие — в Past Simple, а результат, важный сейчас, — в Present Perfect. Три времени в одной истории.',
    ),
    vocab: [
      { term: 'Tell me about a time when', ru: 'расскажите о случае, когда', alt: ['расскажите про случай, когда', 'приведите пример, когда'] },
      { term: 'situation', ru: 'ситуация' },
      { term: 'task', ru: 'задача' },
      { term: 'action', ru: 'действие' },
      { term: 'result', ru: 'результат' },
      { term: 'to handle', ru: 'справиться с', example: 'How did you handle the disagreement?', alt: ['разобраться с', 'уладить', 'справляться с'] },
      { term: 'deadline', ru: 'срок сдачи', alt: ['дедлайн', 'срок'] },
      { term: 'conflict', ru: 'конфликт' },
      { term: 'to push back', ru: 'возразить, не согласиться', alt: ['возразить', 'не согласиться', 'отстоять свою позицию'] },
      { term: 'lesson learned', ru: 'какой урок вынес', alt: ['вывод', 'чему научился', 'какой урок извлёк'] },
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
      { term: 'walk you through', ru: 'провести вас по', example: "Let me walk you through the process.",
        alt: ['провести по', 'рассказать по шагам', 'показать шаг за шагом'] },
      { term: 'Here you can see', ru: 'здесь видно', alt: ['тут видно', 'здесь вы видите'] },
      { term: 'Moving on to', ru: 'переходя к', alt: ['переходим к', 'перейдём к'] },
      { term: 'What this shows is', ru: 'это показывает, что', alt: ['это показывает', 'отсюда видно, что'] },
      { term: 'to zoom in on', ru: 'подробнее остановиться на', alt: ['рассмотреть поближе', 'углубиться в', 'остановиться подробнее на'] },
      { term: 'the key decision', ru: 'ключевое решение', alt: ['главное решение'] },
      { term: 'before and after', ru: 'до и после' },
      { term: 'to wrap up', ru: 'подытожить', alt: ['завершить', 'подвести итог', 'закруглиться'] },
      { term: 'Any questions so far?', ru: 'есть вопросы?', alt: ['пока есть вопросы', 'вопросы есть'] },
      { term: 'to hand over', ru: 'передать слово', alt: ['отдать слово', 'передать эстафету'] },
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
    pattern: drill(
      'уступка',
      'согласиться, не уступив',
      [
        ['это справедливо', 'that is fair', 'это справедливо'],
        ['понимаю вашу мысль', 'I see your point', 'понимаю вашу мысль'],
        ['хотя', 'although', 'хотя'],
        ['при этом', 'that said', 'при этом'],
        ['отчасти согласен', 'I partly agree', 'отчасти согласен'],
      ],
      'Уступка перед возражением снимает половину сопротивления. Возражение без неё в английской переписке читается как конфликт.',
    ),
    vocab: [
      { term: "That's fair", ru: 'справедливо' },
      { term: 'I see your point', ru: 'понимаю вашу мысль', alt: ['понимаю, о чём вы', 'вижу вашу точку зрения'] },
      { term: 'That said', ru: 'при этом, тем не менее', alt: ['тем не менее', 'при этом', 'вместе с тем'] },
      { term: 'to take on board', ru: 'принять к сведению', alt: ['учесть', 'принять во внимание', 'взять на заметку'] },
      { term: 'Could you say more about', ru: 'можете подробнее про', alt: ['расскажите подробнее о', 'можете подробнее рассказать про'] },
      { term: 'I hear you, but', ru: 'я вас понял, но', alt: ['я вас слышу, но', 'понимаю вас, но'] },
      { term: 'to rethink', ru: 'переосмыслить', alt: ['пересмотреть', 'передумать заново'] },
      { term: 'valid concern', ru: 'обоснованное замечание', alt: ['справедливое замечание', 'резонное опасение'] },
      { term: 'to iterate on', ru: 'доработать', alt: ['улучшать по кругу', 'дорабатывать', 'итерировать'] },
      { term: 'trade-off', ru: 'компромисс', alt: ['размен', 'уступка', 'выбор с потерями'] },
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
    pattern: drill(
      'смягчение критики',
      'вопрос вместо утверждения',
      [
        ['we must → мягче', 'we might want to', 'возможно, нам стоит'],
        ['this is wrong → мягче', 'I wonder if this is the best option', 'не уверен, что это лучший вариант'],
        ['do it this way → мягче', 'have you considered', 'вы рассматривали'],
        ['this will not work → мягче', 'I am not sure this would work', 'не уверен, что это сработает'],
        ['redo it → мягче', 'could we revisit this', 'может, вернёмся к этому'],
      ],
      'Критика, поданная вопросом, оставляет собеседнику выход. Это не смягчение ради приличия, а способ, которым в англоязычной команде вообще ведут спор.',
    ),
    vocab: [
      { term: 'Have you considered', ru: 'вы не думали о', alt: ['вы рассматривали', 'вы думали о', 'не рассматривали ли вы'] },
      { term: 'I wonder if', ru: 'интересно, не стоит ли', alt: ['а не стоит ли', 'мне интересно, не стоит ли'] },
      { term: 'it might be worth', ru: 'возможно, стоит', alt: ['наверное, стоит', 'возможно, имеет смысл'] },
      { term: 'What was the thinking behind', ru: 'какая логика была за', alt: ['какая была логика', 'почему так решили', 'что стояло за'] },
      { term: 'my only concern is', ru: 'меня смущает только', alt: ['единственное, что меня смущает', 'беспокоит только одно'] },
      { term: 'to flag', ru: 'обратить внимание на', alt: ['подсветить', 'отметить', 'указать на'] },
      { term: 'nitpick', ru: 'мелкая придирка', alt: ['придирка', 'мелкое замечание'] },
      { term: 'blocker', ru: 'то, что блокирует', alt: ['блокер', 'препятствие', 'что мешает'] },
      { term: 'overall', ru: 'в целом', alt: ['в общем', 'по совокупности'] },
      { term: 'strong point', ru: 'сильная сторона', alt: ['сильные стороны', 'плюс', 'сильное место'] },
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
    pattern: drill(
      'косвенные вопросы',
      'вежливый запрос информации',
      [
        ['Where is the file?', 'could you tell me where the file is', 'не подскажете, где файл'],
        ['What did they decide?', 'do you know what they decided', 'вы не знаете, что они решили'],
        ['How does it work?', 'I was wondering how it works', 'мне интересно, как это работает'],
        ['Why was it changed?', 'could you explain why it was changed', 'не объясните, почему это изменили'],
        ['Is it ready?', 'do you know if it is ready', 'вы не знаете, готово ли это'],
      ],
      'В косвенном вопросе порядок слов ПРЯМОЙ: where the file is, а не where is the file. Это главная механическая ошибка в этой конструкции.',
    ),
    vocab: [
      { term: 'design process', ru: 'дизайн-процесс', alt: ['процесс дизайна', 'процесс работы над дизайном'] },
      { term: 'handoff', ru: 'передача в разработку', alt: ['хендофф', 'передача макетов разработчикам'] },
      { term: 'to be involved in', ru: 'участвовать в', alt: ['быть вовлечённым в', 'принимать участие в'] },
      { term: 'decision-making', ru: 'принятие решений', alt: ['принятие решения', 'процесс принятия решений'] },
      { term: 'roadmap', ru: 'план развития продукта', alt: ['роадмап', 'дорожная карта', 'план продукта'] },
      { term: 'How do you usually', ru: 'как вы обычно', alt: ['как вы обычно делаете', 'как у вас обычно'] },
      { term: 'What does success look like', ru: 'как выглядит успех', alt: ['что считается успехом', 'как измеряется успех'] },
      { term: 'onboarding', ru: 'адаптация новичка', alt: ['онбординг', 'адаптация', 'введение в должность'] },
      { term: 'team structure', ru: 'структура команды', alt: ['состав команды', 'устройство команды'] },
      { term: 'to iterate', ru: 'итерировать', alt: ['дорабатывать по кругу', 'делать итерации'] },
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
    pattern: drill(
      'Present Perfect: напоминание',
      'связь с настоящим',
      [
        ['я отправил письмо', 'I have sent the email', 'Я отправил письмо.'],
        ['успели посмотреть?', 'have you had a chance to look', 'успели посмотреть?'],
        ['ответа пока нет', 'I have not heard back yet', 'я пока не получил ответа'],
        ['мы это уже обсуждали', 'we have already discussed this', 'мы это уже обсуждали'],
        ['напоминаю об этом', 'just following up on this', 'напоминаю об этом'],
      ],
      'following up — стандартная формула напоминания. Она вежливее прямого reminder и не звучит как упрёк.',
    ),
    vocab: [
      { term: 'thank-you note', ru: 'письмо с благодарностью', alt: ['благодарственное письмо', 'письмо благодарности'] },
      { term: 'I enjoyed our conversation', ru: 'мне понравился наш разговор', alt: ['было приятно поговорить', 'рад был пообщаться'] },
      { term: 'to touch base', ru: 'связаться, свериться', alt: ['связаться', 'свериться', 'списаться'] },
      { term: 'I wanted to follow up on', ru: 'хотел напомнить о', alt: ['хотел уточнить по', 'возвращаюсь к вопросу о'] },
      { term: 'at your convenience', ru: 'когда вам будет удобно', alt: ['когда вам удобно', 'в удобное для вас время'] },
      { term: 'I understand you are busy', ru: 'понимаю, что вы заняты', alt: ['знаю, что вы заняты', 'понимаю, что вы загружены'] },
      { term: 'timeline', ru: 'сроки процесса', alt: ['сроки', 'график процесса'] },
      { term: 'to keep me posted', ru: 'держать меня в курсе', alt: ['держать в курсе', 'сообщать новости'] },
      { term: 'no rush', ru: 'не срочно', alt: ['без спешки', 'не горит'] },
      { term: 'I appreciate', ru: 'я ценю', alt: ['ценю', 'я признателен', 'благодарен'] },
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
    pattern: drill(
      'условные первого типа',
      'реальная договорённость',
      [
        ['если пришлёте сегодня', 'if you send it today', 'если пришлёте сегодня'],
        ['мы успеем', 'we will make it', 'мы успеем'],
        ['если не успеем', 'if we do not make it', 'если не успеем'],
        ['просто уточняю', 'just to confirm', 'просто уточняю'],
        ['что если', 'what if', 'что если'],
      ],
      'После if будущее время НЕ ставится: if you send, а не if you will send. Will уходит во вторую половину фразы.',
    ),
    vocab: [
      { term: 'test task', ru: 'тестовое задание', alt: ['тестовое', 'тест-задание'] },
      { term: 'scope', ru: 'объём работ', alt: ['скоуп', 'объём задачи', 'границы работ'] },
      { term: 'deliverable', ru: 'что нужно сдать', alt: ['результат работы', 'что сдаём', 'итоговый артефакт'] },
      { term: 'assumption', ru: 'допущение', alt: ['предположение'] },
      { term: 'Am I right in thinking', ru: 'правильно ли я понимаю', alt: ['правильно ли я понял', 'верно ли я понимаю'] },
      { term: 'to clarify', ru: 'уточнить', alt: ['прояснить', 'уточнять'] },
      { term: 'If I understand correctly', ru: 'если я правильно понял', alt: ['если я правильно понимаю', 'насколько я понял'] },
      { term: 'turnaround', ru: 'срок выполнения', alt: ['время выполнения', 'срок сдачи'] },
      { term: 'unpaid', ru: 'неоплачиваемый', alt: ['без оплаты', 'бесплатный'] },
      { term: 'to push back on scope', ru: 'оспорить объём', alt: ['оспорить объём работ', 'сократить объём', 'возразить по объёму'] },
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
    pattern: drill(
      'условные второго типа и смягчение',
      'переговоры',
      [
        ['если бы было больше времени', 'if we had more time', 'если бы у нас было больше времени'],
        ['мы бы сделали иначе', 'we would do it differently', 'мы бы сделали иначе'],
        ['я надеялся', 'I was hoping', 'я надеялся'],
        ['смогли бы вы', 'would you be able to', 'смогли бы вы'],
        ['было бы здорово', 'it would be great', 'было бы здорово'],
      ],
      'I was hoping в прошедшем — приём вежливости, а не рассказ о прошлом: он подаёт просьбу как уже необязательную.',
    ),
    vocab: [
      { term: 'salary range', ru: 'зарплатная вилка', alt: ['вилка по зарплате', 'диапазон зарплаты'] },
      { term: 'compensation package', ru: 'весь пакет вознаграждения',
        alt: ['компенсационный пакет', 'пакет вознаграждения', 'полный пакет условий'] },
      { term: 'I was hoping for', ru: 'я рассчитывал на', alt: ['я надеялся на', 'рассчитывал на'] },
      { term: 'based on my experience', ru: 'исходя из моего опыта', alt: ['на основе моего опыта', 'учитывая мой опыт'] },
      { term: 'to be flexible', ru: 'быть гибким', alt: ['проявить гибкость', 'готов обсуждать'] },
      { term: 'benefits', ru: 'дополнительные условия', alt: ['бенефиты', 'льготы', 'соцпакет'] },
      { term: 'equity', ru: 'доля в компании', alt: ['опционы', 'акции компании'] },
      { term: 'gross / net', ru: 'до вычета / после вычета налогов', alt: ['гросс нетто', 'до налогов после налогов', 'до вычета налогов и после'] },
      { term: 'Is there room to move?', ru: 'есть ли пространство для манёвра?', alt: ['есть ли место для торга', 'можно ли подвинуться'] },
      { term: 'to counter', ru: 'сделать встречное предложение', alt: ['встречное предложение', 'предложить свои условия', 'контрпредложение'] },
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
      { term: 'job offer', ru: 'предложение о работе', alt: ['оффер', 'предложение работы'] },
      { term: 'to accept', ru: 'принять', alt: ['согласиться', 'принять предложение'] },
      { term: 'to decline', ru: 'отклонить', alt: ['отказаться', 'отклонить предложение'] },
      { term: 'I am delighted to accept', ru: 'с радостью принимаю', alt: ['рад принять', 'с удовольствием принимаю'] },
      { term: 'after careful thought', ru: 'всё взвесив', alt: ['после долгих размышлений', 'всё обдумав'] },
      { term: 'to move forward with', ru: 'пойти дальше с', alt: ['двигаться дальше с', 'продолжить с'] },
      { term: 'start date', ru: 'дата выхода', alt: ['дата начала работы', 'день выхода'] },
      { term: 'contract', ru: 'договор', alt: ['контракт', 'трудовой договор'] },
      { term: 'I hope our paths cross again', ru: 'надеюсь, наши пути ещё пересекутся',
        alt: ['надеюсь, мы ещё пересечёмся', 'надеюсь, наши дороги пересекутся'] },
      { term: 'to keep in touch', ru: 'оставаться на связи', alt: ['держать связь', 'быть на связи', 'поддерживать контакт'] },
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
      { term: 'to get set up', ru: 'настроить доступы и инструменты', alt: ['получить доступы', 'настроить рабочее место'] },
      { term: 'access', ru: 'доступ', alt: ['доступы'] },
      { term: 'Who should I ask about', ru: 'к кому обратиться по поводу', alt: ['у кого спросить про', 'к кому идти по вопросу'] },
      { term: 'Where do I find', ru: 'где найти', alt: ['где мне найти', 'где искать'] },
      { term: 'to shadow someone', ru: 'походить за кем-то, посмотреть как работает',
        alt: ['понаблюдать за работой коллеги', 'походить хвостиком', 'посмотреть, как работает коллега'] },
      { term: 'buddy / mentor', ru: 'наставник для новичка', alt: ['наставник', 'ментор', 'бадди'] },
      { term: 'one-on-one', ru: 'личная встреча с руководителем', alt: ['один на один', 'встреча один на один', 'ван-ту-ван'] },
      { term: 'to get up to speed', ru: 'войти в курс дела', alt: ['разобраться', 'втянуться', 'войти в курс'] },
      { term: 'documentation', ru: 'документация', alt: ['доки', 'документы по проекту'] },
      { term: 'I am still getting my head around', ru: 'я ещё разбираюсь с', alt: ['я пока разбираюсь с', 'ещё вникаю в'] },
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
    pattern: drill(
      'Present Perfect Continuous',
      'длится до сих пор',
      [
        ['я работаю над этим неделю', 'I have been working on it for a week', 'Я работаю над этим неделю.'],
        ['мы ждём ответа', 'we have been waiting for a reply', 'мы ждём ответа'],
        ['она тестирует с утра', 'she has been testing since morning', 'она тестирует с утра'],
        ['не поможете мне с этим', 'could you help me with this', 'не поможете мне с этим'],
        ['я застрял на этом', 'I am stuck on this', 'я застрял на этом'],
      ],
      'for отмеряет длительность, since — точку начала. По-русски и то и другое звучит одинаково, поэтому выбор приходится делать сознательно.',
    ),
    vocab: [
      { term: 'to check in', ru: 'свериться, отметиться', alt: ['свериться', 'отметиться', 'узнать статус'] },
      { term: 'I have been working on', ru: 'я работаю над (уже какое-то время)', alt: ['я работаю над', 'я занимаюсь'] },
      { term: 'blocker', ru: 'что мешает двигаться', alt: ['блокер', 'что блокирует', 'препятствие'] },
      { term: 'priority', ru: 'приоритет' },
      { term: 'bandwidth', ru: 'наличие времени и сил', alt: ['ресурс времени', 'свободные силы', 'загрузка'] },
      { term: 'to align on', ru: 'договориться о', alt: ['согласовать', 'синхронизироваться по', 'договориться про'] },
      { term: 'expectations', ru: 'ожидания', alt: ['ожидание'] },
      { term: 'Could we revisit', ru: 'можем вернуться к', alt: ['можем пересмотреть', 'вернёмся к'] },
      { term: 'I would appreciate', ru: 'я был бы признателен', alt: ['буду признателен', 'был бы благодарен'] },
      { term: 'growth', ru: 'развитие, рост', alt: ['рост', 'развитие'] },
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
      { term: 'stand-up', ru: 'ежедневная планёрка', alt: ['стендап', 'планёрка', 'ежедневный статус'] },
      { term: 'Yesterday I finished', ru: 'вчера я закончил', alt: ['вчера закончил', 'вчера я доделал'] },
      { term: 'Today I am picking up', ru: 'сегодня я берусь за', alt: ['сегодня беру', 'сегодня займусь'] },
      { term: 'No blockers', ru: 'ничего не мешает', alt: ['нет блокеров', 'ничего не блокирует'] },
      { term: 'I am blocked on', ru: 'я застрял на', alt: ['я заблокирован на', 'меня блокирует'] },
      { term: 'to hand off to', ru: 'передать кому-то', alt: ['передать', 'отдать задачу кому-то'] },
      { term: 'in review', ru: 'на проверке', alt: ['на ревью', 'на review'] },
      { term: 'ready for dev', ru: 'готово к разработке', alt: ['можно в разработку', 'готово для разработчиков'] },
      { term: 'to sync with', ru: 'синхронизироваться с', alt: ['синхронизироваться', 'свериться с'] },
      { term: 'quick call', ru: 'короткий созвон', alt: ['быстрый созвон', 'короткий звонок'] },
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
      { term: 'heads up', ru: 'предупреждаю заранее', alt: ['предупреждение', 'предупреждаю', 'к сведению заранее'] },
      { term: 'FYI', ru: 'к сведению', alt: ['для информации', 'к вашему сведению'] },
      { term: 'ASAP', ru: 'как можно скорее', alt: ['как можно быстрее', 'срочно'] },
      { term: 'EOD (end of day)', ru: 'до конца дня', alt: ['к концу дня', 'до конца рабочего дня'] },
      { term: 'wfh (working from home)', ru: 'работаю из дома', alt: ['работа из дома', 'на удалёнке', 'сегодня из дома'] },
      { term: 'to loop someone in', ru: 'подключить кого-то к обсуждению', alt: ['подключить к переписке', 'добавить кого-то в обсуждение'] },
      { term: 'thread', ru: 'ветка обсуждения', alt: ['тред', 'ветка'] },
      { term: 'Circling back on', ru: 'возвращаюсь к вопросу о', alt: ['возвращаюсь к', 'снова про'] },
      { term: 'Per my last email', ru: 'как я писал ранее', alt: ['как я писал в прошлом письме', 'как указано в прошлом письме'] },
      { term: 'to escalate', ru: 'вынести на уровень выше', alt: ['эскалировать', 'поднять выше', 'вынести наверх'] },
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
      { term: 'I see it differently', ru: 'я вижу это иначе', alt: ['я смотрю на это иначе', 'у меня другое мнение'] },
      { term: 'I am not sure I agree', ru: 'не уверен, что согласен', alt: ['не уверен что согласен', 'я бы поспорил'] },
      { term: 'What if we', ru: 'а что если мы', alt: ['а если мы', 'что если'] },
      { term: 'the risk with that is', ru: 'риск здесь в том, что', alt: ['риск в том, что', 'опасность в том, что'] },
      { term: 'to compromise', ru: 'пойти на компромисс', alt: ['найти компромисс', 'пойти навстречу'] },
      { term: 'to park it', ru: 'отложить обсуждение', alt: ['отложить', 'отложить вопрос', 'вернуться к этому позже'] },
      { term: 'Let us take it offline', ru: 'обсудим отдельно', alt: ['обсудим это отдельно', 'давайте обсудим не здесь'] },
      { term: 'I would push back on', ru: 'я бы поспорил с', alt: ['я бы возразил', 'я бы не согласился с'] },
      { term: 'happy to be proven wrong', ru: 'буду рад ошибиться', alt: ['буду рад, если ошибаюсь', 'рад ошибиться'] },
      { term: 'to find middle ground', ru: 'найти середину', alt: ['найти компромисс', 'найти общее решение', 'прийти к середине'] },
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
      { term: 'agenda', ru: 'повестка', alt: ['план встречи', 'повестка дня'] },
      { term: 'to kick off', ru: 'начать', alt: ['стартовать', 'начать встречу', 'дать старт'] },
      { term: 'Let me summarise', ru: 'давайте подытожу', alt: ['подытожу', 'позвольте подытожить', 'резюмирую'] },
      { term: 'action item', ru: 'задача по итогам встречи', alt: ['задача по итогам', 'поручение', 'пункт к исполнению'] },
      { term: 'to own', ru: 'взять ответственность за', alt: ['отвечать за', 'взять на себя'] },
      { term: 'by when', ru: 'к какому сроку', alt: ['к какому времени', 'до какого срока', 'когда срок'] },
      { term: 'Does that work for you?', ru: 'вам так подходит?', alt: ['вам подходит', 'так пойдёт', 'вас устраивает'] },
      { term: 'to recap', ru: 'подвести итог', alt: ['подытожить', 'резюмировать', 'повторить главное'] },
      { term: 'meeting notes', ru: 'заметки со встречи', alt: ['заметки встречи', 'протокол встречи'] },
      { term: 'next steps', ru: 'следующие шаги' },
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
      { term: 'to be fluent in', ru: 'свободно владеть', alt: ['владеть свободно', 'бегло говорить на'] },
      { term: 'working proficiency', ru: 'рабочий уровень владения', alt: ['рабочее владение', 'уровень для работы'] },
      { term: 'to level up', ru: 'вырасти в уровне', alt: ['поднять уровень', 'прокачаться'] },
      { term: 'confident', ru: 'уверенный' },
      { term: 'to keep practising', ru: 'продолжать практиковаться', alt: ['продолжать практику', 'практиковаться дальше', 'не бросать практику'] },
      { term: 'immersion', ru: 'погружение в среду', alt: ['погружение', 'языковая среда'] },
      { term: 'plateau', ru: 'плато, остановка в прогрессе', alt: ['плато', 'застой в прогрессе'] },
      { term: 'to maintain', ru: 'поддерживать уровень', alt: ['поддерживать', 'сохранять уровень'] },
      { term: 'feedback loop', ru: 'цикл обратной связи', alt: ['петля обратной связи', 'обратная связь по кругу'] },
      { term: 'next milestone', ru: 'следующая веха', alt: ['следующая цель', 'следующий рубеж'] },
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

// ─────────────────────────────────────────────────────────────────────────────
// Иллюстрации конспектов
//
// Курс про рабочие ситуации, поэтому схемы здесь — каркасы ответов (STAR,
// «три времени») и разбор пар времён, на которых держится разница между
// «отвечал за» и «сделал». `after` — номер абзаца конспекта из
// englishDesignCareerTheory.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const ENDC_FIGURES: CourseFigures = {
  'endc-01': [{
    after: 2,
    caption: 'Каркас тридцатисекундного рассказа о себе',
    src: formulaStrip('Кто я → на чём специализируюсь → сколько лет', [
      { text: "I'm a product designer", note: 'роль, артикль a' },
      { text: 'I specialise in mobile', note: 'специализация', key: true },
      { text: "I've been doing it for 5 years", note: 'опыт' },
    ], { note: 'Артикль обязателен: «I am designer» — ошибка номер один русскоязычных' }),
  }],

  'endc-03': [{
    after: 6,
    caption: 'Обязанность и результат — разные времена',
    src: contrastPair('Past Simple и Present Perfect', {
      head: 'Present Perfect', sub: 'результат, который важен сейчас',
      items: ["I've redesigned the checkout page", 'даты нет — важен результат', 'increased, reduced, launched'],
    }, {
      head: 'Past Simple', sub: 'закрытый эпизод с датой',
      items: ['I redesigned it in 2023', 'есть дата или период', 'I was responsible for… — слабая формулировка'],
    }, { note: 'Проверка строки резюме: это обязанность или результат? Обязанность переписываем' }),
  }],

  'endc-12': [{
    after: 3,
    caption: 'Ответ на «Tell me about yourself» проходит через три времени',
    src: timelineFigure('Три времени за 90 секунд', [
      { label: 'Before that…', sub: 'путь — Past Simple' },
      { label: 'Currently I…', sub: 'кто я сейчас — Present', key: true },
      { label: "What I'm looking for…", sub: 'чего хочу — future / would like' },
    ], { axis: 'рассказ', note: 'Интервьюер слушает не биографию, а логику: почему вы здесь и сейчас' }),
  }],

  'endc-13': [{
    after: 3,
    caption: 'STAR: пропорция важнее полноты',
    src: formTable('Схема поведенческого ответа', ['Блок', 'Сколько', 'Время'], [
      ['Situation', '1 предложение', 'Past Simple / Continuous'],
      ['Task', '1 предложение', 'Past Simple'],
      ['Action', 'основная часть', 'Past Simple, «я», не «мы»'],
      ['Result', '1–2 предложения', 'Present Perfect, если результат жив'],
    ], { highlight: [2], note: 'Past Continuous даёт фон: While we were preparing the release…' }),
  }],

  'endc-20': [{
    after: 4,
    caption: 'Сослагательное наклонение оставляет разговор открытым',
    src: formTable('Как смягчить фразу о деньгах', ['Прямо — разговор закрыт', 'Мягко — разговор открыт'], [
      ['I want 5000', 'I was hoping for something around 5000'],
      ['Give me more', 'Is there any room to move on the base?'],
      ['No, I refuse', "If the base stayed as is, I'd need to look at the bonus"],
      ['I need an answer now', 'Could I get back to you by Friday?'],
    ], { note: 'Was hoping + around + вопрос вместо требования — три приёма в одной фразе' }),
  }],
}

export const ENGLISH_DESIGN_CAREER_SPEC: LanguageCourseSpec = {
  key: 'endc',
  title: 'Английский для дизайнера — от письма до оффера',
  subject: 'Английский',
  level: 'A2 → B1',
  lang: 'en',
  guidedHours: '180–200',
  modules: MODULES,
  // Конспекты и видео живут отдельными картами по shortId: здесь — структура и
  // задания, там — то, что ученик читает и смотрит. Иначе файл контента
  // разрастается до нечитаемого.
  units: ENGLISH_DESIGN_CAREER.map(u => ({
    ...u,
    theory: ENDC_THEORY[u.shortId] ?? u.theory,
    videoUrl: ENDC_VIDEO[u.shortId] ?? ENDC_VIDEO_EXTRA[u.shortId] ?? u.videoUrl,
    // Аудирование добавлено отдельной картой: курс писался до появления
    // языковых типов заданий и остался без единого задания на слух (см. аудит).
    // Говорение и письмо — тем же приёмом: курс про собеседования не может
    // оставаться курсом про выбор варианта ответа (см. аудит).
    tasks: [...u.tasks, ...(ENDC_LISTENING[u.shortId] ?? []), ...(ENDC_EXTRA[u.shortId] ?? [])],
  })),
  // Схемы-доборы по итогам аудита живут отдельным файлом.
  figures: { ...ENDC_FIGURES, ...ENDC_FIGURES_EXTRA },
}

/** Все слова курса — основа словарной колоды и интервальных повторений. */
export const ALL_VOCAB: VocabItem[] = allVocab(ENGLISH_DESIGN_CAREER_SPEC)

/** Юнит по короткому id. */
export function unitByShortId(shortId: string): EnglishUnit | undefined {
  return findUnit(ENGLISH_DESIGN_CAREER_SPEC, shortId)
}

/** Модуль, которому принадлежит юнит. */
export function moduleOf(n: number): EnglishModule | undefined {
  return moduleOfUnit(ENGLISH_DESIGN_CAREER_SPEC, n)
}

/** Сводка курса — для карточки курса и страницы описания. */
export const COURSE_SUMMARY = courseSummary(ENGLISH_DESIGN_CAREER_SPEC)

/** Собрать курс для редактора конструктора. */
export function buildEnglishDesignCareerCourse(courseId: string): CourseEdData {
  return buildLanguageCourse(ENGLISH_DESIGN_CAREER_SPEC, courseId)
}
