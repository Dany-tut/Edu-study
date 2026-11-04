import ScrollFade from './ScrollFade'
import { transcriptTime, type LessonTranscript } from '../lib/localTranscription'
import { btn } from '../lib/pillStyles'

export default function LessonTranscriptPanel({ transcript, time, seek }: {
  transcript: LessonTranscript; time: number; seek?: (seconds: number) => void
}) {
  return <section style={{ padding: 20, borderRadius: 20, background: 'var(--color-bg-2)' }}>
    <h2>Расшифровка урока</h2>
    <ScrollFade maxHeight={350}>
      {transcript.segments.map((s, i) => <p key={i} style={{ padding: 6, borderRadius: 8,
        background: time >= s.start && time < s.end ? 'var(--color-purple-soft)' : undefined }}>
        {seek ? <button style={btn('S', 'secondary')} onClick={() => seek(s.start)}>{transcriptTime(s.start)}</button> :
          <strong>{transcriptTime(s.start)}</strong>} {s.text}
      </p>)}
    </ScrollFade>
  </section>
}
