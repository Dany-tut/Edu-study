// ─────────────────────────────────────────────────────────────────────────────
// Пробник IELTS Academic № 3. Формат, правила и оговорки — в ieltsMocks.ts.
// Импорт типов только как type: значение отсюда тянет ieltsMocks.ts, и обычный
// импорт замкнул бы круг.
// ─────────────────────────────────────────────────────────────────────────────

import type { IeltsMock } from './ieltsMocks'
import { processFlowImage } from './seedImages'

// ─── Mock 3 · Writing Task 1 ─────────────────────────────────────────────────

// Этапы задаются один раз: из них строится и схема, и список фактов для модели.
const OLIVE_OIL_STEPS = [
  'Olives picked from trees',
  'Leaves and twigs removed',
  'Olives washed in cold water',
  'Crushed into a paste',
  'Paste stirred slowly',
  'Oil separated by spinning',
  'Oil left to settle',
  'Oil filtered',
  'Bottled and stored in the dark',
]

const OLIVE_OIL_DIAGRAM = processFlowImage('How olive oil is produced', OLIVE_OIL_STEPS)

const OLIVE_OIL_FACTS = [
  `The process has ${OLIVE_OIL_STEPS.length} stages, from harvesting to storage`,
  ...OLIVE_OIL_STEPS.map((s, i) => `Stage ${i + 1}: ${s}`),
]

// ─── Mock 3 ──────────────────────────────────────────────────────────────────

export const MOCK_3: IeltsMock = {
  id: 'mock-3',
  title: 'Пробник 3',
  about: 'Абонемент в спортзал, волонтёры в больнице, эффект приманки, навигация животных · стекло, ревайлдинг, почерк',

  // ── Listening ──────────────────────────────────────────────────────────────
  listening: [
    {
      title: 'Part 1',
      voices: { N: 'm', A: 'm', B: 'f' },
      script: [
        { who: 'N', text: 'Part 1. You will hear a woman phoning a leisure centre to ask about gym membership.' },
        { who: 'A', text: 'Good afternoon, Riverside Leisure Centre, Tom speaking. How can I help?' },
        { who: 'B', text: "Hello. I'm thinking of joining the gym, and I wondered if you could tell me a bit about it." },
        { who: 'A', text: "Of course. I can take a few details and set up the membership over the phone, if you like. Can I have your name?" },
        { who: 'B', text: "Yes, it's Sophie Lindqvist." },
        { who: 'A', text: 'Could you spell the surname for me?' },
        { who: 'B', text: 'Sure. L. I. N. D. Q. V. I. S. T.' },
        { who: 'A', text: 'Thank you. And your address?' },
        { who: 'B', text: "It's 27 Cranbrook Road. That's C. R. A. N. B. R. O. O. K." },
        { who: 'A', text: "Lovely, that's only five minutes from us. Now, what sort of membership were you thinking of? There's full membership, which means you can come in at any time, and there's off-peak." },
        { who: 'B', text: "I was going to go for full membership. But actually, I work from home most afternoons, so I could easily come during the day. When are the off-peak hours?" },
        { who: 'A', text: 'Weekdays from ten until four, and all day at the weekend.' },
        { who: 'B', text: "That suits me. I'll have off-peak, then." },
        { who: 'A', text: "Right. Full membership is forty-five pounds a month, and off-peak is normally thirty-eight. But if you pay by direct debit, there's a discount, which brings it down to thirty-two pounds a month." },
        { who: 'B', text: "Direct debit is fine. Are classes included in that?" },
        { who: 'A', text: "Most of them, yes. Was there a particular class you were interested in?" },
        { who: 'B', text: "Yoga, ideally." },
        { who: 'A', text: "I'm afraid the yoga classes are full until January. But we do have places in pilates, on Monday and Thursday mornings." },
        { who: 'B', text: "I've never tried it, but why not? Put me down for pilates." },
        { who: 'A', text: "Done. Before you can use the equipment, you'll need an induction session with one of our trainers. It lasts about an hour. Could you come in on Tuesday at eleven?" },
        { who: 'B', text: "Tuesday's difficult, I've got a meeting. Is Wednesday possible?" },
        { who: 'A', text: "Wednesday at eleven, yes, that's free. I'll book you in." },
        { who: 'B', text: "Great. Do I need to bring anything?" },
        { who: 'A', text: "Just a passport-sized photo for your membership card. You don't need any documents, because we've already got your details." },
        { who: 'B', text: "Okay. And is there parking? I might drive if it's raining." },
        { who: 'A', text: "Yes, the car park is free for members for up to three hours. After that, it's two pounds an hour." },
        { who: 'B', text: "Three hours is more than enough. What about the changing rooms? Are there lockers?" },
        { who: 'A', text: "There are, but they don't have keys. You'll need to bring your own padlock. We sell them at reception for five pounds, but you'll find them cheaper in the supermarket." },
        { who: 'B', text: "Good to know." },
        { who: 'A', text: "Last question. How did you hear about us? Was it our website?" },
        { who: 'B', text: "I did have a look at the website, but really it was a colleague who recommended you. She's been coming here for years." },
        { who: 'A', text: "That's nice to hear. Well, we'll see you on Wednesday." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        title: 'Riverside Leisure Centre — New member',
        questions: [
          { n: 1, text: 'Name: Sophie ___', answer: ['lindqvist'] },
          { n: 2, text: 'Address: 27 ___ Road', answer: ['cranbrook'] },
          { n: 3, text: 'Membership type: ___', answer: ['off-peak', 'off peak'] },
          { n: 4, text: 'Monthly fee (by direct debit): £___', answer: ['32', 'thirty-two', 'thirty two'] },
          { n: 5, text: 'Class she will join: ___', answer: ['pilates'] },
          { n: 6, text: 'Induction session: ___ at 11 am', answer: ['wednesday'] },
          { n: 7, text: 'Must bring: a passport-sized ___', answer: ['photo'] },
          { n: 8, text: 'Free parking for up to ___ hours', answer: ['3', 'three'] },
          { n: 9, text: 'Lockers: members bring their own ___', answer: ['padlock'] },
          { n: 10, text: 'Heard about the centre from: a ___', answer: ['colleague'] },
        ],
      }],
    },
    {
      title: 'Part 2',
      voices: { N: 'm', A: 'f' },
      script: [
        { who: 'N', text: 'Part 2. You will hear the manager of a hospital volunteer programme talking to new volunteers.' },
        { who: 'A', text: "Good morning, everyone, and thank you for coming. My name is Linda Okafor, and I manage the volunteer service here at Westbrook General Hospital." },
        { who: 'A', text: "First, a little background. Our volunteer programme is older than most people think. It's often said that the nurses set it up, and they certainly supported it from the start, but in fact it was begun in the nineteen-eighties by a former patient. He'd spent several months on the wards and wanted to give something back." },
        { who: 'A', text: "Now, many of you have asked how much time you'll need to give. A lot of people assume we expect you every week. We don't. Some of our volunteers do four hours a week, which is wonderful, but the minimum we ask for is two shifts a month." },
        { who: 'A', text: "A few rules. You're very welcome to sit and chat with patients. That's really the heart of what we do. Mobile phones are fine, as long as they're on silent and you never take photographs. You can also use the staff canteen, and you'll get the staff discount there. But there's one rule we're absolutely strict about: never give a patient anything to eat or drink, not even a glass of water. Many patients are on special diets, or they may be waiting for an operation." },
        { who: 'A', text: "When you arrive for a shift, please don't go to the main reception. It's very busy, and they won't know who you are. The security desk is only for contractors. Instead, sign in at the volunteer office. It's on the ground floor, next to the chapel." },
        { who: 'A', text: "Training. First aid isn't required for any of our roles, so don't worry about that. Fire safety is an online course that your supervisor will set you during your first month. But today, before anyone goes near a ward, all of you will complete the hand hygiene training. That's this afternoon." },
        { who: 'A', text: "Now let me run through the roles you can choose from. On the welcome desk, you'll be helping visitors find their way around the building. Some people imagine this means pushing wheelchairs, but that's done by our porters. What's really useful on the desk is if you speak another language, because many of our visitors don't speak English as their first language." },
        { who: 'A', text: "The hospital shop is open from eight in the morning until eight at night. The mornings are well covered, but we're really short of people after six in the evenings, so if you're free then, please think about the shop." },
        { who: 'A', text: "The garden project is our newest role. It only started in the spring of this year. Patients from the children's ward sometimes visit the garden, but the volunteers there don't work with them directly. That's done by our play specialists." },
        { who: 'A', text: "You might expect the shop to be the role everyone wants, but in fact the most popular one by far is ward companion. You'll be visiting patients who don't have many visitors of their own. There's actually a waiting list for it at the moment." },
        { who: 'A', text: "And finally, patient transport. Volunteers drive patients home after appointments. We provide the car, but you must have held a full driving licence for at least two years." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            11: [{ key: 'A', text: 'a former patient' }, { key: 'B', text: 'a group of nurses' }, { key: 'C', text: 'the hospital director' }],
            12: [{ key: 'A', text: 'one shift a week' }, { key: 'B', text: 'two shifts a month' }, { key: 'C', text: 'four hours a week' }],
            13: [{ key: 'A', text: 'give patients food or drink' }, { key: 'B', text: 'use the staff canteen' }, { key: 'C', text: 'use their mobile phones' }],
            14: [{ key: 'A', text: 'at the main reception' }, { key: 'B', text: 'at the volunteer office' }, { key: 'C', text: 'at the security desk' }],
            15: [{ key: 'A', text: 'first aid' }, { key: 'B', text: 'fire safety' }, { key: 'C', text: 'hand hygiene' }],
          },
          questions: [
            { n: 11, text: 'The volunteer programme was started by', answer: ['A'] },
            { n: 12, text: 'The minimum time volunteers must give is', answer: ['B'] },
            { n: 13, text: 'Volunteers must never', answer: ['A'] },
            { n: 14, text: 'At the start of each shift, volunteers should sign in', answer: ['B'] },
            { n: 15, text: 'On their first day, all volunteers will be trained in', answer: ['C'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'What does the speaker say about each volunteer role? Choose FIVE answers from the list, A–G, next to Questions 16–20.',
          options: [
            { key: 'A', text: 'requires a driving licence' },
            { key: 'B', text: 'needs more people in the evenings' },
            { key: 'C', text: 'involves working with children' },
            { key: 'D', text: 'is suitable for people who speak other languages' },
            { key: 'E', text: 'was introduced this year' },
            { key: 'F', text: 'is the most popular role' },
            { key: 'G', text: 'involves pushing wheelchairs' },
          ],
          questions: [
            { n: 16, text: 'welcome desk', answer: ['D'] },
            { n: 17, text: 'hospital shop', answer: ['B'] },
            { n: 18, text: 'garden project', answer: ['E'] },
            { n: 19, text: 'ward companion', answer: ['F'] },
            { n: 20, text: 'patient transport', answer: ['A'] },
          ],
        },
      ],
    },
    {
      title: 'Part 3',
      voices: { N: 'm', A: 'f', B: 'm' },
      script: [
        { who: 'N', text: 'Part 3. You will hear two psychology students, Priya and Jack, discussing a case-study presentation on the decoy effect in marketing.' },
        { who: 'A', text: "Okay, Jack, the presentation's on Monday, so we really need to sort out the final plan. Just remind me why we went for the cinema case study? Dr Hughes suggested the supermarket one." },
        { who: 'B', text: "She did, and the supermarket data was much easier to find. But I worked at a cinema last summer, and I actually saw the popcorn prices change while I was there. It felt like a waste not to use that." },
        { who: 'A', text: "True, it makes it more real. What's been the hardest part for you so far?" },
        { who: 'B', text: "Not the theory. The basic idea is really simple: you add a third option that nobody really wants, so the most expensive one looks like good value. No, it's been the sources. So many websites repeat the same popcorn story without saying where it came from. It took me ages to find anything reliable." },
        { who: 'A', text: "Same here. One thing that worries me, though, is the audience. I don't think they'll find it too simple. My worry is that they'll mix it up with anchoring, because we covered that only two weeks ago, and the two effects sound quite similar." },
        { who: 'B', text: "Good point. We'll need to make the difference clear. What about getting the audience involved? I'd thought about a quiz at the end." },
        { who: 'A', text: "We'll never have time for a quiz. What if we show them the three popcorn sizes with prices at the very start and ask them to choose one? Then we can reveal what most of them picked." },
        { who: 'B', text: "I like that. Much better than a video, too. And what do you think about the ethics? Is it manipulation?" },
        { who: 'A', text: "I'm not sure. What do you think?" },
        { who: 'B', text: "I don't think it's dishonest, really, as long as all the prices are displayed clearly. Nobody's hiding anything. The customer still makes the choice." },
        { who: 'A', text: "Okay. Now let's go through the sections. The introduction. I timed it yesterday, and it's nearly three minutes." },
        { who: 'B', text: "That's far too long for an introduction. Let's cut it down to one minute." },
        { who: 'A', text: "Agreed. Then the background of the cinema company. I wanted to add more detail about their history." },
        { who: 'B', text: "Honestly, I'd take that section out completely. It has nothing to do with the psychology." },
        { who: 'A', text: "You're right. It goes. The explanation of the theory is fine as it is, I think." },
        { who: 'B', text: "The words are fine, but people will understand it much faster if they can see it. Let's add a diagram showing the three options." },
        { who: 'A', text: "Good, I'll draw it. And the ethics section? At the moment it's in the middle." },
        { who: 'B', text: "It would work better as the last thing we talk about. It leads straight into questions from the audience." },
        { who: 'A', text: "Yes, let's move it to the end. And finally, the limitations of the study. I'm not sure we're allowed to criticise the original research in a case study." },
        { who: 'B', text: "Neither am I. Let's ask Dr Hughes before we write anything. I'll email her tonight." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            21: [{ key: 'A', text: 'their tutor recommended it' }, { key: 'B', text: 'one of them had seen it at first hand' }, { key: 'C', text: 'the data was easy to find' }],
            22: [{ key: 'A', text: 'understanding the theory' }, { key: 'B', text: 'finding reliable sources' }, { key: 'C', text: 'agreeing on a structure' }],
            23: [{ key: 'A', text: 'confuse it with another effect' }, { key: 'B', text: 'find the topic too simple' }, { key: 'C', text: 'not see its relevance' }],
            24: [{ key: 'A', text: 'asking the audience to choose a popcorn size' }, { key: 'B', text: 'showing a short video' }, { key: 'C', text: 'giving a quiz at the end' }],
            25: [{ key: 'A', text: 'it is always unacceptable' }, { key: 'B', text: 'it is acceptable if prices are clear' }, { key: 'C', text: 'it depends on the product' }],
          },
          questions: [
            { n: 21, text: 'They chose the cinema case study mainly because', answer: ['B'] },
            { n: 22, text: 'Jack says the most difficult part of the preparation has been', answer: ['B'] },
            { n: 23, text: 'Priya is worried that the audience may', answer: ['A'] },
            { n: 24, text: 'They decide to involve the audience by', answer: ['A'] },
            { n: 25, text: 'What is Jack\'s view of the ethics of the technique?', answer: ['B'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'What do the students decide to do with each section of the presentation? Choose FIVE answers from the list, A–G, next to Questions 26–30.',
          options: [
            { key: 'A', text: 'remove it' },
            { key: 'B', text: 'shorten it' },
            { key: 'C', text: 'add a diagram' },
            { key: 'D', text: 'check with the tutor' },
            { key: 'E', text: 'move it to the end' },
            { key: 'F', text: 'keep it as it is' },
            { key: 'G', text: 'add more examples' },
          ],
          questions: [
            { n: 26, text: 'introduction', answer: ['B'] },
            { n: 27, text: 'background of the company', answer: ['A'] },
            { n: 28, text: 'explanation of the theory', answer: ['C'] },
            { n: 29, text: 'ethics', answer: ['E'] },
            { n: 30, text: 'limitations of the study', answer: ['D'] },
          ],
        },
      ],
    },
    {
      title: 'Part 4',
      voices: { N: 'm', A: 'f' },
      script: [
        { who: 'N', text: 'Part 4. You will hear a lecture about how animals find their way over long distances.' },
        { who: 'A', text: "Today I'd like to look at one of the oldest puzzles in biology: how do animals find their way across thousands of kilometres, often to a place they have visited only once, or never at all?" },
        { who: 'A', text: "Let's begin with birds. In many species, young birds make their first migration alone, without any adults to follow. Birds raised in captivity become restless at the time of year when they would normally migrate, and they try to move in a particular direction. So young birds seem to be born with an inherited sense of direction, although not, it seems, with a map. That comes later, with experience." },
        { who: 'A', text: "How do they keep to that direction? Birds that fly by day use the sun. But the sun moves across the sky, so to use it as a compass, a bird must also know the time of day. Birds manage this with an internal clock. In experiments where this clock was shifted, by keeping birds under artificial light for several days, the birds then set off in the wrong direction, and by a predictable amount." },
        { who: 'A', text: "Many songbirds, though, migrate at night. In well-known experiments in a planetarium, young birds were shown an artificial night sky. They learned to take their direction from the point around which the stars appear to turn. Interestingly, this is learned rather than inherited." },
        { who: 'A', text: "A third tool is the Earth's magnetic field. Birds can sense it even when the skies are cloudy and neither the sun nor the stars can be seen. Exactly how they do this isn't fully understood. One idea is that it involves a chemical reaction in the eye." },
        { who: 'A', text: "Some seabirds, such as shearwaters, appear to rely partly on smell. When their sense of smell was temporarily blocked, they had much more difficulty finding their way home across the open sea, although their sight was unaffected." },
        { who: 'A', text: "Closer to home, many birds use familiar landmarks. It was once assumed that homing pigeons always fly in a straight line, but tracking them with GPS has shown that they often follow roads and rivers, even when this makes the journey longer." },
        { who: 'A', text: "Now let's turn to sea turtles. A female turtle will often return, many years after she hatched, to lay her eggs on the same beach where she herself came out of the egg. How does she find it? The best explanation, again, is magnetism. Every stretch of coastline has a slightly different magnetic signature, and young turtles appear to remember the one where they hatched." },
        { who: 'A', text: "Finally, a practical problem. Turtle hatchlings usually come out of the sand at night, and they move towards the brightest horizon, which is normally above the sea. But artificial lights from hotels and roads can lead them inland instead, where many of them die. For this reason, a number of coastal towns now ask buildings near the beach to turn off their lights during the nesting season." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
        title: 'Animal navigation',
        questions: [
          { n: 31, text: 'Young birds on their first migration rely on an inherited sense of ___', answer: ['direction'] },
          { n: 32, text: 'Birds that fly by day use the position of the ___', answer: ['sun'] },
          { n: 33, text: 'To allow for the time of day, birds use an internal ___', answer: ['clock'] },
          { n: 34, text: 'Experiments in a ___ showed that night migrants learn the pattern of the stars', answer: ['planetarium'] },
          { n: 35, text: 'Birds can sense the magnetic field even when skies are ___', answer: ['cloudy'] },
          { n: 36, text: 'Some seabirds find their way over the open sea partly by ___', answer: ['smell'] },
          { n: 37, text: 'GPS tracking shows that pigeons often follow roads and ___', answer: ['rivers'] },
          { n: 38, text: 'Female turtles lay their eggs on the ___ where they hatched', answer: ['beach'] },
          { n: 39, text: 'Each stretch of coast has its own magnetic ___', answer: ['signature'] },
          { n: 40, text: 'Artificial ___ can lead hatchlings away from the sea', answer: ['lights'] },
        ],
      }],
    },
  ],

  // ── Reading ────────────────────────────────────────────────────────────────
  reading: [
    {
      title: 'From sand to window: a short history of glass',
      paragraphs: [
        { text: "Glass is one of the oldest materials made by human beings, and yet it remains one of the most widely used. Long before people learned to make it, they used a natural form: obsidian, a dark volcanic glass that forms when lava cools very quickly. Because it breaks into pieces with extremely sharp edges, obsidian was prized for knives and arrowheads in many parts of the world, and it was traded over long distances." },
        { text: "Man-made glass appears to have originated in Mesopotamia, in what is now Iraq and Syria, more than four thousand years ago, and its basic recipe has changed surprisingly little since. The main ingredient is sand, which consists largely of silica. On its own, silica melts only at very high temperatures, far beyond what ancient furnaces could reach, so a second ingredient, soda, was added to lower the melting point. A third, lime, made the finished glass more stable: glass made only from sand and soda would slowly dissolve in water. The earliest glass objects were small. There were beads, which were treated as precious, and little containers for perfume and oil, made by building up glass around a core of clay that was removed once the glass had cooled." },
        { text: "Glass remained a luxury until the invention of glassblowing, which is generally dated to the first century BC and placed somewhere on the eastern coast of the Mediterranean. By blowing air through a hollow metal pipe into a lump of molten glass, a skilled worker could form a vessel in minutes rather than hours. The technique spread rapidly through the Roman Empire, and glass cups, bottles and jars became everyday objects in ordinary households. The Romans were also among the first to put glass in windows, although this early window glass was thick and cloudy, and let in light rather than offering a clear view." },
        { text: "After the decline of the western Roman Empire, the most famous centre of glassmaking in Europe became Venice. In 1291 the city's authorities ordered glassmakers to move their furnaces to the nearby island of Murano. The official reason was the danger of fire in a crowded city built largely of wood, but the move also made it easier to protect the industry's secrets. Glassmakers were highly respected, yet for long periods they were forbidden to leave the Venetian Republic. In the fifteenth century, Murano's workshops developed cristallo, a glass so clear and colourless that it was compared to rock crystal, and Venetian mirrors and drinking glasses were sold to wealthy buyers across the continent." },
        { text: "Other countries tried hard to compete. In England in the 1670s, George Ravenscroft developed a glass containing lead oxide, which was heavier than Venetian glass and sparkled brilliantly when it was cut. This 'lead crystal' became especially popular for decorative glassware. Meanwhile, glass was becoming central to science. Lenses made possible both the telescope and the microscope in the seventeenth century, opening up worlds that had previously been invisible." },
        { text: "Flat glass for windows, however, remained difficult to produce. For centuries the main methods involved either spinning molten glass into a large disc or blowing a long cylinder, cutting it open and flattening it, and in both cases the result was uneven. Later, sheets were ground and polished until they were flat, which produced fine plate glass but was slow and expensive. The breakthrough came in the 1950s, when the British company Pilkington introduced the float process, in which molten glass is poured onto a bath of molten tin. The glass spreads out and floats on the tin, forming a sheet with perfectly smooth surfaces that need no polishing. Today the great majority of the world's flat glass is made in this way." },
        { text: "Glass also has an environmental advantage: it can be recycled again and again without losing quality. Crushed waste glass, known as cullet, melts at a lower temperature than the raw materials, so adding it to a furnace saves energy. A material first made by heating sand and soda thousands of years ago therefore remains at the centre of modern life, in buildings, in phones, and in the optical cables that carry much of the world's internet traffic." },
      ],
      groups: [
        {
          kind: 'tfng',
          instructions: 'Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.',
          questions: [
            { n: 1, text: 'Obsidian was used to make cutting tools.', answer: ['TRUE'] },
            { n: 2, text: 'Obsidian forms when lava cools slowly.', answer: ['FALSE'] },
            { n: 3, text: 'Ancient glass made without lime would gradually dissolve in water.', answer: ['TRUE'] },
            { n: 4, text: 'Early glass beads were more valuable than gold.', answer: ['NOT GIVEN'] },
            { n: 5, text: 'Glassblowing was invented in the city of Rome.', answer: ['FALSE'] },
            { n: 6, text: 'Roman window glass was clear enough to see through.', answer: ['FALSE'] },
            { n: 7, text: 'Venetian glassmakers earned more than other craftsmen in the city.', answer: ['NOT GIVEN'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the notes below. Choose ONE WORD ONLY from the passage for each answer.',
          title: 'Later developments in glassmaking',
          questions: [
            { n: 8, text: 'Venetian glassmakers were moved to Murano officially because of the risk of ___', answer: ['fire'] },
            { n: 9, text: 'Cristallo was so clear that it was compared to rock ___', answer: ['crystal'] },
            { n: 10, text: "Ravenscroft's lead glass sparkled when it was ___", answer: ['cut'] },
            { n: 11, text: 'Lenses made possible the telescope and the ___', answer: ['microscope'] },
            { n: 12, text: 'In the float process, molten glass is poured onto molten ___', answer: ['tin'] },
            { n: 13, text: 'Crushed waste glass, called ___, saves energy in the furnace.', answer: ['cullet'] },
          ],
        },
      ],
    },
    {
      title: 'Letting nature take over',
      paragraphs: [
        { label: 'A', text: "In conservation, the usual question has been which species or habitats should be protected, and how. Rewilding asks a different question: what would happen if people stepped back and allowed natural processes to shape the land again? The term came into use in the 1990s, and it is now applied to projects ranging from vast national parks to a few hectares of former farmland. What these projects share is not a single method but an aim: to restore the processes, such as grazing, flooding, predation and natural decay, that keep ecosystems working, rather than to recreate the landscape of any particular moment in the past." },
        { label: 'B', text: "This marks a significant departure from traditional conservation, which has often relied on intensive management. On many nature reserves, staff decide exactly when meadows should be cut, which trees should be removed and how many sheep should graze a field, in order to keep a habitat in its present state. Such work has saved many rare species, but it is costly and never-ending, because the habitat begins to change as soon as the work stops. Rewilding projects deliberately reduce this kind of intervention and accept that the land will change in ways that cannot be fully predicted." },
        { label: 'C', text: "Some of the best-known examples involve the return of large predators. When grey wolves were reintroduced to Yellowstone National Park in the United States in 1995, after an absence of about seventy years, they began to hunt elk, which had become very numerous. Some scientists argued that the elk, now wary of wolves, stopped grazing so heavily along rivers, allowing willows and other trees to recover there. Others have questioned how far these changes can be credited to the wolves alone, pointing out that other factors, including drought, hunting by people and the numbers of other predators, also changed during the same period. The debate continues, but the case has encouraged many people to see predators as part of how an ecosystem functions, not merely as a threat to it." },
        { label: 'D', text: "Smaller animals can have equally dramatic effects. The beaver is often described as one of nature's ecosystem engineers. By felling trees and building dams, beavers slow the flow of streams and create ponds and wetlands that support insects, fish, birds and amphibians. Their dams can also hold back water during heavy rain and trap sediment, so that the water flowing downstream is cleaner. In Britain, where beavers were hunted to extinction several centuries ago, they have been returned to a number of sites, and their effect on local rivers is being carefully monitored." },
        { label: 'E', text: "In many places, the large wild animals that once shaped the landscape no longer exist anywhere. The aurochs, the wild ancestor of domestic cattle, died out in the seventeenth century, and truly wild horses have vanished from most of Europe. Rewilding projects therefore often use hardy breeds of cattle, ponies and pigs as substitutes. Left to roam with little interference, these animals graze some areas heavily and others lightly, trample paths and dig up the soil, creating a varied patchwork of grassland, scrub and woodland that suits a wide range of wildlife." },
        { label: 'F', text: "Not everyone welcomes these changes. To farmers, rewilding can look like a threat to their way of life. Some worry that good land will be taken out of food production; others fear that returning predators will attack their livestock. In regions where wolves or lynx have come back, some governments have introduced compensation schemes for farmers who lose animals, and have helped to pay for fences and guard dogs. Supporters of rewilding increasingly recognise that projects which ignore local people are likely to fail, however good their ecological intentions." },
        { label: 'G', text: "Rewilding does not have to happen on a grand scale. Leaving the edges of fields uncut, allowing a corner of a park to grow wild, or simply not mowing a lawn for a few weeks in spring can all bring back insects and the birds that feed on them. Such small steps will not restore a missing predator, but they share the same basic principle: that in many cases nature is able to repair itself, if people are willing to give it the space and the time." },
      ],
      groups: [
        {
          kind: 'match',
          instructions: 'The passage has seven paragraphs, A–G. Choose the correct heading for paragraphs B–G from the list of headings below. (Two headings are not used. Paragraph A is not included.)',
          options: [
            { key: 'i', text: "A predator's return and its disputed effects" },
            { key: 'ii', text: 'An animal that reshapes rivers' },
            { key: 'iii', text: 'Standing in for animals that have disappeared' },
            { key: 'iv', text: 'A break with conventional conservation' },
            { key: 'v', text: 'Concerns among those who work the land' },
            { key: 'vi', text: 'Rewilding need not be large' },
            { key: 'vii', text: 'The rising cost of reintroductions' },
            { key: 'viii', text: 'Why some species can never be brought back' },
          ],
          questions: [
            { n: 14, text: 'Paragraph B', answer: ['iv'] },
            { n: 15, text: 'Paragraph C', answer: ['i'] },
            { n: 16, text: 'Paragraph D', answer: ['ii'] },
            { n: 17, text: 'Paragraph E', answer: ['iii'] },
            { n: 18, text: 'Paragraph F', answer: ['v'] },
            { n: 19, text: 'Paragraph G', answer: ['vi'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            20: [
              { key: 'A', text: 'to protect a single rare species' },
              { key: 'B', text: 'to restore the processes that keep ecosystems working' },
              { key: 'C', text: 'to return land to the way it looked at a particular date' },
              { key: 'D', text: 'to create new national parks for visitors' },
            ],
            21: [
              { key: 'A', text: 'they are now fully understood' },
              { key: 'B', text: 'scientists disagree about how much the wolves caused' },
              { key: 'C', text: 'they were limited to the elk population' },
              { key: 'D', text: 'they were mainly the result of drought' },
            ],
            22: [
              { key: 'A', text: 'they are cheaper than wild animals' },
              { key: 'B', text: 'they imitate the effects of extinct grazing animals' },
              { key: 'C', text: 'local farmers asked for them to be used' },
              { key: 'D', text: 'they need no space to roam' },
            ],
          },
          questions: [
            { n: 20, text: 'According to paragraph A, the main aim of rewilding is', answer: ['B'] },
            { n: 21, text: 'What does the writer say about the changes seen in Yellowstone after 1995?', answer: ['B'] },
            { n: 22, text: 'Rewilding projects use hardy breeds of cattle and ponies because', answer: ['B'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          title: 'Beavers and farmers',
          questions: [
            { n: 23, text: 'Beavers are often described as ecosystem ___', answer: ['engineers'] },
            { n: 24, text: 'Their dams slow streams and create ponds and ___', answer: ['wetlands'] },
            { n: 25, text: 'Some farmers fear that returning predators will attack their ___', answer: ['livestock'] },
            { n: 26, text: 'Some governments have introduced ___ for farmers who lose animals.', answer: ['compensation schemes'] },
          ],
        },
      ],
    },
    {
      title: 'Does handwriting still matter?',
      paragraphs: [
        { text: "In many countries, the amount of time that schools devote to handwriting has fallen steadily. Children use keyboards and touchscreens from an early age, much adult writing is now done on devices, and some education systems have stopped requiring pupils to learn joined-up, or cursive, writing at all. To some observers the conclusion seems obvious: handwriting is going the way of the slide rule, a skill that was once essential and is now merely a curiosity. I think this conclusion is premature, but not for the reasons that are usually offered." },
        { text: "The case for handwriting is often made on grounds of nostalgia. We are told that a handwritten letter is more personal than an email, that beautiful script is an art form, and that a signature expresses individuality. There may be some truth in each of these claims, but none of them seems to me a sufficient reason for schools to spend many hours of teaching time on the subject. Beautiful handwriting has always been a minority accomplishment, and the handwritten letter was in decline long before the arrival of the smartphone. If handwriting matters, it must matter for more practical reasons." },
        { text: "The most persuasive of these concerns young children who are learning to read. A number of studies have suggested that children who practise forming letters by hand come to recognise them more readily than children who learn the same letters by typing them. This seems entirely plausible to me. To draw a letter, a child must attend to its shape, to the direction of each line and to the point where one stroke meets another, whereas pressing a key requires only that the child find the right button. If this is correct, then handwriting is not simply a way of recording words; in the early years it is part of how children come to know them." },
        { text: "A second argument concerns note-taking. Because people write more slowly than they type, students who take notes by hand in lectures cannot record everything and must decide what is important, while those using laptops tend to record what they hear word for word. Summarising, it is argued, requires thinking about the material, and so leads to better understanding. I find the reasoning attractive, but the evidence is less settled than enthusiasts suggest, as later attempts to reproduce some well-known findings have produced mixed results. More importantly, if summarising is what helps, then the benefit comes from the mental processing rather than from the pen. A student who types selectively might gain just as much as one who writes by hand." },
        { text: "Nor should we forget the costs of insisting on handwriting. For some pupils, including those with conditions that affect fine motor control, writing by hand is slow, tiring and sometimes painful, and their written work may underestimate what they actually know. This is especially unfair in examinations, where students are rewarded for the quantity and clarity of what they can produce in a fixed time. Many exam boards already allow such students to use a computer, and I see no good reason why, in the long run, the same option should not be available to everyone." },
        { text: "What follows from all this? In my view, schools should continue to teach handwriting carefully in the first years of education, until children can form letters quickly and legibly without having to think about it. Beyond that point, the demand that every pupil master a joined-up style is much harder to justify, and the hours devoted to it might be better spent on touch-typing, a skill that many adults never properly learn and that most of them will use every day of their working lives. Handwriting, in short, still matters, but mainly as a foundation rather than as an end in itself." },
      ],
      groups: [
        {
          kind: 'ynng',
          instructions: 'Do the following statements agree with the claims of the writer in the passage? Choose YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.',
          questions: [
            { n: 27, text: 'Nostalgic arguments provide a strong reason for schools to teach handwriting.', answer: ['NO'] },
            { n: 28, text: 'Forming letters by hand probably helps young children to recognise them.', answer: ['YES'] },
            { n: 29, text: 'Children today write by hand at home less often than their parents did.', answer: ['NOT GIVEN'] },
            { n: 30, text: 'The advantage of handwritten notes comes mainly from using a pen.', answer: ['NO'] },
            { n: 31, text: 'Touch-typing deserves a place in the school curriculum.', answer: ['YES'] },
            { n: 32, text: 'Teachers find joined-up writing harder to teach than separate letters.', answer: ['NOT GIVEN'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            33: [
              { key: 'A', text: 'it is shared by most teachers' },
              { key: 'B', text: 'it has been reached too quickly' },
              { key: 'C', text: 'it is supported by reliable data' },
              { key: 'D', text: 'it applies only to cursive writing' },
            ],
            34: [
              { key: 'A', text: 'smartphones have changed how people communicate' },
              { key: 'B', text: 'the decline began before modern technology' },
              { key: 'C', text: 'letters are less personal than emails' },
              { key: 'D', text: 'signatures are no longer needed' },
            ],
            35: [
              { key: 'A', text: 'it proves that laptops harm learning' },
              { key: 'B', text: 'its findings have not always been repeated' },
              { key: 'C', text: 'it is irrelevant to handwriting' },
              { key: 'D', text: 'it was carried out only with young children' },
            ],
            36: [
              { key: 'A', text: 'their exams take longer to mark' },
              { key: 'B', text: 'their work may not show what they know' },
              { key: 'C', text: 'they are not allowed to use computers' },
              { key: 'D', text: 'they write too much in the time allowed' },
            ],
          },
          questions: [
            { n: 33, text: 'What does the writer say about the view that handwriting is now merely a curiosity?', answer: ['B'] },
            { n: 34, text: 'The writer mentions the decline of the handwritten letter to show that', answer: ['B'] },
            { n: 35, text: 'What is the writer\'s opinion of the research on note-taking?', answer: ['B'] },
            { n: 36, text: 'According to the writer, handwritten examinations are unfair to some pupils because', answer: ['B'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'Complete each sentence with the correct ending, A–F, below.',
          options: [
            { key: 'A', text: 'takes up time that could be spent on another skill.' },
            { key: 'B', text: 'must pay attention to the shape of each letter.' },
            { key: 'C', text: 'has become less common in examinations.' },
            { key: 'D', text: 'tend to write down what they hear word for word.' },
            { key: 'E', text: 'may benefit as much as someone writing by hand.' },
            { key: 'F', text: 'is used by most adults at work.' },
          ],
          questions: [
            { n: 37, text: 'A child who draws a letter', answer: ['B'] },
            { n: 38, text: 'Students who use laptops in lectures', answer: ['D'] },
            { n: 39, text: 'Requiring every pupil to learn joined-up writing', answer: ['A'] },
            { n: 40, text: 'A student who types selectively', answer: ['E'] },
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
      prompt: 'The diagram below shows the process by which olive oil is produced.\n\nSummarise the information by selecting and reporting the main features.',
      image: OLIVE_OIL_DIAGRAM,
      facts: OLIVE_OIL_FACTS,
    },
    {
      task: 2,
      minWords: 250,
      minutes: 40,
      prompt: 'In many countries, fewer young people are choosing to train for skilled manual jobs, such as plumbing, building or electrical work.\n\nWhat are the causes of this trend, and what measures could be taken to encourage more young people to enter these professions?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.',
    },
  ],

  // ── Speaking ───────────────────────────────────────────────────────────────
  speaking: [
    {
      part: 1,
      title: 'Part 1 · Introduction and interview',
      answerSeconds: 40,
      questions: [
        'Let\'s talk about mornings. Are you a morning person?',
        'What do you usually do in the first hour after you wake up?',
        'Would you like to change anything about your mornings?',
        'Now let\'s talk about your neighbours. Do you know the people who live near you?',
        'How often do you talk to your neighbours?',
        'Do you think it is important to have good neighbours? Why?',
      ],
    },
    {
      part: 2,
      title: 'Part 2 · Long turn',
      answerSeconds: 120,
      prepSeconds: 60,
      card: {
        topic: 'Describe a time when you helped someone you did not know well.',
        points: ['who the person was', 'what the situation was', 'how you helped them'],
        close: 'and explain how you felt after helping this person.',
      },
    },
    {
      part: 3,
      title: 'Part 3 · Discussion',
      answerSeconds: 60,
      questions: [
        'Why do some people find it difficult to ask for help?',
        'Are people today more or less willing to help strangers than in the past?',
        'Should schools encourage students to do volunteer work?',
        'Do you think governments or individuals should be mainly responsible for helping people in need?',
      ],
    },
  ],
}
