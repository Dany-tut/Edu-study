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
          'Images from four cameras aligned and combined',
          'A drawing based on observations',
          'A photo taken from orbit',
        ],
        correct: 1,
        why: '«images from four dedicated meteor-monitoring cameras … were aligned and combined» — снимки сложили, а не сняли одним кадром.',
      },
      {
        q: 'Why are most of the meteors perseids?',
        options: [
          'Perseids are the only meteors visible in August',
          'The cameras only detect perseids',
          'That night was the peak of the 2026 Perseid shower',
          'They were the brightest ones',
        ],
        correct: 2,
      },
      {
        q: 'What makes a meteor a perseid, according to the text?',
        options: [
          'Its colour',
          'Its speed',
          'Its trail traces back to a radiant in Perseus',
          'The month it appears in',
        ],
        correct: 2,
        why: 'Поток определяется радиантом: следы персеид сходятся в Персее, следы Каппа-Цигнид — в Лебеде.',
      },
      {
        q: 'What are Kappa Cygnids?',
        options: [
          'A group of stars in Perseus',
          'Meteors from a much less active shower with its radiant in Cygnus',
          'The four cameras used in Czechia',
          'Another name for perseids',
        ],
        correct: 1,
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
        options: ['A radio map', 'An infrared image', 'An X-ray image', 'A drawing'],
        correct: 1,
      },
      {
        q: 'What shape does a cometary globule have?',
        options: [
          'A ring with an empty centre',
          'A dense dark head and a long tail',
          'A perfect sphere',
          'A flat disc',
        ],
        correct: 1,
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
          'Over Greenland, Iceland, and Spain',
          'Over the whole of Europe',
          'Only in Spain',
          'Over North America',
        ],
        correct: 0,
      },
      {
        q: 'What could people in the path of totality see?',
        options: [
          'Nothing — the sky was cloudy everywhere',
          'The Sun’s corona',
          'The surface of the Moon',
          'A meteor shower',
        ],
        correct: 1,
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
]
