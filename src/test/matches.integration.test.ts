// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { confirmMatch, listMatches, listMatchesWaitingForMe, recordMatch } from '@/data/match'
import { createProfile } from '@/data/profile'
import { createLadder, listLeaderboard, listRoster } from '@/data/ladder'
import type { Database } from '@/types/db'
import {
  addLadderPlayer,
  createTestUser,
  deleteTestUser,
  query,
  serviceRole,
  setSuperAdmin,
  signInAs,
  type TestUser,
} from './harness'

type Person = {
  name: string
  user: TestUser
  client: SupabaseClient<Database>
}

type RatingChangeRow = {
  participant_key: string
  rating_change: string
}

async function ratingChanges(
  sideA: { key: string; rating: number; ratedMatchCount: number }[],
  sideB: { key: string; rating: number; ratedMatchCount: number }[],
  result: 'side_a_won' | 'side_b_won' | 'draw',
): Promise<Record<string, number>> {
  const encode = (side: { key: string; rating: number; ratedMatchCount: number }[]) =>
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

  return Object.fromEntries(rows.map((row) => [row.participant_key, Number(row.rating_change)]))
}

describe('recording and confirming a Match', () => {
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
    return { ladder, people, roster, idOf, who }
  }

  async function setStats(
    ladderId: string,
    userId: string,
    stats: { rating: number; ratedMatchCount: number },
  ) {
    const { error } = await serviceRole()
      .from('ladder_members')
      .update({ rating: stats.rating, rated_match_count: stats.ratedMatchCount })
      .eq('ladder_id', ladderId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  it('refuses unequal Sides', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')

    await expect(
      recordMatch(
        {
          ladderId: ladder.id,
          sideA: [idOf('Sam'), idOf('Priya')],
          sideB: [idOf('Alex')],
          result: 'side_a_won',
        },
        who('Sam').client,
      ),
    ).rejects.toThrow(/same size/i)
  })

  it('refuses empty Sides', async () => {
    const { ladder, who } = await ladderWith('Sam', 'Priya')

    await expect(
      recordMatch(
        { ladderId: ladder.id, sideA: [], sideB: [], result: 'side_a_won' },
        who('Sam').client,
      ),
    ).rejects.toThrow(/each side needs a participant/i)
  })

  it('refuses a Side larger than the Game allows', async () => {
    const { ladder, who } = await ladderWith('Sam')
    const ids = Array.from({ length: 3 }, () => crypto.randomUUID())

    await expect(
      recordMatch(
        { ladderId: ladder.id, sideA: ids, sideB: ids.map(() => crypto.randomUUID()), result: 'side_a_won' },
        who('Sam').client,
      ),
    ).rejects.toThrow(/larger than this game allows/i)
  })

  it('refuses a Draw in a Game without Draws', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')

    await expect(
      recordMatch(
        {
          ladderId: ladder.id,
          sideA: [idOf('Sam')],
          sideB: [idOf('Priya')],
          result: 'draw',
        },
        who('Sam').client,
      ),
    ).rejects.toThrow(/does not allow a draw/i)
  })

  it('refuses a Ladder member who is not active on this Ladder', async () => {
    const sam = await person('Sam')
    const left = await person('Left')
    const removed = await person('Removed')
    const elsewhere = await person('Elsewhere')
    const ladder = await createLadder('Friday pool', sam.client)
    const other = await createLadder('Other pool', elsewhere.client)
    await addLadderPlayer(ladder.id, left.user.id, { status: 'left' })
    await addLadderPlayer(ladder.id, removed.user.id, { status: 'removed' })
    const roster = await listRoster(ladder.id, sam.client)
    const otherRoster = await listRoster(other.id, elsewhere.client)
    const leftId = roster.find((member) => member.displayName === 'Left')?.id
    const removedId = roster.find((member) => member.displayName === 'Removed')?.id
    const elsewhereId = otherRoster.find((member) => member.displayName === 'Elsewhere')?.id
    const samId = roster.find((member) => member.displayName === 'Sam')?.id
    if (!leftId || !removedId || !elsewhereId || !samId) throw new Error('Missing roster ids')

    await expect(
      recordMatch(
        { ladderId: ladder.id, sideA: [samId], sideB: [leftId], result: 'side_a_won' },
        sam.client,
      ),
    ).rejects.toThrow(/active ladder member/i)
    await expect(
      recordMatch(
        { ladderId: ladder.id, sideA: [samId], sideB: [removedId], result: 'side_a_won' },
        sam.client,
      ),
    ).rejects.toThrow(/active ladder member/i)
    await expect(
      recordMatch(
        { ladderId: ladder.id, sideA: [samId], sideB: [elsewhereId], result: 'side_a_won' },
        sam.client,
      ),
    ).rejects.toThrow(/active ladder member/i)
  })

  it('refuses a Ladder member listed twice', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')

    await expect(
      recordMatch(
        {
          ladderId: ladder.id,
          sideA: [idOf('Sam')],
          sideB: [idOf('Sam')],
          result: 'side_a_won',
        },
        who('Sam').client,
      ),
    ).rejects.toThrow(/only appear once/i)
  })

  it('refuses a recorder who is not a Participant', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')

    await expect(
      recordMatch(
        {
          ladderId: ladder.id,
          sideA: [idOf('Priya')],
          sideB: [idOf('Alex')],
          result: 'side_a_won',
        },
        who('Sam').client,
      ),
    ).rejects.toThrow(/you played in/i)
  })

  it('leaves Ratings unchanged when a Match is recorded', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')

    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
        notes: '  close one  ',
      },
      who('Sam').client,
    )

    const roster = await listRoster(ladder.id, who('Sam').client)
    expect(roster.map((member) => ({
      name: member.displayName,
      rating: member.rating,
      ratedMatchCount: member.ratedMatchCount,
      lastMatchAt: member.lastMatchAt,
    }))).toEqual([
      { name: 'Priya', rating: 1000, ratedMatchCount: 0, lastMatchAt: null },
      { name: 'Sam', rating: 1000, ratedMatchCount: 0, lastMatchAt: null },
    ])

    const matches = await listMatches(ladder.id, who('Priya').client)
    expect(matches).toEqual([
      expect.objectContaining({
        id: match.id,
        status: 'pending',
        result: 'side_a_won',
        notes: 'close one',
        confirmedAt: null,
      }),
    ])
    expect(matches[0]?.participants.map((participant) => participant.ratingChange)).toEqual([null, null])
    expect(await listLeaderboard(ladder.id, who('Sam').client)).toEqual([
      expect.objectContaining({ displayName: 'Priya', rating: 1000, rank: 1 }),
      expect.objectContaining({ displayName: 'Sam', rating: 1000, rank: 2 }),
    ])
  })

  it("refuses confirmation from the recorder's Side", async () => {
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

    await expect(confirmMatch(match.id, who('Sam').client)).rejects.toThrow(/cannot confirm/i)
    expect((await listRoster(ladder.id, who('Sam').client)).every((member) => member.rating === 1000)).toBe(true)
  })

  it('confirms from the opposing Side and moves Ratings through the rating module', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const before = await listRoster(ladder.id, who('Sam').client)
    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    expect(await listMatchesWaitingForMe(ladder.id, who('Sam').client)).toEqual([])
    expect(await listMatchesWaitingForMe(ladder.id, who('Priya').client)).toEqual([
      expect.objectContaining({ id: match.id, status: 'pending' }),
    ])

    await confirmMatch(match.id, who('Priya').client)

    const changes = await ratingChanges(
      before.filter((member) => member.displayName === 'Sam').map((member) => ({
        key: 'sam',
        rating: member.rating,
        ratedMatchCount: member.ratedMatchCount,
      })),
      before.filter((member) => member.displayName === 'Priya').map((member) => ({
        key: 'priya',
        rating: member.rating,
        ratedMatchCount: member.ratedMatchCount,
      })),
      'side_a_won',
    )
    const samChange = changes.sam
    const priyaChange = changes.priya
    if (samChange == null || priyaChange == null) throw new Error('Missing rating changes')

    const after = await listRoster(ladder.id, who('Priya').client)
    const sam = after.find((member) => member.displayName === 'Sam')
    const priya = after.find((member) => member.displayName === 'Priya')
    expect(sam?.rating).toBeCloseTo(1000 + samChange, 6)
    expect(priya?.rating).toBeCloseTo(1000 + priyaChange, 6)
    expect(sam?.ratedMatchCount).toBe(1)
    expect(priya?.ratedMatchCount).toBe(1)
    expect(sam?.lastMatchAt).toEqual(expect.any(String))
    expect(priya?.lastMatchAt).toEqual(expect.any(String))

    const confirmed = await listMatches(ladder.id, who('Sam').client)
    expect(confirmed[0]?.status).toBe('confirmed')
    expect(confirmed[0]?.confirmedAt).toEqual(expect.any(String))
    expect(confirmed[0]?.participants.find((participant) => participant.displayName === 'Sam')).toMatchObject({
      ratingBefore: 1000,
      ratingChange: samChange,
    })
    expect(await listLeaderboard(ladder.id, who('Sam').client)).toEqual([
      expect.objectContaining({ displayName: 'Sam', rating: sam?.rating, rank: 1 }),
      expect.objectContaining({ displayName: 'Priya', rating: priya?.rating, rank: 2 }),
    ])
    expect(await listMatchesWaitingForMe(ladder.id, who('Priya').client)).toEqual([])
    await expect(confirmMatch(match.id, who('Priya').client)).rejects.toThrow(/pending/i)
  })

  it('rates a 2v2 Match from the average Rating of each Side', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex', 'Dave')
    await setStats(ladder.id, who('Sam').user.id, { rating: 1500, ratedMatchCount: 8 })
    await setStats(ladder.id, who('Priya').user.id, { rating: 1300, ratedMatchCount: 8 })
    await setStats(ladder.id, who('Alex').user.id, { rating: 1700, ratedMatchCount: 8 })
    await setStats(ladder.id, who('Dave').user.id, { rating: 1500, ratedMatchCount: 8 })

    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam'), idOf('Priya')],
        sideB: [idOf('Alex'), idOf('Dave')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await confirmMatch(match.id, who('Alex').client)

    const changes = await ratingChanges(
      [
        { key: 'sam', rating: 1500, ratedMatchCount: 8 },
        { key: 'priya', rating: 1300, ratedMatchCount: 8 },
      ],
      [
        { key: 'alex', rating: 1700, ratedMatchCount: 8 },
        { key: 'dave', rating: 1500, ratedMatchCount: 8 },
      ],
      'side_a_won',
    )

    const roster = await listRoster(ladder.id, who('Dave').client)
    for (const [name, key, before] of [
      ['Sam', 'sam', 1500],
      ['Priya', 'priya', 1300],
      ['Alex', 'alex', 1700],
      ['Dave', 'dave', 1500],
    ] as const) {
      const change = changes[key]
      const member = roster.find((entry) => entry.displayName === name)
      if (change == null || !member) throw new Error(`Missing ${name}`)
      expect(member.rating).toBeCloseTo(before + change, 6)
    }

    const recorded = (await listMatches(ladder.id, who('Sam').client))[0]
    expect(recorded?.participants.map((participant) => participant.ratingChange)).toEqual([
      changes.sam,
      changes.priya,
      changes.alex,
      changes.dave,
    ])
    expect(changes.sam).toBeCloseTo(24.31190165, 6)
    expect(changes.priya).toBeCloseTo(24.31190165, 6)
  })

  it('rates two Matches in confirmation order when that differs from recording order', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')
    await setStats(ladder.id, who('Sam').user.id, { rating: 1400, ratedMatchCount: 12 })
    await setStats(ladder.id, who('Priya').user.id, { rating: 1600, ratedMatchCount: 12 })
    await setStats(ladder.id, who('Alex').user.id, { rating: 1000, ratedMatchCount: 12 })

    const firstRecorded = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    const secondRecorded = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Alex')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    await confirmMatch(secondRecorded.id, who('Alex').client)
    await confirmMatch(firstRecorded.id, who('Priya').client)

    const secondChanges = await ratingChanges(
      [{ key: 'sam', rating: 1400, ratedMatchCount: 12 }],
      [{ key: 'alex', rating: 1000, ratedMatchCount: 12 }],
      'side_a_won',
    )
    const samAfterSecond = 1400 + (secondChanges.sam ?? 0)
    const alexAfterSecond = 1000 + (secondChanges.alex ?? 0)
    const firstChanges = await ratingChanges(
      [{ key: 'sam', rating: samAfterSecond, ratedMatchCount: 13 }],
      [{ key: 'priya', rating: 1600, ratedMatchCount: 12 }],
      'side_a_won',
    )

    const roster = await listRoster(ladder.id, who('Sam').client)
    expect(roster.find((member) => member.displayName === 'Sam')?.rating).toBeCloseTo(
      samAfterSecond + (firstChanges.sam ?? 0),
      6,
    )
    expect(roster.find((member) => member.displayName === 'Alex')?.rating).toBeCloseTo(alexAfterSecond, 6)
    expect(roster.find((member) => member.displayName === 'Priya')?.rating).toBeCloseTo(
      1600 + (firstChanges.priya ?? 0),
      6,
    )
    expect(roster.find((member) => member.displayName === 'Sam')?.ratedMatchCount).toBe(14)

    const matches = await listMatches(ladder.id, who('Sam').client)
    const laterConfirmed = matches.find((match) => match.id === firstRecorded.id)
    const earlierConfirmed = matches.find((match) => match.id === secondRecorded.id)
    expect(
      laterConfirmed?.participants.find((participant) => participant.displayName === 'Sam')?.ratingBefore,
    ).toBeCloseTo(samAfterSecond, 6)
    expect(
      earlierConfirmed?.participants.find((participant) => participant.displayName === 'Sam')?.ratingBefore,
    ).toBeCloseTo(1400, 6)
  })

  it('hides Matches from an outsider and shows them to the super admin', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const outsider = await person('Outsider')
    const keeper = await person('Keeper')
    await setSuperAdmin(keeper.user.id, true)
    await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )

    expect(await listMatches(ladder.id, outsider.client)).toEqual([])
    const { data: participants, error } = await outsider.client.from('participants').select('id')
    if (error) throw new Error(error.message)
    expect(participants).toEqual([])

    const visible = await listMatches(ladder.id, keeper.client)
    expect(visible).toHaveLength(1)
    expect(visible[0]?.participants).toHaveLength(2)
  })
})
