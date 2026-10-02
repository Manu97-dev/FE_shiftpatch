import { createContext, useContext } from 'react'
import type { Session } from '../api/auth.schemas'

export const AuthContext = createContext<{
  session: Session | null
  status: 'loading' | 'ready' | 'error'
  retryRestore: () => void
  clearSession: () => void
  signOut: () => Promise<void>
  signIn: (session: Session) => void
} | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
