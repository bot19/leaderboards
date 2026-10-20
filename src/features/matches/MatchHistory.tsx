import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { listLadderMembers } from '@/data/ladder'
import { listMatches, voidMatch, type MatchRead } from '@/data/match'
import { useAuth } from '@/features/auth/authContext'
import {
  formatRatingChange,
  matchResultLabel,
  matchStatusLabel,
  sideNames,
} from '@/features/matches/labels'

type Props = {
  ladderId: string
}

export function MatchHistory({ ladderId }: Props) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const matches = useQuery({
    queryKey: ['matches', ladderId],
    queryFn: () => listMatches(ladderId),
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
        queryClient.invalidateQueries({ queryKey: ['inactive-members', ladderId] }),
        queryClient.invalidateQueries({ queryKey: ['roster', ladderId] }),
        queryClient.invalidateQueries({ queryKey: ['ladder-members', ladderId] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <section aria-label="Matches" className="space-y-2">
      <h2 className="sr-only">Matches</h2>
      {matches.isLoading ? <p className="text-neutral-600">Loading Matches…</p> : null}
      {matches.isError ? <p className="text-sm text-red-700">Could not load Matches.</p> : null}
      {matches.data && matches.data.length === 0 ? (
        <p className="text-neutral-700">No Matches yet.</p>
      ) : null}
      {matches.data && matches.data.length > 0 ? (
        <ol className="space-y-3">
          {matches.data.map((match) => (
            <li key={match.id} className="space-y-2 rounded-xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-ink">
                  {sideNames(match, 'a')} vs {sideNames(match, 'b')}
                </p>
                <p className="text-sm text-neutral-600">
                  {matchStatusLabel(match.status, match.voidKind)}
                </p>
              </div>
              <p className="text-sm text-neutral-700">
                {matchResultLabel(match.result)}
                {match.notes ? ` · ${match.notes}` : ''}
              </p>
              <RatingChanges match={match} />
              {canVoid && match.status !== 'voided' ? (
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={voiding.isPending && voiding.variables === match.id}
                    className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-60"
                    onClick={() => voiding.mutate(match.id)}
                  >
                    Void
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  )
}

function RatingChanges({ match }: { match: MatchRead }) {
  if (match.status !== 'confirmed') return null
  return (
    <ul className="space-y-1 text-sm text-neutral-800">
      {match.participants.map((participant) => (
        <li key={participant.ladderMemberId} className="flex justify-between gap-3">
          <span>{participant.displayName}</span>
          <span className="tabular-nums">{formatRatingChange(participant.ratingChange)}</span>
        </li>
      ))}
    </ul>
  )
}
