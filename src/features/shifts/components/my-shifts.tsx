import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmationDialog } from '../../../shared/components/confirmation-dialog'
import { nurseKeys } from '../../nurses/api/nurses.keys'
import { shiftKeys } from '../api/shifts.keys'
import type { Shift } from '../api/shifts.schemas'
import { useCancelShift } from '../hooks/use-cancel-shift'
import { cancelErrorMessage } from '../utils/cancel-errors'
import { shiftDateFormatter, shiftTimeFormatter } from '../utils/shift-time'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { useMyShifts } from '../../nurses/hooks/use-my-shifts'
import { shiftTimes } from '../utils/shift-time'
import { ShiftList } from './shift-list'
import { ShiftSection } from './shift-section'
import { useShiftClock } from '../hooks/use-shift-clock'
import styles from './shift-section.module.scss'

export function MyShifts() {
  const { session, clearSession } = useAuth()
  const [selected, setSelected] = useState<Shift | null>(null)
  const [success, setSuccess] = useState(false)
  const submitting = useRef(false)
  const mutation = useCancelShift()
  const client = useQueryClient()
  async function confirmCancel() {
    if (!selected || submitting.current) return
    if (shiftTimes(selected).start.getTime() <= Date.now()) {
      mutation.reset()
      setSelected(null)
      return
    }
    submitting.current = true
    try {
      await mutation.mutateAsync(selected.id)
      setSelected(null)
      setSuccess(true)
    } catch {
      await Promise.all([
        client.invalidateQueries({ queryKey: nurseKeys.myShifts(session?.user.id), refetchType: 'all' }),
        client.invalidateQueries({ queryKey: shiftKeys.available(session?.user.id), refetchType: 'all' }),
      ])
    } finally { submitting.current = false }
  }
  const now = useShiftClock()
  const query = useMyShifts()
  const shifts = [...(query.data?.shifts ?? [])].sort((a, b) =>
    shiftTimes(a).start.getTime() - shiftTimes(b).start.getTime() || a.id.localeCompare(b.id))
  const upcoming = shifts.filter((shift) => shiftTimes(shift).end.getTime() > now)
  const past = shifts.filter((shift) => shiftTimes(shift).end.getTime() <= now).reverse()
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403

  return (
    <><ShiftSection id="my-shifts" title="My shifts" description="Your assignments, all in one place."
      loading={query.isPending} fetching={query.isFetching} hasError={query.isError}
      unauthorized={unauthorized} forbidden={forbidden} hasData={Boolean(query.data)}
      loadingMessage="Loading your shifts…" errorTitle="We could not load your shifts"
      forbiddenMessage="Your account does not have access to a nurse profile. Please contact your administrator."
      staleMessage="The assignments shown below may be out of date. Please try refreshing."
      onRefresh={() => void query.refetch()} onSignIn={clearSession}>
      {success && <p data-testid="notification-banner" role="status">Shift cancelled successfully. Your assignment has been removed.</p>}
      {query.data && !unauthorized && !forbidden && <>
        {shifts.length === 0 ? <div className={styles.state}><h3>No shifts assigned yet</h3><p>Your shifts will appear here once you pick up an assignment.</p></div> : <>
          <h3 className={styles.sectionTitle}>Upcoming & current <span>{upcoming.length}</span></h3>
          {upcoming.length ? <ShiftList shifts={upcoming} now={now} renderAction={(shift) => shiftTimes(shift).start.getTime() > now ? <button data-testid="shift-cancel-button" className={styles.button} disabled={mutation.isPending} onClick={() => { mutation.reset(); setSuccess(false); setSelected(shift) }}>Cancel shift</button> : undefined} /> : <div className={styles.state}><h3>No upcoming shifts</h3><p>You have no current or upcoming assignments.</p></div>}
          {past.length > 0 && <details className={styles.history}><summary>Past assignments ({past.length})</summary><ShiftList shifts={past} now={now} /></details>}
        </>}
      </>}
    </ShiftSection>
      <ConfirmationDialog open={selected !== null} onOpenChange={(open) => { if (!open) { setSelected(null); mutation.reset() } }}
        title="Cancel this shift?" description="This removes your assignment and reopens the shift for another nurse."
        confirmLabel="Confirm cancellation" pendingLabel="Cancelling…" pending={mutation.isPending} onConfirm={() => void confirmCancel()}
        canConfirm={!mutation.isError && selected !== null && shiftTimes(selected).start.getTime() > now}
        error={mutation.isError ? <>{cancelErrorMessage(mutation.error)}{mutation.error instanceof ApiError && mutation.error.status === 401 && <button className={styles.button} onClick={clearSession}>Sign in again</button>}</> : selected && shiftTimes(selected).start.getTime() <= now ? 'This shift has started. Please contact your agency to cancel.' : undefined}>
        {selected && <div>
          <p><strong>{selected.role}</strong> · {selected.agencyName}</p>
          <p>{shiftDateFormatter.format(shiftTimes(selected).start)}</p>
          <p>{shiftTimeFormatter.format(shiftTimes(selected).start)} – {shiftTimeFormatter.format(shiftTimes(selected).end)}</p>
          {shiftTimes(selected).overnight && <p>Ends next day · {shiftDateFormatter.format(shiftTimes(selected).end)}</p>}
          <p className={styles.timezone}>America/Tegucigalpa (UTC−06:00)</p>
        </div>}
      </ConfirmationDialog>
    </>
  )
}
