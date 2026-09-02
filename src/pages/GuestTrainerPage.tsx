// ─────────────────────────────────────────────────────────────────────────────
// Тренажёр для гостя: присланная ссылка открывается без аккаунта
//
// ЗАЧЕМ. Аккаунт ученика заводит учитель, и присланная ссылка до сих пор
// работала только между теми, у кого кабинет уже есть: знакомому, которому
// «скинули классный урок», доставался лендинг — то есть ничего. Ссылка,
// умирающая на первом же незнакомом человеке, не ссылка.
//
// ПОЧЕМУ ТРЕНАЖЁР МОЖНО ОТДАТЬ, А КУРС — НЕТ. Материал тренажёра общий: тексты,
// сцены, лента, разговорник, созвучия, грамматика не выдаются курсом и ничего
// не стоят на человека. Товар — работа учителя: уроки, домашка, проверка,
// оценки. Поэтому граница проходит здесь, а не по аккаунту.
//
// ЧТО ГОСТЬ ПОЛУЧАЕТ. Язык из ссылки целиком, со всеми режимами: открылся
// присланный экран — а дальше он сам ходит по чтению, карточкам, разговорнику.
// Ограничивать его одним экраном значит показать стену раньше, чем интерес.
//
// ЧЕГО У НЕГО НЕТ. Кабинета: главной, курсов, расписания, домашки — там нечего
// показывать без учителя. Прогресс по материалам живёт в этом браузере
// (localStorage), колода — под меткой гостя (см. lib/guestSession).
//
// ОТДЕЛЬНАЯ СТРАНИЦА, А НЕ РЕЖИМ КАБИНЕТА. DashboardPage завязан на сессию
// ученика с первой строки (настройки, уведомления, курсы, нижняя навигация), и
// «а если гость» пришлось бы дописывать в каждую из них. Здесь у экрана ровно
// одна забота: показать язык и держать на виду выход — вход или заявку.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react'
import { LogIn, Sparkles } from 'lucide-react'
import LanguageTrainer from '../components/LanguageTrainer'
import { LeadModal } from './LandingPage'
import { getSubject } from '../lib/subjects'
import { textsForLang } from '../data/readingLibrary'
import { sceneCount } from '../data/scenes'
import { hasSurvivalBook } from '../data/survivalBooks'
import { linkSubjectId, type TrainerLink } from '../lib/trainerLink'
import { startGuest } from '../lib/guestSession'
import { useTheme } from '../store/themeStore'
import { useT } from '../lib/i18n'
import { trackNow } from '../lib/analytics'
import type { TrainerSubjectState } from '../lib/trainerSubject'

export default function GuestTrainerPage({ link }: { link: TrainerLink }) {
  const t = useT()
  const { dark } = useTheme()
  const [lead, setLead] = useState(false)

  // Метка гостя заводится ровно здесь, на входе в экран: в браузере ученика или
  // учителя она не нужна никому. Под ней ляжет колода, если гость возьмёт слова.
  useEffect(() => {
    startGuest()
    void trackNow('guest_trainer_open', { lang: link.lang })
  }, [link.lang])

  const def = useMemo(() => getSubject(linkSubjectId(link) ?? ''), [link])

  /**
   * Выбор предмета из одного пункта.
   *
   * Тренажёр берёт его сверху (общий с банком заданий), и гостю выбирать не из
   * чего: он пришёл по ссылке на один язык, своих курсов у него нет. Один пункт
   * — это ещё и «переключателя предмета не рисуем»: тренажёр сам прячет его,
   * когда вариантов меньше двух.
   */
  const subjectState = useMemo<TrainerSubjectState>(() => {
    if (!def) return { options: [], current: undefined, pick: () => {}, due: {}, loadDue: () => {} }
    const option = {
      def,
      kind: 'lang' as const,
      count: textsForLang(def.langCode ?? '').length + sceneCount(def.langCode),
      hasBook: !!def.langCode && hasSurvivalBook(def.langCode),
    }
    return { options: [option], current: option, pick: () => {}, due: {}, loadDue: () => {} }
  }, [def])

  // Языка из ссылки нет в реестре — показывать нечего, и лендинг честнее пустого
  // тренажёра. Разбор ссылки такое отсеивает, но экран не должен на это полагаться.
  if (!def) { window.location.hash = '#/landing'; return null }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <main
        style={{
          maxWidth: 1400, margin: '0 auto',
          padding: '20px 32px 32px',
          // Место под нижнюю полосу: она плавающая, и без запаса последняя
          // карточка списка уезжала бы под неё.
          paddingBottom: 140,
        }}
      >
        <LanguageTrainer
          lang={def.langCode ?? link.lang}
          subject={def.name}
          subjectId={def.id}
          dark={dark}
          subjectState={subjectState}
        />
      </main>

      <GuestBar onLead={() => setLead(true)} />
      {lead && <LeadModal presetPlan="" onClose={() => setLead(false)} />}
    </div>
  )
}

/**
 * Полоса гостя — снизу, а не сверху.
 *
 * Сверху у тренажёра своя прилипающая строка управления и кнопка адреса, и
 * вторая полоса там встала бы им на голову. Снизу же у гостя пусто: нижней
 * навигации кабинета у него нет, и полоса занимает ровно то место, где на
 * телефоне ждёт большой палец.
 *
 * ТЕКСТ ЧЕСТНЫЙ, А НЕ ЗАМАНИВАЮЩИЙ. Человеку важно знать две вещи: что он ничего
 * не сломает, и что накопленное живёт в этом браузере, — иначе он либо боится
 * трогать, либо теряет колоду при первой смене устройства и считает, что его
 * обманули.
 */
function GuestBar({ onLead }: { onLead: () => void }) {
  const t = useT()
  return (
    <div
      style={{
        position: 'fixed', left: 0, right: 0, zIndex: 60,
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        display: 'flex', justifyContent: 'center',
        padding: '0 16px', pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          width: '100%', maxWidth: 760, boxSizing: 'border-box',
          padding: '12px 14px 12px 18px', borderRadius: 20,
          background: 'rgba(var(--glass-rgb), 0.94)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: '1px solid var(--color-border-glass)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
        }}
      >
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 750, color: 'var(--color-text)' }}>
            {t('Вы смотрите как гость')}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--color-text-2)', marginTop: 2 }}>
            {t('Материал открыт целиком. Что успеете пройти — сохранится в этом браузере.')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <button
            onClick={() => { window.location.hash = '#/login' }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              border: '1px solid var(--color-border-medium)',
              background: 'transparent', color: 'var(--color-text)',
            }}
          >
            <LogIn size={14} /> {t('Войти')}
          </button>
          <button
            onClick={onLead}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              border: 'none', background: 'var(--color-purple)', color: '#fff',
            }}
          >
            <Sparkles size={14} /> {t('Хочу заниматься')}
          </button>
        </div>
      </div>
    </div>
  )
}
