import testPreviews from '../data/testPreviews.json'

// Тесты со своим превью в мессенджерах: короткая /t/<id> отдаёт og-теги
// (часть после «#» Telegram не видит). Список и страницы — scripts/buildTestPreviews.py.
const WITH_PREVIEW = new Set(testPreviews.map(p => p.id))

export function diagShareUrl(subject: string): string {
  const { origin, pathname } = window.location
  if (WITH_PREVIEW.has(subject) && origin.startsWith('http')) return `${origin}/t/${subject}`
  return `${origin}${pathname}#/diagnostic?subject=${subject}`
}
