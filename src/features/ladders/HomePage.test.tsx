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
  create: vi.fn(),
  star: vi.fn(),
  ladders: [] as Array<{ id: string; name: string; gameName: string }>,
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/data/ladder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/ladder')>()
  return {
    ...actual,
    listMyLadders: () => Promise.resolve(mocks.ladders),
    previewLadder: (token: string) => mocks.preview(token),
    joinLadder: (token: string, options?: { makeDefault?: boolean }) => mocks.join(token, options),
    fetchLadderIdByShareToken: (token: string) => mocks.fetchId(token),
    createLadder: (name: string, options?: { makeDefault?: boolean }) => mocks.create(name, options),
    setDefaultLadder: (ladderId: string) => mocks.star(ladderId),
    fetchLadder: () =>
      Promise.resolve({
        id: 'ladder-9',
        name: 'Friday pool',
        gameName: 'pool',
        joinPolicy: 'open' as const,
      }),
    fetchShareToken: () => Promise.resolve('FP7K2Q'),
    listLeaderboard: () => Promise.resolve([]),
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
  mocks.ladders = []
  mocks.preview.mockResolvedValue(preview)
  mocks.join.mockResolvedValue({ outcome: 'joined' })
  mocks.fetchId.mockResolvedValue('ladder-9')
  mocks.create.mockResolvedValue({ id: 'ladder-new' })
  mocks.star.mockResolvedValue(undefined)
})

afterEach(async () => {
  cleanup()
  mocks.preview.mockReset()
  mocks.join.mockReset()
  mocks.fetchId.mockReset()
  mocks.create.mockReset()
  mocks.star.mockReset()
  mocks.ladders = []
  const { toast } = await import('sonner')
  vi.mocked(toast.error).mockClear()
})

function renderAt(
  path: string,
  options?: { defaultLadderId?: string | null },
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const auth: AuthState = {
    session,
    profile: {
      id: 'user-1',
      displayName: 'Sam',
      isSuperAdmin: false,
      defaultLadderId: options?.defaultLadderId ?? null,
    },
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

async function openHome(path = '/', options?: { defaultLadderId?: string | null }) {
  const { router, queryClient, Frame } = renderAt(path, options)
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
  await user.click(await screen.findByRole('button', { name: /Join (a Ladder|with a code)/ }))
  const input = screen.getByRole('textbox', { name: 'Join code' })
  return { user, input, ...opened }
}

describe('Home Ladders', () => {
  it('hides heading actions with no Ladders, then keeps only one form open', async () => {
    const user = userEvent.setup()
    await openHome()

    const emptyHeading = screen.getByRole('heading', { level: 2, name: 'Leaderboards' })
    const emptyRow = emptyHeading.parentElement
    if (!emptyRow) throw new Error('Heading row not found')
    expect(await screen.findByRole('button', { name: 'Join with a code' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New Ladder' })).toBeInTheDocument()
    expect(within(emptyRow).queryByRole('button')).not.toBeInTheDocument()

    cleanup()
    mocks.ladders = [{ id: 'l1', name: 'Friday pool', gameName: 'pool' }]
    await openHome()

    expect(await screen.findByRole('button', { name: 'Join a Ladder' })).toBeInTheDocument()
    const heading = screen.getByRole('heading', { level: 2, name: 'Leaderboards' })
    const row = heading.parentElement
    if (!row) throw new Error('Heading row not found')
    expect(within(row).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual([
      'Join a Ladder',
      'New Ladder',
    ])

    await user.click(within(row).getByRole('button', { name: 'New Ladder' }))
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
    expect(mocks.join).toHaveBeenCalledWith('FP7K2Q', { makeDefault: false })

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

  it('replaces / with the Default Ladder Leaderboard', async () => {
    const { router } = await openHome('/', { defaultLadderId: 'ladder-9' })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/ladders/ladder-9')
    })
    expect(router.state.location.search).toMatchObject({ tab: 'leaderboard' })
    const length = router.history.length
    await act(async () => {
      router.history.back()
    })
    expect(router.state.location.pathname).toBe('/ladders/ladder-9')
    expect(router.history.length).toBe(length)
  })

  it('follows a redirect search param ahead of the Default Ladder', async () => {
    const { router } = await openHome('/?redirect=/join/FP7K2Q', {
      defaultLadderId: 'ladder-9',
    })
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/join/FP7K2Q')
    })
  })

  it('shows the welcome and opens each form from its button', async () => {
    const user = userEvent.setup()
    await openHome()

    const main = screen.getByRole('main')
    expect(
      await within(main).findByText('Join a Ladder with a code from a friend, or start your own.'),
    ).toBeInTheDocument()
    expect(within(main).queryByText('No Ladders yet.')).not.toBeInTheDocument()

    await user.click(within(main).getByRole('button', { name: 'Join with a code' }))
    expect(within(main).getByRole('textbox', { name: 'Join code' })).toHaveFocus()
    expect(
      within(main).queryByText('Join a Ladder with a code from a friend, or start your own.'),
    ).not.toBeInTheDocument()

    await user.click(within(main).getByRole('button', { name: 'Close join a Ladder' }))
    const welcomeNew = within(main)
      .getAllByRole('button', { name: 'New Ladder' })
      .find((button) => button.textContent?.includes('New Ladder'))
    if (!welcomeNew) throw new Error('Welcome New Ladder button missing')
    await user.click(welcomeNew)
    expect(within(main).getByRole('textbox', { name: 'New Ladder' })).toHaveFocus()
    expect(
      within(main).queryByText('Join a Ladder with a code from a friend, or start your own.'),
    ).not.toBeInTheDocument()
  })

  it('shows the star hint only with two or more Ladders and no Default Ladder', async () => {
    mocks.ladders = [
      { id: 'l1', name: 'Friday pool', gameName: 'pool' },
      { id: 'l2', name: 'Chess night', gameName: 'Chess' },
    ]
    await openHome()
    const main = screen.getByRole('main')
    expect(
      await within(main).findByText('Star a Ladder to open it when you sign in.'),
    ).toBeInTheDocument()

    cleanup()
    mocks.ladders = [{ id: 'l1', name: 'Friday pool', gameName: 'pool' }]
    await openHome()
    const single = screen.getByRole('main')
    expect(await within(single).findByText('Friday pool')).toBeInTheDocument()
    expect(
      within(single).queryByText('Star a Ladder to open it when you sign in.'),
    ).not.toBeInTheDocument()
  })

  it('stars a Ladder, and a filled star cannot be cleared', async () => {
    mocks.ladders = [
      { id: 'ladder-9', name: 'Friday pool', gameName: 'pool' },
      { id: 'l2', name: 'Chess night', gameName: 'Chess' },
    ]
    let resolveStar: () => void = () => {}
    mocks.star.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveStar = resolve
        }),
    )
    const user = userEvent.setup()
    const { router } = await openHome('/ladders/ladder-9', { defaultLadderId: 'ladder-9' })

    await user.click(await screen.findByRole('button', { name: 'Nav' }))
    const menu = await screen.findByRole('dialog')
    const filled = within(menu).getByRole('button', {
      name: 'Friday pool is your Default Ladder',
    })
    expect(filled).toHaveAttribute('aria-pressed', 'true')
    expect(within(menu).getByText('Friday pool')).toHaveClass('min-w-0', 'truncate')
    await user.click(filled)
    expect(mocks.star).not.toHaveBeenCalled()

    const chess = within(menu).getByRole('button', { name: 'Make Chess night your Default Ladder' })
    await user.click(chess)
    expect(chess.querySelector('.animate-spin')).toBeTruthy()
    expect(mocks.star).toHaveBeenCalledWith('l2')
    await act(async () => {
      resolveStar()
    })

    await user.click(within(menu).getByRole('link', { name: /Chess night/ }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/ladders/l2')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.search).not.toHaveProperty('nav')
  })

  it('joins and creates from the drawer, then opens that Ladder', async () => {
    mocks.ladders = [{ id: 'l1', name: 'Friday pool', gameName: 'pool' }]
    const user = userEvent.setup()
    const { router } = await openHome('/ladders/ladder-9')

    await user.click(await screen.findByRole('button', { name: 'Nav' }))
    const menu = await screen.findByRole('dialog')
    await user.click(within(menu).getByRole('button', { name: 'Join a Ladder' }))
    const input = within(menu).getByRole('textbox', { name: 'Join code' })
    expect(input).toHaveFocus()
    await user.type(input, 'fp7k2q')
    await user.click(await within(menu).findByRole('button', { name: 'Join' }))
    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/ladders/ladder-9')
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    cleanup()
    const again = userEvent.setup()
    const reopened = await openHome('/ladders/ladder-9')
    await again.click(await screen.findByRole('button', { name: 'Nav' }))
    const drawer = await screen.findByRole('dialog')
    await again.click(within(drawer).getByRole('button', { name: 'New Ladder' }))
    expect(within(drawer).getByRole('textbox', { name: 'New Ladder' })).toHaveFocus()
    await again.type(within(drawer).getByRole('textbox', { name: 'New Ladder' }), 'Sunday')
    await again.click(within(drawer).getByRole('button', { name: 'Create Ladder' }))
    await waitFor(() => {
      expect(reopened.router.state.location.pathname).toBe('/ladders/ladder-new')
    })
    expect(mocks.create).toHaveBeenCalledWith('Sunday', { makeDefault: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the Default Ladder checkbox only once the User has a Ladder, and passes its value', async () => {
    const user = userEvent.setup()
    await openHome()
    await user.click(await screen.findByRole('button', { name: 'New Ladder' }))
    expect(
      screen.queryByRole('checkbox', { name: 'Make this my Default Ladder' }),
    ).not.toBeInTheDocument()

    cleanup()
    mocks.ladders = [{ id: 'l1', name: 'Friday pool', gameName: 'pool' }]
    await openHome()
    const withLadder = screen.getByRole('heading', { level: 2, name: 'Leaderboards' }).parentElement
    if (!withLadder) throw new Error('Heading row not found')
    await user.click(await within(withLadder).findByRole('button', { name: 'New Ladder' }))
    const box = screen.getByRole('checkbox', { name: 'Make this my Default Ladder' })
    expect(box).not.toBeChecked()
    expect(box.closest('label')).toHaveClass('min-h-11', 'text-sm', 'text-neutral-800')
    await user.type(screen.getByRole('textbox', { name: 'New Ladder' }), 'Saturday')
    await user.click(screen.getByRole('button', { name: 'Create Ladder' }))
    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith('Saturday', { makeDefault: false })
    })

    cleanup()
    mocks.create.mockResolvedValue({ id: 'ladder-new' })
    await openHome()
    const checkedRow = screen.getByRole('heading', { level: 2, name: 'Leaderboards' }).parentElement
    if (!checkedRow) throw new Error('Heading row not found')
    await user.click(await within(checkedRow).findByRole('button', { name: 'New Ladder' }))
    await user.click(screen.getByRole('checkbox', { name: 'Make this my Default Ladder' }))
    await user.type(screen.getByRole('textbox', { name: 'New Ladder' }), 'Sunday')
    await user.click(screen.getByRole('button', { name: 'Create Ladder' }))
    await waitFor(() => {
      expect(mocks.create).toHaveBeenCalledWith('Sunday', { makeDefault: true })
    })
  })

  it('passes the checkbox value when joining', async () => {
    mocks.ladders = [{ id: 'l1', name: 'Friday pool', gameName: 'pool' }]
    const { user, input } = await openJoinForm()
    await user.click(screen.getByRole('checkbox', { name: 'Make this my Default Ladder' }))
    await user.type(input, 'fp7k2q')
    await user.click(await screen.findByRole('button', { name: 'Join' }))
    await waitFor(() => {
      expect(mocks.join).toHaveBeenCalledWith('FP7K2Q', { makeDefault: true })
    })
  })

  it('passes the checkbox from the Share link preview', async () => {
    mocks.ladders = [{ id: 'l1', name: 'Friday pool', gameName: 'pool' }]
    const user = userEvent.setup()
    await openHome('/join/FP7K2Q')
    await user.click(await screen.findByRole('checkbox', { name: 'Make this my Default Ladder' }))
    await user.click(screen.getByRole('button', { name: 'Join' }))
    await waitFor(() => {
      expect(mocks.join).toHaveBeenCalledWith('FP7K2Q', { makeDefault: true })
    })
  })

  it('hides the Share link checkbox when the User has no Ladders', async () => {
    await openHome('/join/FP7K2Q')
    expect(await screen.findByRole('button', { name: 'Join' })).toBeInTheDocument()
    expect(
      screen.queryByRole('checkbox', { name: 'Make this my Default Ladder' }),
    ).not.toBeInTheDocument()
  })

  it('keeps a toast when starring fails', async () => {
    const { toast } = await import('sonner')
    mocks.ladders = [
      { id: 'l1', name: 'Friday pool', gameName: 'pool' },
      { id: 'l2', name: 'Chess night', gameName: 'Chess' },
    ]
    mocks.star.mockRejectedValue(new Error('Could not choose a Default Ladder.'))
    const user = userEvent.setup()
    await openHome()
    await user.click(
      await screen.findByRole('button', { name: 'Make Friday pool your Default Ladder' }),
    )
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not choose a Default Ladder.', {
        id: 'default-ladder',
        duration: Infinity,
      })
    })
  })
})
