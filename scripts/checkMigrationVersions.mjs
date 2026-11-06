// Сторож: у двух миграций не может быть одного номера.
//
// Supabase хранит номер как ключ в supabase_migrations.schema_migrations:
// второй файл с тем же номером `db push` и локальный стенд не применят.
// 05.11.2026 так совпали transcript_terms с mfa_backup_codes и
// admin_analytics_real_traffic с mfa_enforce. Номер для новой миграции
// берите после `ls supabase/migrations`: соседние чаты занимают номера.
import { readdirSync } from 'node:fs'

const dir = new URL('../supabase/migrations/', import.meta.url)
// Старые пары 0102_* — до перехода на номера-даты; в проде они уже разведены.
const KNOWN = new Set(['0102'])

const byVersion = new Map()
for (const file of readdirSync(dir).filter(f => f.endsWith('.sql'))) {
  const version = file.split('_')[0]
  byVersion.set(version, [...(byVersion.get(version) ?? []), file])
}
const clashes = [...byVersion].filter(([v, files]) => files.length > 1 && !KNOWN.has(v))
if (clashes.length) {
  console.error('Миграции с одинаковым номером:')
  for (const [, files] of clashes) console.error('  ' + files.join('  ↔  '))
  console.error('Переименуйте новую: номер — время по UTC, YYYYMMDDHHMMSS, больше последнего в папке.')
  process.exit(1)
}
console.log(`check:migrations — ${byVersion.size} номеров, повторов нет`)
