import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { redirectSearchSchema } from '@/features/auth/redirectSearch'

vi.mock('@/lib/tempPasswordAuth', () => ({
  TEMP_PASSWORD_AUTH: false,
}))

vi.mock('@/data/auth', () => ({
  useSignInWithOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVerifyEmailOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignInWithPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

describe('login page', () => {
  it('shows no password form when TEMP_PASSWORD_AUTH is false', async () => {
    const { LoginPage } = await import('./LoginPage')

    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/login',
      validateSearch: redirectSearchSchema,
      component: LoginPage,
    })
    const signupRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/signup',
      component: () => null,
    })
    const history = createMemoryHistory({ initialEntries: ['/login'] })
    const router = createRouter({
      routeTree: rootRoute.addChildren([loginRoute, signupRoute]),
      history,
    })
    const queryClient = new QueryClient()

    await act(async () => {
      await router.load()
      render(
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>,
      )
    })

    expect(screen.getByRole('button', { name: 'Email me a passcode' })).toBeInTheDocument()
    expect(screen.queryByText('Local development password')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Sign in with password' }),
    ).not.toBeInTheDocument()
  })
})
