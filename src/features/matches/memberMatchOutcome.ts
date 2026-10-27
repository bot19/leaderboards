import type { MatchRead, MatchSide } from '@/data/match'

export type MemberMatchResult = 'won' | 'lost' | 'drew'

export type MemberMatchOutcome = {
  result: MemberMatchResult
  opponents: string[]
  partner: string | null
  format: string
  ratingBefore: number | null
  ratingChange: number | null
  ratingAfter: number | null
  at: string
}

/** How a Match reads from one Ladder member's side. */
export function memberMatchOutcome(
  match: MatchRead,
  ladderMemberId: string,
): MemberMatchOutcome | null {
  const me = match.participants.find(
    (participant) => participant.ladderMemberId === ladderMemberId,
  )
  if (!me) return null

  const mySide = me.side
  const theirSide: MatchSide = mySide === 'a' ? 'b' : 'a'
  const partners = match.participants.filter(
    (participant) =>
      participant.side === mySide && participant.ladderMemberId !== ladderMemberId,
  )
  const opponents = match.participants
    .filter((participant) => participant.side === theirSide)
    .map((participant) => participant.displayName)
    .sort((a, b) => a.localeCompare(b))
  const sideSize = match.participants.filter((participant) => participant.side === mySide).length

  const result = outcomeResult(match, mySide)
  const ratingBefore = me.ratingBefore
  const ratingChange = me.ratingChange
  const ratingAfter =
    match.status === 'confirmed' && ratingBefore != null && ratingChange != null
      ? ratingBefore + ratingChange
      : null

  return {
    result,
    opponents,
    partner: partners[0]?.displayName ?? null,
    format: `${sideSize}v${sideSize}`,
    ratingBefore: match.status === 'confirmed' ? ratingBefore : null,
    ratingChange: match.status === 'confirmed' ? ratingChange : null,
    ratingAfter,
    at: match.status === 'confirmed' && match.confirmedAt ? match.confirmedAt : match.recordedAt,
  }
}

function outcomeResult(match: MatchRead, mySide: MatchSide): MemberMatchResult {
  if (match.result === 'draw') return 'drew'
  const won =
    (match.result === 'side_a_won' && mySide === 'a') ||
    (match.result === 'side_b_won' && mySide === 'b')
  return won ? 'won' : 'lost'
}
