// ─────────────────────────────────────────────────────────────────────────────
// Половина «Карточек» — гнёзда созвучий
//
// ЧТО ЭТО. Слова, которые слипаются на слух (물·불·뿔·풀·볼): разбор объясняет,
// чем они отличаются, прогон проверяет, слышно ли это, промахи уходят в колоду
// повторений. Половина открывается только у языков, для которых гнёзда
// написаны, — пустая вкладка хуже отсутствующей.
//
// ПОЧЕМУ ОТДЕЛИМА, В ОТЛИЧИЕ ОТ СОСЕДНИХ ПОЛОВИН. «Наборы» и «Повторение»
// делят разговорник, память колоды и стопки; гнёзда не делят ничего: свой
// список, своя витрина, свой разбор. Из четырёх половин «Карточек» это первая,
// которую можно вынуть, не разрезав ничего работающего.
//
// ГЛУБИНА ПО КУРСУ. Список режется по пройденному в курсе (nestsUpTo): ряд,
// который ученик ещё не проходил, не показывается, а сколько таких — говорит
// строка в рейле. Саму глубину считает тренажёр и передаёт сюда числом.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react'
import { Layers } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import { usePersistentState } from '../../../lib/useDraft'
import { bindShortWords, proseWrap } from '../../../lib/typography'
import {
  RailCard, RailStat, Toolbar, ToolCount, SearchPill, Empty as ShellEmpty,
} from '../TrainerShell'
import { NestGrid, NestPage } from '../SoundNestDrill'
import { hasNests, nestById, nestsForLang, nestsUpTo } from '../../../data/soundNests'
import type { MaterialResult } from '../../../lib/trainerProgress'

export interface NestsShelf {
  /** Есть ли гнёзда у этого языка. */
  on: boolean
  /** Открытое гнездо — по нему собирается адрес экрана. */
  openId: string | null
  setOpenId: (id: string | null) => void
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
}

export function useNestsShelf({
  lang, subjectId, accent, soft, active, query, onQuery, owner, reach, reachNote, result, onFinished,
}: {
  lang: string
  subjectId: string
  accent: string
  soft: string
  active: boolean
  query: string
  onQuery: (v: string) => void
  owner: { studentId?: string; anonName?: string }
  /** Докуда открыт курс: по нему режется список рядов. */
  reach: number
  /** Объяснение глубины словами — его формулирует тренажёр, он же знает курс. */
  reachNote: string
  result: (id: string) => MaterialResult | undefined
  onFinished: (id: string, score: number, total: number) => void
}): NestsShelf {
  const t = useT()

  const on = useMemo(() => hasNests(lang), [lang])
  const nests = useMemo(() => nestsUpTo(lang, reach), [lang, reach])
  /** Сколько гнёзд ещё закрыто глубиной — цифра честнее, чем молчание. */
  const locked = useMemo(() => nestsForLang(lang).length - nests.length, [lang, nests])

  const [openId, setOpenId] = usePersistentState<string | null>(`trainer.${lang}.nest`, null)
  const open = useMemo(() => (openId ? nestById(openId) ?? null : null), [openId])

  /** Поиск идёт и по самим словам: ученик ищет «불», а не «начальная согласная». */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return nests
    return nests.filter(n =>
      `${n.title} ${n.why} ${n.words.map(w => `${w.term} ${w.reading} ${w.ru}`).join(' ')}`
        .toLowerCase().includes(q))
  }, [nests, query])

  // Глубина стоит рядом с материалом, а не в шапке: цифра объясняет ровно то,
  // почему список именно такой длины.
  const rail = !active ? null : (
    <RailCard title="Глубина" accent={accent} icon={<Layers size={15} />}>
      <RailStat label="Рядов открыто" value={nests.length} />
      {locked > 0 && <RailStat label="Ждут курса" value={locked} />}
      <div style={{ fontSize: 11.5, color: 'var(--color-muted)', lineHeight: 1.5 }}>
        {t(reachNote)}
      </div>
    </RailCard>
  )

  const toolbar = !active || open ? null : (
    <Toolbar>
      <SearchPill value={query} onChange={onQuery} placeholder={t('Найти слово или ряд…')} />
      <ToolCount>
        {visible.length} {t('рядов')}
        {locked > 0 && ` · ${locked} ${t('ждут курса')}`}
      </ToolCount>
    </Toolbar>
  )

  const content = !active ? null : open ? (
    // Прогон пишет результат туда же, куда текст и запись, — в общий журнал
    // материалов, поэтому плитка гнезда показывает счёт ровно как плитка текста.
    <NestPage
      nest={open}
      lang={lang}
      accent={accent}
      soft={soft}
      owner={owner}
      subjectId={subjectId}
      onFinished={(score, total) => onFinished(open.id, score, total)}
      onBack={() => setOpenId(null)}
    />
  ) : visible.length === 0 ? (
    <ShellEmpty text={nests.length === 0
      ? 'Ряды созвучий открываются по мере прохождения курса — пока ни одного юнита не пройдено.'
      : 'Под поиск ничего не подошло.'} />
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0, lineHeight: 1.6, ...proseWrap }}>
        {bindShortWords(t('Слова, которые слипаются на слух. Разбор показывает, чем они отличаются, прогон проверяет, слышно ли это, а промахи уходят в колоду повторений и возвращаются сами.'))}
      </p>
      <NestGrid
        nests={visible}
        results={result}
        accent={accent}
        soft={soft}
        onOpen={id => { setOpenId(id); onQuery('') }}
      />
    </div>
  )

  return { on, openId, setOpenId, rail, toolbar, content }
}
