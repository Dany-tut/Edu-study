import { createPortal } from 'react-dom'
import { Eye, X } from 'lucide-react'
import { getViewAs, setViewAs } from '../../lib/owner'
import { useT } from '../../lib/i18n'

/**
 * Полоса «вы смотрите чужой кабинет».
 *
 * Без неё просмотр опасен не данными, а головой: кабинет выглядит ровно так
 * же, как свой, и через десять минут забываешь, что цифры в «Финансах» и
 * список ДЗ — не твои. Поэтому напоминание висит поверх всего и убирается
 * только выходом из просмотра, а не крестиком.
 *
 * Рисуется в портале и прижата к левому нижнему углу: топбар кабинета стоит
 * сверху по центру, и полоса, положенная сверху, перекрыла бы его.
 *
 * «Только просмотр» — не обещание интерфейса, а поведение базы: RLS разрешает
 * админу читать чужое (`is_admin()` в политиках чтения), но запись остаётся
 * привязана к `created_by = auth.uid()`. Попытка что-то создать здесь будет
 * отклонена сервером, даже если кнопка нашлась.
 */
export default function ViewAsBanner() {
  const t = useT()
  const view = getViewAs()
  if (!view) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', left: 14, bottom: 14, zIndex: 1500,
        display: 'flex', alignItems: 'center', gap: 10,
        maxWidth: 'calc(100vw - 28px)', boxSizing: 'border-box',
        padding: '9px 10px 9px 12px', borderRadius: 13,
        background: 'var(--color-bg-2)',
        border: '1px solid #D07020',
        boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
      }}
    >
      <Eye size={15} strokeWidth={2.2} style={{ color: '#D07020', flexShrink: 0 }} />
      <div style={{ minWidth: 0, lineHeight: 1.25 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {t('Кабинет')}: {view.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 1 }}>
          {t('только просмотр — правки отклонит база')}
        </div>
      </div>
      <button
        onClick={() => setViewAs(null)}
        title={t('Вернуться к себе')}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
          padding: '6px 10px', borderRadius: 9, cursor: 'pointer',
          background: 'var(--color-bg-3)', border: '1px solid var(--color-border-medium)',
          color: 'var(--color-text-2)', fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit',
        }}
      >
        <X size={12} strokeWidth={2.4} />
        {t('К себе')}
      </button>
    </div>,
    document.body,
  )
}
