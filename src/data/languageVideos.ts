// ─────────────────────────────────────────────────────────────────────────────
// Видео к юнитам языковых курсов
//
// ЗАЧЕМ. Аудит: 110 юнитов из 126 шли без единого видео. Конспект и задания
// объясняют правило, но не дают услышать язык от носителя — а для произношения,
// интонации и скорости речи это ничем не заменяется.
//
// ЖЁСТКОЕ ПРАВИЛО ЭТОГО ФАЙЛА: каждый id проверен через
// https://www.youtube.com/oembed?url=…&format=json — oembed отдаёт название и
// канал, и они сверены с темой юнита. Без этой проверки ролик сюда не попадает:
// один раз в юните про зарплату уже стоял доклад про пандемии, потому что id
// был взят из выдачи не глядя.
//
// ПОВТОРЫ НАМЕРЕННЫ. Один часовой разбор каны закрывает три юнита письменности,
// один разбор Reading — три юнита чтения. Искусственно искать «своё» видео на
// каждый юнит значит менять качество на разнообразие.
//
// ССЫЛКИ МОГУТ ПРОТУХНУТЬ. Ролики удаляют и закрывают. Проверка вынесена в
// scripts/checkVideos.mjs — прогнать перед каждым большим релизом.
// ─────────────────────────────────────────────────────────────────────────────

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`

/** Корейский: Billy Go's Beginner Korean Course + разбор формата TOPIK. */
export const KOREAN_VIDEO_EXTRA: Record<string, string> = {
  'kotp-05': yt('f83UKBquKz0'), // #11 Introducing Yourself
  'kotp-06': yt('QVbTHskzcig'), // #18 This and That
  'kotp-07': yt('k3j8rzA9rA4'), // #20 Intro to Conjugation
  'kotp-08': yt('kdDgptddf-Q'), // #42 The Past Tense
  'kotp-09': yt('k90-ZnbDyDc'), // #15 I Want
  'kotp-10': yt('KX9AA1f5c4U'), // #16 The Object Marker
  'kotp-11': yt('JBkaRNXOw-A'), // #45 The Particle 에서
  'kotp-12': yt('EtaH52lTHaM'), // #17 The Topic Marker
  'kotp-13': yt('-elpu6tsta4'), // #46 Making Negative Sentences
  'kotp-14': yt('-MtiGkvYW30'), // #25 Descriptive Verbs — там же и ㅂ/ㅡ-неправильные
  'kotp-15': yt('eSihDTEk_w8'), // #44 Question Words
  'kotp-16': yt('3vhBb-vmtZs'), // #64 Time and Date
  'kotp-17': yt('TBTnGRdSAC8'), // #61 Counting Part 1 — китайский счёт
  'kotp-18': yt('JuH-MxVFsDE'), // #63 Counting Everything — счётные слова
  'kotp-19': yt('3vhBb-vmtZs'), // #64 Time and Date — вторая половина про часы
  'kotp-20': yt('-JnnZ97WbXE'), // #99 Going Shopping
  'kotp-21': yt('zJko_EewI-0'), // #98 At the Restaurant
  'kotp-22': yt('FAPfKLxsMIU'), // #100 Finding Your Way
  'kotp-23': yt('39Utgnb5y4k'), // #43 The Future Tense
  'kotp-24': yt('poCPygDZxg0'), // #29 Can and Can't
  'kotp-25': yt('Cxu3ZB2QtWU'), // #91 I Have To
  'kotp-26': yt('MNaAPGi5Ra4'), // #37 And
  'kotp-27': yt('nHyXFpwxYTI'), // #73 If and When
  'kotp-28': yt('TNW-X_lfEqE'), // #41 Intro to Politeness Levels
  'kotp-29': yt('_0CzC8G4M3U'), // #79 Formal Korean — стиль объявлений
  'kotp-30': yt('w8YMu4glxT8'), // FunPik: TOPIK 1 Reading Level 1 #1
}

/** Японский: Japanese From Zero! (книги 1–3), кана и кандзи — отдельными разборами. */
export const JAPANESE_VIDEO_EXTRA: Record<string, string> = {
  'jajl-01': yt('6p9Il_j0zjc'), // JapanesePod101: вся хирагана за час
  'jajl-02': yt('6p9Il_j0zjc'),
  'jajl-03': yt('_wZHqOghvSs'), // JapanesePod101: хирагана + катакана
  'jajl-04': yt('8vqdVCeqL54'), // JFZ 02: Pronunciation Basics — долгота и удвоение
  'jajl-06': yt('G-IurkjH58w'), // JFZ 12B: KO-SO-A-DO
  'jajl-07': yt('0WiUjs5noCE'), // JFZ 28: Basic Verb Conjugation
  'jajl-08': yt('ba2W6rZ7-lA'), // JFZ 42: Verbs that use WO
  'jajl-09': yt('CnCyZFn1qIM'), // JFZ 29: Time and Location Particles
  'jajl-10': yt('dEkYrCCf4IU'), // JFZ 32: Existence — あります/います
  'jajl-11': yt('eRyiUPNbpsM'), // JFZ 17: Making things negative
  'jajl-12': yt('V-PKWuQui0Q'), // TOMO sensei: N5 Kanji 01 — чтения и порядок черт
  'jajl-13': yt('GJmi0BzM7fU'), // JFZ 24: Days of the Week and Years
  'jajl-14': yt('PY7X2CqZkcE'), // JFZ 15: Three Types of Adjectives
  'jajl-15': yt('NFCbjJt0qQE'), // JFZ 27: Japanese Counters
  'jajl-16': yt('ER2-vesv8NQ'), // JFZ 30: Telling Time
  'jajl-17': yt('GY1xp8uQMIE'), // JFZ 26: Asking for Things — ください
  'jajl-18': yt('GY1xp8uQMIE'), // тот же разбор ください работает и для заказа
  'jajl-19': yt('LmE45eWOXII'), // JFZ 62: By Which Means — транспорт
  'jajl-20': yt('r6xD1ocWt_M'), // JFZ 23: Past Tense DESHITA
  'jajl-21': yt('prHO8q2omXE'), // JFZ 64: て-форма
  'jajl-22': yt('7CAv6M-yIKk'), // JFZ 69: Ongoing Present — ている
  'jajl-23': yt('zu-3AThLbss'), // JFZ 79: Wanting and Not Wanting — たい
  'jajl-24': yt('PDW6eCQUxII'), // JFZ 55: Compound Sentences with から
  'jajl-25': yt('BXy--Qp0VZQ'), // JFZ 81: WHEN — たら и と
  'jajl-26': yt('VWji0HHia0E'), // Tekkin: разбор формата JLPT N5
}

/** Португальский: Speaking Brazilian Language School + разбор CELPE-Bras. */
export const PORTUGUESE_VIDEO_EXTRA: Record<string, string> = {
  'ptbr-01': yt('LQx-i1PBOPY'), // Brazilian Pronunciation in 30 minutes
  'ptbr-04': yt('sXstbqoiOEk'), // SER or ESTAR?
  'ptbr-05': yt('fkLv6azXlvU'), // How to be POLITE in Brazilian Portuguese
  'ptbr-06': yt('tIm22oMufUY'), // Gender of Words
  'ptbr-07': yt('BsMTXxCAUk0'), // Regular Verbs — Complete Lesson
  'ptbr-08': yt('rTe3P5Q2FMg'), // Verb TER
  'ptbr-09': yt('6XIvDQtrb8I'), // Basic Sentence Structure
  'ptbr-10': yt('RFwm4pOATzU'), // Numbers 0–100
  'ptbr-11': yt('n-tnTNhFJkE'), // Most common adjectives
  'ptbr-12': yt('RFwm4pOATzU'), // цены в магазине — те же числительные
  'ptbr-13': yt('JmdgR7DGmlI'), // How to order food & drink
  'ptbr-14': yt('NzUeHGZgg3w'), // Aqui, Cá, Aí, Ali or Lá — ориентиры
  'ptbr-15': yt('mRqJXAbG99Q'), // -ING FORM — герундий
  'ptbr-16': yt('T288dpRPXHQ'), // TU or VOCÊ?
  'ptbr-17': yt('ImLqQUFl2b4'), // PAST TENSE
  'ptbr-18': yt('bTDHCFODwbo'), // Perfeito vs Imperfeito
  'ptbr-19': yt('5gMrgT2pH48'), // 3 Ways to Talk About the Future
  'ptbr-20': yt('PYSoPTAOWqI'), // Pronouns
  'ptbr-21': yt('eIB5W2onjF0'), // SUBJUNTIVO
  'ptbr-22': yt('vy3igmzJ5dY'), // Foneticando: всё об экзамене CELPE-Bras
}

/** Английский для дизайнера: CareerVidz и разборы деловой переписки. */
export const ENDC_VIDEO_EXTRA: Record<string, string> = {
  'endc-02': yt('QCydftAlEn0'), // 11 powerful resume words — глаголы достижений
  'endc-04': yt('Y9Pyv-GWbmg'), // How to write a CV or resume
  'endc-07': yt('ntCDxb4TX5M'), // Cover letter that gets you hired
  'endc-08': yt('WIHEAhNqBdU'), // 3-sentence cover letter
  'endc-09': yt('fvtM-SHkc98'), // ATS-friendly resume
  'endc-10': yt('zJ1knywBYrA'), // Top 7 interview questions — скрининг
  'endc-11': yt('xIOU-8DzTY0'), // How to be a great communicator
  'endc-13': yt('uQEuo7woEEk'), // STAR interview questions & answers
  'endc-15': yt('xIOU-8DzTY0'), // тот же разбор — про слушать и уточнять
  'endc-16': yt('xIOU-8DzTY0'),
  'endc-17': yt('BD6mIshlv0I'), // Top 11 interview questions — в том числе ваши вопросы
  'endc-21': yt('aBQEIg4UMd4'), // 3-step script to negotiate your offer
  'endc-22': yt('QxM74kikM6o'), // How to introduce yourself to a new team
  'endc-26': yt('xIOU-8DzTY0'),
  'endc-27': yt('Tg_utwR43xM'), // Negotiate in English — деловой созвон
}

/** IELTS: E2 IELTS и IELTS Liz — по секциям экзамена. */
export const IELTS_VIDEO_EXTRA: Record<string, string> = {
  'ielt-01': yt('GbvcOpdaC8U'), // Stuck at 6.5? — ровно про разрыв 6 → 7
  'ielt-02': yt('UxkXXmtUmFY'), // Perfect essay introduction — перефразирование
  'ielt-03': yt('hOrES9Z1hc8'), // Advanced methods using 'IF' — условные
  'ielt-04': yt('FSdXQs3WELk'), // Band 9 vocabulary
  'ielt-05': yt('q8qmJeBxk4Q'), // IELTS Liz: Listening tips & essential information
  'ielt-06': yt('AkW0IeF46cA'), // IELTS Liz: Listening multiple choice
  'ielt-07': yt('q8qmJeBxk4Q'), // тот же разбор — вторая половина про часть 4
  'ielt-08': yt('5jrvd6Nx_qk'), // Reading: techniques and practice
  'ielt-09': yt('6X4Z_H1rDHQ'), // Reading: where your marks leak — TFNG
  'ielt-10': yt('5jrvd6Nx_qk'),
  'ielt-11': yt('6X4Z_H1rDHQ'),
  'ielt-12': yt('FVqSiFUVX78'), // Understand IELTS Writing in 25 minutes
  'ielt-13': yt('FVqSiFUVX78'),
  'ielt-14': yt('_LwCwsFDRdE'), // Task 2 essay guide: band 6 → 8+
  'ielt-15': yt('0EcpZaF8zfA'), // High score in Task 2
  'ielt-16': yt('8MdrvlVfMbI'), // How to use examples correctly
  'ielt-17': yt('39PfYf8NodA'), // Speaking: 8 techniques for any topic
  'ielt-18': yt('iT5dk3nkYfQ'), // Top 20 speaking topics with answers
  'ielt-19': yt('dHTpgdWp5tY'), // Band 7+ speaking tips
  'ielt-20': yt('US_pz_Z6GCk'), // Speaking test band 6.5 с разбором
}
