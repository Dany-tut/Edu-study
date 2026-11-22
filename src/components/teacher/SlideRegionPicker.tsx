import OpticalText from '../OpticalText'
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { BoxSelect, RotateCcw } from '../icons/appIcons'
import { parseVideoSource } from '../../lib/videoSource'
import { resolveDriveVideo } from '../../lib/driveVideo'
import { btn } from '../../lib/pillStyles'

/** Зона заголовка в долях кадра (0…1, начало — левый верхний угол). */
export type RegionBox = { x: number; y: number; w: number; h: number }

/** Пресеты — те же, что в модуле (slide_chapters.REGIONS). */
export const PRESET_BOXES: Record<string, RegionBox> = {
  'top-left': { x: 0, y: 0, w: .65, h: .24 }, 'top-right': { x: .35, y: 0, w: .65, h: .24 },
  'bottom-left': { x: 0, y: .76, w: .65, h: .24 }, 'bottom-right': { x: .35, y: .76, w: .65, h: .24 },
  top: { x: 0, y: 0, w: 1, h: .24 }, bottom: { x: 0, y: .76, w: 1, h: .24 },
}
const MIN = .02
const round = (v: number) => Math.round(v * 10000) / 10000
const clamp = (v: number) => Math.min(1, Math.max(0, v))

export function customRegion(box: RegionBox): string {
  return `custom:${round(box.x)},${round(box.y)},${round(box.w)},${round(box.h)}`
}
export function parseRegion(region: string): RegionBox | undefined {
  if (PRESET_BOXES[region]) return PRESET_BOXES[region]
  const m = /^custom:([\d.]+),([\d.]+),([\d.]+),([\d.]+)$/.exec(region)
  if (!m) return undefined
  const [x, y, w, h] = m.slice(1).map(Number)
  if (![x, y, w, h].every(Number.isFinite) || w < MIN || h < MIN || x + w > 1.0001 || y + h > 1.0001) return undefined
  return { x, y, w, h }
}

/** Зона запоминается на этом компьютере: для урока и как последняя в курсе. */
const memoryKey = (owner: string, scope: 'lesson' | 'course', id: string) => 'iskra.slideRegion.' + JSON.stringify([owner, scope, id])
export function rememberedRegion(owner: string, lessonKey: string, courseTitle?: string): string | undefined {
  try {
    for (const key of [memoryKey(owner, 'lesson', lessonKey), courseTitle ? memoryKey(owner, 'course', courseTitle) : '']) {
      const value = key && localStorage.getItem(key)
      if (value && parseRegion(value)) return value
    }
  } catch { /* без памяти браузера — пресет по умолчанию */ }
  return undefined
}
export function rememberRegion(owner: string, lessonKey: string, courseTitle: string | undefined, region: string) {
  try {
    localStorage.setItem(memoryKey(owner, 'lesson', lessonKey), region)
    if (courseTitle) localStorage.setItem(memoryKey(owner, 'course', courseTitle), region)
  } catch { /* только на эту запись */ }
}

function useFrameSource(source: string, file?: File | null): { url?: string; unavailable?: string } {
  const [state, setState] = useState<{ url?: string; unavailable?: string }>({})
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setState({ url })
      return () => URL.revokeObjectURL(url)
    }
    const parsed = parseVideoSource(source)
    if (parsed?.kind === 'file') { setState({ url: parsed.url }); return }
    if (parsed?.kind !== 'gdrive') { setState({ unavailable: 'Кадр можно показать для файла с компьютера или видео Google Диска. Выберите файл выше или область из списка.' }); return }
    let alive = true
    setState({})
    resolveDriveVideo(parsed.id)
      .then(url => { if (alive) setState({ url }) })
      .catch(() => { if (alive) setState({ unavailable: 'Не удалось открыть кадр видео. Выберите файл записи выше или область из списка.' }) })
    return () => { alive = false }
  }, [source, file])
  return state
}

const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Кадр видео с рамкой зоны заголовка. Учитель выделяет зону мышью или пальцем. */
export function SlideRegionPicker({ source, file, region, disabled, onChange, onReset }: {
  source: string; file?: File | null; region: string; disabled?: boolean
  onChange: (region: string) => void; onReset: () => void
}) {
  const { url, unavailable } = useFrameSource(source, file)
  const video = useRef<HTMLVideoElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [duration, setDuration] = useState(0)
  const [at, setAt] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState<RegionBox>()
  const origin = useRef<{ x: number; y: number; id: number } | undefined>(undefined)
  const box = draft ?? parseRegion(region)
  const custom = region.startsWith('custom:')
  useEffect(() => { setReady(false); setFailed(false); setDuration(0) }, [url])
  // Первый кадр показывает onSeeked; дальше рамка остаётся, а кадр просто перематывается.
  useEffect(() => { const v = video.current; if (v && duration > 0 && Math.abs(v.currentTime - at) > .2) v.currentTime = at }, [at, duration])

  const point = (e: ReactPointerEvent) => {
    const rect = stage.current!.getBoundingClientRect()
    return { x: clamp((e.clientX - rect.left) / rect.width), y: clamp((e.clientY - rect.top) / rect.height) }
  }
  const boxFrom = (a: { x: number; y: number }, b: { x: number; y: number }): RegionBox =>
    ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) })
  const aspect = useMemo(() => {
    const v = video.current
    return v && v.videoWidth && v.videoHeight ? `${v.videoWidth} / ${v.videoHeight}` : '16 / 9'
  }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  if (unavailable) return <p className="transcription-hint slide-region-note">{unavailable}</p>
  return <div className="slide-region-picker">
    <div ref={stage} className="slide-region-stage" style={{ aspectRatio: aspect }} data-disabled={disabled || !ready || undefined}
      onPointerDown={e => {
        if (disabled || !ready || e.button > 0) return
        e.currentTarget.setPointerCapture(e.pointerId)
        const p = point(e); origin.current = { ...p, id: e.pointerId }; setDraft({ ...p, w: 0, h: 0 })
      }}
      onPointerMove={e => { if (origin.current?.id === e.pointerId) setDraft(boxFrom(origin.current, point(e))) }}
      onPointerUp={e => {
        if (origin.current?.id !== e.pointerId) return
        const next = boxFrom(origin.current, point(e)); origin.current = undefined; setDraft(undefined)
        if (next.w >= MIN && next.h >= MIN) onChange(customRegion(next))
      }}
      onPointerCancel={() => { origin.current = undefined; setDraft(undefined) }}>
      {url && <video ref={video} src={url} muted playsInline preload="auto" aria-hidden
        onLoadedMetadata={e => { const d = e.currentTarget.duration; setDuration(Number.isFinite(d) ? d : 0); const start = Number.isFinite(d) ? Math.min(60, d * .1) : 0; setAt(start); e.currentTarget.currentTime = start }}
        onSeeked={() => setReady(true)} onError={() => setFailed(true)} />}
      {!ready && !failed && <span className="slide-region-wait">Загружаем кадр…</span>}
      {failed && <span className="slide-region-wait">Кадр не открылся. Выберите файл записи выше или область из списка.</span>}
      {box && ready && <span className="slide-region-box" data-custom={custom || !!draft || undefined}
        style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }} />}
    </div>
    {duration > 0 && <div className="slide-region-scrub">
      <span>Кадр {time(at)}</span>
      <div className="slide-region-track"><div style={{ width: `${(at / duration) * 100}%` }} />
        <input type="range" min={0} max={duration} step={1} value={at} disabled={disabled} aria-label="Момент видео для кадра"
          onChange={e => setAt(Number(e.target.value))} />
      </div>
      <span>{time(duration)}</span>
    </div>}
    <div className="slide-region-foot">
      <small className="transcription-hint"><BoxSelect size={14} aria-hidden /> {custom ? 'Своя область: читаем только внутри рамки.' : 'Обведите на кадре только название темы, без постоянной подписи курса.'}</small>
      {custom && <button type="button" data-hover="layer" style={btn('S', 'secondary')} disabled={disabled} onClick={onReset}><RotateCcw size={14} /> <OpticalText as="iskra-button-label">Вернуть из списка</OpticalText></button>}
    </div>
  </div>
}
