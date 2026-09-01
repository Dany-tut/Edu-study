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

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check, ChevronLeft, Copy, FileCode2, LayoutGrid, List, Search, Trash2, X,
} from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useStickyLift } from '../../lib/useStickyLift'
import { SUBJECTS } from '../../lib/subjects'
import {
  MATERIAL_MODES, MATERIAL_FAMILIES,
  type MaterialMode, type MaterialFamily, type MaterialItem, type MaterialBlock,
} from '../../data/trainerMaterials'
import { ContentCard, CardSkeleton } from './ContentCard'
import { SortDropdown, ShelfCount, PILL_GLASS } from './ShelfFilters'
import { cardChip } from '../../lib/pillStyles'
import SubjectPicker from './SubjectPicker'
import TeacherSelect from './TeacherSelect'
import CardGroupsManager from './CardGroupsManager'
import Skeleton from '../Skeleton'

const MAT_COLOR = 'var(--color-peach-text)'
const MAT_BG = 'var(--color-peach-soft)'

/**
 * Языки, на которых бывает тренажёр, — по реестру предметов.
 *
 * Дедуп по коду языка обязателен: «Русский» и «Литература» — разные ПРЕДМЕТЫ с
 * одним `langCode: 'ru'`, и без него в списке стояли две одинаковые строки, а
 * подпись у обеих бралась от последней. Первый выигрывает — это сам язык.
 */
const LANG_OPTIONS = SUBJECTS
  .filter(s => s.isLanguage && s.langCode)
  .filter((s, i, all) => all.findIndex(x => x.langCode === s.langCode) === i)
  .map(s => ({ value: s.langCode!, label: s.name, icon: s.icon }))

const langLabel = (code: string) => LANG_OPTIONS.find(o => o.value === code)?.label ?? code

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

export default function TrainerMaterials({ createNonce = 0 }: { createNonce?: number }) {
  const t = useT()

  // Пустая строка — «все языки», как пустой предмет в «Курсах».
  const [lang, setLang] = useState(() => localStorage.getItem('materials-lang') ?? 'ko')
  const [mode, setMode] = useState<MaterialMode | ''>(() =>
    (localStorage.getItem('materials-mode') as MaterialMode | null) ?? 'vocab')
  const [familyId, setFamilyId] = useState<string>(DECKS_ID)
  const [view, setView] = useState<'cards' | 'rows'>(() =>
    localStorage.getItem('materials-view') === 'rows' ? 'rows' : 'cards')

  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Row | null>(null)

  const [sort, setSort] = useState<SortMode>('az')
  const [level, setLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => { localStorage.setItem('materials-lang', lang) }, [lang])
  useEffect(() => { localStorage.setItem('materials-mode', mode) }, [mode])
  useEffect(() => { localStorage.setItem('materials-view', view) }, [view])

  // Всё разом: числа в панели должны встать одним движением, иначе они
  // появляются по одному и прыгают. Полка, чей чанк не доехал, отдаёт пустой
  // список и не роняет соседние — витрина без одной полки лучше пустой вкладки.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setRows([])
    const langs = lang ? [lang] : LANG_OPTIONS.map(o => o.value)
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
      setRows(chunks.flat())
      setLoading(false)
    })
    return () => { alive = false }
  }, [lang])

  const modeCount = (m: MaterialMode) => rows.reduce((n, r) => n + (r.family.mode === m ? 1 : 0), 0)

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
  useEffect(() => {
    const ids = [
      '',
      ...(mode === 'vocab' ? [DECKS_ID] : []),
      ...families.map(f => f.family.id),
    ]
    if (!ids.includes(familyId)) setFamilyId(mode === 'vocab' ? DECKS_ID : '')
    setOpen(null)
  }, [families, familyId, mode])

  const onDecks = familyId === DECKS_ID && mode === 'vocab'

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
  useEffect(() => { setLevel(''); setTopic('') }, [familyId, mode])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = scoped
    if (level) list = list.filter(x => x.level === level)
    if (topic) list = list.filter(x => x.topic === topic)
    if (q) list = list.filter(x => (x.title + ' ' + x.about).toLowerCase().includes(q))
    const out = [...list]
    if (sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'za') out.sort((a, b) => b.title.localeCompare(a.title))
    else if (sort === 'size') out.sort((a, b) => b.size - a.size)
    else out.sort((a, b) => (a.level ?? '').localeCompare(b.level ?? '') || a.title.localeCompare(b.title))
    return out
  }, [scoped, level, topic, query, sort])

  const dirty = !!(level || topic || query)
  const showLangChip = !lang
  const showFamilyChip = !familyId

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {onDecks ? (
          <CardGroupsManager createNonce={createNonce} lang={lang || undefined} />
        ) : open ? (
          <MaterialReader item={open} onBack={() => setOpen(null)} />
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SortDropdown value={sort} options={SORT_OPTS} accent={MAT_COLOR} onChange={setSort} />
              <ViewSwitch value={view} onChange={setView} />
              <ShelfCount>{shown.length} {t('материалов')}</ShelfCount>
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
            ) : shown.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: 520 }}>
                {scoped.length === 0
                  ? t('У этого языка такого материала нет. Режим виден в списке, чтобы было понятно, чего не хватает, — а не потому, что за ним что-то есть.')
                  : t('Под отбор ничего не подошло.')}
              </div>
            ) : view === 'cards' ? (
              <div style={GRID}>
                {shown.map(x => (
                  <ContentCard
                    key={`${x.lang}-${x.family.id}-${x.id}`}
                    accentColor={MAT_COLOR} accentBg={MAT_BG}
                    isSelected={false} onClick={() => setOpen(x)}
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
              <MaterialRows items={shown} grouped={!familyId} showLang={showLangChip} onOpen={setOpen} />
            )}
          </>
        )}
      </div>

      <FilterPanel
        query={query} onQuery={setQuery}
        lang={lang} onLang={v => { setLang(v); setOpen(null) }}
        mode={mode} onMode={m => { setMode(m); setFamilyId(m === 'vocab' ? DECKS_ID : ''); setOpen(null) }}
        familyId={familyId} onFamily={id => { setFamilyId(id); setOpen(null) }}
        families={families} modeCount={modeCount}
        level={level} onLevel={setLevel} levelOpts={levelOpts}
        topic={topic} onTopic={setTopic} topicOpts={topicOpts}
        dirty={dirty} onReset={() => { setLevel(''); setTopic(''); setQuery('') }}
        total={rows.length} loading={loading}
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
 * Переключатель вида. Тот же жест и та же геометрия, что у «Виджетов»:
 * сегмент из двух иконок сразу за сортировкой.
 */
function ViewSwitch({ value, onChange }: { value: 'cards' | 'rows'; onChange: (v: 'cards' | 'rows') => void }) {
  const t = useT()
  const btn = (v: 'cards' | 'rows', title: string, icon: React.ReactNode) => (
    <button
      onClick={() => onChange(v)} title={title}
      style={{
        padding: '5px 9px', borderRadius: 7, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center',
        background: value === v ? 'var(--color-surface)' : 'transparent',
        color: value === v ? MAT_COLOR : 'var(--color-text-3)',
        boxShadow: value === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.14s',
      }}
    >{icon}</button>
  )
  return (
    <div style={{ display: 'flex', padding: 2, borderRadius: 9, background: 'var(--color-bg-3)', ...PILL_GLASS, gap: 2 }}>
      {btn('cards', t('Плитками'), <LayoutGrid size={13} />)}
      {btn('rows', t('Строками'), <List size={13} />)}
    </div>
  )
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
 * Порядок сверху вниз повторяет порядок вопросов: что ищу (поиск), на каком
 * языке, в каком режиме, на какой полке, какого уровня. Режим и полка стоят
 * одним деревом: полка — это уточнение режима, а не отдельная ось.
 */
function FilterPanel({
  query, onQuery, lang, onLang, mode, onMode, familyId, onFamily, families, modeCount,
  level, onLevel, levelOpts, topic, onTopic, topicOpts, dirty, onReset, total, loading,
}: {
  query: string; onQuery: (v: string) => void
  lang: string; onLang: (v: string) => void
  mode: MaterialMode | ''; onMode: (v: MaterialMode | '') => void
  familyId: string; onFamily: (v: string) => void
  families: { family: MaterialFamily; count: number }[]
  modeCount: (m: MaterialMode) => number
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

      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)' }} />
        <input
          value={query} onChange={e => onQuery(e.target.value)} placeholder={t('Поиск по названию…')}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 30px', borderRadius: 11,
            border: 'none', fontSize: 13, color: 'var(--color-text)',
            background: 'var(--color-bg-2)', outline: 'none', fontFamily: 'inherit',
          }}
        />
        {query && (
          <button onClick={() => onQuery('')}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-3)', display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Язык — тот же адаптивный контрол, что «Предмет» в банке заданий:
          «Все» первым пунктом, форма меняется от числа опций. */}
      <SubjectPicker
        options={[
          { value: '', label: t('Все языки') },
          ...LANG_OPTIONS.map(o => ({ value: o.value, label: t(o.label), icon: o.icon })),
        ]}
        value={lang}
        onChange={onLang}
        accent={MAT_COLOR} accentBg={MAT_BG} activeColor={MAT_COLOR}
        ariaLabel={t('Язык')}
      />

      <div>
        <PanelLabel>{t('Режим')}</PanelLabel>
        <NavRow label={t('Все')} on={!mode} onClick={() => onMode('')} />
        {MATERIAL_MODES.map(m => {
          const on = m.id === mode
          const n = modeCount(m.id)
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
                    <NavRow small label={t('Подборки')} on={familyId === DECKS_ID} onClick={() => onFamily(DECKS_ID)} />
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
        {loading ? t('Считаем…') : <>{total} {t('материалов в базе')}</>}
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
 * Просмотрщик материала.
 *
 * ЧИТАТЬ, А НЕ ПРАВИТЬ. Поле ввода над константой сохраняло бы в никуда, поэтому
 * вместо кнопки «Сохранить» — путь к файлу, по которому материал действительно
 * меняется, и он копируется по клику: адрес нужен не глазам, а редактору.
 * У справочника грамматики путь ещё и уточняется по языку (`sourceOf`) —
 * «src/data/grammar/» называет папку, а правка делается в файле языка.
 *
 * ЦЕЛИКОМ, А НЕ ОДНИМ АБЗАЦЕМ. Раньше просмотрщик показывал только `body`:
 * карточка формы обещала «8 примеров · 2 вопроса», открывалась — и там три
 * абзаца объяснения, полстраницы пустоты и ни одного примера. Теперь материал
 * отдаёт блоки (см. MaterialBlock), и видно всё, что у него есть.
 *
 * ШИРИНА ПО СОДЕРЖИМОМУ. Проза держит читаемую строку в 68 знаков, а пары,
 * таблицы и вопросы разложены колонками во всю ширину: сорок пар «слово —
 * перевод» столбиком в треть экрана — это четыре экрана прокрутки там, где
 * хватает одного.
 */
function MaterialReader({ item, onBack }: { item: Row; onBack: () => void }) {
  const t = useT()
  const path = item.family.sourceOf?.(item.lang) ?? item.family.source
  const [copied, setCopied] = useState(false)
  const blocks = item.blocks ?? []

  const copyPath = () => {
    void navigator.clipboard?.writeText(path).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }).catch(() => {})
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
            borderRadius: 12, border: '1px solid var(--color-border-soft)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-text-2)', fontFamily: 'inherit',
            fontSize: 12.5, fontWeight: 600,
          }}
        >
          <ChevronLeft size={14} /> {t('К материалам')}
        </button>
        <span style={cardChip(MAT_COLOR)}>{t('Из кода')}</span>
        <button
          onClick={copyPath}
          title={t('Скопировать путь к файлу')}
          style={{
            ...cardChip('var(--color-text-3)', { fontFamily: 'ui-monospace, monospace' }),
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: 'none', cursor: 'pointer', fontSize: 11.5,
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? t('Путь скопирован') : path}
        </button>
      </div>

      <div style={{
        borderRadius: 18, padding: 20,
        background: 'rgba(var(--glass-rgb), 0.88)', ...PILL_GLASS,
        border: '1px solid var(--color-border-glass)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={cardChip('var(--color-text-3)')}>{langLabel(item.lang)}</span>
          {item.level && <span style={cardChip(MAT_COLOR)}>{item.level}</span>}
          {item.topic && <span style={cardChip('var(--color-text-3)')}>{item.topic}</span>}
          <span style={cardChip('var(--color-text-3)')}>{item.meta}</span>
        </div>
        {item.body ? (
          <div style={PROSE}>{item.body}</div>
        ) : blocks.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
            {item.about || t('У этого материала нет текста — он собирается в тренажёре из своих частей.')}
          </div>
        ) : null}

        {blocks.map((b, i) => <BlockView key={i} block={b} />)}
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
