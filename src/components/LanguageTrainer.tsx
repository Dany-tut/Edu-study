import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Headphones, Layers, Mic, ChevronLeft, CheckCircle2, XCircle, HelpCircle, SlidersHorizontal, Eye, Sparkle, Volume2, ListChecks } from 'lucide-react'
import { textsForLang, type ReadingText, type ReadingQuestion, type Gloss } from '../data/readingLibrary'
import { languageTaxonomy } from '../data/languageTaxonomy'
import { listeningForLang, type ListeningItem } from '../data/listeningLibrary'
import AudioPlayer from './AudioPlayer'
import { subjectTheme } from '../lib/theme'
import { useT } from '../lib/i18n'
import { bindShortWords, proseWrap } from '../lib/typography'
import CardDeck from './CardDeck'
import PhraseDecks, {
  ThemeSession, BackToSets, TakeWholeTheme, DeckHint, themeProgress, inDeckCount,
  type PhraseView, type RunMode,
} from './PhraseDecks'
import TrainerShell, {
  RailHero, RailCard, RailModes, RailSegment, RailList, RailToggle, RailStat,
  Toolbar, SearchPill, StatusTabs, ToolButton, SortMenu, ToolCount,
  Tile, TileGrid, TileMeter, TileChip, Empty as ShellEmpty,
} from './trainer/TrainerShell'
import MultiSelectField from './MultiSelectField'
import { addCards, deckOwner, dueCount, knownPrompts } from '../data/reviewDeck'
import { hasSurvivalBook, loadSurvivalBook } from '../data/survivalBooks'
import { survivalShelves, type SurvivalBook, type SurvivalThemeCards } from '../data/survivalPhrases'
import { allResults, resultFrom, saveResult, type MaterialKind } from '../lib/trainerProgress'
import VoiceRecorder from './VoiceRecorder'
import GlossedText from './GlossedText'
import Coachmarks, { type CoachStep } from './Coachmarks'
import Skeleton from './Skeleton'
import { hasLexicon } from '../lib/lexicon'
import { submitTrainerVoice, countTrainerVoice } from '../lib/trainerSpeaking'
import { ownerStudentIdFor, subjectAliases, useStudentData } from '../store/studentDataStore'

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

export default function LanguageTrainer({ lang, subject, subjectId, dark }: {
  /** Код изучаемого языка: en, ko, ja, pt-BR. */
  lang: string
  /** Русское название предмета — для палитры. */
  subject: string
  /** Слаг предмета — по нему берётся владелец колоды повторений. */
  subjectId: string
  dark: boolean
}) {
  const t = useT()
  const palette = subjectTheme(subject, dark)
  const [mode, setMode] = useState<Mode>('reading')
  const [openText, setOpenText] = useState<ReadingText | null>(null)
  const [openAudio, setOpenAudio] = useState<ListeningItem | null>(null)

  const allTexts = useMemo(() => textsForLang(lang), [lang])

  const audio = useMemo(() => listeningForLang(lang), [lang])

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

  // Смена режима сбрасывает выборку: фильтры у режимов разные, и «Уровень B1»,
  // унесённый из чтения в аудирование, молча прячет половину записей.
  function switchMode(m: Mode) {
    setMode(m)
    setFLevel([]); setFSkill([]); setFTopic([]); setFLen('')
    setQuery(''); setStatus(''); setSort('order')
  }

  // Результаты по материалам — из localStorage, см. lib/trainerProgress.ts.
  // Читаются один раз на отрисовку списка, а не на каждую карточку.
  const [resultsKey, setResultsKey] = useState(0)
  const results = useMemo(() => allResults(), [resultsKey])

  const isLang = mode === 'reading' || mode === 'listening'
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
  const [vocabView, setVocabView] = useState<'due' | 'sets'>(() => hasBook ? 'sets' : 'due')
  const [due, setDue] = useState(0)

  useEffect(() => {
    setVocabView(hasBook ? 'sets' : 'due')
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
  const [known, setKnown] = useState<Set<string>>(() => new Set())
  const [knownKey, setKnownKey] = useState(0)
  const [shelf, setShelf] = useState('')
  const [openTheme, setOpenTheme] = useState<string | null>(null)
  const [run, setRun] = useState<RunMode>('swipe')
  const [phraseView, setPhraseView] = useState<PhraseView>({ reading: true, reverse: false })

  useEffect(() => {
    if (!hasBook) { setBook(null); return }
    let alive = true
    setBook(undefined)
    loadSurvivalBook(lang).then(b => { if (alive) setBook(b ?? null) })
    return () => { alive = false }
  }, [hasBook, lang])

  // Что из разговорника уже в колоде — по одному запросу на экран, а не на тему.
  useEffect(() => {
    let alive = true
    knownPrompts(owner, deckSubjects)
      .then(s => { if (alive) setKnown(s) })
      .catch(() => { /* прогресс — не повод ронять вкладку */ })
    return () => { alive = false }
  }, [owner, deckSubjects, knownKey])

  const shelves = useMemo(() => survivalShelves(book ?? undefined), [book])
  const allThemes = useMemo(() => shelves.flatMap(s => s.themes), [shelves])
  const openItem = useMemo(
    () => allThemes.find(x => x.theme.id === openTheme) ?? null,
    [allThemes, openTheme],
  )

  /** Темы под текущей полкой, поиском, статусом и сортировкой. */
  const visibleThemes = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Поиск идёт по всем полкам и молча снимает выбор слева: человек, который
    // ищет «аптеку», не должен ещё и угадывать, в каком она разделе.
    const base = q
      ? allThemes
      : (shelf ? (shelves.find(s => s.title === shelf)?.themes ?? []) : allThemes)

    const out = base.filter(x => {
      if (q && !`${x.theme.title} ${x.theme.vocabTheme} ${x.theme.goal}`.toLowerCase().includes(q)) return false
      const pct = themeProgress(x, known)
      if (status === 'new' && pct > 0) return false
      if (status === 'wip' && (pct === 0 || pct >= 100)) return false
      if (status === 'done' && pct < 100) return false
      return true
    })
    if (sort === 'size') out.sort((a, b) => b.phrases.length - a.phrases.length)
    if (sort === 'progress') out.sort((a, b) => themeProgress(b, known) - themeProgress(a, known))
    return out
  }, [allThemes, shelves, shelf, query, status, sort, known])
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

  if (openText) {
    return (
      <Reader
        text={openText}
        accent={palette.accent}
        palette={palette}
        lang={lang}
        owner={owner}
        subjectId={subjectId}
        onBack={() => { setOpenText(null); setResultsKey(k => k + 1) }}
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
        onBack={() => { setOpenAudio(null); setResultsKey(k => k + 1) }}
      />
    )
  }

  // ── Рейл ───────────────────────────────────────────────────────────────────
  //
  // Собирается здесь целиком, а не по кускам из режимов: рейл общий, и если
  // каждый режим дорисовывал бы в него свою часть, при переключении половина
  // колонки перерисовывалась бы из другого места.

  const modeCounts: Record<Mode, number | undefined> = {
    reading: allTexts.length,
    vocab: hasBook ? allThemes.reduce((n, x) => n + x.phrases.length, 0) : undefined,
    listening: audio.length,
    speaking: SPEAKING_PROMPTS.length,
  }

  const heroSubtitle =
    mode === 'vocab' && hasBook ? `${allThemes.reduce((n, x) => n + x.phrases.length, 0)} ${t('фраз')} · ${allThemes.length} ${t('ситуаций')}`
    : mode === 'reading' ? `${allTexts.length} ${t('текстов')}`
    : mode === 'listening' ? `${audio.length} ${t('записей')}`
    : `${SPEAKING_PROMPTS.length} ${t('заданий')}`

  const filtersOn = fLevel.length > 0 || fTopic.length > 0 || fSkill.length > 0 || !!fLen
  const clearFilters = () => { setFLevel([]); setFTopic([]); setFSkill([]); setFLen('') }

  const rail = (
    <>
      <RailHero title={subject} subtitle={heroSubtitle} palette={palette} />

      <RailCard title="Режим" accent={palette.accent} icon={<Layers size={15} />}>
        <RailModes
          items={MODES.map(m => ({ id: m.id, label: m.label, count: modeCounts[m.id], Icon: m.Icon }))}
          value={mode}
          onChange={switchMode}
          accent={palette.accent}
          soft={palette.soft}
        />
      </RailCard>

      {isLang && (
        <RailCard
          title="Фильтры"
          accent={palette.accent}
          icon={<SlidersHorizontal size={15} />}
          action={filtersOn ? { label: t('Сбросить'), onClick: clearFilters } : undefined}
        >
          {levelOpts.length > 1 && (
            <MultiSelectField label={t('Уровень')} options={levelOpts} values={fLevel} onChange={setFLevel}
              accent={palette.accent} accentBg={palette.soft} small />
          )}
          {topicOpts.length > 1 && (
            <MultiSelectField label={t('Тема')} options={topicOpts} values={fTopic} onChange={setFTopic}
              accent={palette.accent} accentBg={palette.soft} small />
          )}
          {mode === 'reading' && skillOpts.length > 1 && (
            <MultiSelectField label={t('Навык')} options={skillOpts} values={fSkill} onChange={setFSkill}
              accent={palette.accent} accentBg={palette.soft} small />
          )}
          <RailSegment options={LENGTHS.map(l => ({ value: l.value, label: l.label }))}
            value={fLen} onChange={setFLen} accent={palette.accent} soft={palette.soft} />
        </RailCard>
      )}

      {mode === 'vocab' && hasBook && !openItem && (
        <>
          <RailCard title="Фильтры" accent={palette.accent} icon={<SlidersHorizontal size={15} />}
            action={shelf ? { label: t('Все полки'), onClick: () => setShelf('') } : undefined}>
            <RailSegment
              options={[
                { value: 'sets', label: 'Наборы' },
                { value: 'due', label: 'Повторение', badge: due },
              ]}
              value={vocabView}
              onChange={v => v && setVocabView(v as 'due' | 'sets')}
              accent={palette.accent}
              soft={palette.soft}
              clearable={false}
            />
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
            <RailStat label="Фраз в теме" value={openItem.phrases.length} />
            <RailStat label="Уже в колоде" value={inDeckCount(openItem, known)} tone="good" />
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

      {mode === 'vocab' && !hasBook && (
        <RailCard title="Колода" accent={palette.accent} icon={<Layers size={15} />}>
          <RailStat label="На сегодня" value={due} tone={due > 0 ? 'warn' : undefined} />
          <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {t('Разговорника для этого языка пока нет — колода набирается из уроков и ошибок.')}
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
    { value: 'size', label: 'По размеру' },
    { value: 'progress', label: 'По прогрессу' },
  ]

  let toolbar: React.ReactNode = null
  if (isLang) {
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
        />
        <SortMenu options={SORTS_LIB} value={sort} onChange={setSort} />
        <ToolCount>{t('Всего:')} {library.length}</ToolCount>
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
        />
        <SortMenu options={SORTS_SETS} value={sort} onChange={setSort} />
        <ToolCount>
          {visibleThemes.reduce((n, x) => n + x.phrases.length, 0)} {t('фраз')} · {visibleThemes.length} {t('тем')}
        </ToolCount>
      </Toolbar>
    )
  } else if (mode === 'vocab' && openItem) {
    toolbar = (
      <Toolbar>
        <BackToSets onBack={() => setOpenTheme(null)} />
        <StatusTabs
          options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
          value={run}
          onChange={v => setRun(v as RunMode)}
        />
        <ToolCount>{t(openItem.theme.title)}</ToolCount>
      </Toolbar>
    )
  }

  // ── Содержимое ─────────────────────────────────────────────────────────────

  let content: React.ReactNode = null

  if (isLang) {
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
              onClick={() => (mode === 'listening' ? setOpenAudio(x as ListeningItem) : setOpenText(x as ReadingText))}
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
          known={known}
          accent={palette.accent}
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
                  padding: '10px 18px', borderRadius: 999, cursor: seeding ? 'default' : 'pointer',
                  border: `1.5px solid ${palette.accent}`, background: 'transparent', color: palette.accent,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
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
    content = <Speaking subjectId={subjectId} subject={subject} accent={palette.accent} />
  }

  return <TrainerShell rail={rail} toolbar={toolbar}>{content}</TrainerShell>
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

function Empty({ text }: { text: string }) {
  return (
    <div style={{
      padding: '34px 22px', borderRadius: 18, textAlign: 'center',
      border: '1px dashed var(--color-border-medium)', background: 'var(--color-bg-2)',
      fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)',
    }}>
      {text}
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

function Reader({ text, accent, palette, lang, owner, subjectId, onBack }: {
  text: ReadingText
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
      <RailHero plain title={text.title} subtitle={`${text.level} · ${text.topic} · ${text.minutes} ${t('мин')}`} palette={palette} />

      <RailCard title="Послушать" accent={accent} icon={<Volume2 size={15} />}>
        <div ref={audioRef}>
          <AudioPlayer ttsText={text.body} lang={lang} allowSlow />
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
        <div style={{
          padding: '16px 18px', borderRadius: 18, textAlign: 'center',
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>
            {correctCount} / {text.questions.length}
          </div>
          {/* Перевод открывается только после проверки: иначе читать оригинал незачем. */}
          {text.translation && (
            <details style={{ marginTop: 10, textAlign: 'left' }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: accent }}>
                {t('Перевод текста')}
              </summary>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-2)', marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {text.translation}
              </div>
            </details>
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
        <AudioPlayer ttsText={item.script} lang={lang} allowSlow />
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
              {item.glossary.map(g => (
                <span key={g.term} style={{
                  padding: '5px 10px', borderRadius: 999, fontSize: 12.5,
                  background: 'var(--color-bg-3)', color: 'var(--color-text-2)',
                }}>
                  {g.term} — {g.ru}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </TrainerShell>
  )
}

// ─── Говорение ───────────────────────────────────────────────────────────────

// Набор заданий намеренно маленький и постоянный: смысл режима в том, чтобы
// записывать ОДНО И ТО ЖЕ раз в месяц и слышать собственный прогресс. Изнутри
// он не слышен вообще, а на двух записях подряд очевиден за десять секунд.
const SPEAKING_PROMPTS = [
  'Расскажи о себе: имя, чем занимаешься, зачем учишь язык. Минута.',
  'Опиши свой обычный день с утра до вечера.',
  'Расскажи о месте, где ты вырос. Что там было хорошего?',
  'Что ты делал на прошлых выходных? Используй прошедшее время.',
  'Какие у тебя планы на ближайший год?',
]

function Speaking({ subjectId, subject, accent }: {
  subjectId: string; subject: string; accent: string
}) {
  const t = useT()
  const [promptIdx, setPromptIdx] = useState(0)
  const [sent, setSent] = useState(0)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const owner = useMemo(() => ownerStudentIdFor(subjectId), [subjectId])

  useEffect(() => {
    let alive = true
    countTrainerVoice(owner, subjectId)
      .then(n => { if (alive) setSent(n) })
      .catch(() => {})
    return () => { alive = false }
  }, [owner, subjectId])

  async function handleRecorded(path: string | null) {
    if (!path) return
    setStatus('sending')
    try {
      await submitTrainerVoice(owner, subjectId, subject, path, SPEAKING_PROMPTS[promptIdx])
      setSent(n => n + 1)
      setStatus('done')
    } catch (e) {
      console.error('submitTrainerVoice:', e)
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: '16px 18px', borderRadius: 18,
        background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
      }}>
        <p style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--color-text-3)', marginBottom: 8 }}>
          {t('Задание')}
        </p>
        <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--color-text)' }}>
          {t(SPEAKING_PROMPTS[promptIdx])}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {SPEAKING_PROMPTS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setPromptIdx(i); setStatus('idle') }}
            style={{
              width: 30, height: 30, borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 700,
              border: `1px solid ${i === promptIdx ? accent : 'var(--color-border-soft)'}`,
              background: i === promptIdx ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
              color: i === promptIdx ? accent : 'var(--color-text-3)',
            }}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <VoiceRecorder value={null} onChange={handleRecorded} maxSeconds={120} />

      {status === 'sending' && (
        <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Отправляем преподавателю…')}</p>
      )}
      {status === 'done' && (
        <p style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600 }}>
          {t('Записано и отправлено. Преподаватель послушает и разберёт.')}
        </p>
      )}
      {status === 'error' && (
        <p style={{ fontSize: 13, color: 'var(--color-red-text)', fontWeight: 600 }}>
          {t('Не получилось отправить. Проверь связь и попробуй ещё раз.')}
        </p>
      )}

      <p style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.6 }}>
        {sent > 0
          ? `${t('Отправлено записей:')} ${sent}. ${t('Запиши то же задание через месяц и послушай обе подряд — прогресс изнутри не слышен, а на записи заметен сразу.')}`
          : t('Записи не стираются: можно вернуться к тому же заданию через месяц и сравнить себя с собой.')}
      </p>
    </div>
  )
}
