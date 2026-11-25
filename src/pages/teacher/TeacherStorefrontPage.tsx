import TeacherPageScroll from '../../components/teacher/TeacherPageScroll'
import StorefrontView from '../../components/teacher/storefront/StorefrontView'

/** «Витрина» — кабинет автора курсов на площадке (ПК и айпад в ландшафте). */
export default function TeacherStorefrontPage() {
  return (
    <TeacherPageScroll>
      <StorefrontView />
    </TeacherPageScroll>
  )
}
