// Админка → «Функции»: кому из учителей доступна каждая автоматизация.
// «Всем» — выдано всем учителям сразу; иначе — по одному. Учитель без доступа
// не видит ни инструмента, ни настройки. Если учитель выключил выданную
// функцию сам, рядом с его именем стоит «выкл.».
// Общие рубильники расхода на ИИ (Обзор → «Расход на ИИ») по-прежнему главнее.
import { useEffect, useMemo, useState } from 'react'
import Switch from '../Switch'
import { supabase } from '../../lib/supabase'
import { useT } from '../../lib/i18n'
import { FEATURES, useTeacherFeatures, type FeatureKey } from '../../lib/teacherFeatures'
import { Alert } from '../Alert'

type Teacher = { id: string; name: string; role: string }
type Row = { feature: FeatureKey; teacher_id: string | null; kind: 'grant' | 'off' }

export default function AdminFeatureAccess({ teachers }: { teachers: Teacher[] }) {
  const t = useT()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  async function load() {
    const { data, error } = await supabase.rpc('admin_feature_grants')
    if (error) { setError(t('Не удалось загрузить доступы. Миграция функций применена?')); setRows([]); return }
    setError(''); setRows((data ?? []) as Row[])
  }
  useEffect(() => { void load() }, [])

  const list = useMemo(() => teachers.filter(x => x.role !== 'admin').sort((a, b) => a.name.localeCompare(b.name, 'ru')), [teachers])

  async function set(feature: FeatureKey, teacher: string | null, on: boolean) {
    const key = feature + ':' + (teacher ?? '*')
    setBusy(key)
    const { error } = await supabase.rpc('admin_set_feature_grant', { p_feature: feature, p_teacher: teacher, p_on: on })
    setBusy('')
    if (error) { setError(t('Не удалось сохранить. Попробуйте ещё раз.')); return }
    await load()
    // Свой экран админа тоже перечитывает доступы.
    void useTeacherFeatures.getState().load()
  }

  if (!rows) return <div style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{t('Загружаем…')}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--color-text-3)' }}>
        {t('Учитель видит функцию, только если вы её выдали — ему одному или всем. Выданную функцию учитель может выключить у себя в настройках.')}
      </div>
      {error && <Alert tone="danger" text={error} />}
      {FEATURES.map(f => {
        const all = rows.some(r => r.kind === 'grant' && r.feature === f.key && r.teacher_id === null)
        const one = (id: string) => rows.some(r => r.kind === 'grant' && r.feature === f.key && r.teacher_id === id)
        const off = (id: string) => rows.some(r => r.kind === 'off' && r.feature === f.key && r.teacher_id === id)
        return (
          <div key={f.key} style={{ background: 'var(--color-bg-2)', border: '1px solid var(--color-border-medium)', borderRadius: 20, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                  {t(f.label)}
                  {!f.ready && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-bg-3)', color: 'var(--color-text-3)' }}>{t('в разработке')}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{t(f.about)}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--color-text-2)' }}>{t('Всем')}</span>
              <Switch checked={all} disabled={busy !== ''} label={t('Всем')} onChange={v => void set(f.key, null, v)} />
            </div>
            {!all && list.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {list.map(x => {
                  const on = one(x.id)
                  return (
                    <button key={x.id} type="button" data-hover="layer" disabled={busy !== ''}
                      onClick={() => void set(f.key, x.id, !on)}
                      aria-pressed={on}
                      style={{
                        fontSize: 12, fontWeight: 650, padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                        border: '1px solid ' + (on ? 'var(--color-purple)' : 'var(--color-border-medium)'),
                        background: on ? 'var(--color-purple-soft)' : 'transparent',
                        color: on ? 'var(--color-purple-text)' : 'var(--color-text-2)',
                      }}>
                      {x.name}{on && off(x.id) ? ' · ' + t('выкл.') : ''}
                    </button>
                  )
                })}
              </div>
            )}
            {all && list.some(x => off(x.id)) && (
              <div style={{ fontSize: 11.5, color: 'var(--color-text-3)', marginTop: 10 }}>
                {t('Выключили у себя:')} {list.filter(x => off(x.id)).map(x => x.name).join(', ')}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
