// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../features/auth/contexts/auth.context'
import { HomeLayout } from './home-layout'
import { Tabs } from './tabs'

afterEach(cleanup)
function mount(signOut = vi.fn(async () => {})) {
  const client = new QueryClient()
  client.setQueryData(['private'], 'cached')
  render(<QueryClientProvider client={client}><AuthContext.Provider value={{ session: {token:'token',user:{id:'id',name:'Alex',role:'nurse'}},status:'ready',signOut,signIn:vi.fn(),clearSession:vi.fn(),retryRestore:vi.fn() }}><HomeLayout><Tabs label="Nurse workspace" defaultValue="mine" items={[
    {value:'mine',label:'My shifts',content:<input aria-label="Note" />},
    {value:'available',label:'Available shifts',lazy:true,content:<p>Available content</p>},
  ]} /></HomeLayout></AuthContext.Provider></QueryClientProvider>)
  return client
}
it('moves navigation into the sidebar, supports vertical keys and preserves panel state', async () => {
  mount()
  const nav = screen.getByRole('navigation')
  expect(within(nav).getByRole('tablist').getAttribute('aria-orientation')).toBe('vertical')
  await userEvent.type(screen.getByLabelText('Note'), 'Keep me')
  const first = within(nav).getByRole('tab',{name:'My shifts'})
  first.focus()
  await userEvent.keyboard('{ArrowDown}')
  expect(screen.getByRole('tab',{name:'Available shifts'}).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByText('Available content')).toBeTruthy()
  await userEvent.keyboard('{ArrowUp}')
  expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('Keep me')
})
it('closes the compact menu with Escape and restores focus to its button', async () => {
  mount()
  const menu = screen.getByRole('button',{name:'Menu'})
  await userEvent.click(menu)
  expect(menu.getAttribute('aria-expanded')).toBe('true')
  await userEvent.click(screen.getByRole('tab',{name:'My shifts'}))
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(screen.getByRole('main'))
  await userEvent.click(menu)
  await userEvent.keyboard('{Escape}')
  expect(menu.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(menu)
})
it('retains cached data on logout failure and clears it after a successful retry', async () => {
  const signOut = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined)
  const client = mount(signOut)
  await userEvent.click(screen.getByRole('button',{name:'Sign out'}))
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(client.getQueryData(['private'])).toBe('cached')
  await userEvent.click(screen.getByRole('button',{name:'Sign out'}))
  expect(client.getQueryData(['private'])).toBeUndefined()
})
