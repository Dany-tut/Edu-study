// ─────────────────────────────────────────────────────────────────────────────
// Разбор картины: описать своими словами, потом прочитать, что говорил автор
//
// ЗАЧЕМ ЭТО ОТДЕЛЬНО ОТ «ОПИСАТЬ КАРТИНКУ»
// Задание imageDescribe у нас уже есть, и в курсах оно работает на схемах и
// нарисованных сценах: «что есть в этой комнате». Это тренировка конструкций.
// Здесь другое упражнение и другой разговор. Ученик описывает НАСТОЯЩУЮ работу,
// а после ответа видит, что о ней говорил сам художник, — и почти всегда
// обнаруживает, что увидел не то, что автор вкладывал.
//
// Это и есть ценность блока: живая речь появляется там, где есть с чем не
// согласиться. «Спальня» Ван Гога читается как тревожная комната, а он писал
// про покой; в «Крике» кричит не человек, а природа; «Впечатление» Моне вообще
// получило имя случайно, а из насмешки критика вышло название целого течения.
// Такое расхождение — готовый повод сказать на чужом языке «а я вижу иначе,
// потому что…», то есть ровно то, ради чего задание и ставится.
//
// ЧТО МОЖНО ПОКАЗЫВАТЬ
// Только общественное достояние, по тем же двум юрисдикциям, что и в блоке
// «Сцены» (см. scenes/index.ts): автор умер до 1955 года И работа опубликована
// до 1930-го. Поэтому здесь нет ни современных выставок, ни обложек книг: их
// фотографии и репродукции — чужие охраняемые работы, и «мы же учим» этого не
// меняет. Файлы лежат локально в public/art (Викисклад не любит хотлинк), у
// каждой работы записана страница файла и год смерти автора — чтобы проверку
// не пришлось делать заново.
//
// ЧЕСТНОСТЬ В ПОЛЕ authorNote
// Туда идут только слова самого художника, с указанием, откуда они. Там, где
// таких слов не сохранилось (김홍도, Алмейда Жуниор), поле пустое, и вместо
// него работает `unintended` — то, что о работе говорят другие, названное
// своим именем. Придумать художнику цитату означало бы сломать ровно тот
// механизм, ради которого блок сделан.
// ─────────────────────────────────────────────────────────────────────────────

import { describeImage, type SeedTask } from './languageCourse'

/** Язык, на котором ученик описывает работу. */
export type ArtLang = 'en' | 'ko' | 'ja' | 'pt-BR'

/** Слова автора о собственной работе — показываются ПОСЛЕ ответа ученика. */
export interface AuthorNote {
  /** Перевод на русский: его читают все, независимо от языка курса. */
  ru: string
  /** Откуда это: письмо, дневник, колофон, интервью — с датой. */
  attribution: string
}

/** Задание на одном языке: формулировка и опоры для проверки. */
export interface ArtworkSupport {
  /** Условие задания — на языке курса или по-русски, как в остальных сидах. */
  prompt: string
  /** Что на работе действительно есть (для проверки ответа). */
  facts: string[]
  /** Чего на ней нет, но что легко приписать по шаблону. */
  notThere: string[]
  /** Какие конструкции ожидаем в ответе. */
  structures: string[]
}

export interface Artwork {
  id: string
  /** Русское название — по нему работу ищут. */
  title: string
  /** Название на языке оригинала. */
  origTitle: string
  artist: string
  year: number
  /** Путь к файлу в public. */
  image: string
  source: {
    /** Страница файла на Викискладе. */
    page: string
    /** Собрание, где хранится оригинал. */
    holder: string
    /** Год смерти автора — основание для общественного достояния. */
    artistDied: number
  }
  /** Слова художника об этой работе. Пусто — значит их не сохранилось. */
  authorNote?: AuthorNote
  /**
   * Чего автор не закладывал: смысл, который работа получила помимо него.
   * Пишется так, чтобы было видно, чей это смысл — зрителей, критика, эпохи.
   */
  unintended: string
  support: Partial<Record<ArtLang, ArtworkSupport>>
}

export const ARTWORKS: Artwork[] = [
  {
    id: 'wave',
    title: 'Большая волна в Канагаве', origTitle: '神奈川沖浪裏',
    artist: 'Кацусика Хокусай', year: 1831,
    image: '/art/wave.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Great_Wave_off_Kanagawa2.jpg',
      holder: 'Гравюра из серии «Тридцать шесть видов Фудзи»',
      artistDied: 1849,
    },
    authorNote: {
      ru: 'С шести лет у меня была мания рисовать очертания вещей. К пятидесяти я напечатал бесчисленное множество рисунков, но всё, что я сделал до семидесяти, не стоит внимания. В семьдесят три я немного понял строение животных, птиц, насекомых и рыб, жизнь трав и деревьев.',
      attribution: 'Хокусай, послесловие к «Ста видам Фудзи», 1834',
    },
    unintended: 'Волну почти все читают как цунами — так лист и называют в западных подписях. Хокусай изображал не цунами, а высокую прибойную волну в открытом море: в названии стоит 沖浪裏, «под волной в открытом море», и под ней три лодки-осибунэ, которые возили рыбу в Эдо. Второе, чего он не закладывал: гравюра стала знаком «японского» вообще — её ставят на обложки, футболки и эмодзи 🌊, а Фудзи в глубине кадра многие принимают за ещё одну маленькую волну.',
    support: {
      ja: {
        prompt: 'このうきよえを7つの文で説明してください。なにが手前にあって、なにが後ろにありますか。ふねはいくつありますか。「〜があります」「〜のなかに」「〜のうしろに」をつかってください。',
        facts: [
          'おおきななみが手前にあります',
          'なみのさきが手のようにわかれています',
          'ふねが三そうあります',
          'ふねに人がたくさんのっています',
          'うしろに富士山があります',
          '富士山はちいさく見えます',
          'そらはくらくて、白いあわが見えます',
        ],
        notThere: [
          'つなみだと書いてある（絵にはそう書いていません）',
          '人がおよいでいます（およいでいる人はいません）',
          'まちや家が見えます（見えません）',
        ],
        structures: ['〜があります / います', 'ばしょのことば：手前・うしろ・なか', 'かずのことば：三そう', '「〜のように見えます」'],
      },
      en: {
        prompt: 'Describe this print in at least seven sentences. Say what is in the foreground, what is in the background, and how many boats you can count. Then say what the picture makes you feel — and why exactly.',
        facts: [
          'A huge wave fills the left and centre of the picture',
          'The crest of the wave breaks into finger-like shapes',
          'There are three long boats under the wave',
          'The boats are full of rowers who are holding on',
          'Mount Fuji stands small in the background, in the centre',
          'The sky is dark and there is white foam in the air',
          'The colour is mostly deep blue and white',
        ],
        notThere: [
          'A ship is sinking (no boat is shown breaking up)',
          'People are swimming in the water',
          'A town or a harbour is visible',
        ],
        structures: ['there is / there are', 'prepositions of place: in the foreground, behind, under', 'counting: three boats', 'it looks like / it makes me think of'],
      },
    },
  },

  {
    id: 'ssireum',
    title: 'Борьба ссирым', origTitle: '씨름',
    artist: 'Ким Хондо (단원 김홍도)', year: 1780,
    image: '/art/ssireum.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Danwon_Ssireum.jpg',
      holder: 'Альбом «Данвон пхунсокто», Национальный музей Кореи',
      artistDied: 1806,
    },
    // Слов художника об этом листе не сохранилось — поле осознанно пустое.
    unintended: 'Ким Хондо ничего не написал об этом листе: остались только сам рисунок и альбом. Зато корейские искусствоведы спорят о двух деталях, и обе — не то, что автор «закладывал», а то, что в работе нашли потом. Первая: у зрителя слева руки нарисованы наоборот — левая на месте правой; одни считают это ошибкой, другие — умыслом, чтобы взгляд остановился. Вторая: единственный человек, который не смотрит на борьбу, — торговец сладостями ёт: он отвернулся и высматривает покупателей. Сегодня лист печатают на учебниках и купюрах как «портрет народной жизни», хотя это просто страница из альбома зарисовок.',
    support: {
      ko: {
        prompt: '이 그림을 일곱 문장 이상으로 설명해 보세요. 가운데에 누가 있어요? 사람들은 무엇을 하고 있어요? 그림에서 한 사람만 다른 곳을 보고 있어요 — 누구예요? 「-고 있어요」와 위치 표현(가운데, 옆, 뒤)을 쓰세요.',
        facts: [
          '가운데에서 두 사람이 씨름을 하고 있어요',
          '한 사람이 다른 사람을 들어 올리고 있어요',
          '사람들이 둥글게 앉아서 구경하고 있어요',
          '왼쪽에 엿장수가 서 있어요',
          '엿장수는 목판을 들고 있어요',
          '땅에 신발과 갓이 놓여 있어요',
          '어떤 사람들은 부채를 들고 있어요',
          '배경에는 아무것도 없어요',
        ],
        notThere: [
          '심판이 있어요 (심판은 없어요)',
          '여자들이 구경하고 있어요 (그림에는 남자들뿐이에요)',
          '나무와 산이 보여요 (배경은 비어 있어요)',
        ],
        structures: ['-고 있어요', '위치: 가운데, 왼쪽, 뒤, 옆', '-아/어 있어요 (놓여 있어요)', '-는 사람'],
      },
    },
  },

  {
    id: 'bedroom',
    title: 'Спальня в Арле', origTitle: 'De slaapkamer',
    artist: 'Винсент Ван Гог', year: 1888,
    image: '/art/bedroom.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_De_slaapkamer_-_Google_Art_Project.jpg',
      holder: 'Музей Ван Гога, Амстердам',
      artistDied: 1890,
    },
    authorNote: {
      ru: 'Здесь всё должен сделать цвет: придав вещам большей упрощённостью более значительный стиль, он должен наводить на мысль об отдыхе и сне вообще. Взгляд на картину должен давать голове — точнее, воображению — отдых.',
      attribution: 'Из письма Винсента Ван Гога брату Тео, Арль, октябрь 1888',
    },
    unintended: 'Почти все описывают эту комнату как тревожную: пол заваливается, стены сходятся, стулья стоят криво, второй стул пустой. Ван Гог хотел ровно противоположного — покоя и сна, и написал об этом Тео прямо. Расхождение объясняют по-разному: перекошенная перспектива, кислотные сочетания цветов, а ещё то, что мы знаем биографию художника и читаем картину через неё. Сам он о тревоге не писал ни слова.',
    support: {
      en: {
        prompt: 'Describe this room in at least eight sentences: the furniture, the colours, what is on the walls. Then answer in two or three sentences: does the room feel calm or uneasy to you, and what exactly makes you feel that?',
        facts: [
          'There is a wooden bed with red bedding on the right',
          'There are two chairs, one by the bed and one by the door',
          'There is a small table with a jug and a bowl',
          'Pictures and a mirror hang on the walls',
          'The window is closed and it is at the back of the room',
          'The walls are pale blue and the floor is brown',
          'There are clothes hanging on a peg',
          'There is nobody in the room',
        ],
        notThere: [
          'A person is sleeping in the bed (the room is empty)',
          'There is a lamp on the table',
          'You can see the street through the window',
        ],
        structures: ['there is / there are', 'prepositions: on the left, next to, above, at the back', 'adjectives of colour and feeling', 'because / that is why'],
      },
      ko: {
        prompt: '이 방을 여덟 문장 이상으로 설명해 보세요. 가구, 색깔, 벽에 있는 것을 말해 주세요. 그리고 두세 문장으로 답해 보세요: 이 방은 편안해 보여요, 불안해 보여요? 왜 그렇게 느껴요?',
        facts: [
          '오른쪽에 나무 침대가 있어요',
          '의자가 두 개 있어요',
          '작은 탁자 위에 주전자와 대야가 있어요',
          '벽에 그림과 거울이 걸려 있어요',
          '창문은 닫혀 있어요',
          '벽은 하늘색이고 바닥은 갈색이에요',
          '옷이 벽에 걸려 있어요',
          '방에는 아무도 없어요',
        ],
        notThere: [
          '침대에서 사람이 자고 있어요 (방은 비어 있어요)',
          '탁자 위에 램프가 있어요',
          '창문으로 거리가 보여요',
        ],
        structures: ['-이/가 있어요', '위치: 위, 옆, 오른쪽, 벽에', '-아/어 보여요', '-아서/어서 (이유)'],
      },
    },
  },

  {
    id: 'scream',
    title: 'Крик', origTitle: 'Skrik',
    artist: 'Эдвард Мунк', year: 1893,
    image: '/art/scream.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Edvard_Munch,_1893,_The_Scream,_oil,_tempera_and_pastel_on_cardboard,_91_x_73_cm,_National_Gallery_of_Norway.jpg',
      holder: 'Национальная галерея, Осло',
      artistDied: 1944,
    },
    authorNote: {
      ru: 'Я шёл по дороге с двумя друзьями. Солнце садилось. Небо вдруг стало кроваво-красным. Я остановился, смертельно усталый, и оперся о перила. Над сине-чёрным фьордом и городом висели кровь и языки огня. Друзья пошли дальше, а я стоял, дрожа от тревоги, — и чувствовал, как сквозь природу проходит бесконечный крик.',
      attribution: 'Дневниковая запись Эдварда Мунка, Ницца, 22 января 1892',
    },
    unintended: 'Почти все понимают картину так: человек кричит. По записи самого Мунка кричит не он, а природа, — а фигура на мосту зажимает уши, чтобы этого не слышать. Второй смысл, которого автор точно не закладывал: за сто лет «Крик» стал знаком паники вообще — маской из фильма ужасов, эмодзи 😱 и подписью к любому дедлайну. От картины о конкретном вечере на дороге у Осло осталась картинка «мне плохо».',
    support: {
      en: {
        prompt: 'Describe this painting in at least seven sentences: the figure, the bridge, the sky, the two people behind. Then answer: who is screaming here, in your opinion, and how do you know?',
        facts: [
          'A figure stands on a bridge in the foreground',
          'The figure holds both hands to its head',
          'Its mouth is open and its face has no hair or clear features',
          'Two small figures walk away in the background of the bridge',
          'The sky is orange and red with wavy lines',
          'There is a blue-black fjord with two small boats',
          'The lines of the sky and the water repeat the shape of the head',
        ],
        notThere: [
          'The figure is running (it is standing still)',
          'The two people behind are looking at the figure',
          'It is night (the sky is a sunset)',
        ],
        structures: ['present continuous: is standing, is holding', 'prepositions: on, behind, in the background', 'it looks as if / it seems that', 'in my opinion, because'],
      },
    },
  },

  {
    id: 'sunrise',
    title: 'Впечатление. Восходящее солнце', origTitle: 'Impression, soleil levant',
    artist: 'Клод Моне', year: 1872,
    image: '/art/sunrise.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Claude_Monet,_Impression,_soleil_levant.jpg',
      holder: 'Музей Мармоттан-Моне, Париж',
      artistDied: 1926,
    },
    authorNote: {
      ru: 'Меня попросили дать название для каталога, а «вид Гавра» тут не годился. Я ответил: поставьте «Впечатление».',
      attribution: 'По позднейшему рассказу самого Моне о выставке 1874 года',
    },
    unintended: 'Слово было проходным — так Моне отговорился от каталога. Критик Луи Леруа взял его в заголовок издевательской рецензии «Выставка импрессионистов» (1874) и написал, что обои в стадии заготовки выглядят законченнее этого морского вида. Насмешка прижилась, и художники сами стали называть себя импрессионистами: название целого направления выросло из слова, которое автор не считал названием.',
    support: {
      en: {
        prompt: 'Describe this painting in at least six sentences: the colours, the water, the boats, the sun. Then answer in two or three sentences: why do you think people in 1874 said it looked unfinished?',
        facts: [
          'A small orange sun is low over the water',
          'The sun leaves an orange reflection on the water',
          'There are two or three small boats with dark figures in them',
          'Masts and cranes of a harbour appear behind the mist',
          'The colours are grey-blue with orange',
          'The brushstrokes are visible and nothing has a sharp outline',
        ],
        notThere: [
          'The sun is setting (the title says it is rising)',
          'You can see faces of the people in the boats',
          'There are buildings in sharp detail',
        ],
        structures: ['colours and light: pale, misty, blurred', 'there is / there are', 'seem / look + adjective', 'linking: although, whereas'],
      },
    },
  },

  {
    id: 'caipira',
    title: 'Кайпира режет табак', origTitle: 'Caipira picando fumo',
    artist: 'Алмейда Жуниор', year: 1893,
    image: '/art/caipira.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Caipira_picando_fumo.jpg',
      holder: 'Пинакотека штата Сан-Паулу',
      artistDied: 1899,
    },
    unintended: 'Слов художника об этой работе не сохранилось — он почти не писал о своих картинах. Зато сохранилось то, что с ней сделали потом: в XX веке «Кайпира» стал знаком национальной темы, картинку печатали в учебниках как «портрет бразильской деревни», а фигуру читали то как бедность, то как достоинство. Для самого Алмейды Жуниора это была прежде всего работа со светом: полуденное солнце, которое он писал не в мастерской, а на родине, в Итý.',
    support: {
      'pt-BR': {
        prompt: 'Descreva este quadro em pelo menos sete frases: o homem, a roupa, as mãos, o chão, a parede. Depois responda em duas ou três frases: que horas do dia são, e como você sabe?',
        facts: [
          'Um homem está sentado num tronco de madeira',
          'Ele está descalço',
          'Ele usa uma camisa branca e uma calça arregaçada',
          'Ele segura uma faca e um pedaço de fumo nas mãos',
          'Ele tem um palito atrás da orelha',
          'Atrás dele há uma parede de taipa com o reboco caindo',
          'No chão há lascas de madeira e sombras curtas',
          'A luz é muito forte, de sol alto',
        ],
        notThere: [
          'Ele está fumando (ele está cortando o fumo, não fumando)',
          'Há outras pessoas no quadro',
          'É de noite (as sombras mostram sol forte)',
        ],
        structures: ['estar + gerúndio: está segurando, está sentado', 'lugar: atrás de, no chão, na parede', 'ter / haver para descrever', 'porque, por isso'],
      },
    },
  },

  {
    id: 'hunters',
    title: 'Охотники на снегу', origTitle: 'Jagers in de sneeuw',
    artist: 'Питер Брейгель Старший', year: 1565,
    image: '/art/hunters.jpg',
    source: {
      page: 'https://commons.wikimedia.org/wiki/File:Pieter_Bruegel_the_Elder,_Hunters_in_the_Snow_(Winter).jpg',
      holder: 'Музей истории искусств, Вена',
      artistDied: 1569,
    },
    unintended: 'Картину знают как «зиму вообще» — она висит на открытках и обложках как уютный снежный вид. Брейгель писал не зиму как настроение, а месяц: это один лист из цикла о временах года для дома антверпенского купца. И охота на нём неудачная: у охотников одна лисица на троих, собаки идут понуро, а деревня внизу занята работой, а не праздником. Отдельный слой, которого автор точно не закладывал: у Тарковского в «Солярисе» эта картина висит на космической станции и стала для нескольких поколений «изображением Земли».',
    support: {
      en: {
        prompt: 'Describe this painting in at least eight sentences: the hunters, the dogs, the village, the ice, the birds. Then answer: has the hunt gone well or badly, and which details tell you that?',
        facts: [
          'Three hunters walk away from us, downhill, on the left',
          'A pack of dogs follows them with lowered heads',
          'One hunter carries a single fox on his shoulder',
          'People are skating and playing on the frozen ponds below',
          'There is a village with snow-covered roofs',
          'Bare trees stand in a row along the slope',
          'Black birds sit in the trees and one flies over the valley',
          'Mountains rise in the background, behind the village',
        ],
        notThere: [
          'The hunters are carrying a deer',
          'It is snowing at this moment',
          'The village is empty',
        ],
        structures: ['present continuous for a scene', 'prepositions: in the foreground, below, along, behind', 'quantity: a few, several, a single', 'evidence: this shows that, judging by'],
      },
    },
  },
]

/** Работа по ключу — для конструктора и отладки. */
export const artworkById = (id: string): Artwork | undefined =>
  ARTWORKS.find(a => a.id === id)

/** Работы, у которых есть опоры для этого языка. */
export const artworksForLang = (lang: ArtLang): Artwork[] =>
  ARTWORKS.filter(a => a.support[lang])

/**
 * Текст, который открывается ПОСЛЕ ответа.
 *
 * Порядок здесь важен: сначала слова художника, потом чужие смыслы. Если
 * поставить наоборот, ученик прочитает готовую трактовку и уже не заметит, что
 * автор говорил о другом, — а весь смысл задания именно в этом зазоре.
 */
export function artworkAfterNote(a: Artwork): string {
  const head = `${a.artist}. ${a.title} (${a.origTitle}), ${a.year}. ${a.source.holder}.`
  const author = a.authorNote
    ? `Что говорил сам автор:\n«${a.authorNote.ru}»\n— ${a.authorNote.attribution}`
    : 'Слов самого автора об этой работе не сохранилось.'
  return `${head}\n\n${author}\n\nЧего автор не закладывал:\n${a.unintended}`
}

/**
 * Задание по работе: описать своими словами, потом прочитать автора.
 *
 * Возвращает null, если для этого языка опор нет: молча собрать задание без
 * фактов значило бы отдать проверяющему описание, с которым нечего сверить.
 */
export function artworkTask(
  a: Artwork,
  lang: ArtLang,
  opts: { responseMode?: 'write' | 'speak'; responseSeconds?: number } = {},
): SeedTask | null {
  const s = a.support[lang]
  if (!s) return null
  return describeImage(s.prompt, a.image, {
    responseMode: opts.responseMode ?? 'write',
    responseSeconds: opts.responseSeconds ?? (opts.responseMode === 'speak' ? 120 : 900),
    facts: s.facts,
    distractorFacts: s.notThere,
    expectedStructures: s.structures,
    afterNote: artworkAfterNote(a),
  })
}

/**
 * То же самое по ключу работы — так это и вставляется в курсы-сиды.
 *
 * Ошибка в ключе или в языке роняет сборку сида сразу, а не оставляет юнит без
 * задания: сид собирается детерминированно, и молчаливая дыра в нём нашлась бы
 * только у ученика.
 */
export function art(
  id: string,
  lang: ArtLang,
  opts: { responseMode?: 'write' | 'speak'; responseSeconds?: number } = {},
): SeedTask {
  const a = artworkById(id)
  if (!a) throw new Error(`artworks: нет работы «${id}»`)
  const task = artworkTask(a, lang, opts)
  if (!task) throw new Error(`artworks: у работы «${id}» нет опор для языка ${lang}`)
  return task
}
