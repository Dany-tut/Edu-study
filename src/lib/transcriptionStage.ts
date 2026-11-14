/** Preparation is real work even when the worker cannot report a percentage yet. */
export const transcriptionStages = ['Видео', 'Подготовка', 'Распознаём речь', 'Разделяем голоса', 'Ищем паузы', 'Читаем слайды', 'Собираем главы']
export function transcriptionStageIndex(stage: string): number {
  if (/^(Готовим|Подготавливаем|Загружаем модель)/.test(stage)) return 1
  if (stage === 'Готово') return transcriptionStages.length - 1
  return Math.max(0, transcriptionStages.findIndex(s => stage.startsWith(s)))
}
