// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { listMatches, listMatchesWaitingForMe } from '@/data/match'
import { fetchProfile } from '@/data/profile'
import {
  listInactiveMembers,
  listLadderMembers,
  listLeaderboard,
  listMyLadders,
  listRoster,
} from '@/data/ladder'
import { resolveAuthDestination } from '@/lib/authDestination'
import { query, signedOutClient } from './harness'

const password = 'password123'

async function signInSeed(email: string) {
  const client = signedOutClient()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.user) throw new Error(error?.message ?? `Could not sign in as ${email}`)
  return { client, userId: data.user.id }
}

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000)
}

describe('seeded local data', () => {
  it('signs Sam, Alex and Jamie in with a profile, so they land on Home', async () => {
    for (const email of ['sam@example.com', 'alex@example.com', 'jamie@example.com']) {
      const { client, userId } = await signInSeed(email)
      const profile = await fetchProfile(userId, client)

      expect(profile?.id).toBe(userId)
      expect(
        resolveAuthDestination({
          session: { user: { id: userId } },
          profile: profile ? { id: profile.id } : null,
        }),
      ).toBe('/')
    }
  })

  it('puts Sam and Alex on two Ladders and leaves Jamie on an empty Home', async () => {
    const sam = await signInSeed('sam@example.com')
    const alex = await signInSeed('alex@example.com')
    const jamie = await signInSeed('jamie@example.com')

    expect(await fetchProfile(sam.userId, sam.client)).toMatchObject({ isSuperAdmin: true })
    expect(await fetchProfile(alex.userId, alex.client)).toMatchObject({ isSuperAdmin: false })

    const expected = [
      { name: 'Friday pool', gameName: 'pool' },
      { name: 'Lunch table tennis', gameName: 'table tennis' },
    ]
    expect(await listMyLadders(sam.client)).toEqual(expect.arrayContaining(
      expected.map((ladder) => expect.objectContaining(ladder)),
    ))
    expect(await listMyLadders(alex.client)).toEqual(expect.arrayContaining(
      expected.map((ladder) => expect.objectContaining(ladder)),
    ))
    expect(await listMyLadders(sam.client)).toHaveLength(2)
    expect(await listMyLadders(jamie.client)).toEqual([])
  })

  it('shows every Friday pool state, and an empty Lunch table tennis', async () => {
    const { client, userId: samId } = await signInSeed('sam@example.com')
    const alex = await signInSeed('alex@example.com')
    const mine = await listMyLadders(client)
    const friday = mine.find((ladder) => ladder.name === 'Friday pool')
    const lunch = mine.find((ladder) => ladder.name === 'Lunch table tennis')
    if (!friday || !lunch) throw new Error('Seeded Ladders are missing')

    const board = await listLeaderboard(friday.id, client)
    expect(board.map((entry) => entry.displayName).sort()).toEqual([
      'Alex',
      'Jordan',
      'Sam',
      'Taylor',
    ])
    expect(board.map((entry) => entry.rank).sort()).toEqual([1, 2, 3, 4])
    expect(board.find((entry) => entry.displayName === 'Taylor')?.provisional).toBe(true)
    expect(board.filter((entry) => entry.displayName !== 'Taylor').every((entry) => !entry.provisional)).toBe(true)

    const inactive = await listInactiveMembers(friday.id, client)
    expect(inactive.map((member) => member.displayName)).toEqual(['Morgan'])
    const morgan = inactive[0]
    if (!morgan) throw new Error('Morgan is missing')
    expect(daysAgo(morgan.lastActiveAt)).toBeGreaterThan(44)
    expect(daysAgo(morgan.lastActiveAt)).toBeLessThan(46)

    const roster = await listRoster(friday.id, client)
    expect(roster.find((member) => member.displayName === 'Riley')?.status).toBe('left')
    expect(roster.find((member) => member.displayName === 'Casey')?.status).toBe('removed')
    const fridayMembers = await listLadderMembers(friday.id, client)
    const lunchMembers = await listLadderMembers(lunch.id, client)
    expect(fridayMembers.find((member) => member.displayName === 'Sam')?.role).toBe('admin')
    expect(lunchMembers.find((member) => member.displayName === 'Sam')?.role).toBe('admin')

    const matches = await listMatches(friday.id, client)
    const confirmed = matches.filter((match) => match.status === 'confirmed')
    const recent = confirmed.filter((match) => daysAgo(match.confirmedAt ?? '') <= 40)
    expect(recent).toHaveLength(15)
    expect(recent.some((match) => match.result === 'draw')).toBe(true)
    expect(recent.filter((match) => match.notes).length).toBeGreaterThanOrEqual(2)
    expect(
      recent.filter((match) => {
        const sideA = match.participants.filter((participant) => participant.side === 'a')
        const sideB = match.participants.filter((participant) => participant.side === 'b')
        return sideA.length === 2 && sideB.length === 2
      }),
    ).toHaveLength(2)

    const rejected = matches.filter((match) => match.status === 'voided' && match.voidKind === 'rejected')
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.confirmedAt).toBeNull()

    const voidedByAdmin = matches.filter((match) => match.status === 'voided' && match.voidKind === 'admin')
    expect(voidedByAdmin).toHaveLength(1)
    expect(voidedByAdmin[0]?.voidedBy).toBe(samId)
    expect(voidedByAdmin[0]?.confirmedAt).toEqual(expect.any(String))

    const waitingForAlex = await listMatchesWaitingForMe(friday.id, alex.client)
    const waitingForSam = await listMatchesWaitingForMe(friday.id, client)
    expect(waitingForAlex).toHaveLength(1)
    expect(waitingForSam).toHaveLength(1)
    expect(waitingForAlex[0]?.recordedBy).not.toBe(alex.userId)
    expect(waitingForSam[0]?.recordedBy).toBe(alex.userId)
    expect(waitingForAlex[0]?.recordedAt).not.toBe(waitingForSam[0]?.recordedAt)

    const lunchRoster = await listRoster(lunch.id, client)
    expect(lunchRoster.map((member) => member.displayName).sort()).toEqual(['Alex', 'Sam'])
    expect(lunchRoster.find((member) => member.displayName === 'Sam')?.status).toBe('active')
    expect(await listLeaderboard(lunch.id, client)).toHaveLength(2)
    expect(await listInactiveMembers(lunch.id, client)).toEqual([])
    expect(await listMatches(lunch.id, client)).toEqual([])
  })

  it('keeps Ratings equal to a Replay, with history adding up to the current Rating', async () => {
    const { client } = await signInSeed('sam@example.com')
    const startingRows = await query<{ starting_rating: number }>(
      `select starting_rating from public.rating_constants()`,
    )
    const starting = startingRows[0]?.starting_rating
    if (starting == null) throw new Error('Missing starting Rating')

    const ladders = await listMyLadders(client)
    for (const ladder of ladders) {
      const before = await listRoster(ladder.id, client)
      await query(`select private.replay_ladder($1::uuid)`, [ladder.id])
      const after = await listRoster(ladder.id, client)

      expect(after.map((member) => [member.id, member.rating, member.ratedMatchCount])).toEqual(
        before.map((member) => [member.id, member.rating, member.ratedMatchCount]),
      )

      for (const member of after) {
        const history = await query<{
          rating_before: number
          rating_change: number
        }>(
          `select rating_before, rating_change
           from public.rating_history
           where ladder_member_id = $1::uuid
           order by confirmed_at asc, match_id asc`,
          [member.id],
        )
        let rating = starting
        for (const entry of history) {
          expect(Number(entry.rating_before)).toBeCloseTo(rating, 5)
          rating += Number(entry.rating_change)
        }
        expect(rating).toBeCloseTo(member.rating, 5)
        expect(history).toHaveLength(member.ratedMatchCount)
      }
    }

    const friday = ladders.find((ladder) => ladder.name === 'Friday pool')
    if (!friday) throw new Error('Friday pool is missing')
    const roster = await listRoster(friday.id, client)
    for (const name of ['Riley', 'Casey']) {
      const member = roster.find((entry) => entry.displayName === name)
      if (!member) throw new Error(`${name} is missing`)
      expect(member.ratedMatchCount).toBeGreaterThan(0)
      const history = await query(
        `select match_id from public.rating_history where ladder_member_id = $1::uuid`,
        [member.id],
      )
      expect(history).toHaveLength(member.ratedMatchCount)
    }
  })
})
