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
    topic: 'Переписка', skill: 'Аудирование', minutes: 2,
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
    topic: 'Работа в команде', skill: 'Аудирование', minutes: 1,
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

export const LISTENING_LIBRARY: ListeningItem[] = [...EN, ...KO, ...JA, ...PT]

/** Материалы нужного языка. */
export function listeningForLang(lang: string): ListeningItem[] {
  return LISTENING_LIBRARY.filter(x => x.lang === lang)
}
