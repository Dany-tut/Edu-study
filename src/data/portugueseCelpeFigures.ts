// ─────────────────────────────────────────────────────────────────────────────
// Схемы конспектов курса бразильского португальского
//
// ЗАЧЕМ. Аудит: 17 юнитов из 22 без схемы. Половина трудностей здесь —
// различения внутри пары (ser/estar, pretérito perfeito/imperfeito, você/tu),
// а вторая половина — фонетика, которая на слух не раскладывается, пока её
// не увидишь таблицей.
//
// ПРО ВАРИАНТ ЯЗЫКА. Всюду бразильская норма: a gente вместо nós, местоимение
// перед глаголом, gerúndio вместо европейского «estar a + инфинитив».
// ─────────────────────────────────────────────────────────────────────────────

import { formTable, formulaStrip, contrastPair, timelineFigure, ladderFigure } from './lessonFigures'
import type { CourseFigures } from './languageCourse'

export const PORTUGUESE_FIGURES_EXTRA: CourseFigures = {
  'ptbr-02': [{
    after: 2,
    caption: 'Чем обозначается носовой',
    src: formTable('Два способа записи носового', ['Запись', 'Пример', 'Как звучит'], [
      ['тильда: ã, õ', 'pão, mãe, coração', 'гласный в нос, без согласной'],
      ['m в конце слога', 'bom, sim, tem', 'm не произносится отдельно'],
      ['n перед согласной', 'onde, ponte, canto', 'n не произносится отдельно'],
    ], { note: 'В pão и bom одинаковый носовой звук, записанный по-разному. Произносить m как русское «м» — самая заметная ошибка', highlight: [1] }),
  }],

  'ptbr-03': [{
    after: 2,
    caption: 'Открытый и закрытый: разные слова',
    src: formTable('Одна буква — два звука', ['Закрытый', 'Значение', 'Открытый', 'Значение'], [
      ['avô', 'дедушка', 'avó', 'бабушка'],
      ['este', 'этот', 'é', 'есть (ser)'],
      ['sede (сэ)', 'штаб-квартира', 'sede (сэ откр.)', 'жажда'],
      ['pôde', 'смог', 'pode', 'может'],
    ], { note: 'Знак ^ закрывает гласный, знак ´ открывает. Это не ударение — ударение в этих парах и так на одном месте', highlight: [0] }),
  }],

  'ptbr-05': [{
    after: 2,
    caption: 'Первый диалог по шагам',
    src: formulaStrip('Знакомство', [
      { text: 'Oi, tudo bem?', note: 'привет, как дела' },
      { text: 'Meu nome é…', note: 'меня зовут', key: true },
      { text: 'Prazer!', note: 'приятно познакомиться' },
      { text: 'Até logo!', note: 'до скорого' },
    ], { note: 'Tudo bem? — и вопрос, и ответ на него: «Tudo bem?» — «Tudo bem!» Это нормальный полный обмен репликами' }),
  }],

  'ptbr-06': [{
    after: 3,
    caption: 'Род и множественное число',
    src: formTable('Артикли и окончания', ['', 'Ед. число', 'Мн. число'], [
      ['мужской', 'o livro', 'os livros'],
      ['женский', 'a casa', 'as casas'],
      ['на -ão', 'o pão', 'os pães'],
      ['на -l', 'o hotel', 'os hotéis'],
    ], { note: 'Прилагательное согласуется со всем: as casas brancas — три раза женский род множественного числа в одной фразе', highlight: [2] }),
  }],

  'ptbr-08': [{
    after: 2,
    caption: 'Три неправильных, без которых не обойтись',
    src: formTable('ter, ir, fazer', ['', 'ter', 'ir', 'fazer'], [
      ['eu', 'tenho', 'vou', 'faço'],
      ['você / ele', 'tem', 'vai', 'faz'],
      ['a gente', 'tem', 'vai', 'faz'],
      ['vocês / eles', 'têm', 'vão', 'fazem'],
    ], { note: 'ter — это и «иметь», и возраст: tenho 30 anos, а не «sou 30». fazer — ещё и погода: faz frio', highlight: [2] }),
  }],

  'ptbr-09': [{
    after: 2,
    caption: 'Шесть вопросительных слов',
    src: formTable('Вопросы', ['Слово', 'Значение', 'Пример'], [
      ['quem', 'кто', 'Quem é ele?'],
      ['o que', 'что', 'O que você faz?'],
      ['onde', 'где', 'Onde você mora?'],
      ['quando', 'когда', 'Quando você chega?'],
      ['por que', 'почему', 'Por que você foi?'],
      ['como', 'как', 'Como você está?'],
    ], { note: 'В вопросе por que пишется раздельно, в ответе porque — слитно. На письме это ошибка, которую замечают все' }),
  }],

  'ptbr-11': [{
    after: 2,
    caption: 'Семья и описание',
    src: contrastPair('Постоянное и временное про людей', {
      head: 'ser + характер',
      sub: 'какой человек вообще',
      items: ['Ele é calmo — он спокойный человек', 'Ela é bonita', 'Meu pai é engenheiro'],
    }, {
      head: 'estar + состояние',
      sub: 'какой сейчас',
      items: ['Ele está calmo — сейчас спокоен', 'Ela está bonita hoje', 'Estou cansado'],
    }, { note: 'Ele é nervoso — нервный по характеру. Ele está nervoso — сейчас волнуется. Разница слышна носителю сразу' }),
  }],

  'ptbr-12': [{
    after: 2,
    caption: 'В магазине',
    src: formulaStrip('Четыре реплики', [
      { text: 'Quanto custa?', note: 'сколько стоит' },
      { text: 'Tem outro tamanho?', note: 'есть другой размер', key: true },
      { text: 'Posso pagar com cartão?', note: 'можно картой' },
      { text: 'Só isso, obrigado', note: 'это всё' },
    ], { note: 'obrigado говорит мужчина, obrigada — женщина. Согласуется с тем, кто благодарит, а не с тем, кого' }),
  }],

  'ptbr-13': [{
    after: 2,
    caption: 'В ресторане: вежливое прошедшее',
    src: contrastPair('Как просят в Бразилии', {
      head: 'Eu quero',
      sub: 'звучит требовательно',
      items: ['грамматически верно', 'но в ресторане режет слух', 'уместно с близкими'],
    }, {
      head: 'Eu queria',
      sub: 'вежливая норма',
      items: ['Eu queria um café', 'форма imperfeito вместо настоящего', 'то же, что русское «я бы хотел»'],
    }, { note: 'Приём общий для романских языков: прошедшее время отодвигает просьбу и тем смягчает её' }),
  }],

  'ptbr-14': [{
    after: 2,
    caption: 'Направления',
    src: formulaStrip('Объяснить дорогу', [
      { text: 'Siga reto', note: 'идите прямо' },
      { text: 'Vire à direita', note: 'поверните направо', key: true },
      { text: 'na esquina', note: 'на углу' },
      { text: 'fica ao lado do banco', note: 'находится рядом с банком' },
    ], { note: 'ficar здесь значит «находиться» — для местоположения он используется чаще, чем estar' }),
  }],

  'ptbr-15': [{
    after: 2,
    caption: 'Прямо сейчас: бразильский вариант',
    src: contrastPair('Две нормы одного языка', {
      head: 'Бразилия',
      sub: 'estar + gerúndio',
      items: ['Estou trabalhando', 'Ela está comendo', 'окончания -ando, -endo, -indo'],
    }, {
      head: 'Португалия',
      sub: 'estar a + инфинитив',
      items: ['Estou a trabalhar', 'Ela está a comer', 'в Бразилии так не говорят'],
    }, { note: 'На CELPE-Bras ждут бразильскую норму. Европейская конструкция не ошибка, но выдаёт учебник не той страны' }),
  }],

  'ptbr-16': [{
    after: 2,
    caption: 'Кто как обращается',
    src: ladderFigure('Обращение в Бразилии', [
      { label: 'a gente', sub: 'мы — но глагол в 3-м лице: a gente vai', key: true },
      { label: 'você', sub: 'ты и вы: рабочая форма почти везде' },
      { label: 'tu', sub: 'юг и северо-восток, часто с формой você' },
      { label: 'o senhor / a senhora', sub: 'подчёркнутая вежливость' },
    ], { note: 'a gente — не сленг, а разговорная норма. Но пишется с глаголом в единственном числе: a gente vai, никогда a gente vamos' }),
  }],

  'ptbr-18': [{
    after: 2,
    caption: 'Событие и фон',
    src: timelineFigure('Два прошедших времени', [
      { label: 'Imperfeito', sub: 'фон: eu morava no interior' },
      { label: 'Perfeito', sub: 'событие: um dia eu mudei', key: true },
      { label: 'Imperfeito', sub: 'новый фон: agora eu morava na cidade' },
    ], { note: 'Imperfeito — привычка и обстановка, perfeito — то, что случилось один раз. Одна история почти всегда требует обоих' }),
  }],

  'ptbr-19': [{
    after: 2,
    caption: 'Ближайшее будущее',
    src: formulaStrip('ir + инфинитив', [
      { text: 'Eu vou', note: 'спрягается только ir' },
      { text: 'viajar', note: 'второй глагол в инфинитиве', key: true },
      { text: 'no sábado', note: 'когда' },
    ], { note: 'Простое будущее (viajarei) в разговоре почти не используют: оно живёт в текстах и официальных объявлениях' }),
  }],

  'ptbr-20': [{
    after: 2,
    caption: 'Где стоит местоимение',
    src: contrastPair('Порядок в возвратных глаголах', {
      head: 'Бразилия',
      sub: 'местоимение перед глаголом',
      items: ['Eu me levanto às sete', 'Ela se chama Ana', 'Me diga uma coisa'],
    }, {
      head: 'Португалия',
      sub: 'местоимение после глагола',
      items: ['Levanto-me às sete', 'Chama-se Ana', 'книжная норма и в Бразилии'],
    }, { note: 'Начинать бразильскую фразу с me — норма устной речи, хотя формальная грамматика этого не одобряет' }),
  }],

  'ptbr-21': [{
    after: 2,
    caption: 'Что запускает subjuntivo',
    src: formTable('Триггеры сослагательного', ['Триггер', 'Пример', 'Что выражает'], [
      ['Espero que…', 'Espero que esteja bem', 'надежда'],
      ['Talvez…', 'Talvez ele venha', 'сомнение'],
      ['É importante que…', 'É importante que você fale', 'необходимость'],
      ['Quando… (о будущем)', 'Quando eu chegar', 'ещё не случилось'],
    ], { note: 'Subjuntivo включается не смыслом, а конструкцией: увидели que после этих слов — ставьте сослагательное', highlight: [0] }),
  }],

  'ptbr-22': [{
    after: 2,
    caption: 'Как устроен CELPE-Bras',
    src: formTable('Экзамен', ['Часть', 'Что делаете', 'Время'], [
      ['Parte escrita', '4 задания-жанра по видео, аудио и тексту', '3 часа'],
      ['Parte oral', 'беседа по элементам-стимулам', '20 мин'],
    ], { note: 'Уровня «не сдал» здесь нет: по итогам присваивают один из четырёх уровней — Intermediário, Intermediário Superior, Avançado, Avançado Superior' }),
  }, {
    after: 4,
    caption: 'Что оценивают в задании-жанре',
    src: ladderFigure('Критерии письменной части', [
      { label: 'Языковая правильность', sub: 'важна, но не главная' },
      { label: 'Жанр', sub: 'письмо, статья, отчёт — со всеми признаками' },
      { label: 'Адресат', sub: 'тот, кто указан в задании, а не абстрактный читатель', key: true },
      { label: 'Задача', sub: 'убедить, попросить, объяснить — то, что требовалось' },
    ], { note: 'Грамотный текст не в том жанре и не тому адресату оценивается ниже, чем текст с ошибками, но выполняющий задачу' }),
  }],
}
