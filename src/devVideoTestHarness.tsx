import { createRoot } from 'react-dom/client'
import LessonVideoPlayer from './components/LessonVideoPlayer'
import { emptyWatch } from './lib/videoProgress'
import type { VideoSource } from './lib/videoSource'

// ?src=file | youtube — какой движок проверяем
const kind = new URLSearchParams(location.search).get('src') || 'file'
const source: VideoSource = kind === 'youtube'
  ? { kind: 'youtube', id: 'dQw4w9WgXcQ' }
  : { kind: 'file', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }

function App() {
  return (
    <div style={{ padding: 0 }}>
      <LessonVideoPlayer
        source={source}
        title="Тестовый урок"
        badge="🇰🇷 Корейский"
        durationLabel="5:00"
        initialWatch={emptyWatch()}
        onPersist={() => {}}
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
