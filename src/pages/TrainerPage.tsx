// ─────────────────────────────────────────────────────────────────────────────
// Тренажёр — одна дверь на все предметы
//
// ЗАЧЕМ ОТДЕЛЬНАЯ СТРАНИЦА. Развилка «язык или банк заданий» жила ВНУТРИ банка:
// страница банка монтировалась всегда, прокручивала свои триста строк хуков и
// только потом уступала экран языковому тренажёру. Банк при этом был и экраном,
// и маршрутизатором — то есть у корейского каждый заход считал фильтры по
// линиям ЕГЭ, а любая правка банка задевала язык.
//
// ЧТО РЕШАЕТСЯ ЗДЕСЬ. Ровно три вещи, общие для обоих: какой предмет открыт,
// какого цвета кабинет и идут ли часы занятия. Всё остальное — дело того
// тренажёра, которому предмет достался.
//
// КАК ВЫБИРАЕТСЯ ТРЕНАЖЁР. По возможностям предмета из реестра (SubjectDef.
// trainer), а не по флагу «язык»: язык открывает языковой тренажёр со своей
// библиотекой, остальные — предметный, где живут задания банка и карточки.
// Список возможностей решает, что внутри каждого из них показать.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import LanguageTrainer from '../components/LanguageTrainer'
import BankTrainer from '../components/trainer/BankTrainer'
import MobileBottomNav from '../components/MobileBottomNav'
import { useTrainerSubject } from '../lib/trainerSubject'
import { useTrainerClock } from '../store/trainerProgressStore'
import { useTint } from '../store/tintStore'
import { useTheme } from '../store/themeStore'
import { useIsDesktop } from '../lib/useIsDesktop'

export default function TrainerPage() {
  const { dark } = useTheme()
  const isDesktop = useIsDesktop()

  // ПРЕДМЕТ ВЫБИРАЕТСЯ, а не только выводится: трек главной остаётся значением
  // по умолчанию, но у тренажёра своя память и своё меню (lib/trainerSubject).
  const subjectState = useTrainerSubject()
  const def = subjectState.current?.def
  const isLang = !!def?.isLanguage

  // Оттенок кабинета ведёт предмет ТРЕНАЖЁРА, а не открытый курс. Обычно это
  // одно и то же (выбор языка переводит и курс), расходятся они там, где курса
  // нет: язык из присланной ссылки и запасной банк заданий.
  const setTintSubject = useTint(s => s.setActiveSubject)
  useEffect(() => {
    if (def) setTintSubject(def.id)
  }, [def, setTintSubject])

  // Часы захода — общие на оба тренажёра: время в корейских карточках считается
  // ровно так же, как время в банке ЕГЭ.
  useTrainerClock(def?.id ?? '', isLang ? 'lang' : 'bank')

  if (isLang) {
    return (
      <>
        <LanguageTrainer
          lang={def!.langCode ?? 'en'}
          subject={def!.name}
          subjectId={def!.id}
          dark={dark}
          subjectState={subjectState}
        />
        {!isDesktop && <MobileBottomNav />}
      </>
    )
  }

  return <BankTrainer subjectState={subjectState} />
}
