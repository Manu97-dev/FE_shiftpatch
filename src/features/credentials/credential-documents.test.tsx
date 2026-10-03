// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../auth/contexts/auth.context'
import { CredentialDocuments } from './credential-documents'
function mount(role: 'nurse' | 'admin' = 'nurse') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthContext.Provider value={{ session: { token: 'token', user: { id: '20000000-0000-4000-8000-000000000001', name: 'Alex', role } }, status: 'ready', signIn: vi.fn(), signOut: vi.fn(), clearSession: vi.fn(), retryRestore: vi.fn() }}><CredentialDocuments /></AuthContext.Provider></QueryClientProvider>)
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('shows loading and empty state while separating self-reported expiry', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ documents: [], selfReportedExpiry: '2027-01-01' }))))
  mount(); expect(screen.getByRole('status').textContent).toContain('Loading')
  await screen.findByText('No credential documents uploaded yet.')
  expect(screen.getByText(/Existing self-reported credential expiry/).textContent).toContain('2027-01-01')
  expect(screen.getByLabelText('Document file')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})
it('shows an error without a retry control', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
  mount(); await screen.findByRole('alert'); expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
})
it('admin sees nurse names and downloads without mutation controls', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ documents: [{ id: '10000000-0000-4000-8000-000000000001', kind: 'tb_test', filename: 'tb.pdf', expiresOn: '2027-01-01', size: 100, nurseName: 'Alex' }], selfReportedExpiry: null }))))
  mount('admin'); await screen.findByText('TB test result — Alex')
  expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy()
  expect(screen.queryByLabelText('Document file')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Save expiry' })).toBeNull()
})
it('uploads PDF with bearer authentication and refreshes documents', async () => {
  const fetchMock = vi.fn(async (_url: string, options: RequestInit) => new Response(JSON.stringify(options.method === 'POST' ? {} : { documents: [], selfReportedExpiry: '2027-01-01' })))
  vi.stubGlobal('fetch', fetchMock); mount(); await screen.findByText('No credential documents uploaded yet.')
  const actor = userEvent.setup()
  fireEvent.change(screen.getByLabelText('Document expiry date'), { target: { value: '2027-01-01' } })
  await actor.upload(screen.getByLabelText('Document file'), new File(['%PDF-1.7'], 'license.pdf', { type: 'application/pdf' }))
  await screen.findByText('Document uploaded.')
  const call = fetchMock.mock.calls.find(([, options]) => options.method === 'POST')!
  expect(new Headers(call[1].headers).get('Authorization')).toBe('Bearer token')
  expect(JSON.parse(String(call[1].body))).toMatchObject({ kind: 'nurse_license', filename: 'license.pdf', expiresOn: '2027-01-01', mimeType: 'application/pdf', data: 'JVBERi0xLjc=' })
})

it('shows actual upload failure and clears it when fields change', async () => {
  vi.stubGlobal('fetch', vi.fn(async (_url: string, options: RequestInit) => options.method === 'POST'
    ? new Response(JSON.stringify({ error: 'Upload unavailable' }), { status: 503 })
    : new Response(JSON.stringify({ documents: [], selfReportedExpiry: '2027-01-01' }))))
  mount(); await screen.findByText('No credential documents uploaded yet.')
  fireEvent.change(screen.getByLabelText('Document expiry date'), { target: { value: '2027-01-01' } })
  await userEvent.upload(screen.getByLabelText('Document file'), new File(['%PDF-1.7'], 'license.pdf', { type: 'application/pdf' }))
  expect((await screen.findByRole('alert')).textContent).toBe('Upload unavailable')
  fireEvent.change(screen.getByLabelText('Document type'), { target: { value: 'tb_test' } })
  expect(screen.queryByRole('alert')).toBeNull()
})
it('labels demo auto-approval and displays the expiry used for claims', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ documents: [], selfReportedExpiry: '2028-01-01', autoApprovalEnabled: true }))))
  mount()
  await screen.findByText(/Demo auto-approval enabled/)
  expect(screen.getByText(/Credential expiry used for shift claims/).textContent).toContain('2028-01-01')
  expect(screen.queryByText(/Document dates are tracked separately/)).toBeNull()
})
