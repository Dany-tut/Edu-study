// ─────────────────────────────────────────────────────────────────────────────
// Наборы карточек — вкладка Конструктора
//
// ЧТО ЗДЕСЬ ДЕЛАЮТ. Заводят группу («Сверхъестественное»), внутри неё наборы
// (сезон, глава, часть), внутри набора — карточки: слово, перевод, пояснение,
// метка серии. Ученик видит это витриной в тренажёре, во вкладке «Карточки»
// («Подборки»), и проходит стопкой с расписанием повторений.
//
// ПОЧЕМУ РЕДАКТОР — ОДИН ДОКУМЕНТ, А НЕ ТРИ ЭКРАНА. Группа, набор и карточка —
// это не три сущности в глазах учителя, а одна страница, которую он заполняет
// сверху вниз. Отдельные экраны под каждый уровень означали бы три перехода
// ради одной строчки перевода. Поэтому вся группа держится в состоянии и уходит
// в базу одним «Сохранить» (saveCardGroup считает diff по id).
//
// ВВОД БЫВАЕТ ДВУХ ВИДОВ, И ОБА НУЖНЫ.
//   • Построчный — форма «слово / перевод / пояснение / серия»: так добавляют
//     одну карточку по ходу дела.
//   • Пачкой — вставка из буфера: «слово — перевод» по строке. Двадцать слов из
//     конспекта иначе вбиваются двадцатью нажатиями «Добавить», и на третьем
//     учитель закрывает вкладку. Разделителем считается тире, дефис или
//     табуляция — то, во что превращается любая таблица при копировании.
//
// СИД НЕ ПРАВИТСЯ НА МЕСТЕ. Подборки, приезжающие с кодом (data/cardGroupSeeds),
// показаны здесь же, но с пометкой и одной кнопкой — «Забрать себе»: копия
// уезжает в базу под учителя, и дальше это его группа. Правка сида на месте
// жила бы до следующего деплоя и молча пропадала.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, ChevronLeft, Layers, Copy, GripVertical, Users } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { getOwnerId } from '../../lib/owner'
import { useAllStudents } from '../../lib/useGroups'
import { SUBJECTS } from '../../lib/subjects'
import {
  fetchOwnCardGroups, saveCardGroup, deleteCardGroup,
  type CardGroup, type CardSet, type SetCard,
} from '../../lib/cardGroups'
import { hasCardSeeds, loadCardSeeds } from '../../data/cardGroupSeeds'
import { SURVIVAL_LEVELS, type SurvivalLevel } from '../../data/survivalPhrases'
import GrowTextarea from '../GrowTextarea'
import TeacherSelect from './TeacherSelect'
import MultiSelectField from '../MultiSelectField'
import TeacherSaveButton from './TeacherSaveButton'
import { confirmDialog } from '../ConfirmHost'

/** Языки, на которых вообще бывает тренажёр, — по реестру предметов. */
const LANG_OPTIONS = SUBJECTS
  .filter(s => s.isLanguage && s.langCode)
  .map(s => ({ value: s.langCode!, label: `${s.icon} ${s.name}`, subject: s.id }))

const cardStyle: React.CSSProperties = {
  borderRadius: 16, border: '1px solid var(--color-border-soft)',
  background: 'var(--color-bg-2)', padding: 14,
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 12,
  border: '1px solid var(--color-border-soft)', background: 'var(--color-bg-1)',
  color: 'var(--color-text)', fontFamily: 'inherit', fontSize: 13.5,
  padding: '9px 12px', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
  color: 'var(--color-muted)', marginBottom: 5,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </label>
  )
}

const emptyGroup = (lang: string): CardGroup => ({
  id: '', lang, subject: LANG_OPTIONS.find(o => o.value === lang)?.subject ?? null,
  title: '', about: '', level: null, sort: 0, studentIds: [], sets: [],
})

const emptySet = (n: number): CardSet => ({
  // Временный id: до сохранения он нужен только для ключей React и для того,
  // чтобы diff в saveCardGroup отличил «этот набор новый» от «этот удалён».
  id: `new-${n}-${Math.random().toString(36).slice(2, 8)}`,
  title: '', about: '', level: null, cards: [],
})

/**
 * Разбор вставленной пачки.
 *
 * Формат — по строке на карточку, слева слово, справа перевод. Разделителем
 * считается табуляция, длинное тире или дефис в окружении пробелов: дефис
 * ВНУТРИ слова (well-known, salt-and-burn) разделителем быть не должен, иначе
 * половина английских карточек развалится посередине.
 */
export function parseBulk(text: string): SetCard[] {
  return text.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const m = line.match(/^(.+?)\s*(?:\t|—|–|\s-\s|\|)\s*(.+)$/)
      if (!m) return null
      const term = m[1].trim()
      const ru = m[2].trim()
      return term && ru ? { term, ru } : null
    })
    .filter((x): x is SetCard => !!x)
}

export default function CardGroupsManager() {
  const t = useT()
  const students = useAllStudents()

  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [groups, setGroups] = useState<CardGroup[]>([])
  const [seeds, setSeeds] = useState<CardGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState<CardGroup | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const uid = await getOwnerId()
      if (!alive) return
      setOwnerId(uid)
      const rows = uid ? await fetchOwnCardGroups(uid) : []
      // Сиды всех языков разом: их единицы, и грузятся они по одному разу.
      const seedLists = await Promise.all(
        LANG_OPTIONS.filter(o => hasCardSeeds(o.value)).map(o => loadCardSeeds(o.value)),
      )
      if (!alive) return
      setGroups(rows)
      setSeeds(seedLists.flat())
      setLoading(false)
    })()
    return () => { alive = false }
  }, [])

  const studentOptions = useMemo(
    () => students.map(s => ({ value: s.id, label: s.name })),
    [students],
  )

  async function save() {
    if (!draft || !draft.title.trim()) return
    setSaving(true)
    const id = await saveCardGroup(draft, { createdBy: ownerId })
    setSaving(false)
    if (!id) return
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
    const uid = ownerId
    if (uid) setGroups(await fetchOwnCardGroups(uid))
    setDraft(d => (d ? { ...d, id, seed: false } : d))
  }

  async function remove(g: CardGroup) {
    const ok = await confirmDialog({
      title: `${t('Удалить группу')} «${g.title}»?`,
      message: t('Вместе с ней исчезнут все наборы и карточки внутри. Отменить это нельзя.'),
      confirmLabel: t('Удалить'),
      tone: 'danger',
    })
    if (!ok) return
    if (await deleteCardGroup(g.id)) {
      setGroups(list => list.filter(x => x.id !== g.id))
      setDraft(d => (d?.id === g.id ? null : d))
    }
  }

  /** Копия сида под учителя: та же группа, но своя и правимая. */
  function takeSeed(seed: CardGroup) {
    setDraft({
      ...seed,
      id: '',
      seed: false,
      // Наборы тоже получают временные id — иначе diff принял бы их за строки,
      // которых нет в базе, и попытался бы обновить несуществующее.
      sets: seed.sets.map((s, i) => ({ ...s, id: `new-${i}-${s.id}` })),
      title: seed.title,
    })
  }

  if (draft) {
    return (
      <GroupEditor
        group={draft}
        onChange={setDraft}
        onBack={() => setDraft(null)}
        onSave={save}
        saving={saving}
        saved={saved}
        studentOptions={studentOptions}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => setDraft(emptyGroup('en'))}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 40, padding: '0 16px',
            borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'var(--grad-purple)', color: '#fff', fontFamily: 'inherit',
            fontSize: 13.5, fontWeight: 700,
          }}
        >
          <Plus size={15} strokeWidth={2.6} /> {t('Новая группа')}
        </button>
        <div style={{ fontSize: 12.5, color: 'var(--color-muted)', lineHeight: 1.5, maxWidth: 560 }}>
          {t('Группа — это полка в тренажёре ученика, набор — стопка карточек внутри неё. Например: группа «Сверхъестественное», наборы по сезонам.')}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('Загрузка…')}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              onOpen={() => setDraft(g)}
              onDelete={() => remove(g)}
            />
          ))}
          {seeds.map(g => (
            <GroupCard key={g.id} group={g} seed onOpen={() => takeSeed(g)} />
          ))}
          {groups.length === 0 && seeds.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
              {t('Пока ни одной группы. Заведите первую — она появится у учеников в тренажёре.')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group, seed, onOpen, onDelete }: {
  group: CardGroup; seed?: boolean; onOpen: () => void; onDelete?: () => void
}) {
  const t = useT()
  const cards = group.sets.reduce((n, s) => n + s.cards.length, 0)
  const langLabel = LANG_OPTIONS.find(o => o.value === group.lang)?.label ?? group.lang
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 130 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Layers size={15} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--color-text)' }}>
          {group.title}
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            title={t('Удалить')}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-muted)', padding: 2 }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.45, flex: 1 }}>
        {group.about}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-3)' }}>
        {langLabel} · {group.sets.length} {t('наборов')} · {cards} {t('карточек')}
        {group.studentIds.length > 0 && <> · {group.studentIds.length} {t('учеников')}</>}
      </div>
      <button
        onClick={onOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          height: 34, borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
          fontSize: 12.5, fontWeight: 700,
          border: seed ? '1px solid var(--color-border-medium)' : 'none',
          background: seed ? 'transparent' : 'var(--color-purple-soft)',
          color: seed ? 'var(--color-text-2)' : 'var(--color-purple-text)',
        }}
      >
        {seed ? <><Copy size={13} /> {t('Забрать себе')}</> : t('Открыть')}
      </button>
    </div>
  )
}

function GroupEditor({ group, onChange, onBack, onSave, saving, saved, studentOptions }: {
  group: CardGroup
  onChange: (g: CardGroup) => void
  onBack: () => void
  onSave: () => void
  saving: boolean
  saved: boolean
  studentOptions: Array<{ value: string; label: string }>
}) {
  const t = useT()
  const patch = (p: Partial<CardGroup>) => onChange({ ...group, ...p })
  const setSets = (sets: CardSet[]) => patch({ sets })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 12px',
            borderRadius: 12, border: '1px solid var(--color-border-soft)', cursor: 'pointer',
            background: 'transparent', color: 'var(--color-text-2)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
          }}
        >
          <ChevronLeft size={14} /> {t('К группам')}
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <TeacherSaveButton label={t('Сохранить')} onClick={onSave} saving={saving} saved={saved} disabled={!group.title.trim()} />
        </div>
      </div>

      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label={t('Название группы')}>
          <input
            value={group.title}
            onChange={e => patch({ title: e.target.value })}
            placeholder={t('Например: Сверхъестественное')}
            style={inputStyle}
          />
        </Field>
        <Field label={t('О чём она')}>
          <GrowTextarea
            value={group.about}
            onChange={v => patch({ about: v })}
            placeholder={t('Одна строка, которая объясняет ученику, зачем брать эту подборку.')}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label={t('Язык')}>
            <TeacherSelect
              value={group.lang}
              options={LANG_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
              onChange={v => patch({
                lang: v,
                subject: LANG_OPTIONS.find(o => o.value === v)?.subject ?? null,
              })}
              clearable={false}
            />
          </Field>
          <Field label={t('Уровень')}>
            <TeacherSelect
              value={group.level ?? ''}
              options={SURVIVAL_LEVELS.map(l => ({ value: l, label: l }))}
              onChange={v => patch({ level: (v || null) as SurvivalLevel | null })}
              placeholder={t('Без уровня')}
            />
          </Field>
        </div>
        {/* Назначение. Пусто = всем: типовой случай «выложил и забыл», и
            заставлять отмечать всех поимённо ради него значило бы, что группой
            не воспользуются. */}
        <div>
          <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Users size={12} /> {t('Кому показать')}
          </div>
          <MultiSelectField
            label=""
            options={studentOptions.map(o => o.label)}
            values={studentOptions.filter(o => group.studentIds.includes(o.value)).map(o => o.label)}
            onChange={labels => patch({
              studentIds: studentOptions.filter(o => labels.includes(o.label)).map(o => o.value),
            })}
          />
          <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 5 }}>
            {group.studentIds.length === 0
              ? t('Никто не отмечен — значит, группу увидят все ваши ученики этого языка.')
              : `${t('Видят только отмеченные:')} ${group.studentIds.length}`}
          </div>
        </div>
      </div>

      {group.sets.map((set, i) => (
        <SetEditor
          key={set.id}
          set={set}
          n={i + 1}
          onChange={next => setSets(group.sets.map((x, j) => (j === i ? next : x)))}
          onRemove={() => setSets(group.sets.filter((_, j) => j !== i))}
          onMove={dir => {
            const j = i + dir
            if (j < 0 || j >= group.sets.length) return
            const next = [...group.sets]
            ;[next[i], next[j]] = [next[j], next[i]]
            setSets(next)
          }}
        />
      ))}

      <button
        onClick={() => setSets([...group.sets, emptySet(group.sets.length)])}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          height: 42, borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
          border: '1px dashed var(--color-border-medium)', background: 'transparent',
          color: 'var(--color-text-2)', fontSize: 13, fontWeight: 700,
        }}
      >
        <Plus size={15} /> {t('Добавить набор')}
      </button>
    </div>
  )
}

function SetEditor({ set, n, onChange, onRemove, onMove }: {
  set: CardSet; n: number
  onChange: (s: CardSet) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const t = useT()
  const [bulk, setBulk] = useState('')
  const [row, setRow] = useState<SetCard>({ term: '', ru: '', note: '', ep: '' })

  const patch = (p: Partial<CardSet>) => onChange({ ...set, ...p })
  const setCards = (cards: SetCard[]) => patch({ cards })

  function addRow() {
    if (!row.term.trim() || !row.ru.trim()) return
    setCards([...set.cards, {
      term: row.term.trim(),
      ru: row.ru.trim(),
      note: row.note?.trim() || undefined,
      ep: row.ep?.trim() || undefined,
    }])
    // Метка серии НЕ чистится: карточки одной серии добавляют подряд, и стирать
    // её после каждой значило бы вбивать «S05E04» двенадцать раз.
    setRow(r => ({ term: '', ru: '', note: '', ep: r.ep }))
  }

  function addBulk() {
    const parsed = parseBulk(bulk)
    if (parsed.length === 0) return
    setCards([...set.cards, ...parsed.map(c => ({ ...c, ep: row.ep?.trim() || undefined }))])
    setBulk('')
  }

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <GripVertical size={14} style={{ color: 'var(--color-text-3)' }} />
        <input
          value={set.title}
          onChange={e => patch({ title: e.target.value })}
          placeholder={`${t('Набор')} ${n} — ${t('например: Сезон 1')}`}
          style={{ ...inputStyle, flex: 1, fontWeight: 700 }}
        />
        <button onClick={() => onMove(-1)} title={t('Выше')} style={ghost}>↑</button>
        <button onClick={() => onMove(1)} title={t('Ниже')} style={ghost}>↓</button>
        <button onClick={onRemove} title={t('Удалить набор')} style={{ ...ghost, color: 'var(--color-red-text)' }}>
          <Trash2 size={14} />
        </button>
      </div>

      <input
        value={set.about}
        onChange={e => patch({ about: e.target.value })}
        placeholder={t('Подпись набора: о чём этот сезон, глава, часть')}
        style={inputStyle}
      />

      {set.cards.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {set.cards.map((c, i) => (
            <div
              key={`${c.term}-${i}`}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px',
                borderRadius: 12, background: 'var(--color-bg-1)',
                border: '1px solid var(--color-border-soft)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--color-text)' }}>{c.term}</div>
                {c.note && <div style={{ fontSize: 11.5, color: 'var(--color-muted)', marginTop: 2 }}>{c.note}</div>}
              </div>
              {c.ep && (
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', flexShrink: 0 }}>{c.ep}</div>
              )}
              <div style={{ fontSize: 13, color: 'var(--color-text-2)', width: '38%', textAlign: 'right' }}>{c.ru}</div>
              <button
                onClick={() => setCards(set.cards.filter((_, j) => j !== i))}
                style={{ ...ghost, color: 'var(--color-muted)' }}
                title={t('Убрать карточку')}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Построчный ввод: одна карточка за раз. */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 0.8fr auto', gap: 8, alignItems: 'center' }}>
        <input
          value={row.term}
          onChange={e => setRow({ ...row, term: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') addRow() }}
          placeholder={t('Слово или фраза')}
          style={inputStyle}
        />
        <input
          value={row.ru}
          onChange={e => setRow({ ...row, ru: e.target.value })}
          onKeyDown={e => { if (e.key === 'Enter') addRow() }}
          placeholder={t('Перевод')}
          style={inputStyle}
        />
        <input
          value={row.ep ?? ''}
          onChange={e => setRow({ ...row, ep: e.target.value })}
          placeholder={t('Серия, напр. S01E04')}
          style={inputStyle}
        />
        <button
          onClick={addRow}
          disabled={!row.term.trim() || !row.ru.trim()}
          style={{
            height: 36, padding: '0 14px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
            cursor: row.term.trim() && row.ru.trim() ? 'pointer' : 'default',
            background: row.term.trim() && row.ru.trim() ? 'var(--color-purple-soft)' : 'var(--color-bg-1)',
            color: row.term.trim() && row.ru.trim() ? 'var(--color-purple-text)' : 'var(--color-text-3)',
            fontSize: 12.5, fontWeight: 700,
          }}
        >
          {t('Добавить')}
        </button>
      </div>
      <input
        value={row.note ?? ''}
        onChange={e => setRow({ ...row, note: e.target.value })}
        placeholder={t('Пояснение к карточке — необязательно')}
        style={inputStyle}
      />

      {/* Пачкой: вставка из буфера. */}
      <details>
        <summary style={{ fontSize: 12, color: 'var(--color-muted)', cursor: 'pointer' }}>
          {t('Вставить списком')}
        </summary>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <GrowTextarea
            value={bulk}
            onChange={setBulk}
            minHeight={90}
            placeholder={'hunter — охотник\nsalt and burn — засыпать солью и сжечь'}
            style={{ ...inputStyle, resize: 'none' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={addBulk}
              disabled={parseBulk(bulk).length === 0}
              style={{
                height: 34, padding: '0 14px', borderRadius: 12, border: 'none', fontFamily: 'inherit',
                cursor: parseBulk(bulk).length > 0 ? 'pointer' : 'default',
                background: parseBulk(bulk).length > 0 ? 'var(--color-purple-soft)' : 'var(--color-bg-1)',
                color: parseBulk(bulk).length > 0 ? 'var(--color-purple-text)' : 'var(--color-text-3)',
                fontSize: 12.5, fontWeight: 700,
              }}
            >
              {t('Разобрать и добавить')}
            </button>
            <div style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
              {parseBulk(bulk).length > 0
                ? `${t('Распознано карточек:')} ${parseBulk(bulk).length}`
                : t('По строке на карточку: слово, тире, перевод.')}
            </div>
          </div>
        </div>
      </details>
    </div>
  )
}

const ghost: React.CSSProperties = {
  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 10, border: '1px solid var(--color-border-soft)', background: 'transparent',
  color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, flexShrink: 0,
}
