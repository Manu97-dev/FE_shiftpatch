// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AgencyManagement } from './agency-management'
import { AdminDashboard } from './admin-dashboard'

const agency = { id: '10000000-0000-4000-8000-000000000001', name: 'Sunrise', contactEmail: 'sunrise@example.com', members: [] as { id: string; userId: string; name: string; email: string; role: string }[] }
const member = { id: '10000000-0000-4000-8000-000000000002', userId: '20000000-0000-4000-8000-000000000002', name: 'Alex Member', email: 'alex@example.com', role: 'manager' }
function mount(role: 'admin' | 'agency' | 'nurse' = 'admin', dashboard = false) {
  const signIn = vi.fn()
  const clearSession = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><AuthContext.Provider value={{ session: { token: 'admin-token', user: { id: '20000000-0000-4000-8000-000000000001', name: 'Admin', role } }, status: 'ready', signIn, signOut: vi.fn(), retryRestore: vi.fn(), clearSession }}>{dashboard ? <AdminDashboard /> : <AgencyManagement />}</AuthContext.Provider></QueryClientProvider>)
  return { signIn, clearSession }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
function field(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
async function openMember() { await userEvent.click(await screen.findByRole('button', { name: 'Add member to Sunrise' })) }
function fillMember() { field('Member name', ' Alex Member '); field('Member email', 'alex@example.com'); field('Initial password', 'Agency member passphrase!') }
it('creates an agency and refreshes the list, including agencies without shifts', async () => {
  let created = false
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
    if (options.method === 'POST') { created = true; return new Response(JSON.stringify(agency), { status: 201 }) }
    return new Response(JSON.stringify({ agencies: created ? [agency] : [] }))
  })
  vi.stubGlobal('fetch', fetchMock); const { signIn } = mount()
  await screen.findByText('No agencies yet. Create an agency to get started.')
  await userEvent.click(screen.getByRole('button', { name: 'Create agency' }))
  field('Agency name', ' Sunrise '); field('Agency contact email', 'sunrise@example.com')
  await userEvent.click(screen.getByRole('button', { name: 'Save agency' }))
  await screen.findByRole('button', { name: 'Add member to Sunrise' })
  const posts = fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(posts[0]![0]).toBe('/api/admin/agencies')
  expect(JSON.parse(posts[0]![1].body as string)).toEqual({ name: 'Sunrise', contactEmail: 'sunrise@example.com' })
  expect(signIn).not.toHaveBeenCalled()
})
it.each(['owner', 'manager'] as const)('creates a %s account for the selected agency and keeps the admin session', async (role) => {
  let created = false
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => {
    if (options.method === 'POST') { created = true; return new Response(JSON.stringify({ ...member, role }), { status: 201 }) }
    return new Response(JSON.stringify({ agencies: [{ ...agency, members: created ? [{ ...member, role }] : [] }] }))
  })
  vi.stubGlobal('fetch', fetchMock); const { signIn } = mount()
  await openMember(); fillMember()
  await userEvent.selectOptions(screen.getByLabelText('Membership role'), role)
  await userEvent.click(screen.getByRole('button', { name: 'Create member' }))
  await screen.findByText('Alex Member', { exact: true })
  const posts = fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(posts[0]![0]).toBe(`/api/admin/agencies/${agency.id}/members`)
  expect(JSON.parse(posts[0]![1].body as string)).toEqual({ name: 'Alex Member', email: 'alex@example.com', password: 'Agency member passphrase!', role })
  expect(new Headers(posts[0]![1].headers).get('Authorization')).toBe('Bearer admin-token')
  expect(screen.queryByLabelText('Initial password')).toBeNull()
  expect(signIn).not.toHaveBeenCalled()
})
it('validates member fields and supports closing without submitting', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ agencies: [agency] })))
  vi.stubGlobal('fetch', fetchMock); mount(); await openMember()
  await userEvent.click(screen.getByRole('button', { name: 'Create member' }))
  await screen.findByText('Enter a name.')
  expect(screen.getByText('Use at least 12 characters.')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  await userEvent.click(screen.getByRole('button', { name: 'Close form' }))
  expect(screen.queryByRole('form')).toBeNull()
})
it.each([
  [409, 'already registered'], [404, 'no longer exists'], [401, 'session has expired'], [403, 'Admin access'], [500, 'could not confirm'],
])('handles member HTTP %s without automatic retries', async (status, message) => {
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => new Response(JSON.stringify(options.method === 'POST' ? { error: 'Failure' } : { agencies: [agency] }), { status: options.method === 'POST' ? status : 200 }))
  vi.stubGlobal('fetch', fetchMock); mount(); await openMember(); fillMember()
  await userEvent.click(screen.getByRole('button', { name: 'Create member' }))
  expect((await screen.findByRole('alert')).textContent).toContain(message)
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1)
  expect((screen.getByLabelText('Member name') as HTMLInputElement).value).toBe(' Alex Member ')
})
it('disables member submission while creation is pending', async () => {
  let resolve!: (value: Response) => void
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => options.method === 'POST' ? new Promise<Response>((done) => { resolve = done }) : new Response(JSON.stringify({ agencies: [agency] })))
  vi.stubGlobal('fetch', fetchMock); mount(); await openMember(); fillMember()
  await userEvent.click(screen.getByRole('button', { name: 'Create member' }))
  const button = await screen.findByRole('button', { name: 'Creating…' })
  expect(button.matches(':disabled')).toBe(true)
  expect(screen.getByRole('button', { name: 'Close form' }).matches(':disabled')).toBe(true)
  await userEvent.click(button)
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1)
  resolve(new Response(JSON.stringify(member), { status: 201 }))
  await waitFor(() => expect(screen.queryByRole('form')).toBeNull())
})
it.each(['agency', 'nurse'] as const)('does not show or fetch management for %s', (role) => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); mount(role)
  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.queryByRole('region')).toBeNull()
})
it('switches admin tabs and preserves unfinished agency forms', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('/admin/agencies') ? { agencies: [agency] } : url.includes('/summary') ? { asOf: '2026-10-02T06:00:00Z', upcomingOpen: 0, upcomingAssigned: 0, upcomingTotal: 0 } : { shifts: [] }))))
  mount('admin', true)
  expect(screen.getByRole('tab', { name: 'Shifts' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.queryByRole('region', { name: 'Agencies and members' })).toBeNull()
  await userEvent.click(screen.getByRole('tab', { name: 'Agencies' }))
  const region = await screen.findByRole('region', { name: 'Agencies and members' })
  expect(await within(region).findByText('Sunrise')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Shift overview' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Create agency' }))
  field('Agency name', 'Draft agency')
  await userEvent.click(screen.getByRole('tab', { name: 'Shifts' }))
  expect(screen.queryByRole('form', { name: 'Create agency' })).toBeNull()
  await userEvent.click(screen.getByRole('tab', { name: 'Agencies' }))
  expect((screen.getByLabelText('Agency name') as HTMLInputElement).value).toBe('Draft agency')
})
