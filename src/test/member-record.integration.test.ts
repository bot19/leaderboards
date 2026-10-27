// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createLadder, fetchLadderMemberRecord, listRoster } from '@/data/ladder'
import {
  confirmMatch,
  listMemberMatchesPage,
  recordMatch,
  rejectMatch,
  voidMatch,
} from '@/data/match'
import { createProfile } from '@/data/profile'
import type { Database } from '@/types/db'
import {
  addLadderPlayer,
  createTestUser,
  deleteTestUser,
  query,
  serviceRole,
  signInAs,
  type TestUser,
} from './harness'

type Person = {
  name: string
  user: TestUser
  client: SupabaseClient<Database>
}

describe('ladder member record and Matches', () => {
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
      const member = roster.find((entry) => entry.displayName === name)
      if (!member) throw new Error(`Missing Ladder member ${name}`)
      return member.id
    }
    const who = (name: string) => {
      const found = people.find((entry) => entry.name === name)
      if (!found) throw new Error(`Missing User ${name}`)
      return found
    }
    return { ladder, idOf, who }
  }

  async function confirmWin(
    ladderId: string,
    winnerId: string,
    loserId: string,
    winnerClient: SupabaseClient<Database>,
    loserClient: SupabaseClient<Database>,
  ) {
    const match = await recordMatch(
      {
        ladderId,
        sideA: [winnerId],
        sideB: [loserId],
        result: 'side_a_won',
      },
      winnerClient,
    )
    await confirmMatch(match.id, loserClient)
    return match.id
  }

  it('counts wins, losses and Draws from Confirmed Matches only', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const sam = idOf('Sam')
    const priya = idOf('Priya')

    await confirmWin(ladder.id, sam, priya, who('Sam').client, who('Priya').client)
    await confirmWin(ladder.id, sam, priya, who('Sam').client, who('Priya').client)
    await confirmWin(ladder.id, priya, sam, who('Priya').client, who('Sam').client)

    const pending = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [sam],
        sideB: [priya],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    expect(pending.id).toBeTruthy()

    const voided = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [sam],
        sideB: [priya],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await rejectMatch(voided.id, who('Priya').client)

    // Pool forbids Draws; enable them for this assertion, then restore.
    await query(
      `update public.games set draws_allowed = true
       where id = (select game_id from public.ladders where id = $1::uuid)`,
      [ladder.id],
    )
    try {
      const draw = await recordMatch(
        {
          ladderId: ladder.id,
          sideA: [sam],
          sideB: [priya],
          result: 'draw',
        },
        who('Sam').client,
      )
      await confirmMatch(draw.id, who('Priya').client)

      const record = await fetchLadderMemberRecord(sam, who('Sam').client)
      expect(record).toMatchObject({
        wins: 2,
        losses: 1,
        draws: 1,
      })
    } finally {
      await query(
        `update public.games set draws_allowed = false
         where id = (select game_id from public.ladders where id = $1::uuid)`,
        [ladder.id],
      )
    }
  })

  it('tracks form, streak and peak in confirmation order, and updates after a Replay', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const sam = idOf('Sam')
    const priya = idOf('Priya')

    // Record three Matches, then confirm in a different order: loss, win, win.
    const first = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [sam],
        sideB: [priya],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    const second = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [sam],
        sideB: [priya],
        result: 'side_b_won',
      },
      who('Sam').client,
    )
    const third = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [sam],
        sideB: [priya],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    await confirmMatch(second.id, who('Priya').client)
    await confirmMatch(first.id, who('Priya').client)
    await confirmMatch(third.id, who('Priya').client)

    const before = await fetchLadderMemberRecord(sam, who('Sam').client)
    // Newest first: W (third), W (first), L (second)
    expect(before.form).toEqual(['W', 'W', 'L'])
    expect(before.streakResult).toBe('W')
    expect(before.streakLength).toBe(2)
    expect(before.peakRating).not.toBeNull()
    expect(before.peakAt).not.toBeNull()
    const peakBefore = before.peakRating

    await voidMatch(first.id, who('Sam').client)
    await query(`select private.replay_ladder($1::uuid)`, [ladder.id])

    const after = await fetchLadderMemberRecord(sam, who('Sam').client)
    expect(after.form).toEqual(['W', 'L'])
    expect(after.wins).toBe(1)
    expect(after.losses).toBe(1)
    expect(after.streakResult).toBe('W')
    expect(after.streakLength).toBe(1)
    expect(after.peakRating).not.toBe(peakBefore)
  })

  it('pages a Ladder member Matches read without overlap', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')
    const sam = idOf('Sam')
    const priya = idOf('Priya')
    const alex = idOf('Alex')
    const ids: string[] = []

    for (let index = 0; index < 12; index += 1) {
      const match = await recordMatch(
        {
          ladderId: ladder.id,
          sideA: [sam],
          sideB: [priya],
          result: 'side_a_won',
        },
        who('Sam').client,
      )
      ids.push(match.id)
      if (index % 2 === 0) {
        await confirmMatch(match.id, who('Priya').client)
      }
    }

    // A Match Sam is not in must not appear.
    const other = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [priya],
        sideB: [alex],
        result: 'side_a_won',
      },
      who('Priya').client,
    )
    await confirmMatch(other.id, who('Alex').client)

    // A Rejected Match must not appear.
    const rejected = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [sam],
        sideB: [priya],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await rejectMatch(rejected.id, who('Priya').client)

    for (const [index, id] of ids.entries()) {
      const recordedAt = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString()
      const { error } = await serviceRole()
        .from('matches')
        .update({ recorded_at: recordedAt })
        .eq('id', id)
      if (error) throw new Error(error.message)
    }

    const newestFirst = [...ids].reverse()
    const first = await listMemberMatchesPage(
      sam,
      { offset: 0, limit: 10 },
      who('Sam').client,
    )
    const second = await listMemberMatchesPage(
      sam,
      { offset: 10, limit: 10 },
      who('Sam').client,
    )

    expect(first.total).toBe(12)
    expect(first.matches.map((match) => match.id)).toEqual(newestFirst.slice(0, 10))
    expect(second.total).toBe(12)
    expect(second.matches.map((match) => match.id)).toEqual(newestFirst.slice(10))
    expect(first.matches.every((match) => match.status === 'confirmed' || match.status === 'pending')).toBe(
      true,
    )
    expect(first.matches.some((match) => match.id === other.id)).toBe(false)
    expect(first.matches.some((match) => match.id === rejected.id)).toBe(false)
    const firstIds = new Set(first.matches.map((match) => match.id))
    expect(second.matches.every((match) => !firstIds.has(match.id))).toBe(true)
  })
})
