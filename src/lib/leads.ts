import { supabase } from './supabase'

// Заявка с публичного лендинга. Пишется в feedback_requests (author_role='lead')
// → видна во вкладке «Заявки» в Админке. Плюс best-effort уведомление в Telegram
// через Edge Function notify-lead (токен бота — секрет функции, не в бандле).

export interface LeadInput {
  name: string
  contact: string        // email / телефон / telegram — обязательно
  plan: string           // интересующий тариф (название)
  message: string
}

export async function submitLead(input: LeadInput): Promise<{ error: string | null }> {
  const name = input.name.trim()
  const contact = input.contact.trim()
  const plan = input.plan.trim()
  const message = input.message.trim()

  if (!contact) return { error: 'Укажите контакт для связи' }

  // 1) Durable-запись — даже если Telegram недоступен, заявка не потеряется.
  const { error } = await supabase.from('feedback_requests').insert({
    author_role: 'lead',
    author_name: name || null,
    contact,
    section: plan || null,   // section у лида = интересующий тариф
    message: message || 'Заявка с лендинга',
  })
  if (error) return { error: error.message }

  // 2) Best-effort пуш в Telegram. Ошибка/неконфиг — не рушим отправку.
  try {
    await supabase.functions.invoke('notify-lead', {
      body: { name, contact, plan, message },
    })
  } catch {
    /* заявка уже сохранена в БД — молча игнорируем сбой уведомления */
  }

  return { error: null }
}
