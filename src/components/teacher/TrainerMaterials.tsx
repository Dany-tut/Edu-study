// ─────────────────────────────────────────────────────────────────────────────
// «Материалы» — зеркало тренажёра в кабинете учителя
//
// ПОЧЕМУ РЕЙЛ ПОВТОРЯЕТ РЕЙЛ УЧЕНИКА. Учитель приходит сюда с вопросом «что он
// там вообще видит». Ответить на него можно только тем же списком и в том же
// порядке. Любая своя раскладка — по файлам, по типам, по алфавиту —
// заставляет держать в голове перевод из одной картины мира в другую, и вопрос
// остаётся без ответа.
//
// ЧИСЛА ПРИ ЭТОМ СЧИТАЮТ РАЗНОЕ, и врать об этом нельзя. Здесь число — сколько
// МАТЕРИАЛОВ на полках режима (24 текста, 21 произведение, 52 материала ленты),
// у ученика в рейле — сколько ШТУК он откроет (сцены поштучно, разговорник
// фразами), поэтому «Чтение» у него 158, а тут 97. Подогнать одно под другое
// значило бы либо тащить сюда полные тексты сцен ради цифры, либо считать
// плитки там, где ученик считает материал. Разницу объясняет подпись под
// рейлом — это дешевле и честнее подгонки.
//
// ЧТО МОЖНО, А ЧЕГО НЕЛЬЗЯ. Всё, кроме подборок, приезжает из кода: перечислить,
// отобрать, открыть и прочитать — да; править — нет. Форма ввода над константой
// сохраняла бы в никуда, поэтому её здесь и нет, а вместо неё чип «Из кода» и
// путь к файлу. Обещание, которого интерфейс не держит, хуже честного отказа.
//
// ГРУЗИТСЯ ВСЁ РАЗОМ И ЛЕНИВО. Семьи тянутся параллельно при выборе языка —
// иначе числа в рейле появлялись бы по одному и прыгали. До загрузки стоят
// скелетоны, а не нули: ноль читается как «раздел пустой».
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, FileCode2, Layers, Search } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { SUBJECTS } from '../../lib/subjects'
import {
  MATERIAL_MODES, MATERIAL_FAMILIES, familiesOfMode,
  type MaterialMode, type MaterialFamily, type MaterialItem,
} from '../../data/trainerMaterials'
import { ContentCard, CardSkeleton } from './ContentCard'
import { SortDropdown, FacetDropdown, ShelfCount } from './ShelfFilters'
import { cardChip } from '../../lib/pillStyles'
import CardGroupsManager from './CardGroupsManager'
import Skeleton from '../Skeleton'

const MAT_COLOR = 'var(--color-peach-text)'
const MAT_BG = 'var(--color-peach-soft)'

/**
 * Языки, на которых бывает тренажёр, — по реестру предметов.
 *
 * Дедуп по коду языка обязателен: «Русский» и «Литература» — разные ПРЕДМЕТЫ с
 * одним `langCode: 'ru'`, и без него в списке стояли две одинаковые строки, а
 * подпись у обеих бралась от последней («📖 Литература» вместо «📝 Русский»).
 * Первый выигрывает — это сам язык, литература идёт курсом поверх него.
 */
const LANG_OPTIONS = SUBJECTS
  .filter(s => s.isLanguage && s.langCode)
  .filter((s, i, all) => all.findIndex(x => x.langCode === s.langCode) === i)
  .map(s => ({ value: s.langCode!, label: `${s.icon} ${s.name}` }))

type SortMode = 'az' | 'za' | 'size' | 'level'
const SORT_OPTS: [SortMode, string][] = [
  ['az', 'А → Я'], ['za', 'Я → А'], ['size', 'По объёму'], ['level', 'По уровню'],
]

/**
 * Псевдо-семья подборок.
 *
 * В реестре её нет и быть не должно (она из базы и правится), но в рейле она
 * обязана стоять первой среди «Карточек»: это единственное, что учитель может
 * тут не только прочитать. Отдельная ветка рендера — цена за то, чтобы не
 * притворяться, будто редактируемое и нередактируемое устроены одинаково.
 */
const DECKS_ID = '__decks'

export default function TrainerMaterials({ createNonce = 0 }: { createNonce?: number }) {
  const t = useT()
  const [lang, setLang] = useState(() => localStorage.getItem('materials-lang') || 'ko')
  const [mode, setMode] = useState<MaterialMode>(() =>
    (localStorage.getItem('materials-mode') as MaterialMode) || 'vocab')
  const [familyId, setFamilyId] = useState<string>(DECKS_ID)

  const [byFamily, setByFamily] = useState<Record<string, MaterialItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<MaterialItem | null>(null)

  const [sort, setSort] = useState<SortMode>('az')
  const [level, setLevel] = useState('')
  const [topic, setTopic] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => { localStorage.setItem('materials-lang', lang) }, [lang])
  useEffect(() => { localStorage.setItem('materials-mode', mode) }, [mode])

  // Все семьи разом: числа в рейле должны встать одним движением. Семья, чей
  // чанк не доехал, отдаёт пустой список и не роняет остальные — витрина без
  // одной полки лучше, чем пустая вкладка.
  useEffect(() => {
    let alive = true
    setLoading(true)
    setByFamily({})
    void Promise.all(
      MATERIAL_FAMILIES.map(async f => {
        try { return [f.id, await f.load(lang)] as const }
        catch (e) { console.error(`materials: ${f.id}`, e); return [f.id, [] as MaterialItem[]] as const }
      }),
    ).then(pairs => {
      if (!alive) return
      setByFamily(Object.fromEntries(pairs))
      setLoading(false)
    })
    return () => { alive = false }
  }, [lang])

  /** Сколько материалов в режиме — сумма по его семьям. */
  const modeCount = (m: MaterialMode) =>
    familiesOfMode(m).reduce((n, f) => n + (byFamily[f.id]?.length ?? 0), 0)

  // Семьи режима, из которых есть что показать. Пустая полка не рисуется по
  // тому же правилу, что и у ученика: у японского нет корней слов, и вкладка
  // под них обещала бы несуществующее.
  const families: (MaterialFamily | null)[] = useMemo(() => {
    const list = familiesOfMode(mode).filter(f => (byFamily[f.id]?.length ?? 0) > 0 || loading)
    // null — место подборок: они первыми в «Карточках».
    return mode === 'vocab' ? [null, ...list] : list
  }, [mode, byFamily, loading])

  // Выбранная семья могла исчезнуть вместе со сменой режима или языка. Пустой
  // режим (у русского нет аудирования) оставляем БЕЗ семьи: откат к первой из
  // списка приводил в «Подборки» — редактор карточек под вывеской «Аудирование».
  useEffect(() => {
    const ids = families.map(f => f?.id ?? DECKS_ID)
    if (!ids.includes(familyId)) setFamilyId(ids[0] ?? '')
    setOpen(null)
  }, [families, familyId])

  const family = MATERIAL_FAMILIES.find(f => f.id === familyId) ?? null
  const items = family ? byFamily[family.id] ?? [] : []

  const levelOpts = useMemo(
    () => [...new Set(items.map(x => x.level).filter((x): x is string => !!x))].sort(),
    [items],
  )
  const topicOpts = useMemo(
    () => [...new Set(items.map(x => x.topic).filter((x): x is string => !!x))].sort(),
    [items],
  )

  // Отбор сбрасывается при смене полки: уровень «TOPIK 2» в списке учебников
  // не значит ничего, и витрина молча оказалась бы пустой.
  useEffect(() => { setLevel(''); setTopic(''); setQuery('') }, [familyId])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = items
    if (level) list = list.filter(x => x.level === level)
    if (topic) list = list.filter(x => x.topic === topic)
    if (q) list = list.filter(x => (x.title + ' ' + x.about).toLowerCase().includes(q))
    const out = [...list]
    if (sort === 'az') out.sort((a, b) => a.title.localeCompare(b.title))
    else if (sort === 'za') out.sort((a, b) => b.title.localeCompare(a.title))
    else if (sort === 'size') out.sort((a, b) => b.size - a.size)
    else out.sort((a, b) => (a.level ?? '').localeCompare(b.level ?? '') || a.title.localeCompare(b.title))
    return out
  }, [items, level, topic, query, sort])

  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* ── Рейл режимов: тот же список и тот же порядок, что у ученика ─────── */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FacetDropdown
          value={lang} options={LANG_OPTIONS.map(o => o.value)} allLabel={t('Язык')}
          accent={MAT_COLOR} minWidth={104} noAll
          labels={Object.fromEntries(LANG_OPTIONS.map(o => [o.value, o.label]))}
          icon={<Layers size={12} />}
          onChange={v => setLang(v || lang)}
        />

        <div style={{
          borderRadius: 18, padding: 8,
          background: 'rgba(var(--glass-rgb), 0.88)',
          backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid var(--color-border-glass)',
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {MATERIAL_MODES.map(m => {
            const on = m.id === mode
            const n = modeCount(m.id)
            return (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setOpen(null) }}
                title={t(m.hint)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13.5, fontWeight: on ? 700 : 500,
                  background: on ? MAT_BG : 'transparent',
                  color: on ? MAT_COLOR : 'var(--color-text-2)',
                  transition: 'all 0.14s',
                }}
              >
                <span style={{ flex: 1, textAlign: 'left' }}>{t(m.label)}</span>
                {/* Скелетон, а не ноль: ноль читается как «раздел пустой». */}
                {loading
                  ? <Skeleton w={26} h={11} radius={5} />
                  : <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? MAT_COLOR : 'var(--color-text-3)' }}>{n || ''}</span>}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.5, padding: '0 4px' }}>
          {t('Тот же рейл, что видит ученик. Число — сколько материалов на полках режима; у ученика в рейле счёт мельче: сцены поштучно, разговорник — фразами. Правятся из кабинета только «Подборки», остальное приезжает с кодом.')}
        </div>
      </div>

      {/* ── Витрина выбранной полки ────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {families.length > 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {families.map(f => {
              const id = f?.id ?? DECKS_ID
              const on = id === familyId
              const n = f ? byFamily[f.id]?.length ?? 0 : undefined
              return (
                <button
                  key={id}
                  onClick={() => { setFamilyId(id); setOpen(null) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    height: 34, boxSizing: 'border-box', padding: '0 14px',
                    borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                    border: on ? '1px solid transparent' : '1px solid var(--color-border-soft)',
                    background: on ? MAT_BG : 'transparent',
                    color: on ? MAT_COLOR : 'var(--color-muted)',
                    fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
                  }}
                >
                  {f ? t(f.label) : t('Подборки')}
                  {n !== undefined && <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', fontWeight: 600 }}>{n}</span>}
                </button>
              )
            })}
          </div>
        )}

        {familyId === DECKS_ID && mode === 'vocab' ? (
          <CardGroupsManager createNonce={createNonce} lang={lang} />
        ) : !family && !loading ? (
          <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6, maxWidth: 520 }}>
            {t('У этого языка такого материала нет. Режим виден в списке, чтобы было понятно, чего не хватает, — а не потому, что за ним что-то есть.')}
          </div>
        ) : open ? (
          <MaterialReader item={open} family={family} onBack={() => setOpen(null)} />
        ) : (
          <>
            {family && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.5, maxWidth: 620 }}>
                  {t(family.hint)}
                </div>
                <span style={cardChip('var(--color-text-3)', { fontFamily: 'ui-monospace, monospace' })}>
                  {family.source}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SortDropdown value={sort} options={SORT_OPTS} accent={MAT_COLOR} onChange={setSort} />
              <FacetDropdown
                value={level} options={levelOpts} allLabel={t('Все уровни')} accent={MAT_COLOR}
                icon={<Layers size={12} />} minWidth={72} onChange={setLevel}
              />
              <FacetDropdown
                value={topic} options={topicOpts} allLabel={t('Все разделы')} accent={MAT_COLOR}
                icon={<Layers size={12} />} minWidth={92} searchable onChange={setTopic}
              />
              {/* Поиск по тексту — как в банке заданий: у грамматики 85 форм, у
                  ленты сотни материалов, глазами там не найти. */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} style={{ position: 'absolute', left: 11, color: 'var(--color-text-3)' }} />
                <input
                  value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={t('Поиск по названию')}
                  style={{
                    height: 30, boxSizing: 'border-box', padding: '0 12px 0 29px', borderRadius: 999,
                    border: '1px solid var(--color-border)', background: 'rgba(var(--glass-rgb), 0.92)',
                    fontSize: 12, color: 'var(--color-text)', fontFamily: 'inherit', outline: 'none', width: 180,
                  }}
                />
              </div>
              <ShelfCount>{shown.length} {t('материалов')}</ShelfCount>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {loading
                ? Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} />)
                : shown.map(x => (
                  <ContentCard
                    key={x.id}
                    accentColor={MAT_COLOR} accentBg={MAT_BG}
                    isSelected={false} onClick={() => setOpen(x)}
                    icon={<FileCode2 size={17} strokeWidth={2} style={{ color: MAT_COLOR }} />}
                    iconBg={MAT_BG}
                    badge={x.level ? <span style={cardChip(MAT_COLOR)}>{x.level}</span> : undefined}
                    title={x.title}
                    subtitle={x.about}
                    footerLeft={<span>{x.meta}</span>}
                    footerRight={<>{x.topic ?? ''}</>}
                  />
                ))}
              {!loading && shown.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                  {items.length === 0
                    ? t('У этого языка такого материала нет.')
                    : t('Под отбор ничего не подошло.')}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Просмотрщик материала.
 *
 * Читать, а не править: поле ввода здесь сохраняло бы в никуда. Вместо кнопки
 * «Сохранить» — путь к файлу, по которому материал действительно меняется.
 */
function MaterialReader({ item, family, onBack }: {
  item: MaterialItem; family: MaterialFamily | null; onBack: () => void
}) {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
        {family && (
          <span style={cardChip('var(--color-text-3)', { fontFamily: 'ui-monospace, monospace' })}>
            {family.source}
          </span>
        )}
      </div>

      <div style={{
        borderRadius: 18, padding: 20,
        background: 'rgba(var(--glass-rgb), 0.88)',
        backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid var(--color-border-glass)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
          {item.title}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.level && <span style={cardChip(MAT_COLOR)}>{item.level}</span>}
          {item.topic && <span style={cardChip('var(--color-text-3)')}>{item.topic}</span>}
          <span style={cardChip('var(--color-text-3)')}>{item.meta}</span>
        </div>
        {item.body ? (
          <div style={{
            fontSize: 14, lineHeight: 1.7, color: 'var(--color-text)',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {item.body}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.6 }}>
            {item.about || t('У этого материала нет текста — он собирается в тренажёре из своих частей.')}
          </div>
        )}
      </div>
    </div>
  )
}
