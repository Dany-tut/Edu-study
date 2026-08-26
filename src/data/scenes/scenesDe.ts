// ─────────────────────────────────────────────────────────────────────────────
// Сцены на немецком
//
// ПОДЛИННЫЙ ТЕКСТ — Project Gutenberg: Кафка (ум. 1924, издание 1917), Гримм
// (1857), Фонтане (1895), Шторм (1888). Все четверо проходят по обоим срокам
// сразу: автор умер до 1955 и вещь издана до 1930.
//
// ОРФОГРАФИЯ СТАРАЯ, И ЭТО ВАЖНО. Во всех четырёх текстах daß вместо dass,
// häßlich вместо hässlich, muß вместо muss: реформа 1996 года их не касалась,
// потому что напечатаны они за сто лет до неё. Текст оставлен как есть —
// подделывать написание автора мы не будем, — но у каждого произведения
// заполнен `source.caveat`, и предупреждение показывается ДО чтения. Иначе
// ученик спокойно заучит daß, а это ровно та ошибка, которую потом выбивают.
//
// КАВЫЧКИ »ТАКИЕ« И „ТАКИЕ“ — тоже немецкая типографика, а не сбой кодировки.
//
// СЕРИАЛЫ — ТОЛЬКО НАШ ТЕКСТ. Dark и «Турецкий для начинающих» современные, и
// пересказ их сцены с теми же героями был бы производным произведением.
// Поэтому от сериала берётся тема и регистр речи, а диалог написан нами: это
// помечено полем textOrigin: 'ours' и видно ученику.
// ─────────────────────────────────────────────────────────────────────────────

import type { Scene } from './index'

export const DE_SCENES: Scene[] = [
  // ── Кафка, «Превращение» ───────────────────────────────────────────────────
  {
    id: 'sc-verwandlung-1',
    workId: 'kafka-verwandlung',
    lang: 'de', title: 'Утро, с которого всё начинается', level: 'B2', minutes: 4,
    topic: 'Дом и город', skill: 'Чтение',
    order: 1, where: 'Часть I, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Franz Kafka, Die Verwandlung (1915/1917) · Project Gutenberg',
    setup: 'Первые абзацы повести. Обратите внимание, чего в них НЕТ: удивления, крика, вопроса «как это возможно». Грегор осматривает своё новое тело так же деловито, как осматривал бы пятно на пиджаке, — и через минуту начнёт беспокоиться о поезде.',
    after: 'Дальше выяснится, что беспокоит его действительно поезд: он коммивояжёр, он никогда не опаздывал, и в прихожей уже стоит управляющий из фирмы. Ужас в этой книге устроен как бытовая неприятность.',
    body: `Als Gregor Samsa eines Morgens aus unruhigen Träumen erwachte, fand er sich in seinem Bett zu einem ungeheueren Ungeziefer verwandelt. Er lag auf seinem panzerartig harten Rücken und sah, wenn er den Kopf ein wenig hob, seinen gewölbten, braunen, von bogenförmigen Versteifungen geteilten Bauch, auf dessen Höhe sich die Bettdecke, zum gänzlichen Niedergleiten bereit, kaum noch erhalten konnte. Seine vielen, im Vergleich zu seinem sonstigen Umfang kläglich dünnen Beine flimmerten ihm hilflos vor den Augen.

»Was ist mit mir geschehen?« dachte er. Es war kein Traum. Sein Zimmer, ein richtiges, nur etwas zu kleines Menschenzimmer, lag ruhig zwischen den vier wohlbekannten Wänden. Über dem Tisch, auf dem eine auseinandergepackte Musterkollektion von Tuchwaren ausgebreitet war -- Samsa war Reisender --, hing das Bild, das er vor kurzem aus einer illustrierten Zeitschrift ausgeschnitten und in einem hübschen, vergoldeten Rahmen untergebracht hatte.

Gregors Blick richtete sich dann zum Fenster, und das trübe Wetter -- man hörte Regentropfen auf das Fensterblech aufschlagen -- machte ihn ganz melancholisch. »Wie wäre es, wenn ich noch ein wenig weiterschliefe und alle Narrheiten vergäße,« dachte er, aber das war gänzlich undurchführbar, denn er war gewöhnt, auf der rechten Seite zu schlafen, konnte sich aber in seinem gegenwärtigen Zustand nicht in diese Lage bringen.`,
    translation: `Проснувшись однажды утром после беспокойного сна, Грегор Замза обнаружил, что он у себя в постели превратился в громадное насекомое. Он лежал на панцирно-твёрдой спине и, приподняв голову, видел свой выпуклый, коричневый, разделённый дугообразными чешуйками живот, на верхушке которого едва держалось готовое вот-вот окончательно сползти одеяло. Его многочисленные, убого тонкие по сравнению с остальным телом ножки беспомощно мельтешили у него перед глазами.

«Что со мной случилось?» — подумал он. Это не было сном. Его комната, настоящая, разве что слишком маленькая, обычная комната, мирно покоилась в своих четырёх хорошо знакомых стенах. Над столом, где были разложены распакованные образцы сукон — Замза был коммивояжёром, — висел портрет, который он недавно вырезал из иллюстрированного журнала и вставил в красивую позолоченную рамку.

Затем взгляд Грегора устремился в окно, и пасмурная погода — слышно было, как по жести подоконника стучат капли дождя — привела его в состояние грусти. «Хорошо бы ещё немного поспать и забыть всю эту чепуху», — подумал он, но это было совершенно неосуществимо, он привык спать на правом боку, а в теперешнем своём положении он никак не мог принять этого положения.`,
    glossary: [
      { term: 'erwachen', ru: 'просыпаться (книжное; в речи — aufwachen)' },
      { term: 'das Ungeziefer', ru: 'насекомое-вредитель, паразит' },
      { term: 'verwandelt', ru: 'превращённый (от verwandeln)' },
      { term: 'die Bettdecke', ru: 'одеяло' },
      { term: 'kläglich', ru: 'жалкий, убогий' },
      { term: 'der Reisende', ru: 'здесь: коммивояжёр, разъездной торговый агент' },
      { term: 'trüb', ru: 'пасмурный, мутный' },
      { term: 'undurchführbar', ru: 'неосуществимый' },
      { term: 'gewöhnt sein', ru: 'иметь привычку, быть приученным' },
    ],
    questions: [
      {
        q: 'Was bemerkt Gregor als Erstes an sich?',
        options: ['Dass er krank ist', 'Dass er verschlafen hat', 'Dass er sich in ein Ungeziefer verwandelt hat', 'Dass jemand im Zimmer ist'],
        correct: 2,
      },
      {
        q: 'Wie reagiert Gregor auf die Verwandlung?',
        options: ['Er schreit um Hilfe', 'Er hält es für einen Traum und beruhigt sich', 'Er betrachtet ruhig seinen Körper und denkt ans Weiterschlafen', 'Er ruft sofort einen Arzt'],
        correct: 2,
        why: '«Es war kein Traum» — он сразу принимает это как факт и думает о том, чтобы поспать ещё. На этом спокойствии держится вся книга.',
      },
      {
        q: 'Was war Gregor von Beruf?',
        options: ['Lehrer', 'Arzt', 'Reisender (Handelsvertreter)', 'Beamter'],
        correct: 2,
        why: 'Прямо в тексте, в скобках: «Samsa war Reisender».',
      },
      {
        q: 'Warum kann Gregor nicht weiterschlafen?',
        options: ['Es ist zu laut draußen', 'Die Schwester ruft ihn', 'Es ist schon Mittag', 'Er kann sich nicht auf die rechte Seite drehen'],
        correct: 3,
      },
    ],
  },

  // ── Гримм, «Король-лягушонок» ──────────────────────────────────────────────
  {
    id: 'sc-froschkoenig-1',
    workId: 'grimm-maerchen',
    lang: 'de', title: 'Золотой мяч в колодце', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Der Froschkönig oder der eiserne Heinrich, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Brüder Grimm, Kinder- und Hausmärchen (1857) · Project Gutenberg',
    setup: 'Первая сказка сборника — та самая, с которой у Гриммов начинается всё собрание. Сюжет знаком с детства, и это главное: смысл разгадывать не нужно, видно только, КАК это сказано. Обратите внимание на претеритум — lebte, ging, warf: в живой речи так не говорят, а в книгах говорят только так.',
    after: 'Лягушонок достанет мяч, королевна убежит, не сдержав слова, — и вечером он постучится в дверь замка. Дальше начинается то, ради чего сказку и рассказывают: отец заставит дочь выполнить обещание.',
    body: `In den alten Zeiten, wo das Wünschen noch geholfen hat, lebte ein König, dessen Töchter waren alle schön, aber die jüngste war so schön, daß die Sonne selber, die doch so vieles gesehen hat, sich verwunderte, so oft sie ihr ins Gesicht schien. Nahe bei dem Schlosse des Königs lag ein großer dunkler Wald, und in dem Walde unter einer alten Linde war ein Brunnen: wenn nun der Tag sehr heiß war, so ging das Königskind hinaus in den Wald und setzte sich an den Rand des kühlen Brunnens: und wenn sie Langeweile hatte, so nahm sie eine goldene Kugel, warf sie in die Höhe und fing sie wieder; und das war ihr liebstes Spielwerk.

Nun trug es sich einmal zu, daß die goldene Kugel der Königstochter nicht in ihr Händchen fiel, sondern vorbei auf die Erde schlug und geradezu ins Wasser hineinrollte. Die Königstochter folgte ihr mit den Augen nach, aber die Kugel verschwand, und der Brunnen war tief, so tief, daß man keinen Grund sah. Da fing sie an zu weinen und weinte immer lauter und konnte sich gar nicht trösten.

Und wie sie so klagte, rief ihr jemand zu: »Was hast du vor, Königstochter, du schreist ja, daß sich ein Stein erbarmen möchte.« Sie sah sich um, woher die Stimme käme, da erblickte sie einen Frosch, der seinen dicken häßlichen Kopf aus dem Wasser streckte. »Ach, du bist's, alter Wasserpatscher,« sagte sie, »ich weine über meine goldene Kugel, die mir in den Brunnen hinabgefallen ist.«`,
    translation: `В старые времена, когда желания ещё сбывались, жил-был король; все дочери его были красивы, но младшая была так хороша, что даже солнце, немало повидавшее на свете, всякий раз дивилось, заглядывая ей в лицо. Возле королевского замка был большой тёмный лес, а в лесу, под старой липой, — колодец. И когда день бывал очень жаркий, королевна выходила в лес и садилась на край прохладного колодца; а когда ей становилось скучно, брала золотой мяч, подбрасывала его вверх и снова ловила — это была её любимая забава.

И вот однажды случилось так, что золотой мяч королевны упал не в её ручку, а мимо, на землю, и покатился прямо в воду. Королевна проводила его глазами, но мяч исчез, а колодец был глубок, так глубок, что и дна не было видно. Тут она заплакала и плакала всё громче и никак не могла утешиться.

И пока она так причитала, кто-то ей крикнул: «Что с тобой, королевна? Ты так кричишь, что и камень бы сжалился». Она огляделась, откуда голос, и увидела лягушонка, высунувшего из воды свою толстую безобразную голову. «Ах, это ты, старый водяной шлёпальщик, — сказала она, — я плачу о моём золотом мяче, который упал в колодец».`,
    glossary: [
      { term: 'sich verwundern', ru: 'дивиться, изумляться' },
      { term: 'der Brunnen', ru: 'колодец; источник' },
      { term: 'die Linde', ru: 'липа' },
      { term: 'das Spielwerk', ru: 'забава, игрушка (устаревшее)' },
      { term: 'sich zutragen', ru: 'случаться, происходить (книжное)' },
      { term: 'trösten', ru: 'утешать; sich trösten — утешиться' },
      { term: 'erbarmen', ru: 'сжалиться' },
      { term: 'erblicken', ru: 'увидеть, заметить' },
      { term: 'häßlich (совр. hässlich)', ru: 'безобразный, уродливый' },
    ],
    questions: [
      {
        q: 'Wo verliert die Königstochter ihre goldene Kugel?',
        options: ['Im Schloss', 'Im Brunnen im Wald', 'Im Fluss', 'Im Garten'],
        correct: 1,
      },
      {
        q: 'Warum weint die Königstochter?',
        options: ['Weil der Frosch sie erschreckt hat', 'Weil sie sich verlaufen hat', 'Weil ihre Kugel im tiefen Brunnen verschwunden ist', 'Weil der Vater böse ist'],
        correct: 2,
      },
      {
        q: 'Welche Zeitform benutzt das Märchen für die Erzählung?',
        options: ['Perfekt', 'Plusquamperfekt', 'Präteritum', 'Futur'],
        correct: 2,
        why: 'lebte, ging, warf, fing an — претеритум. Именно поэтому сказки Гриммов удобны: это тот немецкий, который встречается в книгах и почти не встречается в устной речи.',
      },
      {
        q: 'Wie nennt die Königstochter den Frosch?',
        options: ['alter Freund', 'alter Wasserpatscher', 'lieber Herr', 'kleiner König'],
        correct: 1,
      },
    ],
  },

  // ── Гримм, «Гензель и Гретель» ─────────────────────────────────────────────
  {
    id: 'sc-haensel-1',
    workId: 'grimm-maerchen',
    lang: 'de', title: 'Разговор родителей ночью', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 2, where: 'Hänsel und Gretel, начало', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Brüder Grimm, Kinder- und Hausmärchen (1857) · Project Gutenberg',
    setup: 'Начало сказки, которое обычно помнят хуже, чем пряничный домик: голод, ночной разговор родителей и дети, которые не спят и всё слышат. Диалог здесь простой и разговорный — хороший материал для того, чтобы услышать, как в немецком строится спор.',
    after: 'Гензель выйдет ночью во двор и наберёт белых камешков — план, который сработает один раз и не сработает во второй. Дальше будет лес, крошки хлеба и домик.',
    body: `Vor einem großen Walde wohnte ein armer Holzhacker mit seiner Frau und seinen zwei Kindern; das Bübchen hieß Hänsel und das Mädchen Gretel. Er hatte wenig zu beißen und zu brechen, und einmal, als große Teuerung ins Land kam, konnte er auch das tägliche Brot nicht mehr schaffen.

Wie er sich nun abends im Bette Gedanken machte und sich vor Sorgen herumwälzte, seufzte er und sprach zu seiner Frau: »Was soll aus uns werden? Wie können wir unsere armen Kinder ernähren, da wir für uns selbst nichts mehr haben?« -- »Weißt du was, Mann,« antwortete die Frau, »wir wollen morgen in aller Frühe die Kinder hinaus in den Wald führen, wo er am dicksten ist. Da machen wir ihnen ein Feuer an und geben jedem noch ein Stückchen Brot, dann gehen wir an unsere Arbeit und lassen sie allein. Sie finden den Weg nicht wieder nach Hause und wir sind sie los.«

»Nein, Frau,« sagte der Mann, »das tue ich nicht; wie sollt ich's übers Herz bringen, meine Kinder im Walde allein zu lassen, die wilden Tiere würden bald kommen und sie zerreißen.« -- »O du Narr,« sagte sie, »dann müssen wir alle viere Hungers sterben,« und ließ ihm keine Ruhe, bis er einwilligte. »Aber die armen Kinder dauern mich doch,« sagte der Mann.

Die zwei Kinder hatten vor Hunger auch nicht einschlafen können und hatten gehört, was die Stiefmutter zum Vater gesagt hatte.`,
    translation: `У большого леса жил бедный дровосек с женой и двумя детьми; мальчика звали Гензель, а девочку — Гретель. Есть у них было почти нечего, а когда в стране настала большая дороговизна, он не мог добыть и хлеба насущного.

И вот, лёжа вечером в постели и ворочаясь от забот, он вздохнул и сказал жене: «Что с нами будет? Чем нам кормить бедных детей, когда нам самим нечего есть?» — «Знаешь что, муж, — ответила жена, — завтра рано утром отведём детей в лес, в самую чащу. Разведём им огонь, дадим каждому по кусочку хлеба, а сами пойдём работать и оставим их одних. Дороги домой они не найдут, и мы от них избавимся».

«Нет, жена, — сказал муж, — этого я не сделаю; как я могу оставить своих детей одних в лесу, дикие звери скоро придут и растерзают их». — «Ах ты дурак, — сказала она, — тогда все четверо умрём с голоду», — и не давала ему покоя, пока он не согласился. «А всё-таки жаль мне бедных детей», — сказал муж.

Дети от голода тоже не могли заснуть и слышали, что мачеха сказала отцу.`,
    glossary: [
      { term: 'der Holzhacker', ru: 'дровосек' },
      { term: 'die Teuerung', ru: 'дороговизна, голодные времена' },
      { term: 'seufzen', ru: 'вздыхать' },
      { term: 'in aller Frühe', ru: 'рано поутру' },
      { term: 'jemanden los sein', ru: 'избавиться от кого-то' },
      { term: 'übers Herz bringen', ru: 'решиться, пересилить себя' },
      { term: 'einwilligen', ru: 'соглашаться' },
      { term: 'jemanden dauern', ru: 'быть жалко кого-то (устаревшее: die Kinder dauern mich)' },
      { term: 'die Stiefmutter', ru: 'мачеха' },
    ],
    questions: [
      {
        q: 'Warum will die Frau die Kinder in den Wald führen?',
        options: ['Damit sie spielen', 'Weil die Familie nichts mehr zu essen hat', 'Weil der Wald sicherer ist', 'Weil die Kinder es wollen'],
        correct: 1,
      },
      {
        q: 'Wie reagiert der Vater zuerst?',
        options: ['Er ist sofort einverstanden', 'Er schweigt', 'Er lacht', 'Er weigert sich'],
        correct: 3,
        why: '«Nein, Frau, das tue ich nicht» — он отказывается, и только после долгих уговоров einwilligt.',
      },
      {
        q: 'Was passiert am Ende dieser Szene?',
        options: ['Die Kinder hören alles mit', 'Die Kinder schlafen ein', 'Der Vater geht weg', 'Die Mutter weint'],
        correct: 0,
      },
    ],
  },

  // ── Фонтане, «Эффи Брист» ──────────────────────────────────────────────────
  {
    id: 'sc-effi-1',
    workId: 'fontane-effi',
    lang: 'de', title: 'Мама, почему ты не делаешь из меня даму?', level: 'C1', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Глава 1', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Theodor Fontane, Effi Briest (1895) · Project Gutenberg',
    setup: 'Первая сцена романа: мать и семнадцатилетняя дочь сидят с рукоделием в саду, Эффи вместо шитья делает гимнастику. Разговор ни о чём — и в нём уже сказано всё, что случится дальше: девочка хочет быть взрослой, мать хочет ею гордиться, и обе шутят.',
    after: 'Через несколько страниц выяснится, зачем мать завела этот разговор: в доме ждут гостя — барона Инштеттена, который когда-то ухаживал за ней самой. Свататься он будет к Эффи.',
    body: `Eben hatte sich Effi wieder erhoben, um abwechselnd nach links und rechts ihre turnerischen Drehungen zu machen, als die von ihrer Stickerei gerade wieder aufblickende Mama ihr zurief: »Effi, eigentlich hättest du doch wohl Kunstreiterin werden müssen. Immer am Trapez, immer Tochter der Luft. Ich glaube beinah, daß du so was möchtest.«

»Vielleicht, Mama. Aber wenn es so wäre, wer wäre schuld? Von wem hab ich es? Doch nur von dir. Oder meinst du, von Papa? Da mußt du nun selber lachen. Und dann, warum steckst du mich in diesen Hänger, in diesen Jungenkittel? Mitunter denk ich, ich komme noch wieder in kurze Kleider. Und wenn ich die erst wiederhabe, dann knicks ich auch wieder wie ein Backfisch. Du bist schuld. Warum kriege ich keine Staatskleider? Warum machst du keine Dame aus mir?«`,
    translation: `Эффи только что снова поднялась, чтобы поочерёдно делать свои гимнастические повороты вправо и влево, как мама, оторвавшись от вышивания, окликнула её: «Эффи, тебе, собственно, надо было стать наездницей в цирке. Вечно на трапеции, вечно дочь воздуха. Мне почти кажется, что ты этого и хотела бы».

«Может быть, мама. Но если бы и так — кто виноват? В кого я такая? Только в тебя. Или, по-твоему, в папу? Тут ты и сама рассмеёшься. И потом — зачем ты наряжаешь меня в этот балахон, в этот мальчишеский халат? Иногда мне кажется, что я вот-вот снова окажусь в коротких платьицах. А как только они у меня появятся, я снова начну приседать в реверансе, как девчонка-подросток. Ты виновата. Почему мне не шьют выходных платьев? Почему ты не делаешь из меня даму?»`,
    glossary: [
      { term: 'die Stickerei', ru: 'вышивание, вышивка' },
      { term: 'die Kunstreiterin', ru: 'цирковая наездница' },
      { term: 'schuld sein', ru: 'быть виноватым' },
      { term: 'der Hänger', ru: 'просторное платье-балахон' },
      { term: 'der Kittel', ru: 'халат, рабочая блуза' },
      { term: 'mitunter', ru: 'иногда, время от времени (книжное)' },
      { term: 'knicksen', ru: 'приседать в реверансе' },
      { term: 'der Backfisch', ru: 'девочка-подросток (устаревшее, XIX век)' },
      { term: 'die Staatskleider', ru: 'парадные, выходные платья' },
    ],
    questions: [
      {
        q: 'Was macht Effi statt zu sticken?',
        options: ['Sie liest', 'Sie macht Gymnastik', 'Sie schläft', 'Sie schreibt einen Brief'],
        correct: 1,
      },
      {
        q: 'Worüber beschwert sich Effi bei der Mutter?',
        options: ['Über das Essen', 'Über den Vater', 'Über die Schule', 'Über ihre Kleidung — sie will Erwachsenenkleider'],
        correct: 3,
        why: '«Warum kriege ich keine Staatskleider? Warum machst du keine Dame aus mir?» — весь роман начинается с желания скорее стать взрослой.',
      },
      {
        q: 'Wie ist der Ton des Gesprächs?',
        options: ['Scherzhaft, aber mit einem ernsten Kern', 'Ein harter Streit', 'Ein Verhör', 'Völlig gleichgültig'],
        correct: 0,
      },
    ],
  },

  // ── Шторм, «Всадник на белом коне» ─────────────────────────────────────────
  {
    id: 'sc-schimmel-1',
    workId: 'storm-schimmelreiter',
    lang: 'de', title: 'Один на дамбе в шторм', level: 'C1', minutes: 4,
    topic: 'Погода и природа', skill: 'Чтение',
    order: 1, where: 'Начало рассказа в рассказе', size: 'short', spoiler: 1,
    textOrigin: 'verbatim', origin: 'open-corpus',
    credit: 'Theodor Storm, Der Schimmelreiter (1888) · Project Gutenberg',
    setup: 'Рассказчик едет верхом по дамбе в Северной Фризии в октябрьскую бурю. Ничего ещё не произошло — но именно здесь он встретит всадника, с которого начнётся вся история. Отличный текст, чтобы услышать, как немецкий описывает погоду: длинными периодами, где глагол приезжает последним.',
    after: 'Через несколько абзацев мимо него в темноте пронесётся фигура на белом коне — беззвучно и без ответа на оклик. Дальше рассказ уйдёт на сто лет назад, к человеку, который эту дамбу построил.',
    body: `Es war im dritten Jahrzehnt unseres Jahrhunderts, an einem Oktober-nachmittag, als ich bei starkem Unwetter auf einem nordfriesischen Deich entlang ritt. Zur Linken hatte ich jetzt schon seit über einer Stunde die öde, bereits von allem Vieh geleerte Marsch, zur Rechten, und zwar in unbehaglichster Nähe, das Wattenmeer der Nordsee; zwar sollte man vom Deiche aus auf Halligen und Inseln sehen können; aber ich sah nichts als die gelbgrauen Wellen, die unaufhörlich wie mit Wutgebrüll an den Deich hinaufschlugen und mitunter mich und das Pferd mit schmutzigem Schaum bespritzten.

Es war eiskalt; meine verklommenen Hände konnten kaum den Zügel halten, und ich verdachte es nicht den Krähen und Möwen, die sich fortwährend krächzend und gackernd vom Sturm ins Land hineintreiben ließen. Die Nachtdämmerung hatte begonnen, und schon konnte ich nicht mehr mit Sicherheit die Hufe meines Pferdes erkennen; keine Menschenseele war mir begegnet, ich hörte nichts als das Geschrei der Vögel und das Toben von Wind und Wasser. Ich leugne nicht, ich wünschte mich mitunter in sicheres Quartier.`,
    translation: `Это было в третьем десятилетии нашего века, октябрьским днём, когда я в сильную непогоду ехал верхом по северофризской дамбе. Слева от меня уже больше часа тянулись пустые, покинутые скотом марши, справа — и в самом неприятном соседстве — Ваттовое море Северного моря; с дамбы, вообще говоря, должны быть видны халлиги и острова, но я не видел ничего, кроме жёлто-серых волн, которые с яростным рёвом непрерывно били в дамбу и то и дело обдавали меня и лошадь грязной пеной.

Стоял ледяной холод; мои закоченевшие руки едва держали поводья, и я не винил ворон и чаек, которых буря с криком и гоготом гнала в глубь суши. Начинались сумерки, и я уже не мог с уверенностью различить копыта своей лошади; ни одна живая душа не встретилась мне, я не слышал ничего, кроме птичьего крика и рёва ветра и воды. Не скрою, минутами мне хотелось оказаться под надёжной крышей.`,
    glossary: [
      { term: 'der Deich', ru: 'дамба (северонемецкое слово, ключевое для повести)' },
      { term: 'die Marsch', ru: 'марши — низменные приморские земли' },
      { term: 'das Wattenmeer', ru: 'Ваттовое море — мелководье, обнажающееся в отлив' },
      { term: 'die Hallig', ru: 'халлиг — низкий островок, заливаемый в шторм' },
      { term: 'unaufhörlich', ru: 'непрерывно' },
      { term: 'verklommen', ru: 'закоченевший' },
      { term: 'der Zügel', ru: 'поводья' },
      { term: 'die Nachtdämmerung', ru: 'вечерние сумерки' },
      { term: 'das Toben', ru: 'рёв, буйство (стихии)' },
    ],
    questions: [
      {
        q: 'Wo befindet sich der Erzähler?',
        options: ['Auf einem Deich in Nordfriesland', 'Auf einem Schiff', 'In einem Dorf', 'Im Wald'],
        correct: 0,
      },
      {
        q: 'Wie ist das Wetter?',
        options: ['Eiskalter Sturm mit hohen Wellen', 'Warm und ruhig', 'Neblig, aber windstill', 'Leichter Regen'],
        correct: 0,
      },
      {
        q: 'Wen trifft der Erzähler unterwegs?',
        options: ['Einen Bauern', 'Eine Gruppe Reiter', 'Einen Fischer', 'Niemanden — keine Menschenseele'],
        correct: 3,
        why: '«keine Menschenseele war mir begegnet» — на этом одиночестве и держится всё, что произойдёт через страницу.',
      },
    ],
  },

  // ── Dark: карточка сериала, наш текст ──────────────────────────────────────
  {
    id: 'sc-dark-1',
    workId: 'dark-series',
    lang: 'de', title: 'Разговор в участке', level: 'B1', minutes: 3,
    topic: 'Работа', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'short', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: '«Тьма» держится на коротких репликах вполголоса: люди в этом сериале почти никогда не договаривают. Ниже наш диалог в том же жанре и с тем же типом речи — полицейский участок маленького городка, пропал ребёнок. Он написан ради разговорного немецкого: стяжения, вопросы без вопросительного слова, doch и mal.',
    body: `— Wann haben Sie ihn zuletzt gesehen?
— Gestern Abend, kurz nach acht. Er wollte nur kurz raus.
— Nur kurz raus. Und dann?
— Dann nichts. Er ist nicht zurückgekommen. Ich hab bis zwei gewartet, dann hab ich angerufen.
— Haben Sie bei den Freunden gefragt?
— Natürlich hab ich gefragt. Ich bin doch nicht blöd.
— Das hab ich nicht gesagt. Setzen Sie sich mal.
— Ich will mich nicht setzen. Ich will, dass jemand rausgeht und ihn sucht.
— Wir suchen schon. Seit heute früh, mit Hunden.
— Und?
— Und nichts. Noch nichts. Sagen Sie, hatte er ein Handy dabei?
— Ja. Es ist aus. Seit gestern zweiundzwanzig Uhr.
— Okay. Ich brauche die Nummer. Und ein Foto, ein aktuelles.
— Er ist zwölf. Zwölf Jahre alt. Verstehen Sie das?
— Ich verstehe das. Deshalb frage ich.`,
    translation: `— Когда вы видели его в последний раз?
— Вчера вечером, сразу после восьми. Он хотел выйти ненадолго.
— Ненадолго выйти. А потом?
— А потом ничего. Он не вернулся. Я ждала до двух, потом позвонила.
— Вы спрашивали у друзей?
— Конечно, спрашивала. Я же не дура.
— Я этого не говорил. Сядьте, пожалуйста.
— Я не хочу садиться. Я хочу, чтобы кто-нибудь вышел и искал его.
— Мы уже ищем. С сегодняшнего утра, с собаками.
— И?
— И ничего. Пока ничего. Скажите, телефон у него был с собой?
— Да. Он выключен. Со вчерашних двадцати двух.
— Хорошо. Мне нужен номер. И фотография, свежая.
— Ему двенадцать. Двенадцать лет. Вы это понимаете?
— Понимаю. Поэтому и спрашиваю.`,
    glossary: [
      { term: 'zuletzt', ru: 'в последний раз' },
      { term: 'kurz raus (wollen)', ru: 'выйти ненадолго — разговорное сокращение от hinausgehen' },
      { term: 'ich hab (= ich habe)', ru: 'разговорное стяжение, в речи почти всегда так' },
      { term: 'doch', ru: 'же, ведь — усиление в утверждении' },
      { term: 'mal', ru: 'смягчает просьбу: Setzen Sie sich mal' },
      { term: 'aktuell', ru: 'свежий, нынешний — НЕ «актуальный» в русском смысле' },
      { term: 'dabeihaben', ru: 'иметь при себе' },
    ],
    questions: [
      {
        q: 'Seit wann ist der Junge verschwunden?',
        options: ['Seit heute Morgen', 'Seit gestern Abend', 'Seit drei Tagen', 'Seit einer Woche'],
        correct: 1,
      },
      {
        q: 'Was will der Polizist von der Mutter?',
        options: ['Geld', 'Eine schriftliche Anzeige', 'Die Handynummer und ein aktuelles Foto', 'Den Namen des Vaters'],
        correct: 2,
      },
      {
        q: 'Welche Wörter machen den Dialog gesprochen statt geschrieben?',
        options: ['die Kurzformen wie „hab“ und die Partikeln „doch“, „mal“', 'die Fachbegriffe', 'die Stellung des Verbs', 'die langen Sätze'],
        correct: 0,
        why: 'Ich hab вместо ich habe, doch и mal — то, чем живая немецкая речь отличается от письменной. В учебных диалогах их обычно нет.',
      },
    ],
  },

  // ── Türkisch für Anfänger: карточка сериала, наш текст ─────────────────────
  {
    id: 'sc-tfa-1',
    workId: 'tuerkisch-anfaenger',
    lang: 'de', title: 'Кто сегодня выносит мусор', level: 'A2', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    order: 1, where: 'Наш текст на тему сериала', size: 'flash', spoiler: 1,
    textOrigin: 'ours', origin: 'original',
    setup: 'Сериал целиком построен на бытовой перепалке в семье, где все друг друга перебивают. Ниже наш диалог в том же духе — и специально на самом немецком из бытовых конфликтов: раздельный сбор мусора и очередь его выносить.',
    body: `— Wer ist heute mit dem Müll dran?
— Nicht ich. Ich war gestern.
— Du warst vorgestern. Gestern war ich.
— Also gut, aber dann machst du morgen das Bad.
— Das Bad hab ich letzte Woche zweimal gemacht.
— Papier oder Bio?
— Beides. Und Glas steht seit Samstag im Flur.
— Das ist nicht mein Glas.
— Es ist auch nicht meins.
— Mama! Wessen Glas steht im Flur?
— Es ist egal, wessen Glas das ist. Es geht raus, bevor die Nachbarn wieder klingeln.
— Warum klingeln die überhaupt?
— Weil hier Ruhezeit ist und ihr seit zehn Minuten schreit.`,
    translation: `— Кто сегодня выносит мусор?
— Не я. Я вчера выносил.
— Ты выносил позавчера. Вчера был я.
— Ну хорошо, но тогда завтра ты моешь ванную.
— Ванную я на прошлой неделе мыл дважды.
— Бумага или органика?
— И то и другое. И стекло с субботы стоит в коридоре.
— Это не моё стекло.
— И не моё.
— Мама! Чьё стекло стоит в коридоре?
— Неважно, чьё это стекло. Оно отправится вниз до того, как соседи снова позвонят в дверь.
— А чего они вообще звонят?
— Потому что сейчас тихий час, а вы орёте уже десять минут.`,
    glossary: [
      { term: 'dran sein', ru: 'быть на очереди: Wer ist dran? — чья очередь?' },
      { term: 'der Müll', ru: 'мусор' },
      { term: 'Papier / Bio / Glas', ru: 'фракции раздельного сбора: бумага, органика, стекло' },
      { term: 'vorgestern', ru: 'позавчера' },
      { term: 'der Flur', ru: 'коридор, прихожая' },
      { term: 'wessen', ru: 'чей — вопрос в Genitiv' },
      { term: 'die Ruhezeit', ru: 'тихие часы: с 22:00 до 6:00 и всё воскресенье' },
      { term: 'klingeln', ru: 'звонить в дверь' },
    ],
    questions: [
      {
        q: 'Worüber streiten die beiden?',
        options: ['Über Geld', 'Darüber, wer den Müll rausbringt', 'Über das Abendessen', 'Über die Schule'],
        correct: 1,
      },
      {
        q: 'Warum klingeln die Nachbarn?',
        options: ['Wegen der Ruhezeit und des Lärms', 'Sie brauchen Hilfe', 'Sie bringen ein Paket', 'Sie wollen Glas abholen'],
        correct: 0,
        why: 'Ruhezeit — не формальность: соседи действительно приходят, и это часть немецкого быта.',
      },
      {
        q: 'Was bedeutet „Wer ist heute mit dem Müll dran?“',
        options: ['Wo steht der Müll?', 'Wer hat den Müll gemacht?', 'Wann kommt die Müllabfuhr?', 'Wer ist heute an der Reihe?'],
        correct: 3,
      },
    ],
  },
]
