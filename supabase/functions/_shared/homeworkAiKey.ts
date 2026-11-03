/** Legacy secret names are used only after an explicit server configuration. */
export function resolveLinaliKey(dedicated?: string, legacy?: string, useLegacy = false): string | undefined {
  return dedicated?.trim() || (useLegacy ? legacy?.trim() || undefined : undefined)
}
