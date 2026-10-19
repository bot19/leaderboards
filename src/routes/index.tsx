import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { UserAvatar } from '@/components/user/UserAvatar'
import { useSignOut } from '@/data/auth'
import { updateDisplayName } from '@/data/profile'
import { useAuth } from '@/features/auth/authContext'
import { displayNameSchema, type DisplayNameValues } from '@/features/auth/schemas'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return
    const destination = resolveAuthDestination({
      session: context.auth.session,
      profile: context.auth.profile,
    })
    if (destination !== '/') {
      throw redirect({ to: destination })
    }
  },
  component: HomePage,
})

function HomePage() {
  const { profile, refreshProfile } = useAuth()
  const signOut = useSignOut()
  const navigate = useNavigate()
  const form = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    values: { displayName: profile?.displayName ?? '' },
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
      <p className="text-neutral-700">No Ladders yet.</p>
      <form
        className="space-y-3"
        onSubmit={form.handleSubmit(async (values) => {
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
          {...form.register('displayName')}
        />
        {form.formState.errors.displayName ? (
          <p className="text-sm text-red-700">{form.formState.errors.displayName.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
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
