import type { Lesson } from '../data/mockData'
import { watchRatio, withCompletion, type VideoWatch } from './videoProgress'

/** Attendance grants lesson credit without inventing watched video ranges. */
export function lessonStudyProgress(lesson: Pick<Lesson, 'deliveryMode' | 'attended' | 'watch'>, watch: VideoWatch | undefined = lesson.watch) {
  const attended = lesson.deliveryMode !== 'recording' && lesson.attended === true
  return {
    attended,
    completed: attended || (watch ? withCompletion(watch).completed : false),
    percent: attended ? 100 : watch ? Math.round(watchRatio(watch) * 100) : 0,
  }
}
