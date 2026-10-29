import { createLucideIcon } from 'lucide-react'

// Аватар учителя: человек над раскрытой книгой. В lucide такого нет —
// рисуем в его сетке 24×24, чтобы толщина линий совпадала с соседями.
// Страницы чуть залиты — книга читается плотнее плечей.
export const TeacherBook = createLucideIcon('TeacherBook', [
  ['circle', { cx: '12', cy: '5.2', r: '2.7', key: 'head' }],
  ['path', { d: 'M6.6 12.4c.7-2.6 2.9-4.3 5.4-4.3s4.7 1.7 5.4 4.3', key: 'shoulders' }],
  ['path', { d: 'M12 14.2c-1.9-1.3-4.4-1.7-7-1.3v6.6c2.6-.4 5.1 0 7 1.3c1.9-1.3 4.4-1.7 7-1.3v-6.6c-2.6-.4-5.1 0-7 1.3Z', fill: 'currentColor', fillOpacity: '0.22', key: 'pages' }],
  ['path', { d: 'M12 14.2v6.6', key: 'spine' }],
])
