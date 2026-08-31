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
/**
 * Четвёртый уровень: стопка внутри набора.
 *
 * ЗАЧЕМ ОН ПОЯВИЛСЯ. Сначала уровней было два (группа → набор), а серия сериала
 * жила МЕТКОЙ карточки `ep` — с расчётом, что внутри набора будет фильтр по
 * метке. Фильтра не написали, и метка осталась серой строчкой на карточке:
 * четыреста сорок слов сезона лежали одной кучей, а достать из них двадцать
 * слов к нужной серии было нечем.
 *
 * ПОЧЕМУ ОТДЕЛЬНЫЙ ТИП, А НЕ `subsets?: CardSet[]`. Рекурсивная ссылка на самого
 * себя открыла бы вложенность без дна: пятый уровень, шестой, и витрина
 * превращается в файловый менеджер. Отдельный тип, у которого своих подстопок
 * НЕТ, делает ограничение «не глубже четырёх» частью модели, а не договорённости
 * между людьми. Полка → сезон → серия → карточки, дальше некуда.
 */
export interface CardSubset {
  id: string
  title: string
  about?: string
  cards: SetCard[]
}

export interface CardSet {
  id: string
  title: string
  about: string
  level?: SurvivalLevel | null
  /** Момент создания — по нему витрина Конструктора строит порядок «Новые». */
  createdAt?: string
  /**
   * Карточки набора напрямую. У набора с подстопками пуст — карточки лежат
   * в них; читать оба поля разом не надо, для этого есть `setCards()`.
   */
  cards: SetCard[]
  /** Подстопки. Пусто или нет поля — обычный набор, как было раньше. */
  subsets?: CardSubset[]
}

/**
 * Все карточки набора — свои и из подстопок.
 *
 * Нужна везде, где набор считают целиком: счётчик на плитке, поиск, прогресс.
 * Без неё набор с подстопками показывал бы «0 карточек» и выглядел пустым.
 */
export function setCards(set: CardSet): SetCard[] {
  if (!set.subsets?.length) return set.cards
  return [...set.cards, ...set.subsets.flatMap(s => s.cards)]
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
  /** Момент создания — по нему витрина Конструктора строит порядок «Новые». */
  createdAt?: string
  sets: CardSet[]
}

// ─── Чтение ──────────────────────────────────────────────────────────────────

type GroupRow = {
  id: string; created_by: string | null; author_student_id: string | null
  lang: string; subject: string | null; title: string; about: string
  level: string | null; sort: number; student_ids: string[] | null
  created_at?: string | null
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
    createdAt: r.created_at ?? undefined,
    sets: [],
  }
}

/** Наполнить группы наборами и карточками. Два запроса на любое число групп. */
async function fillSets(groups: CardGroup[]): Promise<CardGroup[]> {
  if (groups.length === 0) return groups
  const byId = new Map(groups.map(g => [g.id, g]))

  const { data: setRows, error: setErr } = await supabase
    .from('card_sets')
    .select('id, group_id, title, about, level, sort, created_at')
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
      createdAt: (r.created_at as string | null) ?? undefined,
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
    .select('id, created_by, author_student_id, lang, subject, title, about, level, sort, student_ids, created_at')
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

/**
 * Полка или обёртка одного набора.
 *
 * ПОЧЕМУ ЭТО ВООБЩЕ ВОПРОС. В базе набора без группы не бывает
 * (card_sets.group_id NOT NULL), а учителю сплошь и рядом нужен «просто набор»:
 * двадцать слов с урока, никакой полки. Заставлять его перед этим придумывать
 * имя группе — просить лишнее решение ради строки-родителя.
 *
 * ПОЭТОМУ одиночный набор лежит в группе БЕЗ НАЗВАНИЯ. Такая группа нигде не
 * показывается: ни рейлом у ученика, ни списком полок в Конструкторе, — она
 * существует только как родитель. Полка — это группа, которую НАЗВАЛИ, и
 * называют её тогда, когда наборов стало несколько (см. groupSets).
 *
 * Отдельной колонки под это нет намеренно: «полка без имени» невозможна и без
 * флага — витрине нечего было бы на ней написать.
 */
export const isShelf = (g: CardGroup) => g.title.trim().length > 0

/**
 * Стереть группы, в которых не осталось наборов.
 *
 * Зовётся после переездов: обёртка, из которой набор уехал на полку, — мусор.
 * НАЗВАННЫЕ группы не трогаются даже пустыми: имя полки придумал человек, и
 * молча стирать его за то, что последний набор временно вынули, нельзя.
 */
export async function purgeEmptyGroups(ids: string[]): Promise<void> {
  const list = [...new Set(ids)].filter(Boolean)
  if (list.length === 0) return
  const { data: rows } = await supabase.from('card_groups').select('id, title').in('id', list)
  const wrappers = (rows ?? []).filter(r => !((r.title as string) ?? '').trim()).map(r => r.id as string)
  if (wrappers.length === 0) return
  const { data: busyRows } = await supabase.from('card_sets').select('group_id').in('group_id', wrappers)
  const busy = new Set((busyRows ?? []).map(r => r.group_id as string))
  const empty = wrappers.filter(id => !busy.has(id))
  if (empty.length === 0) return
  const { error } = await supabase.from('card_groups').delete().in('id', empty)
  if (error) console.error('cardGroups: purge', error)
}

/**
 * Перенести наборы в группу.
 *
 * Порядок дописывается В КОНЕЦ полки, а не с нуля: наборы могут переезжать в
 * уже непустую группу, и общий `sort: i` перемешал бы её содержимое.
 */
export async function moveSetsToGroup(setIds: string[], groupId: string): Promise<boolean> {
  if (setIds.length === 0) return true
  // Откуда наборы уезжают — спрашиваем ДО переезда: после него обёртку по
  // набору уже не найти, а пустой она остаться не должна.
  const { data: before } = await supabase.from('card_sets').select('group_id').in('id', setIds)
  const from = [...new Set((before ?? []).map(r => r.group_id as string))].filter(id => id !== groupId)

  const { data: tail } = await supabase
    .from('card_sets').select('sort').eq('group_id', groupId)
    .order('sort', { ascending: false }).limit(1)
  let sort = ((tail?.[0]?.sort as number | undefined) ?? -1) + 1

  let ok = true
  for (const id of setIds) {
    const { error } = await supabase.from('card_sets').update({ group_id: groupId, sort }).eq('id', id)
    if (error) { console.error('cardGroups: move set', error); ok = false; continue }
    sort += 1
  }
  await purgeEmptyGroups(from)
  return ok
}

/**
 * Сложить отмеченные наборы в новую полку.
 *
 * Это единственный способ завести группу: её не создают пустой и не заполняют
 * потом — она появляется в тот момент, когда наборам стало тесно списком.
 * Возвращает id полки.
 */
export async function groupSets(opts: {
  title: string
  lang: string
  subject?: string | null
  studentIds?: string[]
  createdBy?: string | null
  authorStudentId?: string | null
  setIds: string[]
}): Promise<string | null> {
  const { data, error } = await supabase
    .from('card_groups')
    .insert({
      lang: opts.lang,
      subject: opts.subject ?? null,
      title: opts.title.trim(),
      about: '',
      level: null,
      sort: 0,
      student_ids: opts.studentIds ?? [],
      created_by: opts.createdBy ?? null,
      author_student_id: opts.authorStudentId ?? null,
    })
    .select('id')
    .single()
  if (error || !data) { console.error('cardGroups: create shelf', error); return null }
  const id = data.id as string
  await moveSetsToGroup(opts.setIds, id)
  return id
}

/**
 * Вынуть наборы с полки: каждый уезжает в собственную обёртку и снова живёт
 * сам по себе. Язык и адресность наследуются от полки — иначе набор пропал бы
 * из витрины ученика, которому был назначен.
 */
export async function ungroupSets(
  setIds: string[],
  meta: {
    lang: string; subject?: string | null; studentIds?: string[]
    createdBy?: string | null; authorStudentId?: string | null
  },
): Promise<boolean> {
  let ok = true
  for (const setId of setIds) {
    const { data, error } = await supabase
      .from('card_groups')
      .insert({
        lang: meta.lang,
        subject: meta.subject ?? null,
        title: '',
        about: '',
        level: null,
        sort: 0,
        student_ids: meta.studentIds ?? [],
        created_by: meta.createdBy ?? null,
        author_student_id: meta.authorStudentId ?? null,
      })
      .select('id')
      .single()
    if (error || !data) { console.error('cardGroups: wrapper', error); ok = false; continue }
    if (!await moveSetsToGroup([setId], data.id as string)) ok = false
  }
  return ok
}

/** Удалить набор. Обёртка, оставшаяся без него, уезжает следом. */
export async function deleteCardSet(setId: string): Promise<boolean> {
  const { data: row } = await supabase.from('card_sets').select('group_id').eq('id', setId).maybeSingle()
  const { error } = await supabase.from('card_sets').delete().eq('id', setId)
  if (error) { console.error('cardGroups: delete set', error); return false }
  if (row?.group_id) await purgeEmptyGroups([row.group_id as string])
  return true
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
