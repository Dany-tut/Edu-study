import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import DesktopFriends from '../../src/components/DesktopFriends'
import type { FriendsTab } from '../../src/lib/desktopFriends'
import '../../src/index.css'
document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') ?? 'light'
const profile = new URLSearchParams(location.search).get('profile')
function Stand() {
  const [tab, setTab] = useState<FriendsTab | null>(profile ? 'profile' : 'contacts')
  const contacts = Array.from({length: 16}, (_, index) => ({id: String(index), handle: `friend_${index + 1}`, state: 'friend' as const}))
  return <><button onClick={() => setTab('contacts')}>Открыть друзей</button><DesktopFriends model={{account:'fixture', tab, setTab, snapshot:{handle:profile === 'new' ? null : 'long_public_nickname', searchable:profile !== 'hidden' && profile !== 'new', contacts}, incoming:[], error:'', refresh:async()=>{}}}/></>
}
createRoot(document.getElementById('root')!).render(<Stand/> )
