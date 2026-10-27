// Copied from food-friends: src/lib/relativeTime.test.ts — unchanged, aside from semicolons.

import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './relativeTime'

const NOW = Date.parse('2026-08-02T12:00:00.000Z')

describe('formatRelativeTime', () => {
  it('formats recent deltas', () => {
    expect(formatRelativeTime('2026-08-02T11:59:30.000Z', NOW)).toBe('just now')
    expect(formatRelativeTime('2026-08-02T11:45:00.000Z', NOW)).toBe('15m ago')
    expect(formatRelativeTime('2026-08-02T09:00:00.000Z', NOW)).toBe('3h ago')
    expect(formatRelativeTime('2026-07-31T12:00:00.000Z', NOW)).toBe('2d ago')
  })

  it('falls back to a short date after a week', () => {
    const label = formatRelativeTime('2026-07-20T12:00:00.000Z', NOW)
    expect(label.length).toBeGreaterThan(0)
    expect(label).not.toMatch(/ago$/)
  })

  it('returns empty string for invalid dates', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('')
  })
})
