import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const expectedTopPads = new Map([
  ['MobileHomeworkReview.tsx', '64'],
  ['MobileTeacherGradebook.tsx', '64'],
  ['MobileTeacherParentReports.tsx', '64'],
  ['MobileTeacherDay.tsx', '64'],
  ['MobileTeacherProfile.tsx', '64'],
  ['MobileTeacherReview.tsx', '64'],
  ['MobileTeacherHome.tsx', '72'],
  ['MobileTeacherStudents.tsx', '64'],
  ['MobileTeacherCalendar.tsx', "view === 'month' ? 150 : 198"],
])

for (const [file, expected] of expectedTopPads) {
  const source = read(`src/components/teacher/mobile/${file}`)
  const match = source.match(/\btopPad=\{([^}]+)\}/)
  assert.ok(match, `${file} must declare its reviewed iPhone top zone`)
  assert.equal(match[1].trim(), expected, `${file} top zone changed. Review TOP-01 and update this check with a reason.`)
}

const mobileScreen = read('src/components/MobileScreen.tsx')
assert.match(mobileScreen, /const DEFAULT_TOP_PAD = 96/, 'MobileScreen default top zone must stay explicit')
assert.match(mobileScreen, /const topPadding = \(topZone != null \|\| \(GLASS && glassHeader\)\)[\s\S]*?TOP_ZONE \+ MOBILE_TOP_GAP - 8/, 'Top-zone content must use the shared safe-area baseline')

const profile = read('src/components/teacher/mobile/MobileTeacherProfile.tsx')
assert.match(profile, /<MobileScreen nativeDocumentScroll=\{isIPhone\}[^>]*topPad=\{64\}/, '«Ещё» must remain the top-position reference')
assert.match(read('src/components/teacher/mobile/mobileTeacherMore.css'), /\.teacher-more-card\s*\{/, '«Ещё» first card reference must exist')

const students = read('src/components/teacher/mobile/MobileTeacherStudents.tsx')
const summary = read('src/components/teacher/mobile/iphoneStudentSummary.css')
assert.match(students, /nativeDocumentScroll=\{nativeBar && !openGroup && !searchOpen\}[^>]*topPad=\{64\}/, 'iPhone «Ученики» must share the «Ещё» content baseline')
assert.match(summary, /\.iphone-student-summary\s*\{[^}]*margin:\s*0 0 2px;/, 'First summary block must start at the shared content baseline')

console.log('iPhone top alignment: shared baseline and documented layout exceptions passed')
