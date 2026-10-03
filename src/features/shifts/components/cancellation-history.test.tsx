// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { CancellationHistory } from './cancellation-history'
const id = '44444444-4444-4444-8444-444444444444'
const event = { id, shiftId: id, agencyId: id, agencyName: 'Sunrise', role: 'RN', previousNurseId: id, nurseName: 'Alex Nurse', cancelledByUserId: id, reason: 'no-show', startsAt: '2026-10-03T13:00:00Z', endsAt: '2026-10-04T01:00:00Z', cancelledAt: '2026-10-03T14:00:00Z' }
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{ session: { token: 'token', user: { id, name: 'Agency', role: 'agency' } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession: vi.fn() }}><CancellationHistory /></AuthContext.Provider></QueryClientProvider>)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('shows the previous nurse, reason, shift and event time, and paginates', async () => {
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('offset=0') ? { cancellations: [event], hasMore: true } : { cancellations: [], hasMore: false })))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  await screen.findByText('No-show · Alex Nurse')
  expect(screen.getByText('RN · Sunrise')).toBeTruthy()
  expect(screen.getByText(/Recorded: Oct 3, 2026, 8:00 AM/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Next' }))
  await screen.findByText('No cancellation events recorded on this page.')
  expect(fetchMock.mock.calls[1]![0]).toContain('offset=50')
  await userEvent.click(screen.getByRole('button', { name: 'Previous' }))
  await screen.findByText('No-show · Alex Nurse')
})
it('shows an empty history', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cancellations: [], hasMore: false }))))
  mount()
  await screen.findByText('No cancellation events recorded.')
  expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true)
})
it('shows loading and allows retry after failure', async () => {
  let resolve: (response: Response) => void = () => {}
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise<Response>((done) => { resolve = done })).mockResolvedValue(new Response(JSON.stringify({ cancellations: [event], hasMore: false })))
  vi.stubGlobal('fetch', fetchMock)
  mount()
  expect(screen.getByText('Loading cancellation history…')).toBeTruthy()
  resolve(new Response(JSON.stringify({ error: 'Failed' }), { status: 500 }))
  await screen.findByRole('alert')
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('No-show · Alex Nurse')
})
it.each([401, 403])('handles denied history access %s without showing events', async (status) => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Denied' }), { status })))
  mount()
  await screen.findByRole('alert')
  expect(screen.queryByText('No-show · Alex Nurse')).toBeNull()
  expect(screen.getByText(status === 401 ? 'Your session has expired' : 'History access unavailable')).toBeTruthy()
})
