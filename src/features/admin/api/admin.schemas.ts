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

const memberSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid(), name: z.string(), email: z.string(), role: z.enum(['owner', 'manager']) })
export const adminAgencySchema = z.object({ id: z.string().uuid(), name: z.string(), contactEmail: z.string(), members: z.array(memberSchema) })
export const adminAgenciesSchema = z.object({ agencies: z.array(adminAgencySchema) })
export const adminAgencyMemberSchema = memberSchema
export type AdminAgency = z.infer<typeof adminAgencySchema>
export function agencyCreationFormSchema(member: boolean) {
  return z.object({
    name: z.string().trim().min(1, 'Enter a name.').max(200, 'Name is too long.'),
    email: z.string().trim().min(1, 'Enter an email address.').max(320, 'Email is too long.').email('Enter a valid email address.'),
    password: member ? z.string().min(12, 'Use at least 12 characters.').max(1024, 'Password is too long.') : z.string(),
    role: z.enum(['owner', 'manager']),
  })
}
export type AgencyCreationForm = z.infer<ReturnType<typeof agencyCreationFormSchema>>
