// Сторож: советы безопасности Supabase (Security Advisor) по боевой базе.
//
// ЗАЧЕМ. Главная защита данных Искры — RLS и права на функции в Postgres.
// Ни tsc, ни сборка, ни CodeQL их не видят: таблица без RLS или представление
// с SECURITY DEFINER открывают чужие данные, а весь CI при этом зелёный.
// Supabase сам умеет находить такие дыры — этот скрипт спрашивает его и
// валит прогон на уровне ERROR.
//
// ПОЧЕМУ ТОЛЬКО ERROR. WARN-ов в базе сейчас ~100, и почти все — сознательные:
// RPC для анонимной ссылки-приглашения, админ-функции с проверкой is_admin
// внутри. Красный прогон на каждом из них приучил бы его игнорировать.
// WARN печатаются сводкой, чтобы рост был виден.
//
// Нужен секрет SUPABASE_ACCESS_TOKEN (личный токен supabase.com/dashboard/
// account/tokens). Без него проверка падает с понятным сообщением — молча
// пропускать её нельзя, иначе «зелёный» ничего не значит.

const ref = process.env.SUPABASE_PROJECT_REF || 'igsdwvwiqnozgwczzycx'
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!token) {
  console.error('❌ Нет SUPABASE_ACCESS_TOKEN. Добавьте его: GitHub → Settings → Secrets and variables → Actions.')
  process.exit(1)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/advisors/security`, {
  headers: { Authorization: `Bearer ${token}` },
})
if (!res.ok) {
  console.error(`❌ Supabase API ответил ${res.status}: ${(await res.text()).slice(0, 300)}`)
  process.exit(1)
}

const { lints = [] } = await res.json()
const byLevel = level => lints.filter(l => l.level === level)
const errors = byLevel('ERROR')

const summary = {}
for (const l of lints) {
  const key = `${l.level} ${l.name}`
  summary[key] = (summary[key] ?? 0) + 1
}
console.log('Supabase Security Advisor:')
for (const [key, count] of Object.entries(summary).sort()) console.log(`  ${key}: ${count}`)

if (errors.length) {
  console.error(`\n❌ Уровень ERROR: ${errors.length}`)
  for (const l of errors) {
    console.error(`  • ${l.title}: ${l.detail}`)
    if (l.remediation) console.error(`    ${l.remediation}`)
  }
  process.exit(1)
}
console.log('\n✅ Ошибок уровня ERROR нет')
