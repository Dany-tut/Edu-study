// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — разговорник
//
// ЧТО ЭТО. Готовые фразы по ситуациям: «в аптеке», «виза», «первые пять минут».
// Книга ленивая (≈100 КБ на язык, см. data/survivalBooks.ts), но грузится
// ЗДЕСЬ, а не внутри витрины: рейл показывает полки со счётчиками и должен
// знать их до того, как отрисуется содержимое справа.
//
// ЧТО ОСТАЛОСЬ СНАРУЖИ — И ПОЧЕМУ. Сетка и строка управления общие с наборами
// учителя: для ученика набор есть набор, откуда бы он ни пришёл, и вторая
// таблетка рядом заставляла бы помнить, в какой из двух витрин лежит нужная
// стопка. Поэтому наружу отдаются плитки (`decks`), список полок для общей
// карточки «Материал» и меню сортировки — а собирает из них экран тренажёр.
//
// СТУПЕНЬ ПОДПИСЫВАЕТСЯ В ШКАЛЕ ПРЕДМЕТА (TOPIK у корейского, JLPT у японского),
// и фильтр работает по подписи, а не по букве CEFR: иначе в списке стояло бы
// «B1», а на карточке «TOPIK 3급», и это читалось бы как два разных фильтра.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Layers, Sparkle } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import {
  RailCard, RailList, RailStat, SortMenu, Toolbar, ToolCount, StatusTabs,
} from '../TrainerShell'
import {
  ThemeSession, BackToSets, TakeWholeTheme, DeckHint, themeStats,
  type PhraseView, type RunMode,
} from '../../PhraseDecks'
import { loadSurvivalBook } from '../../../data/survivalBooks'
import {
  survivalShelves, survivalLevelLabel, SURVIVAL_LEVELS,
  type SurvivalBook, type SurvivalThemeCards,
} from '../../../data/survivalPhrases'
import { reachLevelIndex } from '../../../lib/courseReach'
import type { CardState } from '../../../data/reviewDeck'

const SORTS = [
  { value: 'order', label: 'По порядку' },
  { value: 'level', label: 'По уровню' },
  { value: 'size', label: 'По размеру' },
  { value: 'progress', label: 'По прогрессу' },
]

/** Пересечение выбранного списка со значением. Пустой список = «все». */
const anyOf = (picked: string[], value: string) => picked.length === 0 || picked.includes(value)

/** Плитка витрины: тема, её фразы, подпись ступени и «на вырост ли она». */
export interface ThemeDeck {
  theme: { id: string; title: string }
  phrases: SurvivalThemeCards['phrases']
  label: string
  ahead: boolean
}

export interface SurvivalShelf {
  /** Книга. undefined — ещё едет, null — для этого языка её нет. */
  book: SurvivalBook | null | undefined
  /** Все темы книги — по ним считаются бейджи режима и подпись предмета. */
  themes: SurvivalThemeCards[]
  /** Термины разговорника: их вычитает из себя личный словарь. */
  phrases: Set<string>
  /** Плитки тем под общую сетку — уже просеянные и отсортированные. */
  decks: ThemeDeck[]
  /** Ступени, которые встречаются среди тем, — для общего фильтра. */
  levelOpts: string[]
  /** Сколько тем на ступени — цифра в пункте фильтра. */
  levelCount: (label: string) => number
  /** Выбрана ли полка — от этого зависит «Сбросить» в общем рейле. */
  shelfPicked: boolean
  resetShelf: () => void
  /** Список полок для общей карточки «Материал». */
  railList: React.ReactNode
  /** Меню сортировки для общей строки управления. */
  sortMenu: React.ReactNode
  /** Открытая тема. Поле общее со словарём — см. MY_WORDS_ID в тренажёре. */
  openId: string | null
  setOpenId: (v: string | null) => void
  openItem: SurvivalThemeCards | null
  /** Карточки рейла открытой темы: формула и числа памяти. */
  rail: React.ReactNode
  /** Строка управления открытой темы. */
  toolbar: React.ReactNode
  /** Стопка открытой темы. */
  content: React.ReactNode
}

export function useSurvivalShelf({
  lang, subject, subjectId, owner, accent, soft, hasBook, inGroup,
  query, status, fLevel, reach, states, statesReady, run, onRun, phraseView,
  onGraded, onAdded, runTabsRef, tourExtra,
}: {
  lang: string
  subject: string
  subjectId: string
  owner: { studentId?: string; anonName?: string }
  accent: string
  soft: string
  /** Есть ли книга у языка — синхронный ответ реестра, его знает тренажёр. */
  hasBook: boolean
  /** Открыта ли папка-полка учителя: внутри неё разговорника нет. */
  inGroup: boolean
  query: string
  status: string
  fLevel: string[]
  /** Докуда открыт курс: темы выше гасятся и уезжают в конец сетки. */
  reach: number
  states: Map<string, CardState>
  statesReady: boolean
  run: RunMode
  onRun: (v: RunMode) => void
  phraseView: PhraseView
  onGraded: (prompt: string, st: CardState) => void
  /** Тему забрали в колоду целиком — словарь надо перечитать. */
  onAdded: () => void
  /** Якорь онбординга: шаг рассказывает про этот переключатель. */
  runTabsRef: React.RefObject<HTMLDivElement | null>
  tourExtra?: React.ComponentProps<typeof ThemeSession>['tourExtra']
}): SurvivalShelf {
  const t = useT()

  const [book, setBook] = useState<SurvivalBook | null | undefined>(undefined)
  useEffect(() => {
    if (!hasBook) { setBook(null); return }
    let alive = true
    setBook(undefined)
    loadSurvivalBook(lang).then(b => { if (alive) setBook(b ?? null) })
    return () => { alive = false }
  }, [hasBook, lang])

  const shelves = useMemo(() => survivalShelves(book ?? undefined), [book])
  const themes = useMemo(() => shelves.flatMap(s => s.themes), [shelves])

  // Фразы разговорника — то, чего в личном словаре быть не должно: они уже
  // разложены по своим плиткам, и словарь с ними стал бы копией всей витрины.
  const phrases = useMemo(
    () => new Set(themes.flatMap(x => x.phrases.map(p => p.term))),
    [themes],
  )

  const [shelf, setShelf] = useState('')
  const [sort, setSort] = useState('order')
  // Открытая тема переживает F5 по той же причине, что и текст.
  const [openId, setOpenId] = usePersistentState<string | null>(`trainer.${lang}.theme`, null)
  const openItem = useMemo(
    () => themes.find(x => x.theme.id === openId) ?? null,
    [themes, openId],
  )
  const openStats = useMemo(
    () => (openItem ? themeStats(openItem, states) : { total: 0, fresh: 0, learning: 0, learned: 0, due: 0, lapses: 0, pct: 0 }),
    [openItem, states],
  )

  const themeLevel = useMemo(
    () => (x: SurvivalThemeCards) => survivalLevelLabel(x.theme.level, subject),
    [subject],
  )
  const levelOpts = useMemo(() => {
    const found = new Set(themes.map(x => x.theme.level))
    return SURVIVAL_LEVELS.filter(l => found.has(l)).map(l => survivalLevelLabel(l, subject))
  }, [themes, subject])

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
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Поиск идёт по всем полкам и молча снимает выбор слева: человек, который
    // ищет «аптеку», не должен ещё и угадывать, в каком она разделе.
    const base = q
      ? themes
      : (shelf ? (shelves.find(s => s.title === shelf)?.themes ?? []) : themes)

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
  }, [themes, shelves, shelf, query, status, sort, states, fLevel, themeLevel, themeAhead])

  // Внутри папки учителя разговорника нет: он был бы чужим материалом,
  // приехавшим без спроса на её этаж.
  const decks: ThemeDeck[] = useMemo(
    () => (!hasBook || inGroup ? [] : visible.map(x => ({
      theme: x.theme as { id: string; title: string },
      phrases: x.phrases,
      label: themeLevel(x),
      ahead: themeAhead(x),
    }))),
    [hasBook, inGroup, visible, themeLevel, themeAhead],
  )

  const railList = shelves.length === 0 ? null : (
    <RailList
      items={shelves.map(s => ({ id: s.title, label: t(s.title), hint: String(s.count) }))}
      value={shelf}
      onChange={v => setShelf(v === shelf ? '' : v)}
      accent={accent}
      soft={soft}
    />
  )

  const sortMenu = <SortMenu options={SORTS} value={sort} onChange={setSort} accent={accent} soft={soft} />

  const rail = !openItem ? null : (
    <>
      <RailCard title="Формула темы" accent={accent} icon={<Sparkle size={15} />}>
        {book?.notes[openItem.theme.id] ? (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: accent, lineHeight: 1.45 }}>
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
      <RailCard title="Тема" accent={accent} icon={<Layers size={15} />}>
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
          accent={accent}
          onAdded={onAdded}
        />
      </RailCard>
    </>
  )

  const toolbar = !openItem ? null : (
    <Toolbar>
      <BackToSets onBack={() => setOpenId(null)} />
      {/* Обёртка ради ref: про этот переключатель рассказывает онбординг
          стопки, а он живёт внутри CardDeck и своей строки управления не
          видит. Шаг уезжает туда через ThemeSession (см. runTourStep). */}
      <div ref={runTabsRef} style={{ display: 'flex' }}>
        <StatusTabs
          options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
          value={run}
          onChange={v => onRun(v as RunMode)}
          accent={accent}
        />
      </div>
      <ToolCount>{t(openItem.theme.title)}</ToolCount>
    </Toolbar>
  )

  const content = !openItem || !book ? null : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ThemeSession
        book={book}
        item={openItem}
        lang={lang}
        subjectId={subjectId}
        accent={accent}
        owner={owner}
        view={phraseView}
        run={run}
        states={states}
        statesReady={statesReady}
        onGraded={onGraded}
        tourExtra={tourExtra}
      />
      {run === 'swipe' && <DeckHint />}
    </div>
  )

  return {
    book,
    themes,
    phrases,
    decks,
    levelOpts,
    levelCount: label => themes.filter(x => themeLevel(x) === label).length,
    shelfPicked: !!shelf,
    resetShelf: () => setShelf(''),
    railList,
    sortMenu,
    openId,
    setOpenId,
    openItem,
    rail,
    toolbar,
    content,
  }
}
