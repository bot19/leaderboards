import { describe, expect, it } from 'vitest'
import type { MatchRead } from '@/data/match'
import { memberMatchOutcome } from './memberMatchOutcome'

function match(partial: Partial<MatchRead> & Pick<MatchRead, 'participants' | 'result' | 'status'>): MatchRead {
  return {
    id: 'match-1',
    notes: null,
    recordedBy: 'user-1',
    recordedAt: '2026-01-01T12:00:00.000Z',
    confirmedAt: partial.status === 'confirmed' ? '2026-01-02T12:00:00.000Z' : null,
    voidedBy: null,
    voidedAt: null,
    voidKind: null,
    ...partial,
  }
}

describe('memberMatchOutcome', () => {
  it('reads a 1v1 win with Rating change', () => {
    const outcome = memberMatchOutcome(
      match({
        status: 'confirmed',
        result: 'side_a_won',
        participants: [
          {
            ladderMemberId: 'sam',
            userId: 'u1',
            displayName: 'Sam',
            side: 'a',
            ratingBefore: 1512,
            ratingChange: 12.4,
          },
          {
            ladderMemberId: 'priya',
            userId: 'u2',
            displayName: 'Priya',
            side: 'b',
            ratingBefore: 1500,
            ratingChange: -12.4,
          },
        ],
      }),
      'sam',
    )

    expect(outcome).toEqual({
      result: 'won',
      opponents: ['Priya'],
      partner: null,
      format: '1v1',
      ratingBefore: 1512,
      ratingChange: 12.4,
      ratingAfter: 1524.4,
      at: '2026-01-02T12:00:00.000Z',
    })
  })

  it('reads a 2v2 loss with a partner', () => {
    const outcome = memberMatchOutcome(
      match({
        status: 'confirmed',
        result: 'side_b_won',
        participants: [
          {
            ladderMemberId: 'sam',
            userId: 'u1',
            displayName: 'Sam',
            side: 'a',
            ratingBefore: 1520,
            ratingChange: -8.1,
          },
          {
            ladderMemberId: 'partner',
            userId: 'u2',
            displayName: 'Kim',
            side: 'a',
            ratingBefore: 1500,
            ratingChange: -8.1,
          },
          {
            ladderMemberId: 'dave',
            userId: 'u3',
            displayName: 'Dave',
            side: 'b',
            ratingBefore: 1510,
            ratingChange: 8.1,
          },
          {
            ladderMemberId: 'alex',
            userId: 'u4',
            displayName: 'Alex',
            side: 'b',
            ratingBefore: 1490,
            ratingChange: 8.1,
          },
        ],
      }),
      'sam',
    )

    expect(outcome).toEqual({
      result: 'lost',
      opponents: ['Alex', 'Dave'],
      partner: 'Kim',
      format: '2v2',
      ratingBefore: 1520,
      ratingChange: -8.1,
      ratingAfter: 1511.9,
      at: '2026-01-02T12:00:00.000Z',
    })
  })

  it('reads a Draw', () => {
    const outcome = memberMatchOutcome(
      match({
        status: 'confirmed',
        result: 'draw',
        participants: [
          {
            ladderMemberId: 'sam',
            userId: 'u1',
            displayName: 'Sam',
            side: 'a',
            ratingBefore: 1500,
            ratingChange: 0,
          },
          {
            ladderMemberId: 'priya',
            userId: 'u2',
            displayName: 'Priya',
            side: 'b',
            ratingBefore: 1500,
            ratingChange: 0,
          },
        ],
      }),
      'sam',
    )

    expect(outcome).toMatchObject({
      result: 'drew',
      opponents: ['Priya'],
      partner: null,
      format: '1v1',
      ratingBefore: 1500,
      ratingChange: 0,
      ratingAfter: 1500,
    })
  })

  it('reads a Pending Match without Rating movement', () => {
    const outcome = memberMatchOutcome(
      match({
        status: 'pending',
        result: 'side_a_won',
        confirmedAt: null,
        participants: [
          {
            ladderMemberId: 'sam',
            userId: 'u1',
            displayName: 'Sam',
            side: 'a',
            ratingBefore: null,
            ratingChange: null,
          },
          {
            ladderMemberId: 'priya',
            userId: 'u2',
            displayName: 'Priya',
            side: 'b',
            ratingBefore: null,
            ratingChange: null,
          },
        ],
      }),
      'sam',
    )

    expect(outcome).toEqual({
      result: 'won',
      opponents: ['Priya'],
      partner: null,
      format: '1v1',
      ratingBefore: null,
      ratingChange: null,
      ratingAfter: null,
      at: '2026-01-01T12:00:00.000Z',
    })
  })

  it('returns null when the Ladder member is not in the Match', () => {
    expect(
      memberMatchOutcome(
        match({
          status: 'confirmed',
          result: 'side_a_won',
          participants: [
            {
              ladderMemberId: 'sam',
              userId: 'u1',
              displayName: 'Sam',
              side: 'a',
              ratingBefore: 1500,
              ratingChange: 10,
            },
            {
              ladderMemberId: 'priya',
              userId: 'u2',
              displayName: 'Priya',
              side: 'b',
              ratingBefore: 1500,
              ratingChange: -10,
            },
          ],
        }),
        'other',
      ),
    ).toBeNull()
  })
})
