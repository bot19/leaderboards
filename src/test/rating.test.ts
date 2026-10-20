// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { query } from './harness'

type Participant = {
  key: string
  rating: number
  ratedMatchCount: number
}

type RatingChangeRow = {
  participant_key: string
  rating_change: string
}

async function ratingChanges(
  sideA: Participant[],
  sideB: Participant[],
  result: 'side_a_won' | 'side_b_won' | 'draw',
): Promise<Record<string, number>> {
  const encode = (side: Participant[]) =>
    side.map((participant) => ({
      key: participant.key,
      rating: participant.rating,
      rated_match_count: participant.ratedMatchCount,
    }))

  const rows = await query<RatingChangeRow>(
    `select participant_key, rating_change::text as rating_change
     from public.rating_changes($1::jsonb, $2::jsonb, $3)`,
    [JSON.stringify(encode(sideA)), JSON.stringify(encode(sideB)), result],
  )

  return Object.fromEntries(
    rows.map((row) => [row.participant_key, Number(row.rating_change)]),
  )
}

describe('pure rating module', () => {
  it('moves equal established Sides by 16 when one Side wins', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1000, ratedMatchCount: 5 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 5 }],
      'side_a_won',
    )

    expect(changes.a).toBe(16)
    expect(changes.b).toBe(-16)
  })

  it('moves the winning Side up and the losing Side down', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1000, ratedMatchCount: 5 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 5 }],
      'side_b_won',
    )

    expect(changes.a).toBe(-16)
    expect(changes.b).toBe(16)
  })

  it('leaves equal established Sides unchanged on a Draw', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1000, ratedMatchCount: 5 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 5 }],
      'draw',
    )

    expect(changes.a).toBe(0)
    expect(changes.b).toBe(0)
  })

  it('gives the lower Side more points for a win than the higher Side', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1400, ratedMatchCount: 12 }],
      [{ key: 'b', rating: 1600, ratedMatchCount: 12 }],
      'side_a_won',
    )

    expect(changes.a).toBeCloseTo(24.31190165, 6)
    expect(changes.b).toBeCloseTo(-24.31190165, 6)
  })

  it('splits a Draw between unequal Sides by the expected score', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1400, ratedMatchCount: 12 }],
      [{ key: 'b', rating: 1600, ratedMatchCount: 12 }],
      'draw',
    )

    expect(changes.a).toBeCloseTo(8.31190165, 6)
    expect(changes.b).toBeCloseTo(-8.31190165, 6)
  })

  it('gives a favourite only a small gain for beating a lower Side', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1500, ratedMatchCount: 20 }],
      [{ key: 'b', rating: 1200, ratedMatchCount: 20 }],
      'side_a_won',
    )

    expect(changes.a).toBeCloseTo(4.83134583, 6)
    expect(changes.b).toBeCloseTo(-4.83134583, 6)
  })

  it('rates a 2v2 Match from the mean Rating of each Side', async () => {
    const changes = await ratingChanges(
      [
        { key: 'a1', rating: 1500, ratedMatchCount: 8 },
        { key: 'a2', rating: 1300, ratedMatchCount: 8 },
      ],
      [
        { key: 'b1', rating: 1700, ratedMatchCount: 8 },
        { key: 'b2', rating: 1500, ratedMatchCount: 8 },
      ],
      'side_a_won',
    )

    expect(changes.a1).toBeCloseTo(24.31190165, 6)
    expect(changes.a2).toBeCloseTo(24.31190165, 6)
    expect(changes.b1).toBeCloseTo(-24.31190165, 6)
    expect(changes.b2).toBeCloseTo(-24.31190165, 6)
    expect(
      (changes.a1 ?? 0) +
        (changes.a2 ?? 0) +
        (changes.b1 ?? 0) +
        (changes.b2 ?? 0),
    ).toBeCloseTo(0, 6)
  })

  it('balances the Sides when every Participant has the same K-factor', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1100, ratedMatchCount: 9 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 9 }],
      'side_b_won',
    )

    expect(changes.a).toBeCloseTo(-20.48207999, 6)
    expect(changes.b).toBeCloseTo(20.48207999, 6)
    expect((changes.a ?? 0) + (changes.b ?? 0)).toBeCloseTo(0, 6)
  })

  it('moves a Provisional Participant twice as fast', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1000, ratedMatchCount: 0 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 0 }],
      'side_a_won',
    )

    expect(changes.a).toBe(32)
    expect(changes.b).toBe(-32)
  })

  it('stays Provisional with 4 rated Matches and established at 5', async () => {
    const stillProvisional = await ratingChanges(
      [{ key: 'a', rating: 1000, ratedMatchCount: 4 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 4 }],
      'side_a_won',
    )
    const established = await ratingChanges(
      [{ key: 'a', rating: 1000, ratedMatchCount: 5 }],
      [{ key: 'b', rating: 1000, ratedMatchCount: 5 }],
      'side_a_won',
    )

    expect(stillProvisional.a).toBe(32)
    expect(stillProvisional.b).toBe(-32)
    expect(established.a).toBe(16)
    expect(established.b).toBe(-16)
  })

  it('moves teammates by their own K-factors', async () => {
    const changes = await ratingChanges(
      [
        { key: 'provisional', rating: 1000, ratedMatchCount: 2 },
        { key: 'established', rating: 1000, ratedMatchCount: 6 },
      ],
      [
        { key: 'b1', rating: 1000, ratedMatchCount: 6 },
        { key: 'b2', rating: 1000, ratedMatchCount: 6 },
      ],
      'side_a_won',
    )

    expect(changes.provisional).toBe(32)
    expect(changes.established).toBe(16)
    expect(changes.b1).toBe(-16)
    expect(changes.b2).toBe(-16)
  })

  it('applies each K-factor to a hand-checked unequal Match', async () => {
    const changes = await ratingChanges(
      [{ key: 'a', rating: 1400, ratedMatchCount: 3 }],
      [{ key: 'b', rating: 1600, ratedMatchCount: 11 }],
      'side_a_won',
    )

    expect(changes.a).toBeCloseTo(48.62380331, 6)
    expect(changes.b).toBeCloseTo(-24.31190165, 6)
  })

  it('exposes the tunable rating constants in one place', async () => {
    const rows = await query<{
      starting_rating: number
      k_factor: number
      provisional_k_factor: number
      provisional_threshold: number
      confirmation_window_hours: number
      inactive_threshold_days: number
    }>(
      `select starting_rating, k_factor, provisional_k_factor, provisional_threshold,
              confirmation_window_hours, inactive_threshold_days
       from public.rating_constants()`,
    )

    expect(rows[0]).toEqual({
      starting_rating: 1000,
      k_factor: 32,
      provisional_k_factor: 64,
      provisional_threshold: 5,
      confirmation_window_hours: 48,
      inactive_threshold_days: 30,
    })
  })
})
