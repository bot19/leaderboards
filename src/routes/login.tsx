import { createFileRoute, redirect } from '@tanstack/react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { resolveAuthDestination } from '@/lib/authDestination'
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
