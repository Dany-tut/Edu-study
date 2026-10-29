// ─────────────────────────────────────────────────────────────────────────────
// Пробник IELTS Academic № 2. Формат, правила и типы — в ieltsMocks.ts.
//
// Импорт оттуда только типовой: ieltsMocks.ts собирает список пробников и сам
// импортирует этот файл, значение отсюда туда — круг.
//
// Тексты, записи, вопросы и данные графика написаны с нуля. Числа на графике
// вымышленные (страна Валмора тоже), из них же строится список фактов для
// проверки описания моделью.
// ─────────────────────────────────────────────────────────────────────────────

import type { IeltsMock } from './ieltsMocks'
import { lineChartImage } from './seedImages'

// ─── Mock 2 · Writing Task 1 ─────────────────────────────────────────────────

const POWER = {
  years: ['1995', '2000', '2005', '2010', '2015', '2020', '2025'],
  series: [
    { name: 'Coal', color: '#2B7FFF', values: [62, 55, 44, 30, 18, 9, 5] },
    { name: 'Natural gas', color: '#E4573A', values: [20, 26, 33, 38, 40, 36, 30] },
    { name: 'Renewables', color: '#1FA971', values: [6, 7, 10, 18, 30, 44, 57] },
  ],
}

const POWER_CHART = lineChartImage({
  title: 'Electricity generated from three sources in Valmora, 1995–2025',
  yUnit: '% of total',
  xLabels: POWER.years,
  yMax: 70, yStep: 10,
  series: POWER.series,
})

const POWER_FACTS = POWER.series.map(s =>
  `${s.name}: ` + s.values.map((v, i) => `${POWER.years[i]} ${v}%`).join(', '))

// ─── Mock 2 ──────────────────────────────────────────────────────────────────

export const MOCK_2: IeltsMock = {
  id: 'mock-2',
  title: 'Пробник 2',
  about: 'Курсы кулинарии, открытие музея, сон и память, лекция о бетоне · история бумаги, городские фермы, польза скуки',

  // ── Listening ──────────────────────────────────────────────────────────────
  listening: [
    {
      title: 'Part 1',
      voices: { N: 'm', A: 'm', B: 'f' },
      script: [
        { who: 'N', text: 'Part 1. You will hear a woman phoning an adult learning centre to register for an evening course.' },
        { who: 'A', text: 'Good afternoon, Westbrook Adult Learning Centre, Simon speaking. How can I help you?' },
        { who: 'B', text: "Hello. I'm calling about your evening cooking courses. I'd like to sign up for one, if there are still places." },
        { who: 'A', text: 'Certainly. Let me just open the registration form. Can I have your name, please?' },
        { who: 'B', text: "Yes, it's Laura Hartley. That's H. A. R. T. L. E. Y." },
        { who: 'A', text: "Thank you. And which course are you interested in? This term we've got Italian, Thai and Indian." },
        { who: 'B', text: 'I was hoping to do the Italian one, but a friend told me it fills up very quickly.' },
        { who: 'A', text: "I'm afraid she's right. Italian is completely full, and the waiting list is quite long." },
        { who: 'B', text: "Oh, never mind. I'll go for Thai, then. I've always wanted to learn to make a proper curry." },
        { who: 'A', text: 'Good choice. The Thai course runs on Tuesday evenings.' },
        { who: 'B', text: "Tuesdays? Oh dear, that's my yoga night. Is there another group?" },
        { who: 'A', text: 'Let me have a look. Yes, there is a second group on Wednesday evenings, and that one still has a few places.' },
        { who: 'B', text: 'Wednesday is perfect. How many weeks does it last?' },
        { who: 'A', text: "Most of our courses are eight weeks long, but the Thai course is a little longer. It's ten weeks, starting at the beginning of October." },
        { who: 'B', text: 'Lovely.' },
        { who: 'A', text: 'Now, I need your address, please.' },
        { who: 'B', text: "It's 27 Bramley Road. That's B. R. A. M. L. E. Y." },
        { who: 'A', text: "Thank you. Now, the fee. The full price is one hundred and eighty pounds. But are you a member of the city library? Library members get a discount." },
        { who: 'B', text: 'Yes, I have a library card.' },
        { who: 'A', text: "Then the fee comes down to a hundred and fifty pounds. You can pay on the first evening." },
        { who: 'B', text: 'Great. Do I need to bring any equipment? Knives, for example?' },
        { who: 'A', text: "No, some people bring their own knives, but there's really no need. Knives, pans and all the ingredients are provided. The only thing you need to bring is an apron." },
        { who: 'B', text: 'An apron. Fine. And what time do the classes start?' },
        { who: 'A', text: "Classes start at seven and finish at half past nine. But on the first evening, could you arrive at a quarter to seven? There's a short safety talk before the class begins." },
        { who: 'B', text: 'Of course. Is the class in the main building?' },
        { who: 'A', text: "No, it isn't. The cookery classes are held in the Garden Kitchen. That's the single-storey building behind the car park." },
        { who: 'B', text: 'Behind the car park. Got it.' },
        { who: 'A', text: "Finally, can I ask how you heard about the course? We're trying to find out which advertising works." },
        { who: 'B', text: "My neighbour told me about it. Oh no, wait, that was the pottery class. For this one, I saw a leaflet in the library." },
        { who: 'A', text: "Thank you, Ms Hartley. You're all registered. We'll send a confirmation by email." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        title: 'Westbrook Adult Learning Centre — Course registration',
        questions: [
          { n: 1, text: 'Name: Laura ___', answer: ['hartley'] },
          { n: 2, text: 'Course: ___ cooking', answer: ['thai'] },
          { n: 3, text: 'Day: ___ evenings', answer: ['wednesday'] },
          { n: 4, text: 'Length of course: ___ weeks', answer: ['10', 'ten'] },
          { n: 5, text: 'Address: 27 ___ Road', answer: ['bramley'] },
          { n: 6, text: 'Fee (with library discount): £___', answer: ['150', 'a hundred and fifty', 'one hundred and fifty', 'hundred and fifty'] },
          { n: 7, text: 'Student must bring: an ___', answer: ['apron', 'an apron'] },
          { n: 8, text: 'First evening: arrive at ___', answer: ['6.45', '6:45', 'a quarter to seven', 'quarter to seven', '6.45 pm', '6:45 pm', '6.45pm', '6:45pm', '18.45', '18:45'] },
          { n: 9, text: 'Location: the ___ Kitchen', answer: ['garden'] },
          { n: 10, text: 'Heard about the course from: a ___', answer: ['leaflet', 'a leaflet'] },
        ],
      }],
    },
    {
      title: 'Part 2',
      voices: { N: 'f', A: 'm' },
      script: [
        { who: 'N', text: 'Part 2. You will hear a radio presenter talking about the reopening of a city museum.' },
        { who: 'A', text: "Good morning, and welcome to What's On. This week the big news is that the Halden City Museum is finally reopening after being closed for nearly three years." },
        { who: 'A', text: "Many listeners have asked why it took so long. A lot of people assumed it was the roof, and it's true there were some leaks, but those were fixed within a few weeks. The main job was replacing all the electrical wiring, which hadn't been touched since the nineteen-fifties and had become a serious fire risk. There were also plans for a new entrance, but they were dropped to save money." },
        { who: 'A', text: "The reopening weekend is on the eighteenth and nineteenth of March. Normally adults pay eight pounds and children go in free. But for the opening weekend, nobody pays at all. Entry is free for everyone." },
        { who: 'A', text: "You don't need to book in advance. The side entrance on Mill Lane will stay closed until the summer, so everyone will be using the main doors on Castle Street. The museum is expecting big crowds, so my advice is simple: get there early. The doors open at ten, and the queue is likely to start well before that." },
        { who: 'A', text: "The café has moved, too. It used to be in the basement. Some reports said it would be on the top floor, but in fact it's now on the ground floor, next to the shop. Everything on the menu is made with food from farms within thirty miles of the city. It closes at five, the same time as the museum." },
        { who: 'A', text: "The museum is also looking for volunteers. They tell me they already have plenty of people to guide tours, and the shop is fully staffed. What they really need are volunteers to record the memories of older residents who worked in the city's factories, before those stories are lost." },
        { who: 'A', text: "Now, a quick tour of the galleries. On the ground floor is the Textile Gallery, where the star attraction is a loom from one of the old mills. It's been restored and it's working again, so you can watch it weaving cloth." },
        { who: 'A', text: "Next door is the Victorian Street, rebuilt with shop fronts and an old pharmacy. Children love it, because there are costumes from the period that they can try on, and then walk down the street dressed as Victorians." },
        { who: 'A', text: "Upstairs, the River Gallery tells the story of how the river shaped the city. There used to be a large model here, but it has been replaced by a touch-screen map showing how the riverbanks have changed over five hundred years." },
        { who: 'A', text: "The Voices Room is small and quiet. You sit down, put on headphones and listen to recorded interviews with people who remember the great flood that hit the city in their childhood." },
        { who: 'A', text: "And finally, the Treasures Gallery displays objects that spent decades in storage and have never been shown to the public before, including a beautiful silver clock. People often ask whether photography is allowed in there. The answer is yes: you can take photos everywhere in the museum, including this gallery." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            11: [{ key: 'A', text: 'repair the roof' }, { key: 'B', text: 'build a new entrance' }, { key: 'C', text: 'replace the electrical wiring' }],
            12: [{ key: 'A', text: 'everyone can enter free of charge' }, { key: 'B', text: 'adults pay half price' }, { key: 'C', text: 'only children can enter free' }],
            13: [{ key: 'A', text: 'book tickets in advance' }, { key: 'B', text: 'use the side entrance' }, { key: 'C', text: 'arrive early' }],
            14: [{ key: 'A', text: 'uses food from local farms' }, { key: 'B', text: 'is on the top floor' }, { key: 'C', text: 'stays open in the evening' }],
            15: [{ key: 'A', text: 'guide tours' }, { key: 'B', text: 'record older people\'s memories' }, { key: 'C', text: 'work in the shop' }],
          },
          questions: [
            { n: 11, text: 'The museum was closed mainly in order to', answer: ['C'] },
            { n: 12, text: 'On the opening weekend,', answer: ['A'] },
            { n: 13, text: 'The presenter advises visitors to', answer: ['C'] },
            { n: 14, text: 'The museum café', answer: ['A'] },
            { n: 15, text: 'The museum needs volunteers to', answer: ['B'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'What does the presenter say about each gallery? Choose FIVE answers from the list, A–G, next to Questions 16–20.',
          options: [
            { key: 'A', text: 'visitors can try on historical clothes' },
            { key: 'B', text: 'visitors can watch a machine working' },
            { key: 'C', text: 'it contains items never displayed before' },
            { key: 'D', text: 'visitors can listen to recorded interviews' },
            { key: 'E', text: 'it has a touch-screen map' },
            { key: 'F', text: 'photography is not allowed' },
            { key: 'G', text: 'there is a talk every day' },
          ],
          questions: [
            { n: 16, text: 'the Textile Gallery', answer: ['B'] },
            { n: 17, text: 'the Victorian Street', answer: ['A'] },
            { n: 18, text: 'the River Gallery', answer: ['E'] },
            { n: 19, text: 'the Voices Room', answer: ['D'] },
            { n: 20, text: 'the Treasures Gallery', answer: ['C'] },
          ],
        },
      ],
    },
    {
      title: 'Part 3',
      voices: { N: 'f', A: 'm', B: 'f', C: 'm' },
      script: [
        { who: 'N', text: 'Part 3. You will hear two psychology students, Hannah and Leo, discussing their research assignment on sleep and memory with their tutor.' },
        { who: 'A', text: "Come in, both of you. So, you've chosen sleep and memory for your project. Tell me why you decided to focus on students in particular." },
        { who: 'B', text: "Well, partly it's personal. We've both stayed up all night before an exam and wondered whether it actually helped. But the main reason is practical. We live in halls, so we can find participants in our own building very easily." },
        { who: 'A', text: "That's sensible. Now, I've read your proposal. Forty participants is fine for a project at this level, so don't worry about the numbers. My concern is how you were going to measure sleep. You planned simply to ask people how long they'd slept." },
        { who: 'C', text: 'Yes, with a questionnaire.' },
        { who: 'A', text: "The trouble is that people are notoriously bad at estimating that. Many of them get it wrong by an hour or more." },
        { who: 'C', text: 'We did think about using sleep diaries instead.' },
        { who: 'A', text: "Diaries have exactly the same problem, I'm afraid. They still depend on what people remember. But the department has a set of activity trackers that you wear on the wrist. They're not as accurate as a sleep laboratory, of course, but they're far better than people's own estimates, and you can borrow them." },
        { who: 'B', text: 'That would be great.' },
        { who: 'A', text: 'And how are you going to test memory?' },
        { who: 'B', text: "We originally wanted to use numbers, a bit like remembering phone numbers. But Leo found that most published studies use lists of words, and they're much easier to score." },
        { who: 'C', text: 'So we\'ve gone for word lists. Participants learn a list in the evening, and we test them the next morning.' },
        { who: 'A', text: "Good. One administrative point: the ethics application. Some students think they have until the end of the month, but you can't recruit anyone until it's approved, so I need it from you before next Friday." },
        { who: 'C', text: 'Before next Friday. Okay.' },
        { who: 'A', text: "Now, I'd strongly recommend that you run a small pilot study first, with three or four friends, just to check that the trackers and the word lists work the way you expect." },
        { who: 'B', text: 'That makes sense.' },
        { who: 'C', text: "I was also thinking we should leave out anyone who drinks coffee late in the evening. Caffeine could affect their sleep and spoil the results." },
        { who: 'A', text: 'Fair point, as long as you ask about it in advance.' },
        { who: 'B', text: "What about getting people to take part? Students are busy. I wondered if we could give everyone a voucher for the campus café as a thank you." },
        { who: 'C', text: 'Can we afford that?' },
        { who: 'B', text: "It would only be a few pounds each. I think it's worth it." },
        { who: 'A', text: "Another thing you should do is compare your results with a published study. Find one that used a similar word test and see whether your findings point in the same direction." },
        { who: 'C', text: 'And for the write-up, should we present the results in a table?' },
        { who: 'B', text: "I think a graph would be clearer. Then people can see the difference between the short sleepers and the long sleepers at a glance." },
        { who: 'C', text: 'Hmm. All right, a graph it is.' },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            21: [{ key: 'A', text: 'they had personal experience of the problem' }, { key: 'B', text: 'their tutor recommended it' }, { key: 'C', text: 'it would be easy to find participants' }],
            22: [{ key: 'A', text: 'the number of participants' }, { key: 'B', text: 'the way sleep would be measured' }, { key: 'C', text: 'the length of the project' }],
            23: [{ key: 'A', text: 'sleep diaries' }, { key: 'B', text: 'a questionnaire' }, { key: 'C', text: 'devices worn on the wrist' }],
            24: [{ key: 'A', text: 'lists of words' }, { key: 'B', text: 'sets of numbers' }, { key: 'C', text: 'pictures of faces' }],
            25: [{ key: 'A', text: 'before next Friday' }, { key: 'B', text: 'by the end of the month' }, { key: 'C', text: 'after the pilot study' }],
          },
          questions: [
            { n: 21, text: 'The main reason the students chose to study students\' sleep was that', answer: ['C'] },
            { n: 22, text: 'What worries the tutor about the students\' original plan?', answer: ['B'] },
            { n: 23, text: 'How will the students now measure sleep?', answer: ['C'] },
            { n: 24, text: 'The memory test will use', answer: ['A'] },
            { n: 25, text: 'The ethics application must be submitted', answer: ['A'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'Who makes each suggestion? Write the correct letter, A, B or C, next to Questions 26–30.',
          options: [
            { key: 'A', text: 'Hannah' },
            { key: 'B', text: 'Leo' },
            { key: 'C', text: 'the tutor' },
          ],
          questions: [
            { n: 26, text: 'running a small pilot study', answer: ['C'] },
            { n: 27, text: 'excluding people who drink coffee late', answer: ['B'] },
            { n: 28, text: 'giving participants a voucher', answer: ['A'] },
            { n: 29, text: 'comparing the results with a published study', answer: ['C'] },
            { n: 30, text: 'presenting the results as a graph', answer: ['A'] },
          ],
        },
      ],
    },
    {
      title: 'Part 4',
      voices: { N: 'm', A: 'f' },
      script: [
        { who: 'N', text: 'Part 4. You will hear a lecture about the history of concrete.' },
        { who: 'A', text: "Today I'd like to talk about a material that most of us walk on, live in and work in every day without giving it a second thought: concrete." },
        { who: 'A', text: "People often think of concrete as a modern invention, but the Romans were using it more than two thousand years ago. Their recipe combined lime with volcanic ash, which was found in large quantities near the Bay of Naples. The ash reacted with the lime to produce a material that was remarkably durable." },
        { who: 'A', text: "In fact, Roman concrete has properties that engineers are still studying. Structures built in harbours were in constant contact with the sea, and rather than weakening them, this contact seems to have made them stronger over time, as new minerals slowly formed inside the material." },
        { who: 'A', text: "The most famous Roman concrete building is the Pantheon in Rome. Its dome, completed nearly nineteen hundred years ago, is still the largest dome in the world made of unreinforced concrete." },
        { who: 'A', text: "After the fall of the Western Roman Empire, much of this knowledge was lost. For centuries, builders in Europe relied mainly on stone and brick, and concrete was used far less." },
        { who: 'A', text: "The modern story begins in the early nineteenth century. In eighteen twenty-four, an English builder called Joseph Aspdin patented a product he named Portland cement. It wasn't made in Portland. He chose the name because the hardened material looked like a type of stone quarried on the Isle of Portland, which was fashionable for buildings at the time." },
        { who: 'A', text: "Concrete, however, has one important weakness. It is extremely strong in compression, that is, when it is being squeezed, but weak in tension, when it is being pulled or bent. A concrete beam with nothing inside it will crack quite easily." },
        { who: 'A', text: "The solution came from an unlikely person. Joseph Monier was not an engineer but a French gardener who wanted stronger containers for his plants. In the eighteen-sixties he began making flower pots out of concrete with iron mesh set inside them, and he went on to patent the idea for other uses." },
        { who: 'A', text: "Iron was later replaced by steel, and the combination proved ideal. One reason is that steel and concrete expand and contract by almost the same amount when the temperature changes, so the two materials don't pull apart." },
        { who: 'A', text: "Today concrete is the most widely used man-made material on earth. But it comes at a price. Making cement involves heating limestone and clay in a kiln, a process that releases a great deal of greenhouse gas, and cement production is now a major source of the world's carbon emissions. Finding ways to reduce that impact is one of the biggest challenges facing the construction industry." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
        title: 'The history of concrete',
        questions: [
          { n: 31, text: 'The Romans mixed lime with volcanic ___', answer: ['ash'] },
          { n: 32, text: 'Roman harbour structures became stronger through contact with the ___', answer: ['sea'] },
          { n: 33, text: 'The dome of the ___ is the largest unreinforced concrete dome in the world', answer: ['pantheon'] },
          { n: 34, text: 'After the fall of Rome, much knowledge of concrete was ___', answer: ['lost'] },
          { n: 35, text: 'Portland cement was named after a type of ___', answer: ['stone'] },
          { n: 36, text: 'Concrete is strong in compression but weak in ___', answer: ['tension'] },
          { n: 37, text: 'Joseph Monier worked as a ___', answer: ['gardener'] },
          { n: 38, text: 'Monier strengthened flower ___ with iron mesh', answer: ['pots'] },
          { n: 39, text: 'Steel and concrete react similarly to changes in ___', answer: ['temperature'] },
          { n: 40, text: 'Cement production is a major source of carbon ___', answer: ['emissions'] },
        ],
      }],
    },
  ],

  // ── Reading ────────────────────────────────────────────────────────────────
  reading: [
    {
      title: 'From bark to books: the spread of paper',
      paragraphs: [
        { text: "Few inventions are as easy to overlook as paper. It is cheap, it is everywhere, and much of what is written on it is soon thrown away. Yet for most of human history, writing materials were expensive, heavy or fragile, and the arrival of paper changed what could be recorded, by whom, and in what quantities." },
        { text: "Before paper, people wrote on a wide variety of surfaces. In ancient Egypt, scribes used papyrus, made by pressing together thin strips cut from the stem of a reed that grew along the Nile. In China, texts were written on strips of bamboo tied together with cord, or on silk. Bamboo was cheap but bulky: a single long work might fill a cart. Silk was light and smooth but far too costly for everyday use. In Europe and the Middle East, the usual material was parchment, made from the specially treated skins of animals, which was durable but slow and expensive to produce." },
        { text: "Chinese tradition credits the invention of paper to Cai Lun, an official at the Han imperial court, who in 105 CE presented the emperor with a new writing material made from tree bark, hemp, old rags and fishing nets. Archaeologists, however, have since found fragments of paper in China that are clearly older than this date, some of them used for wrapping rather than writing. It seems more likely that Cai Lun improved and standardised an existing process than that he invented it from nothing. What is not in doubt is the method itself: plant fibres were soaked and beaten into a pulp, which was spread thinly on a screen, drained, pressed and dried. In its essentials, this is how paper is still made by hand today." },
        { text: "From China, papermaking spread slowly. It reached Korea and then Japan, where craftsmen developed fine papers from the bark of the mulberry and related plants. To the west, the decisive step is often linked to a battle fought near the river Talas in Central Asia in 751, after which, according to a well-known story, Chinese prisoners taught the craft to their captors in Samarkand. Many historians now treat this account with caution, since paper was probably already known in the region through trade. Either way, by the end of the eighth century paper was being produced in Baghdad, and the administration of the Abbasid Caliphate came to depend on it. Paper was cheaper than parchment, and because ink soaked into it, documents were harder to alter without the change being noticed." },
        { text: "Europe was a late adopter. Paper arrived through Muslim Spain, where a mill was operating at Xàtiva by the twelfth century, and through Italy, where the town of Fabriano became a famous centre of production in the thirteenth century. Italian papermakers introduced several improvements, including water-powered hammers to beat the pulp, and the watermark, a faint design pressed into the sheet that identified the mill which had made it. European paper was made mainly from linen rags, and collecting rags became a trade in its own right." },
        { text: "For two centuries, however, paper in Europe remained a secondary material. Important documents continued to be written on parchment, which was considered more durable. What changed this was printing. When Johannes Gutenberg developed his press with movable metal type in the middle of the fifteenth century, he printed some copies of his famous Bible on parchment, but most of them on paper, and the economics were obvious. Printing needed a material that could be produced in large quantities at a reasonable price, and only paper could meet that demand." },
        { text: "Demand eventually outgrew the supply of rags. In the nineteenth century, after many experiments, manufacturers learned to make paper from wood pulp, and machines that produced paper in continuous rolls replaced the hand-made sheet. Paper became cheap enough to be used for newspapers sold daily to huge numbers of readers. There was a cost, though, which only became clear later. Much of the paper made from wood pulp in this period was acidic, and books printed on it have turned yellow and brittle, while some far older books printed on rag paper remain in good condition." },
      ],
      groups: [
        {
          kind: 'tfng',
          instructions: 'Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.',
          questions: [
            { n: 1, text: 'In ancient China, bamboo was a more expensive writing material than silk.', answer: ['FALSE'] },
            { n: 2, text: 'Paper existed in China before 105 CE.', answer: ['TRUE'] },
            { n: 3, text: 'Some of the earliest paper found in China was used for wrapping.', answer: ['TRUE'] },
            { n: 4, text: 'Cai Lun was given a reward by the emperor for his writing material.', answer: ['NOT GIVEN'] },
            { n: 5, text: 'Historians agree that papermaking reached Samarkand through prisoners of war.', answer: ['FALSE'] },
            { n: 6, text: 'Documents on paper were difficult to change without the change being detected.', answer: ['TRUE'] },
            { n: 7, text: 'Large quantities of Japanese paper were exported to China.', answer: ['NOT GIVEN'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the notes below. Choose ONE WORD ONLY from the passage for each answer.',
          title: 'Writing materials and papermaking',
          questions: [
            { n: 8, text: 'Papyrus was made from strips of a ___ that grew along the Nile.', answer: ['reed'] },
            { n: 9, text: 'Parchment was made from the treated skins of ___', answer: ['animals'] },
            { n: 10, text: 'In Italy, water-powered ___ were used to beat the pulp.', answer: ['hammers'] },
            { n: 11, text: 'A ___ showed which mill had produced a sheet of paper.', answer: ['watermark'] },
            { n: 12, text: 'European paper was made mainly from linen ___', answer: ['rags'] },
            { n: 13, text: 'Much nineteenth-century paper was ___, so books printed on it became brittle.', answer: ['acidic'] },
          ],
        },
      ],
    },
    {
      title: 'Farming the city',
      paragraphs: [
        { label: 'A', text: "Across the world, food is now being grown in places once considered entirely unsuitable for it: on the roofs of supermarkets, inside disused warehouses, in converted shipping containers and on narrow strips of land beside railway lines. Growing food in towns is not in itself new. City dwellers have kept vegetable plots and animals for as long as cities have existed, and during the Second World War British citizens were urged to 'dig for victory' by turning parks and lawns into vegetable beds. What is new is the scale of the ambition, and the claim, made by some enthusiasts, that cities could one day produce a significant share of their own food." },
        { label: 'B', text: "Urban farming in fact covers a wide range of activities with little in common beyond their location. At one end are community gardens, where local residents share a plot of land and grow vegetables mainly for themselves. Rooftop farms make use of space that would otherwise be empty, although the weight of soil and water means that not every roof is strong enough to carry one. At the other end of the scale are vertical farms: large indoor facilities in which crops are grown in stacked layers under LED lights, often without soil at all. In these systems, known as hydroponics, the roots of the plants sit in water that is rich in nutrients, and temperature and humidity are controlled by computer." },
        { label: 'C', text: "Supporters often point first to environmental benefits, particularly the reduction in 'food miles', the distance food travels between where it is produced and where it is eaten. Food grown on a roof above a supermarket hardly needs to travel at all. Yet this advantage may be smaller than it first appears. For many foods, transport accounts for only a modest part of their total environmental impact; how the food is grown matters much more. A tomato grown in a heated greenhouse nearby may be responsible for more emissions than one grown outdoors in a sunny country and carried a long distance by ship." },
        { label: 'D', text: "The strongest case for urban farming may have little to do with the quantity of food produced. Community gardens bring together neighbours who might otherwise never meet, and many people report that working outdoors with their hands improves their mood. Schools use gardens to teach children where food comes from, and children who help to grow vegetables are often more willing to eat them. In poorer neighbourhoods with few shops selling fresh fruit and vegetables, sometimes called food deserts, a local garden can also improve people's diets in a direct and practical way." },
        { label: 'E', text: "Growing food in cities brings particular risks, however. Much of the land available for farming is available precisely because it was previously used for industry, and the soil on such sites may contain lead and other harmful substances left behind decades earlier. Vegetables grown in contaminated ground can absorb these substances. For this reason, soil on former industrial land needs to be tested before anything edible is planted, and many urban growers avoid the problem altogether by using raised beds filled with imported soil." },
        { label: 'F', text: "Vertical farms face a different difficulty: cost. Replacing the sun with artificial light requires a great deal of electricity, and buildings in cities are expensive to rent. As a result, most vertical farms grow leafy greens and herbs, which grow quickly, take up little space and can be sold at relatively high prices. Staple crops such as wheat and rice, which need large areas and sell cheaply, would make no economic sense under artificial light. Several well-funded vertical farming companies have closed in recent years, a reminder that the technology is still searching for a reliable business model." },
        { label: 'G', text: "None of this means that urban farming is a passing fashion. It is very unlikely ever to feed a large city on its own, and claims that it will do so risk disappointing the public. But that is perhaps the wrong standard by which to judge it. A farm that produces modest amounts of food while also bringing a neighbourhood together, educating children and giving people a reason to spend time outdoors may be succeeding, even if its harvest would feed no more than a few families. The challenge for city planners is to judge such projects by everything they offer, not simply by the weight of what they produce." },
      ],
      groups: [
        {
          kind: 'match',
          instructions: 'The passage has seven paragraphs, A–G. Choose the correct heading for paragraphs B–G from the list of headings below. (Some headings are not used. Paragraph A is not included.)',
          options: [
            { key: 'i', text: 'A long tradition with new ambitions' },
            { key: 'ii', text: 'Very different methods under one name' },
            { key: 'iii', text: 'An environmental argument that may be exaggerated' },
            { key: 'iv', text: 'Gains for communities, health and education' },
            { key: 'v', text: 'A threat hidden in the ground' },
            { key: 'vi', text: 'Why only some crops are profitable indoors' },
            { key: 'vii', text: 'Choosing the right measure of success' },
            { key: 'viii', text: 'Government funding for city farms' },
          ],
          questions: [
            { n: 14, text: 'Paragraph B', answer: ['ii'] },
            { n: 15, text: 'Paragraph C', answer: ['iii'] },
            { n: 16, text: 'Paragraph D', answer: ['iv'] },
            { n: 17, text: 'Paragraph E', answer: ['v'] },
            { n: 18, text: 'Paragraph F', answer: ['vi'] },
            { n: 19, text: 'Paragraph G', answer: ['vii'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          title: 'Ways of farming in cities',
          questions: [
            { n: 20, text: 'In vertical farms, crops are grown in stacked layers under ___', answer: ['led lights'] },
            { n: 21, text: 'In hydroponic systems, plant roots sit in ___ that is rich in nutrients.', answer: ['water'] },
            { n: 22, text: 'Neighbourhoods with few shops selling fresh produce are sometimes called ___', answer: ['food deserts'] },
            { n: 23, text: 'To avoid contaminated land, many growers use raised beds filled with ___', answer: ['imported soil'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            24: [
              { key: 'A', text: 'locally grown food always has a smaller environmental impact' },
              { key: 'B', text: 'the way food is grown can matter more than how far it travels' },
              { key: 'C', text: 'heated greenhouses should no longer be used' },
              { key: 'D', text: 'transport by ship produces no emissions' },
            ],
            25: [
              { key: 'A', text: 'need very little light' },
              { key: 'B', text: 'are the crops most popular with city residents' },
              { key: 'C', text: 'grow quickly and can be sold at relatively high prices' },
              { key: 'D', text: 'can be grown without water' },
            ],
            26: [
              { key: 'A', text: 'urban farming will soon be able to feed large cities' },
              { key: 'B', text: 'vertical farms are the most promising form of urban farming' },
              { key: 'C', text: 'community gardens should replace rooftop farms' },
              { key: 'D', text: 'urban farms should be judged by their wider benefits' },
            ],
          },
          questions: [
            { n: 24, text: 'The writer uses the example of the tomato to show that', answer: ['B'] },
            { n: 25, text: 'According to paragraph F, most vertical farms grow leafy greens and herbs because these crops', answer: ['C'] },
            { n: 26, text: 'What is the writer\'s main conclusion?', answer: ['D'] },
          ],
        },
      ],
    },
    {
      title: 'Is boredom useful?',
      paragraphs: [
        { text: "Boredom has a poor reputation. Parents treat it as a problem to be solved, usually by finding their children something to do; employers see it as a cause of mistakes and resignations; and a whole industry of entertainment exists, in effect, to ensure that nobody need ever experience it. When people describe a film, a lesson or a meeting as boring, they are not paying it a compliment. It is worth asking, however, whether this hostility is justified, or whether, in our eagerness to eliminate boredom, we have thrown away something of value." },
        { text: "It helps first to be clear about what boredom is. It is not the same as having nothing to do. A person waiting for a train with nothing to do may be perfectly content, watching the other passengers or thinking about the weekend. Boredom is rather the uncomfortable feeling that one's attention has nowhere satisfying to go: the present activity fails to engage us, yet we cannot, or feel we cannot, turn to anything else. It is, in this sense, a signal, and like other unpleasant signals, such as hunger or pain, it exists for a reason." },
        { text: "That reason, according to a view that many psychologists now share, is that boredom tells us that what we are doing is no longer worthwhile, and pushes us to look for something better. An animal that never grew bored would continue the same unrewarding activity indefinitely. Seen this way, boredom is not a failure of character but a useful piece of mental equipment, one that encourages exploration and change. I find this argument persuasive, although a signal is only useful if we respond to it sensibly." },
        { text: "A second claim made on boredom's behalf is that it encourages creativity. In some experiments, people who were first asked to complete a deliberately dull task, such as copying out lists of numbers, later produced more ideas in a creative exercise than people who had skipped the dull task. The usual explanation is that an under-occupied mind begins to wander, and that mind-wandering allows unexpected connections to form. Many writers and scientists have described ideas arriving not at their desks but on long walks or during tedious journeys. I would not want to make too much of these findings; laboratory tasks are a long way from real creative work, and some people's minds, when they wander, simply wander towards their worries. But the general point seems sound: a mind that is constantly occupied has little room for ideas of its own." },
        { text: "This is why the modern response to boredom concerns me more than boredom itself. Smartphones have made it possible to escape even a few seconds of empty time. In a queue, on a bus, during a pause in a conversation, the screen is always available, and it offers stimulation that requires no effort. The result is not that we are never bored, but that we never stay bored long enough for the feeling to lead anywhere. We silence the signal, as it were, without ever reading the message. In one widely reported study, many participants who were left alone in a room with nothing to do but think chose to give themselves mild electric shocks rather than sit quietly. Whatever else this shows, it suggests that many people find their own thoughts surprisingly hard to tolerate." },
        { text: "None of this means that all boredom is good. Chronic boredom, the kind experienced by people trapped for long periods in monotonous work or in circumstances they cannot change, is associated with a range of problems, from poor concentration to unhealthy habits. Telling a worker on a repetitive production line that boredom is good for creativity would be both unhelpful and insulting. The case for boredom applies to short, ordinary episodes of it, and to people who have some freedom to act on what it tells them." },
        { text: "What, then, should we do? The answer is not to seek out boredom deliberately, which would rather miss the point, but to be slower to escape from it. Children who are occasionally left without organised activities often invent their own games, and in doing so learn to direct their own attention. Adults, too, might benefit from leaving the phone in a pocket on the bus and seeing where their thoughts go. Boredom is uncomfortable, but discomfort is not always a sign that something is wrong. Sometimes it is simply the feeling of a mind being asked to do its own work." },
      ],
      groups: [
        {
          kind: 'ynng',
          instructions: 'Do the following statements agree with the claims of the writer in the passage? Choose YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.',
          questions: [
            { n: 27, text: 'Being bored and having nothing to do are the same thing.', answer: ['NO'] },
            { n: 28, text: 'Boredom performs a function similar to that of hunger or pain.', answer: ['YES'] },
            { n: 29, text: 'Animals experience boredom more intensely than humans do.', answer: ['NOT GIVEN'] },
            { n: 30, text: 'The results of laboratory experiments on boredom and creativity should be treated with some caution.', answer: ['YES'] },
            { n: 31, text: 'People should deliberately look for situations that make them bored.', answer: ['NO'] },
            { n: 32, text: 'Boredom at work is a more serious problem today than it was in the past.', answer: ['NOT GIVEN'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            33: [
              { key: 'A', text: 'is certain to feel bored' },
              { key: 'B', text: 'may not feel bored at all' },
              { key: 'C', text: 'will usually look at a phone' },
              { key: 'D', text: 'is likely to make mistakes' },
            ],
            34: [
              { key: 'A', text: 'they make boredom more intense' },
              { key: 'B', text: 'they are often used during conversations' },
              { key: 'C', text: 'they let people escape boredom before it can be useful' },
              { key: 'D', text: 'they cause chronic boredom' },
            ],
            35: [
              { key: 'A', text: 'many people find it hard to be alone with their thoughts' },
              { key: 'B', text: 'mild electric shocks can increase creativity' },
              { key: 'C', text: 'people become bored more quickly in a room' },
              { key: 'D', text: 'most people enjoy time to think quietly' },
            ],
            36: [
              { key: 'A', text: 'factory work encourages creativity' },
              { key: 'B', text: 'the argument for boredom has limits' },
              { key: 'C', text: 'employers should reduce repetitive tasks' },
              { key: 'D', text: 'chronic boredom is rare' },
            ],
          },
          questions: [
            { n: 33, text: 'According to the writer, a person waiting for a train with nothing to do', answer: ['B'] },
            { n: 34, text: 'What is the writer\'s main concern about smartphones?', answer: ['C'] },
            { n: 35, text: 'The writer refers to the study involving electric shocks to suggest that', answer: ['A'] },
            { n: 36, text: 'The writer mentions a worker on a production line in order to show that', answer: ['B'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'Complete each sentence with the correct ending, A–F, below.',
          options: [
            { key: 'A', text: 'by finding them something to do.' },
            { key: 'B', text: 'with problems ranging from poor concentration to unhealthy habits.' },
            { key: 'C', text: 'often invent their own games.' },
            { key: 'D', text: 'has little room for ideas of its own.' },
            { key: 'E', text: 'becomes more productive at work.' },
            { key: 'F', text: 'quickly loses interest in entertainment.' },
          ],
          questions: [
            { n: 37, text: 'Parents typically respond to boredom in children', answer: ['A'] },
            { n: 38, text: 'Chronic boredom is associated', answer: ['B'] },
            { n: 39, text: 'Children who are sometimes left without organised activities', answer: ['C'] },
            { n: 40, text: 'A mind that is constantly occupied', answer: ['D'] },
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
      prompt: 'The graph below shows the percentage of electricity generated from coal, natural gas and renewable sources in the country of Valmora between 1995 and 2025.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      image: POWER_CHART,
      facts: POWER_FACTS,
    },
    {
      task: 2,
      minWords: 250,
      minutes: 40,
      prompt: 'In many countries, a growing number of people now work from home for at least part of the week. Some people believe this is a positive development for both workers and society as a whole.\n\nTo what extent do you agree or disagree?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.',
    },
  ],

  // ── Speaking ───────────────────────────────────────────────────────────────
  speaking: [
    {
      part: 1,
      title: 'Part 1 · Introduction and interview',
      answerSeconds: 40,
      questions: [
        'Where do you live at the moment?',
        'What do you like most about the area where you live?',
        'Let\'s talk about music. What kind of music do you usually listen to?',
        'Did you learn to play a musical instrument as a child?',
        'Now let\'s talk about weekends. How do you usually spend your weekends?',
        'Do you prefer busy weekends or quiet ones?',
      ],
    },
    {
      part: 2,
      title: 'Part 2 · Long turn',
      answerSeconds: 120,
      prepSeconds: 60,
      card: {
        topic: 'Describe a time when you had to wait a long time for something.',
        points: ['what you were waiting for', 'how long you had to wait', 'what you did while you were waiting'],
        close: 'and explain how you felt when the wait was over.',
      },
    },
    {
      part: 3,
      title: 'Part 3 · Discussion',
      answerSeconds: 60,
      questions: [
        'Do you think people today are less patient than people in the past?',
        'Why do some people find waiting so difficult?',
        'How can technology reduce the time people spend waiting, for example for public services?',
        'Is patience a quality that can be taught, or is it something people are born with?',
      ],
    },
  ],
}
