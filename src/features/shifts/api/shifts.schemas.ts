import { z } from 'zod'

const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)
export const shiftSchema = z.object({
  id: z.string().uuid(), agencyId: z.string().uuid(), agencyName: z.string(),
  role: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }),
  startTime: time, endTime: time, status: z.enum(['open', 'filled']), claimedBy: z.string().uuid().nullable(),
})
export type Shift = z.infer<typeof shiftSchema>

export const shiftsResponseSchema = z.object({ shifts: z.array(shiftSchema) })

export const cancelledShiftSchema = shiftSchema.extend({
  cancellation: z.object({ reason: z.enum(['advance', 'no-show']), previousNurseId: z.string().uuid() }),
})
