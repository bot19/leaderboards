// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { createProfile, fetchProfile, updateDisplayName } from '@/data/profile'
import {
  createTestUser,
  deleteTestUser,
  setSuperAdmin,
  signInAs,
  signedOutClient,
} from './harness'

describe('profile creation', () => {
  const created: string[] = []

  afterEach(async () => {
    while (created.length > 0) {
      const id = created.pop()
      if (id) await deleteTestUser(id)
    }
  })

  it('creates a profile the signed-in User can read', async () => {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)

    await createProfile('Sam', client)

    expect(await fetchProfile(user.id, client)).toEqual({
      id: user.id,
      displayName: 'Sam',
      isSuperAdmin: false,
    })
  })

  it('updates the signed-in User display name', async () => {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)
    await createProfile('Sam', client)

    await updateDisplayName('Sammy', client)

    expect(await fetchProfile(user.id, client)).toEqual({
      id: user.id,
      displayName: 'Sammy',
      isSuperAdmin: false,
    })
  })

  it('refuses a second profile and keeps the first display name', async () => {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)
    await createProfile('Sam', client)

    await expect(createProfile('Someone else', client)).rejects.toThrow(
      /already have a profile/i,
    )
    expect((await fetchProfile(user.id, client))?.displayName).toBe('Sam')
  })

  it('refuses a profile write from a signed-out caller', async () => {
    await expect(createProfile('Sam', signedOutClient())).rejects.toThrow()
    await expect(updateDisplayName('Sam', signedOutClient())).rejects.toThrow()
  })

  it('does not let a User set their own super admin flag', async () => {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)
    await createProfile('Sam', client)

    await client.from('profiles').update({ is_super_admin: true }).eq('id', user.id)
    expect((await fetchProfile(user.id, client))?.isSuperAdmin).toBe(false)

    await setSuperAdmin(user.id, true)
    await client.from('profiles').update({ is_super_admin: false }).eq('id', user.id)
    await updateDisplayName('Sammy', client)

    expect(await fetchProfile(user.id, client)).toEqual({
      id: user.id,
      displayName: 'Sammy',
      isSuperAdmin: true,
    })
  })
})
