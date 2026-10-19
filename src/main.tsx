import { IconLoader2 } from '@tabler/icons-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { useAuth } from '@/features/auth/authContext'
import { routeTree } from './routeTree.gen'
import './index.css'

const queryClient = new QueryClient()

const router = createRouter({
  routeTree,
  context: {
    auth: {
      session: null,
      profile: null,
      profileError: false,
      isLoading: true,
      refreshProfile: async () => {},
    },
    queryClient,
  },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function InnerApp() {
  const auth = useAuth()

  useEffect(() => {
    if (auth.isLoading) return
    void router.invalidate()
  }, [auth.isLoading, auth.session, auth.profile])

  if (auth.session && !auth.profile && auth.profileError && !auth.isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-neutral-100 px-4 text-center">
        <div className="space-y-3">
          <p className="text-neutral-800">Could not load your profile.</p>
          <button
            type="button"
            className="rounded-md bg-ink px-3 py-2 text-sm text-white"
            onClick={() => {
              void auth.refreshProfile()
            }}
          >
            Try again
          </button>
        </div>
      </main>
    )
  }

  return (
    <>
      <RouterProvider router={router} context={{ auth, queryClient }} />
      {auth.isLoading && !auth.session ? (
        <div className="fixed inset-0 grid place-items-center bg-neutral-100">
          <p className="inline-flex items-center gap-2 text-neutral-600">
            <IconLoader2 size={18} className="animate-spin" aria-hidden />
            Loading…
          </p>
        </div>
      ) : null}
    </>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <InnerApp />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
