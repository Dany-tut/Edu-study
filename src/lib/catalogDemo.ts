// Демо-данные витрины ТОЛЬКО для локального превью: ?catalogDemo=1 в dev-сборке.
// В production-сборке модуль не подключается (проверка import.meta.env.DEV в catalog.ts).
// Цены, ученики и заявки выдуманы; курс «Бухгалтерия» — по пакету требований v2.

import type { AuthorOverview, CatalogCourse, CatalogItem, Listing } from './catalog'

const MODS = ['Основы Excel и очистка данных', 'Формулы и сверки', 'Отчётность', 'Численность сотрудников', 'Power Query и Google Таблицы', 'Искусственный интеллект', 'Работа в 1С', 'Внедрение автоматизаций']
const LESSONS: string[][] = [
  ['Как устроена таблица', 'Чистим выгрузку из 1С', 'Убираем дубли', 'Текст в числа и даты', 'Умная таблица'],
  ['ВПР и ПРОСМОТРX', 'Сверка платежей', 'СУММЕСЛИМН', 'Ошибки формул', 'Контрольные суммы', 'Условное форматирование'],
  ['Сводные таблицы', 'Отчёт по контрагентам', 'Графики для руководителя', 'Шаблон месячного отчёта'],
  ['Кто работал в месяце', 'Совместители и декрет', 'Распределение по организациям', 'Проверка итогов'],
  ['Первый запрос Power Query', 'Склеиваем 10 выгрузок', 'Обновление одной кнопкой', 'Google Таблицы: IMPORTRANGE', 'Права доступа'],
  ['Как спросить нейросеть', 'Обезличивание данных', 'Проверка ответа'],
  ['Навигация в 1С', 'Реестр выплат самозанятым', 'Разбор ошибок проведения', 'Отчёты 1С в Excel'],
  ['Выбираем, что автоматизировать', 'Инструкция для коллег', 'Итоговый проект'],
]

export const DEMO_ITEMS: CatalogItem[] = [
  { slug: 'buhgalteriya-bez-rutiny', category: 'accounting', price_kopecks: 299000, subtitle: 'Excel, Power Query, 1С и нейросети — пошагово, на рабочих ситуациях', level_label: 'С нуля по автоматизации', duration_label: '~17 часов', cover_tone: 'green', cover_glyph: '=СУММ', published_at: '2026-11-25', title: 'Бухгалтерия без ручной рутины', subject: 'Бухгалтерия', author: 'Автор курса', module_count: 8, lesson_count: 34, has_preview: true },
  { slug: 'power-query', category: 'data', price_kopecks: 199000, subtitle: 'Склеить десять выгрузок за минуту', level_label: 'Практик', duration_label: '~5 часов', cover_tone: 'amber', cover_glyph: 'PQ', published_at: '2026-11-20', title: 'Power Query за выходные', subject: null, author: 'Пример автора', module_count: 3, lesson_count: 9, has_preview: true },
  { slug: 'himiya-ege-19-22', category: 'exams', price_kopecks: 149000, subtitle: 'Задания 19–22 без ошибок', level_label: '10–11 класс', duration_label: '', cover_tone: 'blue', cover_glyph: 'H₂O', published_at: '2026-11-18', title: 'Химия ЕГЭ: задания 19–22', subject: 'Химия', author: 'Искра · ХимБио', module_count: 4, lesson_count: 12, has_preview: false },
  { slug: 'koreyskiy-hangyl', category: 'languages', price_kopecks: 0, subtitle: 'Алфавит за неделю', level_label: 'С нуля', duration_label: '', cover_tone: 'coral', cover_glyph: '한', published_at: '2026-11-10', title: 'Корейский с нуля: хангыль', subject: 'Корейский', author: 'Искра · Языки', module_count: 2, lesson_count: 20, has_preview: false },
  { slug: 'figma-start', category: 'design', price_kopecks: 249000, subtitle: 'Интерфейс первого приложения', level_label: 'С нуля', duration_label: '~8 часов', cover_tone: 'violet', cover_glyph: 'UI', published_at: '2026-11-05', title: 'Дизайн интерфейсов в Figma', subject: null, author: 'Пример автора', module_count: 5, lesson_count: 15, has_preview: true },
]

export function demoCourse(slug: string, access: 'none' | 'preview' | 'full' = 'none'): CatalogCourse | null {
  const item = DEMO_ITEMS.find(i => i.slug === slug)
  if (!item) return null
  const acc = item.slug === DEMO_ITEMS[0].slug
  return {
    course_id: 'demo-' + slug, slug, status: 'published', course_status: 'published', title: item.title, subject: item.subject, category: item.category,
    price_kopecks: item.price_kopecks, subtitle: item.subtitle,
    description: acc ? 'Самостоятельный текстовый курс с практикой. Каждый урок — одна рабочая задача: цель, шаги по одному действию, файл для практики и проверочный вопрос. Видео не нужны.' : 'Пример описания курса.',
    outcomes: acc ? ['Чистить выгрузки из 1С и банка за минуты', 'Сверять платежи формулами, а не глазами', 'Собирать отчёт по численности сотрудников', 'Разбирать ошибки в 1С по шагам'] : ['Пример результата'],
    audience: acc ? 'Практикующий бухгалтер без технической подготовки. Знание бухучёта пригодится, программирование не нужно.' : '',
    level_label: item.level_label, duration_label: item.duration_label, cover_tone: item.cover_tone, cover_glyph: item.cover_glyph,
    certificate_note: 'Сертификат Искры о прохождении. Не документ об образовании.', author_note: acc ? 'Бухгалтер-практик, ведёт 10 организаций' : '',
    author: item.author, is_owner: false,
    modules: acc ? MODS.map((label, i) => ({ id: 'm' + i, label, preview: i === 0, lessons: LESSONS[i] })) : [{ id: 'm0', label: 'Модуль 1', preview: item.has_preview, lessons: ['Урок 1', 'Урок 2'] }],
    viewer: { signed_in: false, access, student_id: null, order_status: null },
  }
}

const listing = (course_id: string, over: Partial<Listing>): Listing => ({
  course_id, slug: 'buhgalteriya-bez-rutiny', status: 'published', category: 'accounting', price_kopecks: 299000, subtitle: '', description: '', outcomes: [],
  audience: '', level_label: '', duration_label: '', cover_tone: 'green', cover_glyph: '=СУММ', preview_module_ids: [], certificate_note: '', author_note: '',
  reject_reason: null, published_at: '2026-11-25', ...over,
})

export const DEMO_OVERVIEW: AuthorOverview = {
  listings: [
    { course_id: 'c1', title: 'Бухгалтерия без ручной рутины', course_status: 'published', listing: listing('c1', {}), learners_full: 12, learners_preview: 41, orders_open: 2, paid_total_kopecks: 3588000 },
    { course_id: 'c2', title: 'Power Query для бухгалтера', course_status: 'published', listing: listing('c2', { slug: 'power-query', status: 'review', cover_tone: 'amber', price_kopecks: 199000 }), learners_full: 0, learners_preview: 0, orders_open: 0, paid_total_kopecks: 0 },
    { course_id: 'c3', title: '1С: самозанятые и реестры', course_status: 'draft', listing: listing('c3', { slug: '1c-samozanyatye', status: 'rejected', cover_tone: 'blue', reject_reason: 'Добавьте пробный модуль и описание для кого курс' }), learners_full: 0, learners_preview: 0, orders_open: 0, paid_total_kopecks: 0 },
  ],
  orders: [
    { id: 'o1', course_id: 'c1', status: 'requested', amount_kopecks: 299000, created_at: '2026-11-25T10:00:00Z', contact_email: 'anna.buh@example.ru', buyer_note: 'Удобно оплатить по счёту от ИП', buyer_name: 'Анна Смирнова' },
    { id: 'o2', course_id: 'c1', status: 'requested', amount_kopecks: 299000, created_at: '2026-11-24T16:20:00Z', contact_email: 'olga@example.ru', buyer_note: null, buyer_name: 'Ольга К.' },
  ],
  learners: [
    { entitlement_id: 'e1', course_id: 'c1', access: 'full', source: 'purchase', granted_at: '2026-11-23T09:00:00Z', name: 'Мария Иванова' },
    { entitlement_id: 'e2', course_id: 'c1', access: 'preview', source: 'preview', granted_at: '2026-11-24T12:00:00Z', name: 'Сергей П.' },
    { entitlement_id: 'e3', course_id: 'c1', access: 'full', source: 'purchase', granted_at: '2026-11-22T18:00:00Z', name: 'Елена Петрова' },
  ],
}
