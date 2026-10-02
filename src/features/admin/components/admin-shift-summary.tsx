import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { useAdminSummary } from '../hooks/use-admin-shifts'
import styles from './admin-dashboard.module.scss'
const updatedFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Tegucigalpa', dateStyle: 'medium', timeStyle: 'short' })
export function AdminShiftSummary() {
  const query = useAdminSummary()
  const { clearSession } = useAuth()
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  return <section className={styles.summary} aria-labelledby="admin-summary-heading">
    <div className={styles.heading}><div><h2 id="admin-summary-heading">Upcoming coverage</h2><p>Across all agencies, for shifts that have not started. List filters do not change these totals.</p></div>
      {!unauthorized && !forbidden && <button disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Refreshing…' : 'Refresh overview'}</button>}
    </div>
    {query.isPending && <p role="status">Loading coverage overview…</p>}
    {query.isError && <div role="alert"><h3>{unauthorized ? 'Your session has expired' : forbidden ? 'Admin access unavailable' : 'We could not load the overview'}</h3>
      <p>{unauthorized ? 'Sign in again to continue.' : forbidden ? 'Your account cannot access admin data.' : query.data ? 'These totals may be out of date. Refresh to try again.' : 'Check your connection and try again.'}</p>
      {!forbidden && <button disabled={query.isFetching} onClick={unauthorized ? clearSession : () => void query.refetch()}>{unauthorized ? 'Sign in again' : 'Retry overview'}</button>}
    </div>}
    {query.data && !unauthorized && !forbidden && <>
      <dl className={styles.metrics}><div><dt>Needs coverage</dt><dd>{query.data.upcomingOpen}</dd></div><div><dt>Assigned</dt><dd>{query.data.upcomingAssigned}</dd></div><div><dt>Total upcoming</dt><dd>{query.data.upcomingTotal}</dd></div></dl>
      <p className={styles.updated}>As of {updatedFormatter.format(new Date(query.data.asOf))} · America/Tegucigalpa</p>
    </>}
  </section>
}
