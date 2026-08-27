// ─────────────────────────────────────────────────────────────────────────────
// Своя подборка ученика — редактор группы и наборов в тренажёре
//
// ЗАЧЕМ ОН ЕСТЬ И ПОЧЕМУ ВЫКЛЮЧЕН. Тот же материал, что собирает учитель, но
// собранный самим учеником: «мой сериал», «слова из книжки», «то, что я всё
// время забываю». Модель одна на оба случая (lib/cardGroups.ts) — разница лишь
// в том, чьё имя стоит владельцем строки. Показывается только при поднятом
// флаге `student_card_sets` (Админка → Обзор → Функции): фича написана целиком,
// но включать её всем — отдельное решение, и принимается оно не деплоем.
//
// ПОЧЕМУ НЕ ТОТ ЖЕ РЕДАКТОР, ЧТО У УЧИТЕЛЯ. У учительского есть назначение
// ученикам, выбор языка, полки и предметы — половина полей, которых у ученика
// быть не должно: язык здесь известен (это его тренажёр), а назначать он никому
// ничего не может. Общее у них — не форма, а функция сохранения.
//
// СОХРАНЯЕТСЯ ЦЕЛИКОМ, ОДНОЙ КНОПКОЙ. Как и у учителя: подборка — это документ,
// а не поток операций (см. saveCardGroup).
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Plus, Trash2, ChevronLeft } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { saveCardGroup, type CardGroup, type CardSet, type SetCard } from '../../lib/cardGroups'
import GrowTextarea from '../GrowTextarea'

const input = (accent: string): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box', borderRadius: 12,
  border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-2)',
  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 14,
  padding: '10px 12px', outline: 'none', caretColor: accent,
})

export const emptyMyGroup = (lang: string, subject: string): CardGroup => ({
  id: '', lang, subject, title: '', about: '', level: null, sort: 100,
  studentIds: [], sets: [], authorStudentId: null,
})

const newSet = (n: number): CardSet => ({
  id: `new-${n}-${Math.random().toString(36).slice(2, 8)}`,
  title: '', about: '', level: null, cards: [],
})

export default function MySetEditor({ group, studentId, accent, onClose, onSaved }: {
  group: CardGroup
  /** Владелец подборки — id сессии ученика. Без него сохранять некуда. */
  studentId: string
  accent: string
  onClose: () => void
  onSaved: () => void
}) {
  const t = useT()
  const [draft, setDraft] = useState<CardGroup>(group)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const patch = (p: Partial<CardGroup>) => setDraft(d => ({ ...d, ...p }))
  const setSets = (sets: CardSet[]) => patch({ sets })

  async function save() {
    if (!draft.title.trim()) return
    setSaving(true)
    setErr('')
    const id = await saveCardGroup(draft, { authorStudentId: studentId })
    setSaving(false)
    if (!id) { setErr(t('Не получилось сохранить. Попробуй ещё раз.')); return }
    onSaved()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 720 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
            borderRadius: 12, border: '1px solid var(--color-border-soft)', background: 'transparent',
            color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ChevronLeft size={14} /> {t('К подборкам')}
        </button>
        <button
          onClick={save}
          disabled={!draft.title.trim() || saving}
          style={{
            marginLeft: 'auto', height: 36, padding: '0 18px', borderRadius: 12, border: 'none',
            background: draft.title.trim() ? 'var(--grad-purple)' : 'var(--color-bg-2)',
            color: draft.title.trim() ? '#fff' : 'var(--color-text-3)',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            cursor: draft.title.trim() && !saving ? 'pointer' : 'default',
          }}
        >
          {saving ? t('Сохраняю…') : t('Сохранить')}
        </button>
      </div>

      {err && <div style={{ fontSize: 12.5, color: 'var(--color-red-text)' }}>{err}</div>}

      <input
        value={draft.title}
        onChange={e => patch({ title: e.target.value })}
        placeholder={t('Название подборки')}
        style={{ ...input(accent), fontSize: 17, fontWeight: 700 }}
      />
      <input
        value={draft.about}
        onChange={e => patch({ about: e.target.value })}
        placeholder={t('О чём она — одна строка')}
        style={input(accent)}
      />

      {draft.sets.map((set, i) => (
        <MySet
          key={set.id}
          set={set}
          n={i + 1}
          accent={accent}
          onChange={next => setSets(draft.sets.map((x, j) => (j === i ? next : x)))}
          onRemove={() => setSets(draft.sets.filter((_, j) => j !== i))}
        />
      ))}

      <button
        onClick={() => setSets([...draft.sets, newSet(draft.sets.length)])}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          height: 42, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
          border: `1px dashed ${accent}66`, background: 'transparent',
          color: accent, fontSize: 13, fontWeight: 700,
        }}
      >
        <Plus size={15} /> {t('Добавить набор')}
      </button>
    </div>
  )
}

function MySet({ set, n, accent, onChange, onRemove }: {
  set: CardSet; n: number; accent: string
  onChange: (s: CardSet) => void
  onRemove: () => void
}) {
  const t = useT()
  const [row, setRow] = useState<SetCard>({ term: '', ru: '', ep: '' })

  const patch = (p: Partial<CardSet>) => onChange({ ...set, ...p })

  function add() {
    if (!row.term.trim() || !row.ru.trim()) return
    patch({
      cards: [...set.cards, {
        term: row.term.trim(),
        ru: row.ru.trim(),
        ep: row.ep?.trim() || undefined,
      }],
    })
    // Метка (серия, глава) остаётся: карточки одного места добавляют подряд.
    setRow(r => ({ term: '', ru: '', ep: r.ep }))
  }

  return (
    <div style={{
      borderRadius: 16, border: '1px solid var(--color-border-soft)',
      background: 'var(--color-bg-1)', padding: 14,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={set.title}
          onChange={e => patch({ title: e.target.value })}
          placeholder={`${t('Набор')} ${n} — ${t('например: Сезон 1')}`}
          style={{ ...input(accent), fontWeight: 700 }}
        />
        <button
          onClick={onRemove}
          title={t('Удалить набор')}
          style={{
            width: 34, height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, border: '1px solid var(--color-border-soft)', background: 'transparent',
            color: 'var(--color-red-text)', cursor: 'pointer',
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {set.cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {set.cards.map((c, i) => (
            <div
              key={`${c.term}-${i}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                borderRadius: 12, background: 'var(--color-bg-2)', border: '1px solid var(--color-border-soft)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 650, color: 'var(--color-text)' }}>{c.term}</div>
              {c.ep && <div style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{c.ep}</div>}
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', width: '38%', textAlign: 'right' }}>{c.ru}</div>
              <button
                onClick={() => patch({ cards: set.cards.filter((_, j) => j !== i) })}
                style={{ border: 'none', background: 'transparent', color: 'var(--color-muted)', cursor: 'pointer', padding: 2 }}
                title={t('Убрать карточку')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.7fr auto', gap: 8 }}>
        <input
          value={row.term}
          onChange={e => setRow({ ...row, term: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={t('Слово или фраза')}
          style={input(accent)}
        />
        <input
          value={row.ru}
          onChange={e => setRow({ ...row, ru: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={t('Перевод')}
          style={input(accent)}
        />
        <input
          value={row.ep ?? ''}
          onChange={e => setRow({ ...row, ep: e.target.value })}
          placeholder={t('Серия')}
          style={input(accent)}
        />
        <button
          onClick={add}
          disabled={!row.term.trim() || !row.ru.trim()}
          style={{
            height: 40, padding: '0 14px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
            background: row.term.trim() && row.ru.trim() ? `${accent}1f` : 'var(--color-bg-2)',
            color: row.term.trim() && row.ru.trim() ? accent : 'var(--color-text-3)',
            fontSize: 12.5, fontWeight: 700,
            cursor: row.term.trim() && row.ru.trim() ? 'pointer' : 'default',
          }}
        >
          {t('Добавить')}
        </button>
      </div>

      <GrowTextarea
        value={set.about}
        onChange={v => patch({ about: v })}
        placeholder={t('Подпись набора — необязательно')}
        style={{ ...input(accent), fontSize: 12.5, resize: 'none' }}
      />
    </div>
  )
}
