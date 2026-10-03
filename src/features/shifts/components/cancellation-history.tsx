import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuth } from '../../auth/contexts/auth.context'
import { apiRequest, ApiError } from '../../../shared/api/client'
import { ShiftSection } from './shift-section'
import styles from './shift-section.module.scss'
import historyStyles from './cancellation-history.module.scss'

const eventSchema = z.object({
  id: z.string().uuid(), shiftId: z.string().uuid(), agencyId: z.string().uuid(), agencyName: z.string(),
  role: z.string(), previousNurseId: z.string().uuid(), nurseName: z.string(), cancelledByUserId: z.string().uuid(),
  reason: z.enum(['advance', 'no-show']), startsAt: z.string().datetime(), endsAt: z.string().datetime(), cancelledAt: z.string().datetime(),
})
const responseSchema = z.object({ cancellations: z.array(eventSchema), hasMore: z.boolean() })
const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Tegucigalpa', dateStyle: 'medium', timeStyle: 'short' })
export function CancellationHistory() {
  const { session, clearSession } = useAuth()
  const [offset, setOffset] = useState(0)
  const query = useQuery({
    queryKey: ['shifts', 'cancellations', session?.user.id, session?.user.role, offset],
    enabled: session?.user.role === 'agency' || session?.user.role === 'admin',
    queryFn: async () => responseSchema.parse(await apiRequest(`/shifts/cancellations?limit=50&offset=${offset}`, { token: session!.token })),
    retry: false,
  })
  const unauthorized = query.error instanceof ApiError && query.error.status === 401
  const forbidden = query.error instanceof ApiError && query.error.status === 403
  return <ShiftSection id="cancellation-history" title="Cancellation history" description="Advance cancellations and no-shows, newest first. Times shown in America/Tegucigalpa (UTC−06:00)."
    loading={query.isPending} fetching={query.isFetching} hasError={query.isError} hasData={Boolean(query.data)} unauthorized={unauthorized} forbidden={forbidden}
    loadingMessage="Loading cancellation history…" errorTitle="We could not load cancellation history" forbiddenTitle="History access unavailable" forbiddenMessage="Your account cannot access this history."
    staleMessage="This history may be out of date. Please refresh." onRefresh={() => void query.refetch()} onSignIn={clearSession}>
    {query.data && !unauthorized && !forbidden && <>
      {query.data.cancellations.length ? <ul className={styles.list}>{query.data.cancellations.map((event) => <li key={event.id} className={`${styles.card} ${historyStyles.card}`}>
        <h3 className={historyStyles.title}>{event.reason === 'no-show' ? 'No-show' : 'Advance cancellation'} · {event.nurseName}</h3>
        <p className={styles.agency}>{event.role} · {event.agencyName}</p>
        <p className={historyStyles.schedule}>Shift: {formatter.format(new Date(event.startsAt))} – {formatter.format(new Date(event.endsAt))}</p>
        <p className={historyStyles.recorded}>Recorded: {formatter.format(new Date(event.cancelledAt))}</p>
        <details className={historyStyles.references}><summary>Event references</summary><p className={historyStyles.schedule}>Shift: {event.shiftId}</p><p>Nurse: {event.previousNurseId}</p><p>Recorded by: {event.cancelledByUserId}</p></details>
      </li>)}</ul> : <p>No cancellation events recorded{offset ? ' on this page' : ''}.</p>}
      <nav className={historyStyles.pagination} aria-label="Cancellation history pages">
        <button className={styles.button} disabled={offset === 0 || query.isFetching} onClick={() => setOffset(Math.max(0, offset - 50))}>Previous</button>{' '}
        <button className={styles.button} disabled={!query.data.hasMore || query.isFetching} onClick={() => setOffset(offset + 50)}>Next</button>
      </nav>
    </>}
  </ShiftSection>
}
