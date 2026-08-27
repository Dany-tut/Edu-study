// ─────────────────────────────────────────────────────────────────────────────
// Лента: то, что носители языка написали и сняли на этой неделе
//
// ЗАЧЕМ ЭТО ОТДЕЛЬНО ОТ readingLibrary И ОТ scenes
//
// У трёх видов чтения три разных мотива, и подменять один другим нельзя.
// Учебный текст выбирают фильтром («A2, работа, три минуты») — он под уровень.
// Сцену выбирают по обложке и по тому, читал ли ты это раньше — она про
// знакомый сюжет. Ленту НЕ ВЫБИРАЮТ ВООБЩЕ: её открывают сверху, потому что
// сегодня там другое, чем вчера. Это единственный блок тренажёра, который
// обновляется сам, и в этом весь его продукт.
//
// Отсюда и устройство витрины: не фильтры и не полки, а дни. Дата — главный
// признак материала, всё остальное вторично.
//
// ТРИ ДОРОЖКИ, И ОНИ ПРО ПРАВО, А НЕ ПРО ЖАНР
//
// Что именно попадает на экран, определяется не тем, интересный ли материал, а
// тем, что нам разрешено показать. Отсюда `lane` — он же цветная полоска у
// левого края карточки:
//
//   'free'  — ЗЕЛЁНАЯ. Настоящий текст целиком: общественное достояние
//             (работы федеральных агентств США) или свободная лицензия
//             (CC BY, CC BY-SA, KOGL). Единственная дорожка, где слово
//             «оригинал» на экране означает оригинал.
//   'embed' — СИНЯЯ. Чужой плеер: ролик или пост живёт в виджете площадки.
//             Встраивание — штатная функция сервиса, автор получает просмотр,
//             мы ничего не копируем. Вопросы и словарь наши, поверх.
//   'link'  — СЕРАЯ. Крупная пресса. Заголовок, пара строк и ссылка — этого
//             достаточно для витрины и не больше того, что отдаёт RSS. Читать
//             при этом дают НАШ текст о том же событии: факты события свободны,
//             чужие формулировки — нет.
//
// Четвёртой корзины («ну это же для учёбы») не существует. Некоммерческое
// использование чужого текста — всё равно использование.
//
// ЖИВЫЕ ИСТОЧНИКИ И АРХИВЫ — РАЗНЫЕ ВЕЩИ, И ЭТО ВИДНО В МОДЕЛИ
//
// Викиновости, на которых держался весь замысел зелёной дорожки, закрыты
// Фондом Викимедиа 4 мая 2026 года: все языковые разделы переведены в
// read-only. Тексты остались и лицензия осталась (CC BY-SA), но новых не будет
// никогда. То же с VOA Learning English — последняя публикация в апреле 2025-го.
//
// Поэтому у источника есть `status`: 'live' — из него можно тянуть свежее,
// 'archive' — это склад готовых текстов. Лента строится из обоих, но день
// «сегодня» наполняют только живые, и если однажды живых не останется, это
// должно быть видно в коде, а не выясняться по пустому экрану.
//
// ЛЕНИВАЯ ЗАГРУЗКА. Как у сцен и разговорников: здесь синхронный реестр
// источников и счётчики (по ним рисуется сегмент «Лента» и бейдж режима ещё до
// загрузки), а сами материалы едут чанком на язык.
// ─────────────────────────────────────────────────────────────────────────────

import { Cpu, FlaskConical, HeartPulse, LayoutGrid, Leaf, Newspaper, Palette, Play, type LucideIcon } from 'lucide-react'
import type { ReadingText } from '../readingLibrary'
import type { Age } from '../scenes'

// ─── Модель ──────────────────────────────────────────────────────────────────

/** Правовая дорожка. Определяет, что именно видно на экране. */
export type Lane = 'free' | 'embed' | 'link'

/** Живой источник или замороженный архив. */
export type Status = 'live' | 'archive'

/**
 * Род источника. Нужен для фильтра в рейле («Пресса / Видео / Компании»), а не
 * для красоты: пресс-релиз компании и заметка агентства читаются по-разному, и
 * человек, которому нужен деловой язык, хочет отсеять остальное.
 */
export type OutletKind = 'agency' | 'science' | 'company' | 'gov' | 'press' | 'video' | 'post'

/**
 * О ЧЁМ ИСТОЧНИК. Это НЕ род (`kind`) и не дорожка (`lane`): по роду половина
 * ленты — «video», потому что и музей, и вечерние новости, и разбор статьи по
 * ИИ живут на YouTube. Роду всё равно, о чём ролик, а листающему — нет.
 *
 * ПОЧЕМУ У ИСТОЧНИКА, А НЕ У МАТЕРИАЛА. Поле `topic` у ReadingText заполняет
 * ночная сборка по рубрике фида, и там 80 материалов из 130 — «Технологии и
 * медиа»: рубрика источника новостей общего профиля ничего не различает.
 * Канал же про своё: 국립중앙박물관 — про музей и завтра, и через год. Поэтому
 * тема живёт в реестре, где её ставит человек, а `topic` остаётся тем, чем был
 * — подписью материала.
 */
export type FeedTheme = 'news' | 'science' | 'tech' | 'culture' | 'life' | 'health'

export interface Outlet {
  id: string
  /** Как подписан на карточке. */
  name: string
  /** Язык материалов: en, ko, ja, pt-BR. */
  lang: string
  lane: Lane
  kind: OutletKind
  /** О чём этот источник — по нему собран ряд фильтров над лентой. */
  theme: FeedTheme
  /**
   * Правовое основание — ОДНОЙ СТРОКОЙ И ПО-ЧЕЛОВЕЧЕСКИ. Показывается ученику
   * рядом с текстом. Пустой строки здесь быть не может: если основание нельзя
   * сформулировать, материал не показываем.
   */
  license: string
  home: string
  status: Status
  /**
   * Откуда скрипт сборки тянет свежее: RSS или точка API. Только у 'live'.
   * У архивов не заполняется — тянуть больше нечего.
   */
  feed?: string
  /** Что это за источник и зачем он в ленте. Одна строка для рейла. */
  note: string
  /**
   * Аватарка источника — то, что стоит слева от имени в шапке поста.
   *
   * Не логотип: чужие логотипы это чужие товарные знаки, и тянуть их картинкой
   * с сайта источника значит грузить чужой хост на каждый пост. Поэтому знак
   * рисуем сами — одна-две буквы алфавита источника в кружке его цвета.
   * Читается так же, как аватарка канала в мессенджере, и ничего не стоит.
   */
  mark: string
  /** Цвет кружка. Литеральный hex — как в палитре предметов. */
  tint: string
}

/**
 * Материал ленты — это ReadingText плюс то, что делает его новостью.
 *
 * Наследование не ради экономии типов: заметка проходит через ТУ ЖЕ читалку,
 * тот же словарь по клику и ту же запись результата, что учебный текст и сцена.
 * Второй читалки быть не должно — она разойдётся с первой на первой же правке.
 */
export interface FeedItem extends ReadingText {
  outletId: string
  /** Дата публикации, ISO (YYYY-MM-DD). По ней лента режется на дни. */
  date: string
  lane: Lane
  /** Ссылка на оригинал. Обязательна на всех дорожках без исключения. */
  url: string
  /**
   * Автор или авторы. У CC BY и CC BY-SA атрибуция — условие лицензии, а не
   * вежливость: без неё показывать текст нельзя.
   */
  byline?: string
  /**
   * Что за текст лежит в body.
   * 'verbatim' — настоящий текст источника, слово в слово.
   * 'ours'     — наш текст о том же событии (серая дорожка и адаптации).
   * Пометка честная и видна ученику: он должен знать, читает он NASA или нас.
   */
  textOrigin: 'verbatim' | 'ours'
  age: Age
  /**
   * Перевод ЗАГОЛОВКА. Живёт рядом с `translation` (перевод тела) и по той же
   * причине: в ленте перевод показывается ВМЕСТО оригинала, а не под ним, и
   * пост с русским текстом под корейским заголовком — половина перевода.
   *
   * У ролика тела нет вовсе: там заголовок — единственный текст, и без этого
   * поля переводить у видео было бы нечего.
   */
  titleTranslation?: string
  /**
   * ВОПРОСЫ В ЛЕНТЕ НЕ ПОКАЗЫВАЮТСЯ. Поле досталось от ReadingText и остаётся
   * заполненным: материал ленты — законный кандидат в домашку и в «Тексты», и
   * выбрасывать уже написанные вопросы, чтобы через месяц писать их заново,
   * было бы расточительством. Но сама лента — это то, что листают: проверка
   * понимания там мешает ровно тому, ради чего в неё заходят.
   */
  /**
   * Ролик или пост, если материал живёт в чужом плеере (дорожка 'embed').
   * Взаимоисключает body-как-текст: там, где есть плеер, читать нечего.
   */
  embed?: { kind: 'youtube' | 'post'; id: string }
  /**
   * ОДИН МАТЕРИАЛ НА НЕСКОЛЬКИХ УРОВНЯХ. Научная статья написана для коллег, и
   * ученику она недоступна не из-за темы, а из-за языка: галактики понятны и на
   * втором году, а «angular sampling trade-off» — нет. Поэтому текст
   * пересказывается несколько раз, от простого к сложному, и переключается
   * прямо в посте.
   *
   * ЭТО НАШ ТЕКСТ, А НЕ ПЕРЕВОД ЧУЖОГО. Пересказ — производное произведение, и
   * делать его можно только с материалов, где это разрешено: общественное
   * достояние (NASA, NIST, NSF) и KOGL 제1유형. У CC BY-ND (The Conversation)
   * НЕЛЬЗЯ — там прямой запрет на переработку. Отсюда `textOrigin: 'ours'` и
   * `credit` с названием исходного материала: ученик должен знать, что читает
   * наш пересказ, а не NASA.
   *
   * Первый уровень в списке — тот, что показывается сразу, и он же лежит в
   * `body`: всё остальное (озвучка, словарь, «Ещё») работает с `body` и не
   * должно знать про уровни.
   */
  levels?: { level: string; body: string; minutes: number }[]
}

// ─── Реестр источников ───────────────────────────────────────────────────────
//
// Синхронный и лёгкий: фильтры и подписи рисуются сразу, ещё до того, как
// приедет хоть один материал.
//
// ПРОВЕРЕНО ЗАПРОСОМ 22.08.2026. Ниже стоят только те источники, чей фид в этот
// день реально ответил. «Кажется, у них есть RSS» проверкой не является: у
// половины кандидатов адреса из памяти отдали 404, а два раздела, на которых
// строился первоначальный план, оказались закрыты.

export const OUTLETS: Outlet[] = [
  // ── Английский ─────────────────────────────────────────────────────────────
  {
    id: 'nasa',
    name: 'NASA', lang: 'en', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.nasa.gov/news/',
    feed: 'https://www.nasa.gov/news-release/feed/',
    note: 'Пресс-релизы о полётах и наблюдениях. Свободны от авторского права полностью, включая фотографии.',
    mark: 'NA', tint: '#2C5AA0',
  },
  {
    id: 'wikinews-en',
    name: 'Викиновости', lang: 'en', lane: 'free', kind: 'agency', theme: 'news', status: 'archive',
    license: 'CC BY-SA 2.5 — свободная лицензия, нужна атрибуция',
    home: 'https://en.wikinews.org/',
    note: 'Архив: раздел закрыт 4 мая 2026 года и переведён в режим только для чтения.',
    mark: 'W', tint: '#4B6A88',
  },

  {
    id: 'the-conversation',
    name: 'The Conversation', lang: 'en', lane: 'free', kind: 'agency', theme: 'science', status: 'live',
    license: 'CC BY-ND 4.0 — перепечатка разрешена самим изданием',
    home: 'https://theconversation.com/us',
    feed: 'https://theconversation.com/us/articles.atom',
    note: 'Учёные пишут для широкой публики: медицина, климат, история, образование. Издание само просит перепечатывать.',
    mark: 'TC', tint: '#D8352A',
  },
  {
    id: 'esa',
    name: 'ESA', lang: 'en', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'CC BY-SA 3.0 IGO — свободная лицензия агентства',
    home: 'https://www.esa.int/',
    feed: 'https://www.esa.int/rssfeed/Our_Activities/Space_Science',
    note: 'Европейское космическое агентство: запуски, снимки, миссии.',
    mark: 'ESA', tint: '#003247',
  },
  {
    id: 'noaa',
    name: 'NOAA', lang: 'en', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.noaa.gov/news',
    feed: 'https://www.noaa.gov/rss.xml',
    note: 'Океан, атмосфера, погода и климат. Простой английский о том, что видно из окна.',
    mark: 'NO', tint: '#0A5A8C',
  },
  {
    id: 'nist',
    name: 'NIST', lang: 'en', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.nist.gov/news-events/news',
    feed: 'https://www.nist.gov/news-events/news/rss.xml',
    note: 'Институт стандартов: измерения, материалы, кибербезопасность и правила для искусственного интеллекта.',
    mark: 'NI', tint: '#1B3F94',
  },
  {
    id: 'nsf',
    name: 'NSF', lang: 'en', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.nsf.gov/news',
    feed: 'https://www.nsf.gov/rss/rss_www_news.xml',
    note: 'Национальный научный фонд: чем заняты лаборатории, которые он финансирует, — от антарктического льда до квантовых компьютеров.',
    mark: 'NSF', tint: '#0C6E8F',
  },
  {
    id: 'fda',
    name: 'FDA', lang: 'en', lane: 'free', kind: 'gov', theme: 'health', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.fda.gov/news-events/fda-newsroom/press-announcements',
    feed: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    note: 'Что разрешили в медицине на этой неделе: новые препараты, приборы, тесты. Короткие тексты про вещи, которые завтра окажутся в больнице.',
    mark: 'FDA', tint: '#1B6E8C',
  },
  {
    id: 'cdc',
    name: 'CDC', lang: 'en', lane: 'free', kind: 'gov', theme: 'health', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.cdc.gov/media/',
    feed: 'https://tools.cdc.gov/api/v2/resources/media/132608.rss',
    note: 'Центр по контролю заболеваний: вспышки, прививки, здоровье населения. Язык нарочно простой — тексты рассчитаны на всех.',
    mark: 'CDC', tint: '#2F6E5B',
  },
  {
    id: 'doe',
    name: 'U.S. Dept. of Energy', lang: 'en', lane: 'free', kind: 'gov', theme: 'tech', status: 'live',
    license: 'Общественное достояние — работы федерального агентства США',
    home: 'https://www.energy.gov/articles',
    feed: 'https://www.energy.gov/rss/articles.xml',
    note: 'Энергетика и то, что к ней прилипло: сети, батареи, ядерная физика, суперкомпьютеры.',
    mark: 'DOE', tint: '#1B3F94',
  },
  {
    id: 'two-minute-papers',
    name: 'Two Minute Papers', lang: 'en', lane: 'embed', kind: 'video', theme: 'tech', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@TwoMinutePapers',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg',
    note: 'Разбор свежих статей по ИИ и графике за пять минут: что научились делать нейросети на этой неделе.',
    mark: '2MP', tint: '#6B4FBB',
  },
  {
    id: 'boston-dynamics',
    name: 'Boston Dynamics', lang: 'en', lane: 'embed', kind: 'video', theme: 'tech', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@BostonDynamics',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7vVhkEfw4nOGp8TyDk7RcQ',
    note: 'Роботы Atlas и Spot в работе. Ролики короткие, речь простая — хороший вход в технический английский.',
    mark: 'BD', tint: '#0F5C4C',
  },
  {
    id: 'met-museum',
    name: 'The Met', lang: 'en', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@metmuseum',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCDlz9C2bhSW6dcVn_PO5mYw',
    note: 'Музей Метрополитен рассказывает о своих вещах: живопись, костюм, музыкальные инструменты, археология.',
    mark: 'MET', tint: '#B0243B',
  },
  {
    id: 'mit-open',
    name: 'MIT Open Learning', lang: 'en', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@mitocw',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCN0QBfKk0ZSytyX_16M11fA',
    note: 'Короткие объяснения от преподавателей MIT: клетки, единицы измерения, материалы.',
    mark: 'MIT', tint: '#8A1538',
  },
  {
    id: 'cnn-yt',
    name: 'CNN', lang: 'en', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@CNN',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCupvZG-5ko_eiXAupbDfxWw',
    note: 'Американский новостной английский: дикторы, репортажи, интервью.',
    mark: 'CNN', tint: '#CC0000',
  },
  {
    id: 'bbc-yt',
    name: 'BBC News', lang: 'en', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@BBCNews',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC16niRr50-MSBwiO3YDb3RA',
    note: 'Британское произношение и вторая половина того английского, который сдают на IELTS.',
    mark: 'BBC', tint: '#1F1F1F',
  },
  {
    id: 'natgeo',
    name: 'National Geographic', lang: 'en', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@NatGeo',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpVm7bg6pXKo1Pr6k5kxG9A',
    note: 'Природа и путешествия: закадровый голос, размеренная речь, много конкретных существительных.',
    mark: 'NG', tint: '#FFCC00',
  },
  {
    id: 'ted-ed',
    name: 'TED-Ed', lang: 'en', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@TEDEd',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsooa4yRKGN_zEE8iknghZA',
    note: 'Пятиминутные объяснения с рисунками. Самое понятное на слух из всего английского здесь.',
    mark: 'TE', tint: '#C4302B',
  },
  {
    id: 'kurzgesagt',
    name: 'Kurzgesagt', lang: 'en', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@kurzgesagt',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsXVk37bltHxD1rDPwtNM8Q',
    note: 'Наука с анимацией: чёткая дикция и картинка, которая объясняет вместе со словами.',
    mark: 'KG', tint: '#E5643E',
  },
  {
    id: 'veritasium',
    name: 'Veritasium', lang: 'en', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@veritasium',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHnyfMqiRRG1u-2MsSQLbXA',
    note: 'Физика и опыты, живая разговорная подача — речь быстрее, чем у диктора.',
    mark: 'V', tint: '#2E6EA6',
  },
  {
    id: 'vox',
    name: 'Vox', lang: 'en', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@Vox',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCLXo7UDZvByw2ixzpQCufnA',
    note: 'Объяснительная журналистика: карты, графики и быстрый американский английский.',
    mark: 'VOX', tint: '#FFF100',
  },
  {
    id: 'ted',
    name: 'TEDx Talks', lang: 'en', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@TEDx',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCAuUUnT6oDeKwE6v1NGQxug',
    note: 'Один спикер, один тезис, живая академическая речь. Смотрим в плеере канала, вопросы наши.',
    mark: 'TX', tint: '#C4302B',
  },

  // ── Корейский ──────────────────────────────────────────────────────────────
  {
    id: 'sbs-news',
    name: 'SBS 뉴스', lang: 'ko', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@SBSNews8',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCkinYTS9IHqOEwR1Sze2JTw',
    note: 'Выпуски 8뉴스: дикторская речь, репортажи с улицы, погода. Обновляется несколько раз в день.',
    mark: 'SBS', tint: '#0F4CA8',
  },
  {
    id: 'chimchakman',
    name: '침착맨', lang: 'ko', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@ChimChakMan_Official',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCUj6rrhMTR9pipbAWBAMvUQ',
    note: 'Разговорный корейский без диктора: перебивают, сокращают, шутят. То, чего нет ни в учебнике, ни в новостях.',
    mark: '침', tint: '#3F5F8C',
  },
  {
    id: 'korean-englishman',
    name: '영국남자', lang: 'ko', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@KoreanEnglishman',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCg-p3lQIqmhh7gHpyaOmOiQ',
    note: 'Британцы пробуют Корею: два языка в кадре и субтитры на обоих. Самое лёгкое из живой речи.',
    mark: '영', tint: '#B33A3A',
  },
  {
    id: 'syuka',
    name: '슈카월드', lang: 'ko', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@syukaworld',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsJ6RuBiTVWRX156FVbeaGg',
    note: 'Объясняет, как устроены деньги и рынки, — быстрым разговорным корейским, у доски.',
    mark: '슈', tint: '#2E7D6B',
  },
  {
    id: 'mbc-ent',
    name: 'MBC 예능', lang: 'ko', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@MBCentertainment',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCiBr0bK06imaMbLc8sAEz0A',
    note: 'Варьете: несколько человек говорят одновременно, поверх — подписи крупными буквами.',
    mark: 'MBC', tint: '#1B4FA0',
  },
  {
    id: 'kbs-world',
    name: 'KBS WORLD TV', lang: 'ko', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@KBSWORLDTV',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC5BMQOsAB8hKUyHu9KI6yig',
    note: 'Travel- и варьете-шоу с субтитрами: канал специально делает их для тех, кто смотрит из-за границы.',
    mark: 'KBS', tint: '#0B57A4',
  },
  {
    id: 'science-dream',
    name: '과학드림', lang: 'ko', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@ScienceDream',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCIk1-yPCTnFuzfgu4gyfWqw',
    note: 'Научпоп по-корейски: эволюция, динозавры, космос. Дикция ровная, на экране всегда есть картинка к слову.',
    mark: '과학', tint: '#1E7A5A',
  },
  {
    id: 'anduel-tech',
    name: '안될공학', lang: 'ko', lane: 'embed', kind: 'video', theme: 'tech', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@Unrealscience',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCeN2YeJcBCRJoXgzF_OU3qw',
    note: 'ИТ и техника: чипы, батареи, искусственный интеллект. Тот словарь, который в учебниках не встретишь.',
    mark: '공학', tint: '#2B4C7E',
  },
  {
    id: 'knowledge-pirates',
    name: '지식해적단', lang: 'ko', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@Piratesofknowledge',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC9cCBxBAQW2CzLYeT20q49A',
    note: 'История и культура рассказом: откуда взялись вещи, страны и привычки.',
    mark: '지식', tint: '#7A4A2B',
  },
  {
    id: 'nmk-museum',
    name: '국립중앙박물관', lang: 'ko', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@nationalmuseumofkorea',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7Pc7sflxGNdgh-ep_jlbEg',
    note: 'Национальный музей Кореи о своих залах и находках. Речь музейная — медленная и внятная.',
    mark: '박물', tint: '#6B5B3E',
  },
  {
    id: 'sherlock-hj',
    name: '셜록현준', lang: 'ko', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@Sherlock_HJ',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC7uDyFIqExDnfXAIZqumFrQ',
    note: 'Архитектор разбирает дома, города и вещи: почему это выглядит именно так.',
    mark: '건축', tint: '#B06A28',
  },
  {
    id: 'ebs-docu',
    name: 'EBS 다큐', lang: 'ko', lane: 'embed', kind: 'video', theme: 'culture', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@EBSDocumentary',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCFCtZJTuJhE18k8IXwmXTYQ',
    note: 'Документальные фильмы государственного образовательного канала: наука, природа, общество.',
    mark: 'EBS', tint: '#1D5FA8',
  },
  // ── Корейский: текст, а не плеер ───────────────────────────────────────────
  //
  // KOGL (공공누리) — государственная лицензия Кореи. Первый тип, «출처표시»,
  // разрешает всё при указании источника, и в корейском это единственная
  // законная возможность показать НАСТОЯЩИЙ текст целиком: Викиновости закрыты,
  // у прессы лицензии нет, а живых корейских фидов со свободным текстом больше
  // нет вообще. До этих двух источников корейская лента состояла из одних
  // роликов — читать в ней было нечего.
  //
  // Лицензия покрывает ТОЛЬКО ТЕКСТ: фотографии на korea.kr в большинстве
  // чужие, и это написано на самой странице заметки. Поэтому картинок отсюда
  // не берём ни одной, а метку 공공누리 제1유형 сборка проверяет у КАЖДОЙ
  // заметки: в тех же списках рядом лежат колонки сторонних редакций.
  {
    id: 'korea-kr-society',
    name: '정책브리핑 · 사회', lang: 'ko', lane: 'free', kind: 'gov', theme: 'news', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/news/policyNewsList.do?smenu=EDS02',
    note: 'Школа, транспорт, жильё, здоровье — о чём государство говорит с людьми каждый день. Газетный корейский без жаргона.',
    mark: '사회', tint: '#1F5FA8',
  },
  {
    id: 'korea-kr-culture',
    name: '정책브리핑 · 문화', lang: 'ko', lane: 'free', kind: 'gov', theme: 'culture', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/news/policyNewsList.do?smenu=EDS03',
    note: 'Выставки, парки, фестивали, туризм и наследие: тот же язык, но про то, куда пойти и что посмотреть.',
    mark: '문화', tint: '#7A4FA3',
  },
  {
    id: 'korea-kr-economy',
    name: '정책브리핑 · 경제', lang: 'ko', lane: 'free', kind: 'gov', theme: 'news', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/news/policyNewsList.do?smenu=EDS01',
    note: 'Деньги на исследования, правила для искусственного интеллекта, цифровые сервисы. Язык отчётный — зато это единственный корейский текст про науку, который разрешено показывать целиком.',
    mark: '경제', tint: '#2F6E5B',
  },
  // ── Наука ежедневно: пресс-релизы ведомств ─────────────────────────────────
  //
  // Отдельного научного раздела у 정책브리핑 нет, но есть 보도자료 всех
  // министерств — и поиск по ним работает обычной ссылкой. Три темы вместо
  // одной: одно слово отдаёт двадцать релизов, до ленты доезжают четыре, и в
  // узкой теме они были бы про одно совещание.
  //
  // Показывается ЛИД из списка, а не документ: тела на странице нет вовсе —
  // там вьюер сконвертированного HWP. Лид — два-три предложения того же
  // текста и той же лицензии.
  {
    id: 'korea-kr-ai',
    name: '보도자료 · 인공지능', lang: 'ko', lane: 'free', kind: 'gov', theme: 'tech', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/briefing/pressReleaseList.do?srchWord=%EC%9D%B8%EA%B3%B5%EC%A7%80%EB%8A%A5',
    note: 'Что государство делает с искусственным интеллектом: стандарты, правила, совместные проекты. Свежие релизы каждый день.',
    mark: 'AI', tint: '#3B5BC0',
  },
  {
    id: 'korea-kr-research',
    name: '보도자료 · 연구개발', lang: 'ko', lane: 'free', kind: 'gov', theme: 'science', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/briefing/pressReleaseList.do?srchWord=%EC%97%B0%EA%B5%AC%EA%B0%9C%EB%B0%9C',
    note: 'Исследования и разработки: что финансируют, что испытали, что построили — от лесной экологии до гибридных самолётов.',
    mark: '연구', tint: '#1E7A5A',
  },
  {
    id: 'korea-kr-health',
    name: '보도자료 · 건강', lang: 'ko', lane: 'free', kind: 'gov', theme: 'health', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/briefing/pressReleaseList.do?srchWord=%EA%B1%B4%EA%B0%95',
    note: 'Здоровье и медицина: что меняется в больницах, чем болеют, что проверяют. Лексика тут самая ходовая из всех научных тем.',
    mark: '건강', tint: '#2F7A4F',
  },
  {
    id: 'korea-kr-chip',
    name: '보도자료 · 반도체', lang: 'ko', lane: 'free', kind: 'gov', theme: 'tech', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/briefing/pressReleaseList.do?srchWord=%EB%B0%98%EB%8F%84%EC%B2%B4',
    note: 'Чипы, память, платы и заводы, которые их делают. Тема, на которой держится половина корейской экономики, — и половина новостей.',
    mark: '반도', tint: '#3B5BC0',
  },
  {
    id: 'korea-kr-car',
    name: '보도자료 · 전기차', lang: 'ko', lane: 'free', kind: 'gov', theme: 'tech', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/briefing/pressReleaseList.do?srchWord=%EC%A0%84%EA%B8%B0%EC%B0%A8',
    note: 'Машины: электромобили, зарядки, безопасность, испытания. Слово 전기차 тянет за собой весь транспорт.',
    mark: '전기', tint: '#7A4A2B',
  },
  {
    id: 'korea-kr-space',
    name: '보도자료 · 우주', lang: 'ko', lane: 'free', kind: 'gov', theme: 'science', status: 'live',
    license: 'KOGL 제1유형 (공공누리,출처표시) — свободное использование при указании источника, только текст',
    home: 'https://www.korea.kr/briefing/pressReleaseList.do?srchWord=%EC%9A%B0%EC%A3%BC',
    note: 'Космос: запуски «Нури», спутники «Чхоллиан», работа Корейского космического агентства.',
    mark: '우주', tint: '#2B3A6B',
  },
  {
    id: 'samsung-kr',
    name: 'Samsung Newsroom', lang: 'ko', lane: 'link', kind: 'company', theme: 'tech', status: 'live',
    license: 'Заголовок и ссылка. Текст на экране — наш: лицензии на перепечатку у ньюсрума нет',
    home: 'https://news.samsung.com/kr/',
    feed: 'https://news.samsung.com/kr/feed',
    note: 'Деловой корейский, на котором говорят на работе: канцелярит, вежливые формы, числа и даты.',
    mark: 'S', tint: '#1428A0',
  },
  {
    id: 'wikinews-ko',
    name: '위키뉴스', lang: 'ko', lane: 'free', kind: 'agency', theme: 'news', status: 'archive',
    license: 'CC BY-SA 2.5 — свободная лицензия, нужна атрибуция',
    home: 'https://ko.wikinews.org/',
    note: 'Архив на 827 заметок. Короткие сообщения о событиях — ровно тот формат, который нужен для чтения на уровне.',
    mark: '위', tint: '#4B6A88',
  },

  // ── Японский ───────────────────────────────────────────────────────────────
  {
    id: 'ann-news',
    name: 'ANNニュース', lang: 'ja', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@ANNnewsCH',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCGCZAYq5Xxojl_tSXcVJhiQ',
    note: 'Новости телеканала «Асахи». У сюжетов в описании лежит расшифровка — по ней и пишутся вопросы.',
    mark: 'ANN', tint: '#1F6FB2',
  },
  {
    id: 'kevins-room',
    name: "Kevin's English Room", lang: 'ja', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@kevinsenglishroom',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCFbp2XdRpKfk7mYt_uT8dxw',
    note: 'Японцы говорят про английский по-японски: два языка в кадре и темп ниже обычного. Лучший вход в живую речь.',
    mark: 'KER', tint: '#2E6E8E',
  },
  {
    id: 'tbs-news',
    name: 'TBS NEWS DIG', lang: 'ja', lane: 'embed', kind: 'video', theme: 'news', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@tbsnewsdig',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC6AG81pAkf6Lbi_1VC5NmPA',
    note: 'Дикторская речь и репортажи. Эталон произношения, но не того японского, на котором говорят между собой.',
    mark: 'TBS', tint: '#1F4E9C',
  },
  {
    id: 'hikakin',
    name: 'HikakinTV', lang: 'ja', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@HikakinTV',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZf__ehlCEBPop-_sldpBUQ',
    note: 'Самый известный японский влогер: бытовые слова, короткие фразы и много крупных подписей на экране.',
    mark: 'HK', tint: '#D24B3A',
  },
  {
    id: 'tokai-onair',
    name: '東海オンエア', lang: 'ja', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@TokaiOnAir',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCutJqz56653xV2wwSvut_hQ',
    note: 'Шестеро друзей и их затеи. Перебивают друг друга, говорят на диалекте — самое трудное и самое настоящее здесь.',
    mark: '東', tint: '#3E8E5A',
  },
  {
    id: 'quizknock',
    name: 'QuizKnock', lang: 'ja', lane: 'embed', kind: 'video', theme: 'life', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@QuizKnock',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCQ_MqAw18jFTlBB-f8BP7dw',
    note: 'Выпускники Токийского университета решают задачи вслух: чёткая речь и объяснения, которые сами по себе учебник.',
    mark: 'QK', tint: '#2B7CB8',
  },
  {
    id: 'jst-science',
    name: 'サイエンスチャンネル', lang: 'ja', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@sciencechannel',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCHpFyLQgg4h9VZuFyby7RbQ',
    note: 'Официальный научный канал японского агентства JST: лаборатории, приборы, эксперименты.',
    mark: 'SC', tint: '#1B6E8C',
  },
  {
    id: 'miraikan',
    name: '日本科学未来館', lang: 'ja', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@miraikan',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCdBvq7IgL4U6u3CzeZaeoFg',
    note: 'Музей будущего в Токио: роботы, ИИ, космос. Речь экскурсоводская — рассчитана на то, чтобы понял любой.',
    mark: '未来', tint: '#2F5FA8',
  },
  {
    id: 'kahaku',
    name: '国立科学博物館', lang: 'ja', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@kahaku',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCYvB5iWkIf6uMeA9fPS__sw',
    note: 'Национальный музей природы и науки: скелеты, минералы, растения и то, как их изучают.',
    mark: 'かはく', tint: '#4A6B3A',
  },
  {
    id: 'yobinori',
    name: '予備校のノリで学ぶ', lang: 'ja', lane: 'embed', kind: 'video', theme: 'science', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@yobinori',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqmWJJolqAgjIdLqK3zD1QQ',
    note: 'Университетская математика и физика голосом репетитора. Формулы на доске держат нить, даже когда слов не хватает.',
    mark: 'ヨビ', tint: '#B0562B',
  },
  {
    id: 'yuru-cs',
    name: 'ゆるコンピュータ科学ラジオ', lang: 'ja', lane: 'embed', kind: 'video', theme: 'tech', status: 'live',
    license: 'Плеер YouTube — встраивание разрешено самой площадкой',
    home: 'https://www.youtube.com/@yurugengo',
    feed: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCpLu0KjNy616-E95gPx7LZg',
    note: 'Двое разговаривают про информатику и язык — живая беседа, а не диктор. Уровень высокий: речь быстрая и с шутками.',
    mark: 'ゆる', tint: '#7A4A8C',
  },
  {
    id: 'wikinews-ja',
    name: 'ウィキニュース', lang: 'ja', lane: 'free', kind: 'agency', theme: 'news', status: 'archive',
    license: 'CC BY-SA 2.5 — свободная лицензия, нужна атрибуция',
    home: 'https://ja.wikinews.org/',
    note: 'Архив на 4104 заметки — самый большой из закрытых разделов.',
    mark: 'ウ', tint: '#4B6A88',
  },

  // ── Португальский ──────────────────────────────────────────────────────────
  {
    id: 'agencia-brasil',
    name: 'Agência Brasil', lang: 'pt-BR', lane: 'free', kind: 'agency', theme: 'news', status: 'live',
    license: 'CC BY 3.0 BR — свободная лицензия, нужна атрибуция',
    home: 'https://agenciabrasil.ebc.com.br/',
    feed: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    note: 'Государственное агентство Бразилии. Единственное крупное новостное агентство, которое отдаёт свои тексты под свободной лицензией.',
    mark: 'AB', tint: '#1E7C3C',
  },

  // ── Наш пересказ ───────────────────────────────────────────────────────────
  //
  // ОТДЕЛЬНЫЙ ИСТОЧНИК, А НЕ ПОДПИСЬ NASA. Пересказ научной статьи на трёх
  // уровнях — наш текст, и ставить над ним чужой логотип нельзя: ученик решит,
  // что читает NASA, и любая наша неточность станет их ошибкой. Исходный
  // материал назван в `byline` поста.
  //
  // Пересказывать можно НЕ ВСЁ. Здесь только общественное достояние (NASA,
  // NIST, NSF) и KOGL 제1유형: у CC BY-ND переработка прямо запрещена, а у
  // CC BY-SA пересказ пришлось бы отдать под ту же лицензию.
  {
    id: 'sci-retold-ko',
    name: 'Наука', lang: 'ko', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Наш пересказ — исходные материалы в общественном достоянии',
    home: 'https://science.nasa.gov/',
    note: 'Пересказы научных новостей: одна и та же новость по-корейски на трёх уровнях сразу, от простого к газетному. Исходный материал назван под каждым текстом.',
    mark: '과학', tint: '#3E6E8E',
  },
  {
    id: 'sci-retold-ja',
    name: '科学 · пересказ', lang: 'ja', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Наш пересказ — исходные материалы в общественном достоянии',
    home: 'https://science.nasa.gov/',
    note: 'Пересказы научных новостей по-японски на трёх ступенях — N4, N3, N2. Свободного японского научного текста в природе нет, и это единственный способ читать науку по-японски, а не смотреть её.',
    mark: '科学', tint: '#3E6E8E',
  },
  {
    id: 'sci-retold-en',
    name: 'Наука', lang: 'en', lane: 'free', kind: 'science', theme: 'science', status: 'live',
    license: 'Наш пересказ — исходные материалы в общественном достоянии',
    home: 'https://science.nasa.gov/',
    note: 'Пересказы научных новостей: одна и та же новость на B1, B2 и C1 — не «упрощённая версия вместо статьи», а лестница к ней. Исходный материал назван под каждым текстом.',
    mark: 'SCI', tint: '#3E6E8E',
  },
]

export const outletById = (id: string): Outlet | undefined => OUTLETS.find(o => o.id === id)

/**
 * «Ручка» источника под именем в шапке поста — @TEDx, nasa.gov.
 *
 * Не отдельное поле: адрес источника уже лежит в `home`, и второе место, где
 * то же самое написано руками, рано или поздно разойдётся с первым. У каналов
 * YouTube ручка есть в самом адресе, у остальных её роль играет домен.
 */
export function outletHandle(o: Outlet): string {
  const at = o.home.match(/\/@([\w.-]+)/)
  if (at) return '@' + at[1]
  const host = o.home.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return host
}

/** Базовый код языка: pt-BR → pt. */
const base = (lang: string) => lang.split('-')[0].toLowerCase()

/** Источники языка — из синхронного реестра, без загрузки материалов. */
export function outletsForLang(lang: string | undefined): Outlet[] {
  if (!lang) return []
  const b = base(lang)
  return OUTLETS.filter(o => base(o.lang) === b)
}

// ─── Подписи дорожек ─────────────────────────────────────────────────────────

export const LANES: { id: Lane; label: string; hint: string }[] = [
  { id: 'free',  label: 'Текст целиком', hint: 'Свободная лицензия или общественное достояние — читаем оригинал' },
  { id: 'embed', label: 'Плеер',         hint: 'Ролик или пост в виджете площадки, вопросы наши' },
  { id: 'link',  label: 'Заголовок',     hint: 'Ссылка на оригинал плюс наш текст о том же событии' },
]

export const laneLabel = (l: Lane): string => LANES.find(x => x.id === l)?.label ?? ''

// ─── Фильтры над лентой ──────────────────────────────────────────────────────
//
// РЯД ЧИПСОВ, А НЕ ФИЛЬТРЫ В РЕЙЛЕ. Лента — единственный экран тренажёра, куда
// заходят не выбирать, а листать, и рейл с галочками ей противопоказан. Но
// «сегодня хочу только ролики» и «покажи, что там по науке» — это не выбор
// материала, а поворот той же ленты, и ради него ряд наверху оправдан.
//
// ОДИН ВЫБРАННЫЙ ЗА РАЗ. Набор галочек превращает ряд в конструктор запроса:
// человек начинает собирать выборку вместо того, чтобы читать. Здесь ровно
// один поворот, и «Все» всегда рядом, чтобы вернуться одним тапом.
//
// ВИДЕО СТОИТ РЯДОМ С ТЕМАМИ И НЕ СПОРИТ С НИМИ. Это разные вопросы («в каком
// виде» против «о чём»), но задавать оба сразу незачем: ряд из двух этажей
// съедает первый экран ленты ради выборки, которой пользуются раз в неделю.

/** Что выбрано в ряду над лентой. */
export type FeedFilter = 'all' | 'video' | FeedTheme

const THEME_LABEL: Record<FeedTheme, string> = {
  news: 'Новости', science: 'Наука', tech: 'Технологии',
  culture: 'Искусство', life: 'Жизнь', health: 'Здоровье',
}

/** Подпись чипса. Наружу — ради ленты на телефоне и подписи в шапке. */
export function filterLabel(f: FeedFilter): string {
  if (f === 'all') return 'Всё'
  if (f === 'video') return 'Видео'
  return THEME_LABEL[f]
}

/**
 * Значок чипса — им рубрика показывается, когда подписи нет места.
 *
 * ЗНАЧОК ЕСТЬ У КАЖДОЙ, включая «Всё»: свёрнутый ряд рисует словом только
 * текущую рубрику, а остальные значками, и рубрика без картинки оказалась бы
 * единственной дырой в ряду.
 */
const FILTER_ICON: Record<FeedFilter, LucideIcon> = {
  all: LayoutGrid, video: Play,
  news: Newspaper, science: FlaskConical, tech: Cpu,
  culture: Palette, life: Leaf, health: HeartPulse,
}

export function filterIcon(f: FeedFilter): LucideIcon {
  return FILTER_ICON[f] ?? Newspaper
}

/**
 * Ролик ли это. Не по роду источника: у SBS 뉴스 род 'video', но их же
 * текстовые заметки роликами не станут. Смотрим на сам материал — есть плеер.
 */
export const isVideo = (item: FeedItem): boolean => item.embed?.kind === 'youtube'

/**
 * ЧЕМ материал является — в отличие от `theme` («о чём») и `lane` («по какому
 * праву»). По этому человек отбирает ленту под обстоятельства: ролик требует
 * звука и внимания, текст читается где угодно.
 *
 * Картинки отдельным типом ЗДЕСЬ ПОКА НЕТ, и выдумывать её нельзя: в модели
 * материала нет своего изображения — единственная картинка в ленте это кадр
 * ролика с YouTube, то есть тот же 'video'. Появится у постов своя иллюстрация
 * — здесь добавится 'photo', и ряд типов в настройках подхватит её сам: он
 * рисуется по тому, что реально встретилось в ленте.
 */
export type FeedKind = 'text' | 'video'

export function feedKind(item: FeedItem): FeedKind {
  return isVideo(item) ? 'video' : 'text'
}

export const KIND_LABEL: Record<FeedKind, string> = {
  text: 'Тексты',
  video: 'Видео',
}

/** Тема материала — из реестра источника. Неизвестный источник считаем новостью. */
export function itemTheme(item: FeedItem): FeedTheme {
  return outletById(item.outletId)?.theme ?? 'news'
}

/** Подходит ли материал под выбранный чипс. */
export function matchesFilter(item: FeedItem, f: FeedFilter): boolean {
  if (f === 'all') return true
  if (f === 'video') return isVideo(item)
  return itemTheme(item) === f
}

/**
 * Ряд чипсов по тому, что реально приехало.
 *
 * ПУСТЫХ ЧИПСОВ НЕТ. Чипс, который ничего не показывает, — это обещание
 * материала, которого у языка нет: в португальской ленте один источник и ни
 * одного ролика, и «Видео (0)» там читается как поломка. Порядок постоянный,
 * чтобы ряд не перетасовывался от языка к языку.
 */
const ORDER: FeedFilter[] = ['video', 'news', 'science', 'tech', 'culture', 'life', 'health']

/**
 * Порядок тем по умолчанию — тот же, что в ряду чипсов, но БЕЗ 'video': видео
 * это тип материала, а не тема (см. feedKind), и в списке тем, который человек
 * тасует под себя, ему делать нечего.
 */
export const THEME_ORDER: FeedTheme[] = ['news', 'science', 'tech', 'culture', 'life', 'health']

export function feedFilters(items: FeedItem[]): { id: FeedFilter; label: string; count: number }[] {
  const row: { id: FeedFilter; label: string; count: number }[] = [
    { id: 'all', label: filterLabel('all'), count: items.length },
  ]
  for (const id of ORDER) {
    const count = items.reduce((n, it) => n + (matchesFilter(it, id) ? 1 : 0), 0)
    // Один-единственный материал своей темы — не тема, а случайность: чипс с
    // единицей занимает место в ряду и выключается сразу после первого тапа.
    if (count > 1) row.push({ id, label: filterLabel(id), count })
  }
  return row
}

/**
 * Строка происхождения под заголовком: «NASA · 21 августа · оригинал».
 * Собирается здесь, а не в компоненте: подпись обязана быть одинаковой в ленте
 * и в читалке, а два места её написания расходятся на первой же правке.
 */
export function itemLine(item: FeedItem, outlet?: Outlet): string {
  const parts = [outlet?.name ?? item.outletId, dayLabel(item.date)]
  if (item.byline) parts.push(item.byline)
  parts.push(item.textOrigin === 'verbatim' ? 'оригинал' : 'наш текст')
  return parts.join(' · ')
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** «21 августа», «21 августа 2025» — год добавляется, только если он не текущий. */
export function dayLabel(iso: string, today = new Date()): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const s = `${d} ${MONTHS[m - 1]}`
  return y === today.getFullYear() ? s : `${s} ${y}`
}

/**
 * Дни ленты сверху вниз. Группировка живёт здесь, а не в компоненте: по этим же
 * группам считается «сколько нового с прошлого захода», и две реализации
 * группировки означали бы два разных ответа на один вопрос.
 */
export function byDay(items: FeedItem[]): { date: string; items: FeedItem[] }[] {
  const map = new Map<string, FeedItem[]>()
  for (const it of items) {
    const list = map.get(it.date)
    if (list) list.push(it)
    else map.set(it.date, [it])
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, list]) => ({ date, items: list }))
}

// ─── Загрузка материалов ─────────────────────────────────────────────────────

type Loader = () => Promise<FeedItem[]>

/**
 * ДВА ФАЙЛА НА ЯЗЫК, И ЭТО НЕ ИЗБЫТОЧНОСТЬ.
 *
 * feed<Lang> — РУЧНОЙ: материалы с переводом целиком и разбором, их писал
 * человек. auto<Lang> — МАШИННЫЙ: его целиком перезаписывает `npm run
 * build:feed` при каждом прогоне. Будь файл один, первая же автосборка стёрла
 * бы ручную работу, а слияние двух источников в один файл — это код, который
 * однажды ошибётся молча и потеряет чужой труд.
 *
 * Для ленты разницы нет: оба списка склеиваются и сортируются по дате.
 */
/**
 * Перевод материала целиком: заголовок и текст по-русски.
 *
 * ЛЕЖИТ ОТДЕЛЬНО ОТ САМОГО МАТЕРИАЛА, И ЭТО НЕ УДОБСТВО, А НЕОБХОДИМОСТЬ.
 * Файлы auto<Lang>.ts целиком перезаписывает `npm run build:feed` при каждом
 * ночном прогоне: положи перевод туда — и завтрашняя сборка сотрёт вчерашнюю
 * работу. Ключ — id материала, поэтому перевод переживает любую пересборку и
 * исчезает вместе с материалом, к которому относится.
 */
export interface FeedTranslation {
  /** Заголовок по-русски. Обязателен: у ролика он единственный текст. */
  title: string
  /** Тело по-русски. У роликов тела нет — тогда поля нет. */
  body?: string
}

/**
 * Приклеить переводы к материалам.
 *
 * Ручной материал (feed<Lang>.ts) свой перевод несёт в себе, и перебивать его
 * нельзя: он написан вместе с текстом и вопросами к нему.
 */
function withTrans(items: FeedItem[], trans: Record<string, FeedTranslation>): FeedItem[] {
  return items.map(it => {
    const t = trans[it.id]
    if (!t) return it
    return {
      ...it,
      title: it.title,
      titleTranslation: it.titleTranslation ?? t.title,
      translation: it.translation || t.body,
    }
  })
}

const LOADERS: Record<string, Loader> = {
  en: () => Promise.all([
    import('./feedEn').then(m => m.EN_FEED),
    import('./autoEn').then(m => m.EN_AUTO),
    import('./adaptEn').then(m => m.EN_ADAPT),
    import('./transEn').then(m => m.EN_TRANS),
  ]).then(([a, b, c, tr]) => withTrans([...a, ...b, ...c], tr)),
  ja: () => Promise.all([
    import('./feedJa').then(m => m.JA_FEED),
    import('./autoJa').then(m => m.JA_AUTO),
    import('./adaptJa').then(m => m.JA_ADAPT),
    import('./transJa').then(m => m.JA_TRANS),
  ]).then(([a, b, c, tr]) => withTrans([...a, ...b, ...c], tr)),
  ko: () => Promise.all([
    import('./feedKo').then(m => m.KO_FEED),
    import('./autoKo').then(m => m.KO_AUTO),
    import('./adaptKo').then(m => m.KO_ADAPT),
    import('./transKo').then(m => m.KO_TRANS),
  ]).then(([a, b, c, tr]) => withTrans([...a, ...b, ...c], tr)),
  pt: () => Promise.all([
    import('./feedPt').then(m => m.PT_FEED),
    import('./autoPt').then(m => m.PT_AUTO),
    import('./transPt').then(m => m.PT_TRANS),
  ]).then(([a, b, tr]) => withTrans([...a, ...b], tr)),
}

/**
 * Сколько материалов в каждом чанке. Знать это НАДО СИНХРОННО: бейдж режима
 * «Чтение» считает тексты вместе со сценами и лентой, а чанк ленты приезжает
 * только когда откроют её половину. Ровно та же схема и та же причина, что у
 * SCENE_COUNTS в data/scenes.
 *
 * Расхождение с файлами ловит `npm run check:feed` (с `--fix` — переписывает),
 * плюс loadFeed ругается в консоль, если приехал список другой длины.
 */
export const FEED_COUNTS: Record<string, number> = {
  en: 45,
  ja: 44,
  ko: 52,
  pt: 43,
}

/** Есть ли для языка лента. Синхронно — по этому решается, рисовать ли сегмент. */
export const hasFeed = (lang: string | undefined): boolean =>
  !!lang && (lang in LOADERS || base(lang) in LOADERS)

/** Сколько материалов у языка — синхронно, ещё до загрузки чанка. */
export function feedCount(lang: string | undefined): number {
  if (!lang) return 0
  return FEED_COUNTS[lang] ?? FEED_COUNTS[base(lang)] ?? 0
}

/**
 * Подгрузить ленту языка. Пустой массив — либо языка нет, либо чанк не доехал.
 * Уронить тренажёр из-за ленты нельзя: чтение должно остаться.
 */
export async function loadFeed(lang: string | undefined): Promise<FeedItem[]> {
  if (!lang) return []
  const load = LOADERS[lang] ?? LOADERS[base(lang)]
  if (!load) return []
  try {
    const list = await load()
    const declared = feedCount(lang)
    if (declared !== list.length) {
      console.warn(`feed: у «${lang}» в FEED_COUNTS ${declared}, а в файле ${list.length} — поправь таблицу в data/feed/index.ts`)
    }
    // Свежее сверху — порядок ленты задаётся здесь, а не порядком в файле:
    // файл наполняется дописыванием в конец, и полагаться на него нельзя.
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))
  } catch (e) {
    console.error('loadFeed:', e)
    return []
  }
}

/**
 * «1 материал», «2 материала», «5 материалов».
 *
 * Общего склонятора в проекте нет, а «1 материалов» в подзаголовке видно сразу
 * и читается как недоделка. Живёт рядом со словом, которое склоняет, — как
 * scenesWord у сцен.
 */
export function materialsWord(n: number): string {
  const t = n % 100
  if (t >= 11 && t <= 14) return 'материалов'
  const d = n % 10
  if (d === 1) return 'материал'
  if (d >= 2 && d <= 4) return 'материала'
  return 'материалов'
}
