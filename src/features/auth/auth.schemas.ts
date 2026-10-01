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
