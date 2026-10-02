import { Tabs } from '../../../shared/components/tabs'
import { AgencyManagement } from './agency-management'
import { useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import type { ShiftFilters } from '../../shifts/api/shifts.api'
import { ShiftSection } from '../../shifts/components/shift-section'
import { ShiftList } from '../../shifts/components/shift-list'
import { useShiftClock } from '../../shifts/hooks/use-shift-clock'
import { useAdminShifts } from '../hooks/use-admin-shifts'
import { AdminShiftSummary } from './admin-shift-summary'
import { ShiftFilterForm } from './shift-filters'
import styles from './admin-dashboard.module.scss'
import shiftStyles from '../../shifts/components/shift-section.module.scss'
export function AdminDashboard() {
  const { session, clearSession } = useAuth()
  const [filters, setFilters] = useState<ShiftFilters>({})
  const [filterReset, setFilterReset] = useState(0)
  const all = useAdminShifts()
  const query = useAdminShifts(filters)
  const now = useShiftClock()
  const agencies = [...new Map((all.data?.shifts ?? []).map((shift) => [shift.agencyId, { id: shift.agencyId, name: shift.agencyName }])).values()].sort((a, b) => a.name.localeCompare(b.name))
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  const filtered = Object.keys(filters).length > 0
  if (session?.user.role !== 'admin') return null
  return <Tabs label="Admin workspace" defaultValue="shifts" items={[
    { value: 'shifts', label: 'Shifts', content: <><AdminShiftSummary />
    <ShiftSection id="admin-shifts" title="All shifts" description="Review schedules and coverage across agencies. Date filters match the shift’s start date."
      loading={query.isPending} fetching={query.isFetching} hasError={query.isError} hasData={Boolean(query.data)} unauthorized={unauthorized} forbidden={forbidden}
      headerActions={<button className={shiftStyles.button} onClick={() => { setFilters({}); setFilterReset((version) => version + 1) }}>Clear filters</button>}
      loadingMessage="Loading shifts…" errorTitle="We could not load shifts" forbiddenTitle="Admin access unavailable" forbiddenMessage="Your account cannot access this workspace."
      staleMessage="These results may be out of date. Please refresh." onSignIn={clearSession} onRefresh={() => { void query.refetch(); if (filtered) void all.refetch() }}>
      {!unauthorized && !forbidden && <ShiftFilterForm key={filterReset} agencies={agencies} onApply={setFilters} />}
      {all.isError && filtered && <p role="alert">Agency choices could not be refreshed. Refresh the list to try again.</p>}
      {query.data && !unauthorized && !forbidden && <>
        <p className={styles.resultCount} role="status">{query.data.shifts.length} {query.data.shifts.length === 1 ? 'shift' : 'shifts'}{filtered ? ' matching applied filters' : ' across all agencies'}</p>
        {query.data.shifts.length ? <ShiftList shifts={query.data.shifts} now={now} /> : <div className={styles.empty}><h3>{filtered ? 'No shifts match your filters' : 'No shifts posted yet'}</h3><p>{filtered ? 'Adjust or clear the filters to see more shifts.' : 'Agency shifts will appear here once they are created.'}</p></div>}
      </>}
    </ShiftSection>
    </> },
    { value: 'agencies', label: 'Agencies', content: <AgencyManagement /> },
  ]} />
}
