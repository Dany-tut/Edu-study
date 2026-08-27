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
import { Plus, Trash2, ChevronLeft, Layers, Copy, Users, Pencil, FolderInput, X, Globe } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { getOwnerId } from '../../lib/owner'
import { useAllStudents } from '../../lib/useGroups'
import { SUBJECTS } from '../../lib/subjects'
import {
  fetchOwnCardGroups, saveCardGroup, deleteCardGroup, deleteCardSet,
  groupSets, moveSetsToGroup, ungroupSets, isShelf,
  type CardGroup, type CardSet, type SetCard,
} from '../../lib/cardGroups'
import { hasCardSeeds, loadCardSeeds } from '../../data/cardGroupSeeds'
import { SURVIVAL_LEVELS, type SurvivalLevel } from '../../data/survivalPhrases'
import GrowTextarea from '../GrowTextarea'
import Checkbox from '../Checkbox'
import TeacherSelect from './TeacherSelect'
import MultiSelectField from '../MultiSelectField'
import TeacherSaveButton from './TeacherSaveButton'
import { confirmDialog } from '../ConfirmHost'
import { ContentCard, CardSkeleton } from './ContentCard'
import { SortDropdown, FacetDropdown, ShelfCount } from './ShelfFilters'
import { cardChip } from '../../lib/pillStyles'

/** Языки, на которых вообще бывает тренажёр, — по реестру предметов. */
const LANG_OPTIONS = SUBJECTS
  .filter(s => s.isLanguage && s.langCode)
  .map(s => ({ value: s.langCode!, label: `${s.icon} ${s.name}`, subject: s.id }))

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

const cardStyle: React.CSSProperties = {
  borderRadius: 16, border: '1px solid var(--color-border-soft)',
  background: 'var(--color-bg-2)', padding: 14,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 12,
  border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-1)',
  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13.5,
  padding: '9px 12px', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
  color: 'var(--color-muted)', marginBottom: 5,
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

/**
 * Разбор вставленной пачки.
 *
 * Формат — по строке на карточку, слева слово, справа перевод. Разделителем
 * считается табуляция, длинное тире или дефис в окружении пробелов: дефис
 * ВНУТРИ слова (well-known, salt-and-burn) разделителем быть не должен, иначе
 * половина английских карточек развалится посередине.
 */
export function parseBulk(text: string): SetCard[] {
  return text.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^(.+?)\s*(?:\t|—|–|\s-\s|\|)\s*(.+)$/)
      if (!m) return null
      const term = m[1].trim()
      const ru = m[2].trim()
      return term && ru ? { term, ru } : null
    })
    .filter((x): x is SetCard => !!x)
}

export default function CardGroupsManager({ createNonce = 0 }: { createNonce?: number }) {
  const t = useT()
  const students = useAllStudents()

  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [groups, setGroups] = useState<CardGroup[]>([])
  const [seeds, setSeeds] = useState<CardGroup[]>([])
  const [loading, setLoading] = useState(true)

  // Правится всегда ГРУППА-документ (сохранение считает diff по ней целиком), а
  // `focus` говорит, чем именно занят человек: набором внутри неё или самой
  // полкой. Две сущности в одном состоянии — потому что и в базе они одна
  // строка с детьми, и «сохранить» у них общее.
  const [draft, setDraft] = useState<CardGroup | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [shelfPick, setShelfPick] = useState('')
  // Отбор витрины. Полка — тоже фильтр, но своим рядом чипов: полок бывают
  // единицы и у каждой своё имя, дропдауном они читаются хуже, чем в лицо.
  const [sort, setSort] = useState<SetSortMode>('newest')
  const [langPick, setLangPick] = useState('')
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
    setDraft(wrapperFor(lastLang, set))
    setFocus(set.id)
    setPicked(new Set())
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
    () => students.map(s => ({ value: s.id, label: s.name })),
    [students],
  )

  const editedSet = draft && focus ? draft.sets.find(s => s.id === focus) ?? null : null
  const canSave = editedSet ? !!editedSet.title.trim() : !!draft?.title.trim()

  async function save() {
    if (!draft || !canSave) return
    setSaving(true)
    const id = await saveCardGroup(draft, { createdBy: ownerId })
    setSaving(false)
    if (!id) return
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)

    // Перечитываем и ПЕРЕСАЖИВАЕМ редактор на строки из базы. Новая группа и
    // её наборы получили настоящие id; останься редактор на временных, второе
    // «Сохранить» посчитало бы их удалёнными и перезалило набор копией.
    const rows = ownerId ? await fetchOwnCardGroups(ownerId) : []
    setGroups(rows)
    const fresh = rows.find(g => g.id === id)
    if (!fresh) { setDraft(d => (d ? { ...d, id, seed: false } : d)); return }
    const idx = draft.sets.findIndex(s => s.id === focus)
    setDraft(fresh)
    if (focus) setFocus(fresh.sets[idx]?.id ?? null)
  }

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
      setDraft(d => (d?.id === g.id ? null : d))
      await reload()
    }
  }

  /** Копия сида под учителя: та же полка, но своя и правимая. */
  function takeSeed(seed: CardGroup) {
    setDraft({
      ...seed,
      id: '',
      seed: false,
      // Наборы тоже получают временные id — иначе diff принял бы их за строки,
      // которых нет в базе, и попытался бы обновить несуществующее.
      sets: seed.sets.map((s, i) => ({ ...s, id: `new-${i}-${s.id}` })),
      title: seed.title,
    })
    setFocus(null)
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

  // ── Экраны ─────────────────────────────────────────────────────────────────

  if (draft && editedSet) {
    return (
      <SetPage
        group={draft}
        set={editedSet}
        onChange={next => setDraft(d => (d ? { ...d, sets: d.sets.map(s => (s.id === editedSet.id ? next : s)) } : d))}
        onGroupChange={p => setDraft(d => (d ? { ...d, ...p } : d))}
        onBack={() => { setDraft(null); setFocus(null); void reload() }}
        onSave={save}
        saving={saving}
        saved={saved}
        studentOptions={studentOptions}
      />
    )
  }

  if (draft) {
    return (
      <ShelfPage
        group={draft}
        onChange={setDraft}
        onOpenSet={id => setFocus(id)}
        onBack={() => { setDraft(null); void reload() }}
        onSave={save}
        saving={saving}
        saved={saved}
        studentOptions={studentOptions}
      />
    )
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

  const shown = useMemo(() => {
    let list = shelfPick ? items.filter(x => x.group.id === shelfPick) : items
    if (langPick) list = list.filter(x => x.group.lang === langPick)
    // Пустой student_ids значит «всем», поэтому такой набор попадает в выборку
    // любого ученика: он его и правда видит.
    if (studentPick) list = list.filter(x => x.group.studentIds.length === 0 || x.group.studentIds.includes(studentPick))
    const at = (x: { set: CardSet }) => x.set.createdAt ?? ''
    const sorted = [...list]
    if (sort === 'az') sorted.sort((a, b) => (a.set.title || '').localeCompare(b.set.title || ''))
    else if (sort === 'cards') sorted.sort((a, b) => b.set.cards.length - a.set.cards.length)
    else sorted.sort((a, b) => sort === 'oldest' ? at(a).localeCompare(at(b)) : at(b).localeCompare(at(a)))
    return sorted
  }, [items, shelfPick, langPick, studentPick, sort])


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.5, maxWidth: 620 }}>
        {t('Набор — стопка карточек, которую ученик проходит за раз. Новый заводится «плюсом» на вкладке. Когда наборов много, отметьте их и сложите на полку — она станет группой в тренажёре.')}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SortDropdown value={sort} options={SET_SORT_OPTS} accent={MAT_COLOR} onChange={setSort} />
        <FacetDropdown
          value={langPick} options={langOpts} allLabel={t('Все языки')} accent={MAT_COLOR}
          labels={Object.fromEntries(LANG_OPTIONS.map(o => [o.value, o.label]))}
          icon={<Globe size={12} />} iconGap={9} minWidth={92}
          onChange={setLangPick}
        />
        <FacetDropdown
          value={studentPick} options={studentOpts} allLabel={t('Все ученики')} accent={MAT_COLOR}
          labels={studentNames} searchable
          icon={<Users size={12} />} minWidth={92}
          onChange={setStudentPick}
        />
        <ShelfCount>{shown.length} {t('наборов')}</ShelfCount>
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
              onEdit={() => { setDraft(g); setFocus(null) }}
            />
          ))}
        </div>
      )}

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
                onOpen={() => { setDraft(x.group); setFocus(x.set.id) }}
                onDelete={() => void removeSet(x)}
                onShelf={() => { setDraft(x.group); setFocus(null) }}
              />
            ))}
            {items.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                {t('Пока ни одного набора. Заведите первый «плюсом» на вкладке — он появится у учеников в тренажёре.')}
              </div>
            )}
            {items.length > 0 && shown.length === 0 && (
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('На этой полке пока пусто.')}</div>
            )}
          </div>

          {shelfPick && shelves.some(g => g.id === shelfPick) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => { const g = shelves.find(x => x.id === shelfPick); if (g) { setDraft(g); setFocus(null) } }}
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

          {seeds.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
              <div style={{ ...labelStyle, marginBottom: 0 }}>{t('Готовые подборки')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {seeds.map(g => <SeedCard key={g.id} group={g} onTake={() => takeSeed(g)} />)}
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
      footerLeft={<><Layers size={13} strokeWidth={1.8} /><span>{group.sets.length} {t('наборов')} · {cards} {t('карточек')}</span></>}
      footerRight={<>{langLabelOf(group.lang)}</>}
    />
  )
}

/** Шапка редактора: «назад» слева, «сохранить» справа. Общая на оба экрана. */
function EditorBar({ back, onBack, onSave, saving, saved, disabled }: {
  back: string; onBack: () => void; onSave: () => void
  saving: boolean; saved: boolean; disabled: boolean
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
          borderRadius: 12, border: '1px solid var(--color-border-soft)', cursor: 'pointer',
          background: 'transparent', color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
        }}
      >
        <ChevronLeft size={14} /> {back}
      </button>
      <div style={{ marginLeft: 'auto' }}>
        <TeacherSaveButton label={t('Сохранить')} onClick={onSave} saving={saving} saved={saved} disabled={disabled} />
      </div>
    </div>
  )
}

/**
 * Полка: имя, язык, адресность и порядок наборов внутри.
 *
 * Карточки здесь НЕ правятся — за ними идут в набор. Полка отвечает на вопрос
 * «где лежит и кому видно», набор — «что внутри»; смешать их в один экран
 * значило бы прокручивать двести карточек, чтобы переименовать полку.
 */
function ShelfPage({ group, onChange, onOpenSet, onBack, onSave, saving, saved, studentOptions }: {
  group: CardGroup
  onChange: (g: CardGroup) => void
  onOpenSet: (id: string) => void
  onBack: () => void
  onSave: () => void
  saving: boolean
  saved: boolean
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  const patch = (p: Partial<CardGroup>) => onChange({ ...group, ...p })
  const setSets = (sets: CardSet[]) => patch({ sets })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
      <EditorBar back={t('К наборам')} onBack={onBack} onSave={onSave} saving={saving} saved={saved} disabled={!group.title.trim()} />

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
        <ScopeFields group={group} patch={patch} studentOptions={studentOptions} />
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={labelStyle}>{t('Наборы внутри')}</div>
        {group.sets.map((set, i) => (
          <div
            key={set.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 12, background: 'var(--color-bg-1)', border: '1px solid var(--color-border-soft)',
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
    </div>
  )
}

/** Язык, уровень и адресность — общие поля группы, где бы её ни правили. */
function ScopeFields({ group, patch, studentOptions }: {
  group: CardGroup
  patch: (p: Partial<CardGroup>) => void
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label={t('Язык')}>
          <TeacherSelect
            value={group.lang}
            options={LANG_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            onChange={v => patch({ lang: v, subject: subjectOf(v) })}
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
      {/* Назначение. Пусто = всем: типовой случай «выложил и забыл», и
          заставлять отмечать всех поимённо ради него значило бы, что набором
          не воспользуются. */}
      <div>
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
            ? t('Никто не отмечен — значит, это увидят все ваши ученики этого языка.')
            : `${t('Видят только отмеченные:')} ${group.studentIds.length}`}
        </div>
      </div>
    </>
  )
}

/**
 * Набор — главный экран вкладки: имя, подпись и карточки.
 *
 * Язык и адресность показываются здесь ТОЛЬКО у одиночного набора: у набора на
 * полке это свойства полки, и вторая копия тех же полей поехала бы вразрез с
 * соседними наборами той же группы. Вместо них — строка «лежит на полке».
 */
function SetPage({ group, set, onChange, onGroupChange, onBack, onSave, saving, saved, studentOptions }: {
  group: CardGroup
  set: CardSet
  onChange: (s: CardSet) => void
  onGroupChange: (p: Partial<CardGroup>) => void
  onBack: () => void
  onSave: () => void
  saving: boolean
  saved: boolean
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  const patch = (p: Partial<CardSet>) => onChange({ ...set, ...p })
  const onShelf = isShelf(group)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
      <EditorBar back={t('К наборам')} onBack={onBack} onSave={onSave} saving={saving} saved={saved} disabled={!set.title.trim()} />

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label={t('Название набора')}>
          <input
            value={set.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder={t('Например: Сезон 1')}
            style={{ ...inputStyle, fontWeight: 700 }}
          />
        </Field>
        <Field label={t('Подпись')}>
          <input
            value={set.about}
            onChange={e => patch({ about: e.target.value })}
            placeholder={t('О чём этот сезон, глава, часть — необязательно')}
            style={inputStyle}
          />
        </Field>
        {onShelf ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--color-muted)' }}>
            <Layers size={13} />
            {t('Лежит на полке')} «{group.title}» · {langLabelOf(group.lang)}
            <span style={{ color: 'var(--color-text-3)' }}>
              {t('— язык и адресность у полки общие.')}
            </span>
          </div>
        ) : (
          <ScopeFields group={group} patch={onGroupChange} studentOptions={studentOptions} />
        )}
      </div>

      <CardsEditor set={set} onChange={onChange} />
    </div>
  )
}

function CardsEditor({ set, onChange }: { set: CardSet; onChange: (s: CardSet) => void }) {
  const t = useT()
  const [bulk, setBulk] = useState('')
  const [row, setRow] = useState<SetCard>({ term: '', ru: '', note: '', ep: '' })

  const setCards = (cards: SetCard[]) => onChange({ ...set, cards })

  function addRow() {
    if (!row.term.trim() || !row.ru.trim()) return
    setCards([...set.cards, {
      term: row.term.trim(),
      ru: row.ru.trim(),
      note: row.note?.trim() || undefined,
      ep: row.ep?.trim() || undefined,
    }])
    // Метка серии НЕ чистится: карточки одной серии добавляют подряд, и стирать
    // её после каждой значило бы вбивать «S05E04» двенадцать раз.
    setRow(r => ({ term: '', ru: '', note: '', ep: r.ep }))
  }

  function addBulk() {
    const parsed = parseBulk(bulk)
    if (parsed.length === 0) return
    setCards([...set.cards, ...parsed.map(c => ({ ...c, ep: row.ep?.trim() || undefined }))])
    setBulk('')
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={labelStyle}>{t('Карточки')} · {set.cards.length}</div>

      {set.cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {set.cards.map((c, i) => (
            <div
              key={`${c.term}-${i}`}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                borderRadius: 12, background: 'var(--color-bg-1)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--color-text)' }}>{c.term}</div>
                {c.note && <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>{c.note}</div>}
              </div>
              {c.ep && (
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>{c.ep}</div>
              )}
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', width: '38%', textAlign: 'right' }}>{c.ru}</div>
              <button
                onClick={() => setCards(set.cards.filter((_, j) => j !== i))}
                style={{ ...ghost, color: 'var(--color-muted)' }}
                title={t('Убрать карточку')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Построчный ввод: одна карточка за раз. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr auto', gap: 8, alignItems: 'center' }}>
        <input
          value={row.term}
          onChange={e => setRow({ ...row, term: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') addRow() }}
          placeholder={t('Слово или фраза')}
          style={inputStyle}
        />
        <input
          value={row.ru}
          onChange={e => setRow({ ...row, ru: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') addRow() }}
          placeholder={t('Перевод')}
          style={inputStyle}
        />
        <input
          value={row.ep ?? ''}
          onChange={e => setRow({ ...row, ep: e.target.value })}
          placeholder={t('Серия, напр. S01E04')}
          style={inputStyle}
        />
        <button
          onClick={addRow}
          disabled={!row.term.trim() || !row.ru.trim()}
          style={{
            height: 36, padding: '0 14px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
            cursor: row.term.trim() && row.ru.trim() ? 'pointer' : 'default',
            background: row.term.trim() && row.ru.trim() ? 'var(--color-purple-soft)' : 'var(--color-bg-1)',
            color: row.term.trim() && row.ru.trim() ? 'var(--color-purple-text)' : 'var(--color-text-3)',
            fontSize: 12.5, fontWeight: 700,
          }}
        >
          {t('Добавить')}
        </button>
      </div>
      <input
        value={row.note ?? ''}
        onChange={e => setRow({ ...row, note: e.target.value })}
        placeholder={t('Пояснение к карточке — необязательно')}
        style={inputStyle}
      />

      {/* Пачкой: вставка из буфера. */}
      <details>
        <summary style={{ fontSize: 12, color: 'var(--color-muted)', cursor: 'pointer' }}>
          {t('Вставить списком')}
        </summary>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GrowTextarea
            value={bulk}
            onChange={setBulk}
            minHeight={90}
            placeholder={'hunter — охотник\nsalt and burn — засыпать солью и сжечь'}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
              {parseBulk(bulk).length > 0
                ? `${t('Распознано карточек:')} ${parseBulk(bulk).length}`
                : t('По строке на карточку: слово, тире, перевод.')}
            </div>
          </div>
        </div>
      </details>
    </div>
  )
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
