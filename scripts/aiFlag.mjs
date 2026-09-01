// ─────────────────────────────────────────────────────────────────────────────
// Рубильники ИИ: спросить у базы, работаем ли мы сегодня
//
// ЗАЧЕМ. Ночная сборка тратит деньги без человека. Выключатель этому расходу
// живёт в админке (Администрирование → Обзор → «Расход на ИИ»), в таблице
// app_flags, и читается ОТСЮДА — перед первым запросом к модели.
//
// ПОЧЕМУ REST, А НЕ supabase-js. Скрипту нужна одна строка и ноль зависимостей:
// сборка ленты ставит npm-пакеты только на шагах с моделью, а знать про флаг
// хочется раньше.
//
// АДРЕС И КЛЮЧ ВПИСАНЫ ЗАПАСНЫМ ВАРИАНТОМ НАМЕРЕННО. Оба значения публичные —
// они и так уезжают в браузер каждому ученику внутри бандла (publishable-ключ
// на то и publishable, доступ решает RLS, а не он). Иначе рубильник требовал бы
// ещё двух секретов в GitHub, и первый же прогон без них молча тратил бы деньги
// мимо выключателя. Переменные окружения, если заданы, всё равно главнее.
//
// КАК ПАДАЕМ. Не отвечает база — считаем ВЫКЛЮЧЕНО. Выключатель — про деньги:
// сбой сети не должен отменять решение «сегодня не тратим». День без переводов
// — мелочь, ночь трат вопреки рубильнику — то, ради чего он и заводился.
// ─────────────────────────────────────────────────────────────────────────────

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL ||
  'https://igsdwvwiqnozgwczzycx.supabase.co'
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_9nX0WD9BunA9DP1hXqkfiw_EeQr-xVO'

async function flag(key) {
  const res = await fetch(`${URL}/rest/v1/app_flags?key=eq.${encodeURIComponent(key)}&select=enabled`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  })
  if (!res.ok) throw new Error(`app_flags ${key}: HTTP ${res.status}`)
  const rows = await res.json()
  // Строки нет вовсе — миграция не доехала. Это НЕ «включено по умолчанию»:
  // молчаливый расход мимо выключателя — ровно то, чего мы избегаем.
  if (!rows.length) throw new Error(`app_flags ${key}: строки нет`)
  return !!rows[0].enabled
}

/**
 * Разрешена ли задача. Нужны ОБА флага: общий рубильник и свой у задачи.
 * Печатает причину сама — вызывающему остаётся выйти.
 */
export async function aiAllowed(job) {
  try {
    if (!(await flag('ai_enabled'))) {
      console.log('ИИ выключен в админке общим рубильником (app_flags.ai_enabled) — пропускаем.')
      return false
    }
    if (!(await flag(job))) {
      console.log(`Задача выключена в админке (app_flags.${job}) — пропускаем.`)
      return false
    }
    return true
  } catch (e) {
    console.log(`Рубильники ИИ не прочитались (${e.message}) — на всякий случай НЕ тратим. Проверьте app_flags.`)
    return false
  }
}
