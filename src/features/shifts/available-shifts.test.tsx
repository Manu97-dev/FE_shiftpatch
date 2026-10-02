// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../auth/auth.context'
import { AvailableShifts } from './available-shifts'
import { MyShifts } from './my-shifts'

const shift = {
  id: '44444444-4444-4444-8444-444444444444', agencyId: '55555555-5555-4555-8555-555555555555',
  agencyName: 'Sunrise Health', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'open', claimedBy: null,
}
function response(shifts: unknown[] = []) { return new Response(JSON.stringify({ shifts })) }
function mount(both = false) {
  const clearSession = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{
    session: { token: 'test-token', user: { id: '66666666-6666-4666-8666-666666666666', name: 'Maria Lopez', role: 'nurse' } },
    status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession,
  }}>{both && <MyShifts />}<AvailableShifts /></AuthContext.Provider></QueryClientProvider>)
  return clearSession
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('shows loading independently', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  mount()
  expect(screen.getByRole('status').textContent).toBe('Loading available shifts…')
})
it('renders the server-provided available shifts in response order', async () => {
  const fetchMock = vi.fn().mockResolvedValue(response([
    { ...shift, id: '11111111-1111-4111-8111-111111111111', agencyName: 'Earlier agency', startTime: '07:00', endTime: '19:00' },
    shift,
  ]))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  await screen.findByText('Sunrise Health')
  const cards = screen.getAllByRole('listitem')
  expect(cards.length).toBe(2)
  expect(cards[0]!.textContent).toContain('Earlier agency')
  expect(cards[1]!.textContent).toContain('Ends next day')
  expect(fetchMock.mock.calls[0]![0]).toBe('/api/shifts/available')
  expect(fetchMock.mock.calls[0]![1].headers.get('Authorization')).toBe('Bearer test-token')
})
it('shows empty state when the endpoint returns no shifts', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()))
  mount()
  await screen.findByRole('heading', { name: 'No available shifts right now' })
})
it('recovers from a failed request with retry', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(response([shift])))
  mount()
  await screen.findByRole('heading', { name: 'We could not load available shifts' })
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Sunrise Health')
})
it('keeps My shifts usable when Available shifts fails', async () => {
  vi.stubGlobal('fetch', vi.fn((url: string) => url === '/api/shifts/available'
    ? Promise.reject(new TypeError('offline'))
    : Promise.resolve(new Response(JSON.stringify({ nurseId: '33333333-3333-4333-8333-333333333333', shifts: [] })))))
  mount(true)
  await screen.findByRole('heading', { name: 'No shifts assigned yet' })
  const available = screen.getByRole('region', { name: 'Available shifts' })
  expect((await within(available).findByRole('alert')).textContent).toContain('We could not load available shifts')
  expect(within(screen.getByRole('region', { name: 'My shifts' })).queryByRole('alert')).toBeNull()
})
it('offers sign-in again on an expired session', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
  const clearSession = mount()
  await screen.findByRole('heading', { name: 'Your session has expired' })
  await userEvent.click(screen.getByRole('button', { name: 'Sign in again' }))
  expect(clearSession).toHaveBeenCalledOnce()
})
