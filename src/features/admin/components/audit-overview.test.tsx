// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AuditOverview } from './audit-overview'
const id = '20000000-0000-4000-8000-000000000001'
function mount(role: 'admin' | 'nurse' = 'admin') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{
    session: { token: 'token', user: { id, name: 'Alex', role } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession: vi.fn(),
  }}><AuditOverview /></AuthContext.Provider></QueryClientProvider>)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('renders safe event fields and navigates older and newer pages', async () => {
  const cursor = { occurredAt: '2026-10-03T12:00:00.000Z', id }
  const fetchMock = vi.fn(async (url: string) => new Response(JSON.stringify(url.includes('?') ? { events: [], nextCursor: null } : {
    events: [{ ...cursor, actorId: id, action: 'agency.created', targetType: 'agency', targetId: id, context: { name: 'Sunrise' } }], nextCursor: cursor,
  })))
  vi.stubGlobal('fetch', fetchMock); mount()
  await screen.findByRole('cell', { name: 'Agency created' })
  expect(screen.getByText('Sunrise')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Older records' }))
  await screen.findByText(/No audit records yet/)
  expect(fetchMock.mock.calls.at(-1)![0]).toContain('beforeId=')
  await userEvent.click(screen.getByRole('button', { name: 'Newer records' }))
  await screen.findByRole('cell', { name: 'Agency created' })
})
it('shows a recoverable error', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 }))); mount()
  await screen.findByRole('heading', { name: 'We could not load the audit log' })
  expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy()
})
it('does not query for non-admin accounts', () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); mount('nurse')
  expect(fetchMock).not.toHaveBeenCalled()
})
