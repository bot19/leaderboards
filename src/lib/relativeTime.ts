// Copied from food-friends: src/lib/relativeTime.ts — unchanged, aside from semicolons.

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Compact relative time for activity lists. Uses `now` for tests. */
export function formatRelativeTime(isoDate: string, now: number = Date.now()): string {
  const then = Date.parse(isoDate)
  if (Number.isNaN(then)) return ''

  const delta = Math.max(0, now - then)

  if (delta < MINUTE) return 'just now'
  if (delta < HOUR) {
    const minutes = Math.floor(delta / MINUTE)
    return `${minutes}m ago`
  }
  if (delta < DAY) {
    const hours = Math.floor(delta / HOUR)
    return `${hours}h ago`
  }
  if (delta < 7 * DAY) {
    const days = Math.floor(delta / DAY)
    return `${days}d ago`
  }

  return new Date(then).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
