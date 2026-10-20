import { z } from 'zod'

export const recordMatchSchema = z
  .object({
    format: z.enum(['singles', 'doubles']),
    a1: z.string(),
    a2: z.string(),
    b1: z.string(),
    b2: z.string(),
    winner: z.enum(['a', 'b']),
    notes: z.string().max(500, 'Keep notes under 500 characters.'),
  })
  .superRefine((values, ctx) => {
    const ids = [values.a1, values.b1]
    if (values.format === 'doubles') ids.push(values.a2, values.b2)
    if (ids.some((id) => id.trim() === '')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Choose a Ladder member for every place.',
        path: ['a1'],
      })
    }
    const chosen = ids.filter((id) => id.trim() !== '')
    if (new Set(chosen).size !== chosen.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'A Ladder member can only appear once.',
        path: ['a1'],
      })
    }
  })

export type RecordMatchValues = z.infer<typeof recordMatchSchema>
