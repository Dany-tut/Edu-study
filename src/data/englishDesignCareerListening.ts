// ─────────────────────────────────────────────────────────────────────────────
// Аудирование для курса «Английский для дизайнера»
//
// ПОЧЕМУ ОТДЕЛЬНЫМ ФАЙЛОМ И ПОЧЕМУ ПОЗЖЕ ОСТАЛЬНОГО. Курс писался первым — до
// того как в реестре появились языковые типы заданий. Из-за этого он остался
// на семи базовых типах, и во всех 28 юнитах не было НИ ОДНОГО задания на слух.
// Для языкового курса это дыра: человек готовится к собеседованиям и созвонам,
// то есть ровно к ситуациям, где надо понимать речь, а тренирует только чтение
// и письмо. Аудит это и показал.
//
// ЧТО ЗДЕСЬ. По два задания на юнит: диктант (услышал → напечатал) и сборка
// услышанного из плиток. Фразы взяты не случайные, а те самые, которые ученик
// реально услышит в своей ситуации: голосовое от рекрутёра, реплика на
// планёрке, вопрос на собеседовании.
//
// ЗВУК берётся синтезом по тексту и кэшируется — файлов курс за собой не тянет.
// Оговорка та же, что везде: браузерный синтез годится для тренировки
// понимания, но не как эталон произношения.
// ─────────────────────────────────────────────────────────────────────────────

import { dictation, dictationBank, type SeedTask } from './languageCourse'

/** Задания на слух по shortId юнита. Добавляются к основным в сборке курса. */
export const ENDC_LISTENING: Record<string, SeedTask[]> = {
  'endc-01': [
    dictation('Прослушай и запиши, как человек представляется.', "I'm a product designer with four years of experience."),
    dictationBank('Собери услышанное из плиток.', 'I specialise in mobile interfaces.', ['specialist', 'on']),
  ],
  'endc-02': [
    dictation('Запиши, что услышал про опыт работы.', 'I joined the team in 2022 and worked there for two years.'),
    dictationBank('Собери услышанное.', 'I was responsible for the design system.', ['am', 'responsibility']),
  ],
  'endc-03': [
    dictation('Запиши достижение так, как оно прозвучало.', 'I have increased conversion by eighteen percent.'),
    dictationBank('Собери услышанное.', 'We reduced support tickets by a third.', ['increased', 'half']),
  ],
  'endc-04': [
    dictation('Запиши строку резюме.', 'Redesigned the checkout flow and cut drop-off by a quarter.'),
    dictationBank('Собери услышанное.', 'Proficient in Figma and prototyping.', ['with', 'at']),
  ],
  'endc-05': [
    dictation('Запиши фразу из описания проекта.', 'The prototype was tested with eight users.'),
    dictationBank('Собери услышанное.', 'The research was conducted over three weeks.', ['is', 'during']),
  ],
  'endc-06': [
    dictation('Запиши предложение со связкой.', 'Users dropped off at step three, so we simplified the form.'),
    dictationBank('Собери услышанное.', 'However, the first prototype did not solve the problem.', ['because', 'and']),
  ],
  'endc-07': [
    dictation('Запиши вежливую просьбу из письма.', 'Could you send me the details before Friday?'),
    dictationBank('Собери услышанное.', 'I would be glad to discuss the role with you.', ['want', 'am']),
  ],
  'endc-08': [
    dictation('Запиши строку из сопроводительного письма.', 'I am applying for the Senior Product Designer position.'),
    dictationBank('Собери услышанное.', 'I believe I would be a good fit for this team.', ['am', 'best']),
  ],
  'endc-09': [
    dictation('Запиши, что сказали про отбор резюме.', 'My application was filtered out by the tracking system.'),
    dictationBank('Собери услышанное.', 'I am open to new product design opportunities.', ['was', 'were']),
  ],
  'endc-10': [
    dictation('Прослушай сообщение рекрутёра и запиши.', 'I would like to schedule a short call this week.'),
    dictationBank('Собери услышанное.', 'What are you looking for in your next role?', ['do', 'is']),
  ],
  'endc-11': [
    dictation('Запиши фразу из начала созвона.', 'Sorry, you are breaking up — could you say that again?'),
    dictationBank('Собери услышанное.', 'Thanks for having me today.', ['have', 'to']),
  ],
  'endc-12': [
    dictation('Запиши начало рассказа о себе.', 'Currently I work as a product designer at a fintech company.'),
    dictationBank('Собери услышанное.', 'What I am looking for next is a smaller team.', ['want', 'was']),
  ],
  'endc-13': [
    dictation('Запиши поведенческий вопрос.', 'Tell me about a time when you disagreed with a colleague.'),
    dictationBank('Собери услышанное.', 'While we were working on the redesign, the deadline moved.', ['work', 'have']),
  ],
  'endc-14': [
    dictation('Запиши фразу из защиты портфолио.', 'Let me walk you through the process step by step.'),
    dictationBank('Собери услышанное.', 'What this shows is that users skipped the second step.', ['show', 'was']),
  ],
  'endc-15': [
    dictation('Запиши, как приняли замечание.', 'That is fair — could you say more about what feels off?'),
    dictationBank('Собери услышанное.', 'I see your point, and I will iterate on it.', ['sees', 'am']),
  ],
  'endc-16': [
    dictation('Запиши смягчённое замечание.', 'I wonder if the contrast might be an issue on small screens.'),
    dictationBank('Собери услышанное.', 'What was the thinking behind this navigation pattern?', ['is', 'were']),
  ],
  'endc-17': [
    dictation('Запиши вопрос кандидата.', 'What does success look like in the first three months?'),
    dictationBank('Собери услышанное.', 'How do you usually involve designers in the roadmap?', ['are', 'is']),
  ],
  'endc-18': [
    dictation('Запиши письмо-напоминание.', 'I wanted to follow up on our conversation last week.'),
    dictationBank('Собери услышанное.', 'I really enjoyed our conversation about the design system.', ['have', 'was']),
  ],
  'endc-19': [
    dictation('Запиши уточняющий вопрос по брифу.', 'Am I right in thinking the deliverable is one screen?'),
    dictationBank('Собери услышанное.', 'If the scope grows, I will need an extra day.', ['would', 'was']),
  ],
  'endc-20': [
    dictation('Запиши фразу из переговоров.', 'I was hoping for something in the range we discussed.'),
    dictationBank('Собери услышанное.', 'Is there room to move on the base salary?', ['are', 'was']),
  ],
  'endc-21': [
    dictation('Запиши принятие оффера.', 'I am delighted to accept the offer and can start in September.'),
    dictationBank('Собери услышанное.', 'I hope our paths cross again in the future.', ['was', 'were']),
  ],
  'endc-22': [
    dictation('Запиши вопрос новичка.', 'Who should I ask about design system access?'),
    dictationBank('Собери услышанное.', 'I am still getting my head around the codebase.', ['was', 'were']),
  ],
  'endc-23': [
    dictation('Запиши обновление для руководителя.', 'I have been working on the onboarding flow for two weeks.'),
    dictationBank('Собери услышанное.', 'My main blocker is that I am waiting on the copy.', ['are', 'was']),
  ],
  'endc-24': [
    dictation('Запиши реплику со стендапа.', 'Yesterday I finished the wireframes and today I am picking up checkout.'),
    dictationBank('Собери услышанное.', 'I am blocked on the API response format.', ['was', 'have']),
  ],
  'endc-25': [
    dictation('Запиши сообщение из чата.', 'Heads up — working from home today, back online at two.'),
    dictationBank('Собери услышанное.', 'Circling back on the pricing page feedback.', ['am', 'was']),
  ],
  'endc-26': [
    dictation('Запиши смягчённое несогласие.', 'I am not sure I agree — the risk is that we lose the second step.'),
    dictationBank('Собери услышанное.', 'What if we tested both versions first?', ['test', 'testing']),
  ],
  'endc-27': [
    dictation('Запиши итог клиентского созвона.', 'Let me summarise: you will send the copy by Friday.'),
    dictationBank('Собери услышанное.', 'Does that work for you and your team?', ['is', 'are']),
  ],
  'endc-28': [
    dictation('Запиши ответ коллеге в чате.', 'Yep, on it — should be in review by the end of the day.'),
    dictationBank('Собери услышанное.', 'I would be able to take that on next sprint.', ['will', 'am']),
  ],
}
