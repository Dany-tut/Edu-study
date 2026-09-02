// ─────────────────────────────────────────────────────────────────────────────
// Аудирование: немецкий
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ. Немецких записей было четыре против пятнадцати у
// корейского и английского — вкладка открывалась и почти сразу кончалась. Здесь
// ещё десять; в listeningLibrary.ts остаются те четыре, что задавали формат.
//
// ЧТО ОЗВУЧЕНО. Ровно то, обо что немецкий курс и разбивается в первый год:
// приём у врача, посылка у соседа, просмотр квартиры, мастер со сроками,
// сообщение из садика, банк, объявление в супермаркете, предупреждение о
// непогоде, приглашение на собеседование и звонок на работу с больничным.
// Ни одного «диалога из учебника» — все записи это монолог в трубку или
// объявление, то есть ровно тот случай, когда переспросить нельзя.
//
// ПОЧЕМУ ФОРМАЛЬНЫЕ ОБОРОТЫ ОСТАВЛЕНЫ. «Verzögerung im Betriebsablauf»,
// «Anliegen», «zeitnah» — это не украшение: именно на них спотыкается человек,
// который сам говорит уже сносно. Каждый такой оборот вынесен в словарь записи
// с толкованием, а не с подстрочником.
//
// ВОПРОСЫ НА НЕМЕЦКОМ. Как и у остальных языков: перевод к ним лежит в
// questionRu.ts и открывается кнопкой. Сторож `npm run check:questions`
// следит, чтобы переведён был каждый вопрос целиком — с вариантами.
// ─────────────────────────────────────────────────────────────────────────────

import type { ListeningItem } from './listeningLibrary'

export const LISTENING_DE: ListeningItem[] = [
  {
    id: 'de-l-arztpraxis',
    lang: 'de', title: 'Terminvergabe in der Arztpraxis (запись к врачу)', level: 'A2',
    topic: 'Здоровье', skill: 'Аудирование', minutes: 2,
    script: `Praxis Dr. Weber, guten Tag. Sie erreichen uns leider außerhalb der Sprechzeiten. Unsere Sprechstunde ist montags bis freitags von acht bis zwölf Uhr und dienstags zusätzlich von fünfzehn bis achtzehn Uhr. Für einen Termin rufen Sie bitte während der Sprechzeiten an oder buchen Sie online. Wenn Sie ein Rezept benötigen, sprechen Sie bitte Ihren Namen, Ihr Geburtsdatum und das Medikament nach dem Signalton auf das Band. Das Rezept liegt dann ab dem nächsten Werktag zur Abholung bereit. In dringenden Fällen wenden Sie sich bitte an den ärztlichen Bereitschaftsdienst unter der einheitlichen Nummer eins eins sechs eins eins sieben.`,
    translation: `Практика доктора Вебера, здравствуйте. К сожалению, вы позвонили вне приёмных часов. Приём с понедельника по пятницу с восьми до двенадцати, по вторникам дополнительно с пятнадцати до восемнадцати. Чтобы записаться, позвоните в приёмные часы или запишитесь онлайн. Если вам нужен рецепт, назовите после сигнала имя, дату рождения и препарат. Рецепт можно будет забрать со следующего рабочего дня. В срочных случаях обращайтесь в дежурную врачебную службу по единому номеру 116117.`,
    glossary: [
      { term: 'die Sprechstunde', ru: 'приёмные часы врача' },
      { term: 'das Rezept', ru: 'рецепт на лекарство' },
      { term: 'nach dem Signalton', ru: 'после сигнала (на автоответчик)' },
      { term: 'zur Abholung bereitliegen', ru: 'лежать готовым к получению' },
      { term: 'der ärztliche Bereitschaftsdienst', ru: 'дежурная врачебная служба — не скорая, а приём в нерабочие часы' },
      { term: 'der Werktag', ru: 'рабочий день' },
    ],
    questions: [
      {
        q: 'Wann ist die Praxis am Dienstag zusätzlich geöffnet?',
        options: ['Von acht bis zwölf Uhr', 'Von fünfzehn bis achtzehn Uhr', 'Gar nicht', 'Am Abend nach zwanzig Uhr'],
        correct: 1,
      },
      {
        q: 'Was soll man für ein Rezept auf das Band sprechen?',
        options: [
          'Nur den Namen',
          'Die Adresse und die Versicherungsnummer',
          'Name, Geburtsdatum und Medikament',
          'Den Namen des Arztes',
        ],
        correct: 2,
      },
      {
        q: 'Wohin wendet man sich in dringenden Fällen?',
        options: [
          'An den ärztlichen Bereitschaftsdienst',
          'An die Apotheke',
          'An das Krankenhaus',
          'An die Krankenkasse',
        ],
        correct: 0,
        why: '116117 — не скорая помощь. Скорая в Германии 112, а 116117 принимает то, что не терпит до понедельника, но и не угрожает жизни.',
      },
    ],
  },
  {
    id: 'de-l-paket',
    lang: 'de', title: 'Zettel vom Paketboten (записка от курьера)', level: 'A1',
    topic: 'Быт', skill: 'Аудирование', minutes: 1,
    script: `Hallo, hier ist Ihr Nachbar aus dem dritten Stock, Herr Özdemir. Ich habe heute Vormittag ein Paket für Sie angenommen, der Bote hat zweimal geklingelt und Sie waren wohl nicht da. Das Paket steht bei mir. Ich bin heute bis achtzehn Uhr zu Hause, danach erst wieder morgen früh. Klingeln Sie einfach, wenn Sie kommen. Es ist ziemlich schwer, also bringen Sie vielleicht jemanden mit.`,
    translation: `Здравствуйте, это ваш сосед с третьего этажа, господин Ёздемир. Сегодня утром я принял за вас посылку — курьер звонил дважды, вас, видимо, не было. Посылка у меня. Сегодня я дома до шести вечера, потом только завтра утром. Просто позвоните в дверь, когда придёте. Она довольно тяжёлая, так что, может быть, возьмите кого-нибудь с собой.`,
    glossary: [
      { term: 'annehmen', ru: 'принять (посылку за соседа)' },
      { term: 'der Bote', ru: 'курьер' },
      { term: 'klingeln', ru: 'звонить в дверь' },
      { term: 'der Stock', ru: 'этаж' },
      { term: 'jemanden mitbringen', ru: 'взять кого-то с собой' },
    ],
    questions: [
      {
        q: 'Wo ist das Paket?',
        options: ['Bei der Post', 'Vor der Tür', 'Beim Nachbarn', 'Beim Boten'],
        correct: 2,
      },
      {
        q: 'Bis wann ist der Nachbar heute zu Hause?',
        options: ['Bis achtzehn Uhr', 'Bis zwölf Uhr', 'Den ganzen Tag', 'Er sagt es nicht'],
        correct: 0,
      },
      {
        q: 'Warum soll man jemanden mitbringen?',
        options: [
          'Weil der Nachbar Angst hat',
          'Weil die Treppe schmal ist',
          'Weil man einen Ausweis braucht',
          'Weil das Paket schwer ist',
        ],
        correct: 3,
      },
    ],
  },
  {
    id: 'de-l-wohnungsbesichtigung',
    lang: 'de', title: 'Einladung zur Wohnungsbesichtigung (просмотр квартиры)', level: 'B1',
    topic: 'Жильё', skill: 'Аудирование', minutes: 2,
    script: `Guten Tag, Frau Kowalska, hier ist Bergmann von der Hausverwaltung Nordlicht. Sie hatten sich auf die Zweizimmerwohnung in der Lindenstraße beworben. Wir laden Sie zur Besichtigung am Donnerstag um siebzehn Uhr dreißig ein. Es ist eine Sammelbesichtigung, das heißt, es kommen mehrere Interessenten gleichzeitig. Bringen Sie bitte eine Kopie Ihres Personalausweises, die letzten drei Gehaltsabrechnungen und die Schufa-Auskunft mit. Ohne diese Unterlagen können wir Ihre Bewerbung leider nicht weiterbearbeiten. Eine Zusage oder Absage bekommen Sie in der Woche darauf.`,
    translation: `Здравствуйте, госпожа Ковальска, это Бергман из управляющей компании «Нордлихт». Вы подавали заявку на двухкомнатную квартиру на Линденштрассе. Приглашаем вас на просмотр в четверг в 17:30. Просмотр групповой, то есть придут сразу несколько желающих. Возьмите с собой копию удостоверения личности, три последние расчётки по зарплате и справку Schufa. Без этих документов мы, к сожалению, не сможем работать с вашей заявкой дальше. Ответ, да или нет, вы получите на следующей неделе.`,
    glossary: [
      { term: 'die Hausverwaltung', ru: 'управляющая компания дома' },
      { term: 'die Sammelbesichtigung', ru: 'групповой просмотр: желающих зовут всех разом' },
      { term: 'die Gehaltsabrechnung', ru: 'расчётный лист по зарплате' },
      { term: 'die Schufa-Auskunft', ru: 'справка о кредитной истории — без неё квартиру в Германии не сдают' },
      { term: 'die Unterlagen', ru: 'документы (собирательно)' },
      { term: 'die Zusage / die Absage', ru: 'согласие / отказ' },
    ],
    questions: [
      {
        q: 'Was bedeutet «Sammelbesichtigung»?',
        options: [
          'Man besichtigt mehrere Wohnungen',
          'Die Besichtigung findet am Wochenende statt',
          'Mehrere Interessenten kommen gleichzeitig',
          'Man sammelt Geld für die Kaution',
        ],
        correct: 2,
      },
      {
        q: 'Welche Unterlagen soll Frau Kowalska mitbringen?',
        options: [
          'Nur den Personalausweis',
          'Ausweiskopie, drei Gehaltsabrechnungen und Schufa-Auskunft',
          'Einen Arbeitsvertrag und ein Foto',
          'Nichts, alles läuft online',
        ],
        correct: 1,
      },
      {
        q: 'Wann bekommt sie eine Antwort?',
        options: [
          'Noch am selben Abend',
          'Nie, wenn sie nicht anruft',
          'Am Tag der Besichtigung',
          'In der Woche nach der Besichtigung',
        ],
        correct: 3,
      },
    ],
  },
  {
    id: 'de-l-handwerker',
    lang: 'de', title: 'Der Handwerker meldet sich (мастер о сроках)', level: 'B1',
    topic: 'Жильё', skill: 'Аудирование', minutes: 2,
    script: `Guten Morgen, Sanitär Reinhardt, mein Name ist Kleinschmidt. Ich rufe wegen des Wasserschadens im Bad an. Wir hatten Mittwoch vereinbart, das muss ich leider verschieben. Das Ersatzteil ist noch nicht geliefert worden, der Hersteller spricht von zehn bis vierzehn Tagen. Ich schlage vor: Ich komme trotzdem am Mittwoch, mache die Notabdichtung und tausche das Ventil, sobald das Teil da ist. Dann können Sie das Bad wenigstens benutzen. Wenn Ihnen das recht ist, rufen Sie kurz zurück, sonst gehe ich davon aus, dass es passt.`,
    translation: `Доброе утро, «Сантехника Райнхардт», меня зовут Кляйншмидт. Звоню по поводу протечки в ванной. Мы договаривались на среду — к сожалению, придётся перенести. Запчасть ещё не привезли, производитель говорит про десять–четырнадцать дней. Предлагаю так: в среду я всё равно приеду, поставлю временную заглушку, а вентиль поменяю, как только деталь придёт. Тогда ванной хотя бы можно будет пользоваться. Если вас устраивает, перезвоните коротко; если нет — буду считать, что договорились.`,
    glossary: [
      { term: 'der Wasserschaden', ru: 'протечка и её последствия' },
      { term: 'verschieben', ru: 'перенести (срок)' },
      { term: 'das Ersatzteil', ru: 'запчасть' },
      { term: 'die Notabdichtung', ru: 'временная заглушка, чтобы не текло' },
      { term: 'wenn Ihnen das recht ist', ru: 'если вас устраивает' },
      { term: 'davon ausgehen', ru: 'исходить из того, что; считать по умолчанию' },
    ],
    questions: [
      {
        q: 'Warum ruft der Handwerker an?',
        options: [
          'Er will den Termin verschieben',
          'Er ist schon vor der Tür',
          'Er will eine Rechnung schicken',
          'Er hat die Adresse verloren',
        ],
        correct: 0,
      },
      {
        q: 'Was macht er am Mittwoch trotzdem?',
        options: [
          'Er tauscht das Ventil',
          'Er bringt das Ersatzteil',
          'Er macht eine Notabdichtung',
          'Er sieht sich nur alles an',
        ],
        correct: 2,
      },
      {
        q: 'Was passiert, wenn man nicht zurückruft?',
        options: [
          'Der Termin fällt aus',
          'Man bekommt eine Rechnung',
          'Die Firma sucht einen anderen Kunden',
          'Der Handwerker kommt wie vorgeschlagen',
        ],
        correct: 3,
        why: 'Это типичная немецкая формула: молчание считается согласием. Кто ждёт подтверждения, останется без мастера.',
      },
    ],
  },
  {
    id: 'de-l-kita',
    lang: 'de', title: 'Nachricht aus der Kita (сообщение из садика)', level: 'A2',
    topic: 'Дети и школа', skill: 'Аудирование', minutes: 1,
    script: `Liebe Eltern, hier ist die Kita Sonnenblume. Zwei kurze Hinweise für nächste Woche. Am Montag ist die Kita wegen einer Fortbildung des Teams geschlossen, eine Notbetreuung gibt es nicht. Und am Freitag machen wir unseren Waldtag: Bitte ziehen Sie den Kindern feste Schuhe und Regenkleidung an und geben Sie eine gefüllte Trinkflasche mit. Wir sind von neun bis dreizehn Uhr unterwegs, das Mittagessen findet später statt als sonst. Danke und einen schönen Abend.`,
    translation: `Дорогие родители, это детский сад «Подсолнух». Два коротких объявления на следующую неделю. В понедельник сад закрыт из-за повышения квалификации коллектива, дежурной группы не будет. А в пятницу у нас лесной день: оденьте детям крепкую обувь и дождевую одежду и дайте с собой полную бутылку для питья. Мы будем на улице с девяти до тринадцати, обед будет позже обычного. Спасибо и хорошего вечера.`,
    glossary: [
      { term: 'die Fortbildung', ru: 'повышение квалификации' },
      { term: 'die Notbetreuung', ru: 'дежурная группа на время закрытия' },
      { term: 'feste Schuhe', ru: 'крепкая закрытая обувь' },
      { term: 'die Regenkleidung', ru: 'дождевая одежда' },
      { term: 'unterwegs sein', ru: 'быть в пути, вне дома' },
    ],
    questions: [
      {
        q: 'Warum ist die Kita am Montag geschlossen?',
        options: [
          'Wegen eines Feiertags',
          'Wegen einer Fortbildung des Teams',
          'Wegen Krankheit',
          'Wegen einer Renovierung',
        ],
        correct: 1,
      },
      {
        q: 'Was sollen die Kinder am Freitag dabeihaben?',
        options: [
          'Ein Spielzeug',
          'Ein Buch',
          'Feste Schuhe, Regenkleidung und eine Trinkflasche',
          'Nichts Besonderes',
        ],
        correct: 2,
      },
      {
        q: 'Was ist am Waldtag anders?',
        options: [
          'Das Mittagessen ist später als sonst',
          'Die Kinder kommen später',
          'Es gibt kein Mittagessen',
          'Die Eltern müssen mitkommen',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'de-l-bank',
    lang: 'de', title: 'Rückruf von der Bank (звонок из банка)', level: 'B1',
    topic: 'Деньги', skill: 'Аудирование', minutes: 2,
    script: `Guten Tag, Frau Nowak, Kundenservice der Stadtsparkasse, mein Name ist Hübner. Sie hatten uns wegen einer Abbuchung geschrieben, die Sie nicht zuordnen können — achtundzwanzig Euro neunzig am zwölften, Empfänger ist ein Zahlungsdienstleister. Solche Buchungen kommen fast immer von einem Abo, das über einen Vermittler läuft, deshalb steht der Händlername nicht dabei. Sie können der Abbuchung innerhalb von acht Wochen widersprechen, das Geld ist dann sofort wieder auf dem Konto. Wichtig: Das kündigt das Abo nicht — das müssen Sie beim Anbieter selbst tun, sonst kommt die Buchung im nächsten Monat wieder. Wir rufen niemals an, um nach Ihrer PIN oder einer TAN zu fragen.`,
    translation: `Здравствуйте, госпожа Новак, служба поддержки Штадтшпаркассе, меня зовут Хюбнер. Вы писали нам про списание, которое не можете опознать: 28,90 евро двенадцатого числа, получатель — платёжный посредник. Такие списания почти всегда идут от подписки, оформленной через посредника, поэтому имени продавца рядом нет. Вы можете оспорить списание в течение восьми недель, деньги сразу вернутся на счёт. Важно: подписку это не отменяет — её нужно расторгнуть у самого поставщика, иначе в следующем месяце списание придёт снова. Мы никогда не звоним, чтобы спросить ваш PIN или код TAN.`,
    glossary: [
      { term: 'die Abbuchung', ru: 'списание со счёта' },
      { term: 'zuordnen', ru: 'опознать, отнести к чему-то' },
      { term: 'der Zahlungsdienstleister', ru: 'платёжный посредник' },
      { term: 'widersprechen', ru: 'оспорить (списание)' },
      { term: 'kündigen', ru: 'расторгнуть, отменить (договор, подписку)' },
      { term: 'der Anbieter', ru: 'поставщик услуги' },
    ],
    questions: [
      {
        q: 'Warum steht kein Händlername bei der Buchung?',
        options: [
          'Die Bank hat einen Fehler gemacht',
          'Das Abo läuft über einen Vermittler',
          'Der Betrag ist zu klein',
          'Die Buchung ist noch nicht abgeschlossen',
        ],
        correct: 1,
      },
      {
        q: 'Wie lange kann man der Abbuchung widersprechen?',
        options: ['Acht Tage', 'Vier Wochen', 'Acht Wochen', 'Ein Jahr'],
        correct: 2,
      },
      {
        q: 'Was passiert, wenn man nur widerspricht und sonst nichts tut?',
        options: [
          'Die Buchung kommt im nächsten Monat wieder',
          'Das Abo ist automatisch gekündigt',
          'Die Bank sperrt das Konto',
          'Der Anbieter meldet sich von selbst',
        ],
        correct: 0,
        why: 'Возврат денег и расторжение подписки — две разные вещи. Это и есть главное, ради чего звонили.',
      },
    ],
  },
  {
    id: 'de-l-supermarkt',
    lang: 'de', title: 'Durchsage im Supermarkt (объявление в магазине)', level: 'A1',
    topic: 'Покупки', skill: 'Аудирование', minutes: 1,
    script: `Liebe Kundinnen und Kunden, wir möchten Sie darauf hinweisen, dass unsere Filiale heute bereits um achtzehn Uhr schließt. Bitte begeben Sie sich rechtzeitig zu den Kassen. An Kasse drei ist ab sofort geöffnet. Und ein Hinweis für alle Frühaufsteher: Ab morgen öffnen wir bereits um sieben Uhr statt um acht. Wir wünschen Ihnen noch einen angenehmen Einkauf.`,
    translation: `Уважаемые покупатели, обращаем ваше внимание, что наш магазин сегодня закрывается уже в шесть вечера. Пожалуйста, подходите к кассам заранее. Касса номер три открыта с этой минуты. И объявление для ранних пташек: с завтрашнего дня мы открываемся уже в семь, а не в восемь. Приятных вам покупок.`,
    glossary: [
      { term: 'die Durchsage', ru: 'объявление по громкой связи' },
      { term: 'die Filiale', ru: 'отделение, торговая точка' },
      { term: 'sich begeben zu', ru: 'проходить, направляться к' },
      { term: 'rechtzeitig', ru: 'заранее, вовремя' },
      { term: 'ab sofort', ru: 'с этой минуты' },
    ],
    questions: [
      {
        q: 'Wann schließt der Supermarkt heute?',
        options: ['Um zwanzig Uhr', 'Um achtzehn Uhr', 'Um sieben Uhr', 'Um zweiundzwanzig Uhr'],
        correct: 1,
      },
      {
        q: 'Was ist ab morgen neu?',
        options: [
          'Der Markt öffnet schon um sieben',
          'Der Markt schließt früher',
          'Kasse drei ist geschlossen',
          'Es gibt neue Preise',
        ],
        correct: 0,
      },
      {
        q: 'Was wird über Kasse drei gesagt?',
        options: [
          'Sie ist defekt',
          'Sie ist nur für Karten',
          'Dort gibt es eine lange Schlange',
          'Sie ist ab sofort geöffnet',
        ],
        correct: 3,
      },
    ],
  },
  {
    id: 'de-l-unwetter',
    lang: 'de', title: 'Unwetterwarnung im Radio (предупреждение о непогоде)', level: 'B1',
    topic: 'Погода и природа', skill: 'Аудирование', minutes: 2,
    script: `Und nun zur Wetterlage. Der Deutsche Wetterdienst hat für den Süden des Landes eine amtliche Unwetterwarnung herausgegeben, gültig ab heute achtzehn Uhr bis morgen früh. Erwartet werden schwere Gewitter mit Starkregen bis vierzig Liter pro Quadratmeter in kurzer Zeit, Sturmböen bis achtzig Kilometer pro Stunde und örtlich Hagel. Der Wetterdienst rät, Gegenstände im Freien zu sichern, Keller und Unterführungen zu meiden und Fahrten möglichst zu verschieben. Die Gewitter treten kleinräumig auf: Es kann sein, dass es in einem Stadtteil kräftig schüttet und im nächsten trocken bleibt.`,
    translation: `А теперь о погоде. Немецкая метеослужба выпустила официальное штормовое предупреждение по югу страны, оно действует с шести вечера сегодня до раннего утра. Ожидаются сильные грозы с ливнями до сорока литров на квадратный метр за короткое время, шквалы до восьмидесяти километров в час и местами град. Метеослужба советует закрепить предметы на улице, избегать подвалов и подземных переходов и по возможности отложить поездки. Грозы будут локальными: может лить в одном районе города и оставаться сухо в соседнем.`,
    glossary: [
      { term: 'amtlich', ru: 'официальный' },
      { term: 'die Unwetterwarnung', ru: 'штормовое предупреждение' },
      { term: 'der Starkregen', ru: 'ливень' },
      { term: 'die Sturmböen', ru: 'шквалы' },
      { term: 'die Unterführung', ru: 'подземный переход' },
      { term: 'kleinräumig', ru: 'локально, на небольшой площади' },
    ],
    questions: [
      {
        q: 'Für welchen Teil des Landes gilt die Warnung?',
        options: ['Für den Norden', 'Für den Osten', 'Für den Süden', 'Für das ganze Land'],
        correct: 2,
      },
      {
        q: 'Was rät der Wetterdienst?',
        options: [
          'Zu Hause zu bleiben und das Licht auszuschalten',
          'Gegenstände zu sichern, Keller zu meiden und Fahrten zu verschieben',
          'Die Fenster zu öffnen',
          'Den Notruf zu wählen',
        ],
        correct: 1,
      },
      {
        q: 'Was bedeutet «kleinräumig»?',
        options: [
          'Das Gewitter ist schwach',
          'Es dauert nur kurz',
          'Es betrifft nur kleine Städte',
          'In einem Stadtteil regnet es stark, im nächsten bleibt es trocken',
        ],
        correct: 3,
      },
    ],
  },
  {
    id: 'de-l-vorstellungsgespraech',
    lang: 'de', title: 'Einladung zum Vorstellungsgespräch (приглашение на собеседование)', level: 'B1',
    topic: 'Работа', skill: 'Аудирование', minutes: 2,
    script: `Guten Tag, Herr Petrenko, hier spricht Frau Lange von der Firma Hansen und Partner. Vielen Dank für Ihre Bewerbung als Elektroniker. Wir würden Sie gerne kennenlernen und schlagen Ihnen den kommenden Dienstag um zehn Uhr vor. Das Gespräch dauert etwa eine Stunde, dabei sind ich und der Werkstattleiter, Herr Baumann. Es ist kein Test und keine Prüfung — wir möchten vor allem hören, womit Sie bisher gearbeitet haben. Bringen Sie bitte Ihre Zeugnisse im Original mit. Falls Dienstag nicht passt, finden wir einen anderen Termin, das ist überhaupt kein Problem. Antworten Sie mir gern per Mail.`,
    translation: `Здравствуйте, господин Петренко, это госпожа Ланге из фирмы «Хансен и партнёры». Спасибо за вашу заявку на позицию электронщика. Мы хотели бы познакомиться и предлагаем ближайший вторник в десять. Разговор займёт около часа, будем я и начальник мастерской, господин Бауман. Это не тест и не экзамен — нам прежде всего хочется услышать, с чем вы работали раньше. Возьмите с собой оригиналы свидетельств. Если вторник не подходит, найдём другое время, это совершенно не проблема. Ответьте мне письмом.`,
    glossary: [
      { term: 'die Bewerbung', ru: 'заявка на работу' },
      { term: 'der Werkstattleiter', ru: 'начальник мастерской' },
      { term: 'das Zeugnis', ru: 'свидетельство, документ об образовании или с прежней работы' },
      { term: 'im Original', ru: 'в оригинале, не копией' },
      { term: 'falls … nicht passt', ru: 'если … не подходит' },
    ],
    questions: [
      {
        q: 'Wer nimmt am Gespräch teil?',
        options: [
          'Nur Frau Lange',
          'Frau Lange und der Werkstattleiter',
          'Der ganze Betrieb',
          'Nur Herr Baumann',
        ],
        correct: 1,
      },
      {
        q: 'Was soll Herr Petrenko mitbringen?',
        options: [
          'Nichts',
          'Ein Foto',
          'Seine Zeugnisse im Original',
          'Einen Lebenslauf auf Papier',
        ],
        correct: 2,
      },
      {
        q: 'Was sagt Frau Lange über den Termin?',
        options: [
          'Er lässt sich verschieben, wenn Dienstag nicht passt',
          'Er ist der einzige mögliche Termin',
          'Er wird noch bestätigt',
          'Er findet online statt',
        ],
        correct: 0,
      },
    ],
  },
  {
    id: 'de-l-krankmeldung',
    lang: 'de', title: 'Krankmeldung am Telefon (звонок на работу с больничным)', level: 'A2',
    topic: 'Работа', skill: 'Аудирование', minutes: 1,
    script: `Guten Morgen, Frau Schuster, hier ist Marek Wisniewski. Ich rufe an, weil ich heute leider nicht kommen kann. Ich habe seit gestern Abend Fieber und war eben beim Arzt. Er hat mich bis einschließlich Freitag krankgeschrieben. Die Bescheinigung geht elektronisch an die Krankenkasse, ich schicke Ihnen trotzdem heute noch eine Kopie per Mail. Die Lieferung für Donnerstag habe ich gestern schon vorbereitet, die Unterlagen liegen bei Frau Adamczyk auf dem Tisch. Melden Sie sich, wenn etwas unklar ist.`,
    translation: `Доброе утро, госпожа Шустер, это Марек Вишневский. Звоню, потому что сегодня, к сожалению, не смогу прийти. Со вчерашнего вечера температура, только что был у врача. Он выписал больничный по пятницу включительно. Справка уходит в больничную кассу электронно, но я всё равно сегодня пришлю вам копию письмом. Поставку на четверг я подготовил ещё вчера, документы лежат у госпожи Адамчик на столе. Пишите, если что-то непонятно.`,
    glossary: [
      { term: 'krankschreiben', ru: 'выписать больничный' },
      { term: 'bis einschließlich', ru: 'по … включительно' },
      { term: 'die Bescheinigung', ru: 'справка' },
      { term: 'die Krankenkasse', ru: 'больничная касса (страховая)' },
      { term: 'vorbereiten', ru: 'подготовить заранее' },
    ],
    questions: [
      {
        q: 'Bis wann ist Marek krankgeschrieben?',
        options: ['Bis Mittwoch', 'Bis Donnerstag', 'Bis Freitag einschließlich', 'Nur heute'],
        correct: 2,
      },
      {
        q: 'Wohin geht die Bescheinigung?',
        options: [
          'An die Krankenkasse, elektronisch',
          'An den Chef per Post',
          'Nirgendwohin, er bringt sie später',
          'An den Arzt zurück',
        ],
        correct: 0,
      },
      {
        q: 'Was sagt er über die Lieferung für Donnerstag?',
        options: [
          'Sie fällt aus',
          'Ein Kollege muss sie neu machen',
          'Sie wird verschoben',
          'Er hat sie gestern schon vorbereitet',
        ],
        correct: 3,
        why: 'Хороший звонок с больничным состоит из трёх частей: не приду, до какого числа, и что с моей работой. Третья часть — та, которую забывают.',
      },
    ],
  },
]
