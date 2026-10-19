import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { IconCopy } from '@tabler/icons-react'
import { toast } from 'sonner'
import { fetchLadder, fetchShareToken, listLeaderboard } from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'
import { ladderSearchSchema, ladderTabs, type LadderTab } from '@/features/ladders/search'
import { resolveAuthDestination } from '@/lib/authDestination'

const tabLabel: Record<LadderTab, string> = {
  leaderboard: 'Leaderboard',
  matches: 'Matches',
  members: 'Ladder members',
}

export const Route = createFileRoute('/ladders/$ladderId')({
  validateSearch: ladderSearchSchema,
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
  component: LadderPage,
})

function LadderPage() {
  const { ladderId } = Route.useParams()
  const { tab } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { profile } = useAuth()
  const ladder = useQuery({
    queryKey: ['ladder', ladderId],
    queryFn: () => fetchLadder(ladderId),
  })
  const leaderboard = useQuery({
    queryKey: ['leaderboard', ladderId],
    queryFn: () => listLeaderboard(ladderId),
    enabled: Boolean(ladder.data),
  })
  const shareToken = useQuery({
    queryKey: ['share-token', ladderId],
    queryFn: () => fetchShareToken(ladderId),
    enabled: Boolean(ladder.data),
  })
  const shareLink = shareToken.data
    ? `${window.location.origin}/join/${shareToken.data}`
    : null

  if (!profile) return null

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <Link to="/" className="text-sm text-neutral-700 underline">
          Home
        </Link>
        {ladder.isLoading ? <p className="text-neutral-600">Loading Ladder…</p> : null}
        {ladder.data ? (
          <>
            <h1 className="font-display text-3xl text-ink">{ladder.data.name}</h1>
            <p className="text-sm text-neutral-600">{ladder.data.gameName}</p>
            {shareLink ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  aria-label="Share link"
                  value={shareLink}
                  className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-ink"
                />
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white"
                  onClick={() => {
                    void navigator.clipboard.writeText(shareLink).then(
                      () => toast.success('Share link copied'),
                      () => toast.error('Could not copy the Share link'),
                    )
                  }}
                >
                  <IconCopy size={16} aria-hidden />
                  Copy Share link
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        {ladder.isSuccess && !ladder.data ? (
          <h1 className="font-display text-3xl text-ink">This Ladder is not available.</h1>
        ) : null}
      </div>
      {ladder.data ? (
        <>
          <div className="flex gap-2" role="tablist" aria-label="Ladder">
            {ladderTabs.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                className={
                  tab === item
                    ? 'rounded-full bg-ink px-3 py-1.5 text-sm font-medium text-white'
                    : 'rounded-full bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm'
                }
                onClick={() => {
                  void navigate({ search: { tab: item } })
                }}
              >
                {tabLabel[item]}
              </button>
            ))}
          </div>
          {tab === 'leaderboard' ? (
            <section aria-label="Leaderboard">
              <h2 className="sr-only">Leaderboard</h2>
              {leaderboard.isLoading ? <p className="text-neutral-600">Loading Leaderboard…</p> : null}
              {leaderboard.data ? (
                <ol className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
                  {leaderboard.data.map((entry, index) => (
                    <li
                      key={`${entry.displayName}-${entry.rating}-${index}`}
                      className="flex items-baseline justify-between gap-3 px-4 py-3"
                    >
                      <span className="font-medium text-ink">{entry.displayName}</span>
                      <span className="tabular-nums text-neutral-800">{entry.rating}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
