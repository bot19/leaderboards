// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { confirmMatch, listMatches, recordMatch, voidMatch } from '@/data/match'
import { createProfile } from '@/data/profile'
import { createLadder, listLeaderboard, listRoster } from '@/data/ladder'
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

  function entryOf(
    board: Awaited<ReturnType<typeof listLeaderboard>>,
    ladderMemberId: string,
  ) {
    const entry = board.find((row) => row.ladderMemberId === ladderMemberId)
    if (!entry) throw new Error(`Missing Leaderboard entry ${ladderMemberId}`)
    return entry
  }

  it('exposes the Inactive threshold with the other tunable constants', async () => {
    const rows = await query<{ inactive_threshold_days: number }>(
      `select inactive_threshold_days from public.rating_constants()`,
    )
    expect(rows[0]?.inactive_threshold_days).toBe(30)
  })

  it('ranks Joined Ladder members by Rating and lists Unranked members last', async () => {
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
        inactive: false,
        ranked: true,
        matches: 5,
        wins: 0,
        rankChange: null,
      },
      {
        ladderMemberId: idOf('Sam'),
        displayName: 'Sam',
        rating: 1100,
        rank: 2,
        provisional: true,
        inactive: false,
        ranked: true,
        matches: 4,
        wins: 0,
        rankChange: null,
      },
      {
        ladderMemberId: idOf('Alex'),
        displayName: 'Alex',
        rating: 900,
        rank: null,
        provisional: true,
        inactive: false,
        ranked: false,
        matches: 0,
        wins: 0,
        rankChange: null,
      },
    ])
  })

  it('does not let an Unranked newcomer push a lower-rated ranked member down', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')
    await setMember(ladder.id, who('Sam').user.id, { rating: 990, ratedMatchCount: 3 })
    await setMember(ladder.id, who('Priya').user.id, { rating: 1000, ratedMatchCount: 0 })
    await setMember(ladder.id, who('Alex').user.id, { rating: 1010, ratedMatchCount: 3 })

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(board, idOf('Alex'))).toMatchObject({ rank: 1, ranked: true })
    expect(entryOf(board, idOf('Sam'))).toMatchObject({ rank: 2, ranked: true })
    expect(entryOf(board, idOf('Priya'))).toMatchObject({ rank: null, ranked: false })
    expect(board.map((entry) => entry.displayName)).toEqual(['Alex', 'Sam', 'Priya'])
  })

  it('exposes wins and matches, and does not count a Draw as a win', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')

    const win = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await confirmMatch(win.id, who('Priya').client)

    // Pool does not allow Draws — insert a confirmed Draw via the service role.
    const { data: drawMatch, error: drawError } = await serviceRole()
      .from('matches')
      .insert({
        ladder_id: ladder.id,
        status: 'confirmed',
        result: 'draw',
        recorded_by: who('Sam').user.id,
        confirmed_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (drawError || !drawMatch) throw new Error(drawError?.message ?? 'Missing Draw Match')

    const { error: partsError } = await serviceRole().from('participants').insert([
      {
        match_id: drawMatch.id,
        ladder_member_id: idOf('Sam'),
        side: 'a',
        rating_before: 1000,
        rating_change: 0,
      },
      {
        match_id: drawMatch.id,
        ladder_member_id: idOf('Priya'),
        side: 'b',
        rating_before: 1000,
        rating_change: 0,
      },
    ])
    if (partsError) throw new Error(partsError.message)

    await setMember(ladder.id, who('Sam').user.id, { ratedMatchCount: 2 })
    await setMember(ladder.id, who('Priya').user.id, { ratedMatchCount: 2 })

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(board, idOf('Sam'))).toMatchObject({
      ranked: true,
      matches: 2,
      wins: 1,
    })
    expect(entryOf(board, idOf('Priya'))).toMatchObject({
      ranked: true,
      matches: 2,
      wins: 0,
    })
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

  it('keeps an Inactive Ladder member on the Leaderboard at their rank, with Rating untouched', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Priya').user.id, {
      rating: 1180,
      ratedMatchCount: 5,
      lastMatchAt: daysAgo(31),
    })
    await setMember(ladder.id, who('Sam').user.id, { ratedMatchCount: 1 })

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(board).toEqual([
      {
        ladderMemberId: idOf('Priya'),
        displayName: 'Priya',
        rating: 1180,
        rank: 1,
        provisional: false,
        inactive: true,
        ranked: true,
        matches: 5,
        wins: 0,
        rankChange: null,
      },
      {
        ladderMemberId: idOf('Sam'),
        displayName: 'Sam',
        rating: 1000,
        rank: 2,
        provisional: true,
        inactive: false,
        ranked: true,
        matches: 1,
        wins: 0,
        rankChange: null,
      },
    ])
  })

  it('treats joining as the activity time when a Ladder member has never played', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Priya').user.id, {
      ratedMatchCount: 1,
      lastMatchAt: null,
      joinedAt: daysAgo(31),
    })
    await setMember(ladder.id, who('Sam').user.id, { ratedMatchCount: 1 })

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(board, idOf('Priya'))).toMatchObject({
      inactive: true,
      rank: 1,
    })
    expect(entryOf(board, idOf('Sam')).inactive).toBe(false)
  })

  it('clears Inactive after they play a Match', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Priya').user.id, {
      rating: 1180,
      ratedMatchCount: 5,
      lastMatchAt: daysAgo(40),
    })

    expect(entryOf(await listLeaderboard(ladder.id, who('Sam').client), idOf('Priya')).inactive).toBe(
      true,
    )

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
    expect(entryOf(board, idOf('Priya')).inactive).toBe(false)
  })

  it('reports rank_change for a winner, loser and a non-player bumped down', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')
    // Before: Sam 1100 (#1), Alex 1010 (#2), Priya 1000 (#3).
    // Priya beats Sam → Priya rises past Alex; Alex is bumped down without playing.
    await setMember(ladder.id, who('Sam').user.id, { rating: 1100, ratedMatchCount: 5 })
    await setMember(ladder.id, who('Alex').user.id, { rating: 1010, ratedMatchCount: 5 })
    await setMember(ladder.id, who('Priya').user.id, { rating: 1000, ratedMatchCount: 5 })

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
    expect(entryOf(board, idOf('Priya')).rankChange).toBe(1)
    expect(entryOf(board, idOf('Sam')).rankChange).toBe(0)
    expect(entryOf(board, idOf('Alex')).rankChange).toBe(-1)
  })

  it('leaves rank_change null when the Ladder has no Confirmed Matches', async () => {
    const { ladder, who } = await ladderWith('Sam', 'Priya')
    await setMember(ladder.id, who('Sam').user.id, { ratedMatchCount: 1 })
    await setMember(ladder.id, who('Priya').user.id, { ratedMatchCount: 1 })
    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(board.every((entry) => entry.rankChange === null)).toBe(true)
  })

  it('leaves rank_change null for a member who joined after the latest Confirmed Match', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')
    await setMember(ladder.id, who('Sam').user.id, { rating: 1100, ratedMatchCount: 5 })
    await setMember(ladder.id, who('Priya').user.id, { rating: 1000, ratedMatchCount: 5 })
    await setMember(ladder.id, who('Alex').user.id, { rating: 1010, ratedMatchCount: 5 })

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

    const late = await person('Jamie')
    await addLadderPlayer(ladder.id, late.user.id)
    await setMember(ladder.id, late.user.id, {
      ratedMatchCount: 1,
      joinedAt: new Date(Date.now() + 60_000).toISOString(),
    })

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(board.find((entry) => entry.displayName === 'Jamie')?.rankChange).toBeNull()
    expect(entryOf(board, idOf('Priya')).rankChange).not.toBeNull()
  })

  it('leaves rank_change null for a member ranked for the first time by the latest Match', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')
    await setMember(ladder.id, who('Alex').user.id, { rating: 1000, ratedMatchCount: 3 })

    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await confirmMatch(match.id, who('Priya').client)

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(board, idOf('Sam')).rankChange).toBeNull()
    expect(entryOf(board, idOf('Priya')).rankChange).toBeNull()
    expect(entryOf(board, idOf('Alex')).rankChange).not.toBeNull()
  })

  it('ignores Unranked members when computing rank_change for everyone else', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')
    // Close Ratings so Priya overtakes Sam; Alex's 1050 would sit between them if ranked.
    await setMember(ladder.id, who('Sam').user.id, { rating: 1010, ratedMatchCount: 5 })
    await setMember(ladder.id, who('Priya').user.id, { rating: 1000, ratedMatchCount: 5 })
    await setMember(ladder.id, who('Alex').user.id, { rating: 1050, ratedMatchCount: 0 })

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
    expect(entryOf(board, idOf('Alex'))).toMatchObject({ ranked: false, rankChange: null })
    expect(entryOf(board, idOf('Priya')).rankChange).toBe(1)
    expect(entryOf(board, idOf('Sam')).rankChange).toBe(-1)
  })

  it('makes a member Unranked again when their only Match is Voided', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await confirmMatch(match.id, who('Priya').client)

    expect(entryOf(await listLeaderboard(ladder.id, who('Sam').client), idOf('Sam')).ranked).toBe(
      true,
    )

    await voidMatch(match.id, who('Sam').client)

    const board = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(board, idOf('Sam'))).toMatchObject({
      ranked: false,
      rank: null,
      matches: 0,
      wins: 0,
    })
    expect(entryOf(board, idOf('Priya'))).toMatchObject({
      ranked: false,
      rank: null,
      matches: 0,
    })
  })

  it('updates rank_change after voiding the latest Confirmed Match', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya', 'Alex')

    const first = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await confirmMatch(first.id, who('Priya').client)

    const second = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Priya')],
        sideB: [idOf('Alex')],
        result: 'side_a_won',
      },
      who('Priya').client,
    )
    await confirmMatch(second.id, who('Alex').client)

    const afterSecond = await listLeaderboard(ladder.id, who('Sam').client)
    const samAfterSecond = entryOf(afterSecond, idOf('Sam')).rankChange

    const third = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Alex')],
        sideB: [idOf('Sam')],
        result: 'side_a_won',
      },
      who('Alex').client,
    )
    await confirmMatch(third.id, who('Sam').client)

    const afterThird = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(afterThird, idOf('Sam')).rankChange).not.toBe(samAfterSecond)

    await voidMatch(third.id, who('Sam').client)

    const afterVoid = await listLeaderboard(ladder.id, who('Sam').client)
    expect(entryOf(afterVoid, idOf('Sam')).rankChange).toBe(samAfterSecond)
    expect(entryOf(afterVoid, idOf('Alex')).rankChange).toBe(
      entryOf(afterSecond, idOf('Alex')).rankChange,
    )
  })

  it('rewires a Removed-member refusal to say member, not Ladder member', async () => {
    const { ladder, who, idOf } = await ladderWith('Sam', 'Priya')
    const { fetchShareToken, joinLadder, removeLadderMember } = await import('@/data/ladder')
    await removeLadderMember(idOf('Priya'), who('Sam').client)
    const token = await fetchShareToken(ladder.id, who('Sam').client)

    await expect(joinLadder(token, who('Priya').client)).rejects.toThrow(
      'A Removed member cannot rejoin from the Share link',
    )
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
