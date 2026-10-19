// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createProfile } from '@/data/profile'
import {
  createLadder,
  fetchShareToken,
  joinLadder,
  listLadderMembers,
  listLadders,
  listLeaderboard,
  listMyLadders,
  previewLadder,
} from '@/data/ladder'
import { createTestUser, deleteTestUser, signInAs, addLadderPlayer } from './harness'

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
        displayName: 'Priya',
        role: 'player',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
      {
        displayName: 'Sam',
        role: 'admin',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
    ])
    expect(await listLeaderboard(ladder.id, joinerClient)).toEqual([
      { displayName: 'Priya', rating: 1000 },
      { displayName: 'Sam', rating: 1000 },
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
      displayName: 'Banned',
      role: 'player',
      status: 'removed',
      rating: 1100,
      ratedMatchCount: 0,
      lastMatchAt: null,
    })
  })
})
