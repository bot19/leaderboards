import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useSignOut } from '@/data/auth'
import { createProfile } from '@/data/profile'
import { useAuth } from '@/features/auth/authContext'
import { displayNameSchema, type DisplayNameValues } from '@/features/auth/schemas'
import { resolveAuthDestination, safeReturnPath } from '@/lib/authDestination'
import { redirectSearchSchema } from '@/features/auth/redirectSearch'

export const Route = createFileRoute('/onboarding')({
  validateSearch: redirectSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isLoading) return
    const destination = resolveAuthDestination(
      {
        session: context.auth.session,
        profile: context.auth.profile,
      },
      search.redirect,
    )
    if (destination === '/onboarding') return
    if (destination === '/login') {
      throw redirect({ to: '/login', search })
    }
    throw redirect({ href: destination })
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const signOut = useSignOut()
  const { redirect: returnTo } = Route.useSearch()
  const form = useForm<DisplayNameValues>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: '' },
  })

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-100 px-4">
      <form
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-sm"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await createProfile(values.displayName)
            await refreshProfile()
            await navigate({ href: safeReturnPath(returnTo) ?? '/' })
          } catch (caught) {
            const message = caught instanceof Error ? caught.message : 'Could not save your display name.'
            form.setError('displayName', { message })
            toast.error(message)
          }
        })}
      >
        <h1 className="font-display text-3xl text-ink">What should we call you?</h1>
        <p className="text-sm text-neutral-600">
          Your display name is how colleagues see you. You can change it later.
        </p>
        <label className="block text-sm font-medium text-neutral-800" htmlFor="display-name">
          Display name
        </label>
        <input
          id="display-name"
          className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
          {...form.register('displayName')}
        />
        {form.formState.errors.displayName ? (
          <p className="text-sm text-red-700">{form.formState.errors.displayName.message}</p>
        ) : null}
        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          Continue
        </button>
        <button
          type="button"
          className="mx-auto block min-h-11 text-sm text-neutral-700 underline disabled:opacity-60"
          disabled={signOut.isPending}
          onClick={() => {
            void signOut
              .mutateAsync()
              .then(() => navigate({ to: '/login' }))
              .catch((caught: unknown) => {
                const message =
                  caught instanceof Error ? caught.message : 'Could not sign out.'
                toast.error(message, { id: 'sign-out', duration: Infinity })
              })
          }}
        >
          Not you? Sign out
        </button>
      </form>
    </main>
  )
}
