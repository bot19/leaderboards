export type GameIconKind = 'billiards' | 'table-tennis' | 'unknown'

export function gameIconKind(gameName: string): GameIconKind {
  const name = gameName.toLowerCase()
  if (name.includes('tennis') || name.includes('ping')) return 'table-tennis'
  if (name.includes('pool')) return 'billiards'
  return 'unknown'
}
