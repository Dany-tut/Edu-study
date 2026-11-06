import type { ReactNode } from 'react'

// Разбор моделью приходит markdown-ом — общий вид для «Аналитика → Разбор» и
// «Заявки → Сводка недели».

// Разбор приходит markdown-ом. Полноценный парсер сюда тащить незачем: модели
// заданы заголовки, списки, жирный и таблицы — разбираем ровно это, остальное
// показываем абзацем как есть.
export default function DigestMarkdown({ text }: { text: string }) {
  // Ссылки — только http(s): в сводке это задачи Sentry, и ничего другого
  // (javascript: и т.п.) из текста модели в href попадать не должно.
  const bold = (line: string) => line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s)]+)/g).map((piece, i) => {
    const md = piece.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    if (md || /^https?:\/\//.test(piece)) {
      const href = md ? md[2] : piece
      return <a key={i} href={href} target="_blank" rel="noopener noreferrer" data-hover="link"
        style={{ color:'var(--color-purple-text)', textDecoration:'underline', textUnderlineOffset:2, overflowWrap:'anywhere' }}>{md ? md[1] : piece}</a>
    }
    if (piece.startsWith('**') && piece.endsWith('**'))
      return <strong key={i} style={{ color:'var(--color-text)' }}>{piece.slice(2,-2)}</strong>
    if (piece.startsWith('`') && piece.endsWith('`'))
      return <code key={i} style={{
        background:'var(--color-bg-3)', borderRadius:5, padding:'1px 6px',
        fontSize:'0.92em', fontFamily:'ui-monospace, SFMono-Regular, monospace',
      }}>{piece.slice(1,-1)}</code>
    return <span key={i}>{piece}</span>
  })

  const out: ReactNode[] = []
  let list: string[] = []
  let ordered = false
  const flushList = () => {
    if (list.length === 0) return
    // Маркеры рисуем явно: общий сброс стилей снимает list-style, а номер у
    // «Что болит чаще всего» — это место темы в рейтинге.
    const style = { margin:'6px 0 12px', paddingLeft:22, lineHeight:1.6, listStyle: ordered ? 'decimal' : 'disc' }
    const items = list.map((li, i) => (
      <li key={i} style={{ marginBottom:4 }}>
        {li.split('\n').map((part, j) => <span key={j} style={{ display: j ? 'block' : 'inline' }}>{bold(part)}</span>)}
      </li>
    ))
    out.push(ordered
      ? <ol key={`ol${out.length}`} style={style}>{items}</ol>
      : <ul key={`ul${out.length}`} style={style}>{items}</ul>)
    list = []
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const li = line.match(/^\s*([-*•]|\d+\.)\s+(.*)$/)
    if (li) {
      const isOrdered = /\d/.test(li[1])
      if (list.length && isOrdered !== ordered) flushList()
      ordered = isOrdered
      list.push(li[2]); continue
    }
    // Строка с отступом сразу после пункта — его продолжение («Связано: …»).
    if (list.length && /^\s{2,}\S/.test(raw)) { list[list.length - 1] += '\n' + line.trim(); continue }
    flushList()
    if (!line.trim()) continue
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      const lvl = h[1].length
      out.push(
        <div key={out.length} style={{
          fontSize: lvl <= 2 ? 15 : 14, fontWeight:700, color:'var(--color-text)',
          margin: out.length === 0 ? '0 0 10px' : '20px 0 8px',
        }}>{bold(h[2])}</div>,
      )
      continue
    }
    // Строка таблицы-разделителя (|---|---|) смысла не несёт.
    if (/^\s*\|[\s|:-]+\|\s*$/.test(line)) continue
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim())
      out.push(
        <div key={out.length} style={{ display:'flex', gap:12, padding:'4px 0', fontSize:13, borderBottom:'1px solid var(--color-border)' }}>
          {cells.map((c, i) => <div key={i} style={{ flex: i === 0 ? 2 : 1, minWidth:0 }}>{bold(c)}</div>)}
        </div>,
      )
      continue
    }
    out.push(<p key={out.length} style={{ margin:'0 0 10px', lineHeight:1.6 }}>{bold(line)}</p>)
  }
  flushList()
  return <div style={{ fontSize:13, color:'var(--color-text-2)' }}>{out}</div>
}
