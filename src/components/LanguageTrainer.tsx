import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Headphones, Layers, Mic, Blocks, Compass, ChevronLeft, CheckCircle2, XCircle, HelpCircle, SlidersHorizontal, Eye, Sparkle, Volume2, ListChecks, Check, RotateCcw, Library, Quote, Ear, Languages, ArrowRight, AlignLeft, Rows3, BookMarked, Repeat, MessagesSquare, ExternalLink, Puzzle, Hash, AudioLines } from 'lucide-react'
import { textsForLang, type ReadingText, type ReadingQuestion, type Gloss } from '../data/readingLibrary'
import { loadFeed, feedCount, hasFeed, materialsWord, outletById, dayLabel, type FeedItem } from '../data/feed'
import { languageTaxonomy } from '../data/languageTaxonomy'
import { listeningForLang, type ListeningItem } from '../data/listeningLibrary'
import { questionRu } from '../data/questionRu'
import AudioPlayer from './AudioPlayer'
import TrackPlayer from './trainer/TrackPlayer'
import VoicePicker, { useVoiceChoice } from './trainer/VoicePicker'
import { subjectTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
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
  Toolbar, SearchPill, StatusTabs, ToolButton, SortMenu, FilterMenu, ToolCount,
  Tile, TileGrid, TileMeter, TileChip, Empty as ShellEmpty, PILL_GLASS,
} from './trainer/TrainerShell'
import { SubjectHero, SubjectPill } from './trainer/SubjectSwitch'
import type { TrainerSubjectState } from '../lib/trainerSubject'
import MultiSelectField from './MultiSelectField'
import { addCards, collectedCards, deckOwner, dueCount, deckStates, forgetCard, type CardState, type ReviewCard } from '../data/reviewDeck'
import { hasSurvivalBook, loadSurvivalBook } from '../data/survivalBooks'
import { hasWordPacks, loadWordPacks } from '../data/wordPackBooks'
import { hasStory, loadStory } from '../data/languageGuides'
import { hasTextbooks, textbooksForLang } from '../data/textbooks'
import { StoryGrid, StoryChapterPage } from './trainer/StoryReader'
import { BookShelf } from './trainer/BookShelf'
import type { LanguageStory } from '../data/languageStory'
import { allPacks, wordPackShelves, type WordPackBook } from '../data/wordPacks'
import {
  hasScenes, loadScenes, sceneCount, scenesWord, shelvesForLang, worksForLang, workById,
  type Scene, type Work,
} from '../data/scenes'
import { WorkGrid, WorkPage } from './trainer/SceneShelf'
import { FeedList } from './trainer/FeedShelf'
import TaskVideo from './TaskVideo'
import { GrammarGrid, GrammarPage } from './trainer/GrammarShelf'
import { GRAMMAR_COUNTS, hasGrammarRef, loadGrammarRef, type GrammarRef } from '../data/grammar'
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
import { hasEndings, verbByDict, KO_ENDINGS, KO_VERBS } from '../data/koreanEndings'
import { StemGrid, StemPage } from './trainer/EndingBuilder'
import { hasHanjaRoots, hanjaRootById, HANJA_GROUPS, HANJA_ROOTS } from '../data/koreanHanja'
import { RootGrid, RootPage } from './trainer/RootBuilder'
import { hasNumbers, numberSetById, systemLabel, KO_NUMBER_SETS, SYSTEM_RULES } from '../data/koreanNumbers'
import { NumberGrid, NumberPage } from './trainer/NumberBuilder'
import { hasPronRules, pronRuleById, KO_PRON_RULES } from '../data/koreanPronRules'
import { PronGrid, PronPage } from './trainer/PronRuleDrill'
import { TONE } from './trainer/blockKit'
import {
  MyWordsSession, MyWordsTile, myWordsFrom, myWordsStats, MY_WORDS_ID, type MyWord,
} from './trainer/MyWords'
import { allResults, resultFrom, saveResult, type MaterialKind } from '../lib/trainerProgress'
import { courseReach, reachLevelIndex, reachNote } from '../lib/courseReach'
import VoiceRecorder from './VoiceRecorder'
import Shadowing, { type ShadowLine } from './trainer/Shadowing'
import { hasVoiceFor } from '../lib/speech'
import GlossedText from './GlossedText'
import Coachmarks, { type CoachStep } from './Coachmarks'
import Skeleton from './Skeleton'
import { hasLexicon, wordReading } from '../lib/lexicon'
import { usePersistentState } from '../lib/useDraft'
import { useScreenTop } from '../lib/useScreenTop'
import { submitTrainerVoice, listTrainerVoice, type VoiceEntry } from '../lib/trainerSpeaking'
import { ownerStudentIdFor, subjectAliases, useStudentData } from '../store/studentDataStore'
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
  { value: 'm', label: '3–5', fit: m => m > 3 && m <= 5 },
  { value: 'l', label: '5+', fit: m => m > 5 },
]

/** Пересечение выбранного списка со значением. Пустой список = «все». */
const anyOf = (picked: string[], value: string) => picked.length === 0 || picked.includes(value)

/**
 * Три половины вкладки «Карточки».
 *
 * `sets` — готовый разговорник по ситуациям, `packs` — наборы слов пачками,
 * `due` — личная колода повторений, `nests` — гнёзда созвучий. Последнее стоит именно здесь, а не отдельным
 * режимом рядом с «Чтением»: гнездо тоже работает через колоду (ошибки уходят
 * в SM-2), и пятая таблетка в рейле ради одного экрана — перебор.
 */
type VocabView = 'due' | 'sets' | 'nests' | 'packs'

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

  const allTexts = useMemo(() => textsForLang(lang), [lang])

  const audio = useMemo(() => listeningForLang(lang), [lang])

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
  const [fLen, setFLen] = useState('')

  // Общая строка управления — одна на все режимы, поэтому и состояние общее.
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('order')

  // Говорение считает свои задания само (список собирается из разговорника), а
  // рейлу и строке нужны только числа — поэтому они поднимаются оттуда сюда.
  const [kindFilter, setKindFilter] = useState('')
  const [speakCounts, setSpeakCounts] = useState({ total: 0, sent: 0, shown: 0 })
  // Открытое задание говорения живёт здесь, а не внутри режима: выход из
  // карточки — кнопка общей строки управления, как «К списку» в чтении.
  const [speakOpen, setSpeakOpen] = useState<SpeakTask | null>(null)

  // Смена режима сбрасывает выборку: фильтры у режимов разные, и «Уровень B1»,
  // унесённый из чтения в аудирование, молча прячет половину записей.
  function switchMode(m: Mode) {
    setMode(m)
    setFLevel([]); setFSkill([]); setFTopic([]); setFLen('')
    setQuery(''); setStatus(''); setSort('order'); setKindFilter('')
    setSceneShelf(''); setSpeakOpen(null)
    setGChapter(''); setGLevels([])
  }

  /** Переключение половин «Конструктора». Открытое при этом закрывается. */
  function switchBlocksView(v: BlocksView) {
    setBlocksView(v)
    setOpenStemDict(null); setOpenRootKo(null); setOpenNumId(null); setOpenPronId(null)
    setQuery('')
  }

  /** Переключение половин «Чтения». Открытое произведение при этом закрывается. */
  function switchReadingView(v: ReadingView) {
    setReadingView(v)
    setOpenWorkId(null); setOpenSceneId(null)
    setQuery(''); setStatus(''); setSceneShelf('')
    setFLevel([]); setFSkill([]); setFTopic([]); setFLen('')
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
      if (fLen && !LENGTHS.find(l => l.value === fLen)?.fit(x.minutes)) return false
      if (status === 'new' && resultFrom(kind, x.id, results)) return false
      if (status === 'done' && !resultFrom(kind, x.id, results)) return false
      if (q && !`${x.title} ${x.topic}`.toLowerCase().includes(q)) return false
      return true
    })
    if (sort === 'level') out.sort((a, b) => levelOpts.indexOf(a.level) - levelOpts.indexOf(b.level))
    if (sort === 'short') out.sort((a, b) => a.minutes - b.minutes)
    return out
  }, [pool, fLevel, fTopic, fSkill, fLen, status, query, sort, kind, results, levelOpts, mode])

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

  // Внутри фильтра значения складываются по ИЛИ (Netflix или HBO), между
  // фильтрами — по И. Иначе «Netflix + комедия» показало бы весь Netflix.
  const visibleWorks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sceneWorks.filter(w => {
      if (sceneShelf && w.shelf !== sceneShelf) return false
      if (scenePlatforms.length && !(w.platform && scenePlatforms.includes(w.platform))) return false
      if (sceneTags.length && !w.tags.some(tag => sceneTags.includes(tag))) return false
      if (sceneLevels.length && !scenesOf(w.id).some(s => sceneLevels.includes(s.level))) return false
      if (q && !`${w.title} ${w.origTitle} ${w.author}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [sceneWorks, sceneShelf, scenePlatforms, sceneTags, sceneLevels, scenesOf, query])

  const sceneGroups = useMemo(
    () => sceneShelves
      .map(s => ({ title: s.title, hint: s.hint, works: visibleWorks.filter(w => w.shelf === s.id) }))
      .filter(g => g.works.length > 0),
    [sceneShelves, visibleWorks],
  )

  /** Пройдена ли сцена — та же запись результата, что у обычных текстов. */
  const sceneDone = (id: string) => !!resultFrom('reading', id, results)

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
  const grammarOn = useMemo(() => hasGrammarRef(lang), [lang])
  // Выбранная половина переживает F5, как и остальное во вкладке: ученик,
  // разбиравший гнездо, после перезагрузки должен вернуться в гнездо, а не в
  // наборы фраз. Ключ по языку — у каждого предмета свой набор половин.
  const [vocabView, setVocabView] = usePersistentState<VocabView>(
    `trainer.${lang}.vocabView`, hasBook ? 'sets' : 'due',
  )
  const [due, setDue] = useState(0)

  // ── Конструктор: основы с хвостами и корни слов ────────────────────────────
  //
  // Обе половины пока корейские: матрица форм и гнёзда ханча написаны только для
  // ko. Режим целиком прячется там, где нет ни того ни другого, — пустая вкладка
  // хуже отсутствующей (то же правило, что у сцен и созвучий).
  const stemsOn = useMemo(() => hasEndings(lang), [lang])
  const rootsOn = useMemo(() => hasHanjaRoots(lang), [lang])
  const numbersOn = useMemo(() => hasNumbers(lang), [lang])
  const soundsOn = useMemo(() => hasPronRules(lang), [lang])
  const blocksOn = stemsOn || rootsOn || numbersOn || soundsOn
  const [blocksView, setBlocksView] = usePersistentState<BlocksView>(
    `trainer.${lang}.blocksView`, 'stems',
  )
  const [openStemDict, setOpenStemDict] = usePersistentState<string | null>(`trainer.${lang}.stem`, null)
  const [openRootKo, setOpenRootKo] = usePersistentState<string | null>(`trainer.${lang}.root`, null)
  const [openNumId, setOpenNumId] = usePersistentState<string | null>(`trainer.${lang}.numbers`, null)
  const openStem = useMemo(() => (openStemDict ? verbByDict(openStemDict) ?? null : null), [openStemDict])
  const openRoot = useMemo(() => (openRootKo ? hanjaRootById(openRootKo) ?? null : null), [openRootKo])
  const openNum = useMemo(() => (openNumId ? numberSetById(openNumId) ?? null : null), [openNumId])
  const [openPronId, setOpenPronId] = usePersistentState<string | null>(`trainer.${lang}.pron`, null)
  const openPron = useMemo(() => (openPronId ? pronRuleById(openPronId) ?? null : null), [openPronId])
  /** Полка корней: ханча раскладывается по смысловым группам. */
  const [rootGroup, setRootGroup] = usePersistentState<string>(`trainer.${lang}.rootGroup`, '')
  // Поиск идёт и по самим формам: ученик ищет «хочу» или «갔어요», а не «가다».
  const visibleStems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KO_VERBS
    return KO_VERBS.filter(v =>
      `${v.dict} ${v.stem} ${v.reading} ${v.ru} ${Object.values(v.forms).map(x => `${x.form} ${x.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [query])
  const visibleNums = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KO_NUMBER_SETS
    return KO_NUMBER_SETS.filter(set =>
      `${set.title} ${set.when} ${set.rows.map(x => `${x.form} ${x.reading} ${x.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [query])
  const visibleRoots = useMemo(() => {
    const q = query.trim().toLowerCase()
    return HANJA_ROOTS.filter(r => {
      if (rootGroup && r.group !== rootGroup) return false
      if (!q) return true
      return `${r.ko} ${r.cn} ${r.ru} ${r.words.map(w => `${w.term} ${w.reading} ${w.ru}`).join(' ')}`
        .toLowerCase().includes(q)
    })
  }, [query, rootGroup])
  const visiblePron = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KO_PRON_RULES
    return KO_PRON_RULES.filter(r =>
      `${r.ko} ${r.title} ${r.tagline} ${r.examples.map(x => `${x.written} ${x.spoken} ${x.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [query])

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

  // ── О языке: рассказ и полка учебников ────────────────────────────────────
  //
  // Рассказ ленивый (текст плюс векторные схемы), полка учебников — нет: восемь
  // описаний книг весят единицы килобайт, и мигание пустой полки ради них было
  // бы платой ни за что.
  const storyOn = useMemo(() => hasStory(lang), [lang])
  const booksOn = useMemo(() => hasTextbooks(lang), [lang])
  const guideOn = storyOn || booksOn
  const books = useMemo(() => textbooksForLang(lang), [lang])
  const [story, setStory] = useState<LanguageStory | null | undefined>(undefined)
  useEffect(() => {
    if (!storyOn) { setStory(null); return }
    let alive = true
    setStory(undefined)
    loadStory(lang).then(x => { if (alive) setStory(x ?? null) })
    return () => { alive = false }
  }, [storyOn, lang])

  const [guideView, setGuideView] = usePersistentState<GuideView>(
    `trainer.${lang}.guideView`, storyOn ? 'story' : 'books',
  )
  const [openChapterId, setOpenChapterId] = usePersistentState<string | null>(`trainer.${lang}.chapter`, null)
  const openChapter = useMemo(
    () => story?.chapters.find(c => c.id === openChapterId) ?? null,
    [story, openChapterId],
  )
  /**
   * Докуда дочитана каждая глава.
   *
   * Живёт ЗДЕСЬ, а не внутри читалки: ту же цифру показывает витрина полоской
   * «дочитано», и держи её страница у себя — витрине пришлось бы лезть в чужое
   * хранилище по угаданному ключу.
   */
  const [storyRead, setStoryRead] = usePersistentState<Record<string, number>>(`trainer.${lang}.storyRead`, {})
  /**
   * Где палец сейчас, а не докуда дочитано.
   *
   * Отдельно от storyRead намеренно: тот хранит МАКСИМУМ (полоска на витрине не
   * должна ехать назад от того, что человек вернулся перечитать), и пока
   * позиция читалки бралась оттуда же, кнопка «Назад» ничего не делала —
   * максимум от шага назад не менялся.
   */
  const [storyAt, setStoryAt] = usePersistentState<Record<string, number>>(`trainer.${lang}.storyAt`, {})

  // Восстановленная половина может оказаться несуществующей: разговорник для
  // языка ещё не написан, гнёзда не заведены. Тогда молча съезжаем на ту, что
  // есть, — иначе таблетки в рейле нет, а содержимое от неё показано.
  useEffect(() => {
    if (vocabView === 'sets' && !hasBook) setVocabView('due')
    else if (vocabView === 'nests' && !nestsOn) setVocabView(hasBook ? 'sets' : 'due')
    else if (vocabView === 'packs' && !packsOn) setVocabView(hasBook ? 'sets' : 'due')
  }, [vocabView, hasBook, nestsOn, packsOn, setVocabView])

  // То же для «О языке»: восстановленная половина могла исчезнуть вместе с
  // языком, а режим целиком — вместе с рассказом и полкой.
  useEffect(() => {
    if (mode === 'guide' && !guideOn) setMode('reading')
  }, [mode, guideOn, setMode])
  useEffect(() => {
    if (guideView === 'story' && !storyOn) setGuideView('books')
    else if (guideView === 'books' && !booksOn) setGuideView('story')
  }, [guideView, storyOn, booksOn, setGuideView])

  // Та же защита для конструктора: восстановленная из sessionStorage половина
  // может оказаться ненаписанной для этого языка, а сам режим — отсутствующим.
  useEffect(() => {
    const on = { stems: stemsOn, roots: rootsOn, numbers: numbersOn, sounds: soundsOn }
    if (on[blocksView]) return
    const fallback = (['stems', 'roots', 'numbers', 'sounds'] as BlocksView[]).find(v => on[v])
    if (fallback) setBlocksView(fallback)
  }, [blocksView, stemsOn, rootsOn, numbersOn, soundsOn, setBlocksView])
  useEffect(() => {
    if (mode === 'blocks' && !blocksOn) setMode('reading')
  }, [mode, blocksOn, setMode])

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

  // ── Справочник грамматики ──────────────────────────────────────────────────
  //
  // Ленивый по той же причине, что и разговорник: восемьсот примеров одного
  // языка не должны приезжать тому, кто открыл тренажёр на «Чтении». Счётчик
  // для пункта меню при этом синхронный (GRAMMAR_COUNTS).
  const [gram, setGram] = useState<GrammarRef | null | undefined>(undefined)
  // Открытая форма переживает F5 — как открытый текст и открытая тема.
  const [openFormId, setOpenFormId] = usePersistentState<string | null>(`trainer.${lang}.form`, null)
  const [gChapter, setGChapter] = useState('')
  /** Ступени справочника — многовыбор, как «Уровень» у сцен. */
  const [gLevels, setGLevels] = useState<string[]>([])

  useEffect(() => {
    if (!grammarOn) { setGram(null); return }
    let alive = true
    setGram(undefined)
    loadGrammarRef(lang).then(r => { if (alive) setGram(r ?? null) })
    return () => { alive = false }
  }, [grammarOn, lang])

  // Язык сменился на тот, где справочника нет, — режим обязан уступить, иначе
  // экран остаётся на пустой вкладке, которой в меню уже нет.
  useEffect(() => {
    if (mode === 'grammar' && !grammarOn) setMode('reading')
  }, [mode, grammarOn, setMode])

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
  useTrainerEngaged(!!(openScene || openText || openAudio || openItem || openNest || openMyWords || openPack || openStem || openRoot || openPron || openChapter))

  // ── Рейл ───────────────────────────────────────────────────────────────────
  //
  // Собирается здесь целиком, а не по кускам из режимов: рейл общий, и если
  // каждый режим дорисовывал бы в него свою часть, при переключении половина
  // колонки перерисовывалась бы из другого места.

  const speakTotal = countSpeakTasks(allThemes, hasVoiceFor(lang))

  // ── Выборка справочника ────────────────────────────────────────────────────
  //
  // Три сита: раздел, уровень и строка поиска. Поиск идёт и по самой форме, и по
  // русскому названию, и по объяснению: человек помнит либо «는데», либо «то,
  // что ставят перед просьбой», и справочник обязан находиться по обоим.
  const openForm = useMemo(
    () => (gram && openFormId ? gram.forms.find(f => f.id === openFormId) ?? null : null),
    [gram, openFormId],
  )

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
  // язык — предмет переключается уровнем выше (см. TaskBankPage), и до этого
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
      return { lang, screen: 'sets', id: openTheme ?? undefined }
    }
    if (mode === 'listening') return { lang, screen: 'audio', id: openAudioId ?? undefined }
    if (mode === 'speaking') return { lang, screen: 'speaking' }
    if (mode === 'blocks') {
      if (blocksView === 'roots') return { lang, screen: 'roots', id: openRootKo ?? undefined }
      if (blocksView === 'numbers') return { lang, screen: 'numbers', id: openNumId ?? undefined }
      if (blocksView === 'sounds') return { lang, screen: 'sounds', id: openPronId ?? undefined }
      return { lang, screen: 'stems', id: openStemDict ?? undefined }
    }
    if (mode === 'grammar') return { lang, screen: 'grammar', id: openFormId ?? undefined }
    if (guideView === 'books') return { lang, screen: 'books' }
    return { lang, screen: 'story', id: openChapterId ?? undefined }
  }, [
    lang, mode, readingView, vocabView, blocksView, guideView, openMyWords,
    openTextId, openWorkId, openSceneId, openAudioId, openTheme,
    openNestId, openPackId, openStemDict, openRootKo, openNumId, openPronId,
    openChapterId, openFormId,
  ])
  useEffect(() => { writeTrainerHash(currentLink) }, [currentLink])

  /** Адрес этого экрана целиком — то, что уходит в буфер или в системный лист. */
  const shareUrl = useMemo(() => trainerShareUrl(currentLink), [currentLink])

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
    setOpenTheme(null); setOpenNestId(null); setOpenPackId(null)
    setOpenStemDict(null); setOpenRootKo(null); setOpenNumId(null); setOpenPronId(null)
    setOpenFormId(null); setOpenChapterId(null); setSpeakOpen(null)

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
      case 'due':      setMode('vocab'); setVocabView('due'); break
      case 'audio':    setMode('listening'); setOpenAudioId(id); break
      case 'speaking': setMode('speaking'); break
      case 'stems':    setMode('blocks'); setBlocksView('stems'); setOpenStemDict(id); break
      case 'roots':    setMode('blocks'); setBlocksView('roots'); setOpenRootKo(id); break
      case 'numbers':  setMode('blocks'); setBlocksView('numbers'); setOpenNumId(id); break
      case 'sounds':   setMode('blocks'); setBlocksView('sounds'); setOpenPronId(id); break
      case 'grammar':  setMode('grammar'); setOpenFormId(id); break
      case 'story':    setMode('guide'); setGuideView('story'); setOpenChapterId(id); break
      case 'books':    setMode('guide'); setGuideView('books'); break
    }
  }, [
    lang, setMode, setReadingView, setVocabView, setBlocksView, setGuideView,
    setOpenTextId, setOpenWorkId, setOpenSceneId, setOpenAudioId, setOpenTheme,
    setOpenNestId, setOpenPackId, setOpenStemDict, setOpenRootKo, setOpenNumId,
    setOpenPronId, setOpenFormId, setOpenChapterId,
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
    lang, mode, readingView, vocabView, blocksView, guideView,
    openTextId, openAudioId, openWorkId, openSceneId, openTheme,
    openNestId, openPackId, openStemDict, openRootKo, openNumId, openPronId,
    openChapterId, openFormId, speakOpen ? '1' : '',
    kindFilter, fLen, status, query, sort,
    fLevel.join(','), fSkill.join(','), fTopic.join(','),
    sceneShelf, scenePlatforms.join(','), sceneTags.join(','), sceneLevels.join(','),
    shelf, packShelf, rootGroup, gChapter, gLevels.join(','),
  ].join('|'))

  const gramGroups = useMemo(() => {
    if (!gram) return []
    const q = query.trim().toLowerCase()
    const hit = gram.forms.filter(f => {
      if (gChapter && f.chapter !== gChapter) return false
      if (!anyOf(gLevels, f.level)) return false
      if (!q) return true
      const hay = `${f.form} ${f.title} ${f.short} ${f.attach} ${f.rule} ${f.examples.map(e => `${e.text} ${e.ru}`).join(' ')}`
      return hay.toLowerCase().includes(q)
    })
    // Порядок разделов задаёт сам справочник, а не порядок находок: витрина
    // должна выглядеть одинаково при любом фильтре.
    return gram.chapters
      .map(chapter => ({ chapter, forms: hit.filter(f => f.chapter === chapter) }))
      .filter(g => g.forms.length > 0)
  }, [gram, gChapter, gLevels, query])

  const gramFound = useMemo(() => gramGroups.reduce((n, g) => n + g.forms.length, 0), [gramGroups])

  /** Ступени, которые вообще встречаются в справочнике, — для фильтра. */
  const gramLevels = useMemo(() => {
    if (!gram) return []
    const seen: string[] = []
    for (const f of gram.forms) if (!seen.includes(f.level)) seen.push(f.level)
    return seen.sort()
  }, [gram])

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
    speaking: speakTotal,
    // Всё, что в режиме можно открыть: основы плюс корни. Обе таблицы лежат в
    // коде, поэтому цифра известна синхронно и не прыгает после загрузки.
    blocks: (stemsOn ? KO_VERBS.length : 0) + (rootsOn ? HANJA_ROOTS.length : 0)
      + (numbersOn ? KO_NUMBER_SETS.length : 0) + (soundsOn ? KO_PRON_RULES.length : 0),
    // Из синхронного реестра — чтобы бейдж стоял до того, как чанк поехал.
    grammar: grammarOn ? (GRAMMAR_COUNTS[lang] ?? GRAMMAR_COUNTS[lang.split('-')[0]]) : undefined,
    // Главы рассказа плюс книги на полке. Книги известны синхронно, главы — нет
    // (рассказ едет чанком), поэтому до загрузки в бейдже стоят только книги, а
    // не ноль: ноль читался бы как «раздел пустой».
    guide: guideOn ? (story ? story.chapters.length : 0) + books.length : undefined,
  }

  const heroSubtitle =
    mode === 'vocab' && hasBook ? `${allThemes.reduce((n, x) => n + x.phrases.length, 0)} ${t('фраз')} · ${allThemes.length} ${t('ситуаций')}`
    : scenesOn ? `${sceneWorks.length} ${t('произведений')} · ${scenesTotal} ${t(scenesWord(scenesTotal))}`
    : feedOn ? `${feedTotal} ${t(materialsWord(feedTotal))} ${t('из свободных источников')}`
    : mode === 'reading' ? `${allTexts.length} ${t('текстов')}`
    : mode === 'listening' ? `${audio.length} ${t('записей')}`
    : mode === 'blocks' ? `${KO_VERBS.length} ${t('основ')} · ${HANJA_ROOTS.length} ${t('корней')} · ${KO_NUMBER_SETS.length} ${t('наборов чисел')} · ${KO_PRON_RULES.length} ${t('правил чтения')}`
    : mode === 'grammar' && gram ? `${gram.forms.length} ${t('форм')} · ${gram.forms.reduce((n, f) => n + f.examples.length, 0)} ${t('примеров')}`
    : `${speakTotal} ${t('заданий')} · ${speakCounts.sent} ${t('записей')}`

  const filtersOn = fLevel.length > 0 || fTopic.length > 0 || fSkill.length > 0 || !!fLen
  const clearFilters = () => { setFLevel([]); setFTopic([]); setFSkill([]); setFLen('') }

  const rail = (
    <>
      {!narrow && <SubjectHero state={subjectState} subtitle={heroSubtitle} palette={palette} />}

      {!narrow && (
      <RailCard title="Режим" accent={palette.accent} icon={<Layers size={15} />}>
        <RailModes
          items={MODES
            .filter(m => (m.id !== 'blocks' || blocksOn) && (m.id !== 'grammar' || grammarOn) && (m.id !== 'guide' || guideOn))
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
      {mode === 'grammar' && gram && !openForm && (
        <RailCard title="Раздел" accent={palette.accent} icon={<BookMarked size={15} />}>
          <RailList
            items={[
              { id: '', label: t('Все разделы'), hint: String(gram.forms.length) },
              ...gram.chapters.map(c => ({
                id: c,
                label: t(c),
                hint: String(gram.forms.filter(f => f.chapter === c).length),
              })),
            ]}
            value={gChapter}
            onChange={setGChapter}
            accent={palette.accent}
            soft={palette.soft}
          />
        </RailCard>
      )}

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

      {isLang && (
        <RailCard
          title="Фильтры"
          accent={palette.accent}
          icon={<SlidersHorizontal size={15} />}
          action={filtersOn ? { label: t('Сбросить'), onClick: clearFilters } : undefined}
        >
          {levelOpts.length > 1 && (
            <MultiSelectField label={t('Уровень')} options={levelOpts} values={fLevel} onChange={setFLevel}
              accent={palette.accent} accentBg={palette.soft} lockScroll />
          )}
          {topicOpts.length > 1 && (
            <MultiSelectField label={t('Тема')} options={topicOpts} values={fTopic} onChange={setFTopic}
              accent={palette.accent} accentBg={palette.soft} lockScroll />
          )}
          {mode === 'reading' && skillOpts.length > 1 && (
            <MultiSelectField label={t('Навык')} options={skillOpts} values={fSkill} onChange={setFSkill}
              accent={palette.accent} accentBg={palette.soft} lockScroll />
          )}
          <RailSegment options={LENGTHS.map(l => ({ value: l.value, label: l.label }))}
            value={fLen} onChange={setFLen} accent={palette.accent} soft={palette.soft} />
        </RailCard>
      )}

      {mode === 'vocab' && (hasBook || nestsOn || packsOn) && !openItem && !openNest && !openMyWords && !openPack && (
        <>
          <RailCard title="Фильтры" accent={palette.accent} icon={<SlidersHorizontal size={15} />}
            action={shelf || packShelf || fLevel.length > 0
              ? { label: t('Сбросить'), onClick: () => { setShelf(''); setPackShelf(''); setFLevel([]) } }
              : undefined}>
            {!narrow && (
            <RailSegment
              options={[
                ...(hasBook ? [{ value: 'sets', label: 'Наборы' }] : []),
                // «Слова» отдельной таблеткой от «Наборов»: это разный
                // материал, а не разный фильтр одного. В наборах — готовые
                // фразы под ситуацию, здесь — лексика пачкой по смыслу.
                ...(packsOn ? [{ value: 'packs', label: 'Слова', icon: <Languages size={15} /> }] : []),
                // Иконкой, а не подписью: «Повторение» рядом с «Наборами» не
                // влезало в рейл и обрезалось в «Повторе…».
                { value: 'due', label: 'Повторение', badge: due, icon: <RotateCcw size={15} /> },
                // Третья таблетка только там, где гнёзда для языка написаны:
                // пустая вкладка хуже отсутствующей.
                ...(nestsOn ? [{ value: 'nests', label: 'Созвучия', icon: <Ear size={15} /> }] : []),
              ]}
              value={vocabView}
              onChange={v => v && setVocabView(v as VocabView)}
              accent={palette.accent}
              soft={palette.soft}
              clearable={false}
            />
            )}
            {vocabView === 'sets' && setLevelOpts.length > 1 && (
              <MultiSelectField label={t('Уровень')} options={setLevelOpts} values={fLevel} onChange={setFLevel}
                accent={palette.accent} accentBg={palette.soft} lockScroll />
            )}
            {vocabView === 'sets' && shelves.length > 0 && (
              <RailList
                items={shelves.map(s => ({ id: s.title, label: t(s.title), hint: String(s.count) }))}
                value={shelf}
                onChange={v => setShelf(v === shelf ? '' : v)}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
            {vocabView === 'packs' && packLevelOpts.length > 1 && (
              <MultiSelectField label={t('Уровень')} options={packLevelOpts} values={fLevel} onChange={setFLevel}
                accent={palette.accent} accentBg={palette.soft} lockScroll />
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
          {(hasBook || packsOn) && vocabView !== 'nests' && (
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

      {mode === 'blocks' && !openStem && !openRoot && !openNum && !openPron && (
        <RailCard title="Что собираем" accent={palette.accent} icon={<Blocks size={15} />}>
          {!narrow && (
          // Четыре подписи со счётчиками в рейл не влезали и резались
          // многоточием («О.. 8») — поэтому режим idleIcon: подпись целиком
          // только у выбранной половины, остальные ждут значками. Счётчики и
          // так стоят в тулбаре и на плитках.
          <RailSegment
            options={[
              ...(stemsOn ? [{ value: 'stems', label: 'Основы', icon: <Layers size={15} /> }] : []),
              ...(rootsOn ? [{ value: 'roots', label: 'Корни', icon: <Puzzle size={15} /> }] : []),
              ...(numbersOn ? [{ value: 'numbers', label: 'Числа', icon: <Hash size={15} /> }] : []),
              ...(soundsOn ? [{ value: 'sounds', label: 'Звуки', icon: <AudioLines size={15} /> }] : []),
            ]}
            value={blocksView}
            onChange={v => v && switchBlocksView(v as BlocksView)}
            accent={palette.accent}
            soft={palette.soft}
            clearable={false}
            idleIcon
          />
          )}
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {blocksView === 'stems'
              ? t('Глагол не спрягается по лицам: основа стоит, меняется хвост.')
              : blocksView === 'roots'
              ? t('Слово китайского происхождения собрано из односложных кирпичей.')
              : blocksView === 'sounds'
              ? t('Написанное и звучащее расходятся по правилам — их всего десять.')
              : t('Рядов счёта два, и выбирает между ними не число, а то, что считают.')}
          </div>
        </RailCard>
      )}

      {/* Справочник хвостов. Стоит в рейле, а не на странице: он нужен и на
          витрине, и внутри основы, и внутри прогона — то есть везде, где рейл
          и так виден. */}
      {mode === 'blocks' && blocksView === 'stems' && (
        <RailCard title="Хвосты" accent={palette.accent} icon={<Layers size={15} />}>
          {KO_ENDINGS.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: TONE[e.tone].fg, whiteSpace: 'nowrap' }}>
                {e.block}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{t(e.label)}</span>
            </div>
          ))}
        </RailCard>
      )}

      {/* Тот же приём, что и со справочником хвостов: правило выбора ряда нужно
          и на витрине, и внутри набора, и посреди прогона. */}
      {mode === 'blocks' && blocksView === 'numbers' && (
        <RailCard title="Каким рядом" accent={palette.accent} icon={<Layers size={15} />}>
          {SYSTEM_RULES.map(rule => (
            <div key={rule.system} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: rule.system === 'sino' ? 'var(--color-blue-pill-text)'
                  : rule.system === 'native' ? 'var(--color-peach-text)'
                  : 'var(--color-purple-text)',
              }}>
                {t(systemLabel(rule.system))}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.45 }}>{t(rule.what)}</span>
            </div>
          ))}
        </RailCard>
      )}

      {/* Опорная таблица правил чтения — тот же приём, что «Хвосты» и «Каким
          рядом»: семь конечных звуков нужны и на витрине, и посреди прогона,
          потому что через них проходит половина правил. */}
      {mode === 'blocks' && blocksView === 'sounds' && (
        <RailCard title="Семь конечных" accent={palette.accent} icon={<Layers size={15} />}>
          {([
            ['ㄱ ㅋ ㄲ', '[к]'], ['ㄴ', '[н]'], ['ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ', '[т]'],
            ['ㄹ', '[ль]'], ['ㅁ', '[м]'], ['ㅂ ㅍ', '[п]'], ['ㅇ', '[нъ]'],
          ] as const).map(([letters, sound]) => (
            <div key={sound} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: palette.accent, whiteSpace: 'nowrap' }}>
                {letters}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{sound}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {t('Так звучит любой 받침 — если следом не идёт гласная.')}
          </div>
        </RailCard>
      )}

      {mode === 'blocks' && blocksView === 'roots' && !openRoot && (
        <RailCard
          title="Полки"
          accent={palette.accent}
          icon={<SlidersHorizontal size={15} />}
          action={rootGroup ? { label: t('Все полки'), onClick: () => setRootGroup('') } : undefined}
        >
          <RailList
            items={HANJA_GROUPS.map(g => ({
              id: g,
              label: t(g),
              hint: String(HANJA_ROOTS.filter(r => r.group === g).length),
            }))}
            value={rootGroup}
            onChange={v => setRootGroup(v === rootGroup ? '' : v)}
            accent={palette.accent}
            soft={palette.soft}
          />
        </RailCard>
      )}

      {mode === 'blocks' && (
        <RailCard title="Показ" accent={palette.accent} icon={<Eye size={15} />}>
          <RailToggle label="Романизация" on={phraseView.reading}
            onChange={v => setPhraseView(st => ({ ...st, reading: v }))} accent={palette.accent} />
        </RailCard>
      )}

      {mode === 'guide' && (
        <>
          <RailCard title="Раздел" accent={palette.accent} icon={<Compass size={15} />}>
            {!narrow && (
            <RailSegment
              options={[
                ...(storyOn ? [{ value: 'story', label: 'Как устроен' }] : []),
                ...(booksOn ? [{ value: 'books', label: 'Учебники', badge: books.length, icon: <Library size={15} /> }] : []),
              ]}
              value={guideView}
              onChange={v => v && setGuideView(v as GuideView)}
              accent={palette.accent}
              soft={palette.soft}
              clearable={false}
            />
            )}
            {/* Главы списком в рейле: из читалки видно, что идёт дальше, и
                можно перескочить, не возвращаясь на витрину. */}
            {guideView === 'story' && story && story.chapters.length > 0 && (
              <RailList
                items={story.chapters.map(c => ({
                  id: c.id,
                  label: t(c.title),
                  hint: `${Math.min(storyRead[c.id] ?? 0, c.cards.length)}/${c.cards.length}`,
                }))}
                value={openChapterId ?? ''}
                onChange={v => setOpenChapterId(v === openChapterId ? null : v)}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
          </RailCard>
          {guideView === 'books' && (
            <RailCard title="Про полку" accent={palette.accent} icon={<Library size={15} />}>
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, ...proseWrap }}>
                {bindShortWords(t('Здесь ссылки на официальные страницы издательств, а не файлы. Главное на карточке — строка «когда браться»: половина брошенных учебников взята не вовремя, а не выбрана неправильно.'))}
              </div>
            </RailCard>
          )}
        </>
      )}

      {mode === 'speaking' && (
        <RailCard
          title="Фильтры"
          accent={palette.accent}
          icon={<SlidersHorizontal size={15} />}
        >
          {/* Четыре подписи в ряд шириной в рейл ломались пополам («Шэдо/уинг»).
              Название остаётся у выбранного — того, что сейчас и определяет
              выборку, — остальные ждут значками и называют себя по наведению. */}
          <RailSegment
            options={[
              // «Все» — такая же кнопка ряда, а не ссылка в углу карточки: без
              // неё ряд открывался четырьмя безымянными значками, и было
              // непонятно, что выборка сейчас полная.
              { value: '', label: 'Все', icon: <ListChecks size={15} /> },
              ...(hasVoiceFor(lang) ? [{ value: 'shadow', label: 'Шэдоуинг', icon: <Repeat size={15} /> }] : []),
              { value: 'roleplay', label: 'Ролевые', icon: <MessagesSquare size={15} /> },
              // Рассказ о себе и чтение фраз вслух — оба монолог без диалога
              // и без эталона для повтора, отдельной кнопкой «Рассказ» не
              // помещались в ряд. См. фильтр в Speaking().
              { value: 'aloud', label: 'Вслух', icon: <Volume2 size={15} /> },
            ]}
            value={kindFilter}
            onChange={setKindFilter}
            accent={palette.accent}
            soft={palette.soft}
            clearable={false}
            idleIcon
          />
          <RailStat label="Заданий" value={speakTotal} />
          <RailStat label="Моих записей" value={speakCounts.sent} tone={speakCounts.sent > 0 ? 'good' : undefined} />
        </RailCard>
      )}

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
          ...(hasBook ? [{ id: 'sets', label: 'Наборы' }] : []),
          ...(packsOn ? [{ id: 'packs', label: 'Слова' }] : []),
          { id: 'due', label: 'Повторение', badge: due },
          ...(nestsOn ? [{ id: 'nests', label: 'Созвучия' }] : []),
        ]
    : mode === 'blocks'
      ? [
          ...(stemsOn ? [{ id: 'stems', label: 'Основы', badge: KO_VERBS.length }] : []),
          ...(rootsOn ? [{ id: 'roots', label: 'Корни', badge: HANJA_ROOTS.length }] : []),
          ...(numbersOn ? [{ id: 'numbers', label: 'Числа', badge: KO_NUMBER_SETS.length }] : []),
          ...(soundsOn ? [{ id: 'sounds', label: 'Звуки', badge: KO_PRON_RULES.length }] : []),
        ]
    : mode === 'guide'
      ? [
          ...(storyOn ? [{ id: 'story', label: 'Как устроен' }] : []),
          ...(booksOn ? [{ id: 'books', label: 'Учебники', badge: books.length }] : []),
        ]
    : undefined

  const navView =
    mode === 'reading' ? readingView
    : mode === 'vocab' ? vocabView
    : mode === 'blocks' ? blocksView
    : mode === 'guide' ? guideView
    : undefined

  const nav: TrainerNav = {
    modes: MODES
      .filter(m => (m.id !== 'blocks' || blocksOn) && (m.id !== 'grammar' || grammarOn) && (m.id !== 'guide' || guideOn))
      .map(m => ({ id: m.id, label: m.label, count: modeCounts[m.id], Icon: m.Icon })),
    mode,
    onMode: m => switchMode(m as Mode),
    views: navViews,
    view: navView,
    onView: v => {
      if (mode === 'reading') switchReadingView(v as ReadingView)
      else if (mode === 'vocab') setVocabView(v as VocabView)
      else if (mode === 'blocks') switchBlocksView(v as BlocksView)
      else if (mode === 'guide') setGuideView(v as GuideView)
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
  if (scenesOn) {
    toolbar = (
      <Toolbar>
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
          </>
        )}
        <ToolRight>
          <ToolCount>
            {openWork
              ? `${scenesOf(openWork.id).length} ${t(scenesWord(scenesOf(openWork.id).length))}`
              : `${t('Всего:')} ${visibleWorks.length}`}
          </ToolCount>
        </ToolRight>
      </Toolbar>
    )
  } else if (isLang) {
    toolbar = (
      <Toolbar>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Название или тема…')} />
        <StatusTabs
          options={[
            { value: '', label: 'Все' },
            { value: 'new', label: mode === 'listening' ? 'Не слушал' : 'Не читал' },
            { value: 'done', label: 'Пройдено' },
          ]}
          value={status}
          onChange={setStatus}
          accent={palette.accent}
        />
        <SortMenu options={SORTS_LIB} value={sort} onChange={setSort} accent={palette.accent} soft={palette.soft} />
        <ToolCount>{t('Всего:')} {library.length}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'grammar') {
    toolbar = (
      <Toolbar>
        {openForm ? (
          <ToolButton onClick={() => setOpenFormId(null)}>
            <ChevronLeft size={14} /> {t('К справочнику')}
          </ToolButton>
        ) : (
          <>
            <SearchPill value={query} onChange={setQuery} placeholder={t('Форма, название или пример…')} />
            {/* Ступень стоит в строке фильтров, а не в рейле: то же место, что у
                «Уровня» на сценах, и один экземпляр переключателя на экран. */}
            {gramLevels.length > 1 && (
              <FilterMenu
                label="Уровень"
                options={gramLevels.map(l => ({
                  value: l,
                  label: l,
                  count: gram ? gram.forms.filter(f => f.level === l).length : 0,
                }))}
                value={gLevels}
                onChange={setGLevels}
                accent={palette.accent}
                soft={palette.soft}
              />
            )}
            <ToolCount>{gramFound} {t('форм')}</ToolCount>
          </>
        )}
      </Toolbar>
    )
  } else if (
    mode === 'blocks' && blocksView !== 'stems' && !openStem && !openRoot && !openNum && !openPron
  ) {
    // На «Основах» строки поиска нет: основ восемь, они на одном экране, и
    // поиск по ним — таблетка ради таблетки. Число основ и так стоит на чипсе
    // дока и в подводке витрины.
    toolbar = (
      <Toolbar>
        <SearchPill value={query} onChange={setQuery}
          placeholder={t(
            blocksView === 'roots' ? 'Найти слово или корень…'
            : blocksView === 'sounds' ? 'Найти правило или слово…'
            : 'Найти число или ситуацию…')} />
        <ToolCount>
          {blocksView === 'roots'
            ? `${visibleRoots.length} ${t('корней')}`
            : blocksView === 'sounds'
            ? `${visiblePron.length} ${t('правил')}`
            : `${visibleNums.length} ${t('наборов')}`}
        </ToolCount>
      </Toolbar>
    )
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
  } else if (mode === 'vocab' && hasBook && vocabView === 'sets' && !openItem) {
    toolbar = (
      <Toolbar>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Найти тему…')} />
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
        <SortMenu options={SORTS_SETS} value={sort} onChange={setSort} accent={palette.accent} soft={palette.soft} />
        <ToolCount>
          {visibleThemes.reduce((n, x) => n + x.phrases.length, 0)} {t('фраз')} · {visibleThemes.length} {t('тем')}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && packsOn && vocabView === 'packs' && !openPack) {
    toolbar = (
      <Toolbar>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Найти слово или набор…')} />
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
  } else if (mode === 'guide' && openChapter) {
    toolbar = (
      <Toolbar>
        <ToolButton onClick={() => setOpenChapterId(null)}>
          <ChevronLeft size={14} /> {t('К главам')}
        </ToolButton>
        <ToolCount>{t(openChapter.title)}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'guide' && guideView === 'books') {
    toolbar = (
      <Toolbar>
        <ToolCount>{books.length} {t('книг и ресурсов')}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'guide') {
    toolbar = (
      <Toolbar>
        <ToolCount>
          {story ? `${story.chapters.length} ${t('глав')}` : t('Загружаем…')}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'speaking' && speakOpen) {
    toolbar = (
      <Toolbar>
        <ToolButton onClick={() => setSpeakOpen(null)}>
          <ChevronLeft size={14} /> {t('К списку')}
        </ToolButton>
        <ToolCount>{t(speakOpen.title)}</ToolCount>
      </Toolbar>
    )
  } else if (mode === 'speaking') {
    toolbar = (
      <Toolbar>
        <SearchPill value={query} onChange={setQuery} placeholder={t('Найти задание…')} />
        <StatusTabs
          options={[
            { value: '', label: 'Все' },
            { value: 'new', label: 'Не записаны' },
            { value: 'done', label: 'Записано' },
          ]}
          value={status}
          onChange={setStatus}
          accent={palette.accent}
        />
        <ToolCount>{t('Всего:')} {speakCounts.shown}</ToolCount>
      </Toolbar>
    )
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
    content = gram === undefined ? (
      <Skeleton.Text lines={5} style={{ maxWidth: 520 }} />
    ) : gram === null ? (
      <ShellEmpty text="Для этого языка справочник пока не написан." />
    ) : openForm ? (
      <GrammarPage
        form={openForm}
        all={gram}
        lang={lang}
        subject={subjectId}
        accent={palette.accent}
        soft={palette.soft}
        onOpenForm={id => setOpenFormId(id)}
        onQuizDone={(id, score, total) => {
          saveResult('grammar', id, score, total)
          setResultsKey(k => k + 1)
        }}
      />
    ) : (
      <GrammarGrid
        groups={gramGroups}
        result={id => resultFrom('grammar', id, results)}
        accent={palette.accent}
        soft={palette.soft}
        onOpen={id => setOpenFormId(id)}
      />
    )
  } else if (scenesOn) {
    content = scenes === undefined ? (
      <Skeleton.Text lines={5} style={{ maxWidth: 520 }} />
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
        done={sceneDone}
        accent={palette.accent}
        soft={palette.soft}
        onOpen={setOpenWorkId}
      />
    )
  } else if (feedOn) {
    content = feed === undefined ? (
      <Skeleton.Text lines={5} style={{ maxWidth: 520 }} />
    ) : (
      <FeedList
        items={feed}
        lang={lang}
        accent={palette.accent}
        subjectId={subjectId}
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <TileChip tone="accent" accent={palette.accent} soft={palette.soft}>{x.level}</TileChip>
                <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                  {x.topic} · {x.minutes} {t('мин')}
                </span>
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
  } else if (mode === 'guide' && guideView === 'books') {
    content = <BookShelf books={books} lang={lang} accent={palette.accent} soft={palette.soft} />
  } else if (mode === 'guide' && openChapter) {
    content = (
      <StoryChapterPage
        chapter={openChapter}
        // Закладка: своя позиция, а если главу открыли впервые за сессию —
        // первая непрочитанная карточка (читалка сама зажмёт в границы главы).
        at={storyAt[openChapter.id] ?? storyRead[openChapter.id] ?? 0}
        onAt={n => {
          setStoryAt(prev => ({ ...prev, [openChapter.id]: n }))
          // Прочитанное — максимум: полоска на витрине показывает «сколько
          // прочитано», а не «где сейчас палец».
          setStoryRead(prev => ({
            ...prev,
            [openChapter.id]: Math.max(prev[openChapter.id] ?? 0, n + 1),
          }))
        }}
        accent={palette.accent}
        soft={palette.soft}
        onDone={() => setOpenChapterId(null)}
      />
    )
  } else if (mode === 'guide') {
    content = story === undefined
      ? <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
      : story
        ? (
          <StoryGrid
            story={story}
            read={id => storyRead[id] ?? 0}
            accent={palette.accent}
            soft={palette.soft}
            onOpen={id => setOpenChapterId(id)}
          />
        )
        : <ShellEmpty text="Рассказа об этом языке пока нет." />
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
  } else if (mode === 'vocab' && vocabView === 'sets' && hasBook) {
    content = book === undefined
      ? <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
      : (
        <PhraseDecks
          themes={visibleThemes}
          states={states}
          accent={palette.accent}
          soft={palette.soft}
          levelLabel={themeLevel}
          early={themeAhead}
          lead={
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
          }
          onOpen={id => { setOpenTheme(id); setQuery(''); setStatus(''); setRun('swipe') }}
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
          key={deckKey}
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
            ) : null
          }
        />
        {seedNote && (
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: 'var(--color-muted)' }}>{seedNote}</div>
        )}
      </div>
    )
  } else if (mode === 'blocks') {
    // Конструктор. Прогон пишет результат в общий журнал материалов, как текст
    // и гнездо созвучий: плитка основы показывает счёт ровно так же.
    const intro = blocksView === 'stems'
      ? 'Одна основа и восемь хвостов. Хвост цепляется одинаково к любому глаголу, поэтому выучить нужно восемь хвостов, а не сорок форм.'
      : blocksView === 'roots'
      ? 'Больше половины корейских слов собрано из односложных кирпичей. Один кирпич открывает сразу гнездо слов, а промахи прогона уходят в колоду повторений.'
      : blocksView === 'sounds'
      ? 'Корейское слово часто звучит не так, как написано, — и расходятся они не как попало, а по десятку правил. Каждое правило здесь — разбор, частые слова и прогон; промахи уходят в колоду повторений.'
      : 'Рядов счёта два, и выбирают между ними не по числу, а по тому, что считают: людей и часы — исконным, деньги, минуты и даты — китайским. Наборы здесь и есть эти ситуации.'
    const grid = blocksView === 'sounds' ? (
      visiblePron.length === 0 ? (
        <ShellEmpty text="Под поиск ничего не подошло." />
      ) : (
        <PronGrid
          rules={visiblePron}
          results={id => resultFrom('pron', id, results)}
          accent={palette.accent}
          soft={palette.soft}
          onOpen={id => { setOpenPronId(id); setQuery('') }}
        />
      )
    ) : blocksView === 'numbers' ? (
      visibleNums.length === 0 ? (
        <ShellEmpty text="Под поиск ничего не подошло." />
      ) : (
        <NumberGrid
          sets={visibleNums}
          results={id => resultFrom('number', id, results)}
          accent={palette.accent}
          soft={palette.soft}
          onOpen={id => { setOpenNumId(id); setQuery('') }}
        />
      )
    ) : blocksView === 'stems' ? (
      visibleStems.length === 0 ? (
        <ShellEmpty text="Под поиск ничего не подошло." />
      ) : (
        <StemGrid
          verbs={visibleStems}
          results={dict => resultFrom('ending', dict, results)}
          accent={palette.accent}
          soft={palette.soft}
          onOpen={dict => { setOpenStemDict(dict); setQuery('') }}
        />
      )
    ) : visibleRoots.length === 0 ? (
      <ShellEmpty text="Под поиск ничего не подошло." />
    ) : (
      <RootGrid
        roots={visibleRoots}
        results={ko => resultFrom('root', ko, results)}
        accent={palette.accent}
        soft={palette.soft}
        onOpen={ko => { setOpenRootKo(ko); setQuery('') }}
      />
    )
    content = openStem ? (
      <StemPage
        verb={openStem}
        lang={lang}
        accent={palette.accent}
        soft={palette.soft}
        owner={owner}
        subjectId={subjectId}
        reading={phraseView.reading}
        onFinished={(score, total) => {
          saveResult('ending', openStem.dict, score, total)
          setResultsKey(k => k + 1)
          setKnownKey(k => k + 1)
        }}
        onBack={() => setOpenStemDict(null)}
      />
    ) : openNum ? (
      <NumberPage
        set={openNum}
        lang={lang}
        accent={palette.accent}
        soft={palette.soft}
        owner={owner}
        subjectId={subjectId}
        reading={phraseView.reading}
        onFinished={(score, total) => {
          saveResult('number', openNum.id, score, total)
          setResultsKey(k => k + 1)
          setKnownKey(k => k + 1)
        }}
        onBack={() => setOpenNumId(null)}
      />
    ) : openPron ? (
      <PronPage
        rule={openPron}
        lang={lang}
        accent={palette.accent}
        soft={palette.soft}
        owner={owner}
        subjectId={subjectId}
        onFinished={(score, total) => {
          saveResult('pron', openPron.id, score, total)
          setResultsKey(k => k + 1)
          setKnownKey(k => k + 1)
        }}
        onBack={() => setOpenPronId(null)}
      />
    ) : openRoot ? (
      <RootPage
        root={openRoot}
        lang={lang}
        accent={palette.accent}
        soft={palette.soft}
        owner={owner}
        subjectId={subjectId}
        reading={phraseView.reading}
        onFinished={(score, total) => {
          saveResult('root', openRoot.ko, score, total)
          setResultsKey(k => k + 1)
          setKnownKey(k => k + 1)
        }}
        onBack={() => setOpenRootKo(null)}
      />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0, lineHeight: 1.6, ...proseWrap }}>
          {bindShortWords(t(intro))}
        </p>
        {grid}
      </div>
    )
  } else {
    content = (
      <Speaking
        subjectId={subjectId}
        subject={subject}
        lang={lang}
        accent={palette.accent}
        palette={palette}
        themes={allThemes}
        query={query}
        kindFilter={kindFilter}
        status={status}
        open={speakOpen}
        onOpen={setSpeakOpen}
        onCounts={setSpeakCounts}
      />
    )
  }

  // Свайп от левого края повторяет кнопку «назад» текущей строки управления
  // («К полкам» / «К справочнику» / «К главам» / «К списку»). Открытые
  // материалы (читалка/аудирование) регистрируют свой «назад» сами, поэтому
  // здесь жест выключен, пока показан материал, — иначе после F5 с открытой
  // сценой свайп закрывал бы полку ПОД ней.
  const materialOpen = Boolean(openScene || openText || openAudio)
  const toolbarBack =
    scenesOn && openWork ? () => setOpenWorkId(null)
    : mode === 'grammar' && openForm ? () => setOpenFormId(null)
    : mode === 'guide' && openChapter ? () => setOpenChapterId(null)
    : mode === 'speaking' && speakOpen ? () => setSpeakOpen(null)
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
            : `${text.level} · ${text.topic} · ${text.minutes} ${t('мин')}`}
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
            {scene && work ? `${work.title} · ${scene.where}` : `${text.topic} · ${text.level}`}
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

            {/* Перевод открывается только после проверки: иначе читать оригинал незачем. */}
            {text.translation && (
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

          {showTranslation && text.translation && (
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
      <RailHero plain title={item.title} subtitle={`${item.level} · ${item.topic} · ${item.minutes} ${t('мин')}`} palette={palette} />

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

// ─── Говорение ───────────────────────────────────────────────────────────────

/**
 * Задание на говорение.
 *
 * `id` собирается из вида и ключа темы и в базу не уходит: записи опознаются по
 * тексту задания (см. VoiceEntry.prompt), потому что формулировка — это и есть
 * то, что видит преподаватель. Заводить ради связи отдельный идентификатор
 * значило бы хранить его в двух местах и однажды разойтись.
 */
interface SpeakTask {
  id: string
  kind: 'story' | 'roleplay' | 'aloud' | 'shadow'
  title: string
  prompt: string
  seconds: number
  /**
   * Реплики для шэдоуинга. Есть только у своего вида: остальные задания —
   * монолог по формулировке, и разбивать его на строки нечего.
   */
  lines?: ShadowLine[]
}

/**
 * Рассказы о себе — постоянный набор.
 *
 * Он намеренно маленький и не меняется: смысл в том, чтобы записывать ОДНО И ТО
 * ЖЕ раз в месяц и слышать собственный прогресс. Изнутри он не слышен вообще, а
 * на двух записях подряд очевиден за десять секунд.
 */
const SPEAKING_PROMPTS = [
  'Расскажи о себе: имя, чем занимаешься, зачем учишь язык. Минута.',
  'Опиши свой обычный день с утра до вечера.',
  'Расскажи о месте, где ты вырос. Что там было хорошего?',
  'Что ты делал на прошлых выходных? Используй прошедшее время.',
  'Какие у тебя планы на ближайший год?',
]

const STORY_TASKS: SpeakTask[] = SPEAKING_PROMPTS.map((prompt, i) => ({
  id: `story-${i}`,
  kind: 'story',
  title: prompt.split(/[:.]/)[0],
  prompt,
  seconds: 60,
}))

/**
 * Задания из разговорника.
 *
 * Ролевые сценарии написаны для каждой ситуации и до сих пор были видны только
 * внутри курса — в тренажёре режим предлагал пять рассказов о себе и всё.
 * Здесь они наконец доезжают до ученика, а чтение вслух собирается из первых
 * фраз темы: это единственное задание, где произношение проверяется не на
 * придуманном тексте, а на том, что человек реально будет говорить.
 */
/**
 * Сколько заданий даст разговорник. Считается БЕЗ сборки списка: цифра нужна
 * рейлу на всех режимах, в том числе пока говорение ни разу не открывали, а
 * строить ради неё восемьдесят объектов на каждый рендер незачем.
 */
function countSpeakTasks(themes: SurvivalThemeCards[], shadow: boolean): number {
  return themes.reduce((n, x) => n + 1 + (x.phrases.length >= 5 ? (shadow ? 2 : 1) : 0), 0) + STORY_TASKS.length
}

/**
 * Сколько реплик даём за подход.
 *
 * Не вся тема: сорок фраз подряд с записью каждой — это сорок минут, и до
 * середины никто не доходит. Восемь реплик проходятся за пять-семь минут, а
 * тема из сорока фраз становится пятью подходами, а не одним неподъёмным.
 */
const SHADOW_LINES = 8

function bookTasks(themes: SurvivalThemeCards[], shadow: boolean): SpeakTask[] {
  const out: SpeakTask[] = []
  for (const x of themes) {
    out.push({
      id: `role-${x.theme.id}`,
      kind: 'roleplay',
      title: x.theme.title,
      prompt: x.theme.roleplay,
      seconds: 90,
    })
    if (x.phrases.length >= 5) {
      // Реплика для повтора — это предложение, а не словарная форма: интонацию
      // и связки слышно только на целой фразе, а «Excuse me» отработать нечем.
      if (shadow) {
        out.push({
          id: `shadow-${x.theme.id}`,
          kind: 'shadow',
          title: x.theme.title,
          prompt: `Повторите за образцом ${SHADOW_LINES} реплик темы и сравните со своей записью.`,
          seconds: 0,
          lines: x.phrases.slice(0, SHADOW_LINES).map(ph => ({
            text: ph.ex?.term ?? ph.term,
            ru: ph.ex?.ru ?? ph.ru,
          })),
        })
      }
      out.push({
        id: `aloud-${x.theme.id}`,
        kind: 'aloud',
        title: x.theme.title,
        prompt: `Прочитайте вслух пять фраз темы: ${x.phrases.slice(0, 5).map(p => p.term).join(' · ')}`,
        seconds: 45,
      })
    }
  }
  return out
}

const KIND_LABEL: Record<SpeakTask['kind'], string> = {
  shadow: 'Шэдоуинг',
  story: 'Рассказ',
  roleplay: 'Ролевое',
  aloud: 'Чтение вслух',
}

function Speaking({ subjectId, subject, lang, accent, palette, themes, query, kindFilter, status, open, onOpen, onCounts }: {
  subjectId: string
  subject: string
  /** Код языка — по нему берётся голос эталона в шэдоуинге. */
  lang: string
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  themes: SurvivalThemeCards[]
  query: string
  kindFilter: string
  status: string
  /** Открытое задание держит родитель — там же живёт кнопка «К списку». */
  open: SpeakTask | null
  onOpen: (task: SpeakTask | null) => void
  /** Отдаёт наверх счётчики для рейла и строки — их считает этот компонент. */
  onCounts: (c: { total: number; sent: number; shown: number }) => void
}) {
  const t = useT()
  const [entries, setEntries] = useState<VoiceEntry[]>([])
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const owner = useMemo(() => ownerStudentIdFor(subjectId), [subjectId])

  // Занятие в говорении — это открытое задание с диктофоном, а не список.
  useTrainerEngaged(!!open)

  // Без голоса шэдоуинга нет: сравнивать себя не с чем.
  const canShadow = hasVoiceFor(lang)
  const tasks = useMemo(() => [...bookTasks(themes, canShadow), ...STORY_TASKS], [themes, canShadow])

  useEffect(() => {
    let alive = true
    listTrainerVoice(owner, subjectId)
      .then(rows => { if (alive) setEntries(rows) })
      .catch(() => { /* лента — не повод ронять режим */ })
    return () => { alive = false }
  }, [owner, subjectId, sendState])

  /** По каким заданиям запись уже уходила. Ключ — текст задания. */
  const sentPrompts = useMemo(() => new Set(entries.map(e => e.prompt).filter(Boolean)), [entries])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter(x => {
      // «Вслух» в фильтре — это рассказ о себе и чтение фраз разом: оба вида
      // монолог без диалога и без эталона для повтора, отдельными кнопками
      // они просто не помещались в рейл рядом с «Шэдоуингом» и «Ролевыми».
      if (kindFilter === 'aloud' ? (x.kind !== 'aloud' && x.kind !== 'story') : kindFilter && x.kind !== kindFilter) return false
      const done = sentPrompts.has(x.prompt)
      if (status === 'new' && done) return false
      if (status === 'done' && !done) return false
      if (q && !`${x.title} ${x.prompt}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, kindFilter, status, query, sentPrompts])

  useEffect(() => {
    onCounts({ total: tasks.length, sent: entries.length, shown: shown.length })
  }, [tasks.length, entries.length, shown.length, onCounts])

  async function handleRecorded(path: string | null) {
    if (!path || !open) return
    setSendState('sending')
    try {
      await submitTrainerVoice(owner, subjectId, subject, path, open.prompt)
      setSendState('done')
    } catch (e) {
      console.error('submitTrainerVoice:', e)
      setSendState('error')
    }
  }

  // ── Одно задание ───────────────────────────────────────────────────────────
  if (open) {
    const mine = entries.filter(e => e.prompt === open.prompt)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '16px 18px', borderRadius: 18,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TileChip tone="accent" accent={accent} soft={palette.soft}>{t(KIND_LABEL[open.kind])}</TileChip>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {open.lines ? `${open.lines.length} ${t('реплик')}` : `${open.seconds} ${t('с')}`}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)', marginBottom: 6 }}>{t(open.title)}</div>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--color-text)' }}>{t(open.prompt)}</p>
        </div>

        {/* Шэдоуинг живёт по своим правилам: не одна запись на всё задание, а
            петля по репликам, и наружу ничего не уходит (см. Shadowing.tsx). */}
        {open.kind === 'shadow' && open.lines ? (
          <Shadowing lines={open.lines} lang={lang} accent={palette.accent} soft={palette.soft} />
        ) : (
          <VoiceRecorder value={null} onChange={handleRecorded} maxSeconds={open.seconds + 30} accent={palette.accent} />
        )}

        {open.kind !== 'shadow' && sendState === 'sending' && (
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Отправляем преподавателю…')}</p>
        )}
        {open.kind !== 'shadow' && sendState === 'done' && (
          <p style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600 }}>
            {t('Записано и отправлено. Преподаватель послушает и разберёт.')}
          </p>
        )}
        {open.kind !== 'shadow' && sendState === 'error' && (
          <p style={{ fontSize: 13, color: 'var(--color-red-text)', fontWeight: 600 }}>
            {t('Не получилось отправить. Проверь связь и попробуй ещё раз.')}
          </p>
        )}

        {/* История именно этого задания — то, ради чего режим и нужен: две
            записи с разницей в месяц стоят рядом и слушаются подряд. */}
        {mine.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>
              {t('Ваши записи по этому заданию')}: {mine.length}
            </div>
            {mine.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
                background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
              }}>
                <Mic size={14} style={{ color: accent, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--color-text-2)' }}>
                  {new Date(e.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
                <TileChip>{t('на проверке')}</TileChip>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Список заданий ─────────────────────────────────────────────────────────
  if (shown.length === 0) {
    return <ShellEmpty text="Под выбранные фильтры ничего не подошло. Сбрось один из них." />
  }

  return (
    <TileGrid min={236}>
      {shown.map(x => {
        const done = sentPrompts.has(x.prompt)
        return (
          <Tile key={x.id} accent={accent} onClick={() => { onOpen(x); setSendState('idle') }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={palette.soft}>{t(KIND_LABEL[x.kind])}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {x.lines ? `${x.lines.length} ${t('реплик')}` : `${x.seconds} ${t('с')}`}
              </span>
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {t(x.title)}
            </span>
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
              overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3,
            }}>
              {t(x.prompt)}
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-3)' }}>
                {done ? t('записано') : t('не записано')}
              </span>
              {done && <Check size={13} style={{ color: 'var(--color-green-text)' }} />}
            </span>
          </Tile>
        )
      })}
    </TileGrid>
  )
}
