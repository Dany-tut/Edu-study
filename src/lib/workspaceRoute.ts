/** Only the student cabinet needs its courses, widgets and realtime channel.
 * A saved student session must not start that traffic in the teacher cabinet,
 * public diagnostics, invitations or OAuth consent. */
export function isStudentWorkspaceRoute(hash: string, pathname = '/') {
  if (pathname === '/oauth/consent') return false
  return hash === '' || hash === '#' || hash === '#/'
    || /^#\/(?:courses|diary|trainer|profile|homework|lesson)(?:$|[/?])/.test(hash)
}
