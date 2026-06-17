// Cognitive screening battery — single source of truth for BOTH the student test runner
// (CognitiveScreeningPage) AND the teacher constructor editor.
//
// The battery is CONFIG-DRIVEN: teachers tune which domains are active, their difficulty,
// and parameters; the runner generates items from this config (rule-based, adaptive).
//
// Methodology / "i" help text lives here (DomainInfo) so the constructor can surface
// exactly what each block measures, how it works, and what it determines.
//
// Persistence mirrors diagnosticData.ts: in-memory cache (instant sync read) + Supabase
// row (`screening_config`, id='default') with graceful fallback to the compiled default.

import { supabase } from '../lib/supabase'

// ── CHC domains ──────────────────────────────────────────────────────────────────
// CHC = Cattell–Horn–Carroll, the dominant model of human cognitive abilities.

export type DomainKey =
  | 'matrices'   // Gf — fluid reasoning (matrix completion)
  | 'series'     // Gf/Gq — number & letter series
  | 'analogies'  // Gc/Gf — verbal analogies
  | 'rotation'   // Gv — mental rotation (spatial)
  | 'memory'     // Gwm — working memory span (forward + backward)
  | 'stroop'     // inhibitory control + Gs (interference)
  | 'speed'      // Gs — processing speed (symbol matching)
  | 'matching'   // Gc — crystallized knowledge

export interface DomainInfo {
  label: string       // full title shown to the student
  short: string       // progress-bar label
  emoji: string
  dimension: string   // ability name on the report, e.g. "Флюидный интеллект"
  chc: string         // CHC code, e.g. "Gf"
  measures: string    // one line: what it measures
  how: string         // how the task works (student-facing)
  determines: string  // what a high vs low score tells the teacher
  science: string     // methodology / evidence note (for the "i" popover)
}

interface BaseDomain {
  enabled: boolean
  /** Adaptive: difficulty climbs; the domain stops after `adaptiveStopFails` consecutive
   *  failures (cleaner discrimination, removes the ceiling effect). When false, a fixed
   *  easy→hard ladder of `count` items is used. */
  adaptive: boolean
  adaptiveStopFails: number
  info: DomainInfo
}

// ── Matrices (Gf) ────────────────────────────────────────────────────────────────
// Rule-based generation: difficulty == number of simultaneous rules. Level 1 = 1 rule
// (Raven SPM-easy), Level 5 = 3+ rules incl. distribution-of-three / XOR (Raven APM-hard).

export type MatrixRuleKey =
  | 'shape'        // shape varies across a direction
  | 'size'         // size progression (e.g. descending)
  | 'fill'         // fill style cycles (outline → solid → striped)
  | 'rotation'     // element rotates by a fixed step
  | 'count'        // number of elements progresses
  | 'distribute3'  // each of 3 values appears once per row & column (Latin-square)
  | 'xor'          // bottom cell = logical combination of the two above it

export interface MatricesConfig extends BaseDomain {
  kind: 'matrices'
  rules: MatrixRuleKey[]
  minLevel: number   // 1..5
  maxLevel: number   // 1..5
  count: number      // items (fixed mode) / max items (adaptive mode)
}

// ── Number & letter series (Gf/Gq) ───────────────────────────────────────────────

export type SeriesType = 'arithmetic' | 'geometric' | 'fibonacci' | 'alternating' | 'letters'

export interface SeriesConfig extends BaseDomain {
  kind: 'series'
  types: SeriesType[]
  minLevel: number
  maxLevel: number
  count: number
}

// ── Verbal analogies (Gc/Gf) ─────────────────────────────────────────────────────
// Content pool is editable by the teacher (analogies are knowledge-laden, can't be
// purely generated). `level` 1..5 lets the ladder pick easy→hard items.

export interface AnalogyItem {
  id: string
  a: string
  b: string
  c: string
  answer: string
  distractors: string[]  // 3 wrong options
  level: number          // 1..5
}

export interface AnalogiesConfig extends BaseDomain {
  kind: 'analogies'
  pool: AnalogyItem[]
  count: number
}

// ── Mental rotation (Gv) ─────────────────────────────────────────────────────────

export interface RotationConfig extends BaseDomain {
  kind: 'rotation'
  minLevel: number
  maxLevel: number
  count: number
}

// ── Working memory (Gwm) ─────────────────────────────────────────────────────────

export interface MemoryConfig extends BaseDomain {
  kind: 'memory'
  minSpan: number
  maxSpan: number
  backward: boolean   // include reverse-order trials (manipulation, not just storage)
  flashMs: number     // per-cell show duration
}

// ── Stroop (inhibition + Gs) ─────────────────────────────────────────────────────

export interface StroopConfig extends BaseDomain {
  kind: 'stroop'
  colors: { name: string; hex: string }[]
  trials: number
  congruentRatio: number  // 0..1 — share of congruent (word==ink) trials
  deadlineMs: number      // response deadline; 0 = none
  measureRT: boolean      // score interference = RT(incongruent) − RT(congruent)
}

// ── Processing speed (Gs) ────────────────────────────────────────────────────────

export interface SpeedConfig extends BaseDomain {
  kind: 'speed'
  durationSec: number  // total time window; score = correct matches in the window
}

// ── Matching / knowledge (Gc) ────────────────────────────────────────────────────

export interface MatchTask {
  id: string
  title: string
  pairs: { left: string; right: string }[]
}

export interface MatchingConfig extends BaseDomain {
  kind: 'matching'
  tasks: MatchTask[]
}

// ── Full config ──────────────────────────────────────────────────────────────────

export type DomainConfig =
  | MatricesConfig | SeriesConfig | AnalogiesConfig | RotationConfig
  | MemoryConfig | StroopConfig | SpeedConfig | MatchingConfig

export interface ScreeningConfig {
  title: string
  description?: string
  /** Sequence + activation: domains run in this order, filtered by `.enabled`. */
  order: DomainKey[]
  matrices: MatricesConfig
  series: SeriesConfig
  analogies: AnalogiesConfig
  rotation: RotationConfig
  memory: MemoryConfig
  stroop: StroopConfig
  speed: SpeedConfig
  matching: MatchingConfig
}

// ─────────────────────────────────────────────────────────────────────────────────
// DEFAULT CONFIG — calibrated for ages 16+, easy→hard, broad coverage.
// ─────────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SCREENING_CONFIG: ScreeningConfig = {
  title: 'Скрининг мышления',
  description: 'Комплексная диагностика когнитивных способностей по 8 доменам CHC-модели.',
  order: ['matrices', 'series', 'analogies', 'rotation', 'memory', 'stroop', 'speed', 'matching'],

  matrices: {
    kind: 'matrices', enabled: true, adaptive: true, adaptiveStopFails: 2,
    rules: ['shape', 'size', 'fill', 'rotation', 'count', 'distribute3', 'xor'],
    minLevel: 1, maxLevel: 5, count: 8,
    info: {
      label: 'Матрицы', short: 'Матрицы', emoji: '🔢',
      dimension: 'Флюидный интеллект', chc: 'Gf',
      measures: 'Способность находить закономерности в новых, незнакомых задачах без опоры на выученные знания.',
      how: 'В сетке 3×3 одна клетка пустая. Нужно понять правило (по строкам и столбцам) и выбрать недостающий элемент.',
      determines: 'Лучший единичный прокси к общему интеллекту (g). Высокий балл — быстро схватывает новое; низкий — нужнее пошаговые объяснения и примеры.',
      science: 'Аналог матриц Равена. Сложность задаётся числом одновременных правил: 1 правило ≈ детский уровень (SPM), 3+ правил с distribution-of-3 и XOR ≈ взрослый уровень (APM). Адаптивная подача убирает «эффект потолка».',
    },
  },

  series: {
    kind: 'series', enabled: true, adaptive: true, adaptiveStopFails: 2,
    types: ['arithmetic', 'geometric', 'fibonacci', 'alternating', 'letters'],
    minLevel: 1, maxLevel: 5, count: 6,
    info: {
      label: 'Ряды', short: 'Ряды', emoji: '🔣',
      dimension: 'Числовое мышление', chc: 'Gf/Gq',
      measures: 'Индуктивное и количественное рассуждение — выявление правила в последовательности.',
      how: 'Дан ряд чисел или букв. Нужно понять правило и назвать следующий элемент.',
      determines: 'Сильный показатель аналитического и математического мышления. Дополняет матрицы вербально-числовым каналом.',
      science: 'Числовые/буквенные ряды — классический пункт тестов Gf (Cattell). Сложность растёт от простой арифметики к составным и чередующимся правилам.',
    },
  },

  analogies: {
    kind: 'analogies', enabled: true, adaptive: true, adaptiveStopFails: 2, count: 6,
    pool: DEFAULT_ANALOGIES(),
    info: {
      label: 'Аналогии', short: 'Аналогии', emoji: '🔠',
      dimension: 'Вербальное мышление', chc: 'Gc/Gf',
      measures: 'Понимание отношений между понятиями + словарный запас (кристаллизованные знания).',
      how: '«A относится к B как C относится к ?». Нужно выбрать слово с тем же типом связи.',
      determines: 'Отражает речевое развитие и эрудицию. Низкий балл при высоких матрицах — потенциал есть, не хватает словарного багажа.',
      science: 'Вербальные аналогии — ядро тестов вербального интеллекта (SAT, GRE). Меряют и знание, и перенос отношений (reasoning).',
    },
  },

  rotation: {
    kind: 'rotation', enabled: true, adaptive: true, adaptiveStopFails: 2,
    minLevel: 1, maxLevel: 5, count: 6,
    info: {
      label: 'Вращение', short: 'Вращение', emoji: '🧩',
      dimension: 'Пространственное мышление', chc: 'Gv',
      measures: 'Мысленное вращение объектов — отдельная способность, не сводимая к вербальной.',
      how: 'Дана фигура. Нужно найти ту же фигуру, повёрнутую на угол (а не зеркальную).',
      determines: 'Важно для STEM, геометрии, черчения, химии. Часто «скрытый» талант у тех, кто слабее в вербальных тестах.',
      science: 'Парадигма Shepard–Metzler (mental rotation). Время реакции линейно растёт с углом поворота — устойчивый научный эффект.',
    },
  },

  memory: {
    kind: 'memory', enabled: true, adaptive: true, adaptiveStopFails: 2,
    minSpan: 3, maxSpan: 8, backward: true, flashMs: 650,
    info: {
      label: 'Память', short: 'Память', emoji: '🧠',
      dimension: 'Рабочая память', chc: 'Gwm',
      measures: 'Объём удержания информации в уме и манипуляция ею.',
      how: 'Ячейки загораются по очереди — нужно воспроизвести порядок. В обратных раундах — в обратном порядке.',
      determines: 'Ключ к удержанию инструкций, многошаговым задачам, концентрации. Низкая — дробите материал на мелкие шаги.',
      science: 'Тест Корси. Прямой span ≈ хранение (средний взрослый 5–6), обратный span ≈ манипуляция (входит в WAIS). Адаптивная остановка по 2 провалам — стандарт span-задач.',
    },
  },

  stroop: {
    kind: 'stroop', enabled: true, adaptive: false, adaptiveStopFails: 2,
    colors: [
      { name: 'КРАСНЫЙ', hex: '#ef4444' },
      { name: 'СИНИЙ',   hex: '#3b82f6' },
      { name: 'ЗЕЛЁНЫЙ', hex: '#22c55e' },
      { name: 'ЖЁЛТЫЙ',  hex: '#eab308' },
    ],
    trials: 12, congruentRatio: 0.4, deadlineMs: 2500, measureRT: true,
    info: {
      label: 'Струп', short: 'Струп', emoji: '⚡',
      dimension: 'Когнитивный контроль', chc: 'EF',
      measures: 'Торможение автоматических реакций и концентрацию под помехой.',
      how: 'Слово написано цветом, не совпадающим со смыслом. Нужно как можно быстрее выбрать ЦВЕТ шрифта, игнорируя слово.',
      determines: 'Саморегуляция, устойчивость к отвлечению. Слабый контроль → импульсивные ошибки, трудно держать внимание на уроке.',
      science: 'Эффект Струпа (1935). Научная метрика — не точность (она у потолка), а интерференция = время на конфликтных минус на согласованных пунктах. Поэтому меряем время реакции.',
    },
  },

  speed: {
    kind: 'speed', enabled: true, adaptive: false, adaptiveStopFails: 2, durationSec: 60,
    info: {
      label: 'Скорость', short: 'Скорость', emoji: '🚀',
      dimension: 'Скорость обработки', chc: 'Gs',
      measures: 'Скорость точного выполнения простых умственных операций.',
      how: 'За ограниченное время — как можно больше верных сопоставлений «символ ↔ символ».',
      determines: 'Влияет на скорость чтения, счёта, выполнения заданий. Низкая при высоком интеллекте → ученику нужно больше времени, не путать с «не понимает».',
      science: 'Аналог Digit-Symbol/Coding (WAIS). Чистая скорость — отдельный фактор Gs, не сводится к интеллекту; важна для учёбы и реальной успеваемости.',
    },
  },

  matching: {
    kind: 'matching', enabled: true, adaptive: false, adaptiveStopFails: 2,
    tasks: DEFAULT_MATCH_TASKS(),
    info: {
      label: 'Связи', short: 'Связи', emoji: '🔗',
      dimension: 'Знания и эрудиция', chc: 'Gc',
      measures: 'Кристаллизованные знания — выученные факты и причинно-следственные связи.',
      how: 'Соедини каждый элемент слева с соответствующим справа.',
      determines: 'В отличие от матриц — меряет НЕ потенциал, а накопленный багаж по предмету. Разрыв «высокие матрицы / низкие знания» = способный, но с пробелами.',
      science: 'Это блок Gc (знания), а не «чистого» мышления. Полезно держать отдельно от Gf, чтобы не путать потенциал с подготовкой.',
    },
  },
}

// ── Editable default content ─────────────────────────────────────────────────────

function DEFAULT_ANALOGIES(): AnalogyItem[] {
  return [
    { id: 'an-1', a: 'Птица', b: 'Гнездо', c: 'Человек', answer: 'Дом', distractors: ['Улица', 'Город', 'Семья'], level: 1 },
    { id: 'an-2', a: 'Холодный', b: 'Горячий', c: 'Тёмный', answer: 'Светлый', distractors: ['Серый', 'Ночь', 'Мрачный'], level: 1 },
    { id: 'an-3', a: 'Рыба', b: 'Вода', c: 'Птица', answer: 'Воздух', distractors: ['Небо', 'Крыло', 'Гнездо'], level: 2 },
    { id: 'an-4', a: 'Книга', b: 'Глава', c: 'Дом', answer: 'Комната', distractors: ['Крыша', 'Дверь', 'Стена'], level: 2 },
    { id: 'an-5', a: 'Врач', b: 'Лечит', c: 'Учитель', answer: 'Учит', distractors: ['Школа', 'Урок', 'Знает'], level: 3 },
    { id: 'an-6', a: 'Вода', b: 'Лёд', c: 'Пар', answer: 'Облако', distractors: ['Дождь', 'Газ', 'Туча'], level: 3 },
    { id: 'an-7', a: 'Атом', b: 'Молекула', c: 'Буква', answer: 'Слово', distractors: ['Алфавит', 'Звук', 'Текст'], level: 4 },
    { id: 'an-8', a: 'Прибыль', b: 'Убыток', c: 'Кредит', answer: 'Дебет', distractors: ['Долг', 'Банк', 'Счёт'], level: 5 },
  ]
}

function DEFAULT_MATCH_TASKS(): MatchTask[] {
  return [
    {
      id: 'mt-1', title: 'Причина → Следствие',
      pairs: [
        { left: 'Рост CO₂ в атмосфере',    right: 'Парниковый эффект' },
        { left: 'Исчезновение хищников',    right: 'Рост численности травоядных' },
        { left: 'Мутация в половой клетке', right: 'Изменение признаков у потомства' },
        { left: 'Нехватка железа в крови',  right: 'Снижение переноса кислорода' },
      ],
    },
    {
      id: 'mt-2', title: 'Понятие → Определение',
      pairs: [
        { left: 'Фотосинтез', right: 'Синтез глюкозы из CO₂ с помощью света' },
        { left: 'Мейоз',      right: 'Деление с уменьшением числа хромосом вдвое' },
        { left: 'Фермент',    right: 'Белок-катализатор биохимических реакций' },
        { left: 'Симбиоз',    right: 'Взаимовыгодное сосуществование разных видов' },
      ],
    },
  ]
}

// ── Persistence (Supabase row `screening_config` id='default' + in-memory cache) ──

const CONFIG_ID = 'default'
let configCache: ScreeningConfig = DEFAULT_SCREENING_CONFIG

/** Deep-merge a stored partial onto the compiled default so new fields always exist. */
function mergeConfig(stored: Partial<ScreeningConfig> | null | undefined): ScreeningConfig {
  if (!stored) return DEFAULT_SCREENING_CONFIG
  const base = DEFAULT_SCREENING_CONFIG
  const out = { ...base, ...stored } as ScreeningConfig
  for (const key of Object.keys(base) as (keyof ScreeningConfig)[]) {
    const b = base[key]
    const s = (stored as Record<string, unknown>)[key]
    if (b && typeof b === 'object' && !Array.isArray(b) && s && typeof s === 'object') {
      // merge domain config objects, keep nested `info` complete
      const merged = { ...(b as object), ...(s as object) } as Record<string, unknown>
      if ((b as { info?: unknown }).info) {
        merged.info = { ...(b as { info: object }).info, ...((s as { info?: object }).info ?? {}) }
      }
      ;(out as unknown as Record<string, unknown>)[key] = merged
    }
  }
  return out
}

export function loadScreeningConfig(): ScreeningConfig {
  return configCache
}

export async function fetchScreeningConfig(): Promise<ScreeningConfig> {
  const { data, error } = await supabase
    .from('screening_config')
    .select('config')
    .eq('id', CONFIG_ID)
    .maybeSingle()
  if (error || !data?.config) return configCache
  configCache = mergeConfig(data.config as Partial<ScreeningConfig>)
  return configCache
}

export async function saveScreeningConfig(config: ScreeningConfig): Promise<void> {
  configCache = config
  const { error } = await supabase
    .from('screening_config')
    .upsert({ id: CONFIG_ID, config }, { onConflict: 'id' })
  if (error) console.error('saveScreeningConfig:', error)
}

/** Active domains in run order. */
export function activeDomains(c: ScreeningConfig): DomainKey[] {
  return c.order.filter(k => c[k].enabled)
}
