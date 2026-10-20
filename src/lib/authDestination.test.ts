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

  it('sends a signed-in User back to a Share link preview', () => {
    expect(
      resolveAuthDestination(
        { session, profile: { id: 'user-1' } },
        '/join/share-token',
      ),
    ).toBe('/join/share-token')
  })

  it('ignores a return path that leaves the app', () => {
    expect(
      resolveAuthDestination(
        { session, profile: { id: 'user-1' } },
        'https://example.test/join/share-token',
      ),
    ).toBe('/')
  })

  it('sends a signed-out visitor to sign-in even when a preview is waiting', () => {
    expect(
      resolveAuthDestination({ session: null, profile: null }, '/join/share-token'),
    ).toBe('/login')
  })

  it('sends a User without a profile to onboarding even when a preview is waiting', () => {
    expect(
      resolveAuthDestination({ session, profile: null }, '/join/share-token'),
    ).toBe('/onboarding')
  })
})
