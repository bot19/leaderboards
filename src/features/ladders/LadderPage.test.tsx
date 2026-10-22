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
    { ladderMemberId: 'm1', displayName: 'Sam', rating: 1200, rank: 1, provisional: false },
    { ladderMemberId: 'm2', displayName: 'Alex', rating: 1100, rank: 2, provisional: true },
  ] as LeaderboardEntry[],
  inactive: [] as InactiveMember[],
  members: [
    member('m1', 'Sam', 'active', 'user-1', 'admin'),
    member('m2', 'Alex', 'active', 'user-2', 'player'),
    member('m3', 'Jordan', 'active', 'user-3', 'player'),
    member('m4', 'Casey', 'active', null, 'player'),
    member('m5', 'Riley', 'left', 'user-5', 'player'),
    member('m6', 'Morgan', 'removed', 'user-6', 'player'),
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
    listRatingHistory: () => Promise.resolve([]),
  }
})

vi.mock('@/data/match', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/match')>()
  return {
    ...actual,
    listMatches: () => Promise.resolve(mocks.matches),
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
    { ladderMemberId: 'm1', displayName: 'Sam', rating: 1200, rank: 1, provisional: false },
    { ladderMemberId: 'm2', displayName: 'Alex', rating: 1100, rank: 2, provisional: true },
  ]
  mocks.inactive = []
  mocks.members = [
    member('m1', 'Sam', 'active', 'user-1', 'admin'),
    member('m2', 'Alex', 'active', 'user-2', 'player'),
    member('m3', 'Jordan', 'active', 'user-3', 'player'),
    member('m4', 'Casey', 'active', null, 'player'),
    member('m5', 'Riley', 'left', 'user-5', 'player'),
    member('m6', 'Morgan', 'removed', 'user-6', 'player'),
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
  it('shows Home, the Game name and Invite as text links, and Invite copies the Share link', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/ladders/ladder-1')

    const main = screen.getByRole('main')
    const heading = await screen.findByRole('heading', { level: 1, name: 'Friday pool' })
    const back = within(main).getByRole('link', { name: 'Home' })
    const game = within(main).getByText('Pool')
    const copy = await within(main).findByRole('button', { name: 'Invite' })
    expect(back).toHaveAttribute('href', '/')
    expect(back).toHaveClass('text-base', 'underline', 'hover:text-ink')
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(back.parentElement).toHaveClass('flex-nowrap')
    expect(game.parentElement).toHaveClass('text-base')
    expect(game.parentElement).not.toHaveClass('underline')
    expect(game.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(copy).toHaveClass('text-base', 'underline', 'hover:text-ink')
    expect(within(main).queryByRole('button', { name: 'Link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Share link' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Copy Share link' })).not.toBeInTheDocument()
    expect(main).toHaveClass('pt-5', 'pb-10')
    expect(main).not.toHaveClass('py-10')
    expect(heading).toHaveClass('break-words')

    const row = back.parentElement
    const separators = [...(row?.querySelectorAll('[aria-hidden]') ?? [])].filter(
      (node) => node.textContent === '·',
    )
    expect(separators).toHaveLength(2)

    await user.click(copy)
    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(
        `${window.location.origin}/join/share-token`,
      )
      expect(toast.success).toHaveBeenCalledWith('Share link copied')
    })
  })

  it('hides Invite until the Share link has loaded', async () => {
    mocks.shareError = true
    await openApp('/ladders/ladder-1')

    expect(await screen.findByRole('heading', { name: 'Friday pool' })).toBeInTheDocument()
    expect(screen.getByText('Pool')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Invite' })).not.toBeInTheDocument()
  })

  it('puts Record a Match under the avatar, then Home, then Nav, and opens the panel', async () => {
    const user = userEvent.setup()
    const { router } = await openApp('/ladders/ladder-1')

    const rail = await screen.findByRole('navigation', { name: 'Side menu' })
    await within(rail).findByRole('button', { name: 'Record a Match' })
    const controls = [...rail.querySelectorAll('a, button')]
    expect(controls.map((control) => control.getAttribute('aria-label'))).toEqual([
      'Profile',
      'Record a Match',
      'Home',
      'Nav',
    ])
    const record = within(rail).getByRole('button', { name: 'Record a Match' })
    expect(record).toHaveClass('!bg-neutral-200', 'hover:!bg-neutral-300')
    expect(record).not.toHaveClass('!bg-primary')
    expect(within(rail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(screen.getByRole('main')).queryByRole('button', { name: 'Record a Match' })).not.toBeInTheDocument()

    await user.click(within(rail).getByRole('button', { name: 'Record a Match' }))
    expect(await screen.findByRole('dialog', { name: 'Record a Match' })).toBeInTheDocument()
    expect(router.state.location.search).toMatchObject({ record: 'open' })

    cleanup()
    await openApp('/')
    const homeRail = screen.getByRole('navigation', { name: 'Side menu' })
    expect(within(homeRail).queryByRole('button', { name: 'Record a Match' })).not.toBeInTheDocument()
    expect(within(homeRail).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    cleanup()
    await openApp('/ladders/ladder-1/members/m1')
    const memberRail = await screen.findByRole('navigation', { name: 'Side menu' })
    expect(within(memberRail).queryByRole('button', { name: 'Record a Match' })).not.toBeInTheDocument()
    expect(within(memberRail).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
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
      entry.id === 'm4' ? { ...entry, status: 'left' } : entry,
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
        ladderMemberId: 'm4',
        displayName: 'Casey',
        rating: 1000,
        provisional: false,
        lastActiveAt: '2026-01-01T00:00:00Z',
      },
    ]
    await openApp('/ladders/ladder-1')

    const section = await screen.findByRole('region', { name: 'Inactive' })
    expect(within(section).getByRole('link', { name: 'Casey' })).toBeInTheDocument()
  })
})
