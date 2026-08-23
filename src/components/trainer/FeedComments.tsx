import { useEffect, useState } from 'react'
import { CornerDownRight, Trash2, Send } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { proseWrap } from '../../lib/typography'
import { useFeedComments, whenLabel, type FeedComment } from '../../lib/feedComments'

// ─────────────────────────────────────────────────────────────────────────────
// Обсуждение под материалом ленты
//
// ЧТО ЭТО ДАЁТ ПОМИМО «КАК В СОЦСЕТЯХ». Реплика под новостью — единственное
// место в тренажёре, где ученик пишет НЕ на оценку. Ошибка в комментарии ничего
// не стоит, и поэтому здесь пишут — а не выбирают из четырёх вариантов.
//
// ТРЕД — ЭТО ТРЕД КЛАССА. Видны реплики своей группы, а не всей платформы: см.
// миграцию 0057, там же и причина. Ученику без группы поле ввода не
// показывается, и он видит, ПОЧЕМУ, а не пустоту.
//
// СВЁРНУТО ПО УМОЛЧАНИЮ, А КНОПКА ЖИВЁТ СНАРУЖИ. Разворачивает тред иконка в
// строке поста — рядом с сердцем, как в любой ленте. Сюда она не входит: своя
// подпись «Обсудить» под каждым постом читалась как раздел документа, а не как
// действие. Развёрнутый тред на каждой карточке превратил бы ленту из десяти
// заметок в ленту из ста реплик.
// ─────────────────────────────────────────────────────────────────────────────

export function FeedComments({ itemId, lang, accent, open, onCount }: {
  itemId: string
  lang: string
  accent: string
  /** Развёрнут ли тред. Кнопкой управляет пост — она стоит в его строке. */
  open: boolean
  /** Сколько реплик — для счётчика у иконки в посте. */
  onCount?: (n: number) => void
}) {
  const t = useT()
  const { threads, list, loading, error, canWrite, needsAccount, add, remove } = useFeedComments(itemId, lang)

  // Счётчик считается здесь и уезжает наверх: две реализации подсчёта дали бы
  // два разных числа — у иконки одно, в треде другое.
  useEffect(() => { onCount?.(list.length) }, [list.length, onCount])

  return (
    <>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <Muted>{t('Загружаем…')}</Muted>}
          {error && <Muted tone="bad">{t(error)}</Muted>}

          {!loading && needsAccount && (
            <Muted>{t('Обсуждение открыто ученикам со своим входом — попросите учителя прислать ссылку для входа.')}</Muted>
          )}

          {!loading && !needsAccount && threads.length === 0 && (
            <Muted>{t('Пока никто не написал. Будете первым.')}</Muted>
          )}

          {threads.map(({ root, replies }) => (
            <div key={root.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Bubble c={root} accent={accent} onRemove={remove} />
              {replies.map(r => (
                <div key={r.id} style={{ paddingLeft: 22, display: 'flex', gap: 7 }}>
                  <CornerDownRight size={14} style={{ color: 'var(--color-text-4)', flexShrink: 0, marginTop: 8 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Bubble c={r} accent={accent} onRemove={remove} />
                  </div>
                </div>
              ))}
              {canWrite && <Composer accent={accent} placeholder="Ответить" onSend={b => add(b, root.id)} compact />}
            </div>
          ))}

          {canWrite
            ? <Composer accent={accent} placeholder="Написать в обсуждение" onSend={b => add(b, null)} />
            : !needsAccount && <Muted>{t('Обсуждение доступно ученикам группы: тред у материала — это тред вашего класса.')}</Muted>}
        </div>
      )}
    </>
  )
}

function Bubble({ c, accent, onRemove }: {
  c: FeedComment
  accent: string
  onRemove: (id: string) => void
}) {
  const t = useT()
  return (
    <div style={{
      background: c.mine ? 'var(--color-bg-3)' : 'var(--color-bg-2)',
      border: '1px solid var(--color-border)',
      borderRadius: 14, padding: '9px 12px',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 12, fontWeight: 750, color: c.mine ? accent : 'var(--color-text-2)' }}>
          {c.authorName}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{whenLabel(c.createdAt)}</span>
        {c.mine && (
          <button
            onClick={() => onRemove(c.id)}
            title={t('Удалить')}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-4)', display: 'inline-flex', padding: 2,
            }}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--color-text)', ...proseWrap }}>
        {c.body}
      </div>
    </div>
  )
}

function Composer({ accent, placeholder, onSend, compact }: {
  accent: string
  placeholder: string
  onSend: (body: string) => Promise<boolean> | void
  compact?: boolean
}) {
  const t = useT()
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    const text = value.trim()
    if (!text || sending) return
    setSending(true)
    // Поле очищаем только после успеха: иначе при отвалившейся сети
    // написанное исчезает вместе с отправкой.
    const ok = await onSend(text)
    if (ok !== false) setValue('')
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingLeft: compact ? 22 : 0 }}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={t(placeholder)}
        rows={1}
        onInput={e => {
          // Поле обнимает текст — как все поля ввода в проекте.
          const el = e.currentTarget
          el.style.height = 'auto'
          el.style.height = `${el.scrollHeight}px`
        }}
        onKeyDown={e => {
          // Enter отправляет, Shift+Enter — перенос строки: реплика обычно в
          // одну строку, и тянуться к кнопке ради неё не надо.
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() }
        }}
        style={{
          flex: 1, minWidth: 0, resize: 'none', overflow: 'hidden',
          padding: '9px 12px', borderRadius: 14,
          border: '1px solid var(--color-border-strong)',
          background: 'var(--color-bg-input)', color: 'var(--color-text)',
          // 16px — не про размер, а про iOS: поле с меньшим шрифтом Safari
          // встречает зумом всей страницы при фокусе.
          fontSize: 16, lineHeight: 1.4, fontFamily: 'inherit',
        }}
      />
      <button
        onClick={() => void send()}
        disabled={!value.trim() || sending}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 999, border: 'none',
          background: value.trim() ? accent : 'var(--color-bg-3)',
          color: value.trim() ? '#fff' : 'var(--color-text-4)',
          cursor: value.trim() ? 'pointer' : 'default',
        }}
      >
        <Send size={15} />
      </button>
    </div>
  )
}

function Muted({ children, tone }: { children: React.ReactNode; tone?: 'bad' }) {
  return (
    <div style={{
      fontSize: 12.5, lineHeight: 1.5,
      color: tone === 'bad' ? 'var(--color-red-fill)' : 'var(--color-muted)',
      ...proseWrap,
    }}>
      {children}
    </div>
  )
}
