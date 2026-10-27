// Copied from food-friends: src/lib/listPage.test.ts — page size constant renamed for Matches.

import { describe, expect, it } from 'vitest'
import { MATCH_PAGE_SIZE, loadMoreLabel, nextPageCount } from './listPage'

describe('listPage', () => {
  it('uses a page of 10', () => {
    expect(MATCH_PAGE_SIZE).toBe(10)
  })

  it('labels a full next page', () => {
    expect(loadMoreLabel(25, 10)).toBe('Load next 10')
    expect(loadMoreLabel(14, MATCH_PAGE_SIZE)).toBe('Load next 10')
  })

  it('labels the final partial page', () => {
    expect(loadMoreLabel(4, 10)).toBe('Load last 4')
    expect(loadMoreLabel(7, 10)).toBe('Load last 7')
    expect(loadMoreLabel(10, 10)).toBe('Load last 10')
  })

  it('returns empty when nothing remains', () => {
    expect(loadMoreLabel(0, 10)).toBe('')
    expect(nextPageCount(0, 10)).toBe(0)
  })

  it('caps the next page to remaining', () => {
    expect(nextPageCount(25, 10)).toBe(10)
    expect(nextPageCount(3, 10)).toBe(3)
  })
})
