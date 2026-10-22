// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { checkSession, signInWithOtp, signOut } from '@/data/auth'
import {
  createTestUser,
  deleteTestUser,
  serviceRole,
  signInAs,
  signedOutClient,
} from './harness'

describe('passcode sign-in against local auth', () => {
  it('does not create a User when the email is not already signed up', async () => {
    const email = `missing-${crypto.randomUUID()}@example.test`
    const client = signedOutClient()

    await expect(signInWithOtp(email, client.auth)).rejects.toThrow()

    const { data, error } = await serviceRole().auth.admin.listUsers()
    if (error) throw new Error(error.message)
    expect(data.users.some((user) => user.email === email)).toBe(false)
  })
})

describe('a deleted User session', () => {
  const created: string[] = []

  afterEach(async () => {
    while (created.length > 0) {
      const id = created.pop()
      if (!id) continue
      try {
        await deleteTestUser(id)
      } catch {
        // This test deletes the User itself.
      }
    }
  })

  it('reports valid before deletion and gone after, then sign-out clears the session', async () => {
    const user = await createTestUser()
    created.push(user.id)
    const client = await signInAs(user)

    expect(await checkSession(client.auth)).toBe('valid')

    await deleteTestUser(user.id)

    expect(await checkSession(client.auth)).toBe('gone')

    await signOut(client.auth)

    const { data, error } = await client.auth.getSession()
    if (error) throw new Error(error.message)
    expect(data.session).toBeNull()
  })
})
