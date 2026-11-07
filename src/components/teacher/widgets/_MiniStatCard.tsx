import { useLayoutEffect, useRef } from 'react'
import type { LucideIcon } from '../../icons/appIcons'
import { metricObjects } from '../../../lib/widgetMetricObjects'
import { useTeacher } from '../../../store/teacherStore'
import { ArrowUpRight } from '../../icons/appIcons'
import { metricNavigationTarget, widgetNavigationProps } from './widgetNavigation'
import Skeleton from '../../Skeleton'

type Props = {
  widgetId?: string
  icon: LucideIcon
  label: string
  value: string | number
  sub: string
  accentBg: string
  accentColor: string
  dimmed?: boolean
  /** Данные ещё едут. Скелетон вместо цифры: ноль — это утверждение, и
   *  «Студентов 0» на полсекунды у учителя с тридцатью учениками читается как
   *  потеря данных, а не как ожидание. */
  loading?: boolean
  onOpen?: () => void
}

export default function MiniStatCard({ widgetId, icon: Icon, label, value, sub, accentBg, accentColor, dimmed, loading, onOpen }: Props) {
  const setActivePage = useTeacher(s=>s.setActivePage)
  const destination = metricNavigationTarget(widgetId)
  const open = onOpen ?? (destination ? () => setActivePage(destination) : undefined)
  const measureRef = useRef<HTMLSpanElement>(null)
  const valueRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = valueRef.current
    if (!el) return
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    let active = true
    const fit = () => {
      if (!active || !context || !measureRef.current || !el.clientWidth) return
      const style = getComputedStyle(measureRef.current)
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const textWidth = context.measureText(String(value)).width
      const ceiling = parseFloat(style.fontSize)
      const size = textWidth > 0 ? Math.min(ceiling, ceiling * el.clientWidth / textWidth) : ceiling
      const next = `${size}px`
      if (el.style.getPropertyValue('--metric-font-size') !== next) el.style.setProperty('--metric-font-size', next)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    void document.fonts.ready.then(fit)
    document.fonts.addEventListener('loadingdone', fit)
    return () => {
      active = false
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', fit)
    }
  }, [value, loading])
  return (
    <div className="iskra-mini-stat" role="group" {...widgetNavigationProps(open)} aria-label={`${label}: ${loading ? '…' : value}. ${sub}`} title={`${label}: ${loading ? '…' : value}. ${sub}`} aria-busy={loading || undefined} style={{
      width: '100%', height: '100%', cursor: open ? 'pointer' : 'default',
      background: 'rgba(var(--glass-rgb), 0.88)',
      backdropFilter: 'var(--blur-glass)',
      WebkitBackdropFilter: 'var(--blur-glass)',
      border: '1px solid var(--color-border-medium)',
      borderRadius: 24,
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden',
    }}>
      <div className="iskra-mini-stat-heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="iskra-mini-stat-label" style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </span>
        <div className="iskra-mini-stat-icon" aria-hidden="true" style={{
          width: 30, height: 30, borderRadius: 10,
          background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} strokeWidth={2.2} style={{ color: accentColor }} />
        </div>
      </div>
      {loading ? (
        <div className="iskra-mini-stat-value"><Skeleton w={72} h={32} radius={10} /></div>
      ) : (
        <div ref={valueRef} className="iskra-mini-stat-value" style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: dimmed ? 'var(--color-text-3)' : 'var(--color-text)', lineHeight: 1, letterSpacing: '-0.01em' }}>
          {value}
          <span ref={measureRef} aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none', fontSize: 'var(--metric-base-size,28px)' }} />
        </div>
      )}
      {loading ? (
        <div className="iskra-mini-stat-sub"><Skeleton w={104} h={17} radius={8} /></div>
      ) : (
        <div className="iskra-mini-stat-sub" style={{
          fontSize: 11, fontWeight: 600, color: dimmed ? 'var(--color-text-3)' : accentColor,
          background: dimmed ? 'var(--color-bg-4)' : accentBg,
          borderRadius: 8, padding: '4px 8px', alignSelf: 'flex-start',
        }}>
          {sub}
        </div>
      )}
      {widgetId && metricObjects[widgetId] && <img className="iskra-mini-stat-object" src={metricObjects[widgetId]} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
      {open && <span className="iskra-mini-stat-open" aria-hidden="true"><ArrowUpRight size={16}/></span>}
    </div>
  )
}
