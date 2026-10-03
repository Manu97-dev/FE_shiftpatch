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
      {query.data.events.length ? <ol className={styles.events}>{query.data.events.map(event => <li key={event.id}>
        <h3>{labels[event.action] ?? event.action}</h3>
        <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString()}</time>
        <dl><dt>Actor</dt><dd>{event.actorId}</dd><dt>Target ({event.targetType})</dt><dd>{event.targetId}</dd>
          {Object.entries(event.context).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
        </dl>
      </li>)}</ol> : <p>No audit records yet. New successful actions will appear here.</p>}
      <div className={styles.pagination}>
        <button disabled={pages.length === 1 || query.isFetching} onClick={() => setPages(previous => previous.slice(0, -1))}>Newer records</button>
        <span>Page {pages.length}</span>
        <button disabled={!query.data.nextCursor || query.isFetching} onClick={() => { const next = query.data.nextCursor; if (next) setPages(previous => [...previous, next]) }}>Older records</button>
      </div>
    </>}
  </ShiftSection>
}
