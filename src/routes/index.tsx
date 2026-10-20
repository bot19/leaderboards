import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/user/UserAvatar'
import { useSignOut } from '@/data/auth'
import { createLadder, listMyLadders } from '@/data/ladder'
import { updateDisplayName } from '@/data/profile'
import { useAuth } from '@/features/auth/authContext'
import { displayNameSchema, type DisplayNameValues } from '@/features/auth/schemas'
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
  const { profile, refreshProfile } = useAuth()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const ladders = useQuery({
    queryKey: ['my-ladders'],
    queryFn: () => listMyLadders(),
  })
  const displayNameForm = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    values: { displayName: profile?.displayName ?? '' },
  })
  const ladderForm = useForm<LadderNameValues>({
    resolver: zodResolver(ladderNameSchema),
    defaultValues: { name: '' },
  })

  if (!profile) return null

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      <div className="flex items-center gap-3">
        <UserAvatar username={profile.displayName} />
        <div>
          <h1 className="font-display text-3xl text-ink">Home</h1>
          <p className="text-sm text-neutral-600">{profile.displayName}</p>
        </div>
      </div>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-ink">Your Ladders</h2>
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
                  className="flex items-baseline justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
                >
                  <span className="font-medium text-ink">{ladder.name}</span>
                  <span className="text-sm text-neutral-600">{ladder.gameName}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
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
              toast.error(message)
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
            className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Create Ladder
          </button>
        </form>
      </section>
      <form
        className="space-y-3"
        onSubmit={displayNameForm.handleSubmit(async (values) => {
          try {
            await updateDisplayName(values.displayName)
            await refreshProfile()
            toast.success('Display name updated')
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Could not update your display name.'
            toast.error(message)
          }
        })}
      >
        <label className="block text-sm font-medium text-neutral-800" htmlFor="home-display-name">
          Display name
        </label>
        <input
          id="home-display-name"
          className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
          {...displayNameForm.register('displayName')}
        />
        {displayNameForm.formState.errors.displayName ? (
          <p className="text-sm text-red-700">{displayNameForm.formState.errors.displayName.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={displayNameForm.formState.isSubmitting}
          className="rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          Save display name
        </button>
      </form>
      <button
        type="button"
        className="self-start text-sm text-neutral-700 underline"
        onClick={() => {
          void signOut.mutateAsync().then(() => navigate({ to: '/login' }))
        }}
      >
        Sign out
      </button>
    </main>
  )
}
