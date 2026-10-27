import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { listLadderMembers } from '@/data/ladder'
import { confirmMatch, listMatchesWaitingForMe, rejectMatch } from '@/data/match'
import { MatchCard } from '@/features/matches/MatchCard'
import { rejectMatchConfirm } from '@/lib/confirmAction'

type Props = {
  ladderId: string
}

export function WaitingForYou({ ladderId }: Props) {
  const queryClient = useQueryClient()
  const [busyId, setBusyId] = useState<string | null>(null)
  const waiting = useQuery({
    queryKey: ['matches-waiting', ladderId],
    queryFn: () => listMatchesWaitingForMe(ladderId),
  })
  const members = useQuery({
    queryKey: ['ladder-members', ladderId],
    queryFn: () => listLadderMembers(ladderId),
  })

  if (!waiting.data || waiting.data.length === 0) return null

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['matches', ladderId] })
    await queryClient.invalidateQueries({ queryKey: ['matches-waiting', ladderId] })
    await queryClient.invalidateQueries({ queryKey: ['leaderboard', ladderId] })
    await queryClient.invalidateQueries({ queryKey: ['roster', ladderId] })
  }

  return (
    <section aria-label="Waiting for you" className="space-y-3">
      <h2 className="font-display text-xl text-ink">Waiting for you</h2>
      <ul className="space-y-3">
        {waiting.data.map((match) => (
          <li key={match.id}>
            <MatchCard match={match} members={members.data ?? []}>
              <button
                type="button"
                disabled={busyId === match.id}
                className="min-h-11 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-ink disabled:opacity-60"
                onClick={() => {
                  if (!window.confirm(rejectMatchConfirm())) return
                  setBusyId(match.id)
                  void rejectMatch(match.id)
                    .then(async () => {
                      toast.success('Match Rejected')
                      await refresh()
                    })
                    .catch((caught: unknown) => {
                      const message =
                        caught instanceof Error ? caught.message : 'Could not Reject this Match.'
                      toast.error(message)
                    })
                    .finally(() => setBusyId(null))
                }}
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busyId === match.id}
                className="min-h-11 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                onClick={() => {
                  setBusyId(match.id)
                  void confirmMatch(match.id)
                    .then(async () => {
                      toast.success('Match confirmed')
                      await refresh()
                    })
                    .catch((caught: unknown) => {
                      const message =
                        caught instanceof Error ? caught.message : 'Could not confirm this Match.'
                      toast.error(message)
                    })
                    .finally(() => setBusyId(null))
                }}
              >
                Confirm
              </button>
            </MatchCard>
          </li>
        ))}
      </ul>
      <div className="pt-3">
        <hr className="border-neutral-200" />
      </div>
    </section>
  )
}
