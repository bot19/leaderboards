import { describe, expect, it } from 'vitest'
import { leaderboardPodium } from './leaderboardPodium'

describe('leaderboardPodium', () => {
  it('maps ranks 1, 2 and 3 to a medal, an accessible label and a row tint', () => {
    expect(leaderboardPodium(1)).toEqual({
      medal: '🥇',
      label: 'Rank 1',
      className: 'bg-amber-100',
    })
    expect(leaderboardPodium(2)).toEqual({
      medal: '🥈',
      label: 'Rank 2',
      className: 'bg-slate-100',
    })
    expect(leaderboardPodium(3)).toEqual({
      medal: '🥉',
      label: 'Rank 3',
      className: 'bg-orange-100',
    })
  })

  it('returns nothing from rank 4 on', () => {
    expect(leaderboardPodium(4)).toBeNull()
  })
})
