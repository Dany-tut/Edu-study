// ─────────────────────────────────────────────────────────────────────────────
// Видео к юнитам курса «Английский: возвращение B2 за 14 дней» (ensp)
//
// ОТКУДА ССЫЛКИ. Курс восстановительный: он проходит те же двенадцать систем,
// что и enac, только сжато и в другом порядке. Поэтому ролики взяты из уже
// собранной и проверенной подборки ENAC_VIDEO — заводить второй раз поиск по
// тем же темам значило бы получить ролики хуже, а не разнообразнее.
// Соответствие день → тема выстроено заново: у enac двадцать четыре юнита,
// здесь четырнадцать дней, и совпадают они не порядком, а содержанием.
//
// ЖЁСТКОЕ ПРАВИЛО, ОБЩЕЕ С languageVideos.ts: каждый id проверен через
// https://www.youtube.com/oembed?url=…&format=json, название и канал сверены с
// темой дня. Все четырнадцать проверены при заведении файла.
//
// ССЫЛКИ ПРОТУХАЮТ. Прогонять `node scripts/checkVideos.mjs` перед релизом.
// ─────────────────────────────────────────────────────────────────────────────

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`

/** По ролику на каждый из четырнадцати дней. */
export const ENSP_VIDEO: Record<string, string> = {
  // Перфект — три точки отсчёта (дни 1–3)
  'ensp-15': yt('pvoqkQHb3lo'), // BBC Learning English — Present perfect simple or continuous?
  'ensp-2':  yt('dEtKU9Lcitc'), // Američki Centar — Past Narrative Tenses: simple, continuous, perfect
  'ensp-16': yt('K_XikoZwM3M'), // Arnel's Everyday English — Mixed conditionals (had + V3 в нереальном прошлом)

  // Ядро глагола и имени (дни 4–6)
  // День 4 делит ролик со вторым: разбор охватывает simple, continuous и
  // перфект вместе, и на дне вида он работает так же, как на дне перфекта.
  'ensp-1':  yt('dEtKU9Lcitc'), // Past Narrative Tenses — simple против continuous
  'ensp-4':  yt('NgKhisW7-QY'), // ABA English — Articles, plurals, countable and uncountable nouns
  'ensp-8':  yt('tY8ch2SdTw8'), // BBC English Class — Have something done: the causative

  // Нереальность и будущее (дни 7–8)
  // День 7 делит ролик с третьим намеренно: та же конструкция, показанная
  // второй раз через четыре дня, — это и есть виток курса, а не небрежность.
  'ensp-7':  yt('K_XikoZwM3M'), // Arnel's Everyday English — Mixed conditionals
  'ensp-3':  yt('De_54szvmFM'), // BBC Learning English — Future tenses: present continuous, be going to, will

  // Служебное, чужие слова и сборка (дни 9–14)
  'ensp-11': yt('8TfUB_wCpoU'), // SMASH English — Separable vs inseparable phrasal verbs
  'ensp-5':  yt('2aaMn_5tkUA'), // how to English — Past modals of deduction: must/can't/might have
  'ensp-10': yt('nec6ozGJli0'), // mmmEnglish — Can you use REPORTED SPEECH? (глаголы речи и их модели)
  'ensp-6':  yt('YhtAac_aqXc'), // Syntax English — Gerunds or infinitives: remember, forget, try, stop
  'ensp-13': yt('BECe_ok1RI8'), // BBC English Masterclass — How to use linking words in English
  'ensp-14': yt('b3vESZio_9A'), // English Speaking 360 — Hedging: sound more polite and professional
}
