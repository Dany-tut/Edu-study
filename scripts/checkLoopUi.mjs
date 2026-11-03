import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkLoopUiSource } from './lib/loopUiPolicy.mjs'

// Guard behavior, including the classes of bypass that passed the previous audit.
for (const sample of [
  `<select style={{backgroundImage: 'url(data:image/svg+xml,OLD)'}} />`,
  `<button>{t('Подробнее →')}</button>`,
  `<span onClick={back}>{t('← Назад ко входу')}</span>`,
  `<button>{label} →</button>`,
  `<span>{timeout ? '⏱' : correct ? '✓' : '✕'}</span>`,
  `<span>📊</span>`,
  `<span>🧪</span>`,
  `<span>🇬🇧</span>`,
  `function Feedback(){ const label = correct ? '✓' : '✕'; return <span>{label}</span> }`,
  `<span data-loop-content>📊</span>`,
  `<span>{group.icon}</span>`,
  `<span>{current?.def.icon ?? '📚'}</span>`,
  `<Select options={subjects.map(s => ({label: \`\${s.icon} Химия\`}))} />`,
]) assert(checkLoopUiSource(sample).length > 0, `Expected rejected UI glyph: ${sample}`)
for (const sample of [
  `<button><ArrowRight size={16}/>{t('Подробнее')}</button>`,
  `<LoopActionLabel icon={ArrowRight} label={t('Подробнее →')} />`,
  `<LoopTextIcon icon={Check}>✓</LoopTextIcon>`,
  `<LoopInlineIcon icon={Check}><svg><path d="M1 2"/></svg></LoopInlineIcon>`,
  `<p>Zn + 2HCl → ZnCl₂ + H₂↑</p>`,
  `<p>{t('A → B как C → ?')}</p>`,
  `<span>{item.icon}</span>`, // ReactNode slots remain valid.
  `<TaskliIcon name={v.icon} />`, // A semantic name is not a rendered emoji.
  `<SubjectMark subject={group.subject} fallback={group.icon} />`,
  `<div>{status === '✓' ? <Check/> : null}</div>`,
  `<span data-loop-content>→</span>`,
]) assert.equal(checkLoopUiSource(sample).length, 0, `Expected allowed content: ${sample}`)
assert(checkLoopUiSource(`<span>{s.icon}</span>`, 'src/components/SubjectColorPicker.tsx').length)
assert(checkLoopUiSource(`<span>{current.icon}</span>`, 'src/components/teacher/SubjectPicker.tsx').length)
assert(checkLoopUiSource(`.arrow::after{content:'→'}`, 'fixture.css').length)
const root = fileURLToPath(new URL('../', import.meta.url))
const errors = []
let files = 0
function scan(dir) {
  for (const entry of readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    // Stand-only UI is behind import.meta.env.DEV and has its own visual experiments.
    if (rel === 'src/components/studentTrackStand' || /\/(?:AiReviewConcept|ExampleGroups|StudentWidgetConcepts|StudentWidgetsStand)\.tsx$/.test(rel)) continue
    if (entry.isDirectory()) scan(rel)
    else if (/\.(tsx|css)$/.test(rel)) {
      files++
      for (const issue of checkLoopUiSource(readFileSync(path.join(root, rel), 'utf8'), rel)) errors.push(`${rel}:${issue.line} ${issue.rule}`)
    }
  }
}
scan('src/components'); scan('src/pages')
assert.equal(errors.length, 0, errors.join('\n'))
console.log(`Loop UI policy: ${files} UI files; CSS SVG, subject labels, action arrows and status glyphs checked; mutation fixtures passed.`)
