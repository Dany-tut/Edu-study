// Архив модуля расшифровки для Mac (public/downloads/iskra-transcription-mac.zip)
// и его версия (src/lib/transcriptionModuleVersion.ts) — из tools/local-transcription.
//
// Почему так. Архив раньше собирали руками, и он отстал от кода: учитель
// скачивал модуль без пауз, голосов и словаря. Теперь архив и версия
// собираются этим скриптом, а `--check` (в check:ui) роняет проверку, если
// кто-то поменял модуль и не пересобрал архив.
//
// Версия — отпечаток кода модуля: sha256 по именам и содержимому кодовых
// файлов в алфавитном порядке, первые 12 знаков. Модуль на Mac считает его
// тем же способом (server.py, module_version) и отдаёт по GET /version —
// страница сравнивает и предлагает обновиться.
//
//   node scripts/buildTranscriptionModule.mjs          — собрать
//   node scripts/buildTranscriptionModule.mjs --check  — проверить, что собрано
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { deflateRawSync, crc32 } from 'node:zlib'

const ROOT = new URL('..', import.meta.url).pathname
const MODULE = join(ROOT, 'tools/local-transcription')
const ZIP = join(ROOT, 'public/downloads/iskra-transcription-mac.zip')
const VERSION_TS = join(ROOT, 'src/lib/transcriptionModuleVersion.ts')

/** Кодовые файлы модуля — то, от чего зависит версия. Тесты в архив не идут. */
export function codeFiles(names) {
  return names.filter(n => (/\.(py|swift)$/.test(n) || n === 'start.command') && !n.startsWith('test_')).sort()
}

const names = readdirSync(MODULE)
const code = codeFiles(names)
const files = [...code, 'README.md'].sort()

const hash = createHash('sha256')
for (const name of code) { hash.update(name + '\0'); hash.update(readFileSync(join(MODULE, name))); hash.update('\0') }
const version = hash.digest('hex').slice(0, 12)

// ── ZIP без зависимостей: deflate + центральный каталог. Дата фиксированная,
// чтобы одинаковый код давал побайтно одинаковый архив (иначе --check врёт).
const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1
const local = [], central = []
let offset = 0
for (const name of files) {
  const data = readFileSync(join(MODULE, name))
  const packed = deflateRawSync(data, { level: 9 })
  const path = Buffer.from('Iskra/' + name)
  const crc = crc32(data)
  const head = Buffer.alloc(30)
  head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8)
  head.writeUInt16LE(DOS_TIME, 10); head.writeUInt16LE(DOS_DATE, 12); head.writeUInt32LE(crc, 14)
  head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(path.length, 26); head.writeUInt16LE(0, 28)
  local.push(head, path, packed)
  const mode = name === 'start.command' ? 0o100755 : 0o100644
  const dir = Buffer.alloc(46)
  dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE((3 << 8) | 20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(0x0800, 8); dir.writeUInt16LE(8, 10)
  dir.writeUInt16LE(DOS_TIME, 12); dir.writeUInt16LE(DOS_DATE, 14); dir.writeUInt32LE(crc, 16)
  dir.writeUInt32LE(packed.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(path.length, 28)
  dir.writeUInt16LE(0, 30); dir.writeUInt16LE(0, 32); dir.writeUInt16LE(0, 34); dir.writeUInt16LE(0, 36)
  dir.writeUInt32LE((mode << 16) >>> 0, 38); dir.writeUInt32LE(offset, 42)
  central.push(dir, path)
  offset += head.length + path.length + packed.length
}
const dirSize = central.reduce((s, b) => s + b.length, 0)
const end = Buffer.alloc(22)
end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10)
end.writeUInt32LE(dirSize, 12); end.writeUInt32LE(offset, 16)
const zip = Buffer.concat([...local, ...central, end])

const ts = `// Создаётся scripts/buildTranscriptionModule.mjs — не править руками.
// Версия модуля расшифровки в архиве public/downloads/iskra-transcription-mac.zip:
// отпечаток его кода. Модуль на Mac отдаёт свою по GET /version.
export const TRANSCRIPTION_MODULE_VERSION = '${version}'
`

if (process.argv.includes('--check')) {
  const stale = []
  if (!existsSync(ZIP) || !readFileSync(ZIP).equals(zip)) stale.push('public/downloads/iskra-transcription-mac.zip')
  if (!existsSync(VERSION_TS) || readFileSync(VERSION_TS, 'utf8') !== ts) stale.push('src/lib/transcriptionModuleVersion.ts')
  if (stale.length) {
    console.error(`Модуль расшифровки изменён, а архив не пересобран: ${stale.join(', ')}.\nЗапустите: node scripts/buildTranscriptionModule.mjs`)
    process.exit(1)
  }
  console.log(`Transcription module: archive and version ${version} are up to date (${files.length} files)`)
} else {
  writeFileSync(ZIP, zip)
  writeFileSync(VERSION_TS, ts)
  console.log(`Transcription module ${version}: ${files.length} files → public/downloads/iskra-transcription-mac.zip`)
}
