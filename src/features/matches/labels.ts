import type { MatchResult, MatchSide, MatchStatus, MatchVoidKind } from '@/data/match'

export function formatRating(rating: number): string {
  return Number(rating.toFixed(1)).toString()
}

export function formatRatingChange(change: number | null): string {
  if (change == null) return '—'
  const rounded = Number(change.toFixed(1))
  const text = rounded.toString()
  return rounded > 0 ? `+${text}` : text
}

const statusLabel: Record<MatchStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  voided: 'Voided',
}

const voidKindLabel: Record<MatchVoidKind, string> = {
  rejected: 'Rejected',
  admin: 'Voided by Admin',
}

export function matchResultLabel(match: {
  result: MatchResult
  participants: { side: MatchSide; displayName: string }[]
}): string {
  if (match.result === 'draw') return 'Draw'
  const side: MatchSide = match.result === 'side_a_won' ? 'a' : 'b'
  return `${sideNames(match, side)} won`
}

export function formatLocalDateTime(isoDate: string): string {
  const then = Date.parse(isoDate)
  if (Number.isNaN(then)) return ''
  return new Date(then).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

export function recorderName(
  match: { recordedBy: string; participants: { userId: string | null; displayName: string }[] },
  members: { userId: string | null; displayName: string }[],
): string | null {
  const participant = match.participants.find(
    (entry) => entry.userId != null && entry.userId === match.recordedBy,
  )
  if (participant) return participant.displayName
  const member = members.find((entry) => entry.userId != null && entry.userId === match.recordedBy)
  return member?.displayName ?? null
}

export function matchStatusLabel(status: MatchStatus, voidKind: MatchVoidKind | null = null): string {
  if (status === 'voided' && voidKind) return voidKindLabel[voidKind]
  return statusLabel[status]
}

export function sideNames(
  match: { participants: { side: MatchSide; displayName: string }[] },
  side: MatchSide,
): string {
  const names = match.participants
    .filter((participant) => participant.side === side)
    .map((participant) => participant.displayName)
    .sort((a, b) => a.localeCompare(b))
  return names.join(', ')
}
