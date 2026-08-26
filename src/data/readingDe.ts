// ─────────────────────────────────────────────────────────────────────────────
// Немецкие тексты тренажёра: быт поверх ведомств
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ — см. шапку readingKo.ts.
//
// ЧЕГО НЕ ХВАТАЛО. Немецких текстов было шесть, и почти все — про бумаги:
// объявление в подъезде, объявление о квартире, письмо из ведомства, запись к
// врачу, чек, письмо коллеге. Человек, приехавший жить, находил Anmeldung и не
// находил ни школы, ни вокзала, ни прогноза. Здесь добавлены бытовые темы
// костяка (data/languageTaxonomy) и верхние ступени: было A1–B1, стало A1–C1.
//
// ПОЧЕМУ ИМЕННО ЭТИ ДОКУМЕНТЫ. Немецкий быт держится на бумаге сильнее, чем
// корейский или японский: расписание Kita, письмо от Deutsche Bahn, счёт за
// электричество, Kündigung абонемента — это не учебные ситуации, а то, что
// лежит в почтовом ящике на первой же неделе.
//
// СЛОВАРЬ. Каждое слово текста и вопросов — в data/wordGloss.ts
// (npm run check:gloss). Перевод формулировок — data/questionRu.ts
// (npm run check:questions).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReadingText } from './readingLibrary'

export const DE_TEXTS: ReadingText[] = [
  // ─── Знакомство ───────────────────────────────────────────────────────────
  {
    id: 'de-vorstellung',
    lang: 'de', title: 'Vorstellung im Sprachkurs (знакомство на курсе)', level: 'A1', minutes: 2,
    topic: 'Знакомство', skill: 'Чтение',
    origin: 'original',
    body: `Hallo! Ich heiße Marta.

Ich komme aus Polen, aus Krakau. Jetzt wohne ich in Leipzig.
Ich bin seit fünf Monaten hier.

Ich bin Krankenschwester von Beruf. Im Moment arbeite ich nicht,
ich lerne Deutsch. Ich brauche B2 für die Arbeit im Krankenhaus.

Ich wohne mit meinem Mann und unserem Hund in einer kleinen Wohnung.
Am Wochenende gehen wir gern in den Park.

Ich verstehe schon viel, aber ich spreche noch langsam.
Bitte sprecht nicht zu schnell mit mir!`,
    translation: `Здравствуйте! Меня зовут Марта.

Я из Польши, из Кракова. Сейчас живу в Лейпциге.
Я здесь пять месяцев.

По профессии я медсестра. Сейчас не работаю, учу немецкий:
для работы в больнице мне нужен B2.

Живу с мужем и собакой в маленькой квартире.
По выходным мы любим ходить в парк.

Понимаю уже много, но говорю пока медленно.
Пожалуйста, не говорите со мной слишком быстро!`,
    glossary: [
      { term: 'ich heiße', ru: 'меня зовут' },
      { term: 'seit', ru: 'с (какого-то момента), уже' },
      { term: 'von Beruf', ru: 'по профессии' },
      { term: 'im Moment', ru: 'сейчас, в данный момент' },
      { term: 'ich brauche', ru: 'мне нужно' },
      { term: 'noch', ru: 'ещё, пока' },
    ],
    questions: [
      {
        q: 'Was ist Marta von Beruf?',
        options: ['Lehrerin', 'Krankenschwester', 'Ärztin', 'Sie hat keinen Beruf'],
        correct: 1,
        why: '«Ich bin Krankenschwester von Beruf» — оборот von Beruf как раз и вводит профессию, а не текущее занятие.',
      },
      {
        q: 'Warum lernt Marta Deutsch?',
        options: [
          'Für die Arbeit im Krankenhaus',
          'Für die Universität',
          'Für die Reise',
          'Der Text sagt es nicht',
        ],
        correct: 0,
        why: '«Ich brauche B2 für die Arbeit im Krankenhaus» — цель названа прямо, вместе с нужным уровнем.',
      },
      {
        q: 'Worum bittet Marta?',
        options: ['Langsam zu sprechen', 'Laut zu sprechen', 'Polnisch zu sprechen', 'Nichts'],
        correct: 0,
        why: '«Bitte sprecht nicht zu schnell mit mir» — просьба сформулирована через отрицание, но смысл именно «говорите медленнее».',
      },
    ],
  },

  // ─── Еда ──────────────────────────────────────────────────────────────────
  {
    id: 'de-baeckerei',
    lang: 'de', title: 'Bäckerei am Bahnhof (пекарня)', level: 'A1', minutes: 2,
    topic: 'Еда', skill: 'Чтение',
    origin: 'original',
    body: `BÄCKEREI SCHULZ

Brötchen                    0,55
Laugenbrötchen              0,85
Käsebrötchen                1,60
Butterbrezel                1,90
Franzbrötchen               2,10

Kaffee klein                1,90
Kaffee groß                 2,40
Tee                         1,80

FRÜHSTÜCK bis 11 Uhr:
2 Brötchen, Butter, Marmelade, Kaffee   4,90

Ab 17 Uhr: alle Backwaren 50 % günstiger.
Mit eigenem Becher: 30 Cent Rabatt auf Kaffee.

Wir haben Montag bis Samstag 6–19 Uhr geöffnet.
Sonntag geschlossen.`,
    translation: `ПЕКАРНЯ ШУЛЬЦ

Булочка                     0,55
Крендельная булочка         0,85
Булочка с сыром             1,60
Брецель с маслом            1,90
Франц-булочка               2,10

Кофе маленький              1,90
Кофе большой                2,40
Чай                         1,80

ЗАВТРАК до 11:00:
2 булочки, масло, джем, кофе — 4,90

С 17:00 вся выпечка на 50% дешевле.
Со своей кружкой — скидка 30 центов на кофе.

Работаем с понедельника по субботу, 6:00–19:00.
Воскресенье — выходной.`,
    glossary: [
      { term: 'Backwaren', ru: 'выпечка' },
      { term: 'günstiger', ru: 'дешевле' },
      { term: 'eigenem Becher', ru: 'своей кружкой' },
      { term: 'Rabatt', ru: 'скидка' },
      { term: 'geöffnet', ru: 'открыто' },
      { term: 'geschlossen', ru: 'закрыто' },
    ],
    questions: [
      {
        q: 'Sie kommen um 18 Uhr. Was kostet ein Franzbrötchen?',
        options: ['2,10', '1,05', '1,80', 'Nichts, es ist zu']  ,
        correct: 1,
        why: 'С 17:00 вся выпечка дешевле вдвое, а закрываются в 19:00 — значит 2,10 : 2 = 1,05.',
      },
      {
        q: 'Wie bekommt man 30 Cent Rabatt?',
        options: [
          'Mit dem Frühstück',
          'Mit eigenem Becher',
          'Am Sonntag',
          'Ab 17 Uhr',
        ],
        correct: 1,
        why: 'Скидка на кофе привязана к своей кружке; вечерняя скидка 50% — про выпечку, а не про напиток.',
      },
      {
        q: 'Kann man sonntags hier frühstücken?',
        options: ['Ja, bis 11 Uhr', 'Nein, sonntags ist geschlossen', 'Nur mit Anmeldung', 'Der Aushang sagt es nicht'],
        correct: 1,
        why: '«Sonntag geschlossen» — завтрак до одиннадцати работает только в дни, когда пекарня вообще открыта.',
      },
    ],
  },

  // ─── Транспорт и дорога ───────────────────────────────────────────────────
  {
    id: 'de-bahn-info',
    lang: 'de', title: 'Zugausfall und Fahrgastrechte (отмена поезда)', level: 'A2', minutes: 3,
    topic: 'Транспорт и дорога', skill: 'Чтение',
    origin: 'original',
    body: `Sehr geehrte Fahrgäste,

der ICE 1704 nach Hamburg fällt heute aus. Grund ist eine Störung
an der Strecke zwischen Bitterfeld und Dessau.

Wir empfehlen: Nehmen Sie den RE 13 um 14:52 bis Magdeburg und
dort den ICE 596 weiter nach Hamburg. Ihre Fahrkarte gilt ohne Aufpreis.

Bei einer Verspätung ab 60 Minuten bekommen Sie 25 % des Fahrpreises
zurück, ab 120 Minuten 50 %. Den Antrag stellen Sie online oder am
Schalter — Sie brauchen dafür die Fahrkarte und die Verspätungsbestätigung.

Zugbindung entfällt heute auf dieser Strecke: Sie dürfen auch einen
früheren oder späteren Zug nehmen.

Wir bitten um Entschuldigung.`,
    translation: `Уважаемые пассажиры,

поезд ICE 1704 до Гамбурга сегодня отменён. Причина — неисправность
на участке между Биттерфельдом и Дессау.

Рекомендуем: сядьте на RE 13 в 14:52 до Магдебурга, а там — на ICE 596
дальше до Гамбурга. Ваш билет действует без доплаты.

При опоздании от 60 минут возвращают 25% стоимости, от 120 минут — 50%.
Заявление подаётся онлайн или в кассе; понадобятся билет и справка о задержке.

Привязка к конкретному поезду сегодня на этом направлении не действует:
можно ехать и более ранним, и более поздним рейсом.

Приносим извинения.`,
    glossary: [
      { term: 'fällt aus', ru: 'отменяется' },
      { term: 'Störung', ru: 'неисправность, сбой' },
      { term: 'ohne Aufpreis', ru: 'без доплаты' },
      { term: 'Fahrpreis', ru: 'стоимость проезда' },
      { term: 'Antrag stellen', ru: 'подать заявление' },
      { term: 'Zugbindung', ru: 'привязка билета к конкретному поезду' },
    ],
    questions: [
      {
        q: 'Sie kommen 90 Minuten zu spät an. Wie viel bekommen Sie zurück?',
        options: ['Nichts', '25 %', '50 %', '100 %'],
        correct: 1,
        why: 'Полтора часа попадают в вилку «от 60 минут», но не дотягивают до 120 — половину вернут только со второго порога.',
      },
      {
        q: 'Was brauchen Sie für den Antrag?',
        options: [
          'Nur die Fahrkarte',
          'Fahrkarte und Verspätungsbestätigung',
          'Nur den Ausweis',
          'Nichts',
        ],
        correct: 1,
        why: 'В письме названы оба документа сразу; одного билета недостаточно.',
      },
      {
        q: 'Dürfen Sie einen früheren Zug nehmen?',
        options: [
          'Ja, die Zugbindung entfällt heute',
          'Nein, nur den empfohlenen',
          'Nur mit Aufpreis',
          'Nur in der ersten Klasse',
        ],
        correct: 0,
        why: '«Zugbindung entfällt heute auf dieser Strecke» — привязка снята, поэтому рекомендация остаётся рекомендацией.',
      },
    ],
  },

  // ─── Учёба ────────────────────────────────────────────────────────────────
  {
    id: 'de-kita-brief',
    lang: 'de', title: 'Elternbrief aus der Kita (письмо из садика)', level: 'A2', minutes: 3,
    topic: 'Учёба', skill: 'Чтение',
    origin: 'original',
    body: `Liebe Eltern,

im September starten wir mit neuen Zeiten:
Die Kita öffnet um 7:00 und schließt um 16:30. Bitte holen Sie Ihr Kind
spätestens um 16:15 ab, damit wir pünktlich schließen können.

Am 12. September machen wir einen Ausflug in den Zoo.
Bitte geben Sie Ihrem Kind mit: feste Schuhe, eine Regenjacke,
ein Getränk und ein kleines Frühstück. Bitte KEINE Süßigkeiten.
Die Einverständniserklärung liegt im Flur — bitte bis Freitag abgeben.

Wenn Ihr Kind krank ist, melden Sie es bitte bis 8:00 telefonisch ab.
Bei Fieber oder Durchfall muss das Kind 48 Stunden zu Hause bleiben,
auch wenn es sich schon besser fühlt.

Herzliche Grüße
Ihr Kita-Team`,
    translation: `Дорогие родители,

с сентября у нас новое расписание:
садик открывается в 7:00 и закрывается в 16:30. Забирайте ребёнка
не позже 16:15, чтобы мы могли закрыться вовремя.

12 сентября едем на экскурсию в зоопарк.
Дайте ребёнку с собой: закрытую обувь, дождевик, питьё и небольшой завтрак.
Сладостей, пожалуйста, НЕ надо.
Согласие лежит в коридоре — сдайте, пожалуйста, до пятницы.

Если ребёнок заболел, сообщите по телефону до 8:00.
При температуре или расстройстве желудка ребёнок остаётся дома 48 часов,
даже если ему уже лучше.

С уважением, коллектив садика`,
    glossary: [
      { term: 'abholen', ru: 'забирать (ребёнка)' },
      { term: 'spätestens', ru: 'не позже чем' },
      { term: 'Ausflug', ru: 'экскурсия, вылазка' },
      { term: 'Einverständniserklärung', ru: 'письменное согласие' },
      { term: 'abmelden', ru: 'сообщить об отсутствии' },
      { term: 'Durchfall', ru: 'расстройство желудка' },
    ],
    questions: [
      {
        q: 'Bis wann muss man das Kind abholen?',
        options: ['16:00', '16:15', '16:30', '17:00'],
        correct: 1,
        why: 'Садик закрывается в 16:30, но забрать просят к 16:15 — разница как раз на то, чтобы успеть закрыться вовремя.',
      },
      {
        q: 'Was soll das Kind NICHT mitnehmen?',
        options: ['Feste Schuhe', 'Eine Regenjacke', 'Süßigkeiten', 'Ein Getränk'],
        correct: 2,
        why: 'Запрет выделен в письме заглавными: «bitte KEINE Süßigkeiten». Остальное — как раз список нужного.',
      },
      {
        q: 'Das Kind hatte Fieber und fühlt sich am nächsten Tag gut. Darf es kommen?',
        options: [
          'Ja, wenn es sich gut fühlt',
          'Nein, es muss 48 Stunden zu Hause bleiben',
          'Ja, mit einem Attest',
          'Nur nach dem Mittagessen',
        ],
        correct: 1,
        why: 'Оговорка «auch wenn es sich schon besser fühlt» написана ровно для этого случая: срок считают часами, а не самочувствием.',
      },
    ],
  },

  // ─── Погода и природа ─────────────────────────────────────────────────────
  {
    id: 'de-unwetter',
    lang: 'de', title: 'Unwetterwarnung (штормовое предупреждение)', level: 'B1', minutes: 3,
    topic: 'Погода и природа', skill: 'Чтение',
    origin: 'original',
    body: `AMTLICHE UNWETTERWARNUNG vor schwerem Gewitter
Gültig von Donnerstag 16:00 bis Freitag 02:00 · Kreis Leipzig

Es treten Gewitter mit Starkregen auf. Örtlich sind 25 bis 40 Liter
pro Quadratmeter in kurzer Zeit möglich, dazu Sturmböen bis 90 km/h
und Hagel um 2 cm.

Mögliche Folgen:
· überflutete Straßen und Keller, Erdrutsche an Hängen
· entwurzelte Bäume und herabstürzende Äste
· Behinderungen im Bahn- und Straßenverkehr

Hinweise:
Halten Sie sich von Bäumen fern und suchen Sie feste Gebäude auf.
Fahren Sie nicht in überflutete Unterführungen — die Wassertiefe ist
von außen kaum zu schätzen.
Sichern Sie Gegenstände im Freien, bevor das Gewitter da ist.

Eine amtliche Warnung ist keine Vorhersage für jeden Ort: Gewitter
sind kleinräumig, und es kann sein, dass es bei Ihnen trocken bleibt.`,
    translation: `ОФИЦИАЛЬНОЕ ПРЕДУПРЕЖДЕНИЕ о сильной грозе
Действует с четверга 16:00 до пятницы 02:00 · округ Лейпциг

Ожидаются грозы с ливнями. Местами возможны 25–40 литров на квадратный метр
за короткое время, шквалы до 90 км/ч и град около 2 см.

Возможные последствия:
· затопленные улицы и подвалы, оползни на склонах
· вывороченные деревья и падающие ветки
· сбои в железнодорожном и автомобильном движении

Рекомендации:
Держитесь подальше от деревьев и укрывайтесь в капитальных зданиях.
Не въезжайте в затопленные тоннели — глубину воды снаружи почти невозможно оценить.
Закрепите вещи на улице до того, как гроза придёт.

Официальное предупреждение — не прогноз для каждой точки: грозы локальны,
и вполне может оказаться, что у вас останется сухо.`,
    glossary: [
      { term: 'amtlich', ru: 'официальный' },
      { term: 'Starkregen', ru: 'ливень' },
      { term: 'Sturmböen', ru: 'шквалистый ветер' },
      { term: 'Hagel', ru: 'град' },
      { term: 'Unterführung', ru: 'подземный переезд, тоннель' },
      { term: 'kleinräumig', ru: 'локальный, на малой площади' },
    ],
    questions: [
      {
        q: 'Warum soll man nicht in überflutete Unterführungen fahren?',
        options: [
          'Es ist verboten',
          'Man kann die Wassertiefe von außen kaum schätzen',
          'Das Auto wird schmutzig',
          'Dort stehen Bäume',
        ],
        correct: 1,
        why: 'Причина в тексте не про запрет, а про оценку: снаружи глубина не читается, и въезжают туда именно поэтому.',
      },
      {
        q: 'Wann soll man Gegenstände im Freien sichern?',
        options: [
          'Während des Gewitters',
          'Bevor das Gewitter da ist',
          'Nach dem Gewitter',
          'Gar nicht',
        ],
        correct: 1,
        why: '«bevor das Gewitter da ist» — предлог bevor задаёт порядок: сначала закрепить, потом гроза.',
      },
      {
        q: 'Was bedeutet der letzte Absatz?',
        options: [
          'Die Warnung gilt sicher für jeden Ort',
          'Die Warnung kann für Ihren Ort auch folgenlos bleiben',
          'Die Warnung ist ein Fehler',
          'Das Gewitter kommt bestimmt',
        ],
        correct: 1,
        why: 'Предупреждение говорит о вероятности на площади, а не о гарантии в точке — «es kann sein, dass es bei Ihnen trocken bleibt».',
      },
    ],
  },

  // ─── Дом и город ──────────────────────────────────────────────────────────
  {
    id: 'de-stromrechnung',
    lang: 'de', title: 'Stromabrechnung (счёт за электричество)', level: 'B1', minutes: 4,
    topic: 'Дом и город', skill: 'Чтение',
    origin: 'original',
    body: `Jahresabrechnung Strom · Kundennummer 40318827
Zeitraum: 01.07.2025 – 30.06.2026

Zählerstand alt        14 208 kWh
Zählerstand neu        16 693 kWh
Verbrauch               2 485 kWh

Grundpreis  12 Monate à 9,90 €        118,80 €
Arbeitspreis 2 485 kWh à 0,3190 €     792,72 €
                                     ---------
Gesamtkosten                          911,52 €
Bereits gezahlt (12 × 78,00 €)        936,00 €
                                     ---------
Guthaben zu Ihren Gunsten              24,48 €

Das Guthaben überweisen wir innerhalb von 14 Tagen auf Ihr Konto.

Ihr Abschlag wird ab August auf 76,00 € angepasst. Sie können den
Abschlag selbst ändern, wenn sich Ihr Verbrauch absehbar ändert —
zum Beispiel, weil jemand aus- oder einzieht.

Bitte prüfen Sie den Zählerstand. Weicht er ab, melden Sie ihn uns
innerhalb von vier Wochen; danach gilt die Abrechnung als anerkannt.`,
    translation: `Годовой расчёт за электричество · номер клиента 40318827
Период: 01.07.2025 – 30.06.2026

Показание старое      14 208 кВт·ч
Показание новое       16 693 кВт·ч
Потребление            2 485 кВт·ч

Абонплата, 12 месяцев по 9,90 €        118,80 €
Тариф, 2 485 кВт·ч по 0,3190 €         792,72 €
                                      ---------
Итого                                  911,52 €
Уже оплачено (12 × 78,00 €)            936,00 €
                                      ---------
Переплата в вашу пользу                 24,48 €

Переплату переведём на ваш счёт в течение 14 дней.

С августа ежемесячный платёж меняется на 76,00 €. Вы можете изменить его сами,
если потребление предсказуемо изменится — например, кто-то съезжает или въезжает.

Проверьте показание счётчика. Если оно расходится, сообщите нам в течение
четырёх недель; после этого расчёт считается принятым.`,
    glossary: [
      { term: 'Zählerstand', ru: 'показание счётчика' },
      { term: 'Verbrauch', ru: 'потребление' },
      { term: 'Grundpreis', ru: 'абонентская плата' },
      { term: 'Guthaben', ru: 'переплата, остаток в пользу клиента' },
      { term: 'Abschlag', ru: 'ежемесячный авансовый платёж' },
      { term: 'anerkannt', ru: 'признанный, принятый' },
    ],
    questions: [
      {
        q: 'Warum bekommt der Kunde Geld zurück?',
        options: [
          'Er hat zu wenig gezahlt',
          'Er hat mehr im Voraus gezahlt, als der Strom gekostet hat',
          'Der Preis ist gesunken',
          'Es ist ein Fehler',
        ],
        correct: 1,
        why: 'Оплачено 936,00 при стоимости 911,52 — переплата и есть разница между авансом и фактом.',
      },
      {
        q: 'Was passiert, wenn man den falschen Zählerstand nicht meldet?',
        options: [
          'Nichts',
          'Nach vier Wochen gilt die Abrechnung als anerkannt',
          'Der Vertrag endet',
          'Man zahlt eine Strafe',
        ],
        correct: 1,
        why: 'Срок в четыре недели работает молча: не возразили — расчёт считается принятым, и оспорить его будет уже нечем.',
      },
      {
        q: 'Wann darf man den Abschlag selbst ändern?',
        options: [
          'Nie',
          'Wenn sich der Verbrauch absehbar ändert',
          'Nur im Januar',
          'Nur mit einem neuen Vertrag',
        ],
        correct: 1,
        why: 'Счёт прямо называет случай — переезд кого-то из жильцов, то есть предсказуемое изменение потребления.',
      },
    ],
  },

  // ─── Время и планы ────────────────────────────────────────────────────────
  {
    id: 'de-kuendigung',
    lang: 'de', title: 'Kündigung des Abos (расторжение абонемента)', level: 'B1', minutes: 3,
    topic: 'Время и планы', skill: 'Чтение',
    origin: 'original',
    body: `Betreff: Kündigung meiner Mitgliedschaft, Vertragsnummer 55-90412

Sehr geehrte Damen und Herren,

hiermit kündige ich meine Mitgliedschaft im Fitnessstudio zum
nächstmöglichen Termin.

Mein Vertrag läuft bis zum 31. Oktober, die Kündigungsfrist beträgt
laut Vertrag einen Monat. Ich gehe daher davon aus, dass die
Kündigung zum 31. Oktober wirksam wird. Sollte das nicht zutreffen,
bitte ich um eine kurze Mitteilung mit dem korrekten Datum.

Bitte bestätigen Sie mir die Kündigung schriftlich und stellen Sie
die Abbuchungen ab November ein.

Mit freundlichen Grüßen
Marta Nowak
28. September`,
    translation: `Тема: расторжение членства, номер договора 55-90412

Уважаемые дамы и господа,

настоящим расторгаю членство в фитнес-клубе с ближайшей возможной даты.

Мой договор действует до 31 октября, срок предупреждения по договору —
один месяц. Исходя из этого, полагаю, что расторжение вступает в силу
31 октября. Если это не так, прошу коротко сообщить корректную дату.

Прошу подтвердить расторжение письменно и прекратить списания с ноября.

С уважением,
Марта Новак
28 сентября`,
    glossary: [
      { term: 'hiermit', ru: 'настоящим (в официальном письме)' },
      { term: 'Kündigungsfrist', ru: 'срок предупреждения о расторжении' },
      { term: 'beträgt', ru: 'составляет' },
      { term: 'wirksam werden', ru: 'вступать в силу' },
      { term: 'zutreffen', ru: 'соответствовать действительности' },
      { term: 'Abbuchung', ru: 'списание со счёта' },
    ],
    questions: [
      {
        q: 'Warum nennt Marta ein konkretes Datum?',
        options: [
          'Damit klar wird, wovon sie ausgeht, und man sie korrigieren kann',
          'Weil sie an dem Tag Geburtstag hat',
          'Weil der Vertrag es verlangt',
          'Ohne Grund',
        ],
        correct: 0,
        why: 'Дата названа вместе с просьбой поправить её — так письмо снимает спор о сроке заранее, вместо того чтобы ждать отказа.',
      },
      {
        q: 'Worum bittet Marta außer der Kündigung?',
        options: [
          'Um Geld zurück',
          'Um eine schriftliche Bestätigung und das Ende der Abbuchungen',
          'Um einen neuen Vertrag',
          'Um ein Gespräch',
        ],
        correct: 1,
        why: 'Обе просьбы стоят в одном предложении: подтвердить письменно и прекратить списания.',
      },
      {
        q: 'Wie ist der Ton des Briefes?',
        options: [
          'Wütend',
          'Sachlich und förmlich',
          'Freundschaftlich',
          'Unsicher',
        ],
        correct: 1,
        why: 'Формулы hiermit, ich gehe davon aus, mit freundlichen Grüßen — стандартный деловой регистр без эмоций.',
      },
    ],
  },

  // ─── Технологии и медиа ───────────────────────────────────────────────────
  {
    id: 'de-phishing',
    lang: 'de', title: 'Verdächtige E-Mail (подозрительное письмо)', level: 'B2', minutes: 4,
    topic: 'Технологии и медиа', skill: 'Чтение',
    origin: 'original',
    body: `Von: sicherheit@spаrkasse-kundencenter.de
Betreff: Ihr Konto wurde vorübergehend eingeschränkt

Sehr geehrter Kunde,

im Rahmen einer routinemäßigen Überprüfung wurde festgestellt, dass Ihre
Daten nicht mehr aktuell sind. Aus Sicherheitsgründen haben wir Ihr Konto
vorübergehend eingeschränkt.

Bitte bestätigen Sie Ihre Angaben innerhalb von 24 Stunden über den
folgenden Link, andernfalls wird Ihr Zugang dauerhaft gesperrt.

→ Jetzt verifizieren

Mit freundlichen Grüßen
Ihr Sicherheitsteam

────────────────────────────────────────────────
Woran man solche Mails erkennt:
· Die Absenderadresse sieht echt aus, ist es aber nicht — hier steht ein
  kyrillisches «а» im Namen der Bank.
· Anrede ohne Namen: eine echte Bank kennt Ihren.
· Künstlicher Zeitdruck: 24 Stunden, sonst gesperrt.
· Handlung nur über einen Link im Brief.

Banken fragen nie per Mail nach PIN, TAN oder Passwort. Im Zweifel:
Mail schließen, die App selbst öffnen oder die Nummer von der Bankkarte
anrufen — nie die Nummer aus der Mail.`,
    translation: `От: sicherheit@spаrkasse-kundencenter.de
Тема: ваш счёт временно ограничен

Уважаемый клиент,

в рамках плановой проверки установлено, что ваши данные устарели.
По соображениям безопасности мы временно ограничили ваш счёт.

Пожалуйста, подтвердите данные в течение 24 часов по ссылке ниже,
иначе доступ будет заблокирован окончательно.

→ Подтвердить сейчас

С уважением, служба безопасности

────────────────────────────────────────────────
Как узнать такие письма:
· Адрес отправителя выглядит настоящим, но им не является — здесь в названии
банка стоит кириллическая «а».
· Обращение без имени: настоящий банк знает, как вас зовут.
· Искусственная спешка: 24 часа, иначе блокировка.
· Действие только по ссылке из письма.

Банки никогда не спрашивают по почте PIN, TAN или пароль. Если сомневаетесь:
закройте письмо, откройте приложение сами или позвоните по номеру с карты —
но не по номеру из письма.`,
    glossary: [
      { term: 'vorübergehend', ru: 'временно' },
      { term: 'eingeschränkt', ru: 'ограничен' },
      { term: 'im Rahmen', ru: 'в рамках' },
      { term: 'Anrede', ru: 'обращение (в письме)' },
      { term: 'Zeitdruck', ru: 'нехватка времени, спешка' },
      { term: 'im Zweifel', ru: 'если сомневаетесь' },
    ],
    questions: [
      {
        q: 'Was ist an der Absenderadresse falsch?',
        options: [
          'Sie ist zu lang',
          'Im Namen der Bank steht ein kyrillischer Buchstabe',
          'Sie endet auf .de',
          'Nichts',
        ],
        correct: 1,
        why: 'Подмена одной буквы на визуально такую же из другого алфавита — приём, который глазом не ловится, поэтому адрес и выглядит настоящим.',
      },
      {
        q: 'Warum steht in der Mail eine Frist von 24 Stunden?',
        options: [
          'Weil die Bank so arbeitet',
          'Um Zeitdruck zu erzeugen, damit man nicht nachdenkt',
          'Weil das Gesetz es verlangt',
          'Es ist ein Zufall',
        ],
        correct: 1,
        why: 'Срок здесь работает не как правило, а как приём: короткое окно мешает проверить письмо и толкает нажать ссылку.',
      },
      {
        q: 'Was soll man im Zweifel tun?',
        options: [
          'Den Link öffnen und prüfen',
          'Die Nummer aus der Mail anrufen',
          'Die App selbst öffnen oder die Nummer von der Karte anrufen',
          'Die Mail beantworten',
        ],
        correct: 2,
        why: 'Общее правило: возвращаться к банку своим путём. Всё, что предложено внутри письма, включая телефон, может принадлежать отправителю.',
      },
    ],
  },

  // ─── Путешествия ──────────────────────────────────────────────────────────
  {
    id: 'de-jugendherberge',
    lang: 'de', title: 'Hausordnung der Jugendherberge (правила хостела)', level: 'A2', minutes: 3,
    topic: 'Путешествия', skill: 'Чтение',
    origin: 'original',
    body: `HAUSORDNUNG

Anreise ab 15:00, Abreise bis 10:00.
Nach 22:00 ist Nachtruhe. Bitte im Haus und im Hof leise sein.

Die Zimmerschlüssel bekommen Sie an der Rezeption gegen 10 € Pfand.
Bei Verlust berechnen wir 30 €.

Frühstück gibt es von 7:00 bis 9:30 im Speisesaal.
Essen und Getränke dürfen nicht mit aufs Zimmer genommen werden.

In der Küche darf jeder kochen. Bitte räumen Sie danach auf —
das Personal macht das nicht. Lebensmittel im Kühlschrank bitte mit
Namen und Datum beschriften; alles ohne Beschriftung wird freitags entsorgt.

Rauchen ist im ganzen Gebäude verboten, auch auf dem Balkon.
Der Raucherbereich liegt hinter dem Fahrradstand.`,
    translation: `ПРАВИЛА ПРОЖИВАНИЯ

Заезд с 15:00, выезд до 10:00.
После 22:00 — тихий час. В доме и во дворе, пожалуйста, тихо.

Ключи от комнаты выдаются на ресепшене под залог 10 €.
При утере берём 30 €.

Завтрак с 7:00 до 9:30 в столовой.
Еду и напитки уносить в комнату нельзя.

На кухне готовить может каждый. Уберите за собой — персонал этого не делает.
Продукты в холодильнике подписывайте именем и датой; всё без подписи
по пятницам выбрасывается.

Курение запрещено во всём здании, в том числе на балконе.
Место для курения — за велосипедной стоянкой.`,
    glossary: [
      { term: 'Nachtruhe', ru: 'тихий час, ночная тишина' },
      { term: 'Pfand', ru: 'залог' },
      { term: 'bei Verlust', ru: 'при утере' },
      { term: 'aufräumen', ru: 'убирать за собой' },
      { term: 'beschriften', ru: 'подписывать' },
      { term: 'entsorgen', ru: 'выбрасывать, утилизировать' },
    ],
    questions: [
      {
        q: 'Sie verlieren den Schlüssel. Wie viel zahlen Sie insgesamt drauf?',
        options: ['10 €', '20 €', '30 €', 'Nichts'],
        correct: 1,
        why: 'Залог в 10 € уже внесён и просто не возвращается, а всего берут 30 — то есть сверху доплатить придётся двадцать.',
      },
      {
        q: 'Was passiert mit Lebensmitteln ohne Namen?',
        options: [
          'Sie bleiben liegen',
          'Sie werden freitags entsorgt',
          'Das Personal isst sie',
          'Sie kommen ins Fundbüro',
        ],
        correct: 1,
        why: 'Правило названо вместе с днём: без подписи продукты выбрасывают по пятницам.',
      },
      {
        q: 'Darf man auf dem Balkon rauchen?',
        options: [
          'Ja',
          'Nein, im ganzen Gebäude nicht',
          'Nur nach 22:00',
          'Nur mit Erlaubnis',
        ],
        correct: 1,
        why: 'Балкон назван отдельно именно потому, что его обычно считают исключением: «auch auf dem Balkon».',
      },
    ],
  },

  // ─── Семья и люди ─────────────────────────────────────────────────────────
  {
    id: 'de-wg-chat',
    lang: 'de', title: 'WG-Chat (чат соседей по квартире)', level: 'B2', minutes: 4,
    topic: 'Семья и люди', skill: 'Чтение',
    origin: 'original',
    body: `JONAS: Leute, kurz was Unangenehmes. Die Küche war heute früh wieder
voll. Ich will niemandem was vorwerfen, aber so klappt das nicht.

LENA: Das war ich, sorry. Ich kam gestern spät heim und wollte morgens
aufräumen — bin dann verschlafen los.

JONAS: Alles gut, danke fürs Sagen. Mir geht es weniger um gestern als
darum, dass wir keine Regel haben und deshalb jedes Mal diskutieren.

SAM: Vorschlag: Wer kocht, räumt direkt danach. Und einmal die Woche
macht einer die ganze Küche, im Wechsel.

LENA: Klingt fair. Ich nehme diese Woche, dann ist das gleich ausgeglichen.

JONAS: Passt. Ich schreibe die Reihenfolge an den Kühlschrank, dann
muss sich das keiner merken.

SAM: Und wenn jemand nicht kann, tauscht er selbst — nicht einfach
ausfallen lassen.

LENA: Einverstanden.`,
    translation: `ЙОНАС: Ребята, коротко о неприятном. Кухня утром снова была завалена.
Я никого не обвиняю, но так не работает.

ЛЕНА: Это была я, извините. Вчера пришла поздно, хотела убрать утром —
а потом проспала.

ЙОНАС: Всё нормально, спасибо, что сказала. Мне важно не вчерашнее,
а то, что у нас нет правила и поэтому мы каждый раз это обсуждаем.

СЭМ: Предложение: кто готовит — сразу за собой убирает. И раз в неделю
кто-то делает всю кухню, по очереди.

ЛЕНА: Звучит честно. Беру эту неделю, тогда сразу и уравняем.

ЙОНАС: Годится. Повешу очередь на холодильник, чтобы никому не запоминать.

СЭМ: И если кто-то не может — меняется сам, а не просто пропускает.

ЛЕНА: Согласна.`,
    glossary: [
      { term: 'vorwerfen', ru: 'упрекать, ставить в вину' },
      { term: 'verschlafen', ru: 'проспать' },
      { term: 'es geht mir um', ru: 'мне важно, речь для меня о' },
      { term: 'im Wechsel', ru: 'по очереди' },
      { term: 'ausgeglichen', ru: 'уравновешенный, справедливый' },
      { term: 'ausfallen lassen', ru: 'пропустить, оставить невыполненным' },
    ],
    questions: [
      {
        q: 'Was ist Jonas eigentlich wichtig?',
        options: [
          'Dass Lena sich entschuldigt',
          'Dass es eine Regel gibt statt jedes Mal einer Diskussion',
          'Dass Lena die Küche putzt',
          'Dass Sam kocht',
        ],
        correct: 1,
        why: '«Mir geht es weniger um gestern als darum, dass wir keine Regel haben» — он сам отделяет случай от причины.',
      },
      {
        q: 'Warum nimmt Lena gerade diese Woche?',
        options: [
          'Weil sie Zeit hat',
          'Weil sie den gestrigen Abend ausgleichen will',
          'Weil Jonas es verlangt',
          'Weil sie gern putzt',
        ],
        correct: 1,
        why: '«dann ist das gleich ausgeglichen» — она сама связывает свою очередь со вчерашним.',
      },
      {
        q: 'Was soll passieren, wenn jemand seinen Termin nicht schafft?',
        options: [
          'Er lässt ihn ausfallen',
          'Er tauscht selbst mit jemandem',
          'Jonas übernimmt',
          'Nichts, das ist egal',
        ],
        correct: 1,
        why: 'Сэм закрывает лазейку заранее: обмен — обязанность того, кто не может, а не общая проблема.',
      },
    ],
  },

  // ─── Здоровье ─────────────────────────────────────────────────────────────
  {
    id: 'de-krankenkasse',
    lang: 'de', title: 'Brief der Krankenkasse (письмо больничной кассы)', level: 'C1', minutes: 5,
    topic: 'Здоровье', skill: 'Чтение',
    origin: 'original',
    body: `Sehr geehrte Frau Nowak,

Sie haben die Erstattung einer osteopathischen Behandlung beantragt.
Nach Prüfung teilen wir Ihnen Folgendes mit.

Osteopathie gehört nicht zum Leistungskatalog der gesetzlichen
Krankenversicherung. Eine Erstattung erfolgt daher nicht als Regelleistung,
sondern ausschließlich im Rahmen unserer freiwilligen Satzungsleistung.
Diese sieht bis zu sechs Sitzungen je Kalenderjahr vor und erstattet
80 Prozent der Kosten, höchstens jedoch 60 Euro je Sitzung.

Voraussetzung ist eine ärztliche Empfehlung, die VOR Behandlungsbeginn
ausgestellt wurde, sowie eine Behandlung durch eine Person mit
anerkanntem Osteopathie-Nachweis.

Die von Ihnen eingereichte Empfehlung datiert vom 14. April, die erste
Sitzung fand am 2. April statt. Für die Sitzungen vom 2. und 9. April
können wir daher nicht leisten. Ab der Sitzung vom 21. April sind die
Voraussetzungen erfüllt; hierfür erstatten wir 3 × 60 Euro.

Sollten Sie mit dieser Entscheidung nicht einverstanden sein, können Sie
innerhalb eines Monats nach Zugang dieses Schreibens Widerspruch einlegen.
Der Widerspruch bedarf der Schriftform; eine Begründung können Sie
nachreichen.`,
    translation: `Уважаемая госпожа Новак,

Вы подали заявление о возмещении расходов на остеопатическое лечение.
По результатам рассмотрения сообщаем следующее.

Остеопатия не входит в перечень услуг обязательного медицинского страхования.
Возмещение поэтому производится не как обычная услуга, а исключительно в рамках
нашей добровольной уставной льготы. Она предусматривает до шести сеансов
в календарный год и возмещает 80 процентов стоимости, но не более 60 евро за сеанс.

Условие — врачебная рекомендация, выданная ДО начала лечения, и лечение
у специалиста с признанным подтверждением квалификации остеопата.

Представленная вами рекомендация датирована 14 апреля, первый сеанс состоялся
2 апреля. За сеансы 2 и 9 апреля мы поэтому выплатить не можем. Начиная
с сеанса 21 апреля условия выполнены; за них возмещаем 3 × 60 евро.

Если вы не согласны с этим решением, вы можете в течение месяца со дня получения
письма подать возражение. Возражение подаётся в письменной форме; обоснование
можно донести позже.`,
    glossary: [
      { term: 'Erstattung', ru: 'возмещение расходов' },
      { term: 'Leistungskatalog', ru: 'перечень покрываемых услуг' },
      { term: 'Satzungsleistung', ru: 'льгота по уставу кассы, добровольная' },
      { term: 'Voraussetzung', ru: 'условие, предпосылка' },
      { term: 'ausgestellt', ru: 'выданный (о документе)' },
      { term: 'Widerspruch einlegen', ru: 'подать возражение' },
      { term: 'nachreichen', ru: 'донести позже, представить дополнительно' },
    ],
    questions: [
      {
        q: 'Warum werden die ersten beiden Sitzungen nicht erstattet?',
        options: [
          'Sie waren zu teuer',
          'Die ärztliche Empfehlung wurde erst danach ausgestellt',
          'Die Osteopathin war nicht anerkannt',
          'Das Jahreslimit war erreicht',
        ],
        correct: 1,
        why: 'Условие требует рекомендации ДО начала лечения; она от 14 апреля, а сеансы были 2 и 9 — то есть раньше документа.',
      },
      {
        q: 'Eine Sitzung kostet 90 Euro. Wie viel wird erstattet?',
        options: ['90 Euro', '72 Euro', '60 Euro', '54 Euro'],
        correct: 2,
        why: '80 процентов от 90 — это 72, но действует потолок в 60 евро за сеанс, и он здесь оказывается ниже.',
      },
      {
        q: 'Was gilt für den Widerspruch?',
        options: [
          'Er muss sofort begründet werden',
          'Er muss schriftlich sein, die Begründung darf später kommen',
          'Er ist nur telefonisch möglich',
          'Er ist ausgeschlossen',
        ],
        correct: 1,
        why: 'Письмо разделяет форму и содержание: письменная форма обязательна сразу, обоснование можно донести потом.',
      },
    ],
  },
]
