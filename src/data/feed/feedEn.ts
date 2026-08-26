// ─────────────────────────────────────────────────────────────────────────────
// Лента: английский
//
// Источник — NASA. Работы федеральных агентств США не охраняются авторским
// правом вообще: их можно публиковать целиком, без разрешения и без лицензии.
// Это единственная дорожка, где «оригинал» на экране означает оригинал.
//
// ТЕКСТ НЕ ПРАВИТСЯ. Ни орфография, ни пунктуация, ни висячие пробелы вокруг
// запятых, которые NASA оставляет в подписях к APOD. Материал помечен
// textOrigin: 'verbatim', и эта пометка — обещание ученику: он читает то же
// самое, что читают носители. Проверяется `npm run check:feed -- --verify`:
// каждый абзац должен находиться в исходнике по ссылке.
//
// ЧТО МОЖНО РЕЗАТЬ. Только служебное обрамление страницы (навигация «Today’s
// APOD · Archive · Submissions», подписи под фото, строка «3 Min Read») и
// целые абзацы с начала или конца. Резать ВНУТРИ абзаца нельзя: получится
// текст, которого у источника нет.
//
// ПРО КАРТИНКИ. Здесь только текст, и это не случайность: снимки APOD часто
// принадлежат самому фотографу («Credit Copyright: Jakub Koukal»), хотя
// подпись к ним написана сотрудниками NASA и свободна. Забрать картинку
// «раз уж NASA» — верный способ нарваться.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeedItem } from './index'

export const EN_FEED: FeedItem[] = [
  {
    id: 'en-feed-apod-perseids',
    outletId: 'nasa',
    lang: 'en',
    title: 'Mostly Perseids',
    date: '2026-08-22',
    lane: 'free',
    textOrigin: 'verbatim',
    age: '12+',
    url: 'https://science.nasa.gov/image-article/apod/apod-2026-august-22-mostly-perseids/',
    byline: 'Jerry Bonnell, Cecilia Chirenti, Robert Nemiroff, Keighley Rockcliffe',
    origin: 'open-corpus',
    credit: 'NASA · Astronomy Picture of the Day · общественное достояние',
    level: 'B2',
    minutes: 3,
    topic: 'Погода и природа',
    skill: 'Чтение',
    body: `Explanation: Recorded the night of August 12-13, images from four dedicated meteor-monitoring cameras at an astronomical observatory in Czechia were aligned and combined to create this all-night, all-sky view. On that night , the total count came to 1,706 meteors. And since that coincided with the peak activity of the 2026 Perseid Meteor Shower , most are perseids. Their overwhelming numbers make them easy to spot. Quite convincingly, perseid trails all trace back to a single radiant on the sky at the upper right, a region in the annual shower’s eponymous constellation Perseus. But meteors belonging to other much less active showers can be revealed by finding their radiants too. For example, seen crossing the perseid trails are meteors from a shower whose radiant lies in Cygnus, known as Kappa Cygnids . The antihelion complex , a general region near Aquarius and opposite the Sun in the sky, is also identifiable as a weak source for meteors.`,
    translation: `Пояснение: в ночь с 12 на 13 августа снимки с четырёх камер слежения за метеорами в обсерватории в Чехии совместили и сложили в один кадр всего неба за всю ночь. В ту ночь насчитали 1706 метеоров. Пик активности Персеид 2026 года пришёлся ровно на эту ночь, так что большинство из них — персеиды. Их так много, что заметить их легко. Убедительнее всего то, что следы персеид сходятся к одной точке вверху справа — к области в созвездии Персея, по которому поток и назван. Но метеоры куда более слабых потоков тоже можно узнать, если найти их точки схода. Например, поперёк следов персеид идут метеоры потока с радиантом в Лебеде — Каппа-Цигниды. Антигелиевый комплекс — область неба рядом с Водолеем, напротив Солнца, — тоже виден как слабый источник метеоров.`,
    glossary: [
      { term: 'meteor', ru: 'метеор, «падающая звезда»' },
      { term: 'shower', ru: 'поток (метеорный); обычно — душ, ливень' },
      { term: 'trail', ru: 'след, полоса' },
      { term: 'radiant', ru: 'радиант — точка, из которой следы расходятся' },
      { term: 'to trace back', ru: 'прослеживаться до, сходиться к' },
      { term: 'overwhelming', ru: 'подавляющий, огромный' },
      { term: 'to spot', ru: 'заметить, разглядеть' },
      { term: 'eponymous', ru: 'давший название' },
      { term: 'to align', ru: 'совместить, выровнять' },
      { term: 'source', ru: 'источник' },
    ],
    questions: [
      {
        q: 'How was this single image made?',
        options: [
          'One long exposure from one camera',
          'A drawing based on observations',
          'Images from four cameras aligned and combined',
          'A photo taken from orbit',
        ],
        correct: 2,
        why: '«images from four dedicated meteor-monitoring cameras … were aligned and combined» — снимки сложили, а не сняли одним кадром.',
      },
      {
        q: 'Why are most of the meteors perseids?',
        options: [
          'Perseids are the only meteors visible in August',
          'The cameras only detect perseids',
          'They were the brightest ones',
          'That night was the peak of the 2026 Perseid shower',
        ],
        correct: 3,
      },
      {
        q: 'What makes a meteor a perseid, according to the text?',
        options: [
          'Its trail traces back to a radiant in Perseus',
          'Its colour',
          'Its speed',
          'The month it appears in',
        ],
        correct: 0,
        why: 'Поток определяется радиантом: следы персеид сходятся в Персее, следы Каппа-Цигнид — в Лебеде.',
      },
      {
        q: 'What are Kappa Cygnids?',
        options: [
          'Meteors from a much less active shower with its radiant in Cygnus',
          'A group of stars in Perseus',
          'The four cameras used in Czechia',
          'Another name for perseids',
        ],
        correct: 0,
      },
    ],
  },

  {
    id: 'en-feed-webb-treasure-chest',
    outletId: 'nasa',
    lang: 'en',
    title: 'Webb Opens Treasure Chest',
    date: '2026-08-21',
    lane: 'free',
    textOrigin: 'verbatim',
    age: '12+',
    url: 'https://www.nasa.gov/image-article/webb-opens-treasure-chest/',
    origin: 'open-corpus',
    credit: 'NASA · подпись к снимку телескопа «Джеймс Уэбб» · общественное достояние',
    level: 'B1',
    minutes: 2,
    topic: 'Технологии и медиа',
    skill: 'Чтение',
    body: `NASA’s James Webb Space Telescope captured this Aug. 6, 2026, infrared image of part of the Carina Nebula, a star-forming region also home to the Cosmic Cliffs. This feature, called the “Treasure Chest,” is an object known as a cometary globule. A cometary globule is an isolated cloud of gas and dust with a dense, dark head and a sweeping tail.`,
    translation: `Космический телескоп НАСА «Джеймс Уэбб» получил 6 августа 2026 года этот инфракрасный снимок части туманности Киля — области звездообразования, где находятся и «Космические скалы». Объект, который назвали «Сундук с сокровищами», — это кометарная глобула: одинокое облако газа и пыли с плотной тёмной головой и вытянутым хвостом.`,
    glossary: [
      { term: 'to capture', ru: 'заснять, получить (изображение)' },
      { term: 'infrared', ru: 'инфракрасный' },
      { term: 'nebula', ru: 'туманность' },
      { term: 'star-forming region', ru: 'область звездообразования' },
      { term: 'feature', ru: 'здесь: объект, деталь; обычно — особенность' },
      { term: 'isolated', ru: 'одинокий, отдельно стоящий' },
      { term: 'dense', ru: 'плотный' },
      { term: 'sweeping', ru: 'вытянутый, размашистый' },
    ],
    questions: [
      {
        q: 'What is the “Treasure Chest”?',
        options: [
          'A telescope',
          'A cometary globule — a cloud of gas and dust',
          'A comet flying through the nebula',
          'A newly discovered planet',
        ],
        correct: 1,
      },
      {
        q: 'What kind of image is this?',
        options: ['A radio map', 'An X-ray image', 'A drawing', 'An infrared image'],
        correct: 3,
      },
      {
        q: 'What shape does a cometary globule have?',
        options: [
          'A dense dark head and a long tail',
          'A ring with an empty centre',
          'A perfect sphere',
          'A flat disc',
        ],
        correct: 0,
        why: 'Последнее предложение описывает форму: «a dense, dark head and a sweeping tail» — отсюда и слово «кометарная».',
      },
    ],
  },

  {
    id: 'en-feed-eclipse-views',
    outletId: 'nasa',
    lang: 'en',
    title: 'NASA Shares Views of August Solar Eclipse',
    date: '2026-08-21',
    lane: 'free',
    textOrigin: 'verbatim',
    age: '12+',
    url: 'https://science.nasa.gov/science-research/heliophysics/nasa-shares-views-of-august-solar-eclipse-from-ground-air-space/',
    origin: 'open-corpus',
    credit: 'NASA · общественное достояние',
    level: 'B1',
    minutes: 2,
    topic: 'Погода и природа',
    skill: 'Чтение',
    body: `On Aug. 12, a total solar eclipse darkened skies over Greenland, Iceland, and Spain. As the Moon covered the Sun, it briefly revealed the Sun’s wispy outer atmosphere — the corona — to those in the path of totality who were lucky enough to have clear skies. NASA researchers and photographers were along the eclipse path to study the corona, capture the phenomenon, and observe how the eclipse affected our planet.

One NASA photographer in Spain captured the total solar eclipse as well as the partial phases before and after, until the Sun set below the horizon.`,
    translation: `12 августа полное солнечное затмение затемнило небо над Гренландией, Исландией и Испанией. Когда Луна закрыла Солнце, она на короткое время открыла его тонкую внешнюю атмосферу — корону — тем, кто оказался в полосе полной фазы и кому повезло с ясным небом. Исследователи и фотографы НАСА работали вдоль полосы затмения: изучали корону, снимали само явление и наблюдали, как затмение сказывается на нашей планете.

Один из фотографов НАСА в Испании снял и полную фазу, и частные фазы до и после неё — до самого захода Солнца за горизонт.`,
    glossary: [
      { term: 'eclipse', ru: 'затмение' },
      { term: 'to darken', ru: 'затемнить, погрузить во тьму' },
      { term: 'to reveal', ru: 'открыть, показать то, что было скрыто' },
      { term: 'wispy', ru: 'тонкий, полупрозрачный' },
      { term: 'corona', ru: 'корона (внешняя атмосфера Солнца)' },
      { term: 'path of totality', ru: 'полоса полной фазы затмения' },
      { term: 'to affect', ru: 'влиять на, сказываться на' },
      { term: 'partial', ru: 'частичный, неполный' },
    ],
    questions: [
      {
        q: 'Where was the eclipse total?',
        options: [
          'Over the whole of Europe',
          'Over Greenland, Iceland, and Spain',
          'Only in Spain',
          'Over North America',
        ],
        correct: 1,
      },
      {
        q: 'What could people in the path of totality see?',
        options: [
          'Nothing — the sky was cloudy everywhere',
          'The surface of the Moon',
          'A meteor shower',
          'The Sun’s corona',
        ],
        correct: 3,
        why: '«briefly revealed the Sun’s wispy outer atmosphere — the corona» — корона видна только когда Луна закрывает диск Солнца.',
      },
      {
        q: 'Why were NASA researchers there?',
        options: [
          'To warn people about the eclipse',
          'To study the corona and observe the eclipse’s effects',
          'To repair a telescope',
          'To launch a rocket during the eclipse',
        ],
        correct: 1,
      },
    ],
  },

  // ── Синяя дорожка: чужой плеер ─────────────────────────────────────────────
  //
  // У материала в плеере НЕТ body: читать нечего, смотреть — в плеере канала.
  // Вопросы наши и написаны по официальному описанию ролика (у TEDx там лежит
  // и тезис доклада, и кто такой спикер). Расшифровку мы не копируем: она
  // принадлежит автору, а вопросы к чужому ролику — не воспроизведение.
  {
    id: 'en-feed-ted-extreme-heat',
    outletId: 'ted',
    lang: 'en',
    title: 'How to live in extreme heat',
    date: '2026-08-21',
    lane: 'embed',
    textOrigin: 'ours',
    age: '12+',
    url: 'https://www.youtube.com/watch?v=VXRwzoFLGaM',
    byline: 'V. Kelly Turner · TEDxUCLA',
    embed: { kind: 'youtube', id: 'VXRwzoFLGaM' },
    origin: 'original',
    credit: 'TEDx Talks · плеер YouTube',
    level: 'B2',
    minutes: 12,
    topic: 'Погода и природа',
    skill: 'Аудирование',
    body: '',
    glossary: [
      { term: 'heat', ru: 'жара' },
      { term: 'quality of life', ru: 'качество жизни' },
      { term: 'to thrive', ru: 'преуспевать, жить хорошо' },
      { term: 'urban planning', ru: 'городское планирование' },
      { term: 'policy', ru: 'политика (как курс действий)' },
      { term: 'to advise', ru: 'консультировать' },
      { term: 'conditions', ru: 'условия' },
    ],
    questions: [
      {
        q: 'What is the speaker’s main point about heat?',
        options: [
          'Hotter-than-usual conditions slowly cost most of us quality of life',
          'Only record-breaking heat matters',
          'Heat is not a problem in cities',
          'Air conditioning solves the problem',
        ],
        correct: 0,
        why: 'Тезис доклада: заголовки достаются рекордам, а жизнь портит обычная «чуть жарче обычного» жара.',
      },
      {
        q: 'What does the talk walk you through?',
        options: [
          'The history of thermometers',
          'A list of the hottest cities',
          'A typical hot day today, and in a future designed for living well with heat',
          'How to build an air conditioner',
        ],
        correct: 2,
      },
      {
        q: 'What is Dr. Turner’s field?',
        options: [
          'Medicine',
          'Astronomy',
          'Urban planning and geography, with a focus on heat',
          'Economics',
        ],
        correct: 2,
      },
    ],
  },

  // ── ОДНА НОВОСТЬ НА B1, B2 И C1 ────────────────────────────────────────────
  //
  // Научная статья написана для коллег, и ученику её закрывает не тема, а
  // регистр: «superconducting detectors confined to spans measured in
  // micrometres» — это C1, хотя речь идёт о простой вещи. Поэтому один и тот же
  // материал стоит здесь трижды, лестницей, и ступень переключается в посте.
  //
  // Верхняя ступень нарочно НЕ упрощена: смысл лестницы в том, чтобы по ней
  // подняться, а не в том, чтобы остаться внизу. Исходник — пресс-релиз NIST,
  // общественное достояние; пересказ наш (см. sci-retold-en в реестре).
  {
    id: 'en-sci-photon',
    outletId: 'sci-retold-en',
    lang: 'en',
    title: 'A detector that counts light one piece at a time',
    date: '2026-08-26',
    lane: 'free',
    textOrigin: 'ours',
    age: '12+',
    url: 'https://www.nist.gov/news-events/news/2026/08/nist-researchers-supersize-quantum-technology-help-detect-faint-photons',
    byline: 'our retelling of a NIST news release',
    origin: 'original',
    credit: 'Source material — NIST, public domain',
    level: 'B1',
    minutes: 2,
    topic: 'Технологии и ИИ',
    skill: 'Чтение',
    body: `Light is made of very small pieces. Each piece is called a photon.

In daylight there are so many photons that nobody counts them. But some machines have to catch them one by one. Doctors use such machines to look deep inside the body, and quantum computers need them too.

Until now these detectors had to be very small. A small detector can only watch a small spot, so the light has to be aimed at it carefully.

Researchers at NIST have built a much bigger one. It still notices a single photon, but it watches a wider area. That should make the machines simpler and cheaper to build.`,
    levels: [
      {
        level: 'B1',
        minutes: 2,
        body: `Light is made of very small pieces. Each piece is called a photon.

In daylight there are so many photons that nobody counts them. But some machines have to catch them one by one. Doctors use such machines to look deep inside the body, and quantum computers need them too.

Until now these detectors had to be very small. A small detector can only watch a small spot, so the light has to be aimed at it carefully.

Researchers at NIST have built a much bigger one. It still notices a single photon, but it watches a wider area. That should make the machines simpler and cheaper to build.`,
      },
      {
        level: 'B2',
        minutes: 3,
        body: `A photon is the smallest amount of light there is. Most of the time this hardly matters, because sunlight arrives in enormous numbers. But a growing number of instruments depend on catching photons one at a time: imaging deep inside living tissue, sending messages that cannot be copied, running a quantum computer.

The problem has always been size. A detector sensitive enough to register a single photon had to be tiny, and a tiny detector can only watch a tiny patch of space. Making the patch wider used to mean losing the signal in noise.

Researchers at the National Institute of Standards and Technology have now made such a detector far larger without losing that sensitivity. "Photons carry information," one of the researchers said. A wider detector simply collects more of it, and it does so without the complicated optics that were once needed to squeeze light onto a tiny target.`,
      },
      {
        level: 'C1',
        minutes: 4,
        body: `Everyday life is flooded with photons, the quantum building blocks of light, and for most purposes their sheer number makes the individual particle irrelevant. At the frontier of instrumentation the opposite holds: in deep-tissue imaging, in secure communication, in optical quantum computing, the arrival of every single photon carries information that cannot be recovered once it is lost.

Sensitivity of that order has historically come at the cost of area. Detectors capable of registering one photon have been confined to active regions a few micrometres across, and enlarging that region degraded the very signal it was meant to capture. The consequence was an elaborate apparatus of lenses and fibres whose only purpose was to funnel light onto a target smaller than a grain of dust.

Researchers at the National Institute of Standards and Technology now report that they have scaled the active area up substantially while preserving the single-photon response. If the result holds outside the laboratory, an entire layer of optical engineering becomes unnecessary, and instruments that were previously confined to specialised benches become considerably easier to build.`,
      },
    ],
    glossary: [],
    questions: [],
  },
]
