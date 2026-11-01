import type { CSSProperties } from 'react'
import Skeleton from './Skeleton'
import { useT } from '../lib/i18n'
import { TRACK_NODE_SIZE, TRACK_SIDE_PADDING, TRACK_ROW_HEIGHT } from './courseTrackLayout'
import './courseTrackSkeleton.css'

export default function CourseTrackSkeleton() {
  const t = useT()
  const dimensions = {
    '--track-loading-node': `${TRACK_NODE_SIZE}px`,
    '--track-loading-inset': `${TRACK_SIDE_PADDING}px`,
    '--track-loading-row': `${TRACK_ROW_HEIGHT}px`,
  } as CSSProperties
  return <div className="course-track-loading" style={dimensions} role="status" aria-label={t('Загрузка…')} aria-busy="true">
    <div aria-hidden="true">
      <div className="course-track-loading__toolbar">
        <Skeleton w={210} h={36} radius={18} />
        <span className="course-track-loading__divider" />
        <Skeleton w={150} h={30} radius={15} />
        {[0, 1, 2].map(i => <Skeleton key={i} circle w={30} />)}
      </div>
      <div className="course-track-loading__rail">
        <Skeleton className="course-track-loading__line" h={16} radius={8} />
        {[0, 1, 2, 3, 4, 5, 6].map(i => <div key={i} className="course-track-loading__lesson">
          <Skeleton circle w={TRACK_NODE_SIZE} className="course-track-loading__node" />
          <div className="course-track-loading__caption"><Skeleton w={20} h={8} /><Skeleton w={48} h={8} /></div>
        </div>)}
      </div>
    </div>
  </div>
}
