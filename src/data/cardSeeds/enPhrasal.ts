// ─────────────────────────────────────────────────────────────────────────────
// «Фразовые глаголы» — Фразовые глаголы: набор на каждый базовый глагол, примеры написаны с нуля.
//
// ОТКУДА. Собрано из PDF-пособий, которые прислал Дани (_inbox/english, в git не
// лежат). Из источника взяты слова, переводы и транскрипции — это словарные
// факты. Пояснения переписаны своими словами, примеры написаны с нуля.
// Файл сгенерирован; правки — прямо здесь, генератор не перезапускается.
// ─────────────────────────────────────────────────────────────────────────────

import type { CardGroup, CardSet } from '../../lib/cardGroups'

const SETS: CardSet[] = [
  {
    id: "seed:en-phrasal:come",
    title: "Come",
    about: "8 карточек.",
    level: "B1",
    cards: [
      { term: "come down", ru: "снижаться", ex: { term: "Rent prices in the city finally came down this year.", ru: "Цены на аренду в городе в этом году наконец снизились." } },
      { term: "come in", ru: "входить в помещение", ex: { term: "The door’s open — come in and have a seat.", ru: "Дверь открыта — заходи и садись." } },
      { term: "come by", ru: "заскочить, заглянуть", note: "Обычное дружеское приглашение: «Come by any time» значит «заглядывай в гости, когда удобно».", ex: { term: "Come by the office after lunch and I’ll give you the keys.", ru: "Заскочи в офис после обеда, я отдам тебе ключи." } },
      { term: "come apart", ru: "разваливаться", ex: { term: "My old backpack is coming apart at the seams.", ru: "Мой старый рюкзак разваливается по швам." } },
      { term: "come up", ru: "возникнуть", ex: { term: "A problem came up at work, so I’ll be late.", ru: "На работе возник вопрос, так что я опоздаю." } },
      { term: "come back", ru: "вернуться", ex: { term: "She came back from her business trip on Friday.", ru: "Она вернулась из командировки в пятницу." } },
      { term: "come for smb/smth", ru: "заходить за кем-то/чем-то", ex: { term: "I’ll come for you at seven, be ready.", ru: "Я зайду за тобой в семь, будь готов." } },
      { term: "come across smb/smth", ru: "случайно встретить кого-то/что-то", ex: { term: "I came across an old classmate at the train station.", ru: "На вокзале я случайно встретил бывшего одноклассника." } },
    ],
  },
  {
    id: "seed:en-phrasal:look",
    title: "Look",
    about: "8 карточек.",
    level: "B1",
    cards: [
      { term: "look after smb/smth", ru: "ухаживать за кем-то/чем-то", ex: { term: "Can you look after my cat while I’m on holiday?", ru: "Можешь присмотреть за моей кошкой, пока я в отпуске?" } },
      { term: "look back on smth", ru: "вспоминать о чём-то", ex: { term: "When I look back on my university years, I mostly remember the friends I made.", ru: "Когда я вспоминаю университетские годы, в основном вспоминаю друзей, которых там нашёл." } },
      { term: "look up to smb", ru: "равняться на кого-то", ex: { term: "Many junior developers look up to our team lead.", ru: "Многие младшие разработчики равняются на нашего тимлида." } },
      { term: "look around smth", ru: "осмотреть что-то", ex: { term: "We spent the morning looking around the old town.", ru: "Мы всё утро осматривали старый город." } },
      { term: "look smth up", ru: "найти информацию о чём-то", ex: { term: "If you don’t know the word, look it up in the dictionary.", ru: "Если не знаешь слово, посмотри его в словаре." } },
      { term: "look forward to smth", ru: "с нетерпением ждать чего-то", note: "После to идёт существительное или глагол с -ing: looking forward to seeing you. Удобная фраза, чтобы поделиться предвкушением поездки или встречи.", ex: { term: "I’m really looking forward to the weekend.", ru: "Я с нетерпением жду выходных." } },
      { term: "look through smth", ru: "просмотреть что-то", ex: { term: "Could you look through my presentation before the meeting?", ru: "Можешь просмотреть мою презентацию перед встречей?" } },
      { term: "look into smth", ru: "разобраться в чём-то", ex: { term: "The manager promised to look into the problem with my order.", ru: "Менеджер пообещал разобраться с проблемой моего заказа." } },
    ],
  },
  {
    id: "seed:en-phrasal:keep",
    title: "Keep",
    about: "7 карточек.",
    level: "B1",
    cards: [
      { term: "keep up", ru: "поддерживать на уровне", ex: { term: "You’re doing great — keep up the good work!", ru: "У тебя отлично получается — продолжай в том же духе!" } },
      { term: "keep on", ru: "продолжать", note: "С -ing передаёт раздражение от повторяющегося: «He keeps on being late» — «он вечно опаздывает». Сам глагол keep — «хранить, держать», как в известном лозунге Keep calm and carry on.", ex: { term: "He keeps on interrupting me in meetings.", ru: "Он постоянно перебивает меня на совещаниях." } },
      { term: "keep in", ru: "не выпускать наружу", ex: { term: "It was raining, so we kept the dog in all day.", ru: "Шёл дождь, поэтому мы весь день не выпускали собаку на улицу." } },
      { term: "keep out", ru: "не пускать внутрь", ex: { term: "Close the window to keep the mosquitoes out.", ru: "Закрой окно, чтобы не пустить комаров внутрь." } },
      { term: "keep up with smb", ru: "не отставать от кого-то", ex: { term: "I walk fast — try to keep up with me.", ru: "Я хожу быстро — старайся не отставать." } },
      { term: "keep to smth", ru: "придерживаться чего-то", ex: { term: "Let’s keep to the plan and finish by Friday.", ru: "Давай придерживаться плана и закончим к пятнице." } },
      { term: "keep away", ru: "держаться подальше", ex: { term: "Keep away from the edge of the platform.", ru: "Держитесь подальше от края платформы." } },
    ],
  },
  {
    id: "seed:en-phrasal:take",
    title: "Take",
    about: "8 карточек.",
    level: "B1",
    cards: [
      { term: "take up smth", ru: "начать что-то делать", ex: { term: "I took up yoga to deal with stress at work.", ru: "Я начал заниматься йогой, чтобы справляться со стрессом на работе." } },
      { term: "take smth off", ru: "снять что-то", note: "Классический пример — снять обувь, заходя в дом; так говорят и про одежду, очки, украшения.", ex: { term: "Please take your shoes off in the hallway.", ru: "Пожалуйста, снимай обувь в прихожей." } },
      { term: "take smth apart", ru: "разбирать что-то", ex: { term: "He took the old laptop apart to clean the fan.", ru: "Он разобрал старый ноутбук, чтобы почистить вентилятор." } },
      { term: "take smth back", ru: "вернуть что-то в магазин", ex: { term: "The jacket was too small, so I took it back.", ru: "Куртка оказалась мала, поэтому я вернул её в магазин." } },
      { term: "take down smth", ru: "записать что-то", ex: { term: "Let me take down your phone number.", ru: "Давай я запишу твой номер телефона." } },
      { term: "take over smth", ru: "захватить что-то", note: "Часто звучит в спортивных репортажах: команда «завладела» мячом или шайбой. Ещё — «принять дела, взять управление на себя».", ex: { term: "A larger company took over our startup last year.", ru: "В прошлом году наш стартап поглотила крупная компания." } },
      { term: "take smb aside", ru: "отвести кого-то в сторону", ex: { term: "After class, the teacher took me aside to talk about my essay.", ru: "После занятия преподаватель отвёл меня в сторону, чтобы поговорить о моём эссе." } },
      { term: "take after smb", ru: "быть похожим на кого-то", ex: { term: "She takes after her father — same sense of humour.", ru: "Она похожа на отца — такое же чувство юмора." } },
    ],
  },
  {
    id: "seed:en-phrasal:do",
    title: "Do",
    about: "7 карточек.",
    level: "B1",
    cards: [
      { term: "do up smth", ru: "застегнуть, завязать", ex: { term: "Do up your coat, it’s freezing outside.", ru: "Застегни пальто, на улице мороз." } },
      { term: "do in", ru: "утомить", ex: { term: "That twelve-hour shift really did me in.", ru: "Эта двенадцатичасовая смена меня совсем вымотала." } },
      { term: "do smb down", ru: "унизить кого-то", ex: { term: "Stop doing yourself down — your work is good.", ru: "Хватит себя принижать — у тебя хорошая работа." } },
      { term: "do without smth", ru: "обходиться без чего-то", ex: { term: "I can’t do without coffee in the morning.", ru: "Я не могу обходиться без кофе по утрам." } },
      { term: "do smth to smth", ru: "сделать что-то с чем-то", ex: { term: "What have you done to your hair? It looks great!", ru: "Что ты сделала с волосами? Выглядит отлично!" } },
      { term: "do smth over", ru: "что-то переделать, отремонтировать", note: "Удобно, когда рассказываешь, как приходилось переделывать работу заново — например, домашку или отчёт.", ex: { term: "The report had too many mistakes, so I had to do it over.", ru: "В отчёте было слишком много ошибок, пришлось его переделать." } },
      { term: "do out smth", ru: "прибрать, вычистить что-то", ex: { term: "We did out the garage over the weekend.", ru: "На выходных мы разобрали и вычистили гараж." } },
    ],
  },
  {
    id: "seed:en-phrasal:put",
    title: "Put",
    about: "8 карточек.",
    level: "B1",
    cards: [
      { term: "put smth off", ru: "откладывать что-то на потом", note: "Глагол прокрастинатора: откладывать дела до последнего момента.", ex: { term: "I keep putting off my dentist appointment.", ru: "Я всё откладываю визит к стоматологу." } },
      { term: "put up with smth", ru: "мириться с чем-то", ex: { term: "I can’t put up with the noise from my neighbours any longer.", ru: "Я больше не могу мириться с шумом от соседей." } },
      { term: "put smth out", ru: "потушить что-то", ex: { term: "Please put out your cigarette — this is a no-smoking area.", ru: "Пожалуйста, потушите сигарету — здесь не курят." } },
      { term: "put smth in", ru: "вкладывать что-то", ex: { term: "She put a lot of effort in to pass the exam.", ru: "Она вложила много сил, чтобы сдать экзамен." } },
      { term: "put smth on", ru: "надеть что-то", ex: { term: "Put on a warm sweater, it’s windy today.", ru: "Надень тёплый свитер, сегодня ветрено." } },
      { term: "put smth together", ru: "составить, создать что-то", ex: { term: "I need to put together a budget for the next quarter.", ru: "Мне нужно составить бюджет на следующий квартал." } },
      { term: "put smb down", ru: "публично кого-то критиковать", note: "Речь о критике при других — например, когда начальник разносит тебя на совещании за сорванный срок.", ex: { term: "He always puts his colleagues down in front of the boss.", ru: "Он вечно принижает коллег при начальнике." } },
      { term: "put smth aside", ru: "отложить что-то в сторону", ex: { term: "I put aside some money every month for a trip.", ru: "Я каждый месяц откладываю немного денег на поездку." } },
    ],
  },
  {
    id: "seed:en-phrasal:give",
    title: "Give",
    about: "6 карточек.",
    level: "B1",
    cards: [
      { term: "give smth back", ru: "вернуть что-то", ex: { term: "Don’t forget to give the book back to the library.", ru: "Не забудь вернуть книгу в библиотеку." } },
      { term: "give smth away", ru: "отдать что-то", ex: { term: "We gave our old sofa away to a student.", ru: "Мы отдали старый диван одному студенту." } },
      { term: "give up", ru: "сдаваться, отказываться от чего-то", note: "В отличие от give in, обычно значит «бросить, перестать что-то делать» — привычку, попытку, занятие (give up smoking).", ex: { term: "I’m trying to give up sugar this month.", ru: "В этом месяце я пытаюсь отказаться от сахара." } },
      { term: "give smth over to smb", ru: "передать что-то кому-то", ex: { term: "After the project ended, I gave the files over to the new manager.", ru: "Когда проект закончился, я передал файлы новому менеджеру." } },
      { term: "give in", ru: "сдаться", note: "Значит «уступить» кому-то или чему-то — давлению, просьбам, соблазну; сравните с give up — «бросить».", ex: { term: "My kids asked for a dog for months, and finally I gave in.", ru: "Дети несколько месяцев просили собаку, и в конце концов я сдался." } },
      { term: "give over", ru: "хватит, перестань (разг., брит.)", note: "Отдельно, без дополнения, — просьба прекратить: так говорят в Британии. «Вернуть что-то» по-английски — give back.", ex: { term: "Oh, give over — you know I was joking.", ru: "Да хватит тебе — ты же знаешь, я шутил." } },
    ],
  },
  {
    id: "seed:en-phrasal:have",
    title: "Have",
    about: "5 карточек.",
    level: "B1",
    cards: [
      { term: "have smb on", ru: "разыгрывать кого-то", ex: { term: "You won the lottery? You’re having me on!", ru: "Ты выиграл в лотерею? Да ты меня разыгрываешь!" } },
      { term: "have smth on", ru: "быть одетым во что-то", ex: { term: "She had a red dress on at the party.", ru: "На вечеринке она была в красном платье." } },
      { term: "have it out", ru: "говорить честно и прямо", ex: { term: "I finally had it out with my flatmate about the dishes.", ru: "Я наконец прямо поговорил с соседом по квартире насчёт посуды." } },
      { term: "have smb over", ru: "принимать кого-то в гостях", ex: { term: "We’re having some friends over for dinner on Saturday.", ru: "В субботу у нас в гостях на ужине будут друзья." } },
      { term: "have smth on smb", ru: "иметь компромат на кого-то", ex: { term: "Don’t worry, they have nothing on you.", ru: "Не волнуйся, у них на тебя ничего нет." } },
    ],
  },
]

export const EN_PHRASAL: CardGroup = {
  id: "seed:en-phrasal",
  lang: 'en',
  title: "Фразовые глаголы",
  about: "Базовые глаголы и частицы, которые меняют их смысл: come by, come across, get over… Один глагол — один набор.",
  level: "B1",
  sort: 2,
  studentIds: [],
  seed: true,
  sets: SETS,
}
