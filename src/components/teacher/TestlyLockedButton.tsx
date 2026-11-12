import { useEffect, useId, useRef, useState } from 'react'
import { viewportDropdownPosition, watchDropdownViewport } from '../../lib/dropdownPosition'
import { useT } from '../../lib/i18n'
import { TESTLY_SITE } from '../../lib/testlyModule'
import { followNotifAction } from '../../store/notificationsStore'
import { AlertIcon } from '../Alert'
import { ExternalLink, Lock } from '../icons/appIcons'
import ScrollFade from '../ScrollFade'
import { TestlyTile } from '../TestlyMark'

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
    const pos = viewportDropdownPosition(anchor.getBoundingClientRect(), 152, 280)
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
        <TestlyTile size={14} /> {t('Из Тестли')}
        <Lock size={13} style={{ marginLeft: 'auto', color: 'var(--color-muted)', flexShrink: 0 }} />
      </button>
      <div ref={panel} id={id} popover="auto" role="region" aria-label={t('Тестли')}
        onToggle={e => {
          const visible = e.currentTarget.matches(':popover-open')
          if (!visible) pinned.current = false
          setOpen(visible)
        }}
        onPointerEnter={() => window.clearTimeout(closeTimer.current)}
        onPointerLeave={closeSoon}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) closeSoon() }}
        style={{
          position: 'fixed', inset: 'auto', margin: 0, padding: 0, overflow: 'hidden',
          border: '1px solid var(--color-border-strong)', borderRadius: 16,
          background: 'var(--color-surface)', color: 'var(--color-text)', boxShadow: 'var(--shadow-lg)',
        }}
      >
        <ScrollFade maxHeight="var(--testly-info-height, 152px)" fadeHeight={12}>
          <div style={{ padding: 12, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertIcon tone="info" size={30} />
              <span style={{ fontSize: 13, lineHeight: 1.4 }}>{t('Добавляйте тесты из Тестли в домашки курса.')}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <a href={TESTLY_SITE} target="_blank" rel="noopener noreferrer" data-hover="layer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999, color: 'var(--color-text-2)', fontSize: 12, fontWeight: 600 }}>
                {t('Подробнее')} <ExternalLink size={12} />
              </a>
              <button type="button" data-hover="layer"
                onClick={() => {
                  panel.current?.hidePopover()
                  followNotifAction({ label: t('Подключить'), page: '#/teacher/profile', tab: 'integrations' })
                }}
                style={{ border: 0, borderRadius: 999, padding: '7px 12px', background: 'var(--grad-purple)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700 }}>
                {t('Подключить')}
              </button>
            </div>
          </div>
        </ScrollFade>
      </div>
    </>
  )
}
