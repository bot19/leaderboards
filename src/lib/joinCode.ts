// Copied from food-friends: src/lib/groupCode.ts — Join code alphabet for a Ladder.

const JOIN_CODE = /^[1-9A-Z]{6}$/

export function canonicalJoinCode(value: string): string {
  return value.trim().toUpperCase()
}

/** True for a code already trimmed and uppercased, matching private.gen_join_code. */
export function isValidJoinCodeFormat(code: string): boolean {
  return JOIN_CODE.test(code)
}
