import { useContext, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { WorkspaceNavigationContext } from './workspace-navigation.context'
import { Tabs as RadixTabs } from 'radix-ui'
import styles from './tabs.module.scss'

export interface TabItem {
  value: string
  label: string
  count?: number
  lazy?: boolean
  content: ReactNode
}
interface Props {
  items: TabItem[]
  defaultValue: string
  label: string
}

// Keep panels mounted to preserve form and disclosure state.
// Inactive panels are hidden from layout and accessibility.
export function Tabs({ items, defaultValue, label }: Props) {
  const navigation = useContext(WorkspaceNavigationContext)
  const [value, setValue] = useState(defaultValue)
  const [visited, setVisited] = useState(() => new Set([defaultValue]))
  const list = <RadixTabs.List aria-label={label} className={navigation ? styles.sidebarList : styles.list}>
      {items.map((item) => <RadixTabs.Trigger key={item.value} value={item.value} className={styles.trigger} onClick={navigation?.onNavigate}>
        {item.label}{' '}{item.count !== undefined && <span className={styles.count}>{item.count}</span>}
      </RadixTabs.Trigger>)}
    </RadixTabs.List>
  return <RadixTabs.Root orientation={navigation ? 'vertical' : 'horizontal'} value={value} onValueChange={(next) => { setValue(next); setVisited(previous => new Set([...previous, next])) }} className={styles.root}>
    {navigation ? navigation.target && createPortal(list, navigation.target) : list}
    {items.map((item) => <RadixTabs.Content key={item.value} value={item.value} forceMount
      hidden={value !== item.value} className={styles.panel}>
      {(!item.lazy || visited.has(item.value)) && item.content}
    </RadixTabs.Content>)}
  </RadixTabs.Root>
}
