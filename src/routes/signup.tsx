import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { BrandLockup } from '@/components/brand/BrandLockup'
import { InfoBox } from '@/components/ui/InfoBox'
import { useSignUpWithOtp, useVerifyEmailOtp } from '@/data/auth'
import {
  passcodeRequestSchema,
  passcodeSchema,
  type PasscodeRequestValues,
  type PasscodeValues,
} from '@/features/auth/schemas'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/signup')({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return
    if (!context.auth.session) return
    throw redirect({
      to: resolveAuthDestination({
        session: context.auth.session,
        profile: context.auth.profile,
      }),
    })
  },
  component: SignupPage,
})

function SignupPage() {
  const requestOtp = useSignUpWithOtp()
  const verifyOtp = useVerifyEmailOtp()
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const emailForm = useForm<PasscodeRequestValues>({
    resolver: zodResolver(passcodeRequestSchema),
    defaultValues: { email: '' },
  })
  const codeForm = useForm<PasscodeValues>({
    resolver: zodResolver(passcodeSchema),
    defaultValues: { email: '', token: '' },
  })

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-100 px-4">
      <div className="w-full max-w-md space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <BrandLockup align="center" titleAs="h1" />
        <h2 className="text-center font-display text-xl text-ink">Create your account</h2>
        {error ? <InfoBox variant="error">{error}</InfoBox> : null}
        {email ? (
          <form
            className="space-y-3"
            onSubmit={codeForm.handleSubmit(async (values) => {
              setError(null)
              try {
                await verifyOtp.mutateAsync(values)
              } catch (caught) {
                const message = caught instanceof Error ? caught.message : 'Could not verify that passcode.'
                setError(message)
                toast.error(message)
              }
            })}
          >
            <p className="text-sm text-neutral-600">Enter the passcode sent to {email}.</p>
            <input type="hidden" {...codeForm.register('email')} />
            <label className="block text-sm font-medium" htmlFor="signup-token">
              Passcode
            </label>
            <input
              id="signup-token"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
              {...codeForm.register('token')}
            />
            <button
              type="submit"
              disabled={verifyOtp.isPending}
              className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Create account
            </button>
          </form>
        ) : (
          <form
            className="space-y-3"
            onSubmit={emailForm.handleSubmit(async (values) => {
              setError(null)
              try {
                await requestOtp.mutateAsync(values.email)
                setEmail(values.email)
                codeForm.setValue('email', values.email)
              } catch (caught) {
                const message = caught instanceof Error ? caught.message : 'Could not send a passcode.'
                setError(message)
                toast.error(message)
              }
            })}
          >
            <label className="block text-sm font-medium" htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              className="block w-full rounded-md border border-neutral-300 px-3 py-2 text-ink"
              {...emailForm.register('email')}
            />
            <button
              type="submit"
              disabled={requestOtp.isPending}
              className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              Email me a passcode
            </button>
          </form>
        )}
        <p className="text-center text-sm text-neutral-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-ink underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
