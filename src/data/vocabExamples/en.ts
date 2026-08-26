// ─────────────────────────────────────────────────────────────────────────────
// Примеры к словам курсов: en
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

export const EN_VOCAB_EXAMPLES: ExampleMap = {
  'case in point': x('Our checkout is a case in point: three steps, no drop-off.', 'Наш чекаут — показательный пример: три шага и никакого отвала.'),  // a case in point
  'chunk': x('Learn a chunk, not a word: "as far as I know".', 'Учите кусок, а не слово: «as far as I know».'),  // a chunk
  'compelling argument': x('Cost is a compelling argument for the client.', 'Цена — убедительный аргумент для клиента.'),  // a compelling argument
  'drum': x('He plays the drum in a local band.', 'Он играет на барабане в местной группе.'),
  'gust': x('A gust of wind took my umbrella.', 'Порыв ветра унёс мой зонт.'),
  'load': x('I put a load of washing in the machine before work.', 'Перед работой я загрузил бельё в машину.'),
  'made up afterwards': x('We argued in the morning and made up afterwards.', 'Утром мы поссорились, а потом помирились.'),
  'nearly due': x('The rent is nearly due, I will pay on Friday.', 'Срок платы за квартиру почти подошёл, заплачу в пятницу.'),
  'percentage point': x('The rate went up by half a percentage point.', 'Ставка выросла на полпроцентного пункта.'),
  'power cut': x('There was a power cut for two hours last night.', 'Вчера вечером на два часа отключали электричество.'),
  'processor': x('The data is stored by an external processor.', 'Данные хранит внешний обработчик.'),
  'realistic timeline': x('A realistic timeline is three weeks, not one.', 'Реалистичный срок — три недели, а не одна.'),  // a realistic timeline
  'rug': x('There is a small rug by the bed.', 'У кровати лежит маленький коврик.'),
  'steady increase': x('There was a steady increase from 2015 to 2020.', 'С 2015 по 2020 год был устойчивый рост.'),  // a steady increase
  'wide range of': x('The candidate uses a wide range of structures.', 'Кандидат использует широкий набор конструкций.'),  // a wide range of
  'widely held belief': x('It is a widely held belief that exams measure ability.', 'Распространённое мнение, что экзамены измеряют способности.'),  // a widely held belief
  'abbreviation': x('EOD is an abbreviation for "end of day".', 'EOD — сокращение от «end of day».'),  // abbreviation
  'accent': x('I have a strong accent, but people understand me.', 'У меня сильный акцент, но меня понимают.'),  // accent
  'accuracy versus fluency': x('In speaking it is accuracy versus fluency, and fluency wins.', 'В говорении это точность против беглости, и беглость важнее.'),  // accuracy versus fluency
  'action': x('Then say what action you took.', 'Затем скажите, что вы сделали.'),  // action
  'action item': x('My action item from the call is to send the estimate.', 'Моя задача по итогам созвона — отправить оценку.'),  // action item
  'adjacent to': x('The library is adjacent to the main station.', 'Библиотека находится рядом с главным вокзалом.'),  // adjacent to
  'admittedly': x('Admittedly, the deadline was my own fault.', 'Надо признать, срок я сорвал сам.'),  // admittedly
  'after careful thought': x('After careful thought, I decided to accept the offer.', 'Всё взвесив, я решил принять предложение.'),  // after careful thought
  'agenda': x('The agenda has three items and one owner each.', 'В повестке три пункта, у каждого свой ответственный.'),  // agenda
  'all / most / some': x('All designers, most engineers and some managers joined.', 'Все дизайнеры, большинство инженеров и некоторые руководители пришли.'),  // all / most / some
  'although / even though': x('Although the salary is lower, the team is better.', 'Хотя зарплата ниже, команда лучше.'),  // although / even though
  'always / usually / sometimes': x('I always plan, usually review, and sometimes rewrite.', 'Я всегда планирую, обычно проверяю и иногда переписываю.'),  // always / usually / sometimes
  'am i right in thinking': x('Am I right in thinking the deliverable is one screen?', 'Правильно ли я понимаю, что нужен один экран?'),  // Am I right in thinking
  'answer sheet': x('Write your answers on the answer sheet, not on the question paper.', 'Пишите ответы в бланк, а не в лист с заданиями.'),  // answer sheet
  'any questions so far': x('That is the first part. Any questions so far?', 'Это первая часть. Есть вопросы?'),  // Any questions so far?
  'apart from': x('Apart from Friday, I am free all week.', 'Кроме пятницы, я свободен всю неделю.'),  // apart from
  'arguably': x('This is arguably the best solution we have.', 'Это, пожалуй, лучшее решение из имеющихся.'),  // arguably
  'a result': x('The onboarding was shorter, and as a result fewer users dropped off.', 'Онбординг стал короче, и в результате меньше пользователей отвалилось.'),  // as a result
  'far as i know': x('As far as I know, the release is still on Friday.', 'Насколько я знаю, релиз всё ещё в пятницу.'),  // as far as I know
  'i mentioned earlier': x('As I mentioned earlier, research came first.', 'Как я упоминал ранее, исследование было первым.'),  // as I mentioned earlier
  'asap': x('Could you review the file ASAP?', 'Можешь посмотреть файл как можно скорее?'),  // ASAP
  'assumption': x('Our main assumption was that users read the hint.', 'Наше главное допущение: пользователи читают подсказку.'),  // assumption
  'at the time': x('At the time, we had two days left.', 'На тот момент у нас оставалось два дня.'),  // at the time
  'at your convenience': x('Please reply at your convenience.', 'Ответьте, когда вам будет удобно.'),  // at your convenience
  'ats': x('Keep the CV simple so the ATS can read it.', 'Держите резюме простым, чтобы система отбора его прочитала.'),  // ATS (applicant tracking system)
  'availability': x('Could you send me your availability for next week?', 'Пришлите, когда вам удобно на следующей неделе.'),  // availability
  'background': x('I have a background in illustration.', 'У меня бэкграунд в иллюстрации.'),  // background
  'band descriptor': x('Read the band descriptor to see what a 7 requires.', 'Прочитайте описание уровня, чтобы понять, что нужно на 7.'),  // band descriptor
  'bandwidth': x('I do not have the bandwidth for another project this month.', 'В этом месяце у меня нет сил и времени на ещё один проект.'),  // bandwidth
  'before and after': x('Show the before and after in one slide.', 'Покажите «до» и «после» на одном слайде.'),  // before and after
  'before that': x('Before that, I spent two years at an agency.', 'До этого я два года работал в агентстве.'),  // Before that
  'benefits': x('The salary is average, but the benefits are good.', 'Зарплата средняя, но дополнительные условия хорошие.'),  // benefits
  'best regards': x('Best regards, Daniil', 'С уважением, Даниил'),  // Best regards
  'blocked on': x('I am blocked on the API response format.', 'Я застрял на формате ответа API.'),  // blocked on
  'blocker': x('My main blocker is that I am waiting on copy.', 'Мой главный блокер — жду тексты.'),  // blocker
  'brief': x('The brief was two lines, so I asked five questions.', 'Бриф был в две строки, поэтому я задал пять вопросов.'),  // brief
  'buddy / mentor': x('Every new hire gets a buddy for the first month.', 'У каждого новичка первый месяц есть наставник.'),  // buddy / mentor
  'bullet point': x('Keep every bullet point to one line.', 'Держите каждый пункт списка в одну строку.'),  // bullet point
  'by 18%': x('I increased conversion by 18% in one quarter.', 'За квартал я поднял конверсию на 18%.'),  // by 18%
  'by when': x('By when do you need the first draft?', 'К какому сроку нужен первый черновик?'),  // by when
  'can you hear me': x('Can you hear me? My connection is unstable.', 'Вы меня слышите? У меня нестабильная связь.'),  // Can you hear me?
  'career path': x('The career path here goes from mid to lead.', 'Карьерный путь здесь идёт от мидла до лида.'),  // career path
  'case study': x('The portfolio needs at least one case study.', 'В портфолио нужен хотя бы один разбор проекта.'),  // case study
  'cet': x('I am online from 10:00 to 18:00 CET.', 'Я на связи с 10:00 до 18:00 по центральноевропейскому времени.'),  // CET
  'churn': x('Churn dropped after we fixed the payment screen.', 'Отток снизился после починки экрана оплаты.'),  // churn
  'circling back on': x('Circling back on the estimate we discussed.', 'Возвращаюсь к оценке, которую мы обсуждали.'),  // Circling back on
  'coherence and cohesion': x('Linking words are half of coherence and cohesion.', 'Слова-связки — половина логики и связности.'),  // coherence and cohesion
  'comma splice': x('"It was late, we left" is a comma splice.', '«It was late, we left» — это две части, склеенные запятой.'),  // comma splice
  'compensation package': x('The compensation package includes equity and a learning budget.', 'Пакет вознаграждения включает долю и бюджет на обучение.'),  // compensation package
  'concession': x('Start with a concession: "This is true for small teams."', 'Начните с уступки: «Для небольших команд это верно».'),  // concession
  'concise': x('Keep the summary concise: five sentences.', 'Держите резюме ёмким: пять предложений.'),  // concise
  'confident': x('I feel confident about the interview now.', 'Теперь я уверен насчёт собеседования.'),  // confident
  'conflict': x('We had a conflict about scope, not about people.', 'У нас был конфликт про объём работ, а не про людей.'),  // conflict
  'consequently': x('The API was down; consequently, the release slipped.', 'API лежал, следовательно, релиз сдвинулся.'),  // consequently
  'constraint': x('The main constraint was the deadline.', 'Главным ограничением был срок.'),  // constraint
  'context clue': x('Guess the word from the context clue in the same sentence.', 'Угадайте слово по подсказке из того же предложения.'),  // context clue
  'contribution': x('My contribution was the research and the first prototype.', 'Мой вклад — исследование и первый прототип.'),  // contribution
  'conversion rate': x('The conversion rate rose from 2% to 3.5%.', 'Конверсия выросла с 2% до 3,5%.'),  // conversion rate
  'could we revisit': x('Could we revisit the deadline next week?', 'Можем вернуться к срокам на следующей неделе?'),  // Could we revisit
  'could you say more about': x('Could you say more about what feels off?', 'Можете подробнее о том, что вас смущает?'),  // Could you say more about
  'counter-argument': x('Give one counter-argument and answer it.', 'Приведите один контраргумент и ответьте на него.'),  // counter-argument
  'cover letter': x('The cover letter should be shorter than the CV.', 'Сопроводительное письмо должно быть короче резюме.'),  // cover letter
  'currently i work as': x('Currently I work as a product designer at a fintech company.', 'Сейчас я работаю продуктовым дизайнером в финтех-компании.'),  // Currently I work as
  'cv / resume': x('Please find my CV attached.', 'Во вложении моё резюме.'),  // CV / resume
  'decision-making': x('Decision-making here is fast: one owner, one call.', 'Принятие решений здесь быстрое: один ответственный, один созвон.'),  // decision-making
  'deliverable': x('The deliverable is one screen with all states.', 'Результат — один экран со всеми состояниями.'),  // deliverable
  'design lead': x('Our design lead reviews every flow before dev.', 'Наш руководитель дизайна смотрит каждый сценарий до разработки.'),  // design lead
  'design process': x('Our design process is research, prototype, test.', 'Наш дизайн-процесс: исследование, прототип, тест.'),  // design process
  'discuss both views': x('The task says: discuss both views and give your opinion.', 'В задании сказано: рассмотрите оба взгляда и дайте своё мнение.'),  // discuss both views
  'distractor': x('Every wrong option is a distractor, not a mistake.', 'Каждый неверный вариант — отвлекающий, а не случайный.'),  // distractor
  'distractor heading': x('Two headings are distractor headings and fit no paragraph.', 'Два заголовка — ловушки и не подходят ни к одному абзацу.'),  // distractor heading
  'does that work for you': x('Thursday at 11, does that work for you?', 'Четверг в 11 — вам так подходит?'),  // Does that work for you?
  'due to': x('The delay was due to a missing API.', 'Задержка была из-за отсутствующего API.'),  // due to
  'due to / owing to / as a result of': x('Traffic fell due to the change, owing to slower loading.', 'Трафик упал из-за изменения, вследствие более медленной загрузки.'),  // due to / owing to / as a result of
  'endorsement': x('An endorsement from a colleague is worth more than a list.', 'Подтверждение навыка от коллеги стоит больше списка.'),  // endorsement
  'eod': x('Action items go out by EOD.', 'Задачи разойдутся до конца дня.'),  // EOD
  'equity': x('The offer includes a small amount of equity.', 'Предложение включает небольшую долю в компании.'),  // equity
  'error-free sentences': x('Ten error-free sentences beat twenty risky ones.', 'Десять предложений без ошибок лучше двадцати рискованных.'),  // error-free sentences
  'evidence': x('There is no evidence that the change helped.', 'Нет доказательств, что изменение помогло.'),  // evidence
  'expectations': x('The rating was "meets expectations".', 'Оценка — «соответствует ожиданиям».'),  // expectations
  'feedback loop': x('A weekly demo is our feedback loop.', 'Еженедельное демо — наш цикл обратной связи.'),  // feedback loop
  'flexible hours': x('The job is fully remote with flexible hours.', 'Работа полностью удалённая, со свободным графиком.'),  // flexible hours
  'for example': x('Some tools are free — Figma, for example.', 'Некоторые инструменты бесплатны, например Figma.'),  // for example
  'for instance': x('Take onboarding, for instance: three screens are enough.', 'Возьмём, например, онбординг: трёх экранов достаточно.'),  // for instance
  'form completion': x('Form completion allows no more than two words per gap.', 'В заполнении формы допускается не более двух слов на пропуск.'),  // form completion
  'freelance': x('I worked freelance for two years before this role.', 'До этой роли я два года работал на фрилансе.'),  // freelance
  'from 2021 to 2024': x('I led the mobile team from 2021 to 2024.', 'Я вёл мобильную команду с 2021 по 2024.'),  // from 2021 to 2024
  'furthermore / moreover': x('The plan is cheaper; furthermore, it is faster.', 'План дешевле; более того, он быстрее.'),  // furthermore / moreover
  'fyi': x('FYI, the meeting moved to 15:00.', 'К сведению: встреча сдвинулась на 15:00.'),  // FYI
  'genuinely': x('The summary is genuinely one page.', 'Резюме и правда на одну страницу.'),  // genuinely
  'gist': x('First reading is for the gist, not for details.', 'Первое чтение — ради общего смысла, а не деталей.'),  // gist
  'grammatical range and accuracy': x('Grammatical range and accuracy is one of four criteria.', 'Разнообразие и правильность грамматики — один из четырёх критериев.'),  // grammatical range and accuracy
  'graphic designer': x('She started as a graphic designer and moved to product.', 'Она начинала графическим дизайнером и перешла в продукт.'),  // graphic designer
  'gross / net': x('Is that gross or net?', 'Это до вычета налогов или после?'),  // gross / net
  'gross salary': x('The gross salary is 60,000 a year.', 'Зарплата до вычета налогов — 60 000 в год.'),  // gross salary
  'growth': x('I am looking for growth, not just a higher salary.', 'Я ищу развитие, а не просто зарплату повыше.'),  // growth
  'handoff': x('The handoff to development is on Thursday.', 'Передача в разработку в четверг.'),  // handoff
  'happy to be proven wrong': x('That is my read, and I am happy to be proven wrong.', 'Так я это вижу и буду рад ошибиться.'),  // happy to be proven wrong
  'have you considered': x('Have you considered making the label darker instead?', 'Вы не думали вместо этого сделать подпись темнее?'),  // Have you considered
  'heading': x('Match each heading to the right paragraph.', 'Сопоставьте каждый заголовок с нужным абзацем.'),  // heading
  'headline': x('Your headline should say what you do, not where you work.', 'В заголовке профиля пишите, что вы делаете, а не где работаете.'),  // headline
  'heads up': x('Heads up — I am working from home today.', 'Предупреждаю: сегодня я работаю из дома.'),  // heads up
  'heavy traffic': x('I was late because of heavy traffic.', 'Я опоздал из-за плотного движения.'),  // heavy traffic
  'hedging': x('Hedging with "may" is safer than a flat claim.', 'Осторожное «may» безопаснее прямого утверждения.'),  // hedging
  'here you can see': x('Here you can see the old flow and the new one.', 'Здесь видно старый сценарий и новый.'),  // Here you can see
  'how about you': x('I am from Lisbon. How about you?', 'Я из Лиссабона. А вы?'),  // How about you?
  'how do you usually': x('How do you usually start a project?', 'Как вы обычно начинаете проект?'),  // How do you usually
  'how is it going': x('Hi Anna, how is it going?', 'Привет, Анна, как дела?'),  // How is it going?
  'hypothesis': x('Our hypothesis was that the price scared people off.', 'Наша гипотеза: людей отпугивала цена.'),  // hypothesis
  'i am blocked on': x('I am blocked on the API until tomorrow.', 'Я застрял на API до завтра.'),  // I am blocked on
  'i am delighted to accept': x('I am delighted to accept your offer.', 'С радостью принимаю ваше предложение.'),  // I am delighted to accept
  'i am not sure i agree': x('I am not sure I agree with the second point.', 'Не уверен, что согласен со вторым пунктом.'),  // I am not sure I agree
  'i am still getting my head around': x('I am still getting my head around our design system.', 'Я ещё разбираюсь с нашей дизайн-системой.'),  // I am still getting my head around
  'i appreciate': x('I appreciate the detailed feedback.', 'Я ценю подробную обратную связь.'),  // I appreciate
  'i can see why some people argue that': x('I can see why some people argue that exams are unfair.', 'Я понимаю, почему некоторые утверждают, что экзамены несправедливы.'),  // I can see why some people argue that
  'i enjoyed our conversation': x('Thank you — I enjoyed our conversation today.', 'Спасибо, мне понравился наш сегодняшний разговор.'),  // I enjoyed our conversation
  'i hear you but': x('I hear you, but the deadline is fixed.', 'Я вас понял, но срок фиксирован.'),  // I hear you, but
  'i hope our paths cross again': x('Thanks again, and I hope our paths cross again.', 'Ещё раз спасибо, надеюсь, наши пути ещё пересекутся.'),  // I hope our paths cross again
  'i see it differently': x('I see it differently: the problem is the copy, not the layout.', 'Я вижу это иначе: проблема в тексте, а не в вёрстке.'),  // I see it differently
  'i see your point': x('I see your point about the timeline.', 'Понимаю вашу мысль насчёт сроков.'),  // I see your point
  'i understand you are busy': x('I understand you are busy, so I will keep this short.', 'Понимаю, что вы заняты, поэтому буду краток.'),  // I understand you are busy
  'i used to': x('I used to cycle to work, but now I walk.', 'Раньше я ездил на работу на велосипеде, а теперь хожу пешком.'),  // I used to
  'i wanted to follow up on': x('I wanted to follow up on my application.', 'Хотел вернуться к вопросу о моей заявке.'),  // I wanted to follow up on
  'i would appreciate': x('I would appreciate an update by Friday.', 'Я был бы признателен за новости к пятнице.'),  // I would appreciate
  'i would be glad to': x('I would be glad to walk you through the file.', 'Я был бы рад провести вас по файлу.'),  // I would be glad to
  'i would push back on': x('I would push back on adding a fourth step.', 'Я бы поспорил с добавлением четвёртого шага.'),  // I would push back on
  'i m currently looking for': x('I\'m currently looking for a mid-level product role.', 'Сейчас я ищу продуктовую роль уровня мидл.'),  // I'm currently looking for
  'i m flexible': x('I\'m flexible between 10:00 and 16:00.', 'Я гибок с 10:00 до 16:00.'),  // I'm flexible
  'if i understand correctly': x('If I understand correctly, you need both mobile and desktop?', 'Если я правильно понял, нужны и мобильный, и десктоп?'),  // If I understand correctly
  'immersion': x('Two weeks of immersion did more than a year of classes.', 'Две недели погружения дали больше года занятий.'),  // immersion
  'impact': x('What was the impact of your redesign?', 'Какой эффект дал ваш редизайн?'),  // impact
  'important / crucial / vital': x('Sleep is important, and for a test day it is crucial.', 'Сон важен, а в день экзамена он ключевой.'),  // important / crucial / vital
  'in a nutshell': x('In a nutshell, we shipped it two weeks late.', 'Если коротко, мы выпустили это на две недели позже.'),  // in a nutshell
  'in contrast': x('In contrast, the mobile version loads instantly.', 'Напротив, мобильная версия грузится мгновенно.'),  // in contrast
  'in fact': x('It looked simple; in fact, it took a month.', 'Выглядело просто; фактически заняло месяц.'),  // in fact
  'in order to': x('I studied motion design in order to expand my toolkit.', 'Я изучал моушн-дизайн, чтобы расширить инструментарий.'),  // in order to
  'in review': x('It should be in review by EOD.', 'К концу дня должно быть на ревью.'),  // in review
  'in the end': x('In the end, we kept the old flow.', 'В итоге мы оставили старый сценарий.'),  // in the end
  'in the same range': x('Let us check we are in the same range before we go further.', 'Давайте убедимся, что мы в одной вилке, прежде чем идти дальше.'),  // in the same range
  'in-house': x('I work in-house at a fintech company.', 'Я работаю в штате финтех-компании.'),  // in-house
  'is a plus': x('Motion design is a plus, not a requirement.', 'Моушн-дизайн — плюс, а не требование.'),  // is a plus
  'is filtered / is heated': x('The water is filtered and then it is heated.', 'Воду фильтруют, а затем нагревают.'),  // is filtered / is heated
  'is there room to move': x('Thank you for the offer. Is there room to move?', 'Спасибо за предложение. Есть ли пространство для манёвра?'),  // Is there room to move?
  'it happened when': x('It happened when we had two days left.', 'Это случилось, когда у нас оставалось два дня.'),  // it happened when
  'it meant a lot to me because': x('It meant a lot to me because it was my first launch.', 'Это было важно для меня, потому что это был мой первый запуск.'),  // it meant a lot to me because
  'it might be worth': x('It might be worth testing with five users first.', 'Возможно, стоит сначала протестировать на пяти пользователях.'),  // it might be worth
  'it varies from country to country': x('Holiday length varies from country to country.', 'Длина отпуска по-разному в разных странах.'),  // it varies from country to country
  'iteration': x('The third iteration finally tested well.', 'Третья итерация наконец показала хороший результат.'),  // iteration
  'it’s often the case that': x('It’s often the case that the first idea is the safest.', 'Часто бывает так, что первая идея — самая безопасная.'),  // it’s often the case that
  'i’d like to talk about': x('I’d like to talk about a project I led last year.', 'Я хотел бы рассказать о проекте, который вёл в прошлом году.'),  // I’d like to talk about
  'i’d say': x('I’d say two weeks is realistic.', 'Я бы сказал, две недели — реалистично.'),  // I’d say
  'job offer': x('I received a job offer on Friday.', 'В пятницу я получил предложение о работе.'),  // job offer
  'job posting': x('The job posting says English is required.', 'В вакансии сказано, что английский обязателен.'),  // job posting
  'just under / just over': x('Just under half of users finished the flow.', 'Чуть меньше половины пользователей прошли сценарий.'),  // just under / just over
  'keyword': x('Underline the keyword in each question.', 'Подчеркните ключевое слово в каждом вопросе.'),  // keyword
  'labelling a map': x('Labelling a map needs directions, not opinions.', 'Подписывание карты требует направлений, а не мнений.'),  // labelling a map
  'lesson learned': x('The lesson learned was to ask earlier.', 'Урок, который я вынес, — спрашивать раньше.'),  // lesson learned
  'let me summarise': x('Let me summarise the three options.', 'Давайте подытожу три варианта.'),  // Let me summarise
  'let us take it offline': x('Good question — let us take it offline.', 'Хороший вопрос, обсудим отдельно.'),  // Let us take it offline
  'lexical resource': x('Lexical resource is not about long words.', 'Словарный запас — не про длинные слова.'),  // lexical resource
  'looking back': x('Looking back, I would run the test earlier.', 'Оглядываясь назад, я бы провёл тест раньше.'),  // looking back
  'looking forward to hearing from you': x('Thank you again. Looking forward to hearing from you.', 'Ещё раз спасибо. Жду вашего ответа.'),  // Looking forward to hearing from you
  'main idea': x('Each paragraph has one main idea.', 'В каждом абзаце одна главная мысль.'),  // main idea
  'mainly because': x('I agree, mainly because communication became shallower.', 'Согласен, главным образом потому, что общение стало поверхностнее.'),  // mainly because
  'marginal gain': x('Ten minutes a day is a marginal gain that adds up.', 'Десять минут в день — небольшой прирост, который накапливается.'),  // marginal gain
  'matching': x('Matching questions are never in text order.', 'Задания на сопоставление никогда не идут по порядку текста.'),  // matching
  'may / might': x('The change may help, though it might be too early to tell.', 'Изменение может помочь, хотя, может быть, судить рано.'),  // may / might
  'measurable': x('Make the goal measurable: two calls a week.', 'Сделайте цель измеримой: два созвона в неделю.'),  // measurable
  'meeting notes': x('I will send the meeting notes tonight.', 'Я пришлю заметки со встречи вечером.'),  // meeting notes
  'memorised phrase': x('A memorised phrase sounds fine until the topic changes.', 'Заученная фраза звучит нормально, пока тема не меняется.'),  // memorised phrase
  'mid-level': x('The posting is for a mid-level designer.', 'Вакансия на дизайнера среднего уровня.'),  // mid-level
  'mock test': x('I do one mock test every Saturday.', 'Каждую субботу я пишу один пробный экзамен.'),  // mock test
  'monologue': x('Part 2 is a two-minute monologue.', 'Вторая часть — двухминутный монолог.'),  // monologue
  'more of a … person': x('I am more of a research person than a visual one.', 'Я скорее человек исследования, чем визуала.'),  // more of a … person
  'motion designer': x('We hired a motion designer for the launch video.', 'Мы наняли моушн-дизайнера для видео к запуску.'),  // motion designer
  'moving on to': x('Moving on to the second question.', 'Переходя ко второму вопросу.'),  // moving on to
  'my only concern': x('My only concern is the deadline.', 'Меня смущает только срок.'),  // my only concern
  'my only concern is': x('My only concern is that we have no research.', 'Меня смущает только то, что у нас нет исследования.'),  // my only concern is
  'nevertheless': x('The data was thin; nevertheless, the direction was clear.', 'Данных было мало; тем не менее направление было ясным.'),  // nevertheless
  'next milestone': x('The next milestone is the beta in April.', 'Следующая веха — бета в апреле.'),  // next milestone
  'next steps': x('Looking forward to the next steps.', 'Жду следующих шагов.'),  // next steps
  'nitpick': x('Everything else is a nitpick and can wait.', 'Всё остальное — придирки и может подождать.'),  // nitpick
  'no blockers': x('No blockers, everything is on track.', 'Блокеров нет, всё идёт по плану.'),  // No blockers
  'no more than two words': x('Write no more than two words for each gap.', 'Пишите не более двух слов в каждый пропуск.'),  // no more than two words
  'no rush': x('No rush, and thanks again for your time.', 'Не срочно, и спасибо за ваше время.'),  // no rush
  'nominalisation': x('"The decision was made" is a nominalisation of "we decided".', '«The decision was made» — превращение глагола «we decided» в существительное.'),  // nominalisation
  'not really': x('Not really, to be honest.', 'Честно говоря, не особо.'),  // not really
  'notice period': x('My notice period is one month.', 'Мой срок отработки — месяц.'),  // notice period
  'nowadays / in recent years': x('Nowadays most teams are remote, and in recent years that has grown.', 'В наши дни большинство команд удалённые, и в последние годы этого стало больше.'),  // nowadays / in recent years
  'off-topic': x('The third paragraph is off-topic and costs you a band.', 'Третий абзац не по теме и стоит вам балла.'),  // off-topic
  'on second thought': x('On second thought, let us keep the old name.', 'Если подумать, давайте оставим старое название.'),  // on second thought
  'on the outskirts': x('They live on the outskirts of the city.', 'Они живут на окраине города.'),  // on the outskirts
  'on the whole': x('On the whole, the launch went well.', 'В целом запуск прошёл хорошо.'),  // on the whole
  'onboarding': x('I have been working on the onboarding flow for two weeks.', 'Я две недели работаю над онбордингом.'),  // onboarding
  'once … has been': x('Once the design has been approved, dev starts.', 'После того как дизайн утверждён, начинается разработка.'),  // once … has been
  'one-on-one': x('I have a one-on-one with my lead every second week.', 'У меня личная встреча с лидом раз в две недели.'),  // one-on-one
  'one-pager': x('Send a one-pager, not a ten-page deck.', 'Пришлите резюме на одну страницу, а не презентацию на десять.'),  // one-pager
  'open to work': x('My profile says "open to work" only to recruiters.', 'В профиле «открыт к предложениям» видно только рекрутёрам.'),  // open to work
  'outcome': x('The outcome was a 20% drop in support tickets.', 'Итог — падение обращений в поддержку на 20%.'),  // outcome
  'overall': x('Overall, the release went better than expected.', 'В целом релиз прошёл лучше ожидаемого.'),  // overall
  'overall band score': x('My overall band score was 7.', 'Мой итоговый балл был 7.'),  // overall band score
  'overgeneralisation': x('"Everyone hates ads" is an overgeneralisation.', '«Все ненавидят рекламу» — чрезмерное обобщение.'),  // overgeneralisation
  'overlap': x('We ask that you overlap with CET for four hours a day.', 'Мы просим пересекаться с центральноевропейским временем на четыре часа в день.'),  // overlap
  'paragraph function': x('Each paragraph function is different: one problem, one solution.', 'У каждого абзаца своя роль: один — проблема, другой — решение.'),  // paragraph function
  'participle clause': x('Having finished the report, she left.', 'Закончив отчёт, она ушла.'),  // participle clause
  'passage': x('The third passage is always the hardest.', 'Третий текст всегда самый трудный.'),  // passage
  'people tend to': x('People tend to skip the first screen.', 'Люди склонны пропускать первый экран.'),  // people tend to
  'per my last email': x('Per my last email, the files are in the folder.', 'Как я писал ранее, файлы в папке.'),  // Per my last email
  'please find attached': x('Please find attached the updated screens.', 'Во вложении обновлённые экраны.'),  // Please find attached
  'possible solutions': x('Give two possible solutions in the third paragraph.', 'Дайте два возможных решения в третьем абзаце.'),  // possible solutions
  'prefix un- / dis- / over-': x('The prefix un- makes "clear" into "unclear".', 'Приставка un- превращает clear в unclear.'),  // prefix un- / dis- / over-
  'previous role': x('In my previous role I led a team of four.', 'На предыдущей должности я вёл команду из четырёх человек.'),  // previous role
  'priority': x('Accessibility is a priority, not a nice-to-have.', 'Доступность — приоритет, а не приятное дополнение.'),  // priority
  'probation period': x('The first three months are a probation period.', 'Первые три месяца — испытательный срок.'),  // probation period
  'problem statement': x('One sentence is enough for a problem statement.', 'Для формулировки проблемы хватает одного предложения.'),  // problem statement
  'product designer': x('I am a product designer with four years of experience.', 'Я продуктовый дизайнер с четырьмя годами опыта.'),  // product designer
  'proficient in': x('I am proficient in Figma and prototyping.', 'Я свободно владею Figma и прототипированием.'),  // proficient in
  'prototype': x('The prototype was tested with eight users.', 'Прототип протестировали на восьми пользователях.'),  // prototype
  'provided that': x('I can start in May, provided that the contract is signed.', 'Я могу начать в мае при условии, что договор подписан.'),  // provided that
  'questionable': x('The data behind that claim is questionable.', 'Данные за этим утверждением сомнительны.'),  // questionable
  'quick call': x('Do you have time for a quick call?', 'Найдётся время на короткий созвон?'),  // quick call
  'raw material': x('The raw material comes from three countries.', 'Сырьё приходит из трёх стран.'),  // raw material
  'ready for dev': x('The flow is ready for dev, all states included.', 'Сценарий готов к разработке, все состояния включены.'),  // ready for dev
  'recruiter': x('The recruiter wrote to me on Monday.', 'Рекрутёр написал мне в понедельник.'),  // recruiter
  'references': x('I can send references from two previous managers.', 'Я могу прислать рекомендации от двух прошлых руководителей.'),  // references
  'referencing': x('Referencing with "this trend" keeps the essay short.', 'Отсылка через «this trend» делает эссе короче.'),  // referencing
  'relevant': x('Only the last two projects are relevant here.', 'Здесь уместны только два последних проекта.'),  // relevant
  'remote / hybrid / on-site': x('Is the role remote, hybrid or on-site?', 'Роль удалённая, гибридная или в офисе?'),  // remote / hybrid / on-site
  'requirement': x('Experience with design systems is a plus, not a requirement.', 'Опыт с дизайн-системами — плюс, а не обязательное требование.'),  // requirement
  'respectively': x('Sales rose 10% and 4% in May and June respectively.', 'Продажи выросли на 10% и 4% в мае и июне соответственно.'),  // respectively
  'retention': x('Retention matters more than signups.', 'Удержание важнее регистраций.'),  // retention
  'roadmap': x('The roadmap for this quarter has three items.', 'В плане развития на этот квартал три пункта.'),  // roadmap
  'roughly / approximately': x('It takes roughly two weeks, approximately ten working days.', 'Это занимает примерно две недели, около десяти рабочих дней.'),  // roughly / approximately
  'run-on sentence': x('Break that run-on sentence into two.', 'Разбейте это предложение без пунктуации на два.'),  // run-on sentence
  'salary expectations': x('Could you let me know your salary expectations?', 'Не подскажете ваши зарплатные ожидания?'),  // salary expectations
  'salary range': x('What is the salary range for this role?', 'Какая зарплатная вилка у этой роли?'),  // salary range
  'scope': x('If the scope grows, I will need an extra day.', 'Если объём вырастет, мне нужен ещё день.'),  // scope
  'screening call': x('The screening call takes twenty minutes.', 'Первичный звонок занимает двадцать минут.'),  // screening call
  'shall we get started': x('Everyone is here. Shall we get started?', 'Все на месте. Начнём?'),  // Shall we get started?
  'sheep': x('The farm keeps forty sheep.', 'На ферме держат сорок овец.'),  // sheep
  'shift in focus': x('There has been a shift in focus from growth to retention.', 'Произошла смена фокуса с роста на удержание.'),  // shift in focus
  'shortlist': x('I am on the shortlist for two roles.', 'Я в списке финалистов по двум вакансиям.'),  // shortlist
  'significant / substantial': x('There was a significant drop and a substantial saving.', 'Было значительное падение и существенная экономия.'),  // significant / substantial
  'signpost language': x('Signpost language tells the examiner where you are going.', 'Слова-указатели показывают экзаменатору, куда вы идёте.'),  // signpost language
  'signposting': x('Signposting is half of a clear presentation.', 'Указание структуры — половина понятного выступления.'),  // signposting
  'situation': x('Describe the situation in two sentences.', 'Опишите ситуацию в двух предложениях.'),  // situation
  'skills': x('The skills section should list six, not sixty.', 'В разделе навыков должно быть шесть пунктов, а не шестьдесят.'),  // skills
  'sorry could you repeat that': x('Sorry, could you repeat that? The line dropped.', 'Простите, можете повторить? Связь пропала.'),  // Sorry, could you repeat that?
  'sorry i meant': x('Sorry, I meant Wednesday, not Tuesday.', 'Простите, я имел в виду среду, а не вторник.'),  // sorry, I meant
  'stakeholder': x('Every stakeholder saw the flow before dev started.', 'Каждая заинтересованная сторона видела сценарий до старта разработки.'),  // stakeholder
  'stand-up': x('The stand-up takes ten minutes every morning.', 'Стендап занимает десять минут каждое утро.'),  // stand-up
  'start date': x('The start date is 15 September.', 'Дата выхода — 15 сентября.'),  // start date
  'strength': x('My main strength is structure under pressure.', 'Моя главная сильная сторона — структура под давлением.'),  // strength
  'strong point': x('Research is my strong point, visuals less so.', 'Исследование — моя сильная сторона, визуал меньше.'),  // strong point
  'subordinate clause': x('One subordinate clause per sentence is enough.', 'Одного придаточного на предложение достаточно.'),  // subordinate clause
  'subsequently': x('The test failed and the launch was subsequently delayed.', 'Тест провалился, и запуск впоследствии отложили.'),  // subsequently
  'suffix -less / -ful': x('The suffix -less turns "use" into "useless".', 'Суффикс -less превращает use в useless.'),  // suffix -less / -ful
  'summary': x('The summary at the top is three lines long.', 'Краткое описание сверху — в три строки.'),  // summary
  'supporting detail': x('Each idea needs one supporting detail.', 'Каждой мысли нужна одна подкрепляющая деталь.'),  // supporting detail
  'surprisingly': x('Surprisingly, the older version tested better.', 'Что удивительно, старая версия показала себя лучше.'),  // surprisingly
  'synonym': x('Use a synonym instead of repeating the keyword.', 'Используйте синоним вместо повтора ключевого слова.'),  // synonym
  'tailored': x('Every CV should be tailored to the posting.', 'Каждое резюме должно быть адаптировано под вакансию.'),  // tailored
  'takeaway': x('My main takeaway was to test earlier.', 'Мой главный вывод — тестировать раньше.'),  // takeaway
  'target band': x('My target band is 7.5 in writing.', 'Мой целевой балл — 7,5 за письмо.'),  // target band
  'task response': x('Task response is about answering the question asked.', 'Соответствие заданию — это про ответ на поставленный вопрос.'),  // task response
  'team structure': x('Could you describe the team structure?', 'Можете описать структуру команды?'),  // team structure
  'tell me about a time when': x('Tell me about a time when a project went wrong.', 'Расскажите о случае, когда проект пошёл не так.'),  // Tell me about a time when
  'test day routine': x('My test day routine is coffee, warm-up, no news.', 'Мой порядок в день экзамена: кофе, разминка, никаких новостей.'),  // test day routine
  'test task': x('The test task took four hours, and it was unpaid.', 'Тестовое задание заняло четыре часа и было неоплачиваемым.'),  // test task
  'thank-you note': x('Send a short thank-you note the same day.', 'Отправьте короткое письмо с благодарностью в тот же день.'),  // thank-you note
  'thanks for having me': x('Thanks for having me — it was a great conversation.', 'Спасибо, что пригласили, — это был отличный разговор.'),  // Thanks for having me
  'that s fair': x('That\'s fair, let us go with your version.', 'Справедливо, пойдём с вашим вариантом.'),  // That's fair
  'that’s why': x('The API was late, that’s why we moved the date.', 'API опоздал, вот почему мы сдвинули дату.'),  // that’s why
  'final stage': x('The final stage is a call with the head of design.', 'Заключительный этап — созвон с главой дизайна.'),  // the final stage
  'former / the latter': x('Figma and Sketch are both fine; I prefer the former.', 'Figma и Sketch оба хороши; я предпочитаю первый.'),  // the former / the latter
  'key decision': x('The key decision was to drop the second screen.', 'Ключевое решение — убрать второй экран.'),  // the key decision
  'main causes': x('The main causes are cost and distance.', 'Основные причины — цена и расстояние.'),  // the main causes
  'only': x('It is the only screen we did not test.', 'Это единственный экран, который мы не тестировали.'),  // the only
  'reason i chose': x('The reason I chose design was the research part.', 'Причина, по которой я выбрал дизайн, — исследовательская часть.'),  // the reason I chose
  'risk with that is': x('The risk with that is we ship late.', 'Риск здесь в том, что мы выпустим позже.'),  // the risk with that is
  'second factor': x('The second factor is cost.', 'Второй фактор — стоимость.'),  // the second factor
  'withdraw consent': x('You can withdraw consent at any time.', 'Согласие можно отозвать в любой момент.'),
  'writer’s stance': x('The writer’s stance is critical, but never stated directly.', 'Позиция автора критическая, но прямо не высказана.'),  // the writer’s stance
  'thereby / thus': x('We cut two steps, thereby saving a minute; thus orders grew.', 'Мы убрали два шага, тем самым сэкономив минуту; таким образом заказы выросли.'),  // thereby / thus
  'therefore': x('The form was too long; therefore, we simplified it.', 'Форма была слишком длинной, поэтому мы её упростили.'),  // therefore
  'there’s a lot to be said for': x('There’s a lot to be said for starting small.', 'Многое говорит в пользу того, чтобы начать с малого.'),  // there’s a lot to be said for
  'these days': x('These days I read more than I write.', 'В последнее время я больше читаю, чем пишу.'),  // these days
  'thesis statement': x('Put the thesis statement at the end of the introduction.', 'Формулировку позиции ставьте в конце введения.'),  // thesis statement
  'this brings us to': x('This brings us to the cost.', 'Это приводит нас к стоимости.'),  // this brings us to
  'this means that': x('This means that we need one more week.', 'Это означает, что нам нужна ещё неделя.'),  // this means that
  'this trend / such measures': x('This trend continued, and such measures rarely help.', 'Этот тренд продолжился, и такие меры редко помогают.'),  // this trend / such measures
  'thread': x('Let us keep this in one thread.', 'Давайте держать это в одной ветке.'),  // thread
  'time management': x('Time management is the whole exam, honestly.', 'Управление временем — это, честно говоря, весь экзамен.'),  // time management
  'time zone': x('We are in the same time zone, which helps.', 'Мы в одном часовом поясе, и это помогает.'),  // time zone
  'a certain extent': x('To a certain extent, remote work suits everyone.', 'До определённой степени удалённая работа подходит всем.'),  // to a certain extent
  'accept': x('I am delighted to accept the offer.', 'С радостью принимаю предложение.'),  // to accept
  'acknowledge': x('I acknowledge that the first version was too complex.', 'Признаю, что первая версия была слишком сложной.'),  // to acknowledge
  'address the question': x('Answer the essay prompt directly and address the question asked.', 'Отвечайте прямо на вопрос эссе — именно на поставленный.'),  // to address the question
  'align on': x('Let us align on the scope before we start.', 'Давайте договоримся об объёме до старта.'),  // to align on
  'allocate time': x('Allocate time for each part before you start writing.', 'Распределите время по частям до начала письма.'),  // to allocate time
  'apply': x('To apply, send your CV and portfolio link.', 'Чтобы подать заявку, пришлите резюме и ссылку на портфолио.'),  // to apply
  'apply for': x('I am applying for the Senior Designer position.', 'Я подаю заявку на позицию сеньор-дизайнера.'),  // to apply for
  'assume': x('I assumed the deadline was Friday, and I was wrong.', 'Я предположил, что срок — пятница, и ошибся.'),  // to assume
  'be a good fit': x('I believe I would be a good fit for this team.', 'Думаю, я хорошо подойду этой команде.'),  // to be a good fit
  'be available': x('I am available on Wednesday morning.', 'Я свободен в среду утром.'),  // to be available
  'be balanced': x('A good essay is balanced: both sides get real arguments.', 'Хорошее эссе сбалансировано: у обеих сторон настоящие аргументы.'),  // to be balanced
  'be converted into': x('The old factory was converted into a museum.', 'Старую фабрику превратили в музей.'),  // to be converted into
  'be demolished': x('The bridge was demolished in 2019.', 'Мост снесли в 2019 году.'),  // to be demolished
  'be drawn to': x('I was drawn to this role by the research part.', 'Меня привлекла в этой роли исследовательская часть.'),  // to be drawn to
  'be entitled to': x('Employees are entitled to 30 days of holiday.', 'Сотрудники имеют право на 30 дней отпуска.'),  // to be entitled to
  'be flexible': x('I am flexible between 10:00 and 16:00.', 'Я гибок с 10:00 до 16:00.'),  // to be flexible
  'be fluent in': x('She is fluent in Portuguese and Spanish.', 'Она свободно владеет португальским и испанским.'),  // to be fluent in
  'be intelligible': x('Your accent is fine as long as you are intelligible.', 'Акцент не помеха, пока вас понимают.'),  // to be intelligible
  'be involved in': x('I was involved in the redesign from the start.', 'Я участвовал в редизайне с самого начала.'),  // to be involved in
  'be rejected': x('My first application was rejected without an interview.', 'Первую заявку отклонили без собеседования.'),  // to be rejected
  'be replaced by': x('The old form was replaced by a two-step flow.', 'Старую форму заменили двухшаговым сценарием.'),  // to be replaced by
  'be responsible for': x('I was responsible for the design system.', 'Я отвечал за дизайн-систему.'),  // to be responsible for
  'begin with': x('To begin with, let me explain the problem.', 'Начнём с того, что я объясню задачу.'),  // to begin with
  'catch up': x('I missed a week and need to catch up.', 'Я пропустил неделю, надо догнать.'),  // to catch up
  'cause / to lead to / to result in': x('Long forms cause drop-off and lead to fewer orders.', 'Длинные формы вызывают отвал и приводят к меньшему числу заказов.'),  // to cause / to lead to / to result in
  'check in': x('Let us check in on Friday to see where we are.', 'Давайте свéримся в пятницу, где мы находимся.'),  // to check in
  'come across': x('I came across your job posting on LinkedIn.', 'Я наткнулся на вашу вакансию в LinkedIn.'),  // to come across
  'compromise': x('Neither side wanted to compromise on the deadline.', 'Ни одна сторона не хотела идти на компромисс по срокам.'),  // to compromise
  'contradict': x('The second paragraph contradicts the first one.', 'Второй абзац противоречит первому.'),  // to contradict
  'counter': x('They offered less, so I countered with a range.', 'Они предложили меньше, и я сделал встречное предложение вилкой.'),  // to counter
  'decline': x('I had to decline the offer politely.', 'Мне пришлось вежливо отклонить предложение.'),  // to decline
  'decline gradually': x('Sales declined gradually after March.', 'После марта продажи постепенно снижались.'),  // to decline gradually
  'double-check': x('Let me double-check the numbers before we send it.', 'Дай перепроверю цифры перед отправкой.'),  // to double-check
  'drop off': x('Users drop off on the payment screen.', 'Пользователи уходят на экране оплаты.'),  // to drop off
  'elaborate': x('Could you elaborate on the second point?', 'Можете раскрыть второй пункт подробнее?'),  // to elaborate
  'eliminate': x('Eliminate two options first, then choose.', 'Сначала исключите два варианта, потом выбирайте.'),  // to eliminate
  'escalate': x('If it is blocked for two days, escalate it.', 'Если это заблокировано два дня — выносите на уровень выше.'),  // to escalate
  'find middle ground': x('We found middle ground: fewer screens, same deadline.', 'Мы нашли середину: меньше экранов, тот же срок.'),  // to find middle ground
  'flag': x('I want to flag a risk with the timeline.', 'Хочу обратить внимание на риск по срокам.'),  // to flag
  'fluctuate': x('Prices fluctuated between March and June.', 'Цены колебались с марта по июнь.'),  // to fluctuate
  'follow up': x('I wanted to follow up on our conversation last week.', 'Хотел вернуться к нашему разговору на прошлой неделе.'),  // to follow up
  'get set up': x('It took two days to get set up with all the accesses.', 'Два дня ушло, чтобы настроить все доступы.'),  // to get set up
  'get to know each other': x('This call is just to get to know each other.', 'Этот созвон — просто чтобы познакомиться.'),  // to get to know each other
  'get up to speed': x('Give me a week to get up to speed.', 'Дайте неделю войти в курс дела.'),  // to get up to speed
  'grow into': x('I want to grow into a lead role in two years.', 'Я хочу дорасти до лида за два года.'),  // to grow into
  'hand off to': x('I will hand this off to the developer on Monday.', 'В понедельник я передам это разработчику.'),  // to hand off to
  'hand over': x('I will hand over to Anna for the numbers.', 'Передаю слово Анне — она про цифры.'),  // to hand over
  'handle': x('How did you handle the disagreement?', 'Как вы справились с разногласием?'),  // to handle
  'identify a weakness': x('Write a mock test to identify a weakness early.', 'Напишите пробный тест, чтобы рано выявить слабое место.'),  // to identify a weakness
  'imply': x('The writer implies that the law failed.', 'Автор подразумевает, что закон не сработал.'),  // to imply
  'improve': x('I want to improve my speaking, not my grammar.', 'Я хочу улучшить говорение, а не грамматику.'),  // to improve
  'increase': x('We increased conversion by 18%.', 'Мы увеличили конверсию на 18%.'),  // to increase
  'increase / a rise in': x('Traffic increased in May, and there was a rise in signups.', 'Трафик вырос в мае, и был рост регистраций.'),  // to increase / a rise in
  'iterate': x('We iterate every week, not every quarter.', 'Мы итерируем каждую неделю, а не каждый квартал.'),  // to iterate
  'iterate on': x('We iterated on the checkout twice.', 'Мы дважды доработали чекаут.'),  // to iterate on
  'join': x('I joined the team in 2022.', 'Я пришёл в команду в 2022 году.'),  // to join
  'keep in touch': x('Let us keep in touch.', 'Давайте оставаться на связи.'),  // to keep in touch
  'keep me posted': x('Please keep me posted on the release.', 'Держите меня в курсе по релизу.'),  // to keep me posted
  'keep practising': x('Keep practising ten minutes a day.', 'Продолжайте практиковаться по десять минут в день.'),  // to keep practising
  'kick off': x('We kick off the project on Monday.', 'Мы начинаем проект в понедельник.'),  // to kick off
  'launch': x('We launched the app in three countries.', 'Мы запустили приложение в трёх странах.'),  // to launch
  'leave': x('I left the agency after two years.', 'Я ушёл из агентства через два года.'),  // to leave
  'level up': x('I want to level up my research skills.', 'Я хочу вырасти в уровне в исследованиях.'),  // to level up
  'locate information': x('Scan the text to locate information quickly.', 'Просканируйте текст, чтобы быстро найти нужное место.'),  // to locate information
  'loop someone in': x('Let me loop in our developer.', 'Подключу к обсуждению нашего разработчика.'),  // to loop someone in
  'maintain': x('It is harder to maintain a level than to reach it.', 'Поддерживать уровень труднее, чем его достичь.'),  // to maintain
  'match': x('Match each name to the right description.', 'Сопоставьте каждое имя с нужным описанием.'),  // to match
  'move forward with': x('Let us move forward with the second option.', 'Давайте пойдём дальше со вторым вариантом.'),  // to move forward with
  'optimise': x('We optimised the flow for one hand.', 'Мы оптимизировали сценарий под одну руку.'),  // to optimise
  'outline': x('Outline the essay for three minutes before writing.', 'Набросайте план эссе за три минуты до письма.'),  // to outline
  'outweigh': x('The benefits outweigh the cost here.', 'Здесь плюсы перевешивают затраты.'),  // to outweigh
  'overlap with': x('My hours overlap with yours until 16:00.', 'Мои часы пересекаются с вашими до 16:00.'),  // to overlap with
  'overstate': x('Do not overstate the result: it was one test.', 'Не преувеличивайте результат: это был один тест.'),  // to overstate
  'own': x('I own the onboarding flow end to end.', 'Я отвечаю за онбординг от начала до конца.'),  // to own
  'paraphrase': x('Paraphrase the question instead of copying it.', 'Перефразируйте вопрос вместо того, чтобы копировать его.'),  // to paraphrase
  'park it': x('Let us park it and come back after the demo.', 'Давайте отложим и вернёмся после демо.'),  // to park it
  'peak at': x('Sales peaked at 40,000 in December.', 'Продажи достигли максимума в 40 000 в декабре.'),  // to peak at
  'plateau': x('My score plateaued at 6.5 for two months.', 'Мой балл вышел на плато 6,5 на два месяца.'),  // to plateau
  'play a key role': x('Research played a key role in this project.', 'Исследование сыграло ключевую роль в этом проекте.'),  // to play a key role
  'pose a threat': x('Cheap flights pose a threat to trains.', 'Дешёвые перелёты представляют угрозу поездам.'),  // to pose a threat
  'prioritise': x('We prioritised speed over polish this sprint.', 'В этом спринте мы расставили приоритеты в пользу скорости.'),  // to prioritise
  'push back': x('I pushed back and asked for one more week.', 'Я возразил и попросил ещё неделю.'),  // to push back
  'push back on scope': x('I had to push back on scope, not on the deadline.', 'Мне пришлось оспорить объём, а не срок.'),  // to push back on scope
  'raise awareness': x('The campaign raised awareness of the problem.', 'Кампания повысила осведомлённость о проблеме.'),  // to raise awareness
  'reach out': x('I am reaching out about the Product Designer role.', 'Пишу вам по поводу вакансии продуктового дизайнера.'),  // to reach out
  'recap': x('To recap: two options, one deadline.', 'Подведу итог: два варианта, один срок.'),  // to recap
  'redesign': x('We redesigned the settings screen last month.', 'В прошлом месяце мы переделали экран настроек.'),  // to redesign
  'reduce': x('We reduced support tickets by a third.', 'Мы сократили обращения в поддержку на треть.'),  // to reduce
  'rephrase': x('Let me rephrase that more simply.', 'Дайте переформулирую проще.'),  // to rephrase
  'rethink': x('We had to rethink the whole onboarding.', 'Нам пришлось переосмыслить весь онбординг.'),  // to rethink
  'rise sharply': x('Prices rose sharply after 2020.', 'После 2020 года цены резко выросли.'),  // to rise sharply
  'scan': x('Scan the page for numbers and names.', 'Просканируйте страницу на числа и имена.'),  // to scan
  'schedule': x('Can we schedule a call for Thursday?', 'Можем назначить созвон на четверг?'),  // to schedule
  'screen': x('They screen every CV before the first call.', 'Они отсеивают резюме до первого звонка.'),  // to screen
  'shadow someone': x('I shadowed a senior designer for a week.', 'Я неделю ходил за сеньор-дизайнером и смотрел, как он работает.'),  // to shadow someone
  'ship': x('We ship every second Thursday.', 'Мы выпускаем каждый второй четверг.'),  // to ship
  'skim': x('Skim the text first, then read the questions.', 'Сначала просмотрите текст, потом читайте вопросы.'),  // to skim
  'skip a question': x('It is fine to skip a question and come back.', 'Нормально пропустить вопрос и вернуться.'),  // to skip a question
  'skip and return': x('Skip and return: two minutes per question, no more.', 'Пропустить и вернуться: две минуты на вопрос, не больше.'),  // to skip and return
  'solve / to tackle / to address': x('We solved the bug, tackled the load time and addressed the copy.', 'Мы решили баг, взялись за время загрузки и разобрались с текстом.'),  // to solve / to tackle / to address
  'specialise in': x('I specialise in mobile interfaces.', 'Я специализируюсь на мобильных интерфейсах.'),  // to specialise in
  'spell out': x('Could you spell out your surname?', 'Можете произнести фамилию по буквам?'),  // to spell out
  'state explicitly': x('The posting states explicitly that English is required.', 'В объявлении прямо сказано, что английский обязателен.'),  // to state explicitly
  'strike a balance': x('We struck a balance between speed and quality.', 'Мы нашли баланс между скоростью и качеством.'),  // to strike a balance
  'substantiate': x('Substantiate the claim with one number.', 'Подкрепите утверждение одной цифрой.'),  // to substantiate
  'sum up': x('To sum up, the second option is cheaper.', 'Подводя итог, второй вариант дешевле.'),  // to sum up
  'summarise': x('Summarise the report in three sentences.', 'Сформулируйте отчёт кратко, в трёх предложениях.'),  // to summarise
  'sync': x('Let us sync on Monday morning.', 'Давайте свéримся в понедельник утром.'),  // to sync
  'sync with': x('I sync with the developers every Tuesday.', 'Я синхронизируюсь с разработчиками каждый вторник.'),  // to sync with
  'take on board': x('I will take that on board for the next round.', 'Приму это к сведению для следующего раунда.'),  // to take on board
  'tend to': x('Younger users tend to prefer mobile apps.', 'Молодые пользователи склонны предпочитать мобильные приложения.'),  // to tend to
  'touch base': x('Let us touch base on Friday.', 'Давайте свяжемся в пятницу.'),  // to touch base
  'underline': x('Underline the two words that limit the question.', 'Подчеркните два слова, которые ограничивают вопрос.'),  // to underline
  'validate': x('We validated the idea with a paper prototype.', 'Мы проверили идею на бумажном прототипе.'),  // to validate
  'what extent do you agree': x('To what extent do you agree with this statement?', 'Насколько вы согласны с этим утверждением?'),  // to what extent do you agree
  'work on': x('I worked on a banking app for two years.', 'Я два года работал над банковским приложением.'),  // to work on
  'wrap up': x('Let us wrap up, we are out of time.', 'Давайте подытожим, время вышло.'),  // to wrap up
  'zoom in on': x('Let me zoom in on the second number.', 'Остановлюсь подробнее на второй цифре.'),  // to zoom in on
  'today i am picking up': x('Today I am picking up the payment screens.', 'Сегодня я берусь за экраны оплаты.'),  // Today I am picking up
  'topic sentence': x('The topic sentence tells the reader what the paragraph is about.', 'Первое предложение абзаца говорит читателю, о чём абзац.'),  // topic sentence
  'trade-off': x('Every deadline is a trade-off with scope.', 'Любой срок — компромисс с объёмом.'),  // trade-off
  'transfer your answers': x('You have ten minutes to transfer your answers.', 'У вас десять минут, чтобы перенести ответы в бланк.'),  // transfer your answers
  'turnaround': x('The usual turnaround is two working days.', 'Обычный срок выполнения — два рабочих дня.'),  // turnaround
  'under exam conditions': x('Practise under exam conditions at least twice.', 'Тренируйтесь в условиях экзамена хотя бы дважды.'),  // under exam conditions
  'under-length': x('An under-length essay loses marks automatically.', 'Эссе короче требуемого объёма автоматически теряет баллы.'),  // under-length
  'unpaid': x('The internship was unpaid, so I left.', 'Стажировка была неоплачиваемой, поэтому я ушёл.'),  // unpaid
  'usability testing': x('Usability testing with five people found the bug.', 'Юзабилити-тестирование с пятью людьми нашло эту ошибку.'),  // usability testing
  'user interview': x('I ran six user interviews in one week.', 'Я провёл шесть интервью с пользователями за неделю.'),  // user interview
  'ux/ui designer': x('I work as a UX/UI designer in a team of six.', 'Я работаю UX/UI-дизайнером в команде из шести человек.'),  // UX/UI designer
  'valid concern': x('That is a valid concern, let us check the data.', 'Это справедливое опасение, давайте проверим данные.'),  // valid concern
  'walk': x('It is a ten-minute walk to the station.', 'До станции десять минут пешком.'),  // walk
  'walk you through': x('Let me walk you through the process.', 'Давайте я проведу вас по процессу.'),  // walk you through
  'weakness': x('My weakness is saying yes too fast.', 'Моя слабая сторона — слишком быстро соглашаться.'),  // weakness
  'weekend plans': x('Any weekend plans?', 'Есть планы на выходные?'),  // weekend plans
  'west': x('The office is in the west of the city.', 'Офис на западе города.'),  // west
  'wfh': x('I wfh on Fridays.', 'По пятницам я работаю из дома.'),  // wfh
  'what does success look like': x('What does success look like in this role after six months?', 'Как выглядит успех в этой роли через полгода?'),  // What does success look like
  'what draws me to': x('What draws me to this team is the research culture.', 'Что меня привлекает в этой команде — культура исследований.'),  // what draws me to
  'what i enjoy most is': x('What I enjoy most is turning a mess into a flow.', 'Больше всего мне нравится превращать хаос в сценарий.'),  // What I enjoy most is
  'what i m looking for next': x('What I\'m looking for next is a smaller team.', 'Дальше я ищу команду поменьше.'),  // What I'm looking for next
  'what if we': x('What if we ship the first screen only?', 'А что если мы выпустим только первый экран?'),  // What if we
  'what struck me was': x('What struck me was how quiet the room went.', 'Что меня поразило, так это как затихла комната.'),  // what struck me was
  'what this shows is': x('What this shows is that people never read the hint.', 'Это показывает, что подсказку никто не читает.'),  // What this shows is
  'what was the thinking behind': x('What was the thinking behind keeping the third step?', 'Какая была мысль за тем, чтобы оставить третий шаг?'),  // What was the thinking behind
  'where do i find': x('Where do I find the design tokens?', 'Где найти дизайн-токены?'),  // Where do I find
  'whereas / while': x('I prefer research, whereas she prefers visuals.', 'Я предпочитаю исследование, тогда как она — визуал.'),  // whereas / while
  'which / that': x('The screen that we tested is the one which converted.', 'Экран, который мы тестировали, — тот, который конвертировал.'),  // which / that
  'which in turn': x('Loading got faster, which in turn raised conversion.', 'Загрузка ускорилась, что, в свою очередь, подняло конверсию.'),  // which in turn
  'wireframe': x('I send a wireframe before any visual design.', 'Я присылаю каркас до любого визуала.'),  // wireframe
  'word match': x('A word match is usually a trap, not the answer.', 'Совпадение слов обычно ловушка, а не ответ.'),  // word match
  'word stress': x('Word stress changes the meaning: REcord and reCORD.', 'Ударение в слове меняет смысл: REcord и reCORD.'),  // word stress
  'work experience': x('I have four years of work experience in product design.', 'У меня четыре года опыта работы в продуктовом дизайне.'),  // work experience
  'working proficiency': x('My English is working proficiency, not native.', 'Мой английский — рабочий уровень, не носитель.'),  // working proficiency
  'yesterday i finished': x('Yesterday I finished the wireframes for checkout.', 'Вчера я закончил каркасы для оплаты.'),  // Yesterday I finished
  'you re breaking up': x('You\'re breaking up — could you turn off video?', 'Вас прерывает — можете выключить видео?'),  // You're breaking up
  'young people / the younger generation': x('Young people move often, and the younger generation rents longer.', 'Молодёжь часто переезжает, и молодое поколение дольше снимает жильё.'),  // young people / the younger generation
}
