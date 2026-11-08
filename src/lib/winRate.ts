import type { LeaderboardEntry } from '@/data/ladder'
import { memberOutcomeTone } from '@/features/matches/matchStyles'

export function formatWinRate(entry: Pick<LeaderboardEntry, 'ranked' | 'wins' | 'matches'>): {
  text: string
  ariaLabel: string
  className: string
} {
  if (!entry.ranked || entry.matches === 0) {
    return { text: '–', ariaLabel: 'No Matches yet', className: 'text-neutral-500' }
  }
  const percent = Math.round((100 * entry.wins) / entry.matches)
  return {
    text: `${percent}%`,
    ariaLabel: `Win rate ${percent}%`,
    className: memberOutcomeTone(percent >= 50 ? 'won' : 'lost'),
  }
}
