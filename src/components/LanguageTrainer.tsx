import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Headphones, Layers, Mic, Blocks, Compass, ChevronLeft, CheckCircle2, XCircle, HelpCircle, SlidersHorizontal, Eye, Sparkle, Volume2, ListChecks, Check, RotateCcw, Library, Quote, Ear, Languages, ArrowRight, AlignLeft, Rows3, BookMarked, Repeat, MessagesSquare, ExternalLink, Puzzle, Hash, AudioLines } from 'lucide-react'
import { textsForLang, type ReadingText, type ReadingQuestion, type Gloss } from '../data/readingLibrary'
import { loadFeed, feedCount, hasFeed, materialsWord, dayLabel, feedFilters, matchesFilter, type FeedFilter, type FeedItem } from '../data/feed'
import { outletById } from '../data/feed/outlets'
import { languageTaxonomy } from '../data/languageTaxonomy'
import { listeningForLang, type ListeningItem } from '../data/listeningLibrary'
import { questionRu } from '../data/questionRu'
import AudioPlayer from './AudioPlayer'
import TrackPlayer from './trainer/TrackPlayer'
import VoicePicker, { useVoiceChoice } from './trainer/VoicePicker'
import { subjectTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { getSubject, type TrainerMode } from '../lib/subjects'
import { useSwipeBack } from '../lib/useSwipeBack'
import { bindShortWords, proseWrap, balancedWrap } from '../lib/typography'
import CardDeck, { DECK_CTA } from './CardDeck'
import PhraseDecks, {
  ThemeSession, PhraseRun, BackToSets, TakeWholeTheme, DeckHint, themeStats,
  type PhraseView, type RunMode,
} from './PhraseDecks'
import TrainerShell, {
  useTrainerNarrow, type TrainerNav,
  RailHero, RailCard, RailModes, RailSegment, RailList, RailToggle, RailStat,
  Toolbar, SearchPill, StatusTabs, ToolButton, SortMenu, FilterMenu, ToolCount, plural,
  Tile, TileGrid, TileMeter, TileChip, Empty as ShellEmpty, PILL_GLASS,
} from './trainer/TrainerShell'
import { SubjectHero, SubjectPill } from './trainer/SubjectSwitch'
import type { TrainerSubjectState } from '../lib/trainerSubject'
import { addCards, collectedCards, deckOwner, dueCount, deckStates, forgetCard, type CardState, type ReviewCard } from '../data/reviewDeck'
import { hasSurvivalBook, loadSurvivalBook } from '../data/survivalBooks'
// setCards переименован при импорте: в этом файле уже есть сеттер состояния
// с тем же именем, и без псевдонима вызов молча уходил бы в него.
import { fetchCardGroups, appFlag, isShelf, setCards as allSetCards, type CardGroup } from '../lib/cardGroups'
import { hasCardSeeds, loadCardSeeds } from '../data/cardGroupSeeds'
import MySetEditor, { emptyMyGroup } from './trainer/MySetEditor'
import { hasWordPacks, loadWordPacks } from '../data/wordPackBooks'
import { hasStory, loadStory } from '../data/languageGuides'
import { hasTextbooks, textbooksForLang } from '../data/textbooks'
import { useGuideMode } from './trainer/modes/useGuideMode'
import { useGrammarMode } from './trainer/modes/useGrammarMode'
import { useSpeakingMode } from './trainer/modes/useSpeakingMode'
import { useBlocksMode } from './trainer/modes/useBlocksMode'
import type { LanguageStory } from '../data/languageStory'
import { allPacks, wordPackShelves, type WordPackBook } from '../data/wordPacks'
import {
  hasScenes, loadScenes, sceneCount, scenesWord, shelvesForLang, worksForLang, workById,
  type Scene, type Work,
} from '../data/scenes'
import { WorkGrid, WorkPage } from './trainer/SceneShelf'
import { FeedList, FeedTabs } from './trainer/FeedShelf'
import { useAppUpdate } from '../lib/appUpdate'
import TaskVideo from './TaskVideo'
import {
  bootTrainerLink, sameLang, takeBootTrainerLink, trainerShareUrl, writeTrainerHash,
  type TrainerLink,
} from '../lib/trainerLink'
import ScoreReader, { hasReadings } from './trainer/ScoreReader'
import {
  survivalShelves, survivalLevelLabel, SURVIVAL_LEVELS,
  type SurvivalBook, type SurvivalThemeCards,
} from '../data/survivalPhrases'
import { hasNests, nestById, nestsForLang, nestsUpTo } from '../data/soundNests'
import { NestGrid, NestPage } from './trainer/SoundNestDrill'
import {
  MyWordsSession, MyWordsTile, myWordsFrom, myWordsStats, MY_WORDS_ID, type MyWord,
} from './trainer/MyWords'
import { allResults, resultFrom, saveResult, type MaterialKind } from '../lib/trainerProgress'
import { courseReach, reachLevelIndex, reachNote } from '../lib/courseReach'
import GlossedText from './GlossedText'
import Coachmarks, { type CoachStep } from './Coachmarks'
import Skeleton from './Skeleton'
import { hasLexicon, wordReading } from '../lib/lexicon'
import { useGloss } from '../lib/useGloss'
import { usePersistentState } from '../lib/useDraft'
import { useScreenTop } from '../lib/useScreenTop'
import { subjectAliases, useStudentData } from '../store/studentDataStore'
import { useTrainerProgress, useTrainerEngaged } from '../store/trainerProgressStore'

// Тренажёр для языковых предметов.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ КОМПОНЕНТ. Обычный тренажёр — это банк заданий ЕГЭ: карточка
// «условие → поле ответа → сверка строки». У языков банка нет вовсе
// (SUBJECTS[...].hasBank === false), и главное — язык так не тренируется:
// нужно читать, слушать, повторять слова и говорить, а не решать номера.
//
// ЧТО ЗДЕСЬ ЕСТЬ И ЧЕГО НЕТ. Чтение работает полностью. Слова переиспользуют
// готовую систему интервальных повторений. Аудирование пока опирается на
// ссылки к урокам курса, а не на собственную библиотеку. Говорение записывает
// ответ и отдаёт учителю — автоматической оценки произношения нет.

type Mode = 'reading' | 'vocab' | 'listening' | 'speaking' | 'blocks' | 'grammar' | 'guide'

/**
 * Половины вкладки «Чтение». Не режимы: у всех трёх одна читалка, один словарь
 * по клику и одна запись результата. Разное у них только то, КАК выбирают
 * материал — фильтром, по обложке или по дате.
 */
type ReadingView = 'texts' | 'scenes' | 'feed'

/**
 * Режим экрана → возможность предмета в реестре.
 *
 * Имена разошлись по возрасту: здесь колода карточек с самого начала зовётся
 * `vocab`, а в реестре — `cards`, потому что там она общая с банком заданий,
 * где никакого «вокабуляра» нет. Переименовывать местный `vocab` по всему
 * файлу ради одной строчки дороже, чем держать перевод в одном месте.
 */
const MODE_CAP: Record<Mode, TrainerMode> = {
  reading: 'reading', vocab: 'cards', listening: 'listening',
  speaking: 'speaking', blocks: 'blocks', grammar: 'grammar', guide: 'guide',
}

const MODES: { id: Mode; label: string; hint: string; Icon: typeof BookOpen }[] = [
  { id: 'reading',   label: 'Чтение',     hint: 'Тексты с вопросами',       Icon: BookOpen },
  { id: 'vocab',     label: 'Карточки',   hint: 'Свайп: знаю / не помню',   Icon: Layers },
  { id: 'listening', label: 'Аудирование', hint: 'Лекции и разговоры',      Icon: Headphones },
  { id: 'speaking',  label: 'Говорение',  hint: 'Записать и отправить',     Icon: Mic },
  // Пятый режим — не «ещё одна библиотека», а другой взгляд на язык: не «выучи
  // слово», а «увидь, из чего оно собрано». Появляется только у языков, где
  // такая сборка вообще описана (см. blocksOn).
  { id: 'blocks',    label: 'Конструктор', hint: 'Из чего собраны слова',    Icon: Blocks },
  // Шестой режим — справочник, а не курс. В курс приходят с вопросом «что
  // дальше», сюда — с вопросом «чем 은/는 отличается от 이/가», и на него урок
  // номер двенадцать не отвечает: форму надо найти, а не пройти. Появляется у
  // языков, для которых справочник написан (см. data/grammar).
  { id: 'grammar',   label: 'Грамматика', hint: 'Справочник форм',          Icon: BookMarked },
  // Седьмой режим отвечает на вопрос, которого нет ни у одного из остальных:
  // ПОЧЕМУ язык такой. Справочник объясняет форму, курс ведёт по программе, а
  // «почему хангыль устроен именно так» и «по какому учебнику заниматься» не
  // спрашивает никто из них — при том, что оба вопроса человек задаёт на
  // первой неделе и уходит за ответом наружу.
  { id: 'guide',     label: 'О языке',    hint: 'Как устроен и что читать',  Icon: Compass },
]

/** Две половины вкладки «О языке»: рассказ и полка учебников. */
type GuideView = 'story' | 'books'

/**
 * Две половины «Конструктора».
 *
 * `stems` — основа глагола и хвосты (одна основа, восемь смыслов), `roots` —
 * корень-кирпич и его слова (одно знание, семь слов). Материал разный, движение
 * одно: слово разложено на плитки, и одна плитка ставится вручную.
 *
 * `sounds` — правила чтения: почему написанное звучит иначе. Стоит в
 * «Конструкторе», а не в «Карточках» рядом с созвучиями: гнездо тренирует ухо
 * на готовых словах, а правило — тот же взгляд «из чего собрано», только про
 * звук, и открывается оно так же — витриной материалов с прогоном.
 */
type BlocksView = 'stems' | 'roots' | 'numbers' | 'sounds'

/**
 * Корзины длительности — общий фильтр чтения и аудирования.
 *
 * Выбирают материал именно так: «есть десять минут» или «есть три». Уровень и
 * тема отвечают на вопрос «потяну ли», длительность — на «влезет ли сейчас», и
 * без неё библиотека фильтруется только по первому.
 */
const LENGTHS: { value: string; label: string; fit: (m: number) => boolean }[] = [
  { value: 's', label: 'до 3 мин', fit: m => m <= 3 },
  { value: 'm', label: '3–5 мин', fit: m => m > 3 && m <= 5 },
  { value: 'l', label: 'больше 5 мин', fit: m => m > 5 },
]

/** Пересечение выбранного списка со значением. Пустой список = «все». */
const anyOf = (picked: string[], value: string) => picked.length === 0 || picked.includes(value)

/**
 * Три половины вкладки «Карточки».
 *
 * `sets` — готовый разговорник по ситуациям, `packs` — наборы слов пачками,
 * `decks` — группы наборов, собранные учителем (и подборки-сиды),
 * `due` — личная колода повторений, `nests` — гнёзда созвучий. Последнее стоит именно здесь, а не отдельным
 * режимом рядом с «Чтением»: гнездо тоже работает через колоду (ошибки уходят
 * в SM-2), и пятая таблетка в рейле ради одного экрана — перебор.
 */
// 'decks' — бывшая половина «Подборки». Наборы групп переехали в «Наборы»
// (полка стала папкой в витрине), но значение остаётся в типе: оно лежит в
// localStorage у всех, кто там был, и его надо чем-то прочитать, чтобы увести.
type VocabView = 'due' | 'sets' | 'nests' | 'packs' | 'decks'

export default function LanguageTrainer({ lang, subject, subjectId, dark, subjectState }: {
  /** Код изучаемого языка: en, ko, ja, pt-BR. */
  lang: string
  /** Русское название предмета — для палитры. */
  subject: string
  /** Слаг предмета — по нему берётся владелец колоды повторений. */
  subjectId: string
  dark: boolean
  /**
   * Выбор предмета — общий с банком заданий, поэтому приходит сверху, а не
   * заводится здесь: два вызова useTrainerSubject() держали бы два независимых
   * «текущих предмета», и переключение в языковом тренажёре не долетало бы до
   * банка (и наоборот).
   */
  subjectState: TrainerSubjectState
}) {
  const t = useT()
  const palette = subjectTheme(subject, dark)
  // Где ученик стоял, туда F5 его и возвращает: режим и открытый материал живут
  // в sessionStorage вкладки, а не только в памяти компонента. Иначе любая
  // перезагрузка посреди текста — это возврат к списку и поиск заново.
  // Открытое храним идентификатором, а не объектом: материал приезжает из
  // библиотеки языка, и сохранённая копия рано или поздно разойдётся с ней.
  // Телефон: режимы и половины уехали в нижнюю навигацию (см. nav ниже), и в
  // шторке фильтров их рисовать больше нельзя — один и тот же переключатель
  // двумя экземплярами на одном экране. Ширина нужна уже здесь: от неё зависит
  // набор половин «Чтения» (см. feedLib).
  const narrow = useTrainerNarrow()

  const [mode, setMode] = usePersistentState<Mode>(`trainer.${lang}.mode`, 'reading')
  const [openTextId, setOpenTextId] = usePersistentState<string | null>(`trainer.${lang}.text`, null)
  const [openAudioId, setOpenAudioId] = usePersistentState<string | null>(`trainer.${lang}.audio`, null)

  // Предмет передаётся вторым аргументом: у русского и литературы общий язык,
  // и без него «Чтение» показывало бы одну полку на два предмета
  // (см. textsForLang в data/readingLibrary).
  const allTexts = useMemo(() => textsForLang(lang, subjectId), [lang, subjectId])

  // Предмет, а не только язык: у «Русского» и «Литературы» он общий (ru), а
  // материал разный — см. `subject` в ListeningItem.
  const audio = useMemo(() => listeningForLang(lang, subjectId), [lang, subjectId])

  // ── Сцены: библиотека отрывков внутри «Чтения» ─────────────────────────────
  //
  // Вторая половина вкладки, а не пятый режим. Сцена — это ReadingText с
  // добавленными полями: она идёт через ту же читалку, тот же словарь по клику
  // и ту же запись результата. Отдельный режим означал бы вторую копию фильтров
  // и вторую читалку, которая разойдётся с первой на первой же правке.
  const [readingViewSaved, setReadingView] = usePersistentState<ReadingView>(`trainer.${lang}.readingView`, 'feed')
  const [openWorkId, setOpenWorkId] = usePersistentState<string | null>(`trainer.${lang}.work`, null)
  const [openSceneId, setOpenSceneId] = usePersistentState<string | null>(`trainer.${lang}.scene`, null)
  const [hideSpoilers, setHideSpoilers] = usePersistentState<boolean>(`trainer.${lang}.spoilers`, true)
  const [sceneShelf, setSceneShelf] = useState('')
  const [scenePlatforms, setScenePlatforms] = useState<string[]>([])
  const [sceneTags, setSceneTags] = useState<string[]>([])
  const [sceneLevels, setSceneLevels] = useState<string[]>([])

  const sceneLib = hasScenes(lang)

  // ── Ленты в телефонном тренажёре нет ───────────────────────────────────────
  //
  // Она стоит целым экраном на главной, и вторая её копия под чипсом «Лента» —
  // это тот же материал, отданный дважды: на узком экране половины «Чтения»
  // умещаются по одной, и лишняя из трёх отодвигает сцены на второй тап.
  // Поэтому с телефона первой половиной идут сцены, а сохранённая «Лента»
  // (её мог выбрать тот же ученик с ноутбука) молча читается как «Сцены» —
  // переписывать хранимое нельзя, иначе выбор потеряется и на десктопе.
  const feedLib = hasFeed(lang) && !narrow
  const readingView: ReadingView =
    readingViewSaved === 'feed' && !feedLib ? (sceneLib ? 'scenes' : 'texts') : readingViewSaved
  const sceneWorks = useMemo(() => worksForLang(lang), [lang])
  const sceneShelves = useMemo(() => shelvesForLang(lang), [lang])

  // Тексты сцен приезжают отдельным чанком и только когда вкладку открыли:
  // у того, кто читает учебные тексты, нет причин возить с собой Достоевского,
  // Акутагаву и Машаду разом. Язык хранится рядом со списком — при смене
  // предмета старый список сам перестаёт считаться загруженным.
  const [sceneData, setSceneData] = useState<{ lang: string; list: Scene[] } | null>(null)
  const scenes = sceneData?.lang === lang ? sceneData.list : undefined

  // Сколько сцен у языка — независимо от того, приехал чанк или нет: до
  // загрузки берём число из реестра, после — длину самого списка (реестр может
  // отстать от файла, список — никогда).
  const scenesTotal = scenes?.length ?? sceneCount(lang)

  useEffect(() => {
    if (!sceneLib || mode !== 'reading' || readingView !== 'scenes' || scenes !== undefined) return
    let alive = true
    loadScenes(lang).then(list => { if (alive) setSceneData({ lang, list }) })
    return () => { alive = false }
  }, [sceneLib, mode, readingView, scenes, lang])

  // ── Лента: третья половина «Чтения» ────────────────────────────────────────
  //
  // Устроена как сцены и по той же причине: материал приезжает отдельным
  // чанком, а количество известно синхронно из реестра — иначе бейдж «Чтение»
  // в меню режимов показывал бы ленту нулём, пока её не откроют.
  //
  // Открытого материала у ленты НЕТ и быть не может: пост читается,
  // проигрывается и обсуждается на месте. Поэтому здесь нет ни openFeedId, ни
  // «чем открыли» — состояния, которое пришлось бы восстанавливать после F5.

  const [feedData, setFeedData] = useState<{ lang: string; list: FeedItem[] } | null>(null)
  const feed = feedData?.lang === lang ? feedData.list : undefined
  const feedTotal = feed?.length ?? feedCount(lang)

  // ПОВОРОТ ЛЕНТЫ — «Видео», «Наука», «Новости». Не выбор материала: выбранное
  // остаётся лентой по дням, просто уже одного рода. Ряд собирается по тому,
  // что реально приехало (feedFilters), и живёт per-язык: у корейской ленты
  // свои темы, и чипс «Здоровье», выбранный в ней, ничего не значит в
  // португальской — там его в ряду нет вовсе.
  const [feedFilter, setFeedFilter] = usePersistentState<FeedFilter>(`trainer.${lang}.feedFilter`, 'all')
  const feedChips = useMemo(() => feedFilters(feed ?? []), [feed])
  // Чипс мог исчезнуть из ряда: язык сменился, ночная сборка унесла последний
  // ролик. Выборка по кнопке, которой на экране нет, читается как пустая лента.
  const feedPick: FeedFilter = feedChips.some(c => c.id === feedFilter) ? feedFilter : 'all'
  const feedShown = useMemo(
    () => (feed ?? []).filter(x => matchesFilter(x, feedPick)),
    [feed, feedPick],
  )

  // ТЯГА СВЕРХУ. Материалы ленты приезжают со сборкой, поэтому обновлять
  // список в памяти бессмысленно — спрашиваем сервер, нет ли новой сборки.
  // Есть — таблетка обновления сама предложит её забрать.
  const refreshFeed = useCallback(async () => {
    await useAppUpdate.getState().check(true)
    const list = await loadFeed(lang)
    setFeedData({ lang, list })
  }, [lang])

  useEffect(() => {
    if (!feedLib || mode !== 'reading' || readingView !== 'feed' || feed !== undefined) return
    let alive = true
    loadFeed(lang).then(list => { if (alive) setFeedData({ lang, list }) })
    return () => { alive = false }
  }, [feedLib, mode, readingView, feed, lang])

  const scenesOf = useMemo(() => {
    const byWork = new Map<string, Scene[]>()
    for (const s of scenes ?? []) {
      const list = byWork.get(s.workId)
      if (list) list.push(s)
      else byWork.set(s.workId, [s])
    }
    for (const list of byWork.values()) list.sort((a, b) => a.order - b.order)
    return (workId: string) => byWork.get(workId) ?? []
  }, [scenes])

  // Произведение ищется СРЕДИ ПРОИЗВЕДЕНИЙ ЯЗЫКА, а не по всему реестру: id из
  // чужой ссылки (или из памяти другого предмета) иначе открывал бы корейский
  // рассказ в английском — с пустым списком сцен, потому что сцены приезжают
  // английские. Не нашли — просто витрина полок.
  const openWork: Work | null = openWorkId ? sceneWorks.find(w => w.id === openWorkId) ?? null : null
  const openScene: Scene | null = useMemo(
    () => (openSceneId ? (scenes ?? []).find(s => s.id === openSceneId) ?? null : null),
    [scenes, openSceneId],
  )

  // Материал мог исчезнуть из библиотеки — тогда просто открывается список.
  const openText = useMemo(
    () => (openTextId ? allTexts.find(x => x.id === openTextId) ?? null : null),
    [allTexts, openTextId],
  )
  const openAudio = useMemo(
    () => (openAudioId ? audio.find(x => x.id === openAudioId) ?? null : null),
    [audio, openAudioId],
  )

  // ── Фильтры библиотек ──────────────────────────────────────────────────────
  //
  // Та же разметка, что у заданий: уровень / навык / тема плюс длительность.
  // Множественный выбор, а не одиночный: «покажи A1 и A2» — нормальный запрос,
  // а старые чипсы позволяли только одно значение на ось.
  //
  // В списки попадают только те значения, которые реально встречаются в
  // материалах: иначе ученик выбирает «B2» и получает пустой экран.
  const tax = useMemo(() => languageTaxonomy(subject), [subject])
  const present = (values: string[], order: string[]) => {
    const found = new Set(values)
    const ordered = order.filter(v => found.has(v))
    // Значения вне таксономии всё равно показываем — иначе материал с
    // нестандартной пометкой станет недоступен через фильтр.
    const rest = [...found].filter(v => !order.includes(v))
    return [...ordered, ...rest]
  }

  const [fLevel, setFLevel] = useState<string[]>([])
  const [fSkill, setFSkill] = useState<string[]>([])
  const [fTopic, setFTopic] = useState<string[]>([])
  const [fLen, setFLen] = useState<string[]>([])

  // Общая строка управления — одна на все режимы, поэтому и состояние общее.
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('order')

  // Говорение считает свои задания само (список собирается из разговорника), а
  // рейлу и строке нужны только числа — поэтому они поднимаются оттуда сюда.
  // Открытое задание говорения живёт здесь, а не внутри режима: выход из
  // карточки — кнопка общей строки управления, как «К списку» в чтении.

  // Смена режима сбрасывает выборку: фильтры у режимов разные, и «Уровень B1»,
  // унесённый из чтения в аудирование, молча прячет половину записей.
  function switchMode(m: Mode) {
    setMode(m)
    setFLevel([]); setFSkill([]); setFTopic([]); setFLen([])
    setQuery(''); setStatus(''); setSort('order')
    // Вид задания говорения сбрасывается вместе с открытым — оба внутри режима.
    setSceneShelf(''); speaking.reset()
  }

  /** Переключение половин «Конструктора». Открытое при этом закрывается. */

  /** Переключение половин «Чтения». Открытое произведение при этом закрывается. */
  function switchReadingView(v: ReadingView) {
    setReadingView(v)
    setOpenWorkId(null); setOpenSceneId(null)
    setQuery(''); setStatus(''); setSceneShelf('')
    setFLevel([]); setFSkill([]); setFTopic([]); setFLen([])
  }

  // Результаты по материалам — из localStorage, см. lib/trainerProgress.ts.
  // Читаются один раз на отрисовку списка, а не на каждую карточку.
  const [resultsKey, setResultsKey] = useState(0)
  const results = useMemo(() => allResults(), [resultsKey])

  /** Открыта ли вторая половина «Чтения» — витрина сцен. */
  const scenesOn = mode === 'reading' && readingView === 'scenes' && sceneLib
  /** Третья половина — лента. */
  const feedOn = mode === 'reading' && readingView === 'feed' && feedLib

  const isLang = (mode === 'reading' && !scenesOn && !feedOn) || mode === 'listening'
  const pool = mode === 'listening' ? audio : allTexts
  const kind: MaterialKind = mode === 'listening' ? 'listening' : 'reading'

  const levelOpts = useMemo(() => present(pool.map(x => x.level), tax?.levels ?? []), [pool, tax])
  const topicOpts = useMemo(() => present(pool.map(x => x.topic), tax?.topics ?? []), [pool, tax])
  const skillOpts = useMemo(() => present(allTexts.map(x => x.skill), tax?.skills ?? []), [allTexts, tax])

  /** Отфильтрованная и отсортированная библиотека текущего режима. */
  const library = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = pool.filter(x => {
      if (!anyOf(fLevel, x.level)) return false
      if (!anyOf(fTopic, x.topic)) return false
      if (mode === 'reading' && !anyOf(fSkill, (x as ReadingText).skill)) return false
      if (fLen.length > 0 && !LENGTHS.some(l => fLen.includes(l.value) && l.fit(x.minutes))) return false
      if (status === 'new' && resultFrom(kind, x.id, results)) return false
      if (status === 'done' && !resultFrom(kind, x.id, results)) return false
      if (q && !`${x.title} ${x.topic} ${t(x.topic)}`.toLowerCase().includes(q)) return false
      return true
    })
    if (sort === 'level') out.sort((a, b) => levelOpts.indexOf(a.level) - levelOpts.indexOf(b.level))
    if (sort === 'short') out.sort((a, b) => a.minutes - b.minutes)
    return out
  }, [pool, fLevel, fTopic, fSkill, fLen, status, query, sort, kind, results, levelOpts, mode, t])

  // ── Витрина сцен ───────────────────────────────────────────────────────────
  //
  // Произведения фильтруются полкой и поиском, а уровнем и длительностью — нет:
  // книгу выбирают по автору и по тому, читал ли её раньше, а уровень стоит уже
  // у сцены. Фильтр «покажи мне B1-книги» отсеял бы «Идиота» целиком из-за
  // одного трудного отрывка.
  // Платформа и тематика — фильтры строки, а не рейла: полка отвечает на вопрос
  // «что за литература», а эти два — «где смотрел» и «про что», и их выбирают,
  // уже глядя на сетку. Списки собираются из самих произведений, а не задаются
  // константой: добавили сериал на Hulu — Hulu появился в фильтре сам.
  //
  // Порядок по числу произведений, а не по алфавиту: наверху меню оказывается
  // то, что реально что-то покажет, а не «абсурд · 1».
  const platformOpts = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of sceneWorks) if (w.platform) n.set(w.platform, (n.get(w.platform) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }))
  }, [sceneWorks])

  const tagOpts = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of sceneWorks) for (const tag of w.tags) n.set(tag, (n.get(tag) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }))
  }, [sceneWorks])

  // Уровень стоит у СЦЕНЫ, а не у произведения, поэтому фильтр отвечает на
  // вопрос «есть ли здесь что почитать на моём уровне»: книга остаётся в сетке,
  // если подходит хотя бы одна её сцена. Так «Идиот» не пропадает из-за одного
  // трудного отрывка (см. соображение выше) — и при этом «A2» больше не значит
  // «ищи сам». Порядок — по таксономии языка (A1…C1), счётчик — сколько
  // произведений попадает. До загрузки чанка сцен список пуст, и таблетки нет.
  const sceneLevelOpts = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of sceneWorks) {
      for (const lv of new Set(scenesOf(w.id).map(s => s.level))) n.set(lv, (n.get(lv) ?? 0) + 1)
    }
    return present([...n.keys()], tax?.levels ?? [])
      .map(value => ({ value, label: value, count: n.get(value) ?? 0 }))
  }, [sceneWorks, scenesOf, tax])

  /** Пройдена ли сцена — та же запись результата, что у обычных текстов. */
  const sceneDone = (id: string) => !!resultFrom('reading', id, results)

  // Внутри фильтра значения складываются по ИЛИ (Netflix или HBO), между
  // фильтрами — по И. Иначе «Netflix + комедия» показало бы весь Netflix.
  const visibleWorks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sceneWorks.filter(w => {
      if (sceneShelf && w.shelf !== sceneShelf) return false
      if (scenePlatforms.length && !(w.platform && scenePlatforms.includes(w.platform))) return false
      if (sceneTags.length && !w.tags.some(tag => sceneTags.includes(tag))) return false
      if (sceneLevels.length && !scenesOf(w.id).some(s => sceneLevels.includes(s.level))) return false
      // Статус — та же ось, что у текстов и записей: «не начатые» = ни одной
      // пройденной сцены, «пройдено» = пройдены все. Произведение без сцен
      // (чанк ещё едет) статусом не отсеивается — иначе витрина мигает пустой.
      if (status) {
        const sc = scenesOf(w.id)
        if (sc.length > 0) {
          const passed = sc.filter(x => sceneDone(x.id)).length
          if (status === 'new' && passed > 0) return false
          if (status === 'wip' && (passed === 0 || passed === sc.length)) return false
          if (status === 'done' && passed < sc.length) return false
        }
      }
      if (q && !`${w.title} ${w.origTitle} ${w.author}`.toLowerCase().includes(q)) return false
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneWorks, sceneShelf, scenePlatforms, sceneTags, sceneLevels, scenesOf, query, status, results])

  const sceneGroups = useMemo(
    () => sceneShelves
      .map(s => ({ title: s.title, hint: s.hint, works: visibleWorks.filter(w => w.shelf === s.id) }))
      .filter(g => g.works.length > 0),
    [sceneShelves, visibleWorks],
  )

  // ── Колода карточек ────────────────────────────────────────────────────────
  //
  // Пустая колода у новичка — нормальное состояние: карточки набираются из
  // домашки (слова юнита и ошибки, см. lib/reviewCapture.ts), а первую он ещё не
  // сдал. Поэтому даём взять словари прочитанных текстов — двадцать слов, с
  // которыми режим сразу имеет смысл. Явной кнопкой, а не молча: колода ученика
  // — его вещь, и наполнять её за него без спроса значит однажды выдать ему
  // сотню чужих слов.
  //
  // Владелец берётся общим хелпером, а не выводится из предмета: домашка знает
  // курс, тренажёр — предмет, и по разным ключам получались бы разные колоды
  // (подробности в data/reviewDeck.ts).
  const owner = useMemo(() => deckOwner(), [])
  // Предмет колоды: тем же списком синонимов, что фильтрует CardDeck, — иначе
  // счётчик долга и сама колода считали бы разные множества, и вкладка
  // «Повторение» открывалась бы по чужим карточкам пустой.
  const deckCourses = useStudentData(s => s.subjects)
  const deckSubjects = useMemo(() => subjectAliases(subjectId), [subjectId, deckCourses])
  const [deckKey, setDeckKey] = useState(0)
  const [seeding, setSeeding] = useState(false)
  const [seedNote, setSeedNote] = useState('')

  // ── Две половины вкладки «Карточки» ────────────────────────────────────────
  //
  // «Повторение» — колода по расписанию, то, что было здесь всегда. «Наборы
  // фраз» — готовый разговорник по ситуациям (см. PhraseDecks).
  //
  // ПО УМОЛЧАНИЮ ОТКРЫВАЮТСЯ НАБОРЫ. Сначала было умнее: есть долг по
  // расписанию — открыть «Повторение», нет — витрину. Логика верная, результат
  // плохой. Долг есть почти у всех, кто уже учится, поэтому «Карточки»
  // открывались ровно тем же экраном, что и раньше, а весь разговорник прятался
  // за неприметной второй таблеткой — то есть новая половина вкладки не
  // существовала для тех, кому она и адресована.
  //
  // Долг при этом никуда не делся: счётчик висит цифрой на «Повторении» и
  // тянет туда сам. Показать материал и позвать к расписанию честнее, чем
  // открыть расписание и промолчать про материал.
  //
  // Вид выбирается СИНХРОННО, до всякой загрузки: счётчик нужен только для
  // цифры на таблетке, и ждать его, чтобы решить, что рисовать, значило бы
  // моргать вкладкой на каждом открытии.
  const hasBook = useMemo(() => hasSurvivalBook(lang), [lang])
  /** Есть ли для языка справочник грамматики. Синхронно — по нему рисуется пункт меню. */
  // Выбранная половина переживает F5, как и остальное во вкладке: ученик,
  // разбиравший гнездо, после перезагрузки должен вернуться в гнездо, а не в
  // наборы фраз. Ключ по языку — у каждого предмета свой набор половин.
  const [vocabView, setVocabView] = usePersistentState<VocabView>(
    `trainer.${lang}.vocabView`, hasBook ? 'sets' : 'due',
  )
  const [due, setDue] = useState(0)

  // ── Глубина по курсу ───────────────────────────────────────────────────────
  //
  // Докуда открыт курс — по нему тренажёр дозирует материал: гнёзда созвучий
  // появляются с того юнита, где введён их признак, а темы разговорника выше
  // глубины помечаются «рано», но не прячутся (см. lib/courseReach.ts).
  const reach = useMemo(() => courseReach(deckCourses, deckSubjects), [deckCourses, deckSubjects])

  // Есть ли в системе из чего выбирать голос — от этого зависит, рисовать ли
  // карточку «Озвучка»: на одном дикторе она была бы пустой коробкой.
  const voiceChoice = useVoiceChoice(lang)

  // ── Гнёзда созвучий ────────────────────────────────────────────────────────
  const nestsOn = useMemo(() => hasNests(lang), [lang])
  const nests = useMemo(() => nestsUpTo(lang, reach), [lang, reach])
  /** Сколько гнёзд ещё закрыто глубиной — цифра честнее, чем молчание. */
  const nestsLocked = useMemo(() => nestsForLang(lang).length - nests.length, [lang, nests])
  const [openNestId, setOpenNestId] = usePersistentState<string | null>(`trainer.${lang}.nest`, null)
  const openNest = useMemo(() => (openNestId ? nestById(openNestId) ?? null : null), [openNestId])
  /** Поиск идёт и по самим словам: ученик ищет «불», а не «начальная согласная». */
  const visibleNests = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return nests
    return nests.filter(n =>
      `${n.title} ${n.why} ${n.words.map(w => `${w.term} ${w.reading} ${w.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [nests, query])

  // ── Наборы слов ────────────────────────────────────────────────────────────
  //
  // Четвёртая половина вкладки. Разговорник отвечает на вопрос «что сказать в
  // этой ситуации», набор — на вопрос «дайте мне все слова про еду разом»
  // (см. data/wordPacks.ts). Книга ленивая по той же причине, что и
  // разговорник: две сотни слов не должны ехать тому, кто читает тексты.
  const packsOn = useMemo(() => hasWordPacks(lang), [lang])
  const [packBook, setPackBook] = useState<WordPackBook | null | undefined>(undefined)
  useEffect(() => {
    if (!packsOn) { setPackBook(null); return }
    let alive = true
    setPackBook(undefined)
    loadWordPacks(lang).then(b => { if (alive) setPackBook(b ?? null) })
    return () => { alive = false }
  }, [packsOn, lang])

  const packShelvesList = useMemo(() => wordPackShelves(packBook ?? undefined), [packBook])
  const packsList = useMemo(() => allPacks(packBook ?? undefined), [packBook])
  const [packShelf, setPackShelf] = useState('')
  const [openPackId, setOpenPackId] = usePersistentState<string | null>(`trainer.${lang}.pack`, null)
  const openPack = useMemo(
    () => packsList.find(p => p.id === openPackId) ?? null,
    [packsList, openPackId],
  )

  // ── Группы наборов ─────────────────────────────────────────────────────────
  //
  // Пятая половина вкладки — единственная, чей материал заводят люди, а не код:
  // учитель собирает группу в Конструкторе («Сверхъестественное» → набор на
  // сезон), ученик проходит её здесь. Рядом едут подборки-сиды: без них витрина
  // у нового ученика была бы пуста до тех пор, пока кто-нибудь что-нибудь не
  // заведёт (см. data/cardGroupSeeds.ts).
  //
  // Группа из БД и группа из кода в этом месте неразличимы намеренно: витрине
  // нужны имя набора и список карточек, и знать, откуда они, ей незачем.
  const [groups, setGroups] = useState<CardGroup[] | undefined>(undefined)
  // Счётчик перезагрузки: своя подборка, сохранённая учеником, должна появиться
  // в витрине сразу, а не после ухода со вкладки и обратно.
  const [groupsKey, setGroupsKey] = useState(0)
  useEffect(() => {
    let alive = true
    setGroups(undefined)
    Promise.all([
      // Ключ витрины — предмет: см. fetchCardGroups. Язык остаётся у сидов —
      // они лежат в коде и разложены по языкам, а не по предметам.
      fetchCardGroups(subjectId, owner.studentId),
      hasCardSeeds(lang) ? loadCardSeeds(lang) : Promise.resolve([] as CardGroup[]),
    ]).then(([db, seeds]) => {
      if (!alive) return
      setGroups([...seeds, ...db].sort((a, b) => a.sort - b.sort))
    })
    return () => { alive = false }
  }, [lang, subjectId, owner.studentId, groupsKey])

  /**
   * Может ли ученик собирать свои подборки.
   *
   * Ответ приходит из app_flags и по умолчанию «нет»: недоступная база, старая
   * схема, ошибка сети — всё это должно значить «фичи нет», а не «фича есть».
   */
  const [mySetsOn, setMySetsOn] = useState(false)
  useEffect(() => {
    let alive = true
    appFlag('student_card_sets').then(on => { if (alive) setMySetsOn(on) })
    return () => { alive = false }
  }, [])
  /** Открытый редактор своей подборки: новая группа или своя из витрины. */
  const [editGroup, setEditGroup] = useState<CardGroup | null>(null)

  // Таблетка рисуется, как только известно, что показывать. Пока группы едут,
  // ответ «есть ли они» даёт синхронный реестр сидов: у языка с подборкой
  // половина появляется сразу, у остальных — когда придёт ответ из базы.
  const decksOn = hasCardSeeds(lang) || (groups?.length ?? 0) > 0
  /**
   * Открытая папка-полка витрины «Наборов».
   *
   * Это НАВИГАЦИЯ, а не фильтр: «Сверхъестественное» — папка, внутри которой
   * лежат наборы по сезонам, и выбор её меняет экран, а не сужает текущий.
   * Ключ в памяти прежний (`cardGroup`): у того, кто стоял на группе в бывших
   * «Подборках», она и откроется.
   */
  const [openGroupId, setOpenGroupId] = usePersistentState<string>(`trainer.${lang}.cardGroup`, '')
  const [openSetId, setOpenSetId] = usePersistentState<string | null>(`trainer.${lang}.cardSet`, null)
  const openSet = useMemo(() => {
    if (!openSetId) return null
    for (const g of groups ?? []) {
      const set = g.sets.find(x => x.id === openSetId)
      if (set) return { group: g, set }
    }
    return null
  }, [groups, openSetId])

  // Четвёртый уровень: стопка внутри набора (серия внутри сезона). Открыт он
  // или нет — решает не отдельный экран, а наличие подстопок у набора: у
  // обычного набора их нет, и он открывается сразу карточками, как раньше.
  const [openSubsetId, setOpenSubsetId] = usePersistentState<string | null>(`trainer.${lang}.cardSubset`, null)
  const openSubset = useMemo(() => {
    if (!openSubsetId || !openSet) return null
    return openSet.set.subsets?.find(s => s.id === openSubsetId) ?? null
  }, [openSet, openSubsetId])

  // ── О языке: рассказ и полка учебников ────────────────────────────────────
  //
  // Режим «О языке» целиком — рассказ, полка учебников, их состояние и куски
  // экрана (components/trainer/modes/useGuideMode). Первый режим, уехавший из
  // этого файла: семь режимов в одной области видимости — это четыре с
  // половиной тысячи строк, в которых правка одного перечитывается вместе с
  // шестью соседями.
  const guide = useGuideMode({
    lang, subjectId, accent: palette.accent, soft: palette.soft, narrow, active: mode === 'guide',
  })

  // Восстановленная половина может оказаться несуществующей: разговорник для
  // языка ещё не написан, гнёзда не заведены. Тогда молча съезжаем на ту, что
  // есть, — иначе таблетки в рейле нет, а содержимое от неё показано.
  useEffect(() => {
    // Сохранённые «Подборки» уводим в «Наборы»: половины больше нет, а вернуть
    // человека надо туда, где лежит ровно тот же материал.
    if (vocabView === 'decks') setVocabView('sets')
    // Группы ждут ответа базы: пока `groups` не приехали, «нет групп» — это не
    // факт, а незнание, и съезжать с половины по нему нельзя.
    else if (vocabView === 'sets' && !hasBook && groups !== undefined && !decksOn) setVocabView('due')
    else if (vocabView === 'nests' && !nestsOn) setVocabView(hasBook ? 'sets' : 'due')
    else if (vocabView === 'packs' && !packsOn) setVocabView(hasBook ? 'sets' : 'due')
  }, [vocabView, hasBook, nestsOn, packsOn, groups, decksOn, setVocabView])

  // То же для «О языке»: восстановленная половина могла исчезнуть вместе с
  // языком, а режим целиком — вместе с рассказом и полкой.
  useEffect(() => {
    if (mode === 'guide' && !guide.on) setMode('reading')
  }, [mode, guide.on, setMode])

  useEffect(() => {
    if (!hasBook) return
    let alive = true
    dueCount(owner, deckSubjects)
      .then(n => { if (alive) setDue(n) })
      .catch(() => { /* цифра на таблетке — не повод ронять вкладку */ })
    return () => { alive = false }
  }, [hasBook, owner, deckSubjects])

  // ── Разговорник ────────────────────────────────────────────────────────────
  //
  // Книга и прогресс грузятся ЗДЕСЬ, а не внутри витрины: рейл показывает полки
  // со счётчиками и должен знать их до того, как отрисуется содержимое справа.
  // Книга ленивая (≈100 КБ на язык) — см. data/survivalBooks.ts.
  const [book, setBook] = useState<SurvivalBook | null | undefined>(undefined)
  // Память колоды по фразам: сколько раз подряд вспомнил, сколько раз забыл,
  // когда вернётся. Раньше здесь лежало множество «что уже в колоде» — оно
  // отвечало только на вопрос «какие фразы я однажды не знал».
  const [states, setStates] = useState<Map<string, CardState>>(() => new Map())
  // Пока память не приехала, «пустая память» неотличима от «ничего не учил», и
  // стопка собралась бы из всей темы — ровно то, от чего уходим. Особенно на
  // F5: открытая тема восстанавливается из sessionStorage мгновенно, а колода
  // читается по сети.
  const [statesReady, setStatesReady] = useState(false)
  const [knownKey, setKnownKey] = useState(0)
  const [shelf, setShelf] = useState('')
  // Открытая тема разговорника переживает F5 по той же причине, что и текст.
  const [openTheme, setOpenTheme] = usePersistentState<string | null>(`trainer.${lang}.theme`, null)
  const [run, setRun] = useState<RunMode>('swipe')
  const [phraseView, setPhraseView] = useState<PhraseView>({ reading: true, reverse: false })

  // Режим «Конструктор» целиком — четыре половины, их витрины, прогоны и
  // карточки-опоры в рейле (components/trainer/modes/useBlocksMode). Четвёртый
  // режим, уехавший из этого файла.
  const blocks = useBlocksMode({
    lang, subjectId, accent: palette.accent, soft: palette.soft, narrow,
    active: mode === 'blocks',
    query, onQuery: setQuery,
    owner,
    reading: phraseView.reading,
    onReading: v => setPhraseView(st => ({ ...st, reading: v })),
    result: (kind, id) => resultFrom(kind, id, results),
    onFinished: (kind, id, score, total) => {
      saveResult(kind, id, score, total)
      setResultsKey(k => k + 1)
      setKnownKey(k => k + 1)
    },
  })

  // Защита половины уехала внутрь режима (useBlocksMode): какая из четырёх
  // написана для этого языка — знает он. Здесь остаётся только уступка самого
  // режима: переключать режимы — дело тренажёра.
  useEffect(() => {
    if (mode === 'blocks' && !blocks.on) setMode('reading')
  }, [mode, blocks.on, setMode])



  // Онбординг стопки живёт в CardDeck, но один его шаг — про переключатель
  // «Свайп / Списком» из строки управления. Тема, открытая впервые, — это сорок
  // незнакомых фраз, и свайп по ним превращается в сорок нажатий «не знаю»;
  // про список надо узнать до того, как это случится, а не после.
  const runTabsRef = useRef<HTMLDivElement | null>(null)
  const runTourStep: CoachStep = {
    ref: runTabsRef,
    title: t('Сначала — «Списком»'),
    text: t('Свайп проверяет память, а по новой теме её ещё нет. «Списком» даёт прочитать все фразы темы за минуту — с заметками и озвучкой — и только потом идти в стопку.'),
  }

  useEffect(() => {
    if (!hasBook) { setBook(null); return }
    let alive = true
    setBook(undefined)
    loadSurvivalBook(lang).then(b => { if (alive) setBook(b ?? null) })
    return () => { alive = false }
  }, [hasBook, lang])

  // Режим «Грамматика» целиком — справочник, его фильтры и куски экрана
  // (components/trainer/modes/useGrammarMode). Второй режим, уехавший из этого
  // файла; поиск остаётся общим на весь тренажёр и приходит к нему пропом.
  const grammar = useGrammarMode({
    lang, subjectId, accent: palette.accent, soft: palette.soft,
    active: mode === 'grammar',
    query, onQuery: setQuery,
    result: id => resultFrom('grammar', id, results),
    onQuizDone: (id, score, total) => { saveResult('grammar', id, score, total); setResultsKey(k => k + 1) },
  })

  // Язык сменился на тот, где справочника нет, — режим обязан уступить, иначе
  // экран остаётся на пустой вкладке, которой в меню уже нет. Остаётся здесь:
  // переключение режимов — свойство тренажёра, а не режима.
  useEffect(() => {
    if (mode === 'grammar' && !grammar.on) setMode('reading')
  }, [mode, grammar.on, setMode])

  // Что колода помнит про фразы — по одному запросу на экран, а не на тему.
  useEffect(() => {
    let alive = true
    deckStates(owner, deckSubjects)
      .then(s => { if (alive) { setStates(s); setStatesReady(true) } })
      // Не доехало — работаем по тому, что есть: лучше стопка целиком, чем
      // вечный скелетон вместо темы.
      .catch(() => { if (alive) setStatesReady(true) })
    return () => { alive = false }
  }, [owner, deckSubjects, knownKey])

  // ── Личный словарь ─────────────────────────────────────────────────────────
  //
  // Собранные слова — те же строки колоды, только показанные списком, а не
  // расписанием (см. trainer/MyWords.tsx). Читаются одним запросом рядом с
  // памятью колоды и по тому же ключу `knownKey`: слово, забранное из текста,
  // должно появиться на плитке сразу по возвращении из читалки.
  const [cards, setCards] = useState<ReviewCard[]>([])
  // Пока словарь не прочитан, «пусто» и «не доехало» неотличимы, и плитка
  // сообщала бы человеку с двумя сотнями слов, что у него их нет.
  const [cardsReady, setCardsReady] = useState(false)
  useEffect(() => {
    let alive = true
    collectedCards(owner, deckSubjects)
      .then(c => { if (alive) { setCards(c); setCardsReady(true) } })
      // Словарь не доехал — вкладка живёт дальше: плитка покажет ноль слов,
      // а не заменит собой всю витрину наборов ошибкой.
      .catch(e => { console.error('collectedCards:', e); if (alive) setCardsReady(true) })
    return () => { alive = false }
  }, [owner, deckSubjects, knownKey])

  // Ответ по карточке уже сохранён в базе и вернулся новым состоянием — правим
  // свою копию точечно. Перечитывать всю колоду на каждый свайп значило бы
  // запрос в секунду и мигание счётчиков посреди стопки.
  const onGraded = useCallback((prompt: string, st: CardState) => {
    setStates(prev => {
      const next = new Map(prev)
      next.set(prompt, st)
      return next
    })
  }, [])

  const shelves = useMemo(() => survivalShelves(book ?? undefined), [book])
  const allThemes = useMemo(() => shelves.flatMap(s => s.themes), [shelves])

  // Фразы разговорника — то, чего в личном словаре быть не должно: они уже
  // разложены по своим плиткам, и словарь с ними стал бы копией всей витрины.
  const bookPhrases = useMemo(
    () => new Set(allThemes.flatMap(x => x.phrases.map(p => p.term))),
    [allThemes],
  )
  const myWords = useMemo(() => myWordsFrom(cards, lang, bookPhrases), [cards, lang, bookPhrases])
  /** Открыт словарь, а не тема: у него свой ключ в том же поле (см. MY_WORDS_ID). */
  const openMyWords = openTheme === MY_WORDS_ID
  const myStats = useMemo(() => myWordsStats(myWords, states), [myWords, states])

  /**
   * Вычеркнуть слово.
   *
   * Строка уходит с экрана сразу, до ответа базы: удаление своего же слова — не
   * то место, где ученик готов ждать сеть. Если база отказала (нет прав, нет
   * связи), перечитываем словарь — слово возвращается на место, а не пропадает
   * с экрана, оставшись в расписании.
   */
  const forget = useCallback(async (w: MyWord) => {
    setCards(prev => prev.filter(c => c.id !== w.cardId))
    const ok = await forgetCard(w.cardId)
    if (!ok) setKnownKey(k => k + 1)
  }, [])

  // ── Виджет прогресса в верхней строке ──────────────────────────────────────
  //
  // Виджет умел считать только банк ЕГЭ и на языке честно показывал «0 из 0».
  // Материал языка — это разговорник: сколько его фраз уже выучено, то есть
  // вынесено на интервал от трёх недель. «Взято в колоду» на этом месте врало:
  // в колоду попадало как раз незнание.
  // Отвеченные карточки и время виджет считает сам (store/trainerProgressStore).
  const updateProgress = useTrainerProgress(s => s.update)
  const bookStats = useMemo(
    () => allThemes.reduce((acc, x) => {
      const st = themeStats(x, states)
      acc.total += st.total; acc.learned += st.learned; acc.lapses += st.lapses
      return acc
    }, { total: 0, learned: 0, lapses: 0 }),
    [allThemes, states],
  )
  useEffect(() => {
    updateProgress({
      kind: 'lang', subject, subjectId,
      doneCount: bookStats.learned, totalCount: bookStats.total, wrongCount: bookStats.lapses, favCount: 0,
    })
  }, [subject, subjectId, bookStats, updateProgress])
  const openItem = useMemo(
    () => allThemes.find(x => x.theme.id === openTheme) ?? null,
    [allThemes, openTheme],
  )
  /** Состояние памяти по открытой теме — для чисел в рейле. */
  const openStats = useMemo(
    () => (openItem ? themeStats(openItem, states) : { total: 0, fresh: 0, learning: 0, learned: 0, due: 0, lapses: 0, pct: 0 }),
    [openItem, states],
  )

  // ── Ступень темы ───────────────────────────────────────────────────────────
  //
  // Полки разговорника отвечают на вопрос «что за ситуация», а не «потяну ли
  // я». Человеку, который уже говорит, витрина открывалась с «Здравствуйте» и
  // «Чисел» — то есть с того, что он проходил три уровня назад, — и «Виза» с
  // «Больницей», ради которых он сюда и пришёл, лежали шестым экраном вниз.
  //
  // Ступень подписывается в шкале самого предмета (у корейского TOPIK, у
  // японского JLPT), поэтому фильтр работает по подписи, а не по букве CEFR:
  // иначе в списке стояло бы «B1», а на карточке «TOPIK 3급», и это читалось бы
  // как два разных фильтра.
  const themeLevel = useMemo(
    () => (x: SurvivalThemeCards) => survivalLevelLabel(x.theme.level, subject),
    [subject],
  )
  const setLevelOpts = useMemo(() => {
    const found = new Set(allThemes.map(x => x.theme.level))
    return SURVIVAL_LEVELS.filter(l => found.has(l)).map(l => survivalLevelLabel(l, subject))
  }, [allThemes, subject])

  /**
   * Тема выше глубины по курсу.
   *
   * Не фильтр: разговорник нужен человеку и на две ступени вперёд («завтра
   * вылет»), поэтому такие темы остаются открытыми — они только гасятся на
   * витрине и уезжают в её конец при сортировке по умолчанию.
   */
  const reachLevel = useMemo(() => reachLevelIndex(reach), [reach])
  const themeAhead = useMemo(
    () => (x: SurvivalThemeCards) => reachLevel >= 0 && SURVIVAL_LEVELS.indexOf(x.theme.level) > reachLevel,
    [reachLevel],
  )

  /** Темы под текущей полкой, ступенью, поиском, статусом и сортировкой. */
  const visibleThemes = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Поиск идёт по всем полкам и молча снимает выбор слева: человек, который
    // ищет «аптеку», не должен ещё и угадывать, в каком она разделе.
    const base = q
      ? allThemes
      : (shelf ? (shelves.find(s => s.title === shelf)?.themes ?? []) : allThemes)

    const out = base.filter(x => {
      if (!anyOf(fLevel, themeLevel(x))) return false
      if (q && !`${x.theme.title} ${x.theme.vocabTheme} ${x.theme.goal}`.toLowerCase().includes(q)) return false
      // Статус темы — по состоянию памяти: «не начатая» = ни одной фразы не
      // отвечали, «выучено» = все фразы вынесены на длинный интервал.
      const st = themeStats(x, states)
      const started = st.total - st.fresh > 0
      const done = st.total > 0 && st.learned === st.total
      if (status === 'new' && started) return false
      if (status === 'wip' && (!started || done)) return false
      if (status === 'done' && !done) return false
      return true
    })
    if (sort === 'size') out.sort((a, b) => b.phrases.length - a.phrases.length)
    if (sort === 'progress') out.sort((a, b) => themeStats(b, states).pct - themeStats(a, states).pct)
    // Сортировка стабильная, поэтому внутри ступени темы остаются в порядке
    // сетки — «Кофейня» раньше «Еды», как и на витрине без сортировки.
    if (sort === 'level') {
      out.sort((a, b) => SURVIVAL_LEVELS.indexOf(a.theme.level) - SURVIVAL_LEVELS.indexOf(b.theme.level))
    }
    // По умолчанию витрина начинается с того, что ученику уже по силам, а темы
    // на вырост уезжают в конец. Сортировка стабильная, поэтому внутри обеих
    // половин порядок сетки сохраняется. Явно выбранную сортировку не трогаем:
    // человек, который просил «по размеру», просил именно её.
    if (sort === 'order') {
      out.sort((a, b) => Number(themeAhead(a)) - Number(themeAhead(b)))
    }
    return out
  }, [allThemes, shelves, shelf, query, status, sort, states, fLevel, themeLevel, themeAhead])
  /**
   * Наборы слов под витрину.
   *
   * Форма — стопка витрины (DeckCard): имя и список карточек. Ничего больше
   * PhraseDecks и не спрашивает, поэтому наборы показываются той же витриной,
   * что и разговорник, без второй её копии. Сам набор остаётся рядом в `pack`
   * — из него берутся ступень, тема и описание.
   */
  const packDecks = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Поиск идёт по всем полкам и снимает выбор слева: человек ищет «острый»,
    // а не «в каком разделе лежит острый».
    const base = q
      ? packsList
      : (packShelf ? (packShelvesList.find(x => x.title === packShelf)?.packs ?? []) : packsList)
    return base
      .filter(pack => {
        if (!anyOf(fLevel, survivalLevelLabel(pack.level, subject))) return false
        if (q) {
          // Ищем и по самим словам: набор «Вкус» должен находиться по 맵다 и по
          // «острый», а не только по своему названию.
          const hay = `${pack.title} ${pack.about} ${pack.topic} ${pack.words.map(w => `${w.term} ${w.ru} ${w.reading ?? ''}`).join(' ')}`
          if (!hay.toLowerCase().includes(q)) return false
        }
        const st = themeStats({ theme: { id: pack.id, title: pack.title }, phrases: pack.words }, states)
        const started = st.total - st.fresh > 0
        const done = st.total > 0 && st.learned === st.total
        if (status === 'new' && started) return false
        if (status === 'wip' && (!started || done)) return false
        if (status === 'done' && !done) return false
        return true
      })
      .map(pack => ({ pack, theme: { id: pack.id, title: pack.title }, phrases: pack.words }))
  }, [packsList, packShelvesList, packShelf, query, status, states, fLevel, subject])

  /** Ступени, которые вообще встречаются среди наборов, — для фильтра. */
  const packLevelOpts = useMemo(() => {
    const found = new Set(packsList.map(p => p.level))
    return SURVIVAL_LEVELS.filter(l => found.has(l)).map(l => survivalLevelLabel(l, subject))
  }, [packsList, subject])

  /** Состояние памяти по открытому набору — для чисел в рейле. */
  const packStats = useMemo(
    () => (openPack
      ? themeStats({ theme: { id: openPack.id, title: openPack.title }, phrases: openPack.words }, states)
      : { total: 0, fresh: 0, learning: 0, learned: 0, due: 0, lapses: 0, pct: 0 }),
    [openPack, states],
  )

  /**
   * Наборы выбранной группы под витрину.
   *
   * Форма прежняя — DeckCard: имя стопки и список карточек. Метка серии (`ep`)
   * в витрину не идёт: на плитке она не помещается, а внутри набора её видно у
   * каждой карточки.
   *
   * Без выбранной группы показываются наборы ВСЕХ групп подряд. Это осознанно:
   * групп у ученика единицы, и пустой экран с надписью «выбери слева» стоил бы
   * лишнего клика ради ничего.
   */
  const groupDecks = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Открытая папка держит выборку даже при поиске: искали внутри неё.
    // Без папки ищется и показывается всё подряд — групп у ученика единицы.
    const list = (groups ?? []).filter(g => openGroupId ? g.id === openGroupId : true)
    return list.flatMap(g => g.sets.map(set => ({ group: g, set, theme: { id: set.id, title: set.title }, phrases: allSetCards(set) })))
      .filter(x => {
        if (q) {
          const hay = `${x.group.title} ${x.set.title} ${x.set.about} ${x.phrases.map(c => `${c.term} ${c.ru} ${c.ep ?? ''}`).join(' ')}`
          if (!hay.toLowerCase().includes(q)) return false
        }
        const st = themeStats({ theme: x.theme, phrases: x.phrases }, states)
        const started = st.total - st.fresh > 0
        const done = st.total > 0 && st.learned === st.total
        if (status === 'new' && started) return false
        if (status === 'wip' && (!started || done)) return false
        if (status === 'done' && !done) return false
        return true
      })
  }, [groups, openGroupId, query, status, states])

  // Полки могла не пережить перезагрузку: группу удалили в Конструкторе, а её
  // id остался в памяти вкладки. Без сброса витрина фильтровалась бы по
  // несуществующей папке и стояла пустой.
  useEffect(() => {
    if (groups === undefined) return
    if (openGroupId && !groups.some(g => g.id === openGroupId && isShelf(g))) setOpenGroupId('')
    if (openSetId && !groups.some(g => g.sets.some(x => x.id === openSetId))) { setOpenSetId(null); setOpenSubsetId(null) }
    if (openSubsetId && !openSubset) setOpenSubsetId(null)
  }, [groups, openGroupId, setOpenGroupId, openSetId, setOpenSetId])

  /** Открытая папка — только названная группа: обёртка одиночного набора папкой не бывает. */
  const openGroup = useMemo(
    () => (groups ?? []).find(g => g.id === openGroupId && isShelf(g)) ?? null,
    [groups, openGroupId],
  )

  /**
   * Витрина «Наборов» целиком: темы разговорника и наборы групп в ОДНОЙ сетке.
   *
   * Отдельной половины «Подборки» нет намеренно. Для ученика набор — это набор,
   * откуда бы он ни пришёл: из разговорника, от учителя или из сида. Вторая
   * таблетка рядом с «Наборами» заставляла помнить, в какой из двух витрин
   * лежит нужная стопка, — и на телефоне до неё вообще нельзя было дойти.
   *
   * Полка (названная группа) в сетку не разворачивается: она стоит папкой (см.
   * shelfTiles), а внутри лежат её наборы. Обёртка одиночного набора папки не
   * заводит — набор ложится в сетку сам. Поиск папки временно вскрывает: ищут
   * слово, а не полку, и прятать найденное за папкой значит не найти.
   */
  const setsDecks = useMemo(() => {
    const searching = query.trim().length > 0
    // Внутри папки витрина — наборы одной полки, и больше ничего: разговорник
    // на этом этаже был бы чужим материалом, приехавшим без спроса.
    if (openGroup) {
      return groupDecks.map(x => ({
        theme: x.theme, phrases: x.phrases, label: '', ahead: false,
      }))
    }
    const themes = hasBook
      ? visibleThemes.map(x => ({
          theme: x.theme as { id: string; title: string },
          phrases: x.phrases,
          label: themeLevel(x),
          ahead: themeAhead(x),
        }))
      : []
    const sets = groupDecks
      .filter(x => searching || !isShelf(x.group))
      .map(x => ({
        theme: x.theme,
        phrases: x.phrases as typeof themes[number]['phrases'],
        // Подпись плитки — имя полки: «Сезон 4» без «Сверхъестественного» рядом
        // ничего не значит, когда набор нашёлся поиском вне своей папки.
        label: isShelf(x.group) ? x.group.title : '',
        ahead: false,
      }))
    return [...sets, ...themes]
  }, [hasBook, visibleThemes, themeLevel, themeAhead, groupDecks, openGroup, query])

  const glossaryCards = useMemo(() => allTexts.flatMap(txt => txt.glossary.map(g => ({
    subject: subjectId,
    source: 'manual' as const,
    prompt: g.term,
    answer: g.ru,
  }))), [allTexts, subjectId])

  async function seedFromTexts() {
    setSeeding(true)
    setSeedNote('')
    try {
      const added = await addCards(owner, glossaryCards)
      setSeedNote(added > 0 ? `${t('Добавлено карточек:')} ${added}` : t('Все эти слова уже в колоде.'))
      if (added > 0) setDeckKey(k => k + 1)
    } catch (e) {
      console.error('seedFromTexts:', e)
      setSeedNote(t('Не получилось добавить слова. Попробуй ещё раз.'))
    } finally {
      setSeeding(false)
    }
  }

  // ── Часы: занятие или витрина ──────────────────────────────────────────────
  //
  // Время идёт, только когда открыт материал: сцена, текст, запись, набор фраз,
  // гнездо созвучий. Списки наборов, полки и фильтры — это выбор, а не работа,
  // и раньше они капали минуты наравне со стопкой: ученик стоял на витрине
  // «Наборы», ничего не делал, а в виджете горело «Сейчас идёт · 27м».
  //
  // Стоит ДО ранних возвратов ниже — порядок хуков одинаков на всех экранах.
  useTrainerEngaged(!!(openScene || openText || openAudio || openItem || openNest || openMyWords || openPack || openSet || (mode === 'blocks' && blocks.open) || (mode === 'guide' && guide.openId)))

  // ── Рейл ───────────────────────────────────────────────────────────────────
  //
  // Собирается здесь целиком, а не по кускам из режимов: рейл общий, и если
  // каждый режим дорисовывал бы в него свою часть, при переключении половина
  // колонки перерисовывалась бы из другого места.

  // Режим «Говорение» целиком — задания, запись, отправка и шэдоуинг
  // (components/trainer/modes/useSpeakingMode). Третий режим, уехавший из этого
  // файла, и первый, вместе с которым уехала сама витрина: она лежала тремя
  // сотнями строк в его хвосте.
  const speaking = useSpeakingMode({
    lang, subject, subjectId, accent: palette.accent, palette,
    themes: allThemes,
    query, onQuery: setQuery, status, onStatus: setStatus,
    active: mode === 'speaking',
  })

  // ── Выборка справочника ────────────────────────────────────────────────────
  //
  // Три сита: раздел, уровень и строка поиска. Поиск идёт и по самой форме, и по
  // русскому названию, и по объяснению: человек помнит либо «는데», либо «то,
  // что ставят перед просьбой», и справочник обязан находиться по обоим.

  // ── Адрес экрана ───────────────────────────────────────────────────────────
  //
  // Каждый экран тренажёра адресуется — не только открытый рассказ (см.
  // lib/trainerLink). Две стороны одного правила.
  //
  // ТУДА: что открыто, то и в адресе. Строка браузера перестаёт врать (ученик
  // разбирает ряд созвучий, а адрес говорит «тренажёр»), и присланная ссылка
  // открывает у другого человека ровно тот же экран, а не «где он был в
  // прошлый раз». replaceState, а не переход: листать «Назад» двадцать
  // открытых по очереди тем никто не собирался.
  //
  // СЮДА: присланный адрес применяется ОДИН раз и только когда открыт нужный
  // язык — предмет переключается уровнем выше (см. pages/TrainerPage), и до этого
  // момента тренажёр показывает чужую библиотеку, в которой такой темы нет.
  //
  // ОТКРЫТОЕ ПЕРЕБИВАЕТ ПОЛОВИНУ. Экраны рисуются по правилу «открытое сильнее
  // витрины» (тема разговорника показывается и тогда, когда выбрана половина
  // «Созвучия»), поэтому ссылка ГАСИТ всё открытое и зажигает ровно одно своё.
  // Иначе присланный ряд созвучий у человека с недочитанной темой открывался бы
  // его темой — состояние-то переживает перезагрузку.
  const currentLink = useMemo<TrainerLink>(() => {
    if (mode === 'reading') {
      if (readingView === 'feed') return { lang, screen: 'feed' }
      if (readingView === 'scenes') {
        return { lang, screen: 'scenes', id: openWorkId ?? undefined, sub: openSceneId ?? undefined }
      }
      return { lang, screen: 'texts', id: openTextId ?? undefined }
    }
    if (mode === 'vocab') {
      // «Мои слова» лежат в том же поле, что и тема (см. MY_WORDS_ID), но это
      // отдельный экран — и адрес у него отдельный.
      if (openMyWords) return { lang, screen: 'words' }
      if (vocabView === 'nests') return { lang, screen: 'nests', id: openNestId ?? undefined }
      if (vocabView === 'packs') return { lang, screen: 'packs', id: openPackId ?? undefined }
      if (vocabView === 'due') return { lang, screen: 'due' }
      // Набор группы и папка живут в «Наборах», но адрес у них прежний
      // (`decks`): ссылки на набор уже разошлись, и ломать их незачем.
      // Папка без набора адресуется тем же полем id: что приехало — полка или
      // набор, — разбирается на входе (см. case 'decks'). Второй сегмент адреса
      // (`sub`) живёт только рядом с id, поэтому одной папке он не достался бы.
      if (openSetId) return { lang, screen: 'decks', id: openSetId, sub: openGroupId || undefined }
      if (openTheme) return { lang, screen: 'sets', id: openTheme }
      if (openGroupId) return { lang, screen: 'decks', id: openGroupId }
      return { lang, screen: 'sets' }
    }
    if (mode === 'listening') return { lang, screen: 'audio', id: openAudioId ?? undefined }
    if (mode === 'speaking') return { lang, screen: 'speaking' }
    if (mode === 'blocks') {
      return blocks.open
        ? { lang, screen: blocks.open.screen, id: blocks.open.id }
        : { lang, screen: blocks.view }
    }
    if (mode === 'grammar') return { lang, screen: 'grammar', id: grammar.openId ?? undefined }
    if (guide.view === 'books') return { lang, screen: 'books' }
    return { lang, screen: 'story', id: guide.openId ?? undefined }
  }, [
    lang, mode, readingView, vocabView, blocks.view, blocks.open, guide.view, openMyWords,
    openTextId, openWorkId, openSceneId, openAudioId, openTheme,
    openNestId, openPackId, openSetId, openGroupId,
    guide.openId, grammar.openId,
  ])
  // Предмет дописывается здесь, а не в двенадцати ветках выше: он один на весь
  // экран. Нужен там, где по языку предмет не угадать («Русский» и
  // «Литература» — оба ru): без него присланная ссылка открывала бы у человека
  // другой предмет с другими текстами (см. subjectId в trainerLink).
  const linkWithSubject = useMemo<TrainerLink>(
    () => ({ ...currentLink, subjectId }), [currentLink, subjectId])
  useEffect(() => { writeTrainerHash(linkWithSubject) }, [linkWithSubject])

  /** Адрес этого экрана целиком — то, что уходит в буфер или в системный лист. */
  const shareUrl = useMemo(() => trainerShareUrl(linkWithSubject), [linkWithSubject])

  const bootDone = useRef(false)
  useEffect(() => {
    if (bootDone.current) return
    const link = bootTrainerLink()
    if (!link) { bootDone.current = true; return }
    if (!sameLang(link.lang, lang)) return
    takeBootTrainerLink()
    bootDone.current = true

    // Гасим всё открытое — см. «открытое перебивает половину» выше.
    setOpenTextId(null); setOpenWorkId(null); setOpenSceneId(null); setOpenAudioId(null)
    setOpenTheme(null); setOpenNestId(null); setOpenPackId(null); setOpenSetId(null); setOpenSubsetId(null); setOpenGroupId('')
    blocks.reset(); grammar.setOpenId(null); guide.setOpenId(null); speaking.close()

    const id = link.id ?? null
    switch (link.screen) {
      // Язык без экрана — «открой корейский»: где именно, решает сам тренажёр
      // своей памятью. Так выглядит ссылка на предмет целиком.
      case undefined: break
      case 'feed':     setMode('reading'); setReadingView('feed'); break
      case 'scenes':   setMode('reading'); setReadingView('scenes'); setOpenWorkId(id); setOpenSceneId(link.sub ?? null); break
      case 'texts':    setMode('reading'); setReadingView('texts'); setOpenTextId(id); break
      case 'sets':     setMode('vocab'); setVocabView('sets'); setOpenTheme(id); break
      case 'words':    setMode('vocab'); setVocabView('sets'); setOpenTheme(MY_WORDS_ID); break
      case 'nests':    setMode('vocab'); setVocabView('nests'); setOpenNestId(id); break
      case 'packs':    setMode('vocab'); setVocabView('packs'); setOpenPackId(id); break
      // id — набор ИЛИ полка: кладём в оба поля, лишнее снимет проверка по
      // приехавшим группам (см. эффект рядом с openGroup).
      case 'decks':    setMode('vocab'); setVocabView('sets'); setOpenSetId(id); setOpenGroupId(link.sub || id || ''); break
      case 'due':      setMode('vocab'); setVocabView('due'); break
      case 'audio':    setMode('listening'); setOpenAudioId(id); break
      case 'speaking': setMode('speaking'); break
      case 'stems':    setMode('blocks'); blocks.openFromLink('stems', id); break
      case 'roots':    setMode('blocks'); blocks.openFromLink('roots', id); break
      case 'numbers':  setMode('blocks'); blocks.openFromLink('numbers', id); break
      case 'sounds':   setMode('blocks'); blocks.openFromLink('sounds', id); break
      case 'grammar':  setMode('grammar'); grammar.setOpenId(id); break
      case 'story':    setMode('guide'); guide.setView('story'); guide.setOpenId(id); break
      case 'books':    setMode('guide'); guide.setView('books'); break
    }
  }, [
    lang, setMode, setReadingView, setVocabView, guide.setView,
    setOpenTextId, setOpenWorkId, setOpenSceneId, setOpenAudioId, setOpenTheme,
    setOpenNestId, setOpenPackId, setOpenGroupId,
    blocks.reset, blocks.openFromLink, grammar.setOpenId, guide.setOpenId,
  ])

  // ── Смена экрана — вид сверху ──────────────────────────────────────────────
  //
  // Режим, половина «Чтения», витрина или открытый материал — для ученика это
  // разные экраны, а прокрутка у страницы одна на всех. Пролистав ленту вниз и
  // нажав «Тексты», он попадал в середину нового списка. Ключ собран из всего,
  // что меняет содержимое справа; см. lib/useScreenTop.ts.
  //
  // ФИЛЬТРЫ ТОЖЕ. Нажатая пилюля («Вслух», уровень, полка, поиск) — это новая
  // выборка, а не та же с пропусками: 167 карточек превращаются в 59, и место,
  // где человек стоял, ни на что в новом списке не указывает. Поэтому сита
  // сидят в том же ключе, что и режимы.
  useScreenTop([
    lang, mode, readingView, vocabView, guide.view,
    openTextId, openAudioId, openWorkId, openSceneId, openTheme,
    openNestId, openPackId, openSetId,
    guide.openId, grammar.openId, speaking.openId ?? '', blocks.open?.id ?? '',
    speaking.draftKey, blocks.draftKey, grammar.draftKey, fLen, status, query, sort,
    fLevel.join(','), fSkill.join(','), fTopic.join(','),
    sceneShelf, scenePlatforms.join(','), sceneTags.join(','), sceneLevels.join(','),
    shelf, packShelf, openGroupId,
  ].join('|'))


  const modeCounts: Record<Mode, number | undefined> = {
    // «Чтение» — ВСЁ, что в этом режиме можно открыть: учебные тексты ПЛЮС
    // сцены. У корейского это 3 + 15, и «3» в меню при восемнадцати вещах на
    // экране читалось как потерянная половина раздела.
    //
    // За половиной вкладки число идти не может: половина запоминается в
    // sessionStorage, а из «Карточек» её не видно вовсе — один и тот же пункт
    // меню показывал бы то 3, то 6 без единой видимой причины.
    //
    // Сумма при этом известна сразу: сцены едут отдельным чанком (у английского
    // это 340 КБ), но их количество лежит в синхронном реестре (SCENE_COUNTS),
    // так что бейдж не прыгает и весь Диккенс ради цифры не грузится.
    reading: allTexts.length + (sceneLib ? scenesTotal : 0) + (feedLib ? feedTotal : 0),
    vocab: hasBook ? allThemes.reduce((n, x) => n + x.phrases.length, 0) : undefined,
    listening: audio.length,
    speaking: speaking.count,
    // Всё, что в режиме можно открыть: основы, корни, ряды счёта, правила
    // чтения. Все таблицы лежат в коде, поэтому цифра известна синхронно и не
    // прыгает после загрузки.
    blocks: blocks.count,
    // Из синхронного реестра — чтобы бейдж стоял до того, как чанк поехал.
    grammar: grammar.count,
    // Главы рассказа плюс книги на полке. Книги известны синхронно, главы — нет
    // (рассказ едет чанком), поэтому до загрузки в бейдже стоят только книги, а
    // не ноль: ноль читался бы как «раздел пустой».
    guide: guide.count,
  }

  const heroSubtitle =
    mode === 'vocab' && hasBook ? `${allThemes.reduce((n, x) => n + x.phrases.length, 0)} ${t('фраз')} · ${allThemes.length} ${t('ситуаций')}`
    : scenesOn ? `${sceneWorks.length} ${t('произведений')} · ${scenesTotal} ${t(scenesWord(scenesTotal))}`
    : feedOn ? `${feedTotal} ${t(materialsWord(feedTotal))} ${t('из свободных источников')}`
    : mode === 'reading' ? `${allTexts.length} ${t('текстов')}`
    : mode === 'listening' ? `${audio.length} ${t('записей')}`
    // Подпись собирается из того, что у ЯЗЫКА реально есть: у японского из
    // четырёх разделов открыт один, и перечислять ему корейские основы с
    // правилами чтения значило бы обещать несуществующее.
    : mode === 'blocks' ? blocks.subtitle
    : mode === 'grammar' ? grammar.subtitle
    : speaking.subtitle


  const rail = (
    <>
      {!narrow && <SubjectHero state={subjectState} subtitle={heroSubtitle} palette={palette} />}

      {!narrow && (
      <RailCard title="Режим" accent={palette.accent} icon={<Layers size={15} />}>
        <RailModes
          items={MODES
            .filter(m => (m.id !== 'blocks' || blocks.on) && (m.id !== 'grammar' || grammar.on) && (m.id !== 'guide' || guide.on))
            .map(m => ({ id: m.id, label: m.label, count: modeCounts[m.id], Icon: m.Icon }))}
          value={mode}
          onChange={switchMode}
          accent={palette.accent}
          soft={palette.soft}
        />
      </RailCard>
      )}

      {/* Разделы справочника. Раздел — главное деление, а не уровень: человек
          помнит, что искал «что-то про частицы», а не что это было 1급. */}
      {mode === 'grammar' && grammar.rail}

      {/* Две половины «Чтения». Показываем переключатель только там, где сцены
          для языка вообще написаны: пустая вкладка хуже отсутствующей. */}
      {mode === 'reading' && (sceneLib || feedLib) && !narrow && (
        <RailCard title="Что читаем" accent={palette.accent} icon={<Library size={15} />}>
          <RailSegment
            options={[
              // Лента — первой и по умолчанию включена (см. readingView),
              // как «Шэдоуинг» в «Говорении»: свежее чтение важнее архива
              // текстов/сцен. Появляется только там, где для языка собран
              // хоть один материал: пустая вкладка хуже отсутствующей.
              ...(feedLib ? [{ value: 'feed', label: 'Лента', badge: feedTotal, icon: <Rows3 size={15} /> }] : []),
              { value: 'texts', label: 'Тексты', badge: allTexts.length, icon: <AlignLeft size={15} /> },
              { value: 'scenes', label: 'Сцены', badge: scenesTotal, icon: <Quote size={15} /> },
            ]}
            value={readingView}
            onChange={v => v && switchReadingView(v as ReadingView)}
            accent={palette.accent}
            soft={palette.soft}
            clearable={false}
            idleIcon
          />
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {readingView === 'scenes'
              ? t('Отрывки из книг и сериалов. У каждого — что было до сцены и чем всё кончилось.')
              : readingView === 'feed'
                ? t('Новости и статьи из источников со свободной лицензией. Обновляется сборкой, читается по дням.')
                : t('Тексты, написанные под уровень: объявления, письма, инструкции.')}
          </div>
        </RailCard>
      )}

      {scenesOn && !openWork && (
        <RailCard
          title="Полки"
          accent={palette.accent}
          icon={<SlidersHorizontal size={15} />}
          action={sceneShelf ? { label: t('Все полки'), onClick: () => setSceneShelf('') } : undefined}
        >
          <RailList
            items={sceneShelves.map(s => ({
              id: s.id,
              label: t(s.title),
              hint: String(sceneWorks.filter(w => w.shelf === s.id).length),
            }))}
            value={sceneShelf}
            onChange={v => setSceneShelf(v === sceneShelf ? '' : v)}
            accent={palette.accent}
            soft={palette.soft}
          />
        </RailCard>
      )}

      {scenesOn && (
        <RailCard title="Показ" accent={palette.accent} icon={<Eye size={15} />}>
          <RailToggle
            label="Прятать спойлеры"
            on={hideSpoilers}
            onChange={setHideSpoilers}
            accent={palette.accent}
          />
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {t('Скрывает сцены, которые раскрывают середину или финал. Первые сцены книги видно всегда.')}
          </div>
        </RailCard>
      )}

      {/* Фильтры библиотеки живут в строке управления, а не здесь — см.
          «Одно место для сита» в комментарии к строке. Рейлу остаётся то, что
          отвечает на вопрос «что показываем»: половина «Чтения» и «Показ». */}

      {mode === 'vocab' && (hasBook || nestsOn || packsOn || decksOn) && !openItem && !openNest && !openMyWords && !openPack && !openSet && (
        <>
          {/* Уровень уехал в строку управления — там же, где он у сцен,
              грамматики и библиотеки. Здесь остаётся выбор материала и полка:
              это «что показываем», а не «чем сузили». */}
          <RailCard title="Материал" accent={palette.accent} icon={<Layers size={15} />}
            action={shelf || packShelf
              ? { label: t('Сбросить'), onClick: () => { setShelf(''); setPackShelf('') } }
              : undefined}>
            {!narrow && (
            <RailSegment
              options={[
                // «Наборы» — все стопки языка разом: разговорник, полки
                // учителя и подборки-сиды. Половина стоит и без разговорника:
                // группы бывают там, где книги нет.
                ...(hasBook || decksOn ? [{ value: 'sets', label: 'Наборы', icon: <Layers size={15} /> }] : []),
                // «Слова» отдельной таблеткой от «Наборов»: это разный
                // материал, а не разный фильтр одного. В наборах — готовые
                // фразы под ситуацию, здесь — лексика пачкой по смыслу.
                ...(packsOn ? [{ value: 'packs', label: 'Слова', icon: <Languages size={15} /> }] : []),
                // Подпись короткая: «Повторение» рядом с соседями не влезало
                // в рейл и обрезалось в «Повторе…». Неактивные ждут значками
                // (idleIcon), выбранный забирает освободившееся место.
                { value: 'due', label: 'Повторы', badge: due, icon: <RotateCcw size={15} /> },
                // Третья таблетка только там, где гнёзда для языка написаны:
                // пустая вкладка хуже отсутствующей.
                ...(nestsOn ? [{ value: 'nests', label: 'Созвучия', icon: <Ear size={15} /> }] : []),
              ]}
              value={vocabView}
              onChange={v => v && setVocabView(v as VocabView)}
              accent={palette.accent}
              soft={palette.soft}
              clearable={false}
              idleIcon
            />
            )}
            {/* Полки разговорника — сито верхнего этажа. Внутри папки их нет:
                там лежат наборы одной группы, и «В городе» к ним никак. */}
            {vocabView === 'sets' && !openGroup && shelves.length > 0 && (
              <RailList
                items={shelves.map(s => ({ id: s.title, label: t(s.title), hint: String(s.count) }))}
                value={shelf}
                onChange={v => setShelf(v === shelf ? '' : v)}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
            {vocabView === 'packs' && packShelvesList.length > 0 && (
              <RailList
                items={packShelvesList.map(x => ({ id: x.title, label: t(x.title), sub: t(x.subtitle), hint: String(x.count) }))}
                value={packShelf}
                onChange={v => setPackShelf(v === packShelf ? '' : v)}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
          </RailCard>
          {/* Полки — папки витрины, а не сито: строка ОТКРЫВАЕТ группу, как
              плитка в сетке, и стоять ей поэтому не в «Фильтрах». Группа БЕЗ
              ИМЕНИ (обёртка одиночного набора, см. isShelf) папки не заводит —
              её набор лежит в сетке сам. */}
          {vocabView === 'sets' && (groups ?? []).some(isShelf) && (
            <RailCard title="Полки" accent={palette.accent} icon={<Layers size={15} />}
              action={openGroup ? { label: t('Ко всем'), onClick: () => setOpenGroupId('') } : undefined}>
              <RailList
                items={(groups ?? []).filter(isShelf).map(g => ({
                  id: g.id,
                  label: g.title,
                  sub: g.about,
                  // Через allSetCards, а не x.cards: у набора с сериями свои карточки
                  // пусты, они лежат в стопках, и прямой счёт давал полке ноль.
                  hint: String(g.sets.reduce((n, x) => n + allSetCards(x).length, 0)),
                }))}
                value={openGroupId}
                onChange={v => setOpenGroupId(v === openGroupId ? '' : v)}
                accent={palette.accent}
                soft={palette.soft}
              />
              {/* Своя подборка правится оттуда же, где открыта: кнопка стоит
                  под списком полок и появляется, только когда открыта СВОЯ. */}
              {mySetsOn && openGroup?.authorStudentId && (
                <button
                  onClick={() => setEditGroup(openGroup)}
                  style={{
                    height: 34, borderRadius: 12, border: `1px solid ${palette.accent}55`,
                    background: 'transparent', color: palette.accent, fontFamily: 'inherit',
                    fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {t('Править подборку')}
                </button>
              )}
            </RailCard>
          )}
          {/* Глубина по курсу. Стоит рядом с материалом, а не в шапке: цифра
              объясняет ровно то, почему список именно такой длины. */}
          {vocabView === 'nests' && (
            <RailCard title="Глубина" accent={palette.accent} icon={<Layers size={15} />}>
              <RailStat label="Рядов открыто" value={nests.length} />
              {nestsLocked > 0 && <RailStat label="Ждут курса" value={nestsLocked} />}
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                {t(reachNote(reach))}
              </div>
            </RailCard>
          )}
          {(hasBook || packsOn || decksOn) && vocabView !== 'nests' && (
            <RailCard title="Показ" accent={palette.accent} icon={<Eye size={15} />}>
              <RailToggle label="Романизация" on={phraseView.reading}
                onChange={v => setPhraseView(s => ({ ...s, reading: v }))} accent={palette.accent} />
              <RailToggle label="Сначала перевод" on={phraseView.reverse}
                onChange={v => setPhraseView(s => ({ ...s, reverse: v }))} accent={palette.accent} />
            </RailCard>
          )}
        </>
      )}

      {mode === 'vocab' && openMyWords && (
        <>
          <RailCard title="Словарь" accent={palette.accent} icon={<BookMarked size={15} />}>
            <RailStat label="Слов собрано" value={myStats.total} />
            <RailStat label="Выучено" value={myStats.learned} tone={myStats.learned > 0 ? 'good' : undefined} />
            <RailStat label="Сегодня в стопке" value={myStats.due} tone={myStats.due > 0 ? 'warn' : undefined} />
            {/* Откуда берутся слова — здесь, а не только в пустом состоянии:
                словарь пополняют по ходу дела, и напоминание нужно тому, у
                кого в нём уже что-то есть, ровно так же. */}
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
              {bindShortWords(t('Слова приходят из текстов «Чтения» (нажми на слово → «В словарь»), из уроков курса и из разбора созвучий.'))}
            </div>
          </RailCard>
          <RailCard title="Показ" accent={palette.accent} icon={<Eye size={15} />}>
            <RailToggle label="Романизация" on={phraseView.reading}
              onChange={v => setPhraseView(s => ({ ...s, reading: v }))} accent={palette.accent} />
            <RailToggle label="Сначала перевод" on={phraseView.reverse}
              onChange={v => setPhraseView(s => ({ ...s, reverse: v }))} accent={palette.accent} />
          </RailCard>
        </>
      )}

      {mode === 'vocab' && openItem && (
        <>
          <RailCard title="Формула темы" accent={palette.accent} icon={<Sparkle size={15} />}>
            {book?.notes[openItem.theme.id] ? (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: palette.accent, lineHeight: 1.45 }}>
                  {book.notes[openItem.theme.id].formula}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-text-2)' }}>
                  {book.notes[openItem.theme.id].note}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{t(openItem.theme.goal)}</div>
            )}
          </RailCard>
          <RailCard title="Тема" accent={palette.accent} icon={<Layers size={15} />}>
            <RailStat label="Уровень" value={themeLevel(openItem)} />
            <RailStat label="Фраз в теме" value={openItem.phrases.length} />
            {/* Три числа вместо одного «уже в колоде»: что уже держится в
                памяти, что вернётся сегодня и сколько раз тема забывалась. */}
            <RailStat label="Выучено" value={openStats.learned} tone={openStats.learned > 0 ? 'good' : undefined} />
            <RailStat label="Сегодня в стопке" value={openStats.due} tone={openStats.due > 0 ? 'warn' : undefined} />
            {openStats.lapses > 0 && <RailStat label="Ошибок за всё время" value={openStats.lapses} />}
            <TakeWholeTheme
              phrases={openItem.phrases}
              owner={owner}
              subjectId={subjectId}
              accent={palette.accent}
              onAdded={() => setKnownKey(k => k + 1)}
            />
          </RailCard>
          <RailCard title="Показ" accent={palette.accent} icon={<Eye size={15} />}>
            <RailToggle label="Романизация" on={phraseView.reading}
              onChange={v => setPhraseView(s => ({ ...s, reading: v }))} accent={palette.accent} />
            <RailToggle label="Сначала перевод" on={phraseView.reverse}
              onChange={v => setPhraseView(s => ({ ...s, reverse: v }))} accent={palette.accent} />
          </RailCard>
        </>
      )}

      {mode === 'blocks' && blocks.rail}

      {mode === 'guide' && guide.rail}

      {mode === 'speaking' && speaking.rail}

      {mode === 'vocab' && !hasBook && vocabView !== 'nests' && (
        <RailCard title="Колода" accent={palette.accent} icon={<Layers size={15} />}>
          <RailStat label="На сегодня" value={due} tone={due > 0 ? 'warn' : undefined} />
          <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
            {bindShortWords(t('Разговорника для этого языка пока нет — колода набирается из уроков и ошибок.'))}
          </div>
        </RailCard>
      )}

      {/* Голос — общий на весь язык, поэтому и карточка одна на все режимы.
          Раньше выбор стоял только в рейле читалки: карточки, разговорник и
          созвучия читались тем диктором, которого угадала автоматика, и
          поменять его было негде — при том что ключ в localStorage у них с
          читалкой один и тот же. */}
      {voiceChoice && (
        <RailCard title="Озвучка" accent={palette.accent} icon={<Mic size={15} />}>
          <VoicePicker lang={lang} accent={palette.accent} soft={palette.soft} />
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
            {bindShortWords(t('Этим голосом читается всё на этом языке: тексты, карточки, разговорник.'))}
          </div>
        </RailCard>
      )}
    </>
  )

  // ── Навигация телефона ─────────────────────────────────────────────────────
  //
  // Плитки режимов и половины текущего режима. На десктопе это карточки рейла,
  // на телефоне — нижняя шторка и чипсы дока: рейл туда не помещается, а класть
  // навигацию в одну кучу с фильтрами значит прятать переезд между экранами за
  // кнопкой, на которой написано «фильтры».
  const navViews: TrainerNav['views'] =
    mode === 'reading' && (sceneLib || feedLib)
      ? [
          // На телефоне лента отключена (см. feedLib), и первой половиной идут
          // сцены: чипс, на который попадаешь без выбора, должен вести в
          // материал, которого больше нигде нет.
          ...(sceneLib && narrow ? [{ id: 'scenes', label: 'Сцены', badge: scenesTotal }] : []),
          ...(feedLib ? [{ id: 'feed', label: 'Лента', badge: feedTotal }] : []),
          { id: 'texts', label: 'Тексты', badge: allTexts.length },
          ...(sceneLib && !narrow ? [{ id: 'scenes', label: 'Сцены', badge: scenesTotal }] : []),
        ]
    : mode === 'vocab'
      ? [
          ...(hasBook || decksOn ? [{ id: 'sets', label: 'Наборы' }] : []),
          ...(packsOn ? [{ id: 'packs', label: 'Слова' }] : []),
          { id: 'due', label: 'Повторение', badge: due },
          ...(nestsOn ? [{ id: 'nests', label: 'Созвучия' }] : []),
        ]
    : mode === 'blocks' ? blocks.views
    : mode === 'guide'
      ? [
          ...guide.views,
        ]
    : undefined

  const navView =
    mode === 'reading' ? readingView
    : mode === 'vocab' ? vocabView
    : mode === 'blocks' ? blocks.view
    : mode === 'guide' ? guide.view
    : undefined

  // Возможности предмета из реестра. Запасной список — полный языковой: у
  // языка, которому возможности ещё не проставили, ничего пропадать не должно.
  const allowed = getSubject(subjectId)?.trainer ?? MODES.map(m => MODE_CAP[m.id])

  const nav: TrainerNav = {
    modes: MODES
      // Два сита. Первое — реестр возможностей предмета (SubjectDef.trainer):
      // он говорит, что предмету вообще положено. Второе — наличие материала:
      // справочник, тексты, разбор слов. Первое сито отвечает на вопрос «бывает
      // ли у этого предмета говорение», второе — «написано ли оно уже».
      .filter(m => allowed.includes(MODE_CAP[m.id]))
      .filter(m => (m.id !== 'blocks' || blocks.on) && (m.id !== 'grammar' || grammar.on) && (m.id !== 'guide' || guide.on))
      .map(m => ({ id: m.id, label: m.label, count: modeCounts[m.id], Icon: m.Icon })),
    mode,
    onMode: m => switchMode(m as Mode),
    views: navViews,
    view: navView,
    onView: v => {
      if (mode === 'reading') switchReadingView(v as ReadingView)
      else if (mode === 'vocab') setVocabView(v as VocabView)
      else if (mode === 'blocks') blocks.setView(v as BlocksView)
      else if (mode === 'guide') guide.setView(v as GuideView)
    },
    accent: palette.accent,
  }

  // ── Строка управления ──────────────────────────────────────────────────────

  const SORTS_LIB = [
    { value: 'order', label: 'По порядку' },
    { value: 'level', label: 'По уровню' },
    { value: 'short', label: 'Покороче' },
  ]
  const SORTS_SETS = [
    { value: 'order', label: 'По порядку' },
    { value: 'level', label: 'По уровню' },
    { value: 'size', label: 'По размеру' },
    { value: 'progress', label: 'По прогрессу' },
  ]

  let toolbar: React.ReactNode = null
  if (feedOn) {
    // У ленты в строке только поворот: ни поиска, ни сортировки, ни статусов.
    // Искать в ленте нечего (её листают, а не подбирают материал), а «сначала
    // старое» ленте противопоказано — датой она и держится.
    toolbar = (
      <Toolbar count={feedShown.length}>
        {/* Ряд ровно по колонке постов: он тут один и работает шапкой ленты.
            Свой, а не общий StatusTabs: он сворачивается при прокрутке до
            текущей рубрики словом и значков соседей — см. FeedTabs. */}
        <FeedTabs
          chips={feedChips}
          value={feedPick}
          onChange={setFeedFilter}
          accent={palette.accent}
        />
        <ToolCount>
          {feedShown.length} {t(materialsWord(feedShown.length))}
        </ToolCount>
      </Toolbar>
    )
  } else if (scenesOn) {
    toolbar = (
      <Toolbar count={openWork ? undefined : visibleWorks.length}>
        {openWork ? (
          <ToolButton onClick={() => setOpenWorkId(null)}>
            <ChevronLeft size={14} /> {t('К полкам')}
          </ToolButton>
        ) : (
          <>
            <SearchPill value={query} onChange={setQuery} placeholder={t('Автор или название…')} />
            {/* Платформы показываем, только если они у языка есть: на корейской
                полке из одних рассказов фильтр «где смотрел» — пустая таблетка. */}
            {sceneLevelOpts.length > 1 && (
              <FilterMenu
                label="Уровень"
                options={sceneLevelOpts}
                value={sceneLevels}
                onChange={setSceneLevels}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
            {platformOpts.length > 1 && (
              <FilterMenu
                label="Платформа"
                options={platformOpts}
                value={scenePlatforms}
                onChange={setScenePlatforms}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
            {tagOpts.length > 1 && (
              <FilterMenu
                label="Тематика"
                options={tagOpts}
                value={sceneTags}
                onChange={setSceneTags}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
            {/* Статус — та же ось и в том же месте, что у текстов, записей и
                наборов: после фильтров, перед счётчиком. */}
            <StatusTabs
              options={[
                { value: '', label: 'Все' },
                { value: 'new', label: 'Не начатые' },
                { value: 'wip', label: 'В работе' },
                { value: 'done', label: 'Пройдено' },
              ]}
              value={status}
              onChange={setStatus}
              accent={palette.accent}
            />
          </>
        )}
        <ToolRight>
          <ToolCount>
            {openWork
              ? `${scenesOf(openWork.id).length} ${t(scenesWord(scenesOf(openWork.id).length))}`
              : `${visibleWorks.length} ${t(plural(visibleWorks.length, ['произведение', 'произведения', 'произведений']))}`}
          </ToolCount>
        </ToolRight>
      </Toolbar>
    )
  } else if (isLang) {
    toolbar = (
      <Toolbar count={library.length}>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Название или тема…')} />
        {/* ОДНО МЕСТО ДЛЯ СИТА. Раньше уровень и тема стояли у библиотеки в
            рейле, у сцен и грамматики — таблетками в строке, а у наборов — и
            там, и там. Человек, перешедший из «Чтения» в «Аудирование», искал
            «Уровень» глазами заново. Теперь ось сужения ВСЕГДА таблетка строки,
            а рейл отвечает только на вопрос «что показываем» (половина режима,
            полка, показ). Порядок таблеток тоже один на весь тренажёр:
            поиск → уровень → тематика → частные оси → статус → сортировка →
            счётчик единицами экрана. */}
        {levelOpts.length > 1 && (
          <FilterMenu
            label="Уровень"
            options={levelOpts.map(v => ({ value: v, label: v, count: pool.filter(x => x.level === v).length }))}
            value={fLevel}
            onChange={setFLevel}
            accent={palette.accent}
            soft={palette.soft}
          />
        )}
        {topicOpts.length > 1 && (
          <FilterMenu
            label="Тематика"
            options={topicOpts.map(v => ({ value: v, label: t(v), count: pool.filter(x => x.topic === v).length }))}
            value={fTopic}
            onChange={setFTopic}
            accent={palette.accent}
            soft={palette.soft}
          />
        )}
        {mode === 'reading' && skillOpts.length > 1 && (
          <FilterMenu
            label="Навык"
            options={skillOpts.map(v => ({
              value: v, label: t(v),
              count: allTexts.filter(x => x.skill === v).length,
            }))}
            value={fSkill}
            onChange={setFSkill}
            accent={palette.accent}
            soft={palette.soft}
          />
        )}
        <FilterMenu
          label="Длина"
          options={LENGTHS.map(l => ({
            value: l.value, label: t(l.label),
            count: pool.filter(x => l.fit(x.minutes)).length,
          }))}
          value={fLen}
          onChange={setFLen}
          accent={palette.accent}
          soft={palette.soft}
        />
        <StatusTabs
          options={[
            { value: '', label: 'Все' },
            { value: 'new', label: 'Не начатые' },
            { value: 'done', label: 'Пройдено' },
          ]}
          value={status}
          onChange={setStatus}
          accent={palette.accent}
        />
        <SortMenu options={SORTS_LIB} value={sort} onChange={setSort} accent={palette.accent} soft={palette.soft} />
        <ToolCount>
          {library.length} {t(plural(library.length, mode === 'listening'
            ? ['запись', 'записи', 'записей']
            : ['текст', 'текста', 'текстов']))}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'grammar') {
    toolbar = grammar.toolbar
  } else if (mode === 'blocks') {
    toolbar = blocks.toolbar
  } else if (mode === 'vocab' && vocabView === 'nests' && !openNest) {
    toolbar = (
      <Toolbar>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Найти слово или ряд…')} />
        <ToolCount>
          {visibleNests.length} {t('рядов')}
          {nestsLocked > 0 && ` · ${nestsLocked} ${t('ждут курса')}`}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && openMyWords) {
    toolbar = (
      <Toolbar>
        <BackToSets onBack={() => setOpenTheme(null)} />
        {/* Обёртка не декоративная: на телефоне Toolbar забирает StatusTabs в
            шторку «Фильтры», а здесь это не фильтр, а способ прогона колоды —
            «Свайп» против «Списком» жмут постоянно и ищут глазами в строке.
            Обёртка выводит контрол из-под разбора по типу и оставляет в строке
            (см. Toolbar в TrainerShell). */}
        <div style={{ display: 'flex' }}>
          <StatusTabs
            options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
            value={run}
            onChange={v => setRun(v as RunMode)}
            accent={palette.accent}
          />
        </div>
        <ToolCount>{myStats.total} {t('слов')}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && vocabView === 'sets' && !openItem && !openSet && !editGroup) {
    toolbar = (
      <Toolbar count={setsDecks.length}>
        {/* Внутри папки «назад» стоит первым — как в открытом наборе: папка
            такой же экран, а не выбранная слева галочка. */}
        {openGroup && <BackToSets onBack={() => setOpenGroupId('')} />}
        <SearchPill value={query} onChange={setQuery}
          placeholder={t(openGroup ? 'Найти набор…' : 'Найти тему или слово…')} />
        {!openGroup && setLevelOpts.length > 1 && (
          <FilterMenu
            label="Уровень"
            options={setLevelOpts.map(l => ({
              value: l, label: l,
              count: allThemes.filter(x => themeLevel(x) === l).length,
            }))}
            value={fLevel}
            onChange={setFLevel}
            accent={palette.accent}
            soft={palette.soft}
          />
        )}
        <StatusTabs
          options={[
            { value: '', label: 'Все' },
            { value: 'new', label: 'Не начатые' },
            { value: 'wip', label: 'В работе' },
            { value: 'done', label: 'Выучено' },
          ]}
          value={status}
          onChange={setStatus}
          accent={palette.accent}
        />
        {!openGroup && hasBook && (
          <SortMenu options={SORTS_SETS} value={sort} onChange={setSort} accent={palette.accent} soft={palette.soft} />
        )}
        <ToolCount>
          {openGroup
            ? `${openGroup.title} · ${setsDecks.length} ${t('наборов')}`
            : `${setsDecks.reduce((n, x) => n + x.phrases.length, 0)} ${t('фраз')} · ${setsDecks.length} ${t('наборов')}`}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && packsOn && vocabView === 'packs' && !openPack) {
    toolbar = (
      <Toolbar count={packDecks.length}>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Найти слово или набор…')} />
        {packLevelOpts.length > 1 && (
          <FilterMenu
            label="Уровень"
            options={packLevelOpts.map(l => ({
              value: l, label: l,
              count: packsList.filter(x => survivalLevelLabel(x.level, subject) === l).length,
            }))}
            value={fLevel}
            onChange={setFLevel}
            accent={palette.accent}
            soft={palette.soft}
          />
        )}
        <StatusTabs
          options={[
            { value: '', label: 'Все' },
            { value: 'new', label: 'Не начатые' },
            { value: 'wip', label: 'В работе' },
            { value: 'done', label: 'Выучено' },
          ]}
          value={status}
          onChange={setStatus}
          accent={palette.accent}
        />
        <ToolCount>
          {packDecks.reduce((n, x) => n + x.phrases.length, 0)} {t('слов')} · {packDecks.length} {t('наборов')}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && openSet) {
    toolbar = (
      <Toolbar>
        <BackToSets onBack={() => (openSubset ? setOpenSubsetId(null) : setOpenSetId(null))} />
        <StatusTabs
          options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
          value={run}
          onChange={v => setRun(v as RunMode)}
          accent={palette.accent}
        />
        <ToolCount>{openSet.set.title}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && openPack) {
    toolbar = (
      <Toolbar>
        <BackToSets onBack={() => setOpenPackId(null)} />
        <StatusTabs
          options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
          value={run}
          onChange={v => setRun(v as RunMode)}
          accent={palette.accent}
        />
        <ToolCount>{t(openPack.title)}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'guide') {
    toolbar = guide.toolbar
  } else if (mode === 'speaking') {
    toolbar = speaking.toolbar
  } else if (mode === 'vocab' && openItem) {
    toolbar = (
      <Toolbar>
        <BackToSets onBack={() => setOpenTheme(null)} />
        {/* Обёртка ради ref: про этот переключатель рассказывает онбординг
            стопки, а он живёт внутри CardDeck и своей строки управления не
            видит. Шаг уезжает туда через ThemeSession (см. runTourStep). */}
        <div ref={runTabsRef} style={{ display: 'flex' }}>
          <StatusTabs
            options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
            value={run}
            onChange={v => setRun(v as RunMode)}
            accent={palette.accent}
          />
        </div>
        <ToolCount>{t(openItem.theme.title)}</ToolCount>
      </Toolbar>
    )
  }

  // ── Содержимое ─────────────────────────────────────────────────────────────

  let content: React.ReactNode = null

  if (mode === 'grammar') {
    content = grammar.content
  } else if (scenesOn) {
    content = scenes === undefined ? (
      <Skeleton.Cards rows={3} />
    ) : openWork ? (
      <WorkPage
        work={openWork}
        scenes={scenesOf(openWork.id)}
        done={sceneDone}
        accent={palette.accent}
        soft={palette.soft}
        hideSpoilers={hideSpoilers}
        onOpenScene={setOpenSceneId}
      />
    ) : (
      <WorkGrid
        groups={sceneGroups}
        scenesOf={scenesOf}
        levelOrder={sceneLevelOpts.map(o => o.value)}
        done={sceneDone}
        accent={palette.accent}
        soft={palette.soft}
        onOpen={setOpenWorkId}
      />
    )
  } else if (feedOn) {
    content = feed === undefined ? (
      <Skeleton.Cards rows={3} />
    ) : (
      <FeedList
        items={feedShown}
        lang={lang}
        accent={palette.accent}
        subjectId={subjectId}
        onRefresh={refreshFeed}
      />
    )
  } else if (isLang) {
    content = library.length === 0 ? (
      <ShellEmpty text={pool.length === 0
        ? 'Для этого языка материалов пока нет. Учитель может добавить свои.'
        : 'Под выбранные фильтры ничего не подошло. Сбрось один из них.'} />
    ) : (
      <TileGrid min={236}>
        {library.map(x => {
          const res = resultFrom(kind, x.id, results)
          return (
            <Tile
              key={x.id}
              accent={palette.accent}
              onClick={() => (mode === 'listening' ? setOpenAudioId((x as ListeningItem).id) : setOpenTextId((x as ReadingText).id))}
            >
              {/* Ряд плашек один на весь тренажёр: уровень акцентом первым,
                  дальше метки серым — тематика и размер. Тема была здесь серой
                  строкой, а у сцен и грамматики то же самое стояло плашкой, и
                  две соседние витрины выглядели как из разных приложений. */}
              <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                <TileChip tone="accent" accent={palette.accent} soft={palette.soft}>{x.level}</TileChip>
                <TileChip tone="mute">{t(x.topic)}</TileChip>
                <TileChip tone="mute">{x.minutes} {t('мин')}</TileChip>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                {x.title}
              </span>
              <TileMeter value={res ? Math.round((res.score / Math.max(res.total, 1)) * 100) : 0} />
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
                <span>{res ? t('пройдено') : `${x.questions.length} ${t('вопроса')}`}</span>
                {res && (
                  <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>
                    {res.score} / {res.total}
                  </span>
                )}
              </span>
            </Tile>
          )
        })}
      </TileGrid>
    )
  } else if (mode === 'vocab' && vocabView === 'nests') {
    // Гнёзда созвучий: витрина и разбор. Прогон пишет результат туда же, куда
    // текст и запись, — в общий журнал материалов (lib/trainerProgress.ts),
    // поэтому плитка гнезда показывает счёт ровно как плитка текста.
    content = openNest ? (
      <NestPage
        nest={openNest}
        lang={lang}
        accent={palette.accent}
        soft={palette.soft}
        owner={owner}
        subjectId={subjectId}
        onFinished={(score, total) => {
          saveResult('nest', openNest.id, score, total)
          setResultsKey(k => k + 1)
          setKnownKey(k => k + 1)
        }}
        onBack={() => setOpenNestId(null)}
      />
    ) : visibleNests.length === 0 ? (
      <ShellEmpty text={nests.length === 0
        ? 'Ряды созвучий открываются по мере прохождения курса — пока ни одного юнита не пройдено.'
        : 'Под поиск ничего не подошло.'} />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0, lineHeight: 1.6, ...proseWrap }}>
          {bindShortWords(t('Слова, которые слипаются на слух. Разбор показывает, чем они отличаются, прогон проверяет, слышно ли это, а промахи уходят в колоду повторений и возвращаются сами.'))}
        </p>
        <NestGrid
          nests={visibleNests}
          results={id => resultFrom('nest', id, results)}
          accent={palette.accent}
          soft={palette.soft}
          onOpen={id => { setOpenNestId(id); setQuery('') }}
        />
      </div>
    )
  } else if (mode === 'vocab' && openMyWords) {
    // Книга нужна не ради показа, а ради вычитания: пока она едет, фразы
    // разговорника не отличить от своих слов, и словарь на секунду показал бы
    // все шестьсот. Поэтому ждём и её, и саму колоду.
    content = !cardsReady || (hasBook && book === undefined) ? (
      <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <MyWordsSession
          words={myWords}
          lang={lang}
          subjectId={subjectId}
          accent={palette.accent}
          owner={owner}
          view={phraseView}
          run={run}
          states={states}
          statesReady={statesReady}
          onGraded={onGraded}
          onForget={forget}
          tourExtra={runTourStep}
        />
        {run === 'swipe' && myWords.length > 0 && <DeckHint />}
      </div>
    )
  } else if (mode === 'vocab' && openItem && book) {
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <ThemeSession
          book={book}
          item={openItem}
          lang={lang}
          subjectId={subjectId}
          accent={palette.accent}
          owner={owner}
          view={phraseView}
          run={run}
          states={states}
          statesReady={statesReady}
          onGraded={onGraded}
          tourExtra={runTourStep}
        />
        {run === 'swipe' && <DeckHint />}
      </div>
    )
  } else if (mode === 'guide') {
    content = guide.content
  } else if (mode === 'vocab' && editGroup) {
    content = (
      <MySetEditor
        group={editGroup}
        studentId={owner.studentId ?? ''}
        accent={palette.accent}
        onClose={() => setEditGroup(null)}
        onSaved={() => { setEditGroup(null); setGroupsKey(k => k + 1) }}
      />
    )
  } else if (mode === 'vocab' && openSet && openSet.set.subsets?.length && !openSubset) {
    // Набор с подстопками сам карточек не показывает: между ним и прогоном
    // стоит выбор серии. Плитка та же, что у наборов, — витрина не должна
    // менять язык на четвёртом уровне.
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <TileGrid min={220}>
          {openSet.set.subsets.map(sub => {
            const st = themeStats({ theme: { id: sub.id, title: sub.title }, phrases: sub.cards }, states)
            const pct = st.total ? Math.round((st.learned / st.total) * 100) : 0
            return (
              <Tile key={sub.id} accent={palette.accent} onClick={() => setOpenSubsetId(sub.id)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <TileChip tone="mute">{sub.cards.length} {t('слов')}</TileChip>
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                    {sub.title}
                  </span>
                </span>
                <TileMeter value={pct} />
                <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
                  <span>{st.total - st.fresh > 0 ? t('в работе') : t('не начата')}</span>
                  {st.learned > 0 && (
                    <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>
                      {st.learned} / {st.total}
                    </span>
                  )}
                </span>
              </Tile>
            )
          })}
        </TileGrid>
      </div>
    )
  } else if (mode === 'vocab' && openSet) {
    // Прогон идёт по стопке серии, если она открыта, и по самому набору, если
    // подстопок у него нет. Ключи прогресса и стикера берутся у того же
    // источника — иначе серия считала бы прогресс сезона.
    const runSet = openSubset ?? openSet.set
    content = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PhraseRun
          runId={`cg-${runSet.id}`}
          phrases={runSet.cards}
          label={runSet.title}
          // Стикер за чистый прогон — как у темы разговорника и набора слов.
          // Ключ с префиксом cg: и id набора: он стабилен и у сида (см.
          // data/cardSeeds), и у строки в базе.
          reward={{ key: `cg:${runSet.id}`, title: runSet.title, size: runSet.cards.length }}
          doneTitle="Набор пройден"
          emptyTitle="На сегодня набор закрыт"
          emptyText={'Все слова набора уже разобраны и ждут своего дня.\nМожно прогнать его заново — расписание при этом продолжит считаться.'}
          lang={lang}
          subjectId={subjectId}
          accent={palette.accent}
          owner={owner}
          view={phraseView}
          run={run}
          states={states}
          statesReady={statesReady}
          onGraded={onGraded}
          tourExtra={runTourStep}
        />
        {run === 'swipe' && <DeckHint />}
      </div>
    )
  } else if (mode === 'vocab' && openPack) {
    content = (
      <PhraseRun
        runId={`${packBook?.key ?? 'wp'}-${openPack.id}`}
        phrases={openPack.words}
        label={openPack.title}
        // Стикер за чистый прогон — как у темы разговорника: набор такая же
        // стопка, и повод для награды у них один.
        reward={{ key: `wp:${packBook?.key ?? 'wp'}:${openPack.id}`, title: openPack.title, size: openPack.words.length }}
        doneTitle="Набор пройден"
        emptyTitle="На сегодня набор закрыт"
        emptyText={'Все слова набора уже разобраны и ждут своего дня.\nМожно прогнать его заново — расписание при этом продолжит считаться.'}
        lang={lang}
        subjectId={subjectId}
        accent={palette.accent}
        owner={owner}
        view={phraseView}
        run={run}
        states={states}
        statesReady={statesReady}
        onGraded={onGraded}
      />
    )
  } else if (mode === 'vocab' && vocabView === 'packs' && packsOn) {
    content = packBook === undefined
      ? <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
      : (
        <PhraseDecks
          themes={packDecks}
          states={states}
          accent={palette.accent}
          soft={palette.soft}
          levelLabel={x => survivalLevelLabel(x.pack.level, subject)}
          onOpen={id => { setOpenPackId(id); setQuery(''); setStatus(''); setRun('list') }}
        />
      )
  } else if (mode === 'vocab' && vocabView === 'sets' && (hasBook || decksOn) && !editGroup) {
    // ВСЕ НАБОРЫ ЯЗЫКА В ОДНОЙ ВИТРИНЕ: темы разговорника, наборы полок и
    // одиночные наборы учителя. Полка стоит папкой (плитки ниже), внутри
    // папки — её наборы; см. setsDecks.
    content = (hasBook && book === undefined) || groups === undefined
      ? <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
      : (
        <PhraseDecks
          themes={setsDecks}
          states={states}
          accent={palette.accent}
          soft={palette.soft}
          levelLabel={x => x.label}
          early={x => x.ahead}
          lead={openGroup ? undefined : (
            <>
              {hasBook && (
                <MyWordsTile
                  words={myWords}
                  states={states}
                  ready={cardsReady}
                  accent={palette.accent}
                  soft={palette.soft}
                  // Словарь открывается СПИСКОМ, а не свайпом: сюда приходят
                  // посмотреть, что набрано, — стопка на сегодня в двух кликах,
                  // а обратно из свайпа к списку человек догадается не сразу.
                  onOpen={() => { setOpenTheme(MY_WORDS_ID); setQuery(''); setStatus(''); setRun('list') }}
                />
              )}
              {/* Папки полок. Стоят перед сеткой и не участвуют в поиске: по
                  слову ищут набор, а не полку, и найденные наборы приезжают в
                  сетку сами (см. setsDecks). */}
              {!query.trim() && (groups ?? []).filter(isShelf).map(g => (
                <Tile key={g.id} accent={palette.accent} stack onClick={() => setOpenGroupId(g.id)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TileChip tone="accent" accent={palette.accent} soft={palette.soft}>
                      {g.sets.length} {t(plural(g.sets.length, ['набор', 'набора', 'наборов']))}
                    </TileChip>
                    <TileChip>{(() => { const n = g.sets.reduce((a, x) => a + allSetCards(x).length, 0); return `${n} ${t(plural(n, ['карточка', 'карточки', 'карточек']))}` })()}</TileChip>
                  </span>
                  {/* Значок стоит у ПЕРВОЙ строки заголовка, а не по центру
                      двух: у длинных названий он уезжал в межстрочье и читался
                      как значок пустоты. marginTop — до центра первой строки.
                      Шрифт и отступы — как у заголовка набора (PhraseDecks):
                      строки полки и соседних плиток стоят по одной сетке. */}
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 7,
                    fontSize: 14.5, lineHeight: 1.3, fontWeight: 750, color: 'var(--color-text)',
                  }}>
                    <Layers size={15} style={{ color: palette.accent, flexShrink: 0, marginTop: 2 }} aria-hidden />
                    {g.title}
                  </div>
                  {/* Описание полки — тремя строками: у сида это целый абзац,
                      и во всю длину плитка полки вырастала вчетверо выше
                      соседних. */}
                  {!!g.about && (
                    <div style={{
                      fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
                      display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {g.about}
                    </div>
                  )}
                </Tile>
              ))}
              {/* Плитка «Своя подборка» — только при поднятом флаге. Плиткой, а
                  не кнопкой в панели: собрать своё — такой же вход в материал,
                  как открыть чужой набор, и место у него там же. */}
              {mySetsOn && owner.studentId && (
                <Tile
                  accent={palette.accent}
                  stack
                  tint={{ surface: `${palette.accent}14`, border: `${palette.accent}4d` }}
                  onClick={() => setEditGroup(emptyMyGroup(lang, subjectId))}
                >
                  <TileChip tone="solid" accent={palette.accent} soft={palette.soft}>
                    {t('Своя')}
                  </TileChip>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginTop: 8 }}>
                    {t('Своя подборка')}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, lineHeight: 1.45 }}>
                    {t('Свои слова, разложенные по своим наборам: сериал по сезонам, книга по главам.')}
                  </div>
                </Tile>
              )}
            </>
          )}
          onOpen={id => {
            setQuery(''); setStatus('')
            // Набор группы и тема разговорника лежат в одной сетке, и открывать
            // их надо разным: у набора своя стопка (PhraseRun), у темы — своя.
            if ((groups ?? []).some(g => g.sets.some(x => x.id === id))) {
              setOpenSetId(id); setRun('list')
            } else {
              setOpenTheme(id); setRun('swipe')
            }
          }}
        />
      )
  } else if (mode === 'vocab') {
    content = (
      <div>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 14, lineHeight: 1.6 }}>
          {t('Слова из уроков и ошибок повторяются по расписанию: каждое возвращается ровно тогда, когда его вот-вот забудешь.')}
        </p>
        <CardDeck
          // key перезапускает сессию после подгрузки слов: колода читается один
          // раз на монтировании, иначе новые карточки появятся только после
          // ухода со вкладки и обратно.
          //
          // Предмет — тоже часть ключа: у стопки своя очередь, свой указатель и
          // свой прогресс сессии, и при смене предмета их надо начинать заново,
          // а не дочитывать чужую колоду.
          key={`${subjectId}:${deckKey}`}
          owner={owner}
          accent={palette.accent}
          lang={lang}
          subject={subjectId}
          emptyExtra={
            glossaryCards.length > 0 ? (
              <button
                onClick={seedFromTexts}
                disabled={seeding}
                style={{
                  height: DECK_CTA.height, padding: DECK_CTA.padding, borderRadius: 999,
                  cursor: seeding ? 'default' : 'pointer',
                  border: `1px solid ${palette.accent}`, background: 'transparent', color: palette.accent,
                  fontFamily: 'inherit', fontSize: DECK_CTA.fontSize, fontWeight: DECK_CTA.fontWeight,
                }}
              >
                {seeding ? t('Добавляю…') : `${t('Взять слова из текстов')} · ${glossaryCards.length}`}
              </button>
            ) : allTexts.length > 0 ? (
              // Брать ещё нечего: человек не читал ни одного текста, и слов,
              // из которых набирается колода, просто не существует. Экран
              // объяснял, ОТКУДА берутся карточки, но не давал туда пойти —
              // и у нового ученика вкладка оказывалась тупиком. Кнопка ведёт
              // ровно в то единственное место, где колода начинает набираться.
              <button
                onClick={() => { setMode('reading'); setReadingView('texts') }}
                style={{
                  height: DECK_CTA.height, padding: DECK_CTA.padding, borderRadius: 999,
                  cursor: 'pointer',
                  border: `1px solid ${palette.accent}`, background: 'transparent', color: palette.accent,
                  fontFamily: 'inherit', fontSize: DECK_CTA.fontSize, fontWeight: DECK_CTA.fontWeight,
                }}
              >
                {`${t('Начать с текста')} · ${allTexts.length}`}
              </button>
            ) : null
          }
        />
        {seedNote && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--color-muted)' }}>{seedNote}</div>
        )}
      </div>
    )
  } else if (mode === 'blocks') {
    content = blocks.content
  } else {
    content = speaking.content
  }

  // Свайп от левого края повторяет кнопку «назад» текущей строки управления
  // («К полкам» / «К справочнику» / «К главам» / «К списку»). Открытые
  // материалы (читалка/аудирование) регистрируют свой «назад» сами, поэтому
  // здесь жест выключен, пока показан материал, — иначе после F5 с открытой
  // сценой свайп закрывал бы полку ПОД ней.
  const materialOpen = Boolean(openScene || openText || openAudio)
  const toolbarBack =
    scenesOn && openWork ? () => setOpenWorkId(null)
    : mode === 'grammar' && grammar.back ? grammar.back
    : mode === 'guide' && guide.back ? guide.back
    : mode === 'speaking' && speaking.back ? speaking.back
    : null
  useSwipeBack(toolbarBack, !materialOpen)

  // ── Открытый материал ──────────────────────────────────────────────────────
  //
  // Ранние возвраты стоят ПОСЛЕ ВСЕХ хуков компонента, а не там, где читаются
  // по смыслу. Иначе открытие сцены — это рендер с меньшим числом хуков, чем
  // предыдущий, то есть падение всего тренажёра в ErrorBoundary. Раньше сцену
  // открывали только кликом с витрины, где хуков ниже не было; ссылка на
  // рассказ открывает её сразу на монтировании — и правило стало обязательным.
  // Сцена открывается ТОЙ ЖЕ читалкой, что и учебный текст: отличается она
  // только рамкой вокруг — «что вокруг» до чтения и «чем кончилось» после.
  if (openScene) {
    return (
      <Reader
        text={openScene}
        scene={openScene}
        work={workById(openScene.workId)}
        share={shareUrl}
        accent={palette.accent}
        palette={palette}
        lang={lang}
        owner={owner}
        subjectId={subjectId}
        onBack={() => { setOpenSceneId(null); setResultsKey(k => k + 1) }}
      />
    )
  }
  if (openText) {
    return (
      <Reader
        text={openText}
        share={shareUrl}
        accent={palette.accent}
        palette={palette}
        lang={lang}
        owner={owner}
        subjectId={subjectId}
        onBack={() => { setOpenTextId(null); setResultsKey(k => k + 1) }}
      />
    )
  }
  if (openAudio) {
    return (
      <Listener
        item={openAudio}
        share={shareUrl}
        accent={palette.accent}
        palette={palette}
        lang={lang}
        onBack={() => { setOpenAudioId(null); setResultsKey(k => k + 1) }}
      />
    )
  }


  return (
    <TrainerShell
      rail={rail}
      toolbar={toolbar}
      share={shareUrl}
      shareAccent={palette.accent}
      nav={nav}
      // Круг предмета — только когда предметов правда несколько. У ученика с
      // одним языком это была мёртвая кнопка, занимавшая в доке ровно ту
      // ширину, в которой не помещались половины режима.
      narrowLead={subjectState.options.length > 1
        ? <SubjectPill state={subjectState} palette={palette} compact />
        : null}
    >
      {content}
    </TrainerShell>
  )
}

/** Одна ось фильтра: подпись + значения. Пустое значение = «все». */
export function Chips({ label, value, options, onChange, accent }: {
  label: string; value: string; options: string[]
  onChange: (v: string) => void; accent: string
}) {
  if (options.length < 2) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--color-text-3)' }}>
        {label}
      </span>
      {options.map(o => {
        const on = value === o
        return (
          <button key={o} onClick={() => onChange(on ? '' : o)}
            style={{
              padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12.5, fontWeight: 650,
              border: `1px solid ${on ? accent : 'var(--color-border-soft)'}`,
              background: on ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
              color: on ? accent : 'var(--color-text-2)',
            }}>
            {o}
          </button>
        )
      })}
    </div>
  )
}

// ─── Читалка ─────────────────────────────────────────────────────────────────

// Читалка и аудирование занимают экран целиком, минуя витрину TrainerShell, —
// колонку они держат сами. Ширина одна на обеих: экраны переключаются на месте,
// и разная колонка сдвигала бы содержимое вбок на каждом переходе.
//
// width: '100%' здесь обязателен. Родитель — flex-колонка, а у флекс-элемента с
// auto-полем по поперечной оси растяжение отключается: без явной ширины блок
// ужимается до max-content своего содержимого.
const column = { width: '100%', maxWidth: 860, margin: '0 auto', padding: '8px 20px 80px' } as const

/** Онбординг проходится один раз на браузер, потом только по кнопке «Подсказки». */
/**
 * Правый край строки управления: счётчик и служебные кнопки.
 *
 * Одна группа с `marginLeft: auto`, а не два отдельных элемента с ним же: два
 * автоотступа делят свободное место пополам, и счётчик уезжал бы в середину
 * строки вместо правого края.
 */
function ToolRight({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
      {children}
    </span>
  )
}

const TOUR_KEY = 'lang-reader-tour-v1'

/** Кнопки служебной строки на титрах: все одного роста, различаются только цветом. */
const finishChip = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 12px', borderRadius: 11, background: 'transparent',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
} as const

function Reader({ text, scene, work, feed, share, accent, palette, lang, owner, subjectId, onBack }: {
  text: ReadingText
  /** Адрес этого экрана — считает его родитель, у которого есть весь открытый материал. */
  share: string
  /**
   * Задано, если открыт материал ленты. Читалка от этого не раздваивается:
   * сверху добавляется строка источника со ссылкой на оригинал — и всё.
   */
  feed?: FeedItem
  /**
   * Задано, если открыт отрывок из книги или сериала. Читалка от этого не
   * раздваивается: добавляются рамка «что вокруг» перед текстом и «чем
   * кончилось» после проверки — всё остальное работает ровно так же.
   */
  scene?: Scene
  work?: Work
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  lang: string
  owner: { studentId?: string; anonName?: string }
  subjectId: string
  onBack: () => void
}) {
  const t = useT()
  const narrow = useTrainerNarrow()
  // Свайп от левого края = «К списку»: читалка — вложенный экран тренажёра.
  useSwipeBack(onBack)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)
  const [gloss, setGloss] = useState<string | null>(null)

  // Открыли текст — читалка обязана начаться с начала, а не с той точки
  // прокрутки, на которой стоял список сцен: рейл и рассказ едут в одном
  // скролле страницы, и без явного сброса открытие следующей сцены выглядело
  // так, будто скроллится сам рассказ.
  useEffect(() => { window.scrollTo(0, 0) }, [text.id])

  const correctCount = text.questions.filter((q, i) => answers[i] === q.correct).length
  const allAnswered = text.questions.every((_, i) => answers[i] !== undefined)

  // Результат записывается в момент проверки, а не при уходе с экрана: ученик
  // закрывает вкладку прямо на разборе ошибок, и «сохраню на выходе» означало
  // бы, что половина результатов теряется.
  function check() {
    setChecked(true)
    saveResult('reading', text.id, correctCount, text.questions.length)
  }

  // Слова текста одной кнопкой в колоду — прямо отсюда. Раньше за этим нужно
  // было уйти на вкладку «Карточки» и найти там кнопку под пустой колодой,
  // то есть ровно тогда, когда слова уже забыты.
  const [tookWords, setTookWords] = useState<number | null>(null)
  const [takingWords, setTakingWords] = useState(false)
  /** Перевод на титрах раскрывается кнопкой, а не нативным <details>. */
  const [showTranslation, setShowTranslation] = useState(false)
  async function takeWords() {
    setTakingWords(true)
    try {
      const n = await addCards(owner, text.glossary.map(g => ({
        subject: subjectId, source: 'manual' as const, prompt: g.term, answer: g.ru,
      })))
      setTookWords(n)
    } catch (e) {
      console.error('Reader takeWords:', e)
      setTookWords(0)
    } finally {
      setTakingWords(false)
    }
  }

  // Слова из глоссария подсвечиваются прямо в тексте: клик показывает перевод,
  // не уводя со страницы. Это и есть главная механика чтения на языке —
  // посмотреть слово и остаться в тексте, а не уйти в словарь и потерять нить.
  const glossMap = useMemo(
    () => new Map(text.glossary.map(g => [g.term.toLowerCase(), g.ru])),
    [text.glossary],
  )

  // ── Онбординг ──────────────────────────────────────────────────────────────
  //
  // Экран читалки внешне похож на тест, и без объяснения ученик проходит мимо
  // двух главных вещей: что любое слово переводится касанием и что текст можно
  // слушать. Поэтому при первом открытии текста проводим по экрану подсказками;
  // вернуть их можно кнопкой рядом с «К списку».
  const audioRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const chipsRef = useRef<HTMLDivElement | null>(null)
  const questionsRef = useRef<HTMLDivElement | null>(null)
  const checkRef = useRef<HTMLButtonElement | null>(null)
  const scoreRef = useRef<HTMLButtonElement | null>(null)
  const [tour, setTour] = useState(false)
  // Шаг про разбор не описывает его, а включает: пока подсказка открыта, текст
  // под ней стоит в разборе, и ученик видит дорожки вместо описания дорожек.
  // Отдельным состоянием, а не через setScore: показ не должен переписывать
  // выбранный вид — после подсказок текст обязан вернуться таким, каким был.
  const [demoScore, setDemoScore] = useState<boolean | null>(null)
  const onTourStep = useCallback((id: string | null) => {
    setDemoScore(id === 'score' ? true : null)
  }, [])

  useEffect(() => {
    try {
      if (!localStorage.getItem(TOUR_KEY)) setTour(true)
    } catch { /* приватный режим — просто без онбординга */ }
  }, [])

  function closeTour() {
    setTour(false)
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* не критично */ }
  }

  // Пословный перевод есть не у всех языков (см. data/wordGloss.ts). Где
  // словаря нет, текст остаётся обычным: кликать по каждому слову ради ответа
  // «нет в словаре» — хуже, чем не кликать вовсе.
  // Словарь приезжает отдельным чанком — пересчитываемся, когда он доехал,
  // иначе экран навсегда остался бы в режиме «словаря для языка нет».
  useGloss()
  const glossed = hasLexicon(lang)

  // Разбор (см. trainer/ScoreReader.tsx) имеет смысл там, где есть что
  // положить во вторую и третью дорожку: перевод или транскрипция. У текста без
  // того и другого она была бы той же прозой с лишней кнопкой.
  const hasScore = !!text.translation || hasReadings(text.body, lang, text.glossary)
  // Вид держится между текстами: выбравший разбор выбрал способ читать, а не
  // способ прочитать один отрывок.
  const [score, setScore] = usePersistentState(`trainer.${lang}.readerScore`, false)
  const scoreView = demoScore ?? score

  const steps: CoachStep[] = [
    {
      title: t('Как устроено чтение'),
      text: glossed
        ? t('Три вещи, дальше сам: любое слово переводится касанием, текст можно слушать, ответы проверяются кнопкой внизу.')
        : t('Две вещи, дальше сам: текст можно слушать, ответы проверяются кнопкой внизу.'),
    },
    ...(glossed ? [{
      ref: bodyRef,
      title: t('Перевод любого слова'),
      text: t('Наведи курсор или нажми на слово — рядом появится перевод и грамматическая пометка. Пунктир снизу значит, что слово есть в словаре; у остальных работает озвучка.'),
    }] : []),
    ...(hasScore ? [{
      ref: scoreRef,
      id: 'score',
      title: t('Текст с разбором'),
      text: t('Эта кнопка меняет вид текста — сейчас включён разбор. Под каждым словом стоит транскрипция, перевод идёт колонкой справа по строкам, а голос ведёт по тексту подсветкой.'),
    }] : []),
    {
      // На телефоне плеера в рейле нет — подсвечивать нечего, и подсказка
      // рассказывает про тот, что стоит внизу экрана.
      ref: narrow ? undefined : audioRef,
      title: t('Послушать текст'),
      text: narrow
        ? t('Плеер стоит внизу экрана: круг включает голос, бегунок ведёт по репликам, а темп и диктор — под кнопкой справа.')
        : t('Кнопка читает текст вслух целиком. «Медленно» — тот же голос вдвое медленнее, для первого прохода.'),
    },
    ...(text.glossary.length > 0 ? [{
      ref: chipsRef,
      title: t('Ключевые слова'),
      text: t('Слова, ради которых текст и написан. Нажми, чтобы раскрыть перевод, — их же можно забрать в колоду на вкладке «Карточки».'),
    }] : []),
    {
      ref: questionsRef,
      title: t('Вопросы к тексту'),
      text: t('Отвечать можно в любом порядке, пока не нажал «Проверить». После проверки ответы фиксируются и появляется разбор.'),
    },
    {
      ref: checkRef,
      title: t('Проверка и перевод'),
      text: t('Кнопка загорится, когда ответишь на все вопросы. После неё откроется полный перевод текста — до этого он закрыт, иначе читать оригинал незачем.'),
    },
  ]

  // Рейл читалки — единственный экран, где он не про выбор материала, а про
  // работу с уже открытым. Озвучка и словарик жили под текстом и над ним: до
  // словаря нужно было доскроллить мимо вопросов, то есть ровно тогда, когда
  // он уже не нужен, а плеер уезжал вверх на первом же движении.
  const rail = (
    <>
      <RailHero
        plain
        title={text.title}
        subtitle={scene && work
          ? `${work.title} · ${scene.where} · ${text.level}`
          : feed
            // У материала ленты подпись начинается с источника и даты: это
            // первое, что нужно знать про новость, и это же — атрибуция.
            ? `${outletById(feed.outletId)?.name ?? ''} · ${dayLabel(feed.date)} · ${text.level}`
            : `${text.level} · ${t(text.topic)} · ${text.minutes} ${t('мин')}`}
        palette={palette}
      />

      {/* На телефоне рейл целиком уезжает в шторку «Фильтры», и слушать текст
          пришлось бы через кнопку фильтров. Там плеер стоит внизу экрана (в
          разборе его рисует сама партитура, в простом тексте — TrackPlayer
          ниже), а второй плеер в шторке — это два бегунка на одну запись. */}
      {!narrow && (
        <RailCard title="Послушать" accent={accent} icon={<Volume2 size={15} />}>
          <div ref={audioRef} style={{ display: 'grid', gap: 10 }}>
            <AudioPlayer ttsText={text.body} lang={lang} allowSlow accent={palette.accent} soft={palette.soft} picker={false} />
            <VoicePicker lang={lang} accent={palette.accent} soft={palette.soft} />
          </div>
        </RailCard>
      )}

      {text.glossary.length > 0 && (
        <RailCard title="Словарь текста" accent={accent} icon={<ListChecks size={15} />}>
          {/* Список, а не сетка плашек: в рейле у слова есть вся ширина
              строки, поэтому перевод помещается рядом и не требует ни
              раскрытия, ни зарезервированного места под две строки. */}
          <div ref={chipsRef}>
            <RailList
              items={text.glossary.map(g => ({
                id: g.term,
                label: g.term,
                sub: wordReading(g.term, lang),
                hint: glossMap.get(g.term.toLowerCase()) ?? '',
              }))}
              value={gloss ?? ''}
              onChange={v => setGloss(v === gloss ? null : v)}
              accent={accent}
              soft={palette.soft}
            />
          </div>
          <button
            onClick={takeWords}
            disabled={takingWords || tookWords !== null}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
              padding: '9px 12px', borderRadius: 12,
              cursor: takingWords || tookWords !== null ? 'default' : 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 650,
              border: `1px solid ${tookWords !== null ? 'var(--color-border-soft)' : `${accent}66`}`,
              background: 'transparent',
              color: tookWords !== null ? 'var(--color-muted)' : accent,
            }}
          >
            {tookWords !== null
              ? (tookWords > 0 ? `${t('в колоде')} +${tookWords}` : t('уже в колоде'))
              : (takingWords ? t('Добавляю…') : `${t('Все слова в колоду')} · ${text.glossary.length}`)}
          </button>
        </RailCard>
      )}

      <RailCard title="Вопросы" accent={accent} icon={<CheckCircle2 size={15} />}>
        <RailStat
          label="Отвечено"
          value={`${Object.keys(answers).length} / ${text.questions.length}`}
          tone={allAnswered ? 'good' : undefined}
        />
        {checked && <RailStat label="Верно" value={`${correctCount} / ${text.questions.length}`} tone="good" />}
      </RailCard>
    </>
  )

  const toolbar = (
    <Toolbar>
      <ToolButton onClick={onBack}>
        <ChevronLeft size={14} /> {t('К списку')}
      </ToolButton>
      {/* Вид текста — переключатель, а не замена: обычный текст остаётся видом
          по умолчанию (так текст читается как текст), разбор включается тогда,
          когда нужно понять, как это звучит и что значит.
          Подписи называют вид словами ученика: «Партитура» и «Проза» — термины
          из чужих ремёсел, и по ним не угадать, что кнопка вообще делает.
          Одним словом, а не двумя: строка управления прилипшая, и на телефоне
          «Просто текст» вместе с соседями переносил её на второй ряд — второй
          ряд отъедает у самого текста двадцать пикселей на каждом экране. */}
      {hasScore && (
        <ToolButton btnRef={scoreRef} on={scoreView} onClick={() => setScore(v => !v)} accent={accent}>
          {scoreView ? <Rows3 size={14} /> : <AlignLeft size={14} />} {scoreView ? t('Разбор') : t('Текст')}
        </ToolButton>
      )}
      {/* Подсказки про интерфейс — значком, и только на большом экране: на
          телефоне они уехали вниз шторки настроек, к адресу экрана (проп help
          у скелета). Рассказ нужен один раз, а место в строке занимал всегда. */}
      {!narrow && (
        <ToolButton icon label={t('Подсказки')} onClick={() => setTour(true)} accent={accent}>
          <HelpCircle size={15} />
        </ToolButton>
      )}
      <ToolRight>
        {text.credit && <ToolCount>{text.credit}</ToolCount>}
        {/* Ссылка на оригинал у материала ленты обязательна: и как проверяемое
            основание («вот откуда это взято»), и как условие свободных
            лицензий, которые требуют указать источник. */}
        {feed && (
          <a
            href={feed.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, color: 'var(--color-muted)', textDecoration: 'none',
            }}
          >
            {t('Оригинал')}<ExternalLink size={12} />
          </a>
        )}
      </ToolRight>
    </Toolbar>
  )

  // Плеер телефона — в ряду дока, как в аудировании. В разборе ту же строку
  // (trainer/PlayerPill.tsx) ставит сама партитура: голос там ведёт по строкам
  // подсветкой и знает свою позицию сам, см. ScoreReader. Отсюда — только для
  // простого текста, иначе на одну запись пришлось бы два бегунка.
  const player = narrow && !(hasScore && scoreView) ? (
    <TrackPlayer
      inline
      ttsText={text.body}
      lang={lang}
      accent={palette.accent}
      soft={palette.soft}
      title={text.title}
    />
  ) : null

  return (
    <TrainerShell rail={rail} toolbar={toolbar} share={share} shareAccent={accent} help={() => setTour(true)} narrowPlayer={player}>
      {/* «Что вокруг» — до текста и всегда. Без этого абзаца отрывок из
          середины книги остаётся случайным куском: непонятно, кто эти люди и
          почему сцена вообще чего-то стоит. */}
      {scene && (
        <div style={{
          padding: '15px 18px', borderRadius: 18,
          background: palette.soft, border: `1px solid ${accent}33`,
          display: 'flex', flexDirection: 'column', gap: 9,
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 750, letterSpacing: 0.3, color: accent, textTransform: 'uppercase' }}>
            {t('Что вокруг')}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--color-text)', ...proseWrap }}>
            {bindShortWords(scene.setup)}
          </div>
          {work?.quote && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <Quote size={13} style={{ color: accent, flexShrink: 0, marginTop: 4 }} />
              <div>
                <span style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--color-text-2)', lineHeight: 1.55 }}>
                  {work.quote.text}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-3)', marginTop: 3 }}>
                  {work.quote.attribution}
                </span>
              </div>
            </div>
          )}
          {/* Ученик должен знать, что именно он читает: подлинник или наш
              текст на тему книги. Это не юридическая формальность — от этого
              зависит, стоит ли запоминать оборот как «так пишет Акутагава». */}
          <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>
            {scene.textOrigin === 'verbatim'
              ? `${t('Подлинный текст')}${work?.source?.translator ? ` · ${t('перевод')}: ${work.source.translator}` : ''}`
              : t('Текст написан нами по теме произведения — это не текст автора')}
          </div>
        </div>
      )}

      {hasScore && scoreView ? (
        <div ref={bodyRef}>
          <ScoreReader
            body={text.body}
            translation={text.translation}
            lang={lang}
            glossary={text.glossary}
            accent={accent}
            soft={palette.soft}
            highlight={gloss}
            // С предметом у слова в подсказке появляется «В словарь»: слово
            // выписывают там, где об него споткнулись, а не вкладкой позже.
            subject={subjectId}
            // Название — во второй строке распрямившегося плеера и в шапке
            // его шторки, ровно как у простого текста.
            title={text.title}
          />
        </div>
      ) : (
      <div ref={bodyRef} style={{
        padding: '20px 22px', borderRadius: 18, background: 'var(--color-bg-2)',
        border: '1px solid var(--color-border-soft)',
      }}>
        {glossed ? (
          <GlossedText
            text={text.body}
            lang={lang}
            extra={text.glossary}
            accent={accent}
            subject={subjectId}
            // Слово, выбранное в словаре текста слева, подсвечивается прямо в
            // абзаце: список слов без их места в предложении — просто столбик,
            // а искать слово глазами по тексту ученик не должен.
            highlight={gloss}
            style={{ fontSize: 16.5, lineHeight: 1.85, color: 'var(--color-text)' }}
          />
        ) : (
          <div style={{ fontSize: 16.5, lineHeight: 1.85, color: 'var(--color-text)', whiteSpace: 'pre-wrap', ...proseWrap }}>
            {text.body}
          </div>
        )}
      </div>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
        {t('Вопросы к тексту')}
      </h2>

      <div ref={questionsRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {text.questions.map((q, qi) => (
          <QuestionCard
            key={`${qi}-${q.q}`}
            q={q}
            index={qi}
            value={answers[qi]}
            checked={checked}
            accent={accent}
            lang={lang}
            // Вопрос задан на изучаемом языке, и слова в нём переводятся так же,
            // как в тексте. Варианты ответа оставлены обычными: это кнопки
            // выбора, и подсказка внутри них конфликтует с нажатием.
            glossLang={glossed ? lang : undefined}
            glossExtra={text.glossary}
            subject={subjectId}
            onPick={v => !checked && setAnswers(a => ({ ...a, [qi]: v }))}
          />
        ))}
      </div>

      {!checked ? (
        <button
          ref={checkRef}
          onClick={check}
          disabled={!allAnswered}
          style={{
            width: '100%', padding: '13px', borderRadius: 16, border: 'none',
            cursor: allAnswered ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 700, color: '#fff',
            background: allAnswered ? accent : 'var(--color-border-medium)',
          }}
        >
          {allAnswered ? t('Проверить') : t('Ответь на все вопросы')}
        </button>
      ) : (
        /* Титры сцены. Раньше здесь первым и самым крупным был счёт, а «чем
           кончилось» лежало под ним в оранжевой плашке — то есть громче всего
           звучала цифра, ради которой сюда никто не шёл. Теперь экран закрывает
           сцену: развязка набрана крупно и без заливки, а счёт, перевод и слова
           ушли в служебную строку под ней. */
        <div style={{
          padding: '22px', borderRadius: 18,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 11.5, letterSpacing: 0.3, color: 'var(--color-text-3)' }}>
            {scene && work ? `${work.title} · ${scene.where}` : `${t(text.topic)} · ${text.level}`}
          </div>

          {/* «Чем кончилось» — награда за работу и крючок к следующей сцене.
              Открывается только здесь: до вопросов это спойлер, после — то,
              ради чего вообще хочется открыть следующий отрывок. У учебного
              текста развязки нет, и её место занимает итог проверки: иначе
              экран начинался бы с пустоты. */}
          <div style={{ fontSize: 19, lineHeight: 1.5, color: 'var(--color-text)', marginTop: 10, ...balancedWrap }}>
            {scene?.after
              ? bindShortWords(scene.after)
              : `${correctCount} ${t('из')} ${text.questions.length} ${t('верно')}`}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border-soft)',
          }}>
            {scene?.after && (
              <span style={{ fontSize: 13, color: 'var(--color-text-2)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 700 }}>{correctCount}</span>
                {` ${t('из')} ${text.questions.length} ${t('вопросов')}`}
              </span>
            )}

            {/* Перевод открывается только после проверки: иначе читать оригинал незачем.
                В разборе его уже переключает рейл партитуры — второй такой же
                тумблер на титрах только сбивает: два места, одно и то же. */}
            {text.translation && !(hasScore && scoreView) && (
              <button
                onClick={() => setShowTranslation(v => !v)}
                style={{
                  ...finishChip,
                  border: `1px solid ${showTranslation ? `${accent}66` : 'var(--color-border-soft)'}`,
                  color: showTranslation ? accent : 'var(--color-text-2)',
                }}
              >
                <Languages size={15} /> {t('Перевод')}
              </button>
            )}

            {/* Та же кнопка, что в рейле, и то же состояние: слова забирают
                именно здесь, когда текст только что дочитан. */}
            {text.glossary.length > 0 && (
              <button
                onClick={takeWords}
                disabled={takingWords || tookWords !== null}
                style={{
                  ...finishChip,
                  border: '1px solid var(--color-border-soft)',
                  color: tookWords !== null ? 'var(--color-muted)' : 'var(--color-text-2)',
                  cursor: takingWords || tookWords !== null ? 'default' : 'pointer',
                }}
              >
                <Layers size={15} />
                {tookWords !== null
                  ? (tookWords > 0 ? `${t('в колоде')} +${tookWords}` : t('уже в колоде'))
                  : (takingWords ? t('Добавляю…') : `${text.glossary.length} ${t('слов в колоду')}`)}
              </button>
            )}

            <button
              onClick={onBack}
              style={{
                ...finishChip, marginLeft: 'auto', padding: '9px 15px',
                border: `1px solid ${accent}66`, color: accent, fontWeight: 650,
              }}
            >
              {t('Дальше')} <ArrowRight size={15} />
            </button>
          </div>

          {showTranslation && text.translation && !(hasScore && scoreView) && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border-soft)' }}>
              <div style={{ fontSize: 11.5, letterSpacing: 0.3, color: 'var(--color-text-3)', marginBottom: 7 }}>
                {t('Перевод текста')}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-2)', whiteSpace: 'pre-wrap', ...proseWrap }}>
                {text.translation}
              </div>
            </div>
          )}
        </div>
      )}

      <Coachmarks steps={steps} open={tour} onClose={closeTour} accent={accent} onStepChange={onTourStep} />
    </TrainerShell>
  )
}

function QuestionCard({ q, index, value, checked, accent, lang, glossLang, glossExtra, subject, onPick }: {
  q: ReadingQuestion; index: number; value?: number; checked: boolean
  accent: string; onPick: (v: number) => void
  /** Язык материала — по нему ищется перевод вопроса. */
  lang: string
  /** Задан — формулировка вопроса тоже переводится по словам. */
  glossLang?: string
  glossExtra?: Gloss[]
  /** Предмет колоды: с ним слово из вопроса тоже можно взять в словарь. */
  subject?: string
}) {
  const t = useT()
  // Перевод вопроса целиком — своей кнопкой у каждого вопроса. Пословная
  // подсказка отвечает «что значит это слово», но не «что у меня спрашивают»:
  // в корейском вопросе смысл держится на окончании и порядке слов, и человек,
  // разобравший все слова по одному, всё равно может не понять вопрос. А не
  // поняв вопрос, он отвечает наугад — и текст, который он прочитал, засчитан
  // как непонятый. Поэтому перевод стоит рядом с вопросом, а не после проверки.
  const ru = questionRu(lang, q)
  const [showRu, setShowRu] = useState(false)
  const on = showRu && !!ru

  return (
    <div style={{ padding: '15px 17px', borderRadius: 18, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{
        display: 'flex', gap: 6, fontSize: 15, fontWeight: 650,
        color: 'var(--color-text)', marginBottom: 11,
      }}>
        <span style={{ flexShrink: 0 }}>{index + 1}.</span>
        {on
          ? <span style={{ flex: 1, minWidth: 0, ...proseWrap }}>{bindShortWords(ru!.q)}</span>
          : glossLang
            ? <GlossedText text={q.q} lang={glossLang} extra={glossExtra} accent={accent} subject={subject} style={{ flex: 1, minWidth: 0 }} />
            : <span style={{ flex: 1, minWidth: 0, ...proseWrap }}>{bindShortWords(q.q)}</span>}
        {ru && (
          <button
            onClick={() => setShowRu(v => !v)}
            title={on ? t('Показать оригинал') : t('Перевести вопрос')}
            aria-label={on ? t('Показать оригинал') : t('Перевести вопрос')}
            aria-pressed={on}
            style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 9, cursor: 'pointer',
              display: 'grid', placeItems: 'center', marginTop: -2,
              border: `1px solid ${on ? accent : 'var(--color-border-soft)'}`,
              background: on ? `${accent}1A` : 'transparent',
              color: on ? accent : 'var(--color-text-3)',
            }}
          >
            <Languages size={14} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {q.options.map((opt, oi) => {
          const picked = value === oi
          const right = q.correct === oi
          const showRight = checked && right
          const showWrong = checked && picked && !right
          return (
            <button
              key={oi}
              onClick={() => onPick(oi)}
              disabled={checked}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left',
                padding: '10px 13px', borderRadius: 13, fontFamily: 'inherit', fontSize: 14,
                cursor: checked ? 'default' : 'pointer', color: 'var(--color-text)',
                border: `1.5px solid ${showRight ? '#6EE7A0' : showWrong ? '#F48B91' : picked ? accent : 'var(--color-border-soft)'}`,
                background: showRight ? 'var(--color-green-soft)' : showWrong ? 'var(--color-red-soft)' : picked ? 'var(--color-bg-3)' : 'var(--color-bg-input)',
              }}
            >
              {checked && (showRight ? <CheckCircle2 size={15} style={{ color: 'var(--color-green-text)', flexShrink: 0 }} />
                : showWrong ? <XCircle size={15} style={{ color: 'var(--color-red-text)', flexShrink: 0 }} /> : null)}
              {/* Варианты переводятся вместе с вопросом: понятый вопрос и
                  непонятные ответы — то же угадывание, просто на шаг позже. */}
              <span style={proseWrap}>{bindShortWords(on ? ru!.options[oi] : opt)}</span>
            </button>
          )
        })}
      </div>
      {checked && q.why && (
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-2)', ...proseWrap }}>
          {bindShortWords(q.why)}
        </div>
      )}
    </div>
  )
}

// ─── Прослушивание ───────────────────────────────────────────────────────────

function Listener({ item, share, accent, palette, lang, onBack }: {
  /** Адрес этого экрана — см. Reader. */
  share: string
  item: ListeningItem
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  lang: string
  onBack: () => void
}) {
  const t = useT()
  const narrow = useTrainerNarrow()
  // Свайп от левого края = «К списку»: аудирование — вложенный экран тренажёра.
  useSwipeBack(onBack)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)

  const correctCount = item.questions.filter((q, i) => answers[i] === q.correct).length
  const allAnswered = item.questions.every((_, i) => answers[i] !== undefined)

  function check() {
    setChecked(true)
    saveResult('listening', item.id, correctCount, item.questions.length)
  }

  // Плеер в рейле — тот же приём, что в читалке: слушают запись не один раз, а
  // между вопросами, и уехавшая наверх кнопка «ещё раз» превращает это в скролл
  // туда-обратно на каждый вопрос.
  const rail = (
    <>
      <RailHero plain title={item.title} subtitle={`${item.level} · ${t(item.topic)} · ${item.minutes} ${t('мин')}`} palette={palette} />

      {/* На телефоне рейл целиком уезжает в шторку «Фильтры», и кнопка
          «Играть» уходила туда вместе с ним: запись включалась через фильтры.
          Там её место занял закреплённый внизу TrackPlayer, а второй плеер в
          шторке — это два разных бегунка на одну запись. Видео остаётся в
          рейле всегда: у него свой плеер площадки, и промотка у него своя. */}
      {(!narrow || item.videoUrl) && (
        <RailCard title="Запись" accent={accent} icon={<Volume2 size={15} />}>
          {/* Материал ленты из плеера площадки: озвучивать нечего — смотрим
              ролик там, где он лежит. Плеер тот же, что в домашке и уроке. */}
          {item.videoUrl
            ? <TaskVideo url={item.videoUrl} title={item.title} credit={item.credit} onChange={() => {}} />
            : <>
                <AudioPlayer ttsText={item.script} lang={lang} allowSlow accent={palette.accent} soft={palette.soft} picker={false} />
                <VoicePicker lang={lang} accent={palette.accent} soft={palette.soft} />
              </>}
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {t('Слушай столько раз, сколько нужно. Расшифровка откроется после ответов.')}
          </div>
        </RailCard>
      )}

      <RailCard title="Вопросы" accent={accent} icon={<CheckCircle2 size={15} />}>
        <RailStat
          label="Отвечено"
          value={`${Object.keys(answers).length} / ${item.questions.length}`}
          tone={allAnswered ? 'good' : undefined}
        />
        {checked && <RailStat label="Верно" value={`${correctCount} / ${item.questions.length}`} tone="good" />}
      </RailCard>
    </>
  )

  const toolbar = (
    <Toolbar>
      <ToolButton onClick={onBack}>
        <ChevronLeft size={14} /> {t('К списку')}
      </ToolButton>
      {item.credit && <ToolCount>{item.credit}</ToolCount>}
    </Toolbar>
  )

  // Плеер живёт в ряду дока, слева от круга «Фильтры» (см. narrowPlayer у
  // TrainerShell): когда док при листании прячется, круг схлопывается и плеер
  // растягивается на весь ряд.
  const player = narrow && !item.videoUrl && item.script ? (
    <TrackPlayer
      inline
      ttsText={item.script}
      lang={lang}
      accent={palette.accent}
      soft={palette.soft}
      title={item.title}
    />
  ) : null

  return (
    <TrainerShell rail={rail} toolbar={toolbar} share={share} shareAccent={accent} narrowPlayer={player}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {item.questions.map((q, qi) => (
          <QuestionCard
            key={`${qi}-${q.q}`} q={q} index={qi} value={answers[qi]} checked={checked} accent={accent} lang={lang}
            onPick={v => !checked && setAnswers(a => ({ ...a, [qi]: v }))}
          />
        ))}
      </div>

      {!checked ? (
        <button
          onClick={check}
          disabled={!allAnswered}
          style={{
            width: '100%', padding: '13px', borderRadius: 16, border: 'none',
            cursor: allAnswered ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            fontSize: 15, fontWeight: 700, color: '#fff',
            background: allAnswered ? accent : 'var(--color-border-medium)',
          }}
        >
          {allAnswered ? t('Проверить') : t('Ответь на все вопросы')}
        </button>
      ) : (
        <div style={{
          padding: '16px 18px', borderRadius: 18,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4, textAlign: 'center' }}>
            {correctCount} / {item.questions.length}
          </div>
          {item.script && (
            <details style={{ marginTop: 10 }} open>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: accent }}>
                {t('Расшифровка')}
              </summary>
              <div style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-text)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {item.script}
              </div>
            </details>
          )}
          {item.translation && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: accent }}>
                {t('Перевод')}
              </summary>
              <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--color-text-2)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {item.translation}
              </div>
            </details>
          )}
          {item.glossary.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
              {item.glossary.map(g => {
                const reading = wordReading(g.term, lang)
                return (
                  <span key={g.term} style={{
                    padding: '5px 10px', borderRadius: 999, fontSize: 12.5,
                    background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
                  }}>
                    {g.term}
                    {reading && <span style={{ color: 'var(--color-text-3)' }}> [{reading}]</span>}
                    {' '}— {g.ru}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Строка плеера выше круга дока — небольшой просвет, чтобы кнопка
          «Проверить» и расшифровка не кончались ровно под ней. */}
      {player && <div style={{ height: 28 }} />}
    </TrainerShell>
  )
}
