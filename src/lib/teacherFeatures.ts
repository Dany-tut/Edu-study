// Доступ учителя к функциям-автоматизациям (миграция 20261107010000_teacher_features.sql).
//
// Правило: функцию выдаёт админ — одному учителю или всем. Без доступа учитель
// не видит ни инструмента, ни настройки (никаких замков и заглушек). С доступом
// в «Настройках → Функции» есть свой переключатель. Админ видит всё.
import { useEffect } from 'react'
import { create } from 'zustand'
import { supabase } from './supabase'
import { getAuthUser } from './owner'

export type FeatureKey =
  | 'ai_hw_grade' | 'ai_hw_batch' | 'journal_push' | 'transcription' | 'mcp'
  | 'lesson_recap' | 'reminders' | 'parent_report' | 'payment_reminders'

export type FeatureInfo = { key: FeatureKey; label: string; about: string; ready: boolean }

/** Порядок = порядок в настройках и админке. ready: false — функция ещё в концептах. */
export const FEATURES: FeatureInfo[] = [
  { key: 'ai_hw_grade', label: 'ИИ-предоценка ДЗ', about: 'ИИ разбирает сданные работы по химии и биологии до вас и предлагает балл.', ready: true },
  { key: 'ai_hw_batch', label: 'Применить все уверенные', about: 'Одной кнопкой подтвердить работы, в которых ИИ уверен. Спорные остаются вам.', ready: true },
  { key: 'journal_push', label: 'Напоминание о журнале', about: 'Уведомление, если урок прошёл, а журнал не заполнен.', ready: true },
  { key: 'transcription', label: 'Расшифровка записей', about: 'Расшифровка и монтаж записи урока на вашем Mac.', ready: true },
  { key: 'mcp', label: 'ИИ-помощники (MCP)', about: 'Подключить Claude и другие ИИ-клиенты к вашим курсам.', ready: true },
  { key: 'lesson_recap', label: 'Итоги урока из записи', about: 'Конспект, вопросы, карточки, черновик ДЗ и заметка для вас — из расшифровки урока. Выключено — кнопки скрыты, черновики остаются.', ready: true },
  { key: 'reminders', label: 'Напоминания ученикам', about: 'Урок скоро, ДЗ завтра, ДЗ просрочено — бот Искры пишет ученику в Telegram.', ready: true },
  { key: 'parent_report', label: 'Отчёт родителю', about: 'Недельный отчёт: посещаемость, ДЗ, баллы и пара фраз от вас.', ready: false },
  { key: 'payment_reminders', label: 'Напоминания об оплате', about: 'Напоминание о долге и счёт за месяц по проведённым урокам.', ready: false },
]

type FeaturesState = {
  loaded: boolean
  /** Выданные функции: ключ → включена ли учителем. Невыданных здесь нет. */
  map: Partial<Record<FeatureKey, boolean>>
  load: () => Promise<void>
  /** Функция выдана админом (видна в настройках). */
  granted: (key: FeatureKey) => boolean
  /** Выдана и включена — показывать инструмент. */
  on: (key: FeatureKey) => boolean
  setOn: (key: FeatureKey, enabled: boolean) => Promise<boolean>
}

export const useTeacherFeatures = create<FeaturesState>((set, get) => ({
  loaded: false,
  map: {},
  load: async () => {
    const user = await getAuthUser()
    if (!user) { set({ loaded: true, map: {} }); return }
    const { data, error } = await supabase.rpc('my_features')
    // Миграции ещё нет в базе — ведём себя как до правила: всё, что уже было, видно.
    if (error) {
      set({ loaded: true, map: { ai_hw_grade: true, transcription: true, mcp: true } })
      return
    }
    const map: Partial<Record<FeatureKey, boolean>> = {}
    for (const row of (data ?? []) as { feature: FeatureKey; enabled: boolean }[]) map[row.feature] = row.enabled
    set({ loaded: true, map })
  },
  granted: key => key in get().map,
  on: key => get().map[key] === true,
  setOn: async (key, enabled) => {
    const prev = get().map
    set({ map: { ...prev, [key]: enabled } })
    const { error } = await supabase.rpc('set_my_feature', { p_feature: key, p_enabled: enabled })
    if (error) { set({ map: prev }); return false }
    return true
  },
}))

let started = false
/** Хук для экрана: true — инструмент показывать. Загружает доступы один раз. */
export function useFeature(key: FeatureKey): boolean {
  const on = useTeacherFeatures(s => s.map[key] === true)
  useEffect(() => {
    if (started) return
    started = true
    void useTeacherFeatures.getState().load()
  }, [])
  return on
}

/** Сброс при смене пользователя (выход/вход). */
export function resetTeacherFeatures() {
  started = false
  useTeacherFeatures.setState({ loaded: false, map: {} })
}
