// Сводка «где ИИ расходится с вами»: поправки учителя к предоценке ДЗ за 90 дней.
// Матрица — общая QuadrantGrid из CalibrationMatrix; ниже — линии КИМ, где
// поправок больше всего. Эти же поправки ИИ видит примерами при следующих
// проверках (hw-grade-run → pickCorrections).

import { useEffect, useState } from 'react'
import { fetchAiAgreement, type AiAgreement } from '../../lib/aiBatch'
import { useT } from '../../lib/i18n'
import { Alert } from '../Alert'
import { QuadrantGrid } from './CalibrationMatrix'
import { textFadeStyle } from '../../lib/textFades'

function lineLabel(kimN: number | null, t: (s: string) => string) {
  return kimN == null ? t('Свои задания') : `${t('Линия')} ${kimN}`
}

export default function AiAgreementPanel({ load = fetchAiAgreement }: { load?: () => Promise<AiAgreement> }) {
  const t = useT()
  const [data, setData] = useState<AiAgreement | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    load().then(d => { if (live) setData(d) }).catch(() => { if (live) setFailed(true) })
    return () => { live = false }
  }, [load])

  if (failed) return <Alert tone="danger" stacked title={t('Сводка не загрузилась')} text={t('Проверьте связь и откройте окно ещё раз.')} />
  if (!data) return <div aria-busy="true" style={{ minHeight: 168, fontSize: 13, color: 'var(--color-text-3)' }}>{t('Загружаем…')}</div>

  const total = data.agreed + data.over + data.under + data.commentOnly
  if (!total) {
    return <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-2)' }}>{t('Пока нечего сравнивать: сводка появится, когда вы утвердите или поправите несколько предоценок.')}</p>
  }
  const maxLine = Math.max(1, ...data.lines.map(l => l.total))

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <QuadrantGrid total={total} tiles={[
        { key: 'agreed', label: 'Совпало', hint: 'утвердили как есть', color: 'var(--color-green-text)', count: data.agreed },
        { key: 'over', label: 'ИИ завысил', hint: 'вы поставили ниже', color: 'var(--color-red-text)', count: data.over },
        { key: 'under', label: 'ИИ занизил', hint: 'вы поставили выше', color: 'var(--color-yellow-text)', count: data.under },
        { key: 'comment', label: 'Замечание', hint: 'балл тот же, комментарий свой', color: 'var(--color-purple-text)', count: data.commentOnly },
      ]} />
      {data.lines.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8 }}>{t('Где чаще всего поправляете')}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.lines.slice(0, 6).map(l => (
              <div key={String(l.kimN)} style={{ display: 'grid', gridTemplateColumns: 'minmax(84px, auto) 1fr auto', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', ...textFadeStyle }}>{lineLabel(l.kimN, t)}</span>
                <span aria-hidden="true" style={{ height: 8, borderRadius: 4, background: 'var(--color-border-soft)', overflow: 'hidden', display: 'flex' }}>
                  <span style={{ width: `${(100 * l.over) / maxLine}%`, background: 'var(--color-red-text)' }} />
                  <span style={{ width: `${(100 * l.under) / maxLine}%`, background: 'var(--color-yellow-text)' }} />
                  <span style={{ width: `${(100 * l.comment) / maxLine}%`, background: 'var(--color-purple-text)', opacity: 0.6 }} />
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>
                  {l.over > l.under ? t('завышает') : l.under > l.over ? t('занижает') : t('замечания')} · {l.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-3)' }}>
        {t('За 90 дней. Последние поправки по тому же заданию или линии ИИ учитывает при следующих проверках — без имён учеников. По линии, где вы дважды поправили балл, работы не применяются пакетом.')}
      </p>
    </div>
  )
}
