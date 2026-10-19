import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { confirmMatch, listMatchesWaitingForMe } from '@/data/match'
import { matchResultLabel, sideNames } from '@/features/matches/labels'

type Props = {
  ladderId: string
}

export function WaitingForYou({ ladderId }: Props) {
  const queryClient = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const waiting = useQuery({
    queryKey: ['matches-waiting', ladderId],
    queryFn: () => listMatchesWaitingForMe(ladderId),
  })

  if (!waiting.data || waiting.data.length === 0) return null

  return (
    <section aria-label="Waiting for you" className="space-y-2">
      <h2 className="font-display text-xl text-ink">Waiting for you</h2>
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
        {waiting.data.map((match) => (
          <li key={match.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {sideNames(match, 'a')} vs {sideNames(match, 'b')}
              </p>
              <p className="text-sm text-neutral-600">
                {matchResultLabel(match.result)}
                {match.notes ? ` · ${match.notes}` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={confirmingId === match.id}
              className="shrink-0 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              onClick={() => {
                setConfirmingId(match.id)
                void confirmMatch(match.id)
                  .then(async () => {
                    toast.success('Match confirmed')
                    await queryClient.invalidateQueries({ queryKey: ['matches', ladderId] })
                    await queryClient.invalidateQueries({ queryKey: ['matches-waiting', ladderId] })
                    await queryClient.invalidateQueries({ queryKey: ['leaderboard', ladderId] })
                    await queryClient.invalidateQueries({ queryKey: ['roster', ladderId] })
                  })
                  .catch((caught: unknown) => {
                    const message = caught instanceof Error ? caught.message : 'Could not confirm this Match.'
                    toast.error(message)
                  })
                  .finally(() => setConfirmingId(null))
              }}
            >
              Confirm
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
