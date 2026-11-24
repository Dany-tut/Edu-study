import { useTeacherNewYear } from '../../../lib/season'
import { Garland, Snow } from './NewYear'
import './newyear.css'

/*
 * Новый год в кабинете преподавателя: тихий снег поверх страницы и гирлянда
 * по верхнему краю окна. Всё aria-hidden и без касаний — клики проходят насквозь.
 * При «Уменьшить движение» снег и лампочки стоят (правила в newyear.css).
 */
export default function TeacherNewYear() {
  const on = useTeacherNewYear()
  if (!on) return null
  return (
    <div aria-hidden className="ny-teacher">
      <Snow count={40} scale={2} className="ny-snow--page ny-snow--teacher" />
      <div className="ny-teacher__garland"><Garland /></div>
    </div>
  )
}
