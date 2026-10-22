export type SessionCheck = 'valid' | 'gone' | 'unknown'

/**
 * A stored session is valid until the server says the User is gone.
 * Anything else, including being offline, stays unknown so we keep them signed in.
 */
export function classifySessionCheck(result: {
  user: unknown
  error: unknown
}): SessionCheck {
  if (isGoneAuthApiError(result.error)) return 'gone'
  if (result.error != null) return 'unknown'
  if (result.user != null) return 'valid'
  return 'unknown'
}

function isGoneAuthApiError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if (!('name' in error) || error.name !== 'AuthApiError') return false
  if (!('__isAuthError' in error) || !error.__isAuthError) return false

  const status = 'status' in error ? error.status : undefined
  const code = 'code' in error ? error.code : undefined
  if (status === 401 || status === 403 || status === 404) return true
  return code === 'user_not_found'
}
