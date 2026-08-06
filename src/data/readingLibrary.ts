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
    lang: 'ko', title: '헬스장 안내 (объявление в спортзале)', level: 'TOPIK 1', minutes: 2,
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
    lang: 'ko', title: '문자 메시지 (переписка)', level: 'TOPIK 1', minutes: 2,
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

export const READING_LIBRARY: ReadingText[] = [...EN, ...KO, ...JA, ...PT]

/** Тексты нужного языка, по возрастанию уровня. */
export function textsForLang(lang: string): ReadingText[] {
  return READING_LIBRARY.filter(t => t.lang === lang)
}

/** Языки, для которых в библиотеке вообще что-то есть. */
export function langsWithTexts(): string[] {
  return [...new Set(READING_LIBRARY.map(t => t.lang))]
}
