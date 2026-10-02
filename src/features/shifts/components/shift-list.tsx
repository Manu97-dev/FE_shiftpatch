import type { ReactNode } from 'react'
import type { Shift } from '../api/shifts.schemas'
import { ShiftCard } from './shift-card'
import styles from './shift-section.module.scss'

export function ShiftList({ shifts, now, renderAction, testId, itemTestId, statusTestId }: { shifts: Shift[]; now: number; renderAction?: (shift: Shift) => ReactNode; testId?: string; itemTestId?: string; statusTestId?: string }) {
  return <ul data-testid={testId} className={styles.list}>{shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} now={now} action={renderAction?.(shift)} testId={itemTestId} statusTestId={statusTestId} />)}</ul>
}

