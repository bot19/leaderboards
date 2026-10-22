import { describe, expect, it } from 'vitest'
import { gameIconKind } from './gameIconKind'

describe('game icon', () => {
  it('uses billiards for pool, a bat for table tennis, and a question mark otherwise', () => {
    expect(gameIconKind('pool')).toBe('billiards')
    expect(gameIconKind('Pool')).toBe('billiards')
    expect(gameIconKind('table tennis')).toBe('table-tennis')
    expect(gameIconKind('ping pong')).toBe('table-tennis')
    expect(gameIconKind('chess')).toBe('unknown')
    expect(gameIconKind('darts')).toBe('unknown')
  })
})