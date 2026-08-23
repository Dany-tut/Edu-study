// ─────────────────────────────────────────────────────────────────────────────
// Библиотека аудирования для языкового тренажёра
//
// ДВА ТИПА МАТЕРИАЛА, И ОБА ЗАКОННЫЕ
//
//  1. СВОИ СКРИПТЫ. Текст написан нами, звук получается синтезом речи прямо в
//     браузере и кэшируется по хешу текста. Ничего не скачивается, ничего не
//     хранится, лицензировать нечего. Плюс не только юридический: скрипт
//     пишется под уровень, поэтому в нём нет конструкций из следующего уровня —
//     чего нельзя сказать про случайный подкаст.
//
//  2. ЧУЖИЕ ВИДЕО — ТОЛЬКО ССЫЛКОЙ. Встраивание ролика плеером YouTube законно
//     и предусмотрено сервисом; скачивание и перезалив — нет. Автор получает
//     свои просмотры, мы ничего не копируем. Все идентификаторы проверены
//     запросом к oEmbed: по памяти они восстанавливаются неверно.
//
// ЧЕГО ЗДЕСЬ НЕТ. Вырезанных кусков из фильмов и подкастов: это ровно то, за
// что приходят претензии, и обойти это «мы же учебные» нельзя.
//
// ОГРАНИЧЕНИЕ СИНТЕЗА. Браузерный синтез — не эталон произношения: голос
// зависит от системы, и на машине без нужного языкового пакета озвучки просто
// не будет. Для тренировки понимания на слух этого достаточно, для постановки
// произношения — нет, там нужна запись носителя.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReadingQuestion, Gloss } from './readingLibrary'

export interface ListeningItem {
  id: string
  lang: string
  title: string
  /** Уровень по шкале своего языка. */
  level: string
  topic: string
  skill: string
  minutes: number
  /**
   * Скрипт для синтеза речи. Это же расшифровка — показывается ПОСЛЕ ответов,
   * иначе задание превращается в чтение.
   */
  script?: string
  /** Ссылка на ролик, если материал видеo. Взаимоисключает script. */
  videoUrl?: string
  /** Кто автор ролика — показывается рядом, чтобы источник был виден. */
  credit?: string
  translation?: string
  glossary: Gloss[]
  questions: ReadingQuestion[]
}

// ─── Английский ──────────────────────────────────────────────────────────────

const EN: ListeningItem[] = [
  {
    id: 'en-l-voicemail',
    lang: 'en', title: 'A voicemail from a recruiter', level: 'A2',
    topic: 'Переписка и созвоны', skill: 'Аудирование', minutes: 2,
    script: `Hi, this is Anna from Nordic Labs. I'm calling about your application for the Product Designer role. We'd like to invite you to a short call — about twenty minutes — sometime this week. Wednesday or Thursday would work best for us, between ten and four. Could you send me a couple of times that suit you? My email is anna dot k at nordiclabs dot com. Thanks, and talk soon.`,
    translation: `Здравствуйте, это Анна из Nordic Labs. Звоню по поводу вашей заявки на позицию продуктового дизайнера. Хотим пригласить вас на короткий звонок, минут на двадцать, на этой неделе. Нам удобнее среда или четверг, с десяти до четырёх. Пришлите, пожалуйста, пару удобных вам вариантов. Моя почта — anna.k@nordiclabs.com. Спасибо, до связи.`,
    glossary: [
      { term: 'application', ru: 'заявка, отклик' },
      { term: 'to invite', ru: 'пригласить' },
      { term: 'would work best', ru: 'удобнее всего' },
      { term: 'to suit', ru: 'подходить (по времени)' },
      { term: 'talk soon', ru: 'до связи' },
    ],
    questions: [
      {
        q: 'What does Anna want?',
        options: ['To offer the job', 'To schedule a short call', 'To reject the application', 'To ask for a test task'],
        correct: 1,
      },
      {
        q: 'Which days work best for her?',
        options: ['Monday or Tuesday', 'Wednesday or Thursday', 'Friday', 'Any day'],
        correct: 1,
      },
      {
        q: 'What does she ask you to send?',
        options: ['Your portfolio', 'A couple of times that suit you', 'Your salary expectations', 'A cover letter'],
        correct: 1,
        why: 'Ключевая фраза — «send me a couple of times that suit you». В голосовых сообщениях просьба почти всегда в конце.',
      },
    ],
  },
  {
    id: 'en-l-standup',
    lang: 'en', title: 'A stand-up update', level: 'B1',
    topic: 'Работа', skill: 'Аудирование', minutes: 1,
    script: `Morning everyone. Yesterday I finished the empty states for search and handed them off to Tom. Today I'm picking up the filters — I should have something to show by the end of the day. One blocker: I'm still waiting on the copy for the error screens, so those are on hold. If anyone knows who owns that, let me know after stand-up.`,
    translation: `Всем доброе утро. Вчера я закончил пустые состояния для поиска и передал их Тому. Сегодня берусь за фильтры — к концу дня будет что показать. Одно препятствие: всё ещё жду тексты для экранов с ошибками, они пока стоят. Если кто-то знает, кто за них отвечает, скажите после планёрки.`,
    glossary: [
      { term: 'to hand off', ru: 'передать' },
      { term: 'to pick up', ru: 'взяться за' },
      { term: 'blocker', ru: 'то, что мешает двигаться' },
      { term: 'on hold', ru: 'приостановлено' },
      { term: 'to own something', ru: 'отвечать за что-то' },
    ],
    questions: [
      {
        q: 'What is the speaker working on today?',
        options: ['Empty states', 'The filters', 'The error screens', 'Nothing, they are blocked'],
        correct: 1,
      },
      {
        q: 'What is blocking them?',
        options: ['A missing design', 'Waiting on the copy', 'A broken build', 'No blockers'],
        correct: 1,
      },
      {
        q: 'What do they ask the team for?',
        options: ['More time', 'Who owns the copy', 'A code review', 'A new laptop'],
        correct: 1,
      },
    ],
  },
]

// ─── Корейский ───────────────────────────────────────────────────────────────

const KO: ListeningItem[] = [
  {
    id: 'ko-l-announcement',
    lang: 'ko', title: '지하철 안내 방송 (объявление в метро)', level: 'TOPIK 1급',
    topic: 'Транспорт и дорога', skill: 'Аудирование', minutes: 1,
    script: `이번 역은 서울역, 서울역입니다. 내리실 문은 오른쪽입니다. 공항으로 가시는 분은 이번 역에서 내리세요. 다음 역은 시청역입니다.`,
    translation: `Следующая станция — Соульёк, Соульёк. Двери открываются справа. Кто едет в аэропорт — выходите на этой станции. Следующая станция — Сичхон.`,
    glossary: [
      { term: '이번 역', ru: 'эта станция' },
      { term: '내리다', ru: 'выходить (из транспорта)' },
      { term: '오른쪽', ru: 'справа' },
      { term: '공항', ru: 'аэропорт' },
      { term: '다음 역', ru: 'следующая станция' },
    ],
    questions: [
      {
        q: '문은 어느 쪽으로 열려요?',
        options: ['왼쪽', '오른쪽', '양쪽', '방송에 없어요'],
        correct: 1,
      },
      {
        q: '공항에 가는 사람은 어떻게 해요?',
        options: ['다음 역에서 내려요', '이번 역에서 내려요', '안 내려요', '시청역에서 내려요'],
        correct: 1,
      },
      {
        q: '다음 역은 어디예요?',
        options: ['서울역', '시청역', '공항', '방송에 없어요'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ko-l-cafe',
    lang: 'ko', title: '카페에서 주문하기 (заказ в кафе)', level: 'TOPIK 1급',
    topic: 'Кафе и ресторан', skill: 'Аудирование', minutes: 1,
    script: `점원: 어서 오세요. 주문하시겠어요?
손님: 아메리카노 두 잔 주세요.
점원: 따뜻한 거요, 차가운 거요?
손님: 차가운 걸로 주세요. 얼마예요?
점원: 구천 원입니다. 여기에서 드세요?
손님: 아니요, 가지고 갈게요.`,
    translation: `Продавец: Добро пожаловать. Будете заказывать?
Гость: Два американо, пожалуйста.
Продавец: Горячий или холодный?
Гость: Холодный. Сколько стоит?
Продавец: Девять тысяч вон. Здесь будете пить?
Гость: Нет, с собой.`,
    glossary: [
      { term: '주문하다', ru: 'заказывать' },
      { term: '따뜻한', ru: 'тёплый, горячий' },
      { term: '차가운', ru: 'холодный' },
      { term: '가지고 가다', ru: 'взять с собой' },
    ],
    questions: [
      {
        q: '손님은 뭘 주문했어요?',
        options: ['아메리카노 한 잔', '아메리카노 두 잔', '차 두 잔', '주스 한 잔'],
        correct: 1,
      },
      {
        q: '따뜻한 거예요, 차가운 거예요?',
        options: ['따뜻한 거', '차가운 거', '둘 다', '안 정했어요'],
        correct: 1,
      },
      {
        q: '얼마예요?',
        options: ['칠천 원', '구천 원', '만 원', '안 나왔어요'],
        correct: 1,
      },
    ],
  },
]

// ─── Японский ────────────────────────────────────────────────────────────────

const JA: ListeningItem[] = [
  {
    id: 'ja-l-station',
    lang: 'ja', title: 'えきの アナウンス (объявление на станции)', level: 'JLPT N5',
    topic: 'Транспорт и дорога', skill: 'Аудирование', minutes: 1,
    script: `つぎは とうきょう、とうきょうです。おでぐちは みぎがわです。くうこうへ いく おきゃくさまは、この えきで おのりかえ ください。`,
    translation: `Следующая — Токио, Токио. Выход справа. Пассажирам, следующим в аэропорт, пересадка на этой станции.`,
    glossary: [
      { term: 'つぎ', ru: 'следующий' },
      { term: 'でぐち', ru: 'выход' },
      { term: 'みぎがわ', ru: 'правая сторона' },
      { term: 'くうこう', ru: 'аэропорт' },
      { term: 'のりかえ', ru: 'пересадка' },
    ],
    questions: [
      {
        q: 'でぐちは どちらですか。',
        options: ['ひだりがわ', 'みぎがわ', 'りょうほう', 'アナウンスに ありません'],
        correct: 1,
      },
      {
        q: 'くうこうへ いく ひとは どうしますか。',
        options: ['つぎの えきで おります', 'この えきで のりかえます', 'なにも しません', 'とうきょうで おります'],
        correct: 1,
      },
      {
        q: 'つぎの えきは どこですか。',
        options: ['くうこう', 'とうきょう', 'しんじゅく', 'わかりません'],
        correct: 1,
      },
    ],
  },
]

// ─── Бразильский португальский ───────────────────────────────────────────────

const PT: ListeningItem[] = [
  {
    id: 'pt-l-cafe',
    lang: 'pt-BR', title: 'Pedindo no café (заказ в кафе)', level: 'A1',
    topic: 'Кафе и ресторан', skill: 'Аудирование', minutes: 1,
    script: `Atendente: Oi, boa tarde! Vai querer o quê?
Cliente: Dois cafés, por favor.
Atendente: Quente ou gelado?
Cliente: Gelado. Quanto fica?
Atendente: Dá dezoito reais. É pra viagem?
Cliente: É, pra viagem.`,
    translation: `Продавец: Привет, добрый день! Что будете?
Клиент: Два кофе, пожалуйста.
Продавец: Горячий или со льдом?
Клиент: Со льдом. Сколько выходит?
Продавец: Восемнадцать реалов. С собой?
Клиент: Да, с собой.`,
    glossary: [
      { term: 'vai querer o quê?', ru: 'что будете? — разговорное' },
      { term: 'gelado', ru: 'холодный, со льдом' },
      { term: 'quanto fica?', ru: 'сколько выходит?' },
      { term: 'pra viagem', ru: 'с собой (на вынос)' },
    ],
    questions: [
      {
        q: 'Quantos cafés o cliente pediu?',
        options: ['Um', 'Dois', 'Três', 'Não disse'],
        correct: 1,
      },
      {
        q: 'Como ele quer o café?',
        options: ['Quente', 'Gelado', 'Com leite', 'Não disse'],
        correct: 1,
      },
      {
        q: 'O que significa "pra viagem"?',
        options: ['Para beber ali', 'Para levar', 'Para dividir', 'Para viajar de avião'],
        correct: 1,
        why: '«Pra viagem» — устойчивое выражение «на вынос», к путешествию отношения не имеет.',
      },
    ],
  },
]


// ─── Добавочные материалы: ступень выше стартовых ────────────────────────────

const MORE: ListeningItem[] = [
  {
    id: 'en-l-interview',
    lang: 'en', title: 'The first minute of an interview', level: 'B1',
    topic: 'Собеседование и резюме', skill: 'Аудирование', minutes: 2,
    script: `Thanks for joining, Daniil. Before we start, let me tell you how this will go. I'll take about ten minutes to walk you through the role and the team, then I'd like to hear about your background — maybe fifteen minutes. After that we'll leave time for your questions, so please save them up. The whole thing should take around forty minutes. Does that work for you? Great. So, a bit about us first.`,
    translation: `Спасибо, что подключились, Даниил. Прежде чем начнём, расскажу, как всё пройдёт. Минут десять я расскажу про роль и команду, потом хотел бы услышать про ваш опыт — минут пятнадцать. После этого оставим время на ваши вопросы, так что придержите их. Всё займёт около сорока минут. Вам подходит? Отлично. Итак, сначала немного о нас.`,
    glossary: [
      { term: 'to walk you through', ru: 'провести вас по, рассказать по порядку' },
      { term: 'background', ru: 'опыт, предыстория' },
      { term: 'to save up questions', ru: 'придержать вопросы' },
      { term: 'Does that work for you?', ru: 'вам так подходит?' },
    ],
    questions: [
      {
        q: 'What should you do with your questions?',
        options: ['Ask them right away', 'Save them for the end', 'Send them by email', 'Do not ask any'],
        correct: 1,
      },
      {
        q: 'How long will the whole interview take?',
        options: ['Ten minutes', 'Fifteen minutes', 'About forty minutes', 'He does not say'],
        correct: 2,
      },
      {
        q: 'What happens first?',
        options: [
          'You talk about your background',
          'He talks about the role and the team',
          'You ask questions',
          'A technical test',
        ],
        correct: 1,
        why: 'Порядок проговаривается в начале — это стандартная практика, и по ней можно готовиться слушать.',
      },
    ],
  },
  {
    id: 'ko-l-directions',
    lang: 'ko', title: '길 묻기 (спрашиваем дорогу)', level: 'TOPIK 2급',
    topic: 'Транспорт и дорога', skill: 'Аудирование', minutes: 1,
    script: `손님: 실례합니다. 시청역이 어디예요?
행인: 여기에서 조금 멀어요. 걸어서 십오 분쯤 걸려요.
손님: 버스도 있어요?
행인: 네, 저기 정류장에서 오백이 번 버스를 타세요. 세 정거장이에요.
손님: 감사합니다!`,
    translation: `Прохожий: Извините. Где станция Сичхон?
Местный: Отсюда далековато. Пешком минут пятнадцать.
Прохожий: А автобус есть?
Местный: Да, вон на той остановке садитесь на 502-й. Три остановки.
Прохожий: Спасибо!`,
    glossary: [
      { term: '실례합니다', ru: 'извините (при обращении)' },
      { term: '멀다', ru: 'быть далеко' },
      { term: '걸어서', ru: 'пешком' },
      { term: '정류장', ru: 'остановка' },
      { term: '정거장', ru: 'остановка (как счётная единица пути)' },
    ],
    questions: [
      {
        q: '걸어서 얼마나 걸려요?',
        options: ['오 분', '십 분', '십오 분', '삼십 분'],
        correct: 2,
      },
      {
        q: '몇 번 버스를 타요?',
        options: ['오십이 번', '오백이 번', '이백오 번', '말 안 했어요'],
        correct: 1,
        why: '오백이 — 502. Числа в адресах и номерах читаются китайскими числительными.',
      },
      {
        q: '버스로 몇 정거장이에요?',
        options: ['두 정거장', '세 정거장', '네 정거장', '다섯 정거장'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ja-l-shop',
    lang: 'ja', title: 'コンビニで (в магазине)', level: 'JLPT N5',
    topic: 'Покупки и деньги', skill: 'Аудирование', minutes: 1,
    script: `てんいん：いらっしゃいませ。
きゃく：これ、ください。
てんいん：はい。おべんとうは あたためますか。
きゃく：はい、おねがいします。
てんいん：ぜんぶで はっぴゃくえんです。
きゃく：カードで おねがいします。
てんいん：ありがとうございました。`,
    translation: `Продавец: Добро пожаловать.
Покупатель: Вот это, пожалуйста.
Продавец: Хорошо. Бэнто разогреть?
Покупатель: Да, пожалуйста.
Продавец: Всего восемьсот иен.
Покупатель: Картой, пожалуйста.
Продавец: Спасибо.`,
    glossary: [
      { term: 'いらっしゃいませ', ru: 'добро пожаловать (говорят каждому входящему)' },
      { term: 'あたためる', ru: 'разогреть' },
      { term: 'ぜんぶで', ru: 'всего, итого' },
      { term: 'カードで', ru: 'картой' },
    ],
    questions: [
      {
        q: 'てんいんは なにを ききましたか。',
        options: [
          'おかねの はらいかた',
          'おべんとうを あたためるか',
          'ふくろが いるか',
          'なにも きいて いません',
        ],
        correct: 1,
      },
      {
        q: 'いくらですか。',
        options: ['はっぴゃくえん', 'はっせんえん', 'ろっぴゃくえん', 'いいませんでした'],
        correct: 0,
      },
      {
        q: 'どうやって はらいますか。',
        options: ['げんきんで', 'カードで', 'スマホで', 'いいませんでした'],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-l-directions',
    lang: 'pt-BR', title: 'Pedindo informação na rua', level: 'A2',
    topic: 'Транспорт и дорога', skill: 'Аудирование', minutes: 1,
    script: `Turista: Com licença, você sabe onde fica a estação de metrô?
Moradora: Fica ali, ó. Você segue reto por dois quarteirões e vira à direita.
Turista: É longe?
Moradora: Não, uns cinco minutinhos a pé.
Turista: E tem ônibus também?
Moradora: Tem, mas o metrô é bem mais rápido a essa hora.
Turista: Valeu, obrigado!`,
    translation: `Турист: Извините, вы не знаете, где станция метро?
Местная: Вон там. Идёте прямо два квартала и поворачиваете направо.
Турист: Далеко?
Местная: Нет, минут пять пешком.
Турист: А автобус тоже есть?
Местная: Есть, но метро в это время намного быстрее.
Турист: Спасибо!`,
    glossary: [
      { term: 'com licença', ru: 'извините (когда обращаетесь или проходите)' },
      { term: 'seguir reto', ru: 'идти прямо' },
      { term: 'quarteirão', ru: 'квартал' },
      { term: 'minutinhos', ru: 'минуточки — уменьшительное, очень бразильская черта' },
      { term: 'valeu', ru: 'спасибо (разговорное)' },
    ],
    questions: [
      {
        q: 'Quanto tempo leva a pé?',
        options: ['Dois minutos', 'Cinco minutos', 'Quinze minutos', 'Ela não diz'],
        correct: 1,
      },
      {
        q: 'O que ela recomenda?',
        options: ['O ônibus', 'O metrô', 'Táxi', 'Ir a pé'],
        correct: 1,
        why: '«O metrô é bem mais rápido a essa hora» — она прямо сравнивает и советует.',
      },
      {
        q: 'O que significa "minutinhos"?',
        options: [
          'Muitos minutos',
          'Uns poucos minutos — o diminutivo suaviza',
          'Minutos exatos',
          'Horas',
        ],
        correct: 1,
        why: 'Уменьшительные суффиксы в бразильском смягчают и приуменьшают. Это стилистическая черта, а не размер.',
      },
    ],
  },
]


// ─── Немецкий ────────────────────────────────────────────────────────────────
//
// Скрипты написаны нами и озвучиваются синтезом: объявления на вокзале и
// автоответчики ведомств — именно то, что приезжий не понимает первым, потому
// что там быстро, без пауз и с числами. Числа тут не случайно почти в каждой
// записи: перевёрнутый порядок (einundzwanzig) на слух ломается первым.

const DE_LISTEN: ListeningItem[] = [
  {
    id: 'de-l-bahnhof',
    lang: 'de', title: 'Ansage am Bahnhof (объявление на вокзале)', level: 'A2',
    topic: 'Путешествия', skill: 'Аудирование', minutes: 1,
    script: `Achtung an Gleis sieben. Der Intercity-Express 1592 nach Hamburg Hauptbahnhof, planmäßige Abfahrt vierzehn Uhr zweiundzwanzig, hat heute etwa fünfzehn Minuten Verspätung. Grund dafür ist eine Verzögerung im Betriebsablauf. Der Zug fährt heute abweichend von Gleis neun ab. Wir bitten um Ihr Verständnis.`,
    translation: `Внимание на седьмом пути. Поезд ICE 1592 до Гамбурга, отправление по расписанию в 14:22, сегодня опаздывает примерно на пятнадцать минут. Причина — задержка в движении. Сегодня поезд отправляется не с седьмого, а с девятого пути. Просим отнестись с пониманием.`,
    glossary: [
      { term: 'das Gleis', ru: 'путь (платформа)' },
      { term: 'planmäßig', ru: 'по расписанию' },
      { term: 'die Abfahrt', ru: 'отправление' },
      { term: 'die Verspätung', ru: 'опоздание' },
      { term: 'die Verzögerung im Betriebsablauf', ru: 'задержка в движении — фирменная формула Deutsche Bahn' },
      { term: 'abweichend von', ru: 'в отличие от, не с обычного (пути)' },
    ],
    questions: [
      {
        q: 'Wohin fährt der Zug?',
        options: ['Nach München', 'Nach Hamburg', 'Nach Köln', 'Nach Berlin'],
        correct: 1,
      },
      {
        q: 'Von welchem Gleis fährt der Zug heute ab?',
        options: ['Gleis sieben', 'Gleis neun', 'Gleis zwei', 'Das wird nicht gesagt'],
        correct: 1,
        why: 'Именно это и есть смысл объявления: путь изменён, а сказано об этом в самом конце — как всегда.',
      },
      {
        q: 'Wie viel Verspätung hat der Zug?',
        options: ['Fünf Minuten', 'Fünfzehn Minuten', 'Fünfzig Minuten', 'Eine Stunde'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-l-anrufbeantworter',
    lang: 'de', title: 'Anrufbeantworter des Bürgeramts (автоответчик ведомства)', level: 'B1',
    topic: 'Ведомства и бумаги', skill: 'Аудирование', minutes: 2,
    script: `Guten Tag und willkommen beim Bürgeramt Mitte. Unsere Öffnungszeiten sind montags und dienstags von acht bis fünfzehn Uhr, donnerstags von zehn bis achtzehn Uhr, mittwochs und freitags geschlossen. Termine vereinbaren Sie bitte online über unsere Internetseite. Wenn Sie Ihren Termin absagen möchten, drücken Sie die Eins. Für Fragen zur Anmeldung einer Wohnung drücken Sie die Zwei. Für alle anderen Anliegen bleiben Sie bitte in der Leitung. Die durchschnittliche Wartezeit beträgt derzeit acht Minuten.`,
    translation: `Здравствуйте, вы позвонили в ведомство района Митте. Часы работы: понедельник и вторник с восьми до пятнадцати, четверг с десяти до восемнадцати, среда и пятница — закрыто. Запись на приём — через наш сайт. Если вы хотите отменить запись, нажмите единицу. По вопросам регистрации по месту жительства нажмите двойку. По всем остальным вопросам оставайтесь на линии. Среднее время ожидания сейчас — восемь минут.`,
    glossary: [
      { term: 'die Öffnungszeiten', ru: 'часы работы' },
      { term: 'einen Termin vereinbaren', ru: 'договориться о приёме' },
      { term: 'absagen', ru: 'отменить' },
      { term: 'das Anliegen', ru: 'вопрос, обращение (ведомственное слово)' },
      { term: 'in der Leitung bleiben', ru: 'оставаться на линии' },
      { term: 'die Wartezeit', ru: 'время ожидания' },
    ],
    questions: [
      {
        q: 'An welchen Tagen ist das Amt geschlossen?',
        options: ['Montag und Dienstag', 'Mittwoch und Freitag', 'Donnerstag', 'Nur am Wochenende'],
        correct: 1,
      },
      {
        q: 'Wie vereinbart man einen Termin?',
        options: ['Am Telefon', 'Online über die Internetseite', 'Persönlich vor Ort', 'Per Brief'],
        correct: 1,
      },
      {
        q: 'Welche Taste drückt man für Fragen zur Anmeldung?',
        options: ['Die Eins', 'Die Zwei', 'Die Drei', 'Keine'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-l-baeckerei',
    lang: 'de', title: 'In der Bäckerei (в пекарне)', level: 'A1',
    topic: 'Еда', skill: 'Аудирование', minutes: 1,
    script: `— Der Nächste bitte!
— Guten Morgen. Ich hätte gern vier Brötchen und ein Bauernbrot.
— Geschnitten oder am Stück?
— Geschnitten, bitte.
— Sonst noch etwas?
— Ja, einen Kaffee zum Mitnehmen.
— Mit Milch?
— Ohne, danke. Was macht das zusammen?
— Sieben Euro achtzig.
— Zahle ich mit Karte?
— Bei uns leider nur bar.
— Oh. Moment … acht Euro.
— Und zwanzig Cent zurück. Einen schönen Tag noch!`,
    translation: `— Следующий, пожалуйста!
— Доброе утро. Мне четыре булочки и деревенский хлеб.
— Нарезать или целиком?
— Нарезать, пожалуйста.
— Что-нибудь ещё?
— Да, кофе с собой.
— С молоком?
— Без, спасибо. Сколько всего?
— Семь евро восемьдесят.
— Картой можно?
— У нас, к сожалению, только наличные.
— О. Секунду… восемь евро.
— И двадцать центов сдачи. Хорошего дня!`,
    glossary: [
      { term: 'der Nächste bitte', ru: 'следующий, пожалуйста' },
      { term: 'das Bauernbrot', ru: 'деревенский хлеб' },
      { term: 'geschnitten / am Stück', ru: 'нарезанный / целым куском' },
      { term: 'zum Mitnehmen', ru: 'с собой' },
      { term: 'Was macht das?', ru: 'сколько с меня?' },
      { term: 'nur bar', ru: 'только наличные' },
    ],
    questions: [
      {
        q: 'Was kauft der Kunde?',
        options: ['Nur Kaffee', 'Vier Brötchen, ein Brot und einen Kaffee', 'Kuchen', 'Zwei Brote'],
        correct: 1,
      },
      {
        q: 'Warum zahlt der Kunde bar?',
        options: ['Er hat keine Karte', 'Die Bäckerei nimmt nur Bargeld', 'Es ist billiger', 'Der Automat ist kaputt'],
        correct: 1,
        why: 'Nur Bargeld — обычная ситуация в маленьких немецких кафе и пекарнях.',
      },
      {
        q: 'Wie viel Wechselgeld bekommt er?',
        options: ['Achtzig Cent', 'Zwanzig Cent', 'Einen Euro', 'Nichts'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-l-nachbar',
    lang: 'de', title: 'Der Nachbar an der Tür (сосед у двери)', level: 'B1',
    topic: 'Аренда и Anmeldung', skill: 'Аудирование', minutes: 2,
    script: `— Guten Abend. Entschuldigen Sie die Störung. Ich bin Ihr Nachbar von unten, Herr Kluge.
— Guten Abend. Ist etwas passiert?
— Nichts Schlimmes. Aber es ist kurz nach zweiundzwanzig Uhr, und bei Ihnen läuft die Waschmaschine. Wir hören das durch die Decke.
— Oh. Das tut mir leid, das wusste ich nicht.
— Ist kein Drama. Nach zweiundzwanzig Uhr ist eben Ruhezeit, so steht es in der Hausordnung. Bohren und Waschen dann bitte am nächsten Tag.
— Verstehe. Ich stelle sie sofort ab. Und sonntags?
— Sonntags am besten gar nicht. Da ist den ganzen Tag Ruhe.
— Gut zu wissen. Danke, dass Sie es direkt sagen.
— Immer besser als ein Zettel im Flur. Schönen Abend noch.`,
    translation: `— Добрый вечер. Извините за беспокойство. Я ваш сосед снизу, господин Клуге.
— Добрый вечер. Что-то случилось?
— Ничего страшного. Но сейчас начало одиннадцатого, а у вас работает стиральная машина. Нам слышно через потолок.
— О. Извините, я не знал.
— Не драма. Просто после двадцати двух — тихие часы, так написано в правилах дома. Сверлить и стирать — на следующий день.
— Понял. Сейчас же выключу. А по воскресеньям?
— По воскресеньям лучше вообще нет. Там тишина весь день.
— Хорошо, что сказали. Спасибо, что напрямую.
— Всяко лучше записки в подъезде. Хорошего вечера.`,
    glossary: [
      { term: 'die Störung', ru: 'беспокойство, помеха' },
      { term: 'durch die Decke', ru: 'через потолок' },
      { term: 'die Hausordnung', ru: 'правила дома' },
      { term: 'bohren', ru: 'сверлить' },
      { term: 'abstellen', ru: 'выключить, отключить' },
      { term: 'der Zettel', ru: 'записка' },
    ],
    questions: [
      {
        q: 'Warum kommt der Nachbar?',
        options: ['Er braucht Hilfe', 'Wegen des Lärms nach 22 Uhr', 'Er bringt ein Paket', 'Er will sich vorstellen'],
        correct: 1,
      },
      {
        q: 'Was sagt der Nachbar über Sonntag?',
        options: ['Sonntags ist alles erlaubt', 'Sonntags ist den ganzen Tag Ruhezeit', 'Sonntags nur bis Mittag', 'Darüber wird nicht gesprochen'],
        correct: 1,
      },
      {
        q: 'Wie ist der Ton des Gesprächs?',
        options: ['Streit', 'Sachlich und freundlich', 'Drohend', 'Gleichgültig'],
        correct: 1,
        why: 'Немецкое замечание соседа звучит буднично и заканчивается пожеланием хорошего вечера — конфликта в этом нет.',
      },
    ],
  },
]

// Основной объём материала лежит отдельным файлом: здесь остаются образцы
// формата, там — библиотека, которая растёт. Импорт внизу, а не наверху, чтобы
// файл читался как список материалов, а не как список зависимостей.
import { LISTENING_EXTRA } from './listeningLibraryExtra'

export const LISTENING_LIBRARY: ListeningItem[] = [...EN, ...KO, ...JA, ...PT, ...DE_LISTEN, ...MORE, ...LISTENING_EXTRA]

/** Материалы нужного языка. */
export function listeningForLang(lang: string): ListeningItem[] {
  return LISTENING_LIBRARY.filter(x => x.lang === lang)
}
