import '../../src/components/teacher/localTranscription.css'
import {createRoot} from 'react-dom/client'
import {motion} from 'framer-motion'
import {Unlock,Check,Trash2,ClipboardCheck} from '../../src/components/icons/appIcons'
import {textFadeStyle} from '../../src/lib/textFades'
import {useT,tc} from '../../src/lib/i18n'
import '../../src/index.css'
import '../../src/pages/teacher/lessonRow.css'
function LessonRow({
  lesson, selected, isOpen, checked, multiMode, displayIndex, onClick, onDelete,
}: {
  lesson: CELesson; selected: boolean; isOpen?: boolean
  checked?: boolean; multiMode?: boolean; displayIndex?: number
  onClick: (e: React.MouseEvent) => void; onDelete: () => void
}) {
  const t = useT()
  return (
    <motion.button
      className="lesson-row editor-delete-row"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      onMouseEnter={e => { if (!selected && !checked) e.currentTarget.style.background = 'var(--color-bg-2)' }}
      onMouseLeave={e => { if (!selected && !checked) e.currentTarget.style.background = 'transparent' }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
        // Тот же зелёный, что у вкладок «ДЗ урока» / «Домашка»: green-soft + green-text.
        background: checked || selected ? 'var(--color-green-soft)' : 'transparent',
        boxShadow: checked ? 'inset 0 0 0 1.5px color-mix(in srgb, var(--color-green-text) 55%, transparent)' : undefined,
        transition: 'background 0.15s, box-shadow 0.15s', fontFamily: 'inherit', textAlign: 'left',
        marginBottom: 2,
      }}
    >
      <div style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: lesson.kind === 'test'
          ? (selected ? 'var(--btn-green-bg)' : 'var(--color-green-soft)')
          : (selected ? 'var(--btn-green-bg)' : 'var(--color-bg-3)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700,
        color: lesson.kind === 'test'
          ? (selected ? '#fff' : 'var(--color-green-text)')
          : (selected ? '#fff' : 'var(--color-muted)'),
      }}>
        {lesson.kind === 'test' ? <ClipboardCheck size={14} /> : (displayIndex ?? lesson.number)}
      </div>
      <span style={{
        flex: 1, fontSize: 12, fontWeight: selected ? 700 : 500,
        color: selected ? 'var(--color-green-text)' : 'var(--color-text)',
        overflow: 'hidden', ...textFadeStyle, whiteSpace: 'nowrap',
      }}>
        {tc(lesson.title) || (lesson.kind === 'test' ? t('Тест без названия') : t('Урок без названия'))}
      </span>
      {/* Open-for-students badge */}
      {isOpen && (
        <span className="lesson-row-open" title={t('Открыт ученикам')} aria-label={t('Открыт ученикам')}>
          <Unlock size={12} strokeWidth={2.5} aria-hidden="true" />
          <span className="lesson-row-open-label" aria-hidden="true">
            <span><span style={{ paddingLeft: 4 }}>{t('Открыт')}</span></span>
          </span>
        </span>
      )}
      {/* Multi-select check → checkmark; selected → trash; otherwise indicator dots */}
      {multiMode ? (
        <div style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: checked ? 'var(--color-green-text)' : 'transparent',
          border: checked ? 'none' : '1.5px solid var(--color-border)',
          color: '#fff', transition: 'background 0.15s',
        }}>
          {checked && <Check size={12} strokeWidth={2.5} />}
        </div>
      ) : selected ? (
        <div
          role="button" tabIndex={0} className="editor-delete-action lesson-row-delete"
          aria-label={t('Удалить')} title={t('Удалить')}
          onClick={e => { e.stopPropagation(); onDelete() }}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault(); e.stopPropagation(); onDelete()
            }
          }}
        >
          <Trash2 size={14} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {lesson.kind === 'test'
            ? (lesson.testTasks?.length ?? 0) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title={t('Вопросы')} />
            : <>
                {lesson.videoUrl && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title={t('Запись')} />}
                {((lesson.hwTasks?.length ?? 0) > 0 || !!lesson.extraHw?.some(x => x.tasks.length > 0)) && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--color-green-text)', opacity: 0.7 }} title={t('ДЗ')} />}
                {((lesson.extraStudentIds?.length ?? 0) + (lesson.extraGroupIds?.length ?? 0)) > 0 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#F59E0B', opacity: 0.7 }} title={t('Доп. ученики')} />}
              </>}
        </div>
      )}
    </motion.button>
  )
}

document.documentElement.dataset.theme=location.search.includes('dark')?'dark':'light'
createRoot(document.getElementById('root')!).render(<div style={{width:'min(288px, 100%)',padding:8}}>{Array.from({length:24},(_,i)=><LessonRow key={i} lesson={{id:String(i),number:i+1,title:'Введение: клетка как система'}} selected={i===0} isOpen onClick={()=>{}} onDelete={()=>{document.body.dataset.deleted='yes'}} />)}</div>)
