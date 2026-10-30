// Распознаём ссылку на облачный диск (Google Диск, Яндекс Диск, Dropbox,
// OneDrive, Облако Mail.ru, MEGA) и рисуем монохромный бренд-логотип. Диски,
// в отличие от RuTube/YouTube, не встраиваются плеером — ученик открывает
// запись по ссылке, поэтому в редакторе показываем карточку с припиской, а не
// плеер (см. CenterRecording в TeacherCourseEditorPage).
import { memo } from 'react'

export type DiskProvider =
  | 'googledrive' | 'yandexdisk' | 'dropbox' | 'onedrive' | 'mailru' | 'mega'

type DiskDef = { id: DiskProvider; name: string; re: RegExp }

// Порядок важен только для читаемости — домены не пересекаются.
const DISKS: DiskDef[] = [
  { id: 'googledrive', name: 'Google Диск',    re: /(?:drive|docs)\.google\.com/i },
  { id: 'yandexdisk',  name: 'Яндекс Диск',     re: /disk\.yandex\.|yadi\.sk/i },
  { id: 'dropbox',     name: 'Dropbox',         re: /dropbox\.com|db\.tt/i },
  { id: 'onedrive',    name: 'OneDrive',        re: /onedrive\.live\.com|1drv\.ms|\.sharepoint\.com/i },
  { id: 'mailru',      name: 'Облако Mail.ru',  re: /cloud\.mail\.ru/i },
  { id: 'mega',        name: 'MEGA',            re: /mega\.(?:nz|io|co\.nz)/i },
]

/** Какой это диск, или null, если ссылка не на известное хранилище. */
export function detectDisk(raw?: string | null): { id: DiskProvider; name: string } | null {
  const url = raw?.trim()
  if (!url) return null
  const d = DISKS.find(x => x.re.test(url))
  return d ? { id: d.id, name: d.name } : null
}

// Пути бренд-марок. Google Drive, Dropbox и MEGA — официальные (simple-icons).
// Яндекс Диск, OneDrive и Облако Mail.ru своих марок в simple-icons не имеют —
// аккуратные монохромные глифы: «летающая тарелка» и облака. Всё заливается
// currentColor, так что цвет и тёмная тема задаются снаружи.
const PATHS: Record<DiskProvider, string> = {
  googledrive: 'M12.01 1.485c-2.082 0-3.754.02-3.743.047.01.02 1.708 3.001 3.774 6.62l3.76 6.574h3.76c2.081 0 3.753-.02 3.742-.047-.005-.02-1.708-3.001-3.775-6.62l-3.76-6.574zm-4.76 1.73a789.828 789.861 0 0 0-3.63 6.319L0 15.868l1.89 3.298 1.885 3.297 3.62-6.335 3.618-6.33-1.88-3.287C8.1 4.704 7.255 3.22 7.25 3.214zm2.259 12.653-.203.348c-.114.198-.96 1.672-1.88 3.287a423.93 423.948 0 0 1-1.698 2.97c-.01.026 3.24.042 7.222.042h7.244l1.796-3.157c.992-1.734 1.85-3.23 1.906-3.323l.104-.167h-7.249z',
  dropbox: 'M6 1.807L0 5.629l6 3.822 6.001-3.822L6 1.807zM18 1.807l-6 3.822 6 3.822 6-3.822-6-3.822zM0 13.274l6 3.822 6.001-3.822L6 9.452l-6 3.822zM18 9.452l-6 3.822 6 3.822 6-3.822-6-3.822zM6 18.371l6.001 3.822 6-3.822-6-3.822L6 18.371z',
  mega: 'M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm6.23 16.244a.371.371 0 0 1-.373.372H16.29a.371.371 0 0 1-.372-.372v-4.828c0-.04-.046-.06-.08-.033l-3.32 3.32a.742.742 0 0 1-1.043 0l-3.32-3.32c-.027-.027-.08-.007-.08.033v4.828a.371.371 0 0 1-.372.372H6.136a.371.371 0 0 1-.372-.372V7.757c0-.206.166-.372.372-.372h1.076a.75.75 0 0 1 .525.22l4.13 4.13a.18.18 0 0 0 .26 0l4.13-4.13c.14-.14.325-.22.525-.22h1.075c.206 0 .372.166.372.372z',
  // «Летающая тарелка»: купол на широком блюдце.
  yandexdisk: 'M12 4.2c2.33 0 4.27 1.86 4.77 4.35 2.7.42 4.63 1.5 4.63 2.78 0 1.64-3.3 2.97-9.4 2.97S2.6 12.97 2.6 11.33c0-1.28 1.93-2.36 4.63-2.78C7.73 6.06 9.67 4.2 12 4.2Zm-5.9 10.1 4.37 3.9a2.3 2.3 0 0 0 3.06 0l4.37-3.9c-1.76.62-4.04.95-5.9.95s-4.14-.33-5.9-.95Z',
  // OneDrive — широкое плоское облако.
  onedrive: 'M9.1 19.5a4.75 4.75 0 0 1-.78-9.44 6 6 0 0 1 11.3-1.02A4.2 4.2 0 0 1 19.4 19.5H9.1Z',
  // Облако Mail.ru — округлое пухлое облако (отличимо от OneDrive).
  mailru: 'M7.4 19.5a4.6 4.6 0 0 1-.6-9.16 5.2 5.2 0 0 1 10.03-.56 4 4 0 0 1-.43 7.9l-.2.02v-.2H7.4Z',
}

export const DiskLogo = memo(function DiskLogo({
  provider, size = 20, title,
}: { provider: DiskProvider; size?: number; title?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="currentColor" role="img" aria-label={title} aria-hidden={title ? undefined : true}
    >
      <path d={PATHS[provider]} />
    </svg>
  )
})
