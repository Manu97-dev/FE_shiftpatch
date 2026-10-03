import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest, ApiError } from '../../../shared/api/client'
import { useAuth } from '../../auth/contexts/auth.context'
import { ShiftSection } from '../../shifts/components/shift-section'
import styles from './audit-overview.module.scss'
const cursorSchema = z.object({ occurredAt: z.string().datetime(), id: z.string().uuid() })
const responseSchema = z.object({ events: z.array(z.object({
  id: z.string().uuid(), actorId: z.string().uuid(), action: z.string(), targetType: z.string(),
  targetId: z.string().uuid(), occurredAt: z.string().datetime(), context: z.record(z.string()),
})), nextCursor: cursorSchema.nullable() })
type Cursor = z.infer<typeof cursorSchema>
const labels: Record<string, string> = { 'shift.created': 'Shift created', 'shift.claimed': 'Shift claimed', 'shift.cancelled': 'Assignment cancelled', 'agency.created': 'Agency created', 'agency.member_created': 'Agency member created', 'account.registered': 'Account registered' }
const contextColumns = [
  { key: 'agencyId', label: 'Agency ID', identifier: true },
  { key: 'name', label: 'Agency name' },
  { key: 'role', label: 'Role' },
  { key: 'startsAt', label: 'Shift start', timestamp: true },
  { key: 'endsAt', label: 'Shift end', timestamp: true },
  { key: 'nurseId', label: 'Nurse ID', identifier: true },
  { key: 'previousNurseId', label: 'Previous nurse ID', identifier: true },
  { key: 'reason', label: 'Cancellation reason' },
  { key: 'membershipId', label: 'Membership ID', identifier: true },
]
export function AuditOverview() {
  const { session, clearSession } = useAuth()
  const [pages, setPages] = useState<(Cursor | undefined)[]>([undefined])
  const cursor = pages.at(-1)
  const query = useQuery({ queryKey: ['admin', 'audit', session?.user.id, cursor], enabled: session?.user.role === 'admin', retry: false,
    queryFn: async ({ signal }) => {
      const params = cursor ? `?${new URLSearchParams({ before: cursor.occurredAt, beforeId: cursor.id })}` : ''
      return responseSchema.parse(await apiRequest(`/admin/audit${params}`, { token: session!.token, signal, cache: 'no-store' }))
    },
  })
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  if (session?.user.role !== 'admin') return null
  return <ShiftSection id="admin-audit" title="Audit log" description="Successful shift, agency and account management actions, newest first. Actor and target IDs identify the accounts and records involved."
    loading={query.isPending} fetching={query.isFetching} hasError={query.isError} hasData={Boolean(query.data)} unauthorized={unauthorized} forbidden={forbidden}
    loadingMessage="Loading audit log…" errorTitle="We could not load the audit log" forbiddenTitle="Admin access unavailable" forbiddenMessage="Your account cannot access the audit log."
    staleMessage="These records may be out of date. Please refresh." onSignIn={clearSession} onRefresh={() => { void query.refetch() }}>
    {query.data && !unauthorized && !forbidden && <>
      {query.data.events.length ? <div className={styles.tableScroll} role="region" aria-label="Audit records" tabIndex={0}>
        <table className={styles.table} aria-label="Audit log">
          <thead><tr><th scope="col">Timestamp</th><th scope="col">Action</th><th scope="col">Actor</th><th scope="col">Target</th>{contextColumns.map(column => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead>
          <tbody>{query.data.events.map(event => <tr key={event.id}>
            <td><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time></td>
            <td>{labels[event.action] ?? event.action}</td>
            <td className={styles.identifier}>{event.actorId}</td>
            <td><span className={styles.targetType}>{event.targetType}</span><span className={styles.identifier}>{event.targetId}</span></td>
            {contextColumns.map(column => {
              const value = event.context[column.key]
              return <td key={column.key} className={column.identifier ? styles.identifierCell : styles.contextCell}>
                {value && column.timestamp && Number.isFinite(Date.parse(value))
                  ? <time dateTime={value}>{new Date(value).toLocaleString()}</time>
                  : value || '—'}
              </td>
            })}
          </tr>)}</tbody>
        </table>
      </div> : <p>No audit records yet. New successful actions will appear here.</p>}
      <div className={styles.pagination}>
        <button disabled={pages.length === 1 || query.isFetching} onClick={() => setPages(previous => previous.slice(0, -1))}>Newer records</button>
        <span>Page {pages.length}</span>
        <button disabled={!query.data.nextCursor || query.isFetching} onClick={() => { const next = query.data.nextCursor; if (next) setPages(previous => [...previous, next]) }}>Older records</button>
      </div>
    </>}
  </ShiftSection>
}
