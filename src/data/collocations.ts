// ─────────────────────────────────────────────────────────────────────────────
// Сочетаемость слова — с чем оно ходит
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Слово, выученное в одиночку, в речь не встаёт. Ученик знает,
// что 약속 — «договорённость», и не может сказать «у меня назначено»: для этого
// нужно знать, что по-корейски договорённость ИМЕЮТ (약속이 있다), а не «есть».
// Перевод этого не сообщает, пример — сообщает про один контекст, а нужен
// именно набор: с чем это слово ходит обычно.
//
// ПОЧЕМУ ЭТО ДАННЫЕ, А НЕ ЕЩЁ ОДИН ТИП ЗАДАНИЯ. Разворот «Related Words» в
// учебниках — не упражнение, его читают. Не хватало нам не механики, а
// содержания: четвёртый по счёту решатель «выбери из плиток» ничего бы не
// добавил. Поэтому сочетания показываются на карточке слова (VocabIntro) и
// питают уже имеющиеся задания через relatedTasks() — сопоставление ВНУТРИ
// одного слова, где все варианты начинаются одинаково и различать приходится
// именно сочетание, а не слово.
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ, А НЕ ПОЛЕМ В КАЖДОМ КУРСЕ. Одно и то же слово стоит
// в словарях нескольких курсов (물 есть и в разговорнике, и в грамматическом
// курсе, и в алфавитном). Записанное здесь один раз, оно доезжает во все;
// записанное в юните — разошлось бы между ними на первой же правке. Так же
// живут картинки слов (vocabImages.ts) и видео (homeworkVideos.ts).
//
// ЧТО СЮДА НЕ ПИШУТ. Не синонимы и не переводы — для них есть `alt` и `ru`. И
// не любые предложения со словом: сочетание должно быть воспроизводимым куском
// речи, который ученик вставит целиком, а не разобранным примером.
// ─────────────────────────────────────────────────────────────────────────────

export interface Collocation {
  /** Словосочетание целиком, как его говорят. */
  phrase: string
  /** Что это значит по-русски. */
  ru: string
}

/**
 * Сочетания по слову изучаемого языка. Ключ ищется как есть, а не найдя —
 * нормализованным (см. normKey ниже): в словарях курсов немецкое и
 * португальское существительное записано с артиклем, а здесь ключи голые.
 *
 * ЧАСТЬ ЗАПИСЕЙ СЕЙЧАС НЕ СРАБАТЫВАЕТ, И ЭТО НОРМАЛЬНО. Слова вроде time,
 * decision, meeting в нынешних словарях курсов стоят внутри фраз, а не
 * отдельными карточками. Запись ждёт своего слова: контент прибавляется чаще,
 * чем правится этот файл, и выбрасывать готовую работу ради нулевого счётчика
 * значило бы писать её заново через месяц.
 */
export const COLLOCATIONS: Record<string, Collocation[]> = {
  // ─── Корейский: существительные ───
  약속: [
    { phrase: '약속이 있다', ru: 'быть занятым, иметь договорённость' },
    { phrase: '약속을 하다', ru: 'договориться' },
    { phrase: '약속 시간', ru: 'назначенное время' },
    { phrase: '약속을 지키다', ru: 'сдержать слово' },
  ],
  시간: [
    { phrase: '시간이 없다', ru: 'нет времени' },
    { phrase: '시간이 걸리다', ru: 'занимать время' },
    { phrase: '시간을 내다', ru: 'выкроить время' },
    { phrase: '시간을 보내다', ru: 'проводить время' },
  ],
  물: [
    { phrase: '물을 마시다', ru: 'пить воду' },
    { phrase: '물을 끓이다', ru: 'кипятить воду' },
    { phrase: '찬물', ru: 'холодная вода' },
    { phrase: '물이 나오다', ru: 'вода идёт (из крана)' },
  ],
  밥: [
    { phrase: '밥을 먹다', ru: 'есть, обедать' },
    { phrase: '밥을 짓다', ru: 'варить рис' },
    { phrase: '밥 먹었어요?', ru: '«вы поели?» — обиходное приветствие' },
    { phrase: '아침밥', ru: 'завтрак' },
  ],
  사람: [
    { phrase: '한국 사람', ru: 'кореец' },
    { phrase: '사람이 많다', ru: 'много народу' },
    { phrase: '좋은 사람', ru: 'хороший человек' },
    { phrase: '사람을 만나다', ru: 'встречаться с людьми' },
  ],
  집: [
    { phrase: '집에 가다', ru: 'идти домой' },
    { phrase: '집에 있다', ru: 'быть дома' },
    { phrase: '집을 구하다', ru: 'искать жильё' },
    { phrase: '집안일', ru: 'домашние дела' },
  ],
  학교: [
    { phrase: '학교에 다니다', ru: 'учиться в школе, ходить в школу' },
    { phrase: '학교에 가다', ru: 'идти в школу' },
    { phrase: '학교 앞', ru: 'перед школой' },
  ],
  회사: [
    { phrase: '회사에 다니다', ru: 'работать в компании' },
    { phrase: '회사원', ru: 'служащий' },
    { phrase: '회사를 그만두다', ru: 'уволиться' },
  ],
  이름: [
    { phrase: '이름이 뭐예요?', ru: 'как вас зовут?' },
    { phrase: '이름을 쓰다', ru: 'написать имя' },
    { phrase: '이름이 생각나다', ru: 'вспомнить имя' },
  ],
  가족: [
    { phrase: '가족이 몇 명이에요?', ru: 'сколько человек в семье?' },
    { phrase: '가족과 함께', ru: 'вместе с семьёй' },
    { phrase: '가족 사진', ru: 'семейное фото' },
  ],
  커피: [
    { phrase: '커피를 마시다', ru: 'пить кофе' },
    { phrase: '커피 한 잔', ru: 'чашка кофе' },
    { phrase: '커피를 타다', ru: 'заварить кофе' },
  ],
  병원: [
    { phrase: '병원에 가다', ru: 'идти к врачу' },
    { phrase: '병원에 입원하다', ru: 'лечь в больницу' },
    { phrase: '병원비', ru: 'плата за лечение' },
  ],
  버스: [
    { phrase: '버스를 타다', ru: 'сесть на автобус' },
    { phrase: '버스에서 내리다', ru: 'выйти из автобуса' },
    { phrase: '버스 정류장', ru: 'автобусная остановка' },
  ],
  주말: [
    { phrase: '주말에', ru: 'на выходных' },
    { phrase: '주말 잘 보내세요', ru: 'хороших выходных' },
    { phrase: '지난 주말', ru: 'прошлые выходные' },
  ],
  식당: [
    { phrase: '식당에서 먹다', ru: 'есть в кафе' },
    { phrase: '한국 식당', ru: 'корейский ресторан' },
    { phrase: '식당을 예약하다', ru: 'забронировать столик' },
  ],
  한국어: [
    { phrase: '한국어를 배우다', ru: 'учить корейский' },
    { phrase: '한국어를 잘하다', ru: 'хорошо говорить по-корейски' },
    { phrase: '한국어로', ru: 'по-корейски' },
  ],
  이유: [
    { phrase: '이유가 있다', ru: 'есть причина' },
    { phrase: '무슨 이유로', ru: 'по какой причине' },
    { phrase: '이유를 말하다', ru: 'назвать причину' },
  ],

  // ─── Корейский: глаголы и прилагательные ───
  하다: [
    { phrase: '일을 하다', ru: 'работать' },
    { phrase: '숙제를 하다', ru: 'делать домашку' },
    { phrase: '운동을 하다', ru: 'заниматься спортом' },
    { phrase: '어떻게 해요?', ru: 'что делать?' },
  ],
  가다: [
    { phrase: '집에 가다', ru: 'идти домой' },
    { phrase: '학교에 가다', ru: 'идти в школу' },
    { phrase: '잘 가요', ru: 'счастливо (уходящему)' },
  ],
  오다: [
    { phrase: '비가 오다', ru: 'идёт дождь' },
    { phrase: '눈이 오다', ru: 'идёт снег' },
    { phrase: '집에 오다', ru: 'приходить домой' },
  ],
  보다: [
    { phrase: '영화를 보다', ru: 'смотреть фильм' },
    { phrase: '시험을 보다', ru: 'сдавать экзамен' },
    { phrase: '만나 보다', ru: 'попробовать встретиться' },
  ],
  먹다: [
    { phrase: '밥을 먹다', ru: 'есть, обедать' },
    { phrase: '약을 먹다', ru: 'принимать лекарство' },
    { phrase: '나이를 먹다', ru: 'стареть' },
  ],
  만나다: [
    { phrase: '친구를 만나다', ru: 'встретиться с другом' },
    { phrase: '만나서 반갑습니다', ru: 'рад знакомству' },
    { phrase: '처음 만나다', ru: 'встретиться впервые' },
  ],
  배우다: [
    { phrase: '한국어를 배우다', ru: 'учить корейский' },
    { phrase: '운전을 배우다', ru: 'учиться водить' },
    { phrase: '많이 배웠어요', ru: 'многому научился' },
  ],
  살다: [
    { phrase: '서울에 살다', ru: 'жить в Сеуле' },
    { phrase: '혼자 살다', ru: 'жить одному' },
    { phrase: '오래 살다', ru: 'долго жить' },
  ],
  읽다: [
    { phrase: '책을 읽다', ru: 'читать книгу' },
    { phrase: '소리 내어 읽다', ru: 'читать вслух' },
  ],
  쉬다: [
    { phrase: '푹 쉬다', ru: 'как следует отдохнуть' },
    { phrase: '집에서 쉬다', ru: 'отдыхать дома' },
    { phrase: '한숨 쉬다', ru: 'вздохнуть' },
  ],
  바쁘다: [
    { phrase: '일이 바쁘다', ru: 'много работы' },
    { phrase: '바쁘시죠?', ru: 'вы, наверное, заняты?' },
    { phrase: '요즘 바빠요', ru: 'сейчас занят' },
  ],
  어렵다: [
    { phrase: '한국어가 어렵다', ru: 'корейский трудный' },
    { phrase: '어려운 문제', ru: 'трудная задача' },
    { phrase: '살기 어렵다', ru: 'тяжело жить' },
  ],
  피곤하다: [
    { phrase: '너무 피곤해요', ru: 'очень устал' },
    { phrase: '피곤해 보여요', ru: 'выглядишь усталым' },
  ],
  싸다: [
    { phrase: '값이 싸다', ru: 'дёшево' },
    { phrase: '싸게 사다', ru: 'купить дёшево' },
  ],


  // ─── Корейский: ещё существительные ───
  어머니: [
    { phrase: '어머니께서', ru: 'мама (вежливо, как подлежащее)' },
    { phrase: '어머니를 닮다', ru: 'быть похожим на маму' },
    { phrase: '어머니 생신', ru: 'мамин день рождения (вежливо)' },
  ],
  아버지: [
    { phrase: '아버지께서', ru: 'папа (вежливо, как подлежащее)' },
    { phrase: '아버지 일', ru: 'папина работа' },
    { phrase: '아버지를 닮다', ru: 'быть похожим на отца' },
  ],
  카페: [
    { phrase: '카페에서 만나다', ru: 'встретиться в кофейне' },
    { phrase: '카페에 가다', ru: 'пойти в кофейню' },
    { phrase: '동네 카페', ru: 'кофейня по соседству' },
  ],
  오늘: [
    { phrase: '오늘 저녁', ru: 'сегодня вечером' },
    { phrase: '오늘까지', ru: 'до сегодняшнего дня, к сегодня' },
    { phrase: '오늘 하루', ru: 'сегодняшний день целиком' },
  ],
  어제: [
    { phrase: '어제 저녁', ru: 'вчера вечером' },
    { phrase: '어제부터', ru: 'со вчерашнего дня' },
    { phrase: '바로 어제', ru: 'буквально вчера' },
  ],
  내일: [
    { phrase: '내일 봐요', ru: 'до завтра' },
    { phrase: '내일까지', ru: 'к завтрашнему дню' },
    { phrase: '내일 아침', ru: 'завтра утром' },
  ],
  계획: [
    { phrase: '계획이 있다', ru: 'есть планы' },
    { phrase: '계획을 세우다', ru: 'составить план' },
    { phrase: '계획대로', ru: 'по плану' },
  ],
  카드: [
    { phrase: '카드로 계산하다', ru: 'платить картой' },
    { phrase: '카드를 만들다', ru: 'оформить карту' },
    { phrase: '카드가 안 돼요', ru: 'карта не проходит' },
  ],
  현금: [
    { phrase: '현금으로 내다', ru: 'платить наличными' },
    { phrase: '현금만 받아요', ru: 'только наличные' },
    { phrase: '현금이 없다', ru: 'нет наличных' },
  ],
  지하철: [
    { phrase: '지하철을 타다', ru: 'ехать на метро' },
    { phrase: '지하철역', ru: 'станция метро' },
    { phrase: '지하철로 갈아타다', ru: 'пересесть на метро' },
  ],
  택시: [
    { phrase: '택시를 타다', ru: 'сесть в такси' },
    { phrase: '택시를 잡다', ru: 'поймать такси' },
    { phrase: '택시로 가다', ru: 'ехать на такси' },
  ],
  약국: [
    { phrase: '약국에 가다', ru: 'идти в аптеку' },
    { phrase: '약국에서 사다', ru: 'купить в аптеке' },
    { phrase: '가까운 약국', ru: 'ближайшая аптека' },
  ],
  우체국: [
    { phrase: '우체국에 가다', ru: 'идти на почту' },
    { phrase: '우체국에서 부치다', ru: 'отправить с почты' },
  ],
  빵: [
    { phrase: '빵을 굽다', ru: 'печь хлеб' },
    { phrase: '갓 구운 빵', ru: 'свежеиспечённый хлеб' },
    { phrase: '빵집', ru: 'пекарня' },
  ],
  김치: [
    { phrase: '김치를 담그다', ru: 'квасить кимчи' },
    { phrase: '김치찌개', ru: 'суп с кимчи' },
    { phrase: '김치가 맵다', ru: 'кимчи острое' },
  ],
  고기: [
    { phrase: '고기를 굽다', ru: 'жарить мясо' },
    { phrase: '고기를 먹다', ru: 'есть мясо' },
    { phrase: '소고기', ru: 'говядина' },
  ],
  신발: [
    { phrase: '신발을 신다', ru: 'надевать обувь' },
    { phrase: '신발을 벗다', ru: 'снимать обувь' },
    { phrase: '신발이 편하다', ru: 'обувь удобная' },
  ],
  지금: [
    { phrase: '지금 당장', ru: 'прямо сейчас' },
    { phrase: '지금까지', ru: 'до сих пор' },
    { phrase: '지금부터', ru: 'начиная с этого момента' },
  ],
  조금: [
    { phrase: '조금만 기다려 주세요', ru: 'подождите немного' },
    { phrase: '조금 전에', ru: 'только что' },
    { phrase: '조금씩', ru: 'понемногу' },
  ],

  // ─── Корейский: ещё глаголы ───
  도착하다: [
    { phrase: '공항에 도착하다', ru: 'прибыть в аэропорт' },
    { phrase: '늦게 도착하다', ru: 'приехать поздно' },
    { phrase: '도착했어요', ru: 'я на месте' },
  ],
  출발하다: [
    { phrase: '지금 출발해요', ru: 'выезжаю' },
    { phrase: '기차가 출발하다', ru: 'поезд отправляется' },
    { phrase: '일찍 출발하다', ru: 'выехать пораньше' },
  ],
  미루다: [
    { phrase: '약속을 미루다', ru: 'перенести встречу' },
    { phrase: '일을 미루다', ru: 'откладывать работу' },
    { phrase: '자꾸 미루다', ru: 'всё время откладывать' },
  ],

  // ─── Японский ───
  みず: [
    { phrase: 'みずを のむ', ru: 'пить воду' },
    { phrase: 'おみずを ください', ru: 'воды, пожалуйста' },
    { phrase: 'みずが でない', ru: 'вода не идёт' },
  ],
  がっこう: [
    { phrase: 'がっこうに いく', ru: 'ходить в школу' },
    { phrase: 'がっこうを やすむ', ru: 'пропустить школу' },
    { phrase: 'がっこうの まえ', ru: 'перед школой' },
  ],
  びょういん: [
    { phrase: 'びょういんに いく', ru: 'идти к врачу' },
    { phrase: 'びょういんに はいる', ru: 'лечь в больницу' },
  ],
  ほん: [
    { phrase: 'ほんを よむ', ru: 'читать книгу' },
    { phrase: 'ほんを かりる', ru: 'взять книгу (в библиотеке)' },
    { phrase: 'ほんだな', ru: 'книжная полка' },
  ],
  くつ: [
    { phrase: 'くつを はく', ru: 'надевать обувь' },
    { phrase: 'くつを ぬぐ', ru: 'снимать обувь' },
    { phrase: 'くつが きつい', ru: 'обувь жмёт' },
  ],
  かさ: [
    { phrase: 'かさを さす', ru: 'раскрыть зонт' },
    { phrase: 'かさを わすれる', ru: 'забыть зонт' },
    { phrase: 'おりたたみがさ', ru: 'складной зонт' },
  ],
  ゆき: [
    { phrase: 'ゆきが ふる', ru: 'идёт снег' },
    { phrase: 'ゆきが つもる', ru: 'снег ложится' },
  ],
  はな: [
    { phrase: 'はなが さく', ru: 'цветы распускаются' },
    { phrase: 'はなを かう', ru: 'купить цветы' },
    { phrase: 'はなみ', ru: 'любование цветением' },
  ],
  しゃしん: [
    { phrase: 'しゃしんを とる', ru: 'фотографировать' },
    { phrase: 'しゃしんに うつる', ru: 'попасть на фото' },
  ],
  コーヒー: [
    { phrase: 'コーヒーを のむ', ru: 'пить кофе' },
    { phrase: 'コーヒーを いれる', ru: 'заварить кофе' },
    { phrase: 'ホットコーヒー', ru: 'горячий кофе' },
  ],
  ホテル: [
    { phrase: 'ホテルを よやくする', ru: 'забронировать отель' },
    { phrase: 'ホテルに とまる', ru: 'остановиться в отеле' },
  ],
  タクシー: [
    { phrase: 'タクシーに のる', ru: 'сесть в такси' },
    { phrase: 'タクシーを よぶ', ru: 'вызвать такси' },
  ],
  スマホ: [
    { phrase: 'スマホを みる', ru: 'смотреть в телефон' },
    { phrase: 'スマホの じゅうでん', ru: 'зарядка телефона' },
  ],

  // ─── Португальский ───
  chave: [
    { phrase: 'perder a chave', ru: 'потерять ключ' },
    { phrase: 'a chave do quarto', ru: 'ключ от номера' },
    { phrase: 'fechar à chave', ru: 'запереть на ключ' },
  ],
  trabalho: [
    { phrase: 'ir para o trabalho', ru: 'идти на работу' },
    { phrase: 'procurar trabalho', ru: 'искать работу' },
    { phrase: 'dar trabalho', ru: 'доставлять хлопот' },
  ],
  sono: [
    { phrase: 'estar com sono', ru: 'хотеть спать' },
    { phrase: 'perder o sono', ru: 'потерять сон' },
    { phrase: 'pegar no sono', ru: 'заснуть' },
  ],
  cidade: [
    { phrase: 'no centro da cidade', ru: 'в центре города' },
    { phrase: 'conhecer a cidade', ru: 'осмотреть город' },
    { phrase: 'cidade grande', ru: 'большой город' },
  ],
  carro: [
    { phrase: 'de carro', ru: 'на машине' },
    { phrase: 'alugar um carro', ru: 'арендовать машину' },
    { phrase: 'estacionar o carro', ru: 'припарковать машину' },
  ],
  conta: [
    { phrase: 'pedir a conta', ru: 'попросить счёт' },
    { phrase: 'pagar a conta', ru: 'оплатить счёт' },
    { phrase: 'abrir uma conta', ru: 'открыть счёт (в банке)' },
  ],
  festa: [
    { phrase: 'fazer uma festa', ru: 'устроить праздник' },
    { phrase: 'ir a uma festa', ru: 'пойти на праздник' },
  ],
  começar: [
    { phrase: 'começar a trabalhar', ru: 'начать работать' },
    { phrase: 'começar do zero', ru: 'начать с нуля' },
    { phrase: 'para começar', ru: 'для начала' },
  ],
  falar: [
    { phrase: 'falar português', ru: 'говорить по-португальски' },
    { phrase: 'falar com alguém', ru: 'поговорить с кем-то' },
    { phrase: 'por falar nisso', ru: 'кстати говоря' },
  ],
  fazer: [
    { phrase: 'fazer compras', ru: 'делать покупки' },
    { phrase: 'fazer sentido', ru: 'иметь смысл' },
    { phrase: 'faz tempo', ru: 'давно' },
  ],
  dar: [
    { phrase: 'dar certo', ru: 'получиться, сложиться' },
    { phrase: 'dar uma olhada', ru: 'взглянуть' },
    { phrase: 'dar para', ru: 'быть возможным' },
  ],

  // ─── Немецкий ───
  arbeiten: [
    { phrase: 'als Designer arbeiten', ru: 'работать дизайнером' },
    { phrase: 'an einem Projekt arbeiten', ru: 'работать над проектом' },
    { phrase: 'Vollzeit arbeiten', ru: 'работать полный день' },
  ],
  brauchen: [
    { phrase: 'Hilfe brauchen', ru: 'нуждаться в помощи' },
    { phrase: 'Zeit brauchen', ru: 'нужно время' },
    { phrase: 'Du brauchst nicht zu kommen', ru: 'тебе не обязательно приходить' },
  ],
  suchen: [
    { phrase: 'eine Wohnung suchen', ru: 'искать квартиру' },
    { phrase: 'Arbeit suchen', ru: 'искать работу' },
    { phrase: 'nach etwas suchen', ru: 'искать что-то' },
  ],
  bestellen: [
    { phrase: 'einen Kaffee bestellen', ru: 'заказать кофе' },
    { phrase: 'online bestellen', ru: 'заказать онлайн' },
    { phrase: 'einen Tisch bestellen', ru: 'заказать столик' },
  ],
  anprobieren: [
    { phrase: 'Darf ich das anprobieren?', ru: 'можно это примерить?' },
    { phrase: 'eine Größe größer anprobieren', ru: 'примерить на размер больше' },
  ],
  umtauschen: [
    { phrase: 'die Jacke umtauschen', ru: 'обменять куртку' },
    { phrase: 'gegen Quittung umtauschen', ru: 'обменять по чеку' },
  ],
  umziehen: [
    { phrase: 'nach Berlin umziehen', ru: 'переехать в Берлин' },
    { phrase: 'in eine neue Wohnung umziehen', ru: 'переехать в новую квартиру' },
  ],
  Termin: [
    { phrase: 'einen Termin machen', ru: 'записаться на приём' },
    { phrase: 'einen Termin absagen', ru: 'отменить приём' },
    { phrase: 'Termin beim Arzt', ru: 'приём у врача' },
  ],
  Wohnung: [
    { phrase: 'eine Wohnung mieten', ru: 'снимать квартиру' },
    { phrase: 'möblierte Wohnung', ru: 'квартира с мебелью' },
    { phrase: 'Wohnung besichtigen', ru: 'смотреть квартиру' },
  ],
  Rechnung: [
    { phrase: 'die Rechnung bezahlen', ru: 'оплатить счёт' },
    { phrase: 'Die Rechnung, bitte!', ru: 'счёт, пожалуйста' },
    { phrase: 'eine Rechnung stellen', ru: 'выставить счёт' },
  ],

  // ─── Английский: ещё ───
  research: [
    { phrase: 'to do research', ru: 'проводить исследование' },
    { phrase: 'desk research', ru: 'кабинетное исследование' },
    { phrase: 'research shows that', ru: 'исследования показывают, что' },
  ],
  hypothesis: [
    { phrase: 'to test a hypothesis', ru: 'проверить гипотезу' },
    { phrase: 'to form a hypothesis', ru: 'выдвинуть гипотезу' },
    { phrase: 'the hypothesis holds', ru: 'гипотеза подтверждается' },
  ],
  prototype: [
    { phrase: 'to build a prototype', ru: 'собрать прототип' },
    { phrase: 'a clickable prototype', ru: 'кликабельный прототип' },
    { phrase: 'to test a prototype on users', ru: 'протестировать прототип на пользователях' },
  ],
  requirement: [
    { phrase: 'to meet the requirements', ru: 'соответствовать требованиям' },
    { phrase: 'a key requirement', ru: 'ключевое требование' },
    { phrase: 'to gather requirements', ru: 'собрать требования' },
  ],
  contract: [
    { phrase: 'to sign a contract', ru: 'подписать договор' },
    { phrase: 'to breach a contract', ru: 'нарушить договор' },
    { phrase: 'under contract', ru: 'по договору' },
  ],
  priority: [
    { phrase: 'to set priorities', ru: 'расставить приоритеты' },
    { phrase: 'a top priority', ru: 'высший приоритет' },
    { phrase: 'to take priority over', ru: 'быть важнее, чем' },
  ],
  agenda: [
    { phrase: 'to set the agenda', ru: 'определить повестку' },
    { phrase: 'on the agenda', ru: 'в повестке' },
    { phrase: 'a hidden agenda', ru: 'скрытые намерения' },
  ],
  draft: [
    { phrase: 'a rough draft', ru: 'черновик' },
    { phrase: 'to draft an email', ru: 'набросать письмо' },
    { phrase: 'the final draft', ru: 'финальная версия' },
  ],
  conflict: [
    { phrase: 'to resolve a conflict', ru: 'разрешить конфликт' },
    { phrase: 'a conflict of interest', ru: 'конфликт интересов' },
    { phrase: 'to come into conflict with', ru: 'вступить в конфликт с' },
  ],
  expectations: [
    { phrase: 'to manage expectations', ru: 'управлять ожиданиями' },
    { phrase: 'to meet expectations', ru: 'оправдать ожидания' },
    { phrase: 'to exceed expectations', ru: 'превзойти ожидания' },
  ],
  access: [
    { phrase: 'to have access to', ru: 'иметь доступ к' },
    { phrase: 'to grant access', ru: 'предоставить доступ' },
    { phrase: 'restricted access', ru: 'ограниченный доступ' },
  ],
  statement: [
    { phrase: 'to make a statement', ru: 'сделать заявление' },
    { phrase: 'a bold statement', ru: 'смелое утверждение' },
    { phrase: 'a bank statement', ru: 'выписка со счёта' },
  ],

  // ─── Английский: слова курса «для дизайнера» и делового английского ───
  //
  // Здесь сочетание нужнее, чем где-либо: это слова, которые ученик узнаёт в
  // чужой речи и не может поставить в свою. «Scope» знают все, а сказать
  // «the scope crept» — единицы, и именно этой фразой описывают то, что с
  // проектом на самом деле произошло.
  client: [
    { phrase: 'to land a client', ru: 'заполучить клиента' },
    { phrase: 'to onboard a client', ru: 'ввести клиента в работу' },
    { phrase: 'a returning client', ru: 'клиент, который вернулся' },
  ],
  agency: [
    { phrase: 'to work at an agency', ru: 'работать в агентстве' },
    { phrase: 'an in-house team', ru: 'внутренняя команда (не агентство)' },
    { phrase: 'agency side', ru: 'со стороны агентства' },
  ],
  scope: [
    { phrase: 'scope creep', ru: 'расползание задачи' },
    { phrase: 'out of scope', ru: 'вне рамок задачи' },
    { phrase: 'to define the scope', ru: 'очертить рамки' },
  ],
  brief: [
    { phrase: 'to write a brief', ru: 'составить бриф' },
    { phrase: 'a tight brief', ru: 'жёсткий бриф' },
    { phrase: 'to brief someone on', ru: 'ввести кого-то в курс' },
  ],
  deliverable: [
    { phrase: 'to agree on deliverables', ru: 'договориться о том, что сдаём' },
    { phrase: 'the final deliverable', ru: 'итоговый результат работы' },
  ],
  stakeholder: [
    { phrase: 'to align stakeholders', ru: 'согласовать со всеми сторонами' },
    { phrase: 'a key stakeholder', ru: 'ключевое заинтересованное лицо' },
    { phrase: 'stakeholder buy-in', ru: 'поддержка со стороны заказчика' },
  ],
  iteration: [
    { phrase: 'the next iteration', ru: 'следующая версия' },
    { phrase: 'to go through iterations', ru: 'пройти несколько итераций' },
  ],
  constraint: [
    { phrase: 'to work within constraints', ru: 'работать в рамках ограничений' },
    { phrase: 'a hard constraint', ru: 'жёсткое ограничение' },
  ],
  'trade-off': [
    { phrase: 'to make a trade-off', ru: 'пойти на компромисс' },
    { phrase: 'a fair trade-off', ru: 'разумный размен' },
  ],
  assumption: [
    { phrase: 'to challenge an assumption', ru: 'подвергнуть допущение сомнению' },
    { phrase: 'to make assumptions', ru: 'строить догадки' },
  ],
  impact: [
    { phrase: 'to have an impact on', ru: 'влиять на' },
    { phrase: 'measurable impact', ru: 'измеримое влияние' },
    { phrase: 'high-impact work', ru: 'работа с большой отдачей' },
  ],
  retention: [
    { phrase: 'to improve retention', ru: 'улучшить удержание' },
    { phrase: 'user retention', ru: 'удержание пользователей' },
  ],
  churn: [
    { phrase: 'to reduce churn', ru: 'снизить отток' },
    { phrase: 'churn rate', ru: 'процент оттока' },
  ],
  roadmap: [
    { phrase: 'to build a roadmap', ru: 'составить дорожную карту' },
    { phrase: 'on the roadmap', ru: 'в планах' },
  ],
  handoff: [
    { phrase: 'a clean handoff', ru: 'аккуратная передача работы' },
    { phrase: 'design handoff', ru: 'передача макетов в разработку' },
  ],
  onboarding: [
    { phrase: 'the onboarding process', ru: 'процесс введения в работу' },
    { phrase: 'to go through onboarding', ru: 'пройти онбординг' },
  ],
  timeline: [
    { phrase: 'a realistic timeline', ru: 'реалистичный график' },
    { phrase: 'to push back the timeline', ru: 'сдвинуть сроки' },
  ],
  turnaround: [
    { phrase: 'a quick turnaround', ru: 'быстрое выполнение' },
    { phrase: 'turnaround time', ru: 'срок выполнения' },
  ],
  blocker: [
    { phrase: "I'm blocked on", ru: 'я застрял на' },
    { phrase: 'to remove a blocker', ru: 'снять препятствие' },
  ],
  bandwidth: [
    { phrase: "I don't have the bandwidth", ru: 'у меня нет ресурса на это' },
    { phrase: 'limited bandwidth', ru: 'мало сил и времени' },
  ],
  strength: [
    { phrase: 'to play to your strengths', ru: 'опираться на сильные стороны' },
    { phrase: 'a key strength', ru: 'главная сильная сторона' },
  ],
  weakness: [
    { phrase: 'to work on a weakness', ru: 'работать над слабым местом' },
    { phrase: "my biggest weakness", ru: 'моя главная слабая сторона' },
  ],
  recruiter: [
    { phrase: 'to reach out to a recruiter', ru: 'написать рекрутеру' },
    { phrase: 'a recruiter reached out', ru: 'со мной связался рекрутер' },
  ],
  shortlist: [
    { phrase: 'to make the shortlist', ru: 'попасть в короткий список' },
    { phrase: 'to shortlist candidates', ru: 'отобрать кандидатов' },
  ],
  freelance: [
    { phrase: 'to go freelance', ru: 'уйти на фриланс' },
    { phrase: 'freelance work', ru: 'работа на фрилансе' },
  ],
  equity: [
    { phrase: 'to be offered equity', ru: 'получить предложение с долей' },
    { phrase: 'equity package', ru: 'пакет с долей в компании' },
  ],
  outage: [
    { phrase: 'a service outage', ru: 'сбой в работе сервиса' },
    { phrase: 'during the outage', ru: 'во время сбоя' },
  ],
  summary: [
    { phrase: 'in summary', ru: 'подводя итог' },
    { phrase: 'an executive summary', ru: 'краткая выжимка для руководства' },
  ],
  availability: [
    { phrase: 'to confirm your availability', ru: 'подтвердить, когда вам удобно' },
    { phrase: 'limited availability', ru: 'мало свободных мест или времени' },
  ],
  documentation: [
    { phrase: 'to write documentation', ru: 'писать документацию' },
    { phrase: 'up-to-date documentation', ru: 'актуальная документация' },
  ],
  contribution: [
    { phrase: 'to make a contribution', ru: 'внести вклад' },
    { phrase: 'a valuable contribution', ru: 'ценный вклад' },
  ],
  // ─── Английский ───
  time: [
    { phrase: 'to run out of time', ru: 'не успевать' },
    { phrase: 'to take your time', ru: 'не торопиться' },
    { phrase: 'at the same time', ru: 'одновременно' },
    { phrase: 'to make time for', ru: 'выкроить время на' },
  ],
  decision: [
    { phrase: 'to make a decision', ru: 'принять решение' },
    { phrase: 'to reach a decision', ru: 'прийти к решению' },
    { phrase: 'a tough decision', ru: 'трудное решение' },
  ],
  deadline: [
    { phrase: 'to meet a deadline', ru: 'уложиться в срок' },
    { phrase: 'to miss a deadline', ru: 'сорвать срок' },
    { phrase: 'a tight deadline', ru: 'сжатый срок' },
  ],
  feedback: [
    { phrase: 'to give feedback', ru: 'дать обратную связь' },
    { phrase: 'to act on feedback', ru: 'учесть замечания' },
    { phrase: 'constructive feedback', ru: 'конструктивная критика' },
  ],
  meeting: [
    { phrase: 'to set up a meeting', ru: 'назначить встречу' },
    { phrase: 'to attend a meeting', ru: 'присутствовать на встрече' },
    { phrase: 'to reschedule a meeting', ru: 'перенести встречу' },
  ],
  question: [
    { phrase: 'to ask a question', ru: 'задать вопрос' },
    { phrase: 'to raise a question', ru: 'поднять вопрос' },
    { phrase: 'out of the question', ru: 'не может быть и речи' },
  ],
  mistake: [
    { phrase: 'to make a mistake', ru: 'совершить ошибку' },
    { phrase: 'by mistake', ru: 'по ошибке' },
    { phrase: 'to learn from mistakes', ru: 'учиться на ошибках' },
  ],
  attention: [
    { phrase: 'to pay attention to', ru: 'обращать внимание на' },
    { phrase: 'to draw attention to', ru: 'привлечь внимание к' },
    { phrase: 'undivided attention', ru: 'безраздельное внимание' },
  ],
  progress: [
    { phrase: 'to make progress', ru: 'продвигаться' },
    { phrase: 'work in progress', ru: 'в работе, не готово' },
    { phrase: 'steady progress', ru: 'ровное продвижение' },
  ],
  risk: [
    { phrase: 'to take a risk', ru: 'рискнуть' },
    { phrase: 'to run the risk of', ru: 'рисковать тем, что' },
    { phrase: 'at your own risk', ru: 'на свой страх и риск' },
  ],
  effort: [
    { phrase: 'to make an effort', ru: 'приложить усилие' },
    { phrase: 'worth the effort', ru: 'стоит усилий' },
    { phrase: 'a joint effort', ru: 'совместная работа' },
  ],
  point: [
    { phrase: 'to make a point', ru: 'высказать мысль' },
    { phrase: 'to miss the point', ru: 'не уловить сути' },
    { phrase: "there's no point in", ru: 'нет смысла в' },
  ],
}

/**
 * Ключ поиска: слово без служебного начала и в нижнем регистре.
 *
 * ЗАЧЕМ. В словарях курсов одно и то же слово записано по-разному: немецкое
 * существительное стоит с артиклем («der Termin»), потому что артикль — часть
 * того, что учат; португальское тоже («a conta»); английский глагол иногда
 * записан с «to». Ключи здесь при этом хочется держать голыми — иначе на
 * каждое слово пришлось бы завести три записи и следить, чтобы они не
 * разъехались. Нормализация сводит и то и другое к одному виду.
 *
 * Иероглифику и кану это не трогает: регистра и артиклей там нет.
 */
function normKey(term: string): string {
  return term
    .trim()
    .replace(/^(der|die|das|den|dem|ein|eine|einen|the|an?|to|os?|as?|um|uma)\s+/i, '')
    .toLowerCase()
}

/** Словарь по нормализованному ключу — строится один раз. */
const BY_KEY: Record<string, Collocation[]> = Object.fromEntries(
  Object.entries(COLLOCATIONS).map(([k, v]) => [normKey(k), v]),
)

/** Сочетания слова. Пусто — значит для него их не записали. */
export function collocationsFor(term: string | undefined): Collocation[] | undefined {
  const key = term?.trim()
  if (!key) return undefined
  return COLLOCATIONS[key] ?? BY_KEY[normKey(key)]
}
