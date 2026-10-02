import { ApiError } from '../../shared/api/client'

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid email or password.'
    if (error.status === 400) return 'Check your email and password and try again.'
    if (error.status === 429) return 'Too many login attempts. Please try again later.'
    return 'We could not sign you in. Please try again shortly.'
  }
  if (error instanceof TypeError) return 'Unable to reach the server. Check your connection and try again.'
  return 'We could not complete your login. Please try again.'
}

