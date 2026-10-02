import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../features/auth/contexts/auth.context'
import type { ReactNode } from 'react'
import styles from './home-layout.module.scss'

export function HomeLayout({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth()
  const client = useQueryClient()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  async function handleLogout() {
    setPending(true)
    setFailed(false)
    try { await signOut(); client.clear() }
    catch { setFailed(true); setPending(false) }
  }
  return <div className={styles.shell}>
    <header className={styles.header}>
      <a href="/home" className={styles.brand}>Shiftpatch<span>Care, connected.</span></a>
      <div className={styles.account}><span>{session?.user.name}</span><button onClick={handleLogout} disabled={pending}>{pending ? 'Signing out…' : 'Sign out'}</button></div>
    </header>
    {failed && <p role="alert">We could not sign you out. Please try again.</p>}
    <main aria-label="Home" className={styles.main}>
      {children}
    </main>
  </div>
}
