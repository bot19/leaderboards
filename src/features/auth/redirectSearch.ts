import { z } from 'zod'

/** Optional path to reopen after sign-in, such as a Share link preview. */
export const redirectSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
})
