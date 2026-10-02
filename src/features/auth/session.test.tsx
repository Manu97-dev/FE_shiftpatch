// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth-provider'
import { AppRoutes } from '../../app/router'

const session = { token: 'memory-only-token', user: { id: '66666666-6666-4666-8666-666666666666', name: 'Alex', role: 'nurse' } }
function mount() {
  const originalFetch = globalThis.fetch
  vi.stubGlobal('fetch', (url: string, options: RequestInit) => url === '/api/nurses/me/shifts'
    ? Promise.resolve(new Response(JSON.stringify({ nurseId: '33333333-3333-4333-8333-333333333333', shifts: [] })))
    : originalFetch(url, options))
  return render(<QueryClientProvider client={new QueryClient()}><AuthProvider><MemoryRouter initialEntries={['/home']}><AppRoutes /></MemoryRouter></AuthProvider></QueryClientProvider>)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('restores a server-validated session on a fresh mount without browser storage', async () => {
  const storage = vi.spyOn(Storage.prototype, 'setItem')
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(session))))
  vi.stubGlobal('fetch', fetchMock)
  const first = mount()
  expect(screen.getByRole('status').textContent).toContain('Restoring')
  await screen.findByRole('main', { name: 'Home' })
  first.unmount()
  mount()
  await screen.findByRole('main', { name: 'Home' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  const options = fetchMock.mock.calls[0]![1]
  expect(options.credentials).toBe('include')
  expect(options.cache).toBe('no-store')
  expect(options.headers.get('X-Shiftpatch-Request')).toBe('1')
  expect(storage).not.toHaveBeenCalled()
  storage.mockRestore()
})

it('expired server sessions return to login', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
  mount()
  await screen.findByRole('heading', { name: 'Sign in to Shiftpatch' })
})

it('network errors can be retried without a premature login redirect', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response(JSON.stringify(session))))
  mount()
  await screen.findByRole('alert')
  expect(screen.queryByRole('heading', { name: 'Sign in to Shiftpatch' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByRole('main', { name: 'Home' })
})

it('logout calls the backend before clearing the local session', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(session))).mockResolvedValueOnce(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  await screen.findByRole('button', { name: 'Sign out' })
  await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await screen.findByRole('heading', { name: 'Sign in to Shiftpatch' })
  expect(fetchMock.mock.calls[1]![0]).toBe('/api/auth/logout')
})
