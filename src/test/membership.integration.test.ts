// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { listMatches, recordMatch } from '@/data/match'
import { createProfile } from '@/data/profile'
import {
  createLadder,
  deleteLadder,
  fetchShareToken,
  joinLadder,
  leaveLadder,
  listLadderMembers,
  listLadders,
  listLeaderboard,
  listMyLadders,
  listRoster,
  reinstateLadderMember,
  removeLadderMember,
  setLadderMemberRole,
} from '@/data/ladder'
import type { Database } from '@/types/db'
import {
  createTestUser,
  deleteTestUser,
  serviceRole,
  setSuperAdmin,
  signInAs,
  type TestUser,
} from './harness'

type Person = {
  name: string
  user: TestUser
  client: SupabaseClient<Database>
}

describe('membership and roles', () => {
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

  async function ladderWithAdminAndPlayer() {
    const admin = await person('Sam')
    const player = await person('Priya')
    const ladder = await createLadder('Friday pool', admin.client)
    const token = await fetchShareToken(ladder.id, admin.client)
    await joinLadder(token, player.client)
    const roster = await listRoster(ladder.id, admin.client)
    const memberId = (name: string) => {
      const member = roster.find((entry) => entry.displayName === name)
      if (!member) throw new Error(`Missing Ladder member ${name}`)
      return member.id
    }
    return { admin, player, ladder, token, memberId }
  }

  async function setRating(ladderId: string, userId: string, rating: number) {
    const { error } = await serviceRole()
      .from('ladder_members')
      .update({ rating })
      .eq('ladder_id', ladderId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  it('lets a Ladder member leave, then rejoin by Share link and keep their Rating', async () => {
    const { admin, player, ladder, token } = await ladderWithAdminAndPlayer()
    await setRating(ladder.id, player.user.id, 1180)

    await leaveLadder(ladder.id, player.client)

    expect(
      (await listLadderMembers(ladder.id, admin.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'left', rating: 1180, role: 'player' })
    expect(await listLeaderboard(ladder.id, admin.client)).toEqual([
      { displayName: 'Sam', rating: 1000 },
    ])
    expect(await listMyLadders(player.client)).toEqual([])

    await expect(joinLadder(token, player.client)).resolves.toEqual({ outcome: 'joined' })

    expect(
      (await listLadderMembers(ladder.id, player.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'active', rating: 1180, role: 'player' })
    expect(await listMyLadders(player.client)).toEqual([
      { id: ladder.id, name: 'Friday pool', gameName: 'pool' },
    ])
  })

  it('lets the last Admin leave a Ladder', async () => {
    const admin = await person('Sam')
    const ladder = await createLadder('Friday pool', admin.client)

    await leaveLadder(ladder.id, admin.client)

    expect(await listMyLadders(admin.client)).toEqual([])
    expect(
      (await listLadderMembers(ladder.id, admin.client)).find(
        (member) => member.displayName === 'Sam',
      ),
    ).toMatchObject({ status: 'left', role: 'admin' })
  })

  it('keeps Matches in history after a Ladder member leaves or is Removed', async () => {
    const { admin, player, ladder, token, memberId } = await ladderWithAdminAndPlayer()
    const match = await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [memberId('Sam')],
        sideB: [memberId('Priya')],
        result: 'side_a_won',
      },
      admin.client,
    )

    await leaveLadder(ladder.id, player.client)
    expect((await listMatches(ladder.id, admin.client)).map((row) => row.id)).toEqual([match.id])
    expect(await listLeaderboard(ladder.id, admin.client)).toEqual([
      { displayName: 'Sam', rating: 1000 },
    ])

    await joinLadder(token, player.client)
    await removeLadderMember(memberId('Priya'), admin.client)
    expect(
      (await listLadderMembers(ladder.id, admin.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'removed' })
    expect((await listMatches(ladder.id, admin.client)).map((row) => row.id)).toEqual([match.id])
    expect(await listLeaderboard(ladder.id, admin.client)).toEqual([
      { displayName: 'Sam', rating: 1000 },
    ])
  })

  it('lets an Admin remove a Player, who cannot rejoin until reinstated', async () => {
    const { admin, player, ladder, token, memberId } = await ladderWithAdminAndPlayer()
    await setRating(ladder.id, player.user.id, 1125)

    await removeLadderMember(memberId('Priya'), admin.client)

    expect(
      (await listLadderMembers(ladder.id, admin.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'removed', rating: 1125 })
    expect(await listLeaderboard(ladder.id, admin.client)).toEqual([
      { displayName: 'Sam', rating: 1000 },
    ])
    await expect(joinLadder(token, player.client)).rejects.toThrow(/removed/i)

    await reinstateLadderMember(memberId('Priya'), admin.client)

    expect(
      (await listLadderMembers(ladder.id, admin.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'active', rating: 1125, role: 'player' })
    await expect(joinLadder(token, player.client)).resolves.toEqual({ outcome: 'joined' })
  })

  it('refuses remove, reinstate and set-Role from a Player', async () => {
    const { admin, player, ladder, memberId } = await ladderWithAdminAndPlayer()
    const other = await person('Alex')
    const token = await fetchShareToken(ladder.id, admin.client)
    await joinLadder(token, other.client)
    const roster = await listRoster(ladder.id, admin.client)
    const alexId = roster.find((entry) => entry.displayName === 'Alex')?.id
    if (!alexId) throw new Error('Missing Alex')

    await expect(removeLadderMember(alexId, player.client)).rejects.toThrow(/active Admin/i)
    await removeLadderMember(alexId, admin.client)
    await expect(reinstateLadderMember(alexId, player.client)).rejects.toThrow(/active Admin/i)
    await expect(setLadderMemberRole(memberId('Sam'), 'player', player.client)).rejects.toThrow(
      /active Admin/i,
    )
  })

  it('lets an Admin appoint and demote an Admin', async () => {
    const { admin, player, ladder, memberId } = await ladderWithAdminAndPlayer()

    await setLadderMemberRole(memberId('Priya'), 'admin', admin.client)
    expect(
      (await listLadderMembers(ladder.id, admin.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ role: 'admin', status: 'active' })

    await setLadderMemberRole(memberId('Priya'), 'player', admin.client)
    expect(
      (await listLadderMembers(ladder.id, player.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ role: 'player', status: 'active' })
  })

  it('lets a super admin who is not a Ladder member run every Admin action', async () => {
    const { player, ladder, token, memberId } = await ladderWithAdminAndPlayer()
    const keeper = await person('Keeper')
    await setSuperAdmin(keeper.user.id, true)

    await removeLadderMember(memberId('Priya'), keeper.client)
    expect(
      (await listLadderMembers(ladder.id, keeper.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'removed' })
    await expect(joinLadder(token, player.client)).rejects.toThrow(/removed/i)

    await reinstateLadderMember(memberId('Priya'), keeper.client)
    expect(
      (await listLadderMembers(ladder.id, keeper.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ status: 'active' })

    await setLadderMemberRole(memberId('Priya'), 'admin', keeper.client)
    expect(
      (await listLadderMembers(ladder.id, keeper.client)).find(
        (member) => member.displayName === 'Priya',
      ),
    ).toMatchObject({ role: 'admin' })

    await setLadderMemberRole(memberId('Sam'), 'player', keeper.client)
    expect(
      (await listLadderMembers(ladder.id, keeper.client)).find(
        (member) => member.displayName === 'Sam',
      ),
    ).toMatchObject({ role: 'player' })

    await expect(leaveLadder(ladder.id, keeper.client)).rejects.toThrow(/active/i)
    expect(await listMyLadders(keeper.client)).toEqual([])
    expect(await listLadders(keeper.client)).toContainEqual({
      id: ladder.id,
      name: 'Friday pool',
      gameName: 'pool',
      joinPolicy: 'open',
    })
  })

  it('lets only the super admin delete a Ladder and all of its data', async () => {
    const { admin, player, ladder, memberId } = await ladderWithAdminAndPlayer()
    await recordMatch(
      {
        ladderId: ladder.id,
        sideA: [memberId('Sam')],
        sideB: [memberId('Priya')],
        result: 'side_a_won',
      },
      admin.client,
    )
    const keeper = await person('Keeper')
    await setSuperAdmin(keeper.user.id, true)

    await expect(deleteLadder(ladder.id, admin.client)).rejects.toThrow(/super admin/i)
    await expect(deleteLadder(ladder.id, player.client)).rejects.toThrow(/super admin/i)

    await deleteLadder(ladder.id, keeper.client)

    expect(await listLadders(keeper.client)).not.toContainEqual(
      expect.objectContaining({ id: ladder.id }),
    )
    expect(await listMyLadders(admin.client)).toEqual([])
    const { count, error } = await serviceRole()
      .from('ladder_members')
      .select('*', { count: 'exact', head: true })
      .eq('ladder_id', ladder.id)
    if (error) throw new Error(error.message)
    expect(count).toBe(0)
    const matches = await serviceRole()
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('ladder_id', ladder.id)
    if (matches.error) throw new Error(matches.error.message)
    expect(matches.count).toBe(0)
  })
})
