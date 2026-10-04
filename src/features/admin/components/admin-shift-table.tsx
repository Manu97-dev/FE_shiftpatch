import type { Shift } from '../../shifts/api/shifts.schemas'
import { shiftDateFormatter, shiftTimeFormatter, shiftTimes } from '../../shifts/utils/shift-time'
import styles from './admin-shift-table.module.scss'
import cardStyles from '../../shifts/components/shift-section.module.scss'

export function AdminShiftTable({ shifts, now }: { shifts: Shift[]; now: number }) {
  return <div className={styles.scroll} role="region" aria-label="Shift report" tabIndex={0}>
    <table data-testid="admin-dashboard-shift-table" className={styles.table} aria-label="All shifts">
      <thead><tr><th scope="col">Role</th><th scope="col">Agency</th><th scope="col">Schedule</th><th scope="col">Status</th></tr></thead>
      <tbody>{shifts.map(shift => {
        const { start, end, overnight } = shiftTimes(shift)
        const past = end.getTime() <= now
        const underway = !past && start.getTime() <= now
        return <tr key={shift.id} data-shift-id={shift.id}>
          <th scope="row">{shift.role}</th><td>{shift.agencyName}</td>
          <td><time dateTime={start.toISOString()}>{shiftDateFormatter.format(start)}</time><br />
            <time dateTime={start.toISOString()}>{shiftTimeFormatter.format(start)}</time>{' – '}
            <time dateTime={end.toISOString()}>{shiftTimeFormatter.format(end)}</time>
            {overnight && <span className={cardStyles.overnight}>Ends next day · {shiftDateFormatter.format(end)}</span>}
          </td>
          <td><span data-testid="admin-shift-status-badge" data-status={shift.status} className={cardStyles.badge}>{shift.status === 'open' ? 'Open' : past ? 'Past assignment' : underway ? 'In progress' : 'Assigned'}</span></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}
