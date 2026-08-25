// ─────────────────────────────────────────────────────────────────────────────
// Бразильский португальский A1 → A2 (фундамент под CELPE-Bras)
//
// От нуля до уровня, на котором человек живёт бытовой жизнью на португальском:
// знакомится, покупает, заказывает, ездит, рассказывает о прошлом и планах.
//
// ЧЕСТНО ПРО ЭКЗАМЕН
// CELPE-Bras не сертифицирует начальные уровни: минимальный присваиваемый
// уровень — Intermediário, дальше Intermediário Superior, Avançado, Avançado
// Superior. Сдавать его после этого курса рано. Курс строит фундамент и с
// первого юнита приучает к логике экзамена: любое продуктивное задание — это
// задача с жанром, адресатом и целью, а не «сочинение на тему». Юнит 22
// разбирает формат целиком, чтобы ученик заранее понимал, куда идёт.
//
// МЕТОДИЧЕСКАЯ ОСНОВА
// 1. Бразильский вариант, а не европейский, — и это выдерживается в каждом
//    юните: estou fazendo (не estou a fazer), você как основное «ты», a gente
//    вместо nós, проклиза «me ajuda». Смешение вариантов — самая частая
//    проблема курсов, собранных из разных источников.
// 2. Фонетика первыми тремя юнитами. Носовые (pão, mãe, coração) и
//    противопоставление открытых/закрытых гласных (avô ≠ avó) в русском не
//    существуют вовсе, а различают слова. Без них речь остаётся непонятной,
//    сколько бы слов человек ни выучил.
// 3. ser / estar (юнит 4) — центральное различие, которого нет в русском, где
//    глагол-связка просто опускается. Даётся сразу и потом тренируется во всех
//    последующих юнитах.
// 4. Прошедшие времена разведены по функциям: perfeito — событие (юнит 17),
//    imperfeito — фон и привычка (юнит 18). Смешение этих двух — то, по чему
//    иностранца слышно на любом уровне.
//
// ПРО АУДИО
// Задания заполнены текстом для синтеза. Важно: синтез должен быть бразильским
// (pt-BR). Европейский голос читает безударные гласные иначе и произносит «de»
// как [də], а не [dʒi], — на минимальных парах это делает задание ошибочным.
//
// ЮРИДИЧЕСКОЕ
// Все примеры написаны с нуля. Материалы прошлых CELPE-Bras (INEP) при
// расширении курса использовать только как открытые публикации INEP со ссылкой.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildLanguageCourse, courseSummary, allVocab, unitByShortId, moduleOfUnit,
  one, many, fill, wb, order, pairsOf, grid, write, say, readAloud,
  dictation, dictationBank, minPair, describeImage, drill, nestTasks,
} from './languageCourse'
import { art } from './artworks'
import { streetMapImage } from './seedImages'
import { PORTUGUESE_THEORY, PORTUGUESE_VIDEO } from './portugueseCelpeTheory'
import { PORTUGUESE_EXTRA } from './portugueseCelpeExtra'
import { charGrid, formTable, contrastPair, clockRow } from './lessonFigures'
import type { LangModule, LangUnit, LanguageCourseSpec, VocabItem, CourseFigures } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'
import { PORTUGUESE_FIGURES_EXTRA } from './portugueseCelpeFigures'
import { PORTUGUESE_VIDEO_EXTRA } from './languageVideos'
import { PTBR_HOMEWORK_VIDEO } from './homeworkVideos'
import { PTBR_DIALOGS } from './languageDialogs'

export const PORTUGUESE_MODULES: LangModule[] = [
  { title: 'Звучание и первые фразы', subtitle: 'Носовые, открытые гласные, ser/estar', units: [1, 2, 3, 4, 5] },
  { title: 'Люди и повседневность', subtitle: 'Род, множественное, настоящее время, вопросы', units: [6, 7, 8, 9, 10, 11] },
  { title: 'Жизнь в Бразилии', subtitle: 'Магазин, еда, город, «прямо сейчас», обращения', units: [12, 13, 14, 15, 16] },
  { title: 'Прошлое и планы', subtitle: 'Perfeito, imperfeito, будущее, местоимения', units: [17, 18, 19, 20] },
  { title: 'Связная речь и жанры', subtitle: 'Связки, subjuntivo, формат CELPE-Bras', units: [21, 22] },
]

export const PORTUGUESE_UNITS: LangUnit[] = [
  // ═══ Модуль 1. Звучание и первые фразы ═══
  {
    n: 1, shortId: 'ptbr-01',
    title: 'Как читается португальский',
    goal: 'Читать вслух незнакомое слово и не ошибаться в основных сочетаниях',
    grammar: 'Чтение ch, lh, nh, ss, ç, qu, gu, x; ударение и знаки á, â, ã, ê, ó, õ',
    grammarWhy: 'Португальская орфография регулярна: прочитав правила один раз, ученик читает любое слово. Это выгодно вложенное время — дальше словарь набирается через чтение, а не через прослушивание.',
    vocabTheme: 'Первые слова и буквосочетания',
    artifact: 'Прочитанный вслух список из 20 слов',
    vocab: [
      { term: 'chave', reading: 'шáви', ru: 'ключ' },
      { term: 'filho', reading: 'фи́лью', ru: 'сын' },
      { term: 'banho', reading: 'ба́нью', ru: 'купание, душ' },
      { term: 'passar', reading: 'пасáр', ru: 'проходить, проводить' },
      { term: 'começar', reading: 'комесáр', ru: 'начинать' },
      { term: 'aqui', reading: 'аки́', ru: 'здесь' },
      { term: 'guerra', reading: 'гэ́ха', ru: 'война' },
      { term: 'deixar', reading: 'дэйшáр', ru: 'оставлять, позволять' },
      { term: 'cidade', reading: 'сидáджи', ru: 'город' },
      { term: 'trabalho', reading: 'трабáлью', ru: 'работа' },
    ],
    tasks: [
      one('Как читается lh в filho?', ['как «л»', 'как «ль» — мягкое л', 'как «лх»', 'не читается'], 1),
      one('Как читается nh в banho?', ['как «н»', 'как «нь»', 'как «нх»', 'как «м»'], 1),
      one('Как читается ch в chave?', ['«ч»', '«ш»', '«к»', '«х»'], 1),
      one('Что даёт ç в começar?', ['звук «к»', 'звук «с»', 'звук «ц»', 'ничего, декоративный знак'], 1),
      pairsOf('Соедините слово и чтение.', [
        ['filho', 'фи́лью'],
        ['banho', 'ба́нью'],
        ['chave', 'шáви'],
        ['cidade', 'сидáджи'],
      ]),
      dictation('Напечатайте услышанное слово.', 'trabalho'),
      readAloud('Прочитайте вслух: chave, filho, banho, passar, começar, aqui, cidade, trabalho.',
        'chave, filho, banho, passar, começar, aqui, cidade, trabalho', 40),
    ],
  },
  {
    n: 2, shortId: 'ptbr-02',
    title: 'Носовые гласные: pão, mãe, coração',
    goal: 'Произносить и слышать носовые — без них не понимают',
    grammar: 'Носовые ã, õ, ão, ãe, õe; носовые перед m/n (bem, sim, com)',
    grammarWhy: 'Носовых гласных в русском нет, и русскоязычный автоматически заменяет их обычными: pão превращается в «пау», não — в «нау». Это не акцент, а потеря слова: mão (рука) и mau (плохой) перестают различаться.',
    vocabTheme: 'Слова с носовыми',
    artifact: '10 носовых пар, различённых на слух',
    vocab: [
      { term: 'pão', reading: 'пãу', ru: 'хлеб' },
      { term: 'mão', reading: 'мãу', ru: 'рука' },
      { term: 'mãe', reading: 'мãй', ru: 'мама' },
      { term: 'irmão', reading: 'ирмãу', ru: 'брат' },
      { term: 'coração', reading: 'корасãу', ru: 'сердце' },
      { term: 'não', reading: 'нãу', ru: 'нет, не' },
      { term: 'bem', reading: 'бэ̃й', ru: 'хорошо' },
      { term: 'sim', reading: 'си̃', ru: 'да' },
      { term: 'com', reading: 'кõ', ru: 'с' },
      { term: 'então', reading: 'энтãу', ru: 'тогда, итак' },
    ],
    tasks: [
      one('Чем ão отличается от au?', [
        'Ничем',
        'ão произносится в нос, au — обычный дифтонг',
        'ão всегда под ударением, au — нет',
        'ão читается как «он»',
      ], 1),
      minPair('Какое слово прозвучало?', 'mão', 'mau', 'A'),
      minPair('Какое слово прозвучало?', 'pão', 'pau', 'A'),
      minPair('Какое слово прозвучало?', 'não', 'nau', 'A'),
      pairsOf('Соедините слово и перевод.', [
        ['pão', 'хлеб'],
        ['mão', 'рука'],
        ['mãe', 'мама'],
        ['coração', 'сердце'],
      ]),
      // Гнездо mão·mãe·mau·mal — те же носовые, но на одном скелете и вместе с
      // неносовыми соседями: mal на слух совпадает с mau, и различает их только
      // роль в предложении. Возврат по расписанию — в тренажёре (soundNests.ts).
      ...nestTasks('pt-mao', 1),
      fill('Впишите пропущенное слово: Eu ___ falo português ainda. (не)', 'não'),
      dictation('Напечатайте услышанное слово.', 'irmão'),
      readAloud('Прочитайте вслух, держа носовое звучание: pão, mão, mãe, irmão, coração, não, bem, sim.',
        'pão, mão, mãe, irmão, coração, não, bem, sim', 45),
    ],
  },
  {
    n: 3, shortId: 'ptbr-03',
    title: 'Открытые и закрытые гласные: avô ≠ avó',
    goal: 'Различать é/ê и ó/ô — они меняют смысл слова',
    grammar: 'Открытые é, ó против закрытых ê, ô; раскатистое r в carro против одноударного в caro; r в начале слова как «х»',
    grammarWhy: 'avô (дедушка) и avó (бабушка) различаются только степенью открытости гласной. В русском такого противопоставления нет, поэтому ученик по умолчанию говорит одно слово вместо двух. То же с r: caro (дорогой) и carro (машина).',
    vocabTheme: 'Пары, различающиеся одним звуком',
    artifact: '10 минимальных пар, различённых на слух',
    vocab: [
      { term: 'avô', reading: 'аво́ (закрытое о)', ru: 'дедушка' },
      { term: 'avó', reading: 'аво́ (открытое о)', ru: 'бабушка' },
      { term: 'caro', reading: 'кáру', ru: 'дорогой' },
      { term: 'carro', reading: 'кáхху', ru: 'машина' },
      { term: 'rato', reading: 'хáту', ru: 'мышь' },
      { term: 'sonho', reading: 'со́нью', ru: 'мечта, сон' },
      { term: 'sono', reading: 'со́ну', ru: 'сонливость' },
      { term: 'vela', reading: 'вэ́ла', ru: 'свеча' },
      { term: 'velha', reading: 'вэ́лья', ru: 'старая' },
      { term: 'perto', reading: 'пэ́рту', ru: 'близко' },
    ],
    tasks: [
      one('Чем различаются avô и avó?', [
        'Ударением',
        'Степенью открытости гласной: ô закрытое, ó открытое',
        'Носовым звучанием',
        'Ничем, это варианты написания',
      ], 1),
      one('Как читается r в начале слова rato в бразильском варианте?', ['как русское «р»', 'как «х»', 'как «л»', 'не читается'], 1),
      minPair('Какое слово прозвучало?', 'caro', 'carro', 'B'),
      minPair('Какое слово прозвучало?', 'sonho', 'sono', 'A'),
      minPair('Какое слово прозвучало?', 'vela', 'velha', 'B'),
      pairsOf('Соедините слово и перевод.', [
        ['avô', 'дедушка'],
        ['avó', 'бабушка'],
        ['caro', 'дорогой'],
        ['carro', 'машина'],
      ]),
      // Два гнезда на две оси юнита: одиночное r против rr и мягкие nh/lh
      // против обычных n/l. Ноль пар не описка: пары caro–carro, sonho–sono и
      // vela–velha уже написаны выше руками, и генератор выдал бы их второй
      // раз подряд. Берём только сцепку со значением — она добавляет то, чего
      // в юните нет: rato и cara рядом с caro/carro. Различение всего ряда на
      // слух остаётся за тренажёром, где вариантов сразу четыре.
      ...nestTasks('pt-caro', 0),
      ...nestTasks('pt-sonho', 0),
      dictation('Напечатайте услышанное слово.', 'carro'),
      readAloud('Прочитайте вслух парами: avô–avó, caro–carro, sonho–sono, vela–velha.',
        'avô, avó, caro, carro, sonho, sono, vela, velha', 45),
    ],
  },
  {
    n: 4, shortId: 'ptbr-04',
    title: 'Знакомство: ser и estar',
    goal: 'Представиться и рассказать о своём состоянии',
    grammar: 'ser (постоянное: имя, профессия, национальность) против estar (состояние, местонахождение); спряжение обоих',
    grammarWhy: 'В русском связка отсутствует («я студент»), поэтому выбирать между двумя её вариантами непривычно и делается наугад. Правило простое — «какой я вообще» против «какой я сейчас», — и его надо усвоить в первом же диалоге.',
    vocabTheme: 'Знакомство и состояния',
    artifact: 'Устное представление на 30 секунд',
    pattern: drill(
      'ser / estar',
      'постоянное свойство против состояния',
      [
        ['я — врач (профессия)', 'Eu sou médico', 'Я врач.'],
        ['я — бразилец', 'Eu sou brasileiro', 'Я бразилец.'],
        ['я устал (сейчас)', 'Eu estou cansado', 'Я устал.'],
        ['я дома (сейчас)', 'Eu estou em casa', 'Я дома.'],
        ['она красивая (свойство)', 'Ela é bonita', 'Она красивая.'],
      ],
      'ser — то, что определяет предмет, estar — то, что с ним сейчас. Ela é bonita и Ela está bonita — разные утверждения.',
    ),
    vocab: [
      { term: 'oi / olá', reading: 'ой / олá', ru: 'привет' },
      { term: 'tudo bem?', reading: 'ту́ду бэ̃й', ru: 'как дела?' },
      { term: 'eu sou', reading: 'эу со́у', ru: 'я есть (ser)' },
      { term: 'eu estou', reading: 'эу эсто́у', ru: 'я нахожусь / мне (estar)' },
      { term: 'estudante', reading: 'эстудáнти', ru: 'студент, ученик' },
      { term: 'professor', reading: 'професо́р', ru: 'преподаватель' },
      { term: 'russo', reading: 'ху́су', ru: 'русский' },
      { term: 'cansado', reading: 'кансáду', ru: 'усталый' },
      { term: 'feliz', reading: 'фели́с', ru: 'счастливый' },
      { term: 'prazer', reading: 'празе́р', ru: 'приятно познакомиться' },
    ],
    tasks: [
      one('Выберите верное: «Я русский».', ['Eu estou russo.', 'Eu sou russo.', 'Eu tenho russo.', 'Eu é russo.'], 1),
      one('Выберите верное: «Я устал».', ['Eu sou cansado.', 'Eu estou cansado.', 'Eu tenho cansado.', 'Eu estar cansado.'], 1),
      one('Выберите верное: «Она в Бразилии».', ['Ela é no Brasil.', 'Ela está no Brasil.', 'Ela tem no Brasil.', 'Ela sou no Brasil.'], 1),
      grid('Заполните таблицу спряжения.',
        ['местоимение', 'ser', 'estar'],
        [
          ['eu', 'sou', 'estou'],
          ['você / ele / ela', 'é', 'está'],
          ['nós', 'somos', 'estamos'],
          ['vocês / eles', 'são', 'estão'],
        ],
        { '0,2': true, '1,1': true, '2,2': true, '3,1': true }),
      fill('Дополните: Eu ___ estudante. (ser)', 'sou'),
      fill('Дополните: Nós ___ em casa. (estar)', 'estamos'),
      wb('Eu sou russo e moro em Moscou.', 'Соберите предложение «Я русский и живу в Москве».', ['estou', 'tenho']),
      say('Представьтесь: приветствие, имя, откуда вы, чем занимаетесь, как себя чувствуете сегодня.', 45),
    ],
  },
  {
    n: 5, shortId: 'ptbr-05',
    title: 'Вежливость и первый диалог',
    goal: 'Поздороваться, попросить, извиниться, попрощаться',
    grammar: 'Формулы вежливости; por favor / obrigado(a) с согласованием по говорящему; вопрос интонацией без инверсии',
    grammarWhy: 'obrigado/obrigada согласуется с тем, кто говорит, а не с тем, кому говорят, — ошибка, которую делают почти все. Вопрос в португальском не требует перестройки: это позволяет спрашивать с первого дня.',
    vocabTheme: 'Вежливые формулы',
    artifact: 'Диалог знакомства на 8 реплик',
    vocab: [
      { term: 'bom dia', reading: 'бõ джи́а', ru: 'доброе утро' },
      { term: 'boa tarde', reading: 'бо́а тáрджи', ru: 'добрый день' },
      { term: 'boa noite', reading: 'бо́а но́йчи', ru: 'добрый вечер, доброй ночи' },
      { term: 'por favor', reading: 'пор фаво́р', ru: 'пожалуйста (просьба)' },
      { term: 'obrigado / obrigada', reading: 'обригáду / обригáда', ru: 'спасибо (говорит мужчина / женщина)' },
      { term: 'de nada', reading: 'джи нáда', ru: 'не за что' },
      { term: 'desculpa', reading: 'джиску́лпа', ru: 'извини' },
      { term: 'com licença', reading: 'кõ лисе́нса', ru: 'разрешите, позвольте' },
      { term: 'até logo', reading: 'ате́ ло́гу', ru: 'до скорого' },
      { term: 'tchau', reading: 'чáу', ru: 'пока' },
    ],
    tasks: [
      one('Женщина благодарит. Как она скажет?', ['Obrigado.', 'Obrigada.', 'Obrigades.', 'Obrigando.'], 1),
      one('От чего зависит форма obrigado/obrigada?', [
        'От пола того, кому говорят',
        'От пола говорящего',
        'От времени суток',
        'От степени вежливости',
      ], 1),
      one('Как спросить «Ты говоришь по-английски?»', [
        'Falas você inglês?',
        'Você fala inglês?',
        'Fala inglês você é?',
        'Inglês você fala não?',
      ], 1),
      pairsOf('Соедините формулу и ситуацию.', [
        ['com licença', 'пройти мимо, привлечь внимание'],
        ['desculpa', 'извиниться за ошибку'],
        ['por favor', 'попросить'],
        ['de nada', 'ответить на благодарность'],
      ]),
      order('Расставьте реплики диалога знакомства по порядку.', [
        'Oi, bom dia!',
        'Bom dia! Tudo bem?',
        'Tudo bem, obrigada. E você?',
        'Tudo ótimo. Como você se chama?',
        'Eu me chamo Ana. E você?',
        'Eu sou o Pedro. Prazer!',
      ]),
      dictation('Напечатайте услышанную фразу.', 'Muito obrigada, até logo.'),
      say('Разыграйте знакомство: поздоровайтесь, спросите как дела, представьтесь, попрощайтесь.', 45),
    ],
  },

  // ═══ Модуль 2. Люди и повседневность ═══
  {
    n: 6, shortId: 'ptbr-06',
    title: 'Род, артикли, множественное число',
    goal: 'Правильно называть предметы с артиклем',
    grammar: 'o/a, os/as, um/uma; род по окончанию (-o мужской, -a женский) и исключения; множественное на -s, -es, -ões',
    grammarWhy: 'Артикль в португальском обязателен там, где в русском ничего нет, а род слова часто не совпадает с русским (a cidade — женский, о городе). Ошибка в артикле слышна в каждой фразе, поэтому род учится сразу вместе со словом.',
    vocabTheme: 'Предметы и места',
    artifact: 'Список 20 слов с правильными артиклями',
    pattern: drill(
      'артикль + существительное',
      'род и число',
      [
        ['livro (м., ед.)', 'o livro', 'книга'],
        ['casa (ж., ед.)', 'a casa', 'дом'],
        ['livro (м., мн.)', 'os livros', 'книги'],
        ['casa (ж., мн.)', 'as casas', 'дома'],
        ['coração (мн.)', 'os corações', 'сердца'],
      ],
      'Последняя строка — ловушка: слова на -ão дают во множественном -ões, а не -ãos.',
    ),
    vocab: [
      { term: 'o livro', reading: 'у ли́вру', ru: 'книга' },
      { term: 'a mesa', reading: 'а ме́за', ru: 'стол' },
      { term: 'a cidade', reading: 'а сидáджи', ru: 'город (женский род!)' },
      { term: 'o problema', reading: 'у проблэ́ма', ru: 'проблема (мужской род!)' },
      { term: 'a casa', reading: 'а кáза', ru: 'дом' },
      { term: 'o carro', reading: 'у кáхху', ru: 'машина' },
      { term: 'a rua', reading: 'а ху́а', ru: 'улица' },
      { term: 'o dinheiro', reading: 'у джинье́йру', ru: 'деньги' },
      { term: 'as pessoas', reading: 'ас песо́ас', ru: 'люди' },
      { term: 'os pães', reading: 'ус пãйс', ru: 'хлеб (мн. ч.)' },
    ],
    tasks: [
      one('Какой артикль у cidade?', ['o', 'a', 'os', 'um'], 1),
      one('Какой артикль у problema?', ['a', 'o', 'as', 'uma'], 1),
      one('Множественное число от pão:', ['pãos', 'pães', 'pãos e', 'pãoes'], 1),
      fill('Впишите артикль: ___ livro está na mesa.', 'o'),
      fill('Впишите артикль: ___ rua é muito grande.', 'a'),
      fill('Поставьте во множественное число: a casa → ___ casas', 'as'),
      // Все четыре исходных варианта и правда расходятся по роду с русским, но
      // множественный выбор, где верны все, учит отмечать всё подряд. Добавлены
      // два слова, где род СОВПАДАЕТ (água — вода, telefone — телефон), и
      // расставлены вперемешку: иначе верные шли бы подряд первыми.
      many('У каких слов род не совпадает с интуицией русскоязычного?', [
        'a cidade (город)',
        'o problema (проблема)',
        'a água (вода)',
        'o livro (книга)',
        'a mesa (стол)',
        'o telefone (телефон)',
      ], [0, 1, 3, 4]),
      write('Выпишите 20 слов урока с артиклями и переводом. Для каждого отметьте, совпадает ли род с русским.'),
    ],
  },
  {
    n: 7, shortId: 'ptbr-07',
    title: 'Настоящее время: -ar, -er, -ir',
    goal: 'Говорить о своих действиях',
    grammar: 'Три спряжения: falar, comer, partir; личные окончания; порядок SVO',
    grammarWhy: 'Три регулярных спряжения покрывают большинство глаголов языка. Личные окончания в португальском информативны, поэтому местоимение часто опускается, — но на A1 его лучше сохранять, пока формы не автоматизировались.',
    vocabTheme: 'Повседневные глаголы',
    artifact: 'Таблица трёх спряжений, заполненная по памяти',
    pattern: drill(
      'три спряжения в presente',
      'falar / comer / partir',
      [
        ['falar — eu', 'eu falo', 'я говорю'],
        ['falar — você', 'você fala', 'вы говорите'],
        ['comer — eu', 'eu como', 'я ем'],
        ['comer — nós', 'nós comemos', 'мы едим'],
        ['partir — eles', 'eles partem', 'они уезжают'],
      ],
      'Окончание задаёт группа глагола: -ar, -er, -ir. Разница между comemos и partimos видна только в этой гласной.',
    ),
    vocab: [
      { term: 'falar', reading: 'фалáр', ru: 'говорить' },
      { term: 'morar', reading: 'морáр', ru: 'жить, проживать' },
      { term: 'trabalhar', reading: 'трабальáр', ru: 'работать' },
      { term: 'estudar', reading: 'эстудáр', ru: 'учиться' },
      { term: 'comer', reading: 'коме́р', ru: 'есть' },
      { term: 'beber', reading: 'бебе́р', ru: 'пить' },
      { term: 'aprender', reading: 'апренде́р', ru: 'учить, осваивать' },
      { term: 'partir', reading: 'партчи́р', ru: 'уезжать' },
      { term: 'abrir', reading: 'абри́р', ru: 'открывать' },
      { term: 'assistir', reading: 'асисти́р', ru: 'смотреть (кино, сериал)' },
    ],
    tasks: [
      one('Eu ___ português. (falar)', ['fala', 'falo', 'falamos', 'falar'], 1),
      one('Nós ___ em Moscou. (morar)', ['moro', 'mora', 'moramos', 'moram'], 2),
      one('Você ___ café? (beber)', ['bebo', 'bebe', 'bebemos', 'bebem'], 1),
      grid('Заполните таблицу спряжений.',
        ['местоимение', 'falar', 'comer', 'partir'],
        [
          ['eu', 'falo', 'como', 'parto'],
          ['você/ele/ela', 'fala', 'come', 'parte'],
          ['nós', 'falamos', 'comemos', 'partimos'],
          ['vocês/eles', 'falam', 'comem', 'partem'],
        ],
        { '0,2': true, '1,1': true, '2,3': true, '3,1': true }),
      fill('Дополните: Eu ___ português todos os dias. (estudar)', 'estudo'),
      fill('Дополните: Eles ___ na universidade. (trabalhar)', 'trabalham'),
      wb('Eu estudo português todos os dias.', 'Соберите предложение «Я учу португальский каждый день».', ['estuda', 'com']),
      write('Напишите 10 предложений о своём обычном дне, используя все три спряжения.'),
    ],
  },
  {
    n: 8, shortId: 'ptbr-08',
    title: 'ter, ir, fazer: три главных неправильных',
    goal: 'Говорить о том, что есть, куда идёшь и что делаешь',
    grammar: 'ter (tenho/tem/temos/têm), ir (vou/vai/vamos/vão), fazer (faço/faz/fazemos/fazem); ter que + инфинитив',
    grammarWhy: 'Эти три глагола входят в самые частые в языке и все три неправильные. Их формы надо знать наизусть — правило здесь не поможет. Заодно ter que даёт первый способ сказать «мне надо».',
    vocabTheme: 'Обладание и перемещение',
    artifact: '10 предложений с ter, ir, fazer',
    pattern: drill(
      'ter / ir / fazer',
      'три главных неправильных',
      [
        ['ter — eu', 'eu tenho', 'у меня есть'],
        ['ter — eles', 'eles têm', 'у них есть'],
        ['ir — eu', 'eu vou', 'я иду'],
        ['fazer — eu', 'eu faço', 'я делаю'],
        ['надо работать', 'eu tenho que trabalhar', 'мне надо работать'],
      ],
      'tem и têm различаются только знаком, но это единственное и множественное число. На письме это ошибка уровня «его» и «их».',
    ),
    vocab: [
      { term: 'ter', reading: 'тер', ru: 'иметь' },
      { term: 'ir', reading: 'ир', ru: 'идти, ехать' },
      { term: 'fazer', reading: 'фазе́р', ru: 'делать' },
      { term: 'ter que', reading: 'тер ки', ru: 'быть должным' },
      { term: 'tempo', reading: 'те́мпу', ru: 'время; погода' },
      { term: 'vontade', reading: 'вонтáджи', ru: 'желание' },
      { term: 'academia', reading: 'академи́а', ru: 'спортзал' },
      { term: 'faculdade', reading: 'факулдáджи', ru: 'вуз, факультет' },
      { term: 'compras', reading: 'ко́мпрас', ru: 'покупки' },
      { term: 'nada', reading: 'нáда', ru: 'ничего' },
    ],
    tasks: [
      one('Eu ___ tempo hoje. (ter)', ['tem', 'tenho', 'temos', 'têm'], 1),
      one('Nós ___ ao cinema. (ir)', ['vou', 'vai', 'vamos', 'vão'], 2),
      one('O que você ___ no fim de semana? (fazer)', ['faço', 'faz', 'fazemos', 'fazem'], 1),
      one('«Мне надо работать»:', ['Eu tenho trabalhar.', 'Eu tenho que trabalhar.', 'Eu vou que trabalhar.', 'Eu faço trabalhar.'], 1),
      fill('Дополните: Eles ___ dois filhos. (ter)', 'têm'),
      fill('Дополните: Eu ___ à academia hoje. (ir)', 'vou'),
      wb('Eu tenho que estudar hoje à noite.', 'Соберите предложение «Мне надо учиться сегодня вечером».', ['vou', 'faço']),
      dictation('Напечатайте услышанный вопрос.', 'O que você faz no fim de semana?'),
      say('Расскажите, что у вас есть, куда вы обычно ходите и что делаете по выходным.', 60),
    ],
  },
  {
    n: 9, shortId: 'ptbr-09',
    title: 'Вопросы: quem, o que, onde, quando, por que, como',
    goal: 'Задать любой бытовой вопрос',
    grammar: 'Вопросительные слова; quanto/quanta с согласованием; por que (вопрос) против porque (ответ)',
    grammarWhy: 'Разница por que / porque — письменная ловушка, на которой спотыкаются даже носители. Для нас важнее другое: португальский вопрос не требует инверсии, значит спрашивать можно сразу и много.',
    vocabTheme: 'Вопросительные слова',
    artifact: '7 вопросов к одному ответу',
    pattern: drill(
      'вопросительные слова',
      'вопрос без инверсии',
      [
        ['что вы делаете?', 'O que você faz', 'Чем вы занимаетесь?'],
        ['где вы живёте?', 'Onde você mora', 'Где вы живёте?'],
        ['сколько это стоит?', 'Quanto custa', 'Сколько стоит?'],
        ['почему? (вопрос)', 'Por que', 'Почему?'],
        ['потому что (ответ)', 'Porque', 'Потому что.'],
      ],
      'Порядок слов в вопросе не меняется — подлежащее остаётся перед глаголом. Por que и porque различаются на письме, а не на слух.',
    ),
    vocab: [
      { term: 'quem', reading: 'кэ̃й', ru: 'кто' },
      { term: 'o que', reading: 'у ки', ru: 'что' },
      { term: 'onde', reading: 'о́нджи', ru: 'где' },
      { term: 'para onde', reading: 'пара о́нджи', ru: 'куда' },
      { term: 'quando', reading: 'куáнду', ru: 'когда' },
      { term: 'por que', reading: 'пур ки', ru: 'почему' },
      { term: 'porque', reading: 'пурки́', ru: 'потому что' },
      { term: 'como', reading: 'ко́му', ru: 'как' },
      { term: 'quanto', reading: 'куáнту', ru: 'сколько' },
      { term: 'qual', reading: 'куáу', ru: 'какой, который' },
    ],
    tasks: [
      pairsOf('Соедините вопросительное слово и перевод.', [
        ['quando', 'когда'],
        ['onde', 'где'],
        ['quem', 'кто'],
        ['por que', 'почему'],
      ]),
      one('Как спросить «Сколько это стоит?»', ['Quanto custa?', 'Como custa?', 'Qual custa?', 'Quem custa?'], 0),
      one('Где пишется porque (слитно)?', [
        'В вопросе',
        'В ответе — «потому что»',
        'Всегда слитно',
        'Только в конце предложения',
      ], 1),
      fill('Дополните вопрос: ___ você mora? (где)', 'Onde'),
      fill('Дополните ответ: Estudo português ___ quero morar no Brasil.', 'porque'),
      wb('Por que você estuda português?', 'Соберите вопрос «Почему ты учишь португальский?».', ['porque', 'como']),
      dictation('Напечатайте услышанный вопрос.', 'Onde você mora?'),
      write('Ответ: No sábado eu vou ao cinema com a minha irmã porque ela gosta de filmes. Напишите 7 разных вопросов к этому ответу.'),
    ],
  },
  {
    n: 10, shortId: 'ptbr-10',
    title: 'Числа, дни, время',
    goal: 'Называть цены, часы и договариваться о встрече',
    grammar: 'Числа до 1000; дни недели; que horas são?; часы через e/para; предлоги времени às, de … a',
    grammarWhy: 'Время и числа нужны в первый же день в стране: цена, адрес, час встречи. В португальском часы читаются через são (мн.) и é (для одного) — мелочь, на которой сразу слышно уровень.',
    vocabTheme: 'Числа и расписание',
    artifact: 'Диалог о назначении встречи',
    pattern: drill(
      'который час и когда',
      'время',
      [
        ['2:00', 'São duas horas', 'Два часа.'],
        ['1:00', 'É uma hora', 'Час.'],
        ['3:15', 'São três e quinze', 'Три пятнадцать.'],
        ['без десяти пять', 'São dez para as cinco', 'Без десяти пять.'],
        ['в восемь', 'às oito', 'в восемь'],
      ],
      'Час — единственное число (É uma hora), всё остальное — множественное (São). Это первое, на чём слышно новичка.',
    ),
    vocab: [
      { term: 'um, dois, três', reading: 'у̃, дойс, трэйс', ru: 'один, два, три' },
      { term: 'dez', reading: 'дэйс', ru: 'десять' },
      { term: 'vinte', reading: 'ви́нчи', ru: 'двадцать' },
      { term: 'cem', reading: 'сэ̃й', ru: 'сто' },
      { term: 'mil', reading: 'миу', ru: 'тысяча' },
      { term: 'segunda-feira', reading: 'сегу́нда фе́йра', ru: 'понедельник' },
      { term: 'sexta-feira', reading: 'сэ́ста фе́йра', ru: 'пятница' },
      { term: 'sábado', reading: 'сáбаду', ru: 'суббота' },
      { term: 'que horas são?', reading: 'ки о́рас сãу', ru: 'сколько времени?' },
      { term: 'meia-noite', reading: 'ме́йа но́йчи', ru: 'полночь' },
    ],
    tasks: [
      order('Расставьте дни недели по порядку, начиная с понедельника.', [
        'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo',
      ]),
      one('Как сказать «Сейчас три часа»?', ['É três horas.', 'São três horas.', 'Está três horas.', 'Tem três horas.'], 1),
      one('Как сказать «Сейчас час»?', ['São uma hora.', 'É uma hora.', 'Está uma hora.', 'É um hora.'], 1),
      fill('Дополните: A aula começa ___ nove horas. (в девять)', 'às'),
      fill('Запишите словами число 25.', 'vinte e cinco'),
      pairsOf('Соедините день и перевод.', [
        ['segunda-feira', 'понедельник'],
        ['sexta-feira', 'пятница'],
        ['sábado', 'суббота'],
        ['domingo', 'воскресенье'],
      ]),
      dictation('Напечатайте услышанный вопрос.', 'Que horas são?'),
      say('Назовите вслух: 7:00, 8:30, 12:45, 16:20, 21:10 — и скажите, во сколько начинается ваш день.', 60),
    ],
  },
  {
    n: 11, shortId: 'ptbr-11',
    title: 'Семья и описание людей',
    goal: 'Рассказать о своей семье и описать человека',
    grammar: 'Притяжательные meu/minha, seu/sua с согласованием по предмету; прилагательные согласуются в роде и числе',
    grammarWhy: 'Притяжательное согласуется не с владельцем, а с обладаемым: minha casa у мужчины тоже minha. Русскоязычный автоматически согласует с собой — устойчивая ошибка, которую надо ломать сразу.',
    vocabTheme: 'Семья и внешность',
    artifact: 'Описание своей семьи из 8 предложений',
    pattern: drill(
      'притяжательные и согласование',
      'мой / ваш',
      [
        ['мой дом (casa — ж.)', 'minha casa', 'мой дом'],
        ['моя книга (livro — м.)', 'meu livro', 'моя книга'],
        ['ваши друзья', 'seus amigos', 'ваши друзья'],
        ['красивый дом', 'casa bonita', 'красивый дом'],
        ['красивые дома', 'casas bonitas', 'красивые дома'],
      ],
      'Притяжательное согласуется с ПРЕДМЕТОМ, а не с владельцем: minha casa говорит и мужчина тоже.',
    ),
    vocab: [
      { term: 'pai', reading: 'пай', ru: 'отец' },
      { term: 'mãe', reading: 'мãй', ru: 'мать' },
      { term: 'filho / filha', reading: 'фи́лью / фи́лья', ru: 'сын / дочь' },
      { term: 'irmão / irmã', reading: 'ирмãу / ирмã', ru: 'брат / сестра' },
      { term: 'esposa / marido', reading: 'эспо́за / мари́ду', ru: 'жена / муж' },
      { term: 'alto / baixo', reading: 'áуту / бáйшу', ru: 'высокий / низкий' },
      { term: 'simpático', reading: 'симпáтчику', ru: 'приятный, милый' },
      { term: 'chato', reading: 'шáту', ru: 'нудный, надоедливый' },
      { term: 'mais velho', reading: 'майс вэ́лью', ru: 'старший' },
      { term: 'mais novo', reading: 'майс но́ву', ru: 'младший' },
    ],
    tasks: [
      one('Мужчина говорит о своём доме. Как правильно?', ['meu casa', 'minha casa', 'meus casa', 'minha caso'], 1),
      one('С чем согласуется притяжательное в португальском?', [
        'С владельцем',
        'С предметом, которым владеют',
        'Ни с чем',
        'С глаголом',
      ], 1),
      fill('Дополните: ___ irmã mora em São Paulo. (моя)', 'Minha'),
      fill('Дополните: ___ pais são professores. (мои)', 'Meus'),
      one('«Моя сестра выше меня»:', [
        'Minha irmã é mais alta que eu.',
        'Minha irmã é mais alto que eu.',
        'Minha irmã está mais alta que eu.',
        'Minha irmã é mais alta de eu.',
      ], 0),
      wb('Minha irmã mais velha mora em São Paulo.', 'Соберите предложение «Моя старшая сестра живёт в Сан-Паулу».', ['meu', 'está']),
      dictationBank('Соберите услышанное из плиток.', 'Meu pai é professor.', ['minha', 'está']),
      write('Опишите свою семью: 8 предложений с притяжательными и прилагательными, согласованными по роду.'),
    ],
  },

  // ═══ Модуль 3. Жизнь в Бразилии ═══
  {
    n: 12, shortId: 'ptbr-12',
    title: 'В магазине',
    goal: 'Купить, спросить цену, попросить примерить',
    grammar: 'Quanto custa? / Quanto é?; queria (вежливое «я бы хотел»); este/esse/aquele',
    grammarWhy: 'queria — вежливая форма желания, и без неё просьба звучит как требование (quero = «хочу»). Это самая экономная вежливость в языке: одна форма вместо целой конструкции.',
    vocabTheme: 'Покупки',
    artifact: 'Разыгранный диалог покупки на 8 реплик',
    pattern: drill(
      'queria / este, esse, aquele',
      'вежливая покупка',
      [
        ['я хотел бы кофе', 'Eu queria um café', 'Я хотел бы кофе.'],
        ['сколько стоит?', 'Quanto custa', 'Сколько стоит?'],
        ['вот это (у меня)', 'este aqui', 'вот это'],
        ['то (у вас)', 'esse aí', 'вот то'],
        ['вон то (вдалеке)', 'aquele ali', 'вон то'],
      ],
      'queria — это imperfeito в роли вежливости: буквально «я хотел», а звучит как «я бы хотел». Quero в магазине звучит резко.',
    ),
    vocab: [
      { term: 'quanto custa?', reading: 'куáнту ку́ста', ru: 'сколько стоит?' },
      { term: 'queria', reading: 'кери́а', ru: 'я бы хотел(а)' },
      { term: 'caro / barato', reading: 'кáру / барáту', ru: 'дорогой / дешёвый' },
      { term: 'desconto', reading: 'джиско́нту', ru: 'скидка' },
      { term: 'cartão', reading: 'картãу', ru: 'карта' },
      { term: 'dinheiro', reading: 'джинье́йру', ru: 'наличные, деньги' },
      { term: 'troco', reading: 'тро́ку', ru: 'сдача' },
      { term: 'experimentar', reading: 'эспериментáр', ru: 'примерить, попробовать' },
      { term: 'tamanho', reading: 'тамáнью', ru: 'размер' },
      { term: 'sacola', reading: 'сако́ла', ru: 'пакет' },
    ],
    tasks: [
      order('Расставьте реплики диалога в магазине по порядку.', [
        'Boa tarde! Posso ajudar?',
        'Boa tarde. Queria ver aquela camiseta.',
        'Claro. Que tamanho você usa?',
        'Uso M. Posso experimentar?',
        'Pode, sim. Quanto custa?',
        'Cinquenta reais. Vai pagar no cartão ou em dinheiro?',
      ]),
      one('Какая форма вежливее для просьбы?', ['Quero um café.', 'Queria um café, por favor.', 'Dá um café.', 'Um café!'], 1),
      fill('Дополните: ___ custa esta camiseta? (сколько)', 'Quanto'),
      fill('Дополните: Você tem ___ maior? (размер)', 'tamanho'),
      pairsOf('Соедините слово и перевод.', [
        ['desconto', 'скидка'],
        ['troco', 'сдача'],
        ['tamanho', 'размер'],
        ['sacola', 'пакет'],
      ]),
      wb('Queria ver aquela camiseta, por favor.', 'Соберите фразу «Я бы хотел посмотреть вон ту футболку, пожалуйста».', ['quero', 'este']),
      dictation('Напечатайте услышанный вопрос.', 'Quanto custa isso?'),
      say('Разыграйте покупку: поздоровайтесь, попросите показать, спросите цену и размер, попросите скидку.', 75),
    ],
  },
  {
    n: 13, shortId: 'ptbr-13',
    title: 'В кафе и ресторане',
    goal: 'Заказать еду, попросить счёт, оценить блюдо',
    grammar: 'Заказ через para mim / vou querer; gostar de + существительное или инфинитив',
    grammarWhy: 'gostar требует предлога de, который русскоязычный опускает: «Eu gosto café» вместо «Eu gosto de café». Ошибка мелкая и абсолютно устойчивая, поэтому отрабатывается отдельно и много.',
    vocabTheme: 'Еда',
    artifact: 'Заказ на трёх человек, произнесённый вслух',
    pattern: drill(
      'gostar de / vou querer',
      'вкусы и заказ',
      [
        ['я люблю кофе', 'Eu gosto de café', 'Я люблю кофе.'],
        ['я люблю путешествовать', 'Eu gosto de viajar', 'Я люблю путешествовать.'],
        ['я возьму пиццу', 'Eu vou querer uma pizza', 'Я возьму пиццу.'],
        ['мне, пожалуйста, сок', 'Para mim um suco', 'Мне сок, пожалуйста.'],
        ['я не люблю лук', 'Eu não gosto de cebola', 'Я не люблю лук.'],
      ],
      'gostar ВСЕГДА тянет за собой de — и перед существительным, и перед инфинитивом. Забыть его — самая заметная ошибка русскоязычных.',
    ),
    vocab: [
      { term: 'café', reading: 'кафе́', ru: 'кофе' },
      { term: 'pão de queijo', reading: 'пãу джи ке́йжу', ru: 'пан-ди-кейжу' },
      { term: 'feijoada', reading: 'фейжоáда', ru: 'фейжоада' },
      { term: 'arroz e feijão', reading: 'ахо́с и фейжãу', ru: 'рис с фасолью' },
      { term: 'suco', reading: 'су́ку', ru: 'сок' },
      { term: 'gostoso', reading: 'госто́зу', ru: 'вкусный' },
      { term: 'a conta', reading: 'а ко́нта', ru: 'счёт' },
      { term: 'garçom', reading: 'гарсõ', ru: 'официант' },
      { term: 'gostar de', reading: 'гостáр джи', ru: 'нравиться, любить' },
      { term: 'com gelo', reading: 'кõ же́лу', ru: 'со льдом' },
    ],
    tasks: [
      one('Выберите верное: «Я люблю кофе».', ['Eu gosto café.', 'Eu gosto de café.', 'Eu gosto o café.', 'Eu gosto para café.'], 1),
      one('«Мне нравится учить португальский»:', [
        'Eu gosto estudar português.',
        'Eu gosto de estudar português.',
        'Eu gosto que estudar português.',
        'Eu gosto a estudar português.',
      ], 1),
      one('Как попросить счёт?', ['A conta, por favor.', 'O troco, por favor.', 'O cartão, por favor.', 'A sacola, por favor.'], 0),
      fill('Дополните: Eu gosto ___ feijoada.', 'de'),
      fill('Дополните: Vou ___ um suco de laranja. (querer)', 'querer'),
      pairsOf('Соедините блюдо и описание.', [
        ['pão de queijo', 'булочка с сыром'],
        ['feijoada', 'тушёная фасоль с мясом'],
        ['arroz e feijão', 'рис с фасолью'],
        ['suco', 'сок'],
      ]),
      // «gosto» есть в эталоне — обманка дублировала бы нужную плитку.
      // «com» оставляем: противопоставление sem/com здесь и тренируется.
      wb('Eu gosto de café sem açúcar.', 'Соберите фразу «Я люблю кофе без сахара».', ['bebo', 'com']),
      say('Сделайте заказ на трёх человек: позовите официанта, закажите три блюда и напитки, попросите счёт.', 75),
    ],
  },
  {
    n: 14, shortId: 'ptbr-14',
    title: 'Город и транспорт',
    goal: 'Спросить дорогу и объяснить, как добраться',
    grammar: 'Предлоги места (em, no/na, perto de, ao lado de); ir de ônibus / a pé; imperativo для указаний',
    grammarWhy: 'Слияние предлога с артиклем (em + o = no, em + a = na) обязательно и не имеет русского аналога. Оно даётся здесь, потому что именно в описании города встречается в каждой фразе.',
    vocabTheme: 'Город',
    artifact: 'Объяснение дороги от дома до работы',
    pattern: drill(
      'предлоги места и способа',
      'где и на чём',
      [
        ['в банке', 'no banco', 'в банке'],
        ['в школе', 'na escola', 'в школе'],
        ['рядом с домом', 'perto de casa', 'рядом с домом'],
        ['на автобусе', 'de ônibus', 'на автобусе'],
        ['пешком', 'a pé', 'пешком'],
      ],
      'em сливается с артиклем: em + o = no, em + a = na. Раздельно это не пишут никогда. Транспорт берёт de, а пешком — a pé.',
    ),
    vocab: [
      { term: 'ônibus', reading: 'о́нибус', ru: 'автобус' },
      { term: 'metrô', reading: 'метро́', ru: 'метро' },
      { term: 'a pé', reading: 'а пэ́', ru: 'пешком' },
      { term: 'ponto de ônibus', reading: 'по́нту джи о́нибус', ru: 'автобусная остановка' },
      { term: 'esquina', reading: 'эски́на', ru: 'угол улицы' },
      { term: 'à direita', reading: 'а джире́йта', ru: 'направо' },
      { term: 'à esquerda', reading: 'а эске́рда', ru: 'налево' },
      { term: 'em frente', reading: 'э̃й фре́нчи', ru: 'прямо; напротив' },
      { term: 'perto de', reading: 'пэ́рту джи', ru: 'рядом с' },
      { term: 'demorar', reading: 'деморáр', ru: 'занимать время' },
    ],
    tasks: [
      one('em + o metrô =', ['em o metrô', 'no metrô', 'na metrô', 'ao metrô'], 1),
      one('em + a rua =', ['em a rua', 'no rua', 'na rua', 'à rua'], 2),
      one('Как сказать «на автобусе»?', ['em ônibus', 'de ônibus', 'no ônibus para', 'a ônibus'], 1),
      fill('Дополните: Eu moro ___ centro. (em + o)', 'no'),
      fill('Дополните: Vire ___ direita na esquina.', 'à'),
      pairsOf('Соедините указание и перевод.', [
        ['à direita', 'направо'],
        ['à esquerda', 'налево'],
        ['em frente', 'прямо'],
        ['perto de', 'рядом с'],
      ]),
      wb('Eu vou ao trabalho de metrô e demora quarenta minutos.', 'Соберите предложение «Я езжу на работу на метро, это занимает сорок минут».', ['no', 'a pé']),
      say('Объясните, как добраться от вашего дома до работы: транспорт, пересадки, сколько занимает.', 75),
      describeImage(
        'Você está no ponto vermelho. Explique em voz alta como chegar à farmácia e depois à escola. Use à direita, à esquerda, em frente, na esquina, perto de.',
        streetMapImage(),
        {
          responseMode: 'speak',
          responseSeconds: 90,
          facts: [
            'O ponto vermelho fica na Rua das Flores, perto da padaria',
            'A farmácia fica do outro lado da Avenida Central, ao norte da Rua das Flores',
            'A escola fica ao sul da Rua das Flores, do mesmo lado da padaria',
            'A praça fica ao sul, do outro lado da Avenida Central',
            'A Avenida Central cruza a Rua das Flores',
          ],
          distractorFacts: [
            'Há um metrô no mapa (não há)',
            'A escola fica ao lado da farmácia (estão em lados opostos da avenida)',
          ],
          expectedStructures: ['à direita / à esquerda', 'em frente', 'na esquina', 'perto de / ao lado de', 'vire, siga, atravesse'],
        },
      ),
    ],
  },
  {
    n: 15, shortId: 'ptbr-15',
    title: 'Прямо сейчас: estou fazendo',
    goal: 'Говорить о том, что происходит в момент речи',
    grammar: 'estar + герундий (-ndo) — бразильская норма; противопоставление с европейским estar a + инфинитив',
    grammarWhy: 'Это самая заметная граница между вариантами: в Бразилии estou trabalhando, в Португалии estou a trabalhar. Курс бразильский, поэтому норма задаётся прямо, а европейский вариант упоминается только чтобы ученик его узнавал.',
    vocabTheme: 'Текущие действия',
    artifact: 'Рассказ о том, чем занят прямо сейчас',
    pattern: drill(
      'estar + герундий',
      'происходит прямо сейчас',
      [
        ['falar — сейчас', 'estou falando', 'я говорю (сейчас)'],
        ['comer — сейчас', 'estou comendo', 'я ем (сейчас)'],
        ['partir — сейчас', 'estou partindo', 'я уезжаю (сейчас)'],
        ['ele — работает', 'ele está trabalhando', 'он работает (сейчас)'],
        ['chover — идёт дождь', 'está chovendo', 'идёт дождь'],
      ],
      'Герундий берёт окончание по группе глагола: -ando, -endo, -indo. Это бразильская норма; в Португалии сказали бы estou a falar.',
    ),
    vocab: [
      { term: 'estou fazendo', reading: 'эсто́у фазе́нду', ru: 'я делаю (сейчас)' },
      { term: 'agora', reading: 'аго́ра', ru: 'сейчас' },
      { term: 'ainda', reading: 'аи́нда', ru: 'ещё' },
      { term: 'já', reading: 'жá', ru: 'уже' },
      { term: 'esperar', reading: 'эсперáр', ru: 'ждать' },
      { term: 'procurar', reading: 'прокурáр', ru: 'искать' },
      { term: 'tentar', reading: 'тентáр', ru: 'пытаться' },
      { term: 'terminar', reading: 'терминáр', ru: 'заканчивать' },
      { term: 'descansar', reading: 'дескансáр', ru: 'отдыхать' },
      { term: 'no momento', reading: 'ну моме́нту', ru: 'в данный момент' },
    ],
    tasks: [
      one('Как по-бразильски «я сейчас работаю»?', [
        'Eu estou a trabalhar.',
        'Eu estou trabalhando.',
        'Eu trabalho agora mesmo a fazer.',
        'Eu sou trabalhando.',
      ], 1),
      one('Чем отличается португальский вариант этой конструкции?', [
        'Ничем',
        'В Португалии говорят estar a + инфинитив',
        'В Португалии её нет вовсе',
        'В Португалии используют ser вместо estar',
      ], 1),
      fill('Поставьте в форму «сейчас»: comer → estou ___', 'comendo'),
      fill('Поставьте в форму «сейчас»: dormir → estou ___', 'dormindo'),
      grid('Заполните таблицу герундиев.',
        ['инфинитив', 'герундий', 'перевод'],
        [
          ['falar', 'falando', 'говорить'],
          ['comer', 'comendo', 'есть'],
          ['dormir', 'dormindo', 'спать'],
          ['fazer', 'fazendo', 'делать'],
        ],
        { '0,1': true, '2,1': true, '3,1': true }),
      wb('Eu estou estudando português agora.', 'Соберите предложение «Я сейчас учу португальский».', ['estudo', 'a']),
      dictation('Напечатайте услышанный вопрос.', 'O que você está fazendo agora?'),
      say('Расскажите, чем вы заняты прямо сейчас, что уже сделали и что ещё не закончили.', 60),
      // «Caipira picando fumo» — estar + gerúndio на бразильской картине
      // 1893 года: он режет табак, а не курит, и это первая ошибка описания.
      art('caipira', 'pt-BR'),
    ],
  },
  {
    n: 16, shortId: 'ptbr-16',
    title: 'você, tu, a gente: как обращаться',
    goal: 'Выбирать обращение и не звучать из учебника',
    grammar: 'você как основное «ты»; tu в регионах; a gente вместо nós с формой 3 лица; senhor/senhora',
    grammarWhy: 'Живая бразильская речь почти не использует nós — говорят a gente vai, а не nós vamos, — и учебники этого не показывают. Ученик, выучивший только nós, звучит как диктор новостей. Проклиза (me ajuda вместо ajuda-me) — вторая примета бразильской нормы.',
    vocabTheme: 'Обращения и регистры',
    artifact: 'Одна просьба в трёх регистрах',
    vocab: [
      { term: 'você', reading: 'восе́', ru: 'ты (основное обращение в Бразилии)' },
      { term: 'tu', reading: 'ту', ru: 'ты (юг и северо-восток)' },
      { term: 'a gente', reading: 'а же́нчи', ru: 'мы (разговорное, глагол в 3 лице)' },
      { term: 'senhor / senhora', reading: 'сеньо́р / сеньо́ра', ru: 'вежливое обращение' },
      { term: 'cara', reading: 'кáра', ru: 'парень, чувак (разговорное)' },
      { term: 'moço / moça', reading: 'мо́су / мо́са', ru: 'обращение к молодому человеку/девушке' },
      { term: 'me ajuda', reading: 'ми ажу́да', ru: 'помоги мне' },
      { term: 'pode me ajudar?', reading: 'по́джи ми ажудáр', ru: 'можете мне помочь?' },
      { term: 'valeu', reading: 'вале́у', ru: 'спасибо (разговорное)' },
      { term: 'beleza', reading: 'беле́за', ru: 'договорились, отлично' },
    ],
    tasks: [
      one('Как в разговорной бразильской речи чаще скажут «мы идём»?', [
        'Nós vamos.',
        'A gente vai.',
        'A gente vamos.',
        'Nós vai.',
      ], 1),
      one('Какая форма глагола идёт после a gente?', ['1 лицо мн. ч. (vamos)', '3 лицо ед. ч. (vai)', '2 лицо (vais)', 'инфинитив'], 1),
      one('Как в Бразилии обычно ставят местоимение-дополнение?', [
        'После глагола: ajuda-me',
        'Перед глаголом: me ajuda',
        'Только в конце фразы',
        'Оно опускается всегда',
      ], 1),
      pairsOf('Соедините обращение и ситуацию.', [
        ['senhor', 'к пожилому или в официальной ситуации'],
        ['você', 'к коллеге, знакомому, почти к любому'],
        ['moça', 'к незнакомой девушке в сервисе'],
        ['cara', 'к близкому другу'],
      ]),
      fill('Перепишите разговорно: Nós vamos ao cinema. → ___ gente vai ao cinema.', 'A'),
      wb('A gente vai ao cinema hoje à noite.', 'Соберите разговорное «Мы идём в кино сегодня вечером».', ['nós', 'vamos']),
      write('Напишите одну и ту же просьбу «помогите мне, пожалуйста» в трёх регистрах: официальном, нейтральном и дружеском. Подпишите, кому каждая.'),
      say('Обратитесь с одной просьбой трижды: к пожилому незнакомому, к коллеге и к близкому другу.', 75),
    ],
  },

  // ═══ Модуль 4. Прошлое и планы ═══
  {
    n: 17, shortId: 'ptbr-17',
    title: 'Прошедшее событие: pretérito perfeito',
    goal: 'Рассказать, что произошло',
    grammar: 'falei/comi/parti; неправильные fui, tive, fiz, estive, vi',
    grammarWhy: 'Perfeito — время события: «сделал, случилось, закончилось». Оно даётся раньше imperfeito, потому что рассказ о прошлом почти всегда начинается с событий, а фон добавляется потом.',
    vocabTheme: 'События прошлого',
    artifact: 'Рассказ о прошлых выходных из 8 предложений',
    pattern: drill(
      'pretérito perfeito',
      'законченное прошедшее',
      [
        ['falar — eu', 'eu falei', 'я поговорил'],
        ['comer — eu', 'eu comi', 'я поел'],
        ['ir — eu', 'eu fui', 'я сходил'],
        ['ter — eu', 'eu tive', 'у меня было'],
        ['fazer — eu', 'eu fiz', 'я сделал'],
      ],
      'Неправильные формы fui, tive, fiz не выводятся ниоткуда — их учат списком, как и в любом романском языке.',
    ),
    vocab: [
      { term: 'ontem', reading: 'о́нтэ̃й', ru: 'вчера' },
      { term: 'semana passada', reading: 'семáна пасáда', ru: 'на прошлой неделе' },
      { term: 'ano passado', reading: 'áну пасáду', ru: 'в прошлом году' },
      { term: 'fui', reading: 'фуи́', ru: 'я пошёл / я был (ir, ser)' },
      { term: 'tive', reading: 'чи́ви', ru: 'у меня было (ter)' },
      { term: 'fiz', reading: 'фис', ru: 'я сделал (fazer)' },
      { term: 'vi', reading: 'ви', ru: 'я видел (ver)' },
      { term: 'cheguei', reading: 'шеге́й', ru: 'я приехал (chegar)' },
      { term: 'aconteceu', reading: 'аконтесе́у', ru: 'произошло' },
      { term: 'depois', reading: 'депо́йс', ru: 'потом' },
    ],
    tasks: [
      one('Выберите верное: «Вчера я работал».', ['Ontem eu trabalho.', 'Ontem eu trabalhei.', 'Ontem eu trabalhava.', 'Ontem eu vou trabalhar.'], 1),
      one('Форма ir и ser в 1 лице perfeito:', ['fui для обоих', 'fui / era', 'ia / fui', 'vou / sou'], 0),
      fill('Поставьте в perfeito: comer (eu) → ___', 'comi'),
      fill('Поставьте в perfeito: fazer (eu) → ___', 'fiz'),
      fill('Поставьте в perfeito: ter (eu) → ___', 'tive'),
      grid('Заполните таблицу perfeito.',
        ['инфинитив', 'eu', 'você/ele'],
        [
          ['falar', 'falei', 'falou'],
          ['comer', 'comi', 'comeu'],
          ['ir', 'fui', 'foi'],
          ['fazer', 'fiz', 'fez'],
        ],
        { '0,2': true, '1,1': true, '2,1': true, '3,2': true }),
      wb('Ontem eu fui ao cinema com a minha irmã.', 'Соберите предложение «Вчера я пошёл в кино с сестрой».', ['vou', 'estou']),
      write('Напишите 8 предложений о прошлых выходных в pretérito perfeito.'),
      say('Расскажите, что вы делали вчера. Минимум пять событий.', 75),
    ],
  },
  {
    n: 18, shortId: 'ptbr-18',
    title: 'Фон и привычка: pretérito imperfeito',
    goal: 'Рассказывать, как было раньше и что происходило регулярно',
    grammar: 'falava/comia/partia; era, tinha, ia; противопоставление perfeito и imperfeito',
    grammarWhy: 'Выбор между двумя прошедшими — то, по чему иностранца слышно на любом уровне. Правило работающее: событие → perfeito, фон, привычка, описание → imperfeito. Тренируется только на контрасте, поэтому оба времени стоят рядом.',
    vocabTheme: 'Детство и привычки',
    artifact: 'Рассказ о детстве из 8 предложений',
    pattern: drill(
      'imperfeito против perfeito',
      'фон и событие',
      [
        ['falar — фон', 'eu falava', 'я говорил (бывало)'],
        ['comer — фон', 'eu comia', 'я ел (обычно)'],
        ['ser — фон', 'era', 'был'],
        ['ter — фон', 'tinha', 'имел'],
        ['ir — фон', 'ia', 'ходил'],
      ],
      'Imperfeito — то, что длилось или повторялось; perfeito — то, что случилось один раз. По-русски оба переводятся одинаково, и различие приходится держать в голове самому.',
    ),
    vocab: [
      { term: 'quando eu era criança', reading: 'куáнду эу э́ра криáнса', ru: 'когда я был ребёнком' },
      { term: 'era', reading: 'э́ра', ru: 'был (ser)' },
      { term: 'tinha', reading: 'чи́нья', ru: 'у меня было (ter)' },
      { term: 'ia', reading: 'и́а', ru: 'ходил (ir)' },
      { term: 'sempre', reading: 'се́мпри', ru: 'всегда' },
      { term: 'todos os dias', reading: 'то́дус ус джи́ас', ru: 'каждый день' },
      { term: 'antigamente', reading: 'антигаме́нчи', ru: 'раньше, в прежние времена' },
      { term: 'brincar', reading: 'бринкáр', ru: 'играть (о детях)' },
      { term: 'costumava', reading: 'костумáва', ru: 'обычно делал' },
      { term: 'de repente', reading: 'джи репе́нчи', ru: 'вдруг' },
    ],
    tasks: [
      one('«Когда я был ребёнком, я каждый день играл на улице»:', [
        'Quando eu fui criança, brinquei na rua todos os dias.',
        'Quando eu era criança, eu brincava na rua todos os dias.',
        'Quando eu era criança, eu brinquei na rua todos os dias.',
        'Quando eu fui criança, eu brincava na rua todos os dias.',
      ], 1),
      one('Какое время выбрать для однократного события в прошлом?', ['imperfeito', 'perfeito', 'любое', 'presente'], 1),
      one('«Я смотрел телевизор, когда зазвонил телефон» — какие времена?', [
        'оба perfeito',
        'imperfeito (фон) + perfeito (событие)',
        'оба imperfeito',
        'perfeito (фон) + imperfeito (событие)',
      ], 1),
      fill('Поставьте в imperfeito: falar (eu) → ___', 'falava'),
      fill('Поставьте в imperfeito: ter (eu) → ___', 'tinha'),
      fill('Дополните: Eu ___ televisão quando o telefone tocou. (assistir, imperfeito)', 'assistia'),
      wb('Quando eu era criança eu morava em outra cidade.', 'Соберите предложение «Когда я был ребёнком, я жил в другом городе».', ['fui', 'morei']),
      write('Напишите 8 предложений о своём детстве в imperfeito, добавив хотя бы два события в perfeito.'),
      say('Расскажите, как проходило ваше детство и что однажды случилось. Смешайте imperfeito и perfeito.', 90),
    ],
  },
  {
    n: 19, shortId: 'ptbr-19',
    title: 'Планы: vou + инфинитив',
    goal: 'Рассказать о планах и намерениях',
    grammar: 'ir + инфинитив как основное будущее в речи; futuro simples (falarei) как книжная форма; pretendo, quero',
    grammarWhy: 'В живой речи будущее почти всегда vou fazer, а не farei. Учебники дают наоборот, и ученик получает форму, которую в разговоре не услышит. Здесь приоритет отдан разговорной.',
    vocabTheme: 'Планы',
    artifact: 'План на неделю на португальском',
    pattern: drill(
      'ir + инфинитив как будущее',
      'ближайшее будущее',
      [
        ['falar — я буду', 'eu vou falar', 'я поговорю'],
        ['viajar — я буду', 'eu vou viajar', 'я поеду'],
        ['nós — мы будем', 'nós vamos estudar', 'мы будем учиться'],
        ['книжное будущее', 'eu falarei', 'я скажу (книжно)'],
        ['я намерен', 'eu pretendo viajar', 'я собираюсь поехать'],
      ],
      'В живой речи будущее почти всегда строится через vou + инфинитив. Форма falarei звучит книжно и в разговоре встречается редко.',
    ),
    vocab: [
      { term: 'amanhã', reading: 'аманьã', ru: 'завтра' },
      { term: 'depois de amanhã', reading: 'депо́йс джи аманьã', ru: 'послезавтра' },
      { term: 'semana que vem', reading: 'семáна ки вэ̃й', ru: 'на следующей неделе' },
      { term: 'pretender', reading: 'претенде́р', ru: 'намереваться' },
      { term: 'viagem', reading: 'виáжэ̃й', ru: 'поездка' },
      { term: 'mudar', reading: 'мудáр', ru: 'менять; переезжать' },
      { term: 'conseguir', reading: 'консеги́р', ru: 'смочь, добиться' },
      { term: 'talvez', reading: 'тауве́с', ru: 'может быть' },
      { term: 'com certeza', reading: 'кõ серте́за', ru: 'точно, наверняка' },
      { term: 'plano', reading: 'плáну', ru: 'план' },
    ],
    tasks: [
      one('Как в разговорной речи сказать «я буду учиться завтра»?', [
        'Eu estudarei amanhã.',
        'Eu vou estudar amanhã.',
        'Eu vou estudando amanhã.',
        'Eu estudo vai amanhã.',
      ], 1),
      one('Форма falarei — это:', [
        'разговорное будущее',
        'книжное, формальное будущее',
        'прошедшее время',
        'условное наклонение',
      ], 1),
      fill('Дополните: Amanhã eu ___ trabalhar. (ir)', 'vou'),
      fill('Дополните: Nós ___ viajar no ano que vem. (ir)', 'vamos'),
      wb('Semana que vem eu vou começar um curso novo.', 'Соберите предложение «На следующей неделе я начну новый курс».', ['comecei', 'estou']),
      dictationBank('Соберите услышанное из плиток.', 'Amanhã eu vou trabalhar.', ['ontem', 'trabalhei']),
      write('Напишите план на следующую неделю: минимум 7 предложений с vou + инфинитив.'),
      say('Расскажите о своих планах на этот год. Минимум четыре пункта.', 60),
    ],
  },
  {
    n: 20, shortId: 'ptbr-20',
    title: 'Местоимения и возвратные глаголы',
    goal: 'Говорить о себе и о действиях с собой',
    grammar: 'me, te, se, nos; возвратные se chamar, se levantar, se sentir; проклиза в бразильской норме',
    grammarWhy: 'Возвратные глаголы в португальском и русском не совпадают по составу, а место местоимения в Бразилии другое, чем в учебниках европейской нормы. Без этого юнита ученик не может сказать даже «меня зовут» в живой форме.',
    vocabTheme: 'Возвратные глаголы',
    artifact: 'Описание своего утра с возвратными глаголами',
    pattern: drill(
      'возвратные местоимения',
      'зовут, встаю, чувствую',
      [
        ['меня зовут Ана', 'Eu me chamo Ana', 'Меня зовут Ана.'],
        ['как вас зовут?', 'Como você se chama', 'Как вас зовут?'],
        ['я встаю рано', 'Eu me levanto cedo', 'Я встаю рано.'],
        ['я хорошо себя чувствую', 'Eu me sinto bem', 'Я хорошо себя чувствую.'],
        ['он ложится поздно', 'Ele se deita tarde', 'Он ложится поздно.'],
      ],
      'В бразильской норме местоимение стоит ПЕРЕД глаголом (проклиза): eu me chamo, а не chamo-me, как в Португалии.',
    ),
    vocab: [
      { term: 'chamar-se', reading: 'шамáр-си', ru: 'называться, зваться' },
      { term: 'levantar-se', reading: 'левантáр-си', ru: 'вставать' },
      { term: 'sentir-se', reading: 'сенчи́р-си', ru: 'чувствовать себя' },
      { term: 'lembrar-se', reading: 'лембрáр-си', ru: 'помнить' },
      { term: 'esquecer', reading: 'эскесе́р', ru: 'забывать' },
      { term: 'acordar', reading: 'акордáр', ru: 'просыпаться' },
      { term: 'vestir-se', reading: 'вестчи́р-си', ru: 'одеваться' },
      { term: 'apressar-se', reading: 'апресáр-си', ru: 'торопиться' },
      { term: 'me diz', reading: 'ми джи́с', ru: 'скажи мне' },
      { term: 'te ajudo', reading: 'чи ажу́ду', ru: 'помогу тебе' },
    ],
    tasks: [
      one('Как по-бразильски «меня зовут Ана»?', ['Chamo-me Ana.', 'Eu me chamo Ana.', 'Eu chamo me Ana.', 'Me eu chamo Ana.'], 1),
      one('Где в бразильской норме стоит местоимение-дополнение?', [
        'После глагола через дефис',
        'Перед глаголом',
        'В конце предложения',
        'Оно не используется',
      ], 1),
      fill('Дополните: Eu ___ levanto às sete horas.', 'me'),
      fill('Дополните: Como você ___ sente hoje?', 'se'),
      pairsOf('Соедините глагол и перевод.', [
        ['levantar-se', 'вставать'],
        ['sentir-se', 'чувствовать себя'],
        ['vestir-se', 'одеваться'],
        ['lembrar-se', 'помнить'],
      ]),
      wb('Eu me levanto às sete e me visto rápido.', 'Соберите предложение «Я встаю в семь и быстро одеваюсь».', ['levanto-me', 'estou']),
      dictation('Напечатайте услышанный вопрос.', 'Como você se chama?'),
      write('Опишите своё утро: 8 предложений, минимум четыре возвратных глагола.'),
    ],
  },

  // ═══ Модуль 5. Связная речь и жанры ═══
  {
    n: 21, shortId: 'ptbr-21',
    title: 'Связки и первое subjuntivo',
    goal: 'Строить связный текст, а не список фраз',
    grammar: 'porque, por isso, mas, então, apesar de; presente do subjuntivo после espero que, quero que, é importante que',
    grammarWhy: 'Subjuntivo — граница между A2 и B1, и на A2 достаточно узнавать его в трёх частотных конструкциях (espero que, quero que, é importante que), а не спрягать всё. Связки же дают то, за что на CELPE-Bras прямо начисляют: связность текста.',
    vocabTheme: 'Связки и мнение',
    artifact: 'Связный абзац из 8 предложений',
    pattern: drill(
      'связки и presente do subjuntivo',
      'причина, следствие, желание',
      [
        ['потому что', 'porque', 'потому что'],
        ['поэтому', 'por isso', 'поэтому'],
        ['но', 'mas', 'но'],
        ['надеюсь, что ты придёшь', 'Espero que você venha', 'Надеюсь, ты придёшь.'],
        ['важно, чтобы ты учился', 'É importante que você estude', 'Важно, чтобы ты учился.'],
      ],
      'После espero que и é importante que глагол обязан встать в subjuntivo. Это не стилистика: вариант с indicativo здесь просто неграмматичен.',
    ),
    vocab: [
      { term: 'porque', reading: 'пурки́', ru: 'потому что' },
      { term: 'por isso', reading: 'пур и́су', ru: 'поэтому' },
      { term: 'mas', reading: 'мас', ru: 'но' },
      { term: 'além disso', reading: 'алэ̃й джи́су', ru: 'кроме того' },
      { term: 'apesar de', reading: 'апезáр джи', ru: 'несмотря на' },
      { term: 'espero que', reading: 'эспэ́ру ки', ru: 'надеюсь, что' },
      { term: 'acho que', reading: 'áшу ки', ru: 'я думаю, что' },
      { term: 'na minha opinião', reading: 'на ми́нья опиниãу', ru: 'по моему мнению' },
      { term: 'por exemplo', reading: 'пур эзэ́мплу', ru: 'например' },
      { term: 'enfim', reading: 'энфи́', ru: 'в итоге' },
    ],
    tasks: [
      one('Выберите верное: «Я надеюсь, что ты придёшь».', [
        'Espero que você vem.',
        'Espero que você venha.',
        'Espero que você vai.',
        'Espero que você veio.',
      ], 1),
      one('После espero que идёт:', ['indicativo', 'subjuntivo', 'инфинитив', 'герундий'], 1),
      one('«Португальский трудный, но интересный»:', [
        'Português é difícil porque interessante.',
        'Português é difícil, mas interessante.',
        'Português é difícil por isso interessante.',
        'Português é difícil além disso interessante.',
      ], 1),
      fill('Дополните: Estudo português ___ quero morar no Brasil.', 'porque'),
      fill('Дополните: É importante que você ___ todos os dias. (estudar, subjuntivo)', 'estude'),
      pairsOf('Соедините связку и функцию.', [
        ['porque', 'причина'],
        ['por isso', 'следствие'],
        ['mas', 'противопоставление'],
        ['além disso', 'добавление'],
      ]),
      wb('Estudo português porque quero trabalhar no Brasil.', 'Соберите предложение с причиной.', ['mas', 'venha']),
      write('Напишите абзац из 8 предложений о том, зачем вы учите португальский. Используйте минимум четыре разные связки.'),
      say('Объясните, почему вы учите португальский и что в нём трудно. Используйте porque, mas и acho que.', 90),
    ],
  },
  {
    n: 22, shortId: 'ptbr-22',
    title: 'CELPE-Bras: как устроен экзамен и что такое задание-жанр',
    goal: 'Понимать формат экзамена и писать текст с адресатом и целью',
    grammar: 'Повторение всего курса в жанровых задачах: e-mail, сообщение, короткое письмо',
    grammarWhy: 'CELPE-Bras проверяет не грамматику отдельно, а способность решить коммуникативную задачу: кто пишет, кому, зачем, в каком жанре. Понять это надо до, а не после подготовки — иначе человек готовится к тесту, которого не существует.',
    vocabTheme: 'Экзамен и жанры',
    artifact: 'Письменный e-mail по жанровому заданию и устный ответ на 3 минуты',
    vocab: [
      { term: 'a prova', reading: 'а про́ва', ru: 'экзамен, тест' },
      { term: 'a tarefa', reading: 'а таре́фа', ru: 'задание' },
      { term: 'o gênero', reading: 'у же́неру', ru: 'жанр текста' },
      { term: 'o enunciador', reading: 'у энунсиадо́р', ru: 'тот, от чьего лица пишем' },
      { term: 'o interlocutor', reading: 'у интерлокуто́р', ru: 'адресат' },
      { term: 'o propósito', reading: 'у пропо́зиту', ru: 'цель текста' },
      { term: 'a parte escrita', reading: 'а пáрчи эскри́та', ru: 'письменная часть' },
      { term: 'a parte oral', reading: 'а пáрчи орáу', ru: 'устная часть' },
      { term: 'o elemento provocador', reading: 'у элеме́нту провокадо́р', ru: 'материал-стимул для беседы' },
      { term: 'o certificado', reading: 'у сертификáду', ru: 'сертификат' },
    ],
    tasks: [
      one('Какой самый низкий уровень, который присваивает CELPE-Bras?', [
        'Elementar',
        'Intermediário',
        'Básico',
        'Avançado',
      ], 1),
      one('Из каких частей состоит экзамен?', [
        'Только письменная',
        'Письменная и устная',
        'Письменная, устная и грамматический тест',
        'Только устная беседа',
      ], 1),
      one('Что обязательно учитывать в письменном задании?', [
        'Только количество слов',
        'Жанр, от чьего лица пишем, кому и зачем',
        'Только грамматическую правильность',
        'Только тему',
      ], 1),
      one('Есть ли в CELPE-Bras отдельный тест по грамматике с выбором ответа?', [
        'Да, это первая часть',
        'Нет — оцениваются выполненные коммуникативные задачи',
        'Только на продвинутых уровнях',
        'Только в устной части',
      ], 1),
      many('Что входит в устную часть?', [
        'беседа о самом кандидате',
        'обсуждение материалов-стимулов (elementos provocadores)',
        'чтение вслух списка слов',
        'диктант',
      ], [0, 1]),
      order('Расставьте шаги работы над письменным заданием по порядку.', [
        'Прочитать задание и найти жанр, адресата и цель.',
        'Изучить приложенный материал (текст, видео, аудио).',
        'Выписать, какие идеи из материала нужны для задачи.',
        'Составить план текста в нужном жанре.',
        'Написать текст, обращаясь именно к своему адресату.',
        'Проверить: жанр соблюдён, цель достигнута, адресат учтён.',
      ]),
      write('Задание-жанр: вы прочитали в блоге объявление о курсах португальского в вашем городе. Напишите e-mail организаторам (120–150 слов): представьтесь, задайте три конкретных вопроса о расписании и цене, попросите ответить. Соблюдите жанр e-mail: приветствие, тело, подпись.'),
      say('Устная часть: расскажите три минуты о том, как вы учите португальский и зачем он вам. Отвечайте так, будто с вами беседует экзаменатор и задаёт уточняющие вопросы.', 180),
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Иллюстрации конспектов
//
// Чтение диграфов, ser/estar, три спряжения и пара perfeito/imperfeito — те
// места курса, где текст вынужден пересказывать таблицу.
// ─────────────────────────────────────────────────────────────────────────────

export const PORTUGUESE_FIGURES: CourseFigures = {
  'ptbr-01': [{
    // Алфавит целиком — с бразильскими названиями букв. Названия нужны не для
    // красоты: их спрашивают в первый же день («как пишется фамилия?»), а по
    // англоязычной привычке ученик диктует «эйч, джей, дабл-ю» и его не понимают.
    after: 4,
    caption: 'Все 26 букв и как они называются по-бразильски',
    src: charGrid('Алфавит целиком', [
      [{ sym: 'A', read: 'а' }, { sym: 'B', read: 'бэ' }, { sym: 'C', read: 'сэ' }, { sym: 'D', read: 'дэ' }, { sym: 'E', read: 'э' }, { sym: 'F', read: 'эфи' }, { sym: 'G', read: 'жэ' }],
      [{ sym: 'H', read: 'ага' }, { sym: 'I', read: 'и' }, { sym: 'J', read: 'жота' }, { sym: 'K', read: 'ка' }, { sym: 'L', read: 'эли' }, { sym: 'M', read: 'эми' }, { sym: 'N', read: 'эни' }],
      [{ sym: 'O', read: 'о' }, { sym: 'P', read: 'пэ' }, { sym: 'Q', read: 'кэ' }, { sym: 'R', read: 'эхи' }, { sym: 'S', read: 'эси' }, { sym: 'T', read: 'тэ' }, { sym: 'U', read: 'у' }],
      [{ sym: 'V', read: 'вэ' }, { sym: 'W', read: 'дабл-ю' }, { sym: 'X', read: 'шис' }, { sym: 'Y', read: 'ипсилон' }, { sym: 'Z', read: 'зэ' }, null, null],
    ], {
      note: 'H в начале слова не читается вовсе (hoje [ожи]), а название буквы R — «эхи»: одиночная r между гласными звучит как «р», в начале слова как «х»',
    }),
  }, {
    after: 6,
    caption: 'Буквосочетания читаются не по буквам',
    src: formTable('Как читаются диграфы', ['Написано', 'Звучит', 'Пример'], [
      ['ch', 'ш', 'chave — «шави» (ключ)'],
      ['lh', 'ль', 'filho — «фильу» (сын)'],
      ['nh', 'нь', 'banho — «баньу» (ванна)'],
      ['ss', 'с', 'passar — «пасар»'],
      ['ç', 'с', 'começar — «комесар»'],
      ['qu / gu', 'к / г перед e, i', 'quero — «керу»'],
    ], { note: 'Безударное o на конце звучит как «у», а безударное e — как «и»: isso — «ису»' }),
  }],

  'ptbr-04': [{
    caption: 'Два глагола «быть» — постоянное и временное',
    src: contrastPair('ser и estar', {
      head: 'ser', sub: 'то, что не меняется',
      items: ['Eu sou russo — я русский', 'Ela é médica — она врач', 'É segunda-feira — сегодня понедельник'],
    }, {
      head: 'estar', sub: 'состояние и место сейчас',
      items: ['Estou cansado — я устал', 'Ela está em casa — она дома', 'A comida está fria — еда остыла'],
    }, { note: 'Ela é bonita — она красивая вообще; Ela está bonita — она красиво выглядит сегодня' }),
  }],

  'ptbr-07': [{
    caption: 'Три спряжения — три набора окончаний',
    src: formTable('Presente: -ar, -er, -ir', ['Лицо', 'falar', 'comer', 'partir'], [
      ['eu', 'falo', 'como', 'parto'],
      ['você / ele / ela', 'fala', 'come', 'parte'],
      ['nós', 'falamos', 'comemos', 'partimos'],
      ['vocês / eles', 'falam', 'comem', 'partem'],
    ], { note: 'В бразильской речи форм всего четыре: tu и vós почти не используются' }),
  }],

  'ptbr-10': [{
    caption: 'Время говорят через e (после) и para (до)',
    src: clockRow('Que horas são?', [
      { h: 3, m: 0, label: 'três horas' },
      { h: 7, m: 30, label: 'sete e meia' },
      { h: 10, m: 45, label: 'quinze para as onze' },
    ], { note: 'É uma hora — только про час; со всеми остальными São: São duas horas' }),
  }],

  'ptbr-17': [{
    caption: 'Два прошедших времени делят работу между собой',
    src: contrastPair('perfeito и imperfeito', {
      head: 'pretérito perfeito', sub: 'случилось один раз и закончилось',
      items: ['Ontem eu falei com ele', 'Fui ao Brasil em 2020', 'Ele fez o trabalho'],
    }, {
      head: 'pretérito imperfeito', sub: 'фон, привычка, «раньше обычно»',
      items: ['Eu falava com ele todo dia', 'Quando eu era criança…', 'Ele fazia isso sempre'],
    }, { note: 'Русский вид тут не помощник: «делал» может быть и falei, и falava — решает, был ли это один законченный случай' }),
  }],
}

export const PORTUGUESE_CELPE: LanguageCourseSpec = {
  key: 'ptbr',
  title: 'Бразильский португальский с нуля',
  subject: 'Португальский',
  level: 'A1 → A2 (фундамент под CELPE-Bras)',
  lang: 'pt-BR',
  guidedHours: '180–220',
  scopeNote: 'Охват — A1→A2. CELPE-Bras начинается с уровня Intermediário, поэтому курс к нему готовит логикой заданий, но сдавать экзамен рано.',
  modules: PORTUGUESE_MODULES,
  // Конспекты живут отдельным файлом: здесь — структура и задания, там —
  // то, что ученик читает.
  dialogs: PTBR_DIALOGS,
  units: PORTUGUESE_UNITS.map(u => ({
    ...u,
    theory: PORTUGUESE_THEORY[u.shortId] ?? u.theory,
    videoUrl: PORTUGUESE_VIDEO[u.shortId] ?? PORTUGUESE_VIDEO_EXTRA[u.shortId] ?? u.videoUrl,
    // Добор письма, говорения и аудирования в юниты, где их не было (см. аудит).
    tasks: [...u.tasks, ...(PORTUGUESE_EXTRA[u.shortId] ?? [])],
  })),
  // Схемы-доборы по итогам аудита живут отдельным файлом.
  figures: { ...PORTUGUESE_FIGURES, ...PORTUGUESE_FIGURES_EXTRA },
  // Живая речь в домашке — см. homeworkVideos.ts.
  homeworkVideos: PTBR_HOMEWORK_VIDEO,
}

export const COURSE_SUMMARY = courseSummary(PORTUGUESE_CELPE)
export const ALL_VOCAB: VocabItem[] = allVocab(PORTUGUESE_CELPE)

/** Юнит по короткому id. */
export function portugueseUnitByShortId(shortId: string): LangUnit | undefined {
  return unitByShortId(PORTUGUESE_CELPE, shortId)
}

/** Модуль, которому принадлежит юнит. */
export function portugueseModuleOf(n: number): LangModule | undefined {
  return moduleOfUnit(PORTUGUESE_CELPE, n)
}

/** Собрать курс для редактора конструктора. */
export function buildPortugueseCelpeCourse(courseId: string): CourseEdData {
  return buildLanguageCourse(PORTUGUESE_CELPE, courseId)
}
