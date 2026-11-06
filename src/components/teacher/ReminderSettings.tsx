// «Настройки → Функции → Напоминания ученикам»: три правила один раз
// (концепт «Связь», вариант «Итог»). Время — московское, как расписание;
// раньше 07:00 бот не пишет.
import { useEffect, useRef, useState } from 'react'
import Switch from '../Switch'
import Segmented from '../Segmented'
import { useT } from '../../lib/i18n'
import { DEFAULT_REMINDER_SETTINGS, fetchReminderSettings, saveReminderSettings, type ReminderSettings as Rules } from '../../lib/tgReminders'

type Row = {
  key: 'lessonSoon' | 'hwDue' | 'hwLate'
  title: string
  about: (s: Rules) => string
}

export default function ReminderSettings() {
  const t = useT()
  const [rules, setRules] = useState<Rules | null>(null)
  const [failed, setFailed] = useState(false)
  const saved = useRef<Rules>(DEFAULT_REMINDER_SETTINGS)
  const seq = useRef(0)

  useEffect(() => {
    let alive = true
    void fetchReminderSettings().then(r => { if (alive && r) { saved.current = r; setRules(r) } })
    return () => { alive = false }
  }, [])
  if (!rules) return null

  async function update(patch: Partial<Rules>) {
    const next = { ...rules!, ...patch }
    setRules(next); setFailed(false)
    const n = ++seq.current
    const ok = await saveReminderSettings(next)
    if (n !== seq.current) return
    if (ok) saved.current = next
    else { setRules(saved.current); setFailed(true) }
  }

  const rows: Row[] = [
    { key: 'lessonSoon', title: 'Урок скоро', about: s => t(s.lessonOffsetMin === 30 ? 'За 30 минут до начала' : s.lessonOffsetMin === 120 ? 'За 2 часа до начала' : 'За час до начала') },
    { key: 'hwDue', title: 'ДЗ завтра', about: s => `${t('Накануне срока, если не сдано')} · ${s.hwDueHour}:00` },
    { key: 'hwLate', title: 'ДЗ просрочено', about: s => s.hwLateMax === 1 ? t('На следующий день в 10:00, один раз') : `${t('На следующий день в 10:00, затем раз в сутки')} · ${t('не больше')} ${s.hwLateMax}` },
  ]

  return (
    <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'var(--color-bg-3)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map(row => (
        <div key={row.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, opacity: rules[row.key] ? 1 : 0.55 }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: 'var(--color-text)' }}>{t(row.title)}</div>
              <div style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-3)', marginTop: 2 }}>{row.about(rules)}</div>
            </div>
            <Switch checked={rules[row.key]} label={t(row.title)} onChange={v => { void update({ [row.key]: v }) }} />
          </div>
          {rules[row.key] && row.key === 'lessonSoon' && (
            <Segmented variant="filter" value={String(rules.lessonOffsetMin)} onChange={v => { void update({ lessonOffsetMin: Number(v) as Rules['lessonOffsetMin'] }) }}
              items={[{ id: '30', label: t('30 мин') }, { id: '60', label: t('60 мин') }, { id: '120', label: t('2 часа') }]} />
          )}
          {rules[row.key] && row.key === 'hwDue' && (
            <Segmented variant="filter" value={String(rules.hwDueHour)} onChange={v => { void update({ hwDueHour: Number(v) as Rules['hwDueHour'] }) }}
              items={[{ id: '17', label: '17:00' }, { id: '18', label: '18:00' }, { id: '19', label: '19:00' }]} />
          )}
          {rules[row.key] && row.key === 'hwLate' && (
            <Segmented variant="filter" value={String(rules.hwLateMax)} onChange={v => { void update({ hwLateMax: Number(v) as Rules['hwLateMax'] }) }}
              items={[{ id: '1', label: t('1 раз') }, { id: '3', label: t('до 3 раз') }, { id: '5', label: t('до 5 раз') }]} />
          )}
        </div>
      ))}
      <div style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-3)' }}>
        {t('Время московское. Раньше 07:00 бот не пишет. Ученик подключает бота по ссылке из своей карточки.')}
      </div>
      {failed && <div role="alert" style={{ fontSize: 12, color: 'var(--color-red-text)', whiteSpace: 'pre-line' }}>{t('Не удалось сохранить.\nПопробуйте ещё раз.')}</div>}
    </div>
  )
}
