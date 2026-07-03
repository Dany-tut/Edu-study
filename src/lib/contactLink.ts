// Нормализация контакта ученика (Telegram / VK).
// На вход можно дать: @username, https://t.me/username, t.me/username,
// ссылку ВК (vk.com/id123 или vk.com/durov) — сам вычленяем нужное.
//
// Храним:
//   • для Telegram — голый username (обратная совместимость со старыми данными);
//   • для VK и прочих ссылок — полный URL.

export function normalizeContact(raw: string): string {
  const s = (raw || '').trim()
  if (!s) return ''

  // VK — сохраняем как полную ссылку
  if (/vk\.(com|ru)/i.test(s)) {
    return s.startsWith('http') ? s : `https://${s.replace(/^\/+/, '')}`
  }

  // Telegram-ссылка → вычленяем username
  const tme = s.match(/t\.me\/([A-Za-z0-9_]+)/i)
  if (tme) return tme[1]

  // Любая другая полная ссылка — оставляем как есть
  if (/^https?:\/\//i.test(s)) return s

  // @username или просто username
  return s.replace(/^@/, '')
}

// Кликабельная ссылка из сохранённого значения
export function contactHref(value: string): string {
  const v = (value || '').trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/vk\.(com|ru)/i.test(v)) return `https://${v}`
  return `https://t.me/${v}`
}

// Человекочитаемая подпись
export function contactLabel(value: string): string {
  const v = (value || '').trim()
  if (!v) return ''
  if (/vk\.(com|ru)/i.test(v)) return 'VK'
  if (/^https?:\/\//i.test(v)) return v.replace(/^https?:\/\//i, '')
  return `@${v}`
}
