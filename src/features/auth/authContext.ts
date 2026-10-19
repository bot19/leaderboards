import { createContext, use } from 'react'
import type { Session } from '@/data/auth'
import type { Profile } from '@/data/profile'

export type AuthState = {
  session: Session | null
  profile: Profile | null
  /** The profile request failed, so profile is unknown rather than absent. */
  profileError: boolean
  isLoading: boolean
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const value = use(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return value
}
