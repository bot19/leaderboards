/**
 * Where a visitor goes from session and profile.
 * Loading is the caller's job. A profile is the User's display-name row.
 */
export type AuthDestination = '/login' | '/onboarding' | '/'

export type AuthDestinationInput = {
  session: { user: { id: string } } | null
  profile: { id: string } | null
}

export function resolveAuthDestination(
  input: AuthDestinationInput,
): AuthDestination {
  if (!input.session) return '/login'
  if (!input.profile) return '/onboarding'
  return '/'
}
