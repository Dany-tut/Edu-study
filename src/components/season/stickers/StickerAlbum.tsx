import { useEffect, useMemo, useRef, useState } from 'react'
import OpticalText from '../../OpticalText'
import FadeText from '../../FadeText'
import { useT } from '../../../lib/i18n'
import { newYearImg, useSeason } from '../../../lib/season'
import {
  STICKERS, COMMON, stickerDef, stickerImg, nextCommon, markStickersSeen, setPinnedSticker, usePinnedSticker,
  useStickers, useStickerAlbum, closeStickerAlbum, type OwnedSticker, type StickerKey, type StickerSource,
} from '../../../lib/seasonStickers'
import StickerSurface, { useStickerSurface } from './StickerSurface'
import ScratchFoil from '../../ScratchFoil'

/*
 * E · «Мой альбом» — 16 ячеек: полученные цветные, неполученные — силуэт с
 * подсказкой «как получить», редкие (Огоньки) — золотая рамка и ★, новые — «Новый!»
 * до первого открытия альбома. ПК/iPad — окно с панелью подробностей справа и
 * блоком «Как получить стикеры» под сеткой; iPhone/Android — лист: плашка
 * выбранного стикера сверху, сетка в 4 колонки, «Следующий стикер» в подвале.
 *
 * Новый стикер приходит запечатанным (ИСК-4): в сетке — плитка фольги, в
 * подробностях — фольга во всю карточку. Ученик стирает её (или жмёт «Открыть»),
 * проходит волна, и только тогда стикер считается просмотренным в базе. Закрыл
 * альбом, не стерев, — стикер так и ждёт под фольгой с меткой «Новый!».
 * Метка «Новый!» у уже стёртого держится до конца показа — видно, что пришло.
 */

const SOURCE: Record<StickerSource, string> = {
  hw: 'за сданную домашку',
  video: 'за досмотренный видеоурок',
  streak: 'за серию дней подряд',
  teacher: 'в подарок от учителя',
  secret: 'за найденный секрет',
}

function receivedOn(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'сегодня'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function StickerAlbum({ studentId }: { studentId: string | null }) {
  const t = useT()
  const album = useStickerAlbum()
  const kind = useStickerSurface()
  const season = useSeason()
  const { owned, loaded } = useStickers(studentId)
  const pinned = usePinnedSticker()
  const byKey = useMemo(() => new Map(owned.map(o => [o.stickerKey, o] as const)), [owned])

  // Новые на момент открытия: держим метку «Новый!» весь показ.
  const [fresh, setFresh] = useState<Set<StickerKey>>(new Set())
  // Ещё под фольгой: новые, которые в этом показе пока не стёрли.
  const [wrapped, setWrapped] = useState<Set<StickerKey>>(new Set())
  const captured = useRef(false)
  const [sel, setSel] = useState<StickerKey>('atom')
  useEffect(() => {
    if (!album.open) { captured.current = false; return }
    if (captured.current || (studentId && !loaded)) return
    captured.current = true
    const unseen = owned.filter(o => !o.seenAt)
    setFresh(new Set(unseen.map(o => o.stickerKey)))
    setWrapped(new Set(unseen.map(o => o.stickerKey)))
    const last = [...owned].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    setSel(album.focus ?? unseen[unseen.length - 1]?.stickerKey ?? last?.stickerKey ?? COMMON[0])
  }, [album.open, album.focus, loaded, owned, studentId])

  // Стёрли фольгу — теперь стикер просмотрен и в базе.
  const unwrap = (key: StickerKey) => {
    setWrapped(prev => { const next = new Set(prev); next.delete(key); return next })
    const o = byKey.get(key)
    if (studentId && o && !o.seenAt) void markStickersSeen(studentId, [o.id])
  }

  const total = STICKERS.length
  const rareTotal = STICKERS.filter(s => s.rare).length
  const rareOwned = owned.filter(o => stickerDef(o.stickerKey)?.rare).length
  const countLine = `${owned.length} ${t('из')} ${total} ${t('стикеров')} · ${rareOwned} ${t('из')} ${rareTotal} ${t('редких')}`
  const pct = Math.round((owned.length / total) * 100)
  const until = season.season
    ? new Date(Date.parse(season.season.endsAt) - 1).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' })
    : ''

  const selDef = stickerDef(sel) ?? STICKERS[0]
  const selOwned = byKey.get(sel)
  const selWrapped = !!selOwned && wrapped.has(sel)
  const nextKey = nextCommon(owned) ?? STICKERS.find(s => s.rare && !byKey.has(s.key))?.key ?? null
  const next = nextKey ? stickerDef(nextKey) : null
  const commonOwned = owned.filter(o => !stickerDef(o.stickerKey)?.rare).length

  const describe = (def = selDef, o: OwnedSticker | undefined = selOwned) => o
    ? `${t('Получен')} ${t(receivedOn(o.createdAt))} ${t(SOURCE[o.source])}`
    : `${t('Как получить')}: ${t(def.hint)}`

  const pinButton = (small: boolean) => selOwned && !selWrapped ? (
    <button
      type="button" data-hover="layer"
      className={`stk-btn ${pinned === sel ? 'stk-btn--soft' : 'stk-btn--primary'}${small ? ' stk-btn--small' : ''}`}
      onClick={() => setPinnedSticker(pinned === sel ? null : sel)}
    >
      <OpticalText as="iskra-button-label">{t(pinned === sel ? 'Убрать с главной' : small ? 'На главную' : 'Поставить на главную')}</OpticalText>
    </button>
  ) : null

  const nextCard = (
    <div className="stk-next">
      {next
        ? <img src={stickerImg(next.key)} alt="" aria-hidden className="stk-next__img stk-silhouette" />
        : <img src={stickerImg('og_tree')} alt="" aria-hidden className="stk-next__img" />}
      <div className="stk-next__body">
        <FadeText className="stk-next__title">{next ? `${t('Следующий')}: ${t(next.title)}` : t('Коллекция собрана')}</FadeText>
        <FadeText className="stk-next__hint">{next ? t(next.hint) : t('Все стикеры сезона твои')}</FadeText>
        {next && !next.rare && (
          <div className="stk-progress" role="progressbar" aria-valuemin={0} aria-valuemax={COMMON.length} aria-valuenow={commonOwned} aria-label={t('Обычные стикеры')}>
            <span style={{ width: `${(commonOwned / COMMON.length) * 100}%` }} />
          </div>
        )}
      </div>
    </div>
  )

  const grid = (
    <div className={`stk-grid${kind === 'sheet' ? ' stk-grid--phone' : ''}`} role="group" aria-label={t('Стикеры')}>
      {STICKERS.map(def => {
        const o = byKey.get(def.key)
        return (
          <button
            key={def.key} type="button" data-hover="layer" className="stk-cell"
            data-missing={o ? undefined : ''} data-rare={def.rare ? '' : undefined}
            aria-pressed={sel === def.key}
            aria-label={o && wrapped.has(def.key) ? t('Новый стикер под фольгой') : o ? t(def.title) : `${t('Ещё нет')}: ${t(def.hint)}`}
            onClick={() => setSel(def.key)}
          >
            {o && wrapped.has(def.key)
              ? <span className="stk-cell__foil" aria-hidden />
              : <img src={stickerImg(def.key)} alt="" aria-hidden className={`stk-cell__img${o ? '' : ' stk-silhouette'}`} loading="lazy" />}
            <FadeText lines={2} className="stk-cell__label">{t(o && wrapped.has(def.key) ? 'Сотри' : o ? def.title : def.hint)}</FadeText>
            {def.rare && <span className="stk-cell__star" aria-hidden>★</span>}
            {o && fresh.has(def.key) && <span className="stk-new">{t('Новый!')}</span>}
          </button>
        )
      })}
    </div>
  )

  // Фольга над новым стикером: держим её и после стирания, чтобы волна успела
  // пройти; ключ — новый стикер, новая фольга.
  const unwrapCard = (size: 'big' | 'wide') => selOwned && fresh.has(sel) ? (
    <div className={`stk-unwrap stk-unwrap--${size}`}>
      <ScratchFoil key={sel} revealed={!selWrapped} onReveal={() => unwrap(sel)} minHeight={size === 'big' ? 190 : 150} radius={18}
        hint={selWrapped ? t('Сотри — какой стикер пришёл?') : undefined}>
        <div className="stk-unwrap__scene">
          <img src={stickerImg(sel)} alt="" aria-hidden draggable={false} className="stk-unwrap__img" />
        </div>
      </ScratchFoil>
    </div>
  ) : null

  const ways = (
    <div className="stk-ways-box">
      <div className="stk-ways-box__title">{t('Как получить стикеры')}</div>
      <div className="stk-ways-list">
        <span className="stk-badge">+1</span><b>{t('Сдал домашку')}</b><span>{t('любой предмет')}{until ? `, ${t('до')} ${until}` : ''}</span>
        <span className="stk-badge">+1</span><b>{t('Досмотрел видеоурок')}</b><span>{t('90% записи — тот же порог, что открывает ДЗ')}</span>
        <span className="stk-badge stk-badge--gold">★</span><b>{t('Серия 7 и 14 дней')}</b><span>{t('редкие Огоньки')}</span>
        <span className="stk-badge">?</span><b>{t('Секретный')}</b><span>{t('попробуй найти сам')}</span>
      </div>
    </div>
  )

  if (kind === 'sheet') {
    return (
      <StickerSurface open={album.open} onClose={closeStickerAlbum} label={t('Мой альбом')} footer={nextCard}>
        <div className="stk-phone-head">
          <div className="stk-phone-head__title">{t('Мой альбом')}</div>
          <div className="stk-phone-head__line">
            <span>{owned.length} {t('из')} {total} · {rareOwned} {t('из')} {rareTotal} {t('редких')}</span>
            <div className="stk-progress" aria-hidden><span style={{ width: `${pct}%` }} /></div>
          </div>
        </div>
        {unwrapCard('wide')}
        <div className="stk-pick">
          {selWrapped
            ? <span className="stk-pick__foil" aria-hidden />
            : <img src={stickerImg(sel)} alt="" aria-hidden className={`stk-pick__img${selOwned ? '' : ' stk-silhouette'}`} />}
          <div className="stk-pick__body">
            <FadeText className="stk-pick__title">{selWrapped ? t('Новый стикер') : selOwned && fresh.has(sel) ? `${t('Новый')}: ${t(selDef.title)}` : t(selOwned ? selDef.title : 'Ещё не получен')}</FadeText>
            <FadeText lines={2} className="stk-pick__text">{selWrapped ? t('Под фольгой — сотри, чтобы узнать') : describe()}</FadeText>
          </div>
          {pinButton(true)}
        </div>
        {grid}
        {ways}
      </StickerSurface>
    )
  }

  const header = (
    <div className="stk-banner stk-album-head" style={{ backgroundImage: `url(${newYearImg('banner-polnoch')})` }}>
      <div className="stk-banner__title">{t('Мой альбом')}</div>
      <div className="stk-banner__sub">{countLine}</div>
      <div className="stk-progress" aria-hidden><span style={{ width: `${pct}%` }} /></div>
    </div>
  )

  return (
    <StickerSurface open={album.open} onClose={closeStickerAlbum} label={t('Мой альбом')} width={880} header={header}>
      <div className="stk-album">
        <div style={{ minWidth: 0 }}>
          {grid}
          {ways}
        </div>
        <div className="stk-detail">
          {unwrapCard('big') ?? <img src={stickerImg(sel)} alt="" aria-hidden className={`stk-detail__img${selOwned ? '' : ' stk-silhouette'}`} />}
          {selOwned && fresh.has(sel) && <span className="stk-detail__pill">{t('Новый!')}</span>}
          {!selOwned && selDef.rare && <span className="stk-detail__pill stk-detail__pill--rare">★ {t('Редкий')}</span>}
          <FadeText lines={2} className="stk-detail__name">{t(selWrapped ? 'Новый стикер' : selOwned ? selDef.title : 'Ещё не получен')}</FadeText>
          <FadeText lines={3} className="stk-detail__text">{selWrapped ? t('Под фольгой — сотри, чтобы узнать') : describe()}</FadeText>
          {pinButton(false)}
          <div className="stk-next-label">{t('Следующий стикер')}</div>
          {nextCard}
        </div>
      </div>
    </StickerSurface>
  )
}
