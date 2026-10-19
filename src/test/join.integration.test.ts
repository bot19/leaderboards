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
import { createTestUser, deleteTestUser, signInAs } from './harness'

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
    expect(await listLadderMembers(ladder.id, joinerClient)).toEqual([
      {
        displayName: 'Sam',
        role: 'admin',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
      {
        displayName: 'Priya',
        role: 'player',
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
})
