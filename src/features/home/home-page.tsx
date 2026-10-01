import { Tooltip } from 'radix-ui'
import { useTheme } from '../../shared/contexts/theme-context'
import styles from './home-page.module.scss'

export function HomePage() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a href="/" className={styles.brand}>Shiftpatch<span>Care, connected.</span></a>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button className={styles.themeButton} onClick={toggleTheme}>
              Switch to {theme === 'light' ? 'dark' : 'light'} theme
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className={styles.tooltip} sideOffset={8}>
              Choose your preferred appearance
              <Tooltip.Arrow />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>Nurses & agencies</p>
        <h1>Better shifts.<br />Stronger connections.</h1>
        <p className={styles.intro}>
          A shared place for nurses to find opportunities and agencies to coordinate care.
        </p>
        <section className={styles.status} aria-labelledby="status-title">
          <h2 id="status-title">The foundation is ready</h2>
          <p>Login, the shift marketplace, and agency tools are coming next.</p>
        </section>
      </main>
      <footer className={styles.footer}>Shiftpatch · Connecting people who care.</footer>
    </div>
  )
}
