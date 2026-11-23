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
}
export const emptyTrainerFilters: TrainerFilters = {
  search: '', subject: '', sections: [], topics: [], parts: [], lines: [], source: '', levels: [], skills: [],
}
