import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../auth/auth.context'
import { fetchMyShifts } from '../nurses/nurses.api'
import { shiftTimes } from './shift-time'
import { ShiftList } from './shift-list'
import { ShiftSection } from './shift-section'
import { useShiftClock } from './use-shift-clock'
import styles from './shift-section.module.scss'

export function MyShifts() {
  const { session, clearSession } = useAuth()
  const now = useShiftClock()
  const query = useQuery({
    queryKey: ['nurses', session?.user.id, 'my-shifts'],
    queryFn: ({ signal }) => fetchMyShifts(session!.token, signal),
    enabled: session?.user.role === 'nurse',
    retry: false,
  })
  const shifts = [...(query.data?.shifts ?? [])].sort((a, b) =>
    shiftTimes(a).start.getTime() - shiftTimes(b).start.getTime() || a.id.localeCompare(b.id))
  const upcoming = shifts.filter((shift) => shiftTimes(shift).end.getTime() > now)
  const past = shifts.filter((shift) => shiftTimes(shift).end.getTime() <= now).reverse()
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403

  return (
    <ShiftSection id="my-shifts" title="My shifts" description="Your assignments, all in one place."
      loading={query.isPending} fetching={query.isFetching} hasError={query.isError}
      unauthorized={unauthorized} forbidden={forbidden} hasData={Boolean(query.data)}
      loadingMessage="Loading your shifts…" errorTitle="We could not load your shifts"
      forbiddenMessage="Your account does not have access to a nurse profile. Please contact your administrator."
      staleMessage="The assignments shown below may be out of date. Please try refreshing."
      onRefresh={() => void query.refetch()} onSignIn={clearSession}>
      {query.data && !unauthorized && !forbidden && <>
        {shifts.length === 0 ? <div className={styles.state}><h3>No shifts assigned yet</h3><p>Your shifts will appear here once you pick up an assignment.</p></div> : <>
          <h3 className={styles.sectionTitle}>Upcoming & current <span>{upcoming.length}</span></h3>
          {upcoming.length ? <ShiftList shifts={upcoming} now={now} /> : <div className={styles.state}><h3>No upcoming shifts</h3><p>You have no current or upcoming assignments.</p></div>}
          {past.length > 0 && <details className={styles.history}><summary>Past assignments ({past.length})</summary><ShiftList shifts={past} now={now} /></details>}
        </>}
      </>}
    </ShiftSection>
  )
}
