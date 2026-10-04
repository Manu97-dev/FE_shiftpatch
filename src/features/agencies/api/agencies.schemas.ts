import { z } from 'zod'
import { shiftSchema } from '../../shifts/api/shifts.schemas'
export const agencyShiftsResponseSchema = z.object({ agencyId: z.string().uuid(), shifts: z.array(shiftSchema) })
  .refine((data) => data.shifts.every((shift) => shift.agencyId === data.agencyId))

export const ownAgencySchema = z.object({ agency: z.object({ id: z.string().uuid(), name: z.string() }).nullable() })
