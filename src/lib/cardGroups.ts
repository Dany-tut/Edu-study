// ─────────────────────────────────────────────────────────────────────────────
// Группы и наборы карточек — чтение и запись
//
// ЧТО ЭТО. Третий источник стопок для вкладки «Карточки», рядом с разговорником
// и наборами слов, — с той разницей, что этот наполняется не кодом, а людьми:
// учитель собирает группу в Конструкторе, ученик проходит её в тренажёре
// (модель и мотивация — в supabase/migrations/0069_card_groups.sql).
//
// ФОРМА ТА ЖЕ, ЧТО У РАЗГОВОРНИКА. Карточка — это Phrase: витрина, свайп,
// озвучка, расписание повторений уже написаны над ним. Единственная добавка —
// `ep`: метка, откуда слово (серия, глава, эпизод). Она не влияет ни на что,
// кроме показа, и поэтому не заводит собственной сущности.
//
// ЧТЕНИЕ ИДЁТ ОДНИМ ЗАПРОСОМ НА ЯЗЫК. Групп у ученика единицы, наборов —
// десятки, карточек — сотни; три отдельных запроса с join'ом на клиенте дешевле
// и предсказуемее, чем вложенный select с фильтрами по вложенным таблицам
// (PostgREST умеет их фильтровать только через `!inner`, и любая опечатка в
// синтаксисе даёт молча пустой список — см. reference про ленивый билдер).
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'
import type { Phrase } from '../data/survivalPhrases'
import type { SurvivalLevel } from '../data/survivalPhrases'

/**
 * Карточка набора — это Phrase из разговорника, и добавка ровно одна: id строки.
 *
 * Метка серии (`ep`) живёт в самом Phrase: показывает её список карточек, общий
 * на все источники, и держать её здесь значило бы, что список о ней не знает.
 */
export interface SetCard extends Phrase {
  /** id строки в БД. У карточек сида его нет. */
  id?: string
}

/** Набор — то, что ученик открывает одной стопкой. */
export interface CardSet {
  id: string
  title: string
  about: string
  level?: SurvivalLevel | null
  cards: SetCard[]
}

/** Группа — полка витрины: «Сверхъестественное», внутри наборы по сезонам. */
export interface CardGroup {
  id: string
  lang: string
  subject?: string | null
  title: string
  about: string
  level?: SurvivalLevel | null
  sort: number
  /**
   * Кому назначена. Пусто = всем ученикам владельца.
   *
   * Хранится текстом, а не uuid[]: id ученика приходит из сессии строкой, и
   * приведение на клиенте — лишний способ уронить запрос на легаси-строке.
   */
  studentIds: string[]
  createdBy?: string | null
  authorStudentId?: string | null
  /** Группа из кода (сид), а не из БД: её нельзя править и удалять. */
  seed?: boolean
  sets: CardSet[]
}

// ─── Чтение ──────────────────────────────────────────────────────────────────

type GroupRow = {
  id: string; created_by: string | null; author_student_id: string | null
  lang: string; subject: string | null; title: string; about: string
  level: string | null; sort: number; student_ids: string[] | null
}

function rowToGroup(r: GroupRow): CardGroup {
  return {
    id: r.id,
    lang: r.lang,
    subject: r.subject,
    title: r.title,
    about: r.about ?? '',
    level: (r.level as SurvivalLevel | null) ?? null,
    sort: r.sort ?? 0,
    studentIds: r.student_ids ?? [],
    createdBy: r.created_by,
    authorStudentId: r.author_student_id,
    sets: [],
  }
}

/** Наполнить группы наборами и карточками. Два запроса на любое число групп. */
async function fillSets(groups: CardGroup[]): Promise<CardGroup[]> {
  if (groups.length === 0) return groups
  const byId = new Map(groups.map(g => [g.id, g]))

  const { data: setRows, error: setErr } = await supabase
    .from('card_sets')
    .select('id, group_id, title, about, level, sort')
    .in('group_id', [...byId.keys()])
    .order('sort')
  if (setErr) { console.error('cardGroups: sets', setErr); return groups }

  const sets = new Map<string, CardSet>()
  for (const r of setRows ?? []) {
    const set: CardSet = {
      id: r.id as string,
      title: (r.title as string) ?? '',
      about: (r.about as string) ?? '',
      level: (r.level as SurvivalLevel | null) ?? null,
      cards: [],
    }
    sets.set(set.id, set)
    byId.get(r.group_id as string)?.sets.push(set)
  }
  if (sets.size === 0) return groups

  const { data: cardRows, error: cardErr } = await supabase
    .from('set_cards')
    .select('id, set_id, term, ru, reading, note, ep, ex, sort')
    .in('set_id', [...sets.keys()])
    .order('sort')
  if (cardErr) { console.error('cardGroups: cards', cardErr); return groups }

  for (const r of cardRows ?? []) {
    sets.get(r.set_id as string)?.cards.push({
      id: r.id as string,
      term: (r.term as string) ?? '',
      ru: (r.ru as string) ?? '',
      reading: (r.reading as string) ?? undefined,
      note: (r.note as string) ?? undefined,
      ep: (r.ep as string) ?? undefined,
      ex: (r.ex as SetCard['ex']) ?? undefined,
    })
  }
  return groups
}

/**
 * Группы, которые видит ученик на этом языке.
 *
 * Отсев «моё/не моё» делается ЗДЕСЬ, а не политикой: чтение материала открыто
 * (легаси-ученик ходит под anon, см. миграцию), и адресность — это витрина, а
 * не безопасность. Пустой student_ids значит «всем», непустой — только своим.
 */
export async function fetchCardGroups(lang: string, studentId?: string): Promise<CardGroup[]> {
  const { data, error } = await supabase
    .from('card_groups')
    .select('id, created_by, author_student_id, lang, subject, title, about, level, sort, student_ids')
    .eq('lang', lang)
    .order('sort')
  if (error) { console.error('cardGroups: groups', error); return [] }

  const mine = (data ?? [])
    .map(r => rowToGroup(r as GroupRow))
    .filter(g => {
      // Свои собственные наборы ученик видит всегда — даже когда фича выключена
      // флагом: выключенный флаг прячет КНОПКУ создания, а не уже собранное.
      if (g.authorStudentId) return !!studentId && g.authorStudentId === studentId
      if (g.studentIds.length === 0) return true
      return !!studentId && g.studentIds.includes(studentId)
    })
  return fillSets(mine)
}

/** Группы, которыми владеет текущий учитель, — для Конструктора. */
export async function fetchOwnCardGroups(ownerId: string): Promise<CardGroup[]> {
  const { data, error } = await supabase
    .from('card_groups')
    .select('id, created_by, author_student_id, lang, subject, title, about, level, sort, student_ids')
    .eq('created_by', ownerId)
    .order('sort')
  if (error) { console.error('cardGroups: own', error); return [] }
  return fillSets((data ?? []).map(r => rowToGroup(r as GroupRow)))
}

// ─── Запись ──────────────────────────────────────────────────────────────────

/**
 * Сохранить группу целиком: сама группа, её наборы и карточки.
 *
 * ПОЧЕМУ ЦЕЛИКОМ, А НЕ ПООПЕРАЦИОННО. Редактор держит группу в состоянии и
 * правит её как документ: добавил набор, переименовал, стёр три карточки. Точка
 * сохранения одна — кнопка «Сохранить», — и разбирать в UI, что именно из
 * этого уже уехало в базу, значило бы вести вторую модель изменений рядом с
 * первой. Здесь же diff считается по id: чего нет в состоянии — удаляется.
 *
 * ЗАПРОСЫ НЕ ЛЕНИВЫЕ. Каждый билдер завершается await'ом: `void supabase…` не
 * отправляет запрос вовсе (см. память про ленивый билдер), и молчаливая потеря
 * правок — ровно тот случай, ради которого это правило и записано.
 *
 * Возвращает id группы (новая получает его от БД) — редактору он нужен, чтобы
 * следующее сохранение шло в ту же строку, а не плодило копии.
 */
export async function saveCardGroup(
  group: CardGroup,
  owner: { createdBy?: string | null; authorStudentId?: string | null },
): Promise<string | null> {
  const isNew = !group.id || group.seed
  const base = {
    lang: group.lang,
    subject: group.subject ?? null,
    title: group.title.trim(),
    about: group.about.trim(),
    level: group.level ?? null,
    sort: group.sort ?? 0,
    student_ids: group.studentIds,
  }

  let groupId = group.id
  if (isNew) {
    const { data, error } = await supabase
      .from('card_groups')
      .insert({
        ...base,
        created_by: owner.createdBy ?? null,
        author_student_id: owner.authorStudentId ?? null,
      })
      .select('id')
      .single()
    if (error || !data) { console.error('cardGroups: insert group', error); return null }
    groupId = data.id as string
  } else {
    const { error } = await supabase.from('card_groups').update(base).eq('id', groupId)
    if (error) { console.error('cardGroups: update group', error); return null }
  }

  // Наборы: чего нет в состоянии — стереть (карточки уедут каскадом).
  const { data: oldSets } = await supabase.from('card_sets').select('id').eq('group_id', groupId)
  const keep = new Set(group.sets.map(s => s.id).filter(Boolean))
  const dropSets = (oldSets ?? []).map(r => r.id as string).filter(id => !keep.has(id))
  if (dropSets.length > 0) {
    const { error } = await supabase.from('card_sets').delete().in('id', dropSets)
    if (error) console.error('cardGroups: delete sets', error)
  }

  for (const [i, set] of group.sets.entries()) {
    const setBase = {
      group_id: groupId,
      title: set.title.trim(),
      about: set.about.trim(),
      level: set.level ?? null,
      sort: i,
    }
    let setId = set.id
    if (!setId || !keep.has(setId) || isNew) {
      const { data, error } = await supabase.from('card_sets').insert(setBase).select('id').single()
      if (error || !data) { console.error('cardGroups: insert set', error); continue }
      setId = data.id as string
    } else {
      const { error } = await supabase.from('card_sets').update(setBase).eq('id', setId)
      if (error) { console.error('cardGroups: update set', error); continue }
    }

    // Карточки набора переписываются целиком: их десятки, порядок значим, и
    // построчный diff здесь дороже полной замены ровно ничем не окупаясь.
    const { error: delErr } = await supabase.from('set_cards').delete().eq('set_id', setId)
    if (delErr) console.error('cardGroups: clear cards', delErr)
    const rows = set.cards
      .filter(c => c.term.trim() && c.ru.trim())
      .map((c, n) => ({
        set_id: setId,
        term: c.term.trim(),
        ru: c.ru.trim(),
        reading: c.reading?.trim() || null,
        note: c.note?.trim() || null,
        ep: c.ep?.trim() || null,
        ex: c.ex ?? null,
        sort: n,
      }))
    if (rows.length > 0) {
      const { error } = await supabase.from('set_cards').insert(rows)
      if (error) console.error('cardGroups: insert cards', error)
    }
  }

  return groupId ?? null
}

/** Удалить группу вместе с наборами и карточками (каскад в БД). */
export async function deleteCardGroup(id: string): Promise<boolean> {
  const { error } = await supabase.from('card_groups').delete().eq('id', id)
  if (error) { console.error('cardGroups: delete', error); return false }
  return true
}

// ─── Флаг «ученик собирает свои наборы» ──────────────────────────────────────
//
// НЕ ПУТАТЬ С lib/featureFlags.ts. Тот — рубильник на УСТРОЙСТВЕ: localStorage,
// правится из консоли, нужен QA и откату рискованной формулы (FSRS). Этот —
// продуктовый переключатель на всех сразу: лежит в БД, пишет только админ,
// переживает чужие браузеры. Разные вопросы, поэтому и хранилища разные.

/**
 * Значение флага из app_flags.
 *
 * Кэшируется на время жизни вкладки: ответ на вопрос «показывать ли кнопку»
 * нужен каждому открытию тренажёра, а меняется он раз в полгода руками админа.
 * Значение по умолчанию — false: если таблица недоступна (офлайн, старая база),
 * фича считается выключенной, а не включённой.
 */
const flagCache = new Map<string, boolean>()

export async function appFlag(key: string): Promise<boolean> {
  const hit = flagCache.get(key)
  if (hit !== undefined) return hit
  const { data, error } = await supabase.from('app_flags').select('enabled').eq('key', key).maybeSingle()
  if (error) { console.error('appFlag:', error); return false }
  const on = !!data?.enabled
  flagCache.set(key, on)
  return on
}

/** Переключить флаг (Админка). Кэш сбрасывается, чтобы не врать до F5. */
export async function setAppFlag(key: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('app_flags')
    .upsert({ key, enabled, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) { console.error('setAppFlag:', error); return false }
  flagCache.set(key, enabled)
  return true
}

/** Все флаги разом — для экрана настроек. */
export async function fetchAppFlags(): Promise<Array<{ key: string; enabled: boolean; about: string }>> {
  const { data, error } = await supabase.from('app_flags').select('key, enabled, about').order('key')
  if (error) { console.error('fetchAppFlags:', error); return [] }
  return (data ?? []).map(r => ({
    key: r.key as string,
    enabled: !!r.enabled,
    about: (r.about as string) ?? '',
  }))
}
