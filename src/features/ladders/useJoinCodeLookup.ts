// Copied from food-friends: src/features/nav/useFriendCodeLookup.ts — looks up a Ladder by Join code.

import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { previewLadder, type LadderPreview } from '@/data/ladder'
import { canonicalJoinCode, isValidJoinCodeFormat } from '@/lib/joinCode'

const LOOKUP_DEBOUNCE_MS = 300

function useDebouncedValue(value: string, delayMs = LOOKUP_DEBOUNCE_MS): string {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export type JoinCodeLookup =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'found'; preview: LadderPreview }
  | { status: 'unknown' }
  | { status: 'error'; message: string }

function isUnknownLadder(error: unknown): boolean {
  return (
    error instanceof Error &&
    /no ladder matches this share link/i.test(error.message)
  )
}

/** Debounced Join code lookup. Invalid or blank codes stay idle. */
export function useJoinCodeLookup(joinCode: string): JoinCodeLookup {
  const normalizedCode = canonicalJoinCode(joinCode)
  const debouncedCode = useDebouncedValue(normalizedCode)
  const codeReady = debouncedCode.length > 0 && isValidJoinCodeFormat(debouncedCode)

  const ladderQuery = useQuery({
    queryKey: ['join-code', debouncedCode] as const,
    queryFn: () => previewLadder(debouncedCode),
    enabled: codeReady,
    staleTime: 30_000,
    retry: false,
  })

  const lookupPending =
    normalizedCode !== debouncedCode || (codeReady && ladderQuery.isFetching)

  if (!isValidJoinCodeFormat(normalizedCode)) {
    return { status: 'idle' }
  }
  if (lookupPending) {
    return { status: 'checking' }
  }
  if (ladderQuery.isError) {
    if (isUnknownLadder(ladderQuery.error)) return { status: 'unknown' }
    return { status: 'error', message: "Couldn't check that code. Try again." }
  }
  if (ladderQuery.data) {
    return { status: 'found', preview: ladderQuery.data }
  }
  if (ladderQuery.isSuccess) {
    return { status: 'unknown' }
  }
  return { status: 'checking' }
}
