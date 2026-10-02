// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AgencyAssignmentControls } from './agency-assignment-controls'
import type { Shift } from '../../shifts/api/shifts.schemas'

const shift: Shift = { id: '44444444-4444-4444-8444-444444444444', agencyId: '55555555-5555-4555-8555-555555555555', agencyName: 'Sunrise', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'filled', claimedBy: '33333333-3333-4333-8333-333333333333' }
const start = new Date('2099-10-01T19:00:00-06:00').getTime()
function mount(now: number, value = shift) {
  vi.spyOn(Date, 'now').mockReturnValue(now)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const view = render(<QueryClientProvider client={client}><AuthContext.Provider value={{ session: { token: 'agency-token', user: { id: '66666666-6666-4666-8666-666666666666', name: 'Agency', role: 'agency' } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession: vi.fn() }}><AgencyAssignmentControls shift={value} now={now} /></AuthContext.Provider></QueryClientProvider>)
  return { invalidate, view }
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each([
  ['advance', start - 1, 'Cancel assignment', 'Confirm cancellation', 'Assignment cancelled.'],
  ['no-show', start, 'Mark no-show', 'Confirm no-show', 'No-show recorded. Assignment removed.'],
  ['no-show', start + 86400000, 'Mark no-show', 'Confirm no-show', 'No-show recorded. Assignment removed.'],
] as const)('sends %s only after confirmation and refreshes affected data', async (reason, now, label, confirm, success) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ...shift, status: 'open', claimedBy: null, cancellation: { reason, previousNurseId: shift.claimedBy } })))
  vi.stubGlobal('fetch', fetchMock)
  const { invalidate } = mount(now)
  await userEvent.click(screen.getByRole('button', { name: label }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText(/Ends next day/)).toBeTruthy()
  expect(fetchMock).not.toHaveBeenCalled()
  await userEvent.click(within(dialog).getByRole('button', { name: confirm }))
  await screen.findByText(success)
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe(`/api/shifts/${shift.id}/cancel`)
  expect(JSON.parse(options.body as string)).toEqual({ reason })
  expect(new Headers(options.headers).get('Authorization')).toBe('Bearer agency-token')
  await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4))
})
it('offers no action for an unassigned shift', () => {
  mount(start, { ...shift, status: 'open', claimedBy: null })
  expect(screen.queryByRole('button')).toBeNull()
})
it('backs out without sending a request', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
  mount(start - 1)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel assignment' }))
  await userEvent.click(screen.getByRole('button', { name: 'Go back' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})
it.each([
  [403, 'Forbidden', 'own agency'],
  [404, 'Shift not found', 'no longer exists'],
  [409, 'Shift is already open', 'already been reopened'],
  [409, 'Shift has started, cannot cancel in advance', 'Advance cancellation is no longer available'],
  [401, 'Unauthorized', 'session has expired'],
])('handles HTTP %s without repeating the mutation', async (status, error, message) => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error }), { status }))
  vi.stubGlobal('fetch', fetchMock)
  const { invalidate } = mount(start - 1)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel assignment' }))
  await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  expect((await screen.findByRole('alert')).textContent).toContain(message)
  expect(screen.queryByRole('button', { name: 'Confirm cancellation' })).toBeNull()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(4))
})
it('blocks a cancellation when the clock passes the cutoff with the dialog open', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock)
  const { view } = mount(start - 1)
  await userEvent.click(screen.getByRole('button', { name: 'Cancel assignment' }))
  vi.mocked(Date.now).mockReturnValue(start)
  await userEvent.click(screen.getByRole('button', { name: 'Confirm cancellation' }))
  expect(fetchMock).not.toHaveBeenCalled()
  view.unmount()
})
