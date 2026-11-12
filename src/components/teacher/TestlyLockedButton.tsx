import { useEffect, useId, useRef, useState } from 'react'
import { viewportDropdownPosition, watchDropdownViewport } from '../../lib/dropdownPosition'
import { useT } from '../../lib/i18n'
import { TESTLY_SITE } from '../../lib/testlyModule'
import { followNotifAction } from '../../store/notificationsStore'
import { ExternalLink, Lock } from '../icons/appIcons'
import ScrollFade from '../ScrollFade'
import { TestlyTile } from '../TestlyMark'
import './testlyLockedButton.css'

export default function TestlyLockedButton() {
  const t = useT()
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const pinned = useRef(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const [open, setOpen] = useState(false)

  function place() {
    const anchor = trigger.current
    const card = panel.current
    if (!anchor || !card) return
    const rect = anchor.getBoundingClientRect()
    const cardHeight = 160
    const cardWidth = 280
    const viewport = window.visualViewport
    const viewportRight = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth)
    const viewportTop = viewport?.offsetTop ?? 0
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight)
    const gap = 8
    const rightSide = rect.right + gap

    if (rightSide + cardWidth <= viewportRight - gap && rect.bottom > viewportTop && rect.top < viewportBottom) {
      const maxHeight = viewportBottom - viewportTop - gap * 2
      const height = Math.min(cardHeight, maxHeight)
      const top = Math.max(viewportTop + gap, Math.min(rect.top, viewportBottom - gap - height))
      Object.assign(card.style, { left: `${rightSide}px`, width: `${cardWidth}px`, top: `${top}px`, bottom: 'auto' })
      card.style.setProperty('--testly-info-height', `${maxHeight}px`)
      return
    }

    const pos = viewportDropdownPosition(rect, cardHeight, cardWidth)
    Object.assign(card.style, {
      left: `${pos.left}px`, width: `${pos.width}px`,
      top: pos.up ? 'auto' : `${pos.top}px`,
      bottom: pos.up ? `${pos.bottom}px` : 'auto',
    })
    card.style.setProperty('--testly-info-height', `${pos.maxHeight}px`)
  }

  function show() {
    window.clearTimeout(closeTimer.current)
    place()
    panel.current?.showPopover()
  }

  function closeSoon() {
    window.clearTimeout(closeTimer.current)
    if (pinned.current) return
    closeTimer.current = window.setTimeout(() => {
      if (!panel.current?.contains(document.activeElement)) panel.current?.hidePopover()
    }, 160)
  }

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const unwatchViewport = watchDropdownViewport(place)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      unwatchViewport()
    }
  }, [open])

  return (
    <>
      <button ref={trigger} type="button" data-hover="layer" aria-expanded={open} aria-controls={id} popoverTarget={id}
        onPointerEnter={e => { if (e.pointerType === 'mouse') show() }}
        onPointerLeave={closeSoon}
        onClick={e => {
          e.preventDefault()
          if (pinned.current && panel.current?.matches(':popover-open')) {
            pinned.current = false
            panel.current.hidePopover()
          } else {
            pinned.current = true
            show()
          }
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '10px 12px', borderRadius: 13, border: '1.5px dashed var(--color-border)',
          background: 'transparent', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)',
        }}
      >
        <TestlyTile size={16} tone="brand" /> {t('Из Тестли')}
        <Lock size={13} style={{ marginLeft: 'auto', color: 'var(--color-muted)', flexShrink: 0 }} />
      </button>
      <div ref={panel} id={id} className="testly-notebook" popover="auto" role="region" aria-label={t('Тестли')}
        onToggle={e => {
          const visible = e.currentTarget.matches(':popover-open')
          if (!visible) pinned.current = false
          setOpen(visible)
        }}
        onPointerEnter={() => window.clearTimeout(closeTimer.current)}
        onPointerLeave={closeSoon}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) closeSoon() }}
      >
        <ScrollFade maxHeight="var(--testly-info-height, 160px)" fadeHeight={12}>
          <div className="testly-notebook-content">
            <div className="testly-notebook-heading">
              <TestlyTile size={23} tone="brand" />
              <strong>{t('Тестли')}</strong>
              <svg className="testly-notebook-drawing" viewBox="0 0 54 38" fill="none" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M24 27c-6-4-13-5-21-3L8 7c7-2 13-1 19 3 6-3 13-4 20-1l-4 16c-7-1-13-1-19 2zm0 0 3-17" />
                  <path d="M7 10 5 26c8-1 14-1 19 2 6-2 12-2 18-1M7 34c12-4 25-5 37-2" />
                  <path d="m39 21 10-15q1-2 3-1t1 3L43 23l-5 2z" fill="var(--testly-notebook-highlight)" />
                  <path d="m48 8 4 3m-13 10 4 2" />
                </g>
              </svg>
            </div>
            <p>{t('Добавляйте тесты в домашки курса.')}</p>
            <div className="testly-notebook-actions">
              <a href={TESTLY_SITE} target="_blank" rel="noopener noreferrer" data-hover="layer">
                {t('Подробнее')} <ExternalLink size={12} />
              </a>
              <button type="button" className="testly-notebook-connect" data-hover="layer"
                onClick={() => {
                  panel.current?.hidePopover()
                  followNotifAction({ label: t('Подключить'), page: '#/teacher/profile', tab: 'integrations' })
                }}>
                {t('Подключить')}
              </button>
            </div>
          </div>
        </ScrollFade>
      </div>
    </>
  )
}
