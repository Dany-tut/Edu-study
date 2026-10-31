import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Pencil } from '../../icons/appIcons'
import Modal from '../../Modal'
import DateTimeField from '../../DateTimeField'
import { wallDateTimeInTz } from '../../../lib/teacherTz'
import { CheckboxMark } from '../../Checkbox'
import { btn } from '../../../lib/pillStyles'
import { useGroups } from '../../../lib/useGroups'
import { useLang, useT, type Lang } from '../../../lib/i18n'
import { fetchGroupUpcoming, type SchedItem } from '../../../lib/teacherSchedule'

/*
 * «+» в расписании (ПК): быстро поставить занятие на выбранный день, не уходя в
 * другой. Выбираешь группу → урок, который уже стоит в расписании (переедет
 * сюда, без дубля — решение Дани 30.10.2026), или «Своё название» для разового.
 * Мобильный UI рисуем отдельно.
 */

const formatDay = (day: string, lang: Lang) => new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ru-RU', {
  weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
}).format(new Date(`${day}T12:00:00Z`))

const toIso = (day: string, time: string) => {
  const [h, m] = (time || '12:00').split(':').map(Number)
  const [y, mo, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h, m) - 3 * 3600_000).toISOString()
}
const fromIso = (iso: string) => wallDateTimeInTz(iso, 'Europe/Moscow')

export default function QuickAddLesson({ day, onClose, onMove, onAdd }: {
  day: string
  onClose: () => void
  onMove: (lessonId: string, date: string, time: string, notify: boolean) => void
  onAdd: (groupId: string, title: string, date: string, time: string, notify: boolean) => void
}) {
  const t = useT()
  const lang = useLang(s => s.lang)
  const dayShort = (date: string) => formatDay(date, lang)
  const { groups } = useGroups()
  const [groupId, setGroupId] = useState<string | null>(null)
  const [upcoming, setUpcoming] = useState<SchedItem[] | null>(null)
  const [picked, setPicked] = useState<string | 'custom' | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [when, setWhen] = useState(() => toIso(day, '16:00'))
  const [notify, setNotify] = useState(true)

  // Первая группа по умолчанию.
  useEffect(() => { if (!groupId && groups.length) setGroupId(groups[0].id) }, [groups, groupId])

  // Список будущих занятий выбранной группы.
  useEffect(() => {
    if (!groupId) return
    let alive = true
    setUpcoming(null); setPicked(null)
    fetchGroupUpcoming(groupId).then(list => { if (alive) setUpcoming(list) })
    return () => { alive = false }
  }, [groupId])

  const target = fromIso(when)
  const pickedItem = useMemo(
    () => (picked && picked !== 'custom' ? (upcoming ?? []).find(u => u.id === picked) ?? null : null),
    [picked, upcoming],
  )
  // Выбрали урок с другого дня → при выборе подставим его время.
  const chooseLesson = (u: SchedItem) => {
    setPicked(u.id)
    if (u.time) setWhen(toIso(target.day, u.time))
  }

  const canSubmit = picked === 'custom' ? customTitle.trim().length > 0 : !!pickedItem
  const submit = () => {
    if (!canSubmit) return
    if (picked === 'custom' && groupId) onAdd(groupId, customTitle.trim(), target.day, target.time, notify)
    else if (pickedItem) onMove(pickedItem.id, target.day, target.time, notify)
  }

  const movesFromOtherDay = pickedItem && pickedItem.date !== target.day
  const cta = picked === 'custom' ? t('Добавить') : movesFromOtherDay ? t('Перенести сюда') : t('Поставить сюда')

  const footer = (
    <button onClick={submit} style={btn('L', 'primary', canSubmit ? undefined : { opacity: 0.5, pointerEvents: 'none' })}>{cta}</button>
  )

  return (
    <AnimatePresence>
      <Modal key="quick-add" onClose={onClose} title={t('Добавить занятие')} subtitle={dayShort(target.day)} width={460} footer={footer}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Кому */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{t('Кому')}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 999,
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    background: g.id === groupId ? 'var(--color-purple-soft)' : 'var(--color-bg-3)',
                    color: g.id === groupId ? 'var(--color-purple-text)' : 'var(--color-text-2)',
                  }}
                >
                  <span>{g.icon}</span>{g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Урок */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{t('Какое занятие')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 240, overflowY: 'auto' }} className="no-scrollbar">
              {!groupId ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-4)' }}>{groups.length === 0 ? t('Нет групп') : t('Выберите группу')}</div>
              ) : upcoming === null ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 13, color: 'var(--color-text-4)' }}>{t('Загрузка…')}</div>
              ) : (
                <>
                  {upcoming.map(u => {
                    const on = picked === u.id
                    const sub = [u.number != null && u.number >= 0 && u.fromCourse ? `${t('Урок')} ${u.number + 1}` : '', u.title].filter(Boolean).join(' · ')
                    return (
                      <button
                        key={u.id}
                        onClick={() => chooseLesson(u)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                          border: on ? '1.5px solid var(--color-purple)' : '1px solid transparent', cursor: 'pointer',
                          fontFamily: 'inherit', textAlign: 'left', background: on ? 'var(--color-purple-soft)' : 'transparent',
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sub || t('Занятие')}
                        </span>
                        <span style={{
                          flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 7,
                          background: 'var(--color-accent-soft)', color: 'var(--color-accent)',
                        }}>{dayShort(u.date)}, {u.time}</span>
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPicked('custom')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                      border: picked === 'custom' ? '1.5px solid var(--color-purple)' : '1px solid transparent', cursor: 'pointer',
                      fontFamily: 'inherit', textAlign: 'left', background: picked === 'custom' ? 'var(--color-purple-soft)' : 'transparent',
                      color: 'var(--color-text-2)', fontSize: 14, fontWeight: 600,
                    }}
                  >
                    <Pencil size={15} /> {t('Своё название…')}
                  </button>
                </>
              )}
            </div>
            {picked === 'custom' && (
              <input
                autoFocus
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder={t('Название занятия')}
                style={{ width: '100%', marginTop: 8 }}
              />
            )}
          </div>

          {/* Когда */}
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 8 }}>{t('Когда')}</div>
            <DateTimeField value={when} onChange={setWhen} label={t('Дата и время')} />
          </div>

          {movesFromOtherDay && (
            <div style={{ background: 'var(--color-accent-soft)', borderRadius: 10, padding: '10px 12px', fontSize: 12, lineHeight: 1.5, color: 'var(--color-accent)' }}>
              {t('Это занятие уедет сюда со своего дня, дубля не будет.')}
            </div>
          )}

          <button
            onClick={() => setNotify(n => !n)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}
          >
            <CheckboxMark checked={notify} /> {t('Сообщить ученикам')}
          </button>
        </div>
      </Modal>
    </AnimatePresence>
  )
}
