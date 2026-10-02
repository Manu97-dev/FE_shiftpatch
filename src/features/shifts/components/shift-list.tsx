import type { Shift } from '../api/shifts.schemas'
import { ShiftCard } from './shift-card'
import styles from './shift-section.module.scss'

export function ShiftList({ shifts, now }: { shifts: Shift[]; now: number }) {
  return <ul className={styles.list}>{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} now={now} />)}</ul>
}

