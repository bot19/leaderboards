import { describe, expect, it } from 'vitest'
import {
  demoteToPlayerConfirm,
  leaveLadderConfirm,
  rejectMatchConfirm,
  removeMemberConfirm,
  voidMatchConfirm,
} from './confirmAction'

describe('confirmAction', () => {
  it('asks before leaving a Ladder', () => {
    expect(leaveLadderConfirm()).toBe(
      'Leave this Ladder? You can rejoin from its Share link.',
    )
  })

  it('names the Ladder member being Removed', () => {
    expect(removeMemberConfirm('Alex')).toBe(
      'Remove Alex from this Ladder? Only an Admin can reinstate them.',
    )
  })

  it('names the Ladder member being demoted to Player', () => {
    expect(demoteToPlayerConfirm('Sam')).toBe(
      "Demote Sam to Player? They'll no longer be an Admin.",
    )
  })

  it("matches Void's message to the Match status", () => {
    expect(voidMatchConfirm('confirmed')).toBe(
      'Void this Match? Every Rating on this Ladder will be recalculated without it.',
    )
    expect(voidMatchConfirm('pending')).toBe(
      "Void this Match? It won't count toward any Rating.",
    )
  })

  it('says a Rejected Match is Voided', () => {
    expect(rejectMatchConfirm()).toBe(
      "Reject this Match? It will be Voided and won't count toward any Rating.",
    )
  })
})
