import { useMutation } from '@tanstack/react-query'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'
import { TEMP_PASSWORD_AUTH } from '@/lib/tempPasswordAuth'

export type { Session }

type AuthError = { message: string }

export type OtpAuth = {
  signInWithOtp: (credentials: {
    email: string
    options?: { shouldCreateUser?: boolean; emailRedirectTo?: string }
  }) => PromiseLike<{ error: AuthError | null }>
  verifyOtp: (credentials: {
    email: string
    token: string
    type: 'email'
  }) => PromiseLike<{ error: AuthError | null }>
}

export type PasswordAuth = {
  signInWithPassword: (credentials: {
    email: string
    password: string
  }) => PromiseLike<{ error: AuthError | null }>
}

function throwOnError(error: AuthError | null) {
  if (error) throw new Error(error.message)
}

function callbackUrl() {
  return `${window.location.origin}/auth/callback`
}

/** Sign-in passcode. A mistyped email must not create a User. */
export async function signInWithOtp(
  email: string,
  auth: OtpAuth = getSupabase().auth,
  options?: { emailRedirectTo?: string },
) {
  const { error } = await auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      ...(options?.emailRedirectTo
        ? { emailRedirectTo: options.emailRedirectTo }
        : {}),
    },
  })
  throwOnError(error)
}

/** Sign-up passcode. This is the path that creates a User. */
export async function signUpWithOtp(
  email: string,
  auth: OtpAuth = getSupabase().auth,
  options?: { emailRedirectTo?: string },
) {
  const { error } = await auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      ...(options?.emailRedirectTo
        ? { emailRedirectTo: options.emailRedirectTo }
        : {}),
    },
  })
  throwOnError(error)
}

export async function verifyEmailOtp(
  email: string,
  token: string,
  auth: OtpAuth = getSupabase().auth,
) {
  const { error } = await auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  throwOnError(error)
}

/** Local development only. Refuses to run when the flag is off. */
export async function signInWithPassword(
  email: string,
  password: string,
  options?: { enabled?: boolean; auth?: PasswordAuth },
) {
  if (!(options?.enabled ?? TEMP_PASSWORD_AUTH)) {
    throw new Error('Password login is disabled.')
  }

  const auth = options?.auth ?? getSupabase().auth
  const { error } = await auth.signInWithPassword({ email, password })
  throwOnError(error)
}

export function useSignInWithOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      signInWithOtp(email, getSupabase().auth, {
        emailRedirectTo: callbackUrl(),
      }),
  })
}

export function useSignUpWithOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      signUpWithOtp(email, getSupabase().auth, {
        emailRedirectTo: callbackUrl(),
      }),
  })
}

export function useVerifyEmailOtp() {
  return useMutation({
    mutationFn: ({ email, token }: { email: string; token: string }) =>
      verifyEmailOtp(email, token),
  })
}

export function useSignInWithPassword() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInWithPassword(email, password),
  })
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession()
  if (error) throw new Error(error.message)
  return data.session
}

export function subscribeToAuth(
  onChange: (session: Session | null) => void,
): () => void {
  const {
    data: { subscription },
  } = getSupabase().auth.onAuthStateChange((_event, session) => {
    onChange(session)
  })
  return () => subscription.unsubscribe()
}

export async function signOut() {
  const { error } = await getSupabase().auth.signOut()
  if (error) throw new Error(error.message)
}

export function useSignOut() {
  return useMutation({ mutationFn: signOut })
}
