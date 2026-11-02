import { useRef, type CSSProperties, type ReactNode } from 'react'
import { useWidgetScrollFades } from '../lib/useWidgetScrollFades'
const WIDGET_TYPES = ['stats', 'facts', 'reactions', 'focus', 'memes', 'question', 'quiz', 'trainer', 'stickers', 'dose', 'feed', 'tasks']
/** Shared production wrapper, also used by the student state matrix. */
export default function WidgetFrame({id,children,style,adaptive}:{id:number;children:ReactNode;style:CSSProperties;adaptive:boolean}) {
 const ref=useRef<HTMLDivElement>(null)
 useWidgetScrollFades(ref)
 return <div ref={ref} className={adaptive?'iskra-widget':undefined} data-widget={adaptive?`pupil-${WIDGET_TYPES[id]}`:undefined} style={style}>{children}</div>
}
