// ─────────────────────────────────────────────────────────────────────────────
// Пробники IELTS Academic — полный экзамен в формате дня сдачи
//
// ЗАЧЕМ ОТДЕЛЬНО ОТ КУРСА. Курс `ielt` учит технике: юнит про True/False/Not
// Given, юнит про Task 2. Но балл складывается не из техник по отдельности, а
// из сорока вопросов подряд под таймером, с усталостью к третьему тексту и
// записью, которая звучит один раз. Этого курс дать не может по устройству:
// урок — это пятнадцать заданий одного вида, а не экзамен. Пробник — второй
// инструмент рядом с курсом: измерить, а не научить.
//
// ФОРМАТ. Повторяет компьютерный IELTS Academic (бумажного с 2026 года нет):
// Listening — 4 части × 10 вопросов, запись один раз, в конце 2 минуты на
// проверку; Reading — 3 текста, 40 вопросов, 60 минут; Writing — Task 1 от 150
// слов и Task 2 от 250 слов, 60 минут на оба; Speaking — три части.
//
// ЮРИДИЧЕСКОЕ. IELTS — торговая марка British Council, IDP и Cambridge;
// пробники их не представляют. Тексты, записи, вопросы и данные графика
// написаны с нуля, задания прошлых экзаменов сюда не копируются. Числа на
// графике вымышленные — из них же строится список фактов, по которому модель
// проверяет описание (так картинка и проверка не разойдутся).
//
// ПРОВЕРКА ОТВЕТОВ. Listening и Reading проверяются здесь же, ключом:
// `answer` — список допустимых написаний (числа цифрами и словами, даты в
// разных порядках). Сравнение без регистра и концевой пунктуации, но с
// орфографией: на экзамене слово с ошибкой не засчитывается, и пробник, который
// его засчитал бы, завышал бы балл. Writing и Speaking оценивает модель по
// четырём критериям (Edge Function `ielts-grade`).
// ─────────────────────────────────────────────────────────────────────────────

import { barChartImage } from './seedImages'
import { MOCK_2 } from './ieltsMock2'
import { MOCK_3 } from './ieltsMock3'
import { MOCK_4 } from './ieltsMock4'

export type IeltsSection = 'listening' | 'reading' | 'writing' | 'speaking'

export const SECTION_ORDER: IeltsSection[] = ['listening', 'reading', 'writing', 'speaking']

export const SECTION_LABEL: Record<IeltsSection, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
}

/** Вопрос с одним ответом. `n` — сквозной номер внутри секции (1–40). */
export interface MockQuestion {
  n: number
  /** Текст вопроса. В «пропусках» место ответа помечено `___`. */
  text: string
  /** Допустимые ответы. Для выбора — буква варианта или TRUE/FALSE/NOT GIVEN. */
  answer: string[]
}

/**
 * Группа вопросов одного вида — как на листе экзамена: общая инструкция,
 * общий список вариантов, несколько вопросов подряд.
 */
export interface MockGroup {
  kind: 'gap' | 'mcq' | 'tfng' | 'ynng' | 'match'
  /** Инструкция дословно по образцу экзамена. */
  instructions: string
  /** Заголовок формы или конспекта над пропусками. */
  title?: string
  /** Варианты: у mcq — свои у каждого вопроса (см. choices), у match — общие. */
  options?: { key: string; text: string }[]
  /** Варианты для mcq: номер вопроса → варианты. */
  choices?: Record<number, { key: string; text: string }[]>
  questions: MockQuestion[]
}

export interface ScriptLine {
  /** Кто говорит. N — диктор экзамена, A/B/C — участники записи. */
  who: 'N' | 'A' | 'B' | 'C'
  text: string
}

export interface ListeningPart {
  title: string
  /** Чей это голос: пол нужен, чтобы разнести реплики по разным дикторам. */
  voices: Partial<Record<ScriptLine['who'], 'f' | 'm'>>
  script: ScriptLine[]
  groups: MockGroup[]
}

export interface ReadingPassage {
  title: string
  /** Абзацы. У текстов с заголовками абзацев — с буквой. */
  paragraphs: { label?: string; text: string }[]
  groups: MockGroup[]
}

export interface WritingTask {
  task: 1 | 2
  minWords: number
  /** Рекомендованное время, минут. Таймер секции общий — 60 минут. */
  minutes: number
  prompt: string
  image?: string
  /** Факты графика для проверки описания моделью. */
  facts?: string[]
}

export interface SpeakingPart {
  part: 1 | 2 | 3
  title: string
  /** Part 1 и 3 — вопросы экзаменатора, по одной записи на вопрос. */
  questions?: string[]
  /** Part 2 — карточка. */
  card?: { topic: string; points: string[]; close: string }
  /** Сколько секунд даётся на ответ. */
  answerSeconds: number
  /** Секунд на подготовку (только Part 2). */
  prepSeconds?: number
}

export interface IeltsMock {
  id: string
  title: string
  /** Чем этот пробник отличается от соседних — одна строка на плитку. */
  about: string
  listening: ListeningPart[]
  reading: ReadingPassage[]
  writing: WritingTask[]
  speaking: SpeakingPart[]
}

/** Время секций, минут. Listening считается по длине записи, у него таймера нет. */
export const SECTION_MINUTES: Record<IeltsSection, number> = {
  listening: 32,
  reading: 60,
  writing: 60,
  speaking: 14,
}

/** Сколько секунд дают прочитать вопросы перед каждой частью Listening. */
export const LISTENING_PREVIEW_SECONDS = 30
/** Время на проверку в конце компьютерного Listening. */
export const LISTENING_REVIEW_SECONDS = 120

// ─── Mock 1 · Writing Task 1 ─────────────────────────────────────────────────

const COMMUTE = {
  groups: ['Car', 'Bus', 'Bicycle', 'Walking', 'Metro'],
  y2005: [52, 21, 6, 13, 8],
  y2025: [34, 17, 19, 11, 19],
}

const COMMUTE_CHART = barChartImage({
  title: 'How people travelled to work in Northgate, 2005 and 2025',
  yUnit: '% of commuters',
  groups: COMMUTE.groups,
  yMax: 60, yStep: 10,
  series: [
    { name: '2005', color: '#2B7FFF', values: COMMUTE.y2005 },
    { name: '2025', color: '#E4573A', values: COMMUTE.y2025 },
  ],
})

const COMMUTE_FACTS = COMMUTE.groups.map((g, i) =>
  `${g}: ${COMMUTE.y2005[i]}% in 2005 → ${COMMUTE.y2025[i]}% in 2025`)

// ─── Mock 1 ──────────────────────────────────────────────────────────────────

const MOCK_1: IeltsMock = {
  id: 'mock-1',
  title: 'Пробник 1',
  about: 'Прокат велосипедов, общественный сад, городской проект, лекция о соли · велосипед, тепловые острова, ошибки в учёбе',

  // ── Listening ──────────────────────────────────────────────────────────────
  listening: [
    {
      title: 'Part 1',
      voices: { N: 'm', A: 'f', B: 'm' },
      script: [
        { who: 'N', text: 'Part 1. You will hear a man phoning a bicycle hire company to make a booking.' },
        { who: 'A', text: 'Good morning, Harbour Cycle Hire, Megan speaking. How can I help?' },
        { who: 'B', text: "Hi. I'd like to book some bikes for next week, please." },
        { who: 'A', text: 'Of course. Can I take your name first?' },
        { who: 'B', text: "Yes, it's Daniel Kowalski." },
        { who: 'A', text: 'Could you spell the surname for me?' },
        { who: 'B', text: 'Sure. K. O. W. A. L. S. K. I.' },
        { who: 'A', text: 'Thank you. And are you staying locally?' },
        { who: 'B', text: "We're at a hotel in the old town. We wanted the Harbour View, but it was full, so we're at the Lighthouse Hotel." },
        { who: 'A', text: "I know it, it's only ten minutes from us. How many bikes will you need?" },
        { who: 'B', text: "Well, there are four of us, but my daughter is only two, so she'll go in a child seat. So, three bikes." },
        { who: 'A', text: 'Three bikes. Standard ones?' },
        { who: 'B', text: "Two standard ones. And my father would like an electric bike, if that's possible. His knees aren't what they used to be." },
        { who: 'A', text: 'No problem, we have plenty of electric bikes. And when would you like to start?' },
        { who: 'B', text: "Is Thursday possible? That's the twelfth. Oh no, sorry, it's the fourteenth of June." },
        { who: 'A', text: 'The fourteenth, yes, that\'s fine. For how many days?' },
        { who: 'B', text: "Four days. We'd bring them back on Sunday evening." },
        { who: 'A', text: "Let me work out the price. With the four-day discount, that's one hundred and twelve pounds. Oh, wait, I've charged you for four standard bikes. So it's ninety-six pounds altogether." },
        { who: 'B', text: 'That sounds fine. Do helmets cost extra?' },
        { who: 'A', text: "No, helmets and locks are included, and we fit the child seat free of charge. The only extra is the waterproof map. That's five pounds, but most families find it really useful." },
        { who: 'B', text: "We'll take a map, then. What time can we collect the bikes?" },
        { who: 'A', text: "We open at eight, but the bikes aren't usually ready until half past eight." },
        { who: 'B', text: "Half past eight, then. Do I need to bring anything?" },
        { who: 'A', text: "Yes, please bring your passport. We keep a copy as a deposit document. I'm afraid a driving licence isn't enough." },
        { who: 'B', text: 'Right. And is there a route you would recommend with a small child?' },
        { who: 'A', text: "The coast road is beautiful, but it's very busy in summer. I'd go along the canal. It's completely flat, and there's no traffic at all." },
        { who: 'B', text: "Perfect. Thank you very much." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        title: 'Harbour Cycle Hire — Booking form',
        questions: [
          { n: 1, text: 'Customer name: Daniel ___', answer: ['kowalski'] },
          { n: 2, text: 'Staying at: the ___ Hotel', answer: ['lighthouse'] },
          { n: 3, text: 'Number of bikes: ___', answer: ['3', 'three'] },
          { n: 4, text: 'Types: two standard bikes and one ___ bike', answer: ['electric'] },
          { n: 5, text: 'Start date: ___', answer: ['14 june', 'june 14', '14th june', 'june 14th', 'the 14th of june', '14th of june', 'fourteenth june', 'the fourteenth of june', '14.06', '14/06'] },
          { n: 6, text: 'Total price: £___', answer: ['96', 'ninety-six', 'ninety six'] },
          { n: 7, text: 'Extra item paid for: a waterproof ___', answer: ['map'] },
          { n: 8, text: 'Collection time: ___', answer: ['8.30', '8:30', 'half past eight', '8.30 am', '8:30 am', '8.30am', '8:30am'] },
          { n: 9, text: 'Customer must bring: ___', answer: ['passport', 'a passport', 'his passport'] },
          { n: 10, text: 'Recommended route: along the ___', answer: ['canal'] },
        ],
      }],
    },
    {
      title: 'Part 2',
      voices: { N: 'm', A: 'f' },
      script: [
        { who: 'N', text: 'Part 2. You will hear a coordinator talking to new volunteers at a community garden.' },
        { who: 'A', text: "Good morning, everyone, and welcome to Ashcombe Community Garden. I'm Ruth, and I coordinate the volunteers here." },
        { who: 'A', text: "Let me start with a bit of history. A lot of people assume this land used to be a school playing field, because the primary school is right next door. In fact, it was a railway yard. The trains stopped in the nineteen-seventies, and the site was empty for almost thirty years before a group of neighbours cleared it." },
        { who: 'A', text: "We grow a lot of vegetables, and people often ask whether we sell them. We do run a small stall at the Saturday market, and the café uses some of our herbs, but most of what we grow, around two thirds, goes straight to the food bank in the high street." },
        { who: 'A', text: "Now, before you pick up a spade, there's one thing every new volunteer has to do, and that's the safety talk. It takes about forty minutes, and we run it every Tuesday. You don't need to bring your own gloves, by the way. We have boxes of them. And you won't get your own plot, because all the beds are shared." },
        { who: 'A', text: "Our busiest day is Saturday. We start at the same time as on weekdays, nine o'clock, but Saturday is our family day, so you're welcome to bring children along. Weekday volunteers usually work in teams, but on Saturdays it's much more relaxed." },
        { who: 'A', text: "Where do we need you most? We've had a lot of offers to help with our social media, and the building work is done by a local firm. What we're really short of is people to do the watering, especially in July and August, when many of our regulars are away." },
        { who: 'A', text: "Let me tell you about the different areas. The greenhouse was badly damaged in the storms last winter, but it's just had a completely new roof, so it's lovely and dry in there now." },
        { who: 'A', text: "The orchard was planted in two thousand and twelve. All forty trees were a gift from a local business, the garden centre on Mill Road." },
        { who: 'A', text: "The pond is my favourite area. It's quite deep, so it's fenced, but we use it a lot for school visits. Children come and look for frogs and dragonflies." },
        { who: 'A', text: "Next to the pond is the tool shed. It's always locked, so you'll need to collect the key from the office. Please return it at the end of the day." },
        { who: 'A', text: "And finally, the sensory garden, with plants you can touch and smell. It was built entirely by volunteers, including the paths and the raised beds. There were plans to extend it this year, but they've been put on hold until we find more funding." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            11: [{ key: 'A', text: 'a school playing field' }, { key: 'B', text: 'a railway yard' }, { key: 'C', text: 'a car park' }],
            12: [{ key: 'A', text: 'sold at the market' }, { key: 'B', text: 'given to a food bank' }, { key: 'C', text: 'used in the café' }],
            13: [{ key: 'A', text: 'attend a safety talk' }, { key: 'B', text: 'bring their own gloves' }, { key: 'C', text: 'choose a plot' }],
            14: [{ key: 'A', text: 'work in teams' }, { key: 'B', text: 'start later than on weekdays' }, { key: 'C', text: 'can bring children' }],
            15: [{ key: 'A', text: 'watering' }, { key: 'B', text: 'social media' }, { key: 'C', text: 'building work' }],
          },
          questions: [
            { n: 11, text: 'The site of the garden was originally', answer: ['B'] },
            { n: 12, text: 'Most of the vegetables grown in the garden are', answer: ['B'] },
            { n: 13, text: 'Before starting work, all new volunteers must', answer: ['A'] },
            { n: 14, text: 'On Saturdays, volunteers', answer: ['C'] },
            { n: 15, text: 'The garden most needs more help with', answer: ['A'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'What does Ruth say about each area of the garden? Choose FIVE answers from the list, A–G, next to Questions 16–20.',
          options: [
            { key: 'A', text: 'was built by volunteers' },
            { key: 'B', text: 'is closed on Mondays' },
            { key: 'C', text: 'has recently been repaired' },
            { key: 'D', text: 'is used for school visits' },
            { key: 'E', text: 'requires a key from the office' },
            { key: 'F', text: 'was a gift from a local business' },
            { key: 'G', text: 'is being extended this year' },
          ],
          questions: [
            { n: 16, text: 'the greenhouse', answer: ['C'] },
            { n: 17, text: 'the orchard', answer: ['F'] },
            { n: 18, text: 'the pond', answer: ['D'] },
            { n: 19, text: 'the tool shed', answer: ['E'] },
            { n: 20, text: 'the sensory garden', answer: ['A'] },
          ],
        },
      ],
    },
    {
      title: 'Part 3',
      voices: { N: 'm', A: 'f', B: 'm' },
      script: [
        { who: 'N', text: 'Part 3. You will hear two geography students, Maya and Tom, discussing a presentation on urban heat.' },
        { who: 'A', text: "So, Tom, we need to finalise the plan for the presentation. Do you remember why we picked heat islands in the first place?" },
        { who: 'B', text: "Well, partly because it was in the news after last summer. But really it was the council data, wasn't it? They publish street temperatures for the whole city, and nobody else in the group had a data set that good." },
        { who: 'A', text: "Right. And then our own survey was a bit of a disaster." },
        { who: 'B', text: "I wouldn't say a disaster. We got over two hundred responses, which is plenty. The problem was that people didn't understand the questions. Half of them thought 'surface temperature' meant the weather forecast." },
        { who: 'A', text: "True. So what surprised you most in the results?" },
        { who: 'B', text: "I expected the city centre to be the hottest. Everybody expects that. What I didn't expect was that the big retail parks on the edge of the city were almost as hot. All that tarmac in the car parks." },
        { who: 'A', text: "That's a good point to make. How do you think we should open? I was thinking of starting with a definition." },
        { who: 'B', text: "Everyone will do that. Why don't we start with the map? Show the two hottest streets straight away, and then explain the term." },
        { who: 'A', text: "Okay, I'm convinced. The map goes first. Before Friday, I'll email the tutor to check how long we've got. I think it's ten minutes, but I'm not sure." },
        { who: 'B', text: "Good idea. Now, who does what? I'm happy to make the map. I've used the mapping software before." },
        { who: 'A', text: "Great. I'll contact the council. I want to ask whether they've got data for this year too." },
        { who: 'B', text: "What about the conclusion? That's the bit people remember." },
        { who: 'A', text: "Let's write that together. It needs both our points of view." },
        { who: 'B', text: "Fine. And the slides? I'm hopeless at design." },
        { who: 'A', text: "I'll do the slides, then. But you should practise the timing. You always speak too fast when you're nervous, and you'll be presenting most of it." },
        { who: 'B', text: "Fair enough. I'll do that on my own on Thursday." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            21: [{ key: 'A', text: 'it had been in the news' }, { key: 'B', text: 'good local data was available' }, { key: 'C', text: 'their tutor suggested it' }],
            22: [{ key: 'A', text: 'too few people responded' }, { key: 'B', text: 'it covered the wrong area' }, { key: 'C', text: 'the questions were misunderstood' }],
            23: [{ key: 'A', text: 'the city centre was the hottest area' }, { key: 'B', text: 'retail parks were nearly as hot as the centre' }, { key: 'C', text: 'parks stayed cool at night' }],
            24: [{ key: 'A', text: 'a definition of the term' }, { key: 'B', text: 'a map of the city' }, { key: 'C', text: 'results of their survey' }],
            25: [{ key: 'A', text: 'check the length of the presentation' }, { key: 'B', text: 'repeat the survey' }, { key: 'C', text: 'book a room' }],
          },
          questions: [
            { n: 21, text: 'Tom says the main reason they chose the topic was that', answer: ['B'] },
            { n: 22, text: 'What was the problem with their survey?', answer: ['C'] },
            { n: 23, text: 'Tom was most surprised that', answer: ['B'] },
            { n: 24, text: 'They agree that the presentation should begin with', answer: ['B'] },
            { n: 25, text: 'Before Friday, Maya will', answer: ['A'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'Who will do each task? Write the correct letter, A, B or C, next to Questions 26–30.',
          options: [
            { key: 'A', text: 'Maya' },
            { key: 'B', text: 'Tom' },
            { key: 'C', text: 'both Maya and Tom' },
          ],
          questions: [
            { n: 26, text: 'make the map', answer: ['B'] },
            { n: 27, text: 'contact the council', answer: ['A'] },
            { n: 28, text: 'write the conclusion', answer: ['C'] },
            { n: 29, text: 'prepare the slides', answer: ['A'] },
            { n: 30, text: 'practise the timing', answer: ['B'] },
          ],
        },
      ],
    },
    {
      title: 'Part 4',
      voices: { N: 'm', A: 'm' },
      script: [
        { who: 'N', text: 'Part 4. You will hear a lecture about the history of salt.' },
        { who: 'A', text: "Today I want to look at a substance we hardly notice now, but which shaped economies for thousands of years: salt." },
        { who: 'A', text: "Its first great value was preservation. Before refrigeration, salt was the main way to keep food from going bad, and above all it was used for fish. Salted cod could be carried across oceans and eaten months later." },
        { who: 'A', text: "Because it was so valuable, salt was often used as a form of payment. There is a popular story that the word 'salary' comes from salt given to Roman soldiers. Historians disagree about how literally to take this, but the connection between salt and wages is real enough." },
        { who: 'A', text: "How was salt produced? In warm, dry places the method was simple evaporation. Sea water was let into shallow pans, and the sun did the rest. In colder climates that didn't work, so people boiled salt water over fires, which required huge amounts of wood." },
        { who: 'A', text: "The third method was mining. Rock salt was dug out of the ground, and some mines became enormous. In parts of Central Europe, miners carved entire chapels out of the salt." },
        { who: 'A', text: "Salt also created routes. Merchants travelled long distances to bring it inland, and many of these salt roads later became ordinary trade roads. Some towns grew up simply because they were stopping points on these routes." },
        { who: 'A', text: "Governments quickly understood that salt could be taxed. Everyone needed it, so a salt tax was easy to collect, and it was deeply unpopular. In France, the salt tax was one of the grievances that people complained about before the Revolution." },
        { who: 'A', text: "In the twentieth century, salt became a symbol of resistance. In nineteen-thirty, Gandhi led a march of about three hundred and ninety kilometres to the sea to make salt, in protest against the British salt tax in India." },
        { who: 'A', text: "So why did salt lose its importance? The key change was refrigeration, which removed the need to preserve most food with salt. At the same time, industrial production made salt so cheap that it was no longer worth taxing or fighting over." },
        { who: 'A', text: "Today, the biggest use of salt isn't in food at all. Most of it goes to the chemical industry, and a large amount is spread on roads in winter to melt ice." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
        title: 'The history of salt',
        questions: [
          { n: 31, text: 'Before refrigeration, salt was mainly used to preserve ___', answer: ['fish'] },
          { n: 32, text: 'Salt was often used as a form of ___', answer: ['payment'] },
          { n: 33, text: 'In warm places, salt was produced by ___', answer: ['evaporation'] },
          { n: 34, text: 'Boiling salt water needed large amounts of ___', answer: ['wood'] },
          { n: 35, text: 'In some mines, workers carved ___ out of salt', answer: ['chapels'] },
          { n: 36, text: 'Some ___ developed as stopping points on salt routes', answer: ['towns'] },
          { n: 37, text: 'A salt tax was easy to ___', answer: ['collect'] },
          { n: 38, text: 'Gandhi walked about 390 kilometres to the ___', answer: ['sea'] },
          { n: 39, text: 'Salt lost its importance mainly because of ___', answer: ['refrigeration'] },
          { n: 40, text: 'Today, large amounts of salt are spread on ___ in winter', answer: ['roads'] },
        ],
      }],
    },
  ],

  // ── Reading ────────────────────────────────────────────────────────────────
  reading: [
    {
      title: 'The long road to the modern bicycle',
      paragraphs: [
        { text: "The bicycle looks like such a simple machine that it is easy to assume it was invented all at once. In fact, it took the best part of seventy years, and several false starts, before anything resembling the modern bicycle appeared on the streets." },
        { text: "The story usually begins in 1817 in the German city of Mannheim, where Karl Drais demonstrated what he called a 'running machine'. It had two wheels in line and a steerable front wheel, but no pedals: the rider sat on a wooden frame and pushed against the ground with his feet. Drais's machine enjoyed a brief fashion among wealthy young men in Germany, France and Britain, but it was heavy, uncomfortable on rough roads, and in several cities riders were banned from using the pavements. Within a few years the craze had passed." },
        { text: "The decisive step came in France in the 1860s, when pedals were attached directly to the front wheel. The resulting 'velocipede' could be ridden without touching the ground, but its iron-rimmed wooden wheels transmitted every bump in the road to the rider, which earned it the nickname 'boneshaker' in English. Even so, it was the first bicycle to be produced in significant numbers, and riding schools opened in Paris and London to teach the new skill." },
        { text: "Because the pedals turned the front wheel directly, the only way to go faster was to make that wheel bigger. By the 1870s this logic had produced the high-wheeler, later known in Britain as the penny-farthing, with a front wheel that could be one and a half metres across. It was fast and, on good roads, surprisingly comfortable, but the rider sat so high above the wheel that a sudden stop could throw him over the handlebars. High-wheelers were therefore ridden mostly by athletic young men; for almost everyone else, they were simply too dangerous." },
        { text: "The machine that solved this problem was known, appropriately, as the 'safety bicycle'. Its most successful early version was the Rover, produced in Coventry in 1885 by John Kemp Starley. It had two wheels of similar size and a chain that drove the rear wheel, so that speed no longer depended on the size of the front wheel. The rider sat lower, between the wheels, and could put a foot on the ground. Within a few years the high-wheeler had become a curiosity." },
        { text: "One problem remained: comfort. The answer came from an unexpected source. In 1888 John Boyd Dunlop, a vet in Belfast, fitted air-filled tubes to the wheels of his young son's tricycle to make it run more smoothly. Pneumatic tyres were quickly adopted by bicycle makers, and racing cyclists who used them began to beat riders on solid tyres by wide margins." },
        { text: "The result was the bicycle boom of the 1890s. Mass production brought prices down, and for the first time a cheap, personal means of transport was available to people who could not afford a horse. Its social effects were considerable. Workers could live further from factories, and young people could travel to neighbouring villages, widening their social circles. For women in particular, the bicycle offered a new kind of independence, and it encouraged a change towards more practical clothing." },
        { text: "Remarkably, the basic design that emerged in the 1880s has changed very little since. Materials have become lighter and gears more sophisticated, but a cyclist from 1895 would have no difficulty riding a modern bicycle." },
      ],
      groups: [
        {
          kind: 'tfng',
          instructions: 'Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.',
          questions: [
            { n: 1, text: "Drais's running machine was operated by pedals.", answer: ['FALSE'] },
            { n: 2, text: "In some cities, riders of Drais's machine were not allowed on pavements.", answer: ['TRUE'] },
            { n: 3, text: 'The velocipede was invented by a riding school teacher.', answer: ['NOT GIVEN'] },
            { n: 4, text: 'The velocipede was the first bicycle made in large numbers.', answer: ['TRUE'] },
            { n: 5, text: 'High-wheelers were uncomfortable even on good roads.', answer: ['FALSE'] },
            { n: 6, text: 'The Rover was more expensive than the high-wheeler.', answer: ['NOT GIVEN'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the notes below. Choose ONE WORD ONLY from the passage for each answer.',
          title: 'Key developments',
          questions: [
            { n: 7, text: "The velocipede was called the 'boneshaker' because its wheels passed on every ___ in the road.", answer: ['bump'] },
            { n: 8, text: 'On a high-wheeler, a sudden stop could throw the rider over the ___', answer: ['handlebars'] },
            { n: 9, text: 'In the safety bicycle, a ___ drove the rear wheel.', answer: ['chain'] },
            { n: 10, text: 'Dunlop first tested air-filled tyres on a ___', answer: ['tricycle'] },
            { n: 11, text: 'Mass production in the 1890s brought ___ down.', answer: ['prices'] },
            { n: 12, text: 'The bicycle allowed workers to live further from ___', answer: ['factories'] },
            { n: 13, text: 'For women, cycling encouraged more practical ___', answer: ['clothing'] },
          ],
        },
      ],
    },
    {
      title: 'Why cities are hotter',
      paragraphs: [
        { label: 'A', text: "On a still summer evening, the centre of a large city can be several degrees warmer than the countryside only a few kilometres away. This difference, known as the urban heat island effect, was first described in the early nineteenth century, when an amateur meteorologist noticed that thermometers in London regularly read higher than those outside it. What was once a scientific curiosity has become a serious public health concern, because heatwaves are becoming more frequent and the majority of the world's population now lives in cities." },
        { label: 'B', text: "The main cause lies in the materials that cities are built from. Asphalt, concrete and dark roofing absorb a large proportion of the sunlight that falls on them and store it as heat. During the day this heat builds up; after sunset it is slowly released into the air. This is why the heat island effect is usually strongest not at midday but at night, when the countryside cools quickly and the city does not." },
        { label: 'C', text: "The shape of a city matters as well. In streets lined with tall buildings, much of the heat radiated by the ground is absorbed by the walls opposite rather than escaping to the sky. Tall buildings also slow the wind, which would otherwise carry warm air away. Added to this is the heat produced directly by human activity: vehicle engines, industrial processes and, increasingly, air-conditioning units, which cool the inside of buildings by pumping heat into the street." },
        { label: 'D', text: "The consequences are not merely uncomfortable. When nights stay hot, the body has no opportunity to recover from the heat of the day, and it is this lack of night-time relief that is linked to many heat-related deaths. Elderly people and those living alone in poorly ventilated flats are at greatest risk. Higher temperatures also increase demand for electricity, which may in turn produce more heat and pollution, and they can worsen air quality by speeding up the chemical reactions that form ground-level ozone." },
        { label: 'E', text: "Some of the most effective solutions are also the simplest. Trees cool the air both by providing shade and by releasing water vapour through their leaves, and studies in many cities have found that streets with a full tree canopy are noticeably cooler than similar streets without one. Parks create pockets of cooler air, although their effect generally extends only a short distance beyond their edges. Painting roofs in light colours, so that they reflect sunlight rather than absorb it, can reduce the temperature of the roof surface dramatically at relatively low cost." },
        { label: 'F', text: "However, solutions that work in one city may be unsuitable in another. In dry climates, planting thirsty trees can put pressure on scarce water supplies, and reflective surfaces at street level can redirect heat onto pedestrians. For this reason, many researchers argue that cities need detailed local temperature maps before deciding where to invest, so that limited budgets are spent on the neighbourhoods that are hottest and whose residents are most vulnerable." },
      ],
      groups: [
        {
          kind: 'match',
          instructions: 'The passage has six paragraphs, A–F. Choose the correct heading for paragraphs B–F from the list of headings below. (One heading is not used. Paragraph A is not included.)',
          options: [
            { key: 'i', text: 'A danger that is greatest after dark' },
            { key: 'ii', text: 'How building materials trap the sun\'s energy' },
            { key: 'iii', text: 'The need to match the remedy to the place' },
            { key: 'iv', text: 'Inexpensive ways of bringing temperatures down' },
            { key: 'v', text: 'Why some cities have no heat island at all' },
            { key: 'vi', text: 'The influence of city layout and human activity' },
          ],
          questions: [
            { n: 14, text: 'Paragraph B', answer: ['ii'] },
            { n: 15, text: 'Paragraph C', answer: ['vi'] },
            { n: 16, text: 'Paragraph D', answer: ['i'] },
            { n: 17, text: 'Paragraph E', answer: ['iv'] },
            { n: 18, text: 'Paragraph F', answer: ['iii'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            19: [
              { key: 'A', text: 'it was first noticed by professional scientists' },
              { key: 'B', text: 'it has been known about for around two hundred years' },
              { key: 'C', text: 'it only affects very large cities' },
              { key: 'D', text: 'it was first measured in the countryside' },
            ],
            20: [
              { key: 'A', text: 'at midday' },
              { key: 'B', text: 'in the early morning' },
              { key: 'C', text: 'at night' },
              { key: 'D', text: 'in winter' },
            ],
            21: [
              { key: 'A', text: 'they block the sun from reaching the street' },
              { key: 'B', text: 'they reduce the wind that would remove warm air' },
              { key: 'C', text: 'they are built from darker materials' },
              { key: 'D', text: 'they use more electricity than other buildings' },
            ],
            22: [
              { key: 'A', text: 'they cool streets but warm the air outside' },
              { key: 'B', text: 'they are rarely used in large cities' },
              { key: 'C', text: 'they move heat from inside buildings to the street' },
              { key: 'D', text: 'they are the main cause of the heat island effect' },
            ],
          },
          questions: [
            { n: 19, text: 'What does the writer say about the urban heat island effect in paragraph A?', answer: ['B'] },
            { n: 20, text: 'According to the passage, the heat island effect is usually strongest', answer: ['C'] },
            { n: 21, text: 'Tall buildings contribute to higher temperatures partly because', answer: ['B'] },
            { n: 22, text: 'What point does the writer make about air-conditioning units?', answer: ['C'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          title: 'Reducing urban heat',
          questions: [
            { n: 23, text: 'Trees lower temperatures by giving shade and by releasing ___ through their leaves.', answer: ['water vapour', 'water vapor'] },
            { n: 24, text: 'The cooling effect of parks usually reaches only a short distance beyond their ___', answer: ['edges'] },
            { n: 25, text: 'Light-coloured roofs reflect sunlight and can be installed at relatively ___', answer: ['low cost'] },
            { n: 26, text: 'In dry climates, trees may put pressure on scarce ___', answer: ['water supplies'] },
          ],
        },
      ],
    },
    {
      title: 'Learning from getting it wrong',
      paragraphs: [
        { text: "For most of the twentieth century, a common view in education was that mistakes should be avoided wherever possible. If a learner produced a wrong answer, the reasoning went, that answer might be remembered and compete with the correct one later. Teaching methods were therefore designed to lead students towards correct responses in small, carefully controlled steps, so that errors would rarely occur." },
        { text: "This view has been substantially revised. A large body of research now suggests that attempting to answer a question before being taught the answer can improve later learning, even when the attempt is wrong. In typical experiments, one group of learners is asked to guess the answers to questions on unfamiliar material and is then shown the correct answers; another group simply studies the questions and answers together for the same length of time. On a later test, the first group frequently performs better, despite having spent part of their study time producing errors." },
        { text: "Why should this be? One explanation is that a guess, even a wrong one, activates related knowledge and makes the learner more attentive when the correct answer arrives. A second is that the surprise of discovering one is wrong appears to strengthen memory for the correction, particularly when the learner had been confident. Somewhat counter-intuitively, high-confidence errors seem to be corrected more successfully than low-confidence ones." },
        { text: "It would be a misreading of this research, however, to conclude that mistakes are valuable in themselves. The benefit depends almost entirely on what happens next. Errors that are not followed by feedback can indeed persist, which is precisely what the earlier view feared. And the advantage of guessing has been found mainly where learners have at least some relevant knowledge to draw on; a completely random guess on a topic the learner knows nothing about offers little benefit." },
        { text: "A related finding concerns the difference between rereading and retrieval. Many students prepare for exams by reading their notes again and again. This feels productive, because the material becomes increasingly familiar, but familiarity is a poor guide to whether information can be recalled without the notes. Testing oneself, by contrast, often feels harder and produces more failures along the way, yet it consistently leads to better long-term retention. Students, in other words, tend to prefer the method that makes them feel they are learning over the one that actually helps them learn." },
        { text: "None of this means that teachers should set out to make students fail. The aim is rather to change what failure means in the classroom. If a wrong answer is treated as a normal and useful step, learners are more willing to attempt difficult questions, and the attempt itself becomes part of the learning. If it is treated as something shameful, many will avoid answering at all, and the opportunity is lost. In my view, the most important lesson from this research is not about memory but about atmosphere: the benefits of error are available only in classrooms where it is safe to be wrong." },
      ],
      groups: [
        {
          kind: 'ynng',
          instructions: 'Do the following statements agree with the claims of the writer in the passage? Choose YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.',
          questions: [
            { n: 27, text: 'Twentieth-century teaching methods aimed to keep errors to a minimum.', answer: ['YES'] },
            { n: 28, text: 'Mistakes are useful whether or not they are corrected.', answer: ['NO'] },
            { n: 29, text: 'Guessing is most effective when learners already know something about the topic.', answer: ['YES'] },
            { n: 30, text: 'Younger students benefit more from guessing than older students.', answer: ['NOT GIVEN'] },
            { n: 31, text: 'The atmosphere of a classroom determines whether students can benefit from errors.', answer: ['YES'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            32: [
              { key: 'A', text: 'had more time to study than the other group' },
              { key: 'B', text: 'often did better on a later test' },
              { key: 'C', text: 'already knew the material well' },
              { key: 'D', text: 'were tested immediately after studying' },
            ],
            33: [
              { key: 'A', text: 'they are rarer than low-confidence errors' },
              { key: 'B', text: 'they usually involve familiar material' },
              { key: 'C', text: 'learners correct them more successfully' },
              { key: 'D', text: 'they are more likely to persist' },
            ],
            34: [
              { key: 'A', text: 'it makes the material feel familiar' },
              { key: 'B', text: 'it takes less time than testing' },
              { key: 'C', text: 'teachers recommend it' },
              { key: 'D', text: 'it produces fewer mistakes than other methods' },
            ],
            35: [
              { key: 'A', text: 'teachers should deliberately make students fail' },
              { key: 'B', text: 'students should never reread their notes' },
              { key: 'C', text: 'the meaning of failure in class should change' },
              { key: 'D', text: 'memory research has little practical value' },
            ],
          },
          questions: [
            { n: 32, text: 'In the experiments described in the second paragraph, learners who guessed first', answer: ['B'] },
            { n: 33, text: 'What does the writer say about high-confidence errors?', answer: ['C'] },
            { n: 34, text: 'According to the writer, students like rereading because', answer: ['A'] },
            { n: 35, text: 'What is the writer\'s main conclusion?', answer: ['C'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'Classify the following statements as referring to A — attempting an answer before being taught it, B — rereading notes, or C — testing oneself.',
          options: [
            { key: 'A', text: 'attempting an answer before being taught it' },
            { key: 'B', text: 'rereading notes' },
            { key: 'C', text: 'testing oneself' },
          ],
          questions: [
            { n: 36, text: 'It may make a learner more attentive to the answer that follows.', answer: ['A'] },
            { n: 37, text: 'It creates a feeling of progress that can be misleading.', answer: ['B'] },
            { n: 38, text: 'It feels difficult but improves long-term memory.', answer: ['C'] },
            { n: 39, text: 'Its value is limited if the learner knows nothing about the subject.', answer: ['A'] },
            { n: 40, text: 'It is a common way for students to prepare for exams.', answer: ['B'] },
          ],
        },
      ],
    },
  ],

  // ── Writing ────────────────────────────────────────────────────────────────
  writing: [
    {
      task: 1,
      minWords: 150,
      minutes: 20,
      prompt: 'The chart below shows how people travelled to work in the city of Northgate in 2005 and 2025.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      image: COMMUTE_CHART,
      facts: COMMUTE_FACTS,
    },
    {
      task: 2,
      minWords: 250,
      minutes: 40,
      prompt: 'Some people believe that university education should be free for all students. Others think that students should pay for their own studies because they are the ones who benefit.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.',
    },
  ],

  // ── Speaking ───────────────────────────────────────────────────────────────
  speaking: [
    {
      part: 1,
      title: 'Part 1 · Introduction and interview',
      answerSeconds: 40,
      questions: [
        'Do you work, or are you a student?',
        'What do you enjoy most about your work or studies?',
        'Let\'s talk about your hometown. What is it like?',
        'Has your hometown changed much since you were a child?',
        'Now let\'s talk about reading. How often do you read for pleasure?',
        'Did you read more as a child than you do now?',
      ],
    },
    {
      part: 2,
      title: 'Part 2 · Long turn',
      answerSeconds: 120,
      prepSeconds: 60,
      card: {
        topic: 'Describe a skill that took you a long time to learn.',
        points: ['what the skill is', 'when and how you learned it', 'what was difficult about learning it'],
        close: 'and explain how you feel about this skill now.',
      },
    },
    {
      part: 3,
      title: 'Part 3 · Discussion',
      answerSeconds: 60,
      questions: [
        'Which skills do you think young people most need to learn today?',
        'Is it better to learn a skill from a teacher or from the internet?',
        'Why do some people give up learning a new skill quickly?',
        'Do you think schools should teach more practical skills, such as cooking or managing money?',
      ],
    },
  ],
}

// Остальные пробники — по файлу на каждый: тексты длинные, и один файл на
// четыре экзамена читался бы как свалка. Тип они берут отсюда только как
// тип, поэтому круговой зависимости нет.
export const IELTS_MOCKS: IeltsMock[] = [MOCK_1, MOCK_2, MOCK_3, MOCK_4]

export const mockById = (id: string) => IELTS_MOCKS.find(m => m.id === id)

/** Все вопросы секции подряд — для подсчёта и проверки. */
export function sectionQuestions(groups: MockGroup[]): MockQuestion[] {
  return groups.flatMap(g => g.questions)
}

export function listeningQuestions(mock: IeltsMock): MockQuestion[] {
  return mock.listening.flatMap(p => sectionQuestions(p.groups))
}

export function readingQuestions(mock: IeltsMock): MockQuestion[] {
  return mock.reading.flatMap(p => sectionQuestions(p.groups))
}
