// Встроенные наборы вопросов диагностик — С КЛЮЧАМИ (correct / accepts).
//
// НЕ ИМПОРТИРОВАТЬ ИЗ src/. Всё, что попадает в сборку, лежит на CDN в открытую:
// раньше эти массивы ехали в бандле страницы #/diagnostic, и ответы любого
// встроенного теста читались в devtools. Теперь вопросы живут только в базе:
// ученику их отдаёт get_diag_questions (без ключей), проверяет save_diag_progress.
//
// Файл — источник сида: `npm run build:diag-defaults` печатает SQL, который
// кладёт наборы в diag_question_defaults («Сбросить к исходным» у учителя) и
// досеивает в diag_questions предметы, которых там ещё нет (миграция 0111).
// Поправил вопрос здесь — перегенерируй SQL новой миграцией.

import type { DiagQuestion, DiagSubject } from '../../src/data/diagnosticData'
import { SYSTEM_DAY } from '../../src/data/englishRestore'

const sec = (code: string) => `${code} · ${SYSTEM_DAY[code].name}`

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

// ── Английский: восстановление B2 (системы = дни курса) ─────────────────────

export const ENGLISH_RESTORE_QUESTIONS: DiagQuestion[] = [
  // ── TNS · Времена и вид ──
  { id: 'enrs-1', section: sec('TNS'), text: '(урок химии) I ___ this experiment takes about forty minutes, so we should start now.', options: ['am thinking', 'think', 'have thought', 'was thinking'], correct: 1 },
  { id: 'enrs-3', section: sec('TNS'), text: '(урок химии) While I ___ the solution, one of the students knocked over the beaker.', options: ['heated', 'was heating', 'have heated', 'had heated'], correct: 1 },
  { id: 'enrs-4', section: sec('TNS'), text: '(о преподавании) When I first started teaching, I ___ write every formula on the board by hand.', options: ['used to', 'was used to', 'would have', 'am used to'], correct: 0 },
  // ── PRF · Перфект ──
  { id: 'enrs-6', section: sec('PRF'), text: '(в аптеке) How long ___ this cough?', options: ['do you have', 'have you had', 'are you having', 'did you have'], correct: 1 },
  { id: 'enrs-7', section: sec('PRF'), text: '(утро перед уроком) My hands are shaking — I ___ coffee since six this morning.', options: ['drank', 'have drunk', 'have been drinking', 'had drunk'], correct: 2 },
  { id: 'enrs-10', section: sec('PRF'), text: '(на вокзале) When I got to the station, the train ___ five minutes earlier.', options: ['just left', 'had left', 'has left', 'was leaving'], correct: 1 },
  // ── FUT · Будущее ──
  { id: 'enrs-12', section: sec('FUT'), text: '(лаборатория) I’ll email you when the results ___.', options: ['will come', 'come', 'will have come', 'are going to come'], correct: 1 },
  { id: 'enrs-13', section: sec('FUT'), text: '(урок химии) Careful — that beaker ___!', options: ['will fall', 'is going to fall', 'falls', 'will be falling'], correct: 1 },
  { id: 'enrs-15', section: sec('FUT'), text: '(курс анатомии) By the end of the course we ___ all twelve body systems.', options: ['will cover', 'will have covered', 'will be covering', 'cover'], correct: 1 },
  // ── ART · Артикли и исчисляемость ──
  { id: 'enrs-16', section: sec('ART'), text: '(в аптеке) Could I have ___ information about the side effects?', options: ['an', 'some', 'a few', 'any'], correct: 1 },
  { id: 'enrs-17', section: sec('ART'), text: '(лекция по нейробиологии) ___ human brain contains roughly 86 billion neurons.', options: ['A', 'The', '—', 'Some'], correct: 1 },
  { id: 'enrs-22', section: sec('ART'), text: '(после лекции) I’ve got ___ few questions about the citric acid cycle.', options: ['a', 'the', '—', 'some'], correct: 0 },
  // ── MOD · Модальность ──
  { id: 'enrs-24', section: sec('MOD'), text: '(о рабочем отчёте) He ___ have written this report — he was in Bangkok all week.', options: ['mustn’t', 'can’t', 'shouldn’t', 'wouldn’t'], correct: 1 },
  { id: 'enrs-25', section: sec('MOD'), text: '(неудавшийся опыт) I don’t know why the reaction failed. The reagent ___ contaminated.', options: ['might be', 'might have been', 'must be', 'can have been'], correct: 1 },
  { id: 'enrs-26', section: sec('MOD'), text: '(перед лабораторной) You ___ bring your own goggles — the lab provides them.', options: ['mustn’t', 'don’t have to', 'shouldn’t', 'can’t'], correct: 1 },
  // ── NFN · Неличные формы ──
  { id: 'enrs-30', section: sec('NFN'), text: '(о преподавателе) She made us ___ the whole periodic table by heart.', options: ['to learn', 'learn', 'learning', 'learnt'], correct: 1 },
  { id: 'enrs-32', section: sec('NFN'), text: '(лаборатория) ___ the sample, we placed it under the microscope.', options: ['Having prepared', 'Prepared', 'Prepare', 'Being prepared'], correct: 0 },
  { id: 'enrs-33', section: sec('NFN'), text: '(разбор происшествия) He denied ___ the equipment.', options: ['to break', 'breaking', 'break', 'to have break'], correct: 1 },
  // ── CND · Условные и wish ──
  { id: 'enrs-36', section: sec('CND'), text: '(разбор ошибки) If she ___ the instructions, the reaction wouldn’t have failed.', options: ['read', 'had read', 'would read', 'has read'], correct: 1 },
  { id: 'enrs-37', section: sec('CND'), text: '(о выборе профессии) If I ___ chemistry at university, I’d be teaching biology now.', options: ['didn’t study', 'hadn’t studied', 'wouldn’t study', 'haven’t studied'], correct: 1 },
  { id: 'enrs-38', section: sec('CND'), text: '(на вокзале) I wish I ___ the platform number before I got on.', options: ['checked', 'had checked', 'would check', 'have checked'], correct: 1 },
  // ── PAS · Пассив и каузатив ──
  { id: 'enrs-41', section: sec('PAS'), text: '(в аптеке) I need to ___ my prescription renewed.', options: ['have', 'be', 'make', 'do'], correct: 0 },
  { id: 'enrs-42', section: sec('PAS'), text: '(фармакология) The drug ___ to reduce inflammation.', options: ['is said', 'says', 'is saying', 'said'], correct: 0 },
  { id: 'enrs-43', section: sec('PAS'), text: '(на вокзале) My bag ___ at the station last month.', options: ['got stolen', 'was stole', 'has stole', 'is stealing'], correct: 0 },
  // ── REL · Придаточные и cleft ──
  { id: 'enrs-44', section: sec('REL'), text: '(в аудитории) The student ___ notes I borrowed is in the front row.', options: ['who', 'whose', 'which', 'that'], correct: 1 },
  { id: 'enrs-46', section: sec('REL'), text: '(лаборатория) The reagents ___ in the fridge must be used within a week.', options: ['storing', 'stored', 'store', 'which storing'], correct: 1 },
  { id: 'enrs-47', section: sec('REL'), text: '(разбор неудачи) ___ was the temperature, not the catalyst, that ruined the reaction.', options: ['That', 'It', 'There', 'What'], correct: 1 },
  // ── REP · Косвенная речь и вопросы ──
  { id: 'enrs-48', section: sec('REP'), text: '(на вокзале) Could you tell me where ___?', options: ['is the pharmacy', 'the pharmacy is', 'does the pharmacy', 'is being the pharmacy'], correct: 1 },
  { id: 'enrs-49', section: sec('REP'), text: '(разговор с коллегой) He asked me whether I ___ the lecture the day before.', options: ['attended', 'had attended', 'have attended', 'attend'], correct: 1 },
  { id: 'enrs-50', section: sec('REP'), text: '(обсуждение сроков) She suggested ___ the deadline by a week.', options: ['to postpone', 'postponing', 'postpone', 'us postpone'], correct: 1 },
  // ── PRP · Предлоги и фразовые ──
  { id: 'enrs-53', section: sec('PRP'), text: '(лаборатория) The result depends ___ the concentration.', options: ['from', 'on', 'of', 'at'], correct: 1 },
  { id: 'enrs-55', section: sec('PRP'), text: '(чтение статьи) I’ve never seen this word — can you ___ for me?', options: ['look it up', 'look up it', 'look for it', 'look after it'], correct: 0 },
  { id: 'enrs-57', section: sec('PRP'), text: '(о курсе) I’m looking forward ___ the course next month.', options: ['to starting', 'to start', 'start', 'for starting'], correct: 0 },
  // ── DSC · Дискурс и порядок слов ──
  { id: 'enrs-58', section: sec('DSC'), text: '(урок химии) No sooner ___ the demonstration than the fire alarm went off.', options: ['had I started', 'I had started', 'did I start', 'I started'], correct: 0 },
  { id: 'enrs-59', section: sec('DSC'), text: '(о лекции) ___ the lecture was long, it was genuinely useful.', options: ['Despite', 'Although', 'However', 'In spite of'], correct: 1 },
  { id: 'enrs-60', section: sec('DSC'), text: '(описание реакции) The reaction is slow at room temperature, ___ at 60 °C it’s almost instant.', options: ['whereas', 'however', 'despite', 'meanwhile'], correct: 0 },
]

// ── Biology ────────────────────────────────────────────────────────────────────

export const BIOLOGY_DIAG_QUESTIONS: DiagQuestion[] = [
  // Молекулярная биология
  {
    id: 'bio-1',
    section: 'Молекулярная биология',
    text: 'Какой нуклеотид входит только в состав РНК (но не ДНК)?',
    options: ['Тимин', 'Урацил', 'Цитозин', 'Гуанин'],
    correct: 1,
  },
  {
    id: 'bio-2',
    section: 'Молекулярная биология',
    text: 'Функция рибосомы в клетке:',
    options: ['Синтез АТФ', 'Синтез ДНК', 'Синтез белка', 'Расщепление жиров'],
    correct: 2,
  },
  {
    id: 'bio-3',
    section: 'Молекулярная биология',
    text: 'В процессе трансляции информация считывается с молекулы:',
    options: ['ДНК', 'тРНК', 'иРНК', 'рРНК'],
    correct: 2,
  },
  // Клетка
  {
    id: 'bio-4',
    section: 'Строение клетки',
    text: 'Какой органоид отсутствует у прокариот?',
    options: ['Рибосомы', 'Клеточная мембрана', 'Митохондрии', 'Цитоплазма'],
    correct: 2,
  },
  {
    id: 'bio-5',
    section: 'Строение клетки',
    text: 'В каком органоиде синтезируется АТФ при аэробном дыхании?',
    options: ['Хлоропласт', 'Рибосома', 'Лизосома', 'Митохондрия'],
    correct: 3,
  },
  {
    id: 'bio-6',
    section: 'Строение клетки',
    text: 'Фагоцитоз — это:',
    options: [
      'Синтез белков на рибосомах',
      'Активный захват твёрдых частиц клеткой',
      'Транспорт ионов через мембрану',
      'Деление клетки',
    ],
    correct: 1,
  },
  // Обмен веществ
  {
    id: 'bio-7',
    section: 'Обмен веществ',
    text: 'Конечный продукт гликолиза (в анаэробных условиях у животных):',
    options: ['CO₂ и вода', 'Глюкоза', 'Молочная кислота', 'Кислород'],
    correct: 2,
  },
  {
    id: 'bio-8',
    section: 'Обмен веществ',
    text: 'В световую фазу фотосинтеза происходит:',
    options: [
      'Фиксация CO₂ и синтез глюкозы',
      'Синтез крахмала',
      'Фотолиз воды и синтез АТФ',
      'Восстановление НАДФ·Н₂',
    ],
    correct: 2,
  },
  {
    id: 'bio-9',
    section: 'Обмен веществ',
    text: 'Сколько молекул АТФ образуется при полном окислении одной молекулы глюкозы?',
    options: ['2', '10', '36–38', '100'],
    correct: 2,
  },
  // Наследственность
  {
    id: 'bio-10',
    section: 'Наследственность и изменчивость',
    text: 'При скрещивании гомозиготных особей AA × aa в F₁ получается:',
    options: ['Только AA', 'Только Aa', 'Только aa', '1 AA : 2 Aa : 1 aa'],
    correct: 1,
  },
  {
    id: 'bio-11',
    section: 'Наследственность и изменчивость',
    text: 'Мутации в половых клетках:',
    options: [
      'Не передаются потомству',
      'Всегда летальны',
      'Передаются потомству',
      'Встречаются только у растений',
    ],
    correct: 2,
  },
  {
    id: 'bio-12',
    section: 'Наследственность и изменчивость',
    text: 'Закон независимого наследования Менделя выполняется, если гены расположены:',
    options: [
      'В одной хромосоме (сцеплены)',
      'В разных парах гомологичных хромосом',
      'В одном локусе',
      'Только на половых хромосомах',
    ],
    correct: 1,
  },
  // Эволюция и экология
  {
    id: 'bio-13',
    section: 'Эволюция',
    text: 'Главная движущая сила эволюции по Дарвину:',
    options: [
      'Мутации',
      'Дрейф генов',
      'Естественный отбор',
      'Изоляция популяций',
    ],
    correct: 2,
  },
  {
    id: 'bio-14',
    section: 'Экология',
    text: 'Организмы, синтезирующие органику из неорганических веществ, называются:',
    options: ['Гетеротрофы', 'Деструкторы', 'Паразиты', 'Автотрофы'],
    correct: 3,
  },
  {
    id: 'bio-15',
    section: 'Экология',
    text: 'Какой уровень биологической организации изучает экология?',
    options: ['Молекулярный', 'Клеточный', 'Организменный', 'Популяционно-биосферный'],
    correct: 3,
  },
]

// ── Chemistry ──────────────────────────────────────────────────────────────────

export const CHEMISTRY_DIAG_QUESTIONS: DiagQuestion[] = [
  // ── 1. Строение атома и ПСЭ ───────────────────────────────────────────────
  {
    id: 'chem-1',
    section: 'Строение атома и ПСЭ',
    text: 'Какой элемент обладает наибольшей электроотрицательностью?',
    options: ['Кислород', 'Хлор', 'Фтор', 'Азот'],
    correct: 2,
  },
  {
    id: 'chem-2',
    section: 'Строение атома и ПСЭ',
    text: 'Число электронов в ионе Ca²⁺ (Z = 20):',
    options: ['22', '20', '18', '24'],
    correct: 2,
  },
  {
    id: 'chem-3',
    section: 'Строение атома и ПСЭ',
    text: 'В периодической системе металлические свойства усиливаются при движении:',
    options: [
      'Слева направо по периоду',
      'Справа налево по периоду и сверху вниз по группе',
      'Снизу вверх по группе',
      'По диагонали справа налево',
    ],
    correct: 1,
  },
  {
    id: 'chem-3b',
    section: 'Строение атома и ПСЭ',
    text: 'Электронная конфигурация атома серы (Z = 16) в основном состоянии:',
    options: ['1s²2s²2p⁶3s²3p²', '1s²2s²2p⁶3s²3p⁴', '1s²2s²2p⁶3s²3p⁶', '1s²2s²2p⁴3s²3p⁶'],
    correct: 1,
  },
  // ── 2. Химическая связь ───────────────────────────────────────────────────
  {
    id: 'chem-4',
    section: 'Химическая связь',
    text: 'Тип химической связи в молекуле NaCl:',
    options: ['Ковалентная неполярная', 'Ковалентная полярная', 'Ионная', 'Металлическая'],
    correct: 2,
  },
  {
    id: 'chem-5',
    section: 'Химическая связь',
    text: 'Водородная связь характерна для:',
    options: ['CH₄', 'CCl₄', 'H₂O', 'NaCl'],
    correct: 2,
  },
  {
    id: 'chem-6',
    section: 'Химическая связь',
    text: 'Гибридизация атома углерода в молекуле CH₄:',
    options: ['sp', 'sp²', 'sp³', 'sp³d'],
    correct: 2,
  },
  {
    id: 'chem-6b',
    section: 'Химическая связь',
    text: 'Молекула H₂O является полярной, потому что:',
    options: [
      'Кислород — самый электроотрицательный элемент',
      'Молекула имеет угловую форму и связи полярны',
      'Водород образует водородные связи',
      'Молекула имеет линейную форму',
    ],
    correct: 1,
  },
  // ── 3. Классы неорганических соединений ──────────────────────────────────
  {
    id: 'chem-7',
    section: 'Классы неорганических соединений',
    text: 'При взаимодействии кислотного оксида SO₃ с водой образуется:',
    options: ['Основание', 'Серная кислота', 'Соль', 'Оксид серы (IV)'],
    correct: 1,
  },
  {
    id: 'chem-8',
    section: 'Классы неорганических соединений',
    text: 'Na₂CO₃ — это:',
    options: ['Кислота', 'Основание', 'Средняя соль', 'Кислотный оксид'],
    correct: 2,
  },
  {
    id: 'chem-9',
    section: 'Классы неорганических соединений',
    text: 'Амфотерный гидроксид — это соединение, которое реагирует:',
    options: [
      'Только с кислотами',
      'Только с основаниями',
      'Как с кислотами, так и с основаниями',
      'Только с водой',
    ],
    correct: 2,
  },
  {
    id: 'chem-9b',
    section: 'Классы неорганических соединений',
    text: 'Какая из перечисленных солей подвергается гидролизу по катиону?',
    options: ['KNO₃', 'NaCl', 'CuSO₄', 'K₂SO₄'],
    correct: 2,
  },
  // ── 4. ОВР и степени окисления (боль!) ───────────────────────────────────
  {
    id: 'chem-ovr-1',
    section: 'ОВР и степени окисления',
    text: 'Степень окисления серы в H₂SO₄:',
    options: ['-2', '0', '+4', '+6'],
    correct: 3,
  },
  {
    id: 'chem-ovr-2',
    section: 'ОВР и степени окисления',
    text: 'В реакции Fe + 2HCl → FeCl₂ + H₂ восстановителем является:',
    options: ['HCl', 'H₂', 'Fe', 'FeCl₂'],
    correct: 2,
  },
  {
    id: 'chem-ovr-3',
    section: 'ОВР и степени окисления',
    text: 'Степень окисления хлора в KClO₃:',
    options: ['-1', '0', '+5', '+7'],
    correct: 2,
  },
  {
    id: 'chem-ovr-4',
    section: 'ОВР и степени окисления',
    text: 'Какой процесс называется окислением?',
    options: [
      'Присоединение электронов',
      'Отдача электронов и повышение степени окисления',
      'Понижение степени окисления',
      'Присоединение кислорода только в органике',
    ],
    correct: 1,
  },
  // ── 5. Ионные реакции и электролиты (боль!) ──────────────────────────────
  {
    id: 'chem-ion-1',
    section: 'Ионные реакции и электролиты',
    text: 'Какое из перечисленных веществ является сильным электролитом?',
    options: ['CH₃COOH', 'H₂O', 'NH₃', 'HNO₃'],
    correct: 3,
  },
  {
    id: 'chem-ion-2',
    section: 'Ионные реакции и электролиты',
    text: 'Ионная реакция протекает до конца, если образуется:',
    options: [
      'Растворимая соль',
      'Осадок, газ или слабый электролит (вода)',
      'Только кислота',
      'Любое новое вещество',
    ],
    correct: 1,
  },
  {
    id: 'chem-ion-3',
    section: 'Ионные реакции и электролиты',
    text: 'Краткое ионное уравнение H⁺ + OH⁻ → H₂O отражает реакцию:',
    options: [
      'Нейтрализации любой кислоты и любого основания',
      'Нейтрализации сильной кислоты сильным основанием',
      'Растворения кислоты в воде',
      'Гидролиза соли',
    ],
    correct: 1,
  },
  {
    id: 'chem-ion-4',
    section: 'Ионные реакции и электролиты',
    text: 'Раствор какой соли имеет щелочную реакцию среды (pH > 7)?',
    options: ['NH₄Cl', 'NaCl', 'Na₂CO₃', 'FeCl₃'],
    correct: 2,
  },
  // ── 6. Химические реакции ─────────────────────────────────────────────────
  {
    id: 'chem-10',
    section: 'Химические реакции',
    text: 'Реакция нейтрализации — это взаимодействие:',
    options: ['Двух солей', 'Кислоты и основания', 'Металла с кислотой', 'Двух оксидов'],
    correct: 1,
  },
  {
    id: 'chem-11',
    section: 'Химические реакции',
    text: 'В реакции 2H₂ + O₂ → 2H₂O водород является:',
    options: ['Окислителем', 'Восстановителем', 'Катализатором', 'Продуктом реакции'],
    correct: 1,
  },
  {
    id: 'chem-12',
    section: 'Химические реакции',
    text: 'Скорость гомогенной реакции увеличивается при:',
    options: [
      'Понижении температуры',
      'Уменьшении концентрации реагентов',
      'Повышении температуры и концентрации',
      'Удалении катализатора',
    ],
    correct: 2,
  },
  {
    id: 'chem-12b',
    section: 'Химические реакции',
    text: 'По принципу Ле Шателье при повышении давления равновесие сместится в сторону:',
    options: [
      'Реагентов всегда',
      'Меньшего числа молей газа',
      'Большего числа молей газа',
      'Давление не влияет на равновесие',
    ],
    correct: 1,
  },
  // ── 7. Органическая химия ─────────────────────────────────────────────────
  {
    id: 'chem-13',
    section: 'Органическая химия',
    text: 'К предельным углеводородам (алканам) относится:',
    options: ['Этилен C₂H₄', 'Ацетилен C₂H₂', 'Этан C₂H₆', 'Бензол C₆H₆'],
    correct: 2,
  },
  {
    id: 'chem-14',
    section: 'Органическая химия',
    text: 'Реакция этерификации — это взаимодействие:',
    options: [
      'Двух кислот',
      'Спирта с карбоновой кислотой',
      'Альдегида с основанием',
      'Двух спиртов',
    ],
    correct: 1,
  },
  {
    id: 'chem-15',
    section: 'Органическая химия',
    text: 'Гидролиз белков приводит к образованию:',
    options: ['Нуклеотидов', 'Жирных кислот', 'Аминокислот', 'Моносахаридов'],
    correct: 2,
  },
  {
    id: 'chem-15b',
    section: 'Органическая химия',
    text: 'Характерная реакция алкенов (этилен, пропилен) — это:',
    options: [
      'Замещение (галогенирование без катализатора)',
      'Присоединение (гидрирование, галогенирование)',
      'Дегидрирование',
      'Разложение',
    ],
    correct: 1,
  },
  // ── 8. Расчёты по формулам и уравнениям (боль!) ──────────────────────────
  {
    id: 'chem-calc-1',
    section: 'Расчёты и стехиометрия',
    text: 'Молярная масса серной кислоты H₂SO₄:',
    options: ['49 г/моль', '80 г/моль', '98 г/моль', '64 г/моль'],
    correct: 2,
  },
  {
    id: 'chem-calc-2',
    section: 'Расчёты и стехиометрия',
    text: 'Сколько молей NaCl содержится в 117 г вещества (M = 58,5 г/моль)?',
    options: ['1 моль', '2 моля', '0,5 моля', '4 моля'],
    correct: 1,
  },
  {
    id: 'chem-calc-3',
    section: 'Расчёты и стехиометрия',
    text: 'По уравнению 2H₂ + O₂ → 2H₂O из 4 моль H₂ образуется воды:',
    options: ['2 моля', '4 моля', '6 молей', '1 моль'],
    correct: 1,
  },
  {
    id: 'chem-calc-4',
    section: 'Расчёты и стехиометрия',
    text: 'Объём 2 молей любого газа при н.у. (STP, 0°C, 101,3 кПа) равен:',
    options: ['11,2 л', '22,4 л', '44,8 л', '33,6 л'],
    correct: 2,
  },
]

// ── Biology extras: Анатомия, Зоология, Ботаника ─────────────────────────────

export const BIOLOGY_EXTRA_QUESTIONS: DiagQuestion[] = [
  // Анатомия человека
  {
    id: 'bio-16',
    section: 'Анатомия человека',
    text: 'Основная функция эритроцитов крови:',
    options: ['Защита от инфекций', 'Свёртывание крови', 'Перенос кислорода и CO₂', 'Синтез антител'],
    correct: 2,
  },
  {
    id: 'bio-17',
    section: 'Анатомия человека',
    text: 'В каком отделе пищеварительного тракта происходит основное всасывание питательных веществ?',
    options: ['Желудок', 'Тонкий кишечник', 'Толстый кишечник', 'Двенадцатиперстная кишка'],
    correct: 1,
  },
  {
    id: 'bio-18',
    section: 'Анатомия человека',
    text: 'Антитела (иммуноглобулины) синтезируются:',
    options: ['T-лимфоцитами', 'Нейтрофилами', 'B-лимфоцитами', 'Тромбоцитами'],
    correct: 2,
  },
  {
    id: 'bio-19',
    section: 'Анатомия человека',
    text: 'Какой орган является главным органом детоксикации в организме человека?',
    options: ['Почки', 'Лёгкие', 'Селезёнка', 'Печень'],
    correct: 3,
  },
  // Зоология
  {
    id: 'bio-20',
    section: 'Зоология',
    text: 'Кит относится к классу:',
    options: ['Рыбы', 'Пресмыкающиеся', 'Млекопитающие', 'Земноводные'],
    correct: 2,
  },
  {
    id: 'bio-21',
    section: 'Зоология',
    text: 'Чем насекомые отличаются от паукообразных?',
    options: [
      'Наличием хитинового покрова',
      '6 ногами против 8 у паукообразных',
      'Отсутствием нервной системы',
      'Способностью к метаморфозу',
    ],
    correct: 1,
  },
  {
    id: 'bio-22',
    section: 'Зоология',
    text: 'Земноводные откладывают яйца:',
    options: [
      'На суше, в твёрдой скорлупе',
      'В воде, без твёрдой оболочки',
      'В почве, в коконе',
      'Живородящие — яиц не откладывают',
    ],
    correct: 1,
  },
  // Ботаника
  {
    id: 'bio-23',
    section: 'Ботаника',
    text: 'Ксилема растений проводит:',
    options: [
      'Органические вещества от листьев к корням',
      'Воду и минеральные соли от корней к листьям',
      'Кислород из листьев к корням',
      'Глюкозу от корней к побегам',
    ],
    correct: 1,
  },
  {
    id: 'bio-24',
    section: 'Ботаника',
    text: 'Камбий — это образовательная ткань, обеспечивающая:',
    options: [
      'Фотосинтез в листьях',
      'Проведение воды по стеблю',
      'Рост стебля в толщину',
      'Поглощение воды корнями',
    ],
    correct: 2,
  },
  {
    id: 'bio-25',
    section: 'Ботаника',
    text: 'При перекрёстном опылении пыльца переносится:',
    options: [
      'С тычинки на пестик того же цветка',
      'С цветка одного растения на цветок другого растения того же вида',
      'Только с помощью насекомых',
      'Внутри одного соцветия',
    ],
    correct: 1,
  },
]

// ── Logic / Cognitive screening ───────────────────────────────────────────────
// 18 questions across 6 cognitive dimensions.
// Sections map to teacher-visible "сильные стороны" of the student.

export const LOGIC_DIAG_QUESTIONS: DiagQuestion[] = [
  // Числовые паттерны
  {
    id: 'log-1',
    section: 'Числовые паттерны',
    text: 'Продолжи последовательность: 2, 4, 8, 16, ?',
    options: ['24', '32', '20', '64'],
    correct: 1,
  },
  {
    id: 'log-2',
    section: 'Числовые паттерны',
    text: 'Продолжи последовательность: 1, 4, 9, 16, ?',
    options: ['20', '23', '25', '36'],
    correct: 2,
  },
  {
    id: 'log-3',
    section: 'Числовые паттерны',
    text: 'Разности между соседними числами: 100, 90, 81, 73, ?. Найди следующее.',
    options: ['65', '66', '68', '64'],
    correct: 1,
  },
  // Вербальные аналогии
  {
    id: 'log-4',
    section: 'Вербальные аналогии',
    text: 'Врач : Больница = Учитель : ?',
    options: ['Ученик', 'Школа', 'Урок', 'Класс'],
    correct: 1,
  },
  {
    id: 'log-5',
    section: 'Вербальные аналогии',
    text: 'Птица : Крылья = Рыба : ?',
    options: ['Хвост', 'Жабры', 'Плавники', 'Чешуя'],
    correct: 2,
  },
  {
    id: 'log-6',
    section: 'Вербальные аналогии',
    text: 'Горячий : Холодный = Быстрый : ?',
    options: ['Сильный', 'Медленный', 'Тихий', 'Лёгкий'],
    correct: 1,
  },
  // Логические исключения
  {
    id: 'log-7',
    section: 'Логические исключения',
    text: 'Что лишнее? Кошка, Собака, Орёл, Корова.',
    options: ['Кошка', 'Собака', 'Орёл', 'Корова'],
    correct: 2,
  },
  {
    id: 'log-8',
    section: 'Логические исключения',
    text: 'Что лишнее? 2, 4, 5, 6, 8.',
    options: ['2', '4', '5', '8'],
    correct: 2,
  },
  {
    id: 'log-9',
    section: 'Логические исключения',
    text: 'Что лишнее? Треугольник, Квадрат, Ромб, Круг.',
    options: ['Треугольник', 'Квадрат', 'Ромб', 'Круг'],
    correct: 3,
  },
  // Математические вычисления
  {
    id: 'log-10',
    section: 'Математические вычисления',
    text: '3 ручки стоят 45 рублей. Сколько стоят 7 ручек?',
    options: ['95 руб', '105 руб', '100 руб', '115 руб'],
    correct: 1,
  },
  {
    id: 'log-11',
    section: 'Математические вычисления',
    text: '25% от 80 равно:',
    options: ['15', '25', '20', '40'],
    correct: 2,
  },
  {
    id: 'log-12',
    section: 'Математические вычисления',
    text: 'Поезд едет со скоростью 90 км/ч. За 2 часа он проедет:',
    options: ['180 км', '45 км', '200 км', '160 км'],
    correct: 0,
  },
  // Пространственное мышление
  {
    id: 'log-13',
    section: 'Пространственное мышление',
    text: 'Лист бумаги сложили пополам, потом ещё раз пополам. Сколько получилось слоёв?',
    options: ['2', '3', '4', '8'],
    correct: 2,
  },
  {
    id: 'log-14',
    section: 'Пространственное мышление',
    text: 'Куб разрезали вертикально ровно посередине. Сколько граней у каждой полученной половины?',
    options: ['4', '5', '6', '3'],
    correct: 1,
  },
  {
    id: 'log-15',
    section: 'Пространственное мышление',
    text: 'Квадрат 4×4 разрезали на квадраты 1×1. Сколько получилось кусков?',
    options: ['8', '12', '16', '4'],
    correct: 2,
  },
  // Причинно-следственные связи
  {
    id: 'log-16',
    section: 'Причинно-следственные связи',
    text: 'Если убрать из экосистемы всех хищников, то численность травоядных...',
    options: [
      'Резко сократится',
      'Останется прежней',
      'Резко вырастет, а затем упадёт из-за нехватки пищи',
      'Будет плавно расти бесконечно',
    ],
    correct: 2,
  },
  {
    id: 'log-17',
    section: 'Причинно-следственные связи',
    text: 'При резком увеличении концентрации CO₂ в атмосфере средняя температура Земли...',
    options: [
      'Понизится — CO₂ охлаждает воздух',
      'Повысится — усилится парниковый эффект',
      'Не изменится — CO₂ не влияет на климат',
      'Сначала понизится, потом повысится',
    ],
    correct: 1,
  },
  {
    id: 'log-18',
    section: 'Причинно-следственные связи',
    text: 'Ученик занимается по 1 часу каждый день вместо 7 часов один раз в неделю. Что произойдёт?',
    options: [
      'Ничего не изменится — суммарное время одинаковое',
      'Материал запомнится хуже — нужны длинные сессии',
      'Материал запомнится лучше — интервальное повторение эффективнее',
      'Усталость накопится быстрее',
    ],
    correct: 2,
  },
]

// ── AP Chemistry (Russian) ────────────────────────────────────────────────────

export const AP_CHEM_RU_QUESTIONS: DiagQuestion[] = [
  // Атомная структура
  { id: 'apcru-1', section: 'Атомная структура', text: 'Квантовое число, определяющее форму орбитали:', options: ['Главное (n)', 'Орбитальное (l)', 'Магнитное (mₗ)', 'Спиновое (mₛ)'], correct: 1 },
  { id: 'apcru-2', section: 'Атомная структура', text: 'Изотопы отличаются друг от друга:', options: ['Числом протонов', 'Числом электронов', 'Числом нейтронов', 'Зарядом ядра'], correct: 2 },
  { id: 'apcru-3', section: 'Атомная структура', text: 'Электронная конфигурация иона Fe³⁺ (железо — Z=26):', options: ['[Ar] 3d⁶ 4s⁰', '[Ar] 3d⁵ 4s⁰', '[Ar] 3d⁶ 4s²', '[Ar] 3d⁴ 4s¹'], correct: 1 },
  // Химическая связь
  { id: 'apcru-4', section: 'Химическая связь и молекулярная структура', text: 'Молекула CO₂ имеет форму:', options: ['Угловую', 'Линейную', 'Тетраэдрическую', 'Тригонально-плоскостную'], correct: 1 },
  { id: 'apcru-5', section: 'Химическая связь и молекулярная структура', text: 'По теории VSEPR молекула SF₆ имеет геометрию:', options: ['Октаэдрическую', 'Тригонально-бипирамидальную', 'Тетраэдрическую', 'Квадратно-планарную'], correct: 0 },
  { id: 'apcru-6', section: 'Химическая связь и молекулярная структура', text: 'Гибридизация углерода в молекуле ацетилена C₂H₂:', options: ['sp³', 'sp²', 'sp', 'dsp²'], correct: 2 },
  // Межмолекулярные силы
  { id: 'apcru-7', section: 'Межмолекулярные силы', text: 'Самый сильный тип межмолекулярного взаимодействия:', options: ['Дисперсионные силы Лондона', 'Диполь-дипольное', 'Водородная связь', 'Ион-дипольное'], correct: 3 },
  { id: 'apcru-8', section: 'Межмолекулярные силы', text: 'HF имеет аномально высокую точку кипения из-за:', options: ['Большой молекулярной массы', 'Водородных связей', 'Ионной связи', 'Ковалентных сетей'], correct: 1 },
  // Термодинамика
  { id: 'apcru-9', section: 'Термодинамика', text: 'Процесс самопроизвольный при любой температуре, если:', options: ['ΔH < 0, ΔS < 0', 'ΔH > 0, ΔS > 0', 'ΔH < 0, ΔS > 0', 'ΔH > 0, ΔS < 0'], correct: 2 },
  { id: 'apcru-10', section: 'Термодинамика', text: 'Первый закон термодинамики утверждает:', options: ['Энтропия изолированной системы возрастает', 'Энергия не создаётся и не уничтожается', 'При 0 К энтропия совершенного кристалла равна нулю', 'ΔG = ΔH − TΔS'], correct: 1 },
  { id: 'apcru-11', section: 'Термодинамика', text: 'Стандартная энтальпия образования простого вещества в стандартном состоянии:', options: ['Положительная', 'Отрицательная', 'Равна нулю', 'Зависит от давления'], correct: 2 },
  // Кинетика
  { id: 'apcru-12', section: 'Кинетика', text: 'Если концентрацию реагента А удвоить и скорость реакции увеличится в 4 раза, порядок реакции по А:', options: ['0', '1', '2', '3'], correct: 2 },
  { id: 'apcru-13', section: 'Кинетика', text: 'Катализатор увеличивает скорость реакции, потому что:', options: ['Сдвигает равновесие вправо', 'Снижает энергию активации', 'Увеличивает температуру', 'Уменьшает ΔH реакции'], correct: 1 },
  // Равновесие
  { id: 'apcru-14', section: 'Химическое равновесие', text: 'Если Kc >> 1, то реакция:', options: ['Практически не идёт', 'Идёт в обратном направлении', 'Практически полностью идёт вправо', 'Находится точно посередине'], correct: 2 },
  { id: 'apcru-15', section: 'Химическое равновесие', text: 'По принципу Ле Шателье, увеличение давления сдвигает равновесие в сторону:', options: ['Большего числа молей газа', 'Меньшего числа молей газа', 'Не влияет на равновесие', 'Зависит от температуры'], correct: 1 },
  // Кислоты и основания
  { id: 'apcru-16', section: 'Кислоты и основания', text: 'pH буферного раствора рассчитывается по уравнению Хендерсона-Хассельбальха:', options: ['pH = pKa + lg([A⁻]/[HA])', 'pH = -lg[H⁺]', 'pH = pKw − pOH', 'pH = pKb − lg([B]/[BH⁺])'], correct: 0 },
  { id: 'apcru-17', section: 'Кислоты и основания', text: 'Слабая кислота HA имеет Ka = 1×10⁻⁵. pKa равен:', options: ['−5', '5', '10', '0.5'], correct: 1 },
  // Электрохимия
  { id: 'apcru-18', section: 'Электрохимия', text: 'В гальваническом элементе окисление происходит на:', options: ['Катоде', 'Аноде', 'Обоих электродах', 'В солевом мостике'], correct: 1 },
  { id: 'apcru-19', section: 'Электрохимия', text: 'Уравнение Нернста позволяет рассчитать ЭДС при:', options: ['Стандартных условиях', 'Нестандартных концентрациях', 'Любой температуре одинаково', 'Только при 0 К'], correct: 1 },
  { id: 'apcru-20', section: 'Электрохимия', text: 'Самопроизвольная электрохимическая реакция имеет:', options: ['E°cell < 0, ΔG > 0', 'E°cell > 0, ΔG < 0', 'E°cell = 0, ΔG = 0', 'E°cell > 0, ΔG > 0'], correct: 1 },
]

// ── AP Chemistry (English) ────────────────────────────────────────────────────

export const AP_CHEM_EN_QUESTIONS: DiagQuestion[] = [
  // Atomic Structure
  { id: 'apcen-1', section: 'Atomic Structure', text: 'The quantum number that describes the shape of an orbital is:', options: ['Principal (n)', 'Angular momentum (l)', 'Magnetic (mₗ)', 'Spin (mₛ)'], correct: 1 },
  { id: 'apcen-2', section: 'Atomic Structure', text: 'Isotopes of the same element differ in their:', options: ['Number of protons', 'Number of electrons', 'Number of neutrons', 'Atomic number'], correct: 2 },
  { id: 'apcen-3', section: 'Atomic Structure', text: 'The electron configuration of Fe³⁺ (Z = 26) is:', options: ['[Ar] 3d⁶ 4s⁰', '[Ar] 3d⁵ 4s⁰', '[Ar] 3d⁶ 4s²', '[Ar] 3d⁴ 4s¹'], correct: 1 },
  // Bonding & Structure
  { id: 'apcen-4', section: 'Bonding and Molecular Structure', text: 'According to VSEPR theory, the geometry of SF₆ is:', options: ['Octahedral', 'Trigonal bipyramidal', 'Tetrahedral', 'Square planar'], correct: 0 },
  { id: 'apcen-5', section: 'Bonding and Molecular Structure', text: 'The hybridization of carbon in acetylene (C₂H₂) is:', options: ['sp³', 'sp²', 'sp', 'dsp²'], correct: 2 },
  { id: 'apcen-6', section: 'Bonding and Molecular Structure', text: 'Which molecule is polar?', options: ['CO₂', 'BF₃', 'H₂O', 'CCl₄'], correct: 2 },
  // Intermolecular Forces
  { id: 'apcen-7', section: 'Intermolecular Forces', text: 'The strongest type of intermolecular force is:', options: ['London dispersion', 'Dipole-dipole', 'Hydrogen bonding', 'Ion-dipole'], correct: 3 },
  { id: 'apcen-8', section: 'Intermolecular Forces', text: 'HF has an abnormally high boiling point due to:', options: ['High molar mass', 'Hydrogen bonding', 'Ionic character', 'Covalent network'], correct: 1 },
  // Thermodynamics
  { id: 'apcen-9', section: 'Thermodynamics', text: 'A reaction is spontaneous at all temperatures when:', options: ['ΔH < 0, ΔS < 0', 'ΔH > 0, ΔS > 0', 'ΔH < 0, ΔS > 0', 'ΔH > 0, ΔS < 0'], correct: 2 },
  { id: 'apcen-10', section: 'Thermodynamics', text: 'The standard enthalpy of formation of an element in its standard state is:', options: ['Positive', 'Negative', 'Zero', 'Pressure-dependent'], correct: 2 },
  { id: 'apcen-11', section: 'Thermodynamics', text: 'Which process has the greatest increase in entropy?', options: ['H₂O(l) → H₂O(s)', 'CaCO₃(s) → CaO(s) + CO₂(g)', 'N₂(g) + 3H₂(g) → 2NH₃(g)', 'NaCl(s) → Na⁺(aq) + Cl⁻(aq)'], correct: 1 },
  // Kinetics
  { id: 'apcen-12', section: 'Kinetics', text: 'If doubling [A] quadruples the reaction rate, the order with respect to A is:', options: ['0', '1', '2', '3'], correct: 2 },
  { id: 'apcen-13', section: 'Kinetics', text: 'A catalyst increases reaction rate by:', options: ['Shifting equilibrium right', 'Lowering activation energy', 'Raising the temperature', 'Decreasing ΔH'], correct: 1 },
  { id: 'apcen-14', section: 'Kinetics', text: 'For a first-order reaction, the half-life is:', options: ['Dependent on initial concentration', 'Independent of initial concentration', 'Equal to 1/k', 'Proportional to [A]₀²'], correct: 1 },
  // Equilibrium
  { id: 'apcen-15', section: 'Chemical Equilibrium', text: 'If Kc >> 1, the reaction:', options: ['Barely proceeds forward', 'Favors the reverse', 'Goes nearly to completion', 'Is at exact midpoint'], correct: 2 },
  { id: 'apcen-16', section: 'Chemical Equilibrium', text: 'According to Le Châtelier\'s principle, increasing pressure shifts equilibrium toward:', options: ['More moles of gas', 'Fewer moles of gas', 'No effect', 'Higher temperature side'], correct: 1 },
  // Acids and Bases
  { id: 'apcen-17', section: 'Acids and Bases', text: 'The Henderson-Hasselbalch equation is: pH =', options: ['pKa + log([A⁻]/[HA])', '-log[H⁺]', 'pKw − pOH', 'pKb − log([B]/[BH⁺])'], correct: 0 },
  { id: 'apcen-18', section: 'Acids and Bases', text: 'A weak acid has Ka = 1×10⁻⁵. Its pKa is:', options: ['−5', '5', '10', '0.5'], correct: 1 },
  // Electrochemistry
  { id: 'apcen-19', section: 'Electrochemistry', text: 'In a galvanic cell, oxidation occurs at the:', options: ['Cathode', 'Anode', 'Salt bridge', 'Both electrodes'], correct: 1 },
  { id: 'apcen-20', section: 'Electrochemistry', text: 'A spontaneous electrochemical cell has:', options: ['E°cell < 0, ΔG > 0', 'E°cell > 0, ΔG < 0', 'E°cell = 0, ΔG = 0', 'E°cell > 0, ΔG > 0'], correct: 1 },
]

export const DEFAULT_QUESTIONS: Record<DiagSubject, DiagQuestion[]> = {
  biology: [...BIOLOGY_DIAG_QUESTIONS, ...BIOLOGY_EXTRA_QUESTIONS],
  chemistry: CHEMISTRY_DIAG_QUESTIONS,
  logic: LOGIC_DIAG_QUESTIONS,
  'ap-chem-ru': AP_CHEM_RU_QUESTIONS,
  'ap-chem-en': AP_CHEM_EN_QUESTIONS,
  'eng-placement': ENGLISH_PLACEMENT_QUESTIONS,
  'kor-placement': KOREAN_PLACEMENT_QUESTIONS,
  'eng-restore': ENGLISH_RESTORE_QUESTIONS,
}
