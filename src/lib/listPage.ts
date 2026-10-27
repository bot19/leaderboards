// Copied from food-friends: src/lib/listPage.ts — page size constant renamed for Matches.

/** Page size for Match history, and the matching load-more button. */
export const MATCH_PAGE_SIZE = 10

/** How many more items the next load click should reveal. */
export function nextPageCount(remaining: number, pageSize: number): number {
  if (remaining <= 0) return 0
  return Math.min(remaining, pageSize)
}

/** Button copy: "Load next 10" until the final partial page. */
export function loadMoreLabel(remaining: number, pageSize: number): string {
  if (remaining <= 0) return ''
  if (remaining <= pageSize) return `Load last ${remaining}`
  return `Load next ${pageSize}`
}
