// ─────────────────────────────────────────────────────────────────────────────
// Библиотека текстов для языкового тренажёра
//
// ОТКУДА БЕРЁТСЯ КОНТЕНТ И ПОЧЕМУ ИМЕННО ТАК
//
// Автоматически тянуть статьи с сайтов нельзя: полный текст чужой статьи — это
// объект авторского права, и «мы только показываем» тут не работает. Поэтому
// источников ровно три, и все три законные:
//
//  1. Тексты, написанные нами (то, что лежит в этом файле). Пишутся под уровень
//     и под лексику курса, поэтому работают лучше случайной статьи из интернета:
//     в них нет незнакомых конструкций из следующего уровня.
//  2. Тексты, которые вставляет сам учитель — он отвечает за то, что вставляет,
//     и обычно это материал его же урока.
//  3. Свободные корпуса: Tatoeba (CC BY), Викиновости и Википедия (CC BY-SA),
//     общественное достояние. Требуют указания источника — поле `credit`.
//
// Видео и лекции подключаются ССЫЛКОЙ (встраивание законно), а не файлом.
//
// УРОВНИ. Указываются по шкале самого языка: для английского CEFR, для
// корейского — TOPIK. Смешивать их в одну шкалу нельзя, у них разные ступени.
// ─────────────────────────────────────────────────────────────────────────────

/** Вопрос к тексту. Проверяется автоматически. */
export interface ReadingQuestion {
  q: string
  options: string[]
  /** Индекс верного варианта. */
  correct: number
  /** Почему именно этот — показывается после ответа. */
  why?: string
}

/** Слово из текста с переводом — подсказка по клику, без ухода в словарь. */
export interface Gloss {
  term: string
  ru: string
}

export interface ReadingText {
  id: string
  /** Код языка: en, ko, ja, pt-BR. */
  lang: string
  title: string
  /** Уровень по шкале своего языка: «A2», «B1», «TOPIK 1». */
  level: string
  /** Примерное время на чтение, минуты. */
  minutes: number
  /** Тема — из общего списка тем языка (см. languageTaxonomy). */
  topic: string
  /**
   * Навык, который текст тренирует. У текстов это почти всегда «Чтение», но
   * переписка и объявления заодно дают лексику, а разбор — грамматику. Поле
   * из той же таксономии, что и разметка заданий, чтобы фильтры совпадали.
   */
  skill: string
  body: string
  /** Перевод целиком — открывается только после ответов. */
  translation?: string
  glossary: Gloss[]
  questions: ReadingQuestion[]
  /**
   * Происхождение текста. 'original' — написан нами. Для заимствованных
   * обязательно указание источника и лицензии, иначе текст нельзя показывать.
   */
  origin: 'original' | 'open-corpus' | 'teacher'
  credit?: string
}

// ─── Английский: рабочие ситуации под курс «Карьера дизайнера» ───────────────

const EN: ReadingText[] = [
  {
    id: 'en-job-posting',
    lang: 'en', title: 'A job posting', level: 'A2', minutes: 3,
    topic: 'Поиск работы', skill: 'Чтение',
    origin: 'original',
    body: `Product Designer (Mid-level)
Remote — Europe · Full-time

We are looking for a product designer to join our team of six. You will work on our mobile app, mostly on onboarding and payments.

What we expect:
• 2+ years of experience in product design
• A portfolio with at least one case study
• Working English (our team is in four countries)
• Experience with design systems is a plus, not a requirement

What we offer:
• Fully remote, flexible hours
• Budget for courses and conferences
• 30 days of paid holiday

To apply, send your CV and portfolio link. We answer every application within two weeks.`,
    glossary: [
      { term: 'mid-level', ru: 'средний уровень (не джун и не сеньор)' },
      { term: 'is a plus', ru: 'будет плюсом, но не обязательно' },
      { term: 'requirement', ru: 'обязательное требование' },
      { term: 'flexible hours', ru: 'свободный график' },
      { term: 'to apply', ru: 'подать заявку' },
    ],
    questions: [
      {
        q: 'Do you need experience with design systems to apply?',
        options: ['Yes, it is required', 'No, it is only a plus', 'Only for senior roles', 'The posting does not say'],
        correct: 1,
        why: '«Is a plus, not a requirement» — прямо сказано, что это желательно, но не обязательно.',
      },
      {
        q: 'How big is the team?',
        options: ['Four people', 'Six people', 'Thirty people', 'Not mentioned'],
        correct: 1,
        why: '«Join our team of six».',
      },
      {
        q: 'What should you send?',
        options: ['Only a CV', 'CV and portfolio link', 'CV, portfolio and a test task', 'A cover letter only'],
        correct: 1,
      },
      {
        q: 'When will they answer?',
        options: ['Within two days', 'Within two weeks', 'Within a month', 'They do not promise an answer'],
        correct: 1,
        why: 'Обратите внимание на «within two weeks» — в объявлениях сроки почти всегда в конце.',
      },
    ],
  },
  {
    id: 'en-recruiter-email',
    lang: 'en', title: 'An email from a recruiter', level: 'A2', minutes: 2,
    topic: 'Переписка', skill: 'Чтение',
    origin: 'original',
    body: `Hi Daniil,

Thanks for applying for the Product Designer role. I had a look at your portfolio — the checkout case study was especially interesting.

I'd like to schedule a short call this week, around 20 minutes, just to get to know each other and answer your questions. Would Wednesday or Thursday work for you? I'm flexible between 10:00 and 16:00 CET.

Also, could you let me know your salary expectations? It helps us make sure we're in the same range before we go further.

Looking forward to hearing from you,
Anna`,
    glossary: [
      { term: 'to schedule', ru: 'назначить (встречу)' },
      { term: 'to get to know each other', ru: 'познакомиться' },
      { term: "I'm flexible", ru: 'мне удобно в любое время' },
      { term: 'CET', ru: 'центральноевропейское время' },
      { term: 'salary expectations', ru: 'зарплатные ожидания' },
      { term: 'in the same range', ru: 'в одном диапазоне' },
    ],
    questions: [
      {
        q: 'How long will the call be?',
        options: ['About 20 minutes', 'About an hour', 'Two hours', 'She does not say'],
        correct: 0,
      },
      {
        q: 'What does Anna ask you to tell her?',
        options: ['Your address', 'Your salary expectations', 'Your references', 'Your notice period'],
        correct: 1,
      },
      {
        q: 'Why does she ask about money now?',
        options: [
          'To make an offer immediately',
          'To check both sides are in the same range before continuing',
          'Because it is company policy to ask first',
          'She does not explain why',
        ],
        correct: 1,
        why: '«It helps us make sure we\'re in the same range before we go further» — чтобы не тратить время впустую.',
      },
    ],
  },
  {
    id: 'en-standup-notes',
    lang: 'en', title: 'Stand-up notes in Slack', level: 'B1', minutes: 2,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Maria: morning! yesterday I finished the empty states for search, today I'm picking up the filters. no blockers

Tom: heads up — wfh today, back online at 2. yesterday: fixed the spacing issues from design review. today: handoff prep. blocked on the copy for the error screens, @Anna can you take a look?

Anna: on it, will send by EOD

Daniil: yesterday I ran two usability sessions, today I'm writing them up. no blockers, but I'd like 15 min with someone from backend about the payment step — can we sync after stand-up?`,
    glossary: [
      { term: 'heads up', ru: 'предупреждаю' },
      { term: 'wfh', ru: 'работаю из дома' },
      { term: 'handoff', ru: 'передача в разработку' },
      { term: 'blocked on', ru: 'застрял из-за' },
      { term: 'on it', ru: 'взялся, делаю' },
      { term: 'EOD', ru: 'до конца дня' },
      { term: 'to sync', ru: 'созвониться, свериться' },
    ],
    questions: [
      {
        q: 'Who cannot continue their work right now?',
        options: ['Maria', 'Tom', 'Anna', 'Daniil'],
        correct: 1,
        why: 'Tom пишет «blocked on the copy» — ему нужны тексты, чтобы двигаться дальше.',
      },
      {
        q: 'What does Anna promise?',
        options: ['To work from home', 'To send the copy by the end of the day', 'To run usability sessions', 'To fix the spacing'],
        correct: 1,
      },
      {
        q: 'Why is this written in short phrases without "I"?',
        options: [
          'Because the writers do not know English well',
          'Because it is a chat, and chat has its own shorter register',
          'Because stand-ups must be written that way by rule',
          'It is a mistake',
        ],
        correct: 1,
        why: 'Регистр чата: подлежащее выпадает, сокращения нормальны. В письме клиенту так писать нельзя.',
      },
    ],
  },
  {
    id: 'en-design-critique',
    lang: 'en', title: 'Feedback on a prototype', level: 'B1', minutes: 3,
    topic: 'Обратная связь', skill: 'Чтение',
    origin: 'original',
    body: `Hi Daniil,

Thanks for sharing the prototype — overall this is a strong direction, and the second screen is much clearer than last time.

A few thoughts. I wonder if the contrast on the secondary button might be an issue on smaller screens; it looked fine on my laptop but I couldn't read it on my phone. Have you considered making the label darker rather than the background lighter?

My only real concern is the third step. Right now users have to enter the address twice, and in the sessions we ran last month that was exactly where people dropped off. What was the thinking behind keeping it?

Everything else is a nitpick and can wait.

Best,
Sara`,
    glossary: [
      { term: 'overall', ru: 'в целом' },
      { term: 'I wonder if', ru: 'мне кажется, возможно' },
      { term: 'Have you considered', ru: 'вы не думали о' },
      { term: 'my only concern', ru: 'меня смущает только' },
      { term: 'to drop off', ru: 'отваливаться, уходить с шага' },
      { term: 'nitpick', ru: 'мелкая придирка' },
    ],
    questions: [
      {
        q: 'What does Sara think is the most serious problem?',
        options: ['The button contrast', 'Entering the address twice', 'The second screen', 'The colours in general'],
        correct: 1,
        why: '«My only real concern is the third step» — она сама помечает вес замечания.',
      },
      {
        q: 'How does she raise the contrast problem?',
        options: [
          'As an order: fix the contrast',
          'As a possibility: "I wonder if… might be an issue"',
          'As a joke',
          'She does not mention it',
        ],
        correct: 1,
        why: 'Замечание в форме предположения — принятая в командах форма критики. Прямое «the contrast is bad» звучало бы как приговор.',
      },
      {
        q: 'What does "everything else is a nitpick" mean here?',
        options: [
          'The rest is very important',
          'The rest is small and can wait',
          'The rest is wrong',
          'She has not looked at the rest',
        ],
        correct: 1,
      },
    ],
  },
]

// ─── Корейский: формат TOPIK I ───────────────────────────────────────────────

const KO: ReadingText[] = [
  {
    id: 'ko-notice-gym',
    lang: 'ko', title: '헬스장 안내 (объявление в спортзале)', level: 'TOPIK 1급', minutes: 2,
    topic: 'Объявления', skill: 'Чтение',
    origin: 'original',
    body: `헬스장 이용 안내

평일: 오전 6시 ~ 오후 11시
주말: 오전 9시 ~ 오후 6시
매월 첫째 주 월요일은 쉽니다.

운동화를 꼭 신어야 해요.
음료수는 물만 가지고 들어올 수 있어요.
사물함은 하루에 천 원이에요.`,
    translation: `Правила пользования спортзалом

Будни: 6:00 — 23:00
Выходные: 9:00 — 18:00
Первый понедельник каждого месяца — выходной.

Обязательно в кроссовках.
Из напитков можно проносить только воду.
Шкафчик — 1000 вон в день.`,
    glossary: [
      { term: '이용', ru: 'пользование' },
      { term: '평일', ru: 'будни' },
      { term: '쉽니다', ru: 'не работает, выходной' },
      { term: '꼭', ru: 'обязательно' },
      { term: '음료수', ru: 'напитки' },
      { term: '사물함', ru: 'шкафчик' },
    ],
    questions: [
      {
        q: '토요일 오후 8시에 갈 수 있어요?',
        options: ['네, 갈 수 있어요', '아니요, 6시에 닫아요', '아니요, 쉬는 날이에요', '안내에 없어요'],
        correct: 1,
        why: 'Выходные до 18:00 — в 20:00 зал уже закрыт.',
      },
      {
        q: '커피를 가지고 들어갈 수 있어요?',
        options: ['네, 괜찮아요', '아니요, 물만 돼요', '오전에만 돼요', '안내에 없어요'],
        correct: 1,
      },
      {
        q: '사물함은 얼마예요?',
        options: ['무료예요', '하루에 천 원', '한 달에 천 원', '안내에 없어요'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ko-message-plan',
    lang: 'ko', title: '문자 메시지 (переписка)', level: 'TOPIK 1급', minutes: 2,
    topic: 'Переписка', skill: 'Чтение',
    origin: 'original',
    body: `지수: 내일 저녁에 시간 있어요?
유리: 미안해요. 내일은 일이 늦게 끝나요. 모레는 괜찮아요.
지수: 그럼 모레 만나요. 뭐 먹고 싶어요?
유리: 매운 음식은 못 먹어요. 다른 거 괜찮아요.
지수: 그럼 일식 어때요? 학교 앞에 새로 생겼어요.
유리: 좋아요! 여섯 시에 학교 앞에서 만나요.`,
    translation: `Джису: Завтра вечером есть время?
Юри: Извини, завтра работа поздно заканчивается. Послезавтра нормально.
Джису: Тогда встретимся послезавтра. Что хочешь поесть?
Юри: Острое не могу. Остальное нормально.
Джису: Тогда как насчёт японской кухни? Возле школы новое место открылось.
Юри: Отлично! Встретимся в шесть перед школой.`,
    glossary: [
      { term: '늦게', ru: 'поздно' },
      { term: '모레', ru: 'послезавтра' },
      { term: '매운', ru: 'острый' },
      { term: '못 먹어요', ru: 'не могу есть' },
      { term: '새로 생겼어요', ru: 'недавно открылось' },
    ],
    questions: [
      {
        q: '두 사람은 언제 만나요?',
        options: ['오늘', '내일', '모레', '다음 주'],
        correct: 2,
        why: 'Юри не может завтра, поэтому договорились на послезавтра.',
      },
      {
        q: '유리 씨는 왜 내일 안 돼요?',
        options: ['아파요', '일이 늦게 끝나요', '약속이 있어요', '여행을 가요'],
        correct: 1,
      },
      {
        q: '두 사람은 뭘 먹을 거예요?',
        options: ['한식', '일식', '중식', '매운 음식'],
        correct: 1,
        why: '유리 не ест острое, поэтому 지수 предложил японскую кухню.',
      },
    ],
  },
]


// ─── Японский: формат JLPT N5 ────────────────────────────────────────────────

const JA: ReadingText[] = [
  {
    id: 'ja-notice-library',
    lang: 'ja', title: 'としょかんの おしらせ (объявление в библиотеке)', level: 'JLPT N5', minutes: 2,
    topic: 'Объявления', skill: 'Чтение',
    origin: 'original',
    body: `としょかんの おしらせ

げつようび〜きんようび：あさ 9じ〜ゆうがた 6じ
どようび：あさ 10じ〜ごご 4じ
にちようび：やすみです

ほんは 2しゅうかん かりることが できます。
たべものは もって はいらないで ください。`,
    translation: `Библиотека

Понедельник — пятница: 9:00 — 18:00
Суббота: 10:00 — 16:00
Воскресенье: выходной

Книги можно брать на 2 недели.
С едой входить нельзя.`,
    glossary: [
      { term: 'としょかん', ru: 'библиотека' },
      { term: 'おしらせ', ru: 'объявление' },
      { term: 'やすみ', ru: 'выходной' },
      { term: 'かりる', ru: 'брать напрокат' },
      { term: '〜ことが できます', ru: 'можно (делать что-то)' },
      { term: '〜ないで ください', ru: 'пожалуйста, не делайте' },
    ],
    questions: [
      {
        q: 'にちようびに としょかんへ いけますか。',
        options: ['はい、いけます', 'いいえ、やすみです', 'ごぜんだけ いけます', 'おしらせに ありません'],
        correct: 1,
        why: '「にちようび：やすみです」 — прямо сказано, что воскресенье выходной.',
      },
      {
        q: 'ほんは どのくらい かりることが できますか。',
        options: ['1しゅうかん', '2しゅうかん', '1かげつ', '3にち'],
        correct: 1,
      },
      {
        q: 'どようびは なんじに おわりますか。',
        options: ['ごご 4じ', 'ゆうがた 6じ', 'あさ 10じ', 'おわりません'],
        correct: 0,
      },
    ],
  },
  {
    id: 'ja-message-meet',
    lang: 'ja', title: 'メッセージ (переписка)', level: 'JLPT N5', minutes: 2,
    topic: 'Переписка', skill: 'Чтение',
    origin: 'original',
    body: `たなか：あした じかんが ありますか。
リナ：すみません、あしたは しごとが おそいです。あさっては だいじょうぶです。
たなか：じゃあ、あさって あいましょう。なにが たべたいですか。
リナ：からいものは たべられません。ほかは だいじょうぶです。
たなか：じゃあ、すしは どうですか。えきの まえに あたらしい みせが できました。
リナ：いいですね。6じに えきの まえで あいましょう。`,
    translation: `Танака: Завтра есть время?
Рина: Извините, завтра работа поздно. Послезавтра нормально.
Танака: Тогда встретимся послезавтра. Что хотите поесть?
Рина: Острое не могу. Остальное нормально.
Танака: Тогда как насчёт суши? Перед станцией новое место открылось.
Рина: Отлично. Встретимся в 6 перед станцией.`,
    glossary: [
      { term: 'おそい', ru: 'поздний' },
      { term: 'あさって', ru: 'послезавтра' },
      { term: 'からい', ru: 'острый' },
      { term: '〜られません', ru: 'не могу (делать)' },
      { term: 'できました', ru: 'появилось, открылось' },
    ],
    questions: [
      {
        q: 'ふたりは いつ あいますか。',
        options: ['きょう', 'あした', 'あさって', 'らいしゅう'],
        correct: 2,
        why: 'Рина не может завтра — договорились на послезавтра.',
      },
      {
        q: 'リナさんは どうして あしたが だめですか。',
        options: ['びょうきです', 'しごとが おそいです', 'りょこうです', 'やくそくが あります'],
        correct: 1,
      },
      {
        q: 'なにを たべますか。',
        options: ['からいもの', 'すし', 'ラーメン', 'まだ わかりません'],
        correct: 1,
      },
    ],
  },
]

// ─── Бразильский португальский ───────────────────────────────────────────────

const PT: ReadingText[] = [
  {
    id: 'pt-notice-gym',
    lang: 'pt-BR', title: 'Aviso da academia (объявление в спортзале)', level: 'A1', minutes: 2,
    topic: 'Объявления', skill: 'Чтение',
    origin: 'original',
    body: `AVISO — HORÁRIO DA ACADEMIA

Segunda a sexta: 6h às 23h
Sábado: 9h às 18h
Domingo: fechado

É obrigatório usar tênis.
Só é permitido trazer água.
O armário custa R$ 5 por dia.`,
    translation: `Объявление — часы работы зала

Понедельник — пятница: 6:00 — 23:00
Суббота: 9:00 — 18:00
Воскресенье: закрыто

Обязательно в кроссовках.
Проносить можно только воду.
Шкафчик — 5 реалов в день.`,
    glossary: [
      { term: 'aviso', ru: 'объявление' },
      { term: 'fechado', ru: 'закрыто' },
      { term: 'é obrigatório', ru: 'обязательно' },
      { term: 'tênis', ru: 'кроссовки' },
      { term: 'só é permitido', ru: 'разрешено только' },
      { term: 'armário', ru: 'шкафчик' },
    ],
    questions: [
      {
        q: 'A academia abre no domingo?',
        options: ['Sim, o dia todo', 'Não, fica fechada', 'Só de manhã', 'O aviso não diz'],
        correct: 1,
      },
      {
        q: 'Posso levar café para a academia?',
        options: ['Sim, pode', 'Não, só água', 'Só de manhã', 'O aviso não diz'],
        correct: 1,
      },
      {
        q: 'Quanto custa o armário?',
        options: ['É de graça', 'R$ 5 por dia', 'R$ 5 por mês', 'O aviso não diz'],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-message-plan',
    lang: 'pt-BR', title: 'Mensagens (переписка)', level: 'A2', minutes: 2,
    topic: 'Переписка', skill: 'Чтение',
    origin: 'original',
    body: `Bruno: oi! cê tá livre amanhã à noite?
Carla: amanhã não dá, saio tarde do trabalho. depois de amanhã tá tranquilo
Bruno: então fica pra depois de amanhã. o que cê quer comer?
Carla: comida muito apimentada eu não consigo. o resto tá ótimo
Bruno: que tal japonês? abriu um lugar novo perto do metrô
Carla: adorei! a gente se encontra às 19h na frente do metrô então`,
    translation: `Бруну: привет! завтра вечером свободна?
Карла: завтра не выйдет, поздно ухожу с работы. послезавтра спокойно
Бруну: тогда послезавтра. что хочешь поесть?
Карла: очень острое не могу. остальное отлично
Бруну: как насчёт японской? рядом с метро новое место открылось
Карла: супер! тогда встречаемся в 19:00 перед метро`,
    glossary: [
      { term: 'cê (você)', ru: 'ты — разговорное сокращение' },
      { term: 'não dá', ru: 'не выйдет, не получится' },
      { term: 'tá (está)', ru: 'разговорное сокращение от está' },
      { term: 'a gente', ru: 'мы — самое частое в разговорной речи' },
      { term: 'que tal…?', ru: 'как насчёт?' },
      { term: 'adorei', ru: 'здорово, мне нравится' },
    ],
    questions: [
      {
        q: 'Quando eles vão se encontrar?',
        options: ['Hoje', 'Amanhã', 'Depois de amanhã', 'Na semana que vem'],
        correct: 2,
      },
      {
        q: 'Por que a Carla não pode amanhã?',
        options: ['Está doente', 'Sai tarde do trabalho', 'Vai viajar', 'Já tem compromisso'],
        correct: 1,
      },
      {
        q: 'O que significa "a gente se encontra" aqui?',
        options: ['As pessoas se encontram', 'Nós nos encontramos', 'Eles se encontram', 'Alguém se encontra'],
        correct: 1,
        why: 'В разговорном бразильском «a gente» — это «мы», и глагол при этом стоит в третьем лице единственного числа.',
      },
    ],
  },
]


// ─── Добавочные тексты: по одному более сложному на язык ─────────────────────
//
// Библиотека растёт «вверх»: у каждого языка появляется текст на ступень выше
// стартового. Без этого ученик, прошедший первые тексты, упирается в потолок и
// режим становится бесполезным ровно тогда, когда он начал работать.

const MORE: ReadingText[] = [
  {
    id: 'en-offer-letter',
    lang: 'en', title: 'An offer letter', level: 'B1', minutes: 3,
    topic: 'Поиск работы', skill: 'Чтение',
    origin: 'original',
    body: `Dear Daniil,

We are pleased to offer you the position of Product Designer at Nordic Labs, starting on 15 September.

Your gross monthly salary will be 4,900 EUR, reviewed annually. You will be entitled to 28 days of paid holiday per year, in addition to public holidays in your country of residence.

The role is fully remote. We ask that you overlap with CET working hours for at least four hours a day.

The first three months are a probation period, during which either side may end the contract with two weeks' notice. After that, the notice period is one month.

Please confirm by 30 August. If you have questions about any of the terms, I am happy to discuss them before you sign.

Best regards,
Anna Kowalski`,
    glossary: [
      { term: 'gross salary', ru: 'зарплата до вычета налогов' },
      { term: 'to be entitled to', ru: 'иметь право на' },
      { term: 'to overlap with', ru: 'пересекаться по времени с' },
      { term: 'probation period', ru: 'испытательный срок' },
      { term: "notice period", ru: 'срок предупреждения об увольнении' },
    ],
    questions: [
      {
        q: 'Is 4,900 EUR the amount you will receive on your account?',
        options: [
          'Yes, that is the final amount',
          'No, it is before tax',
          'No, it is after tax',
          'The letter does not say',
        ],
        correct: 1,
        why: '«Gross» означает до вычета налогов. Разница с чистой суммой может быть в треть — это первое, что стоит уточнять в оффере.',
      },
      {
        q: 'How much notice must you give during probation?',
        options: ['One week', 'Two weeks', 'One month', 'No notice needed'],
        correct: 1,
        why: 'Во время испытательного срока — две недели, после него уже месяц. Условия разные, и это типично.',
      },
      {
        q: 'What does the company ask about working hours?',
        options: [
          'You must work 9 to 18 CET',
          'You must overlap with CET for at least four hours',
          'There are no requirements',
          'You must move to Europe',
        ],
        correct: 1,
      },
      {
        q: 'What should you do if a term is unclear?',
        options: [
          'Sign first, ask later',
          'Ask before signing — she offers to discuss',
          'Refuse the offer',
          'Nothing, terms are fixed',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'ko-notice-class',
    lang: 'ko', title: '문화 교실 안내 (объявление о занятиях)', level: 'TOPIK 2급', minutes: 3,
    topic: 'Учёба', skill: 'Чтение',
    origin: 'original',
    body: `한국 문화 교실 안내

한국어를 배우는 외국인을 위한 문화 수업입니다.

날짜: 매주 토요일 오후 2시 ~ 4시
장소: 시민 문화 센터 3층
내용: 한국 요리, 서예, 전통 놀이

참가비는 무료지만, 재료비 오천 원을 내야 합니다.
인원이 스무 명으로 제한되어 있으니 미리 신청하세요.
신청은 홈페이지에서만 받습니다.`,
    translation: `Занятия по корейской культуре

Занятия для иностранцев, изучающих корейский.

Дата: каждую субботу, 14:00–16:00
Место: Городской культурный центр, 3 этаж
Содержание: корейская кухня, каллиграфия, традиционные игры

Участие бесплатное, но нужно оплатить материалы — 5000 вон.
Количество мест ограничено двадцатью, записывайтесь заранее.
Запись только через сайт.`,
    glossary: [
      { term: '외국인', ru: 'иностранец' },
      { term: '참가비', ru: 'плата за участие' },
      { term: '무료', ru: 'бесплатно' },
      { term: '재료비', ru: 'плата за материалы' },
      { term: '제한되다', ru: 'быть ограниченным' },
      { term: '신청하다', ru: 'подавать заявку, записываться' },
    ],
    questions: [
      {
        q: '수업은 정말 무료예요?',
        options: [
          '네, 완전히 무료예요',
          '아니요, 재료비 오천 원을 내야 해요',
          '아니요, 오만 원이에요',
          '안내에 없어요',
        ],
        correct: 1,
        why: 'Ловушка: 참가비 무료, но 재료비 платить надо. Такие оговорки в объявлениях почти всегда идут после «но».',
      },
      {
        q: '몇 명까지 신청할 수 있어요?',
        options: ['열 명', '스무 명', '서른 명', '제한이 없어요'],
        correct: 1,
      },
      {
        q: '어떻게 신청해요?',
        options: ['전화로', '홈페이지에서만', '직접 가서', '이메일로'],
        correct: 1,
        why: 'Слово 만 («только») здесь ключевое: другие способы не подойдут.',
      },
    ],
  },
  {
    id: 'ja-notice-class',
    lang: 'ja', title: 'にほんご きょうしつの おしらせ', level: 'JLPT N4', minutes: 3,
    topic: 'Учёба', skill: 'Чтение',
    origin: 'original',
    body: `にほんご きょうしつの おしらせ

がいこくじんの ための にほんご きょうしつを ひらきます。

ひにち：まいしゅう どようび ごご 2じ〜4じ
ばしょ：しみん センター 3かい
ないよう：かいわ、かんじ、にほんの ぶんか

じゅぎょうりょうは むりょうですが、きょうかしょだいは じぶんで はらって ください。
にんずうは 20にんまでです。はやめに もうしこんで ください。
もうしこみは ホームページからだけ うけつけます。`,
    translation: `Объявление о занятиях японским

Открываем занятия японским языком для иностранцев.

Дата: каждую субботу, 14:00–16:00
Место: Городской центр, 3 этаж
Содержание: разговор, иероглифы, японская культура

Занятия бесплатные, но учебник оплачивается самостоятельно.
Количество мест — до 20. Записывайтесь заранее.
Запись принимается только через сайт.`,
    glossary: [
      { term: 'がいこくじん', ru: 'иностранец' },
      { term: 'むりょう', ru: 'бесплатно' },
      { term: 'きょうかしょ', ru: 'учебник' },
      { term: 'にんずう', ru: 'количество человек' },
      { term: 'もうしこむ', ru: 'подавать заявку' },
      { term: '〜だけ', ru: 'только' },
    ],
    questions: [
      {
        q: 'ぜんぶ むりょうですか。',
        options: [
          'はい、ぜんぶ むりょうです',
          'いいえ、きょうかしょは じぶんで はらいます',
          'いいえ、ぜんぶ ゆうりょうです',
          'おしらせに ありません',
        ],
        correct: 1,
        why: 'Конструкция 〜ですが вводит оговорку. Именно после неё обычно и лежит подвох.',
      },
      {
        q: 'なんにんまで もうしこめますか。',
        options: ['10にん', '20にん', '30にん', 'せいげんは ありません'],
        correct: 1,
      },
      {
        q: 'どうやって もうしこみますか。',
        options: ['でんわで', 'ホームページからだけ', 'ちょくせつ いって', 'メールで'],
        correct: 1,
      },
    ],
  },
  {
    id: 'pt-job-ad',
    lang: 'pt-BR', title: 'Vaga de emprego', level: 'B1', minutes: 3,
    topic: 'Поиск работы', skill: 'Чтение',
    origin: 'original',
    body: `VAGA: Designer de Produto (Pleno)
Remoto — Brasil · CLT

Estamos procurando um designer de produto para integrar nosso time de seis pessoas. Você vai trabalhar principalmente no aplicativo, com foco em onboarding e pagamentos.

O que esperamos:
• 2 anos ou mais de experiência
• Portfólio com pelo menos um estudo de caso
• Inglês para leitura (nosso time é distribuído)
• Experiência com design system é um diferencial, não um requisito

O que oferecemos:
• Trabalho 100% remoto e horário flexível
• Vale-refeição e plano de saúde
• 30 dias de férias

Para se candidatar, envie currículo e link do portfólio. Respondemos todas as candidaturas em até duas semanas.`,
    translation: `Вакансия: продуктовый дизайнер (средний уровень)
Удалённо — Бразилия · оформление по трудовой

Ищем продуктового дизайнера в команду из шести человек. Работа в основном над приложением, фокус — онбординг и платежи.

Что ждём:
• от 2 лет опыта
• портфолио минимум с одним кейсом
• английский для чтения (команда распределённая)
• опыт с дизайн-системой будет плюсом, но не обязателен

Что предлагаем:
• полностью удалённая работа и гибкий график
• талоны на питание и медстраховка
• 30 дней отпуска

Чтобы откликнуться, пришлите резюме и ссылку на портфолио. Отвечаем на все отклики в течение двух недель.`,
    glossary: [
      { term: 'vaga', ru: 'вакансия' },
      { term: 'pleno', ru: 'средний уровень (между júnior и sênior)' },
      { term: 'CLT', ru: 'оформление по трудовому кодексу Бразилии' },
      { term: 'diferencial', ru: 'преимущество, плюс' },
      { term: 'requisito', ru: 'обязательное требование' },
      { term: 'vale-refeição', ru: 'талоны на питание' },
      { term: 'se candidatar', ru: 'откликнуться на вакансию' },
    ],
    questions: [
      {
        q: 'Experiência com design system é obrigatória?',
        options: [
          'Sim, é um requisito',
          'Não, é apenas um diferencial',
          'Só para vagas sênior',
          'O anúncio não diz',
        ],
        correct: 1,
        why: '«É um diferencial, não um requisito» — прямое противопоставление.',
      },
      {
        q: 'Que nível de inglês é necessário?',
        options: ['Fluente', 'Para leitura', 'Não é necessário', 'Nativo'],
        correct: 1,
      },
      {
        q: 'O que significa "CLT" aqui?',
        options: [
          'Trabalho como freelancer',
          'Contratação formal pela legislação trabalhista',
          'Estágio',
          'Trabalho temporário',
        ],
        correct: 1,
        why: 'CLT — оформление в штат с полным соцпакетом, в отличие от PJ (работа как ИП). Разница принципиальная для бразильского рынка труда.',
      },
    ],
  },
]


// ─── Немецкий: бытовые бумаги и объявления, с которыми сталкиваются сразу ────
//
// Тексты написаны нами и нарочно не «про Германию вообще», а про то, что
// человек читает в первую неделю: объявление в подъезде, письмо из ведомства,
// объявление о квартире, чек и рецепт. Это ровно те бумаги, из-за которых
// приезжий чувствует себя беспомощным при вполне сносном разговорном языке.

const DE: ReadingText[] = [
  {
    id: 'de-hausordnung',
    lang: 'de', title: 'Объявление в подъезде', level: 'A2', minutes: 3,
    topic: 'Аренда и Anmeldung', skill: 'Чтение',
    origin: 'original',
    body: `Liebe Hausbewohner,

ab Montag, dem 4. März, wird das Treppenhaus gestrichen. Die Arbeiten dauern etwa eine Woche.

Bitte beachten Sie:
• Stellen Sie keine Schuhe, Kinderwagen oder Pflanzen ins Treppenhaus.
• Die Handläufe sind am Montag und Dienstag frisch gestrichen. Bitte nicht anfassen.
• Der Aufzug funktioniert normal.

Der Müllraum bleibt in dieser Woche geschlossen. Die Tonnen stehen im Hof neben der Garage. Bitte trennen Sie den Müll weiterhin: Papier (blau), Verpackungen (gelb), Bio (braun), Restmüll (grau).

Wir erinnern außerdem an die Ruhezeit: werktags von 22 bis 6 Uhr sowie sonn- und feiertags ganztägig.

Bei Fragen wenden Sie sich bitte an den Hausmeister, Herrn Krause (Wohnung 2, Telefon 0176 22 33 44).

Mit freundlichen Grüßen
Die Hausverwaltung`,
    translation: `Уважаемые жильцы,

с понедельника, 4 марта, будет производиться покраска лестничной клетки. Работы займут около недели.

Просим обратить внимание:
• Не оставляйте на лестнице обувь, коляски и растения.
• В понедельник и вторник перила будут свежевыкрашены. Просьба не трогать.
• Лифт работает в обычном режиме.

Мусорная комната на этой неделе закрыта. Баки стоят во дворе рядом с гаражом. Просим и дальше сортировать мусор: бумага (синий), упаковка (жёлтый), органика (коричневый), прочие отходы (серый).

Напоминаем также о тихих часах: в будни с 22 до 6, а также по воскресеньям и праздникам круглосуточно.

По вопросам обращайтесь к управдому, господину Краузе (квартира 2, телефон 0176 22 33 44).

С уважением,
управляющая компания`,
    glossary: [
      { term: 'der Hausbewohner', ru: 'жилец дома' },
      { term: 'das Treppenhaus', ru: 'лестничная клетка, подъезд' },
      { term: 'streichen', ru: 'красить' },
      { term: 'der Handlauf', ru: 'перила' },
      { term: 'die Tonne', ru: 'мусорный бак' },
      { term: 'der Restmüll', ru: 'несортируемый остаток' },
      { term: 'die Ruhezeit', ru: 'тихие часы' },
      { term: 'werktags', ru: 'по будням' },
      { term: 'die Hausverwaltung', ru: 'управляющая компания' },
    ],
    questions: [
      {
        q: 'Was darf man während der Arbeiten nicht ins Treppenhaus stellen?',
        options: ['Nur Fahrräder', 'Schuhe, Kinderwagen und Pflanzen', 'Nichts wird verboten', 'Nur Müll'],
        correct: 1,
      },
      {
        q: 'Wo stehen die Mülltonnen in dieser Woche?',
        options: ['Im Müllraum', 'Vor der Haustür', 'Im Hof neben der Garage', 'Auf der Straße'],
        correct: 2,
      },
      {
        q: 'Wann gilt die Ruhezeit?',
        options: ['Nur nachts von 0 bis 6', 'Werktags 22–6 Uhr und sonntags den ganzen Tag', 'Nur am Wochenende', 'Immer'],
        correct: 1,
        why: 'Именно из-за этого правила соседи звонят в дверь: воскресенье в Германии тихое целиком.',
      },
      {
        q: 'Welche Farbe hat die Tonne für Papier?',
        options: ['gelb', 'blau', 'braun', 'grau'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-wohnungsanzeige',
    lang: 'de', title: 'Объявление о квартире', level: 'B1', minutes: 3,
    topic: 'Аренда и Anmeldung', skill: 'Чтение',
    origin: 'original',
    body: `2-Zimmer-Wohnung, 54 m², Leipzig-Süd, ab 1. Juni

Kaltmiete: 640 €
Nebenkosten: 180 € (Heizung, Wasser, Müll, Hausreinigung)
Warmmiete: 820 €
Kaution: 3 Kaltmieten (1 920 €)

Die Wohnung liegt im 3. Obergeschoss (kein Aufzug), Altbau, Parkett, Balkon nach Süden. Bad mit Fenster und Dusche, keine Badewanne. Eine Einbauküche ist nicht vorhanden.

Erforderliche Unterlagen für die Besichtigung:
• Kopie des Ausweises
• Gehaltsnachweise der letzten drei Monate
• SCHUFA-Auskunft (nicht älter als 3 Monate)
• Mietschuldenfreiheitsbescheinigung des bisherigen Vermieters

Haustiere nach Absprache. WG-geeignet. Nichtraucherwohnung.

Besichtigungstermine: Samstag, 10 und 12 Uhr. Bitte nur mit vollständigen Unterlagen erscheinen. Anfragen ohne Unterlagen werden nicht beantwortet.`,
    translation: `Двухкомнатная квартира, 54 м², Лейпциг-Юг, с 1 июня

Аренда без коммунальных: 640 €
Коммунальные: 180 € (отопление, вода, мусор, уборка дома)
Итого: 820 €
Залог: три месячные аренды (1 920 €)

Квартира на 4-м этаже (лифта нет), старый фонд, паркет, балкон на юг. Ванная с окном и душем, ванны нет. Встроенной кухни нет.

Документы, необходимые для просмотра:
• копия удостоверения личности
• справки о зарплате за последние три месяца
• справка SCHUFA (не старше 3 месяцев)
• справка от прежнего арендодателя об отсутствии задолженности

С животными — по договорённости. Подходит для совместной аренды. Квартира для некурящих.

Просмотры: суббота, 10 и 12 часов. Просьба приходить только с полным комплектом документов. Обращения без документов остаются без ответа.`,
    glossary: [
      { term: 'die Kaltmiete', ru: 'аренда без коммунальных' },
      { term: 'die Nebenkosten', ru: 'коммунальные расходы' },
      { term: 'die Kaution', ru: 'залог' },
      { term: 'das Obergeschoss', ru: 'этаж выше первого: 3. OG — наш четвёртый' },
      { term: 'der Altbau', ru: 'дом старой постройки, обычно до 1949 года' },
      { term: 'die Einbauküche', ru: 'встроенная кухня' },
      { term: 'der Gehaltsnachweis', ru: 'справка о зарплате' },
      { term: 'die SCHUFA-Auskunft', ru: 'справка о кредитной истории' },
      { term: 'WG-geeignet', ru: 'подходит для совместного проживания (Wohngemeinschaft)' },
      { term: 'nach Absprache', ru: 'по договорённости' },
    ],
    questions: [
      {
        q: 'Wie viel kostet die Wohnung insgesamt pro Monat?',
        options: ['640 €', '820 €', '180 €', '1 920 €'],
        correct: 1,
        why: 'Warmmiete — это Kaltmiete плюс Nebenkosten: именно эту сумму вы платите каждый месяц.',
      },
      {
        q: 'Was muss man vor dem Einzug einmalig bezahlen?',
        options: ['Nichts', 'Eine Kaution von 1 920 €', 'Die Maklergebühr', 'Ein Jahr im Voraus'],
        correct: 1,
      },
      {
        q: 'Gibt es eine Küche?',
        options: ['Ja, mit allen Geräten', 'Nein, eine Einbauküche ist nicht vorhanden', 'Nur eine Kochplatte', 'Das steht nicht im Text'],
        correct: 1,
        why: 'Это типично: немецкие квартиры часто сдают буквально с пустой стеной вместо кухни.',
      },
      {
        q: 'Was passiert mit Anfragen ohne Unterlagen?',
        options: ['Sie werden später beantwortet', 'Sie werden nicht beantwortet', 'Man bekommt einen zweiten Termin', 'Man zahlt eine Gebühr'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-amt-brief',
    lang: 'de', title: 'Письмо из ведомства', level: 'B1', minutes: 4,
    topic: 'Ведомства и бумаги', skill: 'Чтение',
    origin: 'original',
    body: `Bürgeramt Mitte
Anmeldung einer Wohnung — Ihr Termin

Sehr geehrte Frau Petrowa,

Ihr Termin zur Anmeldung findet am Donnerstag, dem 14. März, um 9:20 Uhr statt, Raum 214.

Bitte bringen Sie folgende Unterlagen mit:
1. Ihren Reisepass oder Personalausweis
2. Die Wohnungsgeberbestätigung Ihres Vermieters (Original, unterschrieben)
3. Das ausgefüllte Anmeldeformular (liegt diesem Schreiben bei)

Ohne die Wohnungsgeberbestätigung kann die Anmeldung nicht durchgeführt werden. Ein neuer Termin muss dann online gebucht werden; die Wartezeit beträgt zurzeit etwa vier Wochen.

Bitte erscheinen Sie pünktlich. Bei einer Verspätung von mehr als zehn Minuten verfällt der Termin.

Die Meldebescheinigung erhalten Sie direkt im Anschluss. Ihre Steuer-Identifikationsnummer wird Ihnen innerhalb von zwei bis drei Wochen automatisch per Post zugesandt; ein gesonderter Antrag ist nicht erforderlich.

Mit freundlichen Grüßen
i. A. Schneider
Bürgeramt Mitte`,
    translation: `Ведомство района Митте
Регистрация по месту жительства — ваша запись

Уважаемая госпожа Петрова,

ваш приём по вопросу регистрации состоится в четверг, 14 марта, в 9:20, кабинет 214.

Просим взять с собой следующие документы:
1. загранпаспорт или удостоверение личности
2. подтверждение от арендодателя (оригинал, с подписью)
3. заполненный бланк регистрации (приложен к этому письму)

Без подтверждения от арендодателя регистрация не может быть проведена. В этом случае потребуется записаться заново через интернет; время ожидания в настоящий момент составляет около четырёх недель.

Просим приходить вовремя. При опоздании более чем на десять минут запись аннулируется.

Справку о регистрации вы получите сразу после приёма. Налоговый номер будет выслан вам почтой автоматически в течение двух-трёх недель; отдельное заявление подавать не нужно.

С уважением,
по поручению — Шнайдер
Ведомство района Митте`,
    glossary: [
      { term: 'die Anmeldung', ru: 'регистрация по месту жительства' },
      { term: 'stattfinden', ru: 'состояться' },
      { term: 'die Wohnungsgeberbestätigung', ru: 'подтверждение от арендодателя' },
      { term: 'beiliegen', ru: 'прилагаться (к письму)' },
      { term: 'durchführen', ru: 'проводить, осуществлять' },
      { term: 'verfallen', ru: 'аннулироваться, пропадать (о записи, билете)' },
      { term: 'im Anschluss', ru: 'сразу после' },
      { term: 'zusenden', ru: 'высылать' },
      { term: 'i. A. (im Auftrag)', ru: 'по поручению — стандартная подпись в письмах ведомств' },
    ],
    questions: [
      {
        q: 'Was passiert, wenn die Wohnungsgeberbestätigung fehlt?',
        options: ['Man kann sie nachreichen', 'Die Anmeldung kann nicht durchgeführt werden', 'Man zahlt eine Gebühr', 'Der Termin wird verlängert'],
        correct: 1,
        why: 'Ключевая логика немецких ведомств: недостающая бумага означает новую запись, а не «донесёте потом».',
      },
      {
        q: 'Wie lange wartet man zurzeit auf einen neuen Termin?',
        options: ['Zwei Tage', 'Eine Woche', 'Etwa vier Wochen', 'Drei Monate'],
        correct: 2,
      },
      {
        q: 'Was passiert bei einer Verspätung von 15 Minuten?',
        options: ['Nichts', 'Der Termin verfällt', 'Man wird als Letzter drangenommen', 'Man zahlt 10 Euro'],
        correct: 1,
      },
      {
        q: 'Muss man die Steuer-ID beantragen?',
        options: ['Ja, mit einem Formular', 'Nein, sie kommt automatisch per Post', 'Ja, online', 'Nur wenn man arbeitet'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-arzt-termin',
    lang: 'de', title: 'Запись к врачу по телефону', level: 'A2', minutes: 3,
    topic: 'Здоровье', skill: 'Чтение',
    origin: 'original',
    body: `— Praxis Dr. Berger, Sie sprechen mit Frau Lehmann. Was kann ich für Sie tun?
— Guten Tag, mein Name ist Sokolow. Ich hätte gern einen Termin.
— Sind Sie bei uns schon Patient?
— Nein, ich bin neu. Ich bin vor zwei Monaten hergezogen.
— Kein Problem. Sind Sie gesetzlich oder privat versichert?
— Gesetzlich. Ich habe die Karte.
— Sehr gut. Worum geht es denn?
— Ich habe seit einer Woche Rückenschmerzen. Es wird nicht besser.
— Dann schauen wir mal. Wäre Donnerstag um 15:40 Uhr möglich?
— Donnerstag ist schwierig, da arbeite ich bis 17 Uhr. Geht es auch morgens?
— Morgens habe ich erst wieder am 26. etwas frei, um 8:10 Uhr.
— Das ist in zwei Wochen … Und wenn es schlimmer wird?
— Dann rufen Sie an, wir haben jeden Tag eine offene Sprechstunde von 8 bis 9. Da müssen Sie allerdings mit Wartezeit rechnen.
— Gut, dann nehme ich den 26. um 8:10 Uhr.
— Notiert. Bitte bringen Sie Ihre Versichertenkarte mit und kommen Sie zehn Minuten früher, wegen des Anmeldebogens.
— Mache ich. Vielen Dank!
— Gern. Gute Besserung und bis dann.`,
    translation: `— Кабинет доктора Бергера, вы говорите с госпожой Леман. Чем могу помочь?
— Здравствуйте, моя фамилия Соколов. Я хотел бы записаться на приём.
— Вы уже наш пациент?
— Нет, я новый. Я переехал сюда два месяца назад.
— Ничего страшного. У вас государственная или частная страховка?
— Государственная. Карточка у меня есть.
— Очень хорошо. А по какому поводу?
— У меня неделю болит спина. Лучше не становится.
— Тогда посмотрим. Четверг в 15:40 подошёл бы?
— Четверг сложно, я работаю до пяти. Утром возможно?
— Утром свободное время есть только 26-го, в 8:10.
— Это через две недели… А если станет хуже?
— Тогда звоните, у нас каждый день открытый приём с 8 до 9. Правда, придётся подождать.
— Хорошо, тогда беру 26-е, 8:10.
— Записала. Возьмите с собой карточку страховки и приходите на десять минут раньше — заполнить анкету.
— Хорошо. Большое спасибо!
— Пожалуйста. Выздоравливайте, до встречи.`,
    glossary: [
      { term: 'die Praxis', ru: 'врачебный кабинет, практика' },
      { term: 'gesetzlich / privat versichert', ru: 'с государственной / частной страховкой' },
      { term: 'die Versichertenkarte', ru: 'карточка медицинской страховки' },
      { term: 'Worum geht es?', ru: 'о чём речь, по какому вопросу' },
      { term: 'die Rückenschmerzen', ru: 'боли в спине' },
      { term: 'die offene Sprechstunde', ru: 'приём без записи' },
      { term: 'mit Wartezeit rechnen', ru: 'рассчитывать на ожидание' },
      { term: 'der Anmeldebogen', ru: 'анкета пациента' },
      { term: 'Gute Besserung', ru: 'выздоравливайте' },
    ],
    questions: [
      {
        q: 'Warum passt der Donnerstag nicht?',
        options: ['Der Patient ist im Urlaub', 'Er arbeitet bis 17 Uhr', 'Die Praxis ist geschlossen', 'Er hat keine Karte'],
        correct: 1,
      },
      {
        q: 'Was kann man tun, wenn es vor dem Termin schlimmer wird?',
        options: ['In die Notaufnahme fahren', 'Anrufen und in die offene Sprechstunde kommen', 'Nichts', 'Den Arzt zu Hause besuchen'],
        correct: 1,
      },
      {
        q: 'Warum soll der Patient zehn Minuten früher kommen?',
        options: ['Wegen der Zahlung', 'Wegen des Anmeldebogens', 'Weil der Arzt früher anfängt', 'Wegen der Parkplatzsuche'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-kassenbon',
    lang: 'de', title: 'Чек из супермаркета', level: 'A1', minutes: 2,
    topic: 'Покупки и деньги', skill: 'Чтение',
    origin: 'original',
    body: `SUPERMARKT AM MARKT
Marktstraße 12, 04109 Leipzig

Brötchen 6 St.            2,40
Milch 1,5 %               1,09
Butter 250 g              2,49
Käse Gouda                3,19
Äpfel 1,2 kg              2,63
Wasser 6 x 1,5 l          3,54
    Pfand 6 x 0,25        1,50
Tüte                      0,20
------------------------------
SUMME                    17,04
Gegeben  EC-Karte        17,04

MwSt 7 %          1,03
MwSt 19 %         0,28

Pfandrückgabe? Automat am Eingang.
Bitte Kassenbon aufbewahren.
Vielen Dank für Ihren Einkauf!`,
    translation: `СУПЕРМАРКЕТ НА РЫНКЕ
Марктштрассе 12, 04109 Лейпциг

Булочки, 6 шт.            2,40
Молоко 1,5 %              1,09
Масло 250 г               2,49
Сыр гауда                 3,19
Яблоки 1,2 кг             2,63
Вода 6 × 1,5 л            3,54
    Залог 6 × 0,25        1,50
Пакет                     0,20
------------------------------
ИТОГО                    17,04
Оплачено картой          17,04

НДС 7 %           1,03
НДС 19 %          0,28

Сдать бутылки? Автомат у входа.
Сохраняйте чек.
Спасибо за покупку!`,
    glossary: [
      { term: 'das Pfand', ru: 'залог за бутылку — возвращается в автомате' },
      { term: 'die Tüte', ru: 'пакет (платный)' },
      { term: 'die Summe', ru: 'итого' },
      { term: 'die MwSt (Mehrwertsteuer)', ru: 'НДС: 7 % на продукты, 19 % на прочее' },
      { term: 'die Pfandrückgabe', ru: 'приём тары' },
      { term: 'aufbewahren', ru: 'сохранять, хранить' },
      { term: 'der Kassenbon', ru: 'кассовый чек' },
    ],
    questions: [
      {
        q: 'Wie viel Pfand ist im Preis enthalten?',
        options: ['0,20 €', '1,50 €', '3,54 €', 'Kein Pfand'],
        correct: 1,
        why: '25 центов за бутылку, шесть бутылок — 1,50 €. Эти деньги возвращаются, когда вы сдаёте тару в автомат.',
      },
      {
        q: 'Warum kostet die Tüte Geld?',
        options: ['Sie ist aus Stoff', 'Tüten sind in Deutschland kostenpflichtig', 'Es ist ein Fehler', 'Sie ist besonders groß'],
        correct: 1,
      },
      {
        q: 'Wie wurde bezahlt?',
        options: ['Bar', 'Mit EC-Karte', 'Mit Kreditkarte', 'Per Rechnung'],
        correct: 1,
      },
    ],
  },
  {
    id: 'de-mail-kollege',
    lang: 'de', title: 'Письмо коллеге', level: 'B1', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    origin: 'original',
    body: `Betreff: Krankmeldung und Übergabe

Sehr geehrte Frau Bauer,

leider bin ich seit gestern krank und werde diese Woche nicht ins Büro kommen können. Die Arbeitsunfähigkeitsbescheinigung habe ich heute Morgen beim Arzt geholt; sie geht direkt an die Personalabteilung.

Damit nichts liegen bleibt, hier kurz der Stand:

• Die Präsentation für Montag ist fertig und liegt im gemeinsamen Ordner unter „Q2/Final“.
• Herr Weber wartet noch auf die Zahlen für März. Die Datei ist vorbereitet, es fehlt nur die Freigabe.
• Der Termin mit dem Lieferanten am Mittwoch: Können Sie den bitte übernehmen oder verschieben? Ich schaffe es sicher nicht.

Wenn etwas dringend ist, schreiben Sie mir gern eine kurze Nachricht — ich schaue einmal am Tag in die Mails, aber bitte rechnen Sie nicht mit einer sofortigen Antwort.

Ich melde mich, sobald ich wieder arbeitsfähig bin.

Mit freundlichen Grüßen
Anna Petrowa`,
    translation: `Тема: Больничный и передача дел

Уважаемая госпожа Бауэр,

к сожалению, со вчерашнего дня я болею и на этой неделе не смогу выйти в офис. Справку о нетрудоспособности я получила сегодня утром у врача; она уходит напрямую в отдел кадров.

Чтобы ничего не встало, коротко о состоянии дел:

• Презентация к понедельнику готова и лежит в общей папке в «Q2/Final».
• Господин Вебер всё ещё ждёт цифры за март. Файл подготовлен, не хватает только согласования.
• Встреча с поставщиком в среду: не могли бы вы её взять на себя или перенести? Я точно не успею.

Если что-то срочное, напишите мне короткое сообщение — почту я смотрю раз в день, но, пожалуйста, не рассчитывайте на мгновенный ответ.

Я дам знать, как только снова смогу работать.

С уважением,
Анна Петрова`,
    glossary: [
      { term: 'der Betreff', ru: 'тема письма' },
      { term: 'die Krankmeldung', ru: 'больничный, уведомление о болезни' },
      { term: 'die Arbeitsunfähigkeitsbescheinigung (AU)', ru: 'справка о нетрудоспособности' },
      { term: 'die Personalabteilung', ru: 'отдел кадров' },
      { term: 'liegen bleiben', ru: 'остаться несделанным, встать' },
      { term: 'die Freigabe', ru: 'согласование, разрешение выпустить' },
      { term: 'übernehmen', ru: 'взять на себя' },
      { term: 'verschieben', ru: 'перенести (встречу)' },
      { term: 'arbeitsfähig', ru: 'трудоспособный' },
    ],
    questions: [
      {
        q: 'Wohin geht die AU-Bescheinigung?',
        options: ['An die Kollegin', 'An die Personalabteilung', 'An den Lieferanten', 'Nirgendwohin'],
        correct: 1,
      },
      {
        q: 'Was fehlt bei den März-Zahlen?',
        options: ['Die Datei', 'Die Freigabe', 'Die Unterschrift von Herrn Weber', 'Nichts'],
        correct: 1,
      },
      {
        q: 'Worum bittet Anna die Kollegin?',
        options: ['Die Präsentation zu schreiben', 'Den Termin am Mittwoch zu übernehmen oder zu verschieben', 'Sie zu Hause zu besuchen', 'Den Arzt anzurufen'],
        correct: 1,
      },
      {
        q: 'Wie schnell antwortet Anna auf Mails?',
        options: ['Sofort', 'Gar nicht', 'Sie schaut einmal am Tag hinein', 'Erst nächste Woche'],
        correct: 2,
      },
    ],
  },
]


// ─── Русский: тексты-мастерская ─────────────────────────────────────────────
//
// ЭТО НЕ «ТЕКСТЫ ДЛЯ ЧТЕНИЯ» в том смысле, в каком они нужны иностранному
// языку. Носителю не нужно тренировать понимание — ему нужно увидеть работу
// приёма и различие регистров. Поэтому тексты здесь устроены как ПАРЫ и
// РАЗБОРЫ: одно и то же сказано двумя способами, а вопросы спрашивают, чем
// отличаются версии и что именно делает слово.
//
// Все тексты написаны нами.

const RU: ReadingText[] = [
  {
    id: 'ru-two-letters',
    lang: 'ru', title: 'Два письма об одном и том же', level: 'Точность', minutes: 4,
    topic: 'Рабочая переписка', skill: 'Чтение',
    origin: 'original',
    body: `ПЕРВОЕ ПИСЬМО

Уважаемые коллеги!

В связи с необходимостью проведения работ по обновлению системы контроля доступа доводим до вашего сведения, что в период с 14 по 16 марта возможны временные ограничения при осуществлении входа в здание. В целях недопущения задержек рекомендуется осуществлять планирование прибытия с учётом дополнительного времени. По вопросам, связанным с данной ситуацией, вы можете обращаться в административный отдел.

ВТОРОЕ ПИСЬМО

Коллеги, добрый день!

С 14 по 16 марта меняем систему пропусков. В эти дни вход может работать медленнее обычного — закладывайте на проход лишние десять минут.

Если пропуск не сработает, звоните в администрацию: 205. Мы откроем вручную.

Спасибо за терпение.`,
    glossary: [
      { term: 'канцелярит', ru: 'штампованный язык бумаг: существительные вместо глаголов, длинные предлоги, безличность' },
      { term: 'отглагольное существительное', ru: '«проведение», «осуществление» — существительное, за которым спрятан глагол' },
      { term: 'безличная конструкция', ru: 'оборот без действующего лица: «рекомендуется», «доводим до сведения»' },
    ],
    questions: [
      {
        q: 'Чем отличается второе письмо от первого по СОДЕРЖАНИЮ?',
        options: [
          'Во втором меньше информации',
          'Ничем: содержание одно, отличается язык',
          'Во втором добавлены новые факты',
          'Первое подробнее объясняет причину',
        ],
        correct: 1,
        why: 'Оба письма сообщают одно и то же. Второе короче ровно за счёт того, что глаголы вернулись на место: «проведение работ по обновлению» → «меняем».',
      },
      {
        q: 'Что во втором письме есть, а в первом нет?',
        options: ['Дата', 'Конкретное действие читателя и номер телефона', 'Обращение', 'Причина работ'],
        correct: 1,
        why: 'Первое письмо не говорит, что делать: «обращаться в административный отдел» — это не инструкция, а отписка. Второе даёт номер и обещание.',
      },
      {
        q: 'Какой оборот первого письма самый бессодержательный?',
        options: ['«с 14 по 16 марта»', '«в целях недопущения задержек»', '«система контроля доступа»', '«административный отдел»'],
        correct: 1,
      },
      {
        q: 'Как переписать «доводим до вашего сведения, что возможны ограничения»?',
        options: [
          '«имеют место быть ограничения»',
          '«вход может работать медленнее»',
          '«информируем о наличии ограничений»',
          '«ограничения не исключены»',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'ru-three-versions',
    lang: 'ru', title: 'Три версии одного абзаца', level: 'Стиль', minutes: 4,
    topic: 'Ритм фразы', skill: 'Чтение',
    origin: 'original',
    body: `НЕЙТРАЛЬНО

Он вышел из дома в семь утра. Было холодно, шёл мелкий дождь. До остановки идти десять минут, автобус приходил в четверть восьмого. Он успел.

ДЛИННОЙ ФРАЗОЙ

Он вышел из дома в семь утра, в тот серый час, когда фонари ещё горят, но уже никому не нужны, и пошёл к остановке сквозь мелкий, висящий в воздухе дождь, который не столько мочил, сколько холодил лицо, и всю дорогу думал о том, что до автобуса пятнадцать минут, а идти десять, и, значит, всё в порядке.

КОРОТКОЙ ФРАЗОЙ

Семь утра. Холодно. Дождь — мелкий, висячий. До остановки десять минут. Автобус в семь пятнадцать. Он успел.`,
    glossary: [
      { term: 'ритм', ru: 'чередование длинных и коротких предложений; то, чем текст управляет вниманием' },
      { term: 'парцелляция', ru: 'дробление фразы на короткие самостоятельные куски' },
      { term: 'период', ru: 'длинное предложение со сложной внутренней связью частей' },
    ],
    questions: [
      {
        q: 'Что меняется во второй версии по сравнению с первой?',
        options: [
          'Появляются новые события',
          'Появляется внутреннее состояние героя и растягивается время',
          'Меняется место действия',
          'Ничего не меняется',
        ],
        correct: 1,
      },
      {
        q: 'Что даёт третья версия?',
        options: ['Спешку и сухость взгляда', 'Подробность', 'Иронию', 'Официальность'],
        correct: 0,
        why: 'Короткие назывные предложения дают темп и ощущение, что герой не рассматривает, а отмечает. Тот же набор фактов — другое состояние.',
      },
      {
        q: 'Какая версия уместнее в рабочем письме?',
        options: ['Первая', 'Вторая', 'Третья', 'Любая'],
        correct: 0,
        why: 'Нейтральный ритм не привлекает внимания к себе — в деловом тексте это достоинство.',
      },
      {
        q: 'Из чего складывается ритм текста?',
        options: [
          'Из длины предложений и пауз между ними',
          'Из количества эпитетов',
          'Из выбора темы',
          'Из абзацного деления',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'ru-speech-two-minutes',
    lang: 'ru', title: 'Речь на две минуты', level: 'Публично', minutes: 5,
    topic: 'Публичная речь', skill: 'Говорение',
    origin: 'original',
    body: `Структура, которая работает почти всегда: тезис — пример — вывод. Ниже одна и та же мысль, произнесённая без структуры и с ней.

БЕЗ СТРУКТУРЫ

Ну, я хотел сказать, что вообще-то, если посмотреть, у нас довольно много всего накопилось по проекту, и там есть моменты, которые как бы не совсем очевидны, и в целом, наверное, стоило бы это обсудить, потому что иначе может получиться, что мы придём к чему-то не тому, и тогда придётся переделывать, а это время.

СО СТРУКТУРОЙ

Нам нужен один общий разбор проекта до конца недели. (тезис)

За последний месяц мы трижды переделывали макеты, и каждый раз причина была одна — разное понимание задачи. Последняя переделка стоила восьми дней. (пример)

Час разговора сейчас сэкономит нам неделю в апреле. Предлагаю встретиться в четверг в десять. (вывод и конкретное предложение)`,
    glossary: [
      { term: 'тезис', ru: 'главная мысль, сформулированная одним предложением' },
      { term: 'аргумент', ru: 'то, что делает тезис убедительным: факт, цифра, случай' },
      { term: 'вывод', ru: 'следствие из тезиса и примера; в устной речи заканчивается предложением действия' },
      { term: 'слова-заполнители', ru: '«ну», «как бы», «в целом», «наверное» — то, чем закрывают паузу' },
    ],
    questions: [
      {
        q: 'Чем первый вариант отличается от второго?',
        options: [
          'В нём меньше фактов и нет предложения действия',
          'Он вежливее',
          'Он короче',
          'Он подробнее',
        ],
        correct: 0,
      },
      {
        q: 'Сколько цифр в первом варианте?',
        options: ['Ни одной', 'Одна', 'Три', 'Пять'],
        correct: 0,
        why: 'Именно поэтому он не убеждает: «довольно много всего накопилось» ничего не сообщает слушателю.',
      },
      {
        q: 'Чем заканчивается сильная короткая речь?',
        options: [
          'Благодарностью',
          'Конкретным предложением: что, кто и когда',
          'Вопросом',
          'Повтором тезиса',
        ],
        correct: 1,
      },
      {
        q: 'Чем заменить слова-заполнители?',
        options: ['Более длинными оборотами', 'Паузой', 'Жестами', 'Ускорением речи'],
        correct: 1,
      },
    ],
  },
  {
    id: 'ru-detail',
    lang: 'ru', title: 'Деталь вместо описания', level: 'Точность', minutes: 4,
    topic: 'Деталь и портрет', skill: 'Письмо',
    origin: 'original',
    body: `ОПИСАНИЕ

Это был пожилой мужчина, очень аккуратный и педантичный, привыкший к порядку во всём. Он любил, чтобы вещи лежали на своих местах, и раздражался, когда что-то нарушало заведённый им порядок.

ДЕТАЛЬ

Он поправил лежавшую на столе ручку, чтобы она была параллельна краю. Потом отодвинул её на сантиметр и поправил ещё раз.

ОПИСАНИЕ

Она очень волновалась перед разговором и не могла найти себе места, хотя старалась выглядеть спокойной.

ДЕТАЛЬ

Она говорила ровно и смотрела в глаза. Под столом она третий раз перекладывала телефон из руки в руку.`,
    glossary: [
      { term: 'деталь', ru: 'мелкая подробность, по которой читатель сам делает вывод о человеке' },
      { term: 'показать вместо рассказать', ru: 'правило прозы: дать действие, а не оценку' },
      { term: 'жест', ru: 'движение, выдающее состояние, о котором герой молчит' },
    ],
    questions: [
      {
        q: 'Почему вариант с деталью сильнее?',
        options: [
          'Он короче',
          'Читатель делает вывод сам, и поэтому верит ему больше',
          'В нём больше слов',
          'Он написан в настоящем времени',
        ],
        correct: 1,
      },
      {
        q: 'Что общего у двух деталей в тексте?',
        options: [
          'Обе про руки',
          'Обе — маленькое повторяющееся действие',
          'Обе про мебель',
          'Обе про разговор',
        ],
        correct: 1,
        why: 'Повтор в детали работает так же, как повтор в сюжете: один раз поправить ручку — случайность, дважды — характер.',
      },
      {
        q: 'Как проверить, что деталь удачная?',
        options: [
          'Она красивая',
          'Из неё можно вывести то, что вы хотели сказать, — и нельзя вывести противоположное',
          'Она редкая',
          'Она длинная',
        ],
        correct: 1,
      },
      {
        q: 'Где деталь неуместна?',
        options: [
          'В рассказе',
          'В инструкции и в деловом уведомлении',
          'В письме другу',
          'В выступлении',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'ru-argument',
    lang: 'ru', title: 'Спор: три способа возразить', level: 'Публично', minutes: 4,
    topic: 'Спор и аргумент', skill: 'Говорение',
    origin: 'original',
    body: `ИСХОДНОЕ УТВЕРЖДЕНИЕ

«Удалённая работа снижает продуктивность команды».

ВОЗРАЖЕНИЕ ПЕРВОЕ — по факту

«В нашей команде за полгода удалёнки скорость выпуска не изменилась: было четыре релиза в квартал, стало четыре. Данные в отчёте, могу прислать».

ВОЗРАЖЕНИЕ ВТОРОЕ — по определению

«Смотря что считать продуктивностью. Если число рабочих часов — да, оно снизилось. Если выполненные задачи — нет. Давайте сначала договоримся, что мы измеряем».

ВОЗРАЖЕНИЕ ТРЕТЬЕ — уступка и поворот

«Согласен, обсуждать сложные задачи удалённо тяжелее. Поэтому предлагаю оставить удалёнку и добавить один общий день в офисе — а не отменять её целиком».

КАК НЕ НАДО

«Это неправда, все нормальные компании давно на удалёнке, ты просто отстал».`,
    glossary: [
      { term: 'аргумент к факту', ru: 'возражение, опирающееся на проверяемые данные' },
      { term: 'спор о термине', ru: 'выяснение, одинаково ли стороны понимают ключевое слово' },
      { term: 'уступка', ru: 'признание части чужой правоты — сильный ход, а не слабость' },
      { term: 'переход на личности', ru: 'подмена спора о деле разговором о собеседнике' },
    ],
    questions: [
      {
        q: 'Чем сильны первые три возражения?',
        options: [
          'Они длиннее',
          'Они спорят с утверждением, а не с человеком',
          'Они вежливее',
          'Они эмоциональнее',
        ],
        correct: 1,
      },
      {
        q: 'Что делает второе возражение?',
        options: [
          'Опровергает факт',
          'Показывает, что стороны говорят о разном',
          'Предлагает компромисс',
          'Соглашается',
        ],
        correct: 1,
        why: 'Половина споров — это спор о значении слова. Договорившись о термине, стороны часто обнаруживают, что разногласия нет.',
      },
      {
        q: 'Почему уступка усиливает позицию?',
        options: [
          'Она показывает, что вы слушали, и снимает у собеседника защиту',
          'Она сокращает спор',
          'Она вежлива',
          'Она ничего не меняет',
        ],
        correct: 0,
      },
      {
        q: 'В чём главная ошибка последнего варианта?',
        options: [
          'Он короткий',
          'Он говорит о собеседнике, а не о вопросе',
          'В нём нет цифр',
          'Он неформальный',
        ],
        correct: 1,
      },
    ],
  },
]

export const READING_LIBRARY: ReadingText[] = [...EN, ...KO, ...JA, ...PT, ...DE, ...RU, ...MORE]

/** Тексты нужного языка, по возрастанию уровня. */
export function textsForLang(lang: string): ReadingText[] {
  return READING_LIBRARY.filter(t => t.lang === lang)
}

/** Языки, для которых в библиотеке вообще что-то есть. */
export function langsWithTexts(): string[] {
  return [...new Set(READING_LIBRARY.map(t => t.lang))]
}
