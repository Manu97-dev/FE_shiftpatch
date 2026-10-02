import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { useAgencyShifts, useOwnAgency } from '../hooks/use-agencies'
import { ShiftSection } from '../../shifts/components/shift-section'
import { ShiftList } from '../../shifts/components/shift-list'
import { useShiftClock } from '../../shifts/hooks/use-shift-clock'
import { shiftTimes } from '../../shifts/utils/shift-time'
import styles from '../../shifts/components/shift-section.module.scss'

export function AgencyDashboard() {
  const query = useOwnAgency()
  const { clearSession } = useAuth()
  if (query.isPending) return <p role="status">Loading your agency…</p>
  if (query.isError) {
    const unauthorized = query.error instanceof ApiError && query.error.status === 401
    const forbidden = query.error instanceof ApiError && query.error.status === 403
    return <div role="alert"><h2>{unauthorized ? 'Your session has expired' : forbidden ? 'Agency access unavailable' : 'We could not load your agency'}</h2>
      {!forbidden && <button className={styles.button} disabled={query.isFetching} onClick={unauthorized ? clearSession : () => void query.refetch()}>{unauthorized ? 'Sign in again' : 'Try again'}</button>}
    </div>
  }
  if (!query.data.agency) return <div className={styles.state}><h2>No agency linked to your account</h2><p>Contact your administrator to set up access.</p><button className={styles.button} onClick={() => void query.refetch()}>Refresh</button></div>
  return <AgencyShifts key={query.data.agency.id} agencyId={query.data.agency.id} />
}
function AgencyShifts({ agencyId }: { agencyId: string }) {
  const query = useAgencyShifts(agencyId)
  const { clearSession } = useAuth()
  const now = useShiftClock()
  const shifts = query.data?.shifts ?? []
  const active = shifts.filter((shift) => shiftTimes(shift).end.getTime() > now)
  const past = shifts.filter((shift) => shiftTimes(shift).end.getTime() <= now).reverse()
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  return <ShiftSection id="agency-shifts" title={query.data?.agencyName ?? "Agency shifts"} description="All shifts for this agency, ordered by schedule."
    loading={query.isPending} fetching={query.isFetching} hasError={query.isError} hasData={Boolean(query.data)} unauthorized={unauthorized} forbidden={forbidden}
    loadingMessage="Loading agency shifts…" errorTitle="We could not load agency shifts" forbiddenTitle="Agency access unavailable" forbiddenMessage="No agency membership is linked to your account, or your access has been revoked. Contact your administrator."
    staleMessage="These shifts may be out of date. Please refresh." onRefresh={() => void query.refetch()} onSignIn={clearSession}>
    {query.data && !unauthorized && !forbidden && <>
      {shifts.length === 0 ? <div className={styles.state}><h3>No shifts posted yet</h3><p>Your agency’s shifts will appear here once they are created.</p></div> : <>
        <h3 className={styles.sectionTitle}>Upcoming & current <span>{active.length}</span></h3>
        {active.length ? <ShiftList shifts={active} now={now} /> : <p>No upcoming or current shifts.</p>}
        {past.length > 0 && <details className={styles.history}><summary>Past shifts ({past.length})</summary><ShiftList shifts={past} now={now} /></details>}
      </>}
    </>}
  </ShiftSection>
}
