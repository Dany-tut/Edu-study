// ─────────────────────────────────────────────────────────────────────────────
// Аудирование для курса IELTS Academic
//
// ПОЧЕМУ ДОБАВЛЕНО ОТДЕЛЬНО. Аудит показал: задания на слух стояли только в
// трёх юнитах из двадцати — тех, что прямо называются «Listening». Но на
// экзамене аудирование это ЧЕТВЕРТЬ итогового балла, и тренировать его три
// урока из двадцати — значит готовить человека к провалу на той части, где он
// не успевает за живой речью.
//
// ЧТО ЗДЕСЬ. По одному-двум диктантам на юнит, и фразы подобраны под тему
// урока: где разбирается перефразирование — там на слух идёт перефразированная
// конструкция, где Writing Task 1 — язык динамики графика, где Speaking —
// живая реплика экзаменатора.
//
// ПОЧЕМУ ИМЕННО ДИКТАНТ. На реальном экзамене ответ вписывается руками, и
// баллы теряются не на понимании, а на орфографии, числе и лимите слов. Диктант
// бьёт ровно в это: услышал — записал — сверил посимвольно.
// ─────────────────────────────────────────────────────────────────────────────

import { dictation, dictationBank, type SeedTask } from './languageCourse'

export const IELTS_LISTENING: Record<string, SeedTask[]> = {
  'ielt-01': [
    dictation('Запиши услышанное дословно. Следи за окончаниями.', 'The majority of sentences are error-free.'),
  ],
  'ielt-02': [
    dictation('Услышишь перефразированную версию. Запиши её.', 'The number of visitors fell sharply after 2015.'),
    dictationBank('Собери услышанное из плиток.', 'Government investment is necessary for public transport.', ['invest', 'necessity']),
  ],
  'ielt-03': [
    dictation('Запиши сложное предложение целиком.', 'If governments invested more in cycling, congestion would fall.'),
  ],
  'ielt-04': [
    dictation('Запиши академическую формулировку.', 'A significant number of respondents reported similar concerns.'),
    dictationBank('Собери услышанное.', 'Heavy rain caused widespread disruption.', ['strong', 'wide']),
  ],
  'ielt-05': [
    dictation('Внимание к числу и написанию.', 'The accommodation costs forty-five pounds per night.'),
    dictationBank('Собери услышанное.', 'Please write no more than two words.', ['then', 'word']),
  ],
  'ielt-06': [
    dictation('В записи есть исправление. Запиши ИТОГОВОЕ время.', 'The tour starts at ten thirty — sorry, at eleven o’clock.', ['The tour starts at eleven o’clock.']),
  ],
  'ielt-07': [
    dictation('Фрагмент лекции. Запиши дословно.', 'Industrialisation changed the structure of the workforce.'),
    dictationBank('Собери услышанное.', 'The second factor is financial support from local councils.', ['first', 'national']),
  ],
  'ielt-08': [
    dictation('Запиши формулировку задания.', 'You should spend about twenty minutes on this task.'),
  ],
  'ielt-09': [
    dictation('Запиши утверждение целиком — важен квантор.', 'Some researchers argue that the effect is temporary.'),
  ],
  'ielt-10': [
    dictation('Запиши заголовок абзаца.', 'The economic impact of rural depopulation.'),
  ],
  'ielt-11': [
    dictation('Запиши предложение с авторской позицией.', 'What is often overlooked is the cost of maintenance.'),
  ],
  'ielt-12': [
    dictation('Язык динамики. Запиши дословно.', 'Sales rose steadily between 2010 and 2014, then levelled off.'),
    dictationBank('Собери услышанное.', 'There was a sharp decline in the following year.', ['sharply', 'declined']),
  ],
  'ielt-13': [
    dictation('Описание процесса. Обрати внимание на пассив.', 'The raw material is collected and then transported to the plant.'),
  ],
  'ielt-14': [
    dictation('Запиши формулировку вопроса эссе.', 'To what extent do you agree or disagree with this statement?'),
  ],
  'ielt-15': [
    dictation('Запиши предложение со связкой.', 'Such a measure would, however, affect low-income families most.'),
  ],
  'ielt-16': [
    dictation('Запиши пример-обоснование.', 'In countries where public transport is subsidised, car ownership tends to be lower.'),
  ],
  'ielt-17': [
    dictation('Вопрос из первой части устного экзамена.', 'Do you prefer working in the morning or in the evening?'),
    dictationBank('Собери услышанное.', 'It depends on how much sleep I have had.', ['depend', 'much']),
  ],
  'ielt-18': [
    dictation('Запиши задание с карточки.', 'Describe a journey that you remember well.'),
  ],
  'ielt-19': [
    dictation('Абстрактный вопрос третьей части.', 'Do you think technology has changed the way families communicate?'),
  ],
  'ielt-20': [
    dictation('Инструкция экзаменатора. Запиши дословно.', 'You have ten minutes to transfer your answers to the answer sheet.'),
  ],
}
