import { z } from 'zod'

export const ladderNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a Leaderboard name.')
    .max(80, 'Keep the Leaderboard name under 80 characters.'),
})

export type LadderNameValues = z.infer<typeof ladderNameSchema>
