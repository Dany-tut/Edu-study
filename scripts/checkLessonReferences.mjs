import assert from 'node:assert/strict'
import {lessonShortIdMap, newEditorLessonId} from '../src/lib/lessonReferences'
// duplicate_course creates random refs; changing these or deleting/recreating
// their rows strands lesson_progress, schedule links and shared lesson URLs.
const persisted=[{id:'195705e2b7e6',persistedShortId:'195705e2b7e6'},{id:'course-7',persistedShortId:'course-7'}]
const expected={'195705e2b7e6':'195705e2b7e6','course-7':'course-7','new-local':'course-8'}
assert.deepEqual(lessonShortIdMap('course',[...persisted,{id:'new-local'}]),expected)
assert.deepEqual(lessonShortIdMap('course',[{id:'new-local'},...persisted.toReversed()]),expected)
assert.deepEqual(lessonShortIdMap('course',[{id:'local-draft',persistedShortId:'random-db-ref'}]),{'local-draft':'random-db-ref'})
assert.deepEqual(lessonShortIdMap('course',[{id:'course-3'},{id:'new'}]),{'course-3':'course-3',new:'course-4'})
console.log('PASS: copied lesson refs, progress identity, reorder and new-lesson allocation')

// Replacing the highest numbered lesson must not reuse its progress reference.
// Two tabs starting from the same course must also allocate independent refs.
const a = { id: newEditorLessonId() }, b = { id: newEditorLessonId() }
const first = lessonShortIdMap('course', [a])[a.id]
assert.notEqual(first, 'course-0')
assert.notEqual(first, lessonShortIdMap('course', [b])[b.id])
assert.equal(lessonShortIdMap('course', [b, a])[a.id], first)
assert.equal(lessonShortIdMap('course', [{ id: first }])[first], first)
