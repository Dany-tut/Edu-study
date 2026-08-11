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
      { term: 'ill-humoured', ru: 'сердитый' },
      { term: 'capricious', ru: 'взбалмошный' },
      { term: 'despondency', ru: 'уныние' },
      { term: 'to forsake', ru: 'покидать' },
      { term: 'acquaintance', ru: 'знакомый' },
      { term: 'dejection', ru: 'подавленность' },
      { term: 'to saunter', ru: 'брести не спеша' },
      { term: 'under a cloud', ru: 'не в духе' },
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
      { term: 'storey', ru: 'этаж; в США story' },
      { term: 'to redecorate', ru: 'делать ремонт' },
      { term: 'fright', ru: 'испуг' },
      { term: 'on purpose', ru: 'нарочно, специально' },
      { term: 'God forbid', ru: 'упаси боже' },
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
      { term: 'to distinguish', ru: 'разглядеть' },
      { term: 'carriage', ru: 'вагон; в США car' },
      { term: 'weary', ru: 'измотанный' },
      { term: 'complexion', ru: 'цвет лица' },
      { term: 'to dawn', ru: 'светать' },
      { term: 'anxious to do sth', ru: 'не терпится сделать' },
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
      { term: 'a fortnight', ru: 'две недели' },
      { term: 'to be at home somewhere', ru: 'освоиться где-то' },
      { term: 'fair-haired', ru: 'светловолосый' },
      { term: 'it wouldn’t be amiss', ru: 'не лишним было бы' },
      { term: 'to reflect', ru: 'рассуждать про себя' },
      { term: 'erect', ru: 'с прямой осанкой' },
      { term: 'staid', ru: 'степенный' },
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
      { term: 'estate', ru: 'имение' },
      { term: 'abject', ru: 'ничтожный' },
      { term: 'vicious', ru: 'порочный, не «злой»' },
      { term: 'senseless', ru: 'бестолковый' },
      { term: 'worldly affairs', ru: 'денежные дела' },
      { term: 'next to nothing', ru: 'почти ничего' },
      { term: 'toady', ru: 'приживальщик' },
      { term: 'shrewd', ru: 'себе на уме' },
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
      { term: 'department', ru: 'здесь: ведомство' },
      { term: 'sensitive', ru: 'здесь: обидчивый' },
      { term: 'to be annoyed', ru: 'быть задетым' },
      { term: 'in terms of contempt', ru: 'с презрением' },
      { term: 'bulky', ru: 'увесистый' },
      { term: 'chancellery', ru: 'канцелярия' },
      { term: 'marked with smallpox', ru: 'в оспинах' },
      { term: 'furrow', ru: 'глубокая морщина' },
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
      { term: 'to turn over in one’s mind', ru: 'обдумывать' },
      { term: 'to feel like doing sth', ru: 'хотеться сделать' },
      { term: 'reserved', ru: 'сдержанный' },
      { term: 'to reserve judgement', ru: 'воздерживаться от оценки' },
      { term: 'bore', ru: 'зануда' },
      { term: 'to be privy to sth', ru: 'быть посвящённым' },
      { term: 'to be inclined to', ru: 'быть склонным к' },
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
      { term: 'odour', ru: 'запах; в США odor' },
      { term: 'to stir', ru: 'колыхать' },
      { term: 'scent', ru: 'аромат' },
      { term: 'innumerable', ru: 'бесчисленный' },
      { term: 'gleam', ru: 'отблеск' },
      { term: 'tremulous', ru: 'трепещущий' },
      { term: 'to flit', ru: 'мелькать' },
      { term: 'sullen', ru: 'угрюмый' },
      { term: 'unmown', ru: 'некошеный' },
      { term: 'oppressive', ru: 'гнетущий' },
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
      { term: 'penny / pennies', ru: 'монета в один цент' },
      { term: 'to bulldoze sb', ru: 'выторговывать напором' },
      { term: 'grocer', ru: 'бакалейщик' },
      { term: 'butcher', ru: 'мясник' },
      { term: 'parsimony', ru: 'скупость' },
      { term: 'shabby', ru: 'обшарпанный' },
      { term: 'to howl', ru: 'реветь' },
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
      { term: 'akin to', ru: 'сродни' },
      { term: 'abhorrent', ru: 'невыносимый' },
      { term: 'I take it', ru: 'я полагаю' },
      { term: 'save', ru: 'кроме (книжн.)' },
      { term: 'gibe', ru: 'колкость' },
      { term: 'sneer', ru: 'презрительная усмешка' },
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
      { term: 'pilot', ru: 'лоцман, не «пилот»' },
      { term: 'to put off', ru: 'отчалить' },
      { term: 'vessel', ru: 'судно' },
      { term: 'ramparts', ru: 'крепостные стены' },
      { term: 'to rig', ru: 'оснащать судно' },
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
      { term: 'amendment', ru: 'исправление' },
      { term: 'to amend', ru: 'править, исправлять' },
      { term: 'output', ru: 'объём производства' },
      { term: 'accordingly', ru: 'соответственно' },
      { term: 'ahead of schedule', ru: 'досрочно' },
      { term: 'disposal', ru: 'уничтожение' },
      { term: 'chute', ru: 'труба для сброса' },
      { term: 'record', ru: 'запись, архив' },
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
      { term: 'honestly', ru: 'честно, правда' },
      { term: 'embarrassed about', ru: 'стесняется чего-то' },
      { term: 'literally', ru: 'буквально; усилитель' },
      { term: 'fair enough', ru: 'ладно, принимается' },
      { term: 'registration', ru: 'перекличка в школе' },
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
      { term: 'pitch', ru: 'поле; в США field' },
      { term: 'boots', ru: 'бутсы; в США cleats' },
      { term: 'kit', ru: 'форма команды' },
      { term: 'fixture list', ru: 'календарь матчей' },
      { term: 'the table', ru: 'турнирная таблица' },
      { term: 'to die on that hill', ru: 'стоять на своём' },
      { term: 'Come again?', ru: 'что-что?' },
      { term: 'Noted', ru: 'принято, учту' },
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

  // ── Очень странные дела: карточка, наш текст ───────────────────────────────
  //
  // bucket: 'inspired'. Ни одной реплики сериала и ни одного его персонажа:
  // город, школа и газета придуманы нами. От «Очень странных дел» здесь год,
  // место действия и регистр — американская провинция начала восьмидесятых.
  {
    id: 'sc-st-1',
    workId: 'stranger-things',
    lang: 'en', title: 'Доска объявлений, осень 1983', level: 'A2', minutes: 2,
    topic: 'Учёба', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Половина «Очень странных дел» происходит в обычной американской школе: кружки, ярмарка проектов, зимний бал. Ниже — наша школьная доска объявлений тех же лет. Это самый частотный слой языка сериала: ни одного фантастического слова, зато вся школьная бытовуха, которой в учебниках почти нет.',
    after: 'Именно из таких объявлений собирается фон сериала: кружок радиолюбителей, ярмарка проектов и бал в спортзале — а всё странное происходит вокруг них и никогда вместо них.',
    body: `BELLWOOD MIDDLE SCHOOL — NOTICE BOARD

SCIENCE FAIR — FRIDAY
Projects go in the gym by 3 p.m. Volcanoes are fine. Volcanoes that actually erupt are not. Ask Mr. Colby before you bring anything electrical.

AV CLUB
Meets Tuesdays in Room 12. We have a new radio set. Members only — but everybody is a member, because there are four of us.

LOST AND FOUND
One left glove. One library book about the solar system. One bicycle bell. One retainer. Please come and get the retainer. Please.

SNOW BALL — DECEMBER 15
Tickets are two dollars. Yes, you can come without a date. No, the gym will not be warm.`,
    translation: `СРЕДНЯЯ ШКОЛА БЕЛЛВУД — ДОСКА ОБЪЯВЛЕНИЙ

ЯРМАРКА НАУЧНЫХ ПРОЕКТОВ — В ПЯТНИЦУ
Проекты сдавать в спортзал до 15:00. Вулканы можно. Вулканы, которые правда извергаются, нельзя. Если несёте что-то электрическое, сначала спросите мистера Колби.

КРУЖОК АУДИО-ВИДЕО
Собираемся по вторникам в кабинете 12. У нас новая радиостанция. Только для членов кружка — но член кружка каждый, потому что нас четверо.

БЮРО НАХОДОК
Одна левая перчатка. Одна библиотечная книга про Солнечную систему. Один велосипедный звонок. Одна пластинка для зубов. Пожалуйста, заберите пластинку. Пожалуйста.

ЗИМНИЙ БАЛ — 15 ДЕКАБРЯ
Билет два доллара. Да, можно прийти без пары. Нет, в спортзале не будет тепло.`,
    glossary: [
      { term: 'notice board', ru: 'доска объявлений; в США чаще bulletin board' },
      { term: 'science fair', ru: 'школьная ярмарка научных проектов' },
      { term: 'to erupt', ru: 'извергаться' },
      { term: 'AV club', ru: 'кружок аудио- и видеотехники' },
      { term: 'lost and found', ru: 'бюро находок' },
      { term: 'retainer', ru: 'пластинка для зубов' },
      { term: 'a date', ru: 'пара, спутник на вечер' },
      { term: 'gym', ru: 'спортзал' },
    ],
    questions: [
      {
        q: 'What kind of volcano is not allowed at the science fair?',
        options: ['A big one', 'One that really erupts', 'A painted one', 'One made of paper'],
        correct: 1,
        why: '«Volcanoes are fine. Volcanoes that actually erupt are not» — actually здесь «на самом деле», а не «вообще-то».',
      },
      {
        q: 'How many people are in the AV club?',
        options: ['Four', 'Twelve', 'The whole school', 'It does not say'],
        correct: 0,
      },
      {
        q: 'What does "you can come without a date" mean?',
        options: [
          'You do not need to bring a partner',
          'You do not need a ticket',
          'The day is not fixed',
          'You can come late',
        ],
        correct: 0,
        why: 'A date — это человек, с которым идут на свидание или на вечер, а не число в календаре.',
      },
    ],
  },
  {
    id: 'sc-st-2',
    workId: 'stranger-things',
    lang: 'en', title: 'Правила пользования рацией', level: 'B1', minutes: 3,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Рация — главный предмет сериала: у детей нет мобильных, и всё держится на канале, позывном и слове «over». Ниже наш листок с правилами, написанный самым ответственным ребёнком компании. Это редкий случай, когда полезная лексика (over, copy, roger) приходит вместе с интонацией, ради которой её запоминают.',
    after: 'Смысл этих правил в сериале выясняется в первую же ночь: рация — единственный способ докричаться, когда взрослые не верят. Поэтому шестой пункт там нарушают ровно один раз и по делу.',
    body: `RULES FOR THE RADIOS (do not lose this)

1. Channel 6. Always channel 6. If you cannot hear anyone, you are on the wrong channel, and you are about to say so on the wrong channel.

2. Say your call sign first, then let go of the button and wait. The radio only goes one way at a time. If two people talk, nobody talks.

3. "Over" means I have finished, your turn. "Out" means I have finished, goodbye. Never say "over and out". They mean opposite things and you would be saying both.

4. "Copy" means I heard you. "Roger" means I heard you and I will do it. Learn the difference before you promise something by accident.

5. Radios go off at nine. Batteries cost money and my mom counts them.

6. The emergency word is COMPASS. If you hear it, you drop everything and you come. You do not ask questions on the radio, because anyone can hear channel 6, including people we do not want on it.

7. Do not use the emergency word because your sister finished the cereal. This has now happened twice.`,
    translation: `ПРАВИЛА ПОЛЬЗОВАНИЯ РАЦИЯМИ (не потеряй этот листок)

1. Шестой канал. Всегда шестой. Если никого не слышно, ты на не том канале — и сейчас сообщишь об этом на не том канале.

2. Сначала называешь позывной, потом отпускаешь кнопку и ждёшь. Рация работает только в одну сторону за раз. Если говорят двое, не говорит никто.

3. «Over» значит «я закончил, теперь ты». «Out» значит «я закончил, до связи». Никогда не говори «over and out». Это противоположные вещи, и ты сказал бы обе сразу.

4. «Copy» значит «я тебя услышал». «Roger» значит «услышал и сделаю». Разберись в разнице, пока случайно что-нибудь не пообещал.

5. В девять рации выключаются. Батарейки стоят денег, и мама их считает.

6. Слово тревоги — КОМПАС. Услышал — бросаешь всё и приходишь. Вопросов по рации не задаёшь: шестой канал слышат все, в том числе те, кого мы там не ждём.

7. Не используй слово тревоги из-за того, что сестра доела хлопья. Так уже было два раза.`,
    glossary: [
      { term: 'call sign', ru: 'позывной' },
      { term: 'over', ru: 'приём (я закончил, отвечай)' },
      { term: 'out', ru: 'конец связи' },
      { term: 'copy', ru: 'принял, слышу' },
      { term: 'roger', ru: 'принял и выполню' },
      { term: 'to let go of', ru: 'отпустить' },
      { term: 'to drop everything', ru: 'всё бросить' },
      { term: 'by accident', ru: 'нечаянно' },
    ],
    questions: [
      {
        q: 'Why must you never say "over and out"?',
        options: [
          'It takes too long',
          'The two words mean opposite things',
          'It is impolite',
          'It only works on channel 6',
        ],
        correct: 1,
        why: 'Over — «продолжай», out — «конец связи». Вместе это «отвечай мне, до свидания».',
      },
      {
        q: 'What is the difference between "copy" and "roger"?',
        options: [
          'There is none',
          '"Copy" means I heard you, "roger" means I heard you and will act',
          '"Roger" is only for adults',
          '"Copy" is used at the end of a call',
        ],
        correct: 1,
      },
      {
        q: 'Why are questions forbidden after the emergency word?',
        options: [
          'There is no time',
          'Because anyone can listen to channel 6',
          'Because the batteries run out',
          'Because the rule was written as a joke',
        ],
        correct: 1,
      },
      {
        q: 'What does "you drop everything" mean here?',
        options: ['You break things', 'You stop whatever you are doing', 'You fall over', 'You hide'],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-st-3',
    workId: 'stranger-things',
    lang: 'en', title: 'Заметка в городской газете', level: 'B2', minutes: 3,
    topic: 'Дом и город', skill: 'Чтение',
    order: 3, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'В сериале странное всегда сначала попадает в местную газету — коротким сухим текстом, из которого ничего не понятно. Ниже наша заметка в том же жанре. Газетный английский устроен иначе, чем разговорный: страдательный залог, косвенная речь и обязательное «источник сказал», — и на трёх абзацах это видно целиком.',
    after: 'Приём газеты: она сообщает всё, кроме главного. Причина не найдена, оборудование проверено, звонить не надо — и одна фраза жителя, которая портит всю картину.',
    body: `THE BELLWOOD LEDGER · Thursday, November 10, 1983

POWER OUT ACROSS EAST SIDE; UTILITY SAYS NO CAUSE FOUND

Homes on the east side of town were without electricity for almost four hours on Tuesday night. The lights went out shortly after nine and were not fully restored until one in the morning.

A spokesman for the Ridgeline Power Company said that no cause had been found and that the equipment had been checked twice. He added that the company did not expect the fault to repeat itself.

Several residents of Maple Street reported that their televisions had switched themselves on and off for about a minute before the power failed. One of them, a retired schoolteacher, said she had counted the flashes.

"I have lived here thirty-one years," she said. "I know what a storm sounds like. That was not a storm."

The sheriff's office asks residents not to call about the lights unless there is an emergency. Anyone who saw anything unusual near the water tower on Tuesday night is asked to get in touch.`,
    translation: `«БЕЛЛВУД ЛЕДЖЕР» · четверг, 10 ноября 1983

СВЕТА НЕТ ВО ВСЁМ ВОСТОЧНОМ РАЙОНЕ; ЭНЕРГЕТИКИ ГОВОРЯТ, ЧТО ПРИЧИНА НЕ НАЙДЕНА

Дома в восточной части города во вторник вечером почти четыре часа оставались без электричества. Свет погас вскоре после девяти и был полностью восстановлен только к часу ночи.

Представитель компании «Риджлайн пауэр» заявил, что причина не найдена, а оборудование проверено дважды. Он добавил, что повторения сбоя компания не ожидает.

Несколько жителей Мэйпл-стрит рассказали, что примерно за минуту до отключения их телевизоры сами включались и выключались. Одна из них, учительница на пенсии, сказала, что считала вспышки.

«Я живу здесь тридцать один год, — сказала она. — Я знаю, как звучит гроза. Это была не гроза».

Управление шерифа просит жителей не звонить по поводу света, если это не экстренный случай. Тех, кто видел во вторник вечером что-либо необычное возле водонапорной башни, просят связаться с ним.`,
    glossary: [
      { term: 'power out / power failure', ru: 'отключение электричества' },
      { term: 'utility', ru: 'коммунальная компания' },
      { term: 'to restore', ru: 'восстановить' },
      { term: 'spokesman', ru: 'представитель, тот, кто говорит от лица' },
      { term: 'fault', ru: 'неисправность, сбой' },
      { term: 'resident', ru: 'житель' },
      { term: 'sheriff’s office', ru: 'управление шерифа' },
      { term: 'to get in touch', ru: 'связаться' },
    ],
    questions: [
      {
        q: 'What does the power company say about the cause?',
        options: [
          'It was a storm',
          'No cause was found',
          'It was a fault in one house',
          'The company refused to comment',
        ],
        correct: 1,
      },
      {
        q: 'What did the residents of Maple Street notice?',
        options: [
          'A loud noise from the water tower',
          'Their televisions switching on and off before the power failed',
          'A car driving away',
          'A smell of burning',
        ],
        correct: 1,
      },
      {
        q: 'Why is the newspaper full of "said that" and "was checked"?',
        options: [
          'The writer is unsure of the grammar',
          'News style reports other people’s words and hides who did the action',
          'It is the style of 1983 only',
          'To make the text longer',
        ],
        correct: 1,
        why: 'Косвенная речь и страдательный залог — костяк газетного стиля: газета отвечает за то, что ей сказали, а не за сам факт.',
      },
      {
        q: 'What does "get in touch" mean?',
        options: ['touch something', 'make contact', 'come to the office', 'stay calm'],
        correct: 1,
      },
    ],
  },

  // ── Игра престолов: карточка, наш текст ────────────────────────────────────
  //
  // bucket: 'inspired'. Ни Вестероса, ни его домов и персонажей: замок, семья и
  // отряд придуманы нами. Берём у сериала ровно одно — регистр: современная
  // грамматика в старинной оболочке, shall в обещаниях, «my lord» в обращении.
  {
    id: 'sc-got-1',
    workId: 'got',
    lang: 'en', title: 'Письмо, привезённое вороном', level: 'C1', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Половина решений в «Игре престолов» принимается не в бою, а в письме на одну страницу. Ниже наше письмо в том же жанре: сестра пишет брату, который задержался при дворе. Ни одного героя сериала здесь нет — есть его язык: вежливая форма, под которой лежит требование, и shall, который в современной речи почти исчез, но в клятвах и приказах остался.',
    after: 'Обратите внимание на последнюю строку. Подпись «твоя сестра, которая подписывается так, а не „твоя покорная слуга“» — это в письме единственное прямое высказывание, и оно стоит там, где его нельзя не заметить.',
    body: `To Lord Corran of Stonemarch, from his sister, by raven.

My lord brother,

Our father died on the ninth day of the month. He was not in pain at the end, whatever the healer may write to you, and he asked for you twice. I have told the household that he asked for you once, because the second time he was not himself, and I would not have that carried through the halls.

The harvest is in. It is thin, but it is in, and the granaries will hold until spring if the winter is an ordinary one. I do not think it will be an ordinary one.

Lord Aemon has written twice to ask for my hand, and twice I have thanked him for the honour and said nothing else. He will not wait for a third letter. If you would have me refuse him outright, say so plainly and I shall. If you would have me accept, say that plainly too. Do not send me half a sentence and call it a command.

Come home before the roads close. Whatever you are owed at court will still be owed in the spring, and the men here are asking who they serve.

Your sister, who signs herself so and not "your obedient servant",
Aleth`,
    translation: `Лорду Коррану Стоунмарчскому, от его сестры, с вороном.

Милорд брат,

Отец умер на девятый день месяца. В конце он не страдал — что бы ни писал тебе лекарь — и дважды звал тебя. Домашним я сказала, что звал один раз: во второй он был уже не в себе, и я не хочу, чтобы это разнесли по всему дому.

Урожай убран. Он скудный, но убран, и амбаров хватит до весны, если зима будет обычной. Я не думаю, что она будет обычной.

Лорд Эймон дважды писал, прося моей руки, и дважды я благодарила его за честь и не говорила больше ничего. Третьего письма он ждать не станет. Если ты хочешь, чтобы я отказала ему прямо, — скажи это ясно, и я откажу. Если хочешь, чтобы приняла, — скажи ясно и это. Не присылай мне полфразы и не называй это приказом.

Возвращайся, пока не закрылись дороги. Всё, что тебе должны при дворе, будут должны и весной, а здешние люди уже спрашивают, кому они служат.

Твоя сестра, которая подписывается так, а не «твоя покорная слуга»,
Алет`,
    glossary: [
      { term: 'by raven', ru: 'с вороном (почта в фэнтези)' },
      { term: 'household', ru: 'домочадцы, вся челядь дома' },
      { term: 'to ask for someone’s hand', ru: 'просить руки' },
      { term: 'outright', ru: 'прямо, наотрез' },
      { term: 'plainly', ru: 'ясно, без обиняков' },
      { term: 'granary', ru: 'амбар, зернохранилище' },
      { term: 'to be owed', ru: 'причитаться, быть должным кому-то' },
      { term: 'I shall', ru: 'обещание в старом регистре: «и я сделаю»' },
    ],
    questions: [
      {
        q: 'Why did she tell the household that their father asked for his son only once?',
        options: [
          'She did not hear the second time',
          'The second time he was not in his right mind, and she did not want that repeated around the house',
          'She was angry with her brother',
          'The healer told her to',
        ],
        correct: 1,
      },
      {
        q: '"If you would have me refuse him" means…',
        options: [
          'if you want me to refuse him',
          'if you would refuse him yourself',
          'if you had refused him',
          'if he refuses me',
        ],
        correct: 0,
        why: 'Would have somebody do something — «хотеть, чтобы кто-то сделал». Оборот старый и книжный, но в договорах и приказах живой до сих пор.',
      },
      {
        q: 'What does she want from her brother?',
        options: [
          'Money for the winter',
          'A clear answer instead of a vague one',
          'Permission to leave the castle',
          'A new healer',
        ],
        correct: 1,
        why: '«Do not send me half a sentence and call it a command» — она просит не решения, а определённости.',
      },
      {
        q: 'What is the point of the way she signs the letter?',
        options: [
          'It is the standard formula of the time',
          'She is refusing the usual submissive formula, and doing it visibly',
          'She forgot her title',
          'It shows she is not really his sister',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-got-2',
    workId: 'got',
    lang: 'en', title: 'Присяга привратной стражи', level: 'C1', minutes: 2,
    topic: 'Работа', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Клятвы в сериале — отдельный жанр: их произносят вслух, при всех, и потом весь сюжет держится на том, кто её нарушил. Ниже наша присяга вымышленного отряда. Здесь стоит смотреть не на смысл, а на конструкцию: shall в каждом предложении — это не будущее время, а обещание, и различать их приходится по контексту.',
    after: 'Последняя строка — то, ради чего такие тексты вообще пишут: «ты будешь в отряде, пока не умрёшь, а после этого ты нам не нужен». Клятва всегда договор, и невыгодную сторону в ней проговаривают в конце.',
    body: `THE OATH OF THE ASHGUARD

Say the words with me, and say them loudly enough for the whole hall to hear.

I take this post of my own will.
I shall hold the gate while I can stand, and when I cannot stand I shall hold it sitting.
I shall take no land, no wife, no crown and no coin that is offered to me for the turning of my head.
I shall obey the captain of the watch in all things concerning the gate, and in nothing else, for he is my captain and not my lord.
If I am asked to open the gate by any voice but his, I shall not open it, though the voice be the king's own.
I shall not speak of what passes through the gate at night.

This I swear by fire and by iron. Let the fire take me if I lie, and let the iron take me if I run.

Rise. You are of the Ashguard now, and you will be of it until you are dead, and after that we shall not need you.`,
    translation: `ПРИСЯГА ПЕПЕЛЬНОЙ СТРАЖИ

Повторяй за мной и говори так, чтобы слышал весь зал.

Я принимаю этот пост по своей воле.
Я буду держать ворота, пока стою на ногах, а когда не смогу стоять — буду держать их сидя.
Я не приму ни земли, ни жены, ни короны, ни монеты из тех, что предлагают за то, чтобы я отвернулся.
Я буду подчиняться начальнику стражи во всём, что касается ворот, и ни в чём другом, ибо он мне начальник, а не господин.
Если открыть ворота мне велит любой голос, кроме его, я не открою, будь то и голос самого короля.
Я не стану говорить о том, что проходит в ворота ночью.

В том клянусь огнём и железом. Пусть огонь возьмёт меня, если я солгал, и пусть железо возьмёт меня, если я побегу.

Встань. Ты теперь из Пепельной стражи и будешь в ней, пока не умрёшь, а после этого ты нам не понадобишься.`,
    glossary: [
      { term: 'oath', ru: 'клятва, присяга' },
      { term: 'to take a post', ru: 'заступить на пост' },
      { term: 'of my own will', ru: 'по своей воле' },
      { term: 'to turn one’s head', ru: 'отвернуться, закрыть глаза (на что-то)' },
      { term: 'the watch', ru: 'стража, караул' },
      { term: 'though the voice be', ru: 'даже если голос — (старое сослагательное)' },
      { term: 'to swear by', ru: 'клясться чем-либо' },
    ],
    questions: [
      {
        q: 'What does "no coin that is offered to me for the turning of my head" mean?',
        options: [
          'No payment for turning around',
          'No bribe for looking the other way',
          'No wages at all',
          'No gift from the king',
        ],
        correct: 1,
        why: 'To turn one’s head — «отвернуться», то есть сделать вид, что не заметил. Вся строка — про взятку.',
      },
      {
        q: 'Whom does the guard obey, and in what?',
        options: [
          'The king, in everything',
          'The captain of the watch, but only in matters of the gate',
          'His lord, in everything',
          'Nobody',
        ],
        correct: 1,
      },
      {
        q: 'What is "shall" doing in this text?',
        options: [
          'Making a simple future tense',
          'Marking a promise or an obligation',
          'Asking a question',
          'Showing the past',
        ],
        correct: 1,
        why: 'Это shall обещания и обязательства. В современной речи оно осталось в клятвах, договорах и законах: the tenant shall pay…',
      },
    ],
  },
  {
    id: 'sc-got-3',
    workId: 'got',
    lang: 'en', title: 'Объявление о турнире', level: 'B2', minutes: 3,
    topic: 'Время и планы', skill: 'Чтение',
    order: 3, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Турнир в таком сериале — не спорт, а способ собрать в одном месте всех, кто друг друга ненавидит. Ниже наше объявление глашатая: призы, правила, запреты. Полезно оно не фэнтези, а конструкцией are to be — так по-английски до сих пор пишут регламенты и приказы: «блюда подавать к семи», «заявки подать до пятницы».',
    after: 'Последняя строка объявления — «поле вмещает две тысячи, а город заметно меньше» — и есть настоящая причина, по которой такие турниры в сериалах кончаются плохо.',
    body: `BY ORDER OF THE LORD OF STONEMARCH
A TOURNEY IS PROCLAIMED

To be held on the field below the north wall, beginning on the first morning after the harvest feast and lasting three days.

THE PRIZES
For the joust: forty gold pieces and a horse of the winner's choosing from the lord's own stable.
For the archery: twenty gold pieces.
For the melee: ten gold pieces, and the arms of every man the winner unseats.

THE RULES
Any free man may enter. Any man who is not free may enter with the written consent of the house he serves.
Names are to be given to the herald before sundown on the day the tourney opens. No name will be taken after that hour for any reason. It is useless to argue with the herald, who cannot read and will not pretend to.
Blades are to be blunted. A man who brings a live blade to the melee forfeits his place, his horse and his arms, and will be asked to leave the field on foot.
Quarrels begun at the tourney are to be finished at the tourney. Quarrels carried home are the lord's business, and the lord has business enough.

Come armed, come sober and come early. The field holds two thousand and the town holds rather fewer.`,
    translation: `ПО ПРИКАЗУ ЛОРДА СТОУНМАРЧСКОГО
ОБЪЯВЛЯЕТСЯ ТУРНИР

Быть ему на поле под северной стеной, начаться первым утром после праздника урожая и длиться три дня.

НАГРАДЫ
За конный поединок: сорок золотых и конь из конюшни лорда — на выбор победителя.
За стрельбу из лука: двадцать золотых.
За общую схватку: десять золотых и оружие каждого, кого победитель выбьет из седла.

ПРАВИЛА
Участвовать может любой свободный человек. Несвободный — с письменного согласия дома, которому служит.
Имена подавать глашатаю до захода солнца в день открытия турнира. После этого часа имён не принимают ни по какой причине. Спорить с глашатаем бесполезно: он не умеет читать и делать вид не станет.
Клинки затупить. Тот, кто выйдет на общую схватку с боевым клинком, теряет своё место, коня и оружие и будет выведен с поля пешком.
Ссоры, начатые на турнире, на турнире и заканчивать. Ссоры, увезённые домой, — дело лорда, а у лорда дел и без того хватает.

Приходите вооружёнными, трезвыми и заранее. Поле вмещает две тысячи, а город — заметно меньше.`,
    glossary: [
      { term: 'tourney', ru: 'турнир (старая форма от tournament)' },
      { term: 'joust', ru: 'конный поединок на копьях' },
      { term: 'melee', ru: 'общая схватка' },
      { term: 'to unseat', ru: 'выбить из седла' },
      { term: 'consent', ru: 'согласие' },
      { term: 'herald', ru: 'глашатай' },
      { term: 'sundown', ru: 'заход солнца' },
      { term: 'to forfeit', ru: 'лишиться, потерять по правилам' },
      { term: 'are to be given', ru: 'следует подать (регламентное долженствование)' },
    ],
    questions: [
      {
        q: 'Can a man who is not free take part?',
        options: [
          'No, never',
          'Yes, if the house he serves gives written consent',
          'Yes, but only in the archery',
          'Only on the third day',
        ],
        correct: 1,
      },
      {
        q: 'What happens to a man who brings a sharp blade to the melee?',
        options: [
          'He is fined',
          'He loses his place, his horse and his arms',
          'He fights first',
          'Nothing is said about it',
        ],
        correct: 1,
      },
      {
        q: '"Names are to be given to the herald before sundown" means…',
        options: [
          'Names are usually given before sundown',
          'Names must be given before sundown',
          'Names may be given before sundown',
          'Names were given before sundown',
        ],
        correct: 1,
        why: 'Be to do — регламентное «надлежит». Так пишут распоряжения и инструкции: passengers are to remain seated.',
      },
      {
        q: 'Why does the notice end by comparing the field and the town?',
        options: [
          'To show the town is small and there will not be room for everyone',
          'To advertise the town',
          'To explain the prizes',
          'To describe the walls',
        ],
        correct: 0,
      },
    ],
  },

  // ── Алиса в Пограничье: карточка, наш текст ────────────────────────────────
  //
  // bucket: 'inspired'. Сериал японский, но у него есть официальная английская
  // дорожка, и берём мы у него только жанр: правила игры, объявление, записка.
  // Игры, город и люди здесь наши. Грамматическая нагрузка — must/may/may not
  // и страдательное долженствование, то есть ровно то, чем язык правил живёт.
  {
    id: 'sc-aib-1',
    workId: 'alice-borderland-en',
    lang: 'en', title: 'Карточка правил игры', level: 'B1', minutes: 2,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Каждая серия начинается одинаково: на экране появляются правила, и от того, насколько точно их прочитали, зависит всё остальное. Ниже наша карточка правил вымышленной игры. Читать её надо как читают в сериале — придираясь к каждому слову: разница между must и may здесь стоит жизни, и в этом весь смысл упражнения.',
    after: 'Обратите внимание на четвёртую строку: «говорить друг с другом можно, трогать друг друга нельзя». В сериале выигрывает не самый сильный, а тот, кто заметил, что именно правилами не запрещено.',
    body: `GAME: FOUR DOORS
DIFFICULTY: SIX OF CLUBS
TYPE: TEAM

RULES
There are four doors. Behind three of them is the corridor. Behind one of them is not.
Every player must pass through a door. No player may remain in this room.
You may not open a door and look. A door that has been opened must be entered within three seconds.
You may talk to one another. You may not touch one another.
The game ends when the room is empty.

CLEAR CONDITION
All surviving players reach the corridor before the timer reaches zero.

FAILURE CONDITION
The timer reaches zero while one or more players are still in this room.

TIME LIMIT: 04:00

Note: the doors are not marked and will not be marked. Anyone waiting for a clue is spending the time limit on it.`,
    translation: `ИГРА: ЧЕТЫРЕ ДВЕРИ
СЛОЖНОСТЬ: ШЕСТЁРКА ТРЕФ
ТИП: КОМАНДНАЯ

ПРАВИЛА
Дверей четыре. За тремя из них коридор. За одной — нет.
Каждый игрок обязан пройти в дверь. Оставаться в этой комнате нельзя никому.
Открыть дверь и заглянуть нельзя. В открытую дверь нужно войти в течение трёх секунд.
Разговаривать друг с другом можно. Прикасаться друг к другу нельзя.
Игра заканчивается, когда комната пуста.

УСЛОВИЕ ПРОХОЖДЕНИЯ
Все выжившие игроки попадают в коридор до того, как таймер дойдёт до нуля.

УСЛОВИЕ ПРОВАЛА
Таймер доходит до нуля, пока в этой комнате остаётся хотя бы один игрок.

ОГРАНИЧЕНИЕ ПО ВРЕМЕНИ: 04:00

Примечание: двери не помечены и помечены не будут. Тот, кто ждёт подсказки, тратит на это отведённое время.`,
    glossary: [
      { term: 'must', ru: 'обязан' },
      { term: 'may not', ru: 'нельзя, не разрешается' },
      { term: 'to remain', ru: 'оставаться' },
      { term: 'within three seconds', ru: 'в течение трёх секунд' },
      { term: 'one another', ru: 'друг друга' },
      { term: 'surviving', ru: 'выживший' },
      { term: 'clue', ru: 'подсказка, зацепка' },
      { term: 'time limit', ru: 'отведённое время' },
    ],
    questions: [
      {
        q: 'Is it allowed to open a door, look inside and step back?',
        options: [
          'Yes, once',
          'No — an opened door must be entered within three seconds',
          'Yes, if you do not touch it',
          'Only the first player may do it',
        ],
        correct: 1,
      },
      {
        q: 'What is the difference between "must" and "may" in these rules?',
        options: [
          'None, they are synonyms here',
          '"Must" is an obligation, "may" is a permission',
          '"May" is politer',
          '"Must" is only for the timer',
        ],
        correct: 1,
        why: 'Must — обязанность, may — разрешение, may not — запрет. В тексте правил это три разные вещи, и путать их нельзя.',
      },
      {
        q: 'What is explicitly allowed?',
        options: ['Touching', 'Talking', 'Looking behind a door', 'Staying in the room'],
        correct: 1,
      },
      {
        q: 'What does the note at the bottom tell the players to do?',
        options: [
          'Wait for a clue',
          'Stop waiting: there will be no clue, and waiting costs time',
          'Mark the doors themselves',
          'Read the rules again',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-aib-2',
    workId: 'alice-borderland-en',
    lang: 'en', title: 'Объявление в пустом городе', level: 'B2', minutes: 2,
    topic: 'Дом и город', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'В сериале город объясняет свои правила голосом из громкоговорителя — вежливо, спокойно и один раз. Ниже наше объявление в том же жанре. Здесь стоит смотреть на страдательный залог: «визу продлевают», «вас уведомят» — по-английски так говорят, когда действие есть, а ответственного нет. Это главный приём казённой речи, и на нём же держится жуть сериала.',
    after: 'Последняя строка — «удачи; слово употреблено условно» — приём, ради которого это и написано: сухая формула, а в конце одна фраза, которая её отменяет.',
    body: `ATTENTION. THIS IS AN AUTOMATED ANNOUNCEMENT. IT WILL NOT BE REPEATED.

Welcome to the city. There is no one here but the players.

Your visa expires at midnight tonight. A visa is extended only by clearing a game. It is extended by the number of days printed on the card of the game you clear, and by nothing else. It cannot be bought, borrowed or transferred.

Games begin at eight. Arenas are the buildings with a red light above the door. You may choose any arena. You may not leave an arena once a game has begun.

If your visa expires while you are inside the city, you will be notified. There is no appeal, and there is no need to look for the office that would hear one.

Water is running in the western districts only. The shops are open and unattended. Take what you need; nobody is counting.

That is all. Good luck. The word is used loosely.`,
    translation: `ВНИМАНИЕ. ЭТО АВТОМАТИЧЕСКОЕ ОБЪЯВЛЕНИЕ. ПОВТОРЕНО ОНО НЕ БУДЕТ.

Добро пожаловать в город. Здесь нет никого, кроме игроков.

Ваша виза истекает сегодня в полночь. Визу продлевают только за прохождение игры. Её продлевают на столько дней, сколько напечатано на карте пройденной игры, и ни на сколько больше. Её нельзя купить, одолжить или передать.

Игры начинаются в восемь. Арены — здания с красным фонарём над дверью. Выбрать можно любую арену. Покинуть арену после начала игры нельзя.

Если ваша виза истечёт, пока вы в городе, вас уведомят. Обжалованию это не подлежит, и искать инстанцию, где его приняли бы, не нужно.

Вода идёт только в западных районах. Магазины открыты и никем не заняты. Берите, что нужно; никто не считает.

Это всё. Удачи. Слово употреблено условно.`,
    glossary: [
      { term: 'to expire', ru: 'истекать (о сроке)' },
      { term: 'to extend', ru: 'продлевать' },
      { term: 'to clear a game', ru: 'пройти игру' },
      { term: 'to transfer', ru: 'передавать другому' },
      { term: 'you will be notified', ru: 'вас уведомят' },
      { term: 'appeal', ru: 'обжалование' },
      { term: 'unattended', ru: 'без присмотра, никем не занятый' },
      { term: 'loosely', ru: 'условно, приблизительно' },
    ],
    questions: [
      {
        q: 'How can a visa be extended?',
        options: [
          'By buying days',
          'Only by clearing a game',
          'By borrowing days from another player',
          'By waiting in an arena',
        ],
        correct: 1,
      },
      {
        q: 'What are the arenas?',
        options: [
          'The buildings with a red light above the door',
          'The buildings in the western districts',
          'The shops',
          'The stations',
        ],
        correct: 0,
      },
      {
        q: 'Why is almost every sentence passive ("is extended", "you will be notified")?',
        options: [
          'The English is incorrect',
          'It hides who does the action — the standard voice of official notices',
          'It is faster to say',
          'It makes the text politer',
        ],
        correct: 1,
        why: 'Страдательный залог убирает исполнителя. В объявлении это удобно и звучит нейтрально; здесь на этом и построен эффект — распоряжается никто.',
      },
      {
        q: 'What does the last line mean?',
        options: [
          'Good luck is guaranteed',
          'The speaker admits that "good luck" is not really the right word here',
          'The word was mispronounced',
          'Luck can be bought',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-aib-3',
    workId: 'alice-borderland-en',
    lang: 'en', title: 'Записка тому, кто придёт после', level: 'B2', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 3, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Человек, проживший в городе девятнадцать дней, оставляет инструкцию следующему — потому что ему самому такой инструкции не оставили. Ниже наш текст в этом жанре. Грамматически он держится на разнице настоящего совершённого и простого прошедшего: «я здесь девятнадцать дней» (и до сих пор) против «я потерял четыре дня» (тогда, и всё).',
    after: 'Последний абзац написан на случай, который автор записки считает вероятным, и написан в прошедшем времени — «значит, я не прошёл последнюю». Это единственное место, где он говорит о себе прямо.',
    body: `Whoever finds this —

I have been in the city for nineteen days. I am writing this because the person who was here before me left nothing, and I lost four days working out things he could have told me on one page.

Read it twice, then put it back where you found it.

The card that gives you days is the number. The suit tells you what kind of game it is, and the suit matters more. Clubs are team games. Hearts are games about people. If you are new, take clubs, take diamonds if you must, and stay away from hearts until you have watched one from the outside. I did not, and I am not going to write about it.

Nobody here is your friend on the first day and everybody is your friend on the fourth. That is not because people have become kinder. It is because by the fourth day they have understood that a team game cannot be cleared alone.

There is food in the apartment below this one. The elevator has not worked since I arrived.

If you are reading this and I have not come back for it, then I did not clear the last one. Do not go looking. There is nothing to find, and looking costs a day.`,
    translation: `Тому, кто это найдёт, —

Я в городе девятнадцать дней. Пишу это потому, что тот, кто был здесь до меня, не оставил ничего, и я потерял четыре дня, выясняя то, что он мог бы уместить на одной странице.

Прочитай дважды и положи обратно туда, где взял.

Дни тебе даёт число на карте. Масть говорит, какая это игра, и масть важнее. Трефы — командные игры. Черви — игры про людей. Если ты новичок, бери трефы, если надо — бубны, и держись подальше от червей, пока не посмотришь одну со стороны. Я не посмотрел и писать об этом не буду.

Здесь никто тебе не друг в первый день и все тебе друзья на четвёртый. Не потому, что люди подобрели. А потому, что к четвёртому дню до них доходит: командную игру в одиночку не пройти.

Еда есть в квартире этажом ниже. Лифт не работает с тех пор, как я сюда попал.

Если ты это читаешь, а я за запиской не вернулся — значит, последнюю я не прошёл. Не ходи искать. Искать нечего, а поиск стоит одного дня.`,
    glossary: [
      { term: 'whoever', ru: 'тот, кто; кто бы ни' },
      { term: 'to work something out', ru: 'выяснить, докопаться' },
      { term: 'suit', ru: 'масть' },
      { term: 'clubs / hearts / diamonds', ru: 'трефы / черви / бубны' },
      { term: 'to stay away from', ru: 'держаться подальше от' },
      { term: 'from the outside', ru: 'со стороны' },
      { term: 'to cost', ru: 'стоить (в том числе времени)' },
    ],
    questions: [
      {
        q: 'Why is the note written at all?',
        options: [
          'Because the rules require it',
          'Because nobody left one for the writer, and he lost days because of that',
          'To ask for help',
          'To leave a map',
        ],
        correct: 1,
      },
      {
        q: 'What does the writer advise about hearts?',
        options: [
          'Play them first, they are easy',
          'Avoid them until you have seen one from the outside',
          'Play them only in a team',
          'They do not exist',
        ],
        correct: 1,
      },
      {
        q: 'Why does everybody become friendly by the fourth day?',
        options: [
          'People get used to each other',
          'Because they realise a team game cannot be cleared alone',
          'Because the games get easier',
          'Because the visa is longer',
        ],
        correct: 1,
      },
      {
        q: 'Why "I have been in the city for nineteen days" but "I lost four days"?',
        options: [
          'It is a mistake',
          'The first is still true now; the second happened and finished',
          'The second is more formal',
          'They are interchangeable',
        ],
        correct: 1,
        why: 'Present perfect тянет действие в настоящее («и до сих пор здесь»), past simple закрывает его в прошлом. Это самая частая пара ошибок у русскоязычных.',
      },
    ],
  },

  // ── Офис: карточка, наш текст ──────────────────────────────────────────────
  //
  // bucket: 'inspired'. Компания, отдел и сотрудники здесь наши. От сериала —
  // жанр и регистр: офисная переписка, повестка и аттестация, где вежливая
  // формула прикрывает недовольство. Самый практичный текст полки.
  {
    id: 'sc-office-1',
    workId: 'the-office-us',
    lang: 'en', title: 'Письмо всем сотрудникам про кухню', level: 'B1', minutes: 2,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Весь юмор «Офиса» держится на разрыве между тем, что написано, и тем, что имеется в виду. Ниже наше письмо от административного отдела — жанр, который вы точно встретите на настоящей работе. Здесь важно не содержание, а формулы: «just a quick note», «going forward», «thanks in advance» — вежливые прокладки, за которыми лежит требование.',
    after: 'Ключ к жанру — фраза «a friendly reminder». По-английски «дружеское напоминание» почти всегда означает, что напоминают не в первый раз и уже не по-дружески.',
    body: `From: Facilities
To: All Staff
Subject: A friendly reminder about the kitchen

Hi everyone,

Just a quick note about the kitchen, since a few of you have raised it.

The fridge is cleared out every Friday at 5 p.m. Anything without a name on it goes in the trash. This is not a new policy. It has been the policy since 2011.

Please rinse your mug. The sign above the sink says "your mother does not work here", which is not something I would have written myself, but it was there before my time and I am not going to be the one to take it down.

Whoever is putting fish in the microwave: we know that you exist. We do not know who you are, and honestly at this point that is worse.

Going forward, let's keep the kitchen a space we can all enjoy.

Thanks in advance for your cooperation,
Facilities`,
    translation: `От: административный отдел
Кому: всем сотрудникам
Тема: дружеское напоминание про кухню

Всем привет,

Пара слов про кухню — раз уж некоторые из вас об этом заговорили.

Холодильник разбирают каждую пятницу в 17:00. Всё, что без подписи, отправляется в мусор. Это не новое правило. Оно действует с 2011 года.

Пожалуйста, ополаскивайте свою кружку. Табличка над раковиной гласит «твоя мама здесь не работает» — сам бы я так не написал, но она висела до меня, и снимать её я не собираюсь.

Тому, кто разогревает рыбу в микроволновке: мы знаем, что вы существуете. Мы не знаем, кто вы, и, честно говоря, на этом этапе это даже хуже.

Впредь давайте поддерживать кухню пространством, которым все мы можем наслаждаться.

Заранее спасибо за содействие,
административный отдел`,
    glossary: [
      { term: 'facilities', ru: 'административно-хозяйственный отдел' },
      { term: 'just a quick note', ru: 'пара слов; вежливое начало письма' },
      { term: 'to raise something', ru: 'поднять вопрос' },
      { term: 'to clear out', ru: 'разобрать, освободить' },
      { term: 'to rinse', ru: 'ополоснуть' },
      { term: 'going forward', ru: 'впредь, начиная с этого момента' },
      { term: 'thanks in advance', ru: 'заранее спасибо' },
      { term: 'at this point', ru: 'на этом этапе, к настоящему моменту' },
    ],
    questions: [
      {
        q: 'What happens to food without a name on it?',
        options: ['It is moved to another shelf', 'It is thrown away on Friday', 'It is labelled by Facilities', 'Nothing'],
        correct: 1,
      },
      {
        q: 'What does "a friendly reminder" usually signal in an office email?',
        options: [
          'The sender is genuinely happy',
          'The sender is annoyed and is saying so politely',
          'The message is optional',
          'The message is for new staff only',
        ],
        correct: 1,
      },
      {
        q: 'What does "going forward" mean?',
        options: ['moving ahead physically', 'from now on', 'in the past', 'quickly'],
        correct: 1,
      },
      {
        q: 'Why does the writer mention the sign above the sink?',
        options: [
          'To take responsibility for it',
          'To repeat the message without being the one who said it',
          'To ask for a new sign',
          'To praise the person who wrote it',
        ],
        correct: 1,
        why: '«Not something I would have written myself» — классический офисный ход: требование передаётся, ответственность за формулировку — нет.',
      },
    ],
  },
  {
    id: 'sc-office-2',
    workId: 'the-office-us',
    lang: 'en', title: 'Повестка совещания', level: 'B1', minutes: 3,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Совещание в «Офисе» — отдельный жанр: полчаса по плану, полтора по факту. Ниже наша повестка. Она собрана из слов, которые придётся понимать на любой международной работе: sync, action item, offline, EOD, circle back. Каждое из них значит не то, что кажется по словарю.',
    after: 'Самая полезная строка здесь — «anyone who says „let us circle back“ must say when». Circle back («вернёмся к этому») в офисной речи чаще всего означает «не вернёмся», и правило существует именно поэтому.',
    body: `QUARTERLY SYNC — AGENDA
Conference room B, Thursday, 10:00–10:30 (11:15)

10:00 — Welcome and a "quick" round of introductions. There are nine of us and we have all met.
10:05 — Q3 numbers. The slides will be circulated afterwards, so there is no need to photograph the screen.
10:12 — Regional targets. We are behind on two of them. We will not be discussing which two, because the person responsible is in the room and this is not that kind of meeting.
10:20 — Any other business.
10:25 — Action items and owners.

BEFORE THE MEETING
Please read the one-page summary. It is one page. It is genuinely one page.

HOUSE RULES
If you have nothing to add, you may keep your camera off and say nothing. This is allowed and always has been.
"Let's take that offline" means we will discuss it later and not in front of everyone. It does not mean the subject is closed.
Anyone who says "let's circle back" must say when.

AFTER THE MEETING
Action items go out by EOD. If your name is next to one and you disagree, reply to the email — not to me in the corridor.`,
    translation: `КВАРТАЛЬНАЯ СИНХРОНИЗАЦИЯ — ПОВЕСТКА
Переговорная Б, четверг, 10:00–10:30 (11:15)

10:00 — Приветствие и «быстрый» круг знакомства. Нас девять, и мы все знакомы.
10:05 — Показатели третьего квартала. Слайды разошлём после, так что фотографировать экран не нужно.
10:12 — Региональные планы. По двум мы отстаём. Обсуждать, по каким именно, не будем: ответственный сидит в этой комнате, а совещание не того рода.
10:20 — Разное.
10:25 — Задачи и ответственные.

ДО СОВЕЩАНИЯ
Пожалуйста, прочитайте сводку на одну страницу. Она на одну страницу. Она правда на одну страницу.

ПРАВИЛА
Если вам нечего добавить, камеру можно не включать и можно молчать. Так можно и всегда было можно.
«Обсудим это отдельно» значит, что обсудим позже и не при всех. Это не значит, что вопрос закрыт.
Тот, кто говорит «вернёмся к этому», обязан сказать когда.

ПОСЛЕ СОВЕЩАНИЯ
Список задач разошлём до конца дня. Если рядом с задачей стоит ваше имя, а вы не согласны, отвечайте на письмо, а не мне в коридоре.`,
    glossary: [
      { term: 'sync', ru: 'сверка, короткое регулярное совещание' },
      { term: 'agenda', ru: 'повестка' },
      { term: 'to circulate', ru: 'разослать по всем' },
      { term: 'to be behind on', ru: 'отставать по (плану)' },
      { term: 'any other business (AOB)', ru: 'разное — последний пункт повестки' },
      { term: 'action item', ru: 'задача по итогам совещания' },
      { term: 'to take something offline', ru: 'обсудить отдельно, не при всех' },
      { term: 'to circle back', ru: 'вернуться к вопросу позже' },
      { term: 'EOD (end of day)', ru: 'до конца рабочего дня' },
    ],
    questions: [
      {
        q: 'What does "let\'s take that offline" mean in a meeting?',
        options: [
          'Turn off the internet',
          'We will discuss it separately, not in front of everyone',
          'The subject is closed',
          'Write it down',
        ],
        correct: 1,
      },
      {
        q: 'Why is there a rule about "let\'s circle back"?',
        options: [
          'Because the phrase is rude',
          'Because without a date it usually means the subject is quietly dropped',
          'Because it is American slang',
          'Because it takes too long to say',
        ],
        correct: 1,
      },
      {
        q: 'What does the "(11:15)" after the scheduled end time tell you?',
        options: [
          'The room is booked until then',
          'The meeting is expected to overrun',
          'A second meeting starts then',
          'It is a typo',
        ],
        correct: 1,
      },
      {
        q: 'What is an "action item"?',
        options: [
          'A point on the agenda',
          'A task with a person responsible for it',
          'A slide',
          'A question from the audience',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-office-3',
    workId: 'the-office-us',
    lang: 'en', title: 'Аттестация сотрудника', level: 'B2', minutes: 3,
    topic: 'Обратная связь', skill: 'Чтение',
    order: 3, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Ежегодная аттестация — то место, где английская вежливость становится техническим языком: у каждой формулировки есть точный смысл и цена. Ниже наш заполненный бланк. «Meets expectations» — это не похвала, а средняя оценка; «areas for improvement» — это раздел, где написано, что не так.',
    after: 'Ответ сотрудника и реакция руководителя в конце — тоже жанр: возражение принимают («noted»), по существу отклоняют и тут же делают маленькую уступку, чтобы разговор закончился хорошо.',
    body: `ANNUAL PERFORMANCE REVIEW — SALES

Employee: (name withheld)
Reviewer: Regional Manager
Overall rating: Meets expectations

STRENGTHS
Consistently exceeds his call targets. Clients ask for him by name, which is rare and which we should not take for granted.

AREAS FOR IMPROVEMENT
Punctuality. Arrived after 9:15 on thirty-one occasions this year and, when asked, gave thirty-one different reasons, none of which was traffic. That is at least creative.
Paperwork is submitted late and occasionally on the back of other paperwork.

GOALS FOR NEXT YEAR
1. Submit expense reports within five working days. (This was last year's goal. It has been carried over.)
2. Train one new member of the team. This is not a punishment. It is because you are good at the part of the job that cannot be written down.

EMPLOYEE COMMENTS
"I feel that the punctuality section does not reflect the fact that I stay late. I would also like it noted that the coffee machine on our floor has been broken since March and that this is relevant."

REVIEWER RESPONSE
Noted. The coffee machine is not relevant. It is, however, being replaced.`,
    translation: `ЕЖЕГОДНАЯ АТТЕСТАЦИЯ — ОТДЕЛ ПРОДАЖ

Сотрудник: (имя не указано)
Проверяющий: региональный руководитель
Общая оценка: соответствует ожиданиям

СИЛЬНЫЕ СТОРОНЫ
Стабильно перевыполняет план по звонкам. Клиенты спрашивают его по имени — это редкость, и принимать её как должное не следует.

ЧТО СЛЕДУЕТ УЛУЧШИТЬ
Пунктуальность. За год тридцать один раз пришёл позже 9:15 и на вопрос «почему» назвал тридцать одну разную причину, ни одна из которых не была «пробки». Это по меньшей мере изобретательно.
Документы сдаёт с опозданием, а иногда — на обороте других документов.

ЦЕЛИ НА СЛЕДУЮЩИЙ ГОД
1. Сдавать авансовые отчёты в течение пяти рабочих дней. (Это была цель прошлого года. Она перенесена.)
2. Обучить одного новичка. Это не наказание. Это потому, что вы хороши в той части работы, которую нельзя изложить письменно.

КОММЕНТАРИЙ СОТРУДНИКА
«Считаю, что раздел о пунктуальности не отражает того, что я задерживаюсь по вечерам. Также прошу зафиксировать, что кофемашина на нашем этаже сломана с марта и что это имеет отношение к делу».

ОТВЕТ РУКОВОДИТЕЛЯ
Принято к сведению. Кофемашина отношения к делу не имеет. Её, впрочем, меняют.`,
    glossary: [
      { term: 'performance review', ru: 'аттестация, оценка работы' },
      { term: 'meets expectations', ru: 'соответствует ожиданиям — средняя оценка' },
      { term: 'to exceed a target', ru: 'перевыполнить план' },
      { term: 'to take for granted', ru: 'принимать как должное' },
      { term: 'areas for improvement', ru: 'что следует улучшить' },
      { term: 'to carry over', ru: 'перенести на следующий период' },
      { term: 'expense report', ru: 'авансовый отчёт' },
      { term: 'noted', ru: 'принято к сведению' },
    ],
    questions: [
      {
        q: 'Is "meets expectations" praise?',
        options: [
          'Yes, it is the highest rating',
          'No, it is the middle rating — the job is done, nothing more',
          'It means the employee failed',
          'It is not a rating at all',
        ],
        correct: 1,
      },
      {
        q: 'What does "carried over" tell you about goal 1?',
        options: [
          'It is a new goal',
          'It was set last year and was not achieved',
          'It has been cancelled',
          'It was achieved early',
        ],
        correct: 1,
      },
      {
        q: 'Why is training a new colleague not a punishment, according to the reviewer?',
        options: [
          'Because it is paid extra',
          'Because the employee is good at the part of the job that cannot be written down',
          'Because everyone has to do it',
          'Because it is easy',
        ],
        correct: 1,
      },
      {
        q: 'What does the reviewer\'s "Noted." do?',
        options: [
          'Accepts the objection',
          'Records the objection without agreeing with it',
          'Rejects it rudely',
          'Asks for more detail',
        ],
        correct: 1,
        why: 'Noted — «принято к сведению». Формально вежливо, по существу ничего не обещает; в переписке это очень частый ответ.',
      },
    ],
  },

  // ── Шерлок: карточка, наш текст ────────────────────────────────────────────
  //
  // bucket: 'inspired'. Ни Холмса, ни Ватсона, ни их дел: рассказчик, сосед и
  // случай придуманы нами. От сериала — британский современный регистр и
  // грамматика дедукции: must have, can’t have, would have.
  {
    id: 'sc-sherlock-1',
    workId: 'sherlock-bbc',
    lang: 'en', title: 'Блог очень обычного врача', level: 'B2', minutes: 4,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'В сериале дела пересказывает не гений, а врач, который ведёт про него блог, — и это удачное решение: гений говорит быстро и непонятно, а врач медленно и по-человечески. Ниже наш текст в том же жанре и с тем же устройством: обычный рассказчик, необычный сосед и одно наблюдение в конце.',
    after: 'Приём, на котором держится весь жанр: разгадка объясняется в трёх предложениях и через бытовую деталь — марки куплены одним блоком, номера подряд. Читателю должно быть обидно, что он не заметил сам.',
    body: `THE BLOG OF A VERY ORDINARY DOCTOR
Entry 14: The man who was not on holiday

I have been told that a blog needs a title and a photograph. It is getting the title.

Some background, for anyone who has just found this. I am a doctor. Nine months ago I moved into the upstairs flat of a house in Camden because it was cheap, and it was cheap because of the man who lives downstairs. I have never once seen him buy food. He has told me, without being asked, my shoe size, the month my father died and the reason my last job ended.

On Tuesday a woman came to the door and said that her brother had gone on holiday to Portugal three weeks ago and had sent a postcard every single day since.

"Then he is not on holiday," said the man downstairs, before she had taken her coat off.

I asked him afterwards how he could possibly know that from a postcard. He looked genuinely puzzled, the way people look when you ask them how they know it is raining.

"Nobody writes every day," he said. "People on holiday write once, near the end, when they start feeling guilty. Somebody wanted her to believe he was there. And the stamps were bought together — same block, running numbers. Whoever posted them bought three weeks of holiday in a single afternoon."

He was right, of course. He is going to be unbearable about it for a week.`,
    translation: `БЛОГ ОЧЕНЬ ОБЫЧНОГО ВРАЧА
Запись 14: человек, которого не было в отпуске

Мне сказали, что блогу нужны заголовок и фотография. Заголовок он получит.

Немного предыстории для тех, кто только сюда попал. Я врач. Девять месяцев назад я снял верхнюю квартиру в доме в Кэмдене, потому что было дёшево, — а дёшево было из-за человека, который живёт этажом ниже. Я ни разу не видел, чтобы он покупал еду. Он сообщил мне, без всякого вопроса с моей стороны, мой размер обуви, месяц смерти моего отца и причину, по которой я ушёл с прошлой работы.

Во вторник пришла женщина и сказала, что её брат три недели назад уехал в отпуск в Португалию и с тех пор каждый день присылает открытку.

«Значит, он не в отпуске», — сказал сосед снизу, прежде чем она успела снять пальто.

Потом я спросил его, как вообще можно это понять по открытке. Он выглядел искренне озадаченным — так люди выглядят, когда их спрашивают, откуда они знают, что идёт дождь.

«Никто не пишет каждый день, — сказал он. — В отпуске пишут один раз, ближе к концу, когда начинает мучить совесть. Кто-то хотел, чтобы она думала, будто он там. И марки куплены разом: один блок, номера подряд. Тот, кто их отправлял, купил три недели отпуска за один день».

Он, разумеется, был прав. И теперь неделю будет невыносим.`,
    glossary: [
      { term: 'background', ru: 'предыстория, вводные' },
      { term: 'flat', ru: 'квартира (брит.); в США apartment' },
      { term: 'every single day', ru: 'каждый божий день' },
      { term: 'genuinely', ru: 'искренне, по-настоящему' },
      { term: 'puzzled', ru: 'озадаченный' },
      { term: 'running numbers', ru: 'номера подряд' },
      { term: 'to post', ru: 'отправить почтой (брит.); в США to mail' },
      { term: 'unbearable', ru: 'невыносимый' },
    ],
    questions: [
      {
        q: 'Why does the daily postcard prove the brother is not on holiday?',
        options: [
          'Portugal has no post on Sundays',
          'People on holiday do not write every day — someone was building an alibi',
          'The handwriting was wrong',
          'Postcards take longer than three weeks',
        ],
        correct: 1,
      },
      {
        q: 'What do the stamps show?',
        options: [
          'They were bought at different post offices',
          'They came from one block with consecutive numbers, so they were bought at once',
          'They were forged',
          'They were Portuguese',
        ],
        correct: 1,
      },
      {
        q: '"before she had taken her coat off" tells you that…',
        options: [
          'he answered extremely quickly',
          'she stayed a long time',
          'the coat was important',
          'the room was cold',
        ],
        correct: 0,
        why: 'Past perfect здесь ставит одно действие раньше другого: он уже ответил, а она ещё даже не разделась.',
      },
      {
        q: 'What is the narrator\'s attitude to his neighbour?',
        options: [
          'Admiration mixed with irritation',
          'Fear',
          'Complete indifference',
          'Open dislike',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'sc-sherlock-2',
    workId: 'sherlock-bbc',
    lang: 'en', title: 'Что видно по человеку', level: 'C1', minutes: 4,
    topic: 'Знакомство', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Самое известное, что есть в «Шерлоке», — монолог-дедукция: от мелочи к выводу за одну фразу. По-английски он целиком собран на модальных глаголах предположения, и это, пожалуй, лучший учебный текст на всю тему: must have decided — «наверняка решил», would have taken — «снял бы, если бы». Ниже наш монолог того же устройства.',
    after: 'Последний абзац объясняет метод: сначала выслушивают заготовленную версию, потому что настоящая причина всегда лежит внутри неё. Это и есть разница между «догадаться» и «дать человеку договорить».',
    body: `Sit down. Do not tell me anything about yourself; it is quicker if you don't.

You have come straight from a train, and not a long journey — you would have taken your coat off by now if you had been travelling since morning, and you haven't. Under an hour, then.

You are left-handed. You put your bag down on your right so that your left hand stayed free, which is not something anyone does on purpose.

You have a dog, a large one, and you got it recently. There is hair on the left side of your coat and nowhere else, so the dog walks on your left; and the hair is on the wool rather than in it, which means the coat has not been brushed and then worn again. An owner of some years learns to brush the coat on the way out. You haven't learned yet.

You were not planning to come here today. You must have decided this morning: you are wearing yesterday's shirt with today's jacket, and nobody who has planned a visit does that.

And you are not going to tell me the real reason for another ten minutes, because you have rehearsed a different one. That is fine. I would rather hear the rehearsed one first. People put the true thing in the middle of the false one and never notice they have done it.`,
    translation: `Садитесь. Не рассказывайте мне о себе ничего — так быстрее.

Вы приехали прямо с поезда, и дорога была недолгой: если бы вы ехали с утра, то к этому времени уже сняли бы пальто, а вы его не сняли. Значит, меньше часа.

Вы левша. Сумку вы поставили справа, чтобы левая рука осталась свободной, — а это никто не делает нарочно.

У вас собака, крупная, и завели вы её недавно. Шерсть на пальто только слева — значит, собака идёт слева; и шерсть лежит на ткани, а не въелась в неё, значит, пальто не чистили и не надевали снова. Тот, у кого собака давно, приучается чистить пальто на выходе. Вы ещё не приучились.

Идти сюда вы сегодня не собирались. Решили наверняка утром: на вас вчерашняя рубашка и сегодняшний пиджак, а так не делает никто, кто планировал визит.

И настоящую причину вы мне не назовёте ещё минут десять, потому что отрепетировали другую. Ничего страшного. Я предпочту сперва выслушать отрепетированную: люди кладут правду в середину выдумки и сами этого не замечают.`,
    glossary: [
      { term: 'straight from', ru: 'прямо с, сразу после' },
      { term: 'you would have taken', ru: 'вы бы сняли (нереальное прошлое)' },
      { term: 'you must have decided', ru: 'вы наверняка решили (уверенное предположение)' },
      { term: 'on purpose', ru: 'нарочно' },
      { term: 'rather than', ru: 'а не; скорее чем' },
      { term: 'to rehearse', ru: 'отрепетировать' },
      { term: 'I would rather', ru: 'я предпочёл бы' },
    ],
    questions: [
      {
        q: 'How does he know the journey was short?',
        options: [
          'The visitor said so',
          'A person travelling since morning would have taken the coat off, and this one has not',
          'There was no luggage',
          'The train timetable',
        ],
        correct: 1,
      },
      {
        q: 'What tells him the dog is new?',
        options: [
          'The dog is small',
          'The hair lies on top of the wool — an experienced owner brushes the coat before going out',
          'There is no lead',
          'The visitor smells of a pet shop',
        ],
        correct: 1,
      },
      {
        q: '"You must have decided this morning" expresses…',
        options: [
          'an obligation',
          'a confident guess about the past',
          'a plan',
          'a polite request',
        ],
        correct: 1,
        why: 'Must have done — «наверняка сделал». Обязанность здесь ни при чём: must + perfect infinitive — это уверенный вывод о прошлом.',
      },
      {
        q: 'Why does he prefer to hear the rehearsed reason first?',
        options: [
          'It is shorter',
          'Because people hide the true thing inside the invented one',
          'To be polite',
          'To gain time',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-sherlock-3',
    workId: 'sherlock-bbc',
    lang: 'en', title: 'Переписка в половине девятого', level: 'B1', minutes: 2,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 3, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Сериал первым додумался выводить смс прямо на экран — и половина реплик там короче трёх слов. Ниже наша переписка того же типа. Учит она одному важному: в британской короткой речи вежливость и приказ выражаются почти одинаково, и различать их приходится по глаголу.',
    after: 'Вся соль в предпоследних строках: «ты сказал, что тебя пригласили» — «я сказал, что за мной послали. Другое слово». To be sent for и to be invited по-русски оба «позвали», а по-английски это разные истории.',
    body: `20:41  Come now if you can.
20:41  If you can't, come anyway.
20:52  I'm at work. I am literally holding someone's hand while they have an injection.
20:52  Let go of it.
20:53  That is not how any of this works.
20:53  Bring your bag. The one with the gloves, not the one with the ties.
20:54  Where?
20:54  You'll know the street when you get to it. Everyone will be standing outside a building looking at their phones.
21:14  I'm outside. There are three police cars.
21:14  Yes.
21:15  You said you'd been invited.
21:15  I said I'd been sent for. Different word. Come in — they've stopped arguing about it.`,
    translation: `20:41  Приходи сейчас, если можешь.
20:41  Если не можешь — приходи всё равно.
20:52  Я на работе. Я буквально держу человека за руку, пока ему делают укол.
20:52  Отпусти.
20:53  Это так не работает.
20:53  Возьми сумку. Ту, что с перчатками, а не ту, что с галстуками.
20:54  Куда?
20:54  Ты поймёшь, что улица та, когда дойдёшь. Все будут стоять у здания и смотреть в телефоны.
21:14  Я на месте. Тут три полицейские машины.
21:14  Да.
21:15  Ты сказал, что тебя пригласили.
21:15  Я сказал, что за мной послали. Другое слово. Заходи — они уже перестали об этом спорить.`,
    glossary: [
      { term: 'anyway', ru: 'всё равно, так или иначе' },
      { term: 'literally', ru: 'буквально' },
      { term: 'injection', ru: 'укол' },
      { term: 'to let go of', ru: 'отпустить' },
      { term: 'to be invited', ru: 'быть приглашённым' },
      { term: 'to be sent for', ru: 'за кем-то послали; вызвали' },
      { term: 'you’ll know it when you get to it', ru: 'дойдёшь — поймёшь' },
    ],
    questions: [
      {
        q: 'What is the difference between "invited" and "sent for"?',
        options: [
          'None',
          '"Invited" is a request you may refuse; "sent for" means someone had you called in',
          '"Sent for" is politer',
          '"Invited" is only used in writing',
        ],
        correct: 1,
      },
      {
        q: 'Why does the second person say "That is not how any of this works"?',
        options: [
          'The advice to let go of the patient\'s hand is absurd',
          'The address was wrong',
          'The phone is broken',
          'He does not know the way',
        ],
        correct: 0,
      },
      {
        q: 'How will he recognise the street?',
        options: [
          'By the number',
          'By a crowd standing outside a building looking at their phones',
          'By the police cars only',
          'He is sent a photograph',
        ],
        correct: 1,
      },
    ],
  },

  // ── Уэнздей: карточка, наш текст ───────────────────────────────────────────
  //
  // bucket: 'inspired'. Школа, соседка и правила придуманы нами; ни одного
  // персонажа Аддамсов здесь нет. От сериала — интонация: ирония, сказанная
  // ровным голосом, и запреты, которые звучат как приглашение.
  {
    id: 'sc-wed-1',
    workId: 'wednesday',
    lang: 'en', title: 'Правила для новых учеников', level: 'B1', minutes: 2,
    topic: 'Учёба', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Закрытая школа в готических декорациях — место, где всё начинается с правил. Ниже наш свод правил для новичков. Полезен он тем, что в нём подряд стоят все способы сказать «можно» и «нельзя»: must not, may, are allowed to — и один пункт, где правила нет, а работает оно сильнее любого запрета.',
    after: 'Обратите внимание на шестой пункт: посреди готики и запертых дверей школа спокойно говорит про тоску по дому и предлагает прийти и сказать. Хорошие правила всегда где-то в середине становятся человеческими.',
    body: `NIGHTSHADE ACADEMY — RULES FOR NEW STUDENTS

Read these once. We will not be reading them to you.

1. Lights out at eleven. The library stays open later, but the library is not a bedroom and the librarian will notice.
2. You must not go into the woods after dark. You may go into the woods before dark, though we would ask you to consider why you want to.
3. Pets are allowed if they fit in a cage. Nothing that has to be fed live food may be kept in a shared room.
4. The uniform is black. There is no rule about this. It is simply what everyone wears, which is a stronger rule.
5. If you break something in the music room, tell someone. We have a list of what is in there and we check it.
6. Homesickness is normal in the first two weeks. Come to the office and say so. You will not be the first this term, or this week, or today.
7. The third-floor door that does not open has not opened for sixty years and is not going to open for you.

Welcome to Nightshade. Most of you will be fine.`,
    translation: `АКАДЕМИЯ «НАЙТШЕЙД» — ПРАВИЛА ДЛЯ НОВЫХ УЧЕНИКОВ

Прочитайте это один раз. Вслух вам их читать никто не будет.

1. Отбой в одиннадцать. Библиотека работает дольше, но библиотека — не спальня, и библиотекарь это заметит.
2. В лес после наступления темноты ходить нельзя. До темноты — можно, хотя мы попросили бы вас подумать, зачем вам туда.
3. Домашние животные разрешены, если помещаются в клетку. Всё, что приходится кормить живым кормом, держать в общей комнате нельзя.
4. Форма чёрная. Правила об этом нет. Просто так одеваются все, а это правило посильнее.
5. Если вы что-то сломали в музыкальном классе, скажите об этом. У нас есть список того, что там стоит, и мы его сверяем.
6. Тоска по дому в первые две недели — это нормально. Придите в канцелярию и скажите. Вы будете не первым в этом семестре, на этой неделе и даже сегодня.
7. Дверь на третьем этаже, которая не открывается, не открывается шестьдесят лет и для вас тоже не откроется.

Добро пожаловать в «Найтшейд». С большинством из вас всё будет хорошо.`,
    glossary: [
      { term: 'lights out', ru: 'отбой' },
      { term: 'must not', ru: 'нельзя (запрет)' },
      { term: 'to be allowed to', ru: 'разрешается' },
      { term: 'shared room', ru: 'общая комната' },
      { term: 'homesickness', ru: 'тоска по дому' },
      { term: 'term', ru: 'учебный семестр' },
      { term: 'to consider', ru: 'подумать, взвесить' },
    ],
    questions: [
      {
        q: 'Are students allowed in the woods?',
        options: [
          'Never',
          'Yes, but not after dark',
          'Only with a teacher',
          'Only in the first two weeks',
        ],
        correct: 1,
      },
      {
        q: 'What does rule 4 say about the black uniform?',
        options: [
          'It is compulsory by the rules',
          'There is no rule — but everyone wears it, which works even better',
          'It is only for the first year',
          'It was cancelled',
        ],
        correct: 1,
        why: 'Тут разница между must (правило) и «так делают все». Английский текст показывает вторую силу прямо: «which is a stronger rule».',
      },
      {
        q: 'What is "homesickness"?',
        options: [
          'An illness you catch at home',
          'Missing home and the people there',
          'Being tired of school',
          'A holiday',
        ],
        correct: 1,
      },
      {
        q: 'Why does rule 6 add "or this week, or today"?',
        options: [
          'To fill space',
          'To tell the student they are not alone or unusual',
          'To set a deadline',
          'To say the office is busy',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-wed-2',
    workId: 'wednesday',
    lang: 'en', title: 'Письмо домой, неделя первая', level: 'B2', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Главное в этом сериале — не готика, а интонация: героиня говорит ровно и вежливо, а получается язвительно. По-английски это делается конкретными средствами, и в письме их видно лучше, чем в диалоге. Ниже наше письмо домой из закрытой школы — ровно на этой интонации.',
    after: 'Обратите внимание на «я не несчастна. Хочу, чтобы это было зафиксировано, — чтобы потом это нельзя было использовать против меня». Признание, оформленное как юридическая оговорка, — самый узнаваемый приём такого героя.',
    body: `Dear Mother and Father,

You asked me to write every week. This is the letter for week one. I will be numbering them, so that you can tell when one has gone missing.

The school is exactly as described in the brochure, which is the first disappointing thing about it. My room has two beds. The other bed has a person in it. She is relentlessly cheerful, she says good morning as though it were an opinion she holds strongly, and she has hung a poster above my desk. I have not taken it down. I am keeping it as evidence.

The food is fine. I know you will find that suspicious. So do I.

I have been placed in the fencing class, which I did not choose and which I am now not going to leave, because I am better at it than the boy who told me I would not be.

There is a rule here that students may not go into the woods after dark. Nobody has explained the rule. A rule without a reason is an invitation, and I intend to accept it.

Do not send more sweaters. Do send the black envelopes, the small ones.

I am not unhappy. I would like that on the record, so that it cannot be used against me later.

Your daughter,
who is counting the weeks and will tell you the number when it becomes relevant`,
    translation: `Дорогие мама и папа,

Вы просили писать каждую неделю. Это письмо за первую. Я буду их нумеровать, чтобы вы понимали, когда какое-то не дошло.

Школа в точности такая, как в буклете, и это первое, что в ней разочаровывает. В комнате две кровати. На второй кровати есть человек. Она неутомимо жизнерадостна, говорит «доброе утро» так, будто это её твёрдое убеждение, и повесила над моим столом плакат. Я его не сняла. Я храню его как улику.

Еда нормальная. Знаю, вам это покажется подозрительным. Мне тоже.

Меня записали в секцию фехтования, которую я не выбирала и из которой теперь не уйду, потому что я в ней лучше того мальчика, который сказал, что не буду.

Здесь есть правило: после наступления темноты в лес ходить нельзя. Правило никто не объяснил. Правило без причины — это приглашение, и я намерена его принять.

Свитеров больше не присылайте. Присылайте чёрные конверты, маленькие.

Я не несчастна. Хочу, чтобы это было зафиксировано — чтобы потом это нельзя было использовать против меня.

Ваша дочь,
которая считает недели и назовёт число, когда оно будет иметь значение`,
    glossary: [
      { term: 'to go missing', ru: 'пропасть, потеряться' },
      { term: 'relentlessly', ru: 'неутомимо, без передышки' },
      { term: 'as though it were', ru: 'как будто это (сослагательное)' },
      { term: 'evidence', ru: 'улика, доказательство' },
      { term: 'to be placed in', ru: 'быть записанным, определённым куда-то' },
      { term: 'to intend to', ru: 'намереваться' },
      { term: 'on the record', ru: 'официально, под запись' },
      { term: 'to be used against someone', ru: 'быть использованным против кого-то' },
    ],
    questions: [
      {
        q: 'Why is she numbering the letters?',
        options: [
          'To keep them in order for herself',
          'So that her parents can see if one does not arrive',
          'Because the school requires it',
          'To count the weeks left',
        ],
        correct: 1,
      },
      {
        q: 'How does she feel about her roommate?',
        options: [
          'She hates her',
          'She is irritated but has not actually done anything about it',
          'They are already friends',
          'She has not met her',
        ],
        correct: 1,
        why: 'Ключ — «I have not taken it down». Сарказм есть, действия нет: она оставила плакат и назвала его уликой.',
      },
      {
        q: 'What does she mean by "a rule without a reason is an invitation"?',
        options: [
          'Rules should be explained to guests',
          'An unexplained ban makes her want to break it',
          'The rule does not apply to her',
          'The rule was cancelled',
        ],
        correct: 1,
      },
      {
        q: 'Why does she want "I am not unhappy" on the record?',
        options: [
          'She is joking about legal language to admit something without softening',
          'She is writing a formal complaint',
          'Her parents asked for a report',
          'It is a school requirement',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'sc-wed-3',
    workId: 'wednesday',
    lang: 'en', title: 'Школьная газета', level: 'B2', minutes: 3,
    topic: 'Учёба', skill: 'Чтение',
    order: 3, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Школьная газета в таком сериале — единственное место, где ученики говорят сами за себя, и потому её всё время правят сверху. Ниже наш номер: спортивная заметка, объявление, потери и колонка редактора. Английский здесь ровно тот, на котором пишут школьные и студенческие издания, — сдержанный и очень ироничный.',
    after: 'Колонка редактора в конце — самая честная часть номера: «эту газету цензурируют. Да. Вот адрес, по которому можно принести то, что не напечатают». И приписка, что само это предложение согласовывали две недели.',
    body: `THE NIGHTSHADE HERALD · Student newspaper · Issue 112

FENCING BEATS ST AUBREY'S FOR THE FIRST TIME IN NINE YEARS
The final bout went to a single point. The club would like to thank everyone who came to watch, and would like to remind everyone else that the results are on the board and that pretending you were there is transparent.

THE SUGGESTION BOX HAS BEEN REMOVED
The suggestion box has been removed following a review of the suggestions. A new box will be installed once we have worked out how to lock it in a way that a student cannot unlock, which the caretaker describes as "not a technical problem but a philosophical one".

LOST
One black umbrella. One glass eye (decorative, not medical). One essay on the Romantic poets, which its author says he does not want back but would like to know the whereabouts of.

FROM THE EDITOR
People keep asking whether this paper is censored. It is. If there is something you want printed that the school would not print, put it under the door of Room 14 and we will see what can be done. That sentence took two weeks to be approved.`,
    translation: `«НАЙТШЕЙД ГЕРАЛЬД» · ученическая газета · выпуск 112

ФЕХТОВАЛЬЩИКИ ОБЫГРАЛИ СЕНТ-ОБРИ ВПЕРВЫЕ ЗА ДЕВЯТЬ ЛЕТ
Последний бой решился одним уколом. Секция благодарит всех, кто пришёл смотреть, и напоминает всем остальным, что результаты висят на доске и что делать вид, будто вы там были, — насквозь видно.

ЯЩИК ДЛЯ ПРЕДЛОЖЕНИЙ УБРАН
Ящик для предложений убран по итогам изучения предложений. Новый поставят, как только мы придумаем, как запереть его так, чтобы ученик не смог отпереть, — завхоз называет это «не технической задачей, а философской».

ПОТЕРИ
Один чёрный зонт. Один стеклянный глаз (декоративный, не медицинский). Одно сочинение о поэтах-романтиках: автор говорит, что назад его не хочет, но хотел бы знать, где оно находится.

ОТ РЕДАКЦИИ
Нас постоянно спрашивают, цензурируют ли эту газету. Цензурируют. Если есть что-то, что вы хотите напечатать, а школа этого не напечатает, — подсуньте под дверь кабинета 14, и мы посмотрим, что можно сделать. Это предложение согласовывали две недели.`,
    glossary: [
      { term: 'bout', ru: 'бой, схватка (в фехтовании)' },
      { term: 'transparent', ru: 'здесь: насквозь видно, шито белыми нитками' },
      { term: 'suggestion box', ru: 'ящик для предложений' },
      { term: 'following a review', ru: 'по итогам рассмотрения' },
      { term: 'caretaker', ru: 'завхоз, смотритель (брит.); в США janitor' },
      { term: 'whereabouts', ru: 'местонахождение' },
      { term: 'to be censored', ru: 'подвергаться цензуре' },
    ],
    questions: [
      {
        q: 'Why was the suggestion box removed?',
        options: [
          'It was broken',
          'Because of what people had put in it',
          'Nobody used it',
          'It was moved to Room 14',
        ],
        correct: 1,
        why: '«Following a review of the suggestions» — убрали не ящик, а то, что в нём находили. Формулировка казённая, смысл прозрачный.',
      },
      {
        q: 'What does "pretending you were there is transparent" mean?',
        options: [
          'It is easy to see through the pretence',
          'The hall has glass walls',
          'Nobody minds',
          'The results are unclear',
        ],
        correct: 0,
      },
      {
        q: 'What does the author of the lost essay want?',
        options: [
          'The essay back',
          'Only to know where it is',
          'A new mark',
          'An apology',
        ],
        correct: 1,
      },
      {
        q: 'What does the editor admit?',
        options: [
          'The paper is not read',
          'The paper is censored — and the admission itself had to be approved',
          'The paper will close',
          'The results were wrong',
        ],
        correct: 1,
      },
    ],
  },

  // ── Остин, «Гордость и предубеждение» ──────────────────────────────────────
  //
  // Английский оригинал: посредника-переводчика здесь нет, это ровно те слова,
  // которые написала Остин. Текст взят с Project Gutenberg и не правился.
  {
    id: 'sc-pride-1',
    workId: 'austen-pride',
    lang: 'en', title: 'Холостяк с состоянием обязан хотеть жениться', level: 'B2', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Том I, глава 1', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Jane Austen, Pride and Prejudice · Project Gutenberg',
    setup: 'Самое известное первое предложение английской литературы — и сразу за ним разговор мистера и миссис Беннет. У них пять дочерей, ни одна не замужем, а по закону поместье после смерти отца уйдёт дальнему родственнику-мужчине. Поэтому истерика жены из-за нового соседа — не блажь, а вопрос выживания семьи; муж это знает и всё равно её дразнит.',
    after: 'Мистер Беннет к Бингли, разумеется, съездит — и не скажет об этом жене несколько дней, чтобы посмотреть, как она мучается. Через две главы Бингли влюбится в старшую дочь, а его друг Дарси скажет про среднюю то, чего ему потом не простят двадцать глав.',
    body: `It is a truth universally acknowledged, that a single man in possession of a good fortune must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.

“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”

Mr. Bennet replied that he had not.

“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”

Mr. Bennet made no answer.

“Do not you want to know who has taken it?” cried his wife, impatiently.

“You want to tell me, and I have no objection to hearing it.”

This was invitation enough.

“Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week.”

“What is his name?”

“Bingley.”

“Is he married or single?”

“Oh, single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!”

“How so? how can it affect them?”

“My dear Mr. Bennet,” replied his wife, “how can you be so tiresome? You must know that I am thinking of his marrying one of them.”

“Is that his design in settling here?”

“Design? Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes.”`,
    translation: `Общепризнанная истина гласит, что одинокий мужчина, располагающий состоянием, обязан нуждаться в жене.

Как бы мало ни было известно о чувствах и намерениях такого человека, когда он впервые появляется в округе, истина эта столь прочно сидит в умах соседних семейств, что его считают законной собственностью той или иной из их дочерей.

«Дорогой мистер Беннет, — сказала ему однажды супруга, — вы слышали, что Незерфилд-парк наконец сдан?»

Мистер Беннет ответил, что не слышал.

«Однако же сдан, — возразила она, — потому что миссис Лонг только что была здесь и всё мне рассказала».

Мистер Беннет ничего не ответил.

«Разве вам не хочется узнать, кто его снял?» — нетерпеливо воскликнула жена.

«Вам хочется мне об этом сказать, а я не возражаю послушать».

Приглашения было довольно.

«Так вот, дорогой мой, миссис Лонг говорит, что Незерфилд снял молодой человек с большим состоянием с севера Англии; что в понедельник он приезжал смотреть имение в карете четвёркой и остался так доволен, что тут же обо всём условился с мистером Моррисом; что он вступает во владение ещё до Михайлова дня, а часть прислуги будет в доме уже к концу следующей недели».

«А как его зовут?»

«Бингли».

«Женат или холост?»

«О, холост, дорогой мой, разумеется! Холостяк с большим состоянием — четыре или пять тысяч в год. Какая удача для наших девочек!»

«Каким образом? При чём тут они?»

«Дорогой мистер Беннет, — отвечала жена, — ну как можно быть таким несносным? Вы прекрасно понимаете, что я имею в виду его женитьбу на одной из них».

«Так он для этого сюда переезжает?»

«Для этого? Вздор, как вы можете так говорить! Но очень возможно, что он влюбится в одну из них, и потому вы должны съездить к нему, как только он приедет».`,
    glossary: [
      { term: 'a truth universally acknowledged', ru: 'общепризнанная истина' },
      { term: 'to be in want of', ru: 'нуждаться в' },
      { term: 'to be let', ru: 'быть сданным внаём' },
      { term: 'a chaise and four', ru: 'карета в четыре лошади (признак больших денег)' },
      { term: 'to take possession', ru: 'вступить во владение' },
      { term: 'Michaelmas', ru: 'Михайлов день, 29 сентября — срок расчётов и аренды' },
      { term: 'tiresome', ru: 'несносный, докучливый' },
      { term: 'design', ru: 'здесь: замысел, намерение' },
    ],
    questions: [
      {
        q: 'Who says the first sentence — a character or the narrator?',
        options: [
          'Mrs. Bennet',
          'The narrator, and ironically: it is what the neighbours believe, not what is true',
          'Mr. Bennet',
          'Mr. Bingley',
        ],
        correct: 1,
        why: 'Ирония здесь в слове universally: истина «общепризнанная» ровно в том кругу, которому выгодно так считать. Весь роман потом это проверяет.',
      },
      {
        q: 'What does Mr. Bennet mean by "You want to tell me, and I have no objection to hearing it"?',
        options: [
          'He is genuinely curious',
          'He refuses to ask, but lets her speak — he is teasing her',
          'He did not hear the question',
          'He forbids the subject',
        ],
        correct: 1,
      },
      {
        q: 'Why is Bingley\'s being single "a fine thing for our girls"?',
        options: [
          'He can rent them a house',
          'He might marry one of the daughters',
          'He will employ them',
          'He brings servants to the village',
        ],
        correct: 1,
      },
      {
        q: '"He is to take possession before Michaelmas" — what does "is to" express?',
        options: [
          'A wish',
          'An arrangement that has been fixed',
          'A doubt',
          'The past',
        ],
        correct: 1,
        why: 'Be to do — договорённость или предписание. Та же конструкция, что в регламентах: names are to be given before sundown.',
      },
    ],
  },
  {
    id: 'sc-pride-2',
    workId: 'austen-pride',
    lang: 'en', title: 'Она недурна, но не настолько', level: 'B2', minutes: 3,
    topic: 'Знакомство', skill: 'Чтение',
    order: 2, where: 'Том I, глава 3, бал в Меритоне', size: 'flash', spoiler: 2,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Jane Austen, Pride and Prejudice · Project Gutenberg',
    setup: 'Первый бал. Бингли танцует и всем доволен; его друг Дарси не танцует ни с кем и уже успел прослыть самым неприятным человеком в округе. Бингли уговаривает его пригласить хоть кого-нибудь и показывает на Элизабет — которая сидит достаточно близко, чтобы всё слышать. Это те самые пять секунд, из которых вырастает весь роман.',
    after: 'Элизабет не обиделась, а пересказала эту фразу друзьям как анекдот — и именно поэтому Дарси, который будет объясняться ей в любви через двадцать глав, получит отказ. В книге его слова цитируют ему обратно почти дословно.',
    body: `“Oh, she is the most beautiful creature I ever beheld! But there is one of her sisters sitting down just behind you, who is very pretty, and I dare say very agreeable. Do let me ask my partner to introduce you.”

“Which do you mean?” and turning round, he looked for a moment at Elizabeth, till, catching her eye, he withdrew his own, and coldly said, “She is tolerable: but not handsome enough to tempt me; and I am in no humour at present to give consequence to young ladies who are slighted by other men. You had better return to your partner and enjoy her smiles, for you are wasting your time with me.”

Mr. Bingley followed his advice. Mr. Darcy walked off; and Elizabeth remained with no very cordial feelings towards him. She told the story, however, with great spirit among her friends; for she had a lively, playful disposition, which delighted in anything ridiculous.`,
    translation: `«О, она прелестнейшее создание, какое я только видел! Но вон одна из её сестёр сидит прямо за вами, и она очень хороша собой и, смею сказать, очень мила. Позвольте, я попрошу мою даму вас представить».

«Которую вы имеете в виду?» — и, обернувшись, он с минуту смотрел на Элизабет, пока не встретился с ней взглядом; тогда он отвёл глаза и холодно сказал: «Она недурна, но не настолько хороша, чтобы соблазнить меня; а я сейчас не расположен придавать значение молодым особам, которыми пренебрегли другие. Вам лучше вернуться к вашей даме и наслаждаться её улыбками, потому что со мной вы тратите время впустую».

Мистер Бингли последовал совету. Мистер Дарси отошёл, а у Элизабет не осталось к нему ни малейшего расположения. Впрочем, она с большим воодушевлением пересказала эту историю подругам, потому что нрав у неё был живой и насмешливый и всё нелепое её забавляло.`,
    glossary: [
      { term: 'to behold', ru: 'видеть, лицезреть (книжн.)' },
      { term: 'agreeable', ru: 'приятная, милая (о человеке)' },
      { term: 'tolerable', ru: 'сносная, терпимая' },
      { term: 'to tempt', ru: 'соблазнить, прельстить' },
      { term: 'in no humour', ru: 'не в настроении, не расположен' },
      { term: 'to give consequence to', ru: 'придавать значение кому-то' },
      { term: 'to slight', ru: 'пренебречь, обойти вниманием' },
      { term: 'disposition', ru: 'нрав, характер' },
    ],
    questions: [
      {
        q: 'What is wrong with what Darcy says, apart from its content?',
        options: [
          'He says it in a foreign language',
          'Elizabeth is sitting close enough to hear it',
          'He says it to a stranger',
          'He whispers, and nobody understands him',
        ],
        correct: 1,
      },
      {
        q: '"She is tolerable" is…',
        options: [
          'high praise',
          'faint praise that works as an insult',
          'a neutral description',
          'a compliment on her patience',
        ],
        correct: 1,
        why: 'Tolerable — «сносная». По-английски похвала на самом нижнем делении шкалы оскорбительнее прямой грубости, и Остин пользуется этим постоянно.',
      },
      {
        q: 'How does Elizabeth react?',
        options: [
          'She cries',
          'She leaves the ball',
          'She retells it to her friends as a funny story',
          'She answers him back',
        ],
        correct: 2,
      },
      {
        q: 'What does "young ladies who are slighted by other men" mean?',
        options: [
          'women other men have ignored',
          'women other men have praised',
          'women who are shorter than others',
          'women who came late',
        ],
        correct: 0,
      },
    ],
  },

  // ── Кэрролл, «Алиса в Стране чудес» ────────────────────────────────────────
  {
    id: 'sc-alice-1',
    workId: 'carroll-alice',
    lang: 'en', title: 'Кролик достаёт часы из жилетного кармана', level: 'B2', minutes: 3,
    topic: 'Время и планы', skill: 'Чтение',
    order: 1, where: 'Глава 1, «Вниз по кроличьей норе»', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: "Lewis Carroll, Alice's Adventures in Wonderland · Project Gutenberg",
    setup: 'Начало книги. Алисе жарко и скучно на берегу реки, и мимо пробегает белый кролик. Обратите внимание, что именно её удивляет: не говорящий кролик — к этому она отнеслась спокойно, — а кролик с часами и жилетным карманом. Кэрролл всю книгу выстраивает так: странное принимается легко, а спотыкается всё на бытовой детали.',
    after: 'Нора оказывается очень глубокой, и Алиса падает так долго, что успевает вслух поразмышлять о широте и долготе и о том, что будет, если пролететь Землю насквозь. Первая глава кончается запертой дверцей в пятнадцать дюймов и бутылочкой с надписью «выпей меня».',
    body: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?”

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, “Oh dear! Oh dear! I shall be late!” (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.`,
    translation: `Алисе уже совсем надоело сидеть с сестрой на берегу и ничего не делать: раз или два она заглянула в книжку, которую читала сестра, но там не было ни картинок, ни разговоров. «И какой прок в книжке, — подумала Алиса, — если в ней нет ни картинок, ни разговоров?»

И вот она размышляла про себя (насколько это ей удавалось, потому что от жары её клонило в сон и голова была тяжёлая), стоит ли удовольствие сплести венок из маргариток того, чтобы вставать и их собирать, — как вдруг совсем рядом пробежал Белый Кролик с розовыми глазами.

Ничего особенно замечательного в этом не было; не показалось Алисе чем-то из ряда вон и то, что Кролик проговорил про себя: «Ах, боже мой! Боже мой! Я опоздаю!» (потом, обдумав всё это, она сообразила, что удивиться следовало, но тогда всё выглядело совершенно естественным); однако когда Кролик и вправду вынул из жилетного кармана часы, посмотрел на них и заторопился дальше, Алиса вскочила на ноги, потому что её осенило: никогда прежде она не видела кролика ни с жилетным карманом, ни с часами, которые оттуда можно вынуть, — и, сгорая от любопытства, она побежала за ним через поле и, по счастью, как раз успела заметить, как он юркнул в большую кроличью нору под изгородью.

Ещё мгновение — и Алиса нырнула туда за ним, ни разу не подумав, как же она оттуда выберется.`,
    glossary: [
      { term: 'to peep into', ru: 'заглянуть в' },
      { term: 'what is the use of', ru: 'какой прок в' },
      { term: 'daisy-chain', ru: 'венок из маргариток' },
      { term: 'out of the way', ru: 'здесь: из ряда вон, необычно' },
      { term: 'to start to one’s feet', ru: 'вскочить на ноги' },
      { term: 'it flashed across her mind', ru: 'её осенило' },
      { term: 'waistcoat-pocket', ru: 'жилетный карман' },
      { term: 'to pop down', ru: 'юркнуть, нырнуть вниз' },
    ],
    questions: [
      {
        q: 'What finally makes Alice jump up?',
        options: [
          'The rabbit speaks',
          'The rabbit takes a watch out of its waistcoat-pocket',
          'The rabbit is white',
          'Her sister calls her',
        ],
        correct: 1,
        why: 'Говорящий кролик её не смутил — «it all seemed quite natural». Спотыкается она на жилете с часами, и в этом вся логика книги.',
      },
      {
        q: 'Why does Alice think her sister\'s book is useless?',
        options: [
          'It is too long',
          'It has no pictures and no conversations',
          'It is in a foreign language',
          'She has already read it',
        ],
        correct: 1,
      },
      {
        q: '"never once considering how in the world she was to get out again" tells us that…',
        options: [
          'she had a plan',
          'she did not think about getting back at all',
          'she asked her sister first',
          'the hole was shallow',
        ],
        correct: 1,
      },
      {
        q: 'What does "out of the way" mean here?',
        options: ['far from the road', 'unusual', 'dangerous', 'polite'],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-alice-2',
    workId: 'carroll-alice',
    lang: 'en', title: 'Безумное чаепитие', level: 'B1', minutes: 3,
    topic: 'Еда', skill: 'Чтение',
    order: 2, where: 'Глава 7, «Безумное чаепитие»', size: 'short', spoiler: 2,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: "Lewis Carroll, Alice's Adventures in Wonderland · Project Gutenberg",
    setup: 'Самая известная сцена книги. За столом Мартовский Заяц, Шляпник и спящая Соня, которую двое остальных используют как подушку. Читать это стоит как урок вежливости наоборот: почти каждая реплика — нарушение застольного этикета, и каждое нарушение названо своим словом (civil, personal remarks, rude). Лексика простая, весь юмор в манерах.',
    after: 'Загадка «чем ворон похож на письменный стол?» так и останется без ответа — Шляпник честно признается, что не имеет ни малейшего представления. Кэрролла спрашивали об этом до конца жизни, и разгадку он придумал только через много лет, задним числом.',
    body: `There was a table set out under a tree in front of the house, and the March Hare and the Hatter were having tea at it: a Dormouse was sitting between them, fast asleep, and the other two were using it as a cushion, resting their elbows on it, and talking over its head. “Very uncomfortable for the Dormouse,” thought Alice; “only, as it’s asleep, I suppose it doesn’t mind.”

The table was a large one, but the three were all crowded together at one corner of it: “No room! No room!” they cried out when they saw Alice coming. “There’s plenty of room!” said Alice indignantly, and she sat down in a large arm-chair at one end of the table.

“Have some wine,” the March Hare said in an encouraging tone.

Alice looked all round the table, but there was nothing on it but tea. “I don’t see any wine,” she remarked.

“There isn’t any,” said the March Hare.

“Then it wasn’t very civil of you to offer it,” said Alice angrily.

“It wasn’t very civil of you to sit down without being invited,” said the March Hare.

“I didn’t know it was your table,” said Alice; “it’s laid for a great many more than three.”

“Your hair wants cutting,” said the Hatter. He had been looking at Alice for some time with great curiosity, and this was his first speech.

“You should learn not to make personal remarks,” Alice said with some severity; “it’s very rude.”

The Hatter opened his eyes very wide on hearing this; but all he said was, “Why is a raven like a writing-desk?”`,
    translation: `Перед домом под деревом был накрыт стол, и Мартовский Заяц со Шляпником пили за ним чай; между ними крепко спала Соня, а те двое устроили из неё подушку, положили ей на голову локти и разговаривали поверх неё. «Соне очень неудобно, — подумала Алиса, — но раз она спит, ей, наверное, всё равно».

Стол был большой, но все трое сгрудились в одном его углу. «Мест нет! Мест нет!» — закричали они, увидев Алису. «Мест сколько угодно!» — возмущённо сказала Алиса и села в большое кресло на краю стола.

«Выпейте вина», — ободряюще предложил Мартовский Заяц.

Алиса оглядела весь стол, но, кроме чая, на нём ничего не было. «Я не вижу никакого вина», — заметила она.

«Его и нет», — сказал Мартовский Заяц.

«Тогда не очень-то любезно было его предлагать», — сердито сказала Алиса.

«Не очень-то любезно было садиться за стол без приглашения», — сказал Мартовский Заяц.

«Я не знала, что стол ваш, — сказала Алиса. — Он накрыт куда больше чем на троих».

«Вам пора постричься», — сказал Шляпник. Он уже некоторое время разглядывал Алису с большим любопытством, и это были его первые слова.

«Вам следовало бы научиться не делать замечаний о внешности, — строго сказала Алиса. — Это очень невежливо».

Шляпник широко раскрыл глаза, но сказал только одно: «Чем ворон похож на письменный стол?»`,
    glossary: [
      { term: 'fast asleep', ru: 'крепко спит' },
      { term: 'indignantly', ru: 'возмущённо' },
      { term: 'civil', ru: 'учтивый, любезный' },
      { term: 'it is laid for', ru: 'накрыт на (столько-то человек)' },
      { term: 'your hair wants cutting', ru: 'вам пора постричься (устар. want = need)' },
      { term: 'personal remarks', ru: 'замечания о внешности или личности' },
      { term: 'severity', ru: 'строгость' },
      { term: 'rude', ru: 'невежливый, грубый' },
    ],
    questions: [
      {
        q: 'Why is Alice angry about the wine?',
        options: [
          'She does not drink wine',
          'There is no wine — offering it was not "civil"',
          'The wine is warm',
          'The Hare drank it all',
        ],
        correct: 1,
      },
      {
        q: 'How does the March Hare answer her complaint?',
        options: [
          'He apologises',
          'He points out that she sat down uninvited — an equally uncivil act',
          'He brings the wine',
          'He wakes the Dormouse',
        ],
        correct: 1,
      },
      {
        q: 'In "Your hair wants cutting", "wants" means…',
        options: ['wishes', 'needs', 'likes', 'refuses'],
        correct: 1,
        why: 'Старое значение want = «нуждаться». Оно же в первом предложении «Гордости и предубеждения»: must be in want of a wife.',
      },
      {
        q: 'What are "personal remarks"?',
        options: [
          'private letters',
          'comments about someone’s appearance or person',
          'notes in a diary',
          'compliments',
        ],
        correct: 1,
      },
    ],
  },

  // ── Стокер, «Дракула» ──────────────────────────────────────────────────────
  {
    id: 'sc-dracula-1',
    workId: 'stoker-dracula',
    lang: 'en', title: 'Дверь открылась', level: 'B2', minutes: 3,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Глава 2, дневник Джонатана Харкера', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Bram Stoker, Dracula · Project Gutenberg',
    setup: 'Молодой лондонский юрист Джонатан Харкер везёт клиенту документы на покупку дома в Англии. Клиент живёт в Карпатах, в замке, куда крестьяне отказались его подвозить, а на прощание совали чеснок и распятие. Харкер стоит у запертых ворот один, ночью, и ведёт дневник — сцена написана от первого лица и в прошедшем времени, как отчёт.',
    after: 'Дальше будет ужин, любезный разговор до рассвета — и через несколько дней Харкер обнаружит, что в замке нет ни одной двери, которая открывалась бы наружу, и ни одного зеркала.',
    body: `Just as I had come to this conclusion I heard a heavy step approaching behind the great door, and saw through the chinks the gleam of a coming light. Then there was the sound of rattling chains and the clanking of massive bolts drawn back. A key was turned with the loud grating noise of long disuse, and the great door swung back.

Within, stood a tall old man, clean shaven save for a long white moustache, and clad in black from head to foot, without a single speck of colour about him anywhere. He held in his hand an antique silver lamp, in which the flame burned without chimney or globe of any kind, throwing long quivering shadows as it flickered in the draught of the open door. The old man motioned me in with his right hand with a courtly gesture, saying in excellent English, but with a strange intonation:--

“Welcome to my house! Enter freely and of your own will!” He made no motion of stepping to meet me, but stood like a statue, as though his gesture of welcome had fixed him into stone.`,
    translation: `Едва я пришёл к этому выводу, как услышал за огромной дверью тяжёлые приближающиеся шаги и увидел сквозь щели отблеск подходящего света. Затем раздался лязг цепей и грохот отодвигаемых массивных засовов. Ключ повернулся с громким скрежетом, какой бывает от долгого бездействия, и огромная дверь распахнулась.

Внутри стоял высокий старик, чисто выбритый, если не считать длинных белых усов, и одетый в чёрное с головы до ног — ни единого цветного пятна на нём нигде. В руке он держал старинную серебряную лампу, в которой пламя горело без всякого стекла или колпака и, колеблясь на сквозняке из открытой двери, отбрасывало длинные дрожащие тени. Старик пригласил меня внутрь движением правой руки, учтивым жестом, и сказал на превосходном английском, но со странной интонацией:

«Добро пожаловать в мой дом! Входите свободно и по собственной воле!» Он не сделал ни шагу навстречу, а стоял как изваяние, будто приветственный жест обратил его в камень.`,
    glossary: [
      { term: 'chink', ru: 'щель' },
      { term: 'bolt', ru: 'засов' },
      { term: 'grating noise', ru: 'скрежет' },
      { term: 'of long disuse', ru: 'от долгого бездействия' },
      { term: 'save for', ru: 'за исключением, кроме' },
      { term: 'clad in', ru: 'облачённый в' },
      { term: 'speck', ru: 'пятнышко, крупинка' },
      { term: 'to motion someone in', ru: 'жестом пригласить войти' },
      { term: 'of your own will', ru: 'по своей воле' },
    ],
    questions: [
      {
        q: 'What does the sound of the key tell the reader?',
        options: [
          'The door is new',
          'The lock has not been used for a long time',
          'Someone is in a hurry',
          'The door is broken',
        ],
        correct: 1,
        why: '«The loud grating noise of long disuse» — замок скрипит именно потому, что им давно не пользовались. Деталь работает вместо описания замка.',
      },
      {
        q: 'How is the old man dressed?',
        options: [
          'In black from head to foot, with no colour anywhere',
          'In a white shirt and dark coat',
          'In travelling clothes',
          'It is not described',
        ],
        correct: 0,
      },
      {
        q: 'Why does the host insist on "of your own will"?',
        options: [
          'He is being polite in an old-fashioned way',
          'It is a formality that will matter later — the guest must enter by his own choice',
          'He does not want to carry the luggage',
          'It is a local greeting',
        ],
        correct: 1,
      },
      {
        q: '"as though his gesture of welcome had fixed him into stone" describes…',
        options: [
          'a statue in the hall',
          'the host standing completely motionless',
          'the cold weather',
          'the door',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-dracula-2',
    workId: 'stoker-dracula',
    lang: 'en', title: 'Я — Дракула', level: 'B2', minutes: 2,
    topic: 'Знакомство', skill: 'Чтение',
    order: 2, where: 'Глава 2, дневник Джонатана Харкера', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Bram Stoker, Dracula · Project Gutenberg',
    setup: 'Продолжение той же ночи: хозяин наконец называет себя. Обратите внимание на бытовую странность, которую Харкер добросовестно записывает и не осмысляет: граф сам тащит наверх его чемоданы и объясняет это тем, что прислуги нет. В замке действительно нет ни одного слуги — но поймёт это Харкер гораздо позже.',
    after: 'Ужин будет накрыт на одного. Хозяин просидит с гостем до самого рассвета, не притронувшись к еде, а с первым криком петуха извинится и уйдёт.',
    body: `“I am Dracula; and I bid you welcome, Mr. Harker, to my house. Come in; the night air is chill, and you must need to eat and rest.” As he was speaking, he put the lamp on a bracket on the wall, and stepping out, took my luggage; he had carried it in before I could forestall him. I protested but he insisted:--

“Nay, sir, you are my guest. It is late, and my people are not available. Let me see to your comfort myself.”`,
    translation: `«Я — Дракула и приветствую вас, мистер Харкер, в моём доме. Входите; ночной воздух холоден, а вам, должно быть, нужно поесть и отдохнуть». Говоря это, он поставил лампу на настенный кронштейн и, выйдя наружу, взял мой багаж; он внёс его прежде, чем я успел его опередить. Я запротестовал, но он настоял:

«Нет, сударь, вы мой гость. Уже поздно, а моих людей нет на месте. Позвольте мне самому позаботиться о ваших удобствах».`,
    glossary: [
      { term: 'to bid someone welcome', ru: 'приветствовать кого-то (книжн.)' },
      { term: 'chill', ru: 'холодный, промозглый' },
      { term: 'bracket', ru: 'кронштейн, настенный держатель' },
      { term: 'to forestall', ru: 'опередить, предупредить действие' },
      { term: 'nay', ru: 'нет (устар.)' },
      { term: 'my people', ru: 'здесь: моя прислуга' },
      { term: 'to see to something', ru: 'позаботиться о чём-то, заняться чем-то' },
    ],
    questions: [
      {
        q: 'Who carries the luggage?',
        options: ['A servant', 'The host himself', 'Harker', 'The coachman'],
        correct: 1,
      },
      {
        q: 'What reason does the host give?',
        options: [
          'The luggage is light',
          'His servants are not available',
          'It is a local custom',
          'Harker is unwell',
        ],
        correct: 1,
        why: 'Формально это вежливость. Фактически — в замке нет ни одного слуги, и «my people are not available» здесь единственная возможная правда.',
      },
      {
        q: '"before I could forestall him" means…',
        options: [
          'before I could stop him by acting first',
          'before I could thank him',
          'before I could see him',
          'after I had asked him',
        ],
        correct: 0,
      },
    ],
  },

  // ── Лондон, «Зов предков» ──────────────────────────────────────────────────
  {
    id: 'sc-callwild-1',
    workId: 'london-call-wild',
    lang: 'en', title: 'Бак не читал газет', level: 'C1', minutes: 2,
    topic: 'Путешествия', skill: 'Чтение',
    order: 1, where: 'Глава 1, начало', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Jack London, The Call of the Wild · Project Gutenberg',
    setup: 'Первый абзац книги. Главный герой — пёс, живущий в богатой калифорнийской усадьбе, и Лондон с первой же фразы объясняет через него мировую экономику: на Клондайке нашли золото, туда рванули тысячи людей, людям нужны ездовые собаки — значит, крупных собак начнут красть. Приём, ради которого этот абзац стоит разобрать: беда объясняется не чувствами, а логистикой.',
    after: 'Через несколько страниц садовник продаст Бака за долги человеку в красном свитере, и от Санта-Клары до палубы парохода на север он доберётся в клетке.',
    body: `Buck did not read the newspapers, or he would have known that trouble was brewing, not alone for himself, but for every tide-water dog, strong of muscle and with warm, long hair, from Puget Sound to San Diego. Because men, groping in the Arctic darkness, had found a yellow metal, and because steamship and transportation companies were booming the find, thousands of men were rushing into the Northland. These men wanted dogs, and the dogs they wanted were heavy dogs, with strong muscles by which to toil, and furry coats to protect them from the frost.`,
    translation: `Бак не читал газет, а то бы знал, что беда надвигается — и не на него одного, а на всякого крупного пса с сильными мышцами и тёплой длинной шерстью на всём побережье, от Пьюджет-Саунда до Сан-Диего. Потому что люди, шарившие в арктической темноте, нашли жёлтый металл, а пароходные и транспортные компании раструбили об этой находке, — и тысячи людей ринулись на Север. Этим людям нужны были собаки, и нужны им были собаки тяжёлые, с крепкими мышцами, чтобы тянуть, и с косматой шерстью, чтобы не мёрзнуть.`,
    glossary: [
      { term: 'trouble was brewing', ru: 'беда назревала' },
      { term: 'not alone for', ru: 'не только для (книжн. вместо not only)' },
      { term: 'tide-water', ru: 'приливный, прибрежный' },
      { term: 'to grope', ru: 'шарить, идти на ощупь' },
      { term: 'to boom something', ru: 'раструбить, шумно раскрутить' },
      { term: 'to toil', ru: 'тяжело трудиться' },
      { term: 'furry coat', ru: 'густая шерсть' },
      { term: 'frost', ru: 'мороз' },
    ],
    questions: [
      {
        q: 'Why is Buck in danger?',
        options: [
          'He is old',
          'Gold was found in the north, so big strong dogs are suddenly worth stealing',
          'His owner is moving away',
          'There is a disease among dogs',
        ],
        correct: 1,
      },
      {
        q: '"Buck did not read the newspapers, or he would have known" — what is this construction?',
        options: [
          'A real condition about the future',
          'An unreal condition: he did not read, so he did not know',
          'A question',
          'A command',
        ],
        correct: 1,
        why: 'Or здесь = otherwise, а would have known — нереальное прошлое. Полная форма: if he had read the newspapers, he would have known.',
      },
      {
        q: 'What is "a yellow metal"?',
        options: ['brass', 'gold', 'copper', 'tin'],
        correct: 1,
        why: 'Лондон нарочно не называет золото золотом: для собаки это просто металл, из-за которого сошли с ума люди.',
      },
    ],
  },
  {
    id: 'sc-callwild-2',
    workId: 'london-call-wild',
    lang: 'en', title: 'Закон дубины и клыка', level: 'C1', minutes: 2,
    topic: 'Погода и природа', skill: 'Чтение',
    order: 2, where: 'Глава 2, первый день на Севере', size: 'flash', spoiler: 2,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Jack London, The Call of the Wild · Project Gutenberg',
    setup: 'Бака выгрузили на берег в Дайе. За несколько дней он проделал путь из усадьбы с лужайками и фруктовым садом туда, где ни у кого нет ни секунды безопасности. Абзац устроен как перечисление отрицаний — neither peace, nor rest, nor a moment’s safety, — и именно на этом ритме держится вся глава.',
    after: 'Урок Бак получит не на себе: на его глазах свора разорвёт добродушную Кёрли, которая просто подошла познакомиться. Он запомнит из этого одно правило — упавшая собака не встаёт.',
    body: `He had been suddenly jerked from the heart of civilization and flung into the heart of things primordial. No lazy, sun-kissed life was this, with nothing to do but loaf and be bored. Here was neither peace, nor rest, nor a moment’s safety. All was confusion and action, and every moment life and limb were in peril. There was imperative need to be constantly alert; for these dogs and men were not town dogs and men. They were savages, all of them, who knew no law but the law of club and fang.`,
    translation: `Его внезапно выдернули из сердца цивилизации и швырнули в самую сердцевину первобытного. Это была не ленивая, пригретая солнцем жизнь, где нечего делать, кроме как слоняться и скучать. Здесь не было ни покоя, ни отдыха, ни минуты безопасности. Всё было смятением и движением, и каждое мгновение жизнь и целость шкуры были под угрозой. Требовалось неотступно быть настороже, потому что эти собаки и эти люди не были городскими собаками и людьми. Все они были дикарями и не знали иного закона, кроме закона дубины и клыка.`,
    glossary: [
      { term: 'to jerk', ru: 'выдернуть рывком' },
      { term: 'to fling (flung)', ru: 'швырнуть' },
      { term: 'primordial', ru: 'первобытный, изначальный' },
      { term: 'to loaf', ru: 'бездельничать, слоняться' },
      { term: 'life and limb', ru: 'жизнь и здоровье (устойчивое)' },
      { term: 'in peril', ru: 'в опасности' },
      { term: 'alert', ru: 'настороже, начеку' },
      { term: 'fang', ru: 'клык' },
      { term: 'club', ru: 'дубина' },
    ],
    questions: [
      {
        q: 'What is the contrast the paragraph is built on?',
        options: [
          'Winter and summer',
          'The lazy sunlit life he had before and the constant danger he has now',
          'Dogs and wolves',
          'Rich owners and poor owners',
        ],
        correct: 1,
      },
      {
        q: 'What does "the law of club and fang" mean?',
        options: [
          'A written rule of the north',
          'The only rule is force — men beat, dogs bite',
          'A game played by the drivers',
          'A hunting method',
        ],
        correct: 1,
      },
      {
        q: 'Why does London pile up "neither… nor… nor"?',
        options: [
          'To fill the page',
          'The repetition builds the rhythm of a place with nothing safe left in it',
          'It is a grammar rule',
          'To describe the weather',
        ],
        correct: 1,
      },
    ],
  },

  // ── Друзья: карточка, наш текст ────────────────────────────────────────────
  //
  // bucket: 'inspired'. Ни одного персонажа и ни одной реплики сериала: люди,
  // квартира и кофейня наши. От «Друзей» — жанр и лексический слой: бытовая
  // речь двадцатилетних в большом городе.
  {
    id: 'sc-friends-1',
    workId: 'friends',
    lang: 'en', title: 'Объявление: ищем соседа', level: 'A2', minutes: 2,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Вся завязка «Друзей» — это кто с кем живёт и кто за что платит. Ниже наше объявление о поиске соседа с доски в кофейне. Лексика здесь из тех, что нужны в первый же месяц в любом городе: аренда, залог, коммуналка, «включено в стоимость».',
    after: 'Обратите внимание на последнюю строку: «если вы читаете это в нашей кофейне, вы уже знаете, где мы сидим». В сериале точно так же: половина знакомств происходит не по объявлению, а потому что все всё время в одном месте.',
    body: `ROOMMATE WANTED — 2 BR APARTMENT, WEST VILLAGE

$780/month + your half of the utilities. Deposit is one month, and you get it back if the fridge survives you.

The room is small but it has a window and a real closet. Furnished if you want it furnished; we can move the desk out if you don't.

ABOUT US
Two of us, mid-twenties, both work weekdays. One plays guitar (badly, with headphones, after nine). The other cooks and will feed you, which honestly is worth a hundred dollars a month on its own.

ABOUT YOU
Clean-ish. We are not asking for spotless, we are asking for dishes done the same day.
No smoking indoors. The fire escape is right there and the view is good.
Fine with a cat. The cat was here first and is not negotiable.

Available from the first. Come and see it — pictures make it look worse than it is.

If you're reading this in our coffee place, you already know where we sit.`,
    translation: `ИЩЕМ СОСЕДА — ДВУШКА, ВЕСТ-ВИЛЛИДЖ

780 долларов в месяц плюс твоя половина коммуналки. Залог — месяц, вернём, если холодильник тебя переживёт.

Комната маленькая, но с окном и с настоящим шкафом. С мебелью, если нужна с мебелью; если нет — вынесем стол.

О НАС
Нас двое, обоим слегка за двадцать, оба работают по будням. Один играет на гитаре (плохо, в наушниках, после девяти). Второй готовит и будет тебя кормить, что само по себе стоит сотни долларов в месяц.

О ТЕБЕ
Более-менее чистоплотный. Мы не просим стерильности, мы просим мыть посуду в тот же день.
В квартире не курим. Пожарная лестница вот она, и вид оттуда хороший.
Нормально относишься к коту. Кот был здесь раньше и обсуждению не подлежит.

Заезд с первого числа. Приходи смотреть — на фотографиях всё выглядит хуже, чем есть.

Если ты читаешь это в нашей кофейне, то уже знаешь, где мы сидим.`,
    glossary: [
      { term: 'roommate', ru: 'сосед по квартире (амер.); в Британии flatmate' },
      { term: '2 BR (two-bedroom)', ru: 'две спальни плюс гостиная' },
      { term: 'utilities', ru: 'коммунальные платежи' },
      { term: 'deposit', ru: 'залог' },
      { term: 'furnished', ru: 'с мебелью' },
      { term: 'closet', ru: 'встроенный шкаф (амер.)' },
      { term: 'fire escape', ru: 'пожарная лестница снаружи дома' },
      { term: 'not negotiable', ru: 'обсуждению не подлежит' },
      { term: 'available from the first', ru: 'свободно с первого числа' },
    ],
    questions: [
      {
        q: 'What exactly does the $780 cover?',
        options: [
          'Everything including utilities',
          'The rent only — utilities are split on top',
          'The deposit',
          'The first two months',
        ],
        correct: 1,
      },
      {
        q: 'What is the deposit?',
        options: ['One month, returnable', 'Two months', 'There is none', 'Half a month'],
        correct: 0,
      },
      {
        q: 'What does "the cat is not negotiable" mean?',
        options: [
          'The cat is for sale',
          'The cat stays, and there is nothing to discuss',
          'The cat belongs to a neighbour',
          'The cat is difficult',
        ],
        correct: 1,
      },
      {
        q: 'What does "clean-ish" tell you?',
        options: [
          'Perfectly clean',
          'Reasonably clean — the suffix -ish softens the demand',
          'Dirty',
          'Professionally cleaned',
        ],
        correct: 1,
        why: 'Суффикс -ish («примерно, вроде») цепляется почти к любому слову: five-ish, tired-ish, blue-ish. Очень частый разговорный приём.',
      },
    ],
  },
  {
    id: 'sc-friends-2',
    workId: 'friends',
    lang: 'en', title: 'Разговор в кофейне', level: 'B1', minutes: 3,
    topic: 'Знакомство', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Главное, чему учат «Друзья», — small talk: разговор, в котором почти нет содержания, зато есть весь набор формул. Ниже наш диалог того же устройства. Здесь стоит следить не за смыслом, а за связками: «how have you been», «long story», «no way», «you kidding me» — это то, чем по-английски держат разговор на плаву.',
    after: 'Обратите внимание, что за весь разговор никто не сказал ничего важного, а договорились они о трёх вещах: увидеться в четверг, познакомить с человеком и вернуть свитер. Small talk именно так и работает — дело делается в последних двух репликах.',
    body: `— Hey! I haven't seen you in, what, a year?
— More like two. How have you been?
— Good! Busy. You know how it is.
— I don't, actually. Tell me.
— Okay, so I quit the agency in March.
— No way. You loved that job.
— I loved it for about eight months. Then I loved the idea of it.
— Fair. And now?
— Now I'm freelancing, which means I work more and explain it to my mother less.
— Are you kidding me? Your mother still asks?
— Every Sunday. It's basically a subscription.
— So how's the money?
— Long story. Short version: fine in March, terrifying in April, fine again now.
— Well, you look good on it.
— Thanks. You too. Are you still with — sorry, is that a thing I can ask?
— You can ask. No. Since January.
— Oh. I'm sorry.
— Don't be. Genuinely. I'm better than I've been in years.
— Good. In that case, there's someone you should meet.
— Absolutely not.
— I haven't said anything yet.
— You said "someone you should meet". I've heard that sentence before.
— Thursday. Here. Seven.
— …Fine. Thursday. And bring back my sweater.
— I don't have your sweater.
— You've had my sweater for two years.`,
    translation: `— Привет! Мы сколько не виделись — год?
— Скорее два. Ну как ты?
— Хорошо! Занят. Сам знаешь, как это бывает.
— Вообще-то не знаю. Расскажи.
— Ну, в марте я ушёл из агентства.
— Да ладно. Ты обожал эту работу.
— Я обожал её месяцев восемь. А потом обожал саму мысль о ней.
— Справедливо. А теперь?
— Теперь на фрилансе — то есть работаю больше, а объясняю это маме меньше.
— Издеваешься? Она до сих пор спрашивает?
— Каждое воскресенье. Это фактически подписка.
— И как с деньгами?
— Долгая история. Если коротко: в марте нормально, в апреле ужас, сейчас снова нормально.
— Ну, выглядишь ты при этом хорошо.
— Спасибо. Ты тоже. Ты всё ещё с… прости, об этом можно спрашивать?
— Спрашивать можно. Нет. С января.
— Ох. Сочувствую.
— Не надо. Правда. Мне давно не было так хорошо.
— Отлично. В таком случае есть человек, с которым тебе надо познакомиться.
— Ни за что.
— Я ещё ничего не сказал.
— Ты сказал «человек, с которым тебе надо познакомиться». Я эту фразу уже слышала.
— Четверг. Здесь. В семь.
— …Ладно. Четверг. И верни мой свитер.
— Нет у меня твоего свитера.
— Он у тебя уже два года.`,
    glossary: [
      { term: 'How have you been?', ru: 'как ты (за то время, что не виделись)' },
      { term: 'You know how it is', ru: 'ну ты понимаешь' },
      { term: 'No way', ru: 'да ладно, не может быть' },
      { term: 'Fair', ru: 'справедливо, принимается' },
      { term: 'Are you kidding me?', ru: 'ты издеваешься?' },
      { term: 'Long story', ru: 'долгая история' },
      { term: 'you look good on it', ru: 'и тебе это идёт (о том, что с тобой происходит)' },
      { term: 'Genuinely', ru: 'правда, искренне' },
      { term: 'Absolutely not', ru: 'ни в коем случае' },
    ],
    questions: [
      {
        q: 'Why does he say "I loved the idea of it"?',
        options: [
          'The job got better',
          'He kept the job after he had stopped enjoying the real thing',
          'He never worked there',
          'He is describing another job',
        ],
        correct: 1,
      },
      {
        q: 'What does "How have you been?" ask about?',
        options: [
          'Where the person is right now',
          'How life has gone since they last met',
          'Where the person has travelled',
          'How old the person is',
        ],
        correct: 1,
        why: 'Present perfect тянет вопрос от последней встречи до сейчас. «How are you?» спрашивает про эту минуту, «How have you been?» — про весь промежуток.',
      },
      {
        q: 'Why does she refuse before he has finished?',
        options: [
          'She is busy on Thursday',
          'She recognises the phrase "someone you should meet" and knows what follows',
          'She does not like the café',
          'She is angry with him',
        ],
        correct: 1,
      },
      {
        q: 'What was actually agreed in this conversation?',
        options: [
          'Nothing',
          'Thursday at seven, an introduction, and the sweater',
          'A new job',
          'A trip',
        ],
        correct: 1,
      },
    ],
  },

  // ── Корона: карточка, наш текст ────────────────────────────────────────────
  //
  // bucket: 'inspired'. Ни одного реального лица: страна, обращение и приём
  // вымышлены. От сериала — официальный британский регистр: речь на публику и
  // служебная записка о том, как себя вести.
  {
    id: 'sc-crown-1',
    workId: 'the-crown',
    lang: 'en', title: 'Новогоднее обращение', level: 'C1', minutes: 3,
    topic: 'Время и планы', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Половина «Короны» — это речи: на камеру, на приёме, в парламенте. Жанр жёсткий, и по-английски он узнаётся мгновенно: «я» почти нет, зато есть «мы», глаголы вежливые и осторожные, а самое неприятное сообщение прячется в середину. Ниже наше новогоднее обращение вымышленной главы государства.',
    after: 'Приём, который стоит заметить: единственная плохая новость в тексте («год был труден для многих семей») стоит ровно посередине, между благодарностью и надеждой. Так строят публичные речи до сих пор — и на выступлениях компаний тоже.',
    body: `Good evening.

At the end of a year, it is customary to look back before we look forward, and I would ask you to do both with me for a few minutes.

This has been a difficult year for a great many families. I am aware that words spoken from a warm room are of limited use to those who have spent it counting what they have left, and I do not intend to pretend otherwise. What I can say is that the difficulty has been borne, in the main, with a patience that has been remarked upon well beyond our borders.

We have also had our better moments, and it would be ungracious not to name them. The harvest was good. The hospitals in the north opened, late but at last. And a great many of you gave time you could not spare to people you had never met.

To those serving away from home tonight, and to the families who are keeping a place at the table for them, we send our thoughts.

Whatever the coming year asks of us, I hope it will find us as it has found us this one: tired, perhaps, but not divided.

I wish you a peaceful new year.`,
    translation: `Добрый вечер.

В конце года принято оглянуться назад, прежде чем смотреть вперёд, и я прошу вас несколько минут делать и то и другое вместе со мной.

Этот год был труден для очень многих семей. Я понимаю, что слова, произнесённые из тёплой комнаты, мало чем помогут тем, кто провёл его, считая остатки, и делать вид, что это не так, я не намерена. Могу сказать одно: трудность эта была перенесена — в основном — с терпением, которое заметили далеко за нашими границами.

Были у нас и моменты получше, и не назвать их было бы неучтиво. Урожай удался. Больницы на севере открылись — поздно, но открылись. И очень многие из вас отдали время, которого у вас не было, людям, которых вы никогда не видели.

Тем, кто несёт службу вдали от дома этим вечером, и семьям, которые держат для них место за столом, мы шлём свои мысли.

Чего бы ни потребовал от нас наступающий год, я надеюсь, он застанет нас такими же, какими застал этот: уставшими, быть может, но не разобщёнными.

Желаю вам мирного нового года.`,
    glossary: [
      { term: 'it is customary to', ru: 'принято, есть обычай' },
      { term: 'I would ask you to', ru: 'я прошу вас (смягчённое)' },
      { term: 'to be borne', ru: 'быть перенесённым (to bear — переносить)' },
      { term: 'in the main', ru: 'в основном' },
      { term: 'to be remarked upon', ru: 'быть замеченным, отмеченным' },
      { term: 'ungracious', ru: 'неучтивый, неблагодарный' },
      { term: 'time you could not spare', ru: 'время, которого у вас не было в запасе' },
      { term: 'to send our thoughts', ru: 'мысленно быть с кем-то' },
    ],
    questions: [
      {
        q: 'Where is the bad news placed in the speech?',
        options: [
          'At the very beginning',
          'In the middle, between the greeting and the good news',
          'At the very end',
          'There is no bad news',
        ],
        correct: 1,
      },
      {
        q: 'Why "I would ask you" instead of "I ask you"?',
        options: [
          'It refers to the past',
          'It is a softened, more formal request',
          'It is a condition',
          'It is a mistake',
        ],
        correct: 1,
        why: 'Would смягчает: I would ask / I would suggest / I would remind you. Тот же приём в деловой переписке, когда просьба на самом деле требование.',
      },
      {
        q: 'What does "words spoken from a warm room" admit?',
        options: [
          'The room is cold',
          'That the speaker is comfortable and the listeners may not be',
          'That the speech was recorded',
          'That the speech is short',
        ],
        correct: 1,
      },
      {
        q: 'Who is "we" in this speech?',
        options: [
          'The speaker and the government',
          'The speaker together with the whole country — the standard "we" of public address',
          'The family of the speaker',
          'The audience only',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-crown-2',
    workId: 'the-crown',
    lang: 'en', title: 'Записка о протоколе', level: 'B2', minutes: 3,
    topic: 'Знакомство', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'В сериале постоянно повторяется одно: правила существуют не ради красоты, а чтобы никому не пришлось соображать на месте. Ниже наша служебная записка для тех, кого впервые ведут на официальный приём. Полезна она далеко за пределами дворцов: это и есть английский, на котором пишут инструкции для сотрудников.',
    after: 'Последний пункт — самый честный: «если вы что-то сделали не так, никто вам об этом не скажет, и это не значит, что не заметили». Английская вежливость устроена ровно так, и знать это полезнее, чем помнить, с какой стороны лежит вилка.',
    body: `BRIEFING NOTE — FOR GUESTS ATTENDING FOR THE FIRST TIME
Circulation: internal. Please read before Thursday.

FORMS OF ADDRESS
On first speaking, use the full form. After that, "sir" or "ma'am" is correct for the rest of the evening. "Ma'am" is pronounced to rhyme with "jam", not with "calm"; this is the single most common error and the easiest to avoid.

WHEN TO STAND
You stand when the party enters and you remain standing until the guests of honour are seated. If you are in conversation and they approach, finish your sentence — do not stop mid-word. Abruptness is noticed more than lateness.

WHAT NOT TO RAISE
Do not raise ongoing legal matters, staff changes, or anything you would describe as "just quickly". If you are asked about your own work, answer in three sentences and stop; a fourth sentence is where guests are remembered badly.

QUESTIONS
Do not open a question. You may answer one at any length that is proportionate to the question.

PHOTOGRAPHS
None during dinner. The official photographer will be present, and the images will be circulated on Monday.

FINALLY
If you get something wrong, nobody will tell you. That is not the same as nobody noticing. Should you wish to check afterwards, ask the private secretary, who is paid to be asked and would rather be.`,
    translation: `СЛУЖЕБНАЯ ЗАПИСКА — ДЛЯ ГОСТЕЙ, ПРИГЛАШЁННЫХ ВПЕРВЫЕ
Рассылка: внутренняя. Просьба прочесть до четверга.

ФОРМЫ ОБРАЩЕНИЯ
При первом обращении используется полная форма. Далее весь вечер уместно «sir» или «ma'am». «Ma'am» произносится в рифму к «jam», а не к «calm»; это самая частая ошибка и самая легко устранимая.

КОГДА ВСТАВАТЬ
Вы встаёте, когда входит кортеж, и остаётесь стоять, пока не сядут почётные гости. Если вы в разговоре и они подходят — договорите фразу, не обрывайте себя на полуслове. Резкость замечают сильнее, чем опоздание.

ЧЕГО НЕ ПОДНИМАТЬ
Не поднимайте текущих судебных вопросов, кадровых перестановок и всего, что вы сами назвали бы «буквально на минуту». Если спросят о вашей работе, отвечайте тремя предложениями и остановитесь; четвёртое предложение — это то, чем гость и запоминается.

ВОПРОСЫ
Вопросов не задавайте. Отвечать можно настолько подробно, насколько это соразмерно вопросу.

ФОТОГРАФИИ
Во время ужина — никаких. Официальный фотограф будет, снимки разошлют в понедельник.

И НАПОСЛЕДОК
Если вы сделаете что-то не так, вам об этом не скажут. Это не то же самое, что «не заметят». Если захотите потом уточнить, спросите личного секретаря: ему платят за то, чтобы его спрашивали, и он предпочёл бы, чтобы спрашивали.`,
    glossary: [
      { term: 'briefing note', ru: 'служебная записка, памятка' },
      { term: 'forms of address', ru: 'формы обращения' },
      { term: 'guests of honour', ru: 'почётные гости' },
      { term: 'abruptness', ru: 'резкость, внезапность' },
      { term: 'to raise a subject', ru: 'поднять тему' },
      { term: 'proportionate to', ru: 'соразмерный чему-то' },
      { term: 'to circulate', ru: 'разослать по кругу адресатов' },
      { term: 'should you wish to', ru: 'если вы захотите (книжное условие без if)' },
    ],
    questions: [
      {
        q: 'How is "ma\'am" pronounced, according to the note?',
        options: [
          'To rhyme with "calm"',
          'To rhyme with "jam"',
          'Like "madam" in full',
          'It is never said aloud',
        ],
        correct: 1,
      },
      {
        q: 'What should you do if the party approaches while you are talking?',
        options: [
          'Stop immediately',
          'Finish your sentence, then stand',
          'Leave the room',
          'Introduce yourself at once',
        ],
        correct: 1,
      },
      {
        q: 'Why "answer in three sentences and stop"?',
        options: [
          'There is no time',
          'Because the fourth sentence is where a guest starts being remembered badly',
          'It is a grammar exercise',
          'Because the answer is recorded',
        ],
        correct: 1,
      },
      {
        q: '"Should you wish to check afterwards" is another way of saying…',
        options: [
          'You must check afterwards',
          'If you want to check afterwards',
          'You should have checked',
          'Do not check',
        ],
        correct: 1,
        why: 'Инверсия вместо if: should you wish = if you wish. Книжно и очень характерно для инструкций и договоров.',
      },
    ],
  },
]
