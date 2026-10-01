const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type ApiOptions = RequestInit & { token?: string }

// Callers validate response bodies at the feature boundary using Zod.
export async function apiRequest(path: string, options: ApiOptions = {}): Promise<unknown> {
  const { token, ...requestOptions } = options
  const headers = new Headers(requestOptions.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Shiftpatch-Request', '1')
  if (requestOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${baseUrl}/${path.replace(/^\//, '')}`, {
    credentials: 'include',
    ...requestOptions,
    headers,
  })

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }

  return response.status === 204 ? undefined : response.json()
}
