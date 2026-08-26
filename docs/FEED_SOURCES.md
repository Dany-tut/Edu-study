# Источники ленты: что берём, откуда и на каком основании

Проверено запросом **26.08.2026**. Здесь только адреса, которые в этот день
реально ответили: «кажется, у них есть RSS» проверкой не является — у половины
кандидатов адреса из памяти отдали 404.

Скрипт: `scripts/buildFeed.mjs` (реестр `SOURCES`), витрина: `src/data/feed/index.ts`
(реестр `OUTLETS`). Каждый источник должен быть в обоих, иначе `check:feed` падает.

---

## Главное правило: две дорожки, и они про РАЗНОЕ

**Зелёная (`lane: 'free'`) — чужой текст слово в слово.** Нужна лицензия,
разрешающая воспроизведение: общественное достояние, CC BY, CC BY-ND, KOGL 1.

**Серая (`lane: 'link'` / `textOrigin: 'ours'`) — НАШ текст о том же событии.**
Здесь лицензия источника не нужна вовсе: **факты авторским правом не
охраняются, охраняется только их изложение.** Пересказать своими словами
новость The Verge можно ровно так же законно, как новость NASA. Ограничение
другое — наш текст должен написать человек (или шаг с моделью в ночной сборке,
которого пока нет).

Отсюда следствие, которое стоит держать в голове: **список серых источников
почти не ограничен, зелёных — жёстко ограничен.** Всё, что ниже помечено
«серая», — это сырьё для пересказов, а не для копирования.

**Отдельно про ПЕРЕСКАЗ С ПЕРЕРАБОТКОЙ** (наши уровни 3급/4급/5급, B1/B2/C1).
Если мы держимся близко к чужому изложению, это производное произведение, и
тогда лицензия снова важна:

| Лицензия | Копировать | Перерабатывать |
|---|---|---|
| Общественное достояние (гос. США) | да | да |
| KOGL 제1유형 | да | да |
| CC BY | да | да |
| CC BY-**ND** (The Conversation) | да | **нет** |
| CC BY-**SA** (ESA, Викиновости) | да | только под той же лицензией |
| Всё остальное | нет | только своими словами по фактам |

---

## Зелёная дорожка: работает сегодня

### Английский — федеральные агентства США (общественное достояние)

| Источник | Тема | Адрес фида |
|---|---|---|
| NASA | космос | `https://www.nasa.gov/news-release/feed/` |
| NIST | измерения, материалы, правила для ИИ | `https://www.nist.gov/news-events/news/rss.xml` |
| NSF | исследования, ИИ, квантовые технологии | `https://www.nsf.gov/rss/rss_www_news.xml` |
| NOAA | океан, погода, климат | `https://www.noaa.gov/rss.xml` |
| **FDA** | **медицина: препараты, приборы, тесты** | `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml` |
| **CDC** | **здоровье населения, вспышки, прививки** | `https://tools.cdc.gov/api/v2/resources/media/132608.rss` |
| **DOE** | **энергетика, батареи, суперкомпьютеры** | `https://www.energy.gov/rss/articles.xml` |
| The Conversation | учёные для широкой публики (CC BY-ND) | `https://theconversation.com/us/articles.atom` |
| ESA | космос (CC BY-SA 3.0 IGO) | `https://www.esa.int/rssfeed/Our_Activities/Space_Science` |

FDA — самый плотный медицинский источник из всех: «FDA Authorizes First
Wearable Device That Continuously Monitors…», «First-Of-Its-Kind Robotic Blood
Draw Device». Короткие тексты про вещи, которые завтра окажутся в больнице.

### Корейский — 정책브리핑 (KOGL 제1유형)

Отдельного научного раздела у korea.kr **нет**. Зато есть 보도자료 всех
ведомств, и **поиск по ним работает обычной ссылкой** — этим и берём тему:

```
https://www.korea.kr/briefing/pressReleaseList.do?srchWord=<слово>
```

| Слово | Тема | id источника |
|---|---|---|
| 인공지능 | ИИ | `korea-kr-ai` |
| 연구개발 | наука и разработки | `korea-kr-research` |
| 우주 | космос | `korea-kr-space` |
| **건강** | **медицина и здоровье** | `korea-kr-health` |
| **반도체** | **чипы, память, платы** | `korea-kr-chip` |
| **전기차** | **машины и транспорт** | `korea-kr-car` |

Плюс редакционные разделы 정책뉴스: EDS01 экономика (`korea-kr-economy`),
EDS02 общество, EDS03 культура. **EDS04 — политика и оборона, не берём.**

Технические грабли записаны в `scripts/buildFeed.mjs`: тела на странице
пресс-релиза нет (там вьюер сконвертированного HWP), текст берётся из ЛИДА в
списке, и годится не всякий — `pressLeads()` отсеивает обрезанные с начала,
отписки «см. вложенный PDF» и куски с вёрсткой документа. Из двадцати проходят
три-шесть.

### Португальский

| Источник | Лицензия | Адрес |
|---|---|---|
| Agência Brasil | CC BY 3.0 BR | `https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml` |

Дорожка **на паузе** по решению пользователя (23.08.2026).

### Японский — свободного текста НЕТ

Проверено 25–26.08.2026: у JAXA, RIKEN, 気象庁, 国立科学博物館 фиды отдают 404.
У サイエンスポータル (JST) и 国立天文台 фиды живые, но условий перепечатки на
страницах не заявлено — брать нельзя. Японская наука приходит роликами.

---

## Серая дорожка: сырьё для пересказов

Лицензия не нужна — берём факты, пишем свой текст, ставим ссылку. Всё проверено
запросом, все отвечают.

### Медицина

| Источник | Адрес |
|---|---|
| ScienceDaily · Health | `https://www.sciencedaily.com/rss/health_medicine.xml` |
| MIT News | `https://news.mit.edu/rss/feed` |
| Phys.org | `https://phys.org/rss-feed/` |

### Телефоны, гаджеты, ИТ

| Источник | Адрес |
|---|---|
| The Verge | `https://www.theverge.com/rss/index.xml` |
| Ars Technica | `https://feeds.arstechnica.com/arstechnica/index` |
| Apple Newsroom | `https://www.apple.com/newsroom/rss-feed.rss` |
| Google Blog | `https://blog.google/rss/` |
| Samsung Newsroom (ko) | `https://news.samsung.com/kr/feed` |

### Платы, чипы, электроника

| Источник | Адрес |
|---|---|
| IEEE Spectrum | `https://spectrum.ieee.org/feeds/feed.rss` |
| SK hynix Newsroom | `https://news.skhynix.com/feed/` |
| ScienceDaily · Computers | `https://www.sciencedaily.com/rss/computers_math.xml` |

### Наука и искусство

| Источник | Адрес |
|---|---|
| NASA Science | `https://science.nasa.gov/feed/` |
| Smithsonian Magazine | `https://www.smithsonianmag.com/rss/latest_articles/` |
| Public Domain Review | `https://publicdomainreview.org/rss.xml` |

### Открытые журналы (CC BY, копировать МОЖНО)

Юридически это зелёная дорожка, но по языку — нет: аннотации написаны для
коллег (C1–C2) и приносят десятки терминов, которых в словаре нет и не будет.
В ленту как есть не ставим; годятся как сырьё для пересказа по уровням.

| Журнал | Адрес |
|---|---|
| PLOS ONE | `https://journals.plos.org/plosone/feed/atom` |
| eLife | `https://elifesciences.org/rss/recent.xml` |
| Frontiers · AI | `https://www.frontiersin.org/journals/artificial-intelligence/rss` |
| bioRxiv | `https://connect.biorxiv.org/biorxiv_xml.php?subject=all` |
| arXiv API | `http://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending` |

---

## Каналы (дорожка `embed`)

Встраивание — штатная функция YouTube, лицензия не нужна. Поэтому каналов может
быть сколько угодно; ограничение только редакционное.

**Корейские:** SBS 뉴스, 침착맨, 영국남자, 슈카월드, MBC 예능, KBS WORLD TV,
과학드림 (научпоп), 안될공학 (ИТ и чипы), 지식해적단 (история), 국립중앙박물관,
셜록현준 (архитектура), EBS 다큐.

**Японские:** ANNニュース, TBS NEWS DIG, Kevin's English Room, HikakinTV,
東海オンエア, QuizKnock, サイエンスチャンネル (JST), 日本科学未来館,
国立科学博物館, 予備校のノリで学ぶ, ゆるコンピュータ科学ラジオ.

**Английские:** CNN, BBC News, National Geographic, TED, TED-Ed, Kurzgesagt,
Veritasium, Vox, Two Minute Papers (ИИ), Boston Dynamics (роботы), The Met,
MIT Open Learning.

---

## Проверено и НЕ подошло — чтобы не искать заново

| Источник | Что не так |
|---|---|
| Nature, Science, Cell, Scientific American | all rights reserved, только серая дорожка |
| Quanta Magazine | синдикация по договору, открытой лицензии нет |
| KISTI 과학향기 (`scent.kisti.re.kr`) | 공공누리 **제4유형**: некоммерческое, а платформа платная |
| NIH, NIAID, USDA | 403, Cloudflare |
| MedlinePlus, NCI, NHTSA, EPA | 404 / 405 на всех известных адресах фида |
| 사이언스타임즈, IBS, KAIST, 국립과천과학관 | страницы на JS, метки лицензии в разметке нет |
| korea.kr `deptCode=` (фильтр по ведомству) | через GET не работает, только `srchWord=` |
| Викиновости (ko/ja/en) | закрыты 04.05.2026, read-only |
| VOA Learning English | стоит с апреля 2025 |
| Threads, Instagram | Meta закрыла публичный oEmbed |
| DOAJ по корейскому и японскому | ноль статей: журналы этих стран издаются по-английски |

---

## Чего не хватает, чтобы это шло само

Ночная сборка (`.github/workflows/feed.yml`) умеет только зелёную дорожку:
взять чужой текст под свободной лицензией и положить как есть. Серая дорожка и
пересказы по уровням требуют, чтобы кто-то ПИСАЛ, — то есть шага с моделью в
сборке и ключа в секретах репозитория. Пока его нет, серый список выше — это
список для человека.

Второе: сборка гоняет `check:feed`, но не `check:gloss`. Значит, каждое утро
лента приносит слова, которых нет в словаре, и гарантия «каждое слово
переводится» держится ровно до тех пор, пока их кто-то дописывает.
