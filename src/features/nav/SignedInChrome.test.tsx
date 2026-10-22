import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { flushSync } from 'react-dom'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/data/auth'
import { AuthContext, type AuthState } from '@/features/auth/authContext'
import { routeTree } from '@/routeTree.gen'
import { ladderCountLabel } from './navSearch'

const mocks = vi.hoisted(() => ({
  displayName: 'Sam',
  signOut: vi.fn(async () => {}),
  updateDisplayName: vi.fn(async (name: string) => {
    mocks.displayName = name
  }),
  ladders: [
    { id: 'l1', name: 'Friday pool', gameName: 'Pool' },
    { id: 'l2', name: 'Chess night', gameName: 'Chess' },
    { id: 'l3', name: 'Darts', gameName: 'Darts' },
  ],
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/data/auth', () => ({
  useSignOut: () => ({ mutateAsync: mocks.signOut, isPending: false }),
  useSignInWithOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignInWithPassword: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSignUpWithOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVerifyEmailOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/data/profile', () => ({
  updateDisplayName: (name: string) => mocks.updateDisplayName(name),
  createProfile: vi.fn(),
  fetchProfile: vi.fn(),
}))

vi.mock('@/data/ladder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/ladder')>()
  return {
    ...actual,
    listMyLadders: () => Promise.resolve(mocks.ladders),
  }
})

const session = { user: { id: 'user-1' } } as Session

beforeAll(() => {
  window.scrollTo = () => {}
})

afterEach(() => {
  cleanup()
  mocks.displayName = 'Sam'
  mocks.signOut.mockReset()
  mocks.signOut.mockImplementation(async () => {})
  mocks.updateDisplayName.mockClear()
})

function renderAt(
  path: string,
  options?: { session?: boolean; profile?: boolean; loading?: boolean },
) {
  const hasSession = options?.session ?? true
  const hasProfile = options?.profile ?? hasSession
  const loading = options?.loading ?? false
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  let setSignedIn: (value: boolean) => void = () => {}
  let setDisplayName: (value: string) => void = () => {}

  function Frame() {
    const [name, setName] = useState('Sam')
    const [isSignedIn, setIsSignedIn] = useState(hasSession)
    setDisplayName = (value) => {
      flushSync(() => setName(value))
    }
    setSignedIn = (value) => {
      flushSync(() => setIsSignedIn(value))
    }
    mocks.signOut.mockImplementation(async () => {
      setSignedIn(false)
    })
    const auth: AuthState = {
      session: isSignedIn ? session : null,
      profile: hasProfile && isSignedIn
        ? { id: 'user-1', displayName: name, isSuperAdmin: false }
        : null,
      profileError: false,
      isLoading: loading,
      refreshProfile: async () => setDisplayName(mocks.displayName),
    }
    return (
      <AuthContext value={auth}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider
            router={router}
            context={{ auth, queryClient }}
          />
        </QueryClientProvider>
      </AuthContext>
    )
  }

  const initialAuth: AuthState = {
    session: hasSession ? session : null,
    profile: hasProfile && hasSession
      ? { id: 'user-1', displayName: 'Sam', isSuperAdmin: false }
      : null,
    profileError: false,
    isLoading: loading,
    refreshProfile: async () => setDisplayName(mocks.displayName),
  }
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { auth: initialAuth, queryClient },
  })

  return { router, queryClient, Frame, signOut: () => setSignedIn(false) }
}

async function openApp(
  path: string,
  options?: { session?: boolean; profile?: boolean; loading?: boolean },
) {
  const { router, queryClient, Frame } = renderAt(path, options)
  await act(async () => {
    await router.load()
  })
  await act(async () => {
    render(<Frame />)
  })
  return { router, queryClient }
}

describe('ladder count label', () => {
  it('says Ladders while unknown, and pluralises a count', () => {
    expect(ladderCountLabel(undefined)).toBe('Ladders')
    expect(ladderCountLabel(0)).toBe('0 Ladders')
    expect(ladderCountLabel(1)).toBe('1 Ladder')
    expect(ladderCountLabel(3)).toBe('3 Ladders')
  })
})

describe('signed-in chrome', () => {
  it('shows the rail on signed-in screens and hides it on signed-out screens', async () => {
    const signedIn = ['/', '/ladders/ladder-1?tab=leaderboard', '/ladders/ladder-1/members/member-1', '/join/share-token']
    for (const path of signedIn) {
      cleanup()
      await openApp(path)
      expect(await screen.findByRole('button', { name: 'Nav' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
    }

    const signedOut: Array<[string, { session?: boolean; profile?: boolean; loading?: boolean }]> = [
      ['/login', { session: false, profile: false }],
      ['/signup', { session: false, profile: false }],
      ['/onboarding', { session: true, profile: false }],
      ['/auth/callback', { session: false, profile: false, loading: true }],
    ]
    for (const [path, options] of signedOut) {
      cleanup()
      await openApp(path, options)
      expect(screen.queryByRole('button', { name: 'Nav' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument()
    }
  })

  it('opens the menu from Nav and the profile from the avatar, and switches views', async () => {
    const user = userEvent.setup()
    await openApp('/')

    await user.click(screen.getByRole('button', { name: 'Nav' }))
    const menu = await screen.findByRole('dialog')
    expect(within(menu).getByRole('heading', { name: 'Leaderboards' })).toBeInTheDocument()
    expect(within(menu).getByText('boards')).toHaveClass('text-primary')
    expect(within(menu).getByText('Who beats whom')).toBeInTheDocument()
    expect(within(menu).getByText('v0.3.1')).toBeInTheDocument()
    expect(within(menu).queryByRole('textbox', { name: 'Display name' })).not.toBeInTheDocument()
    expect(document.activeElement).toHaveAttribute('data-nav-close')

    const card = await within(menu).findByRole('button', { name: /3 Ladders/ })
    expect(within(card).getByText('Sam')).toHaveClass('truncate')
    await user.click(card)

    const profile = await screen.findByRole('dialog')
    expect(within(profile).getByRole('heading', { name: 'Sam' })).toBeInTheDocument()
    expect(within(profile).getByRole('textbox', { name: 'Display name' })).toBeInTheDocument()
    expect(within(profile).queryByText('v0.3.1')).not.toBeInTheDocument()

    await user.click(within(profile).getByRole('button', { name: 'Nav' }))
    expect(await screen.findByText('v0.3.1')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Display name' })).not.toBeInTheDocument()
  })

  it('opens the profile view from the avatar', async () => {
    const user = userEvent.setup()
    await openApp('/')
    expect(screen.getByRole('button', { name: 'Profile' })).toHaveTextContent('SA')

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(await screen.findByRole('heading', { name: 'Sam' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveValue('Sam')
  })

  it('closes from Close, the backdrop, Escape, and Back, and returns focus to the opener', async () => {
    const user = userEvent.setup()
    const { router } = await openApp('/ladders/ladder-1?tab=matches')
    const nav = screen.getByRole('button', { name: 'Nav' })

    await user.click(nav)
    expect(router.state.location.search).toMatchObject({ tab: 'matches', nav: 'menu' })
    const close = screen.getAllByRole('button', { name: 'Close' })[0]
    if (!close) throw new Error('Close button missing')
    await user.click(close)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(router.state.location.search).not.toHaveProperty('nav')
    expect(router.state.location.search).toMatchObject({ tab: 'matches' })

    await user.click(nav)
    await user.click(screen.getByRole('button', { name: 'Dismiss navigation' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await user.click(nav)
    expect(document.activeElement).toHaveAttribute('data-nav-close')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(nav).toHaveFocus())

    await user.click(nav)
    await user.click(await screen.findByRole('button', { name: /3 Ladders/ }))
    expect(router.state.location.search).toMatchObject({ nav: 'profile' })
    await act(async () => {
      router.history.back()
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('refetches from Refresh and signs out to login', async () => {
    const user = userEvent.setup()
    const { queryClient } = await openApp('/')
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(screen.getByRole('button', { name: 'Nav' }))
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalled())

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(mocks.signOut).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Email me a passcode' })).toBeInTheDocument()
  })

  it('saves a display name into the drawer title, profile card, and avatar', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/')

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    const input = await screen.findByRole('textbox', { name: 'Display name' })
    await user.clear(input)
    await user.type(input, 'Priya')
    await user.click(screen.getByRole('button', { name: 'Save display name' }))

    expect(await screen.findByRole('heading', { name: 'Priya' })).toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Display name updated')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nav' }))
    expect(await screen.findByRole('button', { name: /Priya/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Profile' })).toHaveTextContent('PR')
  })

  it('halves Home top padding and toggles the New Ladder form', async () => {
    const user = userEvent.setup()
    await openApp('/')

    const main = screen.getByRole('main')
    expect(main).toHaveClass('pt-5', 'pb-10')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Display name' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'New Ladder' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Ladder' }))
    const input = screen.getByRole('textbox', { name: 'New Ladder' })
    expect(input).toHaveFocus()
    expect(screen.getByRole('separator')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close new Ladder' }))
    expect(screen.queryByRole('textbox', { name: 'New Ladder' })).not.toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })
})

describe('text input background', () => {
  it('sets a white background once in the base layer', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../index.css'), 'utf8')
    const base = css.slice(css.indexOf('@layer base'), css.indexOf('@layer base') + 1200)
    expect(base).toContain('textarea')
    expect(base).toContain('@apply bg-white;')
  })

  it('is version 0.3.1', () => {
    const pkg = JSON.parse(
      readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../package.json'), 'utf8'),
    ) as { version: string }
    expect(pkg.version).toBe('0.3.1')
  })
})
