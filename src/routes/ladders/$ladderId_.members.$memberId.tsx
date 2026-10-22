import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { fetchLadder, listLadderMembers, listRatingHistory } from '@/data/ladder'
import { formatRating, formatRatingChange } from '@/features/matches/labels'
import { SignedInChrome } from '@/features/nav/SignedInChrome'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/ladders/$ladderId_/members/$memberId')({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return
    const destination = resolveAuthDestination({
      session: context.auth.session,
      profile: context.auth.profile,
    })
    if (destination === '/login' || destination === '/onboarding') {
      throw redirect({ to: destination })
    }
  },
  component: RatingHistoryPage,
})

function RatingHistoryPage() {
  const { ladderId, memberId } = Route.useParams()
  const ladder = useQuery({
    queryKey: ['ladder', ladderId],
    queryFn: () => fetchLadder(ladderId),
  })
  const members = useQuery({
    queryKey: ['ladder-members', ladderId],
    queryFn: () => listLadderMembers(ladderId),
    enabled: Boolean(ladder.data),
  })
  const history = useQuery({
    queryKey: ['rating-history', memberId],
    queryFn: () => listRatingHistory(memberId),
    enabled: Boolean(ladder.data),
  })

  const member = members.data?.find((entry) => entry.id === memberId)

  return (
    <>
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <Link
          to="/ladders/$ladderId"
          params={{ ladderId }}
          search={{ tab: 'leaderboard' }}
          className="text-sm text-neutral-700 underline"
        >
          Back to {ladder.data?.name ?? 'Ladder'}
        </Link>
        {ladder.isLoading || members.isLoading ? (
          <p className="text-neutral-600">Loading Rating history…</p>
        ) : null}
        {ladder.isSuccess && !ladder.data ? (
          <h1 className="font-display text-3xl text-ink">This Ladder is not available.</h1>
        ) : null}
        {ladder.data && members.isSuccess && !member ? (
          <h1 className="font-display text-3xl text-ink">This Ladder member is not available.</h1>
        ) : null}
        {member ? (
          <>
            <h1 className="font-display text-3xl text-ink">{member.displayName}</h1>
            <p className="text-sm text-neutral-600">
              Rating history · {formatRating(member.rating)}
            </p>
          </>
        ) : null}
      </div>

      {member ? (
        <section aria-label="Rating history">
          {history.isLoading ? <p className="text-neutral-600">Loading Rating history…</p> : null}
          {history.data && history.data.length === 0 ? (
            <p className="text-neutral-700">No Confirmed Matches yet.</p>
          ) : null}
          {history.data && history.data.length > 0 ? (
            <ol className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
              {history.data.map((entry) => (
                <li key={entry.matchId} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-600">
                      {new Date(entry.confirmedAt).toLocaleString()}
                    </p>
                    <p className="tabular-nums text-ink">
                      {formatRating(entry.ratingBefore)}
                      {' → '}
                      {formatRating(entry.ratingBefore + entry.ratingChange)}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium text-neutral-800">
                    {formatRatingChange(entry.ratingChange)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
    </main>
    <SignedInChrome />
    </>
  )
}
