import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/contexts/auth.context'
import { NurseRegistrationForm } from '../../features/auth/components/nurse-registration-form'
import styles from '../login/login-page.module.scss'

export function RegisterPage() {
  const { session } = useAuth()
  if (session) return <Navigate to="/home" replace />
  return <main className={styles.page}>
    <section className={styles.introduction}>
      <Link className={styles.brand} to="/login">Shiftpatch</Link>
      <div><p className={styles.eyebrow}>Care, connected.</p><h1>Your next shift<br />starts here.</h1><p className={styles.description}>Create a nurse account to browse available shifts and manage your assignments.</p></div>
      <p className={styles.note}>Connecting people who care.</p>
    </section>
    <section className={styles.formPanel} aria-labelledby="register-heading"><NurseRegistrationForm /></section>
  </main>
}
