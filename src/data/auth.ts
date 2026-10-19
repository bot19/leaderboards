import { useMutation } from '@tanstack/react-query'
import { getSupabase } from '@/lib/supabase'
import { TEMP_PASSWORD_AUTH } from '@/lib/tempPasswordAuth'

type AuthError = { message: string }

export type OtpAuth = {
  signInWithOtp: (credentials: {
    email: string
    options?: { shouldCreateUser?: boolean }
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

/** Sign-in passcode. A mistyped email must not create a User. */
export async function signInWithOtp(email: string, auth: OtpAuth = getSupabase().auth) {
  const { error } = await auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })
  throwOnError(error)
}

/** Sign-up passcode. This is the path that creates a User. */
export async function signUpWithOtp(email: string, auth: OtpAuth = getSupabase().auth) {
  const { error } = await auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
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
    mutationFn: (email: string) => signInWithOtp(email),
  })
}

export function useSignUpWithOtp() {
  return useMutation({
    mutationFn: (email: string) => signUpWithOtp(email),
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
