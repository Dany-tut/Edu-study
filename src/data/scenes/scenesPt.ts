// ─────────────────────────────────────────────────────────────────────────────
// Сцены на португальском (бразильский вариант)
//
// ПОДЛИННЫЙ ТЕКСТ — Machado de Assis (ум. 1908), Project Gutenberg. Издания
// 1881, 1891 и 1899 годов, орфография дореформенная: theatro, visinhos,
// accordando, elle, mettesse, methodo, chinellas. Это не опечатки и не наша
// небрежность — так печатали до реформ 1911 и 1943 годов.
//
// Текст оставлен как есть, но у произведения заполнен `source.caveat`, и
// предупреждение показывается ДО чтения. Иначе ученик спокойно заучит elle
// вместо ele — а это ровно та ошибка, которую потом годами выбивают.
//
// Курсив Gutenberg (_слово_) снят: это разметка файла, а не текст автора.
// ─────────────────────────────────────────────────────────────────────────────

import type { Scene } from './index'

export const PT_SCENES: Scene[] = [
  // ── Machado de Assis, «Dom Casmurro» ───────────────────────────────────────
  {
    id: 'sc-casmurro-1',
    workId: 'machado-casmurro',
    lang: 'pt-BR', title: 'Откуда взялось прозвище', level: 'B2', minutes: 4,
    topic: 'Знакомство', skill: 'Чтение',
    order: 1, where: 'Capítulo I — Do titulo', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Machado de Assis, Dom Casmurro (1899) · Project Gutenberg',
    setup: 'Первая глава романа целиком. Рассказчик объясняет, откуда взялось прозвище, вынесенное в заглавие, — и заодно, сам того не говоря, объясняет, что он за человек. Машаду начинает книгу с пустяка в пригородном поезде: это его обычный приём.',
    after: 'Дальше рассказчик признается, что затеял книгу, чтобы «связать два конца жизни» — и с этого начнётся история Бентиньо и Капиту, о которой до последней страницы неизвестно, что в ней правда.',
    body: `Uma noite destas, vindo da cidade para o Engenho Novo, encontrei no trem da Central um rapaz aqui do bairro, que eu conheço de vista e de chapéo. Comprimentou-me, sentou-se ao pé de mim, falou da lua e dos ministros, e acabou recitando-me versos. A viagem era curta, e os versos póde ser que não fossem inteiramente maus. Succedeu, porém, que como eu estava cançado, fechei os olhos tres ou quatro vezes; tanto bastou para que elle interrompesse a leitura e mettesse os versos no bolso.

—Continue, disse eu accordando.

—Já acabei, murmurou elle.

—São muito bonitos.

Vi-lhe fazer um gesto para tiral-os outra vez do bolso, mas não passou do gesto; estava amuado. No dia seguinte entrou a dizer de mim nomes feios, e acabou alcunhando-me Dom Casmurro. Os visinhos, que não gostam dos meus habitos reclusos e calados, deram curso á alcunha, que afinal pegou. Nem por isso me zanguei.

Não consultes diccionarios. Casmurro não está aqui no sentido que elles lhe dão, mas no que lhe poz o vulgo de homem calado e mettido comsigo. Dom veiu por ironia, para attribuir-me fumos de fidalgo. Tudo por estar cochilando!`,
    translation: `Как-то на днях, возвращаясь из города в Энженью-Нову, я встретил в поезде Центральной дороги молодого человека из нашего квартала, которого знаю в лицо и по шляпе. Он поздоровался, сел рядом, поговорил о луне и о министрах и кончил тем, что стал читать мне свои стихи. Дорога была короткая, и стихи, может быть, были не совсем плохи. Случилось, однако, что я устал и раза три-четыре закрыл глаза; этого хватило, чтобы он прервал чтение и сунул стихи в карман.

— Продолжайте, — сказал я, очнувшись.

— Я уже закончил, — пробормотал он.

— Они очень хороши.

Я видел, как он сделал движение, чтобы снова вынуть их из кармана, но дальше движения дело не пошло: он обиделся. На следующий день он принялся обзывать меня и в конце концов прозвал Дон Касмурро. Соседи, которым не по нраву мои замкнутые и молчаливые привычки, пустили прозвище в ход, и оно в конце концов пристало. Я на это не рассердился.

Не заглядывай в словари. Casmurro стоит здесь не в том значении, какое они дают, а в том, какое вложил в него простой народ: молчаливый человек, ушедший в себя. Dom прибавлено в насмешку, чтобы приписать мне дворянскую спесь. И всё это — оттого, что я задремал!`,
    glossary: [
      { term: 'de vista', ru: 'в лицо (знать кого-то в лицо)' },
      { term: 'ao pé de mim', ru: 'рядом со мной' },
      { term: 'bastar', ru: 'быть достаточным, хватить' },
      { term: 'amuado', ru: 'надувшийся, обиженный' },
      { term: 'alcunha', ru: 'прозвище, кличка' },
      { term: 'pegar (uma alcunha)', ru: 'о прозвище: пристать, прижиться' },
      { term: 'zangar-se', ru: 'рассердиться' },
      { term: 'o vulgo', ru: 'простой народ, простонародье' },
      { term: 'cochilar', ru: 'дремать, клевать носом' },
    ],
    questions: [
      {
        q: 'O que o rapaz fez no trem?',
        options: [
          'Recitou versos dele',
          'Vendeu um jornal',
          'Pediu dinheiro',
          'Dormiu o tempo todo',
        ],
        correct: 0,
      },
      {
        q: 'Por que o rapaz guardou os versos no bolso?',
        options: [
          'Porque chegou à estação',
          'Porque começou a chover',
          'Porque perdeu o papel',
          'Porque o narrador fechou os olhos várias vezes',
        ],
        correct: 3,
        why: '«Fechei os olhos tres ou quatro vezes; tanto bastou para que elle interrompesse a leitura». Оскорбление нанесено не словом, а зевотой — с этого начинается весь роман.',
      },
      {
        q: 'O que significa "Casmurro" aqui, segundo o narrador?',
        options: [
          'Homem calado e fechado em si mesmo',
          'O que está no dicionário',
          'Homem rico',
          'Homem velho',
        ],
        correct: 0,
        why: '«Não consultes diccionarios» — рассказчик прямо запрещает проверять по словарю и даёт народное значение.',
      },
      {
        q: 'Por que "Dom" foi acrescentado ao apelido?',
        options: [
          'Porque ele é nobre de verdade',
          'Porque é o nome do pai',
          'Porque mora numa casa grande',
          'Por ironia, para lhe atribuir ares de fidalgo',
        ],
        correct: 3,
      },
    ],
  },

  // ── Cidade Invisível: карточка, наш текст ──────────────────────────────────
  {
    id: 'sc-invisivel-1',
    workId: 'cidade-invisivel',
    lang: 'pt-BR', title: 'Разговор на рынке', level: 'B1', minutes: 3,
    topic: 'Разговорный бразильский', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: '«Невидимый город» построен на бразильском фольклоре: герои расспрашивают людей о существах, в которых те вроде бы не верят. Ниже наш диалог в том же жанре. Он написан ради разговорного бразильского: a gente вместо nós, gerúndio на каждом шагу, и всё, чем в Бразилии смягчают отказ.',
    body: `— Bom dia, senhora. A gente tá procurando uma pessoa. Será que a senhora pode ajudar?
— Depende. Procurando por quê?
— Ele apareceu aqui na feira semana passada. Alto, cabelo comprido, falava meio estranho.
— Ah, esse. Todo mundo viu, ninguém fala.
— Por que ninguém fala?
— Porque aqui a gente aprende cedo: tem coisa que quanto menos você fala, melhor.
— A senhora acredita nessas histórias?
— Eu não disse que acredito. Eu disse que ninguém fala. É diferente.
— Justo. E onde ele tava indo?
— Pro lado do rio. Sempre pro lado do rio.
— Obrigado, viu?
— Olha… se você for lá, vai antes do sol cair. Não é conselho, é só uma coisa que a gente fala por aqui.`,
    translation: `— Доброе утро, сеньора. Мы тут ищем одного человека. Не поможете?
— Смотря кого. А зачем ищете?
— Он появился здесь на рынке на прошлой неделе. Высокий, длинные волосы, говорил как-то странно.
— А, этот. Все видели, никто не говорит.
— Почему никто не говорит?
— Потому что здесь рано выучиваешь: есть вещи, о которых чем меньше говоришь, тем лучше.
— А вы верите в эти истории?
— Я не сказала, что верю. Я сказала, что никто не говорит. Это разные вещи.
— Справедливо. И куда он направлялся?
— К реке. Всегда к реке.
— Спасибо большое.
— Слушайте… если пойдёте туда, идите до заката. Это не совет, просто так у нас говорят.`,
    glossary: [
      { term: 'a gente', ru: 'мы (разговорное; глагол в 3-м лице ед. ч.)' },
      { term: 'tá', ru: 'разговорное сокращение от está' },
      { term: 'será que…', ru: 'смягчает вопрос: «а не могли бы…», «интересно, …»' },
      { term: 'meio estranho', ru: 'как-то странно (meio здесь — «немного»)' },
      { term: 'quanto menos… melhor', ru: 'чем меньше…, тем лучше' },
      { term: 'justo', ru: 'справедливо, резонно' },
      { term: 'pro = para o', ru: 'разговорное слияние предлога с артиклем' },
      { term: 'viu?', ru: 'в конце фразы — «ага?», смягчает и завершает' },
    ],
    questions: [
      {
        q: 'O que a mulher diz sobre as pessoas da feira?',
        options: [
          'Ninguém viu o homem',
          'Todo mundo viu, mas ninguém fala',
          'Todos falam disso o tempo todo',
          'Ela mesma nunca esteve na feira',
        ],
        correct: 1,
      },
      {
        q: 'Ela acredita nas histórias?',
        options: [
          'Ela diz claramente que sim',
          'Ela diz claramente que não',
          'Ela diz que já viu tudo',
          'Ela não responde à pergunta e muda a formulação',
        ],
        correct: 3,
        why: '«Eu não disse que acredito. Eu disse que ninguém fala. É diferente.» Она подменяет вопрос — и это самый живой момент диалога.',
      },
      {
        q: 'Na frase "a gente tá procurando", quem está procurando?',
        options: ['uma pessoa só', 'nós', 'a senhora', 'ninguém'],
        correct: 1,
        why: 'A gente = nós, но глагол стоит в 3-м лице единственного числа: a gente está, не a gente estamos. В Бразилии эта форма в речи почти вытеснила nós.',
      },
      {
        q: 'Qual é o último conselho dela?',
        options: [
          'Ir ao rio antes do pôr do sol',
          'Não ir ao rio',
          'Ir de manhã cedo',
          'Levar alguém junto',
        ],
        correct: 0,
      },
    ],
  },

  // ── Machado de Assis, «Memórias Póstumas de Brás Cubas» ────────────────────
  {
    id: 'sc-bras-1',
    workId: 'machado-bras-cubas',
    lang: 'pt-BR', title: 'Покойный автор, а не автор покойный', level: 'B2', minutes: 5,
    topic: 'Знакомство', skill: 'Чтение',
    order: 1, where: 'Capítulo I — Obito do autor', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Machado de Assis, Memórias Póstumas de Brás Cubas (1881) · Project Gutenberg',
    setup: 'Первая глава романа. Рассказчик объясняет, почему начинает книгу не с рождения, а со смерти, — и тут же эту смерть описывает: дата, возраст, состояние, одиннадцать человек за гробом. Заодно он показывает, как будет вести себя дальше: перебивать сам себя и считать всё, включая скорбь.',
    after: 'Дальше он назовёт причину смерти — «великую и полезную идею», из-за которой всё и вышло, — и только потом отступит к своему рождению. Незнакомка у постели тоже получит имя, но не скоро.',
    body: `Algum tempo hesitei se devia abrir estas memorias pelo principio ou pelo fim, isto é, se poria em primeiro logar o meu nascimento ou a minha morte. Supposto o uso vulgar seja começar pelo nascimento, duas considerações me levaram a adoptar differente methodo: a primeira é que eu não sou propriamente um autor defunto, mas um defunto autor, para quem a campa foi outro berço; a segunda é que o escripto ficaria assim mais galante e mais novo. Moysés, que tambem contou a sua morte, não a poz no introito, mas no cabo: differença radical entre este livro e o Pentateuco.

Dito isto, expirei ás duas horas da tarde de uma sexta feira do mez de agosto de 1869, na minha bella chacara de Catumby. Tinha uns sessenta e quatro annos, rijos e prosperos, era solteiro, possuia cerca de tresentos contos e fui acompanhado ao cemiterio por onze amigos. Onze amigos! Verdade é que não houve cartas nem annuncios.`,
    translation: `Некоторое время я колебался, начать ли эти записки с начала или с конца, то есть поставить ли впереди своё рождение или свою смерть. Хотя обычай велит начинать с рождения, два соображения склонили меня к иному способу: во-первых, я не столько покойный автор, сколько автор покойный, для которого могила стала вторыми пелёнками; во-вторых, написанное выйдет так изящнее и новее. Моисей, который тоже рассказал о своей смерти, поместил её не во вступлении, а в конце — коренное различие между этой книгой и Пятикнижием.

Сказав это, сообщаю: я испустил дух в два часа пополудни, в пятницу августа 1869 года, на своей прекрасной усадьбе в Катумби. Мне было около шестидесяти четырёх лет, крепких и благополучных, я был холост, владел без малого тремястами конто и был провожён на кладбище одиннадцатью друзьями. Одиннадцатью друзьями! Правда, ни писем, ни объявлений в газетах не было.`,
    glossary: [
      { term: 'hesitar', ru: 'колебаться, сомневаться' },
      { term: 'defunto', ru: 'покойный, усопший' },
      { term: 'a campa', ru: 'могила, могильная плита' },
      { term: 'o berço', ru: 'колыбель' },
      { term: 'galante', ru: 'здесь: изящный, щегольской' },
      { term: 'no cabo', ru: 'в конце (устар., ср. совр. no fim)' },
      { term: 'expirar', ru: 'испустить дух, скончаться' },
      { term: 'a chácara', ru: 'загородный дом с участком, усадьба' },
      { term: 'o conto', ru: 'конто — тысяча милрейсов, крупная сумма того времени' },
    ],
    questions: [
      {
        q: 'Por que o narrador começa pela morte?',
        options: [
          'Porque não lembra do nascimento',
          'Porque a família pediu',
          'Porque é um defunto autor e acha o texto mais novo assim',
          'Porque morreu criança',
        ],
        correct: 2,
      },
      {
        q: 'Quantos amigos acompanharam o enterro?',
        options: ['Três', 'Sessenta e quatro', 'Nenhum', 'Onze'],
        correct: 3,
        why: 'Одиннадцать — и рассказчик повторяет это число с восклицательным знаком: он до сих пор считает, много это или мало.',
      },
      {
        q: 'Qual era o estado civil dele?',
        options: ['Casado', 'Solteiro', 'Viúvo', 'Divorciado'],
        correct: 1,
      },
      {
        q: 'Qual é a diferença entre «autor defunto» e «defunto autor»?',
        options: [
          'Não há diferença',
          'A ordem muda quem escreve: um autor que morreu × um morto que escreve',
          'É um erro de impressão',
          'Uma forma é do português europeu',
        ],
        correct: 1,
        why: 'В португальском прилагательное перед существительным и после него значат разное. Вся книга держится на этой перестановке: пишет не человек, который умер, а мертвец.',
      },
    ],
  },

  // ── Machado de Assis, «Quincas Borba» ──────────────────────────────────────
  {
    id: 'sc-quincas-1',
    workId: 'machado-quincas',
    lang: 'pt-BR', title: 'Год назад — учитель, теперь — капиталист', level: 'B2', minutes: 4,
    topic: 'Покупки и деньги', skill: 'Чтение',
    order: 1, where: 'Capítulo I', size: 'flash', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Machado de Assis, Quincas Borba (1891) · Project Gutenberg',
    setup: 'Восемь утра, Ботафого, окно большого дома. Рубиан — вчерашний учитель из провинции, которому достались деньги сумасшедшего философа Кинкаса Борбы. Он смотрит на залив и первый раз в жизни думает о себе как о человеке с собственностью.',
    after: 'Следующая глава покажет то же самое мгновение с другой стороны: пока ум стыдится собственной мысли, сердце спокойно радуется. С этого расхождения и начнётся вся история Рубиана.',
    body: `Rubião fitava a enseada,--eram oito horas da manhã. Quem o visse, com os polegares mettidos no cordão do chambre, á janella de uma grande casa de Botafogo, cuidaria que elle admirava aquelle pedaço de agua quieta; mas, em verdade, vos digo que pensava em outra cousa. Cotejava o passado com o presente. Que era, ha um anno? Professor. Que é agora? Capitalista. Olha para si, para as chinellas (umas chinellas de Tunis, que lhe deu recente amigo, Christiano Palha), para a casa, para o jardim, para a enseada, para os morros e para o ceu; e tudo, desde as chinellas até o ceu, tudo entra na mesma sensação de propriedade.

--Vejam como Deus escreve direito por linhas tortas, pensa elle. Se a mana Piedade tem casado com o Quincas Borba, apenas me daria uma esperança collateral. Não casou; ambos morreram, e aqui está tudo commigo; de modo que o que parecia uma desgraça...`,
    translation: `Рубиан глядел на залив — было восемь часов утра. Тот, кто увидел бы его у окна большого дома в Ботафого, с большими пальцами, заложенными за шнур халата, решил бы, что он любуется этим куском тихой воды; но, говорю вам по правде, думал он о другом. Он сличал прошлое с настоящим. Кем он был год назад? Учителем. Кто он теперь? Капиталист. Он смотрит на себя, на туфли (тунисские туфли, подарок нового друга, Кристиану Пальи), на дом, на сад, на залив, на холмы и на небо — и всё, от туфель до неба, входит в одно и то же чувство собственности.

«Вот и смотрите, как Бог пишет прямо кривыми строками, — думает он. — Выйди сестрица Пиедаде за Кинкаса Борбу, мне досталась бы всего лишь надежда сбоку. Не вышла; оба умерли, и вот всё это у меня, — так что то, что казалось несчастьем…»`,
    glossary: [
      { term: 'fitar', ru: 'пристально смотреть, вперить взгляд' },
      { term: 'a enseada', ru: 'бухта, залив' },
      { term: 'o chambre', ru: 'домашний халат' },
      { term: 'cuidar (que)', ru: 'здесь: полагать, думать (устар.)' },
      { term: 'cotejar', ru: 'сличать, сопоставлять' },
      { term: 'as chinelas', ru: 'домашние туфли, шлёпанцы' },
      { term: 'a propriedade', ru: 'собственность, владение' },
      { term: 'a mana', ru: 'сестрица (ласкательное от irmã)' },
      { term: 'a desgraça', ru: 'несчастье, беда' },
    ],
    questions: [
      {
        q: 'O que Rubião era há um ano?',
        options: ['Capitalista', 'Médico', 'Professor', 'Canoeiro'],
        correct: 2,
      },
      {
        q: 'Ele está realmente admirando a água?',
        options: [
          'Sim, é o que o narrador diz',
          'Está dormindo',
          'Não, pensa em outra coisa',
          'Está procurando alguém',
        ],
        correct: 2,
        why: '«mas, em verdade, vos digo que pensava em outra cousa» — рассказчик нарочно поправляет воображаемого наблюдателя. Машаду постоянно ловит героя на разнице между видом и мыслью.',
      },
      {
        q: 'O que entra na «mesma sensação de propriedade»?',
        options: [
          'Tudo, das chinelas até o céu',
          'Só a casa',
          'Só as chinelas',
          'Nada, ele não tem nada',
        ],
        correct: 0,
      },
      {
        q: 'Como Rubião ficou rico?',
        options: [
          'Trabalhando como professor',
          'Vendendo a casa de Botafogo',
          'Herdando de Quincas Borba, que morreu',
          'Casando com a irmã',
        ],
        correct: 2,
      },
    ],
  },
]
