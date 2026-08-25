// ─────────────────────────────────────────────────────────────────────────────
// Диалоги разговорников выживания
//
// ПОЧЕМУ НЕ ВО ВСЕХ ТЕМАХ. Разговорник — это 54 темы, и диалог уместен в
// большинстве, но не во всех. Не написаны девять: «Числа», «Время», «Тело» —
// это перечни, а «Слова парами», «Фразовые глаголы», «Идиомы», «Насколько
// сильно», «Предлоги» и «Слова, которые путает русский» — работа над словом,
// а не ситуация. Реплику собеседника там пришлось бы придумывать ради формы,
// и вышла бы не сцена, а карточка в костюме диалога.
//
// Всё остальное написано — включая то, что на первый взгляд выглядит списком.
// «Документы», «Банк», «Симкарта», «Граница» — это как раз разговор со
// стойкой, где чужой человек задаёт вопросы, а ты отвечаешь; именно там
// приезжий и немеет.
//
// ПОЧЕМУ РУКАМИ, А НЕ ИЗ ФРАЗ. Фразы разговорника лежат готовыми, и соблазн
// склеить из них диалог автоматически велик. Но две фразы одной темы не
// становятся разговором оттого, что стоят рядом: «американо, пожалуйста» и
// «холодный американо» — не реплики, а два пункта списка. Реплику собеседника
// надо написать, и именно она делает задание заданием.
//
// ЧТО ПРОВЕРЯЕТ ПРОПУСК. Не перевод, а ВЫБОР фразы в ситуации — там, где
// разговорник предупреждает о ловушке. Уходя из магазина, кореец говорит
// 안녕히 계세요, а не 안녕히 가세요; немец в кафе просит Ich hätte gern, а не Ich
// will. Обманки — соседние фразы той же темы: все переводятся похоже, а
// уместна одна.
// ─────────────────────────────────────────────────────────────────────────────

import { gapDialog, type SeedTask } from './languageCourse'

/** Подпись задания — одна на все диалоги: содержания она не несёт. */
const ASK = 'Послушайте разговор и вставьте недостающую реплику.'

// ─── Корейский ───────────────────────────────────────────────────────────────

export const KOSV_DIALOGS: Record<string, SeedTask[]> = {
  // Ловушка темы: уходит ученик, значит остающемуся — 안녕히 계세요.
  greet: [gapDialog(ASK, [
    ['점원', '안녕히 가세요!'],
    ['다냐', '____.'],
  ], '안녕히 계세요', { distractors: ['안녕히 가세요', '안녕', '반갑습니다'] })],

  // 죄송합니다 признаёт вину, 실례합니다 — только открывает обращение.
  polite: [gapDialog(ASK, [
    ['다냐', '앗, 발을 밟았네요. ____.'],
    ['행인', '괜찮아요.'],
  ], '죄송합니다', { distractors: ['실례합니다', '감사합니다', '저기요'] })],

  nounder: [gapDialog(ASK, [
    ['직원', '주민등록번호를 알려 주시겠어요?'],
    ['다냐', '죄송해요, ____.'],
  ], '잘 못 알아들었어요', { distractors: ['알겠습니다', '괜찮아요', '맞아요'] })],

  meet: [gapDialog(ASK, [
    ['민수', '처음 뵙겠습니다. 민수예요.'],
    ['다냐', '다냐예요. ____.'],
  ], '반갑습니다', { distractors: ['고맙습니다', '죄송합니다', '안녕히 계세요'] })],

  yesno: [gapDialog(ASK, [
    ['다냐', '여기 사진 찍어도 돼요?'],
    ['직원', '아니요, 여기서는 ____.'],
  ], '안 돼요', { distractors: ['돼요', '괜찮아요', '좋아요'] })],

  way: [gapDialog(ASK, [
    ['다냐', '실례합니다, 지하철역이 ____?'],
    ['행인', '저 사거리에서 왼쪽이에요.'],
  ], '어디예요', { distractors: ['얼마예요', '뭐예요', '언제예요'] })],

  taxibus: [gapDialog(ASK, [
    ['기사', '어디로 모실까요?'],
    ['다냐', '이 주소로 ____.'],
  ], '가 주세요', { distractors: ['주세요', '가고 싶어요', '왔어요'] })],

  hotel: [gapDialog(ASK, [
    ['직원', '체크인 도와드릴까요?'],
    ['다냐', '네, ____ 있어요. 다냐입니다.'],
  ], '예약', { distractors: ['영수증', '방', '열쇠'] })],

  // Без 아이스 нальют горячий — это и есть ловушка темы.
  cafe: [gapDialog(ASK, [
    ['점원', '따뜻한 걸로 드릴까요?'],
    ['다냐', '아니요, ____ 주세요.'],
  ], '아이스 아메리카노', { distractors: ['따뜻한 아메리카노', '카페라떼', '에스프레소'] })],

  order: [gapDialog(ASK, [
    ['종업원', '주문하시겠어요?'],
    ['다냐', '네, 이거 ____.'],
  ], '주세요', { distractors: ['주셨어요', '주세요?', '줘'] })],

  diet: [gapDialog(ASK, [
    ['종업원', '많이 매운데 괜찮으세요?'],
    ['다냐', '아니요, ____ 해 주세요.'],
  ], '안 맵게', { distractors: ['맵게', '맛있게', '빨리'] })],

  bill: [gapDialog(ASK, [
    ['다냐', '____.'],
    ['종업원', '네, 카드로 하시겠어요?'],
  ], '계산할게요', { distractors: ['주문할게요', '먹을게요', '갈게요'] })],

  shop: [gapDialog(ASK, [
    ['다냐', '이거 ____?'],
    ['점원', '만 오천 원이에요.'],
  ], '얼마예요', { distractors: ['어디예요', '뭐예요', '어때요'] })],

  clothes: [gapDialog(ASK, [
    ['점원', '사이즈 어떠세요?'],
    ['다냐', '조금 작아요. 한 사이즈 ____ 있어요?'],
  ], '큰 거', { distractors: ['작은 거', '같은 거', '싼 거'] })],

  health: [gapDialog(ASK, [
    ['약사', '어디가 불편하세요?'],
    ['다냐', '____ 아파요.'],
  ], '배가', { distractors: ['배를', '배에', '배는'] })],

  trouble: [gapDialog(ASK, [
    ['직원', '무슨 일이세요?'],
    ['다냐', '지갑을 ____.'],
  ], '잃어버렸어요', { distractors: ['찾았어요', '샀어요', '봤어요'] })],

  emergency: [gapDialog(ASK, [
    ['행인', '괜찮으세요?'],
    ['다냐', '____! 구급차 좀 불러 주세요.'],
  ], '도와주세요', { distractors: ['감사합니다', '괜찮아요', '실례합니다'] })],

  smalltalk: [gapDialog(ASK, [
    ['민수', '한국 음식 어때요?'],
    ['다냐', '정말 ____. 특히 김치찌개요.'],
  ], '맛있어요', { distractors: ['재미있어요', '괜찮아요', '어려워요'] })],

  places: [gapDialog(ASK, [
    ['다냐', '실례합니다, ____ 어디예요?'],
    ['직원', '2층에 있어요.'],
  ], '화장실', { distractors: ['출구', '계산대', '입구'] })],

  metro: [gapDialog(ASK, [
    ['다냐', '시청역에 가려면 ____ 해요?'],
    ['역무원', '다음 역에서 2호선으로 바꾸세요.'],
  ], '어디서 갈아타야', { distractors: ['어디서 내려야', '언제 타야', '얼마를 내야'] })],

  airport: [gapDialog(ASK, [
    ['직원', '부치실 짐 있으세요?'],
    ['다냐', '네, ____ 하나 있어요.'],
  ], '캐리어', { distractors: ['배낭', '지갑', '표'] })],

  food: [gapDialog(ASK, [
    ['다냐', '이건 무슨 ____예요?'],
    ['종업원', '돼지고기로 만든 거예요.'],
  ], '고기', { distractors: ['채소', '국물', '반찬'] })],

  money: [gapDialog(ASK, [
    ['다냐', '여기 ____ 돼요?'],
    ['점원', '네, 카드 받습니다.'],
  ], '카드', { distractors: ['현금', '동전', '영수증'] })],

  conv: [gapDialog(ASK, [
    ['점원', '봉투 필요하세요?'],
    ['다냐', '____. 가방 있어요.'],
  ], '괜찮아요', { distractors: ['주세요', '감사합니다', '얼마예요'] })],

  sim: [gapDialog(ASK, [
    ['직원', '어떤 요금제로 하시겠어요?'],
    ['다냐', '____ 많은 걸로 주세요.'],
  ], '데이터가', { distractors: ['통화가', '문자가', '돈이'] })],

  post: [gapDialog(ASK, [
    ['직원', '어떻게 보내드릴까요?'],
    ['다냐', '____으로 보내 주세요. 급해요.'],
  ], '빠른우편', { distractors: ['보통우편', '등기', '택배'] })],

  bank: [gapDialog(ASK, [
    ['직원', '무엇을 도와드릴까요?'],
    ['다냐', '____을 만들고 싶어요.'],
  ], '계좌', { distractors: ['카드', '통장', '비밀번호'] })],

  train: [gapDialog(ASK, [
    ['다냐', '부산 가는 표 한 장 주세요. ____ 자리로요.'],
    ['직원', '창가 자리 있습니다.'],
  ], '창가', { distractors: ['복도', '뒤', '앞'] })],

  sights: [gapDialog(ASK, [
    ['다냐', '____이 얼마예요?'],
    ['직원', '어른 한 명에 삼천 원이에요.'],
  ], '입장료', { distractors: ['교통비', '식사비', '숙박비'] })],

  home: [gapDialog(ASK, [
    ['중개인', '이 집 어떠세요?'],
    ['다냐', '괜찮아요. ____이 얼마예요?'],
  ], '월세', { distractors: ['보증금', '관리비', '전기세'] })],

  bills: [gapDialog(ASK, [
    ['집주인', '이번 달 고지서 나왔어요.'],
    ['다냐', '____는 따로 내나요?'],
  ], '관리비', { distractors: ['월세', '보증금', '수수료'] })],

  docs: [gapDialog(ASK, [
    ['직원', '신청서에 서명해 주세요.'],
    ['다냐', '네. ____도 필요해요?'],
  ], '여권 사본', { distractors: ['사진', '도장', '주소'] })],

  visa: [gapDialog(ASK, [
    ['직원', '체류 목적이 뭐예요?'],
    ['다냐', '____이에요. 대학교에 다녀요.'],
  ], '유학', { distractors: ['관광', '취업', '방문'] })],

  hospital: [gapDialog(ASK, [
    ['간호사', '예약하셨어요?'],
    ['다냐', '아니요, ____ 왔어요.'],
  ], '그냥', { distractors: ['예약하고', '내일', '아까'] })],

  pharmacy: [gapDialog(ASK, [
    ['약사', '처방전 있으세요?'],
    ['다냐', '없어요. ____ 약 주세요.'],
  ], '두통', { distractors: ['감기', '소화', '알레르기'] })],

  work: [gapDialog(ASK, [
    ['동료', '이거 언제까지예요?'],
    ['다냐', '____까지 끝낼게요.'],
  ], '금요일', { distractors: ['지금', '작년', '어제'] })],

  family: [gapDialog(ASK, [
    ['민수', '가족이 몇 명이에요?'],
    ['다냐', '____이에요. 부모님과 저요.'],
  ], '세 명', { distractors: ['세 개', '세 사람들', '삼 명'] })],

  react: [gapDialog(ASK, [
    ['민수', '어제 지갑을 잃어버렸어요.'],
    ['다냐', '____? 찾았어요?'],
  ], '정말요', { distractors: ['그래요', '맞아요', '알겠어요'] })],

  attitude: [gapDialog(ASK, [
    ['민수', '내일 같이 갈래요?'],
    ['다냐', '미안해요, 내일은 ____.'],
  ], '어려울 것 같아요', { distractors: ['좋아요', '괜찮아요', '그래요'] })],

  hedge: [gapDialog(ASK, [
    ['민수', '이 영화 어땠어요?'],
    ['다냐', '____ 좀 지루했어요.'],
  ], '솔직히 말하면', { distractors: ['그래서', '그런데', '왜냐하면'] })],

  border: [gapDialog(ASK, [
    ['심사관', '방문 목적이 뭐예요?'],
    ['다냐', '____이에요. 일주일 있을 거예요.'],
  ], '관광', { distractors: ['유학', '취업', '이민'] })],

  cinema: [gapDialog(ASK, [
    ['직원', '몇 시 걸로 하시겠어요?'],
    ['다냐', '____ 걸로 두 장 주세요.'],
  ], '일곱 시', { distractors: ['일곱 개', '칠 시', '일곱 번'] })],

  dentist: [gapDialog(ASK, [
    ['의사', '어디가 아프세요?'],
    ['다냐', '이 ____가 아파요.'],
  ], '어금니', { distractors: ['앞니', '잇몸', '혀'] })],

  print: [gapDialog(ASK, [
    ['직원', '몇 부 뽑아드릴까요?'],
    ['다냐', '____ 부요. 양면으로 해 주세요.'],
  ], '스무', { distractors: ['이십', '스물', '두'] })],

  office: [gapDialog(ASK, [
    ['동료', '메일 확인하셨어요?'],
    ['다냐', '네, ____ 회신드릴게요.'],
  ], '오늘 중으로', { distractors: ['어제', '지난주', '작년에'] })],
}

// ─── Английский ──────────────────────────────────────────────────────────────

export const ENSV_DIALOGS: Record<string, SeedTask[]> = {
  greet: [gapDialog(ASK, [
    ['Neighbour', 'Morning! How are you?'],
    ['Dania', '____, thanks. And you?'],
  ], "I'm good", { distractors: ['I am fine, thank you very much', 'Good morning', 'See you'] })],

  polite: [gapDialog(ASK, [
    ['Dania', 'Oh, sorry — did I step on your foot?'],
    ['Passer-by', "That's all right."],
  ], 'sorry', { distractors: ['excuse me', 'thank you', 'pardon me'] })],

  nounder: [gapDialog(ASK, [
    ['Clerk', 'Could you confirm your national insurance number?'],
    ['Dania', 'Sorry, ____ that?'],
  ], 'could you repeat', { distractors: ['could you write', 'do you know', 'can I have'] })],

  meet: [gapDialog(ASK, [
    ['Tom', "I'm Tom, I work upstairs."],
    ['Dania', "I'm Dania. ____."],
  ], 'Nice to meet you', { distractors: ['Nice to see you again', 'See you later', 'How do you do it'] })],

  yesno: [gapDialog(ASK, [
    ['Dania', 'Can I park here?'],
    ['Warden', "No, I'm afraid you ____."],
  ], "can't", { distractors: ['can', "don't", 'mustn’t to'] })],

  way: [gapDialog(ASK, [
    ['Dania', 'Excuse me, ____ the station?'],
    ['Passer-by', "It's two streets down, on the left."],
  ], 'how do I get to', { distractors: ['where do you go', 'how much is', 'when is'] })],

  taxibus: [gapDialog(ASK, [
    ['Driver', 'Where to?'],
    ['Dania', 'To this address, please. ____ how long it takes?'],
  ], 'Do you know', { distractors: ['Are you know', 'Do you knowing', 'You know'] })],

  hotel: [gapDialog(ASK, [
    ['Receptionist', 'Checking in?'],
    ['Dania', 'Yes, I have a ____ under Dania.'],
  ], 'reservation', { distractors: ['receipt', 'ticket', 'deposit'] })],

  cafe: [gapDialog(ASK, [
    ['Barista', 'For here or to go?'],
    ['Dania', '____, please.'],
  ], 'To go', { distractors: ['For here', 'To take', 'Out'] })],

  order: [gapDialog(ASK, [
    ['Waiter', 'Are you ready to order?'],
    ['Dania', 'Yes, ____ the soup, please.'],
  ], "I'll have", { distractors: ['I have', 'I take', 'I want to have it'] })],

  diet: [gapDialog(ASK, [
    ['Waiter', 'The sauce has peanuts in it.'],
    ['Dania', 'Then no, thank you — ____ nuts.'],
  ], "I'm allergic to", { distractors: ["I don't like", "I'm not eating", "I'm afraid of"] })],

  bill: [gapDialog(ASK, [
    ['Dania', 'Could we have the ____, please?'],
    ['Waiter', 'Of course. Card or cash?'],
  ], 'bill', { distractors: ['menu', 'change', 'tip'] })],

  shop: [gapDialog(ASK, [
    ['Dania', 'Excuse me, ____ this?'],
    ['Assistant', "It's twelve pounds."],
  ], 'how much is', { distractors: ['how many is', 'what price of', 'how much are'] })],

  clothes: [gapDialog(ASK, [
    ['Assistant', 'How does it fit?'],
    ['Dania', "It's a bit tight. Do you have it ____?"],
  ], 'in a larger size', { distractors: ['in a large', 'more big', 'on bigger size'] })],

  health: [gapDialog(ASK, [
    ['Pharmacist', 'What seems to be the problem?'],
    ['Dania', "I've ____ a sore throat since Monday."],
  ], 'had', { distractors: ['have', 'has', 'been'] })],

  trouble: [gapDialog(ASK, [
    ['Staff', 'How can I help?'],
    ['Dania', "I think I've ____ my wallet."],
  ], 'lost', { distractors: ['loosed', 'losed', 'missed'] })],

  emergency: [gapDialog(ASK, [
    ['Operator', 'Emergency, which service?'],
    ['Dania', '____ — there has been an accident.'],
  ], 'Ambulance', { distractors: ['Police', 'Fire', 'Doctor'] })],

  smalltalk: [gapDialog(ASK, [
    ['Tom', 'Terrible weather, isn’t it?'],
    ['Dania', 'It ____. Not what I expected in May.'],
  ], 'really is', { distractors: ['really does', 'is really it', 'really was'] })],

  places: [gapDialog(ASK, [
    ['Dania', 'Excuse me, is there a ____ nearby?'],
    ['Passer-by', 'Yes, in the shopping centre, first floor.'],
  ], 'cash machine', { distractors: ['cash', 'money machine', 'bank money'] })],

  metro: [gapDialog(ASK, [
    ['Dania', 'Do I need to ____ to get to Oxford Circus?'],
    ['Staff', 'Yes, change at Green Park.'],
  ], 'change', { distractors: ['transfer myself', 'get off', 'go out'] })],

  airport: [gapDialog(ASK, [
    ['Agent', 'Any bags to check in?'],
    ['Dania', 'Just one. The rest is ____.'],
  ], 'hand luggage', { distractors: ['hand baggage bag', 'my bags', 'carry'] })],

  food: [gapDialog(ASK, [
    ['Dania', "What's in this dish?"],
    ['Waiter', "It's chicken with rice."],
  ], "What's in", { distractors: ['What is it', 'How is', 'Which is'] })],

  money: [gapDialog(ASK, [
    ['Dania', 'Do you take ____?'],
    ['Cashier', 'Card only, sorry.'],
  ], 'cash', { distractors: ['money', 'coins', 'change'] })],

  conv: [gapDialog(ASK, [
    ['Cashier', 'Do you need a bag?'],
    ['Dania', "No, ____ — I've got one."],
  ], "I'm fine", { distractors: ['I am good enough', 'no need it', 'not necessary it'] })],

  sim: [gapDialog(ASK, [
    ['Assistant', 'Pay as you go or monthly?'],
    ['Dania', 'Pay as you go, with plenty of ____.'],
  ], 'data', { distractors: ['minutes', 'internet gigabytes', 'signal'] })],

  post: [gapDialog(ASK, [
    ['Clerk', 'First or second class?'],
    ['Dania', 'First, please — I need it to ____ by Friday.'],
  ], 'arrive', { distractors: ['come', 'reach', 'be delivering'] })],

  bank: [gapDialog(ASK, [
    ['Clerk', 'How can I help?'],
    ['Dania', "I'd like to ____ an account."],
  ], 'open', { distractors: ['make', 'do', 'start up'] })],

  train: [gapDialog(ASK, [
    ['Clerk', 'Single or return?'],
    ['Dania', '____, please. Coming back on Sunday.'],
  ], 'Return', { distractors: ['Single', 'Two ways', 'Back ticket'] })],

  sights: [gapDialog(ASK, [
    ['Dania', 'How much is ____?'],
    ['Clerk', 'Twelve pounds for adults.'],
  ], 'admission', { distractors: ['the entrance', 'the ticket in', 'the enter'] })],

  home: [gapDialog(ASK, [
    ['Agent', 'What do you think of the flat?'],
    ['Dania', 'I like it. Are ____ included?'],
  ], 'bills', { distractors: ['accounts', 'payments', 'the money'] })],

  bills: [gapDialog(ASK, [
    ['Landlord', 'The electricity bill came through.'],
    ['Dania', 'Is that on top of the ____?'],
  ], 'rent', { distractors: ['deposit', 'renting', 'flat'] })],

  docs: [gapDialog(ASK, [
    ['Clerk', 'Please sign here.'],
    ['Dania', 'Of course. Do you need ____ of address as well?'],
  ], 'proof', { distractors: ['a paper', 'confirmation', 'a document'] })],

  visa: [gapDialog(ASK, [
    ['Officer', "What's the purpose of your stay?"],
    ['Dania', "I'm here on a ____ visa."],
  ], 'student', { distractors: ['study', 'studying', 'university'] })],

  hospital: [gapDialog(ASK, [
    ['Receptionist', 'Do you have an appointment?'],
    ['Dania', 'No, ____ walk in?'],
  ], 'can I', { distractors: ['may I to', 'do I can', 'can I to'] })],

  pharmacy: [gapDialog(ASK, [
    ['Pharmacist', 'Do you have a prescription?'],
    ['Dania', 'No. Something ____ a headache, please.'],
  ], 'for', { distractors: ['from', 'against', 'of'] })],

  work: [gapDialog(ASK, [
    ['Colleague', "When can you get me the file?"],
    ['Dania', "I'll ____ it over by Friday."],
  ], 'send', { distractors: ['give', 'put', 'bring'] })],

  family: [gapDialog(ASK, [
    ['Tom', 'Do you have any brothers or sisters?'],
    ['Dania', 'One ____ sister. She lives in Moscow.'],
  ], 'older', { distractors: ['elder than me', 'big', 'more old'] })],

  react: [gapDialog(ASK, [
    ['Tom', 'They cancelled the flight an hour before boarding.'],
    ['Dania', '____! What did you do?'],
  ], 'You’re kidding', { distractors: ['I know it', 'Of course', 'Never mind'] })],

  attitude: [gapDialog(ASK, [
    ['Tom', 'Fancy coming along tomorrow?'],
    ['Dania', "____, but I've already got plans."],
  ], "I'd love to", { distractors: ['I want it', 'I like', 'It is good'] })],

  hedge: [gapDialog(ASK, [
    ['Tom', 'What did you think of the film?'],
    ['Dania', '____, I found it a bit slow.'],
  ], 'To be honest', { distractors: ['By the way', 'In fact of', 'For example'] })],

  border: [gapDialog(ASK, [
    ['Officer', 'How long are you staying?'],
    ['Dania', '____ two weeks.'],
  ], 'For', { distractors: ['During', 'On', 'Since'] })],

  cinema: [gapDialog(ASK, [
    ['Clerk', 'Which screening?'],
    ['Dania', 'The ____ one, two tickets please.'],
  ], 'seven o’clock', { distractors: ['seven hours', 'seventh hour', 'seven times'] })],

  dentist: [gapDialog(ASK, [
    ['Dentist', 'Where does it hurt?'],
    ['Dania', 'This ____ at the back.'],
  ], 'tooth', { distractors: ['teeth', 'gum', 'jaw'] })],

  print: [gapDialog(ASK, [
    ['Assistant', 'How many copies?'],
    ['Dania', 'Twenty, ____ please.'],
  ], 'double-sided', { distractors: ['two sides', 'both page', 'twice printed'] })],

  office: [gapDialog(ASK, [
    ['Colleague', 'Did you see my email?'],
    ['Dania', 'I did — I’ll ____ by end of day.'],
  ], 'get back to you', { distractors: ['answer you back', 'return you', 'reply you'] })],
}

// ─── Японский ────────────────────────────────────────────────────────────────

export const JASV_DIALOGS: Record<string, SeedTask[]> = {
  greet: [gapDialog(ASK, [
    ['てんいん', 'ありがとうございました。'],
    ['ダーニャ', '____。'],
  ], 'どうも', { distractors: ['おはようございます', 'はじめまして', 'すみません'] })],

  // すみません извиняется и зовёт, ありがとう благодарит — путают постоянно.
  polite: [gapDialog(ASK, [
    ['ダーニャ', '____、みちを おしえて ください。'],
    ['つうこうにん', 'はい、どちらまで。'],
  ], 'すみません', { distractors: ['ありがとう', 'ごめんね', 'どういたしまして'] })],

  nounder: [gapDialog(ASK, [
    ['えきいん', 'このきっぷは とっきゅうけんが べつに ひつようです。'],
    ['ダーニャ', 'すみません、もう いちど ____。'],
  ], 'おねがいします', { distractors: ['わかりました', 'けっこうです', 'そうですね'] })],

  meet: [gapDialog(ASK, [
    ['たなか', 'たなかです。よろしく おねがいします。'],
    ['ダーニャ', 'ダーニャです。____ おねがいします。'],
  ], 'こちらこそ', { distractors: ['どうも', 'すみません', 'それでは'] })],

  yesno: [gapDialog(ASK, [
    ['ダーニャ', 'ここで しゃしんを とっても いいですか。'],
    ['スタッフ', 'いいえ、ここは ____。'],
  ], 'だめです', { distractors: ['いいです', 'どうぞ', 'けっこうです'] })],

  way: [gapDialog(ASK, [
    ['ダーニャ', 'すみません、えきは ____ですか。'],
    ['つうこうにん', 'つぎの かどを ひだりです。'],
  ], 'どこ', { distractors: ['いくら', 'なに', 'いつ'] })],

  taxibus: [gapDialog(ASK, [
    ['うんてんしゅ', 'どちらまで。'],
    ['ダーニャ', 'この じゅうしょまで ____。'],
  ], 'おねがいします', { distractors: ['いきます', 'ください', 'です'] })],

  hotel: [gapDialog(ASK, [
    ['フロント', 'チェックインですか。'],
    ['ダーニャ', 'はい、____ して います。ダーニャです。'],
  ], 'よやく', { distractors: ['りょうしゅうしょ', 'かぎ', 'にもつ'] })],

  cafe: [gapDialog(ASK, [
    ['てんいん', 'てんないで おめしあがりですか。'],
    ['ダーニャ', 'いいえ、____。'],
  ], 'もちかえりで', { distractors: ['てんないで', 'ここで', 'あとで'] })],

  order: [gapDialog(ASK, [
    ['てんいん', 'ごちゅうもんは。'],
    ['ダーニャ', 'これを ひとつ ____。'],
  ], 'ください', { distractors: ['です', 'あります', 'たべます'] })],

  diet: [gapDialog(ASK, [
    ['てんいん', 'たまごが はいって います。'],
    ['ダーニャ', 'では やめます。たまごの ____が あります。'],
  ], 'アレルギー', { distractors: ['すきなもの', 'りょうり', 'メニュー'] })],

  bill: [gapDialog(ASK, [
    ['ダーニャ', '____ おねがいします。'],
    ['てんいん', 'はい、カードで よろしいですか。'],
  ], 'おかいけい', { distractors: ['メニュー', 'おみず', 'ちゅうもん'] })],

  shop: [gapDialog(ASK, [
    ['ダーニャ', 'これは ____ですか。'],
    ['てんいん', 'せんごひゃくえんです。'],
  ], 'いくら', { distractors: ['どこ', 'なん', 'いつ'] })],

  clothes: [gapDialog(ASK, [
    ['てんいん', 'サイズは いかがですか。'],
    ['ダーニャ', 'すこし ちいさいです。もう ____ ありますか。'],
  ], 'ひとつ おおきいのは', { distractors: ['ひとつ ちいさいのは', 'おなじのは', 'やすいのは'] })],

  health: [gapDialog(ASK, [
    ['やくざいし', 'どう されましたか。'],
    ['ダーニャ', 'きのうから ____が いたいです。'],
  ], 'おなか', { distractors: ['あたま', 'のど', 'あし'] })],

  trouble: [gapDialog(ASK, [
    ['えきいん', 'どうしましたか。'],
    ['ダーニャ', 'さいふを ____。'],
  ], 'なくしました', { distractors: ['みつけました', 'かいました', 'わすれません'] })],

  emergency: [gapDialog(ASK, [
    ['つうこうにん', 'だいじょうぶですか。'],
    ['ダーニャ', '____! きゅうきゅうしゃを よんで ください。'],
  ], 'たすけて', { distractors: ['ありがとう', 'すみません', 'だいじょうぶ'] })],

  smalltalk: [gapDialog(ASK, [
    ['たなか', 'にほんの たべもの、どうですか。'],
    ['ダーニャ', 'とても ____。とくに ラーメンが すきです。'],
  ], 'おいしいです', { distractors: ['たのしいです', 'むずかしいです', 'いいです'] })],

  places: [gapDialog(ASK, [
    ['ダーニャ', 'すみません、____は どこですか。'],
    ['てんいん', '２かいに あります。'],
  ], 'トイレ', { distractors: ['でぐち', 'レジ', 'いりぐち'] })],

  metro: [gapDialog(ASK, [
    ['ダーニャ', 'しんじゅくまで、どこで ____ですか。'],
    ['えきいん', 'つぎの えきで のりかえてください。'],
  ], 'のりかえ', { distractors: ['おりる', 'のる', 'まつ'] })],

  airport: [gapDialog(ASK, [
    ['スタッフ', 'おあずけの にもつは。'],
    ['ダーニャ', 'ひとつ あります。あとは ____です。'],
  ], 'てにもつ', { distractors: ['おおきいにもつ', 'かばんの', 'にもつじゃない'] })],

  food: [gapDialog(ASK, [
    ['ダーニャ', 'これは なにが ____か。'],
    ['てんいん', 'ぶたにくが はいって います。'],
  ], 'はいって います', { distractors: ['あります', 'たべます', 'します'] })],

  money: [gapDialog(ASK, [
    ['ダーニャ', 'カードは ____か。'],
    ['てんいん', 'すみません、げんきんのみです。'],
  ], 'つかえます', { distractors: ['あります', 'します', 'いります'] })],

  conv: [gapDialog(ASK, [
    ['てんいん', 'ふくろは ごりようですか。'],
    ['ダーニャ', '____。かばんが あります。'],
  ], 'けっこうです', { distractors: ['おねがいします', 'ください', 'そうです'] })],

  sim: [gapDialog(ASK, [
    ['てんいん', 'どの プランに しますか。'],
    ['ダーニャ', '____が おおい プランで おねがいします。'],
  ], 'データ', { distractors: ['でんわ', 'メール', 'おかね'] })],

  post: [gapDialog(ASK, [
    ['きょくいん', 'どちらで おくりますか。'],
    ['ダーニャ', '____で おねがいします。いそいで います。'],
  ], 'そくたつ', { distractors: ['ふつう', 'ふなびん', 'てがみ'] })],

  bank: [gapDialog(ASK, [
    ['ぎんこういん', 'ごようけんは。'],
    ['ダーニャ', '____を つくりたいです。'],
  ], 'こうざ', { distractors: ['カード', 'つうちょう', 'おかね'] })],

  train: [gapDialog(ASK, [
    ['えきいん', 'していせきに しますか。'],
    ['ダーニャ', 'はい、____がわの せきで おねがいします。'],
  ], 'まど', { distractors: ['つうろ', 'まえ', 'うしろ'] })],

  sights: [gapDialog(ASK, [
    ['ダーニャ', '____は いくらですか。'],
    ['スタッフ', 'おとな ひとり さんびゃくえんです。'],
  ], 'にゅうじょうりょう', { distractors: ['きっぷ', 'りょこう', 'しゃしん'] })],

  home: [gapDialog(ASK, [
    ['ふどうさん', 'この へやは いかがですか。'],
    ['ダーニャ', 'いいですね。____は いくらですか。'],
  ], 'やちん', { distractors: ['しききん', 'こうねつひ', 'れいきん'] })],

  bills: [gapDialog(ASK, [
    ['おおや', 'こんげつの せいきゅうしょです。'],
    ['ダーニャ', '____は べつですか。'],
  ], 'すいどうだい', { distractors: ['やちん', 'しききん', 'てすうりょう'] })],

  docs: [gapDialog(ASK, [
    ['かかりいん', 'ここに サインを おねがいします。'],
    ['ダーニャ', 'はい。____の コピーも いりますか。'],
  ], 'パスポート', { distractors: ['しゃしん', 'はんこ', 'じゅうしょ'] })],

  visa: [gapDialog(ASK, [
    ['かかりいん', 'たいざいの もくてきは。'],
    ['ダーニャ', '____です。だいがくに かよって います。'],
  ], 'りゅうがく', { distractors: ['かんこう', 'しごと', 'ほうもん'] })],

  hospital: [gapDialog(ASK, [
    ['うけつけ', 'よやくは おありですか。'],
    ['ダーニャ', 'いいえ、____です。'],
  ], 'はじめて', { distractors: ['よやく', 'あした', 'さっき'] })],

  pharmacy: [gapDialog(ASK, [
    ['やくざいし', 'しょほうせんは ありますか。'],
    ['ダーニャ', 'ありません。____の くすりを ください。'],
  ], 'ずつう', { distractors: ['かぜ', 'いたみ', 'アレルギー'] })],

  work: [gapDialog(ASK, [
    ['どうりょう', 'この しりょう、いつまでですか。'],
    ['ダーニャ', '____までに おくります。'],
  ], 'きんようび', { distractors: ['いま', 'きょねん', 'きのう'] })],

  family: [gapDialog(ASK, [
    ['たなか', 'ごきょうだいは。'],
    ['ダーニャ', '____が ひとり います。'],
  ], 'あね', { distractors: ['おねえさん', 'いもうとさん', 'あにさん'] })],

  react: [gapDialog(ASK, [
    ['たなか', 'ひこうきが けっこうに なったんです。'],
    ['ダーニャ', '____! それで どうしましたか。'],
  ], 'ええっ', { distractors: ['そうですね', 'わかりました', 'どうも'] })],

  attitude: [gapDialog(ASK, [
    ['たなか', 'あした いっしょに いきませんか。'],
    ['ダーニャ', 'すみません、あしたは ____。'],
  ], 'ちょっと', { distractors: ['いいです', 'だいじょうぶ', 'そうです'] })],

  hedge: [gapDialog(ASK, [
    ['たなか', 'あの えいが、どうでしたか。'],
    ['ダーニャ', '____、すこし ながかったです。'],
  ], 'しょうじきに いうと', { distractors: ['それから', 'ところで', 'だから'] })],

  border: [gapDialog(ASK, [
    ['しんさかん', 'たいざい きかんは。'],
    ['ダーニャ', 'いっしゅうかん____です。'],
  ], 'ぐらい', { distractors: ['まで', 'から', 'ごろ'] })],

  cinema: [gapDialog(ASK, [
    ['スタッフ', 'なんじの かいですか。'],
    ['ダーニャ', '____の かいを にまい ください。'],
  ], 'しちじ', { distractors: ['ななじ', 'しちかい', 'ななつ'] })],

  dentist: [gapDialog(ASK, [
    ['はいしゃ', 'どこが いたいですか。'],
    ['ダーニャ', 'おくの ____が いたいです。'],
  ], 'は', { distractors: ['はな', 'みみ', 'した'] })],

  print: [gapDialog(ASK, [
    ['スタッフ', 'なんぶ いんさつしますか。'],
    ['ダーニャ', 'にじゅうぶ、____で おねがいします。'],
  ], 'りょうめん', { distractors: ['かためん', 'カラー', 'おおきく'] })],

  office: [gapDialog(ASK, [
    ['どうりょう', 'メール ごらんに なりましたか。'],
    ['ダーニャ', 'はい、____ おへんじします。'],
  ], 'ほんじつちゅうに', { distractors: ['きのう', 'せんしゅう', 'きょねん'] })],
}

// ─── Португальский ───────────────────────────────────────────────────────────

export const PTSV_DIALOGS: Record<string, SeedTask[]> = {
  greet: [gapDialog(ASK, [
    ['Vizinha', 'Bom dia! Tudo bem?'],
    ['Dânia', 'Tudo bem, e ____?'],
  ], 'você', { distractors: ['eu', 'ele', 'nós'] })],

  // obrigado согласуется с говорящим, а не с собеседником.
  polite: [gapDialog(ASK, [
    ['Atendente', 'Aqui está o seu troco.'],
    ['Dânia', '____!'],
  ], 'Obrigada', { distractors: ['Obrigado', 'De nada', 'Por favor'] })],

  nounder: [gapDialog(ASK, [
    ['Funcionário', 'O senhor precisa do comprovante de residência.'],
    ['Dânia', 'Desculpe, ____ mais devagar?'],
  ], 'pode repetir', { distractors: ['pode escrever', 'você sabe', 'quanto custa'] })],

  meet: [gapDialog(ASK, [
    ['Bruno', 'Eu sou o Bruno.'],
    ['Dânia', 'Eu sou a Dânia. ____!'],
  ], 'Prazer', { distractors: ['Tchau', 'Desculpa', 'De nada'] })],

  yesno: [gapDialog(ASK, [
    ['Dânia', 'Posso estacionar aqui?'],
    ['Guarda', 'Não, aqui não ____.'],
  ], 'pode', { distractors: ['podia', 'poderia', 'puder'] })],

  way: [gapDialog(ASK, [
    ['Dânia', 'Com licença, ____ fica a estação?'],
    ['Senhora', 'Duas ruas para a frente, à esquerda.'],
  ], 'onde', { distractors: ['quanto', 'quando', 'como'] })],

  taxibus: [gapDialog(ASK, [
    ['Motorista', 'Para onde?'],
    ['Dânia', 'Para este endereço, ____.'],
  ], 'por favor', { distractors: ['obrigada', 'com licença', 'de nada'] })],

  hotel: [gapDialog(ASK, [
    ['Recepcionista', 'Bom dia, em que posso ajudar?'],
    ['Dânia', 'Tenho uma ____ no nome de Dânia.'],
  ], 'reserva', { distractors: ['conta', 'chave', 'nota'] })],

  cafe: [gapDialog(ASK, [
    ['Atendente', 'Para viagem ou para comer aqui?'],
    ['Dânia', '____, por favor.'],
  ], 'Para viagem', { distractors: ['Para comer aqui', 'Para levar aqui', 'Na mesa'] })],

  order: [gapDialog(ASK, [
    ['Garçom', 'Já escolheu?'],
    ['Dânia', 'Já. Eu ____ querer o prato do dia.'],
  ], 'vou', { distractors: ['quero', 'queria', 'vai'] })],

  diet: [gapDialog(ASK, [
    ['Garçom', 'Esse prato leva camarão.'],
    ['Dânia', 'Então não, ____ frutos do mar.'],
  ], 'tenho alergia a', { distractors: ['não gosto de', 'não como', 'tenho medo de'] })],

  bill: [gapDialog(ASK, [
    ['Dânia', '____, por favor.'],
    ['Garçom', 'Claro. Cartão ou dinheiro?'],
  ], 'A conta', { distractors: ['O cardápio', 'O troco', 'A gorjeta'] })],

  shop: [gapDialog(ASK, [
    ['Dânia', '____ custa esta camisa?'],
    ['Vendedor', 'Sessenta reais.'],
  ], 'Quanto', { distractors: ['Quantos', 'Qual', 'Como'] })],

  clothes: [gapDialog(ASK, [
    ['Vendedor', 'Serviu?'],
    ['Dânia', 'Ficou apertado. Tem um número ____?'],
  ], 'maior', { distractors: ['menor', 'igual', 'barato'] })],

  health: [gapDialog(ASK, [
    ['Farmacêutico', 'O que você está sentindo?'],
    ['Dânia', 'Estou com dor ____ garganta.'],
  ], 'de', { distractors: ['na', 'para', 'com'] })],

  trouble: [gapDialog(ASK, [
    ['Funcionário', 'Pois não?'],
    ['Dânia', 'Acho que ____ a minha carteira.'],
  ], 'perdi', { distractors: ['achei', 'comprei', 'paguei'] })],

  emergency: [gapDialog(ASK, [
    ['Passante', 'Você está bem?'],
    ['Dânia', '____! Chame uma ambulância.'],
  ], 'Socorro', { distractors: ['Desculpe', 'Obrigada', 'Com licença'] })],

  smalltalk: [gapDialog(ASK, [
    ['Bruno', 'E a comida daqui?'],
    ['Dânia', 'Muito ____! Principalmente o feijão.'],
  ], 'boa', { distractors: ['bom', 'bem', 'boas'] })],

  places: [gapDialog(ASK, [
    ['Dânia', 'Com licença, tem um ____ por aqui?'],
    ['Senhor', 'Tem sim, no shopping ali na esquina.'],
  ], 'caixa eletrônico', { distractors: ['dinheiro', 'banco de caixa', 'cartão'] })],

  metro: [gapDialog(ASK, [
    ['Dânia', 'Preciso ____ para chegar à Sé?'],
    ['Funcionário', 'Precisa sim, na próxima estação.'],
  ], 'trocar de linha', { distractors: ['descer', 'entrar', 'pagar'] })],

  airport: [gapDialog(ASK, [
    ['Atendente', 'Vai despachar bagagem?'],
    ['Dânia', 'Só uma mala. O resto é ____.'],
  ], 'bagagem de mão', { distractors: ['mala grande', 'bolsa despachada', 'mão bagagem'] })],

  food: [gapDialog(ASK, [
    ['Dânia', 'O que ____ neste prato?'],
    ['Garçom', 'Leva carne de porco e feijão.'],
  ], 'leva', { distractors: ['tem que', 'faz', 'é'] })],

  money: [gapDialog(ASK, [
    ['Dânia', 'Vocês aceitam ____?'],
    ['Caixa', 'Só cartão, infelizmente.'],
  ], 'dinheiro', { distractors: ['troco', 'moeda', 'nota'] })],

  conv: [gapDialog(ASK, [
    ['Caixa', 'Precisa de sacola?'],
    ['Dânia', 'Não, ____. Já tenho uma.'],
  ], 'obrigada', { distractors: ['por favor', 'com licença', 'de nada'] })],

  sim: [gapDialog(ASK, [
    ['Atendente', 'Plano ou pré-pago?'],
    ['Dânia', 'Pré-pago, com bastante ____.'],
  ], 'internet', { distractors: ['minutos', 'sinal', 'ligação'] })],

  post: [gapDialog(ASK, [
    ['Funcionário', 'Como quer enviar?'],
    ['Dânia', 'Pelo ____, é urgente.'],
  ], 'Sedex', { distractors: ['normal', 'correio comum', 'navio'] })],

  bank: [gapDialog(ASK, [
    ['Gerente', 'Em que posso ajudar?'],
    ['Dânia', 'Queria ____ uma conta.'],
  ], 'abrir', { distractors: ['fazer', 'começar', 'pegar'] })],

  train: [gapDialog(ASK, [
    ['Bilheteria', 'Ida ou ida e volta?'],
    ['Dânia', '____, volto no domingo.'],
  ], 'Ida e volta', { distractors: ['Só ida', 'Duas idas', 'Volta só'] })],

  sights: [gapDialog(ASK, [
    ['Dânia', 'Quanto é a ____?'],
    ['Bilheteria', 'Vinte reais por pessoa.'],
  ], 'entrada', { distractors: ['saída', 'entrar', 'passagem'] })],

  home: [gapDialog(ASK, [
    ['Corretor', 'O que achou do apartamento?'],
    ['Dânia', 'Gostei. O ____ está incluso?'],
  ], 'condomínio', { distractors: ['aluguel', 'depósito', 'imóvel'] })],

  bills: [gapDialog(ASK, [
    ['Proprietário', 'Chegou a conta de luz.'],
    ['Dânia', 'Isso é além do ____?'],
  ], 'aluguel', { distractors: ['condomínio', 'depósito', 'contrato'] })],

  docs: [gapDialog(ASK, [
    ['Funcionário', 'Assine aqui, por favor.'],
    ['Dânia', 'Claro. Precisa de ____ de residência também?'],
  ], 'comprovante', { distractors: ['papel', 'documento', 'prova'] })],

  visa: [gapDialog(ASK, [
    ['Agente', 'Qual o motivo da sua estadia?'],
    ['Dânia', 'Estou com visto de ____.'],
  ], 'estudante', { distractors: ['estudar', 'estudo', 'universidade'] })],

  hospital: [gapDialog(ASK, [
    ['Recepção', 'Tem consulta marcada?'],
    ['Dânia', 'Não, posso ser ____ mesmo assim?'],
  ], 'atendida', { distractors: ['atendido', 'atender', 'atendendo'] })],

  pharmacy: [gapDialog(ASK, [
    ['Farmacêutico', 'Tem receita?'],
    ['Dânia', 'Não. Queria algo ____ dor de cabeça.'],
  ], 'para', { distractors: ['de', 'com', 'por'] })],

  work: [gapDialog(ASK, [
    ['Colega', 'Quando você me manda o arquivo?'],
    ['Dânia', 'Te ____ até sexta.'],
  ], 'envio', { distractors: ['enviar', 'enviei', 'enviando'] })],

  family: [gapDialog(ASK, [
    ['Bruno', 'Você tem irmãos?'],
    ['Dânia', 'Tenho uma irmã mais ____.'],
  ], 'velha', { distractors: ['velho', 'grande', 'maior'] })],

  react: [gapDialog(ASK, [
    ['Bruno', 'Cancelaram o voo uma hora antes.'],
    ['Dânia', '____! E aí, o que você fez?'],
  ], 'Sério', { distractors: ['Tá bom', 'Claro', 'Pois é'] })],

  attitude: [gapDialog(ASK, [
    ['Bruno', 'Vamos junto amanhã?'],
    ['Dânia', '____, mas já tenho compromisso.'],
  ], 'Adoraria', { distractors: ['Quero', 'Gosto', 'Está bom'] })],

  hedge: [gapDialog(ASK, [
    ['Bruno', 'O que achou do filme?'],
    ['Dânia', '____, achei meio lento.'],
  ], 'Pra ser sincera', { distractors: ['Por exemplo', 'Aliás disso', 'Então'] })],

  border: [gapDialog(ASK, [
    ['Agente', 'Quanto tempo vai ficar?'],
    ['Dânia', '____ duas semanas.'],
  ], 'Por', { distractors: ['Desde', 'Em', 'Há'] })],

  cinema: [gapDialog(ASK, [
    ['Bilheteria', 'Qual sessão?'],
    ['Dânia', 'A das ____, duas entradas.'],
  ], 'sete', { distractors: ['sétima', 'sete horas de', 'sete vezes'] })],

  dentist: [gapDialog(ASK, [
    ['Dentista', 'Onde está doendo?'],
    ['Dânia', 'Este ____ lá atrás.'],
  ], 'dente', { distractors: ['dentes', 'gengiva', 'queixo'] })],

  print: [gapDialog(ASK, [
    ['Atendente', 'Quantas cópias?'],
    ['Dânia', 'Vinte, ____ por favor.'],
  ], 'frente e verso', { distractors: ['dois lados', 'duas folhas', 'em dobro'] })],

  office: [gapDialog(ASK, [
    ['Colega', 'Viu meu e-mail?'],
    ['Dânia', 'Vi. ____ ainda hoje.'],
  ], 'Respondo', { distractors: ['Respondi', 'Respondendo', 'Responder'] })],
}

// ─── Немецкий ────────────────────────────────────────────────────────────────

export const DESV_DIALOGS: Record<string, SeedTask[]> = {
  greet: [gapDialog(ASK, [
    ['Nachbarin', 'Guten Morgen!'],
    ['Dania', '____! Wie geht es Ihnen?'],
  ], 'Guten Morgen', { distractors: ['Gute Nacht', 'Guten Abend', 'Auf Wiedersehen'] })],

  // Entschuldigung открывает обращение, Es tut mir leid признаёт вину.
  polite: [gapDialog(ASK, [
    ['Dania', '____, wo ist der Ausgang?'],
    ['Passant', 'Gleich dort rechts.'],
  ], 'Entschuldigung', { distractors: ['Es tut mir leid', 'Danke schön', 'Bitte schön'] })],

  nounder: [gapDialog(ASK, [
    ['Beamter', 'Sie brauchen die Meldebescheinigung.'],
    ['Dania', 'Entschuldigung, ____ das bitte wiederholen?'],
  ], 'können Sie', { distractors: ['kannst du', 'können wir', 'könnt ihr'] })],

  meet: [gapDialog(ASK, [
    ['Max', 'Ich bin Max.'],
    ['Dania', 'Dania. ____!'],
  ], 'Freut mich', { distractors: ['Bitte sehr', 'Tschüss', 'Alles klar'] })],

  yesno: [gapDialog(ASK, [
    ['Dania', 'Darf ich hier parken?'],
    ['Politesse', 'Nein, hier ____ Sie nicht parken.'],
  ], 'dürfen', { distractors: ['können', 'müssen', 'wollen'] })],

  way: [gapDialog(ASK, [
    ['Dania', 'Entschuldigung, ____ komme ich zum Bahnhof?'],
    ['Passant', 'Immer geradeaus, dann links.'],
  ], 'wie', { distractors: ['wo', 'wann', 'was'] })],

  taxibus: [gapDialog(ASK, [
    ['Fahrer', 'Wohin soll es gehen?'],
    ['Dania', '____ dieser Adresse, bitte.'],
  ], 'Zu', { distractors: ['Nach', 'In', 'Auf'] })],

  hotel: [gapDialog(ASK, [
    ['Rezeption', 'Haben Sie reserviert?'],
    ['Dania', 'Ja, ich habe ein Zimmer ____.'],
  ], 'reserviert', { distractors: ['reservieren', 'reserviere', 'gereserviert'] })],

  // В кафе просят Ich hätte gern — Ich will звучит требованием.
  cafe: [gapDialog(ASK, [
    ['Barista', 'Was darf es sein?'],
    ['Dania', 'Ich ____ gern einen Kaffee zum Mitnehmen.'],
  ], 'hätte', { distractors: ['will', 'habe', 'möchte gern'] })],

  order: [gapDialog(ASK, [
    ['Kellner', 'Haben Sie schon gewählt?'],
    ['Dania', 'Ja, ich ____ die Suppe, bitte.'],
  ], 'nehme', { distractors: ['nimmt', 'nehmen', 'genommen'] })],

  diet: [gapDialog(ASK, [
    ['Kellner', 'Die Soße ist mit Nüssen.'],
    ['Dania', 'Dann nicht, ich bin ____ Nüsse allergisch.'],
  ], 'gegen', { distractors: ['auf', 'für', 'zu'] })],

  bill: [gapDialog(ASK, [
    ['Dania', '____, bitte!'],
    ['Kellner', 'Zusammen oder getrennt?'],
  ], 'Zahlen', { distractors: ['Bezahlt', 'Die Karte', 'Das Trinkgeld'] })],

  shop: [gapDialog(ASK, [
    ['Dania', 'Entschuldigung, ____ kostet das?'],
    ['Verkäufer', 'Zwölf Euro.'],
  ], 'was', { distractors: ['wie viele', 'wo', 'wann'] })],

  clothes: [gapDialog(ASK, [
    ['Verkäufer', 'Passt es?'],
    ['Dania', 'Etwas eng. Haben Sie es eine Nummer ____?'],
  ], 'größer', { distractors: ['groß', 'am größten', 'kleiner'] })],

  health: [gapDialog(ASK, [
    ['Apothekerin', 'Was fehlt Ihnen?'],
    ['Dania', '____ tut der Hals weh.'],
  ], 'Mir', { distractors: ['Mich', 'Ich', 'Meine'] })],

  trouble: [gapDialog(ASK, [
    ['Mitarbeiter', 'Wie kann ich helfen?'],
    ['Dania', 'Ich ____ meinen Geldbeutel verloren.'],
  ], 'habe', { distractors: ['bin', 'hatte', 'werde'] })],

  emergency: [gapDialog(ASK, [
    ['Passant', 'Alles in Ordnung?'],
    ['Dania', '____! Rufen Sie bitte einen Krankenwagen.'],
  ], 'Hilfe', { distractors: ['Danke', 'Entschuldigung', 'Achtung'] })],

  smalltalk: [gapDialog(ASK, [
    ['Max', 'Und wie findest du das Wetter hier?'],
    ['Dania', 'Ehrlich gesagt zu kalt. Aber man ____ sich daran.'],
  ], 'gewöhnt', { distractors: ['gewohnt', 'gewöhnen', 'gewöhnte'] })],

  places: [gapDialog(ASK, [
    ['Dania', 'Entschuldigung, gibt es hier einen ____?'],
    ['Passant', 'Ja, im Einkaufszentrum gleich dort.'],
  ], 'Geldautomat', { distractors: ['Geld', 'Bankgeld', 'Automat Geld'] })],

  metro: [gapDialog(ASK, [
    ['Dania', 'Muss ich zum Hauptbahnhof ____?'],
    ['Mitarbeiter', 'Ja, an der nächsten Station.'],
  ], 'umsteigen', { distractors: ['aussteigen', 'einsteigen', 'absteigen'] })],

  airport: [gapDialog(ASK, [
    ['Mitarbeiterin', 'Möchten Sie Gepäck aufgeben?'],
    ['Dania', 'Einen Koffer. Der Rest ist ____.'],
  ], 'Handgepäck', { distractors: ['Handtasche', 'Gepäck der Hand', 'Koffergepäck'] })],

  food: [gapDialog(ASK, [
    ['Dania', 'Was ist in dem Gericht ____?'],
    ['Kellner', 'Schweinefleisch und Kartoffeln.'],
  ], 'drin', { distractors: ['darauf', 'dabei', 'daran'] })],

  money: [gapDialog(ASK, [
    ['Dania', 'Kann ich ____ zahlen?'],
    ['Kassiererin', 'Nur bar, leider.'],
  ], 'mit Karte', { distractors: ['Karte', 'auf Karte', 'in Karte'] })],

  conv: [gapDialog(ASK, [
    ['Kassiererin', 'Brauchen Sie eine Tüte?'],
    ['Dania', 'Nein, ____. Ich habe eine dabei.'],
  ], 'danke', { distractors: ['bitte', 'gern', 'sicher'] })],

  sim: [gapDialog(ASK, [
    ['Mitarbeiter', 'Vertrag oder Prepaid?'],
    ['Dania', 'Prepaid, mit viel ____.'],
  ], 'Datenvolumen', { distractors: ['Minuten', 'Netz', 'Guthaben'] })],

  post: [gapDialog(ASK, [
    ['Mitarbeiterin', 'Wie soll es verschickt werden?'],
    ['Dania', 'Als ____, bitte. Es ist dringend.'],
  ], 'Express', { distractors: ['Standard', 'Brief', 'Päckchen'] })],

  bank: [gapDialog(ASK, [
    ['Berater', 'Was kann ich für Sie tun?'],
    ['Dania', 'Ich möchte ein Konto ____.'],
  ], 'eröffnen', { distractors: ['öffnen', 'aufmachen', 'anfangen'] })],

  train: [gapDialog(ASK, [
    ['Schalter', 'Einfach oder hin und zurück?'],
    ['Dania', '____, ich komme Sonntag wieder.'],
  ], 'Hin und zurück', { distractors: ['Einfach', 'Zwei Wege', 'Zurückfahrt'] })],

  sights: [gapDialog(ASK, [
    ['Dania', 'Was kostet der ____?'],
    ['Kasse', 'Zwölf Euro für Erwachsene.'],
  ], 'Eintritt', { distractors: ['Ausgang', 'Eingang', 'Zutritt'] })],

  home: [gapDialog(ASK, [
    ['Makler', 'Wie gefällt Ihnen die Wohnung?'],
    ['Dania', 'Gut. Ist die ____ inklusive?'],
  ], 'Nebenkosten', { distractors: ['Miete', 'Kaution', 'Wohnung'] })],

  bills: [gapDialog(ASK, [
    ['Vermieter', 'Die Stromrechnung ist gekommen.'],
    ['Dania', 'Kommt das zur ____ dazu?'],
  ], 'Kaltmiete', { distractors: ['Kaution', 'Wohnung', 'Rechnung'] })],

  docs: [gapDialog(ASK, [
    ['Beamter', 'Bitte hier unterschreiben.'],
    ['Dania', 'Gern. Brauchen Sie auch eine ____?'],
  ], 'Meldebescheinigung', { distractors: ['Rechnung', 'Quittung', 'Bescheinigung Geld'] })],

  visa: [gapDialog(ASK, [
    ['Beamtin', 'Was ist der Zweck Ihres Aufenthalts?'],
    ['Dania', 'Ich habe ein ____ zum Studium.'],
  ], 'Visum', { distractors: ['Pass', 'Ticket', 'Formular'] })],

  hospital: [gapDialog(ASK, [
    ['Empfang', 'Haben Sie einen Termin?'],
    ['Dania', 'Nein, ____ ich trotzdem drankommen?'],
  ], 'kann', { distractors: ['darf zu', 'muss', 'werde'] })],

  pharmacy: [gapDialog(ASK, [
    ['Apothekerin', 'Haben Sie ein Rezept?'],
    ['Dania', 'Nein. Etwas ____ Kopfschmerzen, bitte.'],
  ], 'gegen', { distractors: ['für', 'von', 'zu'] })],

  work: [gapDialog(ASK, [
    ['Kollege', 'Wann bekomme ich die Datei?'],
    ['Dania', 'Ich ____ sie dir bis Freitag.'],
  ], 'schicke', { distractors: ['schickt', 'geschickt', 'schicken'] })],

  family: [gapDialog(ASK, [
    ['Max', 'Hast du Geschwister?'],
    ['Dania', 'Ja, eine ____ Schwester.'],
  ], 'ältere', { distractors: ['alte', 'älter', 'am ältesten'] })],

  react: [gapDialog(ASK, [
    ['Max', 'Sie haben den Flug eine Stunde vorher gestrichen.'],
    ['Dania', '____! Und was hast du gemacht?'],
  ], 'Im Ernst', { distractors: ['Na klar', 'Genau', 'Macht nichts'] })],

  attitude: [gapDialog(ASK, [
    ['Max', 'Kommst du morgen mit?'],
    ['Dania', '____, aber ich habe schon etwas vor.'],
  ], 'Sehr gern', { distractors: ['Ich will', 'Es ist gut', 'Ich mag'] })],

  hedge: [gapDialog(ASK, [
    ['Max', 'Wie fandest du den Film?'],
    ['Dania', '____ fand ich ihn etwas langatmig.'],
  ], 'Ehrlich gesagt', { distractors: ['Zum Beispiel', 'Übrigens', 'Deshalb'] })],

  border: [gapDialog(ASK, [
    ['Beamter', 'Wie lange bleiben Sie?'],
    ['Dania', '____ zwei Wochen.'],
  ], 'Für', { distractors: ['Seit', 'Ab', 'In'] })],

  cinema: [gapDialog(ASK, [
    ['Kasse', 'Welche Vorstellung?'],
    ['Dania', 'Die um ____, zwei Karten bitte.'],
  ], 'sieben', { distractors: ['siebte', 'sieben Uhren', 'siebenmal'] })],

  dentist: [gapDialog(ASK, [
    ['Zahnarzt', 'Wo tut es weh?'],
    ['Dania', 'Dieser ____ hinten.'],
  ], 'Zahn', { distractors: ['Zähne', 'Kiefer', 'Mund'] })],

  print: [gapDialog(ASK, [
    ['Mitarbeiter', 'Wie viele Kopien?'],
    ['Dania', 'Zwanzig, ____ bitte.'],
  ], 'beidseitig', { distractors: ['zwei Seiten', 'doppelt Seite', 'zweimal'] })],

  office: [gapDialog(ASK, [
    ['Kollegin', 'Hast du meine Mail gesehen?'],
    ['Dania', 'Ja, ich ____ mich heute noch.'],
  ], 'melde', { distractors: ['meldet', 'gemeldet', 'melden'] })],
}
