// ─────────────────────────────────────────────────────────────────────────────
// Видео для курсов второго уровня и разговорников
//
// ЗАЧЕМ. Первая партия видео закрыла пять базовых курсов. Аудит показал, что
// остальные семь идут вообще без видео — 149 юнитов. Здесь они закрываются.
//
// ЖЁСТКОЕ ПРАВИЛО ФАЙЛА (то же, что в languageVideos.ts): каждый id проверен
// через https://www.youtube.com/oembed — он отдаёт канал и название, и они
// сверены с темой юнита. Проверка ловит подлоги: по запросу про портфолио
// первым результатом однажды шла реклама ClickUp, по деловым письмам — ролик
// Grammarly. Оба встали бы в урок как «видео».
//
// ПОВТОРЫ НАМЕРЕННЫ. Разговорник идёт по 26 бытовым темам, и один разбор
// «фразы для путешествий» честно закрывает несколько соседних: искать «своё»
// видео на каждую тему значит менять качество на разнообразие.
// ─────────────────────────────────────────────────────────────────────────────

const yt = (id: string) => `https://www.youtube.com/watch?v=${id}`

// ─── Курсы второго уровня ────────────────────────────────────────────────────

/** Корейский TOPIK II: Billy Go + разборы письменной части экзамена. */
export const KOT2_VIDEO: Record<string, string> = {
  'kot2-01': yt('ARelfW7Zono'), // Billy Go #69 Describing Verbs — определительные формы
  'kot2-02': yt('peA-OG7VfyE'), // #71 Giving a Reason Part 2
  'kot2-03': yt('rX_m0jPd7V4'), // #84 Adding More Emotion — концовки-оттенки
  'kot2-04': yt('9m0TeQ40QFc'), // #72 Showing Contrast — ~는데
  'kot2-05': yt('j7dmqbz6wWQ'), // #87 I Said Something — косвенная речь
  'kot2-06': yt('j7dmqbz6wWQ'), // тот же разбор: вопросы и просьбы во второй половине
  'kot2-07': yt('c5VggkqXGXU'), // #93 I'm Going To — намерение и цель
  'kot2-08': yt('3FX0e1Pi9fs'), // #51 Making Suggestion — решения и предложения
  'kot2-09': yt('1jLv8fzvKDY'), // #85 Have You Ever? — опыт
  'kot2-10': yt('lFeyWOr1QYw'), // #66 Becoming Something — изменение состояния
  'kot2-11': yt('AqXmOgeELPs'), // #90 Thinking More — личное наблюдение
  'kot2-12': yt('ier1WSrJp6w'), // #88 Doing Favors — вспомогательные глаголы
  'kot2-13': yt('_0CzC8G4M3U'), // #79 Formal Korean — 합니다체
  'kot2-14': yt('2z4d2HWyHpI'), // 사동사 및 피동사 — каузатив против пассива
  'kot2-15': yt('peA-OG7VfyE'), // причина, обратная сторона того же разбора
  'kot2-16': yt('s9tITREKVK0'), // #74 Could It Be? — предположение
  'kot2-17': yt('F922EUtJAc0'), // #86 The Plain Form — 문어체
  'kot2-18': yt('SoP8Pmf_8Hs'), // разбор 쓰기 51–52
  'kot2-19': yt('dEBkZwteq_g'), // метод сдачи TOPIK II целиком
  'kot2-20': yt('dEBkZwteq_g'),
  'kot2-21': yt('dEBkZwteq_g'), // 쓰기 54 и стратегии чтения/аудирования — тот же разбор
}

/** Японский N5→N3: Japanese Ammo with Misa + Japanese From Zero. */
export const JAN3_VIDEO: Record<string, string> = {
  'jan3-01': yt('BQG08i8onKM'), // ずにはいられない / ちゃう — стяжение от てしまう
  'jan3-02': yt('2u0MKfWseYM'), // ておく / とく — сделать заранее
  'jan3-03': yt('Twa3H_BHHg0'), // てある vs ている vs ておく
  'jan3-04': yt('5XUmIsGslGM'), // ていく vs てくる
  'jan3-05': yt('bXkMdHOlvpw'), // あげる vs くれる vs もらう
  'jan3-06': yt('lp-2PNSANJ8'), // てあげる vs てくれる vs てもらう
  'jan3-07': yt('QPOA3OYFnj4'), // пассив ~られた
  'jan3-08': yt('jpo7YOytU6c'), // каузатив, часть 1
  'jan3-09': yt('kD_3Lb_MXdg'), // そう — выглядит и говорят
  'jan3-10': yt('12qpT0pXpXY'), // みたいな vs ような vs らしい vs っぽい
  'jan3-11': yt('7hWNiYVgCJw'), // べき vs はず vs たほうがいい
  'jan3-12': yt('v2rjtaO1SpQ'), // かもしれない vs 多分
  'jan3-13': yt('F-THHO4iHWE'), // と / たら / とき — первая часть серии
  'jan3-14': yt('JtUVV0Y8KfQ'), // ように vs のに vs ために
  'jan3-15': yt('B4yn28Fb9co'), // まま vs ながら vs てform
  'jan3-16': yt('dunBnCI1iP0'), // объяснительное の / んだ — оформление чужих слов
  'jan3-17': yt('_oMtifQpT4Q'), // JFZ 87: Introduction to Formal Japanese
  'jan3-18': yt('mJNsOVYjqjQ'), // 敬語: 尊敬語 и 謙譲語 в деловой речи
  'jan3-19': yt('jqdlHf1-tAI'), // разбор кандзи уровня N3
  'jan3-20': yt('HOCgOTbCzFI'), // стратегия сдачи JLPT
}

/** Португальский Intermediário: Speaking Brazilian + разбор CELPE-Bras. */
export const PTB2_VIDEO: Record<string, string> = {
  'ptb2-01': yt('oidJ0TOL6oM'), // Pretérito Perfeito vs Imperfeito целиком
  'ptb2-02': yt('fkLv6azXlvU'), // Futuro do Pretérito как вежливость
  'ptb2-03': yt('eIB5W2onjF0'), // Subjuntivo — общий разбор
  'ptb2-04': yt('T4o7JF80Nfg'), // Imperfeito do Subjuntivo
  'ptb2-05': yt('CnK3UxOHFY0'), // Futuro do Subjuntivo
  'ptb2-06': yt('7g-vKPALrDY'), // все 15 времён — согласование
  'ptb2-07': yt('ldjVtTMkS84'), // Infinitivo Pessoal vs Impessoal
  'ptb2-08': yt('z6qjXDNOXVs'), // возвратные и безличные конструкции
  'ptb2-09': yt('1xo_b1bdBwY'), // que / o que / qual / quem
  'ptb2-10': yt('D6p0X4XDOCw'), // как работает que — опора косвенной речи
  'ptb2-11': yt('GPnvU27ZUX0'), // согласие и несогласие — связки аргументации
  'ptb2-12': yt('aobI54dT7_c'), // формальное обращение
  'ptb2-13': yt('u0i1_hvAjBo'), // Formal vs Informal — регистры
  'ptb2-14': yt('41dm_yapyhA'), // как работать с аудио на португальском
  'ptb2-15': yt('aobI54dT7_c'), // деловое письмо опирается на тот же регистр
  'ptb2-16': yt('GPnvU27ZUX0'), // статья-мнение — те же связки
  'ptb2-17': yt('An8_P37Vj1I'), // работа с текстом для пересказа
  'ptb2-18': yt('vy3igmzJ5dY'), // всё об экзамене CELPE-Bras
}

// ─── Разговорники ────────────────────────────────────────────────────────────
//
// У всех четырёх один костяк тем (см. SURVIVAL_THEMES), поэтому карты идут по
// номеру темы: `<ключ книги>-NN`. Корейский длиннее — у него есть темы 27–39.

/** Английский: язык выживания. */
export const ENSV_VIDEO: Record<string, string> = {
  'ensv-01': yt('qQnOx3N85fc'), // все фразы для путешествий
  'ensv-02': yt('qQnOx3N85fc'),
  'ensv-03': yt('_HPWNOV4xdE'), // «How do you say this in English?»
  'ensv-04': yt('sIPcSP6KmKs'), // разговор о семье и о себе
  'ensv-05': yt('bLlPYnz_Rt4'), // необходимые фразы, 30 минут
  'ensv-06': yt('CzY8HiqS_Xg'), // числа
  'ensv-07': yt('CzY8HiqS_Xg'),
  'ensv-08': yt('OuWClJ6TZVo'), // как ориентироваться и спрашивать дорогу
  'ensv-09': yt('OuWClJ6TZVo'),
  'ensv-10': yt('A_xM0rRkQr4'), // дорога до аэропорта и транспорт
  'ensv-11': yt('A_xM0rRkQr4'),
  'ensv-12': yt('3ZxuzipXEMw'), // паспортный контроль
  'ensv-13': yt('WDLBdV5UdZA'), // бронирование номера
  'ensv-14': yt('sj8K6CN9XVk'), // касса и заказ
  'ensv-15': yt('5LXh3oKL1hE'), // бронирование и заказ по телефону
  'ensv-16': yt('bLlPYnz_Rt4'),
  'ensv-17': yt('32v8lH8EWrg'), // как объяснить, что не подходит
  'ensv-18': yt('sj8K6CN9XVk'),
  'ensv-19': yt('wbIEm5VvHVA'), // что где лежит в магазине
  'ensv-20': yt('sj8K6CN9XVk'),
  'ensv-21': yt('wbIEm5VvHVA'),
  'ensv-22': yt('jji_LimlI2I'), // страховка и обращение за помощью
  'ensv-23': yt('gRaB5__XrA4'), // потеряли кошелёк — что говорить
  'ensv-24': yt('gRaB5__XrA4'),
  'ensv-25': yt('LGW2T-Zy18g'), // разговор о фильмах — классический смолток
  // Последняя тема разговорника — 39-я, а не 26-я: нумерация тем сквозная
  // по общему костяку, и у английского часть тем не заполнена.
  'ensv-39': yt('ekR-PSvPEBk'), // рабочая переписка и просьбы в офисе
  // Темы 26–43 дописаны позже; ролики переиспользуются по ситуации.
  'ensv-26': yt('wbIEm5VvHVA'), // что где лежит в магазине
  'ensv-27': yt('bLlPYnz_Rt4'),
  'ensv-28': yt('sj8K6CN9XVk'), // касса, оплата, оформление
  'ensv-29': yt('sj8K6CN9XVk'),
  'ensv-30': yt('A_xM0rRkQr4'), // дорога и транспорт
  'ensv-31': yt('qQnOx3N85fc'),
  'ensv-32': yt('WDLBdV5UdZA'), // бронирование жилья
  'ensv-33': yt('sj8K6CN9XVk'),
  'ensv-34': yt('3ZxuzipXEMw'), // документы на границе
  'ensv-35': yt('3ZxuzipXEMw'),
  'ensv-36': yt('jji_LimlI2I'), // страховка, здоровье, обращение за помощью
  'ensv-37': yt('jji_LimlI2I'),
  'ensv-38': yt('jji_LimlI2I'),
  'ensv-40': yt('sIPcSP6KmKs'), // разговор о семье
  'ensv-41': yt('LGW2T-Zy18g'), // живая реакция в разговоре
  'ensv-42': yt('32v8lH8EWrg'), // согласие, отказ, недовольство
  'ensv-43': yt('_HPWNOV4xdE'), // оговорки и переспрос
}

/** Корейский: язык выживания. Billy Go — разговорный курс и базовый. */
export const KOSV_VIDEO: Record<string, string> = {
  'kosv-01': yt('rfgD1tXTcqI'), // Conversation #19 안녕하세요
  'kosv-02': yt('nDmUBOg0aMQ'), // #12 Saying Thanks
  'kosv-03': yt('XWf8ZOFgeQI'), // #56 Asking for Clarification
  'kosv-04': yt('f83UKBquKz0'), // #11 Introducing Yourself
  'kosv-05': yt('poCPygDZxg0'), // #29 Can and Can't
  'kosv-06': yt('TBTnGRdSAC8'), // #61 Counting Part 1
  'kosv-07': yt('3vhBb-vmtZs'), // #64 Time and Date
  'kosv-08': yt('FAPfKLxsMIU'), // #100 Finding Your Way
  'kosv-09': yt('Blb_ihknUiM'), // #60 Location Words
  'kosv-10': yt('VeA7n5HAyAA'), // Conversation #2 지하철역
  'kosv-11': yt('gKj1_2svYKE'), // Conversation #5 택시
  'kosv-12': yt('OggBwQO8Wsk'), // Conversation #20 통화 — разговор по телефону
  'kosv-13': yt('IMzWqiVG0gg'), // #58 Asking Permission — просьбы в отеле
  'kosv-14': yt('4C_okhh7-kc'), // Conversation #8 카페
  'kosv-15': yt('mVGGHop7atA'), // Conversation #12 식당
  'kosv-16': yt('MV2SrRwlBnE'), // Conversation #11 음식
  'kosv-17': yt('MV2SrRwlBnE'),
  'kosv-18': yt('PJtpQ_NP6yE'), // Conversation #17 계산하기
  'kosv-19': yt('-JnnZ97WbXE'), // #99 Going Shopping
  'kosv-20': yt('PJtpQ_NP6yE'),
  'kosv-21': yt('NN5c3XRt2wM'), // Conversation #14 신발 — размеры и примерка
  'kosv-22': yt('l-CpnhbA0LI'), // #57 Describing Everything — описать самочувствие
  'kosv-23': yt('XWf8ZOFgeQI'),
  'kosv-24': yt('Zq7rQICiHKU'), // #32 Asking Favors Part 1
  'kosv-25': yt('w7_j8-DKYI4'), // Conversation #1 날씨 — смолток о погоде
  'kosv-26': yt('-JnnZ97WbXE'),
  'kosv-27': yt('OggBwQO8Wsk'),
  'kosv-28': yt('OggBwQO8Wsk'),
  'kosv-29': yt('PJtpQ_NP6yE'),
  'kosv-30': yt('x2FBBJM3nfg'), // Conversation #13 버스
  'kosv-31': yt('4idI6ldzaTc'), // Conversation #10 한국 — про страну и места
  'kosv-32': yt('STpJ0QR1sn8'), // Conversation #4 컴퓨터 — быт и техника
  'kosv-33': yt('PJtpQ_NP6yE'),
  'kosv-34': yt('_0CzC8G4M3U'), // #79 Formal Korean — язык документов
  'kosv-35': yt('_0CzC8G4M3U'),
  'kosv-36': yt('p5ZjHJnKTRE'), // Conversation #16 머리 — тело и самочувствие
  'kosv-37': yt('l-CpnhbA0LI'),
  'kosv-38': yt('-JnnZ97WbXE'),
  'kosv-39': yt('_3n9Piw9Qq0'), // Conversation #9 친구 — общение с коллегами
  'kosv-41': yt('rX_m0jPd7V4'), // #84 Adding More Emotion — оттенки реакции
  'kosv-42': yt('IMzWqiVG0gg'), // #58 Asking Permission — согласие и отказ
  'kosv-43': yt('9m0TeQ40QFc'), // #72 Showing Contrast — оговорки и связки
  'kosv-40': yt('XjDU3u-pB1w'), // #35 Family Tree — родственники
}

/** Японский: язык выживания. Japanese Ammo — путешествия и вежливость. */
export const JASV_VIDEO: Record<string, string> = {
  'jasv-01': yt('xHMAq9x2cEY'), // Essential Japanese Travel Phrases — приветствия и прощания
  'jasv-02': yt('aAlDzXxE8pI'), // Can Do #9: обиходные выражения
  'jasv-03': yt('ZKxm8zReoj4'), // Can Do #13: как попросить повторить и объяснить
  'jasv-04': yt('B_55oW65H4M'), // Can Do #2: откуда вы
  'jasv-05': yt('dxPfgNA8bqA'), // Can Do #11: согласие, несогласие, своё мнение
  'jasv-06': yt('tqjxUgO6OXU'), // Can Do #4: числа вслух на примере телефона
  'jasv-07': yt('xHMAq9x2cEY'),
  'jasv-08': yt('eIxrnPyHxGw'), // как объяснять дорогу
  'jasv-09': yt('eIxrnPyHxGw'),
  'jasv-10': yt('xHMAq9x2cEY'),
  'jasv-11': yt('xHMAq9x2cEY'),
  'jasv-12': yt('-8ckaRazIzc'), // аэропорт и иммиграция
  'jasv-13': yt('cuDz0mN87TE'), // кэйго, которым к вам обращаются в сервисе
  'jasv-14': yt('z9o9bjNir2Y'), // Can Do #18: заказ в заведении
  'jasv-15': yt('hbZa8-1ePao'), // заказ в ресторане с вежливой речью
  'jasv-16': yt('Fk0W0j3aj6w'), // おいしい vs うまい — разговор о еде
  'jasv-17': yt('na6HMyT-EVk'), // Can Do #19: заказать несколько позиций и уточнить
  'jasv-18': yt('vb_kAfdq8PI'), // Can Do #17: спросить цену
  'jasv-19': yt('a5U93P0ZzL0'), // Can Do #15: попросить товар в магазине
  'jasv-20': yt('vb_kAfdq8PI'),
  'jasv-21': yt('ydowfHzzk0k'), // Can Do #16: есть ли нужный размер
  'jasv-22': yt('aQsqklA46z0'), // здоровье и недомогание
  'jasv-23': yt('ZKxm8zReoj4'),
  'jasv-24': yt('aQsqklA46z0'),
  'jasv-25': yt('xrUMQvdPjLw'), // Can Do #12: погода — опора смолтока
  'jasv-39': yt('mJNsOVYjqjQ'), // деловое кэйго — офис и коллеги
  'jasv-41': yt('aAlDzXxE8pI'), // Can Do #9: обиходные выражения
  'jasv-42': yt('dxPfgNA8bqA'), // Can Do #11: согласие и своё мнение
  'jasv-43': yt('ZKxm8zReoj4'), // Can Do #13: переспрос и оговорки
}

/** Португальский: язык выживания. PortuguesePod101 — бытовые ситуации. */
export const PTSV_VIDEO: Record<string, string> = {
  'ptsv-01': yt('uchv5YpWKwk'), // 10 способов поздороваться
  'ptsv-02': yt('sD5ZOqgfEsk'), // спасибо и пожалуйста
  'ptsv-03': yt('cVTYYMYcm8g'), // «вы говорите по-английски?»
  'ptsv-04': yt('srQwAcZpj5A'), // как представиться
  'ptsv-05': yt('dE9xhfRZFnk'), // извинения
  'ptsv-06': yt('E4pYzw2Gy1w'), // числа 11–100
  'ptsv-07': yt('E4pYzw2Gy1w'),
  'ptsv-08': yt('WjHtVg9BPbU'), // 20 фраз для путешествий
  'ptsv-09': yt('snNhQ0RvYfw'), // туристическая лексика
  'ptsv-10': yt('U9JBeZvUIzU'), // фразы на вокзале
  'ptsv-11': yt('U9JBeZvUIzU'),
  'ptsv-12': yt('0kOlSkzPPBA'), // подготовка поездки в Бразилию
  'ptsv-13': yt('WjHtVg9BPbU'),
  'ptsv-14': yt('hnf3GKMKEDQ'), // лексика ресторана
  'ptsv-15': yt('hnf3GKMKEDQ'),
  'ptsv-16': yt('8sujRKkNcVI'), // бразильская еда
  'ptsv-17': yt('hnf3GKMKEDQ'),
  'ptsv-18': yt('VlEw3XMjCF0'), // 25 обязательных фраз
  'ptsv-19': yt('snNhQ0RvYfw'),
  'ptsv-20': yt('VlEw3XMjCF0'),
  'ptsv-21': yt('snNhQ0RvYfw'),
  'ptsv-22': yt('lo5NteosgP0'), // фразы, которые не хочешь услышать
  'ptsv-23': yt('gxdwr5dA5CM'), // чего туристу говорить не стоит
  'ptsv-24': yt('lo5NteosgP0'),
  'ptsv-25': yt('QigZ7PZF1us'), // ответы на «как дела» — смолток
  'ptsv-39': yt('GPnvU27ZUX0'), // согласие и несогласие — язык переговоров
  'ptsv-41': yt('QigZ7PZF1us'), // ответы на «как дела» — живая реакция
  'ptsv-42': yt('GPnvU27ZUX0'), // согласие и несогласие
  'ptsv-43': yt('VlEw3XMjCF0'), // 25 обязательных фраз — связки речи
}

/**
 * Корейский: хангыль. Серия Billy Go про письмо ложится на уроки почти
 * один в один — она и построена по тому же порядку введения букв.
 */
export const KOHG_VIDEO: Record<string, string> = {
  'ko-hangul-1': yt('YzpwHrA_iQQ'), // #3 한글 Part 1 — первые буквы и строение слога
  'ko-hangul-2': yt('YzpwHrA_iQQ'),
  'ko-hangul-3': yt('VZLo2lSjCsM'), // #4 Part 2 — новые виды слогов
  'ko-hangul-4': yt('VZLo2lSjCsM'),
  'ko-hangul-5': yt('ID4gPRoN5OE'), // #6 Part 4 — слог с патчхимом
  'ko-hangul-6': yt('J36m4cSl2W4'), // #7 Part 5 — придыхательные и напряжённые
  'ko-hangul-7': yt('ntyAHtIIw1A'), // #5 Part 3 — й-гласные и ㅐ/ㅔ
  'ko-hangul-8': yt('J36m4cSl2W4'),
  'ko-hangul-9': yt('fDj5MBHdEIA'), // #8 Part 6 — дифтонги
}

/** Все карты разговорников по ключу книги — так их проще подмешать в сборке. */
export const SURVIVAL_VIDEO: Record<string, Record<string, string>> = {
  ensv: ENSV_VIDEO,
  kosv: KOSV_VIDEO,
  jasv: JASV_VIDEO,
  ptsv: PTSV_VIDEO,
}
