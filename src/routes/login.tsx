import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { BrandLockup } from '@/components/brand/BrandLockup'
import { InfoBox } from '@/components/ui/InfoBox'
import {
  useSignInWithOtp,
  useSignInWithPassword,
  useVerifyEmailOtp,
} from '@/data/auth'
import {
  passcodeRequestSchema,
  passcodeSchema,
  passwordSchema,
  type PasscodeRequestValues,
  type PasscodeValues,
  type PasswordValues,
} from '@/features/auth/schemas'
import { resolveAuthDestination } from '@/lib/authDestination'
import { TEMP_PASSWORD_AUTH } from '@/lib/tempPasswordAuth'
import { redirectSearchSchema } from '@/features/auth/redirectSearch'

export const Route = createFileRoute('/login')({
  validateSearch: redirectSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isLoading) return
    if (!context.auth.session) return
    const destination = resolveAuthDestination(
      {
        session: context.auth.session,
        profile: context.auth.profile,
      },
      search.redirect,
    )
    if (destination === '/onboarding') {
      throw redirect({ to: '/onboarding', search })
    }
    throw redirect({ href: destination })
  },
  component: LoginPage,
})

function LoginPage() {
  const requestOtp = useSignInWithOtp()
  const verifyOtp = useVerifyEmailOtp()
  const signIn = useSignInWithPassword()
  const { redirect: returnTo } = Route.useSearch()
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-100 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <BrandLockup align="center" titleAs="h1" />
        {error ? <InfoBox variant="error">{error}</InfoBox> : null}
        {email ? (
          <PasscodeStep
            email={email}
            pending={verifyOtp.isPending}
            onSubmit={async (token) => {
              setError(null)
              try {
                await verifyOtp.mutateAsync({ email, token })
              } catch (caught) {
                const message = messageFrom(caught)
                setError(message)
                toast.error(message)
              }
            }}
            onBack={() => setEmail(null)}
          />
        ) : (
          <EmailStep
            pending={requestOtp.isPending}
            onSubmit={async (nextEmail) => {
              setError(null)
              try {
                await requestOtp.mutateAsync(nextEmail)
                setEmail(nextEmail)
              } catch (caught) {
                const message = messageFrom(caught)
                setError(message)
                toast.error(message)
              }
            }}
          />
        )}
        {TEMP_PASSWORD_AUTH && !email ? (
          <PasswordStep
            pending={signIn.isPending}
            onSubmit={async (values) => {
              setError(null)
              try {
                await signIn.mutateAsync(values)
              } catch (caught) {
                const message = messageFrom(caught)
                setError(message)
                toast.error(message)
              }
            }}
          />
        ) : null}
        <p className="text-center text-sm text-neutral-600">
          New here?{' '}
          <Link
            to="/signup"
            search={{ redirect: returnTo }}
            className="font-medium text-ink underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}

function EmailStep({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: (email: string) => Promise<void>
}) {
  const form = useForm<PasscodeRequestValues>({
    resolver: zodResolver(passcodeRequestSchema),
    defaultValues: { email: '' },
  })
  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => onSubmit(values.email))}
    >
      <label className="block text-sm font-medium text-neutral-800" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
        {...form.register('email')}
      />
      {form.formState.errors.email ? (
        <p className="text-sm text-red-700">{form.formState.errors.email.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        Email me a passcode
      </button>
    </form>
  )
}

function PasscodeStep({
  email,
  pending,
  onSubmit,
  onBack,
}: {
  email: string
  pending: boolean
  onSubmit: (token: string) => Promise<void>
  onBack: () => void
}) {
  const form = useForm<PasscodeValues>({
    resolver: zodResolver(passcodeSchema),
    defaultValues: { email, token: '' },
  })
  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit((values) => onSubmit(values.token))}
    >
      <p className="text-sm text-neutral-600">
        Enter the passcode sent to <span className="font-medium text-ink">{email}</span>.
      </p>
      <input type="hidden" {...form.register('email')} />
      <label className="block text-sm font-medium text-neutral-800" htmlFor="token">
        Passcode
      </label>
      <input
        id="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
        {...form.register('token')}
      />
      {form.formState.errors.token ? (
        <p className="text-sm text-red-700">{form.formState.errors.token.message}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
      >
        Sign in
      </button>
      <button type="button" className="text-sm text-neutral-700 underline" onClick={onBack}>
        Use a different email
      </button>
    </form>
  )
}

function PasswordStep({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: (values: PasswordValues) => Promise<void>
}) {
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  })
  return (
    <form className="space-y-3 border-t border-neutral-200 pt-4" onSubmit={form.handleSubmit(onSubmit)}>
      <p className="text-sm text-neutral-600">Local development password</p>
      <input
        type="email"
        autoComplete="username"
        placeholder="Email"
        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
        {...form.register('email')}
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
        {...form.register('password')}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md border border-neutral-300 px-3 py-2.5 text-sm font-medium text-ink disabled:opacity-60"
      >
        Sign in with password
      </button>
    </form>
  )
}

function messageFrom(caught: unknown) {
  return caught instanceof Error ? caught.message : 'Something went wrong.'
}
