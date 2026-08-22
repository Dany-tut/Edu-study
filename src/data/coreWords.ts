// ─────────────────────────────────────────────────────────────────────────────
// Ядро языка: какие слова нужны сразу, какие потом, а какие — когда придётся
//
// ЗАЧЕМ. Курс и разговорник показывают слово, но молчат о его весе. Ученик
// видит 카메라 и 물 одинаковыми карточками и честно учит обе, хотя первая ему
// понадобится через полгода, а вторая — сегодня. Хуже того, ровно так устроены
// массовые приложения: слог там подбирается по прозрачности чтения (카메라,
// 볼펜, 만두 читаются «как слышится»), и получается тренажёр декодирования
// письма, выданный за словарь. Приём рабочий, но о нём надо говорить вслух.
//
// ПОЧЕМУ НЕ КОРПУСНАЯ ЧАСТОТНОСТЬ. Готовые частотные списки считаны по газетным
// и книжным корпусам, и наверху у них стоят 사회, 정부, 대통령, 문제 — слова,
// которые начинающему не нужны вовсе, тогда как 물, 밥, 화장실 в такой список
// попадают низко. Отранжировать курс по газетному корпусу значило бы повторить
// исходную ошибку с другого конца.
//
// ЧТО ЗДЕСЬ ВМЕСТО НЕГО. Два круга, размеченные по назначению, а не по счётчику:
//   1 «ядро»     — то, без чего нельзя составить бытовую фразу. Первые месяцы.
//   2 «полезное» — предметы и действия, которые встретятся быстро, но фразу
//                  держат не они. Первый год.
//   3 «хвост»    — всё остальное: не «плохое слово», а «не сейчас».
// Слова вне списков автоматически попадают в третий круг — списки принципиально
// не полные и полными не станут.
//
// ЧЕСТНОСТЬ РАЗМЕТКИ. Это редакторское решение, а не измерение. Оно опирается на
// базовую лексику TOPIK I / JLPT N5 и на то, что реально произносится в быту, но
// спорные случаи здесь есть и будут. Поэтому пометка в интерфейсе подписана как
// ориентир, а не как оценка слова.
// ─────────────────────────────────────────────────────────────────────────────

/** 1 — ядро, 2 — полезное, 3 — хвост (всё, чего нет в списках). */
export type WordTier = 1 | 2 | 3

const TIER_LABEL: Record<WordTier, string> = {
  1: 'ядро',
  2: 'полезное',
  3: 'редкое',
}

const TIER_NOTE: Record<WordTier, string> = {
  1: 'Без этого слова не собрать бытовую фразу — учить сразу.',
  2: 'Встретится быстро, но фразу держит не оно.',
  3: 'Нужное слово, но не в первую очередь.',
}

export const tierLabel = (tier: WordTier): string => TIER_LABEL[tier]
export const tierNote = (tier: WordTier): string => TIER_NOTE[tier]

// ─── Корейский ───────────────────────────────────────────────────────────────

const KO_CORE = `
나 저 우리 너 그 이 그것 이것 저것 여기 거기 저기 누구 무엇 뭐 어디 언제 왜 어떻게 얼마
하다 있다 없다 되다 가다 오다 보다 먹다 마시다 자다 사다 팔다 주다 받다 알다 모르다
말하다 듣다 읽다 쓰다 만나다 앉다 서다 일하다 공부하다 살다 좋아하다 싫어하다
시작하다 끝나다 끝내다 기다리다 찾다 타다 내리다 열다 닫다 배우다 가르치다 놀다 쉬다
사용하다 연락하다
걷다 뛰다 웃다 울다 생각하다 필요하다 가지다 넣다 놓다 들다 나가다 들어가다
좋다 나쁘다 크다 작다 많다 적다 비싸다 싸다 덥다 춥다 뜨겁다 차갑다 맛있다 맛없다
재미있다 어렵다 쉽다 바쁘다 아프다 예쁘다 새롭다 빠르다 느리다 길다 짧다 높다 낮다
사람 집 물 밥 돈 시간 날 년 달 주 오늘 내일 어제 지금 아침 점심 저녁 밤 낮
이름 나라 한국 말 일 것 수 때 곳 앞 뒤 위 아래 안 밖 옆
학교 회사 친구 가족 어머니 아버지 엄마 아빠 형 누나 오빠 언니 동생 아들 딸 선생님 학생
책 옷 신발 가방 전화 길 역 버스 지하철 택시 차 병원 약국 은행 시장 가게 식당 카페 공원
커피 빵 고기 야채 과일 방 화장실 문 창문 몸 머리 눈 코 입 귀 손 발 배 목
불 산 바다 하늘 달 별 비 눈 바람 나무 꽃 개 고양이 쌀 소금 우유
안 못 아주 너무 조금 많이 잘 다 또 같이 먼저 빨리 천천히 다시 아직 벌써 곧
살 내 개월 시 분 번 명 마리 권 장
그리고 그런데 하지만 그래서 네 아니요 감사합니다 죄송합니다 안녕하세요
하나 둘 셋 넷 다섯 여섯 일곱 여덟 아홉 열 백 천 만
`

const KO_USEFUL = `
볼펜 연필 종이 지갑 우산 시계 안경 모자 컴퓨터 휴대폰 핸드폰 카메라 사진 편지 신문 사전
색 하얀색 검은색 빨간색 파란색 노란색 초록색 주황색 보라색 분홍색 갈색 회색
의자 책상 침대 냉장고 세탁기 부엌 거실 마당 층 계단 열쇠
음악 영화 여행 공항 비행기 기차 자전거 운동 축구 야구 수영 강 새 풀 콩 공 곰 게 마늘
만두 김치 라면 국 반찬 설탕 주스 맥주 술 담배 물고기 계란 국수 과자 사과 딸기 수박
청소하다 요리하다 운동하다 노래하다 춤추다 찍다 보내다 걸리다 다치다 죽다 태어나다
결혼하다 이사하다 준비하다 도와주다 빌리다 잃어버리다 잊다 기억하다 느끼다 믿다
원하다 바꾸다 고치다 만들다 그리다 씻다 입다 벗다 신다 자르다 던지다 잡다 밀다 당기다
운전하다 걱정하다 바라다
따뜻하다 시원하다 조용하다 시끄럽다 무겁다 가볍다 깨끗하다 더럽다 어둡다 밝다 젊다 늙다
차다 짜다 달다 쓰다 맵다 시다 볼 어깨 무릎 허리 이 팔 다리
회의 계획 약속 방학 휴가 주말 생일 선물 값 가격 표 자리 번호 주소 우체국 대사관 경찰 도서관
`

// ─── Японский ────────────────────────────────────────────────────────────────

const JA_CORE = `
私 僕 あなた 彼 彼女 これ それ あれ ここ そこ あそこ どこ 何 誰 いつ どう いくら
する ある いる 行く 来る 見る 食べる 飲む 寝る 買う 売る あげる もらう 知る わかる
話す 聞く 読む 書く 会う 座る 立つ 働く 勉強する 住む 始める 終わる 待つ 探す
乗る 降りる 開ける 閉める 習う 教える 遊ぶ 休む 歩く 走る 笑う 泣く 思う 言う 作る
大きい 小さい 多い 少ない 高い 安い 暑い 寒い 熱い 冷たい おいしい 面白い 難しい
易しい 忙しい 痛い きれい 新しい 古い 速い 遅い 好き 嫌い いい 悪い 長い 短い
人 家 水 ご飯 お金 時間 日 年 月 週 今日 明日 昨日 今 朝 昼 夜 名前 国 日本
学校 会社 友達 家族 母 父 兄 姉 弟 妹 先生 学生 本 服 靴 かばん 電話 道 駅
バス 電車 地下鉄 タクシー 車 病院 薬局 銀行 店 食堂 コーヒー お茶 パン 肉 野菜 果物
部屋 トイレ ドア 窓 体 頭 目 鼻 口 耳 手 足 お腹 場所 物 事 時
とても 少し たくさん よく また 一緒に 先に 早く ゆっくり もう まだ ちょっと
そして でも しかし だから はい いいえ ありがとう すみません こんにちは
一 二 三 四 五 六 七 八 九 十 百 千 万
`

const JA_USEFUL = `
ペン 鉛筆 紙 財布 傘 時計 眼鏡 帽子 パソコン 携帯 カメラ 写真 手紙 新聞 辞書
色 白 黒 赤 青 黄色 緑
椅子 机 ベッド 冷蔵庫 洗濯機 台所 部屋 階段 鍵
音楽 映画 旅行 空港 飛行機 自転車 運動 サッカー 野球 水泳 山 海 川 空 星 花 木 鳥
犬 猫 餃子 ラーメン 味噌汁 塩 砂糖 牛乳 ジュース ビール お酒 たばこ 魚 卵 米
掃除する 料理する 運動する 歌う 踊る 撮る 送る かかる けがする 死ぬ 生まれる
結婚する 引っ越す 準備する 手伝う 借りる なくす 忘れる 覚える 感じる 信じる
変える 直す 洗う 着る 脱ぐ 履く 切る 投げる 持つ 押す 引く
暖かい 涼しい 静か うるさい 重い 軽い きたない 暗い 明るい 若い
会議 計画 約束 休み 週末 誕生日 プレゼント 値段 席 番号 住所 郵便局 大使館 警察
`

// ─── Английский ──────────────────────────────────────────────────────────────

const EN_CORE = `
i you he she it we they me my your his her our their this that these those
be am is are was were been have has had do does did will would can could
should must may might go come get make take give see look know think say tell
want need like love live work study eat drink sleep buy sell pay open close
start stop begin end wait find help ask answer read write speak listen hear
walk run sit stand meet call send bring put keep leave stay try use
good bad big small new old long short high low easy hard hot cold warm cool
happy sad tired busy free ready sure right wrong same different next last
man woman child people friend family mother father brother sister son daughter
time day night morning evening week month year today tomorrow yesterday now
home house room door window street city country place way water food money
work job school student teacher book phone car bus train name word question
and or but so because if when where what who how why not no yes very much many
more most little few too also again always never sometimes often here there
`

const EN_USEFUL = `
pen pencil paper wallet umbrella watch glasses hat computer laptop camera photo
letter newspaper dictionary colour color white black red blue yellow green
chair desk bed fridge kitchen stairs key floor ceiling wall
music film movie travel airport plane bicycle sport football tennis swimming
mountain sea river sky star flower tree bird dog cat bread meat vegetable fruit
milk juice beer wine coffee tea sugar salt rice egg fish cheese
clean cook sing dance shoot send borrow lend lose forget remember feel believe
change fix wash wear dress cut throw catch push pull carry
quiet noisy heavy light dirty dark bright young rich poor safe dangerous
meeting plan appointment holiday weekend birthday present price seat number
address post office embassy police hospital pharmacy bank market shop restaurant
`

// ─── Португальский ───────────────────────────────────────────────────────────

const PT_CORE = `
eu você ele ela nós eles meu minha seu sua nosso este esse aquele isso aquilo
ser estar ter haver fazer ir vir ver saber conhecer poder querer dever precisar
dar pegar levar trazer falar dizer ouvir ler escrever comer beber dormir
comprar vender pagar abrir fechar começar terminar esperar procurar achar
ajudar perguntar responder andar correr sentar ficar morar trabalhar estudar
bom mau grande pequeno novo velho longo curto alto baixo fácil difícil
quente frio caro barato bonito feliz triste cansado ocupado pronto certo errado
homem mulher criança pessoa amigo família mãe pai irmão irmã filho filha
tempo dia noite manhã tarde semana mês ano hoje amanhã ontem agora
casa quarto porta janela rua cidade país lugar água comida dinheiro
trabalho escola aluno professor livro telefone carro ônibus trem nome palavra
e ou mas porque se quando onde que quem como não sim muito pouco mais menos
também já ainda sempre nunca às vezes aqui ali lá bem mal
um dois três quatro cinco seis sete oito nove dez cem mil
`

const PT_USEFUL = `
caneta lápis papel carteira guarda-chuva relógio óculos chapéu computador câmera
foto carta jornal dicionário cor branco preto vermelho azul amarelo verde
cadeira mesa cama geladeira cozinha escada chave parede chão
música filme viagem aeroporto avião bicicleta esporte futebol natação
montanha mar rio céu estrela flor árvore pássaro cachorro gato
pão carne verdura fruta leite suco cerveja vinho café chá açúcar sal arroz ovo peixe
limpar cozinhar cantar dançar enviar emprestar perder esquecer lembrar sentir
acreditar mudar consertar lavar vestir cortar jogar pegar empurrar puxar
silencioso barulhento pesado leve sujo limpo escuro claro jovem rico pobre
reunião plano encontro férias fim de semana aniversário presente preço lugar
número endereço correio embaixada polícia hospital farmácia banco mercado loja
`

// ─── Поиск ───────────────────────────────────────────────────────────────────

const words = (block: string): string[] => block.split(/\s+/).filter(Boolean)

/**
 * Ключ поиска. Регистр гасится для латиницы, для иероглифики он нейтрален;
 * пробелы внутри многословных статей («fim de semana») сохраняются.
 */
const key = (s: string) => s.trim().toLowerCase()

function build(core: string, useful: string): Map<string, WordTier> {
  const map = new Map<string, WordTier>()
  for (const w of words(useful)) map.set(key(w), 2)
  // Ядро кладётся вторым и перекрывает: слово, попавшее в оба списка по
  // недосмотру, должно считаться ядром, а не наоборот.
  for (const w of words(core)) map.set(key(w), 1)
  return map
}

const TIERS: Record<string, Map<string, WordTier>> = {
  ko: build(KO_CORE, KO_USEFUL),
  ja: build(JA_CORE, JA_USEFUL),
  en: build(EN_CORE, EN_USEFUL),
  'pt-BR': build(PT_CORE, PT_USEFUL),
}

// Португальский приходит и как 'pt', и как 'pt-BR' — список один.
TIERS.pt = TIERS['pt-BR']

/** Размечен ли язык вообще. Без разметки пометку показывать нечестно. */
export const hasTiers = (lang: string): boolean => !!TIERS[lang]

/**
 * Круг слова: 1 ядро, 2 полезное, 3 хвост.
 *
 * ПОЧЕМУ НЕ ТОЛЬКО ТОЧНОЕ СОВПАДЕНИЕ. Корейский и японский агглютинативны, и в
 * материале слово стоит в форме: 물이, 갔어요, 食べます. Резать окончания
 * морфологически мы не умеем и врать не хотим, поэтому проверяются ровно две
 * вещи — само слово и его словарная форма для корейских глаголов на -다,
 * которую сид и так пишет в словаре. Не нашлось — третий круг, и это честно:
 * пометка утверждает «это ядро», а не «это не ядро».
 */
export function wordTier(term: string, lang: string): WordTier {
  const map = TIERS[lang]
  if (!map) return 3
  const k = key(term)
  const hit = map.get(k)
  if (hit) return hit
  // Корейская форма на -요/-어요 от словарной на -다: 좋아요 → 좋다.
  if (lang === 'ko') {
    const stem = k.replace(/(아요|어요|여요|해요|습니다|ㅂ니다|요)$/, '')
    if (stem && stem !== k) {
      const asDict = map.get(`${stem}다`)
      if (asDict) return asDict
    }
  }
  return 3
}

/** Короткий ответ на «нужно ли мне это слово сейчас». */
export const isCore = (term: string, lang: string): boolean => wordTier(term, lang) === 1

/**
 * Сколько слов набора попадает в ядро — доля, а не список.
 *
 * Нужна витринам: у темы разговорника и у урока это единственная честная
 * характеристика «насколько это про сейчас». Пустой набор даёт ноль, а не
 * деление на ноль.
 */
export function corePct(terms: string[], lang: string): number {
  if (terms.length === 0) return 0
  const core = terms.filter(t => wordTier(t, lang) === 1).length
  return Math.round((core / terms.length) * 100)
}
