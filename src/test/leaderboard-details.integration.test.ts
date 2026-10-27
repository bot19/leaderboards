// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { confirmMatch, listMatches, recordMatch } from '@/data/match'
import { createProfile } from '@/data/profile'
import {
  createLadder,
  listInactiveMembers,
  listLeaderboard,
  listRoster,
} from '@/data/ladder'
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

describe('Leaderboard details', () => {
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

  async function setMember(
    ladderId: string,
    userId: string,
    patch: {
      rating?: number
      ratedMatchCount?: number
      lastMatchAt?: string | null
      joinedAt?: string
    },
  ) {
    const { error } = await serviceRole()
      .from('ladder_members')
      .update({
        ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
        ...(patch.ratedMatchCount !== undefined
          ? { rated_match_count: patch.ratedMatchCount }
          : {}),
        ...(patch.lastMatchAt !== undefined ? { last_match_at: patch.lastMatchAt } : {}),
        ...(patch.joinedAt !== undefined ? { joined_at: patch.joinedAt } : {}),
      })
      .eq('ladder_id', ladderId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  function daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  }

  it('exposes the Inactive threshold with the other tunable constants', async () => {
    const rows = await query<{ inactive_threshold_days: number }>(
      `select inactive_threshold_days from public.rating_constants()`,
    )
    expect(rows[0]?.inactive_threshold_days).toBe(30)
  })

  it('ranks active Ladder members by Rating and marks Provisional below the threshold', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')
    await setMember(ladder.id, who('Priya').user.id, {
      rating: 1200,
      ratedMatchCount: 5,
    })
    await setMember(ladder.id, who('Sam').user.id, {
      rating: 1100,
      ratedMatchCount: 4,
    })
    await setMember(ladder.id, who('Alex').user.id, {
      rating: 900,
      ratedMatchCount: 0,
    })

    expect(await listLeaderboard(ladder.id, who('Sam').client)).toEqual([
      {
        ladderMemberId: idOf('Priya'),
        displayName: 'Priya',
        rating: 1200,
        rank: 1,
        provisional: false,
      },
      {
        ladderMemberId: idOf('Sam'),
        displayName: 'Sam',
        rating: 1100,
        rank: 2,
        provisional: true,
      },
      {
        ladderMemberId: idOf('Alex'),
        displayName: 'Alex',
        rating: 900,
        rank: 3,
        provisional: true,
      },
    ])
  })

  it('clears the Provisional flag at 5 rated Matches', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Sam').user.id, { ratedMatchCount: 4 })
    await setMember(ladder.id, who('Priya').user.id, { ratedMatchCount: 5 })

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(board.find((entry) => entry.ladderMemberId === idOf('Sam'))?.provisional).toBe(true)
    expect(board.find((entry) => entry.ladderMemberId === idOf('Priya'))?.provisional).toBe(
      false,
    )
  })

  it('lists a Ladder member past the Inactive threshold only as Inactive, with Rating untouched', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Priya').user.id, {
      rating: 1180,
      lastMatchAt: daysAgo(31),
    })

    expect(await listLeaderboard(ladder.id, who('Sam').client)).toEqual([
      {
        ladderMemberId: idOf('Sam'),
        displayName: 'Sam',
        rating: 1000,
        rank: 1,
        provisional: true,
      },
    ])
    expect(await listInactiveMembers(ladder.id, who('Sam').client)).toEqual([
      {
        ladderMemberId: idOf('Priya'),
        displayName: 'Priya',
        rating: 1180,
        provisional: true,
        lastActiveAt: expect.any(String),
      },
    ])
  })

  it('treats joining as the activity time when a Ladder member has never played', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Priya').user.id, {
      lastMatchAt: null,
      joinedAt: daysAgo(31),
    })

    expect(await listLeaderboard(ladder.id, who('Sam').client).then((rows) => rows.map((r) => r.displayName))).toEqual([
      'Sam',
    ])
    expect(
      await listInactiveMembers(ladder.id, who('Sam').client).then((rows) =>
        rows.map((r) => r.ladderMemberId),
      ),
    ).toEqual([idOf('Priya')])
  })

  it('returns an Inactive Ladder member to the Leaderboard after they play a Match', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Priya').user.id, {
      rating: 1180,
      lastMatchAt: daysAgo(40),
    })

    expect(
      await listInactiveMembers(ladder.id, who('Sam').client).then((rows) =>
        rows.map((r) => r.displayName),
      ),
    ).toEqual(['Priya'])

    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Priya')],
        sideB: [idOf('Sam')],
        result: 'side_a_won',
      },
      who('Priya').client,
    )
    await confirmMatch(match.id, who('Sam').client)

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(board.map((entry) => entry.displayName)).toEqual(['Priya', 'Sam'])
    expect(await listInactiveMembers(ladder.id, who('Sam').client)).toEqual([])
  })

  it('lists Rating history for a Ladder member from Confirmed Matches in confirmation order', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')

    const first = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    const second = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Priya')],
        sideB: [idOf('Sam')],
        result: 'side_a_won',
      },
      who('Priya').client,
    )

    // Confirm in the opposite order from recording.
    await confirmMatch(second.id, who('Sam').client)
    await confirmMatch(first.id, who('Priya').client)

    const matches = await listMatches(ladder.id, who('Sam').client)
    const confirmed = matches.filter((match) => match.status === 'confirmed')
    const samHistoryFromMatches = confirmed
      .slice()
      .sort((a, b) => {
        const aAt = a.confirmedAt ?? ''
        const bAt = b.confirmedAt ?? ''
        return aAt.localeCompare(bAt) || a.id.localeCompare(b.id)
      })
      .map((match) => {
        const sam = match.participants.find((p) => p.ladderMemberId === idOf('Sam'))
        if (!sam || sam.ratingBefore == null || sam.ratingChange == null) {
          throw new Error('Missing Sam Participant ratings')
        }
        return {
          matchId: match.id,
          ratingBefore: sam.ratingBefore,
          ratingChange: sam.ratingChange,
        }
      })

    const history = await query<{
      match_id: string
      confirmed_at: string
      rating_before: string
      rating_change: string
    }>(
      `select match_id, confirmed_at, rating_before::text, rating_change::text
       from public.rating_history
       where ladder_member_id = $1::uuid
       order by confirmed_at asc, match_id asc`,
      [idOf('Sam')],
    )
    expect(
      history.map((entry) => ({
        matchId: entry.match_id,
        ratingBefore: Number(entry.rating_before),
        ratingChange: Number(entry.rating_change),
      })),
    ).toEqual(samHistoryFromMatches)
  })
})
