import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../auth/contexts/auth.context'
import { ApiError } from '../../../shared/api/client'
import { fetchAdminAgencies, createAdminAgency, createAdminAgencyMember } from '../api/admin.api'
import { adminKeys } from '../api/admin.keys'
import { agencyCreationFormSchema, type AdminAgency, type AgencyCreationForm } from '../api/admin.schemas'
import styles from './agency-management.module.scss'

export function AgencyManagement() {
  const { session, clearSession } = useAuth()
  const [form, setForm] = useState<'agency' | AdminAgency | null>(null)
  const [success, setSuccess] = useState('')
  const query = useQuery({ queryKey: adminKeys.agencies(session?.user.id), queryFn: ({ signal }) => fetchAdminAgencies(session!.token, signal), enabled: session?.user.role === 'admin', retry: false })
  if (session?.user.role !== 'admin') return null
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  return <section className={styles.section} aria-labelledby="agency-management-heading">
    <div className={styles.heading}><div><h2 id="agency-management-heading">Agencies and members</h2><p>Create agencies and the accounts that manage their shifts.</p></div>
      {!unauthorized && !forbidden && !form && <button onClick={() => { setSuccess(''); setForm('agency') }}>Create agency</button>}
    </div>
    {success && <p data-testid="notification-banner" role="status">{success}</p>}
    {query.isPending && <p role="status">Loading agencies…</p>}
    {query.isError && <div role="alert"><p>{unauthorized ? 'Your session has expired.' : forbidden ? 'Admin access is required.' : 'We could not load agencies. Refresh before creating a member.'}</p>
      {unauthorized ? <button onClick={clearSession}>Sign in again</button> : !forbidden && <button disabled={query.isFetching} onClick={() => void query.refetch()}>Retry agencies</button>}</div>}
    {!unauthorized && !forbidden && form && <AgencyCreationForm key={typeof form === 'string' ? 'agency' : form.id} agency={typeof form === 'string' ? undefined : form} onClose={() => setForm(null)} onCreated={(message) => { setForm(null); setSuccess(message) }} />}
    {query.data && !unauthorized && !forbidden && <>
      {query.data.agencies.length === 0 ? <p>No agencies yet. Create an agency to get started.</p> : <ul className={styles.list}>{query.data.agencies.map((agency) => <li key={agency.id} className={styles.card}>
        <div className={styles.heading}><div><h3>{agency.name}</h3><p>{agency.contactEmail}</p></div><button disabled={Boolean(form) || query.isError} onClick={() => { setSuccess(''); setForm(agency) }}>Add member to {agency.name}</button></div>
        {agency.members.length === 0 ? <p>No members yet. Add an owner or manager to enable agency access.</p> : <ul className={styles.members}>{agency.members.map((member) => <li key={member.id}><strong>{member.name}</strong> · {member.email} · {member.role === 'owner' ? 'Owner' : 'Manager'}</li>)}</ul>}
      </li>)}</ul>}
      <button disabled={query.isFetching || Boolean(form)} onClick={() => void query.refetch()}>{query.isFetching ? 'Refreshing agencies…' : 'Refresh agencies'}</button>
    </>}
  </section>
}
function creationError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 409) return 'This email is already registered. Use a different email for the new member.'
    if (error.status === 404) return 'This agency no longer exists. Close the form and refresh agencies.'
    if (error.status === 401) return 'Your session has expired. Sign in again.'
    if (error.status === 403) return 'Admin access is required to create agencies or members.'
    if (error.status === 400) return 'Check the entered details and try again.'
  }
  return 'We could not confirm creation. Close this form and refresh agencies before trying again.'
}
function AgencyCreationForm({ agency, onClose, onCreated }: { agency?: AdminAgency; onClose: () => void; onCreated: (message: string) => void }) {
  const { session, clearSession } = useAuth()
  const client = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AgencyCreationForm>({
    resolver: zodResolver(agencyCreationFormSchema(Boolean(agency))), defaultValues: { name: '', email: '', password: '', role: 'owner' },
  })
  const mutation = useMutation({
    mutationFn: async (input: AgencyCreationForm) => {
      if (session?.user.role !== 'admin') throw new ApiError(403, 'Forbidden')
      return agency ? createAdminAgencyMember(agency.id, input, session.token) : createAdminAgency({ name: input.name, contactEmail: input.email }, session.token)
    }, retry: false,
  })
  const pending = mutation.isPending || isSubmitting
  const blocked = mutation.isError && !(mutation.error instanceof ApiError && [400, 409].includes(mutation.error.status))
  async function submit(input: AgencyCreationForm) {
    if (pending || blocked) return
    try {
      await mutation.mutateAsync(input)
      onCreated(agency ? `Member ${input.name} created for ${agency.name}. They can sign in with the email and initial password you provided.` : `Agency ${input.name} created. Add an owner or manager to enable agency access.`)
    } catch { /* Keep the form and display the error. */ }
    finally { await client.invalidateQueries({ queryKey: adminKeys.agencies(session?.user.id) }) }
  }
  return <form className={styles.form} aria-label={agency ? 'Create agency member' : 'Create agency'} noValidate onSubmit={(event) => void handleSubmit(submit)(event)} aria-busy={pending}>
    <h3>{agency ? `Add a member to ${agency.name}` : 'New agency'}</h3>
    <fieldset disabled={pending || blocked}>
      <label htmlFor="creation-name">{agency ? 'Member name' : 'Agency name'}</label><input id="creation-name" maxLength={200} {...register('name')} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'creation-name-error' : undefined} />
      {errors.name && <p id="creation-name-error" role="alert">{errors.name.message}</p>}
      <label htmlFor="creation-email">{agency ? 'Member email' : 'Agency contact email'}</label><input id="creation-email" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} {...register('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'creation-email-error' : undefined} />
      {errors.email && <p id="creation-email-error" role="alert">{errors.email.message}</p>}
      {agency && <>
        <label htmlFor="creation-role">Membership role</label><select id="creation-role" {...register('role')}><option value="owner">Owner</option><option value="manager">Manager</option></select>
        <p>Owners and managers can both post shifts and manage assignments for this agency.</p>
        <label htmlFor="creation-password">Initial password</label><input id="creation-password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'creation-password-error' : 'creation-password-help'} />
        <p id="creation-password-help">Use at least 12 characters. Share the login details directly with the member.</p>
        {errors.password && <p id="creation-password-error" role="alert">{errors.password.message}</p>}
      </>}
    </fieldset>
    {mutation.isError && <p data-testid="notification-banner" role="alert">{creationError(mutation.error)}</p>}
    {mutation.error instanceof ApiError && mutation.error.status === 401 && <button type="button" onClick={clearSession}>Sign in again</button>}
    <div className={styles.actions}><button type="button" disabled={pending} onClick={onClose}>Close form</button><button type="submit" disabled={pending || blocked}>{pending ? 'Creating…' : agency ? 'Create member' : 'Save agency'}</button></div>
  </form>
}
