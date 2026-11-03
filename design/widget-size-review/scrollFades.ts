import { installWidgetScrollFades as install } from '../../src/lib/widgetScrollFades'

// Matrix cases have their own frames; real canvas and gallery mount the same
// observer from production components. No preview-specific fade implementation.
export function installWidgetScrollFades() {
  const active = new Map<HTMLElement, () => void>()
  const scan = () => {
    for (const [el, stop] of active) if (!el.isConnected) { stop(); active.delete(el) }
    document.querySelectorAll<HTMLElement>('.wr-surface').forEach(el => {
      if (!active.has(el)) active.set(el, install(el))
    })
  }
  const observer = new MutationObserver(scan)
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
  return () => { observer.disconnect(); active.forEach(stop => stop()) }
}
