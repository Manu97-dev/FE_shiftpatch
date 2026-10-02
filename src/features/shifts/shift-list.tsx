import type { Shift } from './shifts.schemas'
import { shiftDateFormatter, shiftTimeFormatter, shiftTimes } from './shift-time'
import styles from './shift-section.module.scss'

export function ShiftCard({ shift, now }: { shift: Shift; now: number }) {
  const { start, end, overnight } = shiftTimes(shift)
  const past = end.getTime() <= now
  const underway = !past && start.getTime() <= now
  return (
    <li className={styles.card}>
      <div className={styles.cardHeading}>
        <h3>{shift.role}</h3>
        <span className={styles.badge}>{shift.status === 'open' ? 'Open' : past ? 'Past assignment' : underway ? 'In progress' : 'Assigned'}</span>
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

export function ShiftList({ shifts, now }: { shifts: Shift[]; now: number }) {
  return <ul className={styles.list}>{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} now={now} />)}</ul>
}

