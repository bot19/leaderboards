// Copied from bao-ui: src/lib/avatar.ts

/** FNV-1a-ish hash → [0, 1). Same string always → same colour. */
export function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0xffff_ffff
}

/** Stable HSL colour from a seed string (username, group code, …). */
export function colorFromSeed(seed: string): string {
  const t = hashString(seed.trim().toLowerCase())
  const hue = Math.floor(t * 360)
  return `hsl(${hue} 42% 42%)`
}

/**
 * Always two letters. Hyphens and underscores split words too, since usernames
 * can't contain spaces:
 * - 2+ words → first letter of word 1 + word 2
 * - 1 word → first two characters (padded if length 1)
 */
export function initialsFromName(name: string): string {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean)
  if (parts.length === 0) return '??'

  if (parts.length >= 2) {
    const a = parts[0]?.[0]
    const b = parts[1]?.[0]
    if (!a || !b) return '??'
    return (a + b).toUpperCase()
  }

  const word = parts[0] ?? ''
  if (word.length >= 2) return word.slice(0, 2).toUpperCase()
  const ch = word[0]?.toUpperCase() ?? '?'
  return ch + ch
}
