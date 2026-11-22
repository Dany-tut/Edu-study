type JsonRecord = Record<string, unknown>
const own = (record: JsonRecord, key: string) => Object.prototype.hasOwnProperty.call(record, key)
function isRecord(value: unknown): value is JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}
function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length
      && a.every((value, index) => sameValue(value, b[index]))
  }
  if (!isRecord(a) || !isRecord(b)) return false
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length
    && keys.every(key => own(b, key) && sameValue(a[key], b[key]))
}
function copyField(target: JsonRecord, key: string, value: unknown) {
  // JSON keys such as __proto__ are data, not prototype setters.
  Object.defineProperty(target, key, { value: structuredClone(value), enumerable: true, configurable: true, writable: true })
}

/** Preserve confirmed server fields that an editor projection cannot round-trip.
 * Root ownership is exactly afterCanonical's own keys: raw SQL-only columns
 * never leak. For edited JSON objects, only directly edited canonical leaves
 * change; unknown/unhydrated raw siblings survive. Arrays are leaf values.
 */
export function mergeConfirmedFields(
  raw: JsonRecord,
  beforeCanonical: JsonRecord,
  afterCanonical: JsonRecord,
  nestedKeys: readonly string[] = ['content', 'homework', 'materials'],
): JsonRecord {
  const result: JsonRecord = {}
  const nested = new Set(nestedKeys)
  for (const key of Object.keys(afterCanonical)) {
    const before = beforeCanonical[key], after = afterCanonical[key]
    if (own(beforeCanonical, key) && sameValue(before, after)) {
      copyField(result, key, own(raw, key) ? raw[key] : after)
      continue
    }
    if (nested.has(key) && isRecord(after)) {
      const beforeObject = isRecord(before) ? before : {}
      const rawObject = isRecord(raw[key]) && own(raw, key) ? raw[key] as JsonRecord : {}
      const value = structuredClone(rawObject)
      for (const child of new Set([...Object.keys(beforeObject), ...Object.keys(after)])) {
        const hadBefore = own(beforeObject, child), hasAfter = own(after, child)
        if (hadBefore === hasAfter && sameValue(beforeObject[child], after[child])) continue
        if (hasAfter) copyField(value, child, after[child])
        else delete value[child] // Removal of a KNOWN canonical leaf is explicit.
      }
      copyField(result, key, value)
      continue
    }
    copyField(result, key, after)
  }
  return result
}
