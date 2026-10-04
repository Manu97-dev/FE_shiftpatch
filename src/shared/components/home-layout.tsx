import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../features/auth/contexts/auth.context'
import { WorkspaceNavigationContext } from './workspace-navigation.context'
import type { ReactNode } from 'react'
import styles from './home-layout.module.scss'

export function HomeLayout({ children }: { children: ReactNode }) {
  const { session, signOut, signInConfirmed } = useAuth()
  const client = useQueryClient()
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const main = useRef<HTMLElement>(null)
  function closeMenu() {
    setExpanded(false)
    menuButton.current?.focus()
  }
  async function handleLogout() {
    setPending(true)
    setFailed(false)
    try { await signOut(); client.clear() }
    catch { setFailed(true); setPending(false) }
  }
  return <WorkspaceNavigationContext.Provider value={{ target, onNavigate: () => {
    setExpanded(false)
    main.current?.scrollTo?.({ top: 0 })
    // Only move focus when the compact menu closes and its controls become hidden.
    if (expanded) main.current?.focus()
  } }}><div className={styles.shell}>
    <a className={styles.skipLink} href="#workspace-content">Skip to content</a>
    <aside className={styles.sidebar} onKeyDown={(event) => {
      if (event.key === 'Escape' && expanded) { event.preventDefault(); closeMenu() }
    }}>
      <div className={styles.sidebarHeader}>
        <a href="/home" className={styles.brand}>Shiftpatch<span>Care, connected.</span></a>
        <button ref={menuButton} className={styles.menuButton} aria-expanded={expanded} aria-controls="workspace-menu" onClick={() => setExpanded(!expanded)}>{expanded ? 'Close menu' : 'Menu'}</button>
      </div>
      <div id="workspace-menu" className={`${styles.sidebarBody} ${expanded ? styles.expanded : ''}`}>
        <div className={styles.navigation}>
          <p className={styles.navLabel}>Workspace</p>
          <nav aria-label="Workspace navigation" ref={setTarget} />
        </div>
        <div className={styles.account}>
          <span className={styles.avatar} aria-hidden="true">{session?.user.name.trim().charAt(0).toUpperCase()}</span>
          <div className={styles.identity}><strong>{session?.user.name}</strong><span>{session?.user.role}</span></div>
          <button onClick={handleLogout} disabled={pending}>{pending ? 'Signing out…' : 'Sign out'}</button>
          {failed && <p data-testid="notification-banner" role="alert">We could not sign you out. Please try again.</p>}
        </div>
      </div>
    </aside>
    <main ref={main} id="workspace-content" tabIndex={-1} aria-label="Home" className={styles.main}>
      <div className={styles.content}>{signInConfirmed && <p data-testid="notification-banner" role="status">Signed in successfully.</p>}{children}</div>
    </main>
  </div></WorkspaceNavigationContext.Provider>
}
