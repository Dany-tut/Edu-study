import { useEffect } from 'react'
import { supabase } from './supabase'
import { useNotificationsStore, type NotifRow } from '../store/notificationsStore'

/**
 * Hydrate the notifications store for a recipient and keep it live via Realtime.
 * Returns a cleanup function that unsubscribes and resets the store.
 *
 * `recipientId` is the student.id (student app) or the teacher auth.users.id
 * (teacher app) — it matches notifications.recipient_id written by the DB triggers.
 */
export function initNotifications(recipientId: string): () => void {
  const store = useNotificationsStore.getState()
  store.setRecipient(recipientId)

  // Initial fetch — recent history (read state preserved, not shown as "live").
  void supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(50)
    .then(({ data }) => {
      if (data) useNotificationsStore.getState().hydrate(data as NotifRow[])
    })

  const channel = supabase
    .channel(`notifications-${recipientId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${recipientId}`,
    }, payload => {
      useNotificationsStore.getState().ingest(payload.new as NotifRow)
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${recipientId}`,
    }, payload => {
      useNotificationsStore.getState().applyUpdate(payload.new as NotifRow)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
    useNotificationsStore.getState().reset()
  }
}

/** React hook: init notifications for the given recipient while mounted. */
export function useNotificationsInit(recipientId: string | null | undefined) {
  useEffect(() => {
    if (!recipientId) return
    return initNotifications(recipientId)
  }, [recipientId])
}
