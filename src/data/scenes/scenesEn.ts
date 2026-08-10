// ─────────────────────────────────────────────────────────────────────────────
// Сцены на английском
//
// ТЕКСТЫ С ПОМЕТКОЙ textOrigin: 'verbatim' — ПОДЛИННЫЕ, БУКВА В БУКВУ.
// Взяты из Project Gutenberg (общественное достояние, см. `source` у
// произведения в ./index.ts) и не редактировались: ни орфография, ни пунктуация,
// ни разбивка на абзацы. Править классику «под уровень» нельзя — тогда это
// перестаёт быть тем, ради чего её открывали.
//
// ПРО ПОЛЕ translation. У русской классики перевод здесь — НЕ авторский русский
// текст Достоевского или Чехова, а точный перевод того английского, который
// читает ученик. Это сделано намеренно: перевод нужен, чтобы проверить, верно ли
// понята английская фраза, а подлинный русский оригинал местами устроен иначе,
// и сверять по нему — значит сверять не то. Ссылка на оригинал есть в карточке.
//
// ТЕКСТЫ С ПОМЕТКОЙ 'ours' написаны нами. Они берут у произведения тему,
// регистр и лексику — и ничего больше: ни строки автора, ни его персонажей.
// Почему так, подробно в шапке ./index.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { Scene } from './index'

export const EN_SCENES: Scene[] = [
  // ── Достоевский, «Белые ночи» ──────────────────────────────────────────────
  {
    id: 'sc-wn-1',
    workId: 'dost-white-nights',
    lang: 'en', title: 'Весь Петербург уехал на дачи', level: 'B2', minutes: 4,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Ночь первая, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Dostoevsky, White Nights · пер. Constance Garnett · Project Gutenberg',
    setup: 'Рассказчик — молодой человек без имени, восемь лет живущий в Петербурге и не завёдший там ни одного знакомого. Наступило лето, город разъехался по дачам, и он остался один. Отсюда начинается вся повесть: человек, который знает город лучше, чем людей.',
    after: 'В эту же ночь, возвращаясь домой по набережной, он увидит у перил плачущую девушку — и заговорит с ней. Это будет первый живой разговор за все восемь лет.',
    body: `It was a wonderful night, such a night as is only possible when we are young, dear reader. The sky was so starry, so bright that, looking at it, one could not help asking oneself whether ill-humoured and capricious people could live under such a sky. That is a youthful question too, dear reader, very youthful, but may the Lord put it more frequently into your heart!... Speaking of capricious and ill-humoured people, I cannot help recalling my moral condition all that day. From early morning I had been oppressed by a strange despondency. It suddenly seemed to me that I was lonely, that every one was forsaking me and going away from me. Of course, any one is entitled to ask who "every one" was. For though I had been living almost eight years in Petersburg I had hardly an acquaintance. But what did I want with acquaintances? I was acquainted with all Petersburg as it was; that was why I felt as though they were all deserting me when all Petersburg packed up and went to its summer villa. I felt afraid of being left alone, and for three whole days I wandered about the town in profound dejection, not knowing what to do with myself. Whether I walked in the Nevsky, went to the Gardens or sauntered on the embankment, there was not one face of those I had been accustomed to meet at the same time and place all the year. They, of course, do not know me, but I know them. I know them intimately, I have almost made a study of their faces, and am delighted when they are gay, and downcast when they are under a cloud.`,
    translation: `Это была чудесная ночь, такая ночь, какая возможна только тогда, когда мы молоды, дорогой читатель. Небо было такое звёздное, такое ясное, что, глядя на него, невольно спрашиваешь себя: неужели под таким небом могут жить сердитые и капризные люди? Это тоже юношеский вопрос, дорогой читатель, очень юношеский, но пусть Господь почаще вкладывает его вам в сердце!.. Кстати о капризных и сердитых людях: я не могу не вспомнить своё душевное состояние в тот день. С самого утра меня давила странная тоска. Мне вдруг показалось, что я одинок, что все меня оставляют и уходят от меня. Конечно, всякий вправе спросить, кто были эти «все». Ведь, прожив в Петербурге почти восемь лет, я едва ли завёл хоть одно знакомство. Но зачем мне были знакомства? Я и без того был знаком со всем Петербургом; вот почему мне и казалось, что все меня покидают, когда весь Петербург собрался и уехал на дачу. Мне стало страшно остаться одному, и целых три дня я бродил по городу в глубоком унынии, не зная, куда себя деть. Шёл ли я по Невскому, отправлялся ли в Сад или брёл по набережной — не было ни одного из тех лиц, которые я привык встречать круглый год в одно и то же время и в одном и том же месте. Они, разумеется, меня не знают, но я знаю их. Я знаю их близко, я почти изучил их лица, и мне радостно, когда они веселы, и грустно, когда на них тень.`,
    glossary: [
      { term: 'ill-humoured', ru: 'сердитый, не в духе' },
      { term: 'capricious', ru: 'капризный, взбалмошный' },
      { term: 'despondency', ru: 'уныние, подавленность' },
      { term: 'to forsake', ru: 'покидать, оставлять' },
      { term: 'acquaintance', ru: 'знакомый; знакомство' },
      { term: 'dejection', ru: 'подавленность, тоска' },
      { term: 'to saunter', ru: 'брести не спеша, прогуливаться' },
      { term: 'under a cloud', ru: 'в тяжёлом настроении, не в духе' },
    ],
    questions: [
      {
        q: 'Why does the narrator feel that everyone is leaving him?',
        options: [
          'His friends have quarrelled with him',
          'The whole city has left for its summer houses',
          'He is moving to another town',
          'He has lost his job',
        ],
        correct: 1,
        why: '«All Petersburg packed up and went to its summer villa» — уезжает не кто-то конкретный, а весь город на лето.',
      },
      {
        q: 'How many acquaintances does he actually have in Petersburg?',
        options: ['Almost none', 'A few close friends', 'Very many', 'Only one old man'],
        correct: 0,
        why: '«I had hardly an acquaintance» — hardly здесь значит «почти не», а не «трудно».',
      },
      {
        q: 'What does he mean by saying he knows all Petersburg?',
        options: [
          'He knows the streets and the faces he meets, not the people themselves',
          'He is personally introduced to everyone',
          'He works for the city administration',
          'He has read a lot about the city',
        ],
        correct: 0,
        why: 'Ключ в конце: «They, of course, do not know me, but I know them». Знакомство одностороннее — он их разглядывает.',
      },
      {
        q: 'In "there was not one face of those I had been accustomed to meet", what does "accustomed to" mean?',
        options: ['forced to', 'used to, in the habit of', 'afraid to', 'allowed to'],
        correct: 1,
        why: 'To be accustomed to doing something — «иметь привычку». Формально это то же, что used to, но звучит книжнее.',
      },
    ],
  },
  {
    id: 'sc-wn-2',
    workId: 'dost-white-nights',
    lang: 'en', title: 'Он здоровается с домами', level: 'B2', minutes: 2,
    topic: 'Дом и город', skill: 'Чтение',
    order: 2, where: 'Ночь первая', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Dostoevsky, White Nights · пер. Constance Garnett · Project Gutenberg',
    setup: 'Продолжение той же страницы. Рассказчик уже объяснил, что знаком со всем городом, но ни с кем не знаком лично. Теперь он объясняет это буквально — и становится понятно, что перед нами не грустный человек, а человек с очень своеобразным устройством головы.',
    body: `I know the houses too. As I walk along they seem to run forward in the streets to look out at me from every window, and almost to say: "Good-morning! How do you do? I am quite well, thank God, and I am to have a new storey in May," or, "How are you? I am being redecorated to-morrow;" or, "I was almost burnt down and had such a fright," and so on. I have my favourites among them, some are dear friends; one of them intends to be treated by the architect this summer. I shall go every day on purpose to see that the operation is not a failure. God forbid!`,
    translation: `Дома я тоже знаю. Когда я иду, они словно выбегают вперёд по улице, выглядывают на меня из каждого окна и чуть ли не говорят: «Доброе утро! Как поживаете? Я, слава богу, здоров, а в мае мне надстроят этаж» — или: «Как вы? Меня завтра ремонтируют» — или: «Я чуть не сгорел и очень испугался», и так далее. Есть у меня среди них любимцы, некоторые — близкие друзья; один из них собирается этим летом лечиться у архитектора. Я буду ходить каждый день нарочно, чтобы посмотреть, что операция прошла удачно. Не приведи господь!`,
    glossary: [
      { term: 'storey', ru: 'этаж (британское написание; в США — story)' },
      { term: 'to redecorate', ru: 'делать ремонт, переклеивать обои' },
      { term: 'fright', ru: 'испуг' },
      { term: 'on purpose', ru: 'нарочно, специально' },
      { term: 'God forbid', ru: 'не приведи господь, упаси боже' },
    ],
    questions: [
      {
        q: 'What does the narrator do with the houses?',
        options: [
          'He talks to them as if they were people',
          'He photographs them',
          'He buys and sells them',
          'He repairs them',
        ],
        correct: 0,
      },
      {
        q: 'What is going to happen to one of his "dear friends" this summer?',
        options: [
          'It will be pulled down',
          'It will be rebuilt by an architect',
          'It will be sold',
          'It will be painted pink',
        ],
        correct: 1,
        why: '«Intends to be treated by the architect» — «собирается лечиться у архитектора», то есть его будут перестраивать. Достоевский тянет медицинскую метафору до конца: дальше идёт operation.',
      },
      {
        q: 'Why does he say "God forbid!"?',
        options: [
          'He is afraid the rebuilding will go badly',
          'He does not believe in architects',
          'He is angry at the city',
          'He is joking about religion',
        ],
        correct: 0,
      },
    ],
  },

  // ── Достоевский, «Идиот» ───────────────────────────────────────────────────
  {
    id: 'sc-idiot-1',
    workId: 'dost-idiot',
    lang: 'en', title: 'Вагон третьего класса', level: 'B2', minutes: 4,
    topic: 'Путешествия', skill: 'Чтение',
    order: 1, where: 'Часть 1, глава 1', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Dostoevsky, The Idiot · пер. Eva Martin · Project Gutenberg',
    setup: 'Первая страница романа. Ноябрьский поезд идёт в Петербург, в третьем классе друг напротив друга оказываются двое: князь Мышкин, возвращающийся из швейцарской лечебницы, и Рогожин. Достоевский сводит их случайно — и на этой случайности держится весь роман.',
    after: 'Через несколько минут они заговорят, и Рогожин расскажет попутчику о женщине по имени Настасья Филипповна. С этого разговора начнётся всё остальное.',
    body: `Towards the end of November, during a thaw, at nine o'clock one morning, a train on the Warsaw and Petersburg railway was approaching the latter city at full speed. The morning was so damp and misty that it was only with great difficulty that the day succeeded in breaking; and it was impossible to distinguish anything more than a few yards away from the carriage windows.

Some of the passengers by this particular train were returning from abroad; but the third-class carriages were the best filled, chiefly with insignificant persons of various occupations and degrees, picked up at the different stations nearer town. All of them seemed weary, and most of them had sleepy eyes and a shivering expression, while their complexions generally appeared to have taken on the colour of the fog outside.

When day dawned, two passengers in one of the third-class carriages found themselves opposite each other. Both were young fellows, both were rather poorly dressed, both had remarkable faces, and both were evidently anxious to start a conversation. If they had but known why, at this particular moment, they were both remarkable persons, they would undoubtedly have wondered at the strange chance which had set them down opposite to one another in a third-class carriage of the Warsaw Railway Company.`,
    translation: `В конце ноября, в оттепель, часов в девять утра поезд Петербургско-Варшавской дороги на всех парах подходил к Петербургу. Было так сыро и туманно, что рассвело с большим трудом; в десяти шагах от окон вагона трудно было разглядеть хоть что-нибудь.

Некоторые из пассажиров возвращались из-за границы; но более всего были наполнены вагоны третьего класса, и всё людом мелким, деловым, не из очень далёка, подобравшимся на ближайших станциях. Все были утомлены, у всех отяжелели за ночь глаза, все назяблись, все лица были бледно-жёлтые, под цвет тумана.

Когда рассвело, в одном из вагонов третьего класса оказались друг против друга два пассажира. Оба были молодые люди, оба довольно бедно одетые, оба с примечательными лицами, и оба явно хотели заговорить. Если бы они только знали, чем именно в эту минуту оба они примечательны, они наверняка подивились бы странному случаю, посадившему их друг против друга в вагоне третьего класса Варшавской железной дороги.`,
    glossary: [
      { term: 'thaw', ru: 'оттепель' },
      { term: 'damp', ru: 'сырой, влажный' },
      { term: 'to distinguish', ru: 'различить, разглядеть' },
      { term: 'carriage', ru: 'вагон (брит.); в США — car' },
      { term: 'weary', ru: 'усталый, измотанный' },
      { term: 'complexion', ru: 'цвет лица' },
      { term: 'to dawn', ru: 'светать' },
      { term: 'anxious to do something', ru: 'очень хотеть что-то сделать' },
    ],
    questions: [
      {
        q: 'What was the weather like that morning?',
        options: ['Frosty and clear', 'Damp, misty and thawing', 'Hot and dry', 'Windy with snow'],
        correct: 1,
      },
      {
        q: 'Who mostly filled the third-class carriages?',
        options: [
          'Rich travellers returning from abroad',
          'Soldiers',
          'Ordinary people picked up at nearby stations',
          'Railway workers',
        ],
        correct: 2,
        why: '«Insignificant persons of various occupations and degrees, picked up at the different stations nearer town».',
      },
      {
        q: 'What does "both were evidently anxious to start a conversation" mean here?',
        options: [
          'Both were worried about talking',
          'Both clearly wanted to talk',
          'Both were forbidden to talk',
          'Both were too shy to talk',
        ],
        correct: 1,
        why: 'Anxious to do something — «не терпится сделать», а не «тревожиться». Значение «тревожный» у anxious появляется без to + инфинитива: anxious about something.',
      },
      {
        q: 'Why would the two passengers have been surprised at the chance that seated them together?',
        options: [
          'Because they were relatives',
          'Because each of them was, at that moment, a remarkable person',
          'Because the carriage was empty',
          'Because they had bought tickets for another train',
        ],
        correct: 1,
      },
    ],
  },

  // ── Чехов ──────────────────────────────────────────────────────────────────
  {
    id: 'sc-lady-1',
    workId: 'chekhov-lady-dog',
    lang: 'en', title: 'Новое лицо на набережной', level: 'B1', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Глава I, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Chekhov, The Lady with the Dog · пер. Constance Garnett · Project Gutenberg',
    setup: 'Ялта, курортный сезон. Гуров отдыхает уже две недели, скучает и присматривается к приезжим. Чехов за полстраницы успевает показать и женщину, и всё, что нужно знать о самом Гурове, — почти ничего при этом не объясняя напрямую.',
    after: 'Через несколько дней Гуров познакомится с ней в саду. Он уверен, что это обычный курортный роман, который кончится вместе с отпуском. Роман не кончится.',
    body: `It was said that a new person had appeared on the sea-front: a lady with a little dog. Dmitri Dmitritch Gurov, who had by then been a fortnight at Yalta, and so was fairly at home there, had begun to take an interest in new arrivals. Sitting in Verney's pavilion, he saw, walking on the sea-front, a fair-haired young lady of medium height, wearing a béret; a white Pomeranian dog was running behind her.

And afterwards he met her in the public gardens and in the square several times a day. She was walking alone, always wearing the same béret, and always with the same white dog; no one knew who she was, and every one called her simply "the lady with the dog."

"If she is here alone without a husband or friends, it wouldn't be amiss to make her acquaintance," Gurov reflected.

He was under forty, but he had a daughter already twelve years old, and two sons at school. He had been married young, when he was a student in his second year, and by now his wife seemed half as old again as he. She was a tall, erect woman with dark eyebrows, staid and dignified, and, as she said of herself, intellectual.`,
    translation: `Говорили, что на набережной появилось новое лицо: дама с собачкой. Дмитрий Дмитрич Гуров, проживший в Ялте уже две недели и потому вполне освоившийся, начал интересоваться новыми лицами. Сидя в павильоне у Верне, он увидел, как по набережной идёт молодая светловолосая дама среднего роста, в берете; за нею бежал белый шпиц.

А потом он встречал её в городском саду и на сквере по нескольку раз в день. Она гуляла одна, всё в том же берете и всё с тем же белым шпицем; никто не знал, кто она, и все звали её просто «дама с собачкой».

«Если она здесь без мужа и без знакомых, — рассуждал Гуров, — то было бы не лишним познакомиться».

Ему не было ещё сорока, но у него уже была дочь двенадцати лет и двое сыновей-гимназистов. Его женили рано, когда он был студентом второго курса, и теперь жена казалась в полтора раза старше его. Это была высокая прямая женщина с тёмными бровями, степенная, важная и, как она сама себя называла, мыслящая.`,
    glossary: [
      { term: 'sea-front', ru: 'набережная' },
      { term: 'a fortnight', ru: 'две недели (брит.)' },
      { term: 'to be at home somewhere', ru: 'освоиться, чувствовать себя как дома' },
      { term: 'fair-haired', ru: 'светловолосый' },
      { term: 'it wouldn’t be amiss', ru: 'было бы не лишним' },
      { term: 'to reflect', ru: 'размышлять, рассуждать про себя' },
      { term: 'erect', ru: 'прямой, с прямой осанкой' },
      { term: 'staid', ru: 'степенный, чинный' },
    ],
    questions: [
      {
        q: 'How long has Gurov been in Yalta?',
        options: ['Two days', 'Two weeks', 'Two months', 'All summer'],
        correct: 1,
        why: 'A fortnight = fourteen nights = две недели. Слово британское и в американских текстах почти не встречается.',
      },
      {
        q: 'Why is the lady called simply "the lady with the dog"?',
        options: [
          'That is her surname',
          'Nobody knows who she is',
          'She introduced herself that way',
          'The dog is famous',
        ],
        correct: 1,
      },
      {
        q: 'What do we learn about Gurov before he even speaks to her?',
        options: [
          'He is single and lonely',
          'He is married with three children and thinks his wife is much older',
          'He is a doctor on holiday',
          'He lives in Yalta permanently',
        ],
        correct: 1,
        why: 'Чехов ставит эти сведения сразу за фразой «было бы не лишним познакомиться» — и ничего не комментирует. Соседство и есть комментарий.',
      },
      {
        q: '"His wife seemed half as old again as he" means she seemed…',
        options: [
          'half his age',
          'one and a half times his age',
          'exactly his age',
          'twice his age',
        ],
        correct: 1,
        why: 'Half as old again = «в полтора раза старше». Конструкция редкая и обманчивая: half тянет к «половине», а речь о полутора.',
      },
    ],
  },

  // ── Достоевский, «Братья Карамазовы» ───────────────────────────────────────
  {
    id: 'sc-karamazov-1',
    workId: 'dost-karamazov',
    lang: 'en', title: 'Отец семейства', level: 'B2', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Часть 1, книга 1, глава 1', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Dostoevsky, The Brothers Karamazov · пер. Constance Garnett · Project Gutenberg',
    setup: 'Первые строки романа. Рассказчик — не автор, а безымянный житель городка — начинает не с убийства и не с сыновей, а с характеристики отца. И сразу проговаривается, что тот погибнет: детектив, в котором жертву называют на первой странице.',
    after: 'Дальше выяснится, что у каждого из трёх сыновей был свой повод желать отцу смерти, и что четвёртый сын, о котором в этой главе ещё не сказано, живёт в том же доме прислугой.',
    body: `Alexey Fyodorovitch Karamazov was the third son of Fyodor Pavlovitch Karamazov, a land owner well known in our district in his own day, and still remembered among us owing to his gloomy and tragic death, which happened thirteen years ago, and which I shall describe in its proper place. For the present I will only say that this "landowner"—for so we used to call him, although he hardly spent a day of his life on his own estate—was a strange type, yet one pretty frequently to be met with, a type abject and vicious and at the same time senseless. But he was one of those senseless persons who are very well capable of looking after their worldly affairs, and, apparently, after nothing else. Fyodor Pavlovitch, for instance, began with next to nothing; his estate was of the smallest; he ran to dine at other men's tables, and fastened on them as a toady, yet at his death it appeared that he had a hundred thousand roubles in hard cash. At the same time, he was all his life one of the most senseless, fantastical fellows in the whole district. I repeat, it was not stupidity—the majority of these fantastical fellows are shrewd and intelligent enough—but just senselessness, and a peculiar national form of it.`,
    translation: `Алексей Фёдорович Карамазов был третьим сыном помещика нашего уезда Фёдора Павловича Карамазова, столь известного в своё время и до сих пор у нас памятного по мрачной и трагической смерти, случившейся ровно тринадцать лет назад и о которой я расскажу в своём месте. Пока же скажу лишь, что этот «помещик» — так мы его называли, хотя он почти ни дня в жизни не прожил в своём имении — был странным типом, каких, однако, встречается довольно часто: типом дрянным и порочным и в то же время бестолковым. Но он принадлежал к тем бестолковым людям, которые отлично умеют обделывать свои денежные делишки — и, кажется, только их. Фёдор Павлович, например, начинал почти ни с чем; имение у него было самое маленькое; он бегал обедать по чужим столам и напрашивался в приживальщики, — а после смерти его оказалось, что у него сто тысяч рублей чистыми деньгами. И при этом он всю жизнь оставался одним из самых бестолковых сумасбродов во всём уезде. Повторяю: это была не глупость — большинство таких сумасбродов довольно хитры и неглупы, — а именно бестолковость, и притом особого, нашего склада.`,
    glossary: [
      { term: 'estate', ru: 'имение, поместье' },
      { term: 'abject', ru: 'жалкий, ничтожный' },
      { term: 'vicious', ru: 'порочный (не «жестокий»)' },
      { term: 'senseless', ru: 'бестолковый, безрассудный' },
      { term: 'worldly affairs', ru: 'мирские, денежные дела' },
      { term: 'next to nothing', ru: 'почти ничего' },
      { term: 'toady', ru: 'подхалим, приживальщик' },
      { term: 'shrewd', ru: 'хитрый, себе на уме' },
    ],
    questions: [
      {
        q: 'How is Fyodor Pavlovitch still remembered in the district?',
        options: [
          'For his charity',
          'For his gloomy and tragic death',
          'For his estate',
          'For his three sons',
        ],
        correct: 1,
      },
      {
        q: 'Why is the word "landowner" in quotation marks?',
        options: [
          'It is a foreign word',
          'Because he hardly ever lived on his own estate',
          'Because he was not really rich',
          'It is the name of his house',
        ],
        correct: 1,
        why: 'Рассказчик тут же объясняет кавычки: «although he hardly spent a day of his life on his own estate». Титул есть, содержания за ним нет.',
      },
      {
        q: 'What is the contradiction the narrator insists on?',
        options: [
          'He was senseless, yet very good at making money',
          'He was poor, yet generous',
          'He was clever, yet uneducated',
          'He was quiet, yet feared',
        ],
        correct: 0,
      },
      {
        q: 'What does "he ran to dine at other men\'s tables" tell us about him?',
        options: [
          'He was a cook',
          'He lived off other people’s hospitality',
          'He owned restaurants',
          'He travelled a lot',
        ],
        correct: 1,
      },
    ],
  },

  // ── Гоголь, «Шинель» ───────────────────────────────────────────────────────
  {
    id: 'sc-mantle-1',
    workId: 'gogol-mantle',
    lang: 'en', title: 'В некотором департаменте', level: 'B1', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Начало повести', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Gogol, The Mantle · пер. Claud Field · Project Gutenberg',
    setup: 'Повесть начинается с того, что рассказчик отказывается называть ведомство, в котором всё происходит, — и тратит на объяснение этого отказа полстраницы. Так Гоголь с первых строк даёт понять, о какой именно стране идёт речь.',
    after: 'Дальше выяснится, что у героя есть только одна цель в жизни — накопить на новую шинель. И что, когда он её наконец сошьёт, её отнимут в первый же вечер.',
    body: `In a certain Russian ministerial department----

But it is perhaps better that I do not mention which department it was. There are in the whole of Russia no persons more sensitive than Government officials. Each of them believes if he is annoyed in any way, that the whole official class is insulted in his person.

Recently an Isprawnik (country magistrate)—I do not know of which town—is said to have drawn up a report with the object of showing that, ignoring Government orders, people were speaking of Isprawniks in terms of contempt. In order to prove his assertions, he forwarded with his report a bulky work of fiction, in which on about every tenth page an Isprawnik appeared generally in a drunken condition.

In order therefore to avoid any unpleasantness, I will not definitely indicate the department in which the scene of my story is laid, and will rather say "in a certain chancellery."

Well, in a certain chancellery there was a certain man who, as I cannot deny, was not of an attractive appearance. He was short, had a face marked with smallpox, was rather bald in front, and his forehead and cheeks were deeply lined with furrows—to say nothing of other physical imperfections.`,
    translation: `В некотором российском министерском департаменте…

Но, пожалуй, лучше я не буду называть, в каком именно департаменте. Нет во всей России людей обидчивее чиновников. Каждый из них убеждён, что если задели чем-нибудь его, то в его лице оскорблено всё чиновничье сословие.

Недавно один исправник (уездный судья) — не знаю уж какого города — будто бы составил доклад с целью показать, что вопреки распоряжениям правительства об исправниках отзываются с презрением. В доказательство он приложил к докладу увесистое сочинение, где примерно на каждой десятой странице появляется исправник, и обыкновенно в пьяном виде.

Итак, чтобы избежать неприятностей, я не стану точно указывать департамент, в котором происходит моя история, а скажу лучше — «в некоторой канцелярии».

Так вот, в некоторой канцелярии служил некоторый человек, наружности, надо признаться, непривлекательной. Он был низенького роста, лицо в оспинах, спереди изрядно лысоват, а лоб и щёки изрезаны глубокими морщинами — не говоря уже о прочих телесных несовершенствах.`,
    glossary: [
      { term: 'department', ru: 'здесь: ведомство, департамент' },
      { term: 'sensitive', ru: 'здесь: обидчивый' },
      { term: 'to be annoyed', ru: 'быть задетым, раздражённым' },
      { term: 'in terms of contempt', ru: 'с презрением' },
      { term: 'bulky', ru: 'объёмистый, увесистый' },
      { term: 'chancellery', ru: 'канцелярия' },
      { term: 'marked with smallpox', ru: 'в оспинах' },
      { term: 'furrow', ru: 'борозда; здесь — глубокая морщина' },
    ],
    questions: [
      {
        q: 'Why does the narrator refuse to name the department?',
        options: [
          'He has forgotten it',
          'To avoid offending Government officials',
          'It is a state secret',
          'The department no longer exists',
        ],
        correct: 1,
      },
      {
        q: 'What did the Isprawnik attach to his report?',
        options: [
          'A list of names',
          'A long novel in which an Isprawnik keeps appearing drunk',
          'A map of the town',
          'A photograph',
        ],
        correct: 1,
        why: 'Комизм в том, что доказательством неуважения он делает книгу, где его сословие выведено пьяным, — то есть распространяет ровно то, на что жалуется.',
      },
      {
        q: 'How does the narrator describe the man in the chancellery?',
        options: [
          'Tall and handsome',
          'Short, pockmarked and balding',
          'Young and ambitious',
          'Old and rich',
        ],
        correct: 1,
      },
    ],
  },

  // ── Фицджеральд ────────────────────────────────────────────────────────────
  {
    id: 'sc-gatsby-1',
    workId: 'fitzgerald-gatsby',
    lang: 'en', title: 'Совет отца', level: 'B2', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Глава 1, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'F. Scott Fitzgerald, The Great Gatsby · Project Gutenberg',
    setup: 'Первые строки романа. Рассказчик Ник Каррауэй объясняет, почему он умеет слушать чужие исповеди и почему всю книгу будет воздерживаться от оценок. Через две страницы он снимет домик по соседству с Гэтсби.',
    body: `In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.

"Whenever you feel like criticizing anyone," he told me, "just remember that all the people in this world haven't had the advantages that you've had."

He didn't say any more, but we've always been unusually communicative in a reserved way, and I understood that he meant a great deal more than that. In consequence, I'm inclined to reserve all judgements, a habit that has opened up many curious natures to me and also made me the victim of not a few veteran bores. The abnormal mind is quick to detect and attach itself to this quality when it appears in a normal person, and so it came about that in college I was unjustly accused of being a politician, because I was privy to the secret griefs of wild, unknown men.`,
    translation: `В более молодые и более уязвимые годы отец дал мне совет, который я с тех пор не перестаю обдумывать.

«Когда тебе захочется кого-нибудь осудить, — сказал он, — просто вспомни, что не у всех на свете были те преимущества, которые были у тебя».

Больше он ничего не прибавил, но мы всегда понимали друг друга с полуслова, и я понял, что он имел в виду гораздо больше. С тех пор я склонен воздерживаться от суждений — привычка, благодаря которой мне открылось множество странных натур и из-за которой я не раз становился жертвой заядлых зануд. Ненормальный ум быстро замечает это качество в нормальном человеке и цепляется за него; вот почему в колледже меня несправедливо обвиняли в том, что я политикан, — просто мне доверяли тайные горести буйные и вовсе не знакомые мне люди.`,
    glossary: [
      { term: 'vulnerable', ru: 'уязвимый, незащищённый' },
      { term: 'to turn something over in one’s mind', ru: 'обдумывать, прокручивать в голове' },
      { term: 'to feel like doing something', ru: 'хотеться сделать что-то' },
      { term: 'reserved', ru: 'сдержанный' },
      { term: 'to reserve judgement', ru: 'воздерживаться от оценки' },
      { term: 'bore', ru: 'зануда' },
      { term: 'to be privy to something', ru: 'быть посвящённым во что-то' },
      { term: 'to be inclined to', ru: 'быть склонным к, иметь склонность' },
    ],
    questions: [
      {
        q: 'What advice did the narrator’s father give him?',
        options: [
          'Never trust strangers',
          'Remember that not everyone has had your advantages before you criticize',
          'Always speak your mind',
          'Choose your friends carefully',
        ],
        correct: 1,
      },
      {
        q: 'What has been the result of following that advice?',
        options: [
          'People confide in him, including some he would rather avoid',
          'He has lost all his friends',
          'He became a politician',
          'He stopped talking to his father',
        ],
        correct: 0,
        why: 'Привычка не судить открыла ему «many curious natures» — и заодно сделала жертвой «veteran bores». Плюс и минус названы в одном предложении.',
      },
      {
        q: '"We\'ve always been unusually communicative in a reserved way" is a contradiction on purpose. What does it mean?',
        options: [
          'They talk a lot and loudly',
          'They understand each other without saying much',
          'They never speak at all',
          'They write letters instead of talking',
        ],
        correct: 1,
      },
      {
        q: 'Why was he accused of being "a politician" at college?',
        options: [
          'He ran for office',
          'People told him their secrets, so he seemed to be everywhere',
          'He gave speeches',
          'He came from a political family',
        ],
        correct: 1,
      },
    ],
  },

  // ── Уайльд ─────────────────────────────────────────────────────────────────
  {
    id: 'sc-dorian-1',
    workId: 'wilde-dorian',
    lang: 'en', title: 'Мастерская в запахе роз', level: 'C1', minutes: 3,
    topic: 'Погода и природа', skill: 'Чтение',
    order: 1, where: 'Глава 1, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Oscar Wilde, The Picture of Dorian Gray · Project Gutenberg',
    setup: 'Роман открывается не человеком, а запахом. Уайльд тратит целый абзац на сад за дверью мастерской и только потом показывает лорда Генри на диване — и портрет на мольберте. Самый плотный по лексике текст всей полки: здесь стоит идти медленно.',
    after: 'Через страницу лорд Генри скажет художнику, что портрет нельзя выставлять. А ещё через несколько — впервые заговорит с самим Дорианом, и на этом кончится его прежняя жизнь.',
    body: `The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac, or the more delicate perfume of the pink-flowering thorn.

From the corner of the divan of Persian saddle-bags on which he was lying, smoking, as was his custom, innumerable cigarettes, Lord Henry Wotton could just catch the gleam of the honey-sweet and honey-coloured blossoms of a laburnum, whose tremulous branches seemed hardly able to bear the burden of a beauty so flamelike as theirs; and now and then the fantastic shadows of birds in flight flitted across the long tussore-silk curtains that were stretched in front of the huge window, producing a kind of momentary Japanese effect.

The sullen murmur of the bees shouldering their way through the long unmown grass, or circling with monotonous insistence round the dusty gilt horns of the straggling woodbine, seemed to make the stillness more oppressive. The dim roar of London was like the bourdon note of a distant organ.`,
    translation: `Мастерская была полна густым запахом роз, и когда лёгкий летний ветер шевелил деревья в саду, в открытую дверь вливался тяжёлый аромат сирени или более тонкий запах розовых цветов боярышника.

С угла дивана, покрытого персидскими вьючными коврами, на котором он лежал, куря, по своему обыкновению, бесчисленные папиросы, лорд Генри Уоттон едва улавливал отблеск медово-сладких и медового цвета соцветий ракитника, чьи дрожащие ветви, казалось, едва выдерживали бремя такой пламенной красоты; а время от времени причудливые тени пролетающих птиц скользили по длинным шёлковым занавесям, натянутым перед огромным окном, создавая мгновенное японское впечатление.

Угрюмое гудение пчёл, продирающихся сквозь некошеную траву или с однообразным упорством кружащих над пыльными золотистыми рожками разросшейся жимолости, словно делало тишину ещё более гнетущей. Глухой рокот Лондона был как басовая нота далёкого органа.`,
    glossary: [
      { term: 'odour', ru: 'запах (брит. написание; в США — odor)' },
      { term: 'to stir', ru: 'шевелить, колыхать' },
      { term: 'scent', ru: 'аромат, запах' },
      { term: 'innumerable', ru: 'бесчисленный' },
      { term: 'gleam', ru: 'отблеск, слабый свет' },
      { term: 'tremulous', ru: 'дрожащий, трепещущий' },
      { term: 'to flit', ru: 'мелькать, порхать' },
      { term: 'sullen', ru: 'угрюмый, мрачный' },
      { term: 'unmown', ru: 'некошеный' },
      { term: 'oppressive', ru: 'гнетущий, давящий' },
    ],
    questions: [
      {
        q: 'Where is Lord Henry Wotton and what is he doing?',
        options: [
          'Standing at the window, painting',
          'Lying on a divan, smoking',
          'Walking in the garden',
          'Sitting at a desk, writing',
        ],
        correct: 1,
      },
      {
        q: 'What produces "a kind of momentary Japanese effect"?',
        options: [
          'A painting on the wall',
          'Shadows of flying birds on the silk curtains',
          'The smell of the flowers',
          'A screen in the corner',
        ],
        correct: 1,
      },
      {
        q: 'What is the overall effect of the bees and the distant roar of London?',
        options: [
          'They make the stillness feel heavier',
          'They wake everyone up',
          'They make the room cheerful',
          'They drown out the conversation',
        ],
        correct: 0,
        why: '«Seemed to make the stillness more oppressive» — звук здесь не нарушает тишину, а подчёркивает её. Приём, на котором построена вся первая страница.',
      },
      {
        q: 'The passage is almost entirely description. What has Wilde told us about the plot so far?',
        options: [
          'Nothing yet — only the atmosphere',
          'That someone has died',
          'That Lord Henry is in love',
          'That a crime has been committed',
        ],
        correct: 0,
      },
    ],
  },

  // ── О. Генри ───────────────────────────────────────────────────────────────
  {
    id: 'sc-magi-1',
    workId: 'ohenry-magi',
    lang: 'en', title: 'Один доллар восемьдесят семь центов', level: 'B1', minutes: 2,
    topic: 'Покупки и деньги', skill: 'Чтение',
    order: 1, where: 'Начало рассказа', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'O. Henry, The Gift of the Magi · Project Gutenberg',
    setup: 'Канун Рождества в Нью-Йорке начала века. Делла копила весь год и пересчитывает то, что удалось отложить. У неё и её мужа Джима есть ровно по одной ценной вещи на двоих — но об этом рассказ сообщит чуть позже.',
    after: 'Делла продаст свои волосы, чтобы купить Джиму цепочку для его часов. Джим в это время продаст часы, чтобы купить ей гребни для волос. Это и есть весь рассказ.',
    body: `One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the butcher until one's cheeks burned with the silent imputation of parsimony that such close dealing implied. Three times Della counted it. One dollar and eighty-seven cents. And the next day would be Christmas.

There was clearly nothing to do but flop down on the shabby little couch and howl. So Della did it. Which instigates the moral reflection that life is made up of sobs, sniffles, and smiles, with sniffles predominating.`,
    translation: `Один доллар восемьдесят семь центов. Это было всё. И шестьдесят центов из них — монетками по одному центу. Монетки, скопленные по одной-две за раз, выторгованные у бакалейщика, зеленщика и мясника так, что щёки горели от молчаливого упрёка в скупости, которым отдаёт подобная торговля. Трижды Делла пересчитала их. Один доллар восемьдесят семь центов. А завтра Рождество.

Ясно было, что делать нечего — только повалиться на потёртый диванчик и зареветь. Так Делла и сделала. Что наводит на нравственное размышление: жизнь состоит из всхлипов, вздохов и улыбок, причём вздохи преобладают.`,
    glossary: [
      { term: 'penny (pennies)', ru: 'монета в один цент' },
      { term: 'to bulldoze somebody', ru: 'выторговывать напором, продавливать' },
      { term: 'grocer', ru: 'бакалейщик' },
      { term: 'butcher', ru: 'мясник' },
      { term: 'parsimony', ru: 'скупость, прижимистость' },
      { term: 'shabby', ru: 'потёртый, обшарпанный' },
      { term: 'to howl', ru: 'реветь, выть' },
      { term: 'to predominate', ru: 'преобладать' },
    ],
    questions: [
      {
        q: 'How much money does Della have?',
        options: ['$1.87', '$18.70', '$0.60', '$8.17'],
        correct: 0,
      },
      {
        q: 'How did she save the sixty cents in pennies?',
        options: [
          'She found them in the street',
          'By haggling with shopkeepers, one or two cents at a time',
          'Her husband gave them to her',
          'She sold something',
        ],
        correct: 1,
        why: '«Bulldozing the grocer and the vegetable man and the butcher» — она выторговывала по копейке у каждого продавца.',
      },
      {
        q: 'Why does she cry?',
        options: [
          'She has lost her money',
          'Christmas is tomorrow and she has almost nothing to buy a present with',
          'Her husband has left',
          'She is ill',
        ],
        correct: 1,
      },
    ],
  },

  // ── Конан Дойл ─────────────────────────────────────────────────────────────
  {
    id: 'sc-holmes-1',
    workId: 'doyle-scandal',
    lang: 'en', title: 'Та самая женщина', level: 'B2', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Глава 1, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'A. Conan Doyle, A Scandal in Bohemia · Project Gutenberg',
    setup: 'Первый рассказ первого сборника о Холмсе. Уотсон уже женился и съехал с Бейкер-стрит, и начинает историю со странного признания: единственная женщина, о которой Холмс говорит с уважением, — та, что его обыграла. Кто она, мы узнаем только через десять страниц.',
    body: `To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position. He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results.`,
    translation: `Для Шерлока Холмса она всегда «та самая женщина». Я редко слышал, чтобы он называл её как-нибудь иначе. В его глазах она затмевает и превосходит весь свой пол. Дело не в том, что он испытывал к Ирэн Адлер что-то похожее на любовь. Всякие чувства, а это в особенности, были противны его холодному, точному и великолепно уравновешенному уму. Он был, я полагаю, самой совершенной мыслящей и наблюдающей машиной, какую видел свет, но в роли влюблённого он поставил бы себя в ложное положение. О нежных чувствах он говорил не иначе как с насмешкой и издёвкой. Для наблюдателя это превосходная вещь — они отлично приподнимают завесу над мотивами и поступками людей. Но для опытного мыслителя допустить такое вторжение в свой тонко настроенный характер значило внести помеху, способную бросить тень сомнения на все его выводы.`,
    glossary: [
      { term: 'seldom', ru: 'редко' },
      { term: 'to eclipse', ru: 'затмевать' },
      { term: 'akin to', ru: 'сродни, похожий на' },
      { term: 'abhorrent', ru: 'отвратительный, невыносимый' },
      { term: 'I take it', ru: 'я полагаю, насколько я понимаю' },
      { term: 'save', ru: 'кроме, за исключением (книжн.)' },
      { term: 'gibe', ru: 'насмешка, колкость' },
      { term: 'sneer', ru: 'усмешка, презрительная гримаса' },
    ],
    questions: [
      {
        q: 'Was Holmes in love with Irene Adler?',
        options: [
          'Yes, deeply',
          'No — Watson says the opposite explicitly',
          'The text does not say',
          'He married her',
        ],
        correct: 1,
        why: '«It was not that he felt any emotion akin to love» — Уотсон отрицает это в третьем же предложении, чтобы читатель не понял его превратно.',
      },
      {
        q: 'Why does Holmes avoid strong emotions?',
        options: [
          'They would disturb his reasoning',
          'He was hurt in the past',
          'He considers them immoral',
          'His doctor forbade them',
        ],
        correct: 0,
      },
      {
        q: 'In "He never spoke of the softer passions, save with a gibe", what does "save" mean?',
        options: ['to rescue', 'to keep', 'except', 'to store'],
        correct: 2,
        why: 'Save как предлог = except. Живёт только в книжной речи и в обороте save for.',
      },
      {
        q: 'What is Watson’s overall attitude to Holmes here?',
        options: [
          'Admiring, with a touch of irony',
          'Angry',
          'Indifferent',
          'Frightened',
        ],
        correct: 0,
      },
    ],
  },

  // ── Дюма ───────────────────────────────────────────────────────────────────
  {
    id: 'sc-monte-1',
    workId: 'dumas-monte-cristo',
    lang: 'en', title: '«Фараон» входит в порт', level: 'B2', minutes: 2,
    topic: 'Путешествия', skill: 'Чтение',
    order: 1, where: 'Глава 1', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'A. Dumas, The Count of Monte Cristo · пер. Chapman & Hall, 1846 · Project Gutenberg',
    setup: 'Марсель, февраль 1815 года. В порт входит трёхмачтовый корабль «Фараон». На борту — девятнадцатилетний Эдмон Дантес, которому через несколько дней предстоит стать капитаном и жениться. Ни того ни другого не случится.',
    after: 'Корабль идёт медленно и странно, и толпа на берегу это чувствует: в пути умер капитан. Судном привёл Дантес — и именно за это его через три дня арестуют по доносу.',
    body: `On the 24th of February, 1815, the look-out at Notre-Dame de la Garde signalled the three-master, the Pharaon from Smyrna, Trieste, and Naples.

As usual, a pilot put off immediately, and rounding the Château d'If, got on board the vessel between Cape Morgiou and Rion island.

Immediately, and according to custom, the ramparts of Fort Saint-Jean were covered with spectators; it is always an event at Marseilles for a ship to come into port, especially when this ship, like the Pharaon, has been built, rigged, and laden at the old Phocée docks, and belongs to an owner of the city.`,
    translation: `Двадцать четвёртого февраля 1815 года дозорный на башне Нотр-Дам-де-ла-Гард дал знать о приближении трёхмачтового корабля «Фараон», идущего из Смирны, Триеста и Неаполя.

Как обычно, лоцман тотчас отчалил и, обогнув замок Иф, поднялся на борт судна между мысом Моржион и островом Рион.

Тотчас же, по обыкновению, площадка форта Сен-Жан покрылась зеваками: приход корабля в Марсель всегда событие, особенно если этот корабль, как «Фараон», построен, оснащён и загружен на старых верфях Фокеи и принадлежит здешнему судовладельцу.`,
    glossary: [
      { term: 'look-out', ru: 'дозорный, наблюдатель' },
      { term: 'three-master', ru: 'трёхмачтовое судно' },
      { term: 'pilot', ru: 'лоцман (не «пилот»)' },
      { term: 'to put off', ru: 'отчалить, отойти от берега' },
      { term: 'vessel', ru: 'судно' },
      { term: 'ramparts', ru: 'крепостные стены, валы' },
      { term: 'to rig', ru: 'оснащать (судно)' },
      { term: 'laden', ru: 'гружёный' },
    ],
    questions: [
      {
        q: 'What is the Pharaon?',
        options: ['A fort', 'A three-masted ship', 'A harbour', 'A hotel'],
        correct: 1,
      },
      {
        q: 'What does "pilot" mean in this passage?',
        options: [
          'An aircraft pilot',
          'A harbour pilot who guides ships in',
          'The ship’s owner',
          'A passenger',
        ],
        correct: 1,
        why: 'Классическая ловушка: в морском контексте pilot — лоцман. Значение «лётчик» появилось на век позже этой сцены.',
      },
      {
        q: 'Why does a crowd gather?',
        options: [
          'There is a fire',
          'A ship coming into port is always an event in Marseilles',
          'The king is arriving',
          'It is a holiday',
        ],
        correct: 1,
      },
    ],
  },

  // ── Оруэлл: карточка книги, наш текст ──────────────────────────────────────
  //
  // bucket: 'inspired'. Ни одной строки Оруэлла: в СССР-подобном министерстве
  // работают наши безымянные служащие, а от «1984» здесь тема и лексика.
  {
    id: 'sc-1984-1',
    workId: 'orwell-1984',
    lang: 'en', title: 'Распоряжение об исправлении', level: 'B1', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Уинстон Смит из «1984» работает в отделе документации: ему приходят распоряжения переписать старые газеты так, чтобы прошлое совпадало с сегодняшней линией партии. Ниже — не текст Оруэлла, а наш служебный документ, написанный в том же жанре: так выглядела бы одна такая бумага. Лексика — та, на которой держится весь роман.',
    after: 'В романе такие бумаги приходят десятками в день, а исходники уходят в трубу, которую называют «дырой памяти». Смысл работы в том, что доказать подмену невозможно: старой газеты больше нет нигде.',
    body: `RECORDS DEPARTMENT — AMENDMENT ORDER 4079

To: Clerk 6, Section B
Re: Daily Herald, 17 March, page 2, column 4

The article "Production figures for the quarter" contains an error. The reported output of boots was 62 million pairs. The correct figure is 145 million pairs. Amend the article accordingly and return it today.

Note also the sentence: "The Ministry expects a small delay in the spring programme." This sentence is to be removed. No delay was expected and none occurred. Replace it with a sentence confirming that the programme was completed ahead of schedule.

When the corrected page has been approved, place the original in the disposal chute. Do not keep a copy. Do not discuss this order with clerks outside Section B.

Comrade, remember: our task is not to change the record. Our task is to correct it.`,
    translation: `ОТДЕЛ ДОКУМЕНТАЦИИ — РАСПОРЯЖЕНИЕ ОБ ИСПРАВЛЕНИИ № 4079

Кому: служащему 6, отдел Б
Касательно: «Дейли геральд», 17 марта, стр. 2, колонка 4

В статье «Показатели производства за квартал» содержится ошибка. Указан выпуск обуви в 62 миллиона пар. Верная цифра — 145 миллионов пар. Внесите исправление и верните материал сегодня.

Обратите также внимание на фразу: «Министерство ожидает небольшую задержку весенней программы». Эту фразу следует убрать. Никакой задержки не ожидалось и не было. Замените её фразой о том, что программа выполнена досрочно.

После утверждения исправленной полосы поместите оригинал в приёмник для уничтожения. Копию не оставлять. Настоящее распоряжение с сотрудниками вне отдела Б не обсуждать.

Товарищ, помните: наша задача — не изменить запись. Наша задача — её исправить.`,
    glossary: [
      { term: 'amendment', ru: 'поправка, исправление' },
      { term: 'to amend', ru: 'вносить исправление, править' },
      { term: 'output', ru: 'выпуск, объём производства' },
      { term: 'accordingly', ru: 'соответственно, в соответствии с этим' },
      { term: 'ahead of schedule', ru: 'досрочно, раньше срока' },
      { term: 'disposal', ru: 'утилизация, уничтожение' },
      { term: 'chute', ru: 'жёлоб, труба для сброса' },
      { term: 'record', ru: 'запись, документ; архив' },
    ],
    questions: [
      {
        q: 'What is the clerk asked to do with the production figure?',
        options: [
          'Check it against the factory report',
          'Replace 62 million with 145 million',
          'Delete the whole article',
          'Publish a correction on the front page',
        ],
        correct: 1,
      },
      {
        q: 'Why must the sentence about a delay be removed?',
        options: [
          'It is badly written',
          'Because the order states no delay was ever expected',
          'It is too long',
          'It repeats another sentence',
        ],
        correct: 1,
        why: 'Документ не спорит с фактом, а объявляет его несуществующим: «No delay was expected and none occurred». Это и есть приём, ради которого текст написан.',
      },
      {
        q: 'What happens to the original page?',
        options: [
          'It is filed in the archive',
          'It is sent to the printer',
          'It goes into the disposal chute and no copy is kept',
          'It is returned to the newspaper',
        ],
        correct: 2,
      },
      {
        q: 'The last two sentences distinguish "change" from "correct". Why does that matter?',
        options: [
          'They mean the same thing here, but "correct" sounds legitimate',
          '"Correct" is a technical term for printing',
          'It is a grammar rule',
          'The clerk is being praised',
        ],
        correct: 0,
        why: 'Действие одно, названия два, и второе делает его законным. Ровно об этом весь роман — поэтому и лексика на этой паре.',
      },
    ],
  },

  // ── Heartstopper: карточка, наш текст ──────────────────────────────────────
  {
    id: 'sc-heartstopper-1',
    workId: 'oseman-heartstopper',
    lang: 'en', title: 'Переписка в час ночи', level: 'B1', minutes: 3,
    topic: 'Учёба', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему комикса', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: '«Остановка сердца» — комикс о двух старшеклассниках английской школы, и половина его происходит в переписке: короткие сообщения, ночь, ничего не сказано прямо. Ниже — наш диалог в том же жанре и на той же лексике: британская школьная речь, сокращения и то, как в ней извиняются и мирятся.',
    body: `01:04
— you awake?
— yeah. couldn't sleep. you?
— same. sorry about earlier, at the bus stop. i was being weird
— you weren't
— i was. i just didn't know what to say in front of everyone
— it's fine, honestly
— it's not fine though is it
— …no. not really
— i know. i'm sorry
— i'm not angry. i just don't want to be the thing you're embarrassed about
— you're not. you're literally the opposite of that
— ok
— can i say something and you not reply for like ten seconds
— go on
— i think about you all the time and it's becoming a bit of a problem
— …
— that was nine seconds
— i'm counting to ten. rules are rules
— fair enough
— ok. ten. me too.
— oh
— see you at registration?
— see you at registration`,
    translation: `01:04
— не спишь?
— не сплю. не могу уснуть. ты?
— я тоже. извини за то, что было на остановке. я вёл себя странно
— неправда
— правда. я просто не знал, что сказать при всех
— да ладно, честно
— но ведь не ладно, да?
— …нет. не очень
— знаю. прости
— я не злюсь. я просто не хочу быть тем, чего ты стесняешься
— ты не то. ты буквально наоборот
— ок
— можно я скажу одну вещь, а ты секунд десять не отвечаешь?
— говори
— я думаю о тебе всё время, и это уже немного проблема
— …
— это было девять секунд
— я считаю до десяти. правила есть правила
— справедливо
— так. десять. я тоже.
— ох
— увидимся на перекличке?
— увидимся на перекличке`,
    glossary: [
      { term: 'to be weird', ru: 'вести себя странно' },
      { term: 'in front of everyone', ru: 'при всех' },
      { term: 'honestly', ru: 'честно, правда (как смягчение)' },
      { term: 'embarrassed about', ru: 'смущён из-за, стесняется чего-то' },
      { term: 'literally', ru: 'буквально (в разговорной речи — усилитель)' },
      { term: 'fair enough', ru: 'справедливо, ладно, принимается' },
      { term: 'registration', ru: 'перекличка в начале учебного дня (брит. школа)' },
    ],
    questions: [
      {
        q: 'Why is one of them apologising?',
        options: [
          'He was late',
          'He behaved oddly at the bus stop in front of other people',
          'He forgot a birthday',
          'He lost something',
        ],
        correct: 1,
      },
      {
        q: '"it\'s not fine though is it" — what is the speaker doing here?',
        options: [
          'Asking for information',
          'Refusing the polite answer and asking for the honest one',
          'Changing the subject',
          'Ending the conversation',
        ],
        correct: 1,
        why: 'Разделительный вопрос (…though is it) в британской речи часто не вопрос, а способ не принять вежливую отговорку.',
      },
      {
        q: 'What does "fair enough" mean?',
        options: ['That is beautiful', 'OK, I accept that', 'That is unfair', 'Not enough'],
        correct: 1,
      },
      {
        q: 'What is "registration" in a British school?',
        options: [
          'Signing up for a course',
          'The roll-call at the start of the school day',
          'An exam',
          'A club',
        ],
        correct: 1,
      },
    ],
  },

  // ── Ted Lasso: карточка, наш текст ─────────────────────────────────────────
  {
    id: 'sc-lasso-1',
    workId: 'ted-lasso',
    lang: 'en', title: 'Два английских в одной раздевалке', level: 'B1', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'В «Теде Лассо» американский тренер приезжает работать в английский футбольный клуб, и половина шуток сериала — на разнице двух вариантов английского. Ниже наш диалог, построенный ровно на этом: одни и те же вещи называются разными словами, и оба собеседника уверены, что говорят понятно.',
    body: `— Morning! Y'all ready for practice?
— Training.
— Excuse me?
— We call it training. Practice is what you do at the piano.
— Noted. Well then — everybody on the field in ten.
— Pitch.
— Come again?
— The field is a pitch. And those aren't cleats, they're boots.
— Boots are what you wear in the snow where I'm from.
— And what do you call the thing you're holding?
— A soccer ball.
— Right. That's a football. This entire country will die on that hill.
— Fair enough. Anything else I'm getting wrong?
— The kit, the fixture list, the table, the away end, and the word "schedule".
— What's wrong with schedule?
— Nothing. You just say it wrong.
— You know what, I think I'm gonna like it here.`,
    translation: `— Доброе утро! Все готовы к practice?
— К training.
— Простите?
— У нас это называется training. Practice — это когда занимаются за пианино.
— Принято. Тогда — все на field через десять минут.
— На pitch.
— Ещё раз?
— Поле называется pitch. И это не cleats, а boots.
— Boots у меня на родине надевают в снег.
— А как вы называете то, что держите в руках?
— Soccer ball.
— Ага. Это football. Вся страна умрёт на этом холме.
— Справедливо. Что ещё я говорю не так?
— Kit, fixture list, table, away end и слово «schedule».
— А что не так со «schedule»?
— Ничего. Вы его просто неправильно произносите.
— Знаете что, мне, кажется, тут понравится.`,
    glossary: [
      { term: 'pitch', ru: 'футбольное поле (брит.); в США — field' },
      { term: 'boots', ru: 'бутсы (брит.); в США — cleats' },
      { term: 'kit', ru: 'форма команды (брит.)' },
      { term: 'fixture list', ru: 'календарь матчей' },
      { term: 'the table', ru: 'турнирная таблица' },
      { term: 'to die on that hill', ru: 'стоять на своём до конца' },
      { term: 'Come again?', ru: 'Что-что? Повторите' },
      { term: 'Noted', ru: 'Принято, учту' },
    ],
    questions: [
      {
        q: 'What is the British word for the American "field"?',
        options: ['court', 'pitch', 'ground floor', 'yard'],
        correct: 1,
      },
      {
        q: 'Why does the Englishman object to "practice"?',
        options: [
          'It is rude',
          'In British football the word is "training"',
          'It is too long',
          'It is American slang',
        ],
        correct: 1,
      },
      {
        q: 'What does "this entire country will die on that hill" mean?',
        options: [
          'The country is in danger',
          'It is a subject nobody here will ever concede',
          'There is a famous hill',
          'It is a football chant',
        ],
        correct: 1,
        why: 'To die on that hill — «стоять насмерть за этот вопрос». Идиома живая и очень частая в современной речи.',
      },
      {
        q: 'What is wrong with the American’s "schedule", according to the Englishman?',
        options: [
          'The meaning',
          'The spelling',
          'The pronunciation',
          'Nothing at all',
        ],
        correct: 2,
        why: '«Nothing. You just say it wrong» — брит. /ˈʃedjuːl/ против амер. /ˈskedʒuːl/.',
      },
    ],
  },
]
