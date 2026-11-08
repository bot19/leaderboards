import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LadderMemberDetail, LadderMemberRecord, LeaderboardEntry } from '@/data/ladder'
import { entry } from '@/test/ladderMocks'
import type { MatchRead } from '@/data/match'
import { MemberPanel } from './MemberPanel'

const mocks = vi.hoisted(() => {
  const state: {
    member: LadderMemberDetail | null
    record: LadderMemberRecord
    leaderboard: LeaderboardEntry[]
    pages: Map<number, { matches: MatchRead[]; total: number }>
  } = {
    member: {
      id: 'm1',
      ladderId: 'ladder-1',
      ladderName: 'Friday pool',
      drawsAllowed: false,
      displayName: 'Priya',
      role: 'player',
      status: 'active',
      rating: 1512,
      ratedMatchCount: 6,
      provisional: false,
    },
    record: {
      wins: 12,
      losses: 5,
      draws: 0,
      form: ['W', 'W', 'L', 'W', 'D'],
      streakResult: 'W',
      streakLength: 2,
      peakRating: 1548,
      peakAt: '2026-10-12T12:00:00.000Z',
    },
    leaderboard: [] as LeaderboardEntry[],
    pages: new Map(),
  }
  return state
})

mocks.leaderboard = [
  entry({ ladderMemberId: 'm0', rank: 1, displayName: 'Sam', rating: 1600 }),
  entry({ ladderMemberId: 'm2', rank: 2, displayName: 'Alex', rating: 1550 }),
  entry({ ladderMemberId: 'm1', rank: 3, displayName: 'Priya', rating: 1512 }),
]

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
        ladderMemberId: 'm1',
        userId: 'user-2',
        displayName: 'Priya',
        side: 'a',
        ratingBefore: 1500,
        ratingChange: 12,
      },
      {
        ladderMemberId: 'm2',
        userId: 'user-3',
        displayName: 'Dave',
        side: 'b',
        ratingBefore: 1500,
        ratingChange: -12,
      },
    ],
  }
}

vi.mock('@/data/ladder', () => ({
  fetchLadderMember: () => Promise.resolve(mocks.member),
  fetchLadderMemberRecord: () => Promise.resolve(mocks.record),
  listLeaderboard: () => Promise.resolve(mocks.leaderboard),
}))

vi.mock('@/data/match', () => ({
  listMemberMatchesPage: (_id: string, page: { offset: number; limit: number }) => {
    const cached = mocks.pages.get(page.offset)
    if (cached) return Promise.resolve(cached)
    return Promise.resolve({ matches: [], total: 0 })
  },
}))

afterEach(() => {
  cleanup()
  mocks.member = {
    id: 'm1',
    ladderId: 'ladder-1',
    ladderName: 'Friday pool',
    drawsAllowed: false,
    displayName: 'Priya',
    role: 'player',
    status: 'active',
    rating: 1512,
    ratedMatchCount: 6,
    provisional: false,
  }
  mocks.record = {
    wins: 12,
    losses: 5,
    draws: 0,
    form: ['W', 'W', 'L', 'W', 'D'],
    streakResult: 'W',
    streakLength: 2,
    peakRating: 1548,
    peakAt: '2026-10-12T12:00:00.000Z',
  }
  mocks.leaderboard = [
    entry({ ladderMemberId: 'm0', rank: 1, displayName: 'Sam', rating: 1600 }),
    entry({ ladderMemberId: 'm2', rank: 2, displayName: 'Alex', rating: 1550 }),
    entry({ ladderMemberId: 'm1', rank: 3, displayName: 'Priya', rating: 1512 }),
  ]
  mocks.pages = new Map([
    [0, { matches: [sampleMatch('match-1')], total: 1 }],
  ])
})

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemberPanel memberId="m1" />
    </QueryClientProvider>,
  )
}

describe('MemberPanel', () => {
  it('renders the summary and Matches', async () => {
    mocks.pages = new Map([[0, { matches: [sampleMatch('match-1')], total: 1 }]])
    renderPanel()

    expect(await screen.findByText('1512')).toBeInTheDocument()
    expect(screen.getByText('#3 of 3')).toBeInTheDocument()
    expect(screen.getByText('12W · 5L')).toBeInTheDocument()
    expect(screen.getByLabelText('Last 5: won, won, lost, won, drew')).toBeInTheDocument()
    expect(screen.getByText('Streak W2')).toBeInTheDocument()
    expect(screen.getByText(/Peak 1548/)).toBeInTheDocument()
    expect(screen.getByText('Won')).toBeInTheDocument()
    expect(screen.getByText(/vs Dave/)).toBeInTheDocument()
    expect(screen.getByText('+12')).toBeInTheDocument()
  })

  it('shows rank with an Inactive badge, and status for Left and Removed', async () => {
    const base = mocks.member
    if (!base) throw new Error('Expected a Ladder member mock')
    mocks.member = { ...base, status: 'left' }
    renderPanel()
    expect(await screen.findByText('Left')).toBeInTheDocument()
    expect(screen.queryByText(/#\d+ of/)).not.toBeInTheDocument()

    cleanup()
    mocks.member = { ...base, status: 'removed' }
    renderPanel()
    expect(await screen.findByText('Removed')).toBeInTheDocument()

    cleanup()
    mocks.member = { ...base, status: 'active' }
    mocks.leaderboard = [
      entry({ ladderMemberId: 'm0', rank: 1, displayName: 'Sam', rating: 1600 }),
      entry({
        ladderMemberId: 'm1',
        rank: 2,
        displayName: 'Priya',
        rating: 1512,
        inactive: true,
      }),
    ]
    renderPanel()
    expect(await screen.findByText('#2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  it('shows the not-found message for an unknown id', async () => {
    mocks.member = null
    renderPanel()
    expect(
      await screen.findByText('This member is not available.'),
    ).toBeInTheDocument()
  })

  it('loads more Matches', async () => {
    const user = userEvent.setup()
    mocks.pages = new Map([
      [0, { matches: Array.from({ length: 10 }, (_, i) => sampleMatch(`m-${i}`)), total: 12 }],
      [10, { matches: [sampleMatch('m-10'), sampleMatch('m-11')], total: 12 }],
    ])
    renderPanel()

    expect(await screen.findByText('Showing 10 of 12 Matches')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load last 2' }))
    await waitFor(() => {
      expect(screen.getByText('Showing 12 of 12 Matches')).toBeInTheDocument()
    })
  })

  it('shows Unranked when the member has no Confirmed Match, and #n of m counts ranked members only', async () => {
    const base = mocks.member
    if (!base) throw new Error('Expected a Ladder member mock')
    mocks.leaderboard = [
      entry({ ladderMemberId: 'm0', rank: 1, displayName: 'Sam', rating: 1600 }),
      entry({ ladderMemberId: 'm2', rank: 2, displayName: 'Alex', rating: 1550 }),
      entry({
        ladderMemberId: 'm1',
        rank: 3,
        displayName: 'Priya',
        rating: 1512,
      }),
      entry({
        ladderMemberId: 'm-unranked',
        rank: null,
        ranked: false,
        displayName: 'Newcomer',
        rating: 1000,
        matches: 0,
        wins: 0,
      }),
    ]
    renderPanel()
    expect(await screen.findByText('#3 of 3')).toBeInTheDocument()

    cleanup()
    mocks.member = { ...base, id: 'm-unranked' }
    renderPanel()
    expect(await screen.findByText('Unranked')).toBeInTheDocument()
    expect(screen.queryByText(/#\d+ of/)).not.toBeInTheDocument()
  })

  it('shows New for Provisional and omits Draws when the Game forbids them and Draws are 0', async () => {
    const base = mocks.member
    if (!base) throw new Error('Expected a Ladder member mock')
    mocks.member = { ...base, provisional: true, ratedMatchCount: 2 }
    mocks.record = { ...mocks.record, draws: 0 }
    renderPanel()
    expect(await screen.findByText('New')).toBeInTheDocument()
    expect(screen.queryByText('Provisional')).not.toBeInTheDocument()
    expect(screen.getByText('12W · 5L')).toBeInTheDocument()
    expect(screen.queryByText(/12W · 5L · 0D/)).not.toBeInTheDocument()
  })
})

describe('MemberPanel form accessibility', () => {
  it('keeps Match cards inside the Matches landmark', async () => {
    mocks.pages = new Map([[0, { matches: [sampleMatch('match-1')], total: 1 }]])
    renderPanel()
    const matches = await screen.findByRole('region', { name: 'Matches' })
    expect(await within(matches).findByText('Won')).toBeInTheDocument()
  })
})
