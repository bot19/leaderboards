import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listLadderMembers } from '@/data/ladder'
import { listMatchesPage, voidMatch } from '@/data/match'
import { useAuth } from '@/features/auth/authContext'
import { joinMatchPages } from '@/features/matches/joinMatchPages'
import { MatchCard } from '@/features/matches/MatchCard'
import { voidMatchConfirm } from '@/lib/confirmAction'
import { MATCH_PAGE_SIZE, loadMoreLabel } from '@/lib/listPage'

type Props = {
  ladderId: string
}

export function MatchHistory({ ladderId }: Props) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const matches = useInfiniteQuery({
    queryKey: ['matches', ladderId, 'pages'],
    queryFn: ({ pageParam }) =>
      listMatchesPage(ladderId, { offset: pageParam, limit: MATCH_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.matches.length === 0) return undefined
      const nextOffset = allPages.reduce((sum, page) => sum + page.matches.length, 0)
      if (nextOffset >= lastPage.total) return undefined
      return nextOffset
    },
  })
  const members = useQuery({
    queryKey: ['ladder-members', ladderId],
    queryFn: () => listLadderMembers(ladderId),
  })

  const mine = members.data?.find((member) => member.userId === profile?.id)
  const canVoid =
    Boolean(profile?.isSuperAdmin) ||
    (mine?.status === 'active' && mine.role === 'admin')

  const voiding = useMutation({
    mutationFn: (matchId: string) => voidMatch(matchId),
    onSuccess: async () => {
      toast.success('Match voided')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['matches', ladderId] }),
        queryClient.invalidateQueries({ queryKey: ['matches-waiting', ladderId] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard', ladderId] }),
        queryClient.invalidateQueries({ queryKey: ['roster', ladderId] }),
        queryClient.invalidateQueries({ queryKey: ['ladder-members', ladderId] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const pages = matches.data?.pages ?? []
  const items = joinMatchPages(pages)
  const total = pages.length > 0 ? (pages[pages.length - 1]?.total ?? 0) : 0
  const remaining = total - items.length

  return (
    <section aria-label="Matches" className="space-y-3">
      <h2 className="sr-only">Matches</h2>
      {matches.isLoading ? <p className="text-neutral-600">Loading Matches…</p> : null}
      {matches.isError ? <p className="text-sm text-red-700">Could not load Matches.</p> : null}
      {matches.isSuccess && items.length === 0 ? (
        <p className="text-neutral-700">No Matches yet.</p>
      ) : null}
      {items.length > 0 ? (
        <>
          <ol className="space-y-3">
            {items.map((match) => (
              <li key={match.id}>
                <MatchCard
                  match={match}
                  members={members.data ?? []}
                  voiding={voiding.isPending && voiding.variables === match.id}
                  onVoid={
                    canVoid && match.status !== 'voided'
                      ? () => {
                          const status = match.status === 'confirmed' ? 'confirmed' : 'pending'
                          if (window.confirm(voidMatchConfirm(status))) {
                            voiding.mutate(match.id)
                          }
                        }
                      : undefined
                  }
                />
              </li>
            ))}
          </ol>
          <p className="text-center text-sm text-neutral-600">
            Showing {items.length} of {total} Matches
          </p>
          {matches.hasNextPage ? (
            <button
              type="button"
              disabled={matches.isFetchingNextPage}
              className="min-h-11 w-full cursor-pointer rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => {
                void matches.fetchNextPage()
              }}
            >
              {matches.isFetchingNextPage ? 'Loading…' : loadMoreLabel(remaining, MATCH_PAGE_SIZE)}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
