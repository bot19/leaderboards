import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/data/auth'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './authContext'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  subscribeToAuth: vi.fn(() => () => {}),
  checkSession: vi.fn(),
  signOutLocally: vi.fn(),
  fetchProfile: vi.fn(),
}))

vi.mock('@/data/auth', () => ({
  getSession: mocks.getSession,
  subscribeToAuth: mocks.subscribeToAuth,
  checkSession: mocks.checkSession,
  signOutLocally: mocks.signOutLocally,
}))

vi.mock('@/data/profile', () => ({
  fetchProfile: mocks.fetchProfile,
}))

const session = { user: { id: 'user-1' } } as Session

function Probe() {
  const auth = useAuth()
  if (auth.isLoading) return <p>Loading</p>
  return <p>{auth.profile?.displayName ?? 'signed out'}</p>
}

beforeEach(() => {
  mocks.getSession.mockReset()
  mocks.subscribeToAuth.mockClear()
  mocks.checkSession.mockReset()
  mocks.signOutLocally.mockReset()
  mocks.fetchProfile.mockReset()
  mocks.signOutLocally.mockResolvedValue(undefined)
})

describe('AuthProvider session check', () => {
  it('keeps a User signed in when the server cannot be reached', async () => {
    mocks.getSession.mockResolvedValue(session)
    mocks.checkSession.mockResolvedValue('unknown')
    mocks.fetchProfile.mockResolvedValue({
      id: 'user-1',
      displayName: 'Sam',
      isSuperAdmin: false,
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(await screen.findByText('Sam')).toBeInTheDocument()
    expect(mocks.signOutLocally).not.toHaveBeenCalled()
    expect(mocks.fetchProfile).toHaveBeenCalledWith('user-1')
  })

  it('signs a deleted User out locally and does not load a profile', async () => {
    mocks.getSession.mockResolvedValue(session)
    mocks.checkSession.mockResolvedValue('gone')

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(mocks.signOutLocally).toHaveBeenCalledOnce())
    expect(mocks.fetchProfile).not.toHaveBeenCalled()
    expect(await screen.findByText('signed out')).toBeInTheDocument()
  })
})
