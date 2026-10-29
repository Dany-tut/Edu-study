// Placement-тесты по языкам для раздела «Тестирование» (Конструктор → Тестирование).
// Работают в той же механике, что и диагностики biology/chemistry (DiagQuestion,
// single choice, разбивка результата по section). Уровень вопроса закодирован
// в section префиксом до « · »: «A2 · Grammar», «TOPIK I · Частицы» — так
// разбивка по разделам у учителя сама показывает, сколько взято на каждом
// уровне, а вердикт (getPlacementVerdict) считает лесенку по этим префиксам.

import type { DiagResults } from './diagnosticData'
import { englishRestoreVerdict } from './englishRestore'


// ── Вердикт ──────────────────────────────────────────────────────────────────
// Уровень «взят», если по его вопросам набрано ≥ 60% (STRONG — ≥ 80%).
// Идём по лесенке снизу вверх и останавливаемся на первом невзятом уровне.

const PASS = 0.6
const STRONG = 0.8

export interface PlacementLadderStep {
  level: string
  correct: number
  total: number
  passed: boolean
}

export interface PlacementVerdict {
  level: string        // достигнутый уровень («A2», «B1+», «TOPIK I», «С нуля»…)
  note: string         // пояснение на русском
  courseKey: string    // ключ курса из courseSeeds.ts
  courseTitle: string  // человекочитаемое название рекомендуемого курса
  ladder: PlacementLadderStep[]
}

function levelOfSection(section: string): string {
  return section.split(' · ')[0]
}

function buildLadder(levels: string[], results: DiagResults): PlacementLadderStep[] {
  return levels.map(level => {
    let correct = 0, total = 0
    for (const [section, r] of Object.entries(results)) {
      if (levelOfSection(section) === level) { correct += r.correct; total += r.total }
    }
    return { level, correct, total, passed: total > 0 && correct / total >= PASS }
  })
}

// Последний взятый уровень подряд снизу (лесенка обрывается на первом провале).
function reachedIndex(ladder: PlacementLadderStep[]): number {
  let idx = -1
  for (const step of ladder) {
    if (step.passed) idx++
    else break
  }
  return idx
}

function englishVerdict(results: DiagResults): PlacementVerdict {
  const ladder = buildLadder(['A2', 'B1', 'B2', 'C1'], results)
  const idx = reachedIndex(ladder)
  const b1 = ladder[1]
  const b1Strong = b1.total > 0 && b1.correct / b1.total >= STRONG

  const ENDC = { courseKey: 'endc', courseTitle: 'Английский для дизайнера — от письма до оффера (A2 → B1)' }
  const IELT = { courseKey: 'ielt', courseTitle: 'IELTS Academic — с 6.0 на 7.0 (B1 → B2)' }
  const ENAC = { courseKey: 'enac', courseTitle: 'Английский: от B2 к C1' }

  if (idx < 0) return { level: 'Ниже A2', note: 'База пока не собрана: простые времена, артикли и частотная лексика требуют системной работы. Начинать стоит с основ — в удобном темпе, без экзаменационного давления.', ...ENDC, ladder }
  if (idx === 0) return { level: 'A2', note: 'Есть уверенная база: простые времена и бытовая лексика на месте, но условные предложения и пассив ещё «плывут». Следующий шаг — добрать грамматику среднего уровня до устойчивого B1.', ...ENDC, ladder }
  if (idx === 1) {
    if (b1Strong) return { level: 'B1+', note: 'Средний уровень взят с запасом: условные, пассив и косвенная речь почти без ошибок. Дальше — общий английский следующего уровня: выбор между временами, сложное предложение, регистр. Экзаменационный формат — после него, отдельным курсом.', ...ENAC, ladder }
    return { level: 'B1', note: 'Средний уровень в целом взят, но без запаса: часть конструкций B1 ещё требует закрепления. Разумно укрепить фундамент, прежде чем идти в экзаменационный формат.', ...ENDC, ladder }
  }
  if (idx === 2) return { level: 'B2', note: 'Уверенный уровень выше среднего: третий тип условных, косвенная речь и академическая лексика на месте. Дальше растёт не набор форм, а точность выбора между ними — этим занимается курс «от B2 к C1». Нужен балл IELTS в ближайшие месяцы — берите экзаменационный курс параллельно.', ...ENAC, ladder }
  return { level: 'C1', note: 'Продвинутый уровень: инверсия и сослагательное наклонение не вызывают трудностей. С такой базой цель IELTS 7.0+ реалистична — дело за форматом экзамена. Для шлифовки идиоматичности и регистра есть курс «от B2 к C1».', ...IELT, ladder }
}

function koreanVerdict(results: DiagResults): PlacementVerdict {
  const ladder = buildLadder(['Хангыль', 'TOPIK I', 'TOPIK II'], results)
  const idx = reachedIndex(ladder)

  if (idx < 0) return {
    level: 'С нуля',
    note: 'Хангыль пока не читается уверенно — и это нормально: корейское письмо осваивается за пару недель системных занятий. Начинать стоит с алфавита.',
    courseKey: 'kohg', courseTitle: 'Корейский с нуля: хангыль', ladder,
  }
  if (idx === 0) return {
    level: 'Хангыль',
    note: 'Буквы и слоги читаются уверенно, но частицы и времена ещё не сложились в систему. Самое время идти от чтения к базовой грамматике.',
    courseKey: 'kotp', courseTitle: 'Корейский с нуля — до TOPIK I', ladder,
  }
  if (idx === 1) return {
    level: 'TOPIK I',
    note: 'База TOPIK I на месте: частицы, времена и связки работают. Следующая ступень — конструкции среднего уровня: косвенная речь, ~게 되다, пассив.',
    courseKey: 'kot2', courseTitle: 'Корейский — от разговора к TOPIK II', ladder,
  }
  return {
    level: 'TOPIK II',
    note: 'Разговорный уровень: формы TOPIK II узнаются уверенно. Курс среднего уровня поможет систематизировать грамматику и добрать академическую лексику к экзамену.',
    courseKey: 'kot2', courseTitle: 'Корейский — от разговора к TOPIK II', ladder,
  }
}

// null — для предметов без placement-логики (биология, химия и т.д.)
export function getPlacementVerdict(subject: string, results: DiagResults | null | undefined): PlacementVerdict | null {
  if (!results || Object.keys(results).length === 0) return null
  if (subject === 'eng-placement') return englishVerdict(results)
  if (subject === 'kor-placement') return koreanVerdict(results)
  if (subject === 'eng-restore') return englishRestoreVerdict(results)
  return null
}
