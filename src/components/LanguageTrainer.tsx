import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Headphones, Layers, Mic, ChevronLeft, CheckCircle2, XCircle, HelpCircle, SlidersHorizontal, Eye, Sparkle, Volume2, ListChecks, Check, RotateCcw, Library, Quote, Ear, Languages, ArrowRight } from 'lucide-react'
import { textsForLang, type ReadingText, type ReadingQuestion, type Gloss } from '../data/readingLibrary'
import { languageTaxonomy } from '../data/languageTaxonomy'
import { listeningForLang, type ListeningItem } from '../data/listeningLibrary'
import AudioPlayer from './AudioPlayer'
import { subjectTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap, balancedWrap } from '../lib/typography'
import CardDeck, { DECK_CTA } from './CardDeck'
import PhraseDecks, {
  ThemeSession, BackToSets, TakeWholeTheme, DeckHint, themeStats,
  type PhraseView, type RunMode,
} from './PhraseDecks'
import TrainerShell, {
  RailHero, RailCard, RailModes, RailSegment, RailList, RailToggle, RailStat,
  Toolbar, SearchPill, StatusTabs, ToolButton, SortMenu, ToolCount,
  Tile, TileGrid, TileMeter, TileChip, Empty as ShellEmpty,
} from './trainer/TrainerShell'
import { SubjectHero, SubjectPill } from './trainer/SubjectSwitch'
import type { TrainerSubjectState } from '../lib/trainerSubject'
import MultiSelectField from './MultiSelectField'
import { addCards, deckOwner, dueCount, deckStates, type CardState } from '../data/reviewDeck'
import { hasSurvivalBook, loadSurvivalBook } from '../data/survivalBooks'
import {
  hasScenes, loadScenes, scenesWord, shelvesForLang, worksForLang, workById,
  type Scene, type Work,
} from '../data/scenes'
import { WorkGrid, WorkPage } from './trainer/SceneShelf'
import {
  survivalShelves, survivalLevelLabel, SURVIVAL_LEVELS,
  type SurvivalBook, type SurvivalThemeCards,
} from '../data/survivalPhrases'
import { hasNests, nestById, nestsForLang, nestsUpTo } from '../data/soundNests'
import { NestGrid, NestPage } from './trainer/SoundNestDrill'
import { allResults, resultFrom, saveResult, type MaterialKind } from '../lib/trainerProgress'
import { courseReach, reachLevelIndex, reachNote } from '../lib/courseReach'
import VoiceRecorder from './VoiceRecorder'
import GlossedText from './GlossedText'
import Coachmarks, { type CoachStep } from './Coachmarks'
import Skeleton from './Skeleton'
import { hasLexicon, wordReading } from '../lib/lexicon'
import { usePersistentState } from '../lib/useDraft'
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

type Mode = 'reading' | 'vocab' | 'listening' | 'speaking'

const MODES: { id: Mode; label: string; hint: string; Icon: typeof BookOpen }[] = [
  { id: 'reading',   label: 'Чтение',     hint: 'Тексты с вопросами',       Icon: BookOpen },
  { id: 'vocab',     label: 'Карточки',   hint: 'Свайп: знаю / не помню',   Icon: Layers },
  { id: 'listening', label: 'Аудирование', hint: 'Лекции и разговоры',      Icon: Headphones },
  { id: 'speaking',  label: 'Говорение',  hint: 'Записать и отправить',     Icon: Mic },
]

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
 * `sets` — готовый разговорник по ситуациям, `due` — личная колода повторений,
 * `nests` — гнёзда созвучий. Последнее стоит именно здесь, а не отдельным
 * режимом рядом с «Чтением»: гнездо тоже работает через колоду (ошибки уходят
 * в SM-2), и пятая таблетка в рейле ради одного экрана — перебор.
 */
type VocabView = 'due' | 'sets' | 'nests'

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
  const [readingView, setReadingView] = usePersistentState<'texts' | 'scenes'>(`trainer.${lang}.readingView`, 'texts')
  const [openWorkId, setOpenWorkId] = usePersistentState<string | null>(`trainer.${lang}.work`, null)
  const [openSceneId, setOpenSceneId] = usePersistentState<string | null>(`trainer.${lang}.scene`, null)
  const [hideSpoilers, setHideSpoilers] = usePersistentState<boolean>(`trainer.${lang}.spoilers`, true)
  const [sceneShelf, setSceneShelf] = useState('')

  const sceneLib = hasScenes(lang)
  const sceneWorks = useMemo(() => worksForLang(lang), [lang])
  const sceneShelves = useMemo(() => shelvesForLang(lang), [lang])

  // Тексты сцен приезжают отдельным чанком и только когда вкладку открыли:
  // у того, кто читает учебные тексты, нет причин возить с собой Достоевского,
  // Акутагаву и Машаду разом. Язык хранится рядом со списком — при смене
  // предмета старый список сам перестаёт считаться загруженным.
  const [sceneData, setSceneData] = useState<{ lang: string; list: Scene[] } | null>(null)
  const scenes = sceneData?.lang === lang ? sceneData.list : undefined

  useEffect(() => {
    if (!sceneLib || mode !== 'reading' || readingView !== 'scenes' || scenes !== undefined) return
    let alive = true
    loadScenes(lang).then(list => { if (alive) setSceneData({ lang, list }) })
    return () => { alive = false }
  }, [sceneLib, mode, readingView, scenes, lang])

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

  const openWork: Work | null = openWorkId ? workById(openWorkId) ?? null : null
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

  // Смена режима сбрасывает выборку: фильтры у режимов разные, и «Уровень B1»,
  // унесённый из чтения в аудирование, молча прячет половину записей.
  function switchMode(m: Mode) {
    setMode(m)
    setFLevel([]); setFSkill([]); setFTopic([]); setFLen('')
    setQuery(''); setStatus(''); setSort('order'); setKindFilter('')
    setSceneShelf('')
  }

  /** Переключение половин «Чтения». Открытое произведение при этом закрывается. */
  function switchReadingView(v: 'texts' | 'scenes') {
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

  const isLang = (mode === 'reading' && !scenesOn) || mode === 'listening'
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
  const visibleWorks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sceneWorks.filter(w => {
      if (sceneShelf && w.shelf !== sceneShelf) return false
      if (q && !`${w.title} ${w.origTitle} ${w.author}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [sceneWorks, sceneShelf, query])

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

  // Восстановленная половина может оказаться несуществующей: разговорник для
  // языка ещё не написан, гнёзда не заведены. Тогда молча съезжаем на ту, что
  // есть, — иначе таблетки в рейле нет, а содержимое от неё показано.
  useEffect(() => {
    if (vocabView === 'sets' && !hasBook) setVocabView('due')
    else if (vocabView === 'nests' && !nestsOn) setVocabView(hasBook ? 'sets' : 'due')
  }, [vocabView, hasBook, nestsOn, setVocabView])

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
  useTrainerEngaged(!!(openScene || openText || openAudio || openItem || openNest))

  // Сцена открывается ТОЙ ЖЕ читалкой, что и учебный текст: отличается она
  // только рамкой вокруг — «что вокруг» до чтения и «чем кончилось» после.
  if (openScene) {
    return (
      <Reader
        text={openScene}
        scene={openScene}
        work={workById(openScene.workId)}
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
        accent={palette.accent}
        palette={palette}
        lang={lang}
        onBack={() => { setOpenAudioId(null); setResultsKey(k => k + 1) }}
      />
    )
  }

  // ── Рейл ───────────────────────────────────────────────────────────────────
  //
  // Собирается здесь целиком, а не по кускам из режимов: рейл общий, и если
  // каждый режим дорисовывал бы в него свою часть, при переключении половина
  // колонки перерисовывалась бы из другого места.

  const speakTotal = countSpeakTasks(allThemes)

  const modeCounts: Record<Mode, number | undefined> = {
    // «Чтение» — это две половины вкладки, и число у режима должно совпадать с
    // тем, что открыто сейчас: на «Текстах» — учебные тексты, на «Сценах» —
    // сцены. Пока сцены едут отдельным чанком, их число неизвестно (undefined),
    // и бейдж не рисуется вовсе: сумма, прыгающая с 5 на 37 после подгрузки,
    // читается как ошибка счёта.
    reading: scenesOn ? scenes?.length : allTexts.length,
    vocab: hasBook ? allThemes.reduce((n, x) => n + x.phrases.length, 0) : undefined,
    listening: audio.length,
    speaking: speakTotal,
  }

  const heroSubtitle =
    mode === 'vocab' && hasBook ? `${allThemes.reduce((n, x) => n + x.phrases.length, 0)} ${t('фраз')} · ${allThemes.length} ${t('ситуаций')}`
    : scenesOn ? `${sceneWorks.length} ${t('произведений')} · ${scenes?.length ?? 0} ${t(scenesWord(scenes?.length ?? 0))}`
    : mode === 'reading' ? `${allTexts.length} ${t('текстов')}`
    : mode === 'listening' ? `${audio.length} ${t('записей')}`
    : `${speakTotal} ${t('заданий')} · ${speakCounts.sent} ${t('записей')}`

  const filtersOn = fLevel.length > 0 || fTopic.length > 0 || fSkill.length > 0 || !!fLen
  const clearFilters = () => { setFLevel([]); setFTopic([]); setFSkill([]); setFLen('') }

  const rail = (
    <>
      <SubjectHero state={subjectState} subtitle={heroSubtitle} palette={palette} />

      <RailCard title="Режим" accent={palette.accent} icon={<Layers size={15} />}>
        <RailModes
          items={MODES.map(m => ({ id: m.id, label: m.label, count: modeCounts[m.id], Icon: m.Icon }))}
          value={mode}
          onChange={switchMode}
          accent={palette.accent}
          soft={palette.soft}
        />
      </RailCard>

      {/* Две половины «Чтения». Показываем переключатель только там, где сцены
          для языка вообще написаны: пустая вкладка хуже отсутствующей. */}
      {mode === 'reading' && sceneLib && (
        <RailCard title="Что читаем" accent={palette.accent} icon={<Library size={15} />}>
          <RailSegment
            options={[
              // Подписи короткие: в рейле на сегмент приходится половина его
              // ширины, и «Учебные тексты» обрезались в «Учебные тек…».
              { value: 'texts', label: 'Тексты' },
              { value: 'scenes', label: 'Сцены' },
            ]}
            value={readingView}
            onChange={v => v && switchReadingView(v as 'texts' | 'scenes')}
            accent={palette.accent}
            soft={palette.soft}
            clearable={false}
          />
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {readingView === 'scenes'
              ? t('Отрывки из книг и сериалов. У каждого — что было до сцены и чем всё кончилось.')
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

      {mode === 'vocab' && (hasBook || nestsOn) && !openItem && !openNest && (
        <>
          <RailCard title="Фильтры" accent={palette.accent} icon={<SlidersHorizontal size={15} />}
            action={shelf || fLevel.length > 0
              ? { label: t('Сбросить'), onClick: () => { setShelf(''); setFLevel([]) } }
              : undefined}>
            <RailSegment
              options={[
                ...(hasBook ? [{ value: 'sets', label: 'Наборы' }] : []),
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
          {hasBook && vocabView !== 'nests' && (
            <RailCard title="Показ" accent={palette.accent} icon={<Eye size={15} />}>
              <RailToggle label="Романизация" on={phraseView.reading}
                onChange={v => setPhraseView(s => ({ ...s, reading: v }))} accent={palette.accent} />
              <RailToggle label="Сначала перевод" on={phraseView.reverse}
                onChange={v => setPhraseView(s => ({ ...s, reverse: v }))} accent={palette.accent} />
            </RailCard>
          )}
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

      {mode === 'speaking' && (
        <RailCard
          title="Фильтры"
          accent={palette.accent}
          icon={<SlidersHorizontal size={15} />}
          action={kindFilter ? { label: t('Все'), onClick: () => setKindFilter('') } : undefined}
        >
          <RailSegment
            options={[
              { value: 'roleplay', label: 'Ролевые' },
              { value: 'story', label: 'Рассказ' },
              { value: 'aloud', label: 'Вслух' },
            ]}
            value={kindFilter}
            onChange={setKindFilter}
            accent={palette.accent}
            soft={palette.soft}
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
    </>
  )

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
          <SearchPill value={query} onChange={setQuery} placeholder={t('Автор или название…')} />
        )}
        <ToolCount>
          {openWork
            ? `${scenesOf(openWork.id).length} ${t(scenesWord(scenesOf(openWork.id).length))}`
            : `${t('Всего:')} ${visibleWorks.length}`}
        </ToolCount>
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
        <SortMenu options={SORTS_LIB} value={sort} onChange={setSort} />
        <ToolCount>{t('Всего:')} {library.length}</ToolCount>
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
        <SortMenu options={SORTS_SETS} value={sort} onChange={setSort} />
        <ToolCount>
          {visibleThemes.reduce((n, x) => n + x.phrases.length, 0)} {t('фраз')} · {visibleThemes.length} {t('тем')}
        </ToolCount>
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

  if (scenesOn) {
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
  } else {
    content = (
      <Speaking
        subjectId={subjectId}
        subject={subject}
        accent={palette.accent}
        palette={palette}
        themes={allThemes}
        query={query}
        kindFilter={kindFilter}
        status={status}
        onCounts={setSpeakCounts}
      />
    )
  }

  return (
    <TrainerShell
      rail={rail}
      toolbar={toolbar}
      narrowLead={<SubjectPill state={subjectState} palette={palette} />}
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
const TOUR_KEY = 'lang-reader-tour-v1'

/** Кнопки служебной строки на титрах: все одного роста, различаются только цветом. */
const finishChip = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 12px', borderRadius: 11, background: 'transparent',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
} as const

function Reader({ text, scene, work, accent, palette, lang, owner, subjectId, onBack }: {
  text: ReadingText
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
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [checked, setChecked] = useState(false)
  const [gloss, setGloss] = useState<string | null>(null)

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
  const [tour, setTour] = useState(false)

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
    {
      ref: audioRef,
      title: t('Послушать текст'),
      text: t('Кнопка читает текст вслух целиком. «Медленно» — тот же голос вдвое медленнее, для первого прохода.'),
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
          : `${text.level} · ${text.topic} · ${text.minutes} ${t('мин')}`}
        palette={palette}
      />

      <RailCard title="Послушать" accent={accent} icon={<Volume2 size={15} />}>
        <div ref={audioRef}>
          <AudioPlayer ttsText={text.body} lang={lang} allowSlow accent={palette.accent} soft={palette.soft} />
        </div>
      </RailCard>

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
      <ToolButton onClick={() => setTour(true)} accent={accent}>
        <HelpCircle size={14} /> {t('Подсказки')}
      </ToolButton>
      {text.credit && <ToolCount>{text.credit}</ToolCount>}
    </Toolbar>
  )

  return (
    <TrainerShell rail={rail} toolbar={toolbar}>
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

      <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
        {t('Вопросы к тексту')}
      </h2>

      <div ref={questionsRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {text.questions.map((q, qi) => (
          <QuestionCard
            key={qi}
            q={q}
            index={qi}
            value={answers[qi]}
            checked={checked}
            accent={accent}
            // Вопрос задан на изучаемом языке, и слова в нём переводятся так же,
            // как в тексте. Варианты ответа оставлены обычными: это кнопки
            // выбора, и подсказка внутри них конфликтует с нажатием.
            glossLang={glossed ? lang : undefined}
            glossExtra={text.glossary}
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

      <Coachmarks steps={steps} open={tour} onClose={closeTour} accent={accent} />
    </TrainerShell>
  )
}

function QuestionCard({ q, index, value, checked, accent, glossLang, glossExtra, onPick }: {
  q: ReadingQuestion; index: number; value?: number; checked: boolean
  accent: string; onPick: (v: number) => void
  /** Задан — формулировка вопроса тоже переводится по словам. */
  glossLang?: string
  glossExtra?: Gloss[]
}) {
  return (
    <div style={{ padding: '15px 17px', borderRadius: 18, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
      <div style={{
        display: 'flex', gap: 6, fontSize: 15, fontWeight: 650,
        color: 'var(--color-text)', marginBottom: 11,
      }}>
        <span style={{ flexShrink: 0 }}>{index + 1}.</span>
        {glossLang
          ? <GlossedText text={q.q} lang={glossLang} extra={glossExtra} accent={accent} style={{ flex: 1, minWidth: 0 }} />
          : <span style={proseWrap}>{bindShortWords(q.q)}</span>}
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
              <span style={proseWrap}>{bindShortWords(opt)}</span>
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

function Listener({ item, accent, palette, lang, onBack }: {
  item: ListeningItem
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  lang: string
  onBack: () => void
}) {
  const t = useT()
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

      <RailCard title="Запись" accent={accent} icon={<Volume2 size={15} />}>
        <AudioPlayer ttsText={item.script} lang={lang} allowSlow accent={palette.accent} soft={palette.soft} />
        <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
          {t('Слушай столько раз, сколько нужно. Расшифровка откроется после ответов.')}
        </div>
      </RailCard>

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

  return (
    <TrainerShell rail={rail} toolbar={toolbar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {item.questions.map((q, qi) => (
          <QuestionCard
            key={qi} q={q} index={qi} value={answers[qi]} checked={checked} accent={accent}
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
  kind: 'story' | 'roleplay' | 'aloud'
  title: string
  prompt: string
  seconds: number
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
function countSpeakTasks(themes: SurvivalThemeCards[]): number {
  return themes.reduce((n, x) => n + 1 + (x.phrases.length >= 5 ? 1 : 0), 0) + STORY_TASKS.length
}

function bookTasks(themes: SurvivalThemeCards[]): SpeakTask[] {
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
  story: 'Рассказ',
  roleplay: 'Ролевое',
  aloud: 'Чтение вслух',
}

function Speaking({ subjectId, subject, accent, palette, themes, query, kindFilter, status, onCounts }: {
  subjectId: string
  subject: string
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  themes: SurvivalThemeCards[]
  query: string
  kindFilter: string
  status: string
  /** Отдаёт наверх счётчики для рейла и строки — их считает этот компонент. */
  onCounts: (c: { total: number; sent: number; shown: number }) => void
}) {
  const t = useT()
  const [open, setOpen] = useState<SpeakTask | null>(null)
  const [entries, setEntries] = useState<VoiceEntry[]>([])
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const owner = useMemo(() => ownerStudentIdFor(subjectId), [subjectId])

  // Занятие в говорении — это открытое задание с диктофоном, а не список.
  useTrainerEngaged(!!open)

  const tasks = useMemo(() => [...bookTasks(themes), ...STORY_TASKS], [themes])

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
      if (kindFilter && x.kind !== kindFilter) return false
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
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{open.seconds} {t('с')}</span>
          </div>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--color-text)' }}>{t(open.prompt)}</p>
        </div>

        <VoiceRecorder value={null} onChange={handleRecorded} maxSeconds={open.seconds + 30} accent={palette.accent} />

        {sendState === 'sending' && (
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Отправляем преподавателю…')}</p>
        )}
        {sendState === 'done' && (
          <p style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600 }}>
            {t('Записано и отправлено. Преподаватель послушает и разберёт.')}
          </p>
        )}
        {sendState === 'error' && (
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
          <Tile key={x.id} accent={accent} onClick={() => { setOpen(x); setSendState('idle') }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={palette.soft}>{t(KIND_LABEL[x.kind])}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{x.seconds} {t('с')}</span>
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
