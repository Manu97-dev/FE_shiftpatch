import { Tabs } from '../../../shared/components/tabs'
import { useMyShifts } from '../../nurses/hooks/use-my-shifts'
import { useAvailableShifts } from '../hooks/use-available-shifts'
import { useShiftClock } from '../hooks/use-shift-clock'
import { shiftTimes } from '../utils/shift-time'
import { MyShifts } from './my-shifts'
import { AvailableShifts } from './available-shifts'

export function NurseShiftTabs() {
  const mine = useMyShifts()
  const available = useAvailableShifts()
  const now = useShiftClock()
  return <Tabs label="Nurse shifts" defaultValue="my-shifts" items={[
    {
      value: 'my-shifts', label: 'My shifts',
      count: mine.data?.shifts.filter((shift) => shiftTimes(shift).end.getTime() > now).length,
      content: <MyShifts />,
    },
    {
      value: 'available-shifts', label: 'Available shifts',
      count: available.data?.shifts.length,
      content: <AvailableShifts />,
    },
  ]} />
}
