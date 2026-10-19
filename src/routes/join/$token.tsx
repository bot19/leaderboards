import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  fetchLadderIdByShareToken,
  joinLadder,
  previewLadder,
} from '@/data/ladder'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/join/$token')({
  beforeLoad: ({ context, params }) => {
    if (context.auth.isLoading) return
    const returnTo = `/join/${params.token}`
    const destination = resolveAuthDestination({
      session: context.auth.session,
      profile: context.auth.profile,
    })
    if (destination === '/login') {
      throw redirect({ to: '/login', search: { redirect: returnTo } })
    }
    if (destination === '/onboarding') {
      throw redirect({ to: '/onboarding', search: { redirect: returnTo } })
    }
  },
  component: ShareLinkPreviewPage,
})

function ShareLinkPreviewPage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const preview = useQuery({
    queryKey: ['ladder-preview', token],
    queryFn: () => previewLadder(token),
  })

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      {preview.isLoading ? <p className="text-neutral-600">Loading preview…</p> : null}
      {preview.isError ? (
        <h1 className="font-display text-3xl text-ink">This Share link does not match a Ladder.</h1>
      ) : null}
      {preview.data ? (
        <>
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">Share link</p>
            <h1 className="font-display text-3xl text-ink">{preview.data.name}</h1>
            <p className="text-sm text-neutral-600">{preview.data.gameName}</p>
            <p className="text-neutral-800">
              {preview.data.memberCount}{' '}
              {preview.data.memberCount === 1 ? 'Ladder member' : 'Ladder members'}
            </p>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="button"
            disabled={pending}
            className="rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => {
              setPending(true)
              setError(null)
              void joinLadder(token)
                .then(async () => {
                  const ladderId = await fetchLadderIdByShareToken(token)
                  if (!ladderId) throw new Error('Could not open this Ladder')
                  await navigate({
                    to: '/ladders/$ladderId',
                    params: { ladderId },
                    search: { tab: 'leaderboard' },
                  })
                })
                .catch((caught: unknown) => {
                  const message = caught instanceof Error ? caught.message : 'Could not join this Ladder.'
                  setError(message)
                  toast.error(message)
                })
                .finally(() => setPending(false))
            }}
          >
            Join
          </button>
        </>
      ) : null}
    </main>
  )
}
