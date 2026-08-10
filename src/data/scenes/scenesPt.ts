// ─────────────────────────────────────────────────────────────────────────────
// Сцены на португальском (бразильский вариант)
//
// ПОДЛИННЫЙ ТЕКСТ — Machado de Assis (ум. 1908), Project Gutenberg. Издание
// 1899 года, орфография дореформенная: theatro, visinhos, accordando, elle,
// mettesse. Это не опечатки и не наша небрежность — так печатали до реформ
// 1911 и 1943 годов.
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
          'Vendeu um jornal',
          'Recitou versos dele',
          'Pediu dinheiro',
          'Dormiu o tempo todo',
        ],
        correct: 1,
      },
      {
        q: 'Por que o rapaz guardou os versos no bolso?',
        options: [
          'Porque chegou à estação',
          'Porque o narrador fechou os olhos várias vezes',
          'Porque começou a chover',
          'Porque perdeu o papel',
        ],
        correct: 1,
        why: '«Fechei os olhos tres ou quatro vezes; tanto bastou para que elle interrompesse a leitura». Оскорбление нанесено не словом, а зевотой — с этого начинается весь роман.',
      },
      {
        q: 'O que significa "Casmurro" aqui, segundo o narrador?',
        options: [
          'O que está no dicionário',
          'Homem calado e fechado em si mesmo',
          'Homem rico',
          'Homem velho',
        ],
        correct: 1,
        why: '«Não consultes diccionarios» — рассказчик прямо запрещает проверять по словарю и даёт народное значение.',
      },
      {
        q: 'Por que "Dom" foi acrescentado ao apelido?',
        options: [
          'Porque ele é nobre de verdade',
          'Por ironia, para lhe atribuir ares de fidalgo',
          'Porque é o nome do pai',
          'Porque mora numa casa grande',
        ],
        correct: 1,
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
          'Ela não responde à pergunta e muda a formulação',
          'Ela diz que já viu tudo',
        ],
        correct: 2,
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
          'Não ir ao rio',
          'Ir ao rio antes do pôr do sol',
          'Ir de manhã cedo',
          'Levar alguém junto',
        ],
        correct: 1,
      },
    ],
  },
]
