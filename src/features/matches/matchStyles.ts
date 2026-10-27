import type { MatchStatus } from '@/data/match'
import type { MemberMatchResult } from './memberMatchOutcome'

/** Shared Match card shells used by MatchCard and member-perspective rows. */
export const matchCardClassName: Record<MatchStatus, string> = {
  pending: 'space-y-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 shadow-sm',
  confirmed: 'space-y-2 rounded-xl bg-white px-4 py-3 shadow-sm',
  voided: 'space-y-2 rounded-xl bg-white px-4 py-3 opacity-60 shadow-sm',
}

/** Outcome colour for a win, loss or draw from one Ladder member's side. */
export function memberOutcomeTone(result: MemberMatchResult): string {
  if (result === 'won') return 'text-green-700'
  if (result === 'lost') return 'text-red-700'
  return 'text-neutral-800'
}

/** Winner/loser tone for a confirmed Match side in the neutral Match card. */
export function confirmedSideTone(won: boolean): string {
  return won ? 'text-green-700' : 'text-red-700'
}
