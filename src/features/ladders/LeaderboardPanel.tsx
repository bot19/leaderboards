import { IconArrowDown, IconArrowUp } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { listLeaderboard, type LeaderboardEntry } from '@/data/ladder'
import { inactiveBadgeLabel, provisionalBadgeLabel } from '@/features/ladders/badges'
import { formatRating } from '@/features/matches/labels'
import { memberOutcomeTone } from '@/features/matches/matchStyles'
import { leaderboardPodium } from '@/lib/leaderboardPodium'

type Props = {
  ladderId: string
}

export function LeaderboardPanel({ ladderId }: Props) {
  const navigate = useNavigate({ from: '/ladders/$ladderId' })
  const leaderboard = useQuery({
    queryKey: ['leaderboard', ladderId],
    queryFn: () => listLeaderboard(ladderId),
  })

  function openMember(memberId: string) {
    void navigate({
      search: (prev) => ({ ...prev, nav: 'member', member: memberId }),
    })
  }

  return (
    <div className="space-y-6">
      <section aria-label="Leaderboard">
        <h2 className="sr-only">Leaderboard</h2>
        {leaderboard.isLoading ? <p className="text-neutral-600">Loading Leaderboard…</p> : null}
        {leaderboard.data && leaderboard.data.length === 0 ? (
          <p className="text-neutral-700">No one on the Leaderboard.</p>
        ) : null}
        {leaderboard.data && leaderboard.data.length > 0 ? (
          <ol className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {leaderboard.data.map((entry) => {
              const podium = leaderboardPodium(entry.rank)
              return (
                <li
                  key={entry.ladderMemberId}
                  className={`flex items-baseline justify-between gap-3 px-4 py-3${podium ? ` ${podium.className}` : ''}${entry.inactive ? ' opacity-60' : ''}`}
                >
                  <div className="flex min-w-0 items-baseline gap-3">
                    {podium ? (
                      <span className="relative h-5 w-6 shrink-0 self-center">
                        <span
                          role="img"
                          aria-label={podium.label}
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] leading-none"
                        >
                          {podium.medal}
                        </span>
                      </span>
                    ) : (
                      <span className="w-6 shrink-0 tabular-nums text-sm text-neutral-500">
                        {entry.rank}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => openMember(entry.ladderMemberId)}
                      className="min-w-0 truncate font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {entry.displayName}
                    </button>
                    {entry.provisional ? (
                      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {provisionalBadgeLabel}
                      </span>
                    ) : null}
                    {entry.inactive ? (
                      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        {inactiveBadgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-baseline gap-1.5">
                    <RankMovement change={entry.rankChange} />
                    <span className={`tabular-nums text-neutral-800${podium ? ' font-bold' : ''}`}>
                      {formatRating(entry.rating)}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
        ) : null}
      </section>
    </div>
  )
}

function RankMovement({ change }: { change: LeaderboardEntry['rankChange'] }) {
  if (change == null || change === 0) return null

  const up = change > 0
  const places = Math.abs(change)
  const Icon = up ? IconArrowUp : IconArrowDown
  const label = up
    ? `Up ${places} ${places === 1 ? 'place' : 'places'}`
    : `Down ${places} ${places === 1 ? 'place' : 'places'}`

  return (
    <span
      className={`inline-flex items-baseline gap-0.5 tabular-nums ${memberOutcomeTone(up ? 'won' : 'lost')}`}
      aria-label={label}
    >
      <Icon size={14} aria-hidden className="self-center" />
      <span>
        {up ? '+' : '−'}
        {places}
      </span>
    </span>
  )
}
