// Площадка курсов: витрина, карточка, запись, кабинет автора.
//
// Сервер — миграция 20261125200000_course_marketplace_foundation.sql.
// Источник правды о доступе — course_entitlements; курс у покупателя
// открывается обычным треком ученика (строка students с source='purchase').
// План и границы: docs/analysis/course-marketplace-2026-11-25.md.

import { supabase } from './supabase'

/** Локальное превью экранов без базы: ?catalogDemo=1, только dev-сборка.
 *  В production условие — константа false, ветки и модуль демо вырезаются. */
export const CATALOG_DEMO = import.meta.env.DEV && typeof location !== 'undefined' && /[?&]catalogDemo=1/.test(location.search)
const demo = () => import('./catalogDemo')

/** Категории витрины. Не школьные предметы: предмет курса (courses.subject)
 *  управляет тренажёрами и цветом, а категория — только поиском в каталоге. */
export const CATALOG_CATEGORIES = [
  { id: 'accounting', label: 'Бухгалтерия и финансы' },
  { id: 'data', label: 'Excel и работа с данными' },
  { id: 'it', label: 'IT и программирование' },
  { id: 'business', label: 'Бизнес и управление' },
  { id: 'design', label: 'Дизайн и творчество' },
  { id: 'languages', label: 'Иностранные языки' },
  { id: 'exams', label: 'Школа и экзамены' },
  { id: 'science', label: 'Наука' },
  { id: 'self', label: 'Саморазвитие' },
  { id: 'other', label: 'Другое' },
] as const
export type CatalogCategory = (typeof CATALOG_CATEGORIES)[number]['id']

export function categoryLabel(id: string | null | undefined): string {
  return CATALOG_CATEGORIES.find(c => c.id === id)?.label ?? 'Другое'
}

/** Тона обложки: градиент без картинки (картинки — следующим этапом). */
export const COVER_TONES: Record<string, string> = {
  green: 'linear-gradient(135deg,#2FA862,#1C6B4A)',
  blue: 'linear-gradient(135deg,#5A9BF0,#1F4FB8)',
  coral: 'linear-gradient(135deg,#F58A6E,#C2405A)',
  amber: 'linear-gradient(135deg,#FFC94D,#E0762E)',
  violet: 'linear-gradient(135deg,#9D8BFF,#5A47D6)',
  teal: 'linear-gradient(135deg,#5AD4C5,#13887A)',
  graphite: 'linear-gradient(135deg,#6E6C7E,#2E2D38)',
}
export const COVER_TONE_IDS = Object.keys(COVER_TONES)
const TONE_BY_CATEGORY: Record<string, string> = {
  accounting: 'green', data: 'amber', it: 'blue', business: 'graphite', design: 'coral',
  languages: 'coral', exams: 'violet', science: 'teal', self: 'violet', other: 'graphite',
}
export function coverBackground(tone: string | null | undefined, category?: string | null): string {
  return COVER_TONES[tone || ''] ?? COVER_TONES[TONE_BY_CATEGORY[category || ''] ?? 'violet']
}

/** Версии документов, на которые ссылается согласие. Меняются вместе с
 *  public/consent.html и public/offer.html. */
export const PD_CONSENT_VERSION = 'pd-2026-11-25'
export const OFFER_VERSION = 'offer-draft-2026-11-25'

export type CatalogItem = {
  slug: string
  category: string
  price_kopecks: number
  subtitle: string
  level_label: string
  duration_label: string
  cover_tone: string
  cover_glyph: string
  published_at: string | null
  title: string
  subject: string | null
  author: string
  module_count: number
  lesson_count: number
  has_preview: boolean
}

export type CatalogAccess = 'none' | 'preview' | 'full'
export type OrderStatus = 'requested' | 'pending' | 'paid' | 'canceled' | 'refunded'

export type CatalogCourse = {
  course_id: string
  slug: string
  status: ListingStatus
  course_status: string
  title: string
  subject: string | null
  category: string
  price_kopecks: number
  subtitle: string
  description: string
  outcomes: string[]
  audience: string
  level_label: string
  duration_label: string
  cover_tone: string
  cover_glyph: string
  certificate_note: string
  author_note: string
  author: string
  is_owner: boolean
  modules: { id: string; label: string; preview: boolean; lessons: string[] }[]
  viewer: { signed_in: boolean; access: CatalogAccess; student_id: string | null; order_status: OrderStatus | null }
}

export type ListingStatus = 'draft' | 'review' | 'published' | 'rejected' | 'archived'

export function formatPrice(kopecks: number): string {
  if (!kopecks) return 'Бесплатно'
  const rub = kopecks / 100
  return `${rub.toLocaleString('ru-RU', { maximumFractionDigits: rub % 1 ? 2 : 0 })} ₽`
}

export function lessonsLabel(n: number): string {
  const m10 = n % 10, m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? 'урок' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'урока' : 'уроков'
  return `${n} ${w}`
}

export function modulesLabel(n: number): string {
  const m10 = n % 10, m100 = n % 100
  const w = m10 === 1 && m100 !== 11 ? 'модуль' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'модуля' : 'модулей'
  return `${n} ${w}`
}

export async function fetchCatalog(): Promise<CatalogItem[]> {
  if (CATALOG_DEMO) return (await demo()).DEMO_ITEMS
  const { data, error } = await supabase.rpc('catalog_list')
  if (error) throw error
  return (Array.isArray(data) ? data : []) as CatalogItem[]
}

export async function fetchCatalogCourse(slug: string): Promise<CatalogCourse | null> {
  if (CATALOG_DEMO) return (await demo()).demoCourse(slug, /[?&]access=(preview|full)/.exec(location.search)?.[1] as 'preview' | 'full' | undefined)
  const { data, error } = await supabase.rpc('catalog_course', { p_slug: slug })
  if (error) throw error
  return (data ?? null) as CatalogCourse | null
}

export type EnrollResult = {
  access: CatalogAccess
  order_id: string | null
  order_status: OrderStatus | null
  student: { id: string; name: string; groupId: string }
  course_short_id: string | null
}

export async function enrollInCourse(slug: string, mode: 'preview' | 'full', opts: { name?: string; note?: string; offer?: boolean } = {}): Promise<EnrollResult> {
  if (CATALOG_DEMO) return { access: 'preview', order_id: 'demo', order_status: mode === 'full' ? 'requested' : null, student: { id: 'demo', name: 'Демо', groupId: '' }, course_short_id: null }
  const { data, error } = await supabase.rpc('catalog_enroll', {
    p_slug: slug,
    p_mode: mode,
    p_pd_version: PD_CONSENT_VERSION,
    p_offer_version: opts.offer ? OFFER_VERSION : null,
    p_name: opts.name ?? null,
    p_note: opts.note ?? null,
  })
  if (error) throw new Error(catalogErrorRu(error.message))
  return data as EnrollResult
}

export function catalogErrorRu(message: string): string {
  if (/CATALOG_SIGN_IN_REQUIRED/.test(message)) return 'Войдите, чтобы записаться на курс.'
  if (/CATALOG_NOT_FOUND/.test(message)) return 'Курс снят с витрины или ещё не опубликован.'
  if (/CATALOG_OWN_COURSE/.test(message)) return 'Это ваш курс: записываться на него не нужно.'
  if (/CATALOG_NO_PREVIEW/.test(message)) return 'У этого курса нет пробного модуля.'
  if (/CATALOG_CONSENT_REQUIRED/.test(message)) return 'Нужно согласие на обработку персональных данных.'
  if (/CATALOG_FORBIDDEN|42501/.test(message)) return 'Недостаточно прав.'
  if (/CATALOG_ORDER_CLOSED/.test(message)) return 'Заявка уже закрыта.'
  if (/LISTING_MODERATION_ONLY/.test(message)) return 'Публикует курс модератор. Отправьте его на проверку.'
  if (/course_listings_slug_key|duplicate key/.test(message)) return 'Такой адрес уже занят. Выберите другой.'
  if (/course_listings_slug_check/.test(message)) return 'Адрес: латиница, цифры и дефис, от 3 до 64 символов.'
  return 'Не получилось. Попробуйте ещё раз.'
}

// ── Кабинет автора ─────────────────────────────────────────────────────────

export type Listing = {
  course_id: string
  slug: string
  status: ListingStatus
  category: string
  price_kopecks: number
  subtitle: string
  description: string
  outcomes: string[]
  audience: string
  level_label: string
  duration_label: string
  cover_tone: string
  cover_glyph: string
  preview_module_ids: string[]
  certificate_note: string
  author_note: string
  reject_reason: string | null
  published_at: string | null
}

export type AuthorOverview = {
  listings: { course_id: string; title: string; course_status: string; listing: Listing | null; learners_full: number; learners_preview: number; orders_open: number; paid_total_kopecks: number }[]
  orders: { id: string; course_id: string; status: OrderStatus; amount_kopecks: number; created_at: string; contact_email: string | null; buyer_note: string | null; buyer_name: string | null }[]
  learners: { entitlement_id: string; course_id: string; access: CatalogAccess; source: string; granted_at: string; name: string | null }[]
}

export async function fetchAuthorOverview(): Promise<AuthorOverview> {
  if (CATALOG_DEMO) return (await demo()).DEMO_OVERVIEW
  const { data, error } = await supabase.rpc('catalog_author_overview')
  if (error) throw error
  return data as AuthorOverview
}

export async function saveListing(listing: Partial<Listing> & { course_id: string }): Promise<Listing> {
  if (CATALOG_DEMO) return listing as Listing
  const { data, error } = await supabase.from('course_listings').upsert(listing, { onConflict: 'course_id' }).select('*').single()
  if (error) throw new Error(catalogErrorRu(error.message))
  return data as Listing
}

export async function decideOrder(orderId: string, decision: 'paid' | 'canceled'): Promise<void> {
  if (CATALOG_DEMO) return
  const { error } = await supabase.rpc('catalog_decide_order', { p_order: orderId, p_decision: decision })
  if (error) throw new Error(catalogErrorRu(error.message))
}

export async function revokeEntitlement(entitlementId: string): Promise<void> {
  if (CATALOG_DEMO) return
  const { error } = await supabase.rpc('catalog_revoke', { p_entitlement: entitlementId })
  if (error) throw new Error(catalogErrorRu(error.message))
}

/** Адрес курса в витрине из названия: транслитерация, дефисы. */
export function slugFromTitle(title: string): string {
  const map: Record<string, string> = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' }
  const s = title.toLowerCase().split('').map(ch => map[ch] ?? ch).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '')
  return s.length >= 3 ? s : `course-${Math.random().toString(36).slice(2, 8)}`
}

export const catalogHref = (slug?: string) => slug ? `#/catalog/${encodeURIComponent(slug)}` : '#/catalog'
