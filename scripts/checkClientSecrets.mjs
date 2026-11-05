// Сторож: в браузерную сборку не попадают серверные ключи.
//
// ЗАЧЕМ. Всё, что лежит в dist/, скачивает любой посетитель. Достаточно одной
// переменной VITE_* с серверным ключом или скопированного в код токена — и
// ключ service_role, обходящий RLS, становится публичным. Сборка при этом
// зелёная, а GitHub-сканер секретов видит только репозиторий, не dist.
//
// ЧТО ПРОВЕРЯЕМ.
//   1. Переменные окружения сборки: Vite вшивает в клиент всё с префиксом
//      VITE_. Имя с SECRET / SERVICE_ROLE / PRIVATE / PASSWORD / TOKEN —
//      почти наверняка ошибка.
//   2. Каждый файл dist/: JWT с ролью service_role или supabase_admin,
//      секретные ключи Supabase (sb_secret_), ключи Anthropic, OpenAI,
//      GitHub, AWS, Stripe live и приватные ключи PEM.
//
// Публичные ключи (publishable / anon JWT) — норма и не ловятся.
//
// Запуск: node scripts/checkClientSecrets.mjs [dist]
//         node scripts/checkClientSecrets.mjs --self-test

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const PATTERNS = [
  ['секретный ключ Supabase', /\bsb_secret_[A-Za-z0-9_-]{16,}/g],
  ['ключ Anthropic', /\bsk-ant-[A-Za-z0-9_-]{20,}/g],
  ['ключ OpenAI', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/g],
  ['токен GitHub', /\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/g],
  ['ключ AWS', /\bAKIA[0-9A-Z]{16}\b/g],
  ['боевой ключ Stripe', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/g],
  ['приватный ключ', /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/g],
]
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g
const PRIVILEGED_ROLES = new Set(['service_role', 'supabase_admin'])
const SECRET_ENV_NAME = /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|TOKEN/i

function jwtRole(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8')).role
  } catch {
    return undefined
  }
}

export function findSecrets(text) {
  const hits = []
  for (const [label, re] of PATTERNS) {
    for (const m of text.matchAll(re)) hits.push({ label, sample: m[0] })
  }
  for (const m of text.matchAll(JWT)) {
    const role = jwtRole(m[0])
    if (PRIVILEGED_ROLES.has(role)) hits.push({ label: `JWT с ролью ${role}`, sample: m[0] })
  }
  return hits
}

export function findSecretEnvNames(env) {
  return Object.keys(env).filter(name => name.startsWith('VITE_') && SECRET_ENV_NAME.test(name))
}

// Значение секрета в лог не печатаем целиком: CI-логи публичного репозитория
// видны всем, и сторож не должен сам стать местом утечки.
const mask = s => `${s.slice(0, 8)}…(${s.length} симв.)`

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else yield path
  }
}

const TEXT_FILE = /\.(?:js|mjs|cjs|css|html|json|map|txt|webmanifest|svg|xml)$/i

function selfTest() {
  const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const jwt = role => `eyJhbGciOiJIUzI1NiJ9.${b64({ iss: 'supabase', role })}.c2lnbmF0dXJlLXNpZ25hdHVyZQ`
  const must = [
    `const k="${jwt('service_role')}"`,
    'x="sb_secret_' + 'A'.repeat(24) + '"',
    'sk-ant-' + 'api03-' + 'b'.repeat(40),
    '-----BEGIN PRIVATE KEY-----',
    'AKIA' + 'ABCDEFGHIJKLMNOP',
  ]
  const mustNot = [
    `const k="${jwt('anon')}"`,
    'sb_publishable_' + 'A'.repeat(24),
    'const role = "service_role"',
    'task-ant-design',
  ]
  for (const s of must) if (!findSecrets(s).length) throw new Error(`Не пойман секрет: ${s.slice(0, 30)}`)
  for (const s of mustNot) if (findSecrets(s).length) throw new Error(`Ложное срабатывание: ${s.slice(0, 30)}`)
  if (findSecretEnvNames({ VITE_SUPABASE_URL: 1, VITE_SUPABASE_PUBLISHABLE_KEY: 1 }).length)
    throw new Error('Ложное срабатывание на публичных VITE_')
  if (findSecretEnvNames({ VITE_SUPABASE_SERVICE_ROLE_KEY: 1 }).length !== 1)
    throw new Error('Не поймана VITE_ с серверным ключом')
  console.log('checkClientSecrets: self-test ok')
}

if (process.argv.includes('--self-test')) {
  selfTest()
} else {
  const root = resolve(process.argv[2] ?? 'dist')
  const problems = []
  for (const name of findSecretEnvNames(process.env)) {
    problems.push(`переменная ${name}: Vite вшивает VITE_* в клиент — серверному ключу там не место`)
  }
  let files = 0
  for (const path of walk(root)) {
    if (!TEXT_FILE.test(path)) continue
    files++
    for (const hit of findSecrets(readFileSync(path, 'utf8'))) {
      problems.push(`${relative(root, path)}: ${hit.label} ${mask(hit.sample)}`)
    }
  }
  if (problems.length) {
    console.error('❌ В клиентской сборке найдены секреты:')
    for (const p of problems) console.error(`   ${p}`)
    console.error('Уберите ключ из клиента (он должен жить в Edge Function / секретах Supabase) и замените его — он уже скомпрометирован.')
    process.exit(1)
  }
  console.log(`Client secrets: ${files} файлов dist проверено, серверных ключей нет`)
}
