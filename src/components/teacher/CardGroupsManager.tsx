// ─────────────────────────────────────────────────────────────────────────────
// Наборы карточек — вкладка Конструктора
//
// ЧТО ЗДЕСЬ ДЕЛАЮТ. Заводят набор — стопку карточек: слово, перевод, пояснение,
// метка серии. Ученик видит набор витриной в тренажёре, во вкладке «Карточки»
// («Подборки»), и проходит его с расписанием повторений.
//
// ЕДИНИЦА — НАБОР, А НЕ ГРУППА. Раньше первым шагом было «завести группу», и
// человек, которому нужны двадцать слов с урока, упирался в требование
// придумать имя полке, которой у него в голове нет. Теперь «плюс» на вкладке
// открывает пустой НАБОР — тот же жест, что на «Курсах» и «Заданиях», — и
// отдельной кнопки «Новая группа» здесь нет.
//
// ГРУППА ПОЯВЛЯЕТСЯ ИЗ НАБОРОВ. Когда наборов стало много, их отмечают в списке
// и складывают на полку одним «Сгруппировать» с именем: полка — это ответ на
// уже возникшую тесноту, а не форма, которую заполняют авансом. Обратный ход
// («Вынуть с полки») тоже есть — иначе группировка была бы дорогой в один
// конец. Технически одиночный набор всё равно лежит в группе, но БЕЗ ИМЕНИ, и
// такая группа нигде не показывается (см. isShelf в lib/cardGroups).
//
// ВВОД БЫВАЕТ ДВУХ ВИДОВ, И ОБА НУЖНЫ.
//   • Построчный — форма «слово / перевод / пояснение / серия»: так добавляют
//     одну карточку по ходу дела.
//   • Пачкой — вставка из буфера: «слово — перевод» по строке. Двадцать слов из
//     конспекта иначе вбиваются двадцатью нажатиями «Добавить», и на третьем
//     учитель закрывает вкладку. Разделителем считается тире, дефис или
//     табуляция — то, во что превращается любая таблица при копировании.
//
// СИД НЕ ПРАВИТСЯ НА МЕСТЕ. Подборки, приезжающие с кодом (data/cardGroupSeeds),
// показаны отдельной полосой и с одной кнопкой — «Забрать себе»: копия уезжает
// в базу под учителя, и дальше это его полка. Правка сида на месте жила бы до
// следующего деплоя и молча пропадала.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronDown, Layers, Copy, Users, Pencil, FolderInput, X, Globe } from 'lucide-react'
import { useT, useTc } from '../../lib/i18n'
import { plural } from '../trainer/TrainerShell'
import { getOwnerId } from '../../lib/owner'
import { useTeacher } from '../../store/teacherStore'
import { useAllStudents } from '../../lib/useGroups'
import { SUBJECTS } from '../../lib/subjects'
import {
  fetchOwnCardGroups, deleteCardGroup, deleteCardSet,
  groupSets, moveSetsToGroup, ungroupSets, isShelf,
  type CardGroup, type CardSet, type CardSubset, type SetCard,
} from '../../lib/cardGroups'
import { hasCardSeeds, loadCardSeeds } from '../../data/cardGroupSeeds'
import { SURVIVAL_LEVELS, type SurvivalLevel } from '../../data/survivalPhrases'
import GrowTextarea from '../GrowTextarea'
import Checkbox from '../Checkbox'
import CardImportPanel, { type ImportedGroup, type ImportMeta } from '../CardImportPanel'
import TeacherSelect from './TeacherSelect'
import MultiSelectField from '../MultiSelectField'
import { confirmDialog } from '../ConfirmHost'
import { ContentCard, CardSkeleton } from './ContentCard'
import { SortDropdown, FacetDropdown, ShelfCount, ShelfSearch, normSearch } from './ShelfFilters'
import { cardChip } from '../../lib/pillStyles'
import { guessLang } from '../../lib/guessLang'

/** Языки, на которых вообще бывает тренажёр, — по реестру предметов. */
const LANG_OPTIONS = SUBJECTS
  .filter(s => s.isLanguage && s.langCode)
  // Дедуп по коду языка: «Русский» и «Литература» — разные предметы с одним
  // `langCode: 'ru'`, и без него в списке стояли две строки с одинаковым
  // значением (React ругался на дублирующийся ключ), а подпись у обеих бралась
  // от последней. Первый выигрывает — это сам язык.
  .filter((s, i, all) => all.findIndex(x => x.langCode === s.langCode) === i)
  .map(s => ({ value: s.langCode!, label: `${s.icon} ${s.name}`, subject: s.id }))

/**
 * Предметы для поля набора — ВСЕ, а не только языковые.
 *
 * Карточка — это пара «слово и значение», и такая пара бывает не только
 * языковой: разделы биологии, термины по химии, даты по истории. Ученик видит
 * наборы по предмету своего кабинета (см. fetchCardGroups), поэтому здесь
 * выбирается именно предмет, а язык из него выводится.
 */
const SUBJECT_OPTIONS = SUBJECTS.map(s => ({ value: s.id, label: `${s.icon} ${s.name}` }))

/**
 * Язык группы по выбранному предмету.
 *
 * У языкового предмета это язык, который учат. У остальных — русский: язык
 * группы нужен озвучке и разбору импорта, и для «Разделов биологии» верный
 * ответ именно русский, а не «никакой» (колонка в базе не пустеет).
 */
const langOfSubject = (id: string) => SUBJECTS.find(s => s.id === id)?.langCode ?? 'ru'

/**
 * Порядок витрины. «Новые» — по времени создания набора, а не полки: полку
 * заводят один раз, а наборы на неё докладывают месяцами.
 */
type SetSortMode = 'newest' | 'oldest' | 'az' | 'cards'
const SET_SORT_OPTS: [SetSortMode, string][] = [
  ['newest', 'Новые'], ['oldest', 'Старые'], ['az', 'А → Я'], ['cards', 'По карточкам'],
]

/** Акцент вкладки «Материалы» — тот же персиковый, что у её таблетки в ряду. */
const MAT_COLOR = 'var(--color-peach-text)'
const MAT_BG = 'var(--color-peach-soft)'

// Блок формы — то же стекло, что у Конструктора и редактора урока. Своя
// «карточка на --color-bg-2 с рамкой» выглядела чужой рядом с соседними
// экранами той же вкладки.
const cardStyle: React.CSSProperties = {
  borderRadius: 18, border: '1px solid var(--color-border-glass)',
  background: 'rgba(var(--glass-rgb), 0.88)',
  backdropFilter: 'blur(16px) saturate(180%)',
  WebkitBackdropFilter: 'blur(16px) saturate(180%)',
  boxShadow: 'var(--shadow-sm-page)',
  padding: 16,
}

// Поле без рамки на --color-bg-input: общий вид полей во всём кабинете.
// Рамка вокруг каждого поля собирала форму в стену коробок.
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 11,
  border: 'none', background: 'var(--color-bg-input)',
  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13,
  padding: '9px 12px', outline: 'none',
}

/** Кнопка без заливки: возврат, «добавить», удаление строки. */
const ghostBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7,
  border: 'none', background: 'transparent', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
  color: 'var(--color-muted)', padding: '6px 8px', borderRadius: 8,
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
  color: 'var(--color-text-3)', marginBottom: 8,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
  )
}

const langLabelOf = (lang: string) => LANG_OPTIONS.find(o => o.value === lang)?.label ?? lang
const subjectOf = (lang: string) => LANG_OPTIONS.find(o => o.value === lang)?.subject ?? null

const emptySet = (n: number): CardSet => ({
  // Временный id: до сохранения он нужен только для ключей React и для того,
  // чтобы diff в saveCardGroup отличил «этот набор новый» от «этот удалён».
  id: `new-${n}-${Math.random().toString(36).slice(2, 8)}`,
  title: '', about: '', level: null, cards: [],
})

/** Обёртка под одиночный набор: группа без имени — не полка, а родитель строки. */
const wrapperFor = (lang: string, set: CardSet): CardGroup => ({
  id: '', lang, subject: subjectOf(lang),
  title: '', about: '', level: null, sort: 0, studentIds: [], sets: [set],
})

/** Разделитель пары в строке: табуляция, тире в окружении пробелов, палка. */
const PAIR = /^(.+?)\s*(?:\t|—|–|\s-\s|\|)\s*(.+)$/

/**
 * Разбор вставленной пачки.
 *
 * ОСНОВНОЙ ФОРМАТ — по строке на карточку, слева слово, справа перевод.
 * Разделителем считается табуляция, длинное тире или дефис в окружении
 * пробелов: дефис ВНУТРИ слова (well-known, salt-and-burn) разделителем быть не
 * должен, иначе половина английских карточек развалится посередине.
 *
 * ВТОРОЙ ФОРМАТ — ПАРЫ СТРОК. Список, скопированный прямо со страницы чужого
 * набора (Quizlet и подобные), приходит без разделителей вовсе: слово на одной
 * строке, перевод на следующей. Раньше такая вставка молча давала ноль карточек
 * — человек видел пустой счётчик и не понимал, что не так с его текстом.
 * Поэтому: если разделитель нашёлся меньше чем у трети строк, считаем, что
 * перед нами пары, и склеиваем строки по две. Порог, а не «хоть одна строка без
 * разделителя»: в обычной пачке попадается строка-заголовок, и ломать из-за неё
 * весь разбор нельзя.
 */
export function parseBulk(text: string): SetCard[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return []

  const withSep = lines.filter(l => PAIR.test(l)).length
  if (withSep >= lines.length / 3) {
    return lines
      .map(line => {
        const m = line.match(PAIR)
        if (!m) return null
        const term = m[1].trim()
        const ru = m[2].trim()
        return term && ru ? { term, ru } : null
      })
      .filter((x): x is SetCard => !!x)
  }

  const out: SetCard[] = []
  for (let i = 0; i + 1 < lines.length; i += 2) {
    // Нечётный хвост отбрасывается: одинокая строка — это слово без перевода,
    // и карточка из него всё равно не выйдет.
    out.push({ term: lines[i], ru: lines[i + 1] })
  }
  return out
}

/**
 * Вставленный кусок целиком: заголовок набора и карточки.
 *
 * ЗАЧЕМ ОТДЕЛЬНО ОТ parseBulk. Человек копирует список из чужого набора вместе
 * с его названием — первой строкой, без разделителя. parseBulk такую строку
 * просто выбрасывает, и название, которое уже лежит в буфере, всё равно
 * приходится вбивать руками. Здесь оно достаётся из того же текста.
 *
 * КАК ОТЛИЧИТЬ ЗАГОЛОВОК ОТ КАРТОЧКИ. Двумя способами, по формату пачки:
 *   • пары в строку («слово — перевод») — заголовок тот, в ком нет разделителя;
 *   • пары строками (слово, следом перевод) — заголовок появляется тогда, когда
 *     строк НЕЧЁТНОЕ число: парам нужна чётность, и лишняя первая строка и есть
 *     название.
 * Оба признака врут молча в одном случае — когда название само похоже на
 * карточку, — поэтому в имя набора оно подставляется, только если имя пустое.
 */
export function readPasted(text: string): { title?: string; cards: SetCard[] } {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return { cards: parseBulk(text) }

  const withSep = lines.filter(l => PAIR.test(l)).length
  const pairsInLine = withSep >= lines.length / 3
  const headed = pairsInLine ? !PAIR.test(lines[0]) : lines.length % 2 === 1

  if (!headed) return { cards: parseBulk(lines.join('\n')) }
  return { title: lines[0], cards: parseBulk(lines.slice(1).join('\n')) }
}

// Витрина подборок переживает ремоунт вкладки: без этого каждый заход на
// «Материалы» начинался со скелетонов, которые сменялись теми же наборами.
let groupsCache: { ownerId: string | null; groups: CardGroup[]; seeds: CardGroup[] } | null = null

export default function CardGroupsManager({ createNonce = 0, lang, subject, query: outerQuery, onQuery }: {
  createNonce?: number
  /**
   * Поиск держит вкладка «Материалы»: запрос не теряется при переходе между
   * подборками и остальными полками. Без пропа — свой.
   */
  query?: string
  onQuery?: (v: string) => void
  /**
   * Язык, выбранный вкладкой «Материалы».
   *
   * Витрина обязана слушаться рейла: пока подборки не знали про выбранный язык,
   * под вывеской «Русский» лежали английские сиды — вкладка сама себе
   * противоречила. Без пропа (вкладка вызвана откуда-то ещё) показываем всё и
   * оставляем свой фасет языка.
   */
  lang?: string
  /**
   * Предмет, выбранный вкладкой «Материалы», — ГЛАВНЫЙ отбор витрины.
   *
   * Подборки отбирались по языку, и набор по биологии лежал под вывеской
   * «Русский»: язык у него есть (карточки написаны по-русски), а предмет —
   * биология, и искать его среди языков было негде. Задан предмет — язык в
   * отборе не участвует вовсе.
   */
  subject?: string
}) {
  const t = useT()
  const { tn } = useTc()
  const students = useAllStudents()

  const [ownerId, setOwnerId] = useState<string | null>(() => groupsCache?.ownerId ?? null)
  const [ownQuery, setOwnQuery] = useState('')
  const query = outerQuery ?? ownQuery
  const setQuery = onQuery ?? setOwnQuery
  const needle = normSearch(query)
  const [groups, setGroups] = useState<CardGroup[]>(() => groupsCache?.groups ?? [])
  const [seeds, setSeeds] = useState<CardGroup[]>(() => groupsCache?.seeds ?? [])
  const [loading, setLoading] = useState(() => !groupsCache)
  // Свежие данные уходят в кэш — следующий монтаж встанет с ними, а запрос
  // лишь сверит их с базой.
  useEffect(() => {
    if (!loading) groupsCache = { ownerId, groups, seeds }
  }, [loading, ownerId, groups, seeds])

  // Правка уехала на СВОЮ СТРАНИЦУ (TeacherCardSetEditorPage) — так же, как у
  // курса и урока. Витрина её больше не рисует: редактор, открытый внутри
  // вкладки, сидел рядом с рейлом фильтров и полосой вкладок, то есть посреди
  // навигации по чужому содержимому, и места набору оставалось вполовину
  // меньше, чем ему нужно. Отсюда — только дорога туда.
  //
  // Правится всегда ГРУППА-документ (сохранение считает diff по ней целиком), а
  // `focus` говорит, чем именно занят человек: набором внутри неё или самой
  // полкой. Две сущности в одной посылке — потому что и в базе они одна строка
  // с детьми, и «Сохранить» у них общее.
  const openCardsEditor = useTeacher(s => s.openCardsEditor)
  const openEditor = (group: CardGroup, focus: string | null) =>
    openCardsEditor(JSON.stringify({ group, focus }))

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [shelfPick, setShelfPick] = useState('')
  // Отбор витрины. Полка — тоже фильтр, но своим рядом чипов: полок бывают
  // единицы и у каждой своё имя, дропдауном они читаются хуже, чем в лицо.
  const [sort, setSort] = useState<SetSortMode>('newest')
  // Свой фасет языка нужен, только когда язык не пришёл сверху: два выбора
  // одного и того же в одном экране расходятся на первом же клике.
  const [langPick, setLangPick] = useState('')
  const langFilter = lang ?? langPick
  // Предмет сильнее языка: он и есть ключ, по которому набор находит ученик
  // (см. fetchCardGroups). Язык остаётся подсказкой импорту, какой речи ждать.
  const subjectFilter = subject ?? ''
  const [studentPick, setStudentPick] = useState('')
  const [shelfName, setShelfName] = useState('')
  const [busy, setBusy] = useState(false)

  async function reload(uid = ownerId) {
    if (!uid) return
    setGroups(await fetchOwnCardGroups(uid))
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      const uid = await getOwnerId()
      if (!alive) return
      setOwnerId(uid)
      const rows = uid ? await fetchOwnCardGroups(uid) : []
      // Сиды всех языков разом: их единицы, и грузятся они по одному разу.
      const seedLists = await Promise.all(
        LANG_OPTIONS.filter(o => hasCardSeeds(o.value)).map(o => loadCardSeeds(o.value)),
      )
      if (!alive) return
      setGroups(rows)
      setSeeds(seedLists.flat())
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  /** Наборы плоским списком — это и есть витрина вкладки. */
  const items = useMemo(
    () => groups.flatMap(g => g.sets.map(set => ({ set, group: g }))),
    [groups],
  )
  const shelves = useMemo(() => groups.filter(isShelf), [groups])

  /**
   * Язык нового набора — тот, на котором учитель уже что-то завёл. У языковой
   * школы это один язык на весь кабинет, и предлагать вместо него английский
   * по умолчанию значило бы, что каждый набор начинается с исправления.
   */
  const lastLang = groups[0]?.lang ?? 'en'

  function startNewSet() {
    const set = emptySet(0)
    setPicked(new Set())
    openEditor(wrapperFor(lastLang, set), set.id)
  }

  /**
   * Набор, собранный импортом прямо с витрины.
   *
   * ПОЧЕМУ НЕ ЧЕРЕЗ ПУСТОЙ НАБОР. Раньше путь к ссылке был один: заведи набор,
   * провались в него, придумай имя — и только там вставляй. Но набор с чужой
   * страницы не начинается с имени: имя у него уже есть (заголовок источника),
   * и придумывать его до того, как видно, что нашлось, — работа впустую.
   * Поэтому витрина сама заводит набор из того, что принёс импорт.
   *
   * СОХРАНЕНИЯ ЗДЕСЬ НЕТ. Открывается тот же редактор набора: язык, адресность
   * и имя человек видит и правит до «Сохранить» — импорт в базу ничего не
   * кладёт молча (см. шапку lib/cardImport).
   */
  function startImported(part: Partial<CardSet>, meta?: ImportMeta) {
    const set: CardSet = {
      ...emptySet(0),
      // Имя обязательно: без него «Сохранить» выключена, и набор, который
      // только что нашёлся, упёрся бы в серую кнопку без объяснения.
      title: meta?.title?.trim() || t('Новый набор'),
      ...part,
    }
    // Язык — тот, под которым учитель сейчас смотрит витрину: импорт разбирал
    // источник ровно этим языком.
    setPicked(new Set())
    openEditor(wrapperFor(langFilter || lastLang, set), set.id)
  }

  // «Плюс» на вкладке «Материалы» заводит НАБОР — тем же жестом, что курс и
  // задание на соседних вкладках. Родитель дёргает счётчик; ref со значением на
  // монтировании нужен, чтобы возврат на вкладку не открывал редактор заново.
  const seenNonce = useRef(createNonce)
  useEffect(() => {
    if (createNonce === seenNonce.current) return
    seenNonce.current = createNonce
    startNewSet()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNonce])

  const studentOptions = useMemo(
    () => students.map(s => ({ value: s.id, label: tn(s.name) })),
    [students],
  )

  async function removeSet(x: { set: CardSet; group: CardGroup }) {
    const ok = await confirmDialog({
      title: `${t('Удалить набор')} «${x.set.title || t('Без названия')}»?`,
      message: t('Карточки внутри исчезнут вместе с ним. Отменить это нельзя.'),
      confirmLabel: t('Удалить'),
      tone: 'danger',
    })
    if (!ok) return
    if (await deleteCardSet(x.set.id)) {
      setPicked(p => { const n = new Set(p); n.delete(x.set.id); return n })
      await reload()
    }
  }

  async function removeShelf(g: CardGroup) {
    const ok = await confirmDialog({
      title: `${t('Удалить полку')} «${g.title}»?`,
      message: t('Вместе с ней исчезнут все наборы и карточки внутри. Отменить это нельзя.'),
      confirmLabel: t('Удалить'),
      tone: 'danger',
    })
    if (!ok) return
    if (await deleteCardGroup(g.id)) {
      if (shelfPick === g.id) setShelfPick('')
      await reload()
    }
  }

  /** Копия сида под учителя: та же полка, но своя и правимая. */
  function takeSeed(seed: CardGroup) {
    openEditor({
      ...seed,
      id: '',
      seed: false,
      // Наборы тоже получают временные id — иначе diff принял бы их за строки,
      // которых нет в базе, и попытался бы обновить несуществующее.
      sets: seed.sets.map((s, i) => ({ ...s, id: `new-${i}-${s.id}` })),
      title: seed.title,
    }, null)
  }

  // ── Групповые операции над отмеченными наборами ────────────────────────────

  const pickedItems = items.filter(x => picked.has(x.set.id))
  const pickedLangs = new Set(pickedItems.map(x => x.group.lang))
  const oneLang = pickedLangs.size === 1
  const pickedLang = [...pickedLangs][0] ?? ''
  const shelvesForPick = shelves.filter(g => g.lang === pickedLang && !pickedItems.every(x => x.group.id === g.id))
  const anyOnShelf = pickedItems.some(x => isShelf(x.group))

  async function doGroup() {
    if (!oneLang || !shelfName.trim() || pickedItems.length === 0) return
    setBusy(true)
    const id = await groupSets({
      title: shelfName.trim(),
      lang: pickedLang,
      subject: subjectOf(pickedLang),
      // Адресность новой полки — объединение того, кому уже были назначены
      // наборы. Пустое множество (кто-то был виден всем) обнуляет её: «всем»
      // сильнее любого списка, иначе часть учеников молча потеряла бы набор.
      studentIds: pickedItems.some(x => x.group.studentIds.length === 0)
        ? []
        : [...new Set(pickedItems.flatMap(x => x.group.studentIds))],
      createdBy: ownerId,
      setIds: pickedItems.map(x => x.set.id),
    })
    setBusy(false)
    if (!id) return
    setShelfName('')
    setPicked(new Set())
    await reload()
  }

  async function doMove(groupId: string) {
    if (pickedItems.length === 0) return
    setBusy(true)
    await moveSetsToGroup(pickedItems.map(x => x.set.id), groupId)
    setBusy(false)
    setPicked(new Set())
    await reload()
  }

  async function doUngroup() {
    const onShelf = pickedItems.filter(x => isShelf(x.group))
    if (onShelf.length === 0) return
    setBusy(true)
    // По полкам: язык и адресность одиночный набор наследует от той группы, из
    // которой уезжает, а не от первой попавшейся.
    for (const g of new Map(onShelf.map(x => [x.group.id, x.group])).values()) {
      await ungroupSets(
        onShelf.filter(x => x.group.id === g.id).map(x => x.set.id),
        { lang: g.lang, subject: g.subject, studentIds: g.studentIds, createdBy: ownerId },
      )
    }
    setBusy(false)
    setPicked(new Set())
    await reload()
  }

  // Опции фасетов считаются ПО ДАННЫМ: фильтр, у которого одно значение,
  // FacetDropdown не рисует вовсе — мёртвый контрол занимает ряд и обещает
  // отбор, которого нет.
  const langOpts = useMemo(
    () => [...new Set(items.map(x => x.group.lang))].sort(),
    [items],
  )
  const studentOpts = useMemo(
    () => [...new Set(items.flatMap(x => x.group.studentIds))],
    [items],
  )
  const studentNames = useMemo(
    () => Object.fromEntries(students.map(x => [x.id, x.name])),
    [students],
  )

  const seedsShown = useMemo(
    () => (subjectFilter
      ? seeds.filter(g => g.subject === subjectFilter)
      : langFilter ? seeds.filter(g => g.lang === langFilter) : seeds).filter(g => !needle
      || normSearch(g.title + ' ' + g.about).includes(needle)
      || g.sets.some(x => normSearch(x.title + ' ' + x.about).includes(needle))),
    [seeds, langFilter, subjectFilter, needle],
  )

  const shown = useMemo(() => {
    let list = shelfPick ? items.filter(x => x.group.id === shelfPick) : items
    if (subjectFilter) list = list.filter(x => x.group.subject === subjectFilter)
    else if (langFilter) list = list.filter(x => x.group.lang === langFilter)
    // Пустой student_ids значит «всем», поэтому такой набор попадает в выборку
    // любого ученика: он его и правда видит.
    if (studentPick) list = list.filter(x => x.group.studentIds.length === 0 || x.group.studentIds.includes(studentPick))
    if (needle) list = list.filter(x => normSearch(`${x.set.title} ${x.set.about} ${x.group.title}`).includes(needle))
    const at = (x: { set: CardSet }) => x.set.createdAt ?? ''
    const sorted = [...list]
    if (sort === 'az') sorted.sort((a, b) => (a.set.title || '').localeCompare(b.set.title || ''))
    else if (sort === 'cards') sorted.sort((a, b) => b.set.cards.length - a.set.cards.length)
    else sorted.sort((a, b) => sort === 'oldest' ? at(a).localeCompare(at(b)) : at(b).localeCompare(at(a)))
    return sorted
  }, [items, shelfPick, langFilter, subjectFilter, studentPick, needle, sort])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SortDropdown value={sort} options={SET_SORT_OPTS} accent={MAT_COLOR} onChange={setSort} />
        {!lang && <FacetDropdown
          value={langPick} options={langOpts} allLabel={t('Все языки')} accent={MAT_COLOR}
          labels={Object.fromEntries(LANG_OPTIONS.map(o => [o.value, o.label]))}
          icon={<Globe size={12} />} iconGap={9} minWidth={92}
          onChange={setLangPick}
        />}
        <FacetDropdown
          value={studentPick} options={studentOpts} allLabel={t('Все ученики')} accent={MAT_COLOR}
          labels={studentNames} searchable
          icon={<Users size={12} />} minWidth={92}
          onChange={setStudentPick}
        />
        <ShelfSearch value={query} onChange={setQuery} style={{ marginLeft: 'auto' }} />
        <ShelfCount style={{ marginLeft: 0 }}>{shown.length} {t(plural(shown.length, ['набор', 'набора', 'наборов']))}</ShelfCount>
      </div>

      {/* Полки. Это фильтр, а не отдельная сущность в списке: сами карточки
          вкладки — всегда наборы. */}
      {shelves.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <ShelfChip
            label={t('Все наборы')}
            hint={String(items.length)}
            active={!shelfPick}
            onClick={() => setShelfPick('')}
          />
          {shelves.map(g => (
            <ShelfChip
              key={g.id}
              label={g.title}
              hint={`${g.sets.length}`}
              active={shelfPick === g.id}
              onClick={() => setShelfPick(shelfPick === g.id ? '' : g.id)}
              onEdit={() => openEditor(g, null)}
            />
          ))}
        </div>
      )}

      {/* Набор по ссылке — прямо с витрины, не заходя внутрь пустого набора.
          Ссылку на чужой набор (Quizlet, таблица, страница со словами) учитель
          приносит целиком: имя, слова и разделы уже есть в источнике, и
          единственное, чего ему не хватало, — места, куда её вставить. */}
      <CardImportPanel
        lang={langFilter || lastLang}
        accent={MAT_COLOR}
        caption={t('Новый набор из ссылки или снимка')}
        addLabel={t('Завести набор')}
        groupedNote={t('Разделы источника станут стопками внутри нового набора.')}
        onAdd={(cards, meta) => startImported({ cards }, meta)}
        onAddGrouped={(groups, meta) => startImported(
          { subsets: groupsToSubsets(groups, [], t('Без раздела')) },
          meta,
        )}
      />

      {picked.size > 0 && (
        <div
          style={{
            ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            borderColor: 'var(--color-border-medium)',
          }}
        >
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-2)' }}>
            {t('Отмечено наборов:')} {picked.size}
          </div>

          {oneLang ? (
            <>
              <input
                value={shelfName}
                onChange={e => setShelfName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void doGroup() }}
                placeholder={t('Название полки — например: Сверхъестественное')}
                style={{ ...inputStyle, width: 320, flex: '0 1 320px' }}
              />
              <button
                onClick={() => void doGroup()}
                disabled={busy || !shelfName.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
                  borderRadius: 12, border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
                  cursor: !busy && shelfName.trim() ? 'pointer' : 'default',
                  background: shelfName.trim() ? 'var(--color-purple-soft)' : 'var(--color-bg-1)',
                  color: shelfName.trim() ? 'var(--color-purple-text)' : 'var(--color-text-3)',
                }}
              >
                <Layers size={14} /> {t('Сгруппировать')}
              </button>
              {shelvesForPick.length > 0 && (
                <div style={{ width: 220 }}>
                  <TeacherSelect
                    value=""
                    options={shelvesForPick.map(g => ({ value: g.id, label: g.title }))}
                    onChange={v => { if (v) void doMove(v) }}
                    placeholder={t('В готовую полку')}
                  />
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>
              {t('На полку складываются наборы одного языка — снимите лишние.')}
            </div>
          )}

          {anyOnShelf && (
            <button
              onClick={() => void doUngroup()}
              disabled={busy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px',
                borderRadius: 12, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
                border: '1px solid var(--color-border-medium)', background: 'transparent',
                color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 700,
              }}
            >
              <FolderInput size={14} /> {t('Вынуть с полки')}
            </button>
          )}

          <button
            onClick={() => setPicked(new Set())}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 12px',
              borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: 'transparent', color: 'var(--color-muted)', fontSize: 12.5, fontWeight: 600,
            }}
          >
            <X size={13} /> {t('Снять отметки')}
          </button>
        </div>
      )}

      {loading ? (
        // Скелетоны, а не «Загрузка…»: ожидание должно иметь ту же форму, что и
        // результат, иначе витрина прыгает, когда наборы приезжают.
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {shown.map(x => (
              <SetCard
                key={x.set.id}
                set={x.set}
                group={x.group}
                checked={picked.has(x.set.id)}
                onCheck={v => setPicked(p => {
                  const n = new Set(p)
                  if (v) n.add(x.set.id); else n.delete(x.set.id)
                  return n
                })}
                onOpen={() => openEditor(x.group, x.set.id)}
                onDelete={() => void removeSet(x)}
                onShelf={() => openEditor(x.group, null)}
              />
            ))}
            {/* Про «наборов нет вовсе» витрина молчит: под ней сразу лежат
                готовые подборки, и абзац про «плюс» на вкладке повторял то же
                самое над той же сеткой. А вот отбор, отсеявший всё, объяснить
                надо — иначе пустая сетка читается как «не загрузилось». */}
            {items.length > 0 && shown.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Под отбор ничего не подошло.')}</div>
            )}
          </div>

          {shelfPick && shelves.some(g => g.id === shelfPick) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { const g = shelves.find(x => x.id === shelfPick); if (g) openEditor(g, null) }}
                style={ghostWide}
              >
                <Pencil size={13} /> {t('Настройки полки')}
              </button>
              <button
                onClick={() => { const g = shelves.find(x => x.id === shelfPick); if (g) void removeShelf(g) }}
                style={{ ...ghostWide, color: 'var(--color-red-text)' }}
              >
                <Trash2 size={13} /> {t('Удалить полку')}
              </button>
            </div>
          )}

          {seedsShown.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>{t('Готовые подборки')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {seedsShown.map(g => <SeedCard key={g.id} group={g} onTake={() => takeSeed(g)} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ShelfChip({ label, hint, active, onClick, onEdit }: {
  label: string; hint: string; active: boolean; onClick: () => void; onEdit?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: onEdit ? '0 6px 0 12px' : '0 12px',
        borderRadius: 12, cursor: 'pointer', fontSize: 12.5, fontWeight: 700,
        border: `1px solid ${active ? 'transparent' : 'var(--color-border-soft)'}`,
        background: active ? 'var(--color-purple-soft)' : 'transparent',
        color: active ? 'var(--color-purple-text)' : 'var(--color-text-2)',
      }}
    >
      <Layers size={13} />
      <span>{label}</span>
      <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontWeight: 600 }}>{hint}</span>
      {onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          style={{
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--color-muted)',
          }}
        >
          <Pencil size={12} />
        </button>
      )}
    </div>
  )
}

/**
 * Плитка набора.
 *
 * Каркас — общий ContentCard, тот же, что у курса и задания на соседних
 * вкладках: витрина Конструктора должна читаться как одна витрина, а своя
 * плитка неизбежно расходится с ней (у «Материалов» так завелась сплошная
 * рамка и другой радиус).
 *
 * Отметка живёт поверх карточки слева, как в режиме правки у виджетов: в
 * подвале ей не место — там счётчики, а отмечают набор ДО того, как в них
 * заглянули.
 */
function SetCard({ set, group, checked, onCheck, onOpen, onDelete, onShelf }: {
  set: CardSet; group: CardGroup; checked: boolean
  onCheck: (v: boolean) => void
  onOpen: () => void; onDelete: () => void; onShelf: () => void
}) {
  const t = useT()
  const onShelfNow = isShelf(group)
  return (
    <div style={{ position: 'relative' }}>
      <ContentCard
        accentColor={MAT_COLOR} accentBg={MAT_BG}
        isSelected={checked} onClick={onOpen}
        actions={{ onDelete }}
        icon={<Layers size={17} strokeWidth={2} style={{ color: MAT_COLOR }} />}
        iconBg={MAT_BG}
        badge={onShelfNow ? (
          <span
            onClick={e => { e.stopPropagation(); onShelf() }}
            title={t('Настройки полки')}
            style={cardChip(MAT_COLOR, { cursor: 'pointer', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })}
          >
            {group.title}
          </span>
        ) : undefined}
        title={set.title || t('Без названия')}
        subtitle={set.about || langLabelOf(group.lang)}
        footerLeft={<><Layers size={13} strokeWidth={1.8} /><span>{set.cards.length} {t('карточек')}</span></>}
        footerRight={<>{langLabelOf(group.lang)}</>}
      />
      {/* Отметка поверх иконки: карточку открывают кликом, а отмечают — сюда. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', top: 14, left: 14, zIndex: 6 }}
      >
        <Checkbox checked={checked} onChange={onCheck} size={17} />
      </div>
    </div>
  )
}

/**
 * Плитка готовой подборки. От своей отличается ровно одним — чипом «Готовое» и
 * тем, что клик не открывает её на правку, а забирает копию под учителя: сид
 * живёт в коде, и правка на месте пропала бы со следующим деплоем.
 */
function SeedCard({ group, onTake }: { group: CardGroup; onTake: () => void }) {
  const t = useT()
  const cards = group.sets.reduce((n, s) => n + s.cards.length, 0)
  return (
    <ContentCard
      accentColor={MAT_COLOR} accentBg={MAT_BG}
      isSelected={false} onClick={onTake}
      icon={<Copy size={17} strokeWidth={2} style={{ color: MAT_COLOR }} />}
      iconBg={MAT_BG}
      badge={<span style={cardChip(MAT_COLOR)}>{t('Готовое')}</span>}
      title={group.title}
      subtitle={group.about || langLabelOf(group.lang)}
      footerLeft={<><Layers size={13} strokeWidth={1.8} /><span>{group.sets.length} {t(plural(group.sets.length, ['набор', 'набора', 'наборов']))} · {cards} {t(plural(cards, ['карточка', 'карточки', 'карточек']))}</span></>}
      footerRight={<>{langLabelOf(group.lang)}</>}
    />
  )
}

/**
 * Полка: имя, язык, адресность и порядок наборов внутри.
 *
 * Карточки здесь НЕ правятся — за ними идут в набор. Полка отвечает на вопрос
 * «где лежит и кому видно», набор — «что внутри»; смешать их в один экран
 * значило бы прокручивать двести карточек, чтобы переименовать полку.
 */
export function ShelfPage({ group, onChange, onOpenSet, studentOptions }: {
  group: CardGroup
  onChange: (g: CardGroup) => void
  onOpenSet: (id: string) => void
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  const patch = (p: Partial<CardGroup>) => onChange({ ...group, ...p })
  const setSets = (sets: CardSet[]) => patch({ sets })

  return (
    <EditorColumns
      aside={
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label={t('Название полки')}>
          <input
            value={group.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder={t('Например: Сверхъестественное')}
            style={inputStyle}
          />
        </Field>
        <Field label={t('О чём она')}>
          <GrowTextarea
            value={group.about}
            onChange={v => patch({ about: v })}
            placeholder={t('Одна строка, которая объясняет ученику, зачем брать эту подборку.')}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </Field>
        {/* Столбиком: колонка узкая, и «Предмет» рядом с «Уровнем» сжимался
            до нечитаемой щели. */}
        <ScopeFields group={group} patch={patch} studentOptions={studentOptions} stacked />
      </div>
      }
    >
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={labelStyle}>{t('Наборы внутри')}</div>
        {group.sets.map((set, i) => (
          <div
            key={set.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 12, background: 'var(--color-bg-input)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--color-text)' }}>
                {set.title || `${t('Набор')} ${i + 1}`}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                {set.cards.length} {t('карточек')}
              </div>
            </div>
            <button onClick={() => onOpenSet(set.id)} style={ghost} title={t('Открыть набор')}><Pencil size={13} /></button>
            <button
              onClick={() => {
                if (i === 0) return
                const next = [...group.sets]
                ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
                setSets(next)
              }}
              style={ghost}
              title={t('Выше')}
            >↑</button>
            <button
              onClick={() => {
                if (i === group.sets.length - 1) return
                const next = [...group.sets]
                ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
                setSets(next)
              }}
              style={ghost}
              title={t('Ниже')}
            >↓</button>
            <button
              onClick={() => setSets(group.sets.filter((_, j) => j !== i))}
              style={{ ...ghost, color: 'var(--color-red-text)' }}
              title={t('Удалить набор')}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const set = emptySet(group.sets.length)
            setSets([...group.sets, set])
            onOpenSet(set.id)
          }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            height: 42, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
            border: '1px dashed var(--color-border-medium)', background: 'transparent',
            color: 'var(--color-text-2)', fontSize: 13, fontWeight: 700,
          }}
        >
          <Plus size={15} /> {t('Добавить набор')}
        </button>
      </div>
    </EditorColumns>
  )
}

/**
 * Адресность набора. Пусто = всем: типовой случай «выложил и забыл», и
 * заставлять отмечать всех поимённо ради него значило бы, что набором не
 * воспользуются.
 */
function AudienceField({ group, patch, studentOptions }: {
  group: CardGroup
  patch: (p: Partial<CardGroup>) => void
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
        <Users size={12} /> {t('Кому показать')}
      </div>
      <MultiSelectField
        label=""
        options={studentOptions.map(o => o.label)}
        values={studentOptions.filter(o => group.studentIds.includes(o.value)).map(o => o.label)}
        onChange={labels => patch({
          studentIds: studentOptions.filter(o => labels.includes(o.label)).map(o => o.value),
        })}
      />
      <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 5 }}>
        {group.studentIds.length === 0
          ? t('Никто не отмечен — значит, это увидят все ваши ученики этого предмета.')
          : `${t('Видят только отмеченные:')} ${group.studentIds.length}`}
      </div>
    </div>
  )
}

/**
 * Язык, уровень и адресность — общие поля группы, где бы её ни правили.
 * `stacked` — для узкой колонки листа: два поля в ряд там не помещаются.
 */
function ScopeFields({ group, patch, studentOptions, stacked = false }: {
  group: CardGroup
  patch: (p: Partial<CardGroup>) => void
  studentOptions: Array<{ value: string; label: string }>
  stacked?: boolean
}) {
  const t = useT()
  return (
    <>
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: stacked ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)',
      }}>
        <Field label={t('Предмет')}>
          <TeacherSelect
            value={group.subject ?? ''}
            options={SUBJECT_OPTIONS}
            onChange={v => patch({ subject: v, lang: langOfSubject(v) })}
            clearable={false}
          />
        </Field>
        <Field label={t('Уровень')}>
          <TeacherSelect
            value={group.level ?? ''}
            options={SURVIVAL_LEVELS.map(l => ({ value: l, label: l }))}
            onChange={v => patch({ level: (v || null) as SurvivalLevel | null })}
            placeholder={t('Без уровня')}
          />
        </Field>
      </div>
      <AudienceField group={group} patch={patch} studentOptions={studentOptions} />
    </>
  )
}

/**
 * Узкий контейнер: лист карточек и колонка свойств рядом не помещаются.
 * Мерим САМ блок, а не окно: у вкладки справа рейл фильтров, и по ширине окна
 * колонка «влезала» там, где на деле оставалось 500 пикселей.
 */
function useNarrow(px: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < px))
    ro.observe(el)
    return () => ro.disconnect()
  }, [px])
  return [ref, narrow] as const
}

/**
 * Ширина левой колонки редактора — свойства набора или полки. Та же цифра во
 * всех трёх экранах: колонка не должна дышать при переходе «пустой набор →
 * лист карточек → стопки», иначе кажется, что переехал сам редактор.
 */
const SIDE_W = 300

/**
 * Скелет редактора: карточка свойств слева, содержимое по центру.
 *
 * ПОЧЕМУ ТАК. Раньше свойства лежали шапкой над содержимым, и у набора на
 * полсотни карточек имя уезжало вверх вместе с прокруткой. Слева они видны
 * всегда — тот же приём, что у редактора курса и урока (левая рельса с метой),
 * и один и тот же экран читается одинаково во всех трёх местах кабинета.
 */
function EditorColumns({ aside, children }: { aside: React.ReactNode; children: React.ReactNode }) {
  const [ref, narrow] = useNarrow(720)
  return (
    <div
      ref={ref}
      style={{
        display: 'grid', gap: 14, alignItems: 'start',
        gridTemplateColumns: narrow ? '1fr' : `${SIDE_W}px minmax(0,1fr)`,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>{aside}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>{children}</div>
    </div>
  )
}

/**
 * Свойства набора: имя, подпись, язык, уровень, адресность.
 *
 * ВСЕГДА СЛЕВА, ВСЕГДА ЦЕЛИКОМ. Раньше их было две раскладки: шапка пустого
 * набора (имя и предмет на виду, остальное под «Подпись, уровень, кому
 * показать») и узкая колонка листа. Колонка выиграла: поля одинаково видны в
 * любом состоянии набора, и свёрнутая половина формы больше не прячет
 * адресность — самое дорогое из того, что здесь забывают проставить.
 *
 * Язык и адресность показываются ТОЛЬКО у одиночного набора: у набора на полке
 * это свойства полки, и вторая копия тех же полей поехала бы вразрез с
 * соседними наборами той же группы. Вместо них — строка «лежит на полке».
 */
function SetProps({ group, set, patch, onGroupChange, studentOptions }: {
  group: CardGroup
  set: CardSet
  patch: (p: Partial<CardSet>) => void
  onGroupChange: (p: Partial<CardGroup>) => void
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  const onShelf = isShelf(group)

  // Строкой, а не рядом: колонка узкая, и flex-ряд рвал фразу на три столбика
  // по три слова. Иконка сидит в тексте как буква.
  const shelfLine = (
    <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-muted)' }}>
      <Layers size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />
      {t('Лежит на полке')} «{group.title}» · {langLabelOf(group.lang)}{' '}
      <span style={{ color: 'var(--color-text-3)' }}>
        {t('— язык и адресность у полки общие.')}
      </span>
    </div>
  )

  const about = (
    <Field label={t('Подпись')}>
      <input
        value={set.about}
        onChange={e => patch({ about: e.target.value })}
        placeholder={t('О чём этот сезон, глава, часть — необязательно')}
        style={inputStyle}
      />
    </Field>
  )

  return (
    <>
      <Field label={t('Название набора')}>
        <input
          value={set.title}
          onChange={e => patch({ title: e.target.value })}
          placeholder={t('Например: Сезон 1')}
          style={{ ...inputStyle, fontWeight: 700 }}
          autoFocus={!set.title.trim()}
        />
      </Field>
      {about}
      {onShelf ? shelfLine : <ScopeFields group={group} patch={onGroupChange} studentOptions={studentOptions} stacked />}
    </>
  )
}

/**
 * Пустой набор: выбор источника, а не форма.
 *
 * ЗАЧЕМ. Импорт стоял последним пунктом длинной формы — то есть самый быстрый
 * путь показывался после самого медленного, и его просто не находили. Здесь он
 * первым и крупно, а ручной ввод остаётся соседней кнопкой: он никуда не делся,
 * он перестал быть умолчанием.
 *
 * ПЛИТКИ ЕСТЬ НЕ ВСЕГДА. Разбор платный и висит на рубильнике (`ai_card_import`):
 * когда он выключен, CardImportPanel не рисует ничего, и экран честно
 * превращается в два тихих пункта — руками и списком.
 */
function SetStart({ lang, onAdd, onAddGrouped, onManual, onBulk }: {
  lang: string
  onAdd: (cards: SetCard[]) => void
  onAddGrouped: (groups: ImportedGroup[]) => void
  onManual: () => void
  onBulk: () => void
}) {
  const t = useT()
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={labelStyle}>{t('Откуда берём слова')}</div>
      <CardImportPanel lang={lang} variant="tiles" onAdd={onAdd} onAddGrouped={onAddGrouped} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={onManual} style={startBtn}>
          <Pencil size={14} /> {t('Вписать руками')}
        </button>
        <button type="button" onClick={onBulk} style={startBtn}>
          <Plus size={14} /> {t('Вставить списком')}
        </button>
      </div>
      {/* Про вставку сразу в набор надо сказать словами: невидимая возможность
          никого не выручает, а кнопки рядом выглядят как весь выбор. */}
      <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.35 }}>
        {t('Список уже в буфере? Вставьте его прямо сюда — карточки разберутся сами, а первая строка станет названием набора.')}
      </div>
    </div>
  )
}

const startBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  height: 40, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
  border: '1px solid var(--color-border-soft)', background: 'transparent',
  color: 'var(--color-text-2)', fontSize: 12.5, fontWeight: 700,
}

/**
 * Набор — главный экран вкладки.
 *
 * ДВА СОСТОЯНИЯ, А НЕ ОДНА ФОРМА. Пустой набор и набор на полсотни карточек —
 * разные задачи, и одна вёрстка обслуживала обе плохо. Пустой открывается
 * вопросом «откуда берём слова». Заполненный открывается листом: карточки
 * занимают всю высоту и правятся на месте, а свойства набора уходят в колонку
 * справа, где видны всегда, а не уезжают вверх на тридцатой строке.
 */
export function SetPage({ group, set, onChange, onGroupChange, studentOptions }: {
  group: CardGroup
  set: CardSet
  onChange: (s: CardSet) => void
  onGroupChange: (p: Partial<CardGroup>) => void
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  const patch = (p: Partial<CardSet>) => onChange({ ...set, ...p })
  const onShelf = isShelf(group)
  // «Вписать руками» и «Вставить списком» переводят пустой набор в лист, не
  // дожидаясь первой карточки: иначе кнопка выбора источника ничего не делала бы.
  const [started, setStarted] = useState(false)
  const [openBulk, setOpenBulk] = useState(false)

  const props = (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SetProps group={group} set={set} patch={patch} onGroupChange={onGroupChange} studentOptions={studentOptions} />
    </div>
  )

  /**
   * Cmd+V прямо в наборе — и список разобран.
   *
   * ЗАЧЕМ. Путь «раскрыть „Вставить списком“ → вставить → нажать „Разобрать и
   * добавить“» состоит из трёх шагов там, где человек уже сделал главное:
   * положил список в буфер. Вставка в набор — однозначное действие, и гадать,
   * чего он хотел, не нужно.
   *
   * ЧЕГО ОН НЕ ТРОГАЕТ. Вставку в многострочные поля (та же «Вставить списком»,
   * подпись набора) и вставку одной строки: там человек правит текст, а не
   * заводит карточки. И пачку меньше двух карточек: одна пара с тире — это,
   * скорее всего, просто текст, который несут в поле.
   */
  function onPasteHere(e: React.ClipboardEvent) {
    if ((e.target as HTMLElement | null)?.tagName === 'TEXTAREA') return
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n')) return

    const { title, cards } = readPasted(text)
    if (cards.length < 2) return
    e.preventDefault()
    // Название подставляется только в пустое: своё, уже введённое, чужой
    // заголовок из буфера перетирать не должен.
    patch({ cards: [...set.cards, ...cards], title: set.title.trim() || title || '' })
    setStarted(true)

    // Предмет — по написанию слов, и только у первой вставки в пустой набор:
    // выбранный руками предмет менять нельзя, а у набора НА ПОЛКЕ он вообще не
    // свой — он общий на всю полку, и одна вставка увела бы за собой соседние
    // наборы (см. SetProps: поле там и не показывается).
    //
    // Угадывается ИМЕННО ЯЗЫК — письменность слов больше ни о чём не говорит:
    // «Систематика» и «Гистология» написаны по-русски, а предмет у них
    // биология. Поэтому подставляем языковой предмет как заготовку, а если
    // набор на самом деле предметный, учитель поправит поле одним щелчком.
    if (set.cards.length === 0 && !onShelf) {
      const guessed = guessLang(cards.map(c => c.term))
      const subj = guessed ? subjectOf(guessed) : null
      if (subj && subj !== group.subject) onGroupChange({ subject: subj, lang: guessed! })
    }
  }

  if (set.subsets?.length) {
    return (
      <EditorColumns aside={props}>
        <SubsetsEditor set={set} onChange={onChange} lang={group.lang} />
      </EditorColumns>
    )
  }

  if (set.cards.length === 0 && !started) {
    return (
      <div onPaste={onPasteHere}>
        <EditorColumns aside={props}>
          <SetStart
            lang={group.lang}
            onAdd={cards => patch({ cards })}
            // Пустой набор раскладка открывает сразу стопками: терять здесь
            // нечего, и уровень появляется ровно тогда, когда в нём есть смысл.
            onAddGrouped={groups => patch({ cards: [], subsets: groupsToSubsets(groups, [], t('Без раздела')) })}
            onManual={() => setStarted(true)}
            onBulk={() => { setStarted(true); setOpenBulk(true) }}
          />
        </EditorColumns>
      </div>
    )
  }

  return (
    <div onPaste={onPasteHere}>
      <CardsEditor
        cards={set.cards}
        onCards={cards => patch({ cards })}
        lang={group.lang}
        openBulk={openBulk}
        // Карточки набора и стопки в одном наборе не живут: экран показывает
        // либо лист, либо стопки. Поэтому раскладка уводит уже набранное в
        // свою стопку — иначе оно осталось бы в данных, но пропало бы с глаз.
        onImportGroups={groups => patch({
          cards: [],
          subsets: groupsToSubsets(
            groups,
            set.cards.length ? [{ id: newSubsetId(0), title: t('Набранное руками'), about: '', cards: set.cards }] : [],
            t('Без раздела'),
          ),
        })}
        importNote={set.cards.length
          ? `${t('Карточки, уже лежащие в наборе, уедут в стопку «Набранное руками»:')} ${set.cards.length}`
          : undefined}
        aside={
          <SetProps group={group} set={set} patch={patch} onGroupChange={onGroupChange} studentOptions={studentOptions} />
        }
      />
    </div>
  )
}

/**
 * Временный id новой стопки — как у нового набора: до сохранения он нужен
 * ключам React и тому, чтобы diff в saveCardGroup отличил новое от удалённого.
 */
const newSubsetId = (n: number) => `new-sub-${n}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Разложенный импорт → стопки набора.
 *
 * СЛИВАЕТСЯ ПО НАЗВАНИЮ. Вторая пачка той же серии должна лечь в ту же стопку,
 * а не завести рядом вторую «S01E04»: сравниваем заголовки без регистра и
 * пробелов по краям. Новые стопки идут в хвост, порядок старых не трогаем —
 * его выставили руками.
 */
function groupsToSubsets(groups: ImportedGroup[], base: CardSubset[], fallback: string): CardSubset[] {
  const next = base.map(x => ({ ...x, cards: [...x.cards] }))
  const key = (title: string) => title.trim().toLowerCase()
  for (const g of groups) {
    const title = g.title.trim() || fallback
    const hit = next.find(x => key(x.title) === key(title))
    if (hit) hit.cards.push(...g.cards)
    else next.push({ id: newSubsetId(next.length), title, about: '', cards: [...g.cards] })
  }
  return next
}

/**
 * Редактор стопок: четвёртый уровень внутри набора.
 *
 * ЗАЧЕМ ОН ЗДЕСЬ. Набор с сериями хранит карточки не у себя, а в стопках, и без
 * этого экрана учитель, забравший себе сезон, видел бы набор с нулём карточек и
 * не понимал, куда делись серии. Данные при этом не терялись — терялась
 * видимость, что ничем не лучше.
 *
 * ОДИН УРОВЕНЬ И ВСЁ. Кнопки «разбить стопку ещё раз» здесь нет и не будет:
 * глубже четырёх запрещено и типом (CardSubset без своих подстопок), и
 * триггером в базе (миграция 0071).
 */
function SubsetsEditor({ set, onChange, lang }: { set: CardSet; onChange: (s: CardSet) => void; lang: string }) {
  const t = useT()
  const [openId, setOpenId] = useState<string | null>(null)
  const subsets = set.subsets ?? []
  const open = subsets.find(x => x.id === openId) ?? null

  const patchSubsets = (next: CardSubset[]) => onChange({ ...set, subsets: next })

  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button type="button" onClick={() => setOpenId(null)} style={ghostBtn}>
          <ChevronLeft size={14} /> {t('К стопкам')}
        </button>
        <CardsEditor
          cards={open.cards}
          onCards={cards => patchSubsets(subsets.map(x => (x.id === open.id ? { ...x, cards } : x)))}
          lang={lang}
          aside={
            <Field label={t('Название стопки')}>
              <input
                value={open.title}
                onChange={e => patchSubsets(subsets.map(x => (x.id === open.id ? { ...x, title: e.target.value } : x)))}
                placeholder={t('Например: 1. Pilot')}
                style={{ ...inputStyle, fontWeight: 700 }}
              />
            </Field>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={labelStyle}>{t('Стопки')} · {subsets.length}</div>

      {/* Импорт стоит и здесь, на списке: у набора, уже разбитого на серии,
          следующая пачка слов — это, как правило, следующая серия, и
          проваливаться ради неё внутрь стопки незачем. Разложенное сливается
          по названию, новое заводит стопку в хвосте. */}
      <CardImportPanel
        lang={lang}
        onAdd={cards => patchSubsets(groupsToSubsets([{ title: '', cards }], subsets, t('Без раздела')))}
        onAddGrouped={groups => patchSubsets(groupsToSubsets(groups, subsets, t('Без раздела')))}
        groupedNote={t('Стопки с теми же названиями пополнятся, остальные заведутся новыми.')}
      />

      {subsets.map(sub => (
        <div key={sub.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
          <button type="button" onClick={() => setOpenId(sub.id)} style={{ ...ghostBtn, flex: 1, justifyContent: 'flex-start' }}>
            <span style={{ fontWeight: 700 }}>{sub.title || t('Без названия')}</span>
            <span style={{ color: 'var(--color-text-3)', fontSize: 12 }}>{sub.cards.length} {t('карточек')}</span>
          </button>
          <button
            type="button"
            title={t('Удалить стопку')}
            onClick={() => patchSubsets(subsets.filter(x => x.id !== sub.id))}
            style={ghostBtn}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => patchSubsets([...subsets, { id: newSubsetId(subsets.length), title: '', about: '', cards: [] }])}
        style={ghostBtn}
      >
        + {t('Добавить стопку')}
      </button>
    </div>
  )
}

/**
 * Редактор карточек — лист.
 *
 * БЕРЁТ СПИСОК, А НЕ НАБОР: карточки лежат и у набора, и у стопки внутри него,
 * а форма для них одна и та же. Передавали бы набор — пришлось бы писать вторую
 * копию редактора под стопку, и они разошлись бы на первой же правке формата.
 *
 * ПРАВКА НА МЕСТЕ. Раньше готовые карточки были нередактируемыми строками: чтобы
 * исправить опечатку в переводе, карточку удаляли и набивали заново. Теперь
 * ячейка — это поле без рамки, подчёркивание появляется под тем, в котором
 * стоит курсор (общее правило правки-на-месте). Полсотни полей в рамках были бы
 * стеной коробок.
 *
 * ПОСЛЕДНЯЯ СТРОКА — ПУСТАЯ. Отдельной формы «добавить карточку» больше нет:
 * пишут прямо в хвост листа, Enter переводит на следующую. Форма над списком
 * заставляла глаз прыгать между местом ввода и местом, где появляется результат.
 */
function CardsEditor({ cards, onCards, lang, aside, openBulk = false, onImportGroups, importNote }: {
  cards: SetCard[]
  onCards: (c: SetCard[]) => void
  /** Код языка набора — импорту надо знать, что здесь слово, а что перевод. */
  lang: string
  /** Колонка справа: свойства набора или стопки. Без неё лист идёт во всю ширину. */
  aside?: React.ReactNode
  /** Пришли сюда по «Вставить списком» — раскрыть вставку сразу. */
  openBulk?: boolean
  /**
   * Разложить импорт по стопкам. Передаёт ТОЛЬКО набор: внутри стопки класть
   * подстопки некуда (глубже четырёх запрещено и типом, и триггером 0071), и
   * предлагать там раскладку значило бы обещать несуществующее.
   */
  onImportGroups?: (groups: ImportedGroup[]) => void
  /** Что раскладка сделает с тем, что уже лежит в наборе. */
  importNote?: string
}) {
  const t = useT()
  const [bulk, setBulk] = useState('')
  const [bulkOpen, setBulkOpen] = useState(openBulk)
  const [row, setRow] = useState<SetCard>({ term: '', ru: '', note: '', ep: '' })
  const [ref, narrow] = useNarrow(760)
  const termRef = useRef<HTMLInputElement>(null)

  const patchCard = (i: number, p: Partial<SetCard>) =>
    onCards(cards.map((c, j) => (j === i ? { ...c, ...p } : c)))

  function addRow() {
    if (!row.term.trim() || !row.ru.trim()) return
    onCards([...cards, {
      term: row.term.trim(),
      ru: row.ru.trim(),
      note: row.note?.trim() || undefined,
      ep: row.ep?.trim() || undefined,
    }])
    // Метка серии НЕ чистится: карточки одной серии добавляют подряд, и стирать
    // её после каждой значило бы вбивать «S05E04» двенадцать раз.
    setRow(r => ({ term: '', ru: '', note: '', ep: r.ep }))
    termRef.current?.focus()
  }

  function addBulk() {
    const parsed = parseBulk(bulk)
    if (parsed.length === 0) return
    onCards([...cards, ...parsed.map(c => ({ ...c, ep: row.ep?.trim() || undefined }))])
    setBulk('')
  }

  const ready = Boolean(row.term.trim() && row.ru.trim())

  const sheet = (
    <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ ...gridCols, padding: '9px 14px', borderBottom: '1px solid var(--color-border-soft)' }}>
        <div style={labelStyle0}>{t('Слово')}</div>
        <div style={labelStyle0}>{t('Перевод')}</div>
        <div style={labelStyle0}>{t('Серия')}</div>
        <div />
      </div>

      {cards.map((c, i) => (
        <div key={i} style={{ ...gridCols, padding: '7px 14px', borderBottom: '1px solid var(--color-border-soft)' }}>
          <div style={{ minWidth: 0 }}>
            <input
              value={c.term}
              onChange={e => patchCard(i, { term: e.target.value })}
              onFocus={underline(true)}
              onBlur={underline(false)}
              placeholder={t('Слово или фраза')}
              style={cellStyle({ fontWeight: 650 })}
            />
            <input
              value={c.note ?? ''}
              onChange={e => patchCard(i, { note: e.target.value || undefined })}
              onFocus={underline(true)}
              onBlur={underline(false)}
              placeholder={t('Пояснение — необязательно')}
              style={cellStyle({ fontSize: 11.5, color: 'var(--color-muted)' })}
            />
          </div>
          <input
            value={c.ru}
            onChange={e => patchCard(i, { ru: e.target.value })}
            onFocus={underline(true)}
            onBlur={underline(false)}
            placeholder={t('Перевод')}
            style={cellStyle({ color: 'var(--color-text-2)' })}
          />
          <input
            value={c.ep ?? ''}
            onChange={e => patchCard(i, { ep: e.target.value || undefined })}
            onFocus={underline(true)}
            onBlur={underline(false)}
            placeholder="—"
            style={cellStyle({ fontSize: 11.5, color: 'var(--color-text-3)' })}
          />
          <button
            onClick={() => onCards(cards.filter((_, j) => j !== i))}
            style={{ ...ghost, width: 26, height: 26, border: 'none', color: 'var(--color-muted)' }}
            title={t('Убрать карточку')}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      {/* Хвост листа: сюда пишут новую карточку. */}
      <div style={{ ...gridCols, padding: '7px 14px', background: 'var(--color-bg-input)' }}>
        <div style={{ minWidth: 0 }}>
          <input
            ref={termRef}
            value={row.term}
            onChange={e => setRow({ ...row, term: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') addRow() }}
            onFocus={underline(true)}
            onBlur={underline(false)}
            placeholder={t('Слово или фраза')}
            style={cellStyle({ fontWeight: 650 })}
          />
          <input
            value={row.note ?? ''}
            onChange={e => setRow({ ...row, note: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') addRow() }}
            onFocus={underline(true)}
            onBlur={underline(false)}
            placeholder={t('Пояснение — необязательно')}
            style={cellStyle({ fontSize: 11.5, color: 'var(--color-muted)' })}
          />
        </div>
        <input
          value={row.ru}
          onChange={e => setRow({ ...row, ru: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') addRow() }}
          onFocus={underline(true)}
          onBlur={underline(false)}
          placeholder={t('Перевод')}
          style={cellStyle({ color: 'var(--color-text-2)' })}
        />
        <input
          value={row.ep ?? ''}
          onChange={e => setRow({ ...row, ep: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') addRow() }}
          onFocus={underline(true)}
          onBlur={underline(false)}
          placeholder={t('S01E04')}
          style={cellStyle({ fontSize: 11.5, color: 'var(--color-text-3)' })}
        />
        <button
          onClick={addRow}
          disabled={!ready}
          title={t('Добавить')}
          style={{
            ...ghost, width: 26, height: 26, border: 'none',
            cursor: ready ? 'pointer' : 'default',
            color: ready ? 'var(--color-purple-text)' : 'var(--color-text-3)',
          }}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  )

  const side = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      {aside && (
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>{aside}</div>
      )}

      {/* Снимок или ссылка: разбор на стороне сервера, превью — здесь. Метка
          серии берётся из хвостовой строки: её и так заполняют перед пачкой. */}
      <CardImportPanel
        lang={lang}
        ep={row.ep?.trim() || undefined}
        onAdd={imported => onCards([...cards, ...imported])}
        onAddGrouped={onImportGroups}
        groupedNote={importNote}
      />

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" onClick={() => setBulkOpen(v => !v)} style={{ ...ghostBtn, padding: 0 }}>
          <ChevronDown size={13} style={{ transform: bulkOpen ? 'rotate(180deg)' : 'none' }} />
          {t('Вставить списком')}
        </button>
        {bulkOpen && (
          <>
            <GrowTextarea
              value={bulk}
              onChange={setBulk}
              minHeight={90}
              placeholder={'hunter — охотник\nsalt and burn — засыпать солью и сжечь'}
              style={{ ...inputStyle, resize: 'none' }}
            />
            <button
              onClick={addBulk}
              disabled={parseBulk(bulk).length === 0}
              style={{
                height: 34, padding: '0 14px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
                cursor: parseBulk(bulk).length > 0 ? 'pointer' : 'default',
                background: parseBulk(bulk).length > 0 ? 'var(--color-purple-soft)' : 'var(--color-bg-1)',
                color: parseBulk(bulk).length > 0 ? 'var(--color-purple-text)' : 'var(--color-text-3)',
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              {t('Разобрать и добавить')}
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.35 }}>
              {parseBulk(bulk).length > 0
                ? `${t('Распознано карточек:')} ${parseBulk(bulk).length}`
                : t('По строке на карточку: слово, тире, перевод. Или парами строк: слово, следом перевод.')}
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Свойства слева, карточки справа. Читают сверху вниз и слева направо: сперва
  // ЧТО это за набор — имя, язык, кому, — потом уже его содержимое. Колонка
  // стояла справа, и получалось, что имя набора ищут после пятидесяти строк.
  // В узком блоке порядок тот же, просто столбиком.
  return (
    <div
      ref={ref}
      style={{
        display: 'grid', gap: 12, alignItems: 'start',
        gridTemplateColumns: narrow ? '1fr' : `${SIDE_W}px minmax(0,1fr)`,
      }}
    >
      {side}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
        <div style={labelStyle}>{t('Карточки')} · {cards.length}</div>
        {sheet}
      </div>
    </div>
  )
}

/** Колонки листа: слово · перевод · серия · корзина. */
const gridCols: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr) 78px 26px',
  gap: 10, alignItems: 'center',
}

const labelStyle0: React.CSSProperties = { ...labelStyle, marginBottom: 0 }

/**
 * Ячейка листа: поле без рамки. Нижняя граница стоит всегда, но прозрачная —
 * иначе строка подпрыгивала бы на полтора пикселя при первом клике в поле.
 */
const cellStyle = (extra: React.CSSProperties): React.CSSProperties => ({
  width: '100%', minWidth: 0, boxSizing: 'border-box',
  border: 'none', borderBottom: '1.5px solid transparent', borderRadius: 0,
  padding: '2px 0', background: 'transparent', outline: 'none',
  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13,
  caretColor: 'var(--color-accent)',
  ...extra,
})

const underline = (on: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderBottomColor = on ? 'var(--color-accent)' : 'transparent'
}

const ghost: React.CSSProperties = {
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 10, border: '1px solid var(--color-border-soft)', background: 'transparent',
  color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, flexShrink: 0,
}

const ghostWide: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px',
  borderRadius: 11, border: '1px solid var(--color-border-soft)', background: 'transparent',
  color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700,
}
