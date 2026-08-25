import { useEffect, useRef, useState } from 'react'
import { RefreshCw, Check, ArrowDownToLine } from 'lucide-react'
import { useT } from '../lib/i18n'
import { tactile } from '../lib/feedback'
import { APP_VERSION, APP_COMMIT, APP_BUILD, fetchRemoteVersion, applyUpdate } from '../lib/appVersion'

// Строка версии в профиле. Показывает, какая сборка крутится ИМЕННО НА ЭТОМ
// устройстве, и сравнивает её с той, что лежит на сервере: если на телефоне
// 1.0.625, а задеплоено 1.0.626 — обнова не доехала, и тап по строке её
// дотягивает (сносит воркера с кешами и перезагружает).
//
// variant='row'     — ряд внутри карточки настроек (мобильный профиль)
// variant='compact' — строчка-подвал в меню (десктоп)

type Status = 'idle' | 'checking' | 'fresh' | 'stale' | 'error'

function useVersionCheck() {
  const [status, setStatus] = useState<Status>('idle')
  const [remote, setRemote] = useState<string | null>(null)
  const busy = useRef(false)

  const check = async (loud: boolean) => {
    if (busy.current) return
    busy.current = true
    if (loud) setStatus('checking')
    const r = await fetchRemoteVersion()
    busy.current = false
    if (!r) { setStatus(loud ? 'error' : 'idle'); return }
    setRemote(r.version)
    setStatus(r.build > APP_BUILD ? 'stale' : 'fresh')
  }

  // Тихая проверка при открытии профиля: без спиннера и без «не удалось» —
  // офлайн это норма, а не ошибка, о которой надо кричать.
  useEffect(() => { void check(false) }, [])

  return { status, remote, check }
}

export default function AppVersionRow({ variant = 'row', style }: { variant?: 'row' | 'compact'; style?: React.CSSProperties }) {
  const t = useT()
  const { status, remote, check } = useVersionCheck()
  const [updating, setUpdating] = useState(false)

  const stale = status === 'stale'
  const onTap = () => {
    tactile()
    if (stale) { setUpdating(true); void applyUpdate(); return }
    void check(true)
  }

  const hint =
    updating ? t('Обновляем…') :
    status === 'checking' ? t('Проверяем…') :
    stale ? `${t('Доступна')} ${remote}` :
    status === 'fresh' ? t('Последняя версия') :
    status === 'error' ? t('Не удалось проверить') :
    APP_COMMIT

  if (variant === 'compact') {
    return (
      <button
        onClick={onTap}
        title={t('Проверить обновление')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 550, textAlign: 'left',
          color: stale ? 'var(--color-accent)' : 'var(--color-text-4)',
          ...style,
        }}
      >
        {stale
          ? <ArrowDownToLine size={12} strokeWidth={2.2} />
          : <RefreshCw size={12} strokeWidth={2.2} className={status === 'checking' ? 'animate-spin' : undefined} />}
        <span>{APP_VERSION}</span>
        <span style={{ opacity: 0.75, marginLeft: 'auto' }}>{stale ? t('Обновить') : hint}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onTap}
      className="flex items-center justify-between cursor-pointer"
      style={{ width: '100%', padding: '13px 15px', background: 'transparent', border: 'none', ...style }}
      aria-label={t('Проверить обновление')}
    >
      <span className="flex items-center" style={{ gap: 10, fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
        {stale
          ? <ArrowDownToLine size={18} style={{ color: 'var(--color-accent)' }} />
          : status === 'fresh'
            ? <Check size={18} style={{ color: 'var(--color-muted)' }} />
            : <RefreshCw size={18} style={{ color: 'var(--color-muted)' }} className={status === 'checking' || updating ? 'animate-spin' : undefined} />}
        <span className="flex flex-col items-start" style={{ gap: 1 }}>
          {t('Версия')} {APP_VERSION}
          <span style={{ fontSize: 11.5, fontWeight: 500, color: stale ? 'var(--color-accent)' : 'var(--color-text-4)' }}>{hint}</span>
        </span>
      </span>
      <span
        style={{
          height: 30, display: 'inline-flex', alignItems: 'center', padding: '0 13px', borderRadius: 999,
          fontSize: 12.5, fontWeight: 650,
          background: stale ? 'var(--grad-purple)' : 'var(--color-bg-5)',
          color: stale ? '#fff' : 'var(--color-text-3)',
        }}
      >
        {stale ? t('Обновить') : APP_COMMIT}
      </span>
    </button>
  )
}
