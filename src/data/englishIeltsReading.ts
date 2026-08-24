// ─────────────────────────────────────────────────────────────────────────────
// Чтение для курса «IELTS Academic — с 6.0 на 7.0»
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Аудит курса: Reading-модуль (юниты 8–11) учил СТРАТЕГИЯМ
// чтения, не давая ни одного настоящего текста. Однопредложные «passage» в
// вопросах — это проверка логики, а не чтения: скимминг нельзя натренировать
// на тексте, который короче вопроса к нему. Здесь — связные академические
// отрывки уровня B2–C1, и каждый прикреплён к юниту ровно того формата,
// которому юнит учит: юнит про скимминг получает текст с вопросами на
// маршрут по тексту, юнит про TFNG — текст с шестью утверждениями, юнит про
// заголовки — текст с абзацами A–D и списком заголовков с ловушками.
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ. По той же причине, что аудирование
// (englishIeltsListening.ts) и конспекты (englishIeltsTheory.ts): юнит — это
// последовательность и методика, а корпус текстов живёт своей жизнью и
// правится пачкой (образец подхода — koreanTopik2Reading.ts).
//
// ДВА КОРОТКИХ ТЕКСТА В WRITING (ielt-14, ielt-16) — не чтение ради чтения:
// это образцы аргументации. Ученик сначала ЧИТАЕТ, как выглядит перефраз
// формулировки и доведённый до следствия абзац, и только потом пишет свой.
//
// ЮРИДИЧЕСКОЕ. Все тексты написаны с нуля; материалы реальных экзаменов не
// копируются — ни целиком, ни отрывками.
// ─────────────────────────────────────────────────────────────────────────────

import { one, many, fill, reading, type SeedTask } from './languageCourse'

/** Отрывки и вопросы к ним по shortId юнита. */
export const IELTS_READING: Record<string, SeedTask[]> = {
  // ── Юнит 8. Скимминг и сканирование: текст с маршрутом ──
  //
  // Вопросы построены под стратегию юнита: сначала gist (скимминг), потом
  // точечные цифры и имена (сканирование), потом «в каком абзаце» — то, что
  // на экзамене называется locating information.
  'ielt-08': reading(
    'A. An electric car battery is usually retired when it still holds about seventy to eighty per cent of its original capacity. For driving, that loss matters: the car’s range shrinks and charging becomes less predictable. For almost anything else, such a battery is far from dead. Analysts expect that by 2030 more than a million packs a year will be leaving cars in Europe alone, and what happens to them next has quietly become one of the most practical questions in clean energy.\n\n'
    + 'B. The most promising answer is stationary storage. A battery that can no longer power a motorway journey can still store solar electricity generated at noon and release it in the evening, when demand peaks. In 2018, a football stadium in Amsterdam connected nearly one hundred and fifty second-hand packs into a plant capable of powering the arena during matches and feeding the grid the rest of the time. Similar projects now run in Japan, California and Norway.\n\n'
    + 'C. There are obstacles, however. Used packs arrive in different shapes, with different connectors and software, so each must be tested and rebuilt largely by hand, which raises costs. Manufacturers also worry about liability: a failed cell in somebody else’s warehouse still carries their name on the label. Until testing is automated, second-life storage will struggle to compete with new batteries, whose prices keep falling.\n\n'
    + 'D. Recycling, the obvious alternative, is improving too: modern plants recover over ninety per cent of the metals in a pack. Yet most engineers argue that the order matters — reuse first, recycle later. A battery, like a building, serves longest when nobody is in a hurry to demolish it.',
    [
      one('Skim the whole passage first (60 seconds, no dictionary). Which sentence best summarises it?', [
        'Electric cars are becoming cheaper than petrol cars.',
        'Retired car batteries can be reused for energy storage, though practical obstacles remain.',
        'Recycling plants now recover almost all the metals in a battery.',
        'A stadium in Amsterdam produces its own electricity.',
      ], 1),
      one('Scan, don’t read: by which year are more than a million packs a year expected to leave cars in Europe?', [
        '2018', '2025', '2030', '2050',
      ], 2),
      fill('Scan for the figure: a retired battery usually still holds at least ___ per cent of its original capacity. (числом)', '70', ['seventy']),
      one('Which paragraph discusses the obstacles to reusing batteries?', ['A', 'B', 'C', 'D'], 2),
      one('Why does the writer mention the Amsterdam stadium?', [
        'To show that football clubs invest in green energy',
        'To give a real example of second-hand batteries working as storage',
        'To prove that the Netherlands leads Europe in recycling',
        'To explain how a battery is rebuilt by hand',
      ], 1),
      one('What do most engineers say about the choice between reuse and recycling?', [
        'Recycling should always come first',
        'Reuse should come first, recycling later',
        'The two cannot be combined',
        'Neither is economically viable',
      ], 1),
    ],
    {
      title: 'Second lives for electric car batteries',
      translation:
        'A. Батарею электромобиля обычно списывают, когда она ещё держит порядка 70–80% исходной ёмкости. Для езды эта потеря существенна: запас хода падает, зарядка становится менее предсказуемой. Но почти для всего остального такая батарея далеко не мертва. Аналитики ожидают, что к 2030 году только в Европе из машин будет уходить больше миллиона батарейных блоков в год, и вопрос, что с ними происходит дальше, незаметно стал одним из самых практических в чистой энергетике.\n\n'
        + 'B. Самый многообещающий ответ — стационарное хранение. Батарея, которая уже не потянет трассу, всё ещё может запасать солнечную электроэнергию в полдень и отдавать её вечером, в пик спроса. В 2018 году футбольный стадион в Амстердаме соединил почти сто пятьдесят подержанных блоков в установку, способную питать арену во время матчей и отдавать энергию в сеть в остальное время. Похожие проекты работают в Японии, Калифорнии и Норвегии.\n\n'
        + 'C. Есть, однако, препятствия. Отработавшие блоки приходят разной формы, с разными разъёмами и программами, поэтому каждый приходится проверять и пересобирать в основном вручную — это поднимает стоимость. Производителей беспокоит и ответственность: отказавшая ячейка на чужом складе всё равно несёт их имя на этикетке. Пока проверка не автоматизирована, «второй жизни» трудно конкурировать с новыми батареями, которые продолжают дешеветь.\n\n'
        + 'D. Переработка — очевидная альтернатива — тоже совершенствуется: современные заводы извлекают из блока свыше девяноста процентов металлов. И всё же большинство инженеров считает, что важен порядок: сначала повторное использование, потом переработка. Батарея, как и здание, служит дольше всего там, где никто не спешит её сносить.',
    },
  ),

  // ── Юнит 9. True / False / Not Given: текст плюс шесть утверждений ──
  //
  // Утверждения собраны по типологии потерь юнита: квантор («all»),
  // модальность («known to be»), внешнее знание (оборудование, численность) —
  // ровно те места, где False путают с Not Given.
  'ielt-09': reading(
    'Anyone who has tried to hold a conversation beside a busy road knows the problem songbirds face in cities: the frequencies of traffic noise overlap with the notes they use to defend territory and attract mates. Over the past two decades, researchers have recorded great tits, blackbirds and sparrows in dozens of European cities and compared their songs with those of birds of the same species living in nearby forests.\n\n'
    + 'The pattern is consistent. Urban great tits sing at a higher minimum pitch than their rural relatives, lifting their song above the low rumble of engines. Some city blackbirds have also shifted their singing time, starting well before dawn, when the streets are at their quietest; in one Dutch study, birds in the noisiest districts were recorded singing at night.\n\n'
    + 'It is tempting to describe all this as evolution in action, but the evidence is more cautious. Individual birds can adjust their pitch within days when noise levels change, which suggests flexibility rather than genetic change; in laboratory tests, birds exposed to recorded traffic noise raised their pitch within a single week. Whether decades of city life have produced birds that inherit the higher pitch remains an open question.\n\n'
    + 'The change is not free of cost. Lower notes carry further and, in some species, appear to be what females prefer. A male that sings higher in order to be heard may therefore be heard by fewer of the listeners that matter. Noise, in other words, does not simply mask the message; it forces a trade-off between being audible and being attractive.',
    [
      one('«Traffic noise and birdsong overlap in frequency.» True, False or Not Given?', ['True', 'False', 'Not Given'], 0),
      one('«Urban great tits sing at a lower pitch than forest ones.» True, False or Not Given?', ['True', 'False', 'Not Given'], 1),
      one('«All city blackbirds now sing at night.» True, False or Not Given? Watch the quantifier.', ['True', 'False', 'Not Given'], 1),
      one('«The researchers used the same recording equipment in every city.» True, False or Not Given?', ['True', 'False', 'Not Given'], 2),
      one('«Sparrows are the most common songbird in European cities.» True, False or Not Given?', ['True', 'False', 'Not Given'], 2),
      one('«Singing at a higher pitch may make a male less attractive to females.» True, False or Not Given?', ['True', 'False', 'Not Given'], 0),
    ],
    {
      title: 'City birds change their tune',
      translation:
        'Каждый, кто пытался разговаривать у оживлённой дороги, знает, с чем сталкиваются певчие птицы в городах: частоты дорожного шума перекрываются с нотами, которыми они защищают территорию и привлекают партнёров. За последние два десятилетия исследователи записали больших синиц, чёрных дроздов и воробьёв в десятках европейских городов и сравнили их песни с песнями птиц тех же видов из ближайших лесов.\n\n'
        + 'Картина устойчива. Городские синицы поют с более высокой нижней нотой, чем их сельские родственники, поднимая песню над низким гулом моторов. Часть городских дроздов сдвинула и время пения, начиная задолго до рассвета, когда улицы тише всего; в одном нидерландском исследовании птицы из самых шумных районов пели ночью.\n\n'
        + 'Заманчиво назвать всё это эволюцией в действии, но данные осторожнее. Отдельная птица способна поднять высоту песни за считаные дни, когда меняется уровень шума, — а это говорит о гибкости, не о генетическом сдвиге; в лабораторных опытах птицы, которым включали запись дорожного шума, поднимали высоту за неделю. Унаследуют ли птицы, десятилетиями живущие в городе, более высокую ноту — вопрос открытый.\n\n'
        + 'Перемена не бесплатна. Низкие ноты летят дальше и у некоторых видов, судя по всему, больше нравятся самкам. Самец, поющий выше, чтобы быть услышанным, может оказаться услышанным меньшим числом тех, кто важен. Иными словами, шум не просто заглушает сообщение — он навязывает размен между «слышно» и «привлекательно».',
    },
  ),

  // ── Юнит 10. Matching Headings: абзацы A–D и список с ловушками ──
  //
  // Список заголовков один на все вопросы и содержит две ловушки: «Detroit»
  // как лексическое совпадение и «экологическая цена сноса» как деталь,
  // не являющаяся мыслью ни одного абзаца.
  'ielt-10': reading(
    'A. Discussions of the modern city usually begin with growth: how to house new arrivals, where to run extra buses, what to do about rising rents. Yet across the industrial regions of Europe, America and East Asia there is a quieter story. Hundreds of cities are losing people. When a major employer closes, the young leave first, schools empty, and whole streets fall vacant. Detroit has lost more than half of its peak population; parts of eastern Germany and northern Japan have followed the same curve.\n\n'
    + 'B. For decades the standard response was to behave as if the decline were temporary. City governments built conference centres, stadiums and shopping malls in the hope of attracting people back, often paying with money borrowed against a future that never arrived. The results are visible today: oversized infrastructure that a shrunken tax base cannot maintain.\n\n'
    + 'C. A newer school of planning accepts the loss of population as a starting point rather than a defeat. Leipzig, once among the fastest-shrinking cities in Germany, demolished thousands of abandoned flats, turned the cleared land into parks and allotments, and concentrated investment in the districts that remained lively. Services were deliberately pulled inwards instead of being stretched ever thinner across a half-empty map.\n\n'
    + 'D. The lesson emerging from such experiments is uncomfortable but useful: a city that plans its own shrinkage can end up denser, greener and cheaper to run than one that pretends to grow. Success, in this view, is not measured by the number of residents, but by how well the city serves the residents it actually has.\n\n'
    + 'Headings:\ni. Building for a return that never came\nii. A problem the growth debate overlooks\niii. Planning shrinkage instead of denying it\niv. A different definition of success\nv. The environmental cost of demolition\nvi. How Detroit attracted new industries',
    [
      one('State the main idea of paragraph A in your own words FIRST, then choose the heading.', [
        'i. Building for a return that never came',
        'ii. A problem the growth debate overlooks',
        'v. The environmental cost of demolition',
        'vi. How Detroit attracted new industries',
      ], 1),
      one('Which heading fits paragraph B?', [
        'i. Building for a return that never came',
        'iii. Planning shrinkage instead of denying it',
        'iv. A different definition of success',
        'v. The environmental cost of demolition',
      ], 0),
      one('Which heading fits paragraph C?', [
        'ii. A problem the growth debate overlooks',
        'iii. Planning shrinkage instead of denying it',
        'iv. A different definition of success',
        'vi. How Detroit attracted new industries',
      ], 1),
      one('Which heading fits paragraph D?', [
        'i. Building for a return that never came',
        'ii. A problem the growth debate overlooks',
        'iv. A different definition of success',
        'v. The environmental cost of demolition',
      ], 2),
      one('Heading vi mentions Detroit, and Detroit appears in paragraph A. Why is vi still wrong for A?', [
        'Detroit is spelled differently in the text',
        'A word match is not an idea match: paragraph A is about cities losing people, not attracting industries',
        'Paragraph A is too short for that heading',
        'Headings with proper names are never correct',
      ], 1),
      one('Heading v («The environmental cost of demolition») matches no paragraph. What makes it a typical distractor?', [
        'It is longer than the other headings',
        'Demolition is mentioned in the text as a detail, but no paragraph is ABOUT its environmental cost',
        'It contradicts the passage',
        'It repeats heading iii',
      ], 1),
    ],
    {
      title: 'When cities shrink',
      translation:
        'A. Разговор о современном городе обычно начинается с роста: как расселить приезжающих, куда пустить дополнительные автобусы, что делать с растущей арендой. Но в индустриальных регионах Европы, Америки и Восточной Азии идёт более тихая история: сотни городов теряют людей. Когда закрывается главный работодатель, первыми уезжают молодые, пустеют школы, целые улицы стоят брошенными. Детройт потерял больше половины пиковой численности; части восточной Германии и северной Японии повторяют ту же кривую.\n\n'
        + 'B. Десятилетиями стандартным ответом было вести себя так, будто спад временный. Городские власти строили конференц-центры, стадионы и торговые центры в надежде вернуть людей, часто расплачиваясь деньгами, занятыми под будущее, которое так и не наступило. Результат виден сегодня: избыточная инфраструктура, которую съёжившаяся налоговая база не в силах содержать.\n\n'
        + 'C. Более новая школа планирования принимает потерю населения как исходную точку, а не поражение. Лейпциг, один из самых быстро сжимавшихся городов Германии, снёс тысячи брошенных квартир, превратил расчищенную землю в парки и огороды и сосредоточил вложения в районах, оставшихся живыми. Услуги сознательно стянули внутрь, вместо того чтобы растягивать их всё тоньше по полупустой карте.\n\n'
        + 'D. Урок этих экспериментов неудобен, но полезен: город, который планирует собственное сжатие, может стать плотнее, зеленее и дешевле в содержании, чем тот, что делает вид, будто растёт. Успех здесь измеряется не числом жителей, а тем, насколько хорошо город служит тем, кто в нём есть.\n\n'
        + 'Заголовки: i. Строительство ради возвращения, которого не случилось · ii. Проблема, которую спор о росте не замечает · iii. Планировать сжатие, а не отрицать его · iv. Другое определение успеха · v. Экологическая цена сноса · vi. Как Детройт привлёк новые отрасли',
    },
  ),

  // ── Юнит 11. Слова из контекста и позиция автора ──
  //
  // Текст нарочно насыщен оценочной лексикой юнита (arguably, questionable,
  // surprisingly, overlooked) и словами, значение которых выводится из
  // контекста и морфологии (untenable, retention, obituary).
  'ielt-11': reading(
    'For six hundred years the lecture has been the default format of university teaching, and for at least a century critics have been announcing its death. The latest wave of criticism is armed with data. In a series of studies, students in traditional lecture courses were compared with students taught through problem-solving and discussion; the active groups consistently scored higher, and failure rates in lecture courses were about a third higher. For some researchers the conclusion is inescapable: continuing to lecture is, in their words, professionally untenable.\n\n'
    + 'Yet the obituary is arguably premature. The studies compare an unprepared audience listening passively with carefully designed activities, which is hardly a fair contest. A skilful lecture does things the comparison ignores: it models how an expert thinks aloud, connects a field into a single story, and — not a small matter — reaches four hundred students at a cost no seminar can match. Defenders also point out that «active learning» covers a questionable variety of practices, some of them little more than lectures broken up by voting buttons.\n\n'
    + 'What is often overlooked is that the two camps are answering different questions. If the question is how to maximise measurable retention of material, the evidence favours activity. If it is what a university is for, the answer is less tidy. Surprisingly, students themselves frequently rate lectures they learn less from more highly, mistaking fluent delivery for their own understanding — a finding that should worry both sides. The sensible conclusion is not that the lecture must die, but that it can no longer be the default that requires no justification.',
    [
      one('Do not stop at the unknown word — use the context. «Untenable» here most nearly means:', [
        'indefensible, impossible to justify',
        'too expensive to continue',
        'unpopular with students',
        'technically outdated',
      ], 0),
      one('«Retention of material» in the third paragraph refers to:', [
        'how many students stay on the course',
        'how much of the material students remember',
        'how long the course materials are kept',
        'how fast students read the material',
      ], 1),
      one('«The obituary is arguably premature.» What is the writer doing with these words?', [
        'Reporting a neutral fact about the studies',
        'Signalling doubt: declaring the lecture dead is, in the writer’s view, too early',
        'Agreeing that the lecture is dead',
        'Quoting the researchers’ own conclusion',
      ], 1),
      many('Which phrases carry the writer’s own evaluation rather than neutral fact?', [
        'arguably premature',
        'a questionable variety of practices',
        'for six hundred years',
        'what is often overlooked',
      ], [0, 1, 3]),
      one('Why does the writer mention that students rate lectures they learn less from more highly?', [
        'To prove that lectures are the best format',
        'To show that self-assessment is unreliable — which undermines easy conclusions on both sides',
        'To argue that students should grade their own courses',
        'To criticise fluent lecturers',
      ], 1),
      one('What is the writer’s overall stance?', [
        'Lectures should be abolished as the data demands',
        'Lectures should stay exactly as they are',
        'The lecture may survive, but it must now be justified rather than assumed',
        'The research on active learning is fraudulent',
      ], 2),
    ],
    {
      title: 'The lecture is dead; long live the lecture',
      translation:
        'Шестьсот лет лекция была форматом университетского преподавания по умолчанию, и не меньше века критики объявляют о её смерти. Последняя волна критики вооружена данными. В серии исследований студентов традиционных лекционных курсов сравнивали со студентами, которых учили через решение задач и обсуждение; «активные» группы стабильно показывали результаты выше, а доля проваливших лекционные курсы была примерно на треть больше. Для части исследователей вывод неизбежен: продолжать читать лекции, по их словам, профессионально несостоятельно.\n\n'
        + 'И всё же некролог, пожалуй, преждевременен. Исследования сравнивают неподготовленную аудиторию, слушающую пассивно, с тщательно спроектированными занятиями — вряд ли это честное состязание. Умелая лекция делает то, что это сравнение не учитывает: показывает, как эксперт думает вслух, связывает дисциплину в единый сюжет и — что немаловажно — доходит до четырёхсот студентов по цене, с которой не сравнится ни один семинар. Защитники замечают и то, что «активное обучение» покрывает сомнительное разнообразие практик, часть которых — те же лекции, разбитые кнопками голосования.\n\n'
        + 'Часто упускается, что два лагеря отвечают на разные вопросы. Если вопрос в том, как максимизировать измеримое запоминание материала, данные за активность. Если вопрос в том, зачем университет существует, ответ не так аккуратен. Что удивительно, сами студенты нередко выше оценивают лекции, с которых уносят меньше, принимая гладкость подачи за собственное понимание, — и этот результат должен тревожить обе стороны. Разумный вывод не в том, что лекция должна умереть, а в том, что она больше не может быть умолчанием, не требующим обоснования.',
    },
  ),

  // ── Юнит 14. Образец аргументации: интро с перефразом и тезисом ──
  //
  // Короткий текст-образец: как выглядит введение, которое НЕ копирует
  // формулировку задания. Ученик разбирает его до того, как писать своё.
  'ielt-14': reading(
    'Task: «Some people believe that university education should be free for all students, while others argue that students themselves should pay. Discuss both views and give your own opinion.»\n\n'
    + 'Model introduction and plan:\n\n'
    + 'Whether the state should cover the cost of a degree divides opinion sharply. Supporters of free tuition point out that societies with more graduates tend to be healthier and more productive, so the benefit is collective and the bill, they argue, should be too. Opponents reply that a degree raises the graduate’s own lifetime income, and that asking a supermarket cashier to subsidise a future lawyer’s studies through taxation is quietly unfair. In my view, the strongest position lies between the two: tuition should be free in professions with clear public value, such as nursing and teaching, and financed by income-based loans everywhere else. This essay will examine each view in turn before defending that compromise: the first body paragraph will weigh the social benefits of free tuition, and the second will address the fairness objection.',
    [
      one('Which type of Task 2 question does this model answer?', [
        'An opinion question (to what extent do you agree)',
        'A discussion question with your own opinion required',
        'A problem–solution question',
        'A two-part factual question',
      ], 1),
      one('Which sentence is the thesis statement?', [
        '«Whether the state should cover the cost of a degree divides opinion sharply.»',
        '«Supporters of free tuition point out that societies with more graduates tend to be healthier…»',
        '«In my view, the strongest position lies between the two: tuition should be free in professions with clear public value…»',
        '«This essay will examine each view in turn…»',
      ], 2),
      one('Compare the task wording with the first sentence of the answer. What has the writer done?', [
        'Copied the task wording to save time',
        'Paraphrased it: «university education should be free» became «the state should cover the cost of a degree»',
        'Ignored the task completely',
        'Quoted the task in quotation marks',
      ], 1),
    ],
    {
      title: 'Model: introduction that answers the question',
      translation:
        'Задание: «Одни считают, что университетское образование должно быть бесплатным для всех студентов, другие — что платить должны сами студенты. Рассмотрите оба взгляда и выскажите своё мнение».\n\n'
        + 'Образец введения и плана:\n\n'
        + 'Должно ли государство покрывать стоимость высшего образования — вопрос, резко разделяющий мнения. Сторонники бесплатного обучения указывают, что общества с большим числом выпускников, как правило, здоровее и продуктивнее, а значит, выгода общая — и счёт, по их мнению, тоже должен быть общим. Оппоненты отвечают, что диплом повышает пожизненный доход самого выпускника, и просить кассира супермаркета через налоги субсидировать учёбу будущего юриста — тихая несправедливость. На мой взгляд, самая сильная позиция лежит между этими двумя: обучение должно быть бесплатным в профессиях с явной общественной ценностью, таких как медсёстры и учителя, и финансироваться доходозависимыми кредитами во всех остальных. Это эссе рассмотрит оба взгляда по очереди, а затем защитит этот компромисс: первый абзац взвесит общественные выгоды бесплатного обучения, второй разберёт возражение о справедливости.',
    },
  ),

  // ── Юнит 16. Образец развития: слабый абзац против доведённого ──
  //
  // Пара версий одного абзаца: остановившийся на первом шаге и доведённый
  // до следствия с конкретным примером. Разница и есть разница 6.0 и 7.0.
  'ielt-16': reading(
    'Version 1:\n\n'
    + 'Working from home is good for employees. It saves time and money. Many people prefer it. Companies should allow it because it makes people happy, and happy workers are better workers.\n\n'
    + 'Version 2:\n\n'
    + 'The clearest benefit of working from home is the time it releases. An employee who no longer commutes recovers about an hour a day — roughly five working weeks a year. This time rarely disappears into leisure alone: surveys conducted during the pandemic found that remote workers returned part of it to their employers by starting earlier, and spent much of the rest on sleep and exercise, which in turn reduced sick leave. A case in point is a large travel company that made remote work permanent in 2021 and reported both longer average working days and lower staff turnover the following year. The gain, in other words, is not that workers are vaguely «happier», but that recovered commuting time converts into measurable output and health.',
    [
      one('Which version would score higher for argument development, and why?', [
        'Version 1 — it is shorter and clearer',
        'Version 2 — every claim is pushed to a consequence and supported by a concrete example',
        'Version 1 — it mentions more benefits',
        'They are equal: both state that remote work is good',
      ], 1),
      one('What makes the example in Version 2 strong?', [
        'It names a specific case with a measurable outcome (permanent remote work in 2021 → lower turnover)',
        'It mentions a famous company by name',
        'It is placed at the start of the paragraph',
        'It repeats the topic sentence',
      ], 0),
      one('What job does «which in turn» do in Version 2?', [
        'It introduces a contrast',
        'It extends the chain one step further: more sleep and exercise → less sick leave',
        'It softens the claim',
        'It marks the conclusion of the essay',
      ], 1),
    ],
    {
      title: 'Model: a paragraph pushed to its consequence',
      translation:
        'Версия 1:\n\n'
        + 'Работа из дома полезна работникам. Она экономит время и деньги. Многим она нравится. Компании должны её разрешать, потому что она делает людей счастливыми, а счастливые работники работают лучше.\n\n'
        + 'Версия 2:\n\n'
        + 'Самая очевидная выгода работы из дома — высвобожденное время. Работник, который больше не ездит в офис, возвращает себе около часа в день — примерно пять рабочих недель в год. Это время редко целиком уходит на досуг: опросы времён пандемии показали, что удалённые сотрудники часть его возвращали работодателю, начиная раньше, а заметную долю остального тратили на сон и спорт, что, в свою очередь, сокращало больничные. Показательный пример — крупная туристическая компания, которая в 2021 году сделала удалёнку постоянной и на следующий год отчиталась и о более длинном среднем рабочем дне, и о снизившейся текучке. Иными словами, выигрыш не в том, что работники стали расплывчато «счастливее», а в том, что возвращённое дорожное время конвертируется в измеримые результат и здоровье.',
    },
  ),
}
