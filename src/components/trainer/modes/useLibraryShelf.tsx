// ─────────────────────────────────────────────────────────────────────────────
// Библиотека — учебные тексты и записи аудирования
//
// ОДНА МАШИНА НА ДВА РЕЖИМА. «Чтение» и «Аудирование» — не соседи, а один
// механизм с разным содержимым: одна витрина плиток, одни фильтры (уровень,
// тематика, длина, статус), одна сортировка и одна запись результата. Различий
// ровно два: откуда берётся список и есть ли ось «Навык» (она только у текстов).
// Поэтому и вынесены вместе: разрезать их пополам значило бы завести вторую
// копию фильтров, которая разойдётся с первой на первой же правке.
//
// ЧИТАЛКА И ПЛЕЕР ОСТАЛИСЬ СНАРУЖИ. Открытый материал — это уже не витрина:
// текст читается тем же Reader, что и сцена, а запись открывается своим
// экраном с плеером. Сюда уехало то, что выбирает материал, а не то, что его
// показывает; наружу отдаются id открытого и способ его закрыть.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { useT } from '../../../lib/i18n'
import {
  Toolbar, ToolCount, SearchPill, FilterMenu, StatusTabs, SortMenu,
  Tile, TileGrid, TileChip, TileMeter, Empty as ShellEmpty, plural,
} from '../TrainerShell'
import type { ReadingText } from '../../../data/readingLibrary'
import type { ListeningItem } from '../../../data/listeningLibrary'
import type { MaterialKind, MaterialResult } from '../../../lib/trainerProgress'

/** Ось «сколько это займёт» — одна на тексты и записи. */
const LENGTHS: { value: string; label: string; fit: (m: number) => boolean }[] = [
  { value: 's', label: 'до 3 мин', fit: m => m <= 3 },
  { value: 'm', label: '3–5 мин', fit: m => m > 3 && m <= 5 },
  { value: 'l', label: 'больше 5 мин', fit: m => m > 5 },
]

const SORTS = [
  { value: 'order', label: 'По порядку' },
  { value: 'level', label: 'По уровню' },
  { value: 'short', label: 'Покороче' },
]

/** Пересечение выбранного списка со значением. Пустой список = «все». */
const anyOf = (picked: string[], value: string) => picked.length === 0 || picked.includes(value)

export interface LibraryShelf {
  /** Что сейчас открыто витриной: тексты или записи. */
  kind: MaterialKind
  /** Сколько материалов прошло сито — для подписи и счётчика. */
  shown: number
  toolbar: React.ReactNode
  content: React.ReactNode
  draftKey: string
  /** Смена режима сбрасывает сито: фильтры у режимов разные. */
  reset: () => void
}

export function useLibraryShelf({
  texts, audio, accent, soft, mode, active, query, onQuery, status, onStatus,
  levels, topics, skills, result, onOpenText, onOpenAudio,
}: {
  /** Списки материалов считает тренажёр: по ним же он считает бейджи режимов. */
  texts: ReadingText[]
  audio: ListeningItem[]
  accent: string
  soft: string
  /** Чья витрина открыта. От него зависит и список, и ось «Навык». */
  mode: 'reading' | 'listening'
  active: boolean
  query: string
  onQuery: (v: string) => void
  status: string
  onStatus: (v: string) => void
  /** Порядок ступеней, тем и навыков по таксономии языка — её знает тренажёр. */
  levels: string[]
  topics: string[]
  skills: string[]
  result: (kind: MaterialKind, id: string) => MaterialResult | undefined
  onOpenText: (id: string) => void
  onOpenAudio: (id: string) => void
}): LibraryShelf {
  const t = useT()

  const pool = mode === 'listening' ? audio : texts
  const kind: MaterialKind = mode === 'listening' ? 'listening' : 'reading'

  const [fLevel, setFLevel] = useState<string[]>([])
  const [fSkill, setFSkill] = useState<string[]>([])
  const [fTopic, setFTopic] = useState<string[]>([])
  const [fLen, setFLen] = useState<string[]>([])
  const [sort, setSort] = useState('order')

  // В списки попадают только те значения, которые реально встречаются в
  // материалах: иначе ученик выбирает «B2» и получает пустой экран. Значения
  // вне таксономии всё равно показываем — иначе материал с нестандартной
  // пометкой станет недоступен через фильтр.
  const present = (values: string[], order: string[]) => {
    const found = new Set(values)
    return [...order.filter(v => found.has(v)), ...[...found].filter(v => !order.includes(v))]
  }
  const levelOpts = useMemo(() => present(pool.map(x => x.level), levels), [pool, levels])
  const topicOpts = useMemo(() => present(pool.map(x => x.topic), topics), [pool, topics])
  const skillOpts = useMemo(() => present(texts.map(x => x.skill), skills), [texts, skills])

  /** Отфильтрованная и отсортированная библиотека текущего режима. */
  const library = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = pool.filter(x => {
      if (!anyOf(fLevel, x.level)) return false
      if (!anyOf(fTopic, x.topic)) return false
      if (mode === 'reading' && !anyOf(fSkill, (x as ReadingText).skill)) return false
      if (fLen.length > 0 && !LENGTHS.some(l => fLen.includes(l.value) && l.fit(x.minutes))) return false
      if (status === 'new' && result(kind, x.id)) return false
      if (status === 'done' && !result(kind, x.id)) return false
      if (q && !`${x.title} ${x.topic} ${t(x.topic)}`.toLowerCase().includes(q)) return false
      return true
    })
    if (sort === 'level') out.sort((a, b) => levelOpts.indexOf(a.level) - levelOpts.indexOf(b.level))
    if (sort === 'short') out.sort((a, b) => a.minutes - b.minutes)
    return out
  }, [pool, fLevel, fTopic, fSkill, fLen, status, query, sort, kind, result, levelOpts, mode, t])

  const toolbar = !active ? null : (
    <Toolbar count={library.length}>
      <SearchPill value={query} onChange={onQuery} placeholder={t('Название или тема…')} />
      {/* ОДНО МЕСТО ДЛЯ СИТА. Раньше уровень и тема стояли у библиотеки в
          рейле, у сцен и грамматики — таблетками в строке, а у наборов — и там,
          и там. Человек, перешедший из «Чтения» в «Аудирование», искал
          «Уровень» глазами заново. Теперь ось сужения ВСЕГДА таблетка строки, а
          рейл отвечает только на вопрос «что показываем». Порядок таблеток тоже
          один на весь тренажёр: поиск → уровень → тематика → частные оси →
          статус → сортировка → счётчик единицами экрана. */}
      {levelOpts.length > 1 && (
        <FilterMenu
          label="Уровень"
          options={levelOpts.map(v => ({ value: v, label: v, count: pool.filter(x => x.level === v).length }))}
          value={fLevel}
          onChange={setFLevel}
          accent={accent}
          soft={soft}
        />
      )}
      {topicOpts.length > 1 && (
        <FilterMenu
          label="Тематика"
          options={topicOpts.map(v => ({ value: v, label: t(v), count: pool.filter(x => x.topic === v).length }))}
          value={fTopic}
          onChange={setFTopic}
          accent={accent}
          soft={soft}
        />
      )}
      {mode === 'reading' && skillOpts.length > 1 && (
        <FilterMenu
          label="Навык"
          options={skillOpts.map(v => ({ value: v, label: t(v), count: texts.filter(x => x.skill === v).length }))}
          value={fSkill}
          onChange={setFSkill}
          accent={accent}
          soft={soft}
        />
      )}
      <FilterMenu
        label="Длина"
        options={LENGTHS.map(l => ({ value: l.value, label: t(l.label), count: pool.filter(x => l.fit(x.minutes)).length }))}
        value={fLen}
        onChange={setFLen}
        accent={accent}
        soft={soft}
      />
      <StatusTabs
        options={[
          { value: '', label: 'Все' },
          { value: 'new', label: 'Не начатые' },
          { value: 'done', label: 'Пройдено' },
        ]}
        value={status}
        onChange={onStatus}
        accent={accent}
      />
      <SortMenu options={SORTS} value={sort} onChange={setSort} accent={accent} soft={soft} />
      <ToolCount>
        {library.length} {t(plural(library.length, mode === 'listening'
          ? ['запись', 'записи', 'записей']
          : ['текст', 'текста', 'текстов']))}
      </ToolCount>
    </Toolbar>
  )

  const content = !active ? null : library.length === 0 ? (
    <ShellEmpty text={pool.length === 0
      ? 'Для этого языка материалов пока нет. Учитель может добавить свои.'
      : 'Под выбранные фильтры ничего не подошло. Сбрось один из них.'} />
  ) : (
    <TileGrid min={236}>
      {library.map(x => {
        const res = result(kind, x.id)
        return (
          <Tile
            key={x.id}
            accent={accent}
            onClick={() => (mode === 'listening' ? onOpenAudio(x.id) : onOpenText(x.id))}
          >
            {/* Ряд плашек один на весь тренажёр: уровень акцентом первым, дальше
                метки серым — тематика и размер. Тема была здесь серой строкой, а
                у сцен и грамматики то же самое стояло плашкой, и две соседние
                витрины выглядели как из разных приложений. */}
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
              <TileChip tone="accent" accent={accent} soft={soft}>{x.level}</TileChip>
              <TileChip tone="mute">{t(x.topic)}</TileChip>
              <TileChip tone="mute">{x.minutes} {t('мин')}</TileChip>
            </span>
            <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {x.title}
            </span>
            <TileMeter value={res ? Math.round((res.score / Math.max(res.total, 1)) * 100) : 0} />
            <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-3)' }}>
              <span>{res ? t('пройдено') : `${x.questions.length} ${t('вопроса')}`}</span>
              {res && (
                <span style={{ color: 'var(--color-green-text)', fontWeight: 700 }}>
                  {res.score} / {res.total}
                </span>
              )}
            </span>
          </Tile>
        )
      })}
    </TileGrid>
  )

  return {
    kind,
    shown: library.length,
    toolbar,
    content,
    draftKey: [fLevel.join(','), fSkill.join(','), fTopic.join(','), fLen.join(','), sort].join('|'),
    reset: () => { setFLevel([]); setFSkill([]); setFTopic([]); setFLen([]); setSort('order') },
  }
}
