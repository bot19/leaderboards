import { z } from 'zod'

export const ladderNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a Ladder name.')
    .max(80, 'Keep the Ladder name under 80 characters.'),
})

export type LadderNameValues = z.infer<typeof ladderNameSchema>
