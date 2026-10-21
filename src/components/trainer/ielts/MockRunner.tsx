// ─────────────────────────────────────────────────────────────────────────────
// Режим экзамена: пробник IELTS на весь экран
//
// ПОЧЕМУ НА ВЕСЬ ЭКРАН. Экзамен проверяет в том числе выдержку: шестьдесят
// минут на один текст за другим без меню слева и без соблазна заглянуть в
// карточки. Тренажёр вокруг — это ровно то, чего на экзамене не будет, поэтому
// пробник закрывает его целиком своим слоем.
//
// ПРАВИЛА ФОРМАТА, КОТОРЫЕ СОБЛЮДАЮТСЯ:
//   • запись Listening звучит один раз, без паузы и перемотки; перед каждой
//     частью 30 секунд на вопросы, в конце 2 минуты на проверку;
//   • Reading и Writing идут под общим таймером секции (по 60 минут), по
//     истечении секция сдаётся сама — с тем, что успели;
//   • в Speaking экзаменатор задаёт вопрос голосом, ответ слушается без
//     возможности перезаписать; в Part 2 минута на подготовку и две на ответ.
//
// ВЫХОД — ЭТО ПАУЗА ТОЛЬКО ДЛЯ ЧЕЛОВЕКА, НЕ ДЛЯ ТАЙМЕРА. Черновик хранит срок
// секции, а не остаток: вернулся через десять минут — у Reading на десять
// минут меньше. Иначе выход стал бы способом получить лишнее время, и балл
// пробника перестал бы что-то значить.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Headphones, LogOut, Mic, Square, Volume2, AlertTriangle, Pause, Play, Highlighter } from 'lucide-react'
import { useT } from '../../../lib/i18n'
import GrowTextarea, { growMinHeight } from '../../GrowTextarea'
import MockGroupView from './MockQuestions'
import MockResults, { gradeAttempt } from './MockResults'
import { speak, stopSpeech, hasVoiceFor, voiceOptions } from '../../../lib/speech'
import { isAsrAvailable, listenLong, type AsrSession } from '../../../lib/asr'
import {
  listeningBand, readingBand, rawScore, wordCount,
} from '../../../lib/ieltsScore'
import {
  saveDraft, saveAttempt, type MockDraft, type MockAttempt, type SectionResult, type SpeakingAnswer,
} from '../../../lib/ieltsMocks'
import {
  SECTION_ORDER, SECTION_LABEL, SECTION_MINUTES, LISTENING_PREVIEW_SECONDS, LISTENING_REVIEW_SECONDS,
  listeningQuestions, readingQuestions, sectionQuestions,
  type IeltsMock, type IeltsSection, type ListeningPart, type ScriptLine,
} from '../../../data/ieltsMocks'

const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Новая попытка. */
export function newDraft(mock: IeltsMock, scope: MockAttempt['scope']): MockDraft {
  const attempt: MockAttempt = {
    id: `${mock.id}-${Date.now().toString(36)}`,
    mockId: mock.id,
    scope,
    startedAt: Date.now(),
    sections: {},
  }
  return { attempt, section: scope === 'full' ? SECTION_ORDER[0] : scope, step: -1, deadline: null }
}

function sectionsOf(scope: MockAttempt['scope']): IeltsSection[] {
  return scope === 'full' ? SECTION_ORDER : [scope]
}

/** Тикает раз в секунду. setInterval, а не rAF: в превью rAF не срабатывает. */
function useNow(on: boolean): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [on])
  // Тик мог быть почти секунду назад, а срок поставили только что — без
  // поправки свежий таймер показывал «60:01».
  return Math.max(now, Date.now())
}

export default function MockRunner({ mock, draft: initial, accent, soft, onClose }: {
  mock: IeltsMock
  draft: MockDraft
  accent: string
  soft: string
  /** Закрыть слой. Попытка уже сохранена — в черновик или в историю. */
  onClose: () => void
}) {
  const t = useT()
  const [d, setD] = useState<MockDraft>(initial)
  // Сданная попытка открывается сразу результатом — так из истории смотрят разбор.
  const [done, setDone] = useState<MockAttempt | null>(initial.attempt.finishedAt ? initial.attempt : null)
  const [confirmExit, setConfirmExit] = useState(false)
  const now = useNow(!done)
  const wide = useWide(640)

  // Черновик пишется на каждое изменение — см. шапку lib/ieltsMocks.
  const update = useCallback((fn: (x: MockDraft) => MockDraft) => {
    setD(prev => {
      const next = fn(prev)
      saveDraft(next)
      return next
    })
  }, [])

  // Речь не должна пережить экзамен: закрытый слой с говорящим диктором — это
  // запись, которую нельзя остановить.
  useEffect(() => () => stopSpeech(), [])

  // Прокрутка страницы под слоем замирает, пока он открыт.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const patch = useCallback((s: IeltsSection, p: Partial<SectionResult>) => {
    update(x => ({
      ...x,
      attempt: { ...x.attempt, sections: { ...x.attempt.sections, [s]: { ...x.attempt.sections[s], ...p } } },
    }))
  }, [update])

  /**
   * Сдать текущую секцию и перейти к следующей (или к результату).
   *
   * Обновление чистое: всё, что выходит наружу (оценка, история), делают
   * эффекты ниже по состоянию. Функция-обновлятор может выполниться позже
   * вызова и даже дважды (StrictMode) — побочное действие внутри неё значило
   * бы два платных запроса за одно эссе.
   */
  const finishSection = useCallback(() => {
    update(x => {
      if (x.attempt.finishedAt) return x
      const s = x.section
      const cur: SectionResult = { ...x.attempt.sections[s], finishedAt: Date.now() }
      if (s === 'listening') {
        cur.raw = rawScore(listeningQuestions(mock), cur.answers ?? {})
        cur.band = listeningBand(cur.raw)
      } else if (s === 'reading') {
        cur.raw = rawScore(readingQuestions(mock), cur.answers ?? {})
        cur.band = readingBand(cur.raw)
      }
      const attempt: MockAttempt = { ...x.attempt, sections: { ...x.attempt.sections, [s]: cur } }
      const order = sectionsOf(attempt.scope)
      const nextSec = order[order.indexOf(s) + 1]
      if (nextSec) return { attempt, section: nextSec, step: -1, deadline: null }
      return { ...x, deadline: null, attempt: { ...attempt, finishedAt: Date.now() } }
    })
  }, [mock, update])

  // Оценка письма и речи уходит сразу после сдачи секции, не дожидаясь конца
  // пробника: пока человек говорит в Speaking, эссе уже проверяется. Только
  // недостающие оценки — повторный рендер не должен платить второй раз.
  useEffect(() => {
    gradeAttempt(d.attempt, mock, undefined, { onlyMissing: true })
  }, [d.attempt, mock])

  // Последняя секция сдана: попытка уходит в историю, черновик — прочь.
  useEffect(() => {
    if (!d.attempt.finishedAt || done) return
    stopSpeech()
    saveAttempt(d.attempt)
    saveDraft(null)
    setDone(d.attempt)
  }, [d.attempt, done])

  // Срок секции вышел — сдаём с тем, что успели. Срабатывает и после F5, и
  // после возвращения в пробник через час.
  useEffect(() => {
    if (!done && !d.paused && d.deadline != null && now >= d.deadline) finishSection()
  }, [now, d.deadline, d.paused, done, finishSection])

  const section = d.section
  const left = d.paused ? d.paused : d.deadline != null ? d.deadline - now : null

  // Пауза — только в практике одной секции и только там, где таймер свой
  // (Reading, Writing). В полном пробнике её нет, как и на экзамене; в
  // Listening её нет потому, что запись нельзя остановить на середине реплики.
  const canPause = !done && d.attempt.scope !== 'full' && d.step >= 0 && d.deadline != null
    && (section === 'reading' || section === 'writing')
  const togglePause = () => update(x => x.paused
    ? { ...x, deadline: Date.now() + x.paused, paused: null }
    : { ...x, paused: Math.max(0, (x.deadline ?? Date.now()) - Date.now()) })

  const startSection = () => {
    const minutes = section === 'reading' || section === 'writing' ? SECTION_MINUTES[section] : null
    update(x => ({
      ...x,
      step: 0,
      deadline: minutes ? Date.now() + minutes * 60_000 : null,
      attempt: { ...x.attempt, sections: { ...x.attempt.sections, [x.section]: { ...x.attempt.sections[x.section] } } },
    }))
  }

  const order = sectionsOf(d.attempt.scope)

  const body = done ? (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 16px 80px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 850, color: 'var(--color-text)', margin: '0 0 16px' }}>
        {t('Результат')} · {mock.title}
      </h2>
      <MockResults attempt={done} mock={mock} accent={accent} soft={soft} />
    </div>
  ) : d.step < 0 ? (
    <SectionIntro section={section} index={order.indexOf(section)} total={order.length} onStart={startSection} accent={accent} />
  ) : section === 'listening' ? (
    <ListeningRun mock={mock} d={d} update={update} patch={patch} finish={finishSection} now={now} accent={accent} soft={soft} />
  ) : section === 'reading' ? (
    <ReadingRun mock={mock} d={d} update={update} patch={patch} accent={accent} soft={soft} />
  ) : section === 'writing' ? (
    <WritingRun mock={mock} d={d} update={update} patch={patch} accent={accent} />
  ) : (
    <SpeakingRun mock={mock} d={d} update={update} patch={patch} finish={finishSection} accent={accent} />
  )

  const canSubmit = !done && d.step >= 0 && (section === 'reading' || section === 'writing')

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200, background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Шапка экзамена: где я, сколько осталось, сдать, выйти. */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: 'calc(env(safe-area-inset-top, 0px) + 10px) 16px 10px',
        borderBottom: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-3)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {wide ? `IELTS Academic · ${mock.title}` : mock.title}
          </span>
          <span style={{ fontSize: 15, fontWeight: 850, color: 'var(--color-text)' }}>
            {done ? t('Результат') : t(SECTION_LABEL[section])}
          </span>
        </div>

        {left != null && !done && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            color: left < 5 * 60_000 ? 'var(--color-red-text)' : 'var(--color-text)',
          }}>
            <Clock size={15} /> {mmss(left)}
          </span>
        )}

        {canPause && (
          <button type="button" onClick={togglePause} title={d.paused ? t('Продолжить') : t('Пауза')}
            style={{ ...ghostBtn, ...(wide ? {} : { width: 34, padding: 0, justifyContent: 'center' }) }}>
            {d.paused ? <Play size={14} /> : <Pause size={14} />} {wide && (d.paused ? t('Продолжить') : t('Пауза'))}
          </button>
        )}

        {canSubmit && (
          <button type="button" onClick={finishSection} style={solidBtn}>
            {wide ? t('Сдать секцию') : t('Сдать')}
          </button>
        )}

        <button type="button" onClick={() => (done ? onClose() : setConfirmExit(true))}
          title={done ? t('Закрыть') : t('Выйти')}
          style={{ ...ghostBtn, ...(wide ? {} : { width: 34, padding: 0, justifyContent: 'center' }) }}>
          <LogOut size={14} /> {wide && (done ? t('Закрыть') : t('Выйти'))}
        </button>
      </div>

      {confirmExit && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '10px 16px', background: soft, borderBottom: '1px solid var(--color-border-soft)',
        }}>
          <span style={{ flex: 1, minWidth: 220, fontSize: 13, lineHeight: 1.45, color: 'var(--color-text)' }}>
            {t('Ответы сохранятся, пробник можно продолжить позже. Таймер секции не останавливается — как на настоящем экзамене.')}
          </span>
          <button type="button" onClick={() => { stopSpeech(); onClose() }} style={solidBtn}>{t('Выйти')}</button>
          <button type="button" onClick={() => setConfirmExit(false)} style={ghostBtn}>{t('Остаться')}</button>
        </div>
      )}

      {/* Предупреждение за минуту до автосдачи: на экзамене об этом говорит
          таймер на экране, но взгляд в последние минуты прикован к тексту. */}
      {!done && !d.paused && left != null && left < 60_000 && d.deadline != null && (
        <div style={{
          flexShrink: 0, padding: '8px 16px', fontSize: 13, fontWeight: 700,
          background: 'rgba(228,87,58,0.12)', color: 'var(--color-red-text)',
        }}>
          {t('Меньше минуты — потом секция сдастся сама с тем, что уже отвечено.')}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* На паузе задания закрыты: пауза — чтобы отойти, а не чтобы
            подумать над вопросом без таймера. */}
        {!d.paused ? body : (
          <div style={{
            height: '100%', display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24,
          }}>
            <Pause size={32} style={{ color: accent }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{t('Пауза')} · {mmss(d.paused)}</div>
            <button type="button" onClick={togglePause} style={solidBtn}><Play size={14} /> {t('Продолжить')}</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

const solidBtn: React.CSSProperties = {
  height: 34, padding: '0 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
  background: 'var(--grad-purple)', color: '#fff', fontWeight: 750, fontSize: 13, fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

const ghostBtn: React.CSSProperties = {
  height: 34, padding: '0 14px', borderRadius: 999, cursor: 'pointer',
  background: 'var(--color-bg-3)', color: 'var(--color-text)', border: 'none',
  fontWeight: 700, fontSize: 13, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
}

interface RunProps {
  mock: IeltsMock
  d: MockDraft
  update: (fn: (x: MockDraft) => MockDraft) => void
  patch: (s: IeltsSection, p: Partial<SectionResult>) => void
}

// ─── Вступление к секции ─────────────────────────────────────────────────────

const INTRO: Record<IeltsSection, string[]> = {
  listening: [
    '4 части, 40 вопросов, около 30 минут.',
    'Каждая запись звучит ОДИН раз — паузы и перемотки нет.',
    'Перед каждой частью 30 секунд, чтобы прочитать вопросы. В конце 2 минуты на проверку.',
    'Наденьте наушники. Ответы пишите прямо по ходу записи.',
  ],
  reading: [
    '3 текста, 40 вопросов, 60 минут на всё.',
    'Тексты можно переключать в любом порядке. Номера внизу показывают, что уже отвечено.',
    'По истечении времени секция сдаётся сама.',
    'Ориентир: около 20 минут на текст, третий — самый трудный.',
  ],
  writing: [
    'Два задания, 60 минут на оба.',
    'Task 1 — описание графика, от 150 слов, около 20 минут.',
    'Task 2 — эссе, от 250 слов, около 40 минут. Оно весит вдвое больше.',
    'После сдачи модель оценит оба задания по четырём критериям.',
  ],
  speaking: [
    'Три части, 11–14 минут. Вопросы задаёт голос экзаменатора.',
    'Отвечайте сразу после вопроса — ответ слушается один раз, перезаписи нет.',
    'В Part 2 — минута на подготовку и до двух минут монолога.',
    'Речь распознаёт браузер, модель оценивает беглость, лексику и грамматику. Произношение по расшифровке не оценивается.',
  ],
}

function SectionIntro({ section, index, total, onStart, accent }: {
  section: IeltsSection
  index: number
  total: number
  onStart: () => void
  accent: string
}) {
  const t = useT()
  const Icon = section === 'listening' ? Headphones : section === 'speaking' ? Mic : Clock
  const noVoice = section === 'listening' && !hasVoiceFor('en')
  const noAsr = section === 'speaking' && !isAsrAvailable()
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 16px 80px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {total > 1 && (
        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-3)' }}>
          {t('Секция')} {index + 1} {t('из')} {total}
        </span>
      )}
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 26, fontWeight: 850, color: 'var(--color-text)' }}>
        <Icon size={24} style={{ color: accent }} /> {SECTION_LABEL[section]}
      </h2>
      <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 15, lineHeight: 1.5, color: 'var(--color-text)' }}>
        {INTRO[section].map((x, i) => <li key={i}>{t(x)}</li>)}
      </ul>
      {(noVoice || noAsr) && (
        <div style={{
          display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.5,
          background: 'rgba(228,87,58,0.08)', color: 'var(--color-text)',
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-red-text)', flexShrink: 0, marginTop: 2 }} />
          {noVoice
            ? t('В этом браузере нет английского голоса — записи Listening не прозвучат. Откройте пробник в Chrome, Edge или Safari.')
            : t('В этом браузере нет распознавания речи — ответы Speaking не запишутся. Откройте пробник в Chrome, Edge или Safari.')}
        </div>
      )}
      <div>
        <button type="button" onClick={onStart} style={{ ...solidBtn, height: 44, padding: '0 26px', fontSize: 15 }}>
          {t('Начать')}
        </button>
      </div>
    </div>
  )
}

// ─── Номера вопросов ─────────────────────────────────────────────────────────

/**
 * Полоса номеров внизу, как на компьютерном экзамене: отвеченные подсвечены,
 * клик ведёт к вопросу. Без неё на третьем тексте не видно, что во втором
 * осталось два пустых ответа.
 */
function QuestionStrip({ numbers, answers, onPick, accent, soft }: {
  numbers: number[]
  answers: Record<number, string>
  onPick: (n: number) => void
  accent: string
  soft: string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {numbers.map(n => {
        const on = !!answers[n]?.trim()
        return (
          <button key={n} type="button" onClick={() => onPick(n)} style={{
            width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 11.5, fontWeight: 800, border: `1.5px solid ${on ? accent : 'var(--color-border-soft)'}`,
            background: on ? soft : 'var(--color-bg-2)', color: on ? accent : 'var(--color-text-2)',
          }}>{n}</button>
        )
      })}
    </div>
  )
}

const scrollToQ = (n: number) =>
  setTimeout(() => document.getElementById(`mock-q-${n}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30)

// ─── Listening ───────────────────────────────────────────────────────────────

/**
 * Голоса записи. Диктору, женщине и мужчине — разные голоса, если в системе
 * их хватает: диалог одним голосом на два лица превращает Part 1 в загадку
 * «кто это сказал», которой на экзамене нет.
 */
function castVoices(part: ListeningPart): Partial<Record<ScriptLine['who'], string>> {
  const opts = voiceOptions('en')
  if (!opts.length) return {}
  const f = opts.filter(o => o.role === 'f')
  const m = opts.filter(o => o.role === 'm')
  const out: Partial<Record<ScriptLine['who'], string>> = {}
  const used = { f: 0, m: 0 }
  let any = 0
  // Порядок: сначала участники, диктору — что осталось, чтобы он не совпал с героем.
  const who = (Object.keys(part.voices) as ScriptLine['who'][]).sort((a, b) => (a === 'N' ? 1 : b === 'N' ? -1 : 0))
  for (const w of who) {
    const g = part.voices[w]!
    const pool = g === 'f' ? f : m
    const pick = pool[used[g]++] ?? pool[0] ?? opts[any++ % opts.length]
    out[w] = pick?.voice.name
  }
  return out
}

function ListeningRun({ mock, d, update, patch, finish, now, accent, soft }: RunProps & {
  finish: () => void
  now: number
  accent: string
  soft: string
}) {
  const t = useT()
  const step = d.step
  const review = step >= mock.listening.length
  const part = mock.listening[Math.min(step, mock.listening.length - 1)]
  const answers = d.attempt.sections.listening?.answers ?? {}
  const [phase, setPhase] = useState<'preview' | 'play'>('preview')
  const [previewEnd, setPreviewEnd] = useState(() => Date.now() + LISTENING_PREVIEW_SECONDS * 1000)
  const [line, setLine] = useState(0)
  const cancelRef = useRef<() => void>(() => {})

  // Новая часть — снова полминуты на вопросы. После F5 часть начинается
  // заново с превью: запись нельзя продолжить с середины реплики.
  useEffect(() => {
    if (review) return
    setPhase('preview')
    setLine(0)
    setPreviewEnd(Date.now() + LISTENING_PREVIEW_SECONDS * 1000)
  }, [step, review])

  const play = useCallback(() => {
    setPhase('play')
    const voices = castVoices(part)
    let cancelled = false
    let i = 0
    const next = () => {
      if (cancelled) return
      if (i >= part.script.length) {
        // Часть кончилась: следующая или проверка в конце.
        update(x => {
          const nextStep = x.step + 1
          return nextStep >= mock.listening.length
            ? { ...x, step: nextStep, deadline: Date.now() + LISTENING_REVIEW_SECONDS * 1000 }
            : { ...x, step: nextStep }
        })
        return
      }
      const ln = part.script[i++]
      setLine(i)
      speak(ln.text, {
        lang: 'en-GB',
        voiceName: voices[ln.who],
        // Пауза между репликами — как в студийной записи: без неё ответ на
        // вопрос формы прилипает к самому вопросу.
        onEnd: () => { if (!cancelled) setTimeout(next, 450) },
      })
    }
    next()
    cancelRef.current = () => { cancelled = true; stopSpeech() }
  }, [part, mock.listening.length, update])

  useEffect(() => () => cancelRef.current(), [])

  // Превью вышло — запись пошла.
  useEffect(() => {
    if (!review && phase === 'preview' && now >= previewEnd) play()
  }, [now, previewEnd, phase, review, play])

  const setAnswer = (n: number, v: string) => patch('listening', { answers: { ...answers, [n]: v } })
  const parts = review ? mock.listening : [part]

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14,
        background: soft, color: 'var(--color-text)', fontSize: 13.5, fontWeight: 650,
      }}>
        {review ? (
          <>
            <Clock size={16} style={{ color: accent }} />
            <span style={{ flex: 1 }}>{t('Запись закончилась. Время проверить ответы — потом секция сдастся сама.')}</span>
            <button type="button" onClick={finish} style={solidBtn}>{t('Сдать')}</button>
          </>
        ) : phase === 'preview' ? (
          <>
            <Clock size={16} style={{ color: accent }} />
            <span style={{ flex: 1 }}>{part.title} · {t('прочитайте вопросы, запись начнётся через')} {mmss(previewEnd - now)}</span>
            <button type="button" onClick={play} style={ghostBtn}>{t('Начать сейчас')}</button>
          </>
        ) : (
          <>
            <Volume2 size={16} style={{ color: accent }} />
            <span style={{ flex: 1 }}>{part.title} · {t('идёт запись')} · {line}/{part.script.length}</span>
          </>
        )}
      </div>

      {parts.map((p, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {review && <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>{p.title}</div>}
          {p.groups.map((g, j) => (
            <MockGroupView key={j} group={g} answers={answers} onAnswer={setAnswer} accent={accent} soft={soft} />
          ))}
        </div>
      ))}

      <QuestionStrip numbers={parts.flatMap(p => sectionQuestions(p.groups).map(q => q.n))}
        answers={answers} onPick={scrollToQ} accent={accent} soft={soft} />
    </div>
  )
}

// ─── Reading ─────────────────────────────────────────────────────────────────

function useWide(min = 900): boolean {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= min)
  useEffect(() => {
    const on = () => setWide(window.innerWidth >= min)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [min])
  return wide
}

function ReadingRun({ mock, d, update, patch, accent, soft }: RunProps & { accent: string; soft: string }) {
  const t = useT()
  const wide = useWide()
  const step = Math.min(d.step, mock.reading.length - 1)
  const passage = mock.reading[step]
  const answers = d.attempt.sections.reading?.answers ?? {}
  const setAnswer = (n: number, v: string) => patch('reading', { answers: { ...answers, [n]: v } })
  const textRef = useRef<HTMLDivElement>(null)

  const go = (i: number) => {
    update(x => ({ ...x, step: i }))
    textRef.current?.scrollTo({ top: 0 })
  }

  const all = useMemo(() => mock.reading.map(p => sectionQuestions(p.groups).map(q => q.n)), [mock])

  // ── Маркер ──────────────────────────────────────────────────────────────
  // Как на компьютерном экзамене: выделил кусок текста — подсветил. Хранится
  // строкой внутри абзаца, а не смещениями: так выделение переживает и F5, и
  // смену ширины, когда абзац переносится по-другому.
  const marks = d.attempt.sections.reading?.marks ?? {}
  const [pick, setPick] = useState<{ key: string; text: string; x: number; y: number } | null>(null)

  const onSelect = () => {
    const sel = window.getSelection()
    const raw = sel?.toString().replace(/\s+/g, ' ').trim() ?? ''
    if (!sel || sel.rangeCount === 0 || raw.length < 2 || raw.length > 300) { setPick(null); return }
    const host = (sel.anchorNode?.parentElement)?.closest('[data-para]') as HTMLElement | null
    const end = (sel.focusNode?.parentElement)?.closest('[data-para]') as HTMLElement | null
    // Выделение через два абзаца не маркируем: на экзамене маркер тоже
    // работает в пределах одного куска текста.
    if (!host || host !== end) { setPick(null); return }
    const r = sel.getRangeAt(0).getBoundingClientRect()
    setPick({ key: `${step}:${host.dataset.para}`, text: raw, x: r.left + r.width / 2, y: r.top })
  }

  const addMark = () => {
    if (!pick) return
    const cur = marks[pick.key] ?? []
    if (!cur.includes(pick.text)) patch('reading', { marks: { ...marks, [pick.key]: [...cur, pick.text] } })
    window.getSelection()?.removeAllRanges()
    setPick(null)
  }

  const dropMark = (key: string, m: string) =>
    patch('reading', { marks: { ...marks, [key]: (marks[key] ?? []).filter(x => x !== m) } })

  const text = (
    <div ref={textRef} onMouseUp={onSelect} onTouchEnd={() => setTimeout(onSelect, 30)}
      style={{ padding: '20px 18px', ...(wide ? { overflowY: 'auto', height: '100%' } : {}) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6 }}>
        <span style={{ flex: 1 }}>{t('Текст')} {step + 1} · {t('вопросы')} {all[step][0]}–{all[step][all[step].length - 1]}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: 'var(--color-text-3)' }}>
          <Highlighter size={12} /> {t('выделите текст, чтобы отметить')}
        </span>
      </div>
      <h2 style={{ margin: '0 0 14px', fontSize: 20, fontWeight: 850, color: 'var(--color-text)' }}>{passage.title}</h2>
      {passage.paragraphs.map((p, i) => {
        const key = `${step}:${i}`
        return (
          <p key={i} data-para={i} style={{ margin: '0 0 12px', fontSize: 15, lineHeight: 1.65, color: 'var(--color-text)' }}>
            {p.label && <b style={{ color: accent, marginRight: 8 }}>{p.label}</b>}
            <Marked text={p.text} marks={marks[key] ?? []} onDrop={m => dropMark(key, m)} />
          </p>
        )
      })}
      {pick && (
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={addMark} style={{
          position: 'fixed', left: pick.x, top: Math.max(8, pick.y - 42), transform: 'translateX(-50%)', zIndex: 5,
          ...solidBtn, height: 32, boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
        }}>
          <Highlighter size={13} /> {t('Выделить')}
        </button>
      )}
    </div>
  )

  const questions = (
    <div style={{ padding: '20px 18px 120px', display: 'flex', flexDirection: 'column', gap: 22, ...(wide ? { overflowY: 'auto', height: '100%' } : {}) }}>
      {passage.groups.map((g, j) => (
        <MockGroupView key={`${step}-${j}`} group={g} answers={answers} onAnswer={setAnswer} accent={accent} soft={soft} />
      ))}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: wide ? '100%' : undefined }}>
      {wide ? (
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ minHeight: 0, borderRight: '1px solid var(--color-border-soft)' }}>{text}</div>
          <div style={{ minHeight: 0 }}>{questions}</div>
        </div>
      ) : (
        <>{text}{questions}</>
      )}

      {/* Нижняя полоса: тексты и номера. Липкая на телефоне, где колонок нет. */}
      <div style={{
        flexShrink: 0, position: wide ? 'static' : 'sticky', bottom: 0,
        display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 16px calc(env(safe-area-inset-bottom, 0px) + 10px)',
        background: 'var(--color-bg-2)', borderTop: '1px solid var(--color-border-soft)',
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {mock.reading.map((_, i) => {
            const n = all[i].filter(q => answers[q]?.trim()).length
            return (
              <button key={i} type="button" onClick={() => go(i)} style={{
                ...ghostBtn, height: 30, fontSize: 12.5,
                background: i === step ? soft : 'var(--color-bg-3)', color: i === step ? accent : 'var(--color-text)',
              }}>
                {wide ? `${t('Текст')} ${i + 1}` : i + 1} · {n}/{all[i].length}
              </button>
            )
          })}
        </div>
        {/* На телефоне — номера только текущего текста: сорок кнопок занимали
            треть экрана поверх самого текста. Остальные видны счётчиком на
            кнопке текста. */}
        <QuestionStrip numbers={wide ? all.flat() : all[step]} answers={answers} accent={accent} soft={soft}
          onPick={n => {
            const i = all.findIndex(list => list.includes(n))
            if (i !== step) go(i)
            scrollToQ(n)
          }} />
      </div>
    </div>
  )
}

/**
 * Абзац с подсветкой. Каждый отмеченный кусок подсвечивается там, где он
 * встречается в абзаце; клик по подсветке снимает её.
 */
function Marked({ text, marks, onDrop }: { text: string; marks: string[]; onDrop: (m: string) => void }) {
  const t = useT()
  if (!marks.length) return <>{text}</>
  const parts: { s: string; m?: string }[] = []
  let rest = text
  while (rest) {
    let hit: { at: number; m: string } | null = null
    for (const m of marks) {
      const at = rest.indexOf(m)
      if (at >= 0 && (!hit || at < hit.at)) hit = { at, m }
    }
    if (!hit) { parts.push({ s: rest }); break }
    if (hit.at > 0) parts.push({ s: rest.slice(0, hit.at) })
    parts.push({ s: hit.m, m: hit.m })
    rest = rest.slice(hit.at + hit.m.length)
  }
  return (
    <>
      {parts.map((x, i) => x.m ? (
        <mark key={i} onClick={() => onDrop(x.m!)} title={t('Снять выделение')} style={{
          background: 'rgba(255, 214, 10, 0.45)', color: 'inherit', borderRadius: 3, cursor: 'pointer', padding: '0 1px',
        }}>{x.s}</mark>
      ) : <span key={i}>{x.s}</span>)}
    </>
  )
}

// ─── Writing ─────────────────────────────────────────────────────────────────

function WritingRun({ mock, d, update, patch, accent }: RunProps & { accent: string }) {
  const t = useT()
  const wide = useWide()
  const step = Math.min(d.step, mock.writing.length - 1)
  const task = mock.writing[step]
  const texts = d.attempt.sections.writing?.texts ?? { 1: '', 2: '' }
  const text = texts[task.task] ?? ''
  const words = wordCount(text)
  const short = words < task.minWords

  return (
    <div style={{
      maxWidth: 1180, margin: '0 auto', padding: '20px 16px 120px',
      display: 'grid', gridTemplateColumns: wide ? 'minmax(0, 5fr) minmax(0, 6fr)' : '1fr', gap: 20,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {mock.writing.map((w, i) => (
            <button key={w.task} type="button" onClick={() => update(x => ({ ...x, step: i }))} style={{
              ...ghostBtn, height: 30, fontSize: 12.5,
              background: i === step ? 'var(--grad-purple)' : 'var(--color-bg-3)',
              color: i === step ? '#fff' : 'var(--color-text)',
            }}>
              Task {w.task} · {wordCount(texts[w.task] ?? '')} {t('сл.')}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--color-text-3)', fontWeight: 650 }}>
          {t('Около')} {task.minutes} {t('минут')} · {t('не меньше')} {task.minWords} {t('слов')}
        </div>
        <div style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)' }}>{task.prompt}</div>
        {task.image && (
          <img src={task.image} alt="" style={{ width: '100%', borderRadius: 14, border: '1px solid var(--color-border-soft)', background: '#fff' }} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <GrowTextarea
          value={text}
          onChange={v => patch('writing', { texts: { ...texts, [task.task]: v } as Record<1 | 2, string> })}
          minHeight={growMinHeight(task.task === 1 ? 12 : 18, 15, 14)}
          spellCheck={false}
          autoCorrect="off"
          placeholder={t('Пишите здесь. Проверка орфографии выключена — как на экзамене.')}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 16, fontFamily: 'inherit', fontSize: 15,
            background: 'var(--color-bg-2)', color: 'var(--color-text)', outline: 'none',
            border: '1.5px solid var(--color-border-soft)',
          }}
        />
        <div style={{ fontSize: 13, fontWeight: 700, color: short ? 'var(--color-red-text)' : 'var(--color-green-text)' }}>
          {t('Слов')}: {words}{short ? ` · ${t('нужно ещё')} ${task.minWords - words}` : ''}
        </div>
      </div>
    </div>
  )
}

// ─── Speaking ────────────────────────────────────────────────────────────────

interface SpeakItem {
  part: 1 | 2 | 3
  /** Что произносит экзаменатор перед ответом. */
  ask: string
  /** Что видно на экране. */
  question: string
  card?: { topic: string; points: string[]; close: string }
  prep: number
  seconds: number
}

function speakItems(mock: IeltsMock): SpeakItem[] {
  const out: SpeakItem[] = []
  for (const p of mock.speaking) {
    if (p.card) {
      out.push({
        part: p.part,
        ask: `Now I'm going to give you a topic, and I'd like you to talk about it for one to two minutes. You have one minute to prepare. ${p.card.topic}`,
        question: p.card.topic,
        card: p.card,
        prep: p.prepSeconds ?? 60,
        seconds: p.answerSeconds,
      })
    } else {
      for (const q of p.questions ?? []) out.push({ part: p.part, ask: q, question: q, prep: 0, seconds: p.answerSeconds })
    }
  }
  return out
}

function SpeakingRun({ mock, d, update, patch, finish, accent }: RunProps & { finish: () => void; accent: string }) {
  const t = useT()
  const items = useMemo(() => speakItems(mock), [mock])
  const step = Math.min(d.step, items.length - 1)
  const item = items[step]
  const speech = d.attempt.sections.speaking?.speech ?? []
  const [phase, setPhase] = useState<'ask' | 'prep' | 'answer'>('ask')
  const [until, setUntil] = useState(0)
  const [notes, setNotes] = useState('')
  const now = useNow(phase !== 'ask')
  const asrRef = useRef<AsrSession | null>(null)
  const startedRef = useRef(0)
  const savingRef = useRef(false)
  const proceedRef = useRef<() => void>(() => {})

  const startAnswer = useCallback(() => {
    setPhase('answer')
    startedRef.current = Date.now()
    setUntil(Date.now() + item.seconds * 1000)
    asrRef.current = listenLong('en-US')
  }, [item.seconds])

  // Новый вопрос: экзаменатор задаёт его голосом, потом — подготовка или ответ.
  useEffect(() => {
    setPhase('ask')
    savingRef.current = false
    stopSpeech()
    // onEnd приходит и у прерванной речи — когда вопрос сменился или слой
    // закрыли. Слушать после прерванного вопроса нельзя: это была бы вторая,
    // брошенная сессия распознавания с открытым микрофоном.
    let alive = true
    let moved = false
    // К ответу — ровно один раз: по концу вопроса или кнопкой «Отвечать»
    // (голоса нет, вопрос слышен плохо, человек прочитал его с экрана).
    const proceed = () => {
      if (!alive || moved) return
      moved = true
      if (item.prep) { setPhase('prep'); setUntil(Date.now() + item.prep * 1000) } else startAnswer()
    }
    proceedRef.current = proceed
    const h = speak(item.ask, { lang: 'en-GB', onEnd: proceed })
    return () => { alive = false; h.stop(); asrRef.current?.cancel(); asrRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const save = useCallback(async () => {
    if (savingRef.current) return
    savingRef.current = true
    const session = asrRef.current
    asrRef.current = null
    session?.stop()
    // Дослушиваем хвост не дольше полутора секунд: распознавалка отдаёт
    // последние слова после stop(), но ждать её бесконечно нельзя.
    const transcript = session
      ? await Promise.race([session.done, new Promise<string>(r => setTimeout(() => r(''), 1500))])
      : ''
    const ans: SpeakingAnswer = {
      part: item.part,
      question: item.question,
      transcript,
      seconds: Math.round((Date.now() - startedRef.current) / 1000),
    }
    const nextSpeech = [...speech.filter(x => x.question !== item.question), ans]
    patch('speaking', { speech: nextSpeech })
    if (step + 1 >= items.length) finish()
    else update(x => ({ ...x, step: x.step + 1 }))
  }, [item, speech, patch, step, items.length, finish, update])

  // Время вышло: подготовка → ответ, ответ → следующий вопрос.
  useEffect(() => {
    if (phase === 'prep' && now >= until) startAnswer()
    if (phase === 'answer' && now >= until) void save()
  }, [now, until, phase, startAnswer, save])

  const asr = isAsrAvailable()

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 16px 120px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: accent }}>
        Part {item.part} · {t('вопрос')} {step + 1} {t('из')} {items.length}
      </div>

      {item.card ? (
        <div style={{ padding: '18px 20px', borderRadius: 18, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10 }}>{item.card.topic}</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 6 }}>You should say:</div>
          <ul style={{ margin: '0 0 8px', paddingLeft: 20, fontSize: 15, lineHeight: 1.6, color: 'var(--color-text)' }}>
            {item.card.points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <div style={{ fontSize: 15, color: 'var(--color-text)' }}>{item.card.close}</div>
        </div>
      ) : (
        <div style={{ fontSize: 20, lineHeight: 1.45, fontWeight: 750, color: 'var(--color-text)' }}>{item.question}</div>
      )}

      {phase === 'ask' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--color-text-2)' }}>
          <Volume2 size={16} style={{ color: accent }} /> {t('Экзаменатор задаёт вопрос…')}
          <button type="button" onClick={() => { stopSpeech(); proceedRef.current() }} style={{ ...ghostBtn, marginLeft: 'auto' }}>
            {t('Отвечать')}
          </button>
        </div>
      )}

      {phase === 'prep' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
            <Clock size={16} style={{ color: accent }} /> {t('Подготовка')}: {mmss(until - now)}
            <button type="button" onClick={startAnswer} style={{ ...ghostBtn, marginLeft: 'auto' }}>{t('Готов говорить')}</button>
          </div>
          <GrowTextarea value={notes} onChange={setNotes} minHeight={growMinHeight(4, 14, 12)}
            placeholder={t('Заметки — как на листке на экзамене. Они никуда не уходят.')}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 14, fontFamily: 'inherit', fontSize: 14,
              background: 'var(--color-bg-2)', color: 'var(--color-text)', outline: 'none', border: '1.5px solid var(--color-border-soft)',
            }} />
        </>
      )}

      {phase === 'answer' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 800, color: 'var(--color-red-text)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-red-text)' }} />
            {t('Говорите')} · {mmss(until - now)}
          </span>
          <button type="button" onClick={() => void save()} style={{ ...solidBtn, marginLeft: 'auto' }}>
            <Square size={13} /> {t('Закончить ответ')}
          </button>
        </div>
      )}

      {!asr && (
        <div style={{ fontSize: 13, color: 'var(--color-red-text)' }}>
          {t('Распознавания речи в этом браузере нет — ответ не запишется и не оценится.')}
        </div>
      )}
    </div>
  )
}
