// Всё, что Конструктор показывает только на вкладке «База» (витрина материалов,
// банк заданий, разметка) и на открытом материале. Один модуль — один ленивый
// чанк: вкладка доезжает целиком, внутренние части не ждут каждая своей загрузки.
export { default as TrainerMaterials, MaterialPage } from './TrainerMaterials'
export { TrainerBankBrowser, BankFilterFields } from './TrainerBank'
export { default as CurriculumManager } from './CurriculumManager'
