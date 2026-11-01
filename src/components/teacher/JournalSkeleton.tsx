import Skeleton from '../Skeleton'
import { useT } from '../../lib/i18n'
import './journalSkeleton.css'

/** Keep the journal's shape while its code or first data request is pending. */
export default function JournalSkeleton({ table = false, page = false, embedded = false }: {
  table?: boolean
  page?: boolean
  embedded?: boolean
}) {
  const t = useT()
  return <div className={`journal-loading${page ? ' journal-loading--page' : ''}${embedded ? ' journal-loading--embedded' : ''}`}
    role="status" aria-label={t('Загрузка журнала…')} aria-busy="true">
    <div aria-hidden="true">
      {page && <div className="journal-loading__navigation"><Skeleton w="100%" h={60} radius={30} /></div>}
      <div className="journal-loading__rail">
        <Skeleton w={150} h={48} radius={18} />
        <Skeleton w={110} h={48} radius={18} />
        <Skeleton w={128} h={42} radius={16} />
      </div>
      <div className="journal-loading__panel">
        <div className="journal-loading__tools">
          <Skeleton w={240} h={34} radius={12} />
          <Skeleton w={200} h={34} radius={12} />
          <Skeleton w={140} h={34} radius={12} className="journal-loading__search" />
        </div>
        <div className="journal-loading__body">
          <div className="journal-loading__heading"><Skeleton w="38%" h={20} /><Skeleton w={94} h={24} /></div>
          {!table && <div className="journal-loading__metrics">
            {[0, 1, 2].map(i => <div className="journal-loading__metric" key={i}>
              <Skeleton w="65%" h={12} /><Skeleton w="42%" h={30} /><Skeleton w="80%" h={12} />
            </div>)}
          </div>}
          <div className={`journal-loading__rows${table ? ' journal-loading__rows--table' : ''}`}>
            {[0, 1, 2, 3, 4].map(i => <div className="journal-loading__row" key={i}>
              <Skeleton circle w={36} />
              <div className="journal-loading__person"><Skeleton w={`${68 - i % 3 * 9}%`} h={13} /><Skeleton w="42%" h={10} /></div>
              <Skeleton w={64} h={22} radius={8} />
              <Skeleton w={64} h={22} radius={8} className="journal-loading__result" />
              <Skeleton w={64} h={22} radius={8} className="journal-loading__result" />
            </div>)}
          </div>
        </div>
      </div>
    </div>
  </div>
}
