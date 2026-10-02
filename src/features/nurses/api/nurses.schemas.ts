import { z } from 'zod'
import { shiftSchema } from '../../shifts/api/shifts.schemas'

export const nurseShiftsResponseSchema = z.object({ nurseId: z.string().uuid(), shifts: z.array(shiftSchema) })
  .refine(({ nurseId, shifts }) => shifts.every((shift) => shift.claimedBy === nurseId && shift.status === 'filled'), 'Unexpected assignment data')

