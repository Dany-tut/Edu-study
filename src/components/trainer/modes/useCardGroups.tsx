// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — наборы учителя и свои подборки
//
// ЕДИНСТВЕННЫЙ МАТЕРИАЛ, КОТОРЫЙ ЗАВОДЯТ ЛЮДИ, А НЕ КОД. Учитель собирает
// группу в Конструкторе («Сверхъестественное» → набор на сезон), ученик
// проходит её здесь. Рядом едут подборки-сиды: без них витрина у нового
// ученика была бы пуста до тех пор, пока кто-нибудь что-нибудь не заведёт
// (см. data/cardGroupSeeds.ts). Группа из БД и группа из кода здесь
// неразличимы намеренно: витрине нужны имя набора и список карточек.
//
// ЧЕТЫРЕ ЭТАЖА. Полка (названная группа) → набор → стопка-серия → прогон.
// Полка — это НАВИГАЦИЯ, а не сито: она меняет экран, а не сужает текущий.
// Обёртка одиночного набора (группа без имени, см. isShelf) полки не заводит.
//
// ЧТО ОСТАЛОСЬ СНАРУЖИ. Плитки наборов лежат в ОБЩЕЙ сетке вместе с темами
// разговорника — для ученика набор есть набор, откуда бы он ни пришёл.
// Поэтому наружу отдаётся список `decks`, а сетку собирает тренажёр.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Layers } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import {
  RailCard, RailList, Tile, TileGrid, TileChip, TileMeter,
} from '../TrainerShell'
import {
  PhraseRun, DeckHint, themeStats, type PhraseView, type RunMode,
} from '../../PhraseDecks'
import MySetEditor, { emptyMyGroup } from '../MySetEditor'
import { fetchCardGroups, appFlag, isShelf, setCards as allSetCards, type CardGroup } from '../../../lib/cardGroups'
import { hasCardSeeds, loadCardSeeds } from '../../../data/cardGroupSeeds'
import type { CardState } from '../../../data/reviewDeck'

/** Набор под общую витрину: имя, карточки и группа, из которой он приехал. */
export interface GroupDeck {
  group: CardGroup
  set: CardGroup['sets'][number]
  theme: { id: string; title: string }
  phrases: ReturnType<typeof allSetCards>
}

export interface CardGroupsHalf {
  /** Приехали ли группы. undefined — ещё едут, и «групп нет» неизвестно. */
  groups: CardGroup[] | undefined
  /** Показывать ли половину: у языка есть сид или у ученика есть группы. */
  on: boolean
  /** Наборы под общую сетку, уже просеянные поиском и статусом. */
  decks: GroupDeck[]
  /** Открытая папка-полка (только названная группа). */
  openGroup: CardGroup | null
  openGroupId: string
  setOpenGroupId: (v: string) => void
  /** Открытый набор вместе со своей группой. */
  openSet: { group: CardGroup; set: CardGroup['sets'][number] } | null
  setOpenSetId: (v: string | null) => void
  /** Открытая стопка-серия внутри набора. */
  openSubset: NonNullable<CardGroup['sets'][number]['subsets']>[number] | null
  setOpenSubsetId: (v: string | null) => void
  /** Открыт ли редактор своей подборки — он занимает весь экран. */
  editing: boolean
  /** Может ли ученик собрать свою подборку (флаг + известный ученик). */
  canMakeOwn: boolean
  /** Завести новую свою подборку — плиткой из витрины. */
  startNew: () => void
  rail: React.ReactNode
  /** Содержимое трёх верхних этажей: редактор, выбор серии, прогон. */
  content: React.ReactNode
}

export function useCardGroups({
  lang, subjectId, owner, accent, soft, query, status,
  states, statesReady, run, phraseView, onGraded, tourExtra,
}: {
  lang: string
  subjectId: string
  owner: { studentId?: string; anonName?: string }
  accent: string
  soft: string
  query: string
  status: string
  states: Map<string, CardState>
  statesReady: boolean
  run: RunMode
  phraseView: PhraseView
  onGraded: (prompt: string, st: CardState) => void
  /** Шаг онбординга стопки — общий у набора с темой разговорника. */
  tourExtra?: React.ComponentProps<typeof PhraseRun>['tourExtra']
}): CardGroupsHalf {
  const t = useT()

  const [groups, setGroups] = useState<CardGroup[] | undefined>(undefined)
  // Счётчик перезагрузки: своя подборка, сохранённая учеником, должна появиться
  // в витрине сразу, а не после ухода со вкладки и обратно.
  const [groupsKey, setGroupsKey] = useState(0)
  useEffect(() => {
    let alive = true
    setGroups(undefined)
    Promise.all([
      // Ключ витрины — предмет: см. fetchCardGroups. Язык остаётся у сидов —
      // они лежат в коде и разложены по языкам, а не по предметам.
      fetchCardGroups(subjectId, owner.studentId),
      hasCardSeeds(lang) ? loadCardSeeds(lang) : Promise.resolve([] as CardGroup[]),
    ]).then(([db, seeds]) => {
      if (!alive) return
      setGroups([...seeds, ...db].sort((a, b) => a.sort - b.sort))
    })
    return () => { alive = false }
  }, [lang, subjectId, owner.studentId, groupsKey])

  /**
   * Может ли ученик собирать свои подборки.
   *
   * Ответ приходит из app_flags и по умолчанию «нет»: недоступная база, старая
   * схема, ошибка сети — всё это должно значить «фичи нет», а не «фича есть».
   */
  const [mySetsOn, setMySetsOn] = useState(false)
  useEffect(() => {
    let alive = true
    appFlag('student_card_sets').then(on => { if (alive) setMySetsOn(on) })
    return () => { alive = false }
  }, [])
  /** Открытый редактор своей подборки: новая группа или своя из витрины. */
  const [editGroup, setEditGroup] = useState<CardGroup | null>(null)

  // Таблетка рисуется, как только известно, что показывать. Пока группы едут,
  // ответ «есть ли они» даёт синхронный реестр сидов: у языка с подборкой
  // половина появляется сразу, у остальных — когда придёт ответ из базы.
  const on = hasCardSeeds(lang) || (groups?.length ?? 0) > 0

  // Ключ в памяти прежний (`cardGroup`): у того, кто стоял на группе в бывших
  // «Подборках», она и откроется.
  const [openGroupId, setOpenGroupId] = usePersistentState<string>(`trainer.${lang}.cardGroup`, '')
  const [openSetId, setOpenSetId] = usePersistentState<string | null>(`trainer.${lang}.cardSet`, null)
  const openSet = useMemo(() => {
    if (!openSetId) return null
    for (const g of groups ?? []) {
      const set = g.sets.find(x => x.id === openSetId)
      if (set) return { group: g, set }
    }
    return null
  }, [groups, openSetId])

  // Четвёртый уровень: стопка внутри набора (серия внутри сезона). Открыт он
  // или нет — решает не отдельный экран, а наличие подстопок у набора: у
  // обычного набора их нет, и он открывается сразу карточками, как раньше.
  const [openSubsetId, setOpenSubsetId] = usePersistentState<string | null>(`trainer.${lang}.cardSubset`, null)
  const openSubset = useMemo(() => {
    if (!openSubsetId || !openSet) return null
    return openSet.set.subsets?.find(s => s.id === openSubsetId) ?? null
  }, [openSet, openSubsetId])

  /**
   * Наборы выбранной группы под витрину.
   *
   * Форма прежняя — DeckCard: имя стопки и список карточек. Метка серии (`ep`)
   * в витрину не идёт: на плитке она не помещается, а внутри набора её видно у
   * каждой карточки.
   *
   * Без выбранной группы показываются наборы ВСЕХ групп подряд. Это осознанно:
   * групп у ученика единицы, и пустой экран с надписью «выбери слева» стоил бы
   * лишнего клика ради ничего.
   */
  const decks = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Открытая папка держит выборку даже при поиске: искали внутри неё.
    // Без папки ищется и показывается всё подряд — групп у ученика единицы.
    const list = (groups ?? []).filter(g => openGroupId ? g.id === openGroupId : true)
    return list.flatMap(g => g.sets.map(set => ({ group: g, set, theme: { id: set.id, title: set.title }, phrases: allSetCards(set) })))
      .filter(x => {
        if (q) {
          const hay = `${x.group.title} ${x.set.title} ${x.set.about} ${x.phrases.map(c => `${c.term} ${c.ru} ${c.ep ?? ''}`).join(' ')}`
          if (!hay.toLowerCase().includes(q)) return false
        }
        const st = themeStats({ theme: x.theme, phrases: x.phrases }, states)
        const started = st.total - st.fresh > 0
        const done = st.total > 0 && st.learned === st.total
        if (status === 'new' && started) return false
        if (status === 'wip' && (!started || done)) return false
        if (status === 'done' && !done) return false
        return true
      })
  }, [groups, openGroupId, query, status, states])

  // Полка могла не пережить перезагрузку: группу удалили в Конструкторе, а её
  // id остался в памяти вкладки. Без сброса витрина фильтровалась бы по
  // несуществующей папке и стояла пустой.
  useEffect(() => {
    if (groups === undefined) return
    if (openGroupId && !groups.some(g => g.id === openGroupId && isShelf(g))) setOpenGroupId('')
    if (openSetId && !groups.some(g => g.sets.some(x => x.id === openSetId))) { setOpenSetId(null); setOpenSubsetId(null) }
    if (openSubsetId && !openSubset) setOpenSubsetId(null)
  }, [groups, openGroupId, setOpenGroupId, openSetId, setOpenSetId])

  /** Открытая папка — только названная группа: обёртка одиночного набора папкой не бывает. */
  const openGroup = useMemo(
    () => (groups ?? []).find(g => g.id === openGroupId && isShelf(g)) ?? null,
    [groups, openGroupId],
  )

  // Полки — папки витрины, а не сито: строка ОТКРЫВАЕТ группу, как плитка в
  // сетке, и стоять ей поэтому не в «Фильтрах».
  const rail = !(groups ?? []).some(isShelf) ? null : (
    <RailCard title="Полки" accent={accent} icon={<Layers size={15} />}
      action={openGroup ? { label: t('Ко всем'), onClick: () => setOpenGroupId('') } : undefined}>
      <RailList
        items={(groups ?? []).filter(isShelf).map(g => ({
          id: g.id,
          label: g.title,
          sub: g.about,
          // Через allSetCards, а не x.cards: у набора с сериями свои карточки
          // пусты, они лежат в стопках, и прямой счёт давал полке ноль.
          hint: String(g.sets.reduce((n, x) => n + allSetCards(x).length, 0)),
        }))}
        value={openGroupId}
        onChange={v => setOpenGroupId(v === openGroupId ? '' : v)}
        accent={accent}
        soft={soft}
      />
      {/* Своя подборка правится оттуда же, где открыта: кнопка стоит под
          списком полок и появляется, только когда открыта СВОЯ. */}
      {mySetsOn && openGroup?.authorStudentId && (
        <button
          onClick={() => setEditGroup(openGroup)}
          style={{
            height: 34, borderRadius: 12, border: `1px solid ${accent}55`,
            background: 'transparent', color: accent, fontFamily: 'inherit',
            fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {t('Править подборку')}
        </button>
      )}
    </RailCard>
  )

  const content = editGroup ? (
    <MySetEditor
      group={editGroup}
      studentId={owner.studentId ?? ''}
      accent={accent}
      onClose={() => setEditGroup(null)}
      onSaved={() => { setEditGroup(null); setGroupsKey(k => k + 1) }}
    />
  ) : openSet && openSet.set.subsets?.length && !openSubset ? (
    // Набор с подстопками сам карточек не показывает: между ним и прогоном
    // стоит выбор серии. Плитка та же, что у наборов, — витрина не должна
    // менять язык на четвёртом уровне.
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <TileGrid min={220}>
        {openSet.set.subsets.map(sub => {
          const st = themeStats({ theme: { id: sub.id, title: sub.title }, phrases: sub.cards }, states)
          const pct = st.total ? Math.round((st.learned / st.total) * 100) : 0
          return (
            <Tile key={sub.id} accent={accent} onClick={() => setOpenSubsetId(sub.id)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <TileChip tone="mute">{sub.cards.length} {t('слов')}</TileChip>
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                  {sub.title}
                </span>
              </span>
              <TileMeter value={pct} />
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
                <span>{st.total - st.fresh > 0 ? t('в работе') : t('не начата')}</span>
                {st.learned > 0 && (
                  <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>
                    {st.learned} / {st.total}
                  </span>
                )}
              </span>
            </Tile>
          )
        })}
      </TileGrid>
    </div>
  ) : openSet ? (
    // Прогон идёт по стопке серии, если она открыта, и по самому набору, если
    // подстопок у него нет. Ключи прогресса и стикера берутся у того же
    // источника — иначе серия считала бы прогресс сезона.
    (() => {
      const runSet = openSubset ?? openSet.set
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PhraseRun
            runId={`cg-${runSet.id}`}
            phrases={runSet.cards}
            label={runSet.title}
            // Стикер за чистый прогон — как у темы разговорника и набора слов.
            // Ключ с префиксом cg: и id набора: он стабилен и у сида (см.
            // data/cardSeeds), и у строки в базе.
            reward={{ key: `cg:${runSet.id}`, title: runSet.title, size: runSet.cards.length }}
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
            tourExtra={tourExtra}
          />
          {run === 'swipe' && <DeckHint />}
        </div>
      )
    })()
  ) : null

  return {
    groups,
    on,
    decks,
    openGroup,
    openGroupId,
    setOpenGroupId,
    openSet,
    setOpenSetId,
    openSubset,
    setOpenSubsetId,
    editing: !!editGroup,
    canMakeOwn: mySetsOn && !!owner.studentId,
    startNew: () => setEditGroup(emptyMyGroup(lang, subjectId)),
    rail,
    content,
  }
}
