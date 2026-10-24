import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MatchRead } from '@/data/match'
import { WaitingForYou } from './WaitingForYou'

const mocks = vi.hoisted(() => ({
  waiting: [] as MatchRead[],
}))

function pendingMatch(): MatchRead {
  return {
    id: 'match-waiting',
    status: 'pending',
    result: 'side_a_won',
    notes: null,
    recordedBy: 'user-2',
    recordedAt: '2026-08-01T12:00:00.000Z',
    confirmedAt: null,
    voidedBy: null,
    voidedAt: null,
    voidKind: null,
    participants: [
      {
        ladderMemberId: 'm1',
        userId: 'user-1',
        displayName: 'Sam',
        side: 'b',
        ratingBefore: null,
        ratingChange: null,
      },
      {
        ladderMemberId: 'm2',
        userId: 'user-2',
        displayName: 'Alex',
        side: 'a',
        ratingBefore: null,
        ratingChange: null,
      },
    ],
  }
}

vi.mock('@/data/match', () => ({
  listMatchesWaitingForMe: () => Promise.resolve(mocks.waiting),
  confirmMatch: () => Promise.resolve(),
  rejectMatch: () => Promise.resolve(),
}))

vi.mock('@/data/ladder', () => ({
  listLadderMembers: () => Promise.resolve([]),
}))

afterEach(() => {
  cleanup()
  mocks.waiting = []
})

function renderWaiting() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <WaitingForYou ladderId="ladder-1" />
    </QueryClientProvider>,
  )
}

describe('Waiting for you', () => {
  it('renders the divider only when a Match is waiting', async () => {
    renderWaiting()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Waiting for you' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()

    cleanup()
    mocks.waiting = [pendingMatch()]
    renderWaiting()

    const section = await screen.findByRole('region', { name: 'Waiting for you' })
    const divider = within(section).getByRole('separator')
    expect(divider).toHaveClass('border-neutral-200')
    expect(divider.parentElement).toHaveClass('pt-3')
    const card = within(section).getByRole('article')
    expect(card).toHaveClass('border-orange-200', 'bg-orange-50', 'shadow-sm')
    expect(within(card).getByText('Pending')).toHaveClass('text-orange-900')
    expect(card.querySelector('svg')).toHaveClass('tabler-icon-clock', 'text-orange-600')
    expect(within(card).getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.queryByText(/Side [AB]/)).not.toBeInTheDocument()
  })
})
