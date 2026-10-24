import { describe, expect, it } from 'vitest'
import { matchResultLabel } from './labels'

function match(
  result: 'side_a_won' | 'side_b_won' | 'draw',
  participants: { side: 'a' | 'b'; displayName: string }[],
) {
  return { result, participants }
}

describe('matchResultLabel', () => {
  it('names the winning Side, including more than one Participant', () => {
    expect(
      matchResultLabel(
        match('side_a_won', [
          { side: 'a', displayName: 'Sam' },
          { side: 'a', displayName: 'Alex' },
          { side: 'b', displayName: 'Dave' },
          { side: 'b', displayName: 'Priya' },
        ]),
      ),
    ).toBe('Alex, Sam won')
    expect(
      matchResultLabel(
        match('side_b_won', [
          { side: 'a', displayName: 'Alex' },
          { side: 'b', displayName: 'Priya' },
        ]),
      ),
    ).toBe('Priya won')
  })

  it('reads a Draw without naming a Side', () => {
    expect(
      matchResultLabel(
        match('draw', [
          { side: 'a', displayName: 'Alex' },
          { side: 'b', displayName: 'Priya' },
        ]),
      ),
    ).toBe('Draw')
  })
})
