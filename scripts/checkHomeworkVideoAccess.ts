import assert from 'node:assert/strict'
import { watchRatio, withCompletion } from '../src/lib/videoProgress'
import { homeworkNeedsVideo } from '../src/lib/homeworkAccess'
import type { Lesson } from '../src/data/mockData'
const storage = new Map<string, string>()
Object.assign(globalThis, { localStorage: { getItem: (key: string) => storage.get(key) ?? null } })
const lesson = { id: 'check', status: 'current', videoUrl: 'https://example.com/lesson.mp4', deliveryMode: 'recording' } as Lesson
assert.equal(homeworkNeedsVideo(lesson), true)
assert.equal(homeworkNeedsVideo({ ...lesson, watch: { position: 100, duration: 100, ranges: [], completed: false, updatedAt: '' } }), true, 'Seeking is not completion')
assert.equal(homeworkNeedsVideo({ ...lesson, watch: { position: 90, duration: 100, ranges: [[0,90]], completed: true, updatedAt: '' } }), false)
assert.equal(homeworkNeedsVideo({ ...lesson, deliveryMode: 'online', attended: true }), false)
assert.equal(homeworkNeedsVideo({ ...lesson, attended: true }), true, 'Recording-only requires video')
for (const status of ['submitted','completed','returned'] as const) assert.equal(homeworkNeedsVideo({ ...lesson, status }), false)
assert.equal(homeworkNeedsVideo({ ...lesson, videoUrl: 'https://example.com/embed' }), false)
storage.set('student-dashboard:homework:check', JSON.stringify({ basicAnswers: {} }))
assert.equal(homeworkNeedsVideo(lesson), true)
storage.set('student-dashboard:homework:check', JSON.stringify({ basicAnswers: { q1: 'answer' } }))
assert.equal(homeworkNeedsVideo(lesson), false)
storage.clear()

assert.equal(homeworkNeedsVideo({ ...lesson, videoUrl: 'https://drive.google.com/file/d/abcdefghijklmnopqrstuvwxyz/view' }), true, 'Native Drive playback must count toward the prerequisite')

for (const seconds of [0, 69.9, 70, 90, 100]) {
  const watch = { position: 100, duration: 100, ranges: [[0, seconds]] as [number, number][], completed: false, updatedAt: '' }
  assert.equal(withCompletion(watch).completed, seconds >= 70)
  assert.equal(watchRatio(watch), seconds / 100, 'Completion threshold must not rescale watched percentage')
  for (const videoUrl of [lesson.videoUrl, 'https://drive.google.com/file/d/abcdefghijklmnopqrstuvwxyz/view']) {
    assert.equal(homeworkNeedsVideo({ ...lesson, videoUrl, watch }), seconds < 70, 'Saved coverage unlocks homework without another playback tick')
  }
}
assert.equal(withCompletion({ position: 0, duration: 100, ranges: [], completed: true, updatedAt: '' }).completed, true, 'Previously earned completion remains valid')
console.log('PASS: 70% boundary, full-duration percentage, saved coverage, Drive, seeking, attendance and drafts')

const { homeworkTimeLocked } = await import('../src/lib/homeworkAccess')
const { buildStudentDiary } = await import('../src/lib/studentDiary')
const scheduled = { ...lesson, deliveryMode: 'live', scheduledDate: '2026-11-02', scheduledTime: '18:00', homework: { hwTasks: [{ id: 'q' }] } } as Lesson
for (const time of ['2026-11-02T14:59:59Z', '2026-11-02T15:00:00Z', '2026-11-02T16:29:59Z']) {
  const now = new Date(time)
  assert.equal(homeworkTimeLocked(scheduled, now), true)
  assert.equal(homeworkTimeLocked({ ...scheduled, attended: true, result: { draft: true } } as Lesson, now), true, 'Attendance and drafts do not release homework early')
  assert.equal(buildStudentDiary([{ id: 'course', modules: [{ id: 1, lessons: [scheduled] }] }] as any, new Map(), {}, now).length, 0, 'Future homework is absent from actions and overdue badges')
}
assert.equal(homeworkTimeLocked(scheduled, new Date('2026-11-02T16:30:00Z')), false, 'Opens at 19:30 Moscow')
assert.equal(homeworkTimeLocked({ ...scheduled, deliveryMode: 'recording' }, new Date('2026-11-02T15:00:00Z')), false)
console.log('PASS: scheduled homework release before start, during lesson, exact 90-minute boundary and diary exclusion')
