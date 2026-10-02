// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AvailableShifts } from './available-shifts'
import { MyShifts } from './my-shifts'

const nurseId = '33333333-3333-4333-8333-333333333333'
const shift = { id: '44444444-4444-4444-8444-444444444444', agencyId: '55555555-5555-4555-8555-555555555555', agencyName: 'Sunrise', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'open', claimedBy: null }
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{
    session: { token: 'test-token', user: { id: '66666666-6666-4666-8666-666666666666', name: 'Maria', role: 'nurse' } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession: vi.fn(),
  }}><MyShifts /><AvailableShifts /></AuthContext.Provider></QueryClientProvider>)
}
async function openDialog() {
  await screen.findByRole('button', { name: 'Claim shift' })
  await userEvent.click(screen.getByRole('button', { name: 'Claim shift' }))
  return screen.getByRole('dialog', { name: 'Claim this shift?' })
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('confirms the schedule, posts with no body, and refreshes both lists after success', async () => {
  let claimed = false
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    if (options.method === 'POST') { claimed = true; return new Response(JSON.stringify({ ...shift, status: 'filled', claimedBy: nurseId })) }
    if (url === '/api/nurses/me/shifts') return new Response(JSON.stringify({ nurseId, shifts: claimed ? [{ ...shift, status: 'filled', claimedBy: nurseId }] : [] }))
    return new Response(JSON.stringify({ shifts: claimed ? [] : [shift] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  mount()
  const dialog = await openDialog()
  expect(within(dialog).getByText(/Ends next day/)).toBeTruthy()
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(0)
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm claim' }))
  await screen.findByText('Shift claimed successfully. You can find it in My shifts.')
  const posts = fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(posts[0]![0]).toBe(`/api/shifts/${shift.id}/claim`)
  expect(posts[0]![1].body).toBeUndefined()
  expect(new Headers(posts[0]![1].headers).get('Authorization')).toBe('Bearer test-token')
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/nurses/me/shifts').length).toBe(2)
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/shifts/available').length).toBe(2)
  expect(within(screen.getByRole('region', { name: 'My shifts' })).getByText('Sunrise')).toBeTruthy()
  expect(within(screen.getByRole('region', { name: 'Available shifts' })).getByText('No available shifts right now')).toBeTruthy()
})
it.each([
  [403, 'Credential expired, cannot claim shift', 'Your credentials have expired.'],
  [409, 'Shift already claimed', 'Another nurse has already claimed this shift.'],
  [404, 'Shift not found', 'This shift is no longer available.'],
  [401, 'Unauthorized', 'Your session has expired.'],
])('shows the correct HTTP %s error without allowing accidental repeat claims', async (status, error, message) => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
    if (options.method === 'POST') return new Response(JSON.stringify({ error }), { status })
    return new Response(JSON.stringify(url === '/api/nurses/me/shifts' ? { nurseId, shifts: [] } : { shifts: [shift] }))
  }))
  mount()
  const dialog = await openDialog()
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm claim' }))
  expect((await within(dialog).findByRole('alert')).textContent).toContain(message)
  expect(within(dialog).queryByRole('button', { name: 'Confirm claim' })).toBeNull()
})
it('allows backing out without sending a claim', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url === '/api/nurses/me/shifts' ? { nurseId, shifts: [] } : { shifts: [shift] })))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  const dialog = await openDialog()
  await userEvent.click(within(dialog).getByRole('button', { name: 'Go back' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/claim'))).toBe(false)
})
