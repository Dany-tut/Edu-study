// ─────────────────────────────────────────────────────────────────────────────
// Конспекты курса «Английский: от B2 к C1»
//
// Вынесены отдельно от структуры: englishAdvanced.ts отвечает за
// последовательность, словарь и задания, этот файл — за то, что ученик читает
// перед домашкой.
//
// ЧЕМ ЭТИ КОНСПЕКТЫ ОТЛИЧАЮТСЯ ОТ ШКОЛЬНОГО ОБЪЯСНЕНИЯ. На B2 человек уже
// строит верные предложения — и всё равно звучит не так. Причина почти всегда
// не в незнании формы, а в том, что форма выбрана без смысла: Past Simple там,
// где нужен Past Perfect; must там, где нужно may; голое существительное там,
// где нужен артикль. Поэтому каждый конспект устроен одинаково: правило →
// ГРАНИЦА правила (где оно перестаёт работать) → типичная ошибка
// русскоязычного, названная прямо, с русской фразой, из которой она растёт.
//
// ЮРИДИЧЕСКОЕ. Все тексты и примеры написаны с нуля; из учебников ничего не
// скопировано.
// ─────────────────────────────────────────────────────────────────────────────

/** Конспекты по shortId юнита. */
export const ENAC_THEORY: Record<string, string> = {
  'enac-01': `Рассказ о прошлом по-английски держится не на одном прошедшем времени, а на четырёх, и каждое отвечает за свою роль в сцене.

Past Simple — линия событий: что случилось, потом что случилось. The client called, we cancelled the release and went home. Именно оно двигает рассказ вперёд.

Past Continuous — фон, на котором событие происходит: I was reviewing the report when she called. Действие не закончено и не важно как целое, оно нужно как декорация. Отсюда же типичное начало анекдота: We were driving back from the airport and the engine just died.

Past Perfect — то, что случилось РАНЬШЕ точки рассказа: By the time we arrived, the meeting had finished. Ключевое: Past Perfect не значит «давно», он значит «до того момента, о котором идёт речь». Как только точка отсчёта в прошлом задана, всё, что ей предшествует, уходит в had done.

Past Perfect Continuous — длительность до той же точки: She had been working there for six years before the company was sold. Отвечает на «сколько времени к тому моменту», а не «что случилось».

ГРАНИЦА. Past Perfect не нужен там, где порядок и так ясен из слов after, before, then: After he finished, we left — законно и естественнее, чем had finished. Английский не любит грамматику ради грамматики: если хронология видна из союза, перфект избыточен.

ОШИБКА РУССКОЯЗЫЧНОГО. В русском одно прошедшее время, и мы честно переводим все четыре одинаково: «пришёл», «приходил». Поэтому весь рассказ выходит в Past Simple: I came home, the guests left already — вместо the guests had already left. Слушатель при этом не то чтобы не понимает; он теряет ПОРЯДОК событий и перестаёт следить за историей. Второе следствие той же привычки — Past Continuous там, где нужен Simple: I was working there for two years звучит как незаконченный фон, хотя вы имели в виду законченный период (I worked there for two years).

ПРОВЕРКА ПРИ ПЕРЕСКАЗЕ. Спросите себя о каждом глаголе: это шаг сюжета (Simple), декорация (Continuous), предыстория (Perfect) или счёт времени до момента (Perfect Continuous)?`,

  'enac-02': `Present Perfect Simple и Present Perfect Continuous — не «строгая» и «разговорная» версия одного времени. Они отвечают на разные вопросы: одно про РЕЗУЛЬТАТ, другое про ПРОЦЕСС.

I have written three reports — три отчёта есть, они готовы, их можно открыть. Важно сколько и что получилось.
I have been writing reports all morning — всё утро занят этим, отчёты, может, ещё не дописаны. Важно чем я был занят и как долго.

Отсюда прямое следствие: со счётом (three, twice, a lot of) идёт Simple, а с длительностью (for two hours, all day, since Monday) — обычно Continuous. She has read four books this month. She has been reading since breakfast.

ГЛАГОЛЫ, У КОТОРЫХ ВЫБОРА НЕТ. Состояния — know, believe, own, belong, contain, need — не ставятся в Continuous. Правильно I have known her for ten years, а не I have been knowing. Живое исключение: live, work, study и feel допускают обе формы почти без разницы смысла: I have lived here / I have been living here for five years.

ВИДИМЫЙ СЛЕД. Continuous часто выбирают, когда результат виден на человеке: Your hands are dirty — have you been fixing the bike? Simple здесь сказал бы про факт починки, а нужен именно след процесса.

ГРАНИЦА С PAST SIMPLE. Present Perfect любой формы несовместим с законченным временным отрезком: вчера, в 2019-м, на прошлой неделе. I have finished it yesterday — ошибка; I finished it yesterday. Перфект живёт в отрезке, который ещё не закрыт: today, this week, so far, ever, never.

ОШИБКА РУССКОЯЗЫЧНОГО. Русское «я живу здесь пять лет» — настоящее время, и рука сама пишет I live here for five years. По-английски это обязательно перфект: I have lived / have been living here for five years. Вторая ошибка — since с промежутком: since two years вместо for two years. Since указывает НАЧАЛО (since 2019, since Monday), for — ДЛИНУ (for two years).

ПРОВЕРКА. Если вопрос был «сколько сделано» — Simple. Если «чем занимался и как долго» — Continuous. Если у отрезка есть закрытая дата — вообще не перфект.`,

  'enac-03': `У английского нет одной формы будущего — есть выбор из пяти, и выбор этот про то, ОТКУДА взялось знание о будущем.

will — решение принято в момент речи или прогноз без опоры: Fine, I will call them. I think it will rain.
be going to — намерение, которое уже было до разговора, или прогноз по видимому признаку: We are going to redesign the whole flow (решили заранее). Look at those clouds — it is going to rain (вижу основание).
Present Continuous — договорённость с другими людьми, у которой есть время и место: I am meeting the team at six. Это самая частая форма планов в живой речи, и русскоязычные пользуются ей реже всего.
Present Simple — расписание, не зависящее от нас: The train leaves at 7:40. The course starts in September.
be to / be about to — официальное назначение и «вот-вот»: The minister is to visit the plant. She is about to leave.

ДВА ВРЕМЕНИ, КОТОРЫЕ ДЕЛАЮТ РЕЧЬ ВЗРОСЛОЙ.
Future Continuous — будет идти в определённый момент, а также вежливый вопрос о планах: This time tomorrow I will be flying to Lisbon. Will you be using the room after five? Второе употребление важнее: вопрос в Future Continuous не давит, он спрашивает о естественном ходе дел, тогда как Will you use the room звучит как просьба уступить.
Future Perfect — будет закончено К моменту: By the end of the quarter we will have hired six people. Обязательный маркер — by, by the time, before.
Future Perfect Continuous — длительность к моменту: By June I will have been working here for ten years.

ГРАНИЦА. После when, if, as soon as, until, before будущего не бывает: I will call you when I arrive (не when I will arrive). Это одно из самых устойчивых мест ошибки, потому что по-русски там ровно будущее: «когда приеду».

ОШИБКА РУССКОЯЗЫЧНОГО. Единственное русское будущее переводится в will всегда — и получается человек, который на всё отвечает I will. На вопрос What are you doing on Friday? ответ I will meet my friends звучит так, будто вы решили это только что, услышав вопрос. Договорённость требует I am meeting.

ПРОВЕРКА. Спросите: это уже решено (going to / Continuous), решается сейчас (will), стоит в расписании (Present Simple) или должно быть завершено к сроку (Future Perfect)?`,

  'enac-04': `Согласование времён — правило, из-за которого английское предложение выглядит «слишком прошедшим»: I did not know she was ill. По-русски мы говорим «я не знал, что она больна» — настоящим временем внутри.

ПРАВИЛО. Если главный глагол стоит в прошедшем (said, thought, knew, realised, explained), то зависимая часть сдвигается на шаг назад:
present → past: She is tired → I saw that she was tired.
past / present perfect → past perfect: He lost the key → I realised he had lost the key.
will → would, can → could, may → might, must → had to.
Past Perfect дальше не сдвигается: он и есть край.

КОГДА СДВИГА НЕ ДЕЛАЮТ. Три случая, и все живые.
1. Утверждение верно и сейчас: He said the office is closed on Sundays — оно закрыто по воскресеньям вообще, и настоящее уместно. Сдвиг здесь тоже не ошибка, но он слегка намекает, что вы за факт не отвечаете.
2. Общая истина: The guide explained that water boils at 100 degrees.
3. Главный глагол в настоящем: She says she is busy — сдвигать нечего.

МОДАЛЬНЫЕ БЕЗ ПАРЫ. would, could, should, might, ought to сдвигать некуда — они остаются как есть: He said he would help. He said he might be late.

ДИСТАНЦИЯ ВАЖНЕЕ ВРЕМЕНИ. Тот же сдвиг работает не только в косвенной речи. Прошедшая форма в английском регулярно означает не прошлое, а ОТДАЛЁННОСТЬ: вежливость (I was wondering if you could help), нереальность (If I had time), осторожность (I was hoping for a bit more). Поэтому юнит стоит перед косвенной речью и условными: дальше вы всё время будете видеть одно и то же движение назад во времени, а значить оно будет разное.

ОШИБКА РУССКОЯЗЫЧНОГО. Самая частая — I thought you are right вместо you were right. Вторая — обратный перегиб: выучив правило, человек сдвигает всё подряд, включая вечные истины, и получается He said that the Earth was round, что звучит как сомнение в форме Земли.

ПРОВЕРКА. Главный глагол в прошедшем? Тогда по умолчанию сдвиг. Не сдвигаю только если факт держится и сегодня — и я готов за него отвечать.`,

  'enac-05': `Косвенная речь — это не пересказ слово в слово, а перенос чужой фразы в свою систему координат. Двигаются три вещи сразу: время, лица и указатели на «здесь и сейчас».

ВРЕМЯ — по правилу согласования из прошлого юнита: am → was, did → had done, will → would, can → could.
ЛИЦА: "I will call you" → He said he would call me.
УКАЗАТЕЛИ: now → then, today → that day, tomorrow → the next day, yesterday → the day before, here → there, this → that, ago → before.

ВОПРОСЫ ТЕРЯЮТ ВОПРОСИТЕЛЬНЫЙ ПОРЯДОК. Это место, где ошибаются почти все. "Where do you live?" → She asked where I lived. Не where did I live и не where I do live: внутри косвенной речи стоит обычный порядок подлежащее-сказуемое, вспомогательный do исчезает, знака вопроса нет. Общий вопрос требует if или whether: "Are you coming?" → He asked if I was coming.

ПРОСЬБЫ И ПРИКАЗЫ — через инфинитив, а не через that: "Please wait" → She asked me to wait. "Do not touch it" → He told me not to touch it. Обратите внимание на пару say / tell: say не берёт адресата без to (he said to me), tell берёт обязательно (he told me).

ЧТО НЕ МЕНЯЕТСЯ. Если вы пересказываете сегодня то, что услышали час назад и что всё ещё в силе, указатели не двигают: He said he is arriving tomorrow — самолёт всё ещё завтра. Механическая замена на the next day тут исказит смысл.

ОШИБКА РУССКОЯЗЫЧНОГО. Русская косвенная речь почти ничего не меняет: «Он сказал, что придёт завтра» — то же слово «завтра», то же будущее. Поэтому по-английски выходит He said that he will come tomorrow. Отдельная беда — вопрос: «Он спросил, где я живу» переводится в He asked where do I live, и это слышно сразу, потому что вопросительный порядок в утверждении звучит для носителя как сбой.

ПРОВЕРКА. Перескажите фразу и пройдите по трём осям: время сдвинул? лица переставил? «завтра» и «здесь» пересчитал от своей точки?`,

  'enac-06': `Сказать He said that в каждом предложении — значит пересказать содержание и потерять поступок. Английский предпочитает глагол, который называет, ЧТО человек сделал словами: пообещал, отрицал, признал, настоял, предложил. Это и есть reporting verbs, и главная трудность в них не значение, а ПАТТЕРН — какая конструкция идёт следом.

Глагол + that: admit, deny, claim, insist, suggest, explain, complain, point out, warn.
Глагол + инфинитив: promise, refuse, offer, threaten, agree, claim.
Глагол + кого-то + инфинитив: advise, remind, warn, urge, encourage, persuade, invite.
Глагол + герундий: suggest, recommend, admit, deny, mention.
Глагол + предлог + герундий: apologise for, insist on, accuse someone of, congratulate someone on, blame someone for, object to, warn against.

ТРИ ГЛАГОЛА, НА КОТОРЫХ ЛОМАЮТСЯ ВСЕ.
suggest никогда не берёт человека с инфинитивом. Нельзя I suggested him to leave. Можно: I suggested leaving. I suggested that he leave. I suggested that he should leave.
recommend ведёт себя так же: She recommended booking early, а не recommended me to book.
insist требует on с герундием либо that с формой без окончания: He insisted on paying. He insisted that she stay.

СОСЛАГАТЕЛЬНОЕ ПОСЛЕ ЭТИХ ГЛАГОЛОВ. После suggest, recommend, insist, demand, propose, request в that-части стоит голая форма глагола независимо от лица: I demand that he apologise (не apologises). Формально это остаток сослагательного наклонения; практически — примета письменного и делового регистра.

ОШИБКА РУССКОЯЗЫЧНОГО. Русский строит почти всё через «предложил ему сделать» и «посоветовал мне пойти», и рука ставит инфинитив с лицом после каждого глагола. Отсюда He suggested me to go — фраза, которую носитель поймёт, но отметит как учебную. Вторая ошибка — глагол без нужного предлога: He accused me that I lied вместо He accused me of lying.

ПРОВЕРКА. Выбрав глагол, вспоминайте не перевод, а схему: что стоит справа — that, инфинитив, лицо с инфинитивом, герундий или предлог с герундием?`,

  'enac-07': `Условные предложения — это шкала уверенности, а не четыре несвязанных правила. Чем дальше форма уходит в прошедшее, тем менее реальным считается условие: это тот же приём дистанции, что и в юните про согласование времён.

Нулевой — закономерность, всегда истинная: If you heat water to 100 degrees, it boils. Обе части в настоящем; if здесь почти равно when.
Первый — реальное будущее: If we finish today, we will ship on Friday. Условие в настоящем, результат с will. Возможны модальные: we can ship, we may ship, we should ship.
Второй — гипотеза о настоящем и маловероятном будущем: If I had more time, I would rewrite it. Сдвиг в прошедшее означает не прошлое, а нереальность.
Третий — прошлое, которое уже не переиграть: If we had tested it, we would not have lost the client.

СМЕШАННЫЕ — самые нужные в реальной речи, потому что жизнь редко укладывается в один временной пласт.
Прошлое условие — настоящий результат: If I had accepted the offer, I would be living in Berlin now.
Настоящее условие — прошлый результат: If she were not so careful, she would have signed it without reading.

ТОНКОСТИ, КОТОРЫЕ СЛЫШНЫ.
were вместо was во всех лицах — признак письменного и осторожного регистра: If I were you. Разговорное If I was you тоже живёт, но в письме его лучше не ставить.
unless равно if not только в утверждении об условии-исключении: I will not sign unless they change the deadline.
would в части с if не ставится в стандартном письме: If you would tell me — это просьба, а не условие.
provided that, as long as, in case, otherwise расширяют набор: in case значит «на случай, если», а не «если»: Take an umbrella in case it rains — берём заранее, дождя может и не быть.

ОШИБКА РУССКОЯЗЫЧНОГО. Русское «бы» одинаково обслуживает и настоящее, и прошлое: «если бы я знал» может значить и то, и другое. Поэтому третий тип регулярно подменяется вторым: If I knew about it, I would not come вместо If I had known about it, I would not have come. Вторая ошибка — будущее после if: If it will rain вместо If it rains.

ПРОВЕРКА. Спросите себя: это правда всегда (нулевой), это может случиться (первый), это выдумка про сейчас (второй) или это уже не изменить (третий)?`,

  'enac-08': `Этот юнит про два способа отойти от реальности: убрать if и сказать вслух, чего не хватает.

ИНВЕРСИЯ ВМЕСТО IF. В письменном и в подчёркнуто аккуратном устном английском союз if выбрасывают, а вспомогательный глагол выносят вперёд:
Had I known about the deadline, I would have started earlier.
Were it not for your help, we would still be stuck.
Should you need anything, do not hesitate to call.
Работает это ровно с тремя формами — had, were, should, — и только с ними. Отрицание при инверсии не сокращается: Had we not agreed, а не Hadn't we agreed. Should-вариант вежлив и типичен для деловых писем; had-вариант принадлежит третьему условному; were-вариант — второму.

WISH И IF ONLY. Здесь прошедшая форма опять означает не прошлое, а сожаление.
О настоящем: I wish I had more time. I wish I were taller.
О прошлом: I wish I had said something at the meeting.
О чужом раздражающем поведении: I wish you would stop interrupting. Форма с would — это претензия к тому, что человек делает и может перестать; про себя так не говорят (нельзя I wish I would).
if only — то же самое, но эмоциональнее: If only we had left earlier.

ДРУГИЕ ФОРМЫ НЕРЕАЛЬНОГО ПРОШЕДШЕГО.
It is time we went home. It is high time you told her the truth — форма прошедшая, смысл «пора, а до сих пор не сделано».
I would rather you did not mention it — предпочтение относительно ЧУЖОГО действия требует прошедшего. Про своё действие идёт инфинитив без to: I would rather stay.
suppose и what if с прошедшим отодвигают предложение в область гипотезы: Suppose we moved the release?

ОШИБКА РУССКОЯЗЫЧНОГО. «Жаль, что я не знал» переводится как I wish I did not know, хотя нужно I wish I had known: русское «не» вшито в жалобу, а английский wish уже содержит отрицание смысла — форма после него переворачивается. Вторая ошибка — I wish I would. Третья — It is time we go вместо we went.

ПРОВЕРКА. После wish, if only, it is time и would rather about others рука должна тянуться на шаг назад по времени: настоящее — в past, прошлое — в past perfect.`,

  'enac-09': `Придаточные определительные — то место, где B2 отличается от C1 по одному признаку: умеет ли человек прицепить к существительному целое предложение, не потеряв запятых и предлога.

DEFINING — сужает и опознаёт. Без него непонятно, о ком речь: The designer who redesigned the checkout has left. Запятых нет. That допустим наравне с who и which; при дополнении местоимение можно вообще опустить: The report (that) you sent was very clear.

NON-DEFINING — добавляет справку о том, что и так опознано: Our head of design, who joined last year, is leaving. Запятые обязательны с обеих сторон, that здесь запрещён, опустить местоимение нельзя. Разница смыслов реальная: My brother who lives in Prague значит, что братьев несколько; My brother, who lives in Prague, — что он один.

ПРЕДЛОГ. Разговорный вариант оставляет предлог в конце: the person I told you about. Письменный поднимает его к местоимению: the person about whom I told you, the tool with which we measure it. Whom употребляется только после предлога и как дополнение; ставить whom подлежащим — ошибка гиперкоррекции.

WHICH О ЦЕЛОМ ПРЕДЛОЖЕНИИ. Отдельная конструкция, очень частая в письме: They cancelled the project, which surprised nobody. Здесь which указывает не на слово, а на всё сказанное; that так не умеет.

ЧЕЙ, ГДЕ, КОГДА. whose работает и с людьми, и с вещами: a company whose revenue tripled. where и when заменяют предлог с which: the town where I grew up = the town in which I grew up.

СВЁРНУТЫЕ ФОРМЫ. Если местоимение — подлежащее, его вместе с be можно убрать: the people (who are) waiting outside; the report (which was) written last week. Это мост к следующему юниту.

ОШИБКА РУССКОЯЗЫЧНОГО. Русское «который» одно на все случаи, поэтому: 1) which ставят к людям; 2) забывают запятые в non-defining и получают другой смысл; 3) дублируют местоимение — the book which I read it; 4) буквально переводят «в котором» и получают the room in that. Ещё одна привычка — вставлять what вместо which в значении «что»: They cancelled it, what surprised nobody — грубая ошибка.

ПРОВЕРКА. Уберите придаточное. Если предложение потеряло, о ком речь, — это defining и запятых нет. Если только справку — запятые обязательны.`,

  'enac-10': `Причастные обороты — главный инструмент экономии в английском письме. Там, где русский ставит второе предложение с союзом, английский часто ставит причастие без подлежащего вообще.

ПРИЧАСТИЕ НАСТОЯЩЕЕ (-ing) — своё действие, активное:
Working late, she missed the last train. (= Because she was working late.)
Having finished the audit, we moved on to the redesign. (= After we had finished — форма having done показывает, что это было раньше.)

ПРИЧАСТИЕ ПРОШЕДШЕЕ (-ed / третья форма) — пассивное, действие над подлежащим:
Written in 1974, the report still describes our problem. (= Although it was written.)
Given the deadline, we decided to cut the scope.

Оборот заменяет причину, время, условие и уступку — какое именно значение, читатель достраивает по смыслу. Если это рискованно, союз оставляют: While walking, When asked, Once completed.

СВЁРНУТЫЕ ОПРЕДЕЛИТЕЛЬНЫЕ. Тот же приём внутри именной группы: the woman standing by the door, the changes made last week, the issues discussed yesterday. Плотность письма растёт мгновенно.

ГЛАВНОЕ ОГРАНИЧЕНИЕ — DANGLING MODIFIER. У причастия нет своего подлежащего, поэтому оно автоматически цепляется к подлежащему главной части. Если они не совпадают, получается бессмыслица, часто смешная:
Walking down the street, the tower came into view. — Выходит, что башня шла по улице.
Having reviewed the file, the decision was postponed. — Решение ничего не рецензировало.
Лечение одно: либо поставьте нужное подлежащее в главную часть (Having reviewed the file, we postponed the decision), либо разверните оборот в полное придаточное (After we reviewed the file, the decision was postponed).

ЗАСТЫВШИЕ ОБОРОТЫ. Часть выражений законно нарушает правило и висит вне подлежащего: generally speaking, considering the circumstances, judging by the results, provided that. Их не считают ошибкой.

ОШИБКА РУССКОЯЗЫЧНОГО. В русском деепричастный оборот тоже требует общего подлежащего, но нарушают это правило все, и по-английски привычка переносится один в один. Вторая ошибка — путаница залога: Interested in the topic, I read it (я заинтересован) против Interesting the topic, где смысл ломается. Третья — оборот перед пассивом: он почти всегда даёт dangling.

ПРОВЕРКА. Прочитав оборот, задайте вопрос «кто это делал» и посмотрите на подлежащее главной части. Если ответ не оно — переписывайте.`,

  'enac-11': `Английский порядок слов жёсткий, и именно поэтому его нарушение — сильнейший способ выделить мысль. Здесь два приёма: инверсия и расщеплённое предложение.

ИНВЕРСИЯ ПОСЛЕ ОТРИЦАТЕЛЬНОГО НАЧАЛА. Если предложение начинается с отрицательного или ограничительного оборота, подлежащее и вспомогательный глагол меняются местами — как в вопросе:
Never before had we seen such a drop.
Not only did they miss the deadline, they also hid it.
Little did she know what was coming.
Rarely do we get a second chance.
Under no circumstances should you share the file.
No sooner had we launched than the server went down.
Only after the audit did the pattern become clear.
Если вспомогательного глагола нет, появляется do / does / did — ровно как в вопросе. Заметьте: Not only… (but) also требует инверсии только в первой части.

РАСЩЕПЛЕНИЕ (CLEFT). Второй способ — вытолкнуть важное в отдельную рамку.
It-cleft: It was the pricing page that caused the drop. Рамка It was X that позволяет выделить любой член предложения — подлежащее, дополнение, обстоятельство: It was in March that we noticed it.
Wh-cleft: What I need is a clear brief. What surprised me was the tone of the email. Слева стоит «упаковка», справа — новое.
All-cleft: All I did was ask a question. Обратите внимание на инфинитив без to после was.
The reason why / The thing that: The thing that worries me is the timeline.

ЗАЧЕМ ЭТО НУЖНО. В русском выделение делается интонацией и порядком слов: «Именно цена и напугала клиента». В английском переставлять слова свободно нельзя — их место определяет роль в предложении. Поэтому смысловое ударение оформляется конструкцией, и человек, который ими не владеет, звучит ровно и невыразительно, даже когда говорит грамматически чисто.

ОШИБКА РУССКОЯЗЫЧНОГО. Инверсию забывают: Not only they missed the deadline вместо did they miss. И наоборот, выучив приём, вставляют его в разговор через фразу — в устной речи это звучит книжно. Ещё одна ошибка — сокращение при инверсии: Never we had seen, Rarely we do.

ПРОВЕРКА. Начали предложение с never, rarely, little, seldom, hardly, no sooner, not only, only when, under no circumstances? Дальше обязан идти вопросительный порядок.`,

  'enac-12': `Связки — не украшение, а разметка мысли: они говорят читателю, что будет дальше — продолжение, поворот, следствие или пример. На C1 оценивают не количество связок, а точность и пунктуацию при них.

ПО ЗНАЧЕНИЮ.
Добавление: moreover, furthermore, in addition, what is more.
Противопоставление: however, nevertheless, nonetheless, on the contrary, whereas, while.
Следствие: therefore, consequently, as a result, hence, thus.
Уступка: although, even though, despite, in spite of, admittedly.
Пример: for instance, notably, in particular.
Итог: overall, on balance, in short.

ТРИ ГРАММАТИЧЕСКИХ КЛАССА, КОТОРЫЕ ПУТАЮТ ВСЕ.
1. Наречия связи (however, therefore, moreover, nevertheless) не соединяют предложения. Перед ними точка или точка с запятой, после — запятая: The data was clean; however, the sample was small. Написать The data was clean, however the sample was small — это comma splice, самая частая пунктуационная ошибка в письме на экзамене.
2. Союзы (although, while, whereas, because, since) вводят придаточное и живут внутри одного предложения: Although the sample was small, the trend was clear.
3. Предлоги (despite, in spite of, due to, because of) требуют СУЩЕСТВИТЕЛЬНОГО или герундия, а не предложения: despite the delay, despite being late — но не despite it was late. Чтобы поставить после них предложение, нужна подпорка: despite the fact that it was late.

ПУНКТУАЦИЯ ОСТАЛЬНОГО. Придаточное впереди — запятая (When the data arrived, we rebuilt the model); придаточное сзади — обычно без неё. Перед and, but, so, соединяющими два полноценных предложения, запятая ставится.

РЕГИСТР. Moreover и furthermore принадлежат письму; в разговоре они звучат как доклад. Устные эквиваленты — besides, plus, anyway, on top of that. Обратный перекос тоже слышен: эссе, сшитое из and so, but и also, читается как школьное.

ОШИБКА РУССКОЯЗЫЧНОГО. «Однако» в русском ставится где угодно и не требует точки, поэтому however повсеместно склеивает предложения запятой. Вторая ошибка — despite of, гибрид despite и in spite of. Третья — from my point of view в каждом абзаце вместо арсенала arguably, it seems, admittedly.

ПРОВЕРКА. К каждой связке задайте два вопроса: какое отношение я показываю — и что стоит справа, предложение или существительное?`,

  'enac-13': `Артикль — не украшение перед существительным, а сообщение о том, знает ли собеседник, о чём речь. Русскоязычные учат его как список исключений и потому ошибаются всю жизнь; проще держать в голове одну развилку.

РАЗВИЛКА. Существительное исчисляемое в единственном числе не может стоять голым — там обязательно артикль, притяжательное или указательное. Дальше вопрос один: собеседник понимает, о каком именно предмете речь?
Да — the: Where is the report I sent you? Открой the door.
Нет, это один из многих — a/an: I need a designer.
Множественное или неисчисляемое, речь о явлении вообще — нулевой артикль: Designers hate vague briefs. Water freezes at zero.

ЧТО ДЕЛАЕТ ПРЕДМЕТ ИЗВЕСТНЫМ. Он уже упоминался (I bought a lamp. The lamp is broken); он единственный в мире или в ситуации (the sun, the manager, the kitchen); его сузило определение (the changes we agreed on, the best option); он назван превосходной степенью или порядковым (the first attempt).

НУЛЕВОЙ АРТИКЛЬ СИСТЕМНО. Он не «отсутствие правила», а самостоятельный выбор: абстракции и вещества вообще (Time is money, Love is complicated), языки и учебные предметы (She teaches history), еда и приёмы пищи (before lunch), транспорт как способ (by train), большинство стран и городов (France, Berlin), учреждения по назначению (go to school, be in hospital, go to church — про роль, а не здание). Сравните: He is in hospital (лежит больным) и He is at the hospital (пришёл туда).

УСТОЙЧИВЫЕ ГРУППЫ С THE: the UK, the Netherlands, the Alps, the Thames, the Middle East, the police, the media, the same, the Internet, the twenties.

ГЕНЕРАЛИЗАЦИЯ ТРЕМЯ СПОСОБАМИ: Dogs are loyal (обычный способ), A dog is loyal (представитель класса), The dog is a social animal (научный, вид как таковой). Первый нейтрален и в письме встречается чаще.

ОШИБКА РУССКОЯЗЫЧНОГО. Артикли пропадают целыми абзацами: I am designer, I sent you report, in morning. Обратный перекос — the перед абстракциями: The life is hard, I like the music. Отдельная ловушка — работа и должность: I work as a project manager (с артиклем), но He was appointed head of design (без него, при назначении на единственную должность).

ПРОВЕРКА. Перед каждым существительным задайте два вопроса: оно исчисляемое в единственном числе — и знает ли собеседник, о каком именно предмете я говорю?`,

  'enac-14': `Исчисляемость — не свойство предмета, а свойство СЛОВА. По-русски «совет» считается («три совета»), по-английски advice — нет, и любое «трёх советов» превращается в three pieces of advice.

СПИСОК, КОТОРЫЙ НАДО ВЫУЧИТЬ ЦЕЛИКОМ. Неисчисляемые в английском и исчисляемые в русском: advice, information, news, knowledge, research, evidence, progress, luggage, furniture, equipment, software, money, work, homework, feedback, traffic, weather, accommodation. Все они не имеют множественного числа и не берут a/an: an information и informations — ошибки, которые слышно сразу.

КАК ИХ СЧИТАТЬ. Через порционное слово: a piece of advice, an item of furniture, a bit of information, two pieces of research, a job (вместо a work).

СЛОВА-ХАМЕЛЕОНЫ. Многие существительные живут в обоих режимах, и смысл меняется: paper (бумага) — a paper (статья, газета); experience (опыт) — an experience (случай из жизни); time (время) — three times (раза); room (место) — a room (комната); business (бизнес) — a business (компания); coffee (кофе) — two coffees (две чашки, в кафе).

КВАНТИФИКАТОРЫ ПО ТИПУ СЛОВА.
Только с исчисляемыми: many, few, a few, several, a number of, fewer.
Только с неисчисляемыми: much, little, a little, a great deal of, less, amount of.
С обоими: some, any, a lot of, plenty of, most, all, enough.
Разница few и a few принципиальна: few problems — почти нет проблем, тон отрицательный; a few problems — несколько, нейтрально. То же с little и a little.

РЕГИСТР. Much и many в утверждении звучат книжно: I have got a lot of work естественнее, чем much work. В вопросах и отрицаниях они нейтральны: Do you have much time?

СОГЛАСОВАНИЕ. News, mathematics, economics оканчиваются на -s, но глагол при них в единственном: The news is good. Police, people, staff — наоборот: The police are investigating.

ОШИБКА РУССКОЯЗЫЧНОГО. Самая частая — advices, informations, researches и I have many works. Вторая — less вместо fewer со счётными (less people вместо fewer people; в разговоре это стало нормой, но в письме отмечается). Третья — a lot of и many в одинаковом регистре без учёта стиля.

ПРОВЕРКА. Прежде чем поставить множественное число или a/an, спросите: это слово в английском вообще считается? Если нет — нужна порция.`,

  'enac-15': `Степени сравнения на C1 проверяются не формой comparative, а тем, умеет ли человек показать РАЗМЕР разницы. Сравнение без модификатора — это половина мысли.

БАЗА. Короткие слова берут -er / -est (faster, the fastest), длинные — more / the most (more reliable). Двусложные на -y дают happier. Неправильные: good – better – best, bad – worse – worst, far – further/farther, little – less – least.

МОДИФИКАТОРЫ — ГЛАВНОЕ В ЮНИТЕ.
Большая разница: far more expensive, much better, a lot cheaper, considerably slower, significantly higher, vastly more complex.
Маленькая: slightly cheaper, a bit slower, marginally better, somewhat higher.
Никакой: no better than, hardly any faster.
Перед превосходной степенью: by far the best, easily the worst, the single most important factor.
Заметьте: very с comparative не сочетается — нельзя very better; и much с прилагательным без сравнения тоже: much good — ошибка.

РАВЕНСТВО И КРАТНОСТЬ. as fast as, not as expensive as, twice as long as, three times as much, half as big. Кратность ставится ПЕРЕД as: twice as long, а не as twice long.

ПАРАЛЛЕЛЬНОЕ УСИЛЕНИЕ. The more you test, the fewer surprises you get. The sooner, the better. Конструкция требует the в обеих частях и порядка «сравнительная степень — подлежащее — сказуемое».

НАРАСТАНИЕ. It is getting harder and harder. Prices are becoming more and more unpredictable.

ЧТО СРАВНИВАЕМ С ЧЕМ. Английский требует симметрии: The salary here is higher than in my last job, а не higher than my last job (иначе зарплату сравниваем с работой). Другая опора — than that of / than those of: The design of this app is cleaner than that of its competitor.

ОШИБКА РУССКОЯЗЫЧНОГО. 1) Двойное сравнение: more better, more easier. 2) Пропуск than: This one is more expensive, потому что по-русски «дороже» самодостаточно. 3) Then вместо than — на письме это заметно всем. 4) Дословный перевод «в два раза больше» как in two times more вместо twice as much / twice as many.

ПРОВЕРКА. Сказали comparative — сразу спросите себя: насколько именно и по сравнению с чем? Если модификатора и than нет, сравнение неполное.`,

  'enac-16': `Управляющие предлоги — та часть языка, где логики почти нет, а цена ошибки высокая: неверный предлог мгновенно выдаёт неносителя, даже если всё остальное безупречно. Их учат не правилами, а группами.

ПРИЛАГАТЕЛЬНОЕ + ПРЕДЛОГ. afraid of, aware of, capable of, keen on, dependent on, responsible for, famous for, similar to, opposed to, interested in, involved in, good at, bad at, surprised at/by, worried about, concerned about, satisfied with, familiar with, different from (в британском также different to).

ГЛАГОЛ + ПРЕДЛОГ. depend on, insist on, rely on, concentrate on, apologise for, apply for, account for, believe in, succeed in, result in, deal with, cope with, agree with someone / agree to something, object to, refer to, contribute to, lead to, consist of, approve of, accuse of, benefit from, suffer from, prevent from, blame someone for.

СУЩЕСТВИТЕЛЬНОЕ + ПРЕДЛОГ. reason for, solution to, answer to, approach to, attitude to/towards, effect on, impact on, increase in, decrease in, demand for, need for, lack of, advantage of, difficulty in, interest in, relationship with.

ПОСЛЕ ПРЕДЛОГА — ГЕРУНДИЙ. Это правило без исключений: after finishing, instead of waiting, in spite of knowing, we look forward to hearing from you. Последний оборот сбивает всех: to здесь предлог, а не частица инфинитива, поэтому идёт hearing, а не hear. Так же ведут себя be used to doing, get used to doing, object to doing, be committed to doing.

ГЛАГОЛЫ, КОТОРЫМ ПРЕДЛОГ НЕ НУЖЕН. discuss something, enter a room, approach a problem, answer a question, marry someone, phone someone, lack something, affect something. Русский требует предлога («обсуждать О чём-то», «войти В комнату»), английский — нет: discuss about и enter into the room — типичные наведённые ошибки.

ПАРЫ, МЕНЯЮЩИЕ СМЫСЛ. agree with (согласен с человеком) / agree to (согласиться на условие); consist of (состоять из) / consist in (заключаться в); result in (привести к) / result from (быть следствием); afraid of (боюсь чего-то) / afraid for (боюсь за кого-то).

ОШИБКА РУССКОЯЗЫЧНОГО. Предлог подставляется по русскому образцу: depend from (от), interested with, married with, on the picture вместо in the picture, in the street против американского on the street.

ПРОВЕРКА. Учите не слово, а пару целиком и записывайте её всегда с примером — так же, как учили бы одно слово.`,
}
