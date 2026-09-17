import { motion } from 'framer-motion'
import { ArrowRight, User } from 'lucide-react'
import { useT } from '../lib/i18n'

// Вход в тест без аккаунта: одно поле «Имя и фамилия» с кнопкой «дальше» внутри.
// Отдельной серой «Начать тест» нет — стрелка загорается, когда имя введено.
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
      {/* Центровка обёрткой: framer-motion затирает transform у самой кнопки */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: 6, display: 'flex', alignItems: 'center', zIndex: 1 }}>
        <motion.button
          type="button"
          aria-label={t('Начать тест')}
          onClick={submit}
          disabled={!ready}
          whileTap={{ scale: ready ? 0.92 : 1 }}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: ready ? accent : 'var(--color-bg-5)',
            color: ready ? '#fff' : 'var(--color-text-3)',
            cursor: ready ? 'pointer' : 'default',
            transition: 'background 0.18s, color 0.18s',
          }}
        >
          <ArrowRight size={18} />
        </motion.button>
      </div>
    </div>
  )
}
