import { z } from 'zod'

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').max(320, 'Email is too long.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.').max(1024, 'Password is too long.'),
})

export const loginResponseSchema = z.object({
  token: z.string().min(1),
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.enum(['admin', 'agency', 'nurse']),
  }),
})

export type LoginCredentials = z.infer<typeof loginFormSchema>
export type Session = z.infer<typeof loginResponseSchema>

export const nurseRegistrationSchema = z.object({
  name: z.string().trim().min(1, 'Enter your full name.').max(200, 'Name is too long.'),
  email: loginFormSchema.shape.email,
  password: z.string().min(12, 'Use at least 12 characters.').max(1024, 'Password is too long.'),
  confirmPassword: z.string().min(1, 'Confirm your password.'),
  credentialExpirationDate: z.string().regex(/^(?!0000)[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Enter a valid expiration date.').refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Enter a valid expiration date.'),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords must match.', path: ['confirmPassword'],
})
export type NurseRegistration = z.infer<typeof nurseRegistrationSchema>
