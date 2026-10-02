import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/contexts/auth.context'
import { LoginForm } from '../../features/auth/components/login-form'
import styles from './login-page.module.scss'

export function LoginPage() {
  const { session } = useAuth()
  if (session) return <Navigate to="/home" replace />
  return (
    <main className={styles.page}>
      <section className={styles.introduction}>
        <a className={styles.brand} href="/login">Shiftpatch</a>
        <div>
          <p className={styles.eyebrow}>Care, connected.</p>
          <h1>Good care starts<br />with great people.</h1>
          <p className={styles.description}>A shared place for nurses and agencies to connect, find shifts, and coordinate care.</p>
        </div>
        <p className={styles.note}>Connecting people who care.</p>
      </section>
      <section className={styles.formPanel} aria-labelledby="login-heading">
        <LoginForm />
      </section>
    </main>
  )
}
