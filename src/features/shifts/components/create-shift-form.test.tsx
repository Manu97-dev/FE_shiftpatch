import { Dialog } from 'radix-ui'
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { AuthContext } from '../../auth/contexts/auth.context'
import { AgencyDashboard } from '../../agencies/components/agency-dashboard'
import { CreateShiftForm } from './create-shift-form'
import { createShiftFormSchema } from '../api/create-shift.schemas'
import { fetchAvailableShifts } from '../api/shifts.api'
const agencyId = '10000000-0000-4000-8000-000000000001'
const otherAgency = '10000000-0000-4000-8000-000000000002'
const shift = { id: '40000000-0000-4000-8000-000000000001', agencyId, agencyName: 'Sunrise', role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00', status: 'open', claimedBy: null }
function Marketplace() { useQuery({ queryKey: ['shifts', 'nurse-user', 'available'], queryFn: () => fetchAvailableShifts('nurse-token') }); return null }
function mount(dashboard = false, role: 'agency' | 'nurse' | 'admin' = 'agency') {
  const onCreated = vi.fn(), onClose = vi.fn(), clearSession = vi.fn()
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{
    session: { token: 'agency-token', user: { id: '20000000-0000-4000-8000-000000000001', name: 'Alex', role } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), retryRestore: vi.fn(), clearSession,
  }}>{dashboard ? <><AgencyDashboard /><Marketplace /></> : <Dialog.Root defaultOpen><CreateShiftForm agencyId={agencyId} agencyName="Sunrise" onCreated={onCreated} onClose={onClose} /></Dialog.Root>}</AuthContext.Provider></QueryClientProvider>)
  return { onCreated, onClose, clearSession }
}
async function fill() {
  await userEvent.type(screen.getByLabelText('Required nurse role'), ' RN ')
  await userEvent.type(screen.getByLabelText('Shift date'), '2099-10-01')
  await userEvent.type(screen.getByLabelText('Start time'), '19:00')
  await userEvent.type(screen.getByLabelText('End time'), '07:00')
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('creates an overnight shift with only allowed fields and refreshes agency and marketplace queries', async () => {
  let created = false
  const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
    if (options.method === 'POST') { created = true; return new Response(JSON.stringify(shift), { status: 201 }) }
    if (url === '/api/agencies') return new Response(JSON.stringify({ agency: { id: agencyId, name: 'Sunrise' } }))
    return new Response(JSON.stringify(url.includes('/agencies/') ? { agencyId, agencyName: 'Sunrise', shifts: created ? [shift] : [] } : { shifts: created ? [shift] : [] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  mount(true)
  const newShift = await screen.findByRole('button', { name: 'New shift' })
  expect(screen.getByTestId('agency-post-shift-button')).toBe(newShift)
  expect(newShift.parentElement).toBe(screen.getByRole('button', { name: 'Refresh' }).parentElement)
  await userEvent.click(newShift)
  await fill()
  expect(screen.getByTestId('agency-post-shift-submit-button')).toBe(screen.getByRole('button', { name: 'Create shift' }))
  expect(screen.getByText('Overnight shift: the end time is on the following day.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByTestId('notification-banner').textContent).toBe('Shift created successfully.')
  const posts = fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')
  expect(posts).toHaveLength(1)
  expect(posts[0]![0]).toBe('/api/shifts')
  expect(JSON.parse(posts[0]![1].body as string)).toEqual({ role: 'RN', date: '2099-10-01', startTime: '19:00', endTime: '07:00' })
  expect(new Headers(posts[0]![1].headers).get('Authorization')).toBe('Bearer agency-token')
  expect(fetchMock.mock.calls.filter(([url]) => url === `/api/agencies/${agencyId}/shifts`)).toHaveLength(2)
  expect(fetchMock.mock.calls.filter(([url]) => url === '/api/shifts/available')).toHaveLength(2)
})
it('validates required fields without a request', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock); mount()
  await userEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  await screen.findByText('Enter the required nurse role.')
  expect(fetchMock).not.toHaveBeenCalled()
})
it('rejects invalid dates and equal times while allowing custom professional roles', () => {
  const input = { role: 'Custom care role', date: '2099-10-01', startTime: '07:00', endTime: '19:00' }
  expect(createShiftFormSchema.safeParse(input).success).toBe(true)
  expect(createShiftFormSchema.safeParse({ ...input, date: '2099-02-30' }).success).toBe(false)
  expect(createShiftFormSchema.safeParse({ ...input, endTime: '07:00' }).success).toBe(false)
  expect(createShiftFormSchema.safeParse({ ...input, role: '   ' }).success).toBe(false)
})
it.each([401, 403, 500])('handles HTTP %s and never automatically retries creation', async (status) => {
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => options.method === 'POST'
    ? new Response(JSON.stringify({ error: 'Error' }), { status })
    : new Response(JSON.stringify({ agency: { id: agencyId, name: 'Sunrise' } })))
  vi.stubGlobal('fetch', fetchMock); const { onCreated } = mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  expect((await screen.findByTestId('notification-banner')).getAttribute('role')).toBe('alert')
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1)
  expect(onCreated).not.toHaveBeenCalled()
  expect((screen.getByRole('button', { name: 'Create shift' }) as HTMLButtonElement).disabled).toBe(true)
})
it('blocks submission when agency membership has changed', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ agency: { id: otherAgency, name: 'Other agency' } })))
  vi.stubGlobal('fetch', fetchMock); mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  await screen.findByText('Your agency access has changed or been revoked. Refresh the dashboard before creating a shift.')
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
it.each(['nurse', 'admin'] as const)('does not expose creation to %s accounts', (role) => {
  mount(false, role)
  expect(screen.queryByRole('button', { name: 'Create shift' })).toBeNull()
})

it('permits correction after a backend validation rejection', async () => {
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => options.method === 'POST'
    ? new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 })
    : new Response(JSON.stringify({ agency: { id: agencyId, name: 'Sunrise' } })))
  vi.stubGlobal('fetch', fetchMock); mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  await screen.findByText('The shift details were rejected. Review the fields and try again.')
  expect((screen.getByLabelText('Required nurse role').closest('fieldset') as HTMLFieldSetElement).disabled).toBe(false)
})
it('disables submission and closing while a creation request is pending', async () => {
  let finish!: (response: Response) => void
  const response = new Promise<Response>((resolve) => { finish = resolve })
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => options.method === 'POST'
    ? response : new Response(JSON.stringify({ agency: { id: agencyId, name: 'Sunrise' } })))
  vi.stubGlobal('fetch', fetchMock); const { onCreated } = mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create shift' }))
  await screen.findByRole('button', { name: 'Creating…' })
  await userEvent.keyboard('{Escape}')
  expect(screen.getByRole('dialog', { name: 'Create a shift' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Creating…' }))
  expect((screen.getByRole('button', { name: 'Close form' }) as HTMLButtonElement).disabled).toBe(true)
  finish(new Response(JSON.stringify(shift), { status: 201 }))
  await screen.findByRole('button', { name: 'Create shift' })
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'POST')).toHaveLength(1)
  expect(onCreated).toHaveBeenCalledTimes(1)
})
