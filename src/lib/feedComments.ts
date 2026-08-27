// Комментарии под материалами ленты.
//
// ЧТО ЗДЕСЬ ЕСТЬ И ЧЕГО НЕТ. Есть чтение треда, ответ на реплику (один уровень)
// и удаление своего. Нет своих постов в ленту: это отдельная вещь со своей
// проверкой перед публикацией, и мешать её с репликами нельзя.
//
// ОБЛАСТЬ ВИДИМОСТИ — ГРУППА. Не «вся платформа»: у каждого учителя свои
// ученики, платформа работает с детьми, и общий тред означал бы переписку
// детей разных учителей без единого взрослого, который за неё отвечает. Тред
// материала — это тред КЛАССА по этому материалу. Правило держится не на
// клиенте, а на RLS (миграция 0057); здесь мы просто не даём писать, когда
// группы нет.
//
// ПОЧЕМУ БЕЗ REALTIME. Обсуждение под учебной заметкой — это не чат: реплики
// приходят раз в час, а не раз в секунду. Подписка на канал ради этого держала
// бы сокет на каждом открытом материале. Перечитываем после своей отправки и
// при открытии треда.
import { useCallback, useEffect, useState } from 'react'
import { t } from './i18n'
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'
import { getOwnerId, getSessionUser } from './owner'

export interface FeedComment {
  id: string
  itemId: string
  authorName: string
  /** Кто написал: ученик (id) или пользователь-учитель (uuid). */
  studentId: string | null
  authorUser: string | null
  body: string
  parentId: string | null
  hidden: boolean
  createdAt: string
  /** Своё ли это сообщение — считается на клиенте по текущей сессии. */
  mine: boolean
}

interface Row {
  id: string
  item_id: string
  author_name: string
  student_id: string | null
  author_user: string | null
  body: string
  parent_id: string | null
  hidden: boolean
  created_at: string
}

function toComment(r: Row, meStudent: string | null, meUser: string | null): FeedComment {
  return {
    id: r.id,
    itemId: r.item_id,
    authorName: r.author_name || 'Ученик',
    studentId: r.student_id,
    authorUser: r.author_user,
    body: r.body,
    parentId: r.parent_id,
    hidden: r.hidden,
    createdAt: r.created_at,
    mine: (!!meStudent && r.student_id === meStudent) || (!!meUser && r.author_user === meUser),
  }
}

/**
 * Тред одного материала: корневые реплики и ответы на них.
 *
 * Плоский список из базы разложен здесь, а не в компоненте: по этим же
 * веткам считается «сколько всего реплик» на карточке в ленте, и две
 * реализации группировки дали бы два разных числа.
 */
export interface Thread {
  root: FeedComment
  replies: FeedComment[]
}

export function toThreads(list: FeedComment[]): Thread[] {
  const roots = list.filter(c => !c.parentId)
  const byParent = new Map<string, FeedComment[]>()
  for (const c of list) {
    if (!c.parentId) continue
    const arr = byParent.get(c.parentId)
    if (arr) arr.push(c)
    else byParent.set(c.parentId, [c])
  }
  return roots.map(root => ({ root, replies: byParent.get(root.id) ?? [] }))
}

/**
 * Комментарии материала. Возвращает и то, можно ли вообще писать: у ученика
 * без группы треда нет — не потому, что «не разрешили», а потому что писать
 * некуда, и это надо сказать словами, а не пустым полем ввода.
 */
export function useFeedComments(itemId: string, lang: string) {
  const [list, setList] = useState<FeedComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /**
   * Есть ли у читателя свой вход.
   *
   * С миграции 0060 обсуждения живут только под auth-аккаунтом: у общего
   * anon-ключа нет личности, и «видно своей группе» для него было неправдой —
   * реплики читались между группами разных учителей. Ученику со старым входом
   * по временному паролю тред не показывается, и он должен видеть ПОЧЕМУ.
   */
  const [authed, setAuthed] = useState<boolean | null>(null)

  const session = getStudentSession()
  const groupId = session?.groupId || ''

  const load = useCallback(async () => {
    if (!itemId) return
    setLoading(true)
    setError(null)
    try {
      const me = await getOwnerId()
      setAuthed(!!me)
      if (!me) { setList([]); setLoading(false); return }
      let q = supabase
        .from('feed_comments')
        .select('id,item_id,author_name,student_id,author_user,body,parent_id,hidden,created_at')
        .eq('item_id', itemId)
        .order('created_at', { ascending: true })
      if (groupId) q = q.eq('group_id', groupId)

      const { data, error: e } = await q
      if (e) throw e
      setList((data ?? []).map(r => toComment(r as Row, session?.id ?? null, me)))
    } catch (e) {
      // Обсуждение — не главное на экране: если оно не загрузилось, материал
      // всё равно должен читаться. Поэтому ошибка живёт в треде, а не выше.
      console.error('feedComments load:', e)
      setError(t('Не удалось загрузить обсуждение'))
    } finally {
      setLoading(false)
    }
  }, [itemId, groupId, session?.id])

  useEffect(() => { void load() }, [load])

  const add = useCallback(async (body: string, parentId: string | null) => {
    const text = body.trim()
    if (!text || !groupId) return false
    try {
      const me = await getSessionUser()
      // Автор — ЛИБО ученик, либо пользователь: в таблице это check-constraint,
      // и отправлять оба поля разом нельзя. Тип строки один, чтобы билдер не
      // разбирал объединение двух форм.
      const row: Record<string, unknown> = {
        item_id: itemId, lang, group_id: groupId,
        body: text, parent_id: parentId,
      }
      if (session?.id) {
        row.student_id = session.id
        row.author_name = session.name || 'Ученик'
      } else if (me?.id) {
        row.author_user = me.id
        // Имя из профиля, а НЕ почта: подпись видна всему классу, и раздавать
        // ученикам рабочий адрес учителя мы не собирались.
        const meta = (me.user_metadata ?? {}) as { name?: string; first_name?: string }
        row.author_name = meta.name || meta.first_name || 'Учитель'
      } else {
        // Ни сессии ученика, ни авторизации — писать нечем и некому.
        return false
      }
      const { error: e } = await supabase.from('feed_comments').insert(row)
      if (e) throw e
      await load()
      return true
    } catch (e) {
      console.error('feedComments add:', e)
      setError('Не удалось отправить')
      return false
    }
  }, [itemId, lang, groupId, session?.id, session?.name, load])

  const remove = useCallback(async (id: string) => {
    try {
      const { error: e } = await supabase.from('feed_comments').delete().eq('id', id)
      if (e) throw e
      await load()
    } catch (e) {
      console.error('feedComments remove:', e)
      setError(t('Не удалось удалить'))
    }
  }, [load])

  return {
    list,
    threads: toThreads(list),
    loading,
    error,
    /** Писать некуда, если ученик не в группе: тред у материала — это тред класса. */
    canWrite: !!groupId && authed === true,
    /** Тред закрыт не «потому что нельзя», а потому что нет своего входа. */
    needsAccount: authed === false,
    add,
    remove,
    reload: load,
  }
}

/** «5 минут назад», «вчера» — время реплики без библиотеки на 20 КБ. */
export function whenLabel(iso: string, now = Date.now()): string {
  const ms = now - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  const min = Math.floor(ms / 60000)
  if (min < 1) return t('только что')
  if (min < 60) return `${min} ${t('мин назад')}`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} ${t('ч назад')}`
  const d = Math.floor(h / 24)
  if (d === 1) return t('вчера')
  if (d < 7) return `${d} ${t('дн. назад')}`
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}
