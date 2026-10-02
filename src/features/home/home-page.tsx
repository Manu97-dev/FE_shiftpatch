import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/auth.context'
import { MyShifts } from '../shifts/my-shifts'
import styles from './home-page.module.scss'

export function HomePage() {
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
      {session?.user.role === 'nurse' ? <>
        <p className={styles.eyebrow}>Nurse home</p>
        <h1>Welcome back, {session.user.name.split(' ')[0]}.</h1>
        <p className={styles.intro}>Keep track of your schedule and the care ahead.</p>
        <MyShifts />
      </> : <><h1>Welcome, {session?.user.name}.</h1><p>Your workspace is coming soon.</p></>}
    </main>
  </div>
}
