// Архив модуля расшифровки для Mac (public/downloads/iskra-transcription-mac.zip)
// и его версия (src/lib/transcriptionModuleVersion.ts) — из tools/local-transcription.
//
// Почему так. Архив раньше собирали руками, и он отстал от кода: учитель
// скачивал модуль без пауз, голосов и словаря. Теперь архив и версия собираются
// этим скриптом. Он запускается как `prebuild` перед `vite build`, поэтому
// готовый архив попадает в деплой, а в git не коммитится — он большой из-за
// вложенного ffmpeg (см. ниже) и раздувал бы репозиторий и деплой.
//
// Версия — отпечаток кода модуля: sha256 по именам и содержимому кодовых
// файлов в алфавитном порядке, первые 12 знаков. Модуль на Mac считает его
// тем же способом (server.py, module_version) и отдаёт по GET /version —
// страница сравнивает и предлагает обновиться. Бинарник ffmpeg в отпечаток НЕ
// входит (codeFiles), поэтому `--check` сверяет только версию и работает офлайн.
//
// Вложенный ffmpeg — статическая сборка для macOS arm64 (GPLv3, релиз 9.0.2
// Martin Riedl), благодаря ей модуль работает на Mac без Homebrew. В git он НЕ
// хранится; берётся по порядку: локальный файл модуля (tools/local-transcription/
// ffmpeg, если положили) → кэш node_modules/.cache → скачивание по закреплённому
// URL с проверкой sha256. Источник и sha можно переопределить переменными
// TRANSCRIPTION_FFMPEG_URL / TRANSCRIPTION_FFMPEG_SHA256 (например, зеркало в R2).
//
//   node scripts/buildTranscriptionModule.mjs          — собрать архив (нужна сеть при первом запуске)
//   node scripts/buildTranscriptionModule.mjs --check  — сверить версию (офлайн, архив не трогает)
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { deflateRawSync, inflateRawSync, crc32 } from 'node:zlib'

const ROOT = new URL('..', import.meta.url).pathname
const MODULE = join(ROOT, 'tools/local-transcription')
const ZIP = join(ROOT, 'public/downloads/iskra-transcription-mac.zip')
const VERSION_TS = join(ROOT, 'src/lib/transcriptionModuleVersion.ts')
const INSTALLER_VERSION_TS = join(ROOT, 'src/lib/transcriptionInstallerVersion.ts')
const PRODUCT_VERSION_TS = join(ROOT, 'src/lib/transcriptionProductVersion.ts')
const CACHE = join(ROOT, 'node_modules/.cache/iskra-transcription')
const MAC_INSTALLER = join(ROOT, 'tools/transcription-macos')
const INSTALLER_SCRIPT = join(ROOT, 'scripts/buildTranscriptionMacInstaller.sh')

// Закреплённая сборка ffmpeg для macOS arm64 (архив ffmpeg.zip содержит один
// исполняемый файл `ffmpeg`); sha256 — распакованного бинарника.
const FFMPEG = {
  url: process.env.TRANSCRIPTION_FFMPEG_URL || 'https://ffmpeg.martin-riedl.de/download/macos/arm64/1789931890_9.0.2/ffmpeg.zip',
  sha256: process.env.TRANSCRIPTION_FFMPEG_SHA256 || '2e11c6f90993cdb79fff84d3f90044d28316b310e75b3e030cfc9a54f2c9d384',
  name: 'ffmpeg',
}

/** Кодовые файлы модуля — то, от чего зависит версия. Тесты в архив не идут. */
export function codeFiles(names) {
  return names.filter(n => (/\.(py|swift)$/.test(n) || n === 'start.command') && !n.startsWith('test_')).sort()
}

const sha256 = buf => createHash('sha256').update(buf).digest('hex')

/** Один файл из zip по центральному каталогу — без зависимостей. */
function extractFromZip(zip, wanted) {
  let eocd = -1
  for (let i = zip.length - 22; i >= 0; i--) { if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break } }
  if (eocd < 0) throw new Error('ffmpeg: в архиве нет оглавления zip')
  const count = zip.readUInt16LE(eocd + 10)
  let p = zip.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error('ffmpeg: повреждён каталог zip')
    const method = zip.readUInt16LE(p + 10)
    const compSize = zip.readUInt32LE(p + 20)
    const fnLen = zip.readUInt16LE(p + 28), extraLen = zip.readUInt16LE(p + 30), commentLen = zip.readUInt16LE(p + 32)
    const localOff = zip.readUInt32LE(p + 42)
    const name = zip.subarray(p + 46, p + 46 + fnLen).toString()
    if (name === wanted || name.endsWith('/' + wanted)) {
      const start = localOff + 30 + zip.readUInt16LE(localOff + 26) + zip.readUInt16LE(localOff + 28)
      const comp = zip.subarray(start, start + compSize)
      return method === 0 ? Buffer.from(comp) : inflateRawSync(comp)
    }
    p += 46 + fnLen + extraLen + commentLen
  }
  throw new Error('ffmpeg: в архиве нет файла ' + wanted)
}

async function ensureFfmpeg() {
  const verified = buf => buf && sha256(buf) === FFMPEG.sha256 ? buf : null
  // 1. Локальный бинарник в папке модуля (удобно для разработки, в git его нет).
  const local = join(MODULE, FFMPEG.name)
  if (existsSync(local)) { const b = verified(readFileSync(local)); if (b) return b }
  // 2. Кэш (переживает повторные сборки, в т.ч. кэш сборок Vercel).
  const cached = join(CACHE, `${FFMPEG.name}-${FFMPEG.sha256}`)
  if (existsSync(cached)) { const b = verified(readFileSync(cached)); if (b) return b }
  // 3. Скачать и проверить sha256.
  const res = await fetch(FFMPEG.url)
  if (!res.ok) throw new Error(`ffmpeg: не удалось скачать (${res.status}) ${FFMPEG.url}`)
  const bin = extractFromZip(Buffer.from(await res.arrayBuffer()), FFMPEG.name)
  if (sha256(bin) !== FFMPEG.sha256) throw new Error('ffmpeg: sha256 не совпал — сборка остановлена')
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(cached, bin)
  return bin
}

const names = readdirSync(MODULE)
const code = codeFiles(names)

const hash = createHash('sha256')
for (const name of code) { hash.update(name + '\0'); hash.update(readFileSync(join(MODULE, name))); hash.update('\0') }
const version = hash.digest('hex').slice(0, 12)

const ts = `// Создаётся scripts/buildTranscriptionModule.mjs — не править руками.
// Версия модуля расшифровки в архиве public/downloads/iskra-transcription-mac.zip:
// отпечаток его кода. Модуль на Mac отдаёт свою по GET /version.
export const TRANSCRIPTION_MODULE_VERSION = '${version}'
`

const installerFiles = [...readdirSync(MAC_INSTALLER).filter(name => /\.(swift|plist)$/.test(name)).sort(), 'scripts/buildTranscriptionMacInstaller.sh', 'src/lib/transcriptionProductVersion.ts']
const installerHash = createHash('sha256').update(version + '\0')
for (const name of installerFiles) {
  const path = name === 'scripts/buildTranscriptionMacInstaller.sh' ? INSTALLER_SCRIPT
    : name === 'src/lib/transcriptionProductVersion.ts' ? PRODUCT_VERSION_TS
      : join(MAC_INSTALLER, name)
  installerHash.update(name + '\0').update(readFileSync(path)).update('\0')
}
const installerVersion = installerHash.digest('hex').slice(0, 12)
const installerTs = `// Создаётся scripts/buildTranscriptionModule.mjs — не править руками.
// Версия установщика: версия модуля плюс исходники macOS-приложения.
export const TRANSCRIPTION_INSTALLER_VERSION = '${installerVersion}'
`

if (process.argv.includes('--check')) {
  // Офлайн: архив собирается при сборке сайта и в git не хранится, поэтому
  // сверяем только версию (отпечаток кода) — она закоммичена и сверяется с сайтом.
  if (!existsSync(VERSION_TS) || readFileSync(VERSION_TS, 'utf8') !== ts) {
    console.error('Модуль расшифровки изменён, а версия не пересобрана: src/lib/transcriptionModuleVersion.ts.\nЗапустите: node scripts/buildTranscriptionModule.mjs')
    process.exit(1)
  }
  if (!existsSync(INSTALLER_VERSION_TS) || readFileSync(INSTALLER_VERSION_TS, 'utf8') !== installerTs) {
    console.error('Установщик расшифровки изменён, а версия не пересобрана: src/lib/transcriptionInstallerVersion.ts.\nЗапустите: node scripts/buildTranscriptionModule.mjs')
    process.exit(1)
  }
  console.log(`Transcription module ${version}; installer ${installerVersion}`)
} else {
  writeFileSync(INSTALLER_VERSION_TS, installerTs)
  writeFileSync(VERSION_TS, ts)
  const ffmpeg = await ensureFfmpeg()
  const entries = [...code, 'README.md'].map(name => ({ name, data: readFileSync(join(MODULE, name)), mode: name === 'start.command' ? 0o100755 : 0o100644 }))
  entries.push({ name: FFMPEG.name, data: ffmpeg, mode: 0o100755 })
  entries.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

  // ── ZIP без зависимостей: deflate + центральный каталог. Дата фиксированная,
  // чтобы одинаковый вход давал побайтно одинаковый архив.
  const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1
  const local = [], central = []
  let offset = 0
  for (const { name, data, mode } of entries) {
    const packed = deflateRawSync(data, { level: 9 })
    const path = Buffer.from('Iskra/' + name)
    const crc = crc32(data)
    const head = Buffer.alloc(30)
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8)
    head.writeUInt16LE(DOS_TIME, 10); head.writeUInt16LE(DOS_DATE, 12); head.writeUInt32LE(crc, 14)
    head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(path.length, 26); head.writeUInt16LE(0, 28)
    local.push(head, path, packed)
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
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(dirSize, 12); end.writeUInt32LE(offset, 16)
  const zip = Buffer.concat([...local, ...central, end])

  mkdirSync(dirname(ZIP), { recursive: true })
  writeFileSync(ZIP, zip)
  console.log(`Transcription module ${version}: ${entries.length} files, ${(zip.length / 1048576).toFixed(1)} MB → public/downloads/iskra-transcription-mac.zip`)
}
