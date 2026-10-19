import { describe, expect, it } from 'vitest'
import { resolveAuthDestination } from './authDestination'

const session = { user: { id: 'user-1' } }

describe('resolveAuthDestination', () => {
  it('sends a signed-out visitor to sign-in', () => {
    expect(resolveAuthDestination({ session: null, profile: null })).toBe(
      '/login',
    )
  })

  it('sends a signed-in User with no profile to onboarding', () => {
    expect(resolveAuthDestination({ session, profile: null })).toBe(
      '/onboarding',
    )
  })

  it('sends a signed-in User with a profile to home', () => {
    expect(
      resolveAuthDestination({
        session,
        profile: { id: 'user-1' },
      }),
    ).toBe('/')
  })
})
