/**
 * Where a visitor goes from session and profile.
 * Loading is the caller's job. A profile is the User's display-name row.
 * A safe return path brings a signed-in User back to a Share link preview.
 */
export type AuthDestination = '/login' | '/onboarding' | '/'

export type AuthDestinationInput = {
  session: { user: { id: string } } | null
  profile: { id: string } | null
}

/** In-app path only. Drops anything that could leave this origin. */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return null
  }
  return value
}

export function resolveAuthDestination(
  input: AuthDestinationInput,
  returnTo?: string | null,
): string {
  if (!input.session) return '/login'
  if (!input.profile) return '/onboarding'
  return safeReturnPath(returnTo) ?? '/'
}
