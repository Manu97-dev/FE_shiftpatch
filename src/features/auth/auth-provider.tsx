import { useMemo, useState, type PropsWithChildren } from 'react'
import { AuthContext } from './auth.context'
import type { Session } from './auth.schemas'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, signIn] = useState<Session | null>(null)
  const value = useMemo(() => ({ session, signIn }), [session])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
