// ─────────────────────────────────────────────────────────────────────────────
// Аудирование: основной объём материала
//
// Стартовая библиотека (listeningLibrary.ts) показывала, как устроен формат:
// по два-три материала на язык. Для тренировки этого мало — на слух человек
// растёт от повторяющихся ситуаций, а не от одного диалога в кафе.
//
// ЧТО ЗДЕСЬ ВЫБРАНО И ПОЧЕМУ
//
//  • ЖАНРЫ, А НЕ ТЕМЫ. Ухо ломается не на словах, а на формате: объявление
//    читается быстро и без пауз, автоответчик проговаривает номер, лектор
//    отступает в сторону и возвращается. Поэтому материалы разложены по
//    жанрам — объявление, голосовое, приём у врача, планёрка, новости, —
//    и один и тот же жанр повторяется на разных уровнях.
//
//  • МОНОЛОГ ПО УМОЛЧАНИЮ. Синтез читает и подпись говорящего («Продавец:»),
//    поэтому диалогов здесь меньше, чем монологов, и в диалоге реплики
//    короткие. Там, где диалог нужен по сути ситуации (регистратура, отель),
//    он оставлен.
//
//  • ЧИСЛА, ИМЕНА, ВРЕМЯ. Ровно то, что на реальном экзамене и в реальной
//    жизни теряется первым. Почти в каждом материале есть цифра, которую
//    спрашивают, — время, сумма, номер рейса, количество остановок.
//
//  • ОТВЕТ ТОЛЬКО ИЗ ЗВУКА. Ни один вопрос не решается общим знанием: «какой
//    автобус» — тот, что назвали, а не тот, что логичен.
//
// Расшифровка и перевод показываются ПОСЛЕ ответов — иначе задание
// превращается в чтение.
// ─────────────────────────────────────────────────────────────────────────────

import type { ListeningItem } from './listeningLibrary'

// ─── Английский ──────────────────────────────────────────────────────────────

export const EN_MORE: ListeningItem[] = [
  {
    id: 'en-l-gate-change',
    lang: 'en', title: 'A gate change at the airport', level: 'A1',
    topic: 'Путешествия', skill: 'Аудирование', minutes: 1,
    script: `Attention please. This is an announcement for passengers travelling to Lisbon, flight BA four-six-two. The departure gate has changed. The flight will now board at gate twelve, not gate five. Boarding starts at nine forty. Please make your way to gate twelve now. Thank you.`,
    translation: `Внимание. Объявление для пассажиров, вылетающих в Лиссабон, рейс BA 462. Выход на посадку изменён. Посадка будет у выхода двенадцать, а не у выхода пять. Посадка начинается в девять сорок. Пожалуйста, пройдите к выходу двенадцать. Спасибо.`,
    glossary: [
      { term: 'announcement', ru: 'объявление' },
      { term: 'departure gate', ru: 'выход на посадку' },
      { term: 'to board', ru: 'садиться в самолёт' },
      { term: 'to make your way', ru: 'пройти, направиться' },
    ],
    questions: [
      {
        q: 'Which gate should passengers go to?',
        options: ['Gate twelve', 'Gate five', 'Gate two', 'Gate forty'],
        correct: 0,
        why: 'В объявлениях о смене выхода всегда звучат оба номера — старый и новый. Держите последний: «will now board at».',
      },
      {
        q: 'When does boarding start?',
        options: ['At nine fourteen', 'At ten forty', 'At nine forty', 'It is not announced'],
        correct: 2,
      },
      {
        q: 'Where is the flight going?',
        options: ['London', 'Leeds', 'Los Angeles', 'Lisbon'],
        correct: 3,
      },
    ],
  },
  {
    id: 'en-l-coffee-counter',
    lang: 'en', title: 'At the coffee counter', level: 'A1',
    topic: 'Еда', skill: 'Аудирование', minutes: 1,
    script: `Barista: Hi there, what can I get you?
Customer: A flat white, please. Regular size.
Barista: Anything to eat?
Customer: No, thanks. Actually — yes, one croissant.
Barista: That's five pounds twenty. To stay or to go?
Customer: To go, please.
Barista: Won't be a minute.`,
    translation: `Бариста: Здравствуйте, что вам?
Гость: Флэт уайт, пожалуйста. Обычный размер.
Бариста: Что-нибудь поесть?
Гость: Нет, спасибо. Хотя — да, один круассан.
Бариста: С вас пять фунтов двадцать. Здесь или с собой?
Гость: С собой, пожалуйста.
Бариста: Минутку.`,
    glossary: [
      { term: 'What can I get you?', ru: 'что вам? — стандартный вопрос за стойкой' },
      { term: 'regular size', ru: 'обычный размер' },
      { term: 'to stay or to go', ru: 'здесь или с собой' },
      { term: "won't be a minute", ru: 'сейчас, одну минуту' },
    ],
    questions: [
      {
        q: 'What does the customer order in the end?',
        options: ['Only a coffee', 'A coffee and a croissant', 'Two coffees', 'Only a croissant'],
        correct: 1,
        why: 'Сначала «no, thanks», потом «actually — yes». В живой речи заказ часто меняется на ходу, и правильный ответ — последний вариант.',
      },
      {
        q: 'How much is it?',
        options: ['£5.20', '£5.12', '£5.02', '£15.20'],
        correct: 0,
      },
      {
        q: 'Is the order to stay or to go?',
        options: ['To stay', 'Half and half', 'To go', 'They do not say'],
        correct: 2,
      },
    ],
  },
  {
    id: 'en-l-weather-radio',
    lang: 'en', title: 'The weather on the radio', level: 'A2',
    topic: 'Погода и природа', skill: 'Аудирование', minutes: 1,
    script: `And now the weather. It's a grey start across most of the country this morning, with light rain in the north until about midday. The afternoon looks brighter — some sunshine in the south and highs of eighteen degrees. Tonight will be colder, down to seven, so if you're heading out late, take a jacket. Tomorrow: dry, but windy.`,
    translation: `А теперь погода. Утро серое почти по всей стране, на севере до полудня слабый дождь. Вторая половина дня посветлее — на юге солнце, максимум восемнадцать градусов. Ночью холоднее, до семи, так что если выходите поздно — берите куртку. Завтра сухо, но ветрено.`,
    glossary: [
      { term: 'a grey start', ru: 'пасмурное начало дня' },
      { term: 'light rain', ru: 'слабый дождь' },
      { term: 'highs of', ru: 'максимум до (о температуре)' },
      { term: 'to head out', ru: 'выходить, отправляться' },
    ],
    questions: [
      {
        q: 'Where will it rain, and when?',
        options: ['In the south, all day', 'In the north, until midday', 'Everywhere, in the evening', 'Nowhere'],
        correct: 1,
      },
      {
        q: 'What is the highest temperature today?',
        options: ['Eighteen degrees', 'Eight degrees', 'Seven degrees', 'Eighty degrees'],
        correct: 0,
        why: 'Eighteen и eighty — классическая пара на слух. Ударение: eighTEEN, EIGHty.',
      },
      {
        q: 'What is tomorrow like?',
        options: ['Rainy and warm', 'Snowy', 'Dry and windy', 'Not mentioned'],
        correct: 2,
      },
    ],
  },
  {
    id: 'en-l-appointment-call',
    lang: 'en', title: 'Confirming an appointment', level: 'A2',
    topic: 'Здоровье', skill: 'Аудирование', minutes: 1,
    script: `Good afternoon, this is Riverside Medical Centre calling for Mr Novak. I'm ringing to confirm your appointment with Doctor Hale on Tuesday the fourth, at ten fifteen in the morning. Please arrive ten minutes early and bring a list of any medication you're taking. If you need to change the time, call us back on 0-2-0-7-double four-five-one. Thank you.`,
    translation: `Добрый день, это медцентр «Риверсайд», звоним господину Новаку. Хотим подтвердить вашу запись к доктору Хейлу во вторник четвёртого, в десять пятнадцать утра. Приходите, пожалуйста, на десять минут раньше и возьмите список лекарств, которые принимаете. Если нужно перенести — перезвоните нам по 020 7 44 51. Спасибо.`,
    glossary: [
      { term: 'to confirm an appointment', ru: 'подтвердить запись' },
      { term: 'to ring / to call back', ru: 'звонить / перезвонить' },
      { term: 'medication', ru: 'лекарства' },
      { term: 'double four', ru: '«две четвёрки» — так читают повтор цифр' },
    ],
    questions: [
      {
        q: 'When is the appointment?',
        options: ['Tuesday at 4:00', 'Tuesday at 10:50', 'Thursday at 10:15', 'Tuesday at 10:15'],
        correct: 3,
      },
      {
        q: 'What should Mr Novak bring?',
        options: ['His passport', 'A list of his medication', 'Payment in cash', 'Nothing'],
        correct: 1,
      },
      {
        q: 'How early should he arrive?',
        options: ['Ten minutes', 'Five minutes', 'Fifteen minutes', 'He should not be early'],
        correct: 0,
      },
    ],
  },
  {
    id: 'en-l-delivery-voicemail',
    lang: 'en', title: 'A missed delivery', level: 'A2',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 1,
    script: `Hi, this is Sam from the delivery depot. I tried to drop off your parcel this morning but nobody was in, so I've left it with your neighbour at number nineteen. If that doesn't work for you, we can redeliver on Saturday — just reply to the text we sent you with the word "again". No charge for that. Cheers.`,
    translation: `Здравствуйте, это Сэм со склада доставки. Утром пытался передать вашу посылку, но никого не было, поэтому оставил её у соседей в доме девятнадцать. Если так не подходит, можем привезти повторно в субботу — просто ответьте на нашу смс словом «again». Это бесплатно. Всего доброго.`,
    glossary: [
      { term: 'depot', ru: 'склад, база доставки' },
      { term: 'to drop off', ru: 'завезти, оставить' },
      { term: 'nobody was in', ru: 'никого не было дома' },
      { term: 'to redeliver', ru: 'доставить повторно' },
      { term: 'no charge', ru: 'бесплатно' },
    ],
    questions: [
      {
        q: 'Where is the parcel now?',
        options: ['Back at the depot', 'On its way again', 'Behind the door', 'With the neighbour at number nineteen'],
        correct: 3,
      },
      {
        q: 'How can you ask for another delivery?',
        options: ['Call the depot', 'Go to the depot', 'Reply to the text with "again"', 'You cannot'],
        correct: 2,
      },
      {
        q: 'Does redelivery cost anything?',
        options: ['Yes, a small fee', 'No, it is free', 'Only on Saturday', 'He does not say'],
        correct: 1,
      },
    ],
  },
  {
    id: 'en-l-flat-viewing',
    lang: 'en', title: 'A voice note about a flat', level: 'A2',
    topic: 'Дом и город', skill: 'Аудирование', minutes: 2,
    script: `Hey, I saw the flat this morning. So — it's on the third floor, no lift, which is annoying, but the rooms are actually bigger than in the photos. The kitchen is tiny though. It's fifteen minutes to the station on foot, or five by bus. Rent is nine hundred a month, bills not included, and they want two months' deposit. I liked it, but I'm not sure about the deposit. What do you think?`,
    translation: `Привет, я утром смотрел квартиру. В общем: третий этаж, лифта нет — это раздражает, но комнаты на самом деле больше, чем на фотографиях. Правда, кухня крошечная. До станции пятнадцать минут пешком или пять на автобусе. Аренда девятьсот в месяц, коммуналка не включена, и просят депозит за два месяца. Мне понравилось, но насчёт депозита не уверен. Что думаешь?`,
    glossary: [
      { term: 'lift', ru: 'лифт (брит.)' },
      { term: 'tiny', ru: 'крошечный' },
      { term: 'rent', ru: 'арендная плата' },
      { term: 'bills', ru: 'коммунальные платежи' },
      { term: 'deposit', ru: 'залог, депозит' },
    ],
    questions: [
      {
        q: 'What does he NOT like about the flat?',
        options: ['The kitchen and the missing lift', 'The size of the rooms', 'The location', 'The neighbours'],
        correct: 0,
      },
      {
        q: 'How long does it take to get to the station on foot?',
        options: ['Five minutes', 'Nine minutes', 'Fifteen minutes', 'Fifty minutes'],
        correct: 2,
      },
      {
        q: 'What is he unsure about?',
        options: ['The rent', 'The bus', 'The floor', 'The deposit'],
        correct: 3,
        why: 'Сомнение почти всегда стоит после «but»: «I liked it, but I’m not sure about…».',
      },
    ],
  },
  {
    id: 'en-l-first-lecture',
    lang: 'en', title: 'The first minute of a lecture', level: 'B1',
    topic: 'Учёба', skill: 'Аудирование', minutes: 2,
    script: `Right, let's make a start. Before we get into the content, three quick admin points. First, the slides go up on the portal the evening before each lecture, not after — so print them if you like writing on paper. Second, there's no exam for this module; it's two essays, one in week six and one in week twelve. And third, my office hours have moved to Thursday afternoons, two till four. Okay. Today we're looking at why cities grow where they do.`,
    translation: `Так, начнём. Прежде чем перейти к содержанию — три организационных момента. Первое: слайды выкладываются на портал накануне вечером, а не после лекции, так что распечатывайте, если любите писать на бумаге. Второе: экзамена по этому модулю нет, будет два эссе — на шестой неделе и на двенадцатой. И третье: мои приёмные часы переехали на четверг, с двух до четырёх. Хорошо. Сегодня мы разбираем, почему города вырастают именно там, где вырастают.`,
    glossary: [
      { term: 'to make a start', ru: 'начать' },
      { term: 'admin points', ru: 'организационные моменты' },
      { term: 'slides go up', ru: 'слайды выкладывают' },
      { term: 'module', ru: 'курс, дисциплина (брит.)' },
      { term: 'office hours', ru: 'приёмные часы преподавателя' },
    ],
    questions: [
      {
        q: 'When are the slides published?',
        options: ['After the lecture', 'The evening before', 'At the end of term', 'They are not published'],
        correct: 1,
      },
      {
        q: 'How is the module assessed?',
        options: ['Two essays', 'One exam', 'An exam and an essay', 'Weekly tests'],
        correct: 0,
      },
      {
        q: 'What changed recently?',
        options: ['The room', 'The lecturer', 'The reading list', 'The office hours'],
        correct: 3,
        why: 'Глагол «have moved» — сигнал изменения. На лекциях именно такие фразы отделяют новое от привычного.',
      },
    ],
  },
  {
    id: 'en-l-podcast-phones',
    lang: 'en', title: 'A podcast on phone habits', level: 'B1',
    topic: 'Технологии и медиа', skill: 'Аудирование', minutes: 2,
    script: `…and the thing that surprised me most in the study wasn't how long people spent on their phones. It was how often they picked them up. The average was fifty-eight times a day — that's roughly once every fifteen minutes you're awake. Most of those checks lasted under thirty seconds. So it's not really a screen-time problem, it's an attention problem: you can't do deep work in fifteen-minute pieces. The researchers tried one simple fix — moving the phone to another room — and focus time nearly doubled.`,
    translation: `…и больше всего в исследовании меня удивило не то, сколько люди сидят в телефоне. А то, как часто они его берут. В среднем пятьдесят восемь раз в день — примерно раз в пятнадцать минут бодрствования. Большинство таких проверок длилось меньше тридцати секунд. То есть дело не в экранном времени, а во внимании: глубокую работу нельзя делать кусками по пятнадцать минут. Исследователи попробовали одну простую вещь — унести телефон в другую комнату — и время сосредоточенной работы почти удвоилось.`,
    glossary: [
      { term: 'to pick up', ru: 'взять в руки' },
      { term: 'roughly', ru: 'примерно' },
      { term: 'deep work', ru: 'сосредоточенная работа' },
      { term: 'a fix', ru: 'решение, способ починить' },
      { term: 'to double', ru: 'удвоиться' },
    ],
    questions: [
      {
        q: 'What surprised the speaker?',
        options: [
          'How long people spend on phones',
          'How many apps people have',
          'How often people pick their phones up',
          'How little people sleep'],
        correct: 2,
        why: 'Конструкция «wasn’t X, it was Y» ставит настоящий ответ во вторую половину. Первая половина — приманка.',
      },
      {
        q: 'How does the speaker define the problem?',
        options: ['A screen-time problem', 'An attention problem', 'A sleep problem', 'A memory problem'],
        correct: 1,
      },
      {
        q: 'What did the simple fix do?',
        options: [
          'Nearly doubled focus time',
          'Cut screen time in half',
          'Made no difference',
          'Made people check more often'],
        correct: 0,
      },
    ],
  },
  {
    id: 'en-l-one-to-one',
    lang: 'en', title: 'Feedback in a one-to-one', level: 'B1',
    topic: 'Обратная связь', skill: 'Аудирование', minutes: 2,
    script: `So, overall this has been a strong quarter for you. The work itself is solid — nobody's questioning that. The one thing I'd like you to work on is visibility. You finish things and move straight on to the next task, and half the team has no idea what you've shipped. Could you start posting a short update in the channel on Fridays? Nothing formal, three lines. Let's look at it again in a month and see if it feels less like extra work by then.`,
    translation: `В общем, квартал у тебя сильный. Сама работа надёжная — это никто не оспаривает. Единственное, над чем я бы попросил поработать, — заметность. Ты доделываешь и сразу берёшься за следующее, и половина команды не знает, что ты выпустил. Можешь по пятницам писать короткий апдейт в канал? Без формальностей, три строки. Вернёмся к этому через месяц и посмотрим, не будет ли это к тому времени ощущаться как лишняя работа.`,
    glossary: [
      { term: 'solid', ru: 'надёжный, крепкий (о работе)' },
      { term: 'visibility', ru: 'заметность результата для других' },
      { term: 'to ship', ru: 'выпустить, довести до пользователя' },
      { term: 'nothing formal', ru: 'без формальностей' },
    ],
    questions: [
      {
        q: 'What is the manager criticising?',
        options: ['The quality of the work', 'The speed of the work', 'How visible the work is', 'Timekeeping'],
        correct: 2,
      },
      {
        q: 'What does the manager ask for?',
        options: [
          'A weekly report to him',
          'More meetings',
          'A monthly presentation',
          'A short Friday update in the channel'],
        correct: 3,
      },
      {
        q: 'When will they discuss it again?',
        options: ['Next Friday', 'In a month', 'Next quarter', 'They will not'],
        correct: 1,
      },
    ],
  },
  {
    id: 'en-l-support-line',
    lang: 'en', title: 'Getting through to support', level: 'B2',
    topic: 'Технологии и медиа', skill: 'Аудирование', minutes: 2,
    script: `Thank you for calling. Please note that calls may be recorded for training purposes. For billing, press one. For technical support, press two. To speak to an advisor about a new order, press three… …Technical support, this is Priya speaking. I can see there's an outage affecting your area — engineers are on site and we're expecting service back by six this evening. I could book an engineer visit for Thursday as a backup, but honestly, if the fix lands tonight you'd be cancelling it. Shall I text you when it's resolved instead?`,
    translation: `Спасибо за звонок. Обратите внимание: разговор может записываться в учебных целях. По вопросам счетов нажмите один. Техническая поддержка — два. Чтобы поговорить с оператором о новом заказе, нажмите три… …Техподдержка, меня зовут Прия. Я вижу, что в вашем районе авария — бригада уже на месте, восстановление ожидаем к шести вечера. Могу записать выезд инженера на четверг про запас, но, честно говоря, если сегодня починят, вам придётся его отменять. Давайте я лучше пришлю смс, когда всё заработает?`,
    glossary: [
      { term: 'for training purposes', ru: 'в учебных целях' },
      { term: 'outage', ru: 'авария, отключение услуги' },
      { term: 'on site', ru: 'на месте' },
      { term: 'as a backup', ru: 'про запас, на всякий случай' },
      { term: 'to land (a fix)', ru: 'о починке: состояться, «доехать»' },
    ],
    questions: [
      {
        q: 'Which number is technical support?',
        options: ['Two', 'One', 'Three', 'It is not given'],
        correct: 0,
      },
      {
        q: 'What does Priya say is the cause?',
        options: [
          'A problem with the customer’s router',
          'She does not know yet',
          'An unpaid bill',
          'An outage in the area'],
        correct: 3,
      },
      {
        q: 'What does she recommend?',
        options: [
          'Booking the Thursday visit',
          'Calling back tomorrow',
          'Waiting and getting a text when it is fixed',
          'Changing the plan'],
        correct: 2,
        why: 'Совет спрятан в «honestly…» и в вопросе «Shall I… instead?». Вежливая рекомендация по-английски часто выглядит как предложение выбора.',
      },
    ],
  },
  {
    id: 'en-l-salary-talk',
    lang: 'en', title: 'Talking about salary', level: 'B2',
    topic: 'Работа', skill: 'Аудирование', minutes: 2,
    script: `I'm glad you raised it, because I'd rather talk about it openly than have you guessing. Here's where we are. The band for this role goes up to seventy-two, and you're at sixty-five. I can't move you to the top of the band in one step — that's not a policy I invented, but it is the policy. What I can do is put you forward for sixty-nine in the April review, and I'd support that with the delivery numbers from the last two quarters. If April comes and nothing has moved, then I think you're entitled to ask me a harder question.`,
    translation: `Я рад, что вы подняли эту тему, — лучше говорить открыто, чем оставлять вас в догадках. Ситуация такая. Вилка по этой роли доходит до семидесяти двух, вы сейчас на шестидесяти пяти. Поднять вас до потолка вилки одним шагом я не могу — правило придумал не я, но оно есть. Что я могу — подать вас на шестьдесят девять в апрельском пересмотре и подкрепить это цифрами по результатам за два последних квартала. Если наступит апрель и ничего не сдвинется, то, я считаю, вы вправе задать мне более жёсткий вопрос.`,
    glossary: [
      { term: 'to raise something', ru: 'поднять тему' },
      { term: 'band', ru: 'вилка зарплат по позиции' },
      { term: 'to put someone forward', ru: 'выдвинуть чью-то кандидатуру' },
      { term: 'review', ru: 'пересмотр (зарплаты, результатов)' },
      { term: 'to be entitled to', ru: 'иметь право' },
    ],
    questions: [
      {
        q: 'What figure is the manager offering to propose?',
        options: ['Sixty-five', 'Sixty-nine', 'Seventy-two', 'He offers no figure'],
        correct: 1,
      },
      {
        q: 'Why can’t he offer the top of the band?',
        options: [
          'Company policy limits a single step',
          'The employee is not good enough',
          'There is no budget at all',
          'He does not explain'],
        correct: 0,
      },
      {
        q: 'What is his tone at the end?',
        options: [
          'Dismissive — the topic is closed',
          'Angry',
          'Open — he invites the employee to push back later',
          'Uncertain about the whole thing'],
        correct: 2,
        why: '«You’re entitled to ask me a harder question» — приглашение вернуться к разговору, а не отказ. На B2 экзаменах отношение говорящего проверяют именно так.',
      },
    ],
  },
  {
    id: 'en-l-news-bulletin',
    lang: 'en', title: 'A short news bulletin', level: 'C1',
    topic: 'Технологии и медиа', skill: 'Аудирование', minutes: 2,
    script: `The headlines at six. Rail operators have confirmed that the strike planned for next week has been called off after a late agreement on rest-day working; services should run normally, though the union stressed that the deal covers pay only until March. The government has published its long-delayed housing review, which recommends loosening planning rules near stations — a proposal that has already drawn objections from several councils. And in sport: after two hours of rain delays, play at the county ground resumed shortly before five.`,
    translation: `Главное к шести часам. Железнодорожные операторы подтвердили, что забастовка, намеченная на следующую неделю, отменена после позднего соглашения о работе в выходные дни; поезда должны ходить в обычном режиме, хотя профсоюз подчеркнул, что договорённость закрывает оплату только до марта. Правительство опубликовало давно откладывавшийся обзор жилищной политики, который рекомендует смягчить правила застройки рядом со станциями, — предложение уже вызвало возражения нескольких муниципалитетов. И спорт: после двух часов дождевых перерывов игра на окружном стадионе возобновилась незадолго до пяти.`,
    glossary: [
      { term: 'to call off', ru: 'отменить' },
      { term: 'rest-day working', ru: 'работа в выходные дни' },
      { term: 'to stress', ru: 'подчеркнуть' },
      { term: 'long-delayed', ru: 'давно откладывавшийся' },
      { term: 'to draw objections', ru: 'вызвать возражения' },
    ],
    questions: [
      {
        q: 'What has happened to the strike?',
        options: ['It has started', 'It has been postponed by a week', 'It has been extended', 'It has been cancelled'],
        correct: 3,
      },
      {
        q: 'What did the union point out?',
        options: [
          'The deal is permanent',
          'The pay deal only runs until March',
          'They rejected the deal',
          'They want more members',
        ],
        correct: 1,
        why: 'Оговорка идёт после «though» — в новостях это стандартное место для условия, которое портит хорошую новость.',
      },
      {
        q: 'How has the housing review been received?',
        options: [
          'With objections from several councils',
          'With broad support',
          'With no reaction yet',
          'It has not been published'],
        correct: 0,
      },
    ],
  },
]

// ─── Корейский ───────────────────────────────────────────────────────────────

export const KO_MORE: ListeningItem[] = [
  {
    id: 'ko-l-jagi-sogae',
    lang: 'ko', title: '자기소개 (рассказ о себе)', level: 'TOPIK 1급',
    topic: 'Знакомство', skill: 'Аудирование', minutes: 1,
    script: `안녕하세요. 저는 마리아입니다. 브라질에서 왔어요. 지금 서울에 살아요. 대학교에서 한국어를 공부해요. 취미는 요리하고 등산이에요. 만나서 반갑습니다.`,
    translation: `Здравствуйте. Меня зовут Мария. Я из Бразилии. Сейчас живу в Сеуле. Учу корейский в университете. Хобби — готовить и ходить в горы. Приятно познакомиться.`,
    glossary: [
      { term: '에서 왔어요', ru: 'приехал(а) из' },
      { term: '살다', ru: 'жить' },
      { term: '취미', ru: 'хобби' },
      { term: '등산', ru: 'поход в горы' },
    ],
    questions: [
      {
        q: '마리아 씨는 어느 나라 사람이에요?',
        options: ['한국 사람', '일본 사람', '브라질 사람', '말 안 했어요'],
        correct: 2,
      },
      {
        q: '지금 어디에 살아요?',
        options: ['부산', '서울', '브라질', '대학교 기숙사'],
        correct: 1,
      },
      {
        q: '취미가 뭐예요?',
        options: ['요리하고 등산', '노래하고 춤', '공부하고 운동', '영화 보기'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ko-l-ilgi-yebo',
    lang: 'ko', title: '일기 예보 (прогноз погоды)', level: 'TOPIK 2급',
    topic: 'Погода и природа', skill: 'Аудирование', minutes: 1,
    script: `오늘 날씨를 알려 드리겠습니다. 오전에는 흐리고 오후부터 비가 오겠습니다. 낮 최고 기온은 이십삼 도, 밤에는 십오 도까지 떨어지겠습니다. 바람이 강하게 불겠으니 우산보다 우비를 준비하시는 것이 좋겠습니다. 내일은 맑겠습니다.`,
    translation: `Сообщаем прогноз погоды. Утром облачно, со второй половины дня пойдёт дождь. Дневной максимум двадцать три градуса, ночью опустится до пятнадцати. Будет сильный ветер, поэтому лучше взять дождевик, а не зонт. Завтра ясно.`,
    glossary: [
      { term: '흐리다', ru: 'быть пасмурным' },
      { term: '최고 기온', ru: 'максимальная температура' },
      { term: '떨어지다', ru: 'падать, опускаться' },
      { term: '우비', ru: 'дождевик' },
      { term: '맑다', ru: 'быть ясным' },
    ],
    questions: [
      {
        q: '비는 언제 와요?',
        options: ['오전', '밤에만', '오후', '안 와요'],
        correct: 2,
      },
      {
        q: '밤 기온은 몇 도예요?',
        options: ['이십삼 도', '십오 도', '삼십 도', '말 안 했어요'],
        correct: 1,
      },
      {
        q: '뭘 준비하는 게 좋아요?',
        options: ['우비', '우산', '모자', '선글라스'],
        correct: 0,
        why: 'Совет идёт с «-는 것이 좋겠습니다». Ловушка в том, что зонт тоже назван — но названо, что он хуже.',
      },
    ],
  },
  {
    id: 'ko-l-taekbae',
    lang: 'ko', title: '택배 기사 전화 (звонок курьера)', level: 'TOPIK 2급',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 1,
    script: `안녕하세요, 택배입니다. 지금 문 앞에 갔는데 안 계시는 것 같아요. 경비실에 맡기고 갈까요? 아니면 내일 오전에 다시 올까요? 문자로 답 주시면 그대로 하겠습니다. 참고로 오늘은 여섯 시까지만 배송합니다.`,
    translation: `Здравствуйте, доставка. Я сейчас у двери, кажется, вас нет дома. Оставить в комнате охраны? Или завтра утром заехать ещё раз? Ответьте сообщением — сделаю, как скажете. Кстати, сегодня доставка только до шести.`,
    glossary: [
      { term: '택배', ru: 'курьерская доставка, посылка' },
      { term: '문 앞', ru: 'у двери' },
      { term: '경비실', ru: 'комната охраны в доме' },
      { term: '맡기다', ru: 'оставить на хранение' },
      { term: '배송하다', ru: 'доставлять' },
    ],
    questions: [
      {
        q: '기사는 지금 어디에 있어요?',
        options: ['경비실', '회사', '차 안', '문 앞'],
        correct: 3,
      },
      {
        q: '기사가 제안한 것은 뭐예요?',
        options: [
          '우체국에서 찾기',
          '오늘 저녁에 다시 오기',
          '경비실에 맡기거나 내일 다시 오기',
          '반품하기'],
        correct: 2,
      },
      {
        q: '오늘 배송은 몇 시까지예요?',
        options: ['네 시', '여섯 시', '여덟 시', '말 안 했어요'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ko-l-yeyak',
    lang: 'ko', title: '식당 예약 전화 (бронь столика)', level: 'TOPIK 2급',
    topic: 'Кафе и ресторан', skill: 'Аудирование', minutes: 1,
    script: `손님: 여보세요, 토요일 저녁에 예약하고 싶은데요.
직원: 네, 몇 분이세요?
손님: 네 명이요. 일곱 시 가능해요?
직원: 일곱 시는 자리가 없고, 여덟 시는 괜찮습니다.
손님: 그럼 여덟 시로 할게요.
직원: 성함하고 전화번호 부탁드립니다.`,
    translation: `Гость: Алло, хочу забронировать на субботу вечером.
Сотрудник: Да, на сколько человек?
Гость: На четверых. Семь часов можно?
Сотрудник: На семь мест нет, на восемь — пожалуйста.
Гость: Тогда на восемь.
Сотрудник: Имя и номер телефона, пожалуйста.`,
    glossary: [
      { term: '예약하다', ru: 'бронировать' },
      { term: '몇 분', ru: 'сколько человек (вежливо)' },
      { term: '자리가 없다', ru: 'нет мест' },
      { term: '성함', ru: 'имя (вежливая форма)' },
    ],
    questions: [
      {
        q: '몇 명이 가요?',
        options: ['네 명', '세 명', '두 명', '다섯 명'],
        correct: 0,
      },
      {
        q: '예약 시간은 몇 시예요?',
        options: ['일곱 시', '아홉 시', '여덟 시', '못 했어요'],
        correct: 2,
        why: 'Названо два времени. Правильное — то, на котором остановились: «여덟 시로 할게요».',
      },
      {
        q: '직원이 마지막에 뭘 물어봐요?',
        options: ['음식 메뉴', '결제 방법', '주소', '이름과 전화번호'],
        correct: 3,
      },
    ],
  },
  {
    id: 'ko-l-mart-annae',
    lang: 'ko', title: '마트 안내 방송 (объявление в супермаркете)', level: 'TOPIK 2급',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 1,
    script: `고객 여러분께 안내 말씀 드립니다. 지금부터 삼십 분 동안 지하 일 층 수산 코너에서 할인 행사를 진행합니다. 오늘 들어온 생선을 삼십 퍼센트 싸게 드립니다. 또한 주차권은 이 층 계산대 옆에서 받으실 수 있습니다. 감사합니다.`,
    translation: `Уважаемые покупатели, объявление. В ближайшие тридцать минут на минус первом этаже в рыбном отделе проходит акция. Сегодняшнюю рыбу отдаём на тридцать процентов дешевле. Кроме того, парковочный талон можно получить на втором этаже рядом с кассами. Спасибо.`,
    glossary: [
      { term: '고객 여러분', ru: 'уважаемые покупатели' },
      { term: '지하 일 층', ru: 'первый подземный этаж' },
      { term: '할인 행사', ru: 'акция со скидкой' },
      { term: '주차권', ru: 'парковочный талон' },
      { term: '계산대', ru: 'касса' },
    ],
    questions: [
      {
        q: '할인 행사는 어디에서 해요?',
        options: ['이 층 계산대', '지하 일 층 수산 코너', '주차장', '일 층 입구'],
        correct: 1,
      },
      {
        q: '할인은 몇 퍼센트예요?',
        options: ['삼십 퍼센트', '이십 퍼센트', '십 퍼센트', '오십 퍼센트'],
        correct: 0,
      },
      {
        q: '주차권은 어디에서 받아요?',
        options: ['지하 일 층', '안내 데스크', '입구', '이 층 계산대 옆'],
        correct: 3,
        why: 'В объявлениях подряд идут два места — не перепутайте, где акция, а где талон.',
      },
    ],
  },
  {
    id: 'ko-l-apt-bangsong',
    lang: 'ko', title: '아파트 안내 방송 (объявление в доме)', level: 'TOPIK 3급',
    topic: 'Дом и город', skill: 'Аудирование', minutes: 1,
    script: `입주민 여러분께 알려 드립니다. 내일 오전 아홉 시부터 열두 시까지 엘리베이터 정기 점검이 있겠습니다. 점검 시간에는 계단을 이용해 주시기 바랍니다. 또한 이번 주 금요일에는 단수가 예정되어 있으니 미리 물을 받아 두시기 바랍니다. 불편을 드려 죄송합니다.`,
    translation: `Уважаемые жильцы, объявление. Завтра с девяти до двенадцати утра будет плановая проверка лифта. В это время пользуйтесь, пожалуйста, лестницей. Кроме того, в эту пятницу планируется отключение воды, поэтому наберите воду заранее. Приносим извинения за неудобства.`,
    glossary: [
      { term: '입주민', ru: 'жильцы' },
      { term: '정기 점검', ru: 'плановая проверка' },
      { term: '계단', ru: 'лестница' },
      { term: '단수', ru: 'отключение воды' },
      { term: '미리', ru: 'заранее' },
    ],
    questions: [
      {
        q: '내일 몇 시부터 엘리베이터를 못 써요?',
        options: ['여덟 시', '열두 시', '아홉 시', '오후 세 시'],
        correct: 2,
      },
      {
        q: '금요일에는 무슨 일이 있어요?',
        options: ['엘리베이터 점검', '단수', '정전', '이사'],
        correct: 1,
      },
      {
        q: '방송은 무엇을 부탁했어요?',
        options: ['계단을 쓰고 물을 미리 받아 두기', '주차를 하지 말기', '창문을 닫기', '관리비를 내기'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ko-l-byeongwon',
    lang: 'ko', title: '병원 접수 (регистратура в поликлинике)', level: 'TOPIK 3급',
    topic: 'Здоровье', skill: 'Аудирование', minutes: 1,
    script: `접수원: 어디가 불편해서 오셨어요?
환자: 사흘 전부터 목이 아프고 열이 좀 나요.
접수원: 처음 오셨어요? 그럼 신분증 주시고 이 서류를 작성해 주세요.
환자: 얼마나 기다려야 해요?
접수원: 앞에 두 분 계셔서 이십 분 정도 걸립니다. 대기실에서 기다려 주세요.`,
    translation: `Регистратор: С чем вы пришли?
Пациент: Три дня болит горло и немного температура.
Регистратор: Вы у нас впервые? Тогда дайте удостоверение и заполните эту анкету.
Пациент: Сколько ждать?
Регистратор: Перед вами двое, примерно двадцать минут. Подождите, пожалуйста, в зале ожидания.`,
    glossary: [
      { term: '불편하다', ru: 'здесь: беспокоить, болеть' },
      { term: '열이 나다', ru: 'подниматься (о температуре)' },
      { term: '신분증', ru: 'удостоверение личности' },
      { term: '작성하다', ru: 'заполнить (документ)' },
      { term: '대기실', ru: 'зал ожидания' },
    ],
    questions: [
      {
        q: '환자는 언제부터 아팠어요?',
        options: ['어제부터', '일주일 전부터', '사흘 전부터', '오늘 아침부터'],
        correct: 2,
      },
      {
        q: '접수원은 뭘 달라고 했어요?',
        options: ['보험 카드', '처방전', '진료비', '신분증'],
        correct: 3,
      },
      {
        q: '얼마나 기다려요?',
        options: ['십 분', '이십 분', '삼십 분', '한 시간'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ko-l-eunhaeng',
    lang: 'ko', title: '은행에서 (в банке)', level: 'TOPIK 3급',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 2,
    script: `직원: 어떤 일로 오셨어요?
손님: 체크카드를 만들고 싶어요.
직원: 외국인 등록증하고 통장 있으세요? 통장이 없으면 계좌부터 만들어야 합니다.
손님: 통장은 있어요. 카드는 오늘 받을 수 있어요?
직원: 급하시면 즉시 발급 카드가 있는데 수수료가 오천 원입니다. 우편으로 받으시면 무료지만 일주일쯤 걸려요.
손님: 그럼 오늘 받을게요.`,
    translation: `Сотрудник: По какому вопросу вы пришли?
Клиент: Хочу оформить дебетовую карту.
Сотрудник: У вас есть регистрационная карта иностранца и сберкнижка? Если счёта нет, сначала нужно открыть счёт.
Клиент: Счёт есть. Карту можно получить сегодня?
Сотрудник: Если срочно, есть карта с моментальным выпуском, комиссия пять тысяч вон. По почте бесплатно, но идёт около недели.
Клиент: Тогда возьму сегодня.`,
    glossary: [
      { term: '체크카드', ru: 'дебетовая карта' },
      { term: '외국인 등록증', ru: 'карта регистрации иностранца' },
      { term: '계좌', ru: 'счёт' },
      { term: '즉시 발급', ru: 'моментальный выпуск' },
      { term: '수수료', ru: 'комиссия' },
    ],
    questions: [
      {
        q: '손님은 뭘 하러 왔어요?',
        options: ['체크카드를 만들러', '계좌를 만들러', '돈을 바꾸러', '대출을 받으러'],
        correct: 0,
      },
      {
        q: '오늘 카드를 받으면 얼마를 내요?',
        options: ['무료', '오만 원', '만 원', '오천 원'],
        correct: 3,
      },
      {
        q: '우편으로 받으면 어때요?',
        options: ['더 비싸요', '못 받아요', '무료지만 일주일쯤 걸려요', '삼 일 걸려요'],
        correct: 2,
        why: 'Здесь классическая пара «быстро и платно / бесплатно и долго». На TOPIK такие пары спрашивают почти всегда.',
      },
    ],
  },
  {
    id: 'ko-l-sueop-gongji',
    lang: 'ko', title: '수업 공지 (объявление на занятии)', level: 'TOPIK 3급',
    topic: 'Учёба', skill: 'Аудирование', minutes: 1,
    script: `여러분, 공지 사항 하나 있습니다. 다음 주 화요일 수업은 휴강입니다. 대신 목요일 같은 시간에 보충 수업을 합니다. 그리고 중간시험은 삼 주 후예요. 시험 범위는 오 과부터 십 과까지고, 듣기가 절반입니다. 질문 있으면 수업 끝나고 오세요.`,
    translation: `Ребята, одно объявление. В следующий вторник занятия не будет. Вместо этого в четверг в то же время — дополнительное занятие. И промежуточный экзамен через три недели. Материал экзамена — с пятого по десятый урок, аудирование составляет половину. Если есть вопросы, подходите после занятия.`,
    glossary: [
      { term: '공지 사항', ru: 'объявление, оргинформация' },
      { term: '휴강', ru: 'отмена занятия' },
      { term: '보충 수업', ru: 'дополнительное занятие взамен' },
      { term: '중간시험', ru: 'промежуточный экзамен' },
      { term: '시험 범위', ru: 'объём материала на экзамене' },
    ],
    questions: [
      {
        q: '다음 주 화요일에 수업이 있어요?',
        options: ['네, 있어요', '아니요, 휴강이에요', '시험이 있어요', '말 안 했어요'],
        correct: 1,
      },
      {
        q: '보충 수업은 언제예요?',
        options: ['목요일', '수요일', '금요일', '다음 화요일'],
        correct: 0,
      },
      {
        q: '시험 범위는 어디까지예요?',
        options: ['일 과부터 오 과', '십 과부터 십오 과', '오 과부터 십 과', '전부'],
        correct: 2,
      },
    ],
  },
  {
    id: 'ko-l-hoeui',
    lang: 'ko', title: '회의 발언 (реплика на совещании)', level: 'TOPIK 4급',
    topic: 'Работа', skill: 'Аудирование', minutes: 2,
    script: `제가 말씀드리고 싶은 건 일정 자체가 아니라 순서입니다. 지금 계획대로면 디자인이 끝나기 전에 개발이 시작되는데, 그러면 나중에 두 번 일하게 됩니다. 차라리 첫 주에 화면 다섯 개만 확정하고, 그 다음에 개발에 넘기는 게 어떨까요? 전체 기간은 오히려 짧아질 겁니다. 물론 이건 제안이고, 결정은 팀장님이 하시면 됩니다.`,
    translation: `Я хочу сказать не о самих сроках, а о порядке. По нынешнему плану разработка начинается до того, как закончится дизайн, а значит, потом придётся делать всё дважды. Может, лучше в первую неделю утвердить всего пять экранов и уже потом передавать в разработку? Общий срок от этого скорее сократится. Разумеется, это предложение, а решение за руководителем.`,
    glossary: [
      { term: '일정', ru: 'график, сроки' },
      { term: '순서', ru: 'порядок, последовательность' },
      { term: '확정하다', ru: 'утвердить окончательно' },
      { term: '넘기다', ru: 'передать (дальше)' },
      { term: '오히려', ru: 'наоборот, скорее' },
    ],
    questions: [
      {
        q: '이 사람이 문제라고 보는 것은 뭐예요?',
        options: ['기간이 너무 짧다', '예산이 없다', '사람이 부족하다', '일하는 순서가 잘못됐다'],
        correct: 3,
        why: 'Формула «А가 아니라 B» сразу отсекает первую половину: срок — не проблема, проблема — порядок.',
      },
      {
        q: '무엇을 제안했어요?',
        options: [
          '개발을 먼저 시작하기',
          '첫 주에 화면 다섯 개를 확정하기',
          '일정을 두 배로 늘리기',
          '디자인을 없애기'],
        correct: 1,
      },
      {
        q: '이 사람의 태도는 어때요?',
        options: ['제안만 하고 결정은 팀장에게 맡겨요', '결정을 요구해요', '화가 났어요', '관심이 없어요'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ko-l-myeonjeop',
    lang: 'ko', title: '면접 안내 (инструктаж перед собеседованием)', level: 'TOPIK 4급',
    topic: 'Работа', skill: 'Аудирование', minutes: 2,
    script: `오늘 면접은 세 단계로 진행됩니다. 먼저 인사 담당자와 십오 분 정도 이야기하시고, 그다음에 실무진 면접이 삼십 분 있습니다. 마지막은 간단한 과제인데, 미리 준비하실 필요는 없습니다. 결과는 다음 주 수요일까지 메일로 안내드립니다. 혹시 연락이 늦어지더라도 탈락은 아니니 기다려 주세요.`,
    translation: `Сегодняшнее собеседование пройдёт в три этапа. Сначала минут пятнадцать разговор с сотрудником отдела кадров, затем тридцать минут собеседование с командой. Последний этап — небольшое задание, заранее готовиться к нему не нужно. Результат сообщим по почте до следующей среды. Если ответ задержится, это ещё не отказ, так что подождите.`,
    glossary: [
      { term: '단계', ru: 'этап' },
      { term: '인사 담당자', ru: 'сотрудник отдела кадров' },
      { term: '실무진', ru: 'команда, которая реально делает работу' },
      { term: '과제', ru: 'задание' },
      { term: '탈락', ru: 'отсев, отказ' },
    ],
    questions: [
      {
        q: '면접은 몇 단계예요?',
        options: ['두 단계', '한 단계', '네 단계', '세 단계'],
        correct: 3,
      },
      {
        q: '과제는 어떻게 준비해요?',
        options: ['미리 준비해야 해요', '집에서 해서 보내요', '미리 준비할 필요 없어요', '과제는 없어요'],
        correct: 2,
      },
      {
        q: '연락이 늦으면 무슨 뜻이에요?',
        options: ['탈락이라는 뜻이에요', '탈락은 아니에요', '다시 지원해야 해요', '말 안 했어요'],
        correct: 1,
        why: '«-더라도» вводит уступку: «даже если задержится». Именно на этом обороте держится весь смысл последней фразы.',
      },
    ],
  },
  {
    id: 'ko-l-podcast-jibsa',
    lang: 'ko', title: '팟캐스트: 집안일 나누기', level: 'TOPIK 4급',
    topic: 'Семья и люди', skill: 'Аудирование', minutes: 2,
    script: `…재미있는 건, 조사에서 부부가 싸우는 이유 일 위가 돈이 아니라 집안일이었다는 겁니다. 그런데 더 흥미로운 건 시간이 아니에요. 청소를 몇 시간 했느냐보다, 누가 '해야 할 일을 기억하고 있느냐'가 문제였습니다. 쓰레기를 버리는 건 오 분이지만, 언제 버려야 하는지 늘 기억하는 사람은 따로 있죠. 연구자들은 이걸 '보이지 않는 일'이라고 부릅니다.`,
    translation: `…любопытно, что в опросе на первом месте среди причин ссор у супругов оказались не деньги, а домашние дела. Но интереснее другое — дело не во времени. Важнее не то, сколько часов человек убирался, а то, кто помнит, что вообще надо сделать. Вынести мусор — пять минут, но помнит, когда его выносить, всегда кто-то один. Исследователи называют это «невидимой работой».`,
    glossary: [
      { term: '집안일', ru: 'домашние дела' },
      { term: '일 위', ru: 'первое место' },
      { term: '흥미롭다', ru: 'быть интересным' },
      { term: '따로', ru: 'отдельно; здесь: это всегда кто-то один' },
      { term: '보이지 않는 일', ru: '«невидимая работа»' },
    ],
    questions: [
      {
        q: '부부가 싸우는 이유 일 위는 뭐였어요?',
        options: ['집안일', '돈', '아이', '시간'],
        correct: 0,
      },
      {
        q: '진짜 문제는 뭐라고 했어요?',
        options: [
          '청소에 쓰는 시간',
          '집이 좁은 것',
          '할 일을 누가 기억하느냐',
          '돈이 부족한 것'],
        correct: 2,
      },
      {
        q: "'보이지 않는 일'은 무슨 뜻이에요?",
        options: [
          '밤에 하는 일',
          '아무도 안 하는 일',
          '돈을 안 받는 일',
          '기억하고 계획하는, 눈에 안 보이는 일'],
        correct: 3,
      },
    ],
  },
]

// ─── Японский ────────────────────────────────────────────────────────────────
//
// На N5 текст записан каной — так же, как в стартовых материалах: на этом
// уровне иероглифы ещё мешают сверять услышанное с расшифровкой. С N4
// появляется обычная смешанная запись, потому что дальше без неё нельзя.

export const JA_MORE: ListeningItem[] = [
  {
    id: 'ja-l-jikoshoukai',
    lang: 'ja', title: 'じこしょうかい (рассказ о себе)', level: 'JLPT N5',
    topic: 'Знакомство', skill: 'Аудирование', minutes: 1,
    script: `はじめまして。アンナと もうします。ロシアから きました。だいがくで にほんごを べんきょうして います。すきな たべものは おすしです。まいあさ さんぽを します。どうぞ よろしく おねがいします。`,
    translation: `Здравствуйте. Меня зовут Анна. Я приехала из России. Учу японский в университете. Любимая еда — суши. Каждое утро гуляю. Приятно познакомиться.`,
    glossary: [
      { term: 'もうします', ru: 'меня зовут (вежливо о себе)' },
      { term: 'から きました', ru: 'приехал(а) из' },
      { term: 'すきな たべもの', ru: 'любимая еда' },
      { term: 'さんぽ', ru: 'прогулка' },
    ],
    questions: [
      {
        q: 'アンナさんは どこから きましたか。',
        options: ['にほん', 'ロシア', 'かんこく', 'いって いません'],
        correct: 1,
      },
      {
        q: 'どこで べんきょうして いますか。',
        options: ['だいがく', 'こうこう', 'かいしゃ', 'うち'],
        correct: 0,
      },
      {
        q: 'まいあさ なにを しますか。',
        options: ['べんきょう', 'しごと', 'りょうり', 'さんぽ'],
        correct: 3,
      },
    ],
  },
  {
    id: 'ja-l-tenki',
    lang: 'ja', title: 'てんきよほう (прогноз погоды)', level: 'JLPT N5',
    topic: 'Погода и природа', skill: 'Аудирование', minutes: 1,
    script: `つぎは てんきよほうです。きょうは ごぜんちゅう はれますが、ごごから くもりに なります。よるは あめが ふるでしょう。きおんは ひるが にじゅうど、よるは じゅうにどです。あしたは いちにちじゅう はれです。`,
    translation: `Далее прогноз погоды. Сегодня до полудня ясно, но со второй половины дня облачно. Вечером, вероятно, пойдёт дождь. Температура днём двадцать градусов, вечером двенадцать. Завтра весь день ясно.`,
    glossary: [
      { term: 'ごぜんちゅう', ru: 'в первой половине дня' },
      { term: 'くもり', ru: 'облачно' },
      { term: 'あめが ふる', ru: 'идёт дождь' },
      { term: 'きおん', ru: 'температура воздуха' },
      { term: 'いちにちじゅう', ru: 'весь день' },
    ],
    questions: [
      {
        q: 'あめは いつ ふりますか。',
        options: ['ごぜんちゅう', 'ごご', 'よる', 'ふりません'],
        correct: 2,
      },
      {
        q: 'よるの きおんは なんどですか。',
        options: ['にじゅうど', 'じゅうにど', 'にじゅうにど', 'いって いません'],
        correct: 1,
      },
      {
        q: 'あしたの てんきは どうですか。',
        options: ['はれ', 'くもり', 'あめ', 'ゆき'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ja-l-resutoran',
    lang: 'ja', title: 'レストランで ちゅうもん (заказ в ресторане)', level: 'JLPT N5',
    topic: 'Еда', skill: 'Аудирование', minutes: 1,
    script: `てんいん：ごちゅうもんは おきまりですか。
きゃく：ラーメンを ふたつ ください。
てんいん：おのみものは いかがですか。
きゃく：おみずで いいです。
てんいん：かしこまりました。すこし おまち ください。`,
    translation: `Официант: Готовы заказать?
Гость: Два рамэна, пожалуйста.
Официант: Напитки будете?
Гость: Достаточно воды.
Официант: Хорошо. Немного подождите.`,
    glossary: [
      { term: 'ごちゅうもんは おきまりですか', ru: 'вы готовы заказать?' },
      { term: 'おのみもの', ru: 'напитки' },
      { term: 'おみずで いいです', ru: 'воды будет достаточно' },
      { term: 'かしこまりました', ru: 'слушаюсь (вежливый ответ персонала)' },
    ],
    questions: [
      {
        q: 'なにを ちゅうもんしましたか。',
        options: ['ラーメン ひとつ', 'そば ふたつ', 'ラーメン ふたつ', 'おみずだけ'],
        correct: 2,
      },
      {
        q: 'のみものは なにに しましたか。',
        options: ['おちゃ', 'ビール', 'たのみませんでした', 'おみず'],
        correct: 3,
      },
      {
        q: 'てんいんは さいごに なんと いいましたか。',
        options: ['ありがとうございました', 'すこし おまち ください', 'また どうぞ', 'すみません'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ja-l-densha-chien',
    lang: 'ja', title: '電車の遅れ (задержка поезда)', level: 'JLPT N4',
    topic: 'Транспорт и дорога', skill: 'Аудирование', minutes: 1,
    script: `ご案内いたします。ただいま、人身事故の影響で、この路線は上下線ともに遅れております。運転再開は九時三十分ごろの見込みです。お急ぎのお客様は、隣のホームからバスをご利用ください。ご迷惑をおかけして申し訳ございません。`,
    translation: `Объявление. В настоящее время из-за происшествия с человеком движение на этой линии задерживается в обоих направлениях. Возобновление ожидается около девяти тридцати. Пассажиров, которые торопятся, просим воспользоваться автобусом с соседней платформы. Приносим извинения за неудобства.`,
    glossary: [
      { term: 'ただいま', ru: 'в настоящий момент' },
      { term: '影響', ru: 'влияние, последствие' },
      { term: '上下線', ru: 'оба направления' },
      { term: '運転再開', ru: 'возобновление движения' },
      { term: '見込み', ru: 'ожидается, прогноз' },
    ],
    questions: [
      {
        q: '電車は いつ 動きますか。',
        options: ['九時三十分ごろ', '九時ごろ', '十時三十分ごろ', 'わかりません'],
        correct: 0,
      },
      {
        q: '急ぐ人は どうしますか。',
        options: ['タクシーに乗る', '駅を出る', '待つ', '隣のホームからバスに乗る'],
        correct: 3,
      },
      {
        q: '遅れているのは どの方向ですか。',
        options: ['上りだけ', '下りだけ', '上下線とも', '言っていません'],
        correct: 2,
        why: '上下線ともに — «в обоих направлениях». Одно слово とも меняет весь ответ.',
      },
    ],
  },
  {
    id: 'ja-l-takuhai',
    lang: 'ja', title: '宅配の留守電 (сообщение курьера)', level: 'JLPT N4',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 1,
    script: `お世話になっております。さくら宅配の田中です。本日午後二時ごろ、お荷物をお届けにあがりましたが、ご不在でしたので持ち帰りました。再配達をご希望の場合は、不在票の番号でウェブからお申し込みください。本日は八時まで、明日は午前中から対応できます。失礼いたします。`,
    translation: `Здравствуйте. Это Танака из службы доставки «Сакура». Сегодня около двух часов дня я привозил вашу посылку, но вас не было дома, поэтому я забрал её обратно. Если хотите повторную доставку, оформите заявку на сайте по номеру с извещения. Сегодня доставляем до восьми, завтра — с утра. До свидания.`,
    glossary: [
      { term: 'お世話になっております', ru: 'стандартное деловое приветствие по телефону' },
      { term: '不在', ru: 'отсутствие дома' },
      { term: '持ち帰る', ru: 'забрать обратно' },
      { term: '再配達', ru: 'повторная доставка' },
      { term: '不在票', ru: 'извещение о неудачной доставке' },
    ],
    questions: [
      {
        q: '荷物は 今 どこに ありますか。',
        options: ['ドアの前', '宅配会社', 'となりの家', 'ポスト'],
        correct: 1,
      },
      {
        q: '再配達は どうやって 申し込みますか。',
        options: ['不在票の番号でウェブから', '電話でだけ', '店に行く', 'できません'],
        correct: 0,
      },
      {
        q: '今日は 何時まで 配達しますか。',
        options: ['六時', '七時', '八時', '九時'],
        correct: 2,
      },
    ],
  },
  {
    id: 'ja-l-byouin',
    lang: 'ja', title: '病院の受付 (регистратура в больнице)', level: 'JLPT N4',
    topic: 'Здоровье', skill: 'Аудирование', minutes: 1,
    script: `受付：今日は どうされましたか。
患者：三日前から 熱が あって、咳も 出ます。
受付：保険証は お持ちですか。初めてですので、この用紙に ご記入ください。
患者：どのくらい 待ちますか。
受付：今 三人 お待ちですので、三十分ほど かかります。`,
    translation: `Регистратура: С чем вы сегодня?
Пациент: Три дня температура, ещё кашель.
Регистратура: Страховой полис с собой? Вы у нас впервые, поэтому заполните, пожалуйста, этот бланк.
Пациент: Сколько ждать?
Регистратура: Сейчас впереди три человека, займёт минут тридцать.`,
    glossary: [
      { term: 'どうされましたか', ru: 'что случилось? (вежливо)' },
      { term: '熱がある', ru: 'есть температура' },
      { term: '咳が出る', ru: 'есть кашель' },
      { term: '保険証', ru: 'страховой полис' },
      { term: '記入する', ru: 'заполнить' },
    ],
    questions: [
      {
        q: '患者の 症状は 何ですか。',
        options: ['頭痛だけ', '熱と咳', 'お腹が痛い', '言っていません'],
        correct: 1,
      },
      {
        q: 'いつから 具合が 悪いですか。',
        options: ['三日前から', '昨日から', '今朝から', '一週間前から'],
        correct: 0,
      },
      {
        q: '待ち時間は どのくらいですか。',
        options: ['十分', '二十分', '一時間', '三十分'],
        correct: 3,
      },
    ],
  },
  {
    id: 'ja-l-hotel',
    lang: 'ja', title: 'ホテルのチェックイン', level: 'JLPT N4',
    topic: 'Путешествия', skill: 'Аудирование', minutes: 2,
    script: `フロント：ご予約のお名前を お願いします。
客：ペトロフです。二泊で 予約しました。
フロント：はい、承っております。お部屋は 七階の 七〇三号室です。朝食は 一階で、六時半から 十時までです。
客：荷物を 預かって もらえますか。チェックアウトの あとです。
フロント：もちろんです。夕方五時まで お預かりできます。`,
    translation: `Ресепшн: Назовите, пожалуйста, имя в брони.
Гость: Петров. Бронировал на две ночи.
Ресепшн: Да, вижу бронь. Ваш номер — 703 на седьмом этаже. Завтрак на первом этаже, с половины седьмого до десяти.
Гость: Можно оставить у вас багаж? После выезда.
Ресепшн: Конечно. Храним до пяти вечера.`,
    glossary: [
      { term: '承っております', ru: 'вижу вашу бронь (очень вежливо)' },
      { term: '二泊', ru: 'две ночи' },
      { term: '号室', ru: 'номер комнаты' },
      { term: '預かる', ru: 'взять на хранение' },
      { term: 'チェックアウト', ru: 'выезд из отеля' },
    ],
    questions: [
      {
        q: '部屋は 何号室ですか。',
        options: ['三〇七号室', '七三〇号室', '七〇三号室', '言っていません'],
        correct: 2,
      },
      {
        q: '朝食は 何時からですか。',
        options: ['六時', '六時半', '七時', '十時'],
        correct: 1,
      },
      {
        q: '荷物は 何時まで 預かって もらえますか。',
        options: ['五時まで', '三時まで', 'お昼まで', '預かって もらえません'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ja-l-baito',
    lang: 'ja', title: 'アルバイトの説明 (инструктаж на подработке)', level: 'JLPT N4',
    topic: 'Работа', skill: 'Аудирование', minutes: 2,
    script: `では、明日からの流れを 説明します。出勤は 十時ですが、着替えが あるので 十分前に 来てください。最初の一週間は 先輩と 一緒に レジに 入ります。休憩は 六時間以上 働く日だけ 一時間です。休む場合は、必ず 前の日までに 電話してください。メールでは 見落とすことが あります。`,
    translation: `Итак, объясню порядок начиная с завтрашнего дня. Смена в десять, но нужно переодеться, поэтому приходите за десять минут. Первую неделю будете на кассе вместе с наставником. Перерыв — час, но только в дни, когда работаете больше шести часов. Если не сможете выйти, обязательно позвоните накануне. Почту можем не заметить.`,
    glossary: [
      { term: '出勤', ru: 'выход на работу' },
      { term: '着替え', ru: 'переодевание' },
      { term: '先輩', ru: 'старший коллега, наставник' },
      { term: 'レジ', ru: 'касса' },
      { term: '見落とす', ru: 'не заметить, проглядеть' },
    ],
    questions: [
      {
        q: '何時に 店に 来ますか。',
        options: ['十時十分', '十時', '九時五十分', '十一時'],
        correct: 2,
        why: 'Прямо время прихода не названо: смена в десять «плюс за десять минут до». Такой счёт в уме — типичное задание N4.',
      },
      {
        q: '休憩が あるのは どんな日ですか。',
        options: ['毎日', '六時間以上 働く日', '土曜日だけ', '休憩は ありません'],
        correct: 1,
      },
      {
        q: '休むときは どうしますか。',
        options: ['前の日までに 電話する', 'メールを 送る', '当日の朝 連絡する', '何も しない'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ja-l-rusuden-sasoi',
    lang: 'ja', title: '友だちからの留守電 (сообщение от друга)', level: 'JLPT N4',
    topic: 'Время и планы', skill: 'Аудирование', minutes: 1,
    script: `もしもし、ゆかです。あのう、土曜日の映画なんだけど、七時の回が 満席だったの。それで 九時の回を 二枚 取っちゃった。もし 遅すぎるなら、日曜の 昼に 変えても いいよ。今日中に 返事を もらえると 助かります。じゃあ、またね。`,
    translation: `Алло, это Юка. Слушай, насчёт кино в субботу — на семичасовой сеанс мест не было. Поэтому я взяла два билета на девять. Если слишком поздно, можем перенести на воскресенье днём. Буду благодарна, если ответишь сегодня. Ну всё, пока.`,
    glossary: [
      { term: '回', ru: 'сеанс' },
      { term: '満席', ru: 'все места заняты' },
      { term: '取っちゃった', ru: 'взяла (разговорное от 取ってしまった)' },
      { term: '助かります', ru: 'выручишь, буду благодарна' },
    ],
    questions: [
      {
        q: 'ゆかさんは 何時の チケットを 買いましたか。',
        options: ['七時', '買って いません', '日曜の昼', '九時'],
        correct: 3,
      },
      {
        q: 'なぜ 七時に しなかったんですか。',
        options: ['高かったから', '時間が 早いから', '満席だったから', '言って いません'],
        correct: 2,
      },
      {
        q: 'ゆかさんは 何を お願いしましたか。',
        options: ['お金を 払うこと', '今日中に 返事を すること', '映画館で 待つこと', '日曜に 行くこと'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ja-l-kaigi',
    lang: 'ja', title: '会議での提案 (предложение на совещании)', level: 'JLPT N3',
    topic: 'Работа', skill: 'Аудирование', minutes: 2,
    script: `一点だけ よろしいでしょうか。スケジュールそのものより、順番が 気になっています。今の計画だと、デザインが 固まる前に 開発が 始まりますよね。そうすると、あとで 作り直しに なる可能性が 高いと思います。最初の一週間で 画面を 五つだけ 決めて、それから 開発に 渡すのは どうでしょうか。結果的に 全体は 短くなるはずです。もちろん 決めるのは 部長ですが。`,
    translation: `Можно один момент? Меня беспокоят не столько сроки, сколько порядок. По текущему плану разработка начинается до того, как дизайн окончательно утверждён. Думаю, тогда высока вероятность, что потом придётся переделывать. Может, в первую неделю определить всего пять экранов и уже потом передавать в разработку? В итоге весь срок, скорее всего, сократится. Решать, конечно, руководителю.`,
    glossary: [
      { term: '気になる', ru: 'беспокоить, не давать покоя' },
      { term: '固まる', ru: 'здесь: окончательно определиться' },
      { term: '作り直し', ru: 'переделка' },
      { term: '渡す', ru: 'передать' },
      { term: '結果的に', ru: 'в итоге' },
    ],
    questions: [
      {
        q: '話し手が 心配して いるのは 何ですか。',
        options: ['仕事の順番', 'スケジュールの長さ', '人数', '予算'],
        correct: 0,
        why: '「AよりB」 отсекает первую половину: сроки — не главное, главное — порядок.',
      },
      {
        q: '何を 提案しましたか。',
        options: [
          '期間を 二倍に する',
          '開発を 先に 始める',
          '最初の一週間で 画面を 五つ 決める',
          'デザインを やめる'],
        correct: 2,
      },
      {
        q: '話し手の 態度は どうですか。',
        options: ['決定を 求めている', '興味が ない', '怒っている', '提案だけして 決定は 部長に 任せている'],
        correct: 3,
      },
    ],
  },
  {
    id: 'ja-l-news-short',
    lang: 'ja', title: 'ニュース：気温と交通', level: 'JLPT N3',
    topic: 'Технологии и медиа', skill: 'Аудирование', minutes: 2,
    script: `ニュースです。今日、東京では 今年 初めて 三十五度を 超え、猛暑日と なりました。気象庁は、明日も 同じような 暑さが 続くとして、こまめな 水分補給を 呼びかけています。また、この暑さの影響で 一部の路線では レールの 点検が 行われ、午後の運転本数が 減る 見込みです。詳しい情報は 各社の ホームページで ご確認ください。`,
    translation: `Новости. Сегодня в Токио впервые в этом году температура превысила тридцать пять градусов — объявлен день сильной жары. Метеорологическое управление сообщает, что завтра жара сохранится, и призывает чаще пить воду. Кроме того, из-за жары на части линий проводится проверка рельсов, и во второй половине дня число рейсов, как ожидается, сократится. Подробности уточняйте на сайтах перевозчиков.`,
    glossary: [
      { term: '超える', ru: 'превысить' },
      { term: '猛暑日', ru: 'день с температурой выше 35°' },
      { term: 'こまめな', ru: 'частый, регулярный (понемногу и часто)' },
      { term: '水分補給', ru: 'восполнение жидкости, питьё' },
      { term: '見込み', ru: 'ожидается' },
    ],
    questions: [
      {
        q: '今日の 東京の 気温は どうでしたか。',
        options: ['三十度ちょうど', '三十五度を 超えた', '二十五度くらい', '言って いません'],
        correct: 1,
      },
      {
        q: '気象庁は 何を 呼びかけましたか。',
        options: ['こまめに 水分を とること', '外出しないこと', '窓を 閉めること', '電車に 乗らないこと'],
        correct: 0,
      },
      {
        q: '午後の 電車は どうなりますか。',
        options: ['止まる', '早くなる', 'いつも通り', '本数が 減る'],
        correct: 3,
        why: '「減る見込み」 — сокращение ожидается, а не остановка. Разница между 止まる и 減る здесь решает ответ.',
      },
    ],
  },
  {
    id: 'ja-l-machi-annai',
    lang: 'ja', title: '道案内 (объясняют дорогу)', level: 'JLPT N4',
    topic: 'Дом и город', skill: 'Аудирование', minutes: 1,
    script: `郵便局ですね。この道を まっすぐ 行って、二つ目の 信号を 右に 曲がってください。左側に コンビニが ありますが、その 手前です。歩いて 五分くらいですよ。あ、でも 今日は 日曜日なので、窓口は 閉まって いると思います。`,
    translation: `Почта? Идите прямо по этой улице и на втором светофоре поверните направо. Слева будет комбини — почта чуть раньше него. Пешком минут пять. А, но сегодня воскресенье, так что окна, думаю, закрыты.`,
    glossary: [
      { term: 'まっすぐ', ru: 'прямо' },
      { term: '信号', ru: 'светофор' },
      { term: '手前', ru: 'перед (ближе, чем)' },
      { term: '窓口', ru: 'окно обслуживания' },
    ],
    questions: [
      {
        q: 'どこで 曲がりますか。',
        options: ['一つ目の信号を左', '二つ目の信号を左', '二つ目の信号を右', 'コンビニの角'],
        correct: 2,
      },
      {
        q: '郵便局は コンビニの どこに ありますか。',
        options: ['となり', '手前', '向かい', '中'],
        correct: 1,
        why: '手前 — «не доходя до». Ориентир назван не потому, что цель рядом с ним, а чтобы вы поняли, что прошли мимо.',
      },
      {
        q: '今日 郵便局は 使えますか。',
        options: ['窓口は 閉まって いそうです', '使えます', '工事中です', '言って いません'],
        correct: 0,
      },
    ],
  },
]

// ─── Бразильский португальский ───────────────────────────────────────────────
//
// Речь именно бразильская, а не европейская: «a gente» вместо «nós», герундий
// («tô fazendo»), уменьшительные, «você» на любом уровне вежливости. Это то,
// что слышно в Бразилии, — и то, чего нет в учебниках из Лиссабона.

export const PT_MORE: ListeningItem[] = [
  {
    id: 'pt-l-apresentacao',
    lang: 'pt-BR', title: 'Se apresentando (рассказ о себе)', level: 'A1',
    topic: 'Знакомство', skill: 'Аудирование', minutes: 1,
    script: `Oi, gente! Eu sou o Rafael, tenho vinte e sete anos e sou de Recife, mas moro em São Paulo faz três anos. Eu trabalho com fotografia. Nas horas vagas eu jogo futebol e cozinho — cozinho mal, mas cozinho. Prazer em conhecer vocês.`,
    translation: `Привет, ребята! Я Рафаэл, мне двадцать семь, я из Ресифи, но уже три года живу в Сан-Паулу. Работаю фотографом. В свободное время играю в футбол и готовлю — готовлю плохо, но готовлю. Приятно познакомиться.`,
    glossary: [
      { term: 'faz três anos', ru: 'уже три года (как)' },
      { term: 'trabalhar com', ru: 'работать в сфере' },
      { term: 'nas horas vagas', ru: 'в свободное время' },
      { term: 'prazer em conhecer', ru: 'приятно познакомиться' },
    ],
    questions: [
      {
        q: 'De onde ele é?',
        options: ['De São Paulo', 'Do Rio', 'De Recife', 'Ele não diz'],
        correct: 2,
        why: 'Назван и родной город, и город проживания: «sou de…» — откуда родом, «moro em…» — где живёт сейчас.',
      },
      {
        q: 'Há quanto tempo ele mora em São Paulo?',
        options: ['Um ano', 'Dois anos', 'Vinte e sete anos', 'Três anos'],
        correct: 3,
      },
      {
        q: 'O que ele faz nas horas vagas?',
        options: ['Fotografa', 'Joga futebol e cozinha', 'Estuda', 'Viaja'],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-l-previsao',
    lang: 'pt-BR', title: 'Previsão do tempo', level: 'A2',
    topic: 'Погода и природа', skill: 'Аудирование', minutes: 1,
    script: `E agora a previsão do tempo. A manhã começa nublada na capital, com pancadas de chuva a partir das duas da tarde. A máxima hoje fica em vinte e oito graus, e a mínima da madrugada em dezenove. No litoral, o mar continua agitado — não é dia de entrar na água. Amanhã o sol volta.`,
    translation: `А теперь прогноз погоды. Утро в столице начинается облачным, с ливнями с двух часов дня. Максимум сегодня двадцать восемь градусов, минимум ночью девятнадцать. На побережье море остаётся неспокойным — не день для купания. Завтра солнце вернётся.`,
    glossary: [
      { term: 'nublado', ru: 'облачный' },
      { term: 'pancadas de chuva', ru: 'ливни, кратковременные сильные дожди' },
      { term: 'máxima / mínima', ru: 'максимум / минимум температуры' },
      { term: 'mar agitado', ru: 'неспокойное море' },
      { term: 'litoral', ru: 'побережье' },
    ],
    questions: [
      {
        q: 'A partir de que horas chove?',
        options: ['Das duas da tarde', 'Das dez da manhã', 'Da madrugada', 'Não chove'],
        correct: 0,
      },
      {
        q: 'Qual é a temperatura máxima?',
        options: ['19 graus', '38 graus', '28 graus', 'Não diz'],
        correct: 2,
      },
      {
        q: 'O que ele diz sobre o mar?',
        options: [
          'Está calmo, bom para nadar',
          'Está agitado, não é dia de entrar na água',
          'Está frio',
          'Não fala do mar',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-l-entregador',
    lang: 'pt-BR', title: 'O entregador ligando', level: 'A2',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 1,
    script: `Alô, boa noite! Aqui é o entregador, tô na portaria com o seu pedido. O porteiro falou que não pode subir. Você desce ou eu deixo com ele? Ah, e o pagamento é na entrega, viu? São quarenta e dois reais. Se for cartão, eu tenho a maquininha aqui.`,
    translation: `Алло, добрый вечер! Это курьер, я на входе с вашим заказом. Консьерж сказал, что подниматься нельзя. Вы спуститесь или оставить ему? А, и оплата при получении, да? Сорок два реала. Если картой — у меня с собой терминал.`,
    glossary: [
      { term: 'tô', ru: 'разговорное «estou»' },
      { term: 'portaria', ru: 'вход, стойка консьержа' },
      { term: 'porteiro', ru: 'консьерж, вахтёр' },
      { term: 'na entrega', ru: 'при получении' },
      { term: 'maquininha', ru: 'терминал для карт (уменьшительное)' },
    ],
    questions: [
      {
        q: 'Onde está o entregador?',
        options: ['Na portaria', 'Na rua', 'No elevador', 'Na porta do apartamento'],
        correct: 0,
      },
      {
        q: 'Quanto custa o pedido?',
        options: ['R$ 22', 'R$ 40', 'R$ 42', 'Ele não diz'],
        correct: 2,
      },
      {
        q: 'Dá para pagar com cartão?',
        options: ['Não, só dinheiro', 'Sim, ele tem a maquininha', 'Só por aplicativo', 'Ele não diz'],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-l-metro-aviso',
    lang: 'pt-BR', title: 'Aviso no metrô', level: 'A2',
    topic: 'Транспорт и дорога', skill: 'Аудирование', minutes: 1,
    script: `Atenção, senhores passageiros. Devido a uma ocorrência na via, a Linha Azul opera com velocidade reduzida entre as estações Sé e Jabaquara. O tempo de viagem pode aumentar em até vinte minutos. Recomendamos o uso da Linha Verde como alternativa. Agradecemos a compreensão.`,
    translation: `Внимание, уважаемые пассажиры. Из-за происшествия на путях Синяя линия работает со сниженной скоростью между станциями Се и Жабакуара. Время в пути может увеличиться до двадцати минут. Рекомендуем в качестве альтернативы Зелёную линию. Благодарим за понимание.`,
    glossary: [
      { term: 'devido a', ru: 'из-за' },
      { term: 'ocorrência', ru: 'происшествие' },
      { term: 'velocidade reduzida', ru: 'сниженная скорость' },
      { term: 'em até', ru: 'вплоть до' },
      { term: 'compreensão', ru: 'понимание' },
    ],
    questions: [
      {
        q: 'Qual linha está com problema?',
        options: ['A Linha Azul', 'A Linha Verde', 'A Linha Vermelha', 'Todas'],
        correct: 0,
      },
      {
        q: 'Quanto tempo a mais a viagem pode levar?',
        options: ['Até dez minutos', 'Até uma hora', 'Até vinte minutos', 'Não diz'],
        correct: 2,
      },
      {
        q: 'O que o aviso recomenda?',
        options: ['Esperar na estação', 'Usar a Linha Verde', 'Pegar ônibus', 'Sair da estação'],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-l-consulta',
    lang: 'pt-BR', title: 'A clínica confirmando a consulta', level: 'A2',
    topic: 'Здоровье', skill: 'Аудирование', minutes: 1,
    script: `Bom dia, aqui é da Clínica Santa Rita. Estou ligando para confirmar a sua consulta com a doutora Beatriz na quarta-feira, dia doze, às nove e meia. Pedimos que chegue quinze minutos antes e traga um documento com foto e a carteirinha do convênio. Se precisar remarcar, é só responder essa mensagem. Obrigada!`,
    translation: `Доброе утро, это клиника «Санта-Рита». Звоню подтвердить вашу запись к доктору Беатриз в среду, двенадцатого, в девять тридцать. Просим прийти на пятнадцать минут раньше и взять документ с фотографией и карточку страховки. Если нужно перенести — просто ответьте на это сообщение. Спасибо!`,
    glossary: [
      { term: 'consulta', ru: 'приём у врача' },
      { term: 'nove e meia', ru: 'полдесятого' },
      { term: 'carteirinha do convênio', ru: 'карточка медстраховки' },
      { term: 'remarcar', ru: 'перенести запись' },
    ],
    questions: [
      {
        q: 'Que horas é a consulta?',
        options: ['9:30', '9:15', '9:00', '10:30'],
        correct: 0,
      },
      {
        q: 'O que a paciente precisa levar?',
        options: [
          'Só o documento',
          'Dinheiro',
          'Documento com foto e a carteirinha do convênio',
          'Exames antigos'],
        correct: 2,
      },
      {
        q: 'Como remarcar?',
        options: ['Ligando para a clínica', 'Não dá para remarcar', 'Indo até lá', 'Respondendo a mensagem'],
        correct: 3,
      },
    ],
  },
  {
    id: 'pt-l-mercado',
    lang: 'pt-BR', title: 'Na feira', level: 'A2',
    topic: 'Еда', skill: 'Аудирование', minutes: 1,
    script: `Feirante: Chega, freguesa! Manga tá cinco o quilo hoje, tá docinha demais.
Cliente: Me vê dois quilos. E o mamão, quanto tá?
Feirante: O mamão é sete. Mas se levar os dois, faço tudo por quinze.
Cliente: Fechado. Pode pôr numa sacola só.`,
    translation: `Продавец: Подходите! Манго сегодня по пять за кило, очень сладкое.
Покупательница: Дайте два кило. А папайя почём?
Продавец: Папайя семь. Но если возьмёте и то и другое — отдам всё за пятнадцать.
Покупательница: Договорились. Положите в один пакет.`,
    glossary: [
      { term: 'freguesa', ru: 'покупательница (обращение на рынке)' },
      { term: 'tá', ru: 'разговорное «está»' },
      { term: 'me vê', ru: 'дайте мне (разговорное на рынке)' },
      { term: 'fechado', ru: 'договорились' },
      { term: 'sacola', ru: 'пакет' },
    ],
    questions: [
      {
        q: 'Quanto custa o quilo da manga?',
        options: ['Sete reais', 'Cinco reais', 'Quinze reais', 'Não diz'],
        correct: 1,
      },
      {
        q: 'Quanto a cliente vai pagar no total?',
        options: ['R$ 15', 'R$ 12', 'R$ 17', 'R$ 20'],
        correct: 0,
        why: 'Отдельные цены названы, но итог — другой: продавец предлагает свою цену за всё. Слушать надо до конца.',
      },
      {
        q: 'O que significa "faço tudo por quinze"?',
        options: [
          'Cada fruta custa quinze',
          'Ele vende quinze quilos',
          'Ele dá quinze de desconto',
          'O preço final de tudo é quinze'],
        correct: 3,
      },
    ],
  },
  {
    id: 'pt-l-hotel',
    lang: 'pt-BR', title: 'Check-in na pousada', level: 'A2',
    topic: 'Путешествия', skill: 'Аудирование', minutes: 2,
    script: `Recepção: Boa tarde! Reserva no nome de quem?
Hóspede: Silva. Duas noites, quarto de casal.
Recepção: Isso. Quarto doze, segundo andar. O café da manhã é das sete às dez, ali no salão. O wi-fi é "pousada" e a senha é o telefone daqui, sem o DDD.
Hóspede: E dá para guardar as malas depois do check-out?
Recepção: Dá sim, até as seis da tarde.`,
    translation: `Ресепшн: Добрый день! На чьё имя бронь?
Гость: Силва. Две ночи, двухместный номер.
Ресепшн: Да, верно. Номер двенадцать, второй этаж. Завтрак с семи до десяти, вон там в зале. Wi-fi называется «pousada», пароль — наш телефон без кода города.
Гость: А можно оставить чемоданы после выезда?
Ресепшн: Да, до шести вечера.`,
    glossary: [
      { term: 'pousada', ru: 'небольшая гостиница' },
      { term: 'quarto de casal', ru: 'номер с двуспальной кроватью' },
      { term: 'café da manhã', ru: 'завтрак' },
      { term: 'DDD', ru: 'телефонный код города в Бразилии' },
      { term: 'guardar as malas', ru: 'оставить чемоданы на хранение' },
    ],
    questions: [
      {
        q: 'Qual é o número do quarto?',
        options: ['Dois', 'Vinte', 'Doze', 'Não diz'],
        correct: 2,
      },
      {
        q: 'Qual é a senha do wi-fi?',
        options: [
          'A palavra "pousada"',
          'O telefone da pousada, sem o DDD',
          'O número do quarto',
          'Não tem senha',
        ],
        correct: 1,
        why: 'Название сети и пароль звучат подряд — на слух легко склеить их в одно.',
      },
      {
        q: 'Até que horas guardam as malas?',
        options: ['Seis da tarde', 'Quatro da tarde', 'Meio-dia', 'Não guardam'],
        correct: 0,
      },
    ],
  },
  {
    id: 'pt-l-aula',
    lang: 'pt-BR', title: 'Primeiro dia de aula', level: 'B1',
    topic: 'Учёба', skill: 'Аудирование', minutes: 2,
    script: `Antes de começar, três recados. Primeiro: o material fica no drive da turma, e eu subo sempre na véspera, não depois da aula. Segundo: não tem prova final nessa disciplina; são dois trabalhos, um na semana seis e outro na doze. E terceiro: quem faltar mais de quatro aulas reprova por presença, e isso eu não tenho como mudar. Agora sim, vamos ao conteúdo.`,
    translation: `Прежде чем начать — три объявления. Первое: материалы лежат на общем диске группы, и я выкладываю их всегда накануне, а не после занятия. Второе: итогового экзамена по этой дисциплине нет, будет две работы — на шестой неделе и на двенадцатой. И третье: кто пропустит больше четырёх занятий, не получит зачёт по посещаемости, и с этим я ничего сделать не могу. Ну а теперь к содержанию.`,
    glossary: [
      { term: 'recado', ru: 'сообщение, объявление' },
      { term: 'na véspera', ru: 'накануне' },
      { term: 'disciplina', ru: 'учебный предмет' },
      { term: 'reprovar por presença', ru: 'не сдать из-за пропусков' },
      { term: 'não tenho como mudar', ru: 'не в моих силах изменить' },
    ],
    questions: [
      {
        q: 'Quando o material é publicado?',
        options: ['Depois da aula', 'No fim do semestre', 'Na véspera', 'Não é publicado'],
        correct: 2,
      },
      {
        q: 'Como a disciplina é avaliada?',
        options: ['Uma prova final', 'Provas semanais', 'Prova e trabalho', 'Dois trabalhos'],
        correct: 3,
      },
      {
        q: 'Quantas faltas reprovam o aluno?',
        options: ['Duas', 'Mais de quatro', 'Quatro', 'Não há limite'],
        correct: 1,
        why: '«Mais de quatro» — четыре ещё можно, пять уже нет. На слух легко потерять «mais de».',
      },
    ],
  },
  {
    id: 'pt-l-daily',
    lang: 'pt-BR', title: 'A daily do time', level: 'B1',
    topic: 'Работа', skill: 'Аудирование', minutes: 1,
    script: `Bom dia, pessoal. Ontem eu fechei a tela de busca vazia e passei pro Tom revisar. Hoje eu pego os filtros — até o fim do dia eu tenho alguma coisa pra mostrar. Um impedimento: eu ainda tô esperando os textos das telas de erro, então isso tá parado. Se alguém souber quem é o dono desses textos, me chama depois da daily.`,
    translation: `Всем доброе утро. Вчера я закончил пустое состояние экрана поиска и передал Тому на ревью. Сегодня беру фильтры — к концу дня будет что показать. Одна помеха: всё ещё жду тексты для экранов ошибок, они стоят. Если кто-то знает, кто отвечает за эти тексты, напишите мне после дейли.`,
    glossary: [
      { term: 'fechar (uma tarefa)', ru: 'закрыть, доделать задачу' },
      { term: 'passar pra alguém', ru: 'передать кому-то' },
      { term: 'impedimento', ru: 'помеха, блокер' },
      { term: 'tá parado', ru: 'стоит, не двигается' },
      { term: 'me chama', ru: 'напиши мне (разговорное)' },
    ],
    questions: [
      {
        q: 'O que ele vai fazer hoje?',
        options: ['Os filtros', 'A tela de busca', 'As telas de erro', 'Nada, está parado'],
        correct: 0,
      },
      {
        q: 'Qual é o impedimento?',
        options: ['Falta de design', 'Não tem impedimento', 'O build quebrou', 'Está esperando os textos'],
        correct: 3,
      },
      {
        q: 'O que ele pede ao time?',
        options: ['Mais prazo', 'Uma revisão de código', 'Saber quem é o dono dos textos', 'Ajuda com os filtros'],
        correct: 2,
      },
    ],
  },
  {
    id: 'pt-l-podcast-cidade',
    lang: 'pt-BR', title: 'Podcast: por que a cidade não anda', level: 'B1',
    topic: 'Дом и город', skill: 'Аудирование', minutes: 2,
    script: `…e o dado que mais me chamou atenção não foi o número de carros. Foi o número de viagens curtas. Quase metade das viagens de carro na cidade tem menos de três quilômetros — ou seja, distância de bicicleta, de patinete, de caminhada até. O problema é que a pessoa não se sente segura fazendo isso. Onde a prefeitura colocou ciclovia protegida, o uso de bicicleta triplicou em dois anos. Não é questão de convencer ninguém, é questão de infraestrutura.`,
    translation: `…и больше всего меня зацепило не число машин. А число коротких поездок. Почти половина автомобильных поездок по городу — меньше трёх километров, то есть расстояние для велосипеда, самоката, даже пешком. Проблема в том, что человек не чувствует себя в безопасности. Там, где мэрия сделала защищённую велодорожку, использование велосипеда за два года выросло втрое. Дело не в том, чтобы кого-то убедить, а в инфраструктуре.`,
    glossary: [
      { term: 'chamar atenção', ru: 'привлечь внимание' },
      { term: 'viagens curtas', ru: 'короткие поездки' },
      { term: 'patinete', ru: 'самокат' },
      { term: 'ciclovia protegida', ru: 'велодорожка с отбойником' },
      { term: 'triplicar', ru: 'вырасти втрое' },
    ],
    questions: [
      {
        q: 'Qual dado surpreendeu o apresentador?',
        options: [
          'O número de carros',
          'O número de viagens curtas',
          'O preço da gasolina',
          'O número de acidentes',
        ],
        correct: 1,
        why: '«Não foi X, foi Y» — настоящий ответ всегда во второй половине.',
      },
      {
        q: 'O que aconteceu onde há ciclovia protegida?',
        options: ['O uso de bicicleta triplicou', 'Nada mudou', 'Aumentou o trânsito', 'Diminuiu o uso'],
        correct: 0,
      },
      {
        q: 'Qual é a conclusão dele?',
        options: [
          'É preciso convencer as pessoas',
          'Os carros deveriam ser proibidos',
          'É questão de infraestrutura',
          'Não há solução'],
        correct: 2,
      },
    ],
  },
  {
    id: 'pt-l-entrevista',
    lang: 'pt-BR', title: 'Combinando a entrevista', level: 'B2',
    topic: 'Собеседование и резюме', skill: 'Аудирование', minutes: 2,
    script: `Oi, Daniil, tudo bem? É a Carla, do RH da Vector. Vou te adiantar como vai ser o processo pra você não ficar no escuro. São três etapas: uma conversa comigo, de uns vinte minutos, depois uma técnica com dois engenheiros, que costuma durar uma hora, e por último um bate-papo com a liderança. Não tem teste pra fazer em casa — a gente tirou isso do processo no ano passado justamente porque tomava muito tempo dos candidatos. Me manda dois horários seus pra semana que vem que eu encaixo.`,
    translation: `Привет, Даниил, как дела? Это Карла из HR компании Vector. Расскажу заранее, как будет устроен процесс, чтобы ты не оставался в неведении. Три этапа: разговор со мной минут на двадцать, затем техническое интервью с двумя инженерами, обычно около часа, и в конце беседа с руководством. Домашнего задания нет — мы убрали его в прошлом году как раз потому, что оно отнимало у кандидатов слишком много времени. Пришли мне два своих удобных времени на следующую неделю, я подстрою.`,
    glossary: [
      { term: 'RH', ru: 'отдел кадров (recursos humanos)' },
      { term: 'adiantar', ru: 'рассказать заранее' },
      { term: 'ficar no escuro', ru: 'оставаться в неведении' },
      { term: 'bate-papo', ru: 'неформальный разговор' },
      { term: 'encaixar', ru: 'вписать в расписание' },
    ],
    questions: [
      {
        q: 'Quantas etapas tem o processo?',
        options: ['Duas', 'Três', 'Quatro', 'Ela não diz'],
        correct: 1,
      },
      {
        q: 'Por que não há teste em casa?',
        options: [
          'Porque tomava muito tempo dos candidatos',
          'Porque não avaliava bem',
          'Porque ninguém entregava',
          'Ela não explica'],
        correct: 0,
      },
      {
        q: 'O que ela pede ao candidato?',
        options: [
          'O currículo atualizado',
          'A pretensão salarial',
          'Uma carta de recomendação',
          'Dois horários da semana que vem'],
        correct: 3,
      },
    ],
  },
  {
    id: 'pt-l-noticia',
    lang: 'pt-BR', title: 'Boletim de notícias', level: 'B2',
    topic: 'Технологии и медиа', skill: 'Аудирование', minutes: 2,
    script: `Os destaques desta hora. A greve dos motoristas de ônibus prevista para segunda-feira foi suspensa depois de um acordo fechado na madrugada; o sindicato ressaltou, porém, que o reajuste vale apenas até dezembro e que a negociação será retomada. O governo divulgou o relatório de moradia, que sugere flexibilizar as regras de construção perto de estações de metrô — proposta que já recebeu críticas de três prefeituras da região. E no esporte: depois de duas horas de chuva, a partida foi retomada pouco antes das cinco.`,
    translation: `Главное на этот час. Забастовка водителей автобусов, намеченная на понедельник, приостановлена после соглашения, заключённого ночью; профсоюз, впрочем, подчеркнул, что повышение действует только до декабря и переговоры будут возобновлены. Правительство опубликовало доклад по жилью, который предлагает смягчить правила застройки рядом со станциями метро, — предложение уже вызвало критику трёх муниципалитетов региона. И спорт: после двух часов дождя матч возобновился незадолго до пяти.`,
    glossary: [
      { term: 'greve', ru: 'забастовка' },
      { term: 'suspender', ru: 'приостановить, отменить' },
      { term: 'ressaltar', ru: 'подчеркнуть' },
      { term: 'reajuste', ru: 'повышение (зарплаты, тарифа)' },
      { term: 'flexibilizar', ru: 'смягчить, сделать гибче' },
    ],
    questions: [
      {
        q: 'O que aconteceu com a greve?',
        options: ['Começou', 'Foi ampliada', 'Foi suspensa', 'Foi adiada uma semana'],
        correct: 2,
      },
      {
        q: 'O que o sindicato ressaltou?',
        options: [
          'Que o acordo é definitivo',
          'Que o reajuste vale só até dezembro',
          'Que recusou o acordo',
          'Que quer mais filiados',
        ],
        correct: 1,
        why: 'Оговорка идёт после «porém». В новостях это стандартное место для условия, которое портит хорошую новость.',
      },
      {
        q: 'Como o relatório de moradia foi recebido?',
        options: [
          'Com críticas de três prefeituras',
          'Com apoio geral',
          'Sem reação',
          'Ainda não foi divulgado'],
        correct: 0,
      },
    ],
  },
]

// ─── Сборка ──────────────────────────────────────────────────────────────────

export const LISTENING_EXTRA: ListeningItem[] = [...EN_MORE, ...KO_MORE, ...JA_MORE, ...PT_MORE]
