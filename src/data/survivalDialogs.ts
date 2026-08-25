// ─────────────────────────────────────────────────────────────────────────────
// Диалоги разговорников выживания
//
// ПОЧЕМУ НЕ ВО ВСЕХ ТЕМАХ. Разговорник — это 54 темы, но диалог уместен не в
// каждой. «Числа», «Время», «Тело», «Документы» — это списки: реплику
// собеседника там пришлось бы придумывать ради формы, и получился бы не
// диалог, а карточка в костюме диалога. Здесь только те темы, которые САМИ ПО
// СЕБЕ обмен репликами: поздороваться, не понять, заказать, попросить помощь.
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
}

