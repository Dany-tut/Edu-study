import { useEffect } from 'react'
import { useT } from '../lib/i18n'
import { tactile } from '../lib/feedback'
import { APP_VERSION, APP_COMMIT } from '../lib/appVersion'
import { useAppUpdate, watchForUpdates } from '../lib/appUpdate'
import ProgressFill from './ProgressFill'

// Строка версии в профиле. Показывает, какая сборка крутится ИМЕННО НА ЭТОМ
// устройстве, и сравнивает её с той, что лежит на сервере: если на телефоне
// 1.0.626, а задеплоено 1.0.627 — обнова не доехала, и тап по строке её
// дотягивает (сносит воркера с кешами и перезагружает).
//
// Когда всё свежее — справа НИЧЕГО: пустота и есть ответ «обновлений нет».
// Подпись «актуальна» была шумом, который читают ровно один раз.
//
// variant='row'     — ряд внутри карточки настроек (мобильный профиль)
// variant='compact' — строчка-подвал в меню (десктоп)

// Отступы пилюли: копии подписи под заливкой обязаны их повторить, иначе
// кромка перекраски разъедется с кромкой заливки.
const PILL_PAD = '0 15px'

export default function AppVersionRow({ variant = 'row', style }: { variant?: 'row' | 'compact'; style?: React.CSSProperties }) {
  const t = useT()
  const phase = useAppUpdate(s => s.phase)
  const remote = useAppUpdate(s => s.remoteVersion)
  const progress = useAppUpdate(s => s.progress)
  const check = useAppUpdate(s => s.check)
  const apply = useAppUpdate(s => s.apply)

  useEffect(() => { watchForUpdates() }, [])

  const stale = phase === 'stale'
  const updating = phase === 'updating'

  const onTap = () => {
    if (updating) return
    tactile()
    if (stale) { void apply(); return }
    void check(true)
  }

  // Что написано справа. Пусто на 'fresh' и 'idle' — молчание и означает
  // «свежее»; текст появляется только когда есть что сказать.
  const label =
    updating ? t('Обновляем…') :
    phase === 'checking' ? t('Проверяем…') :
    stale ? t('Обновить') :
    phase === 'error' ? t('Ошибка связи') :
    ''

  const filled = stale || updating

  if (variant === 'compact') {
    return (
      <button
        onClick={onTap}
        title={`${t('Проверить обновление')} · ${APP_COMMIT}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, width: '100%',
          padding: '6px 8px', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11.5, fontWeight: 550, textAlign: 'left',
          color: filled ? 'var(--color-accent)' : 'var(--color-text-4)',
          ...style,
        }}
      >
        <span>{APP_VERSION}</span>
        <span style={{ opacity: 0.85, marginLeft: 'auto' }}>
          {updating ? `${t('Обновляем…')} ${Math.round(progress * 100)}%` : stale ? `${t('Доступна')} ${remote}` : label}
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={onTap}
      className="flex items-center justify-between cursor-pointer"
      style={{ width: '100%', height: 56, padding: '0 15px', background: 'transparent', border: 'none', ...style }}
      aria-label={`${t('Проверить обновление')} — ${APP_COMMIT}`}
      title={APP_COMMIT}
    >
      {/* Без иконки — ряд ровно такой же, как «Тема оформления» и «Язык»:
          подпись слева, состояние пилюлей справа. */}
      <span style={{ fontSize: 15, fontWeight: 550, color: 'var(--color-text)' }}>
        {t('Версия')} {APP_VERSION}
      </span>

      {label && (
        <span
          style={{
            position: 'relative', overflow: 'hidden',
            height: 34, display: 'inline-flex', alignItems: 'center', padding: PILL_PAD, borderRadius: 999,
            fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap',
            background: filled && !updating ? 'var(--grad-purple)' : 'var(--color-bg-5)',
            color: filled && !updating ? '#fff' : 'var(--color-accent)',
          }}
        >
          {/* Заливка загрузки: пилюля наполняется слева направо, пока идут
              шаги, и сама же перекрашивает подпись — белым становится ровно то,
              что фиолет уже накрыл. Целиком белая подпись тонула в незалитой
              светлой половине пилюли. */}
          <ProgressFill
            pct={updating ? Math.min(100, Math.round(progress * 100)) : null}
            boxStyle={{ display: 'inline-flex', alignItems: 'center', padding: PILL_PAD }}
          >
            {label}
          </ProgressFill>
        </span>
      )}
    </button>
  )
}
