// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AdminDashboard } from './admin-dashboard'
import { filterSchema } from '../api/admin.schemas'
const agency = '10000000-0000-4000-8000-000000000001'
const summary = { asOf: '2026-10-02T06:00:00Z', upcomingOpen: 1, upcomingAssigned: 1, upcomingTotal: 2 }
const shifts = [
  { id: '40000000-0000-4000-8000-000000000001', agencyId: agency, agencyName: 'Sunrise', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'open', claimedBy: null },
  { id: '40000000-0000-4000-8000-000000000002', agencyId: '10000000-0000-4000-8000-000000000002', agencyName: 'Metro', role: 'LPN', date: '2099-10-02', startTime: '07:00', endTime: '19:00', status: 'filled', claimedBy: '30000000-0000-4000-8000-000000000001' },
]
function mount(role: 'admin' | 'nurse' | 'agency' = 'admin') {
  const clearSession = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{
    session: { token: 'admin-token', user: { id: '20000000-0000-4000-8000-000000000001', name: 'Alex', role } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession,
  }}><AdminDashboard /></AuthContext.Provider></QueryClientProvider>)
  return { clearSession }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('applies filters through the API and keeps summary totals global', async () => {
  const fetchMock = vi.fn(async (url: string, _options: RequestInit) => new Response(JSON.stringify(url.includes('/summary') ? summary : { shifts: url.includes('?') ? [shifts[0]] : shifts })))
  vi.stubGlobal('fetch', fetchMock); mount()
  await screen.findByText('2 shifts across all agencies')
  expect(screen.getByTestId('admin-dashboard-shift-table')).toBe(screen.getByRole('table', { name: 'All shifts' }))
  expect(screen.getAllByTestId('admin-shift-status-badge').map(badge => badge.getAttribute('data-status'))).toEqual(['open', 'filled'])
  await userEvent.selectOptions(screen.getByLabelText('Agency'), agency)
  await userEvent.selectOptions(screen.getByLabelText('Status'), 'open')
  await userEvent.type(screen.getByLabelText('Start date from'), '2099-10-01')
  await userEvent.type(screen.getByLabelText('Start date through'), '2099-10-01')
  await screen.findByText('1 shift matching applied filters')
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('dateTo=2099-10-01'))).toBe(true))
  const filtered = fetchMock.mock.calls.find(([url]) => url.includes('dateTo=2099-10-01'))!
  const params = new URL(filtered[0], 'http://localhost').searchParams
  expect(Object.fromEntries(params)).toEqual({ agencyId: agency, status: 'open', dateFrom: '2099-10-01', dateTo: '2099-10-01' })
  expect(new Headers(filtered[1].headers).get('Authorization')).toBe('Bearer admin-token')
  expect(fetchMock.mock.calls.filter(([url]) => url.includes('/summary'))).toHaveLength(1)
  expect(within(screen.getByRole('region', { name: 'All shifts' })).queryByText('LPN')).toBeNull()
  expect(screen.getByRole('button', { name: 'Clear filters' }).parentElement).toBe(screen.getByRole('button', { name: 'Refresh' }).parentElement)
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('')
  expect((screen.getByLabelText('Start date from') as HTMLInputElement).value).toBe('')
  await screen.findByText('2 shifts across all agencies')
  expect(screen.queryByRole('button', { name: 'New shift' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Apply filters' })).toBeNull()
})
it('rejects a reversed range without making a filtered request', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/summary') ? summary : { shifts })))
  vi.stubGlobal('fetch', fetchMock); mount(); await screen.findByText('2 shifts across all agencies')
  await userEvent.type(screen.getByLabelText('Start date from'), '2099-10-02')
  await userEvent.type(screen.getByLabelText('Start date through'), '2099-10-01')
  await screen.findByText('Start date must be on or before end date.')
  expect(fetchMock.mock.calls.some(([url]) => url.includes('dateFrom=2099-10-02') && url.includes('dateTo=2099-10-01'))).toBe(false)
  expect(filterSchema.safeParse({ agencyId: '', status: '', dateFrom: '2099-02-30', dateTo: '' }).success).toBe(false)
})
it('shows a filtered empty state and preserves agency options', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('/summary') ? summary : { shifts: url.includes('?') ? [] : shifts }))))
  mount(); await screen.findByText('2 shifts across all agencies')
  await userEvent.selectOptions(screen.getByLabelText('Status'), 'filled')
  await screen.findByText('No shifts match your filters')
  expect(screen.getByRole('option', { name: 'Sunrise' })).toBeTruthy()
  expect(screen.getByRole('option', { name: 'Metro' })).toBeTruthy()
})
it('handles summary failure independently of the shift list', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/summary') ? new Response('{}', { status: 500 }) : new Response(JSON.stringify({ shifts }))))
  mount(); await screen.findByText('We could not load the overview')
  await screen.findByText('2 shifts across all agencies')
  expect(screen.getByRole('button', { name: 'Retry overview' })).toBeTruthy()
})
it.each([401, 403])('handles list HTTP %s without exposing shift cards', async (status) => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('/summary') ? new Response(JSON.stringify(summary)) : new Response('{}', { status })))
  const { clearSession } = mount(); await screen.findByRole('alert')
  expect(screen.queryByText('RN')).toBeNull()
  if (status === 401) { await userEvent.click(screen.getByRole('button', { name: 'Sign in again' })); expect(clearSession).toHaveBeenCalledTimes(1) }
})
it.each(['nurse', 'agency'] as const)('does not request admin data for a %s session', (role) => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); mount(role)
  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.queryByRole('form', { name: 'Shift filters' })).toBeNull()
})
