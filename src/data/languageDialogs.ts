// ─────────────────────────────────────────────────────────────────────────────
// Диалоги с пропуском — по одному на юнит языкового курса
//
// ЗАЧЕМ ЭТОТ ФАЙЛ. Всё остальное в языковом курсе собирается из данных юнита:
// словарь даёт карточки и лестницу, конструкция — дрилл, примеры — пропуски по
// банку. Обмена репликами в этих данных нет вовсе, и собрать его не из чего:
// диалог — не производная от словаря, а отдельный вид содержания. Поэтому он
// написан руками и лежит здесь, рядом с подборкой видео (homeworkVideos.ts) и
// по той же причине: юнит — это данные, а материал к нему живёт своей жизнью.
//
// ЧТО ДАЁТ ДИАЛОГ, ЧЕГО НЕ ДАЮТ ОСТАЛЬНЫЕ ЗАДАНИЯ
//
//   • Реплики озвучиваются РАЗНЫМИ голосами (см. dialogGap в taskTypes.ts) —
//     на слух это разговор, а не диктант одного диктора.
//   • Фраза стоит в ОТВЕТНОЙ позиции: ученик достраивает её по тому, что сказал
//     собеседник, а не по подписи «поставьте глагол в прошедшее время».
//   • Проверяется выбор формы там, где выбирать приходится по-настоящему: 반말
//     или 존댓말, 은/는 или 이/가, past или present perfect.
//
// КАК УСТРОЕН ОДИН ДИАЛОГ. Две-три реплики; пропуск «____» ровно один и стоит
// в последней или предпоследней; ответ — то, что в этом месте сказал бы
// человек, а не любая грамматически верная строка. Обманки (`distractors`)
// заданы там, где выбор формы и есть содержание урока: без них поле ввода
// проверяет орфографию, с ними — понимание.
//
// ПРАВИЛА, КОТОРЫМ ЭТИ ДИАЛОГИ ПОДЧИНЯЮТСЯ
//
//   • Только слова и конструкции ЭТОГО юнита и предыдущих (Р11: одно новое на
//     задание — здесь новое это сама конструкция, а не лексика вокруг).
//   • Ответ — целая реплика или её ключевая часть, но не одна морфема: «어요» в
//     пропуске проверяет не язык, а внимание.
//   • Регистр выдержан: если А обращается вежливо, Б отвечает вежливо. Учебный
//     диалог, где вежливость скачет, учит скакать.
// ─────────────────────────────────────────────────────────────────────────────

import { gapDialog, type SeedTask } from './languageCourse'

/** Подпись задания — одна на все диалоги: она не несёт содержания. */
const ASK = 'Послушайте разговор и вставьте недостающую реплику.'

/**
 * Корейский до TOPIK I (kotp) — по диалогу на юнит.
 *
 * Имена собеседников: 다냐 (ученик) и 민수 / 지영 (корейцы). Одни и те же люди
 * во всех юнитах — курс читается как одна история, а не как набор безымянных
 * реплик «A» и «B».
 */
export const KOTP_DIALOGS: Record<string, SeedTask[]> = {
  // Юнит 1 — хангыль. Конструкций ещё нет, проверяется чтение слова на слух.
  'kotp-00': [gapDialog(ASK, [
    ['민수', '이게 뭐예요?'],
    ['다냐', '____이에요.'],
  ], '책', { distractors: ['빵', '물', '방'] })],

  'kotp-04': [gapDialog(ASK, [
    ['민수', '한국어 공부는 어때요?'],
    ['다냐', '____! 그런데 발음이 어려워요.'],
  ], '재미있어요', { distractors: ['맛있어요', '괜찮아요', '미안해요'] })],

  'kotp-05': [gapDialog(ASK, [
    ['지영', '안녕하세요. 저는 지영이에요.'],
    ['다냐', '안녕하세요. ____.'],
    ['지영', '반갑습니다.'],
  ], '저는 다냐예요', { alt: ['저는 다냐 예요'] })],

  'kotp-06': [gapDialog(ASK, [
    ['다냐', '그거 뭐예요?'],
    ['민수', '____ 지갑이에요.'],
  ], '이거', { distractors: ['그거', '저거'] })],

  'kotp-07': [gapDialog(ASK, [
    ['지영', '지금 뭐 해요?'],
    ['다냐', '커피를 ____.'],
  ], '마셔요', { distractors: ['마시다', '먹어요', '마셔'] })],

  'kotp-08': [gapDialog(ASK, [
    ['민수', '어제 뭐 했어요?'],
    ['다냐', '친구를 ____.'],
  ], '만났어요', { distractors: ['만나요', '만날 거예요', '만났다'] })],

  'kotp-09': [gapDialog(ASK, [
    ['지영', '왜 한국어를 배워요?'],
    ['다냐', '한국에서 ____.'],
  ], '살고 싶어요', { distractors: ['살아요', '살았어요', '살고 싶어 해요'] })],

  'kotp-10': [gapDialog(ASK, [
    ['민수', '저녁에 뭐 해요?'],
    ['다냐', '____ 봐요.'],
  ], '영화를', { distractors: ['영화가', '영화는', '영화에'] })],

  'kotp-11': [gapDialog(ASK, [
    ['지영', '어디에서 공부해요?'],
    ['다냐', '____ 공부해요.'],
  ], '도서관에서', { distractors: ['도서관에', '도서관은', '도서관으로'] })],

  'kotp-12': [gapDialog(ASK, [
    ['민수', '오늘 시간 있어요?'],
    ['다냐', '미안해요, 오늘은 시간이 ____.'],
  ], '없어요', { distractors: ['있어요', '아니에요', '안 해요'] })],

  'kotp-31': [gapDialog(ASK, [
    ['지영', '이 선물, 누구 거예요?'],
    ['다냐', '____ 선물이에요.'],
  ], '부모님의', { distractors: ['부모님도', '부모님만', '부모님한테서'] })],

  'kotp-13': [gapDialog(ASK, [
    ['민수', '내일 같이 수영할까요?'],
    ['다냐', '미안해요, 저는 수영을 ____ 해요.'],
  ], '못', { distractors: ['안', '아직', '별로'] })],

  'kotp-32': [gapDialog(ASK, [
    ['지영', '지금 어디예요?'],
    ['다냐', '지하철이에요. 십 분 후에 ____.'],
  ], '도착할게요', { distractors: ['도착해요', '도착했어요', '도착하고 있어요'] })],

  'kotp-14': [gapDialog(ASK, [
    ['민수', '오늘 날씨 어때요?'],
    ['다냐', '너무 ____. 에어컨 켤까요?'],
  ], '더워요', { distractors: ['덥어요', '더우어요', '추워요'] })],

  'kotp-15': [gapDialog(ASK, [
    ['지영', '가방이 예뻐요. 그거 ____ 샀어요?'],
    ['다냐', '삼만 원에 샀어요.'],
  ], '얼마에', { distractors: ['어디에', '언제', '누구한테'] })],

  'kotp-16': [gapDialog(ASK, [
    ['민수', '한국어 수업이 언제예요?'],
    ['다냐', '____ 있어요. 주말에는 없어요.'],
  ], '화요일에', { distractors: ['화요일', '화요일은', '화요일에서'] })],

  'kotp-17': [gapDialog(ASK, [
    ['지영', '전화번호가 몇 번이에요?'],
    ['다냐', '____-오오육칠이에요.'],
  ], '공일공', { distractors: ['열하나', '하나공하나', '일십일'] })],

  'kotp-18': [gapDialog(ASK, [
    ['민수', '커피 몇 잔 드릴까요?'],
    ['다냐', '____ 주세요.'],
  ], '두 잔', { distractors: ['둘 잔', '이 잔', '두 개'] })],

  'kotp-19': [gapDialog(ASK, [
    ['지영', '지금 몇 시예요?'],
    ['다냐', '____ 삼십 분이에요.'],
  ], '세 시', { distractors: ['삼 시', '셋 시', '세 시간'] })],

  'kotp-20': [gapDialog(ASK, [
    ['다냐', '이거 얼마예요?'],
    ['점원', '만 오천 원이에요.'],
    ['다냐', '조금 비싸요. ____.'],
  ], '깎아 주세요', { distractors: ['주세요', '싸요', '카드로 할게요'] })],

  'kotp-21': [gapDialog(ASK, [
    ['다냐', '____! 비빔밥 하나 주세요.'],
    ['점원', '네, 잠깐만 기다리세요.'],
  ], '여기요', { distractors: ['안녕하세요', '감사합니다', '실례합니다'] })],

  'kotp-22': [gapDialog(ASK, [
    ['다냐', '시청까지 어떻게 가요?'],
    ['지영', '____ 가세요. 삼십 분쯤 걸려요.'],
  ], '지하철로', { distractors: ['지하철에', '지하철을', '지하철에서'] })],

  'kotp-23': [gapDialog(ASK, [
    ['민수', '주말에 뭐 할 거예요?'],
    ['다냐', '집에서 ____.'],
  ], '쉴 거예요', { distractors: ['쉬어요', '쉬었어요', '쉬고 있어요'] })],

  'kotp-34': [gapDialog(ASK, [
    ['다냐', '점심에 김밥 ____?'],
    ['지영', '좋아요, 같이 먹어요.'],
  ], '먹을까요', { distractors: ['먹어요', '먹었어요', '먹고 싶어요'] })],

  'kotp-24': [gapDialog(ASK, [
    ['민수', '운전할 수 있어요?'],
    ['다냐', '아니요, 운전은 ____.'],
  ], '할 수 없어요', { distractors: ['할 수 있어요', '안 해요', '하고 싶어요'], alt: ['못 해요'] })],

  'kotp-25': [gapDialog(ASK, [
    ['지영', '여기는 한국 집이에요. 신발은요?'],
    ['다냐', '아, 신발을 ____.'],
  ], '벗어야 해요', { distractors: ['벗으세요', '벗지 마세요', '벗었어요'] })],

  'kotp-33': [gapDialog(ASK, [
    ['다냐', '여기에서 사진 찍어도 돼요?'],
    ['직원', '아니요, 여기에서는 사진을 ____.'],
  ], '찍으면 안 돼요', { distractors: ['찍어도 돼요', '찍고 싶어요', '찍을 수 있어요'] })],

  'kotp-26': [gapDialog(ASK, [
    ['민수', '한국어 어때요?'],
    ['다냐', '발음은 어렵____ 문법은 쉬워요.'],
  ], '지만', { distractors: ['고', '어서', '으면'] })],

  'kotp-27': [gapDialog(ASK, [
    ['지영', '내일 비가 ____ 어떻게 해요?'],
    ['다냐', '그러면 집에서 영화를 봐요.'],
  ], '오면', { distractors: ['와요', '올 때', '와서'] })],

  'kotp-28': [gapDialog(ASK, [
    ['다냐', '민수 씨는 저보다 두 살 많아요. 그러면 뭐라고 불러요?'],
    ['지영', '다냐 씨는 여자니까 ____라고 불러요.'],
  ], '오빠', { distractors: ['형', '누나', '언니'] })],

  'kotp-29': [gapDialog(ASK, [
    ['다냐', '도서관은 주말에도 문을 열어요?'],
    ['직원', '아니요, 주말에는 문을 ____.'],
  ], '닫아요', { distractors: ['열어요', '빌려요', '모집해요'] })],

  'kotp-30': [gapDialog(ASK, [
    ['지영', 'TOPIK 시험 준비는 어때요?'],
    ['다냐', '____는 괜찮은데 쓰기가 어려워요.'],
  ], '읽기', { distractors: ['듣기', '말하기', '급수'] })],
}

/**
 * Корейский TOPIK II (kot2) — по диалогу на юнит.
 *
 * Уровень другой, и диалог другой: здесь пропуск почти всегда на ВЫБОРЕ
 * ОТТЕНКА, а не формы. 때문에 или 덕분에, ~네요 или ~잖아요, ~더라고요 или
 * ~는 것 같다 — всё это грамматически верно в одном и том же месте, и
 * различает их только то, что происходит между говорящими. Такой выбор
 * проверяется диалогом и больше ничем.
 *
 * Собеседники те же, что и в курсе с нуля: 다냐, 민수, 지영 — плюс рабочие роли
 * (부장님, 동료) там, где юнит про вежливость и работу.
 */
export const KOT2_DIALOGS: Record<string, SeedTask[]> = {
  'kot2-01': [gapDialog(ASK, [
    ['지영', '취미가 뭐예요?'],
    ['다냐', '한국 드라마 ____ 좋아해요.'],
  ], '보는 것을', { distractors: ['보기를', '봄을', '보는데'], alt: ['보기를'] })],

  'kot2-02': [gapDialog(ASK, [
    ['민수', '어제 왜 지각했어요?'],
    ['다냐', '길이 막힌 ____ 늦었어요.'],
  ], '탓에', { distractors: ['덕분에', '때문', '위해'], alt: ['바람에'] })],

  'kot2-03': [gapDialog(ASK, [
    ['지영', '다냐 씨, 한국어 정말 늘었어요.'],
    ['다냐', '고마워요. 매일 조금씩 했____.'],
  ], '거든요', { distractors: ['네요', '군요', '잖아요'] })],

  'kot2-22': [gapDialog(ASK, [
    ['민수', '이 식당 처음이죠? 여기 갈비가 유명해요.'],
    ['다냐', '그래요? 그럼 한번 ____.'],
  ], '먹어 볼게요', { distractors: ['먹었어요', '먹어야지요', '먹을까요'], alt: ['먹어 볼래요'] })],

  'kot2-04': [gapDialog(ASK, [
    ['다냐', '부장님, 지금 좀 ____ 부탁 하나 드려도 될까요?'],
    ['부장님', '네, 말씀하세요.'],
  ], '바쁘신데', { distractors: ['바쁘시고', '바쁘셔서', '바쁘시면'] })],

  'kot2-23': [gapDialog(ASK, [
    ['지영', '한국어 발음이 아직 어려워요?'],
    ['다냐', '네, 그런데 연습하면 ____ 쉬워져요.'],
  ], '할수록', { distractors: ['하더라도', '하는 데다가', '하려면'] })],

  'kot2-05': [gapDialog(ASK, [
    ['민수', '지영 씨는 내일 와요?'],
    ['다냐', '아니요, 내일은 못 ____ 했어요.'],
  ], '온다고', { distractors: ['오냐고', '오라고', '오자고'] })],

  'kot2-06': [gapDialog(ASK, [
    ['다냐', '부장님이 뭐라고 하셨어요?'],
    ['민수', '내일까지 보고서를 ____ 하셨어요.'],
  ], '내라고', { distractors: ['낸다고', '내냐고', '내자고'] })],

  'kot2-07': [gapDialog(ASK, [
    ['지영', '왜 그렇게 열심히 저축해요?'],
    ['다냐', '유학을 ____ 모으고 있어요.'],
  ], '가려고', { distractors: ['가러', '가기 위해서는', '가는데'], alt: ['가기 위해'] })],

  'kot2-08': [gapDialog(ASK, [
    ['민수', '휴가 계획 정했어요?'],
    ['다냐', '네, 제주도에 ____ 했어요.'],
  ], '가기로', { distractors: ['갈까', '가려고', '가게'] })],

  'kot2-09': [gapDialog(ASK, [
    ['지영', '번지점프 해 봤어요?'],
    ['다냐', '아니요, 한 번도 해 본 ____.'],
  ], '적이 없어요', { distractors: ['적이 있어요', '수가 없어요', '줄 몰라요'] })],

  'kot2-10': [gapDialog(ASK, [
    ['민수', '한국 음식 잘 먹네요.'],
    ['다냐', '처음엔 매웠는데 이제는 ____.'],
  ], '익숙해졌어요', { distractors: ['익숙해요', '익숙하게 됐어요', '익숙해질게요'] })],

  'kot2-11': [gapDialog(ASK, [
    ['지영', '주말에 그 카페 갔어요?'],
    ['다냐', '네, 갔는데 사람이 진짜 많____.'],
  ], '더라고요', { distractors: ['거든요', '잖아요', '는데요'] })],

  'kot2-12': [gapDialog(ASK, [
    ['민수', '손님이 곧 오시는데 자리는요?'],
    ['다냐', '걱정 마세요. 미리 예약해 ____.'],
  ], '놓았어요', { distractors: ['버렸어요', '있어요', '봤어요'], alt: ['뒀어요', '놨어요'] })],

  'kot2-27': [gapDialog(ASK, [
    ['지영', '그 노래 알아요?'],
    ['다냐', '아니요, 저는 ____. 처음 들어요.'],
  ], '몰라요', { distractors: ['모르아요', '모르어요', '몰아요'] })],

  'kot2-28': [gapDialog(ASK, [
    ['민수', '회의실 문이 왜 저래요?'],
    ['다냐', '아까부터 계속 ____ 있어요.'],
  ], '열려', { distractors: ['열고', '열어', '여는'] })],

  'kot2-13': [gapDialog(ASK, [
    ['다냐', '부장님은 지금 사무실에 ____?'],
    ['동료', '아니요, 회의 중이십니다.'],
  ], '계세요', { distractors: ['있으세요', '이세요', '드세요'] })],

  'kot2-14': [gapDialog(ASK, [
    ['지영', '표는 아직 있을까요?'],
    ['다냐', '아니요, 어제 다 ____.'],
  ], '팔렸어요', { distractors: ['팔았어요', '팔려요', '팔리게 했어요'] })],

  'kot2-15': [gapDialog(ASK, [
    ['민수', '왜 이렇게 늦었어요?'],
    ['다냐', '지하철이 고장 나는 ____ 한 시간 늦었어요.'],
  ], '바람에', { distractors: ['느라고', '덕분에', '대로'] })],

  'kot2-24': [gapDialog(ASK, [
    ['지영', '언제 전화할까요?'],
    ['다냐', '집에 ____ 바로 전화할게요.'],
  ], '도착하자마자', { distractors: ['도착하다가', '도착했더니', '도착하는 김에'] })],

  'kot2-16': [gapDialog(ASK, [
    ['민수', '지금 가면 표가 있을까요?'],
    ['다냐', '주말이라 ____. 미리 예약할까요?'],
  ], '없을 텐데요', { distractors: ['없거든요', '없더라고요', '없잖아요'], alt: ['없을 걸요'] })],

  'kot2-25': [gapDialog(ASK, [
    ['지영', '민수 씨 오늘 조용하네요.'],
    ['다냐', '어제 잠을 못 ____.'],
  ], '잤나 봐요', { distractors: ['잤어요', '자는 편이에요', '잘 뻔했어요'] })],

  'kot2-17': [gapDialog(ASK, [
    ['다냐', '「학생」의 「생」은 무슨 뜻이에요?'],
    ['지영', '「사람」이라는 뜻이에요. ____에도 같은 「생」이 들어가요.'],
  ], '선생님', { distractors: ['학교', '학기', '방학'] })],

  'kot2-26': [gapDialog(ASK, [
    ['민수', '할아버지께 나이를 여쭤볼 때 뭐라고 해요?'],
    ['다냐', '「나이」 대신 ____라고 해요.'],
  ], '연세', { distractors: ['년세', '식사', '댁'] })],

  'kot2-18': [gapDialog(ASK, [
    ['지영', '신문 기사에서는 「먹어요」를 어떻게 써요?'],
    ['다냐', '「____」라고 써요. 요를 붙이지 않아요.'],
  ], '먹는다', { distractors: ['먹다', '먹은다', '먹습니다'] })],

  'kot2-19': [gapDialog(ASK, [
    ['다냐', '이 안내문 마지막 문장이 비었어요.'],
    ['지영', '「자세한 내용은 사무실로 ____ 주십시오」가 자연스러워요.'],
  ], '문의해', { distractors: ['문의하고', '문의하러', '문의하면'] })],

  'kot2-20': [gapDialog(ASK, [
    ['민수', '그래프에서 20대 비율이 30%에서 45%가 됐어요.'],
    ['다냐', '그럼 「15%p ____」라고 쓰면 되겠네요.'],
  ], '증가했다', { distractors: ['감소했다', '차지했다', '나타났다'] })],

  'kot2-21': [gapDialog(ASK, [
    ['지영', '54번 에세이는 어떻게 시작해요?'],
    ['다냐', '먼저 제 ____을 한 문장으로 쓰고, 그다음에 근거를 써요.'],
  ], '주장', { distractors: ['근거', '해결책', '장단점'] })],
}

/**
 * Английский для дизайнера (endc) — по диалогу на юнит.
 *
 * ЗАЧЕМ ДИАЛОГ ИМЕННО ЗДЕСЬ. Весь курс — про разговор с людьми: рекрутёр,
 * нанимающий менеджер, руководитель, клиент. Отработать это упражнением
 * «выберите верную форму» нельзя: правильных форм в вакансии много, а уместная
 * в ответ рекрутёру — одна. Диалог ставит фразу туда, где она произносится.
 *
 * Роли подписаны по-английски: реплику читает голос, и «Recruiter» звучит
 * как реплика собеседника, а не как перевод.
 */
export const ENDC_DIALOGS: Record<string, SeedTask[]> = {
  'endc-01': [gapDialog(ASK, [
    ['Recruiter', 'So, what do you do?'],
    ['Dana', "I'm a ____. I work on mobile apps."],
  ], 'product designer', { distractors: ['product design', 'products designer', 'designer product'] })],

  'endc-02': [gapDialog(ASK, [
    ['Recruiter', 'How long were you at the agency?'],
    ['Dana', 'I ____ there for three years, from 2021 to 2024.'],
  ], 'worked', { distractors: ['work', 'have worked', 'was working'] })],

  'endc-03': [gapDialog(ASK, [
    ['Interviewer', 'What are you most proud of?'],
    ['Dana', "We ____ checkout conversion by 18% since the redesign."],
  ], 'have increased', { distractors: ['increase', 'are increasing', 'had increased'] })],

  'endc-04': [gapDialog(ASK, [
    ['Mentor', 'Your CV says "I was responsible for the redesign".'],
    ['Dana', "Right — in a bullet point I should start with a verb: '____ the checkout flow'."],
  ], 'Redesigned', { distractors: ['I redesigned', 'Redesigning', 'Was redesigning'] })],

  'endc-05': [gapDialog(ASK, [
    ['Interviewer', 'How did you validate the idea?'],
    ['Dana', 'Five users ____ before we built the prototype.'],
  ], 'were interviewed', { distractors: ['interviewed', 'were interviewing', 'have interviewed'] })],

  'endc-06': [gapDialog(ASK, [
    ['Interviewer', 'And what came out of it?'],
    ['Dana', 'We cut two steps from the form. ____, support tickets dropped by a third.'],
  ], 'As a result', { distractors: ['However', 'Due to', 'Therefore of'] })],

  'endc-07': [gapDialog(ASK, [
    ['Dana', "I'm writing to the hiring manager. How do I end it?"],
    ['Mentor', "'____ from you. Best regards, Dana.'"],
  ], 'Looking forward to hearing', { distractors: ['Looking forward to hear', 'I look forward hearing', 'Waiting your answer'] })],

  'endc-08': [gapDialog(ASK, [
    ['Mentor', 'Why are you applying to this studio?'],
    ['Dana', 'I want to work here ____ learn from a bigger design team.'],
  ], 'in order to', { distractors: ['because of', 'so that', 'for to'] })],

  'endc-09': [gapDialog(ASK, [
    ['Dana', 'My application was rejected in a day. Nobody read it.'],
    ['Mentor', 'An ____ probably filtered it. Use the same keywords as the job posting.'],
  ], 'ATS', { distractors: ['headline', 'shortlist', 'notice period'] })],

  'endc-10': [gapDialog(ASK, [
    ['Recruiter', 'Are you looking at other companies right now?'],
    ['Dana', "Yes, I'm ____ looking for a product role in fintech."],
  ], 'currently', { distractors: ['current', 'currency', 'recently'] })],

  'endc-11': [gapDialog(ASK, [
    ['Recruiter', 'Good morning! How is it going?'],
    ['Dana', 'Pretty good, thanks. ____?'],
  ], 'How about you', { distractors: ['And you are', 'What about', 'How do you do it'] })],

  'endc-12': [gapDialog(ASK, [
    ['Interviewer', 'Tell me about yourself.'],
    ['Dana', 'Currently I work as a product designer. ____, I was at an agency for three years.'],
  ], 'Before that', { distractors: ['After that', 'Before this time', 'Since that'] })],

  'endc-13': [gapDialog(ASK, [
    ['Interviewer', 'Tell me about a time when you missed a deadline.'],
    ['Dana', 'We ____ on a launch when the client changed the brief.'],
  ], 'were working', { distractors: ['worked', 'have worked', 'work'] })],

  'endc-14': [gapDialog(ASK, [
    ['Dana', 'Let me ____ this case study.'],
    ['Interviewer', 'Please do.'],
  ], 'walk you through', { distractors: ['walk you on', 'go you through', 'take you across'] })],

  'endc-15': [gapDialog(ASK, [
    ['Lead', 'The contrast on those labels is too low.'],
    ['Dana', "____. I'll check them against the accessibility guide."],
  ], "That's fair", { distractors: ["That's not right", 'I hear you, but', 'Have you considered'] })],

  'endc-16': [gapDialog(ASK, [
    ['Dana', '____ moving the primary button above the fold?'],
    ['Colleague', 'Good point — let me try that.'],
  ], 'Have you considered', { distractors: ['Do you consider', 'Are you considered', 'You have considered'] })],

  'endc-17': [gapDialog(ASK, [
    ['Interviewer', 'Do you have any questions for us?'],
    ['Dana', 'Yes — could you tell me ____ hand designs off to engineering?'],
  ], 'how you usually', { distractors: ['how do you usually', 'how are you usually', 'that you usually'] })],

  'endc-18': [gapDialog(ASK, [
    ['Dana', "It's been a week since the interview. Is it fine to write?"],
    ['Mentor', "Yes: 'I wanted to ____ on our conversation last Tuesday.'"],
  ], 'follow up', { distractors: ['follow', 'touch', 'keep posted'] })],

  'endc-19': [gapDialog(ASK, [
    ['Dana', '____ that the test task covers only the mobile screens?'],
    ['Recruiter', 'Correct, mobile only.'],
  ], 'Am I right in thinking', { distractors: ['Am I right thinking', 'I am right in think', 'Do I right think'] })],

  'endc-20': [gapDialog(ASK, [
    ['Recruiter', 'What are your salary expectations?'],
    ['Dana', 'Based on my experience, I ____ for the upper half of the range.'],
  ], 'was hoping', { distractors: ['hope', 'am hoping', 'would hoping'] })],

  'endc-21': [gapDialog(ASK, [
    ['Recruiter', 'So, what do you say?'],
    ['Dana', 'Thank you — I am ____ accept the offer.'],
  ], 'delighted to', { distractors: ['delighted for', 'delighted that', 'delight to'] })],

  'endc-22': [gapDialog(ASK, [
    ['Dana', '____ about the design system licence?'],
    ['Buddy', 'Ask Mark — he owns the tooling.'],
  ], 'Who should I ask', { distractors: ['Who I should ask', 'Whom should ask', 'Who should ask me'] })],

  'endc-23': [gapDialog(ASK, [
    ['Manager', 'How is the onboarding flow going?'],
    ['Dana', 'I ____ on it for two weeks now, and the first screens are in review.'],
  ], 'have been working', { distractors: ['work', 'worked', 'am work'] })],

  'endc-24': [gapDialog(ASK, [
    ['Manager', 'Dana, your stand-up?'],
    ['Dana', 'Yesterday I finished the empty states. Today I am ____ the error screens. No blockers.'],
  ], 'picking up', { distractors: ['pick up', 'picked up', 'picking on'] })],

  'endc-25': [gapDialog(ASK, [
    ['Dana', 'Quick ____: the handoff file moves to the new project today.'],
    ['Colleague', 'Thanks for the warning!'],
  ], 'heads up', { distractors: ['head up', 'heads on', 'FYI up'] })],

  'endc-26': [gapDialog(ASK, [
    ['Colleague', 'We should ship both variants and see what happens.'],
    ['Dana', 'I ____. The risk with that is we cannot tell which one worked.'],
  ], 'see it differently', { distractors: ['see it different', 'am seeing differently', 'see them differently'] })],

  'endc-27': [gapDialog(ASK, [
    ['Client', 'So we agreed on the scope and the deadline.'],
    ['Dana', 'Let me ____: two flows by the 14th, and I own the prototype.'],
  ], 'summarise', { distractors: ['summary', 'summarize it up', 'recap of'] })],

  'endc-28': [gapDialog(ASK, [
    ['Manager', 'How would you describe your English on a CV?'],
    ['Dana', 'I would write "____" — I work in it every day, but I am not native.'],
  ], 'working proficiency', { distractors: ['fluent', 'native speaker', 'plateau'] })],
}

/**
 * Английский B2 → C1 (enac) — по диалогу на юнит.
 *
 * ЗДЕСЬ ПРОПУСК ВСЕГДА НА ВЫБОРЕ, А НЕ НА ФОРМЕ. На этом уровне ученик уже
 * строит верные предложения; курс про то, чтобы ВЫБИРАТЬ между верными. Поэтому
 * обманки — не ошибки («worked» вместо «working»), а другие грамматически
 * законные варианты, отличающиеся только смыслом: «must have» против «cannot
 * have», «put off» против «call off», «fewer» против «less».
 */
export const ENAC_DIALOGS: Record<string, SeedTask[]> = {
  'enac-01': [gapDialog(ASK, [
    ['Lead', 'Why did the outage last so long?'],
    ['Sam', 'By the time we noticed, the queue ____ for two hours.'],
  ], 'had been growing', { distractors: ['was growing', 'has been growing', 'grew'] })],

  'enac-02': [gapDialog(ASK, [
    ['Lead', 'How is the backlog looking?'],
    ['Sam', 'I ____ through it all week, and I have closed nine tickets so far.'],
  ], 'have been working', { distractors: ['have worked', 'work', 'had worked'] })],

  'enac-03': [gapDialog(ASK, [
    ['Client', 'Can we see the report on Friday?'],
    ['Sam', 'By Friday we ____ the data, so yes.'],
  ], 'will have collected', { distractors: ['will collect', 'will be collecting', 'are collecting'] })],

  'enac-04': [gapDialog(ASK, [
    ['Sam', 'You told me on Monday that the API was stable.'],
    ['Colleague', 'I said it ____ stable — and it was, until the migration.'],
  ], 'was', { distractors: ['is', 'has been', 'will be'] })],

  'enac-05': [gapDialog(ASK, [
    ['Journalist', 'What did the CEO say exactly?'],
    ['Sam', 'She said the company ____ the office the following year.'],
  ], 'would open', { distractors: ['will open', 'opens', 'had opened'] })],

  'enac-06': [gapDialog(ASK, [
    ['Sam', 'He kept saying it was not his fault, then finally said it was.'],
    ['Colleague', 'So he ____ the mistake in the end.'],
  ], 'admitted', { distractors: ['denied', 'insisted', 'accused'] })],

  'enac-07': [gapDialog(ASK, [
    ['Sam', 'We shipped without a rollback plan and it broke.'],
    ['Lead', 'If we ____ one, we would not be firefighting now.'],
  ], 'had written', { distractors: ['wrote', 'would write', 'have written'] })],

  'enac-08': [gapDialog(ASK, [
    ['Lead', 'Nobody warned us about the licence.'],
    ['Sam', '____ known, I would have chosen a different library.'],
  ], 'Had I', { distractors: ['If I would have', 'I had', 'Should I have'] })],

  'enac-09': [gapDialog(ASK, [
    ['Client', 'Which office handles this?'],
    ['Sam', 'Our Berlin team, ____ specialises in payments, owns it.'],
  ], 'which', { distractors: ['that', 'who', 'what'] })],

  'enac-10': [gapDialog(ASK, [
    ['Editor', 'This sentence is too long.'],
    ['Sam', '____ the brief, I rewrote the opening in two lines.'],
  ], 'Having read', { distractors: ['Reading', 'Read', 'To read'] })],

  'enac-11': [gapDialog(ASK, [
    ['Lead', 'What actually caused it?'],
    ['Sam', '____ the migration script, not the traffic spike.'],
  ], 'It was', { distractors: ['That was', 'There was', 'What was'] })],

  'enac-12': [gapDialog(ASK, [
    ['Client', 'The design is strong, but the timeline worries me.'],
    ['Sam', 'Understood. ____, we can deliver the first flow next week.'],
  ], 'Nevertheless', { distractors: ['Consequently', 'Whereas', 'Notably'] })],

  'enac-13': [gapDialog(ASK, [
    ['Editor', 'Should it be "the media report" or "media report"?'],
    ['Sam', 'With this meaning — ____ media — we keep the article.'],
  ], 'the', { distractors: ['a', 'an', 'no article'] })],

  'enac-14': [gapDialog(ASK, [
    ['Lead', 'How solid is the study?'],
    ['Sam', 'There is ____ evidence, but the sample size is small.'],
  ], 'little', { distractors: ['few', 'a few', 'fewer'] })],

  'enac-15': [gapDialog(ASK, [
    ['Client', 'Is the new page faster?'],
    ['Sam', 'It loads ____ faster — about half a second, not more.'],
  ], 'slightly', { distractors: ['far', 'considerably', 'by far'] })],

  'enac-16': [gapDialog(ASK, [
    ['Lead', 'Who signs this off?'],
    ['Sam', 'I am responsible ____ the design; legal signs the contract.'],
  ], 'for', { distractors: ['of', 'on', 'to'] })],

  'enac-17': [gapDialog(ASK, [
    ['Client', 'Can we move the workshop to next month?'],
    ['Sam', 'Sure — we can ____ it off until March.'],
  ], 'put', { distractors: ['call', 'cut', 'carry'] })],

  'enac-18': [gapDialog(ASK, [
    ['Lead', 'Did you tell them about the delay?'],
    ['Sam', 'I remember ____ them last Tuesday — the email is in the thread.'],
  ], 'telling', { distractors: ['to tell', 'tell', 'to telling'] })],

  'enac-19': [gapDialog(ASK, [
    ['Lead', 'Where are we on the audit?'],
    ['Sam', 'We are making good ____ — two sections left.'],
  ], 'progress', { distractors: ['progresses', 'a progress', 'progression'] })],

  'enac-20': [gapDialog(ASK, [
    ['Sam', '____ you could send the figures before Thursday?'],
    ['Client', 'Of course, I will send them tomorrow.'],
  ], 'I was wondering whether', { distractors: ['I wonder that', 'I am wondering what', 'I wondered if not'] })],

  'enac-21': [gapDialog(ASK, [
    ['Lead', 'The deploy log is empty and the build is old.'],
    ['Sam', 'Then the pipeline ____ run at all last night.'],
  ], 'cannot have', { distractors: ['must have', 'might have', 'should have'] })],

  'enac-22': [gapDialog(ASK, [
    ['Newcomer', 'Do I have to attend the Friday demo?'],
    ['Sam', 'No, you ____ — it is optional for designers.'],
  ], "don't have to", { distractors: ['must not', 'should not', 'had better not'] })],

  'enac-23': [gapDialog(ASK, [
    ['Client', 'Do you fix the photography yourselves?'],
    ['Sam', 'No, we ____ retouched by a studio.'],
  ], 'have it', { distractors: ['have been', 'are having', 'get it to be'] })],

  'enac-24': [gapDialog(ASK, [
    ['Opponent', 'Remote work hurts junior developers.'],
    ['Sam', 'I ____ that point, but structured mentoring solves it.'],
  ], 'concede', { distractors: ['substantiate', 'outweigh', 'put forward'] })],
}

/**
 * IELTS Academic (ielt) — по диалогу на юнит.
 *
 * ЗДЕСЬ ДИАЛОГ — ЭТО САМ ФОРМАТ ЭКЗАМЕНА. Speaking целиком состоит из обмена
 * репликами с экзаменатором, а Listening — из разговоров, где ответ меняется
 * прямо по ходу («sorry, I meant Tuesday»). Поэтому пропуск ставится туда, где
 * его ставит экзамен: в ответную реплику кандидата и в исправление говорящего.
 *
 * Роли: Examiner — экзаменатор, Candidate — сдающий, Tutor — преподаватель
 * курса (в юнитах про критерии и стратегию).
 */
export const IELT_DIALOGS: Record<string, SeedTask[]> = {
  'ielt-01': [gapDialog(ASK, [
    ['Tutor', 'You wrote a lot, but you never said whether you agree.'],
    ['Candidate', 'So I lost marks on ____, not on grammar.'],
  ], 'task response', { distractors: ['lexical resource', 'coherence and cohesion', 'pronunciation'] })],

  'ielt-02': [gapDialog(ASK, [
    ['Tutor', 'The prompt says "young people". Do not copy it.'],
    ['Candidate', 'I will write "____" instead.'],
  ], 'the younger generation', { distractors: ['young peoples', 'the young people', 'younger of people'] })],

  'ielt-03': [gapDialog(ASK, [
    ['Tutor', 'Two short sentences here. Join them.'],
    ['Candidate', '"The city, ____ population doubled, built two new lines."'],
  ], 'whose', { distractors: ['which', 'that', "who's"] })],

  'ielt-04': [gapDialog(ASK, [
    ['Tutor', '"Traffic is a big problem" is too plain for band 7.'],
    ['Candidate', 'Then: "Heavy traffic ____ a serious threat to air quality."'],
  ], 'poses', { distractors: ['makes', 'gives', 'does'] })],

  'ielt-05': [gapDialog(ASK, [
    ['Candidate', 'The answer is "a blue folder". Is that fine?'],
    ['Tutor', 'The instruction says ____, so "blue folder" is safer.'],
  ], 'no more than two words', { distractors: ['form completion', 'labelling a map', 'transfer your answers'] })],

  'ielt-06': [gapDialog(ASK, [
    ['Speaker', 'The tour starts at nine — sorry, I ____ ten. Nine is the coffee.'],
    ['Candidate', 'So the tour is at ten.'],
  ], 'meant', { distractors: ['mean', 'am meaning', 'have meant'] })],

  'ielt-07': [gapDialog(ASK, [
    ['Lecturer', 'That covers the first factor. ____ the second: cost.'],
    ['Candidate', '(writes: 2nd factor = cost)'],
  ], 'Moving on to', { distractors: ['To begin with', 'To sum up', 'As I mentioned earlier'] })],

  'ielt-08': [gapDialog(ASK, [
    ['Candidate', 'I read all three passages and ran out of time.'],
    ['Tutor', 'Do not read everything — ____ for the keyword and read only that paragraph.'],
  ], 'scan', { distractors: ['skim', 'skip', 'locate'] })],

  'ielt-09': [gapDialog(ASK, [
    ['Candidate', 'The text says the museum opened in 1890. The statement says "the oldest in the city".'],
    ['Tutor', 'The text never compares it to others, so the answer is ____.'],
  ], 'Not Given', { distractors: ['True', 'False', 'Contradicted'] })],

  'ielt-10': [gapDialog(ASK, [
    ['Candidate', 'Two headings both mention "funding".'],
    ['Tutor', 'A word match is a trap. Choose by the ____ of the paragraph.'],
  ], 'main idea', { distractors: ['supporting detail', 'topic word', 'first sentence'] })],

  'ielt-11': [gapDialog(ASK, [
    ['Candidate', 'What does "overstate" mean here?'],
    ['Tutor', 'The prefix tells you: ____ than it should be.'],
  ], 'more', { distractors: ['less', 'without', 'again'] })],

  'ielt-12': [gapDialog(ASK, [
    ['Tutor', 'Sales went from 20 to 80 in one year. How do you write it?'],
    ['Candidate', '"Sales ____ sharply, reaching 80 million."'],
  ], 'rose', { distractors: ['raised', 'arose', 'were rising'] })],

  'ielt-13': [gapDialog(ASK, [
    ['Tutor', 'Task 1 process — who filters the water?'],
    ['Candidate', 'Nobody in particular. "The water ____ in the second stage."'],
  ], 'is filtered', { distractors: ['filters', 'is filtering', 'has filtered'] })],

  'ielt-14': [gapDialog(ASK, [
    ['Tutor', 'The prompt says "Discuss both views and give your own opinion".'],
    ['Candidate', 'So I need two body paragraphs plus my ____.'],
  ], 'thesis statement', { distractors: ['topic sentence', 'counter-argument', 'outline'] })],

  'ielt-15': [gapDialog(ASK, [
    ['Tutor', 'You used "Moreover" four times in one paragraph.'],
    ['Candidate', 'I will replace two of them with reference words like "____ trend".'],
  ], 'this', { distractors: ['that', 'such', 'the former'] })],

  'ielt-16': [gapDialog(ASK, [
    ['Tutor', 'Your point stops at "cars cause pollution".'],
    ['Candidate', 'I will add the chain: "____ raises hospital costs."'],
  ], 'which in turn', { distractors: ['in addition', 'a case in point', 'admittedly'] })],

  'ielt-17': [gapDialog(ASK, [
    ['Examiner', 'Do you enjoy cooking?'],
    ['Candidate', 'Not really — ____ I am too tired after work.'],
  ], 'mainly because', { distractors: ['because of', 'due to', 'for the reason'] })],

  'ielt-18': [gapDialog(ASK, [
    ['Examiner', 'Describe a journey you remember.'],
    ['Candidate', '____ a trip I took to Georgia two summers ago.'],
  ], "I'd like to talk about", { distractors: ['I like to talk', 'I would talk about', 'I am liking to tell'] })],

  'ielt-19': [gapDialog(ASK, [
    ['Examiner', 'Do people read less than they used to?'],
    ['Candidate', 'On the whole, people ____ read shorter texts now.'],
  ], 'tend to', { distractors: ['tending to', 'are tend to', 'tends to'] })],

  'ielt-20p': [gapDialog(ASK, [
    ['Examiner', 'Say these two: "sheep" and "ship".'],
    ['Candidate', 'The first has the long ____.'],
  ], 'vowel', { distractors: ['consonant', 'word stress', 'intonation'] })],

  'ielt-20': [gapDialog(ASK, [
    ['Tutor', 'Your mock came out at 6.5. Where did you lose it?'],
    ['Candidate', 'Reading — I need better ____, not more vocabulary.'],
  ], 'time management', { distractors: ['target band', 'accuracy', 'fluency'] })],
}
