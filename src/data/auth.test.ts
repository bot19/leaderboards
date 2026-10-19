import { describe, expect, it, vi } from 'vitest'
import {
  signInWithOtp,
  signInWithPassword,
  signUpWithOtp,
  verifyEmailOtp,
} from './auth'

function otpAuth() {
  return {
    signInWithOtp: vi.fn(async () => ({ error: null })),
    verifyOtp: vi.fn(async () => ({ error: null })),
  }
}

describe('passcode sign-in', () => {
  it('sends a sign-in passcode without creating a User', async () => {
    const auth = otpAuth()

    await signInWithOtp('sam@example.com', auth)

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      options: { shouldCreateUser: false },
    })
  })

  it('sends a sign-up passcode that can create a User', async () => {
    const auth = otpAuth()

    await signUpWithOtp('sam@example.com', auth)

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      options: { shouldCreateUser: true },
    })
  })

  it('verifies the typed email passcode', async () => {
    const auth = otpAuth()

    await verifyEmailOtp('sam@example.com', '123456', auth)

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      token: '123456',
      type: 'email',
    })
  })
})

describe('password login', () => {
  it('refuses password login when the local-dev flag is off', async () => {
    const auth = {
      signInWithPassword: vi.fn(async () => ({ error: null })),
    }

    await expect(
      signInWithPassword('sam@example.com', 'secret-pass', {
        enabled: false,
        auth,
      }),
    ).rejects.toThrow('Password login is disabled.')
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('signs in with a password when the local-dev flag is on', async () => {
    const auth = {
      signInWithPassword: vi.fn(async () => ({ error: null })),
    }

    await signInWithPassword('sam@example.com', 'secret-pass', {
      enabled: true,
      auth,
    })

    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'sam@example.com',
      password: 'secret-pass',
    })
  })
})
