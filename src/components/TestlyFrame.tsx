import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, CloudOff, Menu } from './icons/appIcons'
import ImageZoom from './ImageZoom'
import Modal from './Modal'
import { useT } from '../lib/i18n'
import { PLATFORM, type Platform } from '../lib/platform'
import { useIsDesktop } from '../lib/useIsDesktop'
import { useBackClose } from '../lib/overlayStack'
import { Z } from '../lib/layers'
import {
  accentInk, formatLeft, useTestlyCountdown, useTestlyEmbed,
  type TestlyDone, type TestlyItem, type TestlyState,
} from '../lib/testlyEmbed'
import './testlyFrame.css'

/*
 * Рамка Искры вокруг листа Тестли (концепт Figma «Искра», стр. 32).
 * Лист — раскладку и оформление учителя — рисует Тестли в iframe. Искра даёт
 * шапку («‹ Домашка · 6 из 12 · таймер», «Сохранено»), нижнюю панель, карту
 * заданий, проверку перед сдачей и зум картинки — и включает только то, что
 * разрешил учитель: «Назад» (allowBack), номера (showQuestionNumbers), время.
 * Телефон — экран целиком, плавающая скруглённая панель внизу; iPad — капсула
 * справа; ПК — окно в странице ДЗ, «Назад · номера · Дальше» под ним.
 * Пока Тестли не ответил на рукопожатие, видны его собственные кнопки.
 */
type Mode = 'iphone' | 'android' | 'ipad' | 'pc'

export default function TestlyFrame({ src, title, onClose, onDone, platform }: {
  src: string
  title: string
  onClose: () => void
  onDone: (done: TestlyDone) => void
  /** Только для стенда: показать рамку другой версии. */
  platform?: Platform
}) {
  const t = useT()
  const isDesktop = useIsDesktop()
  const mode: Mode = platform ?? (isDesktop ? (PLATFORM === 'ipad' ? 'ipad' : 'pc') : (PLATFORM === 'android' ? 'android' : 'iphone'))
  const phone = mode === 'iphone' || mode === 'android'
  const frameRef = useRef<HTMLIFrameElement>(null)
  const { state, done, zoom, setZoom, send } = useTestlyEmbed(frameRef, src)
  const [sheet, setSheet] = useState<null | 'map' | 'review'>(null)
  const left = useTestlyCountdown(state?.deadline, state?.skew)

  const doneRef = useRef(onDone)
  doneRef.current = onDone
  useEffect(() => { if (done) doneRef.current(done) }, [done])
  // Лист «Проверьте перед сдачей» Тестли спрятан — показываем свой.
  useEffect(() => { if (state?.frame && state.stage === 'review') setSheet('review') }, [state?.frame, state?.stage])
  useBackClose(phone, onClose)

  const live = !!state?.frame && (state.stage === 'test' || state.stage === 'review')
  const feed = state?.layout === 'feed'
  const items = (state?.items ?? []).filter((x): x is TestlyItem & { n: number } => x.n !== null)
  const accent = state?.accent || null
  const style = { '--tf-accent': accent ?? '#7E6EE6' } as CSSProperties

  const position = !live || !state ? title
    : feed ? `${t('Отвечено')} ${state.answered ?? 0} ${t('из')} ${state.total}`
    : state.info ? t('Текст к заданиям')
    : `${state.n ?? ''} ${t('из')} ${state.total}`
  const savedLine = !state?.frame ? null
    : state.saving === 'offline' ? <span className="testly-frame__saved is-offline"><CloudOff size={13} />{t('Нет связи')}</span>
    : state.saving === 'saving' ? <span className="testly-frame__saved">{t('Сохраняем…')}</span>
    : <span className="testly-frame__saved"><Check size={13} className="testly-frame__ok" />{t('Сохранено')}</span>
  const timer = left !== null && <span className="testly-frame__timer"><Clock size={14} />{formatLeft(left)}</span>

  const toReview = () => setSheet('review')
  const lastStep = !!state && (state.last || state.returnToEnd)
  const main = (cls = '') => feed || lastStep
    ? <button type="button" data-hover="layer" className={`testly-frame__main ${cls}`} style={mainStyle(accent)} onClick={toReview}>
        {feed ? `${t('К сдаче')} · ${state?.answered ?? 0} ${t('из')} ${state?.total ?? 0}` : state?.returnToEnd ? t('Вернуться к сдаче') : t('К сдаче')}
      </button>
    : <button type="button" data-hover="layer" className={`testly-frame__main ${cls}`} style={mainStyle(accent)} onClick={() => send({ cmd: 'next' })}>
        {t('Дальше')}<ChevronRight size={18} />
      </button>
  const canBack = !!state?.allowBack && !feed
  const canMap = !!state?.showQuestionNumbers && !feed
  const backBtn = canBack && <button type="button" data-hover="layer" className="testly-frame__circle" aria-label={t('Назад')} disabled={(state?.index ?? 0) === 0} onClick={() => send({ cmd: 'back' })}><ChevronLeft size={22} /></button>
  const mapBtn = canMap && <button type="button" data-hover="layer" className="testly-frame__circle" aria-label={t('Задания')} onClick={() => setSheet('map')}><Menu size={22} /></button>

  const head = (
    <header className="testly-frame__head">
      {mode === 'android'
        ? <button type="button" className="testly-frame__icon" aria-label={t('Назад')} onClick={onClose}><ArrowLeft size={24} /></button>
        : <button type="button" data-hover="link" className="testly-frame__back" onClick={onClose}><ChevronLeft size={18} />{t(mode === 'pc' ? 'К домашке' : 'Домашка')}</button>}
      <div className={`testly-frame__title${mode === 'android' ? ' is-start' : ''}`}>
        <b>{mode === 'pc' || mode === 'ipad' ? title : position}</b>
        {mode === 'pc' || mode === 'ipad' ? <span>{live ? position : t('Тест в Тестли')}</span> : savedLine}
      </div>
      <div className="testly-frame__side">
        {(mode === 'pc' || mode === 'ipad') && savedLine}
        {timer}
      </div>
    </header>
  )

  const goto = (it: TestlyItem) => { send({ cmd: 'goto', index: it.index }); setSheet(null) }
  const chip = (it: TestlyItem & { n: number }, size?: number) => (
    <button key={it.index} type="button" data-hover="layer" onClick={() => goto(it)}
      className={`testly-frame__chip${it.answered ? ' is-done' : ''}${it.index === state?.index ? ' is-current' : ''}`}
      style={size ? { width: size, height: size } : undefined} aria-label={`${t('Задание')} ${it.n}`}>
      {it.n}{it.flag && <i className="testly-frame__flag" />}
    </button>
  )

  const mapBody = (
    <div className="testly-frame__sheet">
      <div className="testly-frame__sheet-row"><b>{t('Задания')}</b><span>{t('Отвечено')} {state?.answered ?? 0} {t('из')} {state?.total ?? 0}</span></div>
      <div className="testly-frame__grid">{items.map(it => chip(it))}</div>
      <div className="testly-frame__legend">
        <span><i className="is-done" />{t('Есть ответ')}</span><span><i className="is-current" />{t('Сейчас')}</span>
        <span><i />{t('Без ответа')}</span>{items.some(x => x.flag) && <span><i className="is-flag" />{t('Вернуться')}</span>}
      </div>
    </div>
  )
  const issues = items.filter(x => !x.answered || x.flag)
  const closeReview = () => { setSheet(null); if (state?.stage === 'review') send({ cmd: 'back' }) }
  const reviewBody = (
    <div className="testly-frame__sheet">
      <span className="testly-frame__muted">
        {t('Отвечено')} {state?.answered ?? 0} {t('из')} {state?.total ?? 0}
        {(state?.flags?.length ?? 0) > 0 && ` · ${state?.flags?.length} ${t('отмечено «вернуться»')}`}
      </span>
      <div className="testly-frame__grid is-small">{items.map(it => chip(it))}</div>
      {issues.length > 0 && <div className="testly-frame__issues">
        {issues.map(it => (
          <button key={it.index} type="button" data-hover="layer" className="testly-frame__issue" onClick={() => goto(it)}>
            <span className={`testly-frame__chip is-mini${it.answered ? ' is-done' : ''}`}>{it.n}{it.flag && <i className="testly-frame__flag" />}</span>
            <span className="testly-frame__issue-text">{t('Задание')} {it.n}</span>
            <span className={it.answered ? 'is-flag' : 'is-empty'}>{it.answered ? t('вернуться') : t('нет ответа')}</span>
          </button>
        ))}
      </div>}
      <span className="testly-frame__muted">{t('После сдачи ответы изменить нельзя.')}</span>
    </div>
  )
  const reviewFooter = (
    <div className="testly-frame__sheet-actions">
      <button type="button" data-hover="layer" className="testly-frame__main" style={mainStyle(accent)} disabled={!!state?.submitting}
        onClick={() => send({ cmd: 'submit' })}>{state?.submitting ? t('Сдаём…') : t('Сдать работу')}</button>
      <button type="button" data-hover="layer" className="testly-frame__ghost" onClick={closeReview}>{t('Вернуться к заданиям')}</button>
    </div>
  )
  const mapFooter = <div className="testly-frame__sheet-actions">{<button type="button" data-hover="layer" className="testly-frame__main" style={mainStyle(accent)} onClick={toReview}>{t('К сдаче')}</button>}</div>

  // Телефон: шторка внутри рамки (граббер, без ×, тап по фону закрывает) — системная
  // шторка лежит ниже экрана теста. ПК и iPad — обычное окно Искры.
  const drawer = (title: string | null, body: ReactNode, footer: ReactNode, close: () => void) => (
    <>
      <div className="testly-frame__scrim" onClick={close} />
      <div className="testly-frame__drawer" role="dialog" aria-label={title ?? t('Задания')}>
        <span className="testly-frame__grabber" />
        {title && <b className="testly-frame__drawer-title">{title}</b>}
        {body}
        {footer}
      </div>
    </>
  )
  const sheets = live && (phone
    ? sheet === 'map' ? drawer(null, mapBody, mapFooter, () => setSheet(null))
    : sheet === 'review' ? drawer(t('Проверьте перед сдачей'), reviewBody, reviewFooter, closeReview)
    : null
    : sheet === 'map' ? <Modal onClose={() => setSheet(null)} title={t('Задания')} width={440} footer={mapFooter}>{mapBody}</Modal>
    : sheet === 'review' ? <Modal onClose={closeReview} title={t('Проверьте перед сдачей')} width={460} footer={reviewFooter}>{reviewBody}</Modal>
    : null)

  const panel: ReactNode = live && (phone
    ? <div className="testly-frame__panel">{feed ? main('is-wide') : <>{backBtn}{mapBtn}{main('is-wide')}</>}</div>
    : mode === 'pc'
      ? <div className="testly-frame__nav">
          {canBack ? <button type="button" data-hover="layer" className="testly-frame__ghost" disabled={(state?.index ?? 0) === 0} onClick={() => send({ cmd: 'back' })}><ChevronLeft size={18} />{t('Назад')}</button> : <span />}
          {canMap ? <div className="testly-frame__strip">{items.map(it => chip(it, 36))}</div> : <span />}
          {main()}
        </div>
      : <div className="testly-frame__capsule">
          {backBtn}{mapBtn && <button type="button" data-hover="layer" className="testly-frame__circle is-count" onClick={() => setSheet('map')}><b>{state?.n ?? '·'}</b><span>{t('из')} {state?.total}</span></button>}
          <button type="button" data-hover="layer" className="testly-frame__circle is-main" style={mainStyle(accent)} aria-label={lastStep || feed ? t('К сдаче') : t('Дальше')}
            onClick={() => lastStep || feed ? toReview() : send({ cmd: 'next' })}>{lastStep || feed ? <Check size={24} /> : <ChevronRight size={26} />}</button>
        </div>)

  const body = (
    <div className={`testly-frame is-${mode}${live ? ' is-live' : ''}`} style={phone ? { ...style, zIndex: Z.sheet } : style}>
      {head}
      {state?.saving === 'offline' && <div className="testly-frame__offline"><CloudOff size={16} />{t('Нет интернета. Ответы сохраняются на устройстве и отправятся сами, когда связь вернётся.')}</div>}
      <div className="testly-frame__body">
        <div className="testly-frame__window">
          <iframe ref={frameRef} title={t('Тест Тестли')} src={src}
            allow="fullscreen; clipboard-read; clipboard-write" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </div>
        {mode === 'ipad' && panel}
      </div>
      {mode !== 'ipad' && panel}
      {sheets}
      <ImageZoom src={zoom?.src ?? null} caption={zoom?.alt || undefined} onClose={() => setZoom(null)} />
    </div>
  )
  return phone ? createPortal(body, document.body) : body
}

function mainStyle(accent: string | null): CSSProperties {
  return accent ? { background: accent, color: accentInk(accent) } : { background: 'var(--grad-purple)', color: '#fff' }
}
