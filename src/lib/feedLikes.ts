// Лайк под материалом ленты.
//
// ОПТИМИСТИЧНО, НО ЧЕСТНО. Сердце закрашивается сразу по нажатию, не дожидаясь
// базы: лайк — жест на четверть секунды, и ждать под ним спиннер невозможно.
// Но если запрос не прошёл, состояние ОТКАТЫВАЕТСЯ обратно — «поставилось на
// экране, не поставилось в базе» хуже, чем задержка.
//
// Область видимости — группа, как у комментариев: «12 лайков» под материалом
// значит двенадцать одноклассников, а не двенадцать незнакомцев со всей базы
// (см. миграцию 0058).
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { getStudentSession } from './studentSession'
import { getOwnerId, getSessionUser } from './owner'

export function useFeedLikes(itemId: string) {
  const [count, setCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)
  // Как и обсуждение (миграция 0060), лайки живут только под своим входом:
  // общему anon-ключу их не отдают. Без аккаунта сердце просто не показываем —
  // нажатие, которое гарантированно откатится, хуже его отсутствия.
  const [authed, setAuthed] = useState(false)

  const session = getStudentSession()
  const groupId = session?.groupId || ''

  const load = useCallback(async () => {
    if (!itemId || !groupId) return
    try {
      const me = await getOwnerId()
      setAuthed(!!me)
      if (!me) { setCount(0); setLiked(false); return }
      const { data, error } = await supabase
        .from('feed_likes')
        .select('student_id,author_user')
        .eq('item_id', itemId)
        .eq('group_id', groupId)
      if (error) throw error
      const rows = data ?? []
      setCount(rows.length)
      setLiked(rows.some(r =>
        (session?.id && r.student_id === session.id) || (me && r.author_user === me)))
    } catch (e) {
      // Лайки — украшение поста, а не его содержимое: не загрузились, значит
      // их просто нет на экране. Пост от этого читаться не перестаёт.
      console.error('feedLikes load:', e)
    }
  }, [itemId, groupId, session?.id])

  useEffect(() => { void load() }, [load])

  const toggle = useCallback(async () => {
    if (!groupId || busy || !authed) return
    const was = liked
    setBusy(true)
    setLiked(!was)
    setCount(c => c + (was ? -1 : 1))
    try {
      if (was) {
        let q = supabase.from('feed_likes').delete().eq('item_id', itemId)
        q = session?.id
          ? q.eq('student_id', session.id)
          : q.eq('author_user', (await getOwnerId()) ?? '')
        const { error } = await q
        if (error) throw error
      } else {
        const me = await getSessionUser()
        const row: Record<string, unknown> = { item_id: itemId, group_id: groupId }
        if (session?.id) row.student_id = session.id
        else if (me?.id) row.author_user = me.id
        else throw new Error('нет ни ученика, ни пользователя')
        const { error } = await supabase.from('feed_likes').insert(row)
        if (error) throw error
      }
    } catch (e) {
      console.error('feedLikes toggle:', e)
      // Откат: экран не должен показывать то, чего нет в базе.
      setLiked(was)
      setCount(c => c + (was ? 1 : -1))
    } finally {
      setBusy(false)
    }
  }, [itemId, groupId, liked, busy, authed, session?.id])

  return { count, liked, toggle, canLike: !!groupId && authed }
}
