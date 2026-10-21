import { z } from 'zod'

export const navViews = ['menu', 'profile'] as const

export type NavView = (typeof navViews)[number]

/** Drawer view. Declared on the root route so every screen keeps it. */
export const navSearchSchema = z.object({
  nav: z.enum(navViews).optional().catch(undefined),
})

export function ladderCountLabel(count: number | undefined): string {
  if (count == null) return 'Ladders'
  if (count === 1) return '1 Ladder'
  return `${count} Ladders`
}
