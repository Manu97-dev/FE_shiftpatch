import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ConfirmationDialog } from '../../../shared/components/confirmation-dialog'
import { nurseKeys } from '../../nurses/api/nurses.keys'
import { shiftKeys } from '../api/shifts.keys'
import type { Shift } from '../api/shifts.schemas'
import { useClaimShift } from '../hooks/use-claim-shift'
import { claimErrorMessage } from '../utils/claim-errors'
import { shiftDateFormatter, shiftTimeFormatter, shiftTimes } from '../utils/shift-time'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { useAvailableShifts } from '../hooks/use-available-shifts'
import { ShiftList } from './shift-list'
import { ShiftSection } from './shift-section'
import { useShiftClock } from '../hooks/use-shift-clock'
import styles from './shift-section.module.scss'

export function AvailableShifts() {
  const { session, clearSession } = useAuth()
  const [selected, setSelected] = useState<Shift | null>(null)
  const [success, setSuccess] = useState(false)
  const submitting = useRef(false)
  const mutation = useClaimShift()
  const client = useQueryClient()
  async function confirmClaim() {
    if (!selected || submitting.current) return
    submitting.current = true
    try {
      await mutation.mutateAsync(selected.id)
      setSelected(null)
      setSuccess(true)
    } catch {
      await Promise.all([
        client.invalidateQueries({ queryKey: shiftKeys.available(session?.user.id), refetchType: 'all' }),
        client.invalidateQueries({ queryKey: nurseKeys.myShifts(session?.user.id), refetchType: 'all' }),
      ])
    } finally { submitting.current = false }
  }
  const now = useShiftClock()
  const query = useAvailableShifts()
  const shifts = query.data?.shifts ?? []
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  return <><ShiftSection id="available-shifts" title="Available shifts" description="Explore open opportunities, with the soonest shifts first."
    loading={query.isPending} fetching={query.isFetching} hasError={query.isError}
    unauthorized={unauthorized} forbidden={forbidden} hasData={Boolean(query.data)}
    loadingMessage="Loading available shifts…" errorTitle="We could not load available shifts"
    forbiddenMessage="Your account cannot access the shift marketplace. Please contact your administrator."
    staleMessage="The opportunities shown below may be out of date. Please try refreshing."
    onRefresh={() => void query.refetch()} onSignIn={clearSession}>
    {success && <p data-testid="notification-banner" role="status">Shift claimed successfully. You can find it in My shifts.</p>}
    {query.data && !unauthorized && !forbidden && <>
      {shifts.length ? <><h3 className={styles.sectionTitle}>Open opportunities <span>{shifts.length}</span></h3><ShiftList itemTestId="shift-list-item" shifts={shifts} now={now} renderAction={(shift) => <div>{shift.eligibility?.reasons.map(reason => <p key={reason}>{reason}</p>)}<button data-testid="shift-claim-button" className={styles.claimButton} disabled={mutation.isPending || shift.eligibility?.eligible === false} onClick={() => { mutation.reset(); setSuccess(false); setSelected(shift) }}>Claim shift</button></div>} /></>
        : <div className={styles.state}><h3>No available shifts right now</h3><p>There are no upcoming open shifts. Check back later or refresh for new opportunities.</p></div>}
    </>}
  </ShiftSection>
    <ConfirmationDialog open={selected !== null} onOpenChange={(open) => { if (!open) { setSelected(null); mutation.reset() } }}
      title="Claim this shift?" description="Review the schedule before adding this assignment to your shifts."
      confirmLabel="Confirm claim" pendingLabel="Claiming…" pending={mutation.isPending} onConfirm={() => void confirmClaim()}
      canConfirm={!mutation.isError} error={mutation.isError ? <>{claimErrorMessage(mutation.error)}{mutation.error instanceof ApiError && mutation.error.status === 401 && <button className={styles.button} onClick={clearSession}>Sign in again</button>}</> : undefined}>
      {selected && <div>
        <p><strong>{selected.role}</strong> · {selected.agencyName}</p>
        <p>{shiftDateFormatter.format(shiftTimes(selected).start)}</p>
        <p>{shiftTimeFormatter.format(shiftTimes(selected).start)} – {shiftTimeFormatter.format(shiftTimes(selected).end)}</p>
        {shiftTimes(selected).overnight && <p>Ends next day · {shiftDateFormatter.format(shiftTimes(selected).end)}</p>}
        <p className={styles.timezone}>America/Tegucigalpa (UTC−06:00)</p>
      </div>}
    </ConfirmationDialog>
  </>
}
