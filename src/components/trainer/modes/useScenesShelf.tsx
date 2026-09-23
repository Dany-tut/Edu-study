// ─────────────────────────────────────────────────────────────────────────────
// Половина «Чтения» — сцены: подлинные тексты с книжной полки
//
// ПОЧЕМУ ПОЛОВИНА, А НЕ РЕЖИМ. «Чтение» — три витрины на одной читалке: учебные
// тексты, сцены из книг и лента. Открытый материал у сцен и текстов — один и тот
// же экран (Reader), и он остаётся в тренажёре: вынести его сюда значило бы
// разрезать пополам работающий механизм ради красивой границы. Сюда уехало то,
// что у сцен СВОЁ: полки, фильтры, витрина произведений и страница
// произведения со списком сцен.
//
// ЧТО ОСТАЁТСЯ СНАРУЖИ. Читалка и журнал результатов: сцена засчитывается той же
// записью, что учебный текст («reading»). Наружу отдаются открытая сцена и
// способ её закрыть — по ним тренажёр решает, что показать вместо витрины.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Eye, SlidersHorizontal } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import Skeleton from '../../Skeleton'
import {
  RailCard, RailList, RailToggle, Toolbar, ToolButton, ToolCount,
  SearchPill, FilterMenu, StatusTabs, plural,
} from '../TrainerShell'
import { WorkGrid, WorkPage } from '../SceneShelf'
import {
  hasScenes, loadScenes, sceneCount, scenesWord, shelvesForLang, worksForLang,
  type Scene, type Work,
} from '../../../data/scenes'

export interface ScenesShelf {
  on: boolean
  /** Сколько сцен: до загрузки чанка — из реестра, после — по списку. */
  total: number
  /** Открытая сцена: её показывает общая читалка тренажёра. */
  openScene: Scene | null
  setOpenSceneId: (id: string | null) => void
  openWorkId: string | null
  setOpenWorkId: (id: string | null) => void
  /** Сколько произведений на полке — для подписи предмета. */
  works: number
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  back: (() => void) | null
  draftKey: string
  /** Смена половины или режима: фильтры полки сбрасываются. */
  reset: () => void
}

export function useScenesShelf({ lang, accent, soft, active, query, onQuery, status, onStatus, levels, done }: {
  lang: string
  accent: string
  soft: string
  /** Открыта ли половина сейчас: чанк сцен едет только по открытию. */
  active: boolean
  query: string
  onQuery: (v: string) => void
  status: string
  onStatus: (v: string) => void
  /** Ступени языка по таксономии — порядок уровней в фильтре и на витрине. */
  levels: string[]
  /** Пройдена ли сцена. Журнал общий с учебными текстами, он живёт снаружи. */
  done: (id: string) => boolean
}): ScenesShelf {
  const t = useT()

  const on = hasScenes(lang)
  const works = useMemo(() => worksForLang(lang), [lang])
  const shelves = useMemo(() => shelvesForLang(lang), [lang])

  const [openWorkId, setOpenWorkId] = usePersistentState<string | null>(`trainer.${lang}.work`, null)
  const [openSceneId, setOpenSceneId] = usePersistentState<string | null>(`trainer.${lang}.scene`, null)
  const [hideSpoilers, setHideSpoilers] = usePersistentState<boolean>(`trainer.${lang}.spoilers`, true)
  const [shelf, setShelf] = useState('')
  const [platforms, setPlatforms] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [pickedLevels, setPickedLevels] = useState<string[]>([])

  const [data, setData] = useState<{ lang: string; list: Scene[] } | null>(null)
  const scenes = data?.lang === lang ? data.list : undefined

  // Сколько сцен у языка — независимо от того, приехал чанк или нет: до
  // загрузки берём число из реестра, после — длину самого списка (реестр может
  // отстать от файла, список — никогда).
  const total = scenes?.length ?? sceneCount(lang)

  useEffect(() => {
    if (!on || !active || scenes !== undefined) return
    let alive = true
    loadScenes(lang).then(list => { if (alive) setData({ lang, list }) })
    return () => { alive = false }
  }, [on, active, scenes, lang])

  const scenesOf = useMemo(() => {
    const byWork = new Map<string, Scene[]>()
    for (const s of scenes ?? []) {
      const list = byWork.get(s.workId)
      if (list) list.push(s)
      else byWork.set(s.workId, [s])
    }
    for (const list of byWork.values()) list.sort((a, b) => a.order - b.order)
    return (workId: string) => byWork.get(workId) ?? []
  }, [scenes])

  const openWork: Work | null = openWorkId ? works.find(w => w.id === openWorkId) ?? null : null
  const openScene: Scene | null = useMemo(
    () => (openSceneId ? (scenes ?? []).find(s => s.id === openSceneId) ?? null : null),
    [scenes, openSceneId],
  )

  const platformOpts = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of works) if (w.platform) n.set(w.platform, (n.get(w.platform) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }))
  }, [works])

  const tagOpts = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of works) for (const tag of w.tags) n.set(tag, (n.get(tag) ?? 0) + 1)
    return [...n].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }))
  }, [works])

  // Уровень стоит у СЦЕНЫ, а не у произведения, поэтому фильтр отвечает на
  // вопрос «есть ли здесь что почитать на моём уровне»: книга остаётся в сетке,
  // если подходит хотя бы одна её сцена. Так «Идиот» не пропадает из-за одного
  // трудного отрывка (см. соображение выше) — и при этом «A2» больше не значит
  // «ищи сам». Порядок — по таксономии языка (A1…C1), счётчик — сколько
  // произведений попадает. До загрузки чанка сцен список пуст, и таблетки нет.
  const levelOpts = useMemo(() => {
    const n = new Map<string, number>()
    for (const w of works) {
      for (const lv of new Set(scenesOf(w.id).map(s => s.level))) n.set(lv, (n.get(lv) ?? 0) + 1)
    }
    const order = levels.filter(l => n.has(l))
    const rest = [...n.keys()].filter(l => !levels.includes(l))
    return [...order, ...rest].map(value => ({ value, label: value, count: n.get(value) ?? 0 }))
  }, [works, scenesOf, levels])

  const visibleWorks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return works.filter(w => {
      if (shelf && w.shelf !== shelf) return false
      if (platforms.length && !(w.platform && platforms.includes(w.platform))) return false
      if (tags.length && !w.tags.some(tag => tags.includes(tag))) return false
      if (pickedLevels.length && !scenesOf(w.id).some(s => pickedLevels.includes(s.level))) return false
      // Статус — та же ось, что у текстов и записей: «не начатые» = ни одной
      // пройденной сцены, «пройдено» = пройдены все. Произведение без сцен
      // (чанк ещё едет) статусом не отсеивается — иначе витрина мигает пустой.
      if (status) {
        const sc = scenesOf(w.id)
        if (sc.length > 0) {
          const passed = sc.filter(x => done(x.id)).length
          if (status === 'new' && passed > 0) return false
          if (status === 'wip' && (passed === 0 || passed === sc.length)) return false
          if (status === 'done' && passed < sc.length) return false
        }
      }
      if (q && !`${w.title} ${w.origTitle} ${w.author}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [works, shelf, platforms, tags, pickedLevels, scenesOf, query, status, done])

  const groups = useMemo(
    () => shelves
      .map(s => ({ title: s.title, hint: s.hint, works: visibleWorks.filter(w => w.shelf === s.id) }))
      .filter(g => g.works.length > 0),
    [shelves, visibleWorks],
  )


  const rail = !active ? null : (
    <>
      {!openWork && (
        <RailCard
          title="Полки"
          accent={accent}
          icon={<SlidersHorizontal size={15} />}
          action={shelf ? { label: t('Все полки'), onClick: () => setShelf('') } : undefined}
        >
          <RailList
            items={shelves.map(s => ({
              id: s.id,
              label: t(s.title),
              hint: String(works.filter(w => w.shelf === s.id).length),
            }))}
            value={shelf}
            onChange={v => setShelf(v === shelf ? '' : v)}
            accent={accent}
            soft={soft}
          />
        </RailCard>
      )}

      {(
        <RailCard title="Показ" accent={accent} icon={<Eye size={15} />}>
          <RailToggle
            label="Прятать спойлеры"
            on={hideSpoilers}
            onChange={setHideSpoilers}
            accent={accent}
          />
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {t('Скрывает сцены, которые раскрывают середину или финал. Первые сцены книги видно всегда.')}
          </div>
        </RailCard>
      )}
    </>
  )

  const toolbar = !active ? null : (
      <Toolbar count={openWork ? undefined : visibleWorks.length}>
        {openWork ? (
          <ToolButton onClick={() => setOpenWorkId(null)}>
            <ChevronLeft size={14} /> {t('К полкам')}
          </ToolButton>
        ) : (
          <>
            <SearchPill value={query} onChange={onQuery} placeholder={t('Автор или название…')} />
            {/* Платформы показываем, только если они у языка есть: на корейской
                полке из одних рассказов фильтр «где смотрел» — пустая таблетка. */}
            {levelOpts.length > 1 && (
              <FilterMenu
                label="Уровень"
                options={levelOpts}
                value={pickedLevels}
                onChange={setPickedLevels}
                accent={accent}
                soft={soft}
              />
            )}
            {platformOpts.length > 1 && (
              <FilterMenu
                label="Платформа"
                options={platformOpts}
                value={platforms}
                onChange={setPlatforms}
                accent={accent}
                soft={soft}
              />
            )}
            {tagOpts.length > 1 && (
              <FilterMenu
                label="Тематика"
                options={tagOpts}
                value={tags}
                onChange={setTags}
                accent={accent}
                soft={soft}
              />
            )}
            {/* Статус — та же ось и в том же месте, что у текстов, записей и
                наборов: после фильтров, перед счётчиком. */}
            <StatusTabs
              options={[
                { value: '', label: 'Все' },
                { value: 'new', label: 'Не начатые' },
                { value: 'wip', label: 'В работе' },
                { value: 'done', label: 'Пройдено' },
              ]}
              value={status}
              onChange={onStatus}
              accent={accent}
            />
          </>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ToolCount>
            {openWork
              ? `${scenesOf(openWork.id).length} ${t(scenesWord(scenesOf(openWork.id).length))}`
              : `${visibleWorks.length} ${t(plural(visibleWorks.length, ['произведение', 'произведения', 'произведений']))}`}
          </ToolCount>
        </span>
      </Toolbar>
  )

  const content = !active ? null : scenes === undefined ? (
      <Skeleton.Cards rows={3} />
    ) : openWork ? (
      <WorkPage
        work={openWork}
        scenes={scenesOf(openWork.id)}
        done={done}
        accent={accent}
        soft={soft}
        hideSpoilers={hideSpoilers}
        onOpenScene={setOpenSceneId}
      />
    ) : (
      <WorkGrid
        groups={groups}
        scenesOf={scenesOf}
        levelOrder={levelOpts.map(o => o.value)}
        done={done}
        accent={accent}
        soft={soft}
        onOpen={setOpenWorkId}
      />
    )

  return {
    on,
    total,
    openScene,
    setOpenSceneId,
    openWorkId,
    setOpenWorkId,
    works: works.length,
    rail,
    toolbar,
    content,
    back: active && openWork ? () => setOpenWorkId(null) : null,
    draftKey: [shelf, platforms.join(','), tags.join(','), pickedLevels.join(',')].join('|'),
    reset: () => { setShelf(''); setPlatforms([]); setTags([]); setPickedLevels([]) },
  }
}
