import type { ReactNode } from 'react'
import styles from './shift-section.module.scss'

interface Props {
  id: string; title: string; description: string; loadingMessage: string; errorTitle: string
  forbiddenMessage: string; forbiddenTitle?: string; staleMessage: string
  loading: boolean; fetching: boolean; hasError: boolean; unauthorized: boolean; forbidden: boolean; hasData: boolean
  onRefresh: () => void; onSignIn: () => void; children: ReactNode
}

export function ShiftSection(props: Props) {
  const { id, title, description, loading, fetching, hasError, unauthorized, forbidden, hasData, onRefresh, onSignIn, children } = props
  return <section className={styles.section} aria-labelledby={`${id}-heading`}>
    <div className={styles.heading}>
      <div><h2 id={`${id}-heading`}>{title}</h2><p>{description}</p></div>
      {!unauthorized && !forbidden && <button className={styles.button} onClick={onRefresh} disabled={fetching}>{fetching && !loading ? 'Refreshing…' : 'Refresh'}</button>}
    </div>
    <p className={styles.timezone}>All shift dates and times are in America/Tegucigalpa (UTC−06:00).</p>
    {loading && <div className={styles.state} role="status">{props.loadingMessage}</div>}
    {hasError && <div className={styles.error} role="alert">
      <h3>{unauthorized ? 'Your session has expired' : forbidden ? (props.forbiddenTitle ?? 'Nurse access unavailable') : props.errorTitle}</h3>
      <p>{unauthorized ? 'Sign in again to continue.' : forbidden ? props.forbiddenMessage : hasData ? props.staleMessage : 'Check your connection and try again.'}</p>
      {unauthorized ? <button className={styles.button} onClick={onSignIn}>Sign in again</button>
        : !forbidden && <button className={styles.button} disabled={fetching} onClick={onRefresh}>{fetching ? 'Retrying…' : 'Try again'}</button>}
    </div>}
    {children}
  </section>
}
