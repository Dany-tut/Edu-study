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

  // ── Разделение: карточка, наш текст ────────────────────────────────────────
  //
  // bucket: 'inspired'. Компания, устав и отдел здесь наши. От сериала — один
  // приём: правило, сформулированное как забота о сотруднике.
  {
    id: 'sc-sev-1',
    workId: 'severance',
    lang: 'en', title: 'Выдержка из устава', level: 'B2', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'В сериале у сотрудников есть свод правил, написанный так, будто их любят. Ниже наша выдержка из такого устава. Читать её стоит с одним вопросом к каждому пункту: что здесь сказано на самом деле? Приём везде один — запрет подан как забота, и в английском для этого есть готовые обороты: «we ask that», «at this time», «is not permitted».',
    after: 'Самый показательный пункт — последний. «Дверь вашего руководителя всегда открыта» и тут же «просьба записаться заранее» — то есть открыта она ровно настолько, насколько закрыта. По-английски это называется velvet no, вежливый отказ.',
    body: `EMPLOYEE HANDBOOK — SECTION 4: LIFE ON THE FLOOR

4.1 Your wellbeing
Your wellbeing is our first concern. For this reason we ask that personal items be kept to a single shelf. A tidy desk has been shown to reduce anxiety, and anxiety is not something we wish for you.

4.2 Breaks
You are entitled to two breaks. Breaks are taken in the break room, which is provided for that purpose and is monitored for your safety. Breaks taken elsewhere cannot be recorded, and unrecorded breaks are treated as absence.

4.3 Questions about your work
Questions about the nature of your work are natural and welcome. They cannot be answered at this time. This is not a matter of trust; it is a matter of scope.

4.4 Movement between departments
Movement between departments is not permitted without an escort. This is for your comfort: corridors on this floor are long and are known to be confusing.

4.5 Your supervisor
Your supervisor's door is always open. Please book a slot in advance so that the time can be given to you properly.

Thank you for reading. Your compliance is appreciated and is, of course, voluntary.`,
    translation: `ПАМЯТКА СОТРУДНИКА — РАЗДЕЛ 4: ЖИЗНЬ НА ЭТАЖЕ

4.1 Ваше благополучие
Ваше благополучие — наша первая забота. Поэтому мы просим держать личные вещи в пределах одной полки. Доказано, что порядок на столе снижает тревожность, а тревожности мы вам не желаем.

4.2 Перерывы
Вам полагаются два перерыва. Перерывы проводятся в комнате отдыха, которая для этого и предусмотрена и за которой ведётся наблюдение — ради вашей безопасности. Перерывы в других местах учесть невозможно, а неучтённый перерыв считается отсутствием.

4.3 Вопросы о вашей работе
Вопросы о сути вашей работы естественны и приветствуются. Ответить на них в настоящее время нельзя. Дело не в доверии, а в границах полномочий.

4.4 Перемещение между отделами
Перемещение между отделами без сопровождающего не разрешается. Это ради вашего удобства: коридоры на этом этаже длинные и, как известно, запутанные.

4.5 Ваш руководитель
Дверь вашего руководителя всегда открыта. Пожалуйста, записывайтесь заранее, чтобы это время могло быть уделено вам как следует.

Спасибо за прочтение. Ваше соблюдение правил ценится и, разумеется, добровольно.`,
    glossary: [
      { term: 'wellbeing', ru: 'благополучие, самочувствие' },
      { term: 'we ask that', ru: 'мы просим (смягчённое требование)' },
      { term: 'to be entitled to', ru: 'иметь право на' },
      { term: 'at this time', ru: 'в настоящее время (вежливое «нет»)' },
      { term: 'scope', ru: 'границы полномочий, охват' },
      { term: 'is not permitted', ru: 'не разрешается' },
      { term: 'to book a slot', ru: 'записаться на время' },
      { term: 'compliance', ru: 'соблюдение правил' },
    ],
    questions: [
      {
        q: 'What does 4.2 actually establish?',
        options: [
          'Two free breaks anywhere',
          'That a break outside the break room counts as absence',
          'That breaks are optional',
          'That breaks are unlimited',
        ],
        correct: 1,
      },
      {
        q: 'What does "cannot be answered at this time" really mean?',
        options: [
          'The answer is being prepared',
          'No — phrased so that it does not sound like a refusal',
          'Ask again tomorrow',
          'The question was not understood',
        ],
        correct: 1,
        why: 'At this time — вежливая заглушка. В деловой переписке она же: «we are unable to proceed at this time» почти всегда значит «нет».',
      },
      {
        q: 'How is the ban on walking between departments justified?',
        options: [
          'By security',
          'By the employee’s own comfort — the corridors are said to be confusing',
          'By fire regulations',
          'It is not justified',
        ],
        correct: 1,
      },
      {
        q: 'What is the effect of the last sentence?',
        options: [
          'It makes the rules optional',
          'It calls obedience "voluntary" while the whole text has been giving orders',
          'It thanks the reader sincerely',
          'It cancels section 4',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-sev-2',
    workId: 'severance',
    lang: 'en', title: 'Поощрение по итогам квартала', level: 'B1', minutes: 2,
    topic: 'Обратная связь', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Отдельная линия сериала — награды, которые выдают вместо денег и обставляют как большую честь. Ниже наше уведомление о таком поощрении. Лексика тут вполне рабочая и встретится в любой международной компании: in recognition of, eligible, at the discretion of, non-transferable.',
    after: 'Обратите внимание на сноску мелким шрифтом: награда «не подлежит передаче, обмену и переносу». Настоящий смысл документа всегда лежит в той части, которую набрали кеглем поменьше.',
    body: `NOTICE OF QUARTERLY RECOGNITION

To: the department
Re: Q3 performance

In recognition of the department's performance this quarter, management is pleased to announce that the following will be made available on Friday afternoon:

— a fruit platter (seasonal)
— one (1) hour of music, selected by management
— an engraved paperweight for the highest individual result

Attendance at the recognition event is not compulsory. It is, however, noted.

Employees are reminded that recognition of this kind is awarded at the discretion of management and does not form part of compensation. The award is non-transferable, cannot be exchanged, and cannot be carried over to a future quarter.

We thank you for a strong quarter and look forward to a stronger one.`,
    translation: `УВЕДОМЛЕНИЕ О ПООЩРЕНИИ ПО ИТОГАМ КВАРТАЛА

Кому: отделу
Тема: результаты третьего квартала

В знак признания результатов отдела за этот квартал руководство с удовольствием сообщает, что в пятницу во второй половине дня будут предоставлены:

— фруктовая тарелка (по сезону)
— один (1) час музыки, выбранной руководством
— гравированное пресс-папье за лучший индивидуальный результат

Присутствие на мероприятии не обязательно. Однако оно фиксируется.

Напоминаем сотрудникам, что поощрение такого рода назначается по усмотрению руководства и не входит в состав вознаграждения. Награда не подлежит передаче, обмену и переносу на следующий квартал.

Благодарим за сильный квартал и рассчитываем на ещё более сильный.`,
    glossary: [
      { term: 'in recognition of', ru: 'в знак признания' },
      { term: 'to be made available', ru: 'будет предоставлено' },
      { term: 'compulsory', ru: 'обязательный' },
      { term: 'it is noted', ru: 'это фиксируется, берётся на заметку' },
      { term: 'at the discretion of', ru: 'по усмотрению' },
      { term: 'compensation', ru: 'здесь: совокупное вознаграждение, а не «компенсация»' },
      { term: 'non-transferable', ru: 'не подлежит передаче' },
      { term: 'to carry over', ru: 'перенести на следующий период' },
    ],
    questions: [
      {
        q: 'Is attendance required?',
        options: [
          'Yes, it is compulsory',
          'Formally no — but absence is recorded',
          'Only for the winner',
          'The notice does not say',
        ],
        correct: 1,
        why: '«Not compulsory. It is, however, noted» — две фразы, которые вместе означают «приходи». Приём стоит запомнить: он встречается далеко за пределами сериалов.',
      },
      {
        q: 'What does "does not form part of compensation" mean for the employee?',
        options: [
          'The award is taxed',
          'It is not money and does not count as pay',
          'It replaces the salary',
          'It is paid separately',
        ],
        correct: 1,
      },
      {
        q: 'What does "at the discretion of management" mean?',
        options: [
          'Management decides, and does not have to explain',
          'Management is discreet about it',
          'The staff vote',
          'It is automatic',
        ],
        correct: 0,
      },
    ],
  },

  // ── Утреннее шоу: карточка, наш текст ──────────────────────────────────────
  {
    id: 'sc-tms-1',
    workId: 'morning-show',
    lang: 'en', title: 'Суфлёр: первые две минуты эфира', level: 'B2', minutes: 3,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'То, что ведущий произносит гладко и как бы от себя, лежит перед ним на суфлёре — вместе со служебными пометками, которые в эфир не идут. Ниже наш такой текст. Полезен он двойной оптикой: сам эфирный английский (короткие предложения, настоящее время в заголовках) и режиссёрская разметка вокруг него.',
    after: 'Приём, который стоит заметить: «мы вернёмся к этому после перерыва» — не обещание, а способ уйти от темы, не сказав «не будем это обсуждать». В эфирной речи такие формулы делают всю работу.',
    body: `[ROLL OPENING TITLES — 12 SEC]
[CAM 2 — WIDE, THEN PUSH IN]

GOOD MORNING. IT IS TUESDAY THE ELEVENTH, AND HERE IS WHAT WE ARE FOLLOWING TODAY.

THE STORM THAT CLOSED THE COAST ROAD OVERNIGHT IS MOVING INLAND. WE ARE LIVE IN THE HARBOUR IN A MOMENT.

THE TRANSPORT BILL GOES BACK TO COMMITTEE THIS AFTERNOON. WE WILL EXPLAIN, IN PLAIN LANGUAGE, WHAT WOULD ACTUALLY CHANGE FOR YOU.

AND LATER: THE SCHOOL THAT PUT ITS ENTIRE LIBRARY ON A BUS.

[PAUSE — SMILE — DO NOT RUSH THIS]

BUT WE BEGIN WITH THE STORM.
[TAKE VT — 00:47]
[BACK TO CAM 1 ON VT OUT]

FOR THOSE OF YOU JUST JOINING US: NO INJURIES HAVE BEEN REPORTED, AND THE ROAD IS EXPECTED TO REOPEN BY MIDDAY.

[FLOOR: guest is not miked yet — HOLD 15 SEC, stretch]

WE WILL HAVE MUCH MORE ON THAT THROUGHOUT THE MORNING. WE WILL ALSO COME BACK, AFTER THE BREAK, TO THE QUESTION EVERYONE HAS BEEN ASKING US SINCE FRIDAY.

[BREAK — 2:30]`,
    translation: `[ЗАСТАВКА — 12 СЕК]
[КАМЕРА 2 — ОБЩИЙ, ЗАТЕМ НАЕЗД]

ДОБРОЕ УТРО. СЕГОДНЯ ВТОРНИК, ОДИННАДЦАТОЕ, И ВОТ ЧТО МЫ СЕГОДНЯ ОТСЛЕЖИВАЕМ.

ШТОРМ, ИЗ-ЗА КОТОРОГО НОЧЬЮ ЗАКРЫЛИ ПРИБРЕЖНОЕ ШОССЕ, УХОДИТ ВГЛУБЬ МАТЕРИКА. ЧЕРЕЗ МИНУТУ — ПРЯМОЕ ВКЛЮЧЕНИЕ ИЗ ПОРТА.

ЗАКОНОПРОЕКТ О ТРАНСПОРТЕ СЕГОДНЯ ДНЁМ ВОЗВРАЩАЕТСЯ В КОМИТЕТ. МЫ ОБЪЯСНИМ ПРОСТЫМИ СЛОВАМИ, ЧТО ИЗМЕНИТСЯ ИМЕННО ДЛЯ ВАС.

И ПОЗЖЕ: ШКОЛА, КОТОРАЯ ПЕРЕВЕЗЛА ВСЮ СВОЮ БИБЛИОТЕКУ В АВТОБУС.

[ПАУЗА — УЛЫБКА — НЕ ТОРОПИТЬСЯ]

НО НАЧИНАЕМ МЫ СО ШТОРМА.
[СЮЖЕТ — 00:47]
[ПОСЛЕ СЮЖЕТА — КАМЕРА 1]

ДЛЯ ТЕХ, КТО ТОЛЬКО ЧТО К НАМ ПРИСОЕДИНИЛСЯ: О ПОСТРАДАВШИХ НЕ СООБЩАЛОСЬ, ДОРОГУ РАССЧИТЫВАЮТ ОТКРЫТЬ К ПОЛУДНЮ.

[СТУДИЯ: гостю не поставили микрофон — ТЯНЕМ 15 СЕК]

МЫ БУДЕМ ВОЗВРАЩАТЬСЯ К ЭТОМУ В ТЕЧЕНИЕ ВСЕГО УТРА. А ПОСЛЕ ПЕРЕРЫВА ВЕРНЁМСЯ К ВОПРОСУ, КОТОРЫЙ ВЫ ЗАДАЁТЕ НАМ С ПЯТНИЦЫ.

[РЕКЛАМА — 2:30]`,
    glossary: [
      { term: 'to push in', ru: 'наезд камеры' },
      { term: 'to go back to committee', ru: 'вернуться на рассмотрение комитета' },
      { term: 'in plain language', ru: 'простыми словами' },
      { term: 'VT (videotape)', ru: 'заранее снятый сюжет' },
      { term: 'for those of you just joining us', ru: 'для тех, кто только что присоединился' },
      { term: 'no injuries have been reported', ru: 'о пострадавших не сообщалось' },
      { term: 'to be miked', ru: 'быть с надетым микрофоном' },
      { term: 'to stretch', ru: 'тянуть время в эфире' },
    ],
    questions: [
      {
        q: 'What is the difference between the lines in capitals and the lines in brackets?',
        options: [
          'None — it is all read out',
          'Capitals are spoken on air; brackets are instructions for the studio',
          'Brackets are read more quietly',
          'Capitals are the guest’s words',
        ],
        correct: 1,
      },
      {
        q: 'Why does the script say "HOLD 15 SEC, stretch"?',
        options: [
          'The presenter is tired',
          'The guest has no microphone yet, so the presenter must keep talking',
          'There is a technical fault in the camera',
          'The break is early',
        ],
        correct: 1,
      },
      {
        q: '"No injuries have been reported" is careful because…',
        options: [
          'It says nobody was hurt',
          'It only says that no injuries have been reported so far — not that there are none',
          'It is in the past tense',
          'It names a source',
        ],
        correct: 1,
        why: 'Именно так новости страхуются: сообщают не о факте, а о состоянии сведений. Та же логика в «is expected to reopen».',
      },
      {
        q: 'What does the last line before the break really do?',
        options: [
          'Promises an answer',
          'Postpones an uncomfortable subject while sounding like a promise',
          'Announces the weather',
          'Thanks the audience',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-tms-2',
    workId: 'morning-show',
    lang: 'en', title: 'Заявление для прессы', level: 'B2', minutes: 3,
    topic: 'Обратная связь', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Отдельный жанр английского — извинение, в котором никто ни в чём не признаётся. Ниже наше заявление канала. Разбирать его надо по глаголам: где действие названо, а где оно осталось без исполнителя. «Mistakes were made» — самая известная фраза этого жанра, и она построена ровно на этом.',
    after: 'Сравните два абзаца в конце. Про сотрудника сказано «принял решение уйти» — то есть решил сам; про канал сказано «мы сожалеем о том, как это было воспринято» — то есть сожалеем не о поступке, а о реакции. Оба оборота стоит уметь узнавать.',
    body: `STATEMENT FROM THE NETWORK

We are aware of the reports published this morning and we take them seriously.

Mistakes were made in how the matter was handled internally, and processes that should have caught it did not. A review has been commissioned and will report before the end of the quarter. We will not be commenting further while that review is ongoing.

We want to be clear that the standards our audience expects of us are the standards we expect of ourselves. Where we have fallen short of them, we regret how that has been experienced by those affected.

The individual concerned has decided to step down in order to focus on personal matters, and we thank them for their years of service.

We will have more to say when we are able to.`,
    translation: `ЗАЯВЛЕНИЕ ТЕЛЕКАНАЛА

Нам известно о публикациях, вышедших сегодня утром, и мы относимся к ним серьёзно.

При внутреннем разбирательстве были допущены ошибки, а процедуры, которые должны были это выявить, не сработали. Назначена проверка, результаты которой будут представлены до конца квартала. Пока проверка идёт, дальнейших комментариев мы давать не будем.

Мы хотим ясно сказать: те стандарты, которых от нас ждёт зритель, — это те же стандарты, которых мы ждём от себя. Там, где мы им не соответствовали, мы сожалеем о том, как это было пережито затронутыми людьми.

Соответствующий сотрудник принял решение уйти, чтобы сосредоточиться на личных обстоятельствах, и мы благодарим его за годы работы.

Мы скажем больше, когда сможем.`,
    glossary: [
      { term: 'mistakes were made', ru: 'были допущены ошибки (без указания кем)' },
      { term: 'to handle a matter', ru: 'вести, разбирать вопрос' },
      { term: 'to commission a review', ru: 'назначить проверку' },
      { term: 'ongoing', ru: 'продолжающийся, идущий' },
      { term: 'to fall short of', ru: 'не дотягивать до' },
      { term: 'those affected', ru: 'затронутые, пострадавшие' },
      { term: 'to step down', ru: 'уйти с должности' },
      { term: 'the individual concerned', ru: 'соответствующее лицо (безымянно)' },
    ],
    questions: [
      {
        q: 'Who made the mistakes, according to the statement?',
        options: [
          'The management',
          'Nobody is named — the passive voice removes the actor',
          'The audience',
          'The press',
        ],
        correct: 1,
        why: 'Mistakes were made — учебниковый пример «извинения без виноватого». Действие есть, исполнителя нет.',
      },
      {
        q: 'What exactly is the network sorry about?',
        options: [
          'What it did',
          'How what it did was experienced by others',
          'The publication of the reports',
          'Nothing at all',
        ],
        correct: 1,
      },
      {
        q: 'Was the individual dismissed?',
        options: [
          'Yes, the statement says so',
          'The statement says they decided to step down — which is not the same thing',
          'They were promoted',
          'They are still in post',
        ],
        correct: 1,
      },
      {
        q: 'What is the function of "we will not be commenting while the review is ongoing"?',
        options: [
          'It promises transparency',
          'It provides a reason for answering nothing else, for as long as needed',
          'It sets a deadline',
          'It invites questions',
        ],
        correct: 1,
      },
    ],
  },

  // ── Кремниевая долина: карточка, наш текст ─────────────────────────────────
  {
    id: 'sc-sv-1',
    workId: 'silicon-valley',
    lang: 'en', title: 'Питч на три минуты', level: 'B2', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Питч — жанр с жёсткой формой: проблема, решение, цифры, деньги, просьба. Ниже наш текст в этой форме, вымышленная компания. Лексика здесь та, которую спросят на любом собеседовании в продукт: traction, runway, churn, unit economics. Ни одно из этих слов не значит того, что подсказывает словарь.',
    after: 'Обратите внимание на предпоследний абзац: сильный питч сам называет своё слабое место раньше инвестора. По-английски это оформляется как «the honest part» или «what keeps me up at night» — и работает лучше, чем попытка эту дыру спрятать.',
    body: `Three minutes. I will use two.

The problem. A mid-size logistics company runs about four hundred deliveries a day and knows where roughly three hundred of them are. The remaining hundred are found by phoning drivers. Everybody in this industry does this, and everybody assumes it is normal.

What we built. One line of code in their existing system, and every parcel reports itself. No new hardware, no new app for the driver, nothing for anyone to remember to do.

Traction. Eleven paying customers, up from four in January. Ninety-one thousand in annual recurring revenue. Net churn is negative — our existing customers grew faster than the two we lost.

Unit economics. We spend about eleven hundred to win a customer and we make that back in five months. That number was fourteen months a year ago, and the change is the whole reason I am in this room.

The honest part. We have one customer who is nineteen per cent of revenue. If they leave, this quarter looks very different. We are working on it and I would rather you heard it from me.

The ask. Two million for eighteen months of runway. Half goes to two engineers, half to a sales team of exactly one, because we have proved we can sell it and not that we can market it.

That is two minutes. Questions.`,
    translation: `Три минуты. Я потрачу две.

Проблема. Логистическая компания средних размеров делает около четырёхсот доставок в день и знает, где находятся примерно триста из них. Оставшуюся сотню ищут, обзванивая водителей. Так делают все в этой отрасли, и все считают, что это нормально.

Что мы сделали. Одна строчка кода в их действующей системе — и каждая посылка сама сообщает, где она. Никакого нового оборудования, никакого нового приложения для водителя, ничего, что кому-то нужно было бы не забыть сделать.

Тяга. Одиннадцать платящих клиентов против четырёх в январе. Девяносто одна тысяча годовой повторяющейся выручки. Отток отрицательный: имеющиеся клиенты выросли быстрее, чем ушли те двое.

Юнит-экономика. На привлечение клиента мы тратим около тысячи ста и возвращаем это за пять месяцев. Год назад этот срок был четырнадцать месяцев, и именно это изменение — причина, по которой я здесь.

Честная часть. У нас есть клиент, дающий девятнадцать процентов выручки. Если он уйдёт, квартал будет выглядеть совсем иначе. Мы над этим работаем, и я предпочту, чтобы вы услышали это от меня.

Запрос. Два миллиона на восемнадцать месяцев жизни. Половина — на двух инженеров, половина — на отдел продаж ровно из одного человека, потому что мы доказали, что умеем это продавать, а не что умеем это продвигать.

Это две минуты. Вопросы.`,
    glossary: [
      { term: 'traction', ru: 'тяга: подтверждённый рост спроса' },
      { term: 'ARR (annual recurring revenue)', ru: 'годовая повторяющаяся выручка' },
      { term: 'churn', ru: 'отток клиентов' },
      { term: 'unit economics', ru: 'экономика одного клиента' },
      { term: 'to win a customer', ru: 'привлечь клиента' },
      { term: 'runway', ru: 'запас денег до конца — на сколько месяцев хватит' },
      { term: 'the ask', ru: 'запрос: сколько просим и на что' },
      { term: 'to sell vs to market', ru: 'продать лично vs продвигать на рынке' },
    ],
    questions: [
      {
        q: 'What does "runway" mean here?',
        options: [
          'A landing strip',
          'How many months the company can operate on the money it has',
          'A product roadmap',
          'A sales channel',
        ],
        correct: 1,
      },
      {
        q: 'What does "net churn is negative" mean?',
        options: [
          'The company is losing money',
          'Growth from existing customers is bigger than the revenue lost with those who left',
          'No customers left',
          'The figure is an error',
        ],
        correct: 1,
        why: 'Отрицательный отток — сильный показатель: оставшиеся клиенты платят больше, чем унесли ушедшие.',
      },
      {
        q: 'Why does the speaker mention the customer worth nineteen per cent of revenue?',
        options: [
          'To boast',
          'To name the main risk before the investors find it themselves',
          'To explain the price',
          'By mistake',
        ],
        correct: 1,
      },
      {
        q: 'What is the difference between "we can sell it" and "we can market it"?',
        options: [
          'None',
          'Selling is one-to-one and proved; marketing is reaching a market and is not proved yet',
          'Marketing is cheaper',
          'Selling means exporting',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-sv-2',
    workId: 'silicon-valley',
    lang: 'en', title: 'Стендап в 9:45', level: 'B1', minutes: 2,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Ежедневный стендап — самая частая рабочая ситуация в IT и в продуктовых командах: пятнадцать минут, три вопроса, все стоят. Ниже наши записи такого стендапа. Форма жёсткая, поэтому язык предсказуемый — и выучив его один раз, вы поймёте любой стендап на английском.',
    after: 'Главное слово здесь — blocker: то, из-за чего человек не может двигаться дальше сам. На стендапе про блокеры говорят вслух, но не решают их — решают после, вдвоём. Именно это имеет в виду последняя строка.',
    body: `STANDUP — TUE 9:45 — 15 MIN — WE STAND, IT KEEPS IT SHORT

MAYA
Yesterday: finished the import, wrote the tests.
Today: the export, same shape.
Blockers: none.

DEV
Yesterday: chased the bug from Friday. It is not our bug, it is in the library.
Today: pin the version, open an issue upstream, move on.
Blockers: I need someone to approve the pin because it touches the build.

PRIYA
Yesterday: talked to four users, three said the same thing about the second screen.
Today: writing that up, then design review at two.
Blockers: waiting on staging. It has been down since Monday.

TOM
Yesterday: mostly interviews.
Today: mostly interviews.
Blockers: none, unless you count the interviews.

ACTIONS
— Dev's pin: I will approve it after this.
— Staging: Maya to look, fifteen minutes, not more.
— Priya's finding goes on the agenda for Thursday, not now.

Anything else is a two-person conversation. Take it after the call, not during it.`,
    translation: `СТЕНДАП — ВТ 9:45 — 15 МИН — СТОИМ, ТАК КОРОЧЕ

МАЙЯ
Вчера: доделала импорт, написала тесты.
Сегодня: экспорт, та же структура.
Блокеры: нет.

ДЕВ
Вчера: догонял баг с пятницы. Баг не наш, он в библиотеке.
Сегодня: зафиксирую версию, заведу задачу у них, иду дальше.
Блокеры: нужно, чтобы кто-то согласовал фиксацию версии — она задевает сборку.

ПРИЯ
Вчера: поговорила с четырьмя пользователями, трое сказали одно и то же про второй экран.
Сегодня: оформляю это, потом в два — разбор макетов.
Блокеры: жду стенд. Он лежит с понедельника.

ТОМ
Вчера: в основном собеседования.
Сегодня: в основном собеседования.
Блокеры: нет, если не считать собеседований.

ЧТО ДЕЛАЕМ
— Фиксация версии у Дева: согласую сразу после стендапа.
— Стенд: Майя посмотрит, пятнадцать минут, не больше.
— Находку Приши выносим на четверг, не сейчас.

Всё остальное — разговор на двоих. Обсуждайте после созвона, а не во время.`,
    glossary: [
      { term: 'standup', ru: 'короткая ежедневная планёрка' },
      { term: 'blocker', ru: 'то, из-за чего нельзя двигаться дальше' },
      { term: 'to chase a bug', ru: 'догонять, вылавливать ошибку' },
      { term: 'upstream', ru: 'в исходном проекте, у авторов библиотеки' },
      { term: 'to pin a version', ru: 'зафиксировать версию' },
      { term: 'staging', ru: 'тестовый стенд, копия боевого' },
      { term: 'to write something up', ru: 'оформить в виде документа' },
      { term: 'to be down', ru: 'не работать, лежать (о сервисе)' },
    ],
    questions: [
      {
        q: 'What are the three things each person reports?',
        options: [
          'Mood, plans, holidays',
          'Yesterday, today, blockers',
          'Sales, costs, risks',
          'Bugs, tests, releases',
        ],
        correct: 1,
      },
      {
        q: 'What is Dev\'s blocker?',
        options: [
          'The bug itself',
          'He needs approval because pinning the version affects the build',
          'He has no computer',
          'The library is closed',
        ],
        correct: 1,
      },
      {
        q: '"Staging has been down since Monday" means…',
        options: [
          'The test environment has not worked since Monday',
          'The stage was taken away',
          'The team went down a level',
          'The release was on Monday',
        ],
        correct: 0,
      },
      {
        q: 'What is the rule stated in the last line?',
        options: [
          'Do not speak at all',
          'Anything that concerns only two people is discussed after the meeting',
          'Everything must be decided now',
          'Write everything down',
        ],
        correct: 1,
      },
    ],
  },

  // ── Чернобыль: карточка, наш текст ─────────────────────────────────────────
  //
  // bucket: 'inspired'. Речь идёт о реальной катастрофе, поэтому здесь особенно
  // важно: станция, город и цифры вымышлены, реальных лиц и событий в текстах
  // нет. От сериала — два регистра: технический доклад и успокоительное
  // объявление, между которыми и лежит вся его суть.
  {
    id: 'sc-chern-1',
    workId: 'chernobyl',
    lang: 'en', title: 'Донесение с объекта', level: 'B2', minutes: 3,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Первая серия держится на одном: прибор показывает максимум своей шкалы, и это записывают как «максимум прибора», а не как «мы не знаем сколько». Ниже наше донесение в том же жанре, станция вымышленная. Читать стоит ради технического английского — единицы, допуски, «в пределах», «не превышает» — и ради того, как в такой форме прячут незнание.',
    after: 'Ключ ко всему тексту — пункт 5. Прибор рассчитан на определённый предел; если он показывает предел, это не значит, что там ровно столько, — это значит, что измерять надо другим прибором. Донесение выбирает первое прочтение.',
    body: `INCIDENT REPORT — 01:47 — SHIFT SUPERVISOR TO DUTY OFFICER

1. At 01:23 a pressure excursion occurred in the secondary circuit of Unit 2. The turbine hall was evacuated within four minutes. All shift personnel are accounted for.

2. Two operators were taken to the medical point with burns. A third reports a metallic taste and has been advised to rest. He has not been withdrawn from duty at this stage.

3. Water supply to the affected circuit has been restored and is being maintained manually. Pressure is stable and has remained within the permitted range for the last twenty minutes.

4. There is damage to the roof of the turbine hall. Debris has been observed on the ground to the north of the building. Personnel have been instructed not to approach it.

5. Radiological measurement: the dosimeter available on shift reads 3.6 roentgen per hour. This is the upper limit of the instrument. A higher-range instrument has been requested from stores and has not yet been located. The figure of 3.6 is therefore reported as measured.

6. In the assessment of this shift, the situation is contained and does not require notification beyond the plant at this time.

Signed, shift supervisor, Unit 2.`,
    translation: `ДОНЕСЕНИЕ О ПРОИСШЕСТВИИ — 01:47 — НАЧАЛЬНИК СМЕНЫ ДЕЖУРНОМУ

1. В 01:23 во втором контуре блока № 2 произошёл скачок давления. Машинный зал эвакуирован в течение четырёх минут. Весь персонал смены на месте, все учтены.

2. Двое операторов доставлены в медпункт с ожогами. Третий сообщает о металлическом привкусе во рту, ему рекомендован покой. Со смены на данном этапе он не снят.

3. Подача воды в повреждённый контур восстановлена и поддерживается вручную. Давление стабильно и последние двадцать минут остаётся в допустимых пределах.

4. Имеются повреждения кровли машинного зала. К северу от здания на земле замечены обломки. Персоналу указано к ним не приближаться.

5. Радиационные измерения: имеющийся на смене дозиметр показывает 3,6 рентгена в час. Это верхний предел прибора. Прибор с большим диапазоном запрошен со склада и пока не найден. Значение 3,6 приводится как измеренное.

6. По оценке смены, обстановка локализована и не требует оповещения за пределы станции в настоящее время.

Подпись: начальник смены блока № 2.`,
    glossary: [
      { term: 'to be accounted for', ru: 'быть учтённым, найденным' },
      { term: 'to withdraw from duty', ru: 'снять со смены' },
      { term: 'within the permitted range', ru: 'в допустимых пределах' },
      { term: 'debris', ru: 'обломки' },
      { term: 'upper limit of the instrument', ru: 'верхний предел шкалы прибора' },
      { term: 'higher-range', ru: 'с большим диапазоном измерения' },
      { term: 'contained', ru: 'локализованный, взятый под контроль' },
      { term: 'at this time', ru: 'на данный момент (осторожная оговорка)' },
    ],
    questions: [
      {
        q: 'What does point 5 actually say about the radiation level?',
        options: [
          'It is 3.6 roentgen per hour',
          'It is at least 3.6 — the instrument cannot show more',
          'It is below normal',
          'It was not measured',
        ],
        correct: 1,
        why: 'Прибор упёрся в потолок шкалы. «The upper limit of the instrument» — это не результат измерения, а его отсутствие.',
      },
      {
        q: 'Why does the report say "the figure of 3.6 is therefore reported as measured"?',
        options: [
          'To confirm accuracy',
          'To pass on the number without taking responsibility for what it means',
          'To request a new instrument',
          'To close the incident',
        ],
        correct: 1,
      },
      {
        q: 'What happened to the third operator?',
        options: [
          'He was sent home',
          'He reports a metallic taste, was told to rest, and is still on duty',
          'He was taken to hospital',
          'He is missing',
        ],
        correct: 1,
      },
      {
        q: 'What does "does not require notification beyond the plant" mean?',
        options: [
          'Nobody outside the station needs to be told',
          'The plant will be closed',
          'The report is confidential',
          'The shift is over',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'sc-chern-2',
    workId: 'chernobyl',
    lang: 'en', title: 'Объявление для жителей', level: 'B1', minutes: 2,
    topic: 'Дом и город', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 2,
    textOrigin: 'ours', origin: 'original',
    setup: 'Второй регистр сериала — тот, которым про то же самое говорят с людьми. Ниже наше объявление об эвакуации вымышленного города. Стоит сравнить его с донесением из первой сцены: те же события, но ни одной цифры, зато три успокоительных оборота и точное указание, что брать с собой.',
    after: 'Фраза «возьмите документы и вещи на три дня» — самая честная в тексте и одновременно самая обманчивая: она задаёт срок, которого никто не обещал. Три дня названы не потому, что столько продлится, а потому, что столько люди готовы принять спокойно.',
    body: `ATTENTION, RESIDENTS OF THE TOWN

Comrades, in connection with the accident at the power station, a temporary evacuation of the town is being carried out.

Buses will be provided. They will arrive at the entrances of residential buildings from fourteen hundred hours today. Please be ready by that time.

Take with you documents, essential items and food for three days. It is recommended that you take warm clothing. Do not take furniture, and do not take pets: this is a temporary measure and the animals will be cared for.

Please close your windows, switch off the electricity and lock your apartment.

There is no cause for alarm. The measure is precautionary. Order in the town is being maintained.

Comrades, leaving your homes temporarily is a necessary step. Please observe calm and organisation in this matter, which is temporary.`,
    translation: `ВНИМАНИЕ, ЖИТЕЛИ ГОРОДА

Товарищи, в связи с аварией на электростанции проводится временная эвакуация города.

Будут поданы автобусы. Они прибудут к подъездам жилых домов начиная с четырнадцати часов сегодняшнего дня. Просьба быть готовыми к этому времени.

Возьмите с собой документы, предметы первой необходимости и питание на три дня. Рекомендуется взять тёплую одежду. Мебель не берите и домашних животных не берите: мера временная, о животных позаботятся.

Просьба закрыть окна, выключить электричество и запереть квартиру.

Оснований для беспокойства нет. Мера предупредительная. Порядок в городе поддерживается.

Товарищи, временный отъезд из домов — необходимый шаг. Просьба соблюдать спокойствие и организованность в этом деле, которое носит временный характер.`,
    glossary: [
      { term: 'in connection with', ru: 'в связи с' },
      { term: 'to be carried out', ru: 'проводится, осуществляется' },
      { term: 'essential items', ru: 'предметы первой необходимости' },
      { term: 'precautionary', ru: 'предупредительный, на всякий случай' },
      { term: 'there is no cause for alarm', ru: 'оснований для беспокойства нет' },
      { term: 'to observe calm', ru: 'соблюдать спокойствие' },
      { term: 'temporary', ru: 'временный' },
    ],
    questions: [
      {
        q: 'How many times does the announcement call the measure "temporary"?',
        options: ['Once', 'Twice', 'Four times', 'Never'],
        correct: 2,
        why: 'Слово повторено в первом абзаце, в абзаце про животных и дважды в последнем. Повтор здесь и есть аргумент: доказательств нет, есть настойчивость.',
      },
      {
        q: 'What are residents told to take?',
        options: [
          'Everything they can carry',
          'Documents, essentials and three days of food',
          'Only documents',
          'Furniture and pets',
        ],
        correct: 1,
      },
      {
        q: 'What information from the incident report is missing here?',
        options: [
          'The time of the buses',
          'Any figure at all — no measurement is mentioned',
          'The name of the town',
          'The list of items',
        ],
        correct: 1,
      },
      {
        q: 'What does "the measure is precautionary" suggest?',
        options: [
          'That there is a real danger',
          'That this is only a safeguard — nothing has actually happened',
          'That the buses are late',
          'That the town is closed for repairs',
        ],
        correct: 1,
      },
    ],
  },

  // ── Медведь: карточка, наш текст ───────────────────────────────────────────
  //
  // bucket: 'inspired'. Заведение и повара наши. От сериала — кухонный
  // протокол: выкрики, которые обязаны повторять вслух. Он реально существует
  // и устроен как радиосвязь, поэтому и учится так же.
  {
    id: 'sc-bear-1',
    workId: 'the-bear',
    lang: 'en', title: 'Как разговаривают на кухне', level: 'B1', minutes: 3,
    topic: 'Еда', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'На профессиональной кухне говорят отдельным языком, и он не для красоты: люди носят кипяток в узком проходе и не видят, кто у них за спиной. Ниже наша смена в этом протоколе. Правило одно — всё сказанное обязаны повторить вслух, иначе считается, что не услышали. Это ровно та же логика, что у «over» и «copy» в рации.',
    after: 'Обратите внимание на «86». Так на кухне говорят, что блюдо кончилось: «86 the special» — снимаем спецпредложение. Слово это ушло далеко за пределы кухни и означает «убрать, вычеркнуть, избавиться».',
    body: `— Six o'clock. Family meal is done, we open in thirty. Board, please.

— On the board: forty covers, two large parties, one at seven and one at eight-thirty. Two allergies, both nuts, both on the seven.

— Heard.

— Chef, we are low on the short rib. I have nine portions.

— Nine. So we 86 it at nine and we do not promise it to anybody at the door. Front of house, hear me?

— Heard, chef.

— Behind. Behind you, Marco. — Corner! — Hot behind, coming through.

— Hands! I need hands on this pass, it is dying under the light.

— Yes, chef.

— Order in: two soup, one salad no dressing, one short rib mid-rare.

— Two soup, one salad no dressing, one rib mid-rare. Heard.

— How long on the rib?

— Six minutes.

— You said six four minutes ago.

— Then two, chef.

— Say two.

— Two, chef.

— Better. Walk it when it is ready, do not shout it. And somebody wipe the pass — we are not sending plates out with thumbprints on them tonight or any night.`,
    translation: `— Шесть. Персонал поел, открываемся через тридцать. Доску, пожалуйста.

— На доске: сорок посадок, две большие компании — одна в семь, вторая в полдевятого. Две аллергии, обе на орехи, обе в семичасовой.

— Принял.

— Шеф, у нас мало рёбер. Девять порций.

— Девять. Значит, на девятой снимаем и никому у входа не обещаем. Зал, слышите меня?

— Слышим, шеф.

— За спиной. За спиной у тебя, Марко. — Угол! — Горячее за спиной, прохожу.

— Руки! Мне нужны руки на раздаче, там всё умирает под лампой.

— Да, шеф.

— Заказ: два супа, один салат без заправки, одни рёбра средней прожарки.

— Два супа, один салат без заправки, одни рёбра средней. Принял.

— Сколько по рёбрам?

— Шесть минут.

— Ты сказал «шесть» четыре минуты назад.

— Тогда две, шеф.

— Так и говори — две.

— Две, шеф.

— Уже лучше. Как будет готово — донеси, а не кричи. И пусть кто-нибудь протрёт раздачу: мы не отдаём тарелки с отпечатками пальцев ни сегодня, ни вообще.`,
    glossary: [
      { term: 'covers', ru: 'посадки, число гостей за вечер' },
      { term: 'heard', ru: 'принял, услышал (обязательный отклик)' },
      { term: 'to 86 something', ru: 'снять из меню, кончилось' },
      { term: 'front of house', ru: 'зал: официанты и хостес' },
      { term: 'behind', ru: 'я у тебя за спиной — не оборачивайся' },
      { term: 'corner', ru: 'иду из-за угла' },
      { term: 'hands', ru: 'нужны руки, чтобы унести готовое' },
      { term: 'the pass', ru: 'раздача — место, где блюда отдают в зал' },
      { term: 'mid-rare', ru: 'средней прожарки с кровью' },
    ],
    questions: [
      {
        q: 'What does a cook mean by shouting "Behind"?',
        options: [
          'Come here',
          'I am passing behind you — do not turn round',
          'You are late',
          'The dish is delayed',
        ],
        correct: 1,
      },
      {
        q: 'What does "we 86 it at nine" mean?',
        options: [
          'We serve it at nine o’clock',
          'After the ninth portion the dish is off the menu',
          'We order eighty-six more',
          'It costs eighty-six',
        ],
        correct: 1,
      },
      {
        q: 'Why must everything be repeated back ("Heard", "Yes, chef")?',
        options: [
          'It is politeness',
          'Without the reply nobody knows the message was received — as on a radio',
          'It is a tradition from the army',
          'To make the shift louder',
        ],
        correct: 1,
      },
      {
        q: 'Why is the chef annoyed about "six minutes"?',
        options: [
          'Six is too long',
          'The same estimate was given four minutes ago, so it was never real',
          'The cook mumbled',
          'The rib is overcooked',
        ],
        correct: 1,
        why: 'На кухне время — обязательство, а не догадка. Поэтому дальше идёт «Say two»: назови настоящую цифру и отвечай за неё.',
      },
    ],
  },
  {
    id: 'sc-bear-2',
    workId: 'the-bear',
    lang: 'en', title: 'Разбор после смены', level: 'B2', minutes: 3,
    topic: 'Обратная связь', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Вторая половина сериала — про то, как из ора сделать работающую команду. Ниже наши записи после смены. Это образец обратной связи, устроенной правильно: сначала что произошло, потом что делаем, и отдельно — что было хорошо. Формулировки здесь стоит просто забрать себе, они работают в любой профессии.',
    after: 'Последний пункт — главный: «критикуем блюдо, а не человека». По-английски разница делается грамматикой: не «you were sloppy», а «the plate went out sloppy». Первое обвиняет, второе описывает.',
    body: `POST-SHIFT NOTES — SATURDAY

WHAT HAPPENED
Forty-four covers, nine over what we planned for. Two tickets went out in the wrong order. One dish came back.

THE DISH THAT CAME BACK
It came back because it was cold, and it was cold because it sat on the pass for four minutes while we looked for hands. That is not the fault of whoever cooked it. That is a staffing decision I made at six o'clock, and I made it wrong.

WHAT WE CHANGE ON MONDAY
One person stays on the pass from seven. They do nothing else — no prep, no plating, nothing. If that person is standing still for ten minutes, good. That is what the job is.

Call your times honestly. A real eight is better than an optimistic four. Nobody has ever been shouted at here for saying eight.

WHAT WENT WELL, AND I MEAN IT
The two allergy tickets were handled cleanly and separately, with the board double-checked by two people. That is exactly right and it is the part of the night that could actually have hurt someone.

Marco, second half of service was a different cook from the first half. Whatever you changed, keep it.

Finally: we talk about the plate, not about the person. The plate went out cold. Nobody in this kitchen is cold.`,
    translation: `ЗАПИСКИ ПОСЛЕ СМЕНЫ — СУББОТА

ЧТО БЫЛО
Сорок четыре посадки — на девять больше, чем планировали. Два заказа ушли не в том порядке. Одно блюдо вернули.

ПРО ВОЗВРАЩЁННОЕ БЛЮДО
Его вернули, потому что оно было холодным, а холодным оно было потому, что простояло на раздаче четыре минуты, пока мы искали свободные руки. Это не вина того, кто его готовил. Это моё кадровое решение, принятое в шесть часов, и принял я его неправильно.

ЧТО МЕНЯЕМ С ПОНЕДЕЛЬНИКА
С семи один человек стоит на раздаче. Больше ничего: ни заготовок, ни выкладки, ничего. Если этот человек десять минут простоял без дела — хорошо. В этом и состоит работа.

Называйте время честно. Настоящие восемь лучше, чем оптимистичные четыре. За «восемь» здесь ещё ни на кого не орали.

ЧТО ВЫШЛО ХОРОШО — И Я ГОВОРЮ ЭТО ВСЕРЬЁЗ
Два заказа с аллергией провели чисто и отдельно, доску перепроверили вдвоём. Это ровно как надо, и это та часть вечера, где реально можно было навредить человеку.

Марко, во второй половине смены работал уже другой повар, не тот, что в первой. Что бы ты ни поменял — не бросай.

И напоследок: мы говорим о тарелке, а не о человеке. Тарелка ушла холодной. Холодных людей на этой кухне нет.`,
    glossary: [
      { term: 'post-shift', ru: 'после смены' },
      { term: 'ticket', ru: 'заказ, чек с кухонного принтера' },
      { term: 'to come back (of a dish)', ru: 'быть возвращённым гостем' },
      { term: 'staffing', ru: 'расстановка людей по местам' },
      { term: 'prep', ru: 'заготовки до открытия' },
      { term: 'to call your times', ru: 'называть, сколько осталось до готовности' },
      { term: 'to handle cleanly', ru: 'провести чисто, без ошибок' },
      { term: 'and I mean it', ru: 'и я говорю это всерьёз' },
    ],
    questions: [
      {
        q: 'Who does the chef blame for the cold dish?',
        options: [
          'The cook',
          'Himself — it was his staffing decision',
          'The waiter',
          'The guest',
        ],
        correct: 1,
      },
      {
        q: 'What is the new rule for the pass?',
        options: [
          'Everyone helps when they can',
          'One person is on the pass from seven and does nothing else',
          'The pass closes at seven',
          'Two people share the pass',
        ],
        correct: 1,
      },
      {
        q: 'Why does the chef praise the handling of the allergy tickets first?',
        options: [
          'It was the fastest part of the night',
          'It was the part where a mistake could actually have harmed someone',
          'It was the most expensive dish',
          'The guests complained',
        ],
        correct: 1,
      },
      {
        q: 'What is the grammatical point of "the plate went out cold"?',
        options: [
          'It is passive and therefore vague',
          'It describes the result instead of accusing a person',
          'It is a command',
          'It is a joke',
        ],
        correct: 1,
        why: 'Сравните: «you were sloppy» и «the plate went out sloppy». Второе можно обсуждать, первое можно только отрицать.',
      },
    ],
  },

  // ── Убийства в одном здании: карточка, наш текст ───────────────────────────
  {
    id: 'sc-omitb-1',
    workId: 'only-murders',
    lang: 'en', title: 'Сценарий подкаста, первый эпизод', level: 'B1', minutes: 3,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Подкаст — редкий жанр: текст пишут, чтобы он звучал как непринуждённая речь. Отсюда особенности, которых нет ни в письменном, ни в устном английском по отдельности: короткие абзацы, обращение к одному слушателю на «you», паузы, размеченные прямо в тексте. Ниже наш сценарий первого эпизода.',
    after: 'Приём, ради которого стоит смотреть на этот текст: эпизод начинается с вопроса, а не с представления. Ведущий называет себя только на третьей минуте — сначала нужно, чтобы слушатель захотел узнать ответ.',
    body: `[COLD OPEN — no music yet]

There are two hundred and six apartments in this building. I have lived in one of them for nineteen years. Until last Thursday I could not have told you the name of a single person in the other two hundred and five.

[BEAT]

I can now. I can tell you all of them.

[THEME — 8 SEC — UNDER]

Hi. I'm your host, and this is Second Floor, Rear — a podcast about one building, one night, and one door that should have been locked.

Now, before we go any further, I have to say the thing my producer wrote on a card and held up in front of my face: we are not the police. Nothing you hear on this show is a legal finding. Everyone we discuss is presumed innocent, including the people I personally find extremely suspicious.

[THEME OUT]

So. Thursday. It rained all day, which matters, and I will explain why it matters in about six minutes.

At 11:40 p.m. the fire alarm in the north stairwell went off. It went off for ninety seconds and then it stopped, which — and I checked this — is not something that alarm has ever done before or since.

Nobody came out of their apartment. Not one person. In a building of two hundred and six apartments, at eleven forty at night, an alarm went off and nobody moved.

That is where this story starts. Not with the body. With the silence.

[MID-ROLL — 60 SEC — READ LIVE]

We'll be right back.`,
    translation: `[ХОЛОДНОЕ ОТКРЫТИЕ — музыки пока нет]

В этом доме двести шесть квартир. В одной из них я живу девятнадцать лет. До прошлого четверга я не смог бы назвать вам имени ни одного человека из остальных двухсот пяти.

[ПАУЗА]

Теперь смогу. Могу назвать всех.

[ЗАСТАВКА — 8 СЕК — ФОНОМ]

Здравствуйте. Я ваш ведущий, и это «Второй этаж, окна во двор» — подкаст про один дом, одну ночь и одну дверь, которая должна была быть заперта.

Так, прежде чем мы двинемся дальше, я обязан сказать то, что мой продюсер написал на карточке и держит у меня перед лицом: мы не полиция. Ничто из услышанного здесь не является юридическим выводом. Все, о ком мы говорим, считаются невиновными — включая тех, кто лично мне кажется крайне подозрительным.

[ЗАСТАВКА УХОДИТ]

Итак. Четверг. Весь день шёл дождь, и это важно; почему важно — объясню минут через шесть.

В 23:40 в северной лестничной клетке сработала пожарная сигнализация. Она звенела девяносто секунд и умолкла — а такого, я проверял, эта сигнализация не делала ни до, ни после.

Из квартир не вышел никто. Ни один человек. В доме на двести шесть квартир, без двадцати двенадцать ночи, сработала сигнализация — и никто не шелохнулся.

Вот отсюда всё и начинается. Не с тела. С тишины.

[РЕКЛАМА В СЕРЕДИНЕ — 60 СЕК — ЧИТАЮ ЖИВЬЁМ]

Мы скоро вернёмся.`,
    glossary: [
      { term: 'cold open', ru: 'начало до заставки' },
      { term: 'beat', ru: 'короткая пауза (пометка в сценарии)' },
      { term: 'under', ru: 'фоном, под текстом (о музыке)' },
      { term: 'I’m your host', ru: 'я ваш ведущий' },
      { term: 'presumed innocent', ru: 'считается невиновным' },
      { term: 'to go off (of an alarm)', ru: 'сработать' },
      { term: 'stairwell', ru: 'лестничная клетка' },
      { term: 'mid-roll', ru: 'рекламная вставка в середине' },
      { term: 'we’ll be right back', ru: 'мы скоро вернёмся' },
    ],
    questions: [
      {
        q: 'Why does the host mention the producer\'s card?',
        options: [
          'To show he forgot his script',
          'To make the legal disclaimer without breaking the informal tone',
          'To thank the producer',
          'To fill time',
        ],
        correct: 1,
      },
      {
        q: 'What does the host say the story starts with?',
        options: ['The rain', 'The body', 'The silence after the alarm', 'The locked door'],
        correct: 2,
      },
      {
        q: '"The fire alarm went off" means…',
        options: [
          'It stopped working',
          'It started ringing',
          'It was switched off',
          'It was removed',
        ],
        correct: 1,
        why: 'To go off про сигнализацию, будильник и бомбу значит «сработать», а не «выключиться». Одна из самых частых ловушек.',
      },
      {
        q: 'Why are the paragraphs so short?',
        options: [
          'The text is unfinished',
          'It is written to be spoken — each paragraph is roughly one breath',
          'It is a poem',
          'To save space',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-omitb-2',
    workId: 'only-murders',
    lang: 'en', title: 'Расшифровка разговора с соседкой', level: 'B1', minutes: 3,
    topic: 'Знакомство', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Расшифровка — это живая речь на бумаге, со всеми запинками, обрывами и «ну». Учебники такого не печатают, а слышите вы в жизни именно это. Ниже наша расшифровка разговора с соседкой. Обратите внимание на служебные пометки — [inaudible], [overlapping], [pause], — они стандартные и встречаются в любых стенограммах.',
    after: 'Самое ценное здесь в конце: свидетельница дважды поправляет саму себя — «я слышала… то есть я подумала, что слышала». По-английски это делается вставками I mean, well, actually, и именно по ним слышно, где человек перестал быть уверен.',
    body: `TRANSCRIPT — apartment 4B — Tuesday — recorded with permission
[Speakers: H = host, R = resident]

H: So if you could just — in your own words — what you remember about Thursday night.
R: Thursday. Okay. Um. I was watching my programme, the one with the — [inaudible] — anyway it finishes at eleven.
H: And after that?
R: After that I put the kettle on, which I shouldn't at that hour, but I do.
H: [laughs] Same.
R: And that's when the alarm went. And I thought, well —
H: Sorry, what time roughly?
R: Twenty to. Twenty to twelve. I know because the kettle hadn't — [pause] — it hadn't gone yet, and it takes about four minutes.
H: That's actually very helpful.
R: Is it?
H: More than you'd think. So the alarm goes. What do you do?
R: Nothing. [pause] I know. I know how that sounds.
H: I'm not judging. Nobody came out. Two hundred and six apartments.
R: Well, that's just it, isn't it. If nobody's running, you assume it's nothing.
H: Did you hear anything else? Before, after —
R: I heard — [overlapping] —
H: — sorry, go on.
R: I heard someone on the stairs. Going up, not down. And I mean, I thought I heard. I wouldn't want to say it in a court or anything.
H: You're not in a court.
R: No. But you're recording.
H: I am. And I'll play you anything before it goes out.
R: [pause] Then yes. Going up. Definitely up.`,
    translation: `РАСШИФРОВКА — квартира 4B — вторник — запись с согласия
[Говорят: В = ведущий, Ж = жительница]

В: Итак, если можно — своими словами — что вы помните о вечере четверга.
Ж: Четверг. Так. Э-э. Я смотрела свою передачу, ту, где — [неразборчиво] — в общем, она заканчивается в одиннадцать.
В: А потом?
Ж: А потом я поставила чайник, чего в такой час делать не надо, но я делаю.
В: [смеётся] Я тоже.
Ж: И тут сработала сигнализация. И я подумала, ну —
В: Простите, примерно во сколько?
Ж: Без двадцати. Без двадцати двенадцать. Я знаю, потому что чайник ещё не — [пауза] — ещё не вскипел, а ему нужно минуты четыре.
В: Это, вообще-то, очень полезно.
Ж: Правда?
В: Больше, чем кажется. Итак, сигнализация сработала. Что вы делаете?
Ж: Ничего. [пауза] Да, я понимаю. Понимаю, как это звучит.
В: Я не сужу. Не вышел никто. Двести шесть квартир.
Ж: Так в том-то и дело. Если никто не бежит, значит, решаешь, что ничего не случилось.
В: Вы слышали что-нибудь ещё? До, после —
Ж: Я слышала — [говорят одновременно] —
В: — простите, продолжайте.
Ж: Я слышала кого-то на лестнице. Шли наверх, а не вниз. И, ну, мне показалось, что слышала. В суде я бы такого говорить не стала.
В: Вы не в суде.
Ж: Нет. Но вы записываете.
В: Записываю. И дам вам послушать всё, прежде чем это выйдет.
Ж: [пауза] Тогда да. Наверх. Точно наверх.`,
    glossary: [
      { term: 'in your own words', ru: 'своими словами' },
      { term: '[inaudible]', ru: 'неразборчиво (пометка в стенограмме)' },
      { term: '[overlapping]', ru: 'говорят одновременно' },
      { term: 'to put the kettle on', ru: 'поставить чайник' },
      { term: 'twenty to (twelve)', ru: 'без двадцати (двенадцать)' },
      { term: 'that’s just it', ru: 'вот именно, в том-то и дело' },
      { term: 'I mean', ru: 'то есть; вставка, которой поправляют сказанное' },
      { term: 'before it goes out', ru: 'прежде чем это выйдет в эфир' },
    ],
    questions: [
      {
        q: 'How does the resident fix the time?',
        options: [
          'By the clock on the wall',
          'By the kettle, which takes about four minutes and had not boiled yet',
          'By her programme',
          'She does not fix it',
        ],
        correct: 1,
      },
      {
        q: 'Why does she say "I heard — I mean, I thought I heard"?',
        options: [
          'She is correcting herself and lowering her certainty',
          'She did not hear the question',
          'She is joking',
          'She is repeating for emphasis',
        ],
        correct: 0,
      },
      {
        q: 'What does "twenty to twelve" mean?',
        options: ['12:20', '11:40', '11:20', '12:40'],
        correct: 1,
      },
      {
        q: 'What makes her willing to confirm it in the end?',
        options: [
          'The host promises to let her hear the recording before it is published',
          'The host insists',
          'She remembers a detail',
          'She is shown a photograph',
        ],
        correct: 0,
      },
    ],
  },

  // ── Наша планета: карточка, наш текст ──────────────────────────────────────
  //
  // bucket: 'inspired'. Закадровый текст здесь наш; вид, место и цифры
  // вымышлены намеренно, чтобы никто не заучил их как факт. От документалки —
  // только жанр: настоящее время вместо прошедшего, цифра вместо эпитета.
  {
    id: 'sc-planet-1',
    workId: 'our-planet',
    lang: 'en', title: 'Закадровый текст: миграция', level: 'B2', minutes: 3,
    topic: 'Погода и природа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Закадровый текст документалки — самый доступный английский на слух: медленно, внятно, с паузами. Но написан он по жёстким правилам, и их видно только на бумаге: настоящее время вместо прошедшего, цифра вместо прилагательного и один короткий вопрос там, где нужно удержать внимание. Ниже наш текст в этом жанре (вид и цифры вымышлены).',
    after: 'Сравните первое и последнее предложения. Документалка почти всегда заканчивает тем же образом, с которого начала, — так тридцатисекундная сцена превращается в законченную историю.',
    body: `At the end of the dry season, the river is a road.

For eight months it has been shrinking. Now it is forty metres across where it was four hundred, and everything that needs to drink comes here, at the same hours, whether or not it wants company.

The herd arrives at dusk. There are perhaps three hundred of them, and about a fifth are calves born this year. They have walked ninety kilometres in five days. They will not all cross.

The crossing is sixty metres. In still water it takes ninety seconds.

The water is not still.

[PAUSE]

The adults go first and form a line facing upstream, breaking the current. Behind that line, the calves swim in the calm water their mothers are making. It is not instinct alone: this herd has crossed here before, and the animals who remember are the ones at the front.

By morning the herd is on the far bank, and it is smaller than it was. But the rains will come within the week, and the river will close behind them.

Next year, at the end of the dry season, it will be a road again.`,
    translation: `В конце сухого сезона река становится дорогой.

Восемь месяцев она отступала. Теперь там, где было четыреста метров, — сорок, и всё, что нуждается в воде, приходит сюда в одни и те же часы, хочет оно компании или нет.

Стадо приходит в сумерках. Их около трёхсот, и примерно пятая часть — телята этого года. За пять дней они прошли девяносто километров. Переправятся не все.

Ширина переправы — шестьдесят метров. В стоячей воде это полторы минуты.

Вода не стоячая.

[ПАУЗА]

Взрослые идут первыми и выстраиваются в линию против течения, разбивая поток. За этой линией телята плывут по спокойной воде, которую делают для них матери. Дело не в одном инстинкте: это стадо переправлялось здесь раньше, и впереди идут те, кто помнит.

К утру стадо на том берегу, и оно меньше, чем было. Но дожди придут в течение недели, и река сомкнётся у них за спиной.

В следующем году, в конце сухого сезона, она снова станет дорогой.`,
    glossary: [
      { term: 'dry season', ru: 'сухой сезон' },
      { term: 'to shrink', ru: 'уменьшаться, отступать' },
      { term: 'herd', ru: 'стадо' },
      { term: 'calf (calves)', ru: 'телёнок (телята)' },
      { term: 'dusk', ru: 'сумерки' },
      { term: 'upstream', ru: 'против течения' },
      { term: 'current', ru: 'течение' },
      { term: 'still water', ru: 'стоячая вода' },
      { term: 'the far bank', ru: 'противоположный берег' },
    ],
    questions: [
      {
        q: 'Why is the river called "a road"?',
        options: [
          'There is a bridge',
          'It has shrunk so much that everything crosses and travels along it',
          'Cars drive on it',
          'It is dry',
        ],
        correct: 1,
      },
      {
        q: 'What is the effect of the two short lines about the crossing?',
        options: [
          'They give a figure, then take it back — the ninety seconds do not apply',
          'They describe the weather',
          'They introduce a new animal',
          'They are a mistake',
        ],
        correct: 0,
        why: '«In still water it takes ninety seconds. The water is not still.» Приём документалок: сначала спокойная цифра, потом одна фраза, которая её отменяет.',
      },
      {
        q: 'Why do the adults face upstream?',
        options: [
          'To see better',
          'To break the current so the calves swim in calmer water',
          'To rest',
          'To drink',
        ],
        correct: 1,
      },
      {
        q: 'Why is the narration in the present tense?',
        options: [
          'It is happening as we speak',
          'It is the convention of documentary narration — it makes filmed events feel live',
          'The past tense is not used in English documentaries',
          'To describe a habit',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-planet-2',
    workId: 'our-planet',
    lang: 'en', title: 'Титры в конце серии', level: 'B2', minutes: 2,
    topic: 'Погода и природа', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Последняя минута серии устроена иначе, чем остальные пятьдесят: тут не рассказывают, а просят. Ниже наш финальный текст (цифры вымышлены). Английский призыва узнаётся по конструкциям: «what is needed is», «it is not too late», «this is not a story about» — и по тому, что просьба всегда конкретна.',
    after: 'Обратите внимание, чего в тексте нет: ни одного «мы должны» и ни одного «вы обязаны». Английский призыв почти никогда не строится на долженствовании — он строится на выборе, который у слушателя ещё есть.',
    body: `Everything you have watched in the last fifty minutes takes place inside an area of about nine hundred square kilometres.

Sixty years ago that area was four times larger. In the same period, the number of animals in the herd you followed has fallen by roughly two thirds.

These are not natural fluctuations. They are the result of decisions, most of them taken far from here, and most of them taken for good reasons at the time.

But decisions can be taken again.

What is needed is not complicated, and it is not expensive by the standards of the budgets involved: a corridor of protected land between the river and the hills, wide enough for the herd to move without crossing a road.

Where such corridors have been made, the animals have used them within a single season. Not eventually. Within a season.

This is not a story about an ending. It is a story about a decision that has not yet been made.

It is not too late to make it.`,
    translation: `Всё, что вы смотрели последние пятьдесят минут, происходит на площади примерно в девятьсот квадратных километров.

Шестьдесят лет назад эта площадь была вчетверо больше. За то же время численность стада, за которым вы следили, сократилась примерно на две трети.

Это не естественные колебания. Это результат решений — по большей части принятых далеко отсюда и по большей части принятых тогда по разумным причинам.

Но решения можно принять заново.

Требуется немногое, и по меркам тех бюджетов, о которых идёт речь, это недорого: коридор охраняемой земли между рекой и холмами, достаточно широкий, чтобы стадо могло идти, не пересекая дорогу.

Там, где такие коридоры создавали, животные начинали ими пользоваться в течение одного сезона. Не когда-нибудь. В течение сезона.

Это рассказ не о конце. Это рассказ о решении, которое пока не принято.

Принять его ещё не поздно.`,
    glossary: [
      { term: 'to take place', ru: 'происходить' },
      { term: 'fluctuation', ru: 'колебание' },
      { term: 'by the standards of', ru: 'по меркам' },
      { term: 'corridor', ru: 'коридор — полоса земли для прохода животных' },
      { term: 'within a single season', ru: 'в течение одного сезона' },
      { term: 'not eventually', ru: 'не когда-нибудь потом' },
      { term: 'it is not too late', ru: 'ещё не поздно' },
    ],
    questions: [
      {
        q: 'What is the concrete thing the film asks for?',
        options: [
          'Money for the film-makers',
          'A protected corridor of land between the river and the hills',
          'A ban on tourism',
          'Nothing specific',
        ],
        correct: 1,
      },
      {
        q: 'Why does the text say "Not eventually. Within a season."?',
        options: [
          'To correct an error',
          'To answer the unspoken objection that such measures take decades',
          'To describe the weather',
          'To fill the credits',
        ],
        correct: 1,
      },
      {
        q: 'How does the text describe the decisions that caused the loss?',
        options: [
          'As crimes',
          'As decisions taken far away, mostly for reasons that seemed good then',
          'As accidents',
          'As natural change',
        ],
        correct: 1,
        why: 'Ход намеренный: если виноватых не назначать, слушателю не нужно защищаться — и просьбу в конце он слышит.',
      },
      {
        q: 'Which construction is used to make the appeal?',
        options: [
          '"We must" and "you have to"',
          '"What is needed is…" and "it is not too late" — need and choice, not obligation',
          'Questions only',
          'Commands',
        ],
        correct: 1,
      },
    ],
  },

  // ── Ле Фаню, «Кармилла»: подлинник ─────────────────────────────────────────
  {
    id: 'sc-carmilla-1',
    workId: 'lefanu-carmilla',
    lang: 'en', title: 'Двенадцать лет назад я видела твоё лицо', level: 'B2', minutes: 3,
    topic: 'Знакомство', skill: 'Чтение',
    order: 1, where: 'Глава 3, «Мы сравниваем впечатления»', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'J. Sheridan Le Fanu, Carmilla · Project Gutenberg',
    setup: 'Лаура живёт с отцом в замке в Штирии и за всю жизнь не видела ровесниц. Ночью у ворот переворачивается карета; раненую девушку оставляют у них на три месяца. Лаура идёт поздороваться — и узнаёт лицо, которое видела в детстве во сне и боялась двенадцать лет.',
    after: 'О себе гостья скажет ровно три вещи: имя, что род её древний и знатный и что дом её где-то на западе. Больше за все три месяца Лаура не узнает ничего.',
    body: `I saw the very face which had visited me in my childhood at night, which remained so fixed in my memory, and on which I had for so many years so often ruminated with horror, when no one suspected of what I was thinking.

It was pretty, even beautiful; and when I first beheld it, wore the same melancholy expression.

But this almost instantly lighted into a strange fixed smile of recognition.

There was a silence of fully a minute, and then at length she spoke; I could not.

“How wonderful!” she exclaimed. “Twelve years ago, I saw your face in a dream, and it has haunted me ever since.”

“Wonderful indeed!” I repeated, overcoming with an effort the horror that had for a time suspended my utterances. “Twelve years ago, in vision or reality, I certainly saw you. I could not forget your face. It has remained before my eyes ever since.”

Her smile had softened. Whatever I had fancied strange in it, was gone, and it and her dimpling cheeks were now delightfully pretty and intelligent.

I felt reassured, and continued more in the vein which hospitality indicated, to bid her welcome, and to tell her how much pleasure her accidental arrival had given us all, and especially what a happiness it was to me.`,
    translation: `Я увидела то самое лицо, которое приходило ко мне в детстве по ночам, — лицо, так прочно засевшее у меня в памяти, о котором я столько лет так часто размышляла с ужасом, и никто не подозревал, о чём я думаю.

Оно было милое, даже прекрасное; и когда я впервые его увидела, на нём было то же печальное выражение.

Но почти в тот же миг оно осветилось странной застывшей улыбкой узнавания.

Молчание длилось целую минуту, и наконец заговорила она; я не могла.

«Как удивительно! — воскликнула она. — Двенадцать лет назад я видела ваше лицо во сне, и оно преследует меня с тех пор».

«В самом деле удивительно! — повторила я, с усилием одолев ужас, на время отнявший у меня речь. — Двенадцать лет назад, во сне или наяву, я определённо видела вас. Я не могла забыть ваше лицо. Оно так и стоит у меня перед глазами».

Улыбка её смягчилась. Всё, что мне почудилось в ней странным, исчезло, и теперь и улыбка, и ямочки на щеках были прелестны и умны.

Я успокоилась и продолжала уже более в том духе, какого требовало гостеприимство: поздравила её с приездом и сказала, как обрадовал всех нас её нечаянный приезд и каким счастьем он стал для меня.`,
    glossary: [
      { term: 'to ruminate on', ru: 'долго размышлять о чём-то' },
      { term: 'to behold (beheld)', ru: 'узреть, увидеть; книжное' },
      { term: 'melancholy', ru: 'печальный' },
      { term: 'recognition', ru: 'узнавание' },
      { term: 'at length', ru: 'наконец, спустя время' },
      { term: 'to haunt', ru: 'преследовать, не давать покоя' },
      { term: 'to fancy', ru: 'вообразить; показаться' },
      { term: 'dimpling cheeks', ru: 'щёки с ямочками' },
      { term: 'to bid welcome', ru: 'приветствовать, принять гостя' },
    ],
    questions: [
      {
        q: 'Why does the narrator recoil when she sees the guest?',
        options: [
          'The guest is badly injured',
          'It is the face from a dream that frightened her as a child',
          'The guest is a relative she disliked',
          'The room is too dark to see',
        ],
        correct: 1,
      },
      {
        q: '"There was a silence of fully a minute, and then at length she spoke; I could not." What does the last part mean?',
        options: [
          'The narrator was not allowed to speak',
          'The narrator was unable to speak',
          'The narrator refused to speak',
          'The narrator spoke very quietly',
        ],
        correct: 1,
        why: 'Эллипсис: I could not [speak]. Английский спокойно бросает глагол, если он только что прозвучал, — по-русски так почти не говорят.',
      },
      {
        q: 'What is strange about the two accounts of the dream?',
        options: [
          'They contradict each other',
          'Each girl saw the other’s face twelve years ago',
          'Only the guest remembers it',
          'Neither of them is sure it happened',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-carmilla-2',
    workId: 'lefanu-carmilla',
    lang: 'en', title: 'Уклониться, не отказав', level: 'C1', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 2, where: 'Глава 4, «Её повадки — прогулка»', size: 'short', spoiler: 2,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'J. Sheridan Le Fanu, Carmilla · Project Gutenberg',
    setup: 'Гостья живёт в замке уже несколько недель. Лаура исподволь пытается выяснить о ней хоть что-нибудь — и каждый раз получает вместо ответа нежность. Отрывок целиком про то, как уходят от вопроса, не отказывая.',
    after: 'Через несколько глав в округе начнут умирать деревенские девушки, а Лаура — видеть по ночам зверя у своей постели и просыпаться разбитой.',
    body: `You are not to suppose that I worried her incessantly on these subjects. I watched opportunity, and rather insinuated than urged my inquiries. Once or twice, indeed, I did attack her more directly. But no matter what my tactics, utter failure was invariably the result. Reproaches and caresses were all lost upon her. But I must add this, that her evasion was conducted with so pretty a melancholy and deprecation, with so many, and even passionate declarations of her liking for me, and trust in my honor, and with so many promises that I should at last know all, that I could not find it in my heart long to be offended with her.

She used to place her pretty arms about my neck, draw me to her, and laying her cheek to mine, murmur with her lips near my ear, “Dearest, your little heart is wounded; think me not cruel because I obey the irresistible law of my strength and weakness; if your dear heart is wounded, my wild heart bleeds with yours. In the rapture of my enormous humiliation I live in your warm life, and you shall die—die, sweetly die—into mine. I cannot help it; as I draw near to you, you, in your turn, will draw near to others, and learn the rapture of that cruelty, which yet is love; so, for a while, seek to know no more of me and mine, but trust me with all your loving spirit.”

Her agitations and her language were unintelligible to me.

From these foolish embraces, which were not of very frequent occurrence, I must allow, I used to wish to extricate myself; but my energies seemed to fail me. Her murmured words sounded like a lullaby in my ear, and soothed my resistance into a trance, from which I only seemed to recover myself when she withdrew her arms.`,
    translation: `Не подумайте, будто я донимала её этими предметами беспрестанно. Я выжидала случая и скорее заводила расспросы исподволь, чем настаивала. Раза два, правда, я и впрямь спросила прямее. Но какова бы ни была моя тактика, неизменным итогом было полное поражение. Ни упрёки, ни ласки на неё не действовали. Но надо прибавить, что уклонялась она с такой милой печалью и виноватостью, с такими частыми и даже страстными признаниями в приязни ко мне и в доверии к моей чести, с таким множеством обещаний, что рано или поздно я узнаю всё, — что мне не хватало сердца долго на неё сердиться.

Она обвивала мою шею своими красивыми руками, притягивала меня к себе и, прижавшись щекой к щеке, шептала мне у самого уха: «Милая, твоё сердечко ранено; не считай меня жестокой за то, что я подчиняюсь неодолимому закону моей силы и моей слабости; если твоё дорогое сердце ранено, моё дикое сердце кровоточит вместе с ним. В упоении моего безмерного унижения я живу твоей тёплой жизнью, а ты умрёшь — умрёшь сладко — в мою. Я ничего не могу поделать; по мере того как я приближаюсь к тебе, ты, в свой черёд, будешь приближаться к другим и узнаешь упоение той жестокости, которая всё же есть любовь; а пока не ищи знать больше обо мне и моих, но доверься мне всей своей любящей душой».

Её волнение и её слова были мне непонятны.

Из этих нелепых объятий — впрочем, надо признать, не таких уж частых — я всякий раз хотела высвободиться, но силы будто оставляли меня. Её шёпот звучал у меня в ушах колыбельной и убаюкивал моё сопротивление в оцепенение, из которого я приходила в себя, кажется, только когда она разжимала руки.`,
    glossary: [
      { term: 'incessantly', ru: 'беспрестанно' },
      { term: 'to insinuate an inquiry', ru: 'спросить исподволь, вкрадчиво' },
      { term: 'to urge', ru: 'настаивать' },
      { term: 'invariably', ru: 'неизменно' },
      { term: 'reproach', ru: 'упрёк' },
      { term: 'evasion', ru: 'уклонение от ответа' },
      { term: 'deprecation', ru: 'виноватость, просьба не сердиться' },
      { term: 'to extricate oneself', ru: 'высвободиться' },
      { term: 'to soothe into a trance', ru: 'убаюкать до оцепенения' },
    ],
    questions: [
      {
        q: 'How does the guest respond to direct questions about her family?',
        options: [
          'She answers them briefly',
          'She avoids them with affection and promises to tell everything later',
          'She becomes angry',
          'She leaves the room',
        ],
        correct: 1,
      },
      {
        q: '"Reproaches and caresses were all lost upon her." What does "lost upon" mean here?',
        options: [
          'They had no effect on her',
          'She did not hear them',
          'She lost them',
          'They made her cry',
        ],
        correct: 0,
        why: 'to be lost upon somebody — «пропасть даром», не произвести никакого действия. Оборот живой и сегодня: the joke was lost on him.',
      },
      {
        q: 'Why does the narrator stop being angry?',
        options: [
          'She gets the answers eventually',
          'The manner of the refusal disarms her',
          'Her father forbids the questions',
          'She stops caring',
        ],
        correct: 1,
      },
    ],
  },

  // ── Уитмен, «Аир»: подлинник ───────────────────────────────────────────────
  {
    id: 'sc-whitman-1',
    workId: 'whitman-calamus',
    lang: 'en', title: 'Двое', level: 'B2', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Calamus, два стихотворения', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Walt Whitman, Leaves of Grass (Calamus) · Project Gutenberg',
    setup: 'Два коротких стихотворения из раздела «Аир». Первое — о прохожем, которого больше никогда не увидишь; второе — о двоих, которым не нужен никакой закон, кроме них самих. Верлибр без рифмы и почти без инверсий: читается как проза, набранная столбиком, — с такой поэзии и разумно начинать на чужом языке.',
    body: `To a Stranger

Passing stranger! you do not know how longingly I look upon you,
You must be he I was seeking, or she I was seeking, (it comes to me as of a dream,)
I have somewhere surely lived a life of joy with you,
All is recall’d as we flit by each other, fluid, affectionate, chaste, matured,
You grew up with me, were a boy with me or a girl with me,
I am not to speak to you, I am to think of you when I sit alone or wake at night alone,
I am to wait, I do not doubt I am to meet you again,
I am to see to it that I do not lose you.


We Two Boys Together Clinging

We two boys together clinging,
One the other never leaving,
Up and down the roads going, North and South excursions making,
Power enjoying, elbows stretching, fingers clutching,
Arm’d and fearless, eating, drinking, sleeping, loving.
No law less than ourselves owning, sailing, soldiering, thieving, threatening,
Misers, menials, priests alarming, air breathing, water drinking, on the turf or the sea-beach dancing,
Cities wrenching, ease scorning, statutes mocking, feebleness chasing,
Fulfilling our foray.`,
    translation: `Незнакомцу

Прохожий незнакомец! ты не знаешь, с какой тоской я смотрю на тебя,
Ты, должно быть, тот, кого я искал, или та, кого я искал (это приходит ко мне как из сна),
Я наверняка прожил где-то счастливую жизнь с тобой,
Всё вспоминается, пока мы мелькаем мимо друг друга — текучие, нежные, целомудренные, зрелые,
Ты рос вместе со мной, был со мной мальчиком или был со мной девочкой,
Мне не заговорить с тобой, мне только думать о тебе, когда я сижу один или просыпаюсь ночью один,
Мне ждать, и я не сомневаюсь, что встречу тебя снова,
Мне позаботиться о том, чтобы тебя не потерять.


Мы двое, мальчишки, вцепившиеся друг в друга

Мы двое, мальчишки, вцепившиеся друг в друга,
Один другого не покидающий,
По дорогам туда и сюда идущие, на север и на юг вылазки делающие,
Силой наслаждающиеся, локти расправляющие, пальцы сжимающие,
Вооружённые и бесстрашные — едящие, пьющие, спящие, любящие.
Никакого закона, кроме самих себя, не признающие; плывущие, воюющие, ворующие, угрожающие,
Скупцов, лакеев, священников пугающие, воздухом дышащие, воду пьющие, на траве или на морском берегу танцующие,
Города выворачивающие, покой презирающие, уставы высмеивающие, слабость гонящие,
Свой набег доводящие до конца.`,
    glossary: [
      { term: 'longingly', ru: 'с тоской, с томлением' },
      { term: 'to flit by', ru: 'промелькнуть мимо' },
      { term: 'chaste', ru: 'целомудренный' },
      { term: 'I am to wait', ru: 'мне (суждено) ждать; be to о предначертанном' },
      { term: 'to see to it that…', ru: 'позаботиться о том, чтобы…' },
      { term: 'to cling', ru: 'цепляться, льнуть' },
      { term: 'menial', ru: 'слуга, прислужник' },
      { term: 'to scorn', ru: 'презирать' },
      { term: 'foray', ru: 'набег, вылазка' },
    ],
    questions: [
      {
        q: 'In "To a Stranger", what does the speaker decide to do?',
        options: [
          'To follow the stranger home',
          'Not to speak, but to wait and to keep the stranger in mind',
          'To write the stranger a letter',
          'To forget the stranger at once',
        ],
        correct: 1,
      },
      {
        q: 'Why does Whitman write "he I was seeking, or she I was seeking"?',
        options: [
          'He does not remember the person',
          'The feeling is the same whichever it is — the poem refuses to choose',
          'He is describing two different people',
          'It is a printing error',
        ],
        correct: 1,
      },
      {
        q: 'The second poem is built almost entirely of -ing forms (clinging, going, enjoying…). What is the effect?',
        options: [
          'It sounds like a list of rules',
          'Nothing ever finishes — the action simply goes on',
          'It puts everything in the past',
          'It turns the poem into a question',
        ],
        correct: 1,
        why: 'Причастия без личного глагола: время не задано вовсе, поэтому движение не кончается. Приём, ради которого Уитмена и стоит читать в оригинале.',
      },
    ],
  },

  // ── Simon vs. the Homo Sapiens Agenda: карточка, наш текст ─────────────────
  {
    id: 'sc-simon-1',
    workId: 'albertalli-simon',
    lang: 'en', title: 'Письмо тому, кого не видел', level: 'B1', minutes: 3,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Половина романа Бекки Альберталли — переписка двух старшеклассников, которые не знают, кто с той стороны. Ниже наш текст в том же жанре: два письма подряд. Это самый полезный письменный регистр английского — между смс и деловым письмом: полные предложения, но свободный ход мысли, скобки и оговорки.',
    body: `from: bluepages
subject: re: the cafeteria thing

Okay, first of all: you were not being dramatic. I would have done exactly the same thing and then thought about it for a week, which is basically what I am doing right now.

Second of all — and I have been trying to write this sentence for about twenty minutes — I keep wondering whether I would recognise you if you walked past me. I think I would. I have decided that people write the way they stand.

Anyway. Chemistry was awful. Mr. K spent forty minutes on a slide he had already shown us on Tuesday, and I spent forty minutes not listening.

Talk soon.

—

from: jacques
subject: re: re: the cafeteria thing

“People write the way they stand.” I am going to be thinking about that all day, thanks a lot.

Here is my problem. I want to know who you are, and I also do not want to know, because right now this is the one thing in my life that nobody else has an opinion about. Once I know, it becomes a thing that happens in corridors. Does that make any sense? It barely makes sense to me.

Not saying no. Just saying not yet.

(Also: everyone hates that slide. My sister had Mr. K four years ago and she says he has been showing it since then.)`,
    translation: `от: bluepages
тема: re: та история в столовой

Так, во-первых: ты не драматизировал. Я бы поступил ровно так же, а потом думал бы об этом неделю — чем, собственно, сейчас и занимаюсь.

Во-вторых — и эту фразу я пытаюсь написать минут двадцать — я всё думаю, узнал бы я тебя, если бы ты прошёл мимо. По-моему, узнал бы. Я решил, что люди пишут так же, как стоят.

Ладно. Химия была ужасная. Мистер К. сорок минут разбирал слайд, который уже показывал во вторник, а я сорок минут не слушал.

До скорого.

—

от: jacques
тема: re: re: та история в столовой

«Люди пишут так же, как стоят». Теперь я буду думать об этом весь день, спасибо большое.

Вот в чём моя беда. Я хочу знать, кто ты, и одновременно не хочу, потому что сейчас это единственное в моей жизни, о чём больше ни у кого нет мнения. Как только я узнаю, это станет тем, что происходит в коридорах. Понятно, о чём я? Мне самому едва понятно.

Я не говорю «нет». Я говорю «пока нет».

(И ещё: этот слайд ненавидят все. У моей сестры мистер К. был четыре года назад, и она говорит, что он показывает его с тех самых пор.)`,
    glossary: [
      { term: 'to be dramatic', ru: 'драматизировать, устраивать сцену' },
      { term: 'first of all / second of all', ru: 'во-первых / во-вторых; разговорное' },
      { term: 'to keep wondering', ru: 'всё думать, не переставая' },
      { term: 'I would have done', ru: 'я бы поступил (о прошлом, которого не было)' },
      { term: 'to have an opinion about', ru: 'иметь мнение о чём-то' },
      { term: 'corridor', ru: 'коридор; в США чаще hallway' },
      { term: 'Does that make any sense?', ru: 'понятно, о чём я?' },
      { term: 'barely', ru: 'едва' },
      { term: 'Not saying no', ru: 'я не отказываю; смягчённый отказ-отсрочка' },
    ],
    questions: [
      {
        q: 'Why does the second writer not want to know who the first one is — yet?',
        options: [
          'He is afraid of being disappointed',
          'It is the one part of his life nobody else has an opinion about',
          'He does not have the time',
          'He already knows',
        ],
        correct: 1,
      },
      {
        q: '"Not saying no. Just saying not yet." What is this?',
        options: [
          'A refusal',
          'An agreement',
          'A postponement — the answer is kept open',
          'A question',
        ],
        correct: 2,
        why: 'Самая частая английская формула мягкого «пока нет»: сначала снимают то, чего собеседник боится (not saying no), потом ставят условие времени.',
      },
      {
        q: 'What register are these letters written in?',
        options: [
          'Formal business English',
          'Full sentences, but personal and unplanned — between texting and a formal letter',
          'Academic English',
          'Legal English',
        ],
        correct: 1,
      },
    ],
  },

  // ── The Song of Achilles: карточка, наш текст ──────────────────────────────
  {
    id: 'sc-achilles-1',
    workId: 'miller-song-achilles',
    lang: 'en', title: 'Мальчик, которого отдали ко двору', level: 'B2', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Мадлен Миллер пересказывает «Илиаду» голосом того, кто всю жизнь шёл следом. Ниже — наш текст в том же регистре: простые слова, короткие фразы, античная рамка. Редкий английский, где почти нет длинной лексики и всё держится на порядке слов и на артикле, — поэтому его удобно читать вслух.',
    body: `My father gave me away in the spring, and did not come to the gate to watch me go.

The palace by the sea was larger than ours and quieter. Boys slept in one long room above the stores, forty of us, sons of men who had promised the king something and had not paid. We were fed. We were not spoken to. In the mornings we were taught to run, and in the afternoons we were taught to hold a spear as if we meant it.

I was the smallest and the slowest, and I had a name nobody used.

On the ninth day the king’s son came up to the long room. He was expected to choose a companion, the way his father had once chosen one, and the men had already told him whom to take: the tall boy from the north, who could throw farther than anyone.

He walked the length of the room without hurrying. He stopped in front of me.

“That one,” he said.

The steward began to explain, politely, that I was of no use.

“I know,” he said. “That one.”

Nobody asked me anything. But that night I slept in a room with a window, and for the first time since the spring I was not cold.`,
    translation: `Отец отдал меня весной и к воротам провожать не вышел.

Дворец у моря был больше нашего и тише. Мальчики спали в одной длинной комнате над кладовыми — сорок человек, сыновья тех, кто что-то пообещал царю и не отдал. Нас кормили. С нами не разговаривали. По утрам нас учили бегать, а после полудня — держать копьё так, будто мы и правда собираемся им бить.

Я был самый мелкий и самый медленный, и у меня было имя, которым никто не пользовался.

На девятый день в длинную комнату поднялся царский сын. Ему полагалось выбрать себе товарища — как когда-то выбрал его отец, — и старшие уже сказали ему, кого брать: высокого мальчика с севера, который бросал дальше всех.

Он прошёл комнату из конца в конец не торопясь. Он остановился передо мной.

— Вот этого, — сказал он.

Управляющий принялся вежливо объяснять, что от меня никакого проку.

— Знаю, — сказал он. — Вот этого.

Меня никто ни о чём не спросил. Но в ту ночь я спал в комнате с окном и впервые с весны не мёрз.`,
    glossary: [
      { term: 'to give away', ru: 'отдать (насовсем)' },
      { term: 'the stores', ru: 'кладовые, склады' },
      { term: 'to be spoken to', ru: 'быть тем, с кем разговаривают; пассив' },
      { term: 'as if he meant it', ru: 'будто всерьёз, будто и правда собирается' },
      { term: 'companion', ru: 'спутник, товарищ' },
      { term: 'the length of the room', ru: 'из конца в конец комнаты' },
      { term: 'steward', ru: 'управляющий' },
      { term: 'of no use', ru: 'бесполезен, никакого проку' },
    ],
    questions: [
      {
        q: 'Why are the forty boys living in the palace?',
        options: [
          'They are the king’s sons',
          'Their fathers owed the king something and did not pay',
          'They are prisoners of war',
          'They came to be trained as priests',
        ],
        correct: 1,
      },
      {
        q: 'What is unusual about the choice the king’s son makes?',
        options: [
          'He chooses the boy everyone expected',
          'He chooses the least useful boy, and repeats the choice when corrected',
          'He refuses to choose',
          'He asks the boy first',
        ],
        correct: 1,
      },
      {
        q: '"We were fed. We were not spoken to." Why the passive here?',
        options: [
          'To sound polite',
          'Because who did it does not matter — things were done to them',
          'Because these verbs have no active form',
          'To make the sentences longer',
        ],
        correct: 1,
        why: 'Пассив без by — главный приём этого куска: он показывает людей, с которыми что-то делают, а они на это не влияют.',
      },
    ],
  },

  // ── Назови меня своим именем: карточка, наш текст ──────────────────────────
  {
    id: 'sc-cmbyn-1',
    workId: 'aciman-cmbyn',
    lang: 'en', title: 'Шесть недель и ни одного слова', level: 'C1', minutes: 4,
    topic: 'Время и планы', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Ачман пишет длинными ветвящимися фразами, и весь роман — про то, чего не сказали вслух. Ниже наш текст в том же регистре. Ради грамматики: это концентрат сослагательного и модальностей прошлого — would have, could have, should have, — то есть ровно тех форм, которыми по-английски говорят о несделанном.',
    body: `He was to stay six weeks. I counted them the way you count money you have not earned yet.

I could have said something on any of those evenings. I could have said it at the table, when my mother asked him about his book and he answered too quickly, the way people do when they have been thinking about something else. I could have said it on the road back from town, where the wall is low enough to sit on. I said nothing, and then it was July, and then it was the end of July.

What I told myself was that there was time. What I meant was that I was afraid.

Twice I decided I would speak in the morning. Both times the morning came and I went swimming instead, and the water was cold enough at that hour to feel like a decision.

If he had asked me a direct question — any direct question — I would have answered it. He never did. Later I understood that he had been waiting for the same thing, and that we had spent six weeks being careful with each other for no reason at all.

The last week I stopped counting.`,
    translation: `Он должен был пробыть шесть недель. Я считал их так, как считают деньги, которых ещё не заработал.

Я мог бы что-нибудь сказать в любой из тех вечеров. Мог бы сказать за столом, когда мама спросила его про книгу, а он ответил слишком быстро — как отвечают люди, думавшие в этот момент о другом. Мог бы сказать на дороге из города, там, где стена достаточно низкая, чтобы на ней сидеть. Я не сказал ничего, а потом наступил июль, а потом июль кончился.

Себе я говорил, что время есть. Имел я в виду, что боюсь.

Дважды я решал, что заговорю утром. Оба раза утро приходило, а я шёл вместо этого плавать, и вода в этот час была холодная ровно настолько, чтобы сойти за решение.

Если бы он задал мне прямой вопрос — любой прямой вопрос, — я бы ответил. Он не задал. Позже я понял, что он ждал того же самого и что мы шесть недель были осторожны друг с другом совершенно зря.

В последнюю неделю я перестал считать.`,
    glossary: [
      { term: 'he was to stay', ru: 'ему предстояло пробыть; be to о запланированном' },
      { term: 'I could have said', ru: 'я мог бы сказать (но не сказал)' },
      { term: 'What I told myself was…', ru: 'себе я говорил, что…' },
      { term: 'What I meant was…', ru: 'на самом деле я имел в виду…' },
      { term: 'instead', ru: 'вместо этого' },
      { term: 'if he had asked, I would have answered', ru: 'если бы спросил, я бы ответил; третий тип условия' },
      { term: 'to be careful with somebody', ru: 'быть осторожным с кем-то, беречься' },
      { term: 'for no reason at all', ru: 'совершенно зря, без всякой причины' },
    ],
    questions: [
      {
        q: 'Why did the narrator never speak?',
        options: [
          'There was never an opportunity',
          'He was afraid, and told himself there was still time',
          'He did not want to',
          'The other man asked him not to',
        ],
        correct: 1,
      },
      {
        q: '"I could have said it at the table." What does this form mean?',
        options: [
          'He said it at the table',
          'He was able to say it and did',
          'It was possible, but he did not do it',
          'He will say it at the table',
        ],
        correct: 2,
        why: 'could have + причастие — «мог бы, но не сделал». Именно на этой форме держится весь отрывок: она называет несделанное, не называя чувства.',
      },
      {
        q: '"If he had asked me a direct question, I would have answered it." What does this tell us?',
        options: [
          'He asked and got an answer',
          'Neither the question nor the answer ever happened',
          'The question is still open',
          'He refused to answer',
        ],
        correct: 1,
      },
    ],
  },

  // ── Они оба умрут в конце: карточка, наш текст ─────────────────────────────
  {
    id: 'sc-they-both-die-1',
    workId: 'silvera-they-both-die',
    lang: 'en', title: 'Звонок в 00:22', level: 'B1', minutes: 3,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'У Сильверы есть служба, которая звонит в полночь и сообщает, что этот день у тебя последний, — и половина книги идёт оповещениями приложения. Ниже наш текст в том же жанре: звонок и экран телефона. Практическая польза — регистр объявлений: настоящее время, безличные конструкции, вежливые формулы службы поддержки, которыми говорят и банк, и авиакомпания.',
    body: `00:22

“Good morning. This is Herald Services. Am I speaking to the account holder?”

“Yes.”

“I am sorry to have to inform you that today is your End Day. You are receiving this call between midnight and three a.m., as required. Do you understand what I have just told you?”

“Yes.”

“You do not need to do anything right now. Our records are updated automatically. If you would like us to contact someone on your behalf, I can do that while we are on the line.”

“No. Thank you.”

“Of course. I am very sorry. Please take care of yourself today.”

—

LAST FRIEND
Notifications · now

You have 22 hours and 38 minutes remaining.
4 people near you are also on their End Day.
Would you like to be visible to them?
Being visible cannot be undone.

[ Not now ]   [ Make me visible ]`,
    translation: `00:22

«Доброе утро. Служба „Геральд“. Я говорю с владельцем аккаунта?»

«Да».

«К сожалению, вынуждены сообщить, что сегодня ваш последний день. Этот звонок совершается между полуночью и тремя часами ночи, как предписано. Вы поняли то, что я сейчас сказал?»

«Да».

«Прямо сейчас от вас ничего не требуется. Наши записи обновляются автоматически. Если хотите, чтобы мы связались с кем-то от вашего имени, я могу сделать это, пока мы на линии».

«Нет. Спасибо».

«Разумеется. Мне очень жаль. Берегите себя сегодня».

—

ПОСЛЕДНИЙ ДРУГ
Уведомления · только что

У вас осталось 22 часа 38 минут.
Рядом с вами ещё 4 человека, у которых сегодня последний день.
Показать вас им?
Отменить видимость будет нельзя.

[ Не сейчас ]   [ Показать меня ]`,
    glossary: [
      { term: 'Am I speaking to…?', ru: 'я говорю с…?; телефонная формула' },
      { term: 'account holder', ru: 'владелец аккаунта, счёта' },
      { term: 'I am sorry to have to inform you', ru: 'к сожалению, вынужден сообщить; официальная формула' },
      { term: 'as required', ru: 'как предписано, согласно требованиям' },
      { term: 'you do not need to do anything', ru: 'от вас ничего не требуется' },
      { term: 'on your behalf', ru: 'от вашего имени' },
      { term: 'while we are on the line', ru: 'пока мы на линии' },
      { term: 'remaining', ru: 'оставшийся' },
      { term: 'cannot be undone', ru: 'нельзя отменить, необратимо' },
    ],
    questions: [
      {
        q: 'Why does the service call between midnight and three a.m.?',
        options: [
          'It is cheaper at night',
          'Because the rules require it',
          'The person asked them to',
          'It is a mistake',
        ],
        correct: 1,
      },
      {
        q: '"I am sorry to have to inform you…" — what kind of English is this?',
        options: [
          'Casual speech',
          'Formal, impersonal service language',
          'Legal English only',
          'Old-fashioned literary English',
        ],
        correct: 1,
        why: 'Та же формула, которой отказывают в визе, сообщают об увольнении и о задержке рейса. Стоит выучить целиком — она узнаётся мгновенно и всегда означает плохую новость.',
      },
      {
        q: 'What does "Being visible cannot be undone" warn about?',
        options: [
          'The choice is final',
          'The app may crash',
          'Others will not see you',
          'You must pay for it',
        ],
        correct: 0,
      },
    ],
  },

  // ── Аристотель и Данте: карточка, наш текст ────────────────────────────────
  {
    id: 'sc-ari-dante-1',
    workId: 'saenz-ari-dante',
    lang: 'en', title: 'Про отцов не спрашивают', level: 'A2', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'У Саэнса самые короткие фразы во всей полке: подлежащее, сказуемое, точка. Ниже наш текст в том же регистре — двое подростков в кузове пикапа. Это лучший на полке текст для уровня A2: длинных слов почти нет, а всё, что происходит, происходит в паузах между репликами.',
    body: `We lay in the back of his truck and looked at the sky. It was July. The metal was still warm from the day.

“Does your dad talk to you?” I said.

“He talks. He just doesn’t say anything.”

“Mine went to the war,” I said. “He came back. That’s all I know.”

“You never asked?”

“You don’t ask.”

Dante turned his head. “Why not?”

I thought about it. Nobody had ever asked me that before. In my house there were rules that nobody had written down and nobody had ever said out loud, and that was one of them.

“I don’t know,” I said. “You just don’t.”

“That’s a stupid rule.”

“Yeah,” I said. “It is.”

We didn’t say anything for a while. A dog was barking two streets away. Then he said, “You can ask me anything,” and he said it like it was nothing, like it was a normal thing to say to somebody.

I looked at the sky for a long time. I decided I would ask my father a question. Not that night. But I decided.`,
    translation: `Мы лежали в кузове его пикапа и смотрели в небо. Был июль. Металл ещё был тёплый с дневного солнца.

— Твой отец с тобой разговаривает? — сказал я.

— Разговаривает. Просто ничего не говорит.

— Мой был на войне, — сказал я. — Вернулся. Это всё, что я знаю.

— И ты никогда не спрашивал?

— Не спрашивают.

Данте повернул голову.

— Почему?

Я задумался. Меня никто раньше об этом не спрашивал. У нас в доме были правила, которых никто не записывал и никто вслух не произносил, и это было одно из них.

— Не знаю, — сказал я. — Просто не спрашивают.

— Дурацкое правило.

— Ага, — сказал я. — Дурацкое.

Мы какое-то время молчали. Через две улицы лаяла собака. Потом он сказал: «Меня можешь спрашивать о чём угодно», — и сказал это как ни в чём не бывало, как будто такое вообще говорят людям.

Я долго смотрел в небо. Я решил, что задам отцу вопрос. Не в тот вечер. Но решил.`,
    glossary: [
      { term: 'the back of his truck', ru: 'кузов пикапа' },
      { term: 'He just doesn’t say anything', ru: 'он просто ничего не говорит' },
      { term: 'You don’t ask', ru: 'не спрашивают; you безличное' },
      { term: 'to write down', ru: 'записать' },
      { term: 'out loud', ru: 'вслух' },
      { term: 'for a while', ru: 'какое-то время' },
      { term: 'two streets away', ru: 'через две улицы' },
      { term: 'like it was nothing', ru: 'как ни в чём не бывало, будто это пустяк' },
    ],
    questions: [
      {
        q: 'What does "He talks. He just doesn’t say anything." mean?',
        options: [
          'The father is silent',
          'The father speaks, but never about anything real',
          'The father speaks another language',
          'The father talks too much',
        ],
        correct: 1,
      },
      {
        q: 'In "You don’t ask", who is "you"?',
        options: [
          'Dante',
          'Nobody in particular — it means "one does not ask"',
          'The narrator’s father',
          'The reader',
        ],
        correct: 1,
        why: 'Безличное you — главный способ по-английски сформулировать правило, которое никто не устанавливал. По-русски это «не спрашивают», без подлежащего вовсе.',
      },
      {
        q: 'What changes for the narrator by the end?',
        options: [
          'He asks his father that night',
          'He decides that one day he will ask',
          'He decides never to ask',
          'He forgets about it',
        ],
        correct: 1,
      },
    ],
  },

  // ── Комната Джованни: карточка, наш текст ──────────────────────────────────
  {
    id: 'sc-giovanni-1',
    workId: 'baldwin-giovanni',
    lang: 'en', title: 'Последний поезд метро', level: 'C1', minutes: 4,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Болдуин пишет от первого лица длинными чистыми периодами, почти без редких слов: трудность его английского не в лексике, а в длине фразы. Ниже наш текст в том же регистре — американец в Париже, ночь, решение, которое он не принимает. Отличный материал, чтобы научиться читать длинное предложение целиком, а не по кускам.',
    body: `I had been in Paris eleven months and I had learned exactly one useful thing, which was how to be in a city where nobody knew my mother.

The bar was on a street that smelled of bread in the mornings and of nothing at all at night. I sat where I always sat. I had told myself, walking there, that I would have one drink and then go home and write to her and say that the wedding would have to wait until the spring, and that I would explain everything in the spring, and that the spring was not far.

I had been telling myself this since February.

There is a moment, somewhere between the second drink and the last train, when a man decides which of the two lives he is going to live, and the terrible thing is that he does not know he is deciding. He thinks he is only sitting. He thinks the question will be put to him later, formally, with witnesses, and that he will answer it then, when he is ready, when he is older, when the light is better.

I heard the last train go. I did not move.`,
    translation: `Я прожил в Париже одиннадцать месяцев и научился ровно одной полезной вещи — тому, как жить в городе, где никто не знает мою мать.

Бар стоял на улице, которая по утрам пахла хлебом, а ночью не пахла ничем. Я сел там, где садился всегда. По дороге я говорил себе, что выпью один бокал, потом пойду домой, напишу ей и скажу, что со свадьбой придётся подождать до весны, что весной я всё объясню и что весна уже недалеко.

Я говорил себе это с февраля.

Есть момент — где-то между вторым бокалом и последним поездом, — когда человек решает, какую из двух своих жизней он будет жить, и весь ужас в том, что он не знает, что решает. Ему кажется, что он просто сидит. Ему кажется, что вопрос поставят перед ним позже, официально, при свидетелях, и вот тогда он и ответит: когда будет готов, когда будет постарше, когда свет будет получше.

Я услышал, как ушёл последний поезд. Я не двинулся с места.`,
    glossary: [
      { term: 'I had been in Paris eleven months', ru: 'к тому моменту я прожил в Париже одиннадцать месяцев' },
      { term: 'exactly one useful thing', ru: 'ровно одной полезной вещи' },
      { term: 'to smell of something', ru: 'пахнуть чем-то' },
      { term: 'I had told myself', ru: 'я говорил себе (раньше того момента)' },
      { term: 'would have to wait', ru: 'придётся подождать' },
      { term: 'the question will be put to him', ru: 'вопрос поставят перед ним; пассив' },
      { term: 'with witnesses', ru: 'при свидетелях' },
      { term: 'when the light is better', ru: 'когда свет будет получше; тут — «когда станет яснее»' },
    ],
    questions: [
      {
        q: 'What has the narrator been promising in his letters since February?',
        options: [
          'That he will come home next week',
          'That he will explain everything in the spring',
          'That he has found work',
          'That he is getting married in the summer',
        ],
        correct: 1,
      },
      {
        q: 'According to the narrator, why is that moment "terrible"?',
        options: [
          'Because the decision is made without the man knowing he is making it',
          'Because the bar closes',
          'Because he has no money',
          'Because someone is watching him',
        ],
        correct: 0,
      },
      {
        q: '"I heard the last train go. I did not move." What has happened?',
        options: [
          'Nothing — he simply stayed out late',
          'He has answered the question by not answering it',
          'He has missed his appointment',
          'He has decided to go home',
        ],
        correct: 1,
        why: 'Весь абзац до этого объяснил правило, а две короткие фразы его применяют. Приём Болдуина: длинное рассуждение и короткое действие, которое всё решает.',
      },
    ],
  },

  // ── Морис: карточка, наш текст ─────────────────────────────────────────────
  {
    id: 'sc-maurice-1',
    workId: 'forster-maurice',
    lang: 'en', title: 'Разговор, в котором ничего не названо', level: 'C1', minutes: 4,
    topic: 'Учёба', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Эдвардианская Англия: то, о чём идёт речь, называть нельзя — за это судили. Форстер строит целые главы на разговорах, где главное слово не произносится ни разу. Ниже наш диалог в том же регистре. Для языка это ценно тем, что показывает английскую вежливую увёртку в чистом виде: I suppose, rather, one does not, don’t you think.',
    body: `“You have been reading the Greeks, I hear,” said the tutor, without looking up.

“A little. Mr. Risley lent me a translation.”

“Ah. A translation.” He turned a page. “There are passages in the original which we do not read here. You will find them omitted. It is thought better.”

“Better for whom, sir?”

The tutor looked up then, and Hall understood at once that he had asked a question which was not asked.

“You are, I think, a sensible young man,” the tutor said. “Sensible young men go down from here, and take up a profession, and marry, and are perfectly content. I have seen a great many of them do it. I have also seen one or two who did not, and I would not wish that for you.”

“I am not sure I follow, sir.”

“No,” said the tutor. “I did not suppose you would.” He returned to his page. “Do give my regards to your mother.”

Hall walked back across the court in the rain and found that he was shaking, and that he could not have said, if anyone had stopped him and asked, what exactly had been said to him.`,
    translation: `— Вы, я слышал, взялись за греков, — сказал наставник, не поднимая глаз.

— Немного. Мистер Ризли одолжил мне перевод.

— А. Перевод. — Он перевернул страницу. — В подлиннике есть места, которых мы здесь не читаем. Вы обнаружите, что они опущены. Так считают правильным.

— Правильным для кого, сэр?

Тут наставник поднял глаза, и Холл немедленно понял, что задал вопрос, которого не задают.

— Вы, полагаю, разумный молодой человек, — сказал наставник. — Разумные молодые люди уезжают отсюда, берутся за профессию, женятся и совершенно довольны. Я видел, как это делали очень многие. Я видел и одного-двух, которые не сделали, и вам я такого не пожелал бы.

— Боюсь, я не вполне вас понимаю, сэр.

— Да, — сказал наставник. — Я и не предполагал, что поймёте. — Он вернулся к странице. — Передавайте поклон вашей матушке.

Холл шёл обратно через двор под дождём и обнаружил, что его трясёт и что он не смог бы сказать, если бы его остановили и спросили, что именно ему сейчас сообщили.`,
    glossary: [
      { term: 'I hear', ru: 'я слышал, до меня дошло' },
      { term: 'to lend / lent', ru: 'одолжить (дать)' },
      { term: 'to omit', ru: 'опустить, пропустить' },
      { term: 'It is thought better', ru: 'так считают правильным; безличный пассив' },
      { term: 'sensible', ru: 'разумный, здравомыслящий' },
      { term: 'to go down (from Oxford/Cambridge)', ru: 'закончить университет и уехать' },
      { term: 'to take up a profession', ru: 'взяться за профессию' },
      { term: 'I am not sure I follow', ru: 'боюсь, я не вполне понимаю' },
      { term: 'to give one’s regards to', ru: 'передавать поклон, привет' },
    ],
    questions: [
      {
        q: 'What is the tutor actually warning the student about?',
        options: [
          'Reading bad translations',
          'Being one of the "one or two who did not" marry and settle',
          'Failing his examinations',
          'Borrowing books from Mr. Risley',
        ],
        correct: 1,
      },
      {
        q: 'Why does the tutor say "It is thought better" instead of "I think it is better"?',
        options: [
          'It is more polite',
          'The passive removes the person — the rule seems to come from nowhere and cannot be argued with',
          'He is quoting someone',
          'It is a grammatical error',
        ],
        correct: 1,
        why: 'Безличный пассив — главный инструмент этого куска: правило есть, а автора правила нет, поэтому и спорить не с кем.',
      },
      {
        q: 'Why can the student not repeat what was said to him?',
        options: [
          'He did not hear it',
          'Nothing was named directly — the whole conversation is implication',
          'It was in Greek',
          'He was told to keep it secret',
        ],
        correct: 1,
      },
    ],
  },

  // ── Лишь: карточка, наш текст ──────────────────────────────────────────────
  {
    id: 'sc-less-1',
    workId: 'greer-less',
    lang: 'en', title: 'Премию вручают не мне', level: 'B2', minutes: 3,
    topic: 'Путешествия', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Грир пишет комедию про немолодого писателя, который объехал полмира, лишь бы не отвечать на приглашение на свадьбу. Ниже наш текст в том же жанре. Польза чисто практическая: это язык поездок и неловкостей — регистрация, программа, выступление, — то есть ровно те ситуации, в которых английский нужен по-настоящему.',
    body: `The festival had booked him a room with a view of another room.

At the registration desk a young woman found his name on the third list, which was the list of people who were not on the first two lists. She gave him a badge that said AUTHOR and, underneath, in larger letters, a name that was not his.

“It is close enough,” she said kindly.

The programme said that he would speak at eleven, on a panel called The Future of the Novel, with two other writers and a moderator. At eleven he was taken to a small stage where a man was already talking. At eleven twenty the moderator turned to him and asked, in excellent English, what he had made of the previous speaker’s point.

He had not understood a word of the previous speaker’s point, which had been made in Italian.

“I think,” he said slowly, “that he is right about the difficult part, and that the rest is a matter of what one is willing to give up.”

There was a pause, and then a great deal of nodding. Afterwards two people came up and told him it was the best thing said all morning. One of them asked him to sign the badge with the wrong name on it, and he did.`,
    translation: `Фестиваль забронировал ему номер с видом на другой номер.

За стойкой регистрации девушка нашла его имя в третьем списке — списке тех, кого не оказалось в первых двух. Она выдала ему бейдж, на котором значилось АВТОР, а ниже, буквами покрупнее, — имя, которое было не его.

— Достаточно похоже, — сказала она доброжелательно.

В программе стояло, что он выступает в одиннадцать, на секции «Будущее романа», с двумя другими писателями и модератором. В одиннадцать его отвели на маленькую сцену, где один человек уже говорил. В одиннадцать двадцать модератор повернулся к нему и спросил на превосходном английском, что он думает о тезисе предыдущего выступавшего.

Из тезиса предыдущего выступавшего он не понял ни слова, потому что тезис был изложен по-итальянски.

— Я думаю, — сказал он медленно, — что в трудной части он прав, а всё остальное зависит от того, чем человек готов поступиться.

Возникла пауза, а затем — очень много кивания. После к нему подошли двое и сказали, что это было лучшее, что прозвучало за всё утро. Один попросил подписать тот самый бейдж с чужим именем, и он подписал.`,
    glossary: [
      { term: 'to book a room', ru: 'забронировать номер' },
      { term: 'registration desk', ru: 'стойка регистрации' },
      { term: 'badge', ru: 'бейдж' },
      { term: 'close enough', ru: 'достаточно похоже; сойдёт' },
      { term: 'panel', ru: 'секция, круглый стол' },
      { term: 'moderator', ru: 'ведущий дискуссии' },
      { term: 'to make of something', ru: 'что думать о чём-то: what do you make of it?' },
      { term: 'to be willing to give up', ru: 'быть готовым поступиться, отказаться от' },
      { term: 'afterwards', ru: 'после, потом' },
    ],
    questions: [
      {
        q: 'What is wrong with his badge?',
        options: [
          'It has the wrong name on it',
          'It is the wrong colour',
          'It has no name at all',
          'It says he is a moderator',
        ],
        correct: 0,
      },
      {
        q: 'Why can he not answer the moderator’s question properly?',
        options: [
          'He was not listening',
          'The previous speaker spoke Italian, which he does not understand',
          'The microphone was off',
          'He disagrees with everyone',
        ],
        correct: 1,
      },
      {
        q: 'Why does his answer work so well?',
        options: [
          'It is very detailed',
          'It is general enough to fit any argument, and sounds thoughtful',
          'He quotes the previous speaker',
          'He speaks Italian',
        ],
        correct: 1,
        why: 'Приём стоит запомнить и всерьёз: «он прав в трудной части, остальное — вопрос того, чем готов поступиться» — универсальная вежливая формула, когда сказать нечего.',
      },
    ],
  },

  // ── Лунный свет: карточка, наш текст ───────────────────────────────────────
  {
    id: 'sc-moonlight-1',
    workId: 'moonlight',
    lang: 'en', title: 'Урок плавания', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему фильма', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'У Дженкинса реплик мало, и почти всё сказано паузами. Ниже наш текст, записанный так, как пишут сценарий: INT./EXT., ремарка, реплика. Жанр стоит освоить отдельно — сценарий читается иначе, чем проза: время всегда настоящее, подлежащее часто выброшено, а ремарка описывает только то, что видно и слышно.',
    body: `EXT. BEACH — MORNING

Grey water. No wind. A MAN, forties, stands waist-deep, holding a BOY, ten, under the shoulders. The boy is stiff.

MAN
Let your head go back. All the way.

BOY
I’ll go under.

MAN
You will not. I’ve got you.

The boy lets his head go back. His feet leave the sand. The man keeps one hand under his back.

MAN (CONT’D)
There. You’re doing it.

BOY
You’re holding me.

MAN
I’m touching you. That’s not the same thing.

He takes the hand away. Two seconds. Three. The boy floats.

BOY
(quietly)
Don’t go anywhere.

MAN
I’m right here.

They stay like that. Somewhere behind them a car door closes. Neither of them looks.`,
    translation: `НАТ. ПЛЯЖ — УТРО

Серая вода. Ветра нет. МУЖЧИНА, лет сорока, стоит по пояс в воде, держа МАЛЬЧИКА, десять лет, под плечи. Мальчик напряжён.

МУЖЧИНА
Откинь голову назад. До конца.

МАЛЬЧИК
Я уйду под воду.

МУЖЧИНА
Не уйдёшь. Я держу.

Мальчик откидывает голову. Ноги отрываются от песка. Мужчина держит одну руку у него под спиной.

МУЖЧИНА (ПРОД.)
Вот. Получается.

МАЛЬЧИК
Это ты меня держишь.

МУЖЧИНА
Я тебя касаюсь. Это не одно и то же.

Он убирает руку. Две секунды. Три. Мальчик держится на воде.

МАЛЬЧИК
(тихо)
Никуда не уходи.

МУЖЧИНА
Я здесь.

Они остаются так. Где-то позади хлопает дверца машины. Ни один не оборачивается.`,
    glossary: [
      { term: 'EXT. / INT.', ru: 'НАТ. / ИНТ. — снаружи / в помещении; шапка сцены' },
      { term: 'waist-deep', ru: 'по пояс (в воде)' },
      { term: 'stiff', ru: 'напряжённый, скованный' },
      { term: 'all the way', ru: 'до конца, полностью' },
      { term: 'I’ve got you', ru: 'я держу; я рядом' },
      { term: 'CONT’D', ru: 'continued — та же реплика продолжается' },
      { term: 'That’s not the same thing', ru: 'это не одно и то же' },
      { term: 'Don’t go anywhere', ru: 'никуда не уходи' },
    ],
    questions: [
      {
        q: 'What is the difference the man makes between holding and touching?',
        options: [
          'Holding keeps the boy up; touching only reassures him',
          'They mean the same',
          'Touching is stronger than holding',
          'He is correcting the boy’s English',
        ],
        correct: 0,
      },
      {
        q: 'Why is a screenplay written in the present tense?',
        options: [
          'It is a grammar rule for all films',
          'Because it describes what is happening on the screen right now',
          'Because it is faster to type',
          'Because the story is set in the present day',
        ],
        correct: 1,
        why: 'Сценарий — инструкция к тому, что зритель увидит, поэтому Present Simple. Прошедшее время в ремарке — верный признак, что писал не сценарист.',
      },
      {
        q: 'What do the last two lines tell us?',
        options: [
          'They are waiting for someone',
          'Something else is happening nearby, and it does not matter to them',
          'They are about to leave',
          'The car belongs to the man',
        ],
        correct: 1,
      },
    ],
  },

  // ── Божья земля: карточка, наш текст ───────────────────────────────────────
  {
    id: 'sc-gods-own-country-1',
    workId: 'gods-own-country',
    lang: 'en', title: 'Окот в четыре утра', level: 'B2', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему фильма', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Фильм снят в Йоркшире и говорит по-йоркширски: фразы короткие, вежливых оборотов почти нет, а половина смысла — в том, что человек вообще заговорил. Ниже наш текст в том же регистре. Осторожно: nowt, owt и aye — настоящий северный английский, но это диалект. Понимать его полезно, писать так в письме или на экзамене нельзя.',
    body: `Four in the morning and the third ewe of the night in trouble.

“Hold her.”

“I am holding her.”

“Hold her proper.”

The lamb came out wrong way round and not breathing. He cleared its mouth with a finger, rubbed it hard with straw, swung it once, twice. Nowt. He rubbed it again, harder than looked kind.

It coughed.

“There.”

“Is it alright?”

“It’s alive. That’ll do for now.”

They put it under the lamp. The ewe was already licking at it, deciding.

“You’ve done this before,” he said.

“Aye. Two hundred a season, back home.”

“Two hundred.” He wiped his hands on his trousers. He was going to say something else and did not. Then: “There’s tea in the flask.”

Which was, from him, a considerable speech.`,
    translation: `Четыре утра, и третья за ночь овца не может разродиться.

— Держи её.

— Я держу.

— Держи как следует.

Ягнёнок вышел задом наперёд и не дышал. Он пальцем прочистил ему рот, растёр его соломой, встряхнул раз, другой. Ничего. Растёр ещё — сильнее, чем выглядело милосердным.

Ягнёнок кашлянул.

— Вот.

— С ним нормально?

— Живой. Пока сойдёт.

Его положили под лампу. Овца уже вылизывала его, решая.

— Ты это уже делал, — сказал он.

— Ага. Двести за сезон, у себя дома.

— Двести. — Он вытер руки о штаны. Он собирался сказать что-то ещё и не сказал. Потом: — В термосе чай.

Что для него было речью изрядной длины.`,
    glossary: [
      { term: 'ewe', ru: 'овца (самка)' },
      { term: 'to be in trouble', ru: 'тут — не может разродиться' },
      { term: 'proper', ru: 'диал. как следует; в норме properly' },
      { term: 'wrong way round', ru: 'задом наперёд' },
      { term: 'nowt', ru: 'диал. ничего; в норме nothing' },
      { term: 'aye', ru: 'диал. да; север Англии и Шотландия' },
      { term: 'That’ll do', ru: 'сойдёт, достаточно' },
      { term: 'flask', ru: 'термос' },
      { term: 'a considerable speech', ru: 'изрядная речь; иронически о двух словах' },
    ],
    questions: [
      {
        q: 'What is wrong with the lamb?',
        options: [
          'It is too small',
          'It comes out backwards and is not breathing',
          'The ewe rejects it',
          'It is too cold',
        ],
        correct: 1,
      },
      {
        q: 'Which of these is dialect, not standard English?',
        options: [
          'It’s alive',
          'nowt, aye, hold her proper',
          'There’s tea in the flask',
          'Two hundred a season',
        ],
        correct: 1,
        why: 'Понимать йоркширское nowt/owt/aye полезно — их слышно в кино и на улице. Писать так нельзя: в письменной норме это ошибка.',
      },
      {
        q: 'Why does the narrator call "There’s tea in the flask" a considerable speech?',
        options: [
          'It is a long sentence',
          'Because from this man even a small friendly remark is a lot',
          'Because tea is important in England',
          'Because he shouted it',
        ],
        correct: 1,
      },
    ],
  },

  // ── С любовью, Саймон: карточка, наш текст ─────────────────────────────────
  {
    id: 'sc-love-simon-1',
    workId: 'love-simon-film',
    lang: 'en', title: 'Столовая, четвёртый урок', level: 'B1', minutes: 3,
    topic: 'Учёба', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему фильма', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Экранизация «Симона»: та же история, но услышанная, а не прочитанная. Ниже наш текст сценарной записью — американская школьная речь в чистом виде. Полезно сравнить с письмами на карточке книги: одно и то же говорится вслух и на письме совершенно по-разному.',
    body: `INT. HIGH SCHOOL CAFETERIA — DAY

Noise. Trays. Four friends at the end of a long table.

NICK
So are you coming Friday or not?

SIMON
Depends who’s driving.

ABBY
I’m driving. I’m always driving.

LEAH
You drive like my grandmother.

ABBY
Your grandmother is an excellent driver.

Simon’s phone lights up on the table. He turns it over, face down, without looking at it. Nobody notices. Leah notices.

LEAH
Who was that?

SIMON
Nobody.

LEAH
Cool. Tell Nobody I said hi.

She goes back to her food. Simon looks at the back of his phone for a second too long.

NICK
(mouth full)
Friday. Yes or no.

SIMON
Yeah. Yes. Friday.`,
    translation: `ИНТ. ШКОЛЬНАЯ СТОЛОВАЯ — ДЕНЬ

Шум. Подносы. Четверо друзей в конце длинного стола.

НИК
Ну так ты в пятницу идёшь или нет?

САЙМОН
Смотря кто за рулём.

ЭББИ
Я за рулём. Я всегда за рулём.

ЛИА
Ты водишь как моя бабушка.

ЭББИ
Твоя бабушка отлично водит.

Телефон Саймона загорается на столе. Он переворачивает его экраном вниз, не посмотрев. Никто не замечает. Лиа замечает.

ЛИА
Кто это был?

САЙМОН
Никто.

ЛИА
Ясно. Передавай Никому привет.

Она возвращается к еде. Саймон на секунду дольше нужного смотрит на заднюю крышку телефона.

НИК
(с набитым ртом)
Пятница. Да или нет.

САЙМОН
Ага. Да. Пятница.`,
    glossary: [
      { term: 'tray', ru: 'поднос' },
      { term: 'Depends who’s driving', ru: 'смотря кто за рулём' },
      { term: 'to light up', ru: 'загореться (об экране)' },
      { term: 'face down', ru: 'экраном вниз, лицом вниз' },
      { term: 'Tell Nobody I said hi', ru: 'передавай Никому привет; шутка на слове nobody' },
      { term: '(mouth full)', ru: 'с набитым ртом; ремарка о том, как сказано' },
      { term: 'a second too long', ru: 'на секунду дольше, чем нужно' },
      { term: 'Yeah. Yes.', ru: 'ага. да; поправка на более «взрослое» слово' },
    ],
    questions: [
      {
        q: 'What does Simon do when his phone lights up?',
        options: [
          'He answers it',
          'He turns it face down without looking',
          'He gives it to Leah',
          'He switches it off',
        ],
        correct: 1,
      },
      {
        q: 'Why does Leah say "Tell Nobody I said hi"?',
        options: [
          'She did not hear him',
          'She is playing with his word "nobody" — she knows he is hiding something',
          'She wants the phone',
          'She is angry',
        ],
        correct: 1,
      },
      {
        q: 'How is this different from the letters on the book’s card?',
        options: [
          'It is the same language',
          'Speech is short and unfinished; the letters are full sentences and thought through',
          'The letters are more casual',
          'There is no difference in register',
        ],
        correct: 1,
        why: 'Сравнение того стоит: устная речь живёт обрывками и подхватами, письмо — законченными фразами. Ученики, которые пишут как говорят, звучат по-английски неряшливо, и наоборот.',
      },
    ],
  },

  // ── Это грех: карточка, наш текст ──────────────────────────────────────────
  {
    id: 'sc-its-a-sin-1',
    workId: 'its-a-sin',
    lang: 'en', title: 'Письмо домой, 1986', level: 'B2', minutes: 4,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Лондон восьмидесятых: телефон — в коридоре и по счётчику, поэтому главное пишут письмами. Ниже наш текст в том же жанре — письмо домой, в котором сказано ровно столько, сколько можно сказать. Для языка это письменный британский регистр среднего уровня: полные фразы, оговорки, вежливые формулы вроде do let me know.',
    body: `Dear Mum,

Thank you for the parcel. The socks arrived in one piece and the cake did not, but it was very good all the same.

Work is fine. I’m still at the shop three days a week and there is talk of putting me on the till, which sounds small but is actually a promotion, so do tell Dad.

London is enormous and everybody walks very fast. I share the flat with four other people. Ash cooks, Roscoe washes up, and nobody has yet worked out whose job the bathroom is. It is loud and there is always someone on the stairs and I like it more than I can properly explain in a letter.

You asked whether I am eating. I am eating.

You asked the other thing again. I know you did not mean anything by it and I am not cross. I would just rather we talked about it when I am home at Christmas, and not on paper, if that is alright.

Give my love to Nan. Tell her the cardigan fits.

Do let me know about Dad’s hip.

Love,
Colin`,
    translation: `Дорогая мама,

Спасибо за посылку. Носки доехали целыми, кекс — нет, но всё равно был очень вкусный.

С работой нормально. Я всё так же в магазине три дня в неделю, и поговаривают, что поставят меня на кассу, — звучит мелко, но это на самом деле повышение, так что папе расскажи.

Лондон огромный, и все ходят очень быстро. Квартиру снимаю ещё с четырьмя. Эш готовит, Роско моет посуду, и никто до сих пор не выяснил, чья обязанность ванная. Шумно, на лестнице вечно кто-то есть, и мне тут нравится больше, чем я могу толком объяснить в письме.

Ты спрашивала, ем ли я. Ем.

Ты опять спросила про то, другое. Я знаю, что ты ничего такого не имела в виду, и я не сержусь. Я просто предпочёл бы поговорить об этом, когда приеду на Рождество, а не на бумаге, если можно.

Передавай привет бабушке. Скажи, что кофта впору.

Обязательно напиши, как папино бедро.

С любовью,
Колин`,
    glossary: [
      { term: 'parcel', ru: 'посылка; брит. вместо package' },
      { term: 'in one piece', ru: 'целым, невредимым' },
      { term: 'all the same', ru: 'всё равно, тем не менее' },
      { term: 'there is talk of', ru: 'поговаривают, что' },
      { term: 'to put somebody on the till', ru: 'поставить на кассу' },
      { term: 'to wash up', ru: 'мыть посуду; брит.' },
      { term: 'I am not cross', ru: 'я не сержусь; брит. вместо angry' },
      { term: 'I would rather we talked', ru: 'я предпочёл бы, чтобы мы поговорили' },
      { term: 'if that is alright', ru: 'если можно, если ты не против' },
      { term: 'do let me know', ru: 'обязательно сообщи; do для нажима' },
    ],
    questions: [
      {
        q: 'What is "the other thing" the mother asked about?',
        options: [
          'The letter says plainly',
          'It is never named — the writer moves it to Christmas instead',
          'His job at the shop',
          'The rent',
        ],
        correct: 1,
      },
      {
        q: 'What does "do tell Dad" mean?',
        options: [
          'A question',
          'An emphatic request: please do tell him',
          'A refusal',
          'A conditional',
        ],
        correct: 1,
        why: 'do перед глаголом в повелительном наклонении — британский способ нажать вежливо: do come in, do let me know, do tell.',
      },
      {
        q: 'Why does the writer prefer not to discuss it "on paper"?',
        options: [
          'He writes badly',
          'A letter can be read by others and cannot be taken back',
          'He has no more room',
          'The post is slow',
        ],
        correct: 1,
      },
    ],
  },

  // ── Остановка сердца (сериал): карточка, наш текст ─────────────────────────
  {
    id: 'sc-heartstopper-series-1',
    workId: 'heartstopper-series',
    lang: 'en', title: 'Как читать субтитры', level: 'B1', minutes: 3,
    topic: 'Технологии и медиа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Сериал смотрят с английскими субтитрами — и субтитры это отдельный жанр со своими правилами: две строки, реплики разных людей через тире, звуки в скобках, паузы многоточием. Ниже наша дорожка субтитров в том же формате. Смысл упражнения — научиться читать то, что реально стоит внизу экрана, а не расшифровку с бумаги.',
    body: `00:04:12,300 --> 00:04:14,100
[school bell ringing]

00:04:15,000 --> 00:04:17,640
- You're in my seat.
- Am I?

00:04:17,720 --> 00:04:20,480
I mean, there's no name on it,
so technically...

00:04:20,560 --> 00:04:21,900
Technically.

00:04:22,600 --> 00:04:25,320
[chairs scraping]

00:04:26,000 --> 00:04:29,160
- You can stay. If you want.
- Yeah?

00:04:29,240 --> 00:04:30,880
Yeah. Whatever.

00:04:31,400 --> 00:04:34,000
[quietly] It's just a chair.

00:04:35,120 --> 00:04:37,600
[bell ringing]
[indistinct chatter]`,
    translation: `00:04:12,300 --> 00:04:14,100
[школьный звонок]

00:04:15,000 --> 00:04:17,640
— Ты на моём месте.
— Разве?

00:04:17,720 --> 00:04:20,480
В смысле, тут же не написано,
так что формально…

00:04:20,560 --> 00:04:21,900
Формально.

00:04:22,600 --> 00:04:25,320
[скрип стульев]

00:04:26,000 --> 00:04:29,160
— Можешь остаться. Если хочешь.
— Да?

00:04:29,240 --> 00:04:30,880
Да. Не важно.

00:04:31,400 --> 00:04:34,000
[тихо] Это просто стул.

00:04:35,120 --> 00:04:37,600
[звонок]
[неразборчивый гомон]`,
    glossary: [
      { term: '00:04:12,300 --> 00:04:14,100', ru: 'таймкод: с какой по какую секунду висит реплика' },
      { term: '[school bell ringing]', ru: 'звук в квадратных скобках — для тех, кто не слышит' },
      { term: '- реплика / - реплика', ru: 'тире в начале строк: говорят двое' },
      { term: 'Am I?', ru: 'разве?; короткий переспрос вспомогательным глаголом' },
      { term: 'technically', ru: 'формально, строго говоря' },
      { term: '…', ru: 'многоточие: фразу не договорили' },
      { term: 'Whatever', ru: 'не важно, как хочешь; часто прикрывает смущение' },
      { term: 'indistinct chatter', ru: 'неразборчивый гомон; частая пометка в субтитрах' },
    ],
    questions: [
      {
        q: 'What do square brackets mark in a subtitle track?',
        options: [
          'Words nobody says — sounds and noises',
          'The translator’s notes',
          'Song lyrics only',
          'Mistakes',
        ],
        correct: 0,
      },
      {
        q: 'Why do two lines begin with a dash?',
        options: [
          'The sentence continues',
          'Two different people speak inside the same subtitle',
          'It is a list',
          'The sound is bad',
        ],
        correct: 1,
      },
      {
        q: '"You can stay. If you want." — what is the second sentence doing?',
        options: [
          'Setting a condition',
          'Taking the weight out of the offer so it is easier to accept',
          'Asking a question',
          'Correcting the first sentence',
        ],
        correct: 1,
        why: 'Приставленное if you want — типичный английский способ предложить, не надавив. Формально условие, по сути — вежливость.',
      },
    ],
  },

  // ── Шиттс-Крик: карточка, наш текст ────────────────────────────────────────
  {
    id: 'sc-schitts-creek-1',
    workId: 'schitts-creek',
    lang: 'en', title: 'Вежливо и невыносимо', level: 'B2', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Ситком держится на формулах, которыми по-английски язвят, не повышая голоса: I appreciate that, with respect, if I’m being honest. Ниже наш диалог в том же жанре. Практическая ценность прямая — это ровно те обороты, которыми ведут переговоры и отказывают на работе, только здесь они смешные и потому запоминаются.',
    body: `“So. The sign.”

“I love the sign.”

“You hate the sign.”

“I did not say that. I said I love the sign. What I feel about the sign is love.”

“You have said the word ‘love’ three times, which is three times more than you have ever said it about anything.”

“With respect, that is not fair.”

“And you keep standing in front of it.”

“…Because it is beautiful and I am protecting it from the sun.”

“Right.”

“Look. If I’m being honest — and I don’t want this to come out wrong —”

“It always comes out wrong.”

“— the font is a choice.”

“It’s a font. Fonts are choices.”

“It’s a bold choice. It is the boldest choice I have ever seen anyone make with a piece of wood.”

A pause.

“You could have just said you didn’t like it.”

“I appreciate that. I could not have.”`,
    translation: `— Итак. Вывеска.

— Я обожаю вывеску.

— Ты её терпеть не можешь.

— Я такого не говорил. Я сказал, что обожаю вывеску. То, что я чувствую к вывеске, — это любовь.

— Ты произнёс слово «люблю» три раза, что на три раза больше, чем ты произносил его о чём-либо вообще.

— При всём уважении, это несправедливо.

— И ты всё время стоишь перед ней.

— …Потому что она прекрасна и я заслоняю её от солнца.

— Ну да.

— Слушай. Если честно — и я не хочу, чтобы это прозвучало не так —

— Оно всегда звучит не так.

— …шрифт — это решение.

— Это шрифт. Шрифты и есть решения.

— Это смелое решение. Это самое смелое решение, какое я видел, чтобы кто-то принял в отношении куска дерева.

Пауза.

— Мог бы просто сказать, что тебе не нравится.

— Ценю. Не мог бы.`,
    glossary: [
      { term: 'With respect, …', ru: 'при всём уважении…; почти всегда предваряет возражение' },
      { term: 'That is not fair', ru: 'это несправедливо' },
      { term: 'If I’m being honest', ru: 'если честно; смягчение перед критикой' },
      { term: 'to come out wrong', ru: 'прозвучать не так' },
      { term: 'a bold choice', ru: 'смелое решение; в отзыве о работе — почти всегда упрёк' },
      { term: 'I appreciate that', ru: 'ценю, спасибо; часто вежливое несогласие' },
      { term: 'I could not have', ru: 'не мог бы (и не стал)' },
      { term: 'Right.', ru: 'ну да; сухое «понятно», обозначающее недоверие' },
    ],
    questions: [
      {
        q: 'Does the first speaker like the sign?',
        options: [
          'Yes',
          'No — and everything he says is a way of not saying so',
          'He has not seen it',
          'He made it himself',
        ],
        correct: 1,
      },
      {
        q: 'What does "a bold choice" usually mean in a review of someone’s work?',
        options: [
          'Genuine praise',
          'Polite criticism',
          'A technical term',
          'A question',
        ],
        correct: 1,
        why: 'Ровно тот случай, когда буквальный перевод обманывает: bold/interesting/unusual в отзыве о работе — почти всегда мягкое «мне не нравится».',
      },
      {
        q: '"I appreciate that. I could not have." What does the second sentence mean?',
        options: [
          'He was unable to hear it',
          'It was not possible for him to say it plainly',
          'He will say it later',
          'He agrees completely',
        ],
        correct: 1,
      },
    ],
  },

  // ── Красный, белый и королевский синий: карточка, наш текст ────────────────
  {
    id: 'sc-rwrb-1',
    workId: 'mcquiston-rwrb',
    lang: 'en', title: 'Официально и на самом деле', level: 'B2', minutes: 4,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'У Маккуистон половина книги — протокольный английский пресс-служб, вторая — смски. Ниже наш текст, где оба регистра стоят рядом: одно и то же событие в заявлении для прессы и в переписке. Лучшее упражнение на разницу между письменным официальным и письменным разговорным, какое можно придумать.',
    body: `JOINT STATEMENT

Following the events at the reception on Saturday evening, both households wish to confirm that no offence was taken on either side and that the matter has been resolved privately. Reports suggesting otherwise are inaccurate. Both parties look forward to continuing to work together on the summer programme and will not be commenting further.

—

22:41
so “no offence was taken on either side”

22:41
that’s what they went with?

22:42
i was in the room. offence was taken. offence was taken by everyone

22:44
my press office wrote it. i said three words and one of them was “fine”

22:44
which three

22:45
“fine” and then “fine” twice more

22:47
“the matter has been resolved privately” lol

22:47
has it

22:49
i’m told it has

22:50
right. well. in that case i suppose there’s nothing left to discuss

22:52
i didn’t say that

22:53
no. you didn’t.`,
    translation: `СОВМЕСТНОЕ ЗАЯВЛЕНИЕ

В связи с событиями на приёме в субботу вечером обе стороны считают нужным подтвердить, что ни одна из сторон не сочла себя оскорблённой и что вопрос урегулирован в частном порядке. Сообщения об обратном не соответствуют действительности. Обе стороны рассчитывают продолжить совместную работу над летней программой и от дальнейших комментариев воздержатся.

—

22:41
значит, «ни одна из сторон не сочла себя оскорблённой»

22:41
вот на этом и остановились?

22:42
я был в комнате. оскорблённой сочла себя каждая. вообще все

22:44
это писала моя пресс-служба. я сказал три слова, и одно из них было «нормально»

22:44
какие три

22:45
«нормально», а потом ещё дважды «нормально»

22:47
«вопрос урегулирован в частном порядке» лол

22:47
урегулирован?

22:49
мне сказали, что да

22:50
ясно. ну. тогда, полагаю, обсуждать больше нечего

22:52
я этого не говорил

22:53
нет. не говорил.`,
    glossary: [
      { term: 'joint statement', ru: 'совместное заявление' },
      { term: 'following the events', ru: 'в связи с событиями; канцелярское «после»' },
      { term: 'no offence was taken', ru: 'никто не счёл себя оскорблённым; пассив без виновных' },
      { term: 'the matter has been resolved', ru: 'вопрос урегулирован' },
      { term: 'reports suggesting otherwise are inaccurate', ru: 'сообщения об обратном не соответствуют действительности' },
      { term: 'will not be commenting further', ru: 'от дальнейших комментариев воздержится' },
      { term: 'that’s what they went with?', ru: 'и вот на этом остановились?' },
      { term: 'i’m told it has', ru: 'мне сказали, что да; ответ, снимающий с себя ответственность' },
      { term: 'in that case', ru: 'в таком случае' },
    ],
    questions: [
      {
        q: 'What does the statement claim happened at the reception?',
        options: [
          'A serious quarrel',
          'Nothing worth discussing — and it has already been settled',
          'An accident',
          'A change of programme',
        ],
        correct: 1,
      },
      {
        q: 'Why is the statement written almost entirely in the passive?',
        options: [
          'It sounds more elegant',
          'The passive hides who did what — nobody has to be named or blamed',
          'It is a rule of English grammar for statements',
          'To make it shorter',
        ],
        correct: 1,
        why: 'no offence was taken, the matter has been resolved — действующих лиц нет вовсе. Тот же приём в объявлениях об увольнениях и отменах рейсов.',
      },
      {
        q: 'How does the texting register differ from the statement?',
        options: [
          'No capital letters, no full stops, short lines, jokes',
          'It is more formal',
          'It uses longer words',
          'There is no difference',
        ],
        correct: 0,
      },
    ],
  },

  // ── Семь мужей Эвелин Хьюго: карточка, наш текст ───────────────────────────
  {
    id: 'sc-evelyn-hugo-1',
    workId: 'reid-evelyn-hugo',
    lang: 'en', title: 'Интервью, первый день', level: 'B2', minutes: 4,
    topic: 'Обратная связь', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Роман почти целиком построен как интервью: журналистка спрашивает, актриса отвечает так, как ей удобно. Ниже наш текст в том же жанре. Для языка это концентрат вопросов и уходов от ответа — то есть ровно того, что нужно на собеседовании, на экзамене и в любом разговоре, где не хочется отвечать прямо.',
    body: `“Can I record this?”

“You can record all of it. That is the point of you being here.”

“Then let’s start at the beginning. Why me?”

“Because nobody knows your name.”

“That’s not usually considered a qualification.”

“It is the only one I need. Next question.”

“All right. Of the seven marriages, which one was the real one?”

She looked at me for a while.

“You have been a journalist for how long?”

“Four years.”

“And in four years, how many people have answered that kind of question the first time it was asked?”

“None.”

“There you are. Ask me again on Thursday.”

“Why Thursday?”

“Because by Thursday you will have stopped asking what everybody else asks, and you will ask the thing you actually want to know. And I will answer it, and you will wish I hadn’t.”

I wrote that down. She watched me write it down.

“You’ll want more coffee,” she said. “This is going to take a while.”`,
    translation: `— Можно я включу запись?

— Можете записывать всё. Ради этого вы здесь и сидите.

— Тогда начнём с начала. Почему я?

— Потому что вашего имени никто не знает.

— Обычно это не считается достоинством.

— Мне другого и не нужно. Следующий вопрос.

— Хорошо. Из семи браков какой был настоящим?

Она смотрела на меня какое-то время.

— Вы сколько лет работаете журналисткой?

— Четыре года.

— И за четыре года сколько человек ответили вам на такой вопрос с первого раза?

— Ни одного.

— Вот именно. Спросите меня ещё раз в четверг.

— Почему в четверг?

— Потому что к четвергу вы перестанете спрашивать то, что спрашивают все, и спросите то, что вам на самом деле хочется знать. И я отвечу, и вы пожалеете, что спросили.

Я это записала. Она смотрела, как я это записываю.

— Вам понадобится ещё кофе, — сказала она. — Это надолго.`,
    glossary: [
      { term: 'Can I record this?', ru: 'можно я включу запись?' },
      { term: 'That is the point of…', ru: 'ради этого и…; в этом весь смысл' },
      { term: 'let’s start at the beginning', ru: 'начнём с начала' },
      { term: 'a qualification', ru: 'достоинство, основание; не только «квалификация»' },
      { term: 'Next question.', ru: 'следующий вопрос; способ закрыть тему' },
      { term: 'There you are.', ru: 'вот именно; вот вам и ответ' },
      { term: 'you will wish I hadn’t', ru: 'вы пожалеете, что я ответила' },
      { term: 'This is going to take a while', ru: 'это надолго' },
    ],
    questions: [
      {
        q: 'Why did she choose this journalist?',
        options: [
          'Because she is famous',
          'Because nobody knows her name',
          'Because she works for a big paper',
          'Because they are old friends',
        ],
        correct: 1,
      },
      {
        q: 'How does she avoid the question about the marriages?',
        options: [
          'She refuses to speak',
          'She answers with questions of her own and moves it to Thursday',
          'She changes the subject to coffee',
          'She lies',
        ],
        correct: 1,
        why: 'Ответить вопросом на вопрос — самый частый способ уйти от ответа по-английски, и он не считается грубостью, если вопрос по делу.',
      },
      {
        q: '"You will wish I hadn’t." What is left out at the end?',
        options: [
          'answered it',
          'asked you',
          'written it down',
          'come here',
        ],
        correct: 0,
        why: 'Эллипсис после вспомогательного: hadn’t [answered it]. Английский выбрасывает всё, что уже прозвучало, — русский так почти никогда не делает.',
      },
    ],
  },

  // ── Молодой Мунго: карточка, наш текст ─────────────────────────────────────
  {
    id: 'sc-young-mungo-1',
    workId: 'stuart-young-mungo',
    lang: 'en', title: 'Голубятня на крыше', level: 'C1', minutes: 4,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Стюарт пишет Глазго так, как он звучит: ye вместо you, wee вместо little, cannae вместо can’t, ken вместо know. Ниже наш текст в том же регистре. Важно понимать, зачем это читать: шотландский нужен, чтобы понимать кино и людей, но писать так нельзя нигде — ни в письме, ни на экзамене. Диалект в тексте помечен, стандартный вариант есть в словаре.',
    body: `The doos were up on the roof of the back building, in a loft his brother had built out of pallets and hope.

“Ye’ll no touch anythin,” said the boy who owned them. “Ye can look.”

“I ken.”

“Ah’m serious. Ma da’ll kill me.”

“Ah said Ah ken.”

He opened the wire door and put his hand in slow, the way ye would into water ye werenae sure about. A grey hen came onto his wrist and settled there, and he stood that way for a long while, not moving, breathing shallow, as if the bird had asked him a question and he was minding his answer.

“She likes ye,” said the other boy, and then, too quickly, “She likes anybody.”

Below them somebody was shouting in a close, and somebody else was laughing, and a bus went past on the main road with its windows lit, and up here there was only the sound of the doos moving about.

“Ye can come up again,” the boy said, looking at the wire and not at him. “If ye want. Thursdays are quiet.”`,
    translation: `Голуби были на крыше дворового флигеля, в голубятне, которую его брат сколотил из поддонов и надежды.

— Ничего не трогай, — сказал мальчик, чьи это были птицы. — Смотреть можно.

— Знаю.

— Я серьёзно. Отец меня убьёт.

— Я сказал, что знаю.

Он открыл сетчатую дверцу и медленно просунул руку — так, как суют в воду, в которой не уверены. Серая голубка села ему на запястье и там устроилась, и он долго стоял так, не двигаясь, дыша неглубоко, будто птица задала ему вопрос, а он обдумывал ответ.

— Ты ей нравишься, — сказал второй мальчик и тут же, слишком быстро: — Ей все нравятся.

Внизу кто-то кричал в подъезде, кто-то смеялся, по главной улице прошёл автобус с освещёнными окнами, а здесь наверху был только звук возящихся голубей.

— Можешь ещё приходить, — сказал мальчик, глядя на сетку, а не на него. — Если хочешь. По четвергам тихо.`,
    glossary: [
      { term: 'doo', ru: 'шотл. голубь; норма — pigeon' },
      { term: 'ye', ru: 'шотл. ты, вы; норма — you' },
      { term: 'ye’ll no touch', ru: 'шотл. не трогай; норма — you won’t touch' },
      { term: 'Ah ken', ru: 'шотл. я знаю; норма — I know' },
      { term: 'ma da', ru: 'шотл. мой отец; норма — my dad' },
      { term: 'werenae', ru: 'шотл. не был; норма — weren’t' },
      { term: 'close', ru: 'шотл. подъезд многоквартирного дома' },
      { term: 'to mind one’s answer', ru: 'обдумывать ответ' },
      { term: 'wee', ru: 'шотл. маленький; норма — little' },
    ],
    questions: [
      {
        q: 'What is a "doo" in this text?',
        options: [
          'A door',
          'A pigeon',
          'A friend',
          'A roof',
        ],
        correct: 1,
      },
      {
        q: '"Ye’ll no touch anythin" — what is the standard English?',
        options: [
          'You will know nothing',
          'You won’t touch anything',
          'You have not touched anything',
          'You must not go anywhere',
        ],
        correct: 1,
        why: 'Шотландское no на месте not — самая частая помеха при чтении Стюарта. Стоит запомнить пару ye’ll no / you won’t и дальше текст читается.',
      },
      {
        q: 'What is the boy really saying with "Thursdays are quiet"?',
        options: [
          'He is describing his week',
          'It is an invitation, said in a way that can be taken back',
          'He is asking for help',
          'He wants to be left alone',
        ],
        correct: 1,
      },
    ],
  },

  // ── Парни с кладбища: карточка, наш текст ──────────────────────────────────
  {
    id: 'sc-cemetery-boys-1',
    workId: 'thomas-cemetery-boys',
    lang: 'en', title: 'Два языка на одной кухне', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему романа', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'У Эйдена Томаса герои говорят на смеси английского и испанского — так и говорят в латиноамериканских кварталах Калифорнии: английский с бабушкой не работает, испанский с одноклассниками не нужен. Ниже наш текст в том же регистре. Испанские вставки переводить не нужно: важно увидеть, КАК язык переключается — по собеседнику, а не по теме.',
    body: `My grandmother has two voices. One is for the phone and one is for me.

“Mijo,” she said, which is the second voice. “Come here. Taste this.”

She held out the spoon. I tasted. It was too much salt and we both knew it.

“It’s good.”

“It is not good. Say it properly.”

“It’s got a lot of salt in it.”

“There. Was that so hard?” She took the spoon back. “In this house we say the true thing. Outside, you can be polite.”

My cousin came in without knocking, the way she does, already talking. “Tía, is he coming tonight or not, because I told everybody he was coming and now I look —”

“He is coming,” my grandmother said, in English, so that I would hear it.

I had not said I was coming. I looked at the floor, which in our family counts as a signature.

“Bueno,” said my cousin, satisfied, and took a tortilla off the stack, and left.

My grandmother went back to the pot. Then, not turning round: “You will stand at the front. With everybody. Where you belong.”`,
    translation: `У моей бабушки два голоса. Один для телефона, другой для меня.

— Михо, — сказала она, и это был второй голос. — Иди сюда. Попробуй.

Она протянула ложку. Я попробовал. Соли было много, и мы оба это знали.

— Вкусно.

— Невкусно. Скажи как следует.

— Тут много соли.

— Вот. Что, так сложно было? — Она забрала ложку. — В этом доме мы говорим правду. На улице можешь быть вежливым.

Вошла двоюродная сестра, без стука, как она умеет, уже на ходу говоря: — Тётя, он идёт сегодня или нет, я же всем сказала, что идёт, и теперь я выгляжу…

— Идёт, — сказала бабушка по-английски, чтобы услышал я.

Я не говорил, что иду. Я посмотрел в пол, что в нашей семье считается подписью.

— Буэно, — сказала сестра удовлетворённо, взяла лепёшку из стопки и ушла.

Бабушка вернулась к кастрюле. Потом, не оборачиваясь: — Стоять будешь впереди. Со всеми. Там, где твоё место.`,
    glossary: [
      { term: 'mijo', ru: 'исп. сынок, родной; обращение к младшему' },
      { term: 'to hold out', ru: 'протянуть (руку, предмет)' },
      { term: 'Say it properly', ru: 'скажи как следует' },
      { term: 'Was that so hard?', ru: 'что, так сложно было?' },
      { term: 'tía', ru: 'исп. тётя' },
      { term: 'without knocking', ru: 'без стука' },
      { term: 'bueno', ru: 'исп. ладно, хорошо' },
      { term: 'where you belong', ru: 'там, где твоё место' },
    ],
    questions: [
      {
        q: 'Why does the grandmother switch to English for one line?',
        options: [
          'The cousin does not speak Spanish',
          'So that the narrator hears it — it is aimed at him',
          'It is a formal sentence',
          'She is on the phone',
        ],
        correct: 1,
      },
      {
        q: 'What is the rule she states about telling the truth?',
        options: [
          'Always be polite',
          'At home you say the true thing; outside you may be polite',
          'Never say what you think',
          'Only adults may say it',
        ],
        correct: 1,
      },
      {
        q: '"I looked at the floor, which in our family counts as a signature." What does this mean?',
        options: [
          'He was embarrassed',
          'Not objecting is treated as agreeing',
          'He was reading something',
          'He signed a paper',
        ],
        correct: 1,
        why: 'Приём стоит заметить: молчание как согласие есть и в английском, и в русском, но здесь оно ещё и названо — метафорой из юридического языка.',
      },
    ],
  },

  // ── Половое воспитание: карточка, наш текст ────────────────────────────────
  //
  // bucket: 'inspired'. Школа, кабинет и колонка наши. От сериала — ровно одно:
  // спокойный, точный регистр разговора о теле и границах. Он полезен не только
  // на уроке английского, и именно поэтому здесь нет ни одной пикантности: весь
  // смысл в том, что этот язык нейтральный, а не в том, что он «про такое».
  {
    id: 'sc-sexed-1',
    workId: 'sex-education',
    lang: 'en', title: 'Листовка школьного кабинета', level: 'B1', minutes: 3,
    topic: 'Здоровье', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Главная мысль сериала: половина бед оттого, что подростку не с кем поговорить нормальными словами. Ниже наша листовка школьного кабинета здоровья. Лексика тут пригодится далеко за пределами школы — confidential, appointment, GP, consent, — а конструкции сплошь смягчающие: «you can», «you do not have to», «nobody will».',
    after: 'Обратите внимание, что почти каждый пункт написан через «не обязаны»: не обязаны называть имя, знать вопрос заранее, приходить одни. Английский разговор о границах строится именно так — сначала снимают обязательства, потом предлагают помощь.',
    body: `WELLBEING ROOM — 3B, behind the library
Open every lunchtime and Thursday after school.

WHAT THIS ROOM IS FOR
Anything you would rather not ask a teacher. Your body, your head, your relationships, or a question you have already looked up online three times and still do not trust the answer to.

IS IT CONFIDENTIAL?
Yes. Nothing you say here goes to your teachers, your form tutor or your parents. There is one exception and we will not pretend there isn't: if you or someone else is in danger, we have to tell someone, and we will tell you first, to your face, before we do.

YOU DO NOT HAVE TO
— give your name
— know what your question is before you come in
— come alone (bring a friend; they can wait outside or sit with you)
— talk at all. Some people come in, take a leaflet and leave. That is a completely normal use of this room.

WE CAN ALSO
Book you an appointment with a GP, in confidence and outside school hours. Explain what a test involves before you decide whether you want one. Find you the same information in writing, so you do not have to remember it.

ONE THING WORTH SAYING
Consent means someone actually said yes, and could have said no without anything bad happening to them. If either half of that is missing, it is not consent, whatever else it was.

There is no such thing as a stupid question in this room. We have heard all of them, and most of them twice this term.`,
    translation: `КАБИНЕТ ЗДОРОВЬЯ — 3B, за библиотекой
Открыт каждый большой перерыв и по четвергам после уроков.

ЗАЧЕМ ЭТОТ КАБИНЕТ
Для всего, что не хочется спрашивать у учителя. Тело, голова, отношения — или вопрос, который вы уже три раза искали в интернете и всё ещё не верите ответу.

ЭТО КОНФИДЕНЦИАЛЬНО?
Да. Ничто сказанное здесь не уходит ни учителям, ни классному руководителю, ни родителям. Есть одно исключение, и делать вид, что его нет, мы не станем: если вам или кому-то ещё угрожает опасность, мы обязаны сообщить — и сначала скажем об этом вам, лично, а уже потом сообщим.

ВЫ НЕ ОБЯЗАНЫ
— называть своё имя
— заранее понимать, в чём ваш вопрос
— приходить одни (возьмите друга: он может подождать снаружи или сидеть рядом)
— вообще разговаривать. Кто-то заходит, берёт брошюру и уходит. Это совершенно нормальный способ пользоваться этим кабинетом.

МЫ ТАКЖЕ МОЖЕМ
Записать вас к врачу — конфиденциально и не в учебное время. Объяснить, как проходит обследование, до того, как вы решите, нужно ли оно вам. Найти ту же информацию в письменном виде, чтобы её не приходилось запоминать.

ОДНА ВЕЩЬ, КОТОРУЮ СТОИТ СКАЗАТЬ
Согласие — это когда человек действительно сказал «да» и при этом мог сказать «нет» без всяких последствий для себя. Если не хватает любой из этих половин, это не согласие — чем бы оно ни было.

Глупых вопросов в этом кабинете не бывает. Мы слышали их все, и большую часть — дважды за эту четверть.`,
    glossary: [
      { term: 'wellbeing', ru: 'здоровье и самочувствие в широком смысле' },
      { term: 'confidential', ru: 'конфиденциальный' },
      { term: 'form tutor', ru: 'классный руководитель (брит.)' },
      { term: 'to your face', ru: 'лично, глядя в глаза' },
      { term: 'GP (general practitioner)', ru: 'участковый врач (брит.)' },
      { term: 'in confidence', ru: 'конфиденциально' },
      { term: 'consent', ru: 'согласие' },
      { term: 'term', ru: 'учебная четверть, семестр' },
    ],
    questions: [
      {
        q: 'Is the room fully confidential?',
        options: [
          'Yes, with no exceptions',
          'Yes, except where someone is in danger — and you are told first',
          'No, teachers are informed',
          'Only if you give your name',
        ],
        correct: 1,
        why: 'Оговорка названа прямо: «we will not pretend there isn’t». Так и надо читать любые обещания конфиденциальности — искать исключение, оно всегда есть.',
      },
      {
        q: 'What is a "GP" in British English?',
        options: ['a school nurse', 'a family doctor you see first', 'a hospital', 'a counsellor'],
        correct: 1,
      },
      {
        q: 'According to the leaflet, what are the two halves of consent?',
        options: [
          'Saying yes, and being able to say no safely',
          'Saying yes twice',
          'Being over sixteen and sober',
          'Telling a friend and telling an adult',
        ],
        correct: 0,
      },
      {
        q: 'Why is the whole "YOU DO NOT HAVE TO" section written in the negative?',
        options: [
          'To sound strict',
          'It removes obligations first, which is how English lowers the cost of asking for help',
          'It is a translation error',
          'To make the leaflet shorter',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-sexed-2',
    workId: 'sex-education',
    lang: 'en', title: 'Колонка советов в школьной газете', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Колонка советов — жанр с очень узнаваемой грамматикой: отвечающий почти никогда не говорит «сделай так». Он говорит «похоже, что», «возможно, стоит», «ты никому не должен». Ниже наша колонка. Эти смягчители — самое переносимое, что здесь есть: на них держится любой английский совет, от школьного до рабочего.',
    after: 'Сравните два ответа. В первом совет есть, во втором его нет вовсе — и второй ответ от этого не хуже. По-английски «никто не может ответить на это за тебя» — законный и уважительный конец разговора, а не отказ помочь.',
    body: `ASK 3B — the wellbeing room's page in the school paper. Questions are sent anonymously and printed as received.

Q. Everyone in my year seems to have done more than me and I feel like I'm behind. Is there something wrong with me?

A. No. And I want to be careful here, because "no" on its own sounds like something an adult says to end a conversation.

Here is the longer version. Most people in your year are describing a life slightly better than the one they have. That is not lying exactly — it is what people do at seventeen, and quite a lot of them go on doing it at thirty-seven. So the thing you are measuring yourself against is not real, and losing a race against a thing that is not real is not much of a defeat.

There is also no schedule. Nobody is late. You are not behind, because there is nothing to be behind.

Q. I think I might be gay but I'm not sure, and I don't know how you're supposed to be sure.

A. You are not supposed to be sure. That is the honest answer and I would rather give it than a tidy one.

Some people know very early and never revise it. Others work it out slowly, or find that the answer changes shape over a few years. None of those is the correct version, and none of them requires you to announce anything to anybody, on any timetable, ever.

The only practical thing I would say is this: you do not owe anyone an explanation, and that includes people who are being kind. "I'm still working that out" is a complete sentence, and anyone worth telling will accept it.

Q. How do I tell someone I'm not interested without being horrible?

A. You cannot make it not disappointing, so aim for short, clear and kind, in that order. "I'm flattered, but I don't feel the same way" does all three. Do not soften it into something that sounds like "maybe later" unless you mean maybe later — that is what actually turns into being horrible, three weeks from now.`,
    translation: `«СПРОСИ 3B» — страница кабинета здоровья в школьной газете. Вопросы присылают анонимно и печатают как есть.

В. Кажется, у всех в моей параллели опыта больше, чем у меня, и я чувствую, что отстаю. Со мной что-то не так?

О. Нет. И тут я хочу быть аккуратным, потому что «нет» само по себе звучит как то, чем взрослый заканчивает разговор.

Теперь длинная версия. Большинство твоих ровесников описывают жизнь чуть лучше той, которая у них есть. Это не то чтобы враньё — так делают в семнадцать, и немалая часть продолжает в тридцать семь. Значит, то, с чем ты себя сравниваешь, не существует, а проиграть гонку несуществующему — так себе поражение.

И никакого графика тоже нет. Никто не опаздывает. Ты не отстаёшь, потому что отставать не от чего.

В. Кажется, я гей, но я не уверен, и я не знаю, как вообще положено быть уверенным.

О. Никак не положено. Это честный ответ, и я лучше дам его, чем аккуратный.

Кто-то понимает очень рано и больше к этому не возвращается. Кто-то разбирается медленно или обнаруживает, что за несколько лет ответ меняет очертания. Ни один из этих вариантов не является правильным, и ни один не обязывает тебя ничего никому объявлять — ни по какому графику и никогда.

Единственное практическое, что я скажу: ты никому не должен объяснений, включая тех, кто относится к тебе хорошо. «Я пока разбираюсь» — это законченное предложение, и всякий, кому стоит рассказывать, его примет.

В. Как сказать человеку, что он мне не интересен, и не быть при этом сволочью?

О. Сделать так, чтобы это не расстроило, не получится, поэтому цельтесь в короткое, ясное и доброе — именно в таком порядке. «Мне приятно, но я не чувствую того же» делает всё три сразу. И не смягчайте это до чего-то похожего на «может быть, потом», если только вы правда не имеете в виду «может быть, потом»: вот из этого через три недели и вырастает настоящая сволочь.`,
    glossary: [
      { term: 'year (school)', ru: 'параллель, год обучения' },
      { term: 'to be behind', ru: 'отставать' },
      { term: 'to work something out', ru: 'разобраться, понять' },
      { term: 'to revise', ru: 'здесь: пересматривать (мнение)' },
      { term: 'to owe someone', ru: 'быть должным кому-то' },
      { term: 'a complete sentence', ru: 'законченная фраза — можно ничего не добавлять' },
      { term: 'I’m flattered', ru: 'мне приятно, я польщён' },
      { term: 'to soften', ru: 'смягчить' },
    ],
    questions: [
      {
        q: 'Why does the writer add "the longer version" after saying "No"?',
        options: [
          'Because the first answer was wrong',
          'Because a bare "no" sounds like an adult closing the subject',
          'To fill the column',
          'Because the question was unclear',
        ],
        correct: 1,
      },
      {
        q: 'What does it mean that "I\'m still working that out" is a complete sentence?',
        options: [
          'It is grammatically correct',
          'You may stop there — no further explanation is owed',
          'It should be written down',
          'It needs a follow-up',
        ],
        correct: 1,
      },
      {
        q: 'What is the advice about turning someone down?',
        options: [
          'Say nothing and wait',
          'Short, clear and kind — and do not imply "maybe later" unless you mean it',
          'Be as gentle as possible, even if it is vague',
          'Ask a friend to do it',
        ],
        correct: 1,
        why: 'Ключ в последней фразе: расплывчатая доброта сегодня — это жестокость через три недели. Очень английская мысль про вежливость.',
      },
      {
        q: 'Which of these does the column deliberately NOT provide?',
        options: [
          'A timetable for being sure about yourself',
          'A definition of consent',
          'The room number',
          'An anonymous question',
        ],
        correct: 0,
      },
    ],
  },

  // ── Это грех: листовка министерства ────────────────────────────────────────
  //
  // bucket: 'inspired'. Второй регистр той же эпохи: письмо домой у этого
  // произведения уже есть, здесь — то, как о том же говорило государство.
  {
    id: 'sc-sin-2',
    workId: 'its-a-sin',
    lang: 'en', title: 'Листовка министерства здравоохранения', level: 'B2', minutes: 3,
    topic: 'Здоровье', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 2,
    textOrigin: 'ours', origin: 'original',
    setup: 'В сериале рядом живут два языка: домашнее письмо, в котором главного не сказано, и казённая бумага, которой государство разговаривает с людьми, пока само толком ничего не знает. Первое у этого произведения уже есть; ниже второе — наша листовка, вымышленная, но по форме тех лет. Смотреть стоит на осторожные обороты: «there is no evidence that», «it is thought that», «you are advised to».',
    after: 'Обратите внимание на разрыв между тоном и содержанием: набрано крупно, сказано мало, а самая важная строчка — про то, что сведения будут уточняться, — стоит в самом низу. Так выглядит официальное сообщение, у которого нет ответа.',
    body: `DEPARTMENT OF HEALTH — PUBLIC INFORMATION
Leaflet 12. Delivered to every household. Please read it and keep it.

WHAT IS KNOWN
A serious illness is being reported in a number of countries, including this one. It affects the body's ability to defend itself against infection. It is thought to be passed on through blood and through sexual contact. It is not thought to be passed on through ordinary daily contact.

WHAT THIS MEANS IN PRACTICE
There is no evidence that you can catch it from a cup, a handshake, a swimming pool, a lavatory seat or a workplace. There is no reason to avoid anyone at their work, at school or in your street.

WHAT YOU ARE ADVISED TO DO
You are advised to know your partner. You are advised to use a condom. You are advised not to share a needle with anyone, at any time, for any reason.

IF YOU ARE WORRIED
Speak to your doctor. Conversations with your doctor about this are confidential and will not be reported to your employer.

A NOTE ON LANGUAGE
This leaflet does not use the phrase "risk group". Illnesses are carried by what people do, not by what people are, and a leaflet that says otherwise will leave some readers feeling safe when they are not.

Information in this leaflet is correct as at the date of printing and will be revised as more becomes known.`,
    translation: `МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ — ОБЩЕСТВЕННАЯ ИНФОРМАЦИЯ
Листовка № 12. Доставлена в каждый дом. Прочтите и сохраните.

ЧТО ИЗВЕСТНО
В ряде стран, включая нашу, регистрируется серьёзное заболевание. Оно поражает способность организма защищаться от инфекций. Предполагается, что оно передаётся через кровь и при половом контакте. Передача при обычном бытовом общении не предполагается.

ЧТО ЭТО ЗНАЧИТ НА ПРАКТИКЕ
Нет данных о том, что заразиться можно через чашку, рукопожатие, бассейн, сиденье унитаза или на рабочем месте. Нет оснований избегать кого-либо на работе, в школе или на своей улице.

ЧТО ВАМ РЕКОМЕНДУЕТСЯ
Рекомендуется знать своего партнёра. Рекомендуется пользоваться презервативом. Рекомендуется никогда, ни при каких обстоятельствах и ни по какой причине не пользоваться общей иглой.

ЕСЛИ ВЫ ОБЕСПОКОЕНЫ
Обратитесь к своему врачу. Разговоры с врачом на эту тему конфиденциальны и работодателю не сообщаются.

О СЛОВАХ
В этой листовке не употребляется выражение «группа риска». Болезни переносятся тем, что люди делают, а не тем, кем они являются, — и листовка, утверждающая обратное, оставит часть читателей в ложном ощущении безопасности.

Сведения в листовке верны на дату печати и будут уточняться по мере поступления новых данных.`,
    glossary: [
      { term: 'it is thought that', ru: 'предполагается, что' },
      { term: 'to be passed on', ru: 'передаваться' },
      { term: 'there is no evidence that', ru: 'нет данных о том, что' },
      { term: 'you are advised to', ru: 'вам рекомендуется' },
      { term: 'lavatory', ru: 'уборная (брит., официальное)' },
      { term: 'confidential', ru: 'конфиденциальный' },
      { term: 'as at the date of printing', ru: 'на дату печати' },
      { term: 'to be revised', ru: 'будет уточняться' },
    ],
    questions: [
      {
        q: 'What does "there is no evidence that" actually claim?',
        options: [
          'That it is impossible',
          'That nothing has been shown so far — a weaker and more careful statement',
          'That it is likely',
          'That the question was never studied',
        ],
        correct: 1,
        why: '«Нет данных» и «этого не бывает» — разные утверждения. Официальные тексты почти всегда выбирают первое, и читать их надо соответственно.',
      },
      {
        q: 'Why does the leaflet refuse the phrase "risk group"?',
        options: [
          'It is too long',
          'Because it ties risk to who people are, which leaves other readers falsely reassured',
          'It was banned by law',
          'It is unclear in English',
        ],
        correct: 1,
      },
      {
        q: 'What does the last line admit?',
        options: [
          'That the leaflet is complete',
          'That what is written may change as more is learnt',
          'That the leaflet is a draft',
          'That the information is secret',
        ],
        correct: 1,
      },
      {
        q: 'What grammatical form carries almost every instruction here?',
        options: [
          'The imperative: "do this"',
          'The passive: "you are advised to"',
          'Questions',
          'The future tense',
        ],
        correct: 1,
      },
    ],
  },

  // ── Попутчики: карточка, наш текст ─────────────────────────────────────────
  //
  // bucket: 'inspired'. Ведомство, анкета и переписка вымышлены. От сериала —
  // историческая механика пятидесятых: казённый допрос через бумагу и письмо,
  // в котором нельзя написать ничего прямо.
  {
    id: 'sc-ft-1',
    workId: 'fellow-travelers',
    lang: 'en', title: 'Анкета для допуска к работе', level: 'B2', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Вашингтон пятидесятых: чтобы работать в ведомстве, надо заполнить анкету, и часть вопросов в ней задана так, что честный ответ и безопасный ответ — разные ответы. Ниже наша анкета. Английский здесь стоит разбирать по одному приёму: чем расплывчатее слово в вопросе, тем шире то, за что потом можно уволить.',
    after: 'Ключевая формулировка — «conduct which might subject you to pressure». Она не описывает поступок: под неё попадает всё, что кто-нибудь может использовать против вас. Именно из-за таких формулировок анкету и заполняли с ужасом.',
    body: `FORM 84-B — PERSONNEL SECURITY QUESTIONNAIRE
To be completed in the applicant's own hand. Do not leave any item blank. Write "none" where applicable.

SECTION IV — ASSOCIATIONS AND CONDUCT

14. List all organisations of which you are or have been a member, including social clubs, and the dates of membership.

15. Have you at any time resided at an address not listed in Section II? If so, state the address, the dates, and the name of any person residing with you.

16. Do you now, or have you at any time, associated with persons known to you to be of doubtful loyalty or reputation? Answer yes or no. If yes, attach a separate sheet.

17. Has any question been raised, formally or informally, concerning your personal habits or moral conduct?

18. Are you aware of any conduct on your part which might subject you to pressure, influence or blackmail by any person?

19. Is there any matter, not covered by the questions above, which the Department would wish to know and which you have not disclosed?

CERTIFICATION
I certify that the foregoing answers are true and complete. I understand that a false statement, or the omission of a material fact, is grounds for immediate dismissal and may be referred for prosecution.

Signature ______________________  Date ______________

For office use only. An interview will be scheduled. Applicants are reminded that the interview is not an accusation and that no adverse inference is drawn from being called to one.`,
    translation: `ФОРМА 84-B — АНКЕТА КАДРОВОЙ ПРОВЕРКИ
Заполняется собственноручно. Пустых граф не оставлять. Где неприменимо, писать «нет».

РАЗДЕЛ IV — СВЯЗИ И ПОВЕДЕНИЕ

14. Перечислите все организации, членом которых вы состоите или состояли, включая клубы по интересам, с указанием сроков членства.

15. Проживали ли вы когда-либо по адресу, не указанному в разделе II? Если да, укажите адрес, даты и имя лица, проживавшего вместе с вами.

16. Общаетесь ли вы сейчас или общались ли когда-либо с лицами, известными вам как сомнительные по лояльности или репутации? Ответьте «да» или «нет». В случае «да» приложите отдельный лист.

17. Поднимался ли когда-либо — официально или в частном порядке — вопрос о ваших личных привычках или нравственном поведении?

18. Известны ли вам какие-либо ваши поступки, которые могли бы сделать вас предметом давления, влияния или шантажа со стороны любого лица?

19. Существует ли какое-либо обстоятельство, не охваченное вышеприведёнными вопросами, о котором ведомству следовало бы знать и о котором вы не сообщили?

ЗАВЕРЕНИЕ
Подтверждаю, что вышеизложенные ответы правдивы и полны. Мне известно, что ложное заявление или умолчание о существенном факте является основанием для немедленного увольнения и может быть передано для уголовного преследования.

Подпись ______________________ Дата ______________

Для служебного пользования. Будет назначено собеседование. Заявителям напоминают, что собеседование не является обвинением и что сам вызов на него не влечёт никаких неблагоприятных выводов.`,
    glossary: [
      { term: 'in the applicant’s own hand', ru: 'собственноручно' },
      { term: 'where applicable', ru: 'где применимо' },
      { term: 'to reside', ru: 'проживать (офиц.)' },
      { term: 'to associate with', ru: 'общаться, водить знакомство' },
      { term: 'moral conduct', ru: 'нравственное поведение' },
      { term: 'to subject someone to pressure', ru: 'сделать объектом давления' },
      { term: 'to disclose', ru: 'сообщить, раскрыть' },
      { term: 'omission of a material fact', ru: 'умолчание о существенном факте' },
      { term: 'adverse inference', ru: 'неблагоприятный вывод' },
    ],
    questions: [
      {
        q: 'Why is question 15 dangerous rather than routine?',
        options: [
          'It asks for a date',
          'It asks who lived with you, at any address you did not list',
          'It is written in the passive',
          'It repeats question 14',
        ],
        correct: 1,
      },
      {
        q: 'What does question 18 actually cover?',
        options: [
          'Crimes only',
          'Anything at all that someone could use against you',
          'Debts',
          'Political membership',
        ],
        correct: 1,
        why: 'Формулировка описывает не поступок, а его последствие — уязвимость. Поэтому под неё попадает что угодно, и именно так она и задумана.',
      },
      {
        q: 'What is the function of question 19?',
        options: [
          'To be polite',
          'To make silence itself an offence — anything not disclosed becomes an omission',
          'To collect statistics',
          'To end the form neatly',
        ],
        correct: 1,
      },
      {
        q: 'What does the closing note claim?',
        options: [
          'That the interview is a formality and implies nothing against you',
          'That the interview is optional',
          'That the form is confidential',
          'That answers may be corrected later',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'sc-ft-2',
    workId: 'fellow-travelers',
    lang: 'en', title: 'Письмо, в котором нельзя написать прямо', level: 'C1', minutes: 3,
    topic: 'Переписка и созвоны', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 2,
    textOrigin: 'ours', origin: 'original',
    setup: 'Те же годы, но частная переписка — которую, впрочем, тоже могут прочитать. Ниже наше письмо. Оно целиком построено на импликатуре: сказано одно, понимается другое, и опознаётся это по мелочам — по тому, что вместо имени стоит «our friend», что погода занимает три предложения, а главное — половину одного.',
    after: 'Самое сильное место — «я позволил себе не написать того, что хотел написать». Автор сообщает не содержание, а факт цензуры над самим собой, и это единственное, что цензура пропустит.',
    body: `Dear H.,

Thank you for yours of the 14th, which reached me on Tuesday and which I have read more times than is sensible.

Washington is unbearable in August, as you warned me it would be. The office keeps the windows shut because of the noise from the construction on the corner, and by four o'clock the whole floor has the temper of a waiting room. I have taken to walking the long way home, along the water, which adds twenty minutes and is worth every one of them.

Our friend from the department has been transferred. Nobody has said why and nobody will ask. His desk was cleared on the Thursday and by Monday there was a new man at it who does not know that anybody sat there before. I find I mind this more than the transfer itself.

I dined on Sunday with the R.s, who send their regards and who asked after you twice, which I record here so that you know it was noticed.

You asked me a question at the end of your letter. I have started the answer four times. Each time it becomes either less than the truth or more than I can put in an envelope, and there is no third version — I have looked for it. So: I have taken the liberty of not writing what I wanted to write, and I will say it to you in October, in a room, with the door shut, and you may hold me to that.

Until then I am, as always and rather more than that,

Yours,
T.`,
    translation: `Дорогой Х.,

Спасибо за твоё письмо от 14-го, оно дошло во вторник, и я перечитал его больше раз, чем разумно.

В августе Вашингтон невыносим — ты меня предупреждал. В конторе держат окна закрытыми из-за стройки на углу, и к четырём весь этаж по нраву напоминает приёмную. Я взял манеру ходить домой длинной дорогой, вдоль воды: выходит на двадцать минут дольше, и каждая из них того стоит.

Нашего друга из ведомства перевели. Почему — никто не сказал и никто не спросит. Стол его освободили в четверг, а к понедельнику за ним сидел новый человек, который не знает, что там кто-то был. Обнаруживаю, что меня это задевает сильнее самого перевода.

В воскресенье обедал у Р., они передают привет и дважды о тебе спрашивали, — записываю это здесь, чтобы ты знал, что это было замечено.

В конце письма ты задал мне вопрос. Я начинал ответ четыре раза. Каждый раз выходит либо меньше правды, либо больше, чем можно вложить в конверт, и третьего варианта нет — я искал. Поэтому: я позволил себе не написать того, что хотел написать, и скажу это тебе в октябре, в комнате, при закрытой двери, и можешь считать это обещанием.

А до тех пор остаюсь, как всегда и несколько более того,

твой
Т.`,
    glossary: [
      { term: 'yours of the 14th', ru: 'ваше письмо от 14-го (эпистолярная формула)' },
      { term: 'to take to doing something', ru: 'взять привычку что-то делать' },
      { term: 'to ask after someone', ru: 'справляться о ком-то' },
      { term: 'to send one’s regards', ru: 'передавать привет' },
      { term: 'to take the liberty of', ru: 'позволить себе' },
      { term: 'to hold someone to something', ru: 'поймать на слове, считать обещанием' },
      { term: 'I find I mind this', ru: 'обнаруживаю, что меня это задевает' },
    ],
    questions: [
      {
        q: 'What happened to the colleague, as far as the letter says?',
        options: [
          'He was promoted',
          'He was transferred, with no reason given and nobody asking',
          'He retired',
          'He moved abroad',
        ],
        correct: 1,
      },
      {
        q: 'Why does the writer record that the R.s asked after H. twice?',
        options: [
          'To pass on a message',
          'To tell H. that their connection was noticed by others',
          'To describe the dinner',
          'To ask for an invitation',
        ],
        correct: 1,
      },
      {
        q: 'What does "I have taken the liberty of not writing what I wanted to write" communicate?',
        options: [
          'That he has nothing to say',
          'That there is an answer, and that it cannot safely go in a letter',
          'That he lost the letter',
          'That he will not answer at all',
        ],
        correct: 1,
        why: 'Сообщается не содержание, а факт самоцензуры. Это единственное, что можно доверить бумаге, — и адресат прочтёт остальное.',
      },
      {
        q: 'What is unusual about the sign-off "as always and rather more than that"?',
        options: [
          'It is a standard formula',
          'It bends a standard formula just far enough to say something the letter cannot',
          'It is a mistake',
          'It is a quotation',
        ],
        correct: 1,
      },
    ],
  },

  // ── Красный, белый и королевский синий (фильм): карточка, наш текст ────────
  //
  // bucket: 'inspired'. Книга того же названия стоит на полке young adult и
  // связана с этой карточкой через screenPair; сцена о переписке есть там,
  // поэтому здесь — вторая половина той же пары регистров, служебная бумага.
  {
    id: 'sc-rwrb-film-1',
    workId: 'rwrb',
    lang: 'en', title: 'Правки пресс-службы', level: 'B2', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему фильма', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Сюжет начинается с того, что два человека испортили торт на приёме и теперь должны сделать вид, что дружат. Ниже наш документ из такой ситуации: черновик заявления и правки пресс-службы к нему. Читать интересно вдвойне — видно и живую фразу, и то, во что её превращает служебный английский.',
    after: 'Финальная версия вдвое короче черновика и не содержит ни одного глагола в первом лице. Это и есть работа пресс-службы: убрать человека из текста, оставив извинение.',
    body: `DRAFT STATEMENT — WITH COMMS EDITS. NOT FOR RELEASE.

DRAFT AS SUBMITTED
"Look, it was a cake. It was an extremely large cake and it did not survive, and neither of us covered ourselves in glory. I've apologised to him, he's apologised to me, and honestly the only injured party here was the cake. Can we all move on?"

COMMS COMMENTS
— "Look" — remove. Reads as irritation.
— "It was a cake" — do not name the object. Naming it keeps it in tomorrow's headlines.
— "neither of us covered ourselves in glory" — charming, and it concedes fault on behalf of the other party's principal. We cannot concede on their behalf. Remove.
— "I've apologised to him" — good. Keep the apology, lose the reciprocity: "he's apologised to me" invites the question of what he apologised for.
— "the only injured party here was the cake" — this is the line that will be quoted. That is the problem with it.
— "Can we all move on?" — never ask the press a question. They will answer it.

REVISED FOR APPROVAL
"An accident occurred at Saturday's reception. An apology has been offered and accepted, and both offices consider the matter closed. There will be no further comment."

NOTE TO PRINCIPAL
We are aware the revised text does not sound like you. That is deliberate and it is temporary. A statement is not a conversation; its job is to end one.`,
    translation: `ЧЕРНОВИК ЗАЯВЛЕНИЯ — С ПРАВКАМИ ПРЕСС-СЛУЖБЫ. НЕ ДЛЯ ПУБЛИКАЦИИ.

ЧЕРНОВИК В ТОМ ВИДЕ, В КАКОМ ПОДАН
«Слушайте, это был торт. Это был чрезвычайно большой торт, он не уцелел, и никто из нас двоих себя не украсил. Я перед ним извинился, он извинился передо мной, и, честно говоря, единственной пострадавшей стороной здесь был торт. Может, пойдём дальше?»

ЗАМЕЧАНИЯ ПРЕСС-СЛУЖБЫ
— «Слушайте» — убрать. Читается как раздражение.
— «Это был торт» — предмет не называть. Названный, он останется в завтрашних заголовках.
— «никто из нас двоих себя не украсил» — мило и признаёт вину за доверителя другой стороны. Признавать за них мы не вправе. Убрать.
— «Я перед ним извинился» — хорошо. Извинение оставляем, взаимность убираем: «он извинился передо мной» напрашивается на вопрос, за что именно.
— «единственной пострадавшей стороной был торт» — вот эту фразу и процитируют. В этом и беда.
— «Может, пойдём дальше?» — никогда не задавайте прессе вопросов. Она на них отвечает.

ИСПРАВЛЕННЫЙ ВАРИАНТ НА УТВЕРЖДЕНИЕ
«На субботнем приёме произошла случайность. Извинения принесены и приняты, обе стороны считают вопрос закрытым. Дальнейших комментариев не будет».

ПРИМЕЧАНИЕ ДОВЕРИТЕЛЮ
Нам известно, что исправленный текст на вас не похож. Это сделано намеренно и это временно. Заявление — не разговор; его работа в том, чтобы разговор закончить.`,
    glossary: [
      { term: 'comms (communications)', ru: 'пресс-служба' },
      { term: 'not for release', ru: 'не для публикации' },
      { term: 'to cover oneself in glory', ru: 'покрыть себя славой (обычно с отрицанием, иронично)' },
      { term: 'injured party', ru: 'пострадавшая сторона' },
      { term: 'to concede fault', ru: 'признать вину' },
      { term: 'on someone’s behalf', ru: 'от чьего-либо имени' },
      { term: 'principal', ru: 'доверитель — тот, от чьего имени работает служба' },
      { term: 'reciprocity', ru: 'взаимность' },
    ],
    questions: [
      {
        q: 'Why does comms want the object left unnamed?',
        options: [
          'It is a secret',
          'Naming it keeps the story alive in the headlines',
          'Nobody knows what it was',
          'It is legally sensitive',
        ],
        correct: 1,
      },
      {
        q: 'Why is "he\'s apologised to me" removed?',
        options: [
          'It is untrue',
          'It invites the press to ask what the other person apologised for',
          'It is too formal',
          'It is repetitive',
        ],
        correct: 1,
      },
      {
        q: 'What is the objection to the line about the cake being the only injured party?',
        options: [
          'It is not funny',
          'It is the line that will be quoted — and that is exactly what they do not want',
          'It is grammatically wrong',
          'It blames someone',
        ],
        correct: 1,
      },
      {
        q: 'What changes grammatically between the draft and the revised text?',
        options: [
          'Nothing',
          'The first person disappears: actions become passive and ownerless',
          'It moves to the future tense',
          'It becomes a question',
        ],
        correct: 1,
        why: '«An apology has been offered and accepted» — извинение есть, извиняющегося нет. Тот же приём, что в заявлении телеканала: страдательный залог убирает человека.',
      },
    ],
  },

  // ── Поза: карточка, наш текст ──────────────────────────────────────────────
  //
  // bucket: 'inspired'. Дом, бал и правила вымышлены. От сериала — словарь
  // среды: house, category, to walk, to read. Половина этих слов ушла потом в
  // обычный английский, и знать, откуда они, полезно само по себе.
  {
    id: 'sc-pose-1',
    workId: 'pose',
    lang: 'en', title: 'Объявление категорий на балу', level: 'B1', minutes: 3,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Бал вог-культуры устроен как соревнование: ведущий объявляет категорию, участники выходят, судьи ставят баллы. Ниже наш текст ведущего. Слова тут знакомые, а значения свои: to walk — «выйти в категории», to read — «разобрать по косточкам вслух», house — не дом, а команда, которая тебе семья.',
    after: 'Обратите внимание на слово read. В этой среде оно значит «разобрать человека вслух, точно и остроумно», и именно отсюда пошло позднейшее to read someone в обычном английском.',
    body: `Good evening, and welcome to the floor.

House of Ferrer, House of Aurelio, House of Saint-Cyr — you are all in the book, you are all on time, and one of you is about to be disappointed. That is the whole point of the evening.

The rules have not changed and I will say them once. You walk when your category is called and not before. Judges score from one to ten. A chop is a chop; you leave the floor and you do not argue with the table, because the table has been sitting here since eight o'clock and the table is tired.

Categories tonight.

FIRST CATEGORY: EXECUTIVE REALNESS. You are walking into a building on a Monday morning where nobody has ever seen you before, and nobody looks up. If anyone in this room can tell you do not work there, you are not walking realness, you are walking a costume.

SECOND CATEGORY: BEST DRESSED, WHITE AND GOLD. Read the second half of the category. Every season somebody walks this in silver and every season they are chopped for it.

THIRD CATEGORY: FACE. Just face. No hands, no hair, no performance. Look at the judges and let them look back.

GRAND PRIZE: THE TROPHY, AND YOUR HOUSE NAME ON IT UNTIL NEXT SPRING.

And one word before we start. There is reading, and there is being nasty. Reading is when it is true and you found the words first. Nasty is when you could not find the words. This room has always known the difference and tonight will be no exception.

Music. First category. Let's go.`,
    translation: `Добрый вечер, и добро пожаловать на паркет.

Дом Феррер, дом Аурелио, дом Сен-Сир — все записаны, все пришли вовремя, и кто-то из вас сейчас будет разочарован. Ради этого вечер и затевается.

Правила не менялись, скажу их один раз. Выходишь, когда объявили твою категорию, и не раньше. Судьи ставят от одного до десяти. Срез есть срез: уходишь с паркета и со столом не споришь, потому что стол сидит здесь с восьми и стол устал.

Категории на сегодня.

ПЕРВАЯ КАТЕГОРИЯ: ДЕЛОВАЯ ДОСТОВЕРНОСТЬ. Ты входишь в понедельник утром в здание, где тебя никогда не видели, — и никто не поднимает головы. Если хоть кто-то в этом зале поймёт, что ты там не работаешь, это не достоверность, это костюм.

ВТОРАЯ КАТЕГОРИЯ: ЛУЧШИЙ НАРЯД, БЕЛОЕ И ЗОЛОТО. Прочитайте вторую половину названия. Каждый сезон кто-нибудь выходит в серебре и каждый сезон бывает за это срезан.

ТРЕТЬЯ КАТЕГОРИЯ: ЛИЦО. Просто лицо. Никаких рук, никаких волос, никакого представления. Смотри на судей и дай им посмотреть на себя.

ГЛАВНЫЙ ПРИЗ: КУБОК И ИМЯ ВАШЕГО ДОМА НА НЁМ ДО СЛЕДУЮЩЕЙ ВЕСНЫ.

И одно слово перед началом. Есть разбор, а есть гадость. Разбор — это когда правда и когда ты нашёл слова первым. Гадость — это когда слов ты не нашёл. Этот зал всегда знал разницу, и сегодня исключением не станет.

Музыку. Первая категория. Поехали.`,
    glossary: [
      { term: 'the floor', ru: 'паркет — площадка, по которой выходят' },
      { term: 'house', ru: 'дом — команда, она же семья по выбору' },
      { term: 'to walk (a category)', ru: 'выйти, выступить в категории' },
      { term: 'realness', ru: 'достоверность — умение сойти за своего' },
      { term: 'a chop', ru: 'срез: судьи останавливают выступление' },
      { term: 'to read someone', ru: 'разобрать вслух — точно и остроумно' },
      { term: 'nasty', ru: 'гадкий, злой' },
      { term: 'trophy', ru: 'кубок' },
    ],
    questions: [
      {
        q: 'What does "to walk" mean here?',
        options: [
          'To leave the room',
          'To compete in a category',
          'To move slowly',
          'To judge',
        ],
        correct: 1,
      },
      {
        q: 'What is "realness"?',
        options: [
          'Honesty about yourself',
          'Being convincing enough that nobody in the imagined setting would look twice',
          'Wearing real gold',
          'Telling the truth to the judges',
        ],
        correct: 1,
      },
      {
        q: 'What is the difference between "reading" and "being nasty"?',
        options: [
          'Volume',
          'Reading is true and well put; nasty is what you say when you could not find the words',
          'Reading is written, nasty is spoken',
          'There is none',
        ],
        correct: 1,
      },
      {
        q: 'Why does the host mention silver in the second category?',
        options: [
          'Silver is expensive',
          'Because the category says white and gold, and people who ignore that get chopped',
          'Silver is forbidden by law',
          'It is a joke about the trophy',
        ],
        correct: 1,
      },
    ],
  },
  {
    id: 'sc-pose-2',
    workId: 'pose',
    lang: 'en', title: 'Правила дома', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 2, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Дом в этой среде — не команда, а жильё и семья: тех, кого выгнали из родительского дома, забирает к себе «мать дома». Ниже наши правила такого дома. Жанр знакомый — свод правил, как в закрытой школе из «Уэнздей», — но условия в нём совсем другие, и сравнить эти два текста интересно.',
    after: 'Последнее правило — про то, что уйти можно и вернуться тоже. Именно этим свод правил дома отличается от школьного: школа выпускает, а дом остаётся открытым.',
    body: `HOUSE OF AURELIO — HOUSE RULES
Pinned in the kitchen. If you live here, they are yours.

1. You get a key on your second night, not your first. The first night you are a guest and you sleep.

2. Everyone puts in what they can. If what you can is nothing this month, you say so on the first, out loud, to me, and then it is dealt with and not mentioned again. What you do not do is disappear for three weeks because you are short.

3. Nobody here asks you why you left home. If you want to tell it, tell it once, at this table, and then you never have to tell it again. Anyone who makes you repeat it answers to me.

4. School stays. Work stays. This house does not become the reason you stopped doing the thing that gets you out.

5. You do not walk a category you have not practised. It is not the losing, it is that you make the whole house look unprepared, and there are four other houses waiting for exactly that.

6. Doctor's appointments are not optional and nobody goes alone unless they want to. Somebody in this kitchen will always come with you, sit in the waiting room, and say nothing about it afterwards.

7. Argue in the kitchen, never on the floor. Out there we are one house, whatever we were in here at four in the afternoon.

8. You can leave. People do, and it is allowed, and there is no version of leaving that means you cannot come back. Take the key with you.`,
    translation: `ДОМ АУРЕЛИО — ПРАВИЛА ДОМА
Висит на кухне. Живёшь здесь — значит, они твои.

1. Ключ ты получаешь на вторую ночь, а не на первую. В первую ты гость, и ты спишь.

2. Каждый вкладывает сколько может. Если в этом месяце ты можешь нисколько, ты говоришь об этом первого числа, вслух, мне, — и вопрос решается и больше не поднимается. Чего делать нельзя, так это пропадать на три недели, потому что у тебя туго с деньгами.

3. Здесь никто не спрашивает, почему ты ушёл из дома. Захочешь рассказать — расскажи один раз, за этим столом, и больше не придётся никогда. Кто заставит тебя повторять, будет отвечать передо мной.

4. Учёба остаётся. Работа остаётся. Этот дом не становится причиной, по которой ты бросил то, что тебя отсюда вытащит.

5. Не выходишь в категории, которую не отрепетировал. Дело не в проигрыше, а в том, что весь дом выглядит неготовым, — а четыре других дома именно этого и ждут.

6. Приёмы у врача не факультативны, и никто не идёт один, если сам не хочет. Кто-нибудь с этой кухни всегда пойдёт с тобой, посидит в коридоре и потом ничего об этом не скажет.

7. Ссоримся на кухне, никогда на паркете. Там мы один дом — кем бы мы ни были здесь в четыре часа дня.

8. Уйти можно. Люди уходят, это разрешено, и нет такого варианта ухода, после которого нельзя вернуться. Ключ забери с собой.`,
    glossary: [
      { term: 'to put in', ru: 'вкладывать (деньги, силы)' },
      { term: 'to be short', ru: 'быть на мели, не хватать денег' },
      { term: 'to be dealt with', ru: 'быть улаженным' },
      { term: 'to answer to someone', ru: 'отвечать перед кем-то' },
      { term: 'to walk a category', ru: 'выступить в категории' },
      { term: 'appointment', ru: 'приём, назначенная встреча' },
      { term: 'the floor', ru: 'паркет — площадка бала' },
      { term: 'whatever we were', ru: 'кем бы мы ни были' },
    ],
    questions: [
      {
        q: 'What happens if someone cannot contribute money this month?',
        options: [
          'They must leave',
          'They say so openly on the first, it is settled, and it is not raised again',
          'They pay double next month',
          'Nothing is said about it',
        ],
        correct: 1,
      },
      {
        q: 'What does rule 3 protect?',
        options: [
          'The house’s reputation',
          'The right to tell your story once and never be made to repeat it',
          'Privacy from the police',
          'The kitchen',
        ],
        correct: 1,
      },
      {
        q: 'Why must you not walk an unpractised category?',
        options: [
          'You might be injured',
          'Because the whole house looks unprepared, and rival houses are waiting for that',
          'The judges charge a fee',
          'It is against the ball rules',
        ],
        correct: 1,
      },
      {
        q: 'How does the last rule differ from a school rulebook?',
        options: [
          'It is shorter',
          'Leaving is allowed and the door stays open — the house does not "graduate" you',
          'It is stricter',
          'It has no number',
        ],
        correct: 1,
      },
    ],
  },
]
