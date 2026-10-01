import { ApiError, apiRequest } from '../../shared/api/client'
import { loginResponseSchema, type LoginCredentials } from './auth.schemas'

export async function login(credentials: LoginCredentials) {
  const body = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  const result = loginResponseSchema.safeParse(body)
  if (!result.success) throw new Error('Unexpected login response')
  return result.data
}

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

// The backend must set an HttpOnly cookie at login and validate it here.
export async function restoreSession(signal?: AbortSignal) {
  try {
    const body = await apiRequest('/auth/session', { signal, cache: 'no-store' })
    return loginResponseSchema.parse(body)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function logout() {
  await apiRequest('/auth/logout', { method: 'POST' })
}
