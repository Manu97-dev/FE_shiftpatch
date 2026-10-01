import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth.context'

export function HomePage() {
  const { signOut } = useAuth()
  const client = useQueryClient()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  async function handleLogout() {
    setPending(true)
    setFailed(false)
    try { await signOut(); client.clear() }
    catch { setFailed(true); setPending(false) }
  }
  return <>
    <header className="page">
      <button onClick={handleLogout} disabled={pending}>{pending ? 'Signing out…' : 'Sign out'}</button>
      {failed && <p role="alert">We could not sign you out. Please try again.</p>}
    </header>
    <main aria-label="Home" style={{ minHeight: '80dvh' }} />
  </>
}
