#!/usr/bin/env node
// Штамп версии сборки.
//
// Номер сборки = порядковый номер коммита (git rev-list --count). Он попадает в
// public/version.json ДО коммита (хук .githooks/pre-commit) — то есть номер едет
// внутри самого коммита. Поэтому:
//   • на сборке (в т.ч. на Vercel, где клон мелкий и rev-list соврал бы) номер
//     просто читается из файла, git не нужен;
//   • тот же файл лежит в dist корнем и отдаётся по /version.json — приложение
//     скачивает его и сравнивает со своим, вшитым при сборке.
//
// Флаги:
//   --next   номер СЛЕДУЮЩЕГО коммита (для pre-commit: коммита ещё нет в HEAD)
//   --stage  добавить файл в индекс (тоже для хука)
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'public', 'version.json')
const args = new Set(process.argv.slice(2))

const git = (cmd) => execSync(`git ${cmd}`, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()

let count = 0
try { count = Number(git('rev-list --count HEAD')) || 0 } catch { /* нет git / первый коммит */ }

// `git commit --amend` номер сдвинет ещё на единицу (коммит уже в HEAD, а хук
// снова прибавляет 1). Это не беда: номер остаётся уникальным и растущим —
// именно это и нужно, чтобы сверять «доехало / не доехало».
// Номер обязан только РАСТИ. Параллельные сессии считают «следующий» от одного
// и того же HEAD и легко штампуют одно число дважды; после ребейза в истории
// оказывались бы два коммита с одной версией — и устройство на первом из них
// считало бы себя свежим. Поэтому берём максимум из счётчика и уже
// заштампованного номера.
const prevBuild = (() => {
  try { return Number(JSON.parse(readFileSync(OUT, 'utf8')).build) || 0 } catch { return 0 }
})()
const bump = args.has('--next') ? 1 : 0
const build = Math.max(count + bump, prevBuild + bump)
const version = `1.0.${build}`
const payload = { build, version, stamped: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }

let prev = null
try { prev = JSON.parse(readFileSync(OUT, 'utf8')) } catch { /**/ }
// Не трогаем файл (и не пачкаем индекс), если номер тот же — иначе каждая
// сборка/аменд плодила бы diff из одной строки времени.
if (!prev || prev.build !== build) {
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n')
}
if (args.has('--stage')) {
  try { execSync(`git add -- ${JSON.stringify(OUT)}`, { cwd: root, stdio: 'ignore' }) } catch { /**/ }
}
console.log(`version ${version}`)
