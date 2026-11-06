// ─────────────────────────────────────────────────────────────────────────────
// 3D-модель в конспекте урока: атом, клетка — всё, что умеет реестр моделей.
//
// Встаёт на место картинки: абзац с image = `model:…` рисуется этим
// компонентом вместо <img>. Сцена (three.js) и спецификация модели грузятся
// лениво, в основной бандл не попадают. Подписи частей — DOM-ярлыки поверх
// канвы, их положение сцена отдаёт каждый второй кадр, и мы двигаем их
// напрямую через transform, минуя React: иначе 30 рендеров в секунду.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { retryImport } from '../lib/chunkError'
import { loadModelSpec } from '../lib/models3d/registry'
import type { ModelSpec } from '../lib/models3d/spec'
import type { LabelAnchor, ModelViewer } from '../lib/models3d/viewer'
import Prose from './Prose'
import './model3dFigure.css'

type Status = 'loading' | 'ready' | 'error'

export default function Model3DFigure({ src, caption, scale = 1, maxWidth, selectedPart, onSelectPart, compact }: {
  src: string
  caption?: string
  scale?: number
  /** Ширина листа в колонке конспекта; во весь экран игнорируется. */
  maxWidth?: number
  /** Управляемый выбор части снаружи (карточка проверки: клик по строке). */
  selectedPart?: string | null
  onSelectPart?: (id: string | null) => void
  /** Без шапки и списка частей — для карточек и панелей. */
  compact?: boolean
}) {
  const hostRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<ModelViewer | null>(null)
  const labelRefs = useRef(new Map<string, HTMLButtonElement>())
  const [spec, setSpec] = useState<ModelSpec | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [hover, setHover] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [isolated, setIsolated] = useState(false)
  const [exploded, setExploded] = useState(false)
  const [spinning, setSpinning] = useState(true)
  const [full, setFull] = useState(false)
  const [touched, setTouched] = useState(false)
  const [moving, setMoving] = useState(true)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const [labelsOn, setLabelsOn] = useState(true)
  const popRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  // Зеркала состояния для коллбэка сцены: он живёт вне рендера React.
  const liveRef = useRef({ selected: null as string | null, labelsOn: true, isolated: false })
  liveRef.current.selected = selected
  liveRef.current.labelsOn = labelsOn
  liveRef.current.isolated = isolated

  const onAnchors = useCallback((anchors: LabelAnchor[]) => {
    const { selected: sel, labelsOn: on, isolated: iso } = liveRef.current
    for (const a of anchors) {
      const el = labelRefs.current.get(a.id)
      if (el) {
        el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -50%)`
        // Подписи выключены — видна только выбранная часть.
        const st = stageRef.current
        // Ярлык, который край сцены отрезал бы наполовину, прячем целиком.
        const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2
        const outside = !!st && (a.x - hw < 0 || a.y - hh < 0 || a.x + hw > st.clientWidth || a.y + hh > st.clientHeight)
        const hidden = a.hidden || outside || (!on && sel !== a.id)
        if ((el.dataset.hidden === 'true') !== hidden) el.dataset.hidden = String(hidden)
      }
      // Справка — рядом с точкой клика, внутри сцены; внизу места нет — встаёт сверху.
      // В режиме «отдельно» карточка стоит в углу и не загораживает часть.
      if (a.id === sel && popRef.current && stageRef.current && !iso) {
        const pop = popRef.current
        const W = stageRef.current.clientWidth, H = stageRef.current.clientHeight
        const w = pop.offsetWidth, h = pop.offsetHeight
        const x = Math.max(10, Math.min(W - w - 10, a.x - w * 0.3))
        // Снизу карточка может выйти за сцену (там список частей), сверху — нет.
        const below = a.y + 18 + h <= H + 40
        const y = below ? Math.max(10, a.y + 18) : Math.max(10, a.y - 18 - h)
        pop.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        pop.dataset.ready = 'true'
      }
    }
  }, [])

  // Загрузка сцены и спецификации — одной волной.
  useEffect(() => {
    let alive = true
    setStatus('loading')
    setSpec(null)
    Promise.all([retryImport(() => import('../lib/models3d/viewer')), loadModelSpec(src)])
      .then(([mod, s]) => {
        if (!alive) return
        if (!s || !canvasRef.current) { setStatus('error'); return }
        setSpec(s)
        viewerRef.current?.dispose()
        viewerRef.current = mod.createModelViewer(canvasRef.current, s, {
          onHover: setHover,
          onSelect: id => setSelected(prev => (prev === id ? null : id)),
          onAnchors,
          onInteract: () => { setSpinning(false); setTouched(true) },
          // Прогресс стадий едет каждый кадр — в DOM напрямую, в React только стадия.
          onProgress: p => {
            if (progressRef.current) progressRef.current.style.width = `${(p * 100).toFixed(2)}%`
            const n = s.timeline?.stages.length ?? 0
            const stage = n > 1 ? Math.round(p * (n - 1)) : 0
            setProgress(prev => (prev === stage ? prev : stage))
          },
        })
        if (s.timeline) setPlaying(true)
        setStatus('ready')
      })
      .catch(() => { if (alive) setStatus('error') })
    return () => { alive = false; viewerRef.current?.dispose(); viewerRef.current = null }
  }, [src, onAnchors])

  // Состояние → сцена.
  useEffect(() => { viewerRef.current?.setExplode(exploded ? 1 : 0) }, [exploded, status])
  useEffect(() => {
    viewerRef.current?.setIsolate(isolated && selected ? selected : null)
    // «Отдельно» — ещё и наезд камеры на часть; обратно — общий вид.
    viewerRef.current?.focusPart(isolated && selected ? selected : null)
  }, [isolated, selected, status])
  useEffect(() => { viewerRef.current?.setHighlight(hover) }, [hover, status])
  useEffect(() => { viewerRef.current?.setAutoRotate(spinning) }, [spinning, status])
  useEffect(() => { viewerRef.current?.setAnimation(moving) }, [moving, status])
  useEffect(() => { viewerRef.current?.setPlaying(playing) }, [playing, status])
  useEffect(() => { if (!selected) setIsolated(false) }, [selected])
  useEffect(() => { if (selectedPart !== undefined) setSelected(selectedPart) }, [selectedPart])
  useEffect(() => { onSelectPart?.(selected) }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Не рендерим то, чего не видно: экономим батарею телефона.
  useEffect(() => {
    const host = hostRef.current
    if (!host || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => viewerRef.current?.setPaused(!e.isIntersecting), { threshold: 0.05 })
    io.observe(host)
    return () => io.disconnect()
  }, [status])

  // Во весь экран: канва меняет размер — сцене нужно пересчитать матрицу.
  useEffect(() => {
    viewerRef.current?.resize()
    if (!full) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false) }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [full])

  const reset = () => {
    setExploded(false); setIsolated(false); setSelected(null); setSpinning(true); setMoving(true); setTouched(false)
    setPlaying(!!spec?.timeline); viewerRef.current?.setProgress(0)
    viewerRef.current?.resetView()
  }

  const part = spec?.parts.find(p => p.id === selected) ?? null
  const colorVar = (c: string) => ({ '--m3d-color': c }) as CSSProperties

  return (
    <figure ref={hostRef} className={`m3d${full ? ' m3d--full' : ''}`} style={{ maxWidth: full ? undefined : maxWidth }}>
      <div className="m3d__frame">
        {!compact && <div className="m3d__head">
          <div style={{ minWidth: 0 }}>
            <div className="m3d__title">{spec?.title ?? '3D-модель'}</div>
            {spec?.subtitle && <div className="m3d__sub">{spec.subtitle}</div>}
          </div>
          <div className="m3d__tools">
            {spec?.canExplode && (
              <button type="button" className="m3d__btn" data-hover="own" aria-pressed={exploded} onClick={() => setExploded(v => !v)}>
                {exploded ? 'Собрать' : 'Разобрать'}
              </button>
            )}
            {spec?.animate && (
              <button type="button" className="m3d__btn" data-hover="own" aria-pressed={!moving} onClick={() => setMoving(v => !v)}>
                {moving ? 'Пауза' : 'Движение'}
              </button>
            )}
            <button type="button" className="m3d__btn" data-hover="own" aria-pressed={spinning} onClick={() => setSpinning(v => !v)} aria-label="Автовращение">
              Вращение
            </button>
            <button type="button" className="m3d__btn" data-hover="own" aria-pressed={labelsOn} onClick={() => setLabelsOn(v => !v)}>
              Подписи
            </button>
            <button type="button" className="m3d__btn" data-hover="own" onClick={reset}>Сброс</button>
            <button type="button" className="m3d__btn" data-hover="own" onClick={() => setFull(v => !v)}>
              {full ? 'Закрыть' : 'Во весь экран'}
            </button>
          </div>
        </div>}

        <div className="m3d__stage" ref={stageRef}>
          <canvas ref={canvasRef} className="m3d__canvas" aria-label={spec?.title ?? '3D-модель'} />
          {spec && status === 'ready' && (
            <div className="m3d__labels">
              {spec.parts.filter(p => !p.hideLabel).map(p => (
                <button
                  key={p.id}
                  type="button"
                  ref={el => { if (el) labelRefs.current.set(p.id, el); else labelRefs.current.delete(p.id) }}
                  className="m3d__label"
                  style={colorVar(p.color)}
                  data-hidden="true"
                  data-hot={hover === p.id || selected === p.id}
                  onPointerEnter={() => setHover(p.id)}
                  onPointerLeave={() => setHover(null)}
                  onClick={() => setSelected(prev => (prev === p.id ? null : p.id))}
                >
                  <span className="m3d__dot" />
                  {p.name}
                </button>
              ))}
            </div>
          )}
          {part && (
            <div ref={popRef} className={`m3d__pop${isolated ? ' m3d__pop--docked' : ''}`} style={colorVar(part.color)} role="dialog" aria-label={part.name}>
              <div className="m3d__pop-title">{part.name}</div>
              <div className="m3d__pop-text"><Prose text={part.info} /></div>
              <div className="m3d__card-actions">
                <button type="button" className="m3d__btn" data-hover="own" aria-pressed={isolated} onClick={() => setIsolated(v => !v)}>
                  {isolated ? 'Показать всё' : 'Отдельно'}
                </button>
                <button type="button" className="m3d__btn" data-hover="own" onClick={() => setSelected(null)}>Закрыть</button>
              </div>
            </div>
          )}
          {status === 'ready' && !touched && !selected && (
            <div className="m3d__hint">
              Крутите пальцем, нажмите на часть
            </div>
          )}
          {status === 'loading' && <div className="m3d__state">Загружаем 3D-модель…</div>}
          {status === 'error' && <div className="m3d__state">3D-модель не загрузилась. Проверьте связь и обновите страницу.</div>}
        </div>

        {spec?.timeline && status === 'ready' && (
          <div className="m3d__stages">
            <div className="m3d__stages-row">
              <button type="button" className="m3d__btn" data-hover="own" aria-pressed={playing} onClick={() => setPlaying(v => !v)}>
                {playing ? 'Стоп' : 'Плёнка'}
              </button>
              {spec.timeline.stages.map((st, i) => (
                <button
                  key={st.name}
                  type="button"
                  className="m3d__stage"
                  data-hover="own"
                  aria-pressed={progress === i}
                  onClick={() => { setPlaying(false); viewerRef.current?.setProgress(i / (spec.timeline!.stages.length - 1)) }}
                >
                  {st.name}
                </button>
              ))}
            </div>
            <div className="m3d__track" aria-hidden="true"><div ref={progressRef} className="m3d__track-fill" /></div>
            <div className="m3d__stage-info"><Prose text={spec.timeline.stages[progress]?.info ?? ''} /></div>
          </div>
        )}
        {spec && status === 'ready' && !compact && (
          <div className="m3d__parts" role="list">
            {spec.parts.map(p => (
              <button
                key={p.id}
                type="button"
                role="listitem"
                className="m3d__part"
                data-hover="own"
                style={colorVar(p.color)}
                aria-pressed={selected === p.id}
                onPointerEnter={() => setHover(p.id)}
                onPointerLeave={() => setHover(null)}
                onClick={() => setSelected(prev => (prev === p.id ? null : p.id))}
              >
                <span className="m3d__dot" />
                {p.name}
              </button>
            ))}
          </div>
        )}

      </div>
      {caption && !full && (
        <figcaption className="m3d__caption" style={{ fontSize: 13 * scale }}>
          <Prose text={caption} />
        </figcaption>
      )}
    </figure>
  )
}
