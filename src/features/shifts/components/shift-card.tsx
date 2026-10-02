import type { ReactNode } from 'react'
import type { Shift } from '../api/shifts.schemas'
import { shiftDateFormatter, shiftTimeFormatter, shiftTimes } from '../utils/shift-time'
import styles from './shift-section.module.scss'

export function ShiftCard({ shift, now, action, testId, statusTestId }: { shift: Shift; now: number; action?: ReactNode; testId?: string; statusTestId?: string }) {
  const { start, end, overnight } = shiftTimes(shift)
  const past = end.getTime() <= now
  const underway = !past && start.getTime() <= now
  return (
    <li data-testid={testId} data-shift-id={shift.id} className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{shift.role}</h3>
        <span data-testid={statusTestId} data-status={shift.status} className={styles.badge}>{shift.status === 'open' ? 'Open' : past ? 'Past assignment' : underway ? 'In progress' : 'Assigned'}</span>
      </div>
      <p className={styles.agency}>{shift.agencyName}</p>
      <p className={styles.date}><time dateTime={start.toISOString()}>{shiftDateFormatter.format(start)}</time></p>
      <p className={styles.schedule}>
        <time dateTime={start.toISOString()}>{shiftTimeFormatter.format(start)}</time>
        {' – '}
        <time dateTime={end.toISOString()}>{shiftTimeFormatter.format(end)}</time>
        {overnight && <span className={styles.overnight}>Ends next day · {shiftDateFormatter.format(end)}</span>}
      </p>
      {action && <div className={styles.cardActions}>{action}</div>}
    </li>
  )
}

