// ─────────────────────────────────────────────────────────────────────────────
// Отрывки для чтения к курсу «Английский: возвращение B2 за 14 дней» (ensp)
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Так же, как у enac: юнит отвечает за последовательность,
// словарь и упражнения, а связный текст живёт своей жизнью — его правят,
// заменяют и удлиняют независимо от грамматической прогрессии.
//
// ЧЕМ ЭТИ ОТРЫВКИ ОТЛИЧАЮТСЯ. Курс восстановительный, и текст здесь работает не
// как источник новой лексики, а как место, где конструкция дня встречается
// НЕПОДЧЁРКНУТОЙ. Поэтому каждый отрывок намеренно перегружен своей
// конструкцией, но ни разу на неё не указывает, а один из вопросов всегда
// спрашивает не содержание, а работу формы: «зачем здесь Past Perfect»,
// «что буквально говорит этот оборот».
//
// ОБСТАНОВКА. Кабинет химии, лаборатория, лекционный зал, курс анатомии, метро,
// вокзал, аптека, касса — то есть та среда, в которой языку предстоит работать.
// Тексты написаны с нуля; ничего не заимствовано.
//
// Идут ПОСЛЕ упражнений юнита: сначала форма ставится в руку, потом
// встречается в тексте, где её никто не выделял.
// ─────────────────────────────────────────────────────────────────────────────

import { reading, one, trueFalse } from './languageCourse'
import type { SeedTask } from './languageCourse'

export const ENSP_READING: Record<string, SeedTask[]> = {
  // ── День 1: фон и событие, глаголы состояния ──
  'ensp-1': reading(
    'THE LESSON THAT CAME APART\n\n'
    + 'It was the third period on a Thursday, and I was setting up eight burners while the group filed in. '
    + 'I remember thinking that the room felt colder than usual, but I did not know why, and I had four minutes, so I let it go.\n\n'
    + 'While I was explaining the safety rules, someone opened the window at the back. Nobody heard me ask them to close it. '
    + 'The draught crossed the room in about ten seconds and blew out two of the flames, which nobody noticed either, because at that '
    + 'moment I was writing the equation on the board with my back to the class.\n\n'
    + 'Gas kept coming. It did not smell of anything at first — it never does in the quantities we use — and the two pairs at the far bench '
    + 'went on working. They were measuring out the solution and talking about a film. I was still writing.\n\n'
    + 'What saved the lesson was entirely accidental. A student at the front wanted to borrow a pen, turned round, and saw that the burners '
    + 'at bench six were not lit. She said so, loudly, in the flat tone teenagers use when they think an adult has made an obvious mistake. '
    + 'I turned round, saw it too, and had the windows shut and the taps off within about fifteen seconds.\n\n'
    + 'Afterwards I understood something I had known in theory for years and never really believed: the dangerous moment in a practical '
    + 'is not the one you are watching. It is the one behind you, while you are busy being competent at something else.',
    [
      one('What was the teacher doing when the flames went out?', [
        'Explaining the safety rules to the group.',
        'Writing the equation on the board with his back to the class.',
        'Measuring out the solution at bench six.',
        'Closing the window at the back of the room.',
      ], 1),
      one('Why does the writer use "I remember thinking" rather than "I was thinking"?', [
        'Because it refers to a memory of a past thought, not to an ongoing process.',
        'Because "think" can never be used in the continuous form.',
        'Because the action happened after the lesson ended.',
        'Because it is a more formal way of saying the same thing.',
      ], 0),
      one('What is the writer’s conclusion?', [
        'Practical lessons should be banned in cold weather.',
        'Students are usually the cause of accidents in the lab.',
        'The risk sits where your attention is not, while you are competently doing something else.',
        'Safety rules are useless if nobody listens to them.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The teacher was writing on the board when the flames went out.', 'T'],
        ['The students at bench six noticed at once that their burners had gone out.', 'F'],
        ['The gas taps had been inspected earlier that term.', 'NG'],
      ]),
    ],
    { title: 'День 1 · чтение' },
  ),

  // ── День 2: перфект, длительность и связь с настоящим ──
  'ensp-2': reading(
    'ELEVEN YEARS IN THE SAME ROOM\n\n'
    + 'I have been teaching chemistry in the same room for eleven years, and I have watched it change in ways that nobody planned.\n\n'
    + 'When I started, the room had been a biology lab for two decades, and it still had the skeleton in the corner cupboard. '
    + 'Nobody had ever moved it, because nobody could agree whose job that was. It is still there. Every September a new group discovers it, '
    + 'and every September I explain that it has been in that cupboard longer than any of them have been alive.\n\n'
    + 'The equipment has aged less gracefully than the skeleton. Since 2019 we have lost two fume cupboards, one of which has been '
    + '"awaiting parts" for so long that the phrase has become a joke among the staff. I have submitted the same request eleven times. '
    + 'I have had three different replies, none of which mentioned the fume cupboard.\n\n'
    + 'What has genuinely improved is the students. This is not nostalgia in reverse; I have the marks. The groups that have come through '
    + 'in the last four years arrive knowing how to look something up, check it against a second source and tell me when the textbook is out '
    + 'of date. They are less obedient and considerably harder to teach, which is exactly what you want.\n\n'
    + 'I have been asked several times whether I would move to a better-equipped school. The honest answer is that I have stopped '
    + 'thinking of the room as equipment. It is eleven years of knowing which bench wobbles, which window sticks, and which corner of the '
    + 'board nobody at the back can read.',
    [
      one('How long has the skeleton been in the cupboard?', [
        'Eleven years, since the writer arrived.',
        'Since 2019, when the fume cupboards broke.',
        'Longer than any of the current students have been alive.',
        'Nobody in the school knows.',
      ], 2),
      one('Why is "has been awaiting parts" used rather than "awaited parts"?', [
        'Because the situation started in the past and is still true now.',
        'Because it happened at a specific time in the past.',
        'Because the fume cupboard was repaired and then broke again.',
        'Because the writer is quoting somebody else exactly.',
      ], 0),
      one('What does the writer say has improved?', [
        'The equipment in the room.',
        'The response time of the school administration.',
        'The students, who are harder to teach and better at checking things.',
        'The reading on the board from the back row.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The skeleton was in the cupboard before the writer started teaching there.', 'T'],
        ['The fume cupboard was repaired after the eleventh request.', 'F'],
        ['The writer teaches more groups now than in 2019.', 'NG'],
      ]),
    ],
    { title: 'День 2 · чтение' },
  ),

  // ── День 3: будущее и придаточные времени ──
  'ensp-3': reading(
    'THE TIMETABLE THAT KEEPS MOVING\n\n'
    + 'The reagents are due to arrive on Wednesday. As soon as they get here, we will set up the practical; until they do, '
    + 'the group revises theory, which nobody enjoys and everybody needs.\n\n'
    + 'This is the fourth time this term the schedule has moved, and I am going to stop pretending it is unusual. '
    + 'The supplier is not at fault. The fault, as far as anyone can trace it, lies in a form that has to be signed by a person who is '
    + 'on leave until the eleventh. When she comes back, she will sign eleven weeks of forms in an afternoon, and for about a month '
    + 'everything will arrive on time.\n\n'
    + 'By the end of this term we will have covered all the required practicals, but not in the order the syllabus intends, '
    + 'and this matters more than it sounds. The syllabus assumes that students meet reaction rates before equilibrium. '
    + 'Mine will meet them the other way round, which means that when we get to rates in June, half the group will already have '
    + 'built the wrong mental model and will have to take it apart.\n\n'
    + 'I am meeting the head of department on Friday to argue for a simple change: order everything for the whole year in September. '
    + 'The objection will be that we cannot predict what we will need. That is true, and it is also beside the point. '
    + 'This time next year I would rather be throwing away two boxes of unused reagent than teaching equilibrium to a group that has '
    + 'never watched anything react quickly.',
    [
      one('What happens while the group waits for the reagents?', [
        'They do the practical with older reagents.',
        'They revise theory, which nobody enjoys.',
        'The lessons are cancelled entirely.',
        'They meet the head of department.',
      ], 1),
      one('Why does the writer say "when we get to rates" and not "when we will get to rates"?', [
        'Because the event is not certain enough for "will".',
        'Because after "when" in a time clause English uses a present form, not a future one.',
        'Because the sentence is about a habit rather than a single event.',
        'Because "get" is a state verb.',
      ], 1),
      one('What is the writer’s main argument for ordering everything in September?', [
        'It would save the department money over the year.',
        'Wasting some reagent is a smaller cost than teaching topics in the wrong order.',
        'The supplier gives a discount for annual orders.',
        'The person who signs the forms would not need to work so hard.',
      ], 1),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The reagents have not arrived yet.', 'T'],
        ['The supplier is to blame for the delay.', 'F'],
        ['The head of department has already rejected the proposal.', 'NG'],
      ]),
    ],
    { title: 'День 3 · чтение' },
  ),

  // ── День 4: артикли, обобщение, неисчисляемые ──
  'ensp-4': reading(
    'THE ORGAN THAT DESCRIBES ITSELF\n\n'
    + 'The human brain contains roughly 86 billion neurons, and the number is quoted so often that people have stopped asking where it '
    + 'came from. It came from a researcher who dissolved four brains into a uniform solution and counted the nuclei in a sample. '
    + 'Before that, the standard figure was 100 billion, and the evidence for it was, as far as anyone can establish, nobody in particular.\n\n'
    + 'This is a useful piece of history for a first lecture, because it makes a point that no amount of general advice about scepticism '
    + 'will make. Information that everybody repeats acquires the texture of fact. Research that nobody has repeated acquires the same '
    + 'texture, given enough time.\n\n'
    + 'The brain is a particularly good subject for this lesson because so much of the knowledge about it is recent, contested and '
    + 'presented to the public as settled. There is a great deal of evidence that specific regions do specific things. '
    + 'There is much less evidence that any region does only one thing, and almost none for the version students arrive with, in which '
    + 'the left half is logical and the right half is creative.\n\n'
    + 'I give the group one piece of advice at the start of the course and repeat it whenever they cite something confidently: '
    + 'find out how many people have actually measured the thing you are quoting. Usually the answer is a few. '
    + 'Occasionally it is one. Now and then the honest answer is nobody, and the number has simply been copied forward for forty years '
    + 'because it sounds precise.',
    [
      one('Where did the figure of 86 billion neurons come from?', [
        'From a long series of independent studies.',
        'From a researcher who dissolved four brains and counted nuclei in a sample.',
        'From the earlier figure of 100 billion, adjusted downwards.',
        'From a textbook that nobody has been able to trace.',
      ], 1),
      one('Why is "The human brain contains…" used rather than "A human brain contains…"?', [
        'Because the writer means one specific brain that was studied.',
        'Because "the" plus a singular noun is the standard way of generalising about a class in scientific writing.',
        'Because "brain" is an uncountable noun.',
        'Because the sentence is a quotation from another source.',
      ], 1),
      one('What is the writer’s advice to students?', [
        'Never quote numbers in scientific writing.',
        'Prefer recent research to older research.',
        'Check how many people have actually measured what you are quoting.',
        'Avoid the subject of the brain until later in the course.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The 86 billion figure came from counting nuclei in a sample.', 'T'],
        ['The earlier figure of 100 billion rested on careful measurement.', 'F'],
        ['Students on the course have to read the original paper.', 'NG'],
      ]),
    ],
    { title: 'День 4 · чтение' },
  ),

  // ── День 5: модальность предположения ──
  'ensp-5': reading(
    'FIVE EXPLANATIONS, ONE OF THEM RIGHT\n\n'
    + 'The reaction should have taken about four minutes. It took nineteen, and by then half the group had lost interest, '
    + 'which is its own kind of failure.\n\n'
    + 'It cannot have been the concentration: two of us made up the solution separately and got the same result, '
    + 'and we would both have had to make the identical mistake. It might have been the stirring, although that would not '
    + 'account for a delay of that size. It must have been something that affected every bench at once, because every bench was slow, '
    + 'and that narrows the list considerably.\n\n'
    + 'The reagent may have been old. The label said March, which presumably means March of this year, though the handwriting is such '
    + 'that it could equally be March of the year before. Nobody can now say who wrote it, and the person who ordered it has left.\n\n'
    + 'The likeliest explanation is the dullest. The room was cold — the heating had failed over the weekend and had not been noticed, '
    + 'because it was noticed on Monday morning by a caretaker who assumed somebody else would report it. '
    + 'A drop of eight degrees is enough to do exactly what we saw.\n\n'
    + 'I should have measured the room temperature before I started. I have said this to students perhaps two hundred times. '
    + 'What I have never said to them, and probably should, is that the reason you record the conditions is not that you expect them '
    + 'to matter. It is that when something goes wrong you will otherwise spend a week arguing about explanations that cannot be checked.',
    [
      one('Why does the writer rule out the concentration as a cause?', [
        'Because the solution was made up by two people separately with the same result.',
        'Because the label said March.',
        'Because the room was cold.',
        'Because the stirring was inconsistent.',
      ], 0),
      one('What does "It cannot have been the concentration" express?', [
        'A prohibition — the concentration was not allowed to change.',
        'An obligation to check the concentration.',
        'A confident negative deduction about a past situation.',
        'A polite request for somebody to test the concentration.',
      ], 2),
      one('What lesson does the writer draw about recording conditions?', [
        'Conditions almost always turn out to be the cause of failure.',
        'You record them so that failures can be checked instead of argued about.',
        'Students should record them, but teachers do not need to.',
        'Recording conditions saves time during the practical itself.',
      ], 1),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['Every bench was slow, not only one.', 'T'],
        ['The concentration turned out to be the cause.', 'F'],
        ['The heating has since been repaired.', 'NG'],
      ]),
    ],
    { title: 'День 5 · чтение' },
  ),

  // ── День 6: неличные формы и обороты ──
  'ensp-6': reading(
    'WHY SCIENTIFIC WRITING IS SO DENSE\n\n'
    + 'Having marked about nine thousand student reports, I can say with some confidence that the difference between a weak one and a '
    + 'good one is rarely the science. It is almost always the packing.\n\n'
    + 'Consider a sentence a first-year might write: "We prepared the sample. Then we placed it under the microscope. '
    + 'The microscope had been calibrated the day before." Three sentences, three full clauses, and a reader who has to hold all three '
    + 'in mind to see that they are one event. Now consider the packed version: "Having prepared the sample, we placed it under the '
    + 'microscope, calibrated the day before." One sentence, same information, and the relationship between the parts is visible '
    + 'rather than inferred.\n\n'
    + 'Students avoid doing this, partly because nobody teaches it and partly because they suspect it of being showing off. '
    + 'It is not. Packing is what allows a reader to hold a long argument without losing the thread, and refusing to pack means '
    + 'asking the reader to do work that the writer should have done.\n\n'
    + 'The technique has one genuine danger, and it is worth learning properly. A participle clause attaches itself to the subject of '
    + 'the main clause, whatever the writer intended. "Having prepared the sample, the microscope was ready" says that the microscope '
    + 'prepared the sample. Readers usually work out what you meant, but they notice, and in a report that is being marked, '
    + 'noticing is not neutral.\n\n'
    + 'My advice to a group is always the same: write it long first, then pack it. Trying to compose in packed prose produces sentences '
    + 'that are dense and wrong, which is worse than being clear and slow.',
    [
      one('What does the writer say separates a weak report from a good one?', [
        'The quality of the underlying science.',
        'The length of the report.',
        'How the information is packed into sentences.',
        'Whether the student used a microscope correctly.',
      ], 2),
      one('What does "Having prepared the sample, the microscope was ready" literally say?', [
        'Somebody prepared the sample and then used the microscope.',
        'The microscope prepared the sample.',
        'The sample and the microscope were prepared together.',
        'Nothing unusual — the sentence is correct as it stands.',
      ], 1),
      one('What is the writer’s practical advice?', [
        'Always write in short, separate sentences.',
        'Compose directly in packed prose to save time.',
        'Write it long first, then pack it.',
        'Avoid participle clauses entirely in student work.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The writer advises writing at length first and packing afterwards.', 'T'],
        ['Students tend to pack their sentences too tightly.', 'F'],
        ['The writer runs a course on academic writing.', 'NG'],
      ]),
    ],
    { title: 'День 6 · чтение' },
  ),

  // ── День 7: условные и сожаление ──
  'ensp-7': reading(
    'THE BATCH NOBODY CHECKED\n\n'
    + 'If somebody had checked the date on the box, the whole thing would not have happened. That is the short version, '
    + 'and it is the version that went into the report.\n\n'
    + 'The longer version is less comfortable. Four people handled that box between the loading bay and the bench, '
    + 'and if you asked any of them, each would tell you, honestly, that checking dates was somebody else’s step. '
    + 'The technician assumed the store checked on arrival. The store assumed the supplier would not ship anything short-dated. '
    + 'I assumed the technician had looked, because I always assume the technician has looked, and in eleven years that assumption '
    + 'has been correct every time except this one.\n\n'
    + 'I wish I had built the check into the lesson rather than into the system. If the students themselves read the date aloud before '
    + 'they start — it takes four seconds — then the check happens in front of thirty witnesses and cannot quietly belong to nobody. '
    + 'If I had done that from the beginning, I would be writing about something else now.\n\n'
    + 'It is time we accepted a general point about safety systems, and it applies well outside a school lab. '
    + 'A step that belongs to everybody belongs to nobody. If a check matters, it has to be somebody’s named job or a visible part of '
    + 'the procedure, and preferably both. Otherwise you have not built a safeguard; you have built a shared belief that a safeguard exists, '
    + 'and those two things look identical right up until the moment they do not.',
    [
      one('Why did nobody check the date on the box?', [
        'Because the date was not printed clearly.',
        'Because each person assumed the check was somebody else’s step.',
        'Because the supplier had promised to check it.',
        'Because the technician was absent that week.',
      ], 1),
      one('What does "I wish I had built the check into the lesson" express?', [
        'A plan for the future.',
        'A regret about something that was not done in the past.',
        'A polite request to a colleague.',
        'A condition that may still be met.',
      ], 1),
      one('What general point does the writer draw?', [
        'Safety checks should be automated wherever possible.',
        'Suppliers should be held responsible for short-dated stock.',
        'A step that belongs to everybody belongs to nobody.',
        'Students should not handle reagents at all.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['Four people handled the box before it reached the bench.', 'T'],
        ['The technician accepted that checking dates was her own step.', 'F'],
        ['The supplier was asked to replace the batch.', 'NG'],
      ]),
    ],
    { title: 'День 7 · чтение' },
  ),
  // ── День 8: пассив, каузатив, глаголы сообщения ──
  'ensp-8': reading(
    'THE JOURNEY OF A SAMPLE\n\n'
    + 'Nothing in a working lab is done by anybody in particular, at least not on paper. Samples are logged on arrival, '
    + 'stored at four degrees and disposed of at the end of the week. Read a hundred procedures and you will meet almost no people.\n\n'
    + 'This is usually explained as scientific modesty, and that explanation is thought to be complete. It is not. '
    + 'The passive is used in procedures because a procedure has to survive the person who wrote it. '
    + '"I check the seal on Monday" stops being true the moment I leave. "The seal is checked on Monday" outlives me, '
    + 'and can be handed to somebody who has never met me.\n\n'
    + 'There is a cost, and it is the cost that makes incident reports so frustrating to read. When something has gone wrong, '
    + 'the same grammar that made the procedure durable makes the failure ownerless. "The batch was not checked" is true, '
    + 'complete, and useless. It is believed to be neutral; in practice it protects everyone, including the person who should have '
    + 'checked it, who is usually relieved to find themselves grammatically absent.\n\n'
    + 'We had the storage log redesigned last year for exactly this reason. It now has a column for a name. '
    + 'Nothing else changed — the same checks, the same intervals, the same fridge — and the number of missed checks fell by about '
    + 'two thirds within a term.\n\n'
    + 'The lesson generalises. Use the passive to describe what is always done. Use a name when you need to know who did it. '
    + 'Confusing the two is how organisations end up with beautifully written procedures and no idea who is responsible for anything.',
    [
      one('Why does the writer say procedures are written in the passive?', [
        'Because scientists are modest about their own work.',
        'Because a procedure has to survive the person who wrote it.',
        'Because the passive is shorter than the active.',
        'Because the names of technicians are confidential.',
      ], 1),
      one('What does "We had the storage log redesigned" mean?', [
        'The writer redesigned the log personally.',
        'The log redesigned itself automatically.',
        'The writer arranged for somebody else to redesign it.',
        'The log was going to be redesigned but never was.',
      ], 2),
      one('What is the cost of the passive in incident reports?', [
        'It makes reports longer and harder to read.',
        'It hides who was responsible, protecting everyone.',
        'It makes procedures impossible to update.',
        'It confuses the order in which events happened.',
      ], 1),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['Adding a name column cut missed checks by about two thirds.', 'T'],
        ['The passive is used in procedures mainly out of scientific modesty.', 'F'],
        ['Other departments have copied the redesigned log.', 'NG'],
      ]),
    ],
    { title: 'День 8 · чтение' },
  ),

  // ── День 9: придаточные, свёртка, cleft ──
  'ensp-9': reading(
    'WHAT ACTUALLY RUINED IT\n\n'
    + 'It was the storage temperature, not the reagent itself, that ruined three weeks of work. '
    + 'That sentence took a month to be able to write.\n\n'
    + 'The reagent, which had been ordered in January and used without trouble since, was the obvious suspect. '
    + 'Everybody who looked at the results said so. The batch stored in the door of the fridge behaved differently from the batch '
    + 'stored at the back, and since the two came from the same delivery, the difference had to be the reagent. '
    + 'That reasoning is wrong, and it is wrong in an interesting way: it assumes that two things from the same box have had the same life.\n\n'
    + 'What nobody checked was the door. A fridge door, opened forty times a day in a teaching lab, is not a cold place. '
    + 'It is a place that returns to cold. The batch kept there had been through some six hundred warming cycles; '
    + 'the batch at the back had been through none.\n\n'
    + 'The student who found this, whose project it was, found it by accident. She had been keeping a log of when the fridge was opened '
    + 'for a completely unrelated reason — she wanted to know whether people were taking her samples — and the two records lined up exactly.\n\n'
    + 'What I take from this is not really about fridges. It is that "same batch" is a claim about origin, and origin is the least '
    + 'interesting thing about a sample. What matters is history, which is precisely the thing nobody records, '
    + 'because recording it looks like paperwork right up until the week it saves you.',
    [
      one('What actually caused the problem?', [
        'The reagent itself, which was faulty.',
        'The storage temperature, because of repeated warming cycles in the fridge door.',
        'The student’s method of measuring.',
        'The January delivery, which arrived late.',
      ], 1),
      one('Why does the writer begin "It was the storage temperature, not the reagent itself, that…"?', [
        'To make the sentence longer and more formal.',
        'To single out one element as the cause, which normal word order cannot do in English.',
        'Because the subject of the sentence is unknown.',
        'Because the sentence reports somebody else’s words.',
      ], 1),
      one('How was the cause discovered?', [
        'By a systematic review of all storage procedures.',
        'By the supplier, who admitted the batch was faulty.',
        'By accident, from a log the student kept for an unrelated reason.',
        'By repeating the whole experiment from the beginning.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The two batches came from the same delivery.', 'T'],
        ['The student set out to investigate the fridge temperature.', 'F'],
        ['The fridge has since been replaced.', 'NG'],
      ]),
    ],
    { title: 'День 9 · чтение' },
  ),

  // ── День 10: косвенная речь и глаголы речи ──
  'ensp-10': reading(
    'THE CONVERSATION THAT WAS REPORTED THREE TIMES\n\n'
    + 'On the Tuesday, the technician told me that the delivery had arrived damaged and asked whether she should sign for it. '
    + 'I said she should note the damage on the sheet and sign. That is what happened.\n\n'
    + 'By Thursday, the version reaching the head of department was that I had instructed her to sign for a damaged delivery. '
    + 'Both sentences describe the same act. Only one of them contains the word "note", and its absence does all the work.\n\n'
    + 'By the following week the supplier had been told that the school was disputing the delivery, which nobody had said at any point. '
    + 'Somebody had reported that we were unhappy; somebody else had reported that report; and the word "dispute" entered the chain '
    + 'from the supplier’s own vocabulary, because that is the category their system has.\n\n'
    + 'I have stopped being surprised by this, and I have started noticing which verbs do the damage. Nobody in the chain lied. '
    + 'What happened is that each person chose a reporting verb, and reporting verbs carry judgements that the original words did not. '
    + 'She asked becomes she queried becomes she objected. I said becomes I instructed becomes I insisted. '
    + 'Three steps and you have a different event.\n\n'
    + 'The practical defence is boring and effective: when something matters, report the words rather than the act. '
    + '"She asked whether she should sign, and I said to note the damage first" is longer than "I told her to sign", '
    + 'and it is the difference between a record and an interpretation.',
    [
      one('What did the writer actually tell the technician?', [
        'To refuse the delivery.',
        'To note the damage on the sheet and sign.',
        'To sign without recording anything.',
        'To call the supplier immediately.',
      ], 1),
      one('According to the writer, what distorted the account?', [
        'Somebody deliberately lied about the conversation.',
        'The choice of reporting verbs, which carry judgements the original words did not.',
        'The technician forgot what she had been told.',
        'The delivery sheet was filled in incorrectly.',
      ], 1),
      one('What defence does the writer recommend?', [
        'Putting every conversation in writing immediately.',
        'Avoiding reported speech entirely.',
        'Reporting the words rather than the act when something matters.',
        'Refusing to sign for damaged deliveries.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The word “note” had disappeared from the account by Thursday.', 'T'],
        ['Somebody in the chain lied deliberately.', 'F'],
        ['The supplier refused to take the delivery back.', 'NG'],
      ]),
    ],
    { title: 'День 10 · чтение' },
  ),

  // ── День 11: предлоги и фразовые глаголы ──
  'ensp-11': reading(
    'THE VOCABULARY THAT HIDES IN THE SMALL WORDS\n\n'
    + 'A colleague who has been teaching English abroad for years told me that her students almost never run out of nouns. '
    + 'They run out of the things that hold nouns together.\n\n'
    + 'You can watch it happen. Somebody with a good technical vocabulary gets through a description of their work without difficulty, '
    + 'and then comes to a sentence that depends on a preposition, and the whole thing slows down. '
    + 'The result depends on the concentration — not depends from, which is what the first language offers. '
    + 'She is good at explaining — not good in. He apologised for not telling us — not apologised that he did not tell.\n\n'
    + 'None of this is logic, and pretending otherwise wastes everybody’s time. The preposition belongs to the word, '
    + 'the way a gender belongs to a noun in German. It has to be learned in the pair, and a list of prepositions on their own '
    + 'is about as useful as a list of endings with no words attached.\n\n'
    + 'Phrasal verbs work the same way and carry an extra trap. Put off and postpone mean the same thing, '
    + 'but a person who only ever says postpone sounds like a translated document. '
    + 'Meanwhile the phrasal verb has a rule the single word does not: if the object is a pronoun it has to go inside. '
    + 'Look it up, never look up it. Students who have never been told this produce the wrong order confidently for years, '
    + 'because nothing in the meaning tells them otherwise.\n\n'
    + 'Her advice, which I have since repeated to my own groups: when you meet a new verb, write down what comes after it. '
    + 'Not the translation — the preposition. The translation you can guess. The preposition you cannot.',
    [
      one('What do the students run out of, according to the colleague?', [
        'Technical nouns.',
        'The small words that hold nouns together.',
        'Time during the lesson.',
        'Confidence in speaking.',
      ], 1),
      one('Why does the writer compare prepositions to gender in German?', [
        'Because both are logical once the rule is understood.',
        'Because both belong to the word itself and must be learned with it.',
        'Because both are disappearing from modern usage.',
        'Because both are unimportant for comprehension.',
      ], 1),
      one('What is the extra trap with phrasal verbs?', [
        'They cannot be used in formal writing.',
        'They have no single-word equivalents.',
        'A pronoun object must go inside the verb: look it up, not look up it.',
        'They change meaning depending on the speaker’s accent.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['A pronoun object has to go inside a separable phrasal verb.', 'T'],
        ['The colleague says her students most often run out of nouns.', 'F'],
        ['The colleague teaches in Thailand.', 'NG'],
      ]),
    ],
    { title: 'День 11 · чтение' },
  ),

  // ── День 12: связки и инверсия ──
  'ensp-12': reading(
    'WHAT HOLDS A PARAGRAPH TOGETHER\n\n'
    + 'No sooner had I started marking the essays than I noticed the pattern. Almost every weak paragraph was grammatically correct.\n\n'
    + 'This is not the problem people expect. The sentences were fine; the joins were missing. A student would write four true statements '
    + 'in a row and connect them with and, and, but — and the reader, who cannot see inside the writer’s head, has no way of knowing '
    + 'which statement is the claim, which is the evidence and which is the concession.\n\n'
    + 'Although the fix is small, it is not obvious, and it is almost never taught explicitly. Connectors are not decoration; '
    + 'they are the only instructions the reader gets. Whereas and are neutral, however signals a turn, given that signals that '
    + 'what follows rests on what came before, and that said tells the reader you are about to argue against yourself.\n\n'
    + 'There is a grammatical trap in the middle of this, and it catches strong students more often than weak ones, '
    + 'because weak students avoid the words entirely. Although is a conjunction and takes a clause. '
    + 'Despite is a preposition and takes a noun. However is an adverb and needs a full stop or a semicolon before it. '
    + 'Three words with almost the same meaning and three different grammars, and getting it wrong produces the single most common '
    + 'error in advanced student writing.\n\n'
    + 'Not only does the right connector make the argument visible, it also makes it shorter. '
    + 'A paragraph that signals its structure does not need to explain its structure, and the sentences that were doing that work '
    + 'can be deleted.',
    [
      one('What was wrong with the weak paragraphs?', [
        'They contained grammatical mistakes.',
        'They were too short to make an argument.',
        'The sentences were correct but the connections between them were missing.',
        'They used too many advanced connectors.',
      ], 2),
      one('Why does "Although" not work in the place of "Despite"?', [
        'Although is informal and Despite is formal.',
        'Although is a conjunction and needs a clause; Despite is a preposition and needs a noun.',
        'Although can only be used at the start of a sentence.',
        'They are interchangeable and the writer is mistaken.',
      ], 1),
      one('What does the writer say the right connector also achieves?', [
        'It makes the paragraph longer and more detailed.',
        'It makes the writing sound more academic.',
        'It makes the argument shorter, because structure no longer has to be explained.',
        'It removes the need for evidence.',
      ], 2),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['Most of the weak paragraphs were grammatically correct.', 'T'],
        ['The although/despite mistake catches weak students more often than strong ones.', 'F'],
        ['The essays were written under exam conditions.', 'NG'],
      ]),
    ],
    { title: 'День 12 · чтение' },
  ),

  // ── День 13: интеграция, всё сразу ──
  'ensp-13': reading(
    'A WEEK THAT USED EVERYTHING\n\n'
    + 'By the time the inspection was announced, we had been running the new storage system for a term, '
    + 'which turned out to be exactly long enough for it to look established and not long enough for anyone to have tested it.\n\n'
    + 'The reagents stored under the new scheme were fine. It was the older stock, moved across in September and never re-labelled, '
    + 'that caused the problem. Had anyone checked it in October, the whole thing would have taken an afternoon. '
    + 'Nobody did, and I include myself; I had assumed, as usual, that the technician had looked.\n\n'
    + 'What the inspector said, and what got repeated afterwards, were not the same thing. She pointed out that the labelling was '
    + 'inconsistent and suggested re-auditing the older stock before the end of term. By Friday this had become a rumour that we were '
    + 'being made to re-audit everything, which is presumably how most rumours in schools begin.\n\n'
    + 'We got the older stock re-labelled over half term. It might have been done faster if we had put two people on it, '
    + 'but only one person could be spared, and she is the one who knows what the abbreviations mean. '
    + 'Given that nobody has written those abbreviations down anywhere, that is its own problem, and it is next term’s.\n\n'
    + 'All things considered, the week was useful. Not only did we end up with a stock list that somebody has actually seen, '
    + 'we also found out which of our systems exist mainly as a shared belief that they exist.',
    [
      one('What caused the problem during the inspection?', [
        'The reagents stored under the new scheme.',
        'The older stock, moved across in September and never re-labelled.',
        'The inspector’s misunderstanding of the system.',
        'A rumour that spread among the staff.',
      ], 1),
      one('"Had anyone checked it in October, the whole thing would have taken an afternoon." What does this mean?', [
        'Somebody did check it in October and it took an afternoon.',
        'Nobody checked it in October, and if they had, it would have been quick.',
        'Somebody will check it in October.',
        'It is unclear whether anybody checked it.',
      ], 1),
      one('What did the writer conclude the week was useful for?', [
        'Proving that the new storage system worked perfectly.',
        'Showing which systems exist mainly as a shared belief that they exist.',
        'Demonstrating that inspections are unnecessary.',
        'Establishing who was to blame for the labelling.',
      ], 1),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['The older stock was moved across in September and never re-labelled.', 'T'],
        ['The inspector ordered a re-audit of all the stock.', 'F'],
        ['The inspection result was reported to the head teacher.', 'NG'],
      ]),
    ],
    { title: 'День 13 · чтение' },
  ),

  // ── День 14: про сам процесс возвращения языка ──
  'ensp-14': reading(
    'GETTING IT BACK\n\n'
    + 'People who return to a language after a long gap usually describe the same experience, and it is not the one they expect. '
    + 'They expect to have forgotten words. What they find is that the words are still there and will not come out.\n\n'
    + 'This is a real distinction, not a comforting one. Recognition and production are stored and retrieved differently, '
    + 'and they decay at different rates. You can read a paragraph, understand every clause, and then be unable to build the same '
    + 'clause yourself thirty seconds later. Nothing has been lost; the path has simply stopped being used, '
    + 'and paths that are not used become slow before they become impassable.\n\n'
    + 'What this implies for study is unwelcome to most adults, because it rules out the pleasant activities. '
    + 'Reading more, watching more and revising grammar tables all strengthen recognition, which is the half that is already working. '
    + 'The half that has decayed is only rebuilt by production under pressure: translating into the language against a clock, '
    + 'writing without a dictionary, speaking without preparation time.\n\n'
    + 'It is uncomfortable, which is why people avoid it, and it works quickly, which is why it is worth the discomfort. '
    + 'Two weeks of retrieval will move a rusty B2 further than two months of comfortable input.\n\n'
    + 'One warning, for the first week in a classroom abroad. The gap between what you understand and what you can produce will be '
    + 'at its widest on day one, and it is easy to read that gap as evidence that you are worse than you thought. '
    + 'You are not. You are watching the two halves being unequal, which is exactly the thing you came to fix.',
    [
      one('What do returning learners usually find?', [
        'That they have forgotten most of the vocabulary.',
        'That the words are still there but will not come out.',
        'That grammar decays faster than vocabulary.',
        'That listening is the first skill to disappear.',
      ], 1),
      one('Why does the writer say reading and watching are not enough?', [
        'Because they take too much time.',
        'Because they strengthen recognition, which is the half that already works.',
        'Because the material is usually too difficult.',
        'Because they do not cover grammar systematically.',
      ], 1),
      one('What warning does the writer give about the first week abroad?', [
        'That you will understand almost nothing at native speed.',
        'That the gap between understanding and production is widest on day one and is not evidence of decline.',
        'That classroom courses rarely help returning learners.',
        'That you should avoid speaking until your grammar is secure.',
      ], 1),
      trueFalse('Верно, неверно или не указано? «Не указано» — это когда текст об этом молчит, а не отрицает.', [
        ['Recognition and production decay at different rates.', 'T'],
        ['Reading more is the fastest way to rebuild production.', 'F'],
        ['The writer has taught in a language school abroad.', 'NG'],
      ]),
    ],
    { title: 'День 14 · чтение' },
  ),
}
