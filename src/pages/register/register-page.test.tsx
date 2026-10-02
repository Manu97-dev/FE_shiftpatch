// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../features/auth/contexts/auth-provider'
import { AppRoutes } from '../../app/router'

const user = { id: '66666666-6666-4666-8666-666666666666', name: 'New Nurse', role: 'nurse' }
function mount(path = '/register') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><AuthProvider><MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter></AuthProvider></QueryClientProvider>)
}
function server(register: (options: RequestInit) => Promise<Response>) {
  const posts = vi.fn(register)
  vi.stubGlobal('fetch', async (url: string, options: RequestInit) => {
    if (url === '/api/auth/session') return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    if (url === '/api/auth/register/nurse') return posts(options)
    return new Response(JSON.stringify(url === '/api/nurses/me/shifts' ? { nurseId: '33333333-3333-4333-8333-333333333333', shifts: [] } : { shifts: [] }))
  })
  return posts
}
async function fill(confirm = 'A nurse passphrase!') {
  await screen.findByLabelText('Full name')
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: ' New Nurse ' } })
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'new@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A nurse passphrase!' } })
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: confirm } })
  fireEvent.change(screen.getByLabelText('Credential expiration date'), { target: { value: '2027-12-31' } })
}
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('links from login to nurse registration and submits only the nurse fields', async () => {
  const posts = server(async () => new Response(JSON.stringify({ token: 'token', user }), { status: 201 }))
  mount('/login')
  await userEvent.click(await screen.findByRole('link', { name: 'Register as a nurse' }))
  await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create nurse account' }))
  await screen.findByRole('main', { name: 'Home' })
  expect(posts).toHaveBeenCalledTimes(1)
  const options = posts.mock.calls[0]![0]
  expect(JSON.parse(options.body as string)).toEqual({ name: 'New Nurse', email: 'new@example.com', password: 'A nurse passphrase!', credentialExpirationDate: '2027-12-31' })
  expect(options.credentials).toBe('include')
  expect(new Headers(options.headers).get('X-Shiftpatch-Request')).toBe('1')
})
it('requires fields and matching passwords before submission', async () => {
  const posts = server(async () => new Response())
  mount()
  await userEvent.click(await screen.findByRole('button', { name: 'Create nurse account' }))
  await screen.findByText('Enter your full name.')
  expect(posts).not.toHaveBeenCalled()
  await fill('Different passphrase!')
  await userEvent.click(screen.getByRole('button', { name: 'Create nurse account' }))
  await screen.findByText('Passwords must match.')
  expect(posts).not.toHaveBeenCalled()
})
it.each([
  [409, 'already registered'], [400, 'Check your details'], [500, 'could not create'], [429, 'Too many attempts'],
])('handles HTTP %s while keeping the form available', async (status, message) => {
  const posts = server(async () => new Response(JSON.stringify({ error: 'Failure' }), { status }))
  mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create nurse account' }))
  expect((await screen.findByRole('alert')).textContent).toContain(message)
  expect(screen.queryByRole('main', { name: 'Home' })).toBeNull()
  expect(posts).toHaveBeenCalledTimes(1)
  expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe(' New Nurse ')
})
it('disables the form during signup and does not resubmit', async () => {
  let done!: (response: Response) => void
  const posts = server(() => new Promise((resolve) => { done = resolve }))
  mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create nurse account' }))
  const button = await screen.findByRole('button', { name: 'Creating account…' })
  expect(button.matches(':disabled')).toBe(true)
  expect(screen.getByLabelText('Email address').matches(':disabled')).toBe(true)
  await userEvent.click(button)
  expect(posts).toHaveBeenCalledTimes(1)
  done(new Response(JSON.stringify({ token: 'token', user }), { status: 201 }))
  await screen.findByRole('main', { name: 'Home' })
})
it('rejects a registration response granting another role', async () => {
  server(async () => new Response(JSON.stringify({ token: 'token', user: { ...user, role: 'admin' } }), { status: 201 }))
  mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create nurse account' }))
  await screen.findByRole('alert')
  expect(screen.queryByRole('main', { name: 'Home' })).toBeNull()
})
it('shows network errors without retrying and clears feedback when editing', async () => {
  const posts = server(async () => { throw new TypeError('Failed to fetch') })
  mount(); await fill()
  await userEvent.click(screen.getByRole('button', { name: 'Create nurse account' }))
  await screen.findByRole('alert')
  expect(posts).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Updated Nurse' } })
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
})
