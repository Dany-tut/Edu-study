import { useT } from '../lib/i18n'
import { watchedSeconds, watchRatio, withCompletion, type VideoWatch } from '../lib/videoProgress'
import './lessonVideoPlayer.css'

/** Coverage is always a fraction of the whole video, independent of lesson credit. */
export default function LessonVideoProgress({ watch, duration = watch.duration }: { watch: VideoWatch; duration?: number }) {
  const t = useT()
  const progress = { ...watch, duration }
  const percent = Math.round(watchRatio(progress) * 100)
  const completed = withCompletion(progress).completed
  return (
    <div className="lesson-video-progress" style={{ color: completed ? 'var(--color-green-text)' : 'var(--color-text-3)' }}>
      <div role="progressbar" aria-label={t('Просмотр урока')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
        className="lesson-video-progress-track">
        <div style={{ height: '100%', width: `${percent}%`, borderRadius: 'inherit', background: completed ? 'var(--grad-green-bar)' : 'var(--grad-purple)', transition: 'width 0.38s ease' }} />
      </div>
      <span>{t('Просмотрено')} {Math.floor(watchedSeconds(watch.ranges) / 60)} {t('мин')} · {percent}%</span>
    </div>
  )
}
