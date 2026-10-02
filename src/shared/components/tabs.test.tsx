// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from './tabs'

afterEach(cleanup)
function mount() {
  render(<Tabs label="Example sections" defaultValue="first" items={[
    { value: 'first', label: 'First', count: 3, content: <><label htmlFor="note">Note</label><input id="note" /></> },
    { value: 'second', label: 'Second', count: 0, content: <p>Second content</p> },
  ]} />)
}
it('shows only the selected panel and keeps zero counts visible', async () => {
  mount()
  expect(screen.getByRole('tab', { name: 'First 3' }).getAttribute('aria-selected')).toBe('true')
  expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  await userEvent.click(screen.getByRole('tab', { name: 'Second 0' }))
  expect(within(screen.getByRole('tabpanel')).getByText('Second content')).toBeTruthy()
  expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull()
})
it('supports arrow-key navigation and preserves panel state and scroll offsets', async () => {
  mount()
  await userEvent.type(screen.getByLabelText('Note'), 'Keep this note')
  const firstPanel = screen.getByRole('tabpanel')
  firstPanel.scrollTop = 80
  const firstTab = screen.getByRole('tab', { name: 'First 3' })
  firstTab.focus()
  await userEvent.keyboard('{ArrowRight}')
  expect(screen.getByRole('tab', { name: 'Second 0' }).getAttribute('aria-selected')).toBe('true')
  await userEvent.keyboard('{ArrowLeft}')
  expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('Keep this note')
  expect(screen.getByRole('tabpanel')).toBe(firstPanel)
  expect(firstPanel.scrollTop).toBe(80)
})
