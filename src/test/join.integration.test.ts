// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createProfile } from '@/data/profile'
import {
  createLadder,
  fetchShareToken,
  listLadderMembers,
  listLadders,
  listLeaderboard,
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
})
