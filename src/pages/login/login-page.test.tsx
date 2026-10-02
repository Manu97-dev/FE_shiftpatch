// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../features/auth/contexts/auth-provider'
import { AppRoutes } from '../../app/router'

const user = { id: '66666666-6666-4666-8666-666666666666', name: 'Alex', role: 'nurse' }

function setup(path = '/login') {
  const originalFetch = globalThis.fetch
  vi.stubGlobal('fetch', (url: string, options: RequestInit) => url === '/api/auth/session'
    ? Promise.resolve(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }))
    : url === '/api/nurses/me/shifts' ? Promise.resolve(new Response(JSON.stringify({ nurseId: '33333333-3333-4333-8333-333333333333', shifts: [] })))
    : url === '/api/agencies' ? Promise.resolve(new Response(JSON.stringify({ agency: null })))
    : url === '/api/shifts/available' ? Promise.resolve(new Response(JSON.stringify({ shifts: [] })))
    : originalFetch(url, options))
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><AuthProvider><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></AuthProvider></QueryClientProvider>)
  return userEvent.setup()
}

async function submit(actor: ReturnType<typeof userEvent.setup>, password = 'password') {
  await screen.findByLabelText('Email address')
  await actor.type(screen.getByLabelText('Email address'), 'nurse@example.com')
  await actor.type(screen.getByLabelText('Password'), password)
  await actor.click(screen.getByRole('button', { name: 'Sign in' }))
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('login flow', () => {
  it.each(['admin', 'agency', 'nurse'])('accepts a valid %s response and opens the role-specific home', async (role) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: 'access-token', user: { ...user, role } })))
    vi.stubGlobal('fetch', fetchMock)
    const actor = setup()
    await submit(actor, ' password ')
    await screen.findByRole('main', { name: 'Home' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/auth/login')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ email: 'nurse@example.com', password: ' password ' })
  })

  it('validates required fields without calling the server', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const actor = setup()
    await screen.findByRole('button', { name: 'Sign in' })
    await actor.click(screen.getByRole('button', { name: 'Sign in' }))
    await screen.findByText('Enter your email.')
    expect(screen.getByText('Enter your password.')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [401, { error: 'Invalid email or password' }, 'Invalid email or password.'],
    [400, { statusCode: 400, error: 'Bad Request', message: 'body/email must NOT have fewer than 1 characters' }, 'Check your email and password and try again.'],
    [500, { error: 'Internal Server Error' }, 'We could not sign you in. Please try again shortly.'],
    [429, { error: 'Too Many Requests' }, 'Too many login attempts. Please try again later.'],
  ])('handles HTTP %s without opening home', async (status, body, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
    const actor = setup()
    await submit(actor)
    expect((await screen.findByRole('alert')).textContent).toBe(message)
    expect(screen.queryByRole('main', { name: 'Home' })).toBeNull()
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('handles network failure and clears the error when editing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const actor = setup()
    await submit(actor)
    expect((await screen.findByRole('alert')).textContent).toContain('Unable to reach the server')
    await actor.type(screen.getByLabelText('Password'), '2')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rejects malformed success payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: 'token', user: { ...user, role: 'unknown' } }))))
    const actor = setup()
    await submit(actor)
    expect((await screen.findByRole('alert')).textContent).toContain('We could not complete your login')
    expect(screen.queryByRole('main', { name: 'Home' })).toBeNull()
  })

  it('disables inputs and submission while the request is pending', async () => {
    let resolve!: (value: Response) => void
    const fetchMock = vi.fn(() => new Promise<Response>((done) => { resolve = done }))
    vi.stubGlobal('fetch', fetchMock)
    const actor = setup()
    await submit(actor)
    const button = screen.getByRole('button', { name: 'Signing in…' }) as HTMLButtonElement
    expect(button.matches(':disabled')).toBe(true)
    expect(screen.getByLabelText('Email address').matches(':disabled')).toBe(true)
    await actor.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolve(new Response(JSON.stringify({ token: 'token', user })))
    await waitFor(() => expect(screen.queryByRole('main', { name: 'Home' })).not.toBeNull())
  })

  it('redirects unauthenticated home visits to login', async () => {
    setup('/home')
    await screen.findByRole('heading', { name: 'Sign in to Shiftpatch' })
    expect(screen.queryByRole('main', { name: 'Home' })).toBeNull()
  })
})
