import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import type { QueryClient } from '@tanstack/react-query'
import type { AuthState } from '@/features/auth/authContext'
import { navSearchSchema } from '@/features/nav/navSearch'
import { Toaster } from 'sonner'

export type RouterContext = {
  auth: AuthState
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: navSearchSchema,
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <Outlet />
      <Toaster position="top-center" closeButton richColors />
      {import.meta.env.DEV && import.meta.env.MODE !== 'test' ? (
        <TanStackRouterDevtools position="bottom-right" />
      ) : null}
    </>
  )
}
