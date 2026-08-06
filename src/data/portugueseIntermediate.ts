// ─────────────────────────────────────────────────────────────────────────────
// Бразильский португальский A2 → B1 (уровень Intermediário, CELPE-Bras)
//
// Продолжение курса «Бразильский португальский с нуля». Вход: ученик уверенно
// пользуется настоящим временем, ser/estar, pretérito perfeito и imperfeito,
// герундием, ходит в магазин и объясняет дорогу.
//
// ЗАЧЕМ ИМЕННО ЭТОТ УРОВЕНЬ
// CELPE-Bras начинается с Intermediário — то есть именно этот курс впервые
// делает экзамен достижимым. Поэтому он с первого юнита устроен как экзамен:
// любое продуктивное задание имеет жанр, адресата и цель, а не «тему».
//
// ЧТО ТУТ ЕСТЬ ТАКОГО, ЧЕГО НЕТ В ДРУГИХ ЯЗЫКАХ
// 1. Личный инфинитив (юнит 7) — форма, которой нет ни в русском, ни в
//    английском, ни в испанском: инфинитив спрягается по лицам. Без него
//    португальская фраза постоянно скатывается в лишнее «que».
// 2. Будущее сослагательное (юнит 5) — в португальском живое и обязательное:
//    «quando eu tiver tempo», не «quando eu terei». Русскоязычные говорят
//    здесь настоящее время, и это самая заметная ошибка уровня.
// 3. Три сослагательных времени вместо одного набора: presente, imperfeito,
//    futuro. Они разведены по трём юнитам и всегда даются от функции, а не от
//    таблицы окончаний.
//
// БРАЗИЛЬСКАЯ НОРМА
// Курс продолжает линию первого: estou fazendo, você, a gente, проклиза
// («me disseram»). Европейские варианты упоминаются только там, где ученик
// столкнётся с ними в текстах, — чтобы узнавал, но не воспроизводил.
//
// ПРО ЭКЗАМЕН
// Стандартный CELPE-Bras состоит из письменной части (четыре задания: по видео,
// по аудио и по двум письменным текстам — каждое требует создать текст в
// заданном жанре) и устной части примерно на 20 минут: сначала разговор о самом
// кандидате, затем обсуждение материалов-стимулов (elementos provocadores).
// Отдельного теста по грамматике в экзамене нет вообще — оценивается то,
// насколько решена коммуникативная задача.
//
// ЮРИДИЧЕСКОЕ
// Все тексты и задания написаны с нуля. Материалы прошлых экзаменов — только
// как открытые публикации INEP со ссылкой, копирование в курс недопустимо.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildLanguageCourse, courseSummary, allVocab, unitByShortId, moduleOfUnit,
  one, many, fill, wb, order, pairsOf, grid, write, say, readAloud,
  dictation, drill,
} from './languageCourse'
import { formTable, formulaStrip, contrastPair } from './lessonFigures'
import type { LangModule, LangUnit, LanguageCourseSpec, VocabItem, CourseFigures } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

export const PORTUGUESE2_MODULES: LangModule[] = [
  { title: 'Времена и наклонения', subtitle: 'Условное, три сослагательных, согласование', units: [1, 2, 3, 4, 5] },
  { title: 'Синтаксис португальского', subtitle: 'Личный инфинитив, пассив, местоимения, относительные', units: [6, 7, 8, 9] },
  { title: 'Дискурс и аргументация', subtitle: 'Косвенная речь, связки, осторожность, регистр', units: [10, 11, 12, 13] },
  { title: 'Жанры CELPE-Bras', subtitle: 'Письмо, жалоба, мнение, пересказ, устная часть', units: [14, 15, 16, 17, 18] },
]

export const PORTUGUESE2_UNITS: LangUnit[] = [
  // ═══ Модуль 1. Времена и наклонения ═══
  {
    n: 1, shortId: 'ptb2-01',
    title: 'Три прошедших вместе',
    goal: 'Уверенно выбирать между perfeito, imperfeito и mais-que-perfeito',
    grammar: 'Повторение perfeito и imperfeito; pretérito mais-que-perfeito composto (tinha feito) для «до того момента»',
    grammarWhy: 'На A2 ученик уже различает событие и фон. Третье прошедшее добавляет глубину: «когда я пришёл, он уже ушёл». Без него рассказ о прошлом остаётся плоским и часто двусмысленным.',
    vocabTheme: 'Рассказ о прошлом',
    artifact: 'Рассказ на 12 предложений с тремя прошедшими',
    pattern: drill(
      'mais-que-perfeito composto',
      'что случилось ДО того момента',
      [
        ['fazer — до того', 'tinha feito', 'уже сделал (к тому моменту)'],
        ['sair — до того', 'tinha saído', 'уже ушёл'],
        ['ver — до того', 'tinha visto', 'уже видел'],
        ['chegar — до того', 'tinha chegado', 'уже пришёл'],
        ['dizer — до того', 'tinha dito', 'уже сказал'],
      ],
      'Конструкция ставит событие раньше другого прошедшего: «когда я пришёл, он уже ушёл». Причастия feito, visto, dito неправильные.',
    ),
    vocab: [
      { term: 'tinha feito', reading: 'чи́нья фе́йту', ru: 'уже сделал (к тому моменту)' },
      { term: 'já', reading: 'жá', ru: 'уже' },
      { term: 'ainda não', reading: 'аи́нда нãу', ru: 'ещё не' },
      { term: 'quando cheguei', reading: 'куáнду шеге́й', ru: 'когда я приехал' },
      { term: 'naquela época', reading: 'наке́ла э́пока', ru: 'в ту пору' },
      { term: 'de repente', reading: 'джи репе́нчи', ru: 'вдруг' },
      { term: 'enquanto', reading: 'энкуáнту', ru: 'пока, в то время как' },
      { term: 'logo depois', reading: 'ло́гу депо́йс', ru: 'сразу после' },
      { term: 'acontecer', reading: 'аконтесе́р', ru: 'случаться' },
      { term: 'perceber', reading: 'персебе́р', ru: 'замечать, понимать' },
    ],
    tasks: [
      one('«Когда я приехал, он уже ушёл»:', [
        'Quando eu cheguei, ele já saiu.',
        'Quando eu cheguei, ele já tinha saído.',
        'Quando eu chegava, ele já saía.',
        'Quando eu tinha chegado, ele já sai.',
      ], 1),
      one('«Раньше я каждый день ходил пешком»:', [
        'Antes eu fui a pé todos os dias.',
        'Antes eu ia a pé todos os dias.',
        'Antes eu tinha ido a pé todos os dias.',
        'Antes eu vou a pé todos os dias.',
      ], 1),
      one('Какое время описывает действие, предшествующее другому прошедшему?', [
        'pretérito perfeito',
        'pretérito imperfeito',
        'pretérito mais-que-perfeito composto',
        'futuro do pretérito',
      ], 2),
      fill('Дополните: Quando ela ligou, eu já ___ saído. (ter, imperfeito)', 'tinha'),
      fill('Дополните: Enquanto eu ___ , ele cozinhava. (trabalhar, imperfeito)', 'trabalhava'),
      grid('Заполните таблицу трёх прошедших.',
        ['функция', 'время', 'пример'],
        [
          ['однократное событие', 'perfeito', 'cheguei'],
          ['фон, привычка', 'imperfeito', 'chegava'],
          ['раньше другого прошлого', 'mais-que-perfeito', 'tinha chegado'],
        ],
        { '0,1': true, '1,2': true, '2,1': true }),
      wb('Quando eu cheguei em casa, minha irmã já tinha saído.', 'Соберите предложение с двумя планами прошлого.', ['saiu', 'saía']),
      write('Напишите рассказ на 12 предложений о дне, который пошёл не по плану. Используйте все три прошедших времени минимум по три раза каждое.'),
    ],
  },
  {
    n: 2, shortId: 'ptb2-02',
    title: 'Futuro do pretérito: вежливость и гипотеза',
    goal: 'Смягчать просьбу и говорить о нереальном',
    grammar: 'faria, gostaria, poderia, seria; вежливые формулы; «что было бы, если»',
    grammarWhy: 'Кондиционал в бразильской речи чаще всего не про гипотезу, а про вежливость: gostaria вместо quero, poderia вместо pode. Он же — вторая половина условных конструкций второго типа.',
    vocabTheme: 'Вежливость и гипотезы',
    artifact: 'Пять просьб и пять гипотез',
    pattern: drill(
      'futuro do pretérito',
      'было бы / хотел бы',
      [
        ['fazer — я бы', 'eu faria', 'я бы сделал'],
        ['gostar — я бы', 'eu gostaria', 'я хотел бы'],
        ['poder — вы бы', 'você poderia', 'вы могли бы'],
        ['ser — было бы', 'seria', 'было бы'],
        ['dizer — я бы', 'eu diria', 'я бы сказал'],
      ],
      'Эта же форма работает как вежливость: poderia вместо pode звучит как «не могли бы вы».',
    ),
    vocab: [
      { term: 'gostaria', reading: 'гостари́а', ru: 'я хотел бы' },
      { term: 'poderia', reading: 'подери́а', ru: 'не могли бы вы' },
      { term: 'seria', reading: 'сери́а', ru: 'было бы' },
      { term: 'faria', reading: 'фари́а', ru: 'сделал бы' },
      { term: 'deveria', reading: 'девери́а', ru: 'следовало бы' },
      { term: 'no seu lugar', reading: 'ну се́у лугáр', ru: 'на вашем месте' },
      { term: 'seria possível', reading: 'сери́а поси́вел', ru: 'было бы возможно' },
      { term: 'agradeceria', reading: 'аградесери́а', ru: 'был бы благодарен' },
      { term: 'talvez fosse melhor', reading: 'тауве́с фо́си мелё́р', ru: 'возможно, было бы лучше' },
      { term: 'em vez de', reading: 'э̃й вэйс джи', ru: 'вместо того чтобы' },
    ],
    tasks: [
      one('Самая вежливая просьба:', [
        'Quero falar com o gerente.',
        'Gostaria de falar com o gerente, por favor.',
        'Fala com o gerente.',
        'Vou falar com o gerente agora.',
      ], 1),
      one('«На вашем месте я бы подождал»:', [
        'No seu lugar, eu esperei.',
        'No seu lugar, eu esperaria.',
        'No seu lugar, eu espero.',
        'No seu lugar, eu tinha esperado.',
      ], 1),
      fill('Поставьте в futuro do pretérito: poder (eu) → ___', 'poderia'),
      fill('Поставьте в futuro do pretérito: fazer (nós) → ___', 'faríamos'),
      grid('Заполните таблицу futuro do pretérito.',
        ['инфинитив', 'eu', 'você/ele'],
        [
          ['falar', 'falaria', 'falaria'],
          ['comer', 'comeria', 'comeria'],
          ['fazer', 'faria', 'faria'],
          ['ser', 'seria', 'seria'],
        ],
        { '0,1': true, '2,1': true, '3,2': true }),
      pairsOf('Соедините формулу и её функцию.', [
        ['Gostaria de…', 'вежливая просьба'],
        ['Poderia…?', 'просьба о действии'],
        ['No seu lugar, eu…', 'совет'],
        ['Seria melhor…', 'мягкая рекомендация'],
      ]),
      say('Обратитесь с пятью просьбами в вежливой форме: в банке, в отеле, у преподавателя, у соседа и по телефону в службе поддержки.', 90),
      write('Напишите пять просьб с futuro do pretérito и пять гипотез «что бы вы сделали, если бы…».'),
    ],
  },
  {
    n: 3, shortId: 'ptb2-03',
    title: 'Presente do subjuntivo',
    goal: 'Выражать желание, сомнение, необходимость и эмоцию',
    grammar: 'Образование от 1 лица presente (falo → fale, faço → faça); триггеры: espero que, duvido que, é importante que, talvez',
    grammarWhy: 'Сослагательное в португальском не стилистика — оно обязательно после определённых слов. Ошибка «espero que você vem» слышна мгновенно. Ключ к форме — первое лицо настоящего, а не инфинитив, и это надо получить сразу.',
    vocabTheme: 'Желание и сомнение',
    artifact: 'Десять предложений с триггерами сослагательного',
    pattern: drill(
      'presente do subjuntivo',
      'после espero que, duvido que, talvez',
      [
        ['falar (falo →)', 'que eu fale', 'чтобы я говорил'],
        ['comer (como →)', 'que eu coma', 'чтобы я ел'],
        ['fazer (faço →)', 'que eu faça', 'чтобы я делал'],
        ['ter (tenho →)', 'que eu tenha', 'чтобы у меня было'],
        ['ir', 'que eu vá', 'чтобы я шёл'],
      ],
      'Форма строится от 1 лица presente, поэтому все неправильности оттуда переносятся сюда: faço → faça. ir выбивается и запоминается отдельно.',
    ),
    vocab: [
      { term: 'espero que', reading: 'эспэ́ру ки', ru: 'надеюсь, что' },
      { term: 'duvido que', reading: 'дуви́ду ки', ru: 'сомневаюсь, что' },
      { term: 'é importante que', reading: 'э импортáнчи ки', ru: 'важно, чтобы' },
      { term: 'talvez', reading: 'тауве́с', ru: 'возможно' },
      { term: 'tomara que', reading: 'томáра ки', ru: 'хоть бы' },
      { term: 'antes que', reading: 'áнчис ки', ru: 'прежде чем' },
      { term: 'para que', reading: 'пара ки', ru: 'чтобы' },
      { term: 'embora', reading: 'э̃мбо́ра', ru: 'хотя' },
      { term: 'a não ser que', reading: 'а нãу сер ки', ru: 'разве что' },
      { term: 'que pena que', reading: 'ки пе́на ки', ru: 'как жаль, что' },
    ],
    tasks: [
      one('«Надеюсь, ты придёшь»:', [
        'Espero que você vem.',
        'Espero que você venha.',
        'Espero que você virá.',
        'Espero que você vindo.',
      ], 1),
      one('От какой формы образуется presente do subjuntivo?', [
        'От инфинитива',
        'От первого лица presente do indicativo',
        'От причастия',
        'От герундия',
      ], 1),
      one('fazer → eu faço → subjuntivo:', ['faze', 'faça', 'faz', 'fazer'], 1),
      grid('Заполните таблицу subjuntivo.',
        ['инфинитив', 'eu (indicativo)', 'que eu (subjuntivo)'],
        [
          ['falar', 'falo', 'fale'],
          ['comer', 'como', 'coma'],
          ['fazer', 'faço', 'faça'],
          ['ter', 'tenho', 'tenha'],
          ['ir', 'vou', 'vá'],
        ],
        { '0,2': true, '2,2': true, '3,2': true, '4,2': true }),
      fill('Дополните: É importante que você ___ todos os dias. (estudar)', 'estude'),
      fill('Дополните: Duvido que ele ___ a tempo. (chegar)', 'chegue'),
      many('После каких выражений идёт subjuntivo?', ['espero que', 'acho que', 'é importante que', 'talvez'], [0, 2, 3]),
      write('Напишите десять предложений с разными триггерами сослагательного: два желания, два сомнения, два о важности, два с talvez, два с para que.'),
    ],
  },
  {
    n: 4, shortId: 'ptb2-04',
    title: 'Imperfeito do subjuntivo и условие второго типа',
    goal: 'Говорить о нереальном: «если бы у меня было время»',
    grammar: 'Образование от 3 лица мн. ч. perfeito (falaram → falasse, fizeram → fizesse); Se + imperfeito do subjuntivo + futuro do pretérito',
    grammarWhy: 'Связка «se eu tivesse…, eu faria…» жёсткая: обе части обязаны стоять в своих формах. Русскоязычный ставит в обе «бы»-форму одинаково и получает конструкцию, которой в португальском нет.',
    vocabTheme: 'Нереальное и мечты',
    artifact: 'Восемь условных предложений второго типа',
    pattern: drill(
      'imperfeito do subjuntivo + условие',
      'если бы …, то …',
      [
        ['falar (falaram →)', 'se eu falasse', 'если бы я говорил'],
        ['fazer (fizeram →)', 'se eu fizesse', 'если бы я делал'],
        ['ter (tiveram →)', 'se eu tivesse', 'если бы у меня было'],
        ['ser (foram →)', 'se eu fosse', 'если бы я был'],
        ['если бы было время, поехал бы', 'Se eu tivesse tempo eu viajaria', 'Если бы было время, я бы поехал.'],
      ],
      'Форма выводится из 3 лица множественного perfeito. Условие строится жёсткой парой: se + imperfeito do subjuntivo, а следствие — futuro do pretérito.',
    ),
    vocab: [
      { term: 'se eu tivesse', reading: 'си эу чиве́си', ru: 'если бы у меня было' },
      { term: 'se eu fosse', reading: 'си эу фо́си', ru: 'если бы я был' },
      { term: 'se eu pudesse', reading: 'си эу пуде́си', ru: 'если бы я мог' },
      { term: 'sonhar', reading: 'соньáр', ru: 'мечтать' },
      { term: 'mudar de vida', reading: 'мудáр джи ви́да', ru: 'изменить жизнь' },
      { term: 'aproveitar', reading: 'апровейтáр', ru: 'воспользоваться' },
      { term: 'arriscar', reading: 'ахискáр', ru: 'рисковать' },
      { term: 'valer a pena', reading: 'вале́р а пе́на', ru: 'стоить того' },
      { term: 'imaginar', reading: 'имажинáр', ru: 'представлять' },
      { term: 'na prática', reading: 'на прáтика', ru: 'на практике' },
    ],
    tasks: [
      one('«Если бы у меня было время, я бы поехал»:', [
        'Se eu tenho tempo, eu vou viajar.',
        'Se eu tivesse tempo, eu viajaria.',
        'Se eu tivesse tempo, eu viajei.',
        'Se eu teria tempo, eu viajaria.',
      ], 1),
      one('От какой формы образуется imperfeito do subjuntivo?', [
        'От инфинитива',
        'От третьего лица множественного числа pretérito perfeito',
        'От первого лица настоящего',
        'От причастия',
      ], 1),
      one('fazer → fizeram → imperfeito do subjuntivo:', ['fazesse', 'fizesse', 'façasse', 'fizera'], 1),
      grid('Заполните таблицу.',
        ['инфинитив', 'eles (perfeito)', 'se eu (subjuntivo)'],
        [
          ['falar', 'falaram', 'falasse'],
          ['ter', 'tiveram', 'tivesse'],
          ['ser/ir', 'foram', 'fosse'],
          ['poder', 'puderam', 'pudesse'],
        ],
        { '0,2': true, '1,2': true, '3,2': true }),
      fill('Дополните: Se eu ___ rico, compraria uma casa. (ser)', 'fosse'),
      fill('Дополните: Se você ___ ajudar, eu agradeceria. (poder)', 'pudesse'),
      wb('Se eu tivesse mais tempo, eu estudaria português todos os dias.', 'Соберите условное предложение второго типа.', ['tenho', 'estudo']),
      write('Напишите восемь предложений «если бы…, то…» о нереальном: работа, город, язык, деньги, время, здоровье, друзья, будущее.'),
    ],
  },
  {
    n: 5, shortId: 'ptb2-05',
    title: 'Futuro do subjuntivo — то, чего нет в других языках',
    goal: 'Говорить о будущем условии правильно',
    grammar: 'Образование от 3 лица мн. ч. perfeito без -am (falaram → falar, fizeram → fizer, tiveram → tiver); после quando, se, assim que, enquanto о будущем',
    grammarWhy: 'В испанском эта форма практически умерла, в португальском она живая и обязательная. «Quando eu tiver tempo» — единственно верно; «quando eu terei» и «quando eu tenho» о будущем — ошибки, которые русскоязычные делают в каждой второй фразе.',
    vocabTheme: 'Будущие условия',
    artifact: 'Десять фраз о будущем с quando и se',
    pattern: drill(
      'futuro do subjuntivo',
      'после quando и se о будущем',
      [
        ['falar (falaram →)', 'quando eu falar', 'когда я скажу'],
        ['fazer (fizeram →)', 'quando eu fizer', 'когда я сделаю'],
        ['ter (tiveram →)', 'quando eu tiver', 'когда у меня будет'],
        ['ser (foram →)', 'se for', 'если будет'],
        ['chegar', 'assim que eu chegar', 'как только я приеду'],
      ],
      'Это форма, которой нет в русском: после quando и se о будущем ставится именно она, а не presente. Quando eu chegar, а не quando eu chego.',
    ),
    vocab: [
      { term: 'quando eu tiver', reading: 'куáнду эу чиве́р', ru: 'когда у меня будет' },
      { term: 'se eu puder', reading: 'си эу пуде́р', ru: 'если смогу' },
      { term: 'assim que', reading: 'аси́ ки', ru: 'как только' },
      { term: 'enquanto', reading: 'энкуáнту', ru: 'пока' },
      { term: 'depois que', reading: 'депо́йс ки', ru: 'после того как' },
      { term: 'sempre que', reading: 'се́мпри ки', ru: 'всякий раз когда' },
      { term: 'chegar', reading: 'шегáр', ru: 'прибывать' },
      { term: 'terminar', reading: 'терминáр', ru: 'заканчивать' },
      { term: 'conseguir', reading: 'консеги́р', ru: 'суметь' },
      { term: 'quiser', reading: 'кизе́р', ru: 'захочет (fut. subj. от querer)' },
    ],
    tasks: [
      one('«Когда у меня будет время, я позвоню»:', [
        'Quando eu tenho tempo, eu ligo.',
        'Quando eu terei tempo, eu ligarei.',
        'Quando eu tiver tempo, eu ligo.',
        'Quando eu tivesse tempo, eu ligaria.',
      ], 2),
      one('Как образуется futuro do subjuntivo?', [
        'От инфинитива + окончания',
        'От третьего лица мн. ч. perfeito, отбрасывая -am',
        'От первого лица настоящего',
        'От герундия',
      ], 1),
      one('fazer → fizeram → futuro do subjuntivo:', ['fazer', 'fizer', 'fizesse', 'faça'], 1),
      one('«Если захочешь, приходи»:', [
        'Se você quer, venha.',
        'Se você quiser, venha.',
        'Se você quisesse, venha.',
        'Se você quererá, venha.',
      ], 1),
      grid('Заполните таблицу futuro do subjuntivo.',
        ['инфинитив', 'eles (perfeito)', 'quando eu…'],
        [
          ['falar', 'falaram', 'falar'],
          ['ter', 'tiveram', 'tiver'],
          ['poder', 'puderam', 'puder'],
          ['fazer', 'fizeram', 'fizer'],
          ['ser/ir', 'foram', 'for'],
        ],
        { '1,2': true, '2,2': true, '3,2': true, '4,2': true }),
      fill('Дополните: Assim que eu ___ o trabalho, te aviso. (terminar)', 'terminar'),
      fill('Дополните: Se você ___ dúvidas, me pergunte. (ter)', 'tiver'),
      dictation('Напечатайте услышанную фразу.', 'Quando eu tiver tempo, eu te ligo.'),
      write('Напишите десять фраз о своих планах, где каждая начинается с quando, se, assim que или depois que и требует futuro do subjuntivo.'),
    ],
  },

  // ═══ Модуль 2. Синтаксис португальского ═══
  {
    n: 6, shortId: 'ptb2-06',
    title: 'Согласование времён и наклонений',
    goal: 'Не сбиваться со времени внутри длинного предложения',
    grammar: 'presente → subjuntivo presente; passado → subjuntivo imperfeito; типовые пары «главное + придаточное»',
    grammarWhy: 'Ученик, освоивший три сослагательных по отдельности, всё равно смешивает их в сложном предложении. Правило простое и механическое: время главной части задаёт время придаточной, и его надо отработать как таблицу.',
    vocabTheme: 'Сложное предложение',
    artifact: 'Двенадцать сложных предложений с верным согласованием',
    vocab: [
      { term: 'pediu que', reading: 'педи́у ки', ru: 'попросил, чтобы' },
      { term: 'queria que', reading: 'кери́а ки', ru: 'хотел, чтобы' },
      { term: 'era preciso que', reading: 'э́ра преси́зу ки', ru: 'нужно было, чтобы' },
      { term: 'exigir', reading: 'эзижи́р', ru: 'требовать' },
      { term: 'sugerir', reading: 'сужери́р', ru: 'предлагать' },
      { term: 'recomendar', reading: 'хекомендáр', ru: 'рекомендовать' },
      { term: 'permitir', reading: 'пермичи́р', ru: 'разрешать' },
      { term: 'impedir', reading: 'импеджи́р', ru: 'препятствовать' },
      { term: 'lamentar', reading: 'ламентáр', ru: 'сожалеть' },
      { term: 'insistir', reading: 'инсисчи́р', ru: 'настаивать' },
    ],
    tasks: [
      one('«Он попросил, чтобы я пришёл»:', [
        'Ele pediu que eu venha.',
        'Ele pediu que eu viesse.',
        'Ele pediu que eu vim.',
        'Ele pediu que eu virei.',
      ], 1),
      one('«Он просит, чтобы я пришёл»:', [
        'Ele pede que eu venha.',
        'Ele pede que eu viesse.',
        'Ele pede que eu vim.',
        'Ele pede que eu virei.',
      ], 0),
      one('Что определяет выбор времени в придаточной части?', [
        'Длина предложения',
        'Время глагола главной части',
        'Лицо подлежащего',
        'Наличие отрицания',
      ], 1),
      grid('Заполните таблицу согласования.',
        ['главная часть', 'придаточная'],
        [
          ['Espero (presente)', 'que venha (presente do subj.)'],
          ['Esperava (imperfeito)', 'que viesse (imperfeito do subj.)'],
          ['Pediu (perfeito)', 'que viesse (imperfeito do subj.)'],
          ['Vou pedir (futuro)', 'que venha (presente do subj.)'],
        ],
        { '1,1': true, '2,1': true, '3,1': true }),
      fill('Дополните: O professor queria que nós ___ mais. (estudar)', 'estudássemos'),
      fill('Дополните: É preciso que você ___ o formulário hoje. (enviar)', 'envie'),
      wb('O gerente pediu que a equipe entregasse o relatório na sexta.', 'Соберите предложение с согласованием времён.', ['entregue', 'entregou']),
      write('Напишите двенадцать сложных предложений: шесть с главной частью в настоящем и шесть — в прошедшем. Проверьте, что придаточная согласована.'),
    ],
  },
  {
    n: 7, shortId: 'ptb2-07',
    title: 'Личный инфинитив — форма без аналогов',
    goal: 'Использовать спрягаемый инфинитив вместо громоздких придаточных',
    grammar: 'Infinitivo pessoal: falar, falares, falar, falarmos, falarem; после предлогов и в конструкциях с разными субъектами',
    grammarWhy: 'Уникальная черта португальского: инфинитив имеет лицо. Она позволяет сказать «antes de sairmos» вместо «antes de que nós saiamos» — короче и естественнее. Русскоязычный без неё строит тяжёлые фразы с лишним que.',
    vocabTheme: 'Конструкции с предлогами',
    artifact: 'Десять фраз с личным инфинитивом',
    pattern: drill(
      'infinitivo pessoal',
      'инфинитив с лицом',
      [
        ['falar — nós', 'para falarmos', 'чтобы мы поговорили'],
        ['falar — eles', 'para falarem', 'чтобы они поговорили'],
        ['falar — você', 'para você falar', 'чтобы вы поговорили'],
        ['sair — nós', 'antes de sairmos', 'прежде чем мы уйдём'],
        ['chegar — eles', 'depois de chegarem', 'после того как они приедут'],
      ],
      'Личный инфинитив — особенность португальского: он берёт окончание лица и потому позволяет обойтись без придаточного, когда субъекты разные.',
    ),
    vocab: [
      { term: 'antes de', reading: 'áнчис джи', ru: 'прежде чем' },
      { term: 'depois de', reading: 'депо́йс джи', ru: 'после того как' },
      { term: 'apesar de', reading: 'апезáр джи', ru: 'несмотря на то что' },
      { term: 'para', reading: 'пáра', ru: 'чтобы' },
      { term: 'sem', reading: 'сэ̃й', ru: 'без того чтобы' },
      { term: 'no caso de', reading: 'ну кáзу джи', ru: 'в случае если' },
      { term: 'é melhor', reading: 'э мелё́р', ru: 'лучше' },
      { term: 'basta', reading: 'бáста', ru: 'достаточно' },
      { term: 'convém', reading: 'конвэ̃й', ru: 'следует, целесообразно' },
      { term: 'chegarmos', reading: 'шегáрмус', ru: 'нам приехать (личный инфинитив)' },
    ],
    tasks: [
      one('«Прежде чем мы выйдем, надо всё проверить»:', [
        'Antes de sair, precisamos verificar tudo.',
        'Antes de sairmos, precisamos verificar tudo.',
        'Antes de saíamos, precisamos verificar tudo.',
        'Antes de que sairmos, precisamos verificar tudo.',
      ], 1),
      one('Когда личный инфинитив особенно нужен?', [
        'Когда субъект инфинитива отличается от субъекта главной части или его надо явно указать',
        'Только в письменной речи',
        'Только после para',
        'Только в отрицании',
      ], 0),
      one('Форма личного инфинитива для vocês от falar:', ['falar', 'falarem', 'falarmos', 'falares'], 1),
      grid('Заполните таблицу личного инфинитива глагола fazer.',
        ['лицо', 'форма'],
        [
          ['eu', 'fazer'],
          ['você/ele', 'fazer'],
          ['nós', 'fazermos'],
          ['vocês/eles', 'fazerem'],
        ],
        { '2,1': true, '3,1': true }),
      fill('Дополните: É importante vocês ___ o prazo. (respeitar, личный инфинитив)', 'respeitarem'),
      fill('Дополните: Depois de ___ o relatório, mandamos por e-mail. (terminar, nós)', 'terminarmos'),
      wb('Antes de vocês entrarem na sala, desliguem o celular.', 'Соберите предложение с личным инфинитивом.', ['entrar', 'entrarmos']),
      write('Напишите десять фраз с личным инфинитивом после antes de, depois de, apesar de, para и sem. В каждой субъект инфинитива должен быть явно виден.'),
    ],
  },
  {
    n: 8, shortId: 'ptb2-08',
    title: 'Пассив и безличность',
    goal: 'Говорить без указания деятеля — как в новостях и объявлениях',
    grammar: 'Voz passiva (foi construído por), se apassivador (vende-se casas / vendem-se casas), безличное a gente и 3 лицо мн. ч.',
    grammarWhy: 'Бразильский текст постоянно уходит от деятеля: «fala-se português», «foi decidido». Русскоязычный переводит буквально с активным подлежащим и получает разговорный регистр там, где нужен официальный.',
    vocabTheme: 'Официальный регистр',
    artifact: 'Пять объявлений в безличной форме',
    pattern: drill(
      'пассив и безличность',
      'кем сделано и «делают»',
      [
        ['дом был построен', 'A casa foi construída', 'Дом был построен.'],
        ['книга была написана им', 'O livro foi escrito por ele', 'Книга была написана им.'],
        ['продаётся дом', 'Vende-se casa', 'Продаётся дом.'],
        ['продаются дома', 'Vendem-se casas', 'Продаются дома.'],
        ['мы идём (разговорно)', 'a gente vai', 'мы идём'],
      ],
      'Строки 3 и 4 — типичная ошибка носителей тоже: при se apassivador глагол согласуется с предметом, поэтому vendem-se casas во множественном.',
    ),
    vocab: [
      { term: 'foi construído', reading: 'фой конструи́ду', ru: 'был построен' },
      { term: 'ser realizado', reading: 'сер хеализáду', ru: 'быть проведённым' },
      { term: 'vende-se', reading: 'ве́нджи-си', ru: 'продаётся' },
      { term: 'aluga-se', reading: 'алу́га-си', ru: 'сдаётся' },
      { term: 'fala-se', reading: 'фáла-си', ru: 'говорят (на языке)' },
      { term: 'proibido', reading: 'проиби́ду', ru: 'запрещено' },
      { term: 'permitido', reading: 'пермичи́ду', ru: 'разрешено' },
      { term: 'divulgar', reading: 'дивулгáр', ru: 'обнародовать' },
      { term: 'ser aprovado', reading: 'сер апровáду', ru: 'быть одобренным' },
      { term: 'entrada', reading: 'энтрáда', ru: 'вход' },
    ],
    tasks: [
      one('«Здание было построено в 1950 году»:', [
        'O prédio construiu em 1950.',
        'O prédio foi construído em 1950.',
        'O prédio está construído em 1950 por.',
        'Construiu-se o prédio por 1950.',
      ], 1),
      one('«Здесь говорят по-португальски»:', [
        'Fala-se português aqui.',
        'Fala português se aqui.',
        'Se fala-se português.',
        'É falado português se.',
      ], 0),
      one('«Сдаются квартиры» — согласование с se apassivador:', [
        'Aluga-se apartamentos.',
        'Alugam-se apartamentos.',
        'Оба варианта встречаются, но нормативный — второй',
        'Ни один не верен',
      ], 2),
      fill('Дополните: A reunião ___ realizada na segunda-feira. (ser, futuro)', 'será'),
      fill('Дополните: ___-se casa com dois quartos. (vender)', 'Vende'),
      pairsOf('Соедините конструкцию и регистр.', [
        ['foi construído por', 'официальный, деятель важен'],
        ['fala-se', 'безличный, деятель не важен'],
        ['a gente fala', 'разговорный'],
        ['é proibido', 'объявление, запрет'],
      ]),
      write('Напишите пять объявлений в безличной форме: продажа, аренда, запрет, объявление о мероприятии и правило в общественном месте.'),
    ],
  },
  {
    n: 9, shortId: 'ptb2-09',
    title: 'Относительные придаточные: que, quem, onde, cujo',
    goal: 'Объединять предложения без повторов',
    grammar: 'que (универсальное), quem (о людях после предлога), onde (место), cujo (чей), o que (то, что); preposição + que',
    grammarWhy: 'Относительные придаточные — главный инструмент связности письменного текста. Без них абзац рассыпается на короткие фразы, а именно связность оценивается в CELPE-Bras прямо.',
    vocabTheme: 'Связность текста',
    artifact: 'Абзац, переписанный без повторов',
    pattern: drill(
      'относительные местоимения',
      'который, чей, где',
      [
        ['человек, который пришёл', 'a pessoa que chegou', 'человек, который пришёл'],
        ['человек, с которым я говорил', 'a pessoa com quem falei', 'человек, с которым я говорил'],
        ['город, где я живу', 'a cidade onde moro', 'город, где я живу'],
        ['автор, чья книга', 'o autor cujo livro', 'автор, чья книга'],
        ['то, что я сказал', 'o que eu disse', 'то, что я сказал'],
      ],
      'После предлога о людях берут quem, а не que. cujo согласуется с тем, что за ним, а не с владельцем.',
    ),
    vocab: [
      { term: 'que', reading: 'ки', ru: 'который' },
      { term: 'quem', reading: 'кэ̃й', ru: 'кто, кого (о людях)' },
      { term: 'onde', reading: 'о́нджи', ru: 'где' },
      { term: 'cujo / cuja', reading: 'ку́жу / ку́жа', ru: 'чей, которого' },
      { term: 'o que', reading: 'у ки', ru: 'то, что' },
      { term: 'com quem', reading: 'кõ кэ̃й', ru: 'с кем' },
      { term: 'a quem', reading: 'а кэ̃й', ru: 'кому' },
      { term: 'do qual', reading: 'ду куáу', ru: 'которого (книжно)' },
      { term: 'no qual', reading: 'ну куáу', ru: 'в котором' },
      { term: 'motivo', reading: 'моти́ву', ru: 'причина' },
    ],
    tasks: [
      one('«Человек, с которым я говорил»:', [
        'A pessoa que eu falei.',
        'A pessoa com quem eu falei.',
        'A pessoa quem eu falei com.',
        'A pessoa onde eu falei.',
      ], 1),
      one('«Город, где я родился»:', [
        'A cidade que eu nasci.',
        'A cidade onde eu nasci.',
        'A cidade cuja eu nasci.',
        'A cidade a quem eu nasci.',
      ], 1),
      one('«Автор, книгу которого я прочитал»:', [
        'O autor que o livro eu li.',
        'O autor cujo livro eu li.',
        'O autor de quem livro eu li.',
        'O autor onde o livro eu li.',
      ], 1),
      one('Согласуется ли cujo с обладателем или с обладаемым?', [
        'С обладателем',
        'С тем, чем обладают: cujo livro, cuja casa',
        'Не согласуется',
        'Всегда мужской род',
      ], 1),
      fill('Дополните: Esse é o professor ___ me ajudou muito.', 'que'),
      fill('Дополните: A empresa para a ___ eu trabalho fica no centro.', 'qual'),
      wb('A pessoa com quem eu conversei ontem trabalha nessa empresa.', 'Соберите предложение с относительным придаточным.', ['que', 'onde']),
      write('Возьмите свой прошлый текст из шести коротких предложений и перепишите его в три сложных, объединив их относительными придаточными.'),
    ],
  },

  // ═══ Модуль 3. Дискурс и аргументация ═══
  {
    n: 10, shortId: 'ptb2-10',
    title: 'Косвенная речь',
    goal: 'Передавать чужие слова с правильным сдвигом времён',
    grammar: 'disse que + сдвиг (presente → imperfeito, perfeito → mais-que-perfeito, futuro → futuro do pretérito); pediu que + subjuntivo',
    grammarWhy: 'В CELPE-Bras задание почти всегда строится на источнике: услышал — перескажи. Без сдвига времён пересказ звучит как цитата, а без perguntou se — как прямой вопрос.',
    vocabTheme: 'Передача информации',
    artifact: 'Пересказ интервью на 10 предложений',
    pattern: drill(
      'косвенная речь и сдвиг времён',
      'он сказал, что …',
      [
        ['«Estou cansado» →', 'Disse que estava cansado', 'Сказал, что устал.'],
        ['«Cheguei» →', 'Disse que tinha chegado', 'Сказал, что приехал.'],
        ['«Vou viajar» →', 'Disse que ia viajar', 'Сказал, что поедет.'],
        ['«Farei isso» →', 'Disse que faria isso', 'Сказал, что сделает это.'],
        ['просьба: «Venha» →', 'Pediu que eu viesse', 'Попросил меня прийти.'],
      ],
      'Каждое время сдвигается на шаг назад. Просьба уходит не в indicativo, а в subjuntivo: pediu que eu viesse.',
    ),
    vocab: [
      { term: 'disse que', reading: 'джи́си ки', ru: 'сказал, что' },
      { term: 'perguntou se', reading: 'пергунто́у си', ru: 'спросил, ли' },
      { term: 'pediu que', reading: 'педи́у ки', ru: 'попросил, чтобы' },
      { term: 'afirmou', reading: 'афирмо́у', ru: 'заявил' },
      { term: 'segundo', reading: 'сегу́нду', ru: 'согласно (кому-то)' },
      { term: 'de acordo com', reading: 'джиако́рду кõ', ru: 'в соответствии с' },
      { term: 'ressaltar', reading: 'хесаутáр', ru: 'подчёркивать' },
      { term: 'acrescentar', reading: 'акресентáр', ru: 'добавлять' },
      { term: 'declarar', reading: 'декларáр', ru: 'заявлять' },
      { term: 'relatar', reading: 'хелатáр', ru: 'излагать, рассказывать' },
    ],
    tasks: [
      one('«Он сказал: «Я работаю здесь»» → косвенно:', [
        'Ele disse que trabalha aqui.',
        'Ele disse que trabalhava ali.',
        'Оба возможны; второй — с полным сдвигом времени и места',
        'Ele disse que trabalhar ali.',
      ], 2),
      one('«Она спросила: «Ты придёшь?»» → косвенно:', [
        'Ela perguntou se eu viria.',
        'Ela perguntou que eu virei.',
        'Ela perguntou se eu venha.',
        'Ela perguntou você vem.',
      ], 0),
      one('«Он попросил: «Отправьте отчёт»» → косвенно:', [
        'Ele pediu que enviássemos o relatório.',
        'Ele pediu que enviamos o relatório.',
        'Ele pediu enviar que o relatório.',
        'Ele pediu se enviássemos o relatório.',
      ], 0),
      grid('Заполните таблицу сдвига времён.',
        ['прямая речь', 'косвенная (после disse que)'],
        [
          ['«Eu trabalho»', 'trabalhava'],
          ['«Eu trabalhei»', 'tinha trabalhado'],
          ['«Eu vou trabalhar»', 'ia trabalhar'],
          ['«Eu trabalharei»', 'trabalharia'],
        ],
        { '0,1': true, '1,1': true, '3,1': true }),
      fill('Дополните: Ele disse que ___ cansado. (estar, сдвиг от «estou»)', 'estava'),
      fill('Дополните: Ela perguntou ___ eu tinha lido o texto.', 'se'),
      write('Послушайте или прочитайте любое короткое интервью на португальском и перескажите его десятью предложениями в косвенной речи, сославшись на источник через segundo.'),
    ],
  },
  {
    n: 11, shortId: 'ptb2-11',
    title: 'Связки аргументации',
    goal: 'Строить довод, а не список фраз',
    grammar: 'Причина, следствие, уступка, противопоставление, добавление, вывод; позиция связки в предложении',
    grammarWhy: 'Связность прямо влияет на оценку в CELPE-Bras. Ошибка не в незнании слов, а в том, что все связки сводятся к «e», «mas» и «porque»; текст читается как школьный.',
    vocabTheme: 'Логические связки',
    artifact: 'Аргументированный абзац с пятью типами связок',
    pattern: drill(
      'связки текста',
      'причина, уступка, вывод',
      [
        ['поскольку', 'uma vez que', 'поскольку'],
        ['следовательно', 'portanto', 'следовательно'],
        ['несмотря на', 'apesar de', 'несмотря на'],
        ['однако', 'no entanto', 'однако'],
        ['кроме того', 'além disso', 'кроме того'],
      ],
      'Это каркас письменной части экзамена. Заученные связки экономят время и сразу поднимают регистр текста.',
    ),
    vocab: [
      { term: 'portanto', reading: 'портáнту', ru: 'следовательно' },
      { term: 'no entanto', reading: 'ну энтáнту', ru: 'однако' },
      { term: 'além disso', reading: 'алэ̃й джи́су', ru: 'кроме того' },
      { term: 'por outro lado', reading: 'пур о́утру лáду', ru: 'с другой стороны' },
      { term: 'uma vez que', reading: 'у́ма вэйс ки', ru: 'поскольку' },
      { term: 'ainda que', reading: 'аи́нда ки', ru: 'даже если' },
      { term: 'ou seja', reading: 'о́у се́жа', ru: 'то есть' },
      { term: 'em suma', reading: 'э̃й су́ма', ru: 'в итоге' },
      { term: 'de fato', reading: 'джи фáту', ru: 'действительно' },
      { term: 'por exemplo', reading: 'пур эзэ́мплу', ru: 'например' },
    ],
    tasks: [
      one('Какая связка вводит следствие?', ['no entanto', 'portanto', 'ainda que', 'além disso'], 1),
      one('«Даже если это дорого, оно того стоит» — какое наклонение после ainda que?', [
        'indicativo',
        'subjuntivo',
        'infinitivo',
        'gerúndio',
      ], 1),
      one('Какая пара связок противопоставляет два взгляда?', [
        'por um lado… por outro lado',
        'além disso… de fato',
        'ou seja… em suma',
        'portanto… uma vez que',
      ], 0),
      pairsOf('Соедините связку и функцию.', [
        ['uma vez que', 'причина'],
        ['portanto', 'следствие'],
        ['no entanto', 'противопоставление'],
        ['em suma', 'вывод'],
      ]),
      fill('Дополните: O projeto é caro; ___, os benefícios compensam. (однако)', 'no entanto'),
      fill('Дополните: ___ que seja difícil, vale a pena tentar. (даже если)', 'Ainda'),
      order('Расставьте части аргументированного абзаца.', [
        'Тезис: позиция автора',
        'Причина: uma vez que…',
        'Пример: por exemplo…',
        'Уступка: no entanto…',
        'Вывод: em suma…',
      ]),
      write('Напишите абзац на 10 предложений на любую спорную тему, используя минимум пять разных связок из юнита. Каждую подчеркните и подпишите её функцию.'),
    ],
  },
  {
    n: 12, shortId: 'ptb2-12',
    title: 'Осторожность и вежливость в тексте',
    goal: 'Смягчать утверждения и возражать, не обостряя',
    grammar: 'Модализаторы: talvez, é possível que, tende a, parece que, de certa forma; вежливое несогласие',
    grammarWhy: 'Категоричное «está errado» в письме воспринимается резко. Экзаменационные задания часто требуют возразить или пожаловаться — и оценивается именно то, удержан ли уместный тон.',
    vocabTheme: 'Смягчение',
    artifact: 'Пять возражений в вежливой форме',
    pattern: drill(
      'смягчение и осторожное несогласие',
      'не «нет», а «не совсем»',
      [
        ['возможно, что', 'é possível que seja', 'возможно, это так'],
        ['может быть', 'talvez seja', 'может быть, это так'],
        ['кажется, что', 'parece que', 'кажется, что'],
        ['в некотором смысле', 'de certa forma', 'в некотором смысле'],
        ['я не совсем согласен', 'não concordo totalmente', 'я не совсем согласен'],
      ],
      'talvez и é possível que тянут за собой subjuntivo — отсюда seja, а не é. Прямое «não concordo» в бразильской беседе звучит резче, чем задумано.',
    ),
    vocab: [
      { term: 'talvez', reading: 'тауве́с', ru: 'возможно' },
      { term: 'é possível que', reading: 'э поси́вел ки', ru: 'возможно, что' },
      { term: 'tende a', reading: 'те́нджи а', ru: 'имеет тенденцию' },
      { term: 'parece que', reading: 'паре́си ки', ru: 'кажется, что' },
      { term: 'de certa forma', reading: 'джи се́рта фо́рма', ru: 'в определённой мере' },
      { term: 'não necessariamente', reading: 'нãу несесариаме́нчи', ru: 'не обязательно' },
      { term: 'com todo o respeito', reading: 'кõ то́ду у хеспе́йту', ru: 'при всём уважении' },
      { term: 'entendo o ponto', reading: 'энте́нду у по́нту', ru: 'я понимаю мысль' },
      { term: 'discordo em parte', reading: 'джиско́рду э̃й пáрчи', ru: 'частично не согласен' },
      { term: 'seria interessante', reading: 'сери́а интересáнчи', ru: 'было бы интересно' },
    ],
    tasks: [
      one('Смягчите: «Isso está errado.»', [
        'Isso está totalmente errado.',
        'Talvez isso não seja bem assim.',
        'Isso é errado sempre.',
        'Você está errado com certeza.',
      ], 1),
      one('После é possível que идёт:', ['indicativo', 'subjuntivo', 'infinitivo', 'futuro'], 1),
      one('Какая формула сохраняет несогласие, но снимает резкость?', [
        'Você não entendeu.',
        'Entendo o seu ponto, mas discordo em parte.',
        'Isso não faz sentido nenhum.',
        'Está claro que é o contrário.',
      ], 1),
      fill('Дополните: É possível que a situação ___ no próximo ano. (mudar)', 'mude'),
      fill('Дополните: Jovens ___ a preferir aplicativos. (tender)', 'tendem'),
      many('Какие выражения смягчают утверждение?', ['talvez', 'de certa forma', 'com certeza absoluta', 'parece que'], [0, 1, 3]),
      write('Возьмите пять категоричных утверждений и перепишите каждое в смягчённой форме, сохранив смысл. Рядом поясните, что изменилось в тоне.'),
      say('Возразите вслух на пять мнений, с которыми вы не согласны, сохраняя вежливый тон. Начинайте с признания чужой позиции.', 120),
    ],
  },
  {
    n: 13, shortId: 'ptb2-13',
    title: 'Регистры: от разговора до официального письма',
    goal: 'Переключать регистр под адресата',
    grammar: 'Разговорный (a gente, cadê, tá), нейтральный, формальный (prezado, venho por meio desta); что меняется в лексике, местоимениях и синтаксисе',
    grammarWhy: 'CELPE-Bras оценивает уместность жанру и адресату. Одна и та же мысль в письме другу и в жалобе в компанию выглядит по-разному не только словами, но и синтаксисом, и это надо уметь делать сознательно.',
    vocabTheme: 'Регистры',
    artifact: 'Одно сообщение в трёх регистрах',
    vocab: [
      { term: 'prezado / prezada', reading: 'презáду / презáда', ru: 'уважаемый / уважаемая' },
      { term: 'venho por meio desta', reading: 'ве́нью пур ме́йу де́ста', ru: 'настоящим обращаюсь' },
      { term: 'atenciosamente', reading: 'атенсиозаме́нчи', ru: 'с уважением' },
      { term: 'cadê', reading: 'каде́', ru: 'где (разговорное)' },
      { term: 'tá', reading: 'та', ru: 'ок, ладно (разговорное)' },
      { term: 'grato', reading: 'грáту', ru: 'признателен' },
      { term: 'solicitar', reading: 'соличитáр', ru: 'запрашивать' },
      { term: 'informar', reading: 'информáр', ru: 'сообщать' },
      { term: 'aguardo retorno', reading: 'агуáрду хето́рну', ru: 'жду ответа' },
      { term: 'assunto', reading: 'асу́нту', ru: 'тема письма' },
    ],
    tasks: [
      one('Какое обращение уместно в официальном письме?', ['Oi!', 'Prezado Senhor,', 'E aí,', 'Fala!'], 1),
      one('Формальный эквивалент «Quero saber…»:', [
        'Quero saber logo.',
        'Gostaria de solicitar informações sobre…',
        'Cadê a resposta?',
        'Me diz aí.',
      ], 1),
      one('Что чаще всего выдаёт неуместный регистр в формальном письме?', [
        'Длина предложений',
        'Разговорные формы (a gente, tá) и отсутствие формул обращения',
        'Использование subjuntivo',
        'Наличие даты',
      ], 1),
      pairsOf('Соедините выражение и регистр.', [
        ['a gente vai', 'разговорный'],
        ['nós iremos', 'формальный'],
        ['valeu!', 'разговорный'],
        ['atenciosamente', 'формальный'],
      ]),
      order('Расставьте части официального письма.', [
        'Assunto: тема письма',
        'Prezado(a) Senhor(a),',
        'Venho por meio desta solicitar…',
        'Обоснование и детали запроса',
        'Aguardo retorno. Atenciosamente, имя',
      ]),
      fill('Дополните официальное завершение: ___, João Silva.', 'Atenciosamente'),
      write('Напишите одно и то же сообщение «прошу перенести встречу на другой день» трижды: другу в мессенджер, коллеге по работе и клиенту официальным письмом. Подпишите, что меняли.'),
    ],
  },

  // ═══ Модуль 4. Жанры CELPE-Bras ═══
  {
    n: 14, shortId: 'ptb2-14',
    title: 'Задание по видео и аудио',
    goal: 'Извлекать из записи то, что нужно для задачи, и превращать в текст нужного жанра',
    grammar: 'Заметки при однократном прослушивании; отбор информации под цель, а не пересказ всего',
    grammarWhy: 'Первые задания письменной части строятся на видео и аудио. Типичная ошибка — пересказать запись целиком: оценивается не полнота пересказа, а решение задачи, ради которой запись дана.',
    vocabTheme: 'Работа с записью',
    artifact: 'Два текста по записи в разных жанрах',
    vocab: [
      { term: 'reportagem', reading: 'хепортáжэ̃й', ru: 'репортаж' },
      { term: 'entrevista', reading: 'энтреви́ста', ru: 'интервью' },
      { term: 'trecho', reading: 'тре́шу', ru: 'фрагмент' },
      { term: 'destacar', reading: 'дестакáр', ru: 'выделять' },
      { term: 'dado', reading: 'дáду', ru: 'данные, факт' },
      { term: 'público-alvo', reading: 'пу́блику áуву', ru: 'целевая аудитория' },
      { term: 'finalidade', reading: 'финалидáджи', ru: 'назначение, цель' },
      { term: 'anotar', reading: 'анотáр', ru: 'записывать' },
      { term: 'resumir', reading: 'хезуми́р', ru: 'кратко изложить' },
      { term: 'reformular', reading: 'хеформулáр', ru: 'переформулировать' },
    ],
    tasks: [
      one('Что оценивается в задании по видео?', [
        'Насколько полно пересказана запись',
        'Насколько решена поставленная задача с использованием нужной информации из записи',
        'Сколько слов написано',
        'Знание грамматики',
      ], 1),
      one('Задание: «на основе репортажа напишите пост для соцсети школы». Что важнее всего?', [
        'Пересказать репортаж по порядку',
        'Отобрать то, что интересно аудитории школы, и оформить как пост',
        'Процитировать журналиста дословно',
        'Указать длительность видео',
      ], 1),
      order('Расставьте шаги работы с заданием по видео.', [
        'Прочитать формулировку задачи ДО просмотра: жанр, адресат, цель',
        'Смотреть, записывая только то, что относится к задаче',
        'Отметить два-три факта или цифры для опоры',
        'Составить план текста в нужном жанре',
        'Написать текст, обращаясь к своему адресату',
      ]),
      many('Что надо выписать из формулировки задания перед просмотром?', [
        'Жанр текста',
        'Кому адресован текст',
        'Зачем он пишется',
        'Сколько минут длится видео',
      ], [0, 1, 2]),
      fill('Дополните: Segundo a ___ , o número de participantes dobrou. (репортаж)', 'reportagem'),
      write('Найдите короткий репортаж на португальском (2–4 минуты). Задача: на его основе напишите пост для страницы районной библиотеки, приглашающий соседей на мероприятие (100–150 слов). Соблюдите жанр поста и адресата.'),
      write('То же видео, другая задача: напишите короткое письмо директору библиотеки с предложением, что стоит изменить. Обратите внимание, как меняются отбор фактов и тон.'),
    ],
  },
  {
    n: 15, shortId: 'ptb2-15',
    title: 'Письмо-жалоба и деловое письмо',
    goal: 'Добиваться результата письмом, а не выражать эмоции',
    grammar: 'Структура жалобы: факт → последствие → требование → срок; формулы вежливой настойчивости',
    grammarWhy: 'Жалоба — частый жанр экзамена и жизни. Проверяется не эмоция, а структура: изложены ли факты, назван ли ущерб, сформулировано ли конкретное требование.',
    vocabTheme: 'Жалоба и требование',
    artifact: 'Письмо-жалоба на 150–180 слов',
    vocab: [
      { term: 'reclamação', reading: 'хекламасãу', ru: 'жалоба' },
      { term: 'prejuízo', reading: 'прежуи́зу', ru: 'ущерб' },
      { term: 'providência', reading: 'провиде́нсиа', ru: 'принимаемая мера' },
      { term: 'ressarcimento', reading: 'хесарсиме́нту', ru: 'возмещение' },
      { term: 'prazo', reading: 'прáзу', ru: 'срок' },
      { term: 'protocolo', reading: 'протоко́лу', ru: 'номер обращения' },
      { term: 'inaceitável', reading: 'инасейтáвел', ru: 'неприемлемый' },
      { term: 'solicito', reading: 'соли́ситу', ru: 'прошу (официально)' },
      { term: 'em anexo', reading: 'э̃й ане́ксу', ru: 'во вложении' },
      { term: 'aguardo providências', reading: 'агуáрду провиде́нсиас', ru: 'жду принятия мер' },
    ],
    tasks: [
      one('С чего начинается результативная жалоба?', [
        'С выражения возмущения',
        'С фактов: что, когда, где произошло, с номером заказа или обращения',
        'С требования компенсации',
        'С угрозы обратиться в суд',
      ], 1),
      one('Какое требование сформулировано лучше?', [
        'Espero que resolvam isso logo.',
        'Solicito o ressarcimento de R$ 250,00 no prazo de dez dias úteis.',
        'Isso é inaceitável.',
        'Quero uma resposta.',
      ], 1),
      order('Расставьте части письма-жалобы.', [
        'Тема и данные: номер заказа, дата',
        'Что произошло — факты без оценок',
        'Какие последствия это имело',
        'Конкретное требование и срок',
        'Вежливое завершение и подпись',
      ]),
      pairsOf('Соедините формулу и её место в письме.', [
        ['Venho por meio desta relatar', 'вступление'],
        ['Em razão disso', 'последствия'],
        ['Solicito', 'требование'],
        ['Aguardo providências', 'завершение'],
      ]),
      fill('Дополните: ___ o ressarcimento do valor pago. (прошу официально)', 'Solicito'),
      write('Напишите письмо-жалобу на 150–180 слов: вы оплатили онлайн-курс, доступ не открылся десять дней, поддержка не отвечает. Факты, последствия, конкретное требование и срок, вежливый тон.'),
      write('Напишите деловое письмо на 120–150 слов в другой ситуации: вы просите перенести оплаченное занятие и предлагаете две даты. Проверьте, что тон отличается от жалобы.'),
    ],
  },
  {
    n: 16, shortId: 'ptb2-16',
    title: 'Статья-мнение',
    goal: 'Писать аргументированный текст для читателя, а не для проверяющего',
    grammar: 'Структура: проблема → позиция → аргументы → возражение → вывод; заголовок и обращение к читателю',
    grammarWhy: 'Жанр artigo de opinião отличается от эссе тем, что у него есть издание и читатель. Экзамен проверяет именно это: написан ли текст так, будто он выйдет в конкретном месте.',
    vocabTheme: 'Публицистика',
    artifact: 'Статья-мнение на 200–250 слов',
    vocab: [
      { term: 'artigo de opinião', reading: 'арчи́гу джи опиниãу', ru: 'статья-мнение' },
      { term: 'polêmica', reading: 'поле́мика', ru: 'полемика' },
      { term: 'defender uma ideia', reading: 'дефенде́р у́ма иде́йа', ru: 'отстаивать мысль' },
      { term: 'contra-argumento', reading: 'контра-аргуме́нту', ru: 'контраргумент' },
      { term: 'evidência', reading: 'эвиде́нсиа', ru: 'свидетельство' },
      { term: 'leitor', reading: 'лейто́р', ru: 'читатель' },
      { term: 'veículo', reading: 'вейи́кулу', ru: 'издание' },
      { term: 'manchete', reading: 'манше́чи', ru: 'заголовок' },
      { term: 'ponto de vista', reading: 'по́нту джи ви́ста', ru: 'точка зрения' },
      { term: 'concluir', reading: 'конклуи́р', ru: 'заключать' },
    ],
    tasks: [
      one('Чем artigo de opinião отличается от школьного сочинения?', [
        'Длиной',
        'У него есть конкретное издание и читатель, к которому автор обращается',
        'В нём нет аргументов',
        'Он пишется в прошедшем времени',
      ], 1),
      one('Какой заголовок работает лучше?', [
        'Redação sobre transporte',
        'Ciclovias: por que a cidade precisa investir mais',
        'Um texto sobre a cidade',
        'Opinião',
      ], 1),
      one('Зачем в статье-мнении нужен контраргумент?', [
        'Чтобы увеличить объём',
        'Чтобы показать, что автор знает возражения, и ответить на них — это усиливает позицию',
        'Так требует грамматика',
        'Чтобы не высказывать своё мнение',
      ], 1),
      order('Расставьте части статьи-мнения.', [
        'Заголовок, обозначающий позицию',
        'Проблема и почему она важна сейчас',
        'Позиция автора',
        'Два аргумента с примерами',
        'Возражение и ответ на него',
        'Вывод с призывом или предложением',
      ]),
      many('Что усиливает аргумент?', [
        'Конкретный пример или цифра',
        'Ссылка на источник',
        'Повторение тезиса другими словами',
        'Признание границ собственной позиции',
      ], [0, 1, 3]),
      write('Напишите статью-мнение на 200–250 слов для сайта районной газеты: «Нужно ли ограничивать движение машин в центре города». Заголовок, позиция, два аргумента, контраргумент с ответом, вывод.'),
      say('Прочитайте свою статью вслух и запишите. Услышанное тяжёлое предложение перепишите.', 150),
    ],
  },
  {
    n: 17, shortId: 'ptb2-17',
    title: 'Пересказ и краткое изложение',
    goal: 'Сжимать текст, не теряя главного и не копируя формулировки',
    grammar: 'Перефразирование, номинализация, отбор главного; ссылка на источник',
    grammarWhy: 'Задания третьего и четвёртого типа основаны на письменных текстах, и списывание оттуда фраз снижает оценку. Умение переформулировать — то же ядро, что и в других языковых экзаменах, но здесь оно оценивается внутри жанровой задачи.',
    vocabTheme: 'Изложение',
    artifact: 'Изложение текста на 100 слов',
    vocab: [
      { term: 'resumo', reading: 'хезу́му', ru: 'краткое изложение' },
      { term: 'ideia principal', reading: 'иде́йа принсипáу', ru: 'главная мысль' },
      { term: 'detalhe secundário', reading: 'детáлье секундáриу', ru: 'второстепенная деталь' },
      { term: 'em outras palavras', reading: 'э̃й о́утрас палáврас', ru: 'иными словами' },
      { term: 'sintetizar', reading: 'синтетизáр', ru: 'обобщать' },
      { term: 'citar', reading: 'ситáр', ru: 'цитировать' },
      { term: 'parafrasear', reading: 'парафразеáр', ru: 'перефразировать' },
      { term: 'autor', reading: 'ауто́р', ru: 'автор' },
      { term: 'trecho principal', reading: 'тре́шу принсипáу', ru: 'ключевой фрагмент' },
      { term: 'conforme', reading: 'конфо́рми', ru: 'согласно' },
    ],
    tasks: [
      one('Почему нельзя переносить фразы из исходного текста дословно?', [
        'Это запрещено правилами оформления',
        'Скопированное не показывает вашего владения языком и снижает оценку',
        'Так текст становится длиннее',
        'Цитировать вообще нельзя',
      ], 1),
      one('Что должно остаться в изложении на 100 слов?', [
        'Все примеры автора',
        'Главная мысль и опорные доводы, без второстепенных деталей',
        'Первый и последний абзацы',
        'Только цифры',
      ], 1),
      fill('Перефразируйте: «O número de usuários aumentou muito» → «Houve um ___ expressivo no número de usuários.»', 'aumento'),
      fill('Дополните ссылку на источник: ___ o autor, a mudança começou em 2020.', 'Conforme', ['Segundo']),
      order('Расставьте шаги работы над изложением.', [
        'Прочитать текст целиком, не выписывая ничего',
        'Отметить главную мысль каждого абзаца',
        'Отбросить примеры и повторы',
        'Переформулировать оставшееся своими словами',
        'Проверить объём и наличие ссылки на источник',
      ]),
      write('Возьмите статью на португальском на 600–800 слов. Напишите изложение на 100 слов своими словами и отдельно выпишите три фразы оригинала, которые вам хотелось скопировать, — и три ваши замены им.'),
    ],
  },
  {
    n: 18, shortId: 'ptb2-18',
    title: 'Устная часть: elementos provocadores',
    goal: 'Свободно вести двадцатиминутную беседу с экзаменатором',
    grammar: 'Повторение всего курса в устной форме: аргументация, смягчение, косвенная речь, условные',
    grammarWhy: 'Устная часть — половина экзамена, и она не про заученные темы: разговор идёт от материала-стимула (картинки, заголовка, короткого текста) к личному опыту и к обобщению. Тренируется именно этот переход.',
    vocabTheme: 'Устная беседа',
    artifact: 'Записанная имитация устной части на 20 минут',
    vocab: [
      { term: 'elemento provocador', reading: 'элеме́нту провокадо́р', ru: 'материал-стимул' },
      { term: 'entrevistador', reading: 'энтревистадо́р', ru: 'экзаменатор, интервьюер' },
      { term: 'na minha experiência', reading: 'на ми́нья эсперие́нсиа', ru: 'по моему опыту' },
      { term: 'no meu país', reading: 'ну ме́у паи́с', ru: 'в моей стране' },
      { term: 'isso me lembra', reading: 'и́су ми ле́мбра', ru: 'это мне напоминает' },
      { term: 'aprofundar', reading: 'апрофундáр', ru: 'углублять (мысль)' },
      { term: 'exemplificar', reading: 'эземплификáр', ru: 'приводить примеры' },
      { term: 'hesitar', reading: 'эзитáр', ru: 'колебаться' },
      { term: 'ganhar tempo', reading: 'ганьáр те́мпу', ru: 'выиграть время' },
      { term: 'deixa eu pensar', reading: 'де́йша эу пенсáр', ru: 'дайте подумать' },
    ],
    tasks: [
      one('Как устроена устная часть?', [
        'Монолог на заданную тему',
        'Сначала беседа о самом кандидате, затем обсуждение материалов-стимулов',
        'Чтение текста вслух',
        'Диалог с другим кандидатом',
      ], 1),
      one('Вам показали заголовок статьи о переработке мусора. С чего начать?', [
        'Пересказать заголовок',
        'Сказать, что видите, затем связать с личным опытом и выйти на обобщение',
        'Сказать, что тема вам незнакома',
        'Спросить у экзаменатора его мнение',
      ], 1),
      one('Вам нужно время подумать. Что лучше сделать?', [
        'Молчать',
        'Сказать «Deixa eu pensar um pouco…» и продолжить',
        'Перейти на английский',
        'Попросить другой вопрос',
      ], 1),
      many('Что реально повышает оценку устной части?', [
        'Конкретные примеры из своей жизни',
        'Готовность возразить и обосновать',
        'Заученные наизусть длинные вступления',
        'Уточняющие вопросы к экзаменатору',
      ], [0, 1, 3]),
      order('Расставьте развитие ответа на стимул.', [
        'Описать, что перед вами',
        'Сказать, какая проблема за этим стоит',
        'Привести пример из своего опыта',
        'Сравнить со своей страной',
        'Сделать обобщение и обозначить свою позицию',
      ]),
      say('Часть 1. Расскажите о себе три минуты: кто вы, чем занимаетесь, зачем вам португальский, какие планы. Без подготовки.', 180),
      say('Часть 2. Стимул — заголовок «Trabalho remoto: liberdade ou armadilha?». Говорите пять минут: что видите, чем это важно, ваш опыт, сравнение со своей страной, ваша позиция.', 300),
      readAloud('Прочитайте вслух своё вступление к устной части — здесь слышны и темп, и носовые, и открытые гласные.',
        'Bom dia. Meu nome é Yuri, sou russo e moro em Moscou. Estudo português há dois anos porque pretendo trabalhar no Brasil.', 60),
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Иллюстрации конспектов
//
// Весь средний уровень португальского держится на subjuntivo: его формы
// выводятся по правилу, и правило это — таблица, а не абзац.
// ─────────────────────────────────────────────────────────────────────────────

export const PORTUGUESE2_FIGURES: CourseFigures = {
  'ptb2-03': [{
    caption: 'Presente do subjuntivo строится от формы eu',
    src: formTable('Как получить subjuntivo', ['Инфинитив', 'Форма eu', 'Subjuntivo', 'Правило'], [
      ['falar', 'falo', 'que eu fale', '-o → -e'],
      ['comer', 'como', 'que eu coma', '-o → -a'],
      ['fazer', 'faço', 'que eu faça', 'неправильность сохраняется'],
      ['ter', 'tenho', 'que eu tenha', 'неправильность сохраняется'],
      ['ir', 'vou', 'que eu vá', 'исключение'],
    ], { note: 'Триггеры: espero que, duvido que, é importante que, talvez — после них индикатив невозможен' }),
  }],

  'ptb2-04': [{
    caption: 'Нереальное условие: se + imperfeito do subjuntivo',
    src: formulaStrip('Se eu tivesse…, eu faria…', [
      { text: 'Se', note: 'если бы' },
      { text: 'tivesse tempo', note: 'imperfeito do subjuntivo', key: true },
      { text: 'eu viajaria', note: 'futuro do pretérito' },
    ], {
      example: 'Se eu tivesse tempo, eu viajaria mais — «Если бы у меня было время, я бы больше путешествовал»',
      note: 'Форма берётся от 3 лица мн. ч. perfeito: fizeram → fizesse, tiveram → tivesse',
    }),
  }],

  'ptb2-06': [{
    caption: 'Время главного предложения задаёт время придаточного',
    src: formTable('Согласование времён', ['Главное', 'Придаточное', 'Пример'], [
      ['presente', 'subjuntivo presente', 'Espero que ele venha'],
      ['perfeito / imperfeito', 'subjuntivo imperfeito', 'Esperava que ele viesse'],
      ['futuro do pretérito', 'subjuntivo imperfeito', 'Seria bom que ele viesse'],
      ['futuro', 'futuro do subjuntivo', 'Quando ele vier, avise'],
    ], { note: 'Ошибка уровня: «Esperava que ele venha» — время главного тянет за собой imperfeito' }),
  }],

  'ptb2-08': [{
    caption: 'Три способа убрать деятеля из фразы',
    src: contrastPair('Пассив и безличность', {
      head: 'voz passiva', sub: 'формально, часто в тексте',
      items: ['A casa foi construída em 1990', 'ser + причастие (+ por)', 'деятель можно назвать'],
    }, {
      head: 'se apassivador / a gente', sub: 'разговорно и нейтрально',
      items: ['Vende-se casas — продаются дома', 'Aqui se fala português', 'A gente faz isso sempre'],
    }, { note: 'В речи бразильцы почти всегда выбирают вторую колонку — пассив звучит как документ' }),
  }],

  'ptb2-10': [{
    caption: 'Косвенная речь сдвигает время на шаг назад',
    src: formTable('Сдвиг времён', ['Прямая речь', 'Косвенная', 'Что изменилось'], [
      ['«Eu trabalho aqui»', 'Disse que trabalhava ali', 'presente → imperfeito'],
      ['«Eu fiz isso»', 'Disse que tinha feito aquilo', 'perfeito → mais-que-perfeito'],
      ['«Eu vou sair»', 'Disse que ia sair', 'futuro → futuro do pretérito'],
      ['«Faça isso»', 'Pediu que fizesse aquilo', 'приказ → subjuntivo'],
    ], { note: 'Вместе со временем сдвигаются указатели: aqui → ali, hoje → naquele dia, este → aquele' }),
  }],
}

export const PORTUGUESE_INTERMEDIATE: LanguageCourseSpec = {
  key: 'ptb2',
  title: 'Португальский — Intermediário и CELPE-Bras',
  subject: 'Португальский',
  level: 'A2 → B1 (Intermediário, CELPE-Bras)',
  lang: 'pt-BR',
  guidedHours: '200–250',
  scopeNote: 'Продолжение курса «Бразильский португальский с нуля». Целевой уровень экзамена — Intermediário; Avançado остаётся за рамками.',
  modules: PORTUGUESE2_MODULES,
  units: PORTUGUESE2_UNITS,
  figures: PORTUGUESE2_FIGURES,
}

export const COURSE_SUMMARY = courseSummary(PORTUGUESE_INTERMEDIATE)
export const ALL_VOCAB: VocabItem[] = allVocab(PORTUGUESE_INTERMEDIATE)

/** Юнит по короткому id. */
export function portuguese2UnitByShortId(shortId: string): LangUnit | undefined {
  return unitByShortId(PORTUGUESE_INTERMEDIATE, shortId)
}

/** Модуль, которому принадлежит юнит. */
export function portuguese2ModuleOf(n: number): LangModule | undefined {
  return moduleOfUnit(PORTUGUESE_INTERMEDIATE, n)
}

/** Собрать курс для редактора конструктора. */
export function buildPortugueseIntermediateCourse(courseId: string): CourseEdData {
  return buildLanguageCourse(PORTUGUESE_INTERMEDIATE, courseId)
}
