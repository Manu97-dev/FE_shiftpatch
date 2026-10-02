// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../features/auth/contexts/auth.context'
import { HomePage } from './home-page'
const a = '10000000-0000-4000-8000-000000000001'
const b = '10000000-0000-4000-8000-000000000002'
function mount(role: 'agency' | 'nurse' | 'admin' = 'agency') {
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{
    session: { token: 'token', user: { id: '20000000-0000-4000-8000-000000000001', name: 'Alex', role } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession: vi.fn(),
  }}><HomePage /></AuthContext.Provider></QueryClientProvider></MemoryRouter>)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('loads the authenticated agency directly without an agency selector', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url === '/api/agencies' ? { agency: { id: a, name: 'Sunrise' } } : { agencyId: a, agencyName: 'Sunrise', shifts: [] })))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  await screen.findByRole('heading', { name: 'Sunrise' })
  await screen.findByText('No shifts posted yet')
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(fetchMock.mock.calls).toHaveLength(2)
  expect(fetchMock.mock.calls[1]![0]).toBe(`/api/agencies/${a}/shifts`)
})
it.each([401, 403, 500])('handles agency shift lookup error %s', async (status) => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string) => new Response(JSON.stringify({ error: 'Error' }), { status })))
  mount()
  await screen.findByRole('alert')
  expect(screen.queryByText('No shifts posted yet')).toBeNull()
})
it('keeps admin home separate and makes no shift requests', () => {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  mount('admin')
  expect(screen.getByRole('heading', { name: 'Admin workspace' })).toBeTruthy()
  expect(fetchMock).not.toHaveBeenCalled()
})
it('routes nurses to their existing home and APIs', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/nurses/') ? { nurseId: a, shifts: [] } : { shifts: [] })))
  vi.stubGlobal('fetch', fetchMock)
  mount('nurse')
  await screen.findByText('No shifts assigned yet')
  expect(fetchMock.mock.calls.every(([url]) => !url.includes('/agencies/'))).toBe(true)
})
it('rejects a response containing another agency’s shifts', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url === '/api/agencies' ? { agency: { id: a, name: 'Sunrise' } } : { agencyId: a, agencyName: 'Sunrise', shifts: [{
    id: '40000000-0000-4000-8000-000000000001', agencyId: b, agencyName: 'Metro', role: 'RN', date: '2099-10-01', startTime: '07:00', endTime: '19:00', status: 'open', claimedBy: null,
  }] }))))
  mount()
  await screen.findByRole('alert')
  expect(screen.queryByText('Metro')).toBeNull()
})
