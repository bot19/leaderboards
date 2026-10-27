// Copied from food-friends: src/components/nav/NavAddFriends.tsx — Join code field and live lookup.

import { IconLoader2 } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import type { JoinCodeLookup } from '@/features/ladders/useJoinCodeLookup'

type Props = {
  inputId?: string
  joinCode: string
  onJoinCodeChange: (value: string) => void
  lookup: JoinCodeLookup
  onJoin: () => void
  joining: boolean
  joinError: string | null
  makeDefaultControl?: ReactNode
}

function memberLabel(count: number): string {
  return `${count} ${count === 1 ? 'Ladder member' : 'Ladder members'}`
}

export function JoinLadderForm({
  inputId = 'join-code',
  joinCode,
  onJoinCodeChange,
  lookup,
  onJoin,
  joining,
  joinError,
  makeDefaultControl,
}: Props) {
  const describedBy = [
    lookup.status === 'found' ? 'join-code-found' : null,
    lookup.status === 'unknown' || lookup.status === 'error' ? 'join-code-lookup-msg' : null,
    joinError ? 'join-code-error' : null,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <form
      className="min-w-0 space-y-2"
      onSubmit={(event) => {
        event.preventDefault()
        if (lookup.status === 'found' && !joining) onJoin()
      }}
    >
      <label className="block text-sm font-medium text-neutral-800" htmlFor={inputId}>
        Join code
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={6}
        placeholder="A1B2C3"
        value={joinCode}
        onChange={(event) => onJoinCodeChange(event.target.value)}
        aria-invalid={Boolean(
          joinError || lookup.status === 'unknown' || lookup.status === 'error',
        )}
        aria-describedby={describedBy || undefined}
        className="block min-h-11 w-full min-w-0 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 font-mono tracking-[0.15em] text-ink uppercase placeholder:font-sans placeholder:tracking-normal placeholder:normal-case placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none"
      />
      {lookup.status === 'checking' ? (
        <p className="text-sm text-neutral-500">Checking…</p>
      ) : null}
      {makeDefaultControl}
      {lookup.status === 'found' ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <p id="join-code-found" className="min-w-0 flex-1 break-words text-sm text-neutral-700">
            {lookup.preview.name} · {lookup.preview.gameName} · {memberLabel(lookup.preview.memberCount)}
          </p>
          <button
            type="submit"
            disabled={joining}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {joining ? (
              <>
                <IconLoader2 size={17} stroke={2} className="animate-spin" aria-hidden />
                Joining…
              </>
            ) : (
              'Join'
            )}
          </button>
        </div>
      ) : null}
      {lookup.status === 'unknown' ? (
        <p id="join-code-lookup-msg" className="text-sm text-red-700">
          That code doesn&apos;t match a Ladder.
        </p>
      ) : null}
      {lookup.status === 'error' ? (
        <p id="join-code-lookup-msg" className="text-sm text-red-700">
          {lookup.message}
        </p>
      ) : null}
      {joinError ? (
        <p id="join-code-error" role="alert" className="text-sm text-red-700">
          {joinError}
        </p>
      ) : null}
    </form>
  )
}
