// ─────────────────────────────────────────────────────────────────────────────
// Справочник немецкой грамматики
//
// ЧТО СЮДА ПОПАЛО. Формы, к которым возвращаются: артикль и род, четыре падежа,
// рамка предложения, порядок слов в придаточном, перфект, модальные,
// склонение прилагательного, Konjunktiv II, пассив. То есть ровно то, из-за
// чего человек на пятнадцатом уроке останавливается посреди фразы.
//
// ЧЕГО ЗДЕСЬ НЕТ. Полной парадигмы всех неправильных глаголов (это набор слов,
// а не форма — см. wordPacksDe.ts, «Сильные глаголы») и редких книжных
// конструкций: справочник для говорящего, а не для филолога.
//
// ПОЧЕМУ У КАЖДОЙ ФОРМЫ ЕСТЬ pitfall. Ошибки русскоязычного в немецком
// предсказуемы до скуки: «нельзя» через nicht müssen, порядок слов как в
// русском, отсутствие артикля, seit с прошедшим временем. Это лечится не
// правилом, а названной вслух ловушкой.
// ─────────────────────────────────────────────────────────────────────────────

import type { GrammarRef } from './grammar'

export const GERMAN_GRAMMAR: GrammarRef = {
  lang: 'de',
  chapters: [
    'Артикль и род',
    'Падежи',
    'Глагол',
    'Прошедшее время',
    'Порядок слов',
    'Прилагательные',
    'Наклонение и залог',
  ],
  forms: [
    {
      id: 'de-artikel-bestimmt',
      chapter: 'Артикль и род',
      level: 'A1',
      form: 'der / die / das',
      title: 'Определённый артикль',
      short: 'Предмет известен собеседнику — тот самый',
      attach: 'перед существительным',
      rule:
        'Определённый артикль ставится, когда предмет уже назван, единственный в своём роде или очевиден из ситуации: der Tisch — тот самый стол, о котором речь.\n\nАртикль в немецком не украшение, а носитель грамматики: род, число и падеж стоят именно в нём, а не в самом слове. Поэтому существительное без артикля выучено наполовину, и в словаре его записывают только вместе с ним.\n\nАртикль сливается с предлогом в живой речи: zu dem → zum, zu der → zur, in dem → im, an dem → am, von dem → vom. Это норма, а не разговорная небрежность.',
      table: {
        head: ['Падеж', 'муж.', 'жен.', 'ср.', 'мн.'],
        rows: [
          ['Nominativ', 'der', 'die', 'das', 'die'],
          ['Akkusativ', 'den', 'die', 'das', 'die'],
          ['Dativ', 'dem', 'der', 'dem', 'den + -n'],
          ['Genitiv', 'des', 'der', 'des', 'der'],
        ],
      },
      examples: [
        { text: 'Der Zug kommt um acht.', ru: 'Поезд приходит в восемь.', when: 'Речь о конкретном поезде, который оба ждут.' },
        { text: 'Ich gehe in die Küche.', ru: 'Я иду на кухню.', when: 'Кухня в этой квартире одна — предмет очевиден.' },
        { text: 'Die Sonne scheint.', ru: 'Светит солнце.', when: 'Единственное в своём роде — артикль обязателен.' },
        { text: 'Wo ist das Buch?', ru: 'Где книга?', when: 'Та книга, о которой уже говорили.' },
        { text: 'Ich fahre zum Bahnhof.', ru: 'Я еду на вокзал.', when: 'zu dem слилось в zum — так говорят всегда.' },
        { text: 'Am Montag habe ich frei.', ru: 'В понедельник я свободен.', when: 'an dem → am: дни недели всегда с артиклем.' },
        { text: 'Das Wetter ist heute schön.', ru: 'Погода сегодня хорошая.', when: 'Абстрактные понятия в немецком с артиклем, в отличие от русского.' },
        { text: 'Der Mann dort ist mein Chef.', ru: 'Тот мужчина — мой начальник.', when: 'Указание на конкретное лицо в поле зрения.' },
      ],
      pitfall:
        'Русский пропускает артикль, потому что в родном языке его нет: «Ich gehe in Küche» — фраза, по которой иностранца слышно сразу. Артикль в немецком опускается только в считаных случаях (перед именами, большинством стран, профессией после als и в устойчивых оборотах вроде zu Hause).',
      contrast: [{ with: 'de-artikel-unbestimmt', note: 'der — тот самый, известный; ein — какой-то, впервые названный.' }],
      quiz: [
        {
          q: 'Как правильно: «Я еду к врачу»?',
          options: ['Ich gehe zu Arzt.', 'Ich gehe zum Arzt.', 'Ich gehe zu der Arzt.'],
          answer: 1,
          why: 'zu требует Dativ, артикль мужского рода в Dativ — dem, и zu dem обязательно сливается в zum.',
        },
        {
          q: 'Какой артикль у Wohnung в Nominativ?',
          options: ['der', 'die', 'das'],
          answer: 1,
          why: 'Все существительные на -ung женского рода: die Wohnung, die Rechnung, die Zeitung.',
        },
      ],
    },
    {
      id: 'de-artikel-unbestimmt',
      chapter: 'Артикль и род',
      level: 'A1',
      form: 'ein / eine / kein',
      title: 'Неопределённый и отрицательный артикль',
      short: 'Какой-то, впервые названный — и его отрицание',
      attach: 'перед существительным в единственном числе',
      rule:
        'ein называет предмет впервые: Ich habe ein Auto. Во множественном числе неопределённого артикля нет вовсе — слово стоит голым: Ich habe Autos.\n\nkein — отдельная и очень немецкая вещь: существительное отрицают не словом nicht, а отрицательным артиклем. «У меня нет времени» — Ich habe keine Zeit, а не Ich habe nicht Zeit. Склоняется kein точно как ein, но имеет и множественное число: keine Kinder.\n\nПритяжательные (mein, dein, sein, ihr, unser, euer, Ihr) склоняются по той же схеме, поэтому вся эта группа учится одной таблицей.',
      table: {
        head: ['Падеж', 'муж.', 'жен.', 'ср.', 'мн. (kein)'],
        rows: [
          ['Nominativ', 'ein', 'eine', 'ein', 'keine'],
          ['Akkusativ', 'einen', 'eine', 'ein', 'keine'],
          ['Dativ', 'einem', 'einer', 'einem', 'keinen'],
          ['Genitiv', 'eines', 'einer', 'eines', 'keiner'],
        ],
      },
      examples: [
        { text: 'Ich suche eine Wohnung.', ru: 'Я ищу квартиру.', when: 'Любую подходящую, а не конкретную.' },
        { text: 'Das ist ein Freund von mir.', ru: 'Это мой знакомый.', when: 'Один из друзей — не «мой парень».' },
        { text: 'Ich habe keine Zeit.', ru: 'У меня нет времени.', when: 'Отрицание существительного — только через kein.' },
        { text: 'Er hat keinen Hunger.', ru: 'Он не голоден.', when: 'Akkusativ мужского рода: keinen.' },
        { text: 'Wir haben keine Kinder.', ru: 'У нас нет детей.', when: 'Множественное число — kein есть, ein нет.' },
        { text: 'Ich brauche einen Termin.', ru: 'Мне нужна запись на приём.', when: 'brauchen требует Akkusativ.' },
        { text: 'Sie ist Ärztin.', ru: 'Она врач.', when: 'Профессия без артикля — единственный случай, где немецкий как русский.' },
        { text: 'Haben Sie ein Zimmer frei?', ru: 'У вас есть свободный номер?', when: 'Любой свободный — неопределённый артикль.' },
      ],
      pitfall:
        'Nicht вместо kein: «Ich habe nicht Geld» звучит для немца сломанно. Правило простое: отрицаете существительное — kein, отрицаете глагол, прилагательное или обстоятельство — nicht.',
      contrast: [{ with: 'de-negation', note: 'kein отрицает существительное, nicht — всё остальное.' }],
      quiz: [
        {
          q: '«У меня нет машины» —',
          options: ['Ich habe nicht ein Auto.', 'Ich habe kein Auto.', 'Ich habe nicht Auto.'],
          answer: 1,
          why: 'Отрицание существительного в немецком выражается артиклем kein.',
        },
      ],
    },
    {
      id: 'de-nominativ-akkusativ',
      chapter: 'Падежи',
      level: 'A1',
      form: 'Nominativ / Akkusativ',
      title: 'Кто делает и что делают',
      short: 'Подлежащее и прямое дополнение',
      attach: 'к существительному с артиклем',
      rule:
        'Nominativ отвечает на вопрос wer? was? — это подлежащее и то, что стоит после sein, werden, bleiben: Das ist der Chef.\n\nAkkusativ отвечает на wen? was? — прямое дополнение: Ich sehe den Chef. Хорошая новость в том, что в Akkusativ меняется только мужской род (der → den). Женский, средний и множественное выглядят как в Nominativ, поэтому «выучить Akkusativ» — это выучить одну букву.\n\nAkkusativ требуют предлоги durch, für, gegen, ohne, um, а также большинство глаголов действия: haben, brauchen, sehen, kaufen, nehmen, essen.',
      examples: [
        { text: 'Der Mann liest ein Buch.', ru: 'Мужчина читает книгу.', when: 'Кто читает — Nominativ, что читает — Akkusativ.' },
        { text: 'Ich sehe den Mann.', ru: 'Я вижу мужчину.', when: 'Единственное реальное изменение: der → den.' },
        { text: 'Das ist mein Bruder.', ru: 'Это мой брат.', when: 'После sein всегда Nominativ, а не Akkusativ.' },
        { text: 'Er wird Lehrer.', ru: 'Он становится учителем.', when: 'werden тоже требует Nominativ.' },
        { text: 'Ich kaufe einen Kaffee für dich.', ru: 'Я куплю тебе кофе.', when: 'für всегда с Akkusativ.' },
        { text: 'Wir gehen ohne den Chef.', ru: 'Мы идём без начальника.', when: 'ohne — тоже всегда Akkusativ.' },
        { text: 'Ich brauche keinen Termin.', ru: 'Мне не нужна запись.', when: 'brauchen + Akkusativ, kein в Akkusativ мужского рода.' },
        { text: 'Sie hat einen Hund und eine Katze.', ru: 'У неё собака и кошка.', when: 'haben всегда с Akkusativ — «у меня есть» здесь строится через «я имею».' },
      ],
      pitfall:
        'Русский слышит «у меня есть» и хочет поставить Dativ («mir ist»), но немецкий говорит «я имею»: ich habe + Akkusativ. И обратная ошибка: после sein ставят Akkusativ («Das ist einen Freund») — там всегда Nominativ.',
      contrast: [{ with: 'de-dativ', note: 'Akkusativ — кого/что (прямое дополнение), Dativ — кому/чему (адресат).' }],
      quiz: [
        {
          q: '«Я вижу поезд» —',
          options: ['Ich sehe der Zug.', 'Ich sehe den Zug.', 'Ich sehe dem Zug.'],
          answer: 1,
          why: 'sehen требует Akkusativ, мужской род der → den.',
        },
      ],
    },
    {
      id: 'de-dativ',
      chapter: 'Падежи',
      level: 'A2',
      form: 'Dativ',
      title: 'Кому и чему',
      short: 'Адресат действия и почти все бытовые предлоги',
      attach: 'к существительному с артиклем',
      rule:
        'Dativ — падеж адресата: Ich gebe dem Kind das Buch. Формы: dem (муж./ср.), der (жен.), den + -n (мн.).\n\nПрактически Dativ важнее, чем кажется: его требуют девять самых частых предлогов — aus, bei, mit, nach, seit, von, zu, außer, gegenüber — и целая группа глаголов, где русский ждёт винительный: helfen, danken, gefallen, gehören, passen, antworten, folgen.\n\nВо множественном числе к самому существительному добавляется -n: mit den Kindern, mit den Freunden. Это единственное место, где падеж виден на слове, а не только на артикле.',
      table: {
        head: ['', 'муж.', 'жен.', 'ср.', 'мн.'],
        rows: [
          ['Dativ, опред.', 'dem', 'der', 'dem', 'den …-n'],
          ['Dativ, неопред.', 'einem', 'einer', 'einem', '— (keinen)'],
          ['Местоимение', 'ihm', 'ihr', 'ihm', 'ihnen'],
        ],
      },
      examples: [
        { text: 'Ich helfe dir.', ru: 'Я тебе помогаю.', when: 'helfen требует Dativ, хотя по-русски «помогать кого-то» невозможно и так.' },
        { text: 'Das gefällt mir.', ru: 'Мне это нравится.', when: 'Стандартная формула оценки — подлежащее вещь, а не человек.' },
        { text: 'Das Buch gehört meinem Bruder.', ru: 'Книга принадлежит моему брату.', when: 'gehören + Dativ.' },
        { text: 'Ich fahre mit dem Bus.', ru: 'Я еду на автобусе.', when: 'mit + Dativ — так называется любой транспорт.' },
        { text: 'Nach der Arbeit gehe ich einkaufen.', ru: 'После работы иду за покупками.', when: 'nach + Dativ.' },
        { text: 'Seit einem Jahr wohne ich hier.', ru: 'Я живу здесь год.', when: 'seit + Dativ и НАСТОЯЩЕЕ время — действие продолжается.' },
        { text: 'Wir sprechen mit den Nachbarn.', ru: 'Мы говорим с соседями.', when: 'Множественное число в Dativ получает -n.' },
        { text: 'Mir tut der Kopf weh.', ru: 'У меня болит голова.', when: 'Болит не «я», а часть тела; человек стоит в Dativ.' },
      ],
      pitfall:
        'Seit с прошедшим временем: «Seit einem Jahr habe ich hier gewohnt» — ошибка. Если действие продолжается, немецкий ставит настоящее время: seit einem Jahr wohne ich hier.',
      contrast: [{ with: 'de-wechselprep', note: 'После переменных предлогов Dativ отвечает на wo?, а Akkusativ — на wohin?' }],
      quiz: [
        {
          q: '«Я помогаю соседу» —',
          options: ['Ich helfe den Nachbarn.', 'Ich helfe dem Nachbarn.', 'Ich helfe der Nachbar.'],
          answer: 1,
          why: 'helfen — глагол с Dativ: dem Nachbarn.',
        },
      ],
    },
    {
      id: 'de-wechselprep',
      chapter: 'Падежи',
      level: 'A2',
      form: 'in, auf, an, über, unter, vor, hinter, neben, zwischen',
      title: 'Переменные предлоги: wohin или wo',
      short: 'Движение — Akkusativ, положение — Dativ',
      attach: 'к существительному после предлога',
      rule:
        'Девять предлогов управляют то Akkusativ, то Dativ, и выбор делает не предлог, а смысл. Вопрос wohin? (куда, есть перемещение) — Akkusativ. Вопрос wo? (где, положение) — Dativ.\n\nIch gehe in die Küche (куда — Akk.) против Ich bin in der Küche (где — Dat.). Ich hänge das Bild an die Wand против Das Bild hängt an der Wand.\n\nПодсказка, которая работает: если в предложении глагол движения с направлением (gehen, fahren, stellen, legen, hängen как действие) — Akkusativ. Если глагол положения (sein, bleiben, stehen, liegen, hängen как состояние) — Dativ.',
      table: {
        head: ['Вопрос', 'Падеж', 'Глаголы', 'Пример'],
        rows: [
          ['wohin?', 'Akkusativ', 'gehen, fahren, stellen, legen, setzen, hängen', 'Ich stelle die Tasse auf den Tisch'],
          ['wo?', 'Dativ', 'sein, bleiben, stehen, liegen, sitzen, hängen', 'Die Tasse steht auf dem Tisch'],
        ],
      },
      examples: [
        { text: 'Ich gehe in die Stadt.', ru: 'Я иду в город.', when: 'Перемещение — Akkusativ.' },
        { text: 'Ich bin in der Stadt.', ru: 'Я в городе.', when: 'Положение — Dativ.' },
        { text: 'Er legt das Buch auf den Tisch.', ru: 'Он кладёт книгу на стол.', when: 'legen — действие, Akkusativ.' },
        { text: 'Das Buch liegt auf dem Tisch.', ru: 'Книга лежит на столе.', when: 'liegen — состояние, Dativ.' },
        { text: 'Wir fahren an die See.', ru: 'Мы едем на море.', when: 'Направление.' },
        { text: 'Wir sind an der See.', ru: 'Мы на море.', when: 'Место.' },
        { text: 'Stell dich neben mich.', ru: 'Встань рядом со мной.', when: 'Перемещение к точке — Akkusativ.' },
        { text: 'Er steht neben mir.', ru: 'Он стоит рядом со мной.', when: 'Положение — Dativ.' },
      ],
      pitfall:
        'Русский выбирает падеж по предлогу, как в родном языке («в» + предложный), и получает застывшее «in der» во всех случаях. Немецкий выбирает по смыслу: сначала спросите себя wohin или wo, и только потом ставьте артикль.',
      quiz: [
        {
          q: '«Я вешаю картину на стену» —',
          options: ['Ich hänge das Bild an der Wand.', 'Ich hänge das Bild an die Wand.', 'Ich hänge das Bild an der Wände.'],
          answer: 1,
          why: 'Вешаю — движение, вопрос wohin, значит Akkusativ: an die Wand.',
        },
      ],
    },
    {
      id: 'de-praesens',
      chapter: 'Глагол',
      level: 'A1',
      form: '-e, -st, -t, -en, -t, -en',
      title: 'Настоящее время',
      short: 'Шесть окончаний, которые закрывают весь глагол',
      attach: 'к основе глагола',
      rule:
        'Спряжение в настоящем времени регулярно: machen → ich mache, du machst, er macht, wir machen, ihr macht, sie/Sie machen.\n\nУ сильных глаголов в формах du и er меняется корневая гласная: fahren → du fährst, er fährt; sprechen → du sprichst, er spricht; lesen → du liest, er liest. Изменение не случайное: a → ä, e → i/ie, и оно есть только во втором и третьем лице единственного числа.\n\nНастоящее время в немецком отвечает и за будущее: Morgen fahre ich nach Berlin — «завтра поеду». Отдельная форма werden + Infinitiv нужна редко, в основном для предсказаний и обещаний.',
      table: {
        head: ['Лицо', 'machen', 'fahren (сильный)', 'sein', 'haben'],
        rows: [
          ['ich', 'mache', 'fahre', 'bin', 'habe'],
          ['du', 'machst', 'fährst', 'bist', 'hast'],
          ['er/sie/es', 'macht', 'fährt', 'ist', 'hat'],
          ['wir', 'machen', 'fahren', 'sind', 'haben'],
          ['ihr', 'macht', 'fahrt', 'seid', 'habt'],
          ['sie/Sie', 'machen', 'fahren', 'sind', 'haben'],
        ],
      },
      examples: [
        { text: 'Ich arbeite in Berlin.', ru: 'Я работаю в Берлине.', when: 'Обычное положение дел.' },
        { text: 'Was machst du gerade?', ru: 'Что ты сейчас делаешь?', when: 'Действие в момент речи — отдельной формы для него нет.' },
        { text: 'Er fährt jeden Tag mit dem Rad.', ru: 'Он каждый день ездит на велосипеде.', when: 'Сильный глагол: a → ä в третьем лице.' },
        { text: 'Sie spricht drei Sprachen.', ru: 'Она говорит на трёх языках.', when: 'e → i у sprechen.' },
        { text: 'Morgen fahre ich nach Hamburg.', ru: 'Завтра я еду в Гамбург.', when: 'Настоящее время в значении будущего — норма.' },
        { text: 'Wir haben keine Zeit.', ru: 'У нас нет времени.', when: 'haben — неправильный, учится наизусть.' },
        { text: 'Seid ihr schon da?', ru: 'Вы уже здесь?', when: 'Форма ihr у sein выпадает из логики — seid.' },
        { text: 'Der Kurs beginnt um neun.', ru: 'Курс начинается в девять.', when: 'Расписание — всегда настоящее время.' },
      ],
      pitfall:
        'Попытка построить аналог английского Present Continuous: «Ich bin arbeiten» — так не говорят. Немецкий обходится настоящим временем и словами gerade, jetzt, im Moment.',
      quiz: [
        {
          q: 'Как будет «он читает»?',
          options: ['er lest', 'er liest', 'er lesst'],
          answer: 1,
          why: 'lesen — сильный глагол с чередованием e → ie: du liest, er liest.',
        },
      ],
    },
    {
      id: 'de-modalverben',
      chapter: 'Глагол',
      level: 'A1',
      form: 'können, müssen, dürfen, sollen, wollen, mögen',
      title: 'Модальные глаголы',
      short: 'Могу, должен, можно, следует, хочу',
      attach: 'модальный на второй позиции, смысловой инфинитив — в конец',
      rule:
        'Модальный глагол спрягается и стоит на второй позиции, а смысловой уходит в конец предложения в инфинитиве: Ich muss heute länger arbeiten. Это первая встреча с немецкой рамкой, и она никуда не денется дальше.\n\nВ единственном числе у модальных меняется корневая гласная и нет окончания в первом и третьем лице: ich kann, er kann (не «kannt»).\n\nСамая дорогая пара — müssen и dürfen в отрицании. nicht müssen значит «не обязательно», а «нельзя» — только nicht dürfen. Sie müssen nicht kommen — «можете не приходить»; Sie dürfen nicht kommen — «вам нельзя приходить».',
      table: {
        head: ['', 'können', 'müssen', 'dürfen', 'wollen', 'sollen', 'mögen'],
        rows: [
          ['ich', 'kann', 'muss', 'darf', 'will', 'soll', 'mag'],
          ['du', 'kannst', 'musst', 'darfst', 'willst', 'sollst', 'magst'],
          ['er', 'kann', 'muss', 'darf', 'will', 'soll', 'mag'],
          ['wir', 'können', 'müssen', 'dürfen', 'wollen', 'sollen', 'mögen'],
        ],
      },
      examples: [
        { text: 'Ich kann nicht kommen.', ru: 'Я не могу прийти.', when: 'Физическая невозможность или занятость.' },
        { text: 'Sie müssen das Formular ausfüllen.', ru: 'Вам нужно заполнить формуляр.', when: 'Ведомственная обязанность.' },
        { text: 'Sie müssen nicht warten.', ru: 'Вам не обязательно ждать.', when: 'Именно «не обязательно», а не «нельзя».' },
        { text: 'Hier darf man nicht rauchen.', ru: 'Здесь нельзя курить.', when: 'Запрет — только через dürfen.' },
        { text: 'Ich möchte einen Kaffee.', ru: 'Я хотел бы кофе.', when: 'Вежливый заказ; ich will звучит требовательно.' },
        { text: 'Was soll ich machen?', ru: 'Что мне делать?', when: 'Спрашиваете о чужом ожидании или указании.' },
        { text: 'Kannst du mir helfen?', ru: 'Можешь мне помочь?', when: 'Обычная просьба между знакомыми.' },
        { text: 'Ich mag keinen Kaffee.', ru: 'Я не люблю кофе.', when: 'mögen без инфинитива — о вкусах.' },
      ],
      pitfall:
        '«Нельзя» через müssen: Sie müssen nicht rauchen немец поймёт как «курить не обязательно». Запрет — nicht dürfen, и путаница здесь бывает дорогой.',
      contrast: [{ with: 'de-satzklammer', note: 'Модальные — самый частый случай рамки: спрягаемое на второй позиции, инфинитив в конце.' }],
      quiz: [
        {
          q: '«Здесь нельзя парковаться» —',
          options: ['Hier muss man nicht parken.', 'Hier darf man nicht parken.', 'Hier kann man nicht parken.'],
          answer: 1,
          why: 'Запрет выражается nicht dürfen; nicht müssen значит «не обязательно».',
        },
      ],
    },
    {
      id: 'de-trennbare',
      chapter: 'Глагол',
      level: 'A2',
      form: 'auf|stehen, an|rufen, ein|kaufen',
      title: 'Отделяемые приставки',
      short: 'Приставка уезжает в конец предложения',
      attach: 'приставка перед глаголом в инфинитиве, в конце — в предложении',
      rule:
        'В инфинитиве глагол выглядит целым (aufstehen), а в предложении разваливается: спрягаемая часть встаёт на второе место, приставка — в самый конец. Ich stehe um sieben auf.\n\nПриставка отделяется, если на неё падает ударение: AUFstehen, ANrufen, EINkaufen. Не отделяются безударные ver-, be-, ent-, er-, zer-, ge-, emp-, miss-.\n\nВ перфекте ge- встаёт между приставкой и корнем: aufgestanden, angerufen. В придаточном предложении глагол собирается обратно целиком: …, weil ich um sieben aufstehe.',
      examples: [
        { text: 'Ich stehe um sieben auf.', ru: 'Я встаю в семь.', when: 'Обычное повествовательное предложение.' },
        { text: 'Rufen Sie mich morgen an.', ru: 'Позвоните мне завтра.', when: 'Повелительное — приставка тоже в конце.' },
        { text: 'Der Zug kommt um zehn an.', ru: 'Поезд прибывает в десять.', when: 'ankommen о транспорте.' },
        { text: 'Wir kaufen am Samstag ein.', ru: 'Мы закупаемся в субботу.', when: 'einkaufen без дополнения.' },
        { text: 'Ich habe ihn gestern angerufen.', ru: 'Я вчера ему звонил.', when: 'В перфекте ge- внутри слова.' },
        { text: 'Er sagt, dass er später zurückkommt.', ru: 'Он говорит, что вернётся позже.', when: 'В придаточном глагол снова целый.' },
        { text: 'Füllen Sie bitte das Formular aus.', ru: 'Заполните, пожалуйста, формуляр.', when: 'Ведомственная фраза, которую слышат все.' },
        { text: 'Steigen Sie am Hauptbahnhof um.', ru: 'Пересаживайтесь на главном вокзале.', when: 'umsteigen в объявлении.' },
      ],
      pitfall:
        'Приставку забывают договорить: «Ich stehe um sieben» — по-немецки это «я стою в семь». Смысл держится именно на последнем слове фразы, и произносить его надо обязательно.',
      quiz: [
        {
          q: 'Как правильно: «Я звоню маме»?',
          options: ['Ich anrufe meine Mutter.', 'Ich rufe meine Mutter an.', 'Ich rufe an meine Mutter.'],
          answer: 1,
          why: 'Спрягаемая часть на втором месте, отделяемая приставка — в самом конце.',
        },
      ],
    },
    {
      id: 'de-perfekt',
      chapter: 'Прошедшее время',
      level: 'A2',
      form: 'haben/sein + Partizip II',
      title: 'Перфект — обычное прошедшее в речи',
      short: 'Так рассказывают о прошлом вслух',
      attach: 'вспомогательный на второй позиции, причастие в конце',
      rule:
        'В разговоре немцы почти всегда говорят о прошлом перфектом: Ich habe gestern gearbeitet. Претеритум остаётся книге, газете и глаголам sein, haben, модальным.\n\nПричастие II: слабые глаголы — ge- + основа + -t (gemacht, gearbeitet), сильные — ge- + основа с чередованием + -en (gegangen, gesprochen). Глаголы на -ieren и с неотделяемой приставкой ge- не получают вовсе: studiert, bekommen, verstanden.\n\nВспомогательный глагол выбирается так: sein берут глаголы движения и смены состояния (gehen, fahren, kommen, aufstehen, werden, bleiben, sein), все остальные — haben.',
      table: {
        head: ['Тип', 'Инфинитив', 'Partizip II', 'Вспомогательный'],
        rows: [
          ['слабый', 'machen', 'gemacht', 'haben'],
          ['сильный', 'sprechen', 'gesprochen', 'haben'],
          ['движение', 'fahren', 'gefahren', 'sein'],
          ['на -ieren', 'studieren', 'studiert', 'haben'],
          ['неотделяемая', 'verstehen', 'verstanden', 'haben'],
          ['отделяемая', 'aufstehen', 'aufgestanden', 'sein'],
        ],
      },
      examples: [
        { text: 'Ich habe gestern lange gearbeitet.', ru: 'Я вчера долго работал.', when: 'Обычный рассказ о вчерашнем дне.' },
        { text: 'Wir sind nach Berlin gefahren.', ru: 'Мы ездили в Берлин.', when: 'Движение — вспомогательный sein.' },
        { text: 'Er ist um sechs aufgestanden.', ru: 'Он встал в шесть.', when: 'Смена состояния плюс отделяемая приставка.' },
        { text: 'Hast du das Formular ausgefüllt?', ru: 'Ты заполнил формуляр?', when: 'Вопрос в перфекте.' },
        { text: 'Ich habe in München studiert.', ru: 'Я учился в Мюнхене.', when: 'Глагол на -ieren — без ge-.' },
        { text: 'Sie hat mich nicht verstanden.', ru: 'Она меня не поняла.', when: 'Неотделяемая приставка — без ge-.' },
        { text: 'Wir sind zu Hause geblieben.', ru: 'Мы остались дома.', when: 'bleiben — исключение, идёт с sein.' },
        { text: 'Was hast du am Wochenende gemacht?', ru: 'Что ты делал на выходных?', when: 'Главный вопрос немецкого смолтока в понедельник.' },
      ],
      pitfall:
        'Вспомогательный по аналогии с русским: «Ich habe nach Berlin gefahren» — ошибка, движение требует sein. И вторая: причастие ставят сразу за подлежащим, забывая, что его место — конец предложения.',
      contrast: [{ with: 'de-praeteritum', note: 'Перфект — устная речь и письма; претеритум — книга, новости и всегда war/hatte.' }],
      quiz: [
        {
          q: '«Я поехал домой» —',
          options: ['Ich habe nach Hause gefahren.', 'Ich bin nach Hause gefahren.', 'Ich bin nach Hause gefahrt.'],
          answer: 1,
          why: 'fahren — глагол движения, значит sein, и причастие сильное: gefahren.',
        },
      ],
    },
    {
      id: 'de-praeteritum',
      chapter: 'Прошедшее время',
      level: 'B1',
      form: 'war, hatte, konnte, machte, ging',
      title: 'Претеритум',
      short: 'Прошедшее книги, новостей — и всегда у sein, haben, модальных',
      attach: 'к основе глагола',
      rule:
        'Претеритум — простое прошедшее: ich machte, ich ging. В устной речи Германии он почти вытеснен перфектом, но у нескольких глаголов остался единственно нормальным: sein (war), haben (hatte), werden (wurde), модальные (konnte, musste, wollte, durfte, sollte).\n\nСлабые глаголы: основа + -te (machte, arbeitete). Сильные: изменение корня без окончания в первом и третьем лице (ging, kam, sah, sprach).\n\nВ книгах, статьях и новостях претеритум основной — поэтому читать его надо уметь, даже если сами вы говорите перфектом.',
      table: {
        head: ['Инфинитив', 'Претеритум', 'Пример'],
        rows: [
          ['sein', 'war', 'Ich war müde'],
          ['haben', 'hatte', 'Er hatte keine Zeit'],
          ['werden', 'wurde', 'Es wurde kalt'],
          ['können', 'konnte', 'Ich konnte nicht kommen'],
          ['gehen', 'ging', 'Sie ging nach Hause'],
          ['machen', 'machte', 'Wir machten eine Pause'],
        ],
      },
      examples: [
        { text: 'Ich war gestern krank.', ru: 'Я вчера болел.', when: 'sein в прошедшем — только war, перфекта тут не говорят.' },
        { text: 'Er hatte keine Zeit.', ru: 'У него не было времени.', when: 'haben — тоже претеритум даже в устной речи.' },
        { text: 'Ich konnte leider nicht kommen.', ru: 'Я, к сожалению, не смог прийти.', when: 'Модальные в прошедшем — претеритум.' },
        { text: 'Es war einmal ein König.', ru: 'Жил-был король.', when: 'Начало сказки — фирменный претеритум Гриммов.' },
        { text: 'Die Regierung beschloss neue Regeln.', ru: 'Правительство приняло новые правила.', when: 'Язык новостей.' },
        { text: 'Sie ging ins Zimmer und schloss die Tür.', ru: 'Она вошла в комнату и закрыла дверь.', when: 'Повествование в книге.' },
        { text: 'Wir mussten lange warten.', ru: 'Нам пришлось долго ждать.', when: 'müssen в прошедшем.' },
        { text: 'Damals wohnte ich in Kasan.', ru: 'Тогда я жил в Казани.', when: 'Рассказ о давнем прошлом — допустим и претеритум.' },
      ],
      pitfall:
        'Пытаться говорить прошедшее претеритумом целиком, как в учебнике: «Ich machte, ich ging, ich sagte» в разговоре звучит как чтение вслух. Живая речь — перфект, кроме war, hatte и модальных.',
      quiz: [
        {
          q: 'Как естественнее сказать «я вчера был дома»?',
          options: ['Ich bin gestern zu Hause gewesen.', 'Ich war gestern zu Hause.', 'Ich habe gestern zu Hause gewesen.'],
          answer: 1,
          why: 'У sein в разговоре используется претеритум war; перфект gewesen тоже существует, но звучит тяжелее.',
        },
      ],
    },
    {
      id: 'de-satzklammer',
      chapter: 'Порядок слов',
      level: 'A1',
      form: 'глагол на 2-м месте, вторая часть — в конце',
      title: 'Рамка предложения',
      short: 'Главный закон немецкого предложения',
      attach: 'ко всему предложению',
      rule:
        'Спрягаемый глагол в повествовательном предложении стоит строго на второй позиции — не вторым словом, а вторым членом: Morgen fahre ich nach Berlin. Если впереди стоит обстоятельство, подлежащее уезжает за глагол.\n\nВсё, что относится к глаголу и не спрягается — инфинитив, причастие, отделяемая приставка, — уходит в самый конец. Между ними натянута рамка, и внутри неё лежит всё остальное: Ich habe gestern mit meinem Bruder über die Wohnung gesprochen.\n\nЭто объясняет, почему немца надо дослушивать до конца: смысл («позвонил» или «не позвонил», «встал» или «стоял») решается последним словом.',
      table: {
        head: ['Позиция 1', 'Позиция 2', 'Середина', 'Конец'],
        rows: [
          ['Ich', 'habe', 'gestern lange', 'gearbeitet'],
          ['Morgen', 'fahre', 'ich nach Berlin', '—'],
          ['Er', 'will', 'heute früher', 'gehen'],
          ['Wir', 'stehen', 'um sieben', 'auf'],
        ],
      },
      examples: [
        { text: 'Heute habe ich viel zu tun.', ru: 'Сегодня у меня много дел.', when: 'Обстоятельство впереди — подлежащее после глагола.' },
        { text: 'Ich will morgen früher aufstehen.', ru: 'Я хочу завтра встать пораньше.', when: 'Модальный + инфинитив с приставкой в конце.' },
        { text: 'Nach der Arbeit gehe ich einkaufen.', ru: 'После работы я иду за покупками.', when: 'Инверсия после обстоятельства.' },
        { text: 'Er hat mir gestern das Formular gegeben.', ru: 'Он вчера дал мне формуляр.', when: 'Классическая рамка haben … gegeben.' },
        { text: 'Kommst du mit?', ru: 'Ты идёшь с нами?', when: 'В вопросе без вопросительного слова глагол выходит на первое место.' },
        { text: 'Warum bist du nicht gekommen?', ru: 'Почему ты не пришёл?', when: 'С вопросительным словом глагол снова второй.' },
        { text: 'Am Montag muss ich zum Amt gehen.', ru: 'В понедельник мне нужно в ведомство.', when: 'Обстоятельство → глагол → подлежащее.' },
        { text: 'Mach bitte das Fenster zu.', ru: 'Закрой, пожалуйста, окно.', when: 'Повелительное: глагол первый, приставка последняя.' },
      ],
      pitfall:
        'Русский порядок «подлежащее — сказуемое» переносят механически: «Morgen ich fahre nach Berlin». Немец поймёт, но это первая и самая заметная ошибка иностранца.',
      contrast: [{ with: 'de-nebensatz', note: 'В придаточном рамка схлопывается: глагол уходит в самый конец целиком.' }],
      quiz: [
        {
          q: 'Как правильно?',
          options: ['Heute ich gehe ins Kino.', 'Heute gehe ich ins Kino.', 'Ich heute gehe ins Kino.'],
          answer: 1,
          why: 'Глагол держит вторую позицию, поэтому подлежащее переезжает за него.',
        },
      ],
    },
    {
      id: 'de-nebensatz',
      chapter: 'Порядок слов',
      level: 'B1',
      form: 'weil, dass, wenn, obwohl … + глагол в конце',
      title: 'Придаточное предложение',
      short: 'После этих союзов глагол уезжает в самый конец',
      attach: 'к придаточной части',
      rule:
        'Подчинительные союзы (weil, dass, wenn, als, obwohl, damit, ob, bevor, nachdem, während, seit) отправляют спрягаемый глагол в конец придаточного: Ich komme später, weil ich noch arbeiten muss.\n\nСочинительные (und, aber, oder, denn, sondern) порядок не меняют вовсе — это самая полезная развилка: denn и weil переводятся одинаково, а ведут себя противоположно.\n\nЕсли придаточное стоит первым, всё оно занимает первую позицию, и главное начинается сразу с глагола: Weil es regnet, bleiben wir zu Hause.',
      table: {
        head: ['Союз', 'Что делает', 'Пример'],
        rows: [
          ['und, aber, oder, denn', 'порядок не меняет', 'Ich bleibe, denn es regnet'],
          ['weil, dass, wenn, obwohl', 'глагол в конец', 'Ich bleibe, weil es regnet'],
          ['deshalb, deswegen, trotzdem', 'глагол сразу после', 'Es regnet, deshalb bleibe ich'],
        ],
      },
      examples: [
        { text: 'Ich weiß, dass er heute kommt.', ru: 'Я знаю, что он сегодня придёт.', when: 'dass — самый частый союз в речи.' },
        { text: 'Wir bleiben zu Hause, weil es regnet.', ru: 'Мы остаёмся дома, потому что идёт дождь.', when: 'Причина через weil.' },
        { text: 'Es regnet, denn der Himmel ist grau.', ru: 'Идёт дождь, ведь небо серое.', when: 'denn — та же причина, но порядок обычный.' },
        { text: 'Wenn ich Zeit habe, rufe ich dich an.', ru: 'Если у меня будет время, я тебе позвоню.', when: 'Придаточное впереди — главное начинается с глагола.' },
        { text: 'Als ich Kind war, wohnten wir in Kasan.', ru: 'Когда я был ребёнком, мы жили в Казани.', when: 'als — однократное прошлое, wenn — повторяющееся.' },
        { text: 'Ich frage, ob der Termin noch frei ist.', ru: 'Я спрошу, свободна ли ещё запись.', when: 'ob — косвенный вопрос без вопросительного слова.' },
        { text: 'Obwohl es teuer ist, kaufe ich es.', ru: 'Хотя это дорого, я это куплю.', when: 'Уступка.' },
        { text: 'Ich lerne Deutsch, damit ich hier arbeiten kann.', ru: 'Я учу немецкий, чтобы работать здесь.', when: 'Цель; при одном подлежащем возможно um … zu.' },
      ],
      pitfall:
        'Weil с обычным порядком слов («weil ich muss arbeiten») — калька с русского. В разговорной речи немцы иногда так говорят сами, но в письме и на экзамене это ошибка.',
      quiz: [
        {
          q: 'Как правильно?',
          options: ['Ich bleibe zu Hause, weil ich bin krank.', 'Ich bleibe zu Hause, weil ich krank bin.', 'Ich bleibe zu Hause, weil bin ich krank.'],
          answer: 1,
          why: 'После weil спрягаемый глагол уходит в конец придаточного.',
        },
      ],
    },
    {
      id: 'de-negation',
      chapter: 'Порядок слов',
      level: 'A2',
      form: 'nicht / kein',
      title: 'Отрицание и место nicht',
      short: 'Что отрицаем — тем и отрицаем, и место у nicht не произвольное',
      attach: 'к глаголу, прилагательному или обстоятельству',
      rule:
        'Существительное отрицается артиклем kein, всё остальное — словом nicht.\n\nМесто nicht не свободно: перед тем, что отрицается конкретно (nicht heute, nicht gut, nicht mit dir), и в конце предложения, если отрицается всё высказывание: Ich kenne ihn nicht. Перед второй частью рамки (инфинитивом, причастием, приставкой) nicht встаёт всегда: Ich habe ihn nicht gesehen.\n\nОтдельно стоит doch — ответ «нет, наоборот» на отрицательный вопрос: в русском такого слова нет, и его отсутствие делает ответ двусмысленным.',
      examples: [
        { text: 'Ich habe keine Zeit.', ru: 'У меня нет времени.', when: 'Отрицается существительное — kein.' },
        { text: 'Ich komme heute nicht.', ru: 'Я сегодня не приду.', when: 'Отрицается всё высказывание — nicht в конце.' },
        { text: 'Ich komme nicht heute, sondern morgen.', ru: 'Я приду не сегодня, а завтра.', when: 'Отрицается именно «сегодня» — nicht перед ним.' },
        { text: 'Das ist nicht gut.', ru: 'Это нехорошо.', when: 'Перед прилагательным.' },
        { text: 'Ich habe ihn nicht gesehen.', ru: 'Я его не видел.', when: 'Перед причастием в конце рамки.' },
        { text: 'Er darf nicht rauchen.', ru: 'Ему нельзя курить.', when: 'Перед инфинитивом.' },
        { text: 'Kommst du nicht mit? — Doch!', ru: 'Ты не идёшь с нами? — Иду!', when: 'doch отменяет отрицание в вопросе.' },
        { text: 'Ich mag das gar nicht.', ru: 'Мне это совсем не нравится.', when: 'gar nicht — усиленное отрицание.' },
      ],
      pitfall:
        'Двойное отрицание по-русски: «Ich habe nichts nicht gemacht». В немецком отрицание одно: Ich habe nichts gemacht.',
      quiz: [
        {
          q: '«Я его не знаю» —',
          options: ['Ich nicht kenne ihn.', 'Ich kenne ihn nicht.', 'Ich kenne kein ihn.'],
          answer: 1,
          why: 'Отрицается всё высказывание, значит nicht в конце; kein к местоимению не относится.',
        },
      ],
    },
    {
      id: 'de-adjektiv',
      chapter: 'Прилагательные',
      level: 'B1',
      form: '-e, -en, -er, -es',
      title: 'Склонение прилагательного',
      short: 'Окончание зависит от того, что стоит перед ним',
      attach: 'между артиклем и существительным',
      rule:
        'Прилагательное меняется, только когда стоит перед существительным. После sein оно голое: Das Haus ist neu.\n\nЛогика одна: грамматика должна прозвучать один раз. Если артикль уже показал род и падеж (der, die, das), прилагательному хватает слабого окончания -e или -en. Если артикля нет или он не показывает (ein), прилагательное берёт окончание артикля на себя: ein neuer Wagen, kaltes Wasser.\n\nПрактический вывод: в Dativ и во множественном числе почти всегда -en, и это закрывает половину случаев.',
      table: {
        head: ['Перед словом', 'муж.', 'жен.', 'ср.', 'мн.'],
        rows: [
          ['der / die / das (Nom.)', 'der neue', 'die neue', 'das neue', 'die neuen'],
          ['ein / eine (Nom.)', 'ein neuer', 'eine neue', 'ein neues', 'keine neuen'],
          ['без артикля (Nom.)', 'guter Wein', 'gute Milch', 'gutes Wasser', 'gute Ideen'],
          ['любой (Dativ)', 'dem neuen', 'der neuen', 'dem neuen', 'den neuen'],
        ],
      },
      examples: [
        { text: 'Das ist ein guter Plan.', ru: 'Это хороший план.', when: 'ein не показывает род — окончание берёт прилагательное.' },
        { text: 'Der neue Kollege kommt morgen.', ru: 'Новый коллега придёт завтра.', when: 'Артикль показал всё — слабое -e.' },
        { text: 'Ich trinke kalten Kaffee nicht.', ru: 'Холодный кофе я не пью.', when: 'Akkusativ мужского рода без артикля.' },
        { text: 'Wir wohnen in einer kleinen Wohnung.', ru: 'Мы живём в маленькой квартире.', when: 'Dativ — окончание -en.' },
        { text: 'Sie hat schöne Augen.', ru: 'У неё красивые глаза.', when: 'Множественное без артикля.' },
        { text: 'Das Wetter ist schön.', ru: 'Погода хорошая.', when: 'После sein прилагательное не склоняется вовсе.' },
        { text: 'Mit freundlichen Grüßen', ru: 'С уважением', when: 'Стандартная подпись письма — Dativ множественного.' },
        { text: 'Ich suche eine möblierte Wohnung.', ru: 'Я ищу меблированную квартиру.', when: 'Женский род в Akkusativ.' },
      ],
      pitfall:
        'Склонять прилагательное после sein: «Das Haus ist neues» — так не говорят. Меняется только то, что стоит ПЕРЕД существительным.',
      quiz: [
        {
          q: '«Я живу в маленькой квартире» —',
          options: ['in eine kleine Wohnung', 'in einer kleinen Wohnung', 'in einer kleine Wohnung'],
          answer: 1,
          why: 'Положение (wo?) требует Dativ, а в Dativ прилагательное всегда получает -en.',
        },
      ],
    },
    {
      id: 'de-komparativ',
      chapter: 'Прилагательные',
      level: 'A2',
      form: '-er, am -sten',
      title: 'Степени сравнения',
      short: 'Больше, самый большой, такой же',
      attach: 'к прилагательному и наречию',
      rule:
        'Сравнительная степень — окончание -er (schnell → schneller), превосходная — am …-sten (am schnellsten) или der/die/das …-ste перед существительным.\n\nКороткие односложные прилагательные часто получают умлаут: alt → älter → am ältesten; groß → größer → am größten. Неправильные: gut → besser → am besten, viel → mehr → am meisten, gern → lieber → am liebsten, hoch → höher, nah → näher.\n\nСравнение вводится словом als: größer als. Равенство — so … wie: so groß wie. Путать als и wie — самая частая ошибка в этой теме.',
      table: {
        head: ['Основа', 'Сравнительная', 'Превосходная'],
        rows: [
          ['schnell', 'schneller', 'am schnellsten'],
          ['alt', 'älter', 'am ältesten'],
          ['gut', 'besser', 'am besten'],
          ['viel', 'mehr', 'am meisten'],
          ['gern', 'lieber', 'am liebsten'],
        ],
      },
      examples: [
        { text: 'Der Zug ist schneller als der Bus.', ru: 'Поезд быстрее автобуса.', when: 'Сравнение — с als.' },
        { text: 'Berlin ist so groß wie …', ru: 'Берлин такой же большой, как …', when: 'Равенство — so … wie.' },
        { text: 'Das ist die beste Lösung.', ru: 'Это лучшее решение.', when: 'Превосходная перед существительным.' },
        { text: 'Ich trinke lieber Tee.', ru: 'Я предпочитаю чай.', when: 'lieber — стандартный способ сказать «предпочитаю».' },
        { text: 'Am liebsten bleibe ich zu Hause.', ru: 'Больше всего я люблю оставаться дома.', when: 'Превосходная от gern.' },
        { text: 'Es wird immer kälter.', ru: 'Становится всё холоднее.', when: 'immer + сравнительная — нарастание.' },
        { text: 'Je früher, desto besser.', ru: 'Чем раньше, тем лучше.', when: 'Устойчивая конструкция сравнения.' },
        { text: 'Diese Wohnung ist teurer.', ru: 'Эта квартира дороже.', when: 'teuer теряет -e- в сравнительной: teurer.' },
      ],
      pitfall:
        'Wie вместо als: «größer wie» — распространено в разговорной речи, но считается ошибкой. Сравнение неравного — als, равного — wie.',
      quiz: [
        {
          q: '«Он старше меня» —',
          options: ['Er ist älter wie ich.', 'Er ist älter als ich.', 'Er ist alter als mich.'],
          answer: 1,
          why: 'Неравное сравнение вводится als, а сравниваемое стоит в Nominativ: als ich.',
        },
      ],
    },
    {
      id: 'de-konjunktiv2',
      chapter: 'Наклонение и залог',
      level: 'B1',
      form: 'würde + Infinitiv, hätte, wäre, könnte',
      title: 'Konjunktiv II — вежливость и «бы»',
      short: 'Просьба, совет, нереальное условие',
      attach: 'к глаголу',
      rule:
        'Konjunktiv II делает две работы: выражает нереальное («если бы») и — гораздо чаще — вежливость. Ich hätte gern einen Kaffee вместо Ich will einen Kaffee: это разница между «я бы хотел» и «я хочу».\n\nОбразуется у большинства глаголов как würde + инфинитив, но у частотных есть свои формы: sein → wäre, haben → hätte, können → könnte, müssen → müsste, werden → würde.\n\nВ ведомстве, магазине и письме используется постоянно: Könnten Sie mir helfen? — самая вежливая просьба, которую вы можете произнести.',
      table: {
        head: ['Глагол', 'Konjunktiv II', 'Пример'],
        rows: [
          ['sein', 'wäre', 'Das wäre schön'],
          ['haben', 'hätte', 'Ich hätte gern …'],
          ['können', 'könnte', 'Könnten Sie …?'],
          ['werden', 'würde', 'Ich würde sagen …'],
          ['остальные', 'würde + Inf.', 'Ich würde das nicht machen'],
        ],
      },
      examples: [
        { text: 'Ich hätte gern einen Kaffee.', ru: 'Я бы хотел кофе.', when: 'Стандартный вежливый заказ.' },
        { text: 'Könnten Sie mir bitte helfen?', ru: 'Не могли бы вы мне помочь?', when: 'Самая вежливая просьба.' },
        { text: 'Das wäre sehr nett.', ru: 'Это было бы очень любезно.', when: 'Смягчение просьбы.' },
        { text: 'An deiner Stelle würde ich warten.', ru: 'На твоём месте я бы подождал.', when: 'Совет.' },
        { text: 'Wenn ich Zeit hätte, würde ich kommen.', ru: 'Если бы у меня было время, я бы пришёл.', when: 'Нереальное условие.' },
        { text: 'Ich würde sagen, das ist zu teuer.', ru: 'Я бы сказал, это слишком дорого.', when: 'Смягчение собственного мнения.' },
        { text: 'Hätten Sie einen Moment Zeit?', ru: 'У вас найдётся минута?', when: 'Вежливое обращение к занятому человеку.' },
        { text: 'Es müsste eigentlich funktionieren.', ru: 'Вообще-то это должно работать.', when: 'Предположение с сомнением.' },
      ],
      pitfall:
        'Просить в настоящем времени: Ich will, Geben Sie mir. Грамматически верно, по-немецки — грубовато. Вежливость здесь не интонация, а форма глагола.',
      quiz: [
        {
          q: 'Как вежливее заказать?',
          options: ['Ich will einen Tee.', 'Ich hätte gern einen Tee.', 'Geben Sie mir einen Tee.'],
          answer: 1,
          why: 'Konjunktiv II hätte gern — стандартная вежливая формула заказа.',
        },
      ],
    },
    {
      id: 'de-passiv',
      chapter: 'Наклонение и залог',
      level: 'B1',
      form: 'werden + Partizip II',
      title: 'Пассив',
      short: 'Язык объявлений, инструкций и ведомственных писем',
      attach: 'к глаголу',
      rule:
        'Пассив строится как werden + Partizip II: Das Formular wird ausgefüllt. В прошедшем — wurde: Der Antrag wurde abgelehnt.\n\nЭто не книжная экзотика: именно так написаны объявления, инструкции и почти всё, что приходит из ведомства. Уметь его читать важнее, чем говорить им.\n\nИсполнитель называется редко и вводится через von (кем) или durch (чем): Der Brief wurde von der Behörde geschickt. Разговорная альтернатива — man: Man macht das so.',
      examples: [
        { text: 'Hier wird nicht geraucht.', ru: 'Здесь не курят.', when: 'Объявление; исполнитель не важен.' },
        { text: 'Das Formular wird ausgefüllt und unterschrieben.', ru: 'Формуляр заполняется и подписывается.', when: 'Инструкция.' },
        { text: 'Der Antrag wurde abgelehnt.', ru: 'Заявление было отклонено.', when: 'Письмо из ведомства — фраза, которую стоит узнавать сразу.' },
        { text: 'Die Straße wird repariert.', ru: 'Улицу ремонтируют.', when: 'Табличка на дороге.' },
        { text: 'Das Paket wurde gestern zugestellt.', ru: 'Посылка была доставлена вчера.', when: 'Уведомление службы доставки.' },
        { text: 'Der Brief wurde von der Behörde geschickt.', ru: 'Письмо было отправлено ведомством.', when: 'Исполнитель через von.' },
        { text: 'Man macht das hier so.', ru: 'Здесь так принято.', when: 'Разговорная замена пассиву.' },
        { text: 'Die Wohnung muss renoviert werden.', ru: 'Квартиру нужно отремонтировать.', when: 'Пассив с модальным — частая формула договора аренды.' },
      ],
      pitfall:
        'Путать werden (становиться / пассив) и bekommen (получать): «Ich bekomme müde» вместо Ich werde müde. Bekommen — это только «получать», сколько бы оно ни напоминало английское become.',
      quiz: [
        {
          q: '«Заявление было отклонено» —',
          options: ['Der Antrag ist abgelehnt worden.', 'Der Antrag hat abgelehnt.', 'Der Antrag wurde abgelehnt.'],
          answer: 2,
          why: 'Пассив в прошедшем — wurde + Partizip II. Первый вариант тоже возможен, но громоздок и в письмах не используется.',
        },
      ],
    },
    {
      id: 'de-imperativ',
      chapter: 'Глагол',
      level: 'A2',
      form: 'Machen Sie! / Mach! / Macht!',
      title: 'Повелительное наклонение',
      short: 'Просьба и указание — три формы по адресату',
      attach: 'к основе глагола',
      rule:
        'Три формы по тому, к кому обращаются. Вежливая: инфинитив + Sie — Kommen Sie bitte. На «ты»: голая основа без окончания — Komm! Ко многим на «ты»: основа + -t — Kommt!\n\nСильные глаголы с чередованием e → i сохраняют его в форме du: sprechen → Sprich!, nehmen → Nimm!, geben → Gib!. А вот умлаут в императиве не появляется: fahren → Fahr! (не Fähr).\n\nBitte здесь не украшение, а обязательная часть просьбы: без него императив звучит как команда.',
      examples: [
        { text: 'Kommen Sie bitte herein.', ru: 'Проходите, пожалуйста.', when: 'Вежливое приглашение войти.' },
        { text: 'Warten Sie einen Moment.', ru: 'Подождите минуту.', when: 'В кабинете и по телефону.' },
        { text: 'Mach bitte das Fenster zu.', ru: 'Закрой, пожалуйста, окно.', when: 'На «ты», с отделяемой приставкой в конце.' },
        { text: 'Sprich lauter, bitte.', ru: 'Говори громче, пожалуйста.', when: 'Чередование e → i сохраняется.' },
        { text: 'Nimm den Schlüssel mit.', ru: 'Возьми ключ с собой.', when: 'nehmen → Nimm.' },
        { text: 'Fahrt vorsichtig!', ru: 'Езжайте осторожно!', when: 'Обращение к нескольким на «ты».' },
        { text: 'Seien Sie so nett.', ru: 'Будьте так добры.', when: 'sein — единственная неправильная форма: seien Sie.' },
        { text: 'Gehen wir!', ru: 'Пойдём!', when: 'Форма wir — предложение сделать вместе.' },
      ],
      pitfall:
        'Ставить окончание в форме du: «Kommst du her» вместо Komm her. И обратная крайность — обращаться к незнакомому на du: даже безупречно построенный императив в форме «ты» будет невежливым.',
      quiz: [
        {
          q: 'Как вежливо попросить незнакомого помочь?',
          options: ['Hilf mir!', 'Helfen Sie mir bitte.', 'Du hilfst mir.'],
          answer: 1,
          why: 'Вежливый императив — инфинитив + Sie, и bitte здесь обязательно.',
        },
      ],
    },
    {
      id: 'de-genitiv',
      chapter: 'Падежи',
      level: 'B1',
      form: 'des …-(e)s, der …',
      title: 'Genitiv',
      short: 'Принадлежность — в письме; в речи её вытеснил von',
      attach: 'к существительному',
      rule:
        'Genitiv отвечает на вопрос wessen? — чей: das Auto des Vaters, die Farbe der Wand. В мужском и среднем роде само существительное получает -(e)s.\n\nВ живой речи он почти вытеснен конструкцией von + Dativ: das Auto von meinem Vater. Есть даже поговорка «Der Dativ ist dem Genitiv sein Tod». Но в письме, в договорах и в заголовках Genitiv на месте, и читать его надо уметь.\n\nЕго требуют предлоги wegen, während, trotz, statt, innerhalb — хотя в разговоре их всё чаще ставят с Dativ.',
      examples: [
        { text: 'Das ist das Auto meines Vaters.', ru: 'Это машина моего отца.', when: 'Письменная норма.' },
        { text: 'Das ist das Auto von meinem Vater.', ru: 'Это машина моего отца.', when: 'То же самое в разговоре.' },
        { text: 'Wegen des Wetters bleiben wir hier.', ru: 'Из-за погоды мы остаёмся здесь.', when: 'wegen + Genitiv.' },
        { text: 'Während der Arbeit darf man nicht telefonieren.', ru: 'Во время работы нельзя разговаривать по телефону.', when: 'Правило внутреннего распорядка.' },
        { text: 'Trotz des Regens gehen wir spazieren.', ru: 'Несмотря на дождь, мы идём гулять.', when: 'trotz + Genitiv.' },
        { text: 'Die Farbe der Wand gefällt mir nicht.', ru: 'Цвет стены мне не нравится.', when: 'Женский род — только артикль меняется.' },
        { text: 'Innerhalb einer Woche bekommen Sie den Bescheid.', ru: 'В течение недели вы получите решение.', when: 'Ведомственная формула со сроком.' },
        { text: 'Anfang des Jahres', ru: 'в начале года', when: 'Устойчивое сочетание с Genitiv.' },
      ],
      pitfall:
        'Апостроф по-английски: «Peters Auto» правильно, «Peter’s Auto» — нет. Апостроф в немецком Genitiv не ставится (кроме имён на -s: Max’ Auto).',
      quiz: [
        {
          q: 'Как сказать «машина моего брата» в разговоре?',
          options: ['das Auto meines Bruders', 'das Auto von meinem Bruder', 'оба варианта верны'],
          answer: 2,
          why: 'Genitiv — письменная норма, von + Dativ — разговорная; оба правильны, различается регистр.',
        },
      ],
    },
    {
      id: 'de-zeitangaben',
      chapter: 'Порядок слов',
      level: 'A2',
      form: 'te-ka-mo-lo',
      title: 'Порядок обстоятельств: время — причина — образ — место',
      short: 'Почему «heute mit dem Bus in die Stadt», а не наоборот',
      attach: 'к середине предложения',
      rule:
        'Обстоятельства в немецком стоят в фиксированном порядке: temporal (когда) — kausal (почему) — modal (как) — lokal (где, куда). Немецкие школьники запоминают это как «te-ka-mo-lo».\n\nIch fahre heute wegen der Prüfung mit dem Bus in die Stadt. Переставить куски местами можно только вынеся один из них на первую позицию — тогда он подчёркивается: Heute fahre ich …\n\nДополнения в середине тоже упорядочены: Dativ раньше Akkusativ (Ich gebe dem Kind das Buch), но если оба местоимения — наоборот, Akkusativ первым: Ich gebe es ihm.',
      table: {
        head: ['te (когда)', 'ka (почему)', 'mo (как)', 'lo (где/куда)'],
        rows: [['heute', 'wegen der Prüfung', 'mit dem Bus', 'in die Stadt']],
      },
      examples: [
        { text: 'Ich fahre morgen mit dem Zug nach Köln.', ru: 'Завтра я еду поездом в Кёльн.', when: 'Время → способ → место.' },
        { text: 'Wir treffen uns um acht im Café.', ru: 'Встречаемся в восемь в кафе.', when: 'Время перед местом — всегда.' },
        { text: 'Er ist wegen der Arbeit nach Berlin gezogen.', ru: 'Он переехал в Берлин из-за работы.', when: 'Причина перед местом.' },
        { text: 'Ich gebe dem Kind das Buch.', ru: 'Я даю ребёнку книгу.', when: 'Dativ перед Akkusativ.' },
        { text: 'Ich gebe es ihm.', ru: 'Я даю это ему.', when: 'Два местоимения — Akkusativ первым.' },
        { text: 'Heute Abend gehe ich ins Kino.', ru: 'Сегодня вечером я иду в кино.', when: 'Время вынесено вперёд для акцента.' },
        { text: 'Sie arbeitet seit einem Jahr in München.', ru: 'Она год работает в Мюнхене.', when: 'Время → место.' },
        { text: 'Wir fahren jedes Jahr mit dem Auto nach Italien.', ru: 'Мы каждый год ездим на машине в Италию.', when: 'Полная цепочка te-mo-lo.' },
      ],
      pitfall:
        'Ставить место перед временем, как по-русски («Ich gehe ins Kino heute Abend»). Немец поймёт, но фраза звучит переставленной; правильный порядок — heute Abend ins Kino.',
      quiz: [
        {
          q: 'Как правильно?',
          options: ['Ich fahre nach Berlin morgen.', 'Ich fahre morgen nach Berlin.', 'Ich morgen fahre nach Berlin.'],
          answer: 1,
          why: 'Время стоит раньше места: morgen nach Berlin.',
        },
      ],
    },
  ],
}
