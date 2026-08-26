// ─────────────────────────────────────────────────────────────────────────────
// Примеры к словам курсов: ko
//
// Написаны руками и перекрывают всё остальное (см. src/lib/cardExamples.ts):
// добытое скриптом предложение показывает слово в контексте, но не выбирает
// контекст — здесь выбран он. Правило то же, что у разговорника: предложение
// короткое, бытовое и такое, из которого значение слова видно без словаря.
//
// Ключ — слово, приведённое exampleKey(): нижний регистр, без «to/the/a».
// Проверка покрытия: npm run check:examples
// ─────────────────────────────────────────────────────────────────────────────

import { x, type ExampleMap } from './model'

export const KO_VOCAB_EXAMPLES: ExampleMap = {
  '-라고 합니다': x('내일부터 비가 온다고 합니다.', 'naeilbuteo biga ondago hamnida.', 'Говорят, с завтрашнего дня пойдёт дождь.'),
  '-어 놓다': x('창문을 열어 놓았어요.', 'changmuneul yeoreo noasseoyo.', 'Я открыл окно и оставил открытым.'),
  '~ ㄴ 적이 있다': x('제주도에 간 적이 있어요.', 'jejudoe gan jeogi isseoyo.', 'Мне доводилось бывать на Чеджу.'),  // ~(으)ㄴ 적이 있다
  '~ ㄴ다': x('비가 온다. 우산을 챙긴다.', 'biga onda. usaneul chaengginda.', 'Идёт дождь. Беру зонт. (письменный стиль)'),  // ~(으)ㄴ다
  '~ ㄹ 걸요': x('지금 가면 늦을 걸요.', 'jigeum gamyeon neujeul geolyo.', 'Думаю, если сейчас поедем, опоздаем.'),  // ~(으)ㄹ 걸요
  '~ ㄹ 수도 있다': x('내일 비가 올 수도 있어요.', 'naeil biga ol sudo isseoyo.', 'Завтра может быть и дождь.'),  // ~(으)ㄹ 수도 있다
  '~ ㄹ 텐데': x('지금쯤 도착했을 텐데 연락이 없어요.', 'jigeumjjeum dochakhaesseul tende yeollagi eopseoyo.', 'Наверное, уже доехал, а связи нет.'),  // ~(으)ㄹ 텐데
  '~ ㄹ 필요가 있다': x('한 번 더 확인할 필요가 있어요.', 'han beon deo hwaginhal piryoga isseoyo.', 'Необходимо проверить ещё раз.'),  // ~(으)ㄹ 필요가 있다
  '~ ㄹ 줄 모르다': x('저는 수영할 줄 몰라요.', 'jeoneun suyeonghal jul mollayo.', 'Я не умею плавать.'),  // ~(으)ㄹ 줄 모르다
  '~ ㄹ 줄 알다': x('저는 자전거를 탈 줄 알아요.', 'jeoneun jajeongeoreul tal jul arayo.', 'Я умею кататься на велосипеде.'),  // ~(으)ㄹ 줄 알다
  '~ ㄹ까 하다': x('주말에 등산을 갈까 해요.', 'jumare deungsaneul galkka haeyo.', 'Подумываю сходить в горы на выходных.'),  // ~(으)ㄹ까 하다
  '~ 라고 하다': x('선생님이 숙제를 하라고 했어요.', 'seonsaengnimi sukjereul harago haesseoyo.', 'Учитель велел сделать домашнее задание.'),  // ~(으)라고 하다
  '~ 려고': x('친구를 만나려고 일찍 나왔어요.', 'chingureul mannaryeogo iljjik nawasseoyo.', 'Я вышел пораньше, чтобы встретиться с другом.'),  // ~(으)려고
  '~ 시': x('사장님이 지금 오세요.', 'sajangnimi jigeum oseyo.', 'Директор сейчас идёт.'),  // ~(으)시
  '~거든요': x('오늘은 일찍 갈게요. 약속이 있거든요.', 'oneureun iljjik galgeyo. yaksogi itgeodeunyo.', 'Сегодня уйду пораньше — у меня, знаете, встреча.'),  // ~거든요
  '~것 같다': x('이 식당이 더 맛있는 것 같아요.', 'i sikdangi deo masinneun geot gatayo.', 'Кажется, в этом ресторане вкуснее.'),  // ~것 같다
  '~게': x('글씨를 크게 써 주세요.', 'geulssireul keuge sseo juseyo.', 'Напишите, пожалуйста, покрупнее.'),  // ~게
  '~게 되다': x('회사 때문에 서울에 살게 됐어요.', 'hoesa ttaemune seoure salge dwaesseoyo.', 'Из-за работы так получилось, что я живу в Сеуле.'),  // ~게 되다
  '~군요': x('여기 사람이 정말 많군요.', 'yeogi sarami jeongmal mankunyo.', 'Вот оно что, здесь и правда много людей.'),  // ~군요
  '~기 바랍니다': x('시간에 맞춰 오시기 바랍니다.', 'sigane matchwo osigi baramnida.', 'Просим прийти вовремя.'),  // ~기 바랍니다
  '~기 위해': x('건강을 지키기 위해 매일 걸어요.', 'geongangeul jikigi wihae maeil georeoyo.', 'Ради здоровья я хожу пешком каждый день.'),  // ~기 위해
  '~기로 하다': x('내일부터 일찍 자기로 했어요.', 'naeilbuteo iljjik jagiro haesseoyo.', 'Я решил с завтрашнего дня ложиться рано.'),  // ~기로 하다
  '~냐고 하다': x('친구가 어디에 사냐고 했어요.', 'chinguga eodie sanyago haesseoyo.', 'Друг спросил, где я живу.'),  // ~냐고 하다
  '~네요': x('날씨가 많이 추워졌네요.', 'nalssiga mani chuwojyeonneyo.', 'А ведь заметно похолодало.'),  // ~네요
  '~느라고': x('숙제를 하느라고 전화를 못 받았어요.', 'sukjereul haneurago jeonhwareul mot badasseoyo.', 'Я делал домашку и не смог взять трубку.'),  // ~느라고
  '~는 바람에': x('버스가 늦는 바람에 지각했어요.', 'beoseuga neunneun barame jigakhaesseoyo.', 'Из-за того что автобус опоздал, я пришёл поздно.'),  // ~는 바람에
  '~는데': x('지금 나가는데 같이 갈래요?', 'jigeum naganeunde gachi gallaeyo?', 'Я как раз выхожу, пойдём вместе?'),  // ~는데
  '~다고 하다': x('친구가 내일 온다고 했어요.', 'chinguga naeil ondago haesseoyo.', 'Друг сказал, что придёт завтра.'),  // ~다고 하다
  '~더라고요': x('그 카페 커피가 맛있더라고요.', 'geu kape keopiga masitdeoragoyo.', 'Кофе в том кафе, оказалось, вкусный.'),  // ~더라고요
  '~던': x('제가 마시던 커피가 어디 갔죠?', 'jega masideon keopiga eodi gatjyo?', 'Куда делся кофе, который я пил?'),  // ~던
  '~로 나타났다': x('응답자의 절반이 반대하는 것으로 나타났다.', 'eungdapjaui jeolbani bandaehaneun geoseuro natanatda.', 'Половина опрошенных, как показало исследование, против.'),  // ~로 나타났다
  '~밖에': x('지갑에 천 원밖에 없어요.', 'jigabe cheon wonbakke eopseoyo.', 'В кошельке только тысяча вон.'),  // ~밖에
  '~아/어 놓다': x('창문을 열어 놓았어요.', 'changmuneul yeoreo noasseoyo.', 'Я открыл окно и оставил открытым.'),  // ~아/어 놓다
  '~아/어 달라고 하다': x('친구가 사진을 찍어 달라고 했어요.', 'chinguga sajineul jjigeo dallago haesseoyo.', 'Друг попросил его сфотографировать.'),  // ~아/어 달라고 하다
  '~아/어 두다': x('표를 미리 사 두었어요.', 'pyoreul miri sa dueosseoyo.', 'Я заранее купил билеты про запас.'),  // ~아/어 두다
  '~아/어 버리다': x('케이크를 다 먹어 버렸어요.', 'keikeureul da meogeo beoryeosseoyo.', 'Я взял и съел весь торт.'),  // ~아/어 버리다
  '~아/어야 한다': x('여권을 꼭 가져와야 해요.', 'yeogwoneul kkok gajyeowaya haeyo.', 'Паспорт обязательно нужно взять с собой.'),  // ~아/어야 한다
  '~아/어지다': x('요즘 날씨가 따뜻해졌어요.', 'yojeum nalssiga ttatteuthaejyeosseoyo.', 'В последнее время погода стала теплее.'),  // ~아/어지다
  '~에 비해': x('작년에 비해 값이 많이 올랐어요.', 'jangnyeone bihae gapsi mani ollasseoyo.', 'По сравнению с прошлым годом цены сильно выросли.'),  // ~에 비해
  '~이다': x('이것은 우리 회사의 첫 제품이다.', 'igeoseun uri hoesaui cheot jepumida.', 'Это первый продукт нашей компании.'),  // ~이다
  '~자고 하다': x('친구가 같이 영화를 보자고 했어요.', 'chinguga gachi yeonghwareul bojago haesseoyo.', 'Друг предложил вместе посмотреть кино.'),  // ~자고 하다
  '~잖아요': x('어제 말했잖아요, 오늘 회의 있어요.', 'eoje malhaetjanayo, oneul hoeui isseoyo.', 'Ну я же вчера говорил — сегодня совещание.'),  // ~잖아요
  '~죠': x('여기 날씨 좋죠?', 'yeogi nalssi jochyo?', 'Здесь хорошая погода, правда?'),  // ~죠
  'ㄱ': x('가방에 김밥이 있어요.', 'gabange gimbabi isseoyo.', 'В сумке кимпаб.'),  // ㄱ
  'ㄲ': x('꽃이 아주 예뻐요.', 'kkochi aju yeppeoyo.', 'Цветы очень красивые.'),  // ㄲ
  'ㄴ': x('나무 아래에 사람이 있어요.', 'namu araee sarami isseoyo.', 'Под деревом человек.'),  // ㄴ
  'ㄷ': x('다리 위에서 사진을 찍었어요.', 'dari wieseo sajineul jjigeosseoyo.', 'Я сфотографировал на мосту.'),  // ㄷ
  'ㄸ': x('딸기가 정말 달아요.', 'ttalgiga jeongmal darayo.', 'Клубника очень сладкая.'),  // ㄸ
  'ㄹ': x('라디오를 켜 주세요.', 'radioreul kyeo juseyo.', 'Включите радио, пожалуйста.'),  // ㄹ
  'ㅁ': x('물 한 잔 주세요.', 'mul han jan juseyo.', 'Дайте стакан воды.'),  // ㅁ
  'ㅂ': x('바다가 아주 넓어요.', 'badaga aju neolbeoyo.', 'Море очень широкое.'),  // ㅂ
  'ㅃ': x('빵을 두 개 샀어요.', 'ppangeul du gae sasseoyo.', 'Я купил две булки.'),  // ㅃ
  'ㅅ': x('사과가 아주 싸요.', 'sagwaga aju ssayo.', 'Яблоки очень дешёвые.'),  // ㅅ
  'ㅆ': x('쌀을 조금만 사 주세요.', 'ssareul jogeumman sa juseyo.', 'Купите немного риса.'),  // ㅆ
  'ㅇ': x('오이를 두 개 샀어요.', 'oireul du gae sasseoyo.', 'Я купил два огурца.'),  // ㅇ
  'ㅈ': x('자전거를 타고 왔어요.', 'jajeongeoreul tago wasseoyo.', 'Я приехал на велосипеде.'),  // ㅈ
  'ㅉ': x('짜장면을 시켰어요.', 'jjajangmyeoneul sikyeosseoyo.', 'Я заказал чачжанмён.'),  // ㅉ
  'ㅊ': x('책을 한 권 빌렸어요.', 'chaegeul han gwon billyeosseoyo.', 'Я взял одну книгу.'),  // ㅊ
  'ㅋ': x('커피 한 잔 주세요.', 'keopi han jan juseyo.', 'Дайте чашку кофе.'),  // ㅋ
  'ㅌ': x('토요일에 만나요.', 'toyoire mannayo.', 'Встретимся в субботу.'),  // ㅌ
  'ㅍ': x('포도가 아주 달아요.', 'podoga aju darayo.', 'Виноград очень сладкий.'),  // ㅍ
  'ㅎ': x('하늘이 아주 맑아요.', 'haneuri aju malgayo.', 'Небо очень ясное.'),  // ㅎ
  'ㅏ': x('아기가 자고 있어요.', 'agiga jago isseoyo.', 'Ребёнок спит.'),  // ㅏ
  'ㅐ': x('내 가방이 어디 있어요?', 'nae gabangi eodi isseoyo?', 'Где моя сумка?'),  // ㅐ
  'ㅑ': x('야채를 많이 먹어요.', 'yachaereul mani meogeoyo.', 'Я ем много овощей.'),  // ㅑ
  'ㅒ': x('얘가 제 동생이에요.', 'yaega je dongsaengieyo.', 'Это мой младший брат.'),  // ㅒ
  'ㅓ': x('어머니가 집에 계세요.', 'eomeoniga jibe gyeseyo.', 'Мама дома.'),  // ㅓ
  'ㅔ': x('에어컨을 켜 주세요.', 'eeokeoneul kyeo juseyo.', 'Включите кондиционер.'),  // ㅔ
  'ㅕ': x('여기가 우리 집이에요.', 'yeogiga uri jibieyo.', 'Вот наш дом.'),  // ㅕ
  'ㅖ': x('예약을 했어요.', 'yeyageul haesseoyo.', 'Я забронировал.'),  // ㅖ
  'ㅗ': x('오늘 날씨가 좋아요.', 'oneul nalssiga joayo.', 'Сегодня хорошая погода.'),  // ㅗ
  'ㅘ': x('과일을 좀 샀어요.', 'gwaireul jom sasseoyo.', 'Я купил немного фруктов.'),  // ㅘ
  'ㅙ': x('왜 늦었어요?', 'wae neujeosseoyo?', 'Почему опоздали?'),  // ㅙ
  'ㅚ': x('외국에서 일해요.', 'oegugeseo ilhaeyo.', 'Я работаю за границей.'),  // ㅚ
  'ㅛ': x('요리를 배우고 싶어요.', 'yorireul baeugo sipeoyo.', 'Хочу научиться готовить.'),  // ㅛ
  'ㅜ': x('우유를 한 잔 마셨어요.', 'uyureul han jan masyeosseoyo.', 'Я выпил стакан молока.'),  // ㅜ
  'ㅝ': x('원피스가 잘 어울려요.', 'wonpiseuga jal eoullyeoyo.', 'Платье вам идёт.'),  // ㅝ
  'ㅞ': x('웨이터를 불렀어요.', 'weiteoreul bulleosseoyo.', 'Я позвал официанта.'),  // ㅞ
  'ㅟ': x('위층에 사람이 살아요.', 'wicheunge sarami sarayo.', 'Наверху живут люди.'),  // ㅟ
  'ㅠ': x('유리컵을 조심하세요.', 'yurikeobeul josimhaseyo.', 'Осторожнее со стеклянным стаканом.'),  // ㅠ
  'ㅡ': x('그 사람을 알아요.', 'geu sarameul arayo.', 'Я знаю этого человека.'),  // ㅡ
  'ㅢ': x('의사 선생님을 만났어요.', 'uisa seonsaengnimeul mannasseoyo.', 'Я был у врача.'),  // ㅢ
  'ㅣ': x('이 책이 재미있어요.', 'i chaegi jaemiisseoyo.', 'Эта книга интересная.'),  // ㅣ
  '가능성': x('비가 올 가능성이 높아요.', 'biga ol ganeungseongi nopayo.', 'Вероятность дождя высокая.'),  // 가능성
  '가다': x('내일 병원에 가요.', 'naeil byeongwone gayo.', 'Завтра иду в больницу.'),  // 가다
  '가장 많다': x('20대가 가장 많았습니다.', 'isipdaega gajang manatseumnida.', 'Больше всего было людей за двадцать.'),  // 가장 많다
  '갈아타다': x('시청역에서 2호선으로 갈아타세요.', 'sicheongyeogeseo ihoseoneuro garataseyo.', 'На станции Сичхон пересядьте на вторую линию.'),  // 갈아타다
  '감동하다': x('그 편지를 읽고 감동했어요.', 'geu pyeonjireul ilkgo gamdonghaesseoyo.', 'Я был тронут, прочитав то письмо.'),  // 감동하다
  '감소하다': x('작년부터 인구가 감소하고 있어요.', 'jangnyeonbuteo inguga gamsohago isseoyo.', 'С прошлого года население снижается.'),  // 감소하다
  '강아지': x('강아지가 문 앞에서 기다려요.', 'gangajiga mun apeseo gidaryeoyo.', 'Собака ждёт у двери.'),  // 강아지
  '개설': x('은행에서 계좌를 개설했어요.', 'eunhaengeseo gyejwareul gaeseolhaesseoyo.', 'Я открыл счёт в банке.'),
  '거절하다': x('미안하지만 이번에는 거절할게요.', 'mianhajiman ibeoneneun geojeolhalgeyo.', 'Извини, но в этот раз я откажусь.'),  // 거절하다
  '걱정하다': x('너무 걱정하지 마세요. 잘될 거예요.', 'neomu geokjeonghaji maseyo. jaldoel geoyeyo.', 'Не переживайте так. Всё получится.'),  // 걱정하다
  '건강검진': x('회사에서 일 년에 한 번 건강검진을 해요.', 'hoesaeseo il nyeone han beon geongangeomjineul haeyo.', 'На работе раз в год проходим медосмотр.'),
  '걷다': x('저는 매일 삼십 분씩 걸어요.', 'jeoneun maeil samsipbunssik georeoyo.', 'Я каждый день хожу пешком по тридцать минут.'),  // 걷다
  '걸리다': x('집까지 30분쯤 걸려요.', 'jipkkaji samsipbunjjeum geollyeoyo.', 'До дома примерно тридцать минут.'),  // 걸리다
  '것': x('책을 읽는 것을 좋아해요.', 'chaegeul ingneun geoseul joahaeyo.', 'Я люблю читать книги.'),  // 것
  '겉으로': x('겉으로는 괜찮아 보여요.', 'geoteuroneun gwaenchana boyeoyo.', 'Внешне выглядит нормально.'),  // 겉으로
  '게다가': x('방이 넓고 게다가 조용해요.', 'bangi neolgo gedaga joyonghaeyo.', 'Комната просторная, и к тому же тихая.'),  // 게다가
  '결론적으로': x('결론적으로 저는 이 방법에 찬성합니다.', 'gyeollonjeogeuro jeoneun i bangbeobe chanseonghamnida.', 'В заключение: я за этот способ.'),  // 결론적으로
  '결정하다': x('우리는 다음 주에 떠나기로 결정했어요.', 'urineun daeum jue tteonagiro gyeoljeonghaesseoyo.', 'Мы решили уехать на следующей неделе.'),  // 결정하다
  '경험': x('저는 팀을 이끈 경험이 있어요.', 'jeoneun timeul ikkeun gyeongheomi isseoyo.', 'У меня есть опыт руководства командой.'),  // 경험
  '계시다': x('할머니는 지금 집에 계세요.', 'halmeonineun jigeum jibe gyeseyo.', 'Бабушка сейчас дома.'),  // 계시다
  '계획': x('주말 계획이 어떻게 되세요?', 'jumal gyehoegi eotteoke doeseyo?', 'Какие у вас планы на выходные?'),  // 계획
  '고민하다': x('어떤 회사에 갈지 고민하고 있어요.', 'eotteon hoesae galji gominhago isseoyo.', 'Я раздумываю, в какую компанию пойти.'),  // 고민하다
  '고유어': x('\'하늘\'은 한자어가 아니라 고유어예요.', '\'haneur\'eun hanjaeoga anira goyueoyeyo.', '«Ханыль» — не китаизм, а исконно корейское слово.'),  // 고유어
  '고장 나다': x('세탁기가 또 고장 났어요.', 'setakgiga tto gojang nasseoyo.', 'Стиральная машина опять сломалась.'),  // 고장 나다
  '곧바로': x('수업이 끝나면 곧바로 집에 가요.', 'sueobi kkeunnamyeon gotbaro jibe gayo.', 'Как только закончится урок, сразу иду домой.'),  // 곧바로
  '공부하다': x('도서관에서 두 시간 공부했어요.', 'doseogwaneseo du sigan gongbuhaesseoyo.', 'Я два часа занимался в библиотеке.'),  // 공부하다
  '관심': x('저는 디자인에 관심이 많아요.', 'jeoneun dijaine gwansimi manayo.', 'Я очень интересуюсь дизайном.'),  // 관심
  '괜찮다': x('조금 늦어도 괜찮아요.', 'jogeum neujeodo gwaenchanayo.', 'Ничего страшного, если немного опоздаете.'),  // 괜찮다
  '괜히': x('괜히 걱정했어요, 다 잘됐어요.', 'gwaenhi geokjeonghaesseoyo, da jaldwaesseoyo.', 'Зря волновался, всё вышло хорошо.'),  // 괜히
  '교재': x('교재는 따로 사야 해요.', 'gyojaeneun ttaro saya haeyo.', 'Учебник нужно купить отдельно.'),  // 교재
  '구경하다': x('시장에서 이것저것 구경했어요.', 'sijangeseo igeotjeogeot gugyeonghaesseoyo.', 'Я ходил по рынку и всё разглядывал.'),  // 구경하다
  '구체적': x('구체적인 예를 하나 들어 주세요.', 'guchejeogin yereul hana deureo juseyo.', 'Приведите один конкретный пример.'),  // 구체적
  '권하다': x('의사가 운동을 권했어요.', 'uisaga undongeul gwonhaesseoyo.', 'Врач посоветовал заниматься спортом.'),  // 권하다
  '규칙': x('여기 규칙은 간단해요. 신발을 벗으세요.', 'yeogi gyuchigeun gandanhaeyo. sinbareul beoseuseyo.', 'Правила здесь простые: снимите обувь.'),  // 규칙
  '그대로': x('그대로 두세요. 제가 정리할게요.', 'geudaero duseyo. jega jeongnihalgeyo.', 'Оставьте как есть. Я приберу.'),  // 그대로
  '그러나': x('값은 쌉니다. 그러나 시간이 오래 걸립니다.', 'gapseun ssamnida. geureona sigani orae geollimnida.', 'Цена низкая. Однако времени уходит много.'),  // 그러나
  '그런데': x('가고 싶어요. 그런데 시간이 없어요.', 'gago sipeoyo. geureonde sigani eopseoyo.', 'Хочу пойти. Но времени нет.'),  // 그런데
  '그럴듯하다': x('그 설명이 꽤 그럴듯했어요.', 'geu seolmyeongi kkwae geureoldeutaesseoyo.', 'Это объяснение звучало довольно правдоподобно.'),  // 그럴듯하다
  '그렇다': x('네, 정말 그래요.', 'ne, jeongmal geuraeyo.', 'Да, это действительно так.'),  // 그렇다
  '그만큼': x('형은 키가 크고 저도 그만큼 커요.', 'hyeongeun kiga keugo jeodo geumankeum keoyo.', 'Брат высокий, и я настолько же высокий.'),  // 그만큼
  '근거': x('주장에는 근거가 필요해요.', 'jujangeneun geungeoga piryohaeyo.', 'Утверждению нужно обоснование.'),  // 근거
  '급수': x('이번에 3급을 받았어요.', 'ibeone samgeubeul badasseoyo.', 'В этот раз я получил третий уровень.'),  // 급수
  '기다리다': x('여기에서 잠깐 기다리세요.', 'yeogieseo jamkkan gidariseyo.', 'Подождите здесь немного.'),  // 기다리다
  '기사': x('오늘 신문에서 그 기사를 읽었어요.', 'oneul sinmuneseo geu gisareul ilgeosseoyo.', 'Сегодня я прочитал эту статью в газете.'),  // 기사
  '기억': x('그날을 아직도 기억해요.', 'geunareul ajikdo gieokhaeyo.', 'Тот день я помню до сих пор.'),  // 기억
  '깜빡하다': x('우산을 깜빡하고 안 가져왔어요.', 'usaneul kkamppakhago an gajyeowasseoyo.', 'Забыл зонт по невнимательности.'),  // 깜빡하다
  '깨닫다': x('나중에 실수를 깨달았어요.', 'najunge silsureul kkaedarasseoyo.', 'Позже я осознал ошибку.'),  // 깨닫다
  '꼬리': x('강아지가 꼬리를 흔들어요.', 'gangajiga kkorireul heundeureoyo.', 'Собака виляет хвостом.'),  // 꼬리
  '끝나다': x('수업이 세 시에 끝나요.', 'sueobi se sie kkeutnayo.', 'Занятие заканчивается в три часа.'),  // 끝나다
  '끝내 버리다': x('오늘 안에 끝내 버릴게요.', 'oneul ane kkeutnae beorilgeyo.', 'Возьму и закончу сегодня же.'),  // 끝내 버리다
  '나가다': x('잠깐 밖에 나가요.', 'jamkkan bakke nagayo.', 'Я на минутку выйду на улицу.'),  // 나가다
  '나빠지다': x('날씨가 저녁부터 나빠졌어요.', 'nalssiga jeonyeokbuteo nappajyeosseoyo.', 'С вечера погода ухудшилась.'),  // 나빠지다
  '날씨': x('오늘 날씨가 참 좋아요.', 'oneul nalssiga cham joayo.', 'Сегодня погода отличная.'),  // 날씨
  '낫다': x('약을 먹고 감기가 다 나았어요.', 'yageul meokgo gamgiga da naasseoyo.', 'Я выпил лекарство, и простуда полностью прошла.'),  // 낫다
  '널다': x('빨래를 베란다에 널었어요.', 'ppallaereul berandae neoreosseoyo.', 'Развесил бельё на балконе.'),
  '노래하다': x('친구들과 노래방에서 노래했어요.', 'chingudeulgwa noraebangeseo noraehaesseoyo.', 'Мы с друзьями пели в караоке.'),  // 노래하다
  '노력하다': x('매일 30분씩 노력하고 있어요.', 'maeil samsipbunssik noryeokhago isseoyo.', 'Я стараюсь каждый день по тридцать минут.'),  // 노력하다
  '놓치다': x('버스를 놓쳐서 걸어왔어요.', 'beoseureul nochyeoseo georeowasseoyo.', 'Я опоздал на автобус и пришёл пешком.'),  // 놓치다
  '누구': x('이 가방은 누구 거예요?', 'i gabangeun nugu geoyeyo?', 'Чья это сумка?'),  // 누구
  '뉴스': x('저녁마다 뉴스를 봐요.', 'jeonyeongmada nyuseureul bwayo.', 'Каждый вечер смотрю новости.'),  // 뉴스
  '느끼다': x('처음으로 편하다고 느꼈어요.', 'cheoeumeuro pyeonhadago neukkyeosseoyo.', 'Впервые почувствовал, что мне удобно.'),  // 느끼다
  '늘다': x('한국어 실력이 많이 늘었어요.', 'hangugeo sillyeogi mani neureosseoyo.', 'Корейский заметно вырос.'),  // 늘다
  '늦다': x('버스 때문에 학교에 늦었어요.', 'beoseu ttaemune hakgyoe neujeosseoyo.', 'Из-за автобуса я опоздал в школу.'),  // 늦다
  '늦잠': x('늦잠을 자서 지각했어요.', 'neutjameul jaseo jigakhaesseoyo.', 'Я проспал и опоздал.'),  // 늦잠
  '다르다': x('이 두 가방은 색깔이 달라요.', 'i du gabangeun saekkkari dallayo.', 'У этих двух сумок разный цвет.'),  // 다르다
  '다행히': x('다행히 다친 사람은 없었어요.', 'dahaenghi dachin sarameun eopseosseoyo.', 'К счастью, пострадавших не было.'),  // 다행히
  '단수': x('내일 오전에 단수가 있습니다.', 'naeil ojeone dansuga itseumnida.', 'Завтра утром отключат воду.'),
  '단어': x('모르는 단어를 공책에 적어요.', 'moreuneun daneoreul gongchaege jeogeoyo.', 'Незнакомые слова записываю в тетрадь.'),  // 단어
  '닫다 / 닫히다': x('제가 문을 닫았는데 바람에 또 닫혔어요.', 'jega muneul dadanneunde barame tto dachyeosseoyo.', 'Я закрыл дверь, и она от ветра снова захлопнулась.'),  // 닫다 / 닫히다
  '당황하다': x('질문을 못 알아들어서 당황했어요.', 'jilmuneul mot aradeureoseo danghwanghaesseoyo.', 'Я растерялся, потому что не понял вопрос.'),  // 당황하다
  '대체로': x('이 반 학생들은 대체로 성실해요.', 'i ban haksaengdeureun daechero seongsilhaeyo.', 'Ученики в этом классе в целом старательные.'),  // 대체로
  '덥다': x('오늘은 너무 더워요.', 'oneureun neomu deowoyo.', 'Сегодня очень жарко.'),  // 덥다
  '도서관': x('도서관은 아홉 시에 문을 열어요.', 'doseogwaneun ahop sie muneul yeoreoyo.', 'Библиотека открывается в девять.'),  // 도서관
  '도와주다': x('이 문제 좀 도와주세요.', 'i munje jom dowajuseyo.', 'Помогите мне, пожалуйста, с этой задачей.'),  // 도와주다
  '도움': x('도움이 필요하면 말씀하세요.', 'doumi piryohamyeon malsseumhaseyo.', 'Если нужна помощь, скажите.'),  // 도움
  '도중에': x('학교에 가는 도중에 친구를 만났어요.', 'hakgyoe ganeun dojunge chingureul mannasseoyo.', 'По дороге в школу я встретил друга.'),  // 도중에
  '도착하다': x('기차가 세 시에 도착해요.', 'gichaga se sie dochakaeyo.', 'Поезд прибывает в три.'),  // 도착하다
  '되게': x('이 영화 되게 재미있어요.', 'i yeonghwa doege jaemiisseoyo.', 'Этот фильм очень интересный.'),  // 되게
  '되다': x('저는 커서 선생님이 되고 싶어요.', 'jeoneun keoseo seonsaengnimi doego sipeoyo.', 'Когда вырасту, хочу стать учителем.'),  // 되다
  '뒤를 이어': x('1위는 서울, 뒤를 이어 부산이었습니다.', 'irwineun seoul, dwireul ieo busanieotseumnida.', 'Первое место — Сеул, следом идёт Пусан.'),  // 뒤를 이어
  '드디어': x('드디어 시험이 끝났어요.', 'deudieo siheomi kkeutnasseoyo.', 'Наконец-то экзамены закончились.'),  // 드디어
  '드리다': x('사장님께 서류를 드렸어요.', 'sajangnimkke seoryureul deuryeosseoyo.', 'Я передал документы директору.'),  // 드리다
  '드림': x('감사합니다. 김민수 드림.', 'gamsahamnida. gim minsu deurim.', 'Спасибо. С уважением, Ким Минсу.'),
  '드시다': x('천천히 드세요.', 'cheoncheonhi deuseyo.', 'Кушайте не спеша.'),  // 드시다
  '듣기': x('듣기 시험이 제일 어려워요.', 'deutgi siheomi jeil eoryeowoyo.', 'Аудирование — самая трудная часть экзамена.'),  // 듣기
  '듣다': x('저는 아침마다 라디오를 들어요.', 'jeoneun achimmada radioreul deureoyo.', 'Я каждое утро слушаю радио.'),  // 듣다
  '듣다 / 들리다': x('음악을 듣는데 소리가 잘 안 들려요.', 'eumageul deunneunde soriga jal an deullyeoyo.', 'Слушаю музыку, но звук плохо слышно.'),  // 듣다 / 들리다
  '들어가다': x('신발을 벗고 들어가세요.', 'sinbareul beotgo deureogaseyo.', 'Разувайтесь и заходите.'),  // 들어가다
  '들어오다': x('지금 안으로 들어오세요.', 'jigeum aneuro deureooseyo.', 'Заходите внутрь, пожалуйста.'),  // 들어오다
  '따라서': x('비가 왔다. 따라서 행사가 취소되었다.', 'biga watda. ttaraseo haengsaga chwisodoeeotda.', 'Пошёл дождь. Следовательно, мероприятие отменили.'),  // 따라서
  '또한': x('가격이 싸다. 또한 배송도 빠르다.', 'gagyeogi ssada. ttohan baesongdo ppareuda.', 'Цена низкая. Кроме того, доставка быстрая.'),  // 또한
  '러시아 사람': x('저는 러시아 사람이에요.', 'jeoneun rosia saramieyo.', 'Я россиянин.'),  // 러시아 사람
  '마시다': x('저는 아침에 커피를 마셔요.', 'jeoneun achime keopireul masyeoyo.', 'Утром я пью кофе.'),  // 마시다
  '마치다': x('수업을 마치고 집에 가요.', 'sueobeul machigo jibe gayo.', 'Закончив занятие, иду домой.'),  // 마치다
  '막다': x('가방으로 문을 막지 마세요.', 'gabangeuro muneul makji maseyo.', 'Не загораживайте дверь сумкой.'),
  '막히다': x('출근 시간에는 길이 많이 막혀요.', 'chulgeun siganeneun giri mani makhyeoyo.', 'В час пик дороги сильно забиты.'),  // 막히다
  '만나다': x('내일 세 시에 만나요.', 'naeil se sie mannayo.', 'Встретимся завтра в три.'),  // 만나다
  '만들다': x('주말에 김밥을 만들 거예요.', 'jumare gimbabeul mandeul geoyeyo.', 'На выходных приготовлю кимпаб.'),  // 만들다
  '만약': x('만약 늦으면 먼저 시작하세요.', 'manyak neujeumyeon meonjeo sijakhaseyo.', 'Если вдруг опоздаю, начинайте без меня.'),  // 만약
  '말씀하시다': x('부장님이 회의에서 말씀하셨어요.', 'bujangnimi hoeuieseo malsseumhasyeosseoyo.', 'Начальник отдела выступил на совещании.'),  // 말씀하시다
  '말하기': x('말하기 연습은 매일 조금씩 해요.', 'malhagi yeonseubeun maeil jogeumssik haeyo.', 'Говорение тренирую каждый день понемногу.'),  // 말하기
  '말하다': x('천천히 말해 주세요.', 'cheoncheonhi malhae juseyo.', 'Говорите медленнее, пожалуйста.'),  // 말하다
  '맛있다': x('이 김치찌개가 정말 맛있어요.', 'i gimchijjigaega jeongmal masisseoyo.', 'Этот кимчи-тиге очень вкусный.'),  // 맛있다
  '망설이다': x('사고 싶었지만 값 때문에 망설였어요.', 'sago sipeotjiman gap ttaemune mangseoryeosseoyo.', 'Хотел купить, но колебался из-за цены.'),  // 망설이다
  '맵다': x('이 음식은 조금 매워요.', 'i eumsigeun jogeum maewoyo.', 'Это блюдо немного острое.'),  // 맵다
  '먹다': x('점심에 김밥을 먹었어요.', 'jeomsime gimbabeul meogeosseoyo.', 'На обед я съел кимпаб.'),  // 먹다
  '먹다 / 먹이다': x('아이가 밥을 안 먹어서 제가 먹였어요.', 'aiga babeul an meogeoseo jega meogyeosseoyo.', 'Ребёнок не ел, и я его покормил.'),  // 먹다 / 먹이다
  '멈추다': x('차가 멈추고 문이 열렸어요.', 'chaga meomchugo muni yeollyeosseoyo.', 'Машина остановилась, и дверь открылась.'),  // 멈추다
  '모르다': x('저는 그 사람을 잘 몰라요.', 'jeoneun geu sarameul jal mollayo.', 'Я не очень хорошо знаю этого человека.'),  // 모르다
  '모집': x('한국어 교실 학생을 모집해요.', 'hangugeo gyosil haksaengeul mojiphaeyo.', 'Идёт набор учеников в класс корейского.'),  // 모집
  '모집하다': x('회사에서 신입 사원을 모집해요.', 'hoesaeseo sinip sawoneul mojiphaeyo.', 'Компания набирает новых сотрудников.'),  // 모집하다
  '문을 닫다': x('이 가게는 아홉 시에 문을 닫아요.', 'i gageneun ahop sie muneul dadayo.', 'Этот магазин закрывается в девять.'),  // 문을 닫다
  '문을 열다': x('식당은 열한 시에 문을 열어요.', 'sikdangeun yeolhan sie muneul yeoreoyo.', 'Ресторан открывается в одиннадцать.'),  // 문을 열다
  '문의': x('문의는 이메일로 해 주세요.', 'munuineun imeillo hae juseyo.', 'С вопросами обращайтесь по электронной почте.'),  // 문의
  '문화': x('한국 문화에 관심이 많아요.', 'hanguk munhwae gwansimi manayo.', 'Я очень интересуюсь корейской культурой.'),  // 문화
  '묻다': x('길을 몰라서 지나가는 사람에게 물었어요.', 'gireul mollaseo jinaganeun saramege mureosseoyo.', 'Я не знал дороги и спросил у прохожего.'),  // 묻다
  '물어보다': x('길을 몰라서 물어봤어요.', 'gireul mollaseo mureobwasseoyo.', 'Я не знал дороги и спросил.'),  // 물어보다
  '미루다': x('숙제를 내일로 미뤘어요.', 'sukjereul naeillo mirwosseoyo.', 'Я отложил домашку на завтра.'),  // 미루다
  '미뤄지다': x('회의가 다음 주로 미뤄졌어요.', 'hoeuiga daeum juro mirwojyeosseoyo.', 'Совещание перенесли на следующую неделю.'),
  '밀리다': x('사고 때문에 차가 밀려요.', 'sago ttaemune chaga millyeoyo.', 'Из-за аварии машины стоят.'),  // 밀리다
  '바뀌다': x('회의 시간이 갑자기 바뀌었어요.', 'hoeui sigani gapjagi bakkwieosseoyo.', 'Время совещания внезапно поменялось.'),  // 바뀌다
  '바다': x('여름에 바다에 가고 싶어요.', 'yeoreume badae gago sipeoyo.', 'Летом хочу поехать на море.'),  // 바다
  '바쁘다': x('이번 주는 정말 바빠요.', 'ibeon juneun jeongmal bappayo.', 'На этой неделе я правда занят.'),  // 바쁘다
  '반대 의견': x('반대 의견도 한 번 들어 봅시다.', 'bandae uigyeondo han beon deureo bopsida.', 'Давайте выслушаем и противоположное мнение.'),  // 반대 의견
  '반대로': x('반대로 생각하면 답이 보여요.', 'bandaero saenggakhamyeon dabi boyeoyo.', 'Если подумать наоборот, ответ виден.'),  // 반대로
  '반말': x('친구끼리는 반말을 써요.', 'chingukkirineun banmareul sseoyo.', 'Между друзьями говорят на «ты».'),  // 반말
  '반면에': x('형은 조용해요. 반면에 동생은 활발해요.', 'hyeongeun joyonghaeyo. banmyeone dongsaengeun hwalbalhaeyo.', 'Старший брат тихий. Напротив, младший активный.'),  // 반면에
  '받다': x('생일에 선물을 많이 받았어요.', 'saengire seonmureul mani badasseoyo.', 'На день рождения я получил много подарков.'),  // 받다
  '발전하다': x('기술이 정말 빠르게 발전해요.', 'gisuri jeongmal ppareuge baljeonhaeyo.', 'Технологии развиваются очень быстро.'),  // 발전하다
  '발표하다': x('회사가 새 제품을 발표했어요.', 'hoesaga sae jepumeul balpyohaesseoyo.', 'Компания объявила о новом продукте.'),  // 발표하다
  '방학': x('방학 때 고향에 갈 거예요.', 'banghak ttae gohyange gal geoyeyo.', 'На каникулах поеду на родину.'),  // 방학
  '배고프다': x('아침을 못 먹어서 배고파요.', 'achimeul mot meogeoseo baegopayo.', 'Я не позавтракал и голоден.'),  // 배고프다
  '배우다': x('요즘 한국어를 배우고 있어요.', 'yojeum hangugeoreul baeugo isseoyo.', 'Сейчас я учу корейский.'),  // 배우다
  '번거롭게 하다': x('번거롭게 해서 죄송합니다.', 'beongeoropge haeseo joesonghamnida.', 'Извините за беспокойство.'),
  '벗다': x('여기에서 신발을 벗으세요.', 'yeogieseo sinbareul beoseuseyo.', 'Здесь снимите обувь.'),  // 벗다
  '변경하다': x('예약 시간을 변경하고 싶어요.', 'yeyak siganeul byeongyeonghago sipeoyo.', 'Хочу изменить время брони.'),  // 변경하다
  '변하다': x('십 년 사이에 동네가 많이 변했어요.', 'sip nyeon saie dongnega mani byeonhaesseoyo.', 'За десять лет район сильно изменился.'),  // 변하다
  '변화': x('작은 변화가 큰 차이를 만들어요.', 'jageun byeonhwaga keun chaireul mandeureoyo.', 'Небольшое изменение даёт большую разницу.'),  // 변화
  '보고하다': x('결과를 부장님께 보고했어요.', 'gyeolgwareul bujangnimkke bogohaesseoyo.', 'Я доложил результат начальнику отдела.'),  // 보고하다
  '보다 / 보이다': x('창밖을 봤는데 산이 잘 보여요.', 'changbakkeul bwanneunde sani jal boyeoyo.', 'Посмотрел в окно — горы хорошо видно.'),  // 보다 / 보이다
  '보통': x('보통 일곱 시에 일어나요.', 'botong ilgop sie ireonayo.', 'Обычно я встаю в семь.'),  // 보통
  '볶다': x('밥을 김치와 같이 볶아요.', 'babeul gimchiwa gachi bokkayo.', 'Жарю рис вместе с кимчи.'),
  '뵙다': x('내일 사무실에서 뵙겠습니다.', 'naeil samusireseo boepgetseumnida.', 'Завтра увидимся в офисе.'),  // 뵙다
  '부르다': x('노래방에서 노래를 불렀어요.', 'noraebangeseo noraereul bulleosseoyo.', 'Я пел песни в караоке.'),  // 부르다
  '부장님': x('부장님께 먼저 물어보세요.', 'bujangnimkke meonjeo mureoboseyo.', 'Сначала спросите у начальника отдела.'),  // 부장님
  '부탁하다': x('하나만 부탁해도 될까요?', 'hanaman butakhaedo doelkkayo?', 'Можно попросить об одном?'),  // 부탁하다
  '분리수거': x('분리수거는 화요일 저녁에 해요.', 'bullisugeoneun hwayoil jeonyeoge haeyo.', 'Раздельный сбор мусора — во вторник вечером.'),
  '분명히': x('제가 분명히 문을 잠갔어요.', 'jega bunmyeonghi muneul jamgasseoyo.', 'Я точно закрыл дверь на замок.'),  // 분명히
  '분위기': x('이 카페는 분위기가 좋아요.', 'i kapeneun bunwigiga joayo.', 'В этом кафе хорошая атмосфера.'),  // 분위기
  '비싸다': x('이 호텔은 너무 비싸요.', 'i hotereun neomu bissayo.', 'Этот отель слишком дорогой.'),  // 비싸다
  '비율': x('여성의 비율이 60%였습니다.', 'yeoseongui biyuri yuksip peosenteuyeotseumnida.', 'Доля женщин составила 60%.'),  // 비율
  '빌리다': x('도서관에서 책을 세 권 빌렸어요.', 'doseogwaneseo chaegeul se gwon billyeosseoyo.', 'Я взял в библиотеке три книги.'),  // 빌리다
  '사물함': x('사물함은 하루에 천 원이에요.', 'samulhameun harue cheon wonieyo.', 'Шкафчик стоит тысячу вон в день.'),  // 사물함
  '사용하다': x('이 화장실은 지금 사용해도 돼요.', 'i hwajangsireun jigeum sayonghaedo dwaeyo.', 'Этим туалетом сейчас можно пользоваться.'),  // 사용하다
  '산책하다': x('저녁마다 공원에서 산책해요.', 'jeonyeokmada gongwoneseo sanchaekhaeyo.', 'Каждый вечер я гуляю в парке.'),  // 산책하다
  '살다': x('저는 서울에 살아요.', 'jeoneun seoure sarayo.', 'Я живу в Сеуле.'),  // 살다
  '상황': x('지금 상황을 설명해 주세요.', 'jigeum sanghwangeul seolmyeonghae juseyo.', 'Объясните текущую ситуацию.'),  // 상황
  '새로 생겼어요': x('앞에 카페가 새로 생겼어요.', 'ape kapega saero saenggyeosseoyo.', 'Впереди недавно открылось кафе.'),  // 새로 생겼어요
  '생각보다': x('생각보다 사람이 많았어요.', 'saenggakboda sarami manasseoyo.', 'Людей было больше, чем я думал.'),  // 생각보다
  '샤워하다': x('아침에 샤워해요.', 'achime syawohaeyo.', 'Утром я принимаю душ.'),  // 샤워하다
  '서두르다': x('서두르지 마세요.', 'seodureuji maseyo.', 'Не торопитесь.'),  // 서두르다
  '선물': x('친구 생일에 선물을 샀어요.', 'chingu saengire seonmureul sasseoyo.', 'Купил подарок другу на день рождения.'),  // 선물
  '선배': x('선배가 자료를 도와줬어요.', 'seonbaega jaryoreul dowajwosseoyo.', 'Старший товарищ помог с материалами.'),  // 선배
  '설명하다': x('사용법을 다시 설명해 주세요.', 'sayongbeobeul dasi seolmyeonghae juseyo.', 'Объясните ещё раз, как этим пользоваться.'),  // 설명하다
  '소식': x('고향에서 좋은 소식이 왔어요.', 'gohyangeseo joeun sosigi wasseoyo.', 'С родины пришли хорошие новости.'),  // 소식
  '소용없다': x('지금 후회해도 소용없어요.', 'jigeum huhoehaedo soyongeopseoyo.', 'Сейчас сожалеть уже бесполезно.'),  // 소용없다
  '수강 신청': x('수강 신청은 다음 주 월요일부터예요.', 'sugang sincheongeun daeum ju woryoilbuteoyeyo.', 'Запись на курсы — со следующего понедельника.'),
  '수업료': x('수업료는 한 달에 삼만 원이에요.', 'sueomnyoneun han dare samman wonieyo.', 'Плата за занятия — 30 000 вон в месяц.'),  // 수업료
  '수영하다': x('여름마다 바다에서 수영해요.', 'yeoreummada badaeseo suyeonghaeyo.', 'Каждое лето плаваю в море.'),  // 수영하다
  '숙제': x('숙제를 아직 다 못 했어요.', 'sukjereul ajik da mot haesseoyo.', 'Я ещё не всё сделал из домашнего задания.'),  // 숙제
  '쉬다': x('이번 주말에는 집에서 쉴 거예요.', 'ibeon jumareneun jibeseo swil geoyeyo.', 'В эти выходные буду отдыхать дома.'),  // 쉬다
  '쉽니다': x('매월 첫째 주 월요일은 쉽니다.', 'maewol cheotjjae ju woryoireun swimnida.', 'В первый понедельник месяца — выходной.'),  // 쉽니다
  '쉽다': x('이 문제는 생각보다 쉬워요.', 'i munjeneun saenggakboda swiwoyo.', 'Эта задача легче, чем кажется.'),  // 쉽다
  '습관': x('일찍 자는 습관을 들였어요.', 'iljjik janeun seupgwaneul deuryeosseoyo.', 'Я завёл привычку рано ложиться.'),  // 습관
  '시간': x('오늘은 시간이 없어요.', 'oneureun sigani eopseoyo.', 'Сегодня у меня нет времени.'),  // 시간
  '시간 배분': x('시험에서는 시간 배분이 제일 중요해요.', 'siheomeseoneun sigan baebuni jeil jungyohaeyo.', 'На экзамене важнее всего распределение времени.'),  // 시간 배분
  '시작하다': x('아홉 시부터 회의를 시작해요.', 'ahop sibuteo hoeuireul sijakhaeyo.', 'Совещание начинаем с девяти.'),  // 시작하다
  '시키다': x('커피 두 잔 시켰어요.', 'keopi du jan sikyeosseoyo.', 'Я заказал два кофе.'),  // 시키다
  '신청하다': x('장학금을 신청했어요.', 'janghakgeumeul sincheonghaesseoyo.', 'Я подал заявку на стипендию.'),  // 신청하다
  '실망하다': x('결과를 보고 조금 실망했어요.', 'gyeolgwareul bogo jogeum silmanghaesseoyo.', 'Увидев результат, я немного разочаровался.'),  // 실망하다
  '실제로': x('실제로 만나 보니 훨씬 친절했어요.', 'siljero manna boni hwolssin chinjeolhaesseoyo.', 'Когда мы встретились на самом деле, он оказался гораздо приветливее.'),  // 실제로
  '싫어하다': x('저는 매운 음식을 싫어해요.', 'jeoneun maeun eumsigeul sireohaeyo.', 'Я не люблю острую еду.'),  // 싫어하다
  '심심하다': x('주말에 혼자 있으면 심심해요.', 'jumare honja isseumyeon simsimhaeyo.', 'Когда на выходных один, скучно.'),  // 심심하다
  '심지어': x('심지어 아이도 그 답을 알아요.', 'simjieo aido geu dabeul arayo.', 'Даже ребёнок знает этот ответ.'),  // 심지어
  '싶다': x('오늘은 집에 일찍 가고 싶어요.', 'oneureun jibe iljjik gago sipeoyo.', 'Сегодня хочу пораньше домой.'),  // 싶다
  '싸다': x('시장이 마트보다 싸요.', 'sijangi mateuboda ssayo.', 'На рынке дешевле, чем в супермаркете.'),  // 싸다
  '썰다': x('양파를 얇게 썰어 주세요.', 'yangpareul yalge sseoreo juseyo.', 'Нарежьте лук тонко.'),
  '쓰기': x('쓰기 연습은 매일 한 문단씩 해요.', 'sseugi yeonseubeun maeil han mundanssik haeyo.', 'Письмо тренирую по одному абзацу в день.'),  // 쓰기
  '쓰다': x('여기에 이름을 쓰세요.', 'yeogie ireumeul sseuseyo.', 'Напишите здесь своё имя.'),  // 쓰다
  '씻다': x('자기 전에 손을 씻어요.', 'jagi jeone soneul ssiseoyo.', 'Перед сном я мою руки.'),  // 씻다
  '아무래도': x('아무래도 비가 올 것 같아요.', 'amuraedo biga ol geot gatayo.', 'Похоже, дождь всё-таки пойдёт.'),  // 아무래도
  '아무리': x('아무리 바빠도 아침은 먹어요.', 'amuri bappado achimeun meogeoyo.', 'Как бы ни был занят, завтракаю.'),  // 아무리
  '아프다': x('어제부터 목이 아파요.', 'eojebuteo mogi apayo.', 'Со вчерашнего дня болит горло.'),  // 아프다
  '앉다': x('여기에 앉으세요.', 'yeogie anjeuseyo.', 'Садитесь сюда.'),  // 앉다
  '앉아 있다': x('그는 창가에 앉아 있어요.', 'geuneun changgae anja isseoyo.', 'Он сидит у окна.'),  // 앉아 있다
  '알다': x('저는 그 사람을 잘 알아요.', 'jeoneun geu sarameul jal arayo.', 'Я хорошо знаю этого человека.'),  // 알다
  '알다 / 알리다': x('저는 답을 아는데 아직 안 알렸어요.', 'jeoneun dabeul aneunde ajik an allyeosseoyo.', 'Я знаю ответ, но ещё не сообщил.'),  // 알다 / 알리다
  '알리다': x('결과는 내일 알려 드릴게요.', 'gyeolgwaneun naeil allyeo deurilgeyo.', 'Результат сообщу вам завтра.'),  // 알리다
  '야구': x('주말에 야구를 보러 갔어요.', 'jumare yagureul boreo gasseoyo.', 'На выходных ходил смотреть бейсбол.'),  // 야구
  '약속': x('오늘 저녁에 약속이 있어요.', 'oneul jeonyeoge yaksogi isseoyo.', 'У меня сегодня вечером встреча.'),  // 약속
  '얘기': x('잠깐 얘기 좀 할 수 있을까요?', 'jamkkan yaegi jom hal su isseulkkayo?', 'Можно с вами коротко поговорить?'),  // 얘기
  '어떻다': x('오늘 날씨가 어때요?', 'oneul nalssiga eottaeyo?', 'Какая сегодня погода?'),  // 어떻다
  '어렵다': x('이 문법은 정말 어려워요.', 'i munbeobeun jeongmal eoryeowoyo.', 'Эта грамматика правда трудная.'),  // 어렵다
  '어쩐지': x('어쩐지 오늘 좀 피곤하더라고요.', 'eojjeonji oneul jom pigonhadeoragoyo.', 'То-то я смотрю, сегодня что-то устал.'),  // 어쩐지
  '어차피': x('어차피 늦었으니까 천천히 가요.', 'eochapi neujeosseunikka cheoncheonhi gayo.', 'Всё равно опоздали, пойдём не спеша.'),  // 어차피
  '어휘': x('어휘를 매일 열 개씩 외워요.', 'eohwireul maeil yeol gaessik oewoyo.', 'Учу по десять слов в день.'),  // 어휘
  '언니': x('언니가 저보다 두 살 많아요.', 'eonniga jeoboda du sal manayo.', 'Старшая сестра на два года старше меня.'),  // 언니
  '역시': x('역시 이 집 커피가 제일 맛있어요.', 'yeoksi i jip keopiga jeil masisseoyo.', 'Как и ожидалось, здесь кофе самый вкусный.'),  // 역시
  '연구': x('이 연구는 3년 동안 진행되었다.', 'i yeonguneun samnyeon dongan jinhaengdoeeotda.', 'Это исследование велось три года.'),  // 연구
  '연락하다': x('도착하면 연락할게요.', 'dochakhamyeon yeollakhalgeyo.', 'Как приеду, свяжусь.'),  // 연락하다
  '열다 / 열리다': x('제가 창문을 열었는데 잘 안 열려요.', 'jega changmuneul yeoreonneunde jal an yeollyeoyo.', 'Я открывал окно, но оно плохо открывается.'),  // 열다 / 열리다
  '열려 있다': x('창문이 활짝 열려 있어요.', 'changmuni hwaljjak yeollyeo isseoyo.', 'Окно широко открыто.'),  // 열려 있다
  '열이 내리다': x('약을 먹고 열이 내렸어요.', 'yageul meokgo yeori naeryeosseoyo.', 'Выпил лекарство, и температура спала.'),
  '영향': x('날씨가 판매에 영향을 줬어요.', 'nalssiga panmaee yeonghyangeul jwosseoyo.', 'Погода повлияла на продажи.'),  // 영향
  '영화': x('어제 친구와 영화를 봤어요.', 'eoje chinguwa yeonghwareul bwasseoyo.', 'Вчера смотрел кино с другом.'),  // 영화
  '예를 들어': x('예를 들어 지하철이 더 빨라요.', 'yereul deureo jihacheori deo ppallayo.', 'Например, на метро быстрее.'),  // 예를 들어
  '예쁘다': x('오늘 꽃이 정말 예뻐요.', 'oneul kkochi jeongmal yeppeoyo.', 'Сегодня цветы очень красивые.'),  // 예쁘다
  '예약하다': x('식당을 일곱 시로 예약했어요.', 'sikdangeul ilgop siro yeyakhaesseoyo.', 'Я забронировал ресторан на семь.'),  // 예약하다
  '예전에': x('예전에 여기에 시장이 있었어요.', 'yejeone yeogie sijangi isseosseoyo.', 'Раньше здесь был рынок.'),  // 예전에
  '오다': x('밖에 비가 와요.', 'bakke biga wayo.', 'На улице идёт дождь.'),  // 오다
  '오답': x('오답을 다시 정리해 보세요.', 'odabeul dasi jeongrihae boseyo.', 'Разберите неверные ответы ещё раз.'),  // 오답
  '오이': x('오이를 얇게 썰어 주세요.', 'oireul yalpge sseoreo juseyo.', 'Нарежьте огурец тонко.'),  // 오이
  '오히려': x('약을 먹었는데 오히려 더 아파요.', 'yageul meogeonneunde ohiryeo deo apayo.', 'Выпил лекарство, а стало наоборот хуже.'),  // 오히려
  '올라가다': x('엘리베이터로 십 층에 올라가요.', 'ellibeiteoro sip cheunge ollagayo.', 'Поднимаюсь на лифте на десятый этаж.'),
  '왜냐하면': x('저는 걷습니다. 왜냐하면 건강에 좋으니까요.', 'jeoneun geotseumnida. waenyahamyeon geongange joeunikkayo.', 'Я хожу пешком, потому что это полезно.'),  // 왜냐하면
  '외래어': x('\'커피\'는 영어에서 온 외래어예요.', '\'keopi\'neun yeongeoeseo on oeraeeoyeyo.', '«Копи» — заимствование из английского.'),  // 외래어
  '요리하다': x('주말에는 제가 요리해요.', 'jumareneun jega yorihaeyo.', 'По выходным готовлю я.'),  // 요리하다
  '우연히': x('길에서 우연히 친구를 만났어요.', 'gireseo uyeonhi chingureul mannasseoyo.', 'Я случайно встретил друга на улице.'),  // 우연히
  '운전하다': x('저는 운전할 줄 몰라요.', 'jeoneun unjeonhal jul mollayo.', 'Я не умею водить машину.'),  // 운전하다
  '원래': x('원래 이 자리는 공원이었어요.', 'wollae i jarineun gongwonieotseoyo.', 'Изначально на этом месте был парк.'),  // 원래
  '웬만하면': x('웬만하면 오늘 안에 끝내고 싶어요.', 'wenmanhamyeon oneul ane kkeutnaego sipeoyo.', 'По возможности хочу закончить сегодня же.'),  // 웬만하면
  '유래': x('이 축제의 유래는 아주 오래됐어요.', 'i chukjeui yuraeneun aju oraedwaesseoyo.', 'Происхождение этого праздника очень древнее.'),  // 유래
  '이야기하다': x('친구랑 오랫동안 이야기했어요.', 'chingurang oraetdongan iyagihaesseoyo.', 'Мы с другом долго разговаривали.'),  // 이야기하다
  '이어서': x('노래가 끝나고 이어서 박수가 나왔어요.', 'noraega kkeunnago ieoseo baksuga nawasseoyo.', 'Песня закончилась, и следом раздались аплодисменты.'),  // 이어서
  '이에 따라': x('비가 많이 왔다. 이에 따라 행사가 연기되었다.', 'biga mani watda. ie ttara haengsaga yeongidoeeotda.', 'Шли сильные дожди. В связи с этим мероприятие перенесли.'),  // 이에 따라
  '이유': x('늦은 이유를 말해 주세요.', 'neujeun iyureul malhae juseyo.', 'Скажите причину опоздания.'),  // 이유
  '익숙해지다': x('이제 새 일에 익숙해졌어요.', 'ije sae ire iksukhaejyeosseoyo.', 'Теперь я привык к новой работе.'),  // 익숙해지다
  '인구': x('이 도시의 인구는 50만 명이에요.', 'i dosiui inguneun osimman myeongieyo.', 'Население этого города — 500 тысяч.'),  // 인구
  '인상적이다': x('마지막 장면이 인상적이었어요.', 'majimak jangmyeoni insangjeogieosseoyo.', 'Последняя сцена произвела впечатление.'),  // 인상적이다
  '일단': x('일단 여기 앉으세요.', 'ildan yeogi anjeuseyo.', 'Для начала присядьте здесь.'),  // 일단
  '일하다': x('내년에는 서울에서 일할 거예요.', 'naenyeoneneun seoureseo ilhal geoyeyo.', 'В следующем году буду работать в Сеуле.'),  // 일하다
  '읽기': x('읽기 문제는 시간이 부족해요.', 'ilgi munjeneun sigani bujokhaeyo.', 'На заданиях по чтению не хватает времени.'),  // 읽기
  '읽다': x('저는 자기 전에 책을 읽어요.', 'jeoneun jagi jeone chaegeul ilgeoyo.', 'Перед сном я читаю книгу.'),  // 읽다
  '입다': x('날씨가 추워서 코트를 입었어요.', 'nalssiga chuwoseo koteureul ibeosseoyo.', 'Было холодно, и я надел пальто.'),  // 입다
  '입다 / 입히다': x('저는 코트를 입고 아이에게도 입혔어요.', 'jeoneun koteureul ipgo aiegedo iphyeosseoyo.', 'Я надел пальто и одел ребёнка.'),  // 입다 / 입히다
  '있다': x('가방 안에 여권이 있어요.', 'gabang ane yeogwoni isseoyo.', 'В сумке паспорт.'),  // 있다
  '잊어버리다': x('이름을 완전히 잊어버렸어요.', 'ireumeul wanjeonhi ijeobeoryeosseoyo.', 'Я совсем забыл имя.'),  // 잊어버리다
  '자격증': x('한국어 자격증을 땄어요.', 'hangugeo jagyeokjeungeul ttasseoyo.', 'Я получил сертификат по корейскому.'),  // 자격증
  '자기소개': x('면접은 자기소개부터 시작해요.', 'myeonjeobeun jagisogaebuteo sijakhaeyo.', 'Собеседование начинается с рассказа о себе.'),  // 자기소개
  '자다': x('저는 보통 열한 시에 자요.', 'jeoneun botong yeolhan sie jayo.', 'Обычно я ложусь спать в одиннадцать.'),  // 자다
  '자다 / 재우다': x('아이를 재우고 저도 잤어요.', 'aireul jaeugo jeodo jasseoyo.', 'Я уложил ребёнка и сам лёг спать.'),  // 자다 / 재우다
  '장단점': x('두 방법의 장단점을 비교해 봅시다.', 'du bangbeobui jangdanjeomeul bigyohae bopsida.', 'Сравним плюсы и минусы двух способов.'),  // 장단점
  '장소': x('장소는 시민 회관 이 층이에요.', 'jangsoneun simin hoegwan i cheungieyo.', 'Место — второй этаж городского центра.'),  // 장소
  '재료비': x('재료비 오천 원을 내야 해요.', 'jaeryobi ocheon woneul naeya haeyo.', 'Нужно заплатить пять тысяч вон за материалы.'),  // 재료비
  '재미있다': x('어제 본 영화가 재미있었어요.', 'eoje bon yeonghwaga jaemiisseosseoyo.', 'Вчерашний фильм был интересным.'),  // 재미있다
  '저거': x('저거 얼마예요?', 'jeogeo eolmayeyo?', 'Сколько стоит вон то?'),  // 저거
  '저축하다': x('매달 조금씩 저축하고 있어요.', 'maedal jogeumssik jeochukhago isseoyo.', 'Каждый месяц понемногу коплю.'),  // 저축하다
  '적어 두다': x('주소를 수첩에 적어 뒀어요.', 'jusoreul sucheobe jeogeo dwosseoyo.', 'Я записал адрес в блокнот про запас.'),  // 적어 두다
  '적응하다': x('새 학교에 잘 적응했어요.', 'sae hakgyoe jal jeogeunghaesseoyo.', 'Я хорошо адаптировался к новой школе.'),  // 적응하다
  '전하다': x('제 인사를 부모님께 전해 주세요.', 'je insareul bumonimkke jeonhae juseyo.', 'Передайте от меня привет родителям.'),  // 전하다
  '전혀': x('그 이야기는 전혀 몰랐어요.', 'geu iyagineun jeonhyeo mollasseoyo.', 'Об этом я совсем не знал.'),  // 전혀
  '전화': x('나중에 다시 전화할게요.', 'najunge dasi jeonhwahalgeyo.', 'Перезвоню позже.'),  // 전화
  '전화하다': x('이따가 다시 전화할게요.', 'ittaga dasi jeonhwahalgeyo.', 'Я перезвоню чуть позже.'),  // 전화하다
  '점검': x('엘리베이터 점검 중이라 계단으로 가세요.', 'ellibeiteo jeomgeom jungira gyedaneuro gaseyo.', 'Лифт на техобслуживании, идите по лестнице.'),
  '점수': x('이번 점수가 지난번보다 높아요.', 'ibeon jeomsuga jinanbeonboda nopayo.', 'В этот раз балл выше прошлого.'),  // 점수
  '제한되다': x('참가 인원이 서른 명으로 제한된다.', 'chamga inwoni seoreun myeongeuro jehandoenda.', 'Число участников ограничено тридцатью.'),  // 제한되다
  '조건': x('조건이 하나 있어요. 주말에도 일해야 해요.', 'jogeoni hana isseoyo. jumaredo ilhaeya haeyo.', 'Есть одно условие: работать и по выходным.'),  // 조건
  '조사 결과': x('조사 결과 절반이 반대했습니다.', 'josa gyeolgwa jeolbani bandaehaetseumnida.', 'По результатам опроса половина была против.'),  // 조사 결과
  '조사하다': x('이유를 조사해 봤어요.', 'iyureul josahae bwasseoyo.', 'Я исследовал причину.'),  // 조사하다
  '조심하다': x('길이 미끄러우니까 조심하세요.', 'giri mikkeureounikka josimhaseyo.', 'Дорога скользкая, будьте осторожны.'),  // 조심하다
  '졸리다': x('어제 늦게 자서 너무 졸려요.', 'eoje neutge jaseo neomu jollyeoyo.', 'Вчера лёг поздно, поэтому очень хочется спать.'),
  '종이컵': x('종이컵은 정수기 옆에 있어요.', 'jongikeobeun jeongsugi yeope isseoyo.', 'Бумажные стаканчики стоят рядом с кулером.'),
  '좋아지다': x('연습하니까 발음이 좋아졌어요.', 'yeonseuphanikka bareumi joajyeosseoyo.', 'После тренировок произношение улучшилось.'),  // 좋아지다
  '좋아하다': x('저는 바다를 좋아해요.', 'jeoneun badareul joahaeyo.', 'Я люблю море.'),  // 좋아하다
  '주다': x('이 책을 저에게 주세요.', 'i chaegeul jeoege juseyo.', 'Дайте мне, пожалуйста, эту книгу.'),  // 주다
  '주무시다': x('할아버지는 지금 주무세요.', 'harabeojineun jigeum jumuseyo.', 'Дедушка сейчас спит.'),  // 주무시다
  '주장': x('글쓴이의 주장은 분명해요.', 'geulsseuniui jujangeun bunmyeonghaeyo.', 'Позиция автора ясна.'),  // 주장
  '주장하다': x('그는 값을 내려야 한다고 주장했다.', 'geuneun gapseul naeryeoya handago jujanghaetda.', 'Он утверждал, что цену надо снизить.'),  // 주장하다
  '준비': x('여행 준비는 다 끝났어요.', 'yeohaeng junbineun da kkeutnasseoyo.', 'Подготовка к поездке закончена.'),  // 준비
  '준비하다': x('내일 발표를 준비할 거예요.', 'naeil balpyoreul junbihal geoyeyo.', 'Завтра буду готовить выступление.'),  // 준비하다
  '준비해 놓다': x('자료를 미리 준비해 놓았어요.', 'jaryoreul miri junbihae noasseoyo.', 'Материалы я подготовил заранее.'),  // 준비해 놓다
  '줄다': x('올해 손님이 많이 줄었어요.', 'olhae sonnimi mani jureosseoyo.', 'В этом году клиентов заметно сократилось.'),  // 줄다
  '중요하다': x('무엇보다 건강이 중요해요.', 'mueotboda geongangi jungyohaeyo.', 'Важнее всего здоровье.'),  // 중요하다
  '즉': x('내일, 즉 금요일에 만나요.', 'naeil, jeuk geumyoire mannayo.', 'Завтра, то есть в пятницу, встретимся.'),  // 즉
  '증가하다': x('관광객이 두 배로 증가했다.', 'gwangwanggaegi du baero jeunggahaetda.', 'Число туристов возросло вдвое.'),  // 증가하다
  '지각하다': x('지하철이 멈춰서 지각했어요.', 'jihacheori meomchwoseo jigakhaesseoyo.', 'Метро встало, и я опоздал.'),  // 지각하다
  '지난주': x('지난주에 이사했어요.', 'jinanjue isahaesseoyo.', 'На прошлой неделе я переехал.'),  // 지난주
  '질문': x('질문이 있으면 손을 드세요.', 'jilmuni isseumyeon soneul deuseyo.', 'Если есть вопрос, поднимите руку.'),  // 질문
  '집': x('오늘은 집에서 쉬어요.', 'oneureun jibeseo swieoyo.', 'Сегодня отдыхаю дома.'),  // 집
  '집중하다': x('조용한 곳에서 더 잘 집중해요.', 'joyonghan goseseo deo jal jipjunghaeyo.', 'В тихом месте я лучше сосредотачиваюсь.'),  // 집중하다
  '짓다': x('할머니가 새 이름을 지어 주셨어요.', 'halmeoniga sae ireumeul jieo jusyeosseoyo.', 'Бабушка придумала мне новое имя.'),  // 짓다
  '짜다': x('국이 조금 짜요.', 'gugi jogeum jjayo.', 'Суп немного солёный.'),  // 짜다
  '찍다': x('여기에서 사진을 찍어도 돼요?', 'yeogieseo sajineul jjigeodo dwaeyo?', 'Здесь можно фотографировать?'),  // 찍다
  '차지하다': x('20대가 절반을 차지했습니다.', 'isipdaega jeolbaneul chajihaetseumnida.', 'Люди за двадцать составили половину.'),  // 차지하다
  '참가비': x('참가비는 무료예요.', 'chamgabineun muryoyeyo.', 'Участие бесплатное.'),  // 참가비
  '참가자': x('참가자 여러분께 안내드립니다.', 'chamgaja yeoreobunkke annaedeurimnida.', 'Уважаемые участники, объявление для вас.'),  // 참가자
  '참여하다': x('이번 행사에 백 명이 참여했어요.', 'ibeon haengsae baek myeongi chamyeohaesseoyo.', 'В мероприятии участвовали сто человек.'),  // 참여하다
  '처음으로': x('처음으로 혼자 여행을 갔어요.', 'cheoeumeuro honja yeohaengeul gasseoyo.', 'Впервые я поехал в путешествие один.'),  // 처음으로
  '청소하다': x('주말마다 방을 청소해요.', 'jumalmada bangeul cheongsohaeyo.', 'Каждые выходные убираю в комнате.'),  // 청소하다
  '추측하다': x('이유는 이렇게 추측할 수 있어요.', 'iyuneun ireoke chucheukhal su isseoyo.', 'Причину можно предположить так.'),  // 추측하다
  '출발하다': x('우리는 아침 일곱 시에 출발해요.', 'urineun achim ilgop sie chulbalhaeyo.', 'Мы отправляемся в семь утра.'),  // 출발하다
  '춥다': x('겨울에는 여기가 많이 추워요.', 'gyeoureneun yeogiga mani chuwoyo.', 'Зимой здесь очень холодно.'),  // 춥다
  '취소되다': x('비 때문에 경기가 취소됐어요.', 'bi ttaemune gyeonggiga chwisodwaesseoyo.', 'Из-за дождя матч отменили.'),  // 취소되다
  '취소하다': x('예약을 취소하고 싶어요.', 'yeyageul chwisohago sipeoyo.', 'Хочу отменить бронь.'),  // 취소하다
  '취업': x('요즘 취업이 쉽지 않아요.', 'yojeum chwieobi swipji anayo.', 'Сейчас с трудоустройством непросто.'),  // 취업
  '취직하다': x('형이 은행에 취직했어요.', 'hyeongi eunhaenge chwijikhaesseoyo.', 'Брат устроился в банк.'),  // 취직하다
  '치우다': x('식사 후에 상을 치웠어요.', 'siksa hue sangeul chiwosseoyo.', 'После еды я убрал со стола.'),  // 치우다
  '친해지다': x('같은 반 친구와 금방 친해졌어요.', 'gateun ban chinguwa geumbang chinhaejyeosseoyo.', 'Я быстро сблизился с одноклассником.'),  // 친해지다
  '켜 놓다': x('불을 켜 놓고 나왔어요.', 'bureul kyeo noko nawasseoyo.', 'Я вышел, оставив свет включённым.'),  // 켜 놓다
  '크다': x('이 방은 생각보다 커요.', 'i bangeun saenggakboda keoyo.', 'Эта комната больше, чем казалось.'),  // 크다
  '탓에': x('늦은 탓에 자리가 없었어요.', 'neujeun tase jariga eopseosseoyo.', 'Из-за того что опоздал, мест не было.'),  // 탓에
  '터지다': x('수도관이 터져서 물이 안 나와요.', 'sudogwani teojyeoseo muri an nawayo.', 'Прорвало трубу, и вода не идёт.'),
  '특별하다': x('오늘은 특별한 날이에요.', 'oneureun teukbyeolhan narieyo.', 'Сегодня особенный день.'),  // 특별하다
  '팔다 / 팔리다': x('이 가게는 빵을 파는데 금방 팔려요.', 'i gageneun ppangeul paneunde geumbang pallyeoyo.', 'В этом магазине продают хлеб, и он быстро расходится.'),  // 팔다 / 팔리다
  '편': x('저는 조용한 편이에요.', 'jeoneun joyonghan pyeonieyo.', 'Я, скорее, тихий человек.'),  // 편
  '평소에': x('평소에 아침 일곱 시에 일어나요.', 'pyeongsoe achim ilgop sie ireonayo.', 'Обычно я встаю в семь утра.'),  // 평소에
  '포기하다': x('중간에 포기하지 마세요.', 'junggane pogihaji maseyo.', 'Не сдавайтесь на полпути.'),  // 포기하다
  '피곤하다': x('오늘은 정말 피곤해요.', 'oneureun jeongmal pigonhaeyo.', 'Сегодня я правда устал.'),  // 피곤하다
  '피곤할 때': x('피곤할 때는 커피보다 물이 좋아요.', 'pigonhal ttaeneun keopiboda muri joayo.', 'Когда устал, вода лучше кофе.'),  // 피곤할 때
  '필요하다': x('여권 사진이 두 장 필요해요.', 'yeogwon sajini du jang piryohaeyo.', 'Нужны две фотографии на паспорт.'),  // 필요하다
  '핑계': x('핑계 말고 이유를 말해 주세요.', 'pinggye malgo iyureul malhae juseyo.', 'Не отговорки, а причину скажите.'),  // 핑계
  '하긴': x('하긴, 그것도 맞는 말이에요.', 'hagin, geugeotdo manneun marieyo.', 'И то верно, в этом тоже есть смысл.'),  // 하긴
  '하다': x('주말에 운동을 해요.', 'jumare undongeul haeyo.', 'По выходным я занимаюсь спортом.'),  // 하다
  '하마터면': x('하마터면 버스를 놓칠 뻔했어요.', 'hamateomyeon beoseureul nochil ppeonhaesseoyo.', 'Я чуть было не опоздал на автобус.'),  // 하마터면
  '학교': x('학교에 여덟 시까지 가요.', 'hakgyoe yeodeol sikkaji gayo.', 'В школу иду к восьми.'),  // 학교
  '학기': x('이번 학기는 9월에 시작해요.', 'ibeon hakgineun guworae sijakhaeyo.', 'Этот семестр начинается в сентябре.'),  // 학기
  '학생': x('저는 아직 학생이에요.', 'jeoneun ajik haksaengieyo.', 'Я пока студент.'),  // 학생
  '한국말': x('한국말을 조금 할 수 있어요.', 'hangungmareul jogeum hal su isseoyo.', 'Я немного говорю по-корейски.'),  // 한국말
  '한번': x('한번 입어 보세요.', 'hanbeon ibeo boseyo.', 'Примерьте разок.'),  // 한번
  '한자': x('이 단어는 한자로 두 글자예요.', 'i daneoneun hanjaro du geuljayeyo.', 'Это слово — два иероглифа ханча.'),  // 한자
  '한자어': x('\'학교\'는 한자어예요.', '\'hakgyo\'neun hanjaeoyeyo.', '«Хаккё» — слово китайского происхождения.'),  // 한자어
  '항상': x('그는 항상 십 분 일찍 와요.', 'geuneun hangsang sip bun iljjik wayo.', 'Он всегда приходит на десять минут раньше.'),  // 항상
  '해결책': x('좋은 해결책이 하나 있어요.', 'joeun haegyeolchaegi hana isseoyo.', 'Есть одно хорошее решение.'),  // 해결책
  '해결하다': x('문제를 하루 만에 해결했어요.', 'munjereul haru mane haegyeolhaesseoyo.', 'Я решил проблему за один день.'),  // 해결하다
  '혹시': x('혹시 여기 자리 있어요?', 'hoksi yeogi jari isseoyo?', 'Здесь случайно не занято?'),  // 혹시
  '혹시 시간 있으세요': x('혹시 시간 있으세요? 잠깐 이야기하고 싶어요.', 'hoksi sigan isseuseyo? jamkkan iyagihago sipeoyo.', 'У вас случайно нет времени? Хочу коротко поговорить.'),  // 혹시 시간 있으세요?
  '확실하다': x('날짜는 아직 확실하지 않아요.', 'naljjaneun ajik hwaksilhaji anayo.', 'Дата пока не точная.'),  // 확실하다
  '흐리다': x('오늘은 하늘이 흐려요.', 'oneureun haneuri heuryeoyo.', 'Сегодня небо пасмурное.'),
}
