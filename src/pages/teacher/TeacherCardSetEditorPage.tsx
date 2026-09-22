// ─────────────────────────────────────────────────────────────────────────────
// Редактор набора карточек — отдельная страница, как у курса и урока.
//
// ПОЧЕМУ ОТДЕЛЬНАЯ. Раньше набор правился внутри вкладки «Материалы»: сверху
// полоса вкладок Конструктора, справа рейл фильтров — то есть навигация по
// ЧУЖОМУ содержимому вокруг того, что человек сейчас пишет. Половина ширины
// уходила на списки, в которые он в этот момент не смотрит, а «Сохранить»
// стояла в общем потоке и уезжала вверх на тридцатой карточке. Курс и урок
// давно открываются своей страницей — набор открывается так же.
//
// ЧТО ОНА ДЕРЖИТ. Черновик ГРУППЫ целиком (сохранение считает diff по ней), а
// `focus` говорит, что именно правят: набор внутри неё или саму полку. Обе
// величины приезжают из витрины одним JSON через стор (openCardsEditor) — той
// же дорогой, что курс: страница не ходит в базу за тем, что ей уже передали.
//
// ЧЕРНОВИК ПЕРЕЖИВАЕТ F5. Пока страница открыта, он лежит в sessionStorage (см.
// CARDS_SESSION_KEY в store/teacherStore): обновление страницы посреди набора
// из полусотни слов не должно стоить этих слов.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ChevronLeft } from 'lucide-react'
import { useT } from '../../lib/i18n'
import { useTeacher } from '../../store/teacherStore'
import { useAllStudents } from '../../lib/useGroups'
import { getOwnerId } from '../../lib/owner'
import { fetchOwnCardGroups, saveCardGroup, isShelf, type CardGroup } from '../../lib/cardGroups'
import { SetPage, ShelfPage } from '../../components/teacher/CardGroupsManager'
import TeacherSaveButton from '../../components/teacher/TeacherSaveButton'

/** Посылка витрины: что правим и чем заняты. */
type Payload = { group: CardGroup; focus: string | null }

function readPayload(json: string | null): Payload | null {
  if (!json) return null
  try {
    const p = JSON.parse(json) as Payload
    return p?.group ? { group: p.group, focus: p.focus ?? null } : null
  } catch { return null }
}

export default function TeacherCardSetEditorPage() {
  const t = useT()
  const editingCardsJson = useTeacher(s => s.editingCardsJson)
  const setCardsEdited = useTeacher(s => s.setCardsEdited)
  const setActivePage = useTeacher(s => s.setActivePage)
  const students = useAllStudents()

  // Посылку читаем ОДИН РАЗ, на входе: дальше источник правды — состояние
  // страницы, и перечитывать её на каждый рендер значило бы затирать набранное
  // тем, с чем страницу открыли.
  const initial = useRef(readPayload(editingCardsJson))
  const [group, setGroup] = useState<CardGroup | null>(() => initial.current?.group ?? null)
  const [focus, setFocus] = useState<string | null>(() => initial.current?.focus ?? null)
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { void getOwnerId().then(setOwnerId) }, [])

  // Черновик в сессию — на каждое изменение: страница переживает F5.
  useEffect(() => {
    if (group) setCardsEdited(JSON.stringify({ group, focus }))
  }, [group, focus, setCardsEdited])

  const studentOptions = useMemo(
    () => students.map(s => ({ value: s.id, label: s.name })),
    [students],
  )

  // Посылки нет (прямой заход по ссылке, чужая вкладка) — возвращаемся на
  // витрину, а не показываем пустую страницу с кнопкой «Сохранить».
  useEffect(() => {
    if (!group) setActivePage('constructor')
  }, [group, setActivePage])
  if (!group) return null

  const editedSet = focus ? group.sets.find(s => s.id === focus) ?? null : null
  const canSave = editedSet ? !!editedSet.title.trim() : !!group.title.trim()
  const title = editedSet
    ? (editedSet.title.trim() || t('Новый набор'))
    : (group.title.trim() || t('Новая полка'))

  async function save() {
    if (!group || !canSave) return
    setSaving(true)
    const id = await saveCardGroup(group, { createdBy: ownerId })
    setSaving(false)
    if (!id) return
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)

    // Перечитываем и ПЕРЕСАЖИВАЕМ редактор на строки из базы. Новая группа и её
    // наборы получили настоящие id; останься редактор на временных, второе
    // «Сохранить» посчитало бы их удалёнными и перезалило набор копией.
    const rows = ownerId ? await fetchOwnCardGroups(ownerId) : []
    const fresh = rows.find(g => g.id === id)
    if (!fresh) { setGroup(g => (g ? { ...g, id, seed: false } : g)); return }
    const idx = group.sets.findIndex(s => s.id === focus)
    setGroup(fresh)
    if (focus) setFocus(fresh.sets[idx]?.id ?? null)
  }

  /** Выход: черновик из сессии убираем — иначе следующий F5 вернул бы сюда. */
  function back() {
    setCardsEdited(null)
    setActivePage('constructor')
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', marginTop: -100, paddingTop: 100 }}>
      {/* Шапка страницы: «назад» слева, имя по центру, «Сохранить» справа —
          ровно как у редактора курса, чтобы два соседних редактора не
          требовали заново искать глазами одни и те же кнопки. */}
      <div style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 24px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={back}
            style={headBtn}
          >
            <ArrowLeft size={15} strokeWidth={2} /> {t('К наборам')}
          </motion.button>
          {/* Набор открыт ИЗ ПОЛКИ — даём ход назад к ней, не выходя из правки:
              полка и её наборы сохраняются одной строкой, и выход на витрину
              ради соседнего набора стоил бы несохранённого. */}
          {editedSet && isShelf(group) && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={() => setFocus(null)}
              style={{ ...headBtn, color: 'var(--color-text-2)' }}
            >
              <ChevronLeft size={15} strokeWidth={2} /> {t('Полка')}
            </motion.button>
          )}
        </div>
        <div style={{ position: 'absolute', left: 240, right: 240, top: 10, bottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span className="truncate" style={{ display: 'block', maxWidth: '100%', fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>{title}</span>
        </div>
        <TeacherSaveButton label={t('Сохранить')} onClick={save} saving={saving} saved={saved} disabled={!canSave} />
      </div>

      <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 24px 32px' }}>
        {editedSet ? (
          <SetPage
            group={group}
            set={editedSet}
            onChange={next => setGroup(g => (g ? { ...g, sets: g.sets.map(s => (s.id === editedSet.id ? next : s)) } : g))}
            onGroupChange={p => setGroup(g => (g ? { ...g, ...p } : g))}
            studentOptions={studentOptions}
          />
        ) : (
          <ShelfPage
            group={group}
            onChange={setGroup}
            onOpenSet={setFocus}
            studentOptions={studentOptions}
          />
        )}
      </div>
    </div>
  )
}

const headBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
  padding: '9px 16px 9px 12px', borderRadius: 999,
  border: '1px solid var(--color-border-soft)', background: 'rgba(var(--glass-rgb), 0.96)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.05)', color: 'var(--color-text)',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
