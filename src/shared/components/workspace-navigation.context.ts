import { createContext } from 'react'

export const WorkspaceNavigationContext = createContext<{
  target: HTMLElement | null
  onNavigate: () => void
} | null>(null)
