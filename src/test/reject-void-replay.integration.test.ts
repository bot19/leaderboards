// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  confirmMatch,
  listMatches,
  recordMatch,
  rejectMatch,
  voidMatch,
} from '@/data/match'
import { createProfile } from '@/data/profile'
import { createLadder, listRoster } from '@/data/ladder'
import type { Database } from '@/types/db'
import {
  addLadderPlayer,
  createTestUser,
  deleteTestUser,
  query,
  setSuperAdmin,
  signInAs,
  type TestUser,
} from './harness'

type Person = {
  name: string
  user: TestUser
  client: SupabaseClient<Database>
}

describe('Reject, void and Replay', () => {
  const created: string[] = []

  afterEach(async () => {
    while (created.length > 0) {
      const id = created.pop()
      if (id) await deleteTestUser(id)
    }
  })

  async function person(name: string): Promise<Person> {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)
    await createProfile(name, client)
    return { name, user, client }
  }

  async function ladderWith(...names: string[]) {
    const people: Person[] = []
    for (const name of names) people.push(await person(name))
    const admin = people[0]
    if (!admin) throw new Error('A Ladder needs a Ladder member')
    const ladder = await createLadder('Friday pool', admin.client)
    for (const member of people.slice(1)) {
      await addLadderPlayer(ladder.id, member.user.id)
    }
    const roster = await listRoster(ladder.id, admin.client)
    const idOf = (name: string) => {
      const found = roster.find((entry) => entry.displayName === name)
      if (!found) throw new Error(`Missing Ladder member ${name}`)
      return found.id
    }
    const who = (name: string) => {
      const found = people.find((entry) => entry.name === name)
      if (!found) throw new Error(`Missing User ${name}`)
      return found
    }
    return { ladder, people, roster, idOf, who }
  }

  async function playConfirmed(
    ladderId: string,
    recorder: Person,
    confirmer: Person,
    sideA: string[],
    sideB: string[],
    result: 'side_a_won' | 'side_b_won' = 'side_a_won',
  ) {
    const match = await recordMatch(
      { ladderId, sideA, sideB, result },
      recorder.client,
    )
    await confirmMatch(match.id, confirmer.client)
    return match
  }

  async function replayLadder(ladderId: string) {
    await query(`select private.replay_ladder($1::uuid)`, [ladderId])
  }

  function ratingsByName(roster: Awaited<ReturnType<typeof listRoster>>) {
    return Object.fromEntries(roster.map((member) => [member.displayName, member.rating]))
  }

  function countsByName(roster: Awaited<ReturnType<typeof listRoster>>) {
    return Object.fromEntries(
      roster.map((member) => [member.displayName, member.ratedMatchCount]),
    )
  }

  it('Rejects a Pending Match from the opposing Side without moving Ratings', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    await rejectMatch(match.id, who('Priya').client)

    const matches = await listMatches(ladder.id, who('Sam').client)
    expect(matches).toEqual([
      expect.objectContaining({
        id: match.id,
        status: 'voided',
        voidKind: 'rejected',
        voidedBy: who('Priya').user.id,
        voidedAt: expect.any(String),
        confirmedAt: null,
      }),
    ])
    const roster = await listRoster(ladder.id, who('Sam').client)
    expect(roster.every((member) => member.rating === 1000 && member.ratedMatchCount === 0)).toBe(
      true,
    )
  })

  it("refuses Reject from the recorder's Side and for non-Pending Matches", async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const pending = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    await expect(rejectMatch(pending.id, who('Sam').client)).rejects.toThrow(/cannot reject/i)

    await confirmMatch(pending.id, who('Priya').client)
    await expect(rejectMatch(pending.id, who('Priya').client)).rejects.toThrow(/pending/i)

    const voided = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_b_won',
      },
      who('Sam').client,
    )
    await rejectMatch(voided.id, who('Priya').client)
    await expect(rejectMatch(voided.id, who('Priya').client)).rejects.toThrow(/pending/i)
  })

  it('refuses void for a Player and allows it for an Admin and the super admin', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')
    const keeper = await person('Keeper')
    await setSuperAdmin(keeper.user.id, true)

    const pending = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    await expect(voidMatch(pending.id, who('Priya').client)).rejects.toThrow(/active admin/i)

    await voidMatch(pending.id, who('Sam').client)
    const adminVoided = await listMatches(ladder.id, who('Sam').client)
    expect(adminVoided[0]).toMatchObject({
      id: pending.id,
      status: 'voided',
      voidKind: 'admin',
      voidedBy: who('Sam').user.id,
    })
    expect(adminVoided[0]?.voidedAt).toEqual(expect.any(String))

    await expect(voidMatch(pending.id, who('Sam').client)).rejects.toThrow(/already voided/i)

    const confirmed = await playConfirmed(
      ladder.id,
      who('Sam'),
      who('Alex'),
      [idOf('Sam')],
      [idOf('Alex')],
    )
    await voidMatch(confirmed.id, keeper.client)
    const superVoided = (await listMatches(ladder.id, keeper.client)).find(
      (match) => match.id === confirmed.id,
    )
    expect(superVoided).toMatchObject({
      status: 'voided',
      voidKind: 'admin',
      voidedBy: keeper.user.id,
    })
  })

  it('voiding a Pending Match does not Replay; voiding a Confirmed Match does', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')

    const first = await playConfirmed(
      ladder.id,
      who('Sam'),
      who('Priya'),
      [idOf('Sam')],
      [idOf('Priya')],
    )
    const pending = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Alex')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    const afterFirst = ratingsByName(await listRoster(ladder.id, who('Sam').client))

    await voidMatch(pending.id, who('Sam').client)
    expect(ratingsByName(await listRoster(ladder.id, who('Sam').client))).toEqual(afterFirst)

    const second = await playConfirmed(
      ladder.id,
      who('Sam'),
      who('Alex'),
      [idOf('Sam')],
      [idOf('Alex')],
    )
    const afterSecond = ratingsByName(await listRoster(ladder.id, who('Sam').client))
    expect(afterSecond.Sam).not.toBe(afterFirst.Sam)

    await voidMatch(second.id, who('Sam').client)
    const afterVoid = ratingsByName(await listRoster(ladder.id, who('Sam').client))
    expect(afterVoid).toEqual(afterFirst)

    const matches = await listMatches(ladder.id, who('Sam').client)
    expect(matches.find((match) => match.id === first.id)?.status).toBe('confirmed')
    expect(matches.find((match) => match.id === second.id)?.status).toBe('voided')
    expect(matches.find((match) => match.id === pending.id)?.status).toBe('voided')
  })

  it('voiding a Confirmed Match leaves Ratings identical to a Ladder that never had it', async () => {
    const withVoid = await ladderWith('Sam', 'Priya', 'Alex')
    await playConfirmed(
      withVoid.ladder.id,
      withVoid.who('Sam'),
      withVoid.who('Priya'),
      [withVoid.idOf('Sam')],
      [withVoid.idOf('Priya')],
    )
    const middle = await playConfirmed(
      withVoid.ladder.id,
      withVoid.who('Sam'),
      withVoid.who('Alex'),
      [withVoid.idOf('Sam')],
      [withVoid.idOf('Alex')],
      'side_b_won',
    )
    await playConfirmed(
      withVoid.ladder.id,
      withVoid.who('Priya'),
      withVoid.who('Alex'),
      [withVoid.idOf('Priya')],
      [withVoid.idOf('Alex')],
    )
    await voidMatch(middle.id, withVoid.who('Sam').client)

    const fresh = await ladderWith('Sam', 'Priya', 'Alex')
    await playConfirmed(
      fresh.ladder.id,
      fresh.who('Sam'),
      fresh.who('Priya'),
      [fresh.idOf('Sam')],
      [fresh.idOf('Priya')],
    )
    await playConfirmed(
      fresh.ladder.id,
      fresh.who('Priya'),
      fresh.who('Alex'),
      [fresh.idOf('Priya')],
      [fresh.idOf('Alex')],
    )

    const voidedRoster = await listRoster(withVoid.ladder.id, withVoid.who('Sam').client)
    const freshRoster = await listRoster(fresh.ladder.id, fresh.who('Sam').client)
    for (const name of ['Sam', 'Priya', 'Alex'] as const) {
      const voided = voidedRoster.find((member) => member.displayName === name)
      const expected = freshRoster.find((member) => member.displayName === name)
      if (!voided || !expected) throw new Error(`Missing ${name}`)
      expect(voided.rating).toBeCloseTo(expected.rating, 6)
      expect(voided.ratedMatchCount).toBe(expected.ratedMatchCount)
    }
  })

  it('Replay with nothing Voided reproduces the stored Ratings exactly', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')
    await playConfirmed(
      ladder.id,
      who('Sam'),
      who('Priya'),
      [idOf('Sam')],
      [idOf('Priya')],
    )
    await playConfirmed(
      ladder.id,
      who('Sam'),
      who('Alex'),
      [idOf('Sam')],
      [idOf('Alex')],
      'side_b_won',
    )
    await playConfirmed(
      ladder.id,
      who('Priya'),
      who('Alex'),
      [idOf('Priya')],
      [idOf('Alex')],
    )

    const beforeRoster = await listRoster(ladder.id, who('Sam').client)
    const beforeMatches = await listMatches(ladder.id, who('Sam').client)
    const beforeRatings = ratingsByName(beforeRoster)
    const beforeCounts = countsByName(beforeRoster)
    const beforeParticipantChanges = beforeMatches.map((match) => ({
      id: match.id,
      changes: Object.fromEntries(
        match.participants.map((participant) => [
          participant.displayName,
          participant.ratingChange,
        ]),
      ),
      befores: Object.fromEntries(
        match.participants.map((participant) => [
          participant.displayName,
          participant.ratingBefore,
        ]),
      ),
    }))

    await replayLadder(ladder.id)

    const afterRoster = await listRoster(ladder.id, who('Sam').client)
    const afterMatches = await listMatches(ladder.id, who('Sam').client)
    expect(ratingsByName(afterRoster)).toEqual(beforeRatings)
    expect(countsByName(afterRoster)).toEqual(beforeCounts)

    for (const before of beforeParticipantChanges) {
      const after = afterMatches.find((match) => match.id === before.id)
      if (!after) throw new Error(`Missing Match ${before.id}`)
      for (const [name, change] of Object.entries(before.changes)) {
        const participant = after.participants.find((entry) => entry.displayName === name)
        expect(participant?.ratingChange).toBeCloseTo(change ?? Number.NaN, 10)
        expect(participant?.ratingBefore).toBeCloseTo(before.befores[name] ?? Number.NaN, 10)
      }
    }
  })
})
