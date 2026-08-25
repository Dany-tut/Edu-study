// ─────────────────────────────────────────────────────────────────────────────
// Видео к юнитам курса «Английский: от B2 к C1»
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Аудит показал: enac был единственным курсом из
// девятнадцати вообще без видео — ни к урокам, ни в домашке. Девяносто шесть
// уроков шли текстом и заданиями, а услышать разбор конструкции от носителя
// было негде.
//
// ЖЁСТКОЕ ПРАВИЛО, ОБЩЕЕ С languageVideos.ts: каждый id проверен через
// https://www.youtube.com/oembed?url=…&format=json — oembed отдаёт название и
// канал, и они сверены с темой юнита. Ролик, чьё название не совпало с темой,
// сюда не попадает, даже если выдача поставила его первым.
//
// ЧЕМ ЗАПОЛНЕНЫ ПРОБЕЛЫ. Там, где своего ролика на тему не нашлось, стоит
// разбор соседней темы того же уровня, а не случайное видео «про английский»:
// у юнита про согласование времён — разбор backshift, у юнита про пассив —
// каузатив. Это честнее, чем оставить урок без звука, и честнее, чем поставить
// ролик не о том.
//
// ССЫЛКИ ПРОТУХАЮТ. Прогонять `node scripts/checkVideos.mjs` перед релизом.
// ─────────────────────────────────────────────────────────────────────────────

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`

/** Английский B2→C1: по ролику на юнит, все двадцать четыре. */
export const ENAC_VIDEO: Record<string, string> = {
  // Времена и повествование
  'enac-01': yt('dEtKU9Lcitc'), // Američki Centar — Past Narrative Tenses: simple, continuous, perfect, perfect continuous (B2)
  'enac-02': yt('pvoqkQHb3lo'), // BBC Learning English — Present perfect simple or continuous?
  'enac-03': yt('De_54szvmFM'), // BBC Learning English — Future tenses: present continuous, be going to, will
  'enac-04': yt('o0kkmbg2N9M'), // Spotlight on English — Backshift in reported speech (согласование времён)
  'enac-05': yt('yozQMk1FbOU'), // Espresso English — Reported Speech: Everything You Need To Know
  'enac-06': yt('nec6ozGJli0'), // mmmEnglish — Can you use REPORTED SPEECH? (глаголы речи и их модели)

  // Условные и нереальное
  'enac-07': yt('K_XikoZwM3M'), // Arnel's Everyday English — MIXED CONDITIONALS
  'enac-08': yt('6Ck87tIKr1k'), // English with Issy — C1 conditional inversions: should, were, had

  // Сложное предложение
  'enac-09': yt('ws3qsfyuCoc'), // SMASH English — Defining and Non-Defining Relative Clauses
  'enac-10': yt('147EEKjSOHw'), // Building Blocks English — Participle Clauses and Reduced Relative Clauses
  'enac-11': yt('AzNxZGC-Hg0'), // BBC English Masterclass — Inversion 1: After Negative or Limiting Adverbs
  'enac-12': yt('BECe_ok1RI8'), // BBC English Masterclass — How to use linking words in English

  // Имя: артикль, исчисляемость, сравнение
  'enac-13': yt('eCT2ZHY4rag'), // BBC Learning English — How to use the zero article with nouns
  'enac-14': yt('NgKhisW7-QY'), // ABA English — Articles, plurals, countable and uncountable nouns
  'enac-15': yt('Fr83ObluJ2A'), // engVid (James) — Modifying Comparatives: a lot, far more, much, slightly

  // Лексическая грамматика
  'enac-16': yt('yngejgA8I5g'), // British Council — Adjectives and dependent prepositions
  'enac-17': yt('8TfUB_wCpoU'), // SMASH English — Separable vs inseparable phrasal verbs
  'enac-18': yt('YhtAac_aqXc'), // Syntax English — Gerunds or infinitives: remember, forget, try, stop, regret
  'enac-19': yt('WDrjOapEy0U'), // Crown Academy of English — Verb and preposition collocations

  // Регистр, модальность, пассив, аргумент
  'enac-20': yt('b3vESZio_9A'), // English Speaking 360 — Hedging language: sound more polite and professional
  'enac-21': yt('2aaMn_5tkUA'), // how to English — Past modals of deduction: could/must/can't/might have
  'enac-22': yt('rHjoNG_XW64'), // Oxford English Now — Modals of obligation: must / have to / supposed to
  'enac-23': yt('tY8ch2SdTw8'), // BBC English Class — Have something done: the causative
  'enac-24': yt('lcTgl6-ZuiY'), // English with Issy — C1 Advanced Essay Model Answer (Cambridge)
}
