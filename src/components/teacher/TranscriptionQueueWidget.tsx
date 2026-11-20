import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { AudioLines, Loader2, X } from '../icons/appIcons'
import ScrollFade from '../ScrollFade'
import FadeText from '../FadeText'
import { useT } from '../../lib/i18n'
import { dropdownSurface } from '../../lib/dropdownStyle'
import { localRequest } from '../../lib/localTranscription'
import { useTranscriptionOwner } from './LocalTranscription'
import { useTeacher } from '../../store/teacherStore'
import { openLessonInCourseEditor } from '../../lib/teacherNav'
import './transcriptionQueueWidget.css'

// Статус очереди расшифровки компьютера. Таблетка живёт в правом кластере
// верхнего нав-бара учителя и видна, только когда что-то идёт или ждёт
// очереди. Данные — GET /queue локального модуля (owner-scoped). Пустой ответ
// или спящий модуль → виджета нет; разбудить модуль только ради статуса нельзя,
// поэтому /queue никогда не поднимает компаньон — обычный fetch, тихо падающий.

const tokenKey = (owner: string) => 'iskra.transcription.device.' + owner

export type QueueJob = {
  id: string
  mode?: string
  stage: string
  done?: boolean
  error?: boolean
  cancelled?: boolean
  cancelling?: boolean
  position?: number
  progress?: { current: number; total: number; unit?: string }
  // Контекст урока: с сервера (кросс-девайс, позже) или из localStorage того
  // браузера, что ставил задание. lessonId — для перехода в Конструктор.
  lessonTitle?: string
  courseTitle?: string
  lessonId?: string
}

/** Карта jobId → контекст урока из локальных записей заданий этого браузера
 *  (iskra.transcription.job.*). Ключ кодирует [owner, [courseKey, lessonId]];
 *  название урока/курса дописывается при постановке задания (LocalTranscription). */
function localLessonInfo(): Map<string, { lessonTitle?: string; courseTitle?: string; lessonId?: string }> {
  const map = new Map<string, { lessonTitle?: string; courseTitle?: string; lessonId?: string }>()
  const prefix = 'iskra.transcription.job.'
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      let lessonId: string | undefined
      try {
        const lessonKey = JSON.parse(key.slice(prefix.length))[1]
        const parts = JSON.parse(lessonKey)
        lessonId = Array.isArray(parts) && typeof parts[1] === 'string' ? parts[1] : undefined
      } catch { continue }
      let value: Record<string, unknown> | null
      try { value = JSON.parse(localStorage.getItem(key) || 'null') } catch { continue }
      if (!value || typeof value.id !== 'string') continue
      map.set(value.id, {
        lessonTitle: typeof value.lessonTitle === 'string' ? value.lessonTitle : undefined,
        courseTitle: typeof value.courseTitle === 'string' ? value.courseTitle : undefined,
        lessonId,
      })
    }
  } catch { /* приватный режим и т.п. — без контекста, покажем этап */ }
  return map
}

/** Дополнить задания контекстом урока: серверные поля (если появятся) в
 *  приоритете, пробелы закрывает локальная карта. */
function withLessonContext(data: QueueData): QueueData {
  const info = localLessonInfo()
  const fill = (job: QueueJob): QueueJob => {
    const local = info.get(job.id)
    if (!local) return job
    return {
      ...job,
      lessonTitle: job.lessonTitle ?? local.lessonTitle,
      courseTitle: job.courseTitle ?? local.courseTitle,
      lessonId: job.lessonId ?? local.lessonId,
    }
  }
  return { ...data, running: data.running.map(fill), queued: data.queued.map(fill) }
}
export type QueueData = {
  running: QueueJob[]
  queued: QueueJob[]
  counts: { running: number; queued: number }
  maxParallel?: number
}

function readQueue(value: unknown): QueueData | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const list = (x: unknown): QueueJob[] => Array.isArray(x)
    ? x.filter((j): j is QueueJob => !!j && typeof (j as QueueJob).id === 'string') : []
  const running = list(v.running), queued = list(v.queued)
  return {
    running, queued,
    counts: { running: running.length, queued: queued.length },
    maxParallel: typeof v.maxParallel === 'number' ? v.maxParallel : undefined,
  }
}

function jobPercent(job: QueueJob): number | undefined {
  const p = job.progress
  if (!p || !(p.total > 0) || !(p.current >= 0)) return undefined
  return Math.min(99, Math.max(0, Math.floor((p.current / p.total) * 100)))
}

/** Средний процент идущих заданий — для кольца на таблетке. undefined = неопределённо. */
function overallPercent(running: QueueJob[]): number | undefined {
  const known = running.map(jobPercent).filter((p): p is number => p !== undefined)
  if (!known.length) return undefined
  return Math.round(known.reduce((a, b) => a + b, 0) / known.length)
}

type Mock = { __iskraQueueMock?: QueueData }

// Dev-only: mock queue data for QA screenshots, from window or localStorage
// ('iskra.queueMock'). Guarded by import.meta.env.DEV → stripped from prod.
function devQueueMock(): QueueData | null {
  if (!import.meta.env.DEV) return null
  const fromWindow = (window as unknown as Mock).__iskraQueueMock
  if (fromWindow) return fromWindow
  try {
    const raw = localStorage.getItem('iskra.queueMock')
    return raw ? readQueue(JSON.parse(raw)) : null
  } catch { return null }
}

/** Поллинг GET /queue, пока учитель подключил компьютер. Молча прячется, если
 *  модуль спит или заданий нет. */
export function useTranscriptionQueue() {
  const owner = useTranscriptionOwner()
  const [data, setData] = useState<QueueData | null>(null)
  const [tick, setTick] = useState(0)
  const activeRef = useRef(true)
  // Чаще опрашиваем, пока есть задания; реже — на простое; совсем редко — если
  // модуль раз за разом не отвечает (спит), чтобы не долбить localhost.
  const busy = !!data && (data.counts.running + data.counts.queued) > 0

  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false } }, [])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    // Dev-only seam for QA screenshots; tree-shaken out of production builds.
    // Works without a connected module so the real pill can be captured in the
    // DEV teacher cabinet (which has no authenticated owner).
    const mock = devQueueMock()
    if (mock) { setData(mock); return }
    const token = owner ? localStorage.getItem(tokenKey(owner)) : ''
    if (!owner || !token) { setData(null); return }
    let timer: ReturnType<typeof setTimeout>
    let misses = 0
    let cancelled = false
    async function poll() {
      try {
        const next = readQueue(await localRequest('/queue', token || ''))
        if (cancelled) return
        misses = 0
        setData(next && (next.counts.running + next.counts.queued) > 0 ? withLessonContext(next) : null)
      } catch {
        if (cancelled) return
        misses += 1
        setData(null)
      }
      const live = !!data && (data.counts.running + data.counts.queued) > 0
      const delay = live ? 2500 : misses >= 3 ? 30000 : 12000
      timer = setTimeout(poll, delay)
    }
    void poll()
    const online = () => { void poll() }
    window.addEventListener('online', online)
    return () => { cancelled = true; clearTimeout(timer); window.removeEventListener('online', online) }
    // `busy`/`tick` перезапускают цикл при смене ритма и по ручному refresh.
  }, [owner, tick, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = useCallback(async (id: string) => {
    const token = owner ? localStorage.getItem(tokenKey(owner)) : ''
    if (!token) return
    try { await localRequest('/jobs/' + id, token, { method: 'DELETE', signal: AbortSignal.timeout(10000) }) }
    catch { /* модуль мог уснуть — следующий poll покажет актуальное */ }
    refresh()
  }, [owner, refresh])

  return { data, cancel, refresh }
}

function Ring({ percent, size = 20 }: { percent?: number; size?: number }) {
  const r = size / 2 - 1.6
  const c = 2 * Math.PI * r
  const off = percent === undefined ? c * 0.72 : c * (1 - percent / 100)
  return (
    <span className="tqw-ring" aria-hidden style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={percent === undefined ? 'tqw-ring-spin' : undefined}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.4" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
    </span>
  )
}

/** Презентационная таблетка + поповер. Данные приходят снаружи, чтобы её можно
 *  было собрать в QA-стенде с мок-данными. */
export function TranscriptionQueuePill({ data, onCancel }: { data: QueueData; onCancel: (id: string) => void }) {
  const t = useT()
  const openCourseEditor = useTeacher(s => s.openCourseEditor)
  const [open, setOpen] = useState(false)
  const pillRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)

  const place = useCallback(() => {
    const r = pillRef.current?.getBoundingClientRect()
    if (r) setAnchor({ top: r.bottom + 10, left: r.left + r.width / 2 })
  }, [])
  useLayoutEffect(() => { if (open) place() }, [open, place])
  useEffect(() => {
    if (!open) return
    const update = () => place()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    const onDown = (e: PointerEvent) => {
      if (popRef.current?.contains(e.target as Node) || pillRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, place])

  const { running, queued } = data
  const nRun = data.counts.running, nQueue = data.counts.queued
  const percent = overallPercent(running)
  // Клик по заданию → открыть его урок в Конструкторе (lessonId из записи).
  const openLesson = (job: QueueJob) => {
    if (!job.lessonId) return
    setOpen(false)
    void openLessonInCourseEditor(job.lessonId!, openCourseEditor)
  }
  // Текст таблетки: «N идёт», при очереди добавляем «· M в очереди».
  const label = nRun > 0 ? `${nRun} ${t('идёт')}` : `${nQueue} ${t('в очереди')}`
  const dim = nRun > 0 && nQueue > 0 ? ` · ${nQueue} ${t('в очереди')}` : ''
  const aria = `${t('Расшифровка')}: ${nRun} ${t('идёт')}, ${nQueue} ${t('в очереди')}`

  return (
    <>
      <button ref={pillRef} type="button" className="tqw-pill" aria-label={aria} aria-expanded={open}
        onClick={() => setOpen(o => !o)}>
        <Ring percent={percent} />
        <span className="tqw-pill-text">{label}{dim && <span className="tqw-dim">{dim}</span>}</span>
      </button>
      {open && anchor && createPortal(
        <div ref={popRef} style={{ position: 'fixed', top: anchor.top, left: anchor.left, zIndex: 1000, transform: 'translateX(-50%)' } as CSSProperties}>
          <div className="tqw-pop" style={dropdownSurface}>
            <div className="tqw-pop-head">
              <AudioLines size={16} />
              <strong>{t('Расшифровка')}</strong>
              <span className="tqw-pop-counts">{nRun} {t('идёт')}{nQueue > 0 ? ` · ${nQueue} ${t('в очереди')}` : ''}</span>
            </div>
            <ScrollFade maxHeight="min(52vh, 360px)" fadeHeight={12}>
            <div className="tqw-pop-list">
              {running.map(job => {
                const p = jobPercent(job)
                // Первая строка — урок (если известен), вторая — этап. Нет урока
                // (старое задание/другой браузер) → этап становится заголовком.
                const title = job.lessonTitle || job.stage || t('Идёт обработка')
                const meta = job.cancelling ? t('Останавливаем…') : (job.lessonTitle ? job.stage : '')
                return (
                  <div className="tqw-job" key={job.id}>
                    <button type="button" className="tqw-job-open" disabled={!job.lessonId}
                      aria-label={job.lessonId ? `${t('Открыть урок в Конструкторе')}: ${title}` : title}
                      onClick={() => openLesson(job)}>
                      <span className="tqw-job-ic" data-run>
                        {job.cancelling ? <Loader2 size={15} className="tqw-spin" /> : <AudioLines size={15} />}
                      </span>
                      <div className="tqw-job-body">
                        <div className="tqw-job-title">{title}</div>
                        {job.courseTitle && job.lessonTitle && <FadeText className="tqw-course">{job.courseTitle}</FadeText>}
                        {meta && <div className="tqw-job-meta">{meta}</div>}
                        <div className="tqw-prog"><i style={{ width: (p ?? 30) + '%' }} data-indeterminate={p === undefined} /></div>
                      </div>
                      <span className="tqw-job-tail">{p !== undefined ? `${p}%` : ''}</span>
                    </button>
                    <button type="button" className="tqw-x" aria-label={t('Остановить расшифровку')} disabled={job.cancelling}
                      onClick={() => onCancel(job.id)}><X size={14} /></button>
                  </div>
                )
              })}
              {queued.map(job => {
                const title = job.lessonTitle || t('В очереди')
                // Без дубля: если урок известен — «в очереди · позиция N»; если нет —
                // заголовок уже «В очереди», во второй строке только позиция.
                const pos = job.position ? `${t('позиция')} ${job.position}` : ''
                const meta = job.lessonTitle ? [t('в очереди'), pos].filter(Boolean).join(' · ') : pos
                return (
                  <div className="tqw-job tqw-queued" key={job.id}>
                    <button type="button" className="tqw-job-open" disabled={!job.lessonId}
                      aria-label={job.lessonId ? `${t('Открыть урок в Конструкторе')}: ${title}` : title}
                      onClick={() => openLesson(job)}>
                      <span className="tqw-job-ic">{job.position ?? '·'}</span>
                      <div className="tqw-job-body">
                        <div className="tqw-job-title">{title}</div>
                        {job.courseTitle && job.lessonTitle && <FadeText className="tqw-course">{job.courseTitle}</FadeText>}
                        {meta && <div className="tqw-job-meta">{meta}</div>}
                      </div>
                    </button>
                    <button type="button" className="tqw-x" aria-label={t('Убрать из очереди')}
                      onClick={() => onCancel(job.id)}><X size={14} /></button>
                  </div>
                )
              })}
            </div>
            </ScrollFade>
            <p className="tqw-foot">{t('Пока хватает памяти, записи обрабатываются параллельно; иначе ждут очереди.')}</p>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

/** Контейнер для нав-бара: сам тянет данные и прячется, когда заданий нет. */
export default function TranscriptionQueueWidget() {
  const { data, cancel } = useTranscriptionQueue()
  if (!data || (data.counts.running + data.counts.queued) === 0) return null
  return <TranscriptionQueuePill data={data} onCancel={cancel} />
}
