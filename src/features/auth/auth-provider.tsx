import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { AuthContext } from './auth.context'
import { logout, restoreSession } from './auth.api'
import type { Session } from './auth.schemas'

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const clearSession = useCallback(() => { setSession(null); client.clear() }, [client])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const signIn = useCallback((value: Session) => {
    setSession(value)
    setStatus('ready')
  }, [])
  const signOut = useCallback(async () => {
    await logout()
    setSession(null)
  }, [])
  const retryRestore = useCallback(() => {
    setStatus('loading')
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void restoreSession(controller.signal).then((value) => {
      if (controller.signal.aborted) return
      setSession(value)
      setStatus('ready')
    }).catch(() => {
      if (!controller.signal.aborted) setStatus('error')
    })
    return () => controller.abort()
  }, [attempt])

  const value = useMemo(() => ({ session, signIn, signOut, clearSession, status, retryRestore }), [session, signIn, signOut, clearSession, status, retryRestore])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
