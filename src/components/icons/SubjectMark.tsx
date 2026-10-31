import { Atom, BookOpen, FlaskConical, Dna, Languages, Sigma, ScrollText, PenLine } from './appIcons'
import { useLoopIcons } from './LoopIcon'
import { getSubject, subjectIcon } from '../../lib/subjects'

/** Subject pictograms in pickers/cards follow Loop too; desktop emoji stay intact. */
export function SubjectMark({ subject, fallback, size = 20 }: { subject?: string; fallback?: string; size?: number }) {
  const loop = useLoopIcons()
  if (!loop) return <>{fallback ?? subjectIcon(subject)}</>
  const def = getSubject(subject)
  const Icon = def?.isLanguage && !def.native ? Languages
    : def?.id === 'chemistry' ? FlaskConical
    : def?.id === 'biology' ? Dna
    : def?.id === 'physics' ? Atom
    : def?.id === 'math' ? Sigma
    : def?.id === 'history' ? ScrollText
    : def?.id === 'russian' ? PenLine
    : BookOpen
  return <Icon size={size} style={{ display: 'inline-block', verticalAlign: '-0.16em', flexShrink: 0 }} />
}
