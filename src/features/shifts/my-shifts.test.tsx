// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../auth/auth.context'
import { MyShifts } from './my-shifts'
import { fetchMyShifts } from './my-shifts.api'
import { shiftTimes } from './shift-time'

const nurseId = '33333333-3333-4333-8333-333333333333'
const shift = {
  id: '44444444-4444-4444-8444-444444444444', agencyId: '55555555-5555-4555-8555-555555555555',
  agencyName: 'Sunrise Health', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'filled' as const, claimedBy: nurseId,
}
function response(shifts: unknown[] = []) { return new Response(JSON.stringify({ nurseId, shifts })) }
function setup() {
  const clearSession = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{
    session: { token: 'test-token', user: { id: '66666666-6666-4666-8666-666666666666', name: 'Maria Lopez', role: 'nurse' } },
    status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession,
  }}><MyShifts /></AuthContext.Provider></QueryClientProvider>)
  return { clearSession }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('My shifts', () => {
  it('shows loading while awaiting the API', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    setup()
    expect(screen.getByRole('status').textContent).toContain('Loading your shifts')
  })
  it('shows a useful empty state', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response())
    vi.stubGlobal('fetch', fetchMock)
    setup()
    await screen.findByRole('heading', { name: 'No shifts assigned yet' })
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/nurses/me/shifts')
    expect(fetchMock.mock.calls[0]![1].headers.get('Authorization')).toBe('Bearer test-token')
  })
  it('renders assignments and explicitly marks overnight dates', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([shift])))
    setup()
    await screen.findByRole('heading', { name: 'RN' })
    expect(screen.getByText('Sunrise Health')).toBeTruthy()
    expect(screen.getByText(/Ends next day/).textContent).toContain('Oct 2, 2099')
    expect(screen.getByText(/All shift dates/).textContent).toContain('America/Tegucigalpa')
    expect(shiftTimes(shift).end.getTime() - shiftTimes(shift).start.getTime()).toBe(12 * 60 * 60 * 1000)
  })
  it('keeps past assignments in history and shows no upcoming shifts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response([{ ...shift, date: '2020-10-01' }])))
    setup()
    await screen.findByRole('heading', { name: 'No upcoming shifts' })
    expect(screen.getByText('Past assignments (1)')).toBeTruthy()
  })
  it('offers retry for network failures and recovers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(response([shift])))
    setup()
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await screen.findByRole('heading', { name: 'RN' })
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('offers sign-in again when the server rejects the session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    const { clearSession } = setup()
    await screen.findByRole('heading', { name: 'Your session has expired' })
    await userEvent.click(screen.getByRole('button', { name: 'Sign in again' }))
    expect(clearSession).toHaveBeenCalledOnce()
  })
  it('explains missing nurse access without a retry loop', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })))
    setup()
    await screen.findByRole('heading', { name: 'Nurse access unavailable' })
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull()
  })
  it('keeps previous results visible with a warning after refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response([shift])).mockRejectedValueOnce(new TypeError('offline')))
    setup()
    await screen.findByRole('heading', { name: 'RN' })
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await screen.findByText(/may be out of date/)
    expect(screen.getByRole('heading', { name: 'RN' })).toBeTruthy()
  })
  it.each([response([{ ...shift, claimedBy: '77777777-7777-4777-8777-777777777777' }]), new Response(JSON.stringify({ shifts: [] }))])('rejects malformed or mismatched assignments', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(body))
    await expect(fetchMyShifts('test-token')).rejects.toThrow()
  })
})
