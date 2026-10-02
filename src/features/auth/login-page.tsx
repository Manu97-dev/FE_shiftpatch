import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './auth.context'
import { loginFormSchema, type LoginCredentials } from './auth.schemas'
import { login } from './auth.api'
import { loginErrorMessage } from './login.errors'
import styles from './login-page.module.scss'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      signIn(response)
      navigate('/home', { replace: true })
    },
  })

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
        <div className={styles.formContainer}>
          <p className={styles.eyebrow}>Welcome back</p>
          <h2 id="login-heading">Sign in to Shiftpatch</h2>
          <p className={styles.subtitle}>Enter your details to continue.</p>
          <form noValidate onSubmit={handleSubmit((values) => mutation.mutate(values))}
            onChange={() => { if (mutation.isError) mutation.reset() }} aria-busy={mutation.isPending}>
            <fieldset disabled={mutation.isPending}>
              <div className={styles.field}>
                <label htmlFor="email">Email address</label>
                <input id="email" type="email" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  placeholder="you@example.com" aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined} {...register('email')} />
                {errors.email && <p id="email-error" className={styles.fieldError} role="alert">{errors.email.message}</p>}
              </div>
              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <input id="password" type="password" autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'password-error' : undefined}
                  {...register('password')} />
                {errors.password && <p id="password-error" className={styles.fieldError} role="alert">{errors.password.message}</p>}
              </div>
              {mutation.isError && <p role="alert" className={styles.error}>{loginErrorMessage(mutation.error)}</p>}
              <button type="submit" className={styles.submit}>{mutation.isPending ? 'Signing in…' : 'Sign in'}</button>
            </fieldset>
          </form>
        </div>
      </section>
    </main>
  )
}
