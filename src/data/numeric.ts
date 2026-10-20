export function asNumber(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(parsed)) throw new Error('Expected a number')
  return parsed
}
