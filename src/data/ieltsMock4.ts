// ─────────────────────────────────────────────────────────────────────────────
// Пробник IELTS Academic № 4 — формат и правила те же, что у MOCK_1 в
// ieltsMocks.ts (там же типы). Импорт типов только `import type`: значение из
// ieltsMocks дало бы круговую зависимость, когда список пробников соберёт этот.
//
// Writing Task 1 — карты «было / стало». У WritingTask одна картинка, а
// сравнению нужны две, поэтому обе карты townMapImage кладутся рядом в один
// SVG-лист (MAPS_IMAGE). Факты для проверки описания (MAPS_FACTS) списаны с
// того, что townMapImage рисует на самом деле, — правишь карту, правь и их.
// ─────────────────────────────────────────────────────────────────────────────

import type { IeltsMock } from './ieltsMocks'
import { townMapImage } from './seedImages'

// ─── Mock 4 · Writing Task 1 ─────────────────────────────────────────────────

/** Две карты townMapImage рядом на одном листе, каждая со своей подписью. */
function sideBySideMaps(): string {
  const w = 960, h = 400
  const mapW = 460, mapH = 340
  const before = townMapImage('before')
  const after = townMapImage('after')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect width="${w}" height="${h}" fill="#FFFFFF"/>`
    + `<text x="${15 + mapW / 2}" y="34" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="#1F2430">Before (1995)</text>`
    + `<text x="${w - 15 - mapW / 2}" y="34" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="700" fill="#1F2430">After (2025)</text>`
    + `<image x="15" y="50" width="${mapW}" height="${mapH}" href="${before}" xlink:href="${before}"/>`
    + `<image x="${w - 15 - mapW}" y="50" width="${mapW}" height="${mapH}" href="${after}" xlink:href="${after}"/>`
    + `<line x1="${w / 2}" y1="56" x2="${w / 2}" y2="${h - 16}" stroke="#D7DBE3" stroke-width="2"/>`
    + `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const MAPS_IMAGE = sideBySideMaps()

const MAPS_FACTS = [
  'Two maps of the town of Ashford: 1995 (before) and 2025 (after)',
  'Unchanged: Main Road runs east–west across the middle of the map; the river runs along the southern edge; the school north of Main Road stays in the same place',
  'North-west of Main Road: woodland in 1995 → replaced by a housing estate in 2025 (same area)',
  'North-east of Main Road: a small shop in 1995 → a larger shopping centre in 2025 (extended)',
  'South of Main Road: farmland in 1995 → a car park and station in 2025',
  'New in 2025: a railway line running east from the car park and station, between Main Road and the river',
  'Overall: the area changed from semi-rural (woodland, farmland) to urban (housing, retail, transport); the school, road and river are the only unchanged features',
]

// ─── Mock 4 ──────────────────────────────────────────────────────────────────

export const MOCK_4: IeltsMock = {
  id: 'mock-4',
  title: 'Пробник 4',
  about: 'Бюро находок автобусной компании, новый трамвай, отчёт о качестве воды, лекция об истории рекламы · зонт, четырёхдневка, возврат музейных ценностей',

  // ── Listening ──────────────────────────────────────────────────────────────
  listening: [
    {
      title: 'Part 1',
      voices: { N: 'm', A: 'm', B: 'f' },
      script: [
        { who: 'N', text: 'Part 1. You will hear a woman phoning the lost property office of a coach company.' },
        { who: 'A', text: 'Good afternoon, Westway Coaches lost property, Graham speaking.' },
        { who: 'B', text: "Hello. I left a bag on one of your coaches yesterday, and I'd like to report it." },
        { who: 'A', text: "I'm sorry to hear that. Let me take some details. Could I have your name, please?" },
        { who: 'B', text: "It's Helen Marchetti. That's M. A. R. C. H. E. T. T. I." },
        { who: 'A', text: 'Thank you. And what kind of bag was it?' },
        { who: 'B', text: "Well, I had a suitcase as well, but that was in the luggage hold and I've got it. The one I lost is a small rucksack. I kept it on the seat next to me." },
        { who: 'A', text: 'A small rucksack. What colour is it?' },
        { who: 'B', text: "It's dark green, with a grey stripe down the front." },
        { who: 'A', text: 'And can you tell me what was inside?' },
        { who: 'B', text: "Luckily my laptop wasn't in it, that was in the suitcase. But there's a camera, a paperback novel and, most importantly, a pair of reading glasses. I can't really manage without them." },
        { who: 'A', text: 'Right. Which journey were you on?' },
        { who: 'B', text: "I started in Bristol, but I had to change coaches. The one I left the bag on was the coach from Swindon to Oxford." },
        { who: 'A', text: 'From Swindon. Do you remember what time it left?' },
        { who: 'B', text: "It was supposed to leave at two fifteen, but it was late. We didn't actually leave until 2.40." },
        { who: 'A', text: "That helps, because there were two that afternoon. And do you know where you were sitting?" },
        { who: 'B', text: "I was given seat forty-three, but I swapped with a man so that I could sit by the window, so it was seat 34 in the end." },
        { who: 'A', text: "Okay. I'll check with the driver. What's the best number to contact you on?" },
        { who: 'B', text: "My mobile, please. It's 07700 900386." },
        { who: 'A', text: "Thank you. If we find it, we can post it to you, but there's a charge of eight pounds for that. Or you can collect it free from our office in Brook Street, which is right next to the coach station." },
        { who: 'B', text: "I'm in Oxford most days for work, so I'll collect it." },
        { who: 'A', text: "Fine. When you come, you'll need to bring some proof of identity. A bank card isn't enough, I'm afraid. It has to have your photo on it." },
        { who: 'B', text: "No problem. Thanks very much for your help." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
        title: 'Westway Coaches — Lost property report',
        questions: [
          { n: 1, text: 'Name: Helen ___', answer: ['marchetti'] },
          { n: 2, text: 'Item lost: a small ___', answer: ['rucksack'] },
          { n: 3, text: 'Colour: dark ___ with a grey stripe', answer: ['green'] },
          { n: 4, text: 'Contents: a camera, a novel and a pair of reading ___', answer: ['glasses'] },
          { n: 5, text: 'Journey: from ___ to Oxford', answer: ['swindon'] },
          { n: 6, text: 'Actual departure time: ___', answer: ['2.40', '2:40', '2.40 pm', '2:40 pm', '2.40pm', '2:40pm', '14.40', '14:40', 'twenty to three'] },
          { n: 7, text: 'Seat number: ___', answer: ['34', 'thirty-four', 'thirty four'] },
          { n: 8, text: 'Mobile number: ___', answer: ['07700 900386', '07700900386', '07700 900 386'] },
          { n: 9, text: 'Will collect from the office in ___ Street', answer: ['brook'] },
          { n: 10, text: 'Must bring: proof of ___ with a photo', answer: ['identity'] },
        ],
      }],
    },
    {
      title: 'Part 2',
      voices: { N: 'm', A: 'f' },
      script: [
        { who: 'N', text: 'Part 2. You will hear a council officer talking at a public meeting about a new tram line.' },
        { who: 'A', text: "Good evening, everyone. I'm Sarah Okafor from the city's transport department, and I'm here to tell you about Linkway, the new tram line that's due to open next spring." },
        { who: 'A', text: "Let me start with why we're building it. A lot of people assume the main aim is to reduce air pollution, and it will certainly help with that. And we hope visitors will use it too. But the real reason is that the university and the hospital at the east end of the city have never had a direct connection to the railway station. Linkway will finally give them one." },
        { who: 'A', text: "I know many of you are worried about the construction work. Market Square will stay open throughout, although it will be noisy at times. On Station Road we'll keep one lane open in each direction. The Victoria Bridge, however, will be closed completely for six weeks in the summer, so please plan for that." },
        { who: 'A', text: "Now, tickets. Fares won't be any cheaper than on the buses: a single journey will cost the same. Day tickets will work exactly as they do now. What is different is that there will be no ticket machines on the trams themselves, so you'll need to buy before you board, or simply tap a bank card or your phone at the stop." },
        { who: 'A', text: "How often will the trams run? At peak times there'll be one every six minutes, and during the rest of the day every ten minutes. On Sundays, the service will be every fifteen minutes." },
        { who: 'A', text: "Several residents have written to us about the number 7 bus. I want to reassure you that it is not being withdrawn, and it won't be rerouted. It will be shortened, so that it ends at the tram stop at Riverside Park instead of going all the way into the centre." },
        { who: 'A', text: "Let me say a little about the stops. Central Station is the only stop where there will be a staffed ticket office, so if you need help with passes or refunds, that's where to go." },
        { who: 'A', text: "At weekends, on Friday and Saturday nights, trams will run until two in the morning, but only as far as Market Square. That's the stop you'll need for the late service." },
        { who: 'A', text: "The University stop is a little unusual, because it's raised up on the bridge over the ring road. So passengers there will reach the platform using a lift. All the other stops are at street level." },
        { who: 'A', text: "At Riverside Park we're building a park-and-ride car park with four hundred spaces. There was talk at one stage of a shopping development next to it, but that plan has now been dropped." },
        { who: 'A', text: "And finally, the Hospital stop. The track will be finished in time, but the stop itself won't open until the autumn, because the new hospital entrance it connects to is still being built." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            11: [{ key: 'A', text: 'to reduce air pollution' }, { key: 'B', text: 'to link key sites to the railway station' }, { key: 'C', text: 'to attract more visitors' }],
            12: [{ key: 'A', text: 'Market Square' }, { key: 'B', text: 'Station Road' }, { key: 'C', text: 'the Victoria Bridge' }],
            13: [{ key: 'A', text: 'They will be cheaper than bus tickets.' }, { key: 'B', text: 'They cannot be bought on the tram.' }, { key: 'C', text: 'Day tickets will no longer be sold.' }],
            14: [{ key: 'A', text: 'six minutes' }, { key: 'B', text: 'ten minutes' }, { key: 'C', text: 'fifteen minutes' }],
            15: [{ key: 'A', text: 'It will be withdrawn.' }, { key: 'B', text: 'It will take a different route.' }, { key: 'C', text: 'It will be shortened.' }],
          },
          questions: [
            { n: 11, text: 'What is the main reason for building the tram line?', answer: ['B'] },
            { n: 12, text: 'Which place will be completely closed for part of the construction?', answer: ['C'] },
            { n: 13, text: 'What does the speaker say is new about tram tickets?', answer: ['B'] },
            { n: 14, text: 'On Sundays, trams will run every', answer: ['C'] },
            { n: 15, text: 'What will happen to the number 7 bus?', answer: ['C'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'What does the speaker say about each tram stop? Choose FIVE answers from the list, A–G, next to Questions 16–20.',
          options: [
            { key: 'A', text: 'will have a park-and-ride car park' },
            { key: 'B', text: 'will have secure cycle storage' },
            { key: 'C', text: 'will be next to a new shopping development' },
            { key: 'D', text: 'will open later than the other stops' },
            { key: 'E', text: 'will have a lift to the platform' },
            { key: 'F', text: 'will be served by late trams at weekends' },
            { key: 'G', text: 'will have a staffed ticket office' },
          ],
          questions: [
            { n: 16, text: 'Central Station', answer: ['G'] },
            { n: 17, text: 'Market Square', answer: ['F'] },
            { n: 18, text: 'University', answer: ['E'] },
            { n: 19, text: 'Riverside Park', answer: ['A'] },
            { n: 20, text: 'Hospital', answer: ['D'] },
          ],
        },
      ],
    },
    {
      title: 'Part 3',
      voices: { N: 'm', A: 'f', B: 'm', C: 'f' },
      script: [
        { who: 'N', text: 'Part 3. You will hear two environmental science students, Priya and Lewis, discussing their field trip report with their tutor, Dr Hayes.' },
        { who: 'C', text: "Come in, both of you. I've read the draft of your report on the river. Let's start with the sampling sites. Why did you choose those three?" },
        { who: 'A', text: "Well, to be honest, access was part of it. They're all close to footpaths." },
        { who: 'B', text: "But that wasn't the main reason. We wanted one site above the water treatment works and two below it, so that we could see whether the outflow makes a difference." },
        { who: 'C', text: "Good. Make that much clearer in the report, because at the moment it sounds as if you just picked convenient spots. Now, did everything go to plan on the day?" },
        { who: 'A', text: "The weather was fine, actually. It had rained heavily the week before, so we were worried, but the river level was normal. The real problem was the oxygen meter. Some of the readings were very strange." },
        { who: 'B', text: "We realised afterwards that we hadn't calibrated it before we started. So we've had to leave those readings out." },
        { who: 'C', text: "That's honest, and it's the right decision. Say so in the method. What about the nitrate results?" },
        { who: 'A', text: "That was the surprise. We expected nitrate levels to be highest downstream of the treatment works. But in fact the highest reading was at the upstream site." },
        { who: 'C', text: "Which suggests the source isn't the works at all. What's upstream?" },
        { who: 'B', text: "Mostly farmland. So we think it's probably fertiliser running off the fields." },
        { who: 'C', text: "That's a reasonable interpretation. And the invertebrate survey?" },
        { who: 'A', text: "We found mayfly larvae at all three sites, and they're quite sensitive to pollution. So we concluded that, overall, the river is in fairly good health." },
        { who: 'B', text: "Although I was worried that three kick samples at each site wasn't enough." },
        { who: 'C', text: "Three is standard for a study like this, so I wouldn't worry. If I had one recommendation for future work, it wouldn't be a bigger team or testing more chemicals. It would be to sample at different times of year. One visit in May tells you about May." },
        { who: 'A', text: "That makes sense. Could you go through the sections of the report with us?" },
        { who: 'C', text: "Of course. The introduction reads well, but you make several claims, for example that nitrates harm wildlife, and you don't give any sources. It needs references." },
        { who: 'B', text: "Okay. What about the description of the sites?" },
        { who: 'C', text: "The map is fine. But the reader can't picture the sites. Add a photograph of each one." },
        { who: 'A', text: "And the method? I was afraid it was too short." },
        { who: 'C', text: "Quite the opposite. You explain how to use a pH strip in far too much detail. It should be shortened." },
        { who: 'B', text: "We've put all our raw data tables in the results section. Is that all right?" },
        { who: 'C', text: "They make the section very hard to read. Keep the summary graph in the results and move the full tables to an appendix." },
        { who: 'A', text: "And the conclusion? We could add a graph there too." },
        { who: 'C', text: "There's no need. The conclusion is clear and it answers your research question. I'd leave it as it is." },
      ],
      groups: [
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B or C.',
          choices: {
            21: [{ key: 'A', text: 'they were easy to reach' }, { key: 'B', text: 'they were on either side of a treatment works' }, { key: 'C', text: 'they had been used in previous studies' }],
            22: [{ key: 'A', text: 'heavy rain on the day' }, { key: 'B', text: 'a piece of equipment that was not prepared' }, { key: 'C', text: 'samples that were lost' }],
            23: [{ key: 'A', text: 'were highest below the treatment works' }, { key: 'B', text: 'were highest at the upstream site' }, { key: 'C', text: 'were similar at all three sites' }],
            24: [{ key: 'A', text: 'the river is generally healthy' }, { key: 'B', text: 'pollution is increasing' }, { key: 'C', text: 'their sample was too small' }],
            25: [{ key: 'A', text: 'take samples in different seasons' }, { key: 'B', text: 'work in a larger team' }, { key: 'C', text: 'test for more chemicals' }],
          },
          questions: [
            { n: 21, text: 'The main reason the students chose the three sampling sites was that', answer: ['B'] },
            { n: 22, text: 'What problem did the students have during the fieldwork?', answer: ['B'] },
            { n: 23, text: 'The nitrate levels', answer: ['B'] },
            { n: 24, text: 'From the invertebrate survey, the students concluded that', answer: ['A'] },
            { n: 25, text: 'For future work, Dr Hayes recommends that students', answer: ['A'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'What does the tutor say about each section of the report? Choose FIVE answers from the list, A–G, next to Questions 26–30.',
          options: [
            { key: 'A', text: 'should be made shorter' },
            { key: 'B', text: 'needs references' },
            { key: 'C', text: 'needs photographs' },
            { key: 'D', text: 'should include a graph' },
            { key: 'E', text: 'does not need changing' },
            { key: 'F', text: 'should be moved to an appendix' },
            { key: 'G', text: 'should be written jointly' },
          ],
          questions: [
            { n: 26, text: 'the introduction', answer: ['B'] },
            { n: 27, text: 'the description of the sites', answer: ['C'] },
            { n: 28, text: 'the method', answer: ['A'] },
            { n: 29, text: 'the raw data tables', answer: ['F'] },
            { n: 30, text: 'the conclusion', answer: ['E'] },
          ],
        },
      ],
    },
    {
      title: 'Part 4',
      voices: { N: 'm', A: 'f' },
      script: [
        { who: 'N', text: 'Part 4. You will hear a lecture about the history of advertising.' },
        { who: 'A', text: "Today we're looking at the history of advertising, which is really a history of competition for people's attention." },
        { who: 'A', text: "Advertising is much older than newspapers. In Roman towns, notices were painted directly onto walls, announcing everything from public events to goods for sale. Archaeologists have found many examples preserved under the ash at Pompeii." },
        { who: 'A', text: "For most of history, however, the majority of people could not read. So shopkeepers relied on pictures rather than words. They hung signs outside their premises: a boot for a shoemaker, for example, or a bunch of grapes for a wine seller." },
        { who: 'A', text: "Spoken advertising mattered too. In many European towns, town criers walked through the market calling out news, official announcements and, sometimes, the goods that local traders had to offer." },
        { who: 'A', text: "The printing press changed things dramatically. Once text could be reproduced cheaply, traders could have leaflets printed and handed out in the street. And in the seventeenth century, advertisements began to appear in newspapers, which gave sellers a way to reach readers far beyond their own town." },
        { who: 'A', text: "In the nineteenth century, new methods of colour printing made large posters cheap to produce, and they became very popular. City walls were covered in them, and some cities eventually introduced rules about where they could be displayed." },
        { who: 'A', text: "The same period saw the rise of packaged goods sold under brand names. Before this, flour or soap was often sold loose, and the customer had no idea who had made it. A brand promised the same product every time, and over time this built customer loyalty, which became one of the main goals of advertising." },
        { who: 'A', text: "In the twentieth century, broadcasting opened a new channel. In some countries, early radio programmes were paid for by sponsors, whose names were attached to the shows themselves." },
        { who: 'A', text: "Television advertising was even more powerful, but it was also very expensive. Buying time on national television was so costly that, for decades, it was dominated by large companies." },
        { who: 'A', text: "Finally, the internet. Online advertising is cheaper, but its real novelty is that it can be targeted. Advertisers no longer simply choose a newspaper or a time of day. Instead, they use data about each user's behaviour, such as what they search for and which pages they visit, to decide which advertisement to show them." },
      ],
      groups: [{
        kind: 'gap',
        instructions: 'Complete the notes below. Write ONE WORD ONLY for each answer.',
        title: 'The history of advertising',
        questions: [
          { n: 31, text: 'In Roman towns, notices were painted on ___', answer: ['walls'] },
          { n: 32, text: 'Because most people could not read, shopkeepers hung pictorial ___ outside', answer: ['signs'] },
          { n: 33, text: 'Town criers called out news as they walked through the ___', answer: ['market'] },
          { n: 34, text: 'Printing allowed traders to hand out ___ in the street', answer: ['leaflets'] },
          { n: 35, text: 'In the 17th century, advertisements started to appear in ___', answer: ['newspapers'] },
          { n: 36, text: 'Colour printing made ___ cheap and popular', answer: ['posters'] },
          { n: 37, text: 'Brand names helped to build customer ___', answer: ['loyalty'] },
          { n: 38, text: 'Some early radio programmes were paid for by ___', answer: ['sponsors'] },
          { n: 39, text: 'Television advertising was dominated by ___ companies', answer: ['large'] },
          { n: 40, text: "Online adverts are chosen using data about each user's ___", answer: ['behaviour', 'behavior'] },
        ],
      }],
    },
  ],

  // ── Reading ────────────────────────────────────────────────────────────────
  reading: [
    {
      title: 'A brief history of the umbrella',
      paragraphs: [
        { text: "Few everyday objects have had as complicated a reputation as the umbrella. Today it is so ordinary that people leave one on a train without a second thought. Yet for most of its history it was a symbol of rank, and for a long period in Europe a man who carried one risked being laughed at in the street." },
        { text: "The earliest umbrellas were not designed for rain at all. In ancient Egypt, Assyria and China, shades held over the heads of rulers and nobles protected them from the sun, and the right to stand beneath one was a mark of status. The English word itself reflects this origin: it comes from the Latin umbra, meaning 'shade'. In parts of Asia, the link between the parasol and power lasted for many centuries, and parasols with several tiers were reserved for royalty." },
        { text: "It was in China that the umbrella was first adapted for wet weather. Craftsmen there coated paper or silk with oil or wax so that it would repel water, and they developed frames that could be opened and closed as required. Oiled-paper umbrellas, with ribs made of bamboo, became common, and the technique spread to Japan and Korea, where makers refined it further and where it is still practised by a small number of specialists." },
        { text: "In Europe, parasols were known in ancient Greece and Rome, where they were mainly used by women, but they largely disappeared from everyday life in the centuries that followed. They returned in the sixteenth and seventeenth centuries, first in Italy and then in France, as fashionable accessories. Protection from the rain was still a secondary concern; a lady with an umbrella was displaying her wealth as much as she was protecting her complexion from the sun." },
        { text: "In Britain, the idea that a man might carry an umbrella was long considered faintly ridiculous. A gentleman caught in a shower was expected to take a carriage, and an umbrella suggested that its owner could not afford one. The person usually credited with changing this attitude is Jonas Hanway, a London merchant and travel writer who began carrying an umbrella in the mid-eighteenth century, having seen them used abroad. According to the accounts that have come down to us, he was jeered at by the drivers of hired coaches, who feared that if umbrellas caught on, they would lose customers on wet days. Hanway persisted, and by the time of his death in 1786 umbrellas were becoming a familiar sight on London's streets. For a time, they were even nicknamed 'Hanways'." },
        { text: "These early European umbrellas were far from convenient. Their frames were usually made from whalebone or cane, and the covering was often oiled silk or waxed cotton. They were heavy, awkward to open, and tended to lose their shape once they had been soaked. The decisive improvement came in 1852, when Samuel Fox, a manufacturer from Yorkshire, introduced a frame with ribs made of steel. His design was lighter and stronger than anything before it, and because steel could be produced cheaply in large quantities, umbrellas became affordable to a far wider public. The basic structure he popularised, with a central shaft, a set of ribs and stretchers, and a sliding runner, is still recognisable in most umbrellas sold today." },
        { text: "The twentieth century brought further changes. Folding umbrellas small enough to fit into a handbag or coat pocket appeared, and synthetic fabrics such as nylon and polyester gradually replaced silk and cotton, making covers cheaper and much quicker to dry. Mass production, however, has had a less welcome consequence. Umbrellas are now so inexpensive that many people treat them as disposable, and broken ones are rarely repaired. A few specialist workshops still make umbrellas by hand, and some designers are experimenting with frames that are easier to take apart, so that the metal and fabric can be recycled separately." },
      ],
      groups: [
        {
          kind: 'tfng',
          instructions: 'Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.',
          questions: [
            { n: 1, text: 'The first umbrellas were intended to give protection from the sun.', answer: ['TRUE'] },
            { n: 2, text: "The word 'umbrella' comes from a Greek word meaning 'shade'.", answer: ['FALSE'] },
            { n: 3, text: 'Oiled-paper umbrellas were cheaper to make than silk ones.', answer: ['NOT GIVEN'] },
            { n: 4, text: 'In ancient Greece and Rome, parasols were mostly carried by men.', answer: ['FALSE'] },
            { n: 5, text: 'Hanway was the first person in Britain to own an umbrella.', answer: ['NOT GIVEN'] },
            { n: 6, text: 'Coach drivers objected to umbrellas because they feared losing income.', answer: ['TRUE'] },
            { n: 7, text: "Fox's steel frame made umbrellas affordable to more people.", answer: ['TRUE'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the notes below. Choose ONE WORD ONLY from the passage for each answer.',
          title: 'Materials and meanings',
          questions: [
            { n: 8, text: 'In parts of Asia, parasols with several ___ could only be used by royalty.', answer: ['tiers'] },
            { n: 9, text: 'Chinese craftsmen made paper or silk waterproof with oil or ___', answer: ['wax'] },
            { n: 10, text: 'The ribs of oiled-paper umbrellas were made of ___', answer: ['bamboo'] },
            { n: 11, text: 'In 16th- and 17th-century Europe, a woman with an umbrella was showing her ___', answer: ['wealth'] },
            { n: 12, text: 'Early European frames were made of whalebone or ___', answer: ['cane'] },
            { n: 13, text: 'Synthetic covers are cheaper and quicker to ___', answer: ['dry'] },
          ],
        },
      ],
    },
    {
      title: 'The four-day working week',
      paragraphs: [
        { label: 'A', text: "In 1930 the economist John Maynard Keynes wrote an essay in which he imagined the lives of his grandchildren's generation. Thanks to steady growth in productivity, he suggested, people a century later might need to work only around fifteen hours a week. Productivity has indeed risen enormously since then, but working hours in most developed economies have fallen far more slowly than he expected, and for many people the five-day week remains as fixed as it was in their grandparents' time. In recent years, however, the idea of a shorter week has returned to public debate, usually in the form of a four-day week." },
        { label: 'B', text: "The phrase can describe two quite different arrangements. In the first, sometimes called a compressed week, employees work the same total number of hours as before but fit them into four longer days. In the second, which is what most campaigners have in mind, the total number of hours is reduced, typically by around a fifth, while pay stays the same. The bargain is that employees will produce as much in four days as they previously did in five. The two models have very different implications: the first changes the shape of the week, while the second changes the amount of work that employers pay for." },
        { label: 'C', text: "Sceptics ask how anyone can do five days' work in four. Supporters reply that much of the working week is not spent working. Long meetings, constant interruptions and tasks that expand to fill the time available all reduce what people actually achieve. Many organisations that have tried a shorter week began by examining how time was used, and asked staff to cut unnecessary meetings, reduce internal email and protect periods of uninterrupted concentration. In such cases, the shorter week acts less as a reward than as a deadline that forces an organisation to stop wasting time." },
        { label: 'D', text: "The benefits most often reported concern employees themselves. Staff in trial schemes have commonly described lower levels of stress and exhaustion, more time for family and exercise, and a better balance between work and the rest of life. Employers, for their part, have an eye on the labour market. A four-day week is an attractive offer to job applicants that costs nothing in salary, and firms hope that it will improve both recruitment and retention, since replacing an experienced employee is expensive and disruptive." },
        { label: 'E', text: "The model is far easier to apply in some jobs than in others. In an office where output is measured in projects completed, it may be possible to reorganise tasks so that the same work is done in less time. But hospitals, schools, care homes, shops and public transport all require continuous cover: a patient needs a nurse on the fifth day just as much as on the first four. In these sectors, a shorter week for each employee usually means employing more people, and the cost of doing so falls on whoever pays the wage bill, often the public." },
        { label: 'F', text: "The evidence so far should also be read carefully. Most trials have been short, often lasting no more than six months, and the organisations taking part have usually volunteered, which means they are likely to be those most confident that the change would work. Many of the results depend on employees' own reports of how they feel, rather than on independent measures of output. And any change to routine can produce a temporary burst of enthusiasm, which may fade once the arrangement is no longer new. None of this shows that the findings are wrong, but it does mean that they cannot simply be applied to the economy as a whole." },
        { label: 'G', text: "If the four-day week did become widespread, its effects would reach well beyond individual workplaces. Fewer commuting days could ease congestion on roads and trains, and might reduce energy use in offices. There are also risks. Squeezing the same work into fewer hours could make jobs more intense rather than less, and a society in which office workers enjoy long weekends while others cannot could become more divided. How these gains and losses balance out is likely to depend less on the idea itself than on the way it is introduced." },
      ],
      groups: [
        {
          kind: 'match',
          instructions: 'The passage has seven paragraphs, A–G. Choose the correct heading for each paragraph from the list of headings below. (Two headings are not used.)',
          options: [
            { key: 'i', text: 'Reasons to treat early results with caution' },
            { key: 'ii', text: 'A forecast that has not come true' },
            { key: 'iii', text: 'Why fewer hours need not mean less output' },
            { key: 'iv', text: 'New laws that require shorter hours' },
            { key: 'v', text: 'Advantages for workers and for hiring' },
            { key: 'vi', text: 'Two versions of the same idea' },
            { key: 'vii', text: 'Consequences for society as a whole' },
            { key: 'viii', text: 'How technology has made long hours unnecessary' },
            { key: 'ix', text: 'Work that cannot easily be reorganised' },
          ],
          questions: [
            { n: 14, text: 'Paragraph A', answer: ['ii'] },
            { n: 15, text: 'Paragraph B', answer: ['vi'] },
            { n: 16, text: 'Paragraph C', answer: ['iii'] },
            { n: 17, text: 'Paragraph D', answer: ['v'] },
            { n: 18, text: 'Paragraph E', answer: ['ix'] },
            { n: 19, text: 'Paragraph F', answer: ['i'] },
            { n: 20, text: 'Paragraph G', answer: ['vii'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            21: [
              { key: 'A', text: 'productivity would stop growing' },
              { key: 'B', text: 'rising productivity would greatly shorten working hours' },
              { key: 'C', text: 'the five-day week would become more common' },
              { key: 'D', text: 'people would choose to work longer hours' },
            ],
            22: [
              { key: 'A', text: 'work fewer hours for the same pay' },
              { key: 'B', text: 'work the same hours over fewer days' },
              { key: 'C', text: 'receive a fifth less pay' },
              { key: 'D', text: 'choose which day they take off' },
            ],
            23: [
              { key: 'A', text: 'they lasted too long' },
              { key: 'B', text: 'they measured output independently' },
              { key: 'C', text: 'the organisations involved chose to take part' },
              { key: 'D', text: 'they were carried out only in public services' },
            ],
          },
          questions: [
            { n: 21, text: 'According to paragraph A, Keynes predicted that', answer: ['B'] },
            { n: 22, text: 'Under a compressed week, employees', answer: ['B'] },
            { n: 23, text: 'One weakness of the trials mentioned by the writer is that', answer: ['C'] },
          ],
        },
        {
          kind: 'gap',
          instructions: 'Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
          questions: [
            { n: 24, text: 'Organisations moving to a shorter week often asked staff to cut unnecessary ___', answer: ['meetings'] },
            { n: 25, text: 'Employers hope a four-day week will improve recruitment and ___', answer: ['retention'] },
            { n: 26, text: 'Hospitals and schools are difficult cases because they need ___', answer: ['continuous cover'] },
          ],
        },
      ],
    },
    {
      title: 'Should museums give back what they hold?',
      paragraphs: [
        { text: "Walk through the galleries of almost any large museum in Europe or North America and you will pass objects that were made thousands of kilometres away. Some were bought openly, some were given as gifts, and some were taken by soldiers, colonial officials or collectors at times when the people who owned them had little power to refuse. In recent decades, governments and communities in the countries of origin have asked, with growing insistence, for some of these objects to be returned. I believe that many of these requests are justified, but that the debate is often conducted in terms that are too simple on both sides." },
        { text: "The most common defence offered by large museums is that they are 'universal' institutions. By placing objects from many cultures side by side, the argument goes, they allow visitors to see humanity as a whole, and they hold their collections on behalf of everyone, not one nation. There is something attractive in this idea, but I do not find it persuasive. A museum that is visited mainly by people from wealthy countries, and that decides alone what to display and what to keep in storage, is not holding objects for everyone in any meaningful sense. The claim to universality is usually made by the institutions that benefit from it." },
        { text: "A second argument concerns safety. Museums in the countries that hold these collections have sometimes argued that objects would be at risk if they were sent back, because the receiving countries lacked suitable buildings or trained staff. Whatever weight this argument once had, it carries far less today. Many countries of origin now have modern museums and experienced conservators, and in any case the history of the great collections is not free of damage, theft and neglect. Safety is a question to be settled case by case, not a reason to refuse every request." },
        { text: "Where, then, should the line be drawn? In my view the strongest cases are those in which objects were removed by force, for example during military campaigns, when there could be no question of consent. Here, return should be the normal response, and the burden should fall on the museum to explain why it should not happen. Objects that were sold or exchanged on fair terms are a different matter, and it would be a mistake to treat every foreign object in a museum as if it had been stolen. The difficulty lies in the large middle ground, where records are incomplete and the circumstances of a sale are unclear. Careful research into the history of each object, known as provenance research, is slow and expensive, but there is no honest alternative to it." },
        { text: "Some have proposed that high-quality replicas or detailed digital models could resolve the problem: the original could stay where it is while the community of origin received a perfect copy, or the other way round. Such technology is valuable for study and for education, but I doubt that it can settle a dispute about ownership. What communities are asking for is not usually the appearance of an object but the object itself, together with the recognition that it was wrongly taken. A copy cannot offer that." },
        { text: "Nor should return be seen as the end of a relationship. Some of the most promising arrangements have involved museums transferring ownership while continuing to work with the country of origin, through long-term loans, joint exhibitions and shared research. A museum that returns an object does not lose its purpose; it may gain partners and a more honest account of its own history. The question museums should be asking is not 'What can we keep?' but 'How did we come to have this, and who has the better claim to it now?'" },
      ],
      groups: [
        {
          kind: 'ynng',
          instructions: 'Do the following statements agree with the claims of the writer in the passage? Choose YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.',
          questions: [
            { n: 27, text: "Museums' claim to hold objects on behalf of all humanity is convincing.", answer: ['NO'] },
            { n: 28, text: 'Concerns about the safety of returned objects are less justified now than in the past.', answer: ['YES'] },
            { n: 29, text: 'The number of requests for return will rise sharply in the coming years.', answer: ['NOT GIVEN'] },
            { n: 30, text: 'Objects taken during military campaigns should normally be returned.', answer: ['YES'] },
            { n: 31, text: 'Every foreign object in a museum should be regarded as stolen.', answer: ['NO'] },
            { n: 32, text: 'Most museum visitors want to know how objects were acquired.', answer: ['NOT GIVEN'] },
          ],
        },
        {
          kind: 'mcq',
          instructions: 'Choose the correct letter, A, B, C or D.',
          choices: {
            33: [
              { key: 'A', text: 'is mainly visited by people from wealthy countries' },
              { key: 'B', text: 'charges too much for entry' },
              { key: 'C', text: 'displays too few objects from other cultures' },
              { key: 'D', text: 'has no space to store its collections' },
            ],
            34: [
              { key: 'A', text: 'it is cheap and quick' },
              { key: 'B', text: 'it is only needed for stolen objects' },
              { key: 'C', text: 'it is necessary where the history of an object is unclear' },
              { key: 'D', text: 'it should be carried out by the country of origin' },
            ],
            35: [
              { key: 'A', text: 'they are too expensive to produce' },
              { key: 'B', text: 'they cannot give recognition that an object was wrongly taken' },
              { key: 'C', text: 'they are of no use for education' },
              { key: 'D', text: 'they are not accurate enough' },
            ],
            36: [
              { key: 'A', text: 'museums lose their purpose when objects are returned' },
              { key: 'B', text: 'loans are better than returning ownership' },
              { key: 'C', text: 'returning objects can lead to new forms of cooperation' },
              { key: 'D', text: 'countries of origin rarely want to work with museums' },
            ],
          },
          questions: [
            { n: 33, text: "The writer rejects the 'universal museum' argument partly because such a museum", answer: ['A'] },
            { n: 34, text: 'What does the writer say about provenance research?', answer: ['C'] },
            { n: 35, text: 'The writer doubts that replicas can solve disputes because', answer: ['B'] },
            { n: 36, text: 'In the final paragraph, the writer suggests that', answer: ['C'] },
          ],
        },
        {
          kind: 'match',
          instructions: 'Complete the summary using the list of words, A–H, below.',
          title: 'The writer\'s position',
          options: [
            { key: 'A', text: 'consent' },
            { key: 'B', text: 'records' },
            { key: 'C', text: 'replicas' },
            { key: 'D', text: 'conservators' },
            { key: 'E', text: 'partners' },
            { key: 'F', text: 'visitors' },
            { key: 'G', text: 'storage' },
            { key: 'H', text: 'profit' },
          ],
          questions: [
            { n: 37, text: 'The safety argument is weaker today because many countries of origin have modern museums and trained ___.', answer: ['D'] },
            { n: 38, text: 'Objects removed by force are the clearest cases, since there was no ___.', answer: ['A'] },
            { n: 39, text: 'The hardest cases are those where ___ are incomplete.', answer: ['B'] },
            { n: 40, text: 'A museum that returns objects may gain ___ rather than lose its purpose.', answer: ['E'] },
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
      prompt: 'The maps below show the town of Ashford in 1995 and in 2025.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.',
      image: MAPS_IMAGE,
      facts: MAPS_FACTS,
    },
    {
      task: 2,
      minWords: 250,
      minutes: 40,
      prompt: 'In many countries, people are living longer and remaining healthy into later life. Some people think that older workers should be encouraged to stay in employment for as long as possible. Others believe they should retire earlier to make way for younger people.\n\nDiscuss both these views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.',
    },
  ],

  // ── Speaking ───────────────────────────────────────────────────────────────
  speaking: [
    {
      part: 1,
      title: 'Part 1 · Introduction and interview',
      answerSeconds: 40,
      questions: [
        'Let\'s talk about the weather. What kind of weather do you like best?',
        'Does the weather ever change your plans?',
        'Is the weather where you live different now from when you were a child?',
        'Now let\'s talk about cooking. Do you cook for yourself very often?',
        'Who taught you to cook?',
        'Is there a dish you would like to learn to make?',
      ],
    },
    {
      part: 2,
      title: 'Part 2 · Long turn',
      answerSeconds: 120,
      prepSeconds: 60,
      card: {
        topic: 'Describe a public place in your town or city that you think could be improved.',
        points: ['where it is', 'what it is used for', 'what is wrong with it at the moment'],
        close: 'and explain how you would improve it.',
      },
    },
    {
      part: 3,
      title: 'Part 3 · Discussion',
      answerSeconds: 60,
      questions: [
        'Why are public spaces such as parks and squares important for a city?',
        'Who should pay for the upkeep of public places — the government, businesses or local residents?',
        'How have shopping centres changed the way people use town centres?',
        'Do you think cities in the future will have more or fewer public spaces than today? Why?',
      ],
    },
  ],
}
