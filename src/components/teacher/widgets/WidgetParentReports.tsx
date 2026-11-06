// Виджет «Отчёты родителям» (функция parent_report): сколько готово, какие
// требуют решения, «Утвердить N». Нажатие на ученика — экран отчётов на нём.
import { useEffect, useState } from 'react'
import FadeText from '../../FadeText'
import { OverlayScrollArea } from '../OverlayScroll'
import { ChevronRight, FileText, Check } from '../../icons/appIcons'
import { btn } from '../../../lib/pillStyles'
import { useT } from '../../../lib/i18n'
import { useTeacher } from '../../../store/teacherStore'
import { decideReports, FLAG_LABEL, useReportFocus, useReportSummary, weekLabel } from '../../../lib/parentReports'
import { widgetNavigationProps } from './widgetNavigation'

export default function WidgetParentReports() {
  const t = useT()
  const summary = useReportSummary(s => s.summary)
  const setActivePage = useTeacher(s => s.setActivePage)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => { void useReportSummary.getState().load() }, [])
  const open = (id?: string) => { if (id) useReportFocus.getState().set(id); setActivePage('parent-reports') }

  async function approve() {
    if (!summary?.ready_ids.length) return
    setBusy(true); setFailed(false)
    const done = await decideReports(summary.ready_ids, 'approve')
    setBusy(false)
    if (!done) setFailed(true)
  }

  const s = summary
  return (
    <div className="ww-parent-reports" {...widgetNavigationProps(() => open())} style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'rgba(var(--glass-rgb), 0.88)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
      borderRadius: 24, border: '1px solid var(--color-border-medium)', padding: 14, gap: 10, boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={14} /></span>
        <FadeText style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
          {s ? `${t('Отчёты родителям')} · ${weekLabel(s.week_start)}` : t('Отчёты родителям')}
        </FadeText>
      </div>

      {!s ? (
        <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Загрузка…')}</span>
      ) : s.total === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <b style={{ fontSize: 14, color: 'var(--color-text)' }}>{t('Отчёты соберутся в пятницу в 17:00')}</b>
          <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{t('Из журнала и домашних работ этой недели.')}</span>
        </div>
      ) : <>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 14, background: 'var(--color-bg-3)' }}>
            <b style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{s.ready}</b>
            <FadeText style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{t('готовы')}</FadeText>
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 14, background: s.flagged + s.failed ? 'var(--color-peach-soft)' : 'var(--color-bg-3)' }}>
            <b style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', color: s.flagged + s.failed ? 'var(--color-peach-text)' : 'var(--color-text)' }}>{s.flagged + s.failed}</b>
            <FadeText style={{ fontSize: 11, color: s.flagged + s.failed ? 'var(--color-peach-text)' : 'var(--color-text-3)' }}>{t('решить')}</FadeText>
          </div>
          <div style={{ flex: 1, minWidth: 0, padding: '8px 10px', borderRadius: 14, background: 'var(--color-bg-3)' }}>
            <b style={{ fontSize: 20, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{s.approved || s.sent}</b>
            <FadeText style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{s.approved ? t('утверждено') : t('отправлено')}</FadeText>
          </div>
        </div>

        <OverlayScrollArea style={{ flex: 1 }} scrollStyle={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {s.attention.map(a => (
            <button key={a.id} type="button" data-hover="layer" onClick={() => open(a.id)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 44, padding: '6px 8px', border: 'none',
              borderRadius: 12, background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--color-text)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, flexShrink: 0, background: a.status === 'failed' ? 'var(--color-red-text)' : 'var(--color-peach-text)' }} aria-hidden="true" />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <FadeText style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</FadeText>
                <FadeText style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                  {a.status === 'failed' ? t('не дошёл') : t(FLAG_LABEL[a.flags.find(f => f !== 'first_weeks') ?? a.flags[0]] ?? '')}
                </FadeText>
              </span>
              <ChevronRight size={14} style={{ color: 'var(--color-text-4)', flexShrink: 0 }} />
            </button>
          ))}
          {s.attention.length === 0 && <span style={{ fontSize: 12, color: 'var(--color-text-3)', padding: '6px 8px' }}>{t('Ничего не требует решения')}</span>}
        </OverlayScrollArea>

        {failed && <span role="alert" style={{ fontSize: 12, color: 'var(--color-red-text)' }}>{t('Не удалось утвердить. Попробуйте ещё раз.')}</span>}
        {s.ready > 0 && (
          <button type="button" data-hover="layer" disabled={busy} onClick={() => void approve()} style={btn('M', 'primary', { width: '100%', flexShrink: 0, opacity: busy ? .5 : 1 })}>
            <Check size={16} />{`${t('Утвердить')} ${s.ready}`}
          </button>
        )}
      </>}
    </div>
  )
}
