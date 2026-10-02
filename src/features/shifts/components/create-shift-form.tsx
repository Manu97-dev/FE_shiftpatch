import { Dialog } from 'radix-ui'
import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { createShiftFormSchema, type CreateShiftInput } from '../api/create-shift.schemas'
import { useCreateShift } from '../hooks/use-create-shift'
import { createShiftErrorMessage } from '../utils/create-shift-errors'
import styles from './create-shift-form.module.scss'

export function CreateShiftForm({ agencyId, agencyName, onClose, onCreated }: { agencyId: string; agencyName: string; onClose: () => void; onCreated: () => void }) {
  const { session, clearSession } = useAuth()
  const mutation = useCreateShift(agencyId)
  const submitting = useRef(false)
  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<CreateShiftInput>({
    resolver: zodResolver(createShiftFormSchema), defaultValues: { role: '', date: '', startTime: '', endTime: '' },
  })
  const [start, end] = useWatch({ control, name: ['startTime', 'endTime'] })
  const blocked = mutation.isError && !(mutation.error instanceof ApiError && mutation.error.status === 400)
  const pending = mutation.isPending || isSubmitting
  async function submit(input: CreateShiftInput) {
    if (submitting.current || blocked) return
    submitting.current = true
    try { await mutation.mutateAsync(input); onCreated() } catch { /* Error displayed below; never automatically resubmit. */ }
    finally { submitting.current = false }
  }
  if (session?.user.role !== 'agency') return null
  return <Dialog.Portal><Dialog.Overlay className={styles.overlay} /><Dialog.Content className={styles.form}
    onEscapeKeyDown={(event) => { if (pending) event.preventDefault() }}
    onPointerDownOutside={(event) => { if (pending) event.preventDefault() }}>
    <Dialog.Title>Create a shift</Dialog.Title>
    <p>Posting for <strong>{agencyName}</strong></p>
    <Dialog.Description>All dates and times use America/Tegucigalpa (UTC−06:00).</Dialog.Description>
    <form noValidate onSubmit={(event) => void handleSubmit(submit)(event)} aria-busy={pending}>
      <fieldset disabled={pending || blocked}>
        <div className={styles.fields}>
          <div><label htmlFor="shift-role">Required nurse role</label><input id="shift-role" list="nurse-role-suggestions" maxLength={100} placeholder="e.g. RN" {...register('role')} aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? 'shift-role-error' : undefined} /><datalist id="nurse-role-suggestions"><option value="RN" /><option value="LPN" /><option value="CNA" /></datalist>{errors.role && <p id="shift-role-error" role="alert">{errors.role.message}</p>}</div>
          <div><label htmlFor="shift-date">Shift date</label><input id="shift-date" type="date" max="9999-12-31" {...register('date')} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'shift-date-error' : undefined} />{errors.date && <p id="shift-date-error" role="alert">{errors.date.message}</p>}</div>
          <div><label htmlFor="shift-start">Start time</label><input id="shift-start" type="time" {...register('startTime')} aria-invalid={Boolean(errors.startTime)} aria-describedby={errors.startTime ? 'shift-start-error' : undefined} />{errors.startTime && <p id="shift-start-error" role="alert">{errors.startTime.message}</p>}</div>
          <div><label htmlFor="shift-end">End time</label><input id="shift-end" type="time" {...register('endTime')} aria-invalid={Boolean(errors.endTime)} aria-describedby={errors.endTime ? 'shift-end-error' : 'overnight-help'} />{errors.endTime && <p id="shift-end-error" role="alert">{errors.endTime.message}</p>}</div>
        </div>
        <p id="overnight-help">{start && end && end < start ? 'Overnight shift: the end time is on the following day.' : 'An end time earlier than the start time means the shift ends the following day.'}</p>
      </fieldset>
      {mutation.isError && <p role="alert">{createShiftErrorMessage(mutation.error)}</p>}
      {mutation.error instanceof ApiError && mutation.error.status === 401 && <button type="button" onClick={clearSession}>Sign in again</button>}
      <div className={styles.actions}>
        <button type="button" disabled={pending} className={styles.close} onClick={onClose}>Close form</button>
        <button type="submit" disabled={pending || blocked}>{pending ? 'Creating…' : 'Create shift'}</button>
      </div>
    </form>
  </Dialog.Content></Dialog.Portal>
}
