// ВРЕМЕННЫЙ стенд плеера урока. Удаляется сразу после проверки.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import LessonVideoPlayer from './components/LessonVideoPlayer'
import { parseVideoSource } from './lib/videoSource'
import { emptyWatch, watchRatio, type VideoWatch } from './lib/videoProgress'
import './index.css'

const SOURCE = parseVideoSource('https://www.youtube.com/watch?v=Unzc731iCUY')!

const TIMECODES = [
  { time: '0:00', label: 'Введение', seconds: 0 },
  { time: '3:40', label: 'Основные понятия', seconds: 220 },
  { time: '9:15', label: 'Разбор примеров', seconds: 555 },
  { time: '16:30', label: 'Частые ошибки', seconds: 990 },
]

function Stand() {
  const [watch, setWatch] = useState<VideoWatch>(emptyWatch())
  const [time, setTime] = useState(0)
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <LessonVideoPlayer
        source={SOURCE}
        title="Как говорить"
        badge="🇰🇷 Корейский"
        durationLabel="1:03:43"
        timecodes={TIMECODES}
        initialWatch={watch}
        onPersist={setWatch}
        onTime={t => setTime(t)}
      />
      <p id="stand-state" style={{ marginTop: 12, color: 'var(--color-text)', fontSize: 14 }}>
        t={time.toFixed(1)} · покрытие={Math.round(watchRatio({ ...watch, duration: watch.duration }) * 100)}%
        · отрезков={watch.ranges.length} · засчитано={String(watch.completed)}
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Stand />)
