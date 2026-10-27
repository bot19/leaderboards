import { describe, expect, it } from 'vitest'
import { joinMatchPages } from './joinMatchPages'

describe('joinMatchPages', () => {
  it('drops a Match that was recorded between page loads', () => {
    const joined = joinMatchPages([
      { matches: [{ id: 'newer' }, { id: 'older' }] },
      { matches: [{ id: 'older' }, { id: 'oldest' }] },
    ])
    expect(joined.map((match) => match.id)).toEqual(['newer', 'older', 'oldest'])
  })
})
