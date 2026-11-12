// «Настройки → Функции»: переключатели функций, которые учителю выдал админ.
// Невыданных функций здесь нет вовсе — учитель о них не узнаёт. Нет ни одной
// выданной — блок не рисуется.
import { useEffect, useState } from 'react'
import Switch from '../Switch'
import { useT } from '../../lib/i18n'
import { FEATURES, useTeacherFeatures, type FeatureKey } from '../../lib/teacherFeatures'
import ReminderSettings from './ReminderSettings'

export default function TeacherFeatureSettings({ feature }: { feature?: FeatureKey } = {}) {
  const t = useT()
  const { loaded, map, load, setOn } = useTeacherFeatures()
  const [failed, setFailed] = useState('')
  useEffect(() => { if (!feature) void load() }, [feature, load])

  const rows = FEATURES.filter(f => f.ready && f.key in map && (!feature || f.key === feature))
  if (!loaded || rows.length === 0) return null

  const content = (
    <>
      {!feature && <>
        <h3 style={{ marginBottom: 6 }}>{t('Функции')}</h3>
        <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 14 }}>
          {t('Включите то, чем пользуетесь. Выключенная функция пропадает с экранов.')}
        </div>
      </>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map(f => (
          <div key={f.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {!feature && <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--color-text)' }}>{t(f.label)}</div>}
                <div style={{ fontSize: 12, lineHeight: 1.35, color: 'var(--color-text-3)', marginTop: 2 }}>{t(f.about)}</div>
                {failed === f.key && <div style={{ fontSize: 11, color: 'var(--color-red-text)', marginTop: 4 }}>{t('Не удалось сохранить. Попробуйте ещё раз.')}</div>}
              </div>
              <Switch
                checked={map[f.key] === true}
                label={t(f.label)}
                onChange={async v => { setFailed(''); if (!(await setOn(f.key, v))) setFailed(f.key) }}
              />
            </div>
            {f.key === 'reminders' && map.reminders === true && <ReminderSettings />}
          </div>
        ))}
      </div>
    </>
  )

  return feature ? content : <div className="profile-card" style={{ marginTop: 20 }}>{content}</div>
}
