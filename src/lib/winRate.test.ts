import { describe, expect, it } from 'vitest'
import { formatWinRate } from './winRate'

describe('formatWinRate', () => {
  it('rounds win percentage to the nearest whole number and colours 50% and up green', () => {
    expect(formatWinRate({ ranked: true, wins: 5, matches: 7 })).toEqual({
      text: '71%',
      ariaLabel: 'Win rate 71%',
      className: 'text-green-700',
    })
    expect(formatWinRate({ ranked: true, wins: 1, matches: 2 })).toEqual({
      text: '50%',
      ariaLabel: 'Win rate 50%',
      className: 'text-green-700',
    })
  })

  it('colours below 50% red', () => {
    expect(formatWinRate({ ranked: true, wins: 2, matches: 5 })).toEqual({
      text: '40%',
      ariaLabel: 'Win rate 40%',
      className: 'text-red-700',
    })
  })

  it('shows a dash and No Matches yet when Unranked or matches is zero', () => {
    expect(formatWinRate({ ranked: false, wins: 0, matches: 0 })).toEqual({
      text: '–',
      ariaLabel: 'No Matches yet',
      className: 'text-neutral-500',
    })
    expect(formatWinRate({ ranked: true, wins: 0, matches: 0 })).toEqual({
      text: '–',
      ariaLabel: 'No Matches yet',
      className: 'text-neutral-500',
    })
  })
})
