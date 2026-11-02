import assert from 'node:assert/strict'
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
console.log('PASS: video prerequisite, seeking, attendance, existing work, unsupported embeds and drafts')

assert.equal(homeworkNeedsVideo({ ...lesson, videoUrl: 'https://drive.google.com/file/d/abcdefghijklmnopqrstuvwxyz/view' }), false, 'Drive embed cannot report progress')
