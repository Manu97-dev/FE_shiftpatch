import { useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth.context'
import { nurseRegistrationSchema, type NurseRegistration } from '../api/auth.schemas'
import { registerNurse } from '../api/auth.api'
import { ApiError } from '../../../shared/api/client'
import styles from './login-form.module.scss'

function registrationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'This email is already registered. Sign in with your existing account.'
    if (error.status === 400) return 'Check your details and expiration date, then try again.'
    if (error.status === 429) return 'Too many attempts. Please try again later.'
  }
  return 'We could not create your account. Please try again. If you already registered, sign in.'
}
const fields = [
  { name: 'name', label: 'Full name', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email address', type: 'email', autocomplete: 'email' },
  { name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirm password', type: 'password', autocomplete: 'new-password' },
  { name: 'credentialExpirationDate', label: 'Credential expiration date', type: 'date', autocomplete: 'off' },
] as const
export function NurseRegistrationForm() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const submitting = useRef(false)
  const { register, handleSubmit, formState: { errors } } = useForm<NurseRegistration>({
    resolver: zodResolver(nurseRegistrationSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', credentialExpirationDate: '' },
  })
  const mutation = useMutation({ mutationFn: registerNurse, retry: false })
  async function submit(values: NurseRegistration) {
    if (submitting.current) return
    submitting.current = true
    try {
      const response = await mutation.mutateAsync(values)
      signIn(response)
      navigate('/home', { replace: true })
    } catch {
      // Keep entered values so the nurse can correct or retry the request.
    } finally { submitting.current = false }
  }
  return <div className={styles.formContainer}>
    <p className={styles.eyebrow}>Join Shiftpatch</p>
    <h2 id="register-heading">Create your nurse account</h2>
    <p className={styles.subtitle}>Enter your details and your current credential expiration date.</p>
    <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)} aria-busy={mutation.isPending} onChange={() => { if (mutation.isError) mutation.reset() }}>
      <fieldset disabled={mutation.isPending}>
        {fields.map((field) => <div className={styles.field} key={field.name}>
          <label htmlFor={`register-${field.name}`}>{field.label}</label>
          <input id={`register-${field.name}`} type={field.type} autoComplete={field.autocomplete}
            {...(field.name === 'credentialExpirationDate' ? { min: '0001-01-01', max: '9999-12-31' } : {})}
            {...(field.name === 'email' ? { autoCapitalize: 'none', spellCheck: false } : {})}
            aria-invalid={Boolean(errors[field.name])}
            aria-describedby={[errors[field.name] ? `${field.name}-error` : '', field.name === 'password' ? 'password-help' : '', field.name === 'credentialExpirationDate' ? 'expiration-help' : ''].filter(Boolean).join(' ') || undefined}
            {...register(field.name)} />
          {field.name === 'password' && <p id="password-help">Use at least 12 characters.</p>}
          {field.name === 'credentialExpirationDate' && <p id="expiration-help">This date is self-reported. Expired credentials prevent you from claiming shifts.</p>}
          {errors[field.name] && <p id={`${field.name}-error`} className={styles.fieldError} role="alert">{errors[field.name]?.message}</p>}
        </div>)}
        {mutation.isError && <p data-testid="notification-banner" role="alert" className={styles.error}>{registrationError(mutation.error)}</p>}
        <button type="submit" className={styles.submit}>{mutation.isPending ? 'Creating account…' : 'Create nurse account'}</button>
      </fieldset>
    </form>
    <p>Already have an account? <Link to="/login">Sign in</Link></p>
  </div>
}
