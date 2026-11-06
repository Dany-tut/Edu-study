// Экран «Отчёты родителям» — вариант «Итог» концепта «Связь».
// Сначала исключения, потом одна кнопка: «Требуют внимания / Все», флаги по
// правилам, «Утвердить N». На телефоне — список исключений, готовые и шторка.
import { useEffect, useMemo, useState } from 'react'
import FadeText from '../../FadeText'
import Segmented from '../../Segmented'
import HScrollFade from '../../HScrollFade'
import MobileSheet from '../../MobileSheet'
import EmptyState from '../../EmptyState'
import { Alert } from '../../Alert'
import { ChevronLeft, ChevronRight, Check, FileText, Info, RefreshCw, Send } from '../../icons/appIcons'
import { btn } from '../../../lib/pillStyles'
import { useT } from '../../../lib/i18n'
import {
  buildWeek, decideReports, flagChip, mondayMsk, reportState, sendApprovedNow, useParentReports, useReportFocus,
  weekLabel, type ParentReport,
} from '../../../lib/parentReports'
import ReportDetail, { STATE_LABEL, initials } from './ReportDetail'
import './parentReports.css'

type Filter = 'attention' | 'all'
const needsDecision = (r: ParentReport) => ['flagged', 'failed'].includes(reportState(r))

function useReportsScreen() {
  const st = useParentReports()
  const focusId = useReportFocus(s => s.id)
  useEffect(() => { void st.load() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const current = mondayMsk()
  const ready = st.reports.filter(r => reportState(r) === 'ready')
  const flagged = st.reports.filter(needsDecision)
  const approved = st.reports.filter(r => r.status === 'approved')
  return { ...st, focusId, current, ready, flagged, approved }
}

function WeekSwitch({ week, setWeek, current }: { week: string; setWeek: (w: string) => void; current: string }) {
  const t = useT()
  const shift = (n: number) => {
    const [y, m, d] = week.split('-').map(Number)
    setWeek(new Date(Date.UTC(y, m - 1, d + n * 7)).toISOString().slice(0, 10))
  }
  return (
    <span className="pr-week">
      <button data-hover="layer" type="button" className="pr-round" aria-label={t('Предыдущая неделя')} onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
      <span style={{ minWidth: 120, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{weekLabel(week)}</span>
      <button data-hover="layer" type="button" className="pr-round" aria-label={t('Следующая неделя')} disabled={week >= current} onClick={() => shift(1)}><ChevronRight size={16} /></button>
    </span>
  )
}

function useBatch() {
  const t = useT()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null)
  async function approveReady(ids: string[]) {
    setBusy(true); setMsg(null)
    const done = await decideReports(ids, 'approve')
    setBusy(false)
    if (!done) setMsg({ tone: 'danger', text: t('Не удалось утвердить.\nПроверьте соединение и попробуйте ещё раз.') })
  }
  async function sendNow() {
    setBusy(true); setMsg(null)
    const res = await sendApprovedNow()
    setBusy(false)
    if (!res) setMsg({ tone: 'danger', text: t('Отправка не удалась.\nУтверждённые отчёты уйдут в воскресенье в 18:00.') })
    else setMsg({ tone: res.failed ? 'danger' : 'success', text: res.failed
      ? `${t('Отправлено')}: ${res.sent}. ${t('Не дошло')}: ${res.failed}.\n${t('Причина — в карточке отчёта.')}`
      : `${t('Отправлено')}: ${res.sent}` })
  }
  async function build(week: string) {
    setBusy(true); setMsg(null)
    const ok = await buildWeek(week)
    setBusy(false)
    if (!ok) setMsg({ tone: 'danger', text: t('Не удалось собрать отчёты.\nПопробуйте ещё раз через минуту.') })
  }
  return { busy, msg, approveReady, sendNow, build }
}

function SummaryBar({ ready, flagged, approved, busy, onApprove, onSend, mobile }: {
  ready: number; flagged: number; approved: number; busy: boolean; onApprove: () => void; onSend: () => void; mobile?: boolean
}) {
  const t = useT()
  const title = ready || flagged
    ? `${t('Готовы')}: ${ready} · ${t('требуют вашего решения')}: ${flagged}`
    : approved ? `${t('Утверждено')}: ${approved}` : t('Всё решено на этой неделе')
  return (
    <div className="pr-card pr-bar" style={mobile ? { flexDirection: 'column', alignItems: 'stretch', padding: 16 } : undefined}>
      <div className="pr-bar-text">
        <b><FadeText>{title}</FadeText></b>
        <span>{t('Утверждённые уйдут в воскресенье в 18:00. До этого любой можно отозвать.')}</span>
      </div>
      {approved > 0 && (
        <button data-hover="layer" type="button" disabled={busy} onClick={onSend} style={btn(mobile ? 'L' : 'M', 'secondary', { opacity: busy ? .5 : 1 })}>
          <Send size={16} />{t('Отправить сейчас')} · {approved}
        </button>
      )}
      <button data-hover="layer" type="button" disabled={busy || !ready} onClick={onApprove} style={btn(mobile ? 'L' : 'M', 'primary', { opacity: busy || !ready ? .5 : 1 })}>
        <Check size={16} />{`${t('Утвердить')} ${ready}`}
      </button>
    </div>
  )
}

function Empty({ week, current, busy, onBuild }: { week: string; current: string; busy: boolean; onBuild: () => void }) {
  const t = useT()
  return (
    <EmptyState icon={FileText}
      title={week === current ? t('Отчёты этой недели ещё не собраны') : t('За эту неделю отчётов нет')}
      text={week === current ? t('Они соберутся сами в пятницу в 17:00 из журнала и домашних работ. Можно собрать и сейчас — цифры обновятся в пятницу.') : undefined}
      action={busy ? undefined : { label: t('Собрать сейчас'), onClick: onBuild }} />
  )
}

// ── ПК ─────────────────────────────────────────────────────────────────────

export default function ParentReportsView() {
  const t = useT()
  const s = useReportsScreen()
  const batch = useBatch()
  const [filter, setFilter] = useState<Filter>('attention')
  const [selected, setSelected] = useState<string | null>(null)
  const list = useMemo(() => filter === 'attention' && s.flagged.length ? s.flagged : s.reports, [filter, s.flagged, s.reports])
  useEffect(() => { if (s.focusId) { setSelected(s.focusId); setFilter('all'); useReportFocus.getState().set(null) } }, [s.focusId])
  const current = s.reports.find(r => r.id === selected) ?? list[0] ?? null

  function nextAfterDecision() {
    const rest = s.flagged.filter(r => r.id !== current?.id)
    setSelected(rest[0]?.id ?? null)
  }

  return (
    <div className="pr-page">
      <header className="pr-head">
        <h1>{t('Отчёты родителям')}</h1>
        <WeekSwitch week={s.week} setWeek={w => { setSelected(null); s.setWeek(w) }} current={s.current} />
        <HScrollFade padX={2} padTop={3} padBottom={3} fadeWidth={22} style={{ minWidth: 0 }}>
          <Segmented variant="filter" value={filter} onChange={setFilter} items={[
            { id: 'attention', label: t('Требуют внимания'), count: s.flagged.length, countTone: 'danger' },
            { id: 'all', label: t('Все'), count: s.reports.length },
          ]} />
        </HScrollFade>
        {s.week === s.current && s.reports.length > 0 && (
          <button data-hover="layer" type="button" disabled={batch.busy} onClick={() => void batch.build(s.week)} style={btn('S', 'quiet')} title={t('Пересчитать цифры недели. Ваши фразы не изменятся.')}>
            <RefreshCw size={14} />{t('Обновить цифры')}
          </button>
        )}
        {s.reports.some(r => r.flags.includes('first_weeks')) && <span className="pr-chip info"><Info size={14} />{t('Первые 2 недели все отчёты — на проверку')}</span>}
      </header>

      {s.error && <Alert tone="danger" stacked title={s.error.split('\n')[0]} text={s.error.split('\n')[1]} />}
      {batch.msg && <Alert tone={batch.msg.tone} stacked title={batch.msg.text.split('\n')[0]} text={batch.msg.text.split('\n')[1]} />}

      {!s.loading && s.loadedWeek === s.week && s.reports.length === 0 ? (
        <Empty week={s.week} current={s.current} busy={batch.busy} onBuild={() => void batch.build(s.week)} />
      ) : (
        <>
          <SummaryBar ready={s.ready.length} flagged={s.flagged.length} approved={s.approved.length} busy={batch.busy}
            onApprove={() => void batch.approveReady(s.ready.map(r => r.id))} onSend={() => void batch.sendNow()} />
          <div className="pr-grid">
            <div className="pr-card" style={{ padding: '4px 8px 8px' }}>
              <table className="pr-table">
                <colgroup><col style={{ width: '24%' }} /><col style={{ width: 68 }} /><col style={{ width: 64 }} /><col style={{ width: 60 }} /><col /><col style={{ width: 128 }} /></colgroup>
                <thead><tr><th>{t('Ученик')}</th><th>{t('Уроки')}</th><th>{t('Работы')}</th><th>{t('Балл')}</th><th>{t('Получается')}</th><th /></tr></thead>
                <tbody>
                  {list.map(r => {
                    const st = reportState(r)
                    return (
                      <tr key={r.id} data-row data-hover="layer" aria-selected={current?.id === r.id} tabIndex={0}
                        onClick={() => setSelected(r.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r.id) } }}>
                        <td><span className="pr-name"><span className="pr-avatar" aria-hidden="true">{initials(r.studentName)}</span><FadeText style={{ flex: 1, minWidth: 0 }}>{r.studentName}</FadeText></span></td>
                        <td className="pr-num">{r.stats.lessons_total ? `${r.stats.lessons_attended} ${t('из')} ${r.stats.lessons_total}` : '—'}</td>
                        <td className="pr-num">{r.stats.hw_done}</td>
                        <td className="pr-num">{r.stats.avg_pct != null ? `${r.stats.avg_pct}%` : '—'}</td>
                        <td><FadeText className="pr-sub">{r.strengths || t('фраза не написана')}</FadeText></td>
                        <td style={{ textAlign: 'right' }}><span className={`pr-chip ${st}`}>{st === 'flagged' ? flagChip(r) : t(STATE_LABEL[st])}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <aside className="pr-card pr-detail" aria-label={t('Отчёт')}>
              {current ? <ReportDetail report={current} onDecided={nextAfterDecision} />
                : <EmptyState compact title={t('Выберите ученика')} />}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

// ── Телефон ────────────────────────────────────────────────────────────────

export function ParentReportsMobile() {
  const t = useT()
  const s = useReportsScreen()
  const batch = useBatch()
  const [open, setOpen] = useState<string | null>(null)
  useEffect(() => { if (s.focusId) { setOpen(s.focusId); useReportFocus.getState().set(null) } }, [s.focusId])
  const opened = s.reports.find(r => r.id === open) ?? null
  const rest = s.reports.filter(r => !needsDecision(r) && reportState(r) !== 'ready')

  const Row = ({ r }: { r: ParentReport }) => {
    const st = reportState(r)
    return (
      <button data-hover="layer" type="button" className="pr-m-row" onClick={() => setOpen(r.id)}>
        <span className="pr-avatar" aria-hidden="true">{initials(r.studentName)}</span>
        <div><b><FadeText>{r.studentName}</FadeText></b><FadeText className="pr-sub">{st === 'flagged' ? flagChip(r) : st === 'failed' ? (r.sendError ?? t('не дошёл')) : (r.strengths || t('фраза не написана'))}</FadeText></div>
        <span className={`pr-chip ${st}`}>{st === 'flagged' ? t('Решить') : t(STATE_LABEL[st])}</span>
      </button>
    )
  }

  return (
    <div className="pr-m">
      <div style={{ display: 'flex', justifyContent: 'center' }}><WeekSwitch week={s.week} setWeek={s.setWeek} current={s.current} /></div>
      {s.error && <Alert tone="danger" stacked title={s.error.split('\n')[0]} text={s.error.split('\n')[1]} />}
      {batch.msg && <Alert tone={batch.msg.tone} stacked title={batch.msg.text.split('\n')[0]} text={batch.msg.text.split('\n')[1]} />}
      {!s.loading && s.loadedWeek === s.week && s.reports.length === 0 ? (
        <Empty week={s.week} current={s.current} busy={batch.busy} onBuild={() => void batch.build(s.week)} />
      ) : <>
        {s.flagged.length > 0 && <div className="pr-m-section">{t('Нужно ваше решение')} · {s.flagged.length}</div>}
        {s.flagged.map(r => <Row key={r.id} r={r} />)}
        {s.ready.length > 0 && <div className="pr-m-section">{t('Готовы')} · {s.ready.length}</div>}
        {s.ready.map(r => <Row key={r.id} r={r} />)}
        {rest.length > 0 && <div className="pr-m-section">{t('Остальные')}</div>}
        {rest.map(r => <Row key={r.id} r={r} />)}
        <SummaryBar mobile ready={s.ready.length} flagged={s.flagged.length} approved={s.approved.length} busy={batch.busy}
          onApprove={() => void batch.approveReady(s.ready.map(r => r.id))} onSend={() => void batch.sendNow()} />
      </>}
      <MobileSheet open={!!opened} onClose={() => setOpen(null)} title={opened?.studentName}>
        {opened && <div className="pr-m" style={{ padding: 0 }}><ReportDetail mobile report={opened} onDecided={() => setOpen(null)} /></div>}
      </MobileSheet>
    </div>
  )
}
