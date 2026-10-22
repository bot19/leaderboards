// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createProfile } from '@/data/profile'
import {
  createLadder,
  fetchLadderIdByShareToken,
  fetchShareToken,
  joinLadder,
  listLadderMembers,
  listLadders,
  listLeaderboard,
  listMyLadders,
  previewLadder,
} from '@/data/ladder'
import {
  addLadderPlayer,
  createTestUser,
  deleteTestUser,
  query,
  signInAs,
  signedOutClient,
} from './harness'

describe('joining a Ladder from its Share link', () => {
  const created: string[] = []

  afterEach(async () => {
    while (created.length > 0) {
      const id = created.pop()
      if (id) await deleteTestUser(id)
    }
  })

  it('lets an outsider preview a Ladder by its Share link, and nothing else', async () => {
    const admin = await createTestUser()
    const outsider = await createTestUser()
    created.push(admin.id, outsider.id)
    const adminClient = await signInAs(admin)
    const outsiderClient = await signInAs(outsider)
    await createProfile('Sam', adminClient)
    await createProfile('Outsider', outsiderClient)
    const ladder = await createLadder('Friday pool', adminClient)
    const token = await fetchShareToken(ladder.id, adminClient)

    expect(await previewLadder(token, outsiderClient)).toEqual({
      name: 'Friday pool',
      gameName: 'pool',
      memberCount: 1,
    })
    expect(await listLadders(outsiderClient)).toEqual([])
    expect(await listLadderMembers(ladder.id, outsiderClient)).toEqual([])
    expect(await listLeaderboard(ladder.id, outsiderClient)).toEqual([])
  })

  it('refuses a Share link that matches no Ladder', async () => {
    const outsider = await createTestUser()
    created.push(outsider.id)
    const outsiderClient = await signInAs(outsider)
    await createProfile('Outsider', outsiderClient)

    await expect(previewLadder('not-a-share-link', outsiderClient)).rejects.toThrow(
      /share link/i,
    )
  })

  it('joins a new User as an active Player at the starting Rating', async () => {
    const admin = await createTestUser()
    const joiner = await createTestUser()
    created.push(admin.id, joiner.id)
    const adminClient = await signInAs(admin)
    const joinerClient = await signInAs(joiner)
    await createProfile('Sam', adminClient)
    await createProfile('Priya', joinerClient)
    const ladder = await createLadder('Friday pool', adminClient)
    const token = await fetchShareToken(ladder.id, adminClient)

    await expect(joinLadder(token, joinerClient)).resolves.toEqual({ outcome: 'joined' })

    expect(await listMyLadders(joinerClient)).toEqual([
      { id: ladder.id, name: 'Friday pool', gameName: 'pool' },
    ])
    expect(
      (await listLadderMembers(ladder.id, joinerClient)).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    ).toEqual([
      {
        id: expect.any(String),
        userId: joiner.id,
        displayName: 'Priya',
        role: 'player',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
      {
        id: expect.any(String),
        userId: admin.id,
        displayName: 'Sam',
        role: 'admin',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
    ])
    expect(await listLeaderboard(ladder.id, joinerClient)).toEqual([
      expect.objectContaining({ displayName: 'Priya', rating: 1000, rank: 1 }),
      expect.objectContaining({ displayName: 'Sam', rating: 1000, rank: 2 }),
    ])
  })

  it('rejoins a Left Ladder member and keeps their Rating', async () => {
    const admin = await createTestUser()
    const left = await createTestUser()
    created.push(admin.id, left.id)
    const adminClient = await signInAs(admin)
    const leftClient = await signInAs(left)
    await createProfile('Sam', adminClient)
    await createProfile('Gone', leftClient)
    const ladder = await createLadder('Friday pool', adminClient)
    await addLadderPlayer(ladder.id, left.id, { rating: 1200, status: 'left' })
    const token = await fetchShareToken(ladder.id, adminClient)

    await expect(joinLadder(token, leftClient)).resolves.toEqual({ outcome: 'joined' })

    expect(
      (await listLadderMembers(ladder.id, leftClient)).find(
        (member) => member.displayName === 'Gone',
      ),
    ).toEqual({
      id: expect.any(String),
      userId: left.id,
      displayName: 'Gone',
      role: 'player',
      status: 'active',
      rating: 1200,
      ratedMatchCount: 0,
      lastMatchAt: null,
    })
  })

  it('refuses a Removed Ladder member', async () => {
    const admin = await createTestUser()
    const removed = await createTestUser()
    created.push(admin.id, removed.id)
    const adminClient = await signInAs(admin)
    const removedClient = await signInAs(removed)
    await createProfile('Sam', adminClient)
    await createProfile('Banned', removedClient)
    const ladder = await createLadder('Friday pool', adminClient)
    await addLadderPlayer(ladder.id, removed.id, { rating: 1100, status: 'removed' })
    const token = await fetchShareToken(ladder.id, adminClient)

    await expect(joinLadder(token, removedClient)).rejects.toThrow(/removed/i)

    expect(
      (await listLadderMembers(ladder.id, adminClient)).find(
        (member) => member.displayName === 'Banned',
      ),
    ).toEqual({
      id: expect.any(String),
      userId: removed.id,
      displayName: 'Banned',
      role: 'player',
      status: 'removed',
      rating: 1100,
      ratedMatchCount: 0,
      lastMatchAt: null,
    })
  })

  it('stores a Join code on create and leaves existing Ladders on one', async () => {
    const admin = await createTestUser()
    created.push(admin.id)
    const adminClient = await signInAs(admin)
    await createProfile('Sam', adminClient)
    const ladder = await createLadder('Friday pool', adminClient)
    const token = await fetchShareToken(ladder.id, adminClient)
    expect(token).toMatch(/^[1-9A-Z]{6}$/)

    const ids = [
      ladder.id,
      '33333333-3333-4333-8333-333333333301',
      '33333333-3333-4333-8333-333333333302',
    ]
    const read = async () => {
      const rows = await query<{ id: string; share_token: string }>(
        'select id, share_token from public.ladders where id = any($1::uuid[])',
        [ids],
      )
      return rows.sort((a, b) => a.id.localeCompare(b.id))
    }

    const before = await read()
    expect(before).toHaveLength(3)
    for (const row of before) {
      expect(row.share_token).toMatch(/^[1-9A-Z]{6}$/)
    }

    await query('select private.backfill_join_codes()')
    expect(await read()).toEqual(before)

    await expect(
      query("update public.ladders set share_token = 'friday-pool' where id = $1", [ladder.id]),
    ).rejects.toThrow(/check constraint/i)
  })

  it('previews and joins a Ladder by Join code in any letter case', async () => {
    const admin = await createTestUser()
    const joiner = await createTestUser()
    created.push(admin.id, joiner.id)
    const adminClient = await signInAs(admin)
    const joinerClient = await signInAs(joiner)
    await createProfile('Sam', adminClient)
    await createProfile('Priya', joinerClient)
    const ladder = await createLadder('Friday pool', adminClient)
    const token = await fetchShareToken(ladder.id, adminClient)
    const messy = ` ${token.toLowerCase()} `

    expect(await previewLadder(messy, joinerClient)).toEqual({
      name: 'Friday pool',
      gameName: 'pool',
      memberCount: 1,
    })
    await expect(joinLadder(messy, joinerClient)).resolves.toEqual({ outcome: 'joined' })
    expect(await fetchLadderIdByShareToken(messy, joinerClient)).toBe(ladder.id)
  })

  it('refuses an unknown Join code', async () => {
    const outsider = await createTestUser()
    created.push(outsider.id)
    const outsiderClient = await signInAs(outsider)
    await createProfile('Outsider', outsiderClient)

    await expect(previewLadder('ZZZZZ9', outsiderClient)).rejects.toThrow(/share link/i)
    await expect(joinLadder('ZZZZZ9', outsiderClient)).rejects.toThrow(/share link/i)
  })

  it('refuses preview_ladder for a signed-out client', async () => {
    const admin = await createTestUser()
    created.push(admin.id)
    const adminClient = await signInAs(admin)
    await createProfile('Sam', adminClient)
    const ladder = await createLadder('Friday pool', adminClient)
    const token = await fetchShareToken(ladder.id, adminClient)

    await expect(previewLadder(token, signedOutClient())).rejects.toThrow(/permission denied/i)
  })

  it('leaves an already-active Ladder member unchanged when they join again', async () => {
    const admin = await createTestUser()
    const joiner = await createTestUser()
    created.push(admin.id, joiner.id)
    const adminClient = await signInAs(admin)
    const joinerClient = await signInAs(joiner)
    await createProfile('Sam', adminClient)
    await createProfile('Priya', joinerClient)
    const ladder = await createLadder('Friday pool', adminClient)
    const token = await fetchShareToken(ladder.id, adminClient)

    await expect(joinLadder(token, joinerClient)).resolves.toEqual({ outcome: 'joined' })
    await expect(joinLadder(token, joinerClient)).resolves.toEqual({ outcome: 'joined' })

    expect(await previewLadder(token, joinerClient)).toEqual({
      name: 'Friday pool',
      gameName: 'pool',
      memberCount: 2,
    })
    expect(
      (await listLadderMembers(ladder.id, joinerClient)).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      ),
    ).toEqual([
      {
        id: expect.any(String),
        userId: joiner.id,
        displayName: 'Priya',
        role: 'player',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
      {
        id: expect.any(String),
        userId: admin.id,
        displayName: 'Sam',
        role: 'admin',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
    ])
  })
})
