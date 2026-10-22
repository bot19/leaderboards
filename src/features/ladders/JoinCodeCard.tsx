// Copied from food-friends: src/components/nav/NavFriendCode.tsx — Join code card, plus Copy link.

import { IconCheck, IconCopy } from '@tabler/icons-react'
import { IconButton } from '@/components/ui/IconButton'

type Props = {
  code: string
  onCopyCode: () => void
  onCopyLink: () => void
  copyState: 'idle' | 'copied' | 'failed'
}

export function JoinCodeCard({ code, onCopyCode, onCopyLink, copyState }: Props) {
  return (
    <section aria-labelledby="join-code-heading" className="min-w-0 space-y-3">
      <div className="space-y-1">
        <h2
          id="join-code-heading"
          className="text-xs font-semibold tracking-wide text-neutral-500 uppercase"
        >
          Join code
        </h2>
        <p className="text-sm text-neutral-600">Share this code so colleagues can join.</p>
      </div>
      <div className="min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <p
            className="min-w-0 font-mono text-xl tracking-[0.2em] text-ink"
            aria-label={`Join code ${code}`}
          >
            {code}
          </p>
          <IconButton
            onClick={onCopyCode}
            aria-label={
              copyState === 'copied'
                ? 'Copied'
                : copyState === 'failed'
                  ? 'Copy failed'
                  : 'Copy Join code'
            }
            className="h-11 w-11"
          >
            {copyState === 'copied' ? (
              <IconCheck size={18} stroke={1.75} />
            ) : (
              <IconCopy size={18} stroke={1.75} />
            )}
          </IconButton>
        </div>
      </div>
      <button
        type="button"
        onClick={onCopyLink}
        className="inline-flex min-h-11 items-center text-sm text-neutral-700 underline"
      >
        Copy link
      </button>
    </section>
  )
}
