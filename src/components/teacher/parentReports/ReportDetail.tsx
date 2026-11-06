// Один отчёт: почему отмечен, цифры недели, две фразы, решение и связь с родителем.
// Общий для ПК (правая панель) и телефона (шторка).
import { useEffect, useRef, useState } from 'react'
import FadeText from '../../FadeText'
import GrowTextarea from '../../GrowTextarea'
import { Alert } from '../../Alert'
import { confirmDialog } from '../../ConfirmHost'
import { Check, Copy, Link2, Send, Trash2, RefreshCw, UserPlus } from '../../icons/appIcons'
import { btn } from '../../../lib/pillStyles'
import { FIELD } from '../../../lib/fieldStyle'
import { copyToClipboard } from '../../../lib/clipboard'
import { useT } from '../../../lib/i18n'
import {
  createReportLink, decideReports, flagReason, inviteParent, removeParent, renewInvite, reportState,
  revokeReportLinks, saveReportText, type ParentReport,
} from '../../../lib/parentReports'

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export const STATE_LABEL = {
  ready: 'Готов', flagged: 'Требует решения', approved: 'Утверждён', sent: 'Отправлен', failed: 'Не дошёл', skipped: 'Пропущен',
} as const

/** Текст, как его увидит родитель в Telegram (без разметки). */
export function previewText(r: ParentReport, teacher = 'Вы'): string {
  const s = r.stats
  const lines = [`${s.child} · неделя`]
  lines.push(s.lessons_total ? `Уроки: ${s.lessons_attended} из ${s.lessons_total}` : 'Уроков на этой неделе не было')
  lines.push(s.hw_done || s.hw_returned ? `Домашние работы: сдано ${s.hw_done}${s.hw_returned ? `, на доработке ${s.hw_returned}` : ''}` : 'Домашние работы: не сдавались')
  if (s.avg_pct != null) lines.push(`Средний балл: ${s.avg_pct}%${s.prev_avg_pct != null ? ` (было ${s.prev_avg_pct}%)` : ''}`)
  if (r.strengths.trim() || r.focus.trim()) lines.push('')
  if (r.strengths.trim()) lines.push(`Получается: ${r.strengths.trim()}`)
  if (r.focus.trim()) lines.push(`Работаем над: ${r.focus.trim()}`)
  lines.push('', `${teacher}${s.subject ? ` · ${s.subject.toLowerCase()}` : ''}`)
  return lines.join('\n')
}

const dayFmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })

export default function ReportDetail({ report, mobile = false, onDecided }: {
  report: ParentReport
  mobile?: boolean
  /** После решения: ПК переходит к следующему отмеченному, телефон закрывает шторку. */
  onDecided?: () => void
}) {
  const t = useT()
  const [strengths, setStrengths] = useState(report.strengths)
  const [focus, setFocus] = useState(report.focus)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  // Смена ученика — новые фразы. Ответ сохранения от прошлого ученика не трогает новые поля.
  useEffect(() => { setStrengths(report.strengths); setFocus(report.focus); setError(''); setPreview(false) }, [report.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = strengths !== report.strengths || focus !== report.focus
  const state = reportState(report)
  const editable = report.status === 'draft' || report.status === 'approved' || report.status === 'failed'

  // Автосохранение фраз через 700 мс после ввода.
  const saveTimer = useRef<number>(0)
  useEffect(() => {
    if (!dirty || !editable) return
    window.clearTimeout(saveTimer.current)
    const id = report.id
    saveTimer.current = window.setTimeout(() => {
      void saveReportText(id, strengths, focus).then(ok => { if (!ok) setError(t('Фразы не сохранились.\nТекст остался в полях — попробуйте ещё раз.')) })
    }, 700)
    return () => window.clearTimeout(saveTimer.current)
  }, [strengths, focus]) // eslint-disable-line react-hooks/exhaustive-deps

  async function decide(action: 'approve' | 'skip' | 'reopen') {
    setBusy(true); setError('')
    window.clearTimeout(saveTimer.current)
    if (dirty && editable && !(await saveReportText(report.id, strengths, focus))) {
      setBusy(false); setError(t('Фразы не сохранились.\nТекст остался в полях — попробуйте ещё раз.')); return
    }
    const done = await decideReports([report.id], action)
    setBusy(false)
    if (!done) { setError(t('Не удалось сохранить решение.\nПроверьте соединение и попробуйте ещё раз.')); return }
    if (action !== 'reopen') onDecided?.()
  }

  const s = report.stats
  const reason = flagReason(report)
  const contactLine = report.contacts.length
    ? report.contacts.map(c => `${c.relation ? `${c.relation}: ` : ''}${c.name}`).join(', ')
    : t('родитель не указан')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!mobile && (
        <div className="pr-who">
          <span className="pr-avatar lg" aria-hidden="true">{initials(report.studentName)}</span>
          <div><b><FadeText>{report.studentName}</FadeText></b><span className="pr-sub"><FadeText>{contactLine}</FadeText></span></div>
          <span className={`pr-chip ${state}`}>{t(STATE_LABEL[state])}</span>
        </div>
      )}
      {mobile && <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}><span className={`pr-chip ${state}`}>{t(STATE_LABEL[state])}</span></div>}

      {state === 'flagged' && reason && (
        <div className="pr-note flag"><b>{t('Почему отмечен')}:</b> {reason}.{report.flags.includes('absent_2') ? ` ${t('О пропусках правило не пишет само: решите, как сказать.')}` : ''}</div>
      )}
      {state === 'failed' && <div className="pr-note fail"><b>{t('Не дошёл')}:</b> {report.sendError ?? t('причина неизвестна')}. {t('Подключите родителя или создайте ссылку и утвердите снова.')}</div>}

      <div className="pr-stats">
        <div className="pr-stat"><b>{s.lessons_total ? `${s.lessons_attended}/${s.lessons_total}` : '—'}</b><span>{t('уроков')}</span></div>
        <div className="pr-stat"><b>{s.hw_done}</b><span>{t('работ сдано')}</span></div>
        <div className="pr-stat"><b>{s.avg_pct != null ? `${s.avg_pct}%` : '—'}</b><span>{s.prev_avg_pct != null ? `${t('было')} ${s.prev_avg_pct}%` : t('средний балл')}</span></div>
      </div>

      <div className="pr-label">{t('Получается')}</div>
      <GrowTextarea className="pr-field" style={{ ...FIELD, fontSize: mobile ? 16 : 14 }} value={strengths} onChange={setStrengths} disabled={!editable}
        placeholder={t('Что получилось на этой неделе — с фактом: «тест 12 из 15»')} maxLength={600} minHeight={64} aria-label={t('Получается')} />
      <div className="pr-label">{t('Работаем над')}</div>
      <GrowTextarea className="pr-field" style={{ ...FIELD, fontSize: mobile ? 16 : 14 }} value={focus} onChange={setFocus} disabled={!editable}
        placeholder={t('Над чем работаем и что договорились делать')} maxLength={600} minHeight={64} aria-label={t('Работаем над')} />

      {s.lessons.length > 0 && (
        <div className="pr-lessons" aria-label={t('Уроки недели')}>
          {s.lessons.map((l, i) => (
            <div key={`${l.date}-${i}`} className="pr-lesson">
              <span className="pr-lesson-date">{dayFmt(l.date)}</span>
              <FadeText style={{ flex: 1, minWidth: 0 }}>{l.title ?? t('Урок')}</FadeText>
              <span className={`pr-chip ${l.present ? 'sent' : 'neutral'}`}>{l.present ? t('был') : t('не был')}</span>
            </div>
          ))}
        </div>
      )}

      {error && <Alert tone="danger" stacked title={error.split('\n')[0]} text={error.split('\n').slice(1).join('\n') || undefined} />}

      <div className="pr-actions">
        {state === 'ready' || state === 'flagged' || state === 'failed' ? <>
          <button data-hover="layer" type="button" disabled={busy} onClick={() => void decide('skip')} style={btn(mobile ? 'L' : 'M', 'secondary', { width: '100%', minHeight: mobile ? 48 : 40 })}>{t('Пропустить неделю')}</button>
          <button data-hover="layer" type="button" disabled={busy} onClick={() => void decide('approve')} style={btn(mobile ? 'L' : 'M', 'primary', { width: '100%', minHeight: mobile ? 48 : 40, opacity: busy ? .5 : 1 })}><Check size={16} />{t('Утвердить')}</button>
        </> : state === 'sent' ? (
          <span className="pr-sub" style={{ gridColumn: 'span 2' }}>{t('Отправлен')} {report.sentAt ? new Date(report.sentAt).toLocaleString('ru-RU', { weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
        ) : (
          <button data-hover="layer" type="button" disabled={busy} onClick={() => void decide('reopen')} style={{ ...btn(mobile ? 'L' : 'M', 'secondary', { width: '100%', minHeight: mobile ? 48 : 40 }), gridColumn: 'span 2' }}>{state === 'approved' ? t('Отозвать до отправки') : t('Вернуть в черновики')}</button>
        )}
      </div>

      <button data-hover="layer" type="button" onClick={() => setPreview(v => !v)} style={btn('S', 'quiet', { alignSelf: 'flex-start', minHeight: mobile ? 44 : 32 })}>
        {preview ? t('Скрыть') : t('Так увидит родитель')}
      </button>
      {preview && <div className="pr-preview">{previewText({ ...report, strengths, focus })}</div>}

      <ParentChannels report={report} mobile={mobile} />
    </div>
  )
}

/** Связь с родителем: Telegram по коду и постоянная ссылка на страницу. */
function ParentChannels({ report, mobile }: { report: ParentReport; mobile: boolean }) {
  const t = useT()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [link, setLink] = useState<{ url: string; kind: 'tg' | 'page' } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  useEffect(() => { setLink(null); setError(''); setAdding(false); setName(''); setRelation('') }, [report.studentId])

  const show = (url: string | null, kind: 'tg' | 'page', fail: string) => {
    if (!url) { setError(fail); return }
    setLink({ url, kind }); setCopied(false)
  }
  async function invite() {
    if (!name.trim()) { setError(t('Укажите, как зовут родителя.')); return }
    setBusy(true); setError('')
    const url = await inviteParent(report.studentId, name.trim(), relation.trim())
    setBusy(false)
    show(url, 'tg', t('Не удалось создать приглашение.\nПопробуйте ещё раз через минуту.'))
    if (url) { setAdding(false); setName(''); setRelation('') }
  }
  async function copy() {
    if (link && await copyToClipboard(link.url)) { setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  }
  const field = { ...FIELD, fontSize: mobile ? 16 : 13, minHeight: mobile ? 44 : 36 }
  const small = (extra = {}) => btn('S', 'secondary', { minHeight: mobile ? 44 : 32, ...extra })

  return (
    <div className="pr-parent">
      <div className="pr-label">{t('Родитель')}</div>
      {report.contacts.map(c => (
        <div key={c.id} className="pr-contact">
          <span className={`pr-chip ${c.linked && !c.stopped ? 'sent' : c.stopped ? 'failed' : 'neutral'}`}>
            {c.linked && !c.stopped ? 'Telegram' : c.stopped ? t('отписался') : c.pending ? t('ждём /start') : t('код истёк')}
          </span>
          <FadeText style={{ flex: 1, minWidth: 0 }}>{`${c.relation ? `${c.relation}, ` : ''}${c.name}`}</FadeText>
          {!c.linked && (
            <button data-hover="layer" type="button" className="pr-icon-btn" aria-label={t('Новое приглашение')} title={t('Новое приглашение')}
              onClick={async () => show(await renewInvite(c.id), 'tg', t('Не удалось создать приглашение.\nПопробуйте ещё раз через минуту.'))}><RefreshCw size={16} /></button>
          )}
          <button data-hover="layer" type="button" className="pr-icon-btn" aria-label={t('Удалить контакт')} title={t('Удалить контакт')}
            onClick={async () => {
              if (!(await confirmDialog({ title: t('Удалить контакт родителя?'), message: t('Отчёты в Telegram этому человеку больше не придут.'), confirmLabel: t('Удалить'), tone: 'danger' }))) return
              if (!(await removeParent(c.id))) setError(t('Контакт не удалился.\nПопробуйте ещё раз.'))
            }}><Trash2 size={16} /></button>
        </div>
      ))}

      {adding ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="pr-invite">
            <input style={field} value={name} onChange={e => setName(e.target.value)} placeholder={t('Имя: Ольга')} maxLength={80} aria-label={t('Имя родителя')} />
            <input style={field} value={relation} onChange={e => setRelation(e.target.value)} placeholder={t('мама')} maxLength={40} aria-label={t('Кем приходится')} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button data-hover="layer" type="button" style={small({ flex: 1 })} onClick={() => setAdding(false)}>{t('Отмена')}</button>
            <button data-hover="layer" type="button" disabled={busy} style={btn('S', 'primary', { flex: 1, minHeight: mobile ? 44 : 32, opacity: busy ? .5 : 1 })} onClick={() => void invite()}><Send size={14} />{t('Приглашение в Telegram')}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button data-hover="layer" type="button" style={small({ background: 'var(--color-purple-soft)', color: 'var(--color-purple-text)' })} onClick={() => { setAdding(true); setError('') }}><UserPlus size={14} />{t('Подключить в Telegram')}</button>
          <button data-hover="layer" type="button" style={small()} onClick={async () => { setError(''); show(await createReportLink(report.studentId), 'page', t('Ссылка не создалась.\nПопробуйте ещё раз.')) }}><Link2 size={14} />{report.hasLink ? t('Ещё ссылка') : t('Ссылка на страницу')}</button>
          {report.hasLink && (
            <button data-hover="layer" type="button" style={btn('S', 'quiet', { minHeight: mobile ? 44 : 32 })} onClick={async () => {
              if (!(await confirmDialog({ title: t('Отозвать все ссылки?'), message: t('Старые ссылки перестанут открываться. Новую можно создать сразу.'), confirmLabel: t('Отозвать'), tone: 'danger' }))) return
              if (!(await revokeReportLinks(report.studentId))) setError(t('Ссылки не отозвались.\nПопробуйте ещё раз.'))
            }}>{t('Отозвать ссылки')}</button>
          )}
        </div>
      )}

      {link && (
        <>
          <div className="pr-linkbox">
            <FadeText style={{ flex: 1, minWidth: 0 }}>{link.url}</FadeText>
            <button data-hover="layer" type="button" className="pr-icon-btn" aria-label={t('Скопировать')} onClick={() => void copy()}>{copied ? <Check size={16} /> : <Copy size={16} />}</button>
          </div>
          <span className="pr-sub">{link.kind === 'tg'
            ? t('Перешлите ссылку родителю. Он нажмёт «Старт» — и отчёты начнут приходить в Telegram. Ссылка действует 14 дней.')
            : t('Постоянная ссылка: на странице все отправленные недели. Её можно переслать в любой мессенджер. Видна только сейчас — сохраните её.')}</span>
        </>
      )}
      {error && <Alert tone="danger" stacked title={error.split('\n')[0]} text={error.split('\n').slice(1).join('\n') || undefined} />}
    </div>
  )
}
