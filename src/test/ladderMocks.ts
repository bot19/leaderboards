import type { LadderMemberRead, LeaderboardEntry } from '@/data/ladder'

export const MOCK_JOINED_AT = '2026-10-12T12:00:00.000Z'

export function member(
  id: string,
  displayName: string,
  status: LadderMemberRead['status'],
  userId: string | null,
  role: LadderMemberRead['role'],
  overrides?: Partial<LadderMemberRead>,
): LadderMemberRead {
  return {
    id,
    userId,
    displayName,
    role,
    status,
    rating: 1000,
    ratedMatchCount: 1,
    lastMatchAt: null,
    joinedAt: MOCK_JOINED_AT,
    ...overrides,
  }
}

export function entry(
  overrides: Partial<LeaderboardEntry> &
    Pick<LeaderboardEntry, 'ladderMemberId' | 'displayName' | 'rating'>,
): LeaderboardEntry {
  const rank = overrides.rank !== undefined ? overrides.rank : 1
  const provisional = overrides.provisional ?? false
  const inactive = overrides.inactive ?? false
  const rankChange = overrides.rankChange !== undefined ? overrides.rankChange : null
  const ranked = overrides.ranked ?? rank !== null
  const matches =
    overrides.matches ?? (ranked ? (provisional ? 2 : 10) : 0)
  const wins = overrides.wins ?? (ranked ? (provisional ? 1 : 6) : 0)

  return {
    ladderMemberId: overrides.ladderMemberId,
    displayName: overrides.displayName,
    rating: overrides.rating,
    rank,
    provisional,
    inactive,
    rankChange,
    ranked,
    matches,
    wins,
  }
}
