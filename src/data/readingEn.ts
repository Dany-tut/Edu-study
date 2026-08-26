// ─────────────────────────────────────────────────────────────────────────────
// Английские тексты тренажёра: темы поверх рабочего курса
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ — см. шапку readingKo.ts: в readingLibrary.ts лежит
// по одному-двум стартовым текстам на язык, дальше каждый язык растёт своим
// файлом, иначе правка немецкого начинается с пролистывания корейского.
//
// ЧЕГО НЕ ХВАТАЛО. Английских текстов было пять, и все пять — про работу:
// вакансия, оффер, переписка с командой, обратная связь. Для курса «Карьера
// дизайнера» это ровно то, что нужно, но фильтр «Тема» с четырьмя рабочими
// значениями означает, что человеку, который поехал в страну жить, читать
// нечего. Здесь взяты бытовые темы костяка (data/languageTaxonomy) — то, с чем
// человек сталкивается вне офиса: жильё, аптека, посадочный талон, возврат
// покупки, штормовое предупреждение, политика приватности.
//
// УРОВЕНЬ. Шкала CEFR. Было только A2 и B1 — ступени по краям пустовали:
// начинающему не с чего начать, продвинутому нечем закончить. Здесь A1 (список
// и ценник, где предложений почти нет), A2–B1 (бытовой документ), B2 (текст с
// условиями и оговорками) и C1 (юридический язык, где смысл держится на
// «unless», «provided that» и различении may / must).
//
// СЛОВАРЬ. Каждое слово текста и вопросов — в data/wordGloss.ts (сторож
// npm run check:gloss). Перевод формулировок — data/questionRu.ts
// (npm run check:questions).
// ─────────────────────────────────────────────────────────────────────────────

import type { ReadingText } from './readingLibrary'

export const EN_TEXTS: ReadingText[] = [
  // ─── Знакомство ───────────────────────────────────────────────────────────
  {
    id: 'en-host-profile',
    lang: 'en', title: 'Meet your host', level: 'A1', minutes: 2,
    topic: 'Знакомство', skill: 'Чтение',
    origin: 'original',
    body: `Meet your host

Hi! I am Tomas. I am 34 and I live in Porto with my dog, Nina.

I work from home. I am a translator, so I am usually here in the morning.
I speak Portuguese, English and a little Spanish.

I like cooking, long walks and old films.

I am happy to help with maps, buses and good places to eat.
Please write to me here, not by phone — I answer faster.

Check-in is after 15:00. Check-out is before 11:00.`,
    translation: `Ваш хозяин

Привет! Меня зовут Томаш, мне 34, живу в Порту с собакой Ниной.

Работаю из дома, я переводчик, так что по утрам обычно тут.
Говорю на португальском, английском и немного на испанском.

Люблю готовить, долгие прогулки и старое кино.

С радостью подскажу карты, автобусы и где вкусно поесть.
Пишите, пожалуйста, сюда, а не на телефон — так я отвечаю быстрее.

Заселение после 15:00, выезд до 11:00.`,
    glossary: [
      { term: 'host', ru: 'хозяин жилья' },
      { term: 'a little', ru: 'немного' },
      { term: 'happy to help', ru: 'рад помочь' },
      { term: 'check-in', ru: 'заселение' },
      { term: 'check-out', ru: 'выезд' },
    ],
    questions: [
      {
        q: 'What does Tomas do for work?',
        options: ['A translator', 'A cook', 'A driver', 'A teacher'],
        correct: 0,
        why: '«I am a translator» — стоит прямо во второй строке. Готовка тут отвлекает: она в списке увлечений, а не работы.',
      },
      {
        q: 'How does Tomas want you to contact him?',
        options: ['By phone', 'By email', 'By message here', 'In person'],
        correct: 2,
        why: '«Please write to me here, not by phone» — просьба сформулирована через отрицание, и телефон в ней упоминается именно как нежелательный способ.',
      },
      {
        q: 'Can you arrive at 13:00?',
        options: ['Yes, any time', 'Only with a key', 'The text does not say', 'No, check-in is after 15:00'],
        correct: 3,
        why: '«Check-in is after 15:00». Час дня — раньше, а «after» границу не включает.',
      },
    ],
  },

  // ─── Еда ──────────────────────────────────────────────────────────────────
  {
    id: 'en-breakfast-menu',
    lang: 'en', title: 'Breakfast menu', level: 'A1', minutes: 2,
    topic: 'Еда', skill: 'Чтение',
    origin: 'original',
    body: `BREAKFAST — served until 11:30

Toast with butter and jam ............ 3.50
Two eggs, any style .................. 5.00
Porridge with fruit .................. 4.50
Yoghurt, honey and nuts .............. 4.50
Full breakfast (eggs, beans, toast) .. 8.90

Coffee 2.20 · Tea 2.00 · Fresh orange juice 3.60

Any breakfast + a hot drink: 1.00 off.
Bread is free with the full breakfast.

We can make the porridge with oat milk. Please ask.
No card payments under 5.00, sorry.`,
    translation: `ЗАВТРАК — подаём до 11:30

Тост с маслом и джемом ............ 3,50
Два яйца, как пожелаете ........... 5,00
Каша с фруктами ................... 4,50
Йогурт с мёдом и орехами .......... 4,50
Полный завтрак (яйца, фасоль, тост) 8,90

Кофе 2,20 · Чай 2,00 · Свежий апельсиновый сок 3,60

Любой завтрак + горячий напиток: минус 1,00.
К полному завтраку хлеб бесплатно.

Кашу можем сварить на овсяном молоке — просто скажите.
Картой принимаем от 5,00, извините.`,
    glossary: [
      { term: 'served until', ru: 'подаётся до' },
      { term: 'any style', ru: 'как пожелаете (о яйцах)' },
      { term: 'porridge', ru: 'каша' },
      { term: 'beans', ru: 'фасоль' },
      { term: 'off', ru: 'скидка' },
      { term: 'oat milk', ru: 'овсяное молоко' },
    ],
    questions: [
      {
        q: 'You order porridge and a coffee. How much do you pay?',
        options: ['6.70', '5.70', '4.50', '7.70'],
        correct: 1,
        why: '4.50 + 2.20 = 6.70, минус скидка 1.00 за «завтрак + горячий напиток» = 5.70.',
      },
      {
        q: 'Can you pay by card for a 2.00 tea?',
        options: ['Yes', 'No, card payments start at 5.00', 'Only in the morning', 'Only with a full breakfast'],
        correct: 1,
        why: '«No card payments under 5.00» — под запретом всё дешевле пяти, а чай стоит два.',
      },
      {
        q: 'What comes free with the full breakfast?',
        options: ['Coffee', 'Juice', 'Nothing', 'Bread'],
        correct: 3,
        why: '«Bread is free with the full breakfast». Кофе тоже упоминается рядом, но со скидкой в тысячу, а не бесплатно.',
      },
    ],
  },

  // ─── Дом и город ──────────────────────────────────────────────────────────
  {
    id: 'en-laundry-notice',
    lang: 'en', title: 'Laundry room rules', level: 'A2', minutes: 2,
    topic: 'Дом и город', skill: 'Чтение',
    origin: 'original',
    body: `LAUNDRY ROOM — please read

Open 07:00 – 22:00. Machines stop taking new loads at 21:00.

• Book a machine on the board by the door. One slot per flat per day.
• If you are more than 15 minutes late, your slot is free for anyone else.
• Take your clothes out as soon as the machine stops. After 30 minutes
  the caretaker may put them in a basket, and we are not responsible for them.
• Do not wash shoes or rugs here. They break the drums.
• The dryer filter must be cleaned after every use. It takes ten seconds.

Something is broken? Write the machine number on the sheet by the door.
Do not use the machine and do not try to fix it yourself.`,
    translation: `ПРАЧЕЧНАЯ — прочтите, пожалуйста

Открыто с 07:00 до 22:00. Новые загрузки машины принимают до 21:00.

• Записывайтесь на доске у двери. Одно окно на квартиру в день.
• Опоздали больше чем на 15 минут — ваше окно свободно для любого другого.
• Забирайте бельё сразу, как машина остановилась. Через 30 минут управляющий
может переложить его в корзину, и за него мы не отвечаем.
• Не стирайте здесь обувь и коврики: они ломают барабан.
• Фильтр сушилки чистится после каждого использования. Это десять секунд.

Что-то сломалось? Запишите номер машины на листке у двери.
Не пользуйтесь ею и не чините сами.`,
    glossary: [
      { term: 'load', ru: 'загрузка (партия белья)' },
      { term: 'slot', ru: 'окно во времени, слот' },
      { term: 'caretaker', ru: 'управляющий домом' },
      { term: 'we are not responsible', ru: 'мы не несём ответственности' },
      { term: 'rug', ru: 'коврик' },
      { term: 'drum', ru: 'барабан машины' },
    ],
    questions: [
      {
        q: 'You booked 20:30 and arrive at 20:50. What can happen?',
        options: [
          'Nothing, the slot is yours',
          'You pay a fine',
          'Someone else may take the slot',
          'The room is closed',
        ],
        correct: 2,
        why: 'Опоздание больше пятнадцати минут освобождает слот для любого другого.',
      },
      {
        q: 'Your washing finished 40 minutes ago. Where can your clothes be?',
        options: ['Still in the machine', 'In your flat', 'With the caretaker’s keys', 'In a basket'],
        correct: 3,
        why: 'Через тридцать минут управляющий вправе переложить бельё в корзину — сорок минут этот срок уже прошли.',
      },
      {
        q: 'A machine is making a strange noise. What should you do?',
        options: [
          'Fix it yourself',
          'Use it carefully',
          'Write the machine number on the sheet and stop using it',
          'Call the police',
        ],
        correct: 2,
        why: 'Объявление даёт два запрета сразу: не пользоваться и не чинить самому. Остаётся записать номер на листке.',
      },
    ],
  },

  // ─── Путешествия ──────────────────────────────────────────────────────────
  {
    id: 'en-boarding-pass',
    lang: 'en', title: 'Boarding pass and baggage', level: 'A2', minutes: 3,
    topic: 'Путешествия', skill: 'Чтение',
    origin: 'original',
    body: `BOARDING PASS

PASSENGER  ORLOVA / ANNA MS
FLIGHT     FR 1188      SEAT 14C
FROM       Berlin BER   TO  Dublin DUB
DATE       12 MAR       GATE closes 18:40
BOARDING   18:10        DEPARTURE 18:55

BAGGAGE
Included: one small bag under the seat in front of you (40 x 20 x 25 cm).
Not included: cabin bag in the overhead locker, checked bag.

Bags bought at the gate cost more than online. Add them before you travel.
Liquids in hand baggage: containers of 100 ml or less, in one clear bag.

The gate closes 15 minutes before departure. We cannot let you on after that,
even if you are already through security.`,
    translation: `ПОСАДОЧНЫЙ ТАЛОН

ПАССАЖИР   ОРЛОВА / АННА
РЕЙС       FR 1188      МЕСТО 14C
ОТКУДА     Берлин BER   КУДА  Дублин DUB
ДАТА       12 марта     ВЫХОД закрывается 18:40
ПОСАДКА    18:10        ВЫЛЕТ 18:55

БАГАЖ
Включено: одна маленькая сумка под кресло впереди (40 × 20 × 25 см).
Не включено: ручная кладь на полку и чемодан в багаж.

Купленная у выхода сумка стоит дороже, чем онлайн. Добавьте её заранее.
Жидкости в ручной клади: ёмкости не больше 100 мл, в одном прозрачном пакете.

Выход закрывается за 15 минут до вылета. После этого на борт не пустим,
даже если вы уже прошли досмотр.`,
    glossary: [
      { term: 'boarding', ru: 'посадка' },
      { term: 'gate', ru: 'выход на посадку' },
      { term: 'overhead locker', ru: 'полка над креслом' },
      { term: 'checked bag', ru: 'багаж в багажном отделении' },
      { term: 'hand baggage', ru: 'ручная кладь' },
      { term: 'through security', ru: 'прошедший досмотр' },
    ],
    questions: [
      {
        q: 'What can Anna take on board without paying extra?',
        options: [
          'A cabin bag in the locker',
          'A checked bag',
          'One small bag under the seat',
          'Two bags',
        ],
        correct: 2,
        why: '«Included: one small bag under the seat». Полка над креслом и багаж стоят в строке «Not included».',
      },
      {
        q: 'She arrives at the gate at 18:45. What happens?',
        options: [
          'She boards normally',
          'She pays a small fee',
          'She is not allowed on the flight',
          'She waits for the next passenger',
        ],
        correct: 2,
        why: 'Выход закрывается за 15 минут до вылета, то есть в 18:40 — и досмотр тут уже не помогает.',
      },
      {
        q: 'Where is it cheaper to buy a bag?',
        options: ['Online before the flight', 'At the gate', 'On the plane', 'The pass does not say'],
        correct: 0,
        why: '«Bags bought at the gate cost more than online» — сравнение прямое, и совет «add them before you travel» его подтверждает.',
      },
    ],
  },

  // ─── Покупки и деньги ─────────────────────────────────────────────────────
  {
    id: 'en-return-policy',
    lang: 'en', title: 'Returns and refunds', level: 'A2', minutes: 3,
    topic: 'Покупки и деньги', skill: 'Чтение',
    origin: 'original',
    body: `RETURNS

You can return most items within 28 days. Bring your receipt or the email
we sent you. Without one of these we can only offer an exchange.

The item must be unworn and with its tags on.

We cannot take back:
• pierced earrings
• underwear and swimwear
• anything made to order

Sale items can be returned, but the money goes back as a gift card.

Online orders can be returned to any shop. Post is free only if the item
arrived damaged or was the wrong size — otherwise you pay for the return.

Refunds go back to the card you paid with, in 3–5 working days.
The bank may take another two days to show it.`,
    translation: `ВОЗВРАТ

Большинство товаров можно вернуть в течение 28 дней. Возьмите чек или письмо,
которое мы вам прислали. Без одного из них возможен только обмен.

Вещь должна быть ненадёванной и с бирками.

Не принимаем обратно:
• серьги для проколотых ушей
• нижнее бельё и купальники
• всё, что сделано на заказ

Товары со скидкой вернуть можно, но деньги вернутся подарочной картой.

Заказы из интернета можно вернуть в любой магазин. Пересылка бесплатна только
если вещь пришла повреждённой или не того размера — иначе возврат за ваш счёт.

Деньги возвращаются на ту же карту за 3–5 рабочих дней.
Банку может понадобиться ещё пара дней, чтобы их показать.`,
    glossary: [
      { term: 'receipt', ru: 'чек' },
      { term: 'exchange', ru: 'обмен на другой товар' },
      { term: 'unworn', ru: 'ненадёванный' },
      { term: 'tags', ru: 'бирки' },
      { term: 'made to order', ru: 'сделанный на заказ' },
      { term: 'working days', ru: 'рабочие дни' },
    ],
    questions: [
      {
        q: 'You lost the receipt and the email. What can the shop do?',
        options: ['A full refund', 'An exchange only', 'Nothing at all', 'A gift card'],
        correct: 1,
        why: '«Without one of these we can only offer an exchange» — возврат денег требует подтверждения покупки, обмен нет.',
      },
      {
        q: 'You return a sale jumper. How do you get the money?',
        options: ['Cash', 'Back to your card', 'You cannot return sale items', 'As a gift card'],
        correct: 3,
        why: '«Sale items can be returned, but the money goes back as a gift card» — вернуть можно, но не деньгами.',
      },
      {
        q: 'When is return post free?',
        options: [
          'Always',
          'Never',
          'If the item was damaged or the wrong size',
          'Only for sale items',
        ],
        correct: 2,
        why: '«Post is free only if the item arrived damaged or was the wrong size» — слово only отсекает все остальные случаи.',
      },
    ],
  },

  // ─── Здоровье ─────────────────────────────────────────────────────────────
  {
    id: 'en-pharmacy-label',
    lang: 'en', title: 'A pharmacy label', level: 'B1', minutes: 3,
    topic: 'Здоровье', skill: 'Чтение',
    origin: 'original',
    body: `AMOXICILLIN 500 mg capsules
ORLOVA, A.        Dispensed 3 March

Take ONE capsule THREE times a day, with or just after food.
Space the doses about eight hours apart.

Finish the whole course, even if you feel better after two or three days.
Stopping early makes the infection more likely to come back.

If you forget a dose, take it as soon as you remember — unless your next dose
is nearly due. Never take two doses at once to catch up.

Tell your doctor straight away if you get a rash, swelling of the face,
or difficulty breathing.

Keep out of the sight and reach of children. Do not use after the date shown
on the box. Return any unused capsules to a pharmacy — do not put them in
the bin or down the sink.`,
    translation: `АМОКСИЦИЛЛИН, капсулы 500 мг
ОРЛОВА А.        Выдано 3 марта

По ОДНОЙ капсуле ТРИ раза в день, во время еды или сразу после.
Между приёмами примерно восемь часов.

Допейте весь курс, даже если через два-три дня стало лучше.
Прервав раньше, вы повышаете шанс, что инфекция вернётся.

Если пропустили приём, выпейте, как вспомните, — но не тогда, когда следующий
уже почти пора. Никогда не принимайте две дозы разом, чтобы нагнать.

Немедленно скажите врачу, если появилась сыпь, отёк лица или стало трудно дышать.

Держите там, где ребёнок не увидит и не достанет. Не используйте после срока,
указанного на коробке. Неиспользованные капсулы отнесите в аптеку — не выбрасывайте
в мусор и не смывайте в раковину.`,
    glossary: [
      { term: 'dispensed', ru: 'выдано (аптекой)' },
      { term: 'dose', ru: 'доза, приём' },
      { term: 'course', ru: 'курс лечения' },
      { term: 'nearly due', ru: 'уже почти пора' },
      { term: 'rash', ru: 'сыпь' },
      { term: 'reach', ru: 'досягаемость' },
      { term: 'bin', ru: 'мусорное ведро' },
    ],
    questions: [
      {
        q: 'You feel completely better on day three. What should you do?',
        options: [
          'Stop taking the capsules',
          'Take half doses',
          'Finish the whole course',
          'Ask a friend',
        ],
        correct: 2,
        why: 'Незаконченный курс — самая частая причина, по которой инфекция возвращается.',
      },
      {
        q: 'You forgot a dose and the next one is in one hour. What do you do?',
        options: [
          'Take two doses now',
          'Skip the missed dose',
          'Take the missed dose now and the next one on time',
          'Stop the course',
        ],
        correct: 1,
        why: 'Правило «take it as soon as you remember» отменяется оговоркой «unless your next dose is nearly due» — и двойная доза запрещена прямо.',
      },
      {
        q: 'What do you do with capsules you did not use?',
        options: [
          'Throw them in the bin',
          'Wash them down the sink',
          'Keep them for next time',
          'Take them back to a pharmacy',
        ],
        correct: 3,
        why: '«Return any unused capsules to a pharmacy» — и тут же прямой запрет на мусор и раковину.',
      },
    ],
  },

  // ─── Семья и люди ─────────────────────────────────────────────────────────
  {
    id: 'en-family-chat',
    lang: 'en', title: 'Family group chat', level: 'B1', minutes: 3,
    topic: 'Семья и люди', skill: 'Чтение',
    origin: 'original',
    body: `MUM: Gran gets in at 14:20 on Saturday, platform 3.

SAM: I can’t do the station, I’m working till three. Sorry.

KATE: I can go, but I don’t have the car seat for Leo. Can someone drop it round?

MUM: Sam, could you leave it in the porch before work?

SAM: Yes, easy. I’ll put it by the door tonight so I don’t forget.

KATE: Perfect. I’ll take Gran straight to yours, we’ll be there by three.

MUM: Lovely. I’ll do lunch for half past — nothing fancy, just soup.

SAM: Save me some, I’ll come after work.

KATE: One more thing — Gran can’t manage the stairs at the moment.
Can we put her in the downstairs room?

MUM: Already done. I moved the boxes out yesterday.`,
    translation: `МАМА: Бабушка приезжает в субботу в 14:20, платформа 3.

СЭМ: Я на вокзал не смогу, работаю до трёх. Извините.

КЕЙТ: Я съезжу, но у меня нет детского кресла для Лео. Кто-нибудь завезёт?

МАМА: Сэм, оставишь его в тамбуре перед работой?

СЭМ: Да, легко. Поставлю у двери вечером, чтобы не забыть.

КЕЙТ: Отлично. Отвезу бабушку сразу к тебе, будем к трём.

МАМА: Славно. Обед сделаю к половине — ничего особенного, просто суп.

СЭМ: Оставьте мне, приеду после работы.

КЕЙТ: Ещё одно: бабушка сейчас не справляется с лестницей.
Можно положить её в комнате внизу?

МАМА: Уже сделано. Вчера вынесла оттуда коробки.`,
    glossary: [
      { term: 'gets in', ru: 'прибывает (о поезде)' },
      { term: 'I can’t do', ru: 'у меня не получится' },
      { term: 'drop it round', ru: 'завезти, занести' },
      { term: 'porch', ru: 'крыльцо, тамбур' },
      { term: 'nothing fancy', ru: 'ничего особенного' },
      { term: 'can’t manage', ru: 'не справляется' },
    ],
    questions: [
      {
        q: 'Who is meeting Gran at the station?',
        options: ['Kate', 'Mum', 'Sam', 'Nobody'],
        correct: 0,
        why: 'Сэм работает до трёх, мама занята обедом, а Кейт пишет «Я съезжу» — при условии, что ей завезут кресло.',
      },
      {
        q: 'Why does Sam leave the car seat in the porch?',
        options: [
          'Because there is no room in the house',
          'Because Kate needs it and he will be at work',
          'Because Gran asked for it',
          'Because it is broken',
        ],
        correct: 1,
        why: 'Кейт едет на вокзал, но кресла у неё нет, а Сэм в это время на работе. Тамбур — способ передать вещь, не встречаясь.',
      },
      {
        q: 'What has Mum already done?',
        options: [
          'Made the soup',
          'Bought a train ticket',
          'Collected the car seat',
          'Cleared the downstairs room',
        ],
        correct: 3,
        why: '«Already done. I moved the boxes out yesterday» — единственное, что в переписке названо сделанным, а не запланированным.',
      },
    ],
  },

  // ─── Время и планы ────────────────────────────────────────────────────────
  {
    id: 'en-calendar-invite',
    lang: 'en', title: 'Moving a meeting', level: 'B1', minutes: 3,
    topic: 'Время и планы', skill: 'Чтение',
    origin: 'original',
    body: `INVITE: Quarterly review
Thursday 14 November, 10:00 – 11:30 (CET) · Room 2 / video link

Hi all,

I know Thursday morning is tight for the Lisbon team, so two options:

A) Keep Thursday 10:00 CET. That is 09:00 for Lisbon, which works,
   but Ana said she has a school run and would join twenty minutes late.
B) Move to Friday 13:00 CET. Everyone is free, but we lose the chance to
   act on anything before the numbers close on Friday evening.

I lean towards A: Ana can catch up from the recording, and a decision on
Thursday still leaves us a working day.

Please reply by Tuesday lunchtime. If I hear nothing, I will assume A
and send the final invite.

Agenda and last quarter’s slides are attached. Read them before, not during —
we only have ninety minutes and half of it is the budget.`,
    translation: `ПРИГЛАШЕНИЕ: Квартальный обзор
Четверг, 14 ноября, 10:00 – 11:30 (CET) · Переговорная 2 / видеосвязь

Всем привет,

Знаю, что утро четверга для лиссабонской команды впритык, поэтому два варианта:

A) Оставить четверг, 10:00 CET. Для Лиссабона это 09:00 — рабочее время,
но Ана сказала, что отвозит ребёнка в школу и присоединится на двадцать минут позже.
B) Перенести на пятницу, 13:00 CET. Свободны все, но мы теряем возможность
что-то сделать до того, как в пятницу вечером закроются цифры.

Я склоняюсь к A: Ана нагонит по записи, а решение в четверг оставляет нам рабочий день.

Ответьте, пожалуйста, до обеда вторника. Если никто не ответит, считаю, что A,
и разошлю финальное приглашение.

Повестка и слайды прошлого квартала приложены. Прочитайте до, а не во время —
у нас всего девяносто минут, и половина из них бюджет.`,
    glossary: [
      { term: 'tight', ru: 'впритык, тесно по времени' },
      { term: 'school run', ru: 'отвезти детей в школу' },
      { term: 'act on', ru: 'успеть что-то сделать по итогу' },
      { term: 'I lean towards', ru: 'я склоняюсь к' },
      { term: 'catch up', ru: 'нагнать, наверстать' },
      { term: 'I will assume', ru: 'буду считать, что' },
    ],
    questions: [
      {
        q: 'What happens if nobody replies?',
        options: [
          'Option A goes ahead',
          'The meeting is cancelled',
          'Option B goes ahead',
          'The sender asks again',
        ],
        correct: 0,
        why: '«If I hear nothing, I will assume A» — молчание здесь считается согласием, и это сказано заранее.',
      },
      {
        q: 'What is the problem with option B?',
        options: [
          'It is too late to act on the decision',
          'Ana cannot come',
          'There is no room',
          'The Lisbon team is busy',
        ],
        correct: 0,
        why: '«We lose the chance to act on anything before the numbers close» — проблема не в людях и не в переговорной, а в том, что после пятницы решение уже некуда приложить.',
      },
      {
        q: 'What does the sender ask people to do with the slides?',
        options: [
          'Read them during the meeting',
          'Read them before the meeting',
          'Print them',
          'Ignore them',
        ],
        correct: 1,
        why: '«Read them before, not during» — просьба построена на противопоставлении, и второй вариант в ней прямо отвергнут.',
      },
    ],
  },

  // ─── Погода и природа ─────────────────────────────────────────────────────
  {
    id: 'en-storm-warning',
    lang: 'en', title: 'Amber warning: wind', level: 'B2', minutes: 3,
    topic: 'Погода и природа', skill: 'Чтение',
    origin: 'original',
    body: `AMBER WARNING — WIND
In force from 18:00 Friday until 09:00 Saturday. West and south-west coasts.

Storm Freya will bring gusts of 60 to 70 mph inland and up to 85 mph on
exposed coasts and hills. The strongest winds are expected overnight, easing
from the west during Saturday morning.

What to expect
• Delays and cancellations to ferries, and to some rail and air services.
• Power cuts are likely, and may last longer in rural areas.
• Flying debris could cause injury or damage to buildings.
• Large waves and beach material thrown onto coastal roads and seafronts.

What you can do
Secure anything loose outside — bins, garden furniture, trampolines — before
the wind arrives, not during it. Avoid the coast at high tide: people are
injured every year taking photographs of the sea.

An amber warning means there is an increased likelihood of impacts, and that
you should change your plans. A red warning would mean danger to life.`,
    translation: `ОРАНЖЕВЫЙ УРОВЕНЬ — ВЕТЕР
Действует с 18:00 пятницы до 09:00 субботы. Западное и юго-западное побережье.

Шторм «Фрейя» принесёт порывы 60–70 миль в час вдали от моря и до 85 миль в час
на открытых участках побережья и в холмах. Самый сильный ветер ночью, к утру субботы
он начнёт ослабевать с запада.

Чего ждать
• Задержки и отмены паромов, части поездов и авиарейсов.
• Вероятны отключения электричества, за городом — надолго.
• Летящие обломки могут ранить человека и повредить здания.
• Большие волны и вынесенный на берег мусор на прибрежных дорогах и набережных.

Что можно сделать
Закрепите всё незакреплённое во дворе — баки, садовую мебель, батуты — до того,
как поднимется ветер, а не во время. Не ходите к морю в прилив: каждый год люди
получают травмы, фотографируя волны.

Оранжевый уровень означает повышенную вероятность последствий и то, что планы
стоит менять. Красный означал бы угрозу жизни.`,
    glossary: [
      { term: 'in force', ru: 'действует, в силе' },
      { term: 'gust', ru: 'порыв ветра' },
      { term: 'inland', ru: 'вдали от побережья' },
      { term: 'easing', ru: 'ослабевая' },
      { term: 'power cut', ru: 'отключение электричества' },
      { term: 'debris', ru: 'обломки, летящий мусор' },
      { term: 'likelihood', ru: 'вероятность' },
    ],
    questions: [
      {
        q: 'When are the strongest winds expected?',
        options: ['Overnight', 'Friday afternoon', 'Saturday midday', 'Sunday'],
        correct: 0,
        why: '«The strongest winds are expected overnight, easing from the west during Saturday morning» — к субботнему полудню ветер уже слабеет.',
      },
      {
        q: 'What does an amber warning mean, according to the text?',
        options: [
          'Danger to life',
          'A normal windy day',
          'Stay indoors by law',
          'A higher chance of disruption; change your plans',
        ],
        correct: 3,
        why: 'Красный — «danger to life»; жёлто-оранжевый говорит о вероятности последствий и о том, что планы стоит менять.',
      },
      {
        q: 'Why does the warning mention photographs?',
        options: [
          'People are injured going to the coast to take them',
          'Photos help the forecast',
          'Photography is banned',
          'The waves look good on camera',
        ],
        correct: 0,
        why: '«People are injured every year taking photographs of the sea» — фраза стоит в разделе «что вы можете сделать» как объяснение запрета выходить к морю.',
      },
    ],
  },

  // ─── Учёба ────────────────────────────────────────────────────────────────
  {
    id: 'en-syllabus',
    lang: 'en', title: 'Course syllabus: assessment', level: 'B2', minutes: 4,
    topic: 'Учёба', skill: 'Чтение',
    origin: 'original',
    body: `Interaction Design
Assessment and attendance

Your mark is made up of three parts: a group project (40%), an individual
portfolio (40%) and participation in studio sessions (20%).

Attendance
Studio is where the feedback happens, so participation cannot be made up
afterwards. You may miss two sessions without explanation. From the third
absence onwards, each one costs you two percentage points of the final mark,
unless you have documented medical or personal circumstances.

Late work
Work submitted after the deadline loses five percentage points per day,
including weekends, for up to five days. After that it is not marked and
counts as zero. Extensions must be requested BEFORE the deadline, not after.
"My laptop broke" is not an extension; a backup is your responsibility.

Group work
Everyone in a group normally receives the same mark. If a group cannot resolve
an imbalance, raise it with me by week eight, while there is still time to
change something. Complaints in week fourteen cannot be acted on.

Use of AI tools
You may use them to explore ideas and to check your writing. You must say
where and how you used them. Submitting generated work as your own is
plagiarism and goes to the faculty committee, not to me.`,
    translation: `Интерактивный дизайн
Оценивание и посещаемость

Оценка складывается из трёх частей: групповой проект (40%), личное портфолио (40%)
и участие в студийных занятиях (20%).

Посещаемость
Разбор работ происходит в студии, поэтому участие нельзя отработать задним числом.
Два занятия можно пропустить без объяснений. С третьего пропуска каждый стоит вам
двух процентных пунктов итоговой оценки — если только у вас нет подтверждённых
медицинских или личных обстоятельств.

Опоздания со сдачей
Работа после срока теряет пять процентных пунктов в день, включая выходные,
и так до пяти дней. Дальше она не проверяется и считается нулём. Продление просят
ДО срока, а не после. «Сломался ноутбук» — не основание; резервная копия ваша забота.

Групповая работа
Все в группе обычно получают одинаковую оценку. Если группа не может разрешить
перекос сама, скажите мне до восьмой недели, пока ещё можно что-то изменить.
Жалобы на четырнадцатой неделе разбирать уже поздно.

Использование ИИ
Пользоваться можно: искать идеи, проверять текст. Нужно указать, где и как именно.
Сдать сгенерированное как своё — плагиат, и это уходит на комиссию факультета, а не ко мне.`,
    glossary: [
      { term: 'assessment', ru: 'оценивание' },
      { term: 'made up of', ru: 'состоит из' },
      { term: 'made up afterwards', ru: 'отработано задним числом' },
      { term: 'absence', ru: 'пропуск' },
      { term: 'percentage point', ru: 'процентный пункт' },
      { term: 'extension', ru: 'продление срока' },
      { term: 'imbalance', ru: 'перекос (в нагрузке)' },
    ],
    questions: [
      {
        q: 'You miss four studio sessions with no documents. What is the cost?',
        options: [
          'Nothing, two are free and the rest are forgiven',
          'Four percentage points',
          'Eight percentage points',
          'You fail the course',
        ],
        correct: 1,
        why: 'Первые два пропуска бесплатны, третий и четвёртый — по два пункта каждый.',
      },
      {
        q: 'Your work is six days late. What mark does it get?',
        options: ['Zero', 'Minus 30 points', 'Minus 25 points', 'It depends on the tutor'],
        correct: 0,
        why: 'Штраф в пять пунктов идёт до пяти дней; после этого работа не проверяется вовсе. Шестой день — уже за границей.',
      },
      {
        q: 'When should an unfair group workload be raised?',
        options: ['Any time', 'In week fourteen', 'By week eight', 'After the marks come out'],
        correct: 2,
        why: '«Raise it with me by week eight, while there is still time to change something» — и тут же оговорка, что на четырнадцатой неделе поздно.',
      },
    ],
  },

  // ─── Технологии и медиа ───────────────────────────────────────────────────
  {
    id: 'en-privacy-policy',
    lang: 'en', title: 'What we do with your data', level: 'C1', minutes: 5,
    topic: 'Технологии и медиа', skill: 'Чтение',
    origin: 'original',
    body: `Privacy notice — extract

We process the personal data you give us when you create an account, together
with data generated by your use of the service: device identifiers, approximate
location derived from your IP address, and records of the pages you open.

Where we rely on legitimate interests rather than consent — for security
monitoring and fraud prevention, for example — you retain the right to object.
Where we rely on consent, you may withdraw it at any time; withdrawal does not
affect the lawfulness of processing carried out before you withdrew it.

We share data with processors acting on our instructions (hosting, payments,
customer support). We do not sell personal data, and we do not disclose it to
advertisers in a form that identifies you. We may disclose data to a public
authority where we are legally required to do so, and, unless the law forbids
it, we will tell you when that happens.

Account data is retained for the life of the account and for a further ninety
days after deletion, after which it is irreversibly anonymised. Invoices are
kept for seven years because tax law requires it, and deleting your account
does not remove them.

You may request a copy of your data, ask us to correct it, or ask us to erase
it. We answer within one month. Where a request is manifestly unfounded or
excessive, we may charge a reasonable fee or decline to act, and we will
explain why.`,
    translation: `Уведомление о приватности — фрагмент

Мы обрабатываем персональные данные, которые вы даёте при создании аккаунта,
вместе с данными, которые порождает само пользование сервисом: идентификаторы
устройства, приблизительное местоположение по IP-адресу и записи о том, какие
страницы вы открывали.

Там, где мы опираемся на законный интерес, а не на согласие, — например, для
мониторинга безопасности и борьбы с мошенничеством, — за вами остаётся право
возразить. Там, где мы опираемся на согласие, вы можете отозвать его в любой
момент; отзыв не делает незаконной обработку, проведённую до него.

Мы передаём данные обработчикам, действующим по нашему поручению (хостинг, платежи,
поддержка). Мы не продаём персональные данные и не раскрываем их рекламодателям
в виде, позволяющем вас опознать. Мы можем передать данные государственному органу,
если этого требует закон, и — если закон не запрещает — сообщим вам об этом.

Данные аккаунта хранятся всё время его жизни и ещё девяносто дней после удаления,
после чего необратимо обезличиваются. Счета хранятся семь лет, потому что этого
требует налоговое законодательство, и удаление аккаунта их не убирает.

Вы можете запросить копию своих данных, потребовать их исправить или удалить.
Мы отвечаем в течение месяца. Если запрос очевидно необоснован или чрезмерен,
мы вправе взять разумную плату или отказать — и объясним почему.`,
    glossary: [
      { term: 'legitimate interests', ru: 'законный интерес (основание обработки)' },
      { term: 'withdraw consent', ru: 'отозвать согласие' },
      { term: 'lawfulness', ru: 'законность' },
      { term: 'processor', ru: 'обработчик — тот, кто работает по нашему поручению' },
      { term: 'disclose', ru: 'раскрывать, передавать' },
      { term: 'retained', ru: 'хранится' },
      { term: 'manifestly unfounded', ru: 'очевидно необоснованный' },
    ],
    questions: [
      {
        q: 'You withdraw consent today. What happens to processing done last month?',
        options: [
          'It becomes unlawful',
          'It must be deleted',
          'The notice does not say',
          'It stays lawful',
        ],
        correct: 3,
        why: '«Withdrawal does not affect the lawfulness of processing carried out before» — отзыв действует вперёд, а не назад.',
      },
      {
        q: 'What happens to your invoices when you delete your account?',
        options: [
          'They are deleted with everything else',
          'They are kept for seven years',
          'They are kept for ninety days',
          'They are anonymised immediately',
        ],
        correct: 1,
        why: '«Invoices are kept for seven years because tax law requires it, and deleting your account does not remove them» — налоговый срок сильнее удаления.',
      },
      {
        q: 'When can the company refuse to act on a data request?',
        options: [
          'When the request is manifestly unfounded or excessive',
          'Whenever it is busy',
          'When you have deleted your account',
          'It can never refuse',
        ],
        correct: 0,
        why: '«Where a request is manifestly unfounded or excessive, we may charge a reasonable fee or decline to act» — это единственное основание для отказа во всём фрагменте.',
      },
    ],
  },
]
