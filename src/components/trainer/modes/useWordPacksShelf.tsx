// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — наборы слов
//
// ЧТО ЭТО. Разговорник отвечает на вопрос «что сказать в этой ситуации», набор
// — на вопрос «дайте мне все слова про еду разом» (см. data/wordPacks.ts).
// Книга ленивая: две сотни слов не должны ехать тому, кто читает тексты.
//
// ЧТО СВОЁ, А ЧТО ОБЩЕЕ. Свои у половины книга, полки, витрина, сито и открытый
// набор. Общая — память колоды: набор проходится той же стопкой и тем же
// расписанием, что и тема разговорника, поэтому `states`/`onGraded` приходят
// снаружи, а не заводятся здесь. Заводить их заново значило бы развести две
// копии одной памяти — слово, выученное в наборе, перестало бы считаться
// выученным в разговорнике.
//
// ПОЛКА СТОИТ В РЕЙЛЕ, НО РЕЙЛ НЕ ЗДЕСЬ. Карточка «Материал» одна на все
// половины вкладки, поэтому сюда уехал только её список полок (`railList`) —
// саму карточку рисует тренажёр.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import Skeleton from '../../Skeleton'
import {
  Toolbar, ToolCount, SearchPill, FilterMenu, StatusTabs, RailList,
} from '../TrainerShell'
import PhraseDecks, {
  PhraseRun, BackToSets, themeStats,
  type PhraseView, type RunMode,
} from '../../PhraseDecks'
import { hasWordPacks, loadWordPacks } from '../../../data/wordPackBooks'
import { allPacks, wordPackShelves, type WordPackBook } from '../../../data/wordPacks'
import { survivalLevelLabel, SURVIVAL_LEVELS } from '../../../data/survivalPhrases'
import type { CardState } from '../../../data/reviewDeck'

/** Пересечение выбранного списка со значением. Пустой список = «все». */
const anyOf = (picked: string[], value: string) => picked.length === 0 || picked.includes(value)

export interface WordPacksShelf {
  /** Есть ли наборы слов у этого языка. */
  on: boolean
  /** Открытый набор — по нему собирается адрес экрана. */
  openId: string | null
  setOpenId: (id: string | null) => void
  /** Открыт ли сейчас набор (а не витрина) — от этого зависит вид строки. */
  open: boolean
  /** Список полок в общей карточке «Материал». */
  railList: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  /** Выбрана ли полка — от этого зависит кнопка «Сбросить» в общем рейле. */
  shelfPicked: boolean
  /** Уход с половины сбрасывает выбранную полку. */
  reset: () => void
}

export function useWordPacksShelf({
  lang, subject, subjectId, accent, soft, active, query, onQuery, status, onStatus,
  fLevel, onFLevel, run, onRun, phraseView, states, statesReady, onGraded, owner,
}: {
  lang: string
  /** Предмет нужен ради названий ступеней: у языка они не те, что у биологии. */
  subject: string
  subjectId: string
  accent: string
  soft: string
  active: boolean
  query: string
  onQuery: (v: string) => void
  status: string
  onStatus: (v: string) => void
  fLevel: string[]
  onFLevel: React.Dispatch<React.SetStateAction<string[]>>
  run: RunMode
  onRun: (v: RunMode) => void
  phraseView: PhraseView
  /** Память колоды — общая на всю вкладку, см. шапку файла. */
  states: Map<string, CardState>
  statesReady: boolean
  onGraded: (prompt: string, st: CardState) => void
  owner: { studentId?: string; anonName?: string }
}): WordPacksShelf {
  const t = useT()

  const on = useMemo(() => hasWordPacks(lang), [lang])
  const [book, setBook] = useState<WordPackBook | null | undefined>(undefined)
  useEffect(() => {
    if (!on) { setBook(null); return }
    let alive = true
    setBook(undefined)
    loadWordPacks(lang).then(b => { if (alive) setBook(b ?? null) })
    return () => { alive = false }
  }, [on, lang])

  const shelves = useMemo(() => wordPackShelves(book ?? undefined), [book])
  const packs = useMemo(() => allPacks(book ?? undefined), [book])
  const [shelf, setShelf] = useState('')
  const [openId, setOpenId] = usePersistentState<string | null>(`trainer.${lang}.pack`, null)
  const open = useMemo(() => packs.find(p => p.id === openId) ?? null, [packs, openId])

  /**
   * Наборы под витрину.
   *
   * Форма — стопка витрины (DeckCard): имя и список карточек. Ничего больше
   * PhraseDecks и не спрашивает, поэтому наборы показываются той же витриной,
   * что и разговорник, без второй её копии. Сам набор остаётся рядом в `pack`
   * — из него берутся ступень, тема и описание.
   */
  const decks = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Поиск идёт по всем полкам и снимает выбор слева: человек ищет «острый»,
    // а не «в каком разделе лежит острый».
    const base = q
      ? packs
      : (shelf ? (shelves.find(x => x.title === shelf)?.packs ?? []) : packs)
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
  }, [packs, shelves, shelf, query, status, states, fLevel, subject])

  /** Ступени, которые вообще встречаются среди наборов, — для фильтра. */
  const levelOpts = useMemo(() => {
    const found = new Set(packs.map(p => p.level))
    return SURVIVAL_LEVELS.filter(l => found.has(l)).map(l => survivalLevelLabel(l, subject))
  }, [packs, subject])

  const railList = !active || shelves.length === 0 ? null : (
    <RailList
      items={shelves.map(x => ({ id: x.title, label: t(x.title), sub: t(x.subtitle), hint: String(x.count) }))}
      value={shelf}
      onChange={v => setShelf(v === shelf ? '' : v)}
      accent={accent}
      soft={soft}
    />
  )

  const toolbar = !active ? null : open ? (
    <Toolbar>
      <BackToSets onBack={() => setOpenId(null)} />
      <StatusTabs
        options={[{ value: 'swipe', label: 'Свайп' }, { value: 'list', label: 'Списком' }]}
        value={run}
        onChange={v => onRun(v as RunMode)}
        accent={accent}
      />
      <ToolCount>{t(open.title)}</ToolCount>
    </Toolbar>
  ) : (
    <Toolbar count={decks.length}>
      <SearchPill value={query} onChange={onQuery} placeholder={t('Найти слово или набор…')} />
      {levelOpts.length > 1 && (
        <FilterMenu
          label="Уровень"
          options={levelOpts.map(l => ({
            value: l, label: l,
            count: packs.filter(x => survivalLevelLabel(x.level, subject) === l).length,
          }))}
          value={fLevel}
          onChange={onFLevel}
          accent={accent}
          soft={soft}
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
        onChange={onStatus}
        accent={accent}
      />
      <ToolCount>
        {decks.reduce((n, x) => n + x.phrases.length, 0)} {t('слов')} · {decks.length} {t('наборов')}
      </ToolCount>
    </Toolbar>
  )

  const content = !active ? null : open ? (
    <PhraseRun
      runId={`${book?.key ?? 'wp'}-${open.id}`}
      phrases={open.words}
      label={open.title}
      // Стикер за чистый прогон — как у темы разговорника: набор такая же
      // стопка, и повод для награды у них один.
      reward={{ key: `wp:${book?.key ?? 'wp'}:${open.id}`, title: open.title, size: open.words.length }}
      doneTitle="Набор пройден"
      emptyTitle="На сегодня набор закрыт"
      emptyText={'Все слова набора уже разобраны и ждут своего дня.\nМожно прогнать его заново — расписание при этом продолжит считаться.'}
      lang={lang}
      subjectId={subjectId}
      accent={accent}
      owner={owner}
      view={phraseView}
      run={run}
      states={states}
      statesReady={statesReady}
      onGraded={onGraded}
    />
  ) : book === undefined ? (
    <Skeleton.Text lines={4} style={{ maxWidth: 420 }} />
  ) : (
    <PhraseDecks
      themes={decks}
      states={states}
      accent={accent}
      soft={soft}
      levelLabel={x => survivalLevelLabel(x.pack.level, subject)}
      onOpen={id => { setOpenId(id); onQuery(''); onStatus(''); onRun('list') }}
    />
  )

  return {
    on,
    openId,
    setOpenId,
    open: !!open,
    railList,
    toolbar,
    content,
    shelfPicked: !!shelf,
    reset: () => setShelf(''),
  }
}
