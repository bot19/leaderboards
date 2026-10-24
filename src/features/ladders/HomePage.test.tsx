import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/data/auth'
import type { LadderPreview } from '@/data/ladder'
import { AuthContext, type AuthState } from '@/features/auth/authContext'
import { routeTree } from '@/routeTree.gen'

const preview: LadderPreview = {
  name: 'Friday pool',
  gameName: 'pool',
  memberCount: 3,
}

const mocks = vi.hoisted(() => ({
  preview: vi.fn(),
  join: vi.fn(),
  fetchId: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/data/ladder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/ladder')>()
  return {
    ...actual,
    listMyLadders: () => Promise.resolve([]),
    previewLadder: (token: string) => mocks.preview(token),
    joinLadder: (token: string) => mocks.join(token),
    fetchLadderIdByShareToken: (token: string) => mocks.fetchId(token),
    fetchLadder: () =>
      Promise.resolve({
        id: 'ladder-9',
        name: 'Friday pool',
        gameName: 'pool',
        joinPolicy: 'open' as const,
      }),
    fetchShareToken: () => Promise.resolve('FP7K2Q'),
    listLeaderboard: () => Promise.resolve([]),
    listInactiveMembers: () => Promise.resolve([]),
    listLadderMembers: () => Promise.resolve([]),
    listRoster: () => Promise.resolve([]),
  }
})

vi.mock('@/data/match', () => ({
  listMatches: () => Promise.resolve([]),
  listMatchesPage: () => Promise.resolve({ matches: [], total: 0 }),
  countMatches: () => Promise.resolve(0),
  listMatchesWaitingForMe: () => Promise.resolve([]),
  confirmMatch: () => Promise.resolve(),
  rejectMatch: () => Promise.resolve(),
}))

const session = { user: { id: 'user-1' } } as Session

beforeAll(() => {
  window.scrollTo = () => {}
})

beforeEach(() => {
  mocks.preview.mockResolvedValue(preview)
  mocks.join.mockResolvedValue({ outcome: 'joined' })
  mocks.fetchId.mockResolvedValue('ladder-9')
})

afterEach(async () => {
  cleanup()
  mocks.preview.mockReset()
  mocks.join.mockReset()
  mocks.fetchId.mockReset()
  const { toast } = await import('sonner')
  vi.mocked(toast.error).mockClear()
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const auth: AuthState = {
    session,
    profile: { id: 'user-1', displayName: 'Sam', isSuperAdmin: false },
    profileError: false,
    isLoading: false,
    refreshProfile: async () => {},
  }
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { auth, queryClient },
  })

  function Frame() {
    return (
      <AuthContext value={auth}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} context={{ auth, queryClient }} />
        </QueryClientProvider>
      </AuthContext>
    )
  }

  return { router, queryClient, Frame }
}

async function openHome() {
  const { router, queryClient, Frame } = renderAt('/')
  await act(async () => {
    await router.load()
  })
  await act(async () => {
    render(<Frame />)
  })
  return { router, queryClient }
}

async function openJoinForm() {
  const user = userEvent.setup()
  const opened = await openHome()
  await user.click(screen.getByRole('button', { name: 'Join a Ladder' }))
  const input = screen.getByRole('textbox', { name: 'Join code' })
  return { user, input, ...opened }
}

describe('Home Ladders', () => {
  it('puts Join a Ladder before New Ladder, and only one form stays open', async () => {
    const user = userEvent.setup()
    await openHome()

    const heading = screen.getByRole('heading', { level: 2, name: 'Leaderboards' })
    const row = heading.parentElement
    if (!row) throw new Error('Heading row not found')
    expect(within(row).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Join a Ladder',
      'New Ladder',
    ])

    await user.click(screen.getByRole('button', { name: 'New Ladder' }))
    expect(screen.getByRole('textbox', { name: 'New Ladder' })).toHaveFocus()
    expect(screen.getByRole('separator')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Join a Ladder' }))
    expect(screen.queryByRole('textbox', { name: 'New Ladder' })).not.toBeInTheDocument()
    const joinCode = screen.getByRole('textbox', { name: 'Join code' })
    expect(joinCode).toHaveFocus()
    expect(joinCode).toHaveAttribute('maxLength', '6')
    expect(joinCode).toHaveClass('font-mono', 'uppercase', 'placeholder:font-sans')
    expect(screen.getByRole('button', { name: 'Close join a Ladder' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Ladder' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Ladder' }))
    expect(screen.queryByRole('textbox', { name: 'Join code' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'New Ladder' })).toHaveFocus()
  })

  it('stays idle until the Join code is valid, then shows the Ladder', async () => {
    let resolvePreview: (value: LadderPreview) => void = () => {}
    mocks.preview.mockImplementation(
      () =>
        new Promise<LadderPreview>((resolve) => {
          resolvePreview = resolve
        }),
    )
    const { user, input } = await openJoinForm()

    await user.type(input, 'ABC120')
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(screen.queryByText('Checking…')).not.toBeInTheDocument()
    expect(mocks.preview).not.toHaveBeenCalled()

    await user.clear(input)
    await user.type(input, 'fp7k2q')
    expect(await screen.findByText('Checking…')).toBeInTheDocument()
    await waitFor(() => expect(mocks.preview).toHaveBeenCalledWith('FP7K2Q'))

    await act(async () => {
      resolvePreview(preview)
    })

    expect(await screen.findByText('Friday pool · pool · 3 Ladder members')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument()
    expect(mocks.preview).toHaveBeenCalledWith('FP7K2Q')
  })

  it('says when a Join code matches no Ladder', async () => {
    mocks.preview.mockRejectedValue(new Error('No Ladder matches this Share link'))
    const { user, input } = await openJoinForm()

    await user.type(input, 'ZZZZZ9')

    expect(await screen.findByText("That code doesn't match a Ladder.")).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Join' })).not.toBeInTheDocument()
  })

  it('says when the lookup fails', async () => {
    mocks.preview.mockRejectedValue(new Error('network down'))
    const { user, input } = await openJoinForm()

    await user.type(input, 'FP7K2Q')

    expect(await screen.findByText("Couldn't check that code. Try again.")).toBeInTheDocument()
  })

  it('joins from the preview and opens that Ladder', async () => {
    let resolveJoin: (value: { outcome: 'joined' }) => void = () => {}
    mocks.join.mockImplementation(
      () =>
        new Promise<{ outcome: 'joined' }>((resolve) => {
          resolveJoin = resolve
        }),
    )
    const { user, input, router, queryClient } = await openJoinForm()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.type(input, 'fp7k2q')
    await user.click(await screen.findByRole('button', { name: 'Join' }))

    const pending = screen.getByRole('button', { name: 'Joining…' })
    expect(pending.querySelector('.animate-spin')).toBeTruthy()
    expect(mocks.join).toHaveBeenCalledWith('FP7K2Q')

    await act(async () => {
      resolveJoin({ outcome: 'joined' })
    })

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/ladders/ladder-9')
    })
    expect(router.state.location.search).toMatchObject({ tab: 'leaderboard' })
    expect(mocks.fetchId).toHaveBeenCalledWith('FP7K2Q')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['my-ladders'] })
  })

  it('shows a Removed Ladder member the refusal inline', async () => {
    const { toast } = await import('sonner')
    mocks.join.mockRejectedValue(
      new Error('A Removed Ladder member cannot rejoin from the Share link'),
    )
    const { user, input, router } = await openJoinForm()

    await user.type(input, 'FP7K2Q')
    await user.click(await screen.findByRole('button', { name: 'Join' }))

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('A Removed Ladder member cannot rejoin from the Share link')
    expect(toast.error).toHaveBeenCalledWith(
      'A Removed Ladder member cannot rejoin from the Share link',
      { id: 'join-ladder', duration: Infinity },
    )
    expect(router.state.location.pathname).toBe('/')
  })
})
