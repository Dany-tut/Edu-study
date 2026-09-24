// ─────────────────────────────────────────────────────────────────────────────
// «Материалы» — весь тренажёр витриной, отбор в правой панели
//
// ПОЧЕМУ НЕТ ВТОРОГО УРОВНЯ. Первая версия ставила рейл режимов слева и ряд
// полок сверху — две полосы навигации подряд, и только под ними контент. В
// Конструкторе так не делает ни одна вкладка: у «Курсов» одна строка фасетов, у
// «Заданий» и «Виджетов» — липкая панель справа. Режим и полка ничем не
// отличаются от уровня и раздела: это всё способы сузить список. Раз так, им
// место там же, где остальным, — в панели. Над сеткой остаются только
// сортировка, вид и счётчик.
//
// ПАНЕЛЬ — ЭТО И НАВИГАТОР. Список режимов со счётчиками никуда не делся, он
// просто переехал вправо; полки раскрываются под выбранным режимом вложенным
// списком. Одна и та же вещь перестала быть двумя.
//
// ДВА ВИДА, ПОТОМУ ЧТО МАТЕРИАЛ РАЗНЫЙ. Плитка держит четыре штуки в ряд и
// хороша для подборок с обложкой и описанием. Справочник из 85 форм плитками
// не читается — там нужна строка: уровень, название и метаданные в колонках,
// двадцать штук на экран. Переключатель стоит рядом с сортировкой — тем же
// жестом, что у «Заданий» и «Виджетов».
//
// «ВСЕ ЯЗЫКИ» — как «Все предметы» в «Курсах». Тогда материал помечается чипом
// языка, а из подвала плитки язык уходит: дублировать выбранное в шапке незачем.
//
// ЧТО МОЖНО, А ЧЕГО НЕЛЬЗЯ. Всё, кроме подборок, приезжает из кода:
// перечислить, отобрать, открыть и прочитать — да; править — нет. Вместо
// кнопки «Сохранить» чип «Из кода» и путь к файлу, который копируется по
// клику. Обещание, которого интерфейс не держит, хуже честного отказа.
//
// ПРОЧИТАТЬ — ЗНАЧИТ ЦЕЛИКОМ. Просмотрщик показывает не только объяснение, но и
// примеры, словарь, таблицы и вопросы (см. MaterialBlock): плитка, обещающая
// «8 примеров · 2 вопроса», обязана их показать.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, FileCode2, LayoutGrid, List, Search, Trash2, X, Zap,
} from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useStickyLift } from '../../lib/useStickyLift'
import { usePersistentState, clearDraft } from '../../lib/useDraft'
import { useTeacher } from '../../store/teacherStore'
import { SUBJECTS } from '../../lib/subjects'
import {
  MATERIAL_MODES, MATERIAL_FAMILIES,
  type MaterialMode, type MaterialFamily, type MaterialItem, type MaterialBlock,
} from '../../data/trainerMaterials'
import { ContentCard, CardSkeleton } from './ContentCard'
import { plural } from '../trainer/TrainerShell'
import { SortDropdown, SubjectFacet, ShelfCount, ShelfSearch, ViewSwitch, normSearch, PILL_GLASS } from './ShelfFilters'
import { cardChip } from '../../lib/pillStyles'
import TeacherSelect from './TeacherSelect'
import CardGroupsManager, { useOwnDeckCount } from './CardGroupsManager'
import Skeleton from '../Skeleton'

const MAT_COLOR = 'var(--color-peach-text)'
const MAT_BG = 'var(--color-peach-soft)'
// Задания — полка «Базы», а не своя вкладка: цвет у них её, персиковый.
// Фиолетовый достался им от вкладки, которой больше нет, и на витрине читался
// как «это откуда-то ещё». Тип различает бейдж и иконка, а не вторая палитра.
const TASK_COLOR = MAT_COLOR
const TASK_BG = MAT_BG

/**
 * Опции фасета — ПРЕДМЕТЫ, а не языки.
 *
 * Языковые схлопнуты по коду языка: «Русский» и «Литература» — разные предметы
 * с одним `langCode: 'ru'`, и материалы у них общие; двумя строками они дают
 * одну и ту же витрину. Первый выигрывает — это сам язык.
 *
 * Неязыковые (биология, химия) стоят отдельными строками за разделителем.
 * Готовых материалов у них нет — есть подборки карточек, и до этой правки их
 * нельзя было найти ниоткуда, кроме самой полки «Подборки»: фасет знал только
 * языки, и набор по биологии оставался вне любого отбора.
 */
const LANG_SUBJECTS = SUBJECTS
  .filter(s => s.isLanguage && s.langCode)
  .filter((s, i, all) => all.findIndex(x => x.langCode === s.langCode) === i)

const OTHER_SUBJECTS = SUBJECTS.filter(s => !s.isLanguage || !s.langCode)

const SUBJECT_OPTIONS = [...LANG_SUBJECTS, ...OTHER_SUBJECTS]

/** Код языка выбранного предмета. У биологии его нет — готовых полок тоже. */
const langOf = (subject: string) => SUBJECTS.find(s => s.id === subject)?.langCode ?? ''

/**
 * Какие полки бывают у предмета.
 *
 * Семь режимов — рейл ЯЗЫКОВОГО тренажёра. Биологии аудирование, говорение,
 * конструктор слов, грамматика и «о языке» не пригодятся ни завтра, ни через
 * год, а прочерк напротив каждой строки читается не как «такого тут не бывает»,
 * а как «половина базы отвалилась». Неязыковому предмету остаются «Карточки» —
 * единственное, что у него правда есть (подборки). Появится у науки своя полка
 * (тексты, записи) — строка дописывается сюда, и она сразу видна.
 */
const NON_LANG_MODES: MaterialMode[] = ['vocab']

const modesFor = (subject: string) =>
  !subject || langOf(subject)
    ? MATERIAL_MODES
    : MATERIAL_MODES.filter(m => NON_LANG_MODES.includes(m.id))

const ALL_LANGS = LANG_SUBJECTS.map(s => s.langCode!)

const langLabel = (code: string) => LANG_SUBJECTS.find(s => s.langCode === code)?.name ?? code

/**
 * Предмет витрины — общий фасет Конструктора, суженный до того, что у
 * материалов правда есть: языковые предметы схлопнуты по `langCode`
 * («Литература» и «Русский» дают одну и ту же витрину), неязыковые стоят за
 * чертой ради подборок карточек — готовых материалов у них нет.
 */
function MaterialsFacet({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT()
  return (
    <SubjectFacet
      value={value} onChange={onChange}
      only={SUBJECT_OPTIONS.map(s => s.id)}
      accent={MAT_COLOR} allLabel={t('Все предметы')}
    />
  )
}

type SortMode = 'az' | 'za' | 'size' | 'level'
const SORT_OPTS: [SortMode, string][] = [
  ['az', 'А → Я'], ['za', 'Я → А'], ['size', 'По объёму'], ['level', 'По уровню'],
]

/**
 * Псевдо-полка подборок.
 *
 * В реестре её нет и быть не должно: она одна приезжает из базы, у неё своя
 * правка, свой редактор и адресность по ученикам. Но в списке «Карточек» она
 * обязана стоять первой — это единственное, что учитель тут может не только
 * прочитать. Отдельная ветка рендера — цена за то, чтобы не притворяться, будто
 * редактируемое и нередактируемое устроены одинаково.
 */
const DECKS_ID = '__decks'

/** Материал витрины со своим происхождением: язык и полка, откуда он приехал. */
type Row = MaterialItem & { lang: string; family: MaterialFamily }

const refOf = (x: Row): MaterialRef => ({ lang: x.lang, familyId: x.family.id, id: x.id })

// Витрина по языку переживает ремоунт вкладки: без кэша каждый заход на
// «Материалы» и каждый возврат из соседнего редактора показывал скелетоны,
// которые через миг сменялись теми же карточками, — экран мигал.
const rowsCache = new Map<string, Row[]>()

// ОБНОВЛЕНИЕ СТРАНИЦЫ ОТКРЫВАЕТ БАЗУ ЦЕЛИКОМ. Отбор обязан пережить поход
// внутрь материала и обратно, но не F5: после перезагрузки человек ждёт всю
// базу, а не вчерашний срез — «корейский · карточки» прятал полторы тысячи
// материалов за одним языком, и это читалось как «остальное пропало». Тело
// модуля выполняется один раз за загрузку страницы — ровно то место, где
// «после F5» отличается от «вернулся на вкладку».
// Сортировка и вид — не отбор: они ничего не прячут, и сбрасывать их значило бы
// каждый раз заново выбирать список вместо плиток.
;['materials.family', 'materials.level', 'materials.topic', 'materials.query'].forEach(clearDraft)
try {
  localStorage.removeItem('materials-lang')
  localStorage.removeItem('materials-mode')
} catch { /* приватный режим без хранилища не должен ронять вкладку */ }

/**
 * Полка «Задания» — банк, стоящий в одном дереве с чтением и карточками.
 *
 * Банк живёт в базе, у него своя разметка (раздел → тема → часть → линия) и
 * свои действия (выдать в ДЗ, вставить в урок), поэтому его витрину и поля
 * отбора рисует страница и передаёт сюда готовыми. Витрине «Базы» он —
 * такая же полка, как «Грамматика»: строка в дереве и содержимое справа.
 */
const TASKS_ID = 'tasks'

/** Задание в общей сетке: ровно то, что видно на карточке. */
export type TaskCard = { id: number; title: string; about: string; level: string; meta: string; chip: string }

/** Полка витрины: банк заданий, режим материалов или «всё». */
type Shelf = MaterialMode | '' | typeof TASKS_ID

/** Адрес материала: по нему страница находит его сама, и он переживает F5. */
export type MaterialRef = { lang: string; familyId: string; id: string }

export default function TrainerMaterials({ createNonce = 0, subject, onSubject, tasks, onShelfChange, editMode = false, onOpen }: {
  createNonce?: number
  /**
   * Банк заданий как полка «Базы». Страница отдаёт готовыми: `count` для
   * строки дерева, `view` — витрину (со своим рядом сортировки, как у
   * подборок), `fields` — разметку под строкой, `onCreate` — что делает «+»,
   * пока открыта эта полка.
   */
  tasks?: {
    count: number
    view: React.ReactNode
    fields: React.ReactNode
    onCreate?: () => void
    /**
     * Задания для полки «Всё» — плоскими карточками, наравне с материалами.
     * Здесь они не решаются и не отмечаются: это витрина базы, и задание на ней
     * такая же строка, как текст или колода. Полноценная работа с банком (выбор,
     * правка, удаление) живёт на своей полке, в `view`.
     */
    cards?: TaskCard[]
    onOpenCard?: (id: number) => void
  }
  /**
   * Предмет витрины — ОДИН на все вкладки Конструктора, поэтому живёт в
   * странице, а не здесь. Готовые материалы (тексты, аудио, грамматика)
   * написаны на изучаемом языке и грузятся по коду языка предмета; у подборок
   * язык и предмет разошлись — набор по биологии написан по-русски, но
   * принадлежит биологии.
   */
  subject: string
  onSubject: (v: string) => void
  /**
   * Какая полка открыта — наружу, странице: правка, удаление отмеченного и
   * импорт из Google Forms касаются только заданий, и шапка обязана это знать.
   */
  onShelfChange?: (shelf: 'tasks' | 'decks' | 'materials') => void
  /** Режим правки из шапки: отметки наборов живут только в нём. */
  editMode?: boolean
  /** Материал открывается отдельной страницей — её рисует Конструктор вместо вкладок. */
  onOpen: (ref: MaterialRef) => void
}) {
  const t = useT()

  const lang = langOf(subject)
  const [mode, setMode] = useState<Shelf>(() =>
    (localStorage.getItem('materials-mode') as Shelf | null) ?? '')
  const [view, setView] = useState<'cards' | 'rows'>(() =>
    localStorage.getItem('materials-view') === 'rows' ? 'rows' : 'cards')

  const [rows, setRows] = useState<Row[]>(() => rowsCache.get(subject) ?? [])
  const [loading, setLoading] = useState(() => !rowsCache.has(subject))

  // Отбор переживает поход в материал и обратно. Страница материала встаёт
  // вместо вкладок, витрина при этом размонтируется — и в useState уровень,
  // раздел и поиск сбрасывались бы: вернулся — ищи заново.
  const [familyId, setFamilyId] = usePersistentState<string>('materials.family', DECKS_ID)
  const [sort, setSort] = usePersistentState<SortMode>('materials.sort', 'az')
  const [level, setLevel] = usePersistentState('materials.level', '')
  const [topic, setTopic] = usePersistentState('materials.topic', '')
  const [query, setQuery] = usePersistentState('materials.query', '')

  useEffect(() => { localStorage.setItem('materials-mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('materials-view', view) }, [view])

  // Всё разом: числа в панели должны встать одним движением, иначе они
  // появляются по одному и прыгают. Полка, чей чанк не доехал, отдаёт пустой
  // список и не роняет соседние — витрина без одной полки лучше пустой вкладки.
  useEffect(() => {
    let alive = true
    const cached = rowsCache.get(subject)
    if (cached) { setRows(cached); setLoading(false); return }
    setLoading(true)
    setRows([])
    // Предмет без языка (биология, химия) — готовых полок у него нет вовсе:
    // грузить нечего, и режимы честно показывают ноль вместо вечной загрузки.
    const langs = subject ? (lang ? [lang] : []) : ALL_LANGS
    void Promise.all(
      langs.flatMap(l => MATERIAL_FAMILIES.map(async f => {
        try {
          const items = await f.load(l)
          return items.map(x => ({ ...x, lang: l, family: f }))
        } catch (e) {
          console.error(`materials: ${f.id}/${l}`, e)
          return [] as Row[]
        }
      })),
    ).then(chunks => {
      if (!alive) return
      rowsCache.set(subject, chunks.flat())
      setRows(chunks.flat())
      setLoading(false)
    })
    return () => { alive = false }
  }, [subject, lang])

  // Подборки приезжают из базы, а не из кода, — в rows их нет, и без этого
  // счёта «Карточки» у биологии показывали пусто при двух лежащих наборах.
  const modes = useMemo(() => modesFor(subject), [subject])

  // Предмет сменился на неязыковой, а открыта была его полка — витрина осталась
  // бы на «Аудировании», которого в дереве больше нет: строка не подсвечена,
  // список пуст, вернуться некуда.
  useEffect(() => {
    if (!mode || mode === TASKS_ID) return
    if (!modes.some(m => m.id === mode)) setMode('')
  }, [modes, mode])

  const deckCount = useOwnDeckCount(subject, lang)
  const modeCount = (m: MaterialMode) =>
    rows.reduce((n, r) => n + (r.family.mode === m ? 1 : 0), 0) + (m === 'vocab' ? deckCount : 0)

  /** Полки выбранного режима, в которых есть материал. */
  const families = useMemo(() => {
    if (!mode) return []
    const seen = new Map<string, number>()
    for (const r of rows) if (r.family.mode === mode) seen.set(r.family.id, (seen.get(r.family.id) ?? 0) + 1)
    return MATERIAL_FAMILIES.filter(f => f.mode === mode && seen.has(f.id))
      .map(f => ({ family: f, count: seen.get(f.id)! }))
  }, [rows, mode])

  // Выбранная полка могла исчезнуть вместе со сменой режима или языка. Пустой
  // режим (у русского нет аудирования) оставляем БЕЗ полки: откат к первой из
  // списка приводил в «Подборки» — редактор карточек под вывеской «Аудирование».
  //
  // Пока витрина грузится, полок нет ни одной — и сохранённая «Формы» считалась
  // бы исчезнувшей: после F5 на незакэшированном языке отбор слетал бы в «Все».
  useEffect(() => {
    if (loading) return
    const ids = [
      '',
      ...(mode === 'vocab' ? [DECKS_ID] : []),
      ...families.map(f => f.family.id),
    ]
    if (mode === TASKS_ID) return
    if (!ids.includes(familyId)) setFamilyId(mode === 'vocab' ? DECKS_ID : '')
  }, [families, familyId, mode, loading, setFamilyId])

  const onDecks = familyId === DECKS_ID && mode === 'vocab'
  const onTasks = mode === TASKS_ID && !!tasks
  useEffect(() => {
    onShelfChange?.(onTasks ? 'tasks' : onDecks ? 'decks' : 'materials')
  }, [onTasks, onDecks, onShelfChange])

  // «+» на вкладке заводит НАБОР карточек, а набор живёт только на полке
  // «Подборки». Пока плюс просто уходил вниз, с любой другой полки (и с режима
  // «Все», который стоит по умолчанию) нажатие не делало ничего — кнопка
  // выглядела сломанной. Теперь плюс сам переводит витрину на «Подборки» и уже
  // там просит новый набор: счётчик, а не флаг, — второе нажатие подряд должно
  // открыть чистый набор поверх недописанного.
  const [deckCreate, setDeckCreate] = useState(0)
  const [pendingCreate, setPendingCreate] = useState(false)
  const seenCreate = useRef(createNonce)
  useEffect(() => {
    if (createNonce === seenCreate.current) return
    seenCreate.current = createNonce
    // «+» заводит то, что лежит на открытой полке: на заданиях — задание, на
    // подборках — набор. Полка сама знает, что она создаёт.
    if (onTasks) { tasks?.onCreate?.(); return }
    if (onDecks) { setDeckCreate(n => n + 1); return }
    setMode('vocab'); setFamilyId(DECKS_ID)
    setPendingCreate(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNonce, onDecks, onTasks, setFamilyId])
  // Полка переключилась — CardGroupsManager уже смонтирован и ловит следующий
  // номер (на монтировании он запоминает текущий и не срабатывает).
  useEffect(() => {
    if (!pendingCreate || !onDecks) return
    setPendingCreate(false)
    setDeckCreate(n => n + 1)
  }, [pendingCreate, onDecks])

  /** Материал под выбранным режимом и полкой — до фасетов и поиска. */
  const scoped = useMemo(() => rows.filter(r =>
    (!mode || r.family.mode === mode) && (!familyId || familyId === DECKS_ID || r.family.id === familyId),
  ), [rows, mode, familyId])

  const levelOpts = useMemo(
    () => [...new Set(scoped.map(x => x.level).filter((x): x is string => !!x))].sort(),
    [scoped],
  )
  const topicOpts = useMemo(
    () => [...new Set(scoped.map(x => x.topic).filter((x): x is string => !!x))].sort(),
    [scoped],
  )

  // Отбор сбрасывается при смене полки: уровень «TOPIK 2» в списке учебников
  // не значит ничего, и витрина молча оказалась бы пустой.
  // Только при СМЕНЕ: на монтировании это возврат из материала, и сохранённый
  // отбор надо показать, а не стереть.
  const shelfKey = `${mode}/${familyId}`
  const prevShelf = useRef(shelfKey)
  useEffect(() => {
    if (prevShelf.current === shelfKey) return
    prevShelf.current = shelfKey
    setLevel(''); setTopic('')
  }, [shelfKey, setLevel, setTopic])

  const shown = useMemo(() => {
    const q = normSearch(query)
    let list = scoped
    if (level) list = list.filter(x => x.level === level)
    if (topic) list = list.filter(x => x.topic === topic)
    if (q) list = list.filter(x => normSearch(x.title + ' ' + x.about).includes(q))
    const out = [...list]
    if (sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'za') out.sort((a, b) => b.title.localeCompare(a.title))
    else if (sort === 'size') out.sort((a, b) => b.size - a.size)
    else out.sort((a, b) => (a.level ?? '').localeCompare(b.level ?? '') || a.title.localeCompare(b.title))
    return out
  }, [scoped, level, topic, query, sort])

  /**
   * «Всё» — ОДИН СПИСОК НА ПРЕДМЕТ: задания вперемешку с материалами.
   *
   * Учитель ищет не «задание» и не «материал», а то, что даст ученику по
   * предмету; полки — это уточнение, а не первый вопрос. Задания попадают сюда
   * только когда не выбрана полка: внутри «Чтения» им делать нечего.
   */
  const shownTasks = useMemo(() => {
    if (mode || familyId || !tasks?.cards) return []
    const q = normSearch(query)
    let list = tasks.cards
    if (level) list = list.filter(x => x.level === level)
    if (q) list = list.filter(x => normSearch(x.title + ' ' + x.about).includes(q))
    const out = [...list]
    if (sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'za') out.sort((a, b) => b.title.localeCompare(a.title))
    return out
  }, [tasks?.cards, mode, familyId, level, query, sort])

  const totalShown = shown.length + shownTasks.length

  const dirty = !!(level || topic || query)
  const showLangChip = !lang
  const showFamilyChip = !familyId

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {onTasks ? (
          tasks.view
        ) : onDecks ? (
          <CardGroupsManager
            createNonce={deckCreate}
            lang={lang || undefined}
            subject={subject || undefined}
            facet={<MaterialsFacet value={subject} onChange={onSubject} />}
            editMode={editMode}
            query={query}
            onQuery={setQuery}
          />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SortDropdown value={sort} options={SORT_OPTS} accent={MAT_COLOR} onChange={setSort} />
              <MaterialsFacet value={subject} onChange={onSubject} />
              <ViewSwitch value={view} accent={MAT_COLOR} onChange={setView}
                options={[['cards', 'Плитками', LayoutGrid], ['rows', 'Строками', List]]} />
              <ShelfSearch value={query} onChange={setQuery} style={{ marginLeft: 'auto' }} />
              <ShelfCount style={{ marginLeft: 0 }}>{totalShown} {t(plural(totalShown, ['единица', 'единицы', 'единиц']))}</ShelfCount>
            </div>

            {loading ? (
              view === 'cards' ? (
                <div style={GRID}>{Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)}</div>
              ) : (
                <div style={ROWS_BOX}>
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} style={{ ...ROW, background: 'var(--color-bg-2)' }}>
                      <Skeleton w={54} h={14} radius={5} />
                      <Skeleton w={`${40 + (i % 4) * 12}%`} h={12} />
                    </div>
                  ))}
                </div>
              )
            ) : totalShown === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: 520 }}>
                {scoped.length > 0
                  ? t('Под отбор ничего не подошло.')
                  // У предмета без языка (биология, химия) готовых материалов не
                  // бывает вовсе — это не пробел в полке, а другой разговор:
                  // такому предмету достаются подборки карточек.
                  : subject && !lang
                    ? t('Готовых материалов у этого предмета нет — они пишутся на изучаемом языке. Что ему достаётся, лежит в «Карточках» → «Подборки».')
                    : t('У этого языка такого материала нет. Режим виден в списке, чтобы было понятно, чего не хватает, — а не потому, что за ним что-то есть.')}
              </div>
            ) : view === 'cards' ? (
              <div style={GRID}>
                {shownTasks.map(x => (
                  <ContentCard
                    key={`task-${x.id}`}
                    accentColor={TASK_COLOR} accentBg={TASK_BG}
                    isSelected={false} onClick={() => tasks?.onOpenCard?.(x.id)}
                    icon={<Zap size={17} strokeWidth={2} style={{ color: TASK_COLOR }} />}
                    iconBg={TASK_BG}
                    badge={
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span style={cardChip(TASK_COLOR)}>{t('Задание')}</span>
                        {x.level && <span style={cardChip('var(--color-text-3)')}>{x.level}</span>}
                      </div>
                    }
                    title={x.title}
                    subtitle={x.about}
                    footerLeft={<span>{x.meta}</span>}
                    footerRight={<>{x.chip}</>}
                  />
                ))}
                {shown.map(x => (
                  <ContentCard
                    key={`${x.lang}-${x.family.id}-${x.id}`}
                    accentColor={MAT_COLOR} accentBg={MAT_BG}
                    isSelected={false} onClick={() => onOpen(refOf(x))}
                    icon={<FileCode2 size={17} strokeWidth={2} style={{ color: MAT_COLOR }} />}
                    iconBg={MAT_BG}
                    badge={
                      <div style={{ display: 'flex', gap: 4 }}>
                        {showLangChip && <span style={cardChip('var(--color-text-3)')}>{langLabel(x.lang)}</span>}
                        {x.level && <span style={cardChip(MAT_COLOR)}>{x.level}</span>}
                      </div>
                    }
                    title={x.title}
                    subtitle={x.about}
                    footerLeft={<span>{x.meta}</span>}
                    footerRight={<>{showFamilyChip ? t(x.family.label) : (x.topic ?? '')}</>}
                  />
                ))}
              </div>
            ) : (
              <>
                {shownTasks.length > 0 && (
                  <div style={ROWS_BOX}>
                    {shownTasks.map(x => (
                      <button key={`task-${x.id}`} onClick={() => tasks?.onOpenCard?.(x.id)}
                        style={{ ...ROW, border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text)' }}>
                        <span style={cardChip(TASK_COLOR)}>{t('Задание')}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.title}</span>
                        <span style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>{x.chip}</span>
                      </button>
                    ))}
                  </div>
                )}
                <MaterialRows items={shown} grouped={!familyId} showLang={showLangChip} onOpen={x => onOpen(refOf(x))} />
              </>
            )}
          </>
        )}
      </div>

      <FilterPanel
        tasks={tasks && { count: tasks.count, fields: tasks.fields }}
        deckCount={deckCount}
        mode={mode} onMode={m => { setMode(m); setFamilyId(m === 'vocab' ? DECKS_ID : '') }}
        familyId={familyId} onFamily={setFamilyId}
        families={families} modeCount={modeCount} modes={modes}
        level={level} onLevel={setLevel} levelOpts={levelOpts}
        topic={topic} onTopic={setTopic} topicOpts={topicOpts}
        dirty={dirty} onReset={() => { setLevel(''); setTopic(''); setQuery('') }}
        total={rows.length + (tasks?.count ?? 0)} loading={loading}
      />
    </div>
  )
}

const GRID: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14,
}

const ROWS_BOX: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 1,
  background: 'var(--color-border-soft)',
  border: '1px solid var(--color-border-glass)', borderRadius: 14, overflow: 'hidden',
}

const ROW: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  background: 'rgba(var(--glass-rgb), 0.88)', padding: '10px 14px',
}

/**
 * Плотный список.
 *
 * Заголовки полок появляются только когда полка не выбрана: иначе они
 * повторяли бы то, что и так отмечено в панели, целой строкой на каждый экран.
 */
function MaterialRows({ items, grouped, showLang, onOpen }: {
  items: Row[]; grouped: boolean; showLang: boolean; onOpen: (x: Row) => void
}) {
  const t = useT()
  const out: React.ReactNode[] = []
  let lastFamily = ''
  for (const x of items) {
    if (grouped && x.family.id !== lastFamily) {
      lastFamily = x.family.id
      out.push(
        <div key={`h-${x.family.id}`} style={{ ...ROW, background: 'var(--color-bg-2)', padding: '7px 14px' }}>
          <span style={{
            fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            color: 'var(--color-text-3)',
          }}>
            {t(x.family.label)}
          </span>
        </div>,
      )
    }
    out.push(
      <div
        key={`${x.lang}-${x.family.id}-${x.id}`}
        onClick={() => onOpen(x)}
        style={{ ...ROW, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = MAT_BG }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--glass-rgb), 0.88)' }}
      >
        {showLang && <span style={cardChip('var(--color-text-3)')}>{langLabel(x.lang)}</span>}
        {x.level && <span style={{ ...cardChip(MAT_COLOR), minWidth: 54, textAlign: 'center' }}>{x.level}</span>}
        <span style={{
          flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {x.title}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
          {[x.topic, x.meta].filter(Boolean).join(' · ')}
        </span>
      </div>,
    )
  }
  return <div style={ROWS_BOX}>{out}</div>
}

/**
 * Панель отбора — она же навигатор.
 *
 * Порядок сверху вниз повторяет порядок вопросов: в каком режиме, на какой
 * полке, какого уровня. Язык (на подборках — предмет) стоит не здесь, а
 * таблеткой в ряду фильтров, как предмет на «Тестах» и «Курсах». Режим и полка
 * идут одним деревом: полка — это уточнение режима, а не отдельная ось.
 */
function FilterPanel({
  mode, onMode, familyId, onFamily, families, modeCount, modes, deckCount, tasks,
  level, onLevel, levelOpts, topic, onTopic, topicOpts, dirty, onReset, total, loading,
}: {
  mode: Shelf; onMode: (v: Shelf) => void
  /** Сколько наборов на «Подборках»: они из базы, в материалах их нет. */
  deckCount: number
  /** Банк как полка дерева: счёт в строке, разметка — под ней. */
  tasks?: { count: number; fields: React.ReactNode }
  familyId: string; onFamily: (v: string) => void
  families: { family: MaterialFamily; count: number }[]
  modeCount: (m: MaterialMode) => number
  /** Полки, которые вообще бывают у предмета (см. modesFor). */
  modes: typeof MATERIAL_MODES
  level: string; onLevel: (v: string) => void; levelOpts: string[]
  topic: string; onTopic: (v: string) => void; topicOpts: string[]
  dirty: boolean; onReset: () => void
  total: number; loading: boolean
}) {
  const t = useT()
  // Панель прилипшая, а прокрутка длиннее ряда — без этого поля она уезжала
  // вверх на последних пикселях листания (см. lib/useStickyLift).
  const box = useRef<HTMLDivElement>(null)
  const lift = useStickyLift(box)
  return (
    <div ref={box} style={{
      ...lift,
      width: 264, flexShrink: 0, alignSelf: 'flex-start', position: 'sticky', top: 20,
      background: 'rgba(var(--glass-rgb), 0.9)', ...PILL_GLASS,
      border: '1px solid var(--color-border-glass)', borderRadius: 18,
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)', padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search size={15} style={{ color: MAT_COLOR }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Фильтры')}</span>
      </div>

      <div>
        {/* ОДНО ДЕРЕВО НА ВСЁ, ЧТО ЕСТЬ У ПРЕДМЕТА. Задания стоят полкой рядом
            с чтением и карточками, а не на соседней вкладке: учитель ищет не
            «задание» и не «материал», а то, что даст ученику по предмету. */}
        <PanelLabel>{t('Что это')}</PanelLabel>
        <NavRow label={t('Всё')} on={!mode} onClick={() => onMode('')} />
        {tasks && (
          <div>
            <NavRow
              label={t('Задания')} title={t('Банк: то, что ученик решает и сдаёт')}
              on={mode === TASKS_ID} count={tasks.count || undefined}
              onClick={() => onMode(TASKS_ID)}
            />
            {mode === TASKS_ID && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                margin: '4px 0 6px 10px', paddingLeft: 9,
                borderLeft: '1px solid var(--color-border-soft)',
              }}>
                {tasks.fields}
              </div>
            )}
          </div>
        )}
        {modes.map(m => {
          const on = m.id === mode
          const n = modeCount(m.id)
          // Полка предмета, у которого её не бывает (тексты у биологии), не
          // исчезает: прочерк говорит «такого тут не бывает», пустота — «всё
          // пропало».
          return (
            <div key={m.id}>
              <NavRow
                label={t(m.label)} title={t(m.hint)} on={on}
                count={loading ? undefined : n || undefined}
                skeleton={loading}
                onClick={() => onMode(m.id)}
              />
              {on && (mode === 'vocab' || families.length > 0) && (
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 1,
                  margin: '2px 0 4px 10px', paddingLeft: 9,
                  borderLeft: '1px solid var(--color-border-soft)',
                }}>
                  <NavRow small label={t('Все')} on={!familyId} onClick={() => onFamily('')} />
                  {mode === 'vocab' && (
                    <NavRow small label={t('Подборки')} count={deckCount || undefined}
                      on={familyId === DECKS_ID} onClick={() => onFamily(DECKS_ID)} />
                  )}
                  {families.map(({ family, count }) => (
                    <NavRow key={family.id} small
                      label={t(family.label)} title={t(family.hint)} count={count}
                      on={familyId === family.id} onClick={() => onFamily(family.id)} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {levelOpts.length > 1 && (
        <div>
          <PanelLabel>{t('Уровень')}</PanelLabel>
          <TeacherSelect
            value={level} onChange={onLevel} placeholder={t('Все уровни')}
            accent={MAT_COLOR} accentBg={MAT_BG}
            options={levelOpts.map(o => ({ value: o, label: o }))}
          />
        </div>
      )}

      {topicOpts.length > 1 && (
        <div>
          <PanelLabel>{t('Раздел')}</PanelLabel>
          <TeacherSelect
            value={topic} onChange={onTopic} placeholder={t('Все разделы')}
            accent={MAT_COLOR} accentBg={MAT_BG}
            options={topicOpts.map(o => ({ value: o, label: o }))}
          />
        </div>
      )}

      {dirty && (
        <button onClick={onReset}
          style={{
            padding: '8px 0', borderRadius: 10, border: '1px solid var(--color-border-medium)',
            background: 'var(--color-bg-input)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            color: 'var(--color-muted)', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <Trash2 size={12} /> {t('Сбросить фильтры')}
        </button>
      )}

      <div style={{ fontSize: 11, color: 'var(--color-text-3)', textAlign: 'center', paddingTop: 2 }}>
        {loading ? t('Считаем…') : <>{total} {t(plural(total, ['единица', 'единицы', 'единиц']))} {t('в базе')}</>}
      </div>
    </div>
  )
}

function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
      color: 'var(--color-text-3)', marginBottom: 5,
    }}>
      {children}
    </div>
  )
}

/** Строка дерева «режим → полка». Число справа — сколько материала за ней. */
function NavRow({ label, title, count, on, small, skeleton, onClick }: {
  label: string; title?: string; count?: number; on: boolean
  small?: boolean; skeleton?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick} title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        padding: small ? '5px 8px' : '7px 9px', borderRadius: 9, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: small ? 12 : 12.5, fontWeight: on ? 700 : 500,
        background: on ? MAT_BG : 'transparent',
        color: on ? MAT_COLOR : 'var(--color-text-2)',
        // Кольцо фокуса — персиковым, цветом вкладки. Общий фиолетовый ринг
        // (см. *:focus-visible в index.css) вокруг персиковой строки в
        // персиковой панели читался как чужая обводка, наведённая поверх.
        // Инлайн бьёт правило из таблицы стилей, поэтому шорткат outline
        // оттуда доедет, а цвет возьмётся отсюда.
        outlineColor: MAT_COLOR,
        transition: 'all 0.14s',
      }}
      onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--color-bg-3)' }}
      onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      {/* Скелетон, а не ноль: ноль читается как «раздел пустой». */}
      {skeleton
        ? <Skeleton w={22} h={10} radius={4} />
        : count !== undefined && (
          <span style={{ fontSize: 11.5, fontWeight: 600, color: on ? MAT_COLOR : 'var(--color-text-3)' }}>{count}</span>
        )}
    </button>
  )
}

/**
 * Страница материала — отдельный экран вместо вкладок, как урок курса.
 *
 * ПОЧЕМУ СТРАНИЦА, А НЕ ПРОСМОТРЩИК В КОЛОНКЕ. Раньше материал открывался на
 * месте сетки: вкладки Конструктора висели сверху, панель фильтров справа
 * продолжала отбирать то, чего на экране уже не было (и молча закрывала
 * материал), а посмотреть соседнюю форму можно было только через «назад →
 * найти → открыть». Урок курса, тест и задание открываются своим экраном —
 * материал теперь тоже: «Назад», имя полки по центру, слева паспорт, справа
 * вся полка списком.
 *
 * СЕГМЕНТЫ ПО БЛОКАМ. Текст с сорока словами словаря и шестью вопросами одной
 * лентой — это три экрана прокрутки до вопросов. Крупные блоки (перевод,
 * словарь, таблица, вопросы) встают сегментами, как «Урок / Запись /
 * Домашки» у урока. Короткие справки («К чему клеится», «Ловушка») отдельного
 * сегмента не стоят — они дописываются к объяснению. Выбранный сегмент
 * переживает переход к соседу: читал примеры — листаешь примеры.
 *
 * СПРАВА — ПОЛКА, А НЕ ОТБОР ВИТРИНЫ. Полка грузится по адресу материала сама,
 * поэтому страница встаёт и после F5, и без витрины за спиной. Темы — группы,
 * как модули у уроков; тема открытого материала раскрыта.
 */
const shelfCache = new Map<string, Row[]>()

/** Полка из уже загруженной витрины — чтобы не ждать чанк второй раз. */
function shelfFromRows(lang: string, familyId: string): Row[] | undefined {
  for (const key of [lang, '']) {
    const list = rowsCache.get(key)?.filter(x => x.lang === lang && x.family.id === familyId)
    if (list?.length) return list
  }
  return undefined
}

type Segment = { label: string; count?: number; body?: string; blocks: MaterialBlock[] }

/** Справка короче этого дописывается к объяснению, а не встаёт сегментом. */
const SHORT_TEXT = 420

function countOf(b: MaterialBlock): number | undefined {
  if (b.kind === 'pairs') return b.rows.length
  if (b.kind === 'table') return b.rows.length
  if (b.kind === 'quiz') return b.items.length
  return undefined
}

function segmentsOf(item: Row): Segment[] {
  const lead = item.family.mode === 'reading' || item.family.mode === 'listening' ? 'Текст' : 'Объяснение'
  const segs: Segment[] = []
  if (item.body) segs.push({ label: lead, body: item.body, blocks: [] })
  for (const b of item.blocks ?? []) {
    if (b.kind === 'text' && b.text.length <= SHORT_TEXT && segs[0] && (segs[0].body || segs[0].blocks[0]?.kind === 'text')) {
      segs[0].blocks.push(b)
      continue
    }
    segs.push({ label: b.title ?? lead, count: countOf(b), blocks: [b] })
  }
  return segs
}

const pageGlass = {
  border: '1px solid var(--color-border-glass)',
  background: 'rgba(var(--glass-rgb), 0.86)',
  backdropFilter: 'blur(14px) saturate(180%)',
  WebkitBackdropFilter: 'blur(14px) saturate(180%)',
  boxShadow: 'var(--shadow-lg)',
} as const

const RAIL_CARD: React.CSSProperties = {
  background: 'rgba(var(--glass-rgb), 0.9)', ...PILL_GLASS,
  border: '1px solid var(--color-border-glass)', borderRadius: 18,
  boxShadow: 'var(--shadow-sm-page)',
}

export function MaterialPage({ target, onSwitch, onClose }: {
  target: MaterialRef
  onSwitch: (ref: MaterialRef) => void
  onClose: () => void
}) {
  const t = useT()
  const family = MATERIAL_FAMILIES.find(f => f.id === target.familyId)
  const shelfKey = `${target.lang}/${target.familyId}`

  const [shelf, setShelf] = useState<Row[] | null>(
    () => shelfCache.get(shelfKey) ?? shelfFromRows(target.lang, target.familyId) ?? null,
  )
  useEffect(() => {
    if (!family) { setShelf([]); return }
    const cached = shelfCache.get(shelfKey) ?? shelfFromRows(target.lang, target.familyId)
    if (cached) { shelfCache.set(shelfKey, cached); setShelf(cached); return }
    let alive = true
    setShelf(null)
    family.load(target.lang)
      .then(items => {
        const list = items.map(x => ({ ...x, lang: target.lang, family }))
        shelfCache.set(shelfKey, list)
        if (alive) setShelf(list)
      })
      .catch(e => {
        console.error(`material page: ${shelfKey}`, e)
        if (alive) setShelf([])
      })
    return () => { alive = false }
  }, [shelfKey, family, target.lang, target.familyId])

  /** Группы по теме; одна безымянная, если темы у полки нет или она одна. */
  const groups = useMemo(() => {
    if (!shelf) return []
    const by = new Map<string, Row[]>()
    for (const x of shelf) {
      const k = x.topic ?? ''
      const list = by.get(k)
      if (list) list.push(x)
      else by.set(k, [x])
    }
    if (by.size <= 1) return [{ name: '', items: shelf }]
    return [...by].map(([name, items]) => ({ name, items }))
  }, [shelf])
  // Номера и стрелки идут по списку в том порядке, в каком он нарисован.
  const flat = useMemo(() => groups.flatMap(g => g.items), [groups])
  const idx = flat.findIndex(x => x.id === target.id)
  const item = idx >= 0 ? flat[idx] : null

  const go = useCallback((x: Row | undefined) => {
    if (x) onSwitch({ lang: x.lang, familyId: x.family.id, id: x.id })
  }, [onSwitch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); go(flat[idx - 1]) }
      if (e.key === 'ArrowRight' && idx >= 0 && idx < flat.length - 1) { e.preventDefault(); go(flat[idx + 1]) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flat, idx, go])

  const segments = useMemo(() => (item ? segmentsOf(item) : []), [item])
  const [segLabel, setSegLabel] = usePersistentState('materials.segment', '')
  const seg = segments.find(s => s.label === segLabel) ?? segments[0]

  const docked = useTeacher(s => s.headerDocked)
  const setDocked = useTeacher(s => s.setHeaderDocked)
  useEffect(() => () => setDocked(false), [setDocked])

  // Сосед открывается с начала, а не с той высоты, где дочитан предыдущий.
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [target.id])

  const path = family ? (family.sourceOf?.(target.lang) ?? family.source) : ''
  const [copied, setCopied] = useState(false)
  const copyPath = () => {
    void navigator.clipboard?.writeText(path).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }).catch(() => {})
  }

  const shelfTitle = family ? `${t(family.label)} · ${t(langLabel(target.lang))}` : t('Материалы')

  const backBtn = (glass: boolean) => (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onClose}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '9px 16px 9px 12px', borderRadius: 999,
        ...(glass ? pageGlass : { border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)' }),
        color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', pointerEvents: 'auto',
      }}>
      <ArrowLeft size={15} strokeWidth={2} /> {t('Назад')}
    </motion.button>
  )

  return (
    <motion.div
      initial={false}
      ref={scroller}
      onScroll={e => setDocked((e.currentTarget as HTMLElement).scrollTop > 64)}
      style={{ flex: 1, height: '100vh', overflowY: 'auto', scrollbarGutter: 'stable', paddingTop: 100 }}
    >
      {/* ── Шапка, прилипшая к линии топбара ── */}
      <div className="docked-pills-row" style={{ position: 'fixed', top: 30, left: 32, right: 32, zIndex: 80, pointerEvents: 'none' }}>
        <AnimatePresence>
          {docked && (
            <motion.div
              key="material-dock"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: [0, 6, -3.5, 1.5, -0.5, 0] }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'none' }}
            >
              {backBtn(true)}
              <div style={{
                padding: '9px 16px', borderRadius: 999, ...pageGlass, fontSize: 14, fontWeight: 700,
                color: 'var(--color-text)', pointerEvents: 'auto', minWidth: 0, maxWidth: 280,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {item?.title ?? shelfTitle}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Шапка в потоке: назад · полка · источник ── */}
      <motion.div
        animate={{ opacity: docked ? 0 : 1 }} transition={{ duration: 0.2 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12, padding: '10px 24px 20px' }}
      >
        <div>{backBtn(false)}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {shelfTitle}
        </div>
        {/* Вместо «Сохранить» — честное «Из кода» и путь к файлу, по которому
            материал правится; копируется по клику. */}
        {family && (
          <button
            onClick={copyPath}
            title={t('Скопировать путь к файлу')}
            style={{
              justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0,
              padding: '8px 14px', borderRadius: 999, border: '1px solid var(--color-border-soft)',
              background: 'rgba(var(--glass-rgb), 0.96)', cursor: 'pointer', fontFamily: 'inherit',
              color: 'var(--color-text-2)',
            }}
          >
            <span style={cardChip(MAT_COLOR)}>{t('Из кода')}</span>
            <span style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 12, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260,
            }}>
              {copied ? t('Путь скопирован') : path}
            </span>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        )}
      </motion.div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, padding: '0 24px 48px' }}>
        {/* ── Слева: паспорт ── */}
        <div style={{ ...RAIL_CARD, width: 300, flexShrink: 0, position: 'sticky', top: 20, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {item ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <PassportRow label={t('Язык')} value={t(langLabel(item.lang))} />
                <PassportRow label={t('Полка')} value={t(item.family.label)} />
                {item.level && <PassportRow label={t('Уровень')} value={item.level} accent />}
                {item.topic && <PassportRow label={t('Тема')} value={item.topic} />}
                <PassportRow label={t('Объём')} value={item.meta} />
              </div>
              {item.body && item.about && item.about !== item.body.slice(0, item.about.length) && (
                <div style={{ fontSize: 12.5, color: 'var(--color-text-2)', lineHeight: 1.5 }}>{item.about}</div>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5, borderTop: '1px solid var(--color-border-soft)', paddingTop: 12 }}>
                {t(item.family.hint)}
              </div>
              {flat.length > 1 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <StepBtn disabled={idx <= 0} onClick={() => go(flat[idx - 1])}>
                    <ChevronLeft size={14} /> {t('Предыдущий')}
                  </StepBtn>
                  <StepBtn disabled={idx >= flat.length - 1} onClick={() => go(flat[idx + 1])}>
                    {t('Следующий')} <ChevronRight size={14} />
                  </StepBtn>
                </div>
              )}
            </>
          ) : (
            <>
              <Skeleton w="60%" h={12} />
              <Skeleton w="80%" h={12} />
              <Skeleton w="45%" h={12} />
            </>
          )}
        </div>

        {/* ── По центру: материал сегментами ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shelf === null ? (
            <div style={{ ...RAIL_CARD, padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Skeleton w="50%" h={16} />
              <Skeleton w="90%" h={12} />
              <Skeleton w="85%" h={12} />
              <Skeleton w="70%" h={12} />
            </div>
          ) : !item ? (
            <div style={{ ...RAIL_CARD, padding: 24, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
              {t('Материала с таким адресом нет — возможно, его убрали или переименовали в коде.')}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.35, padding: '0 4px' }}>
                {idx + 1}. {item.title}
              </div>

              {segments.length > 1 && (
                <div style={{ ...RAIL_CARD, borderRadius: 14, padding: 4, display: 'flex', gap: 2 }}>
                  {segments.map(s => {
                    const active = s === seg
                    return (
                      <button key={s.label} onClick={() => setSegLabel(s.label)} onMouseDown={e => e.preventDefault()}
                        style={{
                          position: 'relative', flex: 1, padding: '7px 10px', borderRadius: 10,
                          border: 'none', cursor: 'pointer', background: 'transparent',
                          color: active ? MAT_COLOR : 'var(--color-text)',
                          fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'color 0.2s',
                          outlineColor: MAT_COLOR,
                        }}>
                        {active && (
                          <motion.span
                            layoutId="materialSegmentPill"
                            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                            style={{ position: 'absolute', inset: 0, borderRadius: 10, background: MAT_BG, border: `1.5px solid ${MAT_COLOR}` }}
                          />
                        )}
                        <span style={{ position: 'relative', zIndex: 1, whiteSpace: 'nowrap' }}>
                          {t(s.label)}
                          {s.count !== undefined && (
                            <span style={{ marginLeft: 6, fontSize: 11.5, color: active ? MAT_COLOR : 'var(--color-text-3)' }}>{s.count}</span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {seg ? (
                <div key={`${item.id}-${seg.label}`} style={{ ...RAIL_CARD, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {seg.body && <div style={PROSE}>{seg.body}</div>}
                  {seg.blocks.map((b, i) => (
                    // Заголовок блока уже написан на сегменте — второй раз его не повторяем.
                    <BlockView key={i} block={i === 0 && !seg.body && segments.length > 1 ? { ...b, title: undefined } : b} />
                  ))}
                </div>
              ) : (
                <div style={{ ...RAIL_CARD, padding: 20, fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                  {item.about || t('У этого материала нет текста — он собирается в тренажёре из своих частей.')}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Справа: вся полка ── */}
        <ShelfRail groups={groups} flat={flat} loading={shelf === null} current={item} onPick={go} />
      </div>
    </motion.div>
  )
}

function PassportRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 12.5 }}>
      <span style={{ width: 70, flexShrink: 0, color: 'var(--color-text-3)' }}>{label}</span>
      <span style={{ minWidth: 0, fontWeight: 600, color: accent ? MAT_COLOR : 'var(--color-text)', lineHeight: 1.35 }}>{value}</span>
    </div>
  )
}

function StepBtn({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        padding: '8px 0', borderRadius: 10, border: '1px solid var(--color-border-soft)',
        background: 'var(--color-bg-2)', color: disabled ? 'var(--color-text-3)' : 'var(--color-text-2)',
        opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
        fontSize: 12, fontWeight: 600, fontFamily: 'inherit', outlineColor: MAT_COLOR,
      }}>
      {children}
    </button>
  )
}

/** Список полки: группы по теме раскрываются, открытый материал подсвечен и виден. */
function ShelfRail({ groups, flat, loading, current, onPick }: {
  groups: { name: string; items: Row[] }[]
  flat: Row[]
  loading: boolean
  current: Row | null
  onPick: (x: Row) => void
}) {
  const t = useT()
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(current ? [current.topic ?? ''] : []))
  // Сосед из другой темы раскрывает свою группу — иначе подсветка пряталась бы в свёрнутой.
  const curTopic = current ? current.topic ?? '' : null
  useEffect(() => {
    if (curTopic === null) return
    setOpenGroups(prev => (prev.has(curTopic) ? prev : new Set(prev).add(curTopic)))
  }, [curTopic])

  const list = useRef<HTMLDivElement>(null)
  // Открытый материал держим в поле зрения списка, не трогая прокрутку страницы.
  useEffect(() => {
    const box = list.current
    const row = box?.querySelector<HTMLElement>('[data-current="1"]')
    if (!box || !row) return
    const top = row.offsetTop - box.offsetTop
    if (top < box.scrollTop) box.scrollTop = top - 8
    else if (top + row.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = top + row.offsetHeight - box.clientHeight + 8
  }, [current?.id, openGroups])

  let n = 0
  const numberOf = new Map(flat.map(x => [x.id, ++n]))

  return (
    <div style={{
      ...RAIL_CARD, width: 300, flexShrink: 0, position: 'sticky', top: 20,
      maxHeight: 'calc(100vh - 154px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '16px 18px 10px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{t('Полка')}</span>
        <span style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>{loading ? '' : `${flat.length} ${t('шт.')}`}</span>
      </div>
      <div ref={list} style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: 8, position: 'relative' }}>
        {loading ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px' }}>
              <Skeleton w={22} h={22} radius={6} />
              <Skeleton w={`${50 + (i % 3) * 15}%`} h={11} />
            </div>
          ))
        ) : groups.map(g => {
          const named = groups.length > 1
          const open = !named || openGroups.has(g.name)
          return (
            <div key={g.name || '_'}>
              {named && (
                <button
                  onClick={() => setOpenGroups(prev => {
                    const next = new Set(prev)
                    if (next.has(g.name)) next.delete(g.name)
                    else next.add(g.name)
                    return next
                  })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '8px 10px',
                    border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 13, fontWeight: 700, color: 'var(--color-text)', borderRadius: 9, outlineColor: MAT_COLOR,
                  }}
                >
                  {open ? <ChevronDown size={14} style={{ color: 'var(--color-text-3)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-text-3)' }} />}
                  <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name || t('Без темы')}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-3)' }}>{g.items.length}</span>
                </button>
              )}
              {open && g.items.map(x => {
                const on = x.id === current?.id
                return (
                  <button
                    key={x.id}
                    data-current={on ? '1' : undefined}
                    onClick={() => onPick(x)}
                    title={x.title}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                      padding: '7px 10px', marginLeft: named ? 6 : 0, maxWidth: named ? 'calc(100% - 6px)' : '100%',
                      borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      background: on ? MAT_BG : 'transparent', outlineColor: MAT_COLOR,
                    }}
                    onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--color-bg-3)' }}
                    onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span style={{
                      minWidth: 22, height: 22, padding: '0 4px', borderRadius: 6, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                      background: on ? 'transparent' : 'var(--color-bg-3)',
                      border: on ? `1.5px solid ${MAT_COLOR}` : '1.5px solid transparent',
                      color: on ? MAT_COLOR : 'var(--color-text-3)',
                    }}>
                      {numberOf.get(x.id)}
                    </span>
                    <span style={{
                      flex: 1, minWidth: 0, textAlign: 'left', fontSize: 13, fontWeight: 600,
                      color: on ? MAT_COLOR : 'var(--color-text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {x.title}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Проза: читаемая строка, а не строка во всю ширину кабинета. */
const PROSE: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)',
  whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '68ch',
}

const BLOCK_TITLE: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
  color: 'var(--color-text-3)',
}

/** Кусок материала. Один компонент на четыре вида — их и есть четыре. */
function BlockView({ block }: { block: MaterialBlock }) {
  const t = useT()
  const head = block.title
    ? <div style={BLOCK_TITLE}>{t(block.title)}</div>
    : null

  if (block.kind === 'text') {
    const warn = block.tone === 'warn'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {head}
        <div style={{
          ...PROSE,
          ...(warn ? {
            padding: '10px 14px', borderRadius: 12,
            background: MAT_BG, color: 'var(--color-text)',
            borderLeft: `2px solid ${MAT_COLOR}`,
          } : null),
        }}>
          {block.text}
        </div>
      </div>
    )
  }

  if (block.kind === 'pairs') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {head}
        <div style={{
          display: 'grid', gap: 8,
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        }}>
          {block.rows.map((r, i) => (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', gap: 2,
              padding: '9px 12px', borderRadius: 12,
              background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
            }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)' }}>{r.term}</div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-2)' }}>{r.ru}</div>
              {/* Подпись примера — то, ради чего он и написан: когда так говорят. */}
              {r.note && <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>{r.note}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (block.kind === 'table') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {head}
        {/* Таблица шире колонки прокручивается внутри себя, а не тянет страницу. */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%' }}>
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th key={i} style={{
                    textAlign: 'left', padding: '7px 12px', whiteSpace: 'nowrap',
                    fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)',
                    borderBottom: '1px solid var(--color-border-soft)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: '7px 12px', color: j === 0 ? 'var(--color-text)' : 'var(--color-text-2)',
                      fontWeight: j === 0 ? 600 : 400,
                      borderBottom: '1px solid var(--color-border-soft)',
                    }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {head}
      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {block.items.map((q, i) => (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', gap: 6,
            padding: '11px 14px', borderRadius: 14,
            background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.5 }}>{q.q}</div>
            {/* Учителю нужен ключ: он смотрит материал, а не проходит его. */}
            {q.options.map((o, j) => (
              <div key={j} style={{
                display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12.5,
                color: j === q.answer ? MAT_COLOR : 'var(--color-text-2)',
                fontWeight: j === q.answer ? 600 : 400,
              }}>
                <span style={{ width: 10 }}>{j === q.answer ? '✓' : '·'}</span>
                <span>{o}</span>
              </div>
            ))}
            {q.why && (
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>{q.why}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
