import './authLayout.css'

export default function AuthHero({ title, subtitle, object, hideArt = false }: {
  title: string
  subtitle?: string
  object: 'reminders' | 'practice' | 'feed' | 'focus'
  hideArt?: boolean
}) {
  return <div className="auth-hero">
    <div className="auth-hero-copy">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {!hideArt && <img className="auth-hero-art" src={`/widget-objects-v2-shadows/ui/${object}.png`} alt="" aria-hidden="true" width={72} height={72} draggable={false} />}
  </div>
}
