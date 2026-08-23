// ─────────────────────────────────────────────────────────────────────────────
// Немецкий с нуля: A1 → B1, живой
//
// ЧТО ЭТО ЗА КУРС. Системный курс для человека, который живёт (или собирается
// жить) в немецкоязычной стране: от букв и артикля до придаточных, перфекта и
// писем в ведомство. Экзаменационной подготовки здесь нет намеренно — Goethe и
// telc проверяют формат, а не язык, и курс, написанный под них, тратит треть
// времени на разбор бланка ответа.
//
// ЧЕМ ОН ОТЛИЧАЕТСЯ ОТ РАЗГОВОРНИКА (survivalDe.ts). Разговорник даёт готовые
// формулы по ситуациям: приехал — заговорил. Этот курс отвечает на другой
// вопрос — почему фраза устроена так и как её переставить под себя. Они не
// заменяют друг друга и хорошо идут параллельно: ситуация из разговорника,
// правило отсюда.
//
// ПОРЯДОК ЮНИТОВ — ПО ТОМУ, ЧТО РАНЬШЕ НУЖНО ВСЛУХ, а не по логике учебника
// грамматики. Поэтому Akkusativ стоит раньше Dativ (haben и brauchen нужны в
// первую неделю), перфект раньше претеритума (в разговоре о прошлом немцы
// говорят перфектом), а Konjunktiv II появляется в юните 21, хотя формально
// это «продвинутая» тема: без hätte gern и könnten Sie вежливо не попросишь.
//
// АРТИКЛЬ В СЛОВАРЕ ЮНИТА СТОИТ ВСЕГДА. Слово без рода выучено наполовину —
// см. подробнее в шапке wordPacksDe.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildLanguageCourse, courseSummary,
  one, fill, pairsOf, order, grid, write, say, readAloud, wb,
  dictation, dictationBank, drill, reading,
} from './languageCourse'
import type { LangUnit, LanguageCourseSpec } from './languageCourse'
import type { CourseEdData } from '../pages/teacher/TeacherCourseEditorPage'

// ─── Юниты 1–8: звук, род, настоящее время, Akkusativ ────────────────────────

const UNITS_A1: LangUnit[] = [
  {
    n: 1,
    shortId: 'deab-01',
    title: 'Буквы и звуки: читаем по-немецки',
    goal: 'Прочитать вслух любое немецкое слово, даже незнакомое',
    grammar: 'Умлауты ä ö ü, ß, сочетания ch, sch, ei, ie, eu, äu, z, v, w, s',
    grammarWhy:
      'Немецкая орфография почти однозначна: выучив полтора десятка правил, вы читаете правильно ВСЁ. Это редкая удача — в английском такого нет, — и не воспользоваться ею в первый же день значит потом переучивать произношение сотен слов.',
    vocabTheme: 'Первые слова и имена',
    artifact: 'Запись: вы читаете вслух десять незнакомых слов и список городов',
    theory:
      'Немецкий читается по правилам. Это главное, что нужно знать в первый день: если вы знаете, как читается сочетание букв, вы прочитаете любое слово, включая то, которого никогда не видели, — и прочитаете его правильно.\n\nСамые важные правила. Буква v читается как «ф» (vier, Vater, von), а w — как «в» (was, wir, Wasser); латиница подсказывает наоборот, и это ошибка номер один. Буква z — это «ц» (zehn, Zeit), s перед гласной — «з» (sagen, Sonne), а sch — «ш» (Schule). Сочетание ei читается «ай» (mein, klein), а ie — долгое «и» (vier, wie). Сочетания eu и äu — «ой» (heute, Häuser).\n\nch — единственный звук, которого в русском нет в двух видах. После i, e и согласных это мягкое «хь» (ich, Kirche, Milch); после a, o, u — глубокое «х» (auch, Buch, machen).\n\nУмлауты не украшение, а другие звуки. ö — это «э», сказанное губами для «о» (schön). ü — это «и», сказанное губами для «у» (über, fühlen). ä — почти русское «э» (Mädchen). Буква ß всегда читается как глухое «с» и стоит только после долгой гласной: Straße, но dass.\n\nИ последнее: ударение в немецких словах почти всегда на первом слоге (ARbeit, MORgen), а в глаголах с отделяемой приставкой — на приставке (AUFstehen). У заимствований бывает иначе: StuDENT, TeleFON.',
    checklist: [
      'v = ф, w = в',
      'z = ц, s перед гласной = з',
      'ei = ай, ie = долгое и, eu/äu = ой',
      'ch мягкое после i/e, глубокое после a/o/u',
      'ß только после долгой гласной',
      'ударение на первом слоге',
    ],
    vocab: [
      { term: 'der Name', ru: 'имя, фамилия' },
      { term: 'die Straße', ru: 'улица' },
      { term: 'die Schule', ru: 'школа' },
      { term: 'das Buch', ru: 'книга' },
      { term: 'die Zeit', ru: 'время' },
      { term: 'das Wasser', ru: 'вода' },
      { term: 'die Milch', ru: 'молоко' },
      { term: 'heute', ru: 'сегодня' },
      { term: 'schön', ru: 'красивый; прекрасно' },
      { term: 'vier', ru: 'четыре' },
      { term: 'ich', ru: 'я' },
      { term: 'wir', ru: 'мы' },
    ],
    pattern: drill(
      'Wie schreibt man das? — …',
      'Как это пишется? — …',
      [
        ['Name', 'Wie schreibt man das? — N-A-M-E.', 'Диктовка по буквам — то, что спросят в первом же кабинете'],
        ['Straße', 'Wie schreibt man das? — S-T-R-A-ß-E.'],
        ['Schule', 'Wie schreibt man das? — S-C-H-U-L-E.'],
        ['Müller', 'Wie schreibt man das? — M-Ü-L-L-E-R.'],
      ],
      'Продиктуйте слово по буквам',
    ),
    tasks: [
      one('Как читается w в слове «Wasser»?', ['как «в»', 'как «ф»', 'как «у»', 'не читается'], 0),
      one('В каком слове ch звучит глубоко, как русское «х»?', ['ich', 'Kirche', 'Buch', 'Milch'], 2),
      pairsOf('Сопоставьте сочетание и звук', [
        ['ei', 'ай'],
        ['ie', 'долгое и'],
        ['eu', 'ой'],
        ['sch', 'ш'],
        ['z', 'ц'],
      ]),
      fill('Впишите пропущенную букву: Stra__e (улица)', 'ß', ['ss']),
      dictation('Напечатайте, что услышали', 'Ich heiße Anna.'),
      readAloud('Прочитайте вслух', 'Vier Freunde fahren heute nach München. Die Straße ist schön.'),
      say('Продиктуйте по буквам свою фамилию и название своего города — так, как это делают по телефону.', 60),
    ],
  },
  {
    n: 2,
    shortId: 'deab-02',
    title: 'Знакомство: Sie или du',
    goal: 'Поздороваться, представиться и не ошибиться в обращении',
    grammar: 'Личные местоимения, sein и heißen, вопрос без вопросительного слова',
    grammarWhy:
      'Sie и du — не оттенок вежливости, а форма глагола: выбрав неправильно, вы не «звучите мило», а нарушаете дистанцию. Это первое, что решает немец, открывая рот, и первое, чему стоит научиться.',
    vocabTheme: 'Приветствие, имя, страна, профессия',
    artifact: 'Короткий рассказ о себе на 40 секунд, записанный голосом',
    theory:
      'Немецкий заставляет выбрать обращение в каждом предложении. Sie — со взрослым незнакомым: продавец, врач, сосед, чиновник, коллега. Du — с детьми, друзьями, роднёй, студентами между собой. Переход на du предлагает старший по возрасту или должности (Wollen wir uns duzen?), а не вы.\n\nВежливое Sie всегда пишется с большой буквы, и это единственное, что отличает его на письме от sie («она», «они»).\n\nГлагол sein неправильный и учится наизусть: ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind. Второй базовый глагол — heißen: ich heiße, du heißt, er heißt.\n\nВопрос без вопросительного слова строится перестановкой: глагол выходит на первое место. Sie kommen aus Russland → Kommen Sie aus Russland? С вопросительным словом глагол снова второй: Woher kommen Sie?\n\nПрофессия называется без артикля — единственный случай, где немецкий ведёт себя как русский: Ich bin Lehrer. Ich bin Designerin. Женский вариант профессии образуется суффиксом -in, и в Германии его употребляют обязательно.',
    checklist: [
      'sein: bin, bist, ist, sind, seid, sind',
      'Sie с большой буквы, sie — со строчной',
      'вопрос без вопросительного слова: глагол первый',
      'профессия без артикля: Ich bin Ärztin',
    ],
    vocab: [
      { term: 'Guten Tag', ru: 'здравствуйте' },
      { term: 'Guten Morgen', ru: 'доброе утро' },
      { term: 'Auf Wiedersehen', ru: 'до свидания' },
      { term: 'Tschüss', ru: 'пока' },
      { term: 'heißen', ru: 'зваться (ich heiße — меня зовут)' },
      { term: 'kommen aus', ru: 'быть родом из' },
      { term: 'wohnen in', ru: 'жить, проживать в' },
      { term: 'der Beruf', ru: 'профессия' },
      { term: 'die Ärztin', ru: 'врач (женщина)' },
      { term: 'der Lehrer', ru: 'учитель' },
      { term: 'verheiratet', ru: 'в браке' },
      { term: 'Freut mich', ru: 'приятно познакомиться' },
    ],
    pattern: drill(
      'Ich … aus …',
      'Я из …',
      [
        ['Russland', 'Ich komme aus Russland.'],
        ['Kasachstan / Almaty', 'Ich komme aus Kasachstan, aus Almaty.'],
        ['wohnen / Berlin', 'Ich wohne in Berlin.'],
        ['Beruf / Designerin', 'Ich bin Designerin von Beruf.', 'Профессия — без артикля'],
      ],
    ),
    tasks: [
      one('Как обратиться к незнакомому взрослому в магазине?', ['du', 'Sie', 'ihr', 'es'], 1),
      one('Кто первым предлагает перейти на du?', ['младший', 'иностранец', 'старший по возрасту или должности', 'любой'], 2),
      fill('Впишите форму sein: Woher ___ Sie?', 'kommen', ['sind']),
      grid('Заполните пропуски в спряжении sein', ['Лицо', 'sein'], [
        ['ich', 'bin'],
        ['du', 'bist'],
        ['er/sie/es', 'ist'],
        ['wir', 'sind'],
        ['ihr', 'seid'],
        ['sie/Sie', 'sind'],
      ], { '1-1': true, '3-1': true, '5-1': true }),
      wb('Wie heißen Sie bitte', 'Соберите вежливый вопрос', ['heißt', 'du']),
      dictationBank('Соберите из плиток то, что услышали', 'Ich komme aus Russland und wohne in Leipzig.', ['bin', 'aus Berlin']),
      say('Представьтесь на «вы»: имя, откуда вы, где живёте, кем работаете. 40 секунд.', 60),
    ],
  },
  {
    n: 3,
    shortId: 'deab-03',
    title: 'Der, die, das: род и артикль',
    goal: 'Ставить артикль осознанно, а не наугад',
    grammar: 'Определённый и неопределённый артикль, kein, предсказуемые суффиксы рода',
    grammarWhy:
      'Артикль в немецком несёт род, число и падеж — то есть всю грамматику существительного. Пропущенный или неверный артикль ломает фразу сильнее, чем неверное слово, а выучить род потом, «когда будет время», не выходит ни у кого.',
    vocabTheme: 'Предметы дома и в городе',
    artifact: 'Собственный список 30 слов, разложенный по трём столбцам рода',
    theory:
      'Род в немецком принадлежит слову, а не предмету: das Mädchen («девочка») среднего рода потому, что кончается на -chen. Роды русского и немецкого не совпадают — солнце здесь женского рода (die Sonne), а луна мужского (der Mond), — поэтому переносить привычку нельзя.\n\nНо примерно треть слов выдаёт свой род окончанием, и это надо использовать:\n\n— die: -ung, -heit, -keit, -schaft, -ion, -tät, -ei (die Wohnung, die Freiheit, die Station);\n— das: -chen, -lein, -ment, -um (das Brötchen, das Dokument, das Zentrum);\n— der: дни недели, месяцы, времена года, осадки, слова на -er от глаголов (der Montag, der Regen, der Lehrer).\n\nНеопределённый артикль ein/eine называет предмет впервые, определённый der/die/das — уже известный. Во множественном числе неопределённого артикля нет вовсе.\n\nОтрицание существительного — не nicht, а kein: Ich habe keine Zeit. Это чисто немецкая вещь, и русское «у меня нет времени» через nicht звучит сломанно.\n\nПрактический совет: учите слово только вместе с артиклем и по возможности пачками одного рода — двадцать слов на der подряд, потом двадцать на die. Род запоминается ритмом, а не правилом.',
    checklist: [
      '-ung, -heit, -keit, -ion → die',
      '-chen, -lein, -ment, -um → das',
      'дни, месяцы, погода → der',
      'отрицание существительного — kein, не nicht',
    ],
    vocab: [
      { term: 'der Tisch', ru: 'стол' },
      { term: 'der Stuhl', ru: 'стул' },
      { term: 'die Tür', ru: 'дверь' },
      { term: 'das Fenster', ru: 'окно' },
      { term: 'die Wohnung', ru: 'квартира' },
      { term: 'das Zimmer', ru: 'комната' },
      { term: 'der Schlüssel', ru: 'ключ' },
      { term: 'die Rechnung', ru: 'счёт к оплате' },
      { term: 'das Dokument', ru: 'документ' },
      { term: 'die Möglichkeit', ru: 'возможность' },
      { term: 'das Brötchen', ru: 'булочка' },
      { term: 'der Montag', ru: 'понедельник' },
    ],
    pattern: drill(
      'Das ist … / Das sind …',
      'Это … (единственное) / Это … (множественное)',
      [
        ['Tisch', 'Das ist ein Tisch.'],
        ['Wohnung', 'Das ist eine Wohnung.'],
        ['Fenster', 'Das ist ein Fenster.'],
        ['Bücher', 'Das sind Bücher.', 'Во множественном неопределённого артикля нет'],
      ],
    ),
    tasks: [
      one('Какой артикль у слова Zeitung?', ['der', 'die', 'das', 'без артикля'], 1),
      one('Как сказать «у меня нет машины»?', ['Ich habe nicht ein Auto', 'Ich habe kein Auto', 'Ich habe nicht Auto', 'Ich habe keinen Auto'], 1),
      pairsOf('Сопоставьте суффикс и род', [
        ['-ung', 'die'],
        ['-chen', 'das'],
        ['-keit', 'die'],
        ['-ment', 'das'],
        ['месяцы и дни', 'der'],
      ]),
      fill('Впишите артикль: ___ Wohnung ist klein.', 'Die', ['die']),
      fill('Впишите артикль: Ich brauche ___ Schlüssel. (мужской род, Akkusativ)', 'den'),
      wb('Das ist eine Rechnung von der Hausverwaltung', 'Соберите предложение', ['ein', 'dem']),
      write('Выпишите двадцать слов из своей комнаты с артиклями и разложите по трём столбцам: der, die, das. Отметьте те, род которых предсказуем по суффиксу.'),
    ],
  },
  {
    n: 4,
    shortId: 'deab-04',
    title: 'Настоящее время и место глагола',
    goal: 'Строить обычное предложение и вопрос, не переставляя слова по-русски',
    grammar: 'Спряжение в настоящем, глагол на второй позиции, чередование гласной у сильных',
    grammarWhy:
      'Вторая позиция глагола — закон, который не нарушается, и калька с русского («Morgen ich fahre») выдаёт иностранца мгновенно. Чем раньше рука привыкнет ставить глагол вторым, тем меньше придётся переучивать.',
    vocabTheme: 'Обычный день, частотные глаголы',
    artifact: 'Восемь предложений о своём дне, где половина начинается не с подлежащего',
    theory:
      'Спряжение регулярно: machen → ich mache, du machst, er macht, wir machen, ihr macht, sie machen. У сильных глаголов во втором и третьем лице единственного числа меняется корневая гласная: fahren → du fährst, er fährt; sprechen → du sprichst, er spricht; lesen → du liest, er liest.\n\nГлавное правило порядка слов: спрягаемый глагол стоит на второй позиции — не вторым словом, а вторым членом предложения. Если впереди стоит обстоятельство, подлежащее уезжает за глагол: Morgen fahre ich nach Berlin. Heute habe ich viel zu tun.\n\nВопрос с вопросительным словом сохраняет вторую позицию (Wann kommst du?), вопрос без него выносит глагол вперёд (Kommst du?).\n\nНастоящее время в немецком отвечает и за будущее: Morgen fahre ich nach Berlin значит «завтра поеду». Отдельная форма с werden нужна для предсказаний и обещаний, и до неё дело дойдёт в юните 24.\n\nИ ещё одно: аналога английского Present Continuous в немецком нет. «Я сейчас работаю» — это Ich arbeite gerade, а не «Ich bin arbeiten».',
    checklist: [
      'окончания -e, -st, -t, -en, -t, -en',
      'сильные: a → ä, e → i/ie во 2-м и 3-м лице',
      'глагол всегда второй',
      'настоящее время годится для будущего',
    ],
    vocab: [
      { term: 'arbeiten', ru: 'работать' },
      { term: 'machen', ru: 'делать' },
      { term: 'gehen', ru: 'идти' },
      { term: 'fahren', ru: 'ехать (du fährst)' },
      { term: 'sprechen', ru: 'говорить (du sprichst)' },
      { term: 'lesen', ru: 'читать (du liest)' },
      { term: 'essen', ru: 'есть (du isst)' },
      { term: 'schlafen', ru: 'спать (du schläfst)' },
      { term: 'lernen', ru: 'учить что-то' },
      { term: 'brauchen', ru: 'нуждаться' },
      { term: 'gerade', ru: 'сейчас, как раз' },
      { term: 'immer', ru: 'всегда' },
    ],
    pattern: drill(
      '… fahre ich nach …',
      '… я еду в …',
      [
        ['Morgen / Berlin', 'Morgen fahre ich nach Berlin.', 'Обстоятельство впереди — подлежащее за глаголом'],
        ['Am Montag / Leipzig', 'Am Montag fahre ich nach Leipzig.'],
        ['Heute / Arbeit', 'Heute gehe ich zur Arbeit.'],
        ['Jetzt / Hause', 'Jetzt gehe ich nach Hause.'],
      ],
    ),
    tasks: [
      one('Как правильно?', ['Morgen ich fahre nach Köln.', 'Morgen fahre ich nach Köln.', 'Ich morgen fahre nach Köln.', 'Fahre morgen ich nach Köln.'], 1),
      one('Как будет «он читает»?', ['er lest', 'er liest', 'er lesst', 'er lesen'], 1),
      fill('Впишите форму: Du ___ sehr schnell. (sprechen)', 'sprichst'),
      grid('Заполните таблицу спряжения', ['Лицо', 'machen', 'fahren'], [
        ['ich', 'mache', 'fahre'],
        ['du', 'machst', 'fährst'],
        ['er/sie/es', 'macht', 'fährt'],
        ['wir', 'machen', 'fahren'],
      ], { '1-2': true, '2-1': true, '2-2': true }),
      wb('Am Wochenende arbeite ich nicht', 'Соберите предложение с обстоятельством впереди', ['ich arbeite', 'kein']),
      dictation('Напечатайте, что услышали', 'Heute arbeite ich bis achtzehn Uhr.'),
      write('Напишите восемь предложений о своём обычном дне. В четырёх из них поставьте на первое место обстоятельство времени (Morgens, Um acht, Danach, Am Abend) и проследите за местом глагола.'),
    ],
  },
  {
    n: 5,
    shortId: 'deab-05',
    title: 'Числа, время и расписание',
    goal: 'Понимать цену, время приёма и объявление на слух',
    grammar: 'Числительные, время (halb, Viertel), предлоги времени um, am, im',
    grammarWhy:
      'Числа в немецком перевёрнуты (einundzwanzig — «один-и-двадцать»), и на слух это ломается первым: перепутанный номер дома, сумма или время приёма стоят дороже любой грамматической ошибки.',
    vocabTheme: 'Числа, время, дни недели, месяцы',
    artifact: 'Ваше недельное расписание по-немецки, с временем и днями',
    theory:
      'Числа до двенадцати учатся списком, дальше собираются: 13–19 — единица + zehn (dreizehn), десятки — на -zig (zwanzig, dreißig — обратите внимание на ß), а составные читаются в обратном порядке: 21 — einundzwanzig, 87 — siebenundachtzig.\n\nЦену называют так: neun Euro neunzig или просто neun neunzig. Запятая — десятичный разделитель, точка отделяет тысячи: 1.500,00.\n\nВремя. В расписаниях всегда 24 часа: 18:30 — achtzehn Uhr dreißig. В речи говорят halb sieben — и это 6:30, а не 7:30: счёт идёт до следующего часа. Viertel nach acht — 8:15, Viertel vor acht — 7:45.\n\nПредлоги времени: um для часа (um neun Uhr), am для дней и частей суток (am Montag, am Abend, но in der Nacht), im для месяцев и времён года (im Mai, im Sommer).\n\nИ культурная деталь, которая важнее грамматики: назначенное время в Германии соблюдают. Прийти к девяти значит быть на месте без пяти; опоздание на десять минут требует звонка, а в ведомстве отменяет запись.',
    checklist: [
      'einundzwanzig: сначала единицы',
      'halb sieben = 6:30',
      'um + час, am + день, im + месяц',
      'запятая — десятичный разделитель',
    ],
    vocab: [
      { term: 'die Uhr', ru: 'час; часы' },
      { term: 'halb', ru: 'половина' },
      { term: 'das Viertel', ru: 'четверть' },
      { term: 'der Termin', ru: 'запись на приём, назначенная встреча' },
      { term: 'die Woche', ru: 'неделя' },
      { term: 'der Monat', ru: 'месяц' },
      { term: 'pünktlich', ru: 'вовремя, пунктуальный' },
      { term: 'die Verspätung', ru: 'опоздание' },
      { term: 'geöffnet', ru: 'открыто' },
      { term: 'geschlossen', ru: 'закрыто' },
      { term: 'der Feierabend', ru: 'конец рабочего дня' },
      { term: 'die Öffnungszeiten', ru: 'часы работы' },
    ],
    pattern: drill(
      'Der Termin ist … um …',
      'Приём в … в … часов',
      [
        ['Montag / 9:00', 'Der Termin ist am Montag um neun Uhr.'],
        ['Donnerstag / 14:30', 'Der Termin ist am Donnerstag um halb drei.', 'halb drei — это 14:30'],
        ['Freitag / 8:15', 'Der Termin ist am Freitag um Viertel nach acht.'],
        ['Mai / 10:45', 'Der Termin ist im Mai um Viertel vor elf.'],
      ],
    ),
    tasks: [
      one('Сколько времени, если сказали «halb sieben»?', ['7:30', '6:30', '7:00', '6:00'], 1),
      one('Как звучит число 87?', ['achtzigsieben', 'siebenundachtzig', 'achtundsiebzig', 'siebzigacht'], 1),
      fill('Впишите предлог: Ich habe ___ Montag einen Termin.', 'am'),
      fill('Впишите предлог: ___ Sommer fahren wir nach Italien.', 'Im', ['im']),
      pairsOf('Сопоставьте время и запись', [
        ['halb neun', '8:30'],
        ['Viertel nach zehn', '10:15'],
        ['Viertel vor sechs', '5:45'],
        ['zwanzig Uhr fünfzehn', '20:15'],
      ]),
      dictation('Напечатайте цифрами то, что услышали', 'Der Zug fährt um sechzehn Uhr zweiundvierzig.'),
      say('Расскажите своё расписание на неделю: когда работаете, когда учитесь, когда свободны. Употребите am, um и im.', 90),
    ],
  },
  {
    n: 6,
    shortId: 'deab-06',
    title: 'Akkusativ: у меня есть, мне нужно',
    goal: 'Сказать, что у вас есть, чего нет и что вам нужно',
    grammar: 'Akkusativ, глаголы haben, brauchen, es gibt, предлоги für, ohne, um, durch, gegen',
    grammarWhy:
      'Русское «у меня есть» немецкий строит через «я имею», и после haben всегда идёт Akkusativ. Это первая точка, где падеж действительно нужен вслух, и здесь же выучивается единственное реальное изменение: der → den.',
    vocabTheme: 'Вещи, документы, покупки',
    artifact: 'Список того, что нужно взять с собой в ведомство, — с артиклями в Akkusativ',
    theory:
      'Akkusativ — падеж прямого дополнения: Ich sehe den Mann. Хорошая новость в том, что меняется только мужской род: der → den, ein → einen, kein → keinen, mein → meinen. Женский, средний и множественное выглядят как в Nominativ.\n\nAkkusativ требуют самые частые глаголы: haben, brauchen, sehen, kaufen, nehmen, essen, trinken, suchen, finden.\n\nОборот es gibt («имеется, есть») тоже управляет Akkusativ: Es gibt einen Supermarkt in der Nähe. Он отвечает на вопрос «что вообще существует в этом месте», в отличие от haben — «у кого что есть».\n\nПять предлогов всегда с Akkusativ и учатся строчкой: durch, für, gegen, ohne, um.\n\nТипичная ошибка русскоязычного — поставить Akkusativ после sein: «Das ist einen Freund». После sein, werden и bleiben всегда Nominativ, потому что это не действие над предметом, а называние.',
    checklist: [
      'der → den, ein → einen',
      'haben, brauchen, es gibt + Akkusativ',
      'durch, für, gegen, ohne, um + Akkusativ',
      'после sein — Nominativ',
    ],
    vocab: [
      { term: 'haben', ru: 'иметь (ich habe, du hast, er hat)' },
      { term: 'der Ausweis', ru: 'удостоверение личности' },
      { term: 'der Pass', ru: 'паспорт' },
      { term: 'das Formular', ru: 'бланк, формуляр' },
      { term: 'die Unterlagen', ru: 'документы (комплект)' },
      { term: 'suchen', ru: 'искать' },
      { term: 'finden', ru: 'находить; считать' },
      { term: 'kaufen', ru: 'покупать' },
      { term: 'es gibt', ru: 'есть, имеется (+ Akkusativ)' },
      { term: 'für', ru: 'для (+ Akkusativ)' },
      { term: 'ohne', ru: 'без (+ Akkusativ)' },
      { term: 'die Tasche', ru: 'сумка' },
    ],
    pattern: drill(
      'Ich brauche …',
      'Мне нужен / нужна …',
      [
        ['der Termin', 'Ich brauche einen Termin.'],
        ['die Bescheinigung', 'Ich brauche eine Bescheinigung.'],
        ['das Formular', 'Ich brauche ein Formular.'],
        ['kein Auto', 'Ich brauche kein Auto.'],
      ],
    ),
    tasks: [
      one('Как правильно?', ['Ich habe einen Termin.', 'Ich habe ein Termin.', 'Ich habe einem Termin.', 'Ich habe der Termin.'], 0),
      one('Как сказать «здесь есть аптека»?', ['Hier hat eine Apotheke.', 'Es gibt hier eine Apotheke.', 'Hier ist es eine Apotheke.', 'Hier gibt eine Apotheke.'], 1),
      fill('Впишите артикль: Ich sehe ___ Mann. (der Mann)', 'den'),
      fill('Впишите артикль: Das ist ___ Freund von mir. (ein)', 'ein'),
      pairsOf('Сопоставьте предлог и падеж', [
        ['für', 'Akkusativ'],
        ['ohne', 'Akkusativ'],
        ['mit', 'Dativ'],
        ['nach', 'Dativ'],
      ]),
      wb('Ich brauche einen Termin beim Bürgeramt', 'Соберите предложение', ['ein', 'der']),
      write('Составьте список из десяти вещей, которые нужно взять на приём в ведомство. Каждая строка — предложение с Ich brauche… и правильным артиклем.'),
    ],
  },
  {
    n: 7,
    shortId: 'deab-07',
    title: 'Модальные: можно, нужно, нельзя',
    goal: 'Просить разрешения, говорить об обязанности и понимать запрет',
    grammar: 'können, müssen, dürfen, wollen, sollen, mögen/möchten; рамка предложения',
    grammarWhy:
      'Модальные — первая встреча с немецкой рамкой: спрягаемый глагол вторым, смысловой в конце. И здесь же лежит ловушка, которая стоит дороже всех остальных: nicht müssen значит «не обязательно», а «нельзя» — только nicht dürfen.',
    vocabTheme: 'Правила, разрешения, запреты',
    artifact: 'Свод правил вашего дома или офиса: пять «можно» и пять «нельзя»',
    theory:
      'Модальный глагол спрягается и встаёт на вторую позицию, а смысловой уходит в конец в инфинитиве: Ich muss heute länger arbeiten. Между ними натянута рамка — это то же устройство, что и у перфекта, и у отделяемых приставок.\n\nВ единственном числе у модальных меняется гласная и нет окончания в первом и третьем лице: ich kann, er kann; ich muss, er muss; ich darf, er darf.\n\nЗначения. können — «мочь, уметь». müssen — «быть должным» по обстоятельствам. dürfen — «иметь разрешение». sollen — «следует» по чужому указанию. wollen — «намереваться» (звучит твёрдо). mögen — «нравиться», а его форма möchten — вежливое «хотел бы».\n\nСамое важное — отрицание. Sie müssen nicht warten значит «вам не обязательно ждать». Запрет — только Sie dürfen nicht warten. Перепутать эти две фразы значит сказать противоположное, и в объявлениях (Hier darf man nicht rauchen) вы встретите именно dürfen.\n\nВ заказе и просьбе почти всегда используется möchten: Ich möchte einen Kaffee звучит нормально, Ich will einen Kaffee — требовательно.',
    checklist: [
      'модальный второй, инфинитив в конце',
      'ich kann / er kann — без окончания',
      'nicht dürfen = нельзя, nicht müssen = не обязательно',
      'möchten вместо wollen в просьбе',
    ],
    vocab: [
      { term: 'können', ru: 'мочь, уметь' },
      { term: 'müssen', ru: 'быть должным' },
      { term: 'dürfen', ru: 'иметь разрешение' },
      { term: 'sollen', ru: 'следует, велено' },
      { term: 'wollen', ru: 'хотеть, намереваться' },
      { term: 'möchten', ru: 'хотел бы (вежливо)' },
      { term: 'erlaubt', ru: 'разрешено' },
      { term: 'verboten', ru: 'запрещено' },
      { term: 'rauchen', ru: 'курить' },
      { term: 'parken', ru: 'парковаться' },
      { term: 'die Regel', ru: 'правило' },
      { term: 'leise', ru: 'тихо' },
    ],
    pattern: drill(
      'Hier darf man … / Hier darf man nicht …',
      'Здесь можно … / Здесь нельзя …',
      [
        ['rauchen', 'Hier darf man nicht rauchen.'],
        ['parken', 'Hier darf man nicht parken.'],
        ['fotografieren', 'Hier darf man fotografieren.'],
        ['nach 22 Uhr / bohren', 'Nach zweiundzwanzig Uhr darf man nicht bohren.'],
      ],
    ),
    tasks: [
      one('«Здесь нельзя парковаться» —', ['Hier muss man nicht parken.', 'Hier darf man nicht parken.', 'Hier kann man nicht parken.', 'Hier soll man nicht parken.'], 1),
      one('Что значит «Sie müssen nicht kommen»?', ['Вам нельзя приходить', 'Вам не обязательно приходить', 'Вы обязаны прийти', 'Вам следует прийти'], 1),
      grid('Заполните таблицу модальных', ['Лицо', 'können', 'müssen', 'dürfen'], [
        ['ich', 'kann', 'muss', 'darf'],
        ['du', 'kannst', 'musst', 'darfst'],
        ['er/sie/es', 'kann', 'muss', 'darf'],
        ['wir', 'können', 'müssen', 'dürfen'],
      ], { '0-2': true, '1-3': true, '2-1': true }),
      wb('Ich muss morgen früher aufstehen', 'Соберите предложение с рамкой', ['aufstehe', 'kann']),
      fill('Впишите модальный: ___ ich hier sitzen? (вежливо, о разрешении)', 'Darf', ['darf']),
      dictation('Напечатайте, что услышали', 'Ich möchte einen Termin vereinbaren.'),
      write('Напишите свод правил вашего дома или офиса: пять предложений с dürfen (можно) и пять с nicht dürfen (нельзя). Проверьте, что смысловой глагол стоит в конце.'),
    ],
  },
  {
    n: 8,
    shortId: 'deab-08',
    title: 'Отделяемые приставки и распорядок дня',
    goal: 'Рассказать о своём дне так, чтобы глагол не разваливался посреди фразы',
    grammar: 'Отделяемые и неотделяемые приставки, порядок обстоятельств te-ka-mo-lo',
    grammarWhy:
      'Aufstehen в предложении разваливается пополам, и вторая половина уезжает в конец. Не зная этого, человек говорит «Ich stehe um sieben» — то есть «я стою в семь». Смысл держится на последнем слове фразы, и произносить его надо обязательно.',
    vocabTheme: 'Утро, день, вечер',
    artifact: 'Аудиорассказ о своём дне на минуту, с пятью отделяемыми глаголами',
    theory:
      'В инфинитиве глагол целый (aufstehen), в предложении спрягаемая часть встаёт второй, а приставка уходит в самый конец: Ich stehe um sieben auf.\n\nПриставка отделяется, если на неё падает ударение: AUFstehen, ANrufen, EINkaufen, MITkommen, ABfahren, AUSfüllen. Не отделяются безударные ver-, be-, ent-, er-, zer-, ge-, emp-, miss-: verstehen, bekommen, erklären.\n\nВ придаточном предложении глагол собирается обратно: …, weil ich um sieben aufstehe. В перфекте ge- встаёт внутрь слова: aufgestanden, angerufen.\n\nВторая тема юнита — порядок обстоятельств. Немецкий ставит их так: когда — почему — как — где (te-ka-mo-lo). Ich fahre heute wegen der Prüfung mit dem Bus in die Stadt. Русская привычка ставить место раньше времени («Ich gehe ins Kino heute Abend») даёт фразу, которая звучит переставленной.',
    checklist: [
      'приставка уезжает в конец: Ich stehe … auf',
      'ver-, be-, ent-, er- не отделяются',
      'в придаточном глагол снова целый',
      'порядок: время → причина → способ → место',
    ],
    vocab: [
      { term: 'aufstehen', ru: 'вставать (отделяемая)' },
      { term: 'anrufen', ru: 'звонить по телефону (отделяемая)' },
      { term: 'einkaufen', ru: 'закупаться (отделяемая)' },
      { term: 'abfahren', ru: 'отправляться (отделяемая)' },
      { term: 'ankommen', ru: 'прибывать (отделяемая)' },
      { term: 'ausfüllen', ru: 'заполнять (отделяемая)' },
      { term: 'mitkommen', ru: 'идти вместе (отделяемая)' },
      { term: 'verstehen', ru: 'понимать (неотделяемая)' },
      { term: 'bekommen', ru: 'получать (неотделяемая)' },
      { term: 'frühstücken', ru: 'завтракать' },
      { term: 'das Frühstück', ru: 'завтрак' },
      { term: 'danach', ru: 'после этого' },
    ],
    pattern: drill(
      'Ich … um … …',
      'Я … в … часов',
      [
        ['aufstehen / 7', 'Ich stehe um sieben auf.'],
        ['anrufen / 9', 'Ich rufe um neun an.'],
        ['einkaufen / 18', 'Ich kaufe um achtzehn Uhr ein.'],
        ['ankommen / 20', 'Der Zug kommt um zwanzig Uhr an.'],
      ],
    ),
    tasks: [
      one('Как правильно: «Я звоню маме»?', ['Ich anrufe meine Mutter.', 'Ich rufe meine Mutter an.', 'Ich rufe an meine Mutter.', 'Ich anrufe an meine Mutter.'], 1),
      one('Какой глагол НЕ отделяется?', ['aufstehen', 'einkaufen', 'verstehen', 'mitkommen'], 2),
      order('Расставьте части предложения в немецком порядке', [
        'Ich fahre',
        'morgen',
        'wegen der Arbeit',
        'mit dem Zug',
        'nach Hamburg',
      ]),
      fill('Допишите фразу: Ich stehe jeden Tag um halb sieben ___ .', 'auf'),
      wb('Füllen Sie bitte das Formular aus', 'Соберите вежливую просьбу', ['ausfüllen', 'Sie füllen']),
      dictation('Напечатайте, что услышали', 'Der Zug kommt um neunzehn Uhr an.'),
      say('Расскажите свой день от подъёма до сна. Употребите не меньше пяти отделяемых глаголов и следите, чтобы приставка была произнесена.', 90),
    ],
  },
]
