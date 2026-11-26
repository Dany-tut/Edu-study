// ─────────────────────────────────────────────────────────────────────────────
// Редактор задания «Найди на экране» (screenHotspot)
//
// Картинка — реконструкция окна 1С / Excel (шаблоны генератора) или своя.
// • Реконструкция: режим «Выбрать элемент» — клик по кнопке, полю, вкладке
//   или ячейке создаёт область по её рамке; координаты знает генератор.
// • Своя картинка: протянуть прямоугольник мышью или пальцем, ручки по углам.
// Области хранятся в долях от natural и не съезжают ни при каком размере.
// У каждой — «Верный ответ / Частая ошибка» и подсказка. Проверки редактора —
// hotspotIssues (одна верная область, не меньше 16×16, верная и ловушка не
// пересекаются, заполнен alt). «Пройти как ученик» — тот же солвер на ПК и в
// рамке телефона.
// ─────────────────────────────────────────────────────────────────────────────
import { useMemo, useRef, useState } from 'react'
import { Camera, Check, Eye, Plus, Trash2, X } from '../icons/appIcons'
import GrowTextarea from '../GrowTextarea'
import { alertDialog } from '../ConfirmHost'
import { optimizePhoto, ImageTooLargeError } from '../../lib/imageOptim'
import { useT } from '../../lib/i18n'
import { hotspotIssues, type HotspotArea, type HotspotSpec } from '../../lib/screenHotspot'
import { hotspotScreen } from '../../lib/screenHotspotScreen'
import { RECON_TEMPLATES } from '../../data/accounting/hotspotScreens'
import type { ReconScreen } from '../../data/accounting/accFigures'
import ScreenHotspotSolver from '../ScreenHotspotSolver'

export interface EditorAccent { color: string; bg: string; fill: string }

const fieldSt: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 10,
  border: '1.5px solid var(--color-border-soft)', background: 'var(--color-bg-input)',
  fontSize: 13, lineHeight: 1.45, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit',
}
const capSt: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--color-text-3)' }

const chip = (on: boolean, accent: EditorAccent): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9,
  border: `1.5px solid ${on ? accent.color : 'var(--color-border-medium)'}`,
  background: on ? accent.bg : 'var(--color-bg-2)', color: on ? accent.color : 'var(--color-text-2)',
  fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
})

const stripKind = (s: string) => s.replace(/, (кнопка|поле|вкладка|ячейка)$/, '')
const newId = () => 'a' + Math.random().toString(36).slice(2, 8)

function fromTemplate(recon: ReconScreen, prev?: HotspotSpec): HotspotSpec {
  const base: HotspotSpec = {
    image: { kind: 'recon', recon, alt: prev?.image.alt || `Учебная реконструкция окна «${recon.window}»`, badge: true },
    natural: { w: 640, h: 400 },
    targets: [], traps: [], hint: prev?.hint, attempts: prev?.attempts,
  }
  const scr = hotspotScreen(base)
  // Области переносятся по id элемента: правка окна не сбивает разметку.
  const keep = (list: HotspotArea[] = []) => list.flatMap(a => {
    const el = scr.elements.find(e => e.id === a.id)
    return el ? [{ ...a, x: el.x, y: el.y, w: el.w, h: el.h }] : []
  })
  return { ...base, natural: scr.natural, targets: keep(prev?.targets), traps: keep(prev?.traps) }
}

export default function ScreenHotspotEditor({ value, onChange, accent }: {
  value: HotspotSpec | undefined
  onChange: (next: HotspotSpec) => void
  accent: EditorAccent
}) {
  const t = useT()
  const spec = value
  const isRecon = !spec || spec.image.kind !== 'upload'
  const screen = useMemo(() => (spec && (spec.image.kind !== 'upload' || spec.image.src) ? hotspotScreen(spec) : null), [spec])
  const [selected, setSelected] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [previewAns, setPreviewAns] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const issues = hotspotIssues(spec)
  const areas = spec ? [
    ...spec.targets.map(a => ({ a, trap: false })),
    ...(spec.traps ?? []).map(a => ({ a, trap: true })),
  ] : []

  const setAreas = (targets: HotspotArea[], traps: HotspotArea[]) => spec && onChange({ ...spec, targets, traps })
  const patchArea = (id: string, patch: Partial<HotspotArea>) => spec && setAreas(
    spec.targets.map(a => (a.id === id ? { ...a, ...patch } : a)),
    (spec.traps ?? []).map(a => (a.id === id ? { ...a, ...patch } : a)),
  )
  const setRole = (id: string, trap: boolean) => {
    if (!spec) return
    const all = [...spec.targets, ...(spec.traps ?? [])]
    const a = all.find(x => x.id === id)
    if (!a) return
    const rest = (l: HotspotArea[]) => l.filter(x => x.id !== id)
    setAreas(trap ? rest(spec.targets) : [...rest(spec.targets), a], trap ? [...rest(spec.traps ?? []), a] : rest(spec.traps ?? []))
  }
  const removeArea = (id: string) => spec && setAreas(spec.targets.filter(a => a.id !== id), (spec.traps ?? []).filter(a => a.id !== id))

  const attachFile = (file: File) => {
    void optimizePhoto(file).then(src => {
      if (!src) throw new Error('read')
      const img = new Image()
      img.onload = () => onChange({
        image: { kind: 'upload', src, alt: spec?.image.alt ?? '', badge: false },
        natural: { w: img.naturalWidth || 640, h: img.naturalHeight || 400 },
        targets: [], traps: [], hint: spec?.hint, attempts: spec?.attempts,
      })
      img.src = src
    }).catch(err => {
      void alertDialog({ title: err instanceof ImageTooLargeError ? err.message : t('Не удалось загрузить картинку. Попробуйте ещё раз.'), tone: 'danger' })
    })
  }

  // ── Разметка поверх картинки ────────────────────────────────────────────
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ kind: 'new' | 'corner'; id: string; ax: number; ay: number; corner?: number } | null>(null)
  const [draft, setDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [hoverEl, setHoverEl] = useState<string | null>(null)

  const frac = (e: { clientX: number; clientY: number }) => {
    const r = stageRef.current!.getBoundingClientRect()
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) }
  }
  const elementAt = (p: { x: number; y: number }) => screen?.elements
    .filter(e => p.x >= e.x && p.x <= e.x + e.w && p.y >= e.y && p.y <= e.y + e.h)
    .sort((a, b) => a.w * a.h - b.w * b.h)[0]

  const onStageDown = (e: React.PointerEvent) => {
    if (!spec) return
    const p = frac(e)
    const handle = (e.target as HTMLElement).dataset.corner
    if (handle && selected) {
      const a = areas.find(x => x.a.id === selected)?.a
      if (!a) return
      const c = Number(handle)
      // Противоположный угол — якорь.
      drag.current = { kind: 'corner', id: selected, ax: c % 2 ? a.x : a.x + a.w, ay: c >= 2 ? a.y : a.y + a.h, corner: c }
      stageRef.current?.setPointerCapture(e.pointerId)
      return
    }
    const hitArea = areas.filter(x => p.x >= x.a.x && p.x <= x.a.x + x.a.w && p.y >= x.a.y && p.y <= x.a.y + x.a.h)
      .sort((a, b) => a.a.w * a.a.h - b.a.w * b.a.h)[0]
    if (isRecon) {
      // «Выбрать элемент»: область — рамка элемента генератора.
      if (hitArea) { setSelected(hitArea.a.id); return }
      const el = elementAt(p)
      if (!el) return
      const area: HotspotArea = { id: el.id, label: stripKind(el.label), x: el.x, y: el.y, w: el.w, h: el.h }
      onChange({ ...spec, targets: spec.targets.length ? spec.targets : [area], traps: spec.targets.length ? [...(spec.traps ?? []), area] : spec.traps })
      setSelected(el.id)
      return
    }
    if (hitArea) { setSelected(hitArea.a.id); return }
    drag.current = { kind: 'new', id: newId(), ax: p.x, ay: p.y }
    setDraft({ x: p.x, y: p.y, w: 0, h: 0 })
    stageRef.current?.setPointerCapture(e.pointerId)
  }
  const onStageMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) {
      if (isRecon && e.pointerType === 'mouse') setHoverEl(elementAt(frac(e))?.id ?? null)
      return
    }
    const p = frac(e)
    const r = { x: Math.min(d.ax, p.x), y: Math.min(d.ay, p.y), w: Math.abs(p.x - d.ax), h: Math.abs(p.y - d.ay) }
    if (d.kind === 'new') setDraft(r)
    else patchArea(d.id, r)
  }
  const onStageUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || !spec) return
    if (d.kind === 'new' && draft) {
      setDraft(null)
      if (draft.w * spec.natural.w < 6 || draft.h * spec.natural.h < 6) return // случайный клик
      const area: HotspotArea = { id: d.id, label: '', ...draft }
      const first = spec.targets.length === 0
      onChange({ ...spec, targets: first ? [area] : spec.targets, traps: first ? spec.traps : [...(spec.traps ?? []), area] })
      setSelected(d.id)
    }
  }

  const pc = (v: number) => `${v * 100}%`
  const tpl = spec?.image.kind === 'recon' ? spec.image.recon : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={capSt}>{t('Картинка')}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {RECON_TEMPLATES.map(tp => (
          <button key={tp.id} type="button" data-hover="layer" style={chip(!!tpl && tpl.window === tp.recon.window && tpl.app === tp.recon.app, accent)}
            onClick={() => { onChange(fromTemplate(tp.recon, spec)); setSelected(null) }}>
            {t(tp.title)}
          </button>
        ))}
        <button type="button" data-hover="layer" style={chip(spec?.image.kind === 'upload', accent)} onClick={() => fileRef.current?.click()}>
          <Camera size={13} /> {spec?.image.kind === 'upload' ? t('Заменить картинку') : t('Своя картинка')}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) attachFile(f); e.target.value = '' }} />
      </div>

      {tpl && spec && (
        <div style={{ display: 'grid', gap: 6 }}>
          <input style={fieldSt} value={tpl.window} aria-label={t('Заголовок окна')} placeholder={t('Заголовок окна')}
            onChange={e => onChange(fromTemplate({ ...tpl, window: e.target.value }, spec))} />
          <input style={fieldSt} value={(tpl.buttons ?? []).join('; ')} aria-label={t('Кнопки через «;»')} placeholder={t('Кнопки через «;»')}
            onChange={e => onChange(fromTemplate({ ...tpl, buttons: e.target.value.split(';').map(s => s.trim()).filter(Boolean) }, spec))} />
          <GrowTextarea style={fieldSt} value={(tpl.fields ?? []).map(([a, b]) => `${a} = ${b}`).join('\n')}
            placeholder={t('Поля: по строке «Подпись = значение»')}
            onChange={v => onChange(fromTemplate({ ...tpl, fields: v.split('\n').map(l => l.split('=')).filter(x => x[0]?.trim()).map(([a, ...b]) => [a.trim(), b.join('=').trim()] as [string, string]) }, spec))} />
        </div>
      )}

      {spec && screen && (
        <>
          <div style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
            {isRecon
              ? t('Выбрать элемент: нажмите на кнопку, поле, вкладку или ячейку — область встанет по её рамке. Первая — верный ответ, следующие — частые ошибки.')
              : t('Протяните прямоугольник мышью или пальцем. Выбранную область можно подогнать за углы.')}
          </div>
          <div
            ref={stageRef}
            onPointerDown={onStageDown}
            onPointerMove={onStageMove}
            onPointerUp={onStageUp}
            onPointerCancel={onStageUp}
            onPointerLeave={() => setHoverEl(null)}
            style={{
              position: 'relative', width: '100%', maxWidth: 640, aspectRatio: `${screen.natural.w} / ${screen.natural.h}`,
              borderRadius: 10, overflow: 'hidden', border: '1px solid var(--color-border-medium)', background: '#fff',
              cursor: isRecon ? 'pointer' : 'crosshair', touchAction: 'none', userSelect: 'none',
            }}
          >
            <img src={screen.src} alt="" draggable={false} style={{ display: 'block', width: '100%', height: '100%', pointerEvents: 'none' }} />
            {isRecon && hoverEl && (() => {
              const el = screen.elements.find(x => x.id === hoverEl)
              return el ? <span style={{ position: 'absolute', left: pc(el.x), top: pc(el.y), width: pc(el.w), height: pc(el.h), borderRadius: 5, outline: `2px dashed ${accent.color}`, pointerEvents: 'none' }} /> : null
            })()}
            {areas.map(({ a, trap }) => (
              <span key={a.id} style={{
                position: 'absolute', left: pc(a.x), top: pc(a.y), width: pc(a.w), height: pc(a.h), borderRadius: 5,
                border: `2px ${trap ? 'dashed' : 'solid'} ${trap ? '#C4320A' : '#127A4B'}`,
                background: trap ? 'rgba(196,50,10,.10)' : 'rgba(18,122,75,.14)',
                boxShadow: selected === a.id ? '0 0 0 3px rgba(124,92,255,.55)' : undefined,
                pointerEvents: 'none',
              }}>
                {!isRecon && selected === a.id && [0, 1, 2, 3].map(c => (
                  <span key={c} data-corner={c} style={{
                    position: 'absolute', width: 14, height: 14, borderRadius: 7, background: '#fff', border: '2px solid #7C5CFF',
                    left: c % 2 ? 'calc(100% - 7px)' : -7, top: c >= 2 ? 'calc(100% - 7px)' : -7,
                    pointerEvents: 'auto', cursor: 'nwse-resize', touchAction: 'none',
                  }} />
                ))}
              </span>
            ))}
            {draft && <span style={{ position: 'absolute', left: pc(draft.x), top: pc(draft.y), width: pc(draft.w), height: pc(draft.h), border: '2px dashed #7C5CFF', pointerEvents: 'none' }} />}
          </div>
        </>
      )}

      {spec && areas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={capSt}>{t('Области')}</div>
          {areas.map(({ a, trap }) => (
            <div key={a.id} onClick={() => setSelected(a.id)} style={{
              display: 'grid', gap: 6, padding: 10, borderRadius: 12,
              border: `1.5px solid ${selected === a.id ? accent.color : 'var(--color-border-soft)'}`, background: 'var(--color-bg-2)',
            }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <input style={{ ...fieldSt, flex: '1 1 160px', width: 'auto' }} value={a.label} placeholder={t('Подпись области')} aria-label={t('Подпись области')}
                  onChange={e => patchArea(a.id, { label: e.target.value })} />
                <button type="button" data-hover="layer" style={chip(!trap, accent)} onClick={() => setRole(a.id, false)}>
                  <Check size={12} /> {t('Верный ответ')}
                </button>
                <button type="button" data-hover="layer" style={chip(trap, { color: 'var(--color-red-text)', bg: 'var(--color-red-soft)', fill: '' })} onClick={() => setRole(a.id, true)}>
                  <X size={12} /> {t('Частая ошибка')}
                </button>
                <button type="button" data-hover="layer" aria-label={t('Удалить область')} onClick={() => removeArea(a.id)}
                  style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 8, border: 'none', background: 'var(--color-bg-3)', color: 'var(--color-text-3)', cursor: 'pointer' }}>
                  <Trash2 size={13} />
                </button>
              </div>
              {trap && (
                <input style={fieldSt} value={a.hint ?? ''} placeholder={t('Подсказка: почему не сюда')} aria-label={t('Подсказка к ошибке')}
                  onChange={e => patchArea(a.id, { hint: e.target.value })} />
              )}
            </div>
          ))}
          {!isRecon && (
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={12} /> {t('Ещё область — протяните новый прямоугольник на картинке.')}
            </div>
          )}
        </div>
      )}

      {spec && (
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={capSt}>{t('Описание картинки (alt)')}</div>
          <GrowTextarea style={fieldSt} value={spec.image.alt}
            placeholder={t('Что на картинке — для скринридера')}
            onChange={v => onChange({ ...spec, image: { ...spec.image, alt: v } })} />
          <div style={capSt}>{t('Общая подсказка при промахе')}</div>
          <input style={fieldSt} value={spec.hint ?? ''} placeholder={t('Например: ищите в командной панели кнопку, которая открывает движения')}
            onChange={e => onChange({ ...spec, hint: e.target.value })} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={capSt}>{t('Попыток')}</span>
            {[1, 2, 3].map(n => (
              <button key={n} type="button" data-hover="layer" style={chip((spec.attempts ?? 2) === n, accent)} onClick={() => onChange({ ...spec, attempts: n })}>{n}</button>
            ))}
          </div>
        </div>
      )}

      {issues.length > 0 && (
        <ul style={{ margin: 0, padding: '8px 12px 8px 28px', borderRadius: 10, background: 'var(--color-red-soft)', color: 'var(--color-red-text)', fontSize: 12, lineHeight: 1.5 }}>
          {issues.map(s => <li key={s}>{t(s)}</li>)}
        </ul>
      )}

      {spec && issues.length === 0 && (
        <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" data-hover="layer" style={{ ...chip(preview, accent), justifySelf: 'start' }}
            onClick={() => { setPreview(p => !p); setPreviewAns('') }}>
            <Eye size={13} /> {preview ? t('Скрыть предпросмотр') : t('Пройти как ученик')}
          </button>
          {preview && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: '1 1 420px', minWidth: 0, display: 'grid', gap: 6 }}>
                <div style={capSt}>{t('ПК')}</div>
                <ScreenHotspotSolver spec={spec} value={previewAns} onChange={setPreviewAns} platform="pc" />
              </div>
              <div style={{ width: 360, maxWidth: '100%', display: 'grid', gap: 6 }}>
                <div style={capSt}>{t('Телефон')}</div>
                <div style={{ padding: 12, borderRadius: 28, border: '6px solid var(--color-text)', background: 'var(--color-bg)' }}>
                  <ScreenHotspotSolver spec={spec} value={previewAns} onChange={setPreviewAns} platform="iphone" />
                </div>
              </div>
              <button type="button" data-hover="layer" style={chip(false, accent)} onClick={() => setPreviewAns('')}>{t('Сбросить нажатия')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
