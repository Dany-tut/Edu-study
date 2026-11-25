// Собирает из кода курса «Бухгалтерия» документы для сдачи и заведения в базу:
//   docs/courses/accounting/catalog.sql   — каталог курса (НЕ применяется автоматически)
//   docs/courses/accounting/coverage.md   — матрица «тема ТЗ → урок»
//   docs/courses/accounting/sources.md    — реестр источников со статусом проверки
//   docs/courses/accounting/lessons.md    — оглавление, применимость, открытые вопросы
//   docs/courses/accounting/handbook.json — данные справочника (вопрос → урок)
// Запуск: node scripts/accounting/build_docs.mjs
import { build } from 'esbuild'
import { writeFileSync, mkdirSync, statSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

mkdirSync('node_modules/.cache', { recursive: true })
const out = resolve('node_modules/.cache/accDocs.bundle.mjs')
await build({
  stdin: {
    contents: `export { ACC_LESSONS, ACC_COURSE_ID, ACC_COURSE_TITLE } from './src/data/accounting/accountingLessons'\nexport { BLUEPRINT } from './src/data/accounting/blueprint'\nexport { MODULES } from './src/data/accounting/modules'`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'error',
})
const { ACC_LESSONS, ACC_COURSE_ID, ACC_COURSE_TITLE, BLUEPRINT, MODULES } = await import(pathToFileURL(out).href + `?t=${Date.now()}`)
const dir = 'docs/courses/accounting'
mkdirSync(dir, { recursive: true })
const sq = s => `'${String(s).replace(/'/g, "''")}'`
const FILE_RE = /(?<![\w.-])([a-z0-9-]+\.(?:xlsx|zip))\b/g
// Только файлы, которые реально лежат в public/courses/accounting: имена внутри
// архива (vygruzka_2026-01.xlsx) иначе давали «файлы» 03.xlsx и -01.xlsx.
const COURSE_FILES = new Set(readdirSync('public/courses/accounting'))

// ── catalog.sql ──────────────────────────────────────────────────────────────
const modules = [...new Map(ACC_LESSONS.map(x => [x.module.id, x.module])).values()]
const modLabel = m => m.id === 'EXP00' ? `Введение` : `${Number(m.id.slice(3))}. ${m.title}`
const lessonRows = ACC_LESSONS.map(x => {
  const files = [...new Set([x.lesson.practice, ...x.lesson.content.paragraphs.map(p => p.text)].flatMap(t => [...t.matchAll(FILE_RE)].map(m => m[1])).filter(f => COURSE_FILES.has(f)))]
  const materials = files.length ? {
    materials: files.map(f => {
      let size = 0
      try { size = statSync(`public/courses/accounting/${f}`).size } catch { /* файл ещё не собран */ }
      return { id: `acc-${f}`, name: f, path: `/courses/accounting/${f}`, url: `/courses/accounting/${f}`, size, mime: f.endsWith('.zip') ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    }),
  } : {}
  return `    (${x.index}, ${modules.findIndex(m => m.id === x.module.id) + 1}, ${sq(x.lesson.title)}, ${sq(JSON.stringify(materials))})`
})
writeFileSync(`${dir}/catalog.sql`, `-- ─────────────────────────────────────────────────────────────────────────────
-- Каталог курса «${ACC_COURSE_TITLE}» (${ACC_COURSE_ID}).
-- СГЕНЕРИРОВАНО scripts/accounting/build_docs.mjs — не править руками.
--
-- НЕ ПРИМЕНЯЕТСЯ АВТОМАТИЧЕСКИ И НЕ ЛЕЖИТ В supabase/migrations: заводить курс в
-- рабочую базу можно только после согласования Дани. Курс создаётся в статусе
-- draft (ученики его не видят), владелец — как у AP-химии и биологии.
--
-- Идемпотентно: повторный прогон ничего не создаёт заново и не трогает уже
-- существующие строки (в т. ч. lessons.content, отредактированный учителем).
-- Нумерация уроков с НУЛЯ: short_id = '${ACC_COURSE_ID}-<lesson_number>'.
-- Конспекты и домашки лежат в коде (src/data/accounting) и подставляются, пока
-- lessons.content пуст. Файлы уроков — в public/courses/accounting (раздаются
-- самим приложением); для мобильных сборок проверить доступность пути.
-- Откат: delete from lessons where short_id like '${ACC_COURSE_ID}-%';
--        delete from course_modules where course_id = (select id from courses where short_id = '${ACC_COURSE_ID}');
--        delete from courses where short_id = '${ACC_COURSE_ID}';
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_course_id uuid;
  v_owner uuid;
  v_mod uuid[] := array[]::uuid[];
  r record;
  v_id uuid;
begin
  select created_by into v_owner from courses where short_id = 'apchem-ru' limit 1;

  insert into courses (short_id, kind, title, subject, level, description, status, color, bg, created_by)
  values (${sq(ACC_COURSE_ID)}, 'course', ${sq(ACC_COURSE_TITLE)}, 'Бухгалтерия', 'Практикующий бухгалтер',
    ${sq(`Практический курс для бухгалтера, который ведёт несколько организаций: Excel и Power Query, сверки, 1С, самозанятые, зарплата и численность, налоги, закрытие месяца, ИИ, безопасность и переход на ФСБУ 2027. ${ACC_LESSONS.length} уроков, справочник по рабочим вопросам, учебные файлы.`)},
    'draft', '#2E6FD8', '#E3EDFB', v_owner)
  on conflict (short_id) do nothing;

  select id into v_course_id from courses where short_id = ${sq(ACC_COURSE_ID)};

  for r in
    select * from (values
${modules.map((m, i) => `      (${sq(modLabel(m))}, ${i})`).join(',\n')}
    ) as t(label, pos) order by pos
  loop
    select id into v_id from course_modules where course_id = v_course_id and label = r.label limit 1;
    if v_id is null then
      insert into course_modules (course_id, label, position) values (v_course_id, r.label, r.pos) returning id into v_id;
    end if;
    v_mod := v_mod || v_id;
  end loop;

  insert into lessons (course_id, module_id, short_id, title, lesson_number, position, kind, shape, materials)
  select v_course_id, v_mod[d.block], ${sq(ACC_COURSE_ID + '-')} || d.n, d.title, d.n, d.n, 'lesson',
         case when d.n in (0, ${ACC_LESSONS.length - 1}) then 'diamond' else 'circle' end, d.materials::jsonb
  from (values
${lessonRows.join(',\n')}
  ) as d(n, block, title, materials)
  where not exists (select 1 from lessons l where l.short_id = ${sq(ACC_COURSE_ID + '-')} || d.n);
end $$;
`)

// ── coverage.md ──────────────────────────────────────────────────────────────
const byTopic = new Map()
for (const x of ACC_LESSONS) for (const t of x.lesson.topics) {
  const k = `${x.module.id}|${t}`
  byTopic.set(k, [...(byTopic.get(k) ?? []), `№${x.index + 1} «${x.lesson.title}»`])
}
let need = 0, got = 0
const cov = []
for (const b of BLUEPRINT) {
  cov.push(`\n## ${b.id}. ${b.title}\n\n| Тема ТЗ | Урок(и) |\n|---|---|`)
  for (const t of b.topics) {
    need++
    const ls = byTopic.get(`${b.id}|${t}`)
    if (ls) got++
    cov.push(`| ${t} | ${ls ? ls.join('; ') : '**НЕ ПОКРЫТО**'} |`)
  }
}
writeFileSync(`${dir}/coverage.md`, `# Матрица покрытия: темы ТЗ → уроки\n\nСгенерировано из кода курса. Покрыто ${got} из ${need} обязательных тем в ${BLUEPRINT.length} модулях; уроков всего ${ACC_LESSONS.length}.\n${cov.join('\n')}\n`)

// ── sources.md ───────────────────────────────────────────────────────────────
const used = new Map()
for (const x of ACC_LESSONS) for (const s of x.lesson.sources) used.set(`${x.module.id}|${s}`, [...(used.get(`${x.module.id}|${s}`) ?? []), x.index + 1])
const srcRows = MODULES.flatMap(m => m.sources.map(s => `| ${m.id} | ${s.title.replace(/\|/g, '/')} | ${s.publisher} | ${s.kind} | ${s.status} | ${s.checked} | ${s.url} | ${(used.get(`${m.id}|${s.id}`) ?? []).join(', ')} |${s.note ? ` ${s.note.replace(/\|/g, '/')}` : ''}`))
const stat = MODULES.flatMap(m => m.sources).reduce((a, s) => ({ ...a, [s.status]: (a[s.status] ?? 0) + 1 }), {})
writeFileSync(`${dir}/sources.md`, `# Реестр источников курса\n\nВсего записей: ${srcRows.length} (${Object.entries(stat).map(([k, v]) => `${k}: ${v}`).join(', ')}). opened — страница открыта и сверена автором урока; unreachable — не открылась, утверждение смягчено или вынесено в открытые вопросы.\n\n| Модуль | Источник | Издатель | Вид | Статус | Проверено | URL | Уроки №, примечание |\n|---|---|---|---|---|---|---|---|\n${srcRows.join('\n')}\n`)

// ── lessons.md ───────────────────────────────────────────────────────────────
const lrows = ACC_LESSONS.map(x => `| ${x.index + 1} | ${x.shortId} | ${x.module.id} | ${x.lesson.title.replace(/\|/g, '/')} | ${x.lesson.minutes} | ${x.lesson.content.quiz.length} | ${x.lesson.content.paragraphs.filter(p => p.image).length} | ${(x.lesson.origin ?? []).join(', ')} | ${(x.lesson.applies ?? '').replace(/\|/g, '/')} |`)
const open = ACC_LESSONS.flatMap(x => (x.lesson.open ?? []).map(o => `- №${x.index + 1} «${x.lesson.title}»: ${o}`))
writeFileSync(`${dir}/lessons.md`, `# Оглавление курса\n\n| № | short_id | Модуль | Урок | Мин | Вопросов | Схем | Исходные уроки | Применимость |\n|---|---|---|---|---|---|---|---|---|\n${lrows.join('\n')}\n\n## Открытые вопросы из уроков (${open.length})\n\n${open.join('\n')}\n`)

// ── handbook.json ────────────────────────────────────────────────────────────
const hb = ACC_LESSONS.filter(x => x.module.id !== 'EXP00').map(x => ({
  n: x.index + 1, id: x.shortId, module: x.module.title, title: x.lesson.title, queries: x.lesson.queries, topics: x.lesson.topics,
  software: x.lesson.software, applies: x.lesson.applies ?? '',
  formulas: [...new Set(x.lesson.content.paragraphs.flatMap(p => p.image ? [] : [...p.text.matchAll(/`([^`\n]+)`/g)].map(m => m[1])))].slice(0, 12),
  steps: x.lesson.content.paragraphs.filter(p => !p.image && /\*\*Шаг 1\.?\*\*/.test(p.text)).map(p => p.text).slice(0, 2),
  sources: x.lesson.sources.map(id => x.module.sources.find(s => s.id === id)).filter(Boolean).map(s => ({ title: s.title, url: s.url, publisher: s.publisher, status: s.status })),
}))
writeFileSync(`${dir}/handbook.json`, JSON.stringify(hb))
// ── modules.md — сводка по модулям для отчёта ─────────────────────────────────
const mrows = MODULES.map(m => {
  const ls = ACC_LESSONS.filter(x => x.module.id === m.id)
  const bp = BLUEPRINT.find(b => b.id === m.id)
  const cov = bp ? bp.topics.filter(t => ls.some(x => x.lesson.topics.includes(t))).length : 0
  const st = m.sources.reduce((a, s) => ({ ...a, [s.status]: (a[s.status] ?? 0) + 1 }), {})
  const q = ls.reduce((a, x) => a + x.lesson.content.quiz.length, 0)
  const f = ls.reduce((a, x) => a + x.lesson.content.paragraphs.filter(p => p.image).length, 0)
  const o = ls.reduce((a, x) => a + (x.lesson.open?.length ?? 0), 0)
  const orig = [...new Set(ls.flatMap(x => x.lesson.origin))].join(', ')
  return `| ${m.id} | ${m.title} | ${ls.length} | ${q} | ${f} | ${bp ? `${cov}/${bp.topics.length}` : '—'} | ${st.opened ?? 0} / ${st['not-checked'] ?? 0} / ${st.unreachable ?? 0} | ${o} | ${orig || '—'} |`
})
writeFileSync(`${dir}/modules.md`, `# Сводка по модулям\n\n| Модуль | Название | Уроков | Вопросов | Схем | Темы ТЗ | Источники: сверено / не открыто / недоступно | Открытых вопросов | Исходные уроки пособия |\n|---|---|---|---|---|---|---|---|---|\n${mrows.join('\n')}\n`)
console.log(`Уроков ${ACC_LESSONS.length}; темы ${got}/${need}; источников ${srcRows.length}; открытых вопросов ${open.length}`)
