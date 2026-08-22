// ─────────────────────────────────────────────────────────────────────────────
// Лента: португальский (Бразилия)
//
// Источник — Agência Brasil, государственное информагентство Бразилии, CC BY
// 3.0 BR. Это редкий случай: крупное новостное агентство, которое отдаёт СВОИ
// ТЕКСТЫ под свободной лицензией. Их можно публиковать целиком, переводить и
// разбирать — при указании агентства и автора.
//
// Единственный по-настоящему ЖИВОЙ источник зелёной дорожки на сегодня:
// фид обновляется в течение дня, и материалы ниже датированы днём сборки.
// У NASA лента идёт неровно (то три релиза за день, то ни одного), а
// Викиновости закрыты совсем.
//
// ЧТО РЕЖЕТСЯ. Из фида приезжает не только текст: логотип агентства,
// «Notícias relacionadas», строка редактора и однопиксельные счётчики. Всё это
// снимает buildFeed, но проверить глазами всё равно надо — счётчик, уехавший в
// body, в читалке выглядит как пустой абзац.
// ─────────────────────────────────────────────────────────────────────────────

import type { FeedItem } from './index'

export const PT_FEED: FeedItem[] = [
  {
    id: 'pt-feed-tempo-fim-de-semana',
    outletId: 'agencia-brasil',
    lang: 'pt-BR',
    title: 'Fim de semana terá tempo seco no Centro-Oeste e frio intenso no Sul',
    date: '2026-08-22',
    lane: 'free',
    textOrigin: 'verbatim',
    age: '12+',
    url: 'https://agenciabrasil.ebc.com.br/meio-ambiente/noticia/2026-08/fim-de-semana-tera-tempo-seco-no-centro-oeste-e-frio-intenso-no-sul',
    byline: 'Agência Brasil',
    origin: 'open-corpus',
    credit: 'Agência Brasil · CC BY 3.0 BR',
    level: 'B1',
    minutes: 3,
    topic: 'Погода и природа',
    skill: 'Чтение',
    body: `Neste sábado (22) e domingo (23), a previsão do tempo no país será marcada pelos contrastes térmicos, de acordo com boletim divulgado pelo Instituto Nacional de Metereologia (Inmet).

Enquanto o Centro-Oeste e parte do Norte e Nordeste enfrentarão altas temperaturas e baixa umidade do ar, no Sul e Sudeste o frio aparece e há possibilidade de geadas e nevoeiros. Há ainda a previsão de ventos intensos no litoral norte do Nordeste, no litoral do Rio Grande do Sul e do Espírito Santo.

Em razão da baixa umidade do ar, o Inmet emitiu um aviso laranja , que indica perigo, para sudeste do Amazonas, sul do Pará e centro-sul de Tocantins, onde o índice pode chegar a 12%.

Já no oeste, noroeste e norte do Amazonas e no estado de Roraima, o tempo fica instável e há previsão de chuva e trovoadas.`,
    translation: `В субботу (22-го) и воскресенье (23-го) погода в стране будет отмечена температурными контрастами — так говорится в бюллетене Национального института метеорологии (Inmet).

Пока Центро-Запад и часть Севера и Северо-Востока встретят высокую температуру и низкую влажность воздуха, на Юге и Юго-Востоке приходит холод, возможны заморозки и туманы. Ожидается также сильный ветер на северном побережье Северо-Востока и на побережье штатов Риу-Гранди-ду-Сул и Эспириту-Санту.

Из-за низкой влажности Inmet объявил оранжевый уровень опасности для юго-востока Амазонас, юга Пара и центрально-южной части Токантинса, где влажность может опуститься до 12%.

А на западе, северо-западе и севере Амазонас и в штате Рорайма погода неустойчивая, ожидаются дождь и грозы.`,
    glossary: [
      { term: 'previsão do tempo', ru: 'прогноз погоды' },
      { term: 'boletim', ru: 'бюллетень, сводка' },
      { term: 'divulgado', ru: 'опубликованный, обнародованный' },
      { term: 'umidade', ru: 'влажность' },
      { term: 'geada', ru: 'заморозок, иней' },
      { term: 'nevoeiro', ru: 'туман' },
      { term: 'litoral', ru: 'побережье' },
      { term: 'em razão de', ru: 'из-за, по причине' },
      { term: 'aviso', ru: 'предупреждение' },
      { term: 'perigo', ru: 'опасность' },
      { term: 'instável', ru: 'неустойчивый' },
      { term: 'trovoada', ru: 'гроза' },
    ],
    questions: [
      {
        q: 'Quem divulgou o boletim?',
        options: ['A Agência Brasil', 'O Inmet', 'A TV Brasil', 'O Ministério da Saúde'],
        correct: 1,
      },
      {
        q: 'O que se espera no Sul e no Sudeste?',
        options: [
          'Altas temperaturas e baixa umidade',
          'Frio, com possibilidade de geadas e nevoeiros',
          'Chuva forte e trovoadas',
          'Tempo estável, sem mudanças',
        ],
        correct: 1,
        why: 'Текст построен на контрасте: «Enquanto o Centro-Oeste … no Sul e Sudeste o frio aparece».',
      },
      {
        q: 'Por que o Inmet emitiu um aviso laranja?',
        options: [
          'Por causa dos ventos intensos',
          'Por causa da baixa umidade do ar',
          'Por causa das trovoadas em Roraima',
          'Por causa das geadas no Sul',
        ],
        correct: 1,
      },
      {
        q: 'A que nível a umidade pode chegar nas áreas do aviso laranja?',
        options: ['12%', '22%', '32%', '50%'],
        correct: 0,
      },
    ],
  },

  {
    id: 'pt-feed-focus-danca-china',
    outletId: 'agencia-brasil',
    lang: 'pt-BR',
    title: 'Focus Cia de Dança representa o Brasil em festival na China',
    date: '2026-08-22',
    lane: 'free',
    textOrigin: 'verbatim',
    age: '12+',
    url: 'https://agenciabrasil.ebc.com.br/cultura/noticia/2026-08/focus-cia-de-danca-representa-o-brasil-em-festival-na-china',
    byline: 'Alana Gandra — repórter da Agência Brasil',
    origin: 'open-corpus',
    credit: 'Agência Brasil · CC BY 3.0 BR',
    level: 'B2',
    minutes: 3,
    topic: 'Технологии и медиа',
    skill: 'Чтение',
    body: `O Brasil será representado no Living Dance Festival, na China, pela Focus Cia de Dança, que embarca neste sábado (22) para o país asiático. Cerca de 20 pessoas, entre bailarinos, diretores e técnicos, integram a equipe que pisará em território chinês pela primeira vez, para uma turnê de 13 dias.

A Focus levará para o festival, que reúne companhias de diversos países, o espetáculo Still Reich , inspirado na obra do músico minimalista contemporâneo norte-americano Steve Reich. O espetáculo reúne quatro peças, sendo que as duas primeiras foram criadas pelo coreógrafo e diretor artístico da Focus, Alex Neoral, em 2008 e, as duas últimas, em 2018.

Fazem parte da agenda workshops que o coreógrafo e os bailarinos brasileiros darão na China, para “dividir a linguagem da companhia com vários grupos diferentes", disse Neoral.

O retorno ao Brasil será iniciado no dia 4 de setembro.`,
    translation: `Бразилию на фестивале Living Dance Festival в Китае представит труппа Focus Cia de Dança, которая вылетает в субботу (22-го). Около двадцати человек — танцовщики, руководители и технический персонал — впервые ступят на китайскую землю; тур рассчитан на 13 дней.

На фестиваль, который собирает труппы из разных стран, Focus везёт спектакль Still Reich, вдохновлённый музыкой современного американского минималиста Стива Райха. Спектакль состоит из четырёх частей: первые две поставлены хореографом и художественным руководителем Focus Алексом Неоралом в 2008 году, две последние — в 2018-м.

В программе есть и мастер-классы, которые хореограф и бразильские танцовщики проведут в Китае, чтобы «поделиться языком труппы с самыми разными группами», сказал Неорал.

Возвращение в Бразилию начнётся 4 сентября.`,
    glossary: [
      { term: 'embarcar', ru: 'вылетать, отправляться (садиться на борт)' },
      { term: 'bailarino', ru: 'танцовщик' },
      { term: 'integrar', ru: 'входить в состав' },
      { term: 'pisar', ru: 'ступать, наступать' },
      { term: 'turnê', ru: 'гастроли, тур' },
      { term: 'reunir', ru: 'собирать, объединять' },
      { term: 'espetáculo', ru: 'спектакль' },
      { term: 'obra', ru: 'произведение, творчество' },
      { term: 'peça', ru: 'пьеса; здесь: часть спектакля' },
      { term: 'coreógrafo', ru: 'хореограф' },
      { term: 'agenda', ru: 'программа, расписание' },
      { term: 'retorno', ru: 'возвращение' },
    ],
    questions: [
      {
        q: 'Quantas pessoas viajam com a companhia?',
        options: ['Cerca de 10', 'Cerca de 20', 'Cerca de 40', 'Só os quatro bailarinos'],
        correct: 1,
      },
      {
        q: 'O espetáculo Still Reich é inspirado em quem?',
        options: [
          'No coreógrafo Alex Neoral',
          'Na música de Steve Reich',
          'Na dança contemporânea chinesa',
          'Num filme norte-americano',
        ],
        correct: 1,
      },
      {
        q: 'Quando as peças do espetáculo foram criadas?',
        options: [
          'Todas em 2008',
          'Todas em 2018',
          'Duas em 2008 e duas em 2018',
          'Todas em 2026, para o festival',
        ],
        correct: 2,
        why: '«as duas primeiras … em 2008 e, as duas últimas, em 2018» — спектакль собран из работ разных лет.',
      },
      {
        q: 'Além das apresentações, o que a companhia fará na China?',
        options: [
          'Gravará um filme',
          'Dará workshops',
          'Participará de um concurso',
          'Abrirá uma escola de dança',
        ],
        correct: 1,
      },
    ],
  },

  {
    id: 'pt-feed-brasileirao-feminino',
    outletId: 'agencia-brasil',
    lang: 'pt-BR',
    title: 'Brasileirão Feminino: TV Brasil exibe Flamengo x Atlético-MG',
    date: '2026-08-22',
    lane: 'free',
    textOrigin: 'verbatim',
    age: '12+',
    url: 'https://agenciabrasil.ebc.com.br/esportes/noticia/2026-08/brasileirao-feminino-tv-brasil-exibe-flamengo-x-atletico-mg-17h40',
    byline: 'EBC',
    origin: 'open-corpus',
    credit: 'Agência Brasil · CC BY 3.0 BR',
    level: 'B1',
    minutes: 2,
    topic: 'Время и планы',
    skill: 'Чтение',
    body: `Flamengo e Atlético-MG abrem neste sábado (22) a decisiva 17ª rodada do Campeonato Brasileiro Feminino Série A1, e a TV Brasil exibe todos os detalhes da partida.

A emissora abre sua jornada esportiva a partir das 17h40 com as informações do confronto, que acontece às 18h, no Estádio Luso-Brasileiro, na Ilha do Governador, Rio de Janeiro.

Já o clube mineiro chega ao duelo sem chances de classificação: a equipe está em 13º lugar, com 16 pontos.

As exibições fazem parte da estratégia da TV Brasil , a tela do futebol feminino, para ampliar a visibilidade da modalidade no país. Pelo terceiro ano consecutivo, o canal público exibe os jogos da elite feminina.`,
    translation: `«Фламенго» и «Атлетико Минейро» открывают в субботу (22-го) решающий 17-й тур женского чемпионата Бразилии в серии A1, и TV Brasil покажет матч во всех подробностях.

Спортивный эфир канала начинается в 17:40 — с информации о встрече, которая состоится в 18:00 на стадионе «Лузо-Бразилейро» на острове Говернадор в Рио-де-Жанейро.

Клуб из Минас-Жерайса подходит к матчу без шансов на выход дальше: команда идёт 13-й с 16 очками.

Показы — часть стратегии TV Brasil, «экрана женского футбола», по расширению видимости этого спорта в стране. Третий год подряд государственный канал показывает игры женской элиты.`,
    glossary: [
      { term: 'rodada', ru: 'тур (в чемпионате)' },
      { term: 'decisivo', ru: 'решающий' },
      { term: 'exibir', ru: 'показывать, транслировать' },
      { term: 'partida', ru: 'матч' },
      { term: 'emissora', ru: 'телеканал, вещатель' },
      { term: 'jornada', ru: 'здесь: эфирный блок; обычно — день, путь' },
      { term: 'confronto', ru: 'встреча, противостояние' },
      { term: 'classificação', ru: 'выход в следующий этап; турнирная таблица' },
      { term: 'equipe', ru: 'команда' },
      { term: 'ampliar', ru: 'расширять' },
      { term: 'consecutivo', ru: 'подряд идущий' },
    ],
    questions: [
      {
        q: 'A que horas começa a partida?',
        options: ['Às 17h40', 'Às 18h', 'Às 19h', 'Às 20h'],
        correct: 1,
        why: 'В 17:40 начинается ЭФИР («a jornada esportiva»), сам матч — в 18:00. Разница между двумя временами и есть проверка.',
      },
      {
        q: 'Onde acontece o jogo?',
        options: [
          'No Maracanã',
          'No Estádio Luso-Brasileiro, no Rio de Janeiro',
          'Em Belo Horizonte',
          'Em São Paulo',
        ],
        correct: 1,
      },
      {
        q: 'Qual é a situação do Atlético-MG?',
        options: [
          'Está em primeiro lugar',
          'Precisa vencer para se classificar',
          'Chega sem chances de classificação',
          'Já está classificado',
        ],
        correct: 2,
      },
      {
        q: 'Há quantos anos a TV Brasil exibe a elite do futebol feminino?',
        options: ['É o primeiro ano', 'Pelo segundo ano', 'Pelo terceiro ano', 'Há dez anos'],
        correct: 2,
      },
    ],
  },
]
