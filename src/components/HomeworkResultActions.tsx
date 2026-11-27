import OpticalText from './OpticalText'
import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, ChevronLeft, ChevronUp, ExternalLink, RotateCcw } from './icons/appIcons'
import { useT } from '../lib/i18n'
import { btn } from '../lib/pillStyles'
import { IS_IOS } from '../lib/platform'
import { HW_COLUMN_LEFT, hwColumnWidth } from '../lib/homeworkColumn'

/** Портал держит панель у окна даже внутри анимированного контейнера урока. */
export default function HomeworkResultActions({ isMobile, navCollapsed, onSummary, onBack, onReview, reviewUrl, onHard, onNext, onHeightChange }: {
  isMobile: boolean
  navCollapsed: boolean
  onSummary: () => void
  onBack: () => void
  onReview?: () => void
  reviewUrl?: string
  onHard?: () => void
  /** Следующий урок курса — только когда разбирать и решать больше нечего. */
  onNext?: () => void
  onHeightChange: (height: number) => void
}) {
  const t = useT()
  const panelRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const measure = () => onHeightChange(Math.ceil(panel.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [onHeightChange])
  const actionStyle = btn('M', 'quiet', { flex: '1 1 120px', minWidth: 0, minHeight: 44, whiteSpace: 'normal', lineHeight: 1.3 })

  return createPortal(
    <nav ref={panelRef} data-homework-bottom={isMobile ? '' : undefined} aria-label={t('Действия после сдачи')} style={{
      boxSizing: 'border-box', position: 'fixed', bottom: isMobile ? (navCollapsed ? 92 : 104) : 24,
      marginBottom: 'env(safe-area-inset-bottom, 0px)', left: HW_COLUMN_LEFT, transform: 'translateX(-50%)',
      zIndex: 100, width: hwColumnWidth(620, 24), display: 'flex', flexWrap: 'wrap', gap: 6,
      padding: 8, borderRadius: 24,
      // iPhone/iPad — стекло, как у остальной плавающей хромировки; Android/ПК — плашка.
      ...(IS_IOS ? {
        background: 'rgba(var(--glass-rgb), var(--glass-fill-strong))',
        backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid var(--color-border-glass)', boxShadow: 'var(--shadow-pill)',
      } : {
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border-medium)', boxShadow: 'var(--shadow-lg)',
      }),
    }}>
      <button data-hover="layer" type="button" onClick={onSummary} style={actionStyle}><ChevronUp size={16} style={{ flexShrink: 0 }} /><OpticalText as="iskra-button-label">{t('К результату')}</OpticalText></button>
      {onReview ? (
        <button data-hover="layer" type="button" onClick={onReview} style={{ ...actionStyle, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }}><RotateCcw size={16} style={{ flexShrink: 0 }} /><OpticalText as="iskra-button-label">{t('Разобрать ошибки')}</OpticalText></button>
      ) : reviewUrl ? (
        <a data-hover="layer" href={reviewUrl} target="_blank" rel="noopener noreferrer" style={{ ...actionStyle, textDecoration: 'none', background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' }}>{t('Открыть разбор')}<ExternalLink size={16} style={{ flexShrink: 0 }} /></a>
      ) : null}
      {onHard && <button data-hover="layer" type="button" onClick={onHard} style={{ ...actionStyle, background: 'var(--grad-purple)', color: '#fff' }}><OpticalText as="iskra-button-label">{t('Открыть хард')}</OpticalText><ArrowRight size={16} style={{ flexShrink: 0 }} /></button>}
      <button data-hover="layer" type="button" onClick={onBack} style={actionStyle}><ChevronLeft size={16} style={{ flexShrink: 0 }} /><OpticalText as="iskra-button-label">{t('К уроку')}</OpticalText></button>
      {onNext && !onReview && !onHard && <button data-hover="layer" type="button" onClick={onNext} style={{ ...actionStyle, background: 'var(--grad-purple)', color: '#fff' }}><OpticalText as="iskra-button-label">{t('Следующий урок')}</OpticalText><ArrowRight size={16} style={{ flexShrink: 0 }} /></button>}
    </nav>,
    document.body,
  )
}
