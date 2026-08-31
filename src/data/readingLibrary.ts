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
   * Предмет, которому принадлежит текст, — ТОЛЬКО там, где на одном языке
   * сидят два предмета.
   *
   * Русский и литература имеют общий langCode 'ru' (см. lib/subjects), и без
   * этого поля «Чтение» у обоих показывало одну и ту же полку: ученик, открывший
   * литературу, видел разбор делового письма, а пришедший за точностью речи —
   * пейзаж у Тургенева. Язык у них действительно один, а материал разный,
   * и разделить их может только сам текст.
   *
   * Пусто — текст принадлежит всем предметам этого языка. Для языков, где
   * предмет один (английский, корейский), поле не нужно и не ставится.
   */
  subject?: 'russian' | 'literature'
  /**
   * Происхождение текста. 'original' — написан нами. Для заимствованных
   * обязательно указание источника и лицензии, иначе текст нельзя показывать.
   */
  origin: 'original' | 'open-corpus' | 'teacher'
  credit?: string
}

import { KO_TEXTS } from './readingKo'
import { EN_TEXTS } from './readingEn'
import { JA_TEXTS } from './readingJa'
import { DE_TEXTS } from './readingDe'
import { RU_TEXTS } from './readingRu'

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
    translation: `Продуктовый дизайнер (средний уровень)
Удалённо — Европа · Полная занятость

Ищем продуктового дизайнера в команду из шести человек. Работа над мобильным приложением, в основном онбординг и платежи.

Чего ждём:
• 2+ года в продуктовом дизайне
• Портфолио хотя бы с одним разбором проекта
• Рабочий английский (команда в четырёх странах)
• Опыт с дизайн-системами будет плюсом, но не требуется

Что предлагаем:
• Полная удалёнка, свободный график
• Бюджет на курсы и конференции
• 30 дней оплачиваемого отпуска

Присылайте резюме и ссылку на портфолио. Отвечаем на каждый отклик в течение двух недель.`,
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
        why: '«Join our team of six» — команда названа в первой же строке описания, а «four countries» ниже про страны, а не про людей.',
      },
      {
        q: 'What should you send?',
        options: ['CV and portfolio link', 'Only a CV', 'CV, portfolio and a test task', 'A cover letter only'],
        correct: 0,
        why: '«Send your CV and portfolio link» — про тестовое задание и сопроводительное письмо в объявлении нет ни слова.',
      },
      {
        q: 'When will they answer?',
        options: ['Within two weeks', 'Within two days', 'Within a month', 'They do not promise an answer'],
        correct: 0,
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
    translation: `Здравствуйте, Даниил!

Спасибо за отклик на вакансию продуктового дизайнера. Я посмотрела портфолио — разбор про оформление заказа особенно интересный.

Хочу назначить короткий звонок на этой неделе, минут на двадцать, просто познакомиться и ответить на ваши вопросы. Среда или четверг вам подойдут? Я свободна между 10:00 и 16:00 по CET.

И ещё: подскажите, пожалуйста, ваши зарплатные ожидания. Так мы сразу поймём, совпадаем ли по вилке, прежде чем идти дальше.

Жду ответа,
Анна`,
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
        why: '«A short call this week, around 20 minutes» — длительность названа прямо, ещё и со словом short.',
      },
      {
        q: 'What does Anna ask you to tell her?',
        options: ['Your address', 'Your references', 'Your notice period', 'Your salary expectations'],
        correct: 3,
        why: '«Could you let me know your salary expectations?» — это единственная просьба в письме, всё остальное она сообщает сама.',
      },
      {
        q: 'Why does she ask about money now?',
        options: [
          'To check both sides are in the same range before continuing',
          'To make an offer immediately',
          'Because it is company policy to ask first',
          'She does not explain why',
        ],
        correct: 0,
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
    translation: `Мария: доброе утро! вчера доделала пустые состояния для поиска, сегодня берусь за фильтры. блокеров нет

Том: предупреждаю — сегодня из дома, буду онлайн с двух. вчера: поправил отступы после дизайн-ревью. сегодня: подготовка к передаче в разработку. застрял на тексте для экранов ошибок, @Анна посмотришь?

Анна: беру, пришлю до конца дня

Даниил: вчера провёл две сессии с пользователями, сегодня пишу по ним отчёт. блокеров нет, но хочу 15 минут с кем-то из бэкенда по шагу оплаты — можем созвониться после стендапа?`,
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
        options: ['Maria', 'Anna', 'Tom', 'Daniil'],
        correct: 2,
        why: 'Tom пишет «blocked on the copy» — ему нужны тексты, чтобы двигаться дальше.',
      },
      {
        q: 'What does Anna promise?',
        options: ['To work from home', 'To run usability sessions', 'To fix the spacing', 'To send the copy by the end of the day'],
        correct: 3,
        why: '«on it, will send by EOD» — EOD это end of day, конец рабочего дня. Остальные варианты — реплики других участников.',
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
    translation: `Привет, Даниил!

Спасибо, что показал прототип — направление в целом сильное, и второй экран заметно понятнее прошлого раза.

Несколько мыслей. Мне кажется, контраст вторичной кнопки может стать проблемой на маленьких экранах: на ноутбуке всё нормально, а на телефоне я не смогла прочитать надпись. Не думал сделать текст темнее, а не фон светлее?

Единственное, что меня действительно беспокоит, — третий шаг. Сейчас адрес приходится вводить дважды, и в сессиях прошлого месяца люди отваливались ровно там. Из каких соображений он остался?

Всё остальное — придирки, они подождут.

С уважением,
Сара`,
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
        options: ['The button contrast', 'The second screen', 'Entering the address twice', 'The colours in general'],
        correct: 2,
        why: '«My only real concern is the third step» — она сама помечает вес замечания.',
      },
      {
        q: 'How does she raise the contrast problem?',
        options: [
          'As an order: fix the contrast',
          'As a joke',
          'As a possibility: "I wonder if… might be an issue"',
          'She does not mention it',
        ],
        correct: 2,
        why: 'Замечание в форме предположения — принятая в командах форма критики. Прямое «the contrast is bad» звучало бы как приговор.',
      },
      {
        q: 'What does "everything else is a nitpick" mean here?',
        options: [
          'The rest is very important',
          'The rest is wrong',
          'She has not looked at the rest',
          'The rest is small and can wait',
        ],
        correct: 3,
        why: 'Nitpick — мелкая придирка. Фраза стоит после единственного серьёзного замечания и служит именно тем, чтобы отделить важное от неважного.',
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
        options: ['네, 갈 수 있어요', '아니요, 쉬는 날이에요', '안내에 없어요', '아니요, 6시에 닫아요'],
        correct: 3,
        why: 'Выходные до 18:00 — в 20:00 зал уже закрыт.',
      },
      {
        q: '커피를 가지고 들어갈 수 있어요?',
        options: ['네, 괜찮아요', '아니요, 물만 돼요', '오전에만 돼요', '안내에 없어요'],
        correct: 1,
        why: '«음료수는 물만 가지고 들어올 수 있어요» — из напитков разрешена только вода, и кофе под это не подходит.',
      },
      {
        q: '사물함은 얼마예요?',
        options: ['하루에 천 원', '무료예요', '한 달에 천 원', '안내에 없어요'],
        correct: 0,
        why: '«사물함은 하루에 천 원이에요» — цена привязана к дню, а не к месяцу.',
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
        options: ['모레', '오늘', '내일', '다음 주'],
        correct: 0,
        why: 'Юри не может завтра, поэтому договорились на послезавтра.',
      },
      {
        q: '유리 씨는 왜 내일 안 돼요?',
        options: ['아파요', '약속이 있어요', '일이 늦게 끝나요', '여행을 가요'],
        correct: 2,
        why: '«내일은 일이 늦게 끝나요» — причина названа прямо, и она про работу, а не про здоровье или планы.',
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
        options: ['はい、いけます', 'ごぜんだけ いけます', 'おしらせに ありません', 'いいえ、やすみです'],
        correct: 3,
        why: '「にちようび：やすみです」 — прямо сказано, что воскресенье выходной.',
      },
      {
        q: 'ほんは どのくらい かりることが できますか。',
        options: ['1しゅうかん', '2しゅうかん', '1かげつ', '3にち'],
        correct: 1,
        why: '「ほんは 2しゅうかん かりることが できます」 — срок назван прямо, в неделях.',
      },
      {
        q: 'どようびは なんじに おわりますか。',
        options: ['ゆうがた 6じ', 'ごご 4じ', 'あさ 10じ', 'おわりません'],
        correct: 1,
        why: '「どようび：あさ 10じ〜ごご 4じ」 — до шести работают будни, а вопрос про субботу.',
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
        options: ['しごとが おそいです', 'びょうきです', 'りょこうです', 'やくそくが あります'],
        correct: 0,
        why: '「あしたは しごとが おそいです」 — причина в работе, а не в болезни или поездке.',
      },
      {
        q: 'なにを たべますか。',
        options: ['すし', 'からいもの', 'ラーメン', 'まだ わかりません'],
        correct: 0,
        why: 'Острое Рина не ест, и в ответ звучит предложение суши, которое она принимает.',
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
        options: ['Sim, o dia todo', 'Só de manhã', 'Não, fica fechada', 'O aviso não diz'],
        correct: 2,
        why: '«Domingo: fechado» — воскресенье указано в расписании как закрытый день.',
      },
      {
        q: 'Posso levar café para a academia?',
        options: ['Não, só água', 'Sim, pode', 'Só de manhã', 'O aviso não diz'],
        correct: 0,
        why: '«Só água» — из напитков разрешена только вода.',
      },
      {
        q: 'Quanto custa o armário?',
        options: ['R$ 5 por dia', 'É de graça', 'R$ 5 por mês', 'O aviso não diz'],
        correct: 0,
        why: '«Armário: R$ 5 por dia» — цена привязана к дню, а не к месяцу.',
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
        options: ['Hoje', 'Depois de amanhã', 'Amanhã', 'Na semana que vem'],
        correct: 1,
        why: 'Завтра Карла не может, поэтому договариваются на послезавтра.',
      },
      {
        q: 'Por que a Carla não pode amanhã?',
        options: ['Está doente', 'Vai viajar', 'Já tem compromisso', 'Sai tarde do trabalho'],
        correct: 3,
        why: '«Saio tarde do trabalho amanhã» — причина в работе.',
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
    translation: `Уважаемый Даниил!

Рады предложить вам должность продуктового дизайнера в Nordic Labs с 15 сентября.

Зарплата — 4900 евро в месяц до вычета налогов, пересматривается раз в год. Вам полагается 28 дней оплачиваемого отпуска в год плюс государственные праздники страны вашего проживания.

Работа полностью удалённая. Просим пересекаться с рабочими часами CET хотя бы на четыре часа в день.

Первые три месяца — испытательный срок, в течение которого любая из сторон может расторгнуть договор с предупреждением за две недели. После — срок предупреждения месяц.

Просим подтвердить до 30 августа. Если есть вопросы по условиям, с удовольствием обсужу их до подписания.

С уважением,
Анна Ковальская`,
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
          'No, it is before tax',
          'Yes, that is the final amount',
          'No, it is after tax',
          'The letter does not say',
        ],
        correct: 0,
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
          'There are no requirements',
          'You must move to Europe',
          'You must overlap with CET for at least four hours',
        ],
        correct: 3,
        why: '«Overlap with CET working hours for at least four hours a day» — фиксированного графика нет, есть требование пересечения.',
      },
      {
        q: 'What should you do if a term is unclear?',
        options: [
          'Ask before signing — she offers to discuss',
          'Sign first, ask later',
          'Refuse the offer',
          'Nothing, terms are fixed',
        ],
        correct: 0,
        why: '«I am happy to discuss them before you sign» — письмо само предлагает спросить до подписи.',
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
          '아니요, 재료비 오천 원을 내야 해요',
          '네, 완전히 무료예요',
          '아니요, 오만 원이에요',
          '안내에 없어요',
        ],
        correct: 0,
        why: 'Ловушка: 참가비 무료, но 재료비 платить надо. Такие оговорки в объявлениях почти всегда идут после «но».',
      },
      {
        q: '몇 명까지 신청할 수 있어요?',
        options: ['스무 명', '열 명', '서른 명', '제한이 없어요'],
        correct: 0,
        why: '«스무 명» — двадцать. Ограничение названо, поэтому вариант «без ограничений» отпадает.',
      },
      {
        q: '어떻게 신청해요?',
        options: ['전화로', '직접 가서', '홈페이지에서만', '이메일로'],
        correct: 2,
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
          'いいえ、ぜんぶ ゆうりょうです',
          'おしらせに ありません',
          'いいえ、きょうかしょは じぶんで はらいます',
        ],
        correct: 3,
        why: 'Конструкция 〜ですが вводит оговорку. Именно после неё обычно и лежит подвох.',
      },
      {
        q: 'なんにんまで もうしこめますか。',
        options: ['10にん', '20にん', '30にん', 'せいげんは ありません'],
        correct: 1,
        why: '「20にんまで」 — 〜まで задаёт верхнюю границу.',
      },
      {
        q: 'どうやって もうしこみますか。',
        options: ['でんわで', 'ホームページからだけ', 'ちょくせつ いって', 'メールで'],
        correct: 1,
        why: '「ホームページから もうしこんで ください」 — способ назван один, телефон и почта не упоминаются.',
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
          'Só para vagas sênior',
          'Não, é apenas um diferencial',
          'O anúncio não diz',
        ],
        correct: 2,
        why: '«É um diferencial, não um requisito» — прямое противопоставление.',
      },
      {
        q: 'Que nível de inglês é necessário?',
        options: ['Fluente', 'Não é necessário', 'Para leitura', 'Nativo'],
        correct: 2,
        why: 'Английский нужен для чтения документации — свободное владение в требованиях не стоит.',
      },
      {
        q: 'O que significa "CLT" aqui?',
        options: [
          'Trabalho como freelancer',
          'Estágio',
          'Trabalho temporário',
          'Contratação formal pela legislação trabalhista',
        ],
        correct: 3,
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
        options: ['Nur Fahrräder', 'Nichts wird verboten', 'Schuhe, Kinderwagen und Pflanzen', 'Nur Müll'],
        correct: 2,
        why: 'В объявлении перечислено сразу несколько вещей, а не одни велосипеды: лестница должна оставаться свободной для рабочих.',
      },
      {
        q: 'Wo stehen die Mülltonnen in dieser Woche?',
        options: ['Im Müllraum', 'Vor der Haustür', 'Auf der Straße', 'Im Hof neben der Garage'],
        correct: 3,
        why: 'На время работ баки переставили во двор к гаражу — обычное место мусорной комнаты на эту неделю не работает.',
      },
      {
        q: 'Wann gilt die Ruhezeit?',
        options: ['Werktags 22–6 Uhr und sonntags den ganzen Tag', 'Nur nachts von 0 bis 6', 'Nur am Wochenende', 'Immer'],
        correct: 0,
        why: 'Именно из-за этого правила соседи звонят в дверь: воскресенье в Германии тихое целиком.',
      },
      {
        q: 'Welche Farbe hat die Tonne für Papier?',
        options: ['gelb', 'braun', 'blau', 'grau'],
        correct: 2,
        why: 'Синий бак — для бумаги. Жёлтый идёт под упаковку, коричневый под органику.',
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
        options: ['820 €', '640 €', '180 €', '1 920 €'],
        correct: 0,
        why: 'Warmmiete — это Kaltmiete плюс Nebenkosten: именно эту сумму вы платите каждый месяц.',
      },
      {
        q: 'Was muss man vor dem Einzug einmalig bezahlen?',
        options: ['Nichts', 'Eine Kaution von 1 920 €', 'Die Maklergebühr', 'Ein Jahr im Voraus'],
        correct: 1,
        why: 'Kaution — залог, который вносят один раз до въезда. Комиссия маклера в объявлении не упомянута вовсе.',
      },
      {
        q: 'Gibt es eine Küche?',
        options: ['Ja, mit allen Geräten', 'Nur eine Kochplatte', 'Nein, eine Einbauküche ist nicht vorhanden', 'Das steht nicht im Text'],
        correct: 2,
        why: 'Это типично: немецкие квартиры часто сдают буквально с пустой стеной вместо кухни.',
      },
      {
        q: 'Was passiert mit Anfragen ohne Unterlagen?',
        options: ['Sie werden später beantwortet', 'Man bekommt einen zweiten Termin', 'Man zahlt eine Gebühr', 'Sie werden nicht beantwortet'],
        correct: 3,
        why: 'Объявление прямо предупреждает: заявки без документов остаются без ответа, второго шанса не будет.',
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
        options: ['Zwei Tage', 'Eine Woche', 'Drei Monate', 'Etwa vier Wochen'],
        correct: 3,
        why: 'В письме названы примерно четыре недели — именно поэтому пропущенная запись обходится так дорого.',
      },
      {
        q: 'Was passiert bei einer Verspätung von 15 Minuten?',
        options: ['Nichts', 'Man wird als Letzter drangenommen', 'Man zahlt 10 Euro', 'Der Termin verfällt'],
        correct: 3,
        why: 'Опоздание аннулирует запись целиком: ждать в очереди последним не предлагают.',
      },
      {
        q: 'Muss man die Steuer-ID beantragen?',
        options: ['Ja, mit einem Formular', 'Ja, online', 'Nein, sie kommt automatisch per Post', 'Nur wenn man arbeitet'],
        correct: 2,
        why: 'Налоговый номер приходит по почте сам после регистрации — заявление на него не подают.',
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
        why: 'Пациент работает до пяти, а приём предлагали раньше — дело в его расписании, не в клинике.',
      },
      {
        q: 'Was kann man tun, wenn es vor dem Termin schlimmer wird?',
        options: ['Anrufen und in die offene Sprechstunde kommen', 'In die Notaufnahme fahren', 'Nichts', 'Den Arzt zu Hause besuchen'],
        correct: 0,
        why: 'Регистратура предлагает позвонить и прийти в открытые часы приёма — это способ попасть раньше записи, не вызывая скорую.',
      },
      {
        q: 'Warum soll der Patient zehn Minuten früher kommen?',
        options: ['Wegen der Zahlung', 'Wegen des Anmeldebogens', 'Weil der Arzt früher anfängt', 'Wegen der Parkplatzsuche'],
        correct: 1,
        why: 'Раньше приходят, чтобы успеть заполнить анкету, а не потому, что врач начинает раньше.',
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
        options: ['1,50 €', '0,20 €', '3,54 €', 'Kein Pfand'],
        correct: 0,
        why: '25 центов за бутылку, шесть бутылок — 1,50 €. Эти деньги возвращаются, когда вы сдаёте тару в автомат.',
      },
      {
        q: 'Warum kostet die Tüte Geld?',
        options: ['Sie ist aus Stoff', 'Es ist ein Fehler', 'Sie ist besonders groß', 'Tüten sind in Deutschland kostenpflichtig'],
        correct: 3,
        why: 'Пакеты в немецких магазинах платные — это не ошибка кассы и не свойство конкретного пакета.',
      },
      {
        q: 'Wie wurde bezahlt?',
        options: ['Bar', 'Mit EC-Karte', 'Mit Kreditkarte', 'Per Rechnung'],
        correct: 1,
        why: 'В чеке стоит EC-Karte — самая распространённая в Германии дебетовая карта, не наличные и не кредитка.',
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
        why: 'Больничный отправляют в отдел кадров, а не коллеге, которая просто подменяет.',
      },
      {
        q: 'Was fehlt bei den März-Zahlen?',
        options: ['Die Freigabe', 'Die Datei', 'Die Unterschrift von Herrn Weber', 'Nichts'],
        correct: 0,
        why: 'Файл готов и лежит на месте — не хватает только согласования.',
      },
      {
        q: 'Worum bittet Anna die Kollegin?',
        options: ['Den Termin am Mittwoch zu übernehmen oder zu verschieben', 'Die Präsentation zu schreiben', 'Sie zu Hause zu besuchen', 'Den Arzt anzurufen'],
        correct: 0,
        why: 'Просьба одна: взять встречу в среду на себя или перенести её.',
      },
      {
        q: 'Wie schnell antwortet Anna auf Mails?',
        options: ['Sofort', 'Gar nicht', 'Sie schaut einmal am Tag hinein', 'Erst nächste Woche'],
        correct: 2,
        why: 'Она предупреждает, что заглядывает в почту раз в день, — то есть мгновенного ответа ждать не стоит.',
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
    subject: 'russian',
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
          'Во втором добавлены новые факты',
          'Ничем: содержание одно, отличается язык',
          'Первое подробнее объясняет причину',
        ],
        correct: 2,
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
        options: ['«в целях недопущения задержек»', '«с 14 по 16 марта»', '«система контроля доступа»', '«административный отдел»'],
        correct: 0,
        why: '«В целях недопущения задержек» не сообщает ничего: даты, система и отдел — это факты, а этот оборот только объясняет очевидное.',
      },
      {
        q: 'Как переписать «доводим до вашего сведения, что возможны ограничения»?',
        options: [
          '«вход может работать медленнее»',
          '«имеют место быть ограничения»',
          '«информируем о наличии ограничений»',
          '«ограничения не исключены»',
        ],
        correct: 0,
        why: 'Три других варианта — та же канцелярия другими словами. Пересказ работает, только если из него исчезает и «доводим до сведения», и «возможны».',
      },
    ],
  },
  {
    id: 'ru-three-versions',
    lang: 'ru', title: 'Три версии одного абзаца', level: 'Стиль', minutes: 4,
    topic: 'Ритм фразы', skill: 'Чтение',
    subject: 'literature',
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
          'Меняется место действия',
          'Ничего не меняется',
          'Появляется внутреннее состояние героя и растягивается время',
        ],
        correct: 3,
        why: 'События те же и место то же. Добавляется взгляд героя изнутри, и от этого те же несколько секунд занимают больше строк.',
      },
      {
        q: 'Что даёт третья версия?',
        options: ['Подробность', 'Иронию', 'Официальность', 'Спешку и сухость взгляда'],
        correct: 3,
        why: 'Короткие назывные предложения дают темп и ощущение, что герой не рассматривает, а отмечает. Тот же набор фактов — другое состояние.',
      },
      {
        q: 'Какая версия уместнее в рабочем письме?',
        options: ['Вторая', 'Третья', 'Первая', 'Любая'],
        correct: 2,
        why: 'Нейтральный ритм не привлекает внимания к себе — в деловом тексте это достоинство.',
      },
      {
        q: 'Из чего складывается ритм текста?',
        options: [
          'Из количества эпитетов',
          'Из выбора темы',
          'Из абзацного деления',
          'Из длины предложений и пауз между ними',
        ],
        correct: 3,
        why: 'Ритм задают длина предложений и паузы между ними — эпитеты и тема на него не влияют.',
      },
    ],
  },
  {
    id: 'ru-speech-two-minutes',
    lang: 'ru', title: 'Речь на две минуты', level: 'Публично', minutes: 5,
    topic: 'Публичная речь', skill: 'Говорение',
    subject: 'russian',
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
          'Он вежливее',
          'Он короче',
          'Он подробнее',
          'В нём меньше фактов и нет предложения действия',
        ],
        correct: 3,
        why: 'Он не короче и не вежливее: в нём просто меньше опорных фактов, и он ничего не предлагает сделать.',
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
          'Вопросом',
          'Конкретным предложением: что, кто и когда',
          'Повтором тезиса',
        ],
        correct: 2,
        why: 'Не благодарностью и не повтором тезиса, а конкретным предложением — что именно, кто делает и к какому сроку.',
      },
      {
        q: 'Чем заменить слова-заполнители?',
        options: ['Более длинными оборотами', 'Жестами', 'Паузой', 'Ускорением речи'],
        correct: 2,
        why: 'Пауза делает ровно то, ради чего произносят «э-э»: даёт время подумать — но слушателю она читается как уверенность.',
      },
    ],
  },
  {
    id: 'ru-detail',
    lang: 'ru', title: 'Деталь вместо описания', level: 'Точность', minutes: 4,
    topic: 'Деталь и портрет', skill: 'Письмо',
    subject: 'literature',
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
          'Читатель делает вывод сам, и поэтому верит ему больше',
          'Он короче',
          'В нём больше слов',
          'Он написан в настоящем времени',
        ],
        correct: 0,
        why: 'Вывод, к которому читатель пришёл сам, он не оспаривает. Готовое утверждение автора — оспаривает.',
      },
      {
        q: 'Что общего у двух деталей в тексте?',
        options: [
          'Обе про руки',
          'Обе про мебель',
          'Обе про разговор',
          'Обе — маленькое повторяющееся действие',
        ],
        correct: 3,
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
        why: 'Проверка двусторонняя: деталь должна вести к нужному выводу и не должна одинаково хорошо подходить к противоположному.',
      },
      {
        q: 'Где деталь неуместна?',
        options: [
          'В рассказе',
          'В письме другу',
          'В инструкции и в деловом уведомлении',
          'В выступлении',
        ],
        correct: 2,
        why: 'В инструкции и уведомлении читателю нужно одно действие и один смысл: деталь там добавляет толкований, а не убирает их.',
      },
    ],
  },
  {
    id: 'ru-argument',
    lang: 'ru', title: 'Спор: три способа возразить', level: 'Публично', minutes: 4,
    topic: 'Спор и аргумент', skill: 'Говорение',
    subject: 'russian',
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
        why: 'Все три обсуждают само утверждение — цифру, значение слова, следствие. Ни одно не переходит на говорящего.',
      },
      {
        q: 'Что делает второе возражение?',
        options: [
          'Показывает, что стороны говорят о разном',
          'Опровергает факт',
          'Предлагает компромисс',
          'Соглашается',
        ],
        correct: 0,
        why: 'Половина споров — это спор о значении слова. Договорившись о термине, стороны часто обнаруживают, что разногласия нет.',
      },
      {
        q: 'Почему уступка усиливает позицию?',
        options: [
          'Она сокращает спор',
          'Она показывает, что вы слушали, и снимает у собеседника защиту',
          'Она вежлива',
          'Она ничего не меняет',
        ],
        correct: 1,
        why: 'Согласившись с верной частью чужого довода, вы снимаете с собеседника защиту — и дальше он слушает возражение, а не готовит ответ.',
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
        why: 'Он разбирает не довод, а самого собеседника. Такой аргумент нечем проверить, и спор перестаёт быть про вопрос.',
      },
    ],
  },
]

// ─── Английский: «Работа в команде» ──────────────────────────────────────────
//
// Тема была одним текстом (стендап в Slack), и фильтр «Навык → Лексика» давал
// ровно одну карточку. Здесь она разворачивается в полку: жанры, которые
// работающий человек читает каждый день, — тред в чате, повестка встречи,
// заметки после созвона, передача дел, разбор инцидента, правки к тексту.
// Ценность именно в регистре: те же слова в письме клиенту звучали бы иначе.

const EN_TEAMWORK: ReadingText[] = [
  {
    id: 'en-team-thread',
    lang: 'en', title: 'A thread about a deadline', level: 'A2', minutes: 2,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Tom: quick question — is the deadline for the deck Friday or Monday? I have it as Friday but the calendar says Monday

Maria: Monday. we moved it last week because Anna is away on Friday

Tom: ah, good. that gives me the weekend, I mean the extra day 🙂

Maria: no need to work on the weekend, please. Monday morning is fine

Tom: understood. I'll send a draft Friday anyway so you can look at it early

Maria: perfect, thanks. one thing — please put the numbers on slide 4, not in the notes. people never open the notes`,
    translation: `Том: короткий вопрос — дедлайн по презентации в пятницу или в понедельник? У меня записана пятница, а в календаре понедельник

Мария: понедельник. мы сдвинули на прошлой неделе, потому что в пятницу Анны нет

Том: а, хорошо. значит, у меня есть выходные, то есть лишний день 🙂

Мария: в выходные работать не надо, пожалуйста. утро понедельника — нормально

Том: понял. черновик всё равно пришлю в пятницу, чтобы вы посмотрели заранее

Мария: отлично, спасибо. и ещё — цифры поставь на четвёртый слайд, а не в заметки. заметки никто не открывает`,
    glossary: [
      { term: 'deadline', ru: 'срок сдачи' },
      { term: 'deck', ru: 'презентация (слайды)' },
      { term: 'to move a date', ru: 'перенести дату' },
      { term: 'away', ru: 'в отъезде, отсутствует' },
      { term: 'draft', ru: 'черновик' },
      { term: 'anyway', ru: 'всё равно' },
      { term: 'slide', ru: 'слайд' },
      { term: 'notes', ru: 'заметки к слайду' },
    ],
    questions: [
      {
        q: 'When is the deck due?',
        options: ['On Friday', 'On Monday', 'On the weekend', 'It is not decided yet'],
        correct: 1,
        why: 'Maria отвечает одним словом: «Monday». Пятница у Тома — старая дата, которую сдвинули.',
      },
      {
        q: 'Why was the date moved?',
        options: ['Because Anna is away on Friday', 'Because Tom asked for more time', 'Because the deck is too long', 'The thread does not say'],
        correct: 0,
        why: '«We moved it last week because Anna is away on Friday» — причина названа прямо в том же сообщении.',
      },
      {
        q: 'What does Maria think about working on the weekend?',
        options: ['She expects it', 'She asks him not to', 'She does not care', 'She offers to help'],
        correct: 1,
        why: '«No need to work on the weekend, please» — это просьба не делать, а не разрешение.',
      },
      {
        q: 'Where should the numbers go?',
        options: ['In the notes', 'On slide 4', 'In a separate file', 'In the email'],
        correct: 1,
        why: '«Put the numbers on slide 4, not in the notes» — и объяснение рядом: заметки никто не открывает.',
      },
    ],
  },
  {
    id: 'en-meeting-agenda',
    lang: 'en', title: 'An agenda for the weekly', level: 'A2', minutes: 2,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Weekly sync — Thursday, 11:00–11:45 CET

Please read this before the call. If a point is clear from the document, we will not discuss it.

1. Release 2.4 — status (Maria, 10 min)
2. Search filters: two options, we need a decision today (Daniil, 15 min)
3. Support tickets from last week — what keeps coming back (Tom, 10 min)
4. AOB

Not on the agenda: the new brand colours. That is a separate meeting next week.

If you cannot join, send your update in the thread and read the notes afterwards. We record the call.`,
    translation: `Еженедельная встреча — четверг, 11:00–11:45 CET

Пожалуйста, прочитайте это до созвона. Если пункт понятен из документа, обсуждать его не будем.

1. Релиз 2.4 — статус (Мария, 10 мин)
2. Фильтры поиска: два варианта, решение нужно сегодня (Даниил, 15 мин)
3. Обращения в поддержку за прошлую неделю — что повторяется (Том, 10 мин)
4. Разное

Не в повестке: новые цвета бренда. Это отдельная встреча на следующей неделе.

Если не можете быть, пришлите свой апдейт в тред и потом прочитайте заметки. Созвон записывается.`,
    glossary: [
      { term: 'agenda', ru: 'повестка встречи' },
      { term: 'weekly sync', ru: 'еженедельная встреча команды' },
      { term: 'release', ru: 'релиз, выпуск версии' },
      { term: 'decision', ru: 'решение' },
      { term: 'support ticket', ru: 'обращение в поддержку' },
      { term: 'AOB', ru: 'разное (в конце повестки)' },
      { term: 'to join', ru: 'подключиться (к встрече)' },
      { term: 'update', ru: 'краткий отчёт о ходе дел' },
    ],
    questions: [
      {
        q: 'What should you do before the call?',
        options: ['Read the agenda', 'Prepare slides', 'Write to Maria', 'Nothing'],
        correct: 0,
        why: '«Please read this before the call» — первая строка после времени, и дальше объясняется зачем.',
      },
      {
        q: 'Which point needs a decision on Thursday?',
        options: ['Release 2.4', 'The search filters', 'The support tickets', 'The brand colours'],
        correct: 1,
        why: '«Two options, we need a decision today» стоит только у пункта про фильтры.',
      },
      {
        q: 'Will the team discuss the new brand colours?',
        options: ['Yes, at the end', 'Yes, under AOB', 'No, that is a separate meeting', 'Only if there is time'],
        correct: 2,
        why: '«Not on the agenda… a separate meeting next week» — пункт вынесен намеренно.',
      },
      {
        q: 'What does AOB mean here?',
        options: ['Any other business — other topics at the end', 'A break', 'A vote', 'The name of a project'],
        correct: 0,
        why: 'AOB — стандартный последний пункт повестки: короткое «разное» на всё, что не заняло отдельной строки.',
      },
    ],
  },
  {
    id: 'en-meeting-notes',
    lang: 'en', title: 'Notes after the call', level: 'B1', minutes: 2,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Notes — weekly sync, 14 May

Decisions
• Search filters: we go with option B (one row, scrollable). Option A was clearer but did not fit on small screens.
• Release 2.4 moves to Tuesday. We would rather ship two days late than ship the payment bug.

Action items
• Daniil — update the prototype with option B — by Friday
• Maria — tell support about the new date — today
• Tom — collect the three most frequent tickets and share numbers — before the next sync

Open questions
• Do we need a separate empty state for filtered results? Nobody had a strong opinion; parked until we see the data.

Anna was not on the call and will read these notes.`,
    translation: `Заметки — еженедельная встреча, 14 мая

Решения
• Фильтры поиска: берём вариант B (одна строка с прокруткой). Вариант A был понятнее, но не помещался на маленьких экранах.
• Релиз 2.4 переносится на вторник. Лучше выпустить на два дня позже, чем выпустить с багом в оплате.

Задачи
• Даниил — обновить прототип под вариант B — до пятницы
• Мария — сообщить поддержке о новой дате — сегодня
• Том — собрать три самых частых обращения и прислать цифры — до следующей встречи

Открытые вопросы
• Нужно ли отдельное пустое состояние для отфильтрованных результатов? Ни у кого не было твёрдого мнения; отложено до данных.

Анны на созвоне не было, она прочитает эти заметки.`,
    glossary: [
      { term: 'action item', ru: 'задача с исполнителем и сроком' },
      { term: 'to go with', ru: 'остановиться на (варианте)' },
      { term: 'to ship', ru: 'выпустить, отдать пользователям' },
      { term: 'frequent', ru: 'частый' },
      { term: 'open question', ru: 'нерешённый вопрос' },
      { term: 'parked', ru: 'отложено (до времени)' },
      { term: 'strong opinion', ru: 'твёрдое мнение' },
    ],
    questions: [
      {
        q: 'Which option did the team choose, and why?',
        options: [
          'Option A, because it is clearer',
          'Option B, because it fits small screens',
          'Both, for different screens',
          'Neither — the decision was postponed',
        ],
        correct: 1,
        why: 'Вариант A назван более понятным, и всё же взяли B: решает не «красивее», а «помещается».',
      },
        {
        q: 'Why is the release late?',
        options: [
          'The team preferred two extra days to shipping a payment bug',
          'Daniil did not finish the prototype',
          'Support asked for more time',
          'The notes do not say',
        ],
        correct: 0,
        why: '«We would rather ship two days late than ship the payment bug» — сознательный выбор, а не срыв.',
      },
      {
        q: 'What must Maria do today?',
        options: ['Update the prototype', 'Tell support about the new date', 'Collect ticket numbers', 'Nothing'],
        correct: 1,
        why: 'В списке задач у каждой строки есть срок; у Марии стоит «today».',
      },
      {
        q: 'What does "parked" mean in these notes?',
        options: ['Rejected', 'Done', 'Left for later, on purpose', 'Given to another team'],
        correct: 2,
        why: 'Parked — «поставлено на стоянку»: вопрос не закрыт и не забыт, к нему вернутся, когда появятся данные.',
      },
    ],
  },
  {
    id: 'en-handover-note',
    lang: 'en', title: 'Handover before holiday', level: 'B1', minutes: 3,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Hi team,

I'm off from Monday to the 28th. Here is where everything stands.

Search filters. The prototype is done and linked in the ticket. Development starts on Wednesday — Tom knows the details and can answer questions. Please don't change the order of the filters without asking; it comes from the research, not from taste.

Onboarding copy. Waiting on legal. If they come back with changes, Maria can approve small edits. Anything that touches the pricing text should wait for me.

Usability sessions. Three are booked for the week after I'm back. The participants are confirmed, so please don't move the dates.

If something is truly urgent, Maria has my number. "Urgent" means the release is blocked — not that someone wants an opinion on a colour.

See you in two weeks,
Daniil`,
    translation: `Привет, команда!

Меня не будет с понедельника по 28-е. Вот в каком состоянии дела.

Фильтры поиска. Прототип готов, ссылка в задаче. Разработка стартует в среду — детали знает Том, вопросы к нему. Порядок фильтров, пожалуйста, не меняйте без спроса: он взят из исследования, а не из вкуса.

Тексты онбординга. Ждём юристов. Если они вернут правки, мелкие может утвердить Мария. Всё, что касается текста про цены, ждёт меня.

Юзабилити-сессии. Три встречи назначены на неделю после моего выхода. Участники подтверждены, поэтому даты не двигайте.

Если что-то действительно срочное, у Марии есть мой номер. «Срочное» — это когда встал релиз, а не когда кому-то нужно мнение о цвете.

До встречи через две недели,
Даниил`,
    glossary: [
      { term: 'handover', ru: 'передача дел' },
      { term: "I'm off", ru: 'меня не будет (в отпуске)' },
      { term: 'where everything stands', ru: 'в каком состоянии дела' },
      { term: 'ticket', ru: 'задача в трекере' },
      { term: 'waiting on', ru: 'ждём от (кого-то)' },
      { term: 'legal', ru: 'юридический отдел' },
      { term: 'to approve', ru: 'утвердить' },
      { term: 'booked', ru: 'назначено, забронировано' },
      { term: 'urgent', ru: 'срочный' },
    ],
    questions: [
      {
        q: 'Who can answer questions about the filters while Daniil is away?',
        options: ['Tom', 'Maria', 'Anna', 'Nobody'],
        correct: 0,
        why: '«Tom knows the details and can answer questions» — по каждой теме назначен свой человек, и это смысл всей записки.',
      },
      {
        q: 'Which edits can Maria approve?',
        options: ['Any changes to the copy', 'Small edits, but not the pricing text', 'Only the pricing text', 'None'],
        correct: 1,
        why: 'Мелкие правки — да; «anything that touches the pricing text should wait for me» — исключение названо отдельно.',
      },
      {
        q: 'Why should the order of the filters stay as it is?',
        options: [
          'Because it comes from research, not from personal taste',
          'Because development already started',
          'Because legal approved it',
          'Because Daniil likes it',
        ],
        correct: 0,
        why: '«It comes from the research, not from taste» — довод, который работает и без автора в чате.',
      },
      {
        q: 'What counts as urgent for Daniil?',
        options: [
          'A blocked release',
          'A question about a colour',
          'Any question from Maria',
          'Anything the team cannot decide',
        ],
        correct: 0,
        why: 'Он сам даёт определение: «Urgent means the release is blocked» — и тут же отсекает пример, который срочным не считается.',
      },
    ],
  },
  {
    id: 'en-incident-report',
    lang: 'en', title: 'What went wrong on Tuesday', level: 'B2', minutes: 3,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Incident summary — checkout unavailable, 12 March, 14:05–14:52 CET

What happened. For 47 minutes, users could add items to the basket but could not pay. The button was there; the request failed silently. Support received 31 tickets, and we saw a drop of about 400 orders compared with a normal Tuesday.

Root cause. A configuration change went out with the morning release. It was tested on staging, where the payment provider runs in test mode and returns success for everything — so the fault could not appear there.

How we found it. Not from our monitoring: the first signal was a support ticket. Our alert only fires when requests fail with an error code, and these requests returned 200.

What we are changing.
• An alert on the number of completed payments per minute, not only on error codes.
• Configuration changes get their own release, separate from features, so they are easy to roll back.
• Staging will use the provider's sandbox, which can also return failures.

This is not about who pushed the change. Anyone could have; the point is that nothing stopped it and nothing told us.`,
    translation: `Разбор инцидента — оплата недоступна, 12 марта, 14:05–14:52 CET

Что произошло. 47 минут пользователи могли складывать товары в корзину, но не могли оплатить. Кнопка была на месте, запрос молча падал. В поддержку пришёл 31 тикет, заказов стало примерно на 400 меньше, чем в обычный вторник.

Первопричина. С утренним релизом уехало изменение конфигурации. Его проверяли на стенде, где платёжный провайдер работает в тестовом режиме и на всё отвечает успехом, — там ошибка появиться не могла.

Как нашли. Не по мониторингу: первым сигналом стало обращение в поддержку. Наш алерт срабатывает, только когда запросы падают с кодом ошибки, а эти возвращали 200.

Что меняем.
• Алерт на число успешных оплат в минуту, а не только на коды ошибок.
• Изменения конфигурации выезжают отдельным релизом, без функций, — чтобы легко откатить.
• Стенд переводим на песочницу провайдера, которая умеет отвечать и отказами.

Дело не в том, кто выкатил изменение. Мог любой; смысл в том, что его ничто не остановило и никто нам не сообщил.`,
    glossary: [
      { term: 'incident', ru: 'инцидент, сбой' },
      { term: 'checkout', ru: 'оформление заказа, оплата' },
      { term: 'silently', ru: 'молча, без сообщения' },
      { term: 'drop', ru: 'падение (показателя)' },
      { term: 'root cause', ru: 'первопричина' },
      { term: 'staging', ru: 'тестовый стенд' },
      { term: 'fault', ru: 'неисправность, сбой' },
      { term: 'alert', ru: 'оповещение мониторинга' },
      { term: 'to fire', ru: 'сработать (об оповещении)' },
      { term: 'to roll back', ru: 'откатить' },
      { term: 'sandbox', ru: 'песочница' },
    ],
    questions: [
      {
        q: 'What could users still do during the incident?',
        options: ['Pay', 'Add items to the basket', 'Nothing at all', 'Only browse the help pages'],
        correct: 1,
        why: '«Could add items to the basket but could not pay» — сбой был узким, и именно поэтому его не заметили сразу.',
      },
      {
        q: 'Why did staging not catch the fault?',
        options: [
          'It was not tested there',
          'The payment provider in test mode returns success for everything',
          'Staging was down that morning',
          'The change was made after testing',
        ],
        correct: 1,
        why: 'Тест был, но среда не умела отвечать отказом — проверка ничего не проверяла.',
      },
      {
        q: 'Why did the alert stay quiet?',
        options: [
          'The failing requests returned code 200, and the alert watches error codes',
          'Nobody had set up an alert',
          'The alert was switched off during the release',
          'Support turned it off',
        ],
        correct: 0,
        why: 'Формально ошибки не было: сервер отвечал «успех». Отсюда и первая мера — считать успешные оплаты.',
      },
      {
        q: 'What is the tone of the last paragraph?',
        options: [
          'It names the person responsible',
          'It says the process failed, not a person',
          'It says nothing needs to change',
          'It blames the payment provider',
        ],
        correct: 1,
        why: '«This is not about who pushed the change… nothing stopped it and nothing told us» — разбор ищет дыру в процессе, а не виноватого.',
      },
    ],
  },
  {
    id: 'en-code-review-comments',
    lang: 'en', title: 'Comments on a draft', level: 'B1', minutes: 2,
    topic: 'Работа в команде', skill: 'Лексика',
    origin: 'original',
    body: `Comments left on the help-page draft:

Sara: "Contact us if you have any issues" — can we say what happens after they write? People want to know how long they will wait.

Sara: nit: "utilise" → "use". Same meaning, one is just heavier.

Tom: this paragraph explains how the feature works inside. Do users need that, or do they need to know what to press?

Sara: I'd cut the last sentence entirely. It repeats the title.

Maria: agreed on all of the above. @Daniil no rush — Thursday is fine.

Daniil: thanks all, will fix. Keeping "utilise" out of my life from now on.`,
    translation: `Комментарии к черновику страницы помощи:

Сара: «Contact us if you have any issues» — можно сказать, что будет после того, как напишут? Людям важно, сколько ждать ответа.

Сара: мелочь: «utilise» → «use». Смысл тот же, просто одно тяжелее.

Том: этот абзац объясняет, как функция устроена внутри. Пользователю это нужно — или ему нужно знать, что нажать?

Сара: последнее предложение я бы вырезала целиком. Оно повторяет заголовок.

Мария: со всем согласна. @Даниил не горит — четверг подойдёт.

Даниил: спасибо всем, поправлю. «Utilise» из своей жизни убираю.`,
    glossary: [
      { term: 'draft', ru: 'черновик' },
      { term: 'issue', ru: 'проблема, неполадка' },
      { term: 'nit', ru: 'мелкое замечание, придирка' },
      { term: 'heavier', ru: 'тяжелее (о слове, стиле)' },
      { term: 'to cut', ru: 'вырезать (из текста)' },
      { term: 'agreed', ru: 'согласен' },
      { term: 'no rush', ru: 'не срочно' },
    ],
    questions: [
      {
        q: 'What does Sara want to add to the contact sentence?',
        options: [
          'How long the answer will take',
          'A phone number',
          'The name of the support team',
          'A link to the pricing page',
        ],
        correct: 0,
        why: '«People want to know how long they will wait» — она просит не вежливости, а конкретного срока.',
      },
      {
        q: 'What does "nit" mean before a comment?',
        options: [
          'This is a serious problem',
          'This is a small point, fix it if you like',
          'This part must be deleted',
          'This is a question for the team',
        ],
        correct: 1,
        why: 'Пометка «nit» заранее говорит: замечание мелкое и не блокирует. Так отделяют важное от вкусового.',
      },
      {
        q: 'What is Tom really asking?',
        options: [
          'Whether the paragraph is useful to the reader',
          'Whether the feature works correctly',
          'Who wrote the paragraph',
          'Whether the title is right',
        ],
        correct: 0,
        why: 'Вопрос «do they need that, or do they need to know what to press?» — про пользу для читателя, а не про верность описания.',
      },
      {
        q: 'When does Daniil have to fix the draft?',
        options: ['Today', 'By Thursday', 'Before the release', 'There is no deadline'],
        correct: 1,
        why: '«No rush — Thursday is fine»: «не горит» здесь не значит «когда-нибудь», срок всё равно назван.',
      },
    ],
  },
]

// Корейский растёт отдельным файлом — темы для фильтра «Тема» (см. readingKo).
export const READING_LIBRARY: ReadingText[] = [...EN, ...EN_TEAMWORK, ...EN_TEXTS, ...KO, ...KO_TEXTS, ...JA, ...JA_TEXTS, ...PT, ...DE, ...DE_TEXTS, ...RU, ...RU_TEXTS, ...MORE]

/**
 * Тексты нужного языка, по возрастанию уровня.
 *
 * `subject` отсекает чужой предмет там, где язык общий: у русского и
 * литературы один langCode, и без второго аргумента полка была бы общей
 * (см. поле subject у ReadingText). Не передан — возвращается всё, как раньше:
 * так считают счётчики предметов и виджет «доза дня», которым деление ни к чему.
 */
export function textsForLang(lang: string, subject?: string): ReadingText[] {
  return READING_LIBRARY.filter(t =>
    t.lang === lang && (!subject || !t.subject || t.subject === subject))
}

/** Языки, для которых в библиотеке вообще что-то есть. */
export function langsWithTexts(): string[] {
  return [...new Set(READING_LIBRARY.map(t => t.lang))]
}
