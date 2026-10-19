import { z } from 'zod'

export const ladderTabs = ['leaderboard', 'matches', 'members'] as const

export type LadderTab = (typeof ladderTabs)[number]

export const ladderSearchSchema = z.object({
  tab: z.enum(ladderTabs).catch('leaderboard'),
})
