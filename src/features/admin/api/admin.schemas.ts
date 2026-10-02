import { shiftSchema } from '../../shifts/api/shifts.schemas'
import { z } from 'zod'
export const shiftSummarySchema = z.object({
  asOf: z.string().datetime(), upcomingOpen: z.number().int().nonnegative(),
  upcomingAssigned: z.number().int().nonnegative(), upcomingTotal: z.number().int().nonnegative(),
}).refine((data) => data.upcomingTotal === data.upcomingOpen + data.upcomingAssigned)

const optionalDate = z.union([z.literal(''), shiftSchema.shape.date])
export const filterSchema = z.object({ agencyId: z.union([z.literal(''), z.string().uuid()]), status: z.enum(['', 'open', 'filled']), dateFrom: optionalDate, dateTo: optionalDate })
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, { message: 'Start date must be on or before end date.', path: ['dateTo'] })
export type FilterForm = z.infer<typeof filterSchema>
