import { ApiError, apiRequest } from '../../../shared/api/client'
import { loginResponseSchema, type LoginCredentials, type NurseRegistration } from './auth.schemas'

export async function login(credentials: LoginCredentials) {
  const body = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  const result = loginResponseSchema.safeParse(body)
  if (!result.success) throw new Error('Unexpected login response')
  return result.data
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

export async function registerNurse(input: NurseRegistration) {
  const { name, email, password, credentialExpirationDate } = input
  const body = await apiRequest('/auth/register/nurse', {
    method: 'POST', body: JSON.stringify({ name, email, password, credentialExpirationDate }),
  })
  return loginResponseSchema.refine((response) => response.user.role === 'nurse').parse(body)
}
