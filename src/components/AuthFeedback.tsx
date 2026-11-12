import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2 } from './icons/appIcons'
import { authErrorRu } from '../lib/authErrors'
import { useT } from '../lib/i18n'
import './authLayout.css'

export type AuthFeedbackMessage = {
  tone: 'danger' | 'info' | 'success'
  title: string
  text?: string
  busy?: boolean
  onCancel?: () => void
  // Необязательное действие в сообщении (напр. «Ещё раз» при сбое проверки доступа).
  action?: { label: string; onClick: () => void }
  invalid?: 'credentials' | 'email' | 'password' | 'code'
}
type Entry = { id: number; source: string; message: AuthFeedbackMessage }
type FeedbackContext = {
  entry: Entry | null
  begin: (source: string, message: AuthFeedbackMessage) => number
  report: (id: number, message: AuthFeedbackMessage) => void
  clear: (id: number) => void
  reset: () => void
  deliver: (source: string, id: number | null, message: AuthFeedbackMessage) => number | null
  descriptionId: string
}
const Context = createContext<FeedbackContext | null>(null)

export function AuthFeedbackProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<Entry | null>(null)
  const active = useRef<Entry | null>(null)
  const sequence = useRef(0)
  const descriptionId = useId()
  const begin = useCallback((source: string, message: AuthFeedbackMessage) => {
    const previous = active.current
    const next = { id: ++sequence.current, source, message }
    active.current = next
    setEntry(next)
    // A newly chosen method owns both the status and the pending action.
    if (previous?.message.busy && previous.source !== source) previous.message.onCancel?.()
    return next.id
  }, [])
  const report = useCallback((id: number, message: AuthFeedbackMessage) => {
    if (active.current?.id !== id) return
    const next = { ...active.current, message }
    active.current = next
    setEntry(next)
  }, [])
  const clear = useCallback((id: number) => {
    if (active.current?.id !== id) return
    active.current = null
    setEntry(null)
  }, [])
  const reset = useCallback(() => {
    const previous = active.current
    active.current = null
    setEntry(null)
    previous?.message.onCancel?.()
  }, [])
  const deliver = useCallback((source: string, id: number | null, message: AuthFeedbackMessage) => {
    if (id !== null) { report(id, message); return id }
    return active.current ? null : begin(source, message)
  }, [report, begin])
  const value = useMemo(() => ({ entry, begin, report, clear, reset, deliver, descriptionId }), [entry, begin, report, clear, reset, deliver, descriptionId])
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAuthFeedback(source: string) {
  const context = useContext(Context)
  if (!context) throw new Error('Auth feedback requires a page provider')
  const ticket = useRef<number | null>(null)
  const begin = useCallback((message: AuthFeedbackMessage) => {
    ticket.current = context.begin(source, message)
  }, [context.begin, source])
  const report = useCallback((message: AuthFeedbackMessage) => {
    // Stable across status changes: OAuth listeners must not restart mid-attempt.
    ticket.current = context.deliver(source, ticket.current, message)
  }, [context.deliver, source])
  const clear = useCallback(() => {
    if (ticket.current !== null) context.clear(ticket.current)
  }, [context.clear])
  return { begin, report, clear, reset: context.reset, descriptionId: context.descriptionId, busy: !!context.entry?.message.busy,
    message: context.entry?.source === source ? context.entry.message : null }
}

export function authFailureFeedback(error: unknown): AuthFeedbackMessage {
  const timeout = error instanceof DOMException && error.name === 'TimeoutError'
  const text = typeof error === 'string' ? error : authErrorRu(error && typeof error === 'object' ? error : { message: String(error) })
  if (text === 'Эта учётная запись ещё не подключена к профилю ученика. Попросите учителя связать аккаунт.') {
    return {
      tone: 'danger',
      title: 'Аккаунт не привязан к профилю ученика',
      text: 'Если вы преподаватель, откройте вход для преподавателей. Если вы ученик, войдите по персональной ссылке от преподавателя.',
    }
  }
  if (text === 'Войдите под другой учётной записью преподавателя. Для ученического аккаунта выберите роль ученика.') {
    return { tone: 'danger', title: 'Нет доступа к кабинету преподавателя', text }
  }
  if (/Неверный email или пароль/i.test(text)) return { tone: 'danger', title: 'Неверный email или пароль', text: 'Проверьте данные и повторите вход.', invalid: 'credentials' }
  if (timeout || /не ответил вовремя/i.test(text)) return { tone: 'danger', title: 'Сервер не ответил', text: 'Повторите попытку чуть позже.' }
  if (/интернет|связи с сервером/i.test(text)) return { tone: 'danger', title: 'Нет соединения', text: 'Проверьте интернет и повторите попытку.' }
  if (/Срок действия кода|код.*ист[её]к/i.test(text)) return { tone: 'danger', title: 'Код устарел', text: 'Отправьте код ещё раз.', invalid: 'code' }
  if (/код.*неверн|код.*не подош/i.test(text)) return { tone: 'danger', title: 'Код не подошёл', text: 'Проверьте цифры из последнего письма.', invalid: 'code' }
  if (/слишком много/i.test(text)) return { tone: 'info', title: 'Подождите немного', text }
  if (/адрес почты.*некоррект/i.test(text)) return { tone: 'danger', title: 'Проверьте email', text: 'Например, name@example.com.', invalid: 'email' }
  return { tone: 'danger', title: 'Не удалось выполнить действие', text }
}

export function AuthFeedbackSlot({ idleText, idleSecondary, reserve, reserveHeight = 70 }: { idleText: string; idleSecondary?: string; reserve?: boolean; reserveHeight?: number }) {
  const context = useContext(Context)
  if (!context) throw new Error('Auth feedback requires a page provider')
  const t = useT()
  const message = context.entry?.message
  const Icon = message?.busy ? Loader2 : message?.tone === 'danger' ? AlertCircle : message?.tone === 'success' ? CheckCircle2 : Info

  // Зарезервированный слот: idle-подсказка держит высоту в потоке, сообщение
  // накладывается поверх (overlay). Состояния (idle / ошибка / успех / занятость)
  // не двигают разметку — карточка не прыгает. Длинная ошибка уходит вниз, при
  // необходимости перекрывая «Забыли пароль». Поведение включается пропом reserve;
  // остальные экраны (ученик/код/приглашение) используют классический слот ниже.
  if (reserve) {
    // Высоту слота задаёт КОНСТАНТА (reserveHeight), а не длина idle-текста:
    // правка подсказок или сообщений об ошибке не двигает submit/соц-кнопки.
    return <div className="auth-feedback-slot auth-feedback-slot--reserve" data-auth-feedback-slot
      style={{ ['--auth-feedback-reserve-h' as string]: `${reserveHeight}px` }}>
      <div id={context.descriptionId} className="auth-feedback auth-feedback--idle" data-tone="idle" aria-hidden={message ? true : undefined}
        style={{ visibility: message ? 'hidden' : undefined }}>
        <span className="auth-feedback-icon" aria-hidden="true"><Info size={18} strokeWidth={2} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p>{t(idleText)}</p>
          {idleSecondary && <span className="auth-feedback-secondary">{t(idleSecondary)}</span>}
        </div>
      </div>
      {message && <div className="auth-feedback-overlay">
        <div className="auth-feedback" data-tone={message.tone}
          role={message.tone === 'danger' ? 'alert' : 'status'} aria-live={message.tone === 'danger' ? 'assertive' : 'polite'} aria-atomic="true">
          <span className={message.busy ? 'auth-feedback-icon auth-feedback-spinner' : 'auth-feedback-icon'} aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{t(message.title)}</strong>
            {message.text && <p>{t(message.text)}</p>}
          </div>
          {message.busy && message.onCancel && <button data-hover="layer" type="button" className="auth-feedback-cancel" onClick={message.onCancel}>{t('Отмена')}</button>}
          {!message.busy && message.action && <button data-hover="layer" type="button" className="auth-feedback-cancel" onClick={message.action.onClick}>{t(message.action.label)}</button>}
        </div>
      </div>}
    </div>
  }

  return <div className="auth-feedback-slot" data-auth-feedback-slot>
    <div id={context.descriptionId} className={`auth-feedback${message ? '' : ' auth-feedback--idle'}`} data-tone={message?.tone ?? 'idle'}
      role={message?.tone === 'danger' ? 'alert' : 'status'} aria-live={message?.tone === 'danger' ? 'assertive' : 'polite'} aria-atomic="true">
      <span className={message?.busy ? 'auth-feedback-icon auth-feedback-spinner' : 'auth-feedback-icon'} aria-hidden="true"><Icon size={18} strokeWidth={2} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {message && <strong>{t(message.title)}</strong>}
        {(message?.text || !message) && <p>{t(message?.text ?? idleText)}</p>}
      </div>
      {message?.busy && message.onCancel && <button data-hover="layer" type="button" className="auth-feedback-cancel" onClick={message.onCancel}>{t('Отмена')}</button>}
    </div>
  </div>
}
