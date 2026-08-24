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
    // Классическая ловушка Part 1: -teen против -ty. На слух их разводит
    // ударение (thirTEEN — THIRty), и проверяется это только диктантом.
    dictation('Диктант-ловушка: тринадцать или тридцать? Запиши обе фразы дословно, с числами словами.',
      'The deposit is thirty pounds and the weekly rent is one hundred and thirteen pounds. Payment is due on the third of October.'),
  ],
  'ielt-06': [
    dictation('В записи есть исправление. Запиши ИТОГОВОЕ время.', 'The tour starts at ten thirty — sorry, at eleven o’clock.', ['The tour starts at eleven o’clock.']),
    // Имя по буквам и дата — то, что в Part 1 диктуют, а кандидат пишет на
    // слух «как слышится» и теряет балл на орфографии.
    dictation('Диктант с именем по буквам и датой. Запиши обе фразы дословно.',
      'My surname is Whitmore, spelled W-H-I-T-M-O-R-E. I was born on the twenty-first of January, nineteen ninety-eight.'),
  ],
  'ielt-07': [
    dictation('Фрагмент лекции. Запиши дословно.', 'Industrialisation changed the structure of the workforce.'),
    dictationBank('Собери услышанное.', 'The second factor is financial support from local councils.', ['first', 'national']),
    // Числа и годы в потоке монолога: в части 4 они идут без пауз, и рука
    // должна записывать их, не отставая от речи.
    dictation('Фрагмент лекции с числами и годами. Запиши обе фразы дословно, числа цифрами.',
      'The survey covered 1400 households between 1990 and 2015. Roughly 40 per cent of them had moved at least twice.'),
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
    // «much» есть в самом предложении — как обманка она давала вторую такую же
    // плитку, и одна из двух одинаковых считалась лишней. Обманки не должны
    // совпадать ни с одним словом эталона.
    dictationBank('Собери услышанное.', 'It depends on how much sleep I have had.', ['depend', 'little']),
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
