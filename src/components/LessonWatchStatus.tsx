import { watchedSeconds } from '../lib/videoProgress'
import type { Lesson } from '../data/mockData'
import { lessonStudyProgress } from '../lib/lessonStudyProgress'
import { TRACK_STATUS } from '../lib/theme'
import { useT } from '../lib/i18n'

export default function LessonWatchStatus({ lesson }: { lesson: Lesson }) {
  const t = useT()
  const { completed, percent } = lessonStudyProgress(lesson)
  if (!lesson.videoUrl?.trim() || completed) return null

  return (
    <div style={{ fontSize: 12, color: TRACK_STATUS.unviewed.text, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span>{t('Просмотр урока')}: {percent > 0 ? `${Math.floor(watchedSeconds(lesson.watch?.ranges ?? []) / 60)} ${t('мин')} · ${percent}%` : t('Не начат')}</span>
      <div
        role="progressbar" aria-label={t('Просмотр урока')}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        style={{ height: 4, background: TRACK_STATUS.unviewed.bg, borderRadius: 10 }}
      >
        <div style={{ height: '100%', width: `${percent}%`, background: TRACK_STATUS.unviewed.icon, borderRadius: 10 }} />
      </div>
    </div>
  )
}
