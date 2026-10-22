import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  checkSession,
  getSession,
  signOutLocally,
  subscribeToAuth,
  type Session,
} from '@/data/auth'
import { fetchProfile, type Profile } from '@/data/profile'
import { AuthContext } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const loadedUserIdRef = useRef<string | null>(null)

  const refreshProfile = useCallback(async () => {
    const current = await getSession()
    if (!current?.user) {
      loadedUserIdRef.current = null
      setProfile(null)
      setProfileError(false)
      return
    }
    try {
      setProfile(await fetchProfile(current.user.id))
      loadedUserIdRef.current = current.user.id
      setProfileError(false)
    } catch {
      loadedUserIdRef.current = null
      setProfileError(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function sync(next: Session | null) {
      if (!next?.user) {
        loadedUserIdRef.current = null
        if (!cancelled) {
          setSession(null)
          setProfile(null)
          setProfileError(false)
          setIsLoading(false)
        }
        return
      }
      // Profile already loaded for this User. A deletion is caught on the next load.
      if (loadedUserIdRef.current === next.user.id) {
        if (!cancelled) setSession(next)
        return
      }
      if (!cancelled) setIsLoading(true)
      // getSession() never contacts the server, so a deleted User still looks signed in.
      const outcome = await checkSession()
      if (cancelled) return
      if (outcome === 'gone') {
        try {
          await signOutLocally()
        } catch {
          // Stop spinning. The stored session is still there until a later load.
        }
        if (!cancelled) setIsLoading(false)
        return
      }
      if (!cancelled) setSession(next)
      try {
        const nextProfile = await fetchProfile(next.user.id)
        if (!cancelled) {
          setProfile(nextProfile)
          loadedUserIdRef.current = next.user.id
          setProfileError(false)
        }
      } catch {
        if (!cancelled) setProfileError(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void getSession().then(sync)
    const unsubscribe = subscribeToAuth((next) => {
      void sync(next)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({ session, profile, profileError, isLoading, refreshProfile }),
    [session, profile, profileError, isLoading, refreshProfile],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
