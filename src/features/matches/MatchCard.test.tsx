import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MatchRead, MatchResult, MatchStatus, MatchVoidKind } from '@/data/match'
import { formatLocalDateTime } from '@/features/matches/labels'
import { formatRelativeTime } from '@/lib/relativeTime'
import { MatchCard } from './MatchCard'

const recordedAt = '2026-08-01T12:00:00.000Z'

function participant(
  id: string,
  displayName: string,
  side: 'a' | 'b',
  userId: string | null,
  ratingChange: number | null,
) {
  return {
    ladderMemberId: id,
    userId,
    displayName,
    side,
    ratingBefore: ratingChange == null ? null : 1000,
    ratingChange,
  }
}

function match(options: {
  status: MatchStatus
  result?: MatchResult
  voidKind?: MatchVoidKind | null
  notes?: string | null
  recordedBy?: string
  participants?: MatchRead['participants']
}): MatchRead {
  return {
    id: 'match-1',
    status: options.status,
    result: options.result ?? 'side_a_won',
    notes: options.notes ?? null,
    recordedBy: options.recordedBy ?? 'user-alex',
    recordedAt,
    confirmedAt: options.status === 'confirmed' ? recordedAt : null,
    voidedBy: options.status === 'voided' ? 'user-sam' : null,
    voidedAt: options.status === 'voided' ? recordedAt : null,
    voidKind: options.voidKind ?? null,
    participants: options.participants ?? [
      participant('m-alex', 'Alex', 'a', 'user-alex', options.status === 'confirmed' ? 16 : null),
      participant('m-sam', 'Sam', 'a', 'user-sam', options.status === 'confirmed' ? 16 : null),
      participant('m-priya', 'Priya', 'b', 'user-priya', options.status === 'confirmed' ? -16 : null),
      participant('m-dave', 'Dave', 'b', 'user-dave', options.status === 'confirmed' ? -16 : null),
    ],
  }
}

function renderCard(value: MatchRead, members: { userId: string | null; displayName: string }[] = []) {
  return render(<MatchCard match={value} members={members} />)
}

afterEach(() => {
  cleanup()
})

describe('Match card', () => {
  it('styles each status with its icon and label', () => {
    const { rerender } = renderCard(match({ status: 'pending' }))
    const pending = screen.getByRole('article')
    expect(pending).toHaveClass('border-orange-200', 'bg-orange-50', 'shadow-sm')
    expect(pending).not.toHaveClass('opacity-60')
    expect(screen.getByText('Pending')).toHaveClass('text-orange-900')
    expect(pending.querySelector('svg')).toHaveClass('tabler-icon-clock', 'text-orange-600')
    expect(pending.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Alex, Sam vs Dave, Priya')).toBeInTheDocument()
    expect(screen.getByText('Alex, Sam won')).toHaveClass('font-bold')
    expect(screen.queryByText(/Side [AB]/)).not.toBeInTheDocument()

    rerender(<MatchCard match={match({ status: 'confirmed', notes: 'best of 3' })} members={[]} />)
    const confirmed = screen.getByRole('article')
    expect(confirmed).toHaveClass('bg-white')
    expect(confirmed).not.toHaveClass('border-orange-200', 'opacity-60')
    expect(screen.getByText('Confirmed')).toHaveClass('text-green-700')
    expect(confirmed.querySelector('svg')).toHaveClass('tabler-icon-circle-check', 'text-green-600')
    expect(screen.queryByText(/won/)).not.toBeInTheDocument()
    expect(screen.getByText('best of 3')).toBeInTheDocument()

    rerender(
      <MatchCard match={match({ status: 'voided', voidKind: 'rejected' })} members={[]} />,
    )
    const rejected = screen.getByRole('article')
    expect(rejected).toHaveClass('bg-white', 'opacity-60')
    expect(screen.getByText('Rejected')).toBeInTheDocument()
    expect(rejected.querySelector('svg')).toHaveClass('tabler-icon-circle-x', 'text-neutral-500')

    rerender(<MatchCard match={match({ status: 'voided', voidKind: 'admin' })} members={[]} />)
    const voided = screen.getByRole('article')
    expect(voided).toHaveClass('bg-white', 'opacity-60')
    expect(screen.getByText('Voided by Admin')).toBeInTheDocument()
    expect(voided.querySelector('svg')).toHaveClass('tabler-icon-ban', 'text-neutral-500')
  })

  it('colours winners green, losers red, and a Draw neutral', () => {
    renderCard(match({ status: 'confirmed', result: 'side_a_won' }))
    expect(screen.getByText('Alex').closest('li')).toHaveClass('text-green-700')
    expect(screen.getByText('Sam').closest('li')).toHaveClass('text-green-700')
    expect(screen.getByText('Priya').closest('li')).toHaveClass('text-red-700')
    expect(screen.getByText('Dave').closest('li')).toHaveClass('text-red-700')
    expect(screen.getAllByText('+16')).toHaveLength(2)
    expect(screen.getAllByText('-16')).toHaveLength(2)
    expect(screen.getByText('Confirmed')).toHaveClass('text-green-700')
    expect(screen.getByRole('article').querySelector('svg')).toHaveClass(
      'tabler-icon-circle-check',
      'text-green-600',
    )
    expect(screen.queryByText(/won/)).not.toBeInTheDocument()

    renderCard(
      match({
        status: 'confirmed',
        result: 'draw',
        participants: [
          participant('m-alex', 'Alex', 'a', 'user-alex', 4),
          participant('m-priya', 'Priya', 'b', 'user-priya', -4),
        ],
      }),
    )
    expect(screen.getAllByText('Alex').at(-1)?.closest('li')).toHaveClass('text-neutral-800')
    expect(screen.getAllByText('Priya').at(-1)?.closest('li')).toHaveClass('text-neutral-800')
    expect(screen.getAllByText('Alex').at(-1)?.closest('li')).not.toHaveClass(
      'text-green-700',
      'text-red-700',
    )
    expect(screen.getByText('Draw')).toHaveClass('font-bold')
  })

  it('hides Rating changes until the Match is Confirmed', () => {
    renderCard(
      match({
        status: 'pending',
        participants: [
          participant('m-alex', 'Alex', 'a', 'user-alex', 16),
          participant('m-priya', 'Priya', 'b', 'user-priya', -16),
        ],
      }),
    )
    expect(screen.queryByText('+16')).not.toBeInTheDocument()
    expect(screen.queryByText('-16')).not.toBeInTheDocument()
  })

  it('puts Void on the recorded line for an Admin', () => {
    const onVoid = vi.fn()
    renderCard(match({ status: 'confirmed' }))
    expect(screen.queryByRole('button', { name: 'Void' })).not.toBeInTheDocument()

    cleanup()
    render(<MatchCard match={match({ status: 'pending' })} members={[]} onVoid={onVoid} />)
    const button = screen.getByRole('button', { name: 'Void' })
    expect(button.querySelector('svg')).toHaveClass('tabler-icon-ban')
    expect(button).toHaveClass('text-xs', 'text-neutral-500')
    const line = button.parentElement
    expect(line).toHaveTextContent('Recorded by Alex')
    expect(line).toHaveTextContent(formatRelativeTime(recordedAt))
    expect(line?.querySelectorAll('span.mx-1\\.5')).toHaveLength(2)
  })

  it('shows who recorded the Match and the full local time', () => {
    renderCard(match({ status: 'pending', recordedBy: 'user-alex' }))
    const recorded = screen.getByText('Recorded by Alex').parentElement
    expect(recorded).toHaveClass('flex', 'items-center')
    expect(recorded).toHaveTextContent('Recorded by Alex')
    expect(recorded).toHaveTextContent(formatRelativeTime(recordedAt))
    expect(recorded?.querySelector('[aria-hidden="true"]')).toHaveClass('mx-1.5')
    const time = screen.getByText(formatRelativeTime(recordedAt))
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', recordedAt)
    expect(time).toHaveAttribute('title', formatLocalDateTime(recordedAt))
    expect(time.parentElement).toHaveClass('text-xs', 'text-neutral-500')
  })

  it('uses a Ladder member name when the recorder is not a Participant', () => {
    renderCard(match({ status: 'confirmed', recordedBy: 'user-jordan' }), [
      { userId: 'user-jordan', displayName: 'Jordan' },
    ])
    const recorded = screen.getByText('Recorded by Jordan').parentElement
    expect(recorded).toHaveTextContent('Recorded by Jordan')
    expect(recorded).toHaveTextContent(formatRelativeTime(recordedAt))
    expect(recorded?.querySelector('span.mx-1\\.5')).toHaveClass('mx-1.5')
  })

  it('shows only the time when the recorder has no name', () => {
    renderCard(match({ status: 'pending', recordedBy: 'user-missing' }))
    expect(screen.queryByText(/Recorded by/)).not.toBeInTheDocument()
    expect(screen.getByText(formatRelativeTime(recordedAt))).toBeInTheDocument()
  })

  it('wraps a long heading without shrinking the status', () => {
    renderCard(
      match({
        status: 'pending',
        participants: [
          participant('m-alex', 'Alexandria of the very long display name', 'a', 'user-alex', null),
          participant('m-priya', 'Priya', 'b', 'user-priya', null),
        ],
      }),
    )
    const heading = screen.getByText(/Alexandria of the very long display name vs Priya/)
    expect(heading).toHaveClass('min-w-0', 'break-words')
    expect(screen.getByText('Pending')).toHaveClass('shrink-0')
  })
})
