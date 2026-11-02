import React from 'react'
import type { HomeworkLevel } from '../data/lessonContent'
import { taskTypeDef } from '../data/taskTypes'

export function HomeworkFacts({ level, t }: { level: HomeworkLevel; t: (value: string) => string }) {
  const types = level.taskTypes ?? level.questions?.map(question => question.type) ?? (level.teacherTask ? ['extended'] : [])
  const formats = [...new Set(types.map(type => t(taskTypeDef(type).label)))]
  const minutes = level.estimatedMinutes
  return <>
    {level.dueDate?.trim() && <InfoRow label={t('Дедлайн')} value={level.dueDate.trim()} />}
    {minutes != null && Number.isFinite(minutes) && minutes > 0 && <InfoRow label={t('Время')} value={`${minutes} ${t('мин')}`} />}
    {formats.length > 0 && <InfoRow label={t('Формат')} value={formats.join(', ')} />}
  </>
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ gap: 12 }}>
      <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
