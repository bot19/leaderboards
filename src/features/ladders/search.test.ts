import { describe, expect, it } from 'vitest'
import { ladderSearchSchema } from './search'

describe('ladder search', () => {
  it('opens on the Leaderboard tab when the tab is missing', () => {
    expect(ladderSearchSchema.parse({})).toEqual({ tab: 'leaderboard' })
  })

  it('keeps a known tab', () => {
    expect(ladderSearchSchema.parse({ tab: 'matches' })).toEqual({ tab: 'matches' })
    expect(ladderSearchSchema.parse({ tab: 'members' })).toEqual({ tab: 'members' })
  })

  it('falls back to the Leaderboard tab when the tab is not valid', () => {
    expect(ladderSearchSchema.parse({ tab: 'standings' })).toEqual({ tab: 'leaderboard' })
  })
})
