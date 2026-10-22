import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { classifySessionCheck } from './sessionCheck'

describe('classifySessionCheck', () => {
  it('treats a User the server returned as valid', () => {
    expect(
      classifySessionCheck({ user: { id: 'user-1' }, error: null }),
    ).toBe('valid')
  })

  it('treats a rejected token as gone', () => {
    expect(
      classifySessionCheck({
        user: null,
        error: new AuthApiError('invalid jwt', 401, 'bad_jwt'),
      }),
    ).toBe('gone')
    expect(
      classifySessionCheck({
        user: null,
        error: new AuthApiError('forbidden', 403, 'not_admin'),
      }),
    ).toBe('gone')
    expect(
      classifySessionCheck({
        user: null,
        error: new AuthApiError('missing', 404, 'session_not_found'),
      }),
    ).toBe('gone')
  })

  it('treats user_not_found as gone even when the status is not 401, 403 or 404', () => {
    expect(
      classifySessionCheck({
        user: null,
        error: new AuthApiError('missing user', 400, 'user_not_found'),
      }),
    ).toBe('gone')
  })

  it('treats a network error as unknown', () => {
    expect(
      classifySessionCheck({
        user: null,
        error: new AuthRetryableFetchError('Failed to fetch', 0),
      }),
    ).toBe('unknown')
  })

  it('treats other AuthApiErrors as unknown', () => {
    expect(
      classifySessionCheck({
        user: null,
        error: new AuthApiError('unavailable', 500, 'unexpected_failure'),
      }),
    ).toBe('unknown')
  })
})
