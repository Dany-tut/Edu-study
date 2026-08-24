// ─────────────────────────────────────────────────────────────────────────────
// Справочник английской грамматики: B1 → C1
//
// НЕ ДЛЯ НАЧИНАЮЩИХ. Русскоязычный с B1 уже знает, как строится Past Simple;
// он не знает, ПОЧЕМУ здесь Present Perfect, а не Past Simple. Поэтому охват
// смещён с форм на выбор между формами: времена как система, условные с
// инверсией, модальность как степень уверенности, артикли включая нулевой,
// эмфаза и клефт — то, обо что спотыкаются между «читаю свободно» и
// «пишу и говорю как взрослый».
//
// ПОЧЕМУ У КАЖДОЙ ФОРМЫ ЕСТЬ pitfall. Ошибки русскоязычного в английском
// предсказуемы: Present Perfect по русской логике «недавно = перфект»,
// артикль на глазок, «I very like», порядок слов вопроса внутри косвенного
// вопроса, if + will. Это лечится не правилом, а названной вслух ловушкой.
//
// unit проставлен там, где форму реально проходят в курсах endc (English for
// Design Career) и ielt (IELTS) — связь справочника с курсом, как у корейского.
// ─────────────────────────────────────────────────────────────────────────────

import type { GrammarForm, GrammarRef } from './index'

const CHAPTERS = [
  'Система времён',
  'Косвенная речь',
  'Условные и нереальное',
  'Модальность',
  'Пассив',
  'Артикль и существительное',
  'Сравнение',
  'Герундий, инфинитив, фразовые',
  'Сложное предложение',
  'Эмфаза и вопросы',
  'Предлоги и служебная механика',
]

const FORMS: GrammarForm[] = [
  // ─── Система времён ────────────────────────────────────────────────────────
  {
    id: 'en-past-vs-present-perfect',
    chapter: 'Система времён',
    level: 'B1',
    form: 'I did / I have done',
    title: 'Past Simple против Present Perfect',
    short: 'Закрытая история против результата, который держится сейчас',
    attach: 'к глаголу',
    unit: 'endc-03',
    rule: `Разница не во времени события, а в том, куда смотрит говорящий. Past Simple смотрит в прошлое: событие лежит в закрытом отрезке — yesterday, in 2019, when I lived in Riga, — и с настоящим не связано. Present Perfect смотрит из настоящего: событие оставило след, который важен сейчас, а КОГДА оно случилось — неважно и обычно не называется.

Практический тест: если в предложении есть или подразумевается ответ на вопрос «когда?» — Past Simple. Если событие подано как «уже есть в багаже» (опыт, достижение, свежая новость с последствиями) — Present Perfect. Поэтому новость открывают перфектом (The company has launched a new product), а подробности рассказывают в Past Simple (They launched it on Monday in Berlin).

Маркеры почти механические. Past Simple: yesterday, last week, in 2020, two years ago, when… Present Perfect: ever, never, just, already, yet, so far, recently, this week (если неделя ещё не кончилась). Слово ago и вопрос When…? с перфектом несовместимы вовсе.

В резюме и на собеседовании это различие несёт смысл: I was responsible for onboarding — обязанность на прошлой работе; I have increased retention by 12% — результат, который вы предъявляете сейчас.`,
    table: {
      head: ['Сигнал', 'Время', 'Пример'],
      rows: [
        ['yesterday, in 2019, ago, when…?', 'Past Simple', 'I finished the project in May.'],
        ['ever, never, just, already, yet', 'Present Perfect', 'Have you ever used Figma?'],
        ['закрытый период (last year)', 'Past Simple', 'I read ten books last year.'],
        ['открытый период (this year)', 'Present Perfect', 'I have read ten books this year.'],
      ],
    },
    examples: [
      { text: 'I have lost my keys.', ru: 'Я потерял ключи.', when: 'Результат сейчас: ключей нет, войти не могу.' },
      { text: 'I lost my keys yesterday, but I found them.', ru: 'Вчера я потерял ключи, но нашёл.', when: 'История закрыта — Past Simple, даже если было вчера вечером.' },
      { text: 'Have you ever worked with a remote team?', ru: 'Вы когда-нибудь работали с удалённой командой?', when: 'Вопрос об опыте вообще, без привязки к дате.' },
      { text: 'When did you work there?', ru: 'Когда вы там работали?', when: 'Вопрос «когда?» — только Past Simple.' },
      { text: 'She has just sent the report.', ru: 'Она только что отправила отчёт.', when: 'just — свежее событие с актуальным результатом.' },
      { text: 'The design has changed a lot since March.', ru: 'С марта дизайн сильно изменился.', when: 'since тянет отрезок до настоящего момента.' },
      { text: 'Shakespeare wrote 37 plays.', ru: 'Шекспир написал 37 пьес.', when: 'Автор умер, период закрыт — перфект невозможен.' },
      { text: 'I have seen this movie three times.', ru: 'Я видел этот фильм три раза.', when: 'Счёт открыт: могу посмотреть и четвёртый.' },
      { text: 'We have released two features this quarter.', ru: 'В этом квартале мы выпустили две фичи.', when: 'Квартал ещё идёт — период открытый.' },
      { text: 'We released two features last quarter.', ru: 'В прошлом квартале мы выпустили две фичи.', when: 'Тот же факт, но период закрыт — время меняется.' },
    ],
    pitfall: 'Русскоязычный выбирает перфект по признаку «недавно»: I have seen him two days ago. Но ago намертво привязывает событие к точке в прошлом — с перфектом оно не сочетается никогда. Признак перфекта не свежесть, а отсутствие даты и живой результат.',
    contrast: [
      { with: 'en-present-perfect-continuous', note: 'have done — результат («сколько сделано»), have been doing — процесс («чем я занят последнее время»).' },
      { with: 'en-past-perfect', note: 'Past Perfect нужен только на фоне другого прошедшего события — сам по себе он не употребляется.' },
    ],
    quiz: [
      {
        q: 'I ___ my thesis in 2021.',
        options: ['have finished', 'finished', 'have been finishing'],
        answer: 1,
        why: 'Названа дата — событие лежит в закрытом отрезке, только Past Simple.',
      },
      {
        q: 'Что скажет дизайнер на собеседовании о действующем результате?',
        options: ['I increased conversion by 8% at my last job in 2022.', 'I have increased conversion by 8%.', 'Оба варианта верны, но с разным акцентом.'],
        answer: 2,
        why: 'С датой — закрытый факт биографии (Past Simple), без даты — достижение в багаже (Present Perfect). Выбор времени и есть выбор акцента.',
      },
    ],
  },
  {
    id: 'en-present-perfect-continuous',
    chapter: 'Система времён',
    level: 'B2',
    form: 'I have been doing',
    title: 'Present Perfect против Present Perfect Continuous',
    short: 'Сколько сделано против чем занят: результат или процесс',
    attach: 'к глаголу',
    unit: 'endc-23',
    rule: `Обе формы связывают прошлое с настоящим, но отвечают на разные вопросы. Present Perfect — «сколько сделано?»: I have written three chapters. Present Perfect Continuous — «чем ты занят и как давно?»: I have been writing all morning. Первая считает результат, вторая описывает деятельность, которая заполняла отрезок и, возможно, продолжается.

Отсюда два надёжных употребления континиуса. Первое — длительность с for/since при действии, которое ещё идёт: I have been learning English for six years. Второе — объяснение видимых следов: Why are you wet? — I have been running. Пробежка, может, и закончилась, но её следы на лице — сейчас.

С глаголами состояния (know, believe, own, like) континиус не строится: I have known her for ten years, а не have been knowing. И наоборот: с количеством («три главы», «пять писем») нужен простой перфект — континиус количеств не считает.

На встрече о прогрессе разница слышна отчётливо: I have been working on the redesign — я в процессе; I have finished the redesign — вот результат.`,
    examples: [
      { text: 'I have been working on this feature for two weeks.', ru: 'Я работаю над этой фичей две недели.', when: 'Процесс не закончен — статус на стендапе.' },
      { text: 'I have fixed twelve bugs this week.', ru: 'На этой неделе я починил двенадцать багов.', when: 'Есть число — считаем результат простым перфектом.' },
      { text: 'Sorry about the mess — I have been painting.', ru: 'Извини за беспорядок — я красил.', when: 'Объяснение видимых следов деятельности.' },
      { text: 'How long have you been living in Prague?', ru: 'Как давно ты живёшь в Праге?', when: 'Вопрос о длительности продолжающегося действия.' },
      { text: 'She has been trying to reach you all day.', ru: 'Она весь день пытается до тебя дозвониться.', when: 'Повторяющиеся попытки без результата.' },
      { text: 'I have known him since university.', ru: 'Я знаю его с университета.', when: 'know — глагол состояния, континиус невозможен.' },
      { text: 'Your eyes are red. Have you been crying?', ru: 'У тебя красные глаза. Ты плакала?', when: 'Вывод по следам — классический континиус.' },
      { text: 'We have been discussing this for an hour and decided nothing.', ru: 'Мы обсуждаем это уже час и ничего не решили.', when: 'Лёгкое раздражение длительностью — частый оттенок формы.' },
      { text: 'He has been playing tennis, that’s why he’s tired.', ru: 'Он играл в теннис, поэтому устал.', when: 'Действие завершилось только что, эффект налицо.' },
      { text: 'I have read your report.', ru: 'Я прочитал твой отчёт.', when: 'Важен факт завершения (можно обсуждать), не процесс.' },
    ],
    pitfall: 'Русское «я работаю здесь три года» тянет сказать I work here for three years. Present Simple с for о прошедшем отрезке не работает: нужно I have been working here for three years (или have worked). Простое настоящее в английском отрезок «с тех пор и до сих пор» не покрывает.',
    contrast: [
      { with: 'en-past-vs-present-perfect', note: 'have done предъявляет результат и количество; have been doing — занятость и длительность.' },
    ],
    quiz: [
      {
        q: 'I ___ five emails since lunch.',
        options: ['have been writing', 'have written', 'am writing'],
        answer: 1,
        why: 'Названо количество — считаем сделанное, а количество считает только простой перфект.',
      },
      {
        q: 'Как давно ты его знаешь? — I ___ him for ages.',
        options: ['have been knowing', 'have known', 'know'],
        answer: 1,
        why: 'know — глагол состояния: длительность передаёт простой перфект, континиус с ним не строится.',
      },
    ],
  },
  {
    id: 'en-past-perfect',
    chapter: 'Система времён',
    level: 'B2',
    form: 'I had done / had been doing',
    title: 'Past Perfect: прошлое до прошлого',
    short: 'Шаг назад из уже прошедшего момента',
    attach: 'к глаголу',
    rule: `Past Perfect существует только относительно другой точки в прошлом: когда рассказ уже идёт в Past Simple и нужно шагнуть ещё раньше. When I arrived, the meeting had started — к моменту прихода (прошлое) начало встречи было ещё дальше в прошлом.

Сам по себе, без опорной точки, Past Perfect не употребляется: I had visited Rome как первая фраза разговора — ошибка, нужно I visited / I have visited. Форма включается там, где порядок событий иначе не виден: after, by the time, when, realised/found out that…

Если порядок и так ясен из after или before, Past Perfect часто необязателен: After I finished / had finished the report, I went home — оба варианта верны. Но там, где без него меняется смысл, он обязателен: When I arrived, the meeting started (началась при мне) против had started (началась до меня).

Had been doing — тот же шаг назад для процесса: She had been working there for ten years when the company closed. Длительность отсчитывается до опорной точки в прошлом.`,
    examples: [
      { text: 'When we got to the station, the train had left.', ru: 'Когда мы добрались до вокзала, поезд уже ушёл.', when: 'Классика: событие до события.' },
      { text: 'When we got to the station, the train left.', ru: 'Когда мы добрались до вокзала, поезд ушёл.', when: 'Без перфекта поезд уходит у вас на глазах — смысл другой.' },
      { text: 'I realised I had seen him before.', ru: 'Я понял, что уже видел его раньше.', when: 'После realise/notice/remember — взгляд назад из прошлого.' },
      { text: 'By the time she was 25, she had launched two startups.', ru: 'К 25 годам она запустила два стартапа.', when: 'by the time — стандартная рамка для Past Perfect.' },
      { text: 'He was tired because he had been driving all night.', ru: 'Он устал, потому что вёл машину всю ночь.', when: 'Континиус: процесс, приведший к состоянию в прошлом.' },
      { text: 'The house was quiet: everyone had gone to bed.', ru: 'В доме было тихо: все легли спать.', when: 'Объяснение состояния более ранним событием.' },
      { text: 'She had never flown before that trip.', ru: 'До той поездки она ни разу не летала.', when: 'never + опорная точка «до той поездки».' },
      { text: 'After the guests had left, we cleaned up.', ru: 'После того как гости ушли, мы прибрались.', when: 'С after перфект возможен, но не обязателен.' },
      { text: 'I didn’t laugh because I had heard the joke before.', ru: 'Я не смеялся, потому что уже слышал эту шутку.', when: 'Причина лежит раньше следствия.' },
      { text: 'They had been arguing for an hour when I walked in.', ru: 'Они спорили уже час, когда я вошёл.', when: 'Длительность до момента в прошлом.' },
    ],
    pitfall: 'Две крайности: либо Past Perfect не используется вовсе (порядок событий пропадает), либо им заливают весь рассказ о прошлом «для солидности». Правило: одна опорная точка в Past Simple, и только шаг НАЗАД от неё — в Past Perfect. Рассказ целиком в had done — ошибка.',
    contrast: [
      { with: 'en-narrative-tenses', note: 'В рассказе Past Simple двигает сюжет, Past Continuous рисует фон, Past Perfect делает флешбэк.' },
    ],
    quiz: [
      {
        q: 'When I opened the fridge, I saw that someone ___ my cake.',
        options: ['ate', 'had eaten', 'has eaten'],
        answer: 1,
        why: 'Поедание случилось до открытия холодильника — шаг назад из прошлого, Past Perfect.',
      },
      {
        q: 'Можно ли начать разговор фразой «I had been to Japan»?',
        options: ['Да, это вежливее', 'Нет: без опорного прошлого события Past Perfect не живёт', 'Да, если поездка была давно'],
        answer: 1,
        why: 'Past Perfect всегда «раньше чего-то»: без второй точки в прошлом нужен Past Simple или Present Perfect.',
      },
    ],
  },
  {
    id: 'en-narrative-tenses',
    chapter: 'Система времён',
    level: 'B2',
    form: 'was doing / did / had done',
    title: 'Времена рассказа',
    short: 'Фон, события, флешбэк: три слоя любой истории',
    attach: 'к глаголу',
    unit: 'endc-13',
    rule: `Любая история по-английски собирается из трёх слоёв. Past Simple — цепочка событий, двигающая сюжет: I opened the door, saw the smoke and called 911. Past Continuous — декорации и фоновые процессы, на которых события происходят: The sun was shining, people were hurrying to work. Past Perfect — флешбэк, объясняющий, откуда что взялось: The server had crashed the night before.

Ключевая пара — was doing + did: длинное действие, разрезанное коротким. I was taking a shower when the phone rang. Перепутать слои — поменять смысл: When she arrived, we were having dinner (ужин уже шёл) против When she arrived, we had dinner (сели ужинать после её прихода).

Этот же навык нужен в собеседовании (расскажите о сложном проекте) и в IELTS Speaking Part 2: фон в континиусе задаёт сцену, события в Past Simple ведут рассказ, перфект подкладывает предысторию. История, рассказанная одним Past Simple, звучит как протокол.`,
    examples: [
      { text: 'I was walking home when it started to rain.', ru: 'Я шёл домой, когда начался дождь.', when: 'Длинное действие + короткое, его прервавшее.' },
      { text: 'While I was cooking, she was setting the table.', ru: 'Пока я готовил, она накрывала на стол.', when: 'Два параллельных фоновых процесса — оба в континиусе.' },
      { text: 'He grabbed his coat, ran outside and stopped a taxi.', ru: 'Он схватил пальто, выбежал и поймал такси.', when: 'Цепочка событий — только Past Simple.' },
      { text: 'The team was struggling: the designer had quit a week before.', ru: 'Команда буксовала: неделей раньше уволился дизайнер.', when: 'Фон + флешбэк, объясняющий фон.' },
      { text: 'At 9 pm I was still working.', ru: 'В девять вечера я всё ещё работал.', when: 'Момент внутри процесса — континиус.' },
      { text: 'When the demo crashed, everyone was watching.', ru: 'Когда демо упало, все смотрели.', when: 'Событие на фоне процесса — рассказ о рабочем провале.' },
      { text: 'She was wearing a red coat that day.', ru: 'В тот день на ней было красное пальто.', when: 'Описание внешности в сцене — континиус.' },
      { text: 'By the time we shipped, we had rewritten the module twice.', ru: 'К релизу мы дважды переписали модуль.', when: 'Итог предыстории к точке рассказа.' },
      { text: 'When she arrived, we had dinner.', ru: 'Когда она пришла, мы поужинали.', when: 'Past Simple: сначала пришла, потом сели есть.' },
      { text: 'When she arrived, we were having dinner.', ru: 'Когда она пришла, мы ужинали.', when: 'Континиус: ужин уже шёл. Одна буква рамки — другой сюжет.' },
    ],
    pitfall: 'Русскоязычный рассказывает историю одним Past Simple, потому что русский вид (шёл/пошёл) в английские формы не переносится напрямую. Проверяйте себя вопросом: это событие двигает сюжет (did), рисует фон (was doing) или объясняет предысторию (had done)?',
    contrast: [
      { with: 'en-past-perfect', note: 'Past Perfect — один из трёх слоёв рассказа: флешбэк относительно линии Past Simple.' },
    ],
    quiz: [
      {
        q: 'When the fire alarm went off, everybody ___ lunch.',
        options: ['had', 'was having', 'has had'],
        answer: 1,
        why: 'Сигнализация разрезала процесс: обед уже шёл — Past Continuous.',
      },
      {
        q: 'Какой слой рассказа НЕ двигает сюжет вперёд?',
        options: ['Past Simple', 'Past Continuous', 'Оба двигают'],
        answer: 1,
        why: 'Континиус рисует декорации и фоновые процессы; событийную цепочку ведёт Past Simple.',
      },
    ],
  },
  {
    id: 'en-present-simple-vs-continuous',
    chapter: 'Система времён',
    level: 'B1',
    form: 'I do / I am doing',
    title: 'Present Simple против Present Continuous',
    short: 'Вообще против сейчас — и временные состояния',
    attach: 'к глаголу',
    unit: 'endc-10',
    rule: `Present Simple — то, что верно вообще: привычки, расписания, факты, постоянные роли. I design mobile apps — это моя профессия. Present Continuous — то, что происходит сейчас или в текущий период: I am designing a checkout flow — вот мой текущий проект. На вопрос рекрутера What are you looking for? отвечать нужно континиусом — вопрос про текущую ситуацию, а не про жизненную позицию.

Континиус также берёт временные состояния (I am staying with a friend this month — живу у друга временно, против I live in Warsaw — постоянно) и запланированное личное будущее (I am meeting the client on Friday).

Глаголы состояния — know, believe, want, need, own, seem, cost, mean — в континиусе не употребляются даже про «сейчас»: I want it now, а не am wanting. Отдельная пара: I think (считаю, мнение) против I am thinking about it (обдумываю, процесс).

Континиус с always выражает раздражение повторяющимся: He is always interrupting — не факт расписания, а жалоба.`,
    examples: [
      { text: 'I work as a product designer.', ru: 'Я работаю продуктовым дизайнером.', when: 'Постоянная роль — Simple.' },
      { text: 'I am working on a fintech project right now.', ru: 'Сейчас я работаю над финтех-проектом.', when: 'Текущий проект — Continuous.' },
      { text: 'The train leaves at 6:40.', ru: 'Поезд отправляется в 6:40.', when: 'Расписание — всегда Simple, даже про будущее.' },
      { text: 'What are you looking for in your next role?', ru: 'Что вы ищете в следующей роли?', when: 'Вопрос о текущем поиске — Continuous.' },
      { text: 'I am staying at my sister’s until the flat is ready.', ru: 'Я живу у сестры, пока квартира не готова.', when: 'Временное состояние — Continuous.' },
      { text: 'Water boils at 100 degrees.', ru: 'Вода кипит при ста градусах.', when: 'Общий факт — Simple.' },
      { text: 'Sorry, she is having a meeting now.', ru: 'Извините, у неё сейчас встреча.', when: 'have в значении процесса — континиус возможен.' },
      { text: 'I think this layout works better.', ru: 'Мне кажется, этот макет лучше.', when: 'think = мнение, только Simple.' },
      { text: 'I am thinking about changing jobs.', ru: 'Я подумываю сменить работу.', when: 'think = процесс размышления, континиус верен.' },
      { text: 'He is always leaving his mug in the sink.', ru: 'Он вечно оставляет кружку в раковине.', when: 'always + континиус = раздражение, не расписание.' },
    ],
    pitfall: 'Русское настоящее одно, и оба английских переводятся «делаю» — поэтому русскоязычные отвечают Simple там, где спрашивают о текущем моменте: What do you do? (кто ты по профессии) и What are you doing? (чем занят сейчас) — два разных вопроса с разными ответами.',
    quiz: [
      {
        q: 'What ___ this weekend? — Going to the mountains.',
        options: ['do you do', 'are you doing', 'will you do'],
        answer: 1,
        why: 'Личный план на ближайшее время — Present Continuous.',
      },
      {
        q: 'This soup ___ great.',
        options: ['is tasting', 'tastes', 'has tasted'],
        answer: 1,
        why: 'taste как свойство («на вкус») — глагол состояния, континиус не строится.',
      },
    ],
  },
  {
    id: 'en-future-will-going-to',
    chapter: 'Система времён',
    level: 'B1',
    form: 'will / going to / am doing',
    title: 'Будущее: решение, план, договорённость',
    short: 'Одно русское «буду» — три английские формы с разной историей решения',
    attach: 'к глаголу',
    rule: `Английский выбирает форму будущего по тому, КОГДА принято решение. Will — решение рождается в момент речи: телефон звонит — I’ll get it. Также will берёт обещания, предложения помощи и предсказания «из головы» (I think it will rain). Going to — решение уже принято, есть намерение: We are going to redesign the onboarding — это в планах. Present Continuous — договорённость с конкретикой, обычно со временем и людьми: I am meeting Anna at six — в календаре стоит.

У going to есть второе значение — предсказание по видимым признакам: Look at those clouds — it’s going to rain. Разница с will: will предсказывает из мнения, going to — из улик.

Границы мягкие: между going to и Present Continuous для планов часто можно выбрать любую. Жёсткая граница одна: спонтанная реакция — только will. Официант принял заказ: I’ll have the soup, а не I’m going to have — за столом решение принимается на месте.`,
    examples: [
      { text: 'The phone’s ringing. — I’ll answer it.', ru: 'Телефон звонит. — Я возьму.', when: 'Решение в момент речи — только will.' },
      { text: 'We are going to migrate to the new API next quarter.', ru: 'В следующем квартале мы переходим на новый API.', when: 'Намерение уже принято — going to.' },
      { text: 'I am flying to Berlin on Tuesday.', ru: 'Во вторник я лечу в Берлин.', when: 'Билет куплен — договорённость, Present Continuous.' },
      { text: 'Careful, you are going to drop it!', ru: 'Осторожно, сейчас уронишь!', when: 'Предсказание по видимым признакам.' },
      { text: 'I think remote work will become the norm.', ru: 'Думаю, удалёнка станет нормой.', when: 'Предсказание-мнение: I think / probably + will.' },
      { text: 'Don’t worry, I won’t tell anyone.', ru: 'Не волнуйся, я никому не скажу.', when: 'Обещание — will.' },
      { text: 'This bag is heavy. — I’ll help you.', ru: 'Сумка тяжёлая. — Давай помогу.', when: 'Предложение помощи рождается на месте.' },
      { text: 'What are you doing on Friday night?', ru: 'Что ты делаешь в пятницу вечером?', when: 'Вопрос о планах — континиус.' },
      { text: 'She is going to apply for the senior role.', ru: 'Она собирается подаваться на сеньорскую роль.', when: 'Намерение, о котором она уже рассказала.' },
      { text: 'The meeting starts at 10.', ru: 'Встреча начинается в десять.', when: 'Расписание — Present Simple, четвёртый способ будущего.' },
    ],
    pitfall: 'Русскоязычный ставит will на всё будущее подряд, потому что «буду» одно. Хуже всего это звучит в планах: I will meet my friend tomorrow подаёт договорённость как только что принятое решение. План с конкретикой — I’m meeting a friend tomorrow.',
    contrast: [
      { with: 'en-future-continuous-perfect', note: 'will do — само событие; will be doing / will have done — процесс в момент будущего и итог к сроку.' },
    ],
    quiz: [
      {
        q: 'В ресторане: OK, I ___ the steak, please.',
        options: ['am going to have', 'will have', 'am having'],
        answer: 1,
        why: 'Решение принято на месте, при официанте — спонтанный выбор берёт will.',
      },
      {
        q: 'Look at the queue! We ___ for an hour.',
        options: ['will wait', 'are going to wait', 'wait'],
        answer: 1,
        why: 'Предсказание по видимой улике (очередь) — going to.',
      },
    ],
  },
  {
    id: 'en-future-continuous-perfect',
    chapter: 'Система времён',
    level: 'B2',
    form: 'will be doing / will have done',
    title: 'Future Continuous и Future Perfect',
    short: 'Буду в процессе — и будет сделано к сроку',
    attach: 'к глаголу',
    rule: `Future Continuous — процесс, который будет идти в названный момент будущего: This time tomorrow I’ll be flying to Lisbon. Момент попадает в середину действия, а не в его начало.

Второе, очень частое употребление — «будущее по ходу вещей»: событие случится само собой, без специального решения. I’ll be passing the post office anyway — я всё равно буду проходить мимо. Отсюда же сверхвежливый вопрос о планах: Will you be using the projector? — я не прошу освободить, я просто узнаю ход вещей.

Future Perfect — итог к сроку: By Friday we will have finished the testing. Обязательный спутник — точка отсчёта с by: by Friday, by the end of the year, by then. Континиус-вариант тянет длительность к будущей точке: By June I will have been working here for five years.

Обе формы в русском отсутствуют, а по-английски заменить их нечем: «к пятнице закончим» без will have + by звучит как простое обещание, теряя смысл «к сроку».`,
    examples: [
      { text: 'This time next week I’ll be lying on a beach.', ru: 'Через неделю в это время я буду лежать на пляже.', when: 'Момент внутри будущего процесса.' },
      { text: 'Don’t call at nine — I’ll be driving.', ru: 'Не звони в девять — я буду за рулём.', when: 'Процесс перекрывает названное время.' },
      { text: 'Will you be going past a pharmacy?', ru: 'Ты будешь проходить мимо аптеки?', when: 'Вежливая разведка планов перед просьбой.' },
      { text: 'I’ll be seeing Tom tomorrow anyway, so I can pass it on.', ru: 'Я всё равно завтра увижусь с Томом — передам.', when: 'Событие по ходу вещей, без отдельного решения.' },
      { text: 'By the end of the sprint we will have closed all the tickets.', ru: 'К концу спринта мы закроем все тикеты.', when: 'Итог к сроку — Future Perfect + by.' },
      { text: 'She will have left by the time you arrive.', ru: 'К твоему приходу она уже уйдёт.', when: 'by the time + настоящее в придаточном.' },
      { text: 'By 2030 the company will have doubled in size.', ru: 'К 2030 году компания вырастет вдвое.', when: 'Прогноз-итог в презентации.' },
      { text: 'In March I will have been living here for ten years.', ru: 'В марте будет десять лет, как я здесь живу.', when: 'Future Perfect Continuous: длительность к будущей точке.' },
      { text: 'Will you be needing anything else?', ru: 'Вам ещё что-нибудь понадобится?', when: 'Формула вежливости персонала — континиус смягчает.' },
      { text: 'At 3 pm the team will be presenting to the board.', ru: 'В три команда будет выступать перед советом.', when: 'Расписание процесса на конкретный час.' },
    ],
    pitfall: 'Русскоязычный передаёт «к пятнице сделаем» как We will finish it by Friday — грамматично, но теряется гарантия завершённости к точке. We will have finished by Friday прямо говорит: в пятницу это уже будет лежать готовым. В дедлайновых письмах различие читается.',
    quiz: [
      {
        q: 'By the time the CEO arrives, we ___ the room.',
        options: ['will prepare', 'will have prepared', 'will be preparing'],
        answer: 1,
        why: 'by the time задаёт срок, к которому нужен итог — Future Perfect.',
      },
      {
        q: 'Зачем спрашивать «Will you be using the car tonight?» вместо «Will you use…»?',
        options: ['Это формальнее по правилам этикета', 'Континиус подаёт вопрос как разведку планов, а не давление', 'Разницы нет'],
        answer: 1,
        why: 'Future Continuous спрашивает о естественном ходе вещей — собеседник не чувствует, что у него что-то просят.',
      },
    ],
  },
  {
    id: 'en-used-to-would',
    chapter: 'Система времён',
    level: 'B2',
    form: 'used to / would',
    title: 'Былые привычки: used to и would',
    short: 'Раньше было — а теперь нет',
    attach: 'к инфинитиву без to / с to у used',
    rule: `Used to + инфинитив — то, что было регулярным или верным раньше и прекратилось: I used to smoke. Форма сама содержит «а теперь нет», поэтому добавлять «but now I don’t» не нужно. Работает и с действиями, и с состояниями: I used to have long hair, There used to be a cinema here.

Would делает то же для повторявшихся ДЕЙСТВИЙ в воспоминаниях: Every summer we would go to the lake. Ограничение жёсткое: would не берёт состояния. I would live in a village или I would have a dog — ошибка; для состояний только used to. Поэтому надёжная стратегия рассказа: открыть сцену через used to, продолжить деталями через would.

Вопрос и отрицание строятся через did: Did you use to…? / I didn’t use to… (без -d). Наконец, не путать с оборотом be used to doing — «привыкший к» (см. отдельную карточку): формы похожи, смыслы не пересекаются.`,
    examples: [
      { text: 'I used to work night shifts.', ru: 'Раньше я работал в ночные смены.', when: 'Прекратившаяся регулярность.' },
      { text: 'There used to be a bakery on this corner.', ru: 'На этом углу раньше была пекарня.', when: 'Былое состояние места.' },
      { text: 'She used to be afraid of flying.', ru: 'Она раньше боялась летать.', when: 'Состояние — только used to, не would.' },
      { text: 'Every Friday my grandfather would tell us stories.', ru: 'Каждую пятницу дед рассказывал нам истории.', when: 'Повторявшееся действие в тёплом воспоминании.' },
      { text: 'We would spend hours drawing on the pavement.', ru: 'Мы часами рисовали на асфальте.', when: 'Детали сцены после того, как рамка задана.' },
      { text: 'Did you use to play any instruments?', ru: 'Ты раньше играл на каких-нибудь инструментах?', when: 'Вопрос — через did + use to без -d.' },
      { text: 'I didn’t use to like olives.', ru: 'Раньше я не любил оливки.', when: 'Отрицание: didn’t use to.' },
      { text: 'He used to be my manager — now we’re peers.', ru: 'Он был моим руководителем — теперь мы на равных.', when: 'Смена ролей: контраст «тогда/теперь» встроен в форму.' },
      { text: 'As a junior, I would double-check every single line.', ru: 'Джуниором я перепроверял каждую строчку.', when: 'Рассказ о прежних рабочих привычках.' },
      { text: 'I lived in Kazan for three years.', ru: 'Я прожил в Казани три года.', when: 'С точным сроком — обычный Past Simple, не used to.' },
    ],
    pitfall: 'Would для состояний: When I was a kid, I would have a bike — ошибка, have здесь состояние, нужно used to have. И наоборот: used to с указанием точного количества раз (I used to visit Rome twice) не работает — конкретный счёт берёт Past Simple.',
    contrast: [
      { with: 'en-be-get-used-to', note: 'used to do — былая привычка; be used to doing — привычность сейчас. Совпадение букв случайно.' },
    ],
    quiz: [
      {
        q: 'When we were students, we ___ a tiny flat near the station.',
        options: ['would rent', 'used to rent', 'оба верны'],
        answer: 1,
        why: 'Долгое состояние-обстоятельство (снимали и жили) — would так не может, только used to.',
      },
      {
        q: 'Как спросить «Ты раньше носил очки?»',
        options: ['Did you used to wear glasses?', 'Did you use to wear glasses?', 'Would you wear glasses?'],
        answer: 1,
        why: 'После did — use без -d, как у любого глагола после вспомогательного.',
      },
    ],
  },
  {
    id: 'en-be-get-used-to',
    chapter: 'Система времён',
    level: 'B2',
    form: 'be used to / get used to + -ing',
    title: 'Привыкший и привыкающий',
    short: 'be used to — уже норма, get used to — процесс привыкания',
    attach: 'к существительному или герундию',
    rule: `Be used to + существительное/-ing — «для меня это привычно, нормально»: I am used to early mornings — ранние подъёмы меня не пугают. Get used to — процесс привыкания: I am getting used to the new codebase — ещё привыкаю. Get отмечает переход, be — достигнутое состояние.

Главная механика, о которую все спотыкаются: to здесь ПРЕДЛОГ, а не частица инфинитива, поэтому после него — существительное или герундий, никогда не голый глагол. I am used to working remotely, а не to work remotely.

Форма склоняется по всем временам через be/get: was used to, will get used to, has got used to. You’ll get used to it — «привыкнешь» — одна из самых частотных утешительных фраз языка.

С used to do (былая привычка, отдельная карточка) не путать: I used to work nights — раньше работал по ночам (а теперь нет); I am used to working nights — работать по ночам мне привычно (возможно, прямо сейчас).`,
    examples: [
      { text: 'I’m used to giving presentations.', ru: 'Мне не привыкать выступать с презентациями.', when: 'Достигнутая привычность — спокойная уверенность.' },
      { text: 'She isn’t used to criticism.', ru: 'Она не привыкла к критике.', when: 'be used to + существительное.' },
      { text: 'It took me a month to get used to the time difference.', ru: 'Я месяц привыкал к разнице во времени.', when: 'Процесс с измеренной длительностью.' },
      { text: 'You’ll get used to the accent.', ru: 'К акценту привыкнешь.', when: 'Утешение новичку — will get used to.' },
      { text: 'I’m slowly getting used to standing up during standups.', ru: 'Понемногу привыкаю стоять на стендапах.', when: 'Процесс в разгаре — континиус.' },
      { text: 'He’s used to being the smartest person in the room.', ru: 'Он привык быть самым умным в комнате.', when: 'be used to + being — состояние как привычка.' },
      { text: 'We got used to the noise after a week.', ru: 'Через неделю мы привыкли к шуму.', when: 'Завершившийся переход — Past Simple от get.' },
      { text: 'I’m not used to driving on the left.', ru: 'Я не привык ездить по левой стороне.', when: 'Классика переезда — «пока непривычно».' },
      { text: 'She never got used to the open office.', ru: 'Она так и не привыкла к опенспейсу.', when: 'Переход не состоялся — never got used to.' },
      { text: 'You get used to reading legal English quite fast.', ru: 'К юридическому английскому привыкаешь довольно быстро.', when: 'Обобщение об опыте — настоящее от get.' },
    ],
    pitfall: 'После used to здесь тянет поставить инфинитив: I am used to work late. Но to — предлог: только I am used to working late. Проверка: замените действие существительным (I am used to hard work) — если фраза устояла, это be used to, и глагол пойдёт в -ing.',
    contrast: [
      { with: 'en-used-to-would', note: 'used to work — раньше работал (прошлое); am used to working — работать привычно (настоящее).' },
    ],
    quiz: [
      {
        q: 'After two years abroad, I’m used to ___ everything twice.',
        options: ['explain', 'explaining', 'explained'],
        answer: 1,
        why: 'to здесь предлог, после предлога глагол стоит в герундии.',
      },
      {
        q: '«Я ещё привыкаю к новой команде» —',
        options: ['I used to the new team.', 'I’m getting used to the new team.', 'I get used to the new team.'],
        answer: 1,
        why: 'Процесс идёт сейчас — am getting used to. Голое get used to описывало бы обобщение, а used to без be вовсе о прошлом.',
      },
    ],
  },

  // ─── Косвенная речь ────────────────────────────────────────────────────────
  {
    id: 'en-reported-speech',
    chapter: 'Косвенная речь',
    level: 'B1',
    form: 'She said (that) she was…',
    title: 'Косвенная речь и сдвиг времён',
    short: 'Пересказ съезжает на шаг в прошлое',
    attach: 'к придаточному после said / told',
    rule: `Пересказывая чужие слова после said/told в прошедшем, английский сдвигает время придаточного на шаг назад: am → was, do → did, did/have done → had done, will → would, can → could. “I am tired” → She said she was tired. Заодно съезжают указатели: this → that, here → there, today → that day, tomorrow → the next day, yesterday → the day before.

Сдвига нет, если вводящий глагол в настоящем (She says she is tired) — так пересказывают свежие сообщения. Сдвиг необязателен, когда сказанное всё ещё верно: He said the office is in Belgrade — офис и сейчас там. Но сдвинуть в этом случае не ошибка, а вот НЕ сдвинуть про уже неверное — ошибка.

Вопросы в пересказе теряют вопросительный порядок слов и do: “Where do you live?” → He asked where I lived. Общий вопрос цепляется через if/whether: He asked if I was free. Просьбы и приказы уходят в инфинитив: She told me to wait, She asked me not to be late.

Say и tell различаются валентностью: say слова (said that…), tell — человеку (told me that…). Told that без адресата — ошибка.`,
    table: {
      head: ['Прямая речь', 'Пересказ'],
      rows: [
        ['am / is / are', 'was / were'],
        ['do / does', 'did'],
        ['did, have done', 'had done'],
        ['will', 'would'],
        ['can', 'could'],
        ['must', 'had to'],
        ['today / tomorrow / yesterday', 'that day / the next day / the day before'],
      ],
    },
    examples: [
      { text: 'She said she was busy.', ru: 'Она сказала, что занята.', when: 'am → was: базовый сдвиг.' },
      { text: 'He told me he had sent the invoice.', ru: 'Он сказал мне, что отправил счёт.', when: 'have sent → had sent, и told с адресатом.' },
      { text: 'They said they would call back.', ru: 'Они сказали, что перезвонят.', when: 'will → would.' },
      { text: 'She asked where the meeting room was.', ru: 'Она спросила, где переговорка.', when: 'Вопрос теряет инверсию: where the room WAS.' },
      { text: 'He asked if I could share my screen.', ru: 'Он спросил, могу ли я расшарить экран.', when: 'Общий вопрос через if.' },
      { text: 'The manager told us to update the docs.', ru: 'Менеджер велел нам обновить документацию.', when: 'Приказ → told + инфинитив.' },
      { text: 'She asked me not to mention the budget.', ru: 'Она попросила меня не упоминать бюджет.', when: 'Отрицательная просьба: not to + глагол.' },
      { text: 'He says the release is on Friday.', ru: 'Он говорит, релиз в пятницу.', when: 'Вводящий глагол в настоящем — сдвига нет.' },
      { text: 'She said the server is still down.', ru: 'Она сказала, что сервер всё ещё лежит.', when: 'Верно до сих пор — сдвиг необязателен.' },
      { text: 'He said he had seen the bug the day before.', ru: 'Он сказал, что видел баг накануне.', when: 'yesterday → the day before.' },
    ],
    pitfall: 'Русский времена в пересказе не сдвигает («он сказал, что занят»), поэтому He said he IS busy сыплется автоматически. Вторая ловушка — порядок слов в пересказанном вопросе: She asked where was the office — ошибка, инверсия остаётся только в настоящем вопросе: where the office was.',
    contrast: [
      { with: 'en-reporting-verbs', note: 'said/told — нейтральный пересказ; suggest/deny/insist упаковывают ещё и характер сказанного.' },
    ],
    quiz: [
      {
        q: '“I will finish it tomorrow.” → He said he ___ it ___.',
        options: ['will finish / tomorrow', 'would finish / the next day', 'would finish / tomorrow'],
        answer: 1,
        why: 'will → would, и tomorrow пересказа — это the next day.',
      },
      {
        q: '“Where is the station?” → She asked ___.',
        options: ['where was the station', 'where the station was', 'where is the station'],
        answer: 1,
        why: 'В пересказанном вопросе прямой порядок слов: подлежащее перед глаголом.',
      },
    ],
  },
  {
    id: 'en-reporting-verbs',
    chapter: 'Косвенная речь',
    level: 'B2',
    form: 'suggest / deny / insist / admit…',
    title: 'Глаголы пересказа и их паттерны',
    short: 'Не «сказал», а «предложил, отрицал, настоял» — каждый со своей конструкцией',
    attach: 'к герундию, инфинитиву или придаточному — по глаголу',
    rule: `Пересказывать всё через said — как красить всё одним цветом. Reporting verbs упаковывают характер сказанного: suggest (предложил), deny (отрицал), admit (признал), insist (настоял), refuse (отказался), promise, warn, accuse, apologise. Проблема в том, что конструкцию каждый глагол выбирает сам, и по-русски её не угадать.

Три больших паттерна. С герундием: suggest doing, deny doing, admit doing, apologise for doing. С инфинитивом: refuse to do, promise to do, offer to do, agree to do. С дополнением и инфинитивом: warn somebody not to do, advise somebody to do, remind somebody to do.

Самый коварный — suggest: он НЕ берёт инфинитив с дополнением. «Он предложил мне подать заявку» — He suggested that I apply / He suggested applying, но никогда He suggested me to apply. После suggest/insist/demand в придаточном живёт голый инфинитив без to и без -s (subjunctive): She insisted that he come — это не опечатка.

Отглагольные пары с предлогами тоже фиксированы: accuse somebody OF doing, blame somebody FOR doing, apologise TO somebody FOR doing.`,
    table: {
      head: ['Паттерн', 'Глаголы', 'Пример'],
      rows: [
        ['+ doing', 'suggest, deny, admit, recommend', 'He denied breaking the build.'],
        ['+ to do', 'refuse, promise, offer, agree, threaten', 'She offered to help.'],
        ['+ smb + to do', 'advise, warn, remind, persuade', 'They warned us not to deploy on Friday.'],
        ['+ that + subjunctive', 'suggest, insist, demand, recommend', 'I suggest that he take the course.'],
        ['+ preposition + doing', 'apologise for, accuse of, blame for', 'He apologised for being late.'],
      ],
    },
    examples: [
      { text: 'She suggested splitting the task in two.', ru: 'Она предложила разбить задачу надвое.', when: 'suggest + герундий — базовый паттерн.' },
      { text: 'He suggested that we hire a contractor.', ru: 'Он предложил нам нанять подрядчика.', when: 'suggest + that — когда важно, кому делать.' },
      { text: 'The developer denied deleting the branch.', ru: 'Разработчик отрицал, что удалил ветку.', when: 'deny + doing — отрицание поступка.' },
      { text: 'She admitted making a mistake in the estimate.', ru: 'Она признала, что ошиблась в оценке.', when: 'admit + doing — признание.' },
      { text: 'He refused to sign the contract.', ru: 'Он отказался подписывать контракт.', when: 'refuse + to do.' },
      { text: 'They promised to send the feedback by Monday.', ru: 'Они пообещали прислать отзыв к понедельнику.', when: 'promise + to do.' },
      { text: 'The lawyer advised us to read the clause carefully.', ru: 'Юрист посоветовал нам внимательно прочесть пункт.', when: 'advise + smb + to do.' },
      { text: 'She reminded me to renew the certificate.', ru: 'Она напомнила мне продлить сертификат.', when: 'remind + smb + to do.' },
      { text: 'He insisted that the demo be recorded.', ru: 'Он настоял, чтобы демо записали.', when: 'insist + that + голый инфинитив (be, не is).' },
      { text: 'They accused the vendor of hiding the costs.', ru: 'Они обвинили подрядчика в сокрытии расходов.', when: 'accuse OF doing — предлог фиксирован.' },
      { text: 'I apologise for taking so long to reply.', ru: 'Прошу прощения, что так долго отвечал.', when: 'apologise for doing — рабочая переписка.' },
    ],
    pitfall: 'He suggested me to go — ошибка номер один: русское «предложил мне сделать» подталкивает к инфинитиву с дополнением, которого у suggest нет. Только suggested going / suggested that I go. Тот же капкан у recommend.',
    quiz: [
      {
        q: '«Она предложила нам перенести встречу» —',
        options: ['She suggested us to move the meeting.', 'She suggested moving the meeting.', 'She suggested to move the meeting.'],
        answer: 1,
        why: 'suggest берёт герундий (или that-придаточное), но не инфинитив и не «smb to do».',
      },
      {
        q: 'He denied ___ the file.',
        options: ['to delete', 'deleting', 'delete'],
        answer: 1,
        why: 'deny — из группы глаголов с герундием: denied doing.',
      },
    ],
  },

  // ─── Условные и нереальное ─────────────────────────────────────────────────
  {
    id: 'en-conditionals-01',
    chapter: 'Условные и нереальное',
    level: 'B1',
    form: 'if + present, will / present',
    title: 'Условные 0 и 1: реальные условия',
    short: 'Законы природы и реальные планы — и никакого will после if',
    attach: 'к паре предложений с if',
    unit: 'endc-19',
    rule: `Zero conditional — закономерность, верная всегда: if + Present Simple, Present Simple. If you heat ice, it melts. Сюда же инструкции: If the build fails, check the logs.

First conditional — реальная перспектива: if + Present Simple, will + инфинитив. If we ship on Friday, we will get feedback over the weekend. Главное правило, нарушаемое русскоязычными десятилетиями: после if будущее НЕ ставится. «Если он придёт» — if he comes, не if he will come. То же после when, until, as soon as, before, after в значении будущего: I’ll call you when I arrive.

Вместо will в главной части может стоять модальный или императив: If the tests pass, you can merge. If anything changes, let me know.

Первый кондиционал — язык оговорок в рабочих договорённостях: If the scope grows, the deadline will move — вежливая, но твёрдая фиксация условий, незаменимая при обсуждении тестовых заданий и контрактов.`,
    examples: [
      { text: 'If you press this button, the export starts.', ru: 'Если нажать эту кнопку, начнётся экспорт.', when: 'Zero: так работает всегда.' },
      { text: 'If it rains, the event will move indoors.', ru: 'Если пойдёт дождь, мероприятие перенесут в помещение.', when: 'First: реальный план Б.' },
      { text: 'If he calls, tell him I’m in a meeting.', ru: 'Если он позвонит, скажи, что я на встрече.', when: 'Императив в главной части.' },
      { text: 'I’ll send the files as soon as they’re ready.', ru: 'Пришлю файлы, как только будут готовы.', when: 'as soon as + настоящее, не will.' },
      { text: 'If we don’t hurry, we’ll miss the train.', ru: 'Если не поторопимся, опоздаем на поезд.', when: 'Отрицание в условии.' },
      { text: 'If the client approves the design, we’ll start development.', ru: 'Если клиент утвердит дизайн, начнём разработку.', when: 'Рабочая договорённость с условием.' },
      { text: 'You can leave early if you finish the report.', ru: 'Можешь уйти пораньше, если закончишь отчёт.', when: 'can вместо will; if-часть может идти второй.' },
      { text: 'If the scope changes, the estimate will change too.', ru: 'Если объём изменится, оценка тоже изменится.', when: 'Оговорка в переговорах о тестовом задании.' },
      { text: 'When the invoice arrives, I’ll forward it to you.', ru: 'Когда придёт счёт, перешлю его тебе.', when: 'when о будущем — тоже без will.' },
      { text: 'Unless we hear otherwise, we’ll proceed as planned.', ru: 'Если не будет других указаний, действуем по плану.', when: 'unless = if not (см. отдельную карточку).' },
    ],
    pitfall: 'If he will come… — калька с русского «если он придёт», где будущее видно в глаголе. По-английски будущность условия выражает сама рамка if, и will в ней лишний. Редкое исключение — will как «соизволит»: If you will follow me… — но это вежливая формула, а не время.',
    contrast: [
      { with: 'en-conditionals-23', note: '0–1 — реальные сценарии; 2–3 — воображаемые и упущенные.' },
      { with: 'en-unless-provided', note: 'unless, provided, as long as — те же реальные условия с другой упаковкой.' },
    ],
    quiz: [
      {
        q: 'I’ll review the PR when I ___ back.',
        options: ['will get', 'get', 'got'],
        answer: 1,
        why: 'when о будущем ведёт себя как if: настоящее время вместо will.',
      },
      {
        q: 'If the demo ___, we’ll roll back.',
        options: ['will crash', 'crashes', 'crashed'],
        answer: 1,
        why: 'Реальное условие: if + Present Simple, will живёт только в главной части.',
      },
    ],
  },
  {
    id: 'en-conditionals-23',
    chapter: 'Условные и нереальное',
    level: 'B2',
    form: 'if + past, would / if + had done, would have',
    title: 'Условные 2 и 3: воображаемое и упущенное',
    short: 'Нереальное сейчас и непоправимое тогда',
    attach: 'к паре предложений с if',
    unit: 'endc-20',
    rule: `Second conditional — воображаемая ситуация в настоящем или будущем: if + Past Simple, would + инфинитив. If I had more time, I would learn to draw. Past Simple здесь не о прошлом — это маркер нереальности. Отсюда were для всех лиц в аккуратной речи: If I were you, I would take the offer.

Third conditional — упущенное прошлое: if + Past Perfect, would have + причастие. If we had tested earlier, we would have caught the bug — не тестировали и не поймали, всё уже случилось. Это грамматика разбора полётов: сожаления, ретроспективы, «что было бы, если».

Выбор между первым и вторым кондиционалом — это выбор оценки шансов, а не грамматики: If I get the job… (реально жду ответа) против If I got the job… (мечтаю вслух). На переговорах второй кондиционал мягче давит: I would be looking for something around 70k звучит как рассуждение, а не требование — ровно поэтому торг о зарплате ведут в would.

Вместо would встречаются could и might: If we refactored this, we could reuse it elsewhere.`,
    examples: [
      { text: 'If I were you, I would ask for feedback.', ru: 'На твоём месте я бы попросил отзыв.', when: 'Формула совета: if I were you.' },
      { text: 'If we had a bigger team, we would ship faster.', ru: 'Будь у нас команда побольше, мы бы выпускали быстрее.', when: 'Нереальное настоящее: команды нет.' },
      { text: 'What would you do if the client rejected everything?', ru: 'Что бы ты делал, если бы клиент всё отверг?', when: 'Гипотетический вопрос на собеседовании.' },
      { text: 'If I won the lottery, I would open a studio.', ru: 'Выиграй я в лотерею, открыл бы студию.', when: 'Мечта вслух — шансы не обсуждаются.' },
      { text: 'If we had started a week earlier, we would have made the deadline.', ru: 'Начни мы неделей раньше, успели бы к сроку.', when: 'Третий: разбор упущенного.' },
      { text: 'If you had told me, I would have helped.', ru: 'Если бы ты сказал, я бы помог.', when: 'Мягкий упрёк задним числом.' },
      { text: 'She would have got the role if she had applied.', ru: 'Она получила бы роль, если бы подалась.', when: 'Главная часть может идти первой.' },
      { text: 'If the API hadn’t changed, nothing would have broken.', ru: 'Если бы API не поменялся, ничего бы не сломалось.', when: 'Отрицание в условии третьего.' },
      { text: 'I would be looking for a senior position.', ru: 'Я рассматривал бы сеньорскую позицию.', when: 'would смягчает требование на переговорах.' },
      { text: 'If we dropped this feature, we could launch in May.', ru: 'Откажись мы от этой фичи, могли бы запуститься в мае.', when: 'could вместо would: возможность, не уверенность.' },
    ],
    pitfall: 'Would в if-части: If I would have time… — устойчивая калька, потому что русское «если бы» стоит в обеих половинах. По-английски нереальность в условии выражает время (had, had done), а would живёт только в главной части.',
    contrast: [
      { with: 'en-mixed-conditionals', note: 'Смешанный тип склеивает прошлое условие с настоящим следствием — см. отдельную карточку.' },
      { with: 'en-wish-unreal-past', note: 'Те же сдвиги времён работают в wish и would rather.' },
    ],
    quiz: [
      {
        q: 'If I ___ about the meeting, I would have joined.',
        options: ['knew', 'had known', 'would know'],
        answer: 1,
        why: 'Упущенное прошлое: if + Past Perfect, would have в главной части.',
      },
      {
        q: 'Почему рекрутёру говорят «I would be open to relocation», а не «I am open»?',
        options: ['Это просто формальнее', 'would подаёт готовность как гипотезу и оставляет простор для торга', 'am — грамматическая ошибка'],
        answer: 1,
        why: 'Второй кондиционал переводит разговор в режим рассуждения: обязательств меньше, гибкости больше. am тоже верно, но это уже твёрдое обещание.',
      },
    ],
  },
  {
    id: 'en-mixed-conditionals',
    chapter: 'Условные и нереальное',
    level: 'C1',
    form: 'if + had done, would do',
    title: 'Смешанные условные',
    short: 'Прошлая причина — настоящее следствие, и наоборот',
    attach: 'к паре предложений с if',
    rule: `Жизнь не делится на «всё в прошлом» и «всё в настоящем»: прошлое решение даёт следствие сейчас. Смешанный кондиционал склеивает половины разных типов. Самый частый вариант — условие из третьего, следствие из второго: If I had taken that job, I would be living in Tokyo now. Не взял тогда — не живу сейчас.

Обратный вариант — настоящее свойство как причина прошлого события: условие из второго, следствие из третьего. If he were more careful, he wouldn’t have deleted the production database. Осторожность — постоянное свойство (второй тип), удаление базы — прошлое событие (третий).

Ориентир простой: каждая половина выбирает форму по СВОЕМУ времени, независимо. Условие о прошлом → had done; условие о настоящем свойстве → Past Simple. Следствие сейчас → would do; следствие тогда → would have done. Слово now в главной части — почти безошибочный маркер смешанного типа.

Это уровень, на котором грамматика перестаёт быть таблицей: вы собираете форму из смысла, а не подставляете шаблон.`,
    examples: [
      { text: 'If I had studied medicine, I would be a doctor now.', ru: 'Если бы я пошёл в медицинский, сейчас был бы врачом.', when: 'Прошлый выбор — настоящее следствие.' },
      { text: 'If we hadn’t missed the flight, we would be in Rome by now.', ru: 'Не опоздай мы на рейс, уже были бы в Риме.', when: 'by now выдаёт смешанный тип.' },
      { text: 'If she had saved the file, she wouldn’t be redoing it now.', ru: 'Сохрани она файл, не переделывала бы сейчас.', when: 'Рабочая досада: причина вчера, боль сегодня.' },
      { text: 'If he were better organised, he wouldn’t have missed the deadline.', ru: 'Будь он собраннее, не сорвал бы дедлайн.', when: 'Настоящее свойство — прошлый провал.' },
      { text: 'If I weren’t afraid of heights, I would have tried skydiving.', ru: 'Не бойся я высоты, попробовал бы прыгнуть.', when: 'Постоянный страх объясняет прошлый отказ.' },
      { text: 'If they had invested in tests, the release would be calmer now.', ru: 'Вложись они в тесты, релиз сейчас шёл бы спокойнее.', when: 'Ретроспектива проекта.' },
      { text: 'If you had gone to bed earlier, you wouldn’t be so tired.', ru: 'Ляг ты раньше, не был бы сейчас таким уставшим.', when: 'Бытовой упрёк: вчерашняя причина.' },
      { text: 'If I spoke French, I would have applied to the Paris office.', ru: 'Говори я по-французски, подался бы в парижский офис.', when: 'Навыка нет вообще — условие второго типа.' },
      { text: 'If we hadn’t pivoted, the company wouldn’t exist today.', ru: 'Без того разворота компании сегодня не было бы.', when: 'История стартапа одной фразой.' },
      { text: 'If he didn’t trust you, he wouldn’t have shared the numbers.', ru: 'Не доверяй он тебе, не поделился бы цифрами.', when: 'Настоящее доверие объясняет прошлый поступок.' },
    ],
    pitfall: 'Выученные «три типа» заставляют выравнивать половины: If I had taken the job, I would have been living in Tokyo now — now при would have been звучит криво. Половины НЕ обязаны совпадать: время каждой выбирается отдельно, по смыслу её собственной части.',
    quiz: [
      {
        q: 'If I ___ the car, I ___ to walk everywhere now.',
        options: ['hadn’t sold / wouldn’t have', 'didn’t sell / wouldn’t have had', 'hadn’t sold / wouldn’t have had'],
        answer: 0,
        why: 'Продажа — прошлое (had sold), ходьба пешком — настоящее (would have to… now): третий + второй.',
      },
      {
        q: 'Какая половина фразы «If she weren’t so stubborn, she would have apologised» о настоящем?',
        options: ['Условие: упрямство — её постоянное свойство', 'Следствие: извинение', 'Обе'],
        answer: 0,
        why: 'weren’t — нереальное настоящее (свойство), would have apologised — несостоявшееся прошлое.',
      },
    ],
  },
  {
    id: 'en-unless-provided',
    chapter: 'Условные и нереальное',
    level: 'B2',
    form: 'unless / provided / as long as / in case',
    title: 'Условные союзы кроме if',
    short: 'Если не, при условии что, на случай если',
    attach: 'к придаточному условия',
    rule: `Unless = if… not: Unless we leave now, we’ll be late = If we don’t leave now… После unless отрицание уже не ставится — unless we don’t leave означало бы двойное «не». И как всякий условный союз, unless не терпит will после себя.

Provided (that), providing, as long as, on condition that — «при условии, что»: условие подчёркнуто как требование. You can use the photos as long as you credit the author. Это язык договорённостей и лицензий: жёстче нейтрального if, но вежливо.

In case — «на всякий случай»: действие делается заранее, до и независимо от того, случится ли условие. Take an umbrella in case it rains — берёшь зонт сейчас, дождя ещё нет. Сравните с if: I’ll open the umbrella if it rains — только когда пойдёт. Русское «если» покрывает оба смысла, английский их разводит жёстко.

Suppose/supposing и what if открывают гипотезу без главной части: What if the client says no? — самостоятельный вопрос-сценарий.`,
    examples: [
      { text: 'Unless the tests pass, we won’t merge.', ru: 'Пока тесты не пройдут, не мёржим.', when: 'unless = if not, без второго отрицания.' },
      { text: 'I’ll take the job unless the salary is too low.', ru: 'Я соглашусь, если только зарплата не окажется слишком низкой.', when: 'Единственное «но» в решении.' },
      { text: 'You can reschedule provided you give us a day’s notice.', ru: 'Перенести можно при условии предупреждения за день.', when: 'provided — условие-требование в правилах.' },
      { text: 'As long as the API stays stable, the app will work.', ru: 'Пока API стабилен, приложение будет работать.', when: 'as long as — длящееся условие.' },
      { text: 'Take my number in case you get lost.', ru: 'Возьми мой номер на случай, если заблудишься.', when: 'in case: действие заранее, до условия.' },
      { text: 'We back up daily in case the server fails.', ru: 'Мы бэкапимся ежедневно на случай падения сервера.', when: 'Предосторожность как процесс.' },
      { text: 'I’ll bring a charger in case yours doesn’t work.', ru: 'Возьму зарядку — вдруг твоя не заработает.', when: 'in case + present о будущем риске.' },
      { text: 'What if the design doesn’t fit the grid?', ru: 'А если дизайн не встанет в сетку?', when: 'what if — гипотеза-вопрос без главной части.' },
      { text: 'Suppose we cut the scope — could we launch in June?', ru: 'Допустим, урежем объём — успеем к июню?', when: 'suppose открывает сценарий для обсуждения.' },
      { text: 'On condition that the fee is paid upfront, we can start Monday.', ru: 'При условии предоплаты можем начать в понедельник.', when: 'Формально-договорной регистр.' },
    ],
    pitfall: 'In case путают с if: I’ll call you in case I’m late в значении «позвоню, если опоздаю» — ошибка, получилось «позвоню заранее, на случай опоздания». Для «если — то тогда» нужен if; in case всегда про подстраховку заранее.',
    contrast: [
      { with: 'en-conditionals-01', note: 'Те же правила времён: настоящее вместо will после любого из этих союзов.' },
    ],
    quiz: [
      {
        q: 'Unless you ___ now, you’ll miss the bus.',
        options: ['don’t leave', 'leave', 'will leave'],
        answer: 1,
        why: 'unless уже содержит «не»: второе отрицание даст обратный смысл, а will после условного союза не ставится.',
      },
      {
        q: '«Запиши адрес — вдруг телефон сядет» —',
        options: ['Write down the address if your phone dies.', 'Write down the address in case your phone dies.', 'Write down the address unless your phone dies.'],
        answer: 1,
        why: 'Действие делается заранее, до и независимо от условия — это in case.',
      },
    ],
  },
  {
    id: 'en-conditional-inversion',
    chapter: 'Условные и нереальное',
    level: 'C1',
    form: 'Had I known… / Should you need… / Were it not for…',
    title: 'Инверсия в условных',
    short: 'Условие без if: вспомогательный глагол выходит вперёд',
    attach: 'к условному придаточному',
    rule: `В формальном письме if можно убрать, выдвинув вспомогательный глагол перед подлежащим. Работают три шаблона. Had + подлежащее + причастие — третий кондиционал: Had I known about the bug, I would have delayed the release (= If I had known). Should + подлежащее + инфинитив — вежливое первое условие: Should you have any questions, feel free to contact me (= If you should have…). Were + подлежащее (+ to-инфинитив) — второй: Were the offer better, I would consider it; Were we to lose this client, the studio would struggle.

Отрицание при инверсии не сокращается: Had I not seen it myself… — hadn’t I вперёд не выносится.

Это регистровый инструмент: в разговоре скажут if, в сопроводительном письме, договоре и деловой рассылке инверсия звучит подтянуто и профессионально. Формула Should you need further information, please do not hesitate… — практически обязательный реквизит делового письма.

Were it not for / Had it not been for + существительное — книжное «если бы не»: Had it not been for her help, we would have failed.`,
    examples: [
      { text: 'Had I known, I would have told you.', ru: 'Знай я — сказал бы.', when: 'Третий кондиционал без if.' },
      { text: 'Should you need anything, my door is open.', ru: 'Понадобится что-то — обращайтесь.', when: 'Вежливое предложение помощи в письме.' },
      { text: 'Should the payment fail, please try another card.', ru: 'Если платёж не пройдёт, попробуйте другую карту.', when: 'Инструкция в формальном интерфейсе.' },
      { text: 'Were I in your position, I would negotiate.', ru: 'Будь я на вашем месте, я бы торговался.', when: 'Формальный вариант if I were you.' },
      { text: 'Were the company to relocate, half the staff would quit.', ru: 'Переедь компания — половина сотрудников уволилась бы.', when: 'were + to-инфинитив: отстранённая гипотеза.' },
      { text: 'Had we tested on real devices, the bug would have surfaced.', ru: 'Тестируй мы на реальных устройствах, баг бы всплыл.', when: 'Ретроспектива инцидента в отчёте.' },
      { text: 'Had it not been for the investor, the startup would have died.', ru: 'Если бы не инвестор, стартап бы погиб.', when: 'Книжное «если бы не».' },
      { text: 'Should you decide to accept, sign both copies.', ru: 'Решите принять предложение — подпишите оба экземпляра.', when: 'Оффер, договор — юридический тон.' },
      { text: 'Had I not backed up the data, everything would have been lost.', ru: 'Не сделай я бэкап — всё бы пропало.', when: 'Отрицание: not после подлежащего, без сокращения.' },
      { text: 'Were it not for deadlines, nothing would ever ship.', ru: 'Если бы не дедлайны, ничего бы никогда не выходило.', when: 'Ироничная сентенция в формальной обёртке.' },
    ],
    pitfall: 'Инверсию делают, оставив if: If had I known… — ошибка. If и инверсия взаимоисключающи: либо If I had known, либо Had I known. И следите за сокращениями: Hadn’t I known — неверно, только Had I not known.',
    contrast: [
      { with: 'en-inversion-emphasis', note: 'Та же механика выноса вспомогательного глагола, но там она даёт эмфазу, а здесь — формальное условие.' },
    ],
    quiz: [
      {
        q: 'Формальный эквивалент «If you should require assistance…» —',
        options: ['Should you require assistance…', 'Required you assistance…', 'You should require assistance…'],
        answer: 0,
        why: 'should выходит перед подлежащим, if уходит: Should you require…',
      },
      {
        q: '___ , the project would have collapsed.',
        options: ['If had not been for her', 'Had it not been for her', 'Hadn’t it been for her'],
        answer: 1,
        why: 'Оборот «если бы не» при инверсии: Had it not been for…, без if и без сокращения отрицания.',
      },
    ],
  },
  {
    id: 'en-wish-unreal-past',
    chapter: 'Условные и нереальное',
    level: 'B2',
    form: 'wish / if only / it’s time / would rather',
    title: 'Wish и нереальное прошедшее',
    short: 'Сожаления и пожелания: время сдвигается назад, как в условных',
    attach: 'к придаточному после wish, if only, it’s time, would rather',
    rule: `После wish время сдвигается на шаг назад, как в условных. О настоящем — Past Simple: I wish I knew the answer (не знаю, а жаль). О прошлом — Past Perfect: I wish I had studied harder (не учился, поздно). О чужом раздражающем поведении — would: I wish you would stop interrupting; про себя would не говорят.

If only — тот же механизм с большей эмоцией: If only I had more time! Как и в условных, аккуратная речь ставит were: I wish I were taller.

It’s (high) time + Past Simple — «пора бы уже»: It’s time we went home. Прошедшее время не о прошлом — оно сигналит, что дело до сих пор не сделано. It’s time to go — нейтральное «пора»; it’s time we went — с ноткой «засиделись».

Would rather + чужое действие тоже берёт Past Simple: I’d rather you didn’t smoke here — вежливый запрет, звучащий как пожелание. Про себя — голый инфинитив: I’d rather stay home.`,
    examples: [
      { text: 'I wish I spoke better English.', ru: 'Жаль, что я не говорю по-английски лучше.', when: 'Сожаление о настоящем — Past Simple.' },
      { text: 'I wish I had accepted that offer.', ru: 'Жаль, что я не принял то предложение.', when: 'Сожаление о прошлом — Past Perfect.' },
      { text: 'I wish you would answer emails faster.', ru: 'Хоть бы ты отвечал на письма побыстрее.', when: 'would — о чужом поведении, с досадой.' },
      { text: 'If only we had started earlier!', ru: 'Эх, начать бы нам раньше!', when: 'if only — эмоциональный пик сожаления.' },
      { text: 'I wish I were on vacation right now.', ru: 'Оказаться бы сейчас в отпуске.', when: 'were для всех лиц в нереальном.' },
      { text: 'It’s time we talked about the budget.', ru: 'Пора бы нам поговорить о бюджете.', when: 'it’s time + прошедшее: разговор назрел.' },
      { text: 'It’s high time he learned to say no.', ru: 'Давно пора ему научиться отказывать.', when: 'high усиливает «засиделись».' },
      { text: 'I’d rather you didn’t mention this at the meeting.', ru: 'Я бы предпочёл, чтобы ты не поднимал это на встрече.', when: 'Вежливый запрет чужого действия.' },
      { text: 'I’d rather work from home on Fridays.', ru: 'По пятницам я предпочёл бы работать из дома.', when: 'О себе — would rather + голый инфинитив.' },
      { text: 'I wish I could help, but I’m swamped.', ru: 'Рад бы помочь, но завален работой.', when: 'wish + could — вежливый отказ.' },
    ],
    pitfall: 'I wish I will/can… — русское «хочу, чтобы» подталкивает к будущему. После wish будущего нет: о настоящем — knew, о прошлом — had known, о раздражающем чужом — would. И не путать с want: wish + придаточное всегда о нереальном.',
    contrast: [
      { with: 'en-conditionals-23', note: 'Тот же сдвиг: нереальное настоящее — Past Simple, нереальное прошлое — Past Perfect.' },
    ],
    quiz: [
      {
        q: 'I wish I ___ to the warning yesterday.',
        options: ['listened', 'had listened', 'would listen'],
        answer: 1,
        why: 'Сожаление о прошлом: wish + Past Perfect.',
      },
      {
        q: 'It’s time we ___ .',
        options: ['go', 'went', 'will go'],
        answer: 1,
        why: 'it’s time + подлежащее берёт Past Simple: дело назрело, а всё ещё не сделано.',
      },
    ],
  },

  // ─── Модальность ───────────────────────────────────────────────────────────
  {
    id: 'en-modals-deduction',
    chapter: 'Модальность',
    level: 'B2',
    form: 'must / may / might / can’t (+ have done)',
    title: 'Модальные как степень уверенности',
    short: 'Наверняка, возможно, не может быть — шкала вместо «наверное»',
    attach: 'к инфинитиву; о прошлом — к have + причастию',
    rule: `Английский выражает уверенность выбором модального, а не вводным словом. Must — логический вывод, «наверняка»: The light is on — she must be home. May / might / could — «возможно», с примерно равной силой: He might be stuck in traffic. Can’t — уверенное «не может быть»: It can’t be John, he’s in Tokyo. Заметьте асимметрию: противоположность must здесь can’t, а не mustn’t (mustn’t — запрет, не вывод).

О прошлом та же шкала строится через have + причастие: must have done — «наверняка сделал», might have done — «возможно, сделал», can’t have done — «не мог сделать». She must have missed the train — вывод о прошлом по сегодняшним уликам.

Should have done стоит особняком: не догадка, а упрёк или сожаление — «следовало сделать (а не сделано)»: We should have backed up the database. Needn’t have done — «зря сделал»: You needn’t have printed it, I have a copy.

Этой шкалой строится анализ багов и инцидентов: The request must have timed out. The cache can’t have updated. Без неё разбор звучит по-русски категорично.`,
    table: {
      head: ['Уверенность', 'Настоящее', 'Прошлое'],
      rows: [
        ['≈95% да', 'must be', 'must have been'],
        ['≈50%', 'may / might / could be', 'may / might / could have been'],
        ['≈95% нет', 'can’t be', 'can’t have been'],
        ['упрёк / сожаление', 'should do (совет)', 'should have done'],
      ],
    },
    examples: [
      { text: 'You’ve been up since five — you must be exhausted.', ru: 'Ты на ногах с пяти — наверняка вымотан.', when: 'Вывод из известного факта.' },
      { text: 'She might be in a meeting, try later.', ru: 'Возможно, она на встрече, попробуй позже.', when: 'Обычное «возможно» без улик.' },
      { text: 'That can’t be right — check the numbers again.', ru: 'Этого не может быть — перепроверь цифры.', when: 'Уверенное отрицание вывода.' },
      { text: 'He must have forgotten about the call.', ru: 'Он наверняка забыл про созвон.', when: 'Вывод о прошлом: не пришёл — забыл.' },
      { text: 'The email may have gone to spam.', ru: 'Письмо могло уйти в спам.', when: 'Вероятная причина в прошлом.' },
      { text: 'She can’t have seen the message — she never reads that chat.', ru: 'Она не могла видеть сообщение — она не читает тот чат.', when: 'Прошлое «не может быть».' },
      { text: 'The deploy must have broken the login.', ru: 'Логин наверняка сломал деплой.', when: 'Разбор инцидента: улики → вывод.' },
      { text: 'We should have tested on Safari.', ru: 'Надо было проверить в Safari.', when: 'Сожаление о несделанном.' },
      { text: 'You needn’t have come so early.', ru: 'Незачем было приходить так рано.', when: 'Сделано зря: needn’t have done.' },
      { text: 'They could have left already — the office is dark.', ru: 'Они, возможно, уже ушли — в офисе темно.', when: 'could have + улика: осторожная догадка.' },
    ],
    pitfall: 'Противоположность must be — can’t be, а русскоязычные тянутся к mustn’t be. Mustn’t — это запрет («нельзя»), в выводах он не участвует: «не может быть, чтобы» — только can’t be / can’t have been.',
    contrast: [
      { with: 'en-modals-obligation', note: 'Тот же must в другой роли: там «обязан», здесь «наверняка». Роль видна по контексту и отрицанию.' },
    ],
    quiz: [
      {
        q: 'The lights are off. They ___ home.',
        options: ['mustn’t be', 'can’t be', 'shouldn’t be'],
        answer: 1,
        why: 'Уверенный вывод «их точно нет» — can’t be. mustn’t — запрет, не догадка.',
      },
      {
        q: '«Она наверняка уже видела макет» —',
        options: ['She must see the layout.', 'She must have seen the layout.', 'She should have seen the layout.'],
        answer: 1,
        why: 'Вывод о прошлом: must + have + причастие. should have — упрёк «следовало».',
      },
    ],
  },
  {
    id: 'en-modals-obligation',
    chapter: 'Модальность',
    level: 'B1',
    form: 'must / have to / should / be supposed to',
    title: 'Обязанность и её оттенки',
    short: 'Обязан, приходится, стоило бы, положено',
    attach: 'к инфинитиву',
    rule: `Must — обязанность, идущая от говорящего или правила, которое он разделяет: I must finish this today (сам так решил). Have to — необходимость извне: I have to wear a badge (так заведено). В повседневной речи have to заметно частотнее; must в утверждениях звучит весомо и встречается больше в написанных правилах.

Критическая асимметрия в отрицании: mustn’t — ЗАПРЕТ (нельзя), don’t have to — ОТСУТСТВИЕ необходимости (можно не делать). You mustn’t tell anyone — секрет; You don’t have to come — приходи по желанию. Перепутать — изменить смысл на противоположный.

Should / ought to — рекомендация: You should ask for a raise. Мягче — might want to. Be supposed to — «положено, ожидается» (и часто с оттенком, что положенное не делается): The reports are supposed to be ready by Friday. Where were you? You were supposed to be at the standup.

У must нет прошедшего и будущего — время выражает have to: had to, will have to. I had to reboot the server twice.`,
    examples: [
      { text: 'I must call my parents more often.', ru: 'Надо мне почаще звонить родителям.', when: 'Обязательство перед собой.' },
      { text: 'Visitors must sign in at reception.', ru: 'Посетители обязаны отметиться на ресепшене.', when: 'Написанное правило — территория must.' },
      { text: 'I have to submit the timesheet every Friday.', ru: 'Мне приходится сдавать табель каждую пятницу.', when: 'Внешнее требование работодателя.' },
      { text: 'You don’t have to attend — the meeting is optional.', ru: 'Можешь не приходить — встреча необязательная.', when: 'Отсутствие необходимости.' },
      { text: 'You mustn’t share the client’s data.', ru: 'Данные клиента разглашать нельзя.', when: 'Запрет — mustn’t.' },
      { text: 'You should get a second opinion.', ru: 'Стоит спросить ещё чьё-то мнение.', when: 'Совет — should.' },
      { text: 'We had to postpone the launch.', ru: 'Нам пришлось отложить запуск.', when: 'Прошлое обязательство — had to.' },
      { text: 'You’ll have to explain this to the board.', ru: 'Тебе придётся объяснить это совету.', when: 'Будущее — will have to.' },
      { text: 'I’m supposed to review PRs within a day.', ru: 'По регламенту я должен ревьюить PR за день.', when: 'be supposed to — ожидание по правилам.' },
      { text: 'He was supposed to send the brief yesterday.', ru: 'Он должен был вчера прислать бриф (и не прислал).', when: 'Невыполненное «положено» — упрёк встроен.' },
    ],
    pitfall: 'You mustn’t do it в значении «можешь не делать» — опасная калька: mustn’t это «запрещено». «Можно не делать» — don’t have to / don’t need to. Проверяйте отрицания обязанности дважды: здесь ошибка меняет вежливое разрешение на приказ.',
    contrast: [
      { with: 'en-modals-deduction', note: 'must be tired — догадка, must work harder — требование: одна форма, две системы.' },
    ],
    quiz: [
      {
        q: 'The entrance is free, so you ___ pay.',
        options: ['mustn’t', 'don’t have to', 'shouldn’t'],
        answer: 1,
        why: '«Платить не нужно» — отсутствие необходимости, don’t have to. mustn’t запретил бы платить.',
      },
      {
        q: '«Мне вчера пришлось задержаться» —',
        options: ['I must have stayed late.', 'I had to stay late.', 'I should have stayed late.'],
        answer: 1,
        why: 'Прошедшее от must-обязанности — had to. must have stayed — догадка, should have — упрёк.',
      },
    ],
  },
  {
    id: 'en-hedging',
    chapter: 'Модальность',
    level: 'C1',
    form: 'tends to / is likely to / arguably / I would say',
    title: 'Hedging: смягчение утверждений',
    short: 'Академическая и деловая привычка не говорить «всегда» и «все»',
    attach: 'к утверждению',
    unit: 'ielt-04',
    rule: `Носитель академического и делового английского почти никогда не утверждает наотмашь. Вместо «Remote work is better» он скажет Remote work tends to be more productive for some tasks. Это не робость, а конвенция: неограждённое обобщение читается как незрелость аргумента — и прямо снижает балл IELTS за Lexical Resource.

Инструменты смягчения по слоям. Глаголы: tend to, seem to, appear to, suggest (The data suggests…). Вероятность: is likely / unlikely to, may well, could. Кванторы вместо абсолютов: most, many, in most cases, to some extent — вместо all, everyone, always. Наречия: arguably, generally, typically, relatively, somewhat. Личная рамка: I would say, it seems to me, as far as I can tell.

В рабочей критике hedging превращает приговор в участие: This might be worth reconsidering вместо This is wrong. I wonder if the contrast is too low вместо The contrast is too low. Смысл сохраняется, у собеседника остаётся пространство ответить.

Мера важна: три смягчителя в одной фразе (It could perhaps possibly be argued…) звучат как уклонение. Один-два на утверждение.`,
    examples: [
      { text: 'Cities tend to attract younger workers.', ru: 'Города, как правило, притягивают молодых работников.', when: 'Обобщение в эссе — tends to вместо «все едут».' },
      { text: 'The delay is likely to affect the budget.', ru: 'Задержка, вероятно, скажется на бюджете.', when: 'Прогноз без гадания: is likely to.' },
      { text: 'This is arguably the strongest part of the design.', ru: 'Это, пожалуй, самая сильная часть дизайна.', when: 'arguably — оценка с местом для спора.' },
      { text: 'The data suggests that users skip this step.', ru: 'Данные указывают на то, что пользователи пропускают этот шаг.', when: 'suggest вместо prove — научная осторожность.' },
      { text: 'It seems to me the scope has grown.', ru: 'Мне кажется, объём работ вырос.', when: 'Личная рамка перед неудобным наблюдением.' },
      { text: 'I would say the second option is safer.', ru: 'Я бы сказал, второй вариант надёжнее.', when: 'Мнение, поданное как рассуждение.' },
      { text: 'This might be worth revisiting.', ru: 'К этому, возможно, стоит вернуться.', when: 'Критика без приговора — код-ревью, дизайн-ревью.' },
      { text: 'I wonder if we’re solving the right problem.', ru: 'Не уверен, что мы решаем ту проблему.', when: 'Сомнение в форме вопроса — мягче некуда.' },
      { text: 'To some extent, the results support the hypothesis.', ru: 'В некоторой мере результаты подтверждают гипотезу.', when: 'Частичное согласие с данными.' },
      { text: 'People generally underestimate long-term costs.', ru: 'Люди обычно недооценивают долгосрочные издержки.', when: 'generally спасает от опровержимого «все всегда».' },
    ],
    pitfall: 'Русская академическая традиция любит категоричность («очевидно, что…», «безусловно»), и её перенос — obviously, of course, everyone knows — в английском эссе и рабочем споре звучит самоуверенно и слабо одновременно. Первое слово для замены: obviously → arguably.',
    quiz: [
      {
        q: 'Какая формулировка уместнее в IELTS-эссе?',
        options: ['All young people are addicted to phones.', 'Many young people tend to overuse their phones.', 'Young people’s phone addiction is obvious.'],
        answer: 1,
        why: 'Квантор many + tend to ограждают обобщение; абсолюты и obvious читаются как слабый аргумент.',
      },
      {
        q: 'Коллега прислал слабый макет. Мягкая критика —',
        options: ['This layout is wrong.', 'I wonder if the layout could be simplified.', 'You must simplify the layout.'],
        answer: 1,
        why: 'Вопросная рамка I wonder if + could сохраняет смысл и оставляет собеседнику выход.',
      },
    ],
  },

  // ─── Пассив ────────────────────────────────────────────────────────────────
  {
    id: 'en-passive-core',
    chapter: 'Пассив',
    level: 'B1',
    form: 'is done / was done / has been done',
    title: 'Пассивный залог: когда важно «что», а не «кто»',
    short: 'be в нужном времени + причастие — и деятель уходит со сцены',
    attach: 'к переходному глаголу',
    unit: 'endc-05',
    rule: `Пассив собирается из be в нужном времени + причастие прошедшего: The site is updated daily. The bug was fixed. The design has been approved. Континиус тоже пассивируется: The issue is being investigated.

Пассив выбирают, когда деятель неизвестен, неважен или очевиден: My bike was stolen (кто — неизвестно), The invoices are sent on the 1st (процесс важнее исполнителя), He was arrested (понятно кем). Добавить деятеля можно через by, но если by-фраза не несёт информации (by someone, by people), её опускают — в этом половина смысла пассива.

В описании процессов пассив — рабочая лошадка: The data is collected, cleaned and stored. Так описывают пайплайны, кейсы в портфолио (the research was conducted, the prototype was tested) и процессы в IELTS Task 1.

Пассив — не «канцелярит по умолчанию»: там, где деятель важен, активный залог короче и честнее. We missed the deadline лучше, чем The deadline was missed, если отчёт пишете вы и пропустили его тоже вы.`,
    examples: [
      { text: 'The office was designed by a local studio.', ru: 'Офис спроектировала местная студия.', when: 'by-фраза оставлена: автор — новость.' },
      { text: 'My application was rejected.', ru: 'Мою заявку отклонили.', when: 'Кем — очевидно и неважно.' },
      { text: 'English is spoken in the office.', ru: 'В офисе говорят по-английски.', when: 'Русское неопределённо-личное «говорят» = пассив.' },
      { text: 'The results will be announced on Friday.', ru: 'Результаты объявят в пятницу.', when: 'Будущий пассив: will be + причастие.' },
      { text: 'The payment system is being migrated this week.', ru: 'Платёжную систему переносят на этой неделе.', when: 'Процесс в разгаре: is being done.' },
      { text: 'The contract has been signed.', ru: 'Контракт подписан.', when: 'Перфектный пассив: результат налицо.' },
      { text: 'The interviews were conducted over two weeks.', ru: 'Интервью проводились две недели.', when: 'Кейс в портфолио: процесс важнее имён.' },
      { text: 'First, the water is filtered and then bottled.', ru: 'Сначала воду фильтруют, затем разливают.', when: 'Описание процесса — IELTS Task 1.' },
      { text: 'You will be contacted by our HR team.', ru: 'С вами свяжется наш HR.', when: 'Формальное письмо кандидату.' },
      { text: 'The meeting has been moved to Thursday.', ru: 'Встречу перенесли на четверг.', when: 'Организационная новость без виновника.' },
    ],
    pitfall: 'Русское «меня спросили / мне сказали» подталкивает к They asked me во всех случаях, а английский спокойно говорит I was asked, I was told, I was offered the job — пассив от глаголов с двумя дополнениями, где подлежащим становится человек. Обратная ловушка: не пассивируйте непереходные глаголы (The accident was happened — ошибка, happen пассива не имеет).',
    contrast: [
      { with: 'en-passive-reporting', note: 'is said to / is believed to — надстройка над пассивом для пересказа мнений.' },
      { with: 'en-have-something-done', note: 'have sth done — «мне сделали»: пассив с заказчиком в подлежащем.' },
    ],
    quiz: [
      {
        q: 'The issue ___ right now.',
        options: ['is investigating', 'is being investigated', 'investigates'],
        answer: 1,
        why: 'Процесс идёт сейчас над подлежащим: пассивный континиус is being + причастие.',
      },
      {
        q: '«Мне предложили работу» —',
        options: ['Me was offered a job.', 'I was offered a job.', 'They offered a job to I.'],
        answer: 1,
        why: 'Человек становится подлежащим пассива: I was offered the job — стандартная формула.',
      },
    ],
  },
  {
    id: 'en-passive-reporting',
    chapter: 'Пассив',
    level: 'C1',
    form: 'is said to / is believed to / It is thought that',
    title: 'Пассив пересказа: be said to…',
    short: '«Говорят, что» без «говорят»: мнение без автора',
    attach: 'к подлежащему + инфинитиву',
    rule: `Для пересказа общего мнения у английского две обезличенные рамки. Первая: It is said/believed/thought/reported that… — It is believed that the company is preparing an IPO. Вторая, более элегантная, поднимает подлежащее из придаточного: The company is believed to be preparing an IPO. Глаголы той же обоймы: is said to, is known to, is expected to, is reported to, is considered to, is estimated to.

Время в инфинитиве двигается независимо: is said to BE — о настоящем; is said to HAVE DONE — о прошлом: He is said to have made his fortune in crypto (говорят сейчас — заработал раньше). is expected to smотрит в будущее: The update is expected to ship in March.

Родня этой рамки — seem/appear и turn out: He seems to have forgotten. The rumour turned out to be true. Механика та же: подлежащее + to-инфинитив нужного времени.

Это регистр новостей, отчётов и академического письма: источник мнения либо неизвестен, либо намеренно размыт. В IELTS Writing обе рамки — готовый способ вводить чужие позиции: It is often argued that…`,
    examples: [
      { text: 'The manuscript is believed to be a forgery.', ru: 'Считается, что рукопись — подделка.', when: 'Общее мнение без автора.' },
      { text: 'He is said to know five languages.', ru: 'Говорят, он знает пять языков.', when: 'Слух о настоящем: to + инфинитив.' },
      { text: 'She is said to have turned down three offers.', ru: 'Говорят, она отклонила три оффера.', when: 'Слух о прошлом: to have + причастие.' },
      { text: 'The damage is estimated to exceed a million euros.', ru: 'Ущерб оценивается более чем в миллион евро.', when: 'Оценка в новостной заметке.' },
      { text: 'The feature is expected to launch next quarter.', ru: 'Ожидается, что фича выйдет в следующем квартале.', when: 'Ожидание — is expected to.' },
      { text: 'It is thought that the settlement dates back to 900 AD.', ru: 'Полагают, что поселение восходит к 900 году.', when: 'Рамка It is thought that — академический текст.' },
      { text: 'It is often argued that remote work weakens teams.', ru: 'Нередко утверждается, что удалёнка ослабляет команды.', when: 'Ввод чужой позиции в эссе.' },
      { text: 'The CEO is reported to be considering resignation.', ru: 'Сообщается, что гендиректор обдумывает отставку.', when: 'Пересказ прессы: is reported to.' },
      { text: 'They appear to have solved the scaling problem.', ru: 'Похоже, они решили проблему масштабирования.', when: 'appear + перфектный инфинитив.' },
      { text: 'The strategy turned out to be a mistake.', ru: 'Стратегия оказалась ошибкой.', when: 'turn out to be — итог вскрылся.' },
    ],
    pitfall: 'Калька «как говорят» — as it is said / how they say — в живом тексте не встречается. Английский встраивает пересказ в глагол: He is said to…, It is believed that… Учитесь узнавать и вторую половину: to have done после is said to — это прошлое, а не перфект «недавности».',
    contrast: [
      { with: 'en-passive-core', note: 'Обычный пассив прячет деятеля действия; пассив пересказа прячет автора мнения.' },
    ],
    quiz: [
      {
        q: '«Говорят, он работал на разведку» —',
        options: ['He is said to work for intelligence.', 'He is said to have worked for intelligence.', 'It said he worked for intelligence.'],
        answer: 1,
        why: 'Мнение сейчас о прошлом факте: is said + to have worked.',
      },
      {
        q: 'The tomb ___ to belong to a merchant family.',
        options: ['believes', 'is believed', 'is believing'],
        answer: 1,
        why: 'Мнение принадлежит не гробнице, а публике: пассив is believed to.',
      },
    ],
  },
  {
    id: 'en-have-something-done',
    chapter: 'Пассив',
    level: 'B2',
    form: 'have / get something done',
    title: 'Have something done: сделали мне',
    short: 'Не сам сделал — организовал, чтобы сделали',
    attach: 'have + дополнение + причастие',
    rule: `I cut my hair — я сам себя постриг. I had my hair cut — меня постригли (в парикмахерской, по моей воле). Каузативная рамка have + объект + причастие означает: организовал услугу, работу выполнил кто-то другой. Русский эту разницу глотает («я постригся», «я починил машину»), английский держит жёстко.

Время меняется на have: I’m having the flat renovated (идёт ремонт), We had the logo redesigned (заказывали), I need to have my eyes tested (пора). Get вместо have — чуть разговорнее: I got the phone fixed.

Второе значение — неприятность, случившаяся с вашим имуществом: He had his car stolen — у него угнали машину. Формально та же рамка, смысл считывается из контекста.

Отдельно: get + причастие без объекта работает как разговорный пассив происшествий и изменений — get hired, get fired, get promoted, get stuck, get injured: She got promoted in March. Это тоже «случилось со мной», но без каузативного «заказал».`,
    examples: [
      { text: 'I had my laptop repaired.', ru: 'Мне починили ноутбук.', when: 'Отнёс в сервис — классика рамки.' },
      { text: 'We’re having the office repainted this weekend.', ru: 'В выходные нам красят офис.', when: 'Процесс организован, идёт сейчас.' },
      { text: 'She has her nails done every two weeks.', ru: 'Она делает маникюр раз в две недели.', when: 'Регулярная услуга.' },
      { text: 'You should have your eyes checked.', ru: 'Тебе стоит проверить зрение.', when: 'Совет об услуге, не о самодеятельности.' },
      { text: 'We got the contract translated by a professional.', ru: 'Мы отдали контракт профессиональному переводчику.', when: 'get — разговорный вариант, by называет исполнителя.' },
      { text: 'They had a new kitchen fitted.', ru: 'Им установили новую кухню.', when: 'Крупный заказ — рамка та же.' },
      { text: 'He had his wallet stolen on the metro.', ru: 'У него в метро украли кошелёк.', when: 'Неприятность с имуществом — вторая жизнь рамки.' },
      { text: 'I need to get this document notarised.', ru: 'Мне нужно заверить этот документ у нотариуса.', when: 'Бюрократическая услуга.' },
      { text: 'She got hired within a week.', ru: 'Её взяли на работу за неделю.', when: 'get + причастие: разговорный пассив событий.' },
      { text: 'Half the team got laid off.', ru: 'Половину команды сократили.', when: 'get fired / laid off — новости занятости.' },
    ],
    pitfall: 'I cut my hair, I built a house — по-русски звучит нормально («постригся», «построил дом»), по-английски означает, что вы лично орудовали ножницами и мастерком. Про услуги — только have/get something done, иначе собеседник понимает буквально.',
    contrast: [
      { with: 'en-passive-core', note: 'The car was fixed — просто пассив; I had the car fixed — пассив с заказчиком в подлежащем.' },
    ],
    quiz: [
      {
        q: '«Я вчера постригся (в салоне)» —',
        options: ['I cut my hair yesterday.', 'I had my hair cut yesterday.', 'My hair cut yesterday.'],
        answer: 1,
        why: 'Услугу выполнил парикмахер: have + объект + причастие.',
      },
      {
        q: 'He ___ during the reorganisation.',
        options: ['got promoted', 'promoted', 'had promoted'],
        answer: 0,
        why: 'Событие случилось с ним: get + причастие — разговорный пассив.',
      },
    ],
  },

  // ─── Артикль и существительное ─────────────────────────────────────────────
  {
    id: 'en-articles-system',
    chapter: 'Артикль и существительное',
    level: 'B1',
    form: 'a / an / the',
    title: 'Артикли как система',
    short: 'a вводит на сцену, the указывает на известное',
    attach: 'перед существительным',
    unit: 'endc-01',
    rule: `Артикль отвечает на один вопрос: может ли слушатель однозначно понять, О КАКОМ именно предмете речь. Может — the; не может (предмет один из многих, впервые назван) — a/an; речь о категории или веществе в целом — часто ничего (см. карточку о нулевом артикле).

Классическая динамика рассказа: предмет входит в текст через a и продолжает жить через the. I saw a dog. The dog was limping. The работает и без предыстории, если предмет единственный в общем поле зрения: the sun, the kitchen (в этой квартире), the CEO (нашей компании), the internet.

A/an живёт только с исчисляемым единственным числом. Отсюда обязательность артикля в конструкциях называния: I am a designer, She works as an analyst, What a day! Профессия без артикля — самая слышимая ошибка русскоязычных.

An — перед гласным ЗВУКОМ, не буквой: an hour, an MVP (эм), но a university (ю), a one-off. Выбор делает произношение.`,
    examples: [
      { text: 'I’m a product designer.', ru: 'Я продуктовый дизайнер.', when: 'Профессия — всегда с a/an.' },
      { text: 'We found a bug. The bug only shows up on iOS.', ru: 'Мы нашли баг. Баг проявляется только на iOS.', when: 'Ввод через a, продолжение через the.' },
      { text: 'Could you open the window?', ru: 'Открой окно, пожалуйста.', when: 'Окно в комнате — общее поле зрения.' },
      { text: 'She’s talking to the CEO.', ru: 'Она разговаривает с гендиректором.', when: 'Единственный в компании — the без предыстории.' },
      { text: 'It takes an hour to get there.', ru: 'Туда добираться час.', when: 'an hour: h немая, звук гласный.' },
      { text: 'He studies at a university in Leeds.', ru: 'Он учится в университете в Лидсе.', when: 'a university: звук [ju] — согласный.' },
      { text: 'This is an MVP, not the final product.', ru: 'Это MVP, а не финальный продукт.', when: 'Аббревиатура читается «эм» — an.' },
      { text: 'The first version was a disaster.', ru: 'Первая версия была катастрофой.', when: 'Порядковые (first, second) притягивают the.' },
      { text: 'A colleague of mine recommended this book.', ru: 'Один мой коллега посоветовал эту книгу.', when: 'Один из многих, слушателю не знаком.' },
      { text: 'The design you sent yesterday looks great.', ru: 'Дизайн, который ты вчера прислал, отличный.', when: 'Определительное придаточное сужает до единственного — the.' },
    ],
    pitfall: 'I am designer, She is manager — ошибка №1: русский профессию артиклем не оформляет, английский требует a/an всегда, когда исчисляемое единственное стоит без другого определителя. Голого исчисляемого единственного числа в английском предложении не бывает вовсе.',
    contrast: [
      { with: 'en-zero-article', note: 'Когда артикля нет и это правильно: school, work, обобщения во множественном — отдельная карточка.' },
    ],
    quiz: [
      {
        q: 'She works as ___ engineer at ___ company you mentioned.',
        options: ['an / the', 'a / a', 'the / the'],
        answer: 0,
        why: 'engineer начинается с гласного звука — an; компания определена придаточным «которую ты упоминал» — the.',
      },
      {
        q: 'Почему a university, но an umbrella?',
        options: ['university — исключение из списка', 'Выбор делает звук: [ju] согласный, [ʌ] гласный', 'Оба варианта допустимы'],
        answer: 1,
        why: 'a/an выбирается по первому ЗВУКУ следующего слова, а не по букве.',
      },
    ],
  },
  {
    id: 'en-zero-article',
    chapter: 'Артикль и существительное',
    level: 'B2',
    form: '∅ (нулевой артикль)',
    title: 'Нулевой артикль',
    short: 'Где отсутствие артикля — само по себе правило',
    attach: 'перед существительным',
    rule: `Отсутствие артикля — не пропуск, а третий артикль со своими законами. Первый закон: обобщения делаются голым множественным или неисчисляемым: Cats are independent. Information wants to be free. Поставить the — сузить до конкретных: The cats are hungry — вот эти, наши.

Второй: учреждения в роли функции идут без артикля: go to school (учиться), be in hospital (лечиться), at work, in prison, go to bed. С the — здание: go to the school (зайти в здание школы, например, за ребёнком). Сюда же: at home, by car, by train, on foot.

Третий: имена собственные в основном без артикля — люди, города, страны (Germany, но the Netherlands, the UK, the USA — множественные и «объединённые»), улицы, парки, аэропорты, озёра, отдельные горы. С the — реки, моря, океаны, горные ЦЕПИ, пустыни, газеты, отели, музеи: the Thames, the Alps, the Guardian, the Louvre.

Четвёртый: приёмы пищи (have breakfast), языки (speak Japanese), виды спорта и предметы (play chess, study economics), транспортные формулы by bus.`,
    table: {
      head: ['Без артикля', 'C the'],
      rows: [
        ['страны: France, Japan', 'the UK, the USA, the Netherlands'],
        ['города, улицы, парки, аэропорты', 'реки, моря: the Thames, the Baltic'],
        ['отдельные горы: Everest', 'горные цепи: the Alps'],
        ['школа как функция: at school', 'здание: at the school'],
        ['языки, спорт, еда: speak French, play chess, have lunch', 'газеты, отели, музеи: the Times, the Ritz'],
      ],
    },
    examples: [
      { text: 'Children learn languages faster than adults.', ru: 'Дети учат языки быстрее взрослых.', when: 'Обобщение о категории — голое множественное.' },
      { text: 'The children are already asleep.', ru: 'Дети уже спят.', when: 'Конкретные, наши — the меняет охват.' },
      { text: 'She’s still at work.', ru: 'Она ещё на работе.', when: 'Работа как функция, не место на карте.' },
      { text: 'He was taken to hospital.', ru: 'Его увезли в больницу.', when: 'Больница как лечение (брит.): без the.' },
      { text: 'I walked to the hospital to visit her.', ru: 'Я дошёл до больницы навестить её.', when: 'Здание, а не лечение — the возвращается.' },
      { text: 'They travelled through Germany and the Netherlands.', ru: 'Они проехали Германию и Нидерланды.', when: 'Страны: обычная без the, «множественная» — с the.' },
      { text: 'We had dinner at a nice place near the Thames.', ru: 'Мы поужинали в приятном месте у Темзы.', when: 'have dinner без артикля; река — с the.' },
      { text: 'She speaks fluent Portuguese.', ru: 'Она свободно говорит по-португальски.', when: 'Языки — без артикля.' },
      { text: 'He went to bed at nine.', ru: 'Он лёг в девять.', when: 'go to bed — постель как функция сна.' },
      { text: 'Life is short.', ru: 'Жизнь коротка.', when: 'Абстракция в целом — the life была бы чьей-то конкретной жизнью.' },
      { text: 'I go to the office by train.', ru: 'Я езжу в офис на электричке.', when: 'by + транспорт — фиксированная безартиклевая формула.' },
    ],
    pitfall: 'Гиперкоррекция: выучив, что артикли важны, русскоязычный расставляет the на обобщения — The life is hard, The cats like fish. Обобщение по-английски голое; the немедленно превращает категорию в конкретные экземпляры, о которых слушатель ничего не знает.',
    contrast: [
      { with: 'en-articles-system', note: 'a/the оформляют конкретные предметы; нулевой — категории, функции и большинство имён.' },
    ],
    quiz: [
      {
        q: '___ money can’t buy ___ happiness.',
        options: ['The / the', '∅ / ∅', 'A / a'],
        answer: 1,
        why: 'Оба слова — неисчисляемые абстракции в обобщении: нулевой артикль.',
      },
      {
        q: 'В чём разница между «She’s in hospital» и «She’s in the hospital»?',
        options: ['Никакой, второй вариант американский', 'Без the — лечится как пациент; с the — просто находится в здании (в брит. норме)', 'Первый вариант — ошибка'],
        answer: 1,
        why: 'Учреждение без артикля означает своё назначение; с the — конкретное здание. (Американская норма чаще держит the и там и там.)',
      },
    ],
  },
  {
    id: 'en-countable-uncountable',
    chapter: 'Артикль и существительное',
    level: 'B1',
    form: 'advice, information, money…',
    title: 'Исчисляемые и неисчисляемые',
    short: 'Почему advices и informations не существуют',
    attach: 'к существительному',
    rule: `Неисчисляемые существительные не имеют множественного числа, не берут a/an и согласуются в единственном: This information IS useful. Проблема в том, что русский считает иначе: советы, новости, деньги, знания — множественные, а их английские переводы — нет. Список столкновений надо знать поимённо: advice, information, news (единственное! the news is…), money, knowledge, research, progress, furniture, equipment, work (работа), traffic, luggage, bread, hair.

Порцию от неисчисляемого отрезает конструкция a piece of: a piece of advice, a piece of news, an item of furniture. Деньги считаются суммами, работа — задачами: three jobs, two tasks.

Многие слова живут в обеих категориях с разными смыслами: a coffee (чашка) — coffee (напиток); a paper (статья, газета) — paper (бумага); a hair (волосок) — hair (волосы); an experience (случай) — experience (опыт); a business (компания) — business (дела); room (место: is there room?) — a room (комната).

От категории зависит вся обвязка: much/little с неисчисляемыми, many/few с исчисляемыми (см. карточку о кванторах).`,
    examples: [
      { text: 'Let me give you some advice.', ru: 'Дам тебе пару советов.', when: 'Никогда an advice и никогда advices.' },
      { text: 'That’s a useful piece of advice.', ru: 'Это полезный совет.', when: 'Один совет = a piece of advice.' },
      { text: 'The news is worse than we thought.', ru: 'Новости хуже, чем мы думали.', when: 'news — единственное число, is.' },
      { text: 'How much is the furniture?', ru: 'Сколько стоит мебель?', when: 'furniture неисчисляемо — much, не many.' },
      { text: 'Her research was published last year.', ru: 'Её исследования опубликовали в прошлом году.', when: 'research без множественного (в обычной речи).' },
      { text: 'We’ve made good progress this sprint.', ru: 'В этом спринте мы хорошо продвинулись.', when: 'progress — неисчисляемое: без a.' },
      { text: 'Two coffees, please.', ru: 'Два кофе, пожалуйста.', when: 'Порции в кафе — исчисляемая ипостась.' },
      { text: 'Working abroad was a great experience.', ru: 'Работа за границей была отличным опытом-приключением.', when: 'an experience — отдельный случай.' },
      { text: 'She has ten years’ experience in UX.', ru: 'У неё десять лет опыта в UX.', when: 'experience-стаж — неисчисляемый.' },
      { text: 'Is there room for one more suitcase?', ru: 'Есть место ещё для одного чемодана?', when: 'room = место: без артикля.' },
      { text: 'My luggage was lost, and it hasn’t been found.', ru: 'Мой багаж потеряли и до сих пор не нашли.', when: 'luggage — единственное: it, не they.' },
    ],
    pitfall: 'Advices, informations, news are, a research, many money — прямые переносы русской исчисляемости. Держите короткий список «ложно-множественных» (advice, information, news, money, knowledge, research, progress, furniture, equipment, luggage) как словарные факты — правилом они не выводятся.',
    contrast: [
      { with: 'en-quantifiers', note: 'much/little идут с неисчисляемыми, many/few — с исчисляемыми.' },
    ],
    quiz: [
      {
        q: 'The information you sent ___ very helpful.',
        options: ['were', 'was', 'have been'],
        answer: 1,
        why: 'information — неисчисляемое, согласуется в единственном: was.',
      },
      {
        q: '«Один совет» по-английски —',
        options: ['an advice', 'a piece of advice', 'one advices'],
        answer: 1,
        why: 'advice не считается напрямую; порцию выделяет a piece of.',
      },
    ],
  },
  {
    id: 'en-quantifiers',
    chapter: 'Артикль и существительное',
    level: 'B1',
    form: 'some / any / much / many / (a) few / (a) little',
    title: 'Кванторы: сколько и какие',
    short: 'Выбор между some и any, few и a few меняет смысл, а не тон',
    attach: 'перед существительным',
    rule: `Some — в утверждениях и в предложениях/просьбах, где ожидается «да»: There are some issues. Would you like some tea? Any — в отрицаниях и открытых вопросах: We don’t have any tickets. Are there any questions? В утверждении any означает «любой»: Take any seat.

Much — с неисчисляемыми, many — с исчисляемыми; оба свободнее всего живут в вопросах и отрицаниях: How much time? Not many people came. В утвердительных чаще берут a lot of / plenty of: We have a lot of work (much work в утверждении звучит книжно).

Пары few/a few и little/a little различаются не количеством, а оценкой. A few / a little — «немного, но есть» (стакан наполовину полон): I have a few ideas. Few / little без артикля — «мало, почти нет» (наполовину пуст): Few people understand this. Одна буква артикля переворачивает тональность фразы.

Усиления: quite a few — «немало» (вопреки виду формулы), very little, so many, too much — «слишком», с встроенной негативной оценкой.`,
    table: {
      head: ['Контекст', 'Исчисляемые', 'Неисчисляемые'],
      rows: [
        ['утверждение', 'some, a lot of, many', 'some, a lot of, much (книжн.)'],
        ['вопрос', 'any, how many', 'any, how much'],
        ['отрицание', 'not any, few', 'not any, little'],
        ['«немного, но есть»', 'a few', 'a little'],
        ['«почти нет»', 'few', 'little'],
      ],
    },
    examples: [
      { text: 'There are some typos in the draft.', ru: 'В черновике есть опечатки.', when: 'Утверждение — some.' },
      { text: 'Are there any blockers?', ru: 'Есть какие-нибудь блокеры?', when: 'Открытый вопрос — any.' },
      { text: 'Would you like some feedback on the layout?', ru: 'Хотите отзыв о макете?', when: 'Предложение с ожидаемым «да» — some в вопросе.' },
      { text: 'We don’t have any budget left.', ru: 'Бюджета совсем не осталось.', when: 'Отрицание — any.' },
      { text: 'Any developer can reproduce this bug.', ru: 'Этот баг воспроизведёт любой разработчик.', when: 'any в утверждении = «любой».' },
      { text: 'How much time do we have?', ru: 'Сколько у нас времени?', when: 'much + неисчисляемое в вопросе.' },
      { text: 'There isn’t much interest in this feature.', ru: 'К этой фиче мало интереса.', when: 'much в отрицании.' },
      { text: 'I have a few questions about the contract.', ru: 'У меня есть несколько вопросов по контракту.', when: 'a few: немного, но есть.' },
      { text: 'Few candidates passed the test task.', ru: 'Мало кто из кандидатов прошёл тестовое.', when: 'few: почти никто — оценка со знаком минус.' },
      { text: 'There’s a little milk left — enough for coffee.', ru: 'Молока немного осталось — на кофе хватит.', when: 'a little: хватает.' },
      { text: 'There’s little hope of finishing today.', ru: 'Надежды закончить сегодня мало.', when: 'little: почти нет.' },
      { text: 'Quite a few users complained.', ru: 'Пожаловалось немало пользователей.', when: 'quite a few = many, вопреки виду.' },
    ],
    pitfall: 'Few и a few русский слух не различает — «мало» и «немного» кажутся синонимами. Но I have few friends — жалоба на одиночество, I have a few friends — спокойное «друзья есть». Артикль a здесь несёт весь знак оценки.',
    contrast: [
      { with: 'en-countable-uncountable', note: 'Какой квантор доступен, решает исчисляемость: much information, many facts.' },
    ],
    quiz: [
      {
        q: '___ people know about this feature, so nobody uses it.',
        options: ['A few', 'Few', 'Some'],
        answer: 1,
        why: '«Никто не пользуется» требует негативного «почти никто» — few без артикля.',
      },
      {
        q: 'Would you like ___ more coffee?',
        options: ['any', 'some', 'many'],
        answer: 1,
        why: 'Предложение с ожидаемым согласием берёт some даже в вопросе.',
      },
    ],
  },

  // ─── Сравнение ─────────────────────────────────────────────────────────────
  {
    id: 'en-comparison-degrees',
    chapter: 'Сравнение',
    level: 'B1',
    form: '-er / more … than / the -est',
    title: 'Степени сравнения',
    short: 'faster, more useful, the best — и than, а не then',
    attach: 'к прилагательному или наречию',
    rule: `Короткие прилагательные (один слог, двусложные на -y) сравниваются суффиксами: fast — faster — the fastest, easy — easier — the easiest. Длинные — через more/most: useful — more useful — the most useful. Орфография: big — bigger (удвоение), nice — nicer, happy — happier.

Неправильные надо знать наизусть: good — better — best, bad — worse — worst, far — further — furthest, little — less — least, many/much — more — most. Отдельно elder/older: elder только о старшинстве в семье и только перед существительным.

Сравнение вводит than (не then и не as): faster than light. Равенство — рамка as … as: as fast as, отрицание — not as/so fast as. «В N раз» встраивается в эту же рамку: twice as expensive as, three times as long as.

Превосходная степень идёт с the и часто с in (не of!) для места/группы: the tallest building in Europe, the best developer in the team. После превосходной степени любит появляться перфект: the best course I have ever taken.`,
    examples: [
      { text: 'The new version is faster than the old one.', ru: 'Новая версия быстрее старой.', when: 'Базовое сравнение с than.' },
      { text: 'This approach is more reliable than caching.', ru: 'Этот подход надёжнее кэширования.', when: 'Длинное прилагательное — more.' },
      { text: 'It’s the most common mistake in the codebase.', ru: 'Это самая частая ошибка в кодовой базе.', when: 'Превосходная с the most.' },
      { text: 'The results are worse than expected.', ru: 'Результаты хуже ожидаемых.', when: 'bad — worse: неправильная форма.' },
      { text: 'My elder sister lives in Riga.', ru: 'Моя старшая сестра живёт в Риге.', when: 'elder — только о родне и только перед словом.' },
      { text: 'The office is further from the metro now.', ru: 'Офис теперь дальше от метро.', when: 'far — further.' },
      { text: 'The fix was easier than we feared.', ru: 'Фикс оказался проще, чем мы боялись.', when: '-y → -ier.' },
      { text: 'Is Prague as expensive as Vienna?', ru: 'Прага такая же дорогая, как Вена?', when: 'Равенство: as … as.' },
      { text: 'The flat isn’t as big as it looks in the photos.', ru: 'Квартира не такая большая, как на фото.', when: 'Отрицание равенства: not as … as.' },
      { text: 'It’s the best decision we’ve made this year.', ru: 'Это лучшее наше решение за год.', when: 'Превосходная + Present Perfect.' },
      { text: 'She’s the strongest designer in the team.', ru: 'Она сильнейший дизайнер в команде.', when: 'in для группы, не of.' },
    ],
    pitfall: 'More easier, the most fastest — двойное сравнение от неуверенности: выбирается ЛИБО суффикс, ЛИБО more/most. И вечная опечатка по звучанию: than (чем) — then (потом). Better then — ошибка, которую спеллчекер не ловит.',
    contrast: [
      { with: 'en-comparison-modifiers', note: 'Как усиливать и калибровать сравнение: far more, slightly, twice as … as.' },
    ],
    quiz: [
      {
        q: 'This bug is ___ than it looks.',
        options: ['more bad', 'worse', 'badder'],
        answer: 1,
        why: 'bad сравнивается неправильно: worse. more bad и badder не существуют.',
      },
      {
        q: 'She is the most experienced developer ___ the company.',
        options: ['of', 'in', 'from'],
        answer: 1,
        why: 'Группа или место после превосходной степени присоединяются через in.',
      },
    ],
  },
  {
    id: 'en-comparison-modifiers',
    chapter: 'Сравнение',
    level: 'B2',
    form: 'far more / twice as … as / the more, the better',
    title: 'Модификаторы сравнения',
    short: 'Насколько больше: калибровка разрыва и пропорции',
    attach: 'к сравнительной конструкции',
    unit: 'ielt-12',
    rule: `Сравнительная степень без калибровки говорит только «больше», но не «насколько». Разрыв задают модификаторы: большой — far, much, considerably, significantly (far more expensive — намного дороже); маленький — slightly, marginally, a little, a bit (slightly cheaper). Very со сравнительной НЕ работает: very better не существует, «гораздо лучше» — much/far better.

Кратность строится на рамке as … as: twice as expensive as, three times as many users as, half as long as. Русское «в два раза дороже» — это twice as expensive, а не two times more expensive (второе встречается, но небрежно).

Пропорциональная зависимость — двойной компаратив с the: The more you practise, the easier it gets. Обе половины начинаются с the + сравнительная. Короткие идиомы отсюда же: the sooner the better.

Нарастание — сравнительная и сравнительная: The queries are getting slower and slower. Это язык графиков и трендов: в IELTS Task 1 модификаторы разрыва (considerably higher, marginally lower) — половина оценки за лексику.`,
    examples: [
      { text: 'The native app is far more responsive than the web version.', ru: 'Нативное приложение отзывчивее веб-версии — намного.', when: 'Большой разрыв: far more.' },
      { text: 'The second interview was slightly harder.', ru: 'Второе собеседование было чуть сложнее.', when: 'Малый разрыв: slightly.' },
      { text: 'Rents here are twice as high as in my hometown.', ru: 'Аренда здесь вдвое выше, чем в моём городе.', when: 'Кратность: twice as … as.' },
      { text: 'The old library is half as fast as the new one.', ru: 'Старая библиотека вдвое медленнее новой.', when: 'half as … as — «вдвое меньше».' },
      { text: 'Sales in June were considerably higher than in May.', ru: 'Продажи в июне были существенно выше майских.', when: 'График в IELTS Task 1.' },
      { text: 'The more feedback we collect, the better the product gets.', ru: 'Чем больше отзывов собираем, тем лучше продукт.', when: 'Двойной компаратив: the …, the …' },
      { text: 'The sooner we decide, the better.', ru: 'Чем раньше решим, тем лучше.', when: 'Свёрнутая версия той же рамки.' },
      { text: 'Deadlines are getting tighter and tighter.', ru: 'Дедлайны всё жёстче и жёстче.', when: 'Нарастание: -er and -er.' },
      { text: 'It’s a lot less risky than rewriting from scratch.', ru: 'Это куда менее рискованно, чем переписывать с нуля.', when: 'a lot + less: разрыв вниз.' },
      { text: 'The venue holds three times as many people as ours.', ru: 'Площадка вмещает втрое больше людей, чем наша.', when: 'Кратность с many: three times as many … as.' },
    ],
    pitfall: 'Very better, very more expensive — усилитель very со сравнительной несовместим; «гораздо» — much/far. Вторая калька: «в три раза больше» как three times more — носитель скажет three times as much/many as.',
    contrast: [
      { with: 'en-comparison-degrees', note: 'Там сама степень, здесь — насколько: far, slightly, twice as … as, the …, the …' },
    ],
    quiz: [
      {
        q: '«Этот вариант гораздо дешевле» —',
        options: ['This option is very cheaper.', 'This option is much cheaper.', 'This option is more cheaper.'],
        answer: 1,
        why: 'Сравнительную усиливают much/far, но не very и не more.',
      },
      {
        q: 'Чем больше спишь, тем лучше работаешь: The more you sleep, ___.',
        options: ['the better you work', 'you work better', 'better you work'],
        answer: 0,
        why: 'Обе половины пропорции начинаются с the + сравнительная.',
      },
    ],
  },
]
