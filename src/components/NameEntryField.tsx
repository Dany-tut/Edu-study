import { ArrowRight, User } from 'lucide-react'
import { useT } from '../lib/i18n'

// Вход в тест без аккаунта: одно поле «Имя и фамилия» с кнопкой «дальше» внутри.
// Отдельной серой «Начать тест» нет: пока поле пустое, стрелки нет вовсе;
// с вводом имени квадрат со стрелкой вырастает внутри поля уже акцентным.

// Отступ квадрата от краёв поля — один и тот же сверху, снизу и справа
const INSET = 7

export default function NameEntryField({ value, onChange, onSubmit, accent }: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  accent: string
}) {
  const t = useT()
  const ready = value.trim().length >= 2
  const submit = () => { if (ready) onSubmit() }
  return (
    <div style={{ position: 'relative' }}>
      {/* Иконка поверх поля: на iOS фокус поднимает input в свой слой, и лежащая «под» ним иконка пропадала */}
      {/* Начал печатать — иконка уезжает влево и гаснет, текст сдвигается на её место */}
      <User size={16} style={{
        position: 'absolute', left: 14, top: '50%',
        transform: `translate(${value ? -10 : 0}px, -50%)`, opacity: value ? 0 : 1,
        transition: 'transform 0.22s ease, opacity 0.18s ease',
        color: 'var(--color-text-3)', pointerEvents: 'none', zIndex: 1,
      }} />
      <input
        autoFocus
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={t('Имя и фамилия')}
        autoComplete="name"
        enterKeyHint="go"
        style={{
          width: '100%', boxSizing: 'border-box', position: 'relative',
          // 16px: меньше — iOS приближает страницу при фокусе, и поле съезжает.
          // Паддинг по вертикали симметричный: подъём на 0.12em здесь перебирал —
          // заглавные подсказки вставали выше иконки и середины поля (замер 16.09.2026)
          padding: '14px 54px 14px 14px', paddingLeft: value ? 14 : 40, borderRadius: 14,
          border: `1.5px solid ${ready ? accent : 'var(--color-border-medium)'}`,
          background: 'var(--color-bg-input)', color: 'var(--color-text)',
          fontSize: 16, fontFamily: 'inherit', outline: 'none',
          transition: 'border-color 0.15s, padding-left 0.22s ease',
        }}
      />
      {/* Квадрат вписан в поле с одинаковым отступом сверху, снизу и справа:
          обёртка прибита на INSET ко всем трём краям, кнопка — квадрат во всю её высоту */}
      <div style={{ position: 'absolute', top: INSET, bottom: INSET, right: INSET, display: 'flex', zIndex: 1, pointerEvents: ready ? 'auto' : 'none' }}>
        {/* Пустое поле — стрелки нет. С вводом квадрат вырастает из кружка и заливается акцентом.
            Переходы CSS, а не framer-motion: у motion.button transform затирался бы whileTap */}
        <button
          type="button"
          aria-label={t('Начать тест')}
          aria-hidden={!ready}
          tabIndex={ready ? 0 : -1}
          onClick={submit}
          style={{
            height: '100%', aspectRatio: '1 / 1', border: 'none', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: ready ? 10 : 999,
            background: ready ? accent : 'var(--color-bg-5)',
            color: '#fff', cursor: 'pointer',
            opacity: ready ? 1 : 0,
            transform: ready ? 'scale(1)' : 'scale(0.4)',
            transition: ready
              ? 'transform 0.32s cubic-bezier(0.34, 1.4, 0.64, 1), border-radius 0.32s ease, opacity 0.16s ease, background 0.24s ease 0.06s'
              : 'transform 0.2s ease, border-radius 0.2s ease, opacity 0.16s ease, background 0.12s ease',
          }}
        >
          <ArrowRight size={18} style={{ transform: ready ? 'translateX(0)' : 'translateX(-4px)', transition: 'transform 0.3s ease' }} />
        </button>
      </div>
    </div>
  )
}
