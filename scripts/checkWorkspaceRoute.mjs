import assert from 'node:assert/strict'
import { isStudentWorkspaceRoute } from '../src/lib/workspaceRoute.ts'
for (const route of ['', '#', '#/', '#/courses', '#/diary', '#/profile', '#/homework', '#/lesson/lesson-1', '#/homework/lesson-1~extra', '#/trainer/work/en/story', '#/trainer?subject=en']) {
  assert.equal(isStudentWorkspaceRoute(route),true,route)
}
for (const route of ['#/teacher', '#/teacher/gradebook', '#/teacher/constructor', '#/teacher/finances', '#/teacher/groups', '#/teacher/profile', '#/teacher/login', '#/landing', '#/join/abc', '#/join-teacher', '#/diagnostic/test', '#/review?set=1', '#/entry', '#/login']) {
  assert.equal(isStudentWorkspaceRoute(route),false,route)
}
assert.equal(isStudentWorkspaceRoute('#/', '/oauth/consent'),false)
console.log('PASS: all student routes hydrate; teacher, public, invitation and consent screens do not start student reads')
