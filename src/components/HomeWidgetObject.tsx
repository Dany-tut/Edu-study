import RetryImage from './RetryImage'
const OBJECTS: Record<number, string> = { 0:'stats',1:'fact',2:'reaction',3:'focus',4:'memes',5:'practice',6:'quiz',7:'trainer',8:'awards',9:'daily',10:'feed',11:'reminders',13:'next-step' }
export default function HomeWidgetObject({ id }: { id: number }) {
  return <RetryImage className="ihw-object" data-object={OBJECTS[id] ?? 'reminders'} src={`/widget-objects-v2-shadows/ui/${OBJECTS[id] ?? 'reminders'}.png`} alt="" aria-hidden="true" draggable={false} width={168} height={168} decoding="async" />
}
