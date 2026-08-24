// ─────────────────────────────────────────────────────────────────────────────
// Чтение курса «Английский: от B2 к C1»
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Юнит — это последовательность, грамматика и упражнения;
// корпус текстов живёт своей жизнью и правится пачкой. Держать их вместе значит
// трогать структуру курса каждый раз, когда меняется одно предложение в
// отрывке (та же причина, что у koreanTopik2Reading.ts).
//
// ЗАЧЕМ ЧТЕНИЕ ИМЕННО ЗДЕСЬ. Разрыв между B2 и C1 — это в первую очередь разрыв
// в ПЛОТНОСТИ текста: на B2 человек читает предложения, на C1 — абзацы, в
// которых мысль держится причастными оборотами, инверсией и осторожными
// формулировками. Отдельные упражнения этому не учат: конструкцию надо
// встретить в связном тексте, где её никто не подчёркивал.
//
// ТЕКСТ ПОСТРОЕН НА ГРАММАТИКЕ СВОЕГО ЮНИТА. Отрывок к юниту про причастные
// обороты сам написан причастными оборотами, к юниту про хеджирование — набит
// оговорками. Так текст работает дважды: как чтение и как возврат к правилу в
// тот же вечер.
//
// ВОПРОСЫ — НА СМЫСЛ, А НЕ НА ПОИСК СЛОВА. Проверяется вывод, отношение автора
// и функция связки, потому что именно это отличает чтение C1 от сканирования
// глазами по совпадающим словам.
//
// ЮРИДИЧЕСКОЕ. Все отрывки написаны с нуля. Это авторские тексты в стиле
// научпопа и публицистики, а не выдержки из изданий.
// ─────────────────────────────────────────────────────────────────────────────

import { one, fill, many, type SeedTask } from './languageCourse'
import { reading } from './languageCourse'

/** Отрывки и вопросы к ним по shortId юнита. */
export const ENAC_READING: Record<string, SeedTask[]> = {
  // ── Narrative tenses: рассказ о провале, держащийся на порядке событий ──
  'enac-01': reading(
    'THE NIGHT THE MAPS WENT DARK\n\n'
    + 'By the time the first complaint arrived, the engineers had already been staring at their screens for two hours. '
    + 'Something had gone wrong with the routing service shortly after midnight, and nobody could say what.\n\n'
    + 'The evening had begun quietly. The team had shipped a small update at six, watched the dashboards for an hour and gone home. '
    + 'It was a routine change, the kind they had made perhaps two hundred times before. What none of them noticed was that the update had also '
    + 'altered how the service handled a rare category of address: the ones without a street number.\n\n'
    + 'At 11:40 a delivery driver in Manchester typed in such an address. The system, which had been working perfectly all evening, '
    + 'returned a route that led into a field. He tried again, got the same field, and reported it. By one in the morning, four hundred drivers '
    + 'were being sent to fields, car parks and, in one memorable case, the middle of a reservoir.\n\n'
    + 'While the engineers were reading the logs, the support team was answering calls. The two groups were not talking to each other, '
    + 'and this, more than the bug itself, is what turned a small failure into a long night. The engineers assumed the drivers had entered '
    + 'the addresses incorrectly. The support staff assumed the engineers already knew.\n\n'
    + 'The fix, when it finally came at 4:15, took eleven minutes to write. The investigation that followed took three weeks. '
    + 'Its conclusion was not about routing at all: the company had built an excellent system for detecting broken servers and no system '
    + 'whatsoever for detecting broken assumptions.',
    [
      one('What had happened before the first complaint arrived?', [
        'The engineers had gone home for the night.',
        'The engineers had already been working on the problem for two hours.',
        'The routing service had been switched off deliberately.',
        'The support team had solved the problem.',
      ], 1),
      one('Why does the writer use "had made perhaps two hundred times before"?', [
        'To show the change looked completely ordinary before the incident.',
        'To show the team was careless.',
        'To explain how large the company was.',
        'To show the update had been tested two hundred times.',
      ], 0),
      one('According to the writer, what made the failure last so long?', [
        'The bug was extremely difficult to fix.',
        'Nobody was working that night.',
        'The two teams each assumed something about the other.',
        'The drivers kept entering wrong addresses.',
      ], 2),
      one('Which sentence best matches the final paragraph?', [
        'The company decided to rebuild its routing service.',
        'The real weakness was in how the company checked its own assumptions.',
        'Writing the fix was the hardest part of the incident.',
        'The investigation blamed the delivery drivers.',
      ], 1),
      fill('Complete from the text: "The system, which ___ ___ working perfectly all evening, returned a route that led into a field." (two words)',
        'had been', ['had been ']),
    ],
    { title: 'The night the maps went dark (репортаж об инциденте)' },
  ),

  // ── Reported speech: заметка о пресс-конференции ──
  'enac-05': reading(
    'WHAT THE MINISTER ACTUALLY SAID\n\n'
    + 'At a press conference on Tuesday the transport minister announced that the new rail line would open in 2029, two years later than promised. '
    + 'She explained that the delay was the result of ground conditions nobody had expected, and added that the revised figure was, in her words, '
    + '"a date we can defend".\n\n'
    + 'Asked whether the budget would rise, she said the department was reviewing its estimates and would publish them in the autumn. '
    + 'A reporter asked how much had already been spent. The minister replied that she did not have the figure with her but promised to send it '
    + 'that afternoon. It arrived four days later.\n\n'
    + 'This is where reporting becomes interesting. The written statement said that costs "had increased by approximately eleven per cent". '
    + 'The minister had told the room that the project remained "broadly within budget". Both sentences can be true at once, which is precisely why '
    + 'careful readers pay attention to who is speaking and what verb is used to introduce them.\n\n'
    + 'Notice the difference between saying that a minister said something and saying that she admitted, insisted, claimed or conceded it. '
    + 'The first reports; the others judge. When a newspaper writes that the minister claimed the delay was unavoidable, it is telling you, '
    + 'without ever saying so directly, that it does not believe her. When it writes that she acknowledged the delay, it is telling you the opposite.\n\n'
    + 'None of this is dishonest. Every act of reporting selects, compresses and frames. But it means that reading the news in a foreign language '
    + 'requires more than vocabulary: you have to hear the verb.',
    [
      one('What did the minister say about the opening date?', [
        'It had been brought forward by two years.',
        'It would be 2029, later than originally promised.',
        'It could not be decided yet.',
        'It depended on the budget review.',
      ], 1),
      one('What happened with the spending figure the reporter asked for?', [
        'The minister gave it immediately.',
        'The minister refused to provide it.',
        'It was promised for the same afternoon but arrived four days later.',
        'It was published in the autumn.',
      ], 2),
      one('Why does the writer say both statements about the budget can be true?', [
        'Because eleven per cent may still count as broadly within budget.',
        'Because the minister was speaking about a different project.',
        'Because the written statement was incorrect.',
        'Because nobody had checked the figures.',
      ], 0),
      many('According to the text, which reporting verbs signal that the writer doubts the speaker? Choose all that apply.', [
        'claimed',
        'acknowledged',
        'said',
        'insisted',
      ], [0, 3]),
      fill('Complete the reported question: A reporter asked how much ___ already ___ spent. (two words)',
        'had been', ['had been ']),
    ],
    { title: 'What the minister actually said (публицистика)' },
  ),

  // ── Relative clauses: научпоп про сон ──
  'enac-09': reading(
    'THE HOUR THAT DOES NOT COUNT\n\n'
    + 'Every spring, most of Europe moves its clocks forward by an hour, an adjustment which was originally introduced to save fuel '
    + 'and which now survives mainly out of habit. The people who feel it most are not, as you might expect, night owls. '
    + 'They are shift workers, whose schedules already sit at an angle to daylight and for whom an extra hour of misalignment is not an inconvenience '
    + 'but a health risk.\n\n'
    + 'Researchers at several universities, whose work has been running since the late 1990s, have collected data on what happens in the week after '
    + 'the change. Hospital admissions for heart attacks rise slightly. Road accidents increase on the Monday. Productivity, measured in ways that '
    + 'nobody entirely agrees on, falls. None of these effects is dramatic in itself, which is one reason the practice has survived so long. '
    + 'A policy that quietly costs a little is far harder to abolish than one that visibly costs a lot.\n\n'
    + 'The argument that is usually made in defence of the change concerns evening light. Long summer evenings, the reasoning goes, are worth '
    + 'a bad Monday in March. Critics reply that the same evenings could be obtained by simply choosing a different standard time and leaving it alone, '
    + 'a solution which several countries have now begun to consider seriously.\n\n'
    + 'In 2019 the European Parliament voted to end the practice, a decision which was then postponed, then postponed again, and which remains '
    + 'unimplemented. The reason is almost comic: the countries that share a border cannot agree on which time to keep. Nobody wants to be the state '
    + 'whose neighbours are all an hour away.',
    [
      one('Who, according to the text, is most affected by the clock change?', [
        'People who prefer to stay up late.',
        'Shift workers whose schedules are already misaligned with daylight.',
        'Drivers who travel on Mondays.',
        'Researchers who study sleep.',
      ], 1),
      one('Why has the practice survived, according to the writer?', [
        'Because the evidence against it is disputed.',
        'Because each individual effect is small rather than dramatic.',
        'Because it still saves a significant amount of fuel.',
        'Because most people enjoy the extra hour.',
      ], 1),
      one('What do critics propose instead?', [
        'Moving the clocks by half an hour.',
        'Keeping summer time all year in some regions only.',
        'Choosing one standard time and never changing it.',
        'Letting each city decide for itself.',
      ], 2),
      one('Why has the European decision not been implemented?', [
        'The Parliament reversed its vote.',
        'Neighbouring countries cannot agree on which time to adopt.',
        'The research was found to be unreliable.',
        'The cost of the change was too high.',
      ], 1),
      fill('In "a decision which was then postponed", the clause is non-defining. Which word could NOT replace "which" here?', 'that'),
    ],
    { title: 'The hour that does not count (научпоп)' },
  ),

  // ── Linking devices: эссе с явной разметкой мысли ──
  'enac-12': reading(
    'AGAINST THE OPEN OFFICE\n\n'
    + 'The open-plan office was sold to a generation of managers as a machine for collaboration. Remove the walls, the argument ran, '
    + 'and ideas will travel. Two decades of evidence suggest that something rather different happened.\n\n'
    + 'A widely cited study tracked employees in two companies before and after a move to open plan. Face-to-face interaction did not rise; '
    + 'it fell by roughly seventy per cent. Email and instant messaging, meanwhile, increased sharply. In other words, people did not stop '
    + 'communicating. They simply stopped communicating in the way the design was supposed to encourage.\n\n'
    + 'Admittedly, the picture is not uniformly negative. Open layouts are cheaper per employee, easier to reconfigure and, for certain kinds '
    + 'of work — short, coordinated, highly interdependent tasks — genuinely effective. Despite this, the default assumption that openness '
    + 'produces creativity has proved remarkably resistant to evidence.\n\n'
    + 'The explanation may lie in what psychologists call the cost of interruption. Deep work requires uninterrupted stretches; '
    + 'recovering concentration after a disturbance takes far longer than the disturbance itself. Consequently, an environment that makes '
    + 'interruption effortless imposes a tax that never appears on any budget line.\n\n'
    + 'None of this means that walls are the answer. Private offices bring their own problems: isolation, status games and, in many buildings, '
    + 'considerably worse light. What the evidence supports is not a layout but a principle — that people need to be able to choose, '
    + 'several times a day, between visibility and quiet. Whether that choice is delivered by rooms, by rules or by working from home '
    + 'matters much less than whether it exists at all.',
    [
      one('What did the study find about face-to-face interaction?', [
        'It rose sharply after the move.',
        'It fell by around seventy per cent.',
        'It stayed roughly the same.',
        'It was not measured.',
      ], 1),
      one('What is the function of "Admittedly" in the third paragraph?', [
        'It introduces the writer\'s main argument.',
        'It concedes a point in favour of the opposing view.',
        'It draws a conclusion from the study.',
        'It gives an example.',
      ], 1),
      one('Why does the writer call the cost of interruption "a tax that never appears on any budget line"?', [
        'Because companies deliberately hide it.',
        'Because it is paid by employees rather than employers.',
        'Because it is real but invisible in financial calculations.',
        'Because it only affects creative work.',
      ], 2),
      one('What is the writer\'s final position?', [
        'Private offices are clearly better than open plan.',
        'The layout matters less than whether people can choose.',
        'Open-plan offices should be abolished.',
        'Working from home solves the problem entirely.',
      ], 1),
      fill('Which single word in the text introduces a consequence and is followed by a comma?', 'Consequently', ['consequently']),
    ],
    { title: 'Against the open office (аргументированное эссе)' },
  ),

  // ── Countable / uncountable: заметка о данных и «информации» ──
  'enac-14': reading(
    'HOW MUCH EVIDENCE IS ENOUGH?\n\n'
    + 'Ask a scientist how much evidence is needed to change a mind and you will get an uncomfortable answer: it depends on whose mind. '
    + 'Research on belief revision has produced a great deal of information about how people handle facts that contradict them, '
    + 'and very little of it is flattering.\n\n'
    + 'In one well-known series of experiments, participants were given some news about a policy they supported, and then the same news '
    + 'was corrected. Most of them remembered the original claim and not the correction. A few changed their minds; few enough that the effect '
    + 'was hard to measure at all. The researchers were careful not to over-interpret this. Later work found that corrections do function, '
    + 'though more slowly and less completely than anyone had hoped.\n\n'
    + 'Part of the difficulty is practical. Evidence, unlike money, cannot simply be counted. A single piece of strong evidence may outweigh '
    + 'twenty weak studies, and knowing which is which requires expertise that most readers, quite reasonably, do not have. '
    + 'We therefore rely on proxies: how many researchers agree, how good the journal is, how confident the summary sounds.\n\n'
    + 'That last proxy is the dangerous one. Confidence is cheap. A great deal of harm has been done by clear, forceful statements '
    + 'that turned out to rest on very little data, and a great deal of good work has been ignored because its authors, being honest, '
    + 'used words like "suggests" and "may".\n\n'
    + 'The uncomfortable conclusion is that reading research well takes time, and time is the resource that nobody has much of.',
    [
      one('What did participants in the experiments mostly remember?', [
        'Both the claim and the correction.',
        'The original claim rather than the correction.',
        'Only the correction.',
        'Neither, after a few days.',
      ], 1),
      one('Why does the writer say evidence "cannot simply be counted"?', [
        'Because studies are rarely published.',
        'Because quality matters more than the number of studies.',
        'Because researchers disagree about definitions.',
        'Because most evidence is kept private.',
      ], 1),
      one('Which proxy does the writer consider most dangerous?', [
        'The number of researchers who agree.',
        'The reputation of the journal.',
        'How confident the summary sounds.',
        'The age of the study.',
      ], 2),
      one('What does the writer imply about cautious language such as "suggests" and "may"?', [
        'It is a sign of weak research.',
        'It is honest but tends to be ignored.',
        'It should be avoided in summaries.',
        'It only appears in low-quality journals.',
      ], 1),
      fill('The text says "a great deal of information". Why not "a great number of informations"? Give the grammatical term for the word "information" (one word, English).',
        'uncountable', ['uncountable noun', 'non-count']),
    ],
    { title: 'How much evidence is enough? (научпоп)' },
  ),

  // ── Dependent prepositions: рецензия-мнение ──
  'enac-16': reading(
    'A MUSEUM THAT DOES NOT EXPLAIN ITSELF\n\n'
    + 'The new city museum has been criticised for something most museums would count as a virtue: it refuses to tell you what to think. '
    + 'There are no long panels, no confident summaries, no attempt at a single narrative. Visitors are presented with objects, dates and, '
    + 'occasionally, a question.\n\n'
    + 'The director is unapologetic. In an interview last month she insisted on describing the approach as a form of respect. '
    + 'Museums, she argued, have grown too fond of explaining; they benefit from silence more often than they admit. Her critics object to this '
    + 'on practical grounds. A visitor who is unfamiliar with the period, they say, is not being respected but abandoned.\n\n'
    + 'Both sides have a point, and the disagreement is really about who a museum is for. If it is aimed at people already interested in the subject, '
    + 'restraint works beautifully. If it is responsible for introducing the subject to people who know nothing about it, restraint looks like a failure '
    + 'to do the job.\n\n'
    + 'What is not in dispute is the effect on the building itself. Freed from metres of text, the rooms breathe. The lighting, which was designed '
    + 'by a team more used to theatre than to galleries, does most of the interpretive work, and does it well. One room, dedicated to the flood of 1953, '
    + 'contains nothing but water-damaged objects and a rising line on the wall. Nobody who has stood in it needs to be told what happened.\n\n'
    + 'Perhaps that is the answer. Explanation is not the opposite of emotion; it is simply a weaker instrument, and museums have been reaching '
    + 'for it too quickly.',
    [
      one('What is unusual about the museum?', [
        'It contains very few objects.',
        'It provides almost no explanatory text.',
        'It focuses on a single year.',
        'It is aimed only at specialists.',
      ], 1),
      one('What is the critics\' main objection?', [
        'The building is badly designed.',
        'The collection is too small.',
        'Visitors who do not know the period are left without help.',
        'The director refuses to give interviews.',
      ], 2),
      one('According to the writer, what is the disagreement really about?', [
        'How much money museums should spend.',
        'Who the museum is intended for.',
        'Whether the objects are authentic.',
        'Whether lighting can replace text.',
      ], 1),
      one('What does the writer conclude about explanation?', [
        'It should be removed from all museums.',
        'It is the opposite of emotional experience.',
        'It is a weaker tool that is reached for too readily.',
        'It works only in rooms with good lighting.',
      ], 2),
      fill('Complete from the text: "Her critics object ___ this on practical grounds." (one word)', 'to'),
    ],
    { title: 'A museum that does not explain itself (рецензия)' },
  ),

  // ── Gerund vs infinitive: очерк о привычках ──
  'enac-18': reading(
    'WHY WE STOP DOING THINGS WE ENJOY\n\n'
    + 'Most people can remember taking up a hobby with real enthusiasm and then, some months later, quietly abandoning it. '
    + 'We tend to explain this in terms of character: we say we lack discipline, or that we failed to make time. '
    + 'Behavioural research suggests the explanation is usually more boring than that.\n\n'
    + 'The first factor is the disappearance of visible progress. When you begin learning an instrument, you improve every week and you can hear it. '
    + 'After six months you continue practising but stop noticing any change, and the reward that kept you going simply stops arriving. '
    + 'People rarely decide to quit; they forget to continue.\n\n'
    + 'The second factor is the cost of restarting. Miss one week and you need to spend the next one recovering. Miss three and returning means '
    + 'admitting to yourself that you have lost ground. Many people would rather abandon an activity than face the evidence of their own interruption, '
    + 'which is why the two-week gap is so often permanent.\n\n'
    + 'What seems to help is deliberately lowering the bar. Researchers who study habit formation recommend defining the activity so narrowly '
    + 'that skipping it becomes harder than doing it: not "practise for an hour" but "open the case and play one line". '
    + 'Participants who tried reducing their target in this way were considerably more likely to be still going a year later.\n\n'
    + 'The finding is not romantic. Nobody takes up the piano in order to play one line a day. But the alternative, as most of us can confirm, '
    + 'is an instrument in the corner that we mean to return to and never quite do.',
    [
      one('What does the writer say about how people usually explain quitting?', [
        'They blame their own lack of discipline.',
        'They blame the difficulty of the activity.',
        'They rarely think about it at all.',
        'They blame the cost of equipment.',
      ], 0),
      one('Why does progress stop motivating people?', [
        'Because they practise less than before.',
        'Because improvement continues but is no longer noticeable.',
        'Because they compare themselves with others.',
        'Because the activity becomes too easy.',
      ], 1),
      one('Why is a gap of two or three weeks often permanent?', [
        'Skills are lost completely after two weeks.',
        'Returning would mean acknowledging lost ground.',
        'Teachers refuse to take students back.',
        'The equipment usually needs repair.',
      ], 1),
      one('What do the researchers recommend?', [
        'Setting an ambitious target and sticking to it.',
        'Practising with other people.',
        'Making the daily target so small that skipping feels harder.',
        'Taking planned breaks every month.',
      ], 2),
      fill('Complete from the text: "People rarely decide to quit; they forget ___ ___." (two words — note the meaning of forget + infinitive)',
        'to continue', ['to continue ']),
    ],
    { title: 'Why we stop doing things we enjoy (очерк)' },
  ),

  // ── Регистр: три письма об одном и том же ──
  'enac-20': reading(
    'THREE WAYS TO SAY NO\n\n'
    + 'A colleague asks you to take on an extra project. You cannot. Here is the same refusal at three distances.\n\n'
    + 'First: "Can\'t do it this month, sorry — completely buried. Ask me again in April?" Contractions, a fragment, a dash, a question that '
    + 'is really an offer. This is what you write to someone you speak to every day. Sent to a client you have never met, it reads as careless.\n\n'
    + 'Second: "Thanks for thinking of me. I am afraid I will not be able to take this on before April, as I am committed to the migration work '
    + 'until then. I would be glad to look at it after that if the timing still works." Neutral, complete sentences, a reason and an alternative. '
    + 'This is the version that fits almost every professional situation, which is why it is worth being able to produce it without thinking.\n\n'
    + 'Third: "Thank you for your enquiry. Regrettably, I am unable to accept additional commitments during the current quarter. '
    + 'Should the requirement remain open in April, I would be pleased to discuss it further." No contractions, Latinate verbs, an inverted '
    + 'conditional, and not a single word about how busy anyone is. This belongs in correspondence with an institution.\n\n'
    + 'Learners tend to worry about being too informal. In practice the more damaging error runs the other way: the formal register, '
    + 'used with a colleague, creates distance the writer never intended, and the reader wonders what has gone wrong between you. '
    + 'Formality is not politeness. It is distance, and distance has to be chosen deliberately.\n\n'
    + 'One test works surprisingly well. Read the message aloud. If you would never say it to the person\'s face, do not send it in writing.',
    [
      one('What is wrong with the first version when sent to a new client?', [
        'It is too long.',
        'It sounds careless because it is too informal.',
        'It does not refuse clearly enough.',
        'It contains grammatical mistakes.',
      ], 1),
      one('Why does the writer recommend the second version?', [
        'It is the shortest.',
        'It suits nearly all professional situations.',
        'It avoids giving a reason.',
        'It is the most polite of the three.',
      ], 1),
      many('Which features mark the third version as formal? Choose all that apply.', [
        'No contractions',
        'An inverted conditional ("Should the requirement remain open")',
        'A dash and a sentence fragment',
        'Latinate verbs such as "accept" and "discuss"',
      ], [0, 1, 3]),
      one('What is the writer\'s main point about formality?', [
        'It is always safer than informality.',
        'It is the same thing as politeness.',
        'It signals distance and must be chosen on purpose.',
        'It should be avoided in email.',
      ], 2),
      fill('What test does the writer suggest at the end? Complete: read the message ___. (one word)', 'aloud', ['out loud']),
    ],
    { title: 'Three ways to say no (разбор регистра)' },
  ),

  // ── Hedging: осторожный академический текст ──
  'enac-22': reading(
    'DOES READING FICTION MAKE US KINDER?\n\n'
    + 'It is often claimed that reading novels improves our ability to understand other people. The idea is attractive, and there is some evidence '
    + 'for it, but the evidence is considerably weaker than the headlines suggest.\n\n'
    + 'The best-known study reported that participants who had read a short literary text performed slightly better on a test of emotion recognition '
    + 'than those who had read popular fiction or nothing at all. The effect was statistically significant and, in absolute terms, small. '
    + 'Subsequent attempts to reproduce it have had mixed results: some found a comparable effect, others found none.\n\n'
    + 'Even if the effect is real, its direction is not established. Readers of literary fiction may well be people who were already more '
    + 'interested in other minds, in which case reading is a symptom rather than a cause. Studies of this kind can rarely separate the two, '
    + 'and researchers are generally careful to say so — a caution that tends to disappear by the time the finding reaches a newspaper.\n\n'
    + 'What can be said with more confidence is narrower. Sustained reading appears to be associated with larger vocabulary, better concentration '
    + 'and, in some longitudinal work, slower cognitive decline. These findings are less exciting than the claim about kindness, '
    + 'and they are considerably better supported.\n\n'
    + 'The broader lesson may have less to do with fiction than with how we read research. A modest result, described cautiously by its authors, '
    + 'becomes a confident headline in three steps, none of which involves anybody lying. It is worth learning to recognise the hedging language '
    + 'that survives the journey — and to notice when it has been stripped out.',
    [
      one('How does the writer describe the evidence for the claim about kindness?', [
        'Strong and repeatedly confirmed.',
        'Non-existent.',
        'Real but weaker than the headlines suggest.',
        'Impossible to evaluate.',
      ], 2),
      one('What problem with the direction of the effect is raised?', [
        'The tests were badly designed.',
        'Readers of literary fiction may already have been more interested in other minds.',
        'The participants were too young.',
        'The texts were too short.',
      ], 1),
      one('Which findings does the writer consider better supported?', [
        'That fiction improves empathy.',
        'That reading is linked to vocabulary, concentration and slower cognitive decline.',
        'That popular fiction is as useful as literary fiction.',
        'That researchers exaggerate their results.',
      ], 1),
      one('What does "none of which involves anybody lying" suggest about how findings become headlines?', [
        'Journalists deliberately distort research.',
        'The distortion happens through small, honest steps.',
        'Researchers write the headlines themselves.',
        'The original studies are usually fraudulent.',
      ], 1),
      many('Which hedging expressions appear in the text? Choose all that apply.', [
        'may well be',
        'appears to be associated with',
        'it is proven that',
        'tends to',
      ], [0, 1, 3]),
    ],
    { title: 'Does reading fiction make us kinder? (академический научпоп)' },
  ),

  // ── Итог: эссе, в котором собраны конструкции всего курса ──
  'enac-24': reading(
    'THE CASE FOR BEING SLIGHTLY WRONG IN PUBLIC\n\n'
    + 'Rarely does anyone learn a language quietly. What most learners want — to speak only once they are correct — is precisely the strategy '
    + 'that keeps them from getting there.\n\n'
    + 'Consider what happens when you avoid speaking. Not only do you lose practice; you also lose the only reliable source of correction, '
    + 'which is another person\'s face. Having spent years reading and listening, many learners arrive at an advanced level of comprehension '
    + 'and an elementary level of production, and are then surprised by the gap. It is not mysterious. Comprehension has been trained daily; '
    + 'production has been rehearsed silently, where nothing can go wrong and nothing can be corrected.\n\n'
    + 'Admittedly, the fear is rational. Being visibly wrong in front of colleagues carries a real social cost, and advice to "just speak" '
    + 'ignores it. What helps is not courage but design: choosing situations in which the cost of error is low. Language exchanges, '
    + 'voice notes, a weekly call with one patient friend — all of these are structured so that a mistake costs almost nothing.\n\n'
    + 'Had the profession taken this seriously earlier, textbooks might look different. What learners need at this stage is not more input '
    + 'but a place to be imperfect on a schedule.\n\n'
    + 'It is worth being honest about the timescale. Nobody moves from B2 to C1 in a term. The distance is measured in hundreds of hours, '
    + 'most of them unremarkable. But the direction is not in doubt: those who speak badly and often overtake those who speak well and rarely, '
    + 'and they do so faster than anybody expects.',
    [
      one('What does the writer say about waiting until you are correct before speaking?', [
        'It is sensible for advanced learners.',
        'It is the very strategy that prevents progress.',
        'It works if you read enough.',
        'It shortens the time needed to reach C1.',
      ], 1),
      one('Why do many learners have strong comprehension and weak production?', [
        'Because comprehension is naturally easier.',
        'Because production has only been rehearsed silently, without correction.',
        'Because they study the wrong grammar.',
        'Because they listen to material that is too difficult.',
      ], 1),
      one('How does the writer respond to the fear of speaking?', [
        'By calling it irrational.',
        'By accepting it and recommending low-cost situations instead.',
        'By recommending more courage.',
        'By suggesting learners avoid colleagues.',
      ], 1),
      one('Which sentence best summarises the final paragraph?', [
        'Progress is fast if the method is right.',
        'Most learners overestimate how long it takes.',
        'Progress is slow and mostly unremarkable, but the direction is clear.',
        'Speaking well matters more than speaking often.',
      ], 2),
      many('Which advanced structures appear in the text? Choose all that apply.', [
        'Inversion after a negative adverbial ("Rarely does anyone learn…")',
        'A wh-cleft ("What most learners want…")',
        'An inverted third conditional ("Had the profession taken this seriously…")',
        'Reported questions',
      ], [0, 1, 2]),
    ],
    { title: 'The case for being slightly wrong in public (эссе)' },
  ),
}
