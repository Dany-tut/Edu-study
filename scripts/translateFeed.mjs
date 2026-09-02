#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Перевод материалов ленты на русский
//
// ЗАЧЕМ. В посте ленты перевод показывается ВМЕСТО оригинала — как «Перевести
// пост» в любой соцсети. Пока перевода не было, кнопка честно показывала то,
// что у нас есть: список слов из текста. Список слов — не перевод: он не
// говорит, о чём новость, и читать его сверху вниз никто не станет.
//
// ПОЧЕМУ ЭТО НЕ «МАШИННЫЙ ПЕРЕВОД НА ЛЕТУ». Перевод делается ДО сборки и
// ложится в репозиторий обычным файлом: его видно в истории, его можно
// поправить руками, и он не зависит от чужого сервиса в момент, когда ученик
// открыл ленту. Приложение — статический SPA, никаких запросов к переводчику
// из браузера здесь нет и не будет.
//
// ЧТО ИМЕННО ОН ДЕЛАЕТ
//   1. Читает ВСЕ материалы языка (ручные, автоленту, пересказы) и уже готовые
//      переводы (trans<Lang>.ts).
//   2. Переводит те, у которых перевода ещё нет: заголовок и тело.
//   3. Выбрасывает переводы материалов, которых в ленте больше нет.
//   4. Переписывает trans<Lang>.ts целиком — старые записи переносятся как есть.
//
// ЧЕГО СКРИПТ НЕ ДЕЛАЕТ. НЕ ПРАВИТ САМИ МАТЕРИАЛЫ — ни ручные, ни машинные. У
// ручного материала перевод бывает написан прямо в нём, вместе с текстом и
// вопросами: такой перевод скрипт видит и второй раз не заказывает.
//
//   node scripts/translateFeed.mjs                — показать, что будет переведено
//   node scripts/translateFeed.mjs --write        — записать файлы
//   node scripts/translateFeed.mjs --lang ko      — только один язык
//   node scripts/translateFeed.mjs --limit 10     — сколько материалов за прогон
//   node scripts/translateFeed.mjs --fake         — прогон без сети
//
// КЛЮЧ. Два пути, и берётся тот, который задан:
//   ANTHROPIC_API_KEY — свой ключ, прямой доступ к API;
//   KIE_API_KEY       — купленные кредиты шлюза kie.ai. Тот же диалект Messages,
//                       но свой адрес и авторизация через «Authorization:
//                       Bearer» — за неё отвечает authToken, а не apiKey.
// Заданы оба — выигрывает свой ключ: у него нет посредника и нет пула
// апстрим-аккаунтов, который может опустеть. Тот же приём, что в
// scripts/buildSpnDecks.mjs, где шлюз уже работает.
//
// ПОЧЕМУ ЧЕРЕЗ ШЛЮЗ ФОРМАТ ОТВЕТА ПРОСИТСЯ СЛОВАМИ, А НЕ СХЕМОЙ. Свой ключ
// даёт структурный вывод (messages.parse + zod): формат гарантирован API. Шлюз
// — посредник, и адаптер у него свой; buildSpnDecks.mjs не случайно просит там
// JSON текстом и разбирает его руками, да ещё держит запасного поставщика «на
// случай, когда Claude-адаптер шлюза лежит». Здесь то же самое: на шлюзе
// формат просится в промпте, а ответ разбирается вручную. Заработает у шлюза
// структурный вывод — эту ветку можно будет выкинуть.
// ─────────────────────────────────────────────────────────────────────────────

import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { aiAllowed } from './aiFlag.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src/data/feed')

const args = process.argv.slice(2)
const has = n => args.includes(`--${n}`)
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d
}
const WRITE = has('write')
const FAKE = has('fake')
const ONLY = flag('lang', null)
const LIMIT = Number(flag('limit', 12))

// Рубильник из админки. Спрашиваем ДО первого запроса к модели и до всякой
// работы: пропущенный прогон должен стоить ноль, а не «почти ноль». В режиме
// без сети (--fake) не спрашиваем вовсе — там и тратить нечего.
if (!FAKE && !(await aiAllowed('ai_feed_translate'))) process.exit(0)

// `parts` — все списки материалов языка в том же порядке, в каком их склеивает
// LOADERS в data/feed/index.ts. У португальского пересказов ещё нет.
const LANGS = {
  ko: { file: 'transKo.ts', konst: 'KO_TRANS', parts: ['KO_FEED', 'KO_AUTO', 'KO_ADAPT'], name: 'корейского' },
  en: { file: 'transEn.ts', konst: 'EN_TRANS', parts: ['EN_FEED', 'EN_AUTO', 'EN_ADAPT'], name: 'английского' },
  ja: { file: 'transJa.ts', konst: 'JA_TRANS', parts: ['JA_FEED', 'JA_AUTO', 'JA_ADAPT'], name: 'японского' },
  pt: { file: 'transPt.ts', konst: 'PT_TRANS', parts: ['PT_FEED', 'PT_AUTO'], name: 'португальского' },
}

// ─── Данные проекта ──────────────────────────────────────────────────────────
//
// Node исполняет .ts сам, но требует расширений в импортах, а внутри src их
// нет — там разрешение берёт на себя Vite. Поэтому собираем нужное тем же
// esbuild, что и приложение (так же поступает adaptFeed.mjs).
const { build } = await import('esbuild')
const tmp = mkdtempSync(join(tmpdir(), 'trans-'))
const bundle = join(tmp, 'bundle.mjs')
await build({
  stdin: {
    contents: `
      export { KO_FEED } from './src/data/feed/feedKo'
      export { EN_FEED } from './src/data/feed/feedEn'
      export { JA_FEED } from './src/data/feed/feedJa'
      export { PT_FEED } from './src/data/feed/feedPt'
      export { KO_ADAPT } from './src/data/feed/adaptKo'
      export { EN_ADAPT } from './src/data/feed/adaptEn'
      export { JA_ADAPT } from './src/data/feed/adaptJa'
      export { KO_AUTO } from './src/data/feed/autoKo'
      export { EN_AUTO } from './src/data/feed/autoEn'
      export { JA_AUTO } from './src/data/feed/autoJa'
      export { PT_AUTO } from './src/data/feed/autoPt'
      export { KO_TRANS } from './src/data/feed/transKo'
      export { EN_TRANS } from './src/data/feed/transEn'
      export { JA_TRANS } from './src/data/feed/transJa'
      export { PT_TRANS } from './src/data/feed/transPt'
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', outfile: bundle, logLevel: 'error',
})
const M = await import(pathToFileURL(bundle).href)
rmSync(tmp, { recursive: true, force: true })

// ─── Запрос ──────────────────────────────────────────────────────────────────

const Translation = z.object({
  title: z.string(),
  /** Пустая строка — у материала не было тела (ролик). */
  body: z.string(),
})

const SYSTEM = `Ты переводишь на русский язык материалы новостной ленты, которую читают подростки, изучающие иностранные языки.

ЖЁСТКИЕ ПРАВИЛА:
1. ЭТО ПЕРЕВОД, А НЕ ПЕРЕСКАЗ. Передай ВЕСЬ текст: ничего не выбрасывай, ничего не добавляй от себя, не сокращай и не «улучшай» источник.
2. Числа, даты, имена, названия организаций и должности переноси точно. Имена собственные передавай по-русски так, как принято; при первом появлении незнакомой организации можно оставить аббревиатуру в скобках.
3. Разбиение на абзацы сохраняй: абзац источника — абзац перевода, пустая строка между ними.
4. Обрыв в источнике («...», незаконченная фраза) сохраняй обрывом: это кусок материала, а не целая статья.
5. Русский язык должен быть живым и естественным — так, как об этом написали бы в русской газете, а не подстрочником.
6. Служебный мусор источника (пункты меню, «Читать далее», подписи к фото) переводи так же коротко, как он выглядит в оригинале, — не выдумывай ему связного текста.
7. Тело пустое — верни пустую строку в body. Заголовок переводи всегда.`

const KIE = process.env.KIE_API_KEY
/** Идём через шлюз: своего ключа нет, а кредиты шлюза есть. */
const VIA_GATEWAY = !FAKE && !process.env.ANTHROPIC_API_KEY && !!KIE

const client = FAKE ? null
  : VIA_GATEWAY ? new Anthropic({ baseURL: 'https://api.kie.ai/claude', authToken: KIE })
    : new Anthropic()

if (VIA_GATEWAY) console.log('Ключа Anthropic нет — идём через шлюз kie.ai.')

/** Достать объект из ответа, который пришёл текстом. */
function jsonFromText(text) {
  const a = text.indexOf('{')
  const b = text.lastIndexOf('}')
  if (a < 0 || b <= a) throw new Error(`в ответе нет JSON: ${text.slice(0, 120)}`)
  return JSON.parse(text.slice(a, b + 1))
}

/**
 * Модели шлюза по убыванию силы. У kie.ai пул апстрим-аккаунтов свой на каждую
 * модель и пустеет независимо («no_available_account»), поэтому одна
 * недоступная не должна отменять весь прогон — тот же список и та же причина,
 * что у supabase/functions/analytics-digest.
 */
const GATEWAY_MODELS = (process.env.KIE_MODELS ?? 'claude-opus-5,claude-sonnet-5,claude-haiku-4-5')
  .split(',').map(m => m.trim()).filter(Boolean)

/** Формат ответа для шлюза — словами, потому что схемы там нет (см. шапку). */
const JSON_RULE = `Ответ верни ОДНИМ объектом JSON и ничем, кроме него: {"title": "перевод заголовка", "body": "перевод тела"}. Тела у материала нет — пустая строка в body. Никакого текста до или после объекта.`

async function askViaGateway(prompt) {
  let last
  for (const model of GATEWAY_MODELS) {
    try {
      // Стримом НАМЕРЕННО: непотоковый вызов шлюза на отказах отдаёт невнятный
      // 502, а поток честно присылает причину — например «no_available_account»,
      // когда у провайдера кончились аккаунты этой модели.
      const res = await client.messages.stream({
        model,
        max_tokens: 16000,
        system: `${SYSTEM}\n\n${JSON_RULE}`,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: prompt }],
      }).finalMessage()
      if (res.stop_reason === 'refusal') return { refused: res.stop_details?.category ?? 'без категории' }
      const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('')
      return { data: jsonFromText(text) }
    } catch (e) {
      last = e
      console.log(`  · ${model}: ${String(e.message).slice(0, 90)}`)
    }
  }
  throw last ?? new Error('шлюз не ответил ни одной моделью')
}

async function ask(item) {
  if (FAKE) return { data: { title: `[пер.] ${item.title}`, body: item.body ? `[пер.] ${item.body}` : '' } }

  const prompt = `Переведи материал с ${LANGS[item.lang]?.name ?? item.lang} языка на русский.

Заголовок: ${item.title}

${item.body || '(тела нет — это ролик, переводи только заголовок)'}`

  if (VIA_GATEWAY) return askViaGateway(prompt)

  const res = await client.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    // Усилие НИЗКОЕ намеренно. Перевод — задача без развилок: думать тут не над
    // чем, а рассуждение составляет большую часть выхода, и выход у Opus стоит
    // впятеро дороже входа. На `high` материал обходился примерно в $0,05, на
    // `low` — в разы дешевле при том же тексте. Если перевод начнёт врать на
    // сложных местах, поднимать сюда, а не в промпт.
    output_config: { effort: 'low', format: zodOutputFormat(Translation) },
    messages: [{ role: 'user', content: prompt }],
  })
  // Отказ классификатора — не ошибка скрипта: материал просто остаётся без
  // перевода, и кнопка в посте показывает разбор по словам, как раньше.
  if (res.stop_reason === 'refusal') return { refused: res.stop_details?.category ?? 'без категории' }
  return { data: res.parsed_output }
}

// ─── Запись ──────────────────────────────────────────────────────────────────

const q = s => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const tpl = s => '`' + String(s).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${') + '`'

function emit(lang, map) {
  const cfg = LANGS[lang]
  const head = `// ─────────────────────────────────────────────────────────────────────────────
// ПЕРЕВОД МАТЕРИАЛОВ ЛЕНТЫ НА РУССКИЙ — ${cfg.name.replace(/ого$/, 'ий')} язык
//
// Файл ведёт \`node scripts/translateFeed.mjs --write\`: он дописывает переводы
// новых материалов и убирает переводы тех, что из ленты уже ушли. Правка руками
// переживает прогон — старые записи переносятся как есть.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. auto*.ts целиком перезаписывает ночная сборка ленты:
// перевод, положенный туда, живёт до утра. Здесь он привязан к id материала и
// переживает любую пересборку.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeedTranslation } from './index'

export const ${cfg.konst}: Record<string, FeedTranslation> = {
`
  const body = Object.entries(map).map(([id, t]) => {
    const lines = [`  ${q(id)}: {`, `    title: ${q(t.title)},`]
    if (t.body) lines.push(`    body: ${tpl(t.body)},`)
    lines.push('  },')
    return lines.join('\n')
  }).join('\n')
  writeFileSync(join(dataDir, cfg.file), `${head}${body}\n}\n`, 'utf8')
}

// ─── Прогон ──────────────────────────────────────────────────────────────────

let budget = LIMIT

for (const [lang, cfg] of Object.entries(LANGS)) {
  if (ONLY && ONLY !== lang) continue

  const items = cfg.parts.flatMap(k => M[k] ?? [])
  const had = M[cfg.konst] ?? {}
  const live = new Set(items.map(i => i.id))

  // Осиротевшие переводы уходят вместе с материалом: держать их незачем, а
  // файл иначе растёт без конца.
  const kept = {}
  for (const [id, t] of Object.entries(had)) if (live.has(id)) kept[id] = t
  const dropped = Object.keys(had).length - Object.keys(kept).length

  // Материал со своим переводом внутри (ручные тексты) не переводим заново:
  // тот перевод написан вместе с вопросами к тексту и точнее любого нашего.
  const todo = items.filter(i => !kept[i.id] && !i.translation)
  const own = items.filter(i => i.translation).length
  console.log(`\n${lang}: материалов ${items.length}, перевод в самом материале ${own}, отдельным файлом ${Object.keys(kept).length}, без перевода ${todo.length}${dropped ? `, убрано устаревших ${dropped}` : ''}`)

  const fresh = {}
  for (const item of todo) {
    if (budget <= 0) { console.log('  · лимит прогона исчерпан'); break }
    budget--
    const said = await ask(item)
    if (said.refused) { console.log(`  ✗ ${item.id}: модель отказалась (${said.refused})`); continue }
    const t = said.data
    if (!t?.title?.trim()) { console.log(`  ✗ ${item.id}: пустой перевод`); continue }
    fresh[item.id] = { title: t.title.trim(), body: t.body?.trim() || undefined }
    console.log(`  ✓ ${item.id}: ${t.title.trim().slice(0, 60)}`)
  }

  // Порядок как в ленте: сначала материалы в их порядке, потом всё, что
  // осталось от прошлых прогонов и ещё живо.
  const merged = {}
  for (const i of items) {
    const t = fresh[i.id] ?? kept[i.id]
    if (t) merged[i.id] = t
  }

  if (!WRITE) { console.log(`  (без --write ничего не записано)`); continue }
  emit(lang, merged)
  console.log(`  → ${cfg.file}: ${Object.keys(merged).length} переводов`)
}

if (!WRITE) console.log('\nЭто был показ. Чтобы записать — прогон с --write.')
