import './pillTabs.css'

export default function ProfileChips<T extends string>({ label, value, items, onChange }: {
  label: string
  value: T
  items: { id: T; label: string }[]
  onChange: (id: T) => void
}) {
  return <nav className="cj-tabs profile-chips" aria-label={label}>
    {items.map(item => <button key={item.id} type="button" aria-pressed={item.id === value}
      onClick={() => onChange(item.id)}>{item.label}</button>)}
  </nav>
}
