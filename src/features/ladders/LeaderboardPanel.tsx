import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { listInactiveMembers, listLeaderboard } from '@/data/ladder'
import { formatRating } from '@/features/matches/labels'

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
          <p className="text-neutral-700">No active Ladder members on the Leaderboard.</p>
        ) : null}
        {leaderboard.data && leaderboard.data.length > 0 ? (
          <ol className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {leaderboard.data.map((entry) => (
              <li key={entry.ladderMemberId} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="w-6 shrink-0 tabular-nums text-sm text-neutral-500">{entry.rank}</span>
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
          </ol>
        ) : null}
      </section>

      <section aria-label="Inactive">
        <h2 className="text-sm font-medium text-neutral-700">Inactive</h2>
        {inactive.isLoading ? <p className="mt-2 text-neutral-600">Loading Inactive…</p> : null}
        {inactive.data && inactive.data.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600">Nobody is Inactive.</p>
        ) : null}
        {inactive.data && inactive.data.length > 0 ? (
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
        ) : null}
      </section>
    </div>
  )
}
