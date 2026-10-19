import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { createProfile } from '@/data/profile'
import { useAuth } from '@/features/auth/authContext'
import { displayNameSchema, type DisplayNameValues } from '@/features/auth/schemas'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/onboarding')({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return
    const destination = resolveAuthDestination({
      session: context.auth.session,
      profile: context.auth.profile,
    })
    if (destination !== '/onboarding') {
      throw redirect({ to: destination })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
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
            await navigate({ to: '/' })
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
      </form>
    </main>
  )
}
