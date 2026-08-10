// ─────────────────────────────────────────────────────────────────────────────
// Добор заданий по португальскому Intermediário: аудирование, говорение, письмо
//
// ЗАЧЕМ. Аудит: 17 юнитов из 18 без задания на слух, 14 без устного. Для
// CELPE-Bras это провал по самой конструкции экзамена: письменная часть целиком
// строится на понимании видео и аудио, а устная — это двадцать минут живого
// разговора. Заданий на выбор варианта там нет вообще.
//
// ПРО НОРМУ. Всюду бразильский вариант: a gente вместо nós, местоимение перед
// глаголом, gerúndio вместо европейского «estar a + инфинитив».
// ─────────────────────────────────────────────────────────────────────────────

import { write, say, dictation, dictationBank, minPair, type SeedTask } from './languageCourse'

const LISTENING: Record<string, SeedTask[]> = {
  'ptb2-01': [
    dictation('Запишите услышанное. Какие времена здесь использованы?', 'Quando eu cheguei, ela já tinha saído.'),
    minPair('Что прозвучало?', 'ela saiu', 'ela tinha saído', 'B'),
  ],
  'ptb2-02': [dictation('Запишите вежливую просьбу.', 'Você poderia me ajudar com uma coisa?')],
  'ptb2-03': [dictation('Запишите услышанное в сослагательном.', 'Espero que você venha à festa.')],
  'ptb2-04': [
    dictation('Запишите условие второго типа.', 'Se eu tivesse tempo, eu viajaria mais.'),
    minPair('Какая форма прозвучала?', 'se eu tivesse', 'se eu tenho', 'A'),
  ],
  'ptb2-06': [dictation('Запишите услышанное. Следите за согласованием.', 'Ele disse que viria assim que pudesse.')],
  'ptb2-07': [dictation('Запишите фразу с личным инфинитивом.', 'É importante vocês chegarem no horário.')],
  'ptb2-08': [dictation('Запишите безличную конструкцию.', 'Aqui se fala português e espanhol.')],
  'ptb2-09': [dictationBank('Соберите услышанное.', 'A cidade onde eu nasci fica no interior.', ['que', 'cujo'])],
  'ptb2-10': [dictation('Запишите услышанное в косвенной речи.', 'Ela me disse que estava cansada.')],
  'ptb2-11': [dictation('Запишите фразу со связкой.', 'No entanto, os dados mostram o contrário.')],
  'ptb2-12': [dictation('Запишите осторожную формулировку.', 'Parece que muitos jovens pensam assim.')],
  'ptb2-13': [
    dictation('Запишите фразу. В каком она регистре?', 'Solicito a análise do meu pedido.'),
    minPair('Какой регистр прозвучал?', 'Cê pode ver isso?', 'Poderia verificar isso?', 'B'),
  ],
  'ptb2-14': [dictation('Запишите фразу из репортажа.', 'A pesquisa foi realizada em cinco capitais.')],
  'ptb2-15': [dictation('Запишите строку из письма-жалобы.', 'Peço a substituição do produto até o dia vinte.')],
  'ptb2-16': [dictation('Запишите тезис из статьи-мнения.', 'Acredito que a educação deveria ser prioridade.')],
  'ptb2-17': [dictationBank('Соберите главную мысль текста.', 'O autor defende que a mudança é necessária.', ['nega', 'porque'])],
  'ptb2-18': [dictation('Запишите вопрос экзаменатора.', 'O que você achou desse cartaz?')],
}

const SPEAKING: Record<string, SeedTask[]> = {
  'ptb2-01': [say('Расскажите вслух историю из своей жизни на минуту: фон — в imperfeito, события — в perfeito, предысторию — в mais-que-perfeito. Минимум по два раза каждое.', 90)],
  'ptb2-03': [say('Скажите вслух шесть фраз с presente do subjuntivo: два пожелания через Espero que, два сомнения через Talvez, два требования через É importante que.', 90)],
  'ptb2-04': [say('Скажите вслух пять гипотез через Se + imperfeito do subjuntivo + futuro do pretérito: что было бы, будь у вас время, деньги, другой город.', 90)],
  'ptb2-05': [say('Скажите вслух шесть фраз с futuro do subjuntivo: три через Quando (когда сделаю), три через Se (если сделаю). Главная часть — в настоящем или будущем, и ни разу не в настоящем изъявительном после quando.', 90)],
  'ptb2-06': [say('Перескажите вслух чужой рассказ в прошедшем: следите, чтобы придаточные согласовались (disse que viria, pediu que fizesse).', 120)],
  'ptb2-07': [say('Скажите вслух шесть фраз с личным инфинитивом для разных лиц: para eu falar, para nós falarmos, para eles falarem.', 75)],
  'ptb2-08': [say('Опишите вслух порядки в вашем городе безличными конструкциями: aqui se fala, não se pode, costuma-se.', 75)],
  'ptb2-09': [say('Опишите вслух пять человек и мест через относительные придаточные: que, quem, onde, cujo. Про cujo помните, что оно согласуется с предметом.', 90)],
  'ptb2-10': [say('Перескажите вслух три чужие реплики в косвенной речи, сдвинув времена: «Estou cansada» → Ela disse que estava cansada.', 90)],
  'ptb2-11': [say('Произнесите вслух четыре абзаца-заготовки, каждый со своей связкой: Além disso, No entanto, Por isso, Em suma.', 90)],
  'ptb2-13': [say('Произнесите одну и ту же просьбу в четырёх регистрах: другу, коллеге в сообщении, в деловом письме, в обращении в мэрию.', 90)],
  'ptb2-14': [say('Посмотрите ролик урока и перескажите вслух за минуту: кто говорит, что утверждает, согласны ли вы. Пересказ целиком не нужен.', 90)],
  'ptb2-15': [say('Проговорите вслух звонок с жалобой: факт, последствие, конкретное требование со сроком. Без извинений и без эмоций.', 90)],
  'ptb2-17': [say('Изложите вслух текст урока за минуту: начните с главной мысли, а не с первого абзаца, и своими словами.', 90)],
  'ptb2-18': [say('Ответьте вслух на три вопроса по элементу-стимулу: что видите, что об этом думаете, как это устроено у вас. По полторы минуты на каждый.', 120)],
}

const WRITING: Record<string, SeedTask[]> = {
  'ptb2-18': [write('Напишите план ответа на устной части: три элемента-стимула, к каждому — по одной строке «что это», «моя позиция», «пример из жизни».')],
}

export const PORTUGUESE2_EXTRA: Record<string, SeedTask[]> = {}
for (const src of [LISTENING, SPEAKING, WRITING]) {
  for (const [k, v] of Object.entries(src)) {
    PORTUGUESE2_EXTRA[k] = [...(PORTUGUESE2_EXTRA[k] ?? []), ...v]
  }
}
