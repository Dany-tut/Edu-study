// Форма отбора банка заданий. Отдельный крошечный модуль: Конструктор держит
// это состояние с первого кадра, а сам TrainerBank грузит лениво (вкладка «База»).

// ─── Shared filter shape ───────────────────────────────────────────────────────
export type TrainerFilters = {
  search: string; subject: string; sections: string[]; topics: string[]; parts: string[]; lines: string[]; source: string
  // Языковая разметка (task_bank.payload): у языкового предмета нет ни раздела
  // ЕГЭ, ни части, ни линии — отбор идёт по уровню и навыку. Поля
  // необязательные, чтобы не ломать вторую копию типа в создании ДЗ.
  levels?: string[]; skills?: string[]
  /**
   * Мультивыбор предмета витрины Конструктора: задания этих предметов. Пустой
   * массив — предмет ещё не выбран, заданий нет. Не задан — отбор только по
   * `subject` (создание ДЗ).
   */
  subjects?: string[]
  /**
   * Какой банк смотрим: '' — задания преподавателей, 'ege'/'oge' — банк ФИПИ
   * этого экзамена (только при одном предмете с банком: химия, биология).
   * В режиме ФИПИ sections/topics — названия разделов и тем Neo (payload.nf).
   */
  bank?: '' | 'ege' | 'oge'
}
export const emptyTrainerFilters: TrainerFilters = {
  search: '', subject: '', sections: [], topics: [], parts: [], lines: [], source: '', levels: [], skills: [],
}
