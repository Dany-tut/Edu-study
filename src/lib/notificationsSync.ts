import { useEffect } from 'react'
import { supabase } from './supabase'
import { useNotificationsStore, type NotifRow } from '../store/notificationsStore'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Hydrate the notifications store for the cabinet's recipients and keep it live
 * via Realtime. Returns a cleanup function that unsubscribes and resets the store.
 *
 * Получатель — то, что пишут триггеры в notifications.recipient_id: у учителя
 * это auth.users.id, у ученика — id строки students. У ученика с несколькими
 * предметами строк несколько (по одной на трек), и уведомление по второму
 * предмету адресовано второй строке — поэтому слушаем все сразу.
 */
export function initNotifications(recipientIds: string[]): () => void {
  // recipient_id — uuid: одна строка вроде демо-охвата `local-…` уронила бы
  // весь запрос `in (…)` ошибкой 22P02, вместе с настоящими получателями.
  const ids = [...new Set(recipientIds.filter(id => UUID.test(id)))].sort()
  if (!ids.length) return () => {}
  const key = ids.join(',')
  useNotificationsStore.getState().setRecipients(ids)

  // Initial fetch — recent history (read state preserved, not shown as "live").
  // Поздний ответ прежнего набора получателей (охват ученика догрузился, и
  // подписка пересоздана) не должен затирать список нового набора.
  supabase
    .from('notifications')
    .select('*')
    .in('recipient_id', ids)
    .order('created_at', { ascending: false })
    .limit(50)
    .then(({ data, error }) => {
      if (error) { console.error('[notifications:hydrate]', error); return }
      const current = useNotificationsStore.getState().recipientIds.join(',')
      if (data && current === key) useNotificationsStore.getState().hydrate(data as NotifRow[])
    })

  const filter = ids.length === 1 ? `recipient_id=eq.${ids[0]}` : `recipient_id=in.(${key})`
  const channel = supabase
    .channel(`notifications-${key}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter,
    }, payload => {
      useNotificationsStore.getState().ingest(payload.new as NotifRow)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter,
    }, payload => {
      useNotificationsStore.getState().applyUpdate(payload.new as NotifRow)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
    useNotificationsStore.getState().reset()
  }
}

/**
 * React hook: init notifications for the given recipients while mounted.
 * Один id (учитель) или список (строки-треки ученика); порядок не важен.
 */
export function useNotificationsInit(recipients: string | readonly string[] | null | undefined) {
  const list = typeof recipients === 'string' ? [recipients] : recipients ?? []
  const key = [...new Set(list.filter(Boolean))].sort().join(',')
  useEffect(() => {
    if (!key) return
    return initNotifications(key.split(','))
  }, [key])
}
