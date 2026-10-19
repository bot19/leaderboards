import type { MatchRead, MatchResult, MatchSide, MatchStatus } from '@/data/match'

export function formatRating(rating: number): string {
  return Number(rating.toFixed(1)).toString()
}

export function formatRatingChange(change: number | null): string {
  if (change == null) return '—'
  const rounded = Number(change.toFixed(1))
  const text = rounded.toString()
  return rounded > 0 ? `+${text}` : text
}

const resultLabel: Record<MatchResult, string> = {
  side_a_won: 'Side A won',
  side_b_won: 'Side B won',
  draw: 'Draw',
}

const statusLabel: Record<MatchStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  voided: 'Voided',
}

export function matchResultLabel(result: MatchResult): string {
  return resultLabel[result]
}

export function matchStatusLabel(status: MatchStatus): string {
  return statusLabel[status]
}

export function sideNames(match: MatchRead, side: MatchSide): string {
  const names = match.participants
    .filter((participant) => participant.side === side)
    .map((participant) => participant.displayName)
  return names.join(' & ')
}
