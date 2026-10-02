import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../shared/api/client'
import { useAuth } from '../auth/auth.context'
import { fetchMyShifts, type Shift } from './my-shifts.api'
import { shiftDateFormatter, shiftTimeFormatter, shiftTimes } from './shift-time'
import styles from './my-shifts.module.scss'

function ShiftCard({ shift, now }: { shift: Shift; now: number }) {
  const { start, end, overnight } = shiftTimes(shift)
  const past = end.getTime() <= now
  const underway = !past && start.getTime() <= now
  return (
    <li className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{shift.role}</h3>
        <span className={styles.badge}>{past ? 'Past assignment' : underway ? 'In progress' : 'Assigned'}</span>
      </div>
      <p className={styles.agency}>{shift.agencyName}</p>
      <p className={styles.date}><time dateTime={start.toISOString()}>{shiftDateFormatter.format(start)}</time></p>
      <p className={styles.schedule}>
        <time dateTime={start.toISOString()}>{shiftTimeFormatter.format(start)}</time>
        {' – '}
        <time dateTime={end.toISOString()}>{shiftTimeFormatter.format(end)}</time>
        {overnight && <span className={styles.overnight}>Ends next day · {shiftDateFormatter.format(end)}</span>}
      </p>
    </li>
  )
}

function ShiftList({ shifts, now }: { shifts: Shift[]; now: number }) {
  return <ul className={styles.list}>{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} now={now} />)}</ul>
}

export function MyShifts() {
  const { session, clearSession } = useAuth()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
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
    <section aria-labelledby="my-shifts-heading">
      <div className={styles.heading}>
        <div><h2 id="my-shifts-heading">My shifts</h2><p>Your assignments, all in one place.</p></div>
        {!unauthorized && !forbidden && <button className={styles.button} onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching && !query.isPending ? 'Refreshing…' : 'Refresh'}
        </button>}
      </div>
      <p className={styles.timezone}>All shift dates and times are in America/Tegucigalpa (UTC−06:00).</p>
      {query.isPending && <div className={styles.state} role="status">Loading your shifts…</div>}
      {query.isError && <div className={styles.error} role="alert">
        <h3>{unauthorized ? 'Your session has expired' : forbidden ? 'Nurse access unavailable' : 'We could not load your shifts'}</h3>
        <p>{unauthorized ? 'Sign in again to view your assignments.' : forbidden ? 'Your account does not have access to a nurse profile. Please contact your administrator.' : query.data ? 'The assignments shown below may be out of date. Please try refreshing.' : 'Check your connection and try again.'}</p>
        {unauthorized ? <button className={styles.button} onClick={clearSession}>Sign in again</button>
          : !forbidden && <button className={styles.button} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Retrying…' : 'Try again'}</button>}
      </div>}
      {query.data && !unauthorized && !forbidden && <>
        {shifts.length === 0 ? <div className={styles.state}><h3>No shifts assigned yet</h3><p>Your shifts will appear here once you pick up an assignment.</p></div> : <>
          <h3 className={styles.sectionTitle}>Upcoming & current <span>{upcoming.length}</span></h3>
          {upcoming.length ? <ShiftList shifts={upcoming} now={now} /> : <div className={styles.state}><h3>No upcoming shifts</h3><p>You have no current or upcoming assignments.</p></div>}
          {past.length > 0 && <details className={styles.history}><summary>Past assignments ({past.length})</summary><ShiftList shifts={past} now={now} /></details>}
        </>}
      </>}
    </section>
  )
}
