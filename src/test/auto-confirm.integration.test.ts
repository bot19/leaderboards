// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listMatches, recordMatch } from '@/data/match'
import { createProfile } from '@/data/profile'
import { createLadder, listRoster } from '@/data/ladder'
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

async function confirmExpiredAsOf(asOf: string) {
  await query(`select private.confirm_expired_pending_matches($1::timestamptz)`, [asOf])
}

async function backdateRecordedAt(matchId: string, recordedAt: string) {
  const { error } = await serviceRole()
    .from('matches')
    .update({ recorded_at: recordedAt })
    .eq('id', matchId)
  if (error) throw new Error(error.message)
}

function minutesBefore(asOf: Date, minutes: number): string {
  return new Date(asOf.getTime() - minutes * 60 * 1000).toISOString()
}

describe('auto-confirm after the Confirmation window', () => {
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

  it('reads the Confirmation window from the tunable constants', async () => {
    const rows = await query<{ confirmation_window_minutes: number }>(
      `select confirmation_window_minutes from public.rating_constants()`,
    )

    expect(rows[0]?.confirmation_window_minutes).toBe(30)
  })

  it('schedules pg_cron to confirm expired Pending Matches', async () => {
    const rows = await query<{ jobname: string; schedule: string; command: string }>(
      `select jobname, schedule, command from cron.job
       where jobname = 'confirm-expired-pending-matches'`,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]?.command).toMatch(/confirm_expired_pending_matches/)
    expect(rows[0]?.command).toMatch(/now\s*\(/i)
  })

  it('leaves a Match inside the Confirmation window Pending', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const asOf = new Date('2026-06-01T12:00:00.000Z')
    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await backdateRecordedAt(match.id, minutesBefore(asOf, 29))

    await confirmExpiredAsOf(asOf.toISOString())

    const listed = await listMatches(ladder.id, who('Sam').client)
    expect(listed[0]).toMatchObject({ id: match.id, status: 'pending', confirmedAt: null })
    expect((await listRoster(ladder.id, who('Sam').client)).every((member) => member.rating === 1000)).toBe(
      true,
    )
  })

  it('confirms an expired Pending Match and rates it through the rating module', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya')
    const asOf = new Date('2026-06-01T12:00:00.000Z')
    const recordedAt = minutesBefore(asOf, 31)
    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    await backdateRecordedAt(match.id, recordedAt)

    await confirmExpiredAsOf(asOf.toISOString())

    const changes = await ratingChanges(
      [{ key: 'sam', rating: 1000, ratedMatchCount: 0 }],
      [{ key: 'priya', rating: 1000, ratedMatchCount: 0 }],
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

    const confirmed = (await listMatches(ladder.id, who('Sam').client))[0]
    expect(confirmed?.id).toBe(match.id)
    expect(confirmed?.status).toBe('confirmed')
    expect(new Date(confirmed?.confirmedAt ?? '').getTime()).toBe(
      new Date(recordedAt).getTime() + 30 * 60 * 1000,
    )
    expect(confirmed?.participants.find((participant) => participant.displayName === 'Sam')).toMatchObject({
      ratingBefore: 1000,
      ratingChange: samChange,
    })
  })

  it('rates several expired Matches in expiry order', async () => {
    const { ladder, idOf, who } = await ladderWith('Sam', 'Priya', 'Alex')
    await setStats(ladder.id, who('Sam').user.id, { rating: 1400, ratedMatchCount: 12 })
    await setStats(ladder.id, who('Priya').user.id, { rating: 1600, ratedMatchCount: 12 })
    await setStats(ladder.id, who('Alex').user.id, { rating: 1000, ratedMatchCount: 12 })

    const asOf = new Date('2026-06-01T12:00:00.000Z')
    const older = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Priya')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    const newer = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [idOf('Sam')],
        sideB: [idOf('Alex')],
        result: 'side_a_won',
      },
      who('Sam').client,
    )
    // Newer Match expired first (recorded earlier relative to the window).
    await backdateRecordedAt(newer.id, minutesBefore(asOf, 40))
    await backdateRecordedAt(older.id, minutesBefore(asOf, 35))

    await confirmExpiredAsOf(asOf.toISOString())

    const firstChanges = await ratingChanges(
      [{ key: 'sam', rating: 1400, ratedMatchCount: 12 }],
      [{ key: 'alex', rating: 1000, ratedMatchCount: 12 }],
      'side_a_won',
    )
    const samAfterFirst = 1400 + (firstChanges.sam ?? 0)
    const secondChanges = await ratingChanges(
      [{ key: 'sam', rating: samAfterFirst, ratedMatchCount: 13 }],
      [{ key: 'priya', rating: 1600, ratedMatchCount: 12 }],
      'side_a_won',
    )

    const roster = await listRoster(ladder.id, who('Sam').client)
    const sam = roster.find((member) => member.displayName === 'Sam')
    const priya = roster.find((member) => member.displayName === 'Priya')
    const alex = roster.find((member) => member.displayName === 'Alex')
    expect(sam?.rating).toBeCloseTo(samAfterFirst + (secondChanges.sam ?? 0), 6)
    expect(priya?.rating).toBeCloseTo(1600 + (secondChanges.priya ?? 0), 6)
    expect(alex?.rating).toBeCloseTo(1000 + (firstChanges.alex ?? 0), 6)

    const matches = await listMatches(ladder.id, who('Sam').client)
    const confirmedNewer = matches.find((match) => match.id === newer.id)
    const confirmedOlder = matches.find((match) => match.id === older.id)
    expect(confirmedNewer?.status).toBe('confirmed')
    expect(confirmedOlder?.status).toBe('confirmed')
    expect(confirmedNewer?.confirmedAt).toEqual(expect.any(String))
    expect(confirmedOlder?.confirmedAt).toEqual(expect.any(String))
    if (!confirmedNewer?.confirmedAt || !confirmedOlder?.confirmedAt) {
      throw new Error('Expected confirmed-at on both Matches')
    }
    expect(confirmedNewer.confirmedAt < confirmedOlder.confirmedAt).toBe(true)
  })

  it('refuses client calls to the internal confirm-expired function', async () => {
    const { who } = await ladderWith('Sam', 'Priya')
    const asOf = '2026-06-01T12:00:00.000Z'
    const rpc = 'confirm_expired_pending_matches'
    const args = { p_as_of: asOf }

    const { error: authenticatedError } = await who('Sam').client.rpc(rpc as 'confirm_match', args as never)
    expect(authenticatedError).toBeTruthy()

    const { error: serviceError } = await serviceRole().rpc(rpc as 'confirm_match', args as never)
    expect(serviceError).toBeTruthy()
  })
})
