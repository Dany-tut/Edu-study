// Атлас КИМ → миграция-сид таблицы kim_atlas.
//
//   node scripts/buildKimAtlas.mjs [путь к ChemBio_KB]
//
// Берёт atlas/*_2027.json из базы знаний ХимБио (там у каждой цифры цитата
// ФИПИ) и правила части 2 из supabase/atlas/part2_rules.json, сверяет одно с
// другим и пишет supabase/migrations/0104_kim_atlas_seed.sql.
//
// ЧТО СВЕРЯЕТСЯ (и роняет сборку). «Ничего не добавляя» — не на честном слове:
//   • текст каждого элемента, ворот, вычета и заметки учителю — дословный
//     фрагмент criteria / scoring / notes атласа этого номера;
//   • высшая ступень правила = max_points номера из атласа;
//   • у каждого номера части 2 с критериями есть правило (или явный null).
// Атлас обновили — перезапусти скрипт и закоммить новую миграцию.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const KB = process.argv[2] ?? '/Users/dany/Cursor/ChemBio_KB'
const ROOT = new URL('..', import.meta.url).pathname
const rules = JSON.parse(readFileSync(join(ROOT, 'supabase/atlas/part2_rules.json'), 'utf8')).items
const OUT = join(ROOT, 'supabase/migrations/0104_kim_atlas_seed.sql')

const norm = s => String(s ?? '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
const errors = []
const rows = []

const files = readdirSync(join(KB, 'atlas')).filter(f => /^[a-z]+_[a-z]+_\d{4}\.json$/.test(f)).sort()
for (const f of files) {
  const a = JSON.parse(readFileSync(join(KB, 'atlas', f), 'utf8'))
  const exam = `${a.exam}_${a.subject}`
  const examRules = rules[exam] ?? {}
  for (const it of a.items) {
    const r = examRules[String(it.n)]
    const where = `${exam} №${it.n}`
    const haystack = norm([it.scoring, it.notes, ...(it.criteria ?? []).map(c => c.text)].join(' \n '))
    const verbatim = (what, s) => { if (!haystack.includes(norm(s))) errors.push(`${where}: ${what} не дословно из атласа: «${s}»`) }

    if (it.part === 2 && (it.criteria ?? []).length && r === undefined) errors.push(`${where}: нет правила в part2_rules.json`)
    const rule = r?.rule ?? null
    if (r) {
      for (const e of r.elements ?? []) verbatim(`элемент ${e.id}`, e.text)
      for (const g of r.gates ?? []) if (g.from) verbatim('ворота', g.from)
      for (const d of r.deductions ?? []) verbatim(`вычет ${d.id}`, d.text)
      for (const t of r.teacher_notes ?? []) verbatim('заметка', t)
      if (rule) {
        const top = rule.kind === 'sum'
          ? (r.elements ?? []).reduce((s, e) => s + (e.points ?? 1), 0)
          : rule.kind === 'ladder'
            ? Math.max(...rule.steps.map(s => s.points))
            : rule.groups.reduce((s, g) => s + Math.max(...g.steps.map(x => x.points)), 0)
        if (top !== it.max_points) errors.push(`${where}: высший балл правила ${top} ≠ max_points ${it.max_points}`)
        if (rule.kind !== 'ladder' && !(r.elements ?? []).length) errors.push(`${where}: у правила ${rule.kind} нет элементов`)
        if (rule.kind === 'ladder' && !(r.elements ?? []).length && !r.element_count) errors.push(`${where}: лестнице нужно element_count`)
      }
    }

    rows.push({
      exam, year: a.year, n: it.n, part: it.part, max_points: it.max_points,
      answer_type: it.answer_type ?? null, scoring_text: it.scoring ?? null,
      rule, elements: r?.elements ?? null, element_count: r?.element_count ?? (r?.elements?.length ?? null),
      gates: r?.gates ?? [], deductions: r?.deductions ?? [], teacher_notes: r?.teacher_notes ?? [],
      source_ref: `atlas/${f}#n=${it.n}`,
    })
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  console.error(`\n✗ ${errors.length} расхождений — миграция не записана`)
  process.exit(1)
}

const q = v => v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`
const j = v => v === null || v === undefined ? 'null' : `${q(JSON.stringify(v))}::jsonb`
const values = rows.map(r => `  (${[
  q(r.exam), r.year, r.n, r.part, r.max_points, q(r.answer_type), q(r.scoring_text),
  j(r.rule), j(r.elements), r.element_count ?? 'null', j(r.gates), j(r.deductions), j(r.teacher_notes), q(r.source_ref),
].join(', ')})`).join(',\n')

writeFileSync(OUT, `-- Сид атласа КИМ. СГЕНЕРИРОВАНО scripts/buildKimAtlas.mjs — руками не править.
-- Источник: ChemBio_KB/atlas/*_2027.json (каждая цифра с цитатой ФИПИ) +
-- supabase/atlas/part2_rules.json (вид счёта части 2, тексты элементов сверены
-- с атласом дословно). Повторный прогон перезаписывает строки по ключу.

insert into public.kim_atlas
  (exam, year, n, part, max_points, answer_type, scoring_text, rule, elements, element_count, gates, deductions, teacher_notes, source_ref)
values
${values}
on conflict (exam, year, n) do update set
  part = excluded.part, max_points = excluded.max_points, answer_type = excluded.answer_type,
  scoring_text = excluded.scoring_text, rule = excluded.rule, elements = excluded.elements,
  element_count = excluded.element_count, gates = excluded.gates, deductions = excluded.deductions,
  teacher_notes = excluded.teacher_notes, source_ref = excluded.source_ref, updated_at = now();
`)
const graded = rows.filter(r => r.rule).length
console.log(`✓ ${rows.length} номеров из ${files.length} атласов, с правилом части 2: ${graded} → ${OUT.replace(ROOT, '')}`)
