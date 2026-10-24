import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/data/auth'
import type { MatchRead } from '@/data/match'
import { AuthContext, type AuthState } from '@/features/auth/authContext'
import { MatchHistory } from './MatchHistory'

const mocks = vi.hoisted(() => {
  const state: {
    calls: { offset: number; limit: number }[]
    resolvePage: (offset: number) => Promise<{ matches: MatchRead[]; total: number }>
  } = {
    calls: [],
    resolvePage: () => Promise.resolve({ matches: [], total: 0 }),
  }
  return state
})

function sampleMatch(id: string): MatchRead {
  return {
    id,
    status: 'confirmed',
    result: 'side_a_won',
    notes: null,
    recordedBy: 'user-1',
    recordedAt: '2026-08-01T12:00:00.000Z',
    confirmedAt: '2026-08-01T12:00:00.000Z',
    voidedBy: null,
    voidedAt: null,
    voidKind: null,
    participants: [
      {
        ladderMemberId: `${id}-a`,
        userId: 'user-1',
        displayName: 'Sam',
        side: 'a',
        ratingBefore: 1000,
        ratingChange: 8,
      },
      {
        ladderMemberId: `${id}-b`,
        userId: 'user-2',
        displayName: 'Alex',
        side: 'b',
        ratingBefore: 1000,
        ratingChange: -8,
      },
    ],
  }
}

vi.mock('@/data/match', () => ({
  listMatchesPage: (_ladderId: string, page: { offset: number; limit: number }) => {
    mocks.calls.push(page)
    return Promise.resolve(mocks.resolvePage(page.offset))
  },
  voidMatch: () => Promise.resolve(),
}))

vi.mock('@/data/ladder', () => ({
  listLadderMembers: () =>
    Promise.resolve([
      {
        id: 'm1',
        userId: 'user-1',
        displayName: 'Sam',
        role: 'player' as const,
        status: 'active' as const,
        rating: 1000,
        ratedMatchCount: 1,
        lastMatchAt: null,
      },
    ]),
}))

afterEach(() => {
  cleanup()
  mocks.calls = []
  mocks.resolvePage = () => Promise.resolve({ matches: [], total: 0 })
})

function renderHistory() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const auth: AuthState = {
    session: { user: { id: 'user-1' } } as Session,
    profile: { id: 'user-1', displayName: 'Sam', isSuperAdmin: false },
    profileError: false,
    isLoading: false,
    refreshProfile: async () => {},
  }
  return render(
    <AuthContext value={auth}>
      <QueryClientProvider client={queryClient}>
        <MatchHistory ladderId="ladder-1" />
      </QueryClientProvider>
    </AuthContext>,
  )
}

describe('Match history', () => {
  it('keeps the loading text until the first page arrives', async () => {
    let resolvePage: (page: { matches: MatchRead[]; total: number }) => void = () => {}
    mocks.resolvePage = () =>
      new Promise((resolve) => {
        resolvePage = resolve
      })
    renderHistory()
    expect(screen.getByText('Loading Matches…')).toBeInTheDocument()

    resolvePage({ matches: [], total: 0 })
    expect(await screen.findByText('No Matches yet.')).toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('shows the count without a load button when one page holds every Match', async () => {
    mocks.resolvePage = () =>
      Promise.resolve({
        matches: [sampleMatch('m1'), sampleMatch('m2'), sampleMatch('m3')],
        total: 3,
      })
    renderHistory()
    expect(await screen.findByText('Showing 3 of 3 Matches')).toHaveClass(
      'text-center',
      'text-sm',
      'text-neutral-600',
    )
    expect(screen.queryByRole('button', { name: /Load/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(3)
    expect(screen.getAllByText('Sam').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sam')[0]?.closest('li')).toHaveClass('text-green-700')
  })

  it('loads the next page and updates the count', async () => {
    const user = userEvent.setup()
    const all = Array.from({ length: 24 }, (_, index) => sampleMatch(`match-${index}`))
    mocks.resolvePage = (offset) =>
      Promise.resolve({
        matches: all.slice(offset, offset + 10),
        total: 24,
      })
    renderHistory()

    expect(await screen.findByText('Showing 10 of 24 Matches')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(10)
    await user.click(screen.getByRole('button', { name: 'Load next 10' }))

    expect(await screen.findByText('Showing 20 of 24 Matches')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(20)
    await user.click(screen.getByRole('button', { name: 'Load last 4' }))

    await waitFor(() => {
      expect(screen.getByText('Showing 24 of 24 Matches')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /Load/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(24)
    expect(mocks.calls.map((call) => call.offset)).toEqual([0, 10, 20])
    expect(mocks.calls.every((call) => call.limit === 10)).toBe(true)
  })
})
