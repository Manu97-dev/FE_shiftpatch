import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../auth/auth.context'
import { fetchAvailableShifts } from './shifts.api'
import { ShiftList } from './shift-list'
import { ShiftSection } from './shift-section'
import { useShiftClock } from './use-shift-clock'
import styles from './shift-section.module.scss'

export function AvailableShifts() {
  const { session, clearSession } = useAuth()
  const now = useShiftClock()
  const query = useQuery({
    queryKey: ['nurses', session?.user.id, 'available-shifts'],
    queryFn: ({ signal }) => fetchAvailableShifts(session!.token, signal),
    enabled: session?.user.role === 'nurse',
    retry: false,
  })
  const shifts = query.data?.shifts ?? []
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  return <ShiftSection id="available-shifts" title="Available shifts" description="Explore open opportunities, with the soonest shifts first."
    loading={query.isPending} fetching={query.isFetching} hasError={query.isError}
    unauthorized={unauthorized} forbidden={forbidden} hasData={Boolean(query.data)}
    loadingMessage="Loading available shifts…" errorTitle="We could not load available shifts"
    forbiddenMessage="Your account cannot access the shift marketplace. Please contact your administrator."
    staleMessage="The opportunities shown below may be out of date. Please try refreshing."
    onRefresh={() => void query.refetch()} onSignIn={clearSession}>
    {query.data && !unauthorized && !forbidden && <>
      {shifts.length ? <><h3 className={styles.sectionTitle}>Open opportunities <span>{shifts.length}</span></h3><ShiftList shifts={shifts} now={now} /></>
        : <div className={styles.state}><h3>No available shifts right now</h3><p>There are no upcoming open shifts. Check back later or refresh for new opportunities.</p></div>}
    </>}
  </ShiftSection>
}
