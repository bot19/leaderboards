import { AuthApiError } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import {
  checkSession,
  signInWithOtp,
  signInWithPassword,
  signOut,
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

  it('points the magic-link fallback at the callback route', async () => {
    const auth = otpAuth()

    await signInWithOtp('sam@example.com', auth, {
      emailRedirectTo: 'http://localhost:5173/auth/callback',
    })

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'sam@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'http://localhost:5173/auth/callback',
      },
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

describe('checkSession', () => {
  it('reports unknown when the server cannot be reached', async () => {
    const auth = {
      getUser: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    }

    await expect(checkSession(auth)).resolves.toBe('unknown')
  })

  it('reports gone when the server rejects the User', async () => {
    const auth = {
      getUser: vi.fn(async () => ({
        data: { user: null },
        error: new AuthApiError('missing user', 404, 'user_not_found'),
      })),
    }

    await expect(checkSession(auth)).resolves.toBe('gone')
  })
})

describe('signOut', () => {
  it('clears this browser when the server sign-out fails', async () => {
    const auth = {
      signOut: vi
        .fn()
        .mockResolvedValueOnce({ error: { message: 'User not found' } })
        .mockResolvedValueOnce({ error: null }),
    }

    await signOut(auth)

    expect(auth.signOut).toHaveBeenNthCalledWith(1)
    expect(auth.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' })
  })

  it('clears this browser when the server sign-out throws', async () => {
    const auth = {
      signOut: vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({ error: null }),
    }

    await signOut(auth)

    expect(auth.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' })
  })

  it('stops when the server sign-out succeeds', async () => {
    const auth = {
      signOut: vi.fn(async () => ({ error: null })),
    }

    await signOut(auth)

    expect(auth.signOut).toHaveBeenCalledTimes(1)
  })
})
