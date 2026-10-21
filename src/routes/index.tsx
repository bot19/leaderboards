import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { IconPlus, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { IconButton } from '@/components/ui/IconButton'
import { createLadder, listMyLadders } from '@/data/ladder'
import { useAuth } from '@/features/auth/authContext'
import { SignedInChrome } from '@/features/nav/SignedInChrome'
import { ladderNameSchema, type LadderNameValues } from '@/features/ladders/schemas'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/')({
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
  component: HomePage,
})

function HomePage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [newLadderOpen, setNewLadderOpen] = useState(false)
  const ladders = useQuery({
    queryKey: ['my-ladders'],
    queryFn: () => listMyLadders(),
  })
  const ladderForm = useForm<LadderNameValues>({
    resolver: zodResolver(ladderNameSchema),
    defaultValues: { name: '' },
  })

  useEffect(() => {
    if (!newLadderOpen) return
    document.getElementById('ladder-name')?.focus()
  }, [newLadderOpen])

  if (!profile) return null

  return (
    <>
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-5 pb-10">
      <h1 className="font-display text-3xl text-ink">Home</h1>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="min-w-0 font-display text-2xl text-ink">Your Ladders</h2>
          <IconButton
            aria-label={newLadderOpen ? 'Close new Ladder' : 'New Ladder'}
            className="h-11 w-11"
            onClick={() => setNewLadderOpen((open) => !open)}
          >
            {newLadderOpen ? (
              <IconX size={22} stroke={1.75} aria-hidden />
            ) : (
              <IconPlus size={22} stroke={1.75} aria-hidden />
            )}
          </IconButton>
        </div>
        {newLadderOpen ? (
          <form
            className="space-y-3"
            onSubmit={ladderForm.handleSubmit(async (values) => {
              try {
                const ladder = await createLadder(values.name)
                await queryClient.invalidateQueries({ queryKey: ['my-ladders'] })
                ladderForm.reset({ name: '' })
                await navigate({
                  to: '/ladders/$ladderId',
                  params: { ladderId: ladder.id },
                  search: { tab: 'leaderboard' },
                })
              } catch (caught) {
                const message = caught instanceof Error ? caught.message : 'Could not create a Ladder.'
                toast.error(message, { id: 'new-ladder', duration: Infinity })
              }
            })}
          >
            <label className="block text-sm font-medium text-neutral-800" htmlFor="ladder-name">
              New Ladder
            </label>
            <input
              id="ladder-name"
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
              placeholder="Friday pool"
              {...ladderForm.register('name')}
            />
            {ladderForm.formState.errors.name ? (
              <p className="text-sm text-red-700">{ladderForm.formState.errors.name.message}</p>
            ) : null}
            <button
              type="submit"
              disabled={ladderForm.formState.isSubmitting}
              className="min-h-11 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Create Ladder
            </button>
          </form>
        ) : null}
        {newLadderOpen ? <hr className="border-neutral-200" /> : null}
        {ladders.isLoading ? <p className="text-neutral-600">Loading Ladders…</p> : null}
        {ladders.isError ? (
          <p className="text-sm text-red-700">Could not load your Ladders.</p>
        ) : null}
        {ladders.data && ladders.data.length === 0 ? (
          <p className="text-neutral-700">No Ladders yet.</p>
        ) : null}
        {ladders.data && ladders.data.length > 0 ? (
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl bg-white shadow-sm">
            {ladders.data.map((ladder) => (
              <li key={ladder.id}>
                <Link
                  to="/ladders/$ladderId"
                  params={{ ladderId: ladder.id }}
                  search={{ tab: 'leaderboard' }}
                  className="flex min-w-0 items-baseline justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="min-w-0 truncate font-medium text-ink">{ladder.name}</span>
                  <span className="shrink-0 text-sm text-neutral-600">{ladder.gameName}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
    <SignedInChrome />
    </>
  )
}
