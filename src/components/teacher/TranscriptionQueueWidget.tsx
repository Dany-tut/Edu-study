import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, X } from '../icons/appIcons'
import FadeText from '../FadeText'
import { useT } from '../../lib/i18n'
import { localRequest } from '../../lib/localTranscription'
import { useTranscriptionOwner } from './LocalTranscription'
import { useTeacher } from '../../store/teacherStore'
import { openLessonInCourseEditor } from '../../lib/teacherNav'
import './transcriptionQueueWidget.css'

// Статус очереди расшифровки компьютера. Живёт слайдом в правом островке
// бара учителя (TeacherCompactPill) и виден, только когда что-то идёт или ждёт
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

/** Задание, о котором рассказывает свёрнутый островок: первое идущее, иначе первое в очереди. */
export function leadJob(data: QueueData): QueueJob | undefined {
  return data.running[0] ?? data.queued[0]
}

/** Строка задания расшифровки в правом островке бара учителя.
 *  hideTitle — заголовок урока уже стоит в шапке островка (первое задание). */
export function TranscriptionJobRow({ job, queued, hideTitle, onCancel }: {
  job: QueueJob
  queued?: boolean
  hideTitle?: boolean
  onCancel: (id: string) => void
}) {
  const t = useT()
  const openCourseEditor = useTeacher(s => s.openCourseEditor)
  const p = queued ? undefined : jobPercent(job)
  // Нет урока (старое задание/другой браузер) → этап становится заголовком.
  const title = job.lessonTitle || (queued ? t('В очереди') : job.stage || t('Идёт обработка'))
  const pos = job.position ? `${t('позиция')} ${job.position}` : ''
  const meta = queued
    ? (job.lessonTitle ? [t('в очереди'), pos].filter(Boolean).join(' · ') : pos)
    : job.cancelling ? t('Останавливаем…') : (job.lessonTitle || hideTitle ? job.stage : '')
  const open = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (job.lessonId) void openLessonInCourseEditor(job.lessonId, openCourseEditor)
  }
  return (
    <div className={'tqw-job' + (queued ? ' tqw-queued' : '')}>
      <button type="button" className="tqw-job-open" disabled={!job.lessonId}
        aria-label={job.lessonId ? `${t('Открыть урок в Конструкторе')}: ${title}` : title}
        onClick={open}>
        <div className="tqw-job-body">
          {!hideTitle && <div className="tqw-job-title">{title}</div>}
          {job.courseTitle && job.lessonTitle && <FadeText className="tqw-course">{job.courseTitle}</FadeText>}
          {(meta || p !== undefined) && (
            <div className="tqw-job-meta">
              {job.cancelling && <Loader2 size={11} className="tqw-spin" />}
              <span className="tqw-job-stage">{meta}</span>
              {p !== undefined && <span className="tqw-job-pct">{p}%</span>}
            </div>
          )}
          {!queued && <div className="tqw-prog"><i style={{ width: (p ?? 30) + '%' }} data-indeterminate={p === undefined} /></div>}
        </div>
      </button>
      <button type="button" className="tqw-x" disabled={job.cancelling}
        aria-label={queued ? t('Убрать из очереди') : t('Остановить расшифровку')}
        onClick={e => { e.stopPropagation(); onCancel(job.id) }}><X size={14} /></button>
    </div>
  )
}

/** Сводка для подписи островка: «1 идёт · 2 в очереди». */
export function queueSummary(data: QueueData, t: (s: string) => string): string {
  const { running, queued } = data.counts
  return [running > 0 ? `${running} ${t('идёт')}` : '', queued > 0 ? `${queued} ${t('в очереди')}` : '']
    .filter(Boolean).join(' · ')
}

export { overallPercent }
