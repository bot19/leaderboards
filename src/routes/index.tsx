import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuth } from '@/features/auth/authContext'
import { redirectSearchSchema } from '@/features/auth/redirectSearch'
import { LaddersSection } from '@/features/ladders/LaddersSection'
import { SignedInChrome } from '@/features/nav/SignedInChrome'
import { resolveAuthDestination, safeReturnPath } from '@/lib/authDestination'

export const Route = createFileRoute('/')({
  validateSearch: redirectSearchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.auth.isLoading) return
    const destination = resolveAuthDestination({
      session: context.auth.session,
      profile: context.auth.profile,
    })
    if (destination === '/login' || destination === '/onboarding') {
      throw redirect({ to: destination })
    }
    const returnTo = safeReturnPath(search.redirect)
    if (returnTo && returnTo !== '/') {
      throw redirect({ href: returnTo, replace: true })
    }
    const defaultLadderId = context.auth.profile?.defaultLadderId
    if (defaultLadderId) {
      throw redirect({
        to: '/ladders/$ladderId',
        params: { ladderId: defaultLadderId },
        search: { tab: 'leaderboard' },
        replace: true,
      })
    }
  },
  component: HomePage,
})

function HomePage() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <>
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 pt-5 pb-10">
        <h1 className="font-display text-3xl text-ink">Home</h1>
        <LaddersSection />
      </main>
      <SignedInChrome />
    </>
  )
}
