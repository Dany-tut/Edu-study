import type { ReactNode } from 'react'
import FadeText from './FadeText'
import HomeWidgetObject from './HomeWidgetObject'
import Skeleton from './Skeleton'
import { ChevronRight } from './icons/appIcons'
import { useT } from '../lib/i18n'
import './studentHomeWidget.css'
import './nextWorkWidget.css'

export type NextWorkWidgetProps = {
  title: string
  meta?: string
  due?: ReactNode
  dueShort?: string
  overdue?: boolean
  status?: 'ready' | 'loading' | 'empty' | 'error'
  action?: string
  secondary?: boolean
  onOpen?: () => void
}

export default function NextWorkWidget({ title, meta, due, dueShort, overdue, status = 'ready', action, secondary, onOpen }: NextWorkWidgetProps) {
  const t = useT()
  const loading = status === 'loading'
  const hasFooter = loading || !!action
  const settled = status === 'empty'
  return <div className="next-work-container">
    <article className="ihw-card next-work-card" data-home-widget="13" data-state={status} data-has-footer={hasFooter}>
      <div className="next-work-content">
      <header className="ihw-heading"><h2>{t('Следующий шаг')}</h2></header>
      <div className="ihw-body">
        <div className="next-work-copy">
          {loading ? <div className="next-work-skeleton" role="status" aria-label={t('Загрузка')}>
            <Skeleton w="78%" h={20}/><Skeleton w="58%" h={12}/>
          </div> : <>
            <h3 className="next-work-title"><FadeText lines={2} fadeMode="last-line">{title}</FadeText></h3>
            {(meta || status === 'error') && <p className="next-work-meta"><FadeText lines={2} fadeMode="last-line">{status === 'error' ? t('Попробуй ещё раз') : meta}</FadeText></p>}
          </>}
        </div>
      </div>
      </div>
      <HomeWidgetObject id={settled ? 8 : 13}/>
      {hasFooter && <footer className="ihw-footer next-work-footer">
        {loading ? <Skeleton className="next-work-action-skeleton" w={110} h={32}/> : <>
          {action && <button type="button" className="next-work-action" data-secondary={secondary} onClick={onOpen}><FadeText>{action}</FadeText><ChevronRight size={16}/></button>}
          {due && <span className="next-work-due" data-overdue={overdue}>
            <span className={dueShort ? 'next-work-due-full' : undefined}><FadeText lines={2} fadeMode="last-line">{due}</FadeText></span>
            {dueShort && <span className="next-work-due-short">{overdue && <span className="sr-only">{t('Просрочено')} </span>}<FadeText lines={2} fadeMode="last-line">{!overdue && dueShort !== t('Без срока') ? `${t('До')} ${dueShort}` : dueShort}</FadeText></span>}
          </span>}
        </>}
      </footer>}
    </article>
  </div>
}
