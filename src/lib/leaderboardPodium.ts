const podium = {
  1: { medal: '🥇', label: 'Rank 1', className: 'bg-amber-100' },
  2: { medal: '🥈', label: 'Rank 2', className: 'bg-slate-100' },
  3: { medal: '🥉', label: 'Rank 3', className: 'bg-orange-100' },
} as const

export type LeaderboardPodium = (typeof podium)[keyof typeof podium]

export function leaderboardPodium(rank: number): LeaderboardPodium | null {
  if (rank === 1 || rank === 2 || rank === 3) return podium[rank]
  return null
}
