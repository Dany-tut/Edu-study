import { useEffect, useId, useState } from 'react'
import { TooltipBubble, TOOLTIP_FOCUS_DELAY_MS, TOOLTIP_HOVER_DELAY_MS } from './Tooltip'

/** Upgrade existing DOM title hints, including portals, without changing layouts.
 * Suppress native/inherited titles only while engaged; restore on exit. React
 * continues to own each title and changes/removals during hover take precedence.
 * Image alt remains intact: it is alternative content, not a hover hint.
 */
export default function NativeTitleTooltips() {
  const id = useId()
  const [hint, setHint] = useState<{ anchor: HTMLElement; label: string } | null>(null)
  useEffect(() => {
    let active: HTMLElement | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let titles: Array<{ el: HTMLElement; value: string }> = []
    let observer: MutationObserver | null = null
    let addedLabel: string | null = null
    const dismiss = () => {
      clearTimeout(timer); setHint(null)
      if (active) {
        const described = (active.getAttribute('aria-describedby') || '').split(/\s+/).filter(v => v && v !== id)
        if (described.length) active.setAttribute('aria-describedby', described.join(' '))
        else active.removeAttribute('aria-describedby')
      }
    }
    const stop = () => {
      dismiss()
      observer?.disconnect(); observer = null
      if (active && addedLabel && active.getAttribute('aria-label') === addedLabel) active.removeAttribute('aria-label')
      addedLabel = null
      for (const { el, value } of titles) if (el.getAttribute('title') === '') el.setAttribute('title', value)
      titles = []; active = null
    }
    const start = (target: EventTarget | null, delay: number) => {
      if (!(target instanceof Element) || target.closest('[data-custom-tooltip]')) { stop(); return }
      const el = target.closest<HTMLElement>('[title]')
      if (el === active) return
      stop()
      if (!el || !(el instanceof HTMLElement) || !el.title.trim()) return
      active = el
      let label = el.title
      if (el.matches('button,a,[role=button]') && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !el.textContent?.trim()) {
        addedLabel = label; el.setAttribute('aria-label', label)
      }
      // Empty title on a child stops inherited browser tooltips as well.
      for (let node: HTMLElement | null = el; node; node = node.parentElement) {
        if (node.title) { titles.push({ el: node, value: node.title }); node.title = '' }
      }
      const show = () => {
        if (active !== el || !el.isConnected) return
        const described = new Set((el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean))
        described.add(id); el.setAttribute('aria-describedby', [...described].join(' '))
        setHint({ anchor: el, label })
      }
      observer = new MutationObserver(records => {
        if (!el.isConnected || !el.hasAttribute('title')) { stop(); return }
        if (el.title === '' && records.some(r => r.target === el && r.attributeName === 'title' && r.oldValue === '')) {
          titles = titles.filter(t => t.el !== el); stop(); return
        }
        if (el.title) {
          label = el.title
          if (addedLabel && el.getAttribute('aria-label') === addedLabel) { addedLabel = label; el.setAttribute('aria-label', label) }
          const saved = titles.find(t => t.el === el)
          if (saved) saved.value = label
          el.title = ''
          setHint(current => current ? { anchor: el, label } : null)
        }
      })
      observer.observe(el, { attributes: true, attributeFilter: ['title'], attributeOldValue: true })
      observer.observe(document.body, { childList: true, subtree: true })
      timer = setTimeout(show, delay)
    }
    const over = (e: PointerEvent) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') start(e.target, TOOLTIP_HOVER_DELAY_MS) }
    const out = (e: PointerEvent) => { if (active && (!(e.relatedTarget instanceof Node) || !active.contains(e.relatedTarget))) stop() }
    const focus = (e: FocusEvent) => { if (e.target instanceof HTMLElement && e.target.matches(':focus-visible')) start(e.target, TOOLTIP_FOCUS_DELAY_MS) }
    const blur = () => stop()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    const down = () => dismiss()
    document.addEventListener('pointerover', over, true)
    document.addEventListener('pointerout', out, true)
    document.addEventListener('focusin', focus, true)
    document.addEventListener('focusout', blur, true)
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('keydown', key, true)
    window.addEventListener('scroll', stop, true)
    window.addEventListener('resize', stop)
    window.addEventListener('blur', stop)
    return () => {
      stop()
      document.removeEventListener('pointerover', over, true)
      document.removeEventListener('pointerout', out, true)
      document.removeEventListener('focusin', focus, true)
      document.removeEventListener('focusout', blur, true)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('keydown', key, true)
      window.removeEventListener('scroll', stop, true)
      window.removeEventListener('resize', stop)
      window.removeEventListener('blur', stop)
    }
  }, [id])
  return hint ? <TooltipBubble anchor={hint.anchor} label={hint.label} id={id} /> : null
}
