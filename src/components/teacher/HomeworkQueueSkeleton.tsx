import Skeleton from '../Skeleton'
import { useT } from '../../lib/i18n'
import './homeworkQueueSkeleton.css'

export default function HomeworkQueueSkeleton({ page = false, tasks = false }: { page?: boolean; tasks?: boolean }) {
  const t = useT()
  return <div className={`homework-loading${page ? ' homework-loading--page' : ''}${tasks ? ' homework-loading--tasks' : ''}`}
    role="status" aria-label={t('Загрузка…')} aria-busy="true">
    <div aria-hidden="true">
      {page && <div className="homework-loading__navigation"><Skeleton h={60} radius={30} /></div>}
      <div className="homework-loading__heading"><Skeleton w={150} h={26} /><Skeleton w="min(320px, 90%)" h={12} /></div>
      {!tasks && <div className="homework-loading__filters">
        <Skeleton w={180} h={36} radius={10} />
        <Skeleton w={240} h={36} radius={10} />
        <Skeleton w={140} h={12} className="homework-loading__sort" />
      </div>}
      <div className="homework-loading__list">
        {Array.from({length: tasks ? 3 : 5}, (_, i) => <div className="homework-loading__row" key={i}>
          <Skeleton circle w={36} className="homework-loading__avatar" />
          <div className="homework-loading__person">
            <Skeleton w={`${55 - i % 3 * 7}%`} h={13} />
            <Skeleton w="72%" h={11} />
            {!tasks && <Skeleton w="35%" h={10} />}
          </div>
          <Skeleton w={90} h={12} className="homework-loading__date" />
          <Skeleton w={88} h={28} radius={10} />
        </div>)}
      </div>
    </div>
  </div>
}
