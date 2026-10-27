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
import type { LadderMemberRead, LadderSummary } from '@/data/ladder'
import type { MatchRead } from '@/data/match'
import { AuthContext, type AuthState } from '@/features/auth/authContext'
import {
  demoteToPlayerConfirm,
  leaveLadderConfirm,
  rejectMatchConfirm,
  removeMemberConfirm,
  voidMatchConfirm,
} from '@/lib/confirmAction'
import { routeTree } from '@/routeTree.gen'

const mocks = vi.hoisted(() => ({
  leaveLadder: vi.fn((ladderId: string) => Promise.resolve(ladderId)),
  removeLadderMember: vi.fn((memberId: string) => Promise.resolve(memberId)),
  setLadderMemberRole: vi.fn((memberId: string, role: 'admin' | 'player') =>
    Promise.resolve({ memberId, role }),
  ),
  voidMatch: vi.fn((matchId: string) => Promise.resolve(matchId)),
  rejectMatch: vi.fn((matchId: string) => Promise.resolve(matchId)),
  confirmMatch: vi.fn((matchId: string) => Promise.resolve(matchId)),
  members: [
    member('m1', 'Sam', 'active', 'user-1', 'admin'),
    member('m2', 'Alex', 'active', 'user-2', 'player'),
  ] as LadderMemberRead[],
  matches: [match('match-pending', 'pending'), match('match-confirmed', 'confirmed')] as MatchRead[],
  waiting: [] as MatchRead[],
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
    voidedBy: null,
    voidedAt: null,
    voidKind: null,
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
    fetchLadder: () =>
      Promise.resolve({
        id: 'ladder-1',
        name: 'Friday pool',
        gameName: 'Pool',
        joinPolicy: 'open',
      } satisfies LadderSummary),
    fetchShareToken: () => Promise.resolve('share-token'),
    listMyLadders: () => Promise.resolve([]),
    listLeaderboard: () => Promise.resolve([]),
    listInactiveMembers: () => Promise.resolve([]),
    listLadderMembers: () => Promise.resolve(mocks.members),
    listRoster: () => Promise.resolve([]),
    leaveLadder: (ladderId: string) => mocks.leaveLadder(ladderId),
    removeLadderMember: (memberId: string) => mocks.removeLadderMember(memberId),
    setLadderMemberRole: (memberId: string, role: 'admin' | 'player') =>
      mocks.setLadderMemberRole(memberId, role),
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
    listMatchesWaitingForMe: () => Promise.resolve(mocks.waiting),
    voidMatch: (matchId: string) => mocks.voidMatch(matchId),
    rejectMatch: (matchId: string) => mocks.rejectMatch(matchId),
    confirmMatch: (matchId: string) => mocks.confirmMatch(matchId),
  }
})

const session = { user: { id: 'user-1' } } as Session
const confirm = vi.spyOn(window, 'confirm')

beforeAll(() => {
  window.scrollTo = () => {}
})

afterEach(async () => {
  cleanup()
  confirm.mockReset()
  mocks.leaveLadder.mockClear()
  mocks.removeLadderMember.mockClear()
  mocks.setLadderMemberRole.mockClear()
  mocks.voidMatch.mockClear()
  mocks.rejectMatch.mockClear()
  mocks.confirmMatch.mockClear()
  mocks.waiting = []
  const { toast } = await import('sonner')
  vi.mocked(toast.success).mockClear()
  vi.mocked(toast.error).mockClear()
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

  return { router, Frame }
}

async function openApp(path: string) {
  const { router, Frame } = renderAt(path)
  await act(async () => {
    await router.load()
  })
  await act(async () => {
    render(<Frame />)
  })
}

async function rowOf(name: string) {
  const row = (await screen.findByRole('button', { name })).closest('li')
  if (!row) throw new Error(`No row for ${name}`)
  return row
}

describe('confirm impactful actions', () => {
  it('asks before leaving a Ladder and skips the action when cancelled', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/ladders/ladder-1?tab=members')
    const leave = await screen.findByRole('button', { name: 'Leave Ladder' })

    confirm.mockReturnValue(false)
    await user.click(leave)
    expect(confirm).toHaveBeenCalledWith(leaveLadderConfirm())
    expect(mocks.leaveLadder).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(leave)
    await waitFor(() => {
      expect(mocks.leaveLadder).toHaveBeenCalledWith('ladder-1')
    })
  })

  it('names the Ladder member when Removing them', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/ladders/ladder-1?tab=members')
    const remove = await within(await rowOf('Alex')).findByRole('button', { name: 'Remove' })

    confirm.mockReturnValue(false)
    await user.click(remove)
    expect(confirm).toHaveBeenCalledWith(removeMemberConfirm('Alex'))
    expect(mocks.removeLadderMember).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(remove)
    await waitFor(() => {
      expect(mocks.removeLadderMember).toHaveBeenCalledWith('m2')
    })
  })

  it('names the Ladder member when demoting them to Player', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/ladders/ladder-1?tab=members')
    const demote = await within(await rowOf('Sam')).findByRole('button', { name: 'Demote to Player' })

    confirm.mockReturnValue(false)
    await user.click(demote)
    expect(confirm).toHaveBeenCalledWith(demoteToPlayerConfirm('Sam'))
    expect(mocks.setLadderMemberRole).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(demote)
    await waitFor(() => {
      expect(mocks.setLadderMemberRole).toHaveBeenCalledWith('m1', 'player')
    })
  })

  it('asks before voiding a Pending Match and a Confirmed Match', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    await openApp('/ladders/ladder-1?tab=matches')

    const voidButtons = await screen.findAllByRole('button', { name: 'Void' })
    const pending = voidButtons[0]
    const confirmed = voidButtons[1]
    if (!pending || !confirmed) throw new Error('Missing Void controls')
    confirm.mockReturnValue(false)
    await user.click(pending)
    expect(confirm).toHaveBeenCalledWith(voidMatchConfirm('pending'))
    expect(mocks.voidMatch).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(pending)
    await waitFor(() => {
      expect(mocks.voidMatch).toHaveBeenCalledWith('match-pending')
    })

    confirm.mockReturnValue(false)
    await user.click(confirmed)
    expect(confirm).toHaveBeenCalledWith(voidMatchConfirm('confirmed'))
    expect(mocks.voidMatch).toHaveBeenCalledTimes(1)

    confirm.mockReturnValue(true)
    await user.click(confirmed)
    await waitFor(() => {
      expect(mocks.voidMatch).toHaveBeenCalledWith('match-confirmed')
    })
  })

  it('asks before Rejecting a Match and skips the action when cancelled', async () => {
    const user = userEvent.setup()
    const { toast } = await import('sonner')
    mocks.waiting = [match('match-waiting', 'pending')]
    await openApp('/ladders/ladder-1')
    const reject = await screen.findByRole('button', { name: 'Reject' })

    confirm.mockReturnValue(false)
    await user.click(reject)
    expect(confirm).toHaveBeenCalledWith(rejectMatchConfirm())
    expect(mocks.rejectMatch).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await user.click(reject)
    await waitFor(() => {
      expect(mocks.rejectMatch).toHaveBeenCalledWith('match-waiting')
    })
  })
})
