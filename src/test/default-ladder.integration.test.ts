// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchProfile } from '@/data/profile'
import { createProfile } from '@/data/profile'
import {
  createLadder,
  deleteLadder,
  fetchShareToken,
  joinLadder,
  leaveLadder,
  listRoster,
  reinstateLadderMember,
  removeLadderMember,
  setDefaultLadder,
} from '@/data/ladder'
import type { Database } from '@/types/db'
import {
  createTestUser,
  deleteTestUser,
  query,
  serviceRole,
  setSuperAdmin,
  signInAs,
  type TestUser,
} from './harness'

type Person = {
  user: TestUser
  client: SupabaseClient<Database>
}

describe('Default Ladder', () => {
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
    return { user, client }
  }

  async function defaultOf(person: Person) {
    return (await fetchProfile(person.user.id, person.client))?.defaultLadderId ?? null
  }

  async function memberId(ladderId: string, name: string, client: SupabaseClient<Database>) {
    const roster = await listRoster(ladderId, client)
    const member = roster.find((entry) => entry.displayName === name)
    if (!member) throw new Error(`Missing Ladder member ${name}`)
    return member.id
  }

  it('sets the Default Ladder on a first create or join', async () => {
    const admin = await person('Sam')
    const joiner = await person('Priya')
    const createdLadder = await createLadder('Friday pool', admin.client)

    expect(await defaultOf(admin)).toBe(createdLadder.id)

    const token = await fetchShareToken(createdLadder.id, admin.client)
    await joinLadder(token, joiner.client)

    expect(await defaultOf(joiner)).toBe(createdLadder.id)
  })

  it('moves the Default Ladder when p_make_default is set, and leaves it when not', async () => {
    const admin = await person('Sam')
    const joiner = await person('Priya')
    const first = await createLadder('Friday pool', admin.client)
    const token = await fetchShareToken(first.id, admin.client)
    await joinLadder(token, joiner.client)

    const second = await createLadder('Saturday pool', { client: admin.client, makeDefault: false })
    expect(await defaultOf(admin)).toBe(first.id)

    const third = await createLadder('Sunday pool', { client: admin.client, makeDefault: true })
    expect(await defaultOf(admin)).toBe(third.id)

    await joinLadder(await fetchShareToken(second.id, admin.client), {
      client: joiner.client,
      makeDefault: false,
    })
    expect(await defaultOf(joiner)).toBe(first.id)

    await joinLadder(await fetchShareToken(third.id, admin.client), {
      client: joiner.client,
      makeDefault: true,
    })
    expect(await defaultOf(joiner)).toBe(third.id)
  })

  it('refuses set_default_ladder for a Ladder the caller is not Joined to', async () => {
    const admin = await person('Sam')
    const outsider = await person('Priya')
    const ladder = await createLadder('Friday pool', admin.client)
    await createLadder('Priya pool', outsider.client)

    await expect(setDefaultLadder(ladder.id, outsider.client)).rejects.toThrow(/Joined/i)
    expect(await defaultOf(outsider)).not.toBe(ladder.id)

    const own = await createLadder('Saturday pool', admin.client)
    await setDefaultLadder(own.id, admin.client)
    expect(await defaultOf(admin)).toBe(own.id)
  })

  it('settles the Default Ladder on leave, to null or to the one remaining Ladder', async () => {
    const admin = await person('Sam')
    const only = await person('Priya')
    const several = await person('Alex')
    const friday = await createLadder('Friday pool', admin.client)
    const token = await fetchShareToken(friday.id, admin.client)

    await joinLadder(token, only.client)
    await leaveLadder(friday.id, only.client)
    expect(await defaultOf(only)).toBeNull()

    const own = await createLadder('Alex pool', several.client)
    await joinLadder(token, several.client)
    expect(await defaultOf(several)).toBe(own.id)

    await leaveLadder(own.id, several.client)
    expect(await defaultOf(several)).toBe(friday.id)
  })

  it('settles the Default Ladder on Remove, to null or to the one remaining Ladder', async () => {
    const admin = await person('Sam')
    const only = await person('Priya')
    const several = await person('Alex')
    const friday = await createLadder('Friday pool', admin.client)
    const token = await fetchShareToken(friday.id, admin.client)

    await joinLadder(token, only.client)
    await removeLadderMember(await memberId(friday.id, 'Priya', admin.client), admin.client)
    expect(await defaultOf(only)).toBeNull()

    const own = await createLadder('Alex pool', several.client)
    await joinLadder(token, { client: several.client, makeDefault: true })
    expect(await defaultOf(several)).toBe(friday.id)

    await removeLadderMember(await memberId(friday.id, 'Alex', admin.client), admin.client)
    expect(await defaultOf(several)).toBe(own.id)
  })

  it('settles the Default Ladder on Delete, to null or to the one remaining Ladder', async () => {
    const admin = await person('Sam')
    await setSuperAdmin(admin.user.id, true)
    const only = await person('Priya')
    const several = await person('Alex')

    const sole = await createLadder('Only pool', only.client)
    await deleteLadder(sole.id, admin.client)
    expect(await defaultOf(only)).toBeNull()

    const kept = await createLadder('Kept pool', several.client)
    const dropped = await createLadder('Dropped pool', { client: several.client, makeDefault: true })
    await deleteLadder(dropped.id, admin.client)
    expect(await defaultOf(several)).toBe(kept.id)
  })

  it('settles the Default Ladder on Reinstate when that leaves exactly one Ladder', async () => {
    const admin = await person('Sam')
    const player = await person('Priya')
    const ladder = await createLadder('Friday pool', admin.client)
    const token = await fetchShareToken(ladder.id, admin.client)
    await joinLadder(token, player.client)
    const priya = await memberId(ladder.id, 'Priya', admin.client)

    await removeLadderMember(priya, admin.client)
    expect(await defaultOf(player)).toBeNull()

    await reinstateLadderMember(priya, admin.client)
    expect(await defaultOf(player)).toBe(ladder.id)
  })

  it('backfills a Default Ladder for a single Ladder and leaves two or more unset', async () => {
    const single = await person('Sam')
    const many = await person('Priya')
    const only = await createLadder('Friday pool', single.client)
    const first = await createLadder('Saturday pool', many.client)
    await createLadder('Sunday pool', many.client)

    const { error } = await serviceRole()
      .from('profiles')
      .update({ default_ladder_id: null })
      .in('id', [single.user.id, many.user.id])
    if (error) throw new Error(error.message)

    await query('select private.settle_default_ladder($1::uuid)', [single.user.id])
    await query('select private.settle_default_ladder($1::uuid)', [many.user.id])

    expect(await defaultOf(single)).toBe(only.id)
    expect(await defaultOf(many)).toBeNull()
    expect(first.id).not.toBe(only.id)
  })
})
