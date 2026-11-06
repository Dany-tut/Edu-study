// «Связь с учениками» (функция reminders, концепт «Связь» → «Итог»):
// что бот отправит сегодня, что не дошло, сколько учеников подключили Telegram.
// Данные — reminders_today() (миграция 20261108100000_tg_reminders.sql).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Bell, AlertCircle, ChevronRight, RefreshCw } from '../../icons/appIcons'
import { useT } from '../../../lib/i18n'
import { useScrollFades } from '../../../lib/useScrollFades'
import { textFadeLines } from '../../../lib/textFades'
import { btn, PAIR } from '../../../lib/pillStyles'
import { useTeacher } from '../../../store/teacherStore'
import Modal from '../../Modal'
import { fetchCommsToday, failReason, type CommsToday } from '../../../lib/tgReminders'
import { formatTimeInTz, useTeacherTz } from '../../../lib/teacherTz'
import './remindersWidget.css'
import './commsWidget.css'

const KIND_LABEL: Record<string, string> = { lesson_soon: 'Урок скоро', hw_due: 'ДЗ завтра', hw_late: 'ДЗ просрочено' }
const REFRESH_MS = 60_000
const ONE_LINE = textFadeLines(1)

export default function WidgetCommsToday() {
  const t = useT()
  const openStudent = useTeacher(s => s.openStudentDashboard)
  // Время — в поясе учителя, как в расписании на том же столе.
  const tz = useTeacherTz(s => s.tz)
  const clock = (iso: string) => formatTimeInTz(iso, tz)
  const [data, setData] = useState<CommsToday | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [inviteOpen, setInviteOpen] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  useScrollFades(body, true, ':scope')

  const load = useCallback(async () => {
    try {
      const d = await fetchCommsToday()
      setData(d); setState('ready')
    } catch { setState(s => (s === 'ready' ? 'ready' : 'error')) }
  }, [])
  useEffect(() => {
    let alive = true
    const run = () => { if (alive && document.visibilityState === 'visible') void load() }
    void load()
    const timer = window.setInterval(run, REFRESH_MS)
    document.addEventListener('visibilitychange', run)
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', run) }
  }, [load])

  const people = (n: number) => {
    const mod10 = n % 10, mod100 = n % 100
    return n + ' ' + t(mod10 === 1 && mod100 !== 11 ? 'ученику' : 'ученикам')
  }

  // Два имени и счётчик: полный список — в «Позвать», иначе ряд растёт на весь виджет.
  const unlinkedLine = (list: { name: string }[]) => {
    const rest = list.length - 2
    return `${t('Без бота')}: ${list.slice(0, 2).map(u => u.name).join(', ')}${rest > 0 ? ` ${t('и ещё')} ${rest}` : ''}`
  }

  const next = data?.nextAt ? clock(data.nextAt) : ''
  const heroTitle = !data ? '' : data.queued > 0 ? `${t('Сегодня уйдёт')} ${data.queued}` : data.sent > 0 ? `${t('Сегодня ушло')} ${data.sent}` : t('Сегодня без напоминаний')
  const heroSub = !data ? '' : data.queued > 0 ? `${t('ближайшее в')} ${next}` : data.linked === 0 ? t('Пока никто не подключил бота') : t('Новые появятся по расписанию и ДЗ')

  return (
    <section className="comms-widget" aria-label={t('Связь с учениками')}>
      <header className="widget-panel-header">
        <Send size={17} />
        <h3>{t('Связь с учениками')}</h3>
        <button type="button" data-hover="layer" onClick={() => { void load() }} aria-label={t('Обновить')}><RefreshCw size={15} /></button>
      </header>
      <div ref={body} className="comms-body">
        {state === 'loading' && <div className="comms-empty" role="status">{t('Загрузка…')}</div>}
        {state === 'error' && !data && (
          <div className="comms-empty" role="alert">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <span style={{ whiteSpace: 'pre-line' }}>{t('Не удалось загрузить.\nПроверьте связь и обновите.')}</span>
              <button type="button" onClick={() => { setState('loading'); void load() }} style={btn('S', 'secondary')}>{t('Обновить')}</button>
            </div>
          </div>
        )}
        {state === 'ready' && !data && <div className="comms-empty" role="status">{t('Функция выключена')}</div>}
        {data && <>
          <div className="comms-row">
            <span className="comms-row-tile" style={{ background: PAIR.blue.bg, color: PAIR.blue.color }}><Bell size={16} /></span>
            <div className="comms-row-text">
              <strong>{heroTitle}</strong>
              <span style={ONE_LINE}>{heroSub}</span>
            </div>
          </div>

          {data.failed.map(f => (
            <div key={f.id} className="comms-row" data-tone="red">
              <span className="comms-row-tile" style={{ background: 'var(--color-bg-card)', color: PAIR.red.color }}><AlertCircle size={16} /></span>
              <div className="comms-row-text">
                <strong style={ONE_LINE}>{t('Не дошло')}: {f.name}</strong>
                <span style={ONE_LINE}>{t(failReason(f.error))} · {t(KIND_LABEL[f.kind] ?? f.title)}</span>
              </div>
              <button type="button" data-hover="layer" onClick={() => openStudent(f.studentId, null)} style={btn('S', 'secondary', { background: 'var(--color-bg-card)' })}>{t('Карточка')}</button>
            </div>
          ))}

          <div className="comms-row">
            <span className="comms-row-tile" style={{ background: PAIR.green.bg, color: PAIR.green.color }}><Send size={16} /></span>
            <div className="comms-row-text">
              <strong>Telegram {data.linked} {t('из')} {data.total}</strong>
              <span style={textFadeLines(2)}>{data.unlinked.length === 0
                ? (data.total > 0 ? t('Подключены все') : t('Учеников пока нет'))
                : unlinkedLine(data.unlinked)}</span>
            </div>
            {data.unlinked.length > 0 && <button type="button" onClick={() => setInviteOpen(true)} style={btn('S', 'primary')}>{t('Позвать')}</button>}
          </div>

          {data.upcoming.length > 0 && <>
            <div className="comms-section-label">{t('Что уйдёт сегодня')}</div>
            <div className="comms-queue">
              {data.upcoming.map(u => (
                <div key={u.at + u.kind + u.body} className="comms-queue-item">
                  <time dateTime={u.at}>{clock(u.at)}</time>
                  <div>
                    <b style={ONE_LINE}>{t(KIND_LABEL[u.kind] ?? u.title)} · {people(u.count)}</b>
                    <span style={ONE_LINE} title={u.names.join(', ')}>{u.body.split('\n')[0]} · {u.names.join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </>}
        </>}
      </div>

      {inviteOpen && data && (
        <Modal onClose={() => setInviteOpen(false)} width={420} title={t('Позвать в Telegram')}
          subtitle={t('Откройте карточку ученика и отправьте ему личную ссылку на бота.')}>
          <div className="comms-invite-list">
            {data.unlinked.map(u => (
              <button key={u.id} type="button" data-hover="layer" className="comms-invite-row"
                onClick={() => { setInviteOpen(false); openStudent(u.id, null) }}>
                <span style={ONE_LINE}>{u.name}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </Modal>
      )}
    </section>
  )
}
