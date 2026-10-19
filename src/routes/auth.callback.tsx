import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth/authContext'
import { resolveAuthDestination } from '@/lib/authDestination'

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
})

/** Magic-link fallback. The client reads the URL hash; this page only redirects. */
function AuthCallbackPage() {
  const navigate = useNavigate()
  const { session, profile, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    const destination = resolveAuthDestination({ session, profile })
    if (destination === '/login' || destination === '/onboarding' || destination === '/') {
      void navigate({ to: destination, replace: true })
    }
  }, [isLoading, session, profile, navigate])

  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-100">
      <p className="text-neutral-600">Signing you in…</p>
    </main>
  )
}
