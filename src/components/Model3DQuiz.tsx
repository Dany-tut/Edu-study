// ─────────────────────────────────────────────────────────────────────────────
// Задание на 3D-модели: «Найди» и «Подпиши».
//
// Один механизм на оба режима: сцена отдаёт идентификатор части по клику и
// экранные точки частей каждый кадр. «Найди» — дано название, ученик
// нажимает на часть. «Подпиши» — на частях стоят булавки, ученик раздаёт им
// названия из банка тапами (как «разложить по столбцам»). Подписи и список
// частей скрыты: иначе ответ виден. Проверка на клиенте, сравнением
// идентификаторов, как у сопоставления.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { retryImport } from '../lib/chunkError'
import { loadModelSpec } from '../lib/models3d/registry'
import type { ModelSpec } from '../lib/models3d/spec'
import type { LabelAnchor, ModelViewer } from '../lib/models3d/viewer'
import Prose from './Prose'
import './model3dFigure.css'
import './model3dQuiz.css'

export type Model3DQuizMode = 'find' | 'label'

export interface Model3DQuizProps {
  src: string
  mode: Model3DQuizMode
  /** Какие части спрашивать (id частей модели). */
  askedParts: string[]
  /** Сколько обманок добавить в банк («Подпиши»). */
  distractors?: number
  prompt?: string
  onResult?: (r: { correct: number; total: number }) => void
}

/** Детерминированная перетасовка: тот же банк при каждом открытии. */
function shuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr]
  let s = seed || 1
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647
    const j = s % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export default function Model3DQuiz({ src, mode, askedParts, distractors = 2, prompt, onResult }: Model3DQuizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<ModelViewer | null>(null)
  const pinRefs = useRef(new Map<string, HTMLButtonElement>())
  const ringRef = useRef<HTMLDivElement>(null)
  const targetRingRef = useRef<HTMLDivElement>(null)
  const [spec, setSpec] = useState<ModelSpec | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [exploded, setExploded] = useState(false)

  // «Найди»
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<null | boolean>(null)
  const [score, setScore] = useState(0)

  // «Подпиши»
  const [active, setActive] = useState<string | null>(null)
  const [assigned, setAssigned] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  const liveRef = useRef({ picked: null as string | null, target: null as string | null })
  liveRef.current.picked = picked

  const onAnchors = useCallback((anchors: LabelAnchor[]) => {
    const st = stageRef.current
    if (!st) return
    for (const a of anchors) {
      const pin = pinRefs.current.get(a.id)
      if (pin) {
        pin.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -50%)`
        const out = a.x < 0 || a.y < 0 || a.x > st.clientWidth || a.y > st.clientHeight
        pin.dataset.hidden = String(out)
        // Закрытая другой частью булавка не прячется, а бледнеет: иначе её не найти.
        pin.dataset.behind = String(a.hidden && !out)
      }
      // Кольцо «Найди» стоит в точке касания на поверхности, а не в центре части.
      if (ringRef.current && a.id === '__marker') {
        ringRef.current.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -50%)`
        ringRef.current.dataset.ready = 'true'
      }
      // После неверного ответа второе кольцо показывает, где была нужная часть.
      if (targetRingRef.current && a.id === liveRef.current.target) {
        targetRingRef.current.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -50%)`
      }
    }
  }, [])

  useEffect(() => {
    let alive = true
    setStatus('loading')
    Promise.all([retryImport(() => import('../lib/models3d/viewer')), loadModelSpec(src)])
      .then(([mod, s]) => {
        if (!alive) return
        if (!s || !canvasRef.current) { setStatus('error'); return }
        setSpec(s)
        viewerRef.current?.dispose()
        viewerRef.current = mod.createModelViewer(canvasRef.current, s, {
          onSelect: (id, point) => {
            if (mode === 'find') {
              if (verdictRef.current !== null) return
              setPicked(prev => {
                const nextId = prev === id ? null : id
                viewerRef.current?.setMarker(nextId, point)
                if (!nextId && ringRef.current) ringRef.current.dataset.ready = 'false'
                return nextId
              })
            } else if (id) setActive(prev => (prev === id ? null : id))
          },
          onAnchors,
          onInteract: () => {},
        })
        viewerRef.current.setAutoRotate(false)
        setStatus('ready')
      })
      .catch(() => { if (alive) setStatus('error') })
    return () => { alive = false; viewerRef.current?.dispose(); viewerRef.current = null }
  }, [src, mode, onAnchors])

  const verdictRef = useRef<boolean | null>(null)
  verdictRef.current = verdict

  useEffect(() => { viewerRef.current?.setExplode(exploded ? 1 : 0) }, [exploded, status])
  // Выбранное ярче, остальное гаснет: видно, что именно выбрал.
  useEffect(() => { viewerRef.current?.setEmphasis(mode === 'find' ? picked : active) }, [picked, active, mode, status])

  const partName = (id: string) => spec?.parts.find(p => p.id === id)?.name ?? id
  const partColor = (id: string) => spec?.parts.find(p => p.id === id)?.color ?? '#786AD7'
  const partInfo = (id: string) => spec?.parts.find(p => p.id === id)?.info ?? ''

  // Банк названий: спрошенные части плюс обманки из незаданных частей модели.
  const bank = useMemo(() => {
    if (!spec) return []
    const extra = spec.parts.filter(p => !askedParts.includes(p.id) && !p.hideLabel).map(p => p.id)
    const ids = [...askedParts, ...shuffle(extra, askedParts.length * 7 + 3).slice(0, distractors)]
    return shuffle(ids, ids.length * 31 + 1)
  }, [spec, askedParts, distractors])

  // ── «Найди» ──
  const target = askedParts[step]
  liveRef.current.target = verdict === false ? target : null
  const answer = () => {
    if (!picked || !target) return
    const ok = picked === target
    setVerdict(ok)
    if (ok) setScore(s => s + 1)
  }
  const next = () => {
    const last = step + 1 >= askedParts.length
    if (last) { onResult?.({ correct: score, total: askedParts.length }); setStep(s => s + 1) } else setStep(s => s + 1)
    setPicked(null); setVerdict(null)
    viewerRef.current?.setMarker(null)
    if (ringRef.current) ringRef.current.dataset.ready = 'false'
  }
  const finished = mode === 'find' && step >= askedParts.length

  // ── «Подпиши» ──
  const assign = (nameId: string) => {
    if (checked) return
    if (!active) return
    setAssigned(prev => {
      const nextMap = { ...prev }
      // Одно название — одна булавка: снимаем его с другой.
      for (const k of Object.keys(nextMap)) if (nextMap[k] === nameId) delete nextMap[k]
      nextMap[active] = nameId
      return nextMap
    })
    // Переходим к следующей пустой булавке.
    const order = askedParts
    const idx = order.indexOf(active)
    const nextEmpty = [...order.slice(idx + 1), ...order.slice(0, idx)].find(p => !assigned[p] && p !== active)
    setActive(nextEmpty ?? null)
  }
  const used = new Set(Object.values(assigned))
  const labelScore = askedParts.filter(p => assigned[p] === p).length
  const check = () => { setChecked(true); setActive(null); onResult?.({ correct: labelScore, total: askedParts.length }) }

  const colorVar = (c: string) => ({ '--m3d-color': c }) as CSSProperties

  return (
    <div className="m3q" data-mode={mode}>
      <div className="m3q__head">
        <div className="m3q__prompt">
          {mode === 'find'
            ? (finished ? 'Готово' : <>{prompt ?? 'Нажмите на модели:'} <b>{partName(target)}</b></>)
            : (prompt ?? 'Расставьте названия по булавкам')}
        </div>
        <div className="m3q__progress">
          {mode === 'find' ? `${Math.min(step + 1, askedParts.length)} из ${askedParts.length}` : `${Object.keys(assigned).length} из ${askedParts.length}`}
        </div>
      </div>

      <div className="m3d__stage m3q__stage" ref={stageRef}>
        <canvas ref={canvasRef} className="m3d__canvas" aria-label={spec?.title ?? '3D-модель'} />
        {mode === 'find' && (
          <div ref={ringRef} className="m3q__ring" data-ready="false" data-verdict={verdict === null ? '' : verdict ? 'ok' : 'bad'} />
        )}
        {mode === 'find' && verdict === false && (
          <div ref={targetRingRef} className="m3q__ring" data-ready="true" data-verdict="ok" />
        )}
        {mode === 'find' && picked && verdict === null && (
          <div className="m3q__picked">Выбрано · нажмите «Ответить»</div>
        )}
        {mode === 'label' && spec && status === 'ready' && (
          <div className="m3d__labels">
            {askedParts.map((id, i) => {
              const state = checked ? (assigned[id] === id ? 'ok' : 'bad') : active === id ? 'active' : assigned[id] ? 'done' : ''
              return (
                <button
                  key={id}
                  type="button"
                  ref={el => { if (el) pinRefs.current.set(id, el); else pinRefs.current.delete(id) }}
                  className="m3q__pin"
                  data-state={state}
                  data-hidden="true"
                  style={colorVar(partColor(id))}
                  onClick={() => !checked && setActive(prev => (prev === id ? null : id))}
                  aria-label={`Булавка ${i + 1}`}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        )}
        <div className="m3q__tools">
          {spec?.canExplode && (
            <button type="button" className="m3d__btn" data-hover="own" aria-pressed={exploded} onClick={() => setExploded(v => !v)}>
              {exploded ? 'Собрать' : 'Разобрать'}
            </button>
          )}
          <button type="button" className="m3d__btn" data-hover="own" onClick={() => { setExploded(false); viewerRef.current?.resetView() }}>Сброс</button>
        </div>
        {!(mode === 'find' && picked) && <div className="m3q__note">подписи скрыты</div>}
        {status === 'loading' && <div className="m3d__state">Загружаем 3D-модель…</div>}
        {status === 'error' && <div className="m3d__state">3D-модель не загрузилась.</div>}
      </div>

      {mode === 'find' && !finished && (
        <div className="m3q__foot">
          {verdict === null ? (
            <button type="button" className="m3d__btn m3q__primary" data-hover="own" disabled={!picked} onClick={answer}>Ответить</button>
          ) : (
            <div className="m3q__feedback" data-verdict={verdict ? 'ok' : 'bad'} style={colorVar(partColor(target))}>
              <div className="m3q__feedback-title">
                {verdict ? 'Верно' : `Это ${partName(picked!).toLowerCase()}`}{verdict ? `: ${partName(target).toLowerCase()}` : `, а ${partName(target).toLowerCase()} — здесь`}
              </div>
              <div className="m3q__feedback-text"><Prose text={partInfo(target)} /></div>
              <button type="button" className="m3d__btn m3q__primary" data-hover="own" onClick={next}>
                {step + 1 >= askedParts.length ? 'Завершить' : 'Дальше'}
              </button>
            </div>
          )}
        </div>
      )}
      {finished && (
        <div className="m3q__foot">
          <div className="m3q__result"><b>{score} из {askedParts.length}</b> частей найдены верно.</div>
        </div>
      )}

      {mode === 'label' && spec && (
        <div className="m3q__foot m3q__foot--label">
          <div className="m3q__pins">
            {askedParts.map((id, i) => {
              const state = checked ? (assigned[id] === id ? 'ok' : 'bad') : active === id ? 'active' : assigned[id] ? 'done' : ''
              return (
                <button key={id} type="button" className="m3q__pinrow" data-state={state} data-hover="own" onClick={() => !checked && setActive(prev => (prev === id ? null : id))}>
                  <span className="m3q__pin m3q__pin--static" data-state={state} style={colorVar(partColor(id))}>{i + 1}</span>
                  <span className="m3q__pinrow-name">{assigned[id] ? partName(assigned[id]) : 'выберите…'}</span>
                  {checked && assigned[id] !== id && <span className="m3q__pinrow-fix">верно: {partName(id)}</span>}
                </button>
              )
            })}
          </div>
          <div className="m3q__bank" aria-label="Названия">
            {bank.map(id => (
              <button key={id} type="button" className="m3d__part m3q__chip" data-hover="own" data-used={used.has(id)} disabled={checked} onClick={() => assign(id)}>
                {partName(id)}
              </button>
            ))}
          </div>
          {!checked ? (
            <button type="button" className="m3d__btn m3q__primary" data-hover="own" disabled={Object.keys(assigned).length < askedParts.length} onClick={check}>Проверить</button>
          ) : (
            <div className="m3q__result"><b>{labelScore} из {askedParts.length}</b> булавок подписаны верно.</div>
          )}
        </div>
      )}
    </div>
  )
}
