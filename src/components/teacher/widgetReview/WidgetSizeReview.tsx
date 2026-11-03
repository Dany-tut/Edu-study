import { Suspense, useEffect, useRef, useState } from 'react'
import { WIDGET_REGISTRY, type WidgetDef } from '../widgets/registry'
import { DESK_GAP, DESK_INSET, DESK_TOP, deskColumns, deskRowHeight } from '../../../lib/deskWidgetSizing'
import { useWidgetScrollFades } from '../../../lib/useWidgetScrollFades'
import { useScrollFades } from '../../../lib/useScrollFades'
import WidgetBoundary from '../WidgetBoundary'
import { reviewLimits as limits, reviewAllowed as allowed, reviewPresets as presets, type Grid, type Size } from '../../../lib/widgetReviewSizing'
import './widgetSizeReview.css'

const currentWidgets = WIDGET_REGISTRY.filter(widget => !widget.legacy)
const screens = [[1440, 900], [1280, 720], [1920, 1080]] as const
function Preview({ def, size, grid }: { def: WidgetDef; size: Size; grid: Grid }) {
  const root = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useWidgetScrollFades(root)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '240px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const Comp = def.component
  const width = size.w * grid.cellWidth + (size.w - 1) * DESK_GAP
  const height = size.h * grid.rowHeight + (size.h - 1) * DESK_GAP
  return <section className="size-review-case">
    <header><b>{size.w}×{size.h}</b><span>{Math.round(width)} × {Math.round(height)} px</span></header>
    <div className="size-review-viewport">
      <div ref={root} className="iskra-widget" data-widget={def.type} data-stat={def.stat || undefined} style={{ width, height, flexShrink: 0 }}
        onClickCapture={event => { event.preventDefault(); event.stopPropagation() }} onPointerDownCapture={event => event.stopPropagation()} onContextMenuCapture={event => { event.preventDefault(); event.stopPropagation() }}>
        {visible ? <WidgetBoundary label={def.label}><Suspense fallback={<div className="size-review-loading">Загрузка виджета</div>}><Comp /></Suspense></WidgetBoundary>
          : <div className="size-review-loading">{def.label}</div>}
      </div>
    </div>
  </section>
}

/** Review the production components and bounds on the same discrete desk grid. */
export default function WidgetSizeReview({ hiddenWidgets = [] }: { hiddenWidgets?: string[] }) {
  const widgets = currentWidgets.filter(widget => !hiddenWidgets.includes(widget.type))
  const root = useRef<HTMLDivElement>(null)
  const pane = useRef<HTMLElement>(null)
  useScrollFades(root, true, '.size-review-scroll, .size-review-viewport')
  const [id, setId] = useState(() => new URLSearchParams(location.search).get('widget') ?? 'today-schedule')
  const [screen, setScreen] = useState(0)
  const [all, setAll] = useState(true)
  const [selected, setSelected] = useState<Size | null>(null)
  const def = widgets.find(widget => widget.type === id) ?? widgets[0]
  if (!def) return <div ref={root} className="widget-size-review"><header className="size-review-top"><h1>Нет доступных виджетов</h1><a href="/#/teacher">Вернуться в приложение</a></header></div>
  const [screenWidth, screenHeight] = screens[screen]
  const width = screenWidth - 2 * DESK_INSET
  const columns = deskColumns(width, 8)
  const rowHeight = deskRowHeight(screenHeight)
  const grid: Grid = { width, columns, rowHeight, rows: Math.floor((screenHeight - DESK_TOP - DESK_INSET + DESK_GAP) / (rowHeight + DESK_GAP) + 0.001), cellWidth: (width - (columns - 1) * DESK_GAP) / columns }
  const bounds = limits(def, grid)
  const size = selected && allowed(def, grid, selected) ? selected : presets(def, grid)[0]
  const chooseWidget = (value: string) => { setId(value); setSelected(null); setAll(false); pane.current?.scrollTo({ top: 0 }) }
  return <div ref={root} className="widget-size-review">
    <header className="size-review-top"><div><h1>Искра · сетка размеров</h1><p>{widgets.length} текущих виджетов · настоящие компоненты и данные вашей сессии</p></div><a href="/#/teacher">Вернуться в приложение</a></header>
    <div className="size-review-layout">
      <nav className="size-review-nav size-review-scroll" aria-label="Выбор виджета">
        {widgets.map(widget => <button key={widget.type} aria-pressed={def.type === widget.type} onClick={() => chooseWidget(widget.type)}>{widget.label}</button>)}
      </nav>
      <main ref={pane} className="size-review-main size-review-scroll">
        <div className="size-review-controls"><label>Экран <select value={screen} onChange={event => { setScreen(Number(event.target.value)); setSelected(null) }}>{screens.map(([w, h], index) => <option key={index} value={index}>{w} × {h}</option>)}</select></label><button aria-pressed={all} onClick={() => setAll(!all)}>{all ? 'Показать выбранный' : `Показать все ${widgets.length} виджетов`}</button></div>
        <h2>{def.label}: все допустимые размеры</h2>
        <p>Ширина × высота в ячейках. Минимум: <b>{bounds.minW}×{bounds.minH}</b>. Сетка экрана: {grid.columns}×{grid.rows}. Нажмите размер — ниже появится виджет.</p>
        <div className="size-review-viewport"><div className="size-review-matrix" style={{ gridTemplateColumns: `44px repeat(${grid.columns}, minmax(38px, 1fr))` }}>
          <span>В / Ш</span>{Array.from({ length: grid.columns }, (_, n) => <b key={`w${n}`}>{n + 1}</b>)}
          {Array.from({ length: grid.rows }, (_, y) => [<b key={`h${y}`}>{y + 1}</b>, ...Array.from({ length: grid.columns }, (_, x) => {
            const next = { w: x + 1, h: y + 1 }, valid = allowed(def, grid, next)
            return <button key={`${x}-${y}`} disabled={!valid} aria-pressed={size.w === next.w && size.h === next.h} title={valid ? `${next.w}×${next.h}` : `Недоступно: минимум ${bounds.minW}×${bounds.minH}`} onClick={() => setSelected(next)}>{next.w}×{next.h}</button>
          })])}
        </div></div>
        <p className="size-review-hint">Серые размеры недоступны. Календарь 1×1 запрещён. Прокрутка карточек доступна; действия с данными в этом просмотре отключены.</p>
        <Preview key={def.type} def={def} grid={grid} size={size} />
        <h2>{all ? 'Все виджеты · по пять размеров' : `${def.label} · пять размеров`}</h2>
        {(all ? widgets : [def]).map(widget => <article className="size-review-article" key={widget.type}>
          <h3>{widget.label} <small>минимум {limits(widget, grid).minW}×{limits(widget, grid).minH}</small></h3>
          <div className="size-review-cases">{presets(widget, grid).map(preset => <Preview key={`${preset.w}-${preset.h}`} def={widget} size={preset} grid={grid} />)}</div>
        </article>)}
      </main>
    </div>
  </div>
}
