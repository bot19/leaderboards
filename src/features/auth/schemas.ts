import { z } from 'zod'

const email = z.email('Enter a valid email.')

export const passcodeRequestSchema = z.object({ email })

export const passcodeSchema = z.object({
  email,
  token: z.string().regex(/^\d{6}$/, 'Enter the 6-digit passcode.'),
})

export const passwordSchema = z.object({
  email,
  password: z.string().min(6, 'Enter at least 6 characters.'),
})

export const displayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter a display name.')
    .max(40, 'Keep the display name under 40 characters.'),
})

export type PasscodeRequestValues = z.infer<typeof passcodeRequestSchema>
export type PasscodeValues = z.infer<typeof passcodeSchema>
export type PasswordValues = z.infer<typeof passwordSchema>
export type DisplayNameValues = z.infer<typeof displayNameSchema>
