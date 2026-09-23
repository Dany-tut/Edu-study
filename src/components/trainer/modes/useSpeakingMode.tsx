// ─────────────────────────────────────────────────────────────────────────────
// Режим «Говорение» — записать и отправить
//
// Третий режим, вынесенный из LanguageTrainer; зачем и почему хуком, а не
// компонентом — в шапке useGuideMode.
//
// ЗДЕСЬ УЕХАЛА И САМА ВИТРИНА. У двух первых режимов экраны уже жили отдельными
// файлами (StoryReader, GrammarShelf), а говорение целиком — задания, запись,
// отправка, шэдоуинг — лежало в хвосте тренажёра тремя сотнями строк. Разница
// не в размере: пока оно там, «вынести режим» значит вынести половину режима, и
// следующий, кто пойдёт искать задания на говорение, снова откроет файл на
// четыре тысячи строк.
//
// ЧТО ОСТАЁТСЯ ОБЩИМ: поиск и фильтр «Все / Не начатые / Пройденные» — они одни
// на весь тренажёр, и режим принимает их пропами. Свой у него только вид
// задания (шэдоуинг, ролевые, вслух) — он живёт ровно столько, сколько открыт
// режим, и в адрес экрана не попадает.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Check, ListChecks, MessagesSquare, Mic, Repeat, SlidersHorizontal, Volume2, ChevronLeft } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import VoiceRecorder from '../../VoiceRecorder'
import Shadowing, { type ShadowLine } from '../Shadowing'
import { hasVoiceFor } from '../../../lib/speech'
import { submitTrainerVoice, listTrainerVoice, type VoiceEntry } from '../../../lib/trainerSpeaking'
import { ownerStudentIdFor } from '../../../store/studentDataStore'
import { useTrainerEngaged } from '../../../store/trainerProgressStore'
import type { SurvivalThemeCards } from '../../../data/survivalPhrases'
import {
  RailCard, RailSegment, RailStat, Toolbar, ToolButton, ToolCount, SearchPill, StatusTabs,
  Tile, TileGrid, TileChip, Empty as ShellEmpty, plural,
} from '../TrainerShell'

// ─── Говорение ───────────────────────────────────────────────────────────────

/**
 * Задание на говорение.
 *
 * `id` собирается из вида и ключа темы и в базу не уходит: записи опознаются по
 * тексту задания (см. VoiceEntry.prompt), потому что формулировка — это и есть
 * то, что видит преподаватель. Заводить ради связи отдельный идентификатор
 * значило бы хранить его в двух местах и однажды разойтись.
 */
interface SpeakTask {
  id: string
  kind: 'story' | 'roleplay' | 'aloud' | 'shadow'
  title: string
  prompt: string
  seconds: number
  /**
   * Реплики для шэдоуинга. Есть только у своего вида: остальные задания —
   * монолог по формулировке, и разбивать его на строки нечего.
   */
  lines?: ShadowLine[]
}

/**
 * Рассказы о себе — постоянный набор.
 *
 * Он намеренно маленький и не меняется: смысл в том, чтобы записывать ОДНО И ТО
 * ЖЕ раз в месяц и слышать собственный прогресс. Изнутри он не слышен вообще, а
 * на двух записях подряд очевиден за десять секунд.
 */
const SPEAKING_PROMPTS = [
  'Расскажи о себе: имя, чем занимаешься, зачем учишь язык. Минута.',
  'Опиши свой обычный день с утра до вечера.',
  'Расскажи о месте, где ты вырос. Что там было хорошего?',
  'Что ты делал на прошлых выходных? Используй прошедшее время.',
  'Какие у тебя планы на ближайший год?',
]

/**
 * Рассказы для курсов РОДНОГО языка.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ НАБОР. Общий список написан для изучающего чужой язык, и
 * ученику русского он предлагал «расскажи, зачем учишь язык» и «используй
 * прошедшее время». Первое бессмысленно, второе — инструкция человеку, который
 * говорит на этом языке с рождения. Родной курс тренирует не язык, а РЕЧЬ:
 * связность, точность, умение держать минуту, — и задания должны спрашивать
 * именно это.
 */
const NATIVE_SPEAKING_PROMPTS = [
  'Объясни незнакомому человеку, чем ты занимаешься. Минута, без «ну» и «как бы».',
  'Перескажи вчерашний разговор так, чтобы слушателю было понятно без вопросов.',
  'Возрази собеседнику, не повышая голоса: сначала согласись, потом поспорь.',
  'Опиши место, где ты вырос, тремя деталями — без общих слов «красиво» и «хорошо».',
  'Объясни за минуту вещь, в которой ты разбираешься, человеку не в теме.',
]

/**
 * Рассказы для литературы: разбор вслух, а не рассказ о себе.
 *
 * Курс про приёмы («деталь вместо описания», «первая строка»), и говорение в
 * нём — это устный разбор: то же, что делают на семинаре.
 */
const LITERATURE_SPEAKING_PROMPTS = [
  'Расскажи о книге, которую дочитал последней, не пересказывая сюжет.',
  'Возьми любую первую строку из прочитанного и объясни, что она обещает читателю.',
  'Опиши героя одной деталью — так, чтобы слушатель его увидел.',
  'Перескажи сцену от лица второстепенного персонажа.',
  'Объясни, чем ирония отличается от насмешки, на своём примере.',
]

/** Набор рассказов под предмет: чужой язык, родной язык, литература. */
function storyTasks(subjectId: string): SpeakTask[] {
  const prompts = subjectId === 'literature'
    ? LITERATURE_SPEAKING_PROMPTS
    : subjectId === 'russian'
      ? NATIVE_SPEAKING_PROMPTS
      : SPEAKING_PROMPTS
  return prompts.map((prompt, i) => ({
    id: `story-${i}`,
    kind: 'story',
    title: prompt.split(/[:.]/)[0],
    prompt,
    seconds: 60,
  }))
}

/**
 * Задания из разговорника.
 *
 * Ролевые сценарии написаны для каждой ситуации и до сих пор были видны только
 * внутри курса — в тренажёре режим предлагал пять рассказов о себе и всё.
 * Здесь они наконец доезжают до ученика, а чтение вслух собирается из первых
 * фраз темы: это единственное задание, где произношение проверяется не на
 * придуманном тексте, а на том, что человек реально будет говорить.
 */
/**
 * Сколько заданий даст разговорник. Считается БЕЗ сборки списка: цифра нужна
 * рейлу на всех режимах, в том числе пока говорение ни разу не открывали, а
 * строить ради неё восемьдесят объектов на каждый рендер незачем.
 */
function countSpeakTasks(themes: SurvivalThemeCards[], shadow: boolean): number {
  // Рассказов у всех наборов поровну (пять), поэтому предмет здесь не нужен:
  // счётчик рейла считает длину, а не содержимое.
  return themes.reduce((n, x) => n + 1 + (x.phrases.length >= 5 ? (shadow ? 2 : 1) : 0), 0) + SPEAKING_PROMPTS.length
}

/**
 * Сколько реплик даём за подход.
 *
 * Не вся тема: сорок фраз подряд с записью каждой — это сорок минут, и до
 * середины никто не доходит. Восемь реплик проходятся за пять-семь минут, а
 * тема из сорока фраз становится пятью подходами, а не одним неподъёмным.
 */
const SHADOW_LINES = 8

/**
 * Начало задания «прочитай вслух». Вынесено в константу, потому что сам
 * `prompt` — ещё и ключ хранения (по нему ищутся уже отправленные записи), и
 * переводить его целиком нельзя: список фраз в конце у каждой темы свой.
 * Переводим только это начало — см. speakPrompt().
 */
const ALOUD_PREFIX = 'Прочитайте вслух пять фраз темы:'

/** Текст задания на экран: у «вслух» переводим только начало, хвост — фразы темы. */
function speakPrompt(prompt: string, tr: (s: string) => string): string {
  return prompt.startsWith(ALOUD_PREFIX)
    ? tr(ALOUD_PREFIX) + prompt.slice(ALOUD_PREFIX.length)
    : tr(prompt)
}

function bookTasks(themes: SurvivalThemeCards[], shadow: boolean): SpeakTask[] {
  const out: SpeakTask[] = []
  for (const x of themes) {
    out.push({
      id: `role-${x.theme.id}`,
      kind: 'roleplay',
      title: x.theme.title,
      prompt: x.theme.roleplay,
      seconds: 90,
    })
    if (x.phrases.length >= 5) {
      // Реплика для повтора — это предложение, а не словарная форма: интонацию
      // и связки слышно только на целой фразе, а «Excuse me» отработать нечем.
      if (shadow) {
        out.push({
          id: `shadow-${x.theme.id}`,
          kind: 'shadow',
          title: x.theme.title,
          prompt: `Повторите за образцом ${SHADOW_LINES} реплик темы и сравните со своей записью.`,
          seconds: 0,
          lines: x.phrases.slice(0, SHADOW_LINES).map(ph => ({
            text: ph.ex?.term ?? ph.term,
            ru: ph.ex?.ru ?? ph.ru,
          })),
        })
      }
      out.push({
        id: `aloud-${x.theme.id}`,
        kind: 'aloud',
        title: x.theme.title,
        prompt: `${ALOUD_PREFIX} ${x.phrases.slice(0, 5).map(p => p.term).join(' · ')}`,
        seconds: 45,
      })
    }
  }
  return out
}

const KIND_LABEL: Record<SpeakTask['kind'], string> = {
  shadow: 'Шэдоуинг',
  story: 'Рассказ',
  roleplay: 'Ролевое',
  aloud: 'Чтение вслух',
}

function Speaking({ subjectId, subject, lang, accent, palette, themes, query, kindFilter, status, open, onOpen, onCounts }: {
  subjectId: string
  subject: string
  /** Код языка — по нему берётся голос эталона в шэдоуинге. */
  lang: string
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  themes: SurvivalThemeCards[]
  query: string
  kindFilter: string
  status: string
  /** Открытое задание держит родитель — там же живёт кнопка «К списку». */
  open: SpeakTask | null
  onOpen: (task: SpeakTask | null) => void
  /** Отдаёт наверх счётчики для рейла и строки — их считает этот компонент. */
  onCounts: (c: { total: number; sent: number; shown: number }) => void
}) {
  const t = useT()
  const [entries, setEntries] = useState<VoiceEntry[]>([])
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const owner = useMemo(() => ownerStudentIdFor(subjectId), [subjectId])

  // Занятие в говорении — это открытое задание с диктофоном, а не список.
  useTrainerEngaged(!!open)

  // Без голоса шэдоуинга нет: сравнивать себя не с чем.
  const canShadow = hasVoiceFor(lang)
  const tasks = useMemo(
    () => [...bookTasks(themes, canShadow), ...storyTasks(subjectId)],
    [themes, canShadow, subjectId])

  useEffect(() => {
    let alive = true
    listTrainerVoice(owner, subjectId)
      .then(rows => { if (alive) setEntries(rows) })
      .catch(() => { /* лента — не повод ронять режим */ })
    return () => { alive = false }
  }, [owner, subjectId, sendState])

  /** По каким заданиям запись уже уходила. Ключ — текст задания. */
  const sentPrompts = useMemo(() => new Set(entries.map(e => e.prompt).filter(Boolean)), [entries])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter(x => {
      // «Вслух» в фильтре — это рассказ о себе и чтение фраз разом: оба вида
      // монолог без диалога и без эталона для повтора, отдельными кнопками
      // они просто не помещались в рейл рядом с «Шэдоуингом» и «Ролевыми».
      if (kindFilter === 'aloud' ? (x.kind !== 'aloud' && x.kind !== 'story') : kindFilter && x.kind !== kindFilter) return false
      const done = sentPrompts.has(x.prompt)
      if (status === 'new' && done) return false
      if (status === 'done' && !done) return false
      if (q && !`${x.title} ${x.prompt}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, kindFilter, status, query, sentPrompts])

  useEffect(() => {
    onCounts({ total: tasks.length, sent: entries.length, shown: shown.length })
  }, [tasks.length, entries.length, shown.length, onCounts])

  async function handleRecorded(path: string | null) {
    if (!path || !open) return
    setSendState('sending')
    try {
      await submitTrainerVoice(owner, subjectId, subject, path, open.prompt)
      setSendState('done')
    } catch (e) {
      console.error('submitTrainerVoice:', e)
      setSendState('error')
    }
  }

  // ── Одно задание ───────────────────────────────────────────────────────────
  if (open) {
    const mine = entries.filter(e => e.prompt === open.prompt)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          padding: '16px 18px', borderRadius: 18,
          background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TileChip tone="accent" accent={accent} soft={palette.soft}>{t(KIND_LABEL[open.kind])}</TileChip>
            <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
              {open.lines ? `${open.lines.length} ${t('реплик')}` : `${open.seconds} ${t('с')}`}
            </span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--color-text)', marginBottom: 6 }}>{t(open.title)}</div>
          <p style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--color-text)' }}>{speakPrompt(open.prompt, t)}</p>
        </div>

        {/* Шэдоуинг живёт по своим правилам: не одна запись на всё задание, а
            петля по репликам, и наружу ничего не уходит (см. Shadowing.tsx). */}
        {open.kind === 'shadow' && open.lines ? (
          <Shadowing lines={open.lines} lang={lang} accent={palette.accent} soft={palette.soft} />
        ) : (
          <VoiceRecorder value={null} onChange={handleRecorded} maxSeconds={open.seconds + 30} accent={palette.accent} />
        )}

        {open.kind !== 'shadow' && sendState === 'sending' && (
          <p style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Отправляем преподавателю…')}</p>
        )}
        {open.kind !== 'shadow' && sendState === 'done' && (
          <p style={{ fontSize: 13, color: 'var(--color-green-text)', fontWeight: 600 }}>
            {t('Записано и отправлено. Преподаватель послушает и разберёт.')}
          </p>
        )}
        {open.kind !== 'shadow' && sendState === 'error' && (
          <p style={{ fontSize: 13, color: 'var(--color-red-text)', fontWeight: 600 }}>
            {t('Не получилось отправить. Проверь связь и попробуй ещё раз.')}
          </p>
        )}

        {/* История именно этого задания — то, ради чего режим и нужен: две
            записи с разницей в месяц стоят рядом и слушаются подряд. */}
        {mine.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>
              {t('Ваши записи по этому заданию')}: {mine.length}
            </div>
            {mine.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12,
                background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
              }}>
                <Mic size={14} style={{ color: accent, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--color-text-2)' }}>
                  {new Date(e.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
                <TileChip>{t('на проверке')}</TileChip>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Список заданий ─────────────────────────────────────────────────────────
  if (shown.length === 0) {
    return <ShellEmpty text="Под выбранные фильтры ничего не подошло. Сбрось один из них." />
  }

  return (
    <TileGrid min={236}>
      {shown.map(x => {
        const done = sentPrompts.has(x.prompt)
        return (
          <Tile key={x.id} accent={accent} onClick={() => { onOpen(x); setSendState('idle') }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TileChip tone="accent" accent={accent} soft={palette.soft}>{t(KIND_LABEL[x.kind])}</TileChip>
              <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                {x.lines ? `${x.lines.length} ${t('реплик')}` : `${x.seconds} ${t('с')}`}
              </span>
            </span>
            <span style={{ fontSize: 14.5, fontWeight: 750, color: 'var(--color-text)', lineHeight: 1.3 }}>
              {t(x.title)}
            </span>
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.45,
              overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3,
            }}>
              {speakPrompt(x.prompt, t)}
            </span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
              <span style={{ color: 'var(--color-text-3)' }}>
                {done ? t('записано') : t('не записано')}
              </span>
              {done && <Check size={13} style={{ color: 'var(--color-green-text)' }} />}
            </span>
          </Tile>
        )
      })}
    </TileGrid>
  )
}

// ─── Режим ───────────────────────────────────────────────────────────────────

export interface SpeakingMode {
  /** Число для пункта меню: сколько заданий собралось у этого языка. */
  count: number
  /** Подпись под названием предмета: задания и сколько записей уже отправлено. */
  subtitle: string
  /** Открыто ли задание — по этому страница понимает, что человек в материале. */
  openId: string | null
  rail: React.ReactNode
  toolbar: React.ReactNode
  content: React.ReactNode
  back: (() => void) | null
  /** Ключ черновиков: свой фильтр входит в него наравне с чужими. */
  draftKey: string
  /** Закрыть открытое — зовётся при переходе по ссылке в другой режим. */
  close: () => void
  /** Смена режима: закрыть открытое и сбросить свой фильтр. */
  reset: () => void
}

export function useSpeakingMode({
  lang, subject, subjectId, accent, palette, themes, query, onQuery, status, onStatus, active,
}: {
  lang: string
  subject: string
  subjectId: string
  accent: string
  palette: { accent: string; text: string; soft: string; ring: string }
  /** Темы разговорника — из них собираются задания. Считает их тренажёр: они же кормят карточки. */
  themes: SurvivalThemeCards[]
  query: string
  onQuery: (v: string) => void
  status: string
  onStatus: (v: string) => void
  active: boolean
}): SpeakingMode {
  const t = useT()
  const [open, setOpen] = useState<SpeakTask | null>(null)
  const [kindFilter, setKindFilter] = useState('')
  const [counts, setCounts] = useState({ total: 0, sent: 0, shown: 0 })

  const total = useMemo(() => countSpeakTasks(themes, hasVoiceFor(lang)), [themes, lang])

  const rail = !active ? null : (
    <RailCard title="Фильтры" accent={accent} icon={<SlidersHorizontal size={15} />}>
      {/* Четыре подписи в ряд шириной в рейл ломались пополам («Шэдо/уинг»).
          Название остаётся у выбранного — того, что сейчас и определяет
          выборку, — остальные ждут значками и называют себя по наведению. */}
      <RailSegment
        options={[
          // «Все» — такая же кнопка ряда, а не ссылка в углу карточки: без неё
          // ряд открывался четырьмя безымянными значками, и было непонятно,
          // что выборка сейчас полная.
          { value: '', label: 'Все', icon: <ListChecks size={15} /> },
          ...(hasVoiceFor(lang) ? [{ value: 'shadow', label: 'Шэдоуинг', icon: <Repeat size={15} /> }] : []),
          { value: 'roleplay', label: 'Ролевые', icon: <MessagesSquare size={15} /> },
          // Рассказ о себе и чтение фраз вслух — оба монолог без диалога и без
          // эталона для повтора, отдельной кнопкой «Рассказ» не помещались в
          // ряд. См. фильтр в Speaking().
          { value: 'aloud', label: 'Вслух', icon: <Volume2 size={15} /> },
        ]}
        value={kindFilter}
        onChange={setKindFilter}
        accent={accent}
        soft={palette.soft}
        clearable={false}
        idleIcon
      />
      <RailStat label="Заданий" value={total} />
      <RailStat label="Моих записей" value={counts.sent} tone={counts.sent > 0 ? 'good' : undefined} />
    </RailCard>
  )

  const toolbar = !active ? null : open ? (
    <Toolbar>
      <ToolButton onClick={() => setOpen(null)}>
        <ChevronLeft size={14} /> {t('К списку')}
      </ToolButton>
      <ToolCount>{t(open.title)}</ToolCount>
    </Toolbar>
  ) : (
    <Toolbar count={counts.shown}>
      <SearchPill value={query} onChange={onQuery} placeholder={t('Найти задание…')} />
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
      <ToolCount>{counts.shown} {t(plural(counts.shown, ['задание', 'задания', 'заданий']))}</ToolCount>
    </Toolbar>
  )

  const content = !active ? null : (
    <Speaking
      subjectId={subjectId}
      subject={subject}
      lang={lang}
      accent={accent}
      palette={palette}
      themes={themes}
      query={query}
      kindFilter={kindFilter}
      status={status}
      open={open}
      onOpen={setOpen}
      onCounts={setCounts}
    />
  )

  return {
    count: total,
    subtitle: `${total} ${t('заданий')} · ${counts.sent} ${t('записей')}`,
    openId: open?.id ?? null,
    rail,
    toolbar,
    content,
    back: active && open ? () => setOpen(null) : null,
    draftKey: kindFilter,
    close: () => setOpen(null),
    reset: () => { setOpen(null); setKindFilter('') },
  }
}
