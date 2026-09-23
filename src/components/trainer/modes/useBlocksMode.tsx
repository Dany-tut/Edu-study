// ─────────────────────────────────────────────────────────────────────────────
// Режим «Конструктор» — из чего собраны слова
//
// Четвёртый режим, вынесенный из LanguageTrainer; зачем и почему хуком — в
// шапке useGuideMode.
//
// САМЫЙ БОЛЬШОЙ ИЗ ОТДЕЛЬНО СТОЯЩИХ. У него четыре половины — основы с
// хвостами, корни-кирпичи, ряды счёта и правила чтения, — и у каждой свой
// открытый материал, своя витрина, свой прогон и своя карточка-опора в рейле
// (хвосты, ряды, семь конечных). Все четыре появляются только там, где для
// языка написаны: пустая половина хуже отсутствующей.
//
// ЧТО ПРИХОДИТ СНАРУЖИ: поиск (один на весь тренажёр), романизация (её
// переключают и здесь, и в карточках — настройка показа общая), владелец колоды
// и журнал результатов. Прогон пишет результат в тот же журнал, что текст и
// гнездо созвучий, поэтому запись идёт наружу одним `onFinished`.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo } from 'react'
import { AudioLines, Blocks, Eye, Hash, Layers, Puzzle, SlidersHorizontal } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import { bindShortWords, proseWrap } from '../../../lib/typography'
import {
  RailCard, RailSegment, RailList, RailToggle, Toolbar, SearchPill, ToolCount,
  Empty as ShellEmpty,
} from '../TrainerShell'
import { hasEndings, verbByDict, KO_ENDINGS, KO_VERBS } from '../../../data/koreanEndings'
import { StemGrid, StemPage } from '../EndingBuilder'
import { hasRoots, rootByIdForLang, rootGroupsForLang, rootsForLang } from '../../../data/wordRoots'
import { RootGrid, RootPage } from '../RootBuilder'
import { hasNumbers, numberSetById, systemLabel, KO_NUMBER_SETS, SYSTEM_RULES } from '../../../data/koreanNumbers'
import { NumberGrid, NumberPage } from '../NumberBuilder'
import { hasPronRules, pronRuleById, KO_PRON_RULES } from '../../../data/koreanPronRules'
import { PronGrid, PronPage } from '../PronRuleDrill'
import { TONE } from '../blockKit'
import type { MaterialResult } from '../../../lib/trainerProgress'

/** Четыре половины: основы, корни, числа, звуки. */
export type BlocksView = 'stems' | 'roots' | 'numbers' | 'sounds'

/** Журнал материалов, общий на тренажёр: чем прогон отчитывается о себе. */
type ResultKind = 'ending' | 'root' | 'number' | 'pron'

export interface BlocksMode {
  on: boolean
  count: number | undefined
  /** Подпись под названием предмета: сколько чего собрано у этого языка. */
  subtitle: string
  view: BlocksView
  setView: (v: BlocksView) => void
  /** Половины для нижней навигации телефона. */
  views: { id: string; label: string; badge?: number }[]
  /** Что открыто внутри режима — для адреса экрана и отметки «в материале». */
  open: { screen: 'stems' | 'roots' | 'numbers' | 'sounds'; id: string } | null
  /** Открыть по ссылке: адрес экрана ведёт прямо в основу или гнездо. */
  openFromLink: (screen: BlocksView, id: string | null) => void
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  back: (() => void) | null
  draftKey: string
  /** Смена режима: закрыть открытое и сбросить полку корней. */
  reset: () => void
}

export function useBlocksMode({
  lang, subjectId, accent, soft, narrow, active, query, onQuery, owner, reading, onReading, result, onFinished,
}: {
  lang: string
  subjectId: string
  accent: string
  soft: string
  narrow: boolean
  active: boolean
  query: string
  onQuery: (v: string) => void
  owner: { studentId?: string; anonName?: string }
  /** Романизация — общая настройка показа, её же переключают карточки. */
  reading: boolean
  onReading: (v: boolean) => void
  result: (kind: ResultKind, id: string) => MaterialResult | undefined
  onFinished: (kind: ResultKind, id: string, score: number, total: number) => void
}): BlocksMode {
  const t = useT()

  // Обе первые половины пока корейские: матрица форм и гнёзда ханча написаны
  // только для ko. Режим целиком прячется там, где нет ни одной, — пустая
  // вкладка хуже отсутствующей (то же правило, что у сцен и созвучий).
  const stemsOn = useMemo(() => hasEndings(lang), [lang])
  const rootsOn = useMemo(() => hasRoots(lang), [lang])
  const numbersOn = useMemo(() => hasNumbers(lang), [lang])
  const soundsOn = useMemo(() => hasPronRules(lang), [lang])
  const on = stemsOn || rootsOn || numbersOn || soundsOn

  const [view, setView] = usePersistentState<BlocksView>(`trainer.${lang}.blocksView`, 'stems')
  const [openStemDict, setOpenStemDict] = usePersistentState<string | null>(`trainer.${lang}.stem`, null)
  const [openRootKo, setOpenRootKo] = usePersistentState<string | null>(`trainer.${lang}.root`, null)
  const [openNumId, setOpenNumId] = usePersistentState<string | null>(`trainer.${lang}.numbers`, null)
  const [openPronId, setOpenPronId] = usePersistentState<string | null>(`trainer.${lang}.pron`, null)
  /** Полка корней: ханча раскладывается по смысловым группам. */
  const [rootGroup, setRootGroup] = usePersistentState<string>(`trainer.${lang}.rootGroup`, '')

  const openStem = useMemo(() => (openStemDict ? verbByDict(openStemDict) ?? null : null), [openStemDict])
  const openRoot = useMemo(() => (openRootKo ? rootByIdForLang(lang, openRootKo) ?? null : null), [lang, openRootKo])
  const openNum = useMemo(() => (openNumId ? numberSetById(openNumId) ?? null : null), [openNumId])
  const openPron = useMemo(() => (openPronId ? pronRuleById(openPronId) ?? null : null), [openPronId])

  // Восстановленная из sessionStorage половина может оказаться ненаписанной для
  // этого языка: тогда молча съезжаем на ту, что есть, — иначе таблетки в рейле
  // нет, а содержимое от неё показано.
  useEffect(() => {
    const has = { stems: stemsOn, roots: rootsOn, numbers: numbersOn, sounds: soundsOn }
    if (has[view]) return
    const fallback = (['stems', 'roots', 'numbers', 'sounds'] as BlocksView[]).find(v => has[v])
    if (fallback) setView(fallback)
  }, [view, stemsOn, rootsOn, numbersOn, soundsOn, setView])

  /** Смена половины закрывает открытое: в соседней половине его всё равно нет. */
  function switchView(v: BlocksView) {
    setView(v)
    setOpenStemDict(null); setOpenRootKo(null); setOpenNumId(null); setOpenPronId(null)
    onQuery('')
  }

  // Поиск идёт и по самим формам: ученик ищет «хочу» или «갔어요», а не «가다».
  const visibleStems = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KO_VERBS
    return KO_VERBS.filter(v =>
      `${v.dict} ${v.stem} ${v.reading} ${v.ru} ${Object.values(v.forms).map(x => `${x.form} ${x.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [query])
  const visibleNums = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KO_NUMBER_SETS
    return KO_NUMBER_SETS.filter(set =>
      `${set.title} ${set.when} ${set.rows.map(x => `${x.form} ${x.reading} ${x.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [query])
  const visibleRoots = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rootsForLang(lang).filter(r => {
      if (rootGroup && r.group !== rootGroup) return false
      if (!q) return true
      return `${r.ko} ${r.cn} ${r.ru} ${r.words.map(w => `${w.term} ${w.reading} ${w.ru}`).join(' ')}`
        .toLowerCase().includes(q)
    })
  }, [lang, query, rootGroup])
  const visiblePron = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return KO_PRON_RULES
    return KO_PRON_RULES.filter(r =>
      `${r.ko} ${r.title} ${r.tagline} ${r.examples.map(x => `${x.written} ${x.spoken} ${x.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [query])

  const views = [
    ...(stemsOn ? [{ id: 'stems', label: 'Основы', badge: KO_VERBS.length }] : []),
    ...(rootsOn ? [{ id: 'roots', label: 'Корни', badge: rootsForLang(lang).length }] : []),
    ...(numbersOn ? [{ id: 'numbers', label: 'Числа', badge: KO_NUMBER_SETS.length }] : []),
    ...(soundsOn ? [{ id: 'sounds', label: 'Звуки', badge: KO_PRON_RULES.length }] : []),
  ]

  const rail = !active ? null : (
    <>
      {!openStem && !openRoot && !openNum && !openPron && (
        <RailCard title="Что собираем" accent={accent} icon={<Blocks size={15} />}>
          {!narrow && (
          // Четыре подписи со счётчиками в рейл не влезали и резались
          // многоточием («О.. 8») — поэтому режим idleIcon: подпись целиком
          // только у выбранной половины, остальные ждут значками. Счётчики и
          // так стоят в тулбаре и на плитках.
          <RailSegment
            options={[
              ...(stemsOn ? [{ value: 'stems', label: 'Основы', icon: <Layers size={15} /> }] : []),
              ...(rootsOn ? [{ value: 'roots', label: 'Корни', icon: <Puzzle size={15} /> }] : []),
              ...(numbersOn ? [{ value: 'numbers', label: 'Числа', icon: <Hash size={15} /> }] : []),
              ...(soundsOn ? [{ value: 'sounds', label: 'Звуки', icon: <AudioLines size={15} /> }] : []),
            ]}
            value={view}
            onChange={v => v && switchView(v as BlocksView)}
            accent={accent}
            soft={soft}
            clearable={false}
            idleIcon
          />
          )}
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {view === 'stems'
              ? t('Глагол не спрягается по лицам: основа стоит, меняется хвост.')
              : view === 'roots'
              ? t('Слово китайского происхождения собрано из односложных кирпичей.')
              : view === 'sounds'
              ? t('Написанное и звучащее расходятся по правилам — их всего десять.')
              : t('Рядов счёта два, и выбирает между ними не число, а то, что считают.')}
          </div>
        </RailCard>
      )}

      {/* Справочник хвостов. Стоит в рейле, а не на странице: он нужен и на
          витрине, и внутри основы, и внутри прогона — то есть везде, где рейл
          и так виден. */}
      {view === 'stems' && (
        <RailCard title="Хвосты" accent={accent} icon={<Layers size={15} />}>
          {KO_ENDINGS.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: TONE[e.tone].fg, whiteSpace: 'nowrap' }}>
                {e.block}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{t(e.label)}</span>
            </div>
          ))}
        </RailCard>
      )}

      {/* Тот же приём, что и со справочником хвостов: правило выбора ряда нужно
          и на витрине, и внутри набора, и посреди прогона. */}
      {view === 'numbers' && (
        <RailCard title="Каким рядом" accent={accent} icon={<Layers size={15} />}>
          {SYSTEM_RULES.map(rule => (
            <div key={rule.system} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: rule.system === 'sino' ? 'var(--color-blue-pill-text)'
                  : rule.system === 'native' ? 'var(--color-peach-text)'
                  : 'var(--color-purple-text)',
              }}>
                {t(systemLabel(rule.system))}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.45 }}>{t(rule.what)}</span>
            </div>
          ))}
        </RailCard>
      )}

      {/* Опорная таблица правил чтения — тот же приём, что «Хвосты» и «Каким
          рядом»: семь конечных звуков нужны и на витрине, и посреди прогона,
          потому что через них проходит половина правил. */}
      {view === 'sounds' && (
        <RailCard title="Семь конечных" accent={accent} icon={<Layers size={15} />}>
          {([
            ['ㄱ ㅋ ㄲ', '[к]'], ['ㄴ', '[н]'], ['ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ', '[т]'],
            ['ㄹ', '[ль]'], ['ㅁ', '[м]'], ['ㅂ ㅍ', '[п]'], ['ㅇ', '[нъ]'],
          ] as const).map(([letters, sound]) => (
            <div key={sound} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: accent, whiteSpace: 'nowrap' }}>
                {letters}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.4 }}>{t(sound)}</span>
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
            {t('Так звучит любой 받침 — если следом не идёт гласная.')}
          </div>
        </RailCard>
      )}

      {view === 'roots' && !openRoot && (
        <RailCard
          title="Полки"
          accent={accent}
          icon={<SlidersHorizontal size={15} />}
          action={rootGroup ? { label: t('Все полки'), onClick: () => setRootGroup('') } : undefined}
        >
          <RailList
            items={rootGroupsForLang(lang).map(g => ({
              id: g,
              label: t(g),
              hint: String(rootsForLang(lang).filter(r => r.group === g).length),
            }))}
            value={rootGroup}
            onChange={v => setRootGroup(v === rootGroup ? '' : v)}
            accent={accent}
            soft={soft}
          />
        </RailCard>
      )}

      {(
        <RailCard title="Показ" accent={accent} icon={<Eye size={15} />}>
          <RailToggle label="Романизация" on={reading}
            onChange={v => onReading(v)} accent={accent} />
        </RailCard>
      )}
    </>
  )

  const toolbar = !active ? null : (openStem || openRoot || openNum || openPron) ? null : (
    // Строка есть и на «Основах». Раньше её тут не было (основ восемь, они на
    // одном экране), но шапка — это ещё и то, во что перетекает кнопка «назад»
    // на свайпе из дрилла: у пустой шапки превращаться не во что, и кнопка
    // просто гасла, тогда как у соседних разделов она ужимается в кружок
    // поиска. Ради одинакового жеста строка вернулась.
    <Toolbar>
      <SearchPill value={query} onChange={onQuery}
        placeholder={t(
          view === 'roots' ? 'Найти слово или корень…'
          : view === 'sounds' ? 'Найти правило или слово…'
          : view === 'stems' ? 'Найти основу или глагол…'
          : 'Найти число или ситуацию…')} />
      <ToolCount>
        {view === 'roots'
          ? `${visibleRoots.length} ${t('корней')}`
          : view === 'sounds'
          ? `${visiblePron.length} ${t('правил')}`
          : view === 'stems'
          ? `${visibleStems.length} ${t('основ')}`
          : `${visibleNums.length} ${t('наборов')}`}
      </ToolCount>
    </Toolbar>
  )

  // Конструктор. Прогон пишет результат в общий журнал материалов, как текст
    // и гнездо созвучий: плитка основы показывает счёт ровно так же.
  const intro = view === 'stems'
      ? 'Одна основа и восемь хвостов. Хвост цепляется одинаково к любому глаголу, поэтому выучить нужно восемь хвостов, а не сорок форм.'
      : view === 'roots'
      ? 'Больше половины корейских слов собрано из односложных кирпичей. Один кирпич открывает сразу гнездо слов, а промахи прогона уходят в колоду повторений.'
      : view === 'sounds'
      ? 'Корейское слово часто звучит не так, как написано, — и расходятся они не как попало, а по десятку правил. Каждое правило здесь — разбор, частые слова и прогон; промахи уходят в колоду повторений.'
      : 'Рядов счёта два, и выбирают между ними не по числу, а по тому, что считают: людей и часы — исконным, деньги, минуты и даты — китайским. Наборы здесь и есть эти ситуации.'
  const grid = view === 'sounds' ? (
      visiblePron.length === 0 ? (
        <ShellEmpty text="Под поиск ничего не подошло." />
      ) : (
        <PronGrid
          rules={visiblePron}
          results={id => result('pron', id)}
          accent={accent}
          soft={soft}
          onOpen={id => { setOpenPronId(id); onQuery('') }}
        />
      )
    ) : view === 'numbers' ? (
      visibleNums.length === 0 ? (
        <ShellEmpty text="Под поиск ничего не подошло." />
      ) : (
        <NumberGrid
          sets={visibleNums}
          results={id => result('number', id)}
          accent={accent}
          soft={soft}
          onOpen={id => { setOpenNumId(id); onQuery('') }}
        />
      )
    ) : view === 'stems' ? (
      visibleStems.length === 0 ? (
        <ShellEmpty text="Под поиск ничего не подошло." />
      ) : (
        <StemGrid
          verbs={visibleStems}
          results={dict => result('ending', dict)}
          accent={accent}
          soft={soft}
          onOpen={dict => { setOpenStemDict(dict); onQuery('') }}
        />
      )
    ) : visibleRoots.length === 0 ? (
      <ShellEmpty text="Под поиск ничего не подошло." />
    ) : (
      <RootGrid
        roots={visibleRoots}
        results={ko => result('root', ko)}
        accent={accent}
        soft={soft}
        onOpen={ko => { setOpenRootKo(ko); onQuery('') }}
      />
    )
  const body = openStem ? (
      <StemPage
        verb={openStem}
        lang={lang}
        accent={accent}
        soft={soft}
        owner={owner}
        subjectId={subjectId}
        reading={reading}
        onFinished={(score, total) => {
          onFinished('ending', openStem.dict, score, total)
        }}
        onBack={() => setOpenStemDict(null)}
      />
    ) : openNum ? (
      <NumberPage
        set={openNum}
        lang={lang}
        accent={accent}
        soft={soft}
        owner={owner}
        subjectId={subjectId}
        reading={reading}
        onFinished={(score, total) => {
          onFinished('number', openNum.id, score, total)
        }}
        onBack={() => setOpenNumId(null)}
      />
    ) : openPron ? (
      <PronPage
        rule={openPron}
        lang={lang}
        accent={accent}
        soft={soft}
        owner={owner}
        subjectId={subjectId}
        onFinished={(score, total) => {
          onFinished('pron', openPron.id, score, total)
        }}
        onBack={() => setOpenPronId(null)}
      />
    ) : openRoot ? (
      <RootPage
        root={openRoot}
        lang={lang}
        accent={accent}
        soft={soft}
        owner={owner}
        subjectId={subjectId}
        reading={reading}
        onFinished={(score, total) => {
          onFinished('root', openRoot.ko, score, total)
        }}
        onBack={() => setOpenRootKo(null)}
      />
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0, lineHeight: 1.6, ...proseWrap }}>
          {bindShortWords(t(intro))}
        </p>
        {grid}
      </div>
    )

  const content = !active ? null : body

  const open =
    openStem ? { screen: 'stems' as const, id: openStem.dict }
    : openRoot ? { screen: 'roots' as const, id: openRoot.ko }
    : openNum ? { screen: 'numbers' as const, id: openNum.id }
    : openPron ? { screen: 'sounds' as const, id: openPron.id }
    : null

  return {
    on,
    count: on ? KO_VERBS.length + rootsForLang(lang).length + KO_NUMBER_SETS.length + KO_PRON_RULES.length : undefined,
    subtitle: [
      stemsOn ? `${KO_VERBS.length} ${t('основ')}` : '',
      rootsOn ? `${rootsForLang(lang).length} ${t('корней')}` : '',
      numbersOn ? `${KO_NUMBER_SETS.length} ${t('наборов чисел')}` : '',
      soundsOn ? `${KO_PRON_RULES.length} ${t('правил чтения')}` : '',
    ].filter(Boolean).join(' · '),
    view,
    setView: switchView,
    views,
    open,
    openFromLink: (screen, id) => {
      setView(screen)
      if (screen === 'stems') setOpenStemDict(id)
      else if (screen === 'roots') setOpenRootKo(id)
      else if (screen === 'numbers') setOpenNumId(id)
      else setOpenPronId(id)
    },
    rail,
    toolbar,
    content,
    back: null,
    draftKey: [view, rootGroup].join('|'),
    reset: () => {
      setOpenStemDict(null); setOpenRootKo(null); setOpenNumId(null); setOpenPronId(null)
      setRootGroup('')
    },
  }
}
