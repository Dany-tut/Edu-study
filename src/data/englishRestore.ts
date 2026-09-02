// Диагностика «Английский — восстановление B2» (Конструктор → Тестирование, ключ eng-restore).
//
// Отличается от eng-placement принципом нарезки. Placement режет вопросы по
// УРОВНЯМ (A2 · Grammar, B1 · Grammar…) и отвечает на вопрос «какой у ученика
// уровень». Эта диагностика режет по СИСТЕМАМ ЯЗЫКА и отвечает на другой
// вопрос: «что именно осыпалось у ученика, который уровень уже когда-то имел».
// Такое бывает после долгого перерыва: узнавание держится, производство — нет.
//
// Код системы в префиксе section до « · » (ART, MOD, NFN…) одновременно
// является номером дня в 14-дневной программе восстановления, см. SYSTEM_DAY.
// Разбивка по разделам у учителя за счёт этого сразу читается как план:
// провалившаяся система = день, который нужно расширить.
//
// Контексты примеров намеренно бытовые и профессиональные (урок химии, метро,
// аптека, касса), а не учебные: конструкция должна узнаваться в той обстановке,
// где ей предстоит работать.

import type { DiagQuestion, DiagResults } from './diagnosticData'
import type { PlacementVerdict } from './placementTests'

// Система → день программы. Порядок = порядок дней.
export const SYSTEM_DAY: Record<string, { day: number; name: string }> = {
  TNS: { day: 1,  name: 'Времена и вид' },
  PRF: { day: 2,  name: 'Перфект' },
  FUT: { day: 3,  name: 'Будущее' },
  ART: { day: 4,  name: 'Артикли и исчисляемость' },
  MOD: { day: 5,  name: 'Модальность' },
  NFN: { day: 6,  name: 'Неличные формы' },
  CND: { day: 7,  name: 'Условные и wish' },
  PAS: { day: 8,  name: 'Пассив и каузатив' },
  REL: { day: 9,  name: 'Придаточные и cleft' },
  REP: { day: 10, name: 'Косвенная речь и вопросы' },
  PRP: { day: 11, name: 'Предлоги и фразовые' },
  DSC: { day: 12, name: 'Дискурс и порядок слов' },
}

export const SYSTEM_ORDER = Object.keys(SYSTEM_DAY)

const sec = (code: string) => `${code} · ${SYSTEM_DAY[code].name}`

export const ENGLISH_RESTORE_QUESTIONS: DiagQuestion[] = [
  // ── TNS · Времена и вид ──
  { id: 'enrs-1', section: sec('TNS'), text: '(урок химии) I ___ this experiment takes about forty minutes, so we should start now.', options: ['am thinking', 'think', 'have thought', 'was thinking'], correct: 1 },
  { id: 'enrs-2', section: sec('TNS'), text: '(в метро) Sorry, I can’t talk — I ___ on the platform and my train leaves in two minutes.', options: ['stand', 'am standing', 'have stood', 'stood'], correct: 1 },
  { id: 'enrs-3', section: sec('TNS'), text: '(урок химии) While I ___ the solution, one of the students knocked over the beaker.', options: ['heated', 'was heating', 'have heated', 'had heated'], correct: 1 },
  { id: 'enrs-4', section: sec('TNS'), text: '(о преподавании) When I first started teaching, I ___ write every formula on the board by hand.', options: ['used to', 'was used to', 'would have', 'am used to'], correct: 0 },
  { id: 'enrs-5', section: sec('TNS'), text: '(лекция по нейробиологии) Look at the slide — ___ what I mean about the membrane?', options: ['do you see', 'are you seeing', 'have you been seeing', 'were you seeing'], correct: 0 },
  // ── PRF · Перфект ──
  { id: 'enrs-6', section: sec('PRF'), text: '(в аптеке) How long ___ this cough?', options: ['do you have', 'have you had', 'are you having', 'did you have'], correct: 1 },
  { id: 'enrs-7', section: sec('PRF'), text: '(утро перед уроком) My hands are shaking — I ___ coffee since six this morning.', options: ['drank', 'have drunk', 'have been drinking', 'had drunk'], correct: 2 },
  { id: 'enrs-8', section: sec('PRF'), text: '(лекционный зал) She ___ already ___ the slides by the time I got there.', options: ['has / prepared', 'had / prepared', 'was / preparing', 'did / prepare'], correct: 1 },
  { id: 'enrs-9', section: sec('PRF'), text: '(в аптеке) I ___ to that pharmacy twice this week, and they still don’t have it.', options: ['went', 'have been', 'have gone', 'had been'], correct: 1 },
  { id: 'enrs-10', section: sec('PRF'), text: '(на вокзале) When I got to the station, the train ___ five minutes earlier.', options: ['just left', 'had left', 'has left', 'was leaving'], correct: 1 },
  { id: 'enrs-11', section: sec('PRF'), text: '(на кассе) I can’t find my card. ___ it anywhere?', options: ['Did you see', 'Have you seen', 'Are you seeing', 'Had you seen'], correct: 1 },
  // ── FUT · Будущее ──
  { id: 'enrs-12', section: sec('FUT'), text: '(лаборатория) I’ll email you when the results ___.', options: ['will come', 'come', 'will have come', 'are going to come'], correct: 1 },
  { id: 'enrs-13', section: sec('FUT'), text: '(урок химии) Careful — that beaker ___!', options: ['will fall', 'is going to fall', 'falls', 'will be falling'], correct: 1 },
  { id: 'enrs-14', section: sec('FUT'), text: '(через неделю) This time next week I ___ in a classroom in Bangkok.', options: ['will sit', 'will be sitting', 'am sitting', 'will have sat'], correct: 1 },
  { id: 'enrs-15', section: sec('FUT'), text: '(курс анатомии) By the end of the course we ___ all twelve body systems.', options: ['will cover', 'will have covered', 'will be covering', 'cover'], correct: 1 },
  // ── ART · Артикли и исчисляемость ──
  { id: 'enrs-16', section: sec('ART'), text: '(в аптеке) Could I have ___ information about the side effects?', options: ['an', 'some', 'a few', 'any'], correct: 1 },
  { id: 'enrs-17', section: sec('ART'), text: '(лекция по нейробиологии) ___ human brain contains roughly 86 billion neurons.', options: ['A', 'The', '—', 'Some'], correct: 1 },
  { id: 'enrs-18', section: sec('ART'), text: '(о группе) She’s ___ best student in the group by a long way.', options: ['a', 'the', '—', 'one'], correct: 1 },
  { id: 'enrs-19', section: sec('ART'), text: '(в магазине) I picked up ___ litre of milk and ___ bread on the way home.', options: ['a / a', 'a / some', 'the / a', '— / some'], correct: 1 },
  { id: 'enrs-20', section: sec('ART'), text: '(на кассе) There were ___ people at the checkout that I was late for my lesson.', options: ['so many', 'so much', 'such many', 'too many'], correct: 0 },
  { id: 'enrs-21', section: sec('ART'), text: '(курс анатомии) He gave us ___ advice on dissection technique.', options: ['many', 'a lot of', 'a few', 'several'], correct: 1 },
  { id: 'enrs-22', section: sec('ART'), text: '(после лекции) I’ve got ___ few questions about the citric acid cycle.', options: ['a', 'the', '—', 'some'], correct: 0 },
  // ── MOD · Модальность ──
  { id: 'enrs-23', section: sec('MOD'), text: '(вечером в лаборатории) The lab lights are on — she ___ still be working.', options: ['can', 'must', 'should', 'would'], correct: 1 },
  { id: 'enrs-24', section: sec('MOD'), text: '(о рабочем отчёте) He ___ have written this report — he was in Bangkok all week.', options: ['mustn’t', 'can’t', 'shouldn’t', 'wouldn’t'], correct: 1 },
  { id: 'enrs-25', section: sec('MOD'), text: '(неудавшийся опыт) I don’t know why the reaction failed. The reagent ___ contaminated.', options: ['might be', 'might have been', 'must be', 'can have been'], correct: 1 },
  { id: 'enrs-26', section: sec('MOD'), text: '(перед лабораторной) You ___ bring your own goggles — the lab provides them.', options: ['mustn’t', 'don’t have to', 'shouldn’t', 'can’t'], correct: 1 },
  { id: 'enrs-27', section: sec('MOD'), text: '(после инцидента) You ___ told me the sample was unstable before I opened it.', options: ['should have', 'must have', 'had to', 'would'], correct: 0 },
  { id: 'enrs-28', section: sec('MOD'), text: '(табличка на вокзале) Passengers ___ not cross the yellow line.', options: ['may', 'must', 'need', 'do'], correct: 1 },
  // ── NFN · Неличные формы ──
  { id: 'enrs-29', section: sec('NFN'), text: '(воспоминание) I remember ___ that lecture — it was in my second year.', options: ['to attend', 'attending', 'attend', 'to have attended'], correct: 1 },
  { id: 'enrs-30', section: sec('NFN'), text: '(о преподавателе) She made us ___ the whole periodic table by heart.', options: ['to learn', 'learn', 'learning', 'learnt'], correct: 1 },
  { id: 'enrs-31', section: sec('NFN'), text: '(задание группе) I’d like you ___ this before Friday.', options: ['read', 'to read', 'reading', 'that you read'], correct: 1 },
  { id: 'enrs-32', section: sec('NFN'), text: '(лаборатория) ___ the sample, we placed it under the microscope.', options: ['Having prepared', 'Prepared', 'Prepare', 'Being prepared'], correct: 0 },
  { id: 'enrs-33', section: sec('NFN'), text: '(разбор происшествия) He denied ___ the equipment.', options: ['to break', 'breaking', 'break', 'to have break'], correct: 1 },
  { id: 'enrs-34', section: sec('NFN'), text: '(у аптеки) I saw her ___ the pharmacy just before it closed.', options: ['to enter', 'enter', 'entered', 'been entering'], correct: 1 },
  // ── CND · Условные и wish ──
  { id: 'enrs-35', section: sec('CND'), text: '(об эксперименте) If I ___ more time, I’d redo the whole experiment.', options: ['have', 'had', 'would have', 'will have'], correct: 1 },
  { id: 'enrs-36', section: sec('CND'), text: '(разбор ошибки) If she ___ the instructions, the reaction wouldn’t have failed.', options: ['read', 'had read', 'would read', 'has read'], correct: 1 },
  { id: 'enrs-37', section: sec('CND'), text: '(о выборе профессии) If I ___ chemistry at university, I’d be teaching biology now.', options: ['didn’t study', 'hadn’t studied', 'wouldn’t study', 'haven’t studied'], correct: 1 },
  { id: 'enrs-38', section: sec('CND'), text: '(на вокзале) I wish I ___ the platform number before I got on.', options: ['checked', 'had checked', 'would check', 'have checked'], correct: 1 },
  { id: 'enrs-39', section: sec('CND'), text: '(разговор с группой) It’s time we ___ on the exam dates.', options: ['decide', 'decided', 'will decide', 'deciding'], correct: 1 },
  // ── PAS · Пассив и каузатив ──
  { id: 'enrs-40', section: sec('PAS'), text: '(лаборатория) The samples ___ to the lab yesterday afternoon.', options: ['were sent', 'was sent', 'have sent', 'were send'], correct: 0 },
  { id: 'enrs-41', section: sec('PAS'), text: '(в аптеке) I need to ___ my prescription renewed.', options: ['have', 'be', 'make', 'do'], correct: 0 },
  { id: 'enrs-42', section: sec('PAS'), text: '(фармакология) The drug ___ to reduce inflammation.', options: ['is said', 'says', 'is saying', 'said'], correct: 0 },
  { id: 'enrs-43', section: sec('PAS'), text: '(на вокзале) My bag ___ at the station last month.', options: ['got stolen', 'was stole', 'has stole', 'is stealing'], correct: 0 },
  // ── REL · Придаточные и cleft ──
  { id: 'enrs-44', section: sec('REL'), text: '(в аудитории) The student ___ notes I borrowed is in the front row.', options: ['who', 'whose', 'which', 'that'], correct: 1 },
  { id: 'enrs-45', section: sec('REL'), text: '(о научном руководителе) My supervisor, ___ works on synapses, is at a conference.', options: ['that', 'who', 'which', 'what'], correct: 1 },
  { id: 'enrs-46', section: sec('REL'), text: '(лаборатория) The reagents ___ in the fridge must be used within a week.', options: ['storing', 'stored', 'store', 'which storing'], correct: 1 },
  { id: 'enrs-47', section: sec('REL'), text: '(разбор неудачи) ___ was the temperature, not the catalyst, that ruined the reaction.', options: ['That', 'It', 'There', 'What'], correct: 1 },
  // ── REP · Косвенная речь и вопросы ──
  { id: 'enrs-48', section: sec('REP'), text: '(на вокзале) Could you tell me where ___?', options: ['is the pharmacy', 'the pharmacy is', 'does the pharmacy', 'is being the pharmacy'], correct: 1 },
  { id: 'enrs-49', section: sec('REP'), text: '(разговор с коллегой) He asked me whether I ___ the lecture the day before.', options: ['attended', 'had attended', 'have attended', 'attend'], correct: 1 },
  { id: 'enrs-50', section: sec('REP'), text: '(обсуждение сроков) She suggested ___ the deadline by a week.', options: ['to postpone', 'postponing', 'postpone', 'us postpone'], correct: 1 },
  { id: 'enrs-51', section: sec('REP'), text: '(разбор ошибки) He admitted ___ the wrong dosage.', options: ['to give', 'giving', 'give', 'have given'], correct: 1 },
  { id: 'enrs-52', section: sec('REP'), text: '(перед экзаменом) She told me ___ worry about the exam.', options: ['don’t', 'not to', 'to not', 'that not'], correct: 1 },
  // ── PRP · Предлоги и фразовые ──
  { id: 'enrs-53', section: sec('PRP'), text: '(лаборатория) The result depends ___ the concentration.', options: ['from', 'on', 'of', 'at'], correct: 1 },
  { id: 'enrs-54', section: sec('PRP'), text: '(о преподавании) I’m not very good ___ explaining the Krebs cycle quickly.', options: ['in', 'at', 'on', 'for'], correct: 1 },
  { id: 'enrs-55', section: sec('PRP'), text: '(чтение статьи) I’ve never seen this word — can you ___ for me?', options: ['look it up', 'look up it', 'look for it', 'look after it'], correct: 0 },
  { id: 'enrs-56', section: sec('PRP'), text: '(урок химии) We ran ___ reagent halfway through the class.', options: ['out of', 'off', 'away from', 'over'], correct: 0 },
  { id: 'enrs-57', section: sec('PRP'), text: '(о курсе) I’m looking forward ___ the course next month.', options: ['to starting', 'to start', 'start', 'for starting'], correct: 0 },
  // ── DSC · Дискурс и порядок слов ──
  { id: 'enrs-58', section: sec('DSC'), text: '(урок химии) No sooner ___ the demonstration than the fire alarm went off.', options: ['had I started', 'I had started', 'did I start', 'I started'], correct: 0 },
  { id: 'enrs-59', section: sec('DSC'), text: '(о лекции) ___ the lecture was long, it was genuinely useful.', options: ['Despite', 'Although', 'However', 'In spite of'], correct: 1 },
  { id: 'enrs-60', section: sec('DSC'), text: '(описание реакции) The reaction is slow at room temperature, ___ at 60 °C it’s almost instant.', options: ['whereas', 'however', 'despite', 'meanwhile'], correct: 0 },
]

// Вердикт: не лесенка уровней, а карта поломок. Шаги ladder — это системы в
// порядке дней программы, поэтому чипы результата читаются как расписание.
const RESTORE_PASS = 0.6

export function englishRestoreVerdict(results: DiagResults): PlacementVerdict {
  const ladder = SYSTEM_ORDER.map(code => {
    let correct = 0, total = 0
    for (const [section, r] of Object.entries(results)) {
      if (section.split(' · ')[0] === code) { correct += r.correct; total += r.total }
    }
    return { level: code, correct, total, passed: total > 0 && correct / total >= RESTORE_PASS }
  })

  const answered = ladder.filter(s => s.total > 0)
  const correctAll = answered.reduce((a, s) => a + s.correct, 0)
  const totalAll = answered.reduce((a, s) => a + s.total, 0)
  const pct = totalAll > 0 ? Math.round((correctAll / totalAll) * 100) : 0

  const broken = answered
    .filter(s => s.correct / s.total < 0.5)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .slice(0, 3)
  const brokenNote = broken.length
    ? ` Слабее всего: ${broken.map(s => `${SYSTEM_DAY[s.level].name.toLowerCase()} (день ${SYSTEM_DAY[s.level].day})`).join(', ')} — эти дни программы разворачиваем полностью.`
    : ' Провалившихся систем нет — программу можно вести в ускоренном темпе, упирая на скорость извлечения, а не на разбор правил.'

  const course = { courseKey: 'enac', courseTitle: 'Английский: от B2 к C1' }

  if (pct < 40) return {
    level: 'A2 в продукции',
    note: `${pct}% — узнавание может быть выше, но собрать конструкцию с нуля пока не выходит. Это не «забыл», а «не было закреплено»: программу восстановления берём с сокращённым охватом и увеличенным числом повторов.${brokenNote}`,
    ...course, ladder,
  }
  if (pct < 60) return {
    level: 'B1',
    note: `${pct}% — база жива, верхний этаж грамматики осыпался. Восстановление реально в короткий срок, если убрать лексические темы и оставить системы.${brokenNote}`,
    ...course, ladder,
  }
  if (pct < 75) return {
    level: 'B1+ · спящий B2',
    note: `${pct}% — типичная картина после долгого перерыва: знания на месте, доступа к ним нет. Лечится извлечением (перевод под таймер, диктант), а не повторным прохождением теории.${brokenNote}`,
    ...course, ladder,
  }
  if (pct < 88) return {
    level: 'B2',
    note: `${pct}% — система цела, ломаются детали и скорость. Основной упор переносим с разбора правил на темп: перевод на время, аудирование, говорение.${brokenNote}`,
    ...course, ladder,
  }
  return {
    level: 'B2+ · подступ к C1',
    note: `${pct}% — грамматика держится уверенно. Программу стоит развернуть в сторону беглости, идиоматики и скорости восприятия на слух.${brokenNote}`,
    ...course, ladder,
  }
}
