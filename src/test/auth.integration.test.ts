// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { signInWithOtp } from '@/data/auth'
import { serviceRole, signedOutClient } from './harness'

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
