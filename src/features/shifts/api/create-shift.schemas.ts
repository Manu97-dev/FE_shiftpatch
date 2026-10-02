import { z } from 'zod'
const time = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Enter a valid time.')
export const createShiftFormSchema = z.object({
  role: z.string().trim().min(1, 'Enter the required nurse role.').max(100, 'Role must be 100 characters or fewer.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Enter a valid calendar date.'),
  startTime: time, endTime: time,
}).superRefine((value, ctx) => {
  if (value.startTime === value.endTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Start and end times must differ.' })
  const end = new Date(`${value.date}T${value.endTime}:00-06:00`)
  if (value.endTime < value.startTime) end.setUTCDate(end.getUTCDate() + 1)
  if (end.getUTCFullYear() > 9999) ctx.addIssue({ code: 'custom', path: ['date'], message: 'The shift must end within the supported year range.' })
})
export type CreateShiftInput = z.infer<typeof createShiftFormSchema>
