export function joinMatchPages<T extends { id: string }>(pages: { matches: T[] }[]): T[] {
  const seen = new Set<string>()
  const joined: T[] = []
  for (const page of pages) {
    for (const match of page.matches) {
      if (seen.has(match.id)) continue
      seen.add(match.id)
      joined.push(match)
    }
  }
  return joined
}
