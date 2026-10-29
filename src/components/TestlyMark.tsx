// Знак Тестли — искра из его логотипа (brand/testly-mark.svg в Iskra_tests).
// Как иконка типа задания берёт цвет текста (currentColor); плитка вокруг —
// у вызывающего. TestlyTile — готовая чернильная плитка для карточек.
import type { CSSProperties } from 'react'

export default function TestlyMark({ size = 16, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden style={{ display: 'block', ...style }}>
      <path d="M10 0c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10Z" fill="currentColor" />
    </svg>
  )
}

/** Чернильная плитка со знаком: в списках тестов, в карточке задания, в профиле. */
export function TestlyTile({ size = 40 }: { size?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: Math.round(size * 0.3), flexShrink: 0,
      background: '#080F14', color: '#fff', display: 'grid', placeItems: 'center',
      // Тонкий светлый кант — чтобы чернильная плитка не тонула в тёмной теме.
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
    }}>
      <TestlyMark size={Math.round(size * 0.42)} />
    </span>
  )
}
