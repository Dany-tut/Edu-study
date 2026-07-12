// Teacher view of a student's confidence calibration — the 2×2 metacognition matrix.
// Embed in the student dashboard / diagnostic report: <CalibrationMatrix owner={{anonName}} subject="biology" />

import { useEffect, useState } from 'react'
import { fetchCalibration, type CalibrationCounts } from '../../data/confidence'
import { useT } from '../../lib/i18n'

const QUADRANTS: { key: keyof CalibrationCounts; label: string; hint: string; color: string }[] = [
  { key: 'confidentCorrect', label: 'Уверен + верно',   hint: 'здоровое знание',        color: 'var(--color-green-accent)' },
  { key: 'confidentWrong',   label: 'Уверен + неверно', hint: 'опасная зона',           color: 'var(--color-red-text)' },
  { key: 'unsureCorrect',    label: 'Не уверен + верно', hint: 'недооценивает себя',    color: '#f59e0b' },
  { key: 'unsureWrong',      label: 'Не уверен + неверно', hint: 'честный пробел',      color: 'var(--color-text-3)' },
]

export default function CalibrationMatrix({ owner, subject }: {
  owner: { studentId?: string; anonName?: string }
  subject?: string
}) {
  const t = useT()
  const [c, setC] = useState<CalibrationCounts | null>(null)
  useEffect(() => { fetchCalibration(owner, subject).then(setC) }, [owner.studentId, owner.anonName, subject])

  if (!c) return null
  if (c.total === 0) return (
    <div style={{ fontSize: 12, color: 'var(--color-muted)', padding: '8px 0' }}>{t('Калибровка уверенности не собрана (тест без опроса уверенности).')}</div>
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t('Калибровка уверенности')}</span>
        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{t('точность самооценки:')} <b style={{ color: c.calibration >= 60 ? 'var(--color-green-text)' : 'var(--color-red-text)' }}>{c.calibration}%</b></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {QUADRANTS.map(q => {
          const n = c[q.key] as number
          const pct = c.total ? Math.round((n / c.total) * 100) : 0
          return (
            <div key={q.key} style={{ padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${q.color}55`, background: `${q.color}12` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{t(q.label)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: q.color }}>{n}</span>
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--color-text-3)', marginTop: 2 }}>{t(q.hint)} · {pct}%</div>
            </div>
          )
        })}
      </div>
      {c.confidentWrong > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-red-text)', lineHeight: 1.5 }}>
          ⚠ {c.confidentWrong} {t('ответ(ов) «уверен, но неверно» — стоит разобрать: ученик уверен в неправильном.')}
        </div>
      )}
    </div>
  )
}
