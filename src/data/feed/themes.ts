// ─────────────────────────────────────────────────────────────────────────────
// Тема источника ленты
//
// ФАЙЛ СОБИРАЕТСЯ СКРИПТОМ. Руками не правится: `npm run check:light -- --fix`.
//
// ЗАЧЕМ. Чипсы над лентой («Наука», «Техника») раскладывают материалы по теме
// ИСТОЧНИКА, и ради одного этого поля itemTheme() держал в модуле весь реестр
// изданий — шестьсот строк с лицензиями, аватарками и адресами RSS. Реестр
// нужен там, где рисуют пост; фильтрам довольно этой таблички, и с ней
// мобильная главная больше не тянет реестр во входной чанк.
//
// Сторож (scripts/checkLightData.mjs) не даёт таблице разойтись с реестром.
// ─────────────────────────────────────────────────────────────────────────────
import type { FeedTheme } from './index'

export const OUTLET_THEME: Record<string, FeedTheme> = {
  nasa: 'science',
  "wikinews-en": 'news',
  "the-conversation": 'science',
  esa: 'science',
  noaa: 'science',
  nist: 'science',
  nsf: 'science',
  fda: 'health',
  cdc: 'health',
  doe: 'tech',
  "two-minute-papers": 'tech',
  "boston-dynamics": 'tech',
  "met-museum": 'culture',
  "mit-open": 'science',
  "cnn-yt": 'news',
  "bbc-yt": 'news',
  natgeo: 'science',
  "ted-ed": 'science',
  kurzgesagt: 'science',
  veritasium: 'science',
  vox: 'news',
  ted: 'life',
  "sbs-news": 'news',
  chimchakman: 'life',
  "korean-englishman": 'life',
  syuka: 'news',
  "mbc-ent": 'culture',
  "kbs-world": 'culture',
  "science-dream": 'science',
  "anduel-tech": 'tech',
  "knowledge-pirates": 'culture',
  "nmk-museum": 'culture',
  "sherlock-hj": 'culture',
  "ebs-docu": 'culture',
  "korea-kr-society": 'news',
  "korea-kr-culture": 'culture',
  "korea-kr-economy": 'news',
  "korea-kr-ai": 'tech',
  "korea-kr-research": 'science',
  "korea-kr-health": 'health',
  "korea-kr-chip": 'tech',
  "korea-kr-car": 'tech',
  "korea-kr-space": 'science',
  "samsung-kr": 'tech',
  "wikinews-ko": 'news',
  "ann-news": 'news',
  "kevins-room": 'life',
  "tbs-news": 'news',
  hikakin: 'life',
  "tokai-onair": 'life',
  quizknock: 'life',
  "jst-science": 'science',
  miraikan: 'science',
  kahaku: 'science',
  yobinori: 'science',
  "yuru-cs": 'tech',
  "wikinews-ja": 'news',
  "agencia-brasil": 'news',
  "sci-retold-ko": 'science',
  "sci-retold-ja": 'science',
  "sci-retold-en": 'science',
}
