import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRouter,
} from '@tanstack/react-router'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/data/auth'
import type { InactiveMember, LadderMemberRead, LadderSummary, LeaderboardEntry } from '@/data/ladder'
import type { MatchRead } from '@/data/match'
import { AuthContext, type AuthState } from '@/features/auth/authContext'
import { routeTree } from '@/routeTree.gen'

const mocks = vi.hoisted(() => ({
  ladder: {
    id: 'ladder-1',
    name: 'Friday pool',
    gameName: 'Pool',
    joinPolicy: 'open' as const,
  } satisfies LadderSummary,
  shareError: false,
  blockLeaderboard: false,
  leaderboardError: false,
  blockInactive: false,
  leaderboard: [
    { ladderMemberId: '00000000-0000-4000-8000-000000000001', displayName: 'Sam', rating: 1200, rank: 1, provisional: false },
    { ladderMemberId: '00000000-0000-4000-8000-000000000002', displayName: 'Alex', rating: 1100, rank: 2, provisional: true },
  ] as LeaderboardEntry[],
  inactive: [] as InactiveMember[],
  members: [
    member('00000000-0000-4000-8000-000000000001', 'Sam', 'active', 'user-1', 'admin'),
    member('00000000-0000-4000-8000-000000000002', 'Alex', 'active', 'user-2', 'player'),
    member('00000000-0000-4000-8000-000000000003', 'Jordan', 'active', 'user-3', 'player'),
    member('00000000-0000-4000-8000-000000000004', 'Casey', 'active', null, 'player'),
    member('00000000-0000-4000-8000-000000000005', 'Riley', 'left', 'user-5', 'player'),
    member('00000000-0000-4000-8000-000000000006', 'Morgan', 'removed', 'user-6', 'player'),
  ] as LadderMemberRead[],
  matches: [
    match('match-pending', 'pending'),
    match('match-confirmed', 'confirmed'),
    match('match-voided', 'voided'),
  ] as MatchRead[],
}))

function member(
  id: string,
  displayName: string,
  status: LadderMemberRead['status'],
  userId: string | null,
  role: LadderMemberRead['role'],
): LadderMemberRead {
  return {
    id,
    userId,
    displayName,
    role,
    status,
    rating: 1000,
    ratedMatchCount: 1,
    lastMatchAt: null,
  }
}

function match(id: string, status: MatchRead['status']): MatchRead {
  return {
    id,
    status,
    result: 'side_a_won',
    notes: null,
    recordedBy: 'user-1',
    recordedAt: '2026-01-01T00:00:00Z',
    confirmedAt: status === 'confirmed' ? '2026-01-02T00:00:00Z' : null,
    voidedBy: status === 'voided' ? 'user-1' : null,
    voidedAt: status === 'voided' ? '2026-01-03T00:00:00Z' : null,
    voidKind: status === 'voided' ? 'admin' : null,
    participants: [
      {
        ladderMemberId: 'm1',
        userId: 'user-1',
        displayName: 'Sam',
        side: 'a',
        ratingBefore: null,
        ratingChange: null,
      },
      {
        ladderMemberId: 'm2',
        userId: 'user-2',
        displayName: 'Alex',
        side: 'b',
        ratingBefore: null,
        ratingChange: null,
      },
    ],
  }
}

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}))

vi.mock('@/data/ladder', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/ladder')>()
  return {
    ...actual,
    fetchLadder: () => Promise.resolve(mocks.ladder),
    fetchShareToken: () =>
      mocks.shareError
        ? Promise.reject(new Error('This Ladder has no Share link'))
        : Promise.resolve('share-token'),
    listMyLadders: () => Promise.resolve([]),
    listLeaderboard: () => {
      if (mocks.leaderboardError) return Promise.reject(new Error('Could not load the Leaderboard'))
      if (mocks.blockLeaderboard) return new Promise(() => {})
      return Promise.resolve(mocks.leaderboard)
    },
    listInactiveMembers: () => {
      if (mocks.blockInactive) return new Promise(() => {})
      return Promise.resolve(mocks.inactive)
    },
    listLadderMembers: () => Promise.resolve(mocks.members),
    listRoster: () => Promise.resolve([]),
    fetchLadderMember: () => Promise.resolve(null),
    fetchLadderMemberRecord: () =>
      Promise.resolve({
        wins: 0,
        losses: 0,
        draws: 0,
        form: [],
        streakResult: null,
        streakLength: 0,
        peakRating: null,
        peakAt: null,
      }),
  }
})

vi.mock('@/data/match', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/match')>()
  return {
    ...actual,
    listMatches: () => Promise.resolve(mocks.matches),
    listMatchesPage: () =>
      Promise.resolve({ matches: mocks.matches, total: mocks.matches.length }),
    countMatches: () => Promise.resolve(mocks.matches.length),
    listMatchesWaitingForMe: () => Promise.resolve([]),
  }
})

const session = { user: { id: 'user-1' } } as Session

const initialLadder: LadderSummary = {
  id: 'ladder-1',
  name: 'Friday pool',
  gameName: 'Pool',
  joinPolicy: 'open',
}

beforeAll(() => {
  window.scrollTo = () => {}
})

afterEach(async () => {
  cleanup()
  const { toast } = await import('sonner')
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
  mocks.ladder = { ...initialLadder }
  mocks.shareError = false
  mocks.blockLeaderboard = false
  mocks.leaderboardError = false
  mocks.blockInactive = false
  mocks.leaderboard = [
    { ladderMemberId: '00000000-0000-4000-8000-000000000001', displayName: 'Sam', rating: 1200, rank: 1, provisional: false },
    { ladderMemberId: '00000000-0000-4000-8000-000000000002', displayName: 'Alex', rating: 1100, rank: 2, provisional: true },
  ]
  mocks.inactive = []
  mocks.members = [
    member('00000000-0000-4000-8000-000000000001', 'Sam', 'active', 'user-1', 'admin'),
    member('00000000-0000-4000-8000-000000000002', 'Alex', 'active', 'user-2', 'player'),
    member('00000000-0000-4000-8000-000000000003', 'Jordan', 'active', 'user-3', 'player'),
    member('00000000-0000-4000-8000-000000000004', 'Casey', 'active', null, 'player'),
    member('00000000-0000-4000-8000-000000000005', 'Riley', 'left', 'user-5', 'player'),
    member('00000000-0000-4000-8000-000000000006', 'Morgan', 'removed', 'user-6', 'player'),
  ]
  mocks.matches = [
    match('match-pending', 'pending'),
    match('match-confirmed', 'confirmed'),
    match('match-voided', 'voided'),
  ]
})

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const auth: AuthState = {
    session,
    profile: { id: 'user-1', displayName: 'Sam', isSuperAdmin: false, defaultLadderId: null },
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

async function openApp(path: string) {
  const { router, queryClient, Frame } = renderAt(path)
  await act(async () => {
    await router.load()
  })
  await act(async () => {
    render(<Frame />)
  })
  return { router, queryClient }
}

describe('Ladder page', () => {
  it('shows Ladders, the Game name and Invite as text controls, and Invite opens the Join code card', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/ladders/ladder-1')

    const main = screen.getByRole('main')
    const heading = await screen.findByRole('heading', { level: 1, name: 'Friday pool' })
    const ladders = within(main).getByRole('button', { name: 'Ladders' })
    const game = within(main).getByText('Pool')
    const invite = await within(main).findByRole('button', { name: 'Invite' })
    expect(ladders).toHaveClass('text-base', 'underline', 'hover:text-ink')
    expect(ladders.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(ladders.parentElement).toHaveClass('flex-nowrap')
    expect(game.parentElement).toHaveClass('text-base')
    expect(game.parentElement).not.toHaveClass('underline')
    expect(game.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(invite).toHaveClass('text-base', 'underline', 'hover:text-ink')
    expect(within(main).queryByRole('button', { name: 'Link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Share link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy Share link' })).not.toBeInTheDocument()
    expect(main).toHaveClass(
      'pt-5',
      'pb-[calc(5.5rem+env(safe-area-inset-bottom))]',
    )
    expect(main).not.toHaveClass('py-10')
    expect(heading).toHaveClass('break-words')

    const row = ladders.parentElement
    if (!row) throw new Error('Ladders row not found')
    const separators = [...row.querySelectorAll('[aria-hidden]')].filter(
      (node) => node.textContent === '·',
    )
    expect(separators).toHaveLength(2)

    await user.click(invite)
    expect(toast.success).not.toHaveBeenCalled()
    const code = screen.getByLabelText('Join code share-token')
    expect(code).toHaveTextContent('share-token')
    expect(code).toHaveClass('font-mono', 'tracking-[0.2em]')
    expect(screen.getByText('Share this code so colleagues can join.')).toBeInTheDocument()
    expect(code.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()

    await user.click(screen.getByRole('button', { name: 'Copy Join code' }))
    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe('share-token')
    })
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy link' }))
    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(
        `${window.location.origin}/join/share-token`,
      )
      expect(toast.success).toHaveBeenCalledWith('Share link copied')
    })

    await user.click(invite)
    expect(screen.queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument()
  })

  it('hides Invite until the Share link has loaded', async () => {
    mocks.shareError = true
    await openApp('/ladders/ladder-1')

    expect(await screen.findByRole('heading', { name: 'Friday pool' })).toBeInTheDocument()
    expect(screen.getByText('Pool')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument()
  })

  it('opens the drawer from Ladders', async () => {
    const user = userEvent.setup()
    const { router } = await openApp('/ladders/ladder-1')

    await user.click(await within(screen.getByRole('main')).findByRole('button', { name: 'Ladders' }))
    expect(router.state.location.search).toMatchObject({ nav: 'menu' })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('puts Record a Match between Profile and Nav, and opens the panel', async () => {
    const user = userEvent.setup()
    const { router } = await openApp('/ladders/ladder-1')

    const bar = await screen.findByRole('navigation', { name: 'Primary' })
    await within(bar).findByRole('button', { name: 'Record a Match' })
    const controls = [...bar.querySelectorAll('a, button')]
    expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual([
      'Profile',
      'Record a Match',
      'Nav',
    ])
    const record = within(bar).getByRole('button', { name: 'Record a Match' })
    expect(record).toHaveClass('!bg-neutral-200', 'hover:!bg-neutral-300')
    expect(record).not.toHaveClass('!bg-primary')
    expect(within(bar).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('button', { name: 'Record a Match' })).not.toBeInTheDocument()

    await user.click(within(bar).getByRole('button', { name: 'Record a Match' }))
    expect(await screen.findByRole('dialog', { name: 'Record a Match' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ record: 'open' })

    cleanup()
    await openApp('/')
    const homeBar = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(homeBar).queryByRole('button', { name: 'Record a Match' })).not.toBeInTheDocument()
    expect(within(homeBar).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    cleanup()
    await openApp('/ladders/ladder-1?nav=member&member=00000000-0000-4000-8000-000000000001')
    const memberBar = await screen.findByRole('navigation', { name: 'Primary' })
    // Member view is a drawer on the Ladder page, so Record a Match stays on the bar.
    expect(within(memberBar).getByRole('button', { name: 'Record a Match' })).toBeInTheDocument()
    expect(within(memberBar).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('counts Leaderboard entries, every Match, and active Ladder members only', async () => {
    const { queryClient } = await openApp('/ladders/ladder-1')

    const leaderboard = await screen.findByRole('tab', { name: 'Leaderboard, 2' })
    const matches = screen.getByRole('tab', { name: 'Matches, 3' })
    const members = screen.getByRole('tab', { name: 'Ladder members, 4' })
    expect(within(leaderboard).getByText('· 2')).toHaveClass('opacity-60')
    expect(within(matches).getByText('· 3')).toHaveClass('opacity-60')
    expect(within(members).getByText('· 4')).toHaveClass('opacity-60')
    expect(screen.getByRole('tablist', { name: 'Ladder' })).toHaveClass('flex-wrap')

    mocks.leaderboard = mocks.leaderboard.slice(0, 1)
    mocks.matches = mocks.matches.slice(0, 1)
    mocks.members = mocks.members.map((entry) =>
      entry.id === '00000000-0000-4000-8000-000000000004'
        ? { ...entry, status: 'left' }
        : entry,
    )
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['leaderboard', 'ladder-1'] })
      await queryClient.invalidateQueries({ queryKey: ['matches', 'ladder-1'] })
      await queryClient.invalidateQueries({ queryKey: ['ladder-members', 'ladder-1'] })
    })

    expect(await screen.findByRole('tab', { name: 'Leaderboard, 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Matches, 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ladder members, 3' })).toBeInTheDocument()
  })

  it('shows no count while a tab query loads or fails', async () => {
    mocks.blockLeaderboard = true
    mocks.leaderboardError = false
    await openApp('/ladders/ladder-1')

    expect(await screen.findByRole('tab', { name: 'Leaderboard' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Leaderboard,/ })).not.toBeInTheDocument()

    cleanup()
    mocks.blockLeaderboard = false
    mocks.leaderboardError = true
    await openApp('/ladders/ladder-1')

    expect(await screen.findByRole('tab', { name: 'Leaderboard' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /Leaderboard,/ })).not.toBeInTheDocument()
  })

  it('shows medals for the top three Leaderboard ranks and a number from rank 4', async () => {
    mocks.leaderboard = [
      { ladderMemberId: '00000000-0000-4000-8000-000000000001', displayName: 'Sam', rating: 1200, rank: 1, provisional: false },
      { ladderMemberId: '00000000-0000-4000-8000-000000000002', displayName: 'Alex', rating: 1100, rank: 2, provisional: true },
      { ladderMemberId: '00000000-0000-4000-8000-000000000003', displayName: 'Jordan', rating: 1000, rank: 3, provisional: false },
      { ladderMemberId: '00000000-0000-4000-8000-000000000004', displayName: 'Casey', rating: 900, rank: 4, provisional: false },
    ]
    await openApp('/ladders/ladder-1')

    const board = await screen.findByRole('region', { name: 'Leaderboard' })
    const list = await within(board).findByRole('list')
    expect(list).toHaveClass('divide-y', 'divide-neutral-200', 'overflow-hidden', 'rounded-xl', 'bg-white')

    function rowOf(node: HTMLElement) {
      const row = node.closest('li')
      if (!row) throw new Error('Leaderboard row not found')
      return row
    }

    const first = within(board).getByRole('img', { name: 'Rank 1' })
    expect(first).toHaveTextContent('🥇')
    expect(first).toHaveClass('absolute', 'text-[20px]')
    expect(first.parentElement).toHaveClass('h-5', 'w-6', 'self-center')
    expect(rowOf(first)).toHaveClass('bg-amber-100')
    expect(within(rowOf(first)).getByText('1200')).toHaveClass('font-bold')

    const second = within(board).getByRole('img', { name: 'Rank 2' })
    expect(second).toHaveTextContent('🥈')
    const alex = rowOf(second)
    expect(alex).toHaveClass('bg-slate-100')
    expect(within(alex).getByText('Provisional')).toBeInTheDocument()
    expect(within(alex).getByText('1100')).toHaveClass('font-bold')

    const third = within(board).getByRole('img', { name: 'Rank 3' })
    expect(third).toHaveTextContent('🥉')
    expect(rowOf(third)).toHaveClass('bg-orange-100')
    expect(within(rowOf(third)).getByText('1000')).toHaveClass('font-bold')

    const casey = rowOf(within(board).getByRole('button', { name: 'Casey' }))
    expect(casey).toHaveTextContent('4')
    expect(within(casey).queryByRole('img')).not.toBeInTheDocument()
    expect(casey).not.toHaveClass('bg-amber-100', 'bg-slate-100', 'bg-orange-100')
    expect(within(casey).getByText('900')).not.toHaveClass('font-bold')
  })

  it('hides the Inactive section while it loads and when nobody is Inactive', async () => {
    mocks.blockInactive = true
    await openApp('/ladders/ladder-1')

    expect(await screen.findByRole('heading', { name: 'Friday pool' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Inactive' })).not.toBeInTheDocument()
    expect(screen.queryByText('Nobody is Inactive.')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading Inactive…')).not.toBeInTheDocument()

    cleanup()
    mocks.blockInactive = false
    mocks.inactive = []
    await openApp('/ladders/ladder-1')

    expect(await screen.findByRole('heading', { name: 'Friday pool' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'Inactive' })).not.toBeInTheDocument()
    })
    expect(screen.queryByText('Nobody is Inactive.')).not.toBeInTheDocument()
  })

  it('shows the Inactive section when a Ladder member is Inactive', async () => {
    mocks.inactive = [
      {
        ladderMemberId: '00000000-0000-4000-8000-000000000004',
        displayName: 'Casey',
        rating: 1000,
        provisional: false,
        lastActiveAt: '2026-01-01T00:00:00Z',
      },
    ]
    await openApp('/ladders/ladder-1')

    const section = await screen.findByRole('region', { name: 'Inactive' })
    expect(within(section).getByRole('button', { name: 'Casey' })).toBeInTheDocument()
  })

  it('opens the member view from a Leaderboard or Members name and keeps the tab', async () => {
    const user = userEvent.setup()
    const { router } = await openApp('/ladders/ladder-1?tab=leaderboard')

    await user.click(await screen.findByRole('button', { name: 'Sam' }))
    expect(router.state.location.search).toMatchObject({
      tab: 'leaderboard',
      nav: 'member',
      member: '00000000-0000-4000-8000-000000000001',
    })

    cleanup()
    const opened = await openApp('/ladders/ladder-1?tab=members')
    await user.click(await screen.findByRole('button', { name: 'Jordan' }))
    expect(opened.router.state.location.search).toMatchObject({
      tab: 'members',
      nav: 'member',
      member: '00000000-0000-4000-8000-000000000003',
    })
  })
})
