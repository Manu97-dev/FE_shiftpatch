// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AvailableShifts } from './available-shifts'
import { MyShifts } from './my-shifts'

const nurseId = '33333333-3333-4333-8333-333333333333'
const shift = { id: '44444444-4444-4444-8444-444444444444', agencyId: '55555555-5555-4555-8555-555555555555', agencyName: 'Sunrise', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'filled', claimedBy: nurseId }
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{
    session: { token: 'test-token', user: { id: '66666666-6666-4666-8666-666666666666', name: 'Maria', role: 'nurse' } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession: vi.fn(),
  }}><MyShifts /><AvailableShifts /></AuthContext.Provider></QueryClientProvider>)
}
async function openDialog() {
  await screen.findByRole('button', { name: 'Cancel shift' })
  await userEvent.click(screen.getByTestId('shift-cancel-button'))
  return screen.getByRole('dialog', { name: 'Cancel this shift?' })
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('confirms the schedule, posts the advance reason, and refreshes both lists after success', async () => {
  let cancelled = false
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    if (options.method === 'POST') { cancelled = true; return new Response(JSON.stringify({ ...shift, status: 'open', claimedBy: null, cancellation: { reason: 'advance', previousNurseId: nurseId } })) }
    if (url === '/api/nurses/me/shifts') return new Response(JSON.stringify({ nurseId, shifts: cancelled ? [] : [shift] }))
    return new Response(JSON.stringify({ shifts: cancelled ? [{ ...shift, status: 'open', claimedBy: null }] : [] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  mount()
  const dialog = await openDialog()
  expect(within(dialog).getByText(/Ends next day/)).toBeTruthy()
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(0)
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm cancellation' }))
  await screen.findByText('Shift cancelled successfully. Your assignment has been removed.')
  const posts = fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(posts[0]![0]).toBe(`/api/shifts/${shift.id}/cancel`)
  expect(JSON.parse(posts[0]![1].body as string)).toEqual({ reason: 'advance' })
  expect(new Headers(posts[0]![1].headers).get('Authorization')).toBe('Bearer test-token')
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/nurses/me/shifts').length).toBe(2)
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/shifts/available').length).toBe(2)
  expect(within(screen.getByRole('region', { name: 'Available shifts' })).getByText('Sunrise')).toBeTruthy()
  expect(within(screen.getByRole('region', { name: 'My shifts' })).getByText('No shifts assigned yet')).toBeTruthy()
})
it.each([
  [403, 'Forbidden', 'You can only cancel a shift assigned to you.'],
  [409, 'Shift is already open', 'This shift has already been reopened.'],
  [404, 'Shift not found', 'This shift no longer exists.'],
  [401, 'Unauthorized', 'Your session has expired.'],
])('shows the correct HTTP %s error without allowing accidental repeat cancellations', async (status, error, message) => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
    if (options.method === 'POST') return new Response(JSON.stringify({ error }), { status })
    return new Response(JSON.stringify(url === '/api/nurses/me/shifts' ? { nurseId, shifts: [shift] } : { shifts: [] }))
  }))
  mount()
  const dialog = await openDialog()
  await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm cancellation' }))
  expect((await within(dialog).findByRole('alert')).textContent).toContain(message)
  expect(within(dialog).queryByRole('button', { name: 'Confirm cancellation' })).toBeNull()
})
it('allows backing out without sending a cancellation', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url === '/api/nurses/me/shifts' ? { nurseId, shifts: [shift] } : { shifts: [] })))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  const dialog = await openDialog()
  await userEvent.click(within(dialog).getByRole('button', { name: 'Go back' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/cancel'))).toBe(false)
})

it('does not offer cancellation for current or completed assignments', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(new Date('2099-10-01T20:00:00-06:00').getTime())
  try {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url === '/api/nurses/me/shifts'
      ? { nurseId, shifts: [shift, { ...shift, id: '77777777-7777-4777-8777-777777777777', date: '2099-09-01' }] }
      : { shifts: [] }))))
    mount()
    await screen.findByText('Upcoming & current')
    expect(screen.queryByRole('button', { name: 'Cancel shift' })).toBeNull()
    await userEvent.click(screen.getByText('Past assignments (1)'))
    expect(screen.queryByRole('button', { name: 'Cancel shift' })).toBeNull()
  } finally { clock.mockRestore() }
})
