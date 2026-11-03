// payments.amount is an int4 number of whole rubles, not kopecks.
export function paymentAmount(value: string): number | null {
  const digits = value.replace(/[ \u00a0\u202f]/g, '')
  if (!/^\d+$/.test(digits)) return null
  const amount = Number(digits)
  return Number.isInteger(amount) && amount > 0 && amount <= 2_147_483_647 ? amount : null
}
export function paymentLessons(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null
  const count = Number(value)
  return Number.isInteger(count) && count >= 0 && count <= 2_147_483_647 ? count : null
}
