import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { listInactiveMembers, listLeaderboard } from '@/data/ladder'
import { formatRating } from '@/features/matches/labels'
import { leaderboardPodium } from '@/lib/leaderboardPodium'

type Props = {
  ladderId: string
}

export function LeaderboardPanel({ ladderId }: Props) {
  const leaderboard = useQuery({
    queryKey: ['leaderboard', ladderId],
    queryFn: () => listLeaderboard(ladderId),
  })
  const inactive = useQuery({
    queryKey: ['inactive-members', ladderId],
    queryFn: () => listInactiveMembers(ladderId),
  })

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
                  className={`flex items-baseline justify-between gap-3 px-4 py-3${podium ? ` ${podium.className}` : ''}`}
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
                      <span className="w-6 shrink-0 tabular-nums text-sm text-neutral-500">{entry.rank}</span>
                    )}
                    <Link
                      to="/ladders/$ladderId/members/$memberId"
                      params={{ ladderId, memberId: entry.ladderMemberId }}
                      className="truncate font-medium text-ink underline-offset-2 hover:underline"
                    >
                      {entry.displayName}
                    </Link>
                    {entry.provisional ? (
                      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Provisional
                      </span>
                    ) : null}
                  </div>
                  <span className={`tabular-nums text-neutral-800${podium ? ' font-bold' : ''}`}>
                    {formatRating(entry.rating)}
                  </span>
                </li>
              )
            })}
          </ol>
        ) : null}
      </section>

      {inactive.data && inactive.data.length > 0 ? (
        <section aria-label="Inactive">
          <h2 className="text-sm font-medium text-neutral-700">Inactive</h2>
          <ul className="mt-2 divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {inactive.data.map((entry) => (
              <li key={entry.ladderMemberId} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <Link
                    to="/ladders/$ladderId/members/$memberId"
                    params={{ ladderId, memberId: entry.ladderMemberId }}
                    className="truncate font-medium text-ink underline-offset-2 hover:underline"
                  >
                    {entry.displayName}
                  </Link>
                  {entry.provisional ? (
                    <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Provisional
                    </span>
                  ) : null}
                </div>
                <span className="tabular-nums text-neutral-800">{formatRating(entry.rating)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
