// ─────────────────────────────────────────────────────────────────────────────
// Половина «Чтения» — лента: свежее чтение из свободных источников
//
// ПОЧЕМУ ПОЛОВИНА, А НЕ РЕЖИМ. «Чтение» — три витрины на одной читалке: учебные
// тексты, сцены из книг и лента. Первые две делят читалку, журнал результатов и
// фильтры; лента не делит НИЧЕГО — у неё нет открытого материала (пост читается
// на месте), нет статусов «пройдено» и нет поиска. Поэтому она и уезжает первой
// из трёх: связей, которые пришлось бы тянуть наружу, у неё почти нет.
//
// ЧТО ОСТАЁТСЯ СНАРУЖИ: выбор половины (им заведует «Чтение») и признак
// `on` — на телефоне ленты нет вовсе, и от этого зависит, какая половина
// открывается по умолчанию.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import Skeleton from '../../Skeleton'
import { Toolbar, ToolCount } from '../TrainerShell'
import { FeedList, FeedTabs } from '../FeedShelf'
import { useAppUpdate } from '../../../lib/appUpdate'
import {
  feedCount, feedFilters, hasFeed, loadFeed, matchesFilter, materialsWord,
  type FeedFilter, type FeedItem,
} from '../../../data/feed'

export interface FeedShelf {
  /** Есть ли лента у этого языка на этом экране (на телефоне её нет). */
  on: boolean
  /** Сколько материалов — до загрузки чанка из реестра, после по списку. */
  total: number
  /** Подпись под названием предмета. */
  subtitle: string
  toolbar: React.ReactNode
  content: React.ReactNode
}

export function useFeedShelf({ lang, subjectId, accent, active, enabled }: {
  lang: string
  subjectId: string
  accent: string
  /** Открыта ли лента сейчас: чанк едет только по открытию. */
  active: boolean
  /** Показывать ли ленту вообще — решает «Чтение» (на узком экране её нет). */
  enabled: boolean
}): FeedShelf {
  const t = useT()

  const on = hasFeed(lang) && enabled

  // Устроена как сцены и по той же причине: материал приезжает отдельным
  // чанком, а количество известно синхронно из реестра — иначе бейдж «Чтение»
  // в меню режимов показывал бы ленту нулём, пока её не откроют.
  const [data, setData] = useState<{ lang: string; list: FeedItem[] } | null>(null)
  const feed = data?.lang === lang ? data.list : undefined
  const total = feed?.length ?? feedCount(lang)

  // ПОВОРОТ ЛЕНТЫ — «Видео», «Наука», «Новости». Не выбор материала: выбранное
  // остаётся лентой по дням, просто уже одного рода. Ряд собирается по тому,
  // что реально приехало, и живёт per-язык: у корейской ленты свои темы, и
  // чипс «Здоровье», выбранный в ней, ничего не значит в португальской.
  const [filter, setFilter] = usePersistentState<FeedFilter>(`trainer.${lang}.feedFilter`, 'all')
  const chips = useMemo(() => feedFilters(feed ?? []), [feed])
  // Чипс мог исчезнуть из ряда: язык сменился, ночная сборка унесла последний
  // ролик. Выборка по кнопке, которой на экране нет, читается как пустая лента.
  const pick: FeedFilter = chips.some(c => c.id === filter) ? filter : 'all'
  const shown = useMemo(() => (feed ?? []).filter(x => matchesFilter(x, pick)), [feed, pick])

  // ТЯГА СВЕРХУ. Материалы ленты приезжают со сборкой, поэтому обновлять список
  // в памяти бессмысленно — спрашиваем сервер, нет ли новой сборки. Есть —
  // таблетка обновления сама предложит её забрать.
  const refresh = useCallback(async () => {
    await useAppUpdate.getState().check(true)
    const list = await loadFeed(lang)
    setData({ lang, list })
  }, [lang])

  useEffect(() => {
    if (!on || !active || feed !== undefined) return
    let alive = true
    loadFeed(lang).then(list => { if (alive) setData({ lang, list }) })
    return () => { alive = false }
  }, [on, active, feed, lang])

  const toolbar = !active ? null : (
    // У ленты в строке только поворот: ни поиска, ни сортировки, ни статусов.
    // Искать в ленте нечего (её листают, а не подбирают материал), а «сначала
    // старое» ленте противопоказано — датой она и держится.
    <Toolbar count={shown.length}>
      {/* Ряд ровно по колонке постов: он тут один и работает шапкой ленты.
          Свой, а не общий StatusTabs: он сворачивается при прокрутке до
          текущей рубрики словом и значков соседей — см. FeedTabs. */}
      <FeedTabs chips={chips} value={pick} onChange={setFilter} accent={accent} />
      <ToolCount>{shown.length} {t(materialsWord(shown.length))}</ToolCount>
    </Toolbar>
  )

  const content = !active ? null : feed === undefined ? (
    <Skeleton.Cards rows={3} />
  ) : (
    <FeedList items={shown} lang={lang} accent={accent} subjectId={subjectId} onRefresh={refresh} />
  )

  return {
    on,
    total,
    subtitle: `${total} ${t(materialsWord(total))} ${t('из свободных источников')}`,
    toolbar,
    content,
  }
}
