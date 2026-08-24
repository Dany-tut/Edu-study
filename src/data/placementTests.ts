// Placement-тесты по языкам для раздела «Тестирование» (Конструктор → Тестирование).
// Работают в той же механике, что и диагностики biology/chemistry (DiagQuestion,
// single choice, разбивка результата по section). Уровень вопроса закодирован
// в section префиксом до « · »: «A2 · Grammar», «TOPIK I · Частицы» — так
// разбивка по разделам у учителя сама показывает, сколько взято на каждом
// уровне, а вердикт (getPlacementVerdict) считает лесенку по этим префиксам.

import type { DiagQuestion, DiagResults } from './diagnosticData'

// ── Английский: определение уровня A2 / B1 / B2 / C1 ─────────────────────────
// Лесенка от простого к сложному. Формулировки на английском (как на реальном
// placement-тесте), пояснения к вердикту — на русском.

const EN_READING_1 = 'Read the text: “Maria moved to Lisbon two years ago. At first she missed her friends and often felt lonely. But after joining a photography club she quickly made new ones. Now she says she cannot imagine living anywhere else.”'
const EN_READING_2 = 'Read the text: “Remote work, once a rare perk, has become standard in many industries. Yet studies suggest that fully remote teams often struggle with informal knowledge sharing — the quick questions and chance conversations that offices make possible. Hybrid models attempt to preserve flexibility while restoring these accidental exchanges.”'

export const ENGLISH_PLACEMENT_QUESTIONS: DiagQuestion[] = [
  // ── A2: базовая грамматика ──
  { id: 'enpl-1', section: 'A2 · Grammar', text: 'She ___ to school every day.', options: ['go', 'goes', 'is go', 'going'], correct: 1 },
  { id: 'enpl-2', section: 'A2 · Grammar', text: 'Yesterday we ___ a great film.', options: ['see', 'saw', 'have seen', 'seeing'], correct: 1 },
  { id: 'enpl-3', section: 'A2 · Grammar', text: 'There isn’t ___ milk in the fridge.', options: ['some', 'any', 'a', 'many'], correct: 1 },
  { id: 'enpl-4', section: 'A2 · Grammar', text: 'I have lived here ___ 2019.', options: ['for', 'since', 'from', 'at'], correct: 1 },
  { id: 'enpl-5', section: 'A2 · Grammar', text: '___ apple a day keeps the doctor away.', options: ['A', 'An', 'The', 'Some'], correct: 1 },
  // ── A2: частотная лексика ──
  { id: 'enpl-6', section: 'A2 · Vocabulary', text: 'Choose the opposite of “cheap”:', options: ['free', 'expensive', 'poor', 'small'], correct: 1 },
  { id: 'enpl-7', section: 'A2 · Vocabulary', text: 'You usually keep money and cards in a ___.', options: ['library', 'wallet', 'kitchen', 'ticket'], correct: 1 },
  // ── B1: грамматика ──
  { id: 'enpl-8', section: 'B1 · Grammar', text: 'If it rains tomorrow, we ___ at home.', options: ['stay', 'will stay', 'would stay', 'stayed'], correct: 1 },
  { id: 'enpl-9', section: 'B1 · Grammar', text: 'I’m used ___ up early — it doesn’t bother me anymore.', options: ['to get', 'to getting', 'get', 'getting to'], correct: 1 },
  { id: 'enpl-10', section: 'B1 · Grammar', text: 'This is the city ___ I was born.', options: ['which', 'where', 'what', 'who'], correct: 1 },
  { id: 'enpl-11', section: 'B1 · Grammar', text: 'You ___ smoke here — it is strictly forbidden.', options: ['mustn’t', 'don’t have to', 'couldn’t', 'wouldn’t'], correct: 0 },
  { id: 'enpl-12', section: 'B1 · Grammar', text: 'The letter ___ yesterday.', options: ['sent', 'was sent', 'has sent', 'is sending'], correct: 1 },
  // ── B1: лексика ──
  { id: 'enpl-13', section: 'B1 · Vocabulary', text: 'He decided to ___ up smoking for good.', options: ['give', 'put', 'take', 'get'], correct: 0 },
  { id: 'enpl-14', section: 'B1 · Vocabulary', text: 'Which is closest in meaning to “purchase”?', options: ['to sell', 'to buy', 'to borrow', 'to break'], correct: 1 },
  // ── B1: чтение (отрывок 1) ──
  { id: 'enpl-15', section: 'B1 · Reading', text: `${EN_READING_1} Why did Maria feel lonely at first?`, options: ['She didn’t like Lisbon', 'She missed her friends', 'She had no job', 'She didn’t speak the language'], correct: 1 },
  { id: 'enpl-16', section: 'B1 · Reading', text: `${EN_READING_1} What helped her make new friends?`, options: ['Her new job', 'A language course', 'A photography club', 'Her neighbours'], correct: 2 },
  { id: 'enpl-17', section: 'B1 · Reading', text: `${EN_READING_1} How does Maria feel about Lisbon now?`, options: ['She wants to move back', 'She doesn’t want to live anywhere else', 'She still feels lonely', 'She finds it too expensive'], correct: 1 },
  // ── B2: грамматика ──
  { id: 'enpl-18', section: 'B2 · Grammar', text: 'If I ___ harder at school, I would have got a better job.', options: ['worked', 'had worked', 'would work', 'was working'], correct: 1 },
  { id: 'enpl-19', section: 'B2 · Grammar', text: 'She said she ___ the report the day before.', options: ['finishes', 'has finished', 'had finished', 'will finish'], correct: 2 },
  { id: 'enpl-20', section: 'B2 · Grammar', text: 'By next June, they ___ the new bridge.', options: ['will build', 'will have built', 'are building', 'have built'], correct: 1 },
  { id: 'enpl-21', section: 'B2 · Grammar', text: 'I’d rather you ___ smoke in the house.', options: ['don’t', 'didn’t', 'won’t', 'not to'], correct: 1 },
  // ── B2: лексика (академическая) ──
  { id: 'enpl-22', section: 'B2 · Vocabulary', text: 'Which is closest in meaning to “assess”?', options: ['to ignore', 'to evaluate', 'to increase', 'to describe'], correct: 1 },
  { id: 'enpl-23', section: 'B2 · Vocabulary', text: 'The government decided to ___ the new policy despite criticism.', options: ['implement', 'apologise', 'graduate', 'rehearse'], correct: 0 },
  // ── B2: чтение (отрывок 2) ──
  { id: 'enpl-24', section: 'B2 · Reading', text: `${EN_READING_2} What is the main idea of the text?`, options: ['Offices are always better than remote work', 'Remote work has trade-offs that hybrid models try to fix', 'Remote work is a rare privilege', 'Studies about remote work are unreliable'], correct: 1 },
  { id: 'enpl-25', section: 'B2 · Reading', text: `${EN_READING_2} According to the text, fully remote teams often struggle with:`, options: ['Meeting deadlines', 'Informal knowledge sharing', 'Using new technology', 'Hiring new employees'], correct: 1 },
  { id: 'enpl-26', section: 'B2 · Reading', text: `${EN_READING_2} What is the purpose of hybrid models?`, options: ['To cut office costs', 'To make everyone return to the office', 'To keep flexibility while restoring chance conversations', 'To replace studies about remote work'], correct: 2 },
  // ── C1: грамматика (инверсия, сослагательное) ──
  { id: 'enpl-27', section: 'C1 · Grammar', text: '___ had the concert begun when the lights went out.', options: ['Hardly', 'Only', 'Never', 'Rarely'], correct: 0 },
  { id: 'enpl-28', section: 'C1 · Grammar', text: 'Not until the final page ___ the truth.', options: ['the reader discovers', 'does the reader discover', 'the reader does discover', 'discovers the reader'], correct: 1 },
  // ── C1: лексика ──
  { id: 'enpl-29', section: 'C1 · Vocabulary', text: 'Which is closest in meaning to “ubiquitous”?', options: ['rare', 'omnipresent', 'obsolete', 'ambiguous'], correct: 1 },
  { id: 'enpl-30', section: 'C1 · Vocabulary', text: 'Her argument was so ___ that even the sceptics agreed.', options: ['cogent', 'verbose', 'tenuous', 'mundane'], correct: 0 },
]

// ── Корейский: 0 / хангыль / TOPIK I / TOPIK II ──────────────────────────────

export const KOREAN_PLACEMENT_QUESTIONS: DiagQuestion[] = [
  // ── Хангыль: узнавание букв и слогов ──
  { id: 'kopl-1', section: 'Хангыль · Буквы и слоги', text: 'Какой слог читается как «кан»?', options: ['간', '난', '각', '감'], correct: 0 },
  { id: 'kopl-2', section: 'Хангыль · Буквы и слоги', text: 'Какая буква даёт звук «м»?', options: ['ㅁ', 'ㄴ', 'ㅇ', 'ㅂ'], correct: 0 },
  { id: 'kopl-3', section: 'Хангыль · Буквы и слоги', text: 'Какая гласная даёт звук «у»?', options: ['ㅜ', 'ㅗ', 'ㅡ', 'ㅣ'], correct: 0 },
  { id: 'kopl-4', section: 'Хангыль · Буквы и слоги', text: 'Слово 나무 читается как:', options: ['наму', 'каму', 'наду', 'раму'], correct: 0 },
  { id: 'kopl-5', section: 'Хангыль · Буквы и слоги', text: 'Слово 사람 читается как:', options: ['сарам', 'сарап', 'садам', 'чарам'], correct: 0 },
  { id: 'kopl-6', section: 'Хангыль · Буквы и слоги', text: 'Конечная ㅇ (받침) в слоге 강 звучит как:', options: ['носовое «нъ» (ng)', '«н»', '«к»', 'не читается'], correct: 0 },
  { id: 'kopl-7', section: 'Хангыль · Буквы и слоги', text: 'Слово 물 читается как:', options: ['муль', 'буль', 'пуль', 'моль'], correct: 0 },
  // ── TOPIK I: чтение слов ──
  { id: 'kopl-8', section: 'TOPIK I · Слова', text: '물 — это:', options: ['вода', 'огонь', 'трава', 'рог'], correct: 0 },
  { id: 'kopl-9', section: 'TOPIK I · Слова', text: 'Выберите слово «школа»:', options: ['학교', '약국', '공항', '식당'], correct: 0 },
  { id: 'kopl-10', section: 'TOPIK I · Слова', text: '안녕하세요 — это:', options: ['приветствие', 'прощание', 'извинение', 'благодарность'], correct: 0 },
  // ── TOPIK I: частицы 은/는 · 이/가 · 을/를 ──
  { id: 'kopl-11', section: 'TOPIK I · Частицы', text: '저___ 학생입니다. Какая частица пропущена?', options: ['는', '가', '를', '에'], correct: 0 },
  { id: 'kopl-12', section: 'TOPIK I · Частицы', text: '물___ 주세요. Какая частица пропущена?', options: ['을', '는', '가', '의'], correct: 0 },
  { id: 'kopl-13', section: 'TOPIK I · Частицы', text: '— 누가 왔어요? — 동생___ 왔어요. Какая частица пропущена?', options: ['이', '은', '을', '도'], correct: 0 },
  { id: 'kopl-14', section: 'TOPIK I · Частицы', text: '학교___ 가요. Какая частица пропущена?', options: ['에', '를', '은', '가'], correct: 0 },
  // ── TOPIK I: времена и связки ──
  { id: 'kopl-15', section: 'TOPIK I · Времена и связки', text: 'Прошедшее время от 먹다 («есть»):', options: ['먹었어요', '먹어요', '먹겠어요', '먹는어요'], correct: 0 },
  { id: 'kopl-16', section: 'TOPIK I · Времена и связки', text: '어제 친구를 ___. («Вчера встретил друга»)', options: ['만났어요', '만나요', '만날 거예요', '만나세요'], correct: 0 },
  { id: 'kopl-17', section: 'TOPIK I · Времена и связки', text: '밥을 먹___ 학교에 가요. («Поем и иду в школу» — связка «и»)', options: ['고', '서', '면', '지만'], correct: 0 },
  { id: 'kopl-18', section: 'TOPIK I · Времена и связки', text: 'Официально-вежливое настоящее от 가다 («идти»):', options: ['갑니다', '가습니다', '갔습니다', '가겠다'], correct: 0 },
  // ── TOPIK II: косвенная речь, ~게 되다, пассив и др. ──
  { id: 'kopl-19', section: 'TOPIK II · Грамматика', text: '친구가 내일 ___ 했어요. («Друг сказал, что завтра придёт»)', options: ['온다고', '오라고', '오냐고', '오자고'], correct: 0 },
  { id: 'kopl-20', section: 'TOPIK II · Грамматика', text: '한국어를 잘 ___ 됐어요. («Так вышло, что стал хорошо говорить по-корейски»)', options: ['하게', '하려고', '하지만', '하도록'], correct: 0 },
  { id: 'kopl-21', section: 'TOPIK II · Грамматика', text: 'Пассив от 먹다 («быть съеденным»):', options: ['먹히다', '먹이다', '먹기다', '먹치다'], correct: 0 },
  { id: 'kopl-22', section: 'TOPIK II · Грамматика', text: '비가 ___ 것 같아요. («Кажется, идёт дождь»)', options: ['오는', '온', '올', '오던'], correct: 0 },
  { id: 'kopl-23', section: 'TOPIK II · Грамматика', text: '늦잠을 ___ 지각했어요. («Опоздал, потому что проспал»)', options: ['자느라고', '자려고', '자자마자', '잔다면'], correct: 0 },
  { id: 'kopl-24', section: 'TOPIK II · Грамматика', text: '___ 좋아요. («Чем больше смотрю, тем больше нравится»)', options: ['보면 볼수록', '보려고', '본 지', '보자마자'], correct: 0 },
  { id: 'kopl-25', section: 'TOPIK II · Грамматика', text: '동생에게 책을 ___ 했어요. («Велел младшему читать книгу»)', options: ['읽으라고', '읽는다고', '읽자고', '읽냐고'], correct: 0 },
]

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
  return null
}
