import type { CSSProperties, ReactNode } from 'react'
import { ScrollOverlays, useOverlayScroll } from './OverlayScroll'

/** Fade only the moving content; headers and review actions stay outside the mask. */
export default function HomeworkReviewScroll({children, label, className = '', contentClassName = '', style}: {
  children: ReactNode; label: string; className?: string; contentClassName?: string; style?: CSSProperties
}) {
  const {ref, fade, thumb, onScroll, maskStyle} = useOverlayScroll()
  return <div className={'hw-review-scroll ' + className} data-fade-top={fade.top > 0} data-fade-bottom={fade.bottom > 0}
    style={{position:'relative',display:'flex',flexDirection:'column',minHeight:0,minWidth:0,overflow:'hidden',...style}}>
    <ScrollOverlays thumb={thumb}/>
    <div ref={ref} onScroll={onScroll} role="region" aria-label={label} tabIndex={0} className="hw-review-scroll-pane no-scrollbar"
      style={{flex:1,minHeight:0,overflowY:'auto',overscrollBehavior:'contain',...maskStyle}}>
      <div className={contentClassName}>{children}</div>
    </div>
  </div>
}
