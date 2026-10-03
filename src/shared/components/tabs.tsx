import { useState, type ReactNode } from 'react'
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
  const [value, setValue] = useState(defaultValue)
  const [visited, setVisited] = useState(() => new Set([defaultValue]))
  return <RadixTabs.Root value={value} onValueChange={(next) => { setValue(next); setVisited(previous => new Set([...previous, next])) }} className={styles.root}>
    <RadixTabs.List aria-label={label} className={styles.list}>
      {items.map((item) => <RadixTabs.Trigger key={item.value} value={item.value} className={styles.trigger}>
        {item.label}{' '}{item.count !== undefined && <span className={styles.count}>{item.count}</span>}
      </RadixTabs.Trigger>)}
    </RadixTabs.List>
    {items.map((item) => <RadixTabs.Content key={item.value} value={item.value} forceMount
      hidden={value !== item.value} className={styles.panel}>
      {(!item.lazy || visited.has(item.value)) && item.content}
    </RadixTabs.Content>)}
  </RadixTabs.Root>
}
