import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/contexts/auth.context'
import { cancelShift } from '../../shifts/api/shifts.api'
import type { Shift } from '../../shifts/api/shifts.schemas'
import { shiftDateFormatter, shiftTimeFormatter, shiftTimes } from '../../shifts/utils/shift-time'
import { cancelErrorMessage } from '../../shifts/utils/cancel-errors'
import { ConfirmationDialog } from '../../../shared/components/confirmation-dialog'
import { ApiError } from '../../../shared/api/client'
import styles from '../../shifts/components/shift-section.module.scss'

type Reason = 'advance' | 'no-show'
function actionAllowedNow(reason: Reason, start: Date) {
  return (reason === 'advance') === (start.getTime() > Date.now())
}
export function AgencyAssignmentControls({ shift, now }: { shift: Shift; now: number }) {
  const { session, clearSession } = useAuth()
  const client = useQueryClient()
  const [reason, setReason] = useState<Reason | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const submitting = useRef(false)
  const mutation = useMutation({
    mutationFn: (value: Reason) => {
      if (session?.user.role !== 'agency') throw new ApiError(403, 'Forbidden')
      return cancelShift(shift.id, session.token, value)
    },
    retry: false,
  })
  const { start, end, overnight } = shiftTimes(shift)
  const valid = shift.claimedBy !== null && (reason === 'advance' ? start.getTime() > now : start.getTime() <= now)
  async function confirm() {
    if (!reason || submitting.current || shift.claimedBy === null) return
    if (!actionAllowedNow(reason, start)) return
    submitting.current = true
    try {
      await mutation.mutateAsync(reason)
      setSuccess(reason === 'advance' ? 'Assignment cancelled.' : 'No-show recorded. Assignment removed.')
      setReason(null)
    } catch {
      // Keep the dialog open with the server error, without automatically retrying.
    } finally {
      await Promise.all(['agencies', 'shifts', 'nurses', 'admin'].map((key) =>
        client.invalidateQueries({ queryKey: [key], refetchType: 'all' })))
      submitting.current = false
    }
  }
  return <>
    {success && <p data-testid="notification-banner" role="status">{success}</p>}
    {shift.claimedBy !== null && <button className={styles.button} disabled={mutation.isPending} onClick={() => {
      mutation.reset(); setSuccess(null); setReason(start.getTime() > now ? 'advance' : 'no-show')
    }}>{start.getTime() > now ? 'Cancel assignment' : 'Mark no-show'}</button>}
    <ConfirmationDialog open={reason !== null} onOpenChange={(open) => { if (!open) { setReason(null); mutation.reset() } }}
      title={reason === 'advance' ? 'Cancel this assignment?' : 'Mark this assignment as a no-show?'}
      description={reason === 'advance' ? 'This removes the nurse’s assignment and reopens the shift for another nurse.' : 'Confirm the assigned nurse did not attend. This removes their assignment; started shifts cannot be claimed again.'}
      confirmLabel={reason === 'advance' ? 'Confirm cancellation' : 'Confirm no-show'} pendingLabel="Saving…"
      pending={mutation.isPending} onConfirm={() => void confirm()} canConfirm={valid && !mutation.isError}
      error={mutation.isError ? <>{cancelErrorMessage(mutation.error, true)}{mutation.error instanceof ApiError && mutation.error.status === 401 && <button onClick={clearSession}>Sign in again</button>}</> : !valid ? 'This assignment or its allowed action has changed. Close this dialog and refresh the list.' : undefined}>
      <p><strong>{shift.role}</strong> · {shift.agencyName}</p>
      <p>{shiftDateFormatter.format(start)} · {shiftTimeFormatter.format(start)} – {shiftTimeFormatter.format(end)}</p>
      {overnight && <p>Ends next day · {shiftDateFormatter.format(end)}</p>}
      <p>America/Tegucigalpa (UTC−06:00)</p>
    </ConfirmationDialog>
  </>
}
