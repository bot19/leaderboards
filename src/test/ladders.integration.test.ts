// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createProfile } from '@/data/profile'
import {
  assertActiveLadderAdmin,
  createLadder,
  listLadderMembers,
  listLadders,
  listLeaderboard,
  listMyLadders,
} from '@/data/ladder'
import {
  addLadderPlayer,
  createTestUser,
  deleteTestUser,
  setSuperAdmin,
  signInAs,
} from './harness'

describe('creating a Ladder', () => {
  const created: string[] = []

  afterEach(async () => {
    while (created.length > 0) {
      const id = created.pop()
      if (id) await deleteTestUser(id)
    }
  })

  it('makes the caller its Admin at the starting Rating', async () => {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)
    await createProfile('Sam', client)

    const ladder = await createLadder('Friday pool', client)

    expect(await listLadders(client)).toEqual([
      {
        id: ladder.id,
        name: 'Friday pool',
        gameName: 'pool',
        joinPolicy: 'open',
      },
    ])
    expect(await listLadderMembers(ladder.id, client)).toEqual([
      {
        displayName: 'Sam',
        role: 'admin',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
    ])
  })

  it('hides the Ladder and its Ladder members from an outsider', async () => {
    const admin = await createTestUser()
    const outsider = await createTestUser()
    created.push(admin.id, outsider.id)
    const adminClient = await signInAs(admin)
    const outsiderClient = await signInAs(outsider)
    await createProfile('Sam', adminClient)
    await createProfile('Outsider', outsiderClient)
    const ladder = await createLadder('Friday pool', adminClient)

    expect(await listLadders(outsiderClient)).toEqual([])
    expect(await listLadderMembers(ladder.id, outsiderClient)).toEqual([])
    expect(await listLeaderboard(ladder.id, outsiderClient)).toEqual([])
  })

  it('lets the super admin read a Ladder they do not belong to', async () => {
    const admin = await createTestUser()
    const superAdmin = await createTestUser()
    created.push(admin.id, superAdmin.id)
    const adminClient = await signInAs(admin)
    const superClient = await signInAs(superAdmin)
    await createProfile('Sam', adminClient)
    await createProfile('Keeper', superClient)
    await setSuperAdmin(superAdmin.id, true)
    const ladder = await createLadder('Friday pool', adminClient)

    expect(await listLadders(superClient)).toContainEqual({
      id: ladder.id,
      name: 'Friday pool',
      gameName: 'pool',
      joinPolicy: 'open',
    })
    expect(await listLadderMembers(ladder.id, superClient)).toEqual([
      {
        displayName: 'Sam',
        role: 'admin',
        status: 'active',
        rating: 1000,
        ratedMatchCount: 0,
        lastMatchAt: null,
      },
    ])
  })

  it('accepts an active Admin and the super admin, and refuses a Player and an outsider', async () => {
    const admin = await createTestUser()
    const player = await createTestUser()
    const outsider = await createTestUser()
    const superAdmin = await createTestUser()
    created.push(admin.id, player.id, outsider.id, superAdmin.id)

    const adminClient = await signInAs(admin)
    const playerClient = await signInAs(player)
    const outsiderClient = await signInAs(outsider)
    const superClient = await signInAs(superAdmin)

    await createProfile('Sam', adminClient)
    await createProfile('Priya', playerClient)
    await createProfile('Outsider', outsiderClient)
    await createProfile('Keeper', superClient)
    await setSuperAdmin(superAdmin.id, true)

    const ladder = await createLadder('Friday pool', adminClient)
    await addLadderPlayer(ladder.id, player.id)

    await expect(assertActiveLadderAdmin(ladder.id, adminClient)).resolves.toBeUndefined()
    await expect(assertActiveLadderAdmin(ladder.id, superClient)).resolves.toBeUndefined()
    await expect(assertActiveLadderAdmin(ladder.id, playerClient)).rejects.toThrow(
      /active Admin/i,
    )
    await expect(assertActiveLadderAdmin(ladder.id, outsiderClient)).rejects.toThrow(
      /active Admin/i,
    )
  })

  it('lists active Ladder members on the Leaderboard in Rating order', async () => {
    const admin = await createTestUser()
    const higher = await createTestUser()
    const lower = await createTestUser()
    const left = await createTestUser()
    created.push(admin.id, higher.id, lower.id, left.id)

    const adminClient = await signInAs(admin)
    const higherClient = await signInAs(higher)
    const lowerClient = await signInAs(lower)
    const leftClient = await signInAs(left)
    await createProfile('Sam', adminClient)
    await createProfile('Priya', higherClient)
    await createProfile('Alex', lowerClient)
    await createProfile('Gone', leftClient)

    const ladder = await createLadder('Friday pool', adminClient)
    await addLadderPlayer(ladder.id, higher.id, { rating: 1200 })
    await addLadderPlayer(ladder.id, lower.id, { rating: 900 })
    await addLadderPlayer(ladder.id, left.id, { rating: 1500, status: 'left' })

    expect(await listLeaderboard(ladder.id, adminClient)).toEqual([
      { displayName: 'Priya', rating: 1200 },
      { displayName: 'Sam', rating: 1000 },
      { displayName: 'Alex', rating: 900 },
    ])
  })

  it('lists the Ladders a User belongs to, and not every Ladder a super admin can read', async () => {
    const admin = await createTestUser()
    const superAdmin = await createTestUser()
    created.push(admin.id, superAdmin.id)
    const adminClient = await signInAs(admin)
    const superClient = await signInAs(superAdmin)
    await createProfile('Sam', adminClient)
    await createProfile('Keeper', superClient)
    await setSuperAdmin(superAdmin.id, true)
    const ladder = await createLadder('Friday pool', adminClient)

    expect(await listMyLadders(adminClient)).toEqual([
      { id: ladder.id, name: 'Friday pool', gameName: 'pool' },
    ])
    expect(await listMyLadders(superClient)).toEqual([])
    expect(await listLadders(superClient)).toContainEqual({
      id: ladder.id,
      name: 'Friday pool',
      gameName: 'pool',
      joinPolicy: 'open',
    })
  })
})
